import type { TeamDefinition } from '../teams/definition'
import { IDLE_RESPONSE_TIMER, type ResponseTimerState } from '../timing/responsePhase'
import {
  cloneFinalEligibilitySnapshot,
  findEligibleTeam,
  type FinalEligibilitySnapshot,
} from './eligibility'
import { MAX_FINAL_RESPONSE_LENGTH, MIN_FINAL_WAGER } from './limits'

/**
 * The Final Wager private session state (Slice 14).
 *
 * Like every other gameplay field it is SESSION state DERIVED BY REPLAY from the
 * append-only event log. Nothing here is authored content, nothing here is
 * cached, and there is no write path outside `reduce`. That is what makes undo
 * exact for free: an undone wager, response, reveal or settlement is simply not
 * applied on the next replay.
 *
 * ## One phase value, not a bag of booleans
 *
 * `phase` is a single discriminated value for the same reason
 * `CategoryBoardProgress` and `ResponseTimerState` are: there is no
 * `wagersLocked && !responsesLocked` to get out of step, and an impossible
 * combination is simply not expressible. The legal sequence is:
 *
 * ```
 * setup
 *   → wager-entry → wagers-locked
 *   → response-entry → responses-locked
 *   → answer-revealed
 *   → team-reveal
 *   → resolution
 *   → sudden-death | ready-to-complete
 *   → ended
 * ```
 *
 * A Classic Final with NO eligible team skips straight from `setup` to
 * `resolution`: there are no wagers to take and no responses to record, and
 * fabricating either would be inventing facts nobody produced.
 *
 * ## Two windows, one clock discipline
 *
 * The wager window and the response window are separate `ResponseTimerState`
 * values, reusing ADR-007's durable-facts union verbatim rather than inventing a
 * Final-specific timer. A running window stores its identity, duration and
 * absolute deadline; "how long is left" is derived at the rendering edge. There
 * is no tick event and no per-second revision, and expiry records ONLY that the
 * window expired — it locks nothing, marks nothing, reveals nothing, adjudicates
 * nothing and ends nothing.
 */

/** Every Final phase, as a bounded list. */
export const FINAL_WAGER_PHASES = [
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
] as const

export type FinalWagerPhase = (typeof FINAL_WAGER_PHASES)[number]

const FINAL_WAGER_PHASE_SET: ReadonlySet<string> = new Set(FINAL_WAGER_PHASES)

export function isFinalWagerPhase(value: unknown): value is FinalWagerPhase {
  return typeof value === 'string' && FINAL_WAGER_PHASE_SET.has(value)
}

/**
 * How the host chose to capture responses (CQS-OD-007). Exactly two bounded
 * choices, taken once before the response window opens.
 *
 *  - `exact-text` — the host types what each team actually wrote. Useful when the
 *    exact wording matters and when a class wants to see it on the projector.
 *  - `host-only`  — the host adjudicates from the paper in front of them and
 *    records only whether a team responded. Faster, and it is the honest record
 *    when nobody transcribed anything.
 *
 * This is a capture decision, not a retention policy: there is no transcript, no
 * archive, no recording and no student entry anywhere in Slice 14.
 */
export const FINAL_RESPONSE_CAPTURE_MODES = ['exact-text', 'host-only'] as const

export type FinalResponseCaptureMode = (typeof FINAL_RESPONSE_CAPTURE_MODES)[number]

const FINAL_CAPTURE_MODE_SET: ReadonlySet<string> = new Set(FINAL_RESPONSE_CAPTURE_MODES)

export function isFinalResponseCaptureMode(
  value: unknown,
): value is FinalResponseCaptureMode {
  return typeof value === 'string' && FINAL_CAPTURE_MODE_SET.has(value)
}

/** Host-facing label for a capture mode. Host-only copy — never projected. */
export const FINAL_CAPTURE_MODE_LABEL: Readonly<Record<FinalResponseCaptureMode, string>> = {
  'exact-text': 'Capture exact wording',
  'host-only': 'Adjudicate without capturing wording',
}

