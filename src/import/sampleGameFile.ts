import { CANONICAL_GAME_FILE_FORMAT, SUPPORTED_SCHEMA_VERSION } from './canonicalFormat'
import { importGameFromJsonText, type ImportOptions } from './importGame'
import type { ImportResult } from './result'

/**
 * Built-in canonical sample game FILES (Slice 4).
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
 *
 * Every round below is the non-gameplay `placeholder` type. There is no
 * gameplay content here — no categories, prompts, answers, points, or teams.
 */

/** A valid three-round sample that imports successfully. */
export const CANONICAL_SAMPLE_GAME_FILE = JSON.stringify(
  {
    format: CANONICAL_GAME_FILE_FORMAT,
    schemaVersion: SUPPORTED_SCHEMA_VERSION,
    id: 'imported-sample-game',
    title: 'Imported Sample Game',
    rounds: [
      {
        id: 'round-1',
        type: 'placeholder',
        title: 'Round One',
        config: { note: 'placeholder round — engine plumbing only, not gameplay' },
      },
      {
        id: 'round-2',
        type: 'placeholder',
        title: 'Round Two',
        config: { note: 'placeholder round — engine plumbing only, not gameplay' },
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
        type: 'category-board',
        title: 'Mystery Round',
        config: { note: 'this round type has no engine in this build' },
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
