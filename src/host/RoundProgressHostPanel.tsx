import { useState } from 'react'
import type { SessionCommand } from '../state/commands'
import type { PrivateGameState } from '../state/privateState'
import type { DispatchResult } from '../state/store'
import { categoryBoardStateFor } from '../state/reducer'
import {
  CATEGORY_BOARD_ROUND_TYPE,
  readCategoryBoardDefinition,
} from '../game/categoryBoard/definition'
import { FINAL_WAGER_ROUND_TYPE } from '../game/finalWager/definition'
import type { RoundDefinition } from '../game/roundDefinition'
import { systemClock, type Clock } from '../time/clock'
import './RoundProgressHostPanel.css'

/**
 * Ordinary Host round progression (Q6-RP-1 / G1).
 *
 * The teacher's job on the focused Host includes "advance" (UX surface
 * inventory §12). Before this panel existed, the only controls that began
 * Round 1, moved to a later round or the Final, or ended a game without a Final
 * lived under More → Advanced diagnostics, which tells teachers it is optional
 * troubleshooting. This panel is the ordinary, discoverable path.
 *
 * It only dispatches commands the engine already has (`ADVANCE_TO_NEXT_ROUND`,
 * `END_GAME_SESSION`); no new event types, no schema change. The store
 * re-validates everything, so a stale panel is inert, not dangerous.
 *
 * Guards (the reducer does not enforce these, so the ordinary UI does):
 *  - nothing is offered once the game has ended;
 *  - while a clue is open the round cannot change — return to the board first;
 *  - moving on while clues remain needs an explicit confirmation;
 *  - ending a game is irreversible, so it always needs confirmation;
 *  - during the Final this panel stays out of the way — the Final panel owns
 *    completion.
 */

export interface RoundProgressHostPanelProps {
  readonly dispatch: (command: SessionCommand) => DispatchResult
  readonly game: PrivateGameState
  readonly clock?: Clock
}

function isFinalRound(round: RoundDefinition | undefined): boolean {
  return round !== undefined && round.type === FINAL_WAGER_ROUND_TYPE
}

function isBoardRound(round: RoundDefinition | undefined): boolean {
  return round !== undefined && round.type === CATEGORY_BOARD_ROUND_TYPE
}

/** Teacher-facing name for the round at `index` ("Round 2", or "the Final"). */
function roundCallName(rounds: readonly RoundDefinition[], index: number): string {
  if (isFinalRound(rounds[index])) return 'the Final'
  return `Round ${index + 1}`
}

/** Button label to move into the round at `index`. */
function enterRoundLabel(rounds: readonly RoundDefinition[], index: number): string {
  if (isFinalRound(rounds[index])) return 'Go to the Final'
  return `Start Round ${index + 1}`
}

type Confirming = 'next' | 'end' | null

function unplayedCopy(remaining: number): string {
  if (remaining <= 0) return ''
  return `${remaining} ${remaining === 1 ? 'clue has' : 'clues have'} not been played. `
}

function confirmCopy(confirming: 'next' | 'end', remaining: number, nextLabel: string): string {
  if (confirming === 'end') {
    return `${unplayedCopy(remaining)}End the game now? Scores become final. This can't be undone.`
  }
  return `${unplayedCopy(remaining)}${nextLabel} now?`
}

