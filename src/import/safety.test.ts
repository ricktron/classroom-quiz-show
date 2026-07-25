import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import { MAX_DOCUMENT_DEPTH } from './canonicalFormat'
import { importGameFromJsonText, importGameFromUnknown } from './importGame'
import type { ImportIssue } from './issues'
import { canonicalGameFileSchema } from './schemas'
import { scanImportedDocument, UNSAFE_OBJECT_KEYS } from './safetyScan'
import { gameFile } from '../test/gameFileFixtures'

/**
 * Security & robustness at the import boundary.
 *
 * These tests cover the hostile and exotic inputs the object-level entry point
 * must survive. They assert what is ACTUALLY defended: unsafe keys, non-data
 * values, non-finite numbers, cycles, and excessive nesting.
 */

function issuesOf(input: unknown): readonly ImportIssue[] {
  const result = importGameFromUnknown(input)
  expect(result.status).toBe('failure')
  if (result.status !== 'failure') throw new Error('unreachable')
  return result.issues
}

function codes(input: unknown): string[] {
  return issuesOf(input).map((i) => i.code)
}

describe('prototype-pollution vectors', () => {
  it.each(UNSAFE_OBJECT_KEYS)('rejects a top-level "%s" key', (key) => {
    const document = gameFile()
    Object.defineProperty(document, key, {
      value: { polluted: true },
      enumerable: true,
      configurable: true,
      writable: true,
    })
    const issues = issuesOf(document)
    expect(issues.some((i) => i.code === 'unsafe-object-key' && i.path === key)).toBe(true)
  })

  it('rejects an unsafe key nested inside a round config', () => {
    const document = gameFile({
      rounds: [
        {
          id: 'r1',
          type: 'placeholder',
          title: 'R1',
          config: JSON.parse('{"note":"ok","__proto__":{"admin":true}}') as Record<string, unknown>,
        },
      ],
    })
    const issues = issuesOf(document)
    const unsafe = issues.find((i) => i.code === 'unsafe-object-key')
    expect(unsafe?.path).toBe('rounds[0].config.__proto__')
  })

  it('a rejected import pollutes nothing', () => {
    const probe = {} as Record<string, unknown>
    expect(probe.admin).toBeUndefined()
    importGameFromJsonText('{"__proto__":{"admin":true},"format":"classroom-quiz-show/game"}')
    expect(({} as Record<string, unknown>).admin).toBeUndefined()
    expect(Object.prototype).not.toHaveProperty('admin')
  })

  it('documents WHY the scan exists: Zod strict objects do not flag these keys', () => {
    // `'__proto__' in shape` is true via Object.prototype, so a strict object
    // treats it as "recognized" and reports nothing. Verified here so a future
    // Zod upgrade that changes this is noticed rather than assumed.
    const withProto = JSON.parse('{"__proto__":{"x":1}}') as Record<string, unknown>
    const zodResult = canonicalGameFileSchema.safeParse(withProto)
    const zodFlaggedUnknownKeys = zodResult.success
      ? []
      : zodResult.error.issues
          .filter((i) => i.code === 'unrecognized_keys')
          .flatMap((i) => (i as z.core.$ZodIssueUnrecognizedKeys).keys)
    expect(zodFlaggedUnknownKeys).not.toContain('__proto__')
    // Our scan does flag it.
    expect(scanImportedDocument(withProto).map((i) => i.code)).toContain('unsafe-object-key')
  })
})

