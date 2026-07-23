import { describe, expect, it } from 'vitest'
import { gameId, gameSessionId, roundId, roundType } from './ids'

/**
 * Branded ids are plain strings at runtime but only constructible through the
 * validating constructors. The brand is compile-time only, so these tests focus
 * on the runtime contract: non-empty validation and value preservation.
 */
describe('branded id constructors', () => {
  it('preserve the underlying string value', () => {
    expect(gameId('g-1')).toBe('g-1')
    expect(roundId('r-1')).toBe('r-1')
    expect(roundType('placeholder')).toBe('placeholder')
    expect(gameSessionId('gs-1')).toBe('gs-1')
  })

  it('reject empty strings', () => {
    expect(() => gameId('')).toThrow(TypeError)
    expect(() => roundId('')).toThrow(TypeError)
    expect(() => roundType('')).toThrow(TypeError)
    expect(() => gameSessionId('')).toThrow(TypeError)
  })

  it('carry no runtime brand property', () => {
    // The brand exists only in the type system — the value is a bare string
    // primitive, identical to its input, with no wrapper object or extra field.
    const value = roundType('placeholder')
    expect(typeof value).toBe('string')
    expect(value).toBe('placeholder')
    expect(JSON.stringify(value)).toBe('"placeholder"')
  })
})
