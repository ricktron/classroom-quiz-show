import { deepFreeze } from '../../game/deepFreeze'
import {
  SESSION_SUMMARY_CONTRACT_KIND,
  SESSION_SUMMARY_CONTRACT_VERSION,
  type SessionSummaryV1,
} from '../contract'
import { validateClassLabel } from './classLabel'
import {
  COMPETITIVE_PROFILE_KIND,
  COMPETITIVE_PROFILE_VERSION,
  COMPLETED_SUMMARY_RECORD_KIND,
  COMPLETED_SUMMARY_RECORD_VERSION,
} from './constants'
import type { CompetitiveProfileV1 } from './competitiveProfile'
import type { CompletedSummaryRecordV1 } from './record'

export type CompletedSummaryDecodeResult =
  | { readonly status: 'valid'; readonly record: CompletedSummaryRecordV1 }
  | { readonly status: 'unsupported-envelope-version'; readonly version: number }
  | { readonly status: 'unsupported-summary-version'; readonly version: number }
  | {
      readonly status: 'unsupported-profile-version'
      readonly version: number
      readonly summary?: SessionSummaryV1
    }
  | { readonly status: 'corrupt'; readonly message: string }

export function encodeCompletedSummaryRecord(record: CompletedSummaryRecordV1): unknown {
  return structuredClone(record)
}

export function decodeCompletedSummaryRecord(input: unknown): CompletedSummaryDecodeResult {
  if (
    !isObject(input) ||
    !hasExactKeys(input, [
      'kind',
      'version',
      'recordId',
      'savedAt',
      'classLabel',
      'competitiveProfile',
      'summary',
    ]) ||
    input.kind !== COMPLETED_SUMMARY_RECORD_KIND
  ) {
    return corrupt('Completed summary envelope is malformed or has unknown keys.')
  }
  if (typeof input.version !== 'number') return corrupt('Envelope version is malformed.')
  if (input.version !== COMPLETED_SUMMARY_RECORD_VERSION) {
    return { status: 'unsupported-envelope-version', version: input.version }
  }
  if (
    typeof input.recordId !== 'string' ||
    input.recordId.length === 0 ||
    !isNonNegativeInteger(input.savedAt) ||
    !validateClassLabel(input.classLabel).ok
  ) {
    return corrupt('Completed summary envelope fields are invalid.')
  }

  const summaryEnvelope = input.summary
  if (!isObject(summaryEnvelope) || summaryEnvelope.kind !== SESSION_SUMMARY_CONTRACT_KIND) {
    return corrupt('Session summary envelope is malformed.')
  }
  if (typeof summaryEnvelope.version !== 'number') {
    return corrupt('Session summary version is malformed.')
  }
  if (summaryEnvelope.version !== SESSION_SUMMARY_CONTRACT_VERSION) {
    return { status: 'unsupported-summary-version', version: summaryEnvelope.version }
  }
  const validSummary = isSessionSummaryV1(summaryEnvelope)
  if (!validSummary) return corrupt('Session Summary V1 is corrupt or has unknown keys.')

  const profileEnvelope = input.competitiveProfile
  if (!isObject(profileEnvelope) || profileEnvelope.kind !== COMPETITIVE_PROFILE_KIND) {
    return corrupt('Competitive profile envelope is malformed.')
  }
  if (typeof profileEnvelope.version !== 'number') {
    return corrupt('Competitive profile version is malformed.')
  }
  if (profileEnvelope.version !== COMPETITIVE_PROFILE_VERSION) {
    return deepFreeze({
      status: 'unsupported-profile-version',
      version: profileEnvelope.version,
      summary: structuredClone(summaryEnvelope) as unknown as SessionSummaryV1,
    })
  }
  if (!isCompetitiveProfileV1(profileEnvelope)) {
    return corrupt('Competitive Profile V1 is corrupt or has unknown keys.')
  }
  const summary = summaryEnvelope as unknown as SessionSummaryV1
  const profile = profileEnvelope as unknown as CompetitiveProfileV1
  if (
    input.recordId !== summary.sessionId ||
    profile.game.gameId !== summary.gameId
  ) {
    return corrupt('Record, summary, and profile identities do not match.')
  }

  return deepFreeze({
    status: 'valid',
    record: structuredClone(input) as unknown as CompletedSummaryRecordV1,
  })
}

