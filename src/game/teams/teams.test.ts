import { describe, expect, it } from 'vitest'
import {
  TEAM_ACCENTS,
  defaultTeamAccent,
  isTeamAccent,
  teamAccentClass,
} from './accents'
import {
  MAX_TEAMS,
  MAX_TEAM_NAME_LENGTH,
  MIN_TEAMS,
  TEAM_ID_PATTERN,
  TEAM_MAX_ID_LENGTH,
} from './limits'
import {
  NO_TEAMS,
  TeamConfigError,
  createTeamDefinitions,
  findTeamById,
  isTeamDefinition,
  isTeamDefinitionList,
  readTeamDefinitions,
  teamIndexById,
} from './definition'
import { teamsSchema } from './schema'
import { ID_PATTERN, MAX_ID_LENGTH } from '../../import/canonicalFormat'
import { createGameDefinition, GameDefinitionError } from '../gameDefinition'
import { placeholderRound } from '../roundDefinition'
import { team, teamsList, twoTeams } from '../../test/teamFixtures'

/**
 * The team model (Slice 6).
 *
 * The load-bearing claims proved here:
 *  - identity is the authored id and ordering is the authored array position;
 *  - nothing is coerced, generated, renamed, de-duplicated, or repaired;
 *  - imported content can only NAME an accent from the application palette;
 *  - trusted definitions are immutable, and a caller's array cannot reach into
 *    them afterwards.
 */

describe('the accent palette', () => {
  it('is a fixed, application-controlled list of plain tokens', () => {
    expect(TEAM_ACCENTS).toHaveLength(8)
    for (const accent of TEAM_ACCENTS) {
      expect(accent).toMatch(/^[a-z][a-z0-9-]*$/)
    }
  })

  it('has one accent per permitted team, so eight teams can all differ', () => {
    expect(TEAM_ACCENTS.length).toBe(MAX_TEAMS)
  })

  it('recognizes only its own tokens', () => {
    expect(isTeamAccent('crimson')).toBe(true)
    expect(isTeamAccent('CRIMSON')).toBe(false)
    expect(isTeamAccent('#ff0000')).toBe(false)
    expect(isTeamAccent('red; background: url(x)')).toBe(false)
    expect(isTeamAccent(undefined)).toBe(false)
    expect(isTeamAccent(123)).toBe(false)
  })

  it('assigns positional defaults deterministically and wraps safely', () => {
    expect(defaultTeamAccent(0)).toBe(TEAM_ACCENTS[0])
    expect(defaultTeamAccent(3)).toBe(TEAM_ACCENTS[3])
    expect(defaultTeamAccent(TEAM_ACCENTS.length)).toBe(TEAM_ACCENTS[0])
    expect(defaultTeamAccent(-1)).toBe(TEAM_ACCENTS[TEAM_ACCENTS.length - 1])
    expect(defaultTeamAccent(1.5)).toBe(TEAM_ACCENTS[0])
  })

  it('maps a token to a class name and nothing else', () => {
    expect(teamAccentClass('crimson')).toBe('accent--crimson')
  })
})

describe('the identifier grammar mirrors the canonical one', () => {
  it('is byte-identical to the import layer pattern, so they cannot drift', () => {
    expect(TEAM_ID_PATTERN.source).toBe(ID_PATTERN.source)
    expect(TEAM_MAX_ID_LENGTH).toBe(MAX_ID_LENGTH)
  })

  it('cannot express the `__proto__` key', () => {
    // The leading-alphanumeric rule excludes it outright. (`constructor` and
    // `prototype` DO satisfy the grammar as ids; they are rejected as object KEYS
    // by the pre-Zod document safety scan, which is a different boundary.)
    expect(TEAM_ID_PATTERN.test('__proto__')).toBe(false)
  })
})

