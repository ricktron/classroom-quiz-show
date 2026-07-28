import { describe, expect, it } from 'vitest'
import {
  browserGamepadSource,
  controllerLabel,
  EMPTY_GAMEPAD_SNAPSHOT,
  GAMEPAD_READ_STATUSES,
  isGamepadApiAvailable,
  isGamepadButtonIndex,
  isGamepadControllerIndex,
  MAX_GAMEPAD_BUTTON_INDEX,
  MAX_GAMEPAD_CONTROLLER_INDEX,
  MAX_GAMEPAD_CONTROLLERS,
  MAX_GAMEPAD_REPORTED_ID_LENGTH,
  readReportedId,
  readReportedMapping,
  snapshotFromRawGamepads,
  UNAVAILABLE_GAMEPAD_REPORTED_ID,
  UNAVAILABLE_GAMEPAD_REPORTED_MAPPING,
} from './gamepadSource'
import { rawPad } from '../test/gamepadFixtures'

/**
 * The browser Gamepad BOUNDARY (Slices 9–10).
 *
 * The claims proved here:
 *  - a browser return value is treated as UNTRUSTED input, exactly as a pasted
 *    game file is: every malformed shape fails closed to "fewer controllers",
 *    never to a repaired one and never to a throw;
 *  - the documented `null` holes in `getGamepads()` are handled, and they are the
 *    normal disconnect representation rather than an error;
 *  - a snapshot carries a controller index, pressed booleans, and bounded
 *    host-private `reportedId` / `reportedMapping` observations — never browser
 *    object fields such as axes, analog value, timestamp, or vibration;
 *  - indices and button counts are bounded, so a hostile value cannot produce an
 *    unbounded loop;
 *  - an absent API and a throwing API are two different, typed, host-visible
 *    outcomes, and neither of them can produce a press.
 *
 * Identity observations are host-private setup evidence only — not gameplay
 * identity, not persisted, and never projected downstream.
 */

const UNAVAILABLE = {
  reportedId: UNAVAILABLE_GAMEPAD_REPORTED_ID,
  reportedMapping: UNAVAILABLE_GAMEPAD_REPORTED_MAPPING,
} as const

const FORBIDDEN_BROWSER_SNAPSHOT_KEYS = ['axes', 'timestamp', 'vibration', 'touched'] as const

function expectNoBrowserFieldKeys(controller: Record<string, unknown>) {
  for (const key of FORBIDDEN_BROWSER_SNAPSHOT_KEYS) {
    expect(controller, `must not expose browser field ${key}`).not.toHaveProperty(key)
  }
}

describe('bounded index vocabulary', () => {
  it('accepts non-negative bounded integers and nothing else', () => {
    for (const value of [0, 1, MAX_GAMEPAD_CONTROLLER_INDEX]) {
      expect(isGamepadControllerIndex(value), String(value)).toBe(true)
    }
    for (const value of [
      -1,
      1.5,
      MAX_GAMEPAD_CONTROLLER_INDEX + 1,
      Number.NaN,
      Number.POSITIVE_INFINITY,
      '0',
      null,
      undefined,
      {},
    ]) {
      expect(isGamepadControllerIndex(value), JSON.stringify(value) ?? 'undefined').toBe(false)
    }
  })

  it('bounds button indices the same way', () => {
    expect(isGamepadButtonIndex(0)).toBe(true)
    expect(isGamepadButtonIndex(MAX_GAMEPAD_BUTTON_INDEX)).toBe(true)
    expect(isGamepadButtonIndex(MAX_GAMEPAD_BUTTON_INDEX + 1)).toBe(false)
    expect(isGamepadButtonIndex(-1)).toBe(false)
    expect(isGamepadButtonIndex('3')).toBe(false)
  })
})

