import { describe, expect, it } from 'vitest'
import {
  isTextEntryTarget,
  KEYBOARD_IGNORE_MESSAGE,
  KEYBOARD_IGNORE_REASONS,
  translateKeyboardInput,
  type KeyboardAdapterGate,
  type KeyboardEventFacts,
} from './keyboardAdapter'
import { KEYBOARD_MAPPING_VERSION, type KeyboardMapping } from './keyboardMapping'
import { PRIMARY_BUZZ } from './logicalAction'

/**
 * The keyboard adapter (Slice 8) — raw press → logical action, as a pure function.
 *
 * The claims proved here, none of which needs a browser:
 *  - auto-repeat never produces a second buzz;
 *  - a held key never produces a second buzz, even if `repeat` is not reported;
 *  - composition, modifier chords and text entry never buzz;
 *  - capture mode suspends buzzing entirely, so assigning a key cannot fire it;
 *  - an unmapped key produces nothing;
 *  - what crosses the boundary is a team + a logical action + arrival evidence,
 *    with no key, code, device or mapping anywhere in it.
 */

const AT = 1_000_000

const MAPPING: KeyboardMapping = {
  version: KEYBOARD_MAPPING_VERSION,
  bindings: [
    { code: 'Digit1', teamId: 'red', action: PRIMARY_BUZZ },
    { code: 'Digit2', teamId: 'blue', action: PRIMARY_BUZZ },
    { code: 'KeyS', teamId: 'red', action: { kind: 'secondary', slot: 'secondary1' } },
  ],
}

function facts(overrides: Partial<KeyboardEventFacts> = {}): KeyboardEventFacts {
  return {
    code: 'Digit1',
    repeat: false,
    isComposing: false,
    withModifier: false,
    inTextEntry: false,
    ...overrides,
  }
}

function gate(overrides: Partial<KeyboardAdapterGate> = {}): KeyboardAdapterGate {
  return { enabled: true, capturing: false, heldCodes: new Set<string>(), ...overrides }
}

describe('an accepted press', () => {
  it('produces a team + logical action signal', () => {
    const result = translateKeyboardInput(facts(), MAPPING, gate(), AT)
    expect(result).toEqual({
      status: 'action',
      signal: { source: 'keyboard', action: PRIMARY_BUZZ, teamId: 'red', observedAt: AT },
    })
  })

  it('carries the arrival stamp the caller supplied, and reads no clock itself', () => {
    const first = translateKeyboardInput(facts(), MAPPING, gate(), 5)
    const second = translateKeyboardInput(facts(), MAPPING, gate(), 5)
    expect(first).toEqual(second)
    expect(first.status === 'action' && first.signal.observedAt).toBe(5)
  })

  /**
   * The boundary claim, asserted structurally: nothing about the KEY survives the
   * translation. A serialized signal contains no code, no key, no device and no
   * mapping — only what the press meant and who it was for.
   */
  it('carries no key, code, device or mapping across the boundary', () => {
    const result = translateKeyboardInput(facts({ code: 'Digit1' }), MAPPING, gate(), AT)
    const serialized = JSON.stringify(result).toLowerCase()
    for (const forbidden of ['digit1', 'code', 'repeat', 'binding', 'mapping', '"key"']) {
      expect(serialized, `must not contain ${forbidden}`).not.toContain(forbidden)
    }
    // `keyboard` DOES appear — as the bounded source kind, which is the only
    // hardware-adjacent word the contract carries and is host-private besides.
    expect(serialized).toContain('"source":"keyboard"')
  })

  /**
   * A secondary binding produces a well-formed SIGNAL — the adapter's job is
   * mapping, not policy. Refusing it is the translator's job, and that is where
   * it is tested.
   */
  it('maps a secondary binding to a secondary signal, leaving policy to the translator', () => {
    const result = translateKeyboardInput(facts({ code: 'KeyS' }), MAPPING, gate(), AT)
    expect(result.status === 'action' && result.signal.action).toEqual({
      kind: 'secondary',
      slot: 'secondary1',
    })
  })
})

