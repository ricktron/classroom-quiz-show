import { describe, expect, it } from 'vitest'
import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { GamepadInputHostPanel } from './GamepadInputHostPanel'
import { createSessionStore, type SessionStore } from '../state/store'
import { importGameFromUnknown } from '../import/importGame'
import { richBoardConfig } from '../test/categoryBoardFixtures'
import { teamBoardGameFile } from '../test/teamFixtures'
import { createManualClock } from '../time/clock'
import { responsePhaseFor } from '../state/reducer'
import { activeRespondent, waitingRespondents } from '../game/timing/buzzQueue'
import {
  buttons,
  controller,
  fakeGamepadSource,
  fakePollDriver,
  snapshot,
  type FakeGamepadSource,
  type FakePollDriver,
} from '../test/gamepadFixtures'
import { createMemoryPersistenceAdapter } from '../persistence'
import { createFakeWebHidTransport } from '../input/webHidTransport'

/**
 * Host controller-input controls — component behaviour (Slice 9).
 *
 * The claims proved here:
 *  - a browser with no Gamepad API, and a browser with no controller attached,
 *    both produce calm, useful copy and never a crash;
 *  - the "no controller" message says keyboard buzzing remains available;
 *  - connecting and disconnecting a controller is announced in a POLITE live
 *    region, and a held button announces nothing;
 *  - a teacher can enable, disable, assign by pressing, cancel, clear one and
 *    clear all;
 *  - a conflicting assignment is REFUSED with a message and nothing is
 *    overwritten;
 *  - capture suspends buzzing, so a button pressed to assign it cannot fire it;
 *  - a real press buzzes the mapped team through the ordinary command path, and a
 *    held button does not buzz twice;
 *  - no supported-hardware claim, and no axis/analog/raw device telemetry;
 *  - the panel scores nothing and arms nothing.
 *
 * Every test drives a MANUAL clock, a fake source and a hand-driven poll driver.
 * Nothing here waits for a frame or touches a real controller.
 */

const AT = 1_000_000
const ROUND = 'board-round'
const TILE = 'alpha-100'

const THREE_TEAMS = [
  { id: 'red', name: 'Red Team', accent: 'crimson' },
  { id: 'blue', name: 'Blue Team', accent: 'azure' },
  { id: 'green', name: 'Green Team', accent: 'emerald' },
]

function boardStore(teams: unknown = THREE_TEAMS): SessionStore {
  const result = importGameFromUnknown(teamBoardGameFile(teams, richBoardConfig()))
  if (result.status !== 'success') throw new Error('fixture failed to import')
  const store = createSessionStore()
  store.dispatch({ type: 'INIT_SESSION', issuedAt: AT, sessionId: 's' })
  store.dispatch({ type: 'INITIALIZE_GAME', issuedAt: AT, definition: result.definition })
  store.dispatch({ type: 'ADVANCE_TO_NEXT_ROUND', issuedAt: AT })
  return store
}

function openClue(store: SessionStore) {
  store.dispatch({ type: 'SELECT_CATEGORY_BOARD_TILE', issuedAt: AT, roundId: ROUND, tileId: TILE })
  store.dispatch({ type: 'REVEAL_CATEGORY_BOARD_PROMPT', issuedAt: AT, roundId: ROUND })
}

function arm(store: SessionStore) {
  store.dispatch({ type: 'ARM_RESPONSE_PHASE', issuedAt: AT, roundId: ROUND })
}

function queueOf(store: SessionStore) {
  const game = store.getState().session?.game
  if (!game) throw new Error('fixture has no game')
  return responsePhaseFor(game, ROUND).queue
}

interface Panel {
  readonly store: SessionStore
  readonly source: FakeGamepadSource
  readonly driver: FakePollDriver
  readonly view: ReturnType<typeof render>
  poll(times?: number): void
  refresh(): void
}

