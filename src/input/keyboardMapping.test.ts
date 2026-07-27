import { describe, expect, it } from 'vitest'
import {
  DEFAULT_PRIMARY_KEY_CODES,
  describeKeyCode,
  isBindableKeyCode,
  isReservedKeyCode,
  isSupportedKeyCode,
  KEY_CODE_PATTERN,
  RESERVED_KEY_CODES,
  UNIDENTIFIED_KEY_CODE,
} from './keyboardKeys'
import {
  defaultKeyboardMapping,
  EMPTY_KEYBOARD_MAPPING,
  KEYBOARD_MAPPING_VERSION,
  MAX_KEYBOARD_BINDINGS,
  primaryKeyForTeam,
  pruneUnknownTeams,
  resolveKeyboardBinding,
  validateKeyboardMapping,
  withPrimaryKeyForTeam,
  type KeyboardMapping,
} from './keyboardMapping'
import { PRIMARY_BUZZ } from './logicalAction'
import { createTeamDefinitions } from '../game/teams/definition'
import { MAX_TEAMS } from '../game/teams/limits'
import { twoTeams } from '../test/teamFixtures'

/**
 * Keyboard key semantics and the mapping model (Slice 8).
 *
 * The claims proved here:
 *  - bindings name a PHYSICAL key position (`KeyboardEvent.code`), which is what
 *    makes a mapping survive a different keyboard layout and a held Shift;
 *  - keys the host surface needs are reserved and cannot be taken;
 *  - every mapping problem is reported as a structured, addressed issue — nothing
 *    is repaired, dropped, or silently overwritten;
 *  - the defaults are safe, bounded and explainable;
 *  - a removed team's binding is pruned; a RENAMED team keeps its key.
 */

const TEAMS = createTeamDefinitions(twoTeams())

function mapping(...bindings: { code: string; teamId: string }[]): KeyboardMapping {
  return {
    version: KEYBOARD_MAPPING_VERSION,
    bindings: bindings.map((binding) => ({ ...binding, action: PRIMARY_BUZZ })),
  }
}

describe('physical key semantics', () => {
  it('accepts the `code` vocabulary and nothing else', () => {
    for (const code of ['KeyQ', 'Digit1', 'Numpad7', 'F9', 'BracketLeft', 'Backquote']) {
      expect(isSupportedKeyCode(code), code).toBe(true)
    }
    for (const code of ['', ' ', '1', 'Key-Q', 'Key Q', '!', 'é', UNIDENTIFIED_KEY_CODE, 42, null]) {
      expect(isSupportedKeyCode(code), JSON.stringify(code)).toBe(false)
    }
  })

  /**
   * The layout-independence argument for `code` over `key`, asserted rather than
   * merely written down: the character an AZERTY keyboard produces for the same
   * physical key is `&`, which the grammar refuses — so a mapping can never come
   * to hold a layout-dependent value.
   */
  it('refuses the characters `key` would have produced', () => {
    for (const character of ['1', '&', '!', 'q', 'Q', 'é', '“']) {
      expect(isSupportedKeyCode(character), character).toBe(false)
    }
  })

  it('is bounded in length', () => {
    expect(KEY_CODE_PATTERN.test('A'.repeat(32))).toBe(true)
    expect(KEY_CODE_PATTERN.test('A'.repeat(33))).toBe(false)
  })

  it('reserves the keys the host screen needs to stay operable', () => {
    for (const code of ['Tab', 'Enter', 'NumpadEnter', 'Space', 'Escape', 'F5']) {
      expect(isReservedKeyCode(code), code).toBe(true)
      expect(isBindableKeyCode(code), code).toBe(false)
    }
    // Modifiers are reserved too: alone they are not a press, and in combination
    // they are a chord the adapter ignores.
    for (const code of ['ShiftLeft', 'ControlRight', 'AltLeft', 'MetaLeft', 'CapsLock']) {
      expect(isReservedKeyCode(code), code).toBe(true)
    }
    expect(isBindableKeyCode('Digit1')).toBe(true)
    expect(isBindableKeyCode('KeyZ')).toBe(true)
  })

  it('every reserved code is itself a well-formed code', () => {
    for (const code of RESERVED_KEY_CODES) {
      expect(isSupportedKeyCode(code), code).toBe(true)
    }
  })

  it('describes a key the way a teacher would say it', () => {
    expect(describeKeyCode('Digit1')).toBe('1')
    expect(describeKeyCode('KeyQ')).toBe('Q')
    expect(describeKeyCode('Numpad3')).toBe('Numpad 3')
    expect(describeKeyCode('F9')).toBe('F9')
    // Anything else is shown verbatim, which is honest rather than wrong.
    expect(describeKeyCode('BracketLeft')).toBe('BracketLeft')
  })
})