function isCompetitiveProfileV1(value: Record<string, unknown>): boolean {
  if (
    !hasExactKeys(value, [
      'kind',
      'version',
      'summaryContract',
      'game',
      'scoring',
      'teams',
      'rounds',
      'finalSemantics',
    ])
  ) return false
  const summary = value.summaryContract
  const game = value.game
  const scoring = value.scoring
  const teams = value.teams
  const rounds = value.rounds
  const final = value.finalSemantics
  return (
    value.kind === COMPETITIVE_PROFILE_KIND &&
    value.version === COMPETITIVE_PROFILE_VERSION &&
    isObject(summary) &&
    hasExactKeys(summary, ['kind', 'version']) &&
    summary.kind === SESSION_SUMMARY_CONTRACT_KIND &&
    summary.version === SESSION_SUMMARY_CONTRACT_VERSION &&
    isObject(game) &&
    hasExactKeys(game, ['gameId', 'canonicalDefinitionSha256']) &&
    isNonEmptyString(game.gameId) &&
    typeof game.canonicalDefinitionSha256 === 'string' &&
    /^[0-9a-f]{64}$/.test(game.canonicalDefinitionSha256) &&
    isObject(scoring) &&
    hasExactKeys(scoring, ['kind', 'version']) &&
    scoring.kind === 'integer-points' &&
    scoring.version === 1 &&
    isObject(teams) &&
    hasExactKeys(teams, ['count', 'orderedTeamIds', 'identitySemantics']) &&
    isNonNegativeInteger(teams.count) &&
    Array.isArray(teams.orderedTeamIds) &&
    teams.orderedTeamIds.length === teams.count &&
    teams.orderedTeamIds.every(isNonEmptyString) &&
    new Set(teams.orderedTeamIds).size === teams.orderedTeamIds.length &&
    teams.identitySemantics === 'authored-team-id-within-exact-definition' &&
    Array.isArray(rounds) &&
    rounds.every(
      (round) =>
        isObject(round) &&
        hasExactKeys(round, ['authoredRoundType', 'summarySupport']) &&
        isNonEmptyString(round.authoredRoundType) &&
        (round.summarySupport === 'supported' || round.summarySupport === 'unsupported'),
    ) &&
    isObject(final) &&
    hasExactKeys(final, ['presence', 'eligibilityMode', 'responseCaptureMode']) &&
    (final.presence === 'present' || final.presence === 'absent') &&
    ['classic', 'inclusive', 'unavailable'].includes(String(final.eligibilityMode)) &&
    ['exact-text', 'host-only', 'unavailable'].includes(String(final.responseCaptureMode))
  )
}

function isSessionSummaryV1(value: Record<string, unknown>): boolean {
  if (
    !hasExactKeys(value, [
      'kind',
      'version',
      'derivationBasis',
      'sessionId',
      'gameId',
      'gameTitle',
      'recordedSessionStartAt',
      'recordedCompletionAt',
      'terminalPath',
      'scoreActivity',
      'timerActivity',
      'buzzActivity',
      'categoryBoards',
      'finalWager',
      'unavailableRounds',
    ]) ||
    value.kind !== SESSION_SUMMARY_CONTRACT_KIND ||
    value.version !== SESSION_SUMMARY_CONTRACT_VERSION ||
    !isNonEmptyString(value.sessionId) ||
    !isNonEmptyString(value.gameId) ||
    !isNonEmptyString(value.gameTitle) ||
    !isNonNegativeInteger(value.recordedSessionStartAt) ||
    !isNonNegativeInteger(value.recordedCompletionAt) ||
    ![
      'ordinary-or-host-ended',
      'final-unique-winner',
      'final-accepted-tied-finish',
      'final-sudden-death-winner',
    ].includes(String(value.terminalPath))
  ) return false
  return (
    isDerivationBasis(value.derivationBasis) &&
    isScoreActivity(value.scoreActivity) &&
    isTimerActivity(value.timerActivity) &&
    isBuzzActivity(value.buzzActivity) &&
    isCategoryBoards(value.categoryBoards) &&
    isFinalWager(value.finalWager) &&
    Array.isArray(value.unavailableRounds) &&
    value.unavailableRounds.every(isUnavailableRound)
  )
}

function isDerivationBasis(value: unknown): boolean {
  return (
    isObject(value) &&
    hasExactKeys(value, ['kind', 'effectiveEventCount', 'historyEventCount']) &&
    value.kind === 'effective-history-and-replay' &&
    isNonNegativeInteger(value.effectiveEventCount) &&
    isNonNegativeInteger(value.historyEventCount)
  )
}