function renderPanel(store: SessionStore = boardStore()): Panel {
  const source = fakeGamepadSource()
  const driver = fakePollDriver()
  const clock = createManualClock(AT)
  const game = store.getState().session?.game
  if (!game) throw new Error('fixture has no game')

  const persistenceAdapter = createMemoryPersistenceAdapter()
  const webHidTransport = createFakeWebHidTransport({ available: false })
  const view = render(
    <GamepadInputHostPanel
      dispatch={store.dispatch}
      game={game}
      clock={clock}
      source={source}
      scheduler={driver}
      persistenceAdapter={persistenceAdapter}
      webHidTransport={webHidTransport}
    />,
  )
  const panel: Panel = {
    store,
    source,
    driver,
    view,
    poll(times = 1) {
      act(() => {
        for (let index = 0; index < times; index += 1) driver.poll()
      })
    },
    refresh() {
      const next = store.getState().session?.game
      if (!next) throw new Error('fixture lost its game')
      view.rerender(
        <GamepadInputHostPanel
          dispatch={store.dispatch}
          game={next}
          clock={clock}
          source={source}
          scheduler={driver}
          persistenceAdapter={persistenceAdapter}
          webHidTransport={webHidTransport}
        />,
      )
    },
  }
  return panel
}

/** Attach a controller, then press and release one of its buttons. */
function pressButton(panel: Panel, controllerIndex: number, buttonIndex: number, count = 4) {
  panel.source.set(snapshot(controller(controllerIndex, buttons(count))))
  panel.poll()
  panel.source.set(snapshot(controller(controllerIndex, buttons(count, buttonIndex))))
  panel.poll()
  panel.source.set(snapshot(controller(controllerIndex, buttons(count))))
  panel.poll()
}

/** Attach a controller without pressing anything. */
function attach(panel: Panel, controllerIndex = 0, count = 4) {
  panel.source.set(snapshot(controller(controllerIndex, buttons(count))))
  panel.poll()
}

/** Enable controller buzzing through the real control. */
function enable() {
  fireEvent.click(screen.getByTestId('gih-toggle'))
}

/**
 * Assign `controllerIndex`/`buttonIndex` to a team through the real capture flow.
 *
 * Note the poll after the click: entering capture RE-PRIMES the baseline, so a
 * button already held at that moment cannot be captured. A fresh press is
 * required, and this helper performs one — which is exactly what a teacher does.
 */
function assign(panel: Panel, teamId: string, controllerIndex: number, buttonIndex: number) {
  attach(panel, controllerIndex)
  fireEvent.click(screen.getByTestId(`gih-capture-${teamId}`))
  panel.poll() // re-primed baseline, nothing pressed
  panel.source.set(snapshot(controller(controllerIndex, buttons(4, buttonIndex))))
  panel.poll()
  panel.source.set(snapshot(controller(controllerIndex, buttons(4))))
  panel.poll()
}

describe('when no controller is available', () => {
  it('says so calmly and points at the keyboard, without crashing', () => {
    const panel = renderPanel()
    panel.poll()
    expect(screen.getByTestId('gih-count')).toHaveTextContent('None detected')
    expect(screen.getByTestId('gih-controllers')).toHaveTextContent(
      'No controller detected. Keyboard buzzing remains available.',
    )
  })

  it('reports an unsupported browser and disables the switch rather than hiding it', () => {
    const panel = renderPanel()
    panel.source.fail('unsupported')
    panel.poll()
    expect(screen.getByTestId('gih-support')).toHaveTextContent('Not available in this browser')
    expect(screen.getByTestId('gih-toggle')).toBeDisabled()
    // The explanation is present, so a disabled control is never unexplained.
    expect(screen.getByTestId('gih-unsupported')).toHaveTextContent(
      /keyboard buzzing remains available/i,
    )
  })

  it('reports a failed read as its own state, distinct from "not available"', () => {
    const panel = renderPanel()
    panel.source.fail('unreadable')
    panel.poll()
    expect(screen.getByTestId('gih-support')).toHaveTextContent('refused the last read')
    expect(screen.getByTestId('gih-unreadable')).toHaveTextContent(/nothing was buzzed/i)
  })

  it('offers no assignment for a controller that is not there, but never crashes', () => {
    const panel = renderPanel()
    panel.poll()
    expect(screen.getByTestId('gih-control-red')).toHaveTextContent('Not assigned')
    expect(screen.getByTestId('gih-outcome')).toHaveTextContent('No controller buttons pressed yet')
  })
})