export function RoundProgressHostPanel({
  dispatch,
  game,
  clock = systemClock,
}: RoundProgressHostPanelProps) {
  const [confirming, setConfirming] = useState<Confirming>(null)
  const now = () => clock.now()

  if (game.gameLifecycle !== 'active') return null

  const rounds = game.definition.rounds
  const roundIndex = game.currentRoundIndex
  const totalRounds = rounds.length

  // Before the first round the required action is `RoundStartButton`, which
  // sits in the Host chrome so the focused-Host first viewport stays intact.
  if (roundIndex === null) return null

  const round = rounds[roundIndex]
  // The Final panel owns the Final, including completion.
  if (isFinalRound(round)) return null

  const nextIndex = roundIndex + 1
  const hasNext = nextIndex < totalRounds

  let clueOpen = false
  let usedCount = 0
  let tileCount = 0
  let supported = false
  if (round !== undefined && isBoardRound(round)) {
    const board = readCategoryBoardDefinition(round)
    if (board !== null) {
      supported = true
      const state = categoryBoardStateFor(game, round.id)
      clueOpen = state.progress.stage !== 'board'
      tileCount = board.categories.reduce((sum, category) => sum + category.tiles.length, 0)
      const ids = new Set(board.categories.flatMap((c) => c.tiles.map((t) => t.id)))
      usedCount = state.usedTileIds.filter((id) => ids.has(id)).length
    }
  }
  const remaining = Math.max(tileCount - usedCount, 0)
  const boardDone = supported && remaining === 0

  const roundLabel = `${roundCallName(rounds, roundIndex)} of ${totalRounds}`
  const statusCopy = supported
    ? `${roundLabel} · ${usedCount} of ${tileCount} clues played`
    : `${roundLabel} · this round can't be played here`

  const nextLabel = hasNext ? enterRoundLabel(rounds, nextIndex) : 'End the game'
  const needsConfirm = !hasNext || !boardDone
  const advance = () => {
    setConfirming(null)
    if (hasNext) {
      dispatch({ type: 'ADVANCE_TO_NEXT_ROUND', issuedAt: now() })
    } else {
      dispatch({ type: 'END_GAME_SESSION', issuedAt: now() })
    }
  }
  const kind: Confirming = hasNext ? 'next' : 'end'

  return (
    <section
      className={`rph${boardDone ? ' rph--done' : ''}`}
      aria-labelledby="rph-title"
      data-testid="rph"
    >
      <h3 id="rph-title" className="visually-hidden">
        Round progress
      </h3>
      <div className="rph__row">
        <p className="rph__status" data-testid="rph-status">
          {statusCopy}
        </p>
        {confirming === null && (
          <button
            type="button"
            className={boardDone ? 'btn rph__primary' : 'btn btn--secondary'}
            data-testid={hasNext ? 'rph-next' : 'rph-end'}
            disabled={clueOpen}
            onClick={() => (needsConfirm ? setConfirming(kind) : advance())}
          >
            {nextLabel}
          </button>
        )}
      </div>
      {clueOpen && confirming === null && (
        <p className="rph__note" data-testid="rph-blocked-note">
          Finish this clue and return to the board before moving on.
        </p>
      )}
      {confirming !== null && (
        <div className="rph__confirm" role="group" aria-label="Confirm" data-testid="rph-confirm">
          <p className="rph__note">
            {confirmCopy(confirming, remaining, nextLabel)}
          </p>
          <button
            type="button"
            className="btn"
            data-testid={confirming === 'end' ? 'rph-end-confirm' : 'rph-next-confirm'}
            disabled={clueOpen}
            onClick={advance}
          >
            {confirming === 'end' ? 'End the game now' : `${nextLabel} now`}
          </button>
          <button
            type="button"
            className="btn btn--secondary"
            data-testid="rph-cancel"
            onClick={() => setConfirming(null)}
          >
            Keep playing
          </button>
        </div>
      )}
    </section>
  )
}

/**
 * The one required next action after Start Game (Q6-RP-1 / G1): begin the
 * first round. Rendered in the focused-Host chrome beside Display / Back to
 * setup — primary, first in reading order, and never under More.
 */
export function RoundStartButton({
  dispatch,
  game,
  clock = systemClock,
  disabled = false,
}: RoundProgressHostPanelProps & { readonly disabled?: boolean }) {
  if (game.gameLifecycle !== 'active' || game.currentRoundIndex !== null) return null
  const rounds = game.definition.rounds
  if (rounds.length === 0) return null
  return (
    <button
      type="button"
      className="btn"
      data-testid="rph-start"
      disabled={disabled}
      onClick={() => dispatch({ type: 'ADVANCE_TO_NEXT_ROUND', issuedAt: clock.now() })}
    >
      {isFinalRound(rounds[0]) ? 'Start the Final' : 'Start Round 1'}
    </button>
  )
}

