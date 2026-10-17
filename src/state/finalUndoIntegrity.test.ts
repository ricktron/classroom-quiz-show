import { describe, expect, it } from 'vitest'
import { findUndoTarget, replay } from './reducer'
import type { SessionEvent } from './events'
import type { SessionStore } from './store'
import { decodeSessionHistory, encodeSessionHistory } from '../persistence/wire/sessionWire'
import {
  AT,
  FINAL_ROUND_ID,
  finalOf,
  finalStore,
  playToReveal,
  scoreOf,
} from '../test/finalWagerFixtures'

/**
 * Court B NEW-1: a Final window expiry is an observed time fact, never an undo
 * target, so it can no longer bury a Final settlement (or anything earlier)
 * beneath an undo that only re-expires at once. ADR-014 §8 / §9.
 */

const ROUND = FINAL_ROUND_ID

function runningResponseWindow(store: SessionStore) {
  const window = finalOf(store).responseWindow
  if (window.status !== 'running') throw new Error('expected a running response window')
  return window
}

function expireResponseWindow(store: SessionStore, at: number) {
  const window = runningResponseWindow(store)
  const before = store.getHistory().length
  store.dispatch({
    type: 'EXPIRE_FINAL_RESPONSE_WINDOW',
    issuedAt: at,
    roundId: ROUND,
    timerId: window.timerId,
    deadline: window.deadline,
  })
  const history = store.getHistory()
  expect(history.length).toBe(before + 1)
  return history[history.length - 1]!
}

function settle(store: SessionStore, teamId: string, outcome: 'correct' | 'incorrect') {
  store.dispatch({ type: 'REVEAL_FINAL_TEAM', issuedAt: AT, roundId: ROUND, teamId })
  store.dispatch({ type: 'SETTLE_FINAL_TEAM', issuedAt: AT, roundId: ROUND, teamId, outcome })
}

function roundTrip(history: readonly SessionEvent[]): readonly SessionEvent[] {
  const encoded = encodeSessionHistory(history, AT)
  if (!encoded.ok) throw new Error(encoded.message)
  const decoded = decodeSessionHistory(JSON.parse(JSON.stringify(encoded.value)))
  if (!decoded.ok) throw new Error(decoded.message)
  return decoded.value
}

describe('Final settlement stays undoable when the response window expires after it', () => {
  for (const outcome of ['correct', 'incorrect'] as const) {
    it(`${outcome}: expiry is irreversible and Undo reaches the settlement atomically`, () => {
      const store = finalStore({ scores: { red: 300, blue: 100 } })
      playToReveal(store, { wagers: { red: 100, blue: 50 } })
      // Responses are locked, but the window is still running (it is not stopped by lock).
      runningResponseWindow(store)
      settle(store, 'blue', outcome)
      const settled = outcome === 'correct' ? 150 : 50
      expect(scoreOf(store, 'blue')).toBe(settled)
      const settlement = store.getHistory().at(-1)!
      expect(settlement.type).toBe('FINAL_TEAM_SETTLED')

      const expiry = expireResponseWindow(store, AT + 10 * 60_000)
      expect(expiry.type).toBe('FINAL_RESPONSE_WINDOW_EXPIRED')
      expect(expiry.reversible).toBe(false)
      expect(findUndoTarget(store.getHistory())?.id).toBe(settlement.id)

      store.dispatch({ type: 'UNDO', issuedAt: AT })
      expect(scoreOf(store, 'blue')).toBe(100)
      // Reopened, coherent and continuable: blue is on screen and unsettled again.
      expect(finalOf(store).settlements.blue).toBeUndefined()
      settle(store, 'blue', 'correct')
      expect(scoreOf(store, 'blue')).toBe(150)
    })
  }

  it('a second Undo does not loop: it targets the next teacher action, never the expiry', () => {
    const store = finalStore({ scores: { red: 300, blue: 100 } })
    playToReveal(store, { wagers: { red: 100, blue: 50 } })
    settle(store, 'blue', 'correct')
    expireResponseWindow(store, AT + 10 * 60_000)
    store.dispatch({ type: 'UNDO', issuedAt: AT })
    expect(findUndoTarget(store.getHistory())?.type).toBe('FINAL_TEAM_REVEALED')
  })
})

describe('an expiry before settlement never traps Undo deeper in history', () => {
  it('Undo walks back past the lock to the last recorded response', () => {
    const store = finalStore({ scores: { red: 300, blue: 100 } })
    store.dispatch({ type: 'BEGIN_FINAL_WAGER', issuedAt: AT, roundId: ROUND, mode: 'classic' })
    for (const teamId of ['red', 'blue']) {
      store.dispatch({ type: 'RECORD_FINAL_WAGER', issuedAt: AT, roundId: ROUND, teamId, wager: 50 })
    }
    store.dispatch({ type: 'LOCK_FINAL_WAGERS', issuedAt: AT, roundId: ROUND })
    store.dispatch({
      type: 'START_FINAL_RESPONSE_WINDOW',
      issuedAt: AT,
      roundId: ROUND,
      captureMode: 'host-only',
    })
    for (const teamId of ['red', 'blue']) {
      store.dispatch({
        type: 'RECORD_FINAL_RESPONSE',
        issuedAt: AT,
        roundId: ROUND,
        teamId,
        response: { kind: 'not-captured' },
      })
    }
    expireResponseWindow(store, AT + 10 * 60_000)
    store.dispatch({ type: 'LOCK_FINAL_RESPONSES', issuedAt: AT, roundId: ROUND })
    store.dispatch({ type: 'REVEAL_FINAL_ANSWER', issuedAt: AT, roundId: ROUND })
    settle(store, 'blue', 'correct')

    const targets: string[] = []
    for (let i = 0; i < 5; i += 1) {
      targets.push(findUndoTarget(store.getHistory())!.type)
      store.dispatch({ type: 'UNDO', issuedAt: AT })
    }
    expect(targets).toEqual([
      'FINAL_TEAM_SETTLED',
      'FINAL_TEAM_REVEALED',
      'FINAL_ANSWER_REVEALED',
      'FINAL_RESPONSES_LOCKED',
      'FINAL_TEAM_RESPONSE_RECORDED',
    ])
    // The expiry remains effective history (time up), not undone.
    expect(finalOf(store).responseWindow.status).toBe('expired')
  })
})

