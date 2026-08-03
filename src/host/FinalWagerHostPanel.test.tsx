import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { FinalWagerHostPanel } from './FinalWagerHostPanel'
import type { SessionCommand } from '../state/commands'
import type { DispatchResult } from '../state/store'
import type { PrivateGameState } from '../state/privateState'
import { createManualClock } from '../time/clock'
import {
  AT,
  FINAL_ROUND_ID,
  finalStore,
  playToReveal,
  settleAll,
} from '../test/finalWagerFixtures'
import type { SessionStore } from '../state/store'

/**
 * The host Final Wager panel (Slice 14).
 *
 * The load-bearing claims proved here:
 *  - the panel offers exactly the controls the planner would accept, and states
 *    WHY the others are unavailable rather than silently failing;
 *  - a wager number typed into a box is a DRAFT until it is saved, and the panel
 *    says which is which;
 *  - host-only content carries a visible "Host only" tag;
 *  - every irreversible action is two-step, with the consequence in the
 *    confirmation's own accessible name;
 *  - every control is a real button with an accessible name, so the panel is
 *    keyboard operable and nothing depends on colour.
 */

const ROUND = FINAL_ROUND_ID

function gameOf(store: SessionStore): PrivateGameState {
  const game = store.getState().session?.game
  if (!game) throw new Error('no game loaded')
  return game
}

function renderPanel(store: SessionStore) {
  const dispatch = vi.fn<(command: SessionCommand) => DispatchResult>(() => ({
    status: 'accepted',
    events: [],
  }))
  const result = render(
    <FinalWagerHostPanel
      dispatch={dispatch}
      game={gameOf(store)}
      clock={createManualClock(AT)}
    />,
  )
  return { dispatch, ...result }
}

describe('the panel renders only for a playable Final round', () => {
  it('renders nothing while a board round is current', () => {
    const store = finalStore({ scores: { red: 300 } })
    store.dispatch({ type: 'SELECT_ROUND', issuedAt: AT, roundId: 'board-round' })
    const { container } = renderPanel(store)
    expect(container).toBeEmptyDOMElement()
  })

  it('renders the setup section for a Final that has not begun', () => {
    const store = finalStore({ scores: { red: 300, blue: 100 } })
    renderPanel(store)
    expect(screen.getByRole('heading', { name: /final wager/i })).toBeInTheDocument()
    expect(screen.getByTestId('fwh-phase')).toHaveTextContent(/not started/i)
    expect(screen.getByTestId('fwh-begin')).toBeEnabled()
  })
})

describe('setup offers exactly two bounded eligibility choices', () => {
  it('defaults to classic and dispatches the chosen mode', () => {
    const store = finalStore({ scores: { red: 300, blue: 100 } })
    const { dispatch } = renderPanel(store)
    expect(screen.getByTestId('fwh-mode-classic')).toBeChecked()
    fireEvent.click(screen.getByTestId('fwh-mode-inclusive'))
    fireEvent.click(screen.getByTestId('fwh-begin'))
    expect(dispatch).toHaveBeenCalledWith({
      type: 'BEGIN_FINAL_WAGER',
      issuedAt: AT,
      roundId: ROUND,
      mode: 'inclusive',
    })
  })

  it('offers no third option and no per-team override', () => {
    const store = finalStore({ scores: { red: 300, blue: 100 } })
    renderPanel(store)
    const choice = screen.getByRole('group', { name: /final setup/i })
    expect(within(choice).getAllByRole('radio')).toHaveLength(2)
  })

  it('states the freeze in words, so a teacher knows it is one-way', () => {
    const store = finalStore({ scores: { red: 300, blue: 100 } })
    renderPanel(store)
    expect(screen.getByText(/frozen at this moment/i)).toBeInTheDocument()
  })
})

