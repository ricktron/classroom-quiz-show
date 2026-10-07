/**
 * Q7-DIAG-1 — bounded Wbuzz signal-chain diagnostic trace.
 *
 * Observability only. Does not own WebHID, Gamepad polling, or gameplay input.
 * Ring-buffered in memory; no network; no classroom content.
 */

export const WBUZZ_SIGNAL_TRACE_CAPACITY = 200 as const
export const WBUZZ_SIGNAL_TRACE_FORMAT_VERSION = 1 as const

export type WbuzzSignalEventKind =
  | 'profile_hook_mounted'
  | 'restore_attempted'
  | 'exact_device_found'
  | 'exact_device_not_found'
  | 'connect_invoked'
  | 'request_device_invoked'
  | 'hid_open_attempted'
  | 'hid_open_succeeded'
  | 'hid_open_failed'
  | 'framing_validated'
  | 'framing_rejected'
  | 'keepalive_started'
  | 'output_report_first_attempted'
  | 'output_report_first_succeeded'
  | 'output_report_first_failed'
  | 'output_report_send'
  | 'transport_disconnected'
  | 'transport_recovering'
  | 'gamepad_wbuzz_appeared'
  | 'gamepad_wbuzz_disappeared'
  /** First rising edge attributed to the currently recognized Wbuzz controller only. */
  | 'gamepad_wbuzz_button_transition'
  | 'cqs_buzzer_observation'
  | 'trace_cleared'

export type WbuzzSignalOutcome = 'ok' | 'fail' | 'info'

export interface WbuzzSignalEventDetail {
  readonly [key: string]: string | number | boolean | null | undefined
}

export interface WbuzzSignalEvent {
  readonly seq: number
  readonly kind: WbuzzSignalEventKind
  readonly outcome: WbuzzSignalOutcome
  /** Wall-clock ms since epoch (Date.now). */
  readonly wallClockMs: number
  /** Monotonic ms since page time origin (performance.now when available). */
  readonly monotonicMs: number
  readonly detail: WbuzzSignalEventDetail
}

export interface WbuzzSignalTraceSnapshot {
  readonly formatVersion: typeof WBUZZ_SIGNAL_TRACE_FORMAT_VERSION
  readonly sourceSha: string
  readonly capacity: number
  readonly events: readonly WbuzzSignalEvent[]
}

export type WbuzzSignalTraceListener = (snapshot: WbuzzSignalTraceSnapshot) => void

export interface WbuzzSignalTraceClock {
  readonly wallClockMs: () => number
  readonly monotonicMs: () => number
}

export interface WbuzzSignalTraceOptions {
  readonly capacity?: number
  readonly clock?: WbuzzSignalTraceClock
  readonly sourceSha?: string
}

export interface WbuzzSignalChainTrace {
  readonly record: (
    kind: WbuzzSignalEventKind,
    outcome: WbuzzSignalOutcome,
    detail?: WbuzzSignalEventDetail,
  ) => WbuzzSignalEvent
  readonly getSnapshot: () => WbuzzSignalTraceSnapshot
  /** Operator reset: clears history and records a single `trace_cleared` marker. */
  readonly clear: () => void
  /** Test-only silent wipe (no marker event). */
  readonly wipeSilent: () => void
  readonly subscribe: (listener: WbuzzSignalTraceListener) => () => void
  readonly formatText: () => string
  readonly formatJson: () => string
}

const defaultClock: WbuzzSignalTraceClock = {
  wallClockMs: () => Date.now(),
  monotonicMs: () =>
    typeof performance !== 'undefined' && typeof performance.now === 'function'
      ? performance.now()
      : Date.now(),
}

function resolveSourceSha(explicit?: string): string {
  if (explicit && explicit.length > 0) return explicit
  try {
    const injected =
      typeof __CQS_SOURCE_SHA__ === 'string' ? __CQS_SOURCE_SHA__ : undefined
    if (injected && injected.length > 0) return injected
  } catch {
    // ignore unresolved compile-time inject in some test hosts
  }
  return 'unknown'
}

