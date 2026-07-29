import type { Clock } from '../time/clock'
import type { PersistenceAdapter } from './adapter'
import {
  HOST_WRITER_LEASE_KEY,
  HOST_WRITER_LEASE_TTL_MS,
  OBJECT_STORE_COORDINATION,
} from './constants'
import { persistenceErr, persistenceOk, type PersistenceResult } from './results'

export interface HostLeaseRecord {
  readonly ownerId: string
  readonly acquiredAt: number
  readonly expiresAt: number
}

export interface LeadershipOptions {
  readonly adapter: PersistenceAdapter
  readonly tabId: string
  readonly clock: Clock
  readonly leaseTtlMs?: number
  readonly broadcastChannel?: BroadcastChannel | null
}

export async function acquireOrRenewHostLease(
  opts: LeadershipOptions,
): Promise<PersistenceResult<'leader' | 'follower'>> {
  let outcome: 'leader' | 'follower' = 'follower'
  let becameLeader = false
  const result = await opts.adapter.withTransaction([OBJECT_STORE_COORDINATION], async (tx) => {
    const existing = readHostLeaseRecord(
      await tx.get(OBJECT_STORE_COORDINATION, HOST_WRITER_LEASE_KEY),
    )
    const now = opts.clock.now()
    const validOther =
      existing !== null &&
      existing.ownerId !== opts.tabId &&
      existing.expiresAt > now

    if (validOther) {
      outcome = 'follower'
      return
    }

    const ttl = opts.leaseTtlMs ?? HOST_WRITER_LEASE_TTL_MS
    const next: HostLeaseRecord = {
      ownerId: opts.tabId,
      acquiredAt: now,
      expiresAt: now + ttl,
    }
    await tx.put(OBJECT_STORE_COORDINATION, HOST_WRITER_LEASE_KEY, next)
    outcome = 'leader'
    becameLeader = true
  })
  if (!result.ok) return result
  if (becameLeader) notify(opts, 'host-lease-acquired')
  return persistenceOk(outcome)
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

function readHostLeaseRecord(input: unknown): HostLeaseRecord | null {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) return null
  const record = input as Record<string, unknown>
  if (typeof record.ownerId !== 'string' || record.ownerId.length === 0) return null
  if (typeof record.acquiredAt !== 'number' || !Number.isInteger(record.acquiredAt)) return null
  if (typeof record.expiresAt !== 'number' || !Number.isInteger(record.expiresAt)) return null
  return {
    ownerId: record.ownerId,
    acquiredAt: record.acquiredAt,
    expiresAt: record.expiresAt,
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
