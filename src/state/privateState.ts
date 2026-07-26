import type { PublicStatusCode } from './status'
import type { EventType, RoundSupport } from './events'
import type { GameDefinition } from '../game/gameDefinition'
import type { ResponsePhaseState } from '../game/timing/responsePhase'

/**
 * PRIVATE (authoritative) application state.
 *
 * This is the single source of runtime truth, owned exclusively by the host. It
 * contains fields that must NEVER reach the projector — a private host session
 * id, an internal counter, free-form host notes, and diagnostics. The only path
 * from here to the display is the allow-list sanitizer in `sanitize.ts`; nothing
 * in this module is display-safe.
 *
 * Slice 2 was a neutral foundation with no gameplay at all. Gameplay state has
 * arrived since: Slice 5 added per-round board progress, Slice 6 added team
 * scores, and Slice 7 adds the per-round response phase (arming + timer facts).
 * Buzzers, wagers and persistence remain absent.
 */

/** Foundation lifecycle. No gameplay states — those arrive in later slices. */
export type SessionLifecycle = 'ready' | 'waiting'

/** Whether a loaded game is still active or has been explicitly ended. */
export type GameLifecycle = 'active' | 'ended'

/**
 * The reveal stage of a `category-board` round (Slice 5).
 *
 * This is ONE explicit stage value, deliberately not a set of booleans: there is
 * no `isPromptShown && !isAnswerShown` to get out of sync, and an impossible
 * combination cannot be represented.
 *
 *  - `board`    — the grid is showing; nothing is selected.
 *  - `selected` — the host has chosen a tile and can privately preview it.
 *                 NOTHING new is public yet beyond the category and value.
 *  - `prompt`   — the prompt has been revealed publicly.
 *  - `answer`   — the answer has been revealed publicly.
 */
export type CategoryBoardStage = 'board' | 'selected' | 'prompt' | 'answer'

/**
 * Stage + selection as a single discriminated value, so the invariants
 * "no prompt without a selected tile" and "no answer without a selected tile"
 * are STRUCTURAL — an answer stage with no tile is not expressible.
 */
export type CategoryBoardProgress =
  | { readonly stage: 'board'; readonly selectedTileId: null }
  | { readonly stage: 'selected'; readonly selectedTileId: string }
  | { readonly stage: 'prompt'; readonly selectedTileId: string }
  | { readonly stage: 'answer'; readonly selectedTileId: string }

/**
 * PRIVATE per-round session state for one category-board round.
 *
 * Both fields are DERIVED BY REPLAY from the append-only event log — there is no
 * out-of-band mutation and no separate used-tile cache. `usedTileIds` therefore
 * shrinks automatically when an answer-reveal event is undone, because the
 * undone event is simply not applied on the next replay.
 */
export interface CategoryBoardRoundState {
  readonly progress: CategoryBoardProgress
  /**
   * Tiles that have been completed, in completion order. A tile is added when
   * its ANSWER is revealed — selecting a tile does not consume it, so an
   * accidental selection can be undone without burning the tile.
   */
  readonly usedTileIds: readonly string[]
}

/** A fresh, untouched board: nothing selected, nothing used. */
export const INITIAL_CATEGORY_BOARD_ROUND_STATE: CategoryBoardRoundState = {
  progress: { stage: 'board', selectedTileId: null },
  usedTileIds: [],
}

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
  /**
   * Team scores for this game session, keyed by stable `TeamId` (Slice 6).
   *
   * This is SESSION state, not authored content: the teams themselves live on the
   * immutable `definition`, and their scores live here because they change. A
   * missing key means the team is still on {@link INITIAL_TEAM_SCORE} — the map
   * only records teams that have actually been adjusted, so "no entry" and "zero"
   * are the same fact and cannot disagree.
   *
   * Like `categoryBoards`, this is DERIVED BY REPLAY from the append-only event
   * log. There is no score cache, no running total kept alongside the events, and
   * no path that mutates a score outside `reduce`. That is what makes undo exact:
   * an undone adjustment is simply not applied on the next replay.
   */
  readonly teamScores: Readonly<Record<string, number>>
  /**
   * Per-round category-board progress, keyed by the round's stable `RoundId`.
   *
   * Keying by round id (rather than holding one "current board") means moving
   * to another round and coming back RESUMES that board exactly where it was —
   * its used tiles and its reveal stage both persist. That is the classroom
   * expectation: glancing at the next round must not wipe the board you are
   * halfway through.
   *
   * PRIVATE. It is derived purely from events, and only the tiny allow-listed
   * public DTO in `sanitize.ts` ever reaches the display.
   */
  readonly categoryBoards: Readonly<Record<string, CategoryBoardRoundState>>
  /**
   * Per-round response-phase state — arming and the timer (Slice 7), keyed by the
   * round's stable `RoundId`.
   *
   * It is a SIBLING of `categoryBoards`, not a field inside it, on purpose. The
   * response phase is not a property of the category-board round type: a future
   * round type with a timed response gets the same state, the same commands and
   * the same public projection by reusing this map, without the board's shape
   * being dragged along.
   *
   * A missing key means the round is in {@link INITIAL_RESPONSE_PHASE_STATE} —
   * disarmed with no timer — so "no entry" and "idle" are the same fact and can
   * never disagree, exactly as with `teamScores`.
   *
   * Like every other gameplay field it is DERIVED BY REPLAY. There is no timer
   * object, no interval, and no write path outside `reduce`; the countdown a
   * teacher sees is computed at the rendering edge from these facts plus a clock.
   * A response phase is deliberately NOT resumed across a round change — see
   * ADR-007 §8.
   */
  readonly responsePhases: Readonly<Record<string, ResponsePhaseState>>
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
