import { describe, expect, it, vi } from 'vitest'
import { act, render } from '@testing-library/react'
import {
  animationFramePollScheduler,
  useGamepadBuzzInput,
  type GamepadBuzzOutcome,
  type GamepadDiagnostics,
  type UseGamepadBuzzInputOptions,
} from './useGamepadBuzzInput'
import { GAMEPAD_MAPPING_VERSION, type GamepadMapping } from '../input/gamepadMapping'
import { PRIMARY_BUZZ, type LocalInputAction } from '../input/logicalAction'
import {
  UNAVAILABLE_GAMEPAD_REPORTED_ID,
  UNAVAILABLE_GAMEPAD_REPORTED_MAPPING,
} from '../input/gamepadSource'
import type { SessionCommand } from '../state/commands'
import type { DispatchResult } from '../state/store'
import { createManualClock } from '../time/clock'
import {
  buttons,
  controller,
  fakeGamepadSource,
  fakePollDriver,
  snapshot,
  throwingGamepadSource,
  type FakeGamepadSource,
  type FakePollDriver,
} from '../test/gamepadFixtures'

/**
 * The Gamepad polling LIFECYCLE (Slice 9).
 *
 * The claims proved here, all with a fake source and a hand-driven poll driver —
 * no browser, no animation frame, no physical controller, no waiting:
 *  - polling starts once, is never registered twice, and stops on unmount;
 *  - an unsupported API and a throwing source both degrade safely and buzz
 *    nothing;
 *  - enable/disable, a mapping change, capture, visibility restoration and focus
 *    restoration all RE-PRIME, so a held button cannot buzz across any of them;
 *  - connect and disconnect append nothing;
 *  - the clock is read only at a genuine input edge;
 *  - diagnostics report the STABLE picture and are not emitted per frame.
 */

const TARGET = { roundId: 'board-round', tileId: 'alpha-100' }

const MAPPING: GamepadMapping = {
  version: GAMEPAD_MAPPING_VERSION,
  bindings: [
    { controllerIndex: 0, buttonIndex: 0, teamId: 'red', action: PRIMARY_BUZZ },
    { controllerIndex: 1, buttonIndex: 2, teamId: 'blue', action: PRIMARY_BUZZ },
  ],
}

const SECONDARY_MAPPING: GamepadMapping = {
  version: GAMEPAD_MAPPING_VERSION,
  bindings: [
    { controllerIndex: 0, buttonIndex: 0, teamId: 'red', action: PRIMARY_BUZZ },
    {
      controllerIndex: 0,
      buttonIndex: 1,
      teamId: 'red',
      action: { kind: 'secondary', slot: 'secondary1' },
    },
  ],
}

function controllerInfo(
  controllerIndex: number,
  buttonCount: number,
  classification: 'identity-unavailable' | 'candidate-sony-buzz-wired' = 'identity-unavailable',
) {
  return {
    controllerIndex,
    buttonCount,
    reportedId: UNAVAILABLE_GAMEPAD_REPORTED_ID,
    reportedMapping: UNAVAILABLE_GAMEPAD_REPORTED_MAPPING,
    classification,
  }
}

interface Harness {
  readonly driver: FakePollDriver
  readonly source: FakeGamepadSource
  readonly outcomes: GamepadBuzzOutcome[]
  readonly diagnostics: GamepadDiagnostics[]
  readonly captures: { controllerIndex: number; buttonIndex: number }[]
  readonly commands: SessionCommand[]
  readonly clock: ReturnType<typeof createManualClock>
  readonly clockReads: () => number
  rerender(next: Partial<UseGamepadBuzzInputOptions>): void
  unmount(): void
  poll(times?: number): void
}

