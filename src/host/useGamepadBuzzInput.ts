import { useEffect, useRef } from 'react'
import type { SessionCommand } from '../state/commands'
import type { DispatchResult } from '../state/store'
import type { RejectionReason } from '../state/reducer'
import {
  scanGamepadEdges,
  translateGamepadEdge,
  type GamepadBaseline,
  type GamepadIgnoreReason,
} from '../input/gamepadAdapter'
import {
  resolveGamepadBinding,
  type GamepadControlRef,
  type GamepadMapping,
} from '../input/gamepadMapping'
import {
  browserGamepadSource,
  type GamepadReadStatus,
  type GamepadReportedId,
  type GamepadReportedMapping,
  type GamepadSource,
} from '../input/gamepadSource'
import {
  classifyGamepadReportedId,
  type GamepadDeviceClassification,
} from '../input/gamepadDeviceProfile'
import {
  translateLocalInput,
  type LocalInputTranslationRejection,
  type ResponseOpportunityTarget,
} from '../input/commandTranslation'
import type { LocalInputAction } from '../input/logicalAction'
import { systemClock, type Clock } from '../time/clock'

/**
 * The Gamepad polling LIFECYCLE OWNER (Slices 9–10).
 *
 * There is exactly one of these in the application, it is host-only, and it is
 * the sibling of `useResponseTimerExpiry` (the one scheduled clock read) and
 * `useKeyboardBuzzInput` (the one place a `KeyboardEvent` is touched). It listens,
 * polls, and hands everything to pure functions. It makes no game decision and
 * holds no game state.
 *
 * ```text
 * scheduler tick → source.read() → GamepadSnapshot   (bounded data, no browser object)
 *                → scanGamepadEdges                  (rising edges only)
 *                → translateGamepadEdge → LocalInputSignal
 *                → translateLocalInput  → RECORD_TEAM_BUZZ → planner
 * ```
 *
 * Slice 10 adds an explicit **setup/test mode** on this same path: while active,
 * fresh edges are resolved against the applied mapping and reported to the host
 * setup surface, and `translateLocalInput` / `dispatch` are never called.
 *
 * ## Where polling may NOT happen
 *
 * Not in the reducer, not during render, not in the sanitizer, not during replay,
 * not in command planning, and **not on the display route** — the projector has no
 * Gamepad code of any kind and never reads `navigator.getGamepads`. Polling
 * happens in one `useEffect` on one host component, and it stops on unmount.
 *
 * There is deliberately no global polling service, no module-level loop and no
 * singleton: a loop that outlives its component is a loop that keeps dispatching
 * into a store nobody is watching.
 *
 * ## Both seams are injectable
 *
 * The SOURCE (what the browser reports) and the SCHEDULER (when to look) are both
 * parameters. Production uses the browser and `requestAnimationFrame`; every unit
 * test uses a fake source and a hand-driven scheduler, so not one test needs a
 * real browser, a real frame or a physical controller.
 *
 * ## Re-priming, and why it is the whole safety story
 *
 * A "re-prime" drops the baseline, so the next poll is a baseline-only poll and
 * every currently-held button must be RELEASED before it can buzz. Everything
 * that could otherwise manufacture a press re-primes:
 *
 * - the adapter being enabled or disabled;
 * - the mapping changing (including a capture completing);
 * - capture mode starting or ending;
 * - setup/test mode starting or ending;
 * - `gamepadconnected` / `gamepaddisconnected`;
 * - the tab becoming visible again;
 * - the window regaining or losing focus.
 *
 * Disconnect needs no special handling beyond this: a controller absent from a
 * snapshot is dropped from the baseline by `scanGamepadEdges`, which emits
 * nothing, so no event can be appended merely because a controller appeared or
 * disappeared.
 *
 * ## One clock read, at the input edge
 *
 * `clock.now()` is read once per accepted edge and becomes the command's
 * `issuedAt` (ADR-007 §1). A poll that produces no edge reads no clock at all, so
 * polling adds no clock read to the reducer, the replay path or the timer. Test
 * mode also reads no clock — it never dispatches.
 */

/** What happened to one physical press, end to end. Host-only diagnostics. */
export type GamepadBuzzOutcome =
  | { readonly kind: 'accepted'; readonly teamId: string }
  | { readonly kind: 'ignored'; readonly reason: GamepadIgnoreReason }
  | { readonly kind: 'untranslated'; readonly reason: LocalInputTranslationRejection }
  | { readonly kind: 'refused'; readonly reason: RejectionReason }
  | {
      readonly kind: 'test-observation'
      readonly teamId: string
      readonly action: LocalInputAction
      readonly control: GamepadControlRef
    }

