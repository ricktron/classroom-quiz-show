/**
 * Real Chromium IndexedDB probe for restore atomicity.
 *
 * Bundled into the browser by backup-idb-atomicity.spec.ts. Do not run this
 * file under Vitest or the memory adapter — those cannot see IndexedDB commit.
 */
import { applyStagedBackup } from '../../src/backup/applyBackup'
import { BACKUP_FORMAT, BACKUP_SCHEMA_VERSION } from '../../src/backup/constants'
import type { BackupApplyResult, StagedBackup } from '../../src/backup/types'
import type { PersistenceTx } from '../../src/persistence/adapter'
import {
  createIndexedDbPersistenceAdapter,
  type IndexedDbPersistenceAdapter,
} from '../../src/persistence/indexedDbAdapter'
import { packMediaStorageKey } from '../../src/pack/packMediaPersistence'

const OLD_MEDIA_KEY = packMediaStorageKey('scope-a', 'old.png')
const NEW_MEDIA_KEY = packMediaStorageKey('scope-a', 'new.png')
const STAY_MEDIA_KEY = packMediaStorageKey('scope-b', 'stay.png')

export async function runIdbAtomicityProbe(): Promise<Record<string, unknown>> {
  const requestSuccessIsNotCommit = await probeRequestSuccessIsNotCommit()
  const staleBeforeFirstWrite = await probeStaleApply(3)
  const staleAfterRequestsBeforeCommit = await probeStaleApply(4)
  const committedThenOwnershipLost = await probeCommittedThenOwnershipLost()
  const retryAfterStaleApplies = await probeRetryAfterStale()
  const repeatedRestoreLastWriteWins = await probeRepeatedRestore()
  const cloneErrorRollsBackEarlierPut = await probeCloneErrorRollsBack()
  const throwAfterCommitIsNotDenied = await probeThrowAfterCommit()

  return {
    requestSuccessIsNotCommit,
    staleBeforeFirstWrite,
    staleAfterRequestsBeforeCommit,
    committedThenOwnershipLost,
    retryAfterStaleApplies,
    repeatedRestoreLastWriteWins,
    cloneErrorRollsBackEarlierPut,
    throwAfterCommitIsNotDenied,
    // Origin quota is not reliably exhaustible here without filling the disk.
    quotaTested: false,
  }
}

async function probeRequestSuccessIsNotCommit(): Promise<Record<string, unknown>> {
  const adapter = await openNamed('request-vs-commit')
  try {
    await seedLibrary(adapter)
    let putPromiseResolved = false
    const result = await adapter.withTransaction(
      ['savedDefinitions', 'packMediaAssets'],
      async (tx) => {
        await tx.put('savedDefinitions', 'keep', { title: 'Mutated', marker: 'request-ok' })
        await tx.put('packMediaAssets', NEW_MEDIA_KEY, { marker: 'partial-media' })
        putPromiseResolved = true
        throw new Error('stale before commit')
      },
    )
    const state = await readState(adapter)
    return {
      putPromiseResolved,
      resultOk: result.ok,
      resultCode: result.ok ? null : result.code,
      keepMarker: markerOf(state.keep),
      keepTitle: titleOf(state.keep),
      partialMedia: state.newMedia,
    }
  } finally {
    await adapter.close()
  }
}

async function probeStaleApply(denyAtCall: number): Promise<Record<string, unknown>> {
  const adapter = await openNamed(`stale-${denyAtCall}`)
  try {
    await seedLibrary(adapter)
    let calls = 0
    const applied = await applyStagedBackup({
      adapter,
      staged: replacementBackup(),
      confirmReplaceConflicts: true,
      stillValid: () => {
        calls += 1
        return calls < denyAtCall
      },
    })
    return {
      calls,
      ...summarizeApply(applied),
      ...(await libraryFacts(adapter)),
    }
  } finally {
    await adapter.close()
  }
}

async function probeCommittedThenOwnershipLost(): Promise<Record<string, unknown>> {
  const adapter = await openNamed('commit')
  try {
    await seedLibrary(adapter)
    let owned = true
    const applied = await applyStagedBackup({
      adapter,
      staged: replacementBackup(),
      confirmReplaceConflicts: true,
      stillValid: () => owned,
    })
    owned = false
    return {
      ownershipAfterReturn: owned,
      ...summarizeApply(applied),
      ...(await libraryFacts(adapter)),
    }
  } finally {
    await adapter.close()
  }
}

