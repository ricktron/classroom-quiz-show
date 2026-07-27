import type { PublicStatusCode } from './status'
import type { GameDefinition } from '../game/gameDefinition'
import type { ScoreAdjustmentMode, ScoreSource } from '../game/teams/scoring'
import type { ResponseInterruptionSource } from '../game/timing/responsePhase'
import type { ActiveResponseResolution } from '../game/timing/buzzQueue'

/**
 * COMMANDS express *intent* — a request to change state that the reducer may
 * accept or reject. They are distinct from events (accepted facts): a command
 * is "please do X", an event is "X happened". A rejected command produces no
 * events and never mutates state.
 *
 * The foundation vocabulary started deliberately small and has grown one slice at
 * a time: Slice 3 added the round-level lifecycle (`INITIALIZE_GAME`,
 * `SELECT_ROUND`, `ADVANCE_TO_NEXT_ROUND`, `END_GAME_SESSION`), Slice 5 the board
 * reveals, Slice 6 the one scoring command, Slice 7 the response phase —
 * arming, the timer, and its transitions — and Slice 8 the buzz queue. There are
 * still no wager or persistence commands.
 *
 * Determinism note: every command carries `issuedAt` (a host-supplied wall-clock
 * stamp). The reducer copies it onto the resulting event and never reads the
 * clock itself, so replaying a stored history is fully deterministic.
 */

export const COMMAND_TYPES = [
  'INIT_SESSION',
  'SET_PUBLIC_STATUS',
  'ADVANCE_SEQUENCE',
  'MARK_WAITING',
  'SET_HOST_NOTE',
  'UNDO',
  'INITIALIZE_GAME',
  'SELECT_ROUND',
  'ADVANCE_TO_NEXT_ROUND',
  'END_GAME_SESSION',
  'SELECT_CATEGORY_BOARD_TILE',
  'REVEAL_CATEGORY_BOARD_PROMPT',
  'REVEAL_CATEGORY_BOARD_ANSWER',
  'RETURN_TO_CATEGORY_BOARD',
  'ADJUST_TEAM_SCORE',
  'ARM_RESPONSE_PHASE',
  'DISARM_RESPONSE_PHASE',
  'START_RESPONSE_TIMER',
  'PAUSE_RESPONSE_TIMER',
  'RESUME_RESPONSE_TIMER',
  'INTERRUPT_RESPONSE_TIMER',
  'EXPIRE_RESPONSE_TIMER',
  'RESET_RESPONSE_PHASE',
  'RECORD_TEAM_BUZZ',
  'RESOLVE_ACTIVE_RESPONSE',
] as const

export type CommandType = (typeof COMMAND_TYPES)[number]

interface CommandBase<T extends CommandType> {
  readonly type: T
  /** Host-supplied timestamp (ms). Copied onto the event; never re-derived. */
  readonly issuedAt: number
}

/** Initialize or reset the session shell to a fresh baseline (irreversible). */
export interface InitSessionCommand extends CommandBase<'INIT_SESSION'> {
  /** Caller-supplied id so the reducer stays pure (no id generation inside). */
  readonly sessionId: string
}

/** Update the bounded, projector-safe public status. */
export interface SetPublicStatusCommand extends CommandBase<'SET_PUBLIC_STATUS'> {
  readonly code: PublicStatusCode
}

/** Advance the internal sequence/version counter. */
export type AdvanceSequenceCommand = CommandBase<'ADVANCE_SEQUENCE'>

/** Record an explicit no-game / waiting state. */
export type MarkWaitingCommand = CommandBase<'MARK_WAITING'>

/** Set the private, host-only note (never projected). */
export interface SetHostNoteCommand extends CommandBase<'SET_HOST_NOTE'> {
  readonly note: string
}

/** Undo the latest reversible, not-yet-undone event. */
export type UndoCommand = CommandBase<'UNDO'>

