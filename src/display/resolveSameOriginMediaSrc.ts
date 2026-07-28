/**
 * Resolve a validated same-origin relative media path against the app base URL.
 *
 * Kept outside `MediaContentDisplay.tsx` so host and display can share it
 * without triggering the react-refresh "only-export-components" warning.
 */
export function resolveSameOriginMediaSrc(path: string): string {
  const base = import.meta.env.BASE_URL || '/'
  const normalizedBase = base.endsWith('/') ? base : `${base}/`
  // Authored paths are validated to never start with `/`.
  return `${normalizedBase}${path}`
}
