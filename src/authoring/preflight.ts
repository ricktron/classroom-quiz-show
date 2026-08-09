/**
 * Bounded XLSX ZIP/container preflight using fflate@0.8.3.
 *
 * Enforced before SheetJS semantic parse:
 * - extension / container sniff
 * - compressed workbook bytes
 * - archive entry count
 * - aggregate advertised expanded size when `originalSize` is present
 * - per-entry advertised expanded size when present
 * - rejection of VBA / macro project entries
 *
 * This is NOT a claim of a guaranteed pre-parse uncompressed cap for every
 * ZIP variant — only advertised metadata and compressed input are bounded here.
 * SheetJS parse additionally enforces semantic cell/row/column budgets.
 */

import { Unzip, UnzipInflate, UnzipPassThrough } from 'fflate'
import {
  MAX_WORKBOOK_ADVERTISED_EXPANDED_BYTES,
  MAX_WORKBOOK_ARCHIVE_ENTRIES,
  MAX_WORKBOOK_BYTES,
  MAX_WORKBOOK_ENTRY_EXPANDED_BYTES,
} from './limits'
import { authoringIssue, type AuthoringIssue } from './issues'
import { WORKBOOK_EXTENSION } from './contract'

export type WorkbookPreflightResult =
  | { readonly status: 'success' }
  | { readonly status: 'failure'; readonly issues: readonly AuthoringIssue[] }

const ZIP_LOCAL_FILE_SIG = 0x04034b50

function looksLikeZip(bytes: Uint8Array): boolean {
  if (bytes.length < 4) return false
  const sig =
    bytes[0]! |
    (bytes[1]! << 8) |
    (bytes[2]! << 16) |
    (bytes[3]! << 24)
  return sig === ZIP_LOCAL_FILE_SIG
}

function normalizeFilename(filename: string): string {
  return filename.trim().toLowerCase()
}

export function assertWorkbookFilename(filename: string): AuthoringIssue | null {
  const lower = normalizeFilename(filename)
  if (lower.endsWith('.xlsm') || lower.endsWith('.xls') || lower.endsWith('.ods')) {
    return authoringIssue(
      'unsupported-file-type',
      'blocker',
      'transport',
      `Unsupported spreadsheet type. Slice 20 accepts only ${WORKBOOK_EXTENSION} workbooks.`,
      { field: 'filename' },
    )
  }
  if (!lower.endsWith(WORKBOOK_EXTENSION)) {
    return authoringIssue(
      'unsupported-file-type',
      'blocker',
      'transport',
      `Unsupported file type. Expected a ${WORKBOOK_EXTENSION} workbook.`,
      { field: 'filename' },
    )
  }
  return null
}

function isVbaEntry(name: string): boolean {
  const n = name.replace(/\\/g, '/').toLowerCase()
  return (
    n.includes('vbaproject.bin') ||
    n.includes('xl/vba') ||
    (n.endsWith('.bin') && n.includes('vba'))
  )
}