/**
 * Load a trusted in-memory `GameDefinition` into the current session, replacing
 * any previously loaded game (irreversible baseline). Requires an initialized
 * session shell.
 */
export interface InitializeGameCommand extends CommandBase<'INITIALIZE_GAME'> {
  readonly definition: GameDefinition
}

/** Select the current round by its stable `RoundId` (reversible). */
export interface SelectRoundCommand extends CommandBase<'SELECT_ROUND'> {
  readonly roundId: string
}

/** Advance the current round to the next one in definition order (reversible). */
export type AdvanceToNextRoundCommand = CommandBase<'ADVANCE_TO_NEXT_ROUND'>

/** End the current game session (irreversible finalization). */
export type EndGameSessionCommand = CommandBase<'END_GAME_SESSION'>

/**
 * Category-board gameplay commands (Slice 5) — the first PLAYABLE vocabulary.
 *
 * Every one of them carries the `roundId` it believes it is acting on. That is
 * deliberate: a host control rendered for one round must not be able to act on a
 * different round after the host has moved on. The planner rejects any command
 * whose `roundId` is not the current round, so a stale control is inert rather
 * than dangerous.
 *
 * These commands reveal content and track used tiles. They never move a point:
 * scoring is the separate `ADJUST_TEAM_SCORE` command below, so revealing an
 * answer and awarding credit stay two deliberate teacher actions.
 */
interface CategoryBoardCommandBase<T extends CommandType> extends CommandBase<T> {
  /** The round this command targets. Must equal the current round. */
  readonly roundId: string
}

/** Choose a tile for private host preview. Does NOT reveal or consume it. */
export interface SelectCategoryBoardTileCommand
  extends CategoryBoardCommandBase<'SELECT_CATEGORY_BOARD_TILE'> {
  readonly tileId: string
}

/** Publish the selected tile's prompt to the display. */
export type RevealCategoryBoardPromptCommand =
  CategoryBoardCommandBase<'REVEAL_CATEGORY_BOARD_PROMPT'>

/** Publish the selected tile's answer. Also marks the tile used. */
export type RevealCategoryBoardAnswerCommand =
  CategoryBoardCommandBase<'REVEAL_CATEGORY_BOARD_ANSWER'>

/** Clear the selection and return the display to the board grid. */
export type ReturnToCategoryBoardCommand =
  CategoryBoardCommandBase<'RETURN_TO_CATEGORY_BOARD'>

/**
 * Adjust one team's score (Slice 6) — the ONE scoring command.
 *
 * It is deliberately a single command rather than four (`AWARD_FULL`,
 * `DEDUCT_FULL`, …), because those would differ only in how the amount is
 * derived, and every one of them would still need the same team check, the same
 * bounds check, and the same provenance. Instead the amount is explicit and the
 * `mode` + `source` record WHAT the teacher did and WHERE the number came from —
 * so the event log stays explainable rather than being a stream of bare integers.
 *
 * The planner does not trust any of it: the team must exist, the amount must be a
 * bounded non-zero integer, the resulting score must stay in range, and for a
 * tile-sourced mode the amount must MATCH the selected tile's effective value
 * (exactly, or exactly negated, or within it for partial credit). The UI is a
 * convenience, never the authority.
 *
 * There is deliberately NO command for choosing the scoring target: the selected
 * team is private host UI state, it awards nothing, and putting it in the event
 * log would pad history with selections and make "undo" ambiguous. See ADR-006 §7.
 */
export interface AdjustTeamScoreCommand extends CommandBase<'ADJUST_TEAM_SCORE'> {
  /** The team whose score changes. Must be a team of the loaded game. */
  readonly teamId: string
  /** Signed, non-zero, bounded integer amount. Never a fraction. */
  readonly delta: number
  /** Typed reason code — what this adjustment means. */
  readonly mode: ScoreAdjustmentMode
  /** Where the amount came from (a specific board tile, or nothing). */
  readonly source: ScoreSource
}

