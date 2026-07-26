import { useEffect, useMemo, useState } from 'react'
import { publicRemainingMsAt, type PublicResponseTimer } from '../state/publicState'
import { systemClock, type Clock } from '../time/clock'

/**
 * The projector's countdown, derived at the RENDERING edge (Slice 7).
 *
 * This hook is the whole reason the event log has no tick stream in it. The host
 * publishes an absolute deadline once; this hook re-reads the local clock a few
 * times a second and recomputes "how long is left" from that one durable fact. No
 * revision is published per second, no event is appended per frame, and the sync
 * channel stays a snapshot transport (`ROADMAP-AMENDMENT-001` §5.3).
 *
 * ## Clock correction
 *
 * `hostClockOffsetMs` is the receiver's clamped estimate of how far the host's
 * clock reads ahead of this display's. It is added to the local reading before
 * the comparison, so a deadline computed on the host is interpreted on the host's
 * notional clock. On the only transport that exists today — two tabs of one
 * browser — the two clocks are the same and the offset is ~0; the correction is
 * applied anyway so the countdown does not silently drift the day the transport
 * changes. It is an ESTIMATE and is documented as one: transport delay is ignored
 * and the correction is bounded.
 *
 * ## The display never expires anything
 *
 * Reaching 0:00 changes nothing here. The hook keeps reporting zero and the
 * component keeps rendering the running state until the HOST publishes the
 * authoritative `expired` snapshot. A display that expired its own timer would be
 * a second authority, and there is exactly one.
 *
 * ## Ticking
 *
 * Only a `running` timer schedules anything; every other status is a fixed value
 * and the interval is torn down. The rate is deliberately sub-second but not
 * per-frame — a projector shows whole seconds, so four samples a second keeps the
 * number honest without waking the tab sixty times a second.
 */

/** How often a running countdown re-reads the clock, in milliseconds. */
export const COUNTDOWN_TICK_MS = 250

export function useResponseCountdown(
  timer: PublicResponseTimer | null,
  hostClockOffsetMs: number,
  clock: Clock = systemClock,
): number {
  // Rebuilt from the timer's VALUES, so a fresh snapshot carrying an identical
  // timer does not restart the sampling interval and reset its phase.
  const status = timer?.status ?? null
  const deadline = timer !== null && timer.status === 'running' ? timer.deadline : null
  const durationMs = timer !== null && timer.status !== 'idle' ? timer.durationMs : 0
  const frozenRemainingMs =
    timer !== null && (timer.status === 'paused' || timer.status === 'interrupted')
      ? timer.remainingMs
      : null

  const stable = useMemo<PublicResponseTimer | null>(() => {
    switch (status) {
      case 'running':
        return deadline === null ? null : { status: 'running', durationMs, deadline }
      case 'paused':
        return frozenRemainingMs === null
          ? null
          : { status: 'paused', durationMs, remainingMs: frozenRemainingMs }
      case 'interrupted':
        return frozenRemainingMs === null
          ? null
          : { status: 'interrupted', durationMs, remainingMs: frozenRemainingMs }
      case 'expired':
        return { status: 'expired', durationMs }
      case 'idle':
        return { status: 'idle' }
      default:
        return null
    }
  }, [status, deadline, durationMs, frozenRemainingMs])

  const [remainingMs, setRemainingMs] = useState(() =>
    stable === null ? 0 : publicRemainingMsAt(stable, clock.now() + hostClockOffsetMs),
  )

  useEffect(() => {
    if (stable === null) {
      setRemainingMs(0)
      return
    }
    const sample = () => {
      setRemainingMs(publicRemainingMsAt(stable, clock.now() + hostClockOffsetMs))
    }
    sample()
    if (stable.status !== 'running') return
    const handle = setInterval(sample, COUNTDOWN_TICK_MS)
    return () => clearInterval(handle)
  }, [stable, hostClockOffsetMs, clock])

  return remainingMs
}
