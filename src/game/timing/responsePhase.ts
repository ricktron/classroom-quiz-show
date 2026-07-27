/**
 * The response phase — arming, the timer, and the typed interruption seam
 * (Slice 7).
 *
 * A **response phase** is the window in which a class may answer the clue that is
 * currently public. It is SESSION state, derived purely by replaying the
 * append-only event log; nothing here is authored content and nothing here is
 * cached. It holds two facts:
 *
 *  - `armed` — whether an interrupting input would be accepted. Slice 7 built
 *    this before any input existed so that Slice 8 would add a *source* rather
 *    than a state machine; that is exactly what happened. Arming is still manual
 *    and host-controlled (OG-1), and it is now also the INTAKE GATE for the buzz
 *    queue: a press while disarmed appends nothing.
 *  - `timer` — the countdown, as a discriminated union of durable FACTS.
 *  - `queue` — the ordered buzz queue for this response opportunity (Slice 8,
 *    OG-2/OG-3). See `buzzQueue.ts`.
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
 * No device, no button, no key code, no mapping and no input adapter. Slice 8
 * added the queue — a GAME fact about which teams claimed the clue and in what
 * order — and deliberately nothing about the hardware that produced it. Physical
 * input identity stays on the adapter side of the `ROADMAP-AMENDMENT-001` §5.6
 * boundary, in `src/input/`.
 */

import { clampDuration, remainingSeconds } from '../../time/duration'
import { EMPTY_BUZZ_QUEUE, isEmptyBuzzQueue, type BuzzQueueState } from './buzzQueue'

/**
 * WHY a timed response window stopped early — the typed interruption seam
 * required by `ROADMAP-AMENDMENT-001` §5.4.
 *
 * It is a discriminated union, not a string, for exactly the reason `ScoreSource`
 * is (ADR-006 §10): the reason has to stay explainable months later, and a later
 * slice must be able to add a cause without changing the event vocabulary or
 * re-cutting the seam.
 *
 * Slice 7 implemented the only source that existed then — the host — and
 * predicted that `{ kind: 'team-buzz' }` would be an ADDITION here rather than a
 * rewrite. **Slice 8 is that addition, and it cost exactly one member:** no event
 * type changed, no reducer transition changed, no public field changed, and the
 * seam was not re-cut. That is the property ADR-007 §5 was built for.
 *
 * The source is deliberately NOT projected (ADR-007 §11): the class sees that a
 * window stopped, and learns who is answering from the buzz queue projection
 * instead — one public fact, from one place.
 *
 * Unrecognized values fail closed at the command boundary
 * ({@link isResponseInterruptionSource}), so an arbitrary string can never reach
 * a durable event.
 */
export const RESPONSE_INTERRUPTION_KINDS = ['host', 'team-buzz'] as const

export type ResponseInterruptionKind = (typeof RESPONSE_INTERRUPTION_KINDS)[number]

export type ResponseInterruptionSource =
  | {
      /** `host` — the teacher stopped the response window from the host controls. */
      readonly kind: 'host'
    }
  | {
      /**
       * `team-buzz` — the FIRST accepted buzz of an armed response opportunity
       * stopped the clock (Slice 8).
       *
       * It names no team, no device and no key: which team buzzed is recorded by
       * the `TEAM_BUZZED` event beside it, and duplicating it here would create
       * two sources of truth for the same fact. Subsequent buzzes do not
       * interrupt again — the timer is already interrupted, so the transition is
       * structurally unavailable rather than merely suppressed.
       */
      readonly kind: 'team-buzz'
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

/** The teacher stopped the window from the host controls. */
export const HOST_INTERRUPTION: ResponseInterruptionSource = Object.freeze({ kind: 'host' })

/** The first accepted buzz stopped the window (Slice 8). */
export const TEAM_BUZZ_INTERRUPTION: ResponseInterruptionSource = Object.freeze({
  kind: 'team-buzz',
})

/** Host-facing label for an interruption source. Host-only copy — never projected. */
export const RESPONSE_INTERRUPTION_LABEL: Readonly<Record<ResponseInterruptionKind, string>> = {
  host: 'stopped by the host',
  'team-buzz': 'stopped by a buzz',
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

/** Arming, the timer and the queue: the complete response phase for one clue. */
export interface ResponsePhaseState {
  /**
   * Whether an interrupting input would be accepted. Host-controlled (OG-1), and
   * since Slice 8 also the intake gate for {@link ResponsePhaseState.queue}: a
   * buzz while disarmed is rejected and appends nothing.
   */
  readonly armed: boolean
  readonly timer: ResponseTimerState
  /**
   * The ordered buzz queue for THIS response opportunity (Slice 8).
   *
   * It lives inside the phase rather than beside it so that every rule the phase
   * already has applies to it for free: the queue is cleared by exactly the
   * transitions that clear the phase (a new tile, the answer reveal, a return to
   * the board, a round change, a reset, the game ending — ADR-007 §8), it is
   * derived by replay, and it undoes exactly. A queue can therefore never outlive
   * the clue it belongs to.
   */
  readonly queue: BuzzQueueState
}

/** A clue that has not been armed and has no timer. */
export const IDLE_RESPONSE_TIMER: ResponseTimerState = Object.freeze({ status: 'idle' })

export const INITIAL_RESPONSE_PHASE_STATE: ResponsePhaseState = Object.freeze({
  armed: false,
  timer: IDLE_RESPONSE_TIMER,
  queue: EMPTY_BUZZ_QUEUE,
})

/**
 * Is this phase in its initial state? Used to decide whether there is anything to
 * reset and whether there is anything worth projecting to the display.
 *
 * A phase holding a queue is NOT initial even if it was since disarmed and its
 * clock never ran — somebody buzzed, and that is a fact worth showing and worth
 * being able to reset.
 */
export function isInitialResponsePhase(phase: ResponsePhaseState): boolean {
  return !phase.armed && phase.timer.status === 'idle' && isEmptyBuzzQueue(phase.queue)
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
