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
        finalStageLabel={null}
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
        finalStageLabel={null}
        revealedTeamName={null}
      />,
    )
    expect(screen.getByTestId('signal-rail')).toHaveAttribute('data-mode', 'expanded')
    expect(screen.getByTestId('bqd-active')).toHaveTextContent('Alpha')
    expect(screen.getByTestId('bqd-waiting')).toHaveTextContent('2 teams waiting')
    expect(screen.queryByText('Bravo')).toBeNull()
  })

  it('Final rail exposes no eligibility or unrevealed content', () => {
    render(
      <SignalRail
        mode="final"
        response={null}
        teams={TEAMS}
        round={{ kind: PUBLIC_FINAL_KIND, stage: 'wagers-locked' }}
        finalStageLabel="Wagers locked"
        revealedTeamName={null}
      />,
    )
    const text = screen.getByTestId('signal-rail').textContent ?? ''
    expect(text).toMatch(/wagers locked/i)
    expect(text).not.toMatch(/eligible|cap|not eligible|reveal order/i)
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
          prompt: { kind: 'text', text: 'Q' },
          answer: 'A',
          reveal: {
            teamKey: 't1',
            response: { kind: 'exact', text: 'A' },
            wager: 50,
            settlement: null,
          },
        }}
        finalStageLabel="Team reveal"
        revealedTeamName="Bravo"
      />,
    )
    expect(screen.getByTestId('signal-rail-revealed')).toHaveTextContent('Bravo')
  })
})
