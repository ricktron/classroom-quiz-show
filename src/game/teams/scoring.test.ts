import { describe, expect, it } from 'vitest'
import {
  DEFAULT_PARTIAL_CREDIT,
  INITIAL_TEAM_SCORE,
  LARGE_ADJUSTMENT_CONFIRM_THRESHOLD,
  MAX_SCORE_ADJUSTMENT,
  MAX_TEAM_SCORE,
  MIN_TEAM_SCORE,
  SCORE_ADJUSTMENT_MODES,
  checkScoreAdjustment,
  formatSignedDelta,
  fullCreditDelta,
  fullDeductionDelta,
  isScoreAdjustmentMode,
  isScoreDelta,
  isScoreSource,
  isTeamScore,
  modeRequiresValueSource,
  requiresAdjustmentConfirmation,
  suggestedPartialCredit,
  type ScoreAdjustmentMode,
} from './scoring'
import { PUBLIC_TEAM_SCORE_LIMIT } from '../../state/publicState'

/**
 * The scoring domain (Slice 6).
 *
 * This is where the amount rules live, so this is where they are exhaustively
 * proved: bounds, integrality, mode↔source consistency, and the exact-match rule
 * that stops a "full credit" event carrying an arbitrary number.
 */

const AT_ZERO = { currentScore: INITIAL_TEAM_SCORE }

function check(
  mode: ScoreAdjustmentMode,
  delta: number,
  sourceValue: number | null,
  currentScore = INITIAL_TEAM_SCORE,
) {
  return checkScoreAdjustment({ mode, delta, currentScore, sourceValue })
}

describe('bounds and the initial score', () => {
  it('start every team on exactly zero', () => {
    expect(INITIAL_TEAM_SCORE).toBe(0)
  })

  it('are the documented, symmetric classroom range', () => {
    expect(MIN_TEAM_SCORE).toBe(-1_000_000)
    expect(MAX_TEAM_SCORE).toBe(1_000_000)
    expect(MAX_SCORE_ADJUSTMENT).toBe(1_000_000)
  })

  it('stay far inside the exact-integer range', () => {
    expect(Number.isSafeInteger(MAX_TEAM_SCORE)).toBe(true)
    expect(Number.isSafeInteger(MIN_TEAM_SCORE)).toBe(true)
    expect(MAX_TEAM_SCORE).toBeLessThan(Number.MAX_SAFE_INTEGER / 1000)
  })

  it('match the wire-level bound the public state enforces, so they cannot drift', () => {
    expect(PUBLIC_TEAM_SCORE_LIMIT).toBe(MAX_TEAM_SCORE)
    expect(PUBLIC_TEAM_SCORE_LIMIT).toBe(-MIN_TEAM_SCORE)
  })

  it('use the owner-approved default partial-credit increment', () => {
    expect(DEFAULT_PARTIAL_CREDIT).toBe(50)
  })
})

describe('isTeamScore', () => {
  it('accepts integers inside the bounds, including negatives and the edges', () => {
    for (const value of [0, 1, -1, 500, -500, MAX_TEAM_SCORE, MIN_TEAM_SCORE]) {
      expect(isTeamScore(value)).toBe(true)
    }
  })

  it('rejects non-integers, NaN, Infinity, strings and out-of-range values', () => {
    for (const value of [
      0.5,
      -0.5,
      Number.NaN,
      Number.POSITIVE_INFINITY,
      Number.NEGATIVE_INFINITY,
      '100',
      null,
      undefined,
      MAX_TEAM_SCORE + 1,
      MIN_TEAM_SCORE - 1,
    ]) {
      expect(isTeamScore(value)).toBe(false)
    }
  })
})

describe('isScoreDelta', () => {
  it('accepts non-zero bounded integers of either sign', () => {
    for (const value of [1, -1, 50, -50, MAX_SCORE_ADJUSTMENT, -MAX_SCORE_ADJUSTMENT]) {
      expect(isScoreDelta(value)).toBe(true)
    }
  })

  it('rejects zero — a zero-point event is not a fact worth recording', () => {
    expect(isScoreDelta(0)).toBe(false)
    expect(isScoreDelta(-0)).toBe(false)
  })

  it('rejects fractions, NaN, Infinity, numeric strings and oversized amounts', () => {
    for (const value of [
      12.5,
      Number.NaN,
      Number.POSITIVE_INFINITY,
      Number.NEGATIVE_INFINITY,
      '100',
      true,
      null,
      undefined,
      MAX_SCORE_ADJUSTMENT + 1,
      -(MAX_SCORE_ADJUSTMENT + 1),
    ]) {
      expect(isScoreDelta(value)).toBe(false)
    }
  })
})

