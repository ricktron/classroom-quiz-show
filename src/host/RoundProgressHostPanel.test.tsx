import { describe, expect, it } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { RoundProgressHostPanel, RoundStartButton } from './RoundProgressHostPanel'
import { createSessionStore, type SessionStore } from '../state/store'
import type { SessionCommand } from '../state/commands'
import { importGameFromUnknown } from '../import/importGame'
import { boardGameFile, category, tile } from '../test/categoryBoardFixtures'

/**
 * Q6-RP-1 (G1) — ordinary Host round progression, component behaviour.
 *
 * Proves the ordinary controls dispatch the engine's existing commands, guard
 * the cases the reducer does not (open clue, unplayed clues, irreversible end),
 * and step aside for the Final and after completion.
 */

const AT = 1_000

function gameFile(rounds: readonly Record<string, unknown>[]): Record<string, unknown> {
  return boardGameFile(undefined, {
    rounds,
    teams: [
      { id: 'red', name: 'Red Team', accent: 'crimson' },
      { id: 'blue', name: 'Blue Team', accent: 'azure' },
    ],
  })
}

const BOARD_ONE = {
  id: 'board-one',
  type: 'category-board',
  title: 'Board One',
  config: { categories: [category('alpha', { tiles: [tile('a-100'), tile('a-200', { value: 200 })] })] },
}
const BOARD_TWO = {
  id: 'board-two',
  type: 'category-board',
  title: 'Board Two',
  config: { categories: [category('bravo', { tiles: [tile('b-100')] })] },
}
const FINAL = {
  id: 'final-round',
  type: 'final-wager',
  title: 'Final Wager',
  config: { prompt: 'Final prompt', answer: 'Final answer' },
}

function storeFor(rounds: readonly Record<string, unknown>[]): SessionStore {
  const result = importGameFromUnknown(gameFile(rounds))
  if (result.status !== 'success') throw new Error('fixture failed to import')
  const store = createSessionStore()
  store.dispatch({ type: 'INIT_SESSION', issuedAt: AT, sessionId: 's' })
  store.dispatch({ type: 'INITIALIZE_GAME', issuedAt: AT, definition: result.definition })
  return store
}

function renderBoth(store: SessionStore) {
  const dispatched: SessionCommand[] = []
  const dispatch = (command: SessionCommand) => {
    dispatched.push(command)
    const result = store.dispatch(command)
    view.rerender(tree())
    return result
  }
  const tree = () => {
    const game = store.getState().session!.game!
    return (
      <>
        <RoundStartButton dispatch={dispatch} game={game} />
        <RoundProgressHostPanel dispatch={dispatch} game={game} />
      </>
    )
  }
  const view = render(tree())
  return { dispatched, view }
}

function game(store: SessionStore) {
  return store.getState().session!.game!
}

function playTile(store: SessionStore, roundId: string, tileId: string) {
  store.dispatch({ type: 'SELECT_CATEGORY_BOARD_TILE', issuedAt: AT, roundId, tileId })
  store.dispatch({ type: 'REVEAL_CATEGORY_BOARD_PROMPT', issuedAt: AT, roundId })
  store.dispatch({ type: 'REVEAL_CATEGORY_BOARD_ANSWER', issuedAt: AT, roundId })
  store.dispatch({ type: 'RETURN_TO_CATEGORY_BOARD', issuedAt: AT, roundId })
}

describe('before the first round', () => {
  it('offers exactly one ordinary action — Start Round 1 — and it begins round 1', () => {
    const store = storeFor([BOARD_ONE, BOARD_TWO, FINAL])
    const { dispatched } = renderBoth(store)
    expect(screen.queryByTestId('rph')).not.toBeInTheDocument()
    const start = screen.getByTestId('rph-start')
    expect(start).toHaveTextContent('Start Round 1')
    fireEvent.click(start)
    expect(dispatched.map((c) => c.type)).toEqual(['ADVANCE_TO_NEXT_ROUND'])
    expect(game(store).currentRoundIndex).toBe(0)
    expect(screen.queryByTestId('rph-start')).not.toBeInTheDocument()
  })

  it('names the Final when the first round is the Final', () => {
    const store = storeFor([FINAL])
    renderBoth(store)
    expect(screen.getByTestId('rph-start')).toHaveTextContent('Start the Final')
  })

  it('can be disabled while this tab may not dispatch session commands', () => {
    const store = storeFor([BOARD_ONE])
    render(<RoundStartButton dispatch={() => ({ status: 'rejected', reason: 'x' }) as never} game={game(store)} disabled />)
    expect(screen.getByTestId('rph-start')).toBeDisabled()
  })
})

