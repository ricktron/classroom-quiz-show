import { deepFreeze } from '../deepFreeze'
import {
  DEFAULT_RESPONSE_SECONDS,
  MAX_RESPONSE_SECONDS,
  MIN_RESPONSE_SECONDS,
  MS_PER_SECOND,
} from './limits'
import { timerConfigSchema } from './schema'

/**
 * The trusted timer-configuration domain (Slice 7).
 *
 * ## Authored truth vs. session state
 *
 * A `TimerConfig` is AUTHORED content: it lives on the immutable
 * `GameDefinition` beside `teams`, and it says how long this game's response
 * window is *by default*. It carries no running timer, no deadline and no
 * status — those are session facts derived by replaying the event log
 * (`responsePhase.ts`), exactly as a team's score is session state while the team
 * itself is authored content.
 *
 * ## Why it is a block rather than a bare number
 *
 * `timer: { responseSeconds }` rather than `timerSeconds` so a later slice can add
 * a second authored window (a final-wager window, a media-length hint) as a new
 * field of the same block instead of a second top-level key. That is the same
 * reasoning that made `ScoreSource` a discriminated object rather than a string.
 *
 * ## Backward compatibility
 *
 * The `timer` block is OPTIONAL and additive on `schemaVersion: 1`: every game
 * file that was valid before Slice 7 is still valid, still means exactly the same
 * thing, and gets {@link DEFAULT_RESPONSE_SECONDS}. No migration is required and
 * none is implied (ADR-006 §5 precedent).
 */

/** One game's authored timing configuration. */
export interface TimerConfig {
  /** Default response window in whole seconds, within the documented bounds. */
  readonly responseSeconds: number
}

/** Thrown when trusted construction is given a configuration it cannot accept. */
export class TimerConfigError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'TimerConfigError'
  }
}

/**
 * The configuration a game gets when it authors no `timer` block.
 *
 * Frozen, shared, and applied by the trusted constructor only — never by a Zod
 * `.default()`, so the import boundary still reports exactly what was authored.
 */
export const DEFAULT_TIMER_CONFIG: TimerConfig = deepFreeze<TimerConfig>({
  responseSeconds: DEFAULT_RESPONSE_SECONDS,
})

/**
 * Build a trusted, frozen `TimerConfig` from authored data.
 *
 * `undefined` means "this game authored no timer block" and yields the documented
 * default — that is the ONE normalization applied. Anything else is re-validated
 * with the same strict schema the import boundary uses, so this cannot be used to
 * smuggle an out-of-range duration past validation.
 *
 * @throws {TimerConfigError} if `input` is present but not a valid timer block.
 */
export function createTimerConfig(input: unknown): TimerConfig {
  if (input === undefined) return DEFAULT_TIMER_CONFIG
  const parsed = timerConfigSchema.safeParse(input)
  if (!parsed.success) {
    throw new TimerConfigError('timer did not pass validation and cannot be constructed')
  }
  // Read from the ORIGINAL validated input, not from Zod's output: the schema
  // performs no coercion, so the two are equal, and reading the input keeps the
  // "a schema validates, it never rewrites" rule true by construction.
  const source = input as { readonly responseSeconds: number }
  return deepFreeze<TimerConfig>({ responseSeconds: source.responseSeconds })
}

/**
 * Is this a legal authored response duration: a whole number of seconds inside
 * the documented bounds? Exported so the command planner and the schema provably
 * apply the same rule.
 */
export function isResponseSeconds(value: unknown): value is number {
  return (
    typeof value === 'number' &&
    Number.isInteger(value) &&
    value >= MIN_RESPONSE_SECONDS &&
    value <= MAX_RESPONSE_SECONDS
  )
}

/**
 * Structural guard for a `TimerConfig`. Used at the reducer trust boundary so a
 * malformed definition carried on a command/event is rejected (fail closed)
 * without trusting its provenance.
 */
export function isTimerConfig(value: unknown): value is TimerConfig {
  if (typeof value !== 'object' || value === null) return false
  const v = value as Record<string, unknown>
  return isResponseSeconds(v.responseSeconds)
}

/** Convert a validated duration in seconds to milliseconds. Exact integers only. */
export function responseDurationMs(seconds: number): number {
  return seconds * MS_PER_SECOND
}
