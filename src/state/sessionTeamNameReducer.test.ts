import { describe, expect, it } from 'vitest'
import type { SessionCommand } from './commands'
import { planCommand, replay, sessionTeamNameFor, sessionTeamNamesAreChosen, type RejectionReason } from './reducer'
import { createSessionStore, type SessionStore } from './store'
import { importGameFromUnknown } from '../import/importGame'
import { exportGameDefinition } from '../export/exportGame'
import { createDefaultRegistry } from '../game/defaultRegistry'
import { teamBoardGameFile, twoTeams } from '../test/teamFixtures'
import { MAX_TEAM_NAME_LENGTH } from '../game/teams/limits'

const AT = 1_000

function definitionWith(teams: unknown = twoTeams()) {
  const result = importGameFromUnknown(teamBoardGameFile(teams))
  if (result.status !== 'success') throw new Error('fixture failed to import')
  return result.definition
}

function teamStore(): SessionStore {
  const store = createSessionStore()
  store.dispatch({ type: 'INIT_SESSION', issuedAt: AT, sessionId: 's' })
  store.dispatch({ type: 'INITIALIZE_GAME', issuedAt: AT, definition: definitionWith() })
  return store
}

function setName(teamId: string, name: string | null): SessionCommand {
  return { type: 'SET_SESSION_TEAM_NAME', issuedAt: AT, teamId, name }
}

function expectRejected(store: SessionStore, command: SessionCommand, reason: RejectionReason) {
  const revisionBefore = store.getState().revision
  const historyBefore = store.getHistory()
  const stateBefore = JSON.stringify(store.getState())
  const publicBefore = JSON.stringify(store.getPublicState())
  const result = store.dispatch(command)
  expect(result).toEqual({ status: 'rejected', reason })
  expect(store.getHistory()).toBe(historyBefore)
  expect(store.getState().revision).toBe(revisionBefore)
  expect(JSON.stringify(store.getState())).toBe(stateBefore)
  expect(JSON.stringify(store.getPublicState())).toBe(publicBefore)
}

describe('session team names are replay-derived Session facts', () => {
  it('starts with no Session selections so authored names remain fallbacks only', () => {
    const store = teamStore()
    const game = store.getState().session?.game
    expect(game).toBeTruthy()
    if (!game) return
    expect(game.sessionTeamNames).toEqual({})
    expect(sessionTeamNameFor(game, 'red')).toBeNull()
    expect(sessionTeamNamesAreChosen(game)).toBe(false)
    expect(store.getPublicState().teams).toEqual({
      status: 'available',
      teams: [
        { key: 't0', name: 'Red Team', accent: 'crimson', score: 0 },
        { key: 't1', name: 'Blue Team', accent: 'azure', score: 0 },
      ],
    })
  })

  it('sets and clears a Session identity without writing the Game definition', () => {
    const store = teamStore()
    const beforeDefinition = store.getState().session?.game?.definition
    expect(store.dispatch(setName('red', 'Comet Crew')).status).toBe('accepted')
    const game = store.getState().session?.game
    expect(game).toBeTruthy()
    if (!game || !beforeDefinition) return
    expect(sessionTeamNameFor(game, 'red')).toBe('Comet Crew')
    expect(sessionTeamNameFor(game, 'blue')).toBeNull()
    expect(game.definition).toBe(beforeDefinition)
    expect(game.definition.teams[0]?.name).toBe('Red Team')
    expect(sessionTeamNamesAreChosen(game)).toBe(false)

    expect(store.dispatch(setName('red', null)).status).toBe('accepted')
    const cleared = store.getState().session?.game
    expect(cleared).toBeTruthy()
    if (!cleared) return
    expect(sessionTeamNameFor(cleared, 'red')).toBeNull()
    expect(cleared.definition.teams[0]?.name).toBe('Red Team')
  })

  it('rejects a name already claimed by another team', () => {
    const store = teamStore()
    expect(store.dispatch(setName('red', 'Comet Crew')).status).toBe('accepted')
    expectRejected(store, setName('blue', 'comet crew'), 'session-team-name-taken')
    expect(sessionTeamNameFor(store.getState().session!.game!, 'blue')).toBeNull()
  })

  it('rejects an empty or over-long Session name', () => {
    const store = teamStore()
    expectRejected(store, setName('red', '   '), 'invalid-session-team-name')
    expectRejected(store, setName('red', 'x'.repeat(MAX_TEAM_NAME_LENGTH + 1)), 'invalid-session-team-name')
  })

  it('rejects an unknown team and does not append', () => {
    const store = teamStore()
    expectRejected(store, setName('green', 'Comet Crew'), 'unknown-team')
  })

  it('restores the prior selection through undo because the event is reversible', () => {
    const store = teamStore()
    store.dispatch(setName('red', 'Comet Crew'))
    store.dispatch(setName('red', 'Ozone Owls'))
    expect(sessionTeamNameFor(store.getState().session!.game!, 'red')).toBe('Ozone Owls')
    expect(store.dispatch({ type: 'UNDO', issuedAt: AT }).status).toBe('accepted')
    expect(sessionTeamNameFor(store.getState().session!.game!, 'red')).toBe('Comet Crew')
  })

  it('reconstructs Session names only from the event log', () => {
    const store = teamStore()
    store.dispatch(setName('red', 'Comet Crew'))
    store.dispatch(setName('blue', 'Mantle Movers'))
    const replayed = replay(store.getHistory())
    expect(replayed).toEqual(store.getState())
    expect(sessionTeamNamesAreChosen(replayed.session!.game!)).toBe(true)
  })

  it('never writes selected identities back into a reusable Game export', () => {
    const store = teamStore()
    const registry = createDefaultRegistry()
    const before = exportGameDefinition(store.getState().session!.game!.definition, { registry })
    store.dispatch(setName('red', 'Comet Crew'))
    const after = exportGameDefinition(store.getState().session!.game!.definition, { registry })
    expect(before.status).toBe('success')
    expect(after.status).toBe('success')
    if (before.status === 'success' && after.status === 'success') {
      expect(after.jsonText).toBe(before.jsonText)
      expect(after.jsonText).not.toContain('Comet Crew')
    }
  })

  it('rejects SET_SESSION_TEAM_NAME before a game is loaded', () => {
    const store = createSessionStore()
    store.dispatch({ type: 'INIT_SESSION', issuedAt: AT, sessionId: 's' })
    const planned = planCommand(store.getState(), store.getHistory(), setName('red', 'Comet Crew'), {
      isKnownRoundType: () => true,
    })
    expect(planned).toEqual({ status: 'rejected', reason: 'game-not-initialized' })
  })
})
