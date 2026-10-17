/**
 * Platform-boundary Sony/Namtai Wbuzz simulator for Playwright (browser + Electron).
 *
 * Patches `navigator.hid` and `navigator.getGamepads` only — never product
 * reducers, Class Setup state, or Gamepad mapping stores.
 *
 * Exact supported profile: VID 0x054c / PID 0x1000, reportId 0, 7-byte output.
 * Simulation is NOT physical hardware evidence.
 */

import type { Page } from '@playwright/test'
import { settleGamepadPolls } from './simulatedGamepad'

export const WBUZZ_VID = 0x054c
export const WBUZZ_PID = 0x1000
export const WBUZZ_GAMEPAD_ID = 'Vendor: 054c Product: 1000'

export type HidSimMode =
  | 'no-grant'
  | 'permission-cancelled'
  | 'exact-absent'
  | 'open-fail'
  | 'framing-mismatch'
  | 'send-fail'
  | 'ready'

type FakeHidDevice = {
  vendorId: number
  productId: number
  productName: string
  opened: boolean
  collections: readonly {
    outputReports: readonly {
      reportId: number
      items: readonly { reportSize: number; reportCount: number }[]
    }[]
  }[]
  open(): Promise<void>
  close(): Promise<void>
  sendReport(reportId: number, data: BufferSource): Promise<void>
}

type HidSimState = {
  mode: HidSimMode
  granted: FakeHidDevice[]
  requestCalls: number
  openCalls: number
  sendCalls: { reportId: number; bytes: number[] }[]
  /**
   * Contract violations the real receiver would not accept (Q7-R1): a
   * requestDevice without the exact 054c:1000 filter, or an output report that is
   * not reportId 0 with exactly 7 bytes. Each also fails the call.
   */
  violations: string[]
  disconnectListeners: Set<(event: { device: FakeHidDevice }) => void>
  device: FakeHidDevice | null
}

type GamepadSimState = {
  exposed: boolean
  pads: {
    index: number
    connected: boolean
    mapping: string
    id: string
    buttons: { pressed: boolean; value: number; touched: boolean }[]
    axes: number[]
    timestamp: number
  }[]
}

declare global {
  interface Window {
    __cqsWbuzzHidSim?: HidSimState
    __cqsFakeGamepads?: GamepadSimState
  }
}

/**
 * Court B CB-02 harness: `persistGrantAcrossReload` models a browser that keeps
 * the exact 054c:1000 WebHID grant for this tab across a reload, so
 * `getDevices()` returns the receiver again with no permission prompt. The
 * Gamepad still appears only when a test exposes it (explicit sequencing).
 * SIMULATED: it says nothing about real Chrome grant persistence.
 */
// The sessionStorage key `__cqsWbuzzSimPersistedGrant` is written inline in
// installScript: the function is serialized into the page and cannot close over
// module constants.

