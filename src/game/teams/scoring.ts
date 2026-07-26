/**
 * The scoring domain (Slice 6) — bounds, modes, provenance, and the one pure
 * rule that decides whether an adjustment is legal.
 *
 * Everything here is a pure function of its arguments. There is no clock, no
 * randomness, no locale formatting, and no state: the command planner calls
 * `checkScoreAdjustment` and the answer is the same on every replay, on every
 * machine. That is what makes a replayed score sequence reproduce exactly.
 *
 * ## Points today, a typed strategy tomorrow
 *
 * GAME-ENGINE-BOUNDARIES §7 requires that no module assume all rounds share one
 * scoring model or that a score is a bare number forever. Slice 6 implements the
 * FIRST strategy — bounded integer points — and keeps the seam visible: the mode
 * and the source travel on every event as typed values, so a future strategy
 * (lives, stars, composite round scores) becomes another mode/source pair plus
 * its own resolution rule rather than a rewrite of the event log.
 *
 * ## Integers only, so there is nothing to round
 *
 * Partial credit is an explicit whole number of points, never a fraction or a
 * percentage. This is deliberate: a fraction would need a rounding rule, a
 * rounding rule needs a documented tie-break, and a mis-rounded point in front of
 * a class is an argument. A teacher types "50", and 50 points move.
 */

/**
 * Score bounds.
 *
 * Rationale: a full class period of a 100–600 board tops out in the low
 * thousands, so ±1,000,000 is far beyond any real classroom total while staying
 * a small, exactly-representable integer range (well inside
 * `Number.MAX_SAFE_INTEGER`). Bounds exist so a mistyped manual correction
 * cannot put an absurd number on the projector, and so the arithmetic can never
 * approach the unsafe-integer range.
 */
export const MIN_TEAM_SCORE = -1_000_000
export const MAX_TEAM_SCORE = 1_000_000

/** Every team starts on exactly zero. Nothing is ever seeded or carried over. */
export const INITIAL_TEAM_SCORE = 0

/**
 * Maximum magnitude of a SINGLE adjustment. Equal to the score range end, so any
 * reachable score can be corrected in one step, while a single typo still cannot
 * exceed the bounds by orders of magnitude.
 */
export const MAX_SCORE_ADJUSTMENT = 1_000_000

/**
 * The owner-approved default partial-credit increment (docs/PROJECT.md —
 * "Default partial-credit increment: 50 points"). It is a HOST DEFAULT offered in
 * the input field, not an enforced rule: the teacher may type any bounded amount.
 */
export const DEFAULT_PARTIAL_CREDIT = 50

/**
 * Above this magnitude — or for any negative amount — the host requires an
 * explicit confirmation before a MANUAL adjustment is submitted. A tile preset
 * needs no confirmation because its amount is derived from the board, not typed.
 */
export const LARGE_ADJUSTMENT_CONFIRM_THRESHOLD = 1_000

/**
 * What a score adjustment MEANT, recorded as a typed reason code rather than
 * free prose. Four modes, because those are four genuinely different teacher
 * actions and a bare integer would lose that distinction forever:
 *
 *  - `full-credit`      — the team earned the tile's whole effective value.
 *  - `partial-credit`   — the team earned (or lost) part of the tile's value.
 *  - `deduction`        — an incorrect answer costs the tile's whole value.
 *  - `manual-correction`— a bounded correction not derived from a tile at all
 *                         (fixing an earlier mistake, an off-board bonus).
 *
 * These are provenance, not a derived classification: the mode records the
 * teacher's intent at the moment of the action.
 */
export const SCORE_ADJUSTMENT_MODES = [
  'full-credit',
  'partial-credit',
  'deduction',
  'manual-correction',
] as const

export type ScoreAdjustmentMode = (typeof SCORE_ADJUSTMENT_MODES)[number]

const SCORE_ADJUSTMENT_MODE_SET: ReadonlySet<string> = new Set(SCORE_ADJUSTMENT_MODES)

export function isScoreAdjustmentMode(value: unknown): value is ScoreAdjustmentMode {
  return typeof value === 'string' && SCORE_ADJUSTMENT_MODE_SET.has(value)
}

/** Host-facing label for a mode. Host-only copy — never projected. */
export const SCORE_ADJUSTMENT_MODE_LABEL: Readonly<Record<ScoreAdjustmentMode, string>> = {
  'full-credit': 'full credit',
  'partial-credit': 'partial credit',
  deduction: 'deduction',
  'manual-correction': 'manual correction',
}

/**
 * WHERE the amount came from — the durable provenance that makes a score event
 * explainable months later.
 *
 * `category-board-tile` names the round and tile whose effective value the
 * amount was derived from. `manual` states that no board value was involved.
 * A future round type adds a member here; nothing else changes.
 */
export type ScoreSource =
  | {
      readonly kind: 'category-board-tile'
      readonly roundId: string
      readonly tileId: string
    }
  | { readonly kind: 'manual' }

/** Structural guard for a source, used at the command boundary. */
export function isScoreSource(value: unknown): value is ScoreSource {
  if (typeof value !== 'object' || value === null) return false
  const v = value as Record<string, unknown>
  if (v.kind === 'manual') return true
  return (
    v.kind === 'category-board-tile' &&
    typeof v.roundId === 'string' &&
    v.roundId.length > 0 &&
    typeof v.tileId === 'string' &&
    v.tileId.length > 0
  )
}

/**
 * Does this mode require a value-bearing source (a tile), or a manual one?
 *
 * The three tile modes are DEFINED relative to a tile's effective value, so they
 * are meaningless without one; `manual-correction` is defined by the absence of
 * one. Requiring an exact match in both directions is what stops a "full credit"
 * event that secretly carries an arbitrary amount.
 */
