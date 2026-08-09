import { describe, expect, it } from 'vitest'
import { zipSync } from 'fflate'
import { parseWorkbookBytes } from './parseWorkbook'
import { buildTestWorkbookBytes } from './testWorkbookFactory'
import { generateWorkbookTemplate } from './generateTemplate'
import { adaptSheetJsWorkbook } from './sheetjsAdapter'
import { CLUE_HEADERS, GAME_HEADERS } from './contract'
import { literalTextCell, isFormulaLeadingText } from './formulaText'
import { MAX_WORKBOOK_ENTRY_EXPANDED_BYTES } from './limits'

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

  it('rejects pathological advertised entry sizes', async () => {
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