describe('createTeamDefinitions — trusted construction', () => {
  it('builds one team with an explicit accent', () => {
    const teams = createTeamDefinitions([{ id: 'red', name: 'Red Team', accent: 'crimson' }])
    expect(teams).toHaveLength(1)
    expect(teams[0]).toEqual({ id: 'red', name: 'Red Team', accent: 'crimson', order: 0 })
  })

  it('accepts a ONE-team game (individual review / demonstration)', () => {
    expect(MIN_TEAMS).toBe(1)
    expect(createTeamDefinitions(teamsList(1))).toHaveLength(1)
  })

  it('accepts the maximum team count and rejects one more', () => {
    expect(createTeamDefinitions(teamsList(MAX_TEAMS))).toHaveLength(MAX_TEAMS)
    expect(() => createTeamDefinitions(teamsList(MAX_TEAMS + 1))).toThrow(TeamConfigError)
  })

  it('preserves authored order exactly and freezes it onto `order`', () => {
    const teams = createTeamDefinitions([team('zulu'), team('alpha'), team('mike')])
    expect(teams.map((t) => t.id)).toEqual(['zulu', 'alpha', 'mike'])
    expect(teams.map((t) => t.order)).toEqual([0, 1, 2])
  })

  it('applies the documented positional accent default when none is authored', () => {
    const teams = createTeamDefinitions(teamsList(3))
    expect(teams.map((t) => t.accent)).toEqual([
      TEAM_ACCENTS[0],
      TEAM_ACCENTS[1],
      TEAM_ACCENTS[2],
    ])
  })

  it('allows two teams to share an accent — colour is not identity', () => {
    const teams = createTeamDefinitions([
      { id: 'a', name: 'A', accent: 'crimson' },
      { id: 'b', name: 'B', accent: 'crimson' },
    ])
    expect(teams.map((t) => t.accent)).toEqual(['crimson', 'crimson'])
  })

  it('allows two teams to share a NAME — identity is the id', () => {
    const teams = createTeamDefinitions([
      { id: 'a', name: 'Team One' },
      { id: 'b', name: 'Team One' },
    ])
    expect(teams.map((t) => t.id)).toEqual(['a', 'b'])
  })

  it('rejects a duplicate team id rather than de-duplicating it', () => {
    expect(() => createTeamDefinitions([team('red'), team('red')])).toThrow(TeamConfigError)
  })

  it('rejects a blank name rather than inventing one', () => {
    expect(() => createTeamDefinitions([team('red', { name: '   ' })])).toThrow(TeamConfigError)
    expect(() => createTeamDefinitions([team('red', { name: '' })])).toThrow(TeamConfigError)
  })

  it('rejects an accent that is not in the palette rather than substituting one', () => {
    expect(() => createTeamDefinitions([team('red', { accent: 'ultraviolet' })])).toThrow(
      TeamConfigError,
    )
    expect(() => createTeamDefinitions([team('red', { accent: '#ff0000' })])).toThrow(
      TeamConfigError,
    )
  })

  it('rejects an unknown team field rather than dropping it', () => {
    expect(() => createTeamDefinitions([team('red', { colour: 'red' })])).toThrow(TeamConfigError)
    expect(() => createTeamDefinitions([team('red', { score: 100 })])).toThrow(TeamConfigError)
  })

  it('rejects a missing id rather than generating one', () => {
    expect(() => createTeamDefinitions([{ name: 'Nameless' }])).toThrow(TeamConfigError)
  })

  it('rejects an EMPTY array — "no teams" is expressed by omitting the field', () => {
    expect(() => createTeamDefinitions([])).toThrow(TeamConfigError)
  })

  it('rejects a non-array, and coerces nothing', () => {
    for (const bad of [null, undefined, {}, 'red', 3, [null], [['red']]]) {
      expect(() => createTeamDefinitions(bad)).toThrow(TeamConfigError)
    }
  })

  it('does not coerce a numeric id or name into a string', () => {
    expect(() => createTeamDefinitions([{ id: 1, name: 'One' }])).toThrow(TeamConfigError)
    expect(() => createTeamDefinitions([{ id: 'one', name: 1 }])).toThrow(TeamConfigError)
  })

  it('rejects an overlong name rather than truncating it', () => {
    const name = 'x'.repeat(MAX_TEAM_NAME_LENGTH + 1)
    expect(() => createTeamDefinitions([team('red', { name })])).toThrow(TeamConfigError)
    expect(createTeamDefinitions([team('red', { name: 'x'.repeat(MAX_TEAM_NAME_LENGTH) })])[0].name)
      .toHaveLength(MAX_TEAM_NAME_LENGTH)
  })

  it('rejects an overlong id rather than truncating it', () => {
    const id = `a${'b'.repeat(TEAM_MAX_ID_LENGTH)}`
    expect(() => createTeamDefinitions([team(id)])).toThrow(TeamConfigError)
  })

  it('produces DEEP-FROZEN definitions', () => {
    const teams = createTeamDefinitions(twoTeams())
    expect(Object.isFrozen(teams)).toBe(true)
    expect(Object.isFrozen(teams[0])).toBe(true)
    expect(() => {
      ;(teams[0] as { name: string }).name = 'Hacked'
    }).toThrow()
    expect(teams[0].name).toBe('Red Team')
  })

  it('does not mutate the caller input, and a later mutation cannot reach it', () => {
    const input = [{ id: 'red', name: 'Red Team' }]
    const teams = createTeamDefinitions(input)
    input[0].name = 'Changed'
    input.push({ id: 'blue', name: 'Blue Team' })
    expect(teams).toHaveLength(1)
    expect(teams[0].name).toBe('Red Team')
    // The caller's own objects are still its own — construction froze nothing of theirs.
    expect(Object.isFrozen(input[0])).toBe(false)
  })

  it('is deterministic — the same input always yields the same definitions', () => {
    expect(createTeamDefinitions(twoTeams())).toEqual(createTeamDefinitions(twoTeams()))
  })
})

