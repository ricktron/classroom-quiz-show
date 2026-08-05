import {
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { useLocation } from 'react-router-dom'
import {
  DEFAULT_THEME_ID,
  resolveThemeId,
  type ThemeId,
} from './themeRegistry'
import { ROUTES } from '../routes/paths'

type ThemeContextValue = {
  readonly themeId: ThemeId
  readonly setThemeId: (candidate: unknown) => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

function readHashRoute(): { pathname: string; search: string } {
  const raw = window.location.hash.replace(/^#/, '')
  const [pathnamePart = '/', searchPart = ''] = raw.split('?')
  const pathname = pathnamePart.startsWith('/') ? pathnamePart : `/${pathnamePart}`
  return { pathname, search: searchPart ? `?${searchPart}` : '' }
}

function themeQueryFromSearch(search: string): string | null {
  const params = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search)
  return params.has('theme') ? (params.get('theme') ?? '') : null
}

function prefersMoreContrast(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false
  }
  return window.matchMedia('(prefers-contrast: more)').matches
}

/**
 * Initial per-window theme:
 * 1. Explicit `/display?theme=` launch query → resolveThemeId (fail closed).
 * 2. Else optional one-time prefers-contrast: more seed.
 * 3. Else default.
 *
 * An explicit (even hostile) query never falls through to the OS hint.
 */
export function resolveInitialThemeId(
  location: { pathname: string; search: string } = readHashRoute(),
): ThemeId {
  if (location.pathname === ROUTES.display) {
    const explicit = themeQueryFromSearch(location.search)
    if (explicit !== null) {
      return resolveThemeId(explicit)
    }
  }
  if (prefersMoreContrast()) return 'high-contrast'
  return DEFAULT_THEME_ID
}

function applyThemeMarker(themeId: ThemeId): void {
  document.documentElement.dataset.theme = themeId
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const location = useLocation()
  const [themeId, setThemeIdState] = useState<ThemeId>(() => resolveInitialThemeId())

  const setThemeId = useCallback((candidate: unknown) => {
    setThemeIdState(resolveThemeId(candidate))
  }, [])

  // Display launch URL changes (named window reopen) update the display theme.
  useLayoutEffect(() => {
    if (location.pathname !== ROUTES.display) return
    const explicit = themeQueryFromSearch(location.search)
    if (explicit === null) return
    setThemeIdState(resolveThemeId(explicit))
  }, [location.pathname, location.search])

  useLayoutEffect(() => {
    applyThemeMarker(themeId)
  }, [themeId])

  const value = useMemo(
    () => ({ themeId, setThemeId }),
    [themeId, setThemeId],
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext)
  if (!ctx) {
    throw new Error('useTheme must be used within ThemeProvider')
  }
  return ctx
}

/** Null outside a provider — used by HostRoute's test-harness fallback only. */
export function useOptionalTheme(): ThemeContextValue | null {
  return useContext(ThemeContext)
}
