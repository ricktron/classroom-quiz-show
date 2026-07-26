import { useEffect } from 'react'
import type { SessionCommand } from '../state/commands'
import type { PrivateGameState } from '../state/privateState'
import type { DispatchResult } from '../state/store'
import { responsePhaseFor } from '../state/reducer'
import { systemClock, type Clock } from '../time/clock'

/**
 * The timer-expiry ADAPTER (Slice 7).
 *
 * This is the only place in the application that schedules anything against the
 * wall clock, and it is deliberately tiny and dumb: it watches the durable timer
 * state, arms one `setTimeout` for the current deadline, and — when that fires —
 * dispatches a COMMAND. It never touches state, never computes a derived value
 * that anything else reads, and never decides anything.
 *
 * ## Why a command rather than a state update
 *
 * A callback that mutated derived state would make "the timer expired" a fact
 * invented by a browser timer instead of a fact recorded by the host. Routing it
 * through the command boundary means expiry is planned, validated, appended,
 * replayed and undoable exactly like every other fact — and means a late, stale,
 * duplicated or resurrected callback is simply REJECTED by the planner rather
 * than corrupting anything.
 *
 * ## What makes a stale callback harmless
 *
 * The command carries the `timerId` and the `deadline` this effect was scheduled
 * for. If the timer was reset, restarted, paused, interrupted, undone, or
 * abandoned because the host changed clue or round, the planner's three-way match
 * fails and nothing is appended. The effect also tears its own timeout down on
 * every dependency change and on unmount, so in practice a stale callback rarely
 * even fires — but correctness does not depend on that, which is the point.
 *
 * ## Host only
 *
 * This hook lives on the host surface and nowhere else. A display never expires a
 * timer; it renders a countdown and waits to be told (ADR-007 §10).
 */
export interface UseResponseTimerExpiryOptions {
  /** The current game session, or `null` when no game is loaded. */
  readonly game: PrivateGameState | null
  readonly dispatch: (command: SessionCommand) => DispatchResult
  /** Injectable clock (defaults to the real one). */
  readonly clock?: Clock
}

export function useResponseTimerExpiry({
  game,
  dispatch,
  clock = systemClock,
}: UseResponseTimerExpiryOptions): void {
  const roundIndex = game?.currentRoundIndex ?? null
  const round = game && roundIndex !== null ? (game.definition.rounds[roundIndex] ?? null) : null
  const phase = game && round ? responsePhaseFor(game, round.id) : null
  const timer = phase?.timer ?? null

  const roundId = round?.id ?? null
  const timerId = timer !== null && timer.status === 'running' ? timer.timerId : null
  const deadline = timer !== null && timer.status === 'running' ? timer.deadline : null

  useEffect(() => {
    if (roundId === null || timerId === null || deadline === null) return
    // Never negative: a deadline already in the past (after an undone expiry, say)
    // fires on the next tick rather than being ignored.
    const delay = Math.max(0, deadline - clock.now())
    const handle = setTimeout(() => {
      dispatch({
        type: 'EXPIRE_RESPONSE_TIMER',
        issuedAt: clock.now(),
        roundId,
        timerId,
        deadline,
      })
    }, delay)
    return () => clearTimeout(handle)
  }, [roundId, timerId, deadline, dispatch, clock])
}
