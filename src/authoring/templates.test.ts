import { describe, expect, it } from 'vitest'
import { generateWorkbookTemplate } from './generateTemplate'
import { parseWorkbookBytes } from './parseWorkbook'
import { adaptSheetJsWorkbook } from './sheetjsAdapter'
import { WORKBOOK_FORMAT_VERSION } from './contract'
import { isFormulaLeadingText } from './formulaText'
import { buildModelNeutralInstructions } from './instructions'

describe('workbook templates', () => {
  for (const profile of ['classic-board', 'board-plus-final'] as const) {
    it(`generates a logically repeatable ${profile} template`, async () => {
      const a = generateWorkbookTemplate(profile)
      const b = generateWorkbookTemplate(profile)
      expect(a.filename).toBe(b.filename)
      expect(a.profile).toBe(profile)
      expect(a.workbookFormatVersion).toBe(WORKBOOK_FORMAT_VERSION)
      expect(a.bytes.byteLength).toBeGreaterThan(1000)
      // Logical determinism: same sheet set / metadata when re-parsed.
      const parsedA = await parseWorkbookBytes(a.bytes, a.filename)
      const parsedB = await parseWorkbookBytes(b.bytes, b.filename)
      expect(parsedA.status).toBe('success')
      expect(parsedB.status).toBe('success')
      if (parsedA.status !== 'success' || parsedB.status !== 'success') return
      expect(parsedA.draft.profile).toBe(profile)
      expect(parsedB.draft.game.gameCanonicalId).toBe(parsedA.draft.game.gameCanonicalId)
      expect(parsedA.draft.board.categories.length).toBeGreaterThan(0)
      expect(parsedA.draft.issues.some((i) => i.severity === 'blocker')).toBe(false)
    })
  }

  it('includes model-neutral instructions and required sheets', async () => {
    const classic = generateWorkbookTemplate('classic-board')
    const adapted = adaptSheetJsWorkbook(classic.bytes)
    expect(adapted.status).toBe('success')
    if (adapted.status !== 'success') return
    expect(adapted.workbook.sheetNames).toEqual([
      'CQS_META',
      'INSTRUCTIONS',
      'GAME',
      'CLUES',
    ])
    const instructions = buildModelNeutralInstructions('classic-board').join('\n')
    expect(instructions).toContain('model-neutral external-authoring instructions')
    expect(instructions).toContain('workbookFormatVersion: 1')
    expect(instructions).toContain('return the completed')
    expect(instructions).not.toContain('OpenAI')
    expect(instructions).not.toContain('ChatGPT')
  })

  it('writes formula-leading text as literal cells', () => {
    expect(isFormulaLeadingText('=1+1')).toBe(true)
    expect(isFormulaLeadingText('+CMD')).toBe(true)
    expect(isFormulaLeadingText('-CMD')).toBe(true)
    expect(isFormulaLeadingText('@SUM(A1)')).toBe(true)
    expect(isFormulaLeadingText('Mars')).toBe(false)
  })

  it('Board + Final template includes FINAL and parses with teams', async () => {
    const generated = generateWorkbookTemplate('board-plus-final')
    const parsed = await parseWorkbookBytes(generated.bytes, generated.filename)
    expect(parsed.status).toBe('success')
    if (parsed.status !== 'success') return
    expect(parsed.draft.final).toBeDefined()
    expect(parsed.draft.game.teams.length).toBeGreaterThanOrEqual(2)
    expect(parsed.draft.provenance.detectedSheets).toContain('FINAL')
  })
})
