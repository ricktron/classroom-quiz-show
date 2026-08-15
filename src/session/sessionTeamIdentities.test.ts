import { describe, expect, it } from 'vitest'
import { createSampleGame } from '../game/sampleGame'
import { exportGameDefinition } from '../export/exportGame'
import { createDefaultRegistry } from '../game/defaultRegistry'
import { createMemoryPersistenceAdapter } from '../persistence/memoryAdapter'
import { loadDefinition, saveDefinition } from '../persistence/savedDefinitions'
import { applyDraftCorrection } from '../authoring/correctDraft'
import { createBlankAuthoringDraft } from '../authoring/createBlankDraft'
import { serializeAuthoringDraft } from '../authoring/draftRecord'
import {
  clearSessionTeamIdentities,
  readSessionTeamIdentities,
  writeSessionTeamIdentities,
} from './sessionTeamIdentities'

function memory() {
  const data = new Map<string, string>()
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => {
      data.set(key, value)
    },
    removeItem: (key: string) => {
      data.delete(key)
    },
  }
}

describe('session team identities', () => {
  it('stores selected names on the Session and never writes them into the Game', async () => {
    const adapter = createMemoryPersistenceAdapter()
    await adapter.open()
    const registry = createDefaultRegistry()
    let draft = createBlankAuthoringDraft({ title: 'Earth Bank', gameKey: 'earth-bank', teamCount: 2 })
    draft = applyDraftCorrection(draft, {
      kind: 'team-name-bank',
      names: ['Comet Crew', 'Mantle Movers', 'Ozone Owls', 'Tectonic Titans'],
    })
    const game = createSampleGame()
    const saved = await saveDefinition(adapter, game, {
      mode: 'save',
      registry,
      draft,
    })
    expect(saved.ok).toBe(true)
    const before = await loadDefinition(adapter, game.id, registry)
    expect(before.ok).toBe(true)

    const store = memory()
    const written = writeSessionTeamIdentities(
      {
        sessionId: 'period-1',
        gameId: game.id,
        names: { [game.teams[0]?.id ?? 't1']: 'Comet Crew' },
      },
      'leader',
      store,
    )
    expect(written.ok).toBe(true)

    const after = await loadDefinition(adapter, game.id, registry)
    expect(after.ok).toBe(true)
    if (before.ok && after.ok) {
      expect(after.value).toEqual(before.value)
      const exportedBefore = exportGameDefinition(before.value, { registry })
      const exportedAfter = exportGameDefinition(after.value, { registry })
      expect(exportedAfter.status).toBe('success')
      if (exportedBefore.status === 'success' && exportedAfter.status === 'success') {
        expect(exportedAfter.jsonText).toBe(exportedBefore.jsonText)
        expect(exportedAfter.jsonText).not.toContain('Comet Crew')
      }
    }
    expect(serializeAuthoringDraft(draft)).toContain('Comet Crew')
    expect(readSessionTeamIdentities('period-1', game.id, store)?.names).toEqual({
      [game.teams[0]?.id ?? 't1']: 'Comet Crew',
    })
  })

  it('refuses follower writes', () => {
    const store = memory()
    const written = writeSessionTeamIdentities(
      { sessionId: 's', gameId: 'g', names: { a: 'Comet Crew' } },
      'follower',
      store,
    )
    expect(written.ok).toBe(false)
    expect(readSessionTeamIdentities('s', 'g', store)).toBeNull()
    expect(clearSessionTeamIdentities('follower', store).ok).toBe(false)
  })

  it('does not restore names from a different session or game', () => {
    const store = memory()
    writeSessionTeamIdentities(
      { sessionId: 'period-1', gameId: 'game-a', names: { a: 'Comet Crew' } },
      'leader',
      store,
    )
    expect(readSessionTeamIdentities('period-2', 'game-a', store)).toBeNull()
    expect(readSessionTeamIdentities('period-1', 'game-b', store)).toBeNull()
  })
})
