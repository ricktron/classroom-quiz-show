import type { SessionEvent } from '../state/events'
import {
  buildCompletedSummaryRecordV1,
  decodeCompletedSummaryRecord,
  encodeCompletedSummaryRecord,
  selectCompletedSummaryKeysToDelete,
  validateClassLabel,
  type CompletedSummaryDecodeResult,
  type CompletedSummaryRecordV1,
} from '../summary/completedSummary'
import type { PersistenceAdapter } from './adapter'
import {
  ACTIVE_SESSION_KEY,
  OBJECT_STORE_ACTIVE_SESSIONS,
  OBJECT_STORE_COMPLETED_SUMMARIES,
} from './constants'
import { persistenceErr, persistenceOk, type PersistenceResult } from './results'
import type { PersistenceWriteQueue } from './writeQueue'

export interface CompletedSummaryListing {
  readonly key: string
  readonly diagnostic: CompletedSummaryDecodeResult['status']
  readonly decoded: CompletedSummaryDecodeResult
}

export interface SaveCompletedSummaryOptions {
  readonly savedAt: number
  readonly classLabel: string | null
}

export async function saveCompletedAndClearActive(
  adapter: PersistenceAdapter,
  history: readonly SessionEvent[],
  options: SaveCompletedSummaryOptions,
): Promise<PersistenceResult<CompletedSummaryRecordV1>> {
  const built = await buildCompletedSummaryRecordV1(history, options)
  if (built.status !== 'success') {
    return persistenceErr('invalid', built.message)
  }
  const result = await adapter.withTransaction(
    [OBJECT_STORE_COMPLETED_SUMMARIES, OBJECT_STORE_ACTIVE_SESSIONS],
    async (tx) => {
      await tx.put(
        OBJECT_STORE_COMPLETED_SUMMARIES,
        built.record.recordId,
        encodeCompletedSummaryRecord(built.record),
      )
      await tx.delete(OBJECT_STORE_ACTIVE_SESSIONS, ACTIVE_SESSION_KEY)
    },
  )
  return result.ok ? persistenceOk(built.record) : result
}

/**
 * Makes completion the terminal write for the active-session generation.
 *
 * The generation is advanced before enqueueing so an older queued active
 * session put observes itself as stale. Retention deliberately remains a
 * separate caller-owned operation after this atomic save-and-clear succeeds.
 */
export function enqueueSaveCompletedAndClearActive(
  adapter: PersistenceAdapter,
  history: readonly SessionEvent[],
  options: SaveCompletedSummaryOptions,
  writeQueue: PersistenceWriteQueue,
): Promise<PersistenceResult<CompletedSummaryRecordV1>> {
  writeQueue.nextActiveSessionGeneration()
  return writeQueue.enqueue(() => saveCompletedAndClearActive(adapter, history, options))
}

export async function listCompletedSummaries(
  adapter: PersistenceAdapter,
): Promise<PersistenceResult<readonly CompletedSummaryListing[]>> {
  const listings: CompletedSummaryListing[] = []
  const result = await adapter.withTransaction([OBJECT_STORE_COMPLETED_SUMMARIES], async (tx) => {
    const keys = [...(await tx.getAllKeys(OBJECT_STORE_COMPLETED_SUMMARIES))]
    keys.sort((a, b) => a.localeCompare(b))
    for (const key of keys) {
      const decoded = decodeCompletedSummaryForStoreKey(
        key,
        await tx.get(OBJECT_STORE_COMPLETED_SUMMARIES, key),
      )
      listings.push({ key, diagnostic: decoded.status, decoded })
    }
  })
  return result.ok ? persistenceOk(listings) : result
}

/**
 * Contract: IndexedDB key = recordId = summary.sessionId.
 * A value that is otherwise valid under a different key fails closed and is
 * never silently moved, repaired, or rewritten.
 */
export function decodeCompletedSummaryForStoreKey(
  storeKey: string,
  value: unknown,
): CompletedSummaryDecodeResult {
  const decoded = decodeCompletedSummaryRecord(value)
  if (decoded.status !== 'valid') return decoded
  if (decoded.record.recordId !== storeKey) {
    return {
      status: 'corrupt',
      message:
        'Object-store key does not equal recordId / summary.sessionId. The record is quarantined.',
    }
  }
  return decoded
}

export async function updateCompletedSummaryClassLabel(
  adapter: PersistenceAdapter,
  recordId: string,
  classLabel: string | null,
): Promise<PersistenceResult<CompletedSummaryRecordV1>> {
  const checkedLabel = validateClassLabel(classLabel)
  if (!checkedLabel.ok) return persistenceErr('invalid', checkedLabel.message)
  let updated: CompletedSummaryRecordV1 | undefined
  let dataError: PersistenceResult<never> | undefined
  const result = await adapter.withTransaction([OBJECT_STORE_COMPLETED_SUMMARIES], async (tx) => {
    const stored = await tx.get(OBJECT_STORE_COMPLETED_SUMMARIES, recordId)
    if (stored === undefined) {
      dataError = persistenceErr('not-found', 'No completed summary exists for that record id.')
      return
    }
    const decoded = decodeCompletedSummaryForStoreKey(recordId, stored)
    if (decoded.status !== 'valid') {
      dataError = persistenceErr(
        decoded.status.startsWith('unsupported-') ? 'unsupported-version' : 'corrupt',
        'The completed summary label cannot be updated because its record is not valid V1.',
      )
      return
    }
    updated = {
      ...decoded.record,
      classLabel: checkedLabel.value,
    }
    await tx.put(
      OBJECT_STORE_COMPLETED_SUMMARIES,
      recordId,
      encodeCompletedSummaryRecord(updated),
    )
  })
  if (!result.ok) return result
  if (dataError !== undefined) return dataError
  return updated === undefined
    ? persistenceErr('internal', 'The completed summary label update did not complete.')
    : persistenceOk(updated)
}

export async function deleteCompletedSummary(
  adapter: PersistenceAdapter,
  recordId: string,
): Promise<PersistenceResult<void>> {
  return adapter.withTransaction([OBJECT_STORE_COMPLETED_SUMMARIES], async (tx) => {
    await tx.delete(OBJECT_STORE_COMPLETED_SUMMARIES, recordId)
  })
}

export async function clearAllCompletedSummaries(
  adapter: PersistenceAdapter,
): Promise<PersistenceResult<void>> {
  return adapter.withTransaction([OBJECT_STORE_COMPLETED_SUMMARIES], async (tx) => {
    const keys = await tx.getAllKeys(OBJECT_STORE_COMPLETED_SUMMARIES)
    for (const key of keys) await tx.delete(OBJECT_STORE_COMPLETED_SUMMARIES, key)
  })
}

export async function enforceCompletedSummaryRetention(
  adapter: PersistenceAdapter,
  limit?: number,
): Promise<PersistenceResult<readonly string[]>> {
  const listed = await listCompletedSummaries(adapter)
  if (!listed.ok) return listed
  const keys = selectCompletedSummaryKeysToDelete(
    listed.value.map(({ key, decoded }) => ({ key, decoded })),
    limit,
  )
  const result = await adapter.withTransaction([OBJECT_STORE_COMPLETED_SUMMARIES], async (tx) => {
    for (const key of keys) await tx.delete(OBJECT_STORE_COMPLETED_SUMMARIES, key)
  })
  return result.ok ? persistenceOk(keys) : result
}
