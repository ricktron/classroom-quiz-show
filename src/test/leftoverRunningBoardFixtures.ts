import { createSessionStore, type SessionStore } from '../state/store'
import { importGameFromUnknown } from '../import/importGame'
import { richBoardConfig } from './categoryBoardFixtures'
import { teamBoardGameFile } from './teamFixtures'

/**
 * Shared leftover-running board fixtures for Host / Audience unit tests.
 *
 * Extracted so ARM → buzz → START → RESOLVE ladders are not cloned across
 * ResponseTimerHostPanel and AudienceDisplayShell (Sonar new-code duplication).
 */

export const LEFTOVER_AT = 1_000_000
export const LEFTOVER_ROUND = 'board-round'
export const LEFTOVER_TILE = 'alpha-100'

export const LEFTOVER_TEAMS = [
  { id: 'red', name: 'Red Team', accent: 'crimson' },
  { id: 'blue', name: 'Blue Team', accent: 'azure' },
] as const

/** Team-board session advanced to the first round (clue not yet open). */
export function leftoverTeamBoardStore(
  teams: readonly { id: string; name: string; accent: string }[] = LEFTOVER_TEAMS,
): SessionStore {
  const imported = importGameFromUnknown(teamBoardGameFile([...teams], richBoardConfig()))
  if (imported.status !== 'success') throw new Error('fixture failed')
  const store = createSessionStore()
  store.dispatch({ type: 'INIT_SESSION', issuedAt: LEFTOVER_AT, sessionId: 's' })
  store.dispatch({
    type: 'INITIALIZE_GAME',
    issuedAt: LEFTOVER_AT,
    definition: imported.definition,
  })
  store.dispatch({ type: 'ADVANCE_TO_NEXT_ROUND', issuedAt: LEFTOVER_AT })
  return store
}

/** Open the canonical leftover-running clue to the prompt stage. */
export function openLeftoverBoardClue(store: SessionStore, at = LEFTOVER_AT): void {
  store.dispatch({
    type: 'SELECT_CATEGORY_BOARD_TILE',
    issuedAt: at,
    roundId: LEFTOVER_ROUND,
    tileId: LEFTOVER_TILE,
  })
  store.dispatch({
    type: 'REVEAL_CATEGORY_BOARD_PROMPT',
    issuedAt: at,
    roundId: LEFTOVER_ROUND,
  })
}

/**
 * Canonical leftover-running path: open clue → ARM → buzz while idle → START →
 * resolve. Private timer remains running after correct (undo fidelity).
 */
export function dispatchLeftoverRunningResolve(
  store: SessionStore,
  kind: 'correct' | 'incorrect' | 'passed',
  at = LEFTOVER_AT,
  teamId = 'red',
): void {
  openLeftoverBoardClue(store, at)
  store.dispatch({ type: 'ARM_RESPONSE_PHASE', issuedAt: at, roundId: LEFTOVER_ROUND })
  store.dispatch({
    type: 'RECORD_TEAM_BUZZ',
    issuedAt: at + 1,
    roundId: LEFTOVER_ROUND,
    tileId: LEFTOVER_TILE,
    teamId,
  })
  store.dispatch({
    type: 'START_RESPONSE_TIMER',
    issuedAt: at + 2,
    roundId: LEFTOVER_ROUND,
    durationSeconds: 30,
  })
  store.dispatch({
    type: 'RESOLVE_ACTIVE_RESPONSE',
    issuedAt: at + 3,
    roundId: LEFTOVER_ROUND,
    tileId: LEFTOVER_TILE,
    resolution: { kind },
  })
}

/** Store already at leftover-running Correct (public idle DTO + durable Correct). */
export function leftoverRunningCorrectStore(at = LEFTOVER_AT): SessionStore {
  const store = leftoverTeamBoardStore()
  dispatchLeftoverRunningResolve(store, 'correct', at)
  return store
}