function isScoreActivity(value: unknown): boolean {
  if (!isObject(value) || !hasExactKeys(value, ['observed', 'derived'])) return false
  const observed = value.observed
  const derived = value.derived
  return (
    isObject(observed) &&
    hasExactKeys(observed, [
      'scoreChangeCount',
      'tileLinkedAdjustmentCount',
      'manualAdjustmentCount',
      'finalSettlementCount',
      'perTeam',
    ]) &&
    [
      observed.scoreChangeCount,
      observed.tileLinkedAdjustmentCount,
      observed.manualAdjustmentCount,
      observed.finalSettlementCount,
    ].every(isNonNegativeInteger) &&
    Array.isArray(observed.perTeam) &&
    observed.perTeam.every(isTeamActivity) &&
    isObject(derived) &&
    hasExactKeys(derived, ['standings']) &&
    Array.isArray(derived.standings) &&
    derived.standings.every(isStanding)
  )
}

function isTeamActivity(value: unknown): boolean {
  return (
    isObject(value) &&
    hasExactKeys(value, [
      'teamId',
      'teamName',
      'scoreChangeCount',
      'netDelta',
      'finalScore',
    ]) &&
    isNonEmptyString(value.teamId) &&
    isNonEmptyString(value.teamName) &&
    isNonNegativeInteger(value.scoreChangeCount) &&
    isInteger(value.netDelta) &&
    isInteger(value.finalScore)
  )
}

function isStanding(value: unknown): boolean {
  return (
    isObject(value) &&
    hasExactKeys(value, ['rank', 'teamId', 'teamName', 'finalScore', 'tied']) &&
    isPositiveInteger(value.rank) &&
    isNonEmptyString(value.teamId) &&
    isNonEmptyString(value.teamName) &&
    isInteger(value.finalScore) &&
    typeof value.tied === 'boolean'
  )
}

const TIMER_KEYS = ['starts', 'pauses', 'resumes', 'expirations', 'interruptions', 'resets']
function isTimerActivity(value: unknown): boolean {
  if (!isObject(value) || !hasExactKeys(value, ['observed']) || !isObject(value.observed)) {
    return false
  }
  const observed = value.observed
  return hasExactKeys(observed, TIMER_KEYS) &&
    TIMER_KEYS.every((key) => isNonNegativeInteger(observed[key]))
}

function isBuzzActivity(value: unknown): boolean {
  return (
    isObject(value) &&
    hasExactKeys(value, ['observed']) &&
    isObject(value.observed) &&
    hasExactKeys(value.observed, ['acceptedBuzzCount', 'activeResponseResolutionCount']) &&
    isNonNegativeInteger(value.observed.acceptedBuzzCount) &&
    isNonNegativeInteger(value.observed.activeResponseResolutionCount)
  )
}

function isCategoryBoards(value: unknown): boolean {
  if (!isObject(value) || typeof value.kind !== 'string') return false
  if (value.kind === 'none') {
    return hasExactKeys(value, ['kind', 'reason']) && value.reason === 'no-category-board-rounds'
  }
  return (
    value.kind === 'rounds' &&
    hasExactKeys(value, ['kind', 'rounds']) &&
    Array.isArray(value.rounds) &&
    value.rounds.every(isCategoryBoardRound)
  )
}

const BOARD_OBSERVED_KEYS = [
  'tileSelections', 'promptReveals', 'answerReveals', 'returnsToBoard',
  'tileLinkedScoreAdjustments', 'acceptedBuzzes', 'activeResponseResolutions',
  'timerStarts', 'timerPauses', 'timerResumes', 'timerExpirations',
  'timerInterruptions', 'timerResets',
]
const BOARD_DERIVED_KEYS = [
  'totalTiles', 'consumedTiles', 'consumedTilesWithoutTileLinkedScore',
  'totalCategories', 'clearedCategories',
]
function isCategoryBoardRound(value: unknown): boolean {
  if (
    !isObject(value) ||
    !hasExactKeys(value, ['roundId', 'roundTitle', 'observed', 'derived']) ||
    !isNonEmptyString(value.roundId) ||
    !isNonEmptyString(value.roundTitle) ||
    !isObject(value.observed) ||
    !isObject(value.derived)
  ) return false
  const observed = value.observed
  const derived = value.derived
  return (
    hasExactKeys(observed, BOARD_OBSERVED_KEYS) &&
    BOARD_OBSERVED_KEYS.every((key) => isNonNegativeInteger(observed[key])) &&
    hasExactKeys(derived, BOARD_DERIVED_KEYS) &&
    BOARD_DERIVED_KEYS.every((key) => isNonNegativeInteger(derived[key]))
  )
}

