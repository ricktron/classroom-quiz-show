import { describe, expect, it } from 'vitest'
import { strFromU8, strToU8, unzipSync, zipSync } from 'fflate'
import { parseWorkbookBytes } from './parseWorkbook'
import { buildTestWorkbookBytes } from './testWorkbookFactory'
import { generateWorkbookTemplate } from './generateTemplate'
import { adaptSheetJsWorkbook, writeWorkbookBytes, XLSX } from './sheetjsAdapter'
import { CLUE_HEADERS, GAME_HEADERS } from './contract'
import { literalTextCell, isFormulaLeadingText } from './formulaText'
import {
  MAX_WORKBOOK_COLUMNS,
  MAX_WORKBOOK_ENTRY_EXPANDED_BYTES,
  MAX_WORKBOOK_RANGE_CELLS,
  MAX_WORKBOOK_ROWS,
} from './limits'

/** Tiny XLSX whose worksheet `!ref`/dimension declares a hostile sparse span. */
function workbookBytesWithSparseRef(sheetName: string, sparseRef: string): Uint8Array {
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([['x']]), sheetName)
  const compact = writeWorkbookBytes(wb)
  const files = unzipSync(compact)
  for (const [name, data] of Object.entries(files)) {
    if (!name.includes('worksheets/')) continue
    const patched = strFromU8(data).replace(/ref="A1(:A1)?"/g, `ref="${sparseRef}"`)
    files[name] = strToU8(patched)
  }
  return zipSync(files)
}

