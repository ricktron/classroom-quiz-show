/**
 * Bounded in-app teacher corrections (hybrid model).
 *
 * Structural workbook failures are not corrected here — re-upload is required.
 */

import type { AuthoringDraft, DraftClue, DraftCategory, DraftTeam } from './types'
import { preserveWorkbookSourceIssues, revalidateDraft } from './validateDraft'
import { authoringIssue } from './issues'
import { deriveCategoryId, deriveTeamId, deriveTileId } from './ids'
import { BLANK_TILE_VALUES } from './createBlankDraft'

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
  | { readonly kind: 'add-category' }
  | { readonly kind: 'remove-category'; readonly categoryOrder: number }
  | { readonly kind: 'add-clue'; readonly categoryOrder: number }
  | { readonly kind: 'remove-clue'; readonly categoryOrder: number; readonly clueOrder: number }
  | { readonly kind: 'add-team' }
  | { readonly kind: 'remove-team'; readonly order: number }
  | { readonly kind: 'team-name-bank'; readonly names: readonly string[] }

function updateClue(clue: DraftClue, field: DraftCorrection & { kind: 'clue-field' }): DraftClue {
  switch (field.field) {
    case 'value':
      return { ...clue, value: Number(field.value) }
    case 'prompt': {
      const rest: DraftClue = { ...clue, prompt: String(field.value ?? '') }
      delete (rest as { promptMedia?: DraftClue['promptMedia'] }).promptMedia
      return rest
    }
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
    case 'add-category': {
      const categoryOrder = draft.board.categories.length + 1
      const categoryCanonicalId =
        deriveCategoryId(draft.game.gameCanonicalId, categoryOrder) ??
        `${draft.game.gameCanonicalId}-cat-${categoryOrder}`
      const clues: DraftClue[] = BLANK_TILE_VALUES.map((value, index) => {
        const clueOrder = index + 1
        return {
          categoryOrder,
          categoryTitle: `Category ${categoryOrder}`,
          clueOrder,
          value,
          prompt: '',
          answer: '',
          alternates: [],
          categoryCanonicalId,
          tileCanonicalId:
            deriveTileId(draft.game.gameCanonicalId, categoryOrder, clueOrder) ??
            `${draft.game.gameCanonicalId}-tile-${categoryOrder}-${clueOrder}`,
          provenance: {
            sheet: 'CLUES',
            row: draft.board.categories.reduce((sum, category) => sum + category.clues.length, 0) + clueOrder + 1,
            a1Prompt: 'C',
          },
        }
      })
      next = {
        ...draft,
        board: {
          categories: [
            ...draft.board.categories,
            {
              order: categoryOrder,
              title: `Category ${categoryOrder}`,
              canonicalId: categoryCanonicalId,
              clues,
            },
          ],
        },
      }
      break
    }
    case 'remove-category':
      next = {
        ...draft,
        board: {
          categories: draft.board.categories
            .filter((category) => category.order !== correction.categoryOrder)
            .map((category, index) => ({
              ...category,
              order: index + 1,
              clues: category.clues.map((clue) => ({
                ...clue,
                categoryOrder: index + 1,
              })),
            })),
        },
      }
      break
    case 'add-clue': {
      next = {
        ...draft,
        board: {
          categories: draft.board.categories.map((category) => {
            if (category.order !== correction.categoryOrder) return category
            const clueOrder = category.clues.length + 1
            const value = BLANK_TILE_VALUES[clueOrder - 1] ?? clueOrder * 100
            const added: DraftClue = {
              categoryOrder: category.order,
              categoryTitle: category.title,
              clueOrder,
              value,
              prompt: '',
              answer: '',
              alternates: [],
              categoryCanonicalId: category.canonicalId,
              tileCanonicalId:
                deriveTileId(draft.game.gameCanonicalId, category.order, clueOrder) ??
                `${category.canonicalId}-tile-${clueOrder}`,
              provenance: { sheet: 'CLUES', row: clueOrder + 1, a1Prompt: 'C' },
            }
            return { ...category, clues: [...category.clues, added] }
          }),
        },
      }
      break
    }
    case 'remove-clue':
      next = {
        ...draft,
        board: {
          categories: draft.board.categories.map((category) => {
            if (category.order !== correction.categoryOrder) return category
            return {
              ...category,
              clues: category.clues
                .filter((clue) => clue.clueOrder !== correction.clueOrder)
                .map((clue, index) => ({ ...clue, clueOrder: index + 1 })),
            }
          }),
        },
      }
      break
    case 'add-team': {
      const order = draft.game.teams.length + 1
      const added: DraftTeam = {
        order,
        name: `Team ${order}`,
        authoringKey: `Team${order}Name`,
        canonicalId:
          deriveTeamId(draft.game.gameCanonicalId, order) ?? `${draft.game.gameCanonicalId}-team-${order}`,
      }
      next = { ...draft, game: { ...draft.game, teams: [...draft.game.teams, added] } }
      break
    }
    case 'remove-team':
      next = {
        ...draft,
        game: {
          ...draft.game,
          teams: draft.game.teams
            .filter((team) => team.order !== correction.order)
            .map((team, index) => ({
              ...team,
              order: index + 1,
              authoringKey: `Team${index + 1}Name`,
            })),
        },
      }
      break
    case 'team-name-bank':
      next = {
        ...draft,
        game: { ...draft.game, teamNameBank: [...correction.names] },
      }
      break
    default:
      return draft
  }

  // Same shared workbook-source policy as approval: transport/workbook/cell
  // diagnostics require workbook correction + re-upload in format 1.
  return revalidateDraft(next, preserveWorkbookSourceIssues(draft.issues))
}
