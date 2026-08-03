import { describe, expect, it } from 'vitest'
import { importGameFromJsonText, importGameFromUnknown } from './importGame'
import type { ImportIssue } from './issues'
import {
  CANONICAL_SAMPLE_CATEGORY_BOARD_FILE,
  CANONICAL_SAMPLE_GAME_FILE,
  CANONICAL_SAMPLE_WITH_DUPLICATE_TILE_ID,
  CANONICAL_SAMPLE_WITH_UNKNOWN_ROUND_TYPE,
  importBuiltInCategoryBoardGame,
  importBuiltInSampleGame,
} from './sampleGameFile'
import { createDefaultRegistry } from '../game/defaultRegistry'
import { createRoundRegistry } from '../game/registry'
import { placeholderRoundType } from '../game/placeholderRound'
import { CATEGORY_BOARD_ROUND_TYPE, readCategoryBoardDefinition } from '../game/categoryBoard/definition'
import { FINAL_WAGER_ROUND_TYPE } from '../game/finalWager/definition'
import {
  MAX_ALTERNATES,
  MAX_CATEGORIES,
  MAX_MULTIPLIER,
  MAX_TILES_PER_CATEGORY,
} from '../game/categoryBoard/limits'
import {
  boardGameFile,
  boardGameFileText,
  boardConfig,
  category,
  richBoardConfig,
  tile,
} from '../test/categoryBoardFixtures'

/**
 * Category-board integration with THE canonical import pipeline (Slice 5).
 *
 * There is deliberately no second importer: a category board is validated
 * because the registry hands the pipeline that round type's own config schema.
 * These tests therefore drive `importGameFromUnknown` / `importGameFromJsonText`
 * and assert on the structured issues those produce — with exact document
 * paths, precise codes, and no repair of any kind.
 */

function issuesOf(input: unknown): readonly ImportIssue[] {
  const result = importGameFromUnknown(input)
  if (result.status === 'success') throw new Error('expected the import to fail')
  return result.issues
}

/** The issue at an exact document path, if any. */
function at(input: unknown, path: string): ImportIssue | undefined {
  return issuesOf(input).find((issue) => issue.path === path)
}

describe('a valid category board imports', () => {
  it('accepts a single-category board', () => {
    const result = importGameFromUnknown(boardGameFile(boardConfig()))
    expect(result.status).toBe('success')
  })

  it('accepts a multi-category board with uneven category lengths', () => {
    const result = importGameFromUnknown(boardGameFile(richBoardConfig()))
    expect(result.status).toBe('success')
    if (result.status !== 'success') return
    const board = readCategoryBoardDefinition(result.definition.rounds[0])
    expect(board?.categories.map((c) => c.tiles.length)).toEqual([3, 2])
  })

  it('accepts a board with duplicate values', () => {
    const config = {
      categories: [
        category('a', { tiles: [tile('a-1', { value: 200 }), tile('a-2', { value: 200 })] }),
      ],
    }
    expect(importGameFromUnknown(boardGameFile(config)).status).toBe('success')
  })

  it('preserves authored category and tile order through the whole pipeline', () => {
    const config = {
      categories: [
        category('zulu', { tiles: [tile('z-3', { value: 300 }), tile('z-1', { value: 100 })] }),
        category('alpha'),
      ],
    }
    const result = importGameFromUnknown(boardGameFile(config))
    expect(result.status).toBe('success')
    if (result.status !== 'success') return
    const board = readCategoryBoardDefinition(result.definition.rounds[0])
    expect(board?.categories.map((c) => c.id)).toEqual(['zulu', 'alpha'])
    expect(board?.categories[0].tiles.map((t) => t.id)).toEqual(['z-3', 'z-1'])
  })

  it('produces a deep-frozen definition whose board can be read back', () => {
    const result = importGameFromJsonText(boardGameFileText())
    expect(result.status).toBe('success')
    if (result.status !== 'success') return
    expect(Object.isFrozen(result.definition)).toBe(true)
    expect(Object.isFrozen(result.definition.rounds[0].config)).toBe(true)
    expect(readCategoryBoardDefinition(result.definition.rounds[0])).not.toBeNull()
  })

  it('is deterministic — the same document always yields an equal definition', () => {
    const a = importGameFromJsonText(boardGameFileText())
    const b = importGameFromJsonText(boardGameFileText())
    expect(JSON.stringify(a)).toBe(JSON.stringify(b))
  })

  it('never mutates the caller-supplied document', () => {
    const document = boardGameFile()
    const snapshot = JSON.stringify(document)
    importGameFromUnknown(document)
    expect(JSON.stringify(document)).toBe(snapshot)
    expect(Object.isFrozen(document)).toBe(false)
  })
})

