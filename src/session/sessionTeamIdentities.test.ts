import { describe, expect, it } from 'vitest'
import { exportGameDefinition } from '../export/exportGame'
import { createDefaultRegistry } from '../game/defaultRegistry'
import { createMemoryPersistenceAdapter } from '../persistence/memoryAdapter'
import { loadDefinition, saveDefinition } from '../persistence/savedDefinitions'
import { applyDraftCorrection } from '../authoring/correctDraft'
import { createBlankAuthoringDraft } from '../authoring/createBlankDraft'
import { serializeAuthoringDraft } from '../authoring/draftRecord'
import { createSessionStore } from '../state/store'
import { sessionTeamNameFor } from '../state/reducer'
import { canPersistMutations } from '../host/writeAuthority'
import { encodeSessionHistory, decodeSessionHistory } from '../persistence/wire/sessionWire'
import { importGameFromUnknown } from '../import/importGame'
import { teamBoardGameFile, twoTeams } from '../test/teamFixtures'

const AT = 1_700_000_000_000

function teamDefinition() {
  const imported = importGameFromUnknown(teamBoardGameFile(twoTeams()))
  if (imported.status !== 'success') throw new Error('team fixture failed')
  return imported.definition
}

describe('session team identities', () => {
  it('stores selected names on the Session event log and never writes them into the Game', async () => {
    const adapter = createMemoryPersistenceAdapter()
    await adapter.open()
    const registry = createDefaultRegistry()
    let draft = createBlankAuthoringDraft({ title: 'Earth Bank', gameKey: 'earth-bank', teamCount: 2 })
    draft = applyDraftCorrection(draft, {
      kind: 'team-name-bank',
      names: ['Comet Crew', 'Mantle Movers', 'Ozone Owls', 'Tectonic Titans'],
    })
    const game = teamDefinition()
    const saved = await saveDefinition(adapter, game, {
      mode: 'save',
      registry,
      draft,
    })
    expect(saved.ok).toBe(true)
    const before = await loadDefinition(adapter, game.id, registry)
    expect(before.ok).toBe(true)

    const store = createSessionStore({ registry })
    store.dispatch({ type: 'INIT_SESSION', issuedAt: AT, sessionId: 'period-1' })
    store.dispatch({ type: 'INITIALIZE_GAME', issuedAt: AT, definition: game })
    const teamId = game.teams[0]?.id
    expect(teamId).toBeTruthy()
    if (!teamId) return
    expect(
      store.dispatch({
        type: 'SET_SESSION_TEAM_NAME',
        issuedAt: AT,
        teamId,
        name: 'Comet Crew',
      }).status,
    ).toBe('accepted')

    const sessionGame = store.getState().session?.game
    expect(sessionGame).toBeTruthy()
    if (!sessionGame) return
    expect(sessionTeamNameFor(sessionGame, teamId)).toBe('Comet Crew')
    expect(sessionGame.definition.teams.find((team) => team.id === teamId)?.name).not.toBe('Comet Crew')

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
    expect(JSON.stringify(store.getPublicState())).not.toContain('cqs.session-team-identities.v1')
  })

  it('refuses follower writes at the Host write-authority boundary', () => {
    expect(canPersistMutations('follower')).toBe(false)
    expect(canPersistMutations('unknown')).toBe(false)
    expect(canPersistMutations('leader')).toBe(true)
  })

  it('round-trips SESSION_TEAM_NAME_SET including a clear through the existing session wire', () => {
    const game = teamDefinition()
    const store = createSessionStore()
    store.dispatch({ type: 'INIT_SESSION', issuedAt: AT, sessionId: 'period-1' })
    store.dispatch({ type: 'INITIALIZE_GAME', issuedAt: AT + 1, definition: game })
    const teamId = game.teams[0]?.id
    expect(teamId).toBeTruthy()
    if (!teamId) return
    store.dispatch({ type: 'SET_SESSION_TEAM_NAME', issuedAt: AT + 2, teamId, name: 'Comet Crew' })
    store.dispatch({ type: 'SET_SESSION_TEAM_NAME', issuedAt: AT + 3, teamId, name: null })

    const encoded = encodeSessionHistory(store.getHistory(), AT + 4)
    expect(encoded.ok).toBe(true)
    if (!encoded.ok) return
    expect(JSON.stringify(encoded.value)).toContain('SESSION_TEAM_NAME_SET')
    expect(JSON.stringify(encoded.value)).toContain('"name":null')

    const decoded = decodeSessionHistory(encoded.value)
    expect(decoded.ok).toBe(true)
    if (!decoded.ok) return
    expect(decoded.value).toEqual(store.getHistory())
    const recovered = createSessionStore({ initialHistory: decoded.value })
    expect(sessionTeamNameFor(recovered.getState().session!.game!, teamId)).toBeNull()
  })
})
