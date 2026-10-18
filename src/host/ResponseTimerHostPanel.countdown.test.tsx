import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { ResponseTimerHostPanel } from './ResponseTimerHostPanel'
import { createSessionStore, type SessionStore } from '../state/store'
import type { SessionCommand } from '../state/commands'
import { importGameFromUnknown } from '../import/importGame'
import { boardGameFile, richBoardConfig } from '../test/categoryBoardFixtures'
import { createManualClock, type ManualClock } from '../time/clock'
import { remainingMsAt } from '../game/timing/responsePhase'
import { responsePhaseFor } from '../state/reducer'
import { formatRemaining } from '../time/duration'
import {
  LEFTOVER_AT,
  LEFTOVER_ROUND,
  leftoverRunningCorrectStore,
} from '../test/leftoverRunningBoardFixtures'

/**
 * CBN-5 — the teacher's BOARD response countdown must visibly progress while the
 * window runs, derived like the projector's from the one durable deadline and a
 * clock read at the rendering edge.
 *
 * This is the same timer-authority principle CBN-3 established for the Final.
 * The panel's own contract claims the host and projector "cannot disagree about
 * the number"; these tests hold it to that. The host still expires nothing,
 * appends no event per tick, and mutates no store state merely to repaint.
 */

const AT = 1_000_000
const ROUND = 'board-round'

