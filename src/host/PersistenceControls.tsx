import { useMemo, useState } from 'react'
import type { GameDefinition } from '../game/gameDefinition'
import type { RoundRegistry } from '../game/registry'
import type { SessionCommand } from '../state/commands'
import type { SessionEvent } from '../state/events'
import type { PrivateGameState } from '../state/privateState'
import type { DispatchResult } from '../state/store'
import type { UseHostPersistence } from './useHostPersistence'
import './PersistenceControls.css'

export interface PersistenceControlsProps {
  readonly persistence: UseHostPersistence
  readonly activeGame: PrivateGameState | null
  readonly activeDefinition: GameDefinition | null
  readonly registry: RoundRegistry
  readonly dispatch: (command: SessionCommand) => DispatchResult
  readonly getHistory: () => readonly SessionEvent[]
  /** Injected for tests; production hard-reloads after a successful aggregate wipe. */
  readonly reloadPage?: () => void
}

export function PersistenceControls({
  persistence,
  activeGame,
  activeDefinition,
  registry,
  dispatch,
  getHistory,
  reloadPage = defaultReloadPage,
}: PersistenceControlsProps) {
  const [replaceArmed, setReplaceArmed] = useState(false)
  const [pendingLoadId, setPendingLoadId] = useState<string | null>(null)
  const [actionMessage, setActionMessage] = useState<string | null>(null)
  const [confirmClearAll, setConfirmClearAll] = useState(false)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [confirmDiscard, setConfirmDiscard] = useState(false)
  const [clearAllBusy, setClearAllBusy] = useState(false)
  const readOnly = persistence.leadership === 'follower'
  const controlsReady = persistence.bootPhase === 'ready' && !readOnly
  const statusText = useMemo(() => statusLine(persistence), [persistence])
  const warning = durabilityWarning(persistence.durabilityStatus)

  async function save(): Promise<void> {
    const result = await persistence.saveCurrentDefinition(activeDefinition, registry)
    setActionMessage(result.message)
    setReplaceArmed(!result.ok && result.message.includes('Replace'))
  }

  async function replace(): Promise<void> {
    const result = await persistence.replaceCurrentDefinition(activeDefinition, registry)
    setActionMessage(result.message)
    if (result.ok) setReplaceArmed(false)
  }

  async function load(gameId: string): Promise<void> {
    const result = await persistence.loadSaved({
      gameId,
      activeGame,
      dispatch,
      getHistory,
      registry,
      confirmedReplace: pendingLoadId === gameId,
    })
    setActionMessage(result.message)
    setPendingLoadId(!result.ok && 'needsConfirmation' in result ? gameId : null)
  }

  async function discard(): Promise<void> {
    const result = await persistence.discardRecovery()
    setActionMessage(result.message)
  }

  async function clearAllLocalData(): Promise<void> {
    if (!confirmClearAll) {
      setConfirmClearAll(true)
      return
    }
    setClearAllBusy(true)
    const result = await persistence.clearAllLocalData()
    setClearAllBusy(false)
    setActionMessage(result.message)
    if (!result.ok) {
      // Keep confirmation armed so the teacher can retry after closing other tabs.
      return
    }
    setConfirmClearAll(false)
    reloadPage()
  }

  return (
    <section className="persistence" aria-labelledby="persistence-title">
      <h3 id="persistence-title">Saved games and this class session</h3>
      <p
        className="host__note persistence__status"
        data-testid="persistence-status"
        aria-label="Persistence status"
        aria-live="polite"
      >
        {statusText}
      </p>
      {warning && (
        <p className="host__note persistence__warning" data-testid="persistence-warning">
          {warning}
        </p>
      )}
      {readOnly && (
        <p className="host__note persistence__notice" data-testid="persistence-follower-notice">
          Another host tab owns local persistence. This tab is read-only and session commands are disabled.
        </p>
      )}

      {persistence.bootPhase === 'recovery' && persistence.recovery && (
        <fieldset
          className="foundation__panel persistence__recovery"
          data-testid="persistence-recovery"
        >
          <legend>Unfinished session found</legend>
          <p className="host__note">
            A local unfinished active session was saved with {persistence.recovery.events.length}{' '}
            {persistence.recovery.events.length === 1 ? 'event' : 'events'}. Resume it or discard it before continuing.
          </p>
          <div className="persistence__actions">
            <button
              type="button"
              className="btn"
              data-testid="persistence-resume"
              disabled={readOnly}
              onClick={persistence.resume}
            >
              Resume session
            </button>
            <button
              type="button"
              className="btn btn--secondary"
              data-testid="persistence-discard"
              disabled={readOnly}
              onClick={() => {
                if (!confirmDiscard) {
                  setConfirmDiscard(true)
                  return
                }
                setConfirmDiscard(false)
                void discard()
              }}
            >
              {confirmDiscard ? 'Confirm discard session' : 'Discard recovery'}
            </button>
          </div>
        </fieldset>
      )}

      {persistence.bootPhase === 'invalid-recovery' && persistence.invalidRecovery && (
        <div className="foundation__panel persistence__recovery" data-testid="persistence-recovery" role="alert">
          <h4>Recovery data could not be used</h4>
          <p className="host__note">
            {persistence.invalidRecovery.message} Discard the recovery record to continue with an empty host session.
          </p>
          <button
            type="button"
            className="btn"
            data-testid="persistence-discard"
            disabled={readOnly}
            onClick={() => {
              if (!confirmDiscard) {
                setConfirmDiscard(true)
                return
              }
              setConfirmDiscard(false)
              void discard()
            }}
          >
            {confirmDiscard ? 'Confirm discard session' : 'Discard invalid recovery'}
          </button>
        </div>
      )}

      <div className="foundation__panel persistence__library" data-testid="persistence-library">
        <h4>Saved games</h4>
        <p className="host__note">
          These are reusable games. Loading one starts or replaces this class session only. It does
          not change the saved game unless you choose Save current game.
        </p>
        <div className="persistence__actions">
          <button
            type="button"
            className="btn"
            data-testid="persistence-save"
            disabled={!controlsReady || activeDefinition === null}
            onClick={() => void save()}
          >
            Save current game
          </button>
          <button
            type="button"
            className="btn btn--secondary"
            data-testid="persistence-replace-confirm"
            disabled={!controlsReady || activeDefinition === null || !replaceArmed}
            onClick={() => void replace()}
          >
            Confirm replace
          </button>
        </div>

        {persistence.library.length === 0 ? (
          <p className="host__note">No saved definitions yet.</p>
        ) : (
          <ul className="persistence__list" aria-label="Saved definitions">
            {persistence.library.map((entry) => {
              const confirmingLoad = pendingLoadId === entry.gameId
              return (
                <li key={entry.gameId} className="persistence__item">
                  <span>
                    <strong>{entry.title}</strong> <code>{entry.gameId}</code>
                  </span>
                  <span className="persistence__item-actions">
                    <button
                      type="button"
                      className="btn btn--secondary"
                      data-testid="persistence-load"
                      disabled={!controlsReady}
                      onClick={() => void load(entry.gameId)}
                    >
                      {confirmingLoad ? 'Confirm load and replace current game' : 'Load'}
                    </button>
                    <button
                      type="button"
                      className="btn btn--secondary"
                      data-testid="persistence-delete"
                      disabled={!controlsReady}
                      onClick={async () => {
                        if (confirmDeleteId !== entry.gameId) {
                          setConfirmDeleteId(entry.gameId)
                          return
                        }
                        const result = await persistence.deleteSaved(entry.gameId)
                        setConfirmDeleteId(null)
                        setActionMessage(result.message)
                      }}
                    >
                      {confirmDeleteId === entry.gameId ? 'Confirm delete game' : 'Delete'}
                    </button>
                  </span>
                </li>
              )
            })}
          </ul>
        )}
        <p className="host__note persistence__message" aria-live="polite">
          {actionMessage ?? persistence.message}
        </p>
      </div>

      <div
        className="foundation__panel persistence__clear-all"
        data-testid="persistence-clear-all"
      >
        <h4>Clear all local CQS data</h4>
        <p className="host__note">
          Removes Classroom Quiz Show data stored on this browser and device only:
          saved games, unfinished sessions, completed summaries, pack media,
          controller team mappings, coordination records, and buzz-key preferences.
          This does not uninstall a progressive web app or clear the browser&apos;s
          ordinary HTTP cache. There is no undo and nothing is synced to an account
          or another device.
        </p>
        {confirmClearAll && (
          <p
            className="host__note persistence__warning"
            data-testid="persistence-clear-all-warning"
            role="alert"
          >
            Confirm that you want to permanently delete all local Classroom Quiz Show
            data on this browser. Close other CQS tabs first if a previous attempt was
            blocked.
          </p>
        )}
        <div className="persistence__actions">
          <button
            type="button"
            className="btn btn--secondary"
            data-testid="persistence-clear-all-action"
            disabled={persistence.bootPhase === 'loading' || clearAllBusy}
            onClick={() => void clearAllLocalData()}
          >
            {clearAllBusy
              ? 'Clearing local data…'
              : confirmClearAll
                ? 'Confirm clear all local CQS data — no undo'
                : 'Clear all local CQS data'}
          </button>
          {confirmClearAll && !clearAllBusy && (
            <button
              type="button"
              className="btn btn--secondary"
              data-testid="persistence-clear-all-cancel"
              onClick={() => setConfirmClearAll(false)}
            >
              Cancel
            </button>
          )}
        </div>
        <p
          className="host__note persistence__message"
          data-testid="persistence-clear-all-message"
          aria-live="polite"
        >
          {actionMessage && /clear all local|could not clear all local/i.test(actionMessage)
            ? actionMessage
            : null}
        </p>
      </div>
    </section>
  )
}

function defaultReloadPage(): void {
  window.location.reload()
}

function durabilityWarning(
  durabilityStatus: UseHostPersistence['durabilityStatus'],
): string | null {
  if (durabilityStatus === 'unavailable') {
    return 'Local storage is unavailable. The host remains usable, but recent changes might not survive refresh.'
  }
  if (durabilityStatus === 'failed') {
    return 'Local persistence failed. The host remains usable, but recent changes might not survive refresh.'
  }
  return null
}

function statusLine(persistence: UseHostPersistence): string {
  if (persistence.bootPhase === 'loading') return 'Loading local persistence.'
  if (persistence.bootPhase === 'recovery') return 'Resumable active session found.'
  if (persistence.bootPhase === 'invalid-recovery') return 'Invalid recovery data found.'
  if (persistence.leadership === 'follower') return 'Follower mode: read-only in this tab.'
  if (persistence.durabilityStatus === 'saving') return 'Saving active session.'
  if (persistence.durabilityStatus === 'saved') return 'Active session saved locally.'
  if (persistence.durabilityStatus === 'unavailable') return 'Persistence unavailable.'
  if (persistence.durabilityStatus === 'failed') return 'Persistence failed.'
  return 'Local persistence ready.'
}
