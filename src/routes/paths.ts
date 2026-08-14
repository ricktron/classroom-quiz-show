import { resolveThemeId, type ThemeId } from '../theme/themeRegistry'

/**
 * Central route table.
 *
 * The app uses HASH routing (see docs/architecture/ADR-001-github-pages-routing.md),
 * so these are the in-app paths that appear after the `#`. Keeping them in one
 * place makes it trivial to add future destinations (e.g. `/host/edit`) without
 * scattering string literals through the codebase.
 */
export const ROUTES = {
  root: '/',
  host: '/host',
  edit: '/edit',
  display: '/display',
} as const

export function editPath(gameId?: string): string {
  if (!gameId) return ROUTES.edit
  return `${ROUTES.edit}/${encodeURIComponent(gameId)}`
}

export function playPath(gameId: string): string {
  return `${ROUTES.host}?play=${encodeURIComponent(gameId)}`
}

/** Read the Home → Play game id from a hash-route search string. */
export function playGameIdFromSearch(search: string): string | null {
  const raw = search.startsWith('?') ? search.slice(1) : search
  const value = new URLSearchParams(raw).get('play')
  if (typeof value !== 'string' || value.trim().length === 0) return null
  return value
}

export type RouteKey = keyof typeof ROUTES

/**
 * Build an absolute, shareable URL for a hash route.
 *
 * This deliberately composes three pieces so it stays correct under the
 * GitHub Pages repository base path:
 *   origin + BASE_URL (e.g. "/classroom-quiz-show/") + "#" + hashPath
 *
 * `import.meta.env.BASE_URL` is injected by Vite and already carries the
 * configured `base`, so bookmarks and "open in new window" links keep working
 * whether the app is served from "/" (dev) or "/classroom-quiz-show/" (Pages).
 *
 * @param hashPath an in-app path such as ROUTES.display
 * @param origin   overridable for testing; defaults to window.location.origin
 * @param baseUrl  overridable for testing; defaults to import.meta.env.BASE_URL
 */
export function absoluteHashUrl(
  hashPath: string,
  origin: string = typeof window !== 'undefined' ? window.location.origin : '',
  baseUrl: string = import.meta.env.BASE_URL,
): string {
  const normalizedBase = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`
  const normalizedHash = hashPath.startsWith('/') ? hashPath : `/${hashPath}`
  return `${origin}${normalizedBase}#${normalizedHash}`
}

/**
 * In-app hash path for the projector with a validated theme query.
 * Form: `/display?theme=default` or `/display?theme=high-contrast`.
 */
export function displayPathWithTheme(themeCandidate: unknown): string {
  const themeId = resolveThemeId(themeCandidate)
  const params = new URLSearchParams()
  params.set('theme', themeId)
  return `${ROUTES.display}?${params.toString()}`
}

/**
 * Absolute, base-path-aware URL for opening the named display window with the
 * host's current validated theme ID only.
 */
export function absoluteDisplayUrlWithTheme(
  themeCandidate: unknown,
  origin: string = typeof window !== 'undefined' ? window.location.origin : '',
  baseUrl: string = import.meta.env.BASE_URL,
): string {
  return absoluteHashUrl(displayPathWithTheme(themeCandidate), origin, baseUrl)
}

/** Parse a theme query from a hash-route search string (`?theme=…` or `theme=…`). */
export function themeIdFromDisplaySearch(search: string): ThemeId {
  const raw = search.startsWith('?') ? search.slice(1) : search
  const params = new URLSearchParams(raw)
  if (!params.has('theme')) return resolveThemeId(undefined)
  return resolveThemeId(params.get('theme'))
}
