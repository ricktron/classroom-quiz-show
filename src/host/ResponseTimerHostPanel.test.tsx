import { describe, expect, it } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { ResponseTimerHostPanel } from './ResponseTimerHostPanel'
import { createSessionStore, type SessionStore } from '../state/store'
import type { SessionCommand } from '../state/commands'
import { importGameFromUnknown } from '../import/importGame'
import { boardGameFile, richBoardConfig } from '../test/categoryBoardFixtures'
import { createManualClock } from '../time/clock'
import { DEFAULT_RESPONSE_SECONDS } from '../game/timing/limits'

/**
 * Host response-timer controls — component behaviour (Slice 7).
 *
 * The panel is the teacher's private surface for arming and timing. These tests
 * check that it states the four facts a teacher needs, that a control the reducer
 * would reject is DISABLED rather than offered, that it is fully keyboard
 * operable, and that it introduces no buzzer surface of any kind.
 *
 * Every test drives a MANUAL clock. Nothing here waits for real seconds.
 */

const AT = 1_000_000
const ROUND = 'board-round'

function boardStore(overrides: Record<string, unknown> = {}): SessionStore {
  const result = importGameFromUnknown(boardGameFile(richBoardConfig(), overrides))
  if (result.status !== 'success') throw new Error('fixture failed to import')
  const store = createSessionStore()
  store.dispatch({ type: 'INIT_SESSION', issuedAt: AT, sessionId: 's' })
  store.dispatch({ type: 'INITIALIZE_GAME', issuedAt: AT, definition: result.definition })
  store.dispatch({ type: 'ADVANCE_TO_NEXT_ROUND', issuedAt: AT })
  return store
}

function renderPanel(store: SessionStore = boardStore(), clock = createManualClock(AT)) {
  const game = () => {
    const value = store.getState().session?.game
    if (!value) throw new Error('no game')
    return value
  }
  const dispatch = (command: SessionCommand) => {
    const result = store.dispatch(command)
    view.rerender(<ResponseTimerHostPanel dispatch={dispatch} game={game()} clock={clock} />)
    return result
  }
  const view = render(<ResponseTimerHostPanel dispatch={dispatch} game={game()} clock={clock} />)
  const rerender = () =>
    view.rerender(<ResponseTimerHostPanel dispatch={dispatch} game={game()} clock={clock} />)
  return { store, view, clock, rerender }
}

/** Open a tile to the prompt stage — the one legal window. */
function openClue(store: SessionStore) {
  store.dispatch({
    type: 'SELECT_CATEGORY_BOARD_TILE',
    issuedAt: AT,
    roundId: ROUND,
    tileId: 'alpha-100',
  })
  store.dispatch({ type: 'REVEAL_CATEGORY_BOARD_PROMPT', issuedAt: AT, roundId: ROUND })
}

const button = (name: RegExp) => screen.getByRole('button', { name })

