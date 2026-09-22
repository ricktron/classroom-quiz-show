import { describe, expect, it } from 'vitest'
import { createSessionStore, type SessionStore } from './store'
import { importGameFromUnknown } from '../import/importGame'
import type { GameDefinition } from '../game/gameDefinition'
import { richBoardConfig } from '../test/categoryBoardFixtures'
import { teamBoardGameFile } from '../test/teamFixtures'
import { PUBLIC_STATE_SCHEMA_VERSION, isPublicState } from './publicState'
import { SYNC_SCHEMA_VERSION } from '../sync/protocol'
import { PERSISTENCE_WIRE_VERSION } from '../persistence/constants'
import { teamScoreFor } from './reducer'

/**
 * S05 Path A — public board-response outcome projection.
 *
 * Proves: schema 9 required boardOutcome; positional teamKey; fail-closed
 * unmappable; adjudication ≠ scoring; correct → buzz none (not exhausted);
 * sync envelope stays 2; persistence wire stays 1.
 */

const AT = 1_000_000
const ROUND = 'board-round'
const TILE = 'alpha-100'

const TEAMS = [
  { id: 'red', name: 'Red Team', accent: 'crimson' },
  { id: 'blue', name: 'Blue Team', accent: 'azure' },
]

function definition(teams: unknown = TEAMS): GameDefinition {
  const result = importGameFromUnknown(teamBoardGameFile(teams, richBoardConfig()))
  if (result.status !== 'success') throw new Error('fixture failed to import')
  return result.definition
}

function armedStore(): SessionStore {
  const store = createSessionStore()
  store.dispatch({ type: 'INIT_SESSION', issuedAt: AT, sessionId: 's' })
  store.dispatch({ type: 'INITIALIZE_GAME', issuedAt: AT, definition: definition() })
  store.dispatch({ type: 'ADVANCE_TO_NEXT_ROUND', issuedAt: AT })
  store.dispatch({ type: 'SELECT_CATEGORY_BOARD_TILE', issuedAt: AT, roundId: ROUND, tileId: TILE })
  store.dispatch({ type: 'REVEAL_CATEGORY_BOARD_PROMPT', issuedAt: AT, roundId: ROUND })
  store.dispatch({ type: 'ARM_RESPONSE_PHASE', issuedAt: AT, roundId: ROUND })
  return store
}

function buzz(store: SessionStore, teamId: string, at: number): void {
  store.dispatch({
    type: 'RECORD_TEAM_BUZZ',
    issuedAt: at,
    roundId: ROUND,
    tileId: TILE,
    teamId,
  })
}

function resolve(
  store: SessionStore,
  kind: 'correct' | 'incorrect' | 'passed',
  at: number,
): void {
  store.dispatch({
    type: 'RESOLVE_ACTIVE_RESPONSE',
    issuedAt: at,
    roundId: ROUND,
    tileId: TILE,
    resolution: { kind },
  })
}

/** Two teams buzzed; active is red with blue waiting. */
function twoTeamArmedStore(): SessionStore {
  const store = armedStore()
  buzz(store, 'red', AT + 1)
  buzz(store, 'blue', AT + 2)
  return store
}

