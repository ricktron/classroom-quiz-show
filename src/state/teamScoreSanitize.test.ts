import { describe, expect, it } from 'vitest'
import type { SessionCommand } from './commands'
import { createSessionStore, type SessionStore } from './store'
import { safeToPublicState, toPublicState } from './sanitize'
import {
  INITIAL_PUBLIC_STATE,
  PUBLIC_STATE_SCHEMA_VERSION,
  PUBLIC_TEAM_ACCENT_PATTERN,
  isPublicState,
  isPublicTeamsState,
  type PublicState,
} from './publicState'
import type { PrivateState } from './privateState'
import { decodeEnvelope } from '../sync/protocol'
import { importGameFromUnknown } from '../import/importGame'
import { boardGameFile, richBoardConfig } from '../test/categoryBoardFixtures'
import { teamBoardGameFile, teamsList, twoTeams } from '../test/teamFixtures'
import { TEAM_ACCENTS } from '../game/teams/accents'
import type { ScoreSource } from '../game/teams/scoring'

/**
 * The public projection of teams and scores (Slice 6).
 *
 * The claims proved here:
 *  - the scoreboard IS public, at every stage, and after the game ends;
 *  - the authored team id, the score history, the undo metadata and the host's
 *    scoring target are NOT — the projection is an allow-list, not a filter;
 *  - a malformed score resolves to a neutral, explicit "unavailable" state;
 *  - the wire version was bumped, and version 3 is rejected rather than reread.
 */

const AT = 1_000
const ROUND = 'board-round'
const tileSource = (tileId: string): ScoreSource => ({
  kind: 'category-board-tile',
  roundId: ROUND,
  tileId,
})

function teamStore(teams: unknown = twoTeams()): SessionStore {
  const result = importGameFromUnknown(teamBoardGameFile(teams))
  if (result.status !== 'success') throw new Error('fixture failed to import')
  const store = createSessionStore()
  store.dispatch({ type: 'INIT_SESSION', issuedAt: AT, sessionId: 'SECRET-SESSION' })
  store.dispatch({ type: 'INITIALIZE_GAME', issuedAt: AT, definition: result.definition })
  store.dispatch({ type: 'ADVANCE_TO_NEXT_ROUND', issuedAt: AT })
  return store
}

function drive(store: SessionStore, ...commands: SessionCommand[]): PublicState {
  for (const command of commands) store.dispatch(command)
  return store.getPublicState()
}

const select = (tileId: string): SessionCommand => ({
  type: 'SELECT_CATEGORY_BOARD_TILE',
  issuedAt: AT,
  roundId: ROUND,
  tileId,
})
const revealPrompt: SessionCommand = {
  type: 'REVEAL_CATEGORY_BOARD_PROMPT',
  issuedAt: AT,
  roundId: ROUND,
}
const revealAnswer: SessionCommand = {
  type: 'REVEAL_CATEGORY_BOARD_ANSWER',
  issuedAt: AT,
  roundId: ROUND,
}
const returnToBoard: SessionCommand = {
  type: 'RETURN_TO_CATEGORY_BOARD',
  issuedAt: AT,
  roundId: ROUND,
}
const award = (teamId: string, delta: number, tileId: string): SessionCommand => ({
  type: 'ADJUST_TEAM_SCORE',
  issuedAt: AT,
  teamId,
  delta,
  mode: 'full-credit',
  source: tileSource(tileId),
})
const correct = (teamId: string, delta: number): SessionCommand => ({
  type: 'ADJUST_TEAM_SCORE',
  issuedAt: AT,
  teamId,
  delta,
  mode: 'manual-correction',
  source: { kind: 'manual' },
})

/**
 * A snapshot with the Slice 6 field removed, used to prove a version-4 payload
 * that omits it is rejected. Built by naming the surviving fields rather than by
 * destructure-and-discard, so nothing is left unused.
 */
function omitTeams(state: PublicState): Record<string, unknown> {
  return {
    schemaVersion: state.schemaVersion,
    revision: state.revision,
    phase: state.phase,
    headline: state.headline,
    detail: state.detail,
    game: state.game,
    round: state.round,
  }
}

