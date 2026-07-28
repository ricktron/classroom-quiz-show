import { describe, expect, it } from 'vitest'
import { CanonicalizeError, canonicalizeData } from './canonicalizeData'

describe('canonicalizeData', () => {
  it('passes through scalar values', () => {
    expect(canonicalizeData(null)).toBeNull()
    expect(canonicalizeData('hello')).toBe('hello')
    expect(canonicalizeData(true)).toBe(true)
    expect(canonicalizeData(false)).toBe(false)
    expect(canonicalizeData(42)).toBe(42)
    expect(canonicalizeData(0)).toBe(0)
  })

  it('normalizes negative zero to ordinary zero', () => {
    const result = canonicalizeData(-0)
    expect(Object.is(result, -0)).toBe(false)
    expect(result).toBe(0)
  })

  it('recursively canonicalizes nested objects with lexically sorted keys', () => {
    const input = { z: 1, a: { d: 4, b: 2 }, m: 'mid' }
    const result = canonicalizeData(input) as Record<string, unknown>
    expect(Object.keys(result)).toEqual(['a', 'm', 'z'])
    expect(Object.getPrototypeOf(result)).toBeNull()
    const nested = result.a as Record<string, unknown>
    expect(Object.keys(nested)).toEqual(['b', 'd'])
    expect(Object.getPrototypeOf(nested)).toBeNull()
    expect(result).toEqual({ a: { b: 2, d: 4 }, m: 'mid', z: 1 })
  })

  it('accepts null-prototype objects', () => {
    const input = Object.create(null) as Record<string, unknown>
    input.b = 2
    input.a = 1
    const result = canonicalizeData(input) as Record<string, unknown>
    expect(Object.keys(result)).toEqual(['a', 'b'])
    expect(result).toEqual({ a: 1, b: 2 })
  })

  it('preserves array order and never sorts arrays', () => {
    const input = { items: ['z', 'a', 'm'], nested: [{ b: 1, a: 2 }, { d: 3, c: 4 }] }
    const result = canonicalizeData(input) as {
      items: string[]
      nested: Record<string, unknown>[]
    }
    expect(result.items).toEqual(['z', 'a', 'm'])
    expect(Object.keys(result.nested[0]!)).toEqual(['a', 'b'])
    expect(Object.keys(result.nested[1]!)).toEqual(['c', 'd'])
  })

  it('does not mutate the input object graph', () => {
    const input = { z: 1, a: { y: 2, x: 3 }, list: [{ b: 1, a: 2 }] }
    const before = JSON.stringify(input)
    canonicalizeData(input)
    expect(JSON.stringify(input)).toBe(before)
    expect(Object.keys(input)).toEqual(['z', 'a', 'list'])
    expect(Object.keys(input.a)).toEqual(['y', 'x'])
  })

  it('rejects unsupported primitive types', () => {
    expect(() => canonicalizeData(undefined)).toThrow(CanonicalizeError)
    expect(() => canonicalizeData(Symbol('x'))).toThrow(/symbol/i)
    expect(() => canonicalizeData(10n)).toThrow(/bigint/i)
    expect(() => canonicalizeData(() => 1)).toThrow(/function/i)
  })

  it('rejects exotic objects', () => {
    expect(() => canonicalizeData(new Date())).toThrow(/Date/)
    expect(() => canonicalizeData(new Map())).toThrow(/Map/)
    expect(() => canonicalizeData(new Set())).toThrow(/Set/)
    class Box {
      value = 1
    }
    expect(() => canonicalizeData(new Box())).toThrow(CanonicalizeError)
  })

  it('rejects undefined object property values rather than omitting them', () => {
    expect(() => canonicalizeData({ a: 1, b: undefined })).toThrow(/undefined/)
  })

  it('rejects non-finite numbers', () => {
    expect(() => canonicalizeData(Number.NaN)).toThrow(/Non-finite/)
    expect(() => canonicalizeData(Number.POSITIVE_INFINITY)).toThrow(/Non-finite/)
    expect(() => canonicalizeData(Number.NEGATIVE_INFINITY)).toThrow(/Non-finite/)
    expect(() => canonicalizeData({ n: Number.NaN })).toThrow(CanonicalizeError)
  })

  it('rejects cyclic data', () => {
    const cyclic: Record<string, unknown> = { a: 1 }
    cyclic.self = cyclic
    expect(() => canonicalizeData(cyclic)).toThrow(/Cyclic/)

    const arr: unknown[] = [1]
    arr.push(arr)
    expect(() => canonicalizeData(arr)).toThrow(/Cyclic/)
  })

  it('reports a useful path for nested failures', () => {
    try {
      canonicalizeData({ outer: { inner: Number.NaN } })
      expect.fail('expected throw')
    } catch (error) {
      expect(error).toBeInstanceOf(CanonicalizeError)
      expect((error as CanonicalizeError).path).toBe('outer.inner')
    }
  })
})
