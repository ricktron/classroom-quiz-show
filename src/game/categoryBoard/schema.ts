import { z } from 'zod'
import { authoredPromptSchema, checkAuthoredPromptSemantics } from '../media/schema'
import {
  MAX_ALTERNATES,
  MAX_ALTERNATE_LENGTH,
  MAX_ANSWER_LENGTH,
  MAX_CATEGORIES,
  MAX_CATEGORY_TITLE_LENGTH,
  MAX_MULTIPLIER,
  MAX_NOTES_LENGTH,
  MAX_TILES_PER_CATEGORY,
  MAX_TILE_VALUE,
  MAX_TOTAL_TILES,
} from './limits'

/**
 * The strict import schema for a `category-board` round's `config` (Slice 5).
 *
 * This is the ONE validation path for category-board configuration. The
 * registry hands it to the Slice 4 import pipeline (`RoundTypeEntry.configSchema`)
 * and the trusted domain constructor re-uses it, so an imported game file and an
 * in-memory fixture are validated identically.
 *
 * It follows the Slice 4 rules exactly (ADR-004 §4):
 *  - every object is `z.strictObject` — an unknown or misspelled key is a hard
 *    error, never a silently dropped field;
 *  - there is **no** `z.coerce`, `.default()`, `.catch()`, or `.transform()`
 *    anywhere, so nothing is coerced, defaulted, or rewritten at the boundary;
 *  - `.optional()` appears only on genuinely optional authored fields
 *    (`alternates`, `notes`, `multiplier`) and never supplies a value — the
 *    documented `multiplier` default is applied later, and visibly, by the
 *    trusted domain constructor;
 *  - every check REJECTS. Nothing here repairs, de-duplicates, reorders,
 *    trims into validity, generates a missing id, or drops a bad tile to make
 *    the rest of the board importable.
 *
 * Relationship checks that a per-field schema cannot express (id uniqueness
 * across the whole round, whitespace-only text, the total-tile budget) live in
 * `checkBoardSemantics` below. They report through Zod so the import pipeline
 * gets exact document paths for free, and they carry an explicit
 * `params.importCode` so the pipeline can map them onto precise, stable import
 * issue codes instead of a generic "invalid value".
 */

/**
 * Identifier grammar for category and tile ids.
 *
 * This deliberately mirrors the canonical game-file identifier grammar
 * (`ID_PATTERN` in `src/import/canonicalFormat.ts`) rather than importing it:
 * the game domain must not depend on the import layer. A test asserts the two
 * patterns stay identical so they cannot drift apart.
 */
export const CATEGORY_BOARD_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]*$/

/** Maximum length of a category or tile id. Mirrors the canonical `MAX_ID_LENGTH`. */
export const CATEGORY_BOARD_MAX_ID_LENGTH = 64

const identifierSchema = (label: string) =>
  z
    .string()
    .min(1, `${label} must not be empty`)
    .max(
      CATEGORY_BOARD_MAX_ID_LENGTH,
      `${label} must be at most ${CATEGORY_BOARD_MAX_ID_LENGTH} characters`,
    )
    .regex(
      CATEGORY_BOARD_ID_PATTERN,
      `${label} must start with a letter or digit and use only letters, digits, '.', '_' or '-'`,
    )

/**
 * A single tile.
 *
 * `value` is a NON-NEGATIVE integer. Zero is allowed on purpose — a teacher may
 * want a deliberate no-points warm-up tile — while a negative value is rejected,
 * because "a tile worth minus points" is a scoring decision that belongs to
 * Slice 6, not to board content. Integers (not arbitrary numbers) keep
 * `value × multiplier` exact, with no floating-point ambiguity.
 */
const tileSchema = z.strictObject({
  id: identifierSchema('a tile id'),
  value: z
    .int('a tile value must be a whole number')
    .min(0, 'a tile value must not be negative')
    .max(MAX_TILE_VALUE, `a tile value must be at most ${MAX_TILE_VALUE}`),
  /**
   * Prompt content (Slice 11): a legacy non-empty string (text) or a strict
   * image object. Answers, alternates, and notes remain plain strings.
   */
  prompt: authoredPromptSchema,
  answer: z
    .string()
    .min(1, 'an answer must not be empty')
    .max(MAX_ANSWER_LENGTH, `an answer must be at most ${MAX_ANSWER_LENGTH} characters`),
  /**
   * Optional additional acceptable answers. They never replace the canonical
   * `answer`; the domain model keeps both, and `answer` stays authoritative.
   */
  alternates: z
    .array(
      z
        .string()
        .min(1, 'an alternate answer must not be empty')
        .max(
          MAX_ALTERNATE_LENGTH,
          `an alternate answer must be at most ${MAX_ALTERNATE_LENGTH} characters`,
        ),
    )
    .max(MAX_ALTERNATES, `a tile may list at most ${MAX_ALTERNATES} alternate answers`)
    .optional(),
  /** Optional HOST-ONLY teaching note. Never projected at any stage. */
  notes: z
    .string()
    .min(1, 'a teacher note must not be empty')
    .max(MAX_NOTES_LENGTH, `a teacher note must be at most ${MAX_NOTES_LENGTH} characters`)
    .optional(),
  /**
   * Optional multiplier. Omitting it is legal; the trusted domain constructor
   * then applies the documented default of 1. It is NOT defaulted here, so the
   * import boundary reports exactly what was authored.
   */
  multiplier: z
    .int('a multiplier must be a whole number')
    .min(1, 'a multiplier must be at least 1')
    .max(MAX_MULTIPLIER, `a multiplier must be at most ${MAX_MULTIPLIER}`)
    .optional(),
})

