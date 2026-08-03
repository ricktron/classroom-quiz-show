import { describe, expect, it } from 'vitest'
import {
  FINAL_WAGER_ROUND_TYPE,
  FinalWagerConfigError,
  createFinalWagerDefinition,
  isFinalWagerRound,
  readFinalWagerDefinition,
} from './definition'
import { finalWagerConfigSchema } from './schema'
import { finalWagerRoundType } from './roundType'
import {
  DEFAULT_FINAL_ELIGIBILITY_MODE,
  buildFinalEligibilitySnapshot,
  cloneFinalEligibilitySnapshot,
  effectiveMaxWager,
  finalPolicyCap,
  findEligibleTeam,
  highestPrecedingClueValue,
  isEligibleUnder,
  isFinalEligibilityMode,
  isFinalEligibilitySnapshot,
} from './eligibility'
import {
  FINAL_WAGER_PHASES,
  INITIAL_FINAL_WAGER_ROUND_STATE,
  currentRevealTeamId,
  everyResponseCommitted,
  everyTeamSettled,
  everyWagerCommitted,
  finalLeaders,
  finalSettlementDelta,
  isFinalOutcome,
  isFinalResponseCaptureMode,
  isFinalResponseState,
  isFinalTieResolution,
  isInitialFinalWagerState,
  isLegalFinalWager,
  nextDefaultRevealTeamId,
  outcomeMatchesResponse,
  respondedAtAll,
  unrevealedTeamIds,
  type FinalWagerRoundState,
} from './finalState'
import {
  MAX_FINAL_ALTERNATES,
  MAX_FINAL_ANSWER_LENGTH,
  MAX_FINAL_NOTES_LENGTH,
  MAX_FINAL_RESPONSE_LENGTH,
  NO_PRECEDING_CLUE_WAGER_CAP,
} from './limits'
import { MAX_TEAM_SCORE, MIN_TEAM_SCORE } from '../teams/scoring'
import { roundId, roundType } from '../ids'
import type { RoundDefinition } from '../roundDefinition'
import type { TeamDefinition } from '../teams/definition'
import { finalConfig, finalDefinition, precedingBoard } from '../../test/finalWagerFixtures'

/**
 * The Final Wager DOMAIN (Slice 14) — config, eligibility, caps and the pure
 * state helpers.
 *
 * The load-bearing claims proved here:
 *  - the config schema is strict, rejects rather than repairs, and reuses the
 *    Slice 11 prompt contract;
 *  - a trusted definition is deep-frozen, copied, and never aliases its input;
 *  - the eligibility snapshot, wager caps and reveal order are pure functions of
 *    a definition plus a score lookup, with the documented tie-break;
 *  - a wager cap respects the policy cap AND both score-bound headrooms;
 *  - every state helper is derived, so nothing can drift from the event log.
 */

function roundOf(config: unknown): RoundDefinition {
  return {
    id: roundId('r'),
    type: FINAL_WAGER_ROUND_TYPE,
    title: 'Final',
    config: config as RoundDefinition['config'],
  }
}

function teamsOf(...ids: readonly string[]): readonly TeamDefinition[] {
  return ids.map((id, order) => ({
    id: id as TeamDefinition['id'],
    name: `Team ${id}`,
    accent: 'crimson' as TeamDefinition['accent'],
    order,
  }))
}

