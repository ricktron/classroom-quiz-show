import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useBlocker, useLocation, useNavigate, useParams } from 'react-router-dom'
import {
  applyDraftCorrection,
  canRedoAuthoring,
  canUndoAuthoring,
  completeSave,
  createGenerationWriteGate,
  emptyAuthoringUndoStack,
  initialSaveTrustState,
  markSaveLoaded,
  markSaveDirty,
  pushAuthoringUndo,
  redoAuthoring,
  saveStatusLabel,
  undoAuthoring,
  type AuthoringUndoStack,
  type DraftCorrection,
  type SaveTrustState,
} from '../authoring'
import type { AuthoringDraft, DraftClue } from '../authoring/types'
import { createDefaultRegistry } from '../game/defaultRegistry'
import { useHostPersistence, type UseHostPersistenceOptions } from '../host/useHostPersistence'
import { canPersistMutations } from '../host/writeAuthority'
import { QualityReportPanel } from '../host/QualityReportPanel'
import { buildImportQualityReport } from '../import/qualityReport'
import { openLibraryGame, saveAuthoringDraftToLibrary } from '../library/gameLibrary'
import { persistenceErr } from '../persistence/results'
import { ROUTES, playPath } from './paths'
import { MAX_TEAMS, MIN_TEAMS } from '../game/teams/limits'
import { contextualTeamCountReturnState } from '../host/hostResumeNavigation'
import './HostRoute.css'
import './AuthoringRoute.css'

export interface AuthoringRouteProps {
  readonly persistenceOptions?: UseHostPersistenceOptions
}

interface TileCursor {
  readonly categoryOrder: number
  readonly clueOrder: number
}

function clueNeedsTeacher(clue: DraftClue): boolean {
  return (
    clue.prompt.trim().length === 0 ||
    clue.answer.trim().length === 0 ||
    clue.valueAuthored === false
  )
}

function clueValueLabel(clue: DraftClue): string {
  return clue.valueAuthored === false ? 'Value needed' : String(clue.value)
}

