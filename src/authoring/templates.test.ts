import { describe, expect, it } from 'vitest'
import { generateWorkbookTemplate } from './generateTemplate'
import { parseWorkbookBytes } from './parseWorkbook'
import { adaptSheetJsWorkbook } from './sheetjsAdapter'
import { WORKBOOK_FORMAT_VERSION } from './contract'
import {
  AUTHORING_RULES_VERSION,
  CLASSIC_BOARD_DEFAULTS,
  getExternalAuthoringRuleSet,
} from './authoringRules'
import { isFormulaLeadingText } from './formulaText'
import { buildModelNeutralInstructions } from './instructions'

describe('workbook templates', () => {
  for (const profile of ['classic-board', 'board-plus-final'] as const) {
    it(`generates a logically repeatable blank ${profile} authoring template`, async () => {
      const a = generateWorkbookTemplate(profile)
      const b = generateWorkbookTemplate(profile)
      expect(a.filename).toBe(b.filename)
      expect(a.profile).toBe(profile)
      expect(a.workbookFormatVersion).toBe(WORKBOOK_FORMAT_VERSION)
      expect(a.authoringRulesVersion).toBe(AUTHORING_RULES_VERSION)
      expect(a.bytes.byteLength).toBeGreaterThan(1000)

      const adapted = adaptSheetJsWorkbook(a.bytes)
      expect(adapted.status).toBe('success')
      if (adapted.status !== 'success') return
      expect(adapted.workbook.sheetNames).toContain('INSTRUCTIONS')
      expect(adapted.workbook.sheetNames).toContain('GAME')
      expect(adapted.workbook.sheetNames).toContain('CLUES')

      // An untouched template must never masquerade as playable content.
      const parsed = await parseWorkbookBytes(a.bytes, a.filename)
      expect(parsed.status).toBe('failure')
    })
  }

  it('embeds the versioned model-neutral authoring contract and required sheets', () => {
    const classic = generateWorkbookTemplate('classic-board')
    const adapted = adaptSheetJsWorkbook(classic.bytes)
    expect(adapted.status).toBe('success')
    if (adapted.status !== 'success') return

    expect(adapted.workbook.sheetNames).toEqual([
      'CQS_META',
      'INSTRUCTIONS',
      'GAME',
      'CLUES',
      'TEAM_NAMES',
    ])

    const instructions = buildModelNeutralInstructions('classic-board').join('\n')
    expect(instructions).toContain(`authoringRulesVersion: ${AUTHORING_RULES_VERSION}`)
    expect(instructions).toContain('6 categories with 5 clues each')
    expect(instructions).toContain('100, 200, 300, 400, 500')
    expect(instructions).toContain('Difficulty must come from thinking, not trivia')
    expect(instructions).toContain('INSUFFICIENT SOURCE EVIDENCE')
    expect(instructions).toContain('return the completed .xlsx artifact')
    expect(instructions).not.toContain('OpenAI')
    expect(instructions).not.toContain('ChatGPT')
  })

  it('keeps educational rules data-driven and profile-specific', () => {
    const classic = getExternalAuthoringRuleSet('classic-board')
    const withFinal = getExternalAuthoringRuleSet('board-plus-final')
    expect(classic.defaultBoard).toEqual(CLASSIC_BOARD_DEFAULTS)
    expect(classic.difficultyBands.map((band) => band.value)).toEqual([100, 200, 300, 400, 500])
    expect(classic.sections.some((section) => section.id === 'final')).toBe(false)
    expect(withFinal.sections.some((section) => section.id === 'final')).toBe(true)
  })

  it('writes formula-leading text as literal cells', () => {
    expect(isFormulaLeadingText('=1+1')).toBe(true)
    expect(isFormulaLeadingText('+CMD')).toBe(true)
    expect(isFormulaLeadingText('-CMD')).toBe(true)
    expect(isFormulaLeadingText('@SUM(A1)')).toBe(true)
    expect(isFormulaLeadingText('Mars')).toBe(false)
  })

  it('Board + Final template includes FINAL without shipping sample academic content', () => {
    const generated = generateWorkbookTemplate('board-plus-final')
    const adapted = adaptSheetJsWorkbook(generated.bytes)
    expect(adapted.status).toBe('success')
    if (adapted.status !== 'success') return
    expect(adapted.workbook.sheetNames).toContain('FINAL')

    const text = JSON.stringify(adapted.workbook)
    expect(text).not.toContain('Solar System')
    expect(text).not.toContain('Mars')
    expect(text).not.toContain('Mantle convection')
    expect(text).not.toContain('Comet Crew')
  })
})
