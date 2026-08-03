import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render } from '@testing-library/react'
import { useFinalWagerExpiry } from './useFinalWagerExpiry'
import type { SessionCommand } from '../state/commands'
import type { PrivateGameState } from '../state/privateState'
import type { DispatchResult } from '../state/store'
import { createManualClock } from '../time/clock'
import { AT, FINAL_ROUND_ID, finalOf, finalStore } from '../test/finalWagerFixtures'
import type { SessionStore } from '../state/store'

/**
 * The Final window expiry adapter (Slice 14).
 *
 * The load-bearing claims proved here:
 *  - it turns a deadline into a COMMAND and nothing else;
 *  - it names the window that is actually running, so the wager window and the
 *    response window cannot be confused for one another;
 *  - it arms nothing when no window is running, and tears down on unmount;
 *  - it carries the timer identity and the exact deadline, so a stale callback
 *    is refused by the planner rather than defended against here.
 */

const ROUND = FINAL_ROUND_ID

function Harness({
  game,
  dispatch,
  now,
}: {
  readonly game: PrivateGameState | null
  readonly dispatch: (command: SessionCommand) => DispatchResult
  readonly now: number
}) {
  useFinalWagerExpiry({ game, dispatch, clock: createManualClock(now) })
  return null
}

function gameOf(store: SessionStore): PrivateGameState {
  const game = store.getState().session?.game
  if (!game) throw new Error('no game loaded')
  return game
}

function accepted(): DispatchResult {
  return { status: 'accepted', events: [] }
}

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('it schedules exactly one expiry command for the live window', () => {
  it('names the WAGER window while that one is running', () => {
    const store = finalStore({ scores: { red: 300, blue: 100 } })
    store.dispatch({ type: 'BEGIN_FINAL_WAGER', issuedAt: AT, roundId: ROUND, mode: 'classic' })
    store.dispatch({
      type: 'START_FINAL_WAGER_WINDOW',
      issuedAt: AT,
      roundId: ROUND,
      durationSeconds: 60,
    })
    const window = finalOf(store).wagerWindow
    if (window.status !== 'running') throw new Error('expected a running window')

    const dispatch = vi.fn(accepted)
    render(<Harness game={gameOf(store)} dispatch={dispatch} now={AT} />)
    expect(dispatch).not.toHaveBeenCalled()
    vi.advanceTimersByTime(60_000)
    expect(dispatch).toHaveBeenCalledTimes(1)
    expect(dispatch).toHaveBeenCalledWith({
      type: 'EXPIRE_FINAL_WAGER_WINDOW',
      issuedAt: AT,
      roundId: ROUND,
      timerId: window.timerId,
      deadline: window.deadline,
    })
  })

  it('names the RESPONSE window while that one is running', () => {
    const store = finalStore({ scores: { red: 300, blue: 100 } })
    store.dispatch({ type: 'BEGIN_FINAL_WAGER', issuedAt: AT, roundId: ROUND, mode: 'classic' })
    store.dispatch({ type: 'RECORD_FINAL_WAGER', issuedAt: AT, roundId: ROUND, teamId: 'red', wager: 0 })
    store.dispatch({ type: 'RECORD_FINAL_WAGER', issuedAt: AT, roundId: ROUND, teamId: 'blue', wager: 0 })
    store.dispatch({ type: 'LOCK_FINAL_WAGERS', issuedAt: AT, roundId: ROUND })
    store.dispatch({
      type: 'START_FINAL_RESPONSE_WINDOW',
      issuedAt: AT,
      roundId: ROUND,
      captureMode: 'host-only',
      durationSeconds: 30,
    })
    const window = finalOf(store).responseWindow
    if (window.status !== 'running') throw new Error('expected a running window')

    const dispatch = vi.fn(accepted)
    render(<Harness game={gameOf(store)} dispatch={dispatch} now={AT} />)
    vi.advanceTimersByTime(30_000)
    expect(dispatch).toHaveBeenCalledWith({
      type: 'EXPIRE_FINAL_RESPONSE_WINDOW',
      issuedAt: AT,
      roundId: ROUND,
      timerId: window.timerId,
      deadline: window.deadline,
    })
  })

  it('arms nothing when no window is running', () => {
    const store = finalStore({ scores: { red: 300, blue: 100 } })
    store.dispatch({ type: 'BEGIN_FINAL_WAGER', issuedAt: AT, roundId: ROUND, mode: 'classic' })
    const dispatch = vi.fn(accepted)
    render(<Harness game={gameOf(store)} dispatch={dispatch} now={AT} />)
    vi.advanceTimersByTime(600_000)
    expect(dispatch).not.toHaveBeenCalled()
  })

  it('arms nothing for a board round or for no game at all', () => {
    const store = finalStore({ scores: { red: 300, blue: 100 } })
    store.dispatch({ type: 'SELECT_ROUND', issuedAt: AT, roundId: 'board-round' })
    const dispatch = vi.fn(accepted)
    render(<Harness game={gameOf(store)} dispatch={dispatch} now={AT} />)
    render(<Harness game={null} dispatch={dispatch} now={AT} />)
    vi.advanceTimersByTime(600_000)
    expect(dispatch).not.toHaveBeenCalled()
  })

  it('tears its timeout down on unmount', () => {
    const store = finalStore({ scores: { red: 300, blue: 100 } })
    store.dispatch({ type: 'BEGIN_FINAL_WAGER', issuedAt: AT, roundId: ROUND, mode: 'classic' })
    store.dispatch({
      type: 'START_FINAL_WAGER_WINDOW',
      issuedAt: AT,
      roundId: ROUND,
      durationSeconds: 60,
    })
    const dispatch = vi.fn(accepted)
    const { unmount } = render(<Harness game={gameOf(store)} dispatch={dispatch} now={AT} />)
    unmount()
    vi.advanceTimersByTime(600_000)
    expect(dispatch).not.toHaveBeenCalled()
  })

  it('fires on the next tick for a deadline that is already in the past', () => {
    const store = finalStore({ scores: { red: 300, blue: 100 } })
    store.dispatch({ type: 'BEGIN_FINAL_WAGER', issuedAt: AT, roundId: ROUND, mode: 'classic' })
    store.dispatch({
      type: 'START_FINAL_WAGER_WINDOW',
      issuedAt: AT,
      roundId: ROUND,
      durationSeconds: 60,
    })
    const dispatch = vi.fn(accepted)
    // The host came back to Final long after the window should have ended.
    render(<Harness game={gameOf(store)} dispatch={dispatch} now={AT + 600_000} />)
    vi.advanceTimersByTime(0)
    expect(dispatch).toHaveBeenCalledTimes(1)
  })
})
