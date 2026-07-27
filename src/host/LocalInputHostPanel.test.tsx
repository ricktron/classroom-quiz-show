import { describe, expect, it } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { LocalInputHostPanel } from './LocalInputHostPanel'
import { createSessionStore, type SessionStore } from '../state/store'
import type { SessionCommand } from '../state/commands'
import { importGameFromUnknown } from '../import/importGame'
import { richBoardConfig } from '../test/categoryBoardFixtures'
import { teamBoardGameFile } from '../test/teamFixtures'
import { createManualClock } from '../time/clock'
import { responsePhaseFor } from '../state/reducer'
import { activeRespondent, waitingRespondents } from '../game/timing/buzzQueue'
import {
  KEYBOARD_MAPPING_STORAGE_KEY,
  type LocalConfigStorage,
} from '../input/keyboardMappingStore'

/**
 * Host local-input & buzz-queue controls — component behaviour (Slice 8).
 *
 * The claims proved here:
 *  - a teacher can see each team's buzz key, change one, clear one, and reset to
 *    the defaults;
 *  - a conflicting key is REFUSED with a message and nothing is overwritten;
 *  - capture mode suspends buzzing, so pressing a key to assign it cannot fire it;
 *  - a real key press buzzes the mapped team, and a repeat or a held key does not
 *    buzz twice;
 *  - typing in a field never buzzes;
 *  - the active team and the ordered queue are shown, and both host actions
 *    promote the next team;
 *  - a press that did nothing is explained;
 *  - no raw mapping, and no Gamepad/Sony/coloured-button surface, exists here.
 *
 * Every test drives a MANUAL clock and an in-memory storage double. Nothing here
 * waits for a real millisecond or touches the browser's `localStorage`.
 */

const AT = 1_000_000
const ROUND = 'board-round'
const TILE = 'alpha-100'

const THREE_TEAMS = [
  { id: 'red', name: 'Red Team', accent: 'crimson' },
  { id: 'blue', name: 'Blue Team', accent: 'azure' },
  { id: 'green', name: 'Green Team', accent: 'emerald' },
]

function memoryStorage(initial?: string): LocalConfigStorage & { raw(): string | null } {
  let value: string | null = initial ?? null
  return {
    getItem: (key) => (key === KEYBOARD_MAPPING_STORAGE_KEY ? value : null),
    setItem: (_key, next) => {
      value = next
    },
    removeItem: () => {
      value = null
    },
    raw: () => value,
  }
}

function boardStore(teams: unknown = THREE_TEAMS): SessionStore {
  const result = importGameFromUnknown(teamBoardGameFile(teams, richBoardConfig()))
  if (result.status !== 'success') throw new Error('fixture failed to import')
  const store = createSessionStore()
  store.dispatch({ type: 'INIT_SESSION', issuedAt: AT, sessionId: 's' })
  store.dispatch({ type: 'INITIALIZE_GAME', issuedAt: AT, definition: result.definition })
  store.dispatch({ type: 'ADVANCE_TO_NEXT_ROUND', issuedAt: AT })
  return store
}

/** Open a tile to the prompt stage — the one legal window. */
function openClue(store: SessionStore) {
  store.dispatch({ type: 'SELECT_CATEGORY_BOARD_TILE', issuedAt: AT, roundId: ROUND, tileId: TILE })
  store.dispatch({ type: 'REVEAL_CATEGORY_BOARD_PROMPT', issuedAt: AT, roundId: ROUND })
}

function arm(store: SessionStore) {
  store.dispatch({ type: 'ARM_RESPONSE_PHASE', issuedAt: AT, roundId: ROUND })
}

function renderPanel(store: SessionStore = boardStore(), storage = memoryStorage()) {
  const clock = createManualClock(AT)
  const game = () => {
    const value = store.getState().session?.game
    if (!value) throw new Error('no game')
    return value
  }
  const dispatch = (command: SessionCommand) => {
    const result = store.dispatch(command)
    view.rerender(
      <LocalInputHostPanel dispatch={dispatch} game={game()} clock={clock} storage={storage} />,
    )
    return result
  }
  const view = render(
    <LocalInputHostPanel dispatch={dispatch} game={game()} clock={clock} storage={storage} />,
  )
  const rerender = () =>
    view.rerender(
      <LocalInputHostPanel dispatch={dispatch} game={game()} clock={clock} storage={storage} />,
    )
  // The panel's listeners live on `window`; the store subscription is the host
  // route's job, so tests re-render explicitly after an out-of-band dispatch.
  store.subscribe(rerender)
  return { store, view, storage, clock, rerender }
}