describe('what the panel states', () => {
  it('names the phase, the arming state, the timer status and the remaining time', () => {
    const store = boardStore()
    openClue(store)
    renderPanel(store)
    expect(screen.getByTestId('rth-open')).toHaveTextContent('Open — prompt is public')
    expect(screen.getByTestId('rth-armed')).toHaveTextContent('Not armed')
    expect(screen.getByTestId('rth-status')).toHaveTextContent('No timer running')
    expect(screen.getByTestId('rth-remaining')).toHaveTextContent('—')
  })

  it('states arming in WORDS, not by colour alone', () => {
    const store = boardStore()
    openClue(store)
    renderPanel(store)
    fireEvent.click(button(/^arm clue$/i))
    expect(screen.getByTestId('rth-armed')).toHaveTextContent('Armed')
  })

  it('shows the remaining time derived from the deadline and the injected clock', () => {
    const store = boardStore()
    openClue(store)
    const { clock, rerender } = renderPanel(store)
    fireEvent.click(button(/start timer/i))
    expect(screen.getByTestId('rth-remaining')).toHaveTextContent('0:30')
    clock.advance(12_000)
    rerender()
    expect(screen.getByTestId('rth-remaining')).toHaveTextContent('0:18')
  })

  it('says the window is paused, and how much was left', () => {
    const store = boardStore()
    openClue(store)
    const { clock, rerender } = renderPanel(store)
    fireEvent.click(button(/start timer/i))
    clock.advance(10_000)
    rerender()
    fireEvent.click(button(/^pause$/i))
    expect(screen.getByTestId('rth-status')).toHaveTextContent('Paused')
    expect(screen.getByTestId('rth-remaining')).toHaveTextContent('0:20')
  })

  it('says the window was stopped, and by whom', () => {
    const store = boardStore()
    openClue(store)
    const { clock, rerender } = renderPanel(store)
    fireEvent.click(button(/start timer/i))
    clock.advance(5_000)
    rerender()
    fireEvent.click(button(/stop timer/i))
    expect(screen.getByTestId('rth-status')).toHaveTextContent('Stopped early')
    expect(screen.getByTestId('rth-status')).toHaveTextContent('stopped by the host')
  })

  it('says the window expired', () => {
    const store = boardStore()
    openClue(store)
    const { clock, rerender } = renderPanel(store)
    fireEvent.click(button(/start timer/i))
    const game = store.getState().session?.game
    const timer = game?.responsePhases[ROUND].timer
    if (!timer || timer.status !== 'running') throw new Error('expected a running timer')
    clock.advance(30_000)
    store.dispatch({
      type: 'EXPIRE_RESPONSE_TIMER',
      issuedAt: clock.now(),
      roundId: ROUND,
      timerId: timer.timerId,
      deadline: timer.deadline,
    })
    rerender()
    expect(screen.getByTestId('rth-status')).toHaveTextContent('Time up')
    expect(screen.getByTestId('rth-remaining')).toHaveTextContent('0:00')
  })
})

