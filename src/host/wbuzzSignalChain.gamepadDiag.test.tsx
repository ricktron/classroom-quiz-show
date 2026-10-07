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

  it('distinguishes Wbuzz Gamepad appearance, first button transition, and CQS observation', () => {
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
    expect(kinds).not.toContain('gamepad_button_transition')

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
    expect(kinds).toContain('gamepad_button_transition')
    expect(kinds).toContain('cqs_buzzer_observation')
    expect(outcomes.some((o) => o.kind === 'test-observation')).toBe(true)
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