describe('reading a raw gamepad list', () => {
  it('reads a well-formed controller into bounded facts', () => {
    const result = snapshotFromRawGamepads([
      rawPad({ index: 0, buttons: [{ pressed: true }, { pressed: false }] }),
    ])
    expect(result).toEqual({
      controllers: [{ controllerIndex: 0, pressed: [true, false], ...UNAVAILABLE }],
    })
  })

  /**
   * The documented shape of a disconnect. `getGamepads()` leaves a `null` hole so
   * the remaining gamepads keep their index — a browser fact, not an error.
   */
  it('skips the null holes a disconnect leaves behind', () => {
    const result = snapshotFromRawGamepads([
      null,
      rawPad({ index: 1, buttons: [{ pressed: true }] }),
      null,
      null,
    ])
    expect(result.controllers).toEqual([{ controllerIndex: 1, pressed: [true], ...UNAVAILABLE }])
  })

  it('reads the all-null list a browser with no controller returns', () => {
    // Exactly what Chromium 141 returns on a machine with nothing attached.
    expect(snapshotFromRawGamepads([null, null, null, null])).toBe(EMPTY_GAMEPAD_SNAPSHOT)
  })

  it('fails closed on anything that is not a list', () => {
    for (const raw of [null, undefined, 42, 'gamepads', true, { length: -1 }, { length: 1.5 }]) {
      expect(snapshotFromRawGamepads(raw).controllers, JSON.stringify(raw) ?? 'undefined').toEqual(
        [],
      )
    }
  })

  it('reads an array-LIKE, because the API is not guaranteed to hand back an Array', () => {
    const arrayLike = { length: 1, 0: rawPad({ index: 2, buttons: [{ pressed: true }] }) }
    expect(snapshotFromRawGamepads(arrayLike).controllers).toEqual([
      { controllerIndex: 2, pressed: [true], ...UNAVAILABLE },
    ])
  })

  it('requires a controller to claim it is connected', () => {
    for (const connected of [false, undefined, 'true', 1, null]) {
      const result = snapshotFromRawGamepads([rawPad({ connected })])
      expect(result.controllers, JSON.stringify(connected) ?? 'undefined').toEqual([])
    }
  })

  /**
   * A locator is never guessed. Renumbering a malformed index onto its array
   * position is exactly how a press ends up attributed to the wrong team.
   */
  it('drops a controller whose index is malformed rather than renumbering it', () => {
    for (const index of [-1, 1.5, MAX_GAMEPAD_CONTROLLER_INDEX + 1, '0', null, undefined]) {
      const result = snapshotFromRawGamepads([rawPad({ index })])
      expect(result.controllers, JSON.stringify(index) ?? 'undefined').toEqual([])
    }
  })

  it('keeps the first of two entries claiming the same index', () => {
    const result = snapshotFromRawGamepads([
      rawPad({ index: 0, buttons: [{ pressed: true }] }),
      rawPad({ index: 0, buttons: [{ pressed: false }, { pressed: false }] }),
    ])
    expect(result.controllers).toEqual([{ controllerIndex: 0, pressed: [true], ...UNAVAILABLE }])
  })

  it('orders controllers by ascending index whatever order they arrived in', () => {
    const result = snapshotFromRawGamepads([
      rawPad({ index: 3, buttons: [] }),
      rawPad({ index: 1, buttons: [] }),
      rawPad({ index: 2, buttons: [] }),
    ])
    expect(result.controllers.map((entry) => entry.controllerIndex)).toEqual([1, 2, 3])
  })

  it('represents a zero-button controller rather than dropping it', () => {
    const result = snapshotFromRawGamepads([rawPad({ buttons: [] })])
    // It is visible in diagnostics, and nothing on it can ever be mapped.
    expect(result.controllers).toEqual([{ controllerIndex: 0, pressed: [], ...UNAVAILABLE }])
  })

  it('reads a malformed buttons list as zero buttons', () => {
    for (const bad of [null, undefined, 42, 'buttons', { length: -1 }]) {
      const result = snapshotFromRawGamepads([rawPad({ buttons: bad })])
      expect(result.controllers[0]?.pressed, JSON.stringify(bad) ?? 'undefined').toEqual([])
    }
  })

  /**
   * `pressed` is the one fact this whole slice turns on, so it is read strictly.
   * A truthy value that is not exactly `true` is NOT a press.
   */
  it('treats only an exact `pressed: true` as pressed', () => {
    const result = snapshotFromRawGamepads([
      rawPad({
        buttons: [
          { pressed: true },
          { pressed: 1 },
          { pressed: 'true' },
          { pressed: {} },
          {},
          null,
          'button',
        ],
      }),
    ])
    expect(result.controllers[0]?.pressed).toEqual([
      true,
      false,
      false,
      false,
      false,
      false,
      false,
    ])
  })

  it('truncates an absurd button list rather than looping over it', () => {
    const huge = Array.from({ length: 5_000 }, () => ({ pressed: false }))
    const result = snapshotFromRawGamepads([rawPad({ buttons: huge })])
    expect(result.controllers[0]?.pressed).toHaveLength(MAX_GAMEPAD_BUTTON_INDEX + 1)
  })

  it('caps the number of controllers, keeping the lowest indices', () => {
    const many = Array.from({ length: MAX_GAMEPAD_CONTROLLER_INDEX + 1 }, (_unused, index) =>
      rawPad({ index, buttons: [] }),
    )
    const result = snapshotFromRawGamepads(many)
    expect(result.controllers).toHaveLength(MAX_GAMEPAD_CONTROLLERS)
    expect(result.controllers[0]?.controllerIndex).toBe(0)
  })

  it('freezes the snapshot so nothing downstream can mutate what it was given', () => {
    const result = snapshotFromRawGamepads([rawPad()])
    expect(Object.isFrozen(result)).toBe(true)
    expect(Object.isFrozen(result.controllers)).toBe(true)
    expect(Object.isFrozen(result.controllers[0])).toBe(true)
  })
})