function boardStore(): SessionStore {
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
 * Renders the panel the way the Host route does: `useSessionStore` subscribes to
 * the store, so ANY store change re-renders the panel and nothing else does.
 * That is precisely the condition under which a frozen countdown is visible.
 */
function renderPanel(store: SessionStore, clock: ManualClock) {
  const game = () => {
    const value = store.getState().session?.game
    if (!value) throw new Error('no game')
    return value
  }
  const dispatch = (command: SessionCommand) => store.dispatch(command)
  const element = () => (
    <ResponseTimerHostPanel dispatch={dispatch} game={game()} clock={clock} />
  )
  const view = render(element())
  const unsubscribe = store.subscribe(() => {
    act(() => {
      view.rerender(element())
    })
  })
  return {
    ...view,
    unmount() {
      unsubscribe()
      view.unmount()
    },
  }
}

function tick(clock: ManualClock, ms: number) {
  act(() => {
    clock.advance(ms)
    vi.advanceTimersByTime(ms)
  })
}

const remaining = () => screen.getByTestId('rth-remaining')
const status = () => screen.getByTestId('rth-status')

const runningTimer = (store: SessionStore) => {
  const timer = responsePhaseFor(store.getState().session!.game!, ROUND).timer
  if (timer.status !== 'running') throw new Error(`expected running, got ${timer.status}`)
  return timer
}

beforeEach(() => {
  vi.useFakeTimers()
})
afterEach(() => {
  vi.useRealTimers()
})

describe('the host board response countdown ticks from the durable deadline (CBN-5)', () => {
  it('advances under a controlled clock with no new store state', () => {
    const store = boardStore()
    const clock = createManualClock(AT)
    renderPanel(store, clock)

    fireEvent.click(screen.getByTestId('rth-start'))
    const timer = runningTimer(store)
    const start = formatRemaining(remainingMsAt(timer, AT))
    expect(remaining()).toHaveTextContent(start)
    const revisionBefore = store.getState().revision
    const historyBefore = store.getHistory().length

    tick(clock, 10_000)

    expect(remaining()).toHaveTextContent(formatRemaining(remainingMsAt(timer, AT + 10_000)))
    expect(remaining()).not.toHaveTextContent(start)
    // No second timer authority: repainting appends nothing and mutates nothing.
    expect(store.getState().revision).toBe(revisionBefore)
    expect(store.getHistory().length).toBe(historyBefore)
  })

  // The harness deliberately omits useResponseTimerExpiry, so this pins the
  // panel reaching 0:00 while appending and mutating nothing. It does NOT test
  // expiry itself — in the real Host the expiry hook fires at the deadline.
  it('reaches 0:00 without appending an event or expiring anything itself', () => {
    const store = boardStore()
    const clock = createManualClock(AT)
    renderPanel(store, clock)

    fireEvent.click(screen.getByTestId('rth-start'))
    const historyBefore = store.getHistory().length

    tick(clock, 10 * 60_000)

    expect(remaining()).toHaveTextContent(formatRemaining(0))
    // The panel reached zero without expiring anything itself.
    expect(store.getHistory().length).toBe(historyBefore)
    expect(responsePhaseFor(store.getState().session!.game!, ROUND).timer.status).toBe('running')
  })

  it('freezes a paused window and schedules nothing', () => {
    const store = boardStore()
    const clock = createManualClock(AT)
    renderPanel(store, clock)

    fireEvent.click(screen.getByTestId('rth-start'))
    tick(clock, 3_000)
    fireEvent.click(screen.getByTestId('rth-pause'))
    const frozen = remaining().textContent

    tick(clock, 20_000)

    expect(remaining().textContent).toBe(frozen)
    expect(status()).toHaveTextContent(/paused/i)
    expect(vi.getTimerCount()).toBe(0)
  })

  it('schedules nothing once the window has expired', () => {
    const store = boardStore()
    const clock = createManualClock(AT)
    renderPanel(store, clock)

    fireEvent.click(screen.getByTestId('rth-start'))
    const timer = runningTimer(store)
    act(() => {
      clock.advance(timer.durationMs + 1_000)
    })
    store.dispatch({
      type: 'EXPIRE_RESPONSE_TIMER',
      issuedAt: clock.now(),
      roundId: ROUND,
      timerId: timer.timerId,
      deadline: timer.deadline,
    })

    expect(status()).toHaveTextContent(/time up/i)
    expect(remaining()).toHaveTextContent(formatRemaining(0))
    expect(vi.getTimerCount()).toBe(0)
  })

  // Not a reload: the same store is reused and the panel re-mounts against a
  // later clock. That is the fact worth pinning — a fresh mount derives from the
  // durable deadline (already correct before this repair) and then keeps ticking
  // (the part that was broken).
  it('derives from the durable deadline on a fresh mount, then keeps ticking', () => {
    const store = boardStore()
    const clock = createManualClock(AT)
    const first = renderPanel(store, clock)
    fireEvent.click(screen.getByTestId('rth-start'))
    const timer = runningTimer(store)
    first.unmount()
    cleanup()

    // A reload rebuilds from history; the deadline is the durable fact.
    const reloadClock = createManualClock(AT + 7_000)
    renderPanel(store, reloadClock)
    expect(remaining()).toHaveTextContent(formatRemaining(remainingMsAt(timer, AT + 7_000)))

    tick(reloadClock, 5_000)
    expect(remaining()).toHaveTextContent(formatRemaining(remainingMsAt(timer, AT + 12_000)))
  })

  it('schedules nothing once Correct has closed the opportunity', () => {
    // Canonical leftover-running Correct: the private timer is still `running`
    // for undo fidelity, but Correct owns the opportunity so the panel shows no
    // remaining time. It must not keep a 4Hz interval alive behind a dash for as
    // long as the clue stays on screen — an unbounded lifetime.
    const store = leftoverRunningCorrectStore()
    const clock = createManualClock(LEFTOVER_AT)
    renderPanel(store, clock)

    expect(screen.getByTestId('rth-remaining')).toHaveTextContent('—')
    // The discriminator, stated rather than left to a mutation run: this is the
    // Correct-closed branch, not the idle branch (which also shows a dash).
    expect(status()).toHaveTextContent(/closed — not a live response timer/i)
    expect(vi.getTimerCount()).toBe(0)

    // And the leftover timer really is still running underneath, so this is the
    // `!correctClosed` half of the gate being pinned, not an idle timer.
    const timer = responsePhaseFor(store.getState().session!.game!, LEFTOVER_ROUND).timer
    expect(timer.status).toBe('running')
  })
})
