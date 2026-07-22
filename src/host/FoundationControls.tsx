import { useSessionStore } from './useSessionStore'
import { useHostSync } from './useHostSync'
import { PUBLIC_STATUS_CODES } from '../state/status'
import './FoundationControls.css'

/**
 * Foundation / testing controls (NOT gameplay).
 *
 * This panel exists only to prove the Slice 2 state/event core end to end from
 * the host surface: it dispatches the small foundation command vocabulary,
 * renders the authoritative PRIVATE state + append-only event history (host-only
 * — never projected), and publishes sanitized public state to any open display.
 *
 * These are deliberately labeled as foundation/testing controls. They are not
 * game controls — there is no board, scoring, teams, timers, or answer reveal
 * here (those arrive in later slices).
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
    </section>
  )
}
