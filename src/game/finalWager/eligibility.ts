import type { GameDefinition } from '../gameDefinition'
import type { TeamDefinition } from '../teams/definition'
import { MAX_TEAM_SCORE, MIN_TEAM_SCORE, isTeamScore } from '../teams/scoring'
import { allTiles, readCategoryBoardDefinition } from '../categoryBoard/definition'
import { NO_PRECEDING_CLUE_WAGER_CAP } from './limits'

/**
 * Final eligibility, wager caps and reveal order (Slice 14 — CQS-OD-005,
 * CQS-OD-006, CQS-OD-008).
 *
 * Everything in this module is a PURE function of a game definition and a score
 * lookup. There is no clock, no randomness and no state, so the snapshot a Final
 * freezes at the moment it begins is reproducible by replay on any machine — and
 * because it is frozen onto the `FINAL_WAGER_STARTED` event, replay never has to
 * recompute it at all. That is the same technique `RoundSupport` uses (ADR-003):
 * resolve once at plan time, store the answer, and replay deterministically
 * without consulting anything outside the log.
 *
 * ## Why a snapshot rather than live derivation
 *
 * Every value here — who may play, what each team may risk, who is revealed
 * first — is defined relative to the scores as they stood BEFORE Final. Deriving
 * them live would make them drift the instant the first settlement lands: a team
 * that just lost its wager would suddenly become ineligible, and the reveal order
 * would reshuffle itself halfway through the reveals. Freezing is not an
 * optimization, it is the rule (CQS-OD-005).
 */

/**
 * How the host decided who plays Final (CQS-OD-005). Exactly two bounded
 * choices — this is deliberately not a policy object, a preset, or a per-team
 * override list.
 *
 *  - `classic`   — only teams whose pre-final score is greater than zero. The
 *                  default, and the traditional rule: you cannot wager what you
 *                  do not have.
 *  - `inclusive` — every authored team plays, whatever its score. The classroom
 *                  rule: a team that had a bad round still gets the last question.
 */
export const FINAL_ELIGIBILITY_MODES = ['classic', 'inclusive'] as const

export type FinalEligibilityMode = (typeof FINAL_ELIGIBILITY_MODES)[number]

const FINAL_ELIGIBILITY_MODE_SET: ReadonlySet<string> = new Set(FINAL_ELIGIBILITY_MODES)

/** Structural guard for an eligibility mode. Used at the command boundary. */
export function isFinalEligibilityMode(value: unknown): value is FinalEligibilityMode {
  return typeof value === 'string' && FINAL_ELIGIBILITY_MODE_SET.has(value)
}

/** The default mode, applied by the host UI. Classic is the traditional rule. */
export const DEFAULT_FINAL_ELIGIBILITY_MODE: FinalEligibilityMode = 'classic'

/** Host-facing label for a mode. Host-only copy — never projected. */
export const FINAL_ELIGIBILITY_MODE_LABEL: Readonly<Record<FinalEligibilityMode, string>> = {
  classic: 'Classic — positive scores only',
  inclusive: 'Inclusive — every team plays',
}

/** One team's frozen Final facts: who it is, where it stood, what it may risk. */
export interface FinalEligibleTeam {
  /** Stable authored team id. Identity — never the name. */
  readonly teamId: string
  /** The team's score at the instant Final began. Never re-derived afterwards. */
  readonly preFinalScore: number
  /**
   * The largest wager this team may commit. Already the MINIMUM of the policy cap
   * and both score-bound headrooms, so the planner compares against one number
   * rather than re-deriving three.
   */
  readonly maxWager: number
}

/** The complete frozen eligibility/cap/order snapshot taken when Final begins. */
export interface FinalEligibilitySnapshot {
  readonly mode: FinalEligibilityMode
  /** Eligible teams in AUTHORED order. Empty is valid under `classic`. */
  readonly teams: readonly FinalEligibleTeam[]
  /**
   * The default reveal order as team ids: ascending pre-final score, with
   * authored order as the deterministic tie-break (CQS-OD-008). The host may
   * reveal any unrevealed eligible team instead; this is the offered order, not a
   * constraint.
   */
  readonly revealOrder: readonly string[]
}

/**
 * The highest positive EFFECTIVE ordinary clue value among the category-board
 * rounds preceding Final — the policy cap for a team on zero or a negative score
 * (CQS-OD-006).
 *
 * "Ordinary" means a `category-board` tile: the Final round itself contributes
 * nothing, and a round whose config cannot be read as a board contributes
 * nothing rather than being guessed at. When no such value exists (a Final-only
 * game, or a game whose earlier boards are all zero-value warm-ups) the cap is
 * {@link NO_PRECEDING_CLUE_WAGER_CAP} — zero — and a non-positive team may still
 * play with an explicit zero wager.
 */
export function highestPrecedingClueValue(
  definition: GameDefinition,
  finalRoundIndex: number,
): number {
  let highest = NO_PRECEDING_CLUE_WAGER_CAP
  for (let index = 0; index < finalRoundIndex; index += 1) {
    const round = definition.rounds[index]
    if (!round) continue
    const board = readCategoryBoardDefinition(round)
    if (board === null) continue
    for (const tile of allTiles(board)) {
      if (tile.effectiveValue > highest) highest = tile.effectiveValue
    }
  }
  return highest
}

/**
 * The POLICY cap for one team, before score-bound headroom is applied
 * (CQS-OD-006).
 *
 * A positive team may risk what it has. A zero-or-negative team may risk up to
 * the biggest ordinary clue value it could have won earlier — which is the
 * classroom answer to "how do you wager nothing?": you may bet what one good
 * question was worth.
 */
