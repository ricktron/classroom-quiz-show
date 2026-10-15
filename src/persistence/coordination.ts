import type { Clock } from '../time/clock'
import type { PersistenceAdapter } from './adapter'
import {
  HOST_WRITER_LEASE_KEY,
  HOST_WRITER_LEASE_TTL_MS,
  HOST_WRITER_RELEASE_STORAGE_KEY,
  OBJECT_STORE_COORDINATION,
} from './constants'
import { persistenceErr, persistenceOk, type PersistenceResult } from './results'

export interface HostLeaseRecord {
  readonly ownerId: string
  readonly acquiredAt: number
  readonly expiresAt: number
  /**
   * Stable identity of the browser tab / Electron window that owns the lease.
   * Optional so records written before the same-window handoff stay readable.
   */
  readonly windowId?: string
}

/** Synchronous record that a lease owner gave up the lease while unloading. */
export interface HostLeaseReleaseMarker {
  readonly ownerId: string
  readonly releasedAt: number
}

/**
 * Synchronous same-origin store for the release marker. IndexedDB cannot
 * commit reliably during pagehide, so the outgoing owner writes this instead.
 */
export interface HostLeaseReleaseLedger {
  read(): HostLeaseReleaseMarker | null
  write(marker: HostLeaseReleaseMarker): void
}

export interface LeadershipOptions {
  readonly adapter: PersistenceAdapter
  readonly tabId: string
  readonly clock: Clock
  readonly leaseTtlMs?: number
  readonly broadcastChannel?: BroadcastChannel | null
  /**
   * Identity of the window this hook instance lives in. A live lease held by a
   * different instance of the SAME window (an earlier document before a
   * reload, or the previous route) is this window's own and may be reclaimed.
   * Null/undefined disables same-window reclaim.
   */
  readonly windowId?: string | null
  readonly releaseLedger?: HostLeaseReleaseLedger | null
}

export async function acquireOrRenewHostLease(
  opts: LeadershipOptions,
): Promise<PersistenceResult<'leader' | 'follower'>> {
  let outcome: 'leader' | 'follower' = 'follower'
  let becameLeader = false
  const releaseMarker = readReleaseMarkerSafely(opts.releaseLedger)
  const result = await opts.adapter.withTransaction([OBJECT_STORE_COORDINATION], async (tx) => {
    const existing = readHostLeaseRecord(
      await tx.get(OBJECT_STORE_COORDINATION, HOST_WRITER_LEASE_KEY),
    )
    const now = opts.clock.now()
    if (existing !== null && isLiveForeignLease(existing, opts, now, releaseMarker)) {
      outcome = 'follower'
      return
    }

    const ttl = opts.leaseTtlMs ?? HOST_WRITER_LEASE_TTL_MS
    const next: HostLeaseRecord = {
      ownerId: opts.tabId,
      acquiredAt: now,
      expiresAt: now + ttl,
      ...(opts.windowId ? { windowId: opts.windowId } : {}),
    }
    await tx.put(OBJECT_STORE_COORDINATION, HOST_WRITER_LEASE_KEY, next)
    outcome = 'leader'
    becameLeader = true
  })
  if (!result.ok) return result
  if (becameLeader) notify(opts, 'host-lease-acquired')
  return persistenceOk(outcome)
}

/**
 * Whether `existing` belongs to a genuinely different, still-live window.
 *
 * Not foreign: our own instance id; the same window id (an earlier document in
 * this tab, or a sibling route instance); an expired lease; or a lease whose
 * owner wrote a release marker after its last renewal (it unloaded).
 */
export function isLiveForeignLease(
  existing: HostLeaseRecord,
  opts: Pick<LeadershipOptions, 'tabId' | 'windowId'>,
  now: number,
  releaseMarker: HostLeaseReleaseMarker | null,
): boolean {
  if (existing.ownerId === opts.tabId) return false
  if (opts.windowId && existing.windowId === opts.windowId) return false
  if (existing.expiresAt <= now) return false
  if (
    releaseMarker !== null &&
    releaseMarker.ownerId === existing.ownerId &&
    releaseMarker.releasedAt >= existing.acquiredAt
  ) {
    return false
  }
  return true
}