export function preflightWorkbookBytes(
  bytes: Uint8Array,
  filename: string,
): Promise<WorkbookPreflightResult> {
  const nameIssue = assertWorkbookFilename(filename)
  if (nameIssue) return Promise.resolve({ status: 'failure', issues: [nameIssue] })

  if (bytes.byteLength > MAX_WORKBOOK_BYTES) {
    return Promise.resolve({
      status: 'failure',
      issues: [
        authoringIssue(
          'workbook-too-large',
          'blocker',
          'transport',
          `Workbook is ${bytes.byteLength} bytes, which exceeds the ${MAX_WORKBOOK_BYTES}-byte compressed limit.`,
        ),
      ],
    })
  }

  if (!looksLikeZip(bytes)) {
    return Promise.resolve({
      status: 'failure',
      issues: [
        authoringIssue(
          'malformed-xlsx',
          'blocker',
          'transport',
          'The file is not a valid XLSX (ZIP) container.',
        ),
      ],
    })
  }

  return new Promise((resolve) => {
    let entryCount = 0
    let advertisedExpanded = 0
    let failed = false
    let sawEnd = false
    let pending = 0

    const fail = (issue: AuthoringIssue): void => {
      if (failed) return
      failed = true
      resolve({ status: 'failure', issues: [issue] })
    }

    const maybeSucceed = (): void => {
      if (failed || !sawEnd || pending > 0) return
      if (entryCount === 0) {
        fail(
          authoringIssue(
            'malformed-xlsx',
            'blocker',
            'transport',
            'The workbook archive contains no entries.',
          ),
        )
        return
      }
      resolve({ status: 'success' })
    }

    const unzip = new Unzip()
    unzip.register(UnzipInflate)
    unzip.register(UnzipPassThrough)

    unzip.onfile = (file) => {
      if (failed) {
        file.terminate()
        return
      }

      entryCount += 1
      if (entryCount > MAX_WORKBOOK_ARCHIVE_ENTRIES) {
        file.terminate()
        fail(
          authoringIssue(
            'resource-limit-exceeded',
            'blocker',
            'transport',
            `Workbook archive exceeds ${MAX_WORKBOOK_ARCHIVE_ENTRIES} entries.`,
          ),
        )
        return
      }

      if (isVbaEntry(file.name)) {
        file.terminate()
        fail(
          authoringIssue(
            'active-content-rejected',
            'blocker',
            'transport',
            `Active workbook content is not allowed (${file.name}).`,
          ),
        )
        return
      }

      if (file.originalSize !== undefined) {
        if (file.originalSize > MAX_WORKBOOK_ENTRY_EXPANDED_BYTES) {
          file.terminate()
          fail(
            authoringIssue(
              'resource-limit-exceeded',
              'blocker',
              'transport',
              `Archive entry ${JSON.stringify(file.name)} advertises ${file.originalSize} uncompressed bytes (limit ${MAX_WORKBOOK_ENTRY_EXPANDED_BYTES}).`,
            ),
          )
          return
        }
        advertisedExpanded += file.originalSize
        if (advertisedExpanded > MAX_WORKBOOK_ADVERTISED_EXPANDED_BYTES) {
          file.terminate()
          fail(
            authoringIssue(
              'resource-limit-exceeded',
              'blocker',
              'transport',
              `Aggregate advertised expanded size exceeds ${MAX_WORKBOOK_ADVERTISED_EXPANDED_BYTES} bytes.`,
            ),
          )
          return
        }
      }

      // Drain entry bytes without retaining them — preflight only.
      pending += 1
      const chunks: Uint8Array[] = []
      let extracted = 0
      file.ondata = (err, data, final) => {
        if (failed) return
        if (err) {
          fail(
            authoringIssue(
              'malformed-xlsx',
              'blocker',
              'transport',
              `Failed to read archive entry ${JSON.stringify(file.name)}.`,
            ),
          )
          return
        }
        extracted += data.length
        if (extracted > MAX_WORKBOOK_ENTRY_EXPANDED_BYTES) {
          file.terminate()
          fail(
            authoringIssue(
              'resource-limit-exceeded',
              'blocker',
              'transport',
              `Expanded entry ${JSON.stringify(file.name)} exceeded ${MAX_WORKBOOK_ENTRY_EXPANDED_BYTES} bytes during preflight.`,
            ),
          )
          return
        }
        // Intentionally discard content; keep a tiny cap on retained chunks.
        if (chunks.length < 1) chunks.push(data.subarray(0, 0))
        if (final) {
          pending -= 1
          maybeSucceed()
        }
      }
      file.start()
    }

    try {
      unzip.push(bytes, true)
      sawEnd = true
      maybeSucceed()
    } catch {
      fail(
        authoringIssue(
          'malformed-xlsx',
          'blocker',
          'transport',
          'The workbook archive could not be parsed as ZIP.',
        ),
      )
    }
  })
}
