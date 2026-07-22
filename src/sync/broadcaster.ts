import type { PublicState } from '../state/publicState'
import {
  createBroadcastChannelTransport,
  type SyncChannel,
} from './channel'
import { SYNC_CHANNEL_NAME, decodeEnvelope, encodeEnvelope } from './protocol'

/**
 * Host-side publisher (authoritative side).
 *
 * The host is the ONLY authority. This publisher:
 *   - broadcasts sanitized `PublicState` snapshots (never private state), and
 *   - answers `request-state` messages by republishing the current snapshot,
 *     so a display opened/refreshed after the last change still catches up.
 *
 * It deliberately ignores inbound `public-state` messages — a display can never
 * push state into the host, so the display cannot modify host state.
 */
export interface PublicStateBroadcaster {
  /** Broadcast a snapshot to displays. */
  publish(state: PublicState): void
  close(): void
}

export interface BroadcasterOptions {
  /** Returns the current sanitized snapshot (used to answer `request-state`). */
  getSnapshot: () => PublicState
  /** Injectable transport (defaults to the real BroadcastChannel). */
  channel?: SyncChannel
}

export function createPublicStateBroadcaster(
  options: BroadcasterOptions,
): PublicStateBroadcaster {
  const channel = options.channel ?? createBroadcastChannelTransport(SYNC_CHANNEL_NAME)

  const unsubscribe = channel.subscribe((data) => {
    const decoded = decodeEnvelope(data)
    // Only react to a well-formed request; ignore everything else (fail closed).
    if (decoded.ok && decoded.message.type === 'request-state') {
      publish(options.getSnapshot())
    }
  })

  function publish(state: PublicState): void {
    channel.post(
      encodeEnvelope({ type: 'public-state', revision: state.revision, payload: state }),
    )
  }

  return {
    publish,
    close() {
      unsubscribe()
      channel.close()
    },
  }
}
