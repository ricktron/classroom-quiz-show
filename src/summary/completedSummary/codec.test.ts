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

  it('classifies unknown V2 envelopes without requiring V1 exact keys', () => {
    const cases: unknown[] = [
      {
        kind: 'classroom-quiz-show/completed-summary-record',
        version: 2,
        extraField: true,
        nested: { privateLooking: 'secret' },
      },
      {
        kind: 'classroom-quiz-show/completed-summary-record',
        version: 2,
      },
      {
        kind: 'classroom-quiz-show/completed-summary-record',
        version: 2,
        recordId: 'x',
        savedAt: 1,
        // missing classLabel / competitiveProfile / summary on purpose
      },
      {
        kind: 'classroom-quiz-show/completed-summary-record',
        version: 2,
        completelyDifferentShape: [{ a: 1 }],
        lease: { tabId: 'should-not-be-read' },
      },
    ]
    for (const input of cases) {
      expect(decodeCompletedSummaryRecord(input)).toEqual({
        status: 'unsupported-envelope-version',
        version: 2,
      })
    }
  })

  it('still classifies malformed kind/version and wrong kind as corrupt', () => {
    expect(decodeCompletedSummaryRecord(null)).toMatchObject({ status: 'corrupt' })
    expect(decodeCompletedSummaryRecord({ kind: 'other', version: 1 })).toMatchObject({
      status: 'corrupt',
    })
    expect(
      decodeCompletedSummaryRecord({
        kind: 'classroom-quiz-show/completed-summary-record',
        version: '2',
      }),
    ).toMatchObject({ status: 'corrupt' })
  })
})