describe('bounded host-private identity observations (Slice 10)', () => {
  it('observes a well-formed reported id and mapping token', () => {
    const result = snapshotFromRawGamepads([
      rawPad({
        id: 'Vendor: 054c Product: 0002',
        mapping: 'standard',
        buttons: [{ pressed: false }],
      }),
    ])
    expect(result.controllers[0]?.reportedId).toEqual({
      status: 'available',
      value: 'Vendor: 054c Product: 0002',
    })
    expect(result.controllers[0]?.reportedMapping).toEqual({
      status: 'available',
      value: 'standard',
    })
  })

  it('accepts every WebIDL mapping token', () => {
    for (const mapping of ['', 'standard', 'xr-standard'] as const) {
      expect(readReportedMapping(mapping)).toEqual({ status: 'available', value: mapping })
    }
  })

  it('marks malformed, empty, oversized, and non-string ids unavailable', () => {
    expect(readReportedId(null)).toBe(UNAVAILABLE_GAMEPAD_REPORTED_ID)
    expect(readReportedId(undefined)).toBe(UNAVAILABLE_GAMEPAD_REPORTED_ID)
    expect(readReportedId(42)).toBe(UNAVAILABLE_GAMEPAD_REPORTED_ID)
    expect(readReportedId('')).toBe(UNAVAILABLE_GAMEPAD_REPORTED_ID)
    expect(readReportedId('x'.repeat(MAX_GAMEPAD_REPORTED_ID_LENGTH + 1))).toBe(
      UNAVAILABLE_GAMEPAD_REPORTED_ID,
    )
  })

  it('marks unknown mapping tokens unavailable without coercion', () => {
    for (const mapping of ['standard ', 'STANDARD', 'custom', 'xr', null, 0]) {
      expect(readReportedMapping(mapping), JSON.stringify(mapping) ?? 'undefined').toBe(
        UNAVAILABLE_GAMEPAD_REPORTED_MAPPING,
      )
    }
  })

  it('defaults identity to unavailable when rawPad carries no id or mapping', () => {
    const result = snapshotFromRawGamepads([rawPad({ buttons: [{ pressed: true }] })])
    expect(result.controllers[0]).toMatchObject(UNAVAILABLE)
  })

  /**
   * Browser object fields stay out of the snapshot. Host-private observations use
   * their own bounded field names — never raw `id` / `mapping` keys.
   */
  it('carries host-private identity without leaking browser object fields', () => {
    const result = snapshotFromRawGamepads([
      rawPad({
        id: 'Some Vendor Some Product (STANDARD GAMEPAD Vendor: 054c Product: 0002)',
        mapping: 'standard',
        axes: [0.5, -0.25],
        timestamp: 12345.678,
        vibrationActuator: {},
        buttons: [{ pressed: true, touched: true, value: 1 }],
      }),
    ])
    const controller = result.controllers[0] as unknown as Record<string, unknown>
    expectNoBrowserFieldKeys(controller)
    expect(controller).not.toHaveProperty('id')
    expect(controller).not.toHaveProperty('mapping')
    expect(result.controllers[0]?.reportedId.status).toBe('available')
    expect(result.controllers[0]?.reportedMapping.status).toBe('available')
    expect(result.controllers[0]?.pressed).toEqual([true])
  })

  it('never exposes browser field keys anywhere in the serialized snapshot', () => {
    const serialized = JSON.stringify(
      snapshotFromRawGamepads([
        rawPad({
          id: 'Vendor: 054c Product: 0002',
          mapping: 'standard',
          axes: [1],
          timestamp: 9,
          vibrationActuator: {},
          buttons: [{ pressed: false, touched: true, value: 0.5 }],
        }),
      ]),
    ).toLowerCase()
    for (const forbidden of FORBIDDEN_BROWSER_SNAPSHOT_KEYS) {
      expect(serialized, `serialized snapshot must not contain ${forbidden}`).not.toContain(
        `"${forbidden}"`,
      )
    }
    expect(serialized).toContain('reportedid')
    expect(serialized).toContain('reportedmapping')
  })
})