export async function releaseHostLease(
  opts: LeadershipOptions,
): Promise<PersistenceResult<void>> {
  const result = await opts.adapter.withTransaction([OBJECT_STORE_COORDINATION], async (tx) => {
    const existing = readHostLeaseRecord(
      await tx.get(OBJECT_STORE_COORDINATION, HOST_WRITER_LEASE_KEY),
    )
    if (existing === null) return
    if (existing.ownerId !== opts.tabId) return
    await tx.delete(OBJECT_STORE_COORDINATION, HOST_WRITER_LEASE_KEY)
  })
  if (!result.ok) return result
  notify(opts, 'host-lease-released')
  return persistenceOk(undefined)
}

/**
 * Synchronous part of giving up the lease while the page is unloading
 * (pagehide). Writes the release marker and tells other windows right away;
 * the caller should still start the async IndexedDB release as best effort.
 */
export function markHostLeaseReleasedSync(opts: LeadershipOptions): void {
  try {
    opts.releaseLedger?.write({ ownerId: opts.tabId, releasedAt: opts.clock.now() })
  } catch {
    // Best-effort only; the TTL remains the backstop.
  }
  notify(opts, 'host-lease-released')
}

/** Release ledger backed by same-origin Web Storage (localStorage). */
export function createStorageReleaseLedger(
  storage: Pick<Storage, 'getItem' | 'setItem'> | null,
): HostLeaseReleaseLedger | null {
  if (storage === null) return null
  return {
    read() {
      const raw = storage.getItem(HOST_WRITER_RELEASE_STORAGE_KEY)
      if (raw === null) return null
      try {
        return readReleaseMarker(JSON.parse(raw))
      } catch {
        return null
      }
    },
    write(marker) {
      storage.setItem(HOST_WRITER_RELEASE_STORAGE_KEY, JSON.stringify(marker))
    },
  }
}

/** In-memory ledger for tests and for sharing between simulated windows. */
export function createMemoryReleaseLedger(): HostLeaseReleaseLedger {
  let marker: HostLeaseReleaseMarker | null = null
  return {
    read: () => marker,
    write: (next) => {
      marker = next
    },
  }
}

function readReleaseMarkerSafely(
  ledger: HostLeaseReleaseLedger | null | undefined,
): HostLeaseReleaseMarker | null {
  if (!ledger) return null
  try {
    return readReleaseMarker(ledger.read())
  } catch {
    return null
  }
}

function readReleaseMarker(input: unknown): HostLeaseReleaseMarker | null {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) return null
  const record = input as Record<string, unknown>
  if (typeof record.ownerId !== 'string' || record.ownerId.length === 0) return null
  if (typeof record.releasedAt !== 'number' || !Number.isInteger(record.releasedAt)) return null
  return { ownerId: record.ownerId, releasedAt: record.releasedAt }
}

function readHostLeaseRecord(input: unknown): HostLeaseRecord | null {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) return null
  const record = input as Record<string, unknown>
  if (typeof record.ownerId !== 'string' || record.ownerId.length === 0) return null
  if (typeof record.acquiredAt !== 'number' || !Number.isInteger(record.acquiredAt)) return null
  if (typeof record.expiresAt !== 'number' || !Number.isInteger(record.expiresAt)) return null
  const windowId =
    typeof record.windowId === 'string' && record.windowId.length > 0 ? record.windowId : undefined
  return {
    ownerId: record.ownerId,
    acquiredAt: record.acquiredAt,
    expiresAt: record.expiresAt,
    ...(windowId ? { windowId } : {}),
  }
}

function notify(opts: LeadershipOptions, type: string): void {
  try {
    opts.broadcastChannel?.postMessage({
      type,
      ownerId: opts.tabId,
      sentAt: opts.clock.now(),
    })
  } catch {
    // Best-effort only. The transaction above is authoritative.
  }
}

export function followerResult(): PersistenceResult<'follower'> {
  return persistenceErr('follower', 'Another host tab currently owns the persistence lease.')
}
