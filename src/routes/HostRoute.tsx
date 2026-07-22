import { Link } from 'react-router-dom'
import { ROUTES, absoluteHashUrl } from './paths'
import { FoundationControls } from '../host/FoundationControls'
import './HostRoute.css'

/**
 * Private teacher host screen.
 *
 * There is still NO gameplay here — no board, scoring, teams, timers, or answer
 * reveal. Slice 2 adds a clearly-labeled "Foundation / testing controls" panel
 * that owns the authoritative in-memory state store, shows private state and the
 * append-only event history (host-only), and publishes sanitized public state to
 * the display. It must never be projected, hence the persistent warning banner.
 */
export function HostRoute() {
  function openDisplay() {
    // Open the projector display in a separate window/tab. Uses an absolute,
    // base-path-aware URL so it works under GitHub Pages too.
    window.open(absoluteHashUrl(ROUTES.display), 'quiz-show-display', 'noopener')
  }

  return (
    <div className="screen host">
      <div className="host__banner" role="note">
        <span className="host__banner-badge">Host</span>
        <span>
          Private teacher controls — do not project this screen for students.
        </span>
      </div>

      <main className="screen__main" aria-labelledby="host-title">
        <h1 id="host-title">Host control</h1>

        <section className="host__status" aria-live="polite">
          <h2>No active game</h2>
          <p>
            No game session or round is running. Game setup, rounds, and scoring
            arrive in a later slice — this foundation deliberately ships without
            them.
          </p>
        </section>

        <div className="host__actions">
          <button type="button" className="btn" onClick={openDisplay}>
            Open display in new window
          </button>
          <Link className="btn btn--secondary" to={ROUTES.root}>
            Back to start
          </Link>
        </div>

        <p className="host__note">
          Tip: put this host screen on your laptop and the display screen on the
          projector. They are separate screens on purpose.
        </p>

        <FoundationControls />
      </main>
    </div>
  )
}
