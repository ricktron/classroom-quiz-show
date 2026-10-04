import { describe, expect, it } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { LiveUndoControl } from './LiveUndoControl'
import { liveUndoTarget } from './liveUndo'
import { createSessionStore, type SessionStore } from '../state/store'
import type { SessionCommand } from '../state/commands'
import { importGameFromUnknown } from '../import/importGame'
import { boardGameFile, category, tile } from '../test/categoryBoardFixtures'
import { activeRespondent } from '../game/timing/buzzQueue'
import { responsePhaseFor, teamScoreFor } from '../state/reducer'

/**
 * Q6-RP-2 (G3) — ordinary live Undo.
 *
 * The label must say what the CANONICAL `UNDO` would reverse right now, and
 * pressing it must dispatch exactly that command. Each step below checks the
 * label against the real store, then undoes and checks the state really moved
 * back — so a label can never drift from the engine's undo semantics.
 */

const AT = 1_000
const ROUND = 'board-one'
const TILE = 'a-100'

function storeWithLiveClue(): SessionStore {
  const file = boardGameFile(undefined, {
    rounds: [
      {
        id: ROUND,
        type: 'category-board',
        title: 'Board One',
        config: { categories: [category('alpha', { tiles: [tile(TILE), tile('a-200', { value: 200 })] })] },
      },
      { id: 'final-round', type: 'final-wager', title: 'Final', config: { prompt: 'P', answer: 'A' } },
    ],
    teams: [
      { id: 'red', name: 'Red Team', accent: 'crimson' },
      { id: 'blue', name: 'Blue Team', accent: 'azure' },
    ],
  })
  const result = importGameFromUnknown(file)
  if (result.status !== 'success') throw new Error('fixture failed to import')
  const store = createSessionStore()
  const ok = (c: SessionCommand) => {
    const r = store.dispatch(c)
    if (r.status !== 'accepted') throw new Error(`fixture command rejected: ${c.type}`)
  }
  ok({ type: 'INIT_SESSION', issuedAt: AT, sessionId: 's' })
  ok({ type: 'INITIALIZE_GAME', issuedAt: AT, definition: result.definition })
  ok({ type: 'SET_SESSION_TEAM_NAME', issuedAt: AT, teamId: 'red', name: 'Comets' })
  ok({ type: 'SET_SESSION_TEAM_NAME', issuedAt: AT, teamId: 'blue', name: 'Rockets' })
  ok({ type: 'ADVANCE_TO_NEXT_ROUND', issuedAt: AT })
  ok({ type: 'SELECT_CATEGORY_BOARD_TILE', issuedAt: AT, roundId: ROUND, tileId: TILE })
  ok({ type: 'REVEAL_CATEGORY_BOARD_PROMPT', issuedAt: AT, roundId: ROUND })
  ok({ type: 'ARM_RESPONSE_PHASE', issuedAt: AT, roundId: ROUND })
  ok({ type: 'RECORD_TEAM_BUZZ', issuedAt: AT, roundId: ROUND, tileId: TILE, teamId: 'red' })
  ok({ type: 'RECORD_TEAM_BUZZ', issuedAt: AT, roundId: ROUND, tileId: TILE, teamId: 'blue' })
  return store
}

const game = (store: SessionStore) => store.getState().session!.game!
const active = (store: SessionStore) => activeRespondent(responsePhaseFor(game(store), ROUND).queue)
const label = (store: SessionStore) => liveUndoTarget(game(store), store.getHistory())?.label

function undo(store: SessionStore) {
  expect(store.dispatch({ type: 'UNDO', issuedAt: AT }).status).toBe('accepted')
}

