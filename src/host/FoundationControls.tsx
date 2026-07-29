import { useSessionStore } from './useSessionStore'
import { useHostSync } from './useHostSync'
import { PUBLIC_STATUS_CODES } from '../state/status'
import { createSampleGame, createSampleGameWithUnsupportedRound } from '../game/sampleGame'
import { GameImportPanel } from './GameImportPanel'
import { GameExportPanel } from './GameExportPanel'
import { CategoryBoardHostPanel } from './CategoryBoardHostPanel'
import { TeamScoringPanel } from './TeamScoringPanel'
import { ResponseTimerHostPanel } from './ResponseTimerHostPanel'
import { LocalInputHostPanel } from './LocalInputHostPanel'
import { GamepadInputHostPanel } from './GamepadInputHostPanel'
import { useResponseTimerExpiry } from './useResponseTimerExpiry'
import { systemClock, type Clock } from '../time/clock'
import { useHostPersistence } from './useHostPersistence'
import { PersistenceControls } from './PersistenceControls'
import './FoundationControls.css'

/**
 * Foundation / testing controls (NOT gameplay).
 *
 * This panel exists only to prove the state/event core and the Slice 3 game &
 * round model + registry end to end from the host surface: it dispatches the
 * foundation command vocabulary, renders the authoritative PRIVATE state +
 * append-only event history (host-only — never projected), and publishes
 * sanitized public state to any open display.
 *
 * These are deliberately labeled as foundation/testing controls. They are not
 * game controls — there is no board, questions, answers, scoring, teams, timers,
 * or reveal here (those arrive in later slices). The "game" here is only a small
 * in-memory definition of NON-gameplay placeholder rounds used to exercise the
 * model, plus one deliberately-unsupported round to prove fail-closed handling.
 */

let sessionCounter = 0
function nextSessionId(): string {
  sessionCounter += 1
  return `session-${sessionCounter}`
}

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

  return (
    <section className="foundation" aria-labelledby="foundation-title">
      <div className="foundation__tag">Foundation / testing controls — not gameplay</div>
      <h2 id="foundation-title">State &amp; event core (Slice 2)</h2>
      <p className="host__note foundation__intro">
        These controls demonstrate the command → event → replay core and the
        private→public boundary. They are diagnostics, not a game.
      </p>

      <PersistenceControls
        persistence={persistence}
        activeGame={game}
        activeDefinition={game?.definition ?? null}
        registry={registry}
        dispatch={dispatch}
        getHistory={() => store.getHistory()}
      />

      <fieldset
        className="foundation__session-controls"
        disabled={!persistence.canDispatchSessionCommands}
        aria-label="Session command controls"
      >
        <legend className="foundation__session-legend">Session commands</legend>

      <div className="foundation__actions" role="group" aria-label="Foundation commands">
        <button
          type="button"
          className="btn"
          onClick={() => dispatch({ type: 'INIT_SESSION', issuedAt: now(), sessionId: nextSessionId() })}
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
            dispatch({ type: 'SET_HOST_NOTE', issuedAt: now(), note: 'private host memo (never projected)' })
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
            <dd data-testid="private-session">{state.session ? state.session.sessionId : '—'}</dd>
            <dt>lifecycle</dt>
            <dd>{state.session ? state.session.lifecycle : '—'}</dd>
            <dt>counter</dt>
            <dd data-testid="private-counter">{state.session ? state.session.counter : '—'}</dd>
            <dt>status code</dt>
            <dd>{state.session ? state.session.publicStatusCode : '—'}</dd>
            <dt>host notes</dt>
            <dd>{state.session && state.session.hostNotes ? state.session.hostNotes : '—'}</dd>
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

      <div className="foundation__tag foundation__tag--slice3">
        Game &amp; round model (Slice 3) — foundation, not gameplay
      </div>
      <p className="host__note foundation__intro">
        These two samples are <strong>trusted in-memory fixtures</strong> built by the
        application through the domain constructor — they are not an import path. Untrusted
        content goes through the import pipeline below.
      </p>

      <div className="foundation__actions" role="group" aria-label="Game foundation commands">
        <button
          type="button"
          className="btn"
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
          <p className="host__note">No game loaded. Initialize a sample game above.</p>
        ) : (
          <>
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
          </>
        )}
      </div>

      {/*
        The one GAMEPLAY surface (Slice 5). It renders only when the current
        round is a playable category board; every other state (no game, no
        round, a placeholder round, an unsupported round) renders nothing here
        and the foundation diagnostics above remain the whole host surface.
      */}
      {game && <CategoryBoardHostPanel dispatch={dispatch} game={game} clock={clock} />}

      {/*
        Timers & arming (Slice 7). A third bounded panel: it arms and times, it
        reveals nothing, and it scores nothing — the same separation that keeps
        the board panel and the scoring panel apart.
      */}
      {game && <ResponseTimerHostPanel dispatch={dispatch} game={game} clock={clock} />}

      {/*
        Local input & the buzz queue (Slice 8). A fourth bounded panel: it
        configures keyboard input and runs the queue, and — like its siblings — it
        reveals nothing, times nothing and scores nothing. Arming stays in the
        timer panel above, so the application has exactly one arming control.
      */}
      {game && <LocalInputHostPanel dispatch={dispatch} game={game} clock={clock} />}

      {/*
        Generic controller input (Slice 9). The other half of the local-input
        area, kept as its own bounded panel: it configures CONTROLLER input and
        nothing else, and it feeds the very same boundary the keyboard panel above
        does — one queue, one command, one event, one projection. Keyboard buzzing
        is unaffected by anything here, including a browser with no Gamepad API at
        all. No model, vendor or colour surface exists (Slice 10 owns that).
      */}
      {game && <GamepadInputHostPanel dispatch={dispatch} game={game} clock={clock} />}

      {/*
        Teams & scoring (Slice 6). It sits BESIDE the board panel, not inside it,
        because revealing content and awarding points are separate decisions —
        neither panel can trigger the other's action.
      */}
      {game && (
        <TeamScoringPanel dispatch={dispatch} game={game} history={history} clock={clock} />
      )}

      <GameImportPanel
        dispatch={dispatch}
        registry={registry}
        hasSession={hasSession}
        activeGame={game}
      />

      </fieldset>

      <GameExportPanel
        definition={game?.definition ?? null}
        registry={registry}
      />
    </section>
  )
}
