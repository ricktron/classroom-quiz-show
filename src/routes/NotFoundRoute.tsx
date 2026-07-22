import { Link } from 'react-router-dom'
import { ROUTES } from './paths'

/**
 * Safe "unknown route" screen. Understandable, non-technical, and leaks nothing:
 * no stack traces, no source paths, no route state, no debug objects.
 */
export function NotFoundRoute() {
  return (
    <main className="screen__main" aria-labelledby="notfound-title">
      <p className="display__brand">Classroom Quiz Show</p>
      <h1 id="notfound-title">Screen not found</h1>
      <p className="host__note">
        That address doesn’t match a screen in this app.
      </p>
      <nav className="host__actions" aria-label="Recover">
        <Link className="btn" to={ROUTES.root}>
          Go to start
        </Link>
      </nav>
    </main>
  )
}