function formatSnapshotText(snap: WbuzzSignalTraceSnapshot): string {
  const lines = [
    `CQS Wbuzz signal-chain trace v${snap.formatVersion}`,
    `sourceSha: ${snap.sourceSha}`,
    `events: ${snap.events.length} (capacity ${snap.capacity})`,
    '',
  ]
  for (const event of snap.events) {
    const detailKeys = Object.keys(event.detail)
    const detailParts = detailKeys.map(
      (key) => key + '=' + String(event.detail[key]),
    )
    const detail = detailParts.length === 0 ? '' : ' ' + detailParts.join(' ')
    lines.push(
      '#' +
        String(event.seq) +
        ' t=' +
        String(event.wallClockMs) +
        ' mono=' +
        event.monotonicMs.toFixed(1) +
        ' ' +
        event.kind +
        ' ' +
        event.outcome +
        detail,
    )
  }
  return lines.join('\n')
}

export function createWbuzzSignalChainTrace(
  options: WbuzzSignalTraceOptions = {},
): WbuzzSignalChainTrace {
  const capacity = options.capacity ?? WBUZZ_SIGNAL_TRACE_CAPACITY
  const clock = options.clock ?? defaultClock
  const sourceSha = resolveSourceSha(options.sourceSha)
  const events: WbuzzSignalEvent[] = []
  const listeners = new Set<WbuzzSignalTraceListener>()
  let nextSeq = 1

  function snapshot(): WbuzzSignalTraceSnapshot {
    return {
      formatVersion: WBUZZ_SIGNAL_TRACE_FORMAT_VERSION,
      sourceSha,
      capacity,
      events: [...events],
    }
  }

  function emit(): void {
    const snap = snapshot()
    for (const listener of listeners) listener(snap)
  }

  return {
    record(kind, outcome, detail = {}) {
      const event: WbuzzSignalEvent = {
        seq: nextSeq++,
        kind,
        outcome,
        wallClockMs: clock.wallClockMs(),
        monotonicMs: clock.monotonicMs(),
        detail: { ...detail },
      }
      events.push(event)
      while (events.length > capacity) events.shift()
      emit()
      return event
    },
    getSnapshot: snapshot,
    clear() {
      events.length = 0
      nextSeq = 1
      events.push({
        seq: nextSeq++,
        kind: 'trace_cleared',
        outcome: 'info',
        wallClockMs: clock.wallClockMs(),
        monotonicMs: clock.monotonicMs(),
        detail: {},
      })
      emit()
    },
    wipeSilent() {
      events.length = 0
      nextSeq = 1
      emit()
    },
    subscribe(listener) {
      listeners.add(listener)
      listener(snapshot())
      return () => {
        listeners.delete(listener)
      }
    },
    formatText() {
      return formatSnapshotText(snapshot())
    },
    formatJson() {
      return `${JSON.stringify(snapshot(), null, 2)}\n`
    },
  }
}

/** Process-wide default recorder used by production lifecycle / Gamepad hooks. */
const defaultTrace = createWbuzzSignalChainTrace()

export function recordWbuzzSignalEvent(
  kind: WbuzzSignalEventKind,
  outcome: WbuzzSignalOutcome,
  detail?: WbuzzSignalEventDetail,
): WbuzzSignalEvent {
  return defaultTrace.record(kind, outcome, detail)
}

export function getWbuzzSignalTraceSnapshot(): WbuzzSignalTraceSnapshot {
  return defaultTrace.getSnapshot()
}

export function clearWbuzzSignalTrace(): void {
  defaultTrace.clear()
}

export function wipeWbuzzSignalTraceForTests(): void {
  defaultTrace.wipeSilent()
}

export function subscribeWbuzzSignalTrace(
  listener: WbuzzSignalTraceListener,
): () => void {
  return defaultTrace.subscribe(listener)
}

export function formatWbuzzSignalTraceText(): string {
  return defaultTrace.formatText()
}

export function formatWbuzzSignalTraceJson(): string {
  return defaultTrace.formatJson()
}
