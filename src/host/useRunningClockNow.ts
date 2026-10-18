import { useEffect, useState } from 'react'
import { COUNTDOWN_TICK_MS } from '../display/useResponseCountdown'
import type { Clock } from '../time/clock'

/**
 * The host's "now" for rendering a live countdown (CBN-3).
 *
 * The host derives remaining time exactly as the projector does: from the one
 * durable deadline and a clock read at the RENDERING edge. While a window is
 * running this re-reads the clock at the projector's rate, so the number visibly
 * progresses; nothing is stored, no event is appended, and expiry stays the
 * expiry hook's command. Any other status needs no ticking, so nothing is
 * scheduled.
 *
 * Every render reads the clock itself; the interval only asks for a re-render.
 * So no commit can show a value sampled earlier (for example the pre-pause value
 * on the first render after Resume).
 */
export function useRunningClockNow(clock: Clock, running: boolean): number {
  const [, setTick] = useState(0)
  useEffect(() => {
    if (!running) return
    const handle = setInterval(() => setTick((tick) => tick + 1), COUNTDOWN_TICK_MS)
    return () => clearInterval(handle)
  }, [clock, running])
  return clock.now()
}
