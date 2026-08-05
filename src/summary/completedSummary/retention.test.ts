import { describe, expect, it } from 'vitest'
import { selectCompletedSummaryKeysToKeep } from './retention'
import { recordFixture } from './testFixtures'

describe('selectCompletedSummaryKeysToKeep', () => {
  it('keeps newest valid records by savedAt then recordId and ignores unknown/corrupt entries', () => {
    const listings = [
      {
        key: 'old',
        decoded: { status: 'valid' as const, record: recordFixture({ recordId: 'old', savedAt: 1 }) },
      },
      {
        key: 'b',
        decoded: { status: 'valid' as const, record: recordFixture({ recordId: 'b', savedAt: 2 }) },
      },
      {
        key: 'a',
        decoded: { status: 'valid' as const, record: recordFixture({ recordId: 'a', savedAt: 2 }) },
      },
      { key: 'future', decoded: { status: 'unsupported-envelope-version' as const, version: 2 } },
      { key: 'broken', decoded: { status: 'corrupt' as const, message: 'bad' } },
    ]

    expect(selectCompletedSummaryKeysToKeep(listings, 2)).toEqual(['a', 'b'])
  })
})
