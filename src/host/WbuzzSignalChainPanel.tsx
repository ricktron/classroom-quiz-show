import { useEffect, useId, useState } from 'react'
import { copyDiagnosticText } from './diagnostics/copyDiagnosticText'
import {
  clearWbuzzSignalTrace,
  formatWbuzzSignalTraceJson,
  formatWbuzzSignalTraceText,
  getWbuzzSignalTraceSnapshot,
  subscribeWbuzzSignalTrace,
  type WbuzzSignalTraceSnapshot,
} from '../input/wbuzzSignalChainTrace'
import './WbuzzSignalChainPanel.css'

type CopyStatus = 'idle' | 'copied' | 'failed'

/**
 * Q7-DIAG-1 — Advanced-diagnostics-only Wbuzz signal-chain trace viewer.
 *
 * Not part of ordinary teacher Class Setup. Observability only.
 */
export function WbuzzSignalChainPanel() {
  const listId = useId()
  const statusId = useId()
  const [snapshot, setSnapshot] = useState<WbuzzSignalTraceSnapshot>(() =>
    getWbuzzSignalTraceSnapshot(),
  )
  const [copyStatus, setCopyStatus] = useState<CopyStatus>('idle')
  const [busy, setBusy] = useState(false)

  useEffect(() => subscribeWbuzzSignalTrace(setSnapshot), [])

  async function onCopy(format: 'text' | 'json'): Promise<void> {
    setBusy(true)
    const payload =
      format === 'json' ? formatWbuzzSignalTraceJson() : formatWbuzzSignalTraceText()
    const result = await copyDiagnosticText(payload)
    setBusy(false)
    setCopyStatus(result)
  }

  return (
    <details className="wbuzz-signal-trace" data-testid="wbuzz-signal-trace">
      <summary className="wbuzz-signal-trace__summary">
        <span className="wbuzz-signal-trace__summary-title">Wbuzz signal-chain trace</span>
        <span className="wbuzz-signal-trace__summary-hint">
          Q7 diagnostic · Advanced only · no classroom content
        </span>
      </summary>

      <div className="wbuzz-signal-trace__body">
        <p className="host__note" data-testid="wbuzz-signal-trace-privacy">
          Bounded local trace for physical Wbuzz experiments. It records supported-profile
          keep-alive transport and controller exposure steps only. Reset before each experiment.
          Nothing is uploaded.
        </p>

        <p className="host__note" data-testid="wbuzz-signal-trace-meta">
          sourceSha: {snapshot.sourceSha} · events: {snapshot.events.length}/{snapshot.capacity}
        </p>

        <ol
          id={listId}
          className="wbuzz-signal-trace__list"
          data-testid="wbuzz-signal-trace-list"
          aria-label="Wbuzz signal-chain events"
        >
          {snapshot.events.length === 0 ? (
            <li className="wbuzz-signal-trace__empty" data-testid="wbuzz-signal-trace-empty">
              Trace is empty. Open Class Setup with the supported profile, or click Connect, then
              return here.
            </li>
          ) : (
            snapshot.events.map((event) => {
              const detail = Object.keys(event.detail)
                .map((key) => `${key}=${String(event.detail[key])}`)
                .join(' ')
              return (
                <li
                  key={event.seq}
                  className="wbuzz-signal-trace__item"
                  data-testid="wbuzz-signal-trace-item"
                  data-kind={event.kind}
                  data-outcome={event.outcome}
                >
                  <span className="wbuzz-signal-trace__seq">#{event.seq}</span>{' '}
                  <span className="wbuzz-signal-trace__kind">{event.kind}</span>{' '}
                  <span className="wbuzz-signal-trace__outcome">{event.outcome}</span>
                  {detail ? (
                    <span className="wbuzz-signal-trace__detail"> {detail}</span>
                  ) : null}
                </li>
              )
            })
          )}
        </ol>

        <div className="wbuzz-signal-trace__actions" role="group" aria-label="Trace actions">
          <button
            type="button"
            className="btn btn--secondary"
            data-testid="wbuzz-signal-trace-reset"
            onClick={() => {
              clearWbuzzSignalTrace()
              setCopyStatus('idle')
            }}
          >
            Reset trace
          </button>
          <button
            type="button"
            className="btn btn--secondary"
            data-testid="wbuzz-signal-trace-copy-text"
            disabled={busy}
            onClick={() => {
              void onCopy('text')
            }}
          >
            Copy text
          </button>
          <button
            type="button"
            className="btn"
            data-testid="wbuzz-signal-trace-copy-json"
            disabled={busy}
            onClick={() => {
              void onCopy('json')
            }}
          >
            Copy JSON
          </button>
        </div>

        <p
          id={statusId}
          className="host__note"
          data-testid="wbuzz-signal-trace-status"
          role="status"
          aria-live="polite"
        >
          {copyStatus === 'copied'
            ? 'Copied to clipboard. Nothing was sent.'
            : copyStatus === 'failed'
              ? 'Clipboard copy failed. Use the list above or try again.'
              : 'Reset before each physical experiment, then copy after the run.'}
        </p>
      </div>
    </details>
  )
}