/** One connected controller, as the host panel needs to describe it. */
export interface GamepadControllerInfo {
  readonly controllerIndex: number
  readonly buttonCount: number
  /** Host-private bounded id observation. Never gameplay identity. */
  readonly reportedId: GamepadReportedId
  /** Host-private bounded mapping observation. */
  readonly reportedMapping: GamepadReportedMapping
  /** Derived candidate/unrecognized classification. Host-private. */
  readonly classification: GamepadDeviceClassification
}

/**
 * What the host panel is told about the browser and the attached hardware.
 *
 * Deliberately the STABLE facts only — availability, which controllers exist,
 * how many buttons each has, and bounded identity/classification. Live button
 * state is **not** here and is not rendered anywhere.
 */
export interface GamepadDiagnostics {
  readonly status: GamepadReadStatus
  readonly controllers: readonly GamepadControllerInfo[]
}

export const INITIAL_GAMEPAD_DIAGNOSTICS: GamepadDiagnostics = Object.freeze({
  status: 'unsupported' as GamepadReadStatus,
  controllers: Object.freeze([]) as readonly GamepadControllerInfo[],
})

/**
 * When to poll. Injectable so tests are deterministic rather than frame-timed.
 *
 * `start` begins calling `tick` and returns a stop function. An implementation
 * must be safe to stop more than once.
 */
export interface GamepadPollScheduler {
  start(tick: () => void): () => void
}

/**
 * The production scheduler: one `requestAnimationFrame` loop.
 *
 * A frame loop rather than a timer because the browser already throttles it in a
 * hidden tab, which is exactly the behaviour wanted: a backgrounded host stops
 * polling, and when it comes back the visibility re-prime means a button held
 * throughout cannot buzz on the first frame back.
 *
 * Falls back to a no-op scheduler where `requestAnimationFrame` is absent, which
 * degrades to "controller input does nothing" rather than to a crash.
 */
export function animationFramePollScheduler(): GamepadPollScheduler {
  return {
    start(tick: () => void): () => void {
      if (typeof requestAnimationFrame !== 'function') return () => {}
      let running = true
      let handle = 0
      const loop = () => {
        if (!running) return
        tick()
        // Re-scheduled AFTER the tick, so a slow tick cannot queue up frames.
        if (running) handle = requestAnimationFrame(loop)
      }
      handle = requestAnimationFrame(loop)
      return () => {
        if (!running) return
        running = false
        if (typeof cancelAnimationFrame === 'function') cancelAnimationFrame(handle)
      }
    },
  }
}

export interface UseGamepadBuzzInputOptions {
  /** Whether the host has controller buzzing switched on. */
  readonly enabled: boolean
  /** True while the mapping editor is capturing a button — buzzing is suspended. */
  readonly capturing: boolean
  /**
   * Explicit setup/test mode (Slice 10). While active, edges resolve against the
   * applied mapping and are reported — never translated or dispatched.
   */
  readonly testMode?: boolean
  readonly mapping: GamepadMapping
  /** The live response opportunity, or `null` when no clue is open. */
  readonly target: ResponseOpportunityTarget | null
  readonly dispatch: (command: SessionCommand) => DispatchResult
  /** Injectable clock — the dispatch edge (ADR-007 §1). */
  readonly clock?: Clock
  /** Injectable Gamepad source. Defaults to this browser's Gamepad API. */
  readonly source?: GamepadSource
  /** Injectable poll scheduler. Defaults to one `requestAnimationFrame` loop. */
  readonly scheduler?: GamepadPollScheduler
  /** Told about every fresh press, so the host can explain one that did nothing. */
  readonly onOutcome?: (outcome: GamepadBuzzOutcome) => void
  /** Told when the STABLE picture changes. Never called per frame. */
  readonly onDiagnostics?: (diagnostics: GamepadDiagnostics) => void
  /** Told about the first fresh press while capturing. Suppresses gameplay. */
  readonly onCapture?: (control: GamepadControlRef) => void
  /**
   * Opaque token from an external lifecycle owner (e.g. WebHID keep-alive).
   * Any change forces a Gamepad edge-baseline re-prime without creating a second
   * poll loop.
   */
  readonly reprimeToken?: number
}

