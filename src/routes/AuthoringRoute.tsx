import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  applyDraftCorrection,
  canRedoAuthoring,
  canUndoAuthoring,
  completeSave,
  createGenerationWriteGate,
  decideUnsavedHashLeave,
  emptyAuthoringUndoStack,
  initialSaveTrustState,
  markSaveClean,
  markSaveDirty,
  pushAuthoringUndo,
  redoAuthoring,
  revertHash,
  saveStatusLabel,
  undoAuthoring,
  type AuthoringUndoStack,
  type DraftCorrection,
  type SaveTrustState,
} from '../authoring'
import type { AuthoringDraft, DraftClue } from '../authoring/types'
import { createDefaultRegistry } from '../game/defaultRegistry'
import { useHostPersistence, type UseHostPersistenceOptions } from '../host/useHostPersistence'
import { QualityReportPanel } from '../host/QualityReportPanel'
import { buildImportQualityReport } from '../import/qualityReport'
import { openLibraryGame, saveAuthoringDraftToLibrary } from '../library/gameLibrary'
import { ROUTES, playPath } from './paths'
import './HostRoute.css'
import './AuthoringRoute.css'

export interface AuthoringRouteProps {
  readonly persistenceOptions?: UseHostPersistenceOptions
}

interface TileCursor {
  readonly categoryOrder: number
  readonly clueOrder: number
}

