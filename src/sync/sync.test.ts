import { describe, expect, it, vi } from 'vitest'
import { INITIAL_PUBLIC_STATE, type PublicState } from '../state/publicState'
import { createSessionStore } from '../state/store'
import {
  createMemoryChannelHub,
  createNoopChannel,
  isBroadcastChannelSupported,
} from './channel'
import { createPublicStateBroadcaster } from './broadcaster'
import { createPublicStateReceiver } from './receiver'
import { SYNC_CHANNEL_NAME, encodeEnvelope } from './protocol'

const AT = 1_000
function stateAt(revision: number): PublicState {
  return { ...INITIAL_PUBLIC_STATE, revision, headline: `rev ${revision}` }
}

describe('broadcaster ↔ receiver over an in-memory hub', () => {
  it('delivers a newer valid snapshot to the display', () => {
    const hub = createMemoryChannelHub()
    const received: PublicState[] = []
    createPublicStateReceiver({ onState: (s) => received.push(s), channel: hub.createChannel() })
    const broadcaster = createPublicStateBroadcaster({
      getSnapshot: () => stateAt(0),
      channel: hub.createChannel(),
    })

    broadcaster.publish(stateAt(1))
    expect(received).toHaveLength(1)
    expect(received[0].revision).toBe(1)
  })

  it('ignores a stale revision but accepts a newer one', () => {
    const hub = createMemoryChannelHub()
    const received: PublicState[] = []
    createPublicStateReceiver({
      onState: (s) => received.push(s),
      channel: hub.createChannel(),
      initialRevision: 5,
    })
    const broadcaster = createPublicStateBroadcaster({
      getSnapshot: () => stateAt(5),
      channel: hub.createChannel(),
    })

    broadcaster.publish(stateAt(4)) // stale
    broadcaster.publish(stateAt(5)) // duplicate of watermark
    expect(received).toHaveLength(0)

    broadcaster.publish(stateAt(6)) // newer
    expect(received).toHaveLength(1)
    expect(received[0].revision).toBe(6)
  })

  it('treats a duplicate revision as a safe no-op', () => {
    const hub = createMemoryChannelHub()
    const received: PublicState[] = []
    createPublicStateReceiver({ onState: (s) => received.push(s), channel: hub.createChannel() })
    const broadcaster = createPublicStateBroadcaster({
      getSnapshot: () => stateAt(0),
      channel: hub.createChannel(),
    })

    broadcaster.publish(stateAt(2))
    broadcaster.publish(stateAt(2)) // exact duplicate
    expect(received).toHaveLength(1)
  })

  it('answers request-state so a freshly-opened display catches up', () => {
    const hub = createMemoryChannelHub()
    const store = createSessionStore()
    store.dispatch({ type: 'INIT_SESSION', issuedAt: AT, sessionId: 's' })

    createPublicStateBroadcaster({
      getSnapshot: () => store.getPublicState(),
      channel: hub.createChannel(),
    })

    // Receiver mounts AFTER the host's last change; its start-up request-state
    // must pull the current snapshot without waiting for another change.
    const received: PublicState[] = []
    createPublicStateReceiver({ onState: (s) => received.push(s), channel: hub.createChannel() })

    expect(received).toHaveLength(1)
    expect(received[0].phase).toBe('ready')
  })

  it('a display cannot push state into the host (host ignores public-state)', () => {
    const hub = createMemoryChannelHub()
    const getSnapshot = vi.fn(() => stateAt(0))
    createPublicStateBroadcaster({ getSnapshot, channel: hub.createChannel() })

    // A malicious/confused display posts a public-state envelope.
    const rogue = hub.createChannel()
    rogue.post(encodeEnvelope({ type: 'public-state', revision: 99, payload: stateAt(99) }))

    // The host only republishes on request-state, never on public-state.
    expect(getSnapshot).not.toHaveBeenCalled()
  })

  it('only sanitized public state crosses the channel', () => {
    const hub = createMemoryChannelHub()
    const store = createSessionStore()
    store.dispatch({ type: 'INIT_SESSION', issuedAt: AT, sessionId: 'SECRET-ID' })
    store.dispatch({ type: 'SET_HOST_NOTE', issuedAt: AT, note: 'PRIVATE' })

    const raw: unknown[] = []
    const spy = hub.createChannel()
    spy.subscribe((d) => raw.push(d))

    const broadcaster = createPublicStateBroadcaster({
      getSnapshot: () => store.getPublicState(),
      channel: hub.createChannel(),
    })
    broadcaster.publish(store.getPublicState())

    const serialized = JSON.stringify(raw)
    expect(serialized).not.toContain('SECRET-ID')
    expect(serialized).not.toContain('PRIVATE')
  })
})

describe('malformed transport input fails closed', () => {
  it('ignores garbage messages without calling onState or throwing', () => {
    const hub = createMemoryChannelHub()
    const onState = vi.fn()
    createPublicStateReceiver({ onState, channel: hub.createChannel() })

    const rogue = hub.createChannel()
    expect(() => {
      rogue.post('not an envelope')
      rogue.post({ protocol: 'evil', schemaVersion: 1, message: {} })
      rogue.post({ nope: true })
    }).not.toThrow()
    expect(onState).not.toHaveBeenCalled()
  })
})

describe('unsupported / no-op transport degrades safely', () => {
  it('a no-op channel never delivers and closes cleanly', () => {
    const onState = vi.fn()
    const receiver = createPublicStateReceiver({ onState, channel: createNoopChannel() })
    const broadcaster = createPublicStateBroadcaster({
      getSnapshot: () => stateAt(0),
      channel: createNoopChannel(),
    })
    broadcaster.publish(stateAt(1))
    expect(onState).not.toHaveBeenCalled()
    expect(() => {
      receiver.close()
      broadcaster.close()
    }).not.toThrow()
  })

  it('reports BroadcastChannel support as a boolean', () => {
    expect(typeof isBroadcastChannelSupported()).toBe('boolean')
  })
})

describe('cleanup', () => {
  it('a closed receiver stops receiving further messages', () => {
    const hub = createMemoryChannelHub()
    const received: PublicState[] = []
    const receiver = createPublicStateReceiver({
      onState: (s) => received.push(s),
      channel: hub.createChannel(),
    })
    const broadcaster = createPublicStateBroadcaster({
      getSnapshot: () => stateAt(0),
      channel: hub.createChannel(),
    })

    broadcaster.publish(stateAt(1))
    expect(received).toHaveLength(1)

    receiver.close()
    broadcaster.publish(stateAt(2))
    expect(received).toHaveLength(1) // no delivery after close
  })

  it('exposes a stable channel name constant', () => {
    expect(SYNC_CHANNEL_NAME).toBe('classroom-quiz-show:sync')
  })
})
