import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import {
  absoluteDisplayUrlWithTheme,
  editPath,
  playGameIdFromSearch,
  ROUTES,
} from '../routes/paths'
import { teamSetSignature } from '../input/sonyBuzzSupportedProfile'
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
import type { SonyBuzzTeacherSummary } from '../input/sonyBuzzTeacherReadiness'
import { useResponseTimerExpiry } from './useResponseTimerExpiry'
import { useFinalWagerExpiry } from './useFinalWagerExpiry'
import { systemClock, type Clock } from '../time/clock'
import { useHostPersistence, type UseHostPersistenceOptions } from './useHostPersistence'
import { shouldResumeRecoveryFromNavigation } from './hostResumeNavigation'
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
import { DiagnosticReportPanel } from './DiagnosticReportPanel'
import type { HostInputDiagnosticSignals } from './diagnostics/types'
import {
  canStartPlayFromGame,
  deriveHostPlayPosture,
} from '../session/hostPlayPosture'
import { soundFactLabel } from '../session/classroomReadiness'
import { THEME_META, type ThemeId } from '../theme/themeRegistry'
import { ownsSameGameRosterRefresh } from './sameGameRosterRefresh'
import { hostResumeWelcomeCopy } from './hostResumeWelcome'
import './FoundationControls.css'

/**
 * Teacher-facing host classroom controls.
 *
 * MENUS Slice A: ordinary Start Game enters a focused Host posture. Kitchen-sink
 * power paths stay mounted under More / Advanced. Lifecycle owners never unmount
 * across postures.
 */

export interface FoundationControlsProps {
  /**
   * The host surface's clock (Slice 7). Injectable so tests drive time instead of
   * waiting for it, and so there is ONE place the real clock enters the host —
   * see `src/time/clock.ts`. Every `issuedAt` below and the sync `sentAt` stamp
   * come from here; nothing downstream calls `Date.now()` for itself.
   */
  readonly clock?: Clock
  /** Test injection for the same persistence adapter/options Home uses. */
  readonly persistenceOptions?: UseHostPersistenceOptions
}

