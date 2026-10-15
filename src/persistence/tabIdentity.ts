import { systemClock } from '../time/clock'
import { HOST_WINDOW_ID_SESSION_KEY } from './constants'

let fallbackCounter = 0

/**
 * Local host-tab identity for the IndexedDB writer lease.
 * Prefers Web Crypto; never uses Math.random (Sonar typescript:S2245).
 */
export function createTabId(): string {
  const cryptoApi = globalThis.crypto
  if (cryptoApi && typeof cryptoApi.randomUUID === 'function') {
    return cryptoApi.randomUUID()
  }
  if (cryptoApi && typeof cryptoApi.getRandomValues === 'function') {
    const bytes = new Uint8Array(16)
    cryptoApi.getRandomValues(bytes)
    let hex = ''
    for (const byte of bytes) {
      hex += byte.toString(16).padStart(2, '0')
    }
    return `tab-${hex}`
  }
  fallbackCounter += 1
  return `tab-${systemClock.now().toString(36)}-${fallbackCounter.toString(36)}`
}

/** Minimal tab-scoped storage surface (sessionStorage in browsers and Electron). */
export interface TabScopedStorage {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

function defaultSessionStorage(): TabScopedStorage | null {
  try {
    return typeof sessionStorage === 'undefined' ? null : sessionStorage
  } catch {
    return null
  }
}

function isUsableWindowLeaseId(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0 && value.length <= 200
}

/**
 * Claim the window lease identity for a newly loaded document.
 *
 * Reuses the id the SAME tab stashed on its previous pagehide (a reload), and
 * removes the stash while this document is live. A duplicated tab or a
 * window.open copy of sessionStorage therefore never inherits the identity of
 * a window that is still running; it mints a fresh one instead.
 */
export function claimWindowLeaseId(
  storage: TabScopedStorage | null = defaultSessionStorage(),
): string {
  let stashed: string | null = null
  try {
    stashed = storage?.getItem(HOST_WINDOW_ID_SESSION_KEY) ?? null
    storage?.removeItem(HOST_WINDOW_ID_SESSION_KEY)
  } catch {
    stashed = null
  }
  return isUsableWindowLeaseId(stashed) ? stashed : createTabId()
}

/** Hand this window's identity to the next document in the same tab (pagehide). */
export function stashWindowLeaseId(
  id: string,
  storage: TabScopedStorage | null = defaultSessionStorage(),
): void {
  try {
    storage?.setItem(HOST_WINDOW_ID_SESSION_KEY, id)
  } catch {
    // Best-effort: without the stash a reload falls back to the release marker / TTL.
  }
}

let documentWindowLeaseId: string | null = null

/**
 * One window identity per document, shared by every persistence hook instance
 * (Home, Host, Editor) so in-app route changes and same-tab reloads hand the
 * writer lease to themselves instead of to "another window".
 */
export function getDocumentWindowLeaseId(): string {
  if (documentWindowLeaseId !== null) return documentWindowLeaseId
  const id = claimWindowLeaseId()
  documentWindowLeaseId = id
  if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
    window.addEventListener('pagehide', () => stashWindowLeaseId(id))
    window.addEventListener('pageshow', (event) => {
      // Restored from the back/forward cache: this document is live again, so
      // re-claim (remove) the stash. The id itself is unchanged.
      if (event.persisted) claimWindowLeaseId()
    })
  }
  return id
}
