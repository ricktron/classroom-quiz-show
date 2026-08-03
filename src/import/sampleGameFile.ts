import { CANONICAL_GAME_FILE_FORMAT, SUPPORTED_SCHEMA_VERSION } from './canonicalFormat'
import { importGameFromJsonText, type ImportOptions } from './importGame'
import type { ImportResult } from './result'

/**
 * Built-in canonical sample game FILES (Slice 4, extended in Slice 5).
 *
 * These are deliberately JSON **text**, not `GameDefinition` objects: the
 * built-in samples the host harness offers must travel the same untrusted path
 * as anything a teacher pastes. There is no privileged "the app made it, so
 * trust it" shortcut — `importBuiltInSampleGame()` runs the full pipeline and
 * can fail exactly like any other import.
 *
 * (This is distinct from `src/game/sampleGame.ts`, which builds *trusted
 * in-memory* Slice 3 fixtures through the domain constructor. That remains the
 * right tool for application-created fixtures; it is not an import path.)
 */

/**
 * A round type that is deliberately NOT registered in any build.
 *
 * Slices 3 and 4 used the string `category-board` for this, because no round
 * engine existed yet. Slice 5 registers `category-board` for real, so the
 * negative fixture moved to a name that is not on the roadmap at all and can
 * therefore never become registered by accident. It still satisfies the
 * canonical round-type grammar, so it fails at the `registry` stage — which is
 * exactly the failure these fixtures exist to demonstrate.
 */
export const UNREGISTERED_ROUND_TYPE = 'not-a-real-round-type'

/**
 * A small Earth & Space Science board used by the valid samples. It exercises
 * every optional field: alternates, host-only teacher notes, a multiplier, and
 * deliberately UNEVEN category lengths (three tiles, then two).
 *
 * The point values follow the approved default ladder (100, 200, 300…). The
 * `plate-tectonics-300` tile carries `multiplier: 2`, so it displays 600.
 */
const SAMPLE_CATEGORY_BOARD_CONFIG = {
  categories: [
    {
      id: 'earth-structure',
      title: 'Earth Structure',
      tiles: [
        {
          id: 'earth-structure-100',
          value: 100,
          prompt: 'Which layer of the Earth lies directly beneath the crust?',
          answer: 'The mantle',
          alternates: ['Mantle', 'Upper mantle'],
          notes: 'Students often say "core" — ask them to order all four layers.',
        },
        {
          id: 'earth-structure-200',
          value: 200,
          prompt: 'Which Earth layer is liquid?',
          answer: 'The outer core',
          alternates: ['Outer core'],
        },
        {
          id: 'earth-structure-300',
          value: 300,
          prompt:
            'The boundary between the crust and the mantle is named after the scientist who discovered it. What is it called?',
          answer: 'The Mohorovicic discontinuity',
          alternates: ['The Moho', 'Moho'],
          notes: 'Accept "the Moho" — the full name is a stretch goal, not the target.',
        },
      ],
    },
    {
      id: 'plate-tectonics',
      title: 'Plate Tectonics',
      tiles: [
        {
          id: 'plate-tectonics-100',
          value: 100,
          prompt: 'What type of plate boundary forms when two plates move apart?',
          answer: 'A divergent boundary',
          alternates: ['Divergent'],
        },
        {
          id: 'plate-tectonics-300',
          value: 300,
          multiplier: 2,
          prompt: 'Name the process that drives plate motion in the mantle.',
          answer: 'Convection',
          alternates: ['Mantle convection', 'Convection currents'],
          notes: 'Double-value tile: worth 600. Push for the mechanism, not the word.',
        },
      ],
    },
  ],
}

/**
 * Two teams for the built-in samples (Slice 6).
 *
 * They name accents from the application palette — which is the ONLY thing a game
 * file may say about presentation. The names are Earth-science flavoured so the
 * sample reads like a real classroom game rather than "Team 1 / Team 2".
 */
