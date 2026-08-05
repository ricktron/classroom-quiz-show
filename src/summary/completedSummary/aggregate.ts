import type { CompletedSummaryRecordV1 } from './record'
import { compareCompetitiveProfiles } from './compareProfiles'

export interface GameSummaryRollupV1 {
  readonly gameId: string
  readonly gameTitle: string
  readonly sessionCount: number
  readonly totalScoreChangeCount: number
  readonly totalAcceptedBuzzCount: number
  readonly averageScoreChangeCountPerSession: number
}

export interface TeamSummaryRollupV1 {
  readonly teamId: string
  readonly teamName: string
  readonly sessionCount: number
  readonly totalFinalScore: number
  readonly averageFinalScorePerSession: number
  readonly totalScoreChangeCount: number
}

/**
 * Aggregate game-level totals only over mutually compatible records.
 *
 * Callers must pre-filter to one competitive-profile group; incompatible
 * records are excluded rather than mixed. Grouping key is the exact profile,
 * never game title or game id alone.
 */
export function aggregateByGame(
  records: readonly CompletedSummaryRecordV1[],
): readonly GameSummaryRollupV1[] {
  const compatible = compatibleWithFirst(records)
  const groups = new Map<string, GameSummaryRollupV1>()
  for (const { summary, competitiveProfile } of compatible) {
    const key = competitiveProfile.game.canonicalDefinitionSha256
    const current = groups.get(key)
    const count = (current?.sessionCount ?? 0) + 1
    const totalScoreChangeCount =
      (current?.totalScoreChangeCount ?? 0) +
      summary.scoreActivity.observed.scoreChangeCount
    groups.set(key, {
      gameId: summary.gameId,
      gameTitle: summary.gameTitle,
      sessionCount: count,
      totalScoreChangeCount,
      totalAcceptedBuzzCount:
        (current?.totalAcceptedBuzzCount ?? 0) +
        summary.buzzActivity.observed.acceptedBuzzCount,
      averageScoreChangeCountPerSession: totalScoreChangeCount / count,
    })
  }
  return [...groups.values()].sort((a, b) => a.gameId.localeCompare(b.gameId))
}

export function aggregateByTeam(
  records: readonly CompletedSummaryRecordV1[],
): readonly TeamSummaryRollupV1[] {
  const compatible = compatibleWithFirst(records)
  const groups = new Map<string, TeamSummaryRollupV1>()
  for (const { summary } of compatible) {
    for (const team of summary.scoreActivity.observed.perTeam) {
      const current = groups.get(team.teamId)
      const count = (current?.sessionCount ?? 0) + 1
      const totalFinalScore = (current?.totalFinalScore ?? 0) + team.finalScore
      groups.set(team.teamId, {
        teamId: team.teamId,
        teamName: team.teamName,
        sessionCount: count,
        totalFinalScore,
        averageFinalScorePerSession: totalFinalScore / count,
        totalScoreChangeCount:
          (current?.totalScoreChangeCount ?? 0) + team.scoreChangeCount,
      })
    }
  }
  // Map insertion order preserves the authored team order from the first
  // compatible Session Summary V1.
  return [...groups.values()]
}

/**
 * Class/section rollup inside one compatible competitive-profile group.
 *
 * The label is a filter only — never a compatibility proof. Pass records that
 * already share one competitive profile (or accept filtering to the first).
 */
export function aggregateForClassLabel(
  records: readonly CompletedSummaryRecordV1[],
  classLabel: string | null,
): {
  readonly classLabel: string | null
  readonly sessionCount: number
  readonly games: readonly GameSummaryRollupV1[]
  readonly teams: readonly TeamSummaryRollupV1[]
  readonly incompatibleExcludedCount: number
} {
  const compatible = compatibleWithFirst(records)
  const selected = compatible.filter((record) => record.classLabel === classLabel)
  return {
    classLabel,
    sessionCount: selected.length,
    games: aggregateByGame(selected),
    teams: aggregateByTeam(selected),
    incompatibleExcludedCount: records.length - compatible.length,
  }
}

/** Partition valid records into exact competitive-profile groups. */
export function groupByCompetitiveProfile(
  records: readonly CompletedSummaryRecordV1[],
): readonly {
  readonly profile: CompletedSummaryRecordV1['competitiveProfile']
  readonly records: readonly CompletedSummaryRecordV1[]
}[] {
  const groups: {
    profile: CompletedSummaryRecordV1['competitiveProfile']
    records: CompletedSummaryRecordV1[]
  }[] = []
  for (const record of records) {
    const existing = groups.find(
      (group) =>
        compareCompetitiveProfiles(group.profile, record.competitiveProfile).compatible,
    )
    if (existing) {
      existing.records.push(record)
    } else {
      groups.push({ profile: record.competitiveProfile, records: [record] })
    }
  }
  return groups.map((group) => ({
    profile: group.profile,
    records: group.records,
  }))
}

function compatibleWithFirst(
  records: readonly CompletedSummaryRecordV1[],
): readonly CompletedSummaryRecordV1[] {
  const first = records[0]
  if (first === undefined) return []
  return records.filter(
    (record) =>
      compareCompetitiveProfiles(first.competitiveProfile, record.competitiveProfile)
        .compatible,
  )
}
