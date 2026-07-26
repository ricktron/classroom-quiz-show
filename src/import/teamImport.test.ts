import { describe, expect, it } from 'vitest'
import { importGameFromJsonText, importGameFromUnknown } from './importGame'
import type { ImportIssue } from './issues'
import { IMPORT_ISSUE_CODES } from './issues'
import {
  CANONICAL_SAMPLE_CATEGORY_BOARD_FILE,
  CANONICAL_SAMPLE_GAME_FILE,
  CANONICAL_SAMPLE_WITH_DUPLICATE_TEAM_ID,
} from './sampleGameFile'
import { gameFile } from '../test/gameFileFixtures'
import { team, teamBoardGameFile, teamBoardGameFileText, teamsList, twoTeams } from '../test/teamFixtures'
import { MAX_TEAMS, MAX_TEAM_NAME_LENGTH } from '../game/teams/limits'
import { TEAM_ACCENTS } from '../game/teams/accents'
import type { ImportResult } from './result'

/**
 * Team configuration through the CANONICAL import pipeline (Slice 6).
 *
 * The claims proved here:
 *  - there is no second importer: teams travel the one Slice 4 pipeline and are
 *    validated by the same schema the trusted constructor uses;
 *  - every team failure carries a stable code and an EXACT document path;
 *  - nothing is repaired — no generated id, no rename, no de-duplication, no
 *    substituted accent, no dropped team, and no partial import;
 *  - an invalid team fails the WHOLE import, so a half-configured game can never
 *    reach the store.
 */

function importFile(document: Record<string, unknown>): ImportResult {
  return importGameFromUnknown(document)
}

function issuesOf(result: ImportResult): readonly ImportIssue[] {
  if (result.status !== 'failure') throw new Error('expected the import to fail')
  return result.issues
}

/** Assert exactly one issue, with the given code at the given path. */
function expectSingleIssue(
  result: ImportResult,
  code: string,
  path: string,
): ImportIssue {
  const issues = issuesOf(result)
  expect(issues).toHaveLength(1)
  expect(issues[0].code).toBe(code)
  expect(issues[0].path).toBe(path)
  return issues[0]
}

describe('valid team configuration', () => {
  it('imports a ONE-team game', () => {
    const result = importFile(teamBoardGameFile(teamsList(1)))
    expect(result.status).toBe('success')
    if (result.status !== 'success') return
    expect(result.definition.teams).toHaveLength(1)
  })

  it('imports a multi-team game and preserves AUTHORED order', () => {
    const result = importFile(
      teamBoardGameFile([team('zulu'), team('alpha'), team('mike')]),
    )
    if (result.status !== 'success') throw new Error('expected success')
    expect(result.definition.teams.map((t) => t.id)).toEqual(['zulu', 'alpha', 'mike'])
    expect(result.definition.teams.map((t) => t.order)).toEqual([0, 1, 2])
  })

  it('imports the maximum permitted team count', () => {
    const result = importFile(teamBoardGameFile(teamsList(MAX_TEAMS)))
    expect(result.status).toBe('success')
  })

  it('keeps a game with NO teams valid — the field is optional', () => {
    const result = importGameFromUnknown(gameFile())
    if (result.status !== 'success') throw new Error('expected success')
    expect(result.definition.teams).toEqual([])
  })

  it('applies the documented positional accent default only in the domain', () => {
    const result = importFile(teamBoardGameFile([team('a'), team('b')]))
    if (result.status !== 'success') throw new Error('expected success')
    expect(result.definition.teams.map((t) => t.accent)).toEqual([
      TEAM_ACCENTS[0],
      TEAM_ACCENTS[1],
    ])
  })

  it('accepts every accent in the application palette', () => {
    const teams = TEAM_ACCENTS.slice(0, MAX_TEAMS).map((accent, index) =>
      team(`t${index}`, { accent }),
    )
    expect(importFile(teamBoardGameFile(teams)).status).toBe('success')
  })

  it('produces DEEP-FROZEN teams on the trusted definition', () => {
    const result = importFile(teamBoardGameFile())
    if (result.status !== 'success') throw new Error('expected success')
    expect(Object.isFrozen(result.definition.teams)).toBe(true)
    expect(Object.isFrozen(result.definition.teams[0])).toBe(true)
  })

  it('does not mutate the imported document, and later mutation cannot reach it', () => {
    const document = teamBoardGameFile()
    const snapshot = JSON.stringify(document)
    const result = importFile(document)
    if (result.status !== 'success') throw new Error('expected success')
    expect(JSON.stringify(document)).toBe(snapshot)
    ;(document.teams as Record<string, unknown>[])[0].name = 'Changed'
    expect(result.definition.teams[0].name).toBe('Red Team')
  })

  it('imports identically through the TEXT entry point', () => {
    const fromText = importGameFromJsonText(teamBoardGameFileText())
    const fromObject = importFile(teamBoardGameFile())
    if (fromText.status !== 'success' || fromObject.status !== 'success') {
      throw new Error('expected success')
    }
    expect(fromText.definition.teams).toEqual(fromObject.definition.teams)
  })

  it('is deterministic — the same document always yields the same teams', () => {
    const first = importFile(teamBoardGameFile())
    const second = importFile(teamBoardGameFile())
    if (first.status !== 'success' || second.status !== 'success') throw new Error('nope')
    expect(first.definition.teams).toEqual(second.definition.teams)
  })
})

