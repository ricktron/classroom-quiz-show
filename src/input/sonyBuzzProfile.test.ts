import { describe, expect, it } from 'vitest'
import { createTeamDefinitions } from '../game/teams/definition'
import { twoTeams } from '../test/teamFixtures'
import {
  EMPTY_GAMEPAD_MAPPING,
  GAMEPAD_MAPPING_VERSION,
  validateGamepadMapping,
  type GamepadMapping,
} from './gamepadMapping'
import { PRIMARY_BUZZ, SECONDARY_ACTION_SLOTS } from './logicalAction'
import {
  applySonyBuzzStagedProfile,
  bindingsFromSonyBuzzStagedProfile,
  discardSonyBuzzStagedProfile,
  emptySonyBuzzStagedProfile,
  isEmptyGamepadMapping,
  previewSonyBuzzApply,
  SONY_BUZZ_HANDSET_PROMPTS,
  stageSonyBuzzCapture,
  type SonyBuzzStagedProfile,
} from './sonyBuzzProfile'

/**
 * Recommended Sony Buzz! capture recipe (Slice 10).
 *
 * Staging records observed controls — never hard-coded indices. Apply validates
 * through the existing Gamepad mapping discipline.
 */

const TEAMS = createTeamDefinitions(twoTeams())

function control(controllerIndex: number, buttonIndex: number) {
  return { controllerIndex, buttonIndex }
}

function captureAll(
  teamId: string,
  captures: { controllerIndex: number; buttonIndex: number }[],
  activeMapping: GamepadMapping = EMPTY_GAMEPAD_MAPPING,
): SonyBuzzStagedProfile {
  let profile = emptySonyBuzzStagedProfile(teamId)
  for (const entry of captures) {
    const result = stageSonyBuzzCapture(profile, entry, TEAMS, activeMapping)
    expect(result.ok, JSON.stringify(!result.ok && result.issues)).toBe(true)
    if (!result.ok) throw new Error('staging failed in fixture')
    profile = result.profile
  }
  return profile
}

describe('the capture recipe', () => {
  it('maps all five prompts to primary-buzz and secondary1..4', () => {
    expect(SONY_BUZZ_HANDSET_PROMPTS.map((prompt) => prompt.action)).toEqual([
      PRIMARY_BUZZ,
      ...SECONDARY_ACTION_SLOTS.map((slot) => ({ kind: 'secondary' as const, slot })),
    ])
  })

  it('captures observed controls rather than fixed button indices', () => {
    const profile = captureAll('red', [
      control(2, 7),
      control(2, 3),
      control(2, 9),
      control(2, 1),
      control(2, 5),
    ])
    expect(profile.staged.map((entry) => entry.control)).toEqual([
      control(2, 7),
      control(2, 3),
      control(2, 9),
      control(2, 1),
      control(2, 5),
    ])
  })

  it('captures one-device topology on controller 0 with five different buttons', () => {
    const profile = captureAll('red', [
      control(0, 0),
      control(0, 1),
      control(0, 2),
      control(0, 3),
      control(0, 4),
    ])
    const built = bindingsFromSonyBuzzStagedProfile(profile)
    expect(built.ok).toBe(true)
    if (!built.ok) return
    expect(built.bindings.every((binding) => binding.controllerIndex === 0)).toBe(true)
    expect(new Set(built.bindings.map((binding) => binding.buttonIndex)).size).toBe(5)
  })

  it('captures multi-device topology across controller indices', () => {
    const profile = captureAll('blue', [
      control(0, 0),
      control(1, 1),
      control(2, 2),
      control(3, 3),
      control(4, 4),
    ])
    const built = bindingsFromSonyBuzzStagedProfile(profile)
    expect(built.ok).toBe(true)
    if (!built.ok) return
    expect(new Set(built.bindings.map((binding) => binding.controllerIndex)).size).toBe(5)
  })
})

