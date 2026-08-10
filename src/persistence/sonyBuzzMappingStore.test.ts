import { describe, expect, it } from 'vitest'
import { createMemoryPersistenceAdapter } from './memoryAdapter'
import {
  clearSonyBuzzMappingRecord,
  createSonyBuzzMappingRecord,
  loadSonyBuzzMappingRecord,
  mappingMatchesContext,
  parseSonyBuzzMappingRecord,
  saveSonyBuzzMappingRecord,
  SONY_BUZZ_MAPPING_RECORD_KEY,
} from './sonyBuzzMappingStore'
import { OBJECT_STORE_SONY_BUZZ_MAPPINGS } from './constants'
import { SONY_BUZZ_MAPPING_VERSION } from '../input/sonyBuzzSupportedProfile'

const TEAMS = new Set(['red', 'blue'])

describe('sonyBuzzMappingStore', () => {
  it('round-trips mapping v1 without controllerIndex', async () => {
    const adapter = createMemoryPersistenceAdapter()
    await adapter.open()
    const record = createSonyBuzzMappingRecord({
      gameId: 'game-1',
      teamSignature: 'blue\u001fred',
      associations: [
        { slotId: 1, teamId: 'red' },
        { slotId: 2, teamId: 'blue' },
      ],
      optedIn: true,
      updatedAt: '2026-08-09T00:00:00.000Z',
    })
    expect(await saveSonyBuzzMappingRecord(adapter, record)).toMatchObject({ ok: true })
    const loaded = await loadSonyBuzzMappingRecord(adapter)
    expect(loaded.status).toBe('loaded')
    if (loaded.status !== 'loaded') return
    expect(loaded.record).toEqual(record)
    expect('controllerIndex' in loaded.record).toBe(false)
  })

  it('fail-closes unknown mapping version', async () => {
    const adapter = createMemoryPersistenceAdapter()
    await adapter.open()
    await adapter.withTransaction([OBJECT_STORE_SONY_BUZZ_MAPPINGS], async (tx) => {
      await tx.put(OBJECT_STORE_SONY_BUZZ_MAPPINGS, SONY_BUZZ_MAPPING_RECORD_KEY, {
        mappingVersion: SONY_BUZZ_MAPPING_VERSION + 1,
        gameId: 'x',
      })
    })
    expect(await loadSonyBuzzMappingRecord(adapter)).toEqual({ status: 'unsupported-version' })
  })

  it('rejects records that embed controllerIndex', () => {
    const base = createSonyBuzzMappingRecord({
      gameId: 'g',
      teamSignature: 'red',
      associations: [{ slotId: 1, teamId: 'red' }],
      optedIn: true,
    })
    expect(parseSonyBuzzMappingRecord({ ...base, controllerIndex: 0 })).toBeNull()
    expect(
      parseSonyBuzzMappingRecord({
        ...base,
        associations: [{ slotId: 1, teamId: 'red', controllerIndex: 3 }],
      }),
    ).toBeNull()
  })

  it('fail-closes team mismatch and stale team id', () => {
    const record = createSonyBuzzMappingRecord({
      gameId: 'game-1',
      teamSignature: 'blue\u001fred',
      associations: [
        { slotId: 1, teamId: 'red' },
        { slotId: 2, teamId: 'blue' },
      ],
      optedIn: true,
    })
    expect(mappingMatchesContext(record, 'game-1', 'blue\u001fred', TEAMS)).toBe(true)
    expect(mappingMatchesContext(record, 'other-game', 'blue\u001fred', TEAMS)).toBe(false)
    expect(mappingMatchesContext(record, 'game-1', 'green\u001fred', TEAMS)).toBe(false)
    expect(mappingMatchesContext(record, 'game-1', 'blue\u001fred', new Set(['red']))).toBe(false)
  })

  it('clear removes mapping while leave other stores untouched', async () => {
    const adapter = createMemoryPersistenceAdapter()
    await adapter.open()
    await adapter.withTransaction(['savedDefinitions'], async (tx) => {
      await tx.put('savedDefinitions', 'keep-me', { id: 'keep-me' })
    })
    const record = createSonyBuzzMappingRecord({
      gameId: 'g',
      teamSignature: 'red',
      associations: [{ slotId: 1, teamId: 'red' }],
      optedIn: true,
    })
    await saveSonyBuzzMappingRecord(adapter, record)
    expect(await clearSonyBuzzMappingRecord(adapter)).toMatchObject({ ok: true })
    expect(await loadSonyBuzzMappingRecord(adapter)).toEqual({ status: 'absent' })
    let kept: unknown
    await adapter.withTransaction(['savedDefinitions'], async (tx) => {
      kept = await tx.get('savedDefinitions', 'keep-me')
    })
    expect(kept).toEqual({ id: 'keep-me' })
  })

  it('full host-private wipe clears Sony mappings with other stores', async () => {
    const adapter = createMemoryPersistenceAdapter()
    await adapter.open()
    await saveSonyBuzzMappingRecord(
      adapter,
      createSonyBuzzMappingRecord({
        gameId: 'g',
        teamSignature: 'red',
        associations: [{ slotId: 1, teamId: 'red' }],
        optedIn: true,
      }),
    )
    await adapter.withTransaction(
      [
        'savedDefinitions',
        'activeSessions',
        'coordination',
        'completedSummaries',
        'packMediaAssets',
        'sonyBuzzMappings',
      ],
      async (tx) => {
        for (const key of await tx.getAllKeys('sonyBuzzMappings')) {
          await tx.delete('sonyBuzzMappings', key)
        }
      },
    )
    expect(await loadSonyBuzzMappingRecord(adapter)).toEqual({ status: 'absent' })
  })
})
