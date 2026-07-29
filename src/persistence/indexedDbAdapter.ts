import {
  OBJECT_STORE_ACTIVE_SESSIONS,
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
    } catch {
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
        get: async (store, key) =>
          requestResult<unknown | undefined>(transaction.objectStore(store).get(key)),
        put: async (store, key, value) => {
          await requestResult<IDBValidKey>(transaction.objectStore(store).put(value, key))
        },
        delete: async (store, key) => {
          await requestResult<undefined>(transaction.objectStore(store).delete(key))
        },
        getAllKeys: async (store) =>
          requestResult<IDBValidKey[]>(transaction.objectStore(store).getAllKeys()).then((keys) =>
            keys.filter((key): key is string => typeof key === 'string'),
          ),
        getAll: async (store) =>
          requestResult<unknown[]>(transaction.objectStore(store).getAll()),
      }

      await work(tx)
      await completion
      return persistenceOk(undefined)
    } catch {
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
    request.onerror = () => reject(request.error)
    request.onblocked = () => reject(request.error)
  })
}

function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

function transactionCompletion(transaction: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve()
    transaction.onerror = () => reject(transaction.error)
    transaction.onabort = () => reject(transaction.error)
  })
}
