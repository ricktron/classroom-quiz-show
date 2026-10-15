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

  it('keeps choices, More names and Choose again when a name bank exists', () => {
    renderBoard()
    expect(screen.getByTestId('team-name-selection-board')).toHaveAttribute(
      'data-name-bank',
      'available',
    )
    expect(screen.getAllByRole('button', { name: /^choice \d/i })).toHaveLength(8)
    expect(screen.getAllByRole('button', { name: /^more names$/i })).toHaveLength(2)
    expect(screen.getAllByRole('button', { name: /^choose again$/i })).toHaveLength(2)
    expect(screen.queryByRole('button', { name: /^clear name$/i })).toBeNull()
  })
})

describe('TeamNameSelectionBoard without a class name list (Q7 R1 item 8)', () => {
  function renderNoBank(claimedA: string | null = null) {
    let state = createTeamNameSelectionState({ bank: [], teamIds: ['a', 'b'] })
    if (claimedA !== null) {
      state = {
        ...state,
        views: { ...state.views, a: { ...state.views.a!, claimedName: claimedA } },
      }
    }
    const handlers = {
      onClaim: vi.fn(),
      onCycle: vi.fn(),
      onManual: vi.fn(),
      onReset: vi.fn(),
    }
    render(
      <TeamNameSelectionBoard
        views={[state.views.a!, state.views.b!]}
        teamLabels={{ a: 'Team A', b: 'Team B' }}
        nameBankAvailable={false}
        {...handlers}
      />,
    )
    return handlers
  }

  it('renders no inert choice, More names or Choose again controls', () => {
    renderNoBank()
    expect(screen.getByTestId('team-name-selection-board')).toHaveAttribute(
      'data-name-bank',
      'none',
    )
    expect(screen.queryAllByRole('button', { name: /^choice \d/i })).toHaveLength(0)
    expect(screen.queryByRole('button', { name: /^more names$/i })).toBeNull()
    expect(screen.queryByRole('button', { name: /^choose again$/i })).toBeNull()
    expect(screen.queryByRole('button', { name: /^clear name$/i })).toBeNull()
    expect(screen.getByTestId('tnsb-team-a')).toHaveTextContent('Type a name.')
    expect(screen.getByTestId('tnsb-team-a')).not.toHaveTextContent(/press a color/i)
  })

  it('keeps manual name entry fully usable', () => {
    const { onManual } = renderNoBank()
    const inputs = screen.getAllByLabelText('Type a name')
    expect(inputs).toHaveLength(2)
    fireEvent.change(inputs[1]!, { target: { value: 'Ozone Owls' } })
    fireEvent.keyDown(inputs[1]!, { key: 'Enter' })
    expect(onManual).toHaveBeenCalledWith('b', 'Ozone Owls')
  })

  it('offers Clear name only for a team that has a typed name', () => {
    const { onReset } = renderNoBank('Comet Crew')
    const clear = screen.getAllByRole('button', { name: /^clear name$/i })
    expect(clear).toHaveLength(1)
    fireEvent.click(clear[0]!)
    expect(onReset).toHaveBeenCalledWith('a')
  })
})