describe('the scoreboard is projected', () => {
  it('projects ordered teams with names, accents and zero starting scores', () => {
    const publicState = teamStore().getPublicState()
    expect(publicState.teams).toEqual({
      status: 'available',
      teams: [
        { key: 't0', name: 'Red Team', accent: 'crimson', score: 0 },
        { key: 't1', name: 'Blue Team', accent: 'azure', score: 0 },
      ],
    })
  })

  it('preserves AUTHORED order, not score order', () => {
    const store = teamStore()
    drive(store, select('alpha-100'), revealPrompt, award('blue', 100, 'alpha-100'))
    const teams = store.getPublicState().teams
    if (teams?.status !== 'available') throw new Error('expected a scoreboard')
    // Blue is ahead but still second, because the scoreboard never re-sorts.
    expect(teams.teams.map((team) => team.name)).toEqual(['Red Team', 'Blue Team'])
    expect(teams.teams.map((team) => team.score)).toEqual([0, 100])
  })

  it('is present at the BOARD, PROMPT and ANSWER stages alike', () => {
    const store = teamStore()
    expect(store.getPublicState().teams?.status).toBe('available')
    expect(drive(store, select('alpha-100')).teams?.status).toBe('available')
    expect(drive(store, revealPrompt).teams?.status).toBe('available')
    expect(drive(store, revealAnswer).teams?.status).toBe('available')
    expect(drive(store, returnToBoard).teams?.status).toBe('available')
  })

  it('remains present after the game ENDS, so final results can be read', () => {
    const store = teamStore()
    drive(store, select('alpha-100'), revealPrompt, award('red', 100, 'alpha-100'))
    const ended = drive(store, { type: 'END_GAME_SESSION', issuedAt: AT })
    expect(ended.game?.status).toBe('ended')
    expect(ended.round).toBeNull()
    if (ended.teams?.status !== 'available') throw new Error('expected a scoreboard')
    expect(ended.teams.teams[0].score).toBe(100)
  })

  it('projects a negative score as a negative integer', () => {
    const store = teamStore()
    const publicState = drive(store, correct('red', -250))
    if (publicState.teams?.status !== 'available') throw new Error('expected a scoreboard')
    expect(publicState.teams.teams[0].score).toBe(-250)
  })

  it('is NULL for a game that configures no teams', () => {
    const result = importGameFromUnknown(boardGameFile(richBoardConfig()))
    if (result.status !== 'success') throw new Error('fixture failed')
    const store = createSessionStore()
    store.dispatch({ type: 'INIT_SESSION', issuedAt: AT, sessionId: 's' })
    store.dispatch({ type: 'INITIALIZE_GAME', issuedAt: AT, definition: result.definition })
    expect(store.getPublicState().teams).toBeNull()
  })

  it('is NULL before a game is loaded', () => {
    const store = createSessionStore()
    expect(store.getPublicState().teams).toBeNull()
    store.dispatch({ type: 'INIT_SESSION', issuedAt: AT, sessionId: 's' })
    expect(store.getPublicState().teams).toBeNull()
  })

  it('projects the maximum team count without complaint', () => {
    const publicState = teamStore(teamsList(8)).getPublicState()
    if (publicState.teams?.status !== 'available') throw new Error('expected a scoreboard')
    expect(publicState.teams.teams).toHaveLength(8)
    expect(publicState.teams.teams.map((team) => team.key)).toEqual([
      't0',
      't1',
      't2',
      't3',
      't4',
      't5',
      't6',
      't7',
    ])
  })
})

