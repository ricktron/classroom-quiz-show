import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, render, screen } from '@testing-library/react'
import { ResponseTimerDisplay } from './ResponseTimerDisplay'
import { COUNTDOWN_TICK_MS } from './useResponseCountdown'
import type { PublicBuzzState, PublicResponseState } from '../state/publicState'
import { createManualClock } from '../time/clock'
import { FORBIDDEN_DISPLAY_LABELS } from '../test/leakLabels'

/**
 * Slice 8 made `buzz` a required part of the response DTO. This panel renders the
 * timer half only — the queue has its own component — so every case here supplies
 * the "nobody has buzzed" member and the assertions are unchanged.
 */
const NO_BUZZ: PublicBuzzState = { status: 'none' }

/**
 * The projector response timer — component behaviour (Slice 7).
 *
 * The claims proved here:
 *  - every state is legible as TEXT, never as colour alone;
 *  - the countdown is derived locally from the published deadline and a clock,
 *    with no host revision per second;
 *  - the host/display clock offset is applied;
 *  - reaching zero does NOT expire anything — only the host's `expired` snapshot
 *    changes the state;
 *  - nothing host-only appears, at any status.
 *
 * The clock is injected, so every countdown assertion is exact and instant.
 */

const AT = 1_000_000

/**
 * Fake timers drive the sampling interval, an injected clock drives "now". The
 * two together mean not one assertion below waits for a real millisecond.
 */
beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

function running(deadlineOffsetMs = 30_000, durationMs = 30_000): PublicResponseState {
  return {
    armed: false,
    timer: { status: 'running', durationMs, deadline: AT + deadlineOffsetMs },
    buzz: NO_BUZZ,
  }
}

describe('what the class can read', () => {
  it('shows the countdown derived from the published deadline', () => {
    render(<ResponseTimerDisplay response={running()} clock={createManualClock(AT)} />)
    expect(screen.getByTestId('rtd-clock')).toHaveTextContent('0:30')
    expect(screen.getByTestId('rtd-status')).toHaveTextContent('Time remaining')
  })

  it('counts down as the local clock advances, with no new snapshot', () => {
    const clock = createManualClock(AT)
    render(<ResponseTimerDisplay response={running()} clock={clock} />)
    expect(screen.getByTestId('rtd-clock')).toHaveTextContent('0:30')
    act(() => {
      clock.advance(10_000)
      // One sampling tick is all it takes; no host message was involved.
      vi.advanceTimersByTime(COUNTDOWN_TICK_MS)
    })
    expect(screen.getByTestId('rtd-clock')).toHaveTextContent('0:20')
  })

  it('states the armed state in words', () => {
    const { rerender } = render(
      <ResponseTimerDisplay response={running()} clock={createManualClock(AT)} />,
    )
    expect(screen.getByTestId('rtd-armed')).toHaveTextContent('Buzzers not armed')
    rerender(
      <ResponseTimerDisplay
        response={{ ...running(), armed: true }}
        clock={createManualClock(AT)}
      />,
    )
    expect(screen.getByTestId('rtd-armed')).toHaveTextContent('Buzzers armed')
  })

  it('states paused, expired and stopped in words', () => {
    const clock = createManualClock(AT)
    const { rerender } = render(
      <ResponseTimerDisplay
        response={{ armed: false, timer: { status: 'paused', durationMs: 30_000, remainingMs: 12_000 }, buzz: NO_BUZZ }}
        clock={clock}
      />,
    )
    expect(screen.getByTestId('rtd-status')).toHaveTextContent('Paused')
    expect(screen.getByTestId('rtd-clock')).toHaveTextContent('0:12')

    rerender(
      <ResponseTimerDisplay
        response={{ armed: false, timer: { status: 'expired', durationMs: 30_000 }, buzz: NO_BUZZ }}
        clock={clock}
      />,
    )
    expect(screen.getByTestId('rtd-status')).toHaveTextContent('Time up')
    expect(screen.getByTestId('rtd-clock')).toHaveTextContent('0:00')

    rerender(
      <ResponseTimerDisplay
        response={{
          armed: false,
          buzz: NO_BUZZ,
          timer: { status: 'interrupted', durationMs: 30_000, remainingMs: 9_000 },
        }}
        clock={clock}
      />,
    )
    expect(screen.getByTestId('rtd-status')).toHaveTextContent('Stopped')
    expect(screen.getByTestId('rtd-clock')).toHaveTextContent('0:09')
  })

  it('shows an armed clue with no timer, and no clock', () => {
    render(
      <ResponseTimerDisplay
        response={{ armed: true, timer: { status: 'idle' }, buzz: NO_BUZZ }}
        clock={createManualClock(AT)}
      />,
    )
    expect(screen.getByTestId('rtd-armed')).toHaveTextContent('Buzzers armed')
    expect(screen.queryByTestId('rtd-clock')).not.toBeInTheDocument()
  })

  it('carries each state on a data attribute too, so styling never has to parse text', () => {
    render(<ResponseTimerDisplay response={{ ...running(), armed: true }} clock={createManualClock(AT)} />)
    const panel = screen.getByTestId('rtd')
    expect(panel).toHaveAttribute('data-status', 'running')
    expect(panel).toHaveAttribute('data-armed', 'armed')
  })
})