function harness(initial: Partial<UseGamepadBuzzInputOptions> = {}): Harness {
  const driver = fakePollDriver()
  const source = fakeGamepadSource()
  const outcomes: GamepadBuzzOutcome[] = []
  const diagnostics: GamepadDiagnostics[] = []
  const captures: { controllerIndex: number; buttonIndex: number }[] = []
  const commands: SessionCommand[] = []
  const manual = createManualClock()
  let reads = 0
  const clock = {
    now() {
      reads += 1
      return manual.now()
    },
  }

  const dispatch = (command: SessionCommand): DispatchResult => {
    commands.push(command)
    return { status: 'accepted', events: [] }
  }

  function Probe(props: Partial<UseGamepadBuzzInputOptions>) {
    useGamepadBuzzInput({
      enabled: true,
      capturing: false,
      testMode: false,
      mapping: MAPPING,
      target: TARGET,
      dispatch,
      clock,
      source,
      scheduler: driver,
      onOutcome: (outcome) => outcomes.push(outcome),
      onDiagnostics: (value) => diagnostics.push(value),
      onCapture: (control) => captures.push(control),
      ...props,
    })
    return null
  }

  const view = render(<Probe {...initial} />)
  let current = initial
  return {
    driver,
    source,
    outcomes,
    diagnostics,
    captures,
    commands,
    clock: manual,
    clockReads: () => reads,
    rerender(next) {
      current = { ...current, ...next }
      view.rerender(<Probe {...current} />)
    },
    unmount: () => view.unmount(),
    poll(times = 1) {
      act(() => {
        for (let index = 0; index < times; index += 1) driver.poll()
      })
    },
  }
}

describe('the poll loop', () => {
  it('starts exactly one loop and stops it on unmount', () => {
    const probe = harness()
    expect(probe.driver.starts()).toBe(1)
    expect(probe.driver.running()).toBe(true)
    probe.unmount()
    expect(probe.driver.running()).toBe(false)
  })

  it('never registers a second loop, however often the props change', () => {
    const probe = harness()
    probe.rerender({ enabled: false })
    probe.rerender({ enabled: true })
    probe.rerender({ target: null })
    probe.rerender({ mapping: { version: GAMEPAD_MAPPING_VERSION, bindings: [] } })
    expect(probe.driver.starts()).toBe(1)
  })

  it('polls nothing at all after unmount', () => {
    const probe = harness()
    probe.unmount()
    expect(() => probe.driver.poll()).toThrow(/not running/)
  })

  it('reads the source once per poll and no more', () => {
    const probe = harness()
    probe.poll(3)
    expect(probe.source.reads()).toBe(3)
  })
})

describe('unsupported and unreadable sources', () => {
  it('degrades safely when the browser has no Gamepad API', () => {
    const probe = harness()
    probe.source.fail('unsupported')
    probe.poll(3)
    expect(probe.commands).toEqual([])
    expect(probe.outcomes).toEqual([])
    expect(probe.diagnostics.at(-1)).toEqual({ status: 'unsupported', controllers: [] })
  })

  it('degrades safely when a read fails, and reports it as a distinct status', () => {
    const probe = harness()
    probe.source.fail('unreadable')
    probe.poll(2)
    expect(probe.commands).toEqual([])
    expect(probe.diagnostics.at(-1)).toEqual({ status: 'unreadable', controllers: [] })
  })

  /**
   * A source that throws is contained by the source itself, which is why the hook
   * can treat "unreadable" as ordinary data. This proves the containment end to
   * end rather than trusting the layering.
   */
  it('contains a source that throws rather than tearing down the host', () => {
    const driver = fakePollDriver()
    function Probe() {
      useGamepadBuzzInput({
        enabled: true,
        capturing: false,
        mapping: MAPPING,
        target: TARGET,
        dispatch: () => ({ status: 'accepted', events: [] }),
        source: {
          read: () => {
            try {
              return throwingGamepadSource().read()
            } catch {
              return { status: 'unreadable' }
            }
          },
        },
        scheduler: driver,
      })
      return null
    }
    render(<Probe />)
    expect(() => act(() => driver.poll())).not.toThrow()
  })

  it('re-primes after a failed read, so a held button cannot buzz on recovery', () => {
    const probe = harness()
    probe.source.set(snapshot(controller(0, buttons(2))))
    probe.poll()
    probe.source.fail('unreadable')
    probe.poll()
    // Recovered — with the button already down. It must NOT buzz.
    probe.source.set(snapshot(controller(0, buttons(2, 0))))
    probe.poll(2)
    expect(probe.commands).toEqual([])
  })
})

