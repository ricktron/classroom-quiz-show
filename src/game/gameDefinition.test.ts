import { describe, expect, it } from 'vitest'
import {
  createGameDefinition,
  GameDefinitionError,
  isGameDefinition,
  roundIndexById,
} from './gameDefinition'
import { roundId, roundType } from './ids'
import { placeholderRound, type RoundDefinition } from './roundDefinition'

describe('createGameDefinition — trusted factory', () => {
  it('creates a valid definition and preserves round order', () => {
    const def = createGameDefinition({
      id: 'game-1',
      title: 'Sample',
      rounds: [placeholderRound('a', 'A'), placeholderRound('b', 'B'), placeholderRound('c', 'C')],
    })
    expect(def.id).toBe('game-1')
    expect(def.title).toBe('Sample')
    expect(def.modelVersion).toBe(1)
    expect(def.rounds.map((r) => r.id)).toEqual(['a', 'b', 'c'])
  })

  it('deterministically yields the same ordered rounds regardless of authoring', () => {
    const build = () =>
      createGameDefinition({
        id: 'g',
        title: 'T',
        rounds: [placeholderRound('r1', 'R1'), placeholderRound('r2', 'R2')],
      }).rounds.map((r) => r.id)
    expect(build()).toEqual(build())
  })

  it('rejects a duplicate round id', () => {
    expect(() =>
      createGameDefinition({
        id: 'g',
        title: 'T',
        rounds: [placeholderRound('dup', 'One'), placeholderRound('dup', 'Two')],
      }),
    ).toThrow(GameDefinitionError)
  })

  it('rejects an empty game id and empty title', () => {
    expect(() => createGameDefinition({ id: '', title: 'T', rounds: [] })).toThrow(
      GameDefinitionError,
    )
    expect(() => createGameDefinition({ id: 'g', title: '', rounds: [] })).toThrow(
      GameDefinitionError,
    )
  })

  it('rejects a structurally invalid round', () => {
    const bogus = { id: 'x', type: 'placeholder' } as unknown as RoundDefinition
    expect(() => createGameDefinition({ id: 'g', title: 'T', rounds: [bogus] })).toThrow(
      GameDefinitionError,
    )
  })

  it('explicitly allows an empty rounds list', () => {
    const def = createGameDefinition({ id: 'g', title: 'Empty', rounds: [] })
    expect(def.rounds).toHaveLength(0)
  })

  it('deep-freezes the definition (and its rounds/config) so it cannot be mutated', () => {
    const def = createGameDefinition({ id: 'g', title: 'T', rounds: [placeholderRound('a', 'A')] })
    expect(Object.isFrozen(def)).toBe(true)
    expect(Object.isFrozen(def.rounds)).toBe(true)
    expect(Object.isFrozen(def.rounds[0])).toBe(true)
    expect(Object.isFrozen(def.rounds[0].config)).toBe(true)
    // A mutation attempt throws in strict mode (ES modules are always strict).
    expect(() => {
      ;(def as unknown as { title: string }).title = 'HACKED'
    }).toThrow()
    expect(def.title).toBe('T')
  })

  it('copies the caller array so later external mutation cannot affect it', () => {
    const rounds = [placeholderRound('a', 'A')]
    const def = createGameDefinition({ id: 'g', title: 'T', rounds })
    rounds.push(placeholderRound('b', 'B'))
    expect(def.rounds).toHaveLength(1)
  })
})

describe('isGameDefinition — structural guard', () => {
  it('accepts a well-formed definition', () => {
    const def = createGameDefinition({ id: 'g', title: 'T', rounds: [placeholderRound('a', 'A')] })
    expect(isGameDefinition(def)).toBe(true)
  })

  it('rejects malformed values', () => {
    expect(isGameDefinition(null)).toBe(false)
    expect(isGameDefinition({})).toBe(false)
    expect(isGameDefinition({ modelVersion: 1, id: '', title: 'T', rounds: [] })).toBe(false)
    expect(isGameDefinition({ modelVersion: 1, id: 'g', title: 'T', rounds: 'no' })).toBe(false)
    expect(
      isGameDefinition({ modelVersion: 1, id: 'g', title: 'T', rounds: [{ nope: true }] }),
    ).toBe(false)
  })
})

describe('roundIndexById', () => {
  it('finds a round by stable id and returns -1 when absent', () => {
    const def = createGameDefinition({
      id: 'g',
      title: 'T',
      rounds: [placeholderRound('a', 'A'), placeholderRound('b', 'B')],
    })
    expect(roundIndexById(def, 'a')).toBe(0)
    expect(roundIndexById(def, 'b')).toBe(1)
    expect(roundIndexById(def, 'missing')).toBe(-1)
  })
})

describe('branded round definition literal (unknown type)', () => {
  it('an unknown-type round is still a valid RoundDefinition (not coerced)', () => {
    const unknown: RoundDefinition = {
      id: roundId('x'),
      type: roundType('never-registered'),
      title: 'Mystery',
      config: {},
    }
    const def = createGameDefinition({ id: 'g', title: 'T', rounds: [unknown] })
    // The type is preserved verbatim; nothing coerced it to a known type.
    expect(def.rounds[0].type).toBe('never-registered')
  })
})