describe('team failures carry exact paths and stable codes', () => {
  it('reports a duplicate team id at the offending index', () => {
    const issue = expectSingleIssue(
      importFile(teamBoardGameFile([team('red'), team('red')])),
      'duplicate-team-id',
      'teams[1].id',
    )
    expect(issue.stage).toBe('schema')
    expect(issue.message).toContain('teams[0]')
  })

  it('reports a blank team name at the offending index', () => {
    expectSingleIssue(
      importFile(teamBoardGameFile([team('red', { name: '   ' })])),
      'blank-text',
      'teams[0].name',
    )
  })

  it('reports an invalid accent and NAMES the permitted values', () => {
    const issue = expectSingleIssue(
      importFile(teamBoardGameFile([team('red', { accent: 'ultraviolet' })])),
      'invalid-team-accent',
      'teams[0].accent',
    )
    for (const accent of TEAM_ACCENTS) expect(issue.message).toContain(accent)
  })

  it('rejects a raw colour, a gradient and a style string as accents', () => {
    for (const accent of [
      '#ff0000',
      'rgb(255,0,0)',
      'linear-gradient(red, blue)',
      'red; background: url(https://x/y)',
      'my-class',
    ]) {
      const result = importFile(teamBoardGameFile([team('red', { accent })]))
      expect(result.status).toBe('failure')
    }
  })

  it('reports a malformed teams array at the `teams` path', () => {
    expectSingleIssue(importFile(teamBoardGameFile('red')), 'invalid-type', 'teams')
    expectSingleIssue(importFile(teamBoardGameFile({ red: 'Red' })), 'invalid-type', 'teams')
  })

  it('reports an excessive team count at the `teams` path', () => {
    expectSingleIssue(
      importFile(teamBoardGameFile(teamsList(MAX_TEAMS + 1))),
      'value-too-large',
      'teams',
    )
  })

  it('reports an EMPTY teams array, telling the author to omit the field', () => {
    const issue = expectSingleIssue(importFile(teamBoardGameFile([])), 'value-too-small', 'teams')
    expect(issue.message).toMatch(/omit the "teams" field/i)
  })

  it('reports an unknown team field by name, rather than dropping it', () => {
    expectSingleIssue(
      importFile(teamBoardGameFile([team('red', { colour: 'red' })])),
      'unknown-field',
      'teams[0].colour',
    )
  })

  it('rejects a `score` field on an authored team — scores are session state', () => {
    expectSingleIssue(
      importFile(teamBoardGameFile([team('red', { score: 500 })])),
      'unknown-field',
      'teams[0].score',
    )
  })

  it('reports a missing id as missing, and never generates one', () => {
    const issue = expectSingleIssue(
      importFile(teamBoardGameFile([{ name: 'Nameless' }])),
      'missing-field',
      'teams[0].id',
    )
    expect(issue.message).toMatch(/required but missing/i)
  })

  it('reports an id that breaks the identifier grammar', () => {
    expectSingleIssue(
      importFile(teamBoardGameFile([team('_leading-underscore')])),
      'invalid-format',
      'teams[0].id',
    )
  })

  it('reports an overlong name as too large, and never truncates it', () => {
    expectSingleIssue(
      importFile(teamBoardGameFile([team('red', { name: 'x'.repeat(MAX_TEAM_NAME_LENGTH + 1) })])),
      'value-too-large',
      'teams[0].name',
    )
  })

  it('coerces nothing — a numeric id stays an error', () => {
    expectSingleIssue(
      importFile(teamBoardGameFile([{ id: 7, name: 'Seven' }])),
      'invalid-type',
      'teams[0].id',
    )
  })

  it('reports EVERY independent team problem at once', () => {
    const issues = issuesOf(
      importFile(
        teamBoardGameFile([
          team('red'),
          team('red', { name: '  ' }),
          team('blue', { accent: 'nope' }),
        ]),
      ),
    )
    expect(issues.map((issue) => issue.path).sort()).toEqual([
      'teams[1].id',
      'teams[1].name',
      'teams[2].accent',
    ])
  })

  it('reports team problems ALONGSIDE other schema-stage problems', () => {
    const document = teamBoardGameFile([team('red'), team('red')])
    ;(document.rounds as Record<string, unknown>[])[0].title = 42
    const issues = issuesOf(importFile(document))
    expect(issues.map((issue) => issue.path).sort()).toEqual([
      'rounds[0].title',
      'teams[1].id',
    ])
  })

  it('defers per-round CONFIG problems until teams validate (documented stage order)', () => {
    // Teams are validated at the `schema` stage, while a round type's own config
    // schema is applied at the later registry-driven step. A failing team therefore
    // short-circuits before config validation, so the teacher fixes the teams first
    // and then sees any board problems. This is the pipeline's existing stage
    // ordering, recorded here rather than assumed either way.
    const brokenBoard = {
      categories: [{ id: 'c', title: 'C', tiles: [{ id: 't', value: 100, prompt: 'p', answer: '  ' }] }],
    }
    const withBadTeams = importFile(teamBoardGameFile([team('red'), team('red')], brokenBoard))
    expect(issuesOf(withBadTeams).map((issue) => issue.path)).toEqual(['teams[1].id'])

    // With the teams fixed, the board problem surfaces with its exact path.
    const withGoodTeams = importFile(teamBoardGameFile(twoTeams(), brokenBoard))
    expect(issuesOf(withGoodTeams).map((issue) => issue.path)).toEqual([
      'rounds[0].config.categories[0].tiles[0].answer',
    ])
  })

  it('never uses an issue code that is not in the stable list', () => {
    const issues = issuesOf(importFile(teamBoardGameFile([team('red'), team('red')])))
    for (const issue of issues) {
      expect(IMPORT_ISSUE_CODES as readonly string[]).toContain(issue.code)
    }
  })
})

