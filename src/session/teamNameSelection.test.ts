import { describe, expect, it } from 'vitest'
import {
  applyTeamNameInputs,
  claimedSessionTeamNames,
  createTeamNameSelectionState,
  sanitizeTeamNameBank,
  sessionTeamNamesAreUnique,
  TEAM_NAME_CHOICE_COLORS,
  visibleCandidatesAreGloballyUnique,
} from './teamNameSelection'

function bank(count: number, prefix = 'Name'): string[] {
  return Array.from({ length: count }, (_, index) => `${prefix} ${index + 1}`)
}

function candidatesOf(
  state: ReturnType<typeof createTeamNameSelectionState>,
  teamId: string,
): readonly string[] {
  return state.views[teamId]?.candidates ?? []
}

describe('team-name selection engine', () => {
  it('maps Yellow/Green/Orange/Blue as choices 1–4 and never treats Red as a choice color', () => {
    expect(TEAM_NAME_CHOICE_COLORS).toEqual(['yellow', 'green', 'orange', 'blue'])
    expect(TEAM_NAME_CHOICE_COLORS).not.toContain('red')
  })

  it('deals four unique candidates per team from a Game-owned bank', () => {
    const state = createTeamNameSelectionState({
      bank: bank(96),
      teamIds: ['a', 'b', 'c', 'd'],
    })
    expect(candidatesOf(state, 'a')).toEqual(['Name 1', 'Name 2', 'Name 3', 'Name 4'])
    expect(candidatesOf(state, 'b')).toEqual(['Name 5', 'Name 6', 'Name 7', 'Name 8'])
    expect(visibleCandidatesAreGloballyUnique(state)).toBe(true)
  })

  it('Red cycles only that team and never selects', () => {
    const start = createTeamNameSelectionState({
      bank: bank(20),
      teamIds: ['a', 'b'],
    })
    const beforeB = candidatesOf(start, 'b')
    const cycled = applyTeamNameInputs(start, [{ kind: 'cycle', teamId: 'a' }])
    expect(cycled.results[0]?.status).toBe('applied')
    expect(candidatesOf(cycled.state, 'a')).toEqual(['Name 9', 'Name 10', 'Name 11', 'Name 12'])
    expect(candidatesOf(cycled.state, 'b')).toEqual(beforeB)
    expect(cycled.state.views.a?.claimedName).toBeNull()
  })

  it('Yellow/Green/Orange/Blue claim the matching choice and lock that team', () => {
    const start = createTeamNameSelectionState({
      bank: bank(16),
      teamIds: ['a', 'b'],
    })
    const claimed = applyTeamNameInputs(start, [{ kind: 'claim', teamId: 'a', choiceIndex: 1 }])
    expect(claimed.results[0]?.status).toBe('applied')
    expect(claimed.state.views.a?.claimedName).toBe('Name 2')
    expect(claimed.state.views.a?.selectedChoiceIndex).toBe(1)
    const redAfter = applyTeamNameInputs(claimed.state, [{ kind: 'cycle', teamId: 'a' }])
    expect(redAfter.results[0]?.status).toBe('ignored')
    expect(redAfter.state.views.a?.claimedName).toBe('Name 2')
  })

  it('lets teams select independently in one simultaneous tick', () => {
    const start = createTeamNameSelectionState({
      bank: bank(16),
      teamIds: ['a', 'b'],
    })
    const next = applyTeamNameInputs(start, [
      { kind: 'claim', teamId: 'b', choiceIndex: 0 },
      { kind: 'claim', teamId: 'a', choiceIndex: 3 },
    ])
    expect(next.state.views.a?.claimedName).toBe('Name 4')
    expect(next.state.views.b?.claimedName).toBe('Name 5')
    expect(sessionTeamNamesAreUnique(Object.values(claimedSessionTeamNames(next.state)))).toBe(true)
  })

  it('keeps visible candidates unique across teams', () => {
    const start = createTeamNameSelectionState({
      bank: bank(12),
      teamIds: ['a', 'b', 'c'],
    })
    expect(visibleCandidatesAreGloballyUnique(start)).toBe(true)
    const cycled = applyTeamNameInputs(start, [{ kind: 'cycle', teamId: 'b' }])
    expect(visibleCandidatesAreGloballyUnique(cycled.state)).toBe(true)
    const all = ['a', 'b', 'c'].flatMap((id) => candidatesOf(cycled.state, id))
    expect(new Set(all).size).toBe(all.length)
  })

  it('resolves the same manual name conflict deterministically by team order', () => {
    const start = createTeamNameSelectionState({
      bank: bank(16),
      teamIds: ['a', 'b'],
    })
    const next = applyTeamNameInputs(start, [
      { kind: 'manual', teamId: 'b', name: 'Comet Crew' },
      { kind: 'manual', teamId: 'a', name: 'Comet Crew' },
    ])
    expect(next.state.views.a?.claimedName).toBe('Comet Crew')
    expect(next.results.find((item) => item.input.teamId === 'b')?.status).toBe('rejected-name-taken')
    expect(next.state.views.b?.claimedName).toBeNull()
  })

  it('excludes a claimed name from every later deal', () => {
    const start = createTeamNameSelectionState({
      bank: ['Alpha', 'Bravo', 'Charlie', 'Delta', 'Echo', 'Foxtrot', 'Golf', 'Hotel'],
      teamIds: ['a', 'b'],
    })
    const claimed = applyTeamNameInputs(start, [{ kind: 'claim', teamId: 'a', choiceIndex: 0 }])
    const cycled = applyTeamNameInputs(claimed.state, [{ kind: 'cycle', teamId: 'b' }])
    expect(candidatesOf(cycled.state, 'b')).not.toContain('Alpha')
    expect(cycled.state.views.a?.claimedName).toBe('Alpha')
  })

  it('replaces a cycling team with still-unique unused names after another claim', () => {
    const start = createTeamNameSelectionState({
      bank: bank(12),
      teamIds: ['a', 'b'],
    })
    const claimed = applyTeamNameInputs(start, [{ kind: 'claim', teamId: 'a', choiceIndex: 0 }])
    const cycled = applyTeamNameInputs(claimed.state, [{ kind: 'cycle', teamId: 'b' }])
    expect(candidatesOf(cycled.state, 'b')).toHaveLength(4)
    expect(candidatesOf(cycled.state, 'b')).not.toContain('Name 1')
    expect(visibleCandidatesAreGloballyUnique(cycled.state)).toBe(true)
  })

  it('wraps deterministically after a team exhausts eligible names', () => {
    const start = createTeamNameSelectionState({
      bank: bank(12),
      teamIds: ['a', 'b'],
    })
    const first = candidatesOf(start, 'a')
    const reservedB = candidatesOf(start, 'b')
    const once = applyTeamNameInputs(start, [{ kind: 'cycle', teamId: 'a' }])
    expect(candidatesOf(once.state, 'a')).toEqual(['Name 9', 'Name 10', 'Name 11', 'Name 12'])
    expect(candidatesOf(once.state, 'a')).not.toEqual(first)
    expect(candidatesOf(once.state, 'b')).toEqual(reservedB)
    const wrapped = applyTeamNameInputs(once.state, [{ kind: 'cycle', teamId: 'a' }])
    expect(candidatesOf(wrapped.state, 'a')).toEqual(first)
    expect(wrapped.state.views.a?.exhaustedOnce).toBe(true)
    expect(visibleCandidatesAreGloballyUnique(wrapped.state)).toBe(true)
  })

  it('advances immediately on repeated Red presses with no cooldown in the engine', () => {
    let state = createTeamNameSelectionState({
      bank: bank(20),
      teamIds: ['a', 'b'],
    })
    const seen: string[][] = [ [...candidatesOf(state, 'a')] ]
    for (let i = 0; i < 4; i += 1) {
      const next = applyTeamNameInputs(state, [{ kind: 'cycle', teamId: 'a' }])
      expect(next.results[0]?.status).toBe('applied')
      state = next.state
      seen.push([...candidatesOf(state, 'a')])
    }
    expect(new Set(seen.map((row) => row.join('|'))).size).toBeGreaterThan(1)
    expect(candidatesOf(state, 'b')).toEqual(['Name 5', 'Name 6', 'Name 7', 'Name 8'])
  })

  it('supports the 1-team and 8-team logical boundaries', () => {
    const one = createTeamNameSelectionState({ bank: bank(8), teamIds: ['only'] })
    expect(candidatesOf(one, 'only')).toHaveLength(4)
    const eightIds = Array.from({ length: 8 }, (_, index) => `t${index + 1}`)
    const eight = createTeamNameSelectionState({ bank: bank(40), teamIds: eightIds })
    expect(eight.teamIds).toHaveLength(8)
    expect(visibleCandidatesAreGloballyUnique(eight)).toBe(true)
    const claimed = applyTeamNameInputs(
      eight,
      eightIds.map((teamId, index) => ({
        kind: 'claim' as const,
        teamId,
        choiceIndex: (index % 4) as 0 | 1 | 2 | 3,
      })),
    )
    expect(Object.keys(claimedSessionTeamNames(claimed.state))).toHaveLength(8)
    expect(sessionTeamNamesAreUnique(Object.values(claimedSessionTeamNames(claimed.state)))).toBe(true)
  })

  it('covers all four logical Sony slots independently', () => {
    const start = createTeamNameSelectionState({
      bank: bank(32),
      teamIds: ['t1', 't2', 't3', 't4'],
    })
    const next = applyTeamNameInputs(start, [
      { kind: 'claim', teamId: 't1', choiceIndex: 0 },
      { kind: 'claim', teamId: 't2', choiceIndex: 1 },
      { kind: 'claim', teamId: 't3', choiceIndex: 2 },
      { kind: 'claim', teamId: 't4', choiceIndex: 3 },
    ])
    expect(Object.values(claimedSessionTeamNames(next.state))).toEqual([
      'Name 1',
      'Name 6',
      'Name 11',
      'Name 16',
    ])
  })

  it('accepts manual keyboard assignment as a complete equivalent path', () => {
    const start = createTeamNameSelectionState({
      bank: bank(8),
      teamIds: ['a', 'b'],
    })
    const next = applyTeamNameInputs(start, [
      { kind: 'manual', teamId: 'a', name: '  Mantle Movers  ' },
      { kind: 'manual', teamId: 'b', name: 'Ozone Owls' },
    ])
    expect(claimedSessionTeamNames(next.state)).toEqual({
      a: 'Mantle Movers',
      b: 'Ozone Owls',
    })
  })

  it('handles a small bank without inventing names or violating uniqueness', () => {
    const start = createTeamNameSelectionState({
      bank: ['Only One', 'Only Two', 'Only Two', ''],
      teamIds: ['a', 'b'],
    })
    expect(start.bank).toEqual(['Only One', 'Only Two'])
    expect(candidatesOf(start, 'a')).toEqual(['Only One', 'Only Two'])
    expect(candidatesOf(start, 'b')).toEqual([])
    const claimed = applyTeamNameInputs(start, [{ kind: 'claim', teamId: 'a', choiceIndex: 0 }])
    const cycled = applyTeamNameInputs(claimed.state, [{ kind: 'cycle', teamId: 'b' }])
    expect(candidatesOf(cycled.state, 'b')).toEqual(['Only Two'])
    expect(visibleCandidatesAreGloballyUnique(cycled.state)).toBe(true)
  })

  it('sanitizes the Game-owned bank without mutating the source array', () => {
    const source = ['  Comet Crew ', 'comet crew', 'Too long '.repeat(20), 'Valid']
    const cleaned = sanitizeTeamNameBank(source)
    expect(cleaned).toEqual(['Comet Crew', 'Valid'])
    expect(source[0]).toBe('  Comet Crew ')
  })
})
