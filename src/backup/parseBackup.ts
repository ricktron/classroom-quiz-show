import type { RoundRegistry } from '../game/registry'
import { createDefaultRegistry } from '../game/defaultRegistry'
import { importGameFromJsonText } from '../import/importGame'
import { parseAuthoringDraftJson } from '../authoring/draftRecord'
import { sha256Hex } from '../pack/hash'
import { sniffMediaBytes } from '../pack/mediaSniff'
import { base64ToBytes } from './base64'
import {
  BACKUP_FORMAT,
  BACKUP_SCHEMA_VERSION,
  MAX_BACKUP_MEDIA_BYTES,
  MAX_BACKUP_TEXT_LENGTH,
  MAX_BACKUP_TOTAL_MEDIA_BYTES,
  SUPPORTED_BACKUP_SCHEMA_VERSIONS,
} from './constants'
import { backupIssue, sortBackupIssues, type BackupIssue } from './issues'
import { scanBackupDocument } from './safetyScan'
import {
  backupDocumentSchema,
  zodIssuesToBackupIssues,
} from './schemas'
import type {
  BackupGamePreview,
  BackupMediaPreview,
  BackupParseResult,
  StagedBackup,
} from './types'

export interface ParseBackupOptions {
  readonly registry?: RoundRegistry
  /** Existing library gameId → title for conflict preview. */
  readonly existingGames?: ReadonlyMap<string, string>
}

/**
 * Parse and validate an untrusted backup file into a staged preview.
 * Performs no durable writes.
 */
