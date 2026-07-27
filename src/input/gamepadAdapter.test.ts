import { describe, expect, it } from 'vitest'
import {
  EMPTY_GAMEPAD_BASELINE,
  GAMEPAD_IGNORE_MESSAGE,
  GAMEPAD_IGNORE_REASONS,
  scanGamepadEdges,
  translateGamepadEdge,
  type GamepadBaseline,
} from './gamepadAdapter'
import {
  GAMEPAD_MAPPING_VERSION,
  type GamepadMapping,
} from './gamepadMapping'
import { PRIMARY_BUZZ } from './logicalAction'
import { EMPTY_GAMEPAD_SNAPSHOT } from './gamepadSource'
import { buttons, controller, snapshot } from '../test/gamepadFixtures'

/**
 * Rising-edge detection and Gamepad translation (Slice 9).
 *
 * The claims proved here, all with a scripted sequence of snapshots and no
 * browser, no frame and no physical controller:
 *  - one physical press produces at most one logical input;
 *  - a held button never repeats;
 *  - the FIRST observation of a controller is a baseline only, so a button
 *    already held at connect, enable, mapping change, capture completion, tab
 *    restoration, focus restoration or reconnection cannot buzz;
 *  - a disconnect produces nothing and forgets its state; a reconnect starts from
 *    a fresh baseline whether it comes back at the same index or a different one;
 *  - several fresh edges in one poll are ordered deterministically by ascending
 *    controller index and then ascending button index;
 *  - no clock is read anywhere in this module.
 */

const AT = 1_000_000

function baselineOf(...pairs: [number, readonly boolean[]][]): GamepadBaseline {
  return { pressedByController: new Map(pairs) }
}

/** Feed a sequence of snapshots through the scanner, starting unprimed. */
function replay(...frames: ReturnType<typeof snapshot>[]) {
  let baseline: GamepadBaseline | null = null
  const perFrame: { controllerIndex: number; buttonIndex: number }[][] = []
  for (const frame of frames) {
    const scan = scanGamepadEdges(baseline, frame)
    baseline = scan.baseline
    perFrame.push([...scan.edges])
  }
  return { perFrame, baseline }
}

describe('priming the baseline', () => {
  it('emits nothing on the first poll, whatever is pressed', () => {
    const scan = scanGamepadEdges(null, snapshot(controller(0, buttons(4, 0, 1, 2, 3))))
    expect(scan.edges).toEqual([])
    expect(scan.baseline.pressedByController.get(0)).toEqual([true, true, true, true])
  })

  /**
   * THE load-bearing safety claim. A teacher plugs a controller in with a button
   * resting against the desk; the button is held from the very first frame. It
   * must not buzz until it is released and pressed again.
   */
  it('never buzzes a button that was already held when the controller appeared', () => {
    const { perFrame } = replay(
      snapshot(controller(0, buttons(2, 0))), // appears, button 0 already down
      snapshot(controller(0, buttons(2, 0))), // still down
      snapshot(controller(0, buttons(2, 0))), // still down
    )
    expect(perFrame).toEqual([[], [], []])
  })

  it('buzzes once the held button is released and pressed again', () => {
    const { perFrame } = replay(
      snapshot(controller(0, buttons(2, 0))), // held at first sight
      snapshot(controller(0, buttons(2))), // released — rearms
      snapshot(controller(0, buttons(2, 0))), // fresh press
    )
    expect(perFrame).toEqual([[], [], [{ controllerIndex: 0, buttonIndex: 0 }]])
  })

  it('treats an explicit re-prime exactly like a first sighting', () => {
    // `null` is what the hook passes after enable/disable, a mapping change, a
    // capture completing, a visibility change or a focus change.
    const held = snapshot(controller(0, buttons(2, 0)))
    const primed = scanGamepadEdges(baselineOf([0, [false, false]]), held)
    expect(primed.edges).toEqual([{ controllerIndex: 0, buttonIndex: 0 }])
    // …but after a re-prime the very same transition emits nothing.
    expect(scanGamepadEdges(null, held).edges).toEqual([])
  })

  it('starts empty', () => {
    expect(EMPTY_GAMEPAD_BASELINE.pressedByController.size).toBe(0)
    expect(scanGamepadEdges(EMPTY_GAMEPAD_BASELINE, EMPTY_GAMEPAD_SNAPSHOT).edges).toEqual([])
  })
})