/**
 * Response-phase commands (Slice 7) — arming, the timer, and transitions.
 *
 * Every one carries the `roundId` it believes it is acting on, exactly like the
 * board commands, so a control rendered for one round cannot act on another after
 * the host has moved on. They are legal ONLY while that round's clue is at the
 * `prompt` stage: before the prompt is public there is nothing to respond to, and
 * once the answer is public the response opportunity is over.
 *
 * None of them scores. Expiry awards and deducts nothing — a timer running out is
 * a fact about the window, not a decision about points, and the teacher makes the
 * scoring decision separately (ADR-006 §9, ADR-007 §14). Slice 8's two buzz
 * commands keep that rule exactly: buzzing scores nothing and a promotion scores
 * nothing.
 */
interface ResponsePhaseCommandBase<T extends CommandType> extends CommandBase<T> {
  /** The round this command targets. Must equal the current round. */
  readonly roundId: string
}

/** Accept a future interrupting input for the live clue. Manual, host-controlled. */
export type ArmResponsePhaseCommand = ResponsePhaseCommandBase<'ARM_RESPONSE_PHASE'>

/** Stop accepting a future interrupting input for the live clue. */
export type DisarmResponsePhaseCommand = ResponsePhaseCommandBase<'DISARM_RESPONSE_PHASE'>

/**
 * Start the response countdown.
 *
 * `durationSeconds` is optional: omitted, the planner uses the game's AUTHORED
 * default (`GameDefinition.timer.responseSeconds`). Supplied, it is validated
 * against the same bounds the authored value is — the host may choose a different
 * window for one clue, but it can never choose an unbounded one.
 */
export interface StartResponseTimerCommand
  extends ResponsePhaseCommandBase<'START_RESPONSE_TIMER'> {
  readonly durationSeconds?: number
}

/** Freeze the countdown, recording how much was left as a durable fact. */
export type PauseResponseTimerCommand = ResponsePhaseCommandBase<'PAUSE_RESPONSE_TIMER'>

/** Resume a paused countdown, deriving a fresh deadline from the dispatch clock. */
export type ResumeResponseTimerCommand = ResponsePhaseCommandBase<'RESUME_RESPONSE_TIMER'>

/**
 * Stop a live countdown early, naming a TYPED source.
 *
 * The source is the seam a future buzz-in passes through
 * (`ROADMAP-AMENDMENT-001` §5.4). Today the only member is `{ kind: 'host' }`;
 * anything else is rejected at this boundary rather than stored.
 */
export interface InterruptResponseTimerCommand
  extends ResponsePhaseCommandBase<'INTERRUPT_RESPONSE_TIMER'> {
  readonly source: ResponseInterruptionSource
}

/**
 * Record that the countdown reached its deadline.
 *
 * This is the ONE way an expiry becomes a fact, and it carries the evidence the
 * planner needs to refuse a stale one: the identity of the timer the caller
 * believes is live and the exact deadline it believes it is expiring. A timeout
 * callback left over from a timer that was reset, restarted, paused, undone or
 * left behind by a clue change matches neither, so it is rejected and changes
 * nothing. Only the HOST may dispatch it — a display never expires a timer.
 */
export interface ExpireResponseTimerCommand
  extends ResponsePhaseCommandBase<'EXPIRE_RESPONSE_TIMER'> {
  /** The timer the caller believes is live. */
  readonly timerId: string
  /** The absolute deadline the caller believes it is expiring. */
  readonly deadline: number
}

/** Clear arming, the timer AND the queue for the live clue, back to the initial phase. */
export type ResetResponsePhaseCommand = ResponsePhaseCommandBase<'RESET_RESPONSE_PHASE'>