describe('the default mapping', () => {
  it('gives each team one digit-row key, in authored team order', () => {
    const result = defaultKeyboardMapping(TEAMS)
    expect(result.bindings).toEqual([
      { code: 'Digit1', teamId: 'red', action: PRIMARY_BUZZ },
      { code: 'Digit2', teamId: 'blue', action: PRIMARY_BUZZ },
    ])
    expect(validateKeyboardMapping(result, TEAMS).ok).toBe(true)
  })

  it('covers the maximum number of teams the engine allows', () => {
    expect(DEFAULT_PRIMARY_KEY_CODES.length).toBeGreaterThanOrEqual(MAX_TEAMS)
    for (const code of DEFAULT_PRIMARY_KEY_CODES) {
      expect(isBindableKeyCode(code), code).toBe(true)
    }
  })

  it('is empty for a game with no teams', () => {
    expect(defaultKeyboardMapping([]).bindings).toEqual([])
    expect(EMPTY_KEYBOARD_MAPPING.bindings).toEqual([])
  })
})

describe('mapping validation', () => {
  it('accepts a well-formed mapping', () => {
    const result = validateKeyboardMapping(
      mapping({ code: 'KeyA', teamId: 'red' }, { code: 'KeyL', teamId: 'blue' }),
      TEAMS,
    )
    expect(result.ok).toBe(true)
  })

  it('reports a duplicate key against the SECOND binding and overwrites nothing', () => {
    const result = validateKeyboardMapping(
      mapping({ code: 'KeyA', teamId: 'red' }, { code: 'KeyA', teamId: 'blue' }),
      TEAMS,
    )
    expect(result.ok).toBe(false)
    expect(result.ok === false && result.issues).toEqual([
      expect.objectContaining({ code: 'duplicate-key', bindingIndex: 1 }),
    ])
  })

  it('reports a reserved key', () => {
    const result = validateKeyboardMapping(mapping({ code: 'Escape', teamId: 'red' }), TEAMS)
    expect(result.ok === false && result.issues[0].code).toBe('reserved-key')
  })

  it('reports an unsupported key', () => {
    const result = validateKeyboardMapping(mapping({ code: '1', teamId: 'red' }), TEAMS)
    expect(result.ok === false && result.issues[0].code).toBe('unsupported-key')
  })

  it('reports a team the game does not have', () => {
    const result = validateKeyboardMapping(mapping({ code: 'KeyA', teamId: 'green' }), TEAMS)
    expect(result.ok === false && result.issues[0].code).toBe('unknown-team')
  })

  it('reports a second primary key for the same team', () => {
    const result = validateKeyboardMapping(
      mapping({ code: 'KeyA', teamId: 'red' }, { code: 'KeyB', teamId: 'red' }),
      TEAMS,
    )
    expect(result.ok === false && result.issues[0].code).toBe('duplicate-team-primary')
  })

  it('reports a malformed action', () => {
    const result = validateKeyboardMapping(
      {
        version: KEYBOARD_MAPPING_VERSION,
        bindings: [{ code: 'KeyA', teamId: 'red', action: { kind: 'nope' } as never }],
      },
      TEAMS,
    )
    expect(result.ok === false && result.issues[0].code).toBe('malformed-action')
  })

  it('reports every problem at once rather than stopping at the first', () => {
    const result = validateKeyboardMapping(
      mapping(
        { code: 'Escape', teamId: 'red' },
        { code: 'KeyA', teamId: 'ghost' },
        { code: 'KeyB', teamId: 'blue' },
        { code: 'KeyB', teamId: 'red' },
      ),
      TEAMS,
    )
    expect(result.ok).toBe(false)
    // The last binding is BOTH a duplicate key and a second primary for `red`, and
    // both are reported: a teacher fixing one should not discover the other only
    // after re-saving.
    expect(result.ok === false && result.issues.map((issue) => issue.code)).toEqual([
      'reserved-key',
      'unknown-team',
      'duplicate-key',
      'duplicate-team-primary',
    ])
  })

  /**
   * A secondary binding is a VALID mapping — the contract supports it. It is the
   * command translator that refuses to act on it (see
   * `localInputContract.test.ts`), so nothing about it can change game state.
   */
  it('accepts a secondary binding, which the translator then refuses to act on', () => {
    const result = validateKeyboardMapping(
      {
        version: KEYBOARD_MAPPING_VERSION,
        bindings: [
          { code: 'KeyA', teamId: 'red', action: PRIMARY_BUZZ },
          { code: 'KeyS', teamId: 'red', action: { kind: 'secondary', slot: 'secondary1' } },
        ],
      },
      TEAMS,
    )
    expect(result.ok).toBe(true)
  })

  it('refuses an unbounded mapping outright', () => {
    const bindings = Array.from({ length: MAX_KEYBOARD_BINDINGS + 1 }, (_unused, index) => ({
      code: `KeyA${index}`,
      teamId: 'red',
      action: PRIMARY_BUZZ,
    }))
    const result = validateKeyboardMapping({ version: KEYBOARD_MAPPING_VERSION, bindings }, TEAMS)
    expect(result.ok === false && result.issues[0].code).toBe('too-many-bindings')
  })
})

