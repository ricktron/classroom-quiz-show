import { describe, expect, it } from 'vitest'
import {
  CANONICAL_GAME_FILE_FORMAT,
  MAX_ROUNDS,
  MAX_TITLE_LENGTH,
  SUPPORTED_SCHEMA_VERSION,
} from './canonicalFormat'
import { importGameFromUnknown } from './importGame'
import type { ImportIssue } from './issues'
import { gameFile, roundFile } from '../test/gameFileFixtures'

/**
 * Canonical format + version policy.
 *
 * These tests pin the shape of the format itself: what is required, what is
 * rejected, and that round order is exactly the authored array order.
 */

function codes(issues: readonly ImportIssue[]): string[] {
  return issues.map((i) => i.code)
}

function expectFailure(input: unknown): readonly ImportIssue[] {
  const result = importGameFromUnknown(input)
  expect(result.status).toBe('failure')
  if (result.status !== 'failure') throw new Error('unreachable')
  expect(result.issues.length).toBeGreaterThan(0)
  return result.issues
}

describe('canonical document — happy paths', () => {
  it('accepts a valid minimal single-round document', () => {
    const result = importGameFromUnknown(gameFile())
    expect(result.status).toBe('success')
    if (result.status !== 'success') return
    expect(result.metadata).toEqual({
      format: CANONICAL_GAME_FILE_FORMAT,
      schemaVersion: SUPPORTED_SCHEMA_VERSION,
      gameId: 'sample-game',
      roundCount: 1,
    })
  })

  it('accepts a valid multi-round document and preserves the authored order', () => {
    const result = importGameFromUnknown(
      gameFile({ rounds: [roundFile('zeta'), roundFile('alpha'), roundFile('mid')] }),
    )
    expect(result.status).toBe('success')
    if (result.status !== 'success') return
    // NOT sorted, NOT registry order — exactly the order in the JSON array.
    expect(result.definition.rounds.map((r) => r.id)).toEqual(['zeta', 'alpha', 'mid'])
  })

  it('accepts an empty rounds array, matching the Slice 3 domain contract', () => {
    const result = importGameFromUnknown(gameFile({ rounds: [] }))
    expect(result.status).toBe('success')
    if (result.status !== 'success') return
    expect(result.definition.rounds).toEqual([])
    expect(result.metadata.roundCount).toBe(0)
  })
})

describe('format identity', () => {
  it('requires the format field', () => {
    const issues = expectFailure(gameFile({ format: undefined }))
    expect(codes(issues)).toContain('missing-format')
    expect(issues[0].stage).toBe('format')
  })

  it('rejects an unknown format identity without guessing the shape', () => {
    const issues = expectFailure(gameFile({ format: 'some-other-app/game' }))
    expect(codes(issues)).toContain('unsupported-format')
    expect(issues[0].message).toContain(CANONICAL_GAME_FILE_FORMAT)
  })

  it('rejects a non-string format', () => {
    expect(codes(expectFailure(gameFile({ format: 1 })))).toContain('unsupported-format')
  })
})

describe('version policy', () => {
  it('requires schemaVersion', () => {
    const issues = expectFailure(gameFile({ schemaVersion: undefined }))
    expect(codes(issues)).toContain('missing-schema-version')
  })

  it('rejects an unsupported OLDER version (no migration is implemented)', () => {
    const issues = expectFailure(gameFile({ schemaVersion: 0 }))
    expect(codes(issues)).toContain('unsupported-schema-version')
    expect(issues[0].message).toContain('supported version: 1')
  })

  it('rejects an unsupported NEWER version (no silent downgrade)', () => {
    const issues = expectFailure(gameFile({ schemaVersion: 2 }))
    const versionIssue = issues.find((i) => i.code === 'unsupported-schema-version')
    expect(versionIssue?.message).toContain('schemaVersion 2 is not supported')
    expect(versionIssue?.context).toEqual({ found: 2, supported: 1 })
  })

  it('rejects a malformed (non-integer / non-numeric) version', () => {
    expect(codes(expectFailure(gameFile({ schemaVersion: '1' })))).toContain(
      'invalid-schema-version',
    )
    expect(codes(expectFailure(gameFile({ schemaVersion: 1.5 })))).toContain(
      'invalid-schema-version',
    )
  })

  it('reports a bad format and a bad version together', () => {
    const issues = expectFailure(gameFile({ format: 'nope', schemaVersion: 9 }))
    expect(codes(issues)).toEqual(['unsupported-format', 'unsupported-schema-version'])
  })
})