/**
 * Buzz-queue commands (Slice 8) — the first commands with an INPUT-ADAPTER
 * origin, and the implementation of owner decisions OG-2 and OG-3.
 *
 * ## What crosses the boundary
 *
 * A buzz command carries a TEAM and a response-opportunity identity, and nothing
 * else. No key code, no device, no button index, no vendor id, no mapping table
 * and no browser event: those are host-private by `ROADMAP-AMENDMENT-001` §5.6
 * and stop at `src/input/`. The adapter maps a physical press to a logical action
 * and a team; the planner then re-validates the team against the loaded game,
 * exactly as the scoring panel is never trusted for an amount (ADR-006).
 *
 * ## Response-opportunity identity
 *
 * Both commands carry `roundId` AND `tileId` — the clue they believe they are
 * acting on. That pair is the smallest stable identifier that already exists, and
 * it is the same technique the timer uses with `timerId` (ADR-007 §6): a press
 * that lands after the host moved to another clue names the previous tile, fails
 * the match, and appends nothing. No new identity had to be invented.
 *
 * ## Neither one scores
 *
 * A buzz moves no points. A promotion moves no points, and `incorrect`
 * deliberately does not deduct — inventing an automatic penalty would break
 * ADR-006 §9's reveal/score independence and take a judgement out of the
 * teacher's hands. Scoring stays the separate `ADJUST_TEAM_SCORE` command, and it
 * stays available for every team (OG-6 remains deferred).
 */

/**
 * Record that a team buzzed for the live clue.
 *
 * Accepted only while the response phase is ARMED (OG-1's manual arming is the
 * intake gate), the clue is at the `prompt` stage, the team exists in the loaded
 * game, and the team has not already buzzed for this response opportunity.
 *
 * When it is the FIRST accepted buzz of a live countdown it also stops the clock,
 * through Slice 7's typed interruption seam rather than through anything
 * buzz-specific — see `planCommand`.
 */
export interface RecordTeamBuzzCommand extends ResponsePhaseCommandBase<'RECORD_TEAM_BUZZ'> {
  /** The clue this buzz is for. Must be the tile currently at the `prompt` stage. */
  readonly tileId: string
  /** The team that buzzed. Must be a team of the loaded game. */
  readonly teamId: string
}

/**
 * End the active team's turn and promote the next queued team (OG-3).
 *
 * ONE command for both host intents rather than two near-identical ones, because
 * they perform the identical transition and differ only in what the teacher meant
 * — the same reasoning that made `ADJUST_TEAM_SCORE` one command with a typed
 * `mode` (ADR-006 §7). One click is one command is one event is one promotion:
 * there is no multi-step state manipulation for a host to get wrong mid-lesson.
 *
 * If the queue empties, the state says so explicitly (`exhausted`) rather than
 * looking like nobody ever buzzed.
 */
export interface ResolveActiveResponseCommand
  extends ResponsePhaseCommandBase<'RESOLVE_ACTIVE_RESPONSE'> {
  /** The clue this resolution is for. Must be the tile at the `prompt` stage. */
  readonly tileId: string
  /** Why the active team's turn ended. Bounded and typed — never a free string. */
  readonly resolution: ActiveResponseResolution
}

export type SessionCommand =
  | InitSessionCommand
  | SetPublicStatusCommand
  | AdvanceSequenceCommand
  | MarkWaitingCommand
  | SetHostNoteCommand
  | UndoCommand
  | InitializeGameCommand
  | SelectRoundCommand
  | AdvanceToNextRoundCommand
  | EndGameSessionCommand
  | SelectCategoryBoardTileCommand
  | RevealCategoryBoardPromptCommand
  | RevealCategoryBoardAnswerCommand
  | ReturnToCategoryBoardCommand
  | AdjustTeamScoreCommand
  | ArmResponsePhaseCommand
  | DisarmResponsePhaseCommand
  | StartResponseTimerCommand
  | PauseResponseTimerCommand
  | ResumeResponseTimerCommand
  | InterruptResponseTimerCommand
  | ExpireResponseTimerCommand
  | ResetResponsePhaseCommand
  | RecordTeamBuzzCommand
  | ResolveActiveResponseCommand