describe('the final-wager config schema', () => {
  it('accepts a minimal text prompt with an answer', () => {
    expect(finalWagerConfigSchema.safeParse(finalConfig()).success).toBe(true)
  })

  it('accepts every optional field: alternates and a host-only note', () => {
    const parsed = finalWagerConfigSchema.safeParse(
      finalConfig({ alternates: ['Convection'], notes: 'Press for the mechanism.' }),
    )
    expect(parsed.success).toBe(true)
  })

  it('accepts a same-origin image prompt through the shared media contract', () => {
    const parsed = finalWagerConfigSchema.safeParse(
      finalConfig({
        prompt: {
          kind: 'image',
          source: { kind: 'same-origin-path', path: 'media/final.png' },
          alt: 'A cross-section of the Earth',
        },
      }),
    )
    expect(parsed.success).toBe(true)
  })

  it.each([
    ['an unknown field', finalConfig({ wagerCap: 500 })],
    ['a missing answer', { prompt: 'Q?' }],
    ['a missing prompt', { answer: 'A' }],
    ['a numeric answer', finalConfig({ answer: 42 })],
    ['an empty answer', finalConfig({ answer: '' })],
    ['an over-long answer', finalConfig({ answer: 'x'.repeat(MAX_FINAL_ANSWER_LENGTH + 1) })],
    ['an over-long note', finalConfig({ notes: 'x'.repeat(MAX_FINAL_NOTES_LENGTH + 1) })],
    [
      'too many alternates',
      finalConfig({ alternates: Array.from({ length: MAX_FINAL_ALTERNATES + 1 }, () => 'a') }),
    ],
    ['a remote image source', finalConfig({ prompt: { kind: 'image', source: { kind: 'url', path: 'https://x/y.png' }, alt: 'a' } })],
    ['an unsupported media kind', finalConfig({ prompt: { kind: 'audio', source: { kind: 'same-origin-path', path: 'a.mp3' } } })],
  ])('rejects %s', (_label, config) => {
    expect(finalWagerConfigSchema.safeParse(config).success).toBe(false)
  })

  it.each([
    ['a whitespace-only answer', finalConfig({ answer: '   ' }), 'answer'],
    ['a whitespace-only alternate', finalConfig({ alternates: ['  '] }), 'alternates'],
    ['a whitespace-only note', finalConfig({ notes: '\t' }), 'notes'],
  ])('reports %s as blank-text at an exact path', (_label, config, segment) => {
    const parsed = finalWagerConfigSchema.safeParse(config)
    expect(parsed.success).toBe(false)
    if (parsed.success) return
    const issue = parsed.error.issues.find((candidate) => candidate.path[0] === segment)
    expect(issue).toBeDefined()
    expect((issue as { params?: { importCode?: string } }).params?.importCode).toBe('blank-text')
  })
})

describe('the trusted final-wager definition', () => {
  it('normalizes a legacy string prompt to typed text content', () => {
    const built = createFinalWagerDefinition(finalConfig())
    expect(built.prompt).toEqual({ kind: 'text', text: 'Which process drives plate motion?' })
  })

  it('applies the documented absences: no alternates is [], no note is null', () => {
    const built = createFinalWagerDefinition(finalConfig())
    expect(built.alternates).toEqual([])
    expect(built.notes).toBeNull()
  })

  it('is deep-frozen and cannot be mutated after construction', () => {
    const built = createFinalWagerDefinition(finalConfig({ alternates: ['x'] }))
    expect(Object.isFrozen(built)).toBe(true)
    expect(Object.isFrozen(built.alternates)).toBe(true)
    expect(Object.isFrozen(built.prompt)).toBe(true)
  })

  it('copies its input, so later mutation of the caller object changes nothing', () => {
    const alternates = ['first']
    const built = createFinalWagerDefinition(finalConfig({ alternates }))
    alternates.push('smuggled')
    expect(built.alternates).toEqual(['first'])
  })

  it('never mutates the config it was given', () => {
    const config = finalConfig({ alternates: ['a'] })
    const before = JSON.stringify(config)
    createFinalWagerDefinition(config)
    expect(JSON.stringify(config)).toBe(before)
  })

  it('throws rather than repairing an invalid config', () => {
    expect(() => createFinalWagerDefinition({ answer: 'A' })).toThrow(FinalWagerConfigError)
  })

  it('reads fail-closed: an invalid config is null, never a partial Final', () => {
    expect(readFinalWagerDefinition(roundOf({ answer: 'A' }))).toBeNull()
    expect(readFinalWagerDefinition(roundOf(null))).toBeNull()
  })

  it('reads null for a round of another type without inspecting its config', () => {
    const board: RoundDefinition = {
      id: roundId('r'),
      type: roundType('category-board'),
      title: 'Board',
      config: precedingBoard() as RoundDefinition['config'],
    }
    expect(readFinalWagerDefinition(board)).toBeNull()
    expect(isFinalWagerRound(board)).toBe(false)
  })
})

