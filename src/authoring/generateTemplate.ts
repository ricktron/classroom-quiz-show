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
  WORKBOOK_FORMAT,
  WORKBOOK_FORMAT_VERSION,
  sheetsForProfile,
  type WorkbookProfile,
} from './contract'
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
  // Force every string cell through literal text semantics for injection safety.
  const ref = sheet['!ref']
  if (ref) {
    const range = XLSX.utils.decode_range(ref)
    for (let r = range.s.r; r <= range.e.r; r += 1) {
      for (let c = range.s.c; c <= range.e.c; c += 1) {
        const addr = XLSX.utils.encode_cell({ r, c })
        const cell = sheet[addr]
        if (!cell) continue
        if (typeof cell.v === 'string') {
          sheet[addr] = literalTextCell(cell.v)
        }
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
    [META_KEYS.profile, profile],
  ])
}

function instructionsSheet(profile: WorkbookProfile): XLSX.WorkSheet {
  const lines = buildModelNeutralInstructions(profile)
  return aoaToSheet(lines.map((line) => [line]))
}

function gameSheet(profile: WorkbookProfile): XLSX.WorkSheet {
  const header = [...GAME_HEADERS]
  const classicRow = [
    'Earth & Space Quick Board',
    'earth-space-quick',
    30,
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
  ]
  const finalRow = [
    'Earth & Space with Final',
    'earth-space-final',
    30,
    'Team Aurora',
    'Team Borealis',
    '',
    '',
    '',
    '',
    '',
    '',
  ]
  // Format 1 allows exactly one populated GAME data row. Invalid-pattern
  // guidance lives in INSTRUCTIONS, not as a second semantic GAME row.
  return aoaToSheet([header, profile === 'classic-board' ? classicRow : finalRow])
}

function cluesSheet(): XLSX.WorkSheet {
  const header = [...CLUE_HEADERS]
  const rows: (string | number)[][] = [
    header,
    [1, 'Solar System', 1, 100, 'Which planet is known as the Red Planet?', 'Mars', 'The Red Planet', '', '', '', '', '', '', '', 'Common grade-band opener', 1],
    [1, 'Solar System', 2, 200, 'What is the largest planet in our solar system?', 'Jupiter', '', '', '', '', '', '', '', '', '', 1],
    [2, 'Atmosphere', 1, 100, 'What gas do plants take in during photosynthesis?', 'Carbon dioxide', 'CO2', '', '', '', '', '', '', '', '', 1],
    [2, 'Atmosphere', 2, 200, 'Which layer of the atmosphere contains the ozone layer?', 'Stratosphere', '', '', '', '', '', '', '', '', '', 1],
  ]
  return aoaToSheet(rows)
}

function finalSheet(): XLSX.WorkSheet {
  return aoaToSheet([
    [...FINAL_HEADERS],
    [
      'This process moves heat through the mantle and drives plate motion. Name it.',
      'Mantle convection',
      'Convection currents',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      'Press for the mechanism, not just "the core".',
      'Final Wager',
    ],
  ])
}

export function generateWorkbookTemplate(profile: WorkbookProfile): {
  readonly bytes: Uint8Array
  readonly filename: string
  readonly profile: WorkbookProfile
  readonly workbookFormatVersion: typeof WORKBOOK_FORMAT_VERSION
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
        sheet = gameSheet(profile)
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

  // Hide META for teacher usability (convenience, not security).
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
      ? 'cqs-classic-board-template.xlsx'
      : 'cqs-board-plus-final-template.xlsx'

  return {
    bytes: writeWorkbookBytes(wb),
    filename,
    profile,
    workbookFormatVersion: WORKBOOK_FORMAT_VERSION,
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
