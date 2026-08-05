import { describe, expect, it } from 'vitest'
import {
  decodeCompletedSummaryRecord,
  encodeCompletedSummaryRecord,
} from './codec'
import { recordFixture } from './testFixtures'

describe('completed summary codec', () => {
  it('round-trips a valid record and deep-freezes the trusted value', () => {
    const decoded = decodeCompletedSummaryRecord(encodeCompletedSummaryRecord(recordFixture()))
    expect(decoded.status).toBe('valid')
    if (decoded.status !== 'valid') throw new Error('expected valid')
    expect(decoded.record).toEqual(recordFixture())
    expect(Object.isFrozen(decoded.record)).toBe(true)
    expect(Object.isFrozen(decoded.record.summary.scoreActivity.observed.perTeam)).toBe(true)
  })

  it('rejects unknown keys and an invalid recordId relationship as corrupt', () => {
    expect(
      decodeCompletedSummaryRecord({ ...recordFixture(), unexpected: true }),
    ).toMatchObject({ status: 'corrupt' })
    expect(
      decodeCompletedSummaryRecord({ ...recordFixture(), recordId: 'not-session' }),
    ).toMatchObject({ status: 'corrupt' })
  })

  it('classifies each unsupported version boundary', () => {
    expect(
      decodeCompletedSummaryRecord({ ...recordFixture(), version: 2 }),
    ).toMatchObject({ status: 'unsupported-envelope-version', version: 2 })
    expect(
      decodeCompletedSummaryRecord({
        ...recordFixture(),
        summary: { ...recordFixture().summary, version: 2 },
      }),
    ).toMatchObject({ status: 'unsupported-summary-version', version: 2 })
    const unsupportedProfile = decodeCompletedSummaryRecord({
      ...recordFixture(),
      competitiveProfile: { ...recordFixture().competitiveProfile, version: 2 },
    })
    expect(unsupportedProfile).toMatchObject({
      status: 'unsupported-profile-version',
      version: 2,
      summary: recordFixture().summary,
    })
  })
})
