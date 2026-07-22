import { HashRouter, Route, Routes } from 'react-router-dom'
import { ROUTES } from '../routes/paths'
import { RootRoute } from '../routes/RootRoute'
import { HostRoute } from '../routes/HostRoute'
import { DisplayRoute } from '../routes/DisplayRoute'
import { NotFoundRoute } from '../routes/NotFoundRoute'
import { ErrorBoundary } from './ErrorBoundary'

/**
 * Application shell.
 *
 * HashRouter is used because GitHub Pages is a static host with no server-side
 * rewrites; hash routes survive direct navigation and refresh under a
 * repository base path with zero extra configuration. See
 * docs/architecture/ADR-001-github-pages-routing.md.
 *
 * The host and display surfaces get SEPARATE error boundaries so the display
 * can fail closed independently of the host.
 */
export function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path={ROUTES.root} element={<RootRoute />} />
        <Route
          path={ROUTES.host}
          element={
            <ErrorBoundary variant="host">
              <HostRoute />
            </ErrorBoundary>
          }
        />
        <Route
          path={ROUTES.display}
          element={
            <ErrorBoundary variant="display">
              <DisplayRoute />
            </ErrorBoundary>
          }
        />
        <Route path="*" element={<NotFoundRoute />} />
      </Routes>
    </HashRouter>
  )
}