/** Press a key on `window`, the way a team's buzzer does. */
function press(code: string, init: KeyboardEventInit = {}) {
  fireEvent.keyDown(window, { code, ...init })
}

function release(code: string) {
  fireEvent.keyUp(window, { code })
}

function queueOf(store: SessionStore) {
  const game = store.getState().session?.game
  if (!game) throw new Error('no game')
  return responsePhaseFor(game, ROUND).queue
}

describe('what the panel states', () => {
  it('names whether input is on, whether the clue is open, and whether it is armed', () => {
    const store = boardStore()
    openClue(store)
    renderPanel(store)
    expect(screen.getByTestId('lih-enabled')).toHaveTextContent('On')
    expect(screen.getByTestId('lih-open')).toHaveTextContent('Open — prompt is public')
    expect(screen.getByTestId('lih-armed')).toHaveTextContent('Not armed — presses are ignored')
  })

  it('states arming in WORDS, not by colour alone', () => {
    const store = boardStore()
    openClue(store)
    const { rerender } = renderPanel(store)
    arm(store)
    rerender()
    expect(screen.getByTestId('lih-armed')).toHaveTextContent('Armed — presses count')
  })

  it('renders nothing when the game has no teams', () => {
    const noTeams: Record<string, unknown> = teamBoardGameFile(undefined, richBoardConfig())
    delete noTeams.teams
    const imported = importGameFromUnknown(noTeams)
    if (imported.status !== 'success') throw new Error('fixture failed')
    const store = createSessionStore()
    store.dispatch({ type: 'INIT_SESSION', issuedAt: AT, sessionId: 's' })
    store.dispatch({ type: 'INITIALIZE_GAME', issuedAt: AT, definition: imported.definition })
    store.dispatch({ type: 'ADVANCE_TO_NEXT_ROUND', issuedAt: AT })
    const { view } = renderPanel(store)
    expect(view.container).toBeEmptyDOMElement()
  })
})

