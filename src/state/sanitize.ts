import type { PrivateState } from './privateState'
import {
  INITIAL_PUBLIC_STATE,
  PUBLIC_STATE_SCHEMA_VERSION,
  isPublicState,
  type PublicPhase,
  type PublicState,
} from './publicState'
import { PUBLIC_STATUS_COPY, PUBLIC_STATUS_PHASE } from './status'

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
    }
  }

  const copy = PUBLIC_STATUS_COPY[session.publicStatusCode]
  const phase: PublicPhase = PUBLIC_STATUS_PHASE[session.publicStatusCode]

  // NOTE: sessionId, counter, hostNotes, and diagnostics are intentionally not
  // referenced. Do not spread `session` or `state` here.
  return {
    schemaVersion: PUBLIC_STATE_SCHEMA_VERSION,
    revision: state.revision,
    phase,
    headline: copy.headline,
    detail: copy.detail,
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
