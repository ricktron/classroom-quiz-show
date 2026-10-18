import { describe, expect, it } from 'vitest'
import type { SessionCommand } from './commands'
import type { SessionEvent } from './events'
import { findUndoTarget, replay, responsePhaseFor } from './reducer'
import { createSessionStore, type SessionStore } from './store'
import { importGameFromUnknown } from '../import/importGame'
import { richBoardConfig } from '../test/categoryBoardFixtures'
import { teamBoardGameFile, twoTeams } from '../test/teamFixtures'
import { decodeSessionHistory, encodeSessionHistory } from '../persistence/wire/sessionWire'

/**
 * CBN-2 (Court A/B recertification 2026-10-17): a board response-timer expiry is
 * an observed clock fact, not a teacher action. It must never consume ordinary
 * latest-only Undo: undoing it could only restore a deadline already in the past,
 * which re-expires at once, leaving an inert "Undo time up" on top of the stack.
 * Same rule as the Final windows (ADR-014 §8); ADR-007 §13.
 */

const AT = 1_000_000
const ROUND = 'board-round'
const TILE = 'alpha-100'

function openArmedStore(): SessionStore {
  const result = importGameFromUnknown(teamBoardGameFile(twoTeams(), richBoardConfig()))
  if (result.status !== 'success') throw new Error('fixture failed to import')
  const store = createSessionStore()
  store.dispatch({ type: 'INIT_SESSION', issuedAt: AT, sessionId: 's' })
  store.dispatch({ type: 'INITIALIZE_GAME', issuedAt: AT, definition: result.definition })
  store.dispatch({ type: 'ADVANCE_TO_NEXT_ROUND', issuedAt: AT })
  store.dispatch({ type: 'SELECT_CATEGORY_BOARD_TILE', issuedAt: AT, roundId: ROUND, tileId: TILE })
  store.dispatch({ type: 'REVEAL_CATEGORY_BOARD_PROMPT', issuedAt: AT, roundId: ROUND })
  accept(store, { type: 'ARM_RESPONSE_PHASE', issuedAt: AT, roundId: ROUND })
  return store
}

function accept(store: SessionStore, command: SessionCommand): SessionEvent {
  const result = store.dispatch(command)
  if (result.status !== 'accepted') throw new Error(`${command.type} rejected: ${result.reason}`)
  return result.events[result.events.length - 1]!
}

function phase(store: SessionStore) {
  const game = store.getState().session?.game
  if (!game) throw new Error('no game')
  return responsePhaseFor(game, ROUND)
}

function startTimer(store: SessionStore) {
  accept(store, { type: 'START_RESPONSE_TIMER', issuedAt: AT, roundId: ROUND, durationSeconds: 30 })
  const timer = phase(store).timer
  if (timer.status !== 'running') throw new Error('expected a running timer')
  return timer
}

function expireTimer(store: SessionStore): SessionEvent {
  const timer = phase(store).timer
  if (timer.status !== 'running') throw new Error('expected a running timer')
  return accept(store, {
    type: 'EXPIRE_RESPONSE_TIMER',
    issuedAt: timer.deadline + 1_000,
    roundId: ROUND,
    timerId: timer.timerId,
    deadline: timer.deadline,
  })
}

const undo: SessionCommand = { type: 'UNDO', issuedAt: AT + 60_000 }
const buzz = (teamId: string): SessionCommand => ({
  type: 'RECORD_TEAM_BUZZ',
  issuedAt: AT,
  roundId: ROUND,
  tileId: TILE,
  teamId,
})
const resolve = (kind: 'incorrect' | 'passed' | 'correct'): SessionCommand => ({
  type: 'RESOLVE_ACTIVE_RESPONSE',
  issuedAt: AT,
  roundId: ROUND,
  tileId: TILE,
  resolution: { kind },
})
const award = (teamId: string, delta: number): SessionCommand => ({
  type: 'ADJUST_TEAM_SCORE',
  issuedAt: AT,
  teamId,
  delta,
  mode: delta > 0 ? 'full-credit' : 'deduction',
  source: { kind: 'category-board-tile', roundId: ROUND, tileId: TILE },
})

function scoreOf(store: SessionStore, teamId: string): number {
  const game = store.getState().session?.game
  return game?.teamScores?.[teamId as never] ?? 0
}