describe('liveUndoTarget — names what the canonical UNDO would reverse', () => {
  it('walks a real live tail in teacher words, using Session names, and each label matches the undo effect', () => {
    const store = storeWithLiveClue()
    store.dispatch({
      type: 'RESOLVE_ACTIVE_RESPONSE',
      issuedAt: AT,
      roundId: ROUND,
      tileId: TILE,
      resolution: { kind: 'incorrect' },
    })
    expect(active(store)).toBe('blue')

    // The G3 failure case: a mistaken Incorrect is undoable from the ordinary label.
    expect(label(store)).toBe('Undo Incorrect (Comets)')
    undo(store)
    expect(active(store)).toBe('red')

    expect(label(store)).toBe('Undo buzz-in (Rockets)')
    undo(store)
    expect(label(store)).toBe('Undo buzz-in (Comets)')
    undo(store)
    // No timer was running, so the buzz recorded no timer stop; next is the arming.
    expect(label(store)).toBe('Undo arm clue')
  })

  it('labels score changes with team and signed delta, matching the score-specific undo', () => {
    const store = storeWithLiveClue()
    const result = store.dispatch({
      type: 'ADJUST_TEAM_SCORE',
      issuedAt: AT,
      teamId: 'red',
      delta: 100,
      mode: 'full-credit',
      source: { kind: 'category-board-tile', roundId: ROUND, tileId: TILE },
    })
    expect(result.status).toBe('accepted')
    expect(teamScoreFor(game(store), 'red')).toBe(100)
    expect(label(store)).toBe('Undo score change (Comets +100)')
    undo(store)
    expect(teamScoreFor(game(store), 'red')).toBe(0)
  })

  it('labels board stage and round moves', () => {
    const store = storeWithLiveClue()
    // Unwind the buzzes and arming to reach the reveal.
    while (label(store) !== 'Undo show prompt') undo(store)
    undo(store)
    expect(label(store)).toBe('Undo clue pick')
    undo(store)
    expect(label(store)).toBe('Undo move to Round 1')
    undo(store)
    expect(game(store).currentRoundIndex).toBeNull()
    expect(label(store)).toBe('Undo team name change')
  })

  it('returns null once the game has ended (the planner refuses undo)', () => {
    const store = storeWithLiveClue()
    store.dispatch({ type: 'END_GAME_SESSION', issuedAt: AT })
    expect(liveUndoTarget(game(store), store.getHistory())).toBeNull()
  })
})

describe('LiveUndoControl', () => {
  function renderControl(store: SessionStore, disabled = false) {
    const dispatched: SessionCommand[] = []
    const dispatch = (command: SessionCommand) => {
      dispatched.push(command)
      const result = store.dispatch(command)
      view.rerender(tree())
      return result
    }
    const tree = () => (
      <LiveUndoControl
        dispatch={dispatch}
        game={game(store)}
        history={store.getHistory()}
        disabled={disabled}
      />
    )
    const view = render(tree())
    return { dispatched }
  }

  it('shows what will be undone and dispatches the canonical UNDO', () => {
    const store = storeWithLiveClue()
    store.dispatch({
      type: 'RESOLVE_ACTIVE_RESPONSE',
      issuedAt: AT,
      roundId: ROUND,
      tileId: TILE,
      resolution: { kind: 'incorrect' },
    })
    const { dispatched } = renderControl(store)
    const button = screen.getByTestId('host-undo')
    expect(button).toHaveTextContent('Undo Incorrect (Comets)')
    expect(button).toBeEnabled()
    fireEvent.click(button)
    expect(dispatched.map((c) => c.type)).toEqual(['UNDO'])
    expect(screen.getByTestId('host-undo')).toHaveTextContent('Undo buzz-in (Rockets)')
  })

  it('is absent before the first round and after the game ends', () => {
    const before = storeWithLiveClue()
    while (game(before).currentRoundIndex !== null) undo(before)
    const { unmount } = render(
      <LiveUndoControl dispatch={() => ({ status: 'rejected', reason: 'x' }) as never} game={game(before)} history={before.getHistory()} />,
    )
    expect(screen.queryByTestId('host-undo')).not.toBeInTheDocument()
    unmount()

    const ended = storeWithLiveClue()
    ended.dispatch({ type: 'END_GAME_SESSION', issuedAt: AT })
    render(
      <LiveUndoControl dispatch={() => ({ status: 'rejected', reason: 'x' }) as never} game={game(ended)} history={ended.getHistory()} />,
    )
    expect(screen.queryByTestId('host-undo')).not.toBeInTheDocument()
  })

  it('is disabled when this tab may not dispatch session commands', () => {
    const store = storeWithLiveClue()
    renderControl(store, true)
    expect(screen.getByTestId('host-undo')).toBeDisabled()
  })
})
