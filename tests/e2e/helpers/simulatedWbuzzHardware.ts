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

/**
 * `unsupported-pid` (CBJ-10) offers a device that is NOT the supported profile:
 * same Sony vendor, product 0x0002. Both `getDevices()` and `requestDevice()`
 * return it, which models a browser handing back a previously granted Sony
 * device that is not the Buzz receiver.
 *
 * This exists because the 2026-10-17 Court A recertification recorded M13
 * (wrong-PID acceptance) as killed by UNIT tests only, noting the browser layer
 * was "structurally blind: browser cannot offer a wrong-PID device by
 * construction". That was a property of this helper, not of the product. With
 * this mode the browser layer can offer one, so the product's own
 * `isExactWbuzz` filter on both WebHID entry points is exercised end to end.
 */
export type HidSimMode =
  | 'no-grant'
  | 'permission-cancelled'
  | 'exact-absent'
  | 'open-fail'
  | 'framing-mismatch'
  | 'send-fail'
  | 'unsupported-pid'
  | 'ready'

/** The non-supported product id `unsupported-pid` offers. Never 0x1000. */
export const UNSUPPORTED_HID_PRODUCT_ID = 0x0002

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
  /**
   * Counted so a journey can tell "the product consulted the boundary" from
   * "the product never looked". A product can legitimately find an already
   * granted receiver through `getDevices()` alone and never call
   * `requestDevice`, so requestCalls on its own is not that signal (CBJ-10).
   */
  getDevicesCalls: number
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
    /** Not the supported profile when `unsupported-pid` is active (CBJ-10). */
    productId?: number
  }): FakeHidDevice => {
    const productId = opts.productId ?? 0x1000
    const device: FakeHidDevice = {
      vendorId: 0x054c,
      productId,
      productName: productId === 0x1000 ? 'Wireless Buzz! Receiver' : 'Sony Other Device',
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
    getDevicesCalls: 0,
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
      // 0x0002 is hardcoded rather than read from a module constant: this
      // function is serialized into the page and cannot close over imports.
      productId: state.mode === 'unsupported-pid' ? 0x0002 : 0x1000,
    })
  }
  rebuildDevice()
  /*
    The wrong device is already GRANTED, so `getDevices()` offers it without any
    permission prompt — the realistic shape of this failure. The product must
    filter it out at both WebHID entry points rather than adopt it.
  */
  if (state.mode === 'unsupported-pid' && state.device) {
    state.granted = [state.device]
  }
  if (
    persistGrantAcrossReload &&
    state.device &&
    window.sessionStorage.getItem('__cqsWbuzzSimPersistedGrant') === '1'
  ) {
    state.granted = [state.device]
  }

  const hid = {
    /*
      Identity marker, read only by `assertWbuzzBoundaryInstalled`.

      Presence of `navigator.hid` is NOT evidence the simulator is installed:
      this Chromium ships real WebHID, so `navigator.hid` already exists as a
      read-only accessor on `Navigator.prototype`. A plain assignment to it
      therefore fails silently and leaves the PRODUCT talking to the real
      WebHID, which has no receiver — the exact trap that broke the earlier
      blinded tester driver. The real object also answers to getDevices /
      requestDevice / addEventListener, so method sniffing cannot tell the two
      apart. This marker can.
    */
    __cqsSimulatedReceiver: true,
    getDevices: async () => {
      state.getDevicesCalls += 1
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
    const productId = nextMode === 'unsupported-pid' ? 0x0002 : 0x1000
    const device = {
      vendorId: 0x054c,
      productId,
      productName: productId === 0x1000 ? 'Wireless Buzz! Receiver' : 'Sony Other Device',
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
    // A wrong device is already granted; see the install-time note.
    if (nextMode === 'unsupported-pid') state.granted = [device]
  }, mode)
}

