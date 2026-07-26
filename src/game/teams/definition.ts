import { deepFreeze } from '../deepFreeze'
import { teamId, type TeamId } from '../ids'
import { defaultTeamAccent, isTeamAccent, type TeamAccent } from './accents'
import { teamsSchema } from './schema'

/**
 * The trusted team domain model (Slice 6).
 *
 * This module owns the step between "validated authored teams" and "typed teams
 * the engine may score". It is the ONLY place a `TeamDefinition` can be created,
 * and it always re-validates with the same schema the import boundary uses, so
 * it never trusts its caller's provenance: an in-memory fixture and an imported
 * game file get exactly the same treatment.
 *
 * ## Identity and ordering
 *
 * Identity is the authored `id`. The display `name` is public copy and is NEVER
 * identity — renaming a team moves no points, and two teams may carry the same
 * name while remaining distinct. Scores are keyed by id.
 *
 * Authored ARRAY ORDER is the canonical display order: `teams[i]` is position
 * `i`, and `order` freezes that index onto the team so no consumer has to
 * re-derive it (and so nothing is ever sorted by name, score, or id). The
 * scoreboard is therefore stable while scores change — a class watching the
 * projector does not see teams jump around when a point is awarded.
 *
 * ## What is NOT here
 *
 * Teams are authored CONTENT, so a `TeamDefinition` carries no score, no turn
 * state, no buzzer state, and no runtime anything. A score is session state
 * derived from the event log (see `scoring.ts` and `PrivateGameState`), because
 * a definition is immutable and a score is not.
 */

/** One authored team: identity, public name, presentation accent, display order. */
export interface TeamDefinition {
  /** Stable authored id. Unique within the game. Identity — never the name. */
  readonly id: TeamId
  /** Public-facing display name. Shown on the projector. Not identity. */
  readonly name: string
  /** Application-controlled presentation token. Supplemental to the name. */
  readonly accent: TeamAccent
  /** 0-based authored display order, derived from array position. */
  readonly order: number
}

/** Thrown when trusted construction is given teams it cannot accept. */
export class TeamConfigError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'TeamConfigError'
  }
}

/** The frozen empty list used for a game that configures no teams. */
export const NO_TEAMS: readonly TeamDefinition[] = deepFreeze<readonly TeamDefinition[]>([])

/**
 * The authored teams shape as it appears in a game file. Kept structurally
 * identical to the Zod schema; the schema is the authority, this is the view
 * used to read the validated input back out.
 */
type TeamsInputShape = readonly {
  readonly id: string
  readonly name: string
  readonly accent?: string
}[]

/**
 * Build trusted, deep-frozen team definitions from authored data.
 *
 * The input is re-validated with the same strict schema the import boundary
 * uses, so this cannot be used to smuggle invalid teams past validation. The
 * input is never mutated and never retained: every value below is copied into a
 * fresh object graph, so a caller that later mutates or extends its own array
 * cannot affect the frozen definitions.
 *
 * The single normalization applied is the documented positional accent default
 * for a team that omits the field ({@link defaultTeamAccent}). Everything else
 * is verbatim — no trimming into validity, no renaming, no generated ids, no
 * de-duplication, no reordering.
 *
 * @throws {TeamConfigError} if `input` is not a valid teams list.
 */
export function createTeamDefinitions(input: unknown): readonly TeamDefinition[] {
  const parsed = teamsSchema.safeParse(input)
  if (!parsed.success) {
    throw new TeamConfigError('teams did not pass validation and cannot be constructed')
  }
  // Read from the ORIGINAL validated input, not from Zod's output: the schema
  // performs no coercion, so both are equal, and reading the input keeps the
  // "a schema validates, it never rewrites" rule true by construction.
  const source = input as TeamsInputShape

  const teams: TeamDefinition[] = source.map((team, index) => ({
    id: teamId(team.id),
    name: team.name,
    accent: team.accent === undefined ? defaultTeamAccent(index) : (team.accent as TeamAccent),
    order: index,
  }))

  return deepFreeze<readonly TeamDefinition[]>(teams)
}

/**
 * Structural guard for one team. Used at the reducer trust boundary so a
 * malformed definition carried on a command/event is rejected (fail closed)
 * without trusting its provenance.
 */
export function isTeamDefinition(value: unknown): value is TeamDefinition {
  if (typeof value !== 'object' || value === null) return false
  const v = value as Record<string, unknown>
  return (
    typeof v.id === 'string' &&
    v.id.length > 0 &&
    typeof v.name === 'string' &&
    v.name.length > 0 &&
    isTeamAccent(v.accent) &&
    typeof v.order === 'number' &&
    Number.isInteger(v.order) &&
    v.order >= 0
  )
}

/** Structural guard for a whole teams list (an empty list is valid). */
export function isTeamDefinitionList(value: unknown): value is readonly TeamDefinition[] {
  return Array.isArray(value) && value.every(isTeamDefinition)
}

/**
 * TOTAL, fail-closed read of authored data as trusted teams.
 *
 * Returns `null` — never throws — when the value is not a valid teams list, so a
 * structurally impossible configuration degrades to "no teams" instead of
 * crashing or being guessed at.
 */
export function readTeamDefinitions(input: unknown): readonly TeamDefinition[] | null {
  try {
    return createTeamDefinitions(input)
  } catch {
    return null
  }
}

/** Find a team by its stable id, or `null`. Linear, deterministic, order-safe. */
export function findTeamById(
  teams: readonly TeamDefinition[],
  id: string,
): TeamDefinition | null {
  return teams.find((team) => team.id === id) ?? null
}

/** A team's 0-based authored position, or `-1` when it is not in the list. */
export function teamIndexById(teams: readonly TeamDefinition[], id: string): number {
  return teams.findIndex((team) => team.id === id)
}
