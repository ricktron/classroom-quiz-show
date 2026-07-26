import type { PublicResponseState } from '../state/publicState'
import { describeRemaining, formatRemaining } from '../time/duration'
import { useResponseCountdown } from './useResponseCountdown'
import type { Clock } from '../time/clock'
import './ResponseTimerDisplay.css'

/**
 * The projector view of the response phase (Slice 7).
 *
 * It renders the sanitized `PublicResponseState` and nothing else: an armed
 * indicator, a status word, and a countdown derived locally from the published
 * deadline. It has no access to the private phase, no timer of its own, and no
 * authority — reaching 0:00 does not expire anything, it simply shows 0:00 until
 * the host says the window ended.
 *
 * ## Readable, not decorative
 *
 * Every state is stated in WORDS as well as by colour and position — "Armed",
 * "Paused", "Time up", "Stopped" — because a washed-out projector at the back of
 * a classroom loses colour long before it loses text, and because colour alone
 * excludes colour-blind students. The countdown is the largest thing on the
 * panel for the same reason.
 *
 * ## Motion
 *
 * The only animation is a slow pulse under the final ten seconds, and it is
 * disabled outright under `prefers-reduced-motion` (see the stylesheet). Nothing
 * flashes, nothing moves faster than once a second, and no animation carries
 * information that the text does not: motion is emphasis here, never meaning, and
 * an animation ending never advances the game.
 *
 * ## Privacy
 *
 * There is nothing host-only to leak: the DTO carries no timer id, no
 * interruption source, no controls and no authored configuration. "Stopped" is as
 * much as the class is told about why a window ended.
 */

export interface ResponseTimerDisplayProps {
  readonly response: PublicResponseState
  /** Estimated host−display clock offset, from the receiver. */
  readonly hostClockOffsetMs?: number
  /** Injectable clock — tests drive the countdown instead of waiting for it. */
  readonly clock?: Clock
}

/** Public status copy. Deliberately neutral: it never says who or why. */
const STATUS_LABEL = {
  idle: 'Ready',
  running: 'Time remaining',
  paused: 'Paused',
  expired: 'Time up',
  interrupted: 'Stopped',
} as const

/** Below this many milliseconds the countdown is emphasised. */
const URGENT_THRESHOLD_MS = 10_000

export function ResponseTimerDisplay({
  response,
  hostClockOffsetMs = 0,
  clock,
}: ResponseTimerDisplayProps) {
  const { armed, timer } = response
  const remainingMs = useResponseCountdown(timer, hostClockOffsetMs, clock)
  const status = timer.status
  const showsClock = status !== 'idle'
  const urgent = status === 'running' && remainingMs <= URGENT_THRESHOLD_MS

  return (
    <section
      className={`rtd rtd--${status}${urgent ? ' rtd--urgent' : ''}`}
      data-testid="rtd"
      data-status={status}
      data-armed={armed ? 'armed' : 'disarmed'}
      aria-label="Response timer"
    >
      <p className="rtd__armed" data-testid="rtd-armed">
        {/*
          A dot alone would be colour-only information, so the word carries the
          meaning and the dot is decorative.
        */}
        <span className="rtd__armed-dot" aria-hidden="true" />
        {armed ? 'Buzzers armed' : 'Buzzers not armed'}
      </p>

      <p className="rtd__status" data-testid="rtd-status">
        {STATUS_LABEL[status]}
      </p>

      {showsClock && (
        <p
          className="rtd__clock"
          data-testid="rtd-clock"
          role="timer"
          /*
            The visible text is `M:SS`; the accessible name spells the duration
            out, because "1:05" read literally is ambiguous. The region is
            `polite` and coarse on purpose — a countdown announced every second
            would make the projector unusable with a screen reader, so the label
            updates while the live announcements stay at the status level.
          */
          aria-label={`${STATUS_LABEL[status]}: ${describeRemaining(remainingMs)}`}
        >
          {formatRemaining(remainingMs)}
        </p>
      )}
    </section>
  )
}
