import { describe, expect, it } from 'vitest'
import {
  PERSISTENCE_OBJECT_STORES,
  createIndexedDbPersistenceAdapter,
  upgradePersistenceSchema,
} from './indexedDbAdapter'

describe('IndexedDbPersistenceAdapter', () => {
  it('creates exactly the persistence v1 object stores during schema upgrade', () => {
    const created: string[] = []
    const existing = new Set<string>()

    upgradePersistenceSchema({
      objectStoreNames: { contains: (name) => existing.has(name) },
      createObjectStore: (name) => {
        created.push(name)
        existing.add(name)
        return {}
      },
    })

    expect(created).toEqual(PERSISTENCE_OBJECT_STORES)
    expect([...existing].sort()).toEqual([...PERSISTENCE_OBJECT_STORES].sort())
  })

  it('does not recreate stores that already exist', () => {
    const created: string[] = []
    const existing = new Set<string>(PERSISTENCE_OBJECT_STORES)

    upgradePersistenceSchema({
      objectStoreNames: { contains: (name) => existing.has(name) },
      createObjectStore: (name) => {
        created.push(name)
        return {}
      },
    })

    expect(created).toEqual([])
  })

  it('reports unavailable when no IndexedDB factory exists', async () => {
    const adapter = createIndexedDbPersistenceAdapter({ indexedDB: null })

    expect(await adapter.open()).toMatchObject({ ok: false, code: 'unavailable' })
  })

  it('rejects IndexedDB failures with Error instances', async () => {
    const openRequest = {
      result: null as IDBDatabase | null,
      error: null as DOMException | null,
      onupgradeneeded: null as ((event: Event) => void) | null,
      onsuccess: null as ((event: Event) => void) | null,
      onerror: null as ((event: Event) => void) | null,
      onblocked: null as ((event: Event) => void) | null,
    }
    const factory = {
      open: () => {
        queueMicrotask(() => {
          openRequest.onerror?.(new Event('error'))
        })
        return openRequest
      },
    } as unknown as IDBFactory

    const adapter = createIndexedDbPersistenceAdapter({ indexedDB: factory })
    const result = await adapter.open()

    expect(result).toMatchObject({ ok: false, code: 'unavailable' })
  })

  it.runIf(typeof globalThis.indexedDB !== 'undefined')('opens the browser IndexedDB factory', async () => {
    const adapter = createIndexedDbPersistenceAdapter({
      dbName: `cqs-test-${crypto.randomUUID()}`,
    })

    expect(await adapter.open()).toEqual({ ok: true, value: undefined })
    await adapter.close()
  })
})