export function FoundationControls({
  clock = systemClock,
  persistenceOptions,
}: FoundationControlsProps = {}) {
  const [searchParams] = useSearchParams()
  const location = useLocation()
  const navigate = useNavigate()
  const playGameId = playGameIdFromSearch(searchParams.toString())
  const playLoadedRef = useRef<string | null>(null)
  /** Latest-attempt counter for same-Game library roster refresh (Strict Mode safe). */
  const rosterRefreshAttemptRef = useRef(0)
  const playGameIdRef = useRef(playGameId)
  playGameIdRef.current = playGameId
  const storeEpochRef = useRef(0)
  const playReplaceArmedRef = useRef(false)
  const homeResumeHandledRef = useRef(false)
  /** Epoch-tagged Home Resume Welcome-back latch (React-local; not durable). */
  const [homeResumeWelcomePendingEpoch, setHomeResumeWelcomePendingEpoch] = useState<
    number | null
  >(null)
  const [homeResumeWelcomeVisible, setHomeResumeWelcomeVisible] = useState(false)
  const [playReplaceNeeded, setPlayReplaceNeeded] = useState(false)
  const [playReplaceArmed, setPlayReplaceArmed] = useState(false)
  const [resetArmed, setResetArmed] = useState(false)
  const [startSessionArmed, setStartSessionArmed] = useState(false)
  // Ordinary ?play= preparation keeps More closed. Bare #/host may start open
  // so harness / power controls stay reachable without a prior Start.
  const [moreOpen, setMoreOpen] = useState(
    () => !playGameIdFromSearch(searchParams.toString()),
  )
  const [playReady, setPlayReady] = useState(() => !playGameIdFromSearch(searchParams.toString()))
  const [teamNameBank, setTeamNameBank] = useState<readonly string[]>([])
  const [selectionObservationBatch, setSelectionObservationBatch] = useState<
    readonly ClassroomSetupObservation[] | null
  >(null)
  const [displayOpen, setDisplayOpen] = useState(false)
  const [audioUnderstood, setAudioUnderstood] = useState(false)
  const [sonyReady, setSonyReady] = useState(false)
  const [sonyTeacherSummary, setSonyTeacherSummary] = useState<SonyBuzzTeacherSummary | null>(
    null,
  )
  /** Supported Namtai Wbuzz Gamepad detected — lifted from GamepadInputHostPanel only. */
  const [wbuzzPresent, setWbuzzPresent] = useState(false)
  const [inputDiagnosticSignals, setInputDiagnosticSignals] =
    useState<HostInputDiagnosticSignals | null>(null)
  const displayWindowRef = useRef<Window | null>(null)
  const theme = useOptionalTheme()
  const persistence = useHostPersistence({
    clock,
    ...persistenceOptions,
  })
  const {
    store,
    state,
    history,
    dispatch: storeDispatch,
  } = useSessionStore({
    initialHistory: persistence.initialHistory,
    storeEpoch: persistence.storeEpoch,
  })
  useHostSync(store, clock, { canPublish: persistence.canPublishPublicState })
  const presentationAudio = usePresentationAudio(store)

  const now = () => clock.now()
  const hasSession = state.session !== null
  const registry = store.getRegistry()
  const game = state.session?.game ?? null
  const hasGame = game !== null
  const dispatch = (command: Parameters<typeof storeDispatch>[0]) =>
    persistence.dispatchSessionCommand(command, storeDispatch, () => store.getHistory(), registry)

  // Hydrate play posture once per store epoch from effective history (Slice A).
  // Live Start / Back remain the only runtime setters. Empty history keeps the
  // URL-seeded default (bare `#/host` → play; `?play=` → setup).
  // Read the live store — React history/game state can lag one tick behind a
  // storeEpoch remount after Resume.
  // Welcome-back reveals only after this hydrate for a Home-Resume-armed epoch.
  const postureHydratedEpochRef = useRef<number | null>(null)
  useEffect(() => {
    if (persistence.bootPhase !== 'ready') return
    if (postureHydratedEpochRef.current === persistence.storeEpoch) {
      // Pending latch may arrive after hydrate already marked this epoch
      // (resume arm + epoch bump race). Promote if still armed for this epoch.
      if (
        homeResumeWelcomePendingEpoch !== null &&
        homeResumeWelcomePendingEpoch === persistence.storeEpoch
      ) {
        setHomeResumeWelcomeVisible(true)
        setHomeResumeWelcomePendingEpoch(null)
      }
      return
    }
    const liveHistory = store.getHistory()
    const liveGame = store.getState().session?.game ?? null
    postureHydratedEpochRef.current = persistence.storeEpoch
    if (liveHistory.length > 0) {
      setPlayReady(
        deriveHostPlayPosture({
          history: liveHistory,
          canStartPlay: canStartPlayFromGame(liveGame),
        }),
      )
    }
    if (
      homeResumeWelcomePendingEpoch !== null &&
      homeResumeWelcomePendingEpoch === persistence.storeEpoch
    ) {
      setHomeResumeWelcomeVisible(true)
      setHomeResumeWelcomePendingEpoch(null)
    }
  }, [
    persistence.bootPhase,
    persistence.storeEpoch,
    history,
    game,
    store,
    homeResumeWelcomePendingEpoch,
  ])

  // Home Resume carries a one-shot navigation intent. Apply the same Host resume
  // path once recovery is readable, then clear the intent so refresh re-prompts.
  // Arm Welcome-back only on the success path (not stale-intent clear-only).
  useEffect(() => {
    const wantsResume = shouldResumeRecoveryFromNavigation(location.state)
    if (!wantsResume) {
      homeResumeHandledRef.current = false
      return
    }
    if (homeResumeHandledRef.current) return
    if (persistence.bootPhase === 'loading') return
    if (persistence.bootPhase === 'recovery' && persistence.recovery) {
      homeResumeHandledRef.current = true
      // resume() bumps storeEpoch by 1; latch that next epoch for hydrate reveal.
      setHomeResumeWelcomePendingEpoch(persistence.storeEpoch + 1)
      persistence.resume()
      navigate('.', { replace: true, state: null })
      return
    }
    // Stale intent (already discarded / no recovery): clear without claiming success.
    homeResumeHandledRef.current = true
    navigate('.', { replace: true, state: null })
  }, [
    location.state,
    navigate,
    persistence,
    persistence.bootPhase,
    persistence.recovery,
    persistence.resume,
    persistence.storeEpoch,
  ])

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

  storeEpochRef.current = persistence.storeEpoch
  playReplaceArmedRef.current = playReplaceArmed

  const loadPlayRef = useRef<() => void>(() => {})
  loadPlayRef.current = () => {
    if (!playGameId) {
      rosterRefreshAttemptRef.current += 1
      return
    }
    if (persistence.bootPhase !== 'ready') return
    if (!persistence.canDispatchSessionCommands) return
    if (playLoadedRef.current === playGameId) return
    // Read the live store — React `history`/`game` state can lag one tick behind
    // a storeEpoch remount after Resume (useState stays stale until subscribe sync).
    const liveGame = store.getState().session?.game ?? null
    const liveHistory = store.getHistory()
    if (liveGame?.definition.id === playGameId) {
      // Same Game id can still need a library refresh after authoring team-count
      // change (Edit → Save → Play). Compare team signatures; refresh only when
      // the saved definition roster drifted — not an indiscriminate session reset.
      // Never silently replace: reuse existing loadSaved confirmation substrate.
      const adapter = persistence.adapter
      if (!adapter) {
        playLoadedRef.current = playGameId
        setPlayReplaceNeeded(false)
        return
      }
      const requestPlayGameId = playGameId
      const requestStoreEpoch = persistence.storeEpoch
      const requestLiveTeamSig = teamSetSignature(liveGame.definition.teams)
      const attempt = ++rosterRefreshAttemptRef.current
      void loadLibraryRecord(adapter, requestPlayGameId).then((loaded) => {
        const liveNow = store.getState().session?.game ?? null
        const currentLiveTeamSig = liveNow
          ? teamSetSignature(liveNow.definition.teams)
          : ''
        if (
          !ownsSameGameRosterRefresh({
            attempt,
            latestAttempt: rosterRefreshAttemptRef.current,
            requestPlayGameId,
            currentPlayGameId: playGameIdRef.current,
            requestStoreEpoch,
            currentStoreEpoch: storeEpochRef.current,
            requestLiveTeamSig,
            currentLiveTeamSig,
          })
        ) {
          return
        }
        if (playLoadedRef.current === requestPlayGameId) return
        if (!loaded.ok) {
          playLoadedRef.current = requestPlayGameId
          setPlayReplaceNeeded(false)
          return
        }
        const librarySig = teamSetSignature(loaded.value.definition.teams)
        if (librarySig === requestLiveTeamSig) {
          playLoadedRef.current = requestPlayGameId
          setPlayReplaceNeeded(false)
          return
        }
        // Roster drifted — ask the teacher before INITIALIZE_GAME can replace.
        void persistence
          .loadSaved({
            gameId: requestPlayGameId,
            activeGame: liveNow,
            dispatch,
            getHistory: () => store.getHistory(),
            registry,
            confirmedReplace: playReplaceArmedRef.current,
          })
          .then((result) => {
            if (attempt !== rosterRefreshAttemptRef.current) return
            if (playGameIdRef.current !== requestPlayGameId) return
            if (result.ok) {
              playLoadedRef.current = requestPlayGameId
              setPlayReplaceNeeded(false)
              setPlayReplaceArmed(false)
              return
            }
            if ('needsConfirmation' in result && result.needsConfirmation) {
              setPlayReplaceNeeded(true)
            }
          })
      })
      return
    }
    // Different-Game / fresh load — invalidate any pending same-Game refresh.
    rosterRefreshAttemptRef.current += 1
    // Recovered non-empty history still applying: never loadSaved over it.
    if (liveGame === null && liveHistory.length > 0) return
    void persistence
      .loadSaved({
        gameId: playGameId,
        activeGame: liveGame,
        dispatch,
        getHistory: () => store.getHistory(),
        registry,
        confirmedReplace: playReplaceArmedRef.current,
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
    persistence.storeEpoch,
  ])

  useEffect(() => {
    // Do not reopen kitchen-sink More on ordinary ?play= load/unload. Bare
    // #/host without a game may keep More open for harness reachability.
    if (!hasGame && playGameId === null) setMoreOpen(true)
  }, [hasGame, playGameId])

  const openDisplayTracked = () => {
    const opened = window.open(
      absoluteDisplayUrlWithTheme(theme?.themeId),
      'quiz-show-display',
    )
    displayWindowRef.current = opened
    setDisplayOpen(Boolean(opened && !opened.closed))
  }
  const roundLabel =
    game && game.currentRoundIndex !== null
      ? `Round ${(game.currentRoundIndex ?? 0) + 1} of ${game.definition.rounds.length}`
      : null
  const identityTitle = game?.definition.title ?? 'Host'
  const namesComplete = game
    ? game.definition.teams.every((team) => sessionTeamNameFor(game, team.id) !== null)
    : false
  const welcomeBackCopy = homeResumeWelcomeVisible
    ? hostResumeWelcomeCopy({
        gameTitle: game?.definition.title ?? null,
        playReady,
        roundLabel,
        namesComplete,
      })
    : null
  const dismissWelcomeBack = () => setHomeResumeWelcomeVisible(false)
  const playStatusParts: string[] = []
  if (playReady && game) {
    playStatusParts.push(namesComplete ? 'Names ready' : 'Names incomplete')
    playStatusParts.push(displayOpen ? 'Display open' : 'Display not open')
    playStatusParts.push(
      sonyReady ? 'Buzzers ready' : 'Buzzers optional · keyboard works',
    )
    playStatusParts.push(
      soundFactLabel({
        audioUnderstood: audioUnderstood || presentationAudio.status.activation === 'ready',
        audioMuted: presentationAudio.status.muted,
      }),
    )
  }

  return (
    <section
      className={`foundation${playReady ? ' foundation--play' : ' foundation--setup'}`}
      aria-labelledby="host-foundation-title"
      data-testid="host-foundation"
      data-posture={playReady ? 'play' : 'setup'}
    >
      <h2 id="host-foundation-title" className="visually-hidden">
        Host foundation
      </h2>

      <PersistenceControls
        variant="recovery"
        persistence={persistence}
        activeGame={game}
        activeDefinition={game?.definition ?? null}
        registry={registry}
        dispatch={dispatch}
        getHistory={() => store.getHistory()}
      />

      {playReplaceNeeded && (
        <p className="host__note" role="alert" data-testid="play-replace-confirm">
          Loading this game would replace the current class session.
          <button type="button" className="btn" onClick={() => setPlayReplaceArmed(true)}>
            Load this game and replace the current session
          </button>
        </p>
      )}

      {persistence.bootPhase === 'recovery' && playGameId && (
        <p className="host__note" data-testid="play-after-recovery">
          Resume or discard the unfinished class session first. Then CQS can load the game you
          chose to play.
        </p>
      )}

      <header className="foundation__chrome" data-testid="host-chrome">
        <div className="foundation__identity" data-testid="host-identity">
          <p className="foundation__identity-title">{identityTitle}</p>
          {playReady && roundLabel && (
            <p className="foundation__identity-round">{roundLabel}</p>
          )}
          {welcomeBackCopy && (
            <p
              className="foundation__welcome-back"
              data-testid="host-welcome-back"
              role="status"
            >
              {welcomeBackCopy}
              <button
                type="button"
                className="btn btn--secondary foundation__welcome-dismiss"
                data-testid="host-welcome-dismiss"
                onClick={dismissWelcomeBack}
              >
                Got it
              </button>
            </p>
          )}
        </div>
        <div className="foundation__chrome-actions" role="group" aria-label="Host controls">
          <button
            type="button"
            className="btn btn--secondary"
            data-testid="host-chrome-mute"
            onClick={() => {
              presentationAudio.setMuted(true)
              setAudioUnderstood(true)
            }}
          >
            {presentationAudio.status.muted ? 'Sound is muted' : 'Mute all sounds'}
          </button>
          <button
            type="button"
            className="btn btn--secondary"
            data-testid="host-chrome-display"
            onClick={openDisplayTracked}
          >
            {displayOpen ? 'Focus display' : 'Open display'}
          </button>
          {!playReady && (
            <Link
              className="btn btn--secondary"
              to={ROUTES.root}
              data-testid="host-change-game"
            >
              Change game
            </Link>
          )}
          {playReady && (
            <button
              type="button"
              className="btn btn--secondary"
              data-testid="setup-play"
              onClick={() => {
                dismissWelcomeBack()
                setPlayReady(false)
                window.scrollTo(0, 0)
              }}
            >
              Back to setup
            </button>
          )}
        </div>
      </header>

      {playReady && (
        <p className="host__note foundation__play-status" data-testid="host-play-status" role="status">
          {playStatusParts.join(' · ')}
        </p>
      )}

      {!playReady && game && state.session && (
        <ClassroomSetupPanel
          key={state.session.sessionId}
          teams={game.definition.teams}
          teamNameBank={teamNameBank}
          initialSessionNames={game.sessionTeamNames}
          leadership={persistence.leadership}
          observation={null}
          observationBatch={selectionObservationBatch}
          sonyReady={sonyReady}
          sonyTeacherSummary={sonyTeacherSummary}
          wbuzzPresent={wbuzzPresent}
          displayOpen={displayOpen}
          onOpenDisplay={openDisplayTracked}
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
          playReady={false}
          onPlay={() => {
            dismissWelcomeBack()
            setPlayReady(true)
            setMoreOpen(false)
            // H-REPAIR-1: Start must land on the focused Host first viewport.
            // Class Setup scroll position must not leave chrome above the fold.
            window.scrollTo(0, 0)
          }}
          onEditGame={() => {
            navigate(editPath(game.definition.id))
          }}
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
        <legend className="visually-hidden">Session command controls</legend>

        {game && playReady && (
          <div className="foundation__gameplay" data-testid="host-gameplay">
            <CategoryBoardHostPanel dispatch={dispatch} game={game} clock={clock} />
            <ResponseTimerHostPanel dispatch={dispatch} game={game} clock={clock} />
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
            <LocalInputHostPanel dispatch={dispatch} game={game} clock={clock} />
            <TeamScoringPanel dispatch={dispatch} game={game} history={history} clock={clock} />
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
          </div>
        )}
      </fieldset>

      {/*
        H-REPAIR-1: Gamepad poll owner stays mounted across Start/Back and always
        sits AFTER the session fieldset so sibling index is posture-stable (no remount).
        Controllers must not precede first-viewport gameplay after Start.
      */}
      {game && (
        <GamepadInputHostPanel
          dispatch={dispatch}
          game={game}
          clock={clock}
          selectionMode={!playReady}
          onSelectionBatch={setSelectionObservationBatch}
          onSonyReadyChange={setSonyReady}
          onSonyTeacherSummaryChange={setSonyTeacherSummary}
          onWbuzzPresentChange={setWbuzzPresent}
          onInputDiagnosticSignals={setInputDiagnosticSignals}
        />
      )}

        <details
          className="foundation__more"
          data-testid="host-more"
          open={moreOpen}
          onToggle={(event) => setMoreOpen(event.currentTarget.open)}
        >
          <summary className="foundation__more-summary">More</summary>

          {theme && (
            <fieldset className="host__theme foundation__more-theme">
              <legend className="host__theme-legend">Theme</legend>
              <p className="host__theme-description" id="host-theme-description">
                Applies to this host and displays opened from it.
              </p>
              <div
                className="host__theme-options"
                role="presentation"
                aria-describedby="host-theme-description"
              >
                {THEME_META.map((meta) => (
                  <label key={meta.id} className="host__theme-option">
                    <input
                      type="radio"
                      name="host-theme"
                      value={meta.id}
                      checked={theme.themeId === meta.id}
                      onChange={() => theme.setThemeId(meta.id as ThemeId)}
                    />
                    <span className="host__theme-option-label">{meta.label}</span>
                  </label>
                ))}
              </div>
            </fieldset>
          )}

          <AudioControls audio={presentationAudio} />

          <PersistenceControls
            variant="library"
            persistence={persistence}
            activeGame={game}
            activeDefinition={game?.definition ?? null}
            registry={registry}
            dispatch={dispatch}
            getHistory={() => store.getHistory()}
          />

          <section className="foundation__teacher-setup" aria-labelledby="load-game-title">
            <h3 id="load-game-title">Load a game</h3>
            <p className="host__note">
              Power paths for file, spreadsheet, and pack import. Ordinary teachers start from
              Home Play. Starting a new session while one is already open replaces that class run
              only. It does not delete the saved game.
            </p>
            <div className="foundation__actions" role="group" aria-label="Start game session">
              <button
                type="button"
                className="btn"
                data-testid="start-new-game-session"
                disabled={!persistence.canDispatchSessionCommands}
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
                disabled={!hasSession || !persistence.canDispatchSessionCommands}
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

          <CompletedSummaryLedgerPanel persistence={persistence} />

          <GameExportPanel definition={game?.definition ?? null} registry={registry} />
          <GamePackExportPanel definition={game?.definition ?? null} registry={registry} />

          <section
            className="foundation__diagnostics"
            aria-labelledby="advanced-diagnostics-title"
            data-testid="host-advanced"
          >
            <h3 id="advanced-diagnostics-title">Advanced diagnostics</h3>
            <p className="host__note foundation__intro">
              Optional troubleshooting controls. They are not required for ordinary classroom setup.
            </p>

            <DiagnosticReportPanel
              persistence={persistence}
              audio={presentationAudio.status}
              displayWindow={displayOpen ? 'open' : 'closed'}
              inputSignals={inputDiagnosticSignals}
            />

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
                disabled={!hasSession || game?.gameLifecycle === 'ended'}
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
                  dispatch({
                    type: 'INITIALIZE_GAME',
                    issuedAt: now(),
                    definition: createSampleGame(),
                  })
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
        </details>
    </section>
  )
}
