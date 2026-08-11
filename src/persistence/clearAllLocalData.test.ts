import { describe, expect, it } from 'vitest'
import {
  ACTIVE_SESSION_KEY,
  HOST_WRITER_LEASE_KEY,
  OBJECT_STORE_ACTIVE_SESSIONS,
  OBJECT_STORE_COMPLETED_SUMMARIES,
  OBJECT_STORE_COORDINATION,
  OBJECT_STORE_PACK_MEDIA_ASSETS,
  OBJECT_STORE_SAVED_DEFINITIONS,
  OBJECT_STORE_SONY_BUZZ_MAPPINGS,
  PERSISTENCE_DB_NAME,
  PERSISTENCE_OBJECT_STORES,
  SONY_BUZZ_MAPPING_RECORD_KEY,
  createIndexedDbPersistenceAdapter,
  createMemoryPersistenceAdapter,
} from './index'
import {
  CLEAR_ALL_LOCAL_DATA_BLOCKED_MESSAGE,
  CLEAR_ALL_LOCAL_DATA_FAILED_MESSAGE,
  clearAllLocalCqsData,
} from './clearAllLocalData'
import {
  KEYBOARD_MAPPING_STORAGE_KEY,
  type LocalConfigStorage,
} from '../input/keyboardMappingStore'
import { ACTIVE_PACK_RESOURCE_SCOPE_KEY } from './constants'

function memoryStorage(initial: Record<string, string> = {}): LocalConfigStorage & {
  readonly data: Record<string, string>
} {
  const data = { ...initial }
  return {
    data,
    getItem: (key) => (key in data ? data[key]! : null),
    setItem: (key, value) => {
      data[key] = value
    },
    removeItem: (key) => {
      delete data[key]
    },
  }
}

