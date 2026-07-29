import { describe, expect, it } from 'vitest'
import { createGameDefinition } from '../game/gameDefinition'
import { placeholderRound } from '../game/roundDefinition'
import { createSampleGame } from '../game/sampleGame'
import { createMemoryPersistenceAdapter } from './memoryAdapter'
import {
  deleteDefinition,
  listSavedDefinitions,
  loadDefinition,
  saveDefinition,
} from './savedDefinitions'

describe('saved definitions persistence', () => {
  it('saves, noops identical bytes, requires replace for changed same id, and replaces', async () => {
    const adapter = createMemoryPersistenceAdapter()
    await adapter.open()
    const original = createSampleGame()
    const changed = createGameDefinition({
      id: original.id,
      title: 'Changed Title',
      rounds: [placeholderRound('round-1', 'Round One')],
    })

    expect(await saveDefinition(adapter, original, { mode: 'save' })).toEqual({
      ok: true,
      value: 'created',
    })
    expect(await saveDefinition(adapter, original, { mode: 'save' })).toEqual({
      ok: true,
      value: 'noop',
    })
    expect(await saveDefinition(adapter, changed, { mode: 'save' })).toEqual({
      ok: true,
      value: 'needs-replace',
    })
    expect(await saveDefinition(adapter, changed, { mode: 'replace' })).toEqual({
      ok: true,
      value: 'replaced',
    })

    const loaded = await loadDefinition(adapter, original.id)
    expect(loaded.ok).toBe(true)
    if (loaded.ok) expect(loaded.value.title).toBe('Changed Title')
  })

  it('lists, deletes, and reports not found', async () => {
    const adapter = createMemoryPersistenceAdapter()
    await adapter.open()
    const definition = createSampleGame()
    await saveDefinition(adapter, definition, { mode: 'save' })

    expect(await listSavedDefinitions(adapter)).toMatchObject({
      ok: true,
      value: [{ gameId: definition.id, title: definition.title }],
    })
    expect(await deleteDefinition(adapter, definition.id)).toEqual({ ok: true, value: undefined })
    expect(await loadDefinition(adapter, definition.id)).toMatchObject({
      ok: false,
      code: 'not-found',
    })
  })

  it('fails closed on corrupt records', async () => {
    const adapter = createMemoryPersistenceAdapter()
    await adapter.open()
    await adapter.withTransaction(['savedDefinitions'], async (tx) => {
      await tx.put('savedDefinitions', 'bad', { recordVersion: 1, gameId: 'bad' })
    })

    expect(await loadDefinition(adapter, 'bad')).toMatchObject({ ok: false, code: 'corrupt' })
    expect(await listSavedDefinitions(adapter)).toMatchObject({ ok: false, code: 'corrupt' })
  })

  it('does not touch active session storage when library mutates', async () => {
    const adapter = createMemoryPersistenceAdapter()
    await adapter.open()
    await adapter.withTransaction(['activeSessions'], async (tx) => {
      await tx.put('activeSessions', 'current', { sentinel: true })
    })

    await saveDefinition(adapter, createSampleGame(), { mode: 'save' })
    await deleteDefinition(adapter, createSampleGame().id)

    let active: unknown
    await adapter.withTransaction(['activeSessions'], async (tx) => {
      active = await tx.get('activeSessions', 'current')
    })
    expect(active).toEqual({ sentinel: true })
  })
})