describe('connection diagnostics', () => {
  it('lists connected controllers with neutral labels and button counts', () => {
    const panel = renderPanel()
    panel.source.set(snapshot(controller(0, buttons(4)), controller(1, buttons(12))))
    panel.poll()
    expect(screen.getByTestId('gih-count')).toHaveTextContent('2 controllers')
    const list = screen.getByTestId('gih-controllers')
    expect(list).toHaveTextContent('Controller 1: 4 buttons')
    expect(list).toHaveTextContent('Controller 2: 12 buttons')
  })

  it('announces connection changes in a POLITE live region, never an alert', () => {
    const panel = renderPanel()
    panel.poll()
    const region = screen.getByTestId('gih-controllers')
    expect(region).toHaveAttribute('aria-live', 'polite')
    expect(panel.view.container.querySelector('[role="alert"]')).toBeNull()
    expect(panel.view.container.querySelector('[aria-live="assertive"]')).toBeNull()
  })

  it('shows a disconnect without producing a buzz', () => {
    const panel = renderPanel()
    attach(panel)
    expect(screen.getByTestId('gih-count')).toHaveTextContent('1 controller')
    panel.source.set(snapshot())
    panel.poll()
    expect(screen.getByTestId('gih-count')).toHaveTextContent('None detected')
    expect(screen.getByTestId('gih-outcome')).toHaveTextContent('No controller buttons pressed yet')
  })

  it('renders no live button state at all — nothing repaints while a button is held', () => {
    const panel = renderPanel()
    attach(panel)
    const before = panel.view.container.innerHTML
    panel.source.set(snapshot(controller(0, buttons(4, 0, 1, 2))))
    panel.poll(5)
    // The panel is byte-identical: an unmapped press changes only the outcome
    // line, and here nothing is mapped and the adapter is off.
    expect(panel.view.container.innerHTML).not.toContain('true')
    expect(before.includes('Controller 1: 4 buttons')).toBe(true)
  })
})

describe('enabling and disabling', () => {
  it('starts switched OFF and toggles with an announced pressed state', () => {
    const panel = renderPanel()
    attach(panel)
    const toggle = screen.getByTestId('gih-toggle')
    expect(screen.getByTestId('gih-enabled')).toHaveTextContent('Off')
    expect(toggle).toHaveAttribute('aria-pressed', 'false')
    fireEvent.click(toggle)
    expect(screen.getByTestId('gih-enabled')).toHaveTextContent('On')
    expect(toggle).toHaveAttribute('aria-pressed', 'true')
  })

  it('explains a press that arrived while switched off', () => {
    const panel = renderPanel()
    assign(panel, 'red', 0, 0)
    pressButton(panel, 0, 0)
    expect(screen.getByTestId('gih-outcome')).toHaveTextContent(
      'Controller buzzing is switched off.',
    )
  })
})

