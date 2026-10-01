import { describe, expect, it } from 'vitest'
import { createGameDefinition } from '../game/gameDefinition'
import { createTeamDefinitions } from '../game/teams/definition'
import { placeholderRound } from '../game/roundDefinition'
import { createSessionStore } from '../state/store'
import type { SessionEvent } from '../state/events'
import { isDisposableContextualTeamCountSession } from './disposableContextualTeamCountSession'

function zeroTeamGame(id = 'fix-return-game') {
  return createGameDefinition({
    id,
    title: 'Zero Team Fix',
    rounds: [placeholderRound('r1', 'Round 1')],
    teams: [],
  })
}

function twoTeamGame(id = 'fix-return-game') {
  return createGameDefinition({
    id,
    title: 'Named Teams',
    rounds: [placeholderRound('r1', 'Round 1')],
    teams: createTeamDefinitions([
      { id: 't1', name: 'Alpha' },
      { id: 't2', name: 'Beta' },
    ]),
  })
}

describe('isDisposableContextualTeamCountSession', () => {
  it('treats init-only invalid team-count same-Game Session as disposable', () => {
    const store = createSessionStore()
    const definition = zeroTeamGame()
    store.dispatch({ type: 'INIT_SESSION', issuedAt: 1, sessionId: 's-disposable' })
    store.dispatch({ type: 'INITIALIZE_GAME', issuedAt: 2, definition })
    expect(
      isDisposableContextualTeamCountSession({
        history: store.getHistory(),
        expectedPlayGameId: definition.id,
      }),
    ).toBe(true)
  })

  it('rejects SESSION_TEAM_NAME_SET as non-disposable', () => {
    const store = createSessionStore()
    const definition = twoTeamGame()
    store.dispatch({ type: 'INIT_SESSION', issuedAt: 1, sessionId: 's-names' })
    store.dispatch({ type: 'INITIALIZE_GAME', issuedAt: 2, definition })
    store.dispatch({
      type: 'SET_SESSION_TEAM_NAME',
      issuedAt: 3,
      teamId: definition.teams[0]!.id,
      name: 'Red Hawks',
    })
    expect(
      isDisposableContextualTeamCountSession({
        history: store.getHistory(),
        expectedPlayGameId: definition.id,
      }),
    ).toBe(false)
  })

  it('rejects scoring as non-disposable', () => {
    const store = createSessionStore()
    const definition = zeroTeamGame()
    store.dispatch({ type: 'INIT_SESSION', issuedAt: 1, sessionId: 's-score' })
    store.dispatch({ type: 'INITIALIZE_GAME', issuedAt: 2, definition })
    const forgedScore = {
      id: 'evt-score',
      type: 'TEAM_SCORE_ADJUSTED',
      seq: store.getHistory().length,
      occurredAt: 9,
      reversible: true,
      teamId: 't1',
      delta: 100,
      resultingScore: 100,
      mode: 'manual-correction',
      source: { kind: 'manual' },
    } as unknown as SessionEvent
    expect(
      isDisposableContextualTeamCountSession({
        history: [...store.getHistory(), forgedScore],
        expectedPlayGameId: definition.id,
      }),
    ).toBe(false)
  })

  it('rejects round selection as non-disposable', () => {
    const store = createSessionStore()
    const definition = twoTeamGame()
    store.dispatch({ type: 'INIT_SESSION', issuedAt: 1, sessionId: 's-round' })
    store.dispatch({ type: 'INITIALIZE_GAME', issuedAt: 2, definition })
    const roundResult = store.dispatch({
      type: 'SELECT_ROUND',
      issuedAt: 3,
      roundId: definition.rounds[0]!.id,
    })
    expect(roundResult.status).toBe('accepted')
    expect(
      isDisposableContextualTeamCountSession({
        history: store.getHistory(),
        expectedPlayGameId: definition.id,
      }),
    ).toBe(false)
  })

  it('rejects unknown / non-allowlisted events (fail closed)', () => {
    const store = createSessionStore()
    const definition = zeroTeamGame()
    store.dispatch({ type: 'INIT_SESSION', issuedAt: 1, sessionId: 's-unknown' })
    store.dispatch({ type: 'INITIALIZE_GAME', issuedAt: 2, definition })
    const forgedUnknown = {
      id: 'evt-forged-unknown',
      type: 'NOT_A_REAL_EVENT',
      seq: store.getHistory().length,
      occurredAt: 9,
      reversible: true,
    } as unknown as SessionEvent
    expect(
      isDisposableContextualTeamCountSession({
        history: [...store.getHistory(), forgedUnknown],
        expectedPlayGameId: definition.id,
      }),
    ).toBe(false)
  })

  it('rejects valid team-count init-only Session (Open Game settings must not discard)', () => {
    const store = createSessionStore()
    const definition = twoTeamGame()
    store.dispatch({ type: 'INIT_SESSION', issuedAt: 1, sessionId: 's-valid-teams' })
    store.dispatch({ type: 'INITIALIZE_GAME', issuedAt: 2, definition })
    expect(
      isDisposableContextualTeamCountSession({
        history: store.getHistory(),
        expectedPlayGameId: definition.id,
      }),
    ).toBe(false)
  })

  it('rejects Game id mismatch and missing play target', () => {
    const store = createSessionStore()
    const definition = zeroTeamGame('game-a')
    store.dispatch({ type: 'INIT_SESSION', issuedAt: 1, sessionId: 's-mismatch' })
    store.dispatch({ type: 'INITIALIZE_GAME', issuedAt: 2, definition })
    expect(
      isDisposableContextualTeamCountSession({
        history: store.getHistory(),
        expectedPlayGameId: 'game-b',
      }),
    ).toBe(false)
    expect(
      isDisposableContextualTeamCountSession({
        history: store.getHistory(),
        expectedPlayGameId: null,
      }),
    ).toBe(false)
  })
})
