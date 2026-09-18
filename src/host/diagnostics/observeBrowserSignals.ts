import { isGamepadApiAvailable } from '../../input/gamepadSource'
import { isWebHidApiAvailable } from '../../input/webHidTransport'
import type { DiagnosticAvailability, DiagnosticDisplayWindowStatus } from './types'

export interface BrowserDiagnosticSignals {
  readonly platform: string
  readonly viewportWidth: number
  readonly viewportHeight: number
  readonly screenWidth: number
  readonly screenHeight: number
  readonly devicePixelRatio: number
  readonly gamepadApi: DiagnosticAvailability
  readonly webHidApi: DiagnosticAvailability
}

/**
 * Non-interactive browser observations for diagnostics.
 *
 * Must not request HID/Gamepad/microphone permissions, open file pickers, or
 * perform network access.
 */
export function observeBrowserDiagnosticSignals(
  win: Window | null = typeof window === 'undefined' ? null : window,
  nav: Navigator | null = typeof navigator === 'undefined' ? null : navigator,
): BrowserDiagnosticSignals {
  if (win === null) {
    return {
      platform: 'unknown',
      viewportWidth: 0,
      viewportHeight: 0,
      screenWidth: 0,
      screenHeight: 0,
      devicePixelRatio: 1,
      gamepadApi: 'unavailable',
      webHidApi: 'unavailable',
    }
  }

  const platform = readPlatform(nav)
  const viewportWidth = Math.max(0, Math.trunc(win.innerWidth || 0))
  const viewportHeight = Math.max(0, Math.trunc(win.innerHeight || 0))
  const screenWidth = Math.max(0, Math.trunc(win.screen?.width || 0))
  const screenHeight = Math.max(0, Math.trunc(win.screen?.height || 0))
  const rawDpr = win.devicePixelRatio
  const devicePixelRatio = Number.isFinite(rawDpr) && rawDpr > 0 ? rawDpr : 1

  return {
    platform,
    viewportWidth,
    viewportHeight,
    screenWidth,
    screenHeight,
    devicePixelRatio,
    gamepadApi: isGamepadApiAvailable(nav) ? 'available' : 'unavailable',
    webHidApi: nav !== null && isWebHidApiAvailable(nav) ? 'available' : 'unavailable',
  }
}

export function displayWindowStatus(
  handle: Window | null | undefined,
): DiagnosticDisplayWindowStatus {
  if (!handle) return 'unknown'
  try {
    return handle.closed ? 'closed' : 'open'
  } catch {
    return 'unknown'
  }
}

function readPlatform(nav: Navigator | null): string {
  if (nav === null) return 'unknown'
  const uaData = (nav as Navigator & { userAgentData?: { platform?: string } }).userAgentData
  if (uaData && typeof uaData.platform === 'string' && uaData.platform.trim().length > 0) {
    return uaData.platform.trim()
  }
  if (typeof nav.platform === 'string' && nav.platform.trim().length > 0) {
    return nav.platform.trim()
  }
  return 'unknown'
}
