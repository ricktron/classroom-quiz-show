import type { ReactElement } from 'react'
import { Link } from 'react-router-dom'
import { ROUTES, absoluteDisplayUrlWithTheme } from './paths'
import { FoundationControls } from '../host/FoundationControls'
import { ThemeProvider, useOptionalTheme, useTheme } from '../theme/ThemeProvider'
import { THEME_META, type ThemeId } from '../theme/themeRegistry'
import './HostRoute.css'

function HostRouteContent(): ReactElement {
  const { themeId, setThemeId } = useTheme()

  function openDisplay() {
    // Open the projector display in a separate window/tab. Uses an absolute,
    // base-path-aware URL carrying only the validated theme ID.
    window.open(
      absoluteDisplayUrlWithTheme(themeId),
      'quiz-show-display',
      'noopener',
    )
  }

  return (
    <div className="screen host">
      <div className="host__banner" role="note">
        <span className="host__banner-badge">Host</span>
        <span>
          Private teacher controls — do not project this screen for students.
        </span>
      </div>

      <fieldset className="host__theme">
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
                checked={themeId === meta.id}
                onChange={() => setThemeId(meta.id as ThemeId)}
              />
              <span className="host__theme-option-label">{meta.label}</span>
            </label>
          ))}
        </div>
      </fieldset>

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

/**
 * Private teacher host screen.
 *
 * There is still NO gameplay here — no board, scoring, teams, timers, or answer
 * reveal. Slice 2 adds a clearly-labeled "Foundation / testing controls" panel
 * that owns the authoritative in-memory state store, shows private state and the
 * append-only event history (host-only), and publishes sanitized public state to
 * the display. It must never be projected, hence the persistent warning banner.
 *
 * Slice 17 adds a session-local theme selector below the private-host banner.
 * Theme choice is presentation-only: no persistence, events, or public wire.
 *
 * When the application shell already provides ThemeProvider, that instance owns
 * state. Otherwise a local provider covers MemoryRouter harnesses that render
 * HostRoute without the app shell.
 */
export function HostRoute() {
  const existing = useOptionalTheme()
  if (existing) return <HostRouteContent />
  return (
    <ThemeProvider>
      <HostRouteContent />
    </ThemeProvider>
  )
}
