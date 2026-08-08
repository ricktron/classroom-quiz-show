import { Unzip, UnzipInflate, UnzipPassThrough } from 'fflate'
import {
  MAX_PACK_ENTRY_COUNT,
  MAX_PACK_GAME_BYTES,
  MAX_PACK_INPUT_BYTES,
  MAX_PACK_MANIFEST_BYTES,
  MAX_PACK_MEDIA_BYTES,
  MAX_PACK_MEDIA_COUNT,
  MAX_PACK_TOTAL_EXTRACTED_BYTES,
} from './limits'
import { packFailure, packIssue, type PackIssue } from './issues'
import {
  createPackPathTracker,
  isAllowedV1EntryPath,
  isGameEntryPath,
  isManifestPath,
  isMediaEntryPath,
  validatePackEntryPath,
} from './paths'

/**
 * Bounded streaming ZIP reader for untrusted pack import (Slice 19).
 *
 * Uses fflate `Unzip` entry-by-entry — never `unzipSync` as the sole import path.
 */

export type ReadPackZipResult =
  | { readonly status: 'success'; readonly entries: ReadonlyMap<string, Uint8Array> }
  | { readonly status: 'failure'; readonly issues: readonly PackIssue[] }

function concatChunks(chunks: readonly Uint8Array[]): Uint8Array {
  const total = chunks.reduce((sum, chunk) => sum + chunk.length, 0)
  const out = new Uint8Array(total)
  let offset = 0
  for (const chunk of chunks) {
    out.set(chunk, offset)
    offset += chunk.length
  }
  return out
}

function perEntryLimit(path: string): number {
  if (isManifestPath(path)) return MAX_PACK_MANIFEST_BYTES
  if (isGameEntryPath(path)) return MAX_PACK_GAME_BYTES
  return MAX_PACK_MEDIA_BYTES
}

