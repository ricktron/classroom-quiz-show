import type { CompetitiveProfileV1 } from './competitiveProfile'
import type { CompletedSummaryRecordV1 } from './record'
import type { SessionSummaryV1 } from '../contract'

export function summaryFixture(overrides: Partial<SessionSummaryV1> = {}): SessionSummaryV1 {
  return {
    kind: 'classroom-quiz-show/session-summary',
    version: 1,
    derivationBasis: {
      kind: 'effective-history-and-replay',
      effectiveEventCount: 3,
      historyEventCount: 3,
    },
    sessionId: 'session-1',
    gameId: 'game-1',
    gameTitle: 'Game One',
    recordedSessionStartAt: 10,
    recordedCompletionAt: 20,
    terminalPath: 'ordinary-or-host-ended',
    scoreActivity: {
      observed: {
        scoreChangeCount: 2,
        tileLinkedAdjustmentCount: 1,
        manualAdjustmentCount: 1,
        finalSettlementCount: 0,
        perTeam: [
          {
            teamId: 'red',
            teamName: 'Red',
            scoreChangeCount: 1,
            netDelta: 100,
            finalScore: 100,
          },
          {
            teamId: 'blue',
            teamName: 'Blue',
            scoreChangeCount: 1,
            netDelta: 50,
            finalScore: 50,
          },
        ],
      },
      derived: {
        standings: [
          { rank: 1, teamId: 'red', teamName: 'Red', finalScore: 100, tied: false },
          { rank: 2, teamId: 'blue', teamName: 'Blue', finalScore: 50, tied: false },
        ],
      },
    },
    timerActivity: {
      observed: {
        starts: 1,
        pauses: 0,
        resumes: 0,
        expirations: 0,
        interruptions: 1,
        resets: 0,
      },
    },
    buzzActivity: {
      observed: { acceptedBuzzCount: 2, activeResponseResolutionCount: 1 },
    },
    categoryBoards: { kind: 'none', reason: 'no-category-board-rounds' },
    finalWager: { kind: 'unavailable', reason: 'no-final-round' },
    unavailableRounds: [],
    ...overrides,
  }
}

export function profileFixture(
  overrides: Partial<CompetitiveProfileV1> = {},
): CompetitiveProfileV1 {
  return {
    kind: 'classroom-quiz-show/competitive-profile',
    version: 1,
    summaryContract: {
      kind: 'classroom-quiz-show/session-summary',
      version: 1,
    },
    game: {
      gameId: 'game-1',
      canonicalDefinitionSha256: 'a'.repeat(64),
    },
    scoring: { kind: 'integer-points', version: 1 },
    teams: {
      count: 2,
      orderedTeamIds: ['red', 'blue'],
      identitySemantics: 'authored-team-id-within-exact-definition',
    },
    rounds: [{ authoredRoundType: 'category-board', summarySupport: 'supported' }],
    finalSemantics: {
      presence: 'absent',
      eligibilityMode: 'unavailable',
      responseCaptureMode: 'unavailable',
    },
    ...overrides,
  }
}

export function recordFixture(
  overrides: Partial<CompletedSummaryRecordV1> = {},
): CompletedSummaryRecordV1 {
  const summary = overrides.summary ?? summaryFixture()
  return {
    kind: 'classroom-quiz-show/completed-summary-record',
    version: 1,
    recordId: summary.sessionId,
    savedAt: 30,
    classLabel: null,
    competitiveProfile: profileFixture(),
    summary,
    ...overrides,
  }
}
