import { deepFreeze } from '../deepFreeze'
import { roundType, type RoundType } from '../ids'
import type { RoundDefinition } from '../roundDefinition'
import {
  freezePromptContent,
  normalizeAuthoredPrompt,
  type PromptContent,
} from '../media/definition'
import { DEFAULT_MULTIPLIER } from './limits'
import { categoryBoardConfigSchema } from './schema'

/**
 * The trusted `category-board` round domain model (Slice 5).
 *
 * This module owns the step between "validated authored config" and "a typed
 * board the engine may play". It is the ONLY place a `CategoryBoardDefinition`
 * can be created, and it always re-validates: it never trusts its caller's
 * provenance, so an in-memory fixture and an imported game file get exactly the
 * same treatment.
 *
 * ## Ordering and identity
 *
 * Authored ARRAY ORDER is the canonical order — `categories[i]` is column `i`
 * and `tiles[j]` is row `j` within that column. Order is never derived from
 * object-key enumeration, from registry order, or from tile value. Identity is
 * the authored `id`: a tile is the tile with that id, not "the 300 in Biology".
 *
 * ## Board shape
 *
 * **Uneven categories are allowed.** A real classroom board often has a short
 * category (four clues) beside a long one (six), and forcing a rectangle would
 * make a teacher pad the board with filler. The display renders ragged columns
 * safely; nothing in the engine indexes tiles by a shared row count.
 *
 * **Duplicate values are allowed.** Two tiles may both display 200 — including
 * within one category — because identity comes from the stable tile id, never
 * from the displayed number. Rejecting duplicates would break legitimate boards
 * (e.g. a flat 100-point ladder) for no safety gain.
 *
 * ## Derived data
 *
 * `effectiveValue` and `categoryId` are derived deterministically from authored
 * data at construction time and frozen alongside it. There is deliberately NO
 * lookup cache: lookups are linear scans over a board bounded to 48 tiles, so
 * there is no second, mutable source of truth that could drift from the frozen
 * definition during replay.
 */

/** The registered round-type identifier for the category board. */
export const CATEGORY_BOARD_ROUND_TYPE: RoundType = roundType('category-board')

/** A single playable tile, with its derived, frozen effective value. */
export interface CategoryBoardTile {
  /** Stable authored id. Unique across the WHOLE round, not just its category. */
  readonly id: string
  /** Id of the category this tile belongs to (derived from position). */
  readonly categoryId: string
  /** Authored base value. */
  readonly value: number
  /** Authored multiplier, or the documented default when omitted. */
  readonly multiplier: number
  /** `value × multiplier` — the number shown on the board. Always an integer. */
  readonly effectiveValue: number
  /**
   * The question content (text or image). PRIVATE until the host reveals it.
   * Normalized at construction — a legacy authored string becomes
   * `{ kind: 'text', text }`. Never assume a bare string.
   */
  readonly prompt: PromptContent
  /** The canonical answer. PRIVATE until the host reveals it. Plain string. */
  readonly answer: string
  /**
   * Additional answers the host may accept. HOST-ONLY in Slice 5 — they are a
   * grading aid and are never projected (see ADR-005). They never replace the
   * canonical `answer`.
   */
  readonly alternates: readonly string[]
  /** Host-only teaching note, or `null`. NEVER projected, at any stage. */
  readonly notes: string | null
}

/** One board column: a public title and its ordered tiles. */
export interface CategoryBoardCategory {
  readonly id: string
  readonly title: string
  readonly tiles: readonly CategoryBoardTile[]
}

/** A complete, immutable, playable board. */
export interface CategoryBoardDefinition {
  readonly categories: readonly CategoryBoardCategory[]
}

/** Thrown when trusted construction is given config it cannot accept. */
export class CategoryBoardConfigError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'CategoryBoardConfigError'
  }
}

/**
 * Build a trusted, deep-frozen board from authored config.
 *
 * The input is re-validated with the same strict schema the import boundary
 * uses, so this cannot be used to smuggle an invalid board past validation.
 * The input object is never mutated and is never retained: every value below is
 * copied into a fresh object graph, so a caller that later mutates its own
 * config cannot affect the frozen definition.
 *
 * The single normalization applied is the documented `multiplier` default of
 * {@link DEFAULT_MULTIPLIER} for a tile that omits the field. Everything else
 * is verbatim.
 *
 * @throws {CategoryBoardConfigError} if `config` is not a valid board.
 */
