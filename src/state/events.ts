import type { PublicStatusCode } from './status'
import type { GameDefinition } from '../game/gameDefinition'
import type { ScoreAdjustmentMode, ScoreSource } from '../game/teams/scoring'
import type { ResponseInterruptionSource } from '../game/timing/responsePhase'
import type { ActiveResponseResolution } from '../game/timing/buzzQueue'

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
  'TEAM_SCORE_ADJUSTED',
  'RESPONSE_PHASE_ARMED',
  'RESPONSE_PHASE_DISARMED',
  'RESPONSE_TIMER_STARTED',
  'RESPONSE_TIMER_PAUSED',
  'RESPONSE_TIMER_RESUMED',
  'RESPONSE_TIMER_INTERRUPTED',
  'RESPONSE_TIMER_EXPIRED',
  'RESPONSE_PHASE_RESET',
  'TEAM_BUZZED',
  'ACTIVE_RESPONSE_RESOLVED',
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

/**
 * One team's score changed (Slice 6) — the whole score audit trail.
 *
 * ## Provenance is durable
 *
 * The event answers, months later and without any other record: which team, by
 * how much, what the teacher meant (`mode`), and where the number came from
 * (`source` — the exact round and tile, or explicitly nothing). That is why the
 * payload is not just a signed integer.
 *
 * ## The resulting total is deliberately NOT stored
 *
 * A running total frozen onto the event would be a lie the moment an EARLIER
 * adjustment is undone: the stored number would describe a history that no longer
 * applies. Scores are therefore always derived by summing the effective events in
 * order, and the event carries only the delta plus enough context to explain it.
 * This is the same rule that makes used tiles exact (ADR-005 §9): one source of
 * truth, no cache to drift.
 *
 * ## Independent of the reveal events
 *
 * A score adjustment is its own reversible fact. Undoing it does not un-reveal an
 * answer and does not put a tile back on the board; undoing an answer reveal does
 * not remove it. The two are causally related only through the teacher's
 * intention, and the log records exactly that — see ADR-006 §9.
 */
export interface TeamScoreAdjustedEvent extends EventBase<'TEAM_SCORE_ADJUSTED'> {
  readonly reversible: true
  /** The team whose score changed, by stable id. */
  readonly teamId: string
  /** The signed integer amount applied. Never zero. */
  readonly delta: number
  /** What the adjustment meant, as a typed reason code. */
  readonly mode: ScoreAdjustmentMode
  /** Where the amount came from, resolved and frozen at plan time. */
  readonly source: ScoreSource
}

/**
 * Response-phase events (Slice 7) — arming, the timer, and its transitions.
 *
 * ## Facts, never ticks
 *
 * The log records that a timer STARTED with a stated duration and deadline, that
 * it was paused with a stated amount left, that it was resumed, that it was
 * interrupted, or that it expired. It never records a per-second or per-frame
 * remaining value: "seconds left" is not a fact, it is a rendering of one, and a
 * tick stream would make the history unbounded and the sync channel a frame
 * transport (`ROADMAP-AMENDMENT-001` §5.2–§5.3).
 *
 * Every timestamp on these events is copied from the originating command's
 * `issuedAt` — the reducer still never reads a clock — so replaying a stored
 * history reproduces the timer state exactly, however much later it happens.
 *
 * ## All reversible
 *
 * A mis-clicked start, a premature stop and an expiry a teacher wants to take
 * back are all ordinary classroom mistakes, so all eight are reversible. Undo is
 * exact for free: state is replayed, so an undone start simply is not applied and
 * the phase returns to the state that preceded it.
 */
interface ResponsePhaseEventBase<T extends EventType> extends EventBase<T> {
  readonly reversible: true
  readonly roundId: string
}

/** The clue was armed: a future interrupting input would be accepted. */
export type ResponsePhaseArmedEvent = ResponsePhaseEventBase<'RESPONSE_PHASE_ARMED'>

/** The clue was disarmed. */
export type ResponsePhaseDisarmedEvent = ResponsePhaseEventBase<'RESPONSE_PHASE_DISARMED'>

/**
 * A response countdown began.
 *
 * It carries the whole durable description of the countdown: a stable identity,
 * the duration that was chosen, the instant it started, and the absolute instant
 * it ends. The deadline is stored rather than re-derived so that a replay, the
 * projector and a timeout callback can never compute three slightly different
 * ends from the same start.
 */
export interface ResponseTimerStartedEvent
  extends ResponsePhaseEventBase<'RESPONSE_TIMER_STARTED'> {
  /** Stable identity for this countdown, kept across a pause and resume. */
  readonly timerId: string
  readonly durationMs: number
  readonly startedAt: number
  readonly deadline: number
}

/** The countdown was frozen; `remainingMs` is the durable fact it froze at. */
export interface ResponseTimerPausedEvent
  extends ResponsePhaseEventBase<'RESPONSE_TIMER_PAUSED'> {
  readonly timerId: string
  readonly remainingMs: number
}