describe('modes and sources', () => {
  it('are exactly the four documented modes', () => {
    expect([...SCORE_ADJUSTMENT_MODES]).toEqual([
      'full-credit',
      'partial-credit',
      'deduction',
      'manual-correction',
    ])
  })

  it('are recognized by the guard, and nothing else is', () => {
    for (const mode of SCORE_ADJUSTMENT_MODES) expect(isScoreAdjustmentMode(mode)).toBe(true)
    for (const bad of ['award', 'FULL-CREDIT', '', null, 7]) {
      expect(isScoreAdjustmentMode(bad)).toBe(false)
    }
  })

  it('require a value source for every mode except manual correction', () => {
    expect(modeRequiresValueSource('full-credit')).toBe(true)
    expect(modeRequiresValueSource('partial-credit')).toBe(true)
    expect(modeRequiresValueSource('deduction')).toBe(true)
    expect(modeRequiresValueSource('manual-correction')).toBe(false)
  })

  it('validate the source shape strictly', () => {
    expect(isScoreSource({ kind: 'manual' })).toBe(true)
    expect(isScoreSource({ kind: 'category-board-tile', roundId: 'r', tileId: 't' })).toBe(true)
    expect(isScoreSource({ kind: 'category-board-tile', roundId: 'r' })).toBe(false)
    expect(isScoreSource({ kind: 'category-board-tile', roundId: '', tileId: 't' })).toBe(false)
    expect(isScoreSource({ kind: 'other' })).toBe(false)
    expect(isScoreSource(null)).toBe(false)
    expect(isScoreSource('manual')).toBe(false)
  })
})

describe('checkScoreAdjustment — full credit', () => {
  it('accepts exactly the tile effective value', () => {
    const result = check('full-credit', 600, 600)
    expect(result).toEqual({ ok: true, resultingScore: 600 })
  })

  it('rejects any other amount, high or low', () => {
    expect(check('full-credit', 599, 600).ok).toBe(false)
    expect(check('full-credit', 601, 600).ok).toBe(false)
    expect(check('full-credit', -600, 600)).toEqual({
      ok: false,
      reason: 'score-amount-mismatch',
    })
  })

  it('rejects a missing tile value', () => {
    expect(check('full-credit', 600, null)).toEqual({ ok: false, reason: 'invalid-score-source' })
  })
})

describe('checkScoreAdjustment — deduction', () => {
  it('accepts exactly the negated tile effective value', () => {
    expect(check('deduction', -600, 600)).toEqual({ ok: true, resultingScore: -600 })
  })

  it('rejects a positive amount and a wrong magnitude', () => {
    expect(check('deduction', 600, 600).ok).toBe(false)
    expect(check('deduction', -599, 600).ok).toBe(false)
  })
})

describe('checkScoreAdjustment — partial credit', () => {
  it('accepts a positive amount within the tile value', () => {
    expect(check('partial-credit', 50, 100)).toEqual({ ok: true, resultingScore: 50 })
  })

  it('accepts a NEGATIVE partial amount within the tile value', () => {
    expect(check('partial-credit', -50, 100)).toEqual({ ok: true, resultingScore: -50 })
  })

  it('accepts an amount equal to the full value — the mode records intent', () => {
    expect(check('partial-credit', 100, 100).ok).toBe(true)
  })

  it('rejects an amount larger than the tile value', () => {
    expect(check('partial-credit', 101, 100)).toEqual({
      ok: false,
      reason: 'score-amount-mismatch',
    })
    expect(check('partial-credit', -101, 100).ok).toBe(false)
  })

  it('rejects a fractional amount', () => {
    expect(check('partial-credit', 33.3, 100)).toEqual({
      ok: false,
      reason: 'invalid-score-delta',
    })
  })
})

