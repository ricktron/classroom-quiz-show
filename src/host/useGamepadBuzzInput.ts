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
import type { GamepadControlRef, GamepadMapping } from '../input/gamepadMapping'
import {
  browserGamepadSource,
  type GamepadReadStatus,
  type GamepadSource,
} from '../input/gamepadSource'
import {
  translateLocalInput,
  type LocalInputTranslationRejection,
  type ResponseOpportunityTarget,
} from '../input/commandTranslation'
import { systemClock, type Clock } from '../time/clock'

/**
 * The Gamepad polling LIFECYCLE OWNER (Slice 9).
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
 * polling adds no clock read to the reducer, the replay path or the timer.
 */

/** What happened to one physical press, end to end. Host-only diagnostics. */
export type GamepadBuzzOutcome =
  | { readonly kind: 'accepted'; readonly teamId: string }
  | { readonly kind: 'ignored'; readonly reason: GamepadIgnoreReason }
  | { readonly kind: 'untranslated'; readonly reason: LocalInputTranslationRejection }
  | { readonly kind: 'refused'; readonly reason: RejectionReason }

/** One connected controller, as the host panel needs to describe it. */
export interface GamepadControllerInfo {
  readonly controllerIndex: number
  readonly buttonCount: number
}

/**
 * What the host panel is told about the browser and the attached hardware.
 *
 * Deliberately the STABLE facts only — availability, which controllers exist and
 * how many buttons each has. Live button state is **not** here and is not
 * rendered anywhere: a display that changed every frame would defeat a screen
 * reader and would repaint the panel under a teacher's cursor sixty times a
 * second for no benefit.
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
}

export function useGamepadBuzzInput({
  enabled,
  capturing,
  mapping,
  target,
  dispatch,
  clock = systemClock,
  source,
  scheduler,
  onOutcome,
  onDiagnostics,
  onCapture,
}: UseGamepadBuzzInputOptions): void {
  // Everything the loop reads lives in a ref, so the loop is registered ONCE and
  // is never torn down and rebuilt as game state changes. Re-registering a poll
  // loop on every store update would drop presses during exactly the moment a
  // class is buzzing.
  const latest = useRef({
    enabled,
    capturing,
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
  useEffect(() => {
    baseline.current = null
  }, [enabled, capturing, mapping])

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
        controllers: read.snapshot.controllers.map((controller) => ({
          controllerIndex: controller.controllerIndex,
          buttonCount: controller.pressed.length,
        })),
      })

      if (scan.edges.length === 0) return

      // Capture takes the FIRST fresh edge and consumes the whole poll. Nothing
      // reaches gameplay while a button is being assigned, and the rising edge
      // means a held button is captured once rather than continuously.
      if (current.capturing) {
        current.onCapture?.(scan.edges[0])
        current.onOutcome?.({ kind: 'ignored', reason: 'capture-mode' })
        return
      }

      // Deterministic order: ascending controller index, then ascending button
      // index (`scanGamepadEdges`). The accepted order remains the event log's.
      for (const edge of scan.edges) {
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

    stop.current = resolvedScheduler.current?.start(poll) ?? null
    return () => {
      stop.current?.()
      stop.current = null
      baseline.current = null
      lastDiagnosticsKey.current = null
    }
  }, [])
}

/**
 * Tell the host about the stable picture, and only when it actually changed.
 *
 * Called on every poll, so the comparison matters: without it the host panel
 * would set state sixty times a second, repaint under the teacher's cursor, move
 * focus, and give a screen reader a stream of identical announcements. The
 * signature covers availability, the controller indices and their button counts —
 * never a button's state.
 */
function publishDiagnostics(
  onDiagnostics: ((diagnostics: GamepadDiagnostics) => void) | undefined,
  lastKey: { current: string | null },
  diagnostics: GamepadDiagnostics,
): void {
  if (onDiagnostics === undefined) return
  const key = `${diagnostics.status}|${diagnostics.controllers
    .map((controller) => `${controller.controllerIndex}:${controller.buttonCount}`)
    .join(',')}`
  if (key === lastKey.current) return
  lastKey.current = key
  onDiagnostics(diagnostics)
}
