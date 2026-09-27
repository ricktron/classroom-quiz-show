/**
 * Programmatic workbook template generation from contract constants.
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
  TEAM_NAME_HEADERS,
  TEAM_NAMES_SHEET,
  WORKBOOK_FORMAT,
  WORKBOOK_FORMAT_VERSION,
  sheetsForProfile,
  type WorkbookProfile,
} from './contract'
import {
  AUTHORING_RULES_VERSION,
  CLASSIC_BOARD_DEFAULTS,
} from './authoringRules'
import { buildModelNeutralInstructions } from './instructions'
import { literalTextCell } from './formulaText'
import { writeWorkbookBytes, XLSX } from './sheetjsAdapter'

function aoaToSheet(rows: readonly (readonly (string | number | null | undefined)[])[]): XLSX.WorkSheet {
  const aoa = rows.map((row) =>
    row.map((value) => {
      if (value === null || value === undefined) return ''
      if (typeof value === 'number') return value
      return value
    }),
  )
  const sheet = XLSX.utils.aoa_to_sheet(aoa)
  const ref = sheet['!ref']
  if (ref) {
    const range = XLSX.utils.decode_range(ref)
    for (let r = range.s.r; r <= range.e.r; r += 1) {
      for (let c = range.s.c; c <= range.e.c; c += 1) {
        const addr = XLSX.utils.encode_cell({ r, c })
        const cell = sheet[addr]
        if (!cell) continue
        if (typeof cell.v === 'string') sheet[addr] = literalTextCell(cell.v)
      }
    }
  }
  return sheet
}

function metaSheet(profile: WorkbookProfile): XLSX.WorkSheet {
  return aoaToSheet([
    ['Key', 'Value'],
    [META_KEYS.format, WORKBOOK_FORMAT],
    [META_KEYS.workbookFormatVersion, String(WORKBOOK_FORMAT_VERSION)],
    [META_KEYS.authoringRulesVersion, String(AUTHORING_RULES_VERSION)],
    [META_KEYS.profile, profile],
  ])
}

function instructionsSheet(profile: WorkbookProfile): XLSX.WorkSheet {
  return aoaToSheet(buildModelNeutralInstructions(profile).map((line) => [line]))
}

function gameSheet(): XLSX.WorkSheet {
  return aoaToSheet([
    [...GAME_HEADERS],
    ['', '', 30, '', '', '', '', '', '', '', ''],
  ])
}

function cluesSheet(): XLSX.WorkSheet {
  const rows: (string | number)[][] = [[...CLUE_HEADERS]]
  for (let categoryOrder = 1; categoryOrder <= CLASSIC_BOARD_DEFAULTS.categoryCount; categoryOrder += 1) {
    for (let clueOrder = 1; clueOrder <= CLASSIC_BOARD_DEFAULTS.cluesPerCategory; clueOrder += 1) {
      const value = CLASSIC_BOARD_DEFAULTS.values[clueOrder - 1] ?? clueOrder * 100
      rows.push([
        categoryOrder,
        '',
        clueOrder,
        value,
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        1,
      ])
    }
  }
  return aoaToSheet(rows)
}

function finalSheet(): XLSX.WorkSheet {
  return aoaToSheet([
    [...FINAL_HEADERS],
    ['', '', '', '', '', '', '', '', '', '', '', 'Final Wager'],
  ])
}

export function generateWorkbookTemplate(profile: WorkbookProfile): {
  readonly bytes: Uint8Array
  readonly filename: string
  readonly profile: WorkbookProfile
  readonly workbookFormatVersion: typeof WORKBOOK_FORMAT_VERSION
  readonly authoringRulesVersion: typeof AUTHORING_RULES_VERSION
} {
  const wb = XLSX.utils.book_new()
  const sheets = sheetsForProfile(profile)

  for (const name of sheets) {
    let sheet: XLSX.WorkSheet
    switch (name) {
      case META_SHEET:
        sheet = metaSheet(profile)
        break
      case INSTRUCTIONS_SHEET:
        sheet = instructionsSheet(profile)
        break
      case GAME_SHEET:
        sheet = gameSheet()
        break
      case 'CLUES':
        sheet = cluesSheet()
        break
      case FINAL_SHEET:
        sheet = finalSheet()
        break
      default:
        sheet = aoaToSheet([['unused']])
    }
    XLSX.utils.book_append_sheet(wb, sheet, name)
  }

  XLSX.utils.book_append_sheet(wb, aoaToSheet([[...TEAM_NAME_HEADERS]]), TEAM_NAMES_SHEET)

  if (!wb.Workbook) wb.Workbook = {}
  if (!wb.Workbook.Sheets) wb.Workbook.Sheets = []
  for (const name of wb.SheetNames) {
    const existing = wb.Workbook.Sheets.find((s) => s.name === name)
    if (existing) {
      if (name === META_SHEET) existing.Hidden = 1
    } else {
      wb.Workbook.Sheets.push({ name, Hidden: name === META_SHEET ? 1 : 0 })
    }
  }

  const filename =
    profile === 'classic-board'
      ? 'cqs-classic-board-authoring-template.xlsx'
      : 'cqs-board-plus-final-authoring-template.xlsx'

  return {
    bytes: writeWorkbookBytes(wb),
    filename,
    profile,
    workbookFormatVersion: WORKBOOK_FORMAT_VERSION,
    authoringRulesVersion: AUTHORING_RULES_VERSION,
  }
}

export function downloadWorkbookTemplate(
  profile: WorkbookProfile,
  environment: {
    readonly document?: Document
    readonly URL?: typeof URL
  } = {},
): { readonly filename: string } {
  const generated = generateWorkbookTemplate(profile)
  const doc = environment.document ?? globalThis.document
  const urlApi = environment.URL ?? globalThis.URL
  const copy = new Uint8Array(generated.bytes.byteLength)
  copy.set(generated.bytes)
  const blob = new Blob([copy], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  const url = urlApi.createObjectURL(blob)
  const anchor = doc.createElement('a')
  anchor.href = url
  anchor.download = generated.filename
  anchor.rel = 'noopener'
  doc.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  urlApi.revokeObjectURL(url)
  return { filename: generated.filename }
}
