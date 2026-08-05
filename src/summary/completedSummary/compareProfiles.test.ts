import { describe, expect, it } from 'vitest'
import { compareCompetitiveProfiles } from './compareProfiles'
import { profileFixture } from './testFixtures'

describe('compareCompetitiveProfiles', () => {
  it('reports compatible only when every semantic field matches', () => {
    expect(compareCompetitiveProfiles(profileFixture(), profileFixture())).toEqual({
      compatible: true,
      reasons: [],
    })
  })

  it('returns stable reason codes for mismatched dimensions', () => {
    const left = profileFixture()
    const right = profileFixture({
      summaryContract: { kind: 'classroom-quiz-show/session-summary', version: 2 as 1 },
      game: { gameId: 'other', canonicalDefinitionSha256: 'b'.repeat(64) },
      scoring: { kind: 'integer-points', version: 2 as 1 },
      teams: {
        count: 1,
        orderedTeamIds: ['red'],
        identitySemantics: 'authored-team-id-within-exact-definition',
      },
      rounds: [{ authoredRoundType: 'final-wager', summarySupport: 'unsupported' }],
      finalSemantics: {
        presence: 'present',
        eligibilityMode: 'classic',
        responseCaptureMode: 'host-only',
      },
    })

    expect(compareCompetitiveProfiles(left, right)).toEqual({
      compatible: false,
      reasons: [
        'summary-contract',
        'game-id',
        'definition-fingerprint',
        'scoring',
        'teams',
        'rounds',
        'final-semantics',
      ],
    })
  })
})
