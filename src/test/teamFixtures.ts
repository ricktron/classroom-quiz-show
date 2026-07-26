import { CANONICAL_GAME_FILE_FORMAT, SUPPORTED_SCHEMA_VERSION } from '../import/canonicalFormat'
import { richBoardConfig } from './categoryBoardFixtures'

/**
 * Shared team/scoring fixtures for the Slice 6 tests.
 *
 * Like the Slice 4 and Slice 5 fixtures these build UNTRUSTED plain objects on
 * purpose: the point of every test that uses them is to send authored-looking
 * data through the real schema, the real pipeline, or the real trusted
 * constructor. They are deliberately NOT `TeamDefinition`s.
 */

/** A minimal valid team, with overrides applied on top. */
export function team(
  id: string,
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return { id, name: `Team ${id}`, ...overrides }
}

/** `count` minimal valid teams: `t1`…`tN`. */
export function teamsList(count: number): Record<string, unknown>[] {
  return Array.from({ length: count }, (_unused, index) => team(`t${index + 1}`))
}

/** Two named teams with explicit accents — the everyday two-team classroom case. */
export function twoTeams(): Record<string, unknown>[] {
  return [
    { id: 'red', name: 'Red Team', accent: 'crimson' },
    { id: 'blue', name: 'Blue Team', accent: 'azure' },
  ]
}

/**
 * A canonical game file whose single round is a category board AND which
 * configures teams. `teams` is placed before `rounds` only for readability — the
 * schema is a strict object, so key order carries no meaning.
 */
export function teamBoardGameFile(
  teams: unknown = twoTeams(),
  config: Record<string, unknown> = richBoardConfig(),
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    format: CANONICAL_GAME_FILE_FORMAT,
    schemaVersion: SUPPORTED_SCHEMA_VERSION,
    id: 'team-board-game',
    title: 'Team Board Game',
    teams,
    rounds: [{ id: 'board-round', type: 'category-board', title: 'The Board', config }],
    ...overrides,
  }
}

/** The same document as JSON text, for the transport entry point. */
export function teamBoardGameFileText(
  teams: unknown = twoTeams(),
  config: Record<string, unknown> = richBoardConfig(),
): string {
  return JSON.stringify(teamBoardGameFile(teams, config), null, 2)
}
