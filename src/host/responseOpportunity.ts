import { categoryBoardStateFor } from '../state/reducer'
import type { PrivateGameState } from '../state/privateState'
import type { ResponseOpportunityTarget } from '../input/commandTranslation'

/**
 * The one derivation of "which response opportunity is live" (Slice 9).
 *
 * Extracted from `LocalInputHostPanel` when the Gamepad panel became its sibling,
 * so both local-input surfaces answer the question the same way rather than two
 * near-identical copies drifting apart. The behaviour is byte-for-byte the one
 * Slice 8 shipped: a target exists only at the `prompt` stage of the current
 * round, which is the only stage a response window is legal at (ADR-007 §8).
 *
 * PURE, and it reads no clock. The target it returns is carried onto the command
 * so the planner can reject a press that arrived after the host moved on — the
 * command states what it believes, and the planner checks it.
 */
export function responseOpportunityFor(
  game: PrivateGameState,
): ResponseOpportunityTarget | null {
  const roundIndex = game.currentRoundIndex
  if (roundIndex === null) return null
  const round = game.definition.rounds[roundIndex] ?? null
  if (round === null) return null
  const progress = categoryBoardStateFor(game, round.id).progress
  if (progress.stage !== 'prompt') return null
  return { roundId: round.id, tileId: progress.selectedTileId }
}
