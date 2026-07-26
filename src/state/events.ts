import type { PublicStatusCode } from './status'
import type { GameDefinition } from '../game/gameDefinition'

/**
 * EVENTS record *accepted facts* — things that actually happened, in order. The
 * append-only list of events IS the source of truth; the authoritative state is
 * derived by replaying them (see `reducer.ts`). Events are never edited in place.
 *
 * (Named `SessionEvent`, not `Event`, to avoid shadowing the DOM `Event` type.)
 *
 * Reversibility is an explicit, per-event property so that reversible and
 * irreversible behavior are distinguishable:
 *  - reversible events can be neutralized by an `EVENT_UNDONE` marker;
 *  - irreversible events (session init/reset, game init/end, and undo markers
 *    themselves) can never be undone, which keeps init/reset/end hard baselines
 *    and prevents undoing an undo.
 *
 * Slice 3 adds four game/round-lifecycle events. Round *support* (whether the
 * selected round's type is registered) is resolved ONCE at command-plan time and
 * frozen onto the selection/advance event, so replay needs no registry and stays
 * deterministic — see ADR-003.
 */

export const EVENT_TYPES = [
  'SESSION_INITIALIZED',
  'PUBLIC_STATUS_SET',
  'SEQUENCE_ADVANCED',
  'WAITING_MARKED',
  'HOST_NOTE_SET',
  'EVENT_UNDONE',
  'GAME_INITIALIZED',
  'CURRENT_ROUND_SELECTED',
  'ROUND_ADVANCED',
  'GAME_SESSION_ENDED',
  'CATEGORY_BOARD_TILE_SELECTED',
  'CATEGORY_BOARD_PROMPT_REVEALED',
  'CATEGORY_BOARD_ANSWER_REVEALED',
  'CATEGORY_BOARD_RETURNED',
] as const

export type EventType = (typeof EVENT_TYPES)[number]

interface EventBase<T extends EventType> {
  /** Deterministic id: `evt-<seq>` where seq is the append index. */
  readonly id: string
  readonly type: T
  /** Monotonic append index (0-based), also used for audit ordering. */
  readonly seq: number
  /** Copied from the originating command's `issuedAt`; never re-derived. */
  readonly occurredAt: number
  /** Whether an UNDO may target this event. */
  readonly reversible: boolean
}

export interface SessionInitializedEvent extends EventBase<'SESSION_INITIALIZED'> {
  readonly reversible: false
  readonly sessionId: string
}

export interface PublicStatusSetEvent extends EventBase<'PUBLIC_STATUS_SET'> {
  readonly reversible: true
  readonly code: PublicStatusCode
}

export interface SequenceAdvancedEvent extends EventBase<'SEQUENCE_ADVANCED'> {
  readonly reversible: true
}

export interface WaitingMarkedEvent extends EventBase<'WAITING_MARKED'> {
  readonly reversible: true
}

export interface HostNoteSetEvent extends EventBase<'HOST_NOTE_SET'> {
  readonly reversible: true
  readonly note: string
}

/** Records that a prior reversible event was undone. Auditable; irreversible. */
export interface EventUndoneEvent extends EventBase<'EVENT_UNDONE'> {
  readonly reversible: false
  readonly targetEventId: string
}

/** Whether a selected round's type is registered/supported by the engine. */
export type RoundSupport = 'supported' | 'unsupported'

/** A trusted game definition was loaded into the session. Irreversible baseline. */
export interface GameInitializedEvent extends EventBase<'GAME_INITIALIZED'> {
  readonly reversible: false
  readonly definition: GameDefinition
}

/**
 * The current round was selected by stable identity. Carries the resolved
 * ordinal index and the round's support, both frozen at plan time so replay is
 * deterministic without consulting the registry.
 */
export interface CurrentRoundSelectedEvent extends EventBase<'CURRENT_ROUND_SELECTED'> {
  readonly reversible: true
  readonly roundIndex: number
  readonly roundId: string
  readonly support: RoundSupport
}

/** The current round advanced to the next round in definition order. */
export interface RoundAdvancedEvent extends EventBase<'ROUND_ADVANCED'> {
  readonly reversible: true
  readonly roundIndex: number
  readonly roundId: string
  readonly support: RoundSupport
}

/** The game session was ended. Irreversible finalization. */
export interface GameSessionEndedEvent extends EventBase<'GAME_SESSION_ENDED'> {
  readonly reversible: false
}

/**
 * Category-board gameplay events (Slice 5).
 *
 * Each one carries the `roundId` it applies to, resolved at plan time, so replay
 * never has to ask "which round was current back then". All four are REVERSIBLE:
 * a misclick during a lesson must be undoable, and undoing the answer reveal is
 * precisely what returns a tile to the board (see `CategoryBoardAnswerRevealedEvent`).
 *
 * `CATEGORY_BOARD_TILE_SELECTED` and `CATEGORY_BOARD_ANSWER_REVEALED` also carry
 * the `tileId`, frozen at plan time, so applying them needs neither the registry
 * nor a board lookup — replay stays deterministic from the log alone.
 */
interface CategoryBoardEventBase<T extends EventType> extends EventBase<T> {
  readonly reversible: true
  readonly roundId: string
}

/** A tile was chosen for host preview. It is NOT yet used and NOT yet public. */
export interface CategoryBoardTileSelectedEvent
  extends CategoryBoardEventBase<'CATEGORY_BOARD_TILE_SELECTED'> {
  readonly tileId: string
}

/** The selected tile's prompt became public. */
export type CategoryBoardPromptRevealedEvent =
  CategoryBoardEventBase<'CATEGORY_BOARD_PROMPT_REVEALED'>

/**
 * The selected tile's answer became public. This is the ONE event that marks a
 * tile used, so undoing it deterministically returns the tile to the board.
 */
export interface CategoryBoardAnswerRevealedEvent
  extends CategoryBoardEventBase<'CATEGORY_BOARD_ANSWER_REVEALED'> {
  readonly tileId: string
}

/** The round returned to the board grid; the selection was cleared. */
export type CategoryBoardReturnedEvent =
  CategoryBoardEventBase<'CATEGORY_BOARD_RETURNED'>

export type SessionEvent =
  | SessionInitializedEvent
  | PublicStatusSetEvent
  | SequenceAdvancedEvent
  | WaitingMarkedEvent
  | HostNoteSetEvent
  | EventUndoneEvent
  | GameInitializedEvent
  | CurrentRoundSelectedEvent
  | RoundAdvancedEvent
  | GameSessionEndedEvent
  | CategoryBoardTileSelectedEvent
  | CategoryBoardPromptRevealedEvent
  | CategoryBoardAnswerRevealedEvent
  | CategoryBoardReturnedEvent
