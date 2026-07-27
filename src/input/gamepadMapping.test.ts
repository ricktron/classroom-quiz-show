import { describe, expect, it } from 'vitest'
import {
  describeGamepadControl,
  EMPTY_GAMEPAD_MAPPING,
  GAMEPAD_MAPPING_ISSUE_CODES,
  GAMEPAD_MAPPING_VERSION,
  gamepadControlForTeamAction,
  MAX_GAMEPAD_BINDINGS,
  pruneUnknownGamepadTeams,
  resolveGamepadBinding,
  sameLocalInputAction,
  validateGamepadMapping,
  withGamepadControlForTeamAction,
  type GamepadBinding,
  type GamepadMapping,
} from './gamepadMapping'
import { MAX_GAMEPAD_BUTTON_INDEX, MAX_GAMEPAD_CONTROLLER_INDEX } from './gamepadSource'
import { PRIMARY_BUZZ, SECONDARY_ACTION_SLOTS, type LocalInputAction } from './logicalAction'
import { createTeamDefinitions } from '../game/teams/definition'
import { twoTeams } from '../test/teamFixtures'

/**
 * The generic Gamepad mapping model (Slice 9).
 *
 * The claims proved here:
 *  - a binding names a physical control as two bounded non-negative integers, a
 *    team, and a logical action — and nothing else is representable;
 *  - every mapping problem is a structured, addressed issue: nothing is repaired,
 *    dropped, coerced or silently overwritten;
 *  - there is NO default mapping, because a default would have to assume which
 *    button means "buzz" — exactly the model-specific knowledge this slice may
 *    not invent;
 *  - a team may hold one primary buzz button, and the four ordinal secondary
 *    slots are mappable;
 *  - "controller not attached" and "controller has no such button" are RESOLUTION
 *    facts, not validation failures that would delete a teacher's work;
 *  - a mapping is never mutated in place.
 */

const TEAMS = createTeamDefinitions(twoTeams())

const SECONDARY_TWO: LocalInputAction = { kind: 'secondary', slot: 'secondary2' }

function mapping(...bindings: Partial<GamepadBinding>[]): GamepadMapping {
  return {
    version: GAMEPAD_MAPPING_VERSION,
    bindings: bindings.map((binding) => ({
      controllerIndex: 0,
      buttonIndex: 0,
      teamId: 'red',
      action: PRIMARY_BUZZ,
      ...binding,
    })) as readonly GamepadBinding[],
  }
}

describe('the mapping shape', () => {
  it('starts EMPTY — there is deliberately no default button assignment', () => {
    expect(EMPTY_GAMEPAD_MAPPING.bindings).toEqual([])
    expect(EMPTY_GAMEPAD_MAPPING.version).toBe(GAMEPAD_MAPPING_VERSION)
    expect(Object.isFrozen(EMPTY_GAMEPAD_MAPPING)).toBe(true)
    expect(validateGamepadMapping(EMPTY_GAMEPAD_MAPPING, TEAMS).ok).toBe(true)
  })

  it('names no device, vendor, colour or handset anywhere in its vocabulary', () => {
    const surface = JSON.stringify([
      GAMEPAD_MAPPING_ISSUE_CODES,
      [0, 1, 2].map((index) => describeGamepadControl({ controllerIndex: index, buttonIndex: index })),
    ]).toLowerCase()
    for (const forbidden of [
      'sony',
      'playstation',
      'buzz!',
      'handset',
      'vendor',
      'product',
      'webhid',
      'red',
      'blue',
      'orange',
      'yellow',
      'green',
    ]) {
      expect(surface, `must not contain ${forbidden}`).not.toContain(forbidden)
    }
  })
})

