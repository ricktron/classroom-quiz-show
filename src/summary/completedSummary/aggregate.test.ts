import { describe, expect, it } from 'vitest'
import {
  aggregateByGame,
  aggregateByTeam,
  aggregateForClassLabel,
} from './aggregate'
import { recordFixture, summaryFixture } from './testFixtures'

const second = recordFixture({
  recordId: 'session-2',
  savedAt: 40,
  classLabel: 'Period 1',
  summary: summaryFixture({
    sessionId: 'session-2',
    scoreActivity: {
      observed: {
        scoreChangeCount: 1,
        tileLinkedAdjustmentCount: 1,
        manualAdjustmentCount: 0,
        finalSettlementCount: 0,
        perTeam: [
          {
            teamId: 'red',
            teamName: 'Red',
            scoreChangeCount: 1,
            netDelta: 200,
            finalScore: 200,
          },
          {
            teamId: 'blue',
            teamName: 'Blue',
            scoreChangeCount: 0,
            netDelta: 0,
            finalScore: 0,
          },
        ],
      },
      derived: {
        standings: [
          { rank: 1, teamId: 'red', teamName: 'Red', finalScore: 200, tied: false },
          { rank: 2, teamId: 'blue', teamName: 'Blue', finalScore: 0, tied: false },
        ],
      },
    },
  }),
})

describe('completed summary aggregation', () => {
  it('rolls up games and labels totals, counts, and averages truthfully', () => {
    const rows = aggregateByGame([recordFixture({ classLabel: 'Period 2' }), second])
    expect(rows).toEqual([
      {
        gameId: 'game-1',
        gameTitle: 'Game One',
        sessionCount: 2,
        totalScoreChangeCount: 3,
        totalAcceptedBuzzCount: 4,
        averageScoreChangeCountPerSession: 1.5,
      },
    ])
  })

  it('rolls up authored team identities within compatible records', () => {
    expect(aggregateByTeam([recordFixture(), second])[0]).toEqual({
      teamId: 'red',
      teamName: 'Red',
      sessionCount: 2,
      totalFinalScore: 300,
      averageFinalScorePerSession: 150,
      totalScoreChangeCount: 2,
    })
  })

  it('filters exact class labels before aggregating', () => {
    const rows = aggregateForClassLabel(
      [recordFixture({ classLabel: 'Period 2' }), second],
      'Period 1',
    )
    expect(rows.sessionCount).toBe(1)
    expect(rows.games[0]?.sessionCount).toBe(1)
    expect(rows.teams[0]?.totalFinalScore).toBe(200)
    expect(rows.incompatibleExcludedCount).toBe(0)
  })

  it('excludes incompatible profiles from game and class rollups', () => {
    const incompatible = recordFixture({
      recordId: 'other-game',
      competitiveProfile: {
        ...recordFixture().competitiveProfile,
        game: {
          gameId: 'game-1',
          canonicalDefinitionSha256: 'b'.repeat(64),
        },
      },
      summary: summaryFixture({ sessionId: 'other-game', gameId: 'game-1' }),
    })
    expect(aggregateByGame([recordFixture(), incompatible])).toHaveLength(1)
    const classRollup = aggregateForClassLabel([recordFixture(), incompatible], null)
    expect(classRollup.incompatibleExcludedCount).toBe(1)
    expect(classRollup.sessionCount).toBe(1)
  })
})
