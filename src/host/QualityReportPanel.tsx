import { renderGenerationFeedbackMarkdown, generationFeedbackFilename } from '../import/generationFeedback'
import type { ImportQualityReport } from '../import/qualityReport'
import './QualityReportPanel.css'

export interface QualityReportPanelProps {
  readonly report: ImportQualityReport
  readonly context?: 'import' | 'editor'
}

export function QualityReportPanel({ report, context = 'import' }: QualityReportPanelProps) {
  function downloadFeedback(): void {
    const text = renderGenerationFeedbackMarkdown(report)
    const blob = new Blob([text], { type: 'text/markdown;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = generationFeedbackFilename(report.title)
    anchor.rel = 'noopener'
    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
    URL.revokeObjectURL(url)
  }

  return (
    <section className="quality-report" aria-labelledby="quality-report-title" data-testid="import-quality-report">
      <h3 id="quality-report-title">Import quality</h3>
      <p className="host__note">
        {context === 'editor'
          ? 'Review the notes below before you play or save. These are checks on this game, not a file import result.'
          : report.acceptance === 'accepted'
            ? 'The game file was accepted. Review the notes below before you play or edit.'
            : report.acceptance === 'unfinished'
              ? 'This file was stored as an unfinished game. It is not a completed playable import.'
              : 'The game file was not accepted. Nothing was saved or loaded.'}
      </p>
      <p className="quality-report__counts" aria-live="polite">
        {report.errorCount} errors, {report.warningCount} warnings, {report.heuristicCount} quality
        notices.
      </p>
      {report.findings.length === 0 ? (
        <p className="host__note">No additional quality notes.</p>
      ) : (
        <ul className="quality-report__list">
          {report.findings.map((finding, index) => (
            <li
              key={`${finding.classification}-${finding.code}-${finding.path ?? ''}-${index}`}
              className={`quality-report__item quality-report__item--${finding.classification.toLowerCase()}`}
              data-classification={finding.classification}
            >
              <span className="quality-report__badge">{labelFor(finding.classification)}</span>
              <span>{finding.message}</span>
            </li>
          ))}
        </ul>
      )}
      <button type="button" className="btn btn--secondary" onClick={downloadFeedback} data-testid="generation-feedback">
        Download generation feedback
      </button>
      <p className="host__note">
        Generation feedback is a local text file for a future writing prompt. CQS does not call an
        AI service.
      </p>
    </section>
  )
}

function labelFor(classification: ImportQualityReport['findings'][number]['classification']): string {
  if (classification === 'ERROR') return 'Error'
  if (classification === 'WARNING') return 'Warning'
  return 'Quality notice'
}
