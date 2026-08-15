import { describe, expect, it } from 'vitest'
import { INITIAL_PUBLIC_STATE, isPublicState, type PublicState } from '../state/publicState'
import { overlayPublicTeamNames } from './overlayPublicTeamNames'

function availableTeams(): PublicState {
  return {
    ...INITIAL_PUBLIC_STATE,
    revision: 2,
    teams: {
      status: 'available',
      teams: [
        { key: 't0', name: 'Team 1', accent: 'crimson', score: 0 },
        { key: 't1', name: 'Team 2', accent: 'azure', score: 100 },
      ],
    },
  }
}

describe('overlayPublicTeamNames', () => {
  it('replaces public team names without adding wire keys', () => {
    const overlaid = overlayPublicTeamNames(availableTeams(), ['Comet Crew', 'Mantle Movers'])
    expect(isPublicState(overlaid)).toBe(true)
    expect(overlaid.teams).toEqual({
      status: 'available',
      teams: [
        { key: 't0', name: 'Comet Crew', accent: 'crimson', score: 0 },
        { key: 't1', name: 'Mantle Movers', accent: 'azure', score: 100 },
      ],
    })
    expect(JSON.stringify(overlaid)).not.toContain('teamNameBank')
    expect(JSON.stringify(overlaid)).not.toContain('WebHID')
    expect(JSON.stringify(overlaid)).not.toContain('054c')
  })

  it('leaves waiting public state untouched', () => {
    expect(overlayPublicTeamNames(INITIAL_PUBLIC_STATE, ['Comet Crew'])).toEqual(INITIAL_PUBLIC_STATE)
  })
})
