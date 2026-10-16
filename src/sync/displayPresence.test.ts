import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createMemoryChannelHub } from './channel'
import {
  DISPLAY_PRESENCE_PROBE_INTERVAL_MS,
  attachDisplayPresenceResponder,
  createDisplayPresenceTracker,
} from './displayPresence'
import { decodeEnvelope, encodeEnvelope, SYNC_PROTOCOL, SYNC_SCHEMA_VERSION } from './protocol'

function fakeLifecycle() {
  const target = new EventTarget()
  return {
    target,
    fire: (type: 'pagehide' | 'pageshow') => target.dispatchEvent(new Event(type)),
  }
}

describe('display presence protocol', () => {
  it('round-trips a probe and a presence report', () => {
    expect(decodeEnvelope(encodeEnvelope({ type: 'display-presence-probe' }))).toEqual({
      ok: true,
      message: { type: 'display-presence-probe' },
    })
    expect(
      decodeEnvelope(encodeEnvelope({ type: 'display-presence', displayId: 'd-1', live: false })),
    ).toEqual({ ok: true, message: { type: 'display-presence', displayId: 'd-1', live: false } })
  })

  it('fails closed on a malformed presence report and never carries extra fields', () => {
    const env = (message: unknown) => ({
      protocol: SYNC_PROTOCOL,
      schemaVersion: SYNC_SCHEMA_VERSION,
      message,
    })
    expect(decodeEnvelope(env({ type: 'display-presence', displayId: '', live: true }))).toEqual({
      ok: false,
      reason: 'malformed-payload',
    })
    expect(
      decodeEnvelope(env({ type: 'display-presence', displayId: 'x'.repeat(129), live: true })),
    ).toEqual({ ok: false, reason: 'malformed-payload' })
    expect(decodeEnvelope(env({ type: 'display-presence', displayId: 'd', live: 'yes' }))).toEqual({
      ok: false,
      reason: 'malformed-payload',
    })
    const decoded = decodeEnvelope(
      env({ type: 'display-presence', displayId: 'd', live: true, payload: { secret: 1 } }),
    )
    expect(decoded).toEqual({
      ok: true,
      message: { type: 'display-presence', displayId: 'd', live: true },
    })
  })
})

