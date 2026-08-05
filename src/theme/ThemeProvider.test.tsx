import { cleanup, render, screen, act } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter, Route, Routes, useNavigate } from 'react-router-dom'
import {
  ThemeProvider,
  resolveInitialThemeId,
  useTheme,
} from './ThemeProvider'
import { ROUTES } from '../routes/paths'

afterEach(() => {
  cleanup()
  document.documentElement.removeAttribute('data-theme')
  vi.unstubAllGlobals()
})

function ThemeProbe() {
  const { themeId, setThemeId } = useTheme()
  return (
    <div>
      <span data-testid="theme-id">{themeId}</span>
      <button type="button" onClick={() => setThemeId('high-contrast')}>
        set-hc
      </button>
      <button type="button" onClick={() => setThemeId('HOSTILE')}>
        set-hostile
      </button>
    </div>
  )
}

function NavButton({ to }: { to: string }) {
  const navigate = useNavigate()
  return (
    <button type="button" onClick={() => navigate(to)}>
      go
    </button>
  )
}

function renderWithRoute(initialEntry: string) {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <ThemeProvider>
        <Routes>
          <Route path={ROUTES.host} element={<ThemeProbe />} />
          <Route path={ROUTES.display} element={<ThemeProbe />} />
          <Route path="/" element={<ThemeProbe />} />
        </Routes>
      </ThemeProvider>
    </MemoryRouter>,
  )
}

describe('resolveInitialThemeId', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'matchMedia',
      vi.fn().mockImplementation((query: string) => ({
        matches: query === '(prefers-contrast: more)',
        media: query,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
        onchange: null,
      })),
    )
  })

  it('uses an explicit valid display launch query', () => {
    expect(
      resolveInitialThemeId({
        pathname: '/display',
        search: '?theme=high-contrast',
      }),
    ).toBe('high-contrast')
  })

  it('fails closed on an explicit hostile display query without using OS hint', () => {
    expect(
      resolveInitialThemeId({
        pathname: '/display',
        search: '?theme=HOSTILE',
      }),
    ).toBe('default')
  })

  it('seeds high-contrast from prefers-contrast when no launch query exists', () => {
    expect(resolveInitialThemeId({ pathname: '/host', search: '' })).toBe(
      'high-contrast',
    )
    expect(resolveInitialThemeId({ pathname: '/display', search: '' })).toBe(
      'high-contrast',
    )
  })

  it('uses default when OS hint is absent and no launch query exists', () => {
    vi.stubGlobal(
      'matchMedia',
      vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
        onchange: null,
      })),
    )
    expect(resolveInitialThemeId({ pathname: '/host', search: '' })).toBe(
      'default',
    )
  })
})

describe('ThemeProvider', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'matchMedia',
      vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
        onchange: null,
      })),
    )
  })

  it('applies data-theme on documentElement', () => {
    renderWithRoute('/host')
    expect(document.documentElement.dataset.theme).toBe('default')
    act(() => {
      screen.getByRole('button', { name: 'set-hc' }).click()
    })
    expect(document.documentElement.dataset.theme).toBe('high-contrast')
    expect(screen.getByTestId('theme-id')).toHaveTextContent('high-contrast')
  })

  it('resolves hostile setter candidates to default', () => {
    renderWithRoute('/host')
    act(() => {
      screen.getByRole('button', { name: 'set-hc' }).click()
    })
    act(() => {
      screen.getByRole('button', { name: 'set-hostile' }).click()
    })
    expect(document.documentElement.dataset.theme).toBe('default')
  })

  it('does not overwrite explicit state when OS contrast preference changes later', () => {
    const listeners: Array<(ev: { matches: boolean }) => void> = []
    vi.stubGlobal(
      'matchMedia',
      vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        addEventListener: (_type: string, cb: (ev: { matches: boolean }) => void) => {
          listeners.push(cb)
        },
        removeEventListener: vi.fn(),
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
        onchange: null,
      })),
    )
    renderWithRoute('/host')
    expect(document.documentElement.dataset.theme).toBe('default')
    act(() => {
      for (const cb of listeners) cb({ matches: true })
    })
    expect(document.documentElement.dataset.theme).toBe('default')
    expect(listeners).toHaveLength(0)
  })

  it('preserves theme across in-window host navigation', () => {
    render(
      <MemoryRouter initialEntries={['/host']}>
        <ThemeProvider>
          <Routes>
            <Route
              path="/host"
              element={
                <>
                  <ThemeProbe />
                  <NavButton to="/" />
                </>
              }
            />
            <Route path="/" element={<ThemeProbe />} />
          </Routes>
        </ThemeProvider>
      </MemoryRouter>,
    )
    act(() => {
      screen.getByRole('button', { name: 'set-hc' }).click()
    })
    act(() => {
      screen.getByRole('button', { name: 'go' }).click()
    })
    expect(screen.getByTestId('theme-id')).toHaveTextContent('high-contrast')
    expect(document.documentElement.dataset.theme).toBe('high-contrast')
  })

  it('updates display theme when a new validated launch query arrives', () => {
    render(
      <MemoryRouter initialEntries={['/display?theme=default']}>
        <ThemeProvider>
          <Routes>
            <Route
              path="/display"
              element={
                <>
                  <ThemeProbe />
                  <NavButton to="/display?theme=high-contrast" />
                </>
              }
            />
          </Routes>
        </ThemeProvider>
      </MemoryRouter>,
    )
    expect(screen.getByTestId('theme-id')).toHaveTextContent('default')
    act(() => {
      screen.getByRole('button', { name: 'go' }).click()
    })
    expect(screen.getByTestId('theme-id')).toHaveTextContent('high-contrast')
    expect(document.documentElement.dataset.theme).toBe('high-contrast')
  })

  it('fails closed when display launch query is invalid', () => {
    renderWithRoute('/display?theme=not-a-theme')
    expect(screen.getByTestId('theme-id')).toHaveTextContent('default')
    expect(document.documentElement.dataset.theme).toBe('default')
  })
})