describe('what the scoreboard never carries', () => {
  it('never carries the authored team id', () => {
    const store = teamStore()
    const serialized = JSON.stringify(store.getPublicState().teams)
    expect(serialized).not.toContain('"red"')
    expect(serialized).not.toContain('"blue"')
    expect(serialized).not.toContain('"id"')
    expect(serialized).not.toContain('"order"')
  })

  it('never carries score EVENT history or undo metadata', () => {
    const store = teamStore()
    drive(
      store,
      select('alpha-100'),
      revealPrompt,
      award('red', 100, 'alpha-100'),
      { type: 'UNDO', issuedAt: AT },
      correct('red', 40),
    )
    const serialized = JSON.stringify(store.getPublicState())
    for (const forbidden of [
      'TEAM_SCORE_ADJUSTED',
      'EVENT_UNDONE',
      'targetEventId',
      'full-credit',
      'manual-correction',
      'delta',
      'mode',
      'reversible',
      'occurredAt',
    ]) {
      expect(serialized).not.toContain(forbidden)
    }
    // The resulting TOTAL is public; the trail that produced it is not.
    expect(store.getPublicState().teams).toEqual({
      status: 'available',
      teams: [
        { key: 't0', name: 'Red Team', accent: 'crimson', score: 40 },
        { key: 't1', name: 'Blue Team', accent: 'azure', score: 0 },
      ],
    })
  })

  it('never carries the host-selected scoring target — it is not in state at all', () => {
    const store = teamStore()
    const serialized = JSON.stringify(store.getState())
    expect(serialized).not.toContain('scoringTarget')
    expect(serialized).not.toContain('selectedTeam')
    expect(serialized).not.toContain('activeTeam')
    expect(JSON.stringify(store.getPublicState())).not.toContain('target')
  })

  it('never carries an arbitrary presentation value — only a plain token', () => {
    const store = teamStore()
    const teams = store.getPublicState().teams
    if (teams?.status !== 'available') throw new Error('expected a scoreboard')
    for (const team of teams.teams) {
      expect(team.accent).toMatch(PUBLIC_TEAM_ACCENT_PATTERN)
      expect(TEAM_ACCENTS as readonly string[]).toContain(team.accent)
    }
  })

  it('keeps the prior category-board privacy guarantees intact', () => {
    const store = teamStore()
    store.dispatch({ type: 'SET_HOST_NOTE', issuedAt: AT, note: 'HOST-MEMO-XYZ' })
    const publicState = drive(store, select('alpha-100'), revealPrompt, revealAnswer)
    const serialized = JSON.stringify(publicState)
    for (const secret of [
      'SECRET-SESSION',
      'HOST-MEMO-XYZ',
      'ALPHA-TEACHER-NOTE-100',
      'A100 alternate',
      'board-round',
      'Team Board Game',
      'category-board"',
    ]) {
      expect(serialized).not.toContain(secret)
    }
  })

  it('keeps the top-level allow-list exactly (teams is the only addition)', () => {
    const publicState = teamStore().getPublicState()
    expect(Object.keys(publicState).sort()).toEqual(
      ['detail', 'game', 'headline', 'phase', 'response', 'revision', 'round', 'schemaVersion', 'teams'].sort(),
    )
  })

  it('exposes no NEW private team field by default (the allow-list holds)', () => {
    const store = teamStore()
    const state = store.getState()
    const game = state.session?.game
    if (!game) throw new Error('no game')
    // Simulate a future private field arriving on a team definition.
    const hostile = {
      ...state,
      session: {
        ...state.session!,
        game: {
          ...game,
          definition: {
            ...game.definition,
            teams: game.definition.teams.map((team) => ({
              ...team,
              rosterNames: ['STUDENT-PRIVATE-NAME'],
            })),
          },
        },
      },
    } as unknown as PrivateState

    const serialized = JSON.stringify(toPublicState(hostile))
    expect(serialized).not.toContain('STUDENT-PRIVATE-NAME')
    expect(serialized).not.toContain('rosterNames')
  })
})

describe('malformed score state fails closed', () => {
  function withScores(scores: Record<string, unknown>): PrivateState {
    const store = teamStore()
    const state = store.getState()
    const game = state.session?.game
    if (!game) throw new Error('no game')
    return {
      ...state,
      session: { ...state.session!, game: { ...game, teamScores: scores } },
    } as unknown as PrivateState
  }

  it('reports UNAVAILABLE for a fractional score', () => {
    expect(toPublicState(withScores({ red: 12.5 })).teams).toEqual({ status: 'unavailable' })
  })

  it('reports UNAVAILABLE for NaN and Infinity', () => {
    expect(toPublicState(withScores({ red: Number.NaN })).teams).toEqual({ status: 'unavailable' })
    expect(toPublicState(withScores({ red: Number.POSITIVE_INFINITY })).teams).toEqual({
      status: 'unavailable',
    })
  })

  it('reports UNAVAILABLE for an out-of-range score', () => {
    expect(toPublicState(withScores({ red: 5_000_000 })).teams).toEqual({ status: 'unavailable' })
  })

  it('treats a score that is a STRING as unavailable, never coercing it', () => {
    expect(toPublicState(withScores({ red: '100' })).teams).toEqual({ status: 'unavailable' })
  })

  it('reports UNAVAILABLE for an accent outside the palette', () => {
    const store = teamStore()
    const state = store.getState()
    const game = state.session?.game
    if (!game) throw new Error('no game')
    const hostile = {
      ...state,
      session: {
        ...state.session!,
        game: {
          ...game,
          definition: {
            ...game.definition,
            teams: [{ ...game.definition.teams[0], accent: 'url(https://evil/x)' }],
          },
        },
      },
    } as unknown as PrivateState
    expect(toPublicState(hostile).teams).toEqual({ status: 'unavailable' })
  })

  it('still produces a STRUCTURALLY VALID public state when unavailable', () => {
    const projected = toPublicState(withScores({ red: Number.NaN }))
    expect(isPublicState(projected)).toBe(true)
    expect(safeToPublicState(withScores({ red: Number.NaN }))).toEqual(projected)
  })

  it('falls back to the safe initial state if projection throws outright', () => {
    const hostile = {
      schemaVersion: 1,
      revision: 0,
      diagnostics: { lastAppliedEventType: null, appliedEventCount: 0 },
      get session(): never {
        throw new Error('boom')
      },
    } as unknown as PrivateState
    expect(safeToPublicState(hostile)).toEqual(INITIAL_PUBLIC_STATE)
    expect(INITIAL_PUBLIC_STATE.teams).toBeNull()
  })
})

