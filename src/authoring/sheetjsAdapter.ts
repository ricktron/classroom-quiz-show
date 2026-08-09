/**
 * SheetJS CE transport edge → CQS raw sheet grids.
 *
 * SheetJS workbook/cell types never leave this module as the authoring domain
 * model. Callers receive plain CQS grid structures only.
 */

import * as XLSX from 'xlsx'
import {
  MAX_MERGED_RANGES,
  MAX_PARSED_CELLS,
  MAX_RAW_CELL_STRING_LENGTH,
  MAX_WORKBOOK_COLUMNS,
  MAX_WORKBOOK_RANGE_CELLS,
  MAX_WORKBOOK_ROWS,
  MAX_WORKBOOK_SHEETS,
} from './limits'
import { authoringIssue, columnLetter, toA1, type AuthoringIssue } from './issues'

export interface RawCell {
  readonly row: number
  readonly col: number
  readonly a1: string
  readonly kind: 'string' | 'number' | 'boolean' | 'error' | 'formula' | 'empty'
  readonly text?: string
  readonly number?: number
  readonly boolean?: boolean
  readonly error?: string
  readonly formula?: string
  readonly hyperlink?: string
}

export interface RawSheet {
  readonly name: string
  readonly hidden: boolean
  readonly rows: readonly (readonly RawCell[])[]
  readonly headerRow: number
  readonly merges: number
}

export interface RawWorkbook {
  readonly sheetNames: readonly string[]
  readonly sheets: ReadonlyMap<string, RawSheet>
}

export type AdaptWorkbookResult =
  | { readonly status: 'success'; readonly workbook: RawWorkbook }
  | { readonly status: 'failure'; readonly issues: readonly AuthoringIssue[] }

function sheetHidden(wb: XLSX.WorkBook, name: string): boolean {
  const meta = wb.Workbook?.Sheets
  if (!meta) return false
  const entry = meta.find((s) => s.name === name)
  if (!entry) return false
  // 1 = hidden, 2 = very hidden
  return entry.Hidden === 1 || entry.Hidden === 2
}

function readCell(
  cell: XLSX.CellObject | undefined,
  row: number,
  col: number,
): RawCell {
  const a1 = toA1(col, row)
  if (!cell) {
    return { row, col, a1, kind: 'empty' }
  }

  if (typeof cell.f === 'string' && cell.f.length > 0) {
    return {
      row,
      col,
      a1,
      kind: 'formula',
      formula: cell.f,
      text: cell.w ?? (cell.v === undefined || cell.v === null ? undefined : String(cell.v)),
      number: typeof cell.v === 'number' ? cell.v : undefined,
    }
  }

  if (cell.t === 'e') {
    return {
      row,
      col,
      a1,
      kind: 'error',
      error: cell.w ?? String(cell.v ?? '#ERROR'),
    }
  }

  const hyperlink =
    cell.l && typeof cell.l === 'object' && 'Target' in cell.l
      ? String((cell.l as { Target?: unknown }).Target ?? '')
      : undefined

  if (cell.t === 'b' || typeof cell.v === 'boolean') {
    return {
      row,
      col,
      a1,
      kind: 'boolean',
      boolean: Boolean(cell.v),
      text: cell.w,
      hyperlink: hyperlink || undefined,
    }
  }

  if (cell.t === 'n' || typeof cell.v === 'number') {
    return {
      row,
      col,
      a1,
      kind: 'number',
      number: Number(cell.v),
      text: cell.w,
      hyperlink: hyperlink || undefined,
    }
  }

  const text =
    cell.v === undefined || cell.v === null
      ? ''
      : typeof cell.v === 'string'
        ? cell.v
        : String(cell.v)

  return {
    row,
    col,
    a1,
    kind: text.length === 0 ? 'empty' : 'string',
    text,
    hyperlink: hyperlink || undefined,
  }
}

