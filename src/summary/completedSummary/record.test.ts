import { describe, expect, it } from 'vitest'
import { buildCompletedSummaryRecordV1 } from './record'
import { completedHistory } from './testHistory'

describe('buildCompletedSummaryRecordV1', () => {
  it('is the single construction boundary for paired summary and profile', async () => {
    const result = await buildCompletedSummaryRecordV1(completedHistory().history, {
      savedAt: 30,
      classLabel: 'Period 1',
    })
    expect(result.status).toBe('success')
    if (result.status !== 'success') throw new Error('expected record')
    expect(result.record).toMatchObject({
      kind: 'classroom-quiz-show/completed-summary-record',
      version: 1,
      recordId: 'summary-session',
      savedAt: 30,
      classLabel: 'Period 1',
    })
    expect(result.record.recordId).toBe(result.record.summary.sessionId)
    expect(result.record.competitiveProfile.game.gameId).toBe(result.record.summary.gameId)
    expect(Object.isFrozen(result.record)).toBe(true)
  })

  it('rejects invalid options and incomplete histories with actionable failures', async () => {
    await expect(
      buildCompletedSummaryRecordV1(completedHistory().history, {
        savedAt: -1,
        classLabel: null,
      }),
    ).resolves.toMatchObject({ status: 'failure', code: 'invalid-saved-at' })
    await expect(
      buildCompletedSummaryRecordV1([], { savedAt: 1, classLabel: null }),
    ).resolves.toMatchObject({ status: 'failure', code: 'summary-unavailable' })
  })
})
