/**
 * Version-aware AuthoringDraft JSON for library persistence.
 *
 * Draft JSON is not a canonical game file. It is revalidated on read.
 */

import { AUTHORING_DRAFT_VERSION, WORKBOOK_FORMAT_VERSION, WORKBOOK_PROFILES } from './contract'
import { revalidateDraft } from './validateDraft'
import type { AuthoringDraft, DraftCategory, DraftClue, DraftFinal, DraftTeam } from './types'

export function serializeAuthoringDraft(draft: AuthoringDraft): string {
  return `${JSON.stringify(draft)}\n`
}

export function parseAuthoringDraftJson(text: string): AuthoringDraft | null {
  if (typeof text !== 'string' || text.trim().length === 0) return null
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    return null
  }
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return null
  const record = parsed as Record<string, unknown>
  if (record.version !== AUTHORING_DRAFT_VERSION) return null
  if (record.workbookFormatVersion !== WORKBOOK_FORMAT_VERSION) return null
  if (!WORKBOOK_PROFILES.includes(record.profile as (typeof WORKBOOK_PROFILES)[number])) {
    return null
  }
  if (typeof record.game !== 'object' || record.game === null) return null
  if (typeof record.board !== 'object' || record.board === null) return null

  const game = record.game as Record<string, unknown>
  const board = record.board as Record<string, unknown>
  if (typeof game.title !== 'string' || typeof game.gameCanonicalId !== 'string') return null
  if (!Array.isArray(board.categories)) return null

  const draft = record as unknown as AuthoringDraft
  if (!isPlausibleDraft(draft)) return null
  return revalidateDraft(draft)
}

function isPlausibleDraft(draft: AuthoringDraft): boolean {
  if (!Array.isArray(draft.game.teams)) return false
  if (!Array.isArray(draft.board.categories)) return false
  return draft.board.categories.every((category: DraftCategory) =>
    Array.isArray(category.clues) &&
    category.clues.every((clue: DraftClue) => typeof clue.prompt === 'string' && typeof clue.answer === 'string'),
  )
}

export function draftHasPlayableCompileShape(draft: AuthoringDraft): boolean {
  return draft.status === 'ready_for_approval' || draft.status === 'approved'
}

export function isDraftTeam(value: unknown): value is DraftTeam {
  if (typeof value !== 'object' || value === null) return false
  const team = value as DraftTeam
  return typeof team.name === 'string' && typeof team.canonicalId === 'string'
}

export function isDraftFinal(value: unknown): value is DraftFinal {
  if (typeof value !== 'object' || value === null) return false
  const final = value as DraftFinal
  return typeof final.prompt === 'string' && typeof final.answer === 'string'
}
