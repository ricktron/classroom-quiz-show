/**
 * Model-neutral external-authoring instructions for workbook templates.
 */

import {
  WORKBOOK_FORMAT_VERSION,
  type WorkbookProfile,
} from './contract'
import {
  MAX_ALTERNATES,
  MAX_ANSWER_LENGTH,
  MAX_CATEGORIES,
  MAX_CATEGORY_TITLE_LENGTH,
  MAX_NOTES_LENGTH,
  MAX_PROMPT_LENGTH,
  MAX_RESPONSE_SECONDS,
  MAX_TILES_PER_CATEGORY,
  MAX_TILE_VALUE,
  MAX_TOTAL_TILES,
  MAX_WORKBOOK_BYTES,
  MIN_RESPONSE_SECONDS,
} from './limits'

export function buildModelNeutralInstructions(profile: WorkbookProfile): string[] {
  const profileLabel = profile === 'classic-board' ? 'Classic Board' : 'Board + Final'
  const creates =
    profile === 'classic-board'
      ? 'a category-board classroom game (no Final round)'
      : 'a category-board classroom game followed by one terminal Final Wager round'

  const lines = [
    'Classroom Quiz Show — model-neutral external-authoring instructions',
    '',
    `workbook profile: ${profileLabel}`,
    `machine profile: ${profile}`,
    `workbookFormatVersion: ${WORKBOOK_FORMAT_VERSION}`,
    'workbook format 1',
    '',
    `This workbook creates ${creates}.`,
    '',
    'Editable sheets/cells:',
    '- GAME: title, GameKey, optional ResponseSeconds, optional Team1Name…Team8Name',
    '- CLUES: one clue per row (CategoryOrder, Category, ClueOrder, Value, Prompt, Answer, optional alternates/notes/multiplier)',
    profile === 'board-plus-final'
      ? '- FINAL: Prompt, Answer, optional alternates/notes/FinalRoundTitle'
      : '- FINAL: not used in Classic Board',
    '',
    'Do not rename sheets. Do not rename headers. Do not alter CQS_META.',
    'Required fields: GAME Title + GameKey; each CLUES row needs CategoryOrder, Category, ClueOrder, Value, Prompt, Answer.',
    profile === 'board-plus-final'
      ? 'Board + Final also requires FINAL Prompt + Answer and at least Team1Name.'
      : 'Classic Board does not require workbook-level teams (host may supply teams separately).',
    '',
    'Optional fields: ResponseSeconds, Team names, Alternate1…Alternate8, Notes, Multiplier, FinalRoundTitle.',
    '',
    'Valid example: keep the green VALID EXAMPLE rows. They demonstrate a legal authored game.',
    'Invalid pattern: do not use formulas in GAME/CLUES/FINAL/CQS_META; do not invent unsupported round types; do not add image/media columns.',
    '',
    'Important current limits:',
    `- compressed workbook ≤ ${MAX_WORKBOOK_BYTES} bytes`,
    `- categories 1…${MAX_CATEGORIES}; clues/category 1…${MAX_TILES_PER_CATEGORY}; total clues ≤ ${MAX_TOTAL_TILES}`,
    `- category title ≤ ${MAX_CATEGORY_TITLE_LENGTH}; prompt ≤ ${MAX_PROMPT_LENGTH}; answer ≤ ${MAX_ANSWER_LENGTH}; notes ≤ ${MAX_NOTES_LENGTH}`,
    `- alternates ≤ ${MAX_ALTERNATES}; value 0…${MAX_TILE_VALUE}; ResponseSeconds ${MIN_RESPONSE_SECONDS}…${MAX_RESPONSE_SECONDS}`,
    '',
    'Use literal values only. No formulas in semantic cells. No macros/executable content.',
    'Do not invent unsupported round types (Team Choice, Buzzer Sprint, etc.).',
    'If source materials are insufficient, leave content incomplete for teacher review rather than fabricate facts.',
    '',
    'QA checklist:',
    '1) CQS_META profile/version unchanged',
    '2) required sheets present',
    '3) headers unchanged',
    '4) every clue has prompt+answer',
    '5) CategoryOrder/ClueOrder unique pairs',
    '6) no formulas',
    '7) no image/media columns',
    profile === 'board-plus-final' ? '8) Final present and teams named' : '8) board rows within limits',
    '',
    'For an external LLM or automated authoring tool: return the completed .xlsx workbook artifact rather than explanatory prose around it.',
    'Do not include chain-of-thought or private reasoning.',
    'These instructions are model-neutral; universal LLM compatibility is not claimed.',
  ]

  return lines
}
