/**
 * Rebuild an AuthoringDraft from a trusted GameDefinition so imported/saved
 * games can be edited on the board without a second authoring model.
 */

import { AUTHORING_DRAFT_VERSION, WORKBOOK_FORMAT_VERSION } from './contract'
import { readCategoryBoardDefinition } from '../game/categoryBoard/definition'
import { readFinalWagerDefinition } from '../game/finalWager/definition'
import type { GameDefinition } from '../game/gameDefinition'
import { isImagePrompt, isTextPrompt, type PromptContent } from '../game/media/definition'
import { sanitizeAuthoringToken } from './ids'
import { revalidateDraft } from './validateDraft'
import type { AuthoringDraft, DraftCategory, DraftClue, DraftFinal, DraftTeam } from './types'

function promptText(prompt: PromptContent): string {
  return isTextPrompt(prompt) ? prompt.text : prompt.alt
}

export function draftFromDefinition(
  definition: GameDefinition,
  options: { readonly filename?: string; readonly teamNameBank?: readonly string[] } = {},
): AuthoringDraft {
  const boardRound = definition.rounds.find((round) => readCategoryBoardDefinition(round) !== null)
  const finalRound = definition.rounds.find((round) => readFinalWagerDefinition(round) !== null)
  const board = boardRound ? readCategoryBoardDefinition(boardRound) : null
  const finalDef = finalRound ? readFinalWagerDefinition(finalRound) : null

  const teams: DraftTeam[] = definition.teams.map((team, index) => ({
    order: index + 1,
    name: team.name,
    authoringKey: `Team${index + 1}Name`,
    canonicalId: team.id,
  }))

  const categories: DraftCategory[] = (board?.categories ?? []).map((category, categoryIndex) => {
    const categoryOrder = categoryIndex + 1
    const clues: DraftClue[] = category.tiles.map((tile, tileIndex) => ({
      categoryOrder,
      categoryTitle: category.title,
      clueOrder: tileIndex + 1,
      value: tile.value,
      prompt: promptText(tile.prompt),
      answer: tile.answer,
      alternates: [...tile.alternates],
      notes: tile.notes ?? undefined,
      multiplier: tile.multiplier,
      categoryCanonicalId: category.id,
      tileCanonicalId: tile.id,
      promptMedia: isImagePrompt(tile.prompt) ? tile.prompt : undefined,
      provenance: {
        sheet: 'CLUES',
        row: tileIndex + 2,
        a1Prompt: 'C',
      },
    }))
    return {
      order: categoryOrder,
      title: category.title,
      canonicalId: category.id,
      clues,
    }
  })

  const final: DraftFinal | undefined = finalDef
    ? {
        prompt: promptText(finalDef.prompt),
        answer: finalDef.answer,
        alternates: [...finalDef.alternates],
        notes: finalDef.notes ?? undefined,
        roundTitle: finalRound?.title ?? 'Final',
        roundCanonicalId: finalRound?.id ?? `${definition.id}-final`,
        provenance: { sheet: 'FINAL', row: 2, a1Prompt: 'A' },
      }
    : undefined

  const draft: AuthoringDraft = {
    version: AUTHORING_DRAFT_VERSION,
    profile: final ? 'board-plus-final' : 'classic-board',
    workbookFormatVersion: WORKBOOK_FORMAT_VERSION,
    status: 'blocked',
    game: {
      title: definition.title,
      gameKey: sanitizeAuthoringToken(definition.id),
      gameCanonicalId: definition.id,
      responseSeconds: definition.timer.responseSeconds,
      boardRoundCanonicalId: boardRound?.id ?? `${definition.id}-board`,
      boardRoundTitle: boardRound?.title ?? definition.title,
      teams,
      teamNameBank: options.teamNameBank ? [...options.teamNameBank] : [],
    },
    board: { categories },
    final,
    provenance: {
      filename: options.filename ?? 'saved-game',
      workbookFormatVersion: WORKBOOK_FORMAT_VERSION,
      profile: final ? 'board-plus-final' : 'classic-board',
      detectedSheets: final ? ['GAME', 'CLUES', 'FINAL'] : ['GAME', 'CLUES'],
      origin: 'in-app',
    },
    issues: [],
    contentFingerprint: '',
  }

  return revalidateDraft(draft)
}
