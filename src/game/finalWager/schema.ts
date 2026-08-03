import { z } from 'zod'
import { authoredPromptSchema, checkAuthoredPromptSemantics } from '../media/schema'
import {
  MAX_FINAL_ALTERNATES,
  MAX_FINAL_ALTERNATE_LENGTH,
  MAX_FINAL_ANSWER_LENGTH,
  MAX_FINAL_NOTES_LENGTH,
} from './limits'

/**
 * The strict import schema for a `final-wager` round's `config` (Slice 14).
 *
 * This is the ONE validation path for Final configuration. The registry hands it
 * to the Slice 4 import pipeline (`RoundTypeEntry.configSchema`) and the trusted
 * domain constructor re-uses it, so an imported game file and an in-memory
 * fixture are validated identically — exactly the arrangement `category-board`
 * uses.
 *
 * It follows the Slice 4 rules exactly (ADR-004 §4):
 *  - every object is `z.strictObject` — an unknown or misspelled key is a hard
 *    error, never a silently dropped field;
 *  - there is **no** `z.coerce`, `.default()`, `.catch()`, or `.transform()`
 *    anywhere, so nothing is coerced, defaulted, or rewritten at the boundary;
 *  - `.optional()` appears only on genuinely optional authored fields
 *    (`alternates`, `notes`) and never supplies a value;
 *  - every check REJECTS. Nothing repairs, de-duplicates, trims into validity, or
 *    drops a bad field to make the rest of the round importable.
 *
 * ## What is deliberately NOT in the config
 *
 * Eligibility mode, wager caps, response-capture mode, timer durations and reveal
 * order are all HOST decisions made during play, not authored content. Putting
 * them in the game file would turn a Final round into a policy document and would
 * be the "general policy engine" Slice 14 explicitly excludes. The config carries
 * a question and an answer, and nothing else.
 */

const alternateSchema = z
  .string()
  .min(1, 'an alternate answer must not be empty')
  .max(
    MAX_FINAL_ALTERNATE_LENGTH,
    `an alternate answer must be at most ${MAX_FINAL_ALTERNATE_LENGTH} characters`,
  )

const finalShapeSchema = z.strictObject({
  /**
   * The Final question. Reuses the Slice 11 typed prompt contract verbatim: a
   * legacy non-empty string (text) or a strict same-origin image object. There is
   * no Final-specific media grammar, so a Final prompt and a board prompt cannot
   * drift apart.
   */
  prompt: authoredPromptSchema,
  /** The canonical answer. PRIVATE until the host explicitly reveals it. */
  answer: z
    .string()
    .min(1, 'an answer must not be empty')
    .max(
      MAX_FINAL_ANSWER_LENGTH,
      `an answer must be at most ${MAX_FINAL_ANSWER_LENGTH} characters`,
    ),
  /**
   * Optional additional acceptable answers. HOST-ONLY grading aid — never
   * projected at any stage, exactly like a board tile's alternates.
   */
  alternates: z
    .array(alternateSchema)
    .max(
      MAX_FINAL_ALTERNATES,
      `a final round may list at most ${MAX_FINAL_ALTERNATES} alternate answers`,
    )
    .optional(),
  /** Optional HOST-ONLY teaching note. Never projected at any stage. */
  notes: z
    .string()
    .min(1, 'a teacher note must not be empty')
    .max(
      MAX_FINAL_NOTES_LENGTH,
      `a teacher note must be at most ${MAX_FINAL_NOTES_LENGTH} characters`,
    )
    .optional(),
})

/** The authored, structurally-valid Final shape (not yet a trusted domain object). */
export type FinalWagerConfigInput = z.infer<typeof finalShapeSchema>

/**
 * Whole-round relationship checks. Each issue carries `params.importCode` so the
 * import pipeline reports a precise, stable code (`blank-text`, …) rather than a
 * generic custom-validation failure — the same mechanism the board schema uses.
 */
function checkFinalSemantics(config: FinalWagerConfigInput, ctx: z.RefinementCtx): void {
  const add = (
    importCode: string,
    path: readonly (string | number)[],
    message: string,
  ): void => {
    ctx.addIssue({ code: 'custom', path: [...path], message, params: { importCode } })
  }

  checkAuthoredPromptSemantics(config.prompt, ctx, ['prompt'])

  if (config.answer.trim().length === 0) {
    add(
      'blank-text',
      ['answer'],
      'contains only whitespace. Write the answer — the pipeline will not invent one.',
    )
  }

  config.alternates?.forEach((alternate, index) => {
    if (alternate.trim().length === 0) {
      add(
        'blank-text',
        ['alternates', index],
        'contains only whitespace. Remove the empty alternate or write a real one.',
      )
    }
  })

  if (config.notes !== undefined && config.notes.trim().length === 0) {
    add(
      'blank-text',
      ['notes'],
      'contains only whitespace. Remove the note or write a real one.',
    )
  }
}

/**
 * The complete, strict Final config schema: structure first, then the whole-round
 * relationship checks. Zod runs the refinement only after the base shape
 * validates, so a malformed document reports structural problems without also
 * drowning the host in downstream noise.
 */
export const finalWagerConfigSchema = finalShapeSchema.superRefine(checkFinalSemantics)