describe('assigning buttons', () => {
  it('assigns a pressed button to a team and describes it neutrally', () => {
    const panel = renderPanel()
    assign(panel, 'red', 0, 2)
    expect(screen.getByTestId('gih-control-red')).toHaveTextContent('Controller 1 · button 3')
    expect(screen.getByTestId('gih-capture-status')).toHaveTextContent(
      /Controller 1 · button 3 assigned to Red Team for buzz/i,
    )
  })

  it('shows a prompt while capturing and offers a cancel path', () => {
    const panel = renderPanel()
    attach(panel)
    fireEvent.click(screen.getByTestId('gih-capture-red'))
    expect(screen.getByTestId('gih-control-red')).toHaveTextContent('Press a button…')
    const cancel = screen.getByTestId('gih-capture-red')
    expect(cancel).toHaveTextContent('Cancel')
    expect(cancel).toHaveAccessibleName(/cancel assigning a controller button for Red Team/i)
    fireEvent.click(cancel)
    expect(screen.getByTestId('gih-capture-status')).toHaveTextContent(
      'Cancelled. The assignment was left as it was.',
    )
    expect(screen.getByTestId('gih-control-red')).toHaveTextContent('Not assigned')
  })

  it('refuses a conflicting assignment and overwrites nothing', () => {
    const panel = renderPanel()
    assign(panel, 'red', 0, 1)
    assign(panel, 'blue', 0, 1)
    expect(screen.getByTestId('gih-capture-status')).toHaveTextContent(/already assigned/i)
    expect(screen.getByTestId('gih-control-red')).toHaveTextContent('Controller 1 · button 2')
    expect(screen.getByTestId('gih-control-blue')).toHaveTextContent('Not assigned')
  })

  it('clears one team’s button, leaving the others alone', () => {
    const panel = renderPanel()
    assign(panel, 'red', 0, 0)
    assign(panel, 'blue', 0, 1)
    fireEvent.click(screen.getByTestId('gih-clear-red'))
    expect(screen.getByTestId('gih-control-red')).toHaveTextContent('Not assigned')
    expect(screen.getByTestId('gih-control-blue')).toHaveTextContent('Controller 1 · button 2')
    expect(screen.getByTestId('gih-clear-red')).toBeDisabled()
  })

  it('clears the whole session mapping', () => {
    const panel = renderPanel()
    assign(panel, 'red', 0, 0)
    assign(panel, 'blue', 0, 1)
    fireEvent.click(screen.getByTestId('gih-clear-all'))
    expect(screen.getByTestId('gih-control-red')).toHaveTextContent('Not assigned')
    expect(screen.getByTestId('gih-control-blue')).toHaveTextContent('Not assigned')
    expect(screen.getByTestId('gih-capture-status')).toHaveTextContent(/cleared for this session/i)
  })

  it('says plainly that assignments do not survive a reload', () => {
    const panel = renderPanel()
    panel.poll()
    expect(screen.getByTestId('gih-lifetime-note')).toHaveTextContent(
      /lost when this page reloads/i,
    )
  })

  it('offers the four ordinal secondary slots and says they do nothing', () => {
    const panel = renderPanel()
    panel.poll()
    const picker = screen.getByTestId('gih-action')
    const options = [...within(picker).getAllByRole('option')].map((option) => option.textContent)
    expect(options).toEqual([
      'Buzz',
      'Secondary action 1',
      'Secondary action 2',
      'Secondary action 3',
      'Secondary action 4',
    ])
    expect(screen.getByTestId('gih-lifetime-note')).toHaveTextContent(/deliberately inert/i)
  })

  it('assigns a secondary slot without disturbing the team’s buzz button', () => {
    const panel = renderPanel()
    assign(panel, 'red', 0, 0)
    fireEvent.change(screen.getByTestId('gih-action'), { target: { value: 'secondary2' } })
    expect(screen.getByTestId('gih-control-red')).toHaveTextContent('Not assigned')
    assign(panel, 'red', 0, 3)
    expect(screen.getByTestId('gih-control-red')).toHaveTextContent('Controller 1 · button 4')
    fireEvent.change(screen.getByTestId('gih-action'), { target: { value: 'primary-buzz' } })
    expect(screen.getByTestId('gih-control-red')).toHaveTextContent('Controller 1 · button 1')
  })
})

