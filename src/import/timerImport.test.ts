import { describe, expect, it } from 'vitest'
import { importGameFromJsonText, importGameFromUnknown } from './importGame'
import {
  CANONICAL_SAMPLE_CATEGORY_BOARD_FILE,
  CANONICAL_SAMPLE_GAME_FILE,
  importBuiltInCategoryBoardGame,
  importBuiltInSampleGame,
} from './sampleGameFile'
import { gameFile, gameFileText } from '../test/gameFileFixtures'
import { DEFAULT_RESPONSE_SECONDS, MAX_RESPONSE_SECONDS, MIN_RESPONSE_SECONDS } from '../game/timing/limits'
import { SUPPORTED_SCHEMA_VERSION } from './canonicalFormat'

/**
 * The authored `timer` block through the ONE import pipeline (Slice 7).
 *
 * The claims proved here:
 *  - `timer` is ADDITIVE on `schemaVersion: 1` — every pre-Slice-7 game file is
 *    still valid, still means the same thing, and needs no migration;
 *  - a missing block gets the documented default, applied visibly by the trusted
 *    constructor and never by a Zod `.default()`;
 *  - an invalid block is REJECTED with an exact document path, never repaired,
 *    clamped, rounded or dropped;
 *  - there is no second validation path: the same schema serves the importer and
 *    the trusted constructor.
 */

function importFile(overrides: Record<string, unknown>) {
  return importGameFromUnknown(gameFile(overrides))
}

describe('backward compatibility with pre-Slice-7 game files', () => {
  it('imports a file with NO timer block and applies the documented default', () => {
    const result = importFile({})
    expect(result.status).toBe('success')
    if (result.status !== 'success') return
    expect(result.definition.timer).toEqual({ responseSeconds: DEFAULT_RESPONSE_SECONDS })
  })

  it('keeps the schema version at 1 — this is an in-place extension', () => {
    const result = importFile({ timer: { responseSeconds: 45 } })
    expect(result.status).toBe('success')
    if (result.status !== 'success') return
    expect(result.metadata.schemaVersion).toBe(SUPPORTED_SCHEMA_VERSION)
    expect(SUPPORTED_SCHEMA_VERSION).toBe(1)
  })

  it('still rejects schemaVersion 2 — no migration exists and none is implied', () => {
    const result = importGameFromJsonText(gameFileText({ schemaVersion: 2 }))
    expect(result.status).toBe('failure')
  })

  it('leaves an existing file byte-identical in meaning', () => {
    // The same document imported before and after Slice 7 differs only by the
    // defaulted timer; nothing else about it is reinterpreted.
    const result = importFile({ title: 'Unchanged' })
    expect(result.status).toBe('success')
    if (result.status !== 'success') return
    expect(result.definition.title).toBe('Unchanged')
    expect(result.definition.teams).toEqual([])
  })
})

describe('an authored timer block', () => {
  it('is carried through verbatim', () => {
    const result = importFile({ timer: { responseSeconds: 90 } })
    expect(result.status).toBe('success')
    if (result.status !== 'success') return
    expect(result.definition.timer.responseSeconds).toBe(90)
  })

  it('accepts exactly the documented bounds', () => {
    for (const seconds of [MIN_RESPONSE_SECONDS, MAX_RESPONSE_SECONDS]) {
      const result = importFile({ timer: { responseSeconds: seconds } })
      expect(result.status, `seconds ${seconds}`).toBe('success')
    }
  })

  it('is deep-frozen with the rest of the definition', () => {
    const result = importFile({ timer: { responseSeconds: 60 } })
    if (result.status !== 'success') throw new Error('expected success')
    expect(Object.isFrozen(result.definition.timer)).toBe(true)
  })
})

describe('an invalid timer block is rejected, never repaired', () => {
  const cases: ReadonlyArray<readonly [string, unknown]> = [
    ['below the minimum', { responseSeconds: MIN_RESPONSE_SECONDS - 1 }],
    ['above the maximum', { responseSeconds: MAX_RESPONSE_SECONDS + 1 }],
    ['zero', { responseSeconds: 0 }],
    ['negative', { responseSeconds: -30 }],
    ['fractional', { responseSeconds: 30.5 }],
    ['a numeric string', { responseSeconds: '30' }],
    ['missing the field', {}],
    ['not an object', 30],
    ['null', null],
    ['an unknown extra field', { responseSeconds: 30, warnAt: 5 }],
  ]

  for (const [label, timer] of cases) {
    it(`rejects ${label}`, () => {
      const result = importFile({ timer })
      expect(result.status).toBe('failure')
    })
  }

  it('reports the exact document path so a teacher can find it', () => {
    const result = importFile({ timer: { responseSeconds: 1 } })
    expect(result.status).toBe('failure')
    if (result.status !== 'failure') return
    expect(result.issues.some((issue) => issue.path === 'timer.responseSeconds')).toBe(true)
  })

  it('names the misspelled key rather than dropping it', () => {
    const result = importFile({ timer: { responseSeconds: 30, responseSecond: 5 } })
    expect(result.status).toBe('failure')
    if (result.status !== 'failure') return
    expect(result.issues.some((issue) => issue.code === 'unknown-field')).toBe(true)
  })

  it('loads no game at all when the timer is invalid', () => {
    const result = importFile({ timer: { responseSeconds: 0 } })
    expect(result.status).toBe('failure')
    if (result.status !== 'failure') return
    expect(result).not.toHaveProperty('definition')
  })
})

describe('the built-in samples exercise both paths', () => {
  it('the board sample authors a window', () => {
    const result = importBuiltInCategoryBoardGame()
    expect(result.status).toBe('success')
    if (result.status !== 'success') return
    expect(result.definition.timer.responseSeconds).toBe(45)
    expect(CANONICAL_SAMPLE_CATEGORY_BOARD_FILE).toContain('responseSeconds')
  })

  it('the three-round sample authors none and gets the default', () => {
    const result = importBuiltInSampleGame()
    expect(result.status).toBe('success')
    if (result.status !== 'success') return
    expect(result.definition.timer.responseSeconds).toBe(DEFAULT_RESPONSE_SECONDS)
    expect(CANONICAL_SAMPLE_GAME_FILE).not.toContain('responseSeconds')
  })
})
