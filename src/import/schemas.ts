import { z } from 'zod'
import {
  CANONICAL_GAME_FILE_FORMAT,
  ID_PATTERN,
  MAX_ID_LENGTH,
  MAX_ROUNDS,
  MAX_TITLE_LENGTH,
  ROUND_TYPE_PATTERN,
  SUPPORTED_SCHEMA_VERSION,
} from './canonicalFormat'
import {
  IMPORT_ISSUE_CODES,
  describePath,
  formatPath,
  issue,
  type ImportIssue,
  type ImportIssueCode,
  type ImportStage,
} from './issues'
import { isPlainRecord } from './safetyScan'
import { teamsSchema } from '../game/teams/schema'

/**
 * The Zod schema boundary for untrusted imported data (Slice 4).
 *
 * Every schema here starts from `unknown` and is STRICT: unknown/misspelled
 * keys are errors, not silently dropped fields. There is deliberately **no
 * coercion anywhere** — no `z.coerce`, no `.default()`, no `.catch()`, no
 * `.transform()`, no `.optional()` on a required field. A number is not
 * accepted where a string is declared, a single object is not widened into an
 * array, and a malformed `config` is never replaced with `{}`. Anything that
 * does not already match the canonical format fails.
 *
 * The schemas are also purely *validating*: the pipeline never uses a parsed
 * output value in place of the input, so a schema cannot silently rewrite
 * content even by accident (see `normalize.ts`).
 */

const identifierSchema = (label: string) =>
  z
    .string()
    .min(1, `${label} must not be empty`)
    .max(MAX_ID_LENGTH, `${label} must be at most ${MAX_ID_LENGTH} characters`)
    .regex(
      ID_PATTERN,
      `${label} must start with a letter or digit and use only letters, digits, '.', '_' or '-'`,
    )

const titleSchema = z
  .string()
  .min(1, 'a title must not be empty')
  .max(MAX_TITLE_LENGTH, `a title must be at most ${MAX_TITLE_LENGTH} characters`)

/**
 * A round's `config` must be a plain object. Its *contents* are validated by the
 * schema the registry supplies for that round's type — one config validation
 * path per known round type, and no generic fallback.
 */
const configSchema = z.custom<Record<string, unknown>>(isPlainRecord, {
  message: 'config must be an object',
})

export const canonicalRoundSchema = z.strictObject({
  id: identifierSchema('a round id'),
  type: z
    .string()
    .min(1, 'a round type must not be empty')
    .max(MAX_ID_LENGTH, `a round type must be at most ${MAX_ID_LENGTH} characters`)
    .regex(
      ROUND_TYPE_PATTERN,
      "a round type must be lower-case and use only letters, digits and '-'",
    ),
  title: titleSchema,
  config: configSchema,
})

/**
 * The canonical game-file schema. `format` and `schemaVersion` are re-asserted
 * here as literals even though the pipeline discriminates on them first — the
 * schema must be correct on its own, not only in context.
 *
 * An empty `rounds` array is allowed on purpose: it matches the Slice 3 domain
 * contract (`createGameDefinition` accepts a game with no rounds), so the
 * import boundary does not invent a stricter rule than the model it feeds.
 */
export const canonicalGameFileSchema = z.strictObject({
  format: z.literal(CANONICAL_GAME_FILE_FORMAT),
  schemaVersion: z.literal(SUPPORTED_SCHEMA_VERSION),
  id: identifierSchema('the game id'),
  title: titleSchema,
  /**
   * Optional ordered teams (Slice 6). The schema is owned by the game domain
   * (`src/game/teams/schema.ts`) and re-used verbatim by the trusted constructor,
   * so there is exactly ONE team validation path — the same arrangement the
   * registry uses for a round type's `config`.
   *
   * It is OPTIONAL because a game with no teams is valid and is precisely what
   * every pre-Slice-6 game file is. Being additive and optional is also what
   * makes this an in-place extension of `schemaVersion: 1` rather than a new
   * version: every document that was valid before is still valid, still means
   * exactly the same thing, and needs no migration (see ADR-006 §4).
   */
  teams: teamsSchema.optional(),
  rounds: z
    .array(canonicalRoundSchema)
    .max(MAX_ROUNDS, `a game may contain at most ${MAX_ROUNDS} rounds`),
})

