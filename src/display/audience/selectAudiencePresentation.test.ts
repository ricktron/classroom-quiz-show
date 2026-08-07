import { describe, expect, it } from 'vitest'
import {
  INITIAL_PUBLIC_STATE,
  PUBLIC_BOARD_KIND,
  PUBLIC_FINAL_KIND,
  PUBLIC_STATE_SCHEMA_VERSION,
  type PublicCategoryBoardState,
  type PublicFinalWagerState,
  type PublicResponseState,
  type PublicState,
  type PublicTeam,
  type PublicTeamsState,
} from '../../state/publicState'
import {
  selectAudiencePresentation,
  selectPublicTimer,
  selectScoreLayoutFromTeams,
  selectScoreLayoutMode,
  selectUniqueLeader,
} from './selectAudiencePresentation'

const TEXT_PROMPT = { kind: 'text' as const, text: 'What is the capital?' }

function team(key: string, name: string, accent: string, score: number): PublicTeam {
  return { key, name, accent, score }
}

function available(...teams: PublicTeam[]): PublicTeamsState {
  return { status: 'available', teams }
}

function baseState(overrides: Partial<PublicState> = {}): PublicState {
  return {
    ...INITIAL_PUBLIC_STATE,
    revision: 1,
    phase: 'ready',
    headline: 'Session ready',
    detail: 'Playing',
    game: {
      status: 'active',
      roundCount: 4,
      currentRound: 2,
      roundAvailability: 'available',
    },
    ...overrides,
  }
}

const OPEN_BOARD: PublicCategoryBoardState = {
  kind: PUBLIC_BOARD_KIND,
  stage: 'board',
  categories: [
    {
      key: 'c0',
      title: 'Science',
      tiles: [
        { key: 'c0t0', value: 100, used: true },
        { key: 'c0t1', value: 200, used: true },
      ],
    },
    {
      key: 'c1',
      title: 'History',
      tiles: [
        { key: 'c1t0', value: 100, used: false },
        { key: 'c1t1', value: 200, used: true },
      ],
    },
  ],
}

const IDLE_RESPONSE: PublicResponseState = {
  armed: false,
  timer: { status: 'idle' },
  buzz: { status: 'none' },
}

describe('selectScoreLayoutMode', () => {
  it('maps team counts 1–4 to column, 5–6 to strip, 7–8 to deck', () => {
    expect(selectScoreLayoutMode(0)).toBe('none')
    for (let n = 1; n <= 4; n += 1) expect(selectScoreLayoutMode(n)).toBe('column')
    expect(selectScoreLayoutMode(5)).toBe('strip')
    expect(selectScoreLayoutMode(6)).toBe('strip')
    expect(selectScoreLayoutMode(7)).toBe('deck')
    expect(selectScoreLayoutMode(8)).toBe('deck')
  })
})

describe('selectUniqueLeader', () => {
  it('identifies a unique maximum without ranking the authored list', () => {
    const teams = available(
      team('t0', 'Alpha', 'crimson', 100),
      team('t1', 'Bravo', 'azure', 400),
      team('t2', 'Charlie', 'emerald', 200),
    )
    const result = selectUniqueLeader('unique-leader', teams)
    expect(result.leaderTeamKey).toBe('t1')
    expect(result.leaderTeamName).toBe('Bravo')
    expect(teams.status).toBe('available')
    if (teams.status === 'available') {
      expect(teams.teams.map((t) => t.key)).toEqual(['t0', 't1', 't2'])
    }
  })

  it('returns null leader fields when unique-leader scores are tied or absent', () => {
    expect(
      selectUniqueLeader(
        'unique-leader',
        available(team('t0', 'A', 'crimson', 10), team('t1', 'B', 'azure', 10)),
      ).leaderTeamKey,
    ).toBeNull()
    expect(selectUniqueLeader('unique-leader', null).leaderTeamKey).toBeNull()
    expect(selectUniqueLeader('tied', available(team('t0', 'A', 'crimson', 50))).outcome).toBe(
      'tied',
    )
  })
})

