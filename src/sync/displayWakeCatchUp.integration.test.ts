import { describe, expect, it, vi } from 'vitest'
import { INITIAL_PUBLIC_STATE, type PublicState } from '../state/publicState'
import { createMemoryChannelHub } from './channel'
import { createPublicStateBroadcaster } from './broadcaster'
import { createPublicStateReceiver } from './receiver'
import { attachDisplayWakeCatchUp } from './displayWakeCatchUp'
import { encodeEnvelope } from './protocol'

function stateAt(revision: number): PublicState {
  return { ...INITIAL_PUBLIC_STATE, revision, headline: `rev ${revision}` }
}

describe('Display wake catch-up over request-state', () => {
  it('receiver.requestState asks the Host to republish current sanitized state', () => {
    const hub = createMemoryChannelHub()
    let hostRevision = 3
    createPublicStateBroadcaster({
      getSnapshot: () => stateAt(hostRevision),
      channel: hub.createChannel(),
    })
    const received: PublicState[] = []
    const receiver = createPublicStateReceiver({
      onState: (s) => received.push(s),
      channel: hub.createChannel(),
      initialRevision: 0,
    })
    // Initial request already delivered rev 3.
    expect(received.map((s) => s.revision)).toEqual([3])

    hostRevision = 7
    receiver.requestState()
    expect(received.map((s) => s.revision)).toEqual([3, 7])
    receiver.close()
  })

  it('catches up from N to N+K after a resume signal while Host advanced', () => {
    const hub = createMemoryChannelHub()
    let hostRevision = 2
    createPublicStateBroadcaster({
      getSnapshot: () => stateAt(hostRevision),
      channel: hub.createChannel(),
    })
    const received: PublicState[] = []
    const receiver = createPublicStateReceiver({
      onState: (s) => received.push(s),
      channel: hub.createChannel(),
    })
    expect(received.at(-1)?.revision).toBe(2)

    // Simulate Display asleep: Host advances without the Display seeing publishes
    // (no channel delivery to a closed subscriber — here we simply skip publishes
    // and only catch up via request-state on resume).
    hostRevision = 5

    let visibility: DocumentVisibilityState = 'visible'
    const listeners = new Set<() => void>()
    const doc = {
      get visibilityState() {
        return visibility
      },
      addEventListener(_type: 'visibilitychange', listener: () => void) {
        listeners.add(listener)
      },
      removeEventListener(_type: 'visibilitychange', listener: () => void) {
        listeners.delete(listener)
      },
    }
    const detach = attachDisplayWakeCatchUp({
      requestState: () => receiver.requestState(),
      doc,
      win: {
        addEventListener() {},
        removeEventListener() {},
      },
    })

    visibility = 'hidden'
    for (const l of listeners) l()
    visibility = 'visible'
    for (const l of listeners) l()

    expect(received.map((s) => s.revision)).toEqual([2, 5])
    detach()
    receiver.close()
  })

  it('equal revision republish after resume remains a harmless no-op', () => {
    const hub = createMemoryChannelHub()
    createPublicStateBroadcaster({
      getSnapshot: () => stateAt(4),
      channel: hub.createChannel(),
    })
    const received: PublicState[] = []
    const onState = vi.fn((s: PublicState) => received.push(s))
    const receiver = createPublicStateReceiver({
      onState,
      channel: hub.createChannel(),
    })
    expect(received).toHaveLength(1)

    receiver.requestState()
    expect(received).toHaveLength(1)
    expect(onState).toHaveBeenCalledTimes(1)
    receiver.close()
  })

  it('stale revision after resume remains ignored', () => {
    const hub = createMemoryChannelHub()
    const channel = hub.createChannel()
    const received: PublicState[] = []
    const receiver = createPublicStateReceiver({
      onState: (s) => received.push(s),
      channel: hub.createChannel(),
      initialRevision: 9,
    })

    // Direct stale publish (as if an old Host answered late).
    channel.post(
      encodeEnvelope({
        type: 'public-state',
        revision: 8,
        sentAt: 1,
        payload: stateAt(8),
      }),
    )
    expect(received).toHaveLength(0)
    receiver.close()
  })

  it('requestState after close does nothing', () => {
    const hub = createMemoryChannelHub()
    const posts: unknown[] = []
    const channel = hub.createChannel()
    channel.subscribe((d) => posts.push(d))
    const receiver = createPublicStateReceiver({
      onState: () => undefined,
      channel: hub.createChannel(),
    })
    const before = posts.length
    receiver.close()
    receiver.requestState()
    expect(posts.length).toBe(before)
  })
})
