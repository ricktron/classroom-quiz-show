import type { SessionEvent } from '../state/events'
import { currentSessionEvents } from '../state/reducer'
import { FINAL_OUTCOME_LABEL } from '../game/finalWager/finalState'
import { SCORE_ADJUSTMENT_MODE_LABEL } from '../game/teams/scoring'

/**
 * The most recent fact that actually moved a team's score, for the Host audit
 * line ("Last score change").
 *
 * Two event kinds move points: `TEAM_SCORE_ADJUSTED` (board presets and manual
 * corrections) and `FINAL_TEAM_SETTLED` (Final wager settlement). Reading only
 * the first left the line stale after a Final, still naming an earlier board
 * award (Q7 R1 item 10). A zero-delta settlement (a team that wagered 0) moved
 * no points, so it is not a score change.
 *
 * Derived from the effective log of the CURRENT class session, so an undone
 * event is never named and a class that has not scored yet shows no line —
 * after "Reset this class session" the previous class's award is not this
 * class's last change.
 */
export interface LastScoreChange {
  readonly teamId: string
  readonly delta: number
  /** Host-only reason, e.g. "full credit" or "Final, incorrect". */
  readonly reason: string
}

export function lastScoreChangeOf(history: readonly SessionEvent[]): LastScoreChange | null {
  const events = currentSessionEvents(history)
  for (let i = events.length - 1; i >= 0; i -= 1) {
    const event = events[i]
    if (event.type === 'TEAM_SCORE_ADJUSTED') {
      return {
        teamId: event.teamId,
        delta: event.delta,
        reason: SCORE_ADJUSTMENT_MODE_LABEL[event.mode],
      }
    }
    if (event.type === 'FINAL_TEAM_SETTLED' && event.delta !== 0) {
      return {
        teamId: event.teamId,
        delta: event.delta,
        reason: `Final, ${FINAL_OUTCOME_LABEL[event.outcome].toLowerCase()}`,
      }
    }
  }
  return null
}
