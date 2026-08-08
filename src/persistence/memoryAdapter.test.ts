import { describe, expect, it } from 'vitest'
import { createMemoryPersistenceAdapter } from './memoryAdapter'

describe('MemoryPersistenceAdapter', () => {
  it('stores and reads values inside transactions', async () => {
    const adapter = createMemoryPersistenceAdapter()
    await expect(adapter.open()).resolves.toEqual({ ok: true, value: undefined })

    const written = await adapter.withTransaction(['savedDefinitions'], async (tx) => {
      await tx.put('savedDefinitions', 'game-1', { title: 'Game 1' })
    })
    expect(written.ok).toBe(true)

    let value: unknown
    const read = await adapter.withTransaction(['savedDefinitions'], async (tx) => {
      value = await tx.get('savedDefinitions', 'game-1')
    })
    expect(read.ok).toBe(true)
    expect(value).toEqual({ title: 'Game 1' })
  })

  it('includes the completed summary store', async () => {
    const adapter = createMemoryPersistenceAdapter()
    await adapter.open()
    expect(
      await adapter.withTransaction(['completedSummaries'], async (tx) => {
        await tx.put('completedSummaries', 'session-1', { savedAt: 1 })
      }),
    ).toEqual({ ok: true, value: undefined })
  })

  it('includes the pack media assets store', async () => {
    const adapter = createMemoryPersistenceAdapter()
    await adapter.open()
    expect(
      await adapter.withTransaction(['packMediaAssets'], async (tx) => {
        await tx.put('packMediaAssets', 'scope\0media/a.png', { bytes: [1] })
      }),
    ).toEqual({ ok: true, value: undefined })
  })

  it('rolls back a transaction when work throws', async () => {
    const adapter = createMemoryPersistenceAdapter()
    await adapter.open()

    const result = await adapter.withTransaction(['activeSessions'], async (tx) => {
      await tx.put('activeSessions', 'current', { value: 1 })
      throw new Error('boom')
    })

    expect(result).toMatchObject({ ok: false, code: 'transaction-failed' })
    let value: unknown = 'unset'
    await adapter.withTransaction(['activeSessions'], async (tx) => {
      value = await tx.get('activeSessions', 'current')
    })
    expect(value).toBeUndefined()
  })

  it('can simulate unavailable storage and transaction failures', async () => {
    const unavailable = createMemoryPersistenceAdapter({ unavailable: true })
    expect(await unavailable.open()).toMatchObject({ ok: false, code: 'unavailable' })

    const failing = createMemoryPersistenceAdapter({ failTransactions: true })
    await failing.open()
    expect(await failing.withTransaction(['coordination'], async () => undefined)).toMatchObject({
      ok: false,
      code: 'transaction-failed',
    })
  })
})