describe('wager entry distinguishes a draft from a committed value', () => {
  function wagerStore(): SessionStore {
    const store = finalStore({ scores: { red: 300, blue: 100 } })
    store.dispatch({ type: 'BEGIN_FINAL_WAGER', issuedAt: AT, roundId: ROUND, mode: 'classic' })
    return store
  }

  it('shows each eligible team its frozen cap', () => {
    const store = wagerStore()
    renderPanel(store)
    expect(screen.getByTestId('fwh-cap-red')).toHaveTextContent('300')
    expect(screen.getByTestId('fwh-cap-blue')).toHaveTextContent('100')
  })

  it('says a typed number is NOT saved until the host saves it', () => {
    const store = wagerStore()
    const { dispatch } = renderPanel(store)
    fireEvent.change(screen.getByTestId('fwh-wager-input-red'), { target: { value: '250' } })
    expect(screen.getByTestId('fwh-committed-wager-red')).toHaveTextContent(/not saved yet/i)
    fireEvent.click(screen.getByTestId('fwh-save-wager-red'))
    expect(dispatch).toHaveBeenCalledWith({
      type: 'RECORD_FINAL_WAGER',
      issuedAt: AT,
      roundId: ROUND,
      teamId: 'red',
      wager: 250,
    })
  })

  it('shows a committed wager, including an explicit zero', () => {
    const store = wagerStore()
    store.dispatch({ type: 'RECORD_FINAL_WAGER', issuedAt: AT, roundId: ROUND, teamId: 'red', wager: 0 })
    renderPanel(store)
    expect(screen.getByTestId('fwh-committed-wager-red')).toHaveTextContent('Saved: 0')
    expect(screen.getByTestId('fwh-save-wager-red')).toHaveTextContent(/correct wager/i)
  })

  it('disables the lock until every eligible team has a wager, and says why', () => {
    const store = wagerStore()
    store.dispatch({ type: 'RECORD_FINAL_WAGER', issuedAt: AT, roundId: ROUND, teamId: 'red', wager: 0 })
    renderPanel(store)
    expect(screen.getByTestId('fwh-lock-wagers')).toBeDisabled()
    expect(screen.getByTestId('fwh-wagers-incomplete')).toHaveTextContent(/explicit 0 counts/i)
  })

  it('enables the lock once every eligible team has a wager', () => {
    const store = wagerStore()
    store.dispatch({ type: 'RECORD_FINAL_WAGER', issuedAt: AT, roundId: ROUND, teamId: 'red', wager: 0 })
    store.dispatch({ type: 'RECORD_FINAL_WAGER', issuedAt: AT, roundId: ROUND, teamId: 'blue', wager: 0 })
    renderPanel(store)
    expect(screen.getByTestId('fwh-lock-wagers')).toBeEnabled()
    expect(screen.queryByTestId('fwh-wagers-incomplete')).not.toBeInTheDocument()
  })

  it('states that a window running out locks nothing', () => {
    renderPanel(wagerStore())
    expect(screen.getByText(/locks nothing and\s+marks nobody absent/i)).toBeInTheDocument()
  })
})

