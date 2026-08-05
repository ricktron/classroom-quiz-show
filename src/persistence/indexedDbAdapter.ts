import {
  OBJECT_STORE_ACTIVE_SESSIONS,
  OBJECT_STORE_COMPLETED_SUMMARIES,
  OBJECT_STORE_COORDINATION,
  OBJECT_STORE_SAVED_DEFINITIONS,
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

  constructor(options: IndexedDbPersistenceAdapterOptions = {}) {
    this.factory = options.indexedDB ?? globalThis.indexedDB ?? null
    this.dbName = options.dbName ?? PERSISTENCE_DB_NAME
  }

  async open(): Promise<PersistenceResult<void>> {
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
