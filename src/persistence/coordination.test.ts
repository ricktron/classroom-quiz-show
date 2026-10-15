import { describe, expect, it } from 'vitest'
import { createManualClock } from '../time/clock'
import {
  acquireOrRenewHostLease,
  createMemoryReleaseLedger,
  createStorageReleaseLedger,
  markHostLeaseReleasedSync,
  releaseHostLease,
} from './coordination'
import { HOST_WRITER_LEASE_TTL_MS, HOST_WRITER_RELEASE_STORAGE_KEY } from './constants'
import { createMemoryPersistenceAdapter } from './memoryAdapter'

/**
 * Q7 R1 blocker 7 — same-window handoff. Every case below runs with NO clock
 * advance: "immediately" means before HOST_WRITER_LEASE_TTL_MS could expire.
 */
describe('host writer lease same-window handoff', () => {
  async function leaderSetup() {
    const adapter = createMemoryPersistenceAdapter()
    await adapter.open()
    const clock = createManualClock(10_000)
    const releaseLedger = createMemoryReleaseLedger()
    const base = { adapter, clock, releaseLedger, broadcastChannel: null }
    expect(
      await acquireOrRenewHostLease({ ...base, tabId: 'doc-1', windowId: 'window-A' }),
    ).toEqual({ ok: true, value: 'leader' })
    return { adapter, clock, releaseLedger, base }
  }

  it('lets the same window reclaim its own live lease immediately after a reload', async () => {
    const { base, clock } = await leaderSetup()
    // Reload: the old document never ran cleanup; a new instance id, same window id.
    expect(
      await acquireOrRenewHostLease({ ...base, tabId: 'doc-2', windowId: 'window-A' }),
    ).toEqual({ ok: true, value: 'leader' })
    expect(clock.now()).toBe(10_000)
  })

  it('keeps a genuinely different live window read-only (follower)', async () => {
    const { base } = await leaderSetup()
    expect(
      await acquireOrRenewHostLease({ ...base, tabId: 'doc-B', windowId: 'window-B' }),
    ).toEqual({ ok: true, value: 'follower' })
    // No window identity at all (legacy / injected) is still a foreign window.
    expect(await acquireOrRenewHostLease({ ...base, tabId: 'doc-C', windowId: null })).toEqual({
      ok: true,
      value: 'follower',
    })
  })

  it('still blocks a second window after the owner renews, until the TTL really lapses', async () => {
    const { base, clock } = await leaderSetup()
    clock.advance(HOST_WRITER_LEASE_TTL_MS - 1)
    await acquireOrRenewHostLease({ ...base, tabId: 'doc-1', windowId: 'window-A' })
    clock.advance(HOST_WRITER_LEASE_TTL_MS - 1)
    expect(
      await acquireOrRenewHostLease({ ...base, tabId: 'doc-B', windowId: 'window-B' }),
    ).toEqual({ ok: true, value: 'follower' })
  })

  it('makes a lease released synchronously on pagehide claimable immediately', async () => {
    const { base } = await leaderSetup()
    markHostLeaseReleasedSync({ ...base, tabId: 'doc-1', windowId: 'window-A' })
    // e.g. Electron quit -> relaunch: a brand-new window id, nothing in IndexedDB changed.
    expect(
      await acquireOrRenewHostLease({ ...base, tabId: 'relaunch', windowId: 'window-R' }),
    ).toEqual({ ok: true, value: 'leader' })
  })

  it('makes a lease released through IndexedDB claimable immediately', async () => {
    const { base } = await leaderSetup()
    await releaseHostLease({ ...base, tabId: 'doc-1' })
    expect(
      await acquireOrRenewHostLease({ ...base, tabId: 'doc-B', windowId: 'window-B' }),
    ).toEqual({ ok: true, value: 'leader' })
  })

  it('ignores a release marker once the owner renewed afterwards (back/forward restore)', async () => {
    const { base, clock } = await leaderSetup()
    markHostLeaseReleasedSync({ ...base, tabId: 'doc-1', windowId: 'window-A' })
    clock.advance(10)
    await acquireOrRenewHostLease({ ...base, tabId: 'doc-1', windowId: 'window-A' })
    expect(
      await acquireOrRenewHostLease({ ...base, tabId: 'doc-B', windowId: 'window-B' }),
    ).toEqual({ ok: true, value: 'follower' })
  })

  it('ignores a release marker written by a different owner', async () => {
    const { base, releaseLedger } = await leaderSetup()
    releaseLedger.write({ ownerId: 'someone-else', releasedAt: 99_999 })
    expect(
      await acquireOrRenewHostLease({ ...base, tabId: 'doc-B', windowId: 'window-B' }),
    ).toEqual({ ok: true, value: 'follower' })
  })

  it('treats a legacy lease record without a window id as foreign until it expires', async () => {
    const adapter = createMemoryPersistenceAdapter()
    await adapter.open()
    const clock = createManualClock(10_000)
    await acquireOrRenewHostLease({ adapter, tabId: 'legacy', clock, broadcastChannel: null })
    expect(
      await acquireOrRenewHostLease({
        adapter,
        tabId: 'doc-2',
        clock,
        windowId: 'window-A',
        broadcastChannel: null,
      }),
    ).toEqual({ ok: true, value: 'follower' })
  })

  it('stores the release marker in Web Storage and fails closed on garbage', () => {
    const backing = new Map<string, string>()
    const storage = {
      getItem: (key: string) => backing.get(key) ?? null,
      setItem: (key: string, value: string) => {
        backing.set(key, value)
      },
    }
    const ledger = createStorageReleaseLedger(storage)!
    expect(ledger.read()).toBeNull()
    ledger.write({ ownerId: 'doc-1', releasedAt: 5 })
    expect(ledger.read()).toEqual({ ownerId: 'doc-1', releasedAt: 5 })
    backing.set(HOST_WRITER_RELEASE_STORAGE_KEY, '{not json')
    expect(ledger.read()).toBeNull()
    backing.set(HOST_WRITER_RELEASE_STORAGE_KEY, JSON.stringify({ ownerId: '', releasedAt: 1 }))
    expect(ledger.read()).toBeNull()
    expect(createStorageReleaseLedger(null)).toBeNull()
  })
})