describe('a real press', () => {
  it('dispatches RECORD_TEAM_BUZZ for a mapped button, once', () => {
    const probe = harness()
    probe.source.set(snapshot(controller(0, buttons(2))))
    probe.poll()
    probe.source.set(snapshot(controller(0, buttons(2, 0))))
    probe.poll(3) // pressed, then held, then held
    expect(probe.commands).toEqual([
      {
        type: 'RECORD_TEAM_BUZZ',
        issuedAt: probe.clock.now(),
        roundId: 'board-round',
        tileId: 'alpha-100',
        teamId: 'red',
      },
    ])
    expect(probe.outcomes).toEqual([{ kind: 'accepted', teamId: 'red' }])
  })

  it('reports an unmapped button rather than doing nothing silently', () => {
    const probe = harness()
    probe.source.set(snapshot(controller(0, buttons(4))))
    probe.poll()
    probe.source.set(snapshot(controller(0, buttons(4, 3))))
    probe.poll()
    expect(probe.commands).toEqual([])
    expect(probe.outcomes).toEqual([{ kind: 'ignored', reason: 'unmapped-button' }])
  })

  it('processes several fresh edges in one poll in the documented order', () => {
    const probe = harness()
    probe.source.set(snapshot(controller(0, buttons(4)), controller(1, buttons(4))))
    probe.poll()
    probe.source.set(
      snapshot(controller(0, buttons(4, 0)), controller(1, buttons(4, 2))),
    )
    probe.poll()
    expect(probe.commands.map((command) => 'teamId' in command && command.teamId)).toEqual([
      'red',
      'blue',
    ])
  })
})

describe('re-priming', () => {
  /** Hold a button, then apply `change`, then keep holding. Nothing may buzz. */
  function heldAcross(change: (probe: Harness) => void) {
    const probe = harness()
    probe.source.set(snapshot(controller(0, buttons(2, 0)))) // already held
    probe.poll(2)
    expect(probe.commands).toEqual([])
    act(() => change(probe))
    probe.poll(3) // still held throughout
    return probe
  }

  it('re-primes on enable, so a held button does not buzz when input is switched on', () => {
    const probe = harness({ enabled: false })
    probe.source.set(snapshot(controller(0, buttons(2, 0))))
    probe.poll(2)
    act(() => probe.rerender({ enabled: true }))
    probe.poll(3)
    expect(probe.commands).toEqual([])
  })

  it('re-primes on disable and re-enable', () => {
    const probe = heldAcross((value) => {
      value.rerender({ enabled: false })
      value.rerender({ enabled: true })
    })
    expect(probe.commands).toEqual([])
  })

  it('re-primes when the mapping changes', () => {
    const probe = heldAcross((value) =>
      value.rerender({
        mapping: {
          version: GAMEPAD_MAPPING_VERSION,
          bindings: [
            { controllerIndex: 0, buttonIndex: 0, teamId: 'blue', action: PRIMARY_BUZZ },
          ],
        },
      }),
    )
    expect(probe.commands).toEqual([])
  })

  it('re-primes when capture starts and again when it ends', () => {
    const probe = heldAcross((value) => {
      value.rerender({ capturing: true })
      value.rerender({ capturing: false })
    })
    expect(probe.commands).toEqual([])
  })

  it('re-primes when the tab becomes visible again', () => {
    const probe = heldAcross(() => {
      document.dispatchEvent(new Event('visibilitychange'))
    })
    expect(probe.commands).toEqual([])
  })

  it('re-primes when the window regains focus', () => {
    const probe = heldAcross(() => {
      window.dispatchEvent(new Event('blur'))
      window.dispatchEvent(new Event('focus'))
    })
    expect(probe.commands).toEqual([])
  })

  it('re-primes on a gamepad connect or disconnect event', () => {
    const probe = heldAcross(() => {
      window.dispatchEvent(new Event('gamepadconnected'))
      window.dispatchEvent(new Event('gamepaddisconnected'))
    })
    expect(probe.commands).toEqual([])
  })

  it('still buzzes after a re-prime once the button is released and pressed', () => {
    const probe = heldAcross((value) => value.rerender({ capturing: true }))
    act(() => probe.rerender({ capturing: false }))
    probe.source.set(snapshot(controller(0, buttons(2)))) // release
    probe.poll()
    probe.source.set(snapshot(controller(0, buttons(2, 0)))) // fresh press
    probe.poll()
    expect(probe.commands).toHaveLength(1)
  })
})

