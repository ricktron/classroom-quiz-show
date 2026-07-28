import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MAX_IMPORT_TEXT_LENGTH } from '../import/canonicalFormat'
import { importGameFromJsonText } from '../import/importGame'
import { createGameDefinition, GAME_DEFINITION_MODEL_VERSION } from '../game/gameDefinition'
import { roundId, roundType } from '../game/ids'
import { placeholderRound } from '../game/roundDefinition'
import { createTeamDefinitions } from '../game/teams/definition'
import { DEFAULT_RESPONSE_SECONDS } from '../game/timing/limits'
import {
  boardGameFileText,
  imagePrompt,
  richBoardConfig,
} from '../test/categoryBoardFixtures'
import { gameFileText, roundFile } from '../test/gameFileFixtures'
import { teamBoardGameFile, teamBoardGameFileText, twoTeams } from '../test/teamFixtures'
import { exportGameDefinition } from './exportGame'

vi.mock('../import/importGame', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../import/importGame')>()
  return {
    ...actual,
    importGameFromJsonText: vi.fn(actual.importGameFromJsonText),
  }
})

const mockedImport = vi.mocked(importGameFromJsonText)

async function loadDefinition(text: string) {
  const actual = await vi.importActual<typeof import('../import/importGame')>(
    '../import/importGame',
  )
  const imported = actual.importGameFromJsonText(text)
  expect(imported.status).toBe('success')
  if (imported.status !== 'success') throw new Error('fixture import failed')
  return imported.definition
}

function parseExported(jsonText: string): Record<string, unknown> {
  expect(jsonText.endsWith('\n')).toBe(true)
  expect(jsonText.endsWith('\n\n')).toBe(false)
  expect(jsonText).not.toContain('\r')
  return JSON.parse(jsonText) as Record<string, unknown>
}

beforeEach(async () => {
  const actual = await vi.importActual<typeof import('../import/importGame')>(
    '../import/importGame',
  )
  mockedImport.mockReset()
  mockedImport.mockImplementation(actual.importGameFromJsonText)
})

