import { describe, expect, it } from 'vitest'
import {
  isLocalInputAction,
  isPrimaryBuzz,
  isSecondaryActionSlot,
  LOCAL_INPUT_ACTION_KINDS,
  LOCAL_INPUT_ACTION_LABEL,
  PRIMARY_BUZZ,
  SECONDARY_ACTION_SLOTS,
  secondaryActionLabel,
} from './logicalAction'
import {
  isLocalInputSignal,
  isLocalInputSourceKind,
  LOCAL_INPUT_SOURCE_KINDS,
  LOCAL_INPUT_SOURCE_LABEL,
  type LocalInputSignal,
} from './localInput'
import {
  LOCAL_INPUT_TRANSLATION_MESSAGE,
  LOCAL_INPUT_TRANSLATION_REJECTIONS,
  translateLocalInput,
} from './commandTranslation'

/**
 * The hardware-independent local-input CONTRACT (Slice 8).
 *
 * The claims proved here:
 *  - the logical action vocabulary is bounded and exhaustively discriminated;
 *  - secondary actions are REPRESENTABLE and completely INERT — no command, and
 *    therefore no event, no state change and no projection;
 *  - nothing in the contract names a colour, a device model, a button index or a
 *    key, so the engine cannot acquire a hardware vocabulary by accident;
 *  - a signal carries a team, an action and arrival evidence, and nothing else;
 *  - translation fails closed on anything unrecognized.
 */

const TARGET = { roundId: 'board-round', tileId: 'alpha-100' }

function signal(overrides: Partial<LocalInputSignal> = {}): LocalInputSignal {
  return {
    source: 'keyboard',
    action: PRIMARY_BUZZ,
    teamId: 'red',
    observedAt: 1_000_000,
    ...overrides,
  }
}

describe('the logical action vocabulary', () => {
  it('is bounded and exhaustively discriminated', () => {
    expect(LOCAL_INPUT_ACTION_KINDS).toEqual(['primary-buzz', 'secondary'])
    expect(isLocalInputAction(PRIMARY_BUZZ)).toBe(true)
    expect(isLocalInputAction({ kind: 'secondary', slot: 'secondary3' })).toBe(true)
  })

  it('fails closed on anything that is not a member', () => {
    for (const value of [
      null,
      undefined,
      'primary-buzz',
      {},
      { kind: 'buzz' },
      { kind: 'secondary' },
      { kind: 'secondary', slot: 'secondary5' },
      { kind: 'secondary', slot: 'red' },
      // A primary buzz carries no payload; one that does is not a member.
      { kind: 'primary-buzz', slot: 'secondary1' },
    ]) {
      expect(isLocalInputAction(value), JSON.stringify(value)).toBe(false)
    }
  })

  it('offers exactly four ORDINAL secondary slots, named after no colour', () => {
    expect(SECONDARY_ACTION_SLOTS).toEqual([
      'secondary1',
      'secondary2',
      'secondary3',
      'secondary4',
    ])
    for (const slot of SECONDARY_ACTION_SLOTS) {
      expect(isSecondaryActionSlot(slot)).toBe(true)
    }
    for (const colour of ['red', 'blue', 'orange', 'green', 'yellow']) {
      expect(isSecondaryActionSlot(colour)).toBe(false)
    }
  })

  /**
   * The engine must stay button-agnostic. This asserts it structurally rather
   * than by review: no colour word, no device model and no vendor name appears
   * anywhere in the vocabulary or in its host-facing copy.
   */
  it('names no colour, model, vendor or DEVICE anywhere in the action vocabulary', () => {
    // The ACTION vocabulary is the thing that must stay button-agnostic: what a
    // press MEANS may never be described in terms of what was pressed. `gamepad`
    // is forbidden here even though it is a legitimate SOURCE member (asserted
    // separately below) — an action must not name a device kind either.
    const surface = JSON.stringify([
      LOCAL_INPUT_ACTION_KINDS,
      SECONDARY_ACTION_SLOTS,
      LOCAL_INPUT_ACTION_LABEL,
      SECONDARY_ACTION_SLOTS.map(secondaryActionLabel),
    ]).toLowerCase()
    for (const forbidden of [
      'red',
      'blue',
      'orange',
      'green',
      'yellow',
      'sony',
      'buzz!',
      'playstation',
      'handset',
      'gamepad',
      'controller',
      'button',
      'webhid',
      'usb',
      'vendor',
      'product',
    ]) {
      expect(surface, `must not contain ${forbidden}`).not.toContain(forbidden)
    }
  })

  /**
   * The SOURCE union names the ADAPTER that produced a signal, which is a
   * different question from what the signal means. It may say `gamepad`; it may
   * never say which gamepad.
   */
  it('names no colour, model or vendor anywhere in the source vocabulary', () => {
    const surface = JSON.stringify([
      LOCAL_INPUT_SOURCE_KINDS,
      LOCAL_INPUT_SOURCE_LABEL,
    ]).toLowerCase()
    for (const forbidden of [
      'red',
      'blue',
      'orange',
      'green',
      'yellow',
      'sony',
      'buzz!',
      'playstation',
      'handset',
      'webhid',
      'bluetooth',
      'usb',
      'vendor',
      'product',
    ]) {
      expect(surface, `must not contain ${forbidden}`).not.toContain(forbidden)
    }
  })

  it('knows which action is the primary buzz', () => {
    expect(isPrimaryBuzz(PRIMARY_BUZZ)).toBe(true)
    expect(isPrimaryBuzz({ kind: 'secondary', slot: 'secondary1' })).toBe(false)
  })
})

