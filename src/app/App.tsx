import { useMemo } from 'react'
import { createHashRouter, Outlet, RouterProvider } from 'react-router-dom'
import { ROUTES } from '../routes/paths'
import { HomeRoute } from '../routes/HomeRoute'
import { AuthoringRoute } from '../routes/AuthoringRoute'
import { HostRoute } from '../routes/HostRoute'
import { DisplayRoute } from '../routes/DisplayRoute'
import { NotFoundRoute } from '../routes/NotFoundRoute'
import { ErrorBoundary } from './ErrorBoundary'
import { ThemeProvider } from '../theme/ThemeProvider'

/**
 * Application shell.
 *
 * Hash routing is required because GitHub Pages is a static host with no
 * server-side rewrites; hash routes survive direct navigation and refresh
 * under a repository base path. See
 * docs/architecture/ADR-001-github-pages-routing.md.
 *
 * `createHashRouter` is the data-router form of that same hash strategy so
 * authoring can use `useBlocker` for unsaved leave. Component `HashRouter`
 * cannot block Back.
 *
 * ThemeProvider owns only per-window presentation state (Slice 17). It mounts
 * inside the router so hash-route launch queries can seed the display theme.
 *
 * The host and display surfaces get SEPARATE error boundaries so the display
 * can fail closed independently of the host.
 */
function AppShell() {
  return (
    <ThemeProvider>
      <Outlet />
    </ThemeProvider>
  )
}

export function App() {
  const router = useMemo(
    () =>
      createHashRouter([
        {
          element: <AppShell />,
          children: [
            { path: ROUTES.root, element: <HomeRoute /> },
            { path: ROUTES.edit, element: <AuthoringRoute /> },
            { path: `${ROUTES.edit}/:gameId`, element: <AuthoringRoute /> },
            {
              path: ROUTES.host,
              element: (
                <ErrorBoundary variant="host">
                  <HostRoute />
                </ErrorBoundary>
              ),
            },
            {
              path: ROUTES.display,
              element: (
                <ErrorBoundary variant="display">
                  <DisplayRoute />
                </ErrorBoundary>
              ),
            },
            { path: '*', element: <NotFoundRoute /> },
          ],
        },
      ]),
    [],
  )
  return <RouterProvider router={router} />
}
