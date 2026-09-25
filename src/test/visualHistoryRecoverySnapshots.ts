/**
 * Recovery / fail-closed / depleted-board Display snapshots for the S05 visual
 * historian atlas. Synthetic PublicState only — no private Host fields.
 */

import { importGameFromUnknown } from '../import/importGame'
import type { SessionCommand } from '../state/commands'
import {
  INITIAL_PUBLIC_STATE,
  PUBLIC_STATE_SCHEMA_VERSION,
  type PublicState,
} from '../state/publicState'
import { createSessionStore } from '../state/store'
import {
  VISUAL_STRESS_ROUND_ID,
  visualStressGameFile,
} from './visualStressFixtures'
import { visualStressFreshBoardSnapshot } from './visualStressDisplaySnapshots'

const AT = 1_700_000_000_000
const ROUND = VISUAL_STRESS_ROUND_ID

/** Default Display waiting / reconnect before any valid host publish. */
export function visualHistoryDisplayWaitingSnapshot(): PublicState {
  return { ...INITIAL_PUBLIC_STATE }
}

/** Explicit Scores unavailable panel beside an otherwise ready board. */
export function visualHistoryScoresUnavailableSnapshot(revision = 400): PublicState {
  const board = visualStressFreshBoardSnapshot(revision)
  return {
    ...board,
    teams: { status: 'unavailable' },
  }
}

/** Round unavailable fail-closed scene. */
export function visualHistoryRoundUnavailableSnapshot(revision = 401): PublicState {
  return {
    schemaVersion: PUBLIC_STATE_SCHEMA_VERSION,
    revision,
    phase: 'ready',
    headline: 'Session ready',
    detail: 'Playing',
    game: {
      status: 'active',
      roundCount: 2,
      currentRound: 1,
      roundAvailability: 'unavailable',
    },
    round: null,
    teams: null,
    response: null,
  }
}

/** Fully depleted stress board (all six categories cleared). */
export function visualHistoryBoardDepletedSnapshot(revision = 402): PublicState {
  const result = importGameFromUnknown(visualStressGameFile())
  if (result.status !== 'success') {
    throw new Error(`visual history depleted fixture failed: ${result.status}`)
  }
  const store = createSessionStore()
  store.dispatch({ type: 'INIT_SESSION', issuedAt: AT, sessionId: 's05-hist-depleted' })
  store.dispatch({ type: 'INITIALIZE_GAME', issuedAt: AT, definition: result.definition })
  store.dispatch({ type: 'ADVANCE_TO_NEXT_ROUND', issuedAt: AT })

  const categories = ['alpha', 'beta', 'gamma', 'delta', 'epsilon', 'zeta'] as const
  const values = [100, 200, 300, 400, 500] as const
  const commands: SessionCommand[] = []
  for (const categoryId of categories) {
    for (const value of values) {
      const tileId = `${categoryId}-${value}`
      commands.push(
        {
          type: 'SELECT_CATEGORY_BOARD_TILE',
          issuedAt: AT,
          roundId: ROUND,
          tileId,
        },
        {
          type: 'REVEAL_CATEGORY_BOARD_PROMPT',
          issuedAt: AT,
          roundId: ROUND,
        },
        {
          type: 'REVEAL_CATEGORY_BOARD_ANSWER',
          issuedAt: AT,
          roundId: ROUND,
        },
        {
          type: 'RETURN_TO_CATEGORY_BOARD',
          issuedAt: AT,
          roundId: ROUND,
        },
      )
    }
  }
  for (const command of commands) {
    store.dispatch(command)
  }
  const state = store.getPublicState()
  return {
    ...state,
    revision,
    phase: 'ready',
    headline: 'Session ready',
    detail: 'Playing',
  }
}