async function probeRetryAfterStale(): Promise<Record<string, unknown>> {
  const adapter = await openNamed('retry')
  try {
    await seedLibrary(adapter)
    let calls = 0
    const first = await applyStagedBackup({
      adapter,
      staged: replacementBackup(),
      confirmReplaceConflicts: true,
      stillValid: () => {
        calls += 1
        return calls < 4
      },
    })
    const afterAbort = await libraryFacts(adapter)
    const second = await applyStagedBackup({
      adapter,
      staged: replacementBackup(),
      confirmReplaceConflicts: true,
      stillValid: () => true,
    })
    const afterRetry = await libraryFacts(adapter)
    return {
      firstStatus: first.status,
      firstIssueCode: issueCode(first),
      incomingAfterAbort: afterAbort.incomingTitle,
      secondStatus: second.status,
      incomingAfterRetry: afterRetry.incomingTitle,
      keepTitleAfterRetry: afterRetry.keepTitle,
    }
  } finally {
    await adapter.close()
  }
}

async function probeRepeatedRestore(): Promise<Record<string, unknown>> {
  const adapter = await openNamed('repeat')
  try {
    await seedLibrary(adapter)
    const first = await applyStagedBackup({
      adapter,
      staged: replacementBackup('First title', 'first-draft'),
      confirmReplaceConflicts: true,
      stillValid: () => true,
    })
    const second = await applyStagedBackup({
      adapter,
      staged: replacementBackup('Second title', 'second-draft'),
      confirmReplaceConflicts: true,
      stillValid: () => true,
    })
    const facts = await libraryFacts(adapter)
    return {
      firstStatus: first.status,
      secondStatus: second.status,
      keepTitle: facts.keepTitle,
      keepDraft: facts.keepDraft,
    }
  } finally {
    await adapter.close()
  }
}

async function probeThrowAfterCommit(): Promise<Record<string, unknown>> {
  const adapter = await openNamed('after-commit')
  try {
    await seedLibrary(adapter)
    const result = await adapter.withTransaction(['savedDefinitions'], async (tx) => {
      await tx.put('savedDefinitions', 'keep', {
        title: 'Committed',
        authoringDraftJson: 'committed-draft',
        marker: 'after-macrotask',
      })
      // A macrotask ends the IndexedDB transaction lifetime. The put above
      // commits before this throw. The adapter must not report that as a rollback.
      await new Promise((resolve) => {
        setTimeout(resolve, 0)
      })
      throw new Error('ownership changed after commit')
    })
    const state = await readState(adapter)
    return {
      resultOk: result.ok,
      resultCode: result.ok ? null : result.code,
      keepTitle: titleOf(state.keep),
      keepDraft: draftOf(state.keep),
      keepMarker: markerOf(state.keep),
    }
  } finally {
    await adapter.close()
  }
}

async function probeCloneErrorRollsBack(): Promise<Record<string, unknown>> {
  const adapter = await openNamed('clone')
  try {
    await seedLibrary(adapter)
    const result = await adapter.withTransaction(['savedDefinitions'], async (tx) => {
      await tx.put('savedDefinitions', 'incoming', { title: 'Should roll back' })
      await tx.put('savedDefinitions', 'keep', { title: 'Nope', bad: () => 0 })
    })
    const state = await readState(adapter)
    return {
      resultCode: result.ok ? null : result.code,
      incomingTitle: titleOf(state.incoming),
      keepTitle: titleOf(state.keep),
    }
  } finally {
    await adapter.close()
  }
}

function replacementBackup(title = 'Replaced', draft = 'new-draft'): StagedBackup {
  const games = [
    {
      gameId: 'keep',
      title,
      savedAt: 20,
      openedAt: 21,
      playable: true,
      jsonText: '{"id":"keep"}',
      authoringDraftJson: draft,
    },
    {
      gameId: 'incoming',
      title: 'Incoming',
      savedAt: 22,
      openedAt: 23,
      playable: true,
      jsonText: '{"id":"incoming"}',
      authoringDraftJson: 'incoming-draft',
    },
  ]
  return {
    conflictCount: 0,
    newCount: 1,
    document: {
      format: BACKUP_FORMAT,
      schemaVersion: BACKUP_SCHEMA_VERSION,
      exportedAt: 1,
      appVersion: 'idb-atomicity-probe',
      games,
      packMedia: [],
    },
    games: games.map((game) => ({
      gameId: game.gameId,
      title: game.title,
      disposition: 'new' as const,
      definition: {} as StagedBackup['games'][number]['definition'],
      hasDraft: true,
      draftReadable: true,
    })),
    media: [
      {
        resourceScopeKey: 'scope-a',
        gameId: 'incoming',
        sourcePath: 'new.png',
        byteLength: 3,
        mediaType: 'image/png',
        bytes: new Uint8Array([9, 8, 7]),
        sha256: 'a'.repeat(64),
        gameSha256: 'b'.repeat(64),
      },
    ],
  }
}

