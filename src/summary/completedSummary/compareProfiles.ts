import type { CompetitiveProfileV1 } from './competitiveProfile'

export type CompetitiveProfileMismatchReason =
  | 'profile-contract'
  | 'summary-contract'
  | 'game-id'
  | 'definition-fingerprint'
  | 'scoring'
  | 'teams'
  | 'rounds'
  | 'final-semantics'

export interface CompetitiveProfileComparison {
  readonly compatible: boolean
  readonly reasons: readonly CompetitiveProfileMismatchReason[]
}

export function compareCompetitiveProfiles(
  left: CompetitiveProfileV1,
  right: CompetitiveProfileV1,
): CompetitiveProfileComparison {
  const reasons: CompetitiveProfileMismatchReason[] = []
  if (left.kind !== right.kind || left.version !== right.version) reasons.push('profile-contract')
  if (!same(left.summaryContract, right.summaryContract)) reasons.push('summary-contract')
  if (left.game.gameId !== right.game.gameId) reasons.push('game-id')
  if (left.game.canonicalDefinitionSha256 !== right.game.canonicalDefinitionSha256) {
    reasons.push('definition-fingerprint')
  }
  if (!same(left.scoring, right.scoring)) reasons.push('scoring')
  if (!same(left.teams, right.teams)) reasons.push('teams')
  if (!same(left.rounds, right.rounds)) reasons.push('rounds')
  if (!same(left.finalSemantics, right.finalSemantics)) reasons.push('final-semantics')
  return { compatible: reasons.length === 0, reasons }
}

function same(left: unknown, right: unknown): boolean {
  return JSON.stringify(left) === JSON.stringify(right)
}
