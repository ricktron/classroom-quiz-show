import type { PublicStatusCode } from './status'
import type { EventType, RoundSupport } from './events'
import type { GameDefinition } from '../game/gameDefinition'

/**
 * PRIVATE (authoritative) application state.
 *
 * This is the single source of runtime truth, owned exclusively by the host. It
 * contains fields that must NEVER reach the projector — a private host session
 * id, an internal counter, free-form host notes, and diagnostics. The only path
 * from here to the display is the allow-list sanitizer in `sanitize.ts`; nothing
 * in this module is display-safe.
 *
 * Slice 2 is a neutral foundation: this "session shell" deliberately models NO
 * gameplay (no board, rounds, teams, scoring, timers, prompts, or answers).
 */

/** Foundation lifecycle. No gameplay states — those arrive in later slices. */
export type SessionLifecycle = 'ready' | 'waiting'

/** Whether a loaded game is still active or has been explicitly ended. */
export type GameLifecycle = 'active' | 'ended'

/**
 * PRIVATE game/session runtime state (Slice 3). This is the `GameSession`
 * concept: runtime progress DERIVED from a `GameDefinition` plus session
 * history. It is kept distinct from the authored definition it references
 * (GAME-ENGINE-BOUNDARIES §2).
 *
 * Snapshot strategy: `definition` is the deep-frozen `GameDefinition` captured
 * from the `GAME_INITIALIZED` event. Because the factory deep-freezes it, this
 * is an immutable in-memory snapshot — session operations here never mutate it.
 *
 * The FULL definition is PRIVATE (it may hold authored titles/config now and,
 * in later slices, answers and teacher notes). Only the allow-list sanitizer
 * projects a handful of safe, derived fields to the display.
 */
export interface PrivateGameState {
  /** Immutable (deep-frozen) authored definition snapshot. PRIVATE in full. */
  readonly definition: GameDefinition
  readonly gameLifecycle: GameLifecycle
  /** Ordinal index of the current round, or `null` when none is selected. */
  readonly currentRoundIndex: number | null
  /**
   * Support of the current round's type — `null` when no round is selected.
   * `unsupported` drives the host diagnostic and the fail-closed public view.
   */
  readonly currentRoundSupport: RoundSupport | null
}

/** Nested private diagnostics — used to prove nested fields never leak. */
export interface PrivateDiagnostics {
  readonly lastAppliedEventType: EventType | null
  /** Count of state-affecting events applied (excludes undone / undo markers). */
  readonly appliedEventCount: number
}

/** The private per-session shell. `null` on `PrivateState` until initialized. */
export interface PrivateSessionState {
  /** Private host session id — identifying, never projected. */
  readonly sessionId: string
  readonly lifecycle: SessionLifecycle
  /** Internal sequence/version counter — a private demo of state transitions. */
  readonly counter: number
  /** Bounded public status the host has chosen (resolved to copy by sanitizer). */
  readonly publicStatusCode: PublicStatusCode
  /** Free-form host-only notes. PRIVATE — must never appear on the display. */
  readonly hostNotes: string
  /** Loaded game session, or `null` until a game is initialized. PRIVATE. */
  readonly game: PrivateGameState | null
}

export interface PrivateState {
  /** Internal state schema version (distinct from the public wire version). */
  readonly schemaVersion: number
  /**
   * Monotonic revision. Invariant: after a full replay this equals the number
   * of events in history, so it never decreases across a host session.
   */
  readonly revision: number
  readonly session: PrivateSessionState | null
  /** Nested private diagnostics. PRIVATE — never projected. */
  readonly diagnostics: PrivateDiagnostics
}

export const PRIVATE_STATE_SCHEMA_VERSION = 1

export const INITIAL_PRIVATE_STATE: PrivateState = {
  schemaVersion: PRIVATE_STATE_SCHEMA_VERSION,
  revision: 0,
  session: null,
  diagnostics: {
    lastAppliedEventType: null,
    appliedEventCount: 0,
  },
}
