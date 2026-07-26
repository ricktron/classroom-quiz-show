import { describe, expect, it } from 'vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { CategoryBoardHostPanel } from './CategoryBoardHostPanel'
import { createSessionStore, type SessionStore } from '../state/store'
import type { SessionCommand } from '../state/commands'
import { importGameFromUnknown } from '../import/importGame'
import { createGameDefinition } from '../game/gameDefinition'
import { placeholderRound } from '../game/roundDefinition'
import { boardGameFile, richBoardConfig } from '../test/categoryBoardFixtures'

/**
 * Host controls — component behaviour (Slice 5).
 *
 * The panel is the teacher's private surface. These tests check that it renders
 * a real, operable board, distinguishes private preview from public content,
 * offers only the transitions the reducer will accept, and introduces none of
 * the Slice 6/7 controls.
 */

const AT = 1_000
const ROUND = 'board-round'

function boardStore(): SessionStore {
  const result = importGameFromUnknown(boardGameFile(richBoardConfig()))
  if (result.status !== 'success') throw new Error('fixture failed to import')
  const store = createSessionStore()
  store.dispatch({ type: 'INIT_SESSION', issuedAt: AT, sessionId: 's' })
  store.dispatch({ type: 'INITIALIZE_GAME', issuedAt: AT, definition: result.definition })
  store.dispatch({ type: 'ADVANCE_TO_NEXT_ROUND', issuedAt: AT })
  return store
}

/** Render the panel against a live store, re-rendering after each dispatch. */
function renderPanel(store: SessionStore = boardStore()) {
  const dispatch = (command: SessionCommand) => {
    const result = store.dispatch(command)
    view.rerender(<CategoryBoardHostPanel dispatch={dispatch} game={store.getState().session!.game!} />)
    return result
  }
  const view = render(
    <CategoryBoardHostPanel dispatch={dispatch} game={store.getState().session!.game!} />,
  )
  return { store, view }
}

