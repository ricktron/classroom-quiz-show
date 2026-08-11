import {
  browserLocalConfigStorage,
  clearKeyboardMapping,
  type LocalConfigStorage,
} from '../input/keyboardMappingStore'
import type { PersistenceAdapter } from './adapter'
import { PERSISTENCE_DB_NAME } from './constants'
import {
  IndexedDbPersistenceAdapter,
  PERSISTENCE_OBJECT_STORES,
} from './indexedDbAdapter'
import { MemoryPersistenceAdapter } from './memoryAdapter'
import { persistenceErr, persistenceOk, type PersistenceResult } from './results'

/**
 * Teacher-facing aggregate wipe of all CQS-owned durable local data on this
 * browser/device.
 *
 * Coverage:
 * - IndexedDB database `classroom-quiz-show-persistence` (all six object stores)
 * - localStorage keyboard mapping key
 *
 * Does NOT unregister the service worker or clear the HTTP/PWA shell cache.
 * Blocked or failed IndexedDB deletion is never reported as success, and
 * keyboard prefs are only cleared after durable storage wipe succeeds.
 */

export const CLEAR_ALL_LOCAL_DATA_BLOCKED_MESSAGE =
  'Could not clear all local CQS data because another Classroom Quiz Show tab or window still has storage open. Close other CQS tabs and windows, then try again.'

export const CLEAR_ALL_LOCAL_DATA_FAILED_MESSAGE =
  'Could not clear all local CQS data. Local storage may still contain Classroom Quiz Show data on this browser.'

export const CLEAR_ALL_LOCAL_DATA_UNAVAILABLE_MESSAGE =
  'Could not clear all local CQS data because browser storage is unavailable.'

export const CLEAR_ALL_LOCAL_DATA_SUCCESS_MESSAGE =
  'All local Classroom Quiz Show data on this browser was cleared. Reloading a clean host.'

export interface ClearAllLocalDataOptions {
  readonly adapter: PersistenceAdapter
  /** Override IndexedDB factory (tests). Defaults to the adapter's factory or globalThis. */
  readonly indexedDB?: IDBFactory | null
  /** Override DB name (tests). */
  readonly dbName?: string
  /** Override keyboard localStorage surface (tests). */
  readonly localConfigStorage?: LocalConfigStorage | null
}

/**
 * Close the live adapter for destruction, delete the CQS IndexedDB database (or
 * empty the memory adapter), then clear the keyboard mapping key.
 *
 * onsuccess → ok
 * onerror → delete-failed (not success)
 * onblocked → delete-blocked (not success; no partial claim)
 */
export async function clearAllLocalCqsData(
  options: ClearAllLocalDataOptions,
): Promise<PersistenceResult<void>> {
  const { adapter } = options
  const localConfigStorage =
    options.localConfigStorage === undefined
      ? browserLocalConfigStorage()
      : options.localConfigStorage

  adapter.beginDestructiveReset?.()
  await adapter.close()

  if (adapter.kind === 'memory') {
    const cleared = await clearMemoryAdapter(adapter)
    adapter.finishDestructiveReset?.(cleared.ok)
    if (!cleared.ok) return cleared
    clearKeyboardMapping(localConfigStorage)
    return persistenceOk(undefined)
  }

  const factory =
    options.indexedDB !== undefined
      ? options.indexedDB
      : adapter instanceof IndexedDbPersistenceAdapter
        ? adapter.indexedDBFactory
        : (globalThis.indexedDB ?? null)

  if (!factory) {
    adapter.finishDestructiveReset?.(false)
    return persistenceErr('unavailable', CLEAR_ALL_LOCAL_DATA_UNAVAILABLE_MESSAGE)
  }

  const dbName =
    options.dbName ??
    (adapter instanceof IndexedDbPersistenceAdapter ? adapter.databaseName : PERSISTENCE_DB_NAME)

  const deleted = await deletePersistenceDatabase(factory, dbName)
  adapter.finishDestructiveReset?.(deleted.ok)
  if (!deleted.ok) return deleted

  clearKeyboardMapping(localConfigStorage)
  return persistenceOk(undefined)
}

async function clearMemoryAdapter(adapter: PersistenceAdapter): Promise<PersistenceResult<void>> {
  if (adapter instanceof MemoryPersistenceAdapter) {
    adapter.replaceWithEmptyDatabase()
    return persistenceOk(undefined)
  }

  // Generic memory-shaped adapter without the helper: reopen briefly, clear keys.
  adapter.finishDestructiveReset?.(false)
  const opened = await adapter.open()
  if (!opened.ok) return opened
  const cleared = await adapter.withTransaction([...PERSISTENCE_OBJECT_STORES], async (tx) => {
    for (const store of PERSISTENCE_OBJECT_STORES) {
      const keys = await tx.getAllKeys(store)
      for (const key of keys) {
        await tx.delete(store, key)
      }
    }
  })
  await adapter.close()
  return cleared
}

function deletePersistenceDatabase(
  factory: IDBFactory,
  dbName: string,
): Promise<PersistenceResult<void>> {
  return new Promise((resolve) => {
    let settled = false
    const settle = (result: PersistenceResult<void>): void => {
      if (settled) return
      settled = true
      resolve(result)
    }

    let request: IDBOpenDBRequest
    try {
      request = factory.deleteDatabase(dbName)
    } catch {
      settle(persistenceErr('unavailable', CLEAR_ALL_LOCAL_DATA_UNAVAILABLE_MESSAGE))
      return
    }

    request.onsuccess = () => settle(persistenceOk(undefined))
    request.onerror = () =>
      settle(persistenceErr('delete-failed', CLEAR_ALL_LOCAL_DATA_FAILED_MESSAGE))
    // Blocked is NEVER success. Do not wait for a later success after reporting.
    request.onblocked = () =>
      settle(persistenceErr('delete-blocked', CLEAR_ALL_LOCAL_DATA_BLOCKED_MESSAGE))
  })
}
