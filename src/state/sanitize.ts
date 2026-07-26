import type {
  CategoryBoardRoundState,
  PrivateGameState,
  PrivateState,
} from './privateState'
import {
  INITIAL_PUBLIC_STATE,
  PUBLIC_BOARD_KIND,
  PUBLIC_STATE_SCHEMA_VERSION,
  isPublicState,
  type PublicCategoryBoardCategory,
  type PublicCategoryBoardTile,
  type PublicGameView,
  type PublicPhase,
  type PublicRoundAvailability,
  type PublicRoundState,
  type PublicState,
} from './publicState'
import { PUBLIC_STATUS_COPY, PUBLIC_STATUS_PHASE } from './status'
import { categoryBoardStateFor } from './reducer'
import {
  findTileLocation,
  readCategoryBoardDefinition,
  type CategoryBoardDefinition,
} from '../game/categoryBoard/definition'
import type { RoundDefinition } from '../game/roundDefinition'

/**
 * Project the private game session to the tiny, safe public game view.
 *
 * Like the parent sanitizer this is ALLOW-LIST based: it names only counts, a
 * 1-based ordinal, a coarse status, and a neutral availability. It NEVER reads
 * the definition's title, round ids, round types, round titles, or config — so
 * authored content (and any future answers/notes) cannot leak through it. An
 * unsupported current round projects to `roundAvailability: 'unavailable'`
 * (fail closed) and exposes nothing about the unsupported type.
 */
function roundAvailabilityOf(
  game: PrivateGameState,
  projectionFailed: boolean,
): PublicRoundAvailability {
  if (game.gameLifecycle === 'ended' || game.currentRoundIndex === null) return 'none'
  if (game.currentRoundSupport === 'unsupported') return 'unavailable'
  // A round whose type IS playable but whose public projection could not be
  // built is not "available": it fails closed to the same neutral state as an
  // unregistered type, and says nothing about why.
  if (projectionFailed) return 'unavailable'
  return 'available'
}

function toPublicGameView(
  game: PrivateGameState | null,
  projectionFailed: boolean,
): PublicGameView | null {
  if (!game) return null

  return {
    status: game.gameLifecycle === 'ended' ? 'ended' : 'active',
    roundCount: game.definition.rounds.length,
    currentRound: game.currentRoundIndex === null ? null : game.currentRoundIndex + 1,
    roundAvailability: roundAvailabilityOf(game, projectionFailed),
  }
}

/** The current round definition, or `null` when no round is selected. */
function currentRoundOf(game: PrivateGameState): RoundDefinition | null {
  if (game.currentRoundIndex === null) return null
  return game.definition.rounds[game.currentRoundIndex] ?? null
}

/**
 * Project one category-board round to its public DTO.
 *
 * This is the gameplay half of the private→public boundary, and it is
 * ALLOW-LIST based in exactly the same way as its parent: every public field is
 * NAMED and copied individually from the trusted board. Nothing is spread,
 * cloned-and-deleted, or serialized, so a field added to `CategoryBoardTile`
 * later (a media reference, a standards tag, a hidden bonus marker) is NOT
 * exposed by default.
 *
 * What it deliberately never reads:
 *  - `tile.notes` — host-only teacher notes, at EVERY stage;
 *  - `tile.alternates` — a host grading aid, at EVERY stage;
 *  - the `prompt`/`answer` of any tile other than the selected one;
 *  - the selected tile's `prompt` before the prompt reveal, or its `answer`
 *    before the answer reveal;
 *  - authored category/tile ids — the projector gets positional keys instead.
 *
 * Returns `null` when there is nothing safe to publish (an impossible private
 * state, e.g. a selected tile id that is not on the board). The caller turns
 * that into the neutral "unavailable" projection.
 */
