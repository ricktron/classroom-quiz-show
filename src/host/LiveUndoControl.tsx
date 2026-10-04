import type { SessionCommand } from '../state/commands'
import type { SessionEvent } from '../state/events'
import type { PrivateGameState } from '../state/privateState'
import type { DispatchResult } from '../state/store'
import { systemClock, type Clock } from '../time/clock'
import { liveUndoTarget } from './liveUndo'

/**
 * Ordinary live Undo (Q6-RP-2 / G3).
 *
 * One control on the focused-Host play-status line, in the same place in every
 * live state (board, clue, buzz, Final). It dispatches the existing canonical
 * `UNDO` command — the same one the diagnostics copy uses — and its label says
 * exactly what that command would reverse right now ("Undo Incorrect (Team 2)").
 *
 * Shown only while a round is live: before the first round the teacher is still
 * finishing setup (Back to setup owns names), and after the game ends the
 * planner refuses undo. Disabled when nothing can be undone or when this tab
 * may not dispatch session commands. Host-private: never projected.
 */
export interface LiveUndoControlProps {
  readonly dispatch: (command: SessionCommand) => DispatchResult
  readonly game: PrivateGameState
  readonly history: readonly SessionEvent[]
  readonly clock?: Clock
  readonly disabled?: boolean
}

export function LiveUndoControl({
  dispatch,
  game,
  history,
  clock = systemClock,
  disabled = false,
}: LiveUndoControlProps) {
  if (game.gameLifecycle !== 'active' || game.currentRoundIndex === null) return null
  const target = liveUndoTarget(game, history)
  const label = target?.label ?? 'Nothing to undo'
  return (
    <button
      type="button"
      className="btn btn--secondary"
      data-testid="host-undo"
      disabled={disabled || target === null}
      aria-label={target === null ? 'Nothing to undo' : `${label} — reverses the last action`}
      onClick={() => dispatch({ type: 'UNDO', issuedAt: clock.now() })}
    >
      {label}
    </button>
  )
}
