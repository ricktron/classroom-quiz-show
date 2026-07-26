import type { PublicState } from '../state/publicState'
import {
  createBroadcastChannelTransport,
  type SyncChannel,
} from './channel'
import { SYNC_CHANNEL_NAME, decodeEnvelope, encodeEnvelope } from './protocol'
import { systemClock, type Clock } from '../time/clock'

/**
 * The largest host/display clock difference the display will act on, in
 * milliseconds (Slice 7).
 *
 * The estimate is `sentAt − receivedAt`: how far ahead of the display's clock the
 * host's clock appeared to be, ignoring transport delay. On the only transport
 * that exists today — BroadcastChannel between two tabs of one browser — both
 * readings come from the same `Date.now()`, so the estimate is ~0 and the
 * correction is a no-op. It is computed anyway because the alternative is a
 * display that silently mis-renders a countdown the day the transport changes.
 *
 * The correction is CLAMPED rather than trusted outright: a wildly divergent
 * stamp (a host clock corrected mid-lesson, a machine with the wrong date) must
 * not be able to push the projector's countdown to an absurd value. Beyond this
 * tolerance the display applies the bound and keeps rendering — and, either way,
 * it never expires the timer itself. Expiry is the host's alone.
 */
export const MAX_CLOCK_OFFSET_CORRECTION_MS = 5_000

/**
 * Display-side subscriber (read-only side).
 *
 * The display is never authoritative. This receiver:
 *   - decodes every inbound message and drops anything invalid (fail closed),
 *   - ignores stale or duplicate revisions using a monotonic `revision` guard,
 *     so out-of-order or repeated deliveries never move the display backwards,
 *   - only surfaces a strictly-newer valid snapshot via `onState`, and
 *   - sends one `request-state` on start so a freshly opened/refreshed display
 *     immediately asks the host to republish (resuming the subscription safely).
 *
 * If the host disappears, the receiver simply stops getting updates and the
 * display keeps its last safe state — it never promotes itself to authority.
 */
export interface PublicStateReceiver {
  close(): void
}

export interface ReceiverOptions {
  /** Called with each strictly-newer, valid snapshot. */
  onState: (state: PublicState) => void
  /**
   * Called with the clamped host−display clock offset for each accepted snapshot
   * (Slice 7). Positive means the host's clock reads ahead of this display's.
   * Optional: a display that renders no countdown needs no offset at all.
   */
  onClockOffset?: (offsetMs: number) => void
  /** Injectable transport (defaults to the real BroadcastChannel). */
  channel?: SyncChannel
  /** Highest revision already applied (defaults to 0). */
  initialRevision?: number
  /** Clock used to timestamp receipt (defaults to the real one). */
  clock?: Clock
}

export function createPublicStateReceiver(
  options: ReceiverOptions,
): PublicStateReceiver {
  const channel = options.channel ?? createBroadcastChannelTransport(SYNC_CHANNEL_NAME)
  const clock = options.clock ?? systemClock
  let lastRevision = options.initialRevision ?? 0

  const unsubscribe = channel.subscribe((data) => {
    const decoded = decodeEnvelope(data)
    if (!decoded.ok) return // transport decode failure → ignore
    if (decoded.message.type !== 'public-state') return // e.g. another display's request

    const { revision, sentAt, payload } = decoded.message
    // Stale or duplicate revision → ignore; only strictly-newer advances.
    if (revision <= lastRevision) return
    lastRevision = revision
    options.onState(payload)
    // Estimated once per accepted snapshot, so an authoritative republish also
    // re-corrects the estimate. Reading the clock here is a presentation-edge
    // read: it never touches state, history, or replay.
    options.onClockOffset?.(clampOffset(sentAt - clock.now()))
  })

  // Ask the host to republish now, so we catch up without waiting for a change.
  channel.post(encodeEnvelope({ type: 'request-state' }))

  return {
    close() {
      unsubscribe()
      channel.close()
    },
  }
}

/**
 * Bound a clock-offset estimate to {@link MAX_CLOCK_OFFSET_CORRECTION_MS}.
 *
 * Exported so a test can state the tolerance once and both sides provably agree.
 * A non-finite estimate corrects nothing rather than poisoning the countdown.
 */
export function clampOffset(offsetMs: number): number {
  if (!Number.isFinite(offsetMs)) return 0
  if (offsetMs > MAX_CLOCK_OFFSET_CORRECTION_MS) return MAX_CLOCK_OFFSET_CORRECTION_MS
  if (offsetMs < -MAX_CLOCK_OFFSET_CORRECTION_MS) return -MAX_CLOCK_OFFSET_CORRECTION_MS
  return offsetMs
}