function installScript(config: { mode: HidSimMode; persistGrantAcrossReload: boolean }): void {
  const { mode, persistGrantAcrossReload } = config
  const makeDevice = (opts: {
    framingOk: boolean
    openFail: boolean
    sendFail: boolean
  }): FakeHidDevice => {
    const device: FakeHidDevice = {
      vendorId: 0x054c,
      productId: 0x1000,
      productName: 'Wireless Buzz! Receiver',
      opened: false,
      collections: [
        {
          outputReports: [
            {
              reportId: 0,
              items: opts.framingOk
                ? [{ reportSize: 8, reportCount: 7 }]
                : [{ reportSize: 8, reportCount: 5 }],
            },
          ],
        },
      ],
      async open() {
        const state = window.__cqsWbuzzHidSim
        if (state) state.openCalls += 1
        if (opts.openFail) throw new Error('open failed')
        device.opened = true
      },
      async close() {
        device.opened = false
      },
      async sendReport(reportId, data) {
        if (opts.sendFail) throw new Error('send failed')
        if (!device.opened) {
          const err = new Error('Device is not open.')
          err.name = 'InvalidStateError'
          throw err
        }
        const view =
          data instanceof ArrayBuffer
            ? new Uint8Array(data)
            : ArrayBuffer.isView(data)
              ? new Uint8Array(data.buffer, data.byteOffset, data.byteLength)
              : new Uint8Array(data as unknown as ArrayBufferLike)
        if (reportId !== 0 || view.byteLength !== 7) {
          const violation = `sendReport(reportId=${reportId}, bytes=${view.byteLength}) — expected reportId 0 and 7 bytes`
          window.__cqsWbuzzHidSim?.violations.push(violation)
          throw new TypeError(violation)
        }
        window.__cqsWbuzzHidSim?.sendCalls.push({ reportId, bytes: [...view] })
      },
    }
    return device
  }

  const state: HidSimState = {
    mode,
    granted: [],
    requestCalls: 0,
    openCalls: 0,
    sendCalls: [],
    violations: [],
    disconnectListeners: new Set(),
    device: null,
  }
  window.__cqsWbuzzHidSim = state

  const rebuildDevice = () => {
    if (state.mode === 'exact-absent') {
      state.device = null
      return
    }
    state.device = makeDevice({
      framingOk: state.mode !== 'framing-mismatch',
      openFail: state.mode === 'open-fail',
      sendFail: state.mode === 'send-fail',
    })
  }
  rebuildDevice()
  if (
    persistGrantAcrossReload &&
    state.device &&
    window.sessionStorage.getItem('__cqsWbuzzSimPersistedGrant') === '1'
  ) {
    state.granted = [state.device]
  }

  const hid = {
    getDevices: async () => {
      if (state.mode === 'exact-absent') return []
      return state.granted
    },
    requestDevice: async (options?: {
      filters?: readonly { vendorId?: number; productId?: number }[]
    }) => {
      state.requestCalls += 1
      const filters = options?.filters ?? []
      const exact = filters.some((f) => f.vendorId === 0x054c && f.productId === 0x1000)
      const onlyExact = filters.every((f) => f.vendorId === 0x054c && f.productId === 0x1000)
      if (!exact || !onlyExact) {
        state.violations.push(
          `requestDevice filters ${JSON.stringify(filters)} — expected only {vendorId:0x054c, productId:0x1000}`,
        )
        return []
      }
      if (state.mode === 'permission-cancelled' || state.mode === 'exact-absent') {
        return []
      }
      if (!state.device) rebuildDevice()
      if (!state.device) return []
      state.granted = [state.device]
      if (persistGrantAcrossReload) {
        window.sessionStorage.setItem('__cqsWbuzzSimPersistedGrant', '1')
      }
      return [state.device]
    },
    addEventListener: (type: string, listener: EventListener) => {
      if (type !== 'disconnect') return
      state.disconnectListeners.add(listener as unknown as (event: { device: FakeHidDevice }) => void)
    },
    removeEventListener: (type: string, listener: EventListener) => {
      if (type !== 'disconnect') return
      state.disconnectListeners.delete(
        listener as unknown as (event: { device: FakeHidDevice }) => void,
      )
    },
  }

  Object.defineProperty(navigator, 'hid', {
    configurable: true,
    enumerable: true,
    get: () => hid,
  })

  // Gamepad starts unexposed — teacher Connect/HID healthy ≠ controllers ready.
  const pads = {
    exposed: false,
    pads: [
      {
        index: 0,
        connected: true,
        mapping: 'standard',
        id: 'Vendor: 054c Product: 1000',
        buttons: Array.from({ length: 20 }, () => ({
          pressed: false,
          value: 0,
          touched: false,
        })),
        axes: [0, 0],
        timestamp: 0,
      },
    ],
  }
  window.__cqsFakeGamepads = pads

  const nav = navigator as Navigator & { getGamepads?: () => (Gamepad | null)[] }
  nav.getGamepads = function patched() {
    if (!pads.exposed) return []
    pads.pads[0]!.timestamp = performance.now()
    return pads.pads as unknown as Gamepad[]
  }
}

/** Install HID+Gamepad platform stubs before any app navigation. */
export async function installWbuzzHardwareSimulator(
  page: Page,
  mode: HidSimMode = 'ready',
  options: { readonly persistGrantAcrossReload?: boolean } = {},
): Promise<void> {
  await page.addInitScript(installScript, {
    mode,
    persistGrantAcrossReload: options.persistGrantAcrossReload ?? false,
  })
}

export async function setHidSimMode(page: Page, mode: HidSimMode): Promise<void> {
  await page.evaluate((next) => {
    const state = window.__cqsWbuzzHidSim
    if (!state) throw new Error('HID sim not installed')
    state.mode = next
    state.granted = []
    state.sendCalls = []
    // Recreate device flags by requesting again after mode change.
    state.device = null
  }, mode)
  // Rebuild device with new mode flags via a second evaluate that mirrors install.
  await page.evaluate((nextMode) => {
    const state = window.__cqsWbuzzHidSim
    if (!state) throw new Error('HID sim not installed')
    const framingOk = nextMode !== 'framing-mismatch'
    const openFail = nextMode === 'open-fail'
    const sendFail = nextMode === 'send-fail'
    if (nextMode === 'exact-absent') {
      state.device = null
      return
    }
    const device = {
      vendorId: 0x054c,
      productId: 0x1000,
      productName: 'Wireless Buzz! Receiver',
      opened: false,
      collections: [
        {
          outputReports: [
            {
              reportId: 0,
              items: framingOk
                ? [{ reportSize: 8, reportCount: 7 }]
                : [{ reportSize: 8, reportCount: 5 }],
            },
          ],
        },
      ],
      async open() {
        state.openCalls += 1
        if (openFail) throw new Error('open failed')
        device.opened = true
      },
      async close() {
        device.opened = false
      },
      async sendReport(reportId: number, data: BufferSource) {
        if (sendFail) throw new Error('send failed')
        if (!device.opened) {
          const err = new Error('Device is not open.')
          err.name = 'InvalidStateError'
          throw err
        }
        const view =
          data instanceof ArrayBuffer
            ? new Uint8Array(data)
            : ArrayBuffer.isView(data)
              ? new Uint8Array(data.buffer, data.byteOffset, data.byteLength)
              : new Uint8Array(data as unknown as ArrayBufferLike)
        if (reportId !== 0 || view.byteLength !== 7) {
          const violation = `sendReport(reportId=${reportId}, bytes=${view.byteLength}) — expected reportId 0 and 7 bytes`
          state.violations.push(violation)
          throw new TypeError(violation)
        }
        state.sendCalls.push({ reportId, bytes: [...view] })
      },
    }
    state.device = device
  }, mode)
}

