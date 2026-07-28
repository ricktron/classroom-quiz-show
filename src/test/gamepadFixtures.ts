import type { GamepadPollScheduler } from '../host/useGamepadBuzzInput'
import type {
  GamepadControllerSnapshot,
  GamepadRead,
  GamepadReportedId,
  GamepadReportedMapping,
  GamepadSnapshot,
  GamepadSource,
} from '../input/gamepadSource'
import {
  UNAVAILABLE_GAMEPAD_REPORTED_ID,
  UNAVAILABLE_GAMEPAD_REPORTED_MAPPING,
} from '../input/gamepadSource'

/**
 * Shared FAKE Gamepad source and poll driver (Slices 9–10).
 *
 * The point of this file is that **no test in this repository needs a physical
 * controller, a real browser or a real animation frame.** Every rising-edge,
 * connect/disconnect, held-button, re-prime, multi-edge, identity and profile
 * claim is proved by handing the adapter a scripted sequence of snapshots and
 * stepping the poll driver by hand.
 *
 * These build plain data on purpose — exactly as the Slice 4/5/6 fixtures build
 * untrusted plain objects — so the real `snapshotFromRawGamepads` guard, the real
 * adapter and the real hook are the things under test.
 */

export function reportedId(value: string): GamepadReportedId {
  return { status: 'available', value }
}

export function reportedMapping(
  value: '' | 'standard' | 'xr-standard',
): GamepadReportedMapping {
  return { status: 'available', value }
}

/** A controller's pressed states, as the adapter's snapshot model sees them. */
export function controller(
  controllerIndex: number,
  pressed: readonly boolean[],
  identity: {
    readonly reportedId?: GamepadReportedId
    readonly reportedMapping?: GamepadReportedMapping
  } = {},
): GamepadControllerSnapshot {
  return {
    controllerIndex,
    pressed,
    reportedId: identity.reportedId ?? UNAVAILABLE_GAMEPAD_REPORTED_ID,
    reportedMapping: identity.reportedMapping ?? UNAVAILABLE_GAMEPAD_REPORTED_MAPPING,
  }
}

/** A snapshot from a list of controllers. Already in ascending index order. */
export function snapshot(...controllers: GamepadControllerSnapshot[]): GamepadSnapshot {
  return { controllers }
}

/** `count` buttons, with the ones named in `down` pressed. */
export function buttons(count: number, ...down: number[]): readonly boolean[] {
  const set = new Set(down)
  return Array.from({ length: count }, (_unused, index) => set.has(index))
}

/**
 * A RAW browser-shaped gamepad entry, for testing the boundary guard itself.
 *
 * Deliberately loose (`Record<string, unknown>`) so a test can hand the guard a
 * malformed index, a missing `connected`, a non-object button — the shapes a real
 * browser, a shim or a defect can actually produce.
 */
export function rawPad(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    index: 0,
    connected: true,
    buttons: [{ pressed: false }, { pressed: false }],
    ...overrides,
  }
}

export interface FakeGamepadSource extends GamepadSource {
  /** Make the next reads return this snapshot. */
  set(next: GamepadSnapshot): void
  /** Make the next reads report a typed failure instead of a snapshot. */
  fail(status: 'unsupported' | 'unreadable'): void
  /** How many times `read` has been called. */
  reads(): number
}

/** A source a test scripts by hand. Starts with no controllers attached. */
export function fakeGamepadSource(initial?: GamepadSnapshot): FakeGamepadSource {
  let result: GamepadRead = { status: 'ok', snapshot: initial ?? { controllers: [] } }
  let count = 0
  return {
    read() {
      count += 1
      return result
    },
    set(next) {
      result = { status: 'ok', snapshot: next }
    },
    fail(status) {
      result = { status }
    },
    reads: () => count,
  }
}

/** A source whose `read` throws, to prove the hook contains an exception. */
export function throwingGamepadSource(): GamepadSource {
  return {
    read() {
      throw new Error('source exploded')
    },
  }
}

export interface FakePollDriver extends GamepadPollScheduler {
  /** Run one poll. Throws if the loop is not running — that is the assertion. */
  poll(): void
  /** Is a loop currently registered? */
  running(): boolean
  /** How many loops have ever been started. Proves no duplicate registration. */
  starts(): number
}

/**
 * A poll scheduler a test steps by hand.
 *
 * `start` records the tick and returns a stop function; `poll()` runs one
 * iteration. Nothing is timed, so every polling test is exact and instant.
 */
export function fakePollDriver(): FakePollDriver {
  let tick: (() => void) | null = null
  let starts = 0
  return {
    start(next) {
      starts += 1
      tick = next
      return () => {
        tick = null
      }
    },
    poll() {
      if (tick === null) throw new Error('poll driver is not running')
      tick()
    },
    running: () => tick !== null,
    starts: () => starts,
  }
}