describe('a board response-timer expiry is a clock fact, never an undo target', () => {
  it('timer starts and expires with no adjudication: Undo reaches the timer start, with no re-expiry', () => {
    const store = openArmedStore()
    const started = startTimer(store)
    const expiry = expireTimer(store)
    expect(expiry.type).toBe('RESPONSE_TIMER_EXPIRED')
    expect(expiry.reversible).toBe(false)
    expect(phase(store).timer.status).toBe('expired')
    expect(findUndoTarget(store.getHistory())?.type).toBe('RESPONSE_TIMER_STARTED')

    store.dispatch(undo)
    // The start is undone, so no running timer with a past deadline remains to re-expire.
    expect(phase(store).timer.status).not.toBe('running')
    // ADR-002: exactly the state before the start, so the clue is armed again.
    expect(phase(store).armed).toBe(true)
    const stale = store.dispatch({
      type: 'EXPIRE_RESPONSE_TIMER',
      issuedAt: started.deadline + 2_000,
      roundId: ROUND,
      timerId: started.timerId,
      deadline: started.deadline,
    })
    expect(stale.status).toBe('rejected')
  })

  it('a reversible teacher action before the expiry stays reachable by ordinary Undo', () => {
    const store = openArmedStore()
    startTimer(store)
    const awarded = accept(store, award('red', 100))
    expect(scoreOf(store, 'red')).toBe(100)
    expireTimer(store)
    expect(findUndoTarget(store.getHistory())?.id).toBe(awarded.id)

    store.dispatch(undo)
    expect(scoreOf(store, 'red')).toBe(0)
    // The expiry stays effective history: time is still up.
    expect(phase(store).timer.status).toBe('expired')
  })

  for (const kind of ['incorrect', 'correct', 'passed'] as const) {
    it(`buzz, timer, expiry, then mark ${kind}: Undo reaches the adjudication, then the timer start`, () => {
      const store = openArmedStore()
      accept(store, buzz('red'))
      startTimer(store)
      expireTimer(store)
      const adjudication = accept(store, resolve(kind))

      const targets: (string | undefined)[] = []
      targets.push(findUndoTarget(store.getHistory())?.id)
      store.dispatch(undo)
      targets.push(findUndoTarget(store.getHistory())?.type)
      expect(targets).toEqual([adjudication.id, 'RESPONSE_TIMER_STARTED'])
      store.dispatch(undo)
      expect(phase(store).timer.status).not.toBe('running')
      expect(findUndoTarget(store.getHistory())?.type).toBe('TEAM_BUZZED')
    })
  }

  it('a buzz after the expiry is refused, and Undo never lands on the expiry', () => {
    const store = openArmedStore()
    startTimer(store)
    expireTimer(store)
    // Expiry closes the window and disarms it: a late buzz appends nothing.
    expect(store.dispatch(buzz('blue')).status).toBe('rejected')
    for (let i = 0; i < 4; i += 1) {
      const target = findUndoTarget(store.getHistory())
      expect(target?.type).not.toBe('RESPONSE_TIMER_EXPIRED')
      store.dispatch(undo)
    }
  })
})

describe('reload and saved sessions (teacher data safety)', () => {
  function roundTrip(history: readonly SessionEvent[]): readonly SessionEvent[] {
    const encoded = encodeSessionHistory(history, AT)
    if (!encoded.ok) throw new Error(encoded.message)
    const decoded = decodeSessionHistory(JSON.parse(JSON.stringify(encoded.value)))
    if (!decoded.ok) throw new Error(decoded.message)
    return decoded.value
  }

  function storeWithExpiryAfterAward() {
    const store = openArmedStore()
    startTimer(store)
    accept(store, award('red', 100))
    expireTimer(store)
    return store
  }

  it('a new history round-trips with the expiry irreversible, and Undo still reaches the award', () => {
    const store = storeWithExpiryAfterAward()
    const decoded = roundTrip(store.getHistory())
    expect(replay(decoded)).toEqual(store.getState())
    const expiry = decoded.find((e) => e.type === 'RESPONSE_TIMER_EXPIRED')!
    expect(expiry.reversible).toBe(false)
    expect(findUndoTarget(decoded)?.type).toBe('TEAM_SCORE_ADJUSTED')
  })

  it('a history saved before the repair (reversible expiry) still loads, normalized', () => {
    const store = storeWithExpiryAfterAward()
    const encoded = encodeSessionHistory(store.getHistory(), AT)
    if (!encoded.ok) throw new Error(encoded.message)
    const record = JSON.parse(JSON.stringify(encoded.value)) as { events: Record<string, unknown>[] }
    for (const event of record.events) {
      if (event.type === 'RESPONSE_TIMER_EXPIRED') event.reversible = true
    }
    const decoded = decodeSessionHistory(record)
    expect(decoded.ok).toBe(true)
    if (!decoded.ok) return
    expect(replay(decoded.value)).toEqual(store.getState())
    expect(decoded.value.find((e) => e.type === 'RESPONSE_TIMER_EXPIRED')?.reversible).toBe(false)
    expect(findUndoTarget(decoded.value)?.type).toBe('TEAM_SCORE_ADJUSTED')
  })

  it('a legacy loop history (expiry undone, then expired again) still decodes and replays', () => {
    const store = storeWithExpiryAfterAward()
    const encoded = encodeSessionHistory(store.getHistory(), AT)
    if (!encoded.ok) throw new Error(encoded.message)
    const record = JSON.parse(JSON.stringify(encoded.value)) as { events: Record<string, unknown>[] }
    const events = record.events
    for (const event of events) {
      if (event.type === 'RESPONSE_TIMER_EXPIRED') event.reversible = true
    }
    const expiry = events.find((e) => e.type === 'RESPONSE_TIMER_EXPIRED')!
    const n = events.length
    events.push({ id: `evt-${n}`, type: 'EVENT_UNDONE', seq: n, occurredAt: AT, reversible: false, targetEventId: expiry.id })
    events.push({ ...expiry, id: `evt-${n + 1}`, seq: n + 1 })
    const decoded = decodeSessionHistory(record)
    expect(decoded.ok).toBe(true)
    if (!decoded.ok) return
    const state = replay(decoded.value)
    // The legacy loop's second expiry lands on the same timer state as the first.
    expect(state.session?.game?.teamScores).toEqual(store.getState().session?.game?.teamScores)
    expect(state.session?.game && responsePhaseFor(state.session.game, ROUND)).toEqual(phase(store))
    expect(findUndoTarget(decoded.value)?.type).toBe('TEAM_SCORE_ADJUSTED')
  })
})
