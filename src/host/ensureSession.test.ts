import { beforeEach, describe, expect, it } from 'vitest'
import { createSessionStore } from '../state/store'
import {
  ensureSession,
  setCreateSessionIdForTests,
} from './ensureSession'
import { createSessionId } from './sessionIdentity'

describe('ensureSession', () => {
  beforeEach(() => {
    setCreateSessionIdForTests(null)
  })

  it('starts a session when none exists', () => {
    const store = createSessionStore()
    const result = ensureSession(false, (command) => store.dispatch(command), {
      now: () => 10,
      sessionId: () => 'session-auto-1',
    })

    expect(result).toEqual({ status: 'ready' })
    expect(store.getState().session?.sessionId).toBe('session-auto-1')
    expect(store.getHistory().filter((event) => event.type === 'SESSION_INITIALIZED')).toHaveLength(
      1,
    )
  })

  it('does not reset or duplicate an already active session', () => {
    const store = createSessionStore()
    store.dispatch({ type: 'INIT_SESSION', issuedAt: 1, sessionId: 'session-existing' })
    const before = store.getHistory().length

    const result = ensureSession(true, (command) => store.dispatch(command), {
      now: () => 20,
      sessionId: () => 'session-should-not-appear',
    })

    expect(result).toEqual({ status: 'ready' })
    expect(store.getState().session?.sessionId).toBe('session-existing')
    expect(store.getHistory()).toHaveLength(before)
  })

  it('reports failure when INIT_SESSION is rejected', () => {
    const result = ensureSession(false, () => ({
      status: 'rejected',
      reason: 'malformed-command',
    }))

    expect(result).toEqual({
      status: 'failed',
      reason: 'Could not start a game session (malformed-command).',
    })
  })

  it('allocates distinct host session ids', () => {
    let seq = 0
    setCreateSessionIdForTests(() => `session-${++seq}`)
    expect(createSessionId()).toBe('session-1')
    expect(createSessionId()).toBe('session-2')
  })
})
