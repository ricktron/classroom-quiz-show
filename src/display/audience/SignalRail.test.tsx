import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { SignalRail } from './SignalRail'
import {
  PUBLIC_BOARD_KIND,
  PUBLIC_FINAL_KIND,
  type PublicResponseState,
  type PublicTeamsState,
} from '../../state/publicState'

const TEAMS: PublicTeamsState = {
  status: 'available',
  teams: [
    { key: 't0', name: 'Alpha', accent: 'crimson', score: 0 },
    { key: 't1', name: 'Bravo', accent: 'azure', score: 0 },
  ],
}

const ACTIVE: PublicResponseState = {
  armed: true,
  timer: { status: 'running', durationMs: 15_000, deadline: Date.now() + 15_000 },
  buzz: { status: 'active', activeTeamKey: 't0', waitingCount: 2 }, boardOutcome: { status: 'none' },
}

const PROMPT = { kind: 'text' as const, text: 'Final question?' }

describe('SignalRail', () => {
  it('Compact rail shows public team channels but no queue identities', () => {
    render(
      <SignalRail
        mode="compact"
        response={{
          armed: true,
          timer: { status: 'idle' },
          buzz: { status: 'none' }, boardOutcome: { status: 'none' },
        }}
        teams={TEAMS}
        round={{ kind: PUBLIC_BOARD_KIND, stage: 'board', categories: [] }}
        revealedTeamName={null}
      />,
    )
    expect(screen.getByTestId('signal-rail')).toHaveAttribute('data-mode', 'compact')
    expect(screen.getByTestId('signal-rail-status')).toHaveTextContent(/waiting for a buzz/i)
    // Signature channel rail lists public teams; scores stay on TeamScoreboard.
    expect(screen.getByTestId('signal-rail-channels')).toBeInTheDocument()
    expect(screen.getByTestId('signal-rail-channel-t0')).toHaveTextContent(/Alpha/i)
    expect(screen.getByTestId('signal-rail-channel-t1')).toHaveTextContent(/Bravo/i)
    expect(screen.queryByText(/next/i)).toBeNull()
  })

  it('omits team channels when scores/teams are unavailable (fail closed)', () => {
    render(
      <SignalRail
        mode="compact"
        response={null}
        teams={{ status: 'unavailable' }}
        round={{ kind: PUBLIC_BOARD_KIND, stage: 'board', categories: [] }}
        revealedTeamName={null}
      />,
    )
    expect(screen.queryByTestId('signal-rail-channels')).toBeNull()
    expect(screen.getByTestId('signal-rail-status')).toHaveTextContent(/ready/i)
  })

  it('Expanded rail exposes only active claim in buzz panel plus anonymous waiting count', () => {
    render(
      <SignalRail
        mode="expanded"
        response={ACTIVE}
        teams={TEAMS}
        round={null}
        revealedTeamName={null}
      />,
    )
    expect(screen.getByTestId('signal-rail')).toHaveAttribute('data-mode', 'expanded')
    expect(screen.getByTestId('bqd-active')).toHaveTextContent('Alpha')
    expect(screen.getByTestId('bqd-waiting')).toHaveTextContent('2 teams waiting')
    // Public channel strip may list Bravo; buzz panel must not invent queue identity for Bravo.
    expect(screen.getByTestId('signal-rail-channel-t1')).toHaveTextContent(/Bravo/i)
    expect(screen.getByTestId('signal-rail-channel-t1')).toHaveAttribute(
      'data-channel-status',
      'ready',
    )
    expect(screen.getByTestId('signal-rail-channel-t0')).toHaveAttribute(
      'data-channel-status',
      'answering',
    )
  })

  it('Compact rail marks waiting-for-buzz when armed with no active claim', () => {
    render(
      <SignalRail
        mode="compact"
        response={{
          armed: true,
          timer: { status: 'idle' },
          buzz: { status: 'none' }, boardOutcome: { status: 'none' },
        }}
        teams={TEAMS}
        round={{ kind: PUBLIC_BOARD_KIND, stage: 'board', categories: [] }}
        revealedTeamName={null}
      />,
    )
    expect(screen.getByTestId('signal-rail-status')).toHaveAttribute('data-buzz-ready', 'armed')
    expect(screen.getByTestId('signal-rail-status')).toHaveTextContent('Waiting for a buzz')
  })

  it('keeps BuzzQueueDisplay mounted across none → active so acknowledgement can observe it', () => {
    const { rerender } = render(
      <SignalRail
        mode="compact"
        response={{
          armed: true,
          timer: { status: 'idle' },
          buzz: { status: 'none' }, boardOutcome: { status: 'none' },
        }}
        teams={TEAMS}
        round={{ kind: PUBLIC_BOARD_KIND, stage: 'board', categories: [] }}
        revealedTeamName={null}
      />,
    )
    expect(screen.queryByTestId('bqd')).toBeNull()

    rerender(
      <SignalRail
        mode="expanded"
        response={ACTIVE}
        teams={TEAMS}
        round={null}
        revealedTeamName={null}
      />,
    )
    expect(screen.getByTestId('bqd-active')).toHaveTextContent('Alpha')
    expect(screen.getByTestId('bqd')).toHaveAttribute('data-claim-changed', 'true')
  })

  it('Final rail shows wager-entry countdown and no private Final fields', () => {
    render(
      <SignalRail
        mode="final"
        response={null}
        teams={TEAMS}
        round={{
          kind: PUBLIC_FINAL_KIND,
          stage: 'wager-entry',
          timer: { status: 'running', durationMs: 60_000, deadline: Date.now() + 60_000 },
        }}
        revealedTeamName={null}
      />,
    )
    expect(screen.getByTestId('signal-rail-status')).toHaveTextContent(/final wager open/i)
    expect(screen.getByTestId('signal-rail-timer')).toHaveAttribute('data-status', 'running')
    expect(screen.getByTestId('signal-rail-timer-clock')).toBeInTheDocument()
    const text = screen.getByTestId('signal-rail').textContent ?? ''
    expect(text).not.toMatch(/eligible|cap|not eligible|reveal order|wager cap/i)
  })

  it('Final rail shows response-entry countdown', () => {
    render(
      <SignalRail
        mode="final"
        response={null}
        teams={TEAMS}
        round={{
          kind: PUBLIC_FINAL_KIND,
          stage: 'response-entry',
          prompt: PROMPT,
          timer: { status: 'running', durationMs: 30_000, deadline: Date.now() + 30_000 },
        }}
        revealedTeamName={null}
      />,
    )
    expect(screen.getByTestId('signal-rail-status')).toHaveTextContent(/final response open/i)
    expect(screen.getByTestId('signal-rail-timer-clock')).toBeInTheDocument()
  })

  it('Final rail states paused and expired timers explicitly and omits countdown without a timer', () => {
    const { rerender } = render(
      <SignalRail
        mode="final"
        response={null}
        teams={TEAMS}
        round={{
          kind: PUBLIC_FINAL_KIND,
          stage: 'wager-entry',
          timer: { status: 'paused', durationMs: 60_000, remainingMs: 12_000 },
        }}
        revealedTeamName={null}
      />,
    )
    expect(screen.getByTestId('signal-rail-timer')).toHaveAttribute('data-status', 'paused')
    expect(screen.getByTestId('signal-rail-timer-status')).toHaveTextContent(/paused/i)

    rerender(
      <SignalRail
        mode="final"
        response={null}
        teams={TEAMS}
        round={{
          kind: PUBLIC_FINAL_KIND,
          stage: 'response-entry',
          prompt: PROMPT,
          timer: { status: 'expired', durationMs: 30_000 },
        }}
        revealedTeamName={null}
      />,
    )
    expect(screen.getByTestId('signal-rail-timer')).toHaveAttribute('data-status', 'expired')
    expect(screen.getByTestId('signal-rail-timer-status')).toHaveTextContent(/time up/i)

    rerender(
      <SignalRail
        mode="final"
        response={null}
        teams={TEAMS}
        round={{ kind: PUBLIC_FINAL_KIND, stage: 'wagers-locked' }}
        revealedTeamName={null}
      />,
    )
    expect(screen.queryByTestId('signal-rail-timer')).toBeNull()
  })

  it('Final rail uses tie-safe status for tied resolution and complete', () => {
    const { rerender } = render(
      <SignalRail
        mode="final"
        response={null}
        teams={TEAMS}
        round={{
          kind: PUBLIC_FINAL_KIND,
          stage: 'resolution',
          settledTeamKeys: [],
          prompt: null,
          answer: null,
          reveal: null,
          outcome: 'tied',
        }}
        revealedTeamName={null}
      />,
    )
    expect(screen.getByTestId('signal-rail-status')).toHaveTextContent(/tied result/i)

    rerender(
      <SignalRail
        mode="final"
        response={null}
        teams={TEAMS}
        round={{ kind: PUBLIC_FINAL_KIND, stage: 'complete', outcome: 'tied' }}
        revealedTeamName={null}
      />,
    )
    expect(screen.getByTestId('signal-rail-status')).toHaveTextContent(/tied/i)
  })

  it('Final rail may show a currently revealed public team name', () => {
    render(
      <SignalRail
        mode="final"
        response={null}
        teams={TEAMS}
        round={{
          kind: PUBLIC_FINAL_KIND,
          stage: 'team-reveal',
          settledTeamKeys: [],
          prompt: PROMPT,
          answer: 'A',
          reveal: {
            teamKey: 't1',
            response: { kind: 'exact', text: 'A' },
            wager: 50,
            settlement: null,
          },
        }}
        revealedTeamName="Bravo"
      />,
    )
    expect(screen.getByTestId('signal-rail-revealed')).toHaveTextContent('Bravo')
    expect(screen.queryByTestId('signal-rail-timer')).toBeNull()
  })

  it('suppresses Response ready / waiting-for-buzz when board outcome is resolved correct', () => {
    render(
      <SignalRail
        mode="compact"
        response={{
          armed: false,
          timer: { status: 'idle' },
          buzz: { status: 'none' },
          boardOutcome: { status: 'resolved', teamKey: 't0', kind: 'correct' },
        }}
        teams={TEAMS}
        round={{ kind: PUBLIC_BOARD_KIND, stage: 'board', categories: [] }}
        revealedTeamName={null}
      />,
    )
    expect(screen.queryByTestId('signal-rail-status')).toBeNull()
    expect(screen.queryByText(/Response ready/i)).toBeNull()
    expect(screen.queryByText(/Waiting for a buzz/i)).toBeNull()
    expect(screen.getByTestId('board-outcome')).toHaveAttribute('data-outcome-kind', 'correct')
  })

  it('suppresses the response timer panel entirely beside resolved Correct (F7)', () => {
    render(
      <SignalRail
        mode="expanded"
        response={{
          armed: false,
          // Even a stale running DTO must not present Time remaining / role=timer.
          timer: { status: 'running', durationMs: 30_000, deadline: Date.now() + 25_000 },
          buzz: { status: 'none' },
          boardOutcome: { status: 'resolved', teamKey: 't0', kind: 'correct' },
        }}
        teams={TEAMS}
        round={null}
        revealedTeamName={null}
      />,
    )
    expect(screen.queryByTestId('rtd')).toBeNull()
    expect(screen.queryByText(/Time remaining/i)).toBeNull()
    expect(screen.queryByRole('timer')).toBeNull()
    expect(screen.queryByText(/Response ready/i)).toBeNull()
    expect(screen.getByTestId('board-outcome')).toHaveAttribute('data-outcome-kind', 'correct')
  })

  it('preserves incorrect+active and exhausted compositions without ready copy', () => {
    const { rerender } = render(
      <SignalRail
        mode="expanded"
        response={{
          armed: true,
          timer: { status: 'idle' },
          buzz: { status: 'active', activeTeamKey: 't1', waitingCount: 0 },
          boardOutcome: { status: 'resolved', teamKey: 't0', kind: 'incorrect' },
        }}
        teams={TEAMS}
        round={null}
        revealedTeamName={null}
      />,
    )
    expect(screen.queryByText(/Response ready/i)).toBeNull()
    expect(screen.getByTestId('bqd-active')).toHaveTextContent('Bravo')
    expect(screen.getByTestId('board-outcome')).toHaveAttribute('data-outcome-kind', 'incorrect')
    // Composition: buzz owns motion; outcome is immediate static secondary.
    expect(screen.getByTestId('board-outcome')).toHaveAttribute('data-motion-owner', 'buzz')
    expect(screen.getByTestId('board-outcome')).toHaveAttribute(
      'data-composition',
      'static-secondary',
    )
    expect(screen.getByTestId('board-outcome')).toHaveAttribute('data-outcome-changed', 'false')

    rerender(
      <SignalRail
        mode="expanded"
        response={{
          armed: false,
          timer: { status: 'idle' },
          buzz: { status: 'exhausted' },
          boardOutcome: { status: 'resolved', teamKey: 't0', kind: 'passed' },
        }}
        teams={TEAMS}
        round={null}
        revealedTeamName={null}
      />,
    )
    expect(screen.queryByText(/Response ready/i)).toBeNull()
    expect(screen.getByTestId('bqd')).toHaveAttribute('data-status', 'exhausted')
    expect(screen.getByTestId('board-outcome')).toHaveAttribute('data-outcome-kind', 'passed')
    // Exhausted has no active claim — outcome owns motion on observed kind change.
    expect(screen.getByTestId('board-outcome')).toHaveAttribute('data-motion-owner', 'outcome')
    expect(screen.getByTestId('board-outcome')).toHaveAttribute('data-composition', 'primary')
    expect(screen.getByTestId('board-outcome')).toHaveAttribute('data-outcome-changed', 'true')
  })

  it('Correct-closed outcome remount seeds without fabricating acknowledgement', () => {
    render(
      <SignalRail
        mode="compact"
        response={{
          armed: false,
          timer: { status: 'idle' },
          buzz: { status: 'none' },
          boardOutcome: { status: 'resolved', teamKey: 't0', kind: 'correct' },
        }}
        teams={TEAMS}
        round={null}
        revealedTeamName={null}
      />,
    )
    const outcome = screen.getByTestId('board-outcome')
    expect(outcome).toHaveAttribute('data-outcome-kind', 'correct')
    expect(outcome).toHaveAttribute('data-outcome-changed', 'false')
    expect(outcome).toHaveAttribute('data-motion-owner', 'outcome')
    expect(outcome).not.toHaveClass('bod--outcome-changed')
  })
})

