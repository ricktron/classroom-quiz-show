import { describe, expect, it } from 'vitest'
import { CLASS_LABEL_MAX_LENGTH, validateClassLabel } from './classLabel'

describe('validateClassLabel', () => {
  it('accepts null and a non-empty label without rewriting it', () => {
    expect(validateClassLabel(null)).toEqual({ ok: true, value: null })
    expect(validateClassLabel('Period 1')).toEqual({ ok: true, value: 'Period 1' })
  })

  it.each(['', '   ', `x${' '.repeat(2)}`])('rejects invalid label %j', (label) => {
    const result = validateClassLabel(label)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.message.length).toBeGreaterThan(0)
  })

  it('rejects labels longer than the documented limit', () => {
    expect(CLASS_LABEL_MAX_LENGTH).toBe(80)
    expect(validateClassLabel('x'.repeat(81))).toMatchObject({ ok: false })
  })
})
