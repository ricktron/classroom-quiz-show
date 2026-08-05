import { deepFreeze } from '../../game/deepFreeze'
import { FINAL_WAGER_ROUND_TYPE } from '../../game/finalWager/definition'
import type { SessionEvent } from '../../state/events'
import { effectiveEvents, replay } from '../../state/reducer'
import {
  SESSION_SUMMARY_CONTRACT_KIND,
  SESSION_SUMMARY_CONTRACT_VERSION,
} from '../contract'
import { deriveSessionSummaryV1 } from '../deriveSessionSummary'
import {
  COMPETITIVE_PROFILE_KIND,
  COMPETITIVE_PROFILE_VERSION,
} from './constants'
import { fingerprintGameDefinitionV1 } from './fingerprint'

export interface CompetitiveProfileV1 {
  readonly kind: typeof COMPETITIVE_PROFILE_KIND
  readonly version: typeof COMPETITIVE_PROFILE_VERSION
  readonly summaryContract: {
    readonly kind: typeof SESSION_SUMMARY_CONTRACT_KIND
    readonly version: typeof SESSION_SUMMARY_CONTRACT_VERSION
  }
  readonly game: {
    readonly gameId: string
    readonly canonicalDefinitionSha256: string
  }
  readonly scoring: {
    readonly kind: 'integer-points'
    readonly version: 1
  }
  readonly teams: {
    readonly count: number
    readonly orderedTeamIds: readonly string[]
    readonly identitySemantics: 'authored-team-id-within-exact-definition'
  }
  readonly rounds: readonly {
    readonly authoredRoundType: string
    readonly summarySupport: 'supported' | 'unsupported'
  }[]
  readonly finalSemantics: {
    readonly presence: 'present' | 'absent'
    readonly eligibilityMode: 'classic' | 'inclusive' | 'unavailable'
    readonly responseCaptureMode: 'exact-text' | 'host-only' | 'unavailable'
  }
}

export type CompetitiveProfileDerivationResultV1 =
  | { readonly status: 'available'; readonly profile: CompetitiveProfileV1 }
  | { readonly status: 'unavailable'; readonly message: string }

export async function deriveCompetitiveProfileV1(
  history: readonly SessionEvent[],
): Promise<CompetitiveProfileDerivationResultV1> {
  const summary = deriveSessionSummaryV1(history)
  if (summary.status !== 'available') {
    return {
      status: 'unavailable',
      message: `A competitive profile requires an available completed summary; received ${summary.status}.`,
    }
  }

  try {
    const state = replay(history)
    const definition = state.session?.game?.definition
    if (definition === undefined || definition.id !== summary.summary.gameId) {
      return { status: 'unavailable', message: 'The completed game definition is unavailable.' }
    }
    const fingerprint = await fingerprintGameDefinitionV1(definition)
    if (fingerprint.status !== 'success') {
      return { status: 'unavailable', message: fingerprint.message }
    }

    const effective = effectiveEvents(history)
    const finalRound = definition.rounds.find((round) => round.type === FINAL_WAGER_ROUND_TYPE)
    const finalStarted = findLast(effective, 'FINAL_WAGER_STARTED')
    const responseStarted = findLast(effective, 'FINAL_RESPONSE_WINDOW_STARTED')

    const profile: CompetitiveProfileV1 = {
      kind: COMPETITIVE_PROFILE_KIND,
      version: COMPETITIVE_PROFILE_VERSION,
      summaryContract: {
        kind: SESSION_SUMMARY_CONTRACT_KIND,
        version: SESSION_SUMMARY_CONTRACT_VERSION,
      },
      game: {
        gameId: definition.id,
        canonicalDefinitionSha256: fingerprint.sha256,
      },
      scoring: { kind: 'integer-points', version: 1 },
      teams: {
        count: definition.teams.length,
        orderedTeamIds: definition.teams.map((team) => team.id),
        identitySemantics: 'authored-team-id-within-exact-definition',
      },
      rounds: definition.rounds.map((round) => ({
        authoredRoundType: round.type,
        summarySupport:
          round.type === 'category-board' || round.type === FINAL_WAGER_ROUND_TYPE
            ? 'supported'
            : 'unsupported',
      })),
      finalSemantics: {
        presence: finalRound === undefined ? 'absent' : 'present',
        eligibilityMode:
          finalRound !== undefined &&
          finalStarted?.type === 'FINAL_WAGER_STARTED' &&
          finalStarted.roundId === finalRound.id
            ? finalStarted.snapshot.mode
            : 'unavailable',
        responseCaptureMode:
          finalRound !== undefined &&
          responseStarted?.type === 'FINAL_RESPONSE_WINDOW_STARTED' &&
          responseStarted.roundId === finalRound.id
            ? responseStarted.captureMode
            : 'unavailable',
      },
    }
    return deepFreeze({ status: 'available', profile })
  } catch {
    return { status: 'unavailable', message: 'Competitive profile derivation failed closed.' }
  }
}

function findLast<T extends SessionEvent['type']>(
  events: readonly SessionEvent[],
  type: T,
): Extract<SessionEvent, { readonly type: T }> | undefined {
  for (let index = events.length - 1; index >= 0; index -= 1) {
    const event = events[index]
    if (event.type === type) return event as Extract<SessionEvent, { readonly type: T }>
  }
  return undefined
}
