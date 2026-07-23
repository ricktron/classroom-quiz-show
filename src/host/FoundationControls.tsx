import { useSessionStore } from './useSessionStore'
import { useHostSync } from './useHostSync'
import { PUBLIC_STATUS_CODES } from '../state/status'
import { createSampleGame, createSampleGameWithUnsupportedRound } from '../game/sampleGame'
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

export function FoundationControls() {
  const { store, state, history, dispatch } = useSessionStore()
  useHostSync(store)

  const now = () => Date.now()
  const hasSession = state.session !== null
  const registry = store.getRegistry()
  const game = state.session?.game ?? null
  const hasGame = game !== null

  return (
    <section className="foundation" aria-labelledby="foundation-title">
      <div className="foundation__tag">Foundation / testing controls — not gameplay</div>
      <h2 id="foundation-title">State &amp; event core (Slice 2)</h2>
      <p className="host__note foundation__intro">
        These controls demonstrate the command → event → replay core and the
        private→public boundary. They are diagnostics, not a game.
      </p>

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
    </section>
  )
}
