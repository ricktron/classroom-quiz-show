import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
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
  it('renders physical controller order Blue, Orange, Green, Yellow', () => {
    renderBoard()
    const team = screen.getByTestId('tnsb-team-a')
    const colors = [...team.querySelectorAll('[data-color]')].map((node) =>
      node.getAttribute('data-color'),
    )
    expect(colors).toEqual(['blue', 'orange', 'green', 'yellow'])
  })

  it('keeps logical choiceIndex binding when claiming from physical order', () => {
    const { onClaim } = renderBoard()
    fireEvent.click(screen.getByTestId('tnsb-choice-a-3'))
    fireEvent.click(screen.getByTestId('tnsb-choice-a-2'))
    fireEvent.click(screen.getByTestId('tnsb-choice-a-1'))
    fireEvent.click(screen.getByTestId('tnsb-choice-a-0'))
    expect(onClaim.mock.calls).toEqual([
      ['a', 3],
      ['a', 2],
      ['a', 1],
      ['a', 0],
    ])
  })

  it('exposes color-word cues and accessible names tied to logical choice indices', () => {
    renderBoard()
    const yellow = screen.getByTestId('tnsb-choice-a-0')
    const blue = screen.getByTestId('tnsb-choice-a-3')
    expect(yellow).toHaveAttribute('data-color', 'yellow')
    expect(yellow).toHaveAttribute('data-ordinal', '1')
    expect(yellow).toHaveAccessibleName(/choice 1, yellow/i)
    expect(yellow.textContent).toMatch(/^Yellow/i)
    expect(blue).toHaveAttribute('data-color', 'blue')
    expect(blue).toHaveAttribute('data-ordinal', '4')
    expect(blue).toHaveAccessibleName(/choice 4, blue/i)
    expect(blue.textContent).toMatch(/^Blue/i)
    expect(yellow.textContent).not.toMatch(/secondary/i)
    expect(blue.textContent).not.toMatch(/secondary/i)
  })

  it('makes the selected choice dominant and alternatives subdued', () => {
    renderBoard({ claimed: true })
    expect(screen.getByTestId('tnsb-choice-a-0').className).toMatch(/selected/)
    expect(screen.getByTestId('tnsb-choice-a-1').className).toMatch(/subdued/)
    expect(screen.getByTestId('tnsb-choice-a-2').className).toMatch(/subdued/)
    expect(screen.getByTestId('tnsb-choice-a-3').className).toMatch(/subdued/)
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