function isFinalWager(value: unknown): boolean {
  if (!isObject(value) || typeof value.kind !== 'string') return false
  if (value.kind === 'unavailable') {
    return (
      hasExactKeys(value, ['kind', 'reason']) &&
      ['no-final-round', 'final-not-begun', 'final-incomplete', 'unsupported-final-state']
        .includes(String(value.reason))
    )
  }
  return (
    value.kind === 'available' &&
    hasExactKeys(value, ['kind', 'roundId', 'roundTitle', 'observed', 'derived']) &&
    isNonEmptyString(value.roundId) &&
    isNonEmptyString(value.roundTitle) &&
    isFinalObserved(value.observed) &&
    isFinalDerived(value.derived)
  )
}

function isFinalObserved(value: unknown): boolean {
  if (
    !isObject(value) ||
    !hasExactKeys(value, [
      'eligibilityMode', 'eligibleTeamCount', 'wagerEntryEventCount',
      'responseEntryEventCount', 'settlementCount', 'wagerWindow', 'responseWindow',
    ]) ||
    !['classic', 'inclusive'].includes(String(value.eligibilityMode)) ||
    ![value.eligibleTeamCount, value.wagerEntryEventCount, value.responseEntryEventCount,
      value.settlementCount].every(isNonNegativeInteger)
  ) return false
  return isFinalWindow(value.wagerWindow) && isFinalWindow(value.responseWindow)
}

function isFinalWindow(value: unknown): boolean {
  const keys = ['starts', 'pauses', 'resumes', 'expirations']
  return isObject(value) && hasExactKeys(value, keys) && keys.every((key) => isNonNegativeInteger(value[key]))
}

function isFinalDerived(value: unknown): boolean {
  if (
    !isObject(value) ||
    !hasExactKeys(value, [
      'distinctWagerParticipantCount', 'responseStateCounts',
      'settlementOutcomeCounts', 'resolutionPath',
    ]) ||
    !isNonNegativeInteger(value.distinctWagerParticipantCount) ||
    ![
      'unique-winner', 'accepted-tied-finish', 'sudden-death-winner',
      'host-ended-incomplete', 'zero-eligible-complete',
    ].includes(String(value.resolutionPath))
  ) return false
  const response = value.responseStateCounts
  const outcomes = value.settlementOutcomeCounts
  return (
    isObject(response) &&
    hasExactKeys(response, ['exact', 'notCaptured', 'noResponse']) &&
    [response.exact, response.notCaptured, response.noResponse].every(isNonNegativeInteger) &&
    isObject(outcomes) &&
    hasExactKeys(outcomes, ['correct', 'incorrect', 'noResponse']) &&
    [outcomes.correct, outcomes.incorrect, outcomes.noResponse].every(isNonNegativeInteger)
  )
}

function isUnavailableRound(value: unknown): boolean {
  return (
    isObject(value) &&
    hasExactKeys(value, ['roundId', 'roundTitle', 'authoredRoundType', 'reason']) &&
    isNonEmptyString(value.roundId) &&
    isNonEmptyString(value.roundTitle) &&
    isNonEmptyString(value.authoredRoundType) &&
    value.reason === 'unsupported-round-type'
  )
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function compareKeys(left: string, right: string): number {
  return left.localeCompare(right)
}

function hasExactKeys(value: Record<string, unknown>, expected: readonly string[]): boolean {
  const actual = Object.keys(value)
  actual.sort(compareKeys)
  const wanted = [...expected]
  wanted.sort(compareKeys)
  return actual.length === wanted.length && actual.every((key, index) => key === wanted[index])
}

function isInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value)
}
function isNonNegativeInteger(value: unknown): value is number {
  return isInteger(value) && value >= 0
}
function isPositiveInteger(value: unknown): value is number {
  return isInteger(value) && value > 0
}
function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0
}
function corrupt(message: string): CompletedSummaryDecodeResult {
  return { status: 'corrupt', message }
}
