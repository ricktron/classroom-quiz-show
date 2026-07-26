import type { PublicStatusCode } from './status'
import type { GameDefinition } from '../game/gameDefinition'
import type { ScoreAdjustmentMode, ScoreSource } from '../game/teams/scoring'

/**
 * COMMANDS express *intent* — a request to change state that the reducer may
 * accept or reject. They are distinct from events (accepted facts): a command
 * is "please do X", an event is "X happened". A rejected command produces no
 * events and never mutates state.
 *
 * The foundation vocabulary is deliberately small. There are NO gameplay
 * commands (no tile selection, answer reveal, team assignment, scoring, timers,
 * or wagers) — those belong to later slices. Slice 3 adds only the round-level
 * lifecycle commands needed to prove the game/round model + registry:
 * `INITIALIZE_GAME`, `SELECT_ROUND`, `ADVANCE_TO_NEXT_ROUND`, `END_GAME_SESSION`.
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