/**
 * Fail LOUD when the test-only WebHID boundary is not actually installed
 * (CBJ-10 self-test).
 *
 * Without this, a journey that relies on the simulated receiver degrades
 * silently: `navigator.hid` is simply absent, the product reports no WebHID
 * support, the teacher never sees a Connect affordance, and a journey written
 * around "no receiver" assertions would still pass — qualifying nothing. The
 * failure mode is a vacuous pass, which is the thing Court B exists to catch,
 * so it is asserted rather than assumed.
 *
 * Checks three separate things, because each can break on its own:
 *  - `navigator.hid` exists at all (the init script ran before navigation);
 *  - it is OUR fake and not a real browser implementation (the sim state object
 *    is present on the page);
 *  - the fake is wired to the property the product reads, not a detached object
 *    (reading `navigator.hid` twice returns the same simulated object, and it
 *    exposes the three methods the transport calls).
 */
export async function assertWbuzzBoundaryInstalled(page: Page): Promise<void> {
  const report = await page.evaluate(() => {
    const nav = navigator as Navigator & { hid?: unknown }
    const hid = nav.hid as Record<string, unknown> | undefined
    return {
      hidPresent: hid !== undefined && hid !== null,
      simStatePresent: window.__cqsWbuzzHidSim !== undefined,
      sameObjectTwice: hid === (nav.hid as unknown),
      isSimulated: hid?.__cqsSimulatedReceiver === true,
      methods: hid
        ? ['getDevices', 'requestDevice', 'addEventListener'].filter(
            (name) => typeof hid[name] === 'function',
          )
        : [],
    }
  })
  if (!report.isSimulated) {
    throw new Error(
      `CBJ-10 boundary is NOT the simulator: ${JSON.stringify(report)}. ` +
        'navigator.hid exists but is the real WebHID implementation, so this run would be ' +
        'testing the host browser instead of the simulated receiver. Install with ' +
        'Object.defineProperty(navigator, "hid", ...) from an init script: navigator.hid is a ' +
        'read-only accessor on Navigator.prototype, so a plain assignment fails silently.',
    )
  }
  if (!report.hidPresent || !report.simStatePresent || !report.sameObjectTwice) {
    throw new Error(
      `CBJ-10 boundary not installed: ${JSON.stringify(report)}. ` +
        'The simulated receiver must be installed with installWbuzzHardwareSimulator BEFORE the ' +
        'first navigation (page.addInitScript + Object.defineProperty(navigator, "hid")). ' +
        'A direct assignment to navigator.hid does not install it.',
    )
  }
  if (report.methods.length !== 3) {
    throw new Error(
      `CBJ-10 boundary incomplete: only [${report.methods.join(', ')}] are callable. ` +
        'The product transport calls getDevices, requestDevice and addEventListener.',
    )
  }
}

/**
 * Assert the PRODUCT read the installed boundary, rather than the test merely
 * installing one. Without this a journey could pass against a product that
 * ignores WebHID entirely and reports readiness from somewhere else.
 */
export async function assertProductReadBoundary(page: Page): Promise<void> {
  const snapshot = await getHidSimSnapshot(page)
  if (snapshot.requestCalls === 0 && snapshot.getDevicesCalls === 0) {
    throw new Error(
      'CBJ-10: the product never consulted navigator.hid (0 requestDevice and 0 getDevices ' +
        'calls), so nothing about the receiver boundary was proven.',
    )
  }
  if (snapshot.violations.length > 0) {
    throw new Error(`CBJ-10: receiver contract violations: ${snapshot.violations.join('; ')}`)
  }
}

export async function getHidSimSnapshot(page: Page): Promise<{
  requestCalls: number
  getDevicesCalls: number
  openCalls: number
  /**
   * Product ids the simulator is currently OFFERING as granted devices.
   *
   * Needed because call counts alone cannot tell "the product refused the
   * wrong device" from "there was no wrong device to refuse" — both produce
   * identical counts and identical UI. A journey about a refusal has to be
   * able to assert that something was there to refuse (CBJ-10, review F1).
   */
  grantedProductIds: number[]
  sendCalls: { reportId: number; bytes: number[] }[]
  violations: string[]
}> {
  return page.evaluate(() => {
    const state = window.__cqsWbuzzHidSim
    if (!state) throw new Error('HID sim not installed')
    return {
      requestCalls: state.requestCalls,
      getDevicesCalls: state.getDevicesCalls,
      openCalls: state.openCalls,
      grantedProductIds: state.granted.map((device) => device.productId),
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