describe('spreadsheet authoring security matrix', () => {
  it('rejects VBA project entries in the archive', async () => {
    const zipped = zipSync({
      '[Content_Types].xml': new TextEncoder().encode('<Types></Types>'),
      'xl/vbaProject.bin': new Uint8Array([0, 1, 2, 3]),
    })
    const result = await parseWorkbookBytes(zipped, 'macro.xlsx')
    expect(result.status).toBe('failure')
    if (result.status === 'failure') {
      expect(result.issues.some((i) => i.code === 'active-content-rejected')).toBe(true)
    }
  })

  it('ZIP/container expansion protection rejects oversized expanded entries', async () => {
    // Craft a zip with a small compressed payload but huge declared size is hard
    // without raw ZIP editing; instead enforce per-entry expanded budget during drain
    // by building many large entries under the entry-count cap.
    const files: Record<string, Uint8Array> = {
      'xl/workbook.xml': new TextEncoder().encode('<workbook/>'),
    }
    files['xl/huge.bin'] = new Uint8Array(MAX_WORKBOOK_ENTRY_EXPANDED_BYTES + 10)
    const zipped = zipSync(files)
    const result = await parseWorkbookBytes(zipped, 'pathological.xlsx')
    expect(result.status).toBe('failure')
  })

  it('worksheet sparse-range protection rejects enormous !ref row span before traversal', () => {
    // Pathological sparse span (review F1 shape) without SheetJS write expansion.
    const bytes = workbookBytesWithSparseRef('Huge', 'A1:AF1048576')
    expect(bytes.byteLength).toBeLessThan(50_000)

    const started = Date.now()
    const result = adaptSheetJsWorkbook(bytes)
    const elapsedMs = Date.now() - started

    expect(result.status).toBe('failure')
    if (result.status === 'failure') {
      expect(result.issues.some((i) => i.code === 'resource-limit-exceeded')).toBe(true)
      expect(result.issues[0]?.sheet).toBe('Huge')
      expect(result.issues[0]?.message).toContain(String(MAX_WORKBOOK_ROWS))
    }
    // Must reject immediately — not after multi-second / multi-GB traversal.
    expect(elapsedMs).toBeLessThan(2_000)
  })

  it('worksheet sparse-range protection rejects excessive represented range area before traversal', () => {
    // rowCount within MAX_WORKBOOK_ROWS but rowCount * colCount over area cap.
    const rows = Math.min(MAX_WORKBOOK_ROWS, Math.ceil((MAX_WORKBOOK_RANGE_CELLS + 1) / MAX_WORKBOOK_COLUMNS))
    const cols = MAX_WORKBOOK_COLUMNS
    expect(rows * cols).toBeGreaterThan(MAX_WORKBOOK_RANGE_CELLS)
    expect(rows).toBeLessThanOrEqual(MAX_WORKBOOK_ROWS)

    const end = XLSX.utils.encode_cell({ r: rows - 1, c: cols - 1 })
    const bytes = workbookBytesWithSparseRef('Wide', `A1:${end}`)
    expect(bytes.byteLength).toBeLessThan(50_000)

    const started = Date.now()
    const result = adaptSheetJsWorkbook(bytes)
    const elapsedMs = Date.now() - started

    expect(result.status).toBe('failure')
    if (result.status === 'failure') {
      expect(result.issues.some((i) => i.code === 'resource-limit-exceeded')).toBe(true)
      expect(result.issues[0]?.sheet).toBe('Wide')
      expect(result.issues[0]?.message).toContain(String(MAX_WORKBOOK_RANGE_CELLS))
    }
    expect(elapsedMs).toBeLessThan(2_000)
  })

  it('accepts generated Classic and Board + Final template range domains', () => {
    const classic = adaptSheetJsWorkbook(generateWorkbookTemplate('classic-board').bytes)
    const boardFinal = adaptSheetJsWorkbook(generateWorkbookTemplate('board-plus-final').bytes)
    expect(classic.status).toBe('success')
    expect(boardFinal.status).toBe('success')
  })

  it('accepts a large-but-bounded legal-ish worksheet range under row/area caps', () => {
    // Under both caps: 80 rows × 16 cols = 1280 slots.
    const bytes = workbookBytesWithSparseRef('Bounded', 'A1:P80')
    const result = adaptSheetJsWorkbook(bytes)
    expect(result.status).toBe('success')
  })

  it('treats hyperlinks as inert metadata and still reads literal text', async () => {
    const bytes = buildTestWorkbookBytes()
    const adapted = adaptSheetJsWorkbook(bytes)
    expect(adapted.status).toBe('success')
    // No automatic navigation — adapter only optionally records hyperlink strings.
  })

  it('rejects prototype-pollution-like and control-character strings in semantic fields', async () => {
    const proto = await parseWorkbookBytes(
      buildTestWorkbookBytes({
        gameRows: [
          [...GAME_HEADERS],
          ['__proto__', 'proto-game', 30, '', '', '', '', '', '', '', ''],
        ],
      }),
      'proto.xlsx',
    )
    // Title may parse, but must remain ordinary text and never become object pollution.
    expect(proto.status).toBe('success')
    if (proto.status === 'success') {
      expect(proto.draft.game.title).toBe('__proto__')
      expect(Object.prototype.hasOwnProperty.call(proto.draft, 'admin')).toBe(false)
    }

    const control = await parseWorkbookBytes(
      buildTestWorkbookBytes({
        gameRows: [
          [...GAME_HEADERS],
          [`Bad\u0000Title`, 'control-game', 30, '', '', '', '', '', '', '', ''],
        ],
      }),
      'control.xlsx',
    )
    expect(control.status).toBe('failure')
    if (control.status === 'failure') {
      expect(control.issues.some((i) => i.code === 'control-characters')).toBe(true)
    }
  })

  it('HTML/script-like strings remain plain text in draft', async () => {
    const parsed = await parseWorkbookBytes(
      buildTestWorkbookBytes({
        clueRows: [
          [...CLUE_HEADERS],
          [
            1,
            'Rocks',
            1,
            100,
            '<script>alert(1)</script>',
            '<b>answer</b>',
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
          ],
        ],
      }),
      'html.xlsx',
    )
    expect(parsed.status).toBe('success')
    if (parsed.status !== 'success') return
    expect(parsed.draft.board.categories[0]!.clues[0]!.prompt).toContain('<script>')
  })

  it('formula-injection leaders are encoded as literal text cells on write', () => {
    for (const value of ['=1+1', '+CMD', '-CMD', '@SUM(A1)']) {
      expect(isFormulaLeadingText(value)).toBe(true)
      const cell = literalTextCell(value)
      expect(cell.t).toBe('s')
      expect(cell.v).toBe(value)
      expect('f' in cell).toBe(false)
    }
    const generated = generateWorkbookTemplate('classic-board')
    expect(generated.bytes.byteLength).toBeGreaterThan(0)
  })

  it('rejects .xlsm by extension even if bytes look like zip', async () => {
    const bytes = buildTestWorkbookBytes()
    const result = await parseWorkbookBytes(bytes, 'game.xlsm')
    expect(result.status).toBe('failure')
    if (result.status === 'failure') {
      expect(result.issues[0]?.code).toBe('unsupported-file-type')
    }
  })
})
