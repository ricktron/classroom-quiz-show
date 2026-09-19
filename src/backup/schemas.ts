import { z } from 'zod'
import { isPlainRecord } from '../import/safetyScan'
import {
  BACKUP_FORMAT,
  BACKUP_SCHEMA_VERSION,
  MAX_BACKUP_DRAFT_JSON_LENGTH,
  MAX_BACKUP_GAME_COUNT,
  MAX_BACKUP_MEDIA_COUNT,
  MAX_BACKUP_SINGLE_GAME_JSON_LENGTH,
} from './constants'
import { backupIssue, type BackupIssue } from './issues'

const sniffedMediaTypeSchema = z.union([
  z.literal('image/png'),
  z.literal('image/jpeg'),
  z.literal('image/webp'),
  z.literal('image/gif'),
])

const backupGameEntrySchema = z.strictObject({
  gameId: z.string().min(1).max(128),
  title: z.string().min(1).max(200),
  savedAt: z.number().int().nonnegative(),
  openedAt: z.number().int().nonnegative().optional(),
  playable: z.boolean(),
  jsonText: z.string().min(1).max(MAX_BACKUP_SINGLE_GAME_JSON_LENGTH),
  authoringDraftJson: z.string().min(1).max(MAX_BACKUP_DRAFT_JSON_LENGTH).optional(),
})

const backupMediaEntrySchema = z.strictObject({
  resourceScopeKey: z.string().min(1).max(512),
  gameId: z.string().min(1).max(128),
  gameSha256: z.string().regex(/^[0-9a-f]{64}$/),
  sourcePath: z.string().min(1).max(1024),
  byteLength: z.number().int().positive(),
  sha256: z.string().regex(/^[0-9a-f]{64}$/),
  mediaType: sniffedMediaTypeSchema,
  bytesBase64: z.string().min(1),
})

export const backupDocumentSchema = z.strictObject({
  format: z.literal(BACKUP_FORMAT),
  schemaVersion: z.literal(BACKUP_SCHEMA_VERSION),
  exportedAt: z.number().int().nonnegative(),
  appVersion: z.string().min(1).max(64),
  games: z.array(backupGameEntrySchema).max(MAX_BACKUP_GAME_COUNT),
  packMedia: z.array(backupMediaEntrySchema).max(MAX_BACKUP_MEDIA_COUNT),
})

export type ParsedBackupDocument = z.infer<typeof backupDocumentSchema>

export function zodIssuesToBackupIssues(error: z.ZodError): readonly BackupIssue[] {
  const issues: BackupIssue[] = []
  for (const issue of error.issues) {
    const path = formatZodPath(issue.path)
    if (issue.code === 'unrecognized_keys') {
      issues.push(
        backupIssue(
          'unknown-field',
          'schema',
          path,
          `Unknown field in backup: ${(issue.keys ?? []).join(', ') || 'unrecognized'}.`,
        ),
      )
      continue
    }
    issues.push(
      backupIssue('invalid-field', 'schema', path, issue.message || 'Backup field is invalid.'),
    )
  }
  return issues.length > 0
    ? issues
    : [backupIssue('invalid-field', 'schema', '/', 'Backup document failed schema validation.')]
}

function formatZodPath(path: readonly PropertyKey[]): string {
  if (path.length === 0) return '/'
  let out = ''
  for (const segment of path) {
    if (typeof segment === 'number') {
      out += `[${segment}]`
    } else {
      // Path segments are always joined with a leading slash (Zod property keys).
      out += `/${String(segment)}`
    }
  }
  return out || '/'
}

export function isBackupPlainRecord(value: unknown): value is Record<string, unknown> {
  return isPlainRecord(value)
}
