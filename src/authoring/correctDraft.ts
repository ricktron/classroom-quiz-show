/**
 * Bounded in-app teacher corrections (hybrid model).
 *
 * Structural workbook failures are not corrected here — re-upload is required.
 */

import type { AuthoringDraft, DraftClue, DraftCategory } from './types'
import { preserveWorkbookSourceIssues, revalidateDraft } from './validateDraft'
import { authoringIssue } from './issues'

export type DraftCorrection =
  | { readonly kind: 'game-title'; readonly title: string }
  | { readonly kind: 'response-seconds'; readonly responseSeconds: number | undefined }
  | { readonly kind: 'team-name'; readonly order: number; readonly name: string }
  | {
      readonly kind: 'category-title'
      readonly categoryOrder: number
      readonly title: string
    }
  | {
      readonly kind: 'clue-field'
      readonly categoryOrder: number
      readonly clueOrder: number
      readonly field:
        | 'value'
        | 'prompt'
        | 'answer'
        | 'notes'
        | 'multiplier'
        | 'alternate1'
        | 'alternate2'
        | 'alternate3'
        | 'alternate4'
        | 'alternate5'
        | 'alternate6'
        | 'alternate7'
        | 'alternate8'
      readonly value: string | number | undefined
    }
  | {
      readonly kind: 'final-field'
      readonly field: 'prompt' | 'answer' | 'notes' | 'roundTitle' | `alternate${number}`
      readonly value: string
    }

function updateClue(clue: DraftClue, field: DraftCorrection & { kind: 'clue-field' }): DraftClue {
  switch (field.field) {
    case 'value':
      return { ...clue, value: Number(field.value) }
    case 'prompt':
      return { ...clue, prompt: String(field.value ?? '') }
    case 'answer':
      return { ...clue, answer: String(field.value ?? '') }
    case 'notes': {
      const notes = String(field.value ?? '').trim()
      return { ...clue, notes: notes.length > 0 ? notes : undefined }
    }
    case 'multiplier':
      return {
        ...clue,
        multiplier: field.value === undefined || field.value === '' ? undefined : Number(field.value),
      }
    default: {
      if (field.field.startsWith('alternate')) {
        const index = Number(field.field.replace('alternate', '')) - 1
        const next = [...clue.alternates]
        const text = String(field.value ?? '').trim()
        if (text.length === 0) {
          if (index < next.length) next.splice(index, 1)
        } else if (index < next.length) {
          next[index] = text
        } else {
          while (next.length < index) next.push('')
          next[index] = text
        }
        return { ...clue, alternates: next.filter((a) => a.length > 0) }
      }
      return clue
    }
  }
}

export function applyDraftCorrection(
  draft: AuthoringDraft,
  correction: DraftCorrection,
): AuthoringDraft {
  let next: AuthoringDraft = draft

  switch (correction.kind) {
    case 'game-title':
      next = {
        ...draft,
        game: { ...draft.game, title: correction.title, boardRoundTitle: correction.title },
      }
      break
    case 'response-seconds':
      next = {
        ...draft,
        game: { ...draft.game, responseSeconds: correction.responseSeconds },
      }
      break
    case 'team-name':
      next = {
        ...draft,
        game: {
          ...draft.game,
          teams: draft.game.teams.map((team) =>
            team.order === correction.order ? { ...team, name: correction.name } : team,
          ),
        },
      }
      break
    case 'category-title':
      next = {
        ...draft,
        board: {
          categories: draft.board.categories.map((category) => {
            if (category.order !== correction.categoryOrder) return category
            const updated: DraftCategory = {
              ...category,
              title: correction.title,
              clues: category.clues.map((clue) => ({ ...clue, categoryTitle: correction.title })),
            }
            return updated
          }),
        },
      }
      break
    case 'clue-field':
      next = {
        ...draft,
        board: {
          categories: draft.board.categories.map((category) => {
            if (category.order !== correction.categoryOrder) return category
            return {
              ...category,
              clues: category.clues.map((clue) =>
                clue.clueOrder === correction.clueOrder ? updateClue(clue, correction) : clue,
              ),
            }
          }),
        },
      }
      break
    case 'final-field': {
      if (!draft.final) {
        return revalidateDraft(draft, [
          authoringIssue(
            'blocking-structural-state',
            'blocker',
            'draft',
            'Cannot correct Final fields because Final is absent.',
            { sheet: 'FINAL' },
          ),
        ])
      }
      if (correction.field.startsWith('alternate')) {
        const index = Number(correction.field.replace('alternate', '')) - 1
        const alternates = [...draft.final.alternates]
        const text = correction.value.trim()
        if (text.length === 0) {
          if (index < alternates.length) alternates.splice(index, 1)
        } else if (index < alternates.length) {
          alternates[index] = text
        } else {
          while (alternates.length < index) alternates.push('')
          alternates[index] = text
        }
        next = {
          ...draft,
          final: { ...draft.final, alternates: alternates.filter((a) => a.length > 0) },
        }
      } else if (correction.field === 'prompt') {
        next = { ...draft, final: { ...draft.final, prompt: correction.value } }
      } else if (correction.field === 'answer') {
        next = { ...draft, final: { ...draft.final, answer: correction.value } }
      } else if (correction.field === 'notes') {
        const notes = correction.value.trim()
        next = {
          ...draft,
          final: { ...draft.final, notes: notes.length > 0 ? notes : undefined },
        }
      } else {
        next = { ...draft, final: { ...draft.final, roundTitle: correction.value } }
      }
      break
    }
    default:
      return draft
  }

  // Same shared workbook-source policy as approval: transport/workbook/cell
  // diagnostics require workbook correction + re-upload in format 1.
  return revalidateDraft(next, preserveWorkbookSourceIssues(draft.issues))
}