describe('an invalid team fails the WHOLE import', () => {
  it('yields no definition at all, not a game with the bad team removed', () => {
    const result = importFile(teamBoardGameFile([team('red'), team('red')]))
    expect(result.status).toBe('failure')
    expect(result).not.toHaveProperty('definition')
  })

  it('rejects a function anywhere inside teams before Zod even runs', () => {
    const document = teamBoardGameFile([{ id: 'red', name: 'Red', accent: () => 'crimson' }])
    const issues = issuesOf(importFile(document))
    expect(issues[0].code).toBe('non-data-value')
    expect(issues[0].path).toBe('teams[0].accent')
  })

  it('rejects a reserved key inside a team', () => {
    const document = teamBoardGameFile([
      JSON.parse('{"id":"red","name":"Red","__proto__":{"polluted":true}}') as unknown,
    ])
    const issues = issuesOf(importFile(document))
    expect(issues.some((issue) => issue.code === 'unsafe-object-key')).toBe(true)
  })
})

describe('the built-in samples', () => {
  it('configure teams on the valid multi-round sample', () => {
    const result = importGameFromJsonText(CANONICAL_SAMPLE_GAME_FILE)
    if (result.status !== 'success') throw new Error('the built-in sample must import')
    expect(result.definition.teams.map((t) => t.name)).toEqual(['Blue Basalts', 'Red Rhyolites'])
  })

  it('configure teams on the single-round board sample', () => {
    const result = importGameFromJsonText(CANONICAL_SAMPLE_CATEGORY_BOARD_FILE)
    if (result.status !== 'success') throw new Error('the built-in sample must import')
    expect(result.definition.teams).toHaveLength(2)
    expect(result.definition.teams.map((t) => t.accent)).toEqual(['azure', 'crimson'])
  })

  it('include a duplicate-team-id sample that fails with an exact path', () => {
    const result = importGameFromJsonText(CANONICAL_SAMPLE_WITH_DUPLICATE_TEAM_ID)
    expectSingleIssue(result, 'duplicate-team-id', 'teams[1].id')
  })
})