/**
 * One team's durable response state (CQS-OD-007).
 *
 * Three members, because a classroom genuinely produces three different
 * situations and collapsing any two of them would destroy a fact:
 *
 *  - `exact`        — the team answered and the host captured the wording.
 *  - `not-captured` — the team answered; the wording was not written down.
 *  - `no-response`  — the team did not answer at all.
 *
 * "Missing" is a FOURTH situation and is deliberately not a member: a team with
 * no entry in the map has not been recorded yet, which is why the global response
 * lock refuses to close until every eligible team has an explicit state. Blank
 * text is not a no-response either — it is rejected outright, so the host must
 * say which of the three actually happened.
 */
export type FinalResponseState =
  | { readonly kind: 'exact'; readonly text: string }
  | { readonly kind: 'not-captured' }
  | { readonly kind: 'no-response' }

/** Structural guard for a response state. Used at every trust boundary. */
export function isFinalResponseState(value: unknown): value is FinalResponseState {
  if (typeof value !== 'object' || value === null) return false
  const v = value as Record<string, unknown>
  if (v.kind === 'not-captured' || v.kind === 'no-response') return v.text === undefined
  if (v.kind !== 'exact') return false
  return (
    typeof v.text === 'string' &&
    v.text.trim().length > 0 &&
    v.text.length <= MAX_FINAL_RESPONSE_LENGTH
  )
}

/** Rebuild a response state so an appended event cannot alias a caller's object. */
export function cloneFinalResponseState(state: FinalResponseState): FinalResponseState {
  return state.kind === 'exact' ? { kind: 'exact', text: state.text } : { kind: state.kind }
}

/** Did this team respond at all? `no-response` is the only "no". */
export function respondedAtAll(state: FinalResponseState): boolean {
  return state.kind !== 'no-response'
}

/**
 * How the host adjudicated one revealed team. `no-response` is a distinct outcome
 * rather than a flavour of `incorrect`, because it must agree with the durable
 * response state and because a class reads "did not answer" and "answered wrongly"
 * as different things — even though both cost the wager.
 */
export const FINAL_OUTCOMES = ['correct', 'incorrect', 'no-response'] as const

export type FinalOutcome = (typeof FINAL_OUTCOMES)[number]

const FINAL_OUTCOME_SET: ReadonlySet<string> = new Set(FINAL_OUTCOMES)

export function isFinalOutcome(value: unknown): value is FinalOutcome {
  return typeof value === 'string' && FINAL_OUTCOME_SET.has(value)
}

/** Host-facing label for an outcome. Host-only copy — never projected verbatim. */
export const FINAL_OUTCOME_LABEL: Readonly<Record<FinalOutcome, string>> = {
  correct: 'Correct',
  incorrect: 'Incorrect',
  'no-response': 'No response',
}

/**
 * THE settlement rule: correct adds the wager, incorrect and no-response subtract
 * it. Pure, total, and the single authority — the planner and the host preview
 * both call it, so they can never disagree about what a button is about to do.
 */
export function finalSettlementDelta(outcome: FinalOutcome, wager: number): number {
  return outcome === 'correct' ? wager : -wager
}

/**
 * One settled team, as a durable fact.
 *
 * It records the wager and the signed delta but NOT the resulting total, for
 * exactly the reason `TEAM_SCORE_ADJUSTED` does not (ADR-006): a stored total
 * would become a lie the moment an earlier settlement is undone. The score is
 * always derived by replaying deltas in order.
 */
export interface FinalSettlement {
  readonly teamId: string
  readonly wager: number
  readonly outcome: FinalOutcome
  readonly delta: number
}

/**
 * What the host chose to do about a tied lead (CQS-OD-011). Neither value is ever
 * reached automatically — the tie is presented and the host decides.
 */
export const FINAL_TIE_RESOLUTIONS = ['sudden-death', 'accepted-tie'] as const

export type FinalTieResolution = (typeof FINAL_TIE_RESOLUTIONS)[number]

const FINAL_TIE_RESOLUTION_SET: ReadonlySet<string> = new Set(FINAL_TIE_RESOLUTIONS)

export function isFinalTieResolution(value: unknown): value is FinalTieResolution {
  return typeof value === 'string' && FINAL_TIE_RESOLUTION_SET.has(value)
}

