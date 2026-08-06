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
  buzz: { status: 'active', activeTeamKey: 't0', waitingCount: 2 },
}

const PROMPT = { kind: 'text' as const, text: 'Final question?' }

describe('SignalRail', () => {
  it('Compact rail exposes no team queue identities', () => {
    render(
      <SignalRail
        mode="compact"
        response={{
          armed: true,
          timer: { status: 'idle' },
          buzz: { status: 'none' },
        }}
        teams={TEAMS}
        round={{ kind: PUBLIC_BOARD_KIND, stage: 'board', categories: [] }}
        revealedTeamName={null}
      />,
    )
    expect(screen.getByTestId('signal-rail')).toHaveAttribute('data-mode', 'compact')
    expect(screen.getByTestId('signal-rail-status')).toHaveTextContent(/armed/i)
    expect(screen.queryByText('Alpha')).toBeNull()
    expect(screen.queryByText('Bravo')).toBeNull()
    expect(screen.queryByText(/next/i)).toBeNull()
  })

  it('Expanded rail exposes only active team and anonymous waiting count', () => {
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
    expect(screen.queryByText('Bravo')).toBeNull()
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
})
