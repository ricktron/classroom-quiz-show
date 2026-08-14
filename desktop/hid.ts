import { DESKTOP_SONY_PRODUCT_ID, DESKTOP_SONY_VENDOR_ID } from './constants'
import { isCqsAppOrigin } from './urls'

export interface DesktopHidDeviceRef {
  readonly deviceId: string
  readonly vendorId: number
  readonly productId: number
}

export function isExactSupportedSonyHid(vendorId: number, productId: number): boolean {
  return vendorId === DESKTOP_SONY_VENDOR_ID && productId === DESKTOP_SONY_PRODUCT_ID
}

export function selectSonyHidDeviceId(
  deviceList: ReadonlyArray<DesktopHidDeviceRef>,
): string | undefined {
  return deviceList.find((device) =>
    isExactSupportedSonyHid(device.vendorId, device.productId),
  )?.deviceId
}

export function shouldGrantHidDevicePermission(details: {
  readonly origin: string
  readonly deviceType: string
  readonly device: { readonly vendorId: number; readonly productId: number }
}): boolean {
  if (details.deviceType !== 'hid') return false
  if (!isCqsAppOrigin(details.origin)) return false
  return isExactSupportedSonyHid(details.device.vendorId, details.device.productId)
}

export function shouldAllowHidPermissionCheck(requestingOrigin: string): boolean {
  return isCqsAppOrigin(requestingOrigin)
}
