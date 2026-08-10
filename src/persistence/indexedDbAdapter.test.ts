import { describe, expect, it } from 'vitest'
import {
  PERSISTENCE_OBJECT_STORES,
  createIndexedDbPersistenceAdapter,
  upgradePersistenceSchema,
} from './indexedDbAdapter'

describe('IndexedDbPersistenceAdapter', () => {
  it('creates exactly the persistence v4 object stores during schema upgrade', () => {
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
    expect(created).toContain('completedSummaries')
    expect(created).toContain('packMediaAssets')
    expect(created).toContain('sonyBuzzMappings')
    expect([...existing].sort()).toEqual([...PERSISTENCE_OBJECT_STORES].sort())
  })

  it('adds packMediaAssets without recreating existing v2 stores', () => {
    const created: string[] = []
    const existing = new Set<string>([
      'savedDefinitions',
      'activeSessions',
      'coordination',
      'completedSummaries',
    ])

    upgradePersistenceSchema({
      objectStoreNames: { contains: (name) => existing.has(name) },
      createObjectStore: (name) => {
        created.push(name)
        existing.add(name)
        return {}
      },
    })

    expect(created).toEqual(['packMediaAssets', 'sonyBuzzMappings'])
    expect(existing.has('savedDefinitions')).toBe(true)
    expect(existing.has('packMediaAssets')).toBe(true)
  })

  it('adds sonyBuzzMappings without recreating existing v3 stores', () => {
    const created: string[] = []
    const existing = new Set<string>([
      'savedDefinitions',
      'activeSessions',
      'coordination',
      'completedSummaries',
      'packMediaAssets',
    ])

    upgradePersistenceSchema({
      objectStoreNames: { contains: (name) => existing.has(name) },
      createObjectStore: (name) => {
        created.push(name)
        existing.add(name)
        return {}
      },
    })

    expect(created).toEqual(['sonyBuzzMappings'])
    expect(existing.has('packMediaAssets')).toBe(true)
    expect(existing.has('sonyBuzzMappings')).toBe(true)
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

  it('distinguishes a blocked version upgrade', async () => {
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
        queueMicrotask(() => openRequest.onblocked?.(new Event('blocked')))
        return openRequest
      },
    } as unknown as IDBFactory

    await expect(
      createIndexedDbPersistenceAdapter({ indexedDB: factory }).open(),
    ).resolves.toMatchObject({ ok: false, code: 'upgrade-blocked' })
  })

  it.runIf(typeof globalThis.indexedDB !== 'undefined')('opens the browser IndexedDB factory', async () => {
    const adapter = createIndexedDbPersistenceAdapter({
      dbName: `cqs-test-${crypto.randomUUID()}`,
    })

    expect(await adapter.open()).toEqual({ ok: true, value: undefined })
    await adapter.close()
  })
})
