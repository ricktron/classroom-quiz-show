import type { PersistenceAdapter } from '../persistence/adapter'
import {
  OBJECT_STORE_PACK_MEDIA_ASSETS,
  OBJECT_STORE_SAVED_DEFINITIONS,
  SAVED_DEFINITION_RECORD_VERSION,
} from '../persistence/constants'
import { packMediaStorageKey } from '../pack/packMediaPersistence'
import { backupIssue, sortBackupIssues } from './issues'
import type { BackupApplyResult, StagedBackup } from './types'

export interface ApplyBackupOptions {
  readonly adapter: PersistenceAdapter
  readonly staged: StagedBackup
  /**
   * Required when staged.conflictCount > 0. Without confirmation, apply fails
   * closed and writes nothing.
   */
  readonly confirmReplaceConflicts?: boolean
  /**
   * Optional generation / abort token. When provided and returns false before
   * write, apply aborts without mutation (stale async / navigation).
   */
  readonly stillValid?: () => boolean
}

/**
 * Apply a previously staged, validated backup.
 *
 * Writes saved definitions and pack media in one IndexedDB transaction when
 * both stores are touched. Does not mutate active Session or coordination.
 * Does not clear unrelated existing games that are absent from the backup
 * (merge semantics).
 */
export async function applyStagedBackup(
  options: ApplyBackupOptions,
): Promise<BackupApplyResult> {
  const { adapter, staged } = options

  if (options.stillValid && !options.stillValid()) {
    return {
      status: 'failure',
      issues: sortBackupIssues([
        backupIssue(
          'apply-aborted',
          'apply',
          '/',
          'Restore was cancelled because the page or session changed before it finished.',
        ),
      ]),
    }
  }

  if (staged.conflictCount > 0 && options.confirmReplaceConflicts !== true) {
    return {
      status: 'failure',
      issues: sortBackupIssues([
        backupIssue(
          'needs-confirmation',
          'preview',
          '/games',
          `This backup would replace ${staged.conflictCount} existing saved game${
            staged.conflictCount === 1 ? '' : 's'
          }. Confirm replace to continue. Nothing was changed yet.`,
        ),
      ]),
    }
  }

  if (options.stillValid && !options.stillValid()) {
    return {
      status: 'failure',
      issues: sortBackupIssues([
        backupIssue(
          'apply-aborted',
          'apply',
          '/',
          'Restore was cancelled because the page or session changed before it finished.',
        ),
      ]),
    }
  }

  const replacedGameCount = staged.conflictCount
  const documentById = new Map(staged.document.games.map((g) => [g.gameId, g]))

  const result = await adapter.withTransaction(
    [OBJECT_STORE_SAVED_DEFINITIONS, OBJECT_STORE_PACK_MEDIA_ASSETS],
    async (tx) => {
      for (const preview of staged.games) {
        const source = documentById.get(preview.gameId)
        if (!source) {
          throw new BackupApplyError('Staged game missing from backup document.')
        }
        await tx.put(OBJECT_STORE_SAVED_DEFINITIONS, preview.gameId, {
          recordVersion: SAVED_DEFINITION_RECORD_VERSION,
          gameId: preview.gameId,
          title: source.title,
          savedAt: source.savedAt,
          openedAt: source.openedAt,
          jsonText: source.jsonText,
          authoringDraftJson: source.authoringDraftJson,
          hasDraft: typeof source.authoringDraftJson === 'string',
          playable: source.playable,
        })
      }

      // Replace media by resource scope for scopes present in the backup, then
      // write all backup media. Scopes not in the backup are left untouched.
      const scopesInBackup = new Set(staged.media.map((m) => m.resourceScopeKey))
      if (scopesInBackup.size > 0) {
        const keys = await tx.getAllKeys(OBJECT_STORE_PACK_MEDIA_ASSETS)
        for (const key of keys) {
          const sep = key.indexOf('\0')
          if (sep <= 0) continue
          const scope = key.slice(0, sep)
          if (scopesInBackup.has(scope)) {
            await tx.delete(OBJECT_STORE_PACK_MEDIA_ASSETS, key)
          }
        }
      }

      for (const media of staged.media) {
        await tx.put(
          OBJECT_STORE_PACK_MEDIA_ASSETS,
          packMediaStorageKey(media.resourceScopeKey, media.sourcePath),
          {
            resourceScopeKey: media.resourceScopeKey,
            gameId: media.gameId,
            gameSha256: media.gameSha256,
            sourcePath: media.sourcePath,
            byteLength: media.byteLength,
            sha256: media.sha256,
            mediaType: media.mediaType,
            bytes: [...media.bytes],
          },
        )
      }
    },
  )

  if (!result.ok) {
    const code =
      result.code === 'quota-exceeded'
        ? 'quota-exceeded'
        : result.code === 'unavailable'
          ? 'unavailable'
          : 'apply-failed'
    return {
      status: 'failure',
      issues: sortBackupIssues([
        backupIssue(
          code,
          'apply',
          '/',
          result.message || 'The backup could not be restored to this device.',
        ),
      ]),
    }
  }

  return {
      status: 'success',
      appliedGameCount: staged.games.length,
      appliedMediaCount: staged.media.length,
      replacedGameCount,
  }
}

class BackupApplyError extends Error {}
