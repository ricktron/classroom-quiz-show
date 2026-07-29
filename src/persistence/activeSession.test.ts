import { describe, expect, it } from 'vitest'
import { createSampleGame } from '../game/sampleGame'
import { createSessionStore } from '../state/store'
import {
  clearActiveSession,
  readActiveSession,
  writeActiveSession,
} from './activeSession'
import { createMemoryPersistenceAdapter } from './memoryAdapter'
import { createPersistenceWriteQueue } from './writeQueue'

const AT = 1_700_000_000_000

describe('active session persistence', () => {
  it('persists and reads a resumable active session', async () => {
    const adapter = createMemoryPersistenceAdapter()
    await adapter.open()
    const queue = createPersistenceWriteQueue()
    const history = createResumableHistory('session-1')

    expect(await writeActiveSession(adapter, history, AT, queue)).toEqual({
      ok: true,
      value: undefined,
    })

    const read = await readActiveSession(adapter)
    expect(read.ok).toBe(true)
    if (!read.ok) return
    expect(read.value).toMatchObject({ kind: 'resumable', savedAt: AT })
    if (read.value.kind === 'resumable') expect(read.value.events).toEqual(history)
  })

  it('clears storage for empty or ended histories', async () => {
    const adapter = createMemoryPersistenceAdapter()
    await adapter.open()
    const queue = createPersistenceWriteQueue()
    const history = createResumableHistory('session-1')
    await writeActiveSession(adapter, history, AT, queue)

    await writeActiveSession(adapter, createEndedHistory(), AT + 1, queue)

    expect(await readActiveSession(adapter)).toEqual({ ok: true, value: { kind: 'none' } })
  })

  it('keeps the latest active-session write when writes are queued', async () => {
    const adapter = createMemoryPersistenceAdapter()
    await adapter.open()
    const queue = createPersistenceWriteQueue()

    const first = writeActiveSession(adapter, createResumableHistory('older'), AT, queue)
    const secondHistory = createResumableHistory('newer')
    const second = writeActiveSession(adapter, secondHistory, AT + 1, queue)

    expect(await first).toEqual({ ok: true, value: undefined })
    expect(await second).toEqual({ ok: true, value: undefined })
    const read = await readActiveSession(adapter)
    expect(read.ok).toBe(true)
    if (read.ok && read.value.kind === 'resumable') {
      expect(read.value.events).toEqual(secondHistory)
      expect(read.value.savedAt).toBe(AT + 1)
    }
  })

  it('clears explicitly and reports transaction failures without throwing', async () => {
    const adapter = createMemoryPersistenceAdapter()
    await adapter.open()
    const queue = createPersistenceWriteQueue()
    await writeActiveSession(adapter, createResumableHistory('session-1'), AT, queue)

    expect(await clearActiveSession(adapter)).toEqual({ ok: true, value: undefined })
    expect(await readActiveSession(adapter)).toEqual({ ok: true, value: { kind: 'none' } })

    const failing = createMemoryPersistenceAdapter({ failTransactions: true })
    await failing.open()
    expect(await writeActiveSession(failing, createResumableHistory('session-2'), AT, queue)).toMatchObject({
      ok: false,
      code: 'transaction-failed',
    })
  })

  it('returns invalid for corrupt stored active session records', async () => {
    const adapter = createMemoryPersistenceAdapter()
    await adapter.open()
    await adapter.withTransaction(['activeSessions'], async (tx) => {
      await tx.put('activeSessions', 'current', { format: 'wrong' })
    })

    expect(await readActiveSession(adapter)).toMatchObject({
      ok: true,
      value: { kind: 'invalid', code: 'corrupt' },
    })
  })
})

function createResumableHistory(sessionId: string) {
  const store = createSessionStore()
  store.dispatch({ type: 'INIT_SESSION', issuedAt: AT, sessionId })
  store.dispatch({ type: 'INITIALIZE_GAME', issuedAt: AT + 1, definition: createSampleGame() })
  return store.getHistory()
}

function createEndedHistory() {
  const store = createSessionStore()
  store.dispatch({ type: 'INIT_SESSION', issuedAt: AT, sessionId: 'ended' })
  store.dispatch({ type: 'INITIALIZE_GAME', issuedAt: AT + 1, definition: createSampleGame() })
  store.dispatch({ type: 'END_GAME_SESSION', issuedAt: AT + 2 })
  return store.getHistory()
}
