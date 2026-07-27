/**
 * The browser Gamepad BOUNDARY (Slice 9).
 *
 * This module is the only place in the application that may touch
 * `navigator.getGamepads()`, a browser `Gamepad`, or a browser `GamepadButton`.
 * Everything above it sees {@link GamepadSnapshot} — a plain, frozen, bounded
 * data value with no browser object in it at all.
 *
 * ## Why a snapshot rather than the browser objects
 *
 * The browser hands back live-ish, implementation-owned objects, and passing them
 * around would make three bad things possible at once: application code could
 * read `id`, `mapping`, `axes` or `vibrationActuator` and start depending on a
 * device model; a value could change under a caller between two reads; and a test
 * would have to fabricate a `Gamepad`. A snapshot removes all three. What crosses
 * is a controller index and a list of pressed/not-pressed booleans, and **nothing
 * else is representable**.
 *
 * Deliberately absent from the snapshot, permanently: `id`, `mapping`, `axes`,
 * analog `value`, `touched`, `timestamp`, `vibrationActuator`, vendor id, product
 * id. Slice 9 maps BUTTONS, and a button is pressed or it is not.
 *
 * ## The browser contract this is written against
 *
 * Verified directly against the WebIDL that ships with TypeScript 5.9's
 * `lib.dom.d.ts`, and against the Chromium build this repository tests with,
 * rather than from memory:
 *
 * - `navigator.getGamepads(): (Gamepad | null)[]` — **entries may be `null`**.
 *   A disconnect leaves a `null` hole so the remaining gamepads keep their index.
 *   Observed in Chromium 141 with no controller attached: a length-4 array of four
 *   `null`s, and a NEW array object on every call.
 * - `Gamepad.buttons: ReadonlyArray<GamepadButton>`; `GamepadButton.pressed:
 *   boolean`.
 * - `Gamepad.index: number` — "auto-incremented to be unique for each device
 *   currently connected". Session-local, not a durable identity (see ADR-009 §8).
 * - `'ongamepadconnected' in window` was **false** in that Chromium build even
 *   though `navigator.getGamepads` was a function, so support is feature-detected
 *   on `getGamepads` alone and never on the event handler property.
 *
 * ## Total, never throwing
 *
 * {@link GamepadSource.read} returns a discriminated result instead of throwing.
 * A browser without the API, a browser that throws on the call, and a browser
 * that returns something malformed are three DIFFERENT, typed, host-visible
 * outcomes — and none of them can produce a buzz.
 */

/**
 * Highest browser controller index this build will look at.
 *
 * `Gamepad.index` is auto-incremented and is not bounded by the array length, so
 * it needs its own bound. Sixteen is far beyond any classroom (the largest team
 * count is 8) and keeps every index a small, printable, bounded integer.
 */
export const MAX_GAMEPAD_CONTROLLER_INDEX = 15

/**
 * Highest button index this build will look at.
 *
 * The standard mapping defines 17 buttons; generic controllers report more. Bound
 * it at 32 so a malformed or hostile `buttons` array produces a clean truncation
 * rather than an unbounded loop, while leaving every real generic controller's
 * buttons reachable.
 */
export const MAX_GAMEPAD_BUTTON_INDEX = 31

/** Most controllers this build will track at once. Bounded for the same reason. */
export const MAX_GAMEPAD_CONTROLLERS = 8

/** Is this a browser controller index this build is willing to handle? */
export function isGamepadControllerIndex(value: unknown): value is number {
  return (
    typeof value === 'number' &&
    Number.isInteger(value) &&
    value >= 0 &&
    value <= MAX_GAMEPAD_CONTROLLER_INDEX
  )
}

/** Is this a button index this build is willing to handle? */
export function isGamepadButtonIndex(value: unknown): value is number {
  return (
    typeof value === 'number' &&
    Number.isInteger(value) &&
    value >= 0 &&
    value <= MAX_GAMEPAD_BUTTON_INDEX
  )
}

/**
 * One connected controller, as bounded facts.
 *
 * `pressed[i]` is the state of button `i`. Its length IS the button count — a
 * zero-button controller is a legal, representable value and simply has nothing
 * that can ever be mapped.
 */
export interface GamepadControllerSnapshot {
  /** Browser-session locator. NOT a durable identity — see ADR-009 §8. */
  readonly controllerIndex: number
  readonly pressed: readonly boolean[]
}

/** Every controller visible in one read, ordered by ascending controller index. */
export interface GamepadSnapshot {
  readonly controllers: readonly GamepadControllerSnapshot[]
}

export const EMPTY_GAMEPAD_SNAPSHOT: GamepadSnapshot = Object.freeze({
  controllers: Object.freeze([]) as readonly GamepadControllerSnapshot[],
})

/** Every way a read can turn out. Bounded and typed, never an exception. */
export const GAMEPAD_READ_STATUSES = ['ok', 'unsupported', 'unreadable'] as const

export type GamepadReadStatus = (typeof GAMEPAD_READ_STATUSES)[number]

export type GamepadRead =
  | { readonly status: 'ok'; readonly snapshot: GamepadSnapshot }
  /** The browser does not offer the Gamepad API at all. */
  | { readonly status: 'unsupported' }
  /** The API exists but the read threw. Host-private, and it buzzes nothing. */
  | { readonly status: 'unreadable' }

/**
 * The injectable seam.
 *
 * Production reads the browser. Every unit test injects a fake, so not one test
 * in this repository needs a real browser or a physical controller.
 */
export interface GamepadSource {
  read(): GamepadRead
}

