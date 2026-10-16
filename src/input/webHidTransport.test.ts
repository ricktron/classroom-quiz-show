import { describe, expect, it } from 'vitest'
import {
  browserWebHidTransport,
  createFakeHidDevice,
  createFakeWebHidTransport,
  EXACT_WBUZZ_HID_FILTER,
  inspectExactDeviceFraming,
} from './webHidTransport'

/** Minimal HIDDevice stand-in: only the fields browserWebHidTransport reads. */
function fakeRawHidDevice(vendorId: number, productId: number, productName: string): HIDDevice {
  return {
    vendorId,
    productId,
    productName,
    opened: false,
    collections: [],
    open: async () => {},
    close: async () => {},
    sendReport: async () => {},
  } as unknown as HIDDevice
}

/** Fake navigator.hid whose browser-side filtering is deliberately absent. */
function fakeNavigator(options: {
  readonly granted: readonly HIDDevice[]
  readonly requested: readonly HIDDevice[]
}) {
  const disconnectHandlers = new Set<(event: HIDConnectionEvent) => void>()
  const hid = {
    getDevices: async () => [...options.granted],
    requestDevice: async () => [...options.requested],
    addEventListener: (type: string, handler: (event: HIDConnectionEvent) => void) => {
      if (type === 'disconnect') disconnectHandlers.add(handler)
    },
    removeEventListener: (type: string, handler: (event: HIDConnectionEvent) => void) => {
      if (type === 'disconnect') disconnectHandlers.delete(handler)
    },
  }
  return {
    nav: { hid } as unknown as Navigator,
    emitDisconnect(device: HIDDevice) {
      for (const handler of disconnectHandlers) handler({ device } as HIDConnectionEvent)
    },
  }
}

describe('browserWebHidTransport exact VID/PID gate', () => {
  const wrongPidSony = fakeRawHidDevice(0x054c, 0x0268, 'Sony wrong-PID device')
  const exactWbuzz = fakeRawHidDevice(0x054c, 0x1000, 'Wbuzz')

  it('getGrantedExactDevices excludes a granted Sony device with the wrong PID', async () => {
    const { nav } = fakeNavigator({ granted: [wrongPidSony, exactWbuzz], requested: [] })
    const granted = await browserWebHidTransport(nav).getGrantedExactDevices()
    expect(granted.map((d) => [d.vendorId, d.productId])).toEqual([[0x054c, 0x1000]])
  })

  it('requestExactDevice returns null when the picker yields only a wrong-PID Sony device', async () => {
    const { nav } = fakeNavigator({ granted: [], requested: [wrongPidSony] })
    expect(await browserWebHidTransport(nav).requestExactDevice()).toBeNull()
  })

  it('onExactDisconnect ignores a wrong-PID Sony device and fires for the exact device', () => {
    const { nav, emitDisconnect } = fakeNavigator({ granted: [], requested: [] })
    const seen: [number, number][] = []
    const stop = browserWebHidTransport(nav).onExactDisconnect((d) => {
      seen.push([d.vendorId, d.productId])
    })
    emitDisconnect(wrongPidSony)
    expect(seen).toEqual([])
    emitDisconnect(exactWbuzz)
    expect(seen).toEqual([[0x054c, 0x1000]])
    stop()
  })
})

describe('webHidTransport', () => {
  it('uses exact VID/PID filter only', () => {
    expect(EXACT_WBUZZ_HID_FILTER).toEqual({ vendorId: 0x054c, productId: 0x1000 })
  })

  it('fake transport supports grant/request/disconnect without connect event', async () => {
    const device = createFakeHidDevice()
    const transport = createFakeWebHidTransport({ granted: [], requestResult: device })
    expect(await transport.getGrantedExactDevices()).toEqual([])
    expect(await transport.requestExactDevice()).toBe(device)
    transport.setGranted([device])
    expect(await transport.getGrantedExactDevices()).toHaveLength(1)
    let disconnected = false
    const stop = transport.onExactDisconnect(() => {
      disconnected = true
    })
    transport.emitDisconnect(device)
    expect(disconnected).toBe(true)
    stop()
  })

  it('inspects framing fail-closed', () => {
    const ok = createFakeHidDevice()
    expect(inspectExactDeviceFraming(ok)).toMatchObject({ ok: true })
    const bad = createFakeHidDevice({ outputReports: [{ reportId: 0, totalBytes: 5 }] })
    expect(inspectExactDeviceFraming(bad)).toMatchObject({ ok: false })
  })
})
