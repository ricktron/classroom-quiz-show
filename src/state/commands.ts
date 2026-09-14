import type { PublicStatusCode } from './status'
import type { GameDefinition } from '../game/gameDefinition'
import type { ScoreAdjustmentMode, ScoreSource } from '../game/teams/scoring'
import type { ResponseInterruptionSource } from '../game/timing/responsePhase'
import type { ActiveResponseResolution } from '../game/timing/buzzQueue'
import type { FinalEligibilityMode } from '../game/finalWager/eligibility'
import type {
  FinalOutcome,
  FinalResponseCaptureMode,
  FinalResponseState,
} from '../game/finalWager/finalState'

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
 * arming, the timer, and its transitions — Slice 8 the buzz queue, and Slice 14
 * the Final Wager round.
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
  'SET_SESSION_TEAM_NAME',
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
  'BEGIN_FINAL_WAGER',
  'START_FINAL_WAGER_WINDOW',
  'PAUSE_FINAL_WAGER_WINDOW',
  'RESUME_FINAL_WAGER_WINDOW',
  'EXPIRE_FINAL_WAGER_WINDOW',
  'RECORD_FINAL_WAGER',
  'LOCK_FINAL_WAGERS',
  'START_FINAL_RESPONSE_WINDOW',
  'PAUSE_FINAL_RESPONSE_WINDOW',
  'RESUME_FINAL_RESPONSE_WINDOW',
  'EXPIRE_FINAL_RESPONSE_WINDOW',
  'RECORD_FINAL_RESPONSE',
  'LOCK_FINAL_RESPONSES',
  'REVEAL_FINAL_ANSWER',
  'REVEAL_FINAL_TEAM',
  'SETTLE_FINAL_TEAM',
  'ENTER_FINAL_SUDDEN_DEATH',
  'ACCEPT_FINAL_TIED_FINISH',
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
/**
 * Assign or clear a Session-owned classroom team identity (S04B).
 *
 * `name` is the selected/manual identity. `null` clears it so the authored Game
 * name remains a display fallback only. This never writes back into the reusable
 * Game definition.
 */
export interface SetSessionTeamNameCommand extends CommandBase<'SET_SESSION_TEAM_NAME'> {
  readonly teamId: string
  readonly name: string | null
}

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

/**
 * Final Wager commands (Slice 14) — the second playable round type's vocabulary.
 *
 * Every one carries the `roundId` it believes it is acting on, exactly like the
 * board and response-phase commands, so a control rendered for one round cannot
 * act on another after the host has moved on. They are legal only while that
 * round is the CURRENT round, the game is active, and the Final is in the phase
 * that particular command belongs to.
 *
 * ## Nothing happens by itself
 *
 * Every transition below is an explicit host action. No command locks wagers on
 * a timer, marks a silent team as a no-response, reveals a prompt or an answer,
 * adjudicates anything, settles a score, chooses a tie outcome, or ends the game.
 * A window expiring records only that the window expired (CQS-OD-007 and
 * ADR-007's discipline, unchanged).
 *
 * ## Corrections append, they never rewrite
 *
 * {@link RecordFinalWagerCommand} and {@link RecordFinalResponseCommand} are
 * used for both the first entry and every correction. A correction is a NEW
 * event; the earlier one stays in the log and stays true about what the host
 * originally entered. Latest-only undo is unchanged — there is no targeted undo.
 */
interface FinalWagerCommandBase<T extends CommandType> extends CommandBase<T> {
  /** The Final round this command targets. Must equal the current round. */
  readonly roundId: string
}

/**
 * Begin Final, freezing eligibility, pre-final scores, wager caps and the default
 * reveal order (CQS-OD-005).
 *
 * The host chooses only the MODE. Everything derived from it — who is eligible,
 * what each team may risk, who is revealed first — is resolved from the trusted
 * definition and the replayed scores at plan time and frozen onto the event, so
 * replay reproduces it without recomputation and none of it can drift once the
 * first settlement lands.
 */
export interface BeginFinalWagerCommand extends FinalWagerCommandBase<'BEGIN_FINAL_WAGER'> {
  readonly mode: FinalEligibilityMode
}

/**
 * Start the wager window.
 *
 * `durationSeconds` is optional: omitted, the planner uses the game's AUTHORED
 * default (`GameDefinition.timer.responseSeconds`). Supplied, it is validated
 * against exactly the same 5–600 second bounds, so the host may choose a
 * different window but can never choose an unbounded one.
 */
export interface StartFinalWagerWindowCommand
  extends FinalWagerCommandBase<'START_FINAL_WAGER_WINDOW'> {
  readonly durationSeconds?: number
}

/** Freeze the wager countdown, recording how much was left as a durable fact. */
export type PauseFinalWagerWindowCommand =
  FinalWagerCommandBase<'PAUSE_FINAL_WAGER_WINDOW'>

/** Resume a paused wager countdown, deriving a fresh deadline at the dispatch edge. */
export type ResumeFinalWagerWindowCommand =
  FinalWagerCommandBase<'RESUME_FINAL_WAGER_WINDOW'>

/**
 * Record that the wager countdown reached its deadline. Carries the timer
 * identity and the exact deadline, so a stale callback appends nothing — the same
 * three-way match `EXPIRE_RESPONSE_TIMER` uses (ADR-007 §6). It locks nothing.
 */
export interface ExpireFinalWagerWindowCommand
  extends FinalWagerCommandBase<'EXPIRE_FINAL_WAGER_WINDOW'> {
  readonly timerId: string
  readonly deadline: number
}

