import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, render } from '@testing-library/react'
import { useResponseTimerExpiry } from './useResponseTimerExpiry'
import { createSessionStore, type SessionStore } from '../state/store'
import type { SessionCommand } from '../state/commands'
import type { PrivateGameState } from '../state/privateState'
import { importGameFromUnknown } from '../import/importGame'
import { boardGameFile, richBoardConfig } from '../test/categoryBoardFixtures'
import { createManualClock, type ManualClock } from '../time/clock'
import { HOST_INTERRUPTION } from '../game/timing/responsePhase'

/**
 * The expiry adapter (Slice 7).
 *
 * The adapter is the ONE place a wall-clock schedule exists. These tests hold it
 * to its contract: it dispatches a COMMAND and never touches state, it fires once
 * for a given countdown, and a callback that survives a reset, a restart, a pause,
 * an undo or a clue change appends nothing.
 *
 * Everything is driven by fake timers plus a manual clock — no test waits.
 */

const AT = 1_000_000
const ROUND = 'board-round'

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

function openStore(): SessionStore {
  const result = importGameFromUnknown(boardGameFile(richBoardConfig()))
  if (result.status !== 'success') throw new Error('fixture failed to import')
  const store = createSessionStore()
  store.dispatch({ type: 'INIT_SESSION', issuedAt: AT, sessionId: 's' })
  store.dispatch({ type: 'INITIALIZE_GAME', issuedAt: AT, definition: result.definition })
  store.dispatch({ type: 'ADVANCE_TO_NEXT_ROUND', issuedAt: AT })
  store.dispatch({
    type: 'SELECT_CATEGORY_BOARD_TILE',
    issuedAt: AT,
    roundId: ROUND,
    tileId: 'alpha-100',
  })
  store.dispatch({ type: 'REVEAL_CATEGORY_BOARD_PROMPT', issuedAt: AT, roundId: ROUND })
  return store
}

/**
 * Mount the hook against a live store, re-rendering after every dispatch so the
 * effect sees the new durable state — exactly as the host surface does.
 */
function mountAdapter(store: SessionStore, clock: ManualClock) {
  const dispatched: SessionCommand[] = []
  function Harness({ game }: { readonly game: PrivateGameState | null }) {
    useResponseTimerExpiry({
      game,
      dispatch: (command) => {
        dispatched.push(command)
        const result = store.dispatch(command)
        // A real host re-renders on the store change; mimic that synchronously.
        queueMicrotask(() => view.rerender(<Harness game={gameOf(store)} />))
        return result
      },
      clock,
    })
    return null
  }
  const view = render(<Harness game={gameOf(store)} />)
  const sync = () => view.rerender(<Harness game={gameOf(store)} />)
  return { dispatched, sync, view }
}

function gameOf(store: SessionStore): PrivateGameState | null {
  return store.getState().session?.game ?? null
}

function phase(store: SessionStore) {
  return gameOf(store)?.responsePhases[ROUND]
}

/** Start a 30-second window and return the durable timer. */
function start(store: SessionStore, at = AT) {
  store.dispatch({
    type: 'START_RESPONSE_TIMER',
    issuedAt: at,
    roundId: ROUND,
    durationSeconds: 30,
  })
  const timer = phase(store)?.timer
  if (!timer || timer.status !== 'running') throw new Error('expected a running timer')
  return timer
}

describe('the adapter dispatches a command, never a state change', () => {
  it('fires at the deadline with the timer identity and the exact deadline', () => {
    const store = openStore()
    const clock = createManualClock(AT)
    const timer = start(store)
    const { dispatched, sync } = mountAdapter(store, clock)
    sync()

    act(() => {
      clock.advance(30_000)
      vi.advanceTimersByTime(30_000)
    })

    expect(dispatched).toEqual([
      {
        type: 'EXPIRE_RESPONSE_TIMER',
        issuedAt: AT + 30_000,
        roundId: ROUND,
        timerId: timer.timerId,
        deadline: timer.deadline,
      },
    ])
    expect(phase(store)?.timer.status).toBe('expired')
  })

  it('does not fire before the deadline', () => {
    const store = openStore()
    const clock = createManualClock(AT)
    start(store)
    const { dispatched, sync } = mountAdapter(store, clock)
    sync()

    act(() => {
      clock.advance(29_000)
      vi.advanceTimersByTime(29_000)
    })
    expect(dispatched).toEqual([])
    expect(phase(store)?.timer.status).toBe('running')
  })

  it('fires exactly once — a second timeout cannot append a second fact', () => {
    const store = openStore()
    const clock = createManualClock(AT)
    start(store)
    const { dispatched, sync } = mountAdapter(store, clock)
    sync()

    act(() => {
      clock.advance(60_000)
      vi.advanceTimersByTime(60_000)
    })
    const expiries = store
      .getHistory()
      .filter((event) => event.type === 'RESPONSE_TIMER_EXPIRED')
    expect(expiries).toHaveLength(1)
    expect(dispatched).toHaveLength(1)
  })

  it('schedules nothing at all when no timer is running', () => {
    const store = openStore()
    const clock = createManualClock(AT)
    const { dispatched } = mountAdapter(store, clock)
    act(() => {
      clock.advance(600_000)
      vi.advanceTimersByTime(600_000)
    })
    expect(dispatched).toEqual([])
    expect(store.getHistory().filter((e) => e.type.startsWith('RESPONSE_'))).toHaveLength(0)
  })
})