describe('the production source', () => {
  it('reports `unsupported` when the browser has no Gamepad API', () => {
    const source = browserGamepadSource({} as Navigator)
    expect(source.read()).toEqual({ status: 'unsupported' })
    expect(isGamepadApiAvailable({} as Navigator)).toBe(false)
  })

  it('reports `unsupported` when there is no navigator at all', () => {
    expect(browserGamepadSource(null).read()).toEqual({ status: 'unsupported' })
    expect(isGamepadApiAvailable(null)).toBe(false)
  })

  it('contains a throwing API as a typed `unreadable`, never as an exception', () => {
    const hostile = {
      getGamepads() {
        throw new Error('permissions policy')
      },
    } as unknown as Navigator
    expect(() => browserGamepadSource(hostile).read()).not.toThrow()
    expect(browserGamepadSource(hostile).read()).toEqual({ status: 'unreadable' })
  })

  it('reads a supported API through the same untrusted guard', () => {
    const fake = {
      getGamepads: () => [null, rawPad({ index: 1, buttons: [{ pressed: true }] })],
    } as unknown as Navigator
    expect(browserGamepadSource(fake).read()).toEqual({
      status: 'ok',
      snapshot: { controllers: [{ controllerIndex: 1, pressed: [true], ...UNAVAILABLE }] },
    })
    expect(isGamepadApiAvailable(fake)).toBe(true)
  })

  /**
   * Some implementations refuse a detached `getGamepads`, so the call must keep
   * `navigator` as its receiver. Proved by reading a field only the real
   * navigator object carries.
   */
  it('calls the API with the navigator as its receiver', () => {
    const fake = {
      marker: 'the navigator',
      getGamepads() {
        seen = (this as { marker?: string }).marker ?? null
        return []
      },
    } as unknown as Navigator
    let seen: string | null = null
    browserGamepadSource(fake).read()
    expect(seen).toBe('the navigator')
  })

  it('has exactly three read outcomes', () => {
    expect(GAMEPAD_READ_STATUSES).toEqual(['ok', 'unsupported', 'unreadable'])
  })
})

describe('neutral controller labels', () => {
  it('numbers controllers from one and names no device', () => {
    expect(controllerLabel(0)).toBe('Controller 1')
    expect(controllerLabel(3)).toBe('Controller 4')
    const labels = [0, 1, 2, 3].map(controllerLabel).join(' ').toLowerCase()
    for (const forbidden of ['sony', 'playstation', 'buzz', 'handset', 'vendor', 'usb']) {
      expect(labels, `must not contain ${forbidden}`).not.toContain(forbidden)
    }
  })
})