describe('resolving and editing a mapping', () => {
  const configured = mapping({ code: 'KeyA', teamId: 'red' }, { code: 'KeyL', teamId: 'blue' })

  it('resolves a bound key to its binding', () => {
    expect(resolveKeyboardBinding(configured, 'KeyA')?.teamId).toBe('red')
    expect(resolveKeyboardBinding(configured, 'KeyZ')).toBeNull()
  })

  /**
   * Defence in depth: even a hand-edited stored mapping that contains a reserved
   * or malformed key cannot be acted on, because resolution refuses it too.
   */
  it('never resolves a reserved or unsupported key, even if one is stored', () => {
    const hostile = mapping({ code: 'Escape', teamId: 'red' }, { code: '1', teamId: 'blue' })
    expect(resolveKeyboardBinding(hostile, 'Escape')).toBeNull()
    expect(resolveKeyboardBinding(hostile, '1')).toBeNull()
  })

  it('reads a team’s primary key', () => {
    expect(primaryKeyForTeam(configured, 'red')).toBe('KeyA')
    expect(primaryKeyForTeam(configured, 'green')).toBeNull()
  })

  it('replaces a team’s key without mutating the original mapping', () => {
    const next = withPrimaryKeyForTeam(configured, 'red', 'KeyQ')
    expect(primaryKeyForTeam(next, 'red')).toBe('KeyQ')
    expect(primaryKeyForTeam(next, 'blue')).toBe('KeyL')
    // The input is untouched.
    expect(primaryKeyForTeam(configured, 'red')).toBe('KeyA')
  })

  it('clears a team’s key', () => {
    const next = withPrimaryKeyForTeam(configured, 'red', null)
    expect(primaryKeyForTeam(next, 'red')).toBeNull()
    expect(next.bindings).toHaveLength(1)
  })

  /**
   * No silent overwriting: taking a key another team already has produces an
   * INVALID mapping that validation refuses, rather than quietly stealing it.
   */
  it('does not steal another team’s key — the result is invalid instead', () => {
    const next = withPrimaryKeyForTeam(configured, 'red', 'KeyL')
    const result = validateKeyboardMapping(next, TEAMS)
    expect(result.ok).toBe(false)
    expect(result.ok === false && result.issues[0].code).toBe('duplicate-key')
  })
})

describe('when the loaded game changes', () => {
  it('drops a REMOVED team’s binding and keeps the rest', () => {
    const withGhost = mapping({ code: 'KeyA', teamId: 'red' }, { code: 'KeyL', teamId: 'ghost' })
    const pruned = pruneUnknownTeams(withGhost, TEAMS)
    expect(pruned.bindings).toEqual([{ code: 'KeyA', teamId: 'red', action: PRIMARY_BUZZ }])
  })

  it('keeps a RENAMED team’s key, because identity is the id and not the name', () => {
    const renamed = createTeamDefinitions([
      { id: 'red', name: 'The Tectonics', accent: 'crimson' },
      { id: 'blue', name: 'Blue Team', accent: 'azure' },
    ])
    const configured = mapping({ code: 'KeyA', teamId: 'red' })
    expect(pruneUnknownTeams(configured, renamed)).toBe(configured)
    expect(validateKeyboardMapping(configured, renamed).ok).toBe(true)
  })

  it('returns the same object when nothing needs pruning', () => {
    const configured = mapping({ code: 'KeyA', teamId: 'red' })
    expect(pruneUnknownTeams(configured, TEAMS)).toBe(configured)
  })
})
