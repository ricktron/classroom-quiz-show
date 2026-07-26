import { deepFreeze } from './deepFreeze'
import { gameId, type GameId } from './ids'
import { isRoundDefinition, type RoundDefinition } from './roundDefinition'
import {
  NO_TEAMS,
  isTeamDefinitionList,
  type TeamDefinition,
} from './teams/definition'
import {
  createTimerConfig,
  isTimerConfig,
  type TimerConfig,
} from './timing/timerConfig'

/**
 * `GameDefinition` — reusable, authored game structure (Slice 3).
 *
 * A definition is immutable, portable **data**: a stable id, a model version, a
 * title, and an ORDERED collection of typed rounds. It is deliberately separate
 * from `GameSession` (runtime progress): a definition never holds a current
 * round, session id, or any mutable runtime state — see ADR-003 and
 * GAME-ENGINE-BOUNDARIES §2.
 *
 * Slice 3 uses trusted in-memory definitions created by application code or
 * tests via `createGameDefinition`. The canonical imported JSON format and the
 * Zod validation pipeline are Slice 4 — NOT here. This factory therefore trusts
 * its caller for content but still enforces the structural invariants the rest
 * of the engine relies on (non-empty id/title, valid rounds, unique round ids).
 */

/** In-memory model version for Slice 3 (distinct from the public wire version). */
export const GAME_DEFINITION_MODEL_VERSION = 1 as const

export interface GameDefinition {
  /** Model/schema version appropriate for in-memory Slice 3 use. */
  readonly modelVersion: number
  readonly id: GameId
  readonly title: string
  /** Ordered rounds. Array position IS the canonical round order. */
  readonly rounds: readonly RoundDefinition[]
  /**
   * Ordered teams (Slice 6). Array position IS the canonical display order, and
   * an EMPTY list is valid — that is a game with no teams, which is exactly the
   * Slice 5 board that scores nothing.
   *
   * Teams are authored CONTENT and live here, on the immutable definition. Their
   * SCORES are session state derived from the event log and deliberately do not
   * live here — see `PrivateGameState.teamScores` and
   * `src/game/teams/scoring.ts`.
   */
  readonly teams: readonly TeamDefinition[]
  /**
   * Authored timing configuration (Slice 7). ALWAYS present: a game that authors
   * no `timer` block gets {@link DEFAULT_TIMER_CONFIG} from the trusted
   * constructor, so no consumer has to handle "this game has no timer settings".
   *
   * Like `teams`, this is authored CONTENT. The running timer — its deadline, its
   * status, whether the clue is armed — is session state derived from the event
   * log and deliberately does not live here (see
   * `PrivateGameState.responsePhases` and `src/game/timing/responsePhase.ts`).
   */
  readonly timer: TimerConfig
}

/** Thrown by `createGameDefinition` when authored input violates an invariant. */
export class GameDefinitionError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'GameDefinitionError'
  }
}

export interface CreateGameDefinitionInput {
  readonly id: string
  readonly title: string
  readonly rounds: readonly RoundDefinition[]
  /**
   * Already-trusted teams from `createTeamDefinitions`. Omitted means "this game
   * has no teams" — a valid configuration, not a defect to repair.
   */
  readonly teams?: readonly TeamDefinition[]
  /**
   * Authored timer block, or omitted for "this game authored no timing" — which
   * yields the documented default rather than an error. Validated by the same
   * strict schema the import boundary uses.
   */
  readonly timer?: unknown
  readonly modelVersion?: number
}

/**
 * The trusted constructor for a `GameDefinition`. It validates structure,
 * enforces unique round ids, preserves the given round order, and DEEP-FREEZES
 * the result so it can never be mutated later (including through a session).
 *
 * An empty `rounds` array is explicitly allowed: it yields a valid game with no
 * selectable round (a session over it is immediately at end-of-round-list — see
 * `gameSession`/reducer). It is not an error.
 */
export function createGameDefinition(input: CreateGameDefinitionInput): GameDefinition {
  if (typeof input.id !== 'string' || input.id.length === 0) {
    throw new GameDefinitionError('game id must be a non-empty string')
  }
  if (typeof input.title !== 'string' || input.title.length === 0) {
    throw new GameDefinitionError('game title must be a non-empty string')
  }
  if (!Array.isArray(input.rounds)) {
    throw new GameDefinitionError('rounds must be an array')
  }

  const seenRoundIds = new Set<string>()
  for (const round of input.rounds) {
    if (!isRoundDefinition(round)) {
      throw new GameDefinitionError('every round must be a valid RoundDefinition')
    }
    if (seenRoundIds.has(round.id)) {
      throw new GameDefinitionError(`duplicate round id within game: ${round.id}`)
    }
    seenRoundIds.add(round.id)
  }

  const teams = input.teams ?? NO_TEAMS
  if (!isTeamDefinitionList(teams)) {
    throw new GameDefinitionError('teams must be a list of valid TeamDefinitions')
  }
  const seenTeamIds = new Set<string>()
  for (const team of teams) {
    if (seenTeamIds.has(team.id)) {
      throw new GameDefinitionError(`duplicate team id within game: ${team.id}`)
    }
    seenTeamIds.add(team.id)
  }

  // Throws `TimerConfigError` on an out-of-range or malformed block; an omitted
  // block is the documented default, never an error.
  const timer = createTimerConfig(input.timer)

  const definition: GameDefinition = {
    modelVersion: input.modelVersion ?? GAME_DEFINITION_MODEL_VERSION,
    id: gameId(input.id),
    title: input.title,
    timer,
    // Copy the array so later external mutation of the caller's array cannot
    // affect the (frozen) definition; order is preserved exactly.
    rounds: [...input.rounds],
    // Same reasoning for teams: the caller keeps its own array, we keep ours.
    teams: [...teams],
  }
  return deepFreeze(definition)
}

/**
 * Structural guard for a `GameDefinition` value. Used at the reducer boundary to
 * reject a malformed definition carried on a command/event (fail closed) without
 * trusting its provenance. Checks shape and round validity only.
 */
export function isGameDefinition(value: unknown): value is GameDefinition {
  if (typeof value !== 'object' || value === null) return false
  const v = value as Record<string, unknown>
  if (typeof v.modelVersion !== 'number') return false
  if (typeof v.id !== 'string' || v.id.length === 0) return false
  if (typeof v.title !== 'string' || v.title.length === 0) return false
  if (!Array.isArray(v.rounds)) return false
  // `teams` is required on the model (the factory always sets it, possibly to an
  // empty list), so a value missing it is not a definition this build produced
  // and is rejected rather than treated as "no teams".
  if (!isTeamDefinitionList(v.teams)) return false
  // `timer` is required on the model (the factory always sets it, possibly to the
  // default), so a value missing it is not a definition this build produced and is
  // rejected rather than being silently defaulted at the trust boundary.
  if (!isTimerConfig(v.timer)) return false
  return v.rounds.every(isRoundDefinition)
}

/** Look up a round's ordinal index by its stable id. `-1` when not present. */
export function roundIndexById(definition: GameDefinition, id: string): number {
  return definition.rounds.findIndex((round) => round.id === id)
}
