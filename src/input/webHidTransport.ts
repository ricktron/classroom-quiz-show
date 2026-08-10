import {
  SONY_BUZZ_SUPPORTED_PRODUCT_ID,
  SONY_BUZZ_SUPPORTED_VENDOR_ID,
  validateSupportedWbuzzOutputFraming,
  type SonyBuzzOutputFramingResult,
  type SonyBuzzOutputReportCandidate,
} from './sonyBuzzSupportedProfile'

/**
 * Narrow injectable WebHID boundary for Slice 21.
 *
 * Browser HID types must not leak into React or persistence — consumers use
 * {@link CqsHidDeviceHandle} only.
 */

export interface CqsHidDeviceHandle {
  readonly vendorId: number
  readonly productId: number
  readonly productName: string
  readonly opened: boolean
  open(): Promise<void>
  close(): Promise<void>
  sendReport(reportId: number, data: BufferSource): Promise<void>
  outputReportCandidates(): readonly SonyBuzzOutputReportCandidate[]
}

export interface WebHidTransport {
  readonly available: boolean
  getGrantedExactDevices(): Promise<readonly CqsHidDeviceHandle[]>
  requestExactDevice(): Promise<CqsHidDeviceHandle | null>
  /** Subscribe to disconnect for exact Wbuzz; returns unsubscribe. */
  onExactDisconnect(listener: (device: CqsHidDeviceHandle) => void): () => void
}

export function isWebHidApiAvailable(nav: Navigator = navigator): boolean {
  return typeof nav === 'object' && nav !== null && 'hid' in nav && nav.hid != null
}

function totalReportBytes(report: HIDReportInfo): number {
  const items = report.items ?? []
  const bits = items.reduce(
    (sum, item) => sum + (item.reportSize ?? 0) * (item.reportCount ?? 0),
    0,
  )
  return Math.ceil(bits / 8)
}

function wrapDevice(device: HIDDevice): CqsHidDeviceHandle {
  return {
    get vendorId() {
      return device.vendorId
    },
    get productId() {
      return device.productId
    },
    get productName() {
      return device.productName
    },
    get opened() {
      return device.opened
    },
    open: () => device.open(),
    close: () => device.close(),
    sendReport: (reportId, data) => device.sendReport(reportId, data),
    outputReportCandidates: () => {
      const out: SonyBuzzOutputReportCandidate[] = []
      for (const collection of device.collections ?? []) {
        for (const report of collection.outputReports ?? []) {
          out.push({ reportId: report.reportId, totalBytes: totalReportBytes(report) })
        }
      }
      return out
    },
  }
}

function isExactWbuzz(device: HIDDevice): boolean {
  return (
    device.vendorId === SONY_BUZZ_SUPPORTED_VENDOR_ID &&
    device.productId === SONY_BUZZ_SUPPORTED_PRODUCT_ID
  )
}

export const EXACT_WBUZZ_HID_FILTER = Object.freeze({
  vendorId: SONY_BUZZ_SUPPORTED_VENDOR_ID,
  productId: SONY_BUZZ_SUPPORTED_PRODUCT_ID,
})

export function browserWebHidTransport(nav: Navigator = navigator): WebHidTransport {
  const hid = nav.hid
  if (!hid) {
    return {
      available: false,
      async getGrantedExactDevices() {
        return []
      },
      async requestExactDevice() {
        return null
      },
      onExactDisconnect() {
        return () => {}
      },
    }
  }

  return {
    available: true,
    async getGrantedExactDevices() {
      const devices = await hid.getDevices()
      return devices.filter(isExactWbuzz).map(wrapDevice)
    },
    async requestExactDevice() {
      const devices = await hid.requestDevice({ filters: [EXACT_WBUZZ_HID_FILTER] })
      const match = devices.find(isExactWbuzz)
      return match ? wrapDevice(match) : null
    },
    onExactDisconnect(listener) {
      const handler = (event: HIDConnectionEvent) => {
        if (isExactWbuzz(event.device)) listener(wrapDevice(event.device))
      }
      hid.addEventListener('disconnect', handler)
      return () => hid.removeEventListener('disconnect', handler)
    },
  }
}

