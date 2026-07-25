import { describe, expect, it } from 'vitest'
import { isGameDefinition } from '../game/gameDefinition'
import { gameFile, gameFileText, roundFile } from '../test/gameFileFixtures'
import { importGameFromJsonText, importGameFromUnknown } from './importGame'
import type { ImportSuccess } from './result'

/**
 * Normalization — validated data becomes a trusted, frozen `GameDefinition`
 * with nothing added, removed, reordered, or reinterpreted.
 */

function importOk(input: unknown): ImportSuccess {
  const result = importGameFromUnknown(input)
  expect(result.status).toBe('success')
  if (result.status !== 'success') throw new Error('unreachable')
  return result
}

describe('normalization output', () => {
  it('produces a definition the trusted Slice 3 guard accepts', () => {
    const { definition } = importOk(gameFile())
    expect(isGameDefinition(definition)).toBe(true)
    expect(definition.modelVersion).toBe(1)
  })

  it('constructs branded identifiers from the validated strings', () => {
    const { definition } = importOk(
      gameFile({ id: 'my-game', rounds: [roundFile('opening', 'Opening')] }),
    )
    // Branding is compile-time; at runtime these are the exact supplied strings.
    expect(definition.id).toBe('my-game')
    expect(definition.rounds[0].id).toBe('opening')
    expect(definition.rounds[0].type).toBe('placeholder')
  })

  it('keeps semantic values byte-identical — no trimming, casing, or rewriting', () => {
    const title = '  Water Cycle  Review '
    const note = 'Alternates:  "runoff" / "run-off"  '
    const { definition } = importOk(
      gameFile({
        title,
        rounds: [{ id: 'r1', type: 'placeholder', title: ' Round  One ', config: { note } }],
      }),
    )
    expect(definition.title).toBe(title)
    expect(definition.rounds[0].title).toBe(' Round  One ')
    expect(definition.rounds[0].config.note).toBe(note)
  })

  it('preserves round order exactly', () => {
    const { definition } = importOk(
      gameFile({ rounds: [roundFile('c'), roundFile('a'), roundFile('b')] }),
    )
    expect(definition.rounds.map((r) => r.id)).toEqual(['c', 'a', 'b'])
  })

  it('produces output that cannot be mutated (deep-frozen)', () => {
    const { definition } = importOk(gameFile())
    expect(Object.isFrozen(definition)).toBe(true)
    expect(Object.isFrozen(definition.rounds)).toBe(true)
    expect(Object.isFrozen(definition.rounds[0])).toBe(true)
    expect(Object.isFrozen(definition.rounds[0].config)).toBe(true)

    const mutable = definition as unknown as { title: string; rounds: unknown[] }
    expect(() => {
      'use strict'
      mutable.title = 'hacked'
    }).toThrow(TypeError)
    expect(definition.title).toBe('Sample Game')
    expect(() => mutable.rounds.push({})).toThrow(TypeError)
    expect(definition.rounds).toHaveLength(1)
  })
})

describe('the input document is never mutated', () => {
  it('leaves the caller object (and its nested config) untouched and unfrozen', () => {
    const input = gameFile()
    const snapshot = structuredClone(input)
    const { definition } = importOk(input)

    expect(input).toEqual(snapshot)
    expect(Object.isFrozen(input)).toBe(false)
    const rounds = input.rounds as Array<Record<string, unknown>>
    expect(Object.isFrozen(rounds[0])).toBe(false)
    expect(Object.isFrozen(rounds[0].config)).toBe(false)

    // The definition holds a COPY: mutating the input afterwards changes nothing.
    ;(rounds[0].config as Record<string, unknown>).note = 'changed later'
    expect(definition.rounds[0].config.note).toBe('engine plumbing only')
  })
})

describe('determinism', () => {
  it('importing the same document twice yields equivalent definitions', () => {
    const first = importOk(gameFile()).definition
    const second = importOk(gameFile()).definition
    expect(second).toEqual(first)
    expect(JSON.stringify(second)).toBe(JSON.stringify(first))
  })

  it('text and object entry points converge on the same definition', () => {
    const viaText = importGameFromJsonText(gameFileText())
    const viaObject = importGameFromUnknown(gameFile())
    expect(viaText.status).toBe('success')
    expect(viaObject.status).toBe('success')
    if (viaText.status !== 'success' || viaObject.status !== 'success') return
    expect(JSON.stringify(viaText.definition)).toBe(JSON.stringify(viaObject.definition))
    expect(viaText.metadata).toEqual(viaObject.metadata)
  })

  it('round-trips through JSON without change (content is pure data)', () => {
    const { definition } = importOk(gameFile())
    expect(JSON.parse(JSON.stringify(definition))).toEqual(definition)
  })
})

describe('the failure path yields no definition at all', () => {
  it('has no definition property to reach on a failure result', () => {
    const result = importGameFromUnknown(gameFile({ id: 'not valid' }))
    expect(result.status).toBe('failure')
    expect(result).not.toHaveProperty('definition')
    expect(result).not.toHaveProperty('metadata')
  })
})
