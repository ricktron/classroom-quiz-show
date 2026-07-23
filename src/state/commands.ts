import type { PublicStatusCode } from './status'
import type { GameDefinition } from '../game/gameDefinition'

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
