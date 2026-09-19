/**
 * Structured backup issues — host-only diagnostics (never PublicState).
 */

export const BACKUP_STAGES = [
  'transport',
  'json-parse',
  'format',
  'version',
  'safety',
  'schema',
  'game-validate',
  'media-validate',
  'compatibility',
  'preview',
  'apply',
] as const

export type BackupStage = (typeof BACKUP_STAGES)[number]

export const BACKUP_ISSUE_CODES = [
  'input-not-text',
  'empty-input',
  'input-too-large',
  'invalid-json',
  'root-not-object',
  'missing-format',
  'unsupported-format',
  'missing-schema-version',
  'invalid-schema-version',
  'unsupported-schema-version',
  'unsafe-object-key',
  'non-data-value',
  'non-finite-number',
  'cyclic-reference',
  'document-too-deep',
  'issues-truncated',
  'unknown-field',
  'invalid-field',
  'duplicate-game-id',
  'duplicate-media-key',
  'game-import-failed',
  'game-id-mismatch',
  'draft-unreadable',
  'media-decode-failed',
  'media-integrity-failed',
  'media-type-mismatch',
  'media-too-large',
  'media-total-too-large',
  'too-many-games',
  'too-many-media',
  'needs-confirmation',
  'apply-failed',
  'apply-aborted',
  'quota-exceeded',
  'follower',
  'unavailable',
] as const

export type BackupIssueCode = (typeof BACKUP_ISSUE_CODES)[number]

export interface BackupIssue {
  readonly code: BackupIssueCode
  readonly stage: BackupStage
  readonly path: string
  readonly message: string
}

export function backupIssue(
  code: BackupIssueCode,
  stage: BackupStage,
  path: string,
  message: string,
): BackupIssue {
  return { code, stage, path, message }
}

export function sortBackupIssues(issues: readonly BackupIssue[]): readonly BackupIssue[] {
  const stageOrder = new Map(BACKUP_STAGES.map((stage, index) => [stage, index]))
  return [...issues].sort((a, b) => {
    const stageDelta = (stageOrder.get(a.stage) ?? 99) - (stageOrder.get(b.stage) ?? 99)
    if (stageDelta !== 0) return stageDelta
    const pathDelta = a.path.localeCompare(b.path)
    if (pathDelta !== 0) return pathDelta
    return a.code.localeCompare(b.code) || a.message.localeCompare(b.message)
  })
}
