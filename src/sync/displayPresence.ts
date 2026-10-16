import { createBroadcastChannelTransport, type SyncChannel } from './channel'
import { SYNC_CHANNEL_NAME, decodeEnvelope, encodeEnvelope } from './protocol'
import type { Clock } from '../time/clock'

/**
 * Display presence over the existing public sync channel (Court B CB-01).
 *
 * A Host used to know a Display was open only through the `window.open` handle of
 * the document that opened it. After a Host reload that handle is gone, so the
 * Host reported "Display not open" while the Display stayed open and live.
 *
 * Presence is evidence a Display is actually live on the sync path:
 *   - the Host posts a payload-free `display-presence-probe` on an interval;
 *   - every live Display answers from its message handler (not a timer, so a
 *     throttled background Display still answers promptly);
 *   - a Display also announces itself on start and reports `live: false` on
 *     `pagehide` / teardown, so an ordinary close is noticed at once.
 *
 * Neither message carries game state, so the projector privacy boundary is
 * unchanged and a Display still cannot push anything into the Host.
 */

/** Host probe cadence. */
export const DISPLAY_PRESENCE_PROBE_INTERVAL_MS = 2_000

/**
 * Presence is timing evidence only, never state, so it uses a monotonic clock:
 * a wall-clock step (NTP correction) must not flip a live Display to "not open".
 */
const monotonicClock: Clock = {
  now: () => (typeof performance !== 'undefined' ? performance.now() : Date.now()),
}

export type CreateDisplayId = () => string

function defaultCreateDisplayId(): string {
  return crypto.randomUUID()
}

export interface DisplayPresenceResponderOptions {
  readonly channel?: SyncChannel
  readonly createDisplayId?: CreateDisplayId
  /** Where `pagehide` is observed (defaults to `window` when present). */
  readonly lifecycleTarget?: Pick<EventTarget, 'addEventListener' | 'removeEventListener'> | null
}

/** Display side: announce, answer probes, and say goodbye. Returns a detach. */
export function attachDisplayPresenceResponder(
  options: DisplayPresenceResponderOptions = {},
): () => void {
  const channel = options.channel ?? createBroadcastChannelTransport(SYNC_CHANNEL_NAME)
  const displayId = (options.createDisplayId ?? defaultCreateDisplayId)()
  const lifecycleTarget =
    options.lifecycleTarget === undefined
      ? typeof window === 'undefined'
        ? null
        : window
      : options.lifecycleTarget

  let live = true
  const announce = (next: boolean) => {
    channel.post(encodeEnvelope({ type: 'display-presence', displayId, live: next }))
  }

  const unsubscribe = channel.subscribe((data) => {
    const decoded = decodeEnvelope(data)
    if (!decoded.ok || decoded.message.type !== 'display-presence-probe') return
    if (live) announce(true)
  })
  const onPageHide = () => {
    live = false
    announce(false)
  }
  const onPageShow = () => {
    // A back/forward-cache restore brings the same Display back to life.
    if (live) return
    live = true
    announce(true)
  }
  lifecycleTarget?.addEventListener('pagehide', onPageHide)
  lifecycleTarget?.addEventListener('pageshow', onPageShow)
  announce(true)

  let detached = false
  return () => {
    if (detached) return
    detached = true
    lifecycleTarget?.removeEventListener('pagehide', onPageHide)
    lifecycleTarget?.removeEventListener('pageshow', onPageShow)
    if (live) announce(false)
    live = false
    unsubscribe()
    channel.close()
  }
}

export interface DisplayPresenceTrackerOptions {
  readonly onChange: (live: boolean) => void
  readonly channel?: SyncChannel
  readonly clock?: Clock
  readonly intervalMs?: number
}

export interface DisplayPresenceTracker {
  /** Whether at least one Display is currently known to be live. */
  isLive(): boolean
  close(): void
}

/**
 * Host side: probe on an interval and track which Displays answer.
 *
 * A Display counts as live while it has answered at least one of the two probes
 * before the current one. Comparing against probe send times (instead of a fixed
 * window) keeps a throttled Host from flapping when its own timer fires late, and
 * allowing one missed probe tolerates a Display whose main thread is briefly busy
 * (a long task on a slow laptop) for up to a full interval. A Display that
 * vanishes without `pagehide` is reported not live within about three intervals;
 * an ordinary close is reported at once via `live: false`.
 */
export function createDisplayPresenceTracker(
  options: DisplayPresenceTrackerOptions,
): DisplayPresenceTracker {
  const channel = options.channel ?? createBroadcastChannelTransport(SYNC_CHANNEL_NAME)
  const clock = options.clock ?? monotonicClock
  const intervalMs = options.intervalMs ?? DISPLAY_PRESENCE_PROBE_INTERVAL_MS

  const lastSeenAt = new Map<string, number>()
  /** Send times of the most recent probes, oldest first (at most three). */
  const probeTimes: number[] = []
  let live = false

  const recompute = () => {
    // Live if any Display answered one of the two probes before the newest one.
    const threshold = probeTimes.length >= 3 ? probeTimes[0]! : Number.NEGATIVE_INFINITY
    let next = false
    for (const seenAt of lastSeenAt.values()) {
      if (seenAt >= threshold) {
        next = true
        break
      }
    }
    if (next !== live) {
      live = next
      options.onChange(live)
    }
  }

  const unsubscribe = channel.subscribe((data) => {
    const decoded = decodeEnvelope(data)
    if (!decoded.ok || decoded.message.type !== 'display-presence') return
    const { displayId, live: displayLive } = decoded.message
    if (displayLive) lastSeenAt.set(displayId, clock.now())
    else lastSeenAt.delete(displayId)
    recompute()
  })

  const probe = () => {
    probeTimes.push(clock.now())
    if (probeTimes.length > 3) probeTimes.shift()
    recompute()
    channel.post(encodeEnvelope({ type: 'display-presence-probe' }))
  }

  probe()
  const timer = setInterval(probe, intervalMs)

  let closed = false
  return {
    isLive: () => live,
    close() {
      if (closed) return
      closed = true
      clearInterval(timer)
      unsubscribe()
      channel.close()
    },
  }
}