describe('the local input signal', () => {
  it('recognizes exactly the sources that have an adapter', () => {
    // A member and its adapter arrive together, never one without the other.
    // Slice 8 shipped `keyboard`; Slice 9 shipped `gamepad` alongside
    // `src/input/gamepadAdapter.ts`. Nothing else is a member.
    expect(LOCAL_INPUT_SOURCE_KINDS).toEqual(['keyboard', 'gamepad'])
    expect(isLocalInputSourceKind('keyboard')).toBe(true)
    expect(isLocalInputSourceKind('gamepad')).toBe(true)
    expect(isLocalInputSourceKind('webhid')).toBe(false)
    expect(isLocalInputSourceKind('bluetooth')).toBe(false)
    expect(isLocalInputSourceKind('sony-buzz')).toBe(false)
    expect(isLocalInputSourceKind('phone')).toBe(false)
  })

  it('accepts a well-formed signal', () => {
    expect(isLocalInputSignal(signal())).toBe(true)
  })

  it('fails closed on a malformed signal', () => {
    for (const value of [
      null,
      'buzz',
      signalWithout('teamId'),
      { ...signal(), teamId: '' },
      { ...signal(), source: 'webhid' },
      { ...signal(), source: 'sony-buzz' },
      { ...signal(), action: { kind: 'nonsense' } },
      { ...signal(), observedAt: -1 },
      { ...signal(), observedAt: 1.5 },
      { ...signal(), observedAt: Number.NaN },
    ]) {
      expect(isLocalInputSignal(value), JSON.stringify(value)).toBe(false)
    }
  })
})

function signalWithout(key: keyof LocalInputSignal): Record<string, unknown> {
  const copy: Record<string, unknown> = { ...signal() }
  delete copy[key]
  return copy
}

describe('translating a signal into a game command', () => {
  it('turns a primary buzz into a RECORD_TEAM_BUZZ command carrying the opportunity', () => {
    const result = translateLocalInput(signal(), TARGET)
    expect(result).toEqual({
      status: 'command',
      command: {
        type: 'RECORD_TEAM_BUZZ',
        issuedAt: 1_000_000,
        roundId: 'board-round',
        tileId: 'alpha-100',
        teamId: 'red',
      },
    })
  })

  it('carries the arrival stamp through as issuedAt, unchanged', () => {
    const result = translateLocalInput(signal({ observedAt: 42 }), TARGET)
    expect(result.status === 'command' && result.command.issuedAt).toBe(42)
  })

  /**
   * The load-bearing Slice 8 claim about secondary actions: they exist in the
   * contract, they can be mapped, and they do NOTHING. There is no command for
   * one to become, so there is no event, no reducer transition and no projection
   * anywhere downstream.
   */
  it('refuses every secondary action — they are representable but inert', () => {
    for (const slot of SECONDARY_ACTION_SLOTS) {
      const result = translateLocalInput(
        signal({ action: { kind: 'secondary', slot } }),
        TARGET,
      )
      expect(result, slot).toEqual({ status: 'rejected', reason: 'unsupported-action' })
    }
  })

  it('refuses a malformed signal rather than building a command from it', () => {
    const result = translateLocalInput(
      { ...signal(), teamId: '' } as LocalInputSignal,
      TARGET,
    )
    expect(result).toEqual({ status: 'rejected', reason: 'malformed-signal' })
  })

  it('refuses when there is no open clue to buzz on', () => {
    expect(translateLocalInput(signal(), null)).toEqual({
      status: 'rejected',
      reason: 'no-open-clue',
    })
  })

  it('has host-facing copy for every rejection, and it names no hardware', () => {
    for (const reason of LOCAL_INPUT_TRANSLATION_REJECTIONS) {
      expect(LOCAL_INPUT_TRANSLATION_MESSAGE[reason].length).toBeGreaterThan(0)
    }
    const copy = Object.values(LOCAL_INPUT_TRANSLATION_MESSAGE).join(' ').toLowerCase()
    for (const forbidden of ['sony', 'gamepad', 'webhid', 'usb']) {
      expect(copy).not.toContain(forbidden)
    }
  })
})
