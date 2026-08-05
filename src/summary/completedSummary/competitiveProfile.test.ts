import { describe, expect, it } from 'vitest'
import { deriveCompetitiveProfileV1 } from './competitiveProfile'
import { completedHistory } from './testHistory'

describe('deriveCompetitiveProfileV1', () => {
  it('derives the profile from the same authoritative history and definition', async () => {
    const result = await deriveCompetitiveProfileV1(completedHistory().history)
    expect(result.status).toBe('available')
    if (result.status !== 'available') throw new Error('expected profile')
    expect(result.profile).toMatchObject({
      kind: 'classroom-quiz-show/competitive-profile',
      version: 1,
      summaryContract: {
        kind: 'classroom-quiz-show/session-summary',
        version: 1,
      },
      game: { gameId: 'team-board-game' },
      scoring: { kind: 'integer-points', version: 1 },
      teams: {
        count: 2,
        orderedTeamIds: ['red', 'blue'],
        identitySemantics: 'authored-team-id-within-exact-definition',
      },
      finalSemantics: {
        presence: 'absent',
        eligibilityMode: 'unavailable',
        responseCaptureMode: 'unavailable',
      },
    })
    expect(result.profile.rounds).toEqual([
      { authoredRoundType: 'category-board', summarySupport: 'supported' },
    ])
    expect(result.profile.game.canonicalDefinitionSha256).toMatch(/^[0-9a-f]{64}$/)
    expect(Object.isFrozen(result.profile)).toBe(true)
  })

  it('fails closed when no completed summary can be derived', async () => {
    await expect(deriveCompetitiveProfileV1([])).resolves.toMatchObject({
      status: 'unavailable',
    })
  })
})
