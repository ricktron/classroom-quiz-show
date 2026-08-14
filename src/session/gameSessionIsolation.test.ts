import { describe, expect, it } from 'vitest'
import { createDefaultRegistry } from '../game/defaultRegistry'
import { createSampleGame } from '../game/sampleGame'
import { importGameFromUnknown } from '../import/importGame'
import { teamBoardGameFile, twoTeams } from '../test/teamFixtures'
import { createMemoryPersistenceAdapter } from '../persistence/memoryAdapter'
import { deleteDefinition, loadDefinition, saveDefinition } from '../persistence/savedDefinitions'
import { exportGameDefinition } from '../export/exportGame'
import { createSessionStore } from '../state/store'
import { teamScoreFor } from '../state/reducer'

const AT = 1_700_000_000_000

describe('Game versus Session isolation', () => {
  it('starting a session copies the Game and never mutates the saved definition', async () => {
    const adapter = createMemoryPersistenceAdapter()
    await adapter.open()
    const game = createSampleGame()
    await saveDefinition(adapter, game, { mode: 'save' })
    const before = await loadDefinition(adapter, game.id)
    expect(before.ok).toBe(true)

    const store = createSessionStore()
    store.dispatch({ type: 'INIT_SESSION', issuedAt: AT, sessionId: 'class-1' })
    store.dispatch({ type: 'INITIALIZE_GAME', issuedAt: AT, definition: game })
    const sessionGame = store.getState().session?.game
    expect(sessionGame?.definition).toBe(game)
    expect(sessionGame?.definition.title).toBe(game.title)

    const after = await loadDefinition(adapter, game.id)
    expect(after.ok).toBe(true)
    if (before.ok && after.ok) {
      expect(after.value).toEqual(before.value)
    }
  })

  it('session scores and progress do not write back into the reusable Game', async () => {
    const adapter = createMemoryPersistenceAdapter()
    await adapter.open()
    const registry = createDefaultRegistry()
    const imported = importGameFromUnknown(teamBoardGameFile(twoTeams()))
    if (imported.status !== 'success') throw new Error('team fixture failed')
    const game = imported.definition
    await saveDefinition(adapter, game, { mode: 'save', registry })

    const store = createSessionStore({ registry })
    store.dispatch({ type: 'INIT_SESSION', issuedAt: AT, sessionId: 'period-1' })
    store.dispatch({ type: 'INITIALIZE_GAME', issuedAt: AT, definition: game })
    if (game.teams.length > 0) {
      store.dispatch({
        type: 'ADJUST_TEAM_SCORE',
        issuedAt: AT,
        teamId: game.teams[0].id,
        delta: 400,
        mode: 'manual-correction',
        source: { kind: 'manual' },
      })
    }
    const scored = store.getState().session?.game
    expect(scored).toBeTruthy()
    if (game.teams.length > 0 && scored) {
      expect(teamScoreFor(scored, game.teams[0].id)).toBe(400)
    }

    const exported = exportGameDefinition(scored!.definition, { registry })
    expect(exported.status).toBe('success')
    if (exported.status === 'success') {
      expect(exported.jsonText).not.toContain('"score"')
      expect(exported.jsonText).not.toMatch(/period-1/)
    }

    await saveDefinition(adapter, scored!.definition, { mode: 'replace', registry })
    store.dispatch({ type: 'INIT_SESSION', issuedAt: AT, sessionId: 'period-2' })
    const reloaded = await loadDefinition(adapter, game.id, registry)
    expect(reloaded.ok).toBe(true)
    if (!reloaded.ok) return
    store.dispatch({ type: 'INITIALIZE_GAME', issuedAt: AT, definition: reloaded.value })
    const second = store.getState().session?.game
    expect(second?.gameLifecycle).toBe('active')
    if (game.teams.length > 0 && second) {
      expect(teamScoreFor(second, game.teams[0].id)).toBe(0)
    }
    expect(store.getState().session?.sessionId).toBe('period-2')
  })

  it('resetting a session does not delete the reusable Game', async () => {
    const adapter = createMemoryPersistenceAdapter()
    await adapter.open()
    const game = createSampleGame()
    await saveDefinition(adapter, game, { mode: 'save' })

    const store = createSessionStore()
    store.dispatch({ type: 'INIT_SESSION', issuedAt: AT, sessionId: 'live' })
    store.dispatch({ type: 'INITIALIZE_GAME', issuedAt: AT, definition: game })
    store.dispatch({ type: 'INIT_SESSION', issuedAt: AT, sessionId: 'reset' })

    expect(store.getState().session?.sessionId).toBe('reset')
    expect(store.getState().session?.game).toBeNull()
    const stillThere = await loadDefinition(adapter, game.id)
    expect(stillThere.ok).toBe(true)
    if (stillThere.ok) expect(stillThere.value.title).toBe(game.title)
  })

  it('deleting a Game is distinct from ending a session', async () => {
    const adapter = createMemoryPersistenceAdapter()
    await adapter.open()
    const game = createSampleGame()
    await saveDefinition(adapter, game, { mode: 'save' })
    const store = createSessionStore()
    store.dispatch({ type: 'INIT_SESSION', issuedAt: AT, sessionId: 'live' })
    store.dispatch({ type: 'INITIALIZE_GAME', issuedAt: AT, definition: game })
    store.dispatch({ type: 'END_GAME_SESSION', issuedAt: AT })
    expect(store.getState().session?.game?.gameLifecycle).toBe('ended')
    const stillThere = await loadDefinition(adapter, game.id)
    expect(stillThere.ok).toBe(true)
    await deleteDefinition(adapter, game.id)
    const gone = await loadDefinition(adapter, game.id)
    expect(gone.ok).toBe(false)
  })
})
