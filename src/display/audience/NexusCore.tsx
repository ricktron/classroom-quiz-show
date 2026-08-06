/**
 * Persistent Nexus Core — answers "where are we right now?" from public facts.
 *
 * Shows product identity, public round ordinal, stage status, and a compact
 * public timer indicator when a response or Final timer is on the wire.
 * The Signal Rail owns the primary countdown digits so the Nexus stays a
 * compact status companion rather than a second competing clock.
 */

import type { PublicResponseTimer } from '../../state/publicState'
import { useResponseCountdown } from '../useResponseCountdown'
import { describeRemaining, formatRemaining } from '../../time/duration'
import type { Clock } from '../../time/clock'
import type { NexusCorePresentation } from './selectAudiencePresentation'

export interface NexusCoreProps {
  readonly nexus: NexusCorePresentation
  /** Public response or Final timer, or null when none exists on the wire. */
  readonly timer?: PublicResponseTimer | null
  readonly hostClockOffsetMs?: number
  readonly clock?: Clock
}

const TIMER_STATUS_LABEL = {
  idle: 'Ready',
  running: 'Time remaining',
  paused: 'Paused',
  expired: 'Time up',
  interrupted: 'Stopped',
} as const

function NexusTimerIndicator({
  timer,
  hostClockOffsetMs,
  clock,
}: {
  readonly timer: PublicResponseTimer
  readonly hostClockOffsetMs: number
  readonly clock?: Clock
}) {
  const remainingMs = useResponseCountdown(timer, hostClockOffsetMs, clock)
  const status = timer.status
  const label = TIMER_STATUS_LABEL[status]
  const showDigits = status !== 'idle'

  return (
    <div
      className={`nexus__timer nexus__timer--${status}`}
      data-testid="nexus-timer"
      data-status={status}
      aria-label={showDigits ? `${label}: ${describeRemaining(remainingMs)}` : label}
    >
      <span className="nexus__timer-status" data-testid="nexus-timer-status">
        {label}
      </span>
      {showDigits && (
        <span className="nexus__timer-clock" data-testid="nexus-timer-clock">
          {formatRemaining(remainingMs)}
        </span>
      )}
    </div>
  )
}

export function NexusCore({
  nexus,
  timer = null,
  hostClockOffsetMs = 0,
  clock,
}: NexusCoreProps) {
  return (
    <section className="nexus" data-testid="nexus-core" aria-label="Game status">
      <p className="nexus__brand" data-testid="nexus-brand">
        {nexus.brand}
      </p>
      {nexus.roundLabel !== null && (
        <p className="nexus__round" data-testid="nexus-round">
          {nexus.roundLabel}
        </p>
      )}
      <p className="nexus__stage" data-testid="nexus-stage">
        {nexus.stageLabel}
      </p>
      {nexus.detail !== null && nexus.detail.length > 0 && (
        <p className="nexus__detail" data-testid="nexus-detail">
          {nexus.detail}
        </p>
      )}
      {timer !== null && (
        <NexusTimerIndicator
          timer={timer}
          hostClockOffsetMs={hostClockOffsetMs}
          clock={clock}
        />
      )}
    </section>
  )
}
