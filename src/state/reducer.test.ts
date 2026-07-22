import { describe, expect, it } from 'vitest'
import type { SessionCommand } from './commands'
import type { SessionEvent } from './events'
import { INITIAL_PRIVATE_STATE } from './privateState'
import { findUndoTarget, planCommand, reduce, replay } from './reducer'

const AT = 1_000 // fixed timestamp so tests are deterministic

/** Apply a sequence of accepted commands, returning the resulting history. */
function run(commands: SessionCommand[]): SessionEvent[] {
  const history: SessionEvent[] = []
  let state = replay(history)
  for (const command of commands) {
    const outcome = planCommand(state, history, command)
    if (outcome.status === 'accepted') {
      history.push(...outcome.events)
      state = replay(history)
    }
  }
  return history
}

const init: SessionCommand = { type: 'INIT_SESSION', issuedAt: AT, sessionId: 'sess-1' }

describe('planCommand — command handling', () => {
  it('accepts INIT_SESSION and produces a deterministic irreversible event', () => {
    const outcome = planCommand(INITIAL_PRIVATE_STATE, [], init)
    expect(outcome.status).toBe('accepted')
    if (outcome.status !== 'accepted') return
    const [event] = outcome.events
    expect(event).toMatchObject({
      id: 'evt-0',
      type: 'SESSION_INITIALIZED',
      seq: 0,
      occurredAt: AT,
      reversible: false,
      sessionId: 'sess-1',
    })
  })

  it('is deterministic: same inputs → identical events', () => {
    const a = planCommand(INITIAL_PRIVATE_STATE, [], init)
    const b = planCommand(INITIAL_PRIVATE_STATE, [], init)
    expect(a).toEqual(b)
  })

  it('rejects SET_PUBLIC_STATUS before a session exists', () => {
    const outcome = planCommand(INITIAL_PRIVATE_STATE, [], {
      type: 'SET_PUBLIC_STATUS',
      issuedAt: AT,
      code: 'no-active-game',
    })
    expect(outcome).toEqual({ status: 'rejected', reason: 'session-not-initialized' })
  })

  it('rejects an unknown status code', () => {
    const history = run([init])
    const state = replay(history)
    const outcome = planCommand(state, history, {
      type: 'SET_PUBLIC_STATUS',
      issuedAt: AT,
      // deliberately invalid; cast through unknown to bypass the compile-time union
      code: 'leak-secret' as unknown as 'no-active-game',
    })
    expect(outcome).toEqual({ status: 'rejected', reason: 'unknown-status-code' })
  })

  it('rejects a malformed INIT_SESSION (empty id) without producing events', () => {
    const outcome = planCommand(INITIAL_PRIVATE_STATE, [], {
      type: 'INIT_SESSION',
      issuedAt: AT,
      sessionId: '',
    })
    expect(outcome).toEqual({ status: 'rejected', reason: 'malformed-command' })
  })

  it('a rejected command leaves state unchanged', () => {
    const history = run([init])
    const before = replay(history)
    // UNDO twice: the second has nothing to undo and must be a no-op.
    planCommand(before, history, { type: 'UNDO', issuedAt: AT })
    const after = replay(history)
    expect(after).toEqual(before)
  })
})

describe('reduce — event application', () => {
  it('applies SESSION_INITIALIZED into a ready session', () => {
    const state = reduce(INITIAL_PRIVATE_STATE, {
      id: 'evt-0',
      type: 'SESSION_INITIALIZED',
      seq: 0,
      occurredAt: AT,
      reversible: false,
      sessionId: 'sess-1',
    })
    expect(state.session).toMatchObject({
      sessionId: 'sess-1',
      lifecycle: 'ready',
      counter: 0,
      publicStatusCode: 'session-ready',
      hostNotes: '',
    })
    expect(state.diagnostics.appliedEventCount).toBe(1)
    expect(state.diagnostics.lastAppliedEventType).toBe('SESSION_INITIALIZED')
  })

  it('ignores state-affecting events before a session (fail safe)', () => {
    const state = reduce(INITIAL_PRIVATE_STATE, {
      id: 'evt-0',
      type: 'SEQUENCE_ADVANCED',
      seq: 0,
      occurredAt: AT,
      reversible: true,
    })
    expect(state).toEqual(INITIAL_PRIVATE_STATE)
  })

  it('returns state unchanged for an unknown event type (fail safe)', () => {
    const bogus = {
      id: 'evt-0',
      type: 'NOT_A_REAL_EVENT',
      seq: 0,
      occurredAt: AT,
      reversible: true,
    } as unknown as SessionEvent
    expect(reduce(INITIAL_PRIVATE_STATE, bogus)).toEqual(INITIAL_PRIVATE_STATE)
  })
})