describe('isPublicTeamsState — the wire guard', () => {
  const validTeam = { key: 't0', name: 'Red Team', accent: 'crimson', score: -5 }

  it('accepts null, an available list, and the unavailable marker', () => {
    expect(isPublicTeamsState(null)).toBe(true)
    expect(isPublicTeamsState({ status: 'available', teams: [validTeam] })).toBe(true)
    expect(isPublicTeamsState({ status: 'unavailable' })).toBe(true)
  })

  it('rejects an unknown status and a mismatched payload pairing', () => {
    expect(isPublicTeamsState({ status: 'maybe', teams: [] })).toBe(false)
    expect(isPublicTeamsState({ status: 'unavailable', teams: [validTeam] })).toBe(false)
    expect(isPublicTeamsState({ status: 'available' })).toBe(false)
  })

  it('rejects a fractional, non-finite, out-of-range or non-numeric score', () => {
    for (const score of [
      1.5,
      Number.NaN,
      Number.POSITIVE_INFINITY,
      2_000_000,
      -2_000_000,
      '10',
      null,
    ]) {
      expect(isPublicTeamsState({ status: 'available', teams: [{ ...validTeam, score }] })).toBe(
        false,
      )
    }
  })

  it('rejects an accent that is not a plain lower-case token', () => {
    for (const accent of [
      '#ff0000',
      'rgb(1,2,3)',
      'red; background: url(x)',
      'Crimson',
      '',
      'a'.repeat(40),
      null,
    ]) {
      expect(isPublicTeamsState({ status: 'available', teams: [{ ...validTeam, accent }] })).toBe(
        false,
      )
    }
  })

  it('rejects a missing key or name', () => {
    expect(isPublicTeamsState({ status: 'available', teams: [{ ...validTeam, key: '' }] })).toBe(
      false,
    )
    expect(isPublicTeamsState({ status: 'available', teams: [{ ...validTeam, name: 7 }] })).toBe(
      false,
    )
  })

  it('accepts an EMPTY available list at the wire level (the display fails closed)', () => {
    // The sanitizer never produces this — a game with no teams projects `null` —
    // but the guard should not reject a structurally valid payload. The DISPLAY is
    // what turns an empty list into the neutral panel.
    expect(isPublicTeamsState({ status: 'available', teams: [] })).toBe(true)
  })

  it('is enforced by isPublicState, so a bad scoreboard fails the whole snapshot', () => {
    const valid = teamStore().getPublicState()
    expect(isPublicState(valid)).toBe(true)
    expect(
      isPublicState({
        ...valid,
        teams: { status: 'available', teams: [{ ...validTeam, score: 0.5 }] },
      }),
    ).toBe(false)
  })
})

describe('wire version', () => {
  it('is 7 — Slice 6→4 teams, 7→5 response, 8→6 buzz, 11→7 typed prompt media', () => {
    expect(PUBLIC_STATE_SCHEMA_VERSION).toBe(7)
  })

  it('rejects the Slice 5 wire shape (version 3) instead of reinterpreting it', () => {
    // The ENVELOPE version moved 1 → 2 in Slice 7 as well, so this uses the
    // current envelope and proves the payload alone is rejected on its version.
    const legacy = {
      schemaVersion: 3,
      revision: 9,
      phase: 'ready',
      headline: 'Session ready',
      detail: 'Waiting for the first round.',
      game: null,
      round: null,
    }
    expect(isPublicState(legacy)).toBe(false)
    const decoded = decodeEnvelope({
      protocol: 'classroom-quiz-show/sync',
      schemaVersion: 2,
      message: { type: 'public-state', sentAt: 1_700_000_000_000, revision: 9, payload: legacy },
    })
    expect(decoded.ok).toBe(false)
    if (!decoded.ok) expect(decoded.reason).toBe('malformed-payload')
  })

  it('rejects a version-4 payload that omits the new field', () => {
    const valid = teamStore().getPublicState()
    const withoutTeams = omitTeams(valid)
    expect(isPublicState(withoutTeams)).toBe(false)
  })
})