describe('the final-wager registry entry', () => {
  it('is registered only by application code and supplies exactly one config schema', () => {
    expect(finalWagerRoundType.type).toBe(FINAL_WAGER_ROUND_TYPE)
    expect(finalWagerRoundType.configSchema).toBe(finalWagerConfigSchema)
  })

  it('matches only a Final round whose config really validates', () => {
    expect(finalWagerRoundType.matches(roundOf(finalConfig()))).toBe(true)
    expect(finalWagerRoundType.matches(roundOf({ answer: 'A' }))).toBe(false)
  })

  it('projects a neutral availability that names nothing about the round', () => {
    const state = finalWagerRoundType.createInitialState(roundOf(finalConfig()))
    expect(finalWagerRoundType.toPublicRoundView(state)).toEqual({ availability: 'available' })
  })
})

describe('eligibility modes (CQS-OD-005)', () => {
  it('defaults to classic — the traditional positive-score rule', () => {
    expect(DEFAULT_FINAL_ELIGIBILITY_MODE).toBe('classic')
  })

  it.each([
    ['classic', 1, true],
    ['classic', 0, false],
    ['classic', -100, false],
    ['inclusive', 1, true],
    ['inclusive', 0, true],
    ['inclusive', -100, true],
  ] as const)('%s eligibility with score %i is %s', (mode, score, expected) => {
    expect(isEligibleUnder(mode, score)).toBe(expected)
  })

  it('rejects an unknown mode at the guard', () => {
    expect(isFinalEligibilityMode('everyone')).toBe(false)
    expect(isFinalEligibilityMode(null)).toBe(false)
  })
})

describe('wager caps (CQS-OD-006)', () => {
  it('caps a positive team at its own snapshotted score', () => {
    expect(finalPolicyCap(700, 400)).toBe(700)
  })

  it('caps a zero or negative team at the highest preceding clue value', () => {
    expect(finalPolicyCap(0, 400)).toBe(400)
    expect(finalPolicyCap(-250, 400)).toBe(400)
  })

  it('caps a non-positive team at zero when no preceding clue value exists', () => {
    expect(finalPolicyCap(0, NO_PRECEDING_CLUE_WAGER_CAP)).toBe(0)
    expect(finalPolicyCap(-100, 0)).toBe(0)
  })

  it('reads the highest EFFECTIVE preceding value, multiplier included', () => {
    const definition = finalDefinition({
      board: {
        categories: [
          {
            id: 'c',
            title: 'C',
            tiles: [
              { id: 't1', value: 100, prompt: 'p', answer: 'a' },
              { id: 't2', value: 300, prompt: 'p', answer: 'a', multiplier: 2 },
            ],
          },
        ],
      },
    })
    // The Final round is index 1; the board precedes it.
    expect(highestPrecedingClueValue(definition, 1)).toBe(600)
  })

  it('reads zero when no board precedes Final', () => {
    const definition = finalDefinition({ board: null })
    expect(highestPrecedingClueValue(definition, 0)).toBe(NO_PRECEDING_CLUE_WAGER_CAP)
  })

  it('never counts a clue that comes AFTER the final round index', () => {
    const definition = finalDefinition()
    expect(highestPrecedingClueValue(definition, 0)).toBe(0)
  })

  it('bounds the maximum by the upper score headroom', () => {
    const score = MAX_TEAM_SCORE - 10
    expect(effectiveMaxWager(score, 1_000_000)).toBe(10)
  })

  it('bounds the maximum by the lower score headroom', () => {
    const score = MIN_TEAM_SCORE + 10
    // Policy cap for a negative team is the preceding clue value…
    expect(effectiveMaxWager(score, 1_000_000)).toBe(10)
  })

  it('never returns a negative maximum', () => {
    expect(effectiveMaxWager(MAX_TEAM_SCORE, 500)).toBe(0)
    expect(effectiveMaxWager(MIN_TEAM_SCORE, 500)).toBe(0)
  })

  it('returns zero for a score outside the documented bounds', () => {
    expect(effectiveMaxWager(Number.NaN, 500)).toBe(0)
    expect(effectiveMaxWager(MAX_TEAM_SCORE + 1, 500)).toBe(0)
  })
})