describe('readTeamDefinitions — total, fail-closed read', () => {
  it('returns definitions for valid input and null for anything else', () => {
    expect(readTeamDefinitions(twoTeams())).toHaveLength(2)
    expect(readTeamDefinitions([team('a'), team('a')])).toBeNull()
    expect(readTeamDefinitions('nope')).toBeNull()
    expect(readTeamDefinitions([])).toBeNull()
  })
})

describe('the structural guards', () => {
  it('accepts a real team and rejects malformed ones', () => {
    const [red] = createTeamDefinitions(twoTeams())
    expect(isTeamDefinition(red)).toBe(true)
    expect(isTeamDefinition(null)).toBe(false)
    expect(isTeamDefinition({})).toBe(false)
    expect(isTeamDefinition({ id: '', name: 'x', accent: 'crimson', order: 0 })).toBe(false)
    expect(isTeamDefinition({ id: 'a', name: '', accent: 'crimson', order: 0 })).toBe(false)
    expect(isTeamDefinition({ id: 'a', name: 'x', accent: 'nope', order: 0 })).toBe(false)
    expect(isTeamDefinition({ id: 'a', name: 'x', accent: 'crimson', order: -1 })).toBe(false)
    expect(isTeamDefinition({ id: 'a', name: 'x', accent: 'crimson', order: 1.5 })).toBe(false)
  })

  it('accepts an empty list, because a game with no teams is valid', () => {
    expect(isTeamDefinitionList([])).toBe(true)
    expect(isTeamDefinitionList(NO_TEAMS)).toBe(true)
    expect(isTeamDefinitionList(undefined)).toBe(false)
    expect(isTeamDefinitionList([{}])).toBe(false)
  })
})

describe('lookups', () => {
  it('find a team by id, and report a miss explicitly', () => {
    const teams = createTeamDefinitions(twoTeams())
    expect(findTeamById(teams, 'blue')?.name).toBe('Blue Team')
    expect(findTeamById(teams, 'green')).toBeNull()
    expect(teamIndexById(teams, 'blue')).toBe(1)
    expect(teamIndexById(teams, 'green')).toBe(-1)
  })
})

describe('teams on the GameDefinition', () => {
  const rounds = [placeholderRound('r1', 'Round One')]

  it('default to an empty list when the game configures none', () => {
    const definition = createGameDefinition({ id: 'g', title: 'G', rounds })
    expect(definition.teams).toEqual([])
    expect(Object.isFrozen(definition.teams)).toBe(true)
  })

  it('are carried, ordered and frozen on the definition', () => {
    const definition = createGameDefinition({
      id: 'g',
      title: 'G',
      rounds,
      teams: createTeamDefinitions(twoTeams()),
    })
    expect(definition.teams.map((t) => t.id)).toEqual(['red', 'blue'])
    expect(Object.isFrozen(definition.teams[0])).toBe(true)
  })

  it('cannot be mutated through the caller array afterwards', () => {
    const teams = [...createTeamDefinitions(twoTeams())]
    const definition = createGameDefinition({ id: 'g', title: 'G', rounds, teams })
    teams.pop()
    expect(definition.teams).toHaveLength(2)
  })

  it('reject an invalid teams list at the trusted factory too', () => {
    expect(() =>
      createGameDefinition({
        id: 'g',
        title: 'G',
        rounds,
        teams: [{ id: 'a' }] as never,
      }),
    ).toThrow(GameDefinitionError)
  })

  it('reject a duplicate id even if the caller assembled the list by hand', () => {
    const [red] = createTeamDefinitions(twoTeams())
    expect(() =>
      createGameDefinition({ id: 'g', title: 'G', rounds, teams: [red, red] }),
    ).toThrow(GameDefinitionError)
  })
})

describe('the teams schema itself', () => {
  it('performs no coercion, no defaulting and no transform', () => {
    const source = teamsSchema.toString()
    expect(source).not.toContain('coerce')
    const parsed = teamsSchema.safeParse([{ id: 'red', name: 'Red Team' }])
    expect(parsed.success).toBe(true)
    // The output has no `accent`: the schema did NOT fill one in. The documented
    // default belongs to the trusted constructor, and only to it.
    if (parsed.success) expect(parsed.data[0]).not.toHaveProperty('accent')
  })
})