describe('controls are disabled when illegal, not offered and refused', () => {
  it('disables everything while the board grid is showing, and says why', () => {
    renderPanel()
    expect(button(/^arm clue$/i)).toBeDisabled()
    expect(button(/start timer/i)).toBeDisabled()
    expect(button(/^pause$/i)).toBeDisabled()
    expect(button(/^resume$/i)).toBeDisabled()
    expect(button(/stop timer/i)).toBeDisabled()
    expect(button(/reset window/i)).toBeDisabled()
    expect(screen.getByTestId('rth-unavailable')).toHaveTextContent('Open a tile')
  })

  it('explains the `selected` stage specifically', () => {
    const store = boardStore()
    store.dispatch({
      type: 'SELECT_CATEGORY_BOARD_TILE',
      issuedAt: AT,
      roundId: ROUND,
      tileId: 'alpha-100',
    })
    renderPanel(store)
    expect(screen.getByTestId('rth-unavailable')).toHaveTextContent('Show the prompt')
  })

  it('explains that a revealed answer ends the window', () => {
    const store = boardStore()
    openClue(store)
    store.dispatch({ type: 'REVEAL_CATEGORY_BOARD_ANSWER', issuedAt: AT, roundId: ROUND })
    renderPanel(store)
    expect(screen.getByTestId('rth-unavailable')).toHaveTextContent('the response window is over')
  })

  it('disables arm once armed and disarm until it is', () => {
    const store = boardStore()
    openClue(store)
    renderPanel(store)
    expect(button(/^disarm clue$/i)).toBeDisabled()
    fireEvent.click(button(/^arm clue$/i))
    expect(button(/^arm clue$/i)).toBeDisabled()
    expect(button(/^disarm clue$/i)).toBeEnabled()
  })

  it('disables start while a timer is live, and pause/resume by status', () => {
    const store = boardStore()
    openClue(store)
    const { clock, rerender } = renderPanel(store)
    expect(button(/^pause$/i)).toBeDisabled()
    fireEvent.click(button(/start timer/i))
    expect(button(/start timer/i)).toBeDisabled()
    expect(button(/^pause$/i)).toBeEnabled()
    expect(button(/^resume$/i)).toBeDisabled()
    clock.advance(1_000)
    rerender()
    fireEvent.click(button(/^pause$/i))
    expect(button(/^pause$/i)).toBeDisabled()
    expect(button(/^resume$/i)).toBeEnabled()
  })

  it('disables reset until there is something to reset', () => {
    const store = boardStore()
    openClue(store)
    renderPanel(store)
    expect(button(/reset window/i)).toBeDisabled()
    fireEvent.click(button(/^arm clue$/i))
    expect(button(/reset window/i)).toBeEnabled()
  })

  it('locks the duration selector while a timer is live', () => {
    const store = boardStore()
    openClue(store)
    renderPanel(store)
    expect(screen.getByTestId('rth-duration')).toBeEnabled()
    fireEvent.click(button(/start timer/i))
    expect(screen.getByTestId('rth-duration')).toBeDisabled()
  })

  it('never issues a command the reducer rejects', () => {
    const store = boardStore()
    openClue(store)
    const rejected: string[] = []
    const game = () => {
      const value = store.getState().session?.game
      if (!value) throw new Error('no game')
      return value
    }
    const clock = createManualClock(AT)
    const dispatch = (command: SessionCommand) => {
      const result = store.dispatch(command)
      if (result.status === 'rejected') rejected.push(`${command.type}:${result.reason}`)
      view.rerender(<ResponseTimerHostPanel dispatch={dispatch} game={game()} clock={clock} />)
      return result
    }
    const view = render(
      <ResponseTimerHostPanel dispatch={dispatch} game={game()} clock={clock} />,
    )
    // Click every enabled control in turn; none may be refused.
    fireEvent.click(button(/^arm clue$/i))
    fireEvent.click(button(/start timer/i))
    clock.advance(2_000)
    view.rerender(<ResponseTimerHostPanel dispatch={dispatch} game={game()} clock={clock} />)
    fireEvent.click(button(/^pause$/i))
    fireEvent.click(button(/^resume$/i))
    fireEvent.click(button(/stop timer/i))
    fireEvent.click(button(/reset window/i))
    fireEvent.click(button(/^disarm clue$/i))
    expect(rejected).toEqual([])
  })
})

describe('the duration selector', () => {
  it('offers the game’s authored default, marked as such', () => {
    const store = boardStore({ timer: { responseSeconds: 45 } })
    openClue(store)
    renderPanel(store)
    const select = screen.getByTestId('rth-duration') as HTMLSelectElement
    expect(select.value).toBe('45')
    expect(screen.getByRole('option', { name: /45 seconds \(this game’s default\)/ })).toBeInTheDocument()
  })

  it('falls back to the documented default for a game that authored none', () => {
    const store = boardStore()
    openClue(store)
    renderPanel(store)
    expect((screen.getByTestId('rth-duration') as HTMLSelectElement).value).toBe(
      String(DEFAULT_RESPONSE_SECONDS),
    )
  })

  it('starts a timer of the chosen length', () => {
    const store = boardStore()
    openClue(store)
    renderPanel(store)
    fireEvent.change(screen.getByTestId('rth-duration'), { target: { value: '60' } })
    fireEvent.click(button(/start timer/i))
    const timer = store.getState().session?.game?.responsePhases[ROUND].timer
    expect(timer && timer.status === 'running' && timer.durationMs).toBe(60_000)
  })

  it('has an associated label, so it is reachable and announced', () => {
    const store = boardStore()
    openClue(store)
    renderPanel(store)
    expect(screen.getByLabelText('Timer length')).toBe(screen.getByTestId('rth-duration'))
  })
})