describe('display presence tracker + responder', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(1_000_000)
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('reports an already-open Display as live once a (reloaded) Host starts probing', () => {
    const hub = createMemoryChannelHub()
    const lifecycle = fakeLifecycle()
    const detach = attachDisplayPresenceResponder({
      channel: hub.createChannel(),
      createDisplayId: () => 'display-a',
      lifecycleTarget: lifecycle.target,
    })
    const changes: boolean[] = []
    // The Host starts AFTER the Display: only the probe can reveal it.
    const tracker = createDisplayPresenceTracker({
      channel: hub.createChannel(),
      onChange: (live) => changes.push(live),
    })
    expect(tracker.isLive()).toBe(true)
    expect(changes).toEqual([true])

    // Stays live across many probe intervals while the Display keeps answering.
    vi.advanceTimersByTime(DISPLAY_PRESENCE_PROBE_INTERVAL_MS * 10)
    expect(tracker.isLive()).toBe(true)
    expect(changes).toEqual([true])

    tracker.close()
    detach()
  })

  it('reports not live at once when the Display hides (closes)', () => {
    const hub = createMemoryChannelHub()
    const lifecycle = fakeLifecycle()
    attachDisplayPresenceResponder({
      channel: hub.createChannel(),
      createDisplayId: () => 'display-a',
      lifecycleTarget: lifecycle.target,
    })
    const tracker = createDisplayPresenceTracker({ channel: hub.createChannel(), onChange: () => {} })
    expect(tracker.isLive()).toBe(true)
    lifecycle.fire('pagehide')
    expect(tracker.isLive()).toBe(false)
    // A back/forward-cache restore of the same Display is live again.
    lifecycle.fire('pageshow')
    expect(tracker.isLive()).toBe(true)
    tracker.close()
  })

  it('reports not live within two probe intervals when a Display vanishes silently', () => {
    const hub = createMemoryChannelHub()
    const displayChannel = hub.createChannel()
    attachDisplayPresenceResponder({
      channel: displayChannel,
      createDisplayId: () => 'display-a',
      lifecycleTarget: null,
    })
    const tracker = createDisplayPresenceTracker({ channel: hub.createChannel(), onChange: () => {} })
    vi.advanceTimersByTime(DISPLAY_PRESENCE_PROBE_INTERVAL_MS)
    expect(tracker.isLive()).toBe(true)
    // Crash: no pagehide, the channel just stops answering.
    displayChannel.close()
    vi.advanceTimersByTime(DISPLAY_PRESENCE_PROBE_INTERVAL_MS * 2)
    expect(tracker.isLive()).toBe(false)
    tracker.close()
  })

  it('does not flap when the Host timer fires late (throttled Host)', () => {
    const hub = createMemoryChannelHub()
    attachDisplayPresenceResponder({
      channel: hub.createChannel(),
      createDisplayId: () => 'display-a',
      lifecycleTarget: null,
    })
    const changes: boolean[] = []
    const tracker = createDisplayPresenceTracker({
      channel: hub.createChannel(),
      onChange: (live) => changes.push(live),
    })
    // Wall clock jumps far ahead between probes (background throttling).
    vi.setSystemTime(Date.now() + 60_000)
    vi.advanceTimersByTime(DISPLAY_PRESENCE_PROBE_INTERVAL_MS)
    vi.setSystemTime(Date.now() + 60_000)
    vi.advanceTimersByTime(DISPLAY_PRESENCE_PROBE_INTERVAL_MS)
    expect(tracker.isLive()).toBe(true)
    expect(changes).toEqual([true])
    tracker.close()
  })

  it('stays live while any one of several Displays is live', () => {
    const hub = createMemoryChannelHub()
    const a = fakeLifecycle()
    const b = fakeLifecycle()
    attachDisplayPresenceResponder({
      channel: hub.createChannel(),
      createDisplayId: () => 'display-a',
      lifecycleTarget: a.target,
    })
    attachDisplayPresenceResponder({
      channel: hub.createChannel(),
      createDisplayId: () => 'display-b',
      lifecycleTarget: b.target,
    })
    const tracker = createDisplayPresenceTracker({ channel: hub.createChannel(), onChange: () => {} })
    a.fire('pagehide')
    expect(tracker.isLive()).toBe(true)
    b.fire('pagehide')
    expect(tracker.isLive()).toBe(false)
    tracker.close()
  })

  it('a detached responder reports not live and stops answering', () => {
    const hub = createMemoryChannelHub()
    const detach = attachDisplayPresenceResponder({
      channel: hub.createChannel(),
      createDisplayId: () => 'display-a',
      lifecycleTarget: null,
    })
    const tracker = createDisplayPresenceTracker({ channel: hub.createChannel(), onChange: () => {} })
    expect(tracker.isLive()).toBe(true)
    detach()
    expect(tracker.isLive()).toBe(false)
    vi.advanceTimersByTime(DISPLAY_PRESENCE_PROBE_INTERVAL_MS * 3)
    expect(tracker.isLive()).toBe(false)
    tracker.close()
  })

  it('the presence responder never posts anything but presence', () => {
    const hub = createMemoryChannelHub()
    const spy = hub.createChannel()
    const seen: unknown[] = []
    spy.subscribe((data) => seen.push(data))
    const detach = attachDisplayPresenceResponder({
      channel: hub.createChannel(),
      createDisplayId: () => 'display-a',
      lifecycleTarget: null,
    })
    spy.post(encodeEnvelope({ type: 'display-presence-probe' }))
    spy.post(encodeEnvelope({ type: 'request-state' }))
    detach()
    const types = seen.map((raw) => {
      const decoded = decodeEnvelope(raw)
      return decoded.ok ? decoded.message : decoded.reason
    })
    expect(types).toEqual([
      { type: 'display-presence', displayId: 'display-a', live: true },
      { type: 'display-presence', displayId: 'display-a', live: true },
      { type: 'display-presence', displayId: 'display-a', live: false },
    ])
  })
})