describe('host writer coordination', () => {
  it('grants the first tab leadership and makes a second tab a follower', async () => {
    const adapter = createMemoryPersistenceAdapter()
    await adapter.open()
    const clock = createManualClock(1_000)

    expect(await acquireOrRenewHostLease({ adapter, tabId: 'tab-a', clock })).toEqual({
      ok: true,
      value: 'leader',
    })
    expect(await acquireOrRenewHostLease({ adapter, tabId: 'tab-b', clock })).toEqual({
      ok: true,
      value: 'follower',
    })
  })

  it('renews the owner lease and allows takeover after expiry', async () => {
    const adapter = createMemoryPersistenceAdapter()
    await adapter.open()
    const clock = createManualClock(1_000)

    await acquireOrRenewHostLease({ adapter, tabId: 'tab-a', clock, leaseTtlMs: 100 })
    clock.advance(50)
    expect(await acquireOrRenewHostLease({ adapter, tabId: 'tab-a', clock, leaseTtlMs: 100 })).toEqual({
      ok: true,
      value: 'leader',
    })
    clock.advance(101)
    expect(await acquireOrRenewHostLease({ adapter, tabId: 'tab-b', clock, leaseTtlMs: 100 })).toEqual({
      ok: true,
      value: 'leader',
    })
  })

  it('prevents a stale owner from overwriting a current owner', async () => {
    const adapter = createMemoryPersistenceAdapter()
    await adapter.open()
    const clock = createManualClock(1_000)

    await acquireOrRenewHostLease({ adapter, tabId: 'tab-a', clock, leaseTtlMs: 100 })
    clock.advance(101)
    await acquireOrRenewHostLease({ adapter, tabId: 'tab-b', clock, leaseTtlMs: 100 })

    expect(await acquireOrRenewHostLease({ adapter, tabId: 'tab-a', clock, leaseTtlMs: 100 })).toEqual({
      ok: true,
      value: 'follower',
    })
  })

  it('releases only the current owner', async () => {
    const adapter = createMemoryPersistenceAdapter()
    await adapter.open()
    const clock = createManualClock(1_000)

    await acquireOrRenewHostLease({ adapter, tabId: 'tab-a', clock })
    await releaseHostLease({ adapter, tabId: 'tab-b', clock })
    expect(await acquireOrRenewHostLease({ adapter, tabId: 'tab-c', clock })).toEqual({
      ok: true,
      value: 'follower',
    })

    await releaseHostLease({ adapter, tabId: 'tab-a', clock })
    expect(await acquireOrRenewHostLease({ adapter, tabId: 'tab-c', clock })).toEqual({
      ok: true,
      value: 'leader',
    })
  })
})