describe('response entry offers exactly the three durable states', () => {
  function responseStore(captureMode: 'exact-text' | 'host-only'): SessionStore {
    const store = finalStore({ scores: { red: 300, blue: 100 } })
    store.dispatch({ type: 'BEGIN_FINAL_WAGER', issuedAt: AT, roundId: ROUND, mode: 'classic' })
    store.dispatch({ type: 'RECORD_FINAL_WAGER', issuedAt: AT, roundId: ROUND, teamId: 'red', wager: 0 })
    store.dispatch({ type: 'RECORD_FINAL_WAGER', issuedAt: AT, roundId: ROUND, teamId: 'blue', wager: 0 })
    store.dispatch({ type: 'LOCK_FINAL_WAGERS', issuedAt: AT, roundId: ROUND })
    store.dispatch({
      type: 'START_FINAL_RESPONSE_WINDOW',
      issuedAt: AT,
      roundId: ROUND,
      captureMode,
    })
    return store
  }

  it('states that starting the window is what makes the question public', () => {
    const store = finalStore({ scores: { red: 300, blue: 100 } })
    store.dispatch({ type: 'BEGIN_FINAL_WAGER', issuedAt: AT, roundId: ROUND, mode: 'classic' })
    store.dispatch({ type: 'RECORD_FINAL_WAGER', issuedAt: AT, roundId: ROUND, teamId: 'red', wager: 0 })
    store.dispatch({ type: 'RECORD_FINAL_WAGER', issuedAt: AT, roundId: ROUND, teamId: 'blue', wager: 0 })
    store.dispatch({ type: 'LOCK_FINAL_WAGERS', issuedAt: AT, roundId: ROUND })
    renderPanel(store)
    expect(screen.getByText(/puts the question on the projector/i)).toBeInTheDocument()
  })

  it('offers a wording field only when the host chose exact capture', () => {
    const exact = responseStore('exact-text')
    const { unmount } = renderPanel(exact)
    expect(screen.getByTestId('fwh-response-input-red')).toBeInTheDocument()
    unmount()
    renderPanel(responseStore('host-only'))
    expect(screen.queryByTestId('fwh-response-input-red')).not.toBeInTheDocument()
    expect(screen.getByTestId('fwh-save-responded-red')).toBeInTheDocument()
    expect(screen.getByTestId('fwh-save-none-red')).toBeInTheDocument()
  })

  it('dispatches the three distinct response states', () => {
    const { dispatch } = renderPanel(responseStore('exact-text'))
    fireEvent.change(screen.getByTestId('fwh-response-input-red'), { target: { value: 'Convection' } })
    fireEvent.click(screen.getByTestId('fwh-save-exact-red'))
    fireEvent.click(screen.getByTestId('fwh-save-responded-blue'))
    fireEvent.click(screen.getByTestId('fwh-save-none-blue'))
    const responses = dispatch.mock.calls
      .map(([command]) => command)
      .filter((command) => command.type === 'RECORD_FINAL_RESPONSE')
      .map((command) => (command as { response: unknown }).response)
    expect(responses).toEqual([
      { kind: 'exact', text: 'Convection' },
      { kind: 'not-captured' },
      { kind: 'no-response' },
    ])
  })

  it('disables the wording button while the draft is blank', () => {
    renderPanel(responseStore('exact-text'))
    expect(screen.getByTestId('fwh-save-exact-red')).toBeDisabled()
    fireEvent.change(screen.getByTestId('fwh-response-input-red'), { target: { value: '   ' } })
    expect(screen.getByTestId('fwh-save-exact-red')).toBeDisabled()
  })

  it('disables the lock until every eligible team has a state, and says why', () => {
    const store = responseStore('host-only')
    store.dispatch({
      type: 'RECORD_FINAL_RESPONSE',
      issuedAt: AT,
      roundId: ROUND,
      teamId: 'red',
      response: { kind: 'not-captured' },
    })
    renderPanel(store)
    expect(screen.getByTestId('fwh-lock-responses')).toBeDisabled()
    expect(screen.getByTestId('fwh-responses-incomplete')).toHaveTextContent(/no response.*counts/i)
  })
})

describe('the answer, alternates and notes are visibly host-only', () => {
  it('tags each private block and offers the explicit reveal', () => {
    const store = finalStore({ scores: { red: 300, blue: 100 } })
    playToReveal(store, { wagers: { red: 0, blue: 0 } })
    // Rewind to the responses-locked stage by replaying up to the answer reveal.
    const lockedStore = finalStore({ scores: { red: 300, blue: 100 } })
    lockedStore.dispatch({ type: 'BEGIN_FINAL_WAGER', issuedAt: AT, roundId: ROUND, mode: 'classic' })
    lockedStore.dispatch({ type: 'RECORD_FINAL_WAGER', issuedAt: AT, roundId: ROUND, teamId: 'red', wager: 0 })
    lockedStore.dispatch({ type: 'RECORD_FINAL_WAGER', issuedAt: AT, roundId: ROUND, teamId: 'blue', wager: 0 })
    lockedStore.dispatch({ type: 'LOCK_FINAL_WAGERS', issuedAt: AT, roundId: ROUND })
    lockedStore.dispatch({
      type: 'START_FINAL_RESPONSE_WINDOW',
      issuedAt: AT,
      roundId: ROUND,
      captureMode: 'host-only',
    })
    lockedStore.dispatch({
      type: 'RECORD_FINAL_RESPONSE',
      issuedAt: AT,
      roundId: ROUND,
      teamId: 'red',
      response: { kind: 'not-captured' },
    })
    lockedStore.dispatch({
      type: 'RECORD_FINAL_RESPONSE',
      issuedAt: AT,
      roundId: ROUND,
      teamId: 'blue',
      response: { kind: 'not-captured' },
    })
    lockedStore.dispatch({ type: 'LOCK_FINAL_RESPONSES', issuedAt: AT, roundId: ROUND })

    renderPanel(lockedStore)
    const answer = screen.getByTestId('fwh-private-answer')
    expect(answer).toHaveTextContent(/host only/i)
    expect(answer).toHaveTextContent('Mantle convection')
    expect(screen.getByTestId('fwh-reveal-answer')).toBeEnabled()
  })
})

