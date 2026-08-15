/**
 * Slice 20 spreadsheet-authoring workbook contract constants.
 *
 * These are authoring-transport contracts only. They do not replace the
 * canonical game-file schema (`classroom-quiz-show/game` version 1).
 */

export const WORKBOOK_FORMAT = 'classroom-quiz-show/workbook' as const
export const WORKBOOK_FORMAT_VERSION = 1 as const
export const AUTHORING_DRAFT_VERSION = 1 as const

export const WORKBOOK_PROFILES = ['classic-board', 'board-plus-final'] as const
export type WorkbookProfile = (typeof WORKBOOK_PROFILES)[number]

export const WORKBOOK_EXTENSION = '.xlsx' as const
export const WORKBOOK_MIME =
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' as const

/** Machine metadata sheet — authoritative for format/version/profile. */
export const META_SHEET = 'CQS_META' as const
export const INSTRUCTIONS_SHEET = 'INSTRUCTIONS' as const
export const GAME_SHEET = 'GAME' as const
export const CLUES_SHEET = 'CLUES' as const
export const FINAL_SHEET = 'FINAL' as const
/** Optional Game-owned name deck. Format 1 compatible; never required. */
export const TEAM_NAMES_SHEET = 'TEAM_NAMES' as const
export const TEAM_NAME_HEADERS = ['TeamName'] as const

export const CLASSIC_BOARD_SHEETS = [
  META_SHEET,
  INSTRUCTIONS_SHEET,
  GAME_SHEET,
  CLUES_SHEET,
] as const

export const BOARD_PLUS_FINAL_SHEETS = [
  META_SHEET,
  INSTRUCTIONS_SHEET,
  GAME_SHEET,
  CLUES_SHEET,
  FINAL_SHEET,
] as const

export const META_KEYS = {
  format: 'format',
  workbookFormatVersion: 'workbookFormatVersion',
  profile: 'profile',
} as const

export const GAME_HEADERS = [
  'Title',
  'GameKey',
  'ResponseSeconds',
  'Team1Name',
  'Team2Name',
  'Team3Name',
  'Team4Name',
  'Team5Name',
  'Team6Name',
  'Team7Name',
  'Team8Name',
] as const

export const CLUE_HEADERS = [
  'CategoryOrder',
  'Category',
  'ClueOrder',
  'Value',
  'Prompt',
  'Answer',
  'Alternate1',
  'Alternate2',
  'Alternate3',
  'Alternate4',
  'Alternate5',
  'Alternate6',
  'Alternate7',
  'Alternate8',
  'Notes',
  'Multiplier',
] as const

export const FINAL_HEADERS = [
  'Prompt',
  'Answer',
  'Alternate1',
  'Alternate2',
  'Alternate3',
  'Alternate4',
  'Alternate5',
  'Alternate6',
  'Alternate7',
  'Alternate8',
  'Notes',
  'FinalRoundTitle',
] as const

/** Headers that are unsupported media/image authoring in workbook format 1. */
export const UNSUPPORTED_MEDIA_HEADERS = [
  'Image',
  'ImagePath',
  'ImageUrl',
  'Media',
  'Audio',
  'Video',
  'PromptImage',
] as const

export function sheetsForProfile(profile: WorkbookProfile): readonly string[] {
  return profile === 'classic-board' ? CLASSIC_BOARD_SHEETS : BOARD_PLUS_FINAL_SHEETS
}

export function isWorkbookProfile(value: string): value is WorkbookProfile {
  return (WORKBOOK_PROFILES as readonly string[]).includes(value)
}
