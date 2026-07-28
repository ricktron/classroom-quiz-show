import { describe, expect, it } from 'vitest'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { GamepadInputHostPanel } from './GamepadInputHostPanel'
import { createSessionStore, type SessionStore } from '../state/store'
import { importGameFromUnknown } from '../import/importGame'
import { richBoardConfig } from '../test/categoryBoardFixtures'
import { teamBoardGameFile } from '../test/teamFixtures'
import { createManualClock } from '../time/clock'
import { responsePhaseFor } from '../state/reducer'
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
import { GAMEPAD_DEVICE_CLASSIFICATION_LABEL } from '../input/gamepadDeviceProfile'
import { GAMEPAD_DEVICE_CLASSIFICATION_MESSAGE } from '../input/gamepadDeviceProfile'

/**
 * Sony Buzz! setup section — component behaviour (Slice 10).
 *
 * Drives the bounded child through {@link GamepadInputHostPanel} with a manual
 * clock, fake source and hand-stepped poll driver — same discipline as Slice 9.
 */

const AT = 1_000_000
const ROUND = 'board-round'
const TILE = 'alpha-100'

const THREE_TEAMS = [
  { id: 'red', name: 'Red Team', accent: 'crimson' },
  { id: 'blue', name: 'Blue Team', accent: 'azure' },
  { id: 'green', name: 'Green Team', accent: 'emerald' },
]

const SONY_ID = 'Vendor: 054c Product: 0002'

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
}

function renderPanel(store: SessionStore = boardStore()): Panel {
  const source = fakeGamepadSource()
  const driver = fakePollDriver()
  const clock = createManualClock(AT)
  const game = store.getState().session?.game
  if (!game) throw new Error('fixture has no game')

  const view = render(
    <GamepadInputHostPanel
      dispatch={store.dispatch}
      game={game}
      clock={clock}
      source={source}
      scheduler={driver}
    />,
  )
  return {
    store,
    source,
    driver,
    view,
    poll(times = 1) {
      act(() => {
        for (let index = 0; index < times; index += 1) driver.poll()
      })
    },
  }
}

function attach(
  panel: Panel,
  controllerIndex = 0,
  buttonCount = 12,
  identity: { reportedId?: ReturnType<typeof reportedId>; reportedMapping?: ReturnType<typeof reportedMapping> } = {},
) {
  panel.source.set(snapshot(controller(controllerIndex, buttons(buttonCount), identity)))
  panel.poll()
}

function attachSonyCandidate(panel: Panel, controllerIndex = 0, buttonCount = 12) {
  attach(panel, controllerIndex, buttonCount, {
    reportedId: reportedId(SONY_ID),
    reportedMapping: reportedMapping('standard'),
  })
}

function attachUnrecognized(panel: Panel) {
  attach(panel, 0, 4, {
    reportedId: reportedId('Generic USB Gamepad'),
    reportedMapping: reportedMapping('standard'),
  })
}

function attachIdentityUnavailable(panel: Panel) {
  attach(panel, 0, 4)
}

/** One rising edge on an attached controller during Sony setup capture. */
function captureSonyPress(panel: Panel, buttonIndex: number, controllerIndex = 0, buttonCount = 12) {
  fireEvent.click(screen.getByTestId('sbs-capture'))
  panel.poll()
  panel.source.set(
    snapshot(
      controller(controllerIndex, buttons(buttonCount, buttonIndex), {
        reportedId: reportedId(SONY_ID),
        reportedMapping: reportedMapping('standard'),
      }),
    ),
  )
  panel.poll()
  panel.source.set(
    snapshot(
      controller(controllerIndex, buttons(buttonCount), {
        reportedId: reportedId(SONY_ID),
        reportedMapping: reportedMapping('standard'),
      }),
    ),
  )
  panel.poll()
}

function captureAllSony(panel: Panel, indices: number[]) {
  attachSonyCandidate(panel)
  for (const buttonIndex of indices) {
    captureSonyPress(panel, buttonIndex)
  }
}

