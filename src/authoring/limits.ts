/**
 * Centralized Slice 20 workbook transport / parse limits.
 *
 * Semantic content limits reuse canonical constants with identical meaning.
 * Transport limits below are workbook-specific and are not claimed as
 * uncompressed caps unless the preflight genuinely enforces them.
 */

import {
  MAX_ALTERNATE_LENGTH,
  MAX_ALTERNATES,
  MAX_ANSWER_LENGTH,
  MAX_CATEGORIES,
  MAX_CATEGORY_TITLE_LENGTH,
  MAX_MULTIPLIER,
  MAX_NOTES_LENGTH,
  MAX_PROMPT_LENGTH,
  MAX_TILES_PER_CATEGORY,
  MAX_TILE_VALUE,
  MAX_TOTAL_TILES,
} from '../game/categoryBoard/limits'
import {
  MAX_FINAL_ALTERNATE_LENGTH,
  MAX_FINAL_ALTERNATES,
  MAX_FINAL_ANSWER_LENGTH,
  MAX_FINAL_NOTES_LENGTH,
} from '../game/finalWager/limits'
import { MAX_ID_LENGTH, MAX_TITLE_LENGTH } from '../import/canonicalFormat'
import { MAX_TEAM_NAME_LENGTH, MAX_TEAMS } from '../game/teams/limits'
import {
  MAX_RESPONSE_SECONDS,
  MIN_RESPONSE_SECONDS,
} from '../game/timing/limits'

export {
  MAX_ALTERNATE_LENGTH,
  MAX_ALTERNATES,
  MAX_ANSWER_LENGTH,
  MAX_CATEGORIES,
  MAX_CATEGORY_TITLE_LENGTH,
  MAX_FINAL_ALTERNATE_LENGTH,
  MAX_FINAL_ALTERNATES,
  MAX_FINAL_ANSWER_LENGTH,
  MAX_FINAL_NOTES_LENGTH,
  MAX_ID_LENGTH,
  MAX_MULTIPLIER,
  MAX_NOTES_LENGTH,
  MAX_PROMPT_LENGTH,
  MAX_RESPONSE_SECONDS,
  MAX_TEAM_NAME_LENGTH,
  MAX_TEAMS,
  MAX_TILES_PER_CATEGORY,
  MAX_TILE_VALUE,
  MAX_TITLE_LENGTH,
  MAX_TOTAL_TILES,
  MIN_RESPONSE_SECONDS,
}

/** Compressed workbook byte budget (preflight, before SheetJS parse). */
export const MAX_WORKBOOK_BYTES = 2_000_000

/** Maximum ZIP entries inspected during container preflight. */
export const MAX_WORKBOOK_ARCHIVE_ENTRIES = 200

/**
 * Aggregate advertised uncompressed entry size where ZIP metadata exposes
 * `originalSize`. Enforced in preflight when the field is present.
 */
export const MAX_WORKBOOK_ADVERTISED_EXPANDED_BYTES = 8_000_000

/** Per-entry advertised uncompressed size where observable. */
export const MAX_WORKBOOK_ENTRY_EXPANDED_BYTES = 4_000_000

/** Semantic workbook sheets counted toward the sheet budget (plus META). */
export const MAX_WORKBOOK_SHEETS = 12

/** Maximum data rows on CLUES (excluding header). */
export const MAX_CLUE_ROWS = 64

/** Maximum columns accepted on any semantic sheet. */
export const MAX_WORKBOOK_COLUMNS = 32

/** Maximum parsed non-empty cell values across semantic sheets. */
export const MAX_PARSED_CELLS = 4_000

/** Maximum merged ranges across the workbook. */
export const MAX_MERGED_RANGES = 64

/** Maximum raw string length for any single workbook cell. */
export const MAX_RAW_CELL_STRING_LENGTH = 2_000

/** Aggregate authored text budget across semantic cells. */
export const MAX_TOTAL_AUTHORED_TEXT = 200_000

/** Maximum rows on GAME / FINAL data regions (excluding header). */
export const MAX_GAME_ROWS = 8
export const MAX_FINAL_ROWS = 4
