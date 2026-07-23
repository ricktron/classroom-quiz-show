import type { PrivateGameState, PrivateState } from './privateState'
import {
  INITIAL_PUBLIC_STATE,
  PUBLIC_STATE_SCHEMA_VERSION,
  isPublicState,
  type PublicGameView,
  type PublicPhase,
  type PublicRoundAvailability,
  type PublicState,
} from './publicState'
import { PUBLIC_STATUS_COPY, PUBLIC_STATUS_PHASE } from './status'

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
function toPublicGameView(game: PrivateGameState | null): PublicGameView | null {
  if (!game) return null

  const ended = game.gameLifecycle === 'ended'
  const roundAvailability: PublicRoundAvailability =
    ended || game.currentRoundIndex === null
      ? 'none'
      : game.currentRoundSupport === 'unsupported'
        ? 'unavailable'
        : 'available'

  return {
    status: ended ? 'ended' : 'active',
    roundCount: game.definition.rounds.length,
    currentRound: game.currentRoundIndex === null ? null : game.currentRoundIndex + 1,
    roundAvailability,
  }
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
 * status copy, and a coarse phase, a NEW private field added to `PrivateState`
 * later cannot reach the display: it simply is not mentioned here. That is the
 * whole point of an allow-list — the default for anything new is "not exposed".
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
    }
  }

  const copy = PUBLIC_STATUS_COPY[session.publicStatusCode]
  const phase: PublicPhase = PUBLIC_STATUS_PHASE[session.publicStatusCode]

  // NOTE: sessionId, counter, hostNotes, diagnostics, and the FULL game
  // definition are intentionally not referenced. The game view is a separately
  // allow-listed projection. Do not spread `session`, `state`, or `game` here.
  return {
    schemaVersion: PUBLIC_STATE_SCHEMA_VERSION,
    revision: state.revision,
    phase,
    headline: copy.headline,
    detail: copy.detail,
    game: toPublicGameView(session.game),
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