export async function parseBackupFromJsonText(
  text: unknown,
  options: ParseBackupOptions = {},
): Promise<BackupParseResult> {
  const registry = options.registry ?? createDefaultRegistry()
  const existingGames = options.existingGames ?? new Map<string, string>()

  if (typeof text !== 'string') {
    return fail(backupIssue('input-not-text', 'transport', '/', 'Backup input must be text.'))
  }
  if (text.trim().length === 0) {
    return fail(backupIssue('empty-input', 'transport', '/', 'Backup file is empty.'))
  }
  if (text.length > MAX_BACKUP_TEXT_LENGTH) {
    return fail(
      backupIssue(
        'input-too-large',
        'transport',
        '/',
        'Backup file is too large to read safely.',
      ),
    )
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    return fail(backupIssue('invalid-json', 'json-parse', '/', 'Backup file is not valid JSON.'))
  }

  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    return fail(
      backupIssue('root-not-object', 'json-parse', '/', 'Backup root must be a JSON object.'),
    )
  }

  const root = parsed as Record<string, unknown>
  if (!('format' in root)) {
    return fail(backupIssue('missing-format', 'format', '/format', 'Backup is missing its format identity.'))
  }
  if (root.format !== BACKUP_FORMAT) {
    return fail(
      backupIssue(
        'unsupported-format',
        'format',
        '/format',
        'This file is not a Classroom Quiz Show backup.',
      ),
    )
  }
  if (!('schemaVersion' in root)) {
    return fail(
      backupIssue(
        'missing-schema-version',
        'version',
        '/schemaVersion',
        'Backup is missing its schema version.',
      ),
    )
  }
  if (typeof root.schemaVersion !== 'number' || !Number.isInteger(root.schemaVersion)) {
    return fail(
      backupIssue(
        'invalid-schema-version',
        'version',
        '/schemaVersion',
        'Backup schema version must be a whole number.',
      ),
    )
  }
  if (
    !SUPPORTED_BACKUP_SCHEMA_VERSIONS.includes(
      root.schemaVersion as (typeof SUPPORTED_BACKUP_SCHEMA_VERSIONS)[number],
    )
  ) {
    return fail(
      backupIssue(
        'unsupported-schema-version',
        'version',
        '/schemaVersion',
        `Backup schema version ${root.schemaVersion} is not supported by this build.`,
      ),
    )
  }
  if (root.schemaVersion !== BACKUP_SCHEMA_VERSION) {
    return fail(
      backupIssue(
        'unsupported-schema-version',
        'version',
        '/schemaVersion',
        `Backup schema version ${root.schemaVersion} is not supported by this build.`,
      ),
    )
  }

  const safety = scanBackupDocument(parsed)
  if (safety.length > 0) {
    return { status: 'failure', issues: sortBackupIssues(safety) }
  }

  const schema = backupDocumentSchema.safeParse(parsed)
  if (!schema.success) {
    return { status: 'failure', issues: sortBackupIssues(zodIssuesToBackupIssues(schema.error)) }
  }

  const document = schema.data
  const issues: BackupIssue[] = []
  const seenGameIds = new Set<string>()
  const gamePreviews: BackupGamePreview[] = []

  for (const [index, entry] of document.games.entries()) {
    const path = `/games[${index}]`
    if (seenGameIds.has(entry.gameId)) {
      issues.push(
        backupIssue(
          'duplicate-game-id',
          'compatibility',
          path,
          `Backup lists game id “${entry.gameId}” more than once.`,
        ),
      )
      continue
    }
    seenGameIds.add(entry.gameId)

    const imported = importGameFromJsonText(entry.jsonText, { registry })
    if (imported.status !== 'success') {
      issues.push(
        backupIssue(
          'game-import-failed',
          'game-validate',
          `${path}/jsonText`,
          `Game “${entry.title}” in the backup failed validation and cannot be restored.`,
        ),
      )
      continue
    }
    if (imported.definition.id !== entry.gameId) {
      issues.push(
        backupIssue(
          'game-id-mismatch',
          'game-validate',
          `${path}/gameId`,
          `Backup game id does not match the portable game contents for “${entry.title}”.`,
        ),
      )
      continue
    }

    let draftReadable = true
    const hasDraft = typeof entry.authoringDraftJson === 'string'
    if (hasDraft) {
      const draft = parseAuthoringDraftJson(entry.authoringDraftJson!)
      if (draft === null) {
        issues.push(
          backupIssue(
            'draft-unreadable',
            'game-validate',
            `${path}/authoringDraftJson`,
            `Authoring draft for “${entry.title}” is unreadable. The backup cannot be restored until drafts are valid or removed.`,
          ),
        )
        draftReadable = false
      }
    }

    const existingTitle = existingGames.get(entry.gameId)
    gamePreviews.push({
      gameId: entry.gameId,
      title: entry.title,
      disposition: existingTitle === undefined ? 'new' : 'replace',
      ...(existingTitle !== undefined ? { existingTitle } : {}),
      definition: imported.definition,
      hasDraft,
      draftReadable,
    })
  }

  const mediaPreviews: BackupMediaPreview[] = []
  const mediaKeys = new Set<string>()
  let totalMediaBytes = 0

  for (const [index, entry] of document.packMedia.entries()) {
    const path = `/packMedia[${index}]`
    const key = `${entry.resourceScopeKey}\0${entry.sourcePath}`
    if (mediaKeys.has(key)) {
      issues.push(
        backupIssue(
          'duplicate-media-key',
          'compatibility',
          path,
          'Backup lists the same pack media entry more than once.',
        ),
      )
      continue
    }
    mediaKeys.add(key)

    if (entry.byteLength > MAX_BACKUP_MEDIA_BYTES) {
      issues.push(
        backupIssue(
          'media-too-large',
          'media-validate',
          path,
          'A media asset in the backup exceeds the maximum allowed size.',
        ),
      )
      continue
    }

    const bytes = base64ToBytes(entry.bytesBase64)
    if (bytes === null) {
      issues.push(
        backupIssue(
          'media-decode-failed',
          'media-validate',
          `${path}/bytesBase64`,
          'A media asset in the backup could not be decoded.',
        ),
      )
      continue
    }
    if (bytes.length !== entry.byteLength) {
      issues.push(
        backupIssue(
          'media-integrity-failed',
          'media-validate',
          `${path}/byteLength`,
          'A media asset length does not match its decoded bytes.',
        ),
      )
      continue
    }

    totalMediaBytes += bytes.length
    if (totalMediaBytes > MAX_BACKUP_TOTAL_MEDIA_BYTES) {
      issues.push(
        backupIssue(
          'media-total-too-large',
          'media-validate',
          '/packMedia',
          'Total media in the backup exceeds the maximum allowed size.',
        ),
      )
      break
    }

    let digest: string
    try {
      digest = await sha256Hex(bytes)
    } catch {
      issues.push(
        backupIssue(
          'media-integrity-failed',
          'media-validate',
          `${path}/sha256`,
          'Media integrity could not be verified on this device.',
        ),
      )
      continue
    }
    if (digest !== entry.sha256) {
      issues.push(
        backupIssue(
          'media-integrity-failed',
          'media-validate',
          `${path}/sha256`,
          'A media asset failed its integrity check.',
        ),
      )
      continue
    }

    const sniffed = sniffMediaBytes(bytes)
    if (sniffed.status !== 'success' || sniffed.mediaType !== entry.mediaType) {
      issues.push(
        backupIssue(
          'media-type-mismatch',
          'media-validate',
          `${path}/mediaType`,
          'A media asset type does not match its bytes.',
        ),
      )
      continue
    }

    mediaPreviews.push({
      resourceScopeKey: entry.resourceScopeKey,
      gameId: entry.gameId,
      sourcePath: entry.sourcePath,
      byteLength: entry.byteLength,
      mediaType: entry.mediaType,
      bytes,
      sha256: entry.sha256,
      gameSha256: entry.gameSha256,
    })
  }

  if (issues.length > 0) {
    return { status: 'failure', issues: sortBackupIssues(issues) }
  }

  const conflictCount = gamePreviews.filter((g) => g.disposition === 'replace').length
  const staged: StagedBackup = {
    document: {
      format: BACKUP_FORMAT,
      schemaVersion: BACKUP_SCHEMA_VERSION,
      exportedAt: document.exportedAt,
      appVersion: document.appVersion,
      games: document.games,
      packMedia: document.packMedia,
    },
    games: gamePreviews,
    media: mediaPreviews,
    conflictCount,
    newCount: gamePreviews.length - conflictCount,
  }

  return { status: 'success', staged }
}

function fail(issue: BackupIssue): BackupParseResult {
  return { status: 'failure', issues: sortBackupIssues([issue]) }
}