describe('buzzing', () => {
  it('buzzes the mapped team through the ordinary command path', () => {
    const store = boardStore()
    openClue(store)
    arm(store)
    const panel = renderPanel(store)
    assign(panel, 'red', 0, 0)
    enable()
    pressButton(panel, 0, 0)
    expect(activeRespondent(queueOf(store))).toBe('red')
    expect(screen.getByTestId('gih-outcome')).toHaveTextContent('Red Team buzzed in from a controller')
  })

  it('does not buzz twice while the button is held', () => {
    const store = boardStore()
    openClue(store)
    arm(store)
    const panel = renderPanel(store)
    assign(panel, 'red', 0, 0)
    enable()
    panel.source.set(snapshot(controller(0, buttons(4))))
    panel.poll()
    panel.source.set(snapshot(controller(0, buttons(4, 0))))
    panel.poll(10)
    expect(queueOf(store).order).toEqual(['red'])
  })

  it('queues later teams behind the first, in accepted order', () => {
    const store = boardStore()
    openClue(store)
    arm(store)
    const panel = renderPanel(store)
    assign(panel, 'red', 0, 0)
    assign(panel, 'blue', 0, 1)
    enable()
    pressButton(panel, 0, 0)
    pressButton(panel, 0, 1)
    expect(activeRespondent(queueOf(store))).toBe('red')
    expect(waitingRespondents(queueOf(store))).toEqual(['blue'])
  })

  it('explains a press that arrived while the clue was not armed', () => {
    const store = boardStore()
    openClue(store)
    const panel = renderPanel(store)
    assign(panel, 'red', 0, 0)
    enable()
    pressButton(panel, 0, 0)
    expect(screen.getByTestId('gih-outcome')).toHaveTextContent(/not armed/i)
    expect(queueOf(store).order).toEqual([])
  })

  it('explains a press on a button nothing is assigned to', () => {
    const store = boardStore()
    openClue(store)
    arm(store)
    const panel = renderPanel(store)
    assign(panel, 'red', 0, 0)
    enable()
    pressButton(panel, 0, 3)
    expect(screen.getByTestId('gih-outcome')).toHaveTextContent('not assigned to a team')
  })

  it('does not buzz while a button is being assigned', () => {
    const store = boardStore()
    openClue(store)
    arm(store)
    const panel = renderPanel(store)
    assign(panel, 'red', 0, 0)
    enable()
    // Start a capture for another team and press RED's button. It assigns; it
    // must not also buzz.
    attach(panel)
    fireEvent.click(screen.getByTestId('gih-capture-blue'))
    panel.poll()
    panel.source.set(snapshot(controller(0, buttons(4, 0))))
    panel.poll()
    expect(queueOf(store).order).toEqual([])
    expect(screen.getByTestId('gih-capture-status')).toHaveTextContent(/already assigned/i)
  })

  it('re-primes after a capture, so the just-assigned held button does not buzz', () => {
    const store = boardStore()
    openClue(store)
    arm(store)
    const panel = renderPanel(store)
    enable()
    attach(panel)
    fireEvent.click(screen.getByTestId('gih-capture-red'))
    panel.poll() // re-primed baseline
    // Press and KEEP HOLDING the button being assigned.
    panel.source.set(snapshot(controller(0, buttons(4, 0))))
    panel.poll(6)
    expect(screen.getByTestId('gih-control-red')).toHaveTextContent('Controller 1 · button 1')
    expect(queueOf(store).order).toEqual([])
  })
})

describe('scope and privacy', () => {
  it('keeps hardware claims honest and never shows raw device telemetry', () => {
    const panel = renderPanel()
    attach(panel, 0, 12)
    assign(panel, 'red', 0, 0)
    const html = panel.view.container.innerHTML.toLowerCase()
    // Slice 10 owns a host-private Sony Buzz! setup section — those words may appear
    // there — but the panel must never claim support or show raw telemetry.
    for (const forbidden of [
      'supported hardware',
      'playstation',
      'bluetooth',
      'axis',
      'axes',
      'analog',
      'vibrat',
      'haptic',
      'standard gamepad',
      '"pressed"',
    ]) {
      expect(html, `must not contain ${forbidden}`).not.toContain(forbidden)
    }
    // Exact VID/PID may appear in the host-private supported-profile copy.
    expect(screen.getByTestId('sbs')).toBeInTheDocument()
    expect(screen.getByTestId('sbs-intro')).toHaveTextContent(/keyboard buzzing remains available/i)
    expect(screen.getByTestId('sbs-profile-id')).toHaveTextContent('054c:1000')
  })

  it('renders no raw array and no JSON outside advanced diagnostics', () => {
    const panel = renderPanel()
    attach(panel, 0, 6)
    assign(panel, 'red', 0, 1)
    expect(screen.queryByTestId('sbs-advanced-diag')).toBeNull()
    const text = panel.view.container.textContent ?? ''
    expect(text).not.toContain('"pressed"')
  })

  it('scores nothing — no control here can move a point', () => {
    const panel = renderPanel()
    attach(panel)
    const interactive = [...panel.view.container.querySelectorAll('button, select, option')]
      .map((element) => element.textContent ?? '')
      .join(' ')
      .toLowerCase()
    for (const forbidden of ['award', 'deduct', 'credit', 'point']) {
      expect(interactive, `must not contain ${forbidden}`).not.toContain(forbidden)
    }
  })

  it('duplicates no arming control and no queue control', () => {
    const store = boardStore()
    openClue(store)
    arm(store)
    const panel = renderPanel(store)
    const labels = [...panel.view.container.querySelectorAll('button')]
      .map((element) => `${element.textContent} ${element.getAttribute('aria-label') ?? ''}`)
      .join(' ')
      .toLowerCase()
    for (const forbidden of ['arm', 'disarm', 'mark incorrect', 'pass and advance', 'reveal']) {
      expect(labels, `must not contain ${forbidden}`).not.toContain(forbidden)
    }
  })

  it('shows Controllers empty state when the game has no teams', () => {
    const noTeams: Record<string, unknown> = teamBoardGameFile(undefined, richBoardConfig())
    delete noTeams.teams
    const imported = importGameFromUnknown(noTeams)
    if (imported.status !== 'success') throw new Error('fixture failed to import')
    const store = createSessionStore()
    store.dispatch({ type: 'INIT_SESSION', issuedAt: AT, sessionId: 's' })
    store.dispatch({ type: 'INITIALIZE_GAME', issuedAt: AT, definition: imported.definition })
    store.dispatch({ type: 'ADVANCE_TO_NEXT_ROUND', issuedAt: AT })
    const game = store.getState().session?.game
    render(
      <GamepadInputHostPanel
        dispatch={store.dispatch}
        game={game!}
        clock={createManualClock(AT)}
        source={fakeGamepadSource()}
        scheduler={fakePollDriver()}
        persistenceAdapter={createMemoryPersistenceAdapter()}
        webHidTransport={createFakeWebHidTransport({ available: false })}
      />,
    )
    expect(screen.getByTestId('gih-empty-teams')).toBeInTheDocument()
    expect(screen.getByTestId('gih-empty-teams-message')).toHaveTextContent(/Game Import/i)
    expect(screen.queryByTestId('sbs')).toBeNull()
  })

  it('shows supported-profile Connect controls when teams exist', () => {
    renderPanel()
    expect(screen.getByTestId('sbs-supported-profile')).toBeInTheDocument()
    expect(screen.getByTestId('sbs-connect')).toBeInTheDocument()
    expect(screen.getByTestId('sbs-transport-health')).toHaveTextContent('unsupported-api')
    expect(screen.getByTestId('sbs-keyboard-fallback')).toBeInTheDocument()
  })
})

