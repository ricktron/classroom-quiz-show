import { afterEach, describe, expect, it } from 'vitest'
import { createSonyBuzzKeepAliveLifecycle } from './sonyBuzzKeepAliveLifecycle'
import { createFakeHidDevice, createFakeWebHidTransport } from './webHidTransport'

describe('sonyBuzzKeepAliveLifecycle', () => {
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
  })

  function tickAll(): void {
    for (const item of [...intervals]) item.fn()
  }

  it('reports unsupported-api when transport unavailable', async () => {
    const transport = createFakeWebHidTransport({ available: false })
    const life = createSonyBuzzKeepAliveLifecycle({ transport, setIntervalFn, clearIntervalFn })
    expect(life.getSnapshot().health).toBe('unsupported-api')
    await life.connect()
    expect(life.getSnapshot().health).toBe('unsupported-api')
    life.dispose()
  })

  it('stays permission-required when request cancels', async () => {
    const transport = createFakeWebHidTransport({
      available: true,
      granted: [],
      requestResult: null,
    })
    const life = createSonyBuzzKeepAliveLifecycle({ transport, setIntervalFn, clearIntervalFn })
    await life.connect()
    expect(life.getSnapshot().health).toBe('permission-required')
    expect(intervals).toHaveLength(0)
    life.dispose()
  })

  it('fail-closes wrong device and descriptor mismatch', async () => {
    const wrong = createFakeHidDevice({ vendorId: 0x054c, productId: 0x0002 })
    const transport = createFakeWebHidTransport({ requestResult: wrong })
    const life = createSonyBuzzKeepAliveLifecycle({ transport, setIntervalFn, clearIntervalFn })
    await life.connect()
    expect(life.getSnapshot().health).toBe('failed')
    life.dispose()

    const badFrame = createFakeHidDevice({
      outputReports: [{ reportId: 0, totalBytes: 8 }],
    })
    const transport2 = createFakeWebHidTransport({ requestResult: badFrame })
    const life2 = createSonyBuzzKeepAliveLifecycle({
      transport: transport2,
      setIntervalFn,
      clearIntervalFn,
    })
    await life2.connect()
    expect(life2.getSnapshot().health).toBe('failed')
    expect(badFrame.sendCalls).toHaveLength(0)
    life2.dispose()
  })

  it('opens exact device, sends seven zeros, serializes, and disables cleanly', async () => {
    const device = createFakeHidDevice()
    const transport = createFakeWebHidTransport({ requestResult: device })
    const now = 1_000
    const life = createSonyBuzzKeepAliveLifecycle({
      transport,
      now: () => now,
      cadenceMs: 2000,
      setIntervalFn,
      clearIntervalFn,
    })
    await life.connect()
    expect(life.getSnapshot().health).toBe('healthy')
    expect(device.sendCalls[0]).toEqual({ reportId: 0, bytes: [0, 0, 0, 0, 0, 0, 0] })
    const firstSends = device.sendCalls.length
    tickAll()
    expect(device.sendCalls.length).toBe(firstSends + 1)
    life.disable()
    expect(life.getSnapshot().health).toBe('disabled')
    expect(intervals).toHaveLength(0)
    const afterDisable = device.sendCalls.length
    tickAll()
    expect(device.sendCalls.length).toBe(afterDisable)
    life.dispose()
  })

  it('converges already-open InvalidStateError', async () => {
    const device = createFakeHidDevice({ openBehavior: 'already-open', opened: false })
    const transport = createFakeWebHidTransport({ requestResult: device })
    const life = createSonyBuzzKeepAliveLifecycle({ transport, setIntervalFn, clearIntervalFn })
    await life.connect()
    expect(life.getSnapshot().health).toBe('healthy')
    expect(device.sendCalls.length).toBeGreaterThan(0)
    life.dispose()
  })

  it('stops timer and invalidates stale handle on disconnect', async () => {
    const device = createFakeHidDevice()
    const transport = createFakeWebHidTransport({ requestResult: device, granted: [device] })
    const life = createSonyBuzzKeepAliveLifecycle({ transport, setIntervalFn, clearIntervalFn })
    await life.connect()
    expect(intervals.length).toBe(1)
    transport.emitDisconnect(device)
    await Promise.resolve()
    expect(life.getSnapshot().health).toBe('disconnected')
    expect(intervals).toHaveLength(0)
    const sends = device.sendCalls.length
    tickAll()
    expect(device.sendCalls.length).toBe(sends)
    life.dispose()
  })

  it('reconnects via getDevices without depending on connect event', async () => {
    const device = createFakeHidDevice()
    const transport = createFakeWebHidTransport({ requestResult: device, granted: [device] })
    const life = createSonyBuzzKeepAliveLifecycle({ transport, setIntervalFn, clearIntervalFn })
    await life.connect()
    transport.emitDisconnect(device)
    await Promise.resolve()
    transport.setGranted([device])
    life.onVisibilityOrFocusReturn()
    await Promise.resolve()
    await Promise.resolve()
    expect(['healthy', 'recovering', 'connecting']).toContain(life.getSnapshot().health)
    // Explicit reconnect path
    await life.connect()
    expect(life.getSnapshot().health).toBe('healthy')
    life.dispose()
  })

  it('stale open after disable must not reactivate hardware', async () => {
    const gate = { resolve: undefined as undefined | (() => void) }
    const device = createFakeHidDevice()
    const slowOpen = {
      ...device,
      async open() {
        await new Promise<void>((resolve) => {
          gate.resolve = resolve
        })
        await device.open()
      },
    }
    const transport = createFakeWebHidTransport({ requestResult: slowOpen })
    const life = createSonyBuzzKeepAliveLifecycle({ transport, setIntervalFn, clearIntervalFn })
    const connecting = life.connect()
    await Promise.resolve()
    life.disable()
    gate.resolve?.()
    await connecting
    expect(life.getSnapshot().health).toBe('disabled')
    expect(intervals).toHaveLength(0)
    life.dispose()
  })

  it('old generation cannot replace newer generation', async () => {
    const deviceA = createFakeHidDevice({ productName: 'A' })
    const deviceB = createFakeHidDevice({ productName: 'B' })
    const gate = { resolve: undefined as undefined | (() => void) }
    let call = 0
    const slowA = {
      ...deviceA,
      async open() {
        await new Promise<void>((resolve) => {
          gate.resolve = resolve
        })
        await deviceA.open()
      },
    }
    const transport = createFakeWebHidTransport({
      requestResult: async () => {
        call += 1
        return call === 1 ? slowA : deviceB
      },
      granted: [],
    })
    const life = createSonyBuzzKeepAliveLifecycle({ transport, setIntervalFn, clearIntervalFn })
    const first = life.connect()
    await Promise.resolve()
    const second = life.connect()
    await Promise.resolve()
    gate.resolve?.()
    await first
    await second
    expect(life.getSnapshot().deviceLabel).toContain('B')
    expect(life.getSnapshot().health).toBe('healthy')
    life.dispose()
  })

  it('visibility return bumps reprime and attempts immediate send', async () => {
    const device = createFakeHidDevice()
    const transport = createFakeWebHidTransport({ requestResult: device })
    const life = createSonyBuzzKeepAliveLifecycle({ transport, setIntervalFn, clearIntervalFn })
    await life.connect()
    const tokenBefore = life.getReprimeToken()
    const sendsBefore = device.sendCalls.length
    life.onVisibilityOrFocusReturn()
    await Promise.resolve()
    expect(life.getReprimeToken()).toBeGreaterThan(tokenBefore)
    expect(device.sendCalls.length).toBeGreaterThan(sendsBefore)
    life.dispose()
  })

  it('does not overlap sendReport calls', async () => {
    let inFlight = 0
    let maxInFlight = 0
    const gate = { resolve: undefined as undefined | (() => void) }
    const device = createFakeHidDevice({ opened: true })
    const blocking = {
      ...device,
      async open() {
        device.setOpened(true)
      },
      async sendReport(reportId: number, data: BufferSource) {
        inFlight += 1
        maxInFlight = Math.max(maxInFlight, inFlight)
        await new Promise<void>((resolve) => {
          gate.resolve = resolve
        })
        try {
          return await device.sendReport(reportId, data)
        } finally {
          inFlight -= 1
        }
      },
    }
    const transport = createFakeWebHidTransport({ requestResult: blocking, granted: [blocking] })
    const life = createSonyBuzzKeepAliveLifecycle({ transport, setIntervalFn, clearIntervalFn })
    const connectPromise = life.connect()
    for (let i = 0; i < 10 && gate.resolve == null; i += 1) {
      await Promise.resolve()
    }
    expect(gate.resolve).toBeTypeOf('function')
    tickAll()
    tickAll()
    expect(maxInFlight).toBe(1)
    gate.resolve?.()
    await connectPromise
    expect(maxInFlight).toBe(1)
    life.dispose()
  })
})
