import { CANONICAL_GAME_FILE_FORMAT, SUPPORTED_SCHEMA_VERSION } from '../import/canonicalFormat'

/**
 * Shared `category-board` fixtures for the Slice 5 tests.
 *
 * Like the Slice 4 fixtures these build UNTRUSTED plain objects on purpose: the
 * point of every test that uses them is to send authored-looking data through
 * the real schema, the real pipeline, or the real trusted constructor. They are
 * deliberately NOT `CategoryBoardDefinition`s.
 */

/** A minimal valid tile, with overrides applied on top. */
export function tile(id: string, overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id,
    value: 100,
    prompt: `Prompt for ${id}`,
    answer: `Answer for ${id}`,
    ...overrides,
  }
}

/** A valid Slice 11 image prompt pointing at the committed fixture PNG. */
export function imagePrompt(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    kind: 'image',
    source: { kind: 'same-origin-path', path: 'media-fixtures/slice-11-clue.png' },
    alt: 'Slice 11 clue fixture image',
    caption: 'CI media fixture',
    attribution: 'Test asset',
    ...overrides,
  }
}

/** A minimal valid category, with overrides applied on top. */
export function category(
  id: string,
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return { id, title: `Category ${id}`, tiles: [tile(`${id}-100`)], ...overrides }
}

/** A minimal valid single-category board config. */
export function boardConfig(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return { categories: [category('alpha')], ...overrides }
}

/**
 * A richer, deliberately UNEVEN two-category board exercising every optional
 * field: alternates, teacher notes, and a multiplier. Category `alpha` has
 * three tiles; `beta` has two.
 */
export function richBoardConfig(): Record<string, unknown> {
  return {
    categories: [
      {
        id: 'alpha',
        title: 'Alpha Category',
        tiles: [
          {
            id: 'alpha-100',
            value: 100,
            prompt: 'Alpha one hundred prompt',
            answer: 'Alpha one hundred answer',
            alternates: ['A100 alternate'],
            notes: 'ALPHA-TEACHER-NOTE-100',
          },
          { id: 'alpha-200', value: 200, prompt: 'Alpha two hundred prompt', answer: 'Alpha two hundred answer' },
          {
            id: 'alpha-300',
            value: 300,
            multiplier: 2,
            prompt: 'Alpha three hundred prompt',
            answer: 'Alpha three hundred answer',
            notes: 'ALPHA-TEACHER-NOTE-300',
          },
        ],
      },
      {
        id: 'beta',
        title: 'Beta Category',
        tiles: [
          {
            id: 'beta-100',
            value: 100,
            prompt: 'Beta one hundred prompt',
            answer: 'Beta one hundred answer',
            alternates: ['B100 alternate one', 'B100 alternate two'],
            notes: 'BETA-TEACHER-NOTE-100',
          },
          { id: 'beta-500', value: 500, prompt: 'Beta five hundred prompt', answer: 'Beta five hundred answer' },
        ],
      },
    ],
  }
}

/** A canonical game file whose single round is a category board. */
export function boardGameFile(
  config: Record<string, unknown> = richBoardConfig(),
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    format: CANONICAL_GAME_FILE_FORMAT,
    schemaVersion: SUPPORTED_SCHEMA_VERSION,
    id: 'board-game',
    title: 'Board Game',
    rounds: [{ id: 'board-round', type: 'category-board', title: 'The Board', config }],
    ...overrides,
  }
}

/** The same document as JSON text, for the transport entry point. */
export function boardGameFileText(
  config: Record<string, unknown> = richBoardConfig(),
  overrides: Record<string, unknown> = {},
): string {
  return JSON.stringify(boardGameFile(config, overrides), null, 2)
}
