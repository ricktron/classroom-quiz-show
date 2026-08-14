import { useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { isDesktopRuntime } from '../runtime/cqsRuntime'
import { ROUTES, absoluteDisplayUrlWithTheme, editPath, playPath } from './paths'
import { useHostPersistence, type UseHostPersistenceOptions } from '../host/useHostPersistence'
import { createDefaultRegistry } from '../game/defaultRegistry'
import {
  createNewLibraryGame,
  saveAuthoringDraftToLibrary,
} from '../library/gameLibrary'
import {
  deleteDefinition,
  duplicateSavedDefinition,
  loadDefinition,
  recentSavedDefinitions,
  renameSavedDefinition,
  saveDefinition,
  type SavedDefinitionSummary,
} from '../persistence/savedDefinitions'
import { importGameFromJsonText } from '../import/importGame'
import { draftFromDefinition } from '../authoring/draftFromDefinition'
import type { AuthoringDraft } from '../authoring/types'
import { parseWorkbookBytes } from '../authoring/parseWorkbook'
import { CANONICAL_SAMPLE_CATEGORY_BOARD_FILE } from '../import/sampleGameFile'
import { buildImportQualityReport, type ImportQualityReport } from '../import/qualityReport'
import { QualityReportPanel } from '../host/QualityReportPanel'
import { exportGameDefinition } from '../export/exportGame'
import { downloadGameFile } from '../export/downloadGameFile'
import './HostRoute.css'
import './HomeRoute.css'

export interface HomeRouteProps {
  readonly persistenceOptions?: UseHostPersistenceOptions
}

export function HomeRoute({ persistenceOptions }: HomeRouteProps = {}) {
  const navigate = useNavigate()
  const persistence = useHostPersistence(persistenceOptions)
  const registry = useMemo(() => createDefaultRegistry(), [])
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [renameId, setRenameId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [importOpen, setImportOpen] = useState(false)
  const [importText, setImportText] = useState('')
  const [quality, setQuality] = useState<ImportQualityReport | null>(null)
  const [pendingReplaceText, setPendingReplaceText] = useState<string | null>(null)
  const [pendingWorkbookDraft, setPendingWorkbookDraft] = useState<AuthoringDraft | null>(null)
  const [discardSessionArmed, setDiscardSessionArmed] = useState(false)
  const spreadsheetInputRef = useRef<HTMLInputElement>(null)
  const recent = useMemo(() => recentSavedDefinitions(persistence.library).slice(0, 5), [persistence.library])
  const readOnly = persistence.leadership === 'follower'
  const ready = persistence.bootPhase !== 'loading' && !readOnly
  const canResume = persistence.bootPhase === 'recovery' && persistence.recovery !== null
  const hasInvalidRecovery =
    persistence.bootPhase === 'invalid-recovery' && persistence.invalidRecovery !== null

  async function refresh(nextMessage: string): Promise<void> {
    await persistence.refreshLibrary()
    setMessage(nextMessage)
  }

  async function onNewGame(): Promise<void> {
    setBusy(true)
    const created = await createNewLibraryGame(persistence.adapter, registry)
    setBusy(false)
    if (!created.ok) {
      setMessage(created.message)
      return
    }
    await persistence.refreshLibrary()
    navigate(editPath(created.value.definition.id))
  }

  async function onPlay(entry: SavedDefinitionSummary): Promise<void> {
    if (!entry.playable) {
      setMessage('This game is not ready to play yet. Open it to finish missing questions.')
      return
    }
    navigate(playPath(entry.gameId))
  }

  async function onDuplicate(gameId: string): Promise<void> {
    const result = await duplicateSavedDefinition(persistence.adapter, gameId, registry)
    if (!result.ok) {
      setMessage(result.message)
      return
    }
    await refresh(`Duplicated as ${result.value.title}.`)
  }

  async function onRename(gameId: string): Promise<void> {
    const result = await renameSavedDefinition(persistence.adapter, gameId, renameValue, registry)
    if (!result.ok) {
      setMessage(result.message)
      return
    }
    setRenameId(null)
    await refresh(`Renamed to ${result.value.title}.`)
  }

  async function onDelete(gameId: string): Promise<void> {
    if (confirmDeleteId !== gameId) {
      setConfirmDeleteId(gameId)
      return
    }
    const result = await deleteDefinition(persistence.adapter, gameId)
    setConfirmDeleteId(null)
    if (!result.ok) {
      setMessage(result.message)
      return
    }
    await refresh('Game deleted. Your other games are unchanged.')
  }

  async function onExport(gameId: string): Promise<void> {
    const result = await loadDefinition(persistence.adapter, gameId, registry)
    if (!result.ok) {
      setMessage(result.message)
      return
    }
    const exported = exportGameDefinition(result.value, { registry })
    if (exported.status !== 'success') {
      setMessage('This game could not be exported.')
      return
    }
    downloadGameFile({ filename: exported.filename, text: exported.jsonText })
  }

  async function importJson(text: string): Promise<void> {
    const imported = importGameFromJsonText(text, { registry })
    const report = buildImportQualityReport({
      importResult: imported,
      title: imported.status === 'success' ? imported.definition.title : 'Import',
      gameId: imported.status === 'success' ? imported.definition.id : undefined,
      draft: imported.status === 'success' ? draftFromDefinition(imported.definition) : undefined,
    })
    setQuality(report)
    if (imported.status !== 'success') {
      setMessage('Import did not accept that file. Nothing was saved.')
      return
    }
    const saved = await saveDefinition(persistence.adapter, imported.definition, {
      mode: 'save',
      registry,
      draft: draftFromDefinition(imported.definition),
    })
    if (!saved.ok) {
      setMessage(saved.message)
      return
    }
    if (saved.value === 'needs-replace') {
      setPendingReplaceText(text)
      setMessage(
        `“${imported.definition.title}” is already in My Games. Confirm replace to overwrite that saved game.`,
      )
      return
    }
    setPendingReplaceText(null)
    await refresh(`Saved “${imported.definition.title}” to My Games.`)
  }

  async function confirmJsonReplace(): Promise<void> {
    if (!pendingReplaceText) return
    const imported = importGameFromJsonText(pendingReplaceText, { registry })
    if (imported.status !== 'success') {
      setPendingReplaceText(null)
      setMessage('Import did not accept that file. Nothing was saved.')
      return
    }
    const replaced = await saveDefinition(persistence.adapter, imported.definition, {
      mode: 'replace',
      registry,
      draft: draftFromDefinition(imported.definition),
    })
    setPendingReplaceText(null)
    if (!replaced.ok) {
      setMessage(replaced.message)
      return
    }
    await refresh(`Saved “${imported.definition.title}” to My Games.`)
  }

  async function importWorkbook(file: File | null): Promise<void> {
    if (!file) return
    const bytes = new Uint8Array(await file.arrayBuffer())
    const parsed = await parseWorkbookBytes(bytes, file.name)
    if (parsed.status !== 'success') {
      setQuality(
        buildImportQualityReport({
          title: file.name,
          authoringIssues: parsed.issues,
        }),
      )
      setMessage('That spreadsheet could not be read. Nothing was saved.')
      return
    }
    const report = buildImportQualityReport({ draft: parsed.draft, title: parsed.draft.game.title })
    setQuality(report)
    const saved = await saveAuthoringDraftToLibrary(persistence.adapter, parsed.draft, registry, 'save')
    if (!saved.ok) {
      if (saved.code === 'conflict') {
        setPendingWorkbookDraft(parsed.draft)
      }
      setMessage(saved.message)
      return
    }
    setPendingWorkbookDraft(null)
    await refresh(
      saved.value.playable
        ? `Imported “${saved.value.definition.title}”. It is ready to play.`
        : `Imported “${saved.value.definition.title}”. Open it to finish missing content.`,
    )
  }

  async function confirmWorkbookReplace(): Promise<void> {
    if (!pendingWorkbookDraft) return
    const replaced = await saveAuthoringDraftToLibrary(
      persistence.adapter,
      pendingWorkbookDraft,
      registry,
      'replace',
    )
    setPendingWorkbookDraft(null)
    if (!replaced.ok) {
      setMessage(replaced.message)
      return
    }
    await refresh(
      replaced.value.playable
        ? `Imported “${replaced.value.definition.title}”. It is ready to play.`
        : `Imported “${replaced.value.definition.title}”. Open it to finish missing content.`,
    )
  }

  function openDisplay(): void {
    if (isDesktopRuntime()) {
      window.open(absoluteDisplayUrlWithTheme('default'), 'quiz-show-display', 'noopener')
      return
    }
    navigate(ROUTES.display)
  }

  return (
    <div className="screen host">
    <main className="screen__main home" aria-labelledby="home-title">
      <div className="host__banner" role="note">
        <span className="host__banner-badge">Host</span>
        <span>Private teacher Home — do not project this screen for students.</span>
      </div>
      <p className="display__brand">Classroom Quiz Show</p>
      <h1 id="home-title">Home</h1>
      <p className="host__note">
        Create or open a game, then play it with this class. The projector stays on a separate
        Display screen.
      </p>

      {hasInvalidRecovery && (
        <section className="home__resume" data-testid="home-invalid-recovery" aria-labelledby="invalid-recovery-title">
          <h2 id="invalid-recovery-title">Unfinished class session could not be read</h2>
          <p className="host__note">
            {persistence.invalidRecovery?.message} Discard only that session to continue. Your saved
            games stay.
          </p>
          <div className="home__actions">
            <button
              type="button"
              className="btn btn--secondary"
              onClick={() => {
                if (!discardSessionArmed) {
                  setDiscardSessionArmed(true)
                  return
                }
                setDiscardSessionArmed(false)
                void persistence.discardRecovery().then((result) => {
                  if (!result.ok) setMessage(result.message)
                })
              }}
            >
              {discardSessionArmed ? 'Confirm discard session' : 'Discard session'}
            </button>
          </div>
        </section>
      )}

      {canResume && (
        <section className="home__resume" data-testid="home-resume" aria-labelledby="resume-title">
          <h2 id="resume-title">Unfinished class session</h2>
          <p className="host__note">
            A class session was interrupted on this device. Resume it, or discard only that session.
            Your saved games stay.
          </p>
          <div className="home__actions">
            <Link className="btn" to={ROUTES.host}>
              Resume session
            </Link>
            <button
              type="button"
              className="btn btn--secondary"
              onClick={() => {
                if (!discardSessionArmed) {
                  setDiscardSessionArmed(true)
                  return
                }
                setDiscardSessionArmed(false)
                void persistence.discardRecovery().then((result) => {
                  if (!result.ok) setMessage(result.message)
                })
              }}
            >
              {discardSessionArmed ? 'Confirm discard session' : 'Discard session'}
            </button>
          </div>
        </section>
      )}

      <div className="home__actions" role="group" aria-label="Start">
        <button type="button" className="btn" data-testid="home-new-game" disabled={!ready || busy} onClick={() => void onNewGame()}>
          New Game
        </button>
        <button
          type="button"
          className="btn btn--secondary"
          data-testid="home-import-game"
          disabled={!ready}
          onClick={() => setImportOpen((open) => !open)}
        >
          Import Game
        </button>
        <button type="button" className="btn btn--secondary" onClick={openDisplay}>
          Open Display
        </button>
        <Link className="btn btn--secondary" to={ROUTES.host}>
          Open classroom controls
        </Link>
      </div>

      {importOpen && (
        <section className="home__import" aria-labelledby="import-title" data-testid="home-import">
          <h2 id="import-title">Import Game</h2>
          <p className="host__note">
            Import a game file or spreadsheet. CQS checks it and saves it to My Games. Spreadsheet
            import remains the bulk-editing path.
          </p>
          <div className="home__actions">
            <button
              type="button"
              className="btn btn--secondary"
              onClick={() => {
                setImportText(CANONICAL_SAMPLE_CATEGORY_BOARD_FILE)
                void importJson(CANONICAL_SAMPLE_CATEGORY_BOARD_FILE)
              }}
            >
              Import demo game
            </button>
          </div>
          <label className="home__label" htmlFor="home-import-json">
            Game file text
          </label>
          <textarea
            id="home-import-json"
            className="home__textarea"
            value={importText}
            onChange={(event) => setImportText(event.target.value)}
            rows={6}
          />
          <div className="home__actions">
            <button type="button" className="btn" disabled={!ready} onClick={() => void importJson(importText)}>
              Import file text
            </button>
            <input
              ref={spreadsheetInputRef}
              type="file"
              accept=".xlsx"
              hidden
              onChange={(event) => void importWorkbook(event.target.files?.[0] ?? null)}
            />
            <button
              type="button"
              className="btn btn--secondary"
              onClick={() => spreadsheetInputRef.current?.click()}
            >
              Import spreadsheet
            </button>
            {pendingReplaceText ? (
              <button type="button" className="btn" onClick={() => void confirmJsonReplace()}>
                Replace the existing saved game
              </button>
            ) : null}
            {pendingWorkbookDraft ? (
              <button type="button" className="btn" onClick={() => void confirmWorkbookReplace()}>
                Replace the existing saved game
              </button>
            ) : null}
          </div>
          {quality && <QualityReportPanel report={quality} />}
        </section>
      )}

      <section className="home__library" aria-labelledby="recent-title">
        <h2 id="recent-title">Recent Games</h2>
        {recent.length === 0 ? (
          <p className="host__note">No games yet. Start with New Game or Import Game.</p>
        ) : (
          <GameList
            entries={recent}
            confirmDeleteId={confirmDeleteId}
            renameId={renameId}
            renameValue={renameValue}
            disabled={!ready}
            onPlay={(entry) => void onPlay(entry)}
            onEdit={(id) => navigate(editPath(id))}
            onDuplicate={(id) => void onDuplicate(id)}
            onExport={(id) => void onExport(id)}
            onDelete={(id) => void onDelete(id)}
            onRenameStart={(entry) => {
              setRenameId(entry.gameId)
              setRenameValue(entry.title)
            }}
            onRenameChange={setRenameValue}
            onRenameConfirm={(id) => void onRename(id)}
            onRenameCancel={() => setRenameId(null)}
          />
        )}
      </section>

      <section className="home__library" aria-labelledby="my-games-title">
        <h2 id="my-games-title">My Games</h2>
        {persistence.library.length === 0 ? (
          <p className="host__note">Your saved games will appear here.</p>
        ) : (
          <GameList
            entries={persistence.library}
            confirmDeleteId={confirmDeleteId}
            renameId={renameId}
            renameValue={renameValue}
            disabled={!ready}
            onPlay={(entry) => void onPlay(entry)}
            onEdit={(id) => navigate(editPath(id))}
            onDuplicate={(id) => void onDuplicate(id)}
            onExport={(id) => void onExport(id)}
            onDelete={(id) => void onDelete(id)}
            onRenameStart={(entry) => {
              setRenameId(entry.gameId)
              setRenameValue(entry.title)
            }}
            onRenameChange={setRenameValue}
            onRenameConfirm={(id) => void onRename(id)}
            onRenameCancel={() => setRenameId(null)}
          />
        )}
      </section>

      <p className="home__status" aria-live="polite" data-testid="home-status">
        {message ??
          (canResume
            ? 'An unfinished class session is waiting on this device.'
            : hasInvalidRecovery
              ? 'An unfinished class session could not be read.'
              : persistence.bootPhase === 'loading'
                ? 'Opening your games…'
                : null)}
      </p>
    </main>
    </div>
  )
}

interface GameListProps {
  readonly entries: readonly SavedDefinitionSummary[]
  readonly confirmDeleteId: string | null
  readonly renameId: string | null
  readonly renameValue: string
  readonly disabled: boolean
  readonly onPlay: (entry: SavedDefinitionSummary) => void
  readonly onEdit: (gameId: string) => void
  readonly onDuplicate: (gameId: string) => void
  readonly onExport: (gameId: string) => void
  readonly onDelete: (gameId: string) => void
  readonly onRenameStart: (entry: SavedDefinitionSummary) => void
  readonly onRenameChange: (value: string) => void
  readonly onRenameConfirm: (gameId: string) => void
  readonly onRenameCancel: () => void
}

function GameList({
  entries,
  confirmDeleteId,
  renameId,
  renameValue,
  disabled,
  onPlay,
  onEdit,
  onDuplicate,
  onExport,
  onDelete,
  onRenameStart,
  onRenameChange,
  onRenameConfirm,
  onRenameCancel,
}: GameListProps) {
  return (
    <ul className="home__game-list" aria-label="Saved games">
      {entries.map((entry) => (
        <li key={entry.gameId} className="home__game">
          <div>
            <strong>{entry.title}</strong>
            <p className="host__note">
              {entry.playable ? 'Ready to play' : 'Needs more content'}
              {entry.hasDraft ? ' · In progress' : ''}
            </p>
          </div>
          {renameId === entry.gameId ? (
            <div className="home__game-actions">
              <label className="home__label" htmlFor={`rename-${entry.gameId}`}>
                New name
              </label>
              <input
                id={`rename-${entry.gameId}`}
                value={renameValue}
                onChange={(event) => onRenameChange(event.target.value)}
              />
              <button type="button" className="btn" onClick={() => onRenameConfirm(entry.gameId)}>
                Save name
              </button>
              <button type="button" className="btn btn--secondary" onClick={onRenameCancel}>
                Cancel
              </button>
            </div>
          ) : (
            <div className="home__game-actions">
              <button type="button" className="btn" disabled={disabled || !entry.playable} onClick={() => onPlay(entry)}>
                Play
              </button>
              <button type="button" className="btn btn--secondary" disabled={disabled} onClick={() => onEdit(entry.gameId)}>
                Edit
              </button>
              <button type="button" className="btn btn--secondary" disabled={disabled} onClick={() => onDuplicate(entry.gameId)}>
                Duplicate
              </button>
              <button type="button" className="btn btn--secondary" disabled={disabled} onClick={() => onRenameStart(entry)}>
                Rename
              </button>
              <button type="button" className="btn btn--secondary" disabled={disabled} onClick={() => onExport(entry.gameId)}>
                Export
              </button>
              <button type="button" className="btn btn--secondary" disabled={disabled} onClick={() => onDelete(entry.gameId)}>
                {confirmDeleteId === entry.gameId ? 'Confirm delete game' : 'Delete'}
              </button>
            </div>
          )}
        </li>
      ))}
    </ul>
  )
}
