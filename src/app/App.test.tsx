import { describe, expect, it, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { ROUTES } from '../routes/paths'
import { RootRoute } from '../routes/RootRoute'
import { HostRoute } from '../routes/HostRoute'
import { DisplayRoute } from '../routes/DisplayRoute'
import { NotFoundRoute } from '../routes/NotFoundRoute'
import { ErrorBoundary } from './ErrorBoundary'
import { FORBIDDEN_DISPLAY_LABELS } from '../test/leakLabels'

/**
 * Mirrors the route table in App.tsx but under MemoryRouter so we can drive the
 * initial path directly. (App itself uses HashRouter for GitHub Pages.)
 */
function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
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
    </MemoryRouter>,
  )
}

describe('route resolution', () => {
  it('root shows the role-selection entry with host and display links', () => {
    renderAt(ROUTES.root)
    expect(
      screen.getByRole('heading', { name: /choose a screen/i }),
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /open host/i })).toHaveAttribute(
      'href',
      '/host',
    )
    expect(screen.getByRole('link', { name: /open display/i })).toHaveAttribute(
      'href',
      '/display',
    )
  })

  it('host route warns it is private and shows no active game', () => {
    renderAt(ROUTES.host)
    expect(screen.getByText(/do not project this screen/i)).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: /no active game/i }),
    ).toBeInTheDocument()
  })

  it('display route shows a safe waiting state', () => {
    renderAt(ROUTES.display)
    expect(
      screen.getByRole('heading', { name: /game display ready/i }),
    ).toBeInTheDocument()
    expect(screen.getByText(/waiting for the host/i)).toBeInTheDocument()
  })

  it('unknown route resolves to a safe "screen not found" page', () => {
    renderAt('/this-does-not-exist')
    expect(
      screen.getByRole('heading', { name: /screen not found/i }),
    ).toBeInTheDocument()
    // must not leak technical detail
    expect(document.body.textContent).not.toMatch(/stack|Error:|\/src\//i)
  })
})

describe('projector-leak baseline', () => {
  it('display contains none of the forbidden host/answer labels', () => {
    renderAt(ROUTES.display)
    const text = document.body.textContent ?? ''
    for (const label of FORBIDDEN_DISPLAY_LABELS) {
      expect(text.toLowerCase()).not.toContain(label.toLowerCase())
    }
  })

  it('display exposes no buttons or editable controls', () => {
    renderAt(ROUTES.display)
    expect(screen.queryAllByRole('button')).toHaveLength(0)
    expect(screen.queryAllByRole('textbox')).toHaveLength(0)
    // no navigation back into the host from the projector
    expect(screen.queryByRole('link')).toBeNull()
  })
})

describe('display error boundary (fail-closed)', () => {
  const Boom = () => {
    throw new Error('secret host stacktrace detail /src/private.ts')
  }

  beforeEach(() => {
    // getDerivedStateFromError logs via componentDidCatch; silence for clean output
  })

  it('renders a neutral projector recovery state and leaks no diagnostics', () => {
    render(
      <MemoryRouter>
        <ErrorBoundary variant="display">
          <Boom />
        </ErrorBoundary>
      </MemoryRouter>,
    )
    expect(
      screen.getByRole('heading', { name: /display paused/i }),
    ).toBeInTheDocument()
    const text = document.body.textContent ?? ''
    expect(text).not.toContain('stacktrace')
    expect(text).not.toContain('/src/private.ts')
    expect(text.toLowerCase()).not.toContain('error:')
  })
})