describe('the buzz-key editor', () => {
  it('shows each team’s default key, labelled the way a teacher would say it', () => {
    renderPanel()
    expect(screen.getByTestId('lih-key-red')).toHaveTextContent('1')
    expect(screen.getByTestId('lih-key-blue')).toHaveTextContent('2')
    expect(screen.getByTestId('lih-key-green')).toHaveTextContent('3')
  })

  it('captures a new key and saves it to this device', () => {
    const { storage } = renderPanel()
    fireEvent.click(screen.getByTestId('lih-capture-red'))
    expect(screen.getByTestId('lih-key-red')).toHaveTextContent('Press a key…')
    press('KeyQ')
    expect(screen.getByTestId('lih-key-red')).toHaveTextContent('Q')
    expect(storage.raw()).toContain('KeyQ')
  })

  it('announces capture state in a live region', () => {
    renderPanel()
    const status = screen.getByTestId('lih-capture-status')
    expect(status).toHaveAttribute('aria-live', 'polite')
    fireEvent.click(screen.getByTestId('lih-capture-red'))
    expect(status).toHaveTextContent('Press the key Red Team should use to buzz')
    expect(status).toHaveTextContent('Escape to cancel')
  })

  it('cancels capture on Escape and leaves the key as it was', () => {
    renderPanel()
    fireEvent.click(screen.getByTestId('lih-capture-red'))
    press('Escape')
    expect(screen.getByTestId('lih-key-red')).toHaveTextContent('1')
    expect(screen.getByTestId('lih-capture-status')).toHaveTextContent('Cancelled')
  })

  it('cancels capture from the button too, without trapping focus', () => {
    renderPanel()
    fireEvent.click(screen.getByTestId('lih-capture-red'))
    fireEvent.click(screen.getByTestId('lih-capture-red'))
    expect(screen.getByTestId('lih-key-red')).toHaveTextContent('1')
    // Every other control is still reachable — nothing was disabled or trapped.
    expect(screen.getByTestId('lih-capture-blue')).toBeEnabled()
  })

  it('refuses a reserved key with a message, and stays in capture', () => {
    renderPanel()
    fireEvent.click(screen.getByTestId('lih-capture-red'))
    press('Tab')
    expect(screen.getByTestId('lih-capture-status')).toHaveTextContent('reserved')
    expect(screen.getByTestId('lih-key-red')).toHaveTextContent('Press a key…')
  })

  /**
   * No silent overwriting: taking a key another team already has is refused, the
   * conflict is explained, and BOTH assignments are left exactly as they were.
   */
  it('refuses a conflicting key and overwrites nothing', () => {
    renderPanel()
    fireEvent.click(screen.getByTestId('lih-capture-red'))
    press('Digit2')
    expect(screen.getByTestId('lih-capture-status')).toHaveTextContent('already assigned')
    fireEvent.click(screen.getByTestId('lih-capture-red'))
    press('Escape')
    expect(screen.getByTestId('lih-key-red')).toHaveTextContent('1')
    expect(screen.getByTestId('lih-key-blue')).toHaveTextContent('2')
  })

  it('clears a team’s key, and the cleared team can no longer buzz', () => {
    const store = boardStore()
    openClue(store)
    arm(store)
    renderPanel(store)
    fireEvent.click(screen.getByTestId('lih-clear-red'))
    expect(screen.getByTestId('lih-key-red')).toHaveTextContent('Not assigned')
    press('Digit1')
    expect(queueOf(store).order).toEqual([])
  })

  it('resets every key back to the defaults', () => {
    const { storage } = renderPanel()
    fireEvent.click(screen.getByTestId('lih-capture-red'))
    press('KeyQ')
    fireEvent.click(screen.getByTestId('lih-reset-keys'))
    expect(screen.getByTestId('lih-key-red')).toHaveTextContent('1')
    expect(storage.raw()).toContain('Digit1')
  })

  it('restores a mapping saved on this device', () => {
    const saved = JSON.stringify({
      version: 1,
      bindings: [{ code: 'KeyZ', teamId: 'red', action: { kind: 'primary-buzz' } }],
    })
    renderPanel(boardStore(), memoryStorage(saved))
    expect(screen.getByTestId('lih-key-red')).toHaveTextContent('Z')
    expect(screen.getByTestId('lih-storage-note')).toHaveTextContent('restored from this device')
  })

  it('falls back to the defaults when the saved mapping is corrupt', () => {
    renderPanel(boardStore(), memoryStorage('{not json'))
    expect(screen.getByTestId('lih-key-red')).toHaveTextContent('1')
    expect(screen.getByTestId('lih-storage-note')).toHaveTextContent('not readable')
  })

  it('says plainly that buzz keys are device settings, not game content', () => {
    renderPanel()
    expect(screen.getByTestId('lih-storage-note')).toHaveTextContent('this device only')
    expect(screen.getByTestId('lih-storage-note')).toHaveTextContent('not part of the game file')
  })
})