/** The structurally-valid canonical document shape (still not yet trusted). */
export type CanonicalGameFile = z.infer<typeof canonicalGameFileSchema>
export type CanonicalRound = z.infer<typeof canonicalRoundSchema>

/** Read the value at a path, so "missing" and "wrong type" can be distinguished. */
function valueAtPath(root: unknown, segments: readonly PropertyKey[]): unknown {
  let current: unknown = root
  for (const segment of segments) {
    if (current === null || (typeof current !== 'object' && typeof current !== 'string')) {
      return undefined
    }
    current = (current as Record<PropertyKey, unknown>)[segment]
  }
  return current
}

const IMPORT_ISSUE_CODE_SET: ReadonlySet<string> = new Set(IMPORT_ISSUE_CODES)

/**
 * A schema may name the exact import issue code its check should report, by
 * attaching `params: { importCode: '…' }` to a custom Zod issue.
 *
 * This is how a round type's own config schema (e.g. `category-board`) reports
 * a precise `duplicate-tile-id` or `blank-text` instead of a generic
 * "invalid value", WITHOUT the import pipeline needing to know anything about
 * that round type. The requested code is validated against the stable code
 * list, so a typo degrades to the generic mapping rather than inventing a code.
 */
function requestedIssueCode(zodIssue: z.core.$ZodIssue): ImportIssueCode | null {
  const params = (zodIssue as { readonly params?: unknown }).params
  if (typeof params !== 'object' || params === null) return null
  const requested = (params as Record<string, unknown>).importCode
  if (typeof requested !== 'string' || !IMPORT_ISSUE_CODE_SET.has(requested)) return null
  return requested as ImportIssueCode
}

function codeForZodIssue(zodIssue: z.core.$ZodIssue, missing: boolean): ImportIssueCode {
  const requested = requestedIssueCode(zodIssue)
  if (requested !== null) return requested

  switch (zodIssue.code) {
    case 'invalid_type':
      return missing ? 'missing-field' : 'invalid-type'
    case 'invalid_value':
      return 'invalid-value'
    case 'invalid_format':
      return 'invalid-format'
    case 'too_small':
      return 'value-too-small'
    case 'too_big':
      return 'value-too-large'
    case 'unrecognized_keys':
      return 'unknown-field'
    default:
      return 'invalid-value'
  }
}

/**
 * Map Zod's issues onto the stable import error model.
 *
 * ALL issues are preserved (Zod does not abort at the first field), each one
 * keeps its exact document path, and unknown-key issues are expanded into one
 * issue per offending key so a misspelled field is named directly.
 *
 * `basePath` prefixes nested sub-parses (a round's `config` is validated by the
 * registry against its own schema, but reported at `rounds[2].config.…`).
 */
export function zodIssuesToImportIssues(
  zodIssues: readonly z.core.$ZodIssue[],
  parsedRoot: unknown,
  options: { readonly stage?: ImportStage; readonly basePath?: readonly (string | number)[] } = {},
): readonly ImportIssue[] {
  const stage = options.stage ?? 'schema'
  const basePath = options.basePath ?? []
  const issues: ImportIssue[] = []

  for (const zodIssue of zodIssues) {
    const relative = zodIssue.path as readonly (string | number)[]

    if (zodIssue.code === 'unrecognized_keys') {
      for (const key of zodIssue.keys) {
        const segments = [...basePath, ...relative, key]
        issues.push(
          issue(
            'unknown-field',
            stage,
            formatPath(segments),
            `${formatPath(segments)} is not a recognized field. Unknown fields are rejected rather than ignored, so a misspelling is never silently dropped.`,
          ),
        )
      }
      continue
    }

    const segments = [...basePath, ...relative]
    const path = formatPath(segments)
    const missing =
      zodIssue.code === 'invalid_type' && valueAtPath(parsedRoot, relative) === undefined
    const code = codeForZodIssue(zodIssue, missing)
    const message = missing
      ? `${path} is required but missing.`
      : `${describePath(path)}: ${zodIssue.message}`
    issues.push(issue(code, stage, path, message))
  }

  return issues
}