const SAMPLE_TEAMS = [
  { id: 'basalts', name: 'Blue Basalts', accent: 'azure' },
  { id: 'rhyolites', name: 'Red Rhyolites', accent: 'crimson' },
]

/**
 * The valid built-in sample. It now contains a REAL playable `category-board`
 * round alongside a non-gameplay `placeholder` round, so importing it proves
 * both round types travel the one canonical pipeline.
 */
export const CANONICAL_SAMPLE_GAME_FILE = JSON.stringify(
  {
    format: CANONICAL_GAME_FILE_FORMAT,
    schemaVersion: SUPPORTED_SCHEMA_VERSION,
    id: 'imported-sample-game',
    title: 'Imported Sample Game',
    teams: SAMPLE_TEAMS,
    rounds: [
      {
        id: 'round-1',
        type: 'placeholder',
        title: 'Round One',
        config: { note: 'placeholder round — engine plumbing only, not gameplay' },
      },
      {
        id: 'round-2',
        type: 'category-board',
        title: 'Earth & Space Warm-Up',
        config: SAMPLE_CATEGORY_BOARD_CONFIG,
      },
      {
        id: 'round-3',
        type: 'placeholder',
        title: 'Round Three',
        config: { note: 'placeholder round — engine plumbing only, not gameplay' },
      },
    ],
  },
  null,
  2,
)

/**
 * A single-round category-board file. This is the sample a teacher would start
 * from, and the one the host harness offers for playing the board immediately.
 */
export const CANONICAL_SAMPLE_CATEGORY_BOARD_FILE = JSON.stringify(
  {
    format: CANONICAL_GAME_FILE_FORMAT,
    schemaVersion: SUPPORTED_SCHEMA_VERSION,
    id: 'imported-sample-board',
    title: 'Earth & Space Science Board',
    teams: SAMPLE_TEAMS,
    /**
     * An authored response window (Slice 7). The three-round sample above
     * deliberately omits the block, so between them the two built-in samples
     * exercise BOTH paths: an authored duration, and the documented default a
     * pre-Slice-7 game file still gets.
     */
    timer: { responseSeconds: 45 },
    rounds: [
      {
        id: 'board-round',
        type: 'category-board',
        title: 'Earth & Space Science',
        config: SAMPLE_CATEGORY_BOARD_CONFIG,
      },
    ],
  },
  null,
  2,
)

/**
 * The Final Wager sample config (Slice 14). It exercises every optional field:
 * alternates and a host-only teaching note, both of which must never reach the
 * projector at any stage.
 */
const SAMPLE_FINAL_WAGER_CONFIG = {
  prompt:
    'This process moves heat through the mantle and is the engine that drives plate motion. Name it.',
  answer: 'Mantle convection',
  alternates: ['Convection currents', 'Convection in the mantle'],
  notes: 'Students often answer "the core" — press for the mechanism, not the source.',
}

/**
 * A board round followed by a Final Wager round (Slice 14) — the sample a
 * teacher plays a whole lesson from, and the one the host harness offers for
 * exercising Final immediately.
 *
 * The board comes FIRST on purpose: Final must be the terminal round (the import
 * boundary enforces it), and a preceding board is also what gives a team on zero
 * or a negative score a non-zero wager cap under CQS-OD-006.
 */
export const CANONICAL_SAMPLE_FINAL_WAGER_FILE = JSON.stringify(
  {
    format: CANONICAL_GAME_FILE_FORMAT,
    schemaVersion: SUPPORTED_SCHEMA_VERSION,
    id: 'imported-sample-final',
    title: 'Earth & Space Science with Final',
    teams: SAMPLE_TEAMS,
    timer: { responseSeconds: 30 },
    rounds: [
      {
        id: 'board-round',
        type: 'category-board',
        title: 'Earth & Space Science',
        config: SAMPLE_CATEGORY_BOARD_CONFIG,
      },
      {
        id: 'final-round',
        type: 'final-wager',
        title: 'Final Wager',
        config: SAMPLE_FINAL_WAGER_CONFIG,
      },
    ],
  },
  null,
  2,
)