export function useGamepadBuzzInput({
  enabled,
  capturing,
  testMode = false,
  mapping,
  target,
  dispatch,
  clock = systemClock,
  source,
  scheduler,
  onOutcome,
  onDiagnostics,
  onCapture,
  reprimeToken = 0,
}: UseGamepadBuzzInputOptions): void {
  // Everything the loop reads lives in a ref, so the loop is registered ONCE and
  // is never torn down and rebuilt as game state changes. Re-registering a poll
  // loop on every store update would drop presses during exactly the moment a
  // class is buzzing.
  const latest = useRef({
    enabled,
    capturing,
    testMode,
    mapping,
    target,
    dispatch,
    clock,
    onOutcome,
    onDiagnostics,
    onCapture,
  })
  latest.current = {
    enabled,
    capturing,
    testMode,
    mapping,
    target,
    dispatch,
    clock,
    onOutcome,
    onDiagnostics,
    onCapture,
  }

  /** `null` means "re-prime": the next poll is a baseline and emits nothing. */
  const baseline = useRef<GamepadBaseline | null>(null)
  /** Last STABLE picture, as a comparable signature. Suppresses per-frame churn. */
  const lastDiagnosticsKey = useRef<string | null>(null)
  /** Non-null while a loop is registered. Makes a duplicate loop impossible. */
  const stop = useRef<(() => void) | null>(null)
  /**
   * Gate props that force a re-prime. Cleared synchronously during the render
   * that publishes the new gate into `latest`, so a rAF poll between commit and
   * the passive effect cannot treat a held or just-pressed button as a fresh
   * gameplay edge after leaving capture/test mode (or after enable/mapping change).
   */
  const gate = useRef({ enabled, capturing, testMode, mapping, reprimeToken })
  if (
    gate.current.enabled !== enabled ||
    gate.current.capturing !== capturing ||
    gate.current.testMode !== testMode ||
    gate.current.mapping !== mapping ||
    gate.current.reprimeToken !== reprimeToken
  ) {
    baseline.current = null
    gate.current = { enabled, capturing, testMode, mapping, reprimeToken }
  }

  // Resolved once each. Defaults are built here rather than in the parameter list
  // so a new object identity per render cannot restart the loop.
  const resolvedSource = useRef<GamepadSource | null>(null)
  if (resolvedSource.current === null) {
    resolvedSource.current = source ?? browserGamepadSource()
  }
  const resolvedScheduler = useRef<GamepadPollScheduler | null>(null)
  if (resolvedScheduler.current === null) {
    resolvedScheduler.current = scheduler ?? animationFramePollScheduler()
  }

  // ── Re-prime on every transition that could otherwise fabricate a press ─────
  // A held button must be RELEASED and pressed again after any of these.
  // (Defense in depth beside the synchronous gate clear above.)
  useEffect(() => {
    baseline.current = null
  }, [enabled, capturing, testMode, mapping, reprimeToken])

  useEffect(() => {
    const reprime = () => {
      baseline.current = null
    }
    window.addEventListener('gamepadconnected', reprime)
    window.addEventListener('gamepaddisconnected', reprime)
    window.addEventListener('focus', reprime)
    window.addEventListener('blur', reprime)
    document.addEventListener('visibilitychange', reprime)
    return () => {
      window.removeEventListener('gamepadconnected', reprime)
      window.removeEventListener('gamepaddisconnected', reprime)
      window.removeEventListener('focus', reprime)
      window.removeEventListener('blur', reprime)
      document.removeEventListener('visibilitychange', reprime)
    }
  }, [])

  // ── The one poll loop ──────────────────────────────────────────────────────
  useEffect(() => {
    // A second registration is refused rather than stacked. Under React's strict
    // double-invoke the cleanup below runs first, so this is a guard against a
    // real defect, not against strict mode.
    if (stop.current !== null) return

    const poll = () => {
      const current = latest.current
      const read = resolvedSource.current?.read() ?? { status: 'unsupported' as const }

      if (read.status !== 'ok') {
        // Unsupported or unreadable: the host is told, the baseline is dropped,
        // and nothing buzzes. A source that starts working again therefore starts
        // from a fresh baseline.
        baseline.current = null
        publishDiagnostics(current.onDiagnostics, lastDiagnosticsKey, {
          status: read.status,
          controllers: [],
        })
        return
      }

      const scan = scanGamepadEdges(baseline.current, read.snapshot)
      baseline.current = scan.baseline

      publishDiagnostics(current.onDiagnostics, lastDiagnosticsKey, {
        status: 'ok',
        controllers: read.snapshot.controllers.map((pad) => ({
          controllerIndex: pad.controllerIndex,
          buttonCount: pad.pressed.length,
          reportedId: pad.reportedId,
          reportedMapping: pad.reportedMapping,
          classification: classifyGamepadReportedId(pad.reportedId),
        })),
      })

      if (scan.edges.length === 0) return

      // Capture takes the FIRST fresh edge and consumes the whole poll. Nothing
      // reaches gameplay while a button is being assigned, and the rising edge
      // means a held button is captured once rather than continuously.
      if (current.capturing) {
        consumeCaptureEdge(scan.edges[0], current.onCapture, current.onOutcome)
        return
      }

      // Setup/test mode: resolve against the applied mapping and report only.
      // No translateLocalInput, no dispatch, no timer/queue/score side effects.
      if (current.testMode) {
        reportTestModeEdges(scan.edges, current.mapping, current.onOutcome)
        return
      }

      // Deterministic order: ascending controller index, then ascending button
      // index (`scanGamepadEdges`). The accepted order remains the event log's.
      dispatchGameplayEdges(scan.edges, current)
    }

    stop.current = resolvedScheduler.current?.start(poll) ?? null
    return () => {
      stop.current?.()
      stop.current = null
      baseline.current = null
      lastDiagnosticsKey.current = null
    }
  }, [])
}