describe('validating a mapping', () => {
  it('accepts a well-formed generic mapping', () => {
    const valid = mapping(
      { controllerIndex: 0, buttonIndex: 0, teamId: 'red' },
      { controllerIndex: 0, buttonIndex: 1, teamId: 'blue' },
    )
    const result = validateGamepadMapping(valid, TEAMS)
    expect(result.ok).toBe(true)
    expect(result.ok && result.mapping).toBe(valid)
  })

  it('accepts the extremes of the bounded index space', () => {
    const extreme = mapping({
      controllerIndex: MAX_GAMEPAD_CONTROLLER_INDEX,
      buttonIndex: MAX_GAMEPAD_BUTTON_INDEX,
    })
    expect(validateGamepadMapping(extreme, TEAMS).ok).toBe(true)
  })

  it('refuses a malformed controller index rather than coercing it', () => {
    for (const controllerIndex of [
      -1,
      1.5,
      MAX_GAMEPAD_CONTROLLER_INDEX + 1,
      Number.NaN,
      '0' as unknown as number,
    ]) {
      const result = validateGamepadMapping(mapping({ controllerIndex }), TEAMS)
      expect(result.ok, String(controllerIndex)).toBe(false)
      expect(!result.ok && result.issues[0]).toMatchObject({
        code: 'malformed-controller-index',
        bindingIndex: 0,
      })
    }
  })

  it('refuses a malformed button index rather than coercing it', () => {
    for (const buttonIndex of [-1, 2.5, MAX_GAMEPAD_BUTTON_INDEX + 1, null as unknown as number]) {
      const result = validateGamepadMapping(mapping({ buttonIndex }), TEAMS)
      expect(result.ok, String(buttonIndex)).toBe(false)
      expect(!result.ok && result.issues[0]).toMatchObject({
        code: 'malformed-button-index',
        bindingIndex: 0,
      })
    }
  })

  it('refuses a duplicate physical control and names the SECOND binding', () => {
    const result = validateGamepadMapping(
      mapping(
        { controllerIndex: 1, buttonIndex: 3, teamId: 'red' },
        { controllerIndex: 1, buttonIndex: 3, teamId: 'blue' },
      ),
      TEAMS,
    )
    expect(result.ok).toBe(false)
    expect(!result.ok && result.issues).toEqual([
      expect.objectContaining({ code: 'duplicate-control', bindingIndex: 1 }),
    ])
  })

  it('does not confuse the same button index on two different controllers', () => {
    const result = validateGamepadMapping(
      mapping(
        { controllerIndex: 0, buttonIndex: 3, teamId: 'red' },
        { controllerIndex: 1, buttonIndex: 3, teamId: 'blue' },
      ),
      TEAMS,
    )
    expect(result.ok).toBe(true)
  })

  it('refuses a team this game does not have', () => {
    const result = validateGamepadMapping(mapping({ teamId: 'nobody' }), TEAMS)
    expect(result.ok).toBe(false)
    expect(!result.ok && result.issues[0]).toMatchObject({ code: 'unknown-team', bindingIndex: 0 })
  })

  it('refuses a second primary buzz button for the same team', () => {
    const result = validateGamepadMapping(
      mapping(
        { controllerIndex: 0, buttonIndex: 0, teamId: 'red' },
        { controllerIndex: 0, buttonIndex: 1, teamId: 'red' },
      ),
      TEAMS,
    )
    expect(result.ok).toBe(false)
    expect(!result.ok && result.issues[0]).toMatchObject({
      code: 'duplicate-team-primary',
      bindingIndex: 1,
    })
  })

  /**
   * The "one primary" rule is WITHIN the Gamepad mapping. A team may hold a buzz
   * key AND a controller buzz button at the same time — different adapters, and
   * both feed the same queue.
   */
  it('allows a team a controller button even though it also has a buzz key', () => {
    // Proved structurally: nothing in this validator can see a keyboard mapping.
    expect(validateGamepadMapping(mapping({ teamId: 'red' }), TEAMS).ok).toBe(true)
  })

  it('accepts every ordinal secondary slot, and one per team per slot', () => {
    const bindings = SECONDARY_ACTION_SLOTS.map((slot, index) => ({
      controllerIndex: 0,
      buttonIndex: index,
      teamId: 'red',
      action: { kind: 'secondary' as const, slot },
    }))
    expect(validateGamepadMapping(mapping(...bindings), TEAMS).ok).toBe(true)
  })

  it('does not treat two secondary bindings as a duplicate primary', () => {
    const result = validateGamepadMapping(
      mapping(
        { buttonIndex: 0, teamId: 'red', action: { kind: 'secondary', slot: 'secondary1' } },
        { buttonIndex: 1, teamId: 'red', action: { kind: 'secondary', slot: 'secondary2' } },
      ),
      TEAMS,
    )
    expect(result.ok).toBe(true)
  })

  it('refuses a malformed action', () => {
    for (const action of [
      { kind: 'buzz' },
      { kind: 'secondary' },
      { kind: 'secondary', slot: 'secondary5' },
      { kind: 'secondary', slot: 'red' },
      null,
      'primary-buzz',
    ] as unknown as LocalInputAction[]) {
      const result = validateGamepadMapping(mapping({ action }), TEAMS)
      expect(result.ok, JSON.stringify(action)).toBe(false)
      expect(!result.ok && result.issues[0]).toMatchObject({ code: 'malformed-action' })
    }
  })

  it('refuses an oversized mapping as one whole-mapping issue', () => {
    const many = Array.from({ length: MAX_GAMEPAD_BINDINGS + 1 }, (_unused, index) => ({
      controllerIndex: 0,
      buttonIndex: index,
    }))
    const result = validateGamepadMapping(mapping(...many), TEAMS)
    expect(result.ok).toBe(false)
    expect(!result.ok && result.issues).toEqual([
      expect.objectContaining({ code: 'too-many-bindings', bindingIndex: null }),
    ])
  })

  it('reports every problem it finds, addressed to its binding', () => {
    const result = validateGamepadMapping(
      mapping(
        { controllerIndex: -1, teamId: 'red' },
        { controllerIndex: 0, buttonIndex: 4, teamId: 'nobody' },
      ),
      TEAMS,
    )
    expect(result.ok).toBe(false)
    expect(!result.ok && result.issues.map((issue) => issue.code)).toEqual([
      'malformed-controller-index',
      'unknown-team',
    ])
  })

  it('has an actionable message for every issue it can raise', () => {
    const result = validateGamepadMapping(
      mapping({ controllerIndex: -1 }, { buttonIndex: -1 }),
      TEAMS,
    )
    expect(result.ok).toBe(false)
    for (const issue of result.ok ? [] : result.issues) {
      expect(issue.message.length).toBeGreaterThan(10)
    }
  })

  /**
   * A mapping made while a controller was plugged in must survive it being
   * unplugged. "Not attached" and "no such button" are things the ADAPTER
   * observes, not reasons to delete a teacher's assignment.
   */
  it('does NOT refuse a binding for a controller that is not attached', () => {
    expect(validateGamepadMapping(mapping({ controllerIndex: 5, buttonIndex: 20 }), TEAMS).ok).toBe(
      true,
    )
  })
})

