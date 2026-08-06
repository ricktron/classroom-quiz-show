import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { AudienceDisplayShell } from './AudienceDisplayShell'
import {
  INITIAL_PUBLIC_STATE,
  PUBLIC_BOARD_KIND,
  PUBLIC_FINAL_KIND,
  type PublicState,
  type PublicTeam,
} from '../../state/publicState'

const LONG = 'ABCDEFGHIJABCDEFGHIJABCDEFGHIJABCDEFGHIJ'

function team(key: string, name: string, accent: string, score: number): PublicTeam {
  return { key, name, accent, score }
}

function state(overrides: Partial<PublicState>): PublicState {
  return {
    ...INITIAL_PUBLIC_STATE,
    revision: 3,
    phase: 'ready',
    headline: 'Session ready',
    detail: 'Playing',
    game: {
      status: 'active',
      roundCount: 3,
      currentRound: 1,
      roundAvailability: 'available',
    },
    ...overrides,
  }
}

describe('AudienceDisplayShell', () => {
  it('renders fail-closed waiting state with Nexus Core and no controls', () => {
    render(<AudienceDisplayShell publicState={INITIAL_PUBLIC_STATE} />)
    expect(screen.getByRole('heading', { name: /game display ready/i })).toBeInTheDocument()
    expect(screen.getByTestId('nexus-core')).toBeInTheDocument()
    expect(screen.getByText(/waiting for the host/i)).toBeInTheDocument()
    expect(screen.queryAllByRole('button')).toHaveLength(0)
    expect(screen.queryAllByRole('textbox')).toHaveLength(0)
    expect(screen.queryAllByRole('link')).toHaveLength(0)
    expect(screen.queryByTestId('cbd-board')).toBeNull()
  })

  it('uses Score Column for four teams and preserves authored order', () => {
    render(
      <AudienceDisplayShell
        publicState={state({
          round: {
            kind: PUBLIC_BOARD_KIND,
            stage: 'board',
            categories: [
              {
                key: 'c0',
                title: 'Science',
                tiles: [{ key: 'c0t0', value: 100, used: false }],
              },
            ],
          },
          teams: {
            status: 'available',
            teams: [
              team('t0', 'Low', 'crimson', 10),
              team('t1', 'High', 'azure', 900),
              team('t2', LONG, 'crimson', -120),
              team('t3', 'Mid', 'emerald', 50),
            ],
          },
        })}
      />,
    )
    expect(screen.getByTestId('audience-shell')).toHaveAttribute('data-score-layout', 'column')
    expect(screen.getByTestId('score-layout')).toHaveAttribute('data-mode', 'column')
    expect(screen.getByTestId('tsb-team-t2')).toHaveTextContent(LONG)
    expect(screen.getByTestId('tsb-score-t2')).toHaveTextContent('-120')
    const order = screen.getAllByTestId(/tsb-team-/).map((el) => el.getAttribute('data-testid'))
    expect(order).toEqual(['tsb-team-t0', 'tsb-team-t1', 'tsb-team-t2', 'tsb-team-t3'])
  })

  it('quiet cognition shows decorative lattice and no semantic board cells', () => {
    render(
      <AudienceDisplayShell
        publicState={state({
          round: {
            kind: PUBLIC_BOARD_KIND,
            stage: 'prompt',
            selection: {
              categoryTitle: 'Science',
              value: 200,
              prompt: { kind: 'text', text: 'What is H2O?' },
              answer: null,
            },
          },
          teams: { status: 'available', teams: [team('t0', 'Alpha', 'crimson', 0)] },
        })}
      />,
    )
    expect(screen.getByTestId('audience-shell')).toHaveAttribute('data-scene', 'quiet-cognition')
    expect(screen.getByTestId('audience-lattice')).toBeInTheDocument()
    expect(screen.queryByTestId('cbd-board')).toBeNull()
    expect(screen.queryByTestId(/cbd-tile-/)).toBeNull()
    expect(screen.getByTestId('cbd-prompt')).toHaveTextContent('What is H2O?')
  })

  it('renders Final unique-leader and tied results distinctly', () => {
    const { rerender } = render(
      <AudienceDisplayShell
        publicState={state({
          round: {
            kind: PUBLIC_FINAL_KIND,
            stage: 'complete',
            outcome: 'unique-leader',
          },
          teams: {
            status: 'available',
            teams: [team('t0', 'Alpha', 'crimson', 100), team('t1', 'Bravo', 'azure', 400)],
          },
        })}
      />,
    )
    expect(screen.getByTestId('audience-result-unique')).toHaveTextContent(/Bravo leads/)
    expect(screen.queryByTestId('audience-result-tied')).toBeNull()

    rerender(
      <AudienceDisplayShell
        publicState={state({
          round: { kind: PUBLIC_FINAL_KIND, stage: 'complete', outcome: 'tied' },
          teams: {
            status: 'available',
            teams: [team('t0', 'Alpha', 'crimson', 200), team('t1', 'Bravo', 'azure', 200)],
          },
        })}
      />,
    )
    expect(screen.getByTestId('audience-result-tied')).toHaveTextContent('Tied')
  })

  it('marks unavailable rounds neutrally without projector controls', () => {
    render(
      <AudienceDisplayShell
        publicState={state({
          game: {
            status: 'active',
            roundCount: 2,
            currentRound: 1,
            roundAvailability: 'unavailable',
          },
          round: null,
        })}
      />,
    )
    expect(screen.getByTestId('audience-shell')).toHaveAttribute('data-scene', 'unavailable')
    expect(screen.getByTestId('display-game')).toHaveTextContent(/not available/i)
    expect(screen.getByTestId('nexus-stage')).toHaveTextContent(/not available/i)
    expect(screen.queryAllByRole('button')).toHaveLength(0)
  })

  it('uses Score Deck row-major order for eight teams', () => {
    const eight = Array.from({ length: 8 }, (_, i) =>
      team(`t${i}`, i === 7 ? LONG : `Team ${i}`, 'azure', 1000 - i),
    )
    render(
      <AudienceDisplayShell
        publicState={state({
          round: {
            kind: PUBLIC_BOARD_KIND,
            stage: 'board',
            categories: [
              {
                key: 'c0',
                title: 'Cat',
                tiles: [{ key: 'c0t0', value: 100, used: true }],
              },
            ],
          },
          teams: { status: 'available', teams: eight },
        })}
      />,
    )
    expect(screen.getByTestId('audience-shell')).toHaveAttribute('data-score-layout', 'deck')
    expect(screen.getByTestId('tsb')).toHaveAttribute('data-layout', 'deck')
    expect(screen.getByTestId('tsb-team-t7')).toHaveTextContent(LONG)
    expect(screen.getByTestId('cbd-depletion')).toHaveTextContent('1 of 1 clues used')
    expect(screen.getByTestId('cbd-cleared-c0')).toHaveTextContent(/cleared/i)
  })
})