describe('the frozen snapshot and reveal order (CQS-OD-008)', () => {
  const teams = teamsOf('a', 'b', 'c')

  it('includes only positive teams under classic', () => {
    const snapshot = buildFinalEligibilitySnapshot({
      mode: 'classic',
      teams,
      scoreFor: (id) => ({ a: 100, b: 0, c: -50 })[id] ?? 0,
      precedingClueCap: 400,
    })
    expect(snapshot.teams.map((team) => team.teamId)).toEqual(['a'])
  })

  it('includes every team under inclusive, with the non-positive cap applied', () => {
    const snapshot = buildFinalEligibilitySnapshot({
      mode: 'inclusive',
      teams,
      scoreFor: (id) => ({ a: 100, b: 0, c: -50 })[id] ?? 0,
      precedingClueCap: 400,
    })
    expect(snapshot.teams.map((team) => [team.teamId, team.maxWager])).toEqual([
      ['a', 100],
      ['b', 400],
      ['c', 400],
    ])
  })

  it('orders reveals low to high by pre-final score', () => {
    const snapshot = buildFinalEligibilitySnapshot({
      mode: 'inclusive',
      teams,
      scoreFor: (id) => ({ a: 300, b: 100, c: 200 })[id] ?? 0,
      precedingClueCap: 0,
    })
    expect(snapshot.revealOrder).toEqual(['b', 'c', 'a'])
  })

  it('breaks an equal-score tie by AUTHORED order, deterministically', () => {
    const snapshot = buildFinalEligibilitySnapshot({
      mode: 'inclusive',
      teams,
      scoreFor: () => 100,
      precedingClueCap: 0,
    })
    expect(snapshot.revealOrder).toEqual(['a', 'b', 'c'])
  })

  it('keeps eligible teams in AUTHORED order, separately from the reveal order', () => {
    const snapshot = buildFinalEligibilitySnapshot({
      mode: 'inclusive',
      teams,
      scoreFor: (id) => ({ a: 300, b: 100, c: 200 })[id] ?? 0,
      precedingClueCap: 0,
    })
    expect(snapshot.teams.map((team) => team.teamId)).toEqual(['a', 'b', 'c'])
    expect(snapshot.revealOrder).not.toEqual(snapshot.teams.map((team) => team.teamId))
  })

  it('produces an empty but valid snapshot when classic admits nobody', () => {
    const snapshot = buildFinalEligibilitySnapshot({
      mode: 'classic',
      teams,
      scoreFor: () => 0,
      precedingClueCap: 400,
    })
    expect(snapshot.teams).toEqual([])
    expect(snapshot.revealOrder).toEqual([])
    expect(isFinalEligibilitySnapshot(snapshot)).toBe(true)
  })

  it('clones deeply, so an appended event cannot alias a caller object', () => {
    const snapshot = buildFinalEligibilitySnapshot({
      mode: 'inclusive',
      teams,
      scoreFor: () => 100,
      precedingClueCap: 0,
    })
    const copy = cloneFinalEligibilitySnapshot(snapshot)
    expect(copy).toEqual(snapshot)
    expect(copy.teams).not.toBe(snapshot.teams)
    expect(copy.revealOrder).not.toBe(snapshot.revealOrder)
  })

  it('finds an eligible team by id and returns null for one that cannot play', () => {
    const snapshot = buildFinalEligibilitySnapshot({
      mode: 'classic',
      teams,
      scoreFor: (id) => (id === 'a' ? 100 : 0),
      precedingClueCap: 0,
    })
    expect(findEligibleTeam(snapshot, 'a')?.preFinalScore).toBe(100)
    expect(findEligibleTeam(snapshot, 'b')).toBeNull()
  })
})