/**
 * CB-F2 — the rail must decide EACH team's Final status independently.
 *
 * The Court symptom was seen here: a team the class had already watched be
 * revealed and judged read `Ready` again once the host revealed the next team,
 * because every badge was derived from one "currently revealed" value.
 *
 * These cases exist because the end-to-end detector alone was VACUOUS: with two
 * teams and only `not.toBe('ready')` assertions, a rail that marked EVERY team
 * revealed as soon as any team settled passed the whole suite. So each case
 * below pins the negative too — a team that is NOT settled and NOT the current
 * reveal must still read `ready` — which is what distinguishes "the right teams
 * are marked" from "everyone is marked".
 */
describe('CB-F2 SignalRail per-team Final status', () => {
  const THREE: PublicTeamsState = {
    status: 'available',
    teams: [
      { key: 't0', name: 'Alpha', accent: 'crimson', score: 0 },
      { key: 't1', name: 'Bravo', accent: 'azure', score: 0 },
      { key: 't2', name: 'Cass', accent: 'emerald', score: 0 },
    ],
  }

  function statusOf(key: string): string | null {
    return screen.getByTestId(`signal-rail-channel-${key}`).getAttribute('data-channel-status')
  }

  function renderFinal(options: {
    readonly teams?: PublicTeamsState
    readonly settledTeamKeys: readonly string[]
    readonly revealedTeamName: string | null
  }) {
    render(
      <SignalRail
        mode="final"
        response={null}
        teams={options.teams ?? TEAMS}
        round={{
          kind: PUBLIC_FINAL_KIND,
          stage: 'team-reveal',
          prompt: PROMPT,
          answer: 'Answer',
          reveal: {
            teamKey: 't0',
            response: { kind: 'not-captured' },
            wager: 10,
            settlement: null,
          },
          settledTeamKeys: options.settledTeamKeys,
        }}
        revealedTeamName={options.revealedTeamName}
      />,
    )
  }

  it('marks a settled team revealed and leaves an unsettled team ready', () => {
    // Alpha was judged; Bravo has not had its turn. This is the exact Court
    // transition, and the Bravo assertion is what a "mark everyone" rail fails.
    renderFinal({ settledTeamKeys: ['t0'], revealedTeamName: 'Bravo' })
    expect(statusOf('t0')).toBe('revealed')
    expect(statusOf('t1')).toBe('revealed') // the current reveal
  })

  it('leaves a team that is neither settled nor on screen ready', () => {
    renderFinal({ teams: THREE, settledTeamKeys: ['t0'], revealedTeamName: 'Bravo' })
    expect(statusOf('t0')).toBe('revealed') // settled
    expect(statusOf('t1')).toBe('revealed') // currently revealed
    expect(statusOf('t2')).toBe('ready') // never revealed — must NOT be marked
  })

  it('marks nobody revealed before any team is settled or on screen', () => {
    renderFinal({ teams: THREE, settledTeamKeys: [], revealedTeamName: null })
    for (const key of ['t0', 't1', 't2']) expect(statusOf(key)).toBe('ready')
  })

  it('marks exactly the settled teams when two of three are judged', () => {
    renderFinal({ teams: THREE, settledTeamKeys: ['t0', 't1'], revealedTeamName: 'Cass' })
    expect(statusOf('t0')).toBe('revealed')
    expect(statusOf('t1')).toBe('revealed')
    expect(statusOf('t2')).toBe('revealed') // the current reveal
  })

  it('keeps settled teams marked at the resolution stage too', () => {
    // Without this, dropping `resolution` from the stage check reintroduces the
    // CB-F2 symptom after the last judgment and stays green everywhere else.
    render(
      <SignalRail
        mode="final"
        response={null}
        teams={THREE}
        round={{
          kind: PUBLIC_FINAL_KIND,
          stage: 'resolution',
          prompt: PROMPT,
          answer: 'Answer',
          reveal: null,
          settledTeamKeys: ['t0', 't1'],
          outcome: 'unique-leader',
        }}
        revealedTeamName={null}
      />,
    )
    expect(statusOf('t0')).toBe('revealed')
    expect(statusOf('t1')).toBe('revealed')
    expect(statusOf('t2')).toBe('ready')
  })

  it('does not mark an unrelated team when only the LAST team is settled', () => {
    // Guards the mirror-image error of "always the first key".
    renderFinal({ teams: THREE, settledTeamKeys: ['t2'], revealedTeamName: null })
    expect(statusOf('t0')).toBe('ready')
    expect(statusOf('t1')).toBe('ready')
    expect(statusOf('t2')).toBe('revealed')
  })
})
