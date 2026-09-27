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
    expect(instructions).toContain('earned through thinking, never through trivia or obscurity')
    expect(instructions).toContain('INSUFFICIENT SOURCE EVIDENCE')
    expect(instructions).toContain('return the completed .xlsx artifact')
    expect(instructions).not.toContain('OpenAI')
    expect(instructions).not.toContain('ChatGPT')
  })

  it('embeds authoringRulesVersion 2 board-wide difficulty calibration guidance', () => {
    // Semantic assertions over the calibration contract itself, not a giant
    // string snapshot: ADR-023's 2026-09-27 amendment (rules version 1 -> 2).
    expect(AUTHORING_RULES_VERSION).toBe(2)

    for (const profile of ['classic-board', 'board-plus-final'] as const) {
      const ruleSet = getExternalAuthoringRuleSet(profile)
      expect(ruleSet.version).toBe(2)
      expect(ruleSet.difficultyDimensions.map((d) => d.id)).toEqual([
        'reasoning-steps',
        'integration',
        'transfer',
        'discrimination',
        'precision',
      ])

      const calibration = ruleSet.sections.find((s) => s.id === 'difficulty-calibration')
      expect(calibration).toBeDefined()
      const text = calibration?.rules.join('\n') ?? ''

      // A. within-category monotonicity
      expect(text).toContain('rising demand from 100 to 500 within each category')
      // B. cross-category / board-wide calibration for same point values
      expect(text).toContain('comparable demand across every category at the same point value')
      // C. qualitative dimensions, no numeric scores
      expect(text).toContain('never a numeric rubric to compute or report')
      // D. anti-patterns: obscurity, length, traps, importance are not difficulty
      expect(text).toContain('Difficulty is not obscurity, length, a trick/trap, or topical importance')
      // E. instruction-relative calibration; do not infer student ability
      expect(text).toContain('what the supplied class materials actually taught')
      expect(text).toContain("never to any individual student's inferred ability")
      // F. taught-scope ceiling even at 400/500
      expect(text).toContain('Even 400- and 500-point clues must stay inside the taught scope')
      expect(text).toContain('INSUFFICIENT SOURCE EVIDENCE')
      // G/H. 100-point floor, 500-point ceiling via synthesis/transfer, not obscurity
      expect(text).toContain('Keep 100 a genuinely accessible entry point')
      expect(text).toContain("500 the board's highest ordinary demand")
      // I. board-wide QA pass; no chain-of-thought output
      expect(text).toContain('run one final board-wide calibration pass')
      expect(text).toContain('without narrating the repair or including chain-of-thought')

      // K. concise Final Wager clarification (board-plus-final only)
      if (profile === 'board-plus-final') {
        const final = ruleSet.sections.find((s) => s.id === 'final')
        expect(final?.rules.join('\n')).toContain('at least as demanding as')
      }
    }
  })

  it('never asks for provider-specific language or a chain-of-thought response', () => {
    for (const profile of ['classic-board', 'board-plus-final'] as const) {
      const instructions = buildModelNeutralInstructions(profile).join('\n')
      expect(instructions).not.toContain('OpenAI')
      expect(instructions).not.toContain('ChatGPT')
      expect(instructions).not.toContain('Claude')
      expect(instructions).not.toContain('Gemini')
      expect(instructions.toLowerCase()).not.toContain('show your reasoning')
      expect(instructions.toLowerCase()).not.toContain('step by step reasoning before')
    }
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
