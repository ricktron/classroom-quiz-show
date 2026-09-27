/**
 * Signal Rail — Compact, Expanded, or Final. Exactly one mode.
 *
 * Signature object: a thin spanning **team-segmented channel rail** (public teams
 * only) plus event/status content. Adaptive Score Column / Strip / Deck remain
 * separate TeamScoreboard layouts — this rail does not replace scores.
 *
 * Facts come only from sanitized public DTOs. Never shows queue order,
 * waiting-team identities, Final eligibility, or unrevealed content.
 *
 * Final stages that carry a public timer render the shared FinalCountdown
 * as the primary countdown (Slice 18 R1).
 *
 * When a response opportunity exists, Compact and Expanded share one tree so
 * {@link BuzzQueueDisplay} stays mounted across `none → active` (it may render
 * null while status is `none`). That lets acknowledgement ownership observe a
 * real identity transition instead of remounting into an already-active claim.
 */

import { BuzzQueueDisplay } from '../BuzzQueueDisplay'
import { BoardOutcomeDisplay } from '../BoardOutcomeDisplay'
import { ResponseTimerDisplay } from '../ResponseTimerDisplay'
import { FinalCountdown } from '../FinalWagerDisplay'
import type {
  PublicFinalWagerState,
  PublicResponseState,
  PublicRoundState,
  PublicTeam,
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

const KNOWN_ACCENTS: readonly string[] = [
  'crimson',
  'azure',
  'emerald',
  'amber',
  'violet',
  'teal',
  'rose',
  'slate',
]

function accentClass(accent: string): string {
  return KNOWN_ACCENTS.includes(accent) ? ` accent--${accent}` : ''
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

/**
 * Public-safe per-channel status. Never invents waiting-queue identities —
 * only the active claim team (when present) is marked Answering.
 */
function channelStatus(
  team: PublicTeam,
  response: PublicResponseState | null,
  revealedTeamName: string | null,
): string {
  if (response?.buzz.status === 'active' && response.buzz.activeTeamKey === team.key) {
    return 'Answering'
  }
  if (revealedTeamName !== null && revealedTeamName === team.name) {
    return 'Revealed'
  }
  if (response?.boardOutcome.status === 'resolved' && response.boardOutcome.teamKey === team.key) {
    if (response.boardOutcome.kind === 'correct') return 'Correct'
    if (response.boardOutcome.kind === 'incorrect') return 'Incorrect'
    if (response.boardOutcome.kind === 'passed') return 'Passed'
  }
  if (response?.armed) return 'Ready'
  return 'Ready'
}

/**
 * Thin team-segmented signature strip. Fails closed (omitted) when teams are
 * unavailable or absent — never invents channels.
 */
function TeamChannelRail({
  teams,
  response,
  revealedTeamName,
}: {
  readonly teams: PublicTeamsState | null
  readonly response: PublicResponseState | null
  readonly revealedTeamName: string | null
}) {
  if (teams === null || teams.status !== 'available' || teams.teams.length === 0) {
    return null
  }

  return (
    <div
      className="signal-rail__channels"
      data-testid="signal-rail-channels"
      aria-label="Team channels"
    >
      {teams.teams.map((team) => {
        const status = channelStatus(team, response, revealedTeamName)
        const answering =
          response?.buzz.status === 'active' && response.buzz.activeTeamKey === team.key
        return (
          <div
            key={team.key}
            className={`signal-rail__channel${accentClass(team.accent)}${
              answering ? ' signal-rail__channel--answering' : ''
            }`}
            data-testid={`signal-rail-channel-${team.key}`}
            data-channel-status={status.toLowerCase()}
          >
            <span className="signal-rail__channel-accent" aria-hidden="true" />
            <span className="signal-rail__channel-name">{team.name}</span>
            <span className="signal-rail__channel-status">{status}</span>
          </div>
        )
      })}
    </div>
  )
}

function EventBody({
  mode,
  response,
  teams,
  round,
  hostClockOffsetMs,
  clock,
  revealedTeamName,
}: SignalRailProps) {
  if (mode === 'final' && round?.kind === PUBLIC_FINAL_KIND) {
    const timer = finalPublicTimer(round)
    return (
      <div className="signal-rail__event" data-testid="signal-rail-event">
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
      </div>
    )
  }

  if (response && (mode === 'compact' || mode === 'expanded')) {
    const buzzNone = response.buzz.status === 'none'
    const correctClosed =
      response.boardOutcome.status === 'resolved' && response.boardOutcome.kind === 'correct'
    const showIntakeReady = buzzNone && !correctClosed
    return (
      <div className="signal-rail__event" data-testid="signal-rail-event">
        {!correctClosed ? (
          <ResponseTimerDisplay
            response={response}
            hostClockOffsetMs={hostClockOffsetMs ?? 0}
            clock={clock}
          />
        ) : null}
        {showIntakeReady ? (
          <p
            className={`signal-rail__status${response.armed ? ' signal-rail__status--armed' : ''}`}
            data-testid="signal-rail-status"
            data-buzz-ready={response.armed ? 'armed' : 'ready'}
          >
            {response.armed ? 'Waiting for a buzz' : 'Response ready'}
          </p>
        ) : null}
        <BuzzQueueDisplay buzz={response.buzz} teams={teams} />
        <BoardOutcomeDisplay
          boardOutcome={response.boardOutcome}
          teams={teams}
          activeClaimPresent={response.buzz.status === 'active'}
        />
      </div>
    )
  }

  return (
    <div className="signal-rail__event" data-testid="signal-rail-event">
      <p className="signal-rail__status" data-testid="signal-rail-status">
        Ready
      </p>
    </div>
  )
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

  const railMode =
    mode === 'final' && round?.kind === PUBLIC_FINAL_KIND
      ? 'final'
      : response && (mode === 'compact' || mode === 'expanded')
        ? mode
        : 'compact'

  return (
    <aside
      className={`signal-rail signal-rail--${railMode}`}
      data-testid="signal-rail"
      data-mode={railMode}
      aria-label={
        railMode === 'final'
          ? 'Final status'
          : railMode === 'expanded'
            ? 'Response status'
            : 'Display status'
      }
    >
      <TeamChannelRail
        teams={teams}
        response={response}
        revealedTeamName={revealedTeamName}
      />
      <EventBody
        mode={mode}
        response={response}
        teams={teams}
        round={round}
        hostClockOffsetMs={hostClockOffsetMs}
        clock={clock}
        revealedTeamName={revealedTeamName}
      />
    </aside>
  )
}
