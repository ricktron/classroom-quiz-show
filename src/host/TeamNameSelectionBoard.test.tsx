import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { createTeamNameSelectionState } from '../session/teamNameSelection'
import { TeamNameSelectionBoard } from './TeamNameSelectionBoard'

function renderBoard(
  options: {
    readonly claimed?: boolean
    readonly longName?: boolean
    readonly reducedMotion?: boolean
    readonly highContrast?: boolean
    readonly grayscale?: boolean
  } = {},
) {
  const bank = options.longName
    ? ["Ms. Garnett's 4th Period Titans", 'B', 'C', 'D', 'E', 'F', 'G', 'H']
    : ['Alpha', 'Bravo', 'Charlie', 'Delta', 'Echo', 'Foxtrot', 'Golf', 'Hotel']
  let state = createTeamNameSelectionState({ bank, teamIds: ['a', 'b'] })
  if (options.claimed) {
    state = {
      ...state,
      views: {
        ...state.views,
        a: {
          ...state.views.a!,
          claimedName: state.views.a!.candidates[0] ?? 'Alpha',
          selectedChoiceIndex: 0,
        },
      },
    }
  }
  const onClaim = vi.fn()
  const onCycle = vi.fn()
  render(
    <TeamNameSelectionBoard
      views={[state.views.a!, state.views.b!]}
      teamLabels={{ a: 'Team A', b: 'Team B' }}
      onClaim={onClaim}
      onCycle={onCycle}
      onManual={vi.fn()}
      onReset={vi.fn()}
      reducedMotion={options.reducedMotion}
      highContrast={options.highContrast}
      grayscale={options.grayscale}
    />,
  )
  return { onClaim, onCycle }
}

describe('TeamNameSelectionBoard', () => {
  it('exposes ordinal and color text so choice is not color-only', () => {
    renderBoard()
    const first = screen.getByTestId('tnsb-choice-a-0')
    expect(first).toHaveAttribute('data-color', 'yellow')
    expect(first).toHaveAttribute('data-ordinal', '1')
    expect(first).toHaveAccessibleName(/choice 1, yellow/i)
    expect(first.textContent).toMatch(/1 · yellow/i)
  })

  it('makes the selected choice dominant and alternatives subdued', () => {
    renderBoard({ claimed: true })
    expect(screen.getByTestId('tnsb-choice-a-0').className).toMatch(/selected/)
    expect(screen.getByTestId('tnsb-choice-a-1').className).toMatch(/subdued/)
  })

  it('marks high contrast, reduced motion, and grayscale modes', () => {
    renderBoard({ highContrast: true, reducedMotion: true, grayscale: true })
    const board = screen.getByTestId('team-name-selection-board')
    expect(board).toHaveAttribute('data-high-contrast', 'true')
    expect(board).toHaveAttribute('data-reduced-motion', 'true')
    expect(board).toHaveAttribute('data-grayscale', 'true')
  })

  it('keeps long valid team names visible as text', () => {
    renderBoard({ longName: true })
    expect(screen.getByTestId('tnsb-choice-a-0').textContent).toMatch(/4th Period Titans/i)
  })
})
