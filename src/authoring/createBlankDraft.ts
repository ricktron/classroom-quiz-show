/**
 * In-app blank AuthoringDraft for teacher board authoring.
 *
 * Reuses the existing draft model, validators, and compile/import path.
 * Empty prompts/answers are intentional: validation shows incomplete state.
 */

import { AUTHORING_DRAFT_VERSION, WORKBOOK_FORMAT_VERSION } from './contract'
import {
  deriveBoardRoundId,
  deriveCategoryId,
  deriveFinalRoundId,
  deriveGameCanonicalId,
  deriveTeamId,
  deriveTileId,
  sanitizeAuthoringToken,
} from './ids'
import { revalidateDraft } from './validateDraft'
import type { AuthoringDraft, DraftCategory, DraftClue, DraftFinal, DraftTeam } from './types'

export const BLANK_CATEGORY_COUNT = 6
export const BLANK_CLUES_PER_CATEGORY = 5
export const BLANK_TILE_VALUES = [100, 200, 300, 400, 500] as const
export const BLANK_DEFAULT_TEAM_COUNT = 2

export interface CreateBlankAuthoringDraftInput {
  readonly title?: string
  readonly gameKey?: string
  readonly categoryCount?: number
  readonly cluesPerCategory?: number
  readonly teamCount?: number
  readonly teamNameBank?: readonly string[]
}

function requiredId(value: string | null, label: string): string {
  if (value === null) {
    throw new Error(`Could not derive a stable ${label} for a new game.`)
  }
  return value
}

export function createBlankAuthoringDraft(
  input: CreateBlankAuthoringDraftInput = {},
): AuthoringDraft {
  const title = (input.title ?? 'New Game').trim() || 'New Game'
  const gameKey = sanitizeAuthoringToken(input.gameKey ?? title)
  const gameCanonicalId = requiredId(deriveGameCanonicalId(gameKey), 'game id')
  const categoryCount = input.categoryCount ?? BLANK_CATEGORY_COUNT
  const cluesPerCategory = input.cluesPerCategory ?? BLANK_CLUES_PER_CATEGORY
  const teamCount = input.teamCount ?? BLANK_DEFAULT_TEAM_COUNT

  const teams: DraftTeam[] = []
  for (let order = 1; order <= teamCount; order += 1) {
    teams.push({
      order,
      name: `Team ${order}`,
      authoringKey: `Team${order}Name`,
      canonicalId: requiredId(deriveTeamId(gameCanonicalId, order), 'team id'),
    })
  }

  const categories: DraftCategory[] = []
  for (let categoryOrder = 1; categoryOrder <= categoryCount; categoryOrder += 1) {
    const categoryCanonicalId = requiredId(
      deriveCategoryId(gameCanonicalId, categoryOrder),
      'category id',
    )
    const clues: DraftClue[] = []
    for (let clueOrder = 1; clueOrder <= cluesPerCategory; clueOrder += 1) {
      const value = BLANK_TILE_VALUES[clueOrder - 1] ?? clueOrder * 100
      clues.push({
        categoryOrder,
        categoryTitle: `Category ${categoryOrder}`,
        clueOrder,
        value,
        prompt: '',
        answer: '',
        alternates: [],
        categoryCanonicalId,
        tileCanonicalId: requiredId(
          deriveTileId(gameCanonicalId, categoryOrder, clueOrder),
          'tile id',
        ),
        provenance: {
          sheet: 'CLUES',
          row: (categoryOrder - 1) * cluesPerCategory + clueOrder + 1,
          a1Prompt: 'C',
        },
      })
    }
    categories.push({
      order: categoryOrder,
      title: `Category ${categoryOrder}`,
      canonicalId: categoryCanonicalId,
      clues,
    })
  }

  const final: DraftFinal = {
    prompt: '',
    answer: '',
    alternates: [],
    roundTitle: 'Final',
    roundCanonicalId: requiredId(deriveFinalRoundId(gameCanonicalId), 'final id'),
    provenance: { sheet: 'FINAL', row: 2, a1Prompt: 'A' },
  }

  const draft: AuthoringDraft = {
    version: AUTHORING_DRAFT_VERSION,
    profile: 'board-plus-final',
    workbookFormatVersion: WORKBOOK_FORMAT_VERSION,
    status: 'blocked',
    game: {
      title,
      gameKey,
      gameCanonicalId,
      boardRoundCanonicalId: requiredId(deriveBoardRoundId(gameCanonicalId), 'board id'),
      boardRoundTitle: title,
      teams,
      teamNameBank: input.teamNameBank ? [...input.teamNameBank] : [],
    },
    board: { categories },
    final,
    provenance: {
      filename: 'in-app',
      workbookFormatVersion: WORKBOOK_FORMAT_VERSION,
      profile: 'board-plus-final',
      detectedSheets: ['GAME', 'CLUES', 'FINAL'],
      origin: 'in-app',
    },
    issues: [],
    contentFingerprint: '',
  }

  return revalidateDraft(draft)
}
