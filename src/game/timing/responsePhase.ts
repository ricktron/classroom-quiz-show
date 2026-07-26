/**
 * The response phase — arming, the timer, and the typed interruption seam
 * (Slice 7).
 *
 * A **response phase** is the window in which a class may answer the clue that is
 * currently public. It is SESSION state, derived purely by replaying the
 * append-only event log; nothing here is authored content and nothing here is
 * cached. It holds two facts:
 *
 *  - `armed` — whether an interrupting input would be accepted. Today nothing can
 *    interrupt except the host, because no input adapter exists; arming is
 *    nonetheless first-class durable state so that a later slice adds a *source*
 *    rather than a state machine.
 *  - `timer` — the countdown, as a discriminated union of durable FACTS.
 *
 * ## Durable facts, derived countdown
 *
 * The timer state never stores "seconds remaining". A running timer stores when
 * it started and the absolute instant it ends; a paused timer stores how much was
 * left when it was paused. "How long is left right now" is derived at the
 * rendering edge from those facts plus a clock (`remainingMsAt` below), so the
 * event log has no tick stream in it and replay never reads a clock. See
 * `ROADMAP-AMENDMENT-001` §5.2 and ADR-007.
 *
 * ## Why one union rather than booleans
 *
 * `{ status: 'running' | 'paused' | … }` makes impossible states unrepresentable:
 * there is no `isPaused && isExpired` to get out of step, a paused timer
 * structurally cannot carry a deadline, and a running timer structurally cannot
 * carry a leftover remaining value. Same reasoning as `CategoryBoardProgress`.
 *
 * ## What is deliberately NOT here
 *
 * No team, no queue, no queue position, no device, no button, no input adapter
 * and no buzz event. Slice 7 builds the seam an interrupting input will later
 * pass through; it does not build the input. See "Future compatibility" below.
 */

import { clampDuration, remainingSeconds } from '../../time/duration'

/**
 * WHY a timed response window stopped early — the typed interruption seam
 * required by `ROADMAP-AMENDMENT-001` §5.4.
 *
 * It is a discriminated union, not a string, for exactly the reason `ScoreSource`
 * is (ADR-006 §10): the reason has to stay explainable months later, and a later
 * slice must be able to add a cause without changing the event vocabulary or
 * re-cutting the seam.
 *
 * Slice 7 implements the only source that exists today — the host. A future
 * `{ kind: 'team-buzz', … }` member is an addition here plus its own resolution
 * rule; every event, reducer transition and public projection below already
 * treats "the window was interrupted" as a first-class outcome that does NOT
 * necessarily end the clue.
 *
 * Unrecognized values fail closed at the command boundary
 * ({@link isResponseInterruptionSource}), so an arbitrary string can never reach
 * a durable event.
 */
export const RESPONSE_INTERRUPTION_KINDS = ['host'] as const

export type ResponseInterruptionKind = (typeof RESPONSE_INTERRUPTION_KINDS)[number]

export type ResponseInterruptionSource = {
  /** `host` — the teacher stopped the response window from the host controls. */
  readonly kind: 'host'
}

const RESPONSE_INTERRUPTION_KIND_SET: ReadonlySet<string> = new Set(RESPONSE_INTERRUPTION_KINDS)

/** Structural guard for an interruption source. Used at the command boundary. */
export function isResponseInterruptionSource(
  value: unknown,
): value is ResponseInterruptionSource {
  if (typeof value !== 'object' || value === null) return false
  const v = value as Record<string, unknown>
  return typeof v.kind === 'string' && RESPONSE_INTERRUPTION_KIND_SET.has(v.kind)
}

/** The one interruption source Slice 7 can produce. */
export const HOST_INTERRUPTION: ResponseInterruptionSource = Object.freeze({ kind: 'host' })

/** Host-facing label for an interruption source. Host-only copy — never projected. */
export const RESPONSE_INTERRUPTION_LABEL: Readonly<Record<ResponseInterruptionKind, string>> = {
  host: 'stopped by the host',
}

/** Every timer status, as a bounded list. */
export const RESPONSE_TIMER_STATUSES = [
  'idle',
  'running',
  'paused',
  'expired',
  'interrupted',
] as const