describe('during a board round', () => {
  it('reports progress and confirms before leaving unplayed clues behind', () => {
    const store = storeFor([BOARD_ONE, BOARD_TWO, FINAL])
    store.dispatch({ type: 'ADVANCE_TO_NEXT_ROUND', issuedAt: AT })
    const { dispatched } = renderBoth(store)
    expect(screen.getByTestId('rph-status')).toHaveTextContent('Round 1 of 3 · 0 of 2 clues played')
    const next = screen.getByTestId('rph-next')
    expect(next).toHaveTextContent('Start Round 2')
    fireEvent.click(next)
    expect(dispatched).toEqual([])
    expect(screen.getByTestId('rph-confirm')).toHaveTextContent('2 clues have not been played')
    fireEvent.click(screen.getByTestId('rph-cancel'))
    expect(screen.queryByTestId('rph-confirm')).not.toBeInTheDocument()
    expect(game(store).currentRoundIndex).toBe(0)
    fireEvent.click(screen.getByTestId('rph-next'))
    fireEvent.click(screen.getByTestId('rph-next-confirm'))
    expect(dispatched.map((c) => c.type)).toEqual(['ADVANCE_TO_NEXT_ROUND'])
    expect(game(store).currentRoundIndex).toBe(1)
  })

  it('cannot change round while a clue is open', () => {
    const store = storeFor([BOARD_ONE, FINAL])
    store.dispatch({ type: 'ADVANCE_TO_NEXT_ROUND', issuedAt: AT })
    store.dispatch({ type: 'SELECT_CATEGORY_BOARD_TILE', issuedAt: AT, roundId: 'board-one', tileId: 'a-100' })
    renderBoth(store)
    expect(screen.getByTestId('rph-next')).toBeDisabled()
    expect(screen.getByTestId('rph-blocked-note')).toBeInTheDocument()
  })

  it('makes the next step primary and confirm-free once the board is played out', () => {
    const store = storeFor([BOARD_ONE, FINAL])
    store.dispatch({ type: 'ADVANCE_TO_NEXT_ROUND', issuedAt: AT })
    playTile(store, 'board-one', 'a-100')
    playTile(store, 'board-one', 'a-200')
    const { dispatched } = renderBoth(store)
    expect(screen.getByTestId('rph-status')).toHaveTextContent('2 of 2 clues played')
    const next = screen.getByTestId('rph-next')
    expect(next).toHaveTextContent('Go to the Final')
    expect(next).not.toHaveClass('btn--secondary')
    fireEvent.click(next)
    expect(dispatched.map((c) => c.type)).toEqual(['ADVANCE_TO_NEXT_ROUND'])
    // The Final panel owns the Final; progression steps aside.
    expect(screen.queryByTestId('rph')).not.toBeInTheDocument()
  })
})

describe('ending a game without a Final', () => {
  it('always confirms the irreversible end, then steps aside', () => {
    const store = storeFor([BOARD_ONE])
    store.dispatch({ type: 'ADVANCE_TO_NEXT_ROUND', issuedAt: AT })
    const { dispatched } = renderBoth(store)
    expect(screen.queryByTestId('rph-next')).not.toBeInTheDocument()
    fireEvent.click(screen.getByTestId('rph-end'))
    expect(dispatched).toEqual([])
    expect(screen.getByTestId('rph-confirm')).toHaveTextContent("can't be undone")
    fireEvent.click(screen.getByTestId('rph-end-confirm'))
    expect(dispatched.map((c) => c.type)).toEqual(['END_GAME_SESSION'])
    expect(game(store).gameLifecycle).toBe('ended')
    expect(screen.queryByTestId('rph')).not.toBeInTheDocument()
    expect(screen.queryByTestId('rph-start')).not.toBeInTheDocument()
  })

  it('still confirms when every clue has been played', () => {
    const store = storeFor([BOARD_ONE])
    store.dispatch({ type: 'ADVANCE_TO_NEXT_ROUND', issuedAt: AT })
    playTile(store, 'board-one', 'a-100')
    playTile(store, 'board-one', 'a-200')
    renderBoth(store)
    fireEvent.click(screen.getByTestId('rph-end'))
    expect(screen.getByTestId('rph-confirm')).not.toHaveTextContent('not been played')
    expect(screen.getByTestId('rph-end-confirm')).toBeInTheDocument()
  })
})
