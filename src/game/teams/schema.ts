import { z } from 'zod'
import { TEAM_ACCENTS, isTeamAccent } from './accents'
import {
  MAX_TEAMS,
  MAX_TEAM_ACCENT_LENGTH,
  MAX_TEAM_NAME_LENGTH,
  MIN_TEAMS,
  TEAM_ID_PATTERN,
  TEAM_MAX_ID_LENGTH,
} from './limits'

/**
 * The strict schema for a game file's `teams` array (Slice 6).
 *
 * This is the ONE validation path for team configuration. The Slice 4 import
 * pipeline embeds it in the canonical game-file schema, and the trusted domain
 * constructor (`createTeamDefinitions`) re-uses the very same schema — so an
 * imported game file and an in-memory fixture are validated identically and
 * there is no second importer.
 *
 * It follows the Slice 4 rules exactly (ADR-004 §4):
 *  - `z.strictObject` — an unknown or misspelled team field is a hard error,
 *    never a silently dropped field;
 *  - no `z.coerce`, `.default()`, `.catch()`, or `.transform()` anywhere, so
 *    nothing is coerced, defaulted, or rewritten at the boundary. The documented
 *    accent default is applied later, and visibly, by the trusted constructor;
 *  - `.optional()` appears only on the genuinely optional `accent`;
 *  - every check REJECTS. Nothing here repairs: a duplicate id is not renamed, a
 *    blank name is not replaced with "Team 2", a missing id is never generated,
 *    an unknown accent is not swapped for a safe one, and no team is dropped to
 *    make the rest of the game importable.
 *
 * Relationship checks a per-field schema cannot express (id uniqueness across
 * the game, whitespace-only names, palette membership) live in
 * `checkTeamSemantics`. They report through Zod so the import pipeline gets
 * exact document paths (`teams[1].id`) for free, and they carry an explicit
 * `params.importCode` so the pipeline maps them to precise, stable issue codes
 * instead of a generic "invalid value".
 */

const teamIdSchema = z
  .string()
  .min(1, 'a team id must not be empty')
  .max(TEAM_MAX_ID_LENGTH, `a team id must be at most ${TEAM_MAX_ID_LENGTH} characters`)
  .regex(
    TEAM_ID_PATTERN,
    "a team id must start with a letter or digit and use only letters, digits, '.', '_' or '-'",
  )

/**
 * One team.
 *
 * `id` is identity and is SUPPLIED, never generated. `name` is public-facing
 * copy shown on the projector — it is deliberately NOT identity, so two teams
 * could legitimately be renamed to the same thing without the engine losing
 * track of which is which (the schema still keeps ids unique).
 */
const teamSchema = z.strictObject({
  id: teamIdSchema,
  name: z
    .string()
    .min(1, 'a team name must not be empty')
    .max(MAX_TEAM_NAME_LENGTH, `a team name must be at most ${MAX_TEAM_NAME_LENGTH} characters`),
  /**
   * Optional presentation accent. Validated as a bounded string here and checked
   * against the application-controlled palette in `checkTeamSemantics`, so an
   * unknown token gets a precise `invalid-team-accent` issue that names the
   * permitted values. Omitting it is legal; the trusted constructor then applies
   * the documented positional default.
   */
  accent: z
    .string()
    .min(1, 'a team accent must not be empty')
    .max(
      MAX_TEAM_ACCENT_LENGTH,
      `a team accent must be at most ${MAX_TEAM_ACCENT_LENGTH} characters`,
    )
    .optional(),
})

/**
 * The ordered teams array. Array position IS the canonical display order, exactly
 * as it is for rounds and board categories — order is never derived from the
 * name, the id, the score, or object-key enumeration.
 *
 * An EMPTY array is rejected on purpose. "No teams" is expressed by omitting the
 * `teams` field entirely, so there is exactly one way to say it and `teams: []`
 * cannot be mistaken for a configuration that was meant to have teams.
 */
const teamsShapeSchema = z
  .array(teamSchema)
  .min(
    MIN_TEAMS,
    `teams must list at least ${MIN_TEAMS} team. Omit the "teams" field entirely for a game with no teams.`,
  )
  .max(MAX_TEAMS, `a game may have at most ${MAX_TEAMS} teams`)

/** The authored, structurally-valid teams shape (not yet a trusted domain object). */
export type TeamsConfigInput = z.infer<typeof teamsShapeSchema>

/** JSON-quote and clip an untrusted authored string for use inside a message. */
function quote(value: string, maxLength = 60): string {
  const clipped = value.length > maxLength ? `${value.slice(0, maxLength)}…` : value
  return JSON.stringify(clipped)
}

/**
 * Whole-list relationship checks. Each issue carries `params.importCode` so the
 * import pipeline reports a precise, stable code rather than a generic custom
 * validation failure.
 */
function checkTeamSemantics(teams: TeamsConfigInput, ctx: z.RefinementCtx): void {
  const add = (importCode: string, path: readonly (string | number)[], message: string): void => {
    ctx.addIssue({ code: 'custom', path: [...path], message, params: { importCode } })
  }

  const firstIndexById = new Map<string, number>()

  teams.forEach((team, index) => {
    const previous = firstIndexById.get(team.id)
    if (previous === undefined) {
      firstIndexById.set(team.id, index)
    } else {
      add(
        'duplicate-team-id',
        [index, 'id'],
        `duplicates the id of teams[${previous}] (${quote(team.id)}). Team ids must be unique within a game; give this team its own id. Ids are identity — renaming a team does not change which team it is.`,
      )
    }

    if (team.name.trim().length === 0) {
      add(
        'blank-text',
        [index, 'name'],
        'contains only whitespace. Give the team a real name — the pipeline will not invent one, and the name is what the class reads on the projector.',
      )
    }

    if (team.accent !== undefined && !isTeamAccent(team.accent)) {
      add(
        'invalid-team-accent',
        [index, 'accent'],
        `is ${quote(team.accent)}, which is not one of the accents this application provides. Choose one of: ${TEAM_ACCENTS.join(', ')}. A game file may only name an accent — it can never supply a colour, a gradient, or any style value.`,
      )
    }
  })
}

/** The complete, strict teams schema: structure first, then relationship checks. */
export const teamsSchema = teamsShapeSchema.superRefine(checkTeamSemantics)
