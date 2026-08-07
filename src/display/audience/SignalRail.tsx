/**
 * Signal Rail — Compact, Expanded, or Final. Exactly one mode.
 *
 * Facts come only from sanitized public DTOs. Never shows queue order,
 * waiting-team identities, Final eligibility, or unrevealed content.
 *
 * Final stages that carry a public timer render the shared FinalCountdown
 * as the primary countdown (Slice 18 R1).
 */

import { BuzzQueueDisplay } from '../BuzzQueueDisplay'
import { ResponseTimerDisplay } from '../ResponseTimerDisplay'
import { FinalCountdown } from '../FinalWagerDisplay'
import type {
  PublicFinalWagerState,
  PublicResponseState,
  PublicRoundState,
  PublicTeamsState,
} from '../../state/publicState'
import { PUBLIC_FINAL_KIND } from '../../state/publicState'
import type { Clock } from '../../time/clock'
import type { SignalRailMode } from './selectAudiencePresentation'

export interface SignalRailProps {
  readonly mode: SignalRailMode
  readonly response: PublicResponseState | null
  readonly teams: PublicTeamsState | null
  readonly round: PublicRoundState | null
  readonly hostClockOffsetMs?: number
  readonly clock?: Clock
  readonly revealedTeamName: string | null
}

/** Tie-aware Final rail status derived from the public Final DTO alone. */
function finalRailStatus(round: PublicFinalWagerState): string {
  switch (round.stage) {
    case 'setup':
      return 'Final ready'
    case 'wager-entry':
      return 'Final wager open'
    case 'wagers-locked':
      return 'Wagers locked'
    case 'response-entry':
      return 'Final response open'
    case 'responses-locked':
      return 'Responses locked'
    case 'answer-revealed':
      return 'Final answer revealed'
    case 'team-reveal':
      return 'Team reveal'
    case 'resolution':
      return round.outcome === 'tied' ? 'Tied result' : 'Final settlement'
    case 'sudden-death':
      return 'Sudden death'
    case 'complete':
      return round.outcome === 'tied' ? 'Game complete — tied' : 'Game complete'
  }
}

function finalPublicTimer(round: PublicFinalWagerState) {
  if (round.stage === 'wager-entry' || round.stage === 'response-entry') {
    return round.timer
  }
  return null
}

export function SignalRail({
  mode,
  response,
  teams,
  round,
  hostClockOffsetMs = 0,
  clock,
  revealedTeamName,
}: SignalRailProps) {
  if (mode === 'hidden') return null

  if (mode === 'final' && round?.kind === PUBLIC_FINAL_KIND) {
    const timer = finalPublicTimer(round)
    return (
      <aside
        className="signal-rail signal-rail--final"
        data-testid="signal-rail"
        data-mode="final"
        aria-label="Final status"
      >
        <p className="signal-rail__status" data-testid="signal-rail-status">
          {finalRailStatus(round)}
        </p>
        {revealedTeamName !== null && (
          <p className="signal-rail__revealed" data-testid="signal-rail-revealed">
            {revealedTeamName}
          </p>
        )}
        {timer !== null && (
          <FinalCountdown
            timer={timer}
            hostClockOffsetMs={hostClockOffsetMs}
            clock={clock}
            className="signal-rail__timer"
            testId="signal-rail-timer"
          />
        )}
      </aside>
    )
  }

  if (mode === 'expanded' && response) {
    return (
      <aside
        className="signal-rail signal-rail--expanded"
        data-testid="signal-rail"
        data-mode="expanded"
        aria-label="Response status"
      >
        <ResponseTimerDisplay
          response={response}
          hostClockOffsetMs={hostClockOffsetMs}
          clock={clock}
        />
        <BuzzQueueDisplay buzz={response.buzz} teams={teams} />
      </aside>
    )
  }

  return (
    <aside
      className="signal-rail signal-rail--compact"
      data-testid="signal-rail"
      data-mode="compact"
      aria-label="Display status"
    >
      {response ? (
        <>
          <ResponseTimerDisplay
            response={response}
            hostClockOffsetMs={hostClockOffsetMs}
            clock={clock}
          />
          {response.buzz.status !== 'none' ? (
            <BuzzQueueDisplay buzz={response.buzz} teams={teams} />
          ) : (
            <p className="signal-rail__status" data-testid="signal-rail-status">
              {response.armed ? 'Response armed' : 'Response ready'}
            </p>
          )}
        </>
      ) : (
        <p className="signal-rail__status" data-testid="signal-rail-status">
          Ready
        </p>
      )}
    </aside>
  )
}