/** The complete private Final state for one round. */
export interface FinalWagerRoundState {
  readonly phase: FinalWagerPhase
  /** Frozen when Final begins; `null` before that. Never recomputed afterwards. */
  readonly snapshot: FinalEligibilitySnapshot | null
  /** The wager window's durable timer facts (ADR-007 shape, reused verbatim). */
  readonly wagerWindow: ResponseTimerState
  /** The response window's durable timer facts. */
  readonly responseWindow: ResponseTimerState
  /** Chosen when the response window opens; `null` before that. */
  readonly captureMode: FinalResponseCaptureMode | null
  /** Committed wagers by team id. A missing key means "not yet committed". */
  readonly wagers: Readonly<Record<string, number>>
  /** Committed response states by team id. A missing key means "not yet recorded". */
  readonly responses: Readonly<Record<string, FinalResponseState>>
  /** Teams revealed so far, in the order the host actually revealed them. */
  readonly revealedTeamIds: readonly string[]
  /** Settled teams by team id. A revealed team without an entry is unsettled. */
  readonly settlements: Readonly<Record<string, FinalSettlement>>
  /** The host's tie decision, or `null` when none has been taken. */
  readonly tieResolution: FinalTieResolution | null
}

/** A Final that has not begun. */
export const INITIAL_FINAL_WAGER_ROUND_STATE: FinalWagerRoundState = Object.freeze({
  phase: 'setup' as FinalWagerPhase,
  snapshot: null,
  wagerWindow: IDLE_RESPONSE_TIMER,
  responseWindow: IDLE_RESPONSE_TIMER,
  captureMode: null,
  wagers: Object.freeze({}),
  responses: Object.freeze({}),
  revealedTeamIds: Object.freeze([]) as readonly string[],
  settlements: Object.freeze({}),
  tieResolution: null,
})

/** Has this Final begun? Used to decide whether there is anything to project. */
export function isInitialFinalWagerState(state: FinalWagerRoundState): boolean {
  return state.phase === 'setup' && state.snapshot === null
}

/** Read one team's committed wager, or `null` when it has not committed yet. */
export function committedWager(state: FinalWagerRoundState, teamId: string): number | null {
  if (!Object.prototype.hasOwnProperty.call(state.wagers, teamId)) return null
  return state.wagers[teamId]
}

/** Read one team's committed response state, or `null` when none is recorded. */
export function committedResponse(
  state: FinalWagerRoundState,
  teamId: string,
): FinalResponseState | null {
  if (!Object.prototype.hasOwnProperty.call(state.responses, teamId)) return null
  return state.responses[teamId]
}

/** Read one team's settlement, or `null` when it has not been settled. */
export function settlementFor(
  state: FinalWagerRoundState,
  teamId: string,
): FinalSettlement | null {
  if (!Object.prototype.hasOwnProperty.call(state.settlements, teamId)) return null
  return state.settlements[teamId]
}

/** The eligible team ids, in authored order. Empty when Final has not begun. */
export function eligibleTeamIds(state: FinalWagerRoundState): readonly string[] {
  return state.snapshot === null ? [] : state.snapshot.teams.map((team) => team.teamId)
}

/** Has every eligible team committed an explicit wager (including a zero)? */
export function everyWagerCommitted(state: FinalWagerRoundState): boolean {
  return eligibleTeamIds(state).every((id) => committedWager(state, id) !== null)
}

/** Has every eligible team been given an explicit response state? */
export function everyResponseCommitted(state: FinalWagerRoundState): boolean {
  return eligibleTeamIds(state).every((id) => committedResponse(state, id) !== null)
}

/** Has every eligible team been revealed AND settled? */
export function everyTeamSettled(state: FinalWagerRoundState): boolean {
  return eligibleTeamIds(state).every((id) => settlementFor(state, id) !== null)
}

/**
 * The team currently on screen in the reveal sequence — revealed but not yet
 * settled — or `null` when nobody is mid-reveal.
 *
 * Derived from the two lists rather than stored as a pointer, so it cannot
 * disagree with them and cannot survive an undo that removes the reveal.
 */
