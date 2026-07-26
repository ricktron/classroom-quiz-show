import { describe, expect, it } from 'vitest'
import {
  CATEGORY_BOARD_ROUND_TYPE,
  CategoryBoardConfigError,
  allTiles,
  createCategoryBoardDefinition,
  findCategoryById,
  findTileById,
  findTileLocation,
  isCategoryBoardRound,
  readCategoryBoardDefinition,
} from './definition'
import {
  CATEGORY_BOARD_ID_PATTERN,
  CATEGORY_BOARD_MAX_ID_LENGTH,
  categoryBoardConfigSchema,
} from './schema'
import { categoryBoardRoundType } from './roundType'
import {
  DEFAULT_MULTIPLIER,
  MAX_ALTERNATES,
  MAX_CATEGORIES,
  MAX_MULTIPLIER,
  MAX_TILES_PER_CATEGORY,
  MAX_TOTAL_TILES,
} from './limits'
import { ID_PATTERN, MAX_ID_LENGTH } from '../../import/canonicalFormat'
import { roundId, roundType } from '../ids'
import type { RoundConfig, RoundDefinition } from '../roundDefinition'
import { boardConfig, category, richBoardConfig, tile } from '../../test/categoryBoardFixtures'

/**
 * The category-board config model and its TRUSTED construction (Slice 5).
 *
 * These tests are about the domain object, not the import pipeline: they prove
 * ordering, identity, board-shape decisions, multiplier semantics, immutability,
 * and the fail-closed read used by every runtime consumer.
 */

function make(config: unknown) {
  return createCategoryBoardDefinition(config)
}

function boardRound(config: unknown): RoundDefinition {
  return {
    id: roundId('r1'),
    type: CATEGORY_BOARD_ROUND_TYPE,
    title: 'Board',
    config: config as RoundConfig,
  }
}

describe('category-board round-type identity', () => {
  it('uses the documented type identifier', () => {
    expect(CATEGORY_BOARD_ROUND_TYPE).toBe('category-board')
    expect(categoryBoardRoundType.type).toBe(CATEGORY_BOARD_ROUND_TYPE)
  })

  it('recognizes a round by type only, not by config validity', () => {
    expect(isCategoryBoardRound(boardRound(boardConfig()))).toBe(true)
    expect(isCategoryBoardRound(boardRound({ nonsense: true }))).toBe(true)
    expect(
      isCategoryBoardRound({
        id: roundId('p'),
        type: roundType('placeholder'),
        title: 'P',
        config: { note: 'x' },
      }),
    ).toBe(false)
  })

  it('matches only a round whose config is a real board', () => {
    expect(categoryBoardRoundType.matches(boardRound(richBoardConfig()))).toBe(true)
    expect(categoryBoardRoundType.matches(boardRound({ categories: [] }))).toBe(false)
    expect(categoryBoardRoundType.matches(boardRound({}))).toBe(false)
  })

  it('exposes the neutral Slice 3 runtime seam without leaking anything', () => {
    const round = boardRound(richBoardConfig())
    const state = categoryBoardRoundType.createInitialState(round)
    expect(state).toEqual({ roundId: 'r1', type: CATEGORY_BOARD_ROUND_TYPE })
    expect(categoryBoardRoundType.toPublicRoundView(state)).toEqual({ availability: 'available' })
  })
})

describe('identifier grammar', () => {
  it('mirrors the canonical game-file identifier grammar exactly', () => {
    // The game domain deliberately does not import from the import layer, so
    // this test is what stops the two copies drifting apart.
    expect(CATEGORY_BOARD_ID_PATTERN.source).toBe(ID_PATTERN.source)
    expect(CATEGORY_BOARD_ID_PATTERN.flags).toBe(ID_PATTERN.flags)
    expect(CATEGORY_BOARD_MAX_ID_LENGTH).toBe(MAX_ID_LENGTH)
  })

  it('rejects ids that do not satisfy the grammar', () => {
    expect(categoryBoardConfigSchema.safeParse(boardConfig({ categories: [category('-bad')] })).success).toBe(false)
    expect(
      categoryBoardConfigSchema.safeParse({ categories: [category('ok', { tiles: [tile('bad id')] })] })
        .success,
    ).toBe(false)
  })
})