export function finalPolicyCap(preFinalScore: number, precedingClueCap: number): number {
  if (preFinalScore > 0) return preFinalScore
  return precedingClueCap > 0 ? precedingClueCap : NO_PRECEDING_CLUE_WAGER_CAP
}

/**
 * The EFFECTIVE maximum wager: the policy cap, further bounded so that neither a
 * correct settlement (`+wager`) nor an incorrect one (`−wager`) can leave the
 * documented score range.
 *
 * Both directions are bounded because the outcome is unknown at wager time. A
 * team on +999,000 cannot wager 999,000 (a win would exceed `MAX_TEAM_SCORE`),
 * and a team on −999,000 cannot wager 999,000 either (a loss would fall below
 * `MIN_TEAM_SCORE`). The result is never negative: a cap that computes below zero
 * becomes zero, because zero is always a legal wager.
 */
export function effectiveMaxWager(preFinalScore: number, precedingClueCap: number): number {
  if (!isTeamScore(preFinalScore)) return 0
  const policy = finalPolicyCap(preFinalScore, precedingClueCap)
  const upperHeadroom = MAX_TEAM_SCORE - preFinalScore
  const lowerHeadroom = preFinalScore - MIN_TEAM_SCORE
  const bounded = Math.min(policy, upperHeadroom, lowerHeadroom)
  return bounded > 0 ? bounded : 0
}

/** Is this team eligible under the chosen mode? Pure, and the only membership rule. */
export function isEligibleUnder(mode: FinalEligibilityMode, preFinalScore: number): boolean {
  return mode === 'inclusive' || preFinalScore > 0
}

/**
 * Build the frozen snapshot for a Final that is about to begin.
 *
 * `scoreFor` supplies each team's pre-final score; the caller reads it from the
 * replayed session state, so this module never touches private state directly.
 *
 * The returned `teams` list keeps AUTHORED order (so nothing anywhere re-sorts
 * teams), while `revealOrder` is the separately-derived low-to-high sequence.
 * Keeping them apart means the scoreboard order and the reveal order can never be
 * confused for one another.
 */
export function buildFinalEligibilitySnapshot(input: {
  readonly mode: FinalEligibilityMode
  readonly teams: readonly TeamDefinition[]
  readonly scoreFor: (teamId: string) => number
  readonly precedingClueCap: number
}): FinalEligibilitySnapshot {
  const { mode, teams, scoreFor, precedingClueCap } = input

  const eligible: FinalEligibleTeam[] = []
  for (const team of teams) {
    const preFinalScore = scoreFor(team.id)
    if (!isEligibleUnder(mode, preFinalScore)) continue
    eligible.push({
      teamId: team.id,
      preFinalScore,
      maxWager: effectiveMaxWager(preFinalScore, precedingClueCap),
    })
  }

  // Ascending pre-final score, authored order breaking ties (CQS-OD-008). The
  // index comparison is what makes the tie-break DETERMINISTIC rather than
  // dependent on `Array#sort` stability guarantees.
  const revealOrder = eligible
    .map((team, index) => ({ team, index }))
    .sort((a, b) => {
      if (a.team.preFinalScore !== b.team.preFinalScore) {
        return a.team.preFinalScore - b.team.preFinalScore
      }
      return a.index - b.index
    })
    .map((entry) => entry.team.teamId)

  return { mode, teams: eligible, revealOrder }
}

/** Find one eligible team's frozen facts, or `null`. Linear, deterministic. */
export function findEligibleTeam(
  snapshot: FinalEligibilitySnapshot,
  teamId: string,
): FinalEligibleTeam | null {
  return snapshot.teams.find((team) => team.teamId === teamId) ?? null
}

/**
 * Structural guard for a frozen snapshot, used where a snapshot arrives from an
 * untrusted boundary (a stored event, a decoded persistence record). Fail-closed:
 * anything it cannot vouch for is not a snapshot.
 */
export function isFinalEligibilitySnapshot(
  value: unknown,
): value is FinalEligibilitySnapshot {
  if (typeof value !== 'object' || value === null) return false
  const v = value as Record<string, unknown>
  if (!isFinalEligibilityMode(v.mode)) return false
  if (!Array.isArray(v.teams) || !Array.isArray(v.revealOrder)) return false
  if (!v.teams.every(isFinalEligibleTeam)) return false
  if (!v.revealOrder.every((id) => typeof id === 'string' && id.length > 0)) return false
  // The reveal order must be a permutation of the eligible teams: a sequence
  // naming a team that cannot play, or omitting one that can, is not a snapshot
  // this build produced and is rejected rather than played around.
  if (v.revealOrder.length !== v.teams.length) return false
  const ids = new Set(v.teams.map((team) => team.teamId))
  return v.revealOrder.every((id: string) => ids.has(id)) && ids.size === v.teams.length
}

function isFinalEligibleTeam(value: unknown): value is FinalEligibleTeam {
  if (typeof value !== 'object' || value === null) return false
  const v = value as Record<string, unknown>
  return (
    typeof v.teamId === 'string' &&
    v.teamId.length > 0 &&
    isTeamScore(v.preFinalScore) &&
    typeof v.maxWager === 'number' &&
    Number.isInteger(v.maxWager) &&
    v.maxWager >= 0 &&
    v.maxWager <= MAX_TEAM_SCORE
  )
}

/** Deep-copy a snapshot so an appended event can never alias a caller's object. */
export function cloneFinalEligibilitySnapshot(
  snapshot: FinalEligibilitySnapshot,
): FinalEligibilitySnapshot {
  return {
    mode: snapshot.mode,
    teams: snapshot.teams.map((team) => ({
      teamId: team.teamId,
      preFinalScore: team.preFinalScore,
      maxWager: team.maxWager,
    })),
    revealOrder: [...snapshot.revealOrder],
  }
}
