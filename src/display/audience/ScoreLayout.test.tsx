import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ScoreLayout } from './ScoreLayout'
import type { PublicTeam, PublicTeamsState } from '../../state/publicState'

const LONG =
  'ABCDEFGHIJABCDEFGHIJABCDEFGHIJABCDEFGHIJ' // 40 chars

function teams(...scores: number[]): PublicTeamsState {
  const list: PublicTeam[] = scores.map((score, i) => ({
    key: `t${i}`,
    name: i === 0 ? LONG : `Team ${i}`,
    accent: i % 2 === 0 ? 'crimson' : 'crimson',
    score,
  }))
  return { status: 'available', teams: list }
}

describe('ScoreLayout', () => {
  it('renders Score Column for 1–4 teams in authored order', () => {
    render(<ScoreLayout teams={teams(10, 999, -40, 5)} mode="column" />)
    expect(screen.getByTestId('score-layout')).toHaveAttribute('data-mode', 'column')
    expect(screen.getByTestId('tsb')).toHaveAttribute('data-layout', 'column')
    const keys = screen.getAllByTestId(/tsb-team-/).map((el) => el.getAttribute('data-testid'))
    expect(keys).toEqual(['tsb-team-t0', 'tsb-team-t1', 'tsb-team-t2', 'tsb-team-t3'])
    expect(screen.getByTestId('tsb-team-t0')).toHaveTextContent(LONG)
    expect(screen.getByTestId('tsb-score-t2')).toHaveTextContent('-40')
    expect(screen.getByTestId('tsb-score-t1')).toHaveTextContent('999')
  })

  it('renders Score Strip for 5–6 and Score Deck for 7–8 without ranking', () => {
    const six = teams(1, 2, 3, 4, 5, 6)
    const { rerender } = render(<ScoreLayout teams={six} mode="strip" />)
    expect(screen.getByTestId('score-layout')).toHaveAttribute('data-mode', 'strip')

    const eightScores = [5, 4, 3, 2, 1, 0, -1, -2]
    rerender(<ScoreLayout teams={teams(...eightScores)} mode="deck" />)
    expect(screen.getByTestId('score-layout')).toHaveAttribute('data-mode', 'deck')
    const order = screen.getAllByTestId(/tsb-team-/).map((el) => el.getAttribute('data-testid'))
    expect(order).toEqual([
      'tsb-team-t0',
      'tsb-team-t1',
      'tsb-team-t2',
      'tsb-team-t3',
      'tsb-team-t4',
      'tsb-team-t5',
      'tsb-team-t6',
      'tsb-team-t7',
    ])
  })

  it('keeps duplicate accents distinguishable through names', () => {
    render(<ScoreLayout teams={teams(10, 20)} mode="column" />)
    expect(screen.getByTestId('tsb-team-t0')).toHaveTextContent(LONG)
    expect(screen.getByTestId('tsb-team-t1')).toHaveTextContent('Team 1')
  })

  it('renders nothing for mode none', () => {
    const { container } = render(<ScoreLayout teams={teams(1)} mode="none" />)
    expect(container).toBeEmptyDOMElement()
  })

  it('renders the explicit Scores unavailable panel without inventing teams', () => {
    render(<ScoreLayout teams={{ status: 'unavailable' }} mode="unavailable" />)
    expect(screen.getByTestId('score-layout')).toHaveAttribute('data-mode', 'unavailable')
    expect(screen.getByTestId('tsb-unavailable')).toHaveTextContent(/scores unavailable/i)
    expect(screen.queryByTestId(/tsb-team-/)).toBeNull()
  })
})
