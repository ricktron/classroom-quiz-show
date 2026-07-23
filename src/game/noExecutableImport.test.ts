import { describe, expect, it } from 'vitest'
import { createSampleGame, createSampleGameWithUnsupportedRound } from './sampleGame'
import { createGameDefinition } from './gameDefinition'
import { placeholderRound, type RoundConfig, type RoundDefinition } from './roundDefinition'
import { createDefaultRegistry } from './defaultRegistry'
import { roundType } from './ids'

/**
 * Permanent invariant (GAME-ENGINE-BOUNDARIES §5): game content is DATA, never
 * executable code. These tests prove the model and registry contain only
 * data/type references for content and expose no execution path for imported
 * functions, source strings, URLs, modules, or eval-like behavior.
 */

/** Recursively detect any function (or unexpected non-data) value in a graph. */
function containsFunction(value: unknown, seen = new Set<unknown>()): boolean {
  if (typeof value === 'function') return true
  if (value === null || typeof value !== 'object') return false
  if (seen.has(value)) return false
  seen.add(value)
  if (Array.isArray(value)) return value.some((v) => containsFunction(v, seen))
  return Object.values(value as Record<string, unknown>).some((v) => containsFunction(v, seen))
}

describe('game content is data, never code', () => {
  it('a sample game definition contains no functions anywhere', () => {
    expect(containsFunction(createSampleGame())).toBe(false)
  })

  it('a definition with an unsupported round is still purely data', () => {
    expect(containsFunction(createSampleGameWithUnsupportedRound())).toBe(false)
  })

  it('a round definition and its config are JSON round-trippable (no code, no cycles)', () => {
    const def = createSampleGame()
    const clone = JSON.parse(JSON.stringify(def))
    expect(clone.rounds).toHaveLength(def.rounds.length)
    expect(clone.rounds[0].type).toBe(def.rounds[0].type)
  })

  it('config carrying a function is only expressible via an explicit unsafe cast', () => {
    // The DataValue/RoundConfig types REJECT a function at compile time; forcing
    // one in requires an explicit `as unknown as RoundConfig` cast — proving code
    // in config is not a normal, type-safe path.
    const hostileConfig = { evil: () => 'boom' } as unknown as RoundConfig
    const hostile: RoundDefinition = { ...placeholderRound('r', 'R'), config: hostileConfig }
    expect(containsFunction(hostile.config)).toBe(true)
    // The trusted factory still builds a definition (it does not execute code),
    // and nothing anywhere invokes the smuggled function.
    const def = createGameDefinition({ id: 'g', title: 'T', rounds: [hostile] })
    expect(typeof def.rounds[0].type).toBe('string')
  })
})

describe('registry exposes no code-execution path from content', () => {
  it('has no eval/import/dynamic-registration surface — only register/lookup/isKnown/knownTypes', () => {
    const registry = createDefaultRegistry()
    expect(Object.keys(registry).sort()).toEqual(
      ['isKnown', 'knownTypes', 'lookup', 'register'].sort(),
    )
  })

  it('an unknown type resolves to an explicit miss, never a loaded module', () => {
    const registry = createDefaultRegistry()
    const result = registry.lookup(roundType('remote-plugin-url'))
    expect(result.status).toBe('unknown')
  })

  it('looking up types (data) never mutates the registry', () => {
    const registry = createDefaultRegistry()
    const before = [...registry.knownTypes()]
    registry.lookup(roundType('a'))
    registry.lookup(roundType('b'))
    expect(registry.knownTypes()).toEqual(before)
  })
})