export function currentRevealTeamId(state: FinalWagerRoundState): string | null {
  for (let index = state.revealedTeamIds.length - 1; index >= 0; index -= 1) {
    const teamId = state.revealedTeamIds[index]
    if (settlementFor(state, teamId) === null) return teamId
  }
  return null
}

/** The eligible teams that have not been revealed yet, in DEFAULT reveal order. */
export function unrevealedTeamIds(state: FinalWagerRoundState): readonly string[] {
  if (state.snapshot === null) return []
  const revealed = new Set(state.revealedTeamIds)
  return state.snapshot.revealOrder.filter((teamId) => !revealed.has(teamId))
}

/** The next team the default order offers, or `null` when every team is revealed. */
export function nextDefaultRevealTeamId(state: FinalWagerRoundState): string | null {
  return unrevealedTeamIds(state)[0] ?? null
}

/**
 * Is this a legal wager for this team: a whole number from zero to the team's
 * frozen effective maximum?
 *
 * Rejects — never clamps, coerces, rounds or repairs. A wager above the cap is a
 * mistake a host must see and correct, not a number the engine quietly shrinks.
 */
export function isLegalFinalWager(
  snapshot: FinalEligibilitySnapshot,
  teamId: string,
  wager: unknown,
): wager is number {
  const team = findEligibleTeam(snapshot, teamId)
  if (team === null) return false
  return (
    typeof wager === 'number' &&
    Number.isInteger(wager) &&
    wager >= MIN_FINAL_WAGER &&
    wager <= team.maxWager
  )
}

/**
 * Does this outcome agree with the team's durable response state?
 *
 * A team recorded as `no-response` can only be settled `no-response`, and a team
 * that DID respond can never be settled `no-response`. Without this the log could
 * hold a team that "did not answer" being marked correct, which is not a fact —
 * it is two facts contradicting each other.
 */
export function outcomeMatchesResponse(
  response: FinalResponseState,
  outcome: FinalOutcome,
): boolean {
  return respondedAtAll(response) ? outcome !== 'no-response' : outcome === 'no-response'
}

/**
 * The team ids currently holding the highest score, in authored order.
 *
 * Computed over EVERY authored team, not merely the eligible ones: under Classic
 * eligibility a team that could not play Final may still be the leader (indeed a
 * Classic Final with no eligible team at all resolves entirely on pre-final
 * scores), and a winner the engine refused to look at would be a bug in front of
 * a class.
 */
export function finalLeaders(
  teams: readonly TeamDefinition[],
  scoreFor: (teamId: string) => number,
): readonly string[] {
  if (teams.length === 0) return []
  let best = Number.NEGATIVE_INFINITY
  for (const team of teams) {
    const score = scoreFor(team.id)
    if (score > best) best = score
  }
  return teams.filter((team) => scoreFor(team.id) === best).map((team) => team.id)
}

/** Deep-copy a settlement so an appended event cannot alias a caller's object. */
export function cloneFinalSettlement(settlement: FinalSettlement): FinalSettlement {
  return {
    teamId: settlement.teamId,
    wager: settlement.wager,
    outcome: settlement.outcome,
    delta: settlement.delta,
  }
}

/** Deep-copy a whole Final state. Used where an untrusted value must be rebuilt. */
export function cloneFinalWagerRoundState(
  state: FinalWagerRoundState,
): FinalWagerRoundState {
  const wagers: Record<string, number> = {}
  for (const [teamId, wager] of Object.entries(state.wagers)) wagers[teamId] = wager
  const responses: Record<string, FinalResponseState> = {}
  for (const [teamId, response] of Object.entries(state.responses)) {
    responses[teamId] = cloneFinalResponseState(response)
  }
  const settlements: Record<string, FinalSettlement> = {}
  for (const [teamId, settlement] of Object.entries(state.settlements)) {
    settlements[teamId] = cloneFinalSettlement(settlement)
  }
  return {
    phase: state.phase,
    snapshot:
      state.snapshot === null ? null : cloneFinalEligibilitySnapshot(state.snapshot),
    wagerWindow: state.wagerWindow,
    responseWindow: state.responseWindow,
    captureMode: state.captureMode,
    wagers,
    responses,
    revealedTeamIds: [...state.revealedTeamIds],
    settlements,
    tieResolution: state.tieResolution,
  }
}
