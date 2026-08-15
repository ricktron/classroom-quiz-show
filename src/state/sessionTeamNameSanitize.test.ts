import { describe, expect, it } from 'vitest'
import { createSessionStore } from './store'
import { isPublicState, PUBLIC_STATE_SCHEMA_VERSION } from './publicState'
import { importGameFromUnknown } from '../import/importGame'
import { teamBoardGameFile, twoTeams } from '../test/teamFixtures'

const AT = 1_000

function teamStore() {
  const result = importGameFromUnknown(teamBoardGameFile(twoTeams()))
  if (result.status !== 'success') throw new Error('fixture failed to import')
  const store = createSessionStore()
  store.dispatch({ type: 'INIT_SESSION', issuedAt: AT, sessionId: 'SECRET-SESSION' })
  store.dispatch({ type: 'INITIALIZE_GAME', issuedAt: AT, definition: result.definition })
  return store
}

describe('session team names project through the sanitizer', () => {
  it('keeps authored names as the public fallback until a Session identity exists', () => {
    const publicState = teamStore().getPublicState()
    expect(isPublicState(publicState)).toBe(true)
    expect(publicState.schemaVersion).toBe(PUBLIC_STATE_SCHEMA_VERSION)
    expect(publicState.teams).toEqual({
      status: 'available',
      teams: [
        { key: 't0', name: 'Red Team', accent: 'crimson', score: 0 },
        { key: 't1', name: 'Blue Team', accent: 'azure', score: 0 },
      ],
    })
    expect(JSON.stringify(publicState)).not.toContain('sessionTeamNames')
    expect(JSON.stringify(publicState)).not.toContain('SECRET-SESSION')
  })

  it('projects a selected Session name onto the existing public name field only', () => {
    const store = teamStore()
    store.dispatch({ type: 'SET_SESSION_TEAM_NAME', issuedAt: AT, teamId: 'red', name: 'Comet Crew' })
    const publicState = store.getPublicState()
    expect(isPublicState(publicState)).toBe(true)
    expect(publicState.teams).toEqual({
      status: 'available',
      teams: [
        { key: 't0', name: 'Comet Crew', accent: 'crimson', score: 0 },
        { key: 't1', name: 'Blue Team', accent: 'azure', score: 0 },
      ],
    })
    const keys = publicState.teams && publicState.teams.status === 'available'
      ? Object.keys(publicState.teams.teams[0] ?? {})
      : []
    expect(keys.sort()).toEqual(['accent', 'key', 'name', 'score'])
    expect(JSON.stringify(publicState)).not.toContain('teamNameBank')
    expect(JSON.stringify(publicState)).not.toContain('WebHID')
    expect(JSON.stringify(publicState)).not.toContain('054c')
  })

  it('does not bump the public-state wire version for a value-only name change', () => {
    expect(PUBLIC_STATE_SCHEMA_VERSION).toBe(8)
    const store = teamStore()
    store.dispatch({ type: 'SET_SESSION_TEAM_NAME', issuedAt: AT, teamId: 'blue', name: 'Mantle Movers' })
    expect(store.getPublicState().schemaVersion).toBe(8)
  })
})