export async function getHidSimSnapshot(page: Page): Promise<{
  requestCalls: number
  openCalls: number
  sendCalls: { reportId: number; bytes: number[] }[]
  violations: string[]
}> {
  return page.evaluate(() => {
    const state = window.__cqsWbuzzHidSim
    if (!state) throw new Error('HID sim not installed')
    return {
      requestCalls: state.requestCalls,
      openCalls: state.openCalls,
      sendCalls: state.sendCalls.map((c) => ({ reportId: c.reportId, bytes: [...c.bytes] })),
      violations: [...state.violations],
    }
  })
}

/** Expose the simulated 20-button Wbuzz Gamepad (after HID healthy in happy path). */
export async function exposeSimulatedWbuzzGamepad(page: Page): Promise<void> {
  await page.evaluate(() => {
    const pads = window.__cqsFakeGamepads
    if (!pads) throw new Error('Gamepad sim not installed')
    pads.exposed = true
    pads.pads[0]!.connected = true
    window.dispatchEvent(new Event('gamepadconnected'))
  })
  await settleGamepadPolls(page, 12)
}

export async function hideSimulatedWbuzzGamepad(page: Page): Promise<void> {
  await page.evaluate(() => {
    const pads = window.__cqsFakeGamepads
    if (!pads) throw new Error('Gamepad sim not installed')
    pads.exposed = false
    pads.pads[0]!.connected = false
    window.dispatchEvent(new Event('gamepaddisconnected'))
  })
  await settleGamepadPolls(page, 8)
}

export async function pressWbuzzButton(
  page: Page,
  buttonIndex: number,
  options?: { readonly hold?: boolean },
): Promise<void> {
  await page.evaluate((idx) => {
    const pads = window.__cqsFakeGamepads
    if (!pads?.exposed) throw new Error('Wbuzz Gamepad not exposed')
    pads.pads[0]!.buttons[idx]!.pressed = true
    pads.pads[0]!.buttons[idx]!.value = 1
  }, buttonIndex)
  await settleGamepadPolls(page)
  if (!options?.hold) {
    await page.evaluate((idx) => {
      const pads = window.__cqsFakeGamepads
      if (!pads) throw new Error('Gamepad sim not installed')
      pads.pads[0]!.buttons[idx]!.pressed = false
      pads.pads[0]!.buttons[idx]!.value = 0
    }, buttonIndex)
    await settleGamepadPolls(page, 4)
  }
}

export async function releaseWbuzzButton(page: Page, buttonIndex: number): Promise<void> {
  await page.evaluate((idx) => {
    const pads = window.__cqsFakeGamepads
    if (!pads) throw new Error('Gamepad sim not installed')
    pads.pads[0]!.buttons[idx]!.pressed = false
    pads.pads[0]!.buttons[idx]!.value = 0
  }, buttonIndex)
  await settleGamepadPolls(page, 4)
}

/** Emit HID disconnect for the granted exact receiver. */
export async function disconnectSimulatedReceiver(page: Page): Promise<void> {
  await page.evaluate(() => {
    const state = window.__cqsWbuzzHidSim
    if (!state?.device) throw new Error('no simulated receiver')
    state.device.opened = false
    state.granted = []
    for (const listener of state.disconnectListeners) {
      listener({ device: state.device })
    }
  })
}

/** Also expose a non-Wbuzz generic pad that must not masquerade as supported. */
export async function exposeAdditionalGenericGamepad(page: Page): Promise<void> {
  await page.evaluate(() => {
    const pads = window.__cqsFakeGamepads
    if (!pads) throw new Error('Gamepad sim not installed')
    pads.pads.push({
      index: 1,
      connected: true,
      mapping: 'standard',
      id: 'Generic USB Gamepad',
      buttons: Array.from({ length: 16 }, () => ({
        pressed: false,
        value: 0,
        touched: false,
      })),
      axes: [0, 0, 0, 0],
      timestamp: 0,
    })
    pads.exposed = true
    window.dispatchEvent(new Event('gamepadconnected'))
  })
  await settleGamepadPolls(page, 8)
}
