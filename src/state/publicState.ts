/**
 * PUBLIC (projector-safe) state.
 *
 * This module is the ONLY state-shape module the display surface is allowed to
 * import. It deliberately imports nothing from the private state, the store, the
 * reducer, commands, or events. Keeping it dependency-free is a structural
 * guarantee that a display component cannot accidentally pull a private type (or
 * a private value along with it) into the projector bundle.
 *
 * `PublicState` is an explicit allow-list: every field here is safe to show on a
 * classroom projector. There is no `[key: string]` index signature and no
 * `unknown`/`any` escape hatch, so the type itself cannot grow a private field
 * by accident — adding one is a deliberate, reviewable edit.
 *
 * See docs/architecture/GAME-ENGINE-BOUNDARIES.md (§4) and ADR-002.
 */

/**
 * Bump when the PublicState wire shape changes incompatibly. Slice 3 added the
 * `game` field, so this moved from 1 → 2; a display expecting the old shape
 * fails closed on the version mismatch.
 */
export const PUBLIC_STATE_SCHEMA_VERSION = 2 as const

/**
 * Coarse, public-safe lifecycle phase. This is intentionally NOT the private
 * lifecycle: it never distinguishes internal host-only states and never carries
 * a session id, counter, notes, or diagnostics.
 */
export type PublicPhase = 'no-session' | 'ready' | 'waiting'

/**
 * Neutral, display-safe availability of the current round.
 *  - `none` — no round is selected (or the game has ended).
 *  - `available` — a supported round is current.
 *  - `unavailable` — the current round's type is unsupported; the display fails
 *    closed to a neutral "unavailable" state and reveals nothing about why.
 */
export type PublicRoundAvailability = 'none' | 'available' | 'unavailable'

/**
 * The ONLY game information the display may see. It is deliberately minimal and
 * derived: counts and a 1-based ordinal, a coarse status, and a neutral
 * availability. It never carries the game title, round ids, round-type
 * identifiers, round labels, or any authored config — those stay private.
 */
export interface PublicGameView {
  /** Whether the game is still active or has ended. */
  readonly status: 'active' | 'ended'
  /** Total number of rounds in the game. */
  readonly roundCount: number
  /** 1-based ordinal of the current round, or `null` when none is selected. */
  readonly currentRound: number | null
  /** Neutral availability of the current round. */
  readonly roundAvailability: PublicRoundAvailability
}

/** The complete set of information the display shell is permitted to render. */
export interface PublicState {
  /** Wire-shape version so the display can fail closed on an unknown shape. */
  readonly schemaVersion: typeof PUBLIC_STATE_SCHEMA_VERSION
  /**
   * Monotonic revision (never decreases for a given host session). Used purely
   * for transport ordering / de-duplication; carries no private meaning.
   */
  readonly revision: number
  /** Coarse public phase. */
  readonly phase: PublicPhase
  /** Short public headline safe for the projector. */
  readonly headline: string
  /** Secondary public line safe for the projector. */
  readonly detail: string
  /** Safe, derived game view, or `null` when no game is loaded. */
  readonly game: PublicGameView | null
}

/**
 * The safe default the display shows before it has received any host state, and
 * the state it falls back to if everything else fails. It is a valid
 * `PublicState` describing "no host yet".
 */
export const INITIAL_PUBLIC_STATE: PublicState = {
  schemaVersion: PUBLIC_STATE_SCHEMA_VERSION,
  revision: 0,
  phase: 'no-session',
  headline: 'Waiting for the host',
  detail: 'No active round.',
  game: null,
}

const PUBLIC_PHASES: readonly PublicPhase[] = ['no-session', 'ready', 'waiting']
const PUBLIC_ROUND_AVAILABILITIES: readonly PublicRoundAvailability[] = [
  'none',
  'available',
  'unavailable',
]

/** Strict guard for the nested game view (or `null`). */
function isPublicGameView(value: unknown): value is PublicGameView {
  if (value === null) return true
  if (typeof value !== 'object') return false
  const v = value as Record<string, unknown>
  return (
    (v.status === 'active' || v.status === 'ended') &&
    typeof v.roundCount === 'number' &&
    Number.isFinite(v.roundCount) &&
    (v.currentRound === null ||
      (typeof v.currentRound === 'number' && Number.isFinite(v.currentRound))) &&
    typeof v.roundAvailability === 'string' &&
    (PUBLIC_ROUND_AVAILABILITIES as readonly string[]).includes(v.roundAvailability)
  )
}

/**
 * Runtime validator used at BOTH trust boundaries:
 *  - the host re-checks its own projected state before broadcasting, and
 *  - the display validates every decoded message before rendering it.
 *
 * It is strict on purpose: unexpected extra fields are tolerated (a forward-
 * compatible sender), but any missing/mis-typed allow-listed field, or an
 * unknown schema version, causes a hard reject so the display fails closed.
 */
export function isPublicState(value: unknown): value is PublicState {
  if (typeof value !== 'object' || value === null) return false
  const v = value as Record<string, unknown>
  return (
    v.schemaVersion === PUBLIC_STATE_SCHEMA_VERSION &&
    typeof v.revision === 'number' &&
    Number.isFinite(v.revision) &&
    typeof v.phase === 'string' &&
    (PUBLIC_PHASES as readonly string[]).includes(v.phase) &&
    typeof v.headline === 'string' &&
    typeof v.detail === 'string' &&
    isPublicGameView(v.game)
  )
}