describe('the board grid', () => {
  it('renders every category title and every tile value as a real button', () => {
    renderPanel()
    expect(screen.getByText('Alpha Category')).toBeInTheDocument()
    expect(screen.getByText('Beta Category')).toBeInTheDocument()
    const grid = screen.getByTestId('cbh-grid')
    expect(within(grid).getAllByRole('button')).toHaveLength(5)
  })

  it('shows the multiplied (effective) value on the tile', () => {
    renderPanel()
    // alpha-300 is 300 × 2.
    expect(screen.getByTestId('cbh-tile-alpha-300')).toHaveTextContent('600')
  })

  it('labels each tile with its category and value for screen readers', () => {
    renderPanel()
    expect(
      screen.getByRole('button', { name: 'Alpha Category, 100 points' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Beta Category, 500 points' })).toBeInTheDocument()
  })

  it('selects a tile by keyboard', () => {
    renderPanel()
    const tile = screen.getByRole('button', { name: 'Beta Category, 500 points' })
    tile.focus()
    expect(tile).toHaveFocus()
    // A real <button> activates on Enter/Space; the DOM click is the effect.
    fireEvent.click(tile)
    expect(screen.getByTestId('cbh-selected')).toBeInTheDocument()
  })

  it('never renders any prompt, answer or note while on the grid', () => {
    renderPanel()
    const panel = screen.getByTestId('cbh-grid')
    expect(panel).not.toHaveTextContent(/prompt/i)
    expect(panel).not.toHaveTextContent(/answer/i)
    expect(panel).not.toHaveTextContent(/TEACHER-NOTE/)
  })
})

describe('used tiles', () => {
  function completeTile(store: SessionStore, tileId: string) {
    store.dispatch({ type: 'SELECT_CATEGORY_BOARD_TILE', issuedAt: AT, roundId: ROUND, tileId })
    store.dispatch({ type: 'REVEAL_CATEGORY_BOARD_PROMPT', issuedAt: AT, roundId: ROUND })
    store.dispatch({ type: 'REVEAL_CATEGORY_BOARD_ANSWER', issuedAt: AT, roundId: ROUND })
    store.dispatch({ type: 'RETURN_TO_CATEGORY_BOARD', issuedAt: AT, roundId: ROUND })
  }

  it('disables a used tile and marks it with text, not colour alone', () => {
    const store = boardStore()
    completeTile(store, 'alpha-100')
    renderPanel(store)

    const tile = screen.getByTestId('cbh-tile-alpha-100')
    expect(tile).toBeDisabled()
    expect(tile).toHaveTextContent('Used')
    expect(tile).toHaveAttribute('aria-label', 'Alpha Category, 100 points, already used')
  })

  it('a disabled used tile cannot be operated', () => {
    const store = boardStore()
    completeTile(store, 'alpha-100')
    renderPanel(store)

    const revisionBefore = store.getState().revision
    fireEvent.click(screen.getByTestId('cbh-tile-alpha-100'))
    expect(store.getState().revision).toBe(revisionBefore)
    expect(screen.queryByTestId('cbh-selected')).not.toBeInTheDocument()
  })

  it('leaves the other tiles operable', () => {
    const store = boardStore()
    completeTile(store, 'alpha-100')
    renderPanel(store)
    expect(screen.getByTestId('cbh-tile-alpha-200')).toBeEnabled()
  })
})

describe('the private preview', () => {
  function openTile(tileId = 'alpha-100') {
    const rendered = renderPanel()
    fireEvent.click(screen.getByTestId(`cbh-tile-${tileId}`))
    return rendered
  }

  it('shows the prompt, answer, alternates and teacher notes as soon as a tile is selected', () => {
    openTile('beta-100')
    expect(screen.getByTestId('cbh-prompt')).toHaveTextContent('Beta one hundred prompt')
    expect(screen.getByTestId('cbh-answer')).toHaveTextContent('Beta one hundred answer')
    expect(screen.getByTestId('cbh-alternates')).toHaveTextContent('B100 alternate one')
    expect(screen.getByTestId('cbh-alternates')).toHaveTextContent('B100 alternate two')
    expect(screen.getByTestId('cbh-notes')).toHaveTextContent('BETA-TEACHER-NOTE-100')
  })

  it('badges every private block so private is never implicit', () => {
    openTile('beta-100')
    expect(screen.getAllByText('Host only').length).toBeGreaterThanOrEqual(4)
  })

  it('omits the alternates and notes blocks when a tile has none', () => {
    openTile('alpha-200')
    expect(screen.queryByTestId('cbh-alternates')).not.toBeInTheDocument()
    expect(screen.queryByTestId('cbh-notes')).not.toBeInTheDocument()
  })

  it('shows the base value and multiplier when a tile is multiplied', () => {
    openTile('alpha-300')
    expect(screen.getByTestId('cbh-selected-value')).toHaveTextContent('600')
    expect(screen.getByTestId('cbh-selected')).toHaveTextContent('(300 × 2)')
  })

  it('states exactly what the projector is showing at every stage', () => {
    openTile('alpha-100')
    expect(screen.getByTestId('cbh-public-stage')).toHaveTextContent(/no prompt yet/i)
    fireEvent.click(screen.getByTestId('cbh-reveal-prompt'))
    expect(screen.getByTestId('cbh-public-stage')).toHaveTextContent(/the answer is NOT shown/i)
    fireEvent.click(screen.getByTestId('cbh-reveal-answer'))
    expect(screen.getByTestId('cbh-public-stage')).toHaveTextContent(/the prompt and the answer/i)
  })
})

describe('reveal controls follow the valid state machine', () => {
  it('offers only "show prompt" at the selected stage', () => {
    renderPanel()
    fireEvent.click(screen.getByTestId('cbh-tile-alpha-100'))
    expect(screen.getByTestId('cbh-reveal-prompt')).toBeInTheDocument()
    expect(screen.queryByTestId('cbh-reveal-answer')).not.toBeInTheDocument()
  })

  it('offers only "show answer" at the prompt stage', () => {
    renderPanel()
    fireEvent.click(screen.getByTestId('cbh-tile-alpha-100'))
    fireEvent.click(screen.getByTestId('cbh-reveal-prompt'))
    expect(screen.queryByTestId('cbh-reveal-prompt')).not.toBeInTheDocument()
    expect(screen.getByTestId('cbh-reveal-answer')).toBeInTheDocument()
  })

  it('offers only "return to board" at the answer stage', () => {
    renderPanel()
    fireEvent.click(screen.getByTestId('cbh-tile-alpha-100'))
    fireEvent.click(screen.getByTestId('cbh-reveal-prompt'))
    fireEvent.click(screen.getByTestId('cbh-reveal-answer'))
    expect(screen.queryByTestId('cbh-reveal-prompt')).not.toBeInTheDocument()
    expect(screen.queryByTestId('cbh-reveal-answer')).not.toBeInTheDocument()
    expect(screen.getByTestId('cbh-return')).toHaveTextContent('Return to board')
  })

  it('returns to the board and preserves the used tile', () => {
    const { store } = renderPanel()
    fireEvent.click(screen.getByTestId('cbh-tile-alpha-100'))
    fireEvent.click(screen.getByTestId('cbh-reveal-prompt'))
    fireEvent.click(screen.getByTestId('cbh-reveal-answer'))
    fireEvent.click(screen.getByTestId('cbh-return'))

    expect(screen.getByTestId('cbh-grid')).toBeInTheDocument()
    expect(screen.getByTestId('cbh-tile-alpha-100')).toBeDisabled()
    expect(store.getState().revision).toBeGreaterThan(0)
  })

  it('labels the return control as a cancel before the answer is public', () => {
    renderPanel()
    fireEvent.click(screen.getByTestId('cbh-tile-alpha-100'))
    expect(screen.getByTestId('cbh-return')).toHaveTextContent('Cancel and return to board')
  })
})

describe('a stale panel cannot drive an invalid transition', () => {
  it('rejects a command aimed at a round that is no longer current', () => {
    const store = boardStore()
    // The panel was rendered for `board-round`; the store then moves on.
    const rejected = store.dispatch({
      type: 'SELECT_CATEGORY_BOARD_TILE',
      issuedAt: AT,
      roundId: 'a-round-that-is-not-current',
      tileId: 'alpha-100',
    })
    expect(rejected.status).toBe('rejected')
    expect(store.getHistory().at(-1)?.type).not.toBe('CATEGORY_BOARD_TILE_SELECTED')
  })

  it('the store, not the panel, is the authority on legal transitions', () => {
    const store = boardStore()
    const before = store.getState().revision
    // A transition the panel never offers is still rejected outright.
    expect(
      store.dispatch({ type: 'REVEAL_CATEGORY_BOARD_ANSWER', issuedAt: AT, roundId: ROUND }).status,
    ).toBe('rejected')
    expect(store.getState().revision).toBe(before)
  })
})

describe('the panel renders nothing outside a playable board', () => {
  it('renders nothing when the current round is a placeholder', () => {
    const store = createSessionStore()
    store.dispatch({ type: 'INIT_SESSION', issuedAt: AT, sessionId: 's' })
    store.dispatch({
      type: 'INITIALIZE_GAME',
      issuedAt: AT,
      definition: createGameDefinition({ id: 'g', title: 'G', rounds: [placeholderRound('p1', 'P1')] }),
    })
    store.dispatch({ type: 'ADVANCE_TO_NEXT_ROUND', issuedAt: AT })
    const { container } = render(
      <CategoryBoardHostPanel dispatch={store.dispatch} game={store.getState().session!.game!} />,
    )
    expect(container).toBeEmptyDOMElement()
  })

  it('renders nothing when no round is selected', () => {
    const result = importGameFromUnknown(boardGameFile(richBoardConfig()))
    if (result.status !== 'success') throw new Error('fixture failed')
    const store = createSessionStore()
    store.dispatch({ type: 'INIT_SESSION', issuedAt: AT, sessionId: 's' })
    store.dispatch({ type: 'INITIALIZE_GAME', issuedAt: AT, definition: result.definition })
    const { container } = render(
      <CategoryBoardHostPanel dispatch={store.dispatch} game={store.getState().session!.game!} />,
    )
    expect(container).toBeEmptyDOMElement()
  })

  it('renders nothing after the game has ended', () => {
    const store = boardStore()
    store.dispatch({ type: 'END_GAME_SESSION', issuedAt: AT })
    const { container } = render(
      <CategoryBoardHostPanel dispatch={store.dispatch} game={store.getState().session!.game!} />,
    )
    expect(container).toBeEmptyDOMElement()
  })
})

describe('this panel reveals; it does not score', () => {
  /**
   * Slice 6 adds scoring, but it adds it in a SEPARATE panel. The claim protected
   * here is the one that survives: no button in the board panel can move a point,
   * and no timer/buzzer/wager control has appeared either.
   */
  it('offers no team, score, timer or buzzer control at any stage', () => {
    renderPanel()
    const forbidden = /team|score|point award|award points|subtract|deduct|timer|buzzer|wager/i
    const check = () => {
      for (const button of screen.getAllByRole('button')) {
        expect(button.textContent ?? '').not.toMatch(forbidden)
      }
    }
    check()
    fireEvent.click(screen.getByTestId('cbh-tile-alpha-100'))
    check()
    fireEvent.click(screen.getByTestId('cbh-reveal-prompt'))
    check()
    fireEvent.click(screen.getByTestId('cbh-reveal-answer'))
    check()
  })

  it('says explicitly that revealing does not score, and where scoring lives', () => {
    renderPanel()
    fireEvent.click(screen.getByTestId('cbh-tile-alpha-100'))
    expect(screen.getByTestId('cbh-selected')).toHaveTextContent(/revealing does not score/i)
    expect(screen.getByTestId('cbh-selected')).toHaveTextContent(/scoring panel/i)
  })

  it('says the answer reveal awarded nothing once the answer is up', () => {
    renderPanel()
    fireEvent.click(screen.getByTestId('cbh-tile-alpha-100'))
    fireEvent.click(screen.getByTestId('cbh-reveal-prompt'))
    fireEvent.click(screen.getByTestId('cbh-reveal-answer'))
    expect(screen.getByTestId('cbh-selected')).toHaveTextContent(/awarded nothing on its own/i)
  })
})