describe('reveal and adjudication', () => {
  function revealStore(): SessionStore {
    const store = finalStore({ scores: { red: 300, blue: 100 } })
    playToReveal(store, {
      wagers: { red: 100, blue: 50 },
      responses: { red: 'not-captured', blue: 'no-response' },
    })
    return store
  }

  it('marks the default next team while still offering every unrevealed team', () => {
    renderPanel(revealStore())
    // Default order is blue (100) then red (300).
    expect(screen.getByTestId('fwh-reveal-blue')).toHaveTextContent(/\(next\)/i)
    expect(screen.getByTestId('fwh-reveal-red')).toBeEnabled()
  })

  it('offers only the outcomes the planner would accept for the recorded response', () => {
    const store = revealStore()
    store.dispatch({ type: 'REVEAL_FINAL_TEAM', issuedAt: AT, roundId: ROUND, teamId: 'blue' })
    renderPanel(store)
    // Blue is recorded as `no-response`, so correct/incorrect are not offered.
    expect(screen.getByTestId('fwh-settle-no-response')).toBeInTheDocument()
    expect(screen.queryByTestId('fwh-settle-correct')).not.toBeInTheDocument()
  })

  it('previews the exact points each outcome will move', () => {
    const store = revealStore()
    store.dispatch({ type: 'REVEAL_FINAL_TEAM', issuedAt: AT, roundId: ROUND, teamId: 'red' })
    renderPanel(store)
    expect(screen.getByTestId('fwh-settle-correct')).toHaveTextContent('+100')
    expect(screen.getByTestId('fwh-settle-incorrect')).toHaveTextContent('-100')
  })

  it('dispatches the settlement for the team actually on screen', () => {
    const store = revealStore()
    store.dispatch({ type: 'REVEAL_FINAL_TEAM', issuedAt: AT, roundId: ROUND, teamId: 'red' })
    const { dispatch } = renderPanel(store)
    fireEvent.click(screen.getByTestId('fwh-settle-correct'))
    expect(dispatch).toHaveBeenCalledWith({
      type: 'SETTLE_FINAL_TEAM',
      issuedAt: AT,
      roundId: ROUND,
      teamId: 'red',
      outcome: 'correct',
    })
  })
})

