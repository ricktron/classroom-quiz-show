import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { BoardOutcomeDisplay } from './BoardOutcomeDisplay'
import type { PublicBoardResponseOutcome, PublicTeamsState } from '../state/publicState'
import { FORBIDDEN_DISPLAY_LABELS } from '../test/leakLabels'

const TEAMS: PublicTeamsState = {
  status: 'available',
  teams: [
    { key: 't0', name: 'Red Team', accent: 'crimson', score: 0 },
    { key: 't1', name: 'Blue Team', accent: 'azure', score: 100 },
  ],
}

function renderOutcome(boardOutcome: PublicBoardResponseOutcome, teams: PublicTeamsState | null = TEAMS) {
  return render(<BoardOutcomeDisplay boardOutcome={boardOutcome} teams={teams} />)
}

describe('BoardOutcomeDisplay', () => {
  it('renders nothing when outcome is none', () => {
    const { container } = renderOutcome({ status: 'none' })
    expect(container).toBeEmptyDOMElement()
  })

  it('renders Correct + team for resolved correct', () => {
    renderOutcome({ status: 'resolved', teamKey: 't0', kind: 'correct' })
    const el = screen.getByTestId('board-outcome')
    expect(el).toHaveAttribute('data-outcome-kind', 'correct')
    expect(el).toHaveAttribute('data-seeded', 'true')
    expect(el).toHaveTextContent('Correct')
    expect(el).toHaveTextContent('Red Team')
  })

  it('renders Incorrect and Passed without theatrical chrome', () => {
    const { rerender } = renderOutcome({ status: 'resolved', teamKey: 't1', kind: 'incorrect' })
    expect(screen.getByTestId('board-outcome')).toHaveTextContent('Incorrect')
    expect(screen.getByTestId('board-outcome')).toHaveTextContent('Blue Team')
    rerender(
      <BoardOutcomeDisplay
        boardOutcome={{ status: 'resolved', teamKey: 't0', kind: 'passed' }}
        teams={TEAMS}
      />,
    )
    expect(screen.getByTestId('board-outcome')).toHaveTextContent('Passed')
  })

  it('does not leak authored team ids or forbidden host labels', () => {
    const { container } = renderOutcome({ status: 'resolved', teamKey: 't0', kind: 'correct' })
    const text = container.textContent ?? ''
    expect(text).not.toMatch(/\bred\b/i)
    for (const label of FORBIDDEN_DISPLAY_LABELS) {
      expect(text.toLowerCase()).not.toContain(label.toLowerCase())
    }
  })
})