describe('staging guardrails', () => {
  it('requires an explicit team before capture', () => {
    const result = stageSonyBuzzCapture(
      emptySonyBuzzStagedProfile(''),
      control(0, 0),
      TEAMS,
      EMPTY_GAMEPAD_MAPPING,
    )
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.issues.join(' ')).toMatch(/team/i)
  })

  it('refuses an incomplete profile at apply time', () => {
    let profile = emptySonyBuzzStagedProfile('red')
    const staged = stageSonyBuzzCapture(profile, control(0, 0), TEAMS, EMPTY_GAMEPAD_MAPPING)
    expect(staged.ok).toBe(true)
    if (!staged.ok) return
    profile = staged.profile

    const preview = previewSonyBuzzApply(profile, EMPTY_GAMEPAD_MAPPING, TEAMS)
    expect(preview.ok).toBe(false)
    if (preview.ok) return
    expect(preview.issues.join(' ')).toMatch(/incomplete/i)
  })

  it('refuses duplicate controls within one staged profile', () => {
    let profile = emptySonyBuzzStagedProfile('red')
    for (const buttonIndex of [0, 1]) {
      const staged = stageSonyBuzzCapture(profile, control(0, buttonIndex), TEAMS, EMPTY_GAMEPAD_MAPPING)
      expect(staged.ok).toBe(true)
      if (!staged.ok) return
      profile = staged.profile
    }
    const duplicate = stageSonyBuzzCapture(profile, control(0, 1), TEAMS, EMPTY_GAMEPAD_MAPPING)
    expect(duplicate.ok).toBe(false)
    if (duplicate.ok) return
    expect(duplicate.issues.join(' ')).toMatch(/already staged/i)
  })

  it('does not silently overwrite an active mapping control', () => {
    const active: GamepadMapping = {
      version: GAMEPAD_MAPPING_VERSION,
      bindings: [{ controllerIndex: 0, buttonIndex: 0, teamId: 'blue', action: PRIMARY_BUZZ }],
    }
    const result = stageSonyBuzzCapture(
      emptySonyBuzzStagedProfile('red'),
      control(0, 0),
      TEAMS,
      active,
    )
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.issues.join(' ')).toMatch(/already assigned/i)
    expect(result.issues.join(' ')).toMatch(/Nothing was overwritten/i)
    expect(active.bindings).toHaveLength(1)
  })
})

describe('preview, apply, and discard', () => {
  it('leaves the active mapping unchanged while staged', () => {
    const active: GamepadMapping = {
      version: GAMEPAD_MAPPING_VERSION,
      bindings: [{ controllerIndex: 0, buttonIndex: 9, teamId: 'blue', action: PRIMARY_BUZZ }],
    }
    const profile = captureAll('red', [
      control(0, 0),
      control(0, 1),
      control(0, 2),
      control(0, 3),
      control(0, 4),
    ])
    expect(isEmptyGamepadMapping(active)).toBe(false)
    expect(active).toEqual({
      version: GAMEPAD_MAPPING_VERSION,
      bindings: [{ controllerIndex: 0, buttonIndex: 9, teamId: 'blue', action: PRIMARY_BUZZ }],
    })
    expect(profile.staged).toHaveLength(5)
  })

  it('discard leaves the active mapping unchanged', () => {
    const active: GamepadMapping = {
      version: GAMEPAD_MAPPING_VERSION,
      bindings: [{ controllerIndex: 0, buttonIndex: 9, teamId: 'blue', action: PRIMARY_BUZZ }],
    }
    const profile = captureAll(
      'red',
      [control(0, 0), control(0, 1), control(0, 2), control(0, 3), control(0, 4)],
      active,
    )
    discardSonyBuzzStagedProfile('red')
    expect(active).toEqual({
      version: GAMEPAD_MAPPING_VERSION,
      bindings: [{ controllerIndex: 0, buttonIndex: 9, teamId: 'blue', action: PRIMARY_BUZZ }],
    })
    expect(profile.staged).toHaveLength(5)
  })

  it('apply validates through validateGamepadMapping', () => {
    const profile = captureAll('red', [
      control(0, 0),
      control(0, 1),
      control(0, 2),
      control(0, 3),
      control(0, 4),
    ])
    const applied = applySonyBuzzStagedProfile(profile, EMPTY_GAMEPAD_MAPPING, TEAMS)
    expect(applied.ok).toBe(true)
    if (!applied.ok) return
    expect(validateGamepadMapping(applied.mapping, TEAMS).ok).toBe(true)
    expect(applied.mapping.bindings).toHaveLength(5)
    expect(applied.mapping.bindings.filter((binding) => binding.teamId === 'red')).toHaveLength(5)
  })

  it('refuses apply when a staged control conflicts with another team binding', () => {
    const active: GamepadMapping = {
      version: GAMEPAD_MAPPING_VERSION,
      bindings: [{ controllerIndex: 0, buttonIndex: 2, teamId: 'blue', action: PRIMARY_BUZZ }],
    }
    const profile = captureAll('red', [
      control(0, 0),
      control(0, 1),
      control(0, 2),
      control(0, 3),
      control(0, 4),
    ])
    const applied = applySonyBuzzStagedProfile(profile, active, TEAMS)
    expect(applied.ok).toBe(false)
    if (applied.ok) return
    expect(applied.issues.join(' ')).toMatch(/conflict/i)
    expect(active.bindings).toHaveLength(1)
  })
})