describe('a stale callback changes nothing', () => {
  /**
   * Each case leaves a scheduled timeout behind and then changes the durable
   * state underneath it. The adapter tears its own timeout down, and the planner
   * refuses anything that survives — belt and braces, and the test asserts the
   * OUTCOME (no new event) rather than which of the two did the work.
   */
  function expiriesIn(store: SessionStore) {
    return store.getHistory().filter((event) => event.type === 'RESPONSE_TIMER_EXPIRED')
  }

  it('after a reset', () => {
    const store = openStore()
    const clock = createManualClock(AT)
    start(store)
    const { sync } = mountAdapter(store, clock)
    sync()
    store.dispatch({ type: 'RESET_RESPONSE_PHASE', issuedAt: AT + 1_000, roundId: ROUND })
    sync()
    act(() => {
      clock.advance(60_000)
      vi.advanceTimersByTime(60_000)
    })
    expect(expiriesIn(store)).toHaveLength(0)
    expect(phase(store)).toBeUndefined()
  })

  it('after a restart', () => {
    const store = openStore()
    const clock = createManualClock(AT)
    const first = start(store)
    const { sync } = mountAdapter(store, clock)
    sync()
    store.dispatch({ type: 'RESET_RESPONSE_PHASE', issuedAt: AT + 1_000, roundId: ROUND })
    const second = start(store, AT + 2_000)
    sync()
    expect(second.timerId).not.toBe(first.timerId)
    act(() => {
      clock.advance(32_000)
      vi.advanceTimersByTime(32_000)
    })
    const expiries = expiriesIn(store)
    expect(expiries).toHaveLength(1)
    expect(expiries[0]).toMatchObject({ timerId: second.timerId, deadline: second.deadline })
  })

  it('after a pause', () => {
    const store = openStore()
    const clock = createManualClock(AT)
    start(store)
    const { sync } = mountAdapter(store, clock)
    sync()
    store.dispatch({ type: 'PAUSE_RESPONSE_TIMER', issuedAt: AT + 5_000, roundId: ROUND })
    sync()
    act(() => {
      clock.advance(120_000)
      vi.advanceTimersByTime(120_000)
    })
    expect(expiriesIn(store)).toHaveLength(0)
    expect(phase(store)?.timer.status).toBe('paused')
  })

  it('after an interruption', () => {
    const store = openStore()
    const clock = createManualClock(AT)
    start(store)
    const { sync } = mountAdapter(store, clock)
    sync()
    store.dispatch({
      type: 'INTERRUPT_RESPONSE_TIMER',
      issuedAt: AT + 5_000,
      roundId: ROUND,
      source: HOST_INTERRUPTION,
    })
    sync()
    act(() => {
      clock.advance(60_000)
      vi.advanceTimersByTime(60_000)
    })
    expect(expiriesIn(store)).toHaveLength(0)
    expect(phase(store)?.timer.status).toBe('interrupted')
  })

  it('after the host closed the clue', () => {
    const store = openStore()
    const clock = createManualClock(AT)
    start(store)
    const { sync } = mountAdapter(store, clock)
    sync()
    store.dispatch({ type: 'RETURN_TO_CATEGORY_BOARD', issuedAt: AT + 1_000, roundId: ROUND })
    sync()
    act(() => {
      clock.advance(60_000)
      vi.advanceTimersByTime(60_000)
    })
    expect(expiriesIn(store)).toHaveLength(0)
  })

  it('after the host revealed the answer before the deadline', () => {
    const store = openStore()
    const clock = createManualClock(AT)
    start(store)
    const { sync } = mountAdapter(store, clock)
    sync()
    store.dispatch({ type: 'REVEAL_CATEGORY_BOARD_ANSWER', issuedAt: AT + 1_000, roundId: ROUND })
    sync()
    act(() => {
      clock.advance(60_000)
      vi.advanceTimersByTime(60_000)
    })
    expect(expiriesIn(store)).toHaveLength(0)
  })

  it('after the start was UNDONE', () => {
    const store = openStore()
    const clock = createManualClock(AT)
    start(store)
    const { sync } = mountAdapter(store, clock)
    sync()
    store.dispatch({ type: 'UNDO', issuedAt: AT + 1_000 })
    sync()
    act(() => {
      clock.advance(60_000)
      vi.advanceTimersByTime(60_000)
    })
    expect(expiriesIn(store)).toHaveLength(0)
    expect(phase(store)).toBeUndefined()
  })

  it('after the whole host surface unmounted', () => {
    const store = openStore()
    const clock = createManualClock(AT)
    start(store)
    const { view, sync } = mountAdapter(store, clock)
    sync()
    view.unmount()
    act(() => {
      clock.advance(60_000)
      vi.advanceTimersByTime(60_000)
    })
    expect(expiriesIn(store)).toHaveLength(0)
  })
})

describe('an expiry that was undone can be re-armed', () => {
  it('fires again on the next tick, because the deadline is already past', () => {
    const store = openStore()
    const clock = createManualClock(AT)
    start(store)
    const { sync } = mountAdapter(store, clock)
    sync()
    act(() => {
      clock.advance(30_000)
      vi.advanceTimersByTime(30_000)
    })
    expect(phase(store)?.timer.status).toBe('expired')

    store.dispatch({ type: 'UNDO', issuedAt: AT + 31_000 })
    sync()
    act(() => {
      vi.advanceTimersByTime(1)
    })
    // Undo restored a running timer whose deadline is in the past, so the adapter
    // schedules a zero-delay callback and the window expires again. Undo restored
    // the prior durable state exactly; it did not invent an unreachable one.
    expect(phase(store)?.timer.status).toBe('expired')
  })
})
