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
}

export function PersistenceControls({
  persistence,
  activeGame,
  activeDefinition,
  registry,
  dispatch,
  getHistory,
}: PersistenceControlsProps) {
  const [replaceArmed, setReplaceArmed] = useState(false)
  const [pendingLoadId, setPendingLoadId] = useState<string | null>(null)
  const [actionMessage, setActionMessage] = useState<string | null>(null)
  const readOnly = persistence.leadership === 'follower'
  const controlsReady = persistence.bootPhase === 'ready' && !readOnly
  const statusText = useMemo(() => statusLine(persistence), [persistence])
  const warning =
    persistence.durabilityStatus === 'unavailable'
      ? 'Local storage is unavailable. The host remains usable, but recent changes might not survive refresh.'
      : persistence.durabilityStatus === 'failed'
        ? 'Local persistence failed. The host remains usable, but recent changes might not survive refresh.'
        : null

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

  return (
    <section className="persistence" aria-labelledby="persistence-title">
      <div className="foundation__tag foundation__tag--slice13">
        Local persistence (Slice 13) — host-only
      </div>
      <h3 id="persistence-title">Persistence &amp; recovery</h3>
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
        <div className="foundation__panel persistence__recovery" data-testid="persistence-recovery" role="group" aria-label="Recovery choices">
          <h4>Unfinished session found</h4>
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
              onClick={() => void discard()}
            >
              Discard recovery
            </button>
          </div>
        </div>
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
            onClick={() => void discard()}
          >
            Discard invalid recovery
          </button>
        </div>
      )}

      <div className="foundation__panel persistence__library" data-testid="persistence-library">
        <h4>Saved game definitions</h4>
        <p className="host__note">
          Saved definitions are authored game files. They are separate from the active event history.
        </p>
        <div className="persistence__actions">
          <button
            type="button"
            className="btn"
            data-testid="persistence-save"
            disabled={!controlsReady || activeDefinition === null}
            onClick={() => void save()}
          >
            Save current definition
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
                        const result = await persistence.deleteSaved(entry.gameId)
                        setActionMessage(result.message)
                      }}
                    >
                      Delete
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
    </section>
  )
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
