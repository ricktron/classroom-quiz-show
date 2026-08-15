/**
 * Session-owned classroom team identities.
 *
 * These names belong to one class run. They must never be written back into a
 * reusable Game / saved definition. Persistence uses page-local storage only —
 * no IndexedDB, session-wire, or public-state version change.
 */

import { canPersistMutations, type PersistLeadership } from '../host/writeAuthority'
import { isValidSessionTeamName, teamNameUniquenessKey } from './teamNameSelection'

export const SESSION_TEAM_IDENTITIES_STORAGE_KEY = 'cqs.session-team-identities.v1'

export interface SessionTeamIdentitiesRecord {
  readonly sessionId: string
  readonly gameId: string
  readonly names: Readonly<Record<string, string>>
}

export interface SessionTeamIdentitiesStore {
  readonly getItem: (key: string) => string | null
  readonly setItem: (key: string, value: string) => void
  readonly removeItem: (key: string) => void
}

function memoryStore(): SessionTeamIdentitiesStore {
  const data = new Map<string, string>()
  return {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => {
      data.set(key, value)
    },
    removeItem: (key) => {
      data.delete(key)
    },
  }
}

function defaultStore(): SessionTeamIdentitiesStore {
  try {
    if (typeof localStorage !== 'undefined') return localStorage
  } catch {
    // Private mode / blocked storage falls back to memory.
  }
  return memoryStore()
}

function sanitizeNames(names: Readonly<Record<string, string>>): Record<string, string> {
  const next: Record<string, string> = {}
  const seen = new Set<string>()
  for (const [teamId, raw] of Object.entries(names)) {
    if (typeof teamId !== 'string' || teamId.length === 0) continue
    if (typeof raw !== 'string' || !isValidSessionTeamName(raw)) continue
    const name = raw.trim().replace(/\s+/g, ' ')
    const key = teamNameUniquenessKey(name)
    if (seen.has(key)) continue
    seen.add(key)
    next[teamId] = name
  }
  return next
}

export function readSessionTeamIdentities(
  sessionId: string,
  gameId: string,
  store: SessionTeamIdentitiesStore = defaultStore(),
): SessionTeamIdentitiesRecord | null {
  const raw = store.getItem(SESSION_TEAM_IDENTITIES_STORAGE_KEY)
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as Partial<SessionTeamIdentitiesRecord>
    if (parsed.sessionId !== sessionId || parsed.gameId !== gameId) return null
    if (typeof parsed.names !== 'object' || parsed.names === null) return null
    return {
      sessionId,
      gameId,
      names: sanitizeNames(parsed.names as Record<string, string>),
    }
  } catch {
    return null
  }
}

export function writeSessionTeamIdentities(
  record: SessionTeamIdentitiesRecord,
  leadership: PersistLeadership,
  store: SessionTeamIdentitiesStore = defaultStore(),
): { readonly ok: boolean } {
  if (!canPersistMutations(leadership)) return { ok: false }
  const payload: SessionTeamIdentitiesRecord = {
    sessionId: record.sessionId,
    gameId: record.gameId,
    names: sanitizeNames(record.names),
  }
  try {
    store.setItem(SESSION_TEAM_IDENTITIES_STORAGE_KEY, JSON.stringify(payload))
    return { ok: true }
  } catch {
    return { ok: false }
  }
}

export function clearSessionTeamIdentities(
  leadership: PersistLeadership,
  store: SessionTeamIdentitiesStore = defaultStore(),
): { readonly ok: boolean } {
  if (!canPersistMutations(leadership)) return { ok: false }
  try {
    store.removeItem(SESSION_TEAM_IDENTITIES_STORAGE_KEY)
    return { ok: true }
  } catch {
    return { ok: false }
  }
}

export function namesByTeamOrder(
  teamIds: readonly string[],
  names: Readonly<Record<string, string>>,
  fallbackNames: readonly string[],
): string[] {
  return teamIds.map((teamId, index) => names[teamId] ?? fallbackNames[index] ?? `Team ${index + 1}`)
}
