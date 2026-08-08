import { describe, expect, it } from 'vitest'
import { createMemoryPersistenceAdapter } from '../persistence/memoryAdapter'
import { TINY_PNG_BYTES } from './testFixtures'
import {
  clearAllPackMediaAssets,
  commitPackMediaAssets,
  deletePackMediaScope,
  gcUnreferencedPackScopes,
  listPackMediaScopeKeys,
  loadPackMediaAssets,
  packMediaStorageKey,
} from './packMediaPersistence'
import { resourceScopeKeyFromGameText } from './resourceScope'

const GAME_JSON = '{"format":"classroom-quiz-show/game","schemaVersion":1,"id":"g1","title":"G","teams":[],"rounds":[]}\n'
const PNG_PATH = 'media-fixtures/test.png'

describe('packMediaPersistence', () => {
  it('commits and loads assets for a resource scope', async () => {
    const adapter = createMemoryPersistenceAdapter()
    await adapter.open()
    const scopeKey = await resourceScopeKeyFromGameText(GAME_JSON)

    const committed = await commitPackMediaAssets(adapter, {
      resourceScopeKey: scopeKey,
      gameId: 'g1',
      gameSha256: scopeKey,
      mediaAssets: [
        {
          sourcePath: PNG_PATH,
          bytes: TINY_PNG_BYTES,
          mediaType: 'image/png',
          sha256: 'abc',
        },
      ],
    })
    expect(committed.status).toBe('success')

    const loaded = await loadPackMediaAssets(adapter, scopeKey)
    expect(loaded).toHaveLength(1)
    expect(loaded[0]?.sourcePath).toBe(PNG_PATH)
    expect([...loaded[0]?.bytes ?? []]).toEqual([...TINY_PNG_BYTES])
  })

  it('replaces a scope atomically', async () => {
    const adapter = createMemoryPersistenceAdapter()
    await adapter.open()
    const scopeKey = await resourceScopeKeyFromGameText(GAME_JSON)

    await commitPackMediaAssets(adapter, {
      resourceScopeKey: scopeKey,
      gameId: 'g1',
      gameSha256: scopeKey,
      mediaAssets: [
        {
          sourcePath: 'media/a.png',
          bytes: TINY_PNG_BYTES,
          mediaType: 'image/png',
          sha256: 'a',
        },
      ],
    })

    await commitPackMediaAssets(adapter, {
      resourceScopeKey: scopeKey,
      gameId: 'g1',
      gameSha256: scopeKey,
      mediaAssets: [
        {
          sourcePath: 'media/b.png',
          bytes: TINY_PNG_BYTES,
          mediaType: 'image/png',
          sha256: 'b',
        },
      ],
    })

    const loaded = await loadPackMediaAssets(adapter, scopeKey)
    expect(loaded).toHaveLength(1)
    expect(loaded[0]?.sourcePath).toBe('media/b.png')
    expect(await listPackMediaScopeKeys(adapter)).toEqual([scopeKey])
  })

  it('deletes unreferenced scopes during GC', async () => {
    const adapter = createMemoryPersistenceAdapter()
    await adapter.open()
    const keep = await resourceScopeKeyFromGameText(GAME_JSON)
    const drop = await resourceScopeKeyFromGameText('{"format":"x"}\n')

    for (const scopeKey of [keep, drop]) {
      await commitPackMediaAssets(adapter, {
        resourceScopeKey: scopeKey,
        gameId: scopeKey,
        gameSha256: scopeKey,
        mediaAssets: [
          {
            sourcePath: 'media/a.png',
            bytes: TINY_PNG_BYTES,
            mediaType: 'image/png',
            sha256: 'x',
          },
        ],
      })
    }

    await gcUnreferencedPackScopes(adapter, { keepScopeKeys: new Set([keep]) })
    expect(await listPackMediaScopeKeys(adapter)).toEqual([keep])
    await deletePackMediaScope(adapter, keep)
    await clearAllPackMediaAssets(adapter)
    expect(await listPackMediaScopeKeys(adapter)).toEqual([])
  })

  it('lists resource scope keys in locale-aware sorted order', async () => {
    const adapter = createMemoryPersistenceAdapter()
    await adapter.open()
    // Insert in reverse of expected English localeCompare order.
    const later = 'ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff'
    const earlier = '0000000000000000000000000000000000000000000000000000000000000000'

    for (const scopeKey of [later, earlier]) {
      await commitPackMediaAssets(adapter, {
        resourceScopeKey: scopeKey,
        gameId: scopeKey,
        gameSha256: scopeKey,
        mediaAssets: [
          {
            sourcePath: 'media/a.png',
            bytes: TINY_PNG_BYTES,
            mediaType: 'image/png',
            sha256: 'x',
          },
        ],
      })
    }

    expect(await listPackMediaScopeKeys(adapter)).toEqual([earlier, later])
  })

  it('uses deterministic compound storage keys', () => {
    expect(packMediaStorageKey('scope', PNG_PATH)).toBe(`scope\0${PNG_PATH}`)
  })
})
