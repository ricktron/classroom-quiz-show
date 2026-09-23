import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, render, screen } from '@testing-library/react'
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

function renderOutcome(
  boardOutcome: PublicBoardResponseOutcome,
  teams: PublicTeamsState | null = TEAMS,
  activeClaimPresent = false,
) {
  return render(
    <BoardOutcomeDisplay
      boardOutcome={boardOutcome}
      teams={teams}
      activeClaimPresent={activeClaimPresent}
    />,
  )
}

afterEach(() => {
  vi.useRealTimers()
})

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
    expect(el).toHaveAttribute('data-outcome-changed', 'false')
    expect(el).toHaveTextContent('Correct')
    expect(el).toHaveTextContent('Red Team')
  })

  it('renders Incorrect and Passed without leaking host labels', () => {
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

describe('outcome acknowledgement choreography', () => {
  it('seeds remount into resolved Correct without fabricating acknowledgement', () => {
    renderOutcome({ status: 'resolved', teamKey: 't0', kind: 'correct' })
    const el = screen.getByTestId('board-outcome')
    expect(el).toHaveTextContent('Correct')
    expect(el).toHaveAttribute('data-outcome-changed', 'false')
    expect(el).not.toHaveClass('bod--outcome-changed')
    expect(el).toHaveAttribute('data-motion-owner', 'outcome')
    expect(el).toHaveAttribute('data-composition', 'primary')
  })

  it('acknowledges observed none → Correct without delaying text', () => {
    vi.useFakeTimers()
    const { rerender, container } = renderOutcome({ status: 'none' })
    expect(container).toBeEmptyDOMElement()

    rerender(
      <BoardOutcomeDisplay
        boardOutcome={{ status: 'resolved', teamKey: 't0', kind: 'correct' }}
        teams={TEAMS}
        activeClaimPresent={false}
      />,
    )
    const el = screen.getByTestId('board-outcome')
    expect(el).toHaveTextContent('Correct')
    expect(el).toHaveTextContent('Red Team')
    expect(el).toHaveAttribute('data-outcome-changed', 'true')
    expect(el).toHaveClass('bod--outcome-changed')
  })

  it('Incorrect + active claim is immediate static secondary (buzz owns motion)', () => {
    vi.useFakeTimers()
    const { rerender } = renderOutcome({ status: 'none' })
    rerender(
      <BoardOutcomeDisplay
        boardOutcome={{ status: 'resolved', teamKey: 't0', kind: 'incorrect' }}
        teams={TEAMS}
        activeClaimPresent={true}
      />,
    )
    const el = screen.getByTestId('board-outcome')
    expect(el).toHaveTextContent('Incorrect')
    expect(el).toHaveTextContent('Red Team')
    expect(el).toHaveAttribute('data-outcome-changed', 'false')
    expect(el).not.toHaveClass('bod--outcome-changed')
    expect(el).toHaveClass('bod--secondary')
    expect(el).toHaveAttribute('data-motion-owner', 'buzz')
    expect(el).toHaveAttribute('data-composition', 'static-secondary')
  })

  it('Passed + exhausted (no active claim) may own acknowledgement motion', () => {
    vi.useFakeTimers()
    const { rerender } = renderOutcome({ status: 'none' })
    rerender(
      <BoardOutcomeDisplay
        boardOutcome={{ status: 'resolved', teamKey: 't0', kind: 'passed' }}
        teams={TEAMS}
        activeClaimPresent={false}
      />,
    )
    const el = screen.getByTestId('board-outcome')
    expect(el).toHaveTextContent('Passed')
    expect(el).toHaveAttribute('data-outcome-changed', 'true')
    expect(el).toHaveClass('bod--outcome-changed')
    expect(el).not.toHaveClass('bod--secondary')
    expect(el).toHaveAttribute('data-motion-owner', 'outcome')
  })

  it('Path S-C: team score refresh does not restart outcome acknowledgement', () => {
    vi.useFakeTimers()
    const { rerender } = renderOutcome({ status: 'none' })
    rerender(
      <BoardOutcomeDisplay
        boardOutcome={{ status: 'resolved', teamKey: 't0', kind: 'correct' }}
        teams={TEAMS}
      />,
    )
    expect(screen.getByTestId('board-outcome')).toHaveAttribute('data-outcome-changed', 'true')

    const scored: PublicTeamsState = {
      status: 'available',
      teams: [
        { key: 't0', name: 'Red Team', accent: 'crimson', score: 400 },
        { key: 't1', name: 'Blue Team', accent: 'azure', score: 100 },
      ],
    }
    rerender(
      <BoardOutcomeDisplay
        boardOutcome={{ status: 'resolved', teamKey: 't0', kind: 'correct' }}
        teams={scored}
      />,
    )
    expect(screen.getByTestId('board-outcome')).toHaveTextContent('Correct')
    expect(screen.getByTestId('board-outcome')).toHaveAttribute('data-outcome-changed', 'true')
    expect(screen.getByTestId('board-outcome')).toHaveClass('bod--outcome-changed')

    act(() => {
      vi.advanceTimersByTime(500)
    })
    expect(screen.getByTestId('board-outcome')).toHaveAttribute('data-outcome-changed', 'false')
  })

  it('clears acknowledgement after hold without removing authoritative text', () => {
    vi.useFakeTimers()
    const { rerender } = renderOutcome({ status: 'none' })
    rerender(
      <BoardOutcomeDisplay
        boardOutcome={{ status: 'resolved', teamKey: 't1', kind: 'incorrect' }}
        teams={TEAMS}
        activeClaimPresent={false}
      />,
    )
    expect(screen.getByTestId('board-outcome')).toHaveAttribute('data-outcome-changed', 'true')

    act(() => {
      vi.advanceTimersByTime(420)
    })
    expect(screen.getByTestId('board-outcome')).toHaveAttribute('data-outcome-changed', 'false')
    expect(screen.getByTestId('board-outcome')).toHaveTextContent('Incorrect')
    expect(screen.getByTestId('board-outcome')).toHaveTextContent('Blue Team')
  })

  it('remount into Incorrect + active claim stays seeded static secondary', () => {
    renderOutcome(
      { status: 'resolved', teamKey: 't0', kind: 'incorrect' },
      TEAMS,
      true,
    )
    const el = screen.getByTestId('board-outcome')
    expect(el).toHaveAttribute('data-outcome-changed', 'false')
    expect(el).toHaveClass('bod--secondary')
    expect(el).toHaveAttribute('data-motion-owner', 'buzz')
  })
})