describe('precise import errors with exact document paths', () => {
  it('reports a duplicate category id', () => {
    const issue = at(boardGameFile({ categories: [category('same'), category('same')] }), 'rounds[0].config.categories[1].id')
    expect(issue?.code).toBe('duplicate-category-id')
    expect(issue?.stage).toBe('schema')
    expect(issue?.message).toContain('unique within a round')
  })

  it('reports a duplicate tile id ACROSS categories, not just within one', () => {
    const config = {
      categories: [category('a', { tiles: [tile('dup')] }), category('b', { tiles: [tile('dup')] })],
    }
    const issue = at(boardGameFile(config), 'rounds[0].config.categories[1].tiles[0].id')
    expect(issue?.code).toBe('duplicate-tile-id')
    expect(issue?.message).toContain('across the whole round')
  })

  it('reports a blank category title', () => {
    const issue = at(boardGameFile({ categories: [category('a', { title: '   ' })] }), 'rounds[0].config.categories[0].title')
    expect(issue?.code).toBe('blank-text')
  })

  it('reports a blank prompt', () => {
    const config = { categories: [category('a', { tiles: [tile('a-1', { prompt: ' ' })] })] }
    const issue = at(boardGameFile(config), 'rounds[0].config.categories[0].tiles[0].prompt')
    expect(issue?.code).toBe('blank-text')
  })

  it('reports a blank answer', () => {
    const config = { categories: [category('a', { tiles: [tile('a-1', { answer: '\t' })] })] }
    const issue = at(boardGameFile(config), 'rounds[0].config.categories[0].tiles[0].answer')
    expect(issue?.code).toBe('blank-text')
  })

  it('reports a blank alternate at its exact index', () => {
    const config = {
      categories: [category('a', { tiles: [tile('a-1', { alternates: ['ok', '  '] })] })],
    }
    const issue = at(boardGameFile(config), 'rounds[0].config.categories[0].tiles[0].alternates[1]')
    expect(issue?.code).toBe('blank-text')
  })

  it('reports an empty prompt separately from a whitespace-only one', () => {
    const config = { categories: [category('a', { tiles: [tile('a-1', { prompt: '' })] })] }
    const issue = at(boardGameFile(config), 'rounds[0].config.categories[0].tiles[0].prompt')
    expect(issue?.code).toBe('value-too-small')
  })

  it('reports an invalid tile value', () => {
    for (const [value, code] of [
      [-1, 'value-too-small'],
      [1.5, 'invalid-type'],
      ['100', 'invalid-type'],
    ] as const) {
      const config = { categories: [category('a', { tiles: [tile('a-1', { value })] })] }
      const issue = at(boardGameFile(config), 'rounds[0].config.categories[0].tiles[0].value')
      expect(issue?.code, `value ${String(value)}`).toBe(code)
    }
  })

  it('reports an invalid multiplier', () => {
    for (const multiplier of [0, -2, MAX_MULTIPLIER + 1]) {
      const config = { categories: [category('a', { tiles: [tile('a-1', { multiplier })] })] }
      const issue = at(boardGameFile(config), 'rounds[0].config.categories[0].tiles[0].multiplier')
      expect(issue, `multiplier ${multiplier}`).toBeDefined()
    }
  })

  it('reports malformed alternates', () => {
    const notAnArray = { categories: [category('a', { tiles: [tile('a-1', { alternates: 'one' })] })] }
    expect(at(boardGameFile(notAnArray), 'rounds[0].config.categories[0].tiles[0].alternates')?.code).toBe('invalid-type')

    const wrongItemType = { categories: [category('a', { tiles: [tile('a-1', { alternates: [7] })] })] }
    expect(at(boardGameFile(wrongItemType), 'rounds[0].config.categories[0].tiles[0].alternates[0]')?.code).toBe('invalid-type')

    const tooMany = {
      categories: [
        category('a', {
          tiles: [tile('a-1', { alternates: Array.from({ length: MAX_ALTERNATES + 1 }, (_, i) => `a${i}`) })],
        }),
      ],
    }
    expect(at(boardGameFile(tooMany), 'rounds[0].config.categories[0].tiles[0].alternates')?.code).toBe('value-too-large')
  })

  it('reports an unknown category-board field at every level, never dropping it', () => {
    expect(at(boardGameFile({ categories: [category('a')], theme: 'space' }), 'rounds[0].config.theme')?.code).toBe('unknown-field')
    expect(at(boardGameFile({ categories: [category('a', { colour: 'red' })] }), 'rounds[0].config.categories[0].colour')?.code).toBe('unknown-field')
    expect(
      at(
        boardGameFile({ categories: [category('a', { tiles: [tile('a-1', { media: 'x.png' })] })] }),
        'rounds[0].config.categories[0].tiles[0].media',
      )?.code,
    ).toBe('unknown-field')
  })

  it('reports a malformed categories array', () => {
    expect(at(boardGameFile({ categories: 'nope' }), 'rounds[0].config.categories')?.code).toBe('invalid-type')
    expect(at(boardGameFile({ categories: [] }), 'rounds[0].config.categories')?.code).toBe('value-too-small')
    expect(at(boardGameFile({}), 'rounds[0].config.categories')?.code).toBe('missing-field')
  })

  it('reports a malformed tile shape', () => {
    const config = { categories: [category('a', { tiles: [{ id: 'a-1' }] })] }
    const issues = issuesOf(boardGameFile(config))
    const paths = issues.map((i) => i.path)
    expect(paths).toContain('rounds[0].config.categories[0].tiles[0].value')
    expect(paths).toContain('rounds[0].config.categories[0].tiles[0].prompt')
    expect(paths).toContain('rounds[0].config.categories[0].tiles[0].answer')
    expect(issues.every((i) => i.code === 'missing-field')).toBe(true)
  })

  it('reports oversized configured collections with actionable messages', () => {
    const tooManyCategories = {
      categories: Array.from({ length: MAX_CATEGORIES + 1 }, (_, i) => category(`c${i}`)),
    }
    expect(at(boardGameFile(tooManyCategories), 'rounds[0].config.categories')?.code).toBe('value-too-large')

    const tooManyTiles = {
      categories: [
        category('a', { tiles: Array.from({ length: MAX_TILES_PER_CATEGORY + 1 }, (_, i) => tile(`t${i}`)) }),
      ],
    }
    expect(at(boardGameFile(tooManyTiles), 'rounds[0].config.categories[0].tiles')?.code).toBe('value-too-large')

    // 7 × 7 = 49 tiles: within both per-axis caps, over the total-tile budget.
    const overTotal = {
      categories: Array.from({ length: 7 }, (_, c) =>
        category(`c${c}`, { tiles: Array.from({ length: 7 }, (_, t) => tile(`c${c}t${t}`)) }),
      ),
    }
    const totalIssue = at(boardGameFile(overTotal), 'rounds[0].config.categories')
    expect(totalIssue?.code).toBe('value-too-large')
    expect(totalIssue?.message).toContain('49 tiles in total')
    expect(totalIssue?.message).toContain('no tile will be dropped for you')
  })

  it('reports every independent problem at once, not just the first', () => {
    const config = {
      categories: [
        category('dup', { tiles: [tile('t', { prompt: '  ' })] }),
        category('dup', { tiles: [tile('t', { answer: '  ' })] }),
      ],
    }
    const codes = issuesOf(boardGameFile(config)).map((i) => i.code)
    expect(codes).toContain('duplicate-category-id')
    expect(codes).toContain('duplicate-tile-id')
    expect(codes.filter((c) => c === 'blank-text')).toHaveLength(2)
  })
})

