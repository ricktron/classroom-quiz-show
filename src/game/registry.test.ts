import { describe, expect, it } from 'vitest'
import { createRoundRegistry, RegistryError, type RoundTypeEntry } from './registry'
import { createDefaultRegistry } from './defaultRegistry'
import { placeholderRoundType } from './placeholderRound'
import { PLACEHOLDER_ROUND_TYPE, placeholderRound } from './roundDefinition'
import { roundType } from './ids'

function fakeEntry(type: string): RoundTypeEntry {
  return {
    type: roundType(type),
    displayName: `Fake ${type}`,
    matches: (definition) => definition.type === type,
    createInitialState: (definition) => ({ roundId: definition.id, type: definition.type }),
    toPublicRoundView: () => ({ availability: 'available' }),
  }
}

describe('round registry', () => {
  it('registers and looks up a known type explicitly', () => {
    const registry = createRoundRegistry()
    registry.register(fakeEntry('demo'))
    const result = registry.lookup(roundType('demo'))
    expect(result.status).toBe('known')
    if (result.status === 'known') expect(result.entry.displayName).toBe('Fake demo')
    expect(registry.isKnown(roundType('demo'))).toBe(true)
  })

  it('returns an explicit unknown result (no throw, no fallback) for an unregistered type', () => {
    const registry = createRoundRegistry()
    const result = registry.lookup(roundType('mystery'))
    expect(result).toEqual({ status: 'unknown', type: 'mystery' })
    expect(registry.isKnown(roundType('mystery'))).toBe(false)
  })

  it('rejects a duplicate registration clearly and safely', () => {
    const registry = createRoundRegistry()
    registry.register(fakeEntry('demo'))
    expect(() => registry.register(fakeEntry('demo'))).toThrow(RegistryError)
    // The first registration is intact and unchanged.
    const result = registry.lookup(roundType('demo'))
    expect(result.status).toBe('known')
  })

  it('never falls back from an unknown type to a default known type', () => {
    const registry = createDefaultRegistry()
    // The placeholder type IS known...
    expect(registry.isKnown(PLACEHOLDER_ROUND_TYPE)).toBe(true)
    // ...but an unknown type does not resolve to it (or anything else).
    const result = registry.lookup(roundType('unsupported-sample'))
    expect(result.status).toBe('unknown')
  })

  it('registration order does not alter game round order', () => {
    // Register two types in one order; a game defines rounds in another order.
    const registry = createRoundRegistry()
    registry.register(fakeEntry('z-type'))
    registry.register(fakeEntry('a-type'))
    expect(registry.knownTypes()).toEqual(['z-type', 'a-type'])
    // The game (built independently) keeps ITS authored order regardless.
    const rounds = [placeholderRound('r1', 'R1'), placeholderRound('r2', 'R2')]
    expect(rounds.map((r) => r.id)).toEqual(['r1', 'r2'])
  })

  it('is not mutated by game/definition data — registration is application-only', () => {
    const registry = createDefaultRegistry()
    const before = [...registry.knownTypes()]
    // Feeding round definitions (data) through lookup must not register anything.
    registry.lookup(roundType('unsupported-sample'))
    registry.lookup(PLACEHOLDER_ROUND_TYPE)
    registry.isKnown(roundType('anything'))
    expect(registry.knownTypes()).toEqual(before)
  })

  it('the built-in placeholder entry exposes typed, code-defined behavior only', () => {
    const def = placeholderRound('p1', 'P1')
    expect(placeholderRoundType.matches(def)).toBe(true)
    const initial = placeholderRoundType.createInitialState(def)
    expect(initial).toEqual({ roundId: 'p1', type: PLACEHOLDER_ROUND_TYPE })
    expect(placeholderRoundType.toPublicRoundView(initial)).toEqual({ availability: 'available' })
  })

  it('the default registry has exactly the placeholder type registered', () => {
    const registry = createDefaultRegistry()
    expect(registry.knownTypes()).toEqual([PLACEHOLDER_ROUND_TYPE])
  })

  it('returns a fresh independent registry each call', () => {
    const a = createDefaultRegistry()
    const b = createDefaultRegistry()
    a.register(fakeEntry('extra'))
    expect(a.isKnown(roundType('extra'))).toBe(true)
    expect(b.isKnown(roundType('extra'))).toBe(false)
  })
})
