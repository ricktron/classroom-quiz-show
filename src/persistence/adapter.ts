import type { PersistenceResult } from './results'

export type PersistenceStoreName =
  | 'savedDefinitions'
  | 'activeSessions'
  | 'coordination'
  | 'completedSummaries'
  | 'packMediaAssets'

export interface PersistenceTx {
  get(store: PersistenceStoreName, key: string): Promise<unknown>
  put(store: PersistenceStoreName, key: string, value: unknown): Promise<void>
  delete(store: PersistenceStoreName, key: string): Promise<void>
  getAllKeys(store: PersistenceStoreName): Promise<string[]>
  getAll(store: PersistenceStoreName): Promise<unknown[]>
}

export interface PersistenceAdapter {
  readonly kind: 'memory' | 'indexeddb'
  open(): Promise<PersistenceResult<void>>
  close(): Promise<void>
  /** Exclusive read-write transaction across named stores. */
  withTransaction(
    stores: readonly PersistenceStoreName[],
    work: (tx: PersistenceTx) => Promise<void>,
  ): Promise<PersistenceResult<void>>
}
