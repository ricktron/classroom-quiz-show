import type { RoundRegistry } from '../game/registry'
import { createDefaultRegistry } from '../game/defaultRegistry'
import { importGameFromJsonText } from '../import/importGame'
import type { PersistenceAdapter } from '../persistence/adapter'
import { listSavedDefinitionRecords } from '../persistence/savedDefinitions'
import { listAllPackMediaAssets } from '../pack/packMediaPersistence'
import { CQS_APP_VERSION } from '../runtime/appVersion'
import { systemClock } from '../time/clock'
import { bytesToBase64 } from './base64'
import {
  BACKUP_FILENAME,
  BACKUP_FORMAT,
  BACKUP_SCHEMA_VERSION,
  MAX_BACKUP_GAME_COUNT,
  MAX_BACKUP_MEDIA_COUNT,
  MAX_BACKUP_TEXT_LENGTH,
  MAX_BACKUP_TOTAL_MEDIA_BYTES,
} from './constants'
import { backupIssue, sortBackupIssues } from './issues'
import type { BackupBuildResult, BackupDocumentV1, BackupGameEntry, BackupMediaEntry } from './types'

export interface BuildBackupOptions {
  readonly adapter: PersistenceAdapter
  readonly registry?: RoundRegistry
  readonly now?: number
  readonly appVersion?: string
}

/**
 * Build a validated backup document from local library + pack media.
 *
 * Does not mutate persistence. Does not include active Session, coordination,
 * completed summaries, or device prefs (H3 foundation scope).
 */
export async function buildBackupFromAdapter(
  options: BuildBackupOptions,
): Promise<BackupBuildResult> {
  const registry = options.registry ?? createDefaultRegistry()
  const issues = []

  const listed = await listSavedDefinitionRecords(options.adapter)
  if (!listed.ok) {
    return {
      status: 'failure',
      issues: sortBackupIssues([
        backupIssue(
          'unavailable',
          'transport',
          '/games',
          listed.message || 'Saved games could not be read for backup.',
        ),
      ]),
    }
  }

  if (listed.value.length > MAX_BACKUP_GAME_COUNT) {
    issues.push(
      backupIssue(
        'too-many-games',
        'schema',
        '/games',
        `Backup supports at most ${MAX_BACKUP_GAME_COUNT} saved games.`,
      ),
    )
  }

  const games: BackupGameEntry[] = []
  const seenIds = new Set<string>()
  for (const [index, record] of listed.value.entries()) {
    const path = `/games[${index}]`
    if (seenIds.has(record.gameId)) {
      issues.push(
        backupIssue(
          'duplicate-game-id',
          'compatibility',
          path,
          `Duplicate saved game id “${record.gameId}” cannot be backed up.`,
        ),
      )
      continue
    }
    seenIds.add(record.gameId)

    const imported = importGameFromJsonText(record.jsonText, { registry })
    if (imported.status !== 'success') {
      issues.push(
        backupIssue(
          'game-import-failed',
          'game-validate',
          `${path}/jsonText`,
          `Saved game “${record.title}” is not a valid portable game and cannot be backed up.`,
        ),
      )
      continue
    }
    if (imported.definition.id !== record.gameId) {
      issues.push(
        backupIssue(
          'game-id-mismatch',
          'game-validate',
          `${path}/gameId`,
          `Saved game id does not match its portable game contents.`,
        ),
      )
      continue
    }

    const entry: BackupGameEntry = {
      gameId: record.gameId,
      title: record.title,
      savedAt: record.savedAt,
      playable: record.playable,
      jsonText: record.jsonText,
      ...(typeof record.openedAt === 'number' ? { openedAt: record.openedAt } : {}),
      ...(typeof record.authoringDraftJson === 'string'
        ? { authoringDraftJson: record.authoringDraftJson }
        : {}),
    }
    games.push(entry)
  }

  const mediaListed = await listAllPackMediaAssets(options.adapter)
  if (mediaListed.skippedCorrupt > 0) {
    issues.push(
      backupIssue(
        'media-integrity-failed',
        'media-validate',
        '/packMedia',
        'One or more pack media records on this device are corrupt and cannot be backed up.',
      ),
    )
  }
  if (mediaListed.records.length > MAX_BACKUP_MEDIA_COUNT) {
    issues.push(
      backupIssue(
        'too-many-media',
        'schema',
        '/packMedia',
        `Backup supports at most ${MAX_BACKUP_MEDIA_COUNT} media assets.`,
      ),
    )
  }

  let totalMediaBytes = 0
  const packMedia: BackupMediaEntry[] = []
  const mediaKeys = new Set<string>()
  for (const [index, record] of mediaListed.records.entries()) {
    const path = `/packMedia[${index}]`
    const key = `${record.resourceScopeKey}\0${record.sourcePath}`
    if (mediaKeys.has(key)) {
      issues.push(
        backupIssue(
          'duplicate-media-key',
          'compatibility',
          path,
          'Duplicate pack media entry cannot be backed up.',
        ),
      )
      continue
    }
    mediaKeys.add(key)
    totalMediaBytes += record.byteLength
    if (totalMediaBytes > MAX_BACKUP_TOTAL_MEDIA_BYTES) {
      issues.push(
        backupIssue(
          'media-total-too-large',
          'media-validate',
          '/packMedia',
          'Total pack media in this library is too large for one backup file.',
        ),
      )
      break
    }
    packMedia.push({
      resourceScopeKey: record.resourceScopeKey,
      gameId: record.gameId,
      gameSha256: record.gameSha256,
      sourcePath: record.sourcePath,
      byteLength: record.byteLength,
      sha256: record.sha256,
      mediaType: record.mediaType,
      bytesBase64: bytesToBase64(record.bytes),
    })
  }

  if (issues.length > 0) {
    return { status: 'failure', issues: sortBackupIssues(issues) }
  }

  const document: BackupDocumentV1 = {
    format: BACKUP_FORMAT,
    schemaVersion: BACKUP_SCHEMA_VERSION,
    exportedAt: options.now ?? systemClock.now(),
    appVersion: options.appVersion ?? CQS_APP_VERSION,
    games,
    packMedia,
  }

  const jsonText = `${JSON.stringify(document)}\n`
  if (jsonText.length > MAX_BACKUP_TEXT_LENGTH) {
    return {
      status: 'failure',
      issues: sortBackupIssues([
        backupIssue(
          'input-too-large',
          'transport',
          '/',
          'The backup file would be too large to write safely.',
        ),
      ]),
    }
  }

  return {
    status: 'success',
    document,
    jsonText,
    filename: BACKUP_FILENAME,
    metadata: {
      gameCount: games.length,
      mediaCount: packMedia.length,
      characterCount: jsonText.length,
    },
  }
}