describe('rising edges', () => {
  it('emits exactly one input for one press, and nothing while it is held', () => {
    const { perFrame } = replay(
      snapshot(controller(0, buttons(3))), // baseline, nothing pressed
      snapshot(controller(0, buttons(3, 1))), // press
      snapshot(controller(0, buttons(3, 1))), // held
      snapshot(controller(0, buttons(3, 1))), // held
    )
    expect(perFrame).toEqual([[], [{ controllerIndex: 0, buttonIndex: 1 }], [], []])
  })

  it('emits nothing on release, and rearms that control only', () => {
    const { perFrame } = replay(
      snapshot(controller(0, buttons(2))),
      snapshot(controller(0, buttons(2, 0))), // press 0
      snapshot(controller(0, buttons(2))), // release 0 — silent
      snapshot(controller(0, buttons(2, 0))), // press 0 again
    )
    expect(perFrame).toEqual([
      [],
      [{ controllerIndex: 0, buttonIndex: 0 }],
      [],
      [{ controllerIndex: 0, buttonIndex: 0 }],
    ])
  })

  it('tracks each button independently on the same controller', () => {
    const { perFrame } = replay(
      snapshot(controller(0, buttons(3))),
      snapshot(controller(0, buttons(3, 0))), // 0 down
      snapshot(controller(0, buttons(3, 0, 2))), // 0 still down, 2 fresh
    )
    expect(perFrame[2]).toEqual([{ controllerIndex: 0, buttonIndex: 2 }])
  })

  it('emits nothing for an empty snapshot', () => {
    const { perFrame } = replay(EMPTY_GAMEPAD_SNAPSHOT, EMPTY_GAMEPAD_SNAPSHOT)
    expect(perFrame).toEqual([[], []])
  })

  it('emits nothing for a zero-button controller, ever', () => {
    const { perFrame } = replay(
      snapshot(controller(0, [])),
      snapshot(controller(0, [])),
      snapshot(controller(0, [])),
    )
    expect(perFrame).toEqual([[], [], []])
  })
})

describe('connect and disconnect', () => {
  it('produces no input when a controller appears', () => {
    const { perFrame } = replay(
      snapshot(controller(0, buttons(2))),
      snapshot(controller(0, buttons(2)), controller(1, buttons(2, 0))), // 1 arrives held
    )
    expect(perFrame[1]).toEqual([])
  })

  it('produces no input when a controller disappears, and forgets its state', () => {
    const { perFrame, baseline } = replay(
      snapshot(controller(0, buttons(2, 0)), controller(1, buttons(2))),
      snapshot(controller(1, buttons(2))), // controller 0 unplugged mid-press
    )
    expect(perFrame[1]).toEqual([])
    expect(baseline?.pressedByController.has(0)).toBe(false)
  })

  /**
   * The dangerous case: a controller comes back at the SAME index with its button
   * still held. Without the "new controller is a baseline" rule this would look
   * exactly like a fresh press.
   */
  it('produces no input when a controller reconnects at the same index still held', () => {
    const { perFrame } = replay(
      snapshot(controller(0, buttons(2))), // baseline
      EMPTY_GAMEPAD_SNAPSHOT, // unplugged
      snapshot(controller(0, buttons(2, 0))), // back, button held
      snapshot(controller(0, buttons(2, 0))), // still held
    )
    expect(perFrame).toEqual([[], [], [], []])
  })

  it('produces no input when a controller reconnects at a DIFFERENT index', () => {
    const { perFrame } = replay(
      snapshot(controller(0, buttons(2))),
      EMPTY_GAMEPAD_SNAPSHOT,
      snapshot(controller(2, buttons(2, 1))), // same device, new locator, held
    )
    expect(perFrame).toEqual([[], [], []])
  })

  it('buzzes after a reconnect once the button is released and pressed', () => {
    const { perFrame } = replay(
      snapshot(controller(0, buttons(2))),
      EMPTY_GAMEPAD_SNAPSHOT,
      snapshot(controller(0, buttons(2, 0))), // back, held — silent
      snapshot(controller(0, buttons(2))), // released
      snapshot(controller(0, buttons(2, 0))), // fresh press
    )
    expect(perFrame[4]).toEqual([{ controllerIndex: 0, buttonIndex: 0 }])
  })

  it('re-baselines rather than comparing a controller whose button count changed', () => {
    const { perFrame } = replay(
      snapshot(controller(0, buttons(2))),
      snapshot(controller(0, buttons(8, 3))), // different shape AND a press
      snapshot(controller(0, buttons(8, 3))), // held
      snapshot(controller(0, buttons(8))), // released
      snapshot(controller(0, buttons(8, 3))), // fresh press, comparable now
    )
    expect(perFrame).toEqual([[], [], [], [], [{ controllerIndex: 0, buttonIndex: 3 }]])
  })
})

describe('several fresh edges in one poll', () => {
  it('orders them by ascending controller index, then ascending button index', () => {
    const { perFrame } = replay(
      snapshot(controller(0, buttons(4)), controller(1, buttons(4)), controller(2, buttons(4))),
      snapshot(
        controller(0, buttons(4, 3, 1)),
        controller(1, buttons(4, 0)),
        controller(2, buttons(4, 2)),
      ),
    )
    expect(perFrame[1]).toEqual([
      { controllerIndex: 0, buttonIndex: 1 },
      { controllerIndex: 0, buttonIndex: 3 },
      { controllerIndex: 1, buttonIndex: 0 },
      { controllerIndex: 2, buttonIndex: 2 },
    ])
  })

  it('does not depend on the order controllers arrived in the snapshot', () => {
    // The snapshot builder guarantees ascending order; this asserts the scanner
    // reflects that guarantee rather than re-deriving it from object iteration.
    const before = baselineOf([0, buttons(2)], [1, buttons(2)])
    const scan = scanGamepadEdges(
      before,
      snapshot(controller(0, buttons(2, 0)), controller(1, buttons(2, 0))),
    )
    expect(scan.edges.map((edge) => edge.controllerIndex)).toEqual([0, 1])
  })
})

