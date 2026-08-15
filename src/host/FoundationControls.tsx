import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { absoluteDisplayUrlWithTheme, playGameIdFromSearch } from '../routes/paths'
import { useOptionalTheme } from '../theme/ThemeProvider'
import { loadLibraryRecord } from '../persistence/savedDefinitions'
import { ClassroomSetupPanel, type ClassroomSetupObservation } from './ClassroomSetupPanel'
import { useSessionStore } from './useSessionStore'
import { useHostSync } from './useHostSync'
import { sessionTeamNameFor } from '../state/reducer'
import { PUBLIC_STATUS_CODES } from '../state/status'
import { createSampleGame, createSampleGameWithUnsupportedRound } from '../game/sampleGame'
import { GameImportPanel } from './GameImportPanel'
import { SpreadsheetAuthoringPanel } from './SpreadsheetAuthoringPanel'
import { GameExportPanel } from './GameExportPanel'
import { GamePackImportPanel } from './GamePackImportPanel'
import { GamePackExportPanel } from './GamePackExportPanel'
import { CategoryBoardHostPanel } from './CategoryBoardHostPanel'
import { TeamScoringPanel } from './TeamScoringPanel'
import { SessionSummaryPanel } from './SessionSummaryPanel'
import { ResponseTimerHostPanel } from './ResponseTimerHostPanel'
import { FinalWagerHostPanel } from './FinalWagerHostPanel'
import { LocalInputHostPanel } from './LocalInputHostPanel'
import { GamepadInputHostPanel } from './GamepadInputHostPanel'
import { useResponseTimerExpiry } from './useResponseTimerExpiry'
import { useFinalWagerExpiry } from './useFinalWagerExpiry'
import { systemClock, type Clock } from '../time/clock'
import { useHostPersistence } from './useHostPersistence'
import {
  enqueueActivePackResourceScopePublish,
  hydratePackMediaForDefinition,
} from '../pack/hydratePackMedia'
import { getSharedPackResourceRegistry } from '../pack/resourceRegistry'
import { PersistenceControls } from './PersistenceControls'
import { CompletedSummaryLedgerPanel } from './CompletedSummaryLedgerPanel'
import { usePresentationAudio } from './usePresentationAudio'
import { AudioControls } from './AudioControls'
import { nextHostSessionId } from './ensureSession'
import './FoundationControls.css'

/**
 * Teacher-facing host classroom controls.
 *
 * Ordinary first-run workflow comes first: persistence/recovery, sound, load a
 * game, then gameplay panels when a game is loaded. Developer diagnostics remain
 * available in a secondary Advanced diagnostics section.
 */

export interface FoundationControlsProps {
  /**
   * The host surface's clock (Slice 7). Injectable so tests drive time instead of
   * waiting for it, and so there is ONE place the real clock enters the host —
   * see `src/time/clock.ts`. Every `issuedAt` below and the sync `sentAt` stamp
   * come from here; nothing downstream calls `Date.now()` for itself.
   */
  readonly clock?: Clock
}