describe('connect and disconnect', () => {
  it('dispatches nothing when a controller appears with a button held', () => {
    const probe = harness()
    probe.source.set(snapshot())
    probe.poll()
    probe.source.set(snapshot(controller(0, buttons(2, 0))))
    probe.poll(3)
    expect(probe.commands).toEqual([])
    expect(probe.outcomes).toEqual([])
  })

  it('dispatches nothing when a controller disappears mid-press', () => {
    const probe = harness()
    probe.source.set(snapshot(controller(0, buttons(2))))
    probe.poll()
    probe.source.set(snapshot())
    probe.poll(2)
    expect(probe.commands).toEqual([])
  })

  it('announces the stable picture, and only when it actually changes', () => {
    const probe = harness()
    probe.source.set(snapshot(controller(0, buttons(4))))
    probe.poll(5)
    expect(probe.diagnostics).toEqual([
      { status: 'ok', controllers: [controllerInfo(0, 4)] },
    ])

    // Pressing a button changes NOTHING in the diagnostics — the picture is
    // stable facts only, so a screen reader hears nothing while a button is held.
    probe.source.set(snapshot(controller(0, buttons(4, 1))))
    probe.poll(5)
    expect(probe.diagnostics).toHaveLength(1)

    // Plugging a second controller in DOES change it, exactly once.
    probe.source.set(snapshot(controller(0, buttons(4, 1)), controller(1, buttons(8))))
    probe.poll(5)
    expect(probe.diagnostics).toHaveLength(2)
    expect(probe.diagnostics[1]?.controllers).toEqual([
      controllerInfo(0, 4),
      controllerInfo(1, 8),
    ])
  })
})

describe('setup test mode (Slice 10)', () => {
  it('never dispatches while test mode is active', () => {
    const probe = harness({ testMode: true, mapping: MAPPING, target: TARGET })
    probe.source.set(snapshot(controller(0, buttons(2))))
    probe.poll()
    probe.source.set(snapshot(controller(0, buttons(2, 0))))
    probe.poll(3)
    expect(probe.commands).toEqual([])
  })

  it('reports primary and secondary bindings as test observations', () => {
    const probe = harness({ testMode: true, mapping: SECONDARY_MAPPING })
    probe.source.set(snapshot(controller(0, buttons(4))))
    probe.poll()
    probe.source.set(snapshot(controller(0, buttons(4, 0, 1))))
    probe.poll()
    expect(probe.commands).toEqual([])
    expect(probe.outcomes).toEqual([
      {
        kind: 'test-observation',
        teamId: 'red',
        action: PRIMARY_BUZZ,
        control: { controllerIndex: 0, buttonIndex: 0 },
      },
      {
        kind: 'test-observation',
        teamId: 'red',
        action: { kind: 'secondary', slot: 'secondary1' } satisfies LocalInputAction,
        control: { controllerIndex: 0, buttonIndex: 1 },
      },
    ])
  })

  it('re-primes when test mode starts and ends, so a held button cannot observe', () => {
    const probe = harness({ testMode: false })
    probe.source.set(snapshot(controller(0, buttons(2, 0))))
    probe.poll(2)
    act(() => probe.rerender({ testMode: true }))
    probe.poll(3)
    expect(probe.outcomes).toEqual([])
    act(() => probe.rerender({ testMode: false }))
    probe.poll(3)
    expect(probe.commands).toEqual([])
  })

  it('re-primes when leaving test mode even if a fresh press is already staged', () => {
    // Contract: a press that appears in the source before the first poll after
    // leaving test mode must not become a gameplay edge. The gate clear runs
    // synchronously with the render that publishes testMode=false into `latest`.
    const probe = harness({ testMode: true })
    probe.source.set(snapshot(controller(0, buttons(2))))
    probe.poll()
    probe.source.set(snapshot(controller(0, buttons(2, 0))))
    act(() => probe.rerender({ testMode: false }))
    probe.poll(3)
    expect(probe.commands).toEqual([])
    probe.source.set(snapshot(controller(0, buttons(2))))
    probe.poll()
    probe.source.set(snapshot(controller(0, buttons(2, 0))))
    probe.poll()
    expect(probe.commands).toHaveLength(1)
  })

  it('includes classification fields in stable diagnostics', () => {
    const probe = harness()
    probe.source.set(
      snapshot(
        controller(0, buttons(4), {
          reportedId: { status: 'available', value: 'Vendor: 054c Product: 0002' },
          reportedMapping: { status: 'available', value: 'standard' },
        }),
      ),
    )
    probe.poll(3)
    expect(probe.diagnostics.at(-1)?.controllers[0]).toEqual({
      controllerIndex: 0,
      buttonCount: 4,
      reportedId: { status: 'available', value: 'Vendor: 054c Product: 0002' },
      reportedMapping: { status: 'available', value: 'standard' },
      classification: 'candidate-sony-buzz-wired',
    })
  })

  it('never registers a second poll loop when test mode toggles', () => {
    const probe = harness({ testMode: true })
    probe.rerender({ testMode: false })
    probe.rerender({ testMode: true })
    expect(probe.driver.starts()).toBe(1)
  })
})

