import {
  OBJECT_STORE_ACTIVE_SESSIONS,
  OBJECT_STORE_COMPLETED_SUMMARIES,
  OBJECT_STORE_COORDINATION,
  OBJECT_STORE_PACK_MEDIA_ASSETS,
  OBJECT_STORE_SAVED_DEFINITIONS,
  OBJECT_STORE_SONY_BUZZ_MAPPINGS,
  PERSISTENCE_DB_NAME,
  PERSISTENCE_DB_VERSION,
} from './constants'
import type { PersistenceAdapter, PersistenceStoreName, PersistenceTx } from './adapter'
import { persistenceErr, persistenceOk, type PersistenceResult } from './results'

export interface IndexedDbPersistenceAdapterOptions {
  readonly indexedDB?: IDBFactory | null
  readonly dbName?: string
}

export interface PersistenceSchemaDatabase {
  readonly objectStoreNames: { contains(name: string): boolean }
  createObjectStore(name: string): unknown
}

export const PERSISTENCE_OBJECT_STORES: readonly PersistenceStoreName[] = [
  OBJECT_STORE_SAVED_DEFINITIONS,
  OBJECT_STORE_ACTIVE_SESSIONS,
  OBJECT_STORE_COORDINATION,
  OBJECT_STORE_COMPLETED_SUMMARIES,
  OBJECT_STORE_PACK_MEDIA_ASSETS,
  OBJECT_STORE_SONY_BUZZ_MAPPINGS,
]

export function upgradePersistenceSchema(db: PersistenceSchemaDatabase): void {
  for (const store of PERSISTENCE_OBJECT_STORES) {
    if (!db.objectStoreNames.contains(store)) db.createObjectStore(store)
  }
}

export class IndexedDbPersistenceAdapter implements PersistenceAdapter {
  readonly kind = 'indexeddb'

  private readonly factory: IDBFactory | null
  private readonly dbName: string
  private db: IDBDatabase | null = null
  /** When true, open() refuses so a wipe cannot recreate the DB mid-flight. */
  private destructionInProgress = false
  /** When true, this adapter instance will never reopen (post-success wipe). */
  private sealed = false

  constructor(options: IndexedDbPersistenceAdapterOptions = {}) {
    this.factory = options.indexedDB ?? globalThis.indexedDB ?? null
    this.dbName = options.dbName ?? PERSISTENCE_DB_NAME
  }

  /** Database name this adapter targets (for deleteDatabase / diagnostics). */
  get databaseName(): string {
    return this.dbName
  }

  /** IndexedDB factory this adapter uses, or null when unavailable. */
  get indexedDBFactory(): IDBFactory | null {
    return this.factory
  }

  /**
   * Close the live connection and refuse reopen until `finishDestructiveReset`
   * runs. Prevents stale writes from recreating the DB during deleteDatabase.
   */
  beginDestructiveReset(): void {
    this.destructionInProgress = true
    this.db?.close()
    this.db = null
  }

  /**
   * End a destructive reset. On success the adapter stays sealed; on failure it
   * may open again so the teacher can retry after closing other tabs.
   */
  finishDestructiveReset(success: boolean): void {
    this.destructionInProgress = false
    if (success) {
      this.sealed = true
      this.db?.close()
      this.db = null
    }
  }

  sealForDestruction(): void {
    this.beginDestructiveReset()
    this.finishDestructiveReset(true)
  }

  async open(): Promise<PersistenceResult<void>> {
    if (this.sealed || this.destructionInProgress) {
      return persistenceErr(
        'unavailable',
        this.sealed
          ? 'Local persistence was sealed after a data reset and will not reopen in this tab.'
          : 'Local persistence is temporarily closed while clearing all local CQS data.',
      )
    }
    if (!this.factory) {
      return persistenceErr('unavailable', 'IndexedDB is unavailable in this browser.')
    }
    if (this.db) return persistenceOk(undefined)

    try {
      const db = await openDatabase(this.factory, this.dbName)
      this.db = db
      return persistenceOk(undefined)
    } catch (error) {
      if (error instanceof UpgradeBlockedError) {
        return persistenceErr(
          'upgrade-blocked',
          'IndexedDB upgrade is blocked by another open Classroom Quiz Show tab.',
        )
      }
      return persistenceErr('unavailable', 'IndexedDB could not be opened.')
    }
  }

  async close(): Promise<void> {
    this.db?.close()
    this.db = null
  }

  async withTransaction(
    stores: readonly PersistenceStoreName[],
    work: (tx: PersistenceTx) => Promise<void>,
  ): Promise<PersistenceResult<void>> {
    if (!this.db) {
      const opened = await this.open()
      if (!opened.ok) return opened
    }
    const db = this.db
    if (!db) return persistenceErr('unavailable', 'IndexedDB is not open.')

    try {
      const transaction = db.transaction([...new Set(stores)], 'readwrite')
      const completion = transactionCompletion(transaction)
      const tx: PersistenceTx = {
        get: async (store, key) => requestResult(transaction.objectStore(store).get(key)),
        put: async (store, key, value) => {
          await requestResult(transaction.objectStore(store).put(value, key))
        },
        delete: async (store, key) => {
          await requestResult(transaction.objectStore(store).delete(key))
        },
        getAllKeys: async (store) =>
          requestResult(transaction.objectStore(store).getAllKeys()).then((keys) =>
            keys.filter((key): key is string => typeof key === 'string'),
          ),
        getAll: async (store) => requestResult(transaction.objectStore(store).getAll()),
      }

      await work(tx)
      await completion
      return persistenceOk(undefined)
    } catch (error) {
      if (isQuotaExceededError(error)) {
        return persistenceErr('quota-exceeded', 'Browser storage quota was exceeded.')
      }
      return persistenceErr('transaction-failed', 'The IndexedDB transaction failed.')
    }
  }
}

export function createIndexedDbPersistenceAdapter(
  options: IndexedDbPersistenceAdapterOptions = {},
): IndexedDbPersistenceAdapter {
  return new IndexedDbPersistenceAdapter(options)
}

function openDatabase(factory: IDBFactory, dbName: string): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = factory.open(dbName, PERSISTENCE_DB_VERSION)
    request.onupgradeneeded = () => {
      upgradePersistenceSchema(request.result)
    }
    request.onsuccess = () => {
      const db = request.result
      db.onversionchange = () => db.close()
      resolve(db)
    }
    request.onerror = () => rejectIdbError(reject, request.error, 'IndexedDB open failed.')
    request.onblocked = () => reject(new UpgradeBlockedError())
  })
}

class UpgradeBlockedError extends Error {}

function isQuotaExceededError(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'QuotaExceededError'
}

function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => rejectIdbError(reject, request.error, 'IndexedDB request failed.')
  })
}

function transactionCompletion(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve()
    transaction.onerror = () =>
      rejectIdbError(reject, transaction.error, 'IndexedDB transaction failed.')
    transaction.onabort = () =>
      rejectIdbError(reject, transaction.error, 'IndexedDB transaction aborted.')
  })
}

function rejectIdbError(
  reject: (reason: Error) => void,
  error: DOMException | null,
  fallbackMessage: string,
): void {
  reject(error ?? new Error(fallbackMessage))
}
