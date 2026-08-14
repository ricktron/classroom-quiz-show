import { describe, expect, it } from 'vitest'
import { applyDraftCorrection } from '../authoring/correctDraft'
import { createBlankAuthoringDraft } from '../authoring/createBlankDraft'
import { importGameFromJsonText } from './importGame'
import { buildImportQualityReport } from './qualityReport'
import { generationFeedbackFilename, renderGenerationFeedbackMarkdown } from './generationFeedback'

describe('import quality report', () => {
  it('classifies canonical import failures as ERROR and does not invent a definition', () => {
    const imported = importGameFromJsonText('{')
    const report = buildImportQualityReport({ title: 'Broken', importResult: imported })
    expect(imported.status).toBe('failure')
    expect(report.acceptance).toBe('rejected')
    expect(report.importSucceeded).toBe(false)
    expect(report.errorCount).toBeGreaterThan(0)
    expect(report.findings.every((finding) => finding.classification === 'ERROR')).toBe(true)
    expect(report.findings.every((finding) => finding.source === 'canonical-import')).toBe(true)
  })

  it('classifies incomplete authoring as ERROR and generic names as HEURISTIC', () => {
    const draft = createBlankAuthoringDraft({ title: 'New Game', gameKey: 'new-game' })
    const report = buildImportQualityReport({ draft })
    expect(report.acceptance).toBe('unfinished')
    expect(report.importSucceeded).toBe(false)
    expect(report.findings.some((finding) => finding.classification === 'ERROR' && finding.code === 'incomplete-clue')).toBe(
      true,
    )
    expect(
      report.findings.some((finding) => finding.classification === 'HEURISTIC' && finding.code === 'generic-team-name'),
    ).toBe(true)
    expect(
      report.findings.some((finding) => finding.classification === 'HEURISTIC' && finding.code === 'generic-game-title'),
    ).toBe(true)
  })

  it('flags deterministic possible answer leakage as a heuristic, not certainty', () => {
    let draft = createBlankAuthoringDraft({
      title: 'Weather',
      gameKey: 'weather',
      categoryCount: 1,
      cluesPerCategory: 1,
    })
    draft = applyDraftCorrection(draft, {
      kind: 'clue-field',
      categoryOrder: 1,
      clueOrder: 1,
      field: 'prompt',
      value: 'The answer is nimbus clouds after rain',
    })
    draft = applyDraftCorrection(draft, {
      kind: 'clue-field',
      categoryOrder: 1,
      clueOrder: 1,
      field: 'answer',
      value: 'nimbus',
    })
    const report = buildImportQualityReport({ draft })
    const leak = report.findings.find((finding) => finding.code === 'possible-answer-leakage')
    expect(leak?.classification).toBe('HEURISTIC')
    expect(leak?.message).toMatch(/may be intentional/i)
  })

  it('classifies spreadsheet parse issues as ERROR and does not invent a draft', () => {
    const report = buildImportQualityReport({
      title: 'broken.xlsx',
      authoringIssues: [
        {
          severity: 'blocker',
          family: 'workbook',
          code: 'malformed-xlsx',
          message: 'The spreadsheet could not be read.',
          field: 'file',
        },
      ],
    })
    expect(report.importSucceeded).toBe(false)
    expect(report.errorCount).toBe(1)
    expect(report.findings[0]?.classification).toBe('ERROR')
    expect(report.findings[0]?.source).toBe('authoring-draft')
  })

  it('renders deterministic local-only generation feedback', () => {
    const draft = createBlankAuthoringDraft({ title: 'New Game', gameKey: 'new-game' })
    const report = buildImportQualityReport({ draft })
    const first = renderGenerationFeedbackMarkdown(report)
    const second = renderGenerationFeedbackMarkdown(report)
    expect(first).toBe(second)
    expect(first).toContain('# Classroom Quiz Show generation feedback')
    expect(first).toContain('They are not AI judgments')
    expect(first).toContain('unfinished — not a completed playable import')
    expect(first).not.toContain('Canonical import: accepted')
    expect(first).not.toMatch(/https?:\/\//)
    expect(generationFeedbackFilename(report.title)).toBe('new-game-generation-feedback.md')
  })
})
