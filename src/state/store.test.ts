import { describe, expect, it, vi } from 'vitest'
import { createSessionStore } from './store'
import { replay } from './reducer'

const AT = 1_000

describe('createSessionStore', () => {
  it('starts empty with the initial derived state', () => {
    const store = createSessionStore()
    expect(store.getHistory()).toEqual([])
    expect(store.getState().session).toBeNull()
    expect(store.getState()).toEqual(replay([]))
  })

  it('applies accepted commands and keeps state === replay(history)', () => {
    const store = createSessionStore()
    store.dispatch({ type: 'INIT_SESSION', issuedAt: AT, sessionId: 's' })
    store.dispatch({ type: 'ADVANCE_SEQUENCE', issuedAt: AT })
    expect(store.getState()).toEqual(replay(store.getHistory()))
    expect(store.getState().session?.counter).toBe(1)
  })

  it('does not mutate state or history on a rejected command', () => {
    const store = createSessionStore()
    const result = store.dispatch({ type: 'ADVANCE_SEQUENCE', issuedAt: AT })
    expect(result).toEqual({ status: 'rejected', reason: 'session-not-initialized' })
    expect(store.getHistory()).toEqual([])
    expect(store.getState().session).toBeNull()
  })

  it('history is append-only (previous array identity is not reused/mutated)', () => {
    const store = createSessionStore()
    store.dispatch({ type: 'INIT_SESSION', issuedAt: AT, sessionId: 's' })
    const first = store.getHistory()
    store.dispatch({ type: 'ADVANCE_SEQUENCE', issuedAt: AT })
    const second = store.getHistory()
    expect(first).toHaveLength(1)
    expect(second).toHaveLength(2)
    expect(second).not.toBe(first)
  })

  it('notifies subscribers only on accepted commands and stops after unsubscribe', () => {
    const store = createSessionStore()
    const listener = vi.fn()
    const unsubscribe = store.subscribe(listener)

    store.dispatch({ type: 'ADVANCE_SEQUENCE', issuedAt: AT }) // rejected → no notify
    expect(listener).toHaveBeenCalledTimes(0)

    store.dispatch({ type: 'INIT_SESSION', issuedAt: AT, sessionId: 's' }) // accepted
    expect(listener).toHaveBeenCalledTimes(1)

    unsubscribe()
    store.dispatch({ type: 'ADVANCE_SEQUENCE', issuedAt: AT }) // accepted, but unsubscribed
    expect(listener).toHaveBeenCalledTimes(1)
  })

  it('exposes only sanitized public state', () => {
    const store = createSessionStore()
    store.dispatch({ type: 'INIT_SESSION', issuedAt: AT, sessionId: 'SECRET' })
    store.dispatch({ type: 'SET_HOST_NOTE', issuedAt: AT, note: 'PRIVATE NOTE' })
    const serialized = JSON.stringify(store.getPublicState())
    expect(serialized).not.toContain('SECRET')
    expect(serialized).not.toContain('PRIVATE NOTE')
  })
})