describe('the wager window expiry is irreversible too', () => {
  it('a wager-window expiry is never the undo target', () => {
    const store = finalStore({ scores: { red: 300, blue: 100 } })
    store.dispatch({ type: 'BEGIN_FINAL_WAGER', issuedAt: AT, roundId: ROUND, mode: 'classic' })
    store.dispatch({
      type: 'START_FINAL_WAGER_WINDOW',
      issuedAt: AT,
      roundId: ROUND,
      durationSeconds: 30,
    })
    store.dispatch({ type: 'RECORD_FINAL_WAGER', issuedAt: AT, roundId: ROUND, teamId: 'red', wager: 10 })
    const window = finalOf(store).wagerWindow
    if (window.status !== 'running') throw new Error('expected a running wager window')
    store.dispatch({
      type: 'EXPIRE_FINAL_WAGER_WINDOW',
      issuedAt: AT + 60_000,
      roundId: ROUND,
      timerId: window.timerId,
      deadline: window.deadline,
    })
    const expiry = store.getHistory().at(-1)!
    expect(expiry.type).toBe('FINAL_WAGER_WINDOW_EXPIRED')
    expect(expiry.reversible).toBe(false)
    expect(findUndoTarget(store.getHistory())?.type).toBe('FINAL_TEAM_WAGER_RECORDED')
  })
})

describe('saved sessions from before the repair still load and replay (teacher data safety)', () => {
  function storeWithExpiryAfterSettlement() {
    const store = finalStore({ scores: { red: 300, blue: 100 } })
    playToReveal(store, { wagers: { red: 100, blue: 50 } })
    settle(store, 'blue', 'correct')
    expireResponseWindow(store, AT + 10 * 60_000)
    return store
  }

  /** Re-write the stored wire form as the previous build did (reversible: true). */
  function legacyWire(history: readonly SessionEvent[], extra: (events: Record<string, unknown>[]) => void = () => {}) {
    const encoded = encodeSessionHistory(history, AT)
    if (!encoded.ok) throw new Error(encoded.message)
    const record = JSON.parse(JSON.stringify(encoded.value)) as { events: Record<string, unknown>[] }
    for (const event of record.events) {
      if (event.type === 'FINAL_RESPONSE_WINDOW_EXPIRED' || event.type === 'FINAL_WAGER_WINDOW_EXPIRED') {
        event.reversible = true
      }
    }
    extra(record.events)
    return record
  }

  it('a legacy reversible expiry decodes (normalized) and replays to the same state', () => {
    const store = storeWithExpiryAfterSettlement()
    const decoded = decodeSessionHistory(legacyWire(store.getHistory()))
    expect(decoded.ok).toBe(true)
    if (!decoded.ok) return
    const expiry = decoded.value.find((e) => e.type === 'FINAL_RESPONSE_WINDOW_EXPIRED')!
    expect(expiry.reversible).toBe(false)
    expect(replay(decoded.value)).toEqual(store.getState())
    expect(findUndoTarget(decoded.value)?.type).toBe('FINAL_TEAM_SETTLED')
  })

  it('a legacy loop history (expiry undone, then expired again) still decodes and replays', () => {
    const store = storeWithExpiryAfterSettlement()
    const record = legacyWire(store.getHistory(), (events) => {
      // The loop the previous build could write: undo the expiry, then re-expire.
      const expiry = events.find((e) => e.type === 'FINAL_RESPONSE_WINDOW_EXPIRED')!
      const n = events.length
      events.push({ id: `evt-${n}`, type: 'EVENT_UNDONE', seq: n, occurredAt: AT, reversible: false, targetEventId: expiry.id })
      events.push({ ...expiry, id: `evt-${n + 1}`, seq: n + 1 })
    })
    const decoded = decodeSessionHistory(record)
    expect(decoded.ok).toBe(true)
    if (!decoded.ok) return
    const state = replay(decoded.value)
    expect(state.session?.game?.teamScores).toEqual(store.getState().session?.game?.teamScores)
    expect(findUndoTarget(decoded.value)?.type).toBe('FINAL_TEAM_SETTLED')
  })

  it('a new history round-trips with the expiry irreversible', () => {
    const store = storeWithExpiryAfterSettlement()
    const decoded = roundTrip(store.getHistory())
    expect(replay(decoded)).toEqual(store.getState())
    const record = encodeSessionHistory(store.getHistory(), AT)
    if (!record.ok) throw new Error(record.message)
    const wire = (record.value as unknown as { events: Record<string, unknown>[] }).events.find(
      (e) => e.type === 'FINAL_RESPONSE_WINDOW_EXPIRED',
    )!
    expect(wire.reversible).toBe(false)
  })
})