describe('accessibility', () => {
  it('reaches every enabled control from the keyboard, in DOM order', () => {
    const panel = renderPanel()
    assign(panel, 'red', 0, 0)
    const controls = [
      ...panel.view.container.querySelectorAll('button, select'),
    ] as (HTMLButtonElement | HTMLSelectElement)[]
    expect(controls.length).toBeGreaterThan(0)
    for (const element of controls) {
      // Nothing is removed from the tab order by hand, and a disabled control
      // stays rendered and explained rather than disappearing.
      expect(element.getAttribute('tabindex')).not.toBe('-1')
      if (element.disabled) continue
      element.focus()
      expect(document.activeElement).toBe(element)
    }
  })

  it('keeps focus predictable across a capture and its cancellation', () => {
    const panel = renderPanel()
    attach(panel)
    const trigger = screen.getByTestId('gih-capture-red')
    trigger.focus()
    expect(document.activeElement).toBe(trigger)
    fireEvent.click(trigger)
    // The same button becomes the Cancel affordance, so focus never goes nowhere.
    expect(document.activeElement).toBe(screen.getByTestId('gih-capture-red'))
    fireEvent.click(screen.getByTestId('gih-capture-red'))
    expect(document.activeElement).toBe(screen.getByTestId('gih-capture-red'))
  })

  it('does not move focus when a poll updates the diagnostics', () => {
    const panel = renderPanel()
    attach(panel)
    const toggle = screen.getByTestId('gih-toggle')
    toggle.focus()
    panel.source.set(snapshot(controller(0, buttons(4)), controller(1, buttons(4))))
    panel.poll(5)
    expect(document.activeElement).toBe(screen.getByTestId('gih-toggle'))
  })

  it('states availability, on/off and every assignment in words', () => {
    const panel = renderPanel()
    attach(panel)
    expect(screen.getByTestId('gih-support')).toHaveTextContent(/available/i)
    expect(screen.getByTestId('gih-enabled')).toHaveTextContent(/^(On|Off)$/)
    expect(screen.getByTestId('gih-control-red')).toHaveTextContent(/not assigned/i)
  })

  it('labels every per-team control with its team name', () => {
    const panel = renderPanel()
    attach(panel)
    expect(screen.getByTestId('gih-capture-blue')).toHaveAccessibleName(/Blue Team/)
    expect(screen.getByTestId('gih-clear-blue')).toHaveAccessibleName(/Blue Team/)
  })
})