describe('tie handling and irreversible completion', () => {
  function tiedStore(): SessionStore {
    const store = finalStore({ scores: { red: 300, blue: 100 } })
    playToReveal(store, { wagers: { red: 100, blue: 100 } })
    settleAll(store, { red: 'incorrect', blue: 'correct' })
    return store
  }

  it('presents BOTH tie choices, with sudden death highlighted as the default', () => {
    renderPanel(tiedStore())
    const suddenDeath = screen.getByTestId('fwh-sudden-death')
    const acceptTie = screen.getByTestId('fwh-accept-tie')
    expect(suddenDeath).toBeEnabled()
    expect(acceptTie).toBeEnabled()
    // Highlighted, not auto-selected: the primary style, still one click away.
    expect(suddenDeath.className).toContain('btn')
    expect(suddenDeath.className).not.toContain('btn--secondary')
    expect(acceptTie.className).toContain('btn--secondary')
  })

  it('names the tied leaders in words', () => {
    renderPanel(tiedStore())
    expect(screen.getByTestId('fwh-leader')).toHaveTextContent(/tied for the lead/i)
    expect(screen.getByTestId('fwh-leader')).toHaveTextContent(/red team/i)
    expect(screen.getByTestId('fwh-leader')).toHaveTextContent(/blue team/i)
  })

  it('requires a second, consequence-stating confirmation to accept a tie', () => {
    const { dispatch } = renderPanel(tiedStore())
    fireEvent.click(screen.getByTestId('fwh-accept-tie'))
    expect(dispatch).not.toHaveBeenCalled()
    const confirm = screen.getByTestId('fwh-accept-tie-confirm')
    expect(confirm).toHaveAccessibleName(/cannot be undone/i)
    fireEvent.click(confirm)
    expect(dispatch).toHaveBeenCalledWith({
      type: 'ACCEPT_FINAL_TIED_FINISH',
      issuedAt: AT,
      roundId: ROUND,
    })
  })

  it('can be cancelled before the irreversible action is taken', () => {
    const { dispatch } = renderPanel(tiedStore())
    fireEvent.click(screen.getByTestId('fwh-accept-tie'))
    fireEvent.click(screen.getByTestId('fwh-accept-tie-cancel'))
    expect(dispatch).not.toHaveBeenCalled()
    expect(screen.getByTestId('fwh-accept-tie')).toBeInTheDocument()
  })

  it('explains that sudden death is conducted out loud, with bounded correction', () => {
    const store = tiedStore()
    store.dispatch({ type: 'ENTER_FINAL_SUDDEN_DEATH', issuedAt: AT, roundId: ROUND })
    renderPanel(store)
    expect(screen.getByTestId('fwh-sudden-death-note')).toHaveTextContent(/out loud/i)
    expect(screen.getByTestId('fwh-sudden-death-note')).toHaveTextContent(/only a tied leader/i)
    // Completion stays disabled while the lead is still tied.
    expect(screen.getByTestId('fwh-complete')).toBeDisabled()
  })

  it('requires a consequence-stating confirmation to end a decided game', () => {
    const store = finalStore({ scores: { red: 300, blue: 100 } })
    playToReveal(store, { wagers: { red: 0, blue: 0 } })
    settleAll(store, { red: 'correct', blue: 'correct' })
    const { dispatch } = renderPanel(store)
    expect(screen.getByTestId('fwh-leader')).toHaveTextContent(/red team/i)
    fireEvent.click(screen.getByTestId('fwh-complete'))
    expect(dispatch).not.toHaveBeenCalled()
    fireEvent.click(screen.getByTestId('fwh-complete-confirm'))
    expect(dispatch).toHaveBeenCalledWith({ type: 'END_GAME_SESSION', issuedAt: AT })
  })
})

describe('accessibility', () => {
  it('gives every control an accessible name and a real button role', () => {
    const store = finalStore({ scores: { red: 300, blue: 100 } })
    store.dispatch({ type: 'BEGIN_FINAL_WAGER', issuedAt: AT, roundId: ROUND, mode: 'classic' })
    renderPanel(store)
    for (const button of screen.getAllByRole('button')) {
      expect(button).toHaveAccessibleName()
    }
    for (const box of screen.getAllByRole('spinbutton')) {
      expect(box).toHaveAccessibleName()
    }
  })

  it('names the wager field with the team’s own bounds', () => {
    const store = finalStore({ scores: { red: 300, blue: 100 } })
    store.dispatch({ type: 'BEGIN_FINAL_WAGER', issuedAt: AT, roundId: ROUND, mode: 'classic' })
    renderPanel(store)
    expect(screen.getByTestId('fwh-wager-input-red')).toHaveAccessibleName('Wager (0–300)')
  })

  it('announces the phase politely rather than interrupting', () => {
    const store = finalStore({ scores: { red: 300, blue: 100 } })
    renderPanel(store)
    expect(screen.getByTestId('fwh-phase')).toHaveAttribute('aria-live', 'polite')
  })

  it('goes read-only, with a stated reason, once the game has ended', () => {
    const store = finalStore({ scores: { red: 300, blue: 100 } })
    playToReveal(store, { wagers: { red: 100, blue: 100 } })
    settleAll(store, { red: 'incorrect', blue: 'correct' })
    store.dispatch({ type: 'ACCEPT_FINAL_TIED_FINISH', issuedAt: AT, roundId: ROUND })
    renderPanel(store)
    expect(screen.getByTestId('fwh-ended')).toHaveTextContent(/read-only/i)
    expect(screen.getByTestId('fwh-phase')).toHaveTextContent(/final is complete/i)
  })
})
