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
  display: '/display',
} as const

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
