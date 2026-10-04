import type { SessionEvent } from '../state/events'
import type { PrivateGameState } from '../state/privateState'
import { findUndoTarget, publicTeamDisplayName } from '../state/reducer'
import { formatSignedDelta } from '../game/teams/scoring'
import { FINAL_WAGER_ROUND_TYPE } from '../game/finalWager/definition'

/**
 * Teacher-facing description of what the ordinary live Undo would reverse
 * (Q6-RP-2 / G3).
 *
 * This is a READ of the existing canonical undo system: it asks
 * `findUndoTarget` — the same function the `UNDO` planner uses — which event the
 * next `UNDO` command would neutralize, and names it in teacher language. It
 * keeps no history of its own and makes nothing newly reversible.
 *
 * Host-private: labels may name teams, score deltas and Final wagers, so they
 * are rendered only on the Host and never reach the public projection.
 */

export interface LiveUndoTarget {
  /** Short button label, e.g. "Undo Incorrect (Team 2)". */
  readonly label: string
  /** The event the next `UNDO` will neutralize. */
  readonly eventId: string
}

const RESOLUTION_WORD: Readonly<Record<'incorrect' | 'passed' | 'correct', string>> = {
  incorrect: 'Incorrect',
  passed: 'Pass',
  correct: 'Correct',
}

const FINAL_OUTCOME_WORD: Readonly<Record<'correct' | 'incorrect' | 'no-response', string>> = {
  correct: 'Final correct',
  incorrect: 'Final incorrect',
  'no-response': 'Final no response',
}

function teamName(game: PrivateGameState, teamId: string): string {
  const team = game.definition.teams.find((t) => t.id === teamId)
  return publicTeamDisplayName(game, teamId, team?.name ?? 'a team')
}

function roundName(game: PrivateGameState, roundIndex: number): string {
  const round = game.definition.rounds[roundIndex]
  if (round !== undefined && round.type === FINAL_WAGER_ROUND_TYPE) return 'the Final'
  return `Round ${roundIndex + 1}`
}

/**
 * Teacher words for undoing one canonical event. Exhaustive over event types so
 * a new event type cannot silently fall through to a wrong label.
 */
export function undoLabelFor(event: SessionEvent, game: PrivateGameState): string {
  switch (event.type) {
    case 'TEAM_BUZZED':
      return `Undo buzz-in (${teamName(game, event.teamId)})`
    case 'ACTIVE_RESPONSE_RESOLVED':
      return `Undo ${RESOLUTION_WORD[event.resolution.kind]} (${teamName(game, event.teamId)})`
    case 'TEAM_SCORE_ADJUSTED':
      return `Undo score change (${teamName(game, event.teamId)} ${formatSignedDelta(event.delta)})`
    case 'CATEGORY_BOARD_TILE_SELECTED':
      return 'Undo clue pick'
    case 'CATEGORY_BOARD_PROMPT_REVEALED':
      return 'Undo show prompt'
    case 'CATEGORY_BOARD_ANSWER_REVEALED':
      return 'Undo show answer'
    case 'CATEGORY_BOARD_RETURNED':
      return 'Undo return to board'
    case 'RESPONSE_PHASE_ARMED':
      return 'Undo arm clue'
    case 'RESPONSE_PHASE_DISARMED':
      return 'Undo disarm clue'
    case 'RESPONSE_TIMER_STARTED':
      return 'Undo timer start'
    case 'RESPONSE_TIMER_PAUSED':
      return 'Undo timer pause'
    case 'RESPONSE_TIMER_RESUMED':
      return 'Undo timer resume'
    case 'RESPONSE_TIMER_INTERRUPTED':
      return 'Undo timer stop'
    case 'RESPONSE_TIMER_EXPIRED':
      return 'Undo time up'
    case 'RESPONSE_PHASE_RESET':
      return 'Undo response reset'
    case 'ROUND_ADVANCED':
    case 'CURRENT_ROUND_SELECTED':
      return `Undo move to ${roundName(game, event.roundIndex)}`
    case 'SESSION_TEAM_NAME_SET':
      return 'Undo team name change'
    case 'FINAL_WAGER_STARTED':
      return 'Undo Final start'
    case 'FINAL_WAGER_WINDOW_STARTED':
      return 'Undo wager timer start'
    case 'FINAL_WAGER_WINDOW_PAUSED':
      return 'Undo wager timer pause'
    case 'FINAL_WAGER_WINDOW_RESUMED':
      return 'Undo wager timer resume'
    case 'FINAL_WAGER_WINDOW_EXPIRED':
      return 'Undo wager time up'
    case 'FINAL_TEAM_WAGER_RECORDED':
      return `Undo saved wager (${teamName(game, event.teamId)})`
    case 'FINAL_WAGERS_LOCKED':
      return 'Undo lock wagers'
    case 'FINAL_RESPONSE_WINDOW_STARTED':
      return 'Undo response timer start'
    case 'FINAL_RESPONSE_WINDOW_PAUSED':
      return 'Undo response timer pause'
    case 'FINAL_RESPONSE_WINDOW_RESUMED':
      return 'Undo response timer resume'
    case 'FINAL_RESPONSE_WINDOW_EXPIRED':
      return 'Undo response time up'
    case 'FINAL_TEAM_RESPONSE_RECORDED':
      return `Undo saved response (${teamName(game, event.teamId)})`
    case 'FINAL_RESPONSES_LOCKED':
      return 'Undo lock responses'
    case 'FINAL_ANSWER_REVEALED':
      return 'Undo show Final answer'
    case 'FINAL_TEAM_REVEALED':
      return `Undo reveal (${teamName(game, event.teamId)})`
    case 'FINAL_TEAM_SETTLED':
      return `Undo ${FINAL_OUTCOME_WORD[event.outcome]} (${teamName(game, event.teamId)})`
    case 'FINAL_TIE_RESOLUTION_SELECTED':
      return event.resolution === 'sudden-death' ? 'Undo sudden death' : 'Undo tie decision'
    case 'PUBLIC_STATUS_SET':
    case 'SEQUENCE_ADVANCED':
    case 'WAITING_MARKED':
    case 'HOST_NOTE_SET':
      return 'Undo troubleshooting change'
    // Irreversible by construction — never an undo target, labelled defensively.
    case 'SESSION_INITIALIZED':
    case 'EVENT_UNDONE':
    case 'GAME_INITIALIZED':
    case 'GAME_SESSION_ENDED':
      return 'Undo last action'
    default: {
      const exhaustive: never = event
      void exhaustive
      return 'Undo last action'
    }
  }
}

/**
 * What the next canonical `UNDO` would reverse right now, or `null` when the
 * planner would reject it (nothing reversible, or the game has ended).
 */
export function liveUndoTarget(
  game: PrivateGameState,
  history: readonly SessionEvent[],
): LiveUndoTarget | null {
  if (game.gameLifecycle === 'ended') return null
  const target = findUndoTarget(history)
  if (target === null) return null
  return { label: undoLabelFor(target, game), eventId: target.id }
}