/**
 * One board column. `tiles` must be non-empty: an empty category renders as a
 * dead header on the projector and is far more likely to be an authoring
 * mistake than an intention.
 */
const categorySchema = z.strictObject({
  id: identifierSchema('a category id'),
  title: z
    .string()
    .min(1, 'a category title must not be empty')
    .max(
      MAX_CATEGORY_TITLE_LENGTH,
      `a category title must be at most ${MAX_CATEGORY_TITLE_LENGTH} characters`,
    ),
  tiles: z
    .array(tileSchema)
    .min(1, 'a category must contain at least one tile')
    .max(MAX_TILES_PER_CATEGORY, `a category may contain at most ${MAX_TILES_PER_CATEGORY} tiles`),
})

const boardShapeSchema = z.strictObject({
  /**
   * Ordered categories. Array position IS column order — it is never derived
   * from object-key enumeration, registry order, or tile values. Categories may
   * have DIFFERENT tile counts (a ragged board is valid and supported).
   */
  categories: z
    .array(categorySchema)
    .min(1, 'a category board must contain at least one category')
    .max(MAX_CATEGORIES, `a category board may contain at most ${MAX_CATEGORIES} categories`),
})

/** The authored, structurally-valid board shape (not yet a trusted domain object). */
export type CategoryBoardConfigInput = z.infer<typeof boardShapeSchema>

/** JSON-quote and clip an untrusted authored string for use inside a message. */
function quote(value: string, maxLength = 60): string {
  const clipped = value.length > maxLength ? `${value.slice(0, maxLength)}…` : value
  return JSON.stringify(clipped)
}

/**
 * Whole-board relationship checks. Each issue carries `params.importCode` so
 * the import pipeline can report a precise, stable code (`duplicate-tile-id`,
 * `blank-text`, …) rather than a generic custom-validation failure.
 */
function checkBoardSemantics(config: CategoryBoardConfigInput, ctx: z.RefinementCtx): void {
  const add = (
    importCode: string,
    path: readonly (string | number)[],
    message: string,
  ): void => {
    ctx.addIssue({ code: 'custom', path: [...path], message, params: { importCode } })
  }

  const firstCategoryIndexById = new Map<string, number>()
  /** Tile ids are unique across the ENTIRE round, not merely within a category. */
  const firstTileLocationById = new Map<string, string>()
  let totalTiles = 0

  config.categories.forEach((category, categoryIndex) => {
    const previousCategory = firstCategoryIndexById.get(category.id)
    if (previousCategory === undefined) {
      firstCategoryIndexById.set(category.id, categoryIndex)
    } else {
      add(
        'duplicate-category-id',
        ['categories', categoryIndex, 'id'],
        `duplicates the id of categories[${previousCategory}] (${quote(category.id)}). Category ids must be unique within a round; give this category its own id.`,
      )
    }

    if (category.title.trim().length === 0) {
      add(
        'blank-text',
        ['categories', categoryIndex, 'title'],
        'contains only whitespace. Give the category a real title — the pipeline will not invent one.',
      )
    }

    totalTiles += category.tiles.length

    category.tiles.forEach((tile, tileIndex) => {
      const here = `categories[${categoryIndex}].tiles[${tileIndex}]`
      const previousTile = firstTileLocationById.get(tile.id)
      if (previousTile === undefined) {
        firstTileLocationById.set(tile.id, here)
      } else {
        add(
          'duplicate-tile-id',
          ['categories', categoryIndex, 'tiles', tileIndex, 'id'],
          `duplicates the id of ${previousTile} (${quote(tile.id)}). Tile ids must be unique across the whole round, not just within a category; give this tile its own id.`,
        )
      }

      checkAuthoredPromptSemantics(tile.prompt, ctx, [
        'categories',
        categoryIndex,
        'tiles',
        tileIndex,
        'prompt',
      ])

      if (tile.answer.trim().length === 0) {
        add(
          'blank-text',
          ['categories', categoryIndex, 'tiles', tileIndex, 'answer'],
          'contains only whitespace. Write the answer — the pipeline will not invent one.',
        )
      }

      tile.alternates?.forEach((alternate, alternateIndex) => {
        if (alternate.trim().length === 0) {
          add(
            'blank-text',
            ['categories', categoryIndex, 'tiles', tileIndex, 'alternates', alternateIndex],
            'contains only whitespace. Remove the empty alternate or write a real one.',
          )
        }
      })

      if (tile.notes !== undefined && tile.notes.trim().length === 0) {
        add(
          'blank-text',
          ['categories', categoryIndex, 'tiles', tileIndex, 'notes'],
          'contains only whitespace. Remove the note or write a real one.',
        )
      }
    })
  })

  if (totalTiles > MAX_TOTAL_TILES) {
    add(
      'value-too-large',
      ['categories'],
      `contains ${totalTiles} tiles in total, which is more than the ${MAX_TOTAL_TILES}-tile limit for one board. Split the content across more rounds — no tile will be dropped for you.`,
    )
  }
}

/**
 * The complete, strict category-board config schema: structure first, then the
 * whole-board relationship checks. Zod runs the refinement only after the base
 * shape validates, so a malformed document reports structural problems without
 * also drowning the host in downstream noise.
 */
export const categoryBoardConfigSchema = boardShapeSchema.superRefine(checkBoardSemantics)