describe('replay — determinism & reconstruction', () => {
  it('reconstructs state from initial + events', () => {
    const history = run([
      init,
      { type: 'ADVANCE_SEQUENCE', issuedAt: AT },
      { type: 'ADVANCE_SEQUENCE', issuedAt: AT },
      { type: 'MARK_WAITING', issuedAt: AT },
    ])
    const state = replay(history)
    expect(state.session?.counter).toBe(2)
    expect(state.session?.lifecycle).toBe('waiting')
    expect(state.revision).toBe(history.length)
  })

  it('empty replay yields the initial state', () => {
    expect(replay([])).toEqual(INITIAL_PRIVATE_STATE)
  })

  it('is idempotent: repeated replay produces the same state', () => {
    const history = run([init, { type: 'ADVANCE_SEQUENCE', issuedAt: AT }])
    expect(replay(history)).toEqual(replay(history))
  })

  it('revision equals history length and never decreases across undo', () => {
    const history = run([
      init,
      { type: 'ADVANCE_SEQUENCE', issuedAt: AT },
      { type: 'UNDO', issuedAt: AT },
    ])
    // 3 recorded facts: init, advance, undo-marker.
    expect(history).toHaveLength(3)
    expect(replay(history).revision).toBe(3)
  })
})

describe('undo semantics', () => {
  it('empty-history undo is safe and produces no event', () => {
    const outcome = planCommand(INITIAL_PRIVATE_STATE, [], { type: 'UNDO', issuedAt: AT })
    expect(outcome).toEqual({ status: 'rejected', reason: 'nothing-to-undo' })
  })

  it('undoes the latest reversible event', () => {
    const history = run([
      init,
      { type: 'ADVANCE_SEQUENCE', issuedAt: AT }, // counter → 1
      { type: 'ADVANCE_SEQUENCE', issuedAt: AT }, // counter → 2
      { type: 'UNDO', issuedAt: AT }, // neutralizes the second advance
    ])
    expect(replay(history).session?.counter).toBe(1)
  })

  it('never targets an irreversible event (init survives undo attempts)', () => {
    const history = run([init])
    expect(findUndoTarget(history)).toBeNull()
    const outcome = planCommand(replay(history), history, { type: 'UNDO', issuedAt: AT })
    expect(outcome).toEqual({ status: 'rejected', reason: 'nothing-to-undo' })
    expect(replay(history).session).not.toBeNull()
  })

  it('preserves the full audit history after undo (append-only)', () => {
    const history = run([
      init,
      { type: 'ADVANCE_SEQUENCE', issuedAt: AT },
      { type: 'UNDO', issuedAt: AT },
    ])
    // The original advance event is still present; nothing is deleted.
    expect(history.map((e) => e.type)).toEqual([
      'SESSION_INITIALIZED',
      'SEQUENCE_ADVANCED',
      'EVENT_UNDONE',
    ])
    const undo = history[2]
    expect(undo.type === 'EVENT_UNDONE' && undo.targetEventId).toBe('evt-1')
  })

  it('repeated undo walks back through reversible events then stops safely', () => {
    let history = run([
      init,
      { type: 'ADVANCE_SEQUENCE', issuedAt: AT },
      { type: 'ADVANCE_SEQUENCE', issuedAt: AT },
    ])
    // Undo both advances, then one extra undo that must be a no-op.
    for (let i = 0; i < 3; i += 1) {
      const state = replay(history)
      const outcome = planCommand(state, history, { type: 'UNDO', issuedAt: AT })
      if (outcome.status === 'accepted') history = [...history, ...outcome.events]
    }
    expect(replay(history).session?.counter).toBe(0)
    // init + 2 advances + 2 undo markers = 5 (the 3rd undo was rejected)
    expect(history).toHaveLength(5)
  })
})