describe('no coercion, no silent defaults, no partial import', () => {
  it('does not coerce a numeric string into a value', () => {
    const config = { categories: [category('a', { tiles: [tile('a-1', { value: '100' })] })] }
    expect(importGameFromUnknown(boardGameFile(config)).status).toBe('failure')
  })

  it('does not default an omitted multiplier at the IMPORT boundary', () => {
    // The authored document is what is imported: `multiplier` stays absent in
    // the stored config, and the default is applied only by the trusted domain
    // constructor when the board is read.
    const result = importGameFromUnknown(boardGameFile(boardConfig()))
    expect(result.status).toBe('success')
    if (result.status !== 'success') return
    const storedTile = (
      result.definition.rounds[0].config as unknown as {
        categories: { tiles: Record<string, unknown>[] }[]
      }
    ).categories[0].tiles[0]
    expect('multiplier' in storedTile).toBe(false)
    expect(readCategoryBoardDefinition(result.definition.rounds[0])?.categories[0].tiles[0].multiplier).toBe(1)
  })

  it('imports nothing at all when one tile of a large board is invalid', () => {
    const config = {
      categories: [
        category('good', { tiles: [tile('good-1'), tile('good-2')] }),
        category('bad', { tiles: [tile('bad-1', { answer: '' })] }),
      ],
    }
    const result = importGameFromUnknown(boardGameFile(config))
    expect(result.status).toBe('failure')
  })

  it('fails the WHOLE game when one of several rounds has a bad board', () => {
    const document = boardGameFile(richBoardConfig(), {
      rounds: [
        { id: 'ok', type: 'placeholder', title: 'OK', config: { note: 'fine' } },
        { id: 'bad', type: 'category-board', title: 'Bad', config: { categories: [] } },
      ],
    })
    expect(importGameFromUnknown(document).status).toBe('failure')
  })
})