/**
 * Commit (or correct) one team's wager. Host-private: no wager value or per-team
 * completion is public before that team's reveal.
 *
 * Zero is a legal, explicit wager. Anything else outside `0 … maxWager` — a
 * negative, a fraction, a non-finite value, an over-cap amount — is REJECTED and
 * mutates nothing. Nothing is clamped, coerced, rounded or repaired.
 */
export interface RecordFinalWagerCommand extends FinalWagerCommandBase<'RECORD_FINAL_WAGER'> {
  readonly teamId: string
  readonly wager: number
}

/** Close wager entry. Refused until EVERY eligible team has an explicit wager. */
export type LockFinalWagersCommand = FinalWagerCommandBase<'LOCK_FINAL_WAGERS'>

/**
 * Open response entry — the explicit host action that makes the Final prompt
 * PUBLIC, and the one place the capture mode is chosen (CQS-OD-007).
 *
 * The two are one command because they are one teacher decision: "here is the
 * question, and here is how I am going to record what comes back". Splitting them
 * would allow a Final whose prompt is public but whose capture mode is undecided.
 */
export interface StartFinalResponseWindowCommand
  extends FinalWagerCommandBase<'START_FINAL_RESPONSE_WINDOW'> {
  readonly captureMode: FinalResponseCaptureMode
  readonly durationSeconds?: number
}

/** Freeze the response countdown. */
export type PauseFinalResponseWindowCommand =
  FinalWagerCommandBase<'PAUSE_FINAL_RESPONSE_WINDOW'>

/** Resume a paused response countdown. */
export type ResumeFinalResponseWindowCommand =
  FinalWagerCommandBase<'RESUME_FINAL_RESPONSE_WINDOW'>

/** Record that the response countdown reached its deadline. It marks nobody absent. */
export interface ExpireFinalResponseWindowCommand
  extends FinalWagerCommandBase<'EXPIRE_FINAL_RESPONSE_WINDOW'> {
  readonly timerId: string
  readonly deadline: number
}

/**
 * Commit (or correct) one team's response state. Host-private until that team's
 * reveal.
 *
 * Whitespace-only exact text is rejected: a host who has nothing to type must say
 * `not-captured` or `no-response`, so the log never conflates "did not answer"
 * with "answered and nobody wrote it down".
 */
export interface RecordFinalResponseCommand
  extends FinalWagerCommandBase<'RECORD_FINAL_RESPONSE'> {
  readonly teamId: string
  readonly response: FinalResponseState
}

/** Close response entry. Refused until EVERY eligible team has an explicit state. */
export type LockFinalResponsesCommand = FinalWagerCommandBase<'LOCK_FINAL_RESPONSES'>

/** Publish the canonical Final answer. Explicit — it never follows from a lock. */
export type RevealFinalAnswerCommand = FinalWagerCommandBase<'REVEAL_FINAL_ANSWER'>

/**
 * Reveal one team's wager and response (CQS-OD-008).
 *
 * `teamId` is required rather than implied, so the log records the team the host
 * ACTUALLY chose — whether that was the next team in the default low-to-high
 * order or a deliberate alternate. One team is revealed at a time; the previous
 * one must already be settled.
 */
export interface RevealFinalTeamCommand extends FinalWagerCommandBase<'REVEAL_FINAL_TEAM'> {
  readonly teamId: string
}

/**
 * Adjudicate and settle the revealed team, atomically.
 *
 * The command carries only the OUTCOME. The wager and the signed delta are
 * resolved from the frozen state by the planner, so a settlement can never claim
 * an amount the team did not commit — the same rule that stops a "full credit"
 * score event carrying an arbitrary number (ADR-006).
 */
export interface SettleFinalTeamCommand extends FinalWagerCommandBase<'SETTLE_FINAL_TEAM'> {
  readonly teamId: string
  readonly outcome: FinalOutcome
}

/**
 * Enter the bounded sudden-death state on a tied lead (CQS-OD-011).
 *
 * It keeps the game ACTIVE, names the tied leaders, and permits manual score
 * correction only for them. It brings no authored prompt collection, no
 * sudden-death engine and no new buzzer behaviour: the host conducts the tiebreak
 * out loud and records the result with the existing correction command.
 */
export type EnterFinalSuddenDeathCommand =
  FinalWagerCommandBase<'ENTER_FINAL_SUDDEN_DEATH'>

/**
 * Accept a tied finish (CQS-OD-011) — explicit, irreversible, and the end of the
 * game with the tie preserved.
 *
 * It is one command because it is one decision. The planner appends the
 * acceptance AND the existing `GAME_SESSION_ENDED` together, so completion goes
 * through the existing ended-game boundary rather than a Final-specific one.
 */
export type AcceptFinalTiedFinishCommand =
  FinalWagerCommandBase<'ACCEPT_FINAL_TIED_FINISH'>

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
  | SetSessionTeamNameCommand
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
  | BeginFinalWagerCommand
  | StartFinalWagerWindowCommand
  | PauseFinalWagerWindowCommand
  | ResumeFinalWagerWindowCommand
  | ExpireFinalWagerWindowCommand
  | RecordFinalWagerCommand
  | LockFinalWagersCommand
  | StartFinalResponseWindowCommand
  | PauseFinalResponseWindowCommand
  | ResumeFinalResponseWindowCommand
  | ExpireFinalResponseWindowCommand
  | RecordFinalResponseCommand
  | LockFinalResponsesCommand
  | RevealFinalAnswerCommand
  | RevealFinalTeamCommand
  | SettleFinalTeamCommand
  | EnterFinalSuddenDeathCommand
  | AcceptFinalTiedFinishCommand