describe('exportGameDefinition', () => {
  it('exports an empty-round game', async () => {
    const definition = await loadDefinition(
      gameFileText({ id: 'empty-rounds', title: 'Empty', rounds: [] }),
    )
    const result = exportGameDefinition(definition)
    expect(result.status).toBe('success')
    if (result.status !== 'success') return
    expect(parseExported(result.jsonText).rounds).toEqual([])
    expect(result.metadata.roundCount).toBe(0)
  })

  it('omits teams when the game has no teams', async () => {
    const definition = await loadDefinition(gameFileText({ id: 'no-teams-game' }))
    const result = exportGameDefinition(definition)
    expect(result.status).toBe('success')
    if (result.status !== 'success') return
    expect(Object.hasOwn(parseExported(result.jsonText), 'teams')).toBe(false)
    expect(result.metadata.teamCount).toBe(0)
  })

  it('emits non-empty teams with explicit accents and preserved order', async () => {
    const definition = await loadDefinition(
      teamBoardGameFileText([
        { id: 'blue', name: 'Blue Team', accent: 'azure' },
        { id: 'red', name: 'Red Team', accent: 'crimson' },
      ]),
    )
    const result = exportGameDefinition(definition)
    expect(result.status).toBe('success')
    if (result.status !== 'success') return
    const doc = parseExported(result.jsonText)
    expect(doc.teams).toEqual([
      { id: 'blue', name: 'Blue Team', accent: 'azure' },
      { id: 'red', name: 'Red Team', accent: 'crimson' },
    ])
    const first = (doc.teams as Record<string, unknown>[])[0]!
    expect(Object.keys(first)).toEqual(['id', 'name', 'accent'])
    expect(Object.hasOwn(first, 'order')).toBe(false)
  })

  it('emits defaulted accents explicitly', async () => {
    const definition = await loadDefinition(
      teamBoardGameFileText([
        { id: 'a', name: 'Alpha' },
        { id: 'b', name: 'Beta' },
      ]),
    )
    expect(definition.teams[0]!.accent).toBe('crimson')
    expect(definition.teams[1]!.accent).toBe('azure')
    const result = exportGameDefinition(definition)
    expect(result.status).toBe('success')
    if (result.status !== 'success') return
    expect(parseExported(result.jsonText).teams).toEqual([
      { id: 'a', name: 'Alpha', accent: 'crimson' },
      { id: 'b', name: 'Beta', accent: 'azure' },
    ])
  })

  it('always emits an explicit timer, including the default', async () => {
    const omitted = await loadDefinition(gameFileText({ id: 'default-timer-game' }))
    expect(omitted.timer.responseSeconds).toBe(DEFAULT_RESPONSE_SECONDS)
    const omittedExport = exportGameDefinition(omitted)
    expect(omittedExport.status).toBe('success')
    if (omittedExport.status !== 'success') return
    const omittedDoc = parseExported(omittedExport.jsonText)
    expect(omittedDoc.timer).toEqual({ responseSeconds: DEFAULT_RESPONSE_SECONDS })
    expect(Object.keys(omittedDoc.timer as object)).toEqual(['responseSeconds'])

    const custom = await loadDefinition(
      gameFileText({
        id: 'custom-timer-game',
        timer: { responseSeconds: 45 },
      }),
    )
    const customExport = exportGameDefinition(custom)
    expect(customExport.status).toBe('success')
    if (customExport.status !== 'success') return
    expect(parseExported(customExport.jsonText).timer).toEqual({ responseSeconds: 45 })
  })

  it('preserves round order and serializes stored config rather than a derived board', async () => {
    const definition = await loadDefinition(
      JSON.stringify({
        format: 'classroom-quiz-show/game',
        schemaVersion: 1,
        id: 'order-game',
        title: 'Order Game',
        rounds: [
          {
            id: 'r-b',
            type: 'placeholder',
            title: 'Second',
            config: { note: 'b' },
          },
          {
            id: 'r-a',
            type: 'category-board',
            title: 'First board',
            config: {
              categories: [
                {
                  id: 'cat',
                  title: 'Cat',
                  tiles: [
                    {
                      id: 't1',
                      value: 100,
                      prompt: 'plain string prompt',
                      answer: 'Ans',
                    },
                  ],
                },
              ],
            },
          },
        ],
      }),
    )
    const result = exportGameDefinition(definition)
    expect(result.status).toBe('success')
    if (result.status !== 'success') return
    const doc = parseExported(result.jsonText)
    const rounds = doc.rounds as Record<string, unknown>[]
    expect(rounds.map((r) => r.id)).toEqual(['r-b', 'r-a'])
    expect(Object.keys(rounds[0]!)).toEqual(['id', 'type', 'title', 'config'])
    const tileConfig = (
      rounds[1]!.config as { categories: { tiles: Record<string, unknown>[] }[] }
    ).categories[0]!.tiles[0]!
    expect(tileConfig.prompt).toBe('plain string prompt')
    expect(Object.hasOwn(tileConfig, 'multiplier')).toBe(false)
  })

  it('never sorts arrays while recursively sorting generic object keys', async () => {
    const definition = await loadDefinition(
      boardGameFileText(
        {
          categories: [
            {
              id: 'alpha',
              title: 'Alpha',
              tiles: [
                {
                  id: 'alpha-100',
                  value: 100,
                  prompt: {
                    kind: 'image',
                    source: { kind: 'same-origin-path', path: 'media-fixtures/slice-11-clue.png' },
                    alt: 'Alt text',
                    caption: 'Caption',
                    attribution: 'Attribution',
                  },
                  answer: 'Ans',
                  alternates: ['z', 'a', 'm'],
                },
              ],
            },
          ],
        },
        { id: 'array-order' },
      ),
    )
    const result = exportGameDefinition(definition)
    expect(result.status).toBe('success')
    if (result.status !== 'success') return
    const tileConfig = (
      parseExported(result.jsonText).rounds as {
        config: { categories: { tiles: Record<string, unknown>[] }[] }
      }[]
    )[0]!.config.categories[0]!.tiles[0]!
    expect(tileConfig.alternates).toEqual(['z', 'a', 'm'])
    expect(Object.keys(tileConfig.prompt as object)).toEqual([
      'alt',
      'attribution',
      'caption',
      'kind',
      'source',
    ])
    expect(Object.keys((tileConfig.prompt as { source: object }).source)).toEqual(['kind', 'path'])
  })

  it('preserves legacy text prompts, image prompts, alternates, notes, values, and multipliers', async () => {
    const config = {
      categories: [
        {
          id: 'alpha',
          title: 'Alpha',
          tiles: [
            {
              id: 'alpha-100',
              value: 100,
              prompt: 'Legacy text',
              answer: 'Text answer',
              alternates: ['Alt A', 'Alt B'],
              notes: 'Teacher note',
            },
            {
              id: 'alpha-200',
              value: 200,
              multiplier: 2,
              prompt: imagePrompt(),
              answer: 'Image answer',
            },
          ],
        },
      ],
    }
    const definition = await loadDefinition(
      boardGameFileText(config, {
        id: 'media-rich',
        title: 'Media Rich',
        teams: twoTeams(),
        timer: { responseSeconds: 45 },
      }),
    )
    const result = exportGameDefinition(definition)
    expect(result.status).toBe('success')
    if (result.status !== 'success') return
    expect(result.metadata.hasMediaReferences).toBe(true)
    const tiles = (
      parseExported(result.jsonText).rounds as {
        config: { categories: { tiles: Record<string, unknown>[] }[] }
      }[]
    )[0]!.config.categories[0]!.tiles
    expect(tiles[0]!.prompt).toBe('Legacy text')
    expect(tiles[0]!.alternates).toEqual(['Alt A', 'Alt B'])
    expect(tiles[0]!.notes).toBe('Teacher note')
    expect(tiles[0]!.value).toBe(100)
    expect(tiles[1]!.multiplier).toBe(2)
    expect(tiles[1]!.prompt).toEqual({
      alt: 'Slice 11 clue fixture image',
      attribution: 'Test asset',
      caption: 'CI media fixture',
      kind: 'image',
      source: { kind: 'same-origin-path', path: 'media-fixtures/slice-11-clue.png' },
    })
    expect(Object.keys(tiles[1]!.prompt as object)).toEqual([
      'alt',
      'attribution',
      'caption',
      'kind',
      'source',
    ])
  })

  it('preserves game id, exact filename, root field order, compact JSON, and one trailing LF', async () => {
    const definition = await loadDefinition(
      JSON.stringify(
        teamBoardGameFile(twoTeams(), richBoardConfig(), {
          id: 'ecology-review',
          title: 'Ecology Review',
          timer: { responseSeconds: 45 },
        }),
      ),
    )
    const result = exportGameDefinition(definition)
    expect(result.status).toBe('success')
    if (result.status !== 'success') return
    expect(result.filename).toBe('ecology-review.classroom-quiz-show.json')
    expect(result.metadata.gameId).toBe('ecology-review')
    expect(result.jsonText.endsWith('\n')).toBe(true)
    expect(result.jsonText.indexOf('\n')).toBe(result.jsonText.length - 1)
    expect(result.jsonText).not.toContain('\r')
    expect(result.jsonText.startsWith('\uFEFF')).toBe(false)
    const withoutLf = result.jsonText.slice(0, -1)
    expect(withoutLf).toBe(JSON.stringify(JSON.parse(withoutLf)))
    expect(Object.keys(parseExported(result.jsonText))).toEqual([
      'format',
      'schemaVersion',
      'id',
      'title',
      'teams',
      'timer',
      'rounds',
    ])
  })

  it('produces byte-identical repeated exports and export-of-reimport', async () => {
    const definition = await loadDefinition(
      JSON.stringify(
        teamBoardGameFile(twoTeams(), richBoardConfig(), {
          id: 'stable-export',
          timer: { responseSeconds: 60 },
        }),
      ),
    )
    const first = exportGameDefinition(definition)
    const second = exportGameDefinition(definition)
    expect(first.status).toBe('success')
    expect(second.status).toBe('success')
    if (first.status !== 'success' || second.status !== 'success') return
    expect(second.jsonText).toBe(first.jsonText)

    const reimported = await loadDefinition(first.jsonText)
    const third = exportGameDefinition(reimported)
    expect(third.status).toBe('success')
    if (third.status !== 'success') return
    expect(third.jsonText).toBe(first.jsonText)
  })

  it('never mutates the source definition', async () => {
    const definition = await loadDefinition(gameFileText({ id: 'immutable-src' }))
    const beforeConfig = { ...definition.rounds[0]!.config }
    exportGameDefinition(definition)
    expect(definition.rounds[0]!.config).toEqual(beforeConfig)
  })

  it('does not represent runtime state, timestamps, or random fields', async () => {
    const definition = await loadDefinition(gameFileText({ id: 'no-runtime' }))
    const result = exportGameDefinition(definition)
    expect(result.status).toBe('success')
    if (result.status !== 'success') return
    for (const banned of [
      'sessionId',
      'revision',
      'teamScores',
      'selectedTile',
      'revealStage',
      'usedTiles',
      'buzzQueue',
      'responsePhases',
      'deadline',
      'eventHistory',
      'exportedAt',
      'timestamp',
      'modelVersion',
    ]) {
      expect(result.jsonText).not.toContain(banned)
    }
  })

  it('keeps representative fixtures under the import size limit', async () => {
    const definition = await loadDefinition(
      JSON.stringify(teamBoardGameFile(twoTeams(), richBoardConfig(), { id: 'size-ok' })),
    )
    const result = exportGameDefinition(definition)
    expect(result.status).toBe('success')
    if (result.status !== 'success') return
    expect(result.metadata.characterCount).toBeLessThanOrEqual(MAX_IMPORT_TEXT_LENGTH)
    expect(result.metadata.characterCount).toBe(result.jsonText.length)
  })

  it('reports hasMediaReferences false when no image prompts exist', async () => {
    const definition = await loadDefinition(gameFileText({ id: 'no-media' }))
    const result = exportGameDefinition(definition)
    expect(result.status).toBe('success')
    if (result.status !== 'success') return
    expect(result.metadata.hasMediaReferences).toBe(false)
  })

  it('export does not encode session runtime state', async () => {
    const definition = await loadDefinition(gameFileText({ id: 'privacy' }))
    const result = exportGameDefinition(definition)
    expect(result.status).toBe('success')
    if (result.status !== 'success') return
    expect(result.jsonText).not.toMatch(/revision|scores|buzz|deadline|selectedTile/)
  })
})

