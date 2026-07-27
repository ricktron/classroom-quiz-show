/**
 * Browser key semantics for the keyboard adapter (Slice 8).
 *
 * ## `KeyboardEvent.code`, deliberately — not `key`
 *
 * A binding names a **physical key position** (`code`), never the character it
 * produces (`key`). Three classroom reasons, all of which `key` fails:
 *
 * 1. **Layout independence.** On an AZERTY or Dvorak machine the key labelled
 *    `1` still reports `code: 'Digit1'`, so a mapping made on one laptop still
 *    means the same physical key on another. With `key` the same press is `'&'`
 *    on AZERTY, and four teams silently lose their buzzers.
 * 2. **Modifier independence.** `key` changes when Shift is held (`'1'` → `'!'`)
 *    and can become dead-key or IME output; `code` does not move. A team leaning
 *    on Shift must not stop being able to buzz.
 * 3. **A bounded, checkable grammar.** `code` values are a small, stable,
 *    ASCII-only vocabulary (`KeyA`, `Digit1`, `Numpad1`, `BracketLeft`), so a
 *    persisted mapping can be validated against a pattern rather than trusted.
 *    `key` is an open set that includes every printable character in every
 *    script.
 *
 * The cost is stated plainly: `code` describes a position, so a host reading a
 * stored mapping sees `Digit1` rather than whatever is printed on the physical
 * keycap. The host UI therefore renders a friendly label
 * ({@link describeKeyCode}) and captures bindings by asking the teacher to press
 * the key, so nobody has to know the vocabulary.
 *
 * ## Reserved keys
 *
 * A small set of keys is refused outright, because binding them would break the
 * host surface itself rather than merely being a poor choice. This is a
 * validation rule, not a preference: the mapping editor rejects them, and the
 * adapter refuses to act on them even if a hand-edited stored mapping contains
 * one.
 */

/**
 * Grammar for an accepted `KeyboardEvent.code`.
 *
 * **Uppercase-led, alphanumeric, at least two characters, bounded length.** That
 * shape accepts every physical-key code the adapter can usefully bind (`KeyQ`,
 * `Digit4`, `Numpad7`, `F9`, `Backquote`) and rejects the empty string,
 * punctuation, whitespace, and anything a hand-edited or corrupted stored mapping
 * might contain.
 *
 * The two-character, uppercase-led rule is doing specific work: it is exactly
 * what a `KeyboardEvent.key` VALUE fails. `key` for those same presses is `'q'`,
 * `'Q'`, `'1'` or `'&'` — one character, or not a letter at all — so a mapping
 * written against `key` by mistake cannot be stored and then silently half-work
 * on one layout. A test asserts that directly.
 */
export const KEY_CODE_PATTERN = /^[A-Z][A-Za-z0-9]{1,31}$/

/** Browsers report this when they cannot identify the physical key. Never bindable. */
export const UNIDENTIFIED_KEY_CODE = 'Unidentified'

/**
 * Keys a binding may never claim.
 *
 * Each is reserved because it already has a job on the host surface, and taking
 * it away would make ordinary operation unsafe or the page unusable:
 *
 * | Code | Why it is reserved |
 * | --- | --- |
 * | `Tab` | moves focus — the only way to operate the host without a mouse |
 * | `Enter`, `NumpadEnter` | activates the focused control |
 * | `Space` | activates the focused button, and scrolls |
 * | `Escape` | cancels key capture and closes browser UI |
 * | `F5` | reloads the page |
 *
 * Modifier keys are reserved for a different reason: alone they produce no
 * usable press, and in combination they are a chord the adapter ignores.
 */
export const RESERVED_KEY_CODES: readonly string[] = [
  'Tab',
  'Enter',
  'NumpadEnter',
  'Space',
  'Escape',
  'F5',
  'ShiftLeft',
  'ShiftRight',
  'ControlLeft',
  'ControlRight',
  'AltLeft',
  'AltRight',
  'MetaLeft',
  'MetaRight',
  'CapsLock',
]

const RESERVED_SET: ReadonlySet<string> = new Set(RESERVED_KEY_CODES)

/** Is this code reserved for host operation? */
export function isReservedKeyCode(code: string): boolean {
  return RESERVED_SET.has(code)
}

/**
 * Is this a code the adapter can bind at all?
 *
 * Shape only — reservation is a separate question, so the mapping validator can
 * report "unsupported" and "reserved" as two different, actionable issues rather
 * than one vague refusal.
 */
export function isSupportedKeyCode(value: unknown): value is string {
  return (
    typeof value === 'string' && value !== UNIDENTIFIED_KEY_CODE && KEY_CODE_PATTERN.test(value)
  )
}

/** A code that is both well-formed and not reserved. */
export function isBindableKeyCode(value: unknown): value is string {
  return isSupportedKeyCode(value) && !isReservedKeyCode(value)
}

/**
 * A human label for a physical key code. HOST-ONLY copy.
 *
 * It is deliberately derivational rather than a lookup table: a table of every
 * code would be long, would drift, and would still miss codes. `Digit1` → "1",
 * `KeyQ` → "Q", `Numpad3` → "Numpad 3", and anything else is shown verbatim,
 * which is honest rather than wrong.
 */
export function describeKeyCode(code: string): string {
  if (/^Digit[0-9]$/.test(code)) return code.slice('Digit'.length)
  if (/^Key[A-Z]$/.test(code)) return code.slice('Key'.length)
  if (/^Numpad[0-9]$/.test(code)) return `Numpad ${code.slice('Numpad'.length)}`
  if (/^F[0-9]{1,2}$/.test(code)) return code
  return code
}

/**
 * The digit-row codes used for the default mapping, in team order.
 *
 * Chosen because they sit in one row, are labelled identically on every layout
 * the `code` vocabulary covers, are trivially explainable to a class ("team one
 * presses 1"), and there are exactly {@link MAX_TEAMS}-many of them available
 * before `Digit9`/`Digit0` would be needed.
 */
export const DEFAULT_PRIMARY_KEY_CODES: readonly string[] = [
  'Digit1',
  'Digit2',
  'Digit3',
  'Digit4',
  'Digit5',
  'Digit6',
  'Digit7',
  'Digit8',
]