describe('presses that must never buzz', () => {
  it('ignores OS auto-repeat', () => {
    expect(translateKeyboardInput(facts({ repeat: true }), MAPPING, gate(), AT)).toEqual({
      status: 'ignored',
      reason: 'key-repeat',
    })
  })

  it('ignores a key that is still held, even when repeat is not reported', () => {
    const held = gate({ heldCodes: new Set(['Digit1']) })
    expect(translateKeyboardInput(facts({ repeat: false }), MAPPING, held, AT)).toEqual({
      status: 'ignored',
      reason: 'key-held',
    })
  })

  it('ignores an IME composition press', () => {
    expect(translateKeyboardInput(facts({ isComposing: true }), MAPPING, gate(), AT)).toEqual({
      status: 'ignored',
      reason: 'composing',
    })
  })

  it('ignores a modifier chord', () => {
    expect(translateKeyboardInput(facts({ withModifier: true }), MAPPING, gate(), AT)).toEqual({
      status: 'ignored',
      reason: 'modifier-chord',
    })
  })

  it('ignores every press while the host is typing', () => {
    expect(translateKeyboardInput(facts({ inTextEntry: true }), MAPPING, gate(), AT)).toEqual({
      status: 'ignored',
      reason: 'text-entry',
    })
  })

  it('ignores every press while a key is being reassigned', () => {
    const capturing = gate({ capturing: true })
    expect(translateKeyboardInput(facts(), MAPPING, capturing, AT)).toEqual({
      status: 'ignored',
      reason: 'capture-mode',
    })
  })

  it('ignores every press while keyboard buzzing is switched off', () => {
    const off = gate({ enabled: false })
    expect(translateKeyboardInput(facts(), MAPPING, off, AT)).toEqual({
      status: 'ignored',
      reason: 'input-disabled',
    })
  })

  it('ignores an unmapped key', () => {
    expect(translateKeyboardInput(facts({ code: 'KeyZ' }), MAPPING, gate(), AT)).toEqual({
      status: 'ignored',
      reason: 'unmapped-key',
    })
  })

  it('ignores a reserved key even when a stored mapping claims it', () => {
    const hostile: KeyboardMapping = {
      version: KEYBOARD_MAPPING_VERSION,
      bindings: [{ code: 'Escape', teamId: 'red', action: PRIMARY_BUZZ }],
    }
    expect(translateKeyboardInput(facts({ code: 'Escape' }), hostile, gate(), AT)).toEqual({
      status: 'ignored',
      reason: 'unmapped-key',
    })
  })

  /**
   * Ordering matters: typing must beat buzzing even for a key that is mapped and
   * a session that is fully enabled, and the disabled/capture gates must beat
   * everything. This pins the precedence rather than leaving it to reading order.
   */
  it('applies the gates in a fixed precedence', () => {
    const everything = facts({ repeat: true, isComposing: true, withModifier: true, inTextEntry: true })
    expect(
      translateKeyboardInput(everything, MAPPING, gate({ enabled: false }), AT),
    ).toMatchObject({ reason: 'input-disabled' })
    expect(
      translateKeyboardInput(everything, MAPPING, gate({ capturing: true }), AT),
    ).toMatchObject({ reason: 'capture-mode' })
    expect(translateKeyboardInput(everything, MAPPING, gate(), AT)).toMatchObject({
      reason: 'text-entry',
    })
  })

  it('has host-facing copy for every ignore reason', () => {
    for (const reason of KEYBOARD_IGNORE_REASONS) {
      expect(KEYBOARD_IGNORE_MESSAGE[reason].length).toBeGreaterThan(0)
    }
  })
})

describe('recognizing a text-entry target', () => {
  const target = (overrides: Partial<Parameters<typeof isTextEntryTarget>[0]> = {}) => ({
    tagName: 'DIV',
    isContentEditable: false,
    inDialog: false,
    optedOut: false,
    ...overrides,
  })

  it('treats form fields as typing', () => {
    for (const tagName of ['INPUT', 'TEXTAREA', 'SELECT', 'OPTION']) {
      expect(isTextEntryTarget(target({ tagName })), tagName).toBe(true)
    }
  })

  /**
   * A focused BUTTON is not typing. A teacher operates this app by clicking, and a
   * clicked button keeps focus — so treating it as typing would silently kill
   * buzzing for the rest of the lesson. Space/Enter/NumpadEnter are reserved keys,
   * so no buzz key can collide with button activation anyway.
   */
  it('does NOT treat a focused button as typing', () => {
    expect(isTextEntryTarget(target({ tagName: 'BUTTON' }))).toBe(false)
  })

  it('treats editable regions and dialogs as typing', () => {
    expect(isTextEntryTarget(target({ isContentEditable: true }))).toBe(true)
    expect(isTextEntryTarget(target({ inDialog: true }))).toBe(true)
  })

  it('honours an explicit opt-out', () => {
    expect(isTextEntryTarget(target({ optedOut: true }))).toBe(true)
  })

  it('leaves an ordinary element alone', () => {
    expect(isTextEntryTarget(target())).toBe(false)
    expect(isTextEntryTarget(target({ tagName: 'BODY' }))).toBe(false)
  })
})