async function openNamed(label: string): Promise<IndexedDbPersistenceAdapter> {
  const adapter = createIndexedDbPersistenceAdapter({
    dbName: `cqs-idb-atomicity-${label}-${crypto.randomUUID()}`,
  })
  const opened = await adapter.open()
  if (!opened.ok) throw new Error(opened.message)
  return adapter
}

async function seedLibrary(adapter: IndexedDbPersistenceAdapter): Promise<void> {
  const seeded = await adapter.withTransaction(
    ['savedDefinitions', 'packMediaAssets', 'activeSessions'],
    async (tx) => {
      await tx.put('savedDefinitions', 'keep', {
        title: 'Original',
        authoringDraftJson: 'old-draft',
        marker: 'keep-original',
      })
      await tx.put('savedDefinitions', 'other', {
        title: 'Other',
        marker: 'untouched-game',
      })
      await tx.put('packMediaAssets', OLD_MEDIA_KEY, { marker: 'old-scope-a' })
      await tx.put('packMediaAssets', STAY_MEDIA_KEY, { marker: 'stay-scope-b' })
      await tx.put('activeSessions', 'current', { marker: 'session-untouched' })
    },
  )
  if (!seeded.ok) throw new Error(seeded.message)
}

async function libraryFacts(
  adapter: IndexedDbPersistenceAdapter,
): Promise<Record<string, unknown>> {
  const state = await readState(adapter)
  const newMedia = recordOf(state.newMedia)
  return {
    keepTitle: titleOf(state.keep),
    keepDraft: draftOf(state.keep),
    otherTitle: titleOf(state.other),
    incomingTitle: titleOf(state.incoming),
    incomingDraft: draftOf(state.incoming),
    oldMediaMarker: markerOf(state.oldMedia),
    newMediaSourcePath: typeof newMedia?.sourcePath === 'string' ? newMedia.sourcePath : null,
    newMediaByteLength: typeof newMedia?.byteLength === 'number' ? newMedia.byteLength : null,
    stayMediaMarker: markerOf(state.stayMedia),
    sessionMarker: markerOf(state.session),
  }
}

async function readState(adapter: IndexedDbPersistenceAdapter): Promise<Record<string, unknown>> {
  const found: Record<string, unknown> = {}
  const result = await adapter.withTransaction(
    ['savedDefinitions', 'packMediaAssets', 'activeSessions'],
    async (tx: PersistenceTx) => {
      found.keep = await tx.get('savedDefinitions', 'keep')
      found.other = await tx.get('savedDefinitions', 'other')
      found.incoming = await tx.get('savedDefinitions', 'incoming')
      found.oldMedia = await tx.get('packMediaAssets', OLD_MEDIA_KEY)
      found.newMedia = await tx.get('packMediaAssets', NEW_MEDIA_KEY)
      found.stayMedia = await tx.get('packMediaAssets', STAY_MEDIA_KEY)
      found.session = await tx.get('activeSessions', 'current')
    },
  )
  if (!result.ok) throw new Error(result.message)
  return {
    keep: found.keep ?? null,
    other: found.other ?? null,
    incoming: found.incoming ?? null,
    oldMedia: found.oldMedia ?? null,
    newMedia: found.newMedia ?? null,
    stayMedia: found.stayMedia ?? null,
    session: found.session ?? null,
  }
}

function summarizeApply(applied: BackupApplyResult): Record<string, unknown> {
  return {
    status: applied.status,
    issueCode: issueCode(applied),
    issueMessage: applied.status === 'failure' ? (applied.issues[0]?.message ?? null) : null,
  }
}

function issueCode(applied: BackupApplyResult): string | null {
  if (applied.status !== 'failure') return null
  return applied.issues[0]?.code ?? null
}

function recordOf(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object') return null
  return value as Record<string, unknown>
}

function titleOf(value: unknown): string | null {
  const title = recordOf(value)?.title
  return typeof title === 'string' ? title : null
}

function draftOf(value: unknown): string | null {
  const draft = recordOf(value)?.authoringDraftJson
  return typeof draft === 'string' ? draft : null
}

function markerOf(value: unknown): string | null {
  const marker = recordOf(value)?.marker
  return typeof marker === 'string' ? marker : null
}