describe('translating an edge into a logical action', () => {
  const mapping: GamepadMapping = {
    version: GAMEPAD_MAPPING_VERSION,
    bindings: [
      { controllerIndex: 0, buttonIndex: 2, teamId: 'red', action: PRIMARY_BUZZ },
      {
        controllerIndex: 1,
        buttonIndex: 0,
        teamId: 'blue',
        action: { kind: 'secondary', slot: 'secondary2' },
      },
    ],
  }
  const gate = { enabled: true, capturing: false }

  it('produces a gamepad-sourced signal carrying only a team, an action and evidence', () => {
    const result = translateGamepadEdge({ controllerIndex: 0, buttonIndex: 2 }, mapping, gate, AT)
    expect(result).toEqual({
      status: 'action',
      signal: { source: 'gamepad', action: PRIMARY_BUZZ, teamId: 'red', observedAt: AT },
    })
    // No controller index, no button index, no snapshot crosses.
    const serialized = JSON.stringify(result).toLowerCase()
    for (const forbidden of ['controllerindex', 'buttonindex', 'pressed', 'controller']) {
      expect(serialized, `must not contain ${forbidden}`).not.toContain(forbidden)
    }
  })

  it('carries a mapped secondary action through unchanged — the translator refuses it later', () => {
    const result = translateGamepadEdge({ controllerIndex: 1, buttonIndex: 0 }, mapping, gate, AT)
    expect(result.status === 'action' && result.signal.action).toEqual({
      kind: 'secondary',
      slot: 'secondary2',
    })
  })

  it('ignores an unmapped button', () => {
    expect(
      translateGamepadEdge({ controllerIndex: 0, buttonIndex: 5 }, mapping, gate, AT),
    ).toEqual({ status: 'ignored', reason: 'unmapped-button' })
  })

  it('ignores a button on a controller nothing is mapped to', () => {
    expect(
      translateGamepadEdge({ controllerIndex: 7, buttonIndex: 2 }, mapping, gate, AT),
    ).toEqual({ status: 'ignored', reason: 'unmapped-button' })
  })

  it('ignores everything while the adapter is switched off', () => {
    expect(
      translateGamepadEdge(
        { controllerIndex: 0, buttonIndex: 2 },
        mapping,
        { enabled: false, capturing: false },
        AT,
      ),
    ).toEqual({ status: 'ignored', reason: 'input-disabled' })
  })

  it('ignores everything while a button is being assigned', () => {
    expect(
      translateGamepadEdge(
        { controllerIndex: 0, buttonIndex: 2 },
        mapping,
        { enabled: true, capturing: true },
        AT,
      ),
    ).toEqual({ status: 'ignored', reason: 'capture-mode' })
  })

  it('refuses a malformed control even if a hand-built mapping contains one', () => {
    const hostile: GamepadMapping = {
      version: GAMEPAD_MAPPING_VERSION,
      bindings: [{ controllerIndex: -1, buttonIndex: 1.5, teamId: 'red', action: PRIMARY_BUZZ }],
    }
    expect(translateGamepadEdge({ controllerIndex: -1, buttonIndex: 1.5 }, hostile, gate, AT))
      .toEqual({ status: 'ignored', reason: 'unmapped-button' })
  })

  it('has host-facing copy for every ignore reason, naming no device', () => {
    for (const reason of GAMEPAD_IGNORE_REASONS) {
      expect(GAMEPAD_IGNORE_MESSAGE[reason].length).toBeGreaterThan(0)
    }
    const copy = Object.values(GAMEPAD_IGNORE_MESSAGE).join(' ').toLowerCase()
    for (const forbidden of ['sony', 'playstation', 'handset', 'vendor', 'webhid', 'usb']) {
      expect(copy, `must not contain ${forbidden}`).not.toContain(forbidden)
    }
  })
})

describe('the clock', () => {
  /**
   * ADR-007 §1: a clock is read at the dispatch edge and the presentation edge,
   * and nowhere else. This module is neither, so it takes `observedAt` as a
   * parameter and reads nothing.
   */
  it('is never read in this module — the stamp is a parameter', () => {
    const result = translateGamepadEdge(
      { controllerIndex: 0, buttonIndex: 0 },
      {
        version: GAMEPAD_MAPPING_VERSION,
        bindings: [{ controllerIndex: 0, buttonIndex: 0, teamId: 'red', action: PRIMARY_BUZZ }],
      },
      { enabled: true, capturing: false },
      42,
    )
    expect(result.status === 'action' && result.signal.observedAt).toBe(42)
    // The scanner takes no stamp at all: an edge is a fact about button state.
    expect(Object.keys(scanGamepadEdges(null, EMPTY_GAMEPAD_SNAPSHOT))).toEqual([
      'baseline',
      'edges',
    ])
  })
})
