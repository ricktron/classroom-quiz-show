import {
  keepalivePayload,
  SONY_BUZZ_KEEPALIVE_CADENCE_MS,
  SONY_BUZZ_KEEPALIVE_HEALTH_AGE_MS,
  SONY_BUZZ_KEEPALIVE_REPORT_ID,
  SONY_BUZZ_SUPPORTED_PRODUCT_ID,
  SONY_BUZZ_SUPPORTED_VENDOR_ID,
  type SonyBuzzOutputFraming,
} from './sonyBuzzSupportedProfile'
import {
  browserWebHidTransport,
  inspectExactDeviceFraming,
  isWebHidApiAvailable,
  type CqsHidDeviceHandle,
  type WebHidTransport,
} from './webHidTransport'

/**
 * Single authoritative WebHID keep-alive lifecycle owner (Slice 21).
 *
 * Output/health only — never Gamepad polling, never gameplay input.
 */

export type SonyBuzzTransportHealth =
  | 'unsupported-api'
  | 'permission-required'
  | 'connecting'
  | 'healthy'
  | 'degraded'
  | 'disconnected'
  | 'recovering'
  | 'failed'
  | 'disabled'

export interface SonyBuzzTransportSnapshot {
  readonly health: SonyBuzzTransportHealth
  readonly generation: number
  readonly teacherMessage: string
  readonly lastSuccessfulSendAt: number | null
  readonly lastError: string | null
  readonly sends: number
  readonly failures: number
  readonly deviceLabel: string | null
  readonly framingOk: boolean
  readonly enabled: boolean
}

export type SonyBuzzTransportListener = (snapshot: SonyBuzzTransportSnapshot) => void

export interface SonyBuzzKeepAliveLifecycle {
  readonly getSnapshot: () => SonyBuzzTransportSnapshot
  readonly subscribe: (listener: SonyBuzzTransportListener) => () => void
  /** Explicit host Connect / Reconnect (user gesture). */
  readonly connect: () => Promise<void>
  readonly enable: () => void
  readonly disable: () => void
  /** Attempt restore via getDevices without permission prompt. */
  readonly tryRestoreGranted: () => Promise<boolean>
  readonly onVisibilityOrFocusReturn: () => void
  readonly dispose: () => void
  /** For tests: bump Gamepad re-prime token consumers. */
  readonly getReprimeToken: () => number
}

export interface SonyBuzzKeepAliveLifecycleOptions {
  readonly transport?: WebHidTransport
  readonly now?: () => number
  readonly cadenceMs?: number
  readonly healthAgeMs?: number
  readonly setIntervalFn?: typeof setInterval
  readonly clearIntervalFn?: typeof clearInterval
}

function teacherCopy(health: SonyBuzzTransportHealth): string {
  switch (health) {
    case 'unsupported-api':
      return 'Sony Buzz keep-alive needs a supported Chrome browser. Keyboard buzzing is available.'
    case 'permission-required':
      return 'Sony Buzz needs permission. Keyboard buzzing is available.'
    case 'connecting':
    case 'recovering':
      return 'Connecting Sony Buzz… Keyboard buzzing is available.'
    case 'healthy':
      return 'Sony Buzz receiver keep-alive is running.'
    case 'degraded':
      return 'Sony Buzz keep-alive is degraded (timer may be delayed in background). Keyboard buzzing is available.'
    case 'disconnected':
      return 'Sony Buzz receiver disconnected. Keyboard buzzing is available.'
    case 'failed':
      return 'Sony Buzz could not reconnect. Reconnect the receiver and try again. Keyboard buzzing is available.'
    case 'disabled':
      return 'Sony Buzz keep-alive is off. Keyboard buzzing is available.'
  }
}