describe('checkScoreAdjustment — a zero-value tile', () => {
  it('admits no preset at all, because every amount rule would need a zero delta', () => {
    expect(check('full-credit', 0, 0).ok).toBe(false)
    expect(check('deduction', 0, 0).ok).toBe(false)
    expect(check('partial-credit', 1, 0).ok).toBe(false)
    // A manual correction is still available, which is the documented way out.
    expect(check('manual-correction', 10, null).ok).toBe(true)
  })
})

describe('checkScoreAdjustment — manual correction', () => {
  it('accepts any bounded non-zero integer of either sign', () => {
    expect(check('manual-correction', 25, null)).toEqual({ ok: true, resultingScore: 25 })
    expect(check('manual-correction', -25, null)).toEqual({ ok: true, resultingScore: -25 })
  })

  it('rejects a manual correction that claims a board value it did not use', () => {
    expect(check('manual-correction', 25, 100)).toEqual({
      ok: false,
      reason: 'invalid-score-source',
    })
  })

  it('rejects zero and fractions', () => {
    expect(check('manual-correction', 0, null).ok).toBe(false)
    expect(check('manual-correction', 0.5, null).ok).toBe(false)
  })
})

describe('checkScoreAdjustment — resulting-score bounds', () => {
  it('rejects an adjustment that would push the total above the maximum', () => {
    expect(check('manual-correction', 1, null, MAX_TEAM_SCORE)).toEqual({
      ok: false,
      reason: 'score-out-of-range',
    })
  })

  it('rejects an adjustment that would push the total below the minimum', () => {
    expect(check('manual-correction', -1, null, MIN_TEAM_SCORE)).toEqual({
      ok: false,
      reason: 'score-out-of-range',
    })
  })

  it('accepts an adjustment that lands exactly on a bound', () => {
    expect(check('manual-correction', 1, null, MAX_TEAM_SCORE - 1)).toEqual({
      ok: true,
      resultingScore: MAX_TEAM_SCORE,
    })
    expect(check('manual-correction', -1, null, MIN_TEAM_SCORE + 1)).toEqual({
      ok: true,
      resultingScore: MIN_TEAM_SCORE,
    })
  })

  it('rejects an already-impossible current score rather than working from it', () => {
    expect(check('manual-correction', 1, null, Number.NaN)).toEqual({
      ok: false,
      reason: 'score-out-of-range',
    })
    expect(check('manual-correction', 1, null, MAX_TEAM_SCORE + 5).ok).toBe(false)
  })
})

describe('preset helpers', () => {
  it('derive full credit and full deduction exactly from the effective value', () => {
    expect(fullCreditDelta(600)).toBe(600)
    expect(fullDeductionDelta(600)).toBe(-600)
  })

  it('suggest the owner default partial credit, clamped to small tiles', () => {
    expect(suggestedPartialCredit(600)).toBe(DEFAULT_PARTIAL_CREDIT)
    expect(suggestedPartialCredit(25)).toBe(25)
    expect(suggestedPartialCredit(0)).toBe(0)
    expect(suggestedPartialCredit(-5)).toBe(0)
    expect(suggestedPartialCredit(1.5)).toBe(0)
  })

  it('never suggest a fraction', () => {
    for (const value of [1, 7, 33, 49, 51, 600]) {
      expect(Number.isInteger(suggestedPartialCredit(value))).toBe(true)
    }
  })

  it('require confirmation for negative or large manual amounts only', () => {
    expect(requiresAdjustmentConfirmation(-1)).toBe(true)
    expect(requiresAdjustmentConfirmation(LARGE_ADJUSTMENT_CONFIRM_THRESHOLD + 1)).toBe(true)
    expect(requiresAdjustmentConfirmation(LARGE_ADJUSTMENT_CONFIRM_THRESHOLD)).toBe(false)
    expect(requiresAdjustmentConfirmation(50)).toBe(false)
  })

  it('format a signed amount with a fixed, locale-independent form', () => {
    expect(formatSignedDelta(600)).toBe('+600')
    expect(formatSignedDelta(-600)).toBe('-600')
    expect(formatSignedDelta(1_000_000)).toBe('+1000000')
  })
})

describe('purity', () => {
  it('is deterministic — the same input always gives the same answer', () => {
    const first = checkScoreAdjustment({ mode: 'full-credit', delta: 300, sourceValue: 300, ...AT_ZERO })
    const second = checkScoreAdjustment({ mode: 'full-credit', delta: 300, sourceValue: 300, ...AT_ZERO })
    expect(first).toEqual(second)
  })
})