describe('calm surface copy', () => {
  it('states no controller calmly and points at the keyboard', () => {
    const panel = renderPanel()
    panel.poll()
    expect(screen.getByTestId('sbs-surface-state')).toHaveTextContent(
      'No controller detected. Keyboard buzzing remains available.',
    )
  })

  it('states unsupported browser calmly', () => {
    const panel = renderPanel()
    panel.source.fail('unsupported')
    panel.poll()
    expect(screen.getByTestId('sbs-surface-state')).toHaveTextContent(
      'Controller input is unsupported in this browser. Keyboard buzzing remains available.',
    )
  })

  it('states unreadable browser calmly', () => {
    const panel = renderPanel()
    panel.source.fail('unreadable')
    panel.poll()
    expect(screen.getByTestId('sbs-surface-state')).toHaveTextContent(
      'Controller state is unreadable in this browser. Nothing was buzzed. Keyboard buzzing remains available.',
    )
  })

  it('describes a candidate Sony Buzz controller without claiming support', () => {
    const panel = renderPanel()
    attachSonyCandidate(panel)
    expect(screen.getByTestId('sbs-surface-state')).toHaveTextContent(
      'At least one candidate Sony Buzz! controller is visible (USB id evidence only).',
    )
    expect(screen.getByTestId('sbs-class-0')).toHaveTextContent(
      GAMEPAD_DEVICE_CLASSIFICATION_LABEL['candidate-sony-buzz-wired'],
    )
    expect(screen.getByTestId('sbs-class-msg-0')).toHaveTextContent(
      GAMEPAD_DEVICE_CLASSIFICATION_MESSAGE['candidate-sony-buzz-wired'],
    )
  })

  it('describes unrecognized controllers calmly', () => {
    const panel = renderPanel()
    attachUnrecognized(panel)
    expect(screen.getByTestId('sbs-surface-state')).toHaveTextContent(/unrecognized/i)
    expect(screen.getByTestId('sbs-class-0')).toHaveTextContent(
      GAMEPAD_DEVICE_CLASSIFICATION_LABEL.unrecognized,
    )
  })

  it('describes identity-unavailable controllers calmly', () => {
    const panel = renderPanel()
    attachIdentityUnavailable(panel)
    expect(screen.getByTestId('sbs-surface-state')).toHaveTextContent(/identity is unavailable/i)
    expect(screen.getByTestId('sbs-class-0')).toHaveTextContent(
      GAMEPAD_DEVICE_CLASSIFICATION_LABEL['identity-unavailable'],
    )
  })
})

describe('guided capture workflow', () => {
  it('captures five buttons in prompt order with colour words in labels', () => {
    const panel = renderPanel()
    captureAllSony(panel, [0, 1, 2, 3, 4])

    expect(screen.getByTestId('sbs-progress')).toHaveTextContent('5 of 5 — complete')
    fireEvent.click(screen.getByTestId('sbs-preview'))
    for (const colour of ['red', 'blue', 'orange', 'green', 'yellow']) {
      expect(screen.getByTestId('sbs-preview-list')).toHaveTextContent(colour)
    }
    expect(screen.getByTestId('sbs-status')).toHaveTextContent(/Preview ready/i)
  })

  it('shows staged progress after each capture', () => {
    const panel = renderPanel()
    attachSonyCandidate(panel)
    expect(screen.getByTestId('sbs-progress')).toHaveTextContent('0 of 5')
    expect(screen.getByTestId('sbs-progress')).toHaveTextContent(/large red buzzer/i)
    expect(screen.getByTestId('sbs-progress')).toHaveTextContent(/\(red\)/)
    captureSonyPress(panel, 0)
    expect(screen.getByTestId('sbs-progress')).toHaveTextContent('1 of 5')
    expect(screen.getByTestId('sbs-progress')).toHaveTextContent(/blue button/i)
    expect(screen.getByTestId('sbs-progress')).toHaveTextContent(/\(blue\)/)
  })

  it('cancels capture without losing staged progress', () => {
    const panel = renderPanel()
    attachSonyCandidate(panel)
    captureSonyPress(panel, 0)
    fireEvent.click(screen.getByTestId('sbs-capture'))
    expect(screen.getByTestId('sbs-capture')).toHaveTextContent('Cancel capture')
    fireEvent.click(screen.getByTestId('sbs-capture'))
    expect(screen.getByTestId('sbs-status')).toHaveTextContent(/Capture cancelled/i)
    expect(screen.getByTestId('sbs-progress')).toHaveTextContent('1 of 5')
  })
})

