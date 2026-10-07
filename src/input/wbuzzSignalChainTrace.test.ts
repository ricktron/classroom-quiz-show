import { afterEach, describe, expect, it } from 'vitest'
import {
  clearWbuzzSignalTrace,
  createWbuzzSignalChainTrace,
  formatWbuzzSignalTraceJson,
  getWbuzzSignalTraceSnapshot,
  recordWbuzzSignalEvent,
  wipeWbuzzSignalTraceForTests,
} from './wbuzzSignalChainTrace'
import { createSonyBuzzKeepAliveLifecycle } from './sonyBuzzKeepAliveLifecycle'
import { createFakeHidDevice, createFakeWebHidTransport } from './webHidTransport'

describe('wbuzzSignalChainTrace', () => {
  afterEach(() => {
    wipeWbuzzSignalTraceForTests()
  })

  it('bounds memory and preserves monotonic seq order', () => {
    const trace = createWbuzzSignalChainTrace({
      capacity: 3,
      sourceSha: 'abc',
      clock: { wallClockMs: () => 1000, monotonicMs: () => 10 },
    })
    trace.record('restore_attempted', 'info')
    trace.record('exact_device_found', 'ok')
    trace.record('hid_open_succeeded', 'ok')
    trace.record('keepalive_started', 'ok')
    const kinds = trace.getSnapshot().events.map((e) => e.kind)
    expect(kinds).toEqual([
      'exact_device_found',
      'hid_open_succeeded',
      'keepalive_started',
    ])
    expect(trace.getSnapshot().sourceSha).toBe('abc')
  })

  it('clear records a marker without requiring functional side effects', () => {
    recordWbuzzSignalEvent('profile_hook_mounted', 'info')
    clearWbuzzSignalTrace()
    const kinds = getWbuzzSignalTraceSnapshot().events.map((e) => e.kind)
    expect(kinds).toEqual(['trace_cleared'])
    expect(formatWbuzzSignalTraceJson()).toContain('"kind": "trace_cleared"')
  })
})

describe('lifecycle diagnostic order (Q7-DIAG-1)', () => {
  const intervals: Array<{ id: number; fn: () => void; ms: number }> = []
  let nextId = 1
  const setIntervalFn = ((fn: () => void, ms: number) => {
    const id = nextId++
    intervals.push({ id, fn, ms })
    return id as unknown as ReturnType<typeof setInterval>
  }) as typeof setInterval
  const clearIntervalFn = ((id: ReturnType<typeof setInterval>) => {
    const idx = intervals.findIndex((item) => item.id === (id as unknown as number))
    if (idx >= 0) intervals.splice(idx, 1)
  }) as typeof clearInterval

  afterEach(() => {
    intervals.length = 0
    nextId = 1
    wipeWbuzzSignalTraceForTests()
  })

  it('emits restore → device → framing → open → keepalive → first send success', async () => {
    const device = createFakeHidDevice()
    const transport = createFakeWebHidTransport({ granted: [device] })
    const trace = createWbuzzSignalChainTrace({ sourceSha: 'test-sha' })
    const life = createSonyBuzzKeepAliveLifecycle({
      transport,
      setIntervalFn,
      clearIntervalFn,
      diagnosticTrace: trace,
    })
    await life.tryRestoreGranted()
    const kinds = trace.getSnapshot().events.map((e) => e.kind)
    expect(kinds).toEqual([
      'restore_attempted',
      'exact_device_found',
      'framing_validated',
      'hid_open_attempted',
      'hid_open_succeeded',
      'keepalive_started',
      'output_report_first_attempted',
      'output_report_first_succeeded',
    ])
    expect(life.getSnapshot().health).toBe('healthy')
    expect(device.sendCalls[0]?.bytes).toEqual([0, 0, 0, 0, 0, 0, 0])
    life.dispose()
  })

  it('distinguishes first-send failure from later framing rejection', async () => {
    const failing = createFakeHidDevice({ sendBehavior: 'fail' })
    const transport = createFakeWebHidTransport({ requestResult: failing })
    const trace = createWbuzzSignalChainTrace({ sourceSha: 'test-sha' })
    const life = createSonyBuzzKeepAliveLifecycle({
      transport,
      setIntervalFn,
      clearIntervalFn,
      diagnosticTrace: trace,
    })
    await life.connect()
    const kinds = trace.getSnapshot().events.map((e) => e.kind)
    expect(kinds).toContain('connect_invoked')
    expect(kinds).toContain('request_device_invoked')
    expect(kinds).toContain('output_report_first_failed')
    expect(kinds).not.toContain('output_report_first_succeeded')

    const badFrame = createFakeHidDevice({
      outputReports: [{ reportId: 0, totalBytes: 8 }],
    })
    const trace2 = createWbuzzSignalChainTrace({ sourceSha: 'test-sha' })
    const life2 = createSonyBuzzKeepAliveLifecycle({
      transport: createFakeWebHidTransport({ requestResult: badFrame }),
      setIntervalFn,
      clearIntervalFn,
      diagnosticTrace: trace2,
    })
    await life2.connect()
    expect(trace2.getSnapshot().events.map((e) => e.kind)).toContain('framing_rejected')
    expect(badFrame.sendCalls).toHaveLength(0)
    life.dispose()
    life2.dispose()
  })

  it('clearing the trace does not disable keep-alive', async () => {
    const device = createFakeHidDevice()
    const transport = createFakeWebHidTransport({ requestResult: device })
    const trace = createWbuzzSignalChainTrace({ sourceSha: 'test-sha' })
    const life = createSonyBuzzKeepAliveLifecycle({
      transport,
      setIntervalFn,
      clearIntervalFn,
      diagnosticTrace: trace,
    })
    await life.connect()
    expect(life.getSnapshot().health).toBe('healthy')
    const sendsBefore = life.getSnapshot().sends
    trace.clear()
    expect(trace.getSnapshot().events.map((e) => e.kind)).toEqual(['trace_cleared'])
    expect(life.getSnapshot().health).toBe('healthy')
    expect(life.getSnapshot().sends).toBe(sendsBefore)
    life.dispose()
  })

  it('null diagnosticTrace records nothing on the default buffer', async () => {
    wipeWbuzzSignalTraceForTests()
    const device = createFakeHidDevice()
    const life = createSonyBuzzKeepAliveLifecycle({
      transport: createFakeWebHidTransport({ requestResult: device }),
      setIntervalFn,
      clearIntervalFn,
      diagnosticTrace: null,
    })
    await life.connect()
    expect(getWbuzzSignalTraceSnapshot().events).toHaveLength(0)
    expect(life.getSnapshot().health).toBe('healthy')
    life.dispose()
  })
})