describe('strict unknown-key policy', () => {
  it('rejects an unknown TOP-LEVEL field instead of dropping it', () => {
    const issues = expectFailure(gameFile({ theme: 'space' }))
    const unknown = issues.find((i) => i.code === 'unknown-field')
    expect(unknown?.path).toBe('theme')
    expect(unknown?.stage).toBe('schema')
  })

  it.each([
    ['theme', 'high-contrast'],
    ['css', 'body{color:red}'],
    ['tokens', '--surface-tile:#fff'],
    ['selector', '.accent--crimson'],
    ['className', 'host__theme'],
    ['stylesheetUrl', 'https://evil.example/theme.css'],
    ['gradient', 'linear-gradient(red,blue)'],
    ['animation', 'rtd-pulse 1s infinite'],
  ])(
    'rejects imported %s authority (%j) as an unknown field',
    (key, value) => {
      const issues = expectFailure(gameFile({ [key]: value }))
      const unknown = issues.find((i) => i.code === 'unknown-field')
      expect(unknown?.path).toBe(key)
      expect(unknown?.stage).toBe('schema')
    },
  )

  it('rejects an unknown NESTED field with an exact path', () => {
    const issues = expectFailure(
      gameFile({ rounds: [{ ...roundFile('r1'), points: 400 }] }),
    )
    expect(issues.find((i) => i.code === 'unknown-field')?.path).toBe('rounds[0].points')
  })

  it('rejects an unknown key inside a registered round type config', () => {
    const issues = expectFailure(
      gameFile({ rounds: [{ ...roundFile('r1'), config: { note: 'ok', categories: [] } }] }),
    )
    const unknown = issues.find((i) => i.code === 'unknown-field')
    expect(unknown?.path).toBe('rounds[0].config.categories')
  })
})

describe('identifier and title rules', () => {
  it('rejects an empty game id', () => {
    expect(codes(expectFailure(gameFile({ id: '' })))).toContain('value-too-small')
  })

  it('rejects a whitespace-only id rather than trimming it into acceptance', () => {
    const issues = expectFailure(gameFile({ id: '   ' }))
    expect(codes(issues)).toContain('invalid-format')
  })

  it('rejects an id with characters outside the documented grammar', () => {
    expect(codes(expectFailure(gameFile({ id: 'has spaces' })))).toContain('invalid-format')
    expect(codes(expectFailure(gameFile({ id: '../escape' })))).toContain('invalid-format')
  })

  it('rejects an invalid round id with an exact path', () => {
    const issues = expectFailure(gameFile({ rounds: [roundFile('bad id')] }))
    expect(issues.find((i) => i.code === 'invalid-format')?.path).toBe('rounds[0].id')
  })

  it('rejects duplicate round ids, naming the round it duplicates', () => {
    const issues = expectFailure(gameFile({ rounds: [roundFile('same'), roundFile('same')] }))
    const duplicate = issues.find((i) => i.code === 'duplicate-round-id')
    expect(duplicate?.path).toBe('rounds[1].id')
    expect(duplicate?.message).toContain('duplicates rounds[0].id')
    expect(duplicate?.stage).toBe('semantic')
  })

  it('rejects a whitespace-only title without inventing one', () => {
    const issues = expectFailure(gameFile({ title: '  \t ' }))
    expect(codes(issues)).toContain('blank-title')
  })

  it('rejects an overlong title rather than truncating it', () => {
    const issues = expectFailure(gameFile({ title: 'x'.repeat(MAX_TITLE_LENGTH + 1) }))
    expect(codes(issues)).toContain('value-too-large')
  })

  it('rejects more rounds than the documented maximum', () => {
    const rounds = Array.from({ length: MAX_ROUNDS + 1 }, (_, i) => roundFile(`r-${i}`))
    expect(codes(expectFailure(gameFile({ rounds })))).toContain('value-too-large')
  })
})

describe('no silent coercion, defaults, or repair', () => {
  it('does not accept a number where a string title is declared', () => {
    expect(codes(expectFailure(gameFile({ title: 42 })))).toContain('invalid-type')
  })

  it('does not accept a numeric string where an integer version is declared', () => {
    expect(codes(expectFailure(gameFile({ schemaVersion: '1' })))).toContain(
      'invalid-schema-version',
    )
  })

  it('does not widen a single round object into an array', () => {
    expect(codes(expectFailure(gameFile({ rounds: roundFile('solo') })))).toContain('invalid-type')
  })

  it('does not treat a missing rounds array as an empty one', () => {
    const withoutRounds = gameFile()
    delete withoutRounds.rounds
    const issues = expectFailure(withoutRounds)
    const missing = issues.find((i) => i.code === 'missing-field')
    expect(missing?.path).toBe('rounds')
    expect(missing?.message).toBe('rounds is required but missing.')
  })

  it('treats an explicitly-undefined field as a non-data value, not as absent', () => {
    // `{ rounds: undefined }` is NOT the same document as one with no `rounds`
    // key: `undefined` has no JSON representation, so it is rejected outright
    // rather than quietly read as "missing" and defaulted.
    const issues = expectFailure(gameFile({ rounds: undefined }))
    expect(codes(issues)).toContain('non-data-value')
  })

  it('does not replace a malformed config with an empty object', () => {
    const issues = expectFailure(gameFile({ rounds: [{ ...roundFile('r1'), config: 'note' }] }))
    expect(issues.find((i) => i.path === 'rounds[0].config')).toBeDefined()
  })

  it('does not accept null where an object or string is required', () => {
    expect(codes(expectFailure(gameFile({ title: null })))).toContain('invalid-type')
    expect(codes(expectFailure(gameFile({ rounds: [{ ...roundFile('r1'), config: null }] })))).toContain(
      'invalid-value',
    )
  })

  it('rejects a partially valid game outright — nothing is imported', () => {
    const result = importGameFromUnknown(
      gameFile({ rounds: [roundFile('good'), { ...roundFile('bad'), title: 7 }] }),
    )
    expect(result.status).toBe('failure')
    // There is no "partial" variant of the result type at all.
    expect(Object.keys(result)).toEqual(['status', 'issues'])
  })
})