/** Capture mode: one edge, no gameplay. */
function consumeCaptureEdge(
  edge: GamepadControlRef,
  onCapture: ((control: GamepadControlRef) => void) | undefined,
  onOutcome: ((outcome: GamepadBuzzOutcome) => void) | undefined,
): void {
  onCapture?.(edge)
  onOutcome?.({ kind: 'ignored', reason: 'capture-mode' })
}

/**
 * Setup/test mode: resolve mapping and report host-private observations only.
 * Never calls translateLocalInput or dispatch.
 */
function reportTestModeEdges(
  edges: readonly GamepadControlRef[],
  mapping: GamepadMapping,
  onOutcome: ((outcome: GamepadBuzzOutcome) => void) | undefined,
): void {
  for (const edge of edges) {
    const binding = resolveGamepadBinding(mapping, edge)
    if (binding === null) {
      onOutcome?.({ kind: 'ignored', reason: 'unmapped-button' })
      continue
    }
    onOutcome?.({
      kind: 'test-observation',
      teamId: binding.teamId,
      action: binding.action,
      control: edge,
    })
  }
}

type GameplayPollContext = {
  readonly enabled: boolean
  readonly mapping: GamepadMapping
  readonly target: ResponseOpportunityTarget | null
  readonly dispatch: (command: SessionCommand) => DispatchResult
  readonly clock: Clock
  readonly onOutcome: ((outcome: GamepadBuzzOutcome) => void) | undefined
}

/** Normal gameplay path for rising edges (not capture, not test mode). */
function dispatchGameplayEdges(
  edges: readonly GamepadControlRef[],
  current: GameplayPollContext,
): void {
  for (const edge of edges) {
    const translation = translateGamepadEdge(
      edge,
      current.mapping,
      { enabled: current.enabled, capturing: false },
      // The ONE clock read on this path, at the dispatch edge, and only when
      // there is genuinely an edge to stamp.
      current.clock.now(),
    )

    if (translation.status === 'ignored') {
      current.onOutcome?.({ kind: 'ignored', reason: translation.reason })
      continue
    }

    const command = translateLocalInput(translation.signal, current.target)
    if (command.status === 'rejected') {
      current.onOutcome?.({ kind: 'untranslated', reason: command.reason })
      continue
    }

    const result = current.dispatch(command.command)
    if (result.status === 'rejected') {
      current.onOutcome?.({ kind: 'refused', reason: result.reason })
      continue
    }
    current.onOutcome?.({ kind: 'accepted', teamId: translation.signal.teamId })
  }
}

/**
 * Tell the host about the stable picture, and only when it actually changed.
 *
 * Called on every poll, so the comparison matters: without it the host panel
 * would set state sixty times a second, repaint under the teacher's cursor, move
 * focus, and give a screen reader a stream of identical announcements. The
 * signature covers availability, controller indices, button counts, and bounded
 * identity/classification — never a button's pressed state.
 */
function publishDiagnostics(
  onDiagnostics: ((diagnostics: GamepadDiagnostics) => void) | undefined,
  lastKey: { current: string | null },
  diagnostics: GamepadDiagnostics,
): void {
  if (onDiagnostics === undefined) return
  const key = `${diagnostics.status}|${diagnostics.controllers
    .map((pad) => {
      const idPart =
        pad.reportedId.status === 'available' ? pad.reportedId.value : 'unavailable'
      const mappingPart =
        pad.reportedMapping.status === 'available' ? pad.reportedMapping.value : 'unavailable'
      return `${pad.controllerIndex}:${pad.buttonCount}:${idPart}:${mappingPart}:${pad.classification}`
    })
    .join(',')}`
  if (key === lastKey.current) return
  lastKey.current = key
  onDiagnostics(diagnostics)
}