export function adaptSheetJsWorkbook(bytes: Uint8Array): AdaptWorkbookResult {
  let wb: XLSX.WorkBook
  try {
    wb = XLSX.read(bytes, {
      type: 'array',
      cellFormula: true,
      cellHTML: false,
      cellNF: false,
      cellStyles: false,
      sheetStubs: true,
      bookVBA: true,
      dense: false,
    })
  } catch {
    return {
      status: 'failure',
      issues: [
        authoringIssue(
          'parser-failure',
          'blocker',
          'transport',
          'SheetJS could not parse the workbook bytes.',
        ),
      ],
    }
  }

  if (wb.vbaraw || (wb as { vba?: unknown }).vba) {
    return {
      status: 'failure',
      issues: [
        authoringIssue(
          'active-content-rejected',
          'blocker',
          'transport',
          'Workbook contains VBA/macro project data, which is not allowed.',
        ),
      ],
    }
  }

  if (wb.SheetNames.length > MAX_WORKBOOK_SHEETS) {
    return {
      status: 'failure',
      issues: [
        authoringIssue(
          'resource-limit-exceeded',
          'blocker',
          'workbook',
          `Workbook has ${wb.SheetNames.length} sheets (limit ${MAX_WORKBOOK_SHEETS}).`,
        ),
      ],
    }
  }

  let totalMerges = 0
  let parsedCells = 0
  const sheets = new Map<string, RawSheet>()
  const issues: AuthoringIssue[] = []

  for (const name of wb.SheetNames) {
    const sheet = wb.Sheets[name]
    if (!sheet) continue

    const ref = sheet['!ref']
    const range = ref ? XLSX.utils.decode_range(ref) : { s: { r: 0, c: 0 }, e: { r: 0, c: 0 } }
    const merges = sheet['!merges']?.length ?? 0
    totalMerges += merges
    if (totalMerges > MAX_MERGED_RANGES) {
      return {
        status: 'failure',
        issues: [
          authoringIssue(
            'resource-limit-exceeded',
            'blocker',
            'workbook',
            `Workbook exceeds ${MAX_MERGED_RANGES} merged ranges.`,
            { sheet: name },
          ),
        ],
      }
    }

    const colCount = range.e.c - range.s.c + 1
    if (colCount > MAX_WORKBOOK_COLUMNS) {
      return {
        status: 'failure',
        issues: [
          authoringIssue(
            'resource-limit-exceeded',
            'blocker',
            'workbook',
            `Sheet ${name} has ${colCount} columns (limit ${MAX_WORKBOOK_COLUMNS}).`,
            { sheet: name },
          ),
        ],
      }
    }

    // Bound the iteration/allocation domain before nested traversal. Parsed-cell
    // budgets only count non-empty cells and do not protect sparse !ref spans.
    const rowCount = range.e.r - range.s.r + 1
    if (rowCount > MAX_WORKBOOK_ROWS) {
      return {
        status: 'failure',
        issues: [
          authoringIssue(
            'resource-limit-exceeded',
            'blocker',
            'workbook',
            `Sheet ${name} represents ${rowCount} rows (limit ${MAX_WORKBOOK_ROWS}).`,
            { sheet: name },
          ),
        ],
      }
    }
    if (
      rowCount > 0 &&
      colCount > 0 &&
      (colCount > Math.floor(Number.MAX_SAFE_INTEGER / rowCount) ||
        rowCount * colCount > MAX_WORKBOOK_RANGE_CELLS)
    ) {
      return {
        status: 'failure',
        issues: [
          authoringIssue(
            'resource-limit-exceeded',
            'blocker',
            'workbook',
            `Sheet ${name} represents too many cell slots (limit ${MAX_WORKBOOK_RANGE_CELLS}).`,
            { sheet: name },
          ),
        ],
      }
    }

    const rows: RawCell[][] = []
    for (let r = range.s.r; r <= range.e.r; r += 1) {
      const rowCells: RawCell[] = []
      for (let c = range.s.c; c <= range.e.c; c += 1) {
        const addr = XLSX.utils.encode_cell({ r, c })
        const raw = readCell(sheet[addr], r + 1, c)
        if (raw.kind !== 'empty') {
          parsedCells += 1
          if (parsedCells > MAX_PARSED_CELLS) {
            return {
              status: 'failure',
              issues: [
                authoringIssue(
                  'resource-limit-exceeded',
                  'blocker',
                  'workbook',
                  `Workbook exceeds ${MAX_PARSED_CELLS} parsed cells.`,
                  { sheet: name, a1: raw.a1 },
                ),
              ],
            }
          }
          if (raw.text && raw.text.length > MAX_RAW_CELL_STRING_LENGTH) {
            issues.push(
              authoringIssue(
                'resource-limit-exceeded',
                'blocker',
                'cell',
                `Cell exceeds ${MAX_RAW_CELL_STRING_LENGTH} characters.`,
                { sheet: name, row: raw.row, column: columnLetter(c), a1: raw.a1 },
              ),
            )
          }
        }
        rowCells.push(raw)
      }
      rows.push(rowCells)
    }

    sheets.set(name, {
      name,
      hidden: sheetHidden(wb, name),
      rows,
      headerRow: range.s.r + 1,
      merges,
    })
  }

  if (issues.length > 0) {
    return { status: 'failure', issues }
  }

  return {
    status: 'success',
    workbook: { sheetNames: wb.SheetNames, sheets },
  }
}

export function writeWorkbookBytes(wb: XLSX.WorkBook): Uint8Array {
  const out = XLSX.write(wb, { bookType: 'xlsx', type: 'array', cellStyles: false })
  return out instanceof Uint8Array ? out : new Uint8Array(out as ArrayBuffer)
}

export { XLSX }
