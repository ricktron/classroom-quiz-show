import { useEffect } from 'react'
import type { SessionCommand } from '../state/commands'
import type { PrivateGameState } from '../state/privateState'
import type { DispatchResult } from '../state/store'
import { finalWagerStateFor } from '../state/reducer'
import { readFinalWagerDefinition } from '../game/finalWager/definition'
import { systemClock, type Clock } from '../time/clock'

/**
 * The Final window expiry ADAPTER (Slice 14).
 *
 * The Final sibling of `useResponseTimerExpiry`, and deliberately the same shape:
 * it watches the durable window state, arms one `setTimeout` for the current
 * deadline, and — when that fires — dispatches a COMMAND. It never touches state,
 * never computes a derived value anything else reads, and never decides anything.
 *
 * ## Why a command rather than a state update
 *
 * A callback that mutated derived state would make "the window expired" a fact
 * invented by a browser timer instead of a fact recorded by the host. Routing it
 * through the command boundary means expiry is planned, validated, appended,
 * replayed and undoable exactly like every other fact — and means a late, stale,
 * duplicated or resurrected callback is REJECTED by the planner rather than
 * corrupting anything.
 *
 * ## What expiry does NOT do
 *
 * Nothing beyond recording that the window ended. It locks no wager, invents no
 * zero for a silent team, marks nobody as a no-response, reveals nothing,
 * adjudicates nothing, settles nothing and ends nothing. That restraint lives in
 * the reducer, not here — this hook could not do those things if it wanted to,
 * because the only thing it can produce is one bounded command.
 *
 * ## Two windows, one hook
 *
 * A Final has a wager window and a response window, but only ONE of them can be
 * running at a time: wager entry precedes the response window and the phase
 * machine will not let both run. The hook therefore watches whichever window is
 * live and needs no second timeout.
 *
 * ## Host only
 *
 * This hook lives on the host surface and nowhere else. A display never expires a
 * window; it renders a countdown and waits to be told (ADR-007 §10).
 */
export interface UseFinalWagerExpiryOptions {
  /** The current game session, or `null` when no game is loaded. */
  readonly game: PrivateGameState | null
  readonly dispatch: (command: SessionCommand) => DispatchResult
  /** Injectable clock (defaults to the real one). */
  readonly clock?: Clock
}

export function useFinalWagerExpiry({
  game,
  dispatch,
  clock = systemClock,
}: UseFinalWagerExpiryOptions): void {
  const roundIndex = game?.currentRoundIndex ?? null
  const round = game && roundIndex !== null ? (game.definition.rounds[roundIndex] ?? null) : null
  const isFinal = round !== null && readFinalWagerDefinition(round) !== null
  const final = game && round && isFinal ? finalWagerStateFor(game, round.id) : null

  const wagerWindow = final?.wagerWindow ?? null
  const responseWindow = final?.responseWindow ?? null
  // Whichever window is actually counting down. At most one can be, because the
  // phase machine runs wager entry strictly before the response window.
  const live =
    wagerWindow !== null && wagerWindow.status === 'running'
      ? ({ kind: 'wager' as const, timer: wagerWindow })
      : responseWindow !== null && responseWindow.status === 'running'
        ? ({ kind: 'response' as const, timer: responseWindow })
        : null

  const roundId = round?.id ?? null
  const kind = live?.kind ?? null
  const timerId = live?.timer.timerId ?? null
  const deadline = live?.timer.deadline ?? null

  useEffect(() => {
    if (roundId === null || kind === null || timerId === null || deadline === null) return
    // Never negative: a deadline already in the past (after an undone expiry, or
    // after the host came back to Final from another round) fires on the next
    // tick rather than being ignored.
    const delay = Math.max(0, deadline - clock.now())
    const handle = setTimeout(() => {
      dispatch({
        type:
          kind === 'wager' ? 'EXPIRE_FINAL_WAGER_WINDOW' : 'EXPIRE_FINAL_RESPONSE_WINDOW',
        issuedAt: clock.now(),
        roundId,
        timerId,
        deadline,
      })
    }, delay)
    return () => clearTimeout(handle)
  }, [roundId, kind, timerId, deadline, dispatch, clock])
}