describe('selectAudiencePresentation', () => {
  it('keeps public wire version 8 as the only schema in fixtures', () => {
    expect(PUBLIC_STATE_SCHEMA_VERSION).toBe(8)
    expect(baseState().schemaVersion).toBe(8)
  })

  it('maps top-level waiting, ready, unavailable, and complete scenes', () => {
    expect(selectAudiencePresentation(INITIAL_PUBLIC_STATE).scene).toBe('waiting')
    expect(
      selectAudiencePresentation(
        baseState({ phase: 'ready', round: null, game: { ...baseState().game!, currentRound: null } }),
      ).scene,
    ).toBe('ready')
    const unavailable = selectAudiencePresentation(
      baseState({
        game: {
          status: 'active',
          roundCount: 2,
          currentRound: 1,
          roundAvailability: 'unavailable',
        },
        round: null,
      }),
    )
    expect(unavailable.scene).toBe('unavailable')
    expect(unavailable.nexus.stageLabel).toMatch(/not available/i)
    expect(
      selectAudiencePresentation(
        baseState({
          game: {
            status: 'ended',
            roundCount: 2,
            currentRound: null,
            roundAvailability: 'none',
          },
          round: null,
        }),
      ).scene,
    ).toBe('complete')
  })

  it('exhaustively maps category-board stages', () => {
    const stages: Array<PublicCategoryBoardState['stage']> = [
      'board',
      'selected',
      'prompt',
      'answer',
    ]
    for (const stage of stages) {
      const round: PublicCategoryBoardState =
        stage === 'board'
          ? OPEN_BOARD
          : {
              kind: PUBLIC_BOARD_KIND,
              stage,
              selection: {
                categoryTitle: 'Science',
                value: 200,
                prompt: stage === 'selected' ? null : TEXT_PROMPT,
                answer: stage === 'answer' ? 'Paris' : null,
              },
            }
      const presentation = selectAudiencePresentation(baseState({ round }))
      if (stage === 'board') {
        expect(presentation.scene).toBe('board')
        expect(presentation.primaryContent).toBe('board')
        expect(presentation.showDecorativeLattice).toBe(false)
        expect(presentation.boardDepletion).not.toBeNull()
      } else if (stage === 'answer') {
        expect(presentation.scene).toBe('answer')
        expect(presentation.showDecorativeLattice).toBe(true)
        expect(presentation.boardDepletion).toBeNull()
      } else {
        expect(presentation.scene).toBe('quiet-cognition')
        expect(presentation.showDecorativeLattice).toBe(true)
        expect(presentation.boardDepletion).toBeNull()
      }
      expect(presentation.nexus.stageLabel.length).toBeGreaterThan(0)
    }
  })

  it('exhaustively maps Final stages onto final/complete scenes and Final rail', () => {
    const finals: PublicFinalWagerState[] = [
      { kind: PUBLIC_FINAL_KIND, stage: 'setup' },
      {
        kind: PUBLIC_FINAL_KIND,
        stage: 'wager-entry',
        timer: { status: 'running', durationMs: 30_000, deadline: Date.now() + 30_000 },
      },
      { kind: PUBLIC_FINAL_KIND, stage: 'wagers-locked' },
      {
        kind: PUBLIC_FINAL_KIND,
        stage: 'response-entry',
        prompt: TEXT_PROMPT,
        timer: { status: 'running', durationMs: 30_000, deadline: Date.now() + 30_000 },
      },
      { kind: PUBLIC_FINAL_KIND, stage: 'responses-locked', prompt: TEXT_PROMPT },
      {
        kind: PUBLIC_FINAL_KIND,
        stage: 'answer-revealed',
        prompt: TEXT_PROMPT,
        answer: 'Paris',
      },
      {
        kind: PUBLIC_FINAL_KIND,
        stage: 'team-reveal',
        prompt: TEXT_PROMPT,
        answer: 'Paris',
        reveal: {
          teamKey: 't0',
          response: { kind: 'exact', text: 'Paris' },
          wager: 100,
          settlement: { outcome: 'correct', delta: 100 },
        },
      },
      {
        kind: PUBLIC_FINAL_KIND,
        stage: 'resolution',
        prompt: TEXT_PROMPT,
        answer: 'Paris',
        reveal: null,
        outcome: 'unique-leader',
      },
      { kind: PUBLIC_FINAL_KIND, stage: 'sudden-death' },
      { kind: PUBLIC_FINAL_KIND, stage: 'complete', outcome: 'tied' },
    ]

    for (const round of finals) {
      const presentation = selectAudiencePresentation(
        baseState({
          round,
          teams: available(team('t0', 'Alpha', 'crimson', 500), team('t1', 'Bravo', 'azure', 100)),
        }),
      )
      expect(presentation.signalRail).toBe('final')
      expect(presentation.primaryContent).toBe('final')
      if (round.stage === 'complete') {
        expect(presentation.scene).toBe('complete')
        expect(presentation.finalResult?.outcome).toBe('tied')
      } else {
        expect(presentation.scene).toBe('final')
      }
      expect(presentation.nexus.stageLabel.length).toBeGreaterThan(0)
    }
  })

  it('selects Column / Strip / Deck from authored team counts without sorting', () => {
    const ordered = [
      team('t0', 'Low', 'crimson', 10),
      team('t1', 'High', 'azure', 999),
      team('t2', 'Mid', 'emerald', 50),
      team('t3', 'Also', 'amber', 20),
    ]
    const column = selectAudiencePresentation(
      baseState({ round: OPEN_BOARD, teams: available(...ordered) }),
    )
    expect(column.scoreLayout).toBe('column')
    expect(column.teamsInAuthoredOrder?.map((t) => t.key)).toEqual(['t0', 't1', 't2', 't3'])

    const six = Array.from({ length: 6 }, (_, i) =>
      team(`t${i}`, `Team ${i}`, 'crimson', 100 - i * 10),
    )
    expect(
      selectAudiencePresentation(baseState({ round: OPEN_BOARD, teams: available(...six) }))
        .scoreLayout,
    ).toBe('strip')

    const eight = Array.from({ length: 8 }, (_, i) =>
      team(`t${i}`, `Team ${i}`, 'azure', i * 100),
    )
    const deck = selectAudiencePresentation(
      baseState({ round: OPEN_BOARD, teams: available(...eight) }),
    )
    expect(deck.scoreLayout).toBe('deck')
    expect(deck.teamsInAuthoredOrder?.map((t) => t.score)).toEqual([
      0, 100, 200, 300, 400, 500, 600, 700,
    ])
  })

  it('resolves active public team and anonymous waiting count only', () => {
    const presentation = selectAudiencePresentation(
      baseState({
        round: {
          kind: PUBLIC_BOARD_KIND,
          stage: 'prompt',
          selection: {
            categoryTitle: 'Science',
            value: 200,
            prompt: TEXT_PROMPT,
            answer: null,
          },
        },
        teams: available(team('t0', 'Alpha', 'crimson', 0), team('t1', 'Bravo', 'azure', 0)),
        response: {
          armed: true,
          timer: { status: 'running', durationMs: 15_000, deadline: Date.now() + 15_000 },
          buzz: { status: 'active', activeTeamKey: 't1', waitingCount: 2 },
        },
      }),
    )
    expect(presentation.signalRail).toBe('expanded')
    expect(presentation.activeTeamName).toBe('Bravo')
    expect(presentation.waitingCount).toBe(2)
  })

  it('never carries board depletion after the board leaves the public DTO', () => {
    for (const stage of ['selected', 'prompt', 'answer'] as const) {
      const presentation = selectAudiencePresentation(
        baseState({
          round: {
            kind: PUBLIC_BOARD_KIND,
            stage,
            selection: {
              categoryTitle: 'Science',
              value: 100,
              prompt: stage === 'selected' ? null : TEXT_PROMPT,
              answer: stage === 'answer' ? 'Yes' : null,
            },
          },
        }),
      )
      expect(presentation.boardDepletion).toBeNull()
      expect(presentation.showDecorativeLattice).toBe(true)
    }
  })

  it('derives cleared categories and depletion only from visible board tiles', () => {
    const presentation = selectAudiencePresentation(baseState({ round: OPEN_BOARD }))
    expect(presentation.boardDepletion).toEqual({
      usedTiles: 3,
      totalTiles: 4,
      clearedCategoryKeys: ['c0'],
      boardCleared: false,
    })
  })

  it('uses compact rail for inactive response and idle timers', () => {
    const presentation = selectAudiencePresentation(
      baseState({
        round: OPEN_BOARD,
        response: IDLE_RESPONSE,
      }),
    )
    expect(presentation.signalRail).toBe('compact')
  })

  it('maps teams null to none and teams unavailable to unavailable layout', () => {
    expect(selectScoreLayoutFromTeams(null)).toBe('none')
    expect(selectScoreLayoutFromTeams({ status: 'unavailable' })).toBe('unavailable')
    expect(
      selectAudiencePresentation(baseState({ round: OPEN_BOARD, teams: null })).scoreLayout,
    ).toBe('none')
    expect(
      selectAudiencePresentation(
        baseState({ round: OPEN_BOARD, teams: { status: 'unavailable' } }),
      ).scoreLayout,
    ).toBe('unavailable')
  })

  it('selects public response and Final timers without fabricating others', () => {
    const withResponse = baseState({
      round: OPEN_BOARD,
      response: {
        armed: true,
        timer: { status: 'paused', durationMs: 10_000, remainingMs: 4_000 },
        buzz: { status: 'none' },
      },
    })
    expect(selectPublicTimer(withResponse)?.status).toBe('paused')

    const finalWager = baseState({
      response: null,
      round: {
        kind: PUBLIC_FINAL_KIND,
        stage: 'wager-entry',
        timer: { status: 'running', durationMs: 60_000, deadline: Date.now() + 60_000 },
      },
    })
    expect(selectPublicTimer(finalWager)?.status).toBe('running')

    const finalLocked = baseState({
      response: null,
      round: { kind: PUBLIC_FINAL_KIND, stage: 'wagers-locked' },
    })
    expect(selectPublicTimer(finalLocked)).toBeNull()
  })

  it('produces public-safe Nexus labels without private titles or types', () => {
    const presentation = selectAudiencePresentation(baseState({ round: OPEN_BOARD }))
    expect(presentation.nexus.brand).toBe('Classroom Quiz Show')
    expect(presentation.nexus.roundLabel).toBe('Round 2 of 4')
    expect(presentation.nexus.stageLabel).toBe('Board open')
    const blob = JSON.stringify(presentation)
    expect(blob).not.toMatch(/category-board|final-wager|teacher|class title|host notes/i)
  })
})
