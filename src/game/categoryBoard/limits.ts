/**
 * Bounded-input limits for the `category-board` round (Slice 5).
 *
 * Every limit here exists for a stated CLASSROOM reason, not as an arbitrary
 * round number. They follow the Slice 4 bounded-input philosophy (ADR-004): a
 * game file is validated against explicit bounds, an oversized board is
 * REJECTED with an actionable message, and nothing is ever silently truncated
 * into validity.
 *
 * The governing constraint is a projector at 1280×720 read from the back of a
 * classroom, plus a single class period of playing time.
 */

/**
 * Maximum categories (board columns).
 *
 * Rationale: at 1280×720 a column needs roughly 200 px to keep a category
 * header and its values legible from the back of a room. Six columns is the
 * common classroom board; eight is the point at which headers start wrapping to
 * three lines and values shrink below comfortable reading size, so it is the
 * hard ceiling rather than the recommendation.
 */
export const MAX_CATEGORIES = 8

/**
 * Maximum tiles in one category (board rows).
 *
 * Rationale: the approved default point ladder is 100–500 (five rows). Eight
 * rows covers a 100–800 ladder, which is the deepest ladder that still fits
 * vertically at a readable tile height on a 720p projector.
 */
export const MAX_TILES_PER_CATEGORY = 8

/**
 * Maximum tiles on the whole board.
 *
 * Rationale: a tile takes roughly 45–60 seconds of class time end to end
 * (select, read, discuss, reveal). 48 tiles is about 40 minutes of play — a
 * full period — and is the point past which a board cannot realistically be
 * finished in one lesson. It is deliberately lower than
 * `MAX_CATEGORIES × MAX_TILES_PER_CATEGORY` (64) for that reason.
 */
export const MAX_TOTAL_TILES = 48

/**
 * Maximum category title length.
 *
 * Rationale: a category header must fit on at most two projected lines inside a
 * ~200 px column. 60 characters is the practical limit at a readable size.
 */
export const MAX_CATEGORY_TITLE_LENGTH = 60

/**
 * Maximum prompt length.
 *
 * Rationale: a prompt is read aloud and projected at large type. 600 characters
 * is roughly six projected lines — long enough for a data-interpretation style
 * question stem, short enough to stay on one screen without scrolling.
 */
export const MAX_PROMPT_LENGTH = 600

/** Maximum canonical answer length. An answer is a phrase, not a paragraph. */
export const MAX_ANSWER_LENGTH = 300

/**
 * Maximum number of alternate acceptable answers per tile.
 *
 * Rationale: alternates are a host grading aid scanned at a glance mid-lesson.
 * Beyond about eight the host cannot read them quickly enough to be useful.
 */
export const MAX_ALTERNATES = 8

/** Maximum length of a single alternate. Same reasoning as the answer. */
export const MAX_ALTERNATE_LENGTH = 300

/**
 * Maximum teacher-note length.
 *
 * Rationale: notes are host-only teaching context (a misconception to watch
 * for, a follow-up question). 600 characters keeps the host panel scannable.
 */
export const MAX_NOTES_LENGTH = 600

/**
 * Maximum authored tile value.
 *
 * Rationale: keeps `value × multiplier` far inside the exact-integer range and
 * keeps displayed values to at most six digits, which still fits a tile.
 */
export const MAX_TILE_VALUE = 100_000

/**
 * Maximum multiplier.
 *
 * Rationale: a "double points" or "triple points" board is the real use case.
 * Ten is a generous ceiling that still bounds `effectiveValue` to 1,000,000.
 */
export const MAX_MULTIPLIER = 10

/**
 * The multiplier used when a tile omits the field.
 *
 * This default is applied ONLY by the trusted round-domain constructor
 * (`createCategoryBoardDefinition`), never by a Zod `.default()`/`.transform()`.
 * That distinction keeps the no-silent-repair policy honest: the import schema
 * validates exactly what was authored and reports exactly what was authored,
 * and the domain constructor then applies one documented, tested rule.
 */
export const DEFAULT_MULTIPLIER = 1