export function createCategoryBoardDefinition(config: unknown): CategoryBoardDefinition {
  const parsed = categoryBoardConfigSchema.safeParse(config)
  if (!parsed.success) {
    throw new CategoryBoardConfigError(
      'category-board config did not pass validation and cannot be constructed',
    )
  }
  // Read from the ORIGINAL validated input, not from Zod's output: the schema
  // performs no coercion, so both are equal, and reading the input keeps the
  // "a schema validates, it never rewrites" rule true by construction.
  const source = config as CategoryBoardConfigShape

  const categories: CategoryBoardCategory[] = source.categories.map((category) => {
    const tiles: CategoryBoardTile[] = category.tiles.map((tile) => {
      const multiplier = tile.multiplier ?? DEFAULT_MULTIPLIER
      const prompt = normalizeAuthoredPrompt(tile.prompt)
      if (prompt === null) {
        throw new CategoryBoardConfigError(
          'category-board prompt could not be normalized to trusted media content',
        )
      }
      return {
        id: tile.id,
        categoryId: category.id,
        value: tile.value,
        multiplier,
        // Both operands are validated integers inside bounded ranges, so this
        // is exact integer arithmetic — never a floating-point approximation.
        effectiveValue: tile.value * multiplier,
        prompt: freezePromptContent(prompt),
        answer: tile.answer,
        alternates: tile.alternates === undefined ? [] : [...tile.alternates],
        notes: tile.notes === undefined ? null : tile.notes,
      }
    })
    return { id: category.id, title: category.title, tiles }
  })

  return deepFreeze<CategoryBoardDefinition>({ categories })
}

/**
 * The authored config shape as it appears in a game file. Kept structurally
 * identical to the Zod schema; the schema is the authority, this is the view
 * used to read the validated input back out.
 */
interface CategoryBoardConfigShape {
  readonly categories: readonly {
    readonly id: string
    readonly title: string
    readonly tiles: readonly {
      readonly id: string
      readonly value: number
      /** Legacy string or authored image object — normalized by the constructor. */
      readonly prompt: unknown
      readonly answer: string
      readonly alternates?: readonly string[]
      readonly notes?: string
      readonly multiplier?: number
    }[]
  }[]
}

/** Is this round a category-board round? Checks the type only, not the config. */
export function isCategoryBoardRound(round: RoundDefinition): boolean {
  return round.type === CATEGORY_BOARD_ROUND_TYPE
}

/**
 * TOTAL, fail-closed read of a round's config as a trusted board.
 *
 * Returns `null` — never throws — when the round is not a category-board or its
 * config cannot be validated. Every runtime consumer (the command planner, the
 * sanitizer, the host panel) goes through this, so a structurally impossible
 * round degrades to "no board" instead of crashing or guessing.
 *
 * Deliberately NOT memoized. A board is at most 48 tiles, and a cache keyed on
 * a definition would be a second source of truth that could drift from the
 * frozen definition during replay — exactly what the replay contract forbids.
 */
export function readCategoryBoardDefinition(
  round: RoundDefinition,
): CategoryBoardDefinition | null {
  if (!isCategoryBoardRound(round)) return null
  try {
    return createCategoryBoardDefinition(round.config)
  } catch {
    return null
  }
}

/** Find a category by its stable id, or `null`. Linear, deterministic. */
export function findCategoryById(
  board: CategoryBoardDefinition,
  categoryId: string,
): CategoryBoardCategory | null {
  return board.categories.find((category) => category.id === categoryId) ?? null
}

/** Find a tile by its stable id anywhere on the board, or `null`. */
export function findTileById(
  board: CategoryBoardDefinition,
  tileId: string,
): CategoryBoardTile | null {
  for (const category of board.categories) {
    const tile = category.tiles.find((candidate) => candidate.id === tileId)
    if (tile) return tile
  }
  return null
}

/** A tile together with the category it sits in — the "where is this tile" answer. */
export interface CategoryBoardTileLocation {
  readonly category: CategoryBoardCategory
  readonly categoryIndex: number
  readonly tile: CategoryBoardTile
  readonly tileIndex: number
}

/** Locate a tile and its column/row position, or `null`. */
export function findTileLocation(
  board: CategoryBoardDefinition,
  tileId: string,
): CategoryBoardTileLocation | null {
  for (let categoryIndex = 0; categoryIndex < board.categories.length; categoryIndex += 1) {
    const category = board.categories[categoryIndex]
    const tileIndex = category.tiles.findIndex((tile) => tile.id === tileId)
    if (tileIndex >= 0) {
      return { category, categoryIndex, tile: category.tiles[tileIndex], tileIndex }
    }
  }
  return null
}

/** Every tile on the board, in authored order (column by column). */
export function allTiles(board: CategoryBoardDefinition): readonly CategoryBoardTile[] {
  return board.categories.flatMap((category) => category.tiles)
}
