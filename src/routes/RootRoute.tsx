import { Link } from 'react-router-dom'
import { isDesktopRuntime } from '../runtime/cqsRuntime'
import { ROUTES, absoluteDisplayUrlWithTheme } from './paths'

/**
 * Root entry: a lightweight role-selection screen. No game setup here — that is
 * out of scope for Slice 1. It exists to send the teacher to the private host
 * screen or the public projector display.
 */
export function RootRoute() {
  return (
    <main className="screen__main" aria-labelledby="root-title">
      <p className="display__brand">Classroom Quiz Show</p>
      <h1 id="root-title">Choose a screen</h1>
      <p className="host__note">
        Open the host screen on your private device, and the display screen on
        the projector.
      </p>
      <nav className="host__actions" aria-label="Choose a screen">
        <Link className="btn" to={ROUTES.host}>
          Open Host
        </Link>
        {isDesktopRuntime() ? (
          <button
            type="button"
            className="btn btn--secondary"
            onClick={() => {
              window.open(
                absoluteDisplayUrlWithTheme('default'),
                'quiz-show-display',
                'noopener',
              )
            }}
          >
            Open Display
          </button>
        ) : (
          <Link className="btn btn--secondary" to={ROUTES.display}>
            Open Display
          </Link>
        )}
      </nav>
    </main>
  )
}