describe('accessibility and scope', () => {
  it('groups the controls with names, and every control is a real button', () => {
    const store = boardStore()
    openClue(store)
    renderPanel(store)
    expect(screen.getByRole('group', { name: 'Arming controls' })).toBeInTheDocument()
    expect(screen.getByRole('group', { name: 'Timer controls' })).toBeInTheDocument()
    for (const name of [/^arm clue$/i, /start timer/i, /reset window/i]) {
      expect(button(name).tagName).toBe('BUTTON')
    }
  })

  it('operates by keyboard alone', () => {
    const store = boardStore()
    openClue(store)
    renderPanel(store)
    const arm = button(/^arm clue$/i)
    arm.focus()
    expect(arm).toHaveFocus()
    // A real <button> activates on Enter/Space; firing the click the browser
    // synthesises is the standard way to assert that here.
    fireEvent.click(arm)
    expect(screen.getByTestId('rth-armed')).toHaveTextContent('Armed')
  })

  it('spells the remaining duration out for screen readers', () => {
    const store = boardStore()
    openClue(store)
    renderPanel(store)
    fireEvent.click(button(/start timer/i))
    expect(screen.getByLabelText('Remaining: 30 seconds')).toBeInTheDocument()
  })

  /**
   * Scope is asserted on the CONTROLS, not on the prose. The panel's hint
   * deliberately says that nothing buzzes in yet and that expiry awards nothing —
   * telling a teacher what the slice does not do is the point of the sentence, and
   * a raw-HTML string match would forbid saying it.
   */
  it('offers exactly the arming and timer controls — no buzzer control of any kind', () => {
    const store = boardStore()
    openClue(store)
    renderPanel(store)
    const names = screen
      .getAllByRole('button')
      .map((element) => (element.textContent ?? '').trim().toLowerCase())
    expect(names).toEqual([
      'arm clue',
      'disarm clue',
      'start timer',
      'pause',
      'resume',
      'stop timer',
      'reset window',
    ])
  })

  it('exposes no buzzer, device or queue affordance', () => {
    const store = boardStore()
    openClue(store)
    const { view } = renderPanel(store)
    // Interactive surface only: every control, every option, every test id.
    const interactive = [...view.container.querySelectorAll('button, select, option, input')]
      .map((element) => `${element.getAttribute('data-testid') ?? ''} ${element.textContent ?? ''}`)
      .join(' ')
      .toLowerCase()
    for (const forbidden of ['buzz', 'gamepad', 'controller', 'device', 'queue', 'lockout']) {
      expect(interactive, `must not contain ${forbidden}`).not.toContain(forbidden)
    }
  })

  it('scores nothing — no control here can move a point', () => {
    const store = boardStore()
    openClue(store)
    const { view } = renderPanel(store)
    const interactive = [...view.container.querySelectorAll('button, select, option, input')]
      .map((element) => element.textContent ?? '')
      .join(' ')
      .toLowerCase()
    for (const forbidden of ['award', 'deduct', 'point', 'score', 'credit']) {
      expect(interactive, `must not contain ${forbidden}`).not.toContain(forbidden)
    }
  })

  it('renders nothing at all when the current round is not a playable board', () => {
    const store = createSessionStore()
    store.dispatch({ type: 'INIT_SESSION', issuedAt: AT, sessionId: 's' })
    const result = importGameFromUnknown(boardGameFile(richBoardConfig()))
    if (result.status !== 'success') throw new Error('fixture failed to import')
    store.dispatch({ type: 'INITIALIZE_GAME', issuedAt: AT, definition: result.definition })
    // No round selected yet.
    const game = store.getState().session?.game
    if (!game) throw new Error('no game')
    const { container } = render(
      <ResponseTimerHostPanel dispatch={() => store.dispatch({ type: 'UNDO', issuedAt: AT })} game={game} />,
    )
    expect(container).toBeEmptyDOMElement()
  })
})