describe('buzzing with the keyboard', () => {
  function armedPanel() {
    const store = boardStore()
    openClue(store)
    arm(store)
    return renderPanel(store)
  }

  it('buzzes the mapped team on a real key press', () => {
    const { store } = armedPanel()
    press('Digit2')
    expect(activeRespondent(queueOf(store))).toBe('blue')
    expect(screen.getByTestId('lih-active')).toHaveTextContent('Blue Team')
  })

  it('builds an ordered queue from several presses', () => {
    const { store } = armedPanel()
    press('Digit3')
    release('Digit3')
    press('Digit1')
    release('Digit1')
    press('Digit2')
    expect(activeRespondent(queueOf(store))).toBe('green')
    expect(waitingRespondents(queueOf(store))).toEqual(['red', 'blue'])
    expect(screen.getByTestId('lih-waiting')).toHaveTextContent('1. Red Team · 2. Blue Team')
  })

  it('ignores OS auto-repeat', () => {
    const { store } = armedPanel()
    press('Digit1', { repeat: true })
    expect(queueOf(store).order).toEqual([])
    expect(screen.getByTestId('lih-outcome')).toHaveTextContent('Holding a key down')
  })

  it('ignores a held key, so one physical press is one buzz', () => {
    const { store } = armedPanel()
    press('Digit1')
    press('Digit1')
    press('Digit1')
    expect(queueOf(store).order).toEqual(['red'])
  })

  it('never buzzes while the host is typing', () => {
    const { store, view } = armedPanel()
    const field = document.createElement('input')
    view.container.appendChild(field)
    fireEvent.keyDown(field, { code: 'Digit1' })
    expect(queueOf(store).order).toEqual([])
    expect(screen.getByTestId('lih-outcome')).toHaveTextContent('while you are typing')
  })

  it('never buzzes while a key is being reassigned', () => {
    const { store } = armedPanel()
    fireEvent.click(screen.getByTestId('lih-capture-blue'))
    press('Digit1')
    // The press assigned nothing to `blue` other than `Digit1`? No — `Digit1` is
    // already `red`'s, so the capture is refused AND no buzz was recorded.
    expect(queueOf(store).order).toEqual([])
  })

  it('ignores every press while keyboard buzzing is switched off', () => {
    const { store } = armedPanel()
    fireEvent.click(screen.getByTestId('lih-toggle'))
    expect(screen.getByTestId('lih-enabled')).toHaveTextContent('Off')
    press('Digit1')
    expect(queueOf(store).order).toEqual([])
    expect(screen.getByTestId('lih-outcome')).toHaveTextContent('switched off')
  })

  it('explains a press that landed on a disarmed clue', () => {
    const store = boardStore()
    openClue(store)
    renderPanel(store)
    press('Digit1')
    expect(queueOf(store).order).toEqual([])
    expect(screen.getByTestId('lih-outcome')).toHaveTextContent('not armed')
  })

  it('explains a press with no open clue at all', () => {
    const store = boardStore()
    renderPanel(store)
    press('Digit1')
    expect(screen.getByTestId('lih-outcome')).toHaveTextContent('no open clue')
  })

  it('explains a duplicate press from a team already in the queue', () => {
    const { store } = armedPanel()
    press('Digit1')
    release('Digit1')
    press('Digit1')
    expect(queueOf(store).order).toEqual(['red'])
    expect(screen.getByTestId('lih-outcome')).toHaveTextContent('already buzzed')
  })

  it('explains an unassigned key', () => {
    armedPanel()
    press('KeyX')
    expect(screen.getByTestId('lih-outcome')).toHaveTextContent('not assigned to a team')
  })

  it('ignores a modifier chord', () => {
    const { store } = armedPanel()
    press('Digit1', { ctrlKey: true })
    expect(queueOf(store).order).toEqual([])
  })
})

describe('running the queue', () => {
  function queuedPanel() {
    const store = boardStore()
    openClue(store)
    arm(store)
    const rendered = renderPanel(store)
    press('Digit1')
    release('Digit1')
    press('Digit2')
    release('Digit2')
    press('Digit3')
    release('Digit3')
    return rendered
  }

  it('shows the active team and the full ordered waiting queue', () => {
    queuedPanel()
    expect(screen.getByTestId('lih-active')).toHaveTextContent('Red Team')
    expect(screen.getByTestId('lih-waiting')).toHaveTextContent('1. Blue Team · 2. Green Team')
  })

  it('promotes the next team when the active response is marked incorrect', () => {
    const { store } = queuedPanel()
    fireEvent.click(screen.getByRole('button', { name: /mark incorrect and advance/i }))
    expect(activeRespondent(queueOf(store))).toBe('blue')
    expect(screen.getByTestId('lih-active')).toHaveTextContent('Blue Team')
  })

  it('promotes the next team when the host passes', () => {
    const { store } = queuedPanel()
    fireEvent.click(screen.getByRole('button', { name: /pass and advance/i }))
    expect(activeRespondent(queueOf(store))).toBe('blue')
  })

  it('moves no points from either action', () => {
    const { store } = queuedPanel()
    fireEvent.click(screen.getByRole('button', { name: /mark incorrect and advance/i }))
    fireEvent.click(screen.getByRole('button', { name: /pass and advance/i }))
    expect(store.getState().session?.game?.teamScores).toEqual({})
  })

  it('says explicitly when the queue has run out', () => {
    const { store } = queuedPanel()
    for (let index = 0; index < 3; index += 1) {
      fireEvent.click(screen.getByRole('button', { name: /pass and advance/i }))
    }
    expect(activeRespondent(queueOf(store))).toBeNull()
    expect(screen.getByTestId('lih-active')).toHaveTextContent('every team that buzzed has had a turn')
    expect(screen.getByTestId('lih-waiting')).toHaveTextContent('Empty')
  })

  it('distinguishes "nobody has buzzed" from "everybody has had a turn"', () => {
    const store = boardStore()
    openClue(store)
    arm(store)
    renderPanel(store)
    expect(screen.getByTestId('lih-active')).toHaveTextContent('Nobody has buzzed yet')
  })

  it('disables both queue actions when there is nobody to advance', () => {
    const store = boardStore()
    openClue(store)
    arm(store)
    renderPanel(store)
    expect(screen.getByRole('button', { name: /mark incorrect and advance/i })).toBeDisabled()
    expect(screen.getByRole('button', { name: /pass and advance/i })).toBeDisabled()
  })

  it('announces the active team and the queue in a live region', () => {
    const { view } = queuedPanel()
    const live = view.container.querySelector('[aria-live="polite"]')
    expect(live).not.toBeNull()
    expect(screen.getByTestId('lih-outcome')).toHaveAttribute('aria-live', 'polite')
  })
})