describe('exportGameDefinition failures', () => {
  it('rejects null, undefined, and malformed definitions', () => {
    for (const value of [null, undefined, {}, { id: 'x' }, 'nope']) {
      const result = exportGameDefinition(value)
      expect(result.status).toBe('failure')
      if (result.status !== 'failure') continue
      expect(result.issues[0]!.code).toBe('invalid-definition')
      expect(result).not.toHaveProperty('filename')
      expect(result).not.toHaveProperty('jsonText')
    }
  })

  it('rejects an unsupported model version', () => {
    const definition = createGameDefinition({
      id: 'mv',
      title: 'MV',
      rounds: [placeholderRound('r1', 'R')],
    })
    const forged = {
      modelVersion: GAME_DEFINITION_MODEL_VERSION + 1,
      id: definition.id,
      title: definition.title,
      teams: definition.teams,
      timer: definition.timer,
      rounds: definition.rounds,
    }
    const result = exportGameDefinition(forged)
    expect(result.status).toBe('failure')
    if (result.status !== 'failure') return
    expect(result.issues[0]!.code).toBe('unsupported-model-version')
  })

  it('rejects malformed teams and timer via the definition guard', () => {
    const base = createGameDefinition({
      id: 'bad-parts',
      title: 'Bad',
      rounds: [placeholderRound('r1', 'R')],
      teams: createTeamDefinitions([{ id: 't1', name: 'T1', accent: 'crimson' }]),
    })
    expect(exportGameDefinition({ ...base, teams: [{ id: 't1', name: 'T1' }] }).status).toBe(
      'failure',
    )
    expect(exportGameDefinition({ ...base, timer: { responseSeconds: 1 } }).status).toBe('failure')
  })

  it('fails when a round type is unsupported by the registry', () => {
    const definition = createGameDefinition({
      id: 'unsupported-round',
      title: 'Unsupported',
      rounds: [
        {
          id: roundId('r1'),
          type: roundType('not-a-real-round-type'),
          title: 'Nope',
          config: { note: 'x' },
        },
      ],
    })
    const result = exportGameDefinition(definition)
    expect(result.status).toBe('failure')
    if (result.status !== 'failure') return
    expect(result.issues[0]!.code).toBe('round-trip-import-failed')
  })

  it('fails when round config is invalid for its registered type', () => {
    const definition = createGameDefinition({
      id: 'bad-config',
      title: 'Bad Config',
      rounds: [
        {
          id: roundId('r1'),
          type: roundType('category-board'),
          title: 'Board',
          config: { categories: 'not-an-array' as unknown as never },
        },
      ],
    })
    const result = exportGameDefinition(definition)
    expect(result.status).toBe('failure')
    if (result.status !== 'failure') return
    expect(result.issues[0]!.code).toBe('round-trip-import-failed')
  })

  it('fails closed on unsafe generic data and cycles', () => {
    const base = createGameDefinition({
      id: 'unsafe',
      title: 'Unsafe',
      rounds: [placeholderRound('r1', 'R')],
    })
    const withFn = {
      ...base,
      rounds: [
        {
          id: roundId('r1'),
          type: roundType('placeholder'),
          title: 'R',
          config: { note: 'n', bad: (() => 1) as unknown as never },
        },
      ],
    }
    const fnResult = exportGameDefinition(withFn)
    expect(fnResult.status).toBe('failure')
    if (fnResult.status === 'failure') {
      expect(fnResult.issues[0]!.code).toBe('unexportable-data')
    }

    const cyclicConfig: Record<string, unknown> = { note: 'n' }
    cyclicConfig.self = cyclicConfig
    const cyclic = {
      ...base,
      id: 'cyclic',
      title: 'Cyclic',
      rounds: [
        {
          id: roundId('r1'),
          type: roundType('placeholder'),
          title: 'R',
          config: cyclicConfig as never,
        },
      ],
    }
    const cyclicResult = exportGameDefinition(cyclic)
    expect(cyclicResult.status).toBe('failure')
    if (cyclicResult.status === 'failure') {
      expect(cyclicResult.issues[0]!.code).toBe('unexportable-data')
    }
  })

  it('fails when generated output exceeds the import limit', () => {
    const hugeNote = 'x'.repeat(MAX_IMPORT_TEXT_LENGTH)
    const definition = createGameDefinition({
      id: 'too-large',
      title: 'Too Large',
      rounds: [
        {
          id: roundId('r1'),
          type: roundType('placeholder'),
          title: 'R',
          config: { note: hugeNote },
        },
      ],
    })
    const result = exportGameDefinition(definition)
    expect(result.status).toBe('failure')
    if (result.status !== 'failure') return
    expect(result.issues[0]!.code).toBe('output-too-large')
  })

  it('fails when re-import fails', async () => {
    const definition = await loadDefinition(gameFileText({ id: 'reimport-fail' }))
    mockedImport.mockReturnValueOnce({
      status: 'failure',
      issues: [
        {
          code: 'internal-error',
          stage: 'construction',
          path: '',
          message: 'forced failure',
        },
      ],
    })
    const result = exportGameDefinition(definition)
    expect(result.status).toBe('failure')
    if (result.status !== 'failure') return
    expect(result.issues[0]!.code).toBe('round-trip-import-failed')
  })

  it('fails on structural mismatch after re-import', async () => {
    const definition = await loadDefinition(gameFileText({ id: 'mismatch' }))
    const actual = await vi.importActual<typeof import('../import/importGame')>(
      '../import/importGame',
    )
    const ok = actual.importGameFromJsonText(
      JSON.stringify({
        format: 'classroom-quiz-show/game',
        schemaVersion: 1,
        id: 'other-id',
        title: 'Other',
        rounds: [roundFile('r1')],
      }) + '\n',
    )
    expect(ok.status).toBe('success')
    if (ok.status !== 'success') return
    mockedImport.mockReturnValueOnce(ok)
    const result = exportGameDefinition(definition)
    expect(result.status).toBe('failure')
    if (result.status !== 'failure') return
    expect(result.issues[0]!.code).toBe('round-trip-mismatch')
  })

  it('fails when the second export is not byte-identical', async () => {
    const definition = await loadDefinition(gameFileText({ id: 'byte-mismatch' }))
    const actual = await vi.importActual<typeof import('../import/importGame')>(
      '../import/importGame',
    )
    mockedImport.mockImplementation((text, options) => actual.importGameFromJsonText(text, options))

    const stringify = JSON.stringify
    let documentSerializations = 0
    const spy = vi.spyOn(JSON, 'stringify').mockImplementation((value, ...rest) => {
      const text = stringify(value, ...rest)
      if (
        typeof value === 'object' &&
        value !== null &&
        Object.prototype.hasOwnProperty.call(value, 'format') &&
        Object.prototype.hasOwnProperty.call(value, 'schemaVersion')
      ) {
        documentSerializations += 1
        if (documentSerializations >= 2) {
          return `${text} `
        }
      }
      return text
    })

    const result = exportGameDefinition(definition)
    expect(result.status).toBe('failure')
    if (result.status !== 'failure') return
    expect(result.issues[0]!.code).toBe('round-trip-mismatch')
    spy.mockRestore()
  })

  it('contains internal exceptions', async () => {
    const definition = await loadDefinition(gameFileText({ id: 'internal' }))
    const errors: unknown[] = []
    mockedImport.mockImplementationOnce(() => {
      throw new Error('boom')
    })
    const result = exportGameDefinition(definition, {
      onInternalError: (error) => errors.push(error),
    })
    expect(result.status).toBe('failure')
    if (result.status !== 'failure') return
    expect(result.issues[0]!.code).toBe('serialization-failed')
    expect(errors).toHaveLength(1)
  })
})
