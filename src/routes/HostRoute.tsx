import type { ReactElement } from 'react'
import { Link } from 'react-router-dom'
import { ROUTES } from './paths'
import { FoundationControls } from '../host/FoundationControls'
import type { UseHostPersistenceOptions } from '../host/useHostPersistence'
import { isDesktopRuntime } from '../runtime/cqsRuntime'
import { ThemeProvider, useOptionalTheme } from '../theme/ThemeProvider'
import './HostRoute.css'

export interface HostRouteProps {
  readonly persistenceOptions?: UseHostPersistenceOptions
}

function HostRouteContent({
  persistenceOptions,
}: {
  readonly persistenceOptions?: UseHostPersistenceOptions
}): ReactElement {
  return (
    <div className="screen host">
      <div className="host__banner" role="note">
        <span className="host__banner-badge">Host</span>
        <span>
          Private teacher controls — do not project this screen for students.
        </span>
      </div>

      <main className="screen__main" aria-labelledby="host-title">
        <div className="host__title-row">
          <h1 id="host-title">Host control</h1>
          <Link className="btn btn--secondary" to={ROUTES.root}>
            Back to Home
          </Link>
        </div>

        <p className="host__note">
          {isDesktopRuntime()
            ? 'Keep this Host on your laptop. When your computer has one other screen, opening the audience display moves it there. If that window is off every connected screen, Focus display brings it back onto a connected screen. If it is still on the wrong screen, move it yourself.'
            : 'Keep this Host on your laptop and put the audience display window on the projector. They are separate screens on purpose.'}
        </p>

        <FoundationControls persistenceOptions={persistenceOptions} />
      </main>
    </div>
  )
}

/**
 * Private teacher host screen.
 *
 * Owns the working classroom quiz-show host surface. MENUS Slice A focuses the
 * ordinary Host after Start Game; power paths live under More. Theme selection
 * is demoted into FoundationControls More (session-local; no persistence).
 *
 * When the application shell already provides ThemeProvider, that instance owns
 * state. Otherwise a local provider covers MemoryRouter harnesses that render
 * HostRoute without the app shell.
 */
export function HostRoute({ persistenceOptions }: HostRouteProps = {}) {
  const existing = useOptionalTheme()
  if (existing) return <HostRouteContent persistenceOptions={persistenceOptions} />
  return (
    <ThemeProvider>
      <HostRouteContent persistenceOptions={persistenceOptions} />
    </ThemeProvider>
  )
}