/**
 * Build a snapshot from whatever the browser handed back.
 *
 * PURE and total: it is given `unknown` on purpose, because a browser's return
 * value is untrusted input exactly like a pasted game file is (ADR-004). Every
 * malformed shape resolves to "fewer controllers", never to a repaired one and
 * never to a throw:
 *
 * - a `null` hole (the documented disconnect representation) is skipped;
 * - a non-object entry is skipped;
 * - `connected !== true` is skipped — a controller must claim to be connected;
 * - an out-of-range or non-integer `index` is skipped rather than renumbered,
 *   because guessing a locator is how a press ends up attributed to the wrong
 *   team;
 * - a duplicate index keeps the FIRST entry and drops the rest;
 * - a missing or malformed `buttons` list becomes zero buttons;
 * - a button entry that is not an object, or whose `pressed` is not exactly
 *   `true`, reads as not pressed;
 * - buttons past {@link MAX_GAMEPAD_BUTTON_INDEX} are truncated;
 * - controllers past {@link MAX_GAMEPAD_CONTROLLERS} are dropped, lowest index
 *   first being the ones kept.
 *
 * The result is frozen, so nothing downstream can mutate a snapshot it was given.
 */
export function snapshotFromRawGamepads(raw: unknown): GamepadSnapshot {
  const entries = readArrayLike(raw)
  if (entries === null) return EMPTY_GAMEPAD_SNAPSHOT

  const byIndex = new Map<number, GamepadControllerSnapshot>()
  for (const entry of entries) {
    if (typeof entry !== 'object' || entry === null) continue
    const pad = entry as Record<string, unknown>
    if (pad.connected !== true) continue
    if (!isGamepadControllerIndex(pad.index)) continue
    if (byIndex.has(pad.index)) continue
    byIndex.set(pad.index, {
      controllerIndex: pad.index,
      pressed: Object.freeze(readPressedStates(pad.buttons)),
    })
  }

  const controllers = [...byIndex.values()]
    .sort((left, right) => left.controllerIndex - right.controllerIndex)
    .slice(0, MAX_GAMEPAD_CONTROLLERS)
    .map((controller) => Object.freeze(controller))

  if (controllers.length === 0) return EMPTY_GAMEPAD_SNAPSHOT
  return Object.freeze({ controllers: Object.freeze(controllers) })
}

/**
 * Read an array-like of unknown provenance without trusting it to be an `Array`.
 *
 * The spec says `getGamepads()` returns an array; a shimmed or unusual host might
 * return an array-LIKE. Both are handled, and anything else fails closed.
 */
function readArrayLike(raw: unknown): readonly unknown[] | null {
  if (Array.isArray(raw)) return raw
  if (typeof raw !== 'object' || raw === null) return null
  const length = (raw as { length?: unknown }).length
  if (typeof length !== 'number' || !Number.isInteger(length) || length < 0) return null
  const bounded = Math.min(length, MAX_GAMEPAD_CONTROLLER_INDEX + 1)
  const values: unknown[] = []
  for (let index = 0; index < bounded; index += 1) {
    values.push((raw as Record<number, unknown>)[index])
  }
  return values
}

/** Bounded pressed/not-pressed booleans from an untrusted `buttons` value. */
function readPressedStates(raw: unknown): boolean[] {
  const buttons = readArrayLike(raw)
  if (buttons === null) return []
  const bounded = Math.min(buttons.length, MAX_GAMEPAD_BUTTON_INDEX + 1)
  const pressed: boolean[] = []
  for (let index = 0; index < bounded; index += 1) {
    const button = buttons[index]
    // Only an explicit `true` counts. `1`, `'true'` and a truthy object do not:
    // a press is the one fact this whole slice turns on, so it is read strictly.
    pressed.push(
      typeof button === 'object' &&
        button !== null &&
        (button as { pressed?: unknown }).pressed === true,
    )
  }
  return pressed
}

/**
 * The production source: this browser's Gamepad API.
 *
 * Support is detected on `navigator.getGamepads` being callable, and on nothing
 * else — the Chromium build this repository tests with exposes `getGamepads`
 * while `'ongamepadconnected' in window` is `false`, so the handler property is
 * not a usable signal.
 *
 * A throw from the call is caught and reported as `unreadable`. The call is made
 * with `navigator` as the receiver, because some implementations require it.
 */
export function browserGamepadSource(
  navigatorLike: Navigator | null = typeof navigator === 'undefined' ? null : navigator,
): GamepadSource {
  return {
    read(): GamepadRead {
      if (navigatorLike === null) return { status: 'unsupported' }
      const getGamepads = (navigatorLike as { getGamepads?: unknown }).getGamepads
      if (typeof getGamepads !== 'function') return { status: 'unsupported' }
      let raw: unknown
      try {
        raw = (getGamepads as () => unknown).call(navigatorLike)
      } catch {
        // A permissions-policy refusal, a detached document, a hostile shim — all
        // the same answer: the host is told, and nothing buzzes.
        return { status: 'unreadable' }
      }
      return { status: 'ok', snapshot: snapshotFromRawGamepads(raw) }
    },
  }
}

/** Is the browser Gamepad API available at all? Host diagnostics only. */
export function isGamepadApiAvailable(
  navigatorLike: Navigator | null = typeof navigator === 'undefined' ? null : navigator,
): boolean {
  if (navigatorLike === null) return false
  return typeof (navigatorLike as { getGamepads?: unknown }).getGamepads === 'function'
}

/**
 * A neutral, session-local label for a controller.
 *
 * One-based so it reads like a classroom ("Controller 1"), and deliberately
 * NEUTRAL: never the browser-reported `id`, never a vendor, never a model, never
 * a colour. The browser's `id` string is device-identifying free text and is not
 * read anywhere in this application.
 */
export function controllerLabel(controllerIndex: number): string {
  return `Controller ${controllerIndex + 1}`
}
