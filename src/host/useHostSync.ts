import { useEffect, useMemo } from 'react'
import type { SessionStore } from '../state/store'
import { createPublicStateBroadcaster } from '../sync/broadcaster'
import { createHostStreamId } from '../sync/hostStream'
import { systemClock, type Clock } from '../time/clock'

export type HostSyncLeadership = 'unknown' | 'leader' | 'follower'

export interface UseHostSyncOptions {
  readonly leadership?: HostSyncLeadership
  readonly hostStreamId?: string
}

/**
 * Wire an authoritative store to the broadcast transport.
 *
 * Publishes the current sanitized snapshot immediately (so an already-open
 * display updates), then republishes on every store change. The broadcaster also
 * answers `request-state` from freshly opened displays. Only sanitized
 * `PublicState` ever crosses the channel — private state stays on the host.
 *
 * Follower Host tabs do not publish; persistence leadership defines which tab
 * may broadcast so two Host instances cannot interleave effective authority.
 */
export function useHostSync(
  store: SessionStore,
  clock: Clock = systemClock,
  options: UseHostSyncOptions = {},
): void {
  const leadership = options.leadership ?? 'unknown'
  const hostStreamId = useMemo(
    () => options.hostStreamId ?? createHostStreamId(),
    [options.hostStreamId],
  )

  useEffect(() => {
    if (leadership === 'follower') return

    const snapshot = () => store.getPublicState()
    const broadcaster = createPublicStateBroadcaster({
      getSnapshot: snapshot,
      hostStreamId,
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
  }, [store, clock, hostStreamId, leadership])
}