describe('resolving a pressed control', () => {
  const configured = mapping(
    { controllerIndex: 0, buttonIndex: 2, teamId: 'red' },
    { controllerIndex: 1, buttonIndex: 0, teamId: 'blue', action: SECONDARY_TWO },
  )

  it('finds the binding for an assigned control', () => {
    expect(resolveGamepadBinding(configured, { controllerIndex: 0, buttonIndex: 2 })).toMatchObject({
      teamId: 'red',
      action: PRIMARY_BUZZ,
    })
  })

  it('returns null for an unassigned button on an assigned controller', () => {
    expect(resolveGamepadBinding(configured, { controllerIndex: 0, buttonIndex: 3 })).toBeNull()
  })

  it('returns null for a controller nothing is assigned on', () => {
    expect(resolveGamepadBinding(configured, { controllerIndex: 4, buttonIndex: 2 })).toBeNull()
  })

  it('returns null for a malformed control, whatever the mapping says', () => {
    const hostile = mapping({ controllerIndex: -1, buttonIndex: -1 })
    expect(resolveGamepadBinding(hostile, { controllerIndex: -1, buttonIndex: -1 })).toBeNull()
  })
})

describe('editing a mapping', () => {
  it('assigns a control to a team and an action without mutating the input', () => {
    const before = EMPTY_GAMEPAD_MAPPING
    const after = withGamepadControlForTeamAction(before, 'red', PRIMARY_BUZZ, {
      controllerIndex: 1,
      buttonIndex: 4,
    })
    expect(before.bindings).toEqual([])
    expect(after.bindings).toEqual([
      { controllerIndex: 1, buttonIndex: 4, teamId: 'red', action: PRIMARY_BUZZ },
    ])
  })

  it('replaces that team-and-action binding rather than adding a second', () => {
    const first = withGamepadControlForTeamAction(EMPTY_GAMEPAD_MAPPING, 'red', PRIMARY_BUZZ, {
      controllerIndex: 0,
      buttonIndex: 1,
    })
    const second = withGamepadControlForTeamAction(first, 'red', PRIMARY_BUZZ, {
      controllerIndex: 0,
      buttonIndex: 2,
    })
    expect(second.bindings).toHaveLength(1)
    expect(second.bindings[0]?.buttonIndex).toBe(2)
  })

  it('keeps a team’s secondary binding when its primary is reassigned', () => {
    const withSecondary = withGamepadControlForTeamAction(
      EMPTY_GAMEPAD_MAPPING,
      'red',
      SECONDARY_TWO,
      { controllerIndex: 0, buttonIndex: 5 },
    )
    const withBoth = withGamepadControlForTeamAction(withSecondary, 'red', PRIMARY_BUZZ, {
      controllerIndex: 0,
      buttonIndex: 1,
    })
    expect(withBoth.bindings).toHaveLength(2)
  })

  /**
   * The no-silent-overwrite rule. Assigning a control another team already holds
   * produces an INVALID mapping the caller must refuse — it does not quietly
   * steal the button.
   */
  it('does not steal a control another team holds — it produces a refusable mapping', () => {
    const taken = mapping({ controllerIndex: 0, buttonIndex: 1, teamId: 'red' })
    const conflicting = withGamepadControlForTeamAction(taken, 'blue', PRIMARY_BUZZ, {
      controllerIndex: 0,
      buttonIndex: 1,
    })
    expect(conflicting.bindings).toHaveLength(2)
    const result = validateGamepadMapping(conflicting, TEAMS)
    expect(result.ok).toBe(false)
    expect(!result.ok && result.issues[0]?.code).toBe('duplicate-control')
    // …and the original mapping is untouched.
    expect(taken.bindings).toHaveLength(1)
  })

  it('clears a binding with null', () => {
    const assigned = withGamepadControlForTeamAction(EMPTY_GAMEPAD_MAPPING, 'red', PRIMARY_BUZZ, {
      controllerIndex: 0,
      buttonIndex: 1,
    })
    expect(
      withGamepadControlForTeamAction(assigned, 'red', PRIMARY_BUZZ, null).bindings,
    ).toEqual([])
  })

  it('reads back the control bound to one team and action', () => {
    const configured = mapping(
      { controllerIndex: 2, buttonIndex: 3, teamId: 'red' },
      { controllerIndex: 2, buttonIndex: 4, teamId: 'red', action: SECONDARY_TWO },
    )
    expect(gamepadControlForTeamAction(configured, 'red', PRIMARY_BUZZ)).toEqual({
      controllerIndex: 2,
      buttonIndex: 3,
    })
    expect(gamepadControlForTeamAction(configured, 'red', SECONDARY_TWO)).toEqual({
      controllerIndex: 2,
      buttonIndex: 4,
    })
    expect(gamepadControlForTeamAction(configured, 'blue', PRIMARY_BUZZ)).toBeNull()
  })

  it('prunes bindings for a REMOVED team and keeps a renamed one', () => {
    const configured = mapping(
      { controllerIndex: 0, buttonIndex: 0, teamId: 'red' },
      { controllerIndex: 0, buttonIndex: 1, teamId: 'blue' },
    )
    const renamed = createTeamDefinitions([
      { id: 'red', name: 'Renamed Team', accent: 'crimson' },
    ])
    const pruned = pruneUnknownGamepadTeams(configured, renamed)
    expect(pruned.bindings).toHaveLength(1)
    expect(pruned.bindings[0]?.teamId).toBe('red')
    // Unchanged input is returned as-is, so a no-op prune causes no re-render.
    expect(pruneUnknownGamepadTeams(configured, TEAMS)).toBe(configured)
  })
})

describe('logical action equality', () => {
  it('distinguishes the primary buzz from every secondary slot', () => {
    expect(sameLocalInputAction(PRIMARY_BUZZ, { kind: 'primary-buzz' })).toBe(true)
    expect(sameLocalInputAction(PRIMARY_BUZZ, SECONDARY_TWO)).toBe(false)
    for (const slot of SECONDARY_ACTION_SLOTS) {
      expect(sameLocalInputAction({ kind: 'secondary', slot }, { kind: 'secondary', slot })).toBe(
        true,
      )
    }
    expect(
      sameLocalInputAction(
        { kind: 'secondary', slot: 'secondary1' },
        { kind: 'secondary', slot: 'secondary2' },
      ),
    ).toBe(false)
  })
})

describe('host-facing control descriptions', () => {
  it('numbers controllers and buttons from one, neutrally', () => {
    expect(describeGamepadControl({ controllerIndex: 0, buttonIndex: 0 })).toBe(
      'Controller 1 · button 1',
    )
    expect(describeGamepadControl({ controllerIndex: 2, buttonIndex: 7 })).toBe(
      'Controller 3 · button 8',
    )
  })
})