describe('non-data values (object-level entry point)', () => {
  const cases: ReadonlyArray<readonly [string, unknown]> = [
    ['function', () => 'boom'],
    ['symbol', Symbol('s')],
    ['bigint', 10n],
    ['undefined', undefined],
    ['Date', new Date(0)],
    ['Map', new Map()],
    ['Set', new Set()],
    ['RegExp', /x/],
    ['class instance', new (class Hostile {})()],
  ]

  it.each(cases)('rejects a %s in a round title', (_label, value) => {
    const document = gameFile({
      rounds: [{ id: 'r1', type: 'placeholder', title: value, config: { note: 'n' } }],
    })
    const issues = issuesOf(document)
    expect(issues.some((i) => i.code === 'non-data-value' && i.path === 'rounds[0].title')).toBe(
      true,
    )
  })

  it('rejects a symbol-keyed property', () => {
    const config: Record<string | symbol, unknown> = { note: 'n' }
    config[Symbol('hidden')] = 'value'
    const document = gameFile({
      rounds: [{ id: 'r1', type: 'placeholder', title: 'R1', config }],
    })
    expect(codes(document)).toContain('non-data-value')
  })

  it('rejects a non-finite number', () => {
    for (const value of [Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY]) {
      const document = gameFile({
        rounds: [{ id: 'r1', type: 'placeholder', title: 'R1', config: { note: 'n', n: value } }],
      })
      expect(codes(document)).toContain('non-finite-number')
    }
  })

  it('rejects a cyclic object without hanging or throwing', () => {
    const config: Record<string, unknown> = { note: 'n' }
    config.self = config
    const document = gameFile({
      rounds: [{ id: 'r1', type: 'placeholder', title: 'R1', config }],
    })
    const issues = issuesOf(document)
    expect(issues.some((i) => i.code === 'cyclic-reference')).toBe(true)
  })

  it('accepts a shared (non-cyclic) reference — a DAG is not a cycle', () => {
    const shared = { note: 'shared note' }
    const document = gameFile({
      rounds: [
        { id: 'r1', type: 'placeholder', title: 'R1', config: shared },
        { id: 'r2', type: 'placeholder', title: 'R2', config: shared },
      ],
    })
    expect(importGameFromUnknown(document).status).toBe('success')
  })

  it('rejects a document nested deeper than the supported limit', () => {
    let nested: unknown = 'leaf'
    for (let i = 0; i < MAX_DOCUMENT_DEPTH + 4; i += 1) nested = { deeper: nested }
    const document = gameFile({
      rounds: [{ id: 'r1', type: 'placeholder', title: 'R1', config: { note: 'n', nested } }],
    })
    expect(codes(document)).toContain('document-too-deep')
  })

  it('truncates a pathological issue list explicitly rather than silently', () => {
    const config: Record<string, unknown> = { note: 'n' }
    for (let i = 0; i < 60; i += 1) config[`bad-${i}`] = undefined
    const document = gameFile({
      rounds: [{ id: 'r1', type: 'placeholder', title: 'R1', config }],
    })
    const issues = issuesOf(document)
    expect(issues.some((i) => i.code === 'issues-truncated')).toBe(true)
    expect(issues.length).toBeLessThanOrEqual(26)
  })
})

describe('array / object confusion', () => {
  it('rejects an array where an object is required', () => {
    expect(codes(gameFile({ rounds: [{ id: 'r1', type: 'placeholder', title: 'R', config: [] }] })))
      .toContain('invalid-value')
  })

  it('rejects an object where an array is required', () => {
    expect(codes(gameFile({ rounds: { '0': { id: 'r1' } } }))).toContain('invalid-type')
  })

  it('rejects a top-level array', () => {
    const result = importGameFromUnknown([gameFile()])
    expect(result.status).toBe('failure')
    if (result.status !== 'failure') return
    expect(result.issues[0].code).toBe('root-not-object')
  })
})

describe('duplicate JSON keys', () => {
  it('follows JSON.parse last-one-wins semantics and validates the survivor', () => {
    // JSON.parse keeps the LAST occurrence; the pipeline cannot observe the
    // first. This is documented behaviour, not a claimed defence.
    const text = '{"format":"classroom-quiz-show/game","schemaVersion":1,"id":"a","id":"b c","title":"T","rounds":[]}'
    const result = importGameFromJsonText(text)
    expect(result.status).toBe('failure')
    if (result.status !== 'failure') return
    expect(result.issues.some((i) => i.path === 'id' && i.code === 'invalid-format')).toBe(true)
  })
})

describe('accessor properties (time-of-check / time-of-use)', () => {
  it('rejects a getter rather than validating a value that can then change', () => {
    // A getter could return a valid value while it is being validated and a
    // different one when the definition is built from it. Data has no
    // accessors, so the scan rejects them outright.
    let reads = 0
    const config = {
      note: 'n',
      get sneaky(): string {
        reads += 1
        return reads === 1 ? 'innocent' : 'swapped after validation'
      },
    }
    const document = gameFile({
      rounds: [{ id: 'r1', type: 'placeholder', title: 'R1', config }],
    })
    const issues = issuesOf(document)
    expect(
      issues.some(
        (i) => i.code === 'non-data-value' && i.path === 'rounds[0].config.sneaky',
      ),
    ).toBe(true)
  })

  it('rejects a setter-only property', () => {
    const config: Record<string, unknown> = { note: 'n' }
    Object.defineProperty(config, 'trap', {
      set: () => {},
      enumerable: true,
      configurable: true,
    })
    const document = gameFile({
      rounds: [{ id: 'r1', type: 'placeholder', title: 'R1', config }],
    })
    expect(codes(document)).toContain('non-data-value')
  })

  it('rejects a getter on the document root', () => {
    const document = gameFile()
    Object.defineProperty(document, 'title', {
      get: () => 'Shifting Title',
      enumerable: true,
      configurable: true,
    })
    const issues = issuesOf(document)
    expect(issues.some((i) => i.code === 'non-data-value' && i.path === 'title')).toBe(true)
  })

  it('still accepts ordinary data properties', () => {
    expect(importGameFromUnknown(gameFile()).status).toBe('success')
  })
})