describe('the snapshot guard fails closed', () => {
  const valid = buildFinalEligibilitySnapshot({
    mode: 'classic',
    teams: teamsOf('a', 'b'),
    scoreFor: () => 100,
    precedingClueCap: 0,
  })

  it('accepts a snapshot this build produced', () => {
    expect(isFinalEligibilitySnapshot(valid)).toBe(true)
  })

  it.each([
    ['a non-object', 'nope'],
    ['an unknown mode', { ...valid, mode: 'everyone' }],
    ['a reveal order naming a team that cannot play', { ...valid, revealOrder: ['a', 'zzz'] }],
    ['a reveal order that omits an eligible team', { ...valid, revealOrder: ['a'] }],
    ['a negative wager cap', { ...valid, teams: [{ teamId: 'a', preFinalScore: 1, maxWager: -1 }], revealOrder: ['a'] }],
    ['a fractional wager cap', { ...valid, teams: [{ teamId: 'a', preFinalScore: 1, maxWager: 1.5 }], revealOrder: ['a'] }],
    ['an out-of-range pre-final score', { ...valid, teams: [{ teamId: 'a', preFinalScore: MAX_TEAM_SCORE + 1, maxWager: 0 }], revealOrder: ['a'] }],
  ])('rejects %s', (_label, value) => {
    expect(isFinalEligibilitySnapshot(value)).toBe(false)
  })
})

describe('the pure Final state helpers', () => {
  const snapshot = buildFinalEligibilitySnapshot({
    mode: 'inclusive',
    teams: teamsOf('a', 'b'),
    scoreFor: (id) => (id === 'a' ? 100 : 300),
    precedingClueCap: 0,
  })

  function stateWith(overrides: Partial<FinalWagerRoundState>): FinalWagerRoundState {
    return { ...INITIAL_FINAL_WAGER_ROUND_STATE, snapshot, ...overrides }
  }

  it('names every documented phase, in the documented order', () => {
    expect(FINAL_WAGER_PHASES).toEqual([
      'setup',
      'wager-entry',
      'wagers-locked',
      'response-entry',
      'responses-locked',
      'answer-revealed',
      'team-reveal',
      'resolution',
      'sudden-death',
      'ready-to-complete',
      'ended',
    ])
  })

  it('treats an untouched Final as initial, and a begun one as not', () => {
    expect(isInitialFinalWagerState(INITIAL_FINAL_WAGER_ROUND_STATE)).toBe(true)
    expect(isInitialFinalWagerState(stateWith({ phase: 'wager-entry' }))).toBe(false)
  })

  it('requires an explicit wager for every eligible team, zero included', () => {
    expect(everyWagerCommitted(stateWith({ wagers: { a: 0 } }))).toBe(false)
    expect(everyWagerCommitted(stateWith({ wagers: { a: 0, b: 50 } }))).toBe(true)
  })

  it('requires an explicit response state for every eligible team', () => {
    expect(
      everyResponseCommitted(stateWith({ responses: { a: { kind: 'no-response' } } })),
    ).toBe(false)
    expect(
      everyResponseCommitted(
        stateWith({ responses: { a: { kind: 'no-response' }, b: { kind: 'not-captured' } } }),
      ),
    ).toBe(true)
  })

  it('derives the team on screen from the reveal list and the settlements', () => {
    const revealed = stateWith({ revealedTeamIds: ['a'] })
    expect(currentRevealTeamId(revealed)).toBe('a')
    const settled = stateWith({
      revealedTeamIds: ['a'],
      settlements: { a: { teamId: 'a', wager: 0, outcome: 'correct', delta: 0 } },
    })
    expect(currentRevealTeamId(settled)).toBeNull()
    expect(everyTeamSettled(settled)).toBe(false)
  })

  it('offers the unrevealed teams in DEFAULT reveal order', () => {
    const state = stateWith({ revealedTeamIds: ['a'] })
    expect(unrevealedTeamIds(state)).toEqual(['b'])
    expect(nextDefaultRevealTeamId(state)).toBe('b')
    expect(nextDefaultRevealTeamId(stateWith({ revealedTeamIds: ['a', 'b'] }))).toBeNull()
  })

  it('accepts zero and the exact cap as wagers, and rejects everything outside', () => {
    expect(isLegalFinalWager(snapshot, 'a', 0)).toBe(true)
    expect(isLegalFinalWager(snapshot, 'a', 100)).toBe(true)
    expect(isLegalFinalWager(snapshot, 'a', 101)).toBe(false)
    expect(isLegalFinalWager(snapshot, 'a', -1)).toBe(false)
    expect(isLegalFinalWager(snapshot, 'a', 10.5)).toBe(false)
    expect(isLegalFinalWager(snapshot, 'a', Number.NaN)).toBe(false)
    expect(isLegalFinalWager(snapshot, 'a', '50')).toBe(false)
    expect(isLegalFinalWager(snapshot, 'nobody', 0)).toBe(false)
  })

  it('adds the wager on correct and subtracts it otherwise', () => {
    expect(finalSettlementDelta('correct', 250)).toBe(250)
    expect(finalSettlementDelta('incorrect', 250)).toBe(-250)
    expect(finalSettlementDelta('no-response', 250)).toBe(-250)
    expect(finalSettlementDelta('correct', 0)).toBe(0)
  })

  it('keeps the outcome and the response state in agreement', () => {
    expect(outcomeMatchesResponse({ kind: 'no-response' }, 'no-response')).toBe(true)
    expect(outcomeMatchesResponse({ kind: 'no-response' }, 'correct')).toBe(false)
    expect(outcomeMatchesResponse({ kind: 'not-captured' }, 'correct')).toBe(true)
    expect(outcomeMatchesResponse({ kind: 'exact', text: 'x' }, 'no-response')).toBe(false)
    expect(respondedAtAll({ kind: 'no-response' })).toBe(false)
    expect(respondedAtAll({ kind: 'not-captured' })).toBe(true)
  })

  it('computes leaders over EVERY authored team, not merely the eligible ones', () => {
    const teams = teamsOf('a', 'b', 'c')
    expect(finalLeaders(teams, (id) => ({ a: 100, b: 300, c: 300 })[id] ?? 0)).toEqual(['b', 'c'])
    expect(finalLeaders(teams, (id) => ({ a: 100, b: 300, c: 200 })[id] ?? 0)).toEqual(['b'])
    expect(finalLeaders(teams, () => -50)).toEqual(['a', 'b', 'c'])
    expect(finalLeaders([], () => 0)).toEqual([])
  })
})

