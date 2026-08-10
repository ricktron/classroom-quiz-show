import { describe, expect, it } from 'vitest'
import {
  createFakeHidDevice,
  createFakeWebHidTransport,
  EXACT_WBUZZ_HID_FILTER,
  inspectExactDeviceFraming,
} from './webHidTransport'

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