/**
 * A sample whose second round declares an UNREGISTERED type. It exists to
 * demonstrate that the import boundary rejects it outright — the host sees an
 * actionable error and no game is loaded, rather than a half-valid game with a
 * dead round.
 */
export const CANONICAL_SAMPLE_WITH_UNKNOWN_ROUND_TYPE = JSON.stringify(
  {
    format: CANONICAL_GAME_FILE_FORMAT,
    schemaVersion: SUPPORTED_SCHEMA_VERSION,
    id: 'imported-sample-unknown-type',
    title: 'Imported Sample (unregistered round type)',
    rounds: [
      {
        id: 'supported-1',
        type: 'placeholder',
        title: 'Supported Round',
        config: { note: 'placeholder round — engine plumbing only, not gameplay' },
      },
      {
        id: 'mystery-round',
        type: UNREGISTERED_ROUND_TYPE,
        title: 'Mystery Round',
        config: { note: 'this round type has no engine in this build' },
      },
    ],
  },
  null,
  2,
)

/**
 * A category-board file with two DIFFERENT tiles sharing one id. It exists to
 * demonstrate a precise, actionable content error with an exact document path
 * (`rounds[0].config.categories[0].tiles[1].id`) and no silent repair: the id
 * is not renamed and the duplicate tile is not dropped.
 */
export const CANONICAL_SAMPLE_WITH_DUPLICATE_TILE_ID = JSON.stringify(
  {
    format: CANONICAL_GAME_FILE_FORMAT,
    schemaVersion: SUPPORTED_SCHEMA_VERSION,
    id: 'imported-sample-duplicate-tile',
    title: 'Imported Sample (duplicate tile id)',
    rounds: [
      {
        id: 'board-round',
        type: 'category-board',
        title: 'Broken Board',
        config: {
          categories: [
            {
              id: 'weather',
              title: 'Weather',
              tiles: [
                { id: 'weather-100', value: 100, prompt: 'What is fog?', answer: 'A cloud at ground level' },
                { id: 'weather-100', value: 200, prompt: 'What is dew point?', answer: 'The temperature at which air saturates' },
              ],
            },
          ],
        },
      },
    ],
  },
  null,
  2,
)

/**
 * A file with two DIFFERENT teams sharing one id (Slice 6). It exists to
 * demonstrate a precise, actionable team error with an exact document path
 * (`teams[1].id`) and no silent repair: the id is not renamed, the second team is
 * not dropped, and no game is loaded.
 */
export const CANONICAL_SAMPLE_WITH_DUPLICATE_TEAM_ID = JSON.stringify(
  {
    format: CANONICAL_GAME_FILE_FORMAT,
    schemaVersion: SUPPORTED_SCHEMA_VERSION,
    id: 'imported-sample-duplicate-team',
    title: 'Imported Sample (duplicate team id)',
    teams: [
      { id: 'basalts', name: 'Blue Basalts', accent: 'azure' },
      { id: 'basalts', name: 'Red Rhyolites', accent: 'crimson' },
    ],
    rounds: [
      {
        id: 'board-round',
        type: 'category-board',
        title: 'Earth & Space Science',
        config: SAMPLE_CATEGORY_BOARD_CONFIG,
      },
    ],
  },
  null,
  2,
)

/** Import the built-in valid sample through the canonical pipeline. */
export function importBuiltInSampleGame(options: ImportOptions = {}): ImportResult {
  return importGameFromJsonText(CANONICAL_SAMPLE_GAME_FILE, options)
}

/** Import the built-in single-round category board through the same pipeline. */
/** Import the built-in board + Final sample through the ONE pipeline (Slice 14). */
export function importBuiltInFinalWagerGame(options: ImportOptions = {}): ImportResult {
  return importGameFromJsonText(CANONICAL_SAMPLE_FINAL_WAGER_FILE, options)
}

export function importBuiltInCategoryBoardGame(options: ImportOptions = {}): ImportResult {
  return importGameFromJsonText(CANONICAL_SAMPLE_CATEGORY_BOARD_FILE, options)
}
