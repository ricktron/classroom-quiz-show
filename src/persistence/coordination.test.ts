import { describe, expect, it } from 'vitest'
import { createManualClock } from '../time/clock'
import {
  acquireOrRenewHostLease,
  releaseHostLease,
} from './coordination'
import { createMemoryPersistenceAdapter } from './memoryAdapter'

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
