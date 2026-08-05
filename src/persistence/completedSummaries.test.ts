import { describe, expect, it } from 'vitest'
import { createMemoryPersistenceAdapter } from './memoryAdapter'
import {
  clearAllCompletedSummaries,
  deleteCompletedSummary,
  enqueueSaveCompletedAndClearActive,
  enforceCompletedSummaryRetention,
  listCompletedSummaries,
  retrySaveCompletedAndClearActive,
  saveCompletedAndClearActive,
  updateCompletedSummaryClassLabel,
} from './completedSummaries'
import { PersistenceWriteQueue } from './writeQueue'
import { writeActiveSession } from './activeSession'
import { createDefaultRegistry } from '../game/defaultRegistry'
import { createSessionStore } from '../state/store'
import {
  ACTIVE_SESSION_KEY,
  OBJECT_STORE_ACTIVE_SESSIONS,
  OBJECT_STORE_COMPLETED_SUMMARIES,
} from './constants'
import { completedHistory } from '../summary/completedSummary/testHistory'
import { recordFixture, summaryFixture } from '../summary/completedSummary/testFixtures'

async function opened() {
  const adapter = createMemoryPersistenceAdapter()
  await adapter.open()
  return adapter
}

describe('completed summary persistence', () => {
  it('atomically saves the built record and clears active recovery', async () => {
    const adapter = await opened()
    await adapter.withTransaction([OBJECT_STORE_ACTIVE_SESSIONS], async (tx) => {
      await tx.put(OBJECT_STORE_ACTIVE_SESSIONS, ACTIVE_SESSION_KEY, { active: true })
    })

    const saved = await saveCompletedAndClearActive(adapter, completedHistory().history, {
      savedAt: 30,
      classLabel: 'Period 1',
    })
    expect(saved).toMatchObject({ ok: true, value: { recordId: 'summary-session' } })

    let active: unknown = 'unset'
    await adapter.withTransaction([OBJECT_STORE_ACTIVE_SESSIONS], async (tx) => {
      active = await tx.get(OBJECT_STORE_ACTIVE_SESSIONS, ACTIVE_SESSION_KEY)
    })
    expect(active).toBeUndefined()
    expect(await listCompletedSummaries(adapter)).toMatchObject({
      ok: true,
      value: [{ key: 'summary-session', diagnostic: 'valid' }],
    })
  })

  it('preserves active recovery when the atomic transaction fails and supports retry', async () => {
    const failing = createMemoryPersistenceAdapter({ failTransactions: true })
    await failing.open()
    expect(
      await saveCompletedAndClearActive(failing, completedHistory().history, {
        savedAt: 30,
        classLabel: null,
      }),
    ).toMatchObject({ ok: false })

    const adapter = await opened()
    expect(
      await retrySaveCompletedAndClearActive(adapter, completedHistory().history, {
        savedAt: 30,
        classLabel: null,
      }),
    ).toMatchObject({ ok: true })
  })

  it('invalidates an older queued active write before atomic completion cleanup', async () => {
    const adapter = await opened()
    const queue = new PersistenceWriteQueue()
    const completed = completedHistory().history
    const activeStore = createSessionStore()
    activeStore.dispatch({ type: 'INIT_SESSION', issuedAt: 1, sessionId: 'stale-session' })

    const staleWrite = writeActiveSession(
      adapter,
      activeStore.getHistory(),
      2,
      queue,
      createDefaultRegistry(),
    )
    const completion = enqueueSaveCompletedAndClearActive(
      adapter,
      completed,
      { savedAt: 30, classLabel: null },
      queue,
    )

    expect(await staleWrite).toEqual({ ok: true, value: undefined })
    expect(await completion).toMatchObject({ ok: true })
    let active: unknown = 'unset'
    await adapter.withTransaction([OBJECT_STORE_ACTIVE_SESSIONS], async (tx) => {
      active = await tx.get(OBJECT_STORE_ACTIVE_SESSIONS, ACTIVE_SESSION_KEY)
    })
    expect(active).toBeUndefined()
  })

  it('lists per-record diagnostics without deleting corrupt or unknown records', async () => {
    const adapter = await opened()
    await adapter.withTransaction([OBJECT_STORE_COMPLETED_SUMMARIES], async (tx) => {
      await tx.put(OBJECT_STORE_COMPLETED_SUMMARIES, 'valid', recordFixture())
      await tx.put(OBJECT_STORE_COMPLETED_SUMMARIES, 'future', {
        ...recordFixture(),
        version: 2,
      })
      await tx.put(OBJECT_STORE_COMPLETED_SUMMARIES, 'broken', {})
    })
    const listed = await listCompletedSummaries(adapter)
    expect(listed.ok).toBe(true)
    if (!listed.ok) throw new Error('expected listing')
    expect(listed.value.map((entry) => entry.diagnostic).sort()).toEqual([
      'corrupt',
      'unsupported-envelope-version',
      'valid',
    ])
  })

  it('updates labels, deletes one, and clears all', async () => {
    const adapter = await opened()
    await adapter.withTransaction([OBJECT_STORE_COMPLETED_SUMMARIES], async (tx) => {
      await tx.put(OBJECT_STORE_COMPLETED_SUMMARIES, 'session-1', recordFixture())
    })
    expect(await updateCompletedSummaryClassLabel(adapter, 'session-1', 'Period 2'))
      .toMatchObject({ ok: true })
    const listed = await listCompletedSummaries(adapter)
    if (!listed.ok || listed.value[0]?.decoded.status !== 'valid') throw new Error('expected valid')
    expect(listed.value[0].decoded.record.classLabel).toBe('Period 2')
    expect(await deleteCompletedSummary(adapter, 'session-1')).toMatchObject({ ok: true })
    await adapter.withTransaction([OBJECT_STORE_COMPLETED_SUMMARIES], async (tx) => {
      await tx.put(OBJECT_STORE_COMPLETED_SUMMARIES, 'one', recordFixture())
      await tx.put(OBJECT_STORE_COMPLETED_SUMMARIES, 'two', {})
    })
    expect(await clearAllCompletedSummaries(adapter)).toMatchObject({ ok: true })
    expect(await listCompletedSummaries(adapter)).toEqual({ ok: true, value: [] })
  })

  it('enforces retention only against valid known-version records', async () => {
    const adapter = await opened()
    await adapter.withTransaction([OBJECT_STORE_COMPLETED_SUMMARIES], async (tx) => {
      await tx.put(OBJECT_STORE_COMPLETED_SUMMARIES, 'old', recordFixture({
        recordId: 'old',
        savedAt: 1,
        summary: summaryFixture({ sessionId: 'old' }),
      }))
      await tx.put(OBJECT_STORE_COMPLETED_SUMMARIES, 'new', recordFixture({
        recordId: 'new',
        savedAt: 2,
        summary: summaryFixture({ sessionId: 'new' }),
      }))
      await tx.put(OBJECT_STORE_COMPLETED_SUMMARIES, 'broken', {})
    })
    expect(await enforceCompletedSummaryRetention(adapter, 1)).toEqual({
      ok: true,
      value: ['old'],
    })
    const listed = await listCompletedSummaries(adapter)
    if (!listed.ok) throw new Error('expected listing')
    expect(listed.value.map((entry) => entry.key).sort()).toEqual(['broken', 'new'])
  })
})
