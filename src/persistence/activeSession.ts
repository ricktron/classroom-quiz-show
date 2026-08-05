import type { RoundRegistry } from '../game/registry'
import type { SessionEvent } from '../state/events'
import type { PersistenceAdapter } from './adapter'
import { ACTIVE_SESSION_KEY, OBJECT_STORE_ACTIVE_SESSIONS } from './constants'
import { persistenceErr, persistenceOk, type PersistenceErrorCode, type PersistenceResult } from './results'
import type { PersistenceWriteQueue } from './writeQueue'
import { skippedStaleWrite } from './writeQueue'
import {
  decodeActiveSessionRecord,
  encodeActiveSessionRecord,
  isResumableHistory,
} from './wire/sessionWire'

export type ActiveSessionRead =
  | { readonly kind: 'none' }
  | {
      readonly kind: 'resumable'
      readonly events: readonly SessionEvent[]
      readonly savedAt: number
    }
  | {
      readonly kind: 'invalid'
      readonly code: PersistenceErrorCode
      readonly message: string
    }

export async function readActiveSession(
  adapter: PersistenceAdapter,
  registry?: RoundRegistry,
): Promise<PersistenceResult<ActiveSessionRead>> {
  let stored: unknown
  const result = await adapter.withTransaction([OBJECT_STORE_ACTIVE_SESSIONS], async (tx) => {
    stored = await tx.get(OBJECT_STORE_ACTIVE_SESSIONS, ACTIVE_SESSION_KEY)
  })
  if (!result.ok) return result
  if (stored === undefined) return persistenceOk({ kind: 'none' })

  const decoded = decodeActiveSessionRecord(stored, { registry })
  if (!decoded.ok) {
    return persistenceOk({ kind: 'invalid', code: decoded.code, message: decoded.message })
  }
  if (!isResumableHistory(decoded.value.events)) {
    return persistenceOk({
      kind: 'invalid',
      code: 'invalid',
      message: 'The stored active session is not resumable.',
    })
  }
  return persistenceOk({
    kind: 'resumable',
    events: decoded.value.events,
    savedAt: decoded.value.savedAt,
  })
}

export async function writeActiveSession(
  adapter: PersistenceAdapter,
  events: readonly SessionEvent[],
  savedAt: number,
  writeQueue: PersistenceWriteQueue,
  registry?: RoundRegistry,
): Promise<PersistenceResult<void>> {
  const generation = writeQueue.nextActiveSessionGeneration()
  return writeQueue.enqueue(async () => {
    if (!writeQueue.isLatestActiveSessionGeneration(generation)) {
      return skippedStaleWrite()
    }
    if (!isResumableHistory(events)) {
      // Completion normally uses enqueueSaveCompletedAndClearActive so the
      // ledger write and recovery cleanup are atomic. Keep this defensive clear
      // for every other non-resumable history and for callers outside that path.
      return clearActiveSession(adapter)
    }
    const encoded = encodeActiveSessionRecord(events, savedAt, { registry })
    if (!encoded.ok) return encoded
    return adapter.withTransaction([OBJECT_STORE_ACTIVE_SESSIONS], async (tx) => {
      await tx.put(OBJECT_STORE_ACTIVE_SESSIONS, ACTIVE_SESSION_KEY, encoded.value)
    })
  })
}

export async function clearActiveSession(
  adapter: PersistenceAdapter,
): Promise<PersistenceResult<void>> {
  return adapter.withTransaction([OBJECT_STORE_ACTIVE_SESSIONS], async (tx) => {
    await tx.delete(OBJECT_STORE_ACTIVE_SESSIONS, ACTIVE_SESSION_KEY)
  })
}

export function activeSessionWriteFailed(): PersistenceResult<void> {
  return persistenceErr('transaction-failed', 'The active session could not be written.')
}
