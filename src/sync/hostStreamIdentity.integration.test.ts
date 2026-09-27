import { describe, expect, it } from 'vitest'
import { INITIAL_PUBLIC_STATE, type PublicState } from '../state/publicState'
import { createMemoryChannelHub } from './channel'
import { createPublicStateBroadcaster } from './broadcaster'
import { createPublicStateReceiver } from './receiver'
import { canPublishHostPublicState } from '../host/writeAuthority'

const AT = 1_700_000_000_000

function stateAt(revision: number): PublicState {
  return { ...INITIAL_PUBLIC_STATE, revision, headline: `rev ${revision}` }
}

describe('Host stream identity over sync transport', () => {
  it('accepts a new Host lifetime after a higher revision on the prior stream', () => {
    const hub = createMemoryChannelHub()
    const received: PublicState[] = []
    createPublicStateReceiver({
      onState: (s) => received.push(s),
      channel: hub.createChannel(),
      initialHostStreamId: 'stream-1',
      initialRevision: 500,
    })

    const hostA = createPublicStateBroadcaster({
      getSnapshot: () => stateAt(500),
      channel: hub.createChannel(),
      hostStreamId: 'stream-1',
    })
    hostA.publish(stateAt(499))
    expect(received).toHaveLength(0)

    const hostB = createPublicStateBroadcaster({
      getSnapshot: () => stateAt(1),
      channel: hub.createChannel(),
      hostStreamId: 'stream-2',
    })
    hostB.publish(stateAt(1))
    expect(received).toHaveLength(1)
    expect(received[0]?.revision).toBe(1)

    hostB.publish(stateAt(2))
    expect(received).toHaveLength(2)
    expect(received[1]?.revision).toBe(2)

    hostA.publish(stateAt(501))
    expect(received).toHaveLength(2)

    hostB.close()
    hostA.close()
  })

  it('recovers via request-state from a new Host stream after a prior high revision', () => {
    const hub = createMemoryChannelHub()
    const received: PublicState[] = []

    createPublicStateBroadcaster({
      getSnapshot: () => stateAt(3),
      channel: hub.createChannel(),
      hostStreamId: 'stream-new',
      clock: { now: () => AT },
    })

    createPublicStateReceiver({
      onState: (s) => received.push(s),
      channel: hub.createChannel(),
      initialHostStreamId: 'stream-old',
      initialRevision: 500,
    })

    expect(received.map((s) => s.revision)).toEqual([3])
  })

  it('documents publish gating: unknown + durable storage does not publish', () => {
    expect(
      canPublishHostPublicState({
        bootPhase: 'ready',
        leadership: 'unknown',
        durabilityStatus: 'idle',
      }),
    ).toBe(false)
    expect(
      canPublishHostPublicState({
        bootPhase: 'ready',
        leadership: 'leader',
        durabilityStatus: 'idle',
      }),
    ).toBe(true)
  })
})