export function inspectExactDeviceFraming(device: CqsHidDeviceHandle): SonyBuzzOutputFramingResult {
  return validateSupportedWbuzzOutputFraming(device.outputReportCandidates())
}

/** Test fake factory. */
export function createFakeWebHidTransport(options: {
  readonly available?: boolean
  readonly granted?: CqsHidDeviceHandle[]
  readonly requestResult?: CqsHidDeviceHandle | null | (() => Promise<CqsHidDeviceHandle | null>)
}): WebHidTransport & {
  emitDisconnect(device: CqsHidDeviceHandle): void
  setGranted(devices: CqsHidDeviceHandle[]): void
} {
  let granted = [...(options.granted ?? [])]
  const disconnectListeners = new Set<(device: CqsHidDeviceHandle) => void>()
  return {
    available: options.available ?? true,
    async getGrantedExactDevices() {
      return [...granted]
    },
    async requestExactDevice() {
      if (typeof options.requestResult === 'function') return options.requestResult()
      if (options.requestResult === undefined) return granted[0] ?? null
      return options.requestResult
    },
    onExactDisconnect(listener) {
      disconnectListeners.add(listener)
      return () => {
        disconnectListeners.delete(listener)
      }
    },
    emitDisconnect(device) {
      for (const listener of disconnectListeners) listener(device)
    },
    setGranted(devices) {
      granted = [...devices]
    },
  }
}

export function createFakeHidDevice(
  options: {
    readonly vendorId?: number
    readonly productId?: number
    readonly productName?: string
    readonly opened?: boolean
    readonly outputReports?: readonly SonyBuzzOutputReportCandidate[]
    readonly openBehavior?: 'ok' | 'already-open' | 'already-open-but-closed' | 'fail'
    readonly sendBehavior?: 'ok' | 'fail'
  } = {},
): CqsHidDeviceHandle & {
  readonly sendCalls: { reportId: number; bytes: number[] }[]
  setOpened(opened: boolean): void
} {
  let opened = options.opened ?? false
  const sendCalls: { reportId: number; bytes: number[] }[] = []
  const outputReports = options.outputReports ?? [{ reportId: 0, totalBytes: 7 }]
  return {
    vendorId: options.vendorId ?? SONY_BUZZ_SUPPORTED_VENDOR_ID,
    productId: options.productId ?? SONY_BUZZ_SUPPORTED_PRODUCT_ID,
    productName: options.productName ?? 'Wbuzz',
    get opened() {
      return opened
    },
    setOpened(next) {
      opened = next
    },
    sendCalls,
    async open() {
      if (options.openBehavior === 'fail') throw new Error('open failed')
      if (options.openBehavior === 'already-open-but-closed') {
        // Surface an already-open-like InvalidStateError while remaining closed.
        opened = false
        const err = new Error('The device is already open.')
        err.name = 'InvalidStateError'
        throw err
      }
      if (options.openBehavior === 'already-open' || opened) {
        opened = true
        const err = new Error('The device is already open.')
        err.name = 'InvalidStateError'
        throw err
      }
      opened = true
    },
    async close() {
      opened = false
    },
    async sendReport(reportId, data) {
      if (options.sendBehavior === 'fail') throw new Error('send failed')
      if (!opened) {
        const err = new Error('Device is not open.')
        err.name = 'InvalidStateError'
        throw err
      }
      const view =
        data instanceof ArrayBuffer
          ? new Uint8Array(data)
          : new Uint8Array(data as unknown as ArrayBufferLike)
      sendCalls.push({ reportId, bytes: [...view] })
    },
    outputReportCandidates() {
      return outputReports
    },
  }
}