export function createSonyBuzzKeepAliveLifecycle(
  options: SonyBuzzKeepAliveLifecycleOptions = {},
): SonyBuzzKeepAliveLifecycle {
  const transport = options.transport ?? browserWebHidTransport()
  const now = options.now ?? (() => Date.now())
  const cadenceMs = options.cadenceMs ?? SONY_BUZZ_KEEPALIVE_CADENCE_MS
  const healthAgeMs = options.healthAgeMs ?? SONY_BUZZ_KEEPALIVE_HEALTH_AGE_MS
  const setIntervalFn = options.setIntervalFn ?? setInterval
  const clearIntervalFn = options.clearIntervalFn ?? clearInterval

  let generation = 0
  let enabled = false
  let health: SonyBuzzTransportHealth = transport.available
    ? 'permission-required'
    : 'unsupported-api'
  let device: CqsHidDeviceHandle | null = null
  let framing: SonyBuzzOutputFraming | null = null
  let timer: ReturnType<typeof setInterval> | null = null
  /**
   * Lifecycle-owned physical send gate. Generation invalidation must NOT clear
   * this — an in-flight browser Promise still owns the shared WebHID channel
   * until it settles. At most one sendReport may be in flight for this owner.
   */
  let inFlight = false
  /** Generation that should send once the current physical send settles. */
  let deferredSendGeneration: number | null = null
  let lastSuccessfulSendAt: number | null = null
  let lastError: string | null = null
  let sends = 0
  let failures = 0
  let reprimeToken = 0
  const listeners = new Set<SonyBuzzTransportListener>()

  const unsubscribeDisconnect = transport.available
    ? transport.onExactDisconnect(() => {
        void handleDisconnect()
      })
    : () => {}

  function bumpReprime(): void {
    reprimeToken += 1
  }

  function snapshot(): SonyBuzzTransportSnapshot {
    let effective = health
    if (
      enabled &&
      (health === 'healthy' || health === 'degraded') &&
      lastSuccessfulSendAt != null &&
      now() - lastSuccessfulSendAt > healthAgeMs
    ) {
      effective = 'degraded'
    }
    return {
      health: effective,
      generation,
      teacherMessage: teacherCopy(effective),
      lastSuccessfulSendAt,
      lastError,
      sends,
      failures,
      deviceLabel: device
        ? `${device.productName} (${device.vendorId.toString(16)}:${device.productId
            .toString(16)
            .padStart(4, '0')})`
        : null,
      framingOk: framing != null,
      enabled,
    }
  }

  function emit(): void {
    const snap = snapshot()
    for (const listener of listeners) listener(snap)
  }

  function stopTimer(): void {
    if (timer != null) {
      clearIntervalFn(timer)
      timer = null
    }
  }

  function invalidateStale(expectedGeneration: number): boolean {
    return expectedGeneration !== generation
  }

  function clearDeferredSend(): void {
    deferredSendGeneration = null
  }

  function scheduleDeferredSend(expectedGeneration: number): void {
    deferredSendGeneration = expectedGeneration
  }

  async function sendOnce(expectedGeneration: number): Promise<void> {
    if (invalidateStale(expectedGeneration)) return
    if (!enabled || !device || !framing) return
    if (inFlight) {
      // Defer for the current generation; do not open a second physical send.
      scheduleDeferredSend(expectedGeneration)
      return
    }
    inFlight = true
    try {
      const payload = keepalivePayload()
      // Capture handle for this physical send; generation may invalidate later.
      const sendingDevice = device
      await sendingDevice.sendReport(
        SONY_BUZZ_KEEPALIVE_REPORT_ID,
        payload as unknown as BufferSource,
      )
      if (invalidateStale(expectedGeneration)) return
      sends += 1
      lastSuccessfulSendAt = now()
      lastError = null
      if (health === 'connecting' || health === 'recovering' || health === 'degraded') {
        health = 'healthy'
      } else if (health !== 'healthy' && health !== 'disabled') {
        health = 'healthy'
      }
      emit()
    } catch (error) {
      if (invalidateStale(expectedGeneration)) return
      failures += 1
      lastError = error instanceof Error ? `${error.name}: ${error.message}` : 'send failed'
      health = health === 'disabled' ? health : 'degraded'
      emit()
    } finally {
      inFlight = false
      const deferred = deferredSendGeneration
      deferredSendGeneration = null
      if (
        deferred != null &&
        !invalidateStale(deferred) &&
        enabled &&
        device &&
        framing
      ) {
        void sendOnce(deferred)
      }
    }
  }

  function startTimer(expectedGeneration: number): void {
    stopTimer()
    if (!enabled || !device || !framing) return
    void sendOnce(expectedGeneration)
    timer = setIntervalFn(() => {
      void sendOnce(expectedGeneration)
    }, cadenceMs)
  }

  async function convergeOpen(handle: CqsHidDeviceHandle, expectedGeneration: number): Promise<boolean> {
    if (invalidateStale(expectedGeneration)) return false
    if (handle.opened) return true
    try {
      await handle.open()
      return !invalidateStale(expectedGeneration) && handle.opened
    } catch (error) {
      const name =
        error instanceof DOMException
          ? error.name
          : error instanceof Error
            ? error.name
            : ''
      const message = error instanceof Error ? error.message : String(error)
      if (name === 'InvalidStateError' && /already open/i.test(message)) {
        // Only converge when the current handle is genuinely open/usable.
        if (invalidateStale(expectedGeneration)) return false
        if (handle.opened) return true
        lastError = `${name}: ${message} (handle not open)`
        return false
      }
      if (!invalidateStale(expectedGeneration)) {
        lastError = error instanceof Error ? `${error.name}: ${error.message}` : 'open failed'
      }
      return false
    }
  }

  async function acquireAndStart(mode: 'connect' | 'restore' | 'recover'): Promise<boolean> {
    if (!transport.available) {
      health = 'unsupported-api'
      emit()
      return false
    }
    if (!enabled && mode !== 'restore') {
      // connect/recover only when enabled; restore may probe
    }

    generation += 1
    const myGeneration = generation
    stopTimer()
    clearDeferredSend()
    // Do NOT clear inFlight: a prior generation's unresolved sendReport still
    // owns the shared channel until that Promise settles.
    health = mode === 'recover' ? 'recovering' : 'connecting'
    emit()

    let handle: CqsHidDeviceHandle | null = null
    try {
      const granted = await transport.getGrantedExactDevices()
      if (invalidateStale(myGeneration)) return false
      handle = granted[0] ?? null
      if (!handle && mode === 'connect') {
        handle = await transport.requestExactDevice()
      }
      if (invalidateStale(myGeneration)) return false
      if (!handle) {
        health = 'permission-required'
        device = null
        framing = null
        emit()
        return false
      }
      if (
        handle.vendorId !== SONY_BUZZ_SUPPORTED_VENDOR_ID ||
        handle.productId !== SONY_BUZZ_SUPPORTED_PRODUCT_ID
      ) {
        health = 'failed'
        lastError = 'Unexpected HID device (not exact Wbuzz 054c:1000).'
        device = null
        framing = null
        emit()
        return false
      }

      const framingResult = inspectExactDeviceFraming(handle)
      if (!framingResult.ok) {
        health = 'failed'
        lastError = framingResult.reason
        device = null
        framing = null
        emit()
        return false
      }

      const opened = await convergeOpen(handle, myGeneration)
      if (invalidateStale(myGeneration)) return false
      if (!opened) {
        health = 'failed'
        device = null
        framing = null
        emit()
        return false
      }

      device = handle
      framing = framingResult
      bumpReprime()
      if (enabled) {
        health = 'healthy'
        startTimer(myGeneration)
      } else {
        health = 'disabled'
      }
      emit()
      return true
    } catch (error) {
      if (invalidateStale(myGeneration)) return false
      lastError = error instanceof Error ? `${error.name}: ${error.message}` : 'acquire failed'
      health = 'failed'
      device = null
      framing = null
      emit()
      return false
    }
  }

  async function handleDisconnect(): Promise<void> {
    generation += 1
    stopTimer()
    clearDeferredSend()
    // Retain inFlight until any already-issued sendReport settles.
    device = null
    framing = null
    if (!enabled) {
      health = transport.available ? 'disabled' : 'unsupported-api'
    } else {
      health = 'disconnected'
    }
    bumpReprime()
    emit()
  }

  return {
    getSnapshot: snapshot,
    subscribe(listener) {
      listeners.add(listener)
      listener(snapshot())
      return () => {
        listeners.delete(listener)
      }
    },
    async connect() {
      if (!transport.available) {
        health = 'unsupported-api'
        emit()
        return
      }
      enabled = true
      await acquireAndStart('connect')
    },
    enable() {
      enabled = true
      if (device && framing) {
        generation += 1
        const g = generation
        health = 'healthy'
        startTimer(g)
        bumpReprime()
        emit()
      } else if (transport.available) {
        health = 'permission-required'
        emit()
      }
    },
    disable() {
      enabled = false
      generation += 1
      stopTimer()
      clearDeferredSend()
      // Keep device reference closed safely; do not falsely free inFlight.
      const closing = device
      device = null
      framing = null
      if (closing?.opened) {
        void closing.close().catch(() => {})
      }
      health = transport.available ? 'disabled' : 'unsupported-api'
      bumpReprime()
      emit()
    },
    async tryRestoreGranted() {
      if (!transport.available) return false
      // Probe previously granted devices without prompting. Only enable keep-alive
      // when an exact device is actually restored — initial permission remains a
      // deliberate Connect action.
      const granted = await transport.getGrantedExactDevices()
      if (granted.length === 0) {
        if (health !== 'disabled' && health !== 'unsupported-api') {
          health = 'permission-required'
          emit()
        }
        return false
      }
      enabled = true
      return acquireAndStart('restore')
    },
    onVisibilityOrFocusReturn() {
      if (!enabled) return
      bumpReprime()
      if (device && framing) {
        const g = generation
        void sendOnce(g)
        // refresh health classification
        emit()
      } else if (health === 'disconnected' || health === 'failed' || health === 'degraded') {
        void acquireAndStart('recover')
      } else {
        emit()
      }
    },
    dispose() {
      generation += 1
      stopTimer()
      clearDeferredSend()
      unsubscribeDisconnect()
      listeners.clear()
      const closing = device
      device = null
      framing = null
      enabled = false
      if (closing?.opened) void closing.close().catch(() => {})
    },
    getReprimeToken() {
      return reprimeToken
    },
  }
}

export function webHidCapabilitySnapshot(nav: Navigator = navigator): {
  readonly available: boolean
  readonly secureContext: boolean
} {
  return {
    available: isWebHidApiAvailable(nav),
    secureContext: typeof window !== 'undefined' ? window.isSecureContext : false,
  }
}
