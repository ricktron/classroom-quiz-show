import type { PersistenceAdapter, PersistenceStoreName, PersistenceTx } from './adapter'
import { persistenceErr, persistenceOk, type PersistenceResult } from './results'

export interface MemoryPersistenceAdapterOptions {
  readonly unavailable?: boolean
  readonly failOpen?: boolean
  readonly failTransactions?: boolean
}

type StoreMap = Map<string, unknown>
type DatabaseMap = Record<PersistenceStoreName, StoreMap>

const STORE_NAMES: readonly PersistenceStoreName[] = [
  'savedDefinitions',
  'activeSessions',
  'coordination',
]

/**
 * Deterministic in-memory adapter for tests and non-browser callers.
 *
 * Transactions are exclusive and commit atomically by working against a snapshot
 * until the callback succeeds.
 */
export class MemoryPersistenceAdapter implements PersistenceAdapter {
  readonly kind = 'memory'

  private opened = false
  private readonly options: MemoryPersistenceAdapterOptions
  private data: DatabaseMap = createEmptyDatabase()
  private mutex: Promise<void> = Promise.resolve()

  constructor(options: MemoryPersistenceAdapterOptions = {}) {
    this.options = options
  }

  async open(): Promise<PersistenceResult<void>> {
    if (this.options.unavailable || this.options.failOpen) {
      return persistenceErr('unavailable', 'Persistence storage is unavailable.')
    }
    this.opened = true
    return persistenceOk(undefined)
  }

  async close(): Promise<void> {
    this.opened = false
  }

  async withTransaction(
    stores: readonly PersistenceStoreName[],
    work: (tx: PersistenceTx) => Promise<void>,
  ): Promise<PersistenceResult<void>> {
    const run = this.mutex.then(() => this.runTransaction(stores, work))
    this.mutex = run.then(
      () => undefined,
      () => undefined,
    )
    return run
  }

  private async runTransaction(
    stores: readonly PersistenceStoreName[],
    work: (tx: PersistenceTx) => Promise<void>,
  ): Promise<PersistenceResult<void>> {
    if (!this.opened || this.options.unavailable) {
      return persistenceErr('unavailable', 'Persistence storage is not open.')
    }
    if (this.options.failTransactions) {
      return persistenceErr('transaction-failed', 'The persistence transaction failed.')
    }

    const uniqueStores = [...new Set(stores)]
    for (const store of uniqueStores) {
      if (!STORE_NAMES.includes(store)) {
        return persistenceErr('invalid', `Unknown persistence store: ${store}.`)
      }
    }

    const snapshot = cloneDatabase(this.data)
    const tx: PersistenceTx = {
      get: async (store, key) => cloneStoredValue(snapshot[store].get(key)),
      put: async (store, key, value) => {
        snapshot[store].set(key, cloneStoredValue(value))
      },
      delete: async (store, key) => {
        snapshot[store].delete(key)
      },
      getAllKeys: async (store) => [...snapshot[store].keys()],
      getAll: async (store) => [...snapshot[store].values()].map(cloneStoredValue),
    }

    try {
      await work(tx)
      this.data = snapshot
      return persistenceOk(undefined)
    } catch {
      return persistenceErr('transaction-failed', 'The persistence transaction failed.')
    }
  }
}

export function createMemoryPersistenceAdapter(
  options: MemoryPersistenceAdapterOptions = {},
): MemoryPersistenceAdapter {
  return new MemoryPersistenceAdapter(options)
}

function createEmptyDatabase(): DatabaseMap {
  return {
    savedDefinitions: new Map(),
    activeSessions: new Map(),
    coordination: new Map(),
  }
}

function cloneDatabase(database: DatabaseMap): DatabaseMap {
  return {
    savedDefinitions: new Map(
      [...database.savedDefinitions.entries()].map(([key, value]) => [key, cloneStoredValue(value)]),
    ),
    activeSessions: new Map(
      [...database.activeSessions.entries()].map(([key, value]) => [key, cloneStoredValue(value)]),
    ),
    coordination: new Map(
      [...database.coordination.entries()].map(([key, value]) => [key, cloneStoredValue(value)]),
    ),
  }
}

function cloneStoredValue<T>(value: T): T {
  if (value === undefined) return value
  return structuredClone(value)
}