describe('registration is application-controlled, never content-supplied', () => {
  it('rejects a category board when the registry does not have that type', () => {
    const registry = createRoundRegistry()
    registry.register(placeholderRoundType)
    const result = importGameFromUnknown(boardGameFile(), { registry })
    expect(result.status).toBe('failure')
    if (result.status !== 'success') {
      expect(result.issues.map((i) => i.code)).toContain('unknown-round-type')
    }
  })

  it('a game file cannot register a round type or supply a schema', () => {
    const hostile = boardGameFile(richBoardConfig(), {
      register: { type: 'evil', configSchema: {} },
      roundTypes: [{ type: 'evil' }],
    })
    const result = importGameFromUnknown(hostile)
    expect(result.status).toBe('failure')
    if (result.status !== 'success') {
      // The register-shaped keys are simply unknown fields at the root.
      expect(result.issues.map((i) => i.path)).toEqual(
        expect.arrayContaining(['register', 'roundTypes']),
      )
    }
    // The default registry is unchanged and still exposes exactly the built-ins.
    expect(createDefaultRegistry().knownTypes()).toEqual([
      'placeholder',
      CATEGORY_BOARD_ROUND_TYPE,
      FINAL_WAGER_ROUND_TYPE,
    ])
  })

  it('a game file cannot smuggle a function into a board config', () => {
    const config = richBoardConfig() as { categories: { tiles: Record<string, unknown>[] }[] }
    config.categories[0].tiles[0].onReveal = () => 'pwned'
    const result = importGameFromUnknown(boardGameFile(config))
    expect(result.status).toBe('failure')
    if (result.status !== 'success') {
      expect(result.issues.map((i) => i.code)).toContain('non-data-value')
    }
  })

  it('a category board cannot replace the round type entry it is validated by', () => {
    const registry = createDefaultRegistry()
    const before = registry.lookup(CATEGORY_BOARD_ROUND_TYPE)
    importGameFromUnknown(boardGameFile(), { registry })
    expect(registry.lookup(CATEGORY_BOARD_ROUND_TYPE)).toEqual(before)
    expect(registry.knownTypes()).toEqual([
      'placeholder',
      CATEGORY_BOARD_ROUND_TYPE,
      FINAL_WAGER_ROUND_TYPE,
    ])
  })
})

describe('the built-in samples travel the same pipeline', () => {
  it('the valid sample imports and contains a real category-board round', () => {
    const result = importBuiltInSampleGame()
    expect(result.status).toBe('success')
    if (result.status !== 'success') return
    const boardRound = result.definition.rounds.find((r) => r.type === CATEGORY_BOARD_ROUND_TYPE)
    expect(boardRound).toBeDefined()
    expect(readCategoryBoardDefinition(boardRound!)).not.toBeNull()
  })

  it('the category-board sample imports and applies its multiplier', () => {
    const result = importBuiltInCategoryBoardGame()
    expect(result.status).toBe('success')
    if (result.status !== 'success') return
    const board = readCategoryBoardDefinition(result.definition.rounds[0])
    const doubled = board?.categories[1].tiles[1]
    expect(doubled?.value).toBe(300)
    expect(doubled?.multiplier).toBe(2)
    expect(doubled?.effectiveValue).toBe(600)
  })

  it('the sample files are JSON TEXT, so they cannot skip validation', () => {
    expect(typeof CANONICAL_SAMPLE_GAME_FILE).toBe('string')
    expect(typeof CANONICAL_SAMPLE_CATEGORY_BOARD_FILE).toBe('string')
  })

  it('the unregistered-type sample still fails at the registry stage', () => {
    const result = importGameFromJsonText(CANONICAL_SAMPLE_WITH_UNKNOWN_ROUND_TYPE)
    expect(result.status).toBe('failure')
    if (result.status !== 'failure') return
    const unknown = result.issues.find((i) => i.code === 'unknown-round-type')
    expect(unknown?.stage).toBe('registry')
    expect(unknown?.path).toBe('rounds[1].type')
  })

  it('the duplicate-tile-id sample fails with an exact path and no repair', () => {
    const result = importGameFromJsonText(CANONICAL_SAMPLE_WITH_DUPLICATE_TILE_ID)
    expect(result.status).toBe('failure')
    if (result.status !== 'failure') return
    expect(result.issues[0].code).toBe('duplicate-tile-id')
    expect(result.issues[0].path).toBe('rounds[0].config.categories[0].tiles[1].id')
  })
})