describe('scope and privacy', () => {
  it('offers no Gamepad, WebHID, Sony or coloured-button surface', () => {
    const store = boardStore()
    openClue(store)
    const { view } = renderPanel(store)
    const html = view.container.innerHTML.toLowerCase()
    for (const forbidden of [
      'gamepad',
      'webhid',
      'bluetooth',
      'sony',
      'playstation',
      'usb',
      'vendor',
      'controller',
      'handset',
      'red button',
      'blue button',
      'orange',
      'yellow',
    ]) {
      expect(html, `must not contain ${forbidden}`).not.toContain(forbidden)
    }
  })

  it('offers no secondary-action control — the slot exists, the UI does not', () => {
    const { view } = renderPanel()
    // Visible text only: `btn--secondary` is a Slice 1 style class and says
    // nothing about the input contract.
    const text = (view.container.textContent ?? '').toLowerCase()
    expect(text).not.toContain('secondary')
    const labels = [...view.container.querySelectorAll('[aria-label]')]
      .map((element) => (element.getAttribute('aria-label') ?? '').toLowerCase())
      .join(' ')
    expect(labels).not.toContain('secondary')
  })

  it('scores nothing — no control here can move a point', () => {
    const store = boardStore()
    openClue(store)
    const { view } = renderPanel(store)
    const interactive = [...view.container.querySelectorAll('button, select, option, input')]
      .map((element) => element.textContent ?? '')
      .join(' ')
      .toLowerCase()
    for (const forbidden of ['award', 'deduct', 'credit', 'point']) {
      expect(interactive, `must not contain ${forbidden}`).not.toContain(forbidden)
    }
  })

  it('duplicates no arming control — arming lives in the response-window panel', () => {
    const store = boardStore()
    openClue(store)
    const { view } = renderPanel(store)
    const names = [...view.container.querySelectorAll('button')]
      .map((element) => (element.textContent ?? '').toLowerCase())
      .join(' ')
    expect(names).not.toContain('arm clue')
    expect(names).not.toContain('disarm')
  })

  /**
   * This is a HOST panel, so it deliberately shows the raw key assignments and
   * the full queue — and it carries the same "host controls, private" badge every
   * other host panel does, which is itself a `FORBIDDEN_DISPLAY_LABELS` entry
   * precisely because it must never be projected. What matters is that none of it
   * REACHES the projector, which `buzzSanitize.test.ts` proves at the boundary and
   * the e2e suite proves in a real DOM.
   *
   * What is asserted here instead is the narrower claim this panel owns: it never
   * renders authored content of any kind, so no prompt, answer, alternate or
   * teacher note can leak through a surface that has no business holding one.
   */
  it('renders no authored content — no prompt, answer, alternate or note', () => {
    const store = boardStore()
    openClue(store)
    const { view } = renderPanel(store)
    const text = (view.container.textContent ?? '').toLowerCase()
    for (const authored of [
      'alpha one hundred prompt',
      'alpha one hundred answer',
      'a100 alternate',
      'alpha-teacher-note-100',
      'alpha category',
    ]) {
      expect(text, `must not contain "${authored}"`).not.toContain(authored)
    }
  })

  it('is fully keyboard operable — every control is a real button', () => {
    const store = boardStore()
    openClue(store)
    const { view } = renderPanel(store)
    const controls = [...view.container.querySelectorAll('button')]
    expect(controls.length).toBeGreaterThan(0)
    for (const control of controls) {
      expect(control.tagName).toBe('BUTTON')
      expect(control.getAttribute('type')).toBe('button')
    }
  })
})
