import { useId, useRef, useState } from 'react'
import type { RoundRegistry } from '../game/registry'
import type { PersistenceAdapter } from '../persistence/adapter'
import type { SavedDefinitionSummary } from '../persistence/savedDefinitions'
import {
  applyStagedBackup,
  buildBackupFromAdapter,
  downloadBackupFile,
  parseBackupFromJsonText,
  type BackupIssue,
  type StagedBackup,
} from '../backup'
import './BackupRestorePanel.css'

export interface BackupRestorePanelProps {
  readonly adapter: PersistenceAdapter
  readonly registry: RoundRegistry
  readonly library: readonly SavedDefinitionSummary[]
  readonly disabled?: boolean
  readonly onLibraryChanged?: () => Promise<void> | void
  /** Injectable file reader for tests. */
  readonly readFileText?: (file: File) => Promise<string>
}

type StatusKind = 'idle' | 'info' | 'error' | 'success'

/**
 * Home — Backup & restore (S04C-H3).
 *
 * Progressive disclosure. Downloads a validated library backup or restores
 * from an untrusted backup file through parse → preview → confirm → apply.
 * Does not touch active Session state.
 */
export function BackupRestorePanel({
  adapter,
  registry,
  library,
  disabled = false,
  onLibraryChanged,
  readFileText = defaultReadFileText,
}: BackupRestorePanelProps) {
  const statusId = useId()
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState<{ kind: StatusKind; text: string }>({
    kind: 'idle',
    text: '',
  })
  const [staged, setStaged] = useState<StagedBackup | null>(null)
  const [issues, setIssues] = useState<readonly BackupIssue[] | null>(null)
  const [confirmReplace, setConfirmReplace] = useState(false)
  const generationRef = useRef(0)

  async function onDownloadBackup(): Promise<void> {
    const generation = ++generationRef.current
    setBusy(true)
    setIssues(null)
    setStaged(null)
    setConfirmReplace(false)
    const built = await buildBackupFromAdapter({ adapter, registry })
    if (generation !== generationRef.current) return
    setBusy(false)
    if (built.status !== 'success') {
      setIssues(built.issues)
      setStatus({
        kind: 'error',
        text: 'Could not create a backup. Nothing was downloaded.',
      })
      return
    }
    downloadBackupFile({ filename: built.filename, text: built.jsonText })
    setStatus({
      kind: 'success',
      text:
        built.metadata.gameCount === 0
          ? 'Downloaded an empty backup (no saved games on this device yet). The file stays on this device unless you move it.'
          : `Downloaded a backup of ${built.metadata.gameCount} saved game${
              built.metadata.gameCount === 1 ? '' : 's'
            }${
              built.metadata.mediaCount > 0
                ? ` and ${built.metadata.mediaCount} media file${
                    built.metadata.mediaCount === 1 ? '' : 's'
                  }`
                : ''
            }. The file includes classroom content — keep it private.`,
    })
  }

  async function onPickFile(file: File | undefined): Promise<void> {
    if (!file) return
    const generation = ++generationRef.current
    setBusy(true)
    setIssues(null)
    setStaged(null)
    setConfirmReplace(false)
    setStatus({ kind: 'info', text: 'Checking backup…' })

    let text: string
    try {
      text = await readFileText(file)
    } catch {
      if (generation !== generationRef.current) return
      setBusy(false)
      setStatus({
        kind: 'error',
        text: 'Could not read that file. Nothing was changed.',
      })
      return
    }

    const existingGames = new Map(library.map((entry) => [entry.gameId, entry.title]))
    const parsed = await parseBackupFromJsonText(text, { registry, existingGames })
    if (generation !== generationRef.current) return
    setBusy(false)

    if (parsed.status !== 'success') {
      setIssues(parsed.issues)
      setStatus({
        kind: 'error',
        text: 'This backup could not be used. Nothing was changed.',
      })
      return
    }

    setStaged(parsed.staged)
    setIssues(null)
    if (parsed.staged.conflictCount > 0) {
      setConfirmReplace(false)
      setStatus({
        kind: 'info',
        text: `Backup is ready: ${parsed.staged.newCount} new game${
          parsed.staged.newCount === 1 ? '' : 's'
        }, ${parsed.staged.conflictCount} existing game${
          parsed.staged.conflictCount === 1 ? '' : 's'
        } would be replaced. Confirm replace to restore. Nothing has been changed yet.`,
      })
    } else {
      setStatus({
        kind: 'info',
        text: `Backup is ready: ${parsed.staged.games.length} game${
          parsed.staged.games.length === 1 ? '' : 's'
        } to restore. Nothing has been changed yet.`,
      })
    }
  }

  async function onRestore(): Promise<void> {
    if (!staged) return
    if (staged.conflictCount > 0 && !confirmReplace) {
      setConfirmReplace(true)
      setStatus({
        kind: 'info',
        text: `Confirm that you want to replace ${staged.conflictCount} existing saved game${
          staged.conflictCount === 1 ? '' : 's'
        }. Nothing has been changed yet.`,
      })
      return
    }

    const generation = ++generationRef.current
    setBusy(true)
    const applied = await applyStagedBackup({
      adapter,
      staged,
      confirmReplaceConflicts: staged.conflictCount === 0 ? true : confirmReplace,
      stillValid: () => generation === generationRef.current,
    })
    const ownsUi = generation === generationRef.current

    if (applied.status === 'success') {
      // Commit already happened. Never claim "nothing changed" even if a newer
      // generation now owns the panel — refresh library and clear staged state.
      setStaged(null)
      setConfirmReplace(false)
      setIssues(null)
      await onLibraryChanged?.()
      if (ownsUi) {
        setBusy(false)
        setStatus({
          kind: 'success',
          text: `Restored ${applied.appliedGameCount} saved game${
            applied.appliedGameCount === 1 ? '' : 's'
          }${
            applied.replacedGameCount > 0
              ? ` (replaced ${applied.replacedGameCount})`
              : ''
          }${
            applied.appliedMediaCount > 0
              ? ` and ${applied.appliedMediaCount} media file${
                  applied.appliedMediaCount === 1 ? '' : 's'
                }`
              : ''
          }.`,
        })
      }
      return
    }

    if (!ownsUi) return
    setBusy(false)
    setIssues(applied.issues)
    setStatus({
      kind: 'error',
      text: 'Restore did not finish. Your existing saved games were left unchanged.',
    })
  }

  function onCancelRestore(): void {
    generationRef.current += 1
    setStaged(null)
    setConfirmReplace(false)
    setIssues(null)
    setStatus({ kind: 'info', text: 'Restore cancelled. Nothing was changed.' })
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  return (
    <details className="backup-restore" data-testid="backup-restore">
      <summary className="backup-restore__summary">
        <span className="backup-restore__summary-title">Backup &amp; restore</span>
        <span className="backup-restore__summary-hint">
          Download all saved games · restore from a backup file
        </span>
      </summary>

      <div className="backup-restore__body">
        <p className="host__note backup-restore__privacy" data-testid="backup-restore-privacy">
          A backup is a private file of your saved games (and pack images when present). It
          includes classroom content such as questions and answers. Keep it somewhere only you
          control. It does not include an unfinished class session. Restoring never changes the
          projector display by itself.
        </p>

        <div className="backup-restore__actions">
          <button
            type="button"
            className="btn"
            data-testid="backup-download"
            disabled={disabled || busy}
            onClick={() => {
              void onDownloadBackup()
            }}
          >
            {busy ? 'Working…' : 'Download backup'}
          </button>

          <label className="backup-restore__file-label">
            <span className="visually-hidden">Choose backup file</span>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,application/json,.backup.json"
              data-testid="backup-file-input"
              disabled={disabled || busy}
              onChange={(event) => {
                const file = event.target.files?.[0]
                void onPickFile(file)
              }}
            />
            <span className="btn btn--secondary" aria-hidden="true">
              Choose backup file…
            </span>
          </label>
        </div>

        {staged && (
          <div className="backup-restore__preview" data-testid="backup-preview">
            <h3 className="backup-restore__preview-title">Restore preview</h3>
            <ul className="backup-restore__preview-list">
              {staged.games.map((game) => (
                <li key={game.gameId}>
                  <strong>{game.title}</strong>
                  {game.disposition === 'new'
                    ? ' — new'
                    : ` — replaces “${game.existingTitle ?? game.gameId}”`}
                  {game.hasDraft ? ' (includes unfinished draft)' : ''}
                </li>
              ))}
            </ul>
            <p className="host__note">
              {staged.media.length === 0
                ? 'No pack images in this backup.'
                : `${staged.media.length} pack image${staged.media.length === 1 ? '' : 's'} will be restored with matching games.`}
            </p>
            <div className="backup-restore__actions">
              <button
                type="button"
                className="btn"
                data-testid="backup-restore-action"
                disabled={disabled || busy}
                onClick={() => {
                  void onRestore()
                }}
              >
                {busy
                  ? 'Restoring…'
                  : staged.conflictCount > 0 && confirmReplace
                    ? 'Confirm replace and restore'
                    : staged.conflictCount > 0
                      ? 'Replace existing games and restore'
                      : 'Restore backup'}
              </button>
              <button
                type="button"
                className="btn btn--secondary"
                data-testid="backup-restore-cancel"
                disabled={busy}
                onClick={onCancelRestore}
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {issues && issues.length > 0 && (
          <ul
            className="backup-restore__issues"
            data-testid="backup-issues"
            aria-label="Backup problems"
          >
            {issues.slice(0, 12).map((issue) => (
              <li key={`${issue.code}:${issue.path}:${issue.message}`}>{issue.message}</li>
            ))}
          </ul>
        )}

        <p
          id={statusId}
          className="host__note backup-restore__status"
          data-testid="backup-restore-status"
          role="status"
          aria-live="polite"
        >
          {status.text ||
            'Download a backup of your saved games, or choose a backup file to restore.'}
        </p>
      </div>
    </details>
  )
}

async function defaultReadFileText(file: File): Promise<string> {
  return file.text()
}