describe('PublicBoardResponseOutcome sanitizer (S05 Path A)', () => {
  it('bumps PublicState schema 8 → 9 and keeps sync envelope + persistence wire', () => {
    expect(PUBLIC_STATE_SCHEMA_VERSION).toBe(9)
    expect(SYNC_SCHEMA_VERSION).toBe(2)
    expect(PERSISTENCE_WIRE_VERSION).toBe(1)
  })

  it('projects none until an adjudication exists', () => {
    const store = armedStore()
    buzz(store, 'red', AT + 1)
    expect(store.getPublicState().response?.boardOutcome).toEqual({ status: 'none' })
    expect(store.getPublicState().response?.buzz).toEqual({
      status: 'active',
      activeTeamKey: 't0',
      waitingCount: 0,
    })
  })

  it('projects correct with positional teamKey and empty buzz (not exhausted)', () => {
    const store = twoTeamArmedStore()
    resolve(store, 'correct', AT + 3)
    const response = store.getPublicState().response
    expect(response?.boardOutcome).toEqual({
      status: 'resolved',
      teamKey: 't0',
      kind: 'correct',
    })
    expect(response?.buzz).toEqual({ status: 'none' })
    expect(JSON.stringify(response)).not.toContain('outcomeKey')
    expect(JSON.stringify(response)).not.toContain('red')
    expect(isPublicState(store.getPublicState())).toBe(true)
  })

  it('projects incorrect while promoting next — buzz active coexists with outcome', () => {
    const store = twoTeamArmedStore()
    resolve(store, 'incorrect', AT + 3)
    expect(store.getPublicState().response?.boardOutcome).toEqual({
      status: 'resolved',
      teamKey: 't0',
      kind: 'incorrect',
    })
    expect(store.getPublicState().response?.buzz).toEqual({
      status: 'active',
      activeTeamKey: 't1',
      waitingCount: 0,
    })
  })

  it('proves adjudication ≠ scoring — score alone never creates boardOutcome', () => {
    const store = armedStore()
    buzz(store, 'red', AT + 1)
    store.dispatch({
      type: 'ADJUST_TEAM_SCORE',
      issuedAt: AT + 2,
      teamId: 'red',
      delta: 100,
      mode: 'full-credit',
      source: { kind: 'category-board-tile', roundId: ROUND, tileId: TILE },
    })
    expect(teamScoreFor(store.getState().session!.game!, 'red')).toBeGreaterThan(0)
    expect(store.getPublicState().response?.boardOutcome).toEqual({ status: 'none' })
  })

  it('clears boardOutcome when the opportunity resets', () => {
    const store = armedStore()
    buzz(store, 'red', AT + 1)
    resolve(store, 'correct', AT + 2)
    expect(store.getPublicState().response?.boardOutcome.status).toBe('resolved')
    store.dispatch({ type: 'RESET_RESPONSE_PHASE', issuedAt: AT + 3, roundId: ROUND })
    expect(store.getPublicState().response).toBeNull()
  })

  it('projects non-live idle timer while Correct owns leftover private running (F7)', () => {
    const store = armedStore()
    // Buzz while idle (no interrupt), then START beside active respondent, then correct.
    buzz(store, 'red', AT + 1)
    store.dispatch({
      type: 'START_RESPONSE_TIMER',
      issuedAt: AT + 2,
      roundId: ROUND,
      durationSeconds: 30,
    })
    const privateBefore = store.getState().session!.game!.responsePhases[ROUND]
    expect(privateBefore.timer.status).toBe('running')
    resolve(store, 'correct', AT + 3)

    const privateAfter = store.getState().session!.game!.responsePhases[ROUND]
    // Private leftover running retained for undo — must not be mutated on correct.
    expect(privateAfter.outcome?.kind).toBe('correct')
    expect(privateAfter.timer.status).toBe('running')
    if (privateAfter.timer.status !== 'running') throw new Error('expected running')
    expect(privateAfter.timer.deadline).toBe(
      privateBefore.timer.status === 'running' ? privateBefore.timer.deadline : -1,
    )

    const publicResponse = store.getPublicState().response
    expect(publicResponse?.boardOutcome).toEqual({
      status: 'resolved',
      teamKey: 't0',
      kind: 'correct',
    })
    // Public presentation: non-live idle DTO (schema 9; no bump).
    expect(publicResponse?.timer).toEqual({ status: 'idle' })
  })

  it('still projects a live timer beside incorrect / pass (F7 non-regression)', () => {
    const store = armedStore()
    buzz(store, 'red', AT + 1)
    store.dispatch({
      type: 'START_RESPONSE_TIMER',
      issuedAt: AT + 2,
      roundId: ROUND,
      durationSeconds: 30,
    })
    resolve(store, 'incorrect', AT + 3)
    expect(store.getPublicState().response?.boardOutcome).toEqual({
      status: 'resolved',
      teamKey: 't0',
      kind: 'incorrect',
    })
    expect(store.getPublicState().response?.timer).toEqual({
      status: 'running',
      durationMs: 30_000,
      deadline: AT + 2 + 30_000,
    })
  })

  it('restores public running countdown when correct is undone (F7)', () => {
    const store = armedStore()
    buzz(store, 'red', AT + 1)
    store.dispatch({
      type: 'START_RESPONSE_TIMER',
      issuedAt: AT + 2,
      roundId: ROUND,
      durationSeconds: 30,
    })
    resolve(store, 'correct', AT + 3)
    expect(store.getPublicState().response?.timer).toEqual({ status: 'idle' })
    store.dispatch({ type: 'UNDO', issuedAt: AT + 4 })
    expect(store.getState().session!.game!.responsePhases[ROUND].timer.status).toBe('running')
    expect(store.getPublicState().response?.boardOutcome).toEqual({ status: 'none' })
    expect(store.getPublicState().response?.timer).toEqual({
      status: 'running',
      durationMs: 30_000,
      deadline: AT + 2 + 30_000,
    })
  })
})