describe('ordering is authored array order', () => {
  it('preserves category order exactly, including a non-alphabetical order', () => {
    const board = make({
      categories: [category('zulu'), category('alpha'), category('mike')],
    })
    expect(board.categories.map((c) => c.id)).toEqual(['zulu', 'alpha', 'mike'])
  })

  it('preserves tile order exactly, including a descending value ladder', () => {
    const board = make({
      categories: [
        category('a', {
          tiles: [tile('a-500', { value: 500 }), tile('a-100', { value: 100 }), tile('a-300', { value: 300 })],
        }),
      ],
    })
    expect(board.categories[0].tiles.map((t) => t.value)).toEqual([500, 100, 300])
  })

  it('is not influenced by object-key insertion order elsewhere in the config', () => {
    const forward = make({ categories: [category('a'), category('b')] })
    // Same categories, authored with their own keys in a different order.
    const scrambled = make({
      categories: [
        { tiles: [tile('a-100')], title: 'Category a', id: 'a' },
        { title: 'Category b', tiles: [tile('b-100')], id: 'b' },
      ],
    })
    expect(scrambled.categories.map((c) => c.id)).toEqual(forward.categories.map((c) => c.id))
  })
})

describe('board shape decisions', () => {
  it('ALLOWS uneven category lengths', () => {
    const board = make(richBoardConfig())
    expect(board.categories.map((c) => c.tiles.length)).toEqual([3, 2])
  })

  it('ALLOWS duplicate values, within and across categories', () => {
    const board = make({
      categories: [
        category('a', { tiles: [tile('a-1', { value: 200 }), tile('a-2', { value: 200 })] }),
        category('b', { tiles: [tile('b-1', { value: 200 })] }),
      ],
    })
    expect(allTiles(board).map((t) => t.value)).toEqual([200, 200, 200])
    // Identity still comes from the id, never the displayed value.
    expect(findTileById(board, 'a-2')?.prompt).toBe('Prompt for a-2')
  })

  it('rejects a board with no categories and a category with no tiles', () => {
    expect(() => make({ categories: [] })).toThrow(CategoryBoardConfigError)
    expect(() => make({ categories: [category('a', { tiles: [] })] })).toThrow(
      CategoryBoardConfigError,
    )
  })
})

