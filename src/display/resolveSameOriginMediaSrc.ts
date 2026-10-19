import { isValidSameOriginPath } from '../game/media/limits'
import { getSharedPackResourceRegistry } from '../pack/resourceRegistry'

/**
 * Join a validated same-origin relative media path against an app base URL.
 *
 * Pure helper so unit tests can prove `/` and `/classroom-quiz-show/` joining
 * without stubbing `import.meta.env`. Returns `null` for malformed paths —
 * never emits a URL the validator would refuse.
 */
export function joinBaseAndMediaPath(base: string, path: string): string | null {
  if (!isValidSameOriginPath(path)) return null
  const normalizedBase = base.endsWith('/') ? base : `${base}/`
  // Authored paths are validated to never start with `/`, so this cannot
  // produce a double-slash after the base, escape the base, or invent a host.
  return `${normalizedBase}${path}`
}

/**
 * Resolve a validated same-origin relative media path against the app base URL.
 *
 * Kept outside `MediaContentDisplay.tsx` so host and display can share it
 * without triggering the react-refresh "only-export-components" warning.
 *
 * Returns `null` when the path fails the shared same-origin grammar — callers
 * must fail closed (no `<img src>`).
 */
/**
 * The PACK blob for this path, or null when no hydrated pack scope carries it.
 *
 * Separate from {@link resolveSameOriginMediaSrc} because the Display must be
 * able to tell "the pack has this" from "fall back to the hosted path": before
 * hydration settles, the hosted path is NOT a safe fallback (FRC-6).
 */
export function resolvePackMediaSrc(path: string): string | null {
  return getSharedPackResourceRegistry().resolveSrc(path)
}

export function resolveSameOriginMediaSrc(path: string): string | null {
  const packSrc = getSharedPackResourceRegistry().resolveSrc(path)
  if (packSrc !== null) return packSrc
  return joinBaseAndMediaPath(import.meta.env.BASE_URL || '/', path)
}
