import { useLayoutEffect } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, render, screen } from '@testing-library/react'
import { FinalWagerHostPanel } from './FinalWagerHostPanel'
import type { SessionStore } from '../state/store'
import type { PrivateGameState } from '../state/privateState'
import { createManualClock, type ManualClock } from '../time/clock'
import { AT, FINAL_ROUND_ID, finalOf, finalStore } from '../test/finalWagerFixtures'
import { remainingMsAt } from '../game/timing/responsePhase'
import { formatRemaining } from '../time/duration'

/**
 * CBN-3 (Court A/B recertification 2026-10-17): the teacher's Final countdown
 * must visibly progress while a Final window runs, derived — like the projector's
 * — from the one durable deadline and a clock read at the rendering edge. No
 * store mutation and no event per tick; the host never expires anything itself.
 */

const ROUND = FINAL_ROUND_ID

function gameOf(store: SessionStore): PrivateGameState {
  const game = store.getState().session?.game
  if (!game) throw new Error('no game loaded')
  return game
}

function lockedWagersStore(): SessionStore {
  const store = finalStore({ scores: { red: 300, blue: 100 } })
  store.dispatch({ type: 'BEGIN_FINAL_WAGER', issuedAt: AT, roundId: ROUND, mode: 'classic' })
  store.dispatch({ type: 'RECORD_FINAL_WAGER', issuedAt: AT, roundId: ROUND, teamId: 'red', wager: 0 })
  store.dispatch({ type: 'RECORD_FINAL_WAGER', issuedAt: AT, roundId: ROUND, teamId: 'blue', wager: 0 })
  store.dispatch({ type: 'LOCK_FINAL_WAGERS', issuedAt: AT, roundId: ROUND })
  return store
}

function responseWindowStore(): SessionStore {
  const store = lockedWagersStore()
  store.dispatch({ type: 'START_FINAL_RESPONSE_WINDOW', issuedAt: AT, roundId: ROUND, captureMode: 'host-only' })
  return store
}

function renderPanel(store: SessionStore, clock: ManualClock) {
  const view = render(
    <FinalWagerHostPanel
      dispatch={(command) => store.dispatch(command)}
      game={gameOf(store)}
      clock={clock}
    />,
  )
  return {
    ...view,
    refresh() {
      view.rerender(
        <FinalWagerHostPanel
          dispatch={(command) => store.dispatch(command)}
          game={gameOf(store)}
          clock={clock}
        />,
      )
    },
  }
}

function tick(clock: ManualClock, ms: number) {
  act(() => {
    clock.advance(ms)
    vi.advanceTimersByTime(ms)
  })
}

const responseStatus = () => screen.getByTestId('fwh-response-status')

beforeEach(() => {
  vi.useFakeTimers()
})
afterEach(() => {
  vi.useRealTimers()
})