describe('multiplier semantics', () => {
  it('applies the documented default of 1 when the field is omitted', () => {
    const board = make(boardConfig())
    const only = allTiles(board)[0]
    expect(only.multiplier).toBe(DEFAULT_MULTIPLIER)
    expect(DEFAULT_MULTIPLIER).toBe(1)
    expect(only.effectiveValue).toBe(only.value)
  })

  it('computes effectiveValue as value × multiplier, exactly', () => {
    const board = make({
      categories: [category('a', { tiles: [tile('a-300', { value: 300, multiplier: 2 })] })],
    })
    const only = allTiles(board)[0]
    expect(only.value).toBe(300)
    expect(only.multiplier).toBe(2)
    expect(only.effectiveValue).toBe(600)
    expect(Number.isInteger(only.effectiveValue)).toBe(true)
  })

  it('rejects a zero, negative, fractional, or oversized multiplier', () => {
    for (const multiplier of [0, -1, 1.5, MAX_MULTIPLIER + 1, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(() =>
        make({ categories: [category('a', { tiles: [tile('a-1', { multiplier })] })] }),
      ).toThrow(CategoryBoardConfigError)
    }
  })

  it('allows a zero value but rejects a negative or fractional value', () => {
    expect(() => make({ categories: [category('a', { tiles: [tile('a-1', { value: 0 })] })] })).not.toThrow()
    for (const value of [-100, 12.5, Number.NaN]) {
      expect(() => make({ categories: [category('a', { tiles: [tile('a-1', { value })] })] })).toThrow(
        CategoryBoardConfigError,
      )
    }
  })

  it('does not touch any score — the model has no scoring surface at all', () => {
    const board = make(richBoardConfig())
    const tileKeys = Object.keys(allTiles(board)[0])
    for (const forbidden of ['score', 'points', 'award', 'team', 'wager', 'timer']) {
      expect(tileKeys.some((key) => key.toLowerCase().includes(forbidden))).toBe(false)
    }
  })
})

describe('optional fields', () => {
  it('normalizes an omitted alternates list to an empty array and notes to null', () => {
    const board = make(boardConfig())
    const only = allTiles(board)[0]
    expect(only.alternates).toEqual([])
    expect(only.notes).toBeNull()
  })

  it('keeps authored alternates verbatim and in order, and never replaces the answer', () => {
    const board = make({
      categories: [
        category('a', { tiles: [tile('a-1', { answer: 'Canonical', alternates: ['Second', 'First'] })] }),
      ],
    })
    const only = allTiles(board)[0]
    expect(only.answer).toBe('Canonical')
    expect(only.alternates).toEqual(['Second', 'First'])
  })

  it('rejects too many alternates', () => {
    const alternates = Array.from({ length: MAX_ALTERNATES + 1 }, (_, i) => `alt-${i}`)
    expect(() => make({ categories: [category('a', { tiles: [tile('a-1', { alternates })] })] })).toThrow()
  })

  it('rejects non-string alternates', () => {
    expect(() => make({ categories: [category('a', { tiles: [tile('a-1', { alternates: [42] })] })] })).toThrow()
    expect(() => make({ categories: [category('a', { tiles: [tile('a-1', { alternates: 'one' })] })] })).toThrow()
  })
})

describe('strictness — nothing is coerced, defaulted, or repaired', () => {
  it('rejects an unknown field at every level', () => {
    expect(() => make({ categories: [category('a')], theme: 'space' })).toThrow()
    expect(() => make({ categories: [category('a', { colour: 'red' })] })).toThrow()
    expect(() => make({ categories: [category('a', { tiles: [tile('a-1', { media: 'x.png' })] })] })).toThrow()
  })

  it('rejects a numeric string where a number is declared (no coercion)', () => {
    expect(() => make({ categories: [category('a', { tiles: [tile('a-1', { value: '100' })] })] })).toThrow()
  })

  it('rejects a single object where an array is declared (no widening)', () => {
    expect(() => make({ categories: category('a') })).toThrow()
    expect(() => make({ categories: [category('a', { tiles: tile('a-1') })] })).toThrow()
  })

  it('rejects whitespace-only text rather than trimming it into validity', () => {
    expect(() => make({ categories: [category('a', { title: '   ' })] })).toThrow()
    expect(() => make({ categories: [category('a', { tiles: [tile('a-1', { prompt: '  ' })] })] })).toThrow()
    expect(() => make({ categories: [category('a', { tiles: [tile('a-1', { answer: '\t\n' })] })] })).toThrow()
  })

  it('rejects duplicate ids rather than de-duplicating or renaming them', () => {
    expect(() => make({ categories: [category('same'), category('same')] })).toThrow()
    expect(() =>
      make({
        categories: [
          category('a', { tiles: [tile('dup')] }),
          category('b', { tiles: [tile('dup')] }),
        ],
      }),
    ).toThrow()
  })
})

describe('board size limits', () => {
  it('rejects more than the maximum categories', () => {
    const categories = Array.from({ length: MAX_CATEGORIES + 1 }, (_, i) => category(`c${i}`))
    expect(() => make({ categories })).toThrow()
  })

  it('rejects more than the maximum tiles in one category', () => {
    const tiles = Array.from({ length: MAX_TILES_PER_CATEGORY + 1 }, (_, i) => tile(`t${i}`))
    expect(() => make({ categories: [category('a', { tiles })] })).toThrow()
  })

  it('rejects more than the maximum total tiles, and never truncates', () => {
    // 7 categories × 7 tiles = 49 tiles: under both per-axis caps, over the total.
    const categories = Array.from({ length: 7 }, (_, c) =>
      category(`c${c}`, { tiles: Array.from({ length: 7 }, (_, t) => tile(`c${c}t${t}`)) }),
    )
    expect(49).toBeGreaterThan(MAX_TOTAL_TILES)
    expect(() => make({ categories })).toThrow()
  })

  it('accepts a board exactly at the total-tile limit', () => {
    const categories = Array.from({ length: MAX_CATEGORIES }, (_, c) =>
      category(`c${c}`, {
        tiles: Array.from({ length: MAX_TOTAL_TILES / MAX_CATEGORIES }, (_, t) => tile(`c${c}t${t}`)),
      }),
    )
    const board = make({ categories })
    expect(allTiles(board)).toHaveLength(MAX_TOTAL_TILES)
  })
})

describe('trusted construction is immutable and input-safe', () => {
  it('deep-freezes the whole board', () => {
    const board = make(richBoardConfig())
    expect(Object.isFrozen(board)).toBe(true)
    expect(Object.isFrozen(board.categories)).toBe(true)
    expect(Object.isFrozen(board.categories[0])).toBe(true)
    expect(Object.isFrozen(board.categories[0].tiles[0])).toBe(true)
    expect(Object.isFrozen(board.categories[0].tiles[0].alternates)).toBe(true)
  })

  it('never mutates or freezes the caller-owned config', () => {
    const config = richBoardConfig()
    make(config)
    expect(Object.isFrozen(config)).toBe(false)
    expect(config).toEqual(richBoardConfig())
  })

  it('does not retain a reference to the caller-owned config', () => {
    const config = richBoardConfig() as { categories: { title: string }[] }
    const board = make(config)
    config.categories[0].title = 'MUTATED AFTER CONSTRUCTION'
    expect(board.categories[0].title).toBe('Alpha Category')
  })

  it('is deterministic — the same config always yields an equal board', () => {
    expect(make(richBoardConfig())).toEqual(make(richBoardConfig()))
  })
})

describe('fail-closed read', () => {
  it('returns a board for a valid category-board round', () => {
    expect(readCategoryBoardDefinition(boardRound(richBoardConfig()))).not.toBeNull()
  })

  it('returns null (never throws) for a non-category-board round', () => {
    expect(
      readCategoryBoardDefinition({
        id: roundId('p'),
        type: roundType('placeholder'),
        title: 'P',
        config: { note: 'x' },
      }),
    ).toBeNull()
  })

  it('returns null (never throws) for an invalid category-board config', () => {
    for (const config of [{}, { categories: [] }, { categories: 'nope' }, { categories: [{ id: 'a' }] }]) {
      expect(readCategoryBoardDefinition(boardRound(config))).toBeNull()
    }
  })
})

describe('lookup helpers', () => {
  const board = make(richBoardConfig())

  it('finds a category by id', () => {
    expect(findCategoryById(board, 'beta')?.title).toBe('Beta Category')
    expect(findCategoryById(board, 'missing')).toBeNull()
  })

  it('finds a tile by id anywhere on the board', () => {
    expect(findTileById(board, 'beta-500')?.value).toBe(500)
    expect(findTileById(board, 'missing')).toBeNull()
  })

  it('locates a tile with its column and row position', () => {
    const location = findTileLocation(board, 'alpha-300')
    expect(location?.categoryIndex).toBe(0)
    expect(location?.tileIndex).toBe(2)
    expect(location?.category.id).toBe('alpha')
    expect(location?.tile.effectiveValue).toBe(600)
    expect(findTileLocation(board, 'missing')).toBeNull()
  })

  it('stamps each tile with its owning category id', () => {
    expect(findTileById(board, 'beta-100')?.categoryId).toBe('beta')
  })

  it('enumerates every tile in authored order, column by column', () => {
    expect(allTiles(board).map((t) => t.id)).toEqual([
      'alpha-100',
      'alpha-200',
      'alpha-300',
      'beta-100',
      'beta-500',
    ])
  })
})
