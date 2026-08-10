/**
 * Narrow ambient WebHID typings for Slice 21.
 *
 * Stock TypeScript DOM libs (5.9) do not include WebHID. This file is intentionally
 * minimal and CQS-local — not a general hardware library.
 */

interface HIDDeviceFilter {
  readonly vendorId?: number
  readonly productId?: number
  readonly usagePage?: number
  readonly usage?: number
}

interface HIDDeviceRequestOptions {
  readonly filters: HIDDeviceFilter[]
  readonly exclusionFilters?: HIDDeviceFilter[]
}

interface HIDReportItem {
  readonly reportSize?: number
  readonly reportCount?: number
  readonly isConstant?: boolean
  readonly isAbsolute?: boolean
  readonly usages?: number[]
}

interface HIDReportInfo {
  readonly reportId: number
  readonly items?: HIDReportItem[]
}

interface HIDCollectionInfo {
  readonly usagePage?: number
  readonly usage?: number
  readonly type?: number
  readonly inputReports?: HIDReportInfo[]
  readonly outputReports?: HIDReportInfo[]
  readonly featureReports?: HIDReportInfo[]
  readonly children?: HIDCollectionInfo[]
}

interface HIDDevice extends EventTarget {
  readonly opened: boolean
  readonly vendorId: number
  readonly productId: number
  readonly productName: string
  readonly collections: readonly HIDCollectionInfo[]
  open(): Promise<void>
  close(): Promise<void>
  forget?(): Promise<void>
  sendReport(reportId: number, data: BufferSource): Promise<void>
}

interface HIDConnectionEvent extends Event {
  readonly device: HIDDevice
}

interface HID extends EventTarget {
  getDevices(): Promise<HIDDevice[]>
  requestDevice(options: HIDDeviceRequestOptions): Promise<HIDDevice[]>
  onconnect: ((this: HID, ev: HIDConnectionEvent) => unknown) | null
  ondisconnect: ((this: HID, ev: HIDConnectionEvent) => unknown) | null
  addEventListener(
    type: 'connect' | 'disconnect',
    listener: (ev: HIDConnectionEvent) => void,
    options?: boolean | AddEventListenerOptions,
  ): void
  removeEventListener(
    type: 'connect' | 'disconnect',
    listener: (ev: HIDConnectionEvent) => void,
    options?: boolean | EventListenerOptions,
  ): void
}

interface Navigator {
  readonly hid?: HID
}
