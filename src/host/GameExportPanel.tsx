import { useEffect, useState } from 'react'
import type { GameDefinition } from '../game/gameDefinition'
import type { RoundRegistry } from '../game/registry'
import {
  downloadGameFile,
  type DownloadEnvironment,
} from '../export/downloadGameFile'
import {
  exportGameDefinition,
  type ExportResult,
} from '../export/exportGame'
import './GameExportPanel.css'

/**
 * Host-only portable export surface (Slice 12).
 *
 * Thin adapter: captures the loaded definition synchronously, runs the pure
 * exporter, and — only on success — hands exact bytes to the injectable download
 * boundary. No commands are dispatched; export status never enters private game
 * state, PublicState, or the display.
 */

export interface GameExportPanelProps {
  readonly definition: GameDefinition | null
  readonly registry: RoundRegistry
  /** Injectable download boundary for tests. Defaults to the browser adapter. */
  readonly download?: typeof downloadGameFile
  readonly downloadEnvironment?: DownloadEnvironment
}

type PanelStatus =
  | { readonly kind: 'idle' }
  | { readonly kind: 'success'; readonly filename: string }
  | { readonly kind: 'failure'; readonly result: Extract<ExportResult, { status: 'failure' }> }
  | { readonly kind: 'download-failure'; readonly message: string }

const ANSWER_KEY_WARNING =
  'Portable game files contain answer keys, alternates, and teacher notes. Keep them on the host side.'

const MEDIA_WARNING =
  'This JSON file preserves media paths only — it does not include the referenced image bytes. Use portable pack export to share embedded media.'

export function GameExportPanel({
  definition,
  registry,
  download = downloadGameFile,
  downloadEnvironment,
}: GameExportPanelProps) {
  const [status, setStatus] = useState<PanelStatus>({ kind: 'idle' })

  // A prior success/failure must not describe a different active game.
  useEffect(() => {
    setStatus({ kind: 'idle' })
  }, [definition])

  const loaded = definition !== null
  const mediaWarning = loaded && definitionHasMediaReferences(definition)

  function runExport(): void {
    // Capture synchronously at activation — do not read later from a changing store.
    const captured = definition
    if (captured === null) return
    if (captured.rounds.length === 0) {
      setStatus({
        kind: 'download-failure',
        message: 'This game has no playable content to export yet. Finish the questions first.',
      })
      return
    }

    const result = exportGameDefinition(captured, { registry })
    if (result.status !== 'success') {
      setStatus({ kind: 'failure', result })
      return
    }

    try {
      if (downloadEnvironment) {
        download(
          { filename: result.filename, text: result.jsonText },
          downloadEnvironment,
        )
      } else {
        download({ filename: result.filename, text: result.jsonText })
      }
      setStatus({ kind: 'success', filename: result.filename })
    } catch {
      setStatus({
        kind: 'download-failure',
        message: 'The game file was prepared but the browser download failed.',
      })
    }
  }

  return (
    <section className="export" aria-labelledby="export-title">
      <h3 id="export-title">Export portable game file</h3>
      <p className="host__note">
        Download the loaded authored game as a canonical{' '}
        <code>classroom-quiz-show/game</code> JSON file. Runtime session state is
        never included.
      </p>

      {!loaded ? (
        <p className="host__note" data-testid="export-no-game">
          No game loaded.
        </p>
      ) : (
        <>
          <dl className="foundation__kv" aria-label="Export game summary">
            <dt>game title</dt>
            <dd data-testid="export-game-title">{definition.title}</dd>
            <dt>game id</dt>
            <dd data-testid="export-game-id">{definition.id}</dd>
            <dt>rounds</dt>
            <dd data-testid="export-round-count">{definition.rounds.length}</dd>
            <dt>teams</dt>
            <dd data-testid="export-team-count">{definition.teams.length}</dd>
          </dl>
          <p className="host__note export__warning" data-testid="export-answer-warning">
            {ANSWER_KEY_WARNING}
          </p>
          {mediaWarning && (
            <p className="host__note export__warning" data-testid="export-media-warning">
              {MEDIA_WARNING}
            </p>
          )}
        </>
      )}

      <div className="export__actions">
        <button
          type="button"
          className="btn"
          data-testid="export-download"
          disabled={!loaded || definition.rounds.length === 0}
          onClick={runExport}
        >
          Download game file
        </button>
      </div>

      <div className="foundation__panel" aria-label="Export status" aria-live="polite">
        <h4>Export status (host-only)</h4>
        <ExportStatus status={status} />
      </div>
    </section>
  )
}

/** Host-only preview of whether the loaded definition carries image prompts. */
function definitionHasMediaReferences(definition: GameDefinition): boolean {
  return definition.rounds.some((round) => containsImagePrompt(round.config))
}

function containsImagePrompt(value: unknown): boolean {
  if (Array.isArray(value)) return value.some(containsImagePrompt)
  if (value === null || typeof value !== 'object') return false
  const record = value as Record<string, unknown>
  if (
    record.kind === 'image' &&
    typeof record.source === 'object' &&
    record.source !== null &&
    !Array.isArray(record.source)
  ) {
    return true
  }
  return Object.values(record).some(containsImagePrompt)
}

function ExportStatus({ status }: { readonly status: PanelStatus }) {
  if (status.kind === 'idle') {
    return (
      <p className="host__note" data-testid="export-result">
        No export attempted yet.
      </p>
    )
  }

  if (status.kind === 'success') {
    return (
      <div className="export__result export__result--ok" data-testid="export-result">
        <p className="export__headline">Export ready: {status.filename}</p>
      </div>
    )
  }

  if (status.kind === 'download-failure') {
    return (
      <div className="export__result export__result--bad" data-testid="export-result">
        <p className="export__headline">Download failed</p>
        <p className="host__note">{status.message}</p>
      </div>
    )
  }

  return (
    <div className="export__result export__result--bad" data-testid="export-result">
      <p className="export__headline">
        Export failed ({status.result.issues.length}{' '}
        {status.result.issues.length === 1 ? 'problem' : 'problems'}).
      </p>
      <ol className="export__issues" data-testid="export-issues">
        {status.result.issues.map((issue, index) => (
          <li key={`${issue.code}-${issue.path}-${index}`} className="export__issue">
            <code className="export__issue-code">{issue.code}</code>
            {issue.path.length > 0 && <code className="export__issue-path">{issue.path}</code>}
            <span className="export__issue-message">{issue.message}</span>
          </li>
        ))}
      </ol>
    </div>
  )
}