export function FoundationControls({ clock = systemClock }: FoundationControlsProps = {}) {
  const [searchParams] = useSearchParams()
  const playGameId = playGameIdFromSearch(searchParams.toString())
  const playLoadedRef = useRef<string | null>(null)
  const [playReplaceNeeded, setPlayReplaceNeeded] = useState(false)
  const [playReplaceArmed, setPlayReplaceArmed] = useState(false)
  const [resetArmed, setResetArmed] = useState(false)
  const [startSessionArmed, setStartSessionArmed] = useState(false)
  const [playReady, setPlayReady] = useState(() => !playGameIdFromSearch(searchParams.toString()))
  const [teamNameBank, setTeamNameBank] = useState<readonly string[]>([])
  const [selectionObservation, setSelectionObservation] = useState<ClassroomSetupObservation | null>(null)
  const [displayOpen, setDisplayOpen] = useState(false)
  const [audioUnderstood, setAudioUnderstood] = useState(false)
  const [sonyReady, setSonyReady] = useState(false)
  const displayWindowRef = useRef<Window | null>(null)
  const theme = useOptionalTheme()
  const persistence = useHostPersistence({ clock })
  const {
    store,
    state,
    history,
    dispatch: storeDispatch,
  } = useSessionStore({
    initialHistory: persistence.initialHistory,
    storeEpoch: persistence.storeEpoch,
  })
  useHostSync(store, clock)
  const presentationAudio = usePresentationAudio(store)

  const now = () => clock.now()
  const hasSession = state.session !== null
  const registry = store.getRegistry()
  const game = state.session?.game ?? null
  const hasGame = game !== null
  const dispatch = (command: Parameters<typeof storeDispatch>[0]) =>
    persistence.dispatchSessionCommand(command, storeDispatch, () => store.getHistory(), registry)

  // The ONE scheduled clock read in the application. It turns a deadline into a
  // COMMAND; it never mutates state, and a stale callback is rejected by the
  // planner rather than being defended against here (Slice 7).
  useResponseTimerExpiry({ game, dispatch, clock })
  // The Final round's own scheduled clock read (Slice 14). Same discipline: it
  // turns a deadline into a COMMAND and decides nothing.
  useFinalWagerExpiry({ game, dispatch, clock })

  const packHydrationGenerationRef = useRef(0)
  const setPackGcContext = persistence.setPackGcContext
  const persistenceAdapter = persistence.adapter
  const persistenceStoreEpoch = persistence.storeEpoch

  useEffect(() => {
    setPackGcContext?.(game?.definition ?? null, registry)
  }, [game?.definition, registry, setPackGcContext])

  useEffect(() => {
    const generation = packHydrationGenerationRef.current + 1
    packHydrationGenerationRef.current = generation
    const isCurrent = (): boolean => packHydrationGenerationRef.current === generation
    const definition = game?.definition ?? null
    if (definition === null) {
      getSharedPackResourceRegistry().clear()
      if (isCurrent()) {
        enqueueActivePackResourceScopePublish(persistenceAdapter, null)
      }
      return
    }
    void hydratePackMediaForDefinition(
      persistenceAdapter,
      definition,
      getSharedPackResourceRegistry(),
      registry,
      { isCurrent },
    )
  }, [game?.definition, persistenceAdapter, registry, persistenceStoreEpoch])

  const loadPlayRef = useRef<() => void>(() => {})
  loadPlayRef.current = () => {
    if (!playGameId) return
    if (persistence.bootPhase !== 'ready') return
    if (!persistence.canDispatchSessionCommands) return
    if (playLoadedRef.current === playGameId) return
    if (game?.definition.id === playGameId) {
      playLoadedRef.current = playGameId
      setPlayReplaceNeeded(false)
      return
    }
    void persistence
      .loadSaved({
        gameId: playGameId,
        activeGame: game,
        dispatch,
        getHistory: () => store.getHistory(),
        registry,
        confirmedReplace: playReplaceArmed,
      })
      .then((result) => {
        if (result.ok) {
          playLoadedRef.current = playGameId
          setPlayReplaceNeeded(false)
          setPlayReplaceArmed(false)
          return
        }
        if ('needsConfirmation' in result && result.needsConfirmation) {
          setPlayReplaceNeeded(true)
        }
      })
  }

  useEffect(() => {
    const gameId = game?.definition.id
    if (!gameId || !persistence.adapter) {
      setTeamNameBank([])
      return
    }
    void loadLibraryRecord(persistence.adapter, gameId).then((loaded) => {
      if (!loaded.ok) return
      setTeamNameBank(loaded.value.draft?.game.teamNameBank ?? [])
    })
  }, [game?.definition.id, persistence.adapter])

  useEffect(() => {
    const timer = window.setInterval(() => {
      const handle = displayWindowRef.current
      setDisplayOpen(Boolean(handle && !handle.closed))
    }, 1000)
    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    loadPlayRef.current()
  }, [
    playGameId,
    persistence.bootPhase,
    persistence.canDispatchSessionCommands,
    game?.definition.id,
    playReplaceArmed,
  ])

  return (
    <section className="foundation" aria-labelledby="classroom-controls-title">
      <h2 id="classroom-controls-title">Classroom controls</h2>
      <p className="host__note foundation__intro">
        Load a game, set up teams and optional buzzers, then open the audience display for the
        projector. This is the working classroom quiz-show host — not a placeholder shell.
      </p>

      <PersistenceControls
        persistence={persistence}
        activeGame={game}
        activeDefinition={game?.definition ?? null}
        registry={registry}
        dispatch={dispatch}
        getHistory={() => store.getHistory()}
      />

      <AudioControls audio={presentationAudio} />

      {game && state.session && game.definition.teams.length > 0 && (
        <ClassroomSetupPanel
          key={state.session.sessionId}
          teams={game.definition.teams}
          teamNameBank={teamNameBank}
          initialSessionNames={game.sessionTeamNames}
          leadership={persistence.leadership}
          observation={selectionObservation}
          sonyReady={sonyReady}
          displayOpen={displayOpen}
          onOpenDisplay={() => {
            const opened = window.open(
              absoluteDisplayUrlWithTheme(theme?.themeId),
              'quiz-show-display',
            )
            displayWindowRef.current = opened
            setDisplayOpen(Boolean(opened && !opened.closed))
          }}
          audioUnderstood={audioUnderstood || presentationAudio.status.activation === 'ready'}
          audioMuted={presentationAudio.status.muted}
          onAudioTest={() => {
            setAudioUnderstood(true)
            void presentationAudio.enableSound().then(() => {
              presentationAudio.controller.playCue('active-claim')
            })
          }}
          onPanicMute={() => {
            presentationAudio.setMuted(true)
            setAudioUnderstood(true)
          }}
          playReady={playReady}
          onPlay={() => setPlayReady((current) => !current)}
          onSelectedIdentitiesChange={(claimed) => {
            const issuedAt = now()
            for (const team of game.definition.teams) {
              const next = claimed[team.id] ?? null
              const current = sessionTeamNameFor(game, team.id)
              if (next === current) continue
              dispatch({
                type: 'SET_SESSION_TEAM_NAME',
                issuedAt,
                teamId: team.id,
                name: next,
              })
            }
          }}
        />
      )}

      <fieldset
        className="foundation__session-controls"
        disabled={!persistence.canDispatchSessionCommands}
        aria-label="Session command controls"
      >
        <legend className="foundation__session-legend">Session command controls</legend>

        <section className="foundation__teacher-setup" aria-labelledby="load-game-title">
          <h3 id="load-game-title">Load a game</h3>
          <p className="host__note">
            Choose a supported content path below. If no session exists yet, loading starts one
            automatically. Use <strong>Start new game session</strong> when you want an explicit
            fresh session first. Starting a new session while one is already open replaces that
            class run only. It does not delete the saved game.
          </p>
          <div className="foundation__actions" role="group" aria-label="Start game session">
            <button
              type="button"
              className="btn"
              data-testid="start-new-game-session"
              onClick={() => {
                if (hasSession && !startSessionArmed) {
                  setStartSessionArmed(true)
                  return
                }
                setStartSessionArmed(false)
                dispatch({
                  type: 'INIT_SESSION',
                  issuedAt: now(),
                  sessionId: nextHostSessionId(),
                })
              }}
            >
              {hasSession && startSessionArmed
                ? 'Confirm start new class session'
                : 'Start new game session'}
            </button>
            <button
              type="button"
              className="btn btn--secondary"
              data-testid="reset-class-session"
              disabled={!hasSession}
              onClick={() => {
                if (!resetArmed) {
                  setResetArmed(true)
                  return
                }
                setResetArmed(false)
                const definition = game?.definition ?? null
                const reset = dispatch({
                  type: 'INIT_SESSION',
                  issuedAt: now(),
                  sessionId: nextHostSessionId(),
                })
                if (reset.status === 'accepted' && definition) {
                  dispatch({
                    type: 'INITIALIZE_GAME',
                    issuedAt: now(),
                    definition,
                  })
                }
              }}
            >
              {resetArmed ? 'Confirm reset this class session' : 'Reset this class session'}
            </button>
          </div>
          <p className="host__note">
            Reset this class session clears scores, progress, buzzes, and wagers for this class
            only. It does not delete the saved game.
          </p>
          {persistence.bootPhase === 'recovery' && playGameId && (
            <p className="host__note" data-testid="play-after-recovery">
              Resume or discard the unfinished class session first. Then CQS can load the game you
              chose to play.
            </p>
          )}
          {playReplaceNeeded && (
            <p className="host__note" role="alert" data-testid="play-replace-confirm">
              Loading this game would replace the current class session.
              <button
                type="button"
                className="btn"
                onClick={() => setPlayReplaceArmed(true)}
              >
                Load this game and replace the current session
              </button>
            </p>
          )}

          <GameImportPanel
            dispatch={dispatch}
            registry={registry}
            hasSession={hasSession}
            activeGame={game}
          />

          <SpreadsheetAuthoringPanel
            dispatch={dispatch}
            registry={registry}
            hasSession={hasSession}
            activeGame={game}
          />

          <GamePackImportPanel
            dispatch={dispatch}
            registry={registry}
            hasSession={hasSession}
            activeGame={game}
            adapter={persistence.adapter}
          />

          <div className="foundation__panel" aria-label="Loaded game">
            <h3>Loaded game</h3>
            {!hasGame ? (
              <p className="host__note">No game loaded yet.</p>
            ) : (
              <dl className="foundation__kv">
                <dt>game title</dt>
                <dd data-testid="game-title">{game.definition.title}</dd>
                <dt>lifecycle</dt>
                <dd data-testid="game-lifecycle">{game.gameLifecycle}</dd>
                <dt>current round index</dt>
                <dd data-testid="game-current-index">
                  {game.currentRoundIndex === null ? '—' : game.currentRoundIndex}
                </dd>
                <dt>current round support</dt>
                <dd data-testid="game-current-support">{game.currentRoundSupport ?? '—'}</dd>
                <dt>round count</dt>
                <dd>{game.definition.rounds.length}</dd>
              </dl>
            )}
          </div>
        </section>

        {/*
          Gameplay surfaces render only when a game is loaded. They stay above
          advanced diagnostics so teachers reach board/teams/controllers first.
        */}
        {game && playReady && <CategoryBoardHostPanel dispatch={dispatch} game={game} clock={clock} />}
        {game && playReady && <ResponseTimerHostPanel dispatch={dispatch} game={game} clock={clock} />}
        {game && playReady && (
          <FinalWagerHostPanel
            dispatch={dispatch}
            game={game}
            clock={clock}
            eventHistoryLength={history.length}
            activeSessionDurability={{
              durableEventCount: persistence.durableEventCount,
              pendingEventCount: persistence.pendingEventCount,
              failed: persistence.activeSessionPersistFailed,
              storageAvailable: persistence.durabilityStatus !== 'unavailable',
            }}
            onRetryActiveSessionPersist={() => {
              void persistence.retryActiveSessionPersist(() => store.getHistory(), registry)
            }}
          />
        )}
        {game && playReady && <LocalInputHostPanel dispatch={dispatch} game={game} clock={clock} />}
        {game && (
          <GamepadInputHostPanel
            dispatch={dispatch}
            game={game}
            clock={clock}
            selectionMode={!playReady}
            onSelectionObservation={setSelectionObservation}
            onSonyReadyChange={setSonyReady}
          />
        )}
        {game && playReady && (
          <TeamScoringPanel dispatch={dispatch} game={game} history={history} clock={clock} />
        )}
        {game && playReady && (
          <SessionSummaryPanel
            game={game}
            history={history}
            saveStatus={
              persistence.currentCompletionSave?.sessionId === state.session?.sessionId
                ? (persistence.currentCompletionSave?.status ?? 'idle')
                : 'idle'
            }
            saveMessage={
              persistence.currentCompletionSave?.sessionId === state.session?.sessionId
                ? persistence.ledgerMessage
                : undefined
            }
            onRetrySave={() => void persistence.retryCurrentCompletionSave()}
            onDeleteSavedCopy={
              persistence.currentCompletionSave?.status === 'saved' &&
              persistence.currentCompletionSave.recordId
                ? () => {
                    const recordId = persistence.currentCompletionSave?.recordId
                    if (recordId) void persistence.deleteCompletedRecord(recordId)
                  }
                : undefined
            }
          />
        )}

        <CompletedSummaryLedgerPanel persistence={persistence} />

        <section className="foundation__diagnostics" aria-labelledby="advanced-diagnostics-title">
          <h3 id="advanced-diagnostics-title">Advanced diagnostics</h3>
          <p className="host__note foundation__intro">
            Optional troubleshooting controls. They are not required for ordinary classroom setup.
          </p>

          <div className="foundation__actions" role="group" aria-label="Foundation commands">
            <button
              type="button"
              className="btn btn--secondary"
              onClick={() =>
                dispatch({
                  type: 'INIT_SESSION',
                  issuedAt: now(),
                  sessionId: nextHostSessionId(),
                })
              }
            >
              Initialize / reset session
            </button>
            <button
              type="button"
              className="btn btn--secondary"
              disabled={!hasSession}
              onClick={() => dispatch({ type: 'ADVANCE_SEQUENCE', issuedAt: now() })}
            >
              Advance sequence
            </button>
            <button
              type="button"
              className="btn btn--secondary"
              disabled={!hasSession}
              onClick={() => dispatch({ type: 'MARK_WAITING', issuedAt: now() })}
            >
              Mark waiting
            </button>
            <button
              type="button"
              className="btn btn--secondary"
              disabled={!hasSession}
              onClick={() =>
                dispatch({
                  type: 'SET_HOST_NOTE',
                  issuedAt: now(),
                  note: 'private host memo (never projected)',
                })
              }
            >
              Set private note
            </button>
            <button
              type="button"
              className="btn btn--secondary"
              onClick={() => dispatch({ type: 'UNDO', issuedAt: now() })}
            >
              Undo last reversible
            </button>
          </div>

          <fieldset className="foundation__status" disabled={!hasSession}>
            <legend>Public status</legend>
            {PUBLIC_STATUS_CODES.map((code) => (
              <button
                key={code}
                type="button"
                className="btn btn--secondary foundation__status-btn"
                onClick={() => dispatch({ type: 'SET_PUBLIC_STATUS', issuedAt: now(), code })}
              >
                {code}
              </button>
            ))}
          </fieldset>

          <div className="foundation__grid">
            <div className="foundation__panel" aria-label="Private authoritative state">
              <h3>Private state (host-only)</h3>
              <dl className="foundation__kv">
                <dt>revision</dt>
                <dd data-testid="private-revision">{state.revision}</dd>
                <dt>session</dt>
                <dd data-testid="private-session">
                  {state.session ? state.session.sessionId : '—'}
                </dd>
                <dt>lifecycle</dt>
                <dd>{state.session ? state.session.lifecycle : '—'}</dd>
                <dt>counter</dt>
                <dd data-testid="private-counter">
                  {state.session ? state.session.counter : '—'}
                </dd>
                <dt>status code</dt>
                <dd>{state.session ? state.session.publicStatusCode : '—'}</dd>
                <dt>host notes</dt>
                <dd>
                  {state.session && state.session.hostNotes ? state.session.hostNotes : '—'}
                </dd>
                <dt>applied events</dt>
                <dd>{state.diagnostics.appliedEventCount}</dd>
              </dl>
            </div>

            <div className="foundation__panel" aria-label="Append-only event history">
              <h3>Event history (append-only)</h3>
              {history.length === 0 ? (
                <p className="host__note">No events yet.</p>
              ) : (
                <ol className="foundation__history" data-testid="event-history">
                  {history.map((event) => (
                    <li key={event.id} className="foundation__event">
                      <span className="foundation__event-seq">#{event.seq}</span>
                      <span className="foundation__event-type">{event.type}</span>
                      <span className="foundation__event-flag">
                        {event.reversible ? 'reversible' : 'irreversible'}
                      </span>
                    </li>
                  ))}
                </ol>
              )}
            </div>
          </div>

          <p className="host__note foundation__intro">
            These two samples are <strong>trusted in-memory fixtures</strong> built by the
            application through the domain constructor — they are not an import path. Untrusted
            content goes through the import pipeline above.
          </p>

          <div className="foundation__actions" role="group" aria-label="Game foundation commands">
            <button
              type="button"
              className="btn btn--secondary"
              disabled={!hasSession}
              onClick={() =>
                dispatch({ type: 'INITIALIZE_GAME', issuedAt: now(), definition: createSampleGame() })
              }
            >
              Initialize sample game
            </button>
            <button
              type="button"
              className="btn btn--secondary"
              disabled={!hasSession}
              onClick={() =>
                dispatch({
                  type: 'INITIALIZE_GAME',
                  issuedAt: now(),
                  definition: createSampleGameWithUnsupportedRound(),
                })
              }
            >
              Initialize sample with unsupported round
            </button>
            <button
              type="button"
              className="btn btn--secondary"
              disabled={!hasGame}
              onClick={() => dispatch({ type: 'ADVANCE_TO_NEXT_ROUND', issuedAt: now() })}
            >
              Advance to next round
            </button>
            <button
              type="button"
              className="btn btn--secondary"
              disabled={!hasGame}
              onClick={() => dispatch({ type: 'END_GAME_SESSION', issuedAt: now() })}
            >
              End game session
            </button>
          </div>

          <div className="foundation__panel" aria-label="Game session (host-only)">
            <h3>Game session (host-only diagnostics)</h3>
            {!hasGame ? (
              <p className="host__note">No game loaded. Load a game above, or initialize a sample.</p>
            ) : (
              <ol className="foundation__history" data-testid="game-rounds">
                {game.definition.rounds.map((round, index) => {
                  const known = registry.isKnown(round.type)
                  return (
                    <li key={round.id} className="foundation__event">
                      <span className="foundation__event-seq">#{index}</span>
                      <span className="foundation__event-type">{round.type}</span>
                      <span className="foundation__event-flag">
                        {known ? 'supported' : 'UNSUPPORTED'}
                      </span>
                      <button
                        type="button"
                        className="btn btn--secondary foundation__status-btn"
                        onClick={() =>
                          dispatch({ type: 'SELECT_ROUND', issuedAt: now(), roundId: round.id })
                        }
                      >
                        Select
                      </button>
                    </li>
                  )
                })}
              </ol>
            )}
          </div>
        </section>
      </fieldset>

      <GameExportPanel definition={game?.definition ?? null} registry={registry} />

      <GamePackExportPanel definition={game?.definition ?? null} registry={registry} />
    </section>
  )
}
