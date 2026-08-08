import type { ImportIssue } from '../import/issues'

/**
 * Structured portable-pack diagnostics (Slice 19).
 *
 * Failures are data, not exceptions. Issues are host-only and never enter
 * PublicState or the display wire.
 */

export const PACK_STAGES = [
  'transport',
  'container',
  'manifest',
  'game',
  'media',
  'integrity',
  'storage',
  'commit',
  'download',
] as const

export type PackStage = (typeof PACK_STAGES)[number]

export const PACK_ISSUE_CODES = [
  'pack-input-too-large',
  'pack-malformed-container',
  'pack-too-many-entries',
  'pack-unsafe-path',
  'pack-duplicate-entry',
  'pack-unexpected-entry',
  'pack-manifest-missing',
  'pack-manifest-too-large',
  'pack-manifest-invalid',
  'pack-manifest-unknown-field',
  'pack-version-unsupported',
  'pack-game-entry-missing',
  'pack-game-too-large',
  'pack-game-integrity-mismatch',
  'pack-canonical-import-failed',
  'pack-too-many-media',
  'pack-media-missing',
  'pack-media-unreferenced',
  'pack-media-too-large',
  'pack-media-budget-exceeded',
  'pack-extracted-too-large',
  'pack-media-integrity-mismatch',
  'pack-media-type-unsupported',
  'pack-media-decode-failed',
  'pack-media-acquisition-failed',
  'pack-storage-quota',
  'pack-storage-failed',
  'pack-commit-failed',
  'pack-download-failed',
] as const

export type PackIssueCode = (typeof PACK_ISSUE_CODES)[number]

export type PackIssueContext = Readonly<Record<string, string | number | boolean>>

export interface PackIssue {
  readonly code: PackIssueCode
  readonly stage: PackStage
  readonly path: string
  readonly message: string
  readonly context?: PackIssueContext
  /** Nested canonical import diagnostics for `pack-canonical-import-failed`. */
  readonly importIssues?: readonly ImportIssue[]
}

export function packIssue(
  code: PackIssueCode,
  stage: PackStage,
  path: string,
  message: string,
  options: {
    readonly context?: PackIssueContext
    readonly importIssues?: readonly ImportIssue[]
  } = {},
): PackIssue {
  const { context, importIssues } = options
  if (context === undefined && importIssues === undefined) {
    return { code, stage, path, message }
  }
  if (importIssues === undefined) {
    return { code, stage, path, message, context }
  }
  if (context === undefined) {
    return { code, stage, path, message, importIssues }
  }
  return { code, stage, path, message, context, importIssues }
}

const STAGE_ORDER = new Map<PackStage, number>(PACK_STAGES.map((stage, index) => [stage, index]))

export function sortPackIssues(issues: readonly PackIssue[]): readonly PackIssue[] {
  return [...issues].sort(
    (a, b) => (STAGE_ORDER.get(a.stage) ?? 0) - (STAGE_ORDER.get(b.stage) ?? 0),
  )
}

export function packFailure(issues: readonly PackIssue[]): { readonly status: 'failure'; readonly issues: readonly PackIssue[] } {
  return { status: 'failure', issues: sortPackIssues(issues) }
}
