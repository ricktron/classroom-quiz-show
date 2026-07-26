import { z } from 'zod'
import { MAX_RESPONSE_SECONDS, MIN_RESPONSE_SECONDS } from './limits'

/**
 * The strict schema for a game file's optional `timer` block (Slice 7).
 *
 * This is the ONE validation path for authored timer configuration. The Slice 4
 * import pipeline embeds it in the canonical game-file schema and the trusted
 * domain constructor (`createTimerConfig`) re-uses the very same schema — so an
 * imported game file and an in-memory fixture are validated identically and there
 * is no second importer.
 *
 * It follows the Slice 4 rules exactly (ADR-004 §4):
 *  - `z.strictObject` — an unknown or misspelled key is a hard error, never a
 *    silently dropped field;
 *  - no `z.coerce`, `.default()`, `.catch()` or `.transform()`, so nothing is
 *    coerced or defaulted at the boundary. The documented
 *    {@link DEFAULT_RESPONSE_SECONDS} default is applied later, and visibly, by
 *    the trusted constructor;
 *  - every check REJECTS. A three-second window is not raised to five and a
 *    fractional duration is not rounded — both are reported.
 *
 * The block carries SECONDS, not milliseconds: a teacher authors "45", and the
 * engine converts once, at the trusted boundary. Authoring milliseconds would
 * invite a mistyped `45` meaning 45 ms.
 */
export const timerConfigSchema = z.strictObject({
  /**
   * The default response window for this game, in whole seconds. It is the value
   * the host control starts from; the host may still choose another bounded
   * duration at the moment they start a timer.
   */
  responseSeconds: z
    .int('a response timer duration must be a whole number of seconds')
    .min(
      MIN_RESPONSE_SECONDS,
      `a response timer must be at least ${MIN_RESPONSE_SECONDS} seconds — anything shorter is a stopwatch, not a response window`,
    )
    .max(
      MAX_RESPONSE_SECONDS,
      `a response timer must be at most ${MAX_RESPONSE_SECONDS} seconds (${MAX_RESPONSE_SECONDS / 60} minutes)`,
    ),
})

/** The authored, structurally-valid timer block (not yet a trusted domain object). */
export type TimerConfigInput = z.infer<typeof timerConfigSchema>
