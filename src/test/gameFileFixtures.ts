import {
  CANONICAL_GAME_FILE_FORMAT,
  SUPPORTED_SCHEMA_VERSION,
} from '../import/canonicalFormat'

/**
 * Shared canonical game-file fixtures for the Slice 4 import tests.
 *
 * These build UNTRUSTED plain objects/text on purpose — the point of every test
 * that uses them is to send untrusted input through the real pipeline. They are
 * deliberately NOT `GameDefinition`s; a test that wants a trusted definition
 * uses `src/game/sampleGame.ts` instead.
 */

/** A single valid placeholder round. */
export function roundFile(id: string, title = `Title ${id}`): Record<string, unknown> {
  return { id, type: 'placeholder', title, config: { note: 'engine plumbing only' } }
}

/** A valid canonical document, with overrides applied on top. */
export function gameFile(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    format: CANONICAL_GAME_FILE_FORMAT,
    schemaVersion: SUPPORTED_SCHEMA_VERSION,
    id: 'sample-game',
    title: 'Sample Game',
    rounds: [roundFile('round-1')],
    ...overrides,
  }
}

/** The same document as JSON text, for the transport entry point. */
export function gameFileText(overrides: Record<string, unknown> = {}): string {
  return JSON.stringify(gameFile(overrides), null, 2)
}
