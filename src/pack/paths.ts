import { GAME_ENTRY_PATH, MANIFEST_PATH, MEDIA_PREFIX } from './constants'
import { isValidSameOriginPath } from '../game/media/limits'

/**
 * Safe portable-pack entry paths (Slice 19).
 *
 * Pack v1 allows exactly:
 *   cqs-pack.json
 *   game.classroom-quiz-show.json
 *   media/<canonical same-origin path>
 */

const ROOT_ENTRY_PATHS: ReadonlySet<string> = new Set([MANIFEST_PATH, GAME_ENTRY_PATH])

/** Reject ZIP entry paths before treating them as application entries. */
export function validatePackEntryPath(path: string): boolean {
  if (path.length === 0) return false
  if (path.startsWith('/')) return false
  if (path.includes('\\')) return false
  if (/^[A-Za-z]:/.test(path)) return false
  if (path.includes(':')) return false
  if (path.includes('?') || path.includes('#')) return false
  if (path.includes('\0')) return false
  if (path.includes('%')) return false
  if (/\s/.test(path)) return false
  if (path.includes('..')) return false
  if (path.includes('//')) return false
  if (path.endsWith('/')) return false
  if (path.startsWith('./') || path.startsWith('.')) return false
  for (const segment of path.split('/')) {
    if (segment === '.' || segment === '') return false
  }
  return true
}

/** Map a canonical same-origin source path to its deterministic pack entry path. */
export function toPackMediaPath(sourcePath: string): string | null {
  if (!isValidSameOriginPath(sourcePath)) return null
  return `${MEDIA_PREFIX}${sourcePath}`
}

/** Parse a pack media entry path back to its canonical source path. */
export function sourcePathFromPackMediaPath(packPath: string): string | null {
  if (!packPath.startsWith(MEDIA_PREFIX)) return null
  const sourcePath = packPath.slice(MEDIA_PREFIX.length)
  if (!isValidSameOriginPath(sourcePath)) return null
  if (toPackMediaPath(sourcePath) !== packPath) return null
  return sourcePath
}

/** Whether a validated ZIP entry path is allowed in pack v1. */
export function isAllowedV1EntryPath(path: string): boolean {
  if (!validatePackEntryPath(path)) return false
  if (ROOT_ENTRY_PATHS.has(path)) return true
  return sourcePathFromPackMediaPath(path) !== null
}

export interface PackPathTracker {
  readonly has: (path: string) => boolean
  readonly add: (path: string) => { readonly ok: true } | { readonly ok: false; readonly reason: 'duplicate' | 'case-collision' }
}

/** Track exact and case-insensitive collisions for ZIP entry paths. */
export function createPackPathTracker(): PackPathTracker {
  const exact = new Set<string>()
  const lower = new Set<string>()

  return {
    has(path: string): boolean {
      return exact.has(path)
    },
    add(path: string): { readonly ok: true } | { readonly ok: false; readonly reason: 'duplicate' | 'case-collision' } {
      if (exact.has(path)) {
        return { ok: false, reason: 'duplicate' }
      }
      const normalized = path.toLowerCase()
      if (lower.has(normalized)) {
        return { ok: false, reason: 'case-collision' }
      }
      exact.add(path)
      lower.add(normalized)
      return { ok: true }
    },
  }
}

export function isManifestPath(path: string): boolean {
  return path === MANIFEST_PATH
}

export function isGameEntryPath(path: string): boolean {
  return path === GAME_ENTRY_PATH
}

export function isMediaEntryPath(path: string): boolean {
  return sourcePathFromPackMediaPath(path) !== null
}