export function modeRequiresValueSource(mode: ScoreAdjustmentMode): boolean {
  return mode !== 'manual-correction'
}

/** Is this a legal single adjustment amount: a non-zero, bounded integer? */
export function isScoreDelta(value: unknown): value is number {
  return (
    typeof value === 'number' &&
    Number.isInteger(value) &&
    value !== 0 &&
    Math.abs(value) <= MAX_SCORE_ADJUSTMENT
  )
}

/** Is this a legal team score: an integer inside the documented bounds? */
export function isTeamScore(value: unknown): value is number {
  return (
    typeof value === 'number' &&
    Number.isInteger(value) &&
    value >= MIN_TEAM_SCORE &&
    value <= MAX_TEAM_SCORE
  )
}

/**
 * Why an adjustment was refused. These map 1:1 onto reducer rejection reasons,
 * so the domain rule and the command rejection can never disagree.
 */
export type ScoreAdjustmentRejection =
  | 'invalid-score-delta'
  | 'invalid-score-source'
  | 'score-amount-mismatch'
  | 'score-out-of-range'

export interface ScoreAdjustmentCheck {
  readonly mode: ScoreAdjustmentMode
  /** The signed amount requested. */
  readonly delta: number
  /** The team's score BEFORE this adjustment. */
  readonly currentScore: number
  /**
   * The effective value of the source tile, or `null` for a manual source. Note
   * this is the EFFECTIVE (multiplied) value — `value × multiplier` — resolved by
   * the caller from the trusted board, never recomputed here.
   */
  readonly sourceValue: number | null
}

export type ScoreAdjustmentOutcome =
  | { readonly ok: true; readonly resultingScore: number }
  | { readonly ok: false; readonly reason: ScoreAdjustmentRejection }

/**
 * THE scoring rule. Pure, total, and the single authority on whether an
 * adjustment may become an event.
 *
 * | mode              | source | amount rule                     |
 * | ----------------- | ------ | ------------------------------- |
 * | full-credit       | tile   | delta === effectiveValue        |
 * | deduction         | tile   | delta === −effectiveValue       |
 * | partial-credit    | tile   | 0 < |delta| ≤ effectiveValue     |
 * | manual-correction | manual | 0 < |delta| ≤ MAX_SCORE_ADJUSTMENT |
 *
 * Two notes on deliberate edge cases:
 *
 *  - A tile whose effective value is **0** (a legal warm-up tile) admits no tile
 *    preset at all: every amount rule above would require a zero delta, and a
 *    zero-point event is not a fact worth recording. Use a manual correction.
 *  - `partial-credit` accepts an amount equal to the full value. The mode records
 *    what the teacher chose; it is not a derived classification, and the amount is
 *    exactly the number they entered.
 */
export function checkScoreAdjustment(input: ScoreAdjustmentCheck): ScoreAdjustmentOutcome {
  const { mode, delta, currentScore, sourceValue } = input

  if (!isScoreDelta(delta)) return { ok: false, reason: 'invalid-score-delta' }
  if (!isTeamScore(currentScore)) return { ok: false, reason: 'score-out-of-range' }

  if (modeRequiresValueSource(mode)) {
    if (sourceValue === null || !Number.isInteger(sourceValue) || sourceValue < 0) {
      return { ok: false, reason: 'invalid-score-source' }
    }
    if (mode === 'full-credit' && delta !== sourceValue) {
      return { ok: false, reason: 'score-amount-mismatch' }
    }
    if (mode === 'deduction' && delta !== -sourceValue) {
      return { ok: false, reason: 'score-amount-mismatch' }
    }
    if (mode === 'partial-credit' && Math.abs(delta) > sourceValue) {
      return { ok: false, reason: 'score-amount-mismatch' }
    }
  } else if (sourceValue !== null) {
    // A manual correction must not claim a board value it did not use.
    return { ok: false, reason: 'invalid-score-source' }
  }

  const resultingScore = currentScore + delta
  if (!isTeamScore(resultingScore)) return { ok: false, reason: 'score-out-of-range' }

  return { ok: true, resultingScore }
}

/**
 * The full-credit amount for a tile: exactly its effective value. Exported so the
 * host preset and the reducer's check are provably the same number.
 */
export function fullCreditDelta(effectiveValue: number): number {
  return effectiveValue
}

/** The full-deduction amount for a tile: exactly the negative effective value. */
export function fullDeductionDelta(effectiveValue: number): number {
  return -effectiveValue
}

/**
 * The partial-credit amount the host OFFERS for a tile: the owner-approved
 * default of 50, or the tile's whole effective value when that is smaller (a
 * 25-point tile cannot give 50 points of partial credit). Integer arithmetic
 * only — there is no fraction and therefore no rounding.
 */
export function suggestedPartialCredit(effectiveValue: number): number {
  if (!Number.isInteger(effectiveValue) || effectiveValue <= 0) return 0
  return Math.min(DEFAULT_PARTIAL_CREDIT, effectiveValue)
}

/**
 * Does this manual amount need an explicit host confirmation? Negative amounts
 * always do (taking points away is the action a teacher most regrets), as does
 * any large magnitude.
 */
export function requiresAdjustmentConfirmation(delta: number): boolean {
  return delta < 0 || Math.abs(delta) > LARGE_ADJUSTMENT_CONFIRM_THRESHOLD
}

/**
 * Format a signed amount for HOST display: `+100`, `-50`. Fixed ASCII, no locale
 * (`toLocaleString` would make host copy environment-dependent, and a formatted
 * value must never be able to differ between two machines replaying the same log).
 */
export function formatSignedDelta(delta: number): string {
  return delta > 0 ? `+${delta}` : String(delta)
}
