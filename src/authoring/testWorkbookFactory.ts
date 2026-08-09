/**
 * Test helpers for building workbook bytes from AOA sheets.
 */

import {
  CLUE_HEADERS,
  FINAL_HEADERS,
  FINAL_SHEET,
  GAME_HEADERS,
  GAME_SHEET,
  INSTRUCTIONS_SHEET,
  META_KEYS,
  META_SHEET,
  WORKBOOK_FORMAT,
  WORKBOOK_FORMAT_VERSION,
  CLUES_SHEET,
  type WorkbookProfile,
} from './contract'
import { buildModelNeutralInstructions } from './instructions'
import { literalTextCell } from './formulaText'
import { writeWorkbookBytes, XLSX } from './sheetjsAdapter'

function sheetFromAoa(rows: unknown[][]): XLSX.WorkSheet {
  const sheet = XLSX.utils.aoa_to_sheet(rows)
  const ref = sheet['!ref']
  if (!ref) return sheet
  const range = XLSX.utils.decode_range(ref)
  for (let r = range.s.r; r <= range.e.r; r += 1) {
    for (let c = range.s.c; c <= range.e.c; c += 1) {
      const addr = XLSX.utils.encode_cell({ r, c })
      const cell = sheet[addr]
      if (cell && typeof cell.v === 'string') sheet[addr] = literalTextCell(cell.v)
    }
  }
  return sheet
}

export interface BuildWorkbookOptions {
  readonly profile?: WorkbookProfile
  readonly includeFinal?: boolean
  readonly hideClues?: boolean
  readonly meta?: Partial<Record<string, string>>
  readonly gameRows?: unknown[][]
  readonly clueRows?: unknown[][]
  readonly finalRows?: unknown[][]
  readonly extraSheets?: ReadonlyArray<{ readonly name: string; readonly rows: unknown[][] }>
  readonly formulaCells?: ReadonlyArray<{
    readonly sheet: string
    readonly a1: string
    readonly formula: string
    readonly cached?: string | number
  }>
  readonly errorCells?: ReadonlyArray<{
    readonly sheet: string
    readonly a1: string
    readonly error?: string
  }>
  readonly booleanCells?: ReadonlyArray<{
    readonly sheet: string
    readonly a1: string
    readonly value: boolean
  }>
}

export function buildTestWorkbookBytes(options: BuildWorkbookOptions = {}): Uint8Array {
  const profile = options.profile ?? 'classic-board'
  const includeFinal = options.includeFinal ?? profile === 'board-plus-final'
  const wb = XLSX.utils.book_new()

  const meta = [
    ['Key', 'Value'],
    [META_KEYS.format, options.meta?.format ?? WORKBOOK_FORMAT],
    [
      META_KEYS.workbookFormatVersion,
      options.meta?.workbookFormatVersion ?? String(WORKBOOK_FORMAT_VERSION),
    ],
    [META_KEYS.profile, options.meta?.profile ?? profile],
  ]
  XLSX.utils.book_append_sheet(wb, sheetFromAoa(meta), META_SHEET)

  const instructions = buildModelNeutralInstructions(profile).map((line) => [line])
  XLSX.utils.book_append_sheet(wb, sheetFromAoa(instructions), INSTRUCTIONS_SHEET)

  const gameRows =
    options.gameRows ??
    [
      [...GAME_HEADERS],
      profile === 'board-plus-final'
        ? ['Board Final Fixture', 'board-final-fixture', 30, 'Team A', 'Team B', '', '', '', '', '', '']
        : ['Classic Fixture', 'classic-fixture', 30, '', '', '', '', '', '', '', ''],
    ]
  XLSX.utils.book_append_sheet(wb, sheetFromAoa(gameRows), GAME_SHEET)

  const clueRows =
    options.clueRows ??
    [
      [...CLUE_HEADERS],
      [1, 'Rocks', 1, 100, 'What rock forms from magma?', 'Igneous', 'Volcanic rock', '', '', '', '', '', '', '', 'Host note', 1],
      [1, 'Rocks', 2, 200, 'Which rock is made of compressed sediments?', 'Sedimentary', '', '', '', '', '', '', '', '', '', 1],
      [2, 'Weather', 1, 100, 'What do we call water falling from clouds?', 'Precipitation', 'Rain', '', '', '', '', '', '', '', '', 1],
      [2, 'Weather', 2, 200, 'Which instrument measures air pressure?', 'Barometer', '', '', '', '', '', '', '', '', '', 1],
    ]
  XLSX.utils.book_append_sheet(wb, sheetFromAoa(clueRows), CLUES_SHEET)

  if (includeFinal) {
    const finalRows =
      options.finalRows ??
      [
        [...FINAL_HEADERS],
        [
          'Name the process that drives plate motion through mantle heat flow.',
          'Mantle convection',
          'Convection',
          '',
          '',
          '',
          '',
          '',
          '',
          '',
          'Mechanism, not location',
          'Final Wager',
        ],
      ]
    XLSX.utils.book_append_sheet(wb, sheetFromAoa(finalRows), FINAL_SHEET)
  }

  for (const extra of options.extraSheets ?? []) {
    XLSX.utils.book_append_sheet(wb, sheetFromAoa(extra.rows), extra.name)
  }

  if (!wb.Workbook) wb.Workbook = {}
  if (!wb.Workbook.Sheets) wb.Workbook.Sheets = []
  for (const name of wb.SheetNames) {
    const hidden = name === META_SHEET || (options.hideClues && name === CLUES_SHEET) ? 1 : 0
    const existing = wb.Workbook.Sheets.find((s) => s.name === name)
    if (existing) existing.Hidden = hidden
    else wb.Workbook.Sheets.push({ name, Hidden: hidden })
  }

  for (const formula of options.formulaCells ?? []) {
    const sheet = wb.Sheets[formula.sheet]
    if (!sheet) continue
    sheet[formula.a1] = {
      t: typeof formula.cached === 'number' ? 'n' : 's',
      v: formula.cached ?? 2,
      f: formula.formula,
      w: String(formula.cached ?? 2),
    }
  }

  for (const error of options.errorCells ?? []) {
    const sheet = wb.Sheets[error.sheet]
    if (!sheet) continue
    sheet[error.a1] = {
      t: 'e',
      v: 0x2a,
      w: error.error ?? '#N/A',
    }
  }

  for (const bool of options.booleanCells ?? []) {
    const sheet = wb.Sheets[bool.sheet]
    if (!sheet) continue
    sheet[bool.a1] = {
      t: 'b',
      v: bool.value,
      w: bool.value ? 'TRUE' : 'FALSE',
    }
  }

  return writeWorkbookBytes(wb)
}