export function AuthoringRoute({ persistenceOptions }: AuthoringRouteProps = {}) {
  const { gameId } = useParams<{ gameId?: string }>()
  const navigate = useNavigate()
  const persistence = useHostPersistence(persistenceOptions)
  const registry = useMemo(() => createDefaultRegistry(), [])
  const [draft, setDraft] = useState<AuthoringDraft | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [saveTrust, setSaveTrust] = useState<SaveTrustState>(initialSaveTrustState())
  const [undoStack, setUndoStack] = useState<AuthoringUndoStack>(emptyAuthoringUndoStack())
  const [cursor, setCursor] = useState<TileCursor | null>(null)
  const [preview, setPreview] = useState(false)
  const [leaveArmed, setLeaveArmed] = useState(false)
  const [draftWarning, setDraftWarning] = useState<string | null>(null)
  const allowLeaveRef = useRef(false)
  const writeGateRef = useRef(createGenerationWriteGate())

  useEffect(() => {
    if (persistence.bootPhase === 'loading') return
    if (!gameId) {
      setLoadError('Choose a game from Home to edit.')
      return
    }
    let cancelled = false
    void openLibraryGame(persistence.adapter, gameId, registry).then((loaded) => {
      if (cancelled) return
      if (!loaded.ok) {
        setLoadError(loaded.message)
        return
      }
      setDraft(loaded.value.draft)
      setDraftWarning(
        loaded.value.draftUnreadable
          ? 'The saved editor draft could not be read. You are seeing the last playable game. Extra editor notes may be missing.'
          : null,
      )
      setSaveTrust(markSaveClean(initialSaveTrustState()))
    })
    return () => {
      cancelled = true
    }
  }, [gameId, persistence.adapter, persistence.bootPhase, registry])

  useEffect(() => {
    function onBeforeUnload(event: BeforeUnloadEvent): void {
      if (!saveTrust.dirty || allowLeaveRef.current) return
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [saveTrust.dirty])

  useEffect(() => {
    const allowedHash = window.location.hash
    function onHashChange(): void {
      const decision = decideUnsavedHashLeave({
        dirty: saveTrust.dirty,
        allowLeave: allowLeaveRef.current || leaveArmed,
        allowedHash,
        nextHash: window.location.hash,
      })
      if (decision === 'allow') return
      revertHash(decision.revertTo)
      setLeaveArmed(true)
    }
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [saveTrust.dirty, leaveArmed, gameId])

  const apply = useCallback(
    (correction: DraftCorrection) => {
      setDraft((current) => {
        if (!current) return current
        const next = applyDraftCorrection(current, correction)
        setUndoStack((stack) => pushAuthoringUndo(stack, current))
        setSaveTrust((state) => markSaveDirty(state))
        return next
      })
    },
    [],
  )

  async function save(): Promise<void> {
    if (!draft || saveTrust.phase === 'saving') return
    const generation = writeGateRef.current.begin()
    setSaveTrust({
      phase: 'saving',
      generation,
      dirty: false,
      message: 'Saving…',
    })
    const snapshot = draft
    const outcome = await writeGateRef.current.enqueue(generation, () =>
      saveAuthoringDraftToLibrary(persistence.adapter, snapshot, registry),
    )
    if (outcome.skipped) return
    setSaveTrust((current) =>
      completeSave(
        current,
        generation,
        outcome.value.ok ? { ok: true } : { ok: false, message: outcome.value.message },
      ),
    )
    if (outcome.value.ok && writeGateRef.current.latest() === generation) {
      await persistence.refreshLibrary()
    }
  }

  function undo(): void {
    if (!draft) return
    const result = undoAuthoring(undoStack, draft)
    if (!result) return
    setDraft(result.draft)
    setUndoStack(result.stack)
    setSaveTrust((state) => markSaveDirty(state))
  }

  function redo(): void {
    if (!draft) return
    const result = redoAuthoring(undoStack, draft)
    if (!result) return
    setDraft(result.draft)
    setUndoStack(result.stack)
    setSaveTrust((state) => markSaveDirty(state))
  }

  function requestHome(): void {
    if (saveTrust.dirty && !allowLeaveRef.current) {
      setLeaveArmed(true)
      return
    }
    allowLeaveRef.current = true
    navigate(ROUTES.root)
  }

  function stayOnEditor(): void {
    allowLeaveRef.current = false
    setLeaveArmed(false)
  }

  function discardAndLeave(): void {
    allowLeaveRef.current = true
    setLeaveArmed(false)
    navigate(ROUTES.root)
  }

  const tiles = useMemo(() => flattenTiles(draft), [draft])
  const selected = draft && cursor ? findClue(draft, cursor) : null
  const selectedIndex = cursor ? tiles.findIndex((tile) => sameCursor(tile, cursor)) : -1
  const report = draft ? buildImportQualityReport({ draft, title: draft.game.title }) : null
  const playable = draft?.status === 'ready_for_approval' || draft?.status === 'approved'

  if (loadError) {
    return (
      <main className="screen__main authoring" aria-labelledby="authoring-title">
        <h1 id="authoring-title">Edit game</h1>
        <p role="alert">{loadError}</p>
        <Link className="btn" to={ROUTES.root}>
          Back to Home
        </Link>
      </main>
    )
  }

  if (!draft) {
    return (
      <main className="screen__main authoring" aria-labelledby="authoring-title">
        <h1 id="authoring-title">Edit game</h1>
        <p className="host__note">Opening the game…</p>
      </main>
    )
  }

  return (
    <div className="screen host authoring-shell">
      <div className="host__banner" role="note">
        <span className="host__banner-badge">Host</span>
        <span>Private teacher editor — do not project this screen for students.</span>
      </div>
      <main className="screen__main authoring" aria-labelledby="authoring-title">
        <h1 id="authoring-title">Edit game</h1>
        <p className="authoring__save" data-testid="authoring-save-status" aria-live="polite">
          {saveStatusLabel(saveTrust)}
          {saveTrust.phase === 'failed' ? ` — ${saveTrust.message}` : ''}
        </p>
        <div className="authoring__toolbar">
          <label className="authoring__title-label" htmlFor="game-title">
            Game title
          </label>
          <input
            id="game-title"
            value={draft.game.title}
            onChange={(event) => apply({ kind: 'game-title', title: event.target.value })}
          />
          <button
            type="button"
            className="btn"
            onClick={() => void save()}
            data-testid="authoring-save"
            disabled={saveTrust.phase === 'saving'}
          >
            Save
          </button>
          <button type="button" className="btn btn--secondary" disabled={!canUndoAuthoring(undoStack)} onClick={undo}>
            Undo
          </button>
          <button type="button" className="btn btn--secondary" disabled={!canRedoAuthoring(undoStack)} onClick={redo}>
            Redo
          </button>
          <button type="button" className="btn btn--secondary" onClick={() => setPreview((value) => !value)}>
            {preview ? 'Back to editor' : 'Preview board'}
          </button>
          <button
            type="button"
            className="btn"
            disabled={!playable}
            onClick={() => {
              if (saveTrust.dirty && !allowLeaveRef.current) {
                setLeaveArmed(true)
                return
              }
              allowLeaveRef.current = true
              navigate(playPath(draft.game.gameCanonicalId))
            }}
          >
            Play
          </button>
          <button type="button" className="btn btn--secondary" onClick={requestHome} data-testid="authoring-home">
            Home
          </button>
        </div>
        {leaveArmed && saveTrust.dirty ? (
          <p className="authoring__confirm" role="alert">
            You have unsaved changes. Save first, or confirm that you want to discard them.
            <span className="authoring__toolbar">
              <button type="button" className="btn" onClick={discardAndLeave}>
                Discard unsaved changes
              </button>
              <button type="button" className="btn btn--secondary" onClick={stayOnEditor}>
                Stay
              </button>
            </span>
          </p>
        ) : null}
        {draftWarning ? (
          <p className="host__note" role="status">
            {draftWarning}
          </p>
        ) : null}

        <p className="host__note" data-testid="authoring-validation">
          {draft.status === 'blocked'
            ? 'This game still has missing questions or answers. You can save and come back.'
            : 'This game has the required content and can be played.'}
        </p>

        <section className="authoring-board" aria-label="Game board editor">
          {draft.board.categories.map((category) => (
            <div key={category.canonicalId} className="authoring-board__category">
              <label className="authoring-board__category-label" htmlFor={`category-${category.order}`}>
                Category {category.order}
              </label>
              <input
                id={`category-${category.order}`}
                value={category.title}
                onChange={(event) =>
                  apply({ kind: 'category-title', categoryOrder: category.order, title: event.target.value })
                }
              />
              {category.clues.map((clue) => {
                const incomplete = clue.prompt.trim().length === 0 || clue.answer.trim().length === 0
                const selectedTile = cursor && sameCursor(cursor, clue)
                return (
                  <button
                    key={clue.tileCanonicalId}
                    type="button"
                    className={`authoring-board__tile${incomplete ? ' authoring-board__tile--incomplete' : ''}${
                      selectedTile ? ' authoring-board__tile--selected' : ''
                    }`}
                    aria-pressed={Boolean(selectedTile)}
                    aria-label={`${category.title} ${clue.value}${incomplete ? ', incomplete' : ', complete'}`}
                    onClick={() => setCursor({ categoryOrder: clue.categoryOrder, clueOrder: clue.clueOrder })}
                  >
                    <span>{clue.value}</span>
                    <span className="authoring-board__tile-state">{incomplete ? 'Needs content' : 'Ready'}</span>
                  </button>
                )
              })}
            </div>
          ))}
        </section>

        {selected && cursor && !preview && (
          <TileEditor
            clue={selected}
            onChange={(field, value) =>
              apply({
                kind: 'clue-field',
                categoryOrder: cursor.categoryOrder,
                clueOrder: cursor.clueOrder,
                field,
                value,
              })
            }
            onPrevious={() => selectedIndex > 0 && setCursor(tiles[selectedIndex - 1])}
            onNext={() => selectedIndex < tiles.length - 1 && setCursor(tiles[selectedIndex + 1])}
            hasPrevious={selectedIndex > 0}
            hasNext={selectedIndex < tiles.length - 1}
          />
        )}

        <section className="authoring-final" aria-labelledby="default-teams-title">
          <h2 id="default-teams-title">Default team names</h2>
          <p className="host__note">
            These names are part of the reusable game. Class scores and controller assignments stay
            in the session when you play.
          </p>
          {draft.game.teams.map((team) => (
            <label key={team.canonicalId} htmlFor={`team-${team.order}`}>
              Team {team.order}
              <input
                id={`team-${team.order}`}
                value={team.name}
                onChange={(event) => apply({ kind: 'team-name', order: team.order, name: event.target.value })}
              />
            </label>
          ))}
        </section>

        {draft.final && !preview && (
          <section className="authoring-final" aria-labelledby="final-title">
            <h2 id="final-title">Final</h2>
            <label htmlFor="final-prompt">Final question</label>
            <textarea
              id="final-prompt"
              value={draft.final.prompt}
              onChange={(event) => apply({ kind: 'final-field', field: 'prompt', value: event.target.value })}
            />
            <label htmlFor="final-answer">Final canonical answer</label>
            <input
              id="final-answer"
              value={draft.final.answer}
              onChange={(event) => apply({ kind: 'final-field', field: 'answer', value: event.target.value })}
            />
            <label htmlFor="final-notes">Final teacher notes</label>
            <textarea
              id="final-notes"
              value={draft.final.notes ?? ''}
              onChange={(event) => apply({ kind: 'final-field', field: 'notes', value: event.target.value })}
            />
            <label htmlFor="final-alt">Supported alternate</label>
            <input
              id="final-alt"
              value={draft.final.alternates[0] ?? ''}
              onChange={(event) => apply({ kind: 'final-field', field: 'alternate1', value: event.target.value })}
            />
          </section>
        )}

        {preview && (
          <section className="authoring-preview" aria-label="Board preview" data-testid="authoring-preview">
            <h2>Preview</h2>
            <p className="host__note">
              This preview does not start a class session and does not save scores.
            </p>
            <div className="authoring-board" aria-hidden="true">
              {draft.board.categories.map((category) => (
                <div key={category.canonicalId} className="authoring-board__category">
                  <p className="authoring-board__preview-title">{category.title}</p>
                  {category.clues.map((clue) => (
                    <div key={clue.tileCanonicalId} className="authoring-board__tile">
                      {clue.value}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </section>
        )}

        {report && <QualityReportPanel report={report} context="editor" />}
      </main>
    </div>
  )
}

function flattenTiles(draft: AuthoringDraft | null): TileCursor[] {
  if (!draft) return []
  return draft.board.categories.flatMap((category) =>
    category.clues.map((clue) => ({ categoryOrder: clue.categoryOrder, clueOrder: clue.clueOrder })),
  )
}

function findClue(draft: AuthoringDraft, cursor: TileCursor): DraftClue | null {
  return (
    draft.board.categories
      .find((category) => category.order === cursor.categoryOrder)
      ?.clues.find((clue) => clue.clueOrder === cursor.clueOrder) ?? null
  )
}

function sameCursor(a: TileCursor, b: TileCursor): boolean {
  return a.categoryOrder === b.categoryOrder && a.clueOrder === b.clueOrder
}

function TileEditor({
  clue,
  onChange,
  onPrevious,
  onNext,
  hasPrevious,
  hasNext,
}: {
  readonly clue: DraftClue
  readonly onChange: (field: 'prompt' | 'answer' | 'notes' | 'value' | 'alternate1', value: string | number) => void
  readonly onPrevious: () => void
  readonly onNext: () => void
  readonly hasPrevious: boolean
  readonly hasNext: boolean
}) {
  return (
    <section className="authoring-tile" aria-labelledby="tile-editor-title" data-testid="tile-editor">
      <h2 id="tile-editor-title">
        {clue.categoryTitle} — {clue.value}
      </h2>
      <label htmlFor="tile-prompt">Question</label>
      <textarea
        id="tile-prompt"
        value={clue.prompt}
        onChange={(event) => onChange('prompt', event.target.value)}
      />
      <label htmlFor="tile-answer">Canonical answer</label>
      <input id="tile-answer" value={clue.answer} onChange={(event) => onChange('answer', event.target.value)} />
      <label htmlFor="tile-alt">Supported alternate</label>
      <input
        id="tile-alt"
        value={clue.alternates[0] ?? ''}
        onChange={(event) => onChange('alternate1', event.target.value)}
      />
      <label htmlFor="tile-notes">Teacher notes</label>
      <textarea
        id="tile-notes"
        value={clue.notes ?? ''}
        onChange={(event) => onChange('notes', event.target.value)}
      />
      <label htmlFor="tile-value">Value</label>
      <input
        id="tile-value"
        type="number"
        value={clue.value}
        onChange={(event) => onChange('value', Number(event.target.value))}
      />
      <div className="authoring__toolbar">
        <button type="button" className="btn btn--secondary" disabled={!hasPrevious} onClick={onPrevious}>
          Previous
        </button>
        <button type="button" className="btn btn--secondary" disabled={!hasNext} onClick={onNext}>
          Next
        </button>
      </div>
    </section>
  )
}