export function readPackZip(inputBytes: Uint8Array): Promise<ReadPackZipResult> {
  if (inputBytes.length > MAX_PACK_INPUT_BYTES) {
    return Promise.resolve(
      packFailure([
        packIssue(
          'pack-input-too-large',
          'transport',
          '',
          `The pack file is ${inputBytes.length} bytes, which exceeds the ${MAX_PACK_INPUT_BYTES}-byte limit.`,
          { context: { length: inputBytes.length, limit: MAX_PACK_INPUT_BYTES } },
        ),
      ]),
    )
  }

  return new Promise((resolve) => {
    const entries = new Map<string, Uint8Array>()
    const tracker = createPackPathTracker()
    let entryCount = 0
    let mediaEntryCount = 0
    let totalExtracted = 0
    let failed = false
    let pendingFiles = 0
    let sawEnd = false

    const finishSuccess = (): void => {
      if (failed) return
      if (pendingFiles > 0) return
      if (!sawEnd) return
      if (entryCount === 0) {
        fail(
          packIssue(
            'pack-malformed-container',
            'container',
            '',
            'The pack file is not a valid ZIP archive.',
          ),
        )
        return
      }
      resolve({ status: 'success', entries })
    }

    const fail = (issue: PackIssue): void => {
      if (failed) return
      failed = true
      resolve(packFailure([issue]))
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
      if (entryCount > MAX_PACK_ENTRY_COUNT) {
        file.terminate()
        fail(
          packIssue(
            'pack-too-many-entries',
            'container',
            file.name,
            `The pack contains more than ${MAX_PACK_ENTRY_COUNT} entries.`,
          ),
        )
        return
      }

      if (!validatePackEntryPath(file.name)) {
        file.terminate()
        fail(
          packIssue(
            'pack-unsafe-path',
            'container',
            file.name,
            `The pack entry path ${JSON.stringify(file.name)} is not a safe relative path.`,
          ),
        )
        return
      }

      if (!isAllowedV1EntryPath(file.name)) {
        file.terminate()
        fail(
          packIssue(
            'pack-unexpected-entry',
            'container',
            file.name,
            `Unexpected pack entry ${JSON.stringify(file.name)}.`,
          ),
        )
        return
      }

      if (isMediaEntryPath(file.name)) {
        mediaEntryCount += 1
        if (mediaEntryCount > MAX_PACK_MEDIA_COUNT) {
          file.terminate()
          fail(
            packIssue(
              'pack-too-many-media',
              'container',
              file.name,
              `The pack contains more than ${MAX_PACK_MEDIA_COUNT} media entries.`,
            ),
          )
          return
        }
      }

      const tracked = tracker.add(file.name)
      if (!tracked.ok) {
        file.terminate()
        fail(
          packIssue(
            tracked.reason === 'duplicate' ? 'pack-duplicate-entry' : 'pack-unsafe-path',
            'container',
            file.name,
            tracked.reason === 'duplicate'
              ? `Duplicate pack entry ${JSON.stringify(file.name)}.`
              : `Case-variant collision for pack entry ${JSON.stringify(file.name)}.`,
          ),
        )
        return
      }

      const limit = perEntryLimit(file.name)
      if (file.originalSize !== undefined && file.originalSize > limit) {
        file.terminate()
        fail(
          packIssue(
            isManifestPath(file.name)
              ? 'pack-manifest-too-large'
              : isGameEntryPath(file.name)
                ? 'pack-game-too-large'
                : 'pack-media-too-large',
            'container',
            file.name,
            `Declared uncompressed size ${file.originalSize} exceeds the ${limit}-byte limit for this entry.`,
          ),
        )
        return
      }

      if (
        file.originalSize !== undefined &&
        totalExtracted + file.originalSize > MAX_PACK_TOTAL_EXTRACTED_BYTES
      ) {
        file.terminate()
        fail(
          packIssue(
            'pack-extracted-too-large',
            'container',
            file.name,
            `Extracting this entry would exceed the ${MAX_PACK_TOTAL_EXTRACTED_BYTES}-byte extracted limit.`,
          ),
        )
        return
      }

      pendingFiles += 1
      const chunks: Uint8Array[] = []
      let entryBytes = 0

      file.ondata = (err, data, final) => {
        if (failed) return
        if (err) {
          file.terminate()
          fail(
            packIssue(
              'pack-malformed-container',
              'container',
              file.name,
              'The pack archive could not be decompressed.',
            ),
          )
          return
        }

        if (data && data.length > 0) {
          entryBytes += data.length
          totalExtracted += data.length

          if (entryBytes > limit) {
            file.terminate()
            fail(
              packIssue(
                isManifestPath(file.name)
                  ? 'pack-manifest-too-large'
                  : isGameEntryPath(file.name)
                    ? 'pack-game-too-large'
                    : 'pack-media-too-large',
                'container',
                file.name,
                `Extracted entry size ${entryBytes} exceeds the ${limit}-byte limit.`,
              ),
            )
            return
          }

          if (totalExtracted > MAX_PACK_TOTAL_EXTRACTED_BYTES) {
            file.terminate()
            fail(
              packIssue(
                'pack-extracted-too-large',
                'container',
                file.name,
                `Extracted bytes ${totalExtracted} exceed the ${MAX_PACK_TOTAL_EXTRACTED_BYTES}-byte limit.`,
              ),
            )
            return
          }

          chunks.push(data)
        }

        if (final) {
          entries.set(file.name, concatChunks(chunks))
          pendingFiles -= 1
          finishSuccess()
        }
      }

      try {
        file.start()
      } catch {
        file.terminate()
        fail(
          packIssue(
            'pack-malformed-container',
            'container',
            file.name,
            'The pack archive uses an unsupported compression method.',
          ),
        )
      }
    }

    try {
      unzip.push(inputBytes, true)
      sawEnd = true
      finishSuccess()
    } catch {
      fail(
        packIssue(
          'pack-malformed-container',
          'container',
          '',
          'The pack file is not a valid ZIP archive.',
        ),
      )
    }
  })
}
