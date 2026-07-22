import { useEffect } from 'react'
import type { SessionStore } from '../state/store'
import { createPublicStateBroadcaster } from '../sync/broadcaster'

/**
 * Wire an authoritative store to the broadcast transport.
 *
 * Publishes the current sanitized snapshot immediately (so an already-open
 * display updates), then republishes on every store change. The broadcaster also
 * answers `request-state` from freshly opened displays. Only sanitized
 * `PublicState` ever crosses the channel — private state stays on the host.
 */
export function useHostSync(store: SessionStore): void {
  useEffect(() => {
    const broadcaster = createPublicStateBroadcaster({
      getSnapshot: () => store.getPublicState(),
    })

    broadcaster.publish(store.getPublicState())
    const unsubscribe = store.subscribe(() => {
      broadcaster.publish(store.getPublicState())
    })

    return () => {
      unsubscribe()
      broadcaster.close()
    }
  }, [store])
}
