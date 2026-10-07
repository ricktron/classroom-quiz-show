import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, render } from '@testing-library/react'
import {
  useGamepadBuzzInput,
  type GamepadBuzzOutcome,
  type UseGamepadBuzzInputOptions,
} from './useGamepadBuzzInput'
import { GAMEPAD_MAPPING_VERSION, type GamepadMapping } from '../input/gamepadMapping'
import { PRIMARY_BUZZ } from '../input/logicalAction'
import {
  getWbuzzSignalTraceSnapshot,
  wipeWbuzzSignalTraceForTests,
} from '../input/wbuzzSignalChainTrace'
import {
  buttons,
  controller,
  fakeGamepadSource,
  fakePollDriver,
  reportedId,
  snapshot,
} from '../test/gamepadFixtures'

const MAPPING: GamepadMapping = {
  version: GAMEPAD_MAPPING_VERSION,
  bindings: [
    { controllerIndex: 0, buttonIndex: 0, teamId: 'red', action: PRIMARY_BUZZ },
    { controllerIndex: 1, buttonIndex: 0, teamId: 'blue', action: PRIMARY_BUZZ },
  ],
}

function Probe(props: UseGamepadBuzzInputOptions) {
  useGamepadBuzzInput(props)
  return null
}

describe('gamepad path diagnostic distinctions (Q7-DIAG-1)', () => {
  afterEach(() => {
    wipeWbuzzSignalTraceForTests()
  })

  it('distinguishes Wbuzz Gamepad appearance, first Wbuzz button transition, and CQS observation', () => {
    const driver = fakePollDriver()
    const source = fakeGamepadSource(
      snapshot(
        controller(0, buttons(20), {
          reportedId: reportedId('Vendor: 054c Product: 1000'),
        }),
      ),
    )
    const outcomes: GamepadBuzzOutcome[] = []

    render(
      <Probe
        enabled
        capturing={false}
        testMode
        mapping={MAPPING}
        target={null}
        dispatch={() => ({ status: 'accepted', events: [] })}
        source={source}
        scheduler={driver}
        onOutcome={(o) => outcomes.push(o)}
      />,
    )

    act(() => {
      driver.poll()
    })
    let kinds = getWbuzzSignalTraceSnapshot().events.map((e) => e.kind)
    expect(kinds).toContain('gamepad_wbuzz_appeared')
    expect(kinds).not.toContain('gamepad_wbuzz_button_transition')

    const appeared = getWbuzzSignalTraceSnapshot().events.find(
      (e) => e.kind === 'gamepad_wbuzz_appeared',
    )
    expect(appeared?.detail.axisCountObserved).toBe(false)
    expect(appeared?.detail.historicalExpectedAxes).toBe(2)
    expect(appeared?.detail.buttonCount).toBe(20)
    expect(appeared?.detail.expectedButtons).toBe(20)
    expect(appeared?.detail).not.toHaveProperty('expectedAxes')

    source.set(
      snapshot(
        controller(0, buttons(20, 0), {
          reportedId: reportedId('Vendor: 054c Product: 1000'),
        }),
      ),
    )
    act(() => {
      driver.poll()
    })
    kinds = getWbuzzSignalTraceSnapshot().events.map((e) => e.kind)
    expect(kinds).toContain('gamepad_wbuzz_button_transition')
    expect(kinds).toContain('cqs_buzzer_observation')
    expect(outcomes.some((o) => o.kind === 'test-observation')).toBe(true)
  })

  it('does not attribute a non-Wbuzz edge as the Wbuzz button transition', () => {
    const driver = fakePollDriver()
    const otherId = reportedId('Generic USB Gamepad')
    const wbuzzId = reportedId('Vendor: 054c Product: 1000')
    const source = fakeGamepadSource(
      snapshot(
        controller(0, buttons(4), { reportedId: otherId }),
        controller(1, buttons(20), { reportedId: wbuzzId }),
      ),
    )
    const outcomes: GamepadBuzzOutcome[] = []

    render(
      <Probe
        enabled
        capturing={false}
        testMode
        mapping={MAPPING}
        target={null}
        dispatch={() => ({ status: 'accepted', events: [] })}
        source={source}
        scheduler={driver}
        onOutcome={(o) => outcomes.push(o)}
      />,
    )

    act(() => {
      driver.poll()
    })
    expect(
      getWbuzzSignalTraceSnapshot().events.map((e) => e.kind),
    ).toContain('gamepad_wbuzz_appeared')

    // First edge from the non-Wbuzz pad must not become a Wbuzz transition fact.
    source.set(
      snapshot(
        controller(0, buttons(4, 0), { reportedId: otherId }),
        controller(1, buttons(20), { reportedId: wbuzzId }),
      ),
    )
    act(() => {
      driver.poll()
    })
    let events = getWbuzzSignalTraceSnapshot().events
    expect(events.map((e) => e.kind)).not.toContain('gamepad_wbuzz_button_transition')
    expect(outcomes.some((o) => o.kind === 'test-observation')).toBe(true)

    // Later Wbuzz edge is the unambiguous attributed transition.
    source.set(
      snapshot(
        controller(0, buttons(4), { reportedId: otherId }),
        controller(1, buttons(20, 0), { reportedId: wbuzzId }),
      ),
    )
    act(() => {
      driver.poll()
    })
    events = getWbuzzSignalTraceSnapshot().events
    const transition = events.find((e) => e.kind === 'gamepad_wbuzz_button_transition')
    expect(transition).toBeDefined()
    expect(transition?.detail.controllerIndex).toBe(1)
    expect(transition?.detail.buttonIndex).toBe(0)
  })

  it('does not create a second Gamepad poll registration', () => {
    const start = vi.fn(() => () => {})
    const source = fakeGamepadSource()
    const { rerender } = render(
      <Probe
        enabled
        capturing={false}
        mapping={MAPPING}
        target={null}
        dispatch={() => ({ status: 'accepted', events: [] })}
        source={source}
        scheduler={{ start }}
      />,
    )
    rerender(
      <Probe
        enabled
        capturing={false}
        mapping={MAPPING}
        target={null}
        dispatch={() => ({ status: 'accepted', events: [] })}
        source={source}
        scheduler={{ start }}
      />,
    )
    expect(start).toHaveBeenCalledTimes(1)
  })
})