describe('the host Final response countdown ticks from the durable deadline (CBN-3)', () => {
  it('advances under a controlled clock with no new snapshot', () => {
    const store = responseWindowStore()
    const clock = createManualClock(AT)
    const window = finalOf(store).responseWindow
    if (window.status !== 'running') throw new Error('expected a running response window')
    renderPanel(store, clock)
    const start = formatRemaining(remainingMsAt(window, AT))
    expect(responseStatus()).toHaveTextContent(`running — ${start}`)

    tick(clock, 10_000)
    expect(responseStatus()).toHaveTextContent(
      `running — ${formatRemaining(remainingMsAt(window, AT + 10_000))}`,
    )
    expect(responseStatus()).not.toHaveTextContent(`running — ${start}`)
  })

  it('reaches the deadline at 0:00 and never counts below it; the host still has not expired anything', () => {
    const store = responseWindowStore()
    const clock = createManualClock(AT)
    const window = finalOf(store).responseWindow
    if (window.status !== 'running') throw new Error('expected a running response window')
    const historyBefore = store.getHistory().length
    renderPanel(store, clock)
    tick(clock, window.deadline - AT)
    expect(responseStatus()).toHaveTextContent('running — 0:00')
    tick(clock, 5_000)
    expect(responseStatus()).toHaveTextContent('running — 0:00')
    // Rendering appended nothing: expiry is the expiry hook's command, not the panel's.
    expect(store.getHistory()).toHaveLength(historyBefore)
  })

  it('a fresh mount mid-window (Host reload) derives the remaining time from the durable deadline', () => {
    const store = responseWindowStore()
    const window = finalOf(store).responseWindow
    if (window.status !== 'running') throw new Error('expected a running response window')
    const clock = createManualClock(AT + 12_000)
    renderPanel(store, clock)
    expect(responseStatus()).toHaveTextContent(
      `running — ${formatRemaining(remainingMsAt(window, AT + 12_000))}`,
    )
    tick(clock, 1_000)
    expect(responseStatus()).toHaveTextContent(
      `running — ${formatRemaining(remainingMsAt(window, AT + 13_000))}`,
    )
  })

  it('stops ticking once the window is paused, and shows the frozen remaining time', () => {
    const store = responseWindowStore()
    const clock = createManualClock(AT)
    const panel = renderPanel(store, clock)
    tick(clock, 4_000)
    store.dispatch({ type: 'PAUSE_FINAL_RESPONSE_WINDOW', issuedAt: AT + 4_000, roundId: ROUND })
    panel.refresh()
    const paused = responseStatus().textContent
    expect(paused).toMatch(/paused — /)
    tick(clock, 10_000)
    expect(responseStatus().textContent).toBe(paused)
    expect(vi.getTimerCount()).toBe(0)
  })

  it('the first render after Resume already shows the paused remaining time, never a stale sample', () => {
    const store = responseWindowStore()
    const clock = createManualClock(AT)
    const committed: (string | null)[] = []
    // Records the text of every commit, before any effect can correct it.
    function CommitProbe() {
      useLayoutEffect(() => {
        committed.push(screen.queryByTestId('fwh-response-status')?.textContent ?? null)
      })
      return null
    }
    const element = () => (
      <>
        <FinalWagerHostPanel dispatch={(command) => store.dispatch(command)} game={gameOf(store)} clock={clock} />
        <CommitProbe />
      </>
    )
    const view = render(element())
    tick(clock, 4_000)
    store.dispatch({ type: 'PAUSE_FINAL_RESPONSE_WINDOW', issuedAt: AT + 4_000, roundId: ROUND })
    view.rerender(element())
    const paused = responseStatus().textContent?.replace('paused', 'running')
    tick(clock, 60_000)
    store.dispatch({ type: 'RESUME_FINAL_RESPONSE_WINDOW', issuedAt: AT + 64_000, roundId: ROUND })
    committed.length = 0
    view.rerender(element())
    expect(committed[0]).toBe(paused)
  })

  it('shows time up after the authoritative expiry and schedules nothing more', () => {
    const store = responseWindowStore()
    const clock = createManualClock(AT)
    const window = finalOf(store).responseWindow
    if (window.status !== 'running') throw new Error('expected a running response window')
    const panel = renderPanel(store, clock)
    tick(clock, window.deadline - AT + 1_000)
    store.dispatch({
      type: 'EXPIRE_FINAL_RESPONSE_WINDOW',
      issuedAt: window.deadline + 1_000,
      roundId: ROUND,
      timerId: window.timerId,
      deadline: window.deadline,
    })
    panel.refresh()
    expect(responseStatus()).toHaveTextContent('time up')
    expect(vi.getTimerCount()).toBe(0)
  })
})

describe('the host Final wager countdown ticks too (CBN-3)', () => {
  it('advances under a controlled clock', () => {
    const store = finalStore({ scores: { red: 300, blue: 100 } })
    store.dispatch({ type: 'BEGIN_FINAL_WAGER', issuedAt: AT, roundId: ROUND, mode: 'classic' })
    store.dispatch({ type: 'START_FINAL_WAGER_WINDOW', issuedAt: AT, roundId: ROUND, durationSeconds: 60 })
    const clock = createManualClock(AT)
    renderPanel(store, clock)
    expect(screen.getByTestId('fwh-wager-status')).toHaveTextContent('running — 1:00')
    tick(clock, 13_000)
    expect(screen.getByTestId('fwh-wager-status')).toHaveTextContent('running — 0:47')
  })
})