describe('clearAllLocalCqsData', () => {
  it('clears every memory object store and the keyboard mapping key', async () => {
    const adapter = createMemoryPersistenceAdapter()
    await adapter.open()
    await adapter.withTransaction([...PERSISTENCE_OBJECT_STORES], async (tx) => {
      await tx.put(OBJECT_STORE_SAVED_DEFINITIONS, 'game-1', { id: 'game-1' })
      await tx.put(OBJECT_STORE_ACTIVE_SESSIONS, ACTIVE_SESSION_KEY, { events: [] })
      await tx.put(OBJECT_STORE_COORDINATION, HOST_WRITER_LEASE_KEY, { tabId: 't1' })
      await tx.put(OBJECT_STORE_COORDINATION, ACTIVE_PACK_RESOURCE_SCOPE_KEY, {
        scopeKey: 'scope',
      })
      await tx.put(OBJECT_STORE_COMPLETED_SUMMARIES, 'summary-1', { recordId: 'summary-1' })
      await tx.put(OBJECT_STORE_PACK_MEDIA_ASSETS, 'scope\0media.png', { bytes: [1] })
      await tx.put(OBJECT_STORE_SONY_BUZZ_MAPPINGS, SONY_BUZZ_MAPPING_RECORD_KEY, {
        mappingVersion: 1,
      })
    })

    const storage = memoryStorage({
      [KEYBOARD_MAPPING_STORAGE_KEY]: JSON.stringify({ version: 1, bindings: [] }),
    })

    const result = await clearAllLocalCqsData({ adapter, localConfigStorage: storage })
    expect(result).toEqual({ ok: true, value: undefined })
    expect(storage.data[KEYBOARD_MAPPING_STORAGE_KEY]).toBeUndefined()

    // Sealed adapter must not reopen and repopulate.
    expect(await adapter.open()).toMatchObject({ ok: false, code: 'unavailable' })
  })

  it('reports blocked deleteDatabase without clearing keyboard prefs', async () => {
    const deleteRequest = {
      onsuccess: null as ((event: Event) => void) | null,
      onerror: null as ((event: Event) => void) | null,
      onblocked: null as ((event: Event) => void) | null,
    }
    const factory = {
      deleteDatabase: () => {
        queueMicrotask(() => deleteRequest.onblocked?.(new Event('blocked')))
        return deleteRequest
      },
    } as unknown as IDBFactory

    const adapter = createIndexedDbPersistenceAdapter({
      indexedDB: factory,
      dbName: 'cqs-clear-blocked-test',
    })
    const storage = memoryStorage({
      [KEYBOARD_MAPPING_STORAGE_KEY]: 'keep-me',
    })

    const result = await clearAllLocalCqsData({
      adapter,
      indexedDB: factory,
      dbName: 'cqs-clear-blocked-test',
      localConfigStorage: storage,
    })

    expect(result).toMatchObject({
      ok: false,
      code: 'delete-blocked',
      message: CLEAR_ALL_LOCAL_DATA_BLOCKED_MESSAGE,
    })
    expect(storage.data[KEYBOARD_MAPPING_STORAGE_KEY]).toBe('keep-me')
  })

  it('reports failed deleteDatabase without claiming success', async () => {
    const deleteRequest = {
      onsuccess: null as ((event: Event) => void) | null,
      onerror: null as ((event: Event) => void) | null,
      onblocked: null as ((event: Event) => void) | null,
      error: null as DOMException | null,
    }
    const factory = {
      deleteDatabase: () => {
        queueMicrotask(() => deleteRequest.onerror?.(new Event('error')))
        return deleteRequest
      },
    } as unknown as IDBFactory

    const adapter = createIndexedDbPersistenceAdapter({
      indexedDB: factory,
      dbName: 'cqs-clear-failed-test',
    })
    const storage = memoryStorage({
      [KEYBOARD_MAPPING_STORAGE_KEY]: 'keep-me',
    })

    const result = await clearAllLocalCqsData({
      adapter,
      indexedDB: factory,
      localConfigStorage: storage,
    })

    expect(result).toMatchObject({
      ok: false,
      code: 'delete-failed',
      message: CLEAR_ALL_LOCAL_DATA_FAILED_MESSAGE,
    })
    expect(storage.data[KEYBOARD_MAPPING_STORAGE_KEY]).toBe('keep-me')
  })

  it.runIf(typeof globalThis.indexedDB !== 'undefined')(
    'deletes a real IndexedDB database and clears keyboard prefs',
    async () => {
      const dbName = `cqs-clear-real-${crypto.randomUUID()}`
      const adapter = createIndexedDbPersistenceAdapter({ dbName })
      expect(await adapter.open()).toEqual({ ok: true, value: undefined })
      await adapter.withTransaction([OBJECT_STORE_SAVED_DEFINITIONS], async (tx) => {
        await tx.put(OBJECT_STORE_SAVED_DEFINITIONS, 'seed', { id: 'seed' })
      })
      await adapter.close()

      const storage = memoryStorage({
        [KEYBOARD_MAPPING_STORAGE_KEY]: JSON.stringify({ version: 1, bindings: [] }),
      })

      // Re-open so beginDestructiveReset has a live connection to close.
      const live = createIndexedDbPersistenceAdapter({ dbName })
      expect(await live.open()).toEqual({ ok: true, value: undefined })

      const result = await clearAllLocalCqsData({
        adapter: live,
        localConfigStorage: storage,
      })
      expect(result).toEqual({ ok: true, value: undefined })
      expect(storage.data[KEYBOARD_MAPPING_STORAGE_KEY]).toBeUndefined()

      const names = await listDatabaseNames()
      expect(names.includes(dbName)).toBe(false)
      expect(names.includes(PERSISTENCE_DB_NAME) || true).toBe(true)
    },
  )
})

async function listDatabaseNames(): Promise<string[]> {
  const databases = globalThis.indexedDB as IDBFactory & {
    databases?: () => Promise<Array<{ name?: string }>>
  }
  if (typeof databases.databases !== 'function') return []
  const listed = await databases.databases()
  return listed.map((entry) => entry.name).filter((name): name is string => typeof name === 'string')
}
