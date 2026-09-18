import { useId, useMemo, useRef, useState } from 'react'
import type { UseHostPersistence } from './useHostPersistence'
import type { AudioPlaybackStatus } from '../audio/audioPlaybackController'
import { assembleDiagnosticSnapshot } from './diagnostics/assembleDiagnosticSnapshot'
import { formatDiagnosticReport } from './diagnostics/formatDiagnosticReport'
import { copyDiagnosticText } from './diagnostics/copyDiagnosticText'
import type {
  DiagnosticDisplayWindowStatus,
  HostInputDiagnosticSignals,
} from './diagnostics/types'
import './DiagnosticReportPanel.css'

export interface DiagnosticReportPanelProps {
  readonly persistence: Pick<
    UseHostPersistence,
    'bootPhase' | 'durabilityStatus' | 'leadership'
  >
  readonly audio: Pick<AudioPlaybackStatus, 'activation' | 'muted'>
  readonly displayWindow?: DiagnosticDisplayWindowStatus
  readonly inputSignals?: HostInputDiagnosticSignals | null
}

type CopyStatus = 'idle' | 'copied' | 'failed'

/**
 * Surface 32 — Advanced diagnostics / support evidence (Copy Diagnostic Report).
 *
 * Progressive disclosure: collapsed by default. Local copy only — no upload,
 * telemetry, or network. Report text is visible before copy.
 */
export function DiagnosticReportPanel({
  persistence,
  audio,
  displayWindow = 'unknown',
  inputSignals = null,
}: DiagnosticReportPanelProps) {
  const reportId = useId()
  const statusId = useId()
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)
  const [copyStatus, setCopyStatus] = useState<CopyStatus>('idle')
  const [busy, setBusy] = useState(false)

  const reportText = useMemo(() => {
    const snapshot = assembleDiagnosticSnapshot({
      persistence,
      audio,
      displayWindow,
      inputSignals,
    })
    return formatDiagnosticReport(snapshot)
  }, [persistence, audio, displayWindow, inputSignals])

  async function onCopy(): Promise<void> {
    setBusy(true)
    const result = await copyDiagnosticText(reportText)
    setBusy(false)
    setCopyStatus(result)
    if (result === 'failed') {
      const node = textareaRef.current
      if (node) {
        node.focus()
        node.select()
      }
    }
  }

  return (
    <details className="diagnostic-report" data-testid="diagnostic-report">
      <summary className="diagnostic-report__summary">
        <span className="diagnostic-report__summary-title">Copy diagnostic report</span>
        <span className="diagnostic-report__summary-hint">
          Troubleshooting evidence · no classroom content · nothing is sent
        </span>
      </summary>

      <div className="diagnostic-report__body">
        <p className="host__note diagnostic-report__privacy" data-testid="diagnostic-report-privacy">
          This report is for troubleshooting. It stays on this device until you copy it. It does
          not include student names, class names, questions, answers, team names, filenames, or
          other classroom content. Nothing is uploaded or submitted automatically.
        </p>

        <label className="diagnostic-report__label" htmlFor={reportId}>
          Diagnostic report (sanitized)
        </label>
        <textarea
          id={reportId}
          ref={textareaRef}
          className="diagnostic-report__text"
          data-testid="diagnostic-report-text"
          readOnly
          spellCheck={false}
          value={reportText}
          rows={18}
          aria-describedby={statusId}
        />

        <div className="diagnostic-report__actions">
          <button
            type="button"
            className="btn"
            data-testid="diagnostic-report-copy"
            disabled={busy}
            onClick={() => {
              void onCopy()
            }}
          >
            Copy diagnostic report
          </button>
        </div>

        <p
          id={statusId}
          className="host__note diagnostic-report__status"
          data-testid="diagnostic-report-status"
          role="status"
          aria-live="polite"
        >
          {copyStatus === 'copied'
            ? 'Copied to clipboard. Nothing was sent.'
            : copyStatus === 'failed'
              ? 'Clipboard copy failed. The report above is still selectable — select the text and copy it manually.'
              : 'Review the report, then copy it when you are ready.'}
        </p>
      </div>
    </details>
  )
}