function toPublicCategoryBoardState(
  board: CategoryBoardDefinition,
  boardState: CategoryBoardRoundState,
): PublicRoundState | null {
  const progress = boardState.progress

  if (progress.stage === 'board') {
    const used = new Set(boardState.usedTileIds)
    const categories: PublicCategoryBoardCategory[] = board.categories.map(
      (category, categoryIndex) => {
        const tiles: PublicCategoryBoardTile[] = category.tiles.map((tile, tileIndex) => ({
          // Positional, opaque, deterministic — never the authored tile id.
          key: `c${categoryIndex}t${tileIndex}`,
          value: tile.effectiveValue,
          used: used.has(tile.id),
        }))
        return { key: `c${categoryIndex}`, title: category.title, tiles }
      },
    )
    return { kind: PUBLIC_BOARD_KIND, stage: 'board', categories }
  }

  const location = findTileLocation(board, progress.selectedTileId)
  // Impossible private state (a selection that is not on this board) → fail closed.
  if (location === null) return null

  return {
    kind: PUBLIC_BOARD_KIND,
    stage: progress.stage,
    selection: {
      categoryTitle: location.category.title,
      value: location.tile.effectiveValue,
      // The prompt becomes public only from the prompt stage on. Before that the
      // text is not sent at all — there is no hidden field to inspect.
      prompt:
        progress.stage === 'prompt' || progress.stage === 'answer' ? location.tile.prompt : null,
      // The answer becomes public only after an explicit answer reveal
      // (GAME-ENGINE-BOUNDARIES §4). `alternates` and `notes` are never read.
      answer: progress.stage === 'answer' ? location.tile.answer : null,
    },
  }
}

/** Outcome of projecting the current round: a DTO, nothing to show, or a failure. */
interface RoundProjection {
  readonly round: PublicRoundState | null
  readonly failed: boolean
}

function projectCurrentRound(game: PrivateGameState | null): RoundProjection {
  if (!game || game.gameLifecycle !== 'active') return { round: null, failed: false }
  const current = currentRoundOf(game)
  if (!current) return { round: null, failed: false }

  const board = readCategoryBoardDefinition(current)
  // Not a category board (e.g. the non-gameplay placeholder, or an unregistered
  // type). There is simply no round DTO — that is not a failure.
  if (board === null) return { round: null, failed: false }

  const projected = toPublicCategoryBoardState(board, categoryBoardStateFor(game, current.id))
  return { round: projected, failed: projected === null }
}

/**
 * The private → public boundary (permanent invariant — GAME-ENGINE-BOUNDARIES §4).
 *
 * This sanitizer is ALLOW-LIST based. It constructs a fresh `PublicState` by
 * naming each safe field explicitly. It deliberately does NOT:
 *   - clone the private state and delete fields,
 *   - spread any private object into the result,
 *   - serialize private state,
 *   - rely on a "private"-ish naming convention.
 *
 * Because the output object literal references only `revision`, the resolved
 * status copy, a coarse phase, and two separately allow-listed sub-projections,
 * a NEW private field added to `PrivateState` later cannot reach the display: it
 * simply is not mentioned here. That is the whole point of an allow-list — the
 * default for anything new is "not exposed".
 *
 * Public projection failure (the fourth failure category): if projection ever
 * throws or produces a structurally invalid result, `safeToPublicState` returns
 * the safe `INITIAL_PUBLIC_STATE` so callers still fail closed.
 */
export function toPublicState(state: PrivateState): PublicState {
  const session = state.session

  // No session yet → a fixed, safe "no host" projection.
  if (!session) {
    return {
      schemaVersion: PUBLIC_STATE_SCHEMA_VERSION,
      revision: state.revision,
      phase: 'no-session',
      headline: INITIAL_PUBLIC_STATE.headline,
      detail: INITIAL_PUBLIC_STATE.detail,
      game: null,
      round: null,
    }
  }

  const copy = PUBLIC_STATUS_COPY[session.publicStatusCode]
  const phase: PublicPhase = PUBLIC_STATUS_PHASE[session.publicStatusCode]
  const projection = projectCurrentRound(session.game)

  // NOTE: sessionId, counter, hostNotes, diagnostics, the FULL game definition,
  // and the private per-round board state are intentionally not referenced. The
  // game view and the round DTO are separately allow-listed projections. Do not
  // spread `session`, `state`, `game`, or any board/tile object here.
  return {
    schemaVersion: PUBLIC_STATE_SCHEMA_VERSION,
    revision: state.revision,
    phase,
    headline: copy.headline,
    detail: copy.detail,
    game: toPublicGameView(session.game, projection.failed),
    round: projection.round,
  }
}

/**
 * Defensive wrapper: guarantees a valid `PublicState` even if `toPublicState`
 * throws or (impossibly) returns something malformed. Used at the broadcast
 * boundary so a projection bug can never publish garbage or crash the host loop.
 */
export function safeToPublicState(state: PrivateState): PublicState {
  try {
    const projected = toPublicState(state)
    return isPublicState(projected) ? projected : INITIAL_PUBLIC_STATE
  } catch {
    return INITIAL_PUBLIC_STATE
  }
}