/** The countdown resumed with a NEW deadline derived at the dispatch edge. */
export interface ResponseTimerResumedEvent
  extends ResponsePhaseEventBase<'RESPONSE_TIMER_RESUMED'> {
  readonly timerId: string
  readonly resumedAt: number
  readonly deadline: number
}

/**
 * The countdown was stopped early, with a TYPED source.
 *
 * This is the interruption seam. Interruption records that the window ended
 * before its deadline and how much was left; it deliberately does not decide what
 * happens next, because a later slice must be able to promote another team into a
 * fresh window without redesigning this event.
 */
export interface ResponseTimerInterruptedEvent
  extends ResponsePhaseEventBase<'RESPONSE_TIMER_INTERRUPTED'> {
  readonly timerId: string
  /** Why it stopped. Bounded and typed — never a free-form string. */
  readonly source: ResponseInterruptionSource
  /** How much of the window was left, frozen at the moment of the interruption. */
  readonly remainingMs: number
}

/**
 * The countdown reached its deadline. The ONE authoritative expiry fact.
 *
 * At most one of these can be effective for a given countdown: the planner
 * accepts it only while that exact timer is `running`, and applying it moves the
 * timer to `expired`, so a repeated or late callback is rejected rather than
 * appending a second identical fact. It awards and deducts nothing.
 */
export interface ResponseTimerExpiredEvent
  extends ResponsePhaseEventBase<'RESPONSE_TIMER_EXPIRED'> {
  readonly timerId: string
  readonly deadline: number
}

/** The phase was cleared back to disarmed, no timer and no queue, without leaving the clue. */
export type ResponsePhaseResetEvent = ResponsePhaseEventBase<'RESPONSE_PHASE_RESET'>

/**
 * Buzz-queue events (Slice 8) — the durable record of who claimed a clue, in what
 * order, and how each turn ended.
 *
 * ## Game facts, never input facts
 *
 * `TEAM_BUZZED` records that **a team buzzed**. It deliberately does NOT record
 * which key was pressed, which device produced it, which adapter was in use, or
 * what the mapping said, because none of those is a fact about the game — they
 * are facts about one teacher's laptop, and `ROADMAP-AMENDMENT-001` §5.6 keeps
 * them host-private. A history exported, replayed or read a year later answers
 * "who buzzed first on the tectonics clue", which is the question that matters,
 * and it answers it identically whether the press came from a keyboard, a gamepad
 * (Slice 9) or a Sony Buzz! handset (Slice 10).
 *
 * A bounded `source: 'keyboard'` field was considered and rejected: no consumer
 * in this slice needs it, ADR-004's "never a speculative entry" rule applies, and
 * a field nobody reads is a field that acquires meaning by accident. Slice 9 may
 * add it *with* its consumer.
 *
 * ## Order comes from `seq`, not from the clock
 *
 * There is no position, index or rank on the event. Queue order IS the order
 * these events appear in the log, so it cannot disagree with the log, cannot be
 * re-derived differently by two readers, and survives undo exactly. `occurredAt`
 * is the arrival stamp the command carried; it is EVIDENCE, never the tiebreaker,
 * and it is never presented as a reaction time.
 *
 * ## Both reversible
 *
 * A mis-press, a teacher who meant to press the other button, a promotion made
 * one team too early: all ordinary classroom mistakes, all undoable. Undo is
 * exact for free because the queue is replayed, not cached.
 */

/**
 * A team was accepted into the ordered queue for the live clue.
 *
 * Carries `tileId`, resolved at plan time, so replay never has to ask which clue
 * was open — the same technique the board events use.
 */
export interface TeamBuzzedEvent extends ResponsePhaseEventBase<'TEAM_BUZZED'> {
  /** The clue this buzz was for. */
  readonly tileId: string
  /** The team that buzzed, by stable authored id. */
  readonly teamId: string
}

/**
 * The active team's turn ended and the next queued team was promoted (OG-3).
 *
 * It names the team whose turn ended — resolved at plan time from the queue, not
 * taken from the command — so the log reads as a sequence of statements about
 * specific teams rather than a sequence of anonymous pointer moves. It awards and
 * deducts nothing.
 */
export interface ActiveResponseResolvedEvent
  extends ResponsePhaseEventBase<'ACTIVE_RESPONSE_RESOLVED'> {
  /** The clue this resolution was for. */
  readonly tileId: string
  /** The team whose turn ended. Frozen at plan time from the live queue. */
  readonly teamId: string
  /** Why it ended: judged incorrect, or passed by the host. Scores nothing. */
  readonly resolution: ActiveResponseResolution
}

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
  | TeamScoreAdjustedEvent
  | ResponsePhaseArmedEvent
  | ResponsePhaseDisarmedEvent
  | ResponseTimerStartedEvent
  | ResponseTimerPausedEvent
  | ResponseTimerResumedEvent
  | ResponseTimerInterruptedEvent
  | ResponseTimerExpiredEvent
  | ResponsePhaseResetEvent
  | TeamBuzzedEvent
  | ActiveResponseResolvedEvent
