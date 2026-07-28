import { describe, expect, it } from 'vitest'
import { canonicalizeData } from './canonicalizeData'
import { serializeCanonicalData, serializeCanonicalDocument } from './serializeCanonicalJson'

describe('serializeCanonicalData', () => {
  it('emits UTF-16-sorted keys even when JSON.stringify would reorder integer indices', () => {
    const keys = ['0', '1', '2', '10', '01', '1a', 'a', 'ä', '\ud83d\ude00']
    const utf16Order = [...keys].sort((a, b) => (a === b ? 0 : a < b ? -1 : 1))
    const input: Record<string, number> = {}
    // Insert in reverse of UTF-16 order to ensure insertion order is not trusted.
    for (const key of [...utf16Order].reverse()) {
      input[key] = 1
    }
    const canonical = canonicalizeData(input) as Record<string, number>
    const json = serializeCanonicalData(canonical)
    const stringifyOrder = Object.keys(JSON.parse(JSON.stringify(canonical)) as object)

    expect(utf16Order).toEqual(['0', '01', '1', '10', '1a', '2', 'a', 'ä', '\ud83d\ude00'])
    expect(stringifyOrder).toEqual(['0', '1', '2', '10', '01', '1a', 'a', 'ä', '\ud83d\ude00'])
    expect(stringifyOrder).not.toEqual(utf16Order)

    // Emitted property names appear in UTF-16 order in the raw bytes.
    const keyPositions = utf16Order.map((key) => json.indexOf(JSON.stringify(key)))
    for (let i = 1; i < keyPositions.length; i += 1) {
      expect(keyPositions[i]!).toBeGreaterThan(keyPositions[i - 1]!)
    }
    expect(json).toBe(
      '{"0":1,"01":1,"1":1,"10":1,"1a":1,"2":1,"a":1,"ä":1,"\ud83d\ude00":1}',
    )
  })

  it('preserves array order and escapes strings like JSON.stringify', () => {
    expect(serializeCanonicalData(['z', 'a', 'm'])).toBe('["z","a","m"]')
    expect(serializeCanonicalData('quote " and \\ and \n')).toBe(
      JSON.stringify('quote " and \\ and \n'),
    )
    expect(serializeCanonicalData('astral \u{1F600}')).toBe(JSON.stringify('astral \u{1F600}'))
    expect(serializeCanonicalData('lone \uD800')).toBe(JSON.stringify('lone \uD800'))
  })

  it('normalizes negative zero through JSON number rules', () => {
    expect(serializeCanonicalData(canonicalizeData(-0))).toBe('0')
  })
})

describe('serializeCanonicalDocument', () => {
  it('emits fixed envelope field order with optional teams omitted', () => {
    const text = serializeCanonicalDocument({
      format: 'classroom-quiz-show/game',
      schemaVersion: 1,
      id: 'ecology-review',
      title: 'Ecology Review',
      timer: { responseSeconds: 45 },
      rounds: [
        {
          id: 'r1',
          type: 'placeholder',
          title: 'R',
          config: { note: 'n', z: 1, a: 2 },
        },
      ],
    })
    expect(Object.keys(JSON.parse(text) as object)).toEqual([
      'format',
      'schemaVersion',
      'id',
      'title',
      'timer',
      'rounds',
    ])
    expect(text.indexOf('"format"')).toBeLessThan(text.indexOf('"schemaVersion"'))
    expect(text.indexOf('"schemaVersion"')).toBeLessThan(text.indexOf('"id"'))
    expect(text.indexOf('"id"')).toBeLessThan(text.indexOf('"title"'))
    expect(text.indexOf('"title"')).toBeLessThan(text.indexOf('"timer"'))
    expect(text.indexOf('"timer"')).toBeLessThan(text.indexOf('"rounds"'))
    expect(text).toContain('"config":{"a":2,"note":"n","z":1}')
    expect(text).toContain('"timer":{"responseSeconds":45}')
  })

  it('emits teams before timer with id/name/accent property order', () => {
    const text = serializeCanonicalDocument({
      format: 'classroom-quiz-show/game',
      schemaVersion: 1,
      id: 'with-teams',
      title: 'With Teams',
      teams: [{ id: 'red', name: 'Red', accent: 'crimson' }],
      timer: { responseSeconds: 30 },
      rounds: [],
    })
    expect(text.indexOf('"teams"')).toBeLessThan(text.indexOf('"timer"'))
    expect(text).toContain('{"id":"red","name":"Red","accent":"crimson"}')
  })
})