describe('conflicts and validation', () => {
  it('refuses staging a button already assigned in the active mapping', () => {
    const panel = renderPanel()
    attachSonyCandidate(panel)
    fireEvent.click(screen.getByTestId('gih-capture-red'))
    panel.poll()
    panel.source.set(
      snapshot(
        controller(0, buttons(12, 0), {
          reportedId: reportedId(SONY_ID),
          reportedMapping: reportedMapping('standard'),
        }),
      ),
    )
    panel.poll()
    panel.source.set(
      snapshot(
        controller(0, buttons(12), {
          reportedId: reportedId(SONY_ID),
          reportedMapping: reportedMapping('standard'),
        }),
      ),
    )
    panel.poll()

    fireEvent.click(screen.getByTestId('sbs-capture'))
    panel.poll()
    panel.source.set(
      snapshot(
        controller(0, buttons(12, 0), {
          reportedId: reportedId(SONY_ID),
          reportedMapping: reportedMapping('standard'),
        }),
      ),
    )
    panel.poll()
    expect(screen.getByTestId('sbs-status')).toHaveTextContent(/already assigned/i)
    expect(screen.getByTestId('sbs-progress')).toHaveTextContent('0 of 5')
  })

  it('refuses preview when the profile is incomplete', () => {
    const panel = renderPanel()
    attachSonyCandidate(panel)
    captureSonyPress(panel, 0)
    fireEvent.click(screen.getByTestId('sbs-preview'))
    expect(screen.getByTestId('sbs-status')).toHaveTextContent(/incomplete/i)
    expect(screen.queryByTestId('sbs-preview-list')).toBeNull()
  })

  it('refuses apply when a staged control conflicts with another team', () => {
    const panel = renderPanel()
    captureAllSony(panel, [0, 1, 2, 3, 4])

    fireEvent.click(screen.getByTestId('gih-capture-blue'))
    panel.poll()
    panel.source.set(
      snapshot(
        controller(0, buttons(12, 2), {
          reportedId: reportedId(SONY_ID),
          reportedMapping: reportedMapping('standard'),
        }),
      ),
    )
    panel.poll()
    panel.source.set(
      snapshot(
        controller(0, buttons(12), {
          reportedId: reportedId(SONY_ID),
          reportedMapping: reportedMapping('standard'),
        }),
      ),
    )
    panel.poll()

    fireEvent.click(screen.getByTestId('sbs-apply'))
    expect(screen.getByTestId('sbs-status')).toHaveTextContent(/already assigned|conflict/i)
    expect(screen.getByTestId('gih-control-blue')).toHaveTextContent('Controller 1 · button 3')
    expect(screen.getByTestId('gih-control-red')).toHaveTextContent('Not assigned')
  })
})

describe('preview, apply, and discard', () => {
  it('shows a preview list before apply', () => {
    const panel = renderPanel()
    captureAllSony(panel, [0, 1, 2, 3, 4])
    fireEvent.click(screen.getByTestId('sbs-preview'))
    expect(screen.getByTestId('sbs-preview-list')).toBeInTheDocument()
    expect(screen.getByTestId('sbs-status')).toHaveTextContent(/Preview ready/i)
    for (const colour of ['red', 'blue', 'orange', 'green', 'yellow']) {
      expect(screen.getByTestId('sbs-preview-list')).toHaveTextContent(colour)
    }
  })

  it('apply writes bindings into the active mapping', () => {
    const panel = renderPanel()
    captureAllSony(panel, [0, 1, 2, 3, 4])
    fireEvent.click(screen.getByTestId('sbs-apply'))
    expect(screen.getByTestId('sbs-status')).toHaveTextContent(/Applied handset profile/i)
    expect(screen.getByTestId('gih-control-red')).toHaveTextContent('Controller 1 · button 1')
    fireEvent.change(screen.getByTestId('gih-action'), { target: { value: 'secondary1' } })
    expect(screen.getByTestId('gih-control-red')).toHaveTextContent('Controller 1 · button 2')
  })

  it('discard leaves the active mapping unchanged', () => {
    const panel = renderPanel()
    attachSonyCandidate(panel)
    fireEvent.click(screen.getByTestId('gih-capture-blue'))
    panel.poll()
    panel.source.set(
      snapshot(
        controller(0, buttons(12, 5), {
          reportedId: reportedId(SONY_ID),
          reportedMapping: reportedMapping('standard'),
        }),
      ),
    )
    panel.poll()
    panel.source.set(
      snapshot(
        controller(0, buttons(12), {
          reportedId: reportedId(SONY_ID),
          reportedMapping: reportedMapping('standard'),
        }),
      ),
    )
    panel.poll()

    captureAllSony(panel, [0, 1, 2, 3, 4])
    fireEvent.click(screen.getByTestId('sbs-discard'))
    expect(screen.getByTestId('sbs-status')).toHaveTextContent(/active controller mapping was not changed/i)
    expect(screen.getByTestId('gih-control-blue')).toHaveTextContent('Controller 1 · button 6')
    expect(screen.getByTestId('gih-control-red')).toHaveTextContent('Not assigned')
  })
})

