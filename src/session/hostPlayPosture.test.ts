import { describe, expect, it } from 'vitest'
import { createGameDefinition } from '../game/gameDefinition'
import { createTeamDefinitions } from '../game/teams/definition'
import { placeholderRound } from '../game/roundDefinition'
import { createSessionStore } from '../state/store'
import {
  canStartPlayFromGame,
  deriveHostPlayPosture,
  isHostPlayPostureGameplayEvent,
} from './hostPlayPosture'

function namedTwoTeamGame() {
  const teams = createTeamDefinitions([
    { id: 't1', name: 'Alpha' },
    { id: 't2', name: 'Beta' },
  ])
  return createGameDefinition({
    id: 'posture-test-game',
    title: 'Posture Test',
    rounds: [placeholderRound('r1', 'Round 1')],
    teams,
  })
}

describe('hostPlayPosture', () => {
  it('treats round selection as gameplay and name-set as non-gameplay', () => {
    expect(isHostPlayPostureGameplayEvent('CURRENT_ROUND_SELECTED')).toBe(true)
    expect(isHostPlayPostureGameplayEvent('SESSION_TEAM_NAME_SET')).toBe(false)
    expect(isHostPlayPostureGameplayEvent('GAME_INITIALIZED')).toBe(false)
  })

  it('derives setup when only init and names exist', () => {
    const store = createSessionStore()
    const definition = namedTwoTeamGame()
    store.dispatch({ type: 'INIT_SESSION', issuedAt: 1, sessionId: 's1' })
    store.dispatch({ type: 'INITIALIZE_GAME', issuedAt: 2, definition })
    store.dispatch({
      type: 'SET_SESSION_TEAM_NAME',
      issuedAt: 3,
      teamId: definition.teams[0]!.id,
      name: 'Red',
    })
    store.dispatch({
      type: 'SET_SESSION_TEAM_NAME',
      issuedAt: 4,
      teamId: definition.teams[1]!.id,
      name: 'Blue',
    })
    expect(
      deriveHostPlayPosture({
        history: store.getHistory(),
        canStartPlay: true,
      }),
    ).toBe(false)
  })

  it('derives play when gameplay follows init even if names cannot start (L0)', () => {
    const store = createSessionStore()
    const definition = namedTwoTeamGame()
    store.dispatch({ type: 'INIT_SESSION', issuedAt: 1, sessionId: 's1' })
    store.dispatch({ type: 'INITIALIZE_GAME', issuedAt: 2, definition })
    store.dispatch({
      type: 'SELECT_ROUND',
      issuedAt: 5,
      roundId: definition.rounds[0]!.id,
    })
    expect(
      deriveHostPlayPosture({
        history: store.getHistory(),
        canStartPlay: true,
      }),
    ).toBe(true)
    expect(
      deriveHostPlayPosture({
        history: store.getHistory(),
        canStartPlay: false,
      }),
    ).toBe(true)
  })

  it('canStartPlayFromGame requires assigned unique session names', () => {
    const store = createSessionStore()
    const definition = namedTwoTeamGame()
    store.dispatch({ type: 'INIT_SESSION', issuedAt: 1, sessionId: 's1' })
    store.dispatch({ type: 'INITIALIZE_GAME', issuedAt: 2, definition })
    expect(canStartPlayFromGame(store.getState().session?.game ?? null)).toBe(false)
    store.dispatch({
      type: 'SET_SESSION_TEAM_NAME',
      issuedAt: 3,
      teamId: definition.teams[0]!.id,
      name: 'Red',
    })
    store.dispatch({
      type: 'SET_SESSION_TEAM_NAME',
      issuedAt: 4,
      teamId: definition.teams[1]!.id,
      name: 'Blue',
    })
    expect(canStartPlayFromGame(store.getState().session?.game ?? null)).toBe(true)
  })

  it('returns false for empty history (caller keeps URL default)', () => {
    expect(deriveHostPlayPosture({ history: [], canStartPlay: true })).toBe(false)
  })
})
