import type { PublicState } from '../state/publicState'
import {
  createBroadcastChannelTransport,
  type SyncChannel,
} from './channel'
import { SYNC_CHANNEL_NAME, decodeEnvelope, encodeEnvelope } from './protocol'

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
  /** Injectable transport (defaults to the real BroadcastChannel). */
  channel?: SyncChannel
  /** Highest revision already applied (defaults to 0). */
  initialRevision?: number
}

export function createPublicStateReceiver(
  options: ReceiverOptions,
): PublicStateReceiver {
  const channel = options.channel ?? createBroadcastChannelTransport(SYNC_CHANNEL_NAME)
  let lastRevision = options.initialRevision ?? 0

  const unsubscribe = channel.subscribe((data) => {
    const decoded = decodeEnvelope(data)
    if (!decoded.ok) return // transport decode failure → ignore
    if (decoded.message.type !== 'public-state') return // e.g. another display's request

    const { revision, payload } = decoded.message
    // Stale or duplicate revision → ignore; only strictly-newer advances.
    if (revision <= lastRevision) return
    lastRevision = revision
    options.onState(payload)
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