describe('test mode', () => {
  it('reports mapped presses without changing queue or revision', () => {
    const store = boardStore()
    openClue(store)
    arm(store)
    const revisionBefore = store.getState().revision
    const panel = renderPanel(store)

    captureAllSony(panel, [0, 1, 2, 3, 4])
    fireEvent.click(screen.getByTestId('sbs-apply'))
    fireEvent.click(screen.getByTestId('sbs-test-mode'))

    attachSonyCandidate(panel)
    panel.source.set(
      snapshot(
        controller(0, buttons(12, 0), {
          reportedId: reportedId(SONY_ID),
          reportedMapping: reportedMapping('standard'),
        }),
      ),
    )
    panel.poll()
    panel.source.set(
      snapshot(
        controller(0, buttons(12), {
          reportedId: reportedId(SONY_ID),
          reportedMapping: reportedMapping('standard'),
        }),
      ),
    )
    panel.poll()

    expect(screen.getByTestId('sbs-test-outcome')).toHaveTextContent(/Test: Red Team · Buzz/i)
    expect(screen.getByTestId('gih-outcome')).toHaveTextContent(/no gameplay change/i)
    expect(queueOf(store).order).toEqual([])
    expect(store.getState().revision).toBe(revisionBefore)
  })
})

describe('copy guardrails', () => {
  it('states keyboard fallback and session-local lifetime', () => {
    const panel = renderPanel()
    panel.poll()
    expect(screen.getByTestId('sbs-keyboard-fallback')).toHaveTextContent(
      /Keyboard buzzing remains available whether or not a Sony Buzz! candidate is present/i,
    )
    expect(screen.getByTestId('sbs-intro')).toHaveTextContent(/lost when this page reloads/i)
    expect(screen.getByTestId('sbs-intro')).toHaveTextContent(/candidate match is not proof/i)
  })

  it('never claims supported hardware', () => {
    const panel = renderPanel()
    attachSonyCandidate(panel)
    captureAllSony(panel, [0, 1, 2, 3, 4])
    const text = panel.view.container.textContent?.toLowerCase() ?? ''
    expect(text).not.toContain('supported hardware')
    for (const word of ['compatible', 'certified', 'validated', 'guaranteed']) {
      expect(text, `must not claim ${word}`).not.toContain(word)
    }
  })

  it('colour prompts name every colour in words', () => {
    const panel = renderPanel()
    attachSonyCandidate(panel)
    fireEvent.click(screen.getByTestId('sbs-capture'))
    expect(screen.getByTestId('sbs-status').textContent?.toLowerCase()).toContain('red')
    panel.poll()
    panel.source.set(
      snapshot(
        controller(0, buttons(12, 0), {
          reportedId: reportedId(SONY_ID),
          reportedMapping: reportedMapping('standard'),
        }),
      ),
    )
    panel.poll()
    panel.source.set(
      snapshot(
        controller(0, buttons(12), {
          reportedId: reportedId(SONY_ID),
          reportedMapping: reportedMapping('standard'),
        }),
      ),
    )
    panel.poll()
    fireEvent.click(screen.getByTestId('sbs-capture'))
    expect(screen.getByTestId('sbs-status').textContent?.toLowerCase()).toContain('blue')
  })
})
