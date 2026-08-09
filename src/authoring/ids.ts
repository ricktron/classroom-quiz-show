/**
 * Deterministic authoring → canonical ID derivation (Slice 20).
 *
 * Identity is driven by stable workbook keys (GameKey, CategoryOrder,
 * ClueOrder, team order), never by Math.random, crypto.randomUUID, timestamps,
 * or spreadsheet row numbers alone.
 */

import { ID_PATTERN, MAX_ID_LENGTH } from '../import/canonicalFormat'
import type { WorkbookProfile } from './contract'

const FALLBACK = 'x'

export function sanitizeAuthoringToken(raw: string): string {
  const trimmed = raw.trim().toLowerCase()
  let out = ''
  for (const ch of trimmed) {
    if (/[a-z0-9]/.test(ch)) {
      out += ch
    } else if (ch === ' ' || ch === '_' || ch === '.' || ch === '-') {
      out += '-'
    }
  }
  out = out.replace(/-+/g, '-').replace(/^-+|-+$/g, '')
  if (out.length === 0) return FALLBACK
  if (!/^[a-z0-9]/.test(out)) out = `${FALLBACK}-${out}`
  return out.slice(0, MAX_ID_LENGTH)
}

export function ensureCanonicalId(candidate: string): string | null {
  const id = candidate.slice(0, MAX_ID_LENGTH)
  return ID_PATTERN.test(id) ? id : null
}

export function deriveGameCanonicalId(gameKey: string): string | null {
  return ensureCanonicalId(sanitizeAuthoringToken(gameKey))
}

export function deriveBoardRoundId(gameCanonicalId: string): string | null {
  return ensureCanonicalId(`${gameCanonicalId}-board`)
}

export function deriveFinalRoundId(gameCanonicalId: string): string | null {
  return ensureCanonicalId(`${gameCanonicalId}-final`)
}

export function deriveCategoryId(
  gameCanonicalId: string,
  categoryOrder: number,
): string | null {
  return ensureCanonicalId(`${gameCanonicalId}-cat-${categoryOrder}`)
}

export function deriveTileId(
  gameCanonicalId: string,
  categoryOrder: number,
  clueOrder: number,
): string | null {
  return ensureCanonicalId(`${gameCanonicalId}-tile-${categoryOrder}-${clueOrder}`)
}

export function deriveTeamId(gameCanonicalId: string, teamOrder: number): string | null {
  return ensureCanonicalId(`${gameCanonicalId}-team-${teamOrder}`)
}

export function authoringIdentityScope(profile: WorkbookProfile): string {
  return profile
}
