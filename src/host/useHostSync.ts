import { useEffect } from 'react'
import type { SessionStore } from '../state/store'
import { createPublicStateBroadcaster } from '../sync/broadcaster'
import { overlayPublicTeamNames } from '../session/overlayPublicTeamNames'
import { systemClock, type Clock } from '../time/clock'

/**
 * Wire an authoritative store to the broadcast transport.
 *
 * Publishes the current sanitized snapshot immediately (so an already-open
 * display updates), then republishes on every store change. The broadcaster also
 * answers `request-state` from freshly opened displays. Only sanitized
 * `PublicState` ever crosses the channel — private state stays on the host.
 *
 * Publication is driven by STORE CHANGES, never by a clock. Starting a timer
 * publishes one snapshot carrying a deadline; the seconds ticking away after that
 * publish nothing at all, because the display derives them locally (Slice 7). The
 * clock passed here is used only to stamp `sentAt` on the envelope, so a display
 * can estimate the difference between the two machines' clocks.
 */
export function useHostSync(
  store: SessionStore,
  clock: Clock = systemClock,
  sessionTeamNamesByOrder: readonly string[] | null = null,
): void {
  const overlayKey = sessionTeamNamesByOrder?.join('\u0001') ?? ''
  useEffect(() => {
    const snapshot = () => overlayPublicTeamNames(store.getPublicState(), sessionTeamNamesByOrder)
    const broadcaster = createPublicStateBroadcaster({
      getSnapshot: snapshot,
      clock,
    })

    broadcaster.publish(snapshot())
    const unsubscribe = store.subscribe(() => {
      broadcaster.publish(snapshot())
    })

    return () => {
      unsubscribe()
      broadcaster.close()
    }
  }, [store, clock, overlayKey, sessionTeamNamesByOrder])
}