export type ResponseTimerStatus = (typeof RESPONSE_TIMER_STATUSES)[number]

/**
 * The timer as durable facts.
 *
 *  - `idle`        — no timer has been started for this clue.
 *  - `running`     — started at `startedAt`, ends at the absolute `deadline`.
 *  - `paused`      — `remainingMs` was frozen at the moment of the pause. No
 *                    deadline exists while paused, so wall-clock time passing
 *                    (or a replay happening a week later) changes nothing.
 *  - `expired`     — the deadline was reached and the HOST recorded it. This is
 *                    the only authoritative expiry; a display never produces it.
 *  - `interrupted` — the window was stopped early, with a typed source and the
 *                    time that was left. Interruption deliberately does NOT end
 *                    the clue: the host may reset the phase and run another
 *                    window, which is what a future "next team in the queue"
 *                    behaviour will need.
 *
 * `timerId` identifies one countdown across its whole life (a pause and resume
 * keep it), so a timeout callback can prove it belongs to the timer that is
 * actually live. `durationMs` is retained in every non-idle state so the
 * projector can draw a progress proportion without a second lookup.
 */
export type ResponseTimerState =
  | { readonly status: 'idle' }
  | {
      readonly status: 'running'
      readonly timerId: string
      readonly durationMs: number
      readonly startedAt: number
      readonly deadline: number
    }
  | {
      readonly status: 'paused'
      readonly timerId: string
      readonly durationMs: number
      readonly remainingMs: number
    }
  | {
      readonly status: 'expired'
      readonly timerId: string
      readonly durationMs: number
      readonly deadline: number
    }
  | {
      readonly status: 'interrupted'
      readonly timerId: string
      readonly durationMs: number
      readonly remainingMs: number
      readonly source: ResponseInterruptionSource
    }

/** Arming plus the timer: the complete response phase for one clue. */
export interface ResponsePhaseState {
  /** Whether an interrupting input would be accepted. Host-controlled (OG-1). */
  readonly armed: boolean
  readonly timer: ResponseTimerState
}

/** A clue that has not been armed and has no timer. */
export const IDLE_RESPONSE_TIMER: ResponseTimerState = Object.freeze({ status: 'idle' })

export const INITIAL_RESPONSE_PHASE_STATE: ResponsePhaseState = Object.freeze({
  armed: false,
  timer: IDLE_RESPONSE_TIMER,
})

/**
 * Is this phase in its initial state? Used to decide whether there is anything to
 * reset and whether there is anything worth projecting to the display.
 */
export function isInitialResponsePhase(phase: ResponsePhaseState): boolean {
  return !phase.armed && phase.timer.status === 'idle'
}

/** Does this timer state still describe a live countdown (running or paused)? */
export function isLiveTimer(timer: ResponseTimerState): boolean {
  return timer.status === 'running' || timer.status === 'paused'
}

/**
 * How much time is left, in milliseconds, at the given instant.
 *
 * This is THE derivation the whole design rests on: the countdown a teacher and a
 * class see is computed here from durable facts plus a clock reading supplied by
 * the caller, and it is never stored, never broadcast per frame, and never
 * written to an event.
 *
 * It is a pure function of its arguments — it does not read a clock itself, so a
 * test can ask "what would the projector show 12 seconds in?" without waiting.
 * The result is always clamped to `0 … durationMs`: a countdown never shows a
 * negative number in front of a class, and a corrected clock cannot make it show
 * more than the window that was actually started.
 */
export function remainingMsAt(timer: ResponseTimerState, now: number): number {
  switch (timer.status) {
    case 'running':
      return clampDuration(timer.deadline - now, 0, timer.durationMs)
    case 'paused':
    case 'interrupted':
      return clampDuration(timer.remainingMs, 0, timer.durationMs)
    case 'expired':
      return 0
    case 'idle':
    default:
      return 0
  }
}

/** Whole seconds remaining, rounded UP so "1" is shown until 0 is really reached. */
export function remainingSecondsAt(timer: ResponseTimerState, now: number): number {
  return remainingSeconds(remainingMsAt(timer, now))
}
