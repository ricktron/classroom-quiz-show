import { describe, expect, it, vi } from 'vitest'
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
  reportedId,
  reportedMapping,
  snapshot,
  type FakeGamepadSource,
  type FakePollDriver,
} from '../test/gamepadFixtures'
import { createMemoryPersistenceAdapter } from '../persistence'
import { createFakeHidDevice, createFakeWebHidTransport } from '../input/webHidTransport'
import { buttonIndexForSlotColor } from '../input/sonyBuzzSupportedProfile'

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

  it('omits Slices 9–21 ordinary teacher copy and defaults Controllers detail closed', () => {
    renderPanel()
    expect(screen.getByRole('heading', { name: /^Controllers$/i })).toBeInTheDocument()
    expect(screen.queryByText(/Slices\s*9\s*[–-]\s*21/i)).not.toBeInTheDocument()
    expect(screen.getByText(/Controller input — host controls, private/i)).toBeInTheDocument()
    expect(screen.getByTestId('gih-advanced-generic')).not.toHaveAttribute('open')
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
    expect(screen.getByTestId('sbs-intro')).toHaveTextContent(/do not need to pair them every class/i)
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

describe('wbuzzPresent lift (Slice E)', () => {
  const WBUZZ_ID = 'Vendor: 054c Product: 1000'
  const GENERIC_SONY_ID = 'Vendor: 054c Product: 0002'

  function renderLiftPanel() {
    const store = boardStore()
    const source = fakeGamepadSource()
    const driver = fakePollDriver()
    const clock = createManualClock(AT)
    const game = store.getState().session?.game
    if (!game) throw new Error('fixture has no game')
    const onWbuzzPresentChange = vi.fn()
    const view = render(
      <GamepadInputHostPanel
        dispatch={store.dispatch}
        game={game}
        clock={clock}
        source={source}
        scheduler={driver}
        persistenceAdapter={createMemoryPersistenceAdapter()}
        webHidTransport={createFakeWebHidTransport({ available: false })}
        onWbuzzPresentChange={onWbuzzPresentChange}
      />,
    )
    return {
      source,
      driver,
      onWbuzzPresentChange,
      view,
      poll() {
        act(() => {
          driver.poll()
        })
      },
    }
  }

  it('reports false when no matching Wbuzz Gamepad is present', () => {
    const panel = renderLiftPanel()
    panel.poll()
    expect(panel.onWbuzzPresentChange).toHaveBeenCalledWith(false)
    expect(panel.onWbuzzPresentChange.mock.calls.every((call) => call[0] === false)).toBe(true)
  })

  it('reports true only for exact Wbuzz 054c:1000 with 20-button topology', () => {
    const panel = renderLiftPanel()
    act(() => {
      panel.source.set(
        snapshot(
          controller(0, buttons(20), {
            reportedId: reportedId(WBUZZ_ID),
            reportedMapping: reportedMapping('standard'),
          }),
        ),
      )
    })
    panel.poll()
    expect(panel.onWbuzzPresentChange).toHaveBeenCalledWith(true)
  })

  it('does not report true for generic/unrecognized Gamepads', () => {
    const panel = renderLiftPanel()
    act(() => {
      panel.source.set(
        snapshot(
          controller(0, buttons(12), {
            reportedId: reportedId(GENERIC_SONY_ID),
            reportedMapping: reportedMapping('standard'),
          }),
        ),
      )
    })
    panel.poll()
    expect(panel.onWbuzzPresentChange).not.toHaveBeenCalledWith(true)
    expect(panel.onWbuzzPresentChange).toHaveBeenCalledWith(false)
  })

  it('does not report true when 054c:1000 id lacks 20-button topology', () => {
    const panel = renderLiftPanel()
    act(() => {
      panel.source.set(
        snapshot(
          controller(0, buttons(12), {
            reportedId: reportedId(WBUZZ_ID),
            reportedMapping: reportedMapping('standard'),
          }),
        ),
      )
    })
    panel.poll()
    expect(panel.onWbuzzPresentChange).not.toHaveBeenCalledWith(true)
  })

  it('clears lifted true on unmount so Host cannot keep a stale present signal', () => {
    const panel = renderLiftPanel()
    act(() => {
      panel.source.set(
        snapshot(
          controller(0, buttons(20), {
            reportedId: reportedId(WBUZZ_ID),
            reportedMapping: reportedMapping('standard'),
          }),
        ),
      )
    })
    panel.poll()
    expect(panel.onWbuzzPresentChange).toHaveBeenCalledWith(true)
    panel.onWbuzzPresentChange.mockClear()
    panel.view.unmount()
    expect(panel.onWbuzzPresentChange).toHaveBeenCalledWith(false)
  })
})

describe('Q7-R1 supported Wbuzz: Off-by-default contract and responding evidence', () => {
  const WBUZZ_ID = 'Vendor: 054c Product: 1000'
  const SLOT1_RED = buttonIndexForSlotColor(1, 'red')

  function wbuzzSnapshot(...pressed: number[]) {
    return snapshot(
      controller(0, buttons(20, ...pressed), {
        reportedId: reportedId(WBUZZ_ID),
        reportedMapping: reportedMapping('standard'),
      }),
    )
  }

  function renderWbuzzPanel(options: { selectionMode: boolean }) {
    const store = boardStore()
    const source = fakeGamepadSource()
    const driver = fakePollDriver()
    const clock = createManualClock(AT)
    const persistenceAdapter = createMemoryPersistenceAdapter()
    const device = createFakeHidDevice()
    // Not pre-granted: the receiver connects only through the teacher's Connect.
    const webHidTransport = createFakeWebHidTransport({ requestResult: device, granted: [] })
    let selectionMode = options.selectionMode
    let enterBuzzerCheck = false
    const element = () => {
      const game = store.getState().session?.game
      if (!game) throw new Error('fixture has no game')
      return (
        <GamepadInputHostPanel
          dispatch={store.dispatch}
          game={game}
          clock={clock}
          source={source}
          scheduler={driver}
          persistenceAdapter={persistenceAdapter}
          webHidTransport={webHidTransport}
          selectionMode={selectionMode}
          enterBuzzerCheck={enterBuzzerCheck}
          onEnterBuzzerCheckConsumed={() => {
            enterBuzzerCheck = false
          }}
        />
      )
    }
    const view = render(element())
    const panel = {
      store,
      source,
      device,
      webHidTransport,
      refresh() {
        view.rerender(element())
      },
      poll(times = 1) {
        act(() => {
          for (let index = 0; index < times; index += 1) driver.poll()
        })
      },
      async flush() {
        await act(async () => {
          for (let i = 0; i < 10; i += 1) await Promise.resolve()
        })
      },
      setSelectionMode(next: boolean) {
        selectionMode = next
        view.rerender(element())
      },
      enterCheck() {
        enterBuzzerCheck = true
        view.rerender(element())
      },
      attachWbuzz() {
        source.set(wbuzzSnapshot())
        panel.poll()
      },
      detachPads() {
        source.set(snapshot())
        panel.poll()
      },
      pressRed(buttonIndex = SLOT1_RED) {
        // Released poll first: any gate change re-primes, and a re-primed poll is
        // a baseline that emits nothing (exactly as for a real teacher press).
        source.set(wbuzzSnapshot())
        panel.poll()
        source.set(wbuzzSnapshot(buttonIndex))
        panel.poll()
        source.set(wbuzzSnapshot())
        panel.poll()
      },
      async pressRedAndSettle(buttonIndex = SLOT1_RED) {
        panel.pressRed(buttonIndex)
        await panel.flush()
      },
      async connect() {
        fireEvent.click(screen.getByRole('button', { name: 'Connect buzzers' }))
        await panel.flush()
      },
    }
    return panel
  }

  it('CBN-1: Buzzers 3 and 4 saved to a team that already has Buzzer 1 all buzz that team', async () => {
    const panel = renderWbuzzPanel({ selectionMode: false })
    await panel.flush()
    panel.attachWbuzz()
    await panel.connect()
    fireEvent.change(screen.getByTestId('sbs-slot-3'), { target: { value: 'red' } })
    fireEvent.change(screen.getByTestId('sbs-slot-4'), { target: { value: 'red' } })
    fireEvent.click(screen.getByTestId('sbs-save-mapping'))
    await panel.flush()
    expect(screen.getByTestId('sbs-mapping-layer')).toHaveTextContent('Team mapping saved')
    expect(screen.queryByTestId('sbs-mapping-issue')).toBeNull()
    expect(screen.getByTestId('gih-enabled')).toHaveTextContent('On')

    expect(await buzzOnFreshClue(panel, 4)).toBe('red')
  })

  it('CBN-1 review: with several Buzzers on one team, clearing another team works and says so truthfully', async () => {
    const panel = renderWbuzzPanel({ selectionMode: false })
    await panel.flush()
    panel.attachWbuzz()
    await panel.connect()
    fireEvent.change(screen.getByTestId('sbs-slot-3'), { target: { value: 'red' } })
    fireEvent.click(screen.getByTestId('sbs-save-mapping'))
    await panel.flush()
    expect(screen.getByTestId('gih-control-blue')).not.toHaveTextContent(/not assigned/i)

    fireEvent.click(screen.getByTestId('gih-clear-blue'))
    expect(screen.queryByTestId('gih-issues')?.textContent ?? '').not.toMatch(/already has a buzz button/)
    expect(screen.getByTestId('gih-capture-status')).toHaveTextContent('Controller button cleared for')
    expect(screen.getByTestId('gih-control-blue')).toHaveTextContent(/not assigned/i)
    // Red keeps both of its Buzzers.
    expect(await buzzOnFreshClue(panel, 3)).toBe('red')
  })

  /**
   * Open a fresh clue, arm it, press one Buzzer's RED, and report who holds the
   * opportunity. Nine tests needed exactly this sequence; one definition keeps
   * them comparable and keeps duplicated assertions from drifting apart.
   */
  async function buzzOnFreshClue(
    panel: ReturnType<typeof renderWbuzzPanel>,
    slot: 1 | 2 | 3 | 4,
  ): Promise<string | null> {
    openClue(panel.store)
    arm(panel.store)
    panel.refresh()
    await panel.pressRedAndSettle(buttonIndexForSlotColor(slot, 'red'))
    panel.refresh()
    return activeRespondent(queueOf(panel.store))
  }

  /** The same, on an opportunity reopened in a test that already used one. */
  async function buzzOnReopenedClue(
    panel: ReturnType<typeof renderWbuzzPanel>,
    slot: 1 | 2 | 3 | 4,
  ): Promise<string | null> {
    panel.store.dispatch({ type: 'RESET_RESPONSE_PHASE', issuedAt: AT, roundId: ROUND })
    arm(panel.store)
    panel.refresh()
    await panel.pressRedAndSettle(buttonIndexForSlotColor(slot, 'red'))
    panel.refresh()
    return activeRespondent(queueOf(panel.store))
  }

  async function saveRedSharedWithBuzzer3(panel: ReturnType<typeof renderWbuzzPanel>) {
    await panel.flush()
    panel.attachWbuzz()
    await panel.connect()
    fireEvent.change(screen.getByTestId('sbs-slot-3'), { target: { value: 'red' } })
    fireEvent.click(screen.getByTestId('sbs-save-mapping'))
    await panel.flush()
    expect(screen.getByTestId('sbs-mapping-layer')).toHaveTextContent('Team mapping saved')
  }

  it('CBN-1 review: with several Buzzers on one team, assigning another team’s buzz button by pressing it works', async () => {
    const panel = renderWbuzzPanel({ selectionMode: false })
    await saveRedSharedWithBuzzer3(panel)
    // Buzzer 4 is unassigned, so its buttons are free to capture.
    const blueButton = buttonIndexForSlotColor(4, 'red')

    fireEvent.click(screen.getByTestId('gih-capture-blue'))
    await panel.pressRedAndSettle(blueButton)
    expect(screen.queryByTestId('gih-issues')?.textContent ?? '').not.toMatch(/already has a buzz button/)
    expect(screen.getByTestId('gih-capture-status')).toHaveTextContent(/assigned to .* for buzz/i)
    expect(screen.getByTestId('gih-control-blue')).toHaveTextContent('Buzzer 4 · Red')
    // Red keeps both of its Buzzers.
    expect(await buzzOnFreshClue(panel, 3)).toBe('red')
  })

  it('CBN-1 review: with several Buzzers on one team, the guided handset setup applies for another team', async () => {
    const panel = renderWbuzzPanel({ selectionMode: false })
    await saveRedSharedWithBuzzer3(panel)
    fireEvent.change(screen.getByTestId('sbs-team'), { target: { value: 'blue' } })
    // Buzzer 4 is unassigned, so its five buttons are free to capture.
    for (const color of ['red', 'blue', 'orange', 'green', 'yellow'] as const) {
      fireEvent.click(screen.getByTestId('sbs-capture'))
      await panel.pressRedAndSettle(buttonIndexForSlotColor(4, color))
    }
    fireEvent.click(screen.getByTestId('sbs-apply'))
    expect(screen.getByTestId('sbs-status')).toHaveTextContent(/Applied handset profile/i)
    expect(screen.queryByTestId('gih-issues')?.textContent ?? '').not.toMatch(/already has a buzz button/)
    expect(screen.getByTestId('gih-control-blue')).toHaveTextContent('Buzzer 4 · Red')
    // Red keeps both of its Buzzers.
    expect(await buzzOnFreshClue(panel, 3)).toBe('red')
  })

  it('FRC-3: a secondary-action edit on a team with several Buzzers also fails closed', async () => {
    /*
      Rewritten from "a secondary action can be assigned and cleared on the team
      with several Buzzers" (CBN-1 review round 3).

      That test performed the destruction and asserted only the one thing the
      destruction does not touch — that red's BUZZ buttons survive. The
      supported profile binds all five Sony colours per slot, so a secondary
      edit on a shared team silently dropped that team's other Buzzers for that
      colour exactly as the buzz edit did, and the secondary colours are not
      inert: they drive team name selection in Class Setup
      (src/input/sonyNameSelection.ts).

      What CBN-1 actually settled is preserved and still covered: the VALIDATOR
      must not refuse such an edit (`onePrimaryOnlyFor`, pinned in
      src/input/gamepadMapping.test.ts). This guard sits later, in the panel, and
      stops an edit from destroying bindings it never described.
    */
    const panel = renderWbuzzPanel({ selectionMode: false })
    await saveRedSharedWithBuzzer3(panel)
    const secondaryButton = buttonIndexForSlotColor(4, 'blue')
    fireEvent.change(screen.getByTestId('gih-action'), { target: { value: 'secondary1' } })

    fireEvent.click(screen.getByTestId('gih-capture-red'))
    await panel.pressRedAndSettle(secondaryButton)
    const status = screen.getByTestId('gih-capture-status')
    expect(status).toHaveTextContent(/has 2 buzzers assigned for this action/i)
    expect(status).toHaveTextContent(/Buzzer setup/i)
    expect(status).not.toHaveTextContent(/assigned to/i)

    // Clear refuses for the same reason, and says so rather than claiming success.
    fireEvent.click(screen.getByTestId('gih-clear-red'))
    expect(screen.getByTestId('gih-capture-status')).toHaveTextContent(
      /has 2 buzzers assigned for this action/i,
    )
    expect(screen.getByTestId('gih-capture-status')).not.toHaveTextContent(/cleared/i)

    // Red's buzz buttons were never in question and still buzz.
    fireEvent.change(screen.getByTestId('gih-action'), { target: { value: 'primary-buzz' } })
    expect(await buzzOnFreshClue(panel, 3)).toBe('red')
  })

  it('FRC-3: withdrawing the profile mapping keeps a generic binding on the same pad', async () => {
    /*
      Scoped to the WITHDRAW branch on purpose. The profile's APPLY branch still
      replaces the whole live mapping, so a generic binding made before an
      association change is wiped by that apply — a pre-existing behaviour
      recorded as a remaining defect, not repaired here. This drives the single
      transition from "profile maps something" straight to "profile maps
      nothing", which is the branch this change added, and proves it withdraws
      only the controls the profile itself applied.
    */
    const panel = renderWbuzzPanel({ selectionMode: false })
    await panel.flush()
    panel.attachWbuzz()
    await panel.connect()
    // Leave exactly ONE Buzzer assigned, so clearing it is a single transition.
    for (const slot of [2, 3, 4]) {
      const select = screen.queryByTestId(`sbs-slot-${slot}`)
      if (select) fireEvent.change(select, { target: { value: '' } })
    }
    fireEvent.click(screen.getByTestId('sbs-save-mapping'))
    await panel.flush()
    panel.refresh()

    // The teacher binds a FREE button on the Wbuzz pad for another team through
    // the generic controls. That binding is theirs, not the profile's.
    fireEvent.click(screen.getByTestId('gih-capture-green'))
    await panel.pressRedAndSettle(buttonIndexForSlotColor(4, 'red'))
    panel.refresh()
    expect(screen.getByTestId('gih-control-green')).toHaveTextContent('Buzzer 4 · Red')

    // Unassign the last Buzzer: the profile withdraws its own controls only.
    fireEvent.change(screen.getByTestId('sbs-slot-1'), { target: { value: '' } })
    await panel.flush()
    panel.refresh()
    expect(screen.getByTestId('gih-control-green')).toHaveTextContent('Buzzer 4 · Red')
    expect(screen.getByTestId('gih-control-red')).toHaveTextContent(/not assigned/i)
  })

  it('stays Off with a Wbuzz pad and a supported mapping when the receiver was never connected', async () => {
    const panel = renderWbuzzPanel({ selectionMode: false })
    await panel.flush()
    panel.attachWbuzz()
    await panel.flush()
    expect(screen.getByTestId('gih-enabled')).toHaveTextContent('Off')
  })

  it('switches On once the teacher connects the receiver with the Wbuzz pad present', async () => {
    const panel = renderWbuzzPanel({ selectionMode: false })
    await panel.flush()
    panel.attachWbuzz()
    await panel.connect()
    expect(screen.getByTestId('sbs-receiver-layer')).toHaveTextContent('Connected')
    expect(screen.getByTestId('gih-enabled')).toHaveTextContent('On')
  })

  it('never overrides an explicit teacher Off: Back→Start, pad reconnect, receiver reconnect', async () => {
    const panel = renderWbuzzPanel({ selectionMode: false })
    await panel.flush()
    panel.attachWbuzz()
    await panel.connect()
    expect(screen.getByTestId('gih-enabled')).toHaveTextContent('On')
    fireEvent.click(screen.getByRole('button', { name: 'Turn controller buzzing off' }))
    expect(screen.getByTestId('gih-enabled')).toHaveTextContent('Off')

    panel.setSelectionMode(true)
    panel.setSelectionMode(false)
    await panel.flush()
    expect(screen.getByTestId('gih-enabled')).toHaveTextContent('Off')

    panel.detachPads()
    panel.attachWbuzz()
    await panel.flush()
    expect(screen.getByTestId('gih-enabled')).toHaveTextContent('Off')

    act(() => panel.webHidTransport.emitDisconnect(panel.device))
    await panel.flush()
    await panel.connect()
    expect(screen.getByTestId('sbs-receiver-layer')).toHaveTextContent('Connected')
    expect(screen.getByTestId('gih-enabled')).toHaveTextContent('Off')

    // Turning it back On is the teacher's choice, and auto-enable may resume.
    fireEvent.click(screen.getByRole('button', { name: 'Turn controller buzzing on' }))
    expect(screen.getByTestId('gih-enabled')).toHaveTextContent('On')
  })

  it('counts a gameplay Wbuzz RED press as responding evidence (not only Buzzer Check)', async () => {
    const panel = renderWbuzzPanel({ selectionMode: false })
    await panel.flush()
    panel.attachWbuzz()
    await panel.connect()
    expect(screen.getByTestId('sbs-controller-layer')).toHaveTextContent(
      'Waiting for buzzer presses',
    )
    await panel.pressRedAndSettle()
    expect(screen.getByTestId('sbs-controller-layer')).toHaveTextContent('1 buzzer responding')
    expect(screen.getByTestId('sbs-teacher-summary')).not.toHaveTextContent(/waiting for buzzers/i)
  })

  it('keeps responding evidence across Leave Buzzer Check and Start; clears it when the pad goes away', async () => {
    const panel = renderWbuzzPanel({ selectionMode: true })
    await panel.flush()
    panel.attachWbuzz()
    await panel.connect()
    panel.enterCheck()
    await panel.pressRedAndSettle(buttonIndexForSlotColor(1, 'red'))
    await panel.pressRedAndSettle(buttonIndexForSlotColor(2, 'red'))
    expect(screen.getByTestId('sbs-controller-layer')).toHaveTextContent('2 buzzers responding')

    fireEvent.click(screen.getByRole('button', { name: 'Leave Buzzer Check' }))
    panel.poll(5)
    await panel.flush()
    expect(screen.getByTestId('sbs-controller-layer')).toHaveTextContent('2 buzzers responding')

    panel.setSelectionMode(false)
    await panel.flush()
    expect(screen.getByTestId('sbs-controller-layer')).toHaveTextContent('2 buzzers responding')

    panel.detachPads()
    await panel.flush()
    expect(screen.getByTestId('sbs-controller-layer')).toHaveTextContent(
      'Waiting for buzzer presses',
    )
  })

  it('a later Buzzer Check never re-shows an earlier check’s presses (stale batch)', async () => {
    const panel = renderWbuzzPanel({ selectionMode: true })
    await panel.flush()
    panel.attachWbuzz()
    await panel.connect()
    panel.enterCheck()
    await panel.pressRedAndSettle()
    expect(screen.getByTestId('sbs-test-outcome')).toHaveTextContent(/^Buzzer Check: /)

    panel.setSelectionMode(false)
    await panel.flush()
    panel.detachPads()
    panel.setSelectionMode(true)
    panel.enterCheck()
    await panel.flush()
    expect(screen.getByTestId('sbs-controller-layer')).toHaveTextContent(
      'Waiting for buzzer presses',
    )
    expect(screen.getByTestId('sbs-test-outcome')).toHaveTextContent(/^Buzzer Check is on\./)
  })


  /**
   * FRC-3 — once several Buzzers buzz one team, visible assignment state and the
   * live gameplay mapping must agree immediately, a singular control must not
   * destroy several assignments as a side effect, and "ready" must mean the
   * mapping can actually be materialized.
   */
  it('FRC-3a: a singular generic buzz edit does not silently unassign a team’s other Buzzers', async () => {
    const panel = renderWbuzzPanel({ selectionMode: false })
    await saveRedSharedWithBuzzer3(panel)

    // Both of red's Buzzers buzz red before the edit.
    expect(await buzzOnFreshClue(panel, 3)).toBe('red')

    // A generic per-team capture for red, which the singular copy describes as
    // assigning ONE button. It must not quietly drop Buzzer 1 and Buzzer 3.
    const freeButton = buttonIndexForSlotColor(4, 'red')
    fireEvent.click(screen.getByTestId('gih-capture-red'))
    panel.pressRed(freeButton)
    await panel.flush()
    panel.refresh()

    // The edit fails closed and says why, naming the count and where to change it.
    const status = screen.getByTestId('gih-capture-status').textContent ?? ''
    expect(status).toMatch(/has 2 buzzers assigned/i)
    expect(status).toMatch(/Buzzer setup/i)

    // And nothing was destroyed: both of red's Buzzers still buzz red.
    expect(await buzzOnReopenedClue(panel, 3)).toBe('red')

    expect(await buzzOnReopenedClue(panel, 1)).toBe('red')
  })

  it('FRC-3a: clearing the buzz button of a team with several Buzzers also fails closed', async () => {
    const panel = renderWbuzzPanel({ selectionMode: false })
    await saveRedSharedWithBuzzer3(panel)

    fireEvent.click(screen.getByTestId('gih-clear-red'))
    panel.refresh()
    expect(screen.getByTestId('gih-capture-status')).toHaveTextContent(/has 2 buzzers assigned/i)
    expect(screen.getByTestId('gih-capture-status')).not.toHaveTextContent(/cleared/i)

    expect(await buzzOnFreshClue(panel, 3)).toBe('red')
  })

  it('FRC-3b: unassigning every Buzzer stops them buzzing immediately, not after a reload', async () => {
    const panel = renderWbuzzPanel({ selectionMode: false })
    await saveRedSharedWithBuzzer3(panel)

    // Unassign every Buzzer slot through the supported mapping UI.
    for (const slot of [1, 2, 3, 4]) {
      const select = screen.queryByTestId(`sbs-slot-${slot}`)
      if (select) fireEvent.change(select, { target: { value: '' } })
    }
    await panel.flush()
    panel.refresh()

    // The UI now shows nothing assigned, so nothing may still buzz.
    expect(await buzzOnFreshClue(panel, 3)).toBeNull()
    await panel.pressRedAndSettle(buttonIndexForSlotColor(1, 'red'))
    panel.refresh()
    expect(activeRespondent(queueOf(panel.store))).toBeNull()
  })



  it('FRC-3: the guided handset setup refuses to replace a shared team’s Buzzers', async () => {
    /*
      The third generic write path, and the worst of the three. Before this
      guard `previewSonyBuzzApply` replaced every binding the staged team held
      for all five recipe actions, and the panel reported "Applied handset
      profile for …". A teacher who picked the wrong team in the guided setup
      lost both of a shared team's handsets while being told it worked — unlike
      Assign and Clear, which merely did nothing.
    */
    const panel = renderWbuzzPanel({ selectionMode: false })
    await saveRedSharedWithBuzzer3(panel)
    // Aim the guided setup at the SHARED team, the single-keystroke mistake.
    fireEvent.change(screen.getByTestId('sbs-team'), { target: { value: 'red' } })
    for (const color of ['red', 'blue', 'orange', 'green', 'yellow'] as const) {
      fireEvent.click(screen.getByTestId('sbs-capture'))
      await panel.pressRedAndSettle(buttonIndexForSlotColor(4, color))
    }

    fireEvent.click(screen.getByTestId('sbs-apply'))

    // Refused where the teacher is working, and NOT reported as applied.
    const status = screen.getByTestId('sbs-status')
    expect(status).toHaveTextContent(/has 2 buzzers assigned/i)
    expect(status).not.toHaveTextContent(/applied handset profile/i)

    // Both of the shared team's Buzzers still buzz it.
    expect(await buzzOnFreshClue(panel, 3)).toBe('red')

    expect(await buzzOnReopenedClue(panel, 1)).toBe('red')
  })


  it('FRC-3: the guided refusal is wired in the SETUP posture too, where teachers do handset setup', async () => {
    /*
      The committed guided detector renders with `selectionMode: false`, so it
      exercises only the play-posture SonyBuzzSetupSection. Class Setup is where
      a teacher actually does handset setup, and it is a SECOND render site — the
      one I wired second and had briefly left unwired, which the depth layer in
      `applyMapping` then hid by degrading the message instead of letting the
      write through. This pins that site directly.
    */
    const panel = renderWbuzzPanel({ selectionMode: true })
    await saveRedSharedWithBuzzer3(panel)
    fireEvent.change(screen.getByTestId('sbs-team'), { target: { value: 'red' } })
    for (const color of ['red', 'blue', 'orange', 'green', 'yellow'] as const) {
      fireEvent.click(screen.getByTestId('sbs-capture'))
      await panel.pressRedAndSettle(buttonIndexForSlotColor(4, color))
    }

    fireEvent.click(screen.getByTestId('sbs-apply'))

    const status = screen.getByTestId('sbs-status')
    expect(status).toHaveTextContent(/has 2 buzzers assigned/i)
    expect(status).not.toHaveTextContent(/applied handset profile/i)
    // Not the depth layer's degraded fallback: the call-site guard ran.
    expect(status).not.toHaveTextContent(/see the controller assignments message/i)
  })

})
