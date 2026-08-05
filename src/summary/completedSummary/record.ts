import { deepFreeze } from '../../game/deepFreeze'
import type { SessionEvent } from '../../state/events'
import type { SessionSummaryV1 } from '../contract'
import { deriveSessionSummaryV1 } from '../deriveSessionSummary'
import { validateClassLabel } from './classLabel'
import {
  deriveCompetitiveProfileV1,
  type CompetitiveProfileV1,
} from './competitiveProfile'
import {
  COMPLETED_SUMMARY_RECORD_KIND,
  COMPLETED_SUMMARY_RECORD_VERSION,
} from './constants'

export interface CompletedSummaryRecordV1 {
  readonly kind: typeof COMPLETED_SUMMARY_RECORD_KIND
  readonly version: typeof COMPLETED_SUMMARY_RECORD_VERSION
  readonly recordId: string
  readonly savedAt: number
  readonly classLabel: string | null
  readonly competitiveProfile: CompetitiveProfileV1
  readonly summary: SessionSummaryV1
}

export type CompletedSummaryRecordBuildResultV1 =
  | { readonly status: 'success'; readonly record: CompletedSummaryRecordV1 }
  | {
      readonly status: 'failure'
      readonly code:
        | 'invalid-saved-at'
        | 'invalid-class-label'
        | 'summary-unavailable'
        | 'profile-unavailable'
        | 'inconsistent-derivation'
      readonly message: string
    }

export async function buildCompletedSummaryRecordV1(
  history: readonly SessionEvent[],
  options: { readonly savedAt: number; readonly classLabel: string | null },
): Promise<CompletedSummaryRecordBuildResultV1> {
  if (!Number.isSafeInteger(options.savedAt) || options.savedAt < 0) {
    return {
      status: 'failure',
      code: 'invalid-saved-at',
      message: 'savedAt must be a non-negative safe integer timestamp.',
    }
  }
  const label = validateClassLabel(options.classLabel)
  if (!label.ok) {
    return { status: 'failure', code: 'invalid-class-label', message: label.message }
  }
  const summaryResult = deriveSessionSummaryV1(history)
  if (summaryResult.status !== 'available') {
    return {
      status: 'failure',
      code: 'summary-unavailable',
      message: `A completed summary record requires an available summary; received ${summaryResult.status}.`,
    }
  }
  const profileResult = await deriveCompetitiveProfileV1(history)
  if (profileResult.status !== 'available') {
    return {
      status: 'failure',
      code: 'profile-unavailable',
      message: profileResult.message,
    }
  }
  if (profileResult.profile.game.gameId !== summaryResult.summary.gameId) {
    return {
      status: 'failure',
      code: 'inconsistent-derivation',
      message: 'Derived profile game identity does not match the derived summary.',
    }
  }
  return deepFreeze({
    status: 'success',
    record: {
      kind: COMPLETED_SUMMARY_RECORD_KIND,
      version: COMPLETED_SUMMARY_RECORD_VERSION,
      recordId: summaryResult.summary.sessionId,
      savedAt: options.savedAt,
      classLabel: label.value,
      competitiveProfile: profileResult.profile,
      summary: summaryResult.summary,
    },
  })
}