export function AuthoringRoute({ persistenceOptions }: AuthoringRouteProps = {}) {
  const { gameId } = useParams<{ gameId?: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const persistence = useHostPersistence(persistenceOptions)
  const registry = useMemo(() => createDefaultRegistry(), [])
  const [draft, setDraft] = useState<AuthoringDraft | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [saveTrust, setSaveTrust] = useState<SaveTrustState>(initialSaveTrustState())
  const [undoStack, setUndoStack] = useState<AuthoringUndoStack>(emptyAuthoringUndoStack())
  const [cursor, setCursor] = useState<TileCursor | null>(null)
  const [preview, setPreview] = useState(false)
  const [draftWarning, setDraftWarning] = useState<string | null>(null)
  const [gameSettingsOpen, setGameSettingsOpen] = useState(false)
  const [pendingTeamCountFocus, setPendingTeamCountFocus] = useState(false)
  const writeGateRef = useRef(createGenerationWriteGate())
  const leadershipRef = useRef(persistence.leadership)
  const cursorSeededForGameRef = useRef<string | null>(null)
  const teamCountFocusConsumedRef = useRef<string | null>(null)
  const teamCountInputRef = useRef<HTMLInputElement | null>(null)
  /** Q1: blocked Fix team count only — Save may request Class Setup return. */
  const returnToClassSetupRef = useRef(false)
  const returnSetupFocusRef = useRef<'names' | 'teams' | 'buzzers'>('names')
  leadershipRef.current = persistence.leadership
  const blocker = useBlocker(saveTrust.dirty || saveTrust.phase === 'saving')

  // Capture contextual return intent once from navigation state (not schema).
  useEffect(() => {
    const state = location.state
    if (state === null || typeof state !== 'object') return
    if (!('returnToClassSetup' in state) || (state as { returnToClassSetup?: unknown }).returnToClassSetup !== true) {
      return
    }
    returnToClassSetupRef.current = true
    const focus = (state as { setupFocus?: unknown }).setupFocus
    if (focus === 'names' || focus === 'teams' || focus === 'buzzers') {
      returnSetupFocusRef.current = focus
    }
  }, [location.state])

  useEffect(() => {
    if (persistence.bootPhase === 'loading') return
    if (!gameId) {
      setLoadError('Choose a game from Home to edit.')
      return
    }
    let cancelled = false
    void openLibraryGame(persistence.adapter, gameId, registry, {
      // Read leadership at open time only. Re-opening on a later follower
      // transition would reload the draft and wipe unsaved in-memory edits.
      touchOpenedAt: canPersistMutations(leadershipRef.current),
    }).then((loaded) => {
      if (cancelled) return
      if (!loaded.ok) {
        setLoadError(loaded.message)
        return
      }
      setDraft(loaded.value.draft)
      setCursor(null)
      cursorSeededForGameRef.current = null
      teamCountFocusConsumedRef.current = null
      setGameSettingsOpen(false)
      setPendingTeamCountFocus(false)
      setDraftWarning(
        loaded.value.draftUnreadable
          ? 'The saved editor draft could not be read. You are seeing the last playable game. Extra editor notes may be missing.'
          : null,
      )
      setSaveTrust(markSaveLoaded())
    })
    return () => {
      cancelled = true
    }
  }, [gameId, persistence.adapter, persistence.bootPhase, registry])

  // Once per load: land on the first incomplete clue so New Game opens on content work.
  useEffect(() => {
    if (!draft || !gameId) return
    if (cursorSeededForGameRef.current === gameId) return
    // I-REPAIR-1: Class Setup Fix team count skips clue seeding so Game settings stay primary.
    const focus =
      location.state &&
      typeof location.state === 'object' &&
      'authoringFocus' in location.state &&
      (location.state as { authoringFocus?: unknown }).authoringFocus === 'team-count'
    if (focus) return
    cursorSeededForGameRef.current = gameId
    const tiles = flattenTiles(draft)
    const firstIncomplete =
      tiles.find((tile) => {
        const clue = findClue(draft, tile)
        return clue !== null && clueNeedsTeacher(clue)
      }) ?? null
    setCursor(firstIncomplete ?? tiles[0] ?? null)
  }, [draft, gameId, location.state])

  // One-shot Class Setup → Game settings Team count (no schema; navigation state only).
  // Consume via refs — do not navigate-replace to clear state (that remounts and wipes draft).
  useEffect(() => {
    if (!draft || !gameId) return
    const focus =
      location.state &&
      typeof location.state === 'object' &&
      'authoringFocus' in location.state
        ? (location.state as { authoringFocus?: unknown }).authoringFocus
        : null
    if (focus !== 'team-count') return
    if (teamCountFocusConsumedRef.current === gameId) return
    teamCountFocusConsumedRef.current = gameId
    setGameSettingsOpen(true)
    setPendingTeamCountFocus(true)
    cursorSeededForGameRef.current = gameId
  }, [draft, gameId, location.state])

  useEffect(() => {
    if (!pendingTeamCountFocus || !gameSettingsOpen) return
    const input = teamCountInputRef.current
    if (!input) return
    input.focus()
    if (typeof input.scrollIntoView === 'function') {
      input.scrollIntoView({ block: 'center' })
    }
    setPendingTeamCountFocus(false)
  }, [pendingTeamCountFocus, gameSettingsOpen, draft])

  useEffect(() => {
    function onBeforeUnload(event: BeforeUnloadEvent): void {
      if (!saveTrust.dirty && saveTrust.phase !== 'saving') return
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [saveTrust.dirty, saveTrust.phase])

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

  /** Game-owned team count 1–8 via existing add-team / end-only remove-team. */
  const setTeamCount = useCallback((raw: number) => {
    setDraft((current) => {
      if (!current) return current
      if (!Number.isFinite(raw)) return current
      const target = Math.max(MIN_TEAMS, Math.min(MAX_TEAMS, Math.trunc(raw)))
      let next = current
      while (next.game.teams.length < target) {
        next = applyDraftCorrection(next, { kind: 'add-team' })
      }
      while (next.game.teams.length > target) {
        const maxOrder = Math.max(...next.game.teams.map((team) => team.order))
        next = applyDraftCorrection(next, { kind: 'remove-team', order: maxOrder })
      }
      if (next === current) return current
      setUndoStack((stack) => pushAuthoringUndo(stack, current))
      setSaveTrust((state) => markSaveDirty(state))
      return next
    })
  }, [])

  async function save(): Promise<void> {
    if (!draft || saveTrust.phase === 'saving') return
    const blocked = persistence.assertCanPersist('editor')
    if (!blocked.ok) {
      setSaveTrust((current) => ({
        phase: 'failed',
        generation: current.generation,
        dirty: true,
        message: blocked.message,
      }))
      return
    }
    const generation = writeGateRef.current.begin()
    setSaveTrust({
      phase: 'saving',
      generation,
      dirty: false,
      message: 'Saving…',
    })
    const snapshot = draft
    try {
      const outcome = await writeGateRef.current.enqueue(generation, () => {
        const again = persistence.assertCanPersist('editor')
        if (!again.ok) return Promise.resolve(persistenceErr('follower', again.message))
        return saveAuthoringDraftToLibrary(persistence.adapter, snapshot, registry)
      })
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
        // Q1: blocked Fix Save → Host Class Setup return intent (Host decides
        // discard only when Session is disposable; never auto confirmedReplace).
        if (returnToClassSetupRef.current) {
          returnToClassSetupRef.current = false
          navigate(playPath(snapshot.game.gameCanonicalId), {
            state: contextualTeamCountReturnState({
              setupFocus: returnSetupFocusRef.current,
            }),
          })
        }
      }
    } catch {
      setSaveTrust((current) =>
        completeSave(current, generation, {
          ok: false,
          message: 'The game could not be saved on this device. Your edits are still here.',
        }),
      )
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
        <p className="host__note" data-testid="authoring-goal">
          Fill the board first — category titles, questions, and answers. Final comes next. Team count,
          default names, and the class name bank stay in Game settings until you need them.
        </p>
        <p className="authoring__save" data-testid="authoring-save-status" aria-live="polite">
          {saveStatusLabel(saveTrust)}
          {saveTrust.phase === 'failed' ? ` — ${saveTrust.message}` : ''}
        </p>
        {persistence.leadership === 'follower' ? (
          <p className="host__note" role="status" data-testid="authoring-follower-notice">
            Another Classroom Quiz Show window is currently responsible for saving. Your edits are
            still here.
          </p>
        ) : null}
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
            aria-disabled={!persistence.canPersistMutations || saveTrust.phase === 'saving'}
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
            disabled={!playable || saveTrust.phase === 'saving'}
            onClick={() => {
              navigate(playPath(draft.game.gameCanonicalId))
            }}
          >
            Play
          </button>
          <button
            type="button"
            className="btn btn--secondary"
            onClick={requestHome}
            data-testid="authoring-home"
            disabled={saveTrust.phase === 'saving'}
          >
            Home
          </button>
        </div>
        {blocker.state === 'blocked' ? (
          <p className="authoring__confirm" role="alert">
            You have unsaved changes. Save first, or confirm that you want to discard them.
            <span className="authoring__toolbar">
              <button type="button" className="btn" onClick={() => blocker.proceed()}>
                Discard unsaved changes
              </button>
              <button type="button" className="btn btn--secondary" onClick={() => blocker.reset()}>
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
            ? 'This game still has missing questions or answers. Start with the selected tile, then finish Final. You can save and come back.'
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
                const incomplete = clueNeedsTeacher(clue)
                const valueLabel = clueValueLabel(clue)
                const selectedTile = cursor && sameCursor(cursor, clue)
                return (
                  <button
                    key={clue.tileCanonicalId}
                    type="button"
                    className={`authoring-board__tile${incomplete ? ' authoring-board__tile--incomplete' : ''}${
                      selectedTile ? ' authoring-board__tile--selected' : ''
                    }`}
                    aria-pressed={Boolean(selectedTile)}
                    aria-label={`${category.title} ${valueLabel}${incomplete ? ', incomplete' : ', complete'}`}
                    onClick={() => setCursor({ categoryOrder: clue.categoryOrder, clueOrder: clue.clueOrder })}
                  >
                    <span>{valueLabel}</span>
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

        <details
          className="authoring-settings"
          data-testid="authoring-game-settings"
          open={gameSettingsOpen}
          onToggle={(event) => setGameSettingsOpen(event.currentTarget.open)}
        >
          <summary>Game settings — teams, default names, and class name bank</summary>
          <p className="host__note">
            These names are part of the reusable game. Class scores and controller assignments stay
            in the session when you play. You can leave the defaults and change them later.
          </p>
          <label htmlFor="authoring-team-count">
            Number of teams
            <input
              id="authoring-team-count"
              ref={teamCountInputRef}
              data-testid="authoring-team-count"
              type="number"
              min={MIN_TEAMS}
              max={MAX_TEAMS}
              value={draft.game.teams.length === 0 ? '' : draft.game.teams.length}
              placeholder="1–8"
              onChange={(event) => {
                const raw = event.target.value
                if (raw.trim() === '') return
                const parsed = Number(raw)
                if (!Number.isFinite(parsed)) return
                setTeamCount(parsed)
              }}
            />
          </label>
          <p className="host__note" data-testid="authoring-team-count-hint">
            Games use 1–8 teams. Changing the count updates this reusable game; class names are
            chosen when you play.
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
          <label htmlFor="team-name-bank">
            Class name bank (reusable with this game; class picks happen when you play)
            <textarea
              id="team-name-bank"
              data-testid="team-name-bank"
              rows={6}
              value={(draft.game.teamNameBank ?? []).join('\n')}
              onChange={(event) =>
                apply({
                  kind: 'team-name-bank',
                  names: event.target.value.split(/\r?\n/),
                })
              }
            />
          </label>
        </details>

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
                      {clueValueLabel(clue)}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </section>
        )}

        {report ? (
          <details
            className="authoring-settings"
            data-testid="authoring-quality-details"
            open={draft.status === 'blocked'}
          >
            <summary>Quality notes</summary>
            <QualityReportPanel report={report} context="editor" />
          </details>
        ) : null}
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
        {clue.categoryTitle} — {clueValueLabel(clue)}
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
        value={clue.valueAuthored === false ? '' : clue.value}
        aria-invalid={clue.valueAuthored === false}
        aria-describedby={clue.valueAuthored === false ? 'tile-value-help' : undefined}
        onChange={(event) => onChange('value', event.target.value)}
      />
      {clue.valueAuthored === false ? (
        <p id="tile-value-help" className="host__note">
          Enter the point value. Classroom Quiz Show will not guess one.
        </p>
      ) : null}
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