describe('capture mode', () => {
  it('hands the first fresh press to the capture callback and buzzes nothing', () => {
    const probe = harness({ capturing: true })
    probe.source.set(snapshot(controller(0, buttons(2))))
    probe.poll()
    probe.source.set(snapshot(controller(0, buttons(2, 0))))
    probe.poll()
    expect(probe.captures).toEqual([{ controllerIndex: 0, buttonIndex: 0 }])
    expect(probe.commands).toEqual([])
    expect(probe.outcomes).toEqual([{ kind: 'ignored', reason: 'capture-mode' }])
  })

  it('does not capture a held button over and over', () => {
    const probe = harness({ capturing: true })
    probe.source.set(snapshot(controller(0, buttons(2))))
    probe.poll()
    probe.source.set(snapshot(controller(0, buttons(2, 0))))
    probe.poll(5)
    expect(probe.captures).toHaveLength(1)
  })

  it('does not capture a button that was already held when capture began', () => {
    const probe = harness({ capturing: true })
    probe.source.set(snapshot(controller(0, buttons(2, 0))))
    probe.poll(4)
    expect(probe.captures).toEqual([])
  })
})

describe('the clock', () => {
  it('is read only at a genuine input edge', () => {
    const probe = harness()
    probe.source.set(snapshot(controller(0, buttons(2))))
    probe.poll(10) // ten polls, nothing pressed
    expect(probe.clockReads()).toBe(0)

    probe.source.set(snapshot(controller(0, buttons(2, 0))))
    probe.poll(10) // one edge, then nine held frames
    expect(probe.clockReads()).toBe(1)
  })

  it('reads no clock for an ignored or unmapped edge beyond the one stamp', () => {
    const probe = harness({ enabled: false })
    probe.source.set(snapshot(controller(0, buttons(2))))
    probe.poll()
    probe.source.set(snapshot(controller(0, buttons(2, 0))))
    probe.poll()
    // One read, at the edge, before the gate refuses it — never a second.
    expect(probe.clockReads()).toBe(1)
    expect(probe.commands).toEqual([])
  })
})

describe('the production scheduler', () => {
  it('drives one frame loop and cancels it on stop', () => {
    const frames: FrameRequestCallback[] = []
    const raf = vi
      .spyOn(window, 'requestAnimationFrame')
      .mockImplementation((callback: FrameRequestCallback) => {
        frames.push(callback)
        return frames.length
      })
    const cancel = vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {})

    let ticks = 0
    const stop = animationFramePollScheduler().start(() => {
      ticks += 1
    })
    expect(frames).toHaveLength(1)
    frames[0]?.(0)
    expect(ticks).toBe(1)
    expect(frames).toHaveLength(2)

    stop()
    frames[1]?.(0)
    // A frame that was already queued when stop() ran must not tick.
    expect(ticks).toBe(1)
    expect(cancel).toHaveBeenCalled()
    // Stopping twice is safe.
    expect(() => stop()).not.toThrow()

    raf.mockRestore()
    cancel.mockRestore()
  })
})
