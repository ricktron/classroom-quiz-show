import { useCallback, useEffect, useRef, useState } from 'react'
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
import { RoundProgressHostPanel, RoundStartButton } from './RoundProgressHostPanel'
import { LiveUndoControl } from './LiveUndoControl'
import { LocalInputHostPanel } from './LocalInputHostPanel'
import { GamepadInputHostPanel } from './GamepadInputHostPanel'
import type { SonyBuzzTeacherSummary } from '../input/sonyBuzzTeacherReadiness'
import { useResponseTimerExpiry } from './useResponseTimerExpiry'
import { useFinalWagerExpiry } from './useFinalWagerExpiry'
import { systemClock, type Clock } from '../time/clock'
import { useHostPersistence, type UseHostPersistenceOptions } from './useHostPersistence'
import {
  isContextualTeamCountReturn,
  setupFocusFromNavigation,
  shouldResumeRecoveryFromNavigation,
  type HostSetupFocusTask,
} from './hostResumeNavigation'
import { isDisposableContextualTeamCountSession } from './disposableContextualTeamCountSession'
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
import { WbuzzSignalChainPanel } from './WbuzzSignalChainPanel'
import type { HostInputDiagnosticSignals } from './diagnostics/types'
import {
  canStartPlayFromGame,
  deriveHostPlayPosture,
} from '../session/hostPlayPosture'
import { soundFactLabel } from '../session/classroomReadiness'
import { teamNameUniquenessKey } from '../session/teamNameSelection'
import { THEME_META, type ThemeId } from '../theme/themeRegistry'
import { ownsSameGameRosterRefresh } from './sameGameRosterRefresh'
import { hostResumeWelcomeCopy } from './hostResumeWelcome'
import {
  BUZZER_RESUME_NOTICE,
  buzzerReadyScope,
  buzzersWereReady,
  forgetBuzzersReady,
  rememberBuzzersReady,
  shouldShowBuzzerResumeNotice,
} from './buzzerResumeNotice'
import { useDisplayPresence } from './useDisplayPresence'
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
  /** Class Setup Check/Show → existing SBS Buzzer Check (one-shot). */
  const [enterBuzzerCheck, setEnterBuzzerCheck] = useState(false)
  /** Buzzer Check (SBS test mode) lifted from the poll owner for Class Setup copy. */
  const [buzzerCheckOn, setBuzzerCheckOn] = useState(false)
  /** Q1 contextual Fix return: open Names (or named task) once setup remounts. */
  const [setupFocusOnce, setSetupFocusOnce] = useState<HostSetupFocusTask | null>(null)
  const contextualReturnLatchedRef = useRef(false)
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
  // CB-01: a handle this document opened, OR presence on the sync path. The
  // handle alone is lost on Host reload while the Display stays open and live.
  const [displayHandleOpen, setDisplayHandleOpen] = useState(false)
  const displayPresent = useDisplayPresence()
  const displayOpen = displayHandleOpen || displayPresent
  const [audioUnderstood, setAudioUnderstood] = useState(false)
  const [sonyReady, setSonyReady] = useState(false)
  const [sonyTeacherSummary, setSonyTeacherSummary] = useState<SonyBuzzTeacherSummary | null>(
    null,
  )
  /** CB-02: buzzers were ready earlier for this class and game, in this tab. */
  const [buzzersKnownReady, setBuzzersKnownReady] = useState(false)
  /** CB-02: the receiver has settled into a drop (not merely restoring). */
  const [receiverDropSettled, setReceiverDropSettled] = useState(false)
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
  const classSessionId = state.session?.sessionId ?? null
  const gameDefinition = game?.definition ?? null
  const buzzerScope =
    classSessionId !== null && gameDefinition !== null
      ? buzzerReadyScope(classSessionId, gameDefinition.id)
      : null
  // CB-02: readiness is known per class session AND game. Loading a game into
  // this tab replaces the class (a new frozen definition snapshot, even for the
  // same game id), so forget what was known; a reload rebuilds state from
  // history and starts from no previous definition, so it keeps the memory.
  const knownDefinitionRef = useRef(gameDefinition)
  useEffect(() => {
    const previous = knownDefinitionRef.current
    knownDefinitionRef.current = gameDefinition
    if (previous === null || gameDefinition === null || previous === gameDefinition) return
    if (buzzerScope !== null) forgetBuzzersReady(buzzerScope)
    setBuzzersKnownReady(false)
  }, [gameDefinition, buzzerScope])
  // Recall readiness known in this tab (a Host reload keeps tab storage), and
  // remember it whenever buzzers are ready.
  useEffect(() => {
    setBuzzersKnownReady(buzzerScope !== null && buzzersWereReady(buzzerScope))
  }, [buzzerScope])
  // Remember only readiness the buzzer panel reported for the CURRENT scope: when
  // a game loads in place, `sonyReady` still holds the previous game's value
  // until the panel reports again, and that must not count for the new game.
  const buzzerScopeRef = useRef(buzzerScope)
  buzzerScopeRef.current = buzzerScope
  const [readyReportedScope, setReadyReportedScope] = useState<string | null>(null)
  const onSonyReadyChange = useCallback((ready: boolean) => {
    setSonyReady(ready)
    setReadyReportedScope(ready ? buzzerScopeRef.current : null)
  }, [])
  useEffect(() => {
    if (buzzerScope === null || readyReportedScope !== buzzerScope) return
    rememberBuzzersReady(buzzerScope)
    setBuzzersKnownReady(true)
  }, [readyReportedScope, buzzerScope])
  const hasGame = game !== null
  /**
   * Whether this window may issue session commands at all: persistence boot has
   * settled AND another window does not own saving. `dispatchSessionCommand`
   * refuses everything otherwise, so every mutation-capable control below must
   * fold this in — a control gated only by `hasSession`/`hasGame` is still
   * actionable in a window that was demoted to read-only mid-game, and would be
   * pressed and silently refused.
   */
  const canCommand = persistence.canDispatchSessionCommands
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

  // Home Resume / Q1 contextual Fix-return: one-shot navigation intent.
  // Home Resume applies Host resume once recovery is readable, then clears
  // intent so refresh re-prompts. Contextual Fix-return may discardRecovery
  // ONLY when the interrupted Session is provably disposable; otherwise fail
  // closed (keep recoverability, clear latch, no false success / no spin).
  // Always preserve search (`?play=`) when clearing state.
  useEffect(() => {
    const clearNavState = () => {
      navigate(
        { pathname: location.pathname, search: location.search },
        { replace: true, state: null },
      )
    }

    if (isContextualTeamCountReturn(location.state)) {
      contextualReturnLatchedRef.current = true
      const focus = setupFocusFromNavigation(location.state)
      if (focus) setSetupFocusOnce(focus)
      clearNavState()
    }

    if (
      contextualReturnLatchedRef.current &&
      persistence.bootPhase === 'recovery' &&
      persistence.recovery
    ) {
      if (homeResumeHandledRef.current) return
      homeResumeHandledRef.current = true
      const disposable = isDisposableContextualTeamCountSession({
        history: persistence.recovery.events,
        expectedPlayGameId: playGameId,
      })
      if (!disposable) {
        // Meaningful Session: never silent discard. Clear latch so the effect
        // does not spin; recovery UI remains for Resume / explicit replace.
        contextualReturnLatchedRef.current = false
        homeResumeHandledRef.current = false
        setSetupFocusOnce(null)
        return
      }
      void persistence.discardRecovery().then((result) => {
        if (!result.ok) {
          // Discard failed — Session still on device; clear latch, no success claim.
          contextualReturnLatchedRef.current = false
          homeResumeHandledRef.current = false
          setSetupFocusOnce(null)
        }
      })
      return
    }

    const wantsResume = shouldResumeRecoveryFromNavigation(location.state)
    if (!wantsResume) {
      if (!contextualReturnLatchedRef.current) {
        homeResumeHandledRef.current = false
      }
      return
    }
    if (homeResumeHandledRef.current) return
    if (persistence.bootPhase === 'loading') return
    if (persistence.bootPhase === 'recovery' && persistence.recovery) {
      homeResumeHandledRef.current = true
      // resume() bumps storeEpoch by 1; latch that next epoch for hydrate reveal.
      setHomeResumeWelcomePendingEpoch(persistence.storeEpoch + 1)
      persistence.resume()
      clearNavState()
      return
    }
    // Stale intent (already discarded / no recovery): clear without claiming success.
    homeResumeHandledRef.current = true
    clearNavState()
  }, [
    location.state,
    location.pathname,
    location.search,
    navigate,
    persistence,
    persistence.bootPhase,
    persistence.recovery,
    persistence.resume,
    persistence.discardRecovery,
    persistence.storeEpoch,
    playGameId,
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
          contextualReturnLatchedRef.current = false
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
      setDisplayHandleOpen(Boolean(handle && !handle.closed))
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
    setDisplayHandleOpen(Boolean(opened && !opened.closed))
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
  // CB-02: buzzer readiness that dropped since it was last known in this tab for
  // this class session (e.g. after a Host reload / Resume) is said plainly.
  const showBuzzerResumeNotice = shouldShowBuzzerResumeNotice({
    wereReady: buzzersKnownReady,
    sonyReady,
    receiverDropSettled,
  })
  if (playReady && game) {
    playStatusParts.push(namesComplete ? 'Names ready' : 'Names incomplete')
    playStatusParts.push(displayOpen ? 'Display open' : 'Display not open')
    playStatusParts.push(
      sonyReady
        ? 'Buzzers ready'
        : showBuzzerResumeNotice
          ? BUZZER_RESUME_NOTICE
          : 'Buzzers optional · keyboard works',
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
        <div className="foundation__play-row">
          <p className="host__note foundation__play-status" data-testid="host-play-status" role="status">
            {playStatusParts.join(' · ')}
          </p>
          {/* Q6-RP-1 (G1): the required next action after Start Game — ordinary, never under More. */}
          {game && (
            <div className="foundation__play-actions" role="group" aria-label="Live game actions">
              <RoundStartButton
                dispatch={dispatch}
                game={game}
                clock={clock}
                disabled={!persistence.canDispatchSessionCommands}
              />
              {/* Q6-RP-2 (G3): ordinary live Undo — the canonical UNDO, never via diagnostics. */}
              <LiveUndoControl
                dispatch={dispatch}
                game={game}
                history={history}
                clock={clock}
                disabled={!persistence.canDispatchSessionCommands}
              />
            </div>
          )}
        </div>
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
          initialSelectedTask={setupFocusOnce}
          onInitialSelectedTaskConsumed={() => setSetupFocusOnce(null)}
          onPlay={() => {
            dismissWelcomeBack()
            setPlayReady(true)
            setMoreOpen(false)
            // H-REPAIR-1: Start must land on the focused Host first viewport.
            // Class Setup scroll position must not leave chrome above the fold.
            window.scrollTo(0, 0)
          }}
          onFixTeamCount={() => {
            // Q1-C: only blocked team-count repair carries destructive-eligible
            // contextual return. Valid Teams "Open Game settings" opens authoring
            // without discard/return intent (Save must not silently wipe Session).
            const teamCount = game.definition.teams.length
            const teamsBlocked = teamCount < 1 || teamCount > 8
            navigate(editPath(game.definition.id), {
              state: {
                authoringFocus: 'team-count',
                ...(teamsBlocked
                  ? { returnToClassSetup: true, setupFocus: 'names' as const }
                  : {}),
              },
            })
          }}
          buzzerCheckOn={buzzerCheckOn}
          onRevealBuzzersSetup={() => {
            // Q1-A + Q7-F01: enter existing SBS Buzzer Check, then bring Connect
            // (or the Buzzers section) into the teacher viewport with meaningful focus.
            setEnterBuzzerCheck(true)
            const reduceMotion =
              typeof window.matchMedia === 'function' &&
              window.matchMedia('(prefers-reduced-motion: reduce)').matches
            const reveal = () => {
              const connect = document.querySelector('[data-testid="sbs-connect"]')
              const section =
                document.querySelector('[data-testid="sbs-supported-profile"]') ??
                document.querySelector('[data-testid="gih"]')
              const target =
                connect instanceof HTMLElement
                  ? connect
                  : section instanceof HTMLElement
                    ? section
                    : null
              if (!target) return
              target.scrollIntoView({
                behavior: reduceMotion ? 'auto' : 'smooth',
                block: 'center',
              })
              if (
                connect instanceof HTMLButtonElement &&
                !connect.disabled &&
                connect.getAttribute('aria-disabled') !== 'true'
              ) {
                connect.focus({ preventScroll: true })
                return
              }
              const status = document.querySelector('[data-testid="setup-buzzer-reveal-status"]')
              if (status instanceof HTMLElement) {
                status.focus({ preventScroll: true })
                return
              }
              target.focus({ preventScroll: true })
            }
            // Wait for Class Setup status + Buzzer Check paint before scroll/focus.
            requestAnimationFrame(() => {
              requestAnimationFrame(reveal)
            })
          }}
          onSelectedIdentitiesChange={(claimed) => {
            const issuedAt = now()
            // CB-03: the session refuses a name another team currently holds, so
            // a rename chain (A→B while B→C) or a swap is applied in a safe
            // order: set a team only once its new name is free; break a swap
            // cycle by clearing one name first.
            const current = new Map<string, string | null>(
              game.definition.teams.map((team) => [team.id, sessionTeamNameFor(game, team.id)]),
            )
            const pending = game.definition.teams
              .map((team) => ({ teamId: team.id, next: claimed[team.id] ?? null }))
              .filter(({ teamId, next }) => next !== current.get(teamId))
            const heldByAnother = (teamId: string, name: string | null) =>
              name !== null &&
              [...current].some(
                ([otherId, held]) =>
                  otherId !== teamId &&
                  held !== null &&
                  teamNameUniquenessKey(held) === teamNameUniquenessKey(name),
              )
            const set = (teamId: string, name: string | null) => {
              dispatch({ type: 'SET_SESSION_TEAM_NAME', issuedAt, teamId, name })
              current.set(teamId, name)
            }
            // Bounded: each team needs at most one clear and one set.
            for (let guard = pending.length * 2 + 1; pending.length > 0 && guard > 0; guard -= 1) {
              const ready = pending.findIndex(({ teamId, next }) => !heldByAnother(teamId, next))
              if (ready >= 0) {
                const [{ teamId, next }] = pending.splice(ready, 1)
                set(teamId, next)
              } else {
                set(pending[0]!.teamId, null)
              }
            }
            // Only reachable for an inconsistent batch; the session then refuses
            // the duplicate itself rather than this loop guessing.
            for (const { teamId, next } of pending) set(teamId, next)
          }}
        />
      )}

      <fieldset
        className="foundation__session-controls"
        disabled={!persistence.canDispatchSessionCommands}
        aria-label="Session command controls"
      >
        <legend className="visually-hidden">Session command controls</legend>

        {/*
          Why these panels carry a key, and why one of them does not (CBN-NEW-1).

          "Reset this class session" starts a new class over the same append-only
          log. It does not remount the Host and does not bump the store epoch, and
          these panels' early returns for "no round yet" happen INSIDE mounted
          components — so without help, their React state is the PREVIOUS class's:
          an armed "End the game" confirmation on an action the app itself calls
          irreversible, typed Final wagers with Save enabled, a typed manual
          correction with its confirmation already ticked, a last-buzz line
          naming a buzz this class never made, and the timer length another class
          chose.

          A panel whose local state is entirely per-class is keyed on the class
          session, so a reset gives the next class a fresh one. Each key value is
          DISTINCT per panel: React maps old children by key value, and two
          siblings sharing one value collapse into a single map entry, leaving the
          overwritten fiber undeleted and its <section> orphaned in the document
          with duplicate element ids. `LocalInputHostPanel` is NOT keyed, because
          it also owns the durable keyboard mapping, which must survive a reset —
          it clears only its per-class slices instead.
        */}
        {game && playReady && (
          <div className="foundation__gameplay" data-testid="host-gameplay">
            {/*
              Q7-R1 (item 11): while a clue is open, the clue + round status sit
              in a lead column with the response window and buzz-in queue beside
              them (CSS only; see FoundationControls.css). Otherwise this wrapper
              is `display: contents` and the panels stack exactly as before.
            */}
            <div className="foundation__lead">
              {/* Q6-RP-1 (G1): ordinary round progression — never via Advanced diagnostics. */}
              <RoundProgressHostPanel
                key={`rph-${classSessionId}`}
                dispatch={dispatch}
                game={game}
                clock={clock}
              />
              <CategoryBoardHostPanel dispatch={dispatch} game={game} clock={clock} />
            </div>
            <ResponseTimerHostPanel
              key={`rth-${classSessionId}`}
              dispatch={dispatch}
              game={game}
              clock={clock}
            />
            <FinalWagerHostPanel
              key={`fwh-${classSessionId}`}
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
            <LocalInputHostPanel
              classSessionId={classSessionId}
              dispatch={dispatch}
              game={game}
              clock={clock}
            />
            <TeamScoringPanel
              key={`tsp-${classSessionId}`}
              dispatch={dispatch}
              game={game}
              history={history}
              clock={clock}
            />
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
          enterBuzzerCheck={enterBuzzerCheck}
          onEnterBuzzerCheckConsumed={() => setEnterBuzzerCheck(false)}
          onSelectionBatch={setSelectionObservationBatch}
          onSonyReadyChange={onSonyReadyChange}
          onSonyTeacherSummaryChange={setSonyTeacherSummary}
          onReceiverDropSettledChange={setReceiverDropSettled}
          onWbuzzPresentChange={setWbuzzPresent}
          onInputDiagnosticSignals={setInputDiagnosticSignals}
          onBuzzerCheckChange={setBuzzerCheckOn}
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
              canDispatch={canCommand}
            />

            <SpreadsheetAuthoringPanel
              dispatch={dispatch}
              registry={registry}
              hasSession={hasSession}
              activeGame={game}
              canDispatch={canCommand}
            />

            <GamePackImportPanel
              dispatch={dispatch}
              registry={registry}
              hasSession={hasSession}
              activeGame={game}
              canDispatch={canCommand}
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

            <WbuzzSignalChainPanel />

            <div className="foundation__actions" role="group" aria-label="Foundation commands">
              <button
                type="button"
                className="btn btn--secondary"
                disabled={!canCommand}
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
                disabled={!hasSession || !canCommand}
                onClick={() => dispatch({ type: 'ADVANCE_SEQUENCE', issuedAt: now() })}
              >
                Advance sequence
              </button>
              <button
                type="button"
                className="btn btn--secondary"
                disabled={!hasSession || !canCommand}
                onClick={() => dispatch({ type: 'MARK_WAITING', issuedAt: now() })}
              >
                Mark waiting
              </button>
              <button
                type="button"
                className="btn btn--secondary"
                disabled={!hasSession || !canCommand}
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
                disabled={!hasSession || !canCommand || game?.gameLifecycle === 'ended'}
                onClick={() => dispatch({ type: 'UNDO', issuedAt: now() })}
              >
                Undo last reversible
              </button>
            </div>

            <fieldset className="foundation__status" disabled={!hasSession || !canCommand}>
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
                disabled={!hasSession || !canCommand}
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
                disabled={!hasSession || !canCommand}
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
                disabled={!hasGame || !canCommand}
                onClick={() => dispatch({ type: 'ADVANCE_TO_NEXT_ROUND', issuedAt: now() })}
              >
                Advance to next round
              </button>
              <button
                type="button"
                className="btn btn--secondary"
                disabled={!hasGame || !canCommand}
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
                          disabled={!canCommand}
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