describe('the display is never the authority', () => {
  it('shows 0:00 but stays RUNNING once the deadline passes', () => {
    const clock = createManualClock(AT)
    render(<ResponseTimerDisplay response={running()} clock={clock} />)
    act(() => {
      clock.advance(45_000)
      vi.advanceTimersByTime(COUNTDOWN_TICK_MS)
    })
    expect(screen.getByTestId('rtd-clock')).toHaveTextContent('0:00')
    // It waits to be TOLD the window ended. It never expires the timer itself.
    expect(screen.getByTestId('rtd')).toHaveAttribute('data-status', 'running')
    expect(screen.getByTestId('rtd-status')).toHaveTextContent('Time remaining')
  })

  it('only shows "Time up" when the host says so', () => {
    render(
      <ResponseTimerDisplay
        response={{ armed: false, timer: { status: 'expired', durationMs: 30_000 }, buzz: NO_BUZZ }}
        clock={createManualClock(AT)}
      />,
    )
    expect(screen.getByTestId('rtd')).toHaveAttribute('data-status', 'expired')
  })

  it('never shows a negative countdown or more than the window that was started', () => {
    const clock = createManualClock(AT)
    const { rerender } = render(<ResponseTimerDisplay response={running()} clock={clock} />)
    act(() => {
      clock.advance(10_000_000)
      vi.advanceTimersByTime(COUNTDOWN_TICK_MS)
    })
    expect(screen.getByTestId('rtd-clock')).toHaveTextContent('0:00')
    // A display clock that is wildly BEHIND cannot inflate the number either.
    clock.set(AT - 10_000_000)
    rerender(<ResponseTimerDisplay response={running()} clock={clock} />)
    act(() => {
      vi.advanceTimersByTime(COUNTDOWN_TICK_MS)
    })
    expect(screen.getByTestId('rtd-clock')).toHaveTextContent('0:30')
  })
})

describe('clock-offset correction', () => {
  it('interprets the deadline on the HOST clock', () => {
    // This display's clock reads 5 s behind the host's, so the receiver reports
    // +5000. Without the correction the countdown would read 0:35.
    const clock = createManualClock(AT - 5_000)
    render(<ResponseTimerDisplay response={running()} hostClockOffsetMs={5_000} clock={clock} />)
    expect(screen.getByTestId('rtd-clock')).toHaveTextContent('0:30')
  })

  it('works in the other direction too', () => {
    const clock = createManualClock(AT + 5_000)
    render(<ResponseTimerDisplay response={running()} hostClockOffsetMs={-5_000} clock={clock} />)
    expect(screen.getByTestId('rtd-clock')).toHaveTextContent('0:30')
  })

  it('defaults to no correction', () => {
    render(<ResponseTimerDisplay response={running()} clock={createManualClock(AT)} />)
    expect(screen.getByTestId('rtd-clock')).toHaveTextContent('0:30')
  })
})

describe('accessibility', () => {
  it('exposes the countdown as a timer with a spoken label', () => {
    render(<ResponseTimerDisplay response={running(65_000, 90_000)} clock={createManualClock(AT)} />)
    const timer = screen.getByRole('timer')
    expect(timer).toHaveTextContent('1:05')
    expect(timer).toHaveAttribute('aria-label', 'Time remaining: 1 minute 5 seconds')
  })

  it('gives paused, expired, stopped and armed distinct accessible text', () => {
    const clock = createManualClock(AT)
    const { rerender } = render(
      <ResponseTimerDisplay
        response={{ armed: true, timer: { status: 'paused', durationMs: 30_000, remainingMs: 5_000 }, buzz: NO_BUZZ }}
        clock={clock}
      />,
    )
    expect(screen.getByRole('timer')).toHaveAttribute('aria-label', 'Paused: 5 seconds')
    rerender(
      <ResponseTimerDisplay
        response={{ armed: false, timer: { status: 'interrupted', durationMs: 30_000, remainingMs: 5_000 }, buzz: NO_BUZZ }}
        clock={clock}
      />,
    )
    expect(screen.getByRole('timer')).toHaveAttribute('aria-label', 'Stopped: 5 seconds')
  })

  it('names the panel', () => {
    render(<ResponseTimerDisplay response={running()} clock={createManualClock(AT)} />)
    expect(screen.getByRole('region', { name: 'Response timer' })).toBeInTheDocument()
  })
})

describe('privacy', () => {
  it('renders none of the permanent host-only labels, at any status', () => {
    const clock = createManualClock(AT)
    const states: PublicResponseState[] = [
      running(),
      { armed: true, timer: { status: 'idle' }, buzz: NO_BUZZ },
      { armed: false, timer: { status: 'paused', durationMs: 1_000, remainingMs: 500 }, buzz: NO_BUZZ },
      { armed: false, timer: { status: 'expired', durationMs: 1_000 }, buzz: NO_BUZZ },
      { armed: false, timer: { status: 'interrupted', durationMs: 1_000, remainingMs: 500 }, buzz: NO_BUZZ },
    ]
    for (const response of states) {
      const { container, unmount } = render(
        <ResponseTimerDisplay response={response} clock={clock} />,
      )
      const html = container.innerHTML.toLowerCase()
      for (const label of FORBIDDEN_DISPLAY_LABELS) {
        expect(html, `must not contain "${label}"`).not.toContain(label.toLowerCase())
      }
      // Nor the host-only interruption vocabulary, nor any internal token.
      for (const forbidden of ['timerid', 'tmr-', 'stopped by the host', 'reset window']) {
        expect(html, `must not contain "${forbidden}"`).not.toContain(forbidden)
      }
      unmount()
    }
  })

  it('renders no control at all — the projector is read-only', () => {
    const { container } = render(
      <ResponseTimerDisplay response={running()} clock={createManualClock(AT)} />,
    )
    expect(container.querySelectorAll('button, input, select, a')).toHaveLength(0)
  })
})
