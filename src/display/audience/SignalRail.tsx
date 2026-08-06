/**
 * Signal Rail — Compact, Expanded, or Final. Exactly one mode.
 *
 * Facts come only from sanitized public DTOs. Never shows queue order,
 * waiting-team identities, Final eligibility, or unrevealed content.
 */

import { BuzzQueueDisplay } from '../BuzzQueueDisplay'
import { ResponseTimerDisplay } from '../ResponseTimerDisplay'
import type {
  PublicFinalWagerState,
  PublicResponseState,
  PublicRoundState,
  PublicTeamsState,
} from '../../state/publicState'
import { PUBLIC_FINAL_KIND } from '../../state/publicState'
import type { SignalRailMode } from './selectAudiencePresentation'

export interface SignalRailProps {
  readonly mode: SignalRailMode
  readonly response: PublicResponseState | null
  readonly teams: PublicTeamsState | null
  readonly round: PublicRoundState | null
  readonly hostClockOffsetMs?: number
  readonly finalStageLabel: string | null
  readonly revealedTeamName: string | null
}

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

export function SignalRail({
  mode,
  response,
  teams,
  round,
  hostClockOffsetMs = 0,
  finalStageLabel,
  revealedTeamName,
}: SignalRailProps) {
  if (mode === 'hidden') return null

  if (mode === 'final' && round?.kind === PUBLIC_FINAL_KIND) {
    return (
      <aside
        className="signal-rail signal-rail--final"
        data-testid="signal-rail"
        data-mode="final"
        aria-label="Final status"
      >
        <p className="signal-rail__status" data-testid="signal-rail-status">
          {finalStageLabel ?? finalRailStatus(round)}
        </p>
        {revealedTeamName !== null && (
          <p className="signal-rail__revealed" data-testid="signal-rail-revealed">
            {revealedTeamName}
          </p>
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