describe('the response-state guard', () => {
  it.each([
    [{ kind: 'exact', text: 'answer' }, true],
    [{ kind: 'not-captured' }, true],
    [{ kind: 'no-response' }, true],
    [{ kind: 'exact', text: '   ' }, false],
    [{ kind: 'exact', text: '' }, false],
    [{ kind: 'exact' }, false],
    [{ kind: 'exact', text: 'x'.repeat(MAX_FINAL_RESPONSE_LENGTH + 1) }, false],
    [{ kind: 'not-captured', text: 'smuggled' }, false],
    [{ kind: 'blank' }, false],
    [null, false],
  ])('%o is %s', (value, expected) => {
    expect(isFinalResponseState(value)).toBe(expected)
  })
})

describe('the bounded vocabularies', () => {
  it('accepts exactly the two capture modes', () => {
    expect(isFinalResponseCaptureMode('exact-text')).toBe(true)
    expect(isFinalResponseCaptureMode('host-only')).toBe(true)
    expect(isFinalResponseCaptureMode('transcript')).toBe(false)
  })

  it('accepts exactly the three outcomes', () => {
    expect(isFinalOutcome('correct')).toBe(true)
    expect(isFinalOutcome('incorrect')).toBe(true)
    expect(isFinalOutcome('no-response')).toBe(true)
    expect(isFinalOutcome('partial')).toBe(false)
  })

  it('accepts exactly the two tie resolutions', () => {
    expect(isFinalTieResolution('sudden-death')).toBe(true)
    expect(isFinalTieResolution('accepted-tie')).toBe(true)
    expect(isFinalTieResolution('coin-flip')).toBe(false)
  })
})
