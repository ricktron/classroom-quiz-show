/**
 * Model-neutral external-authoring instructions for workbook templates.
 *
 * Structural/transport rules come from the workbook contract. Educational
 * generation rules come from authoringRules.ts so future profiles can compose
 * their own authoring contract without creating a universal mega-template.
 */

import {
  WORKBOOK_FORMAT_VERSION,
  type WorkbookProfile,
} from './contract'
import {
  AUTHORING_RULES_VERSION,
  getExternalAuthoringRuleSet,
} from './authoringRules'
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
  const ruleSet = getExternalAuthoringRuleSet(profile)
  const creates =
    profile === 'classic-board'
      ? 'a category-board classroom game (no Final round)'
      : 'a category-board classroom game followed by one terminal Final Wager round'

  const lines: string[] = [
    'Classroom Quiz Show — external AI / model-neutral authoring contract',
    '',
    `workbook profile: ${ruleSet.profileLabel}`,
    `machine profile: ${profile}`,
    `workbookFormatVersion: ${WORKBOOK_FORMAT_VERSION}`,
    `authoringRulesVersion: ${AUTHORING_RULES_VERSION}`,
    'workbook format 1',
    '',
    `This workbook creates ${creates}.`,
    'The workbook is an untrusted authoring artifact. Classroom Quiz Show validates it before anything can become playable.',
    '',
    'HOW TO USE THIS WORKBOOK WITH AN EXTERNAL LLM OR AUTHORING TOOL',
    '1) Upload this .xlsx workbook.',
    '2) Provide the teacher request and, when available, the class slides/PDFs/notes/source materials.',
    '3) Ask the model to complete this workbook according to the embedded contract.',
    '4) The model should return the completed .xlsx artifact only; explanatory prose is unnecessary.',
    '5) Import the completed workbook into Classroom Quiz Show, review diagnostics, then approve it explicitly.',
    '',
    'STRUCTURAL CONTRACT',
    '- Editable semantic sheets: GAME, CLUES, TEAM_NAMES, and FINAL when this profile includes it.',
    '- GAME: Title, GameKey, optional ResponseSeconds, optional Team1Name…Team8Name.',
    '- TEAM_NAMES: optional reusable game-owned name bank, one TeamName per row.',
    '- CLUES: one clue per row: CategoryOrder, Category, ClueOrder, Value, Prompt, Answer, optional alternates/Notes/Multiplier.',
    profile === 'board-plus-final'
      ? '- FINAL: one row with Prompt, Answer, optional alternates/Notes/FinalRoundTitle.'
      : '- FINAL is not used in Classic Board.',
    '- Do not rename sheets or headers. Do not alter CQS_META.',
    '- Use literal values only. No formulas, macros, executable content, scripts, or unsupported media columns.',
    '- Do not invent unsupported round types or add a second GAME/FINAL semantic row.',
    '',
    'CURRENT MACHINE LIMITS',
    `- compressed workbook ≤ ${MAX_WORKBOOK_BYTES} bytes`,
    `- categories 1…${MAX_CATEGORIES}; clues/category 1…${MAX_TILES_PER_CATEGORY}; total clues ≤ ${MAX_TOTAL_TILES}`,
    `- category title ≤ ${MAX_CATEGORY_TITLE_LENGTH}; prompt ≤ ${MAX_PROMPT_LENGTH}; answer ≤ ${MAX_ANSWER_LENGTH}; notes ≤ ${MAX_NOTES_LENGTH}`,
    `- alternates ≤ ${MAX_ALTERNATES}; value 0…${MAX_TILE_VALUE}; ResponseSeconds ${MIN_RESPONSE_SECONDS}…${MAX_RESPONSE_SECONDS}`,
    '',
  ]

  for (const section of ruleSet.sections) {
    lines.push(section.title.toUpperCase())
    for (const rule of section.rules) lines.push(`- ${rule}`)
    lines.push('')
  }

  lines.push(
    'FINAL ARTIFACT QA',
    '- CQS_META profile/version/rules-version unchanged.',
    '- Required sheets and headers unchanged.',
    '- GAME has exactly one semantic row with Title and GameKey completed.',
    '- Every intended CLUES row has CategoryOrder, Category, ClueOrder, Value, Prompt, and Answer.',
    '- CategoryOrder + ClueOrder pairs are unique.',
    '- No formulas, macros, unsupported media fields, or executable content.',
    profile === 'board-plus-final'
      ? '- FINAL has exactly one semantic row with Prompt + Answer, and at least one default team name is present.'
      : '- Classic Board contains no Final semantic content.',
    '- Any intentionally incomplete slot is incomplete because evidence was insufficient, not because content was fabricated to fill space.',
    '- Return the completed .xlsx workbook artifact rather than prose around it.',
    '- Do not include chain-of-thought or private reasoning.',
    '',
    'These instructions are model-neutral. Universal LLM compatibility is not claimed.',
  )

  return lines
}
