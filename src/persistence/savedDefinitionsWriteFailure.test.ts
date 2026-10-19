import { describe, expect, it } from 'vitest'
import { createSampleGame } from '../game/sampleGame'
import { createMemoryPersistenceAdapter } from './memoryAdapter'
import { listSavedDefinitions, loadDefinition, saveDefinition } from './savedDefinitions'

/**
 * Phase 3 R5 — a storage transaction failure is not record corruption.
 *
 * Fail-first: before the repair, `saveDefinition` remapped every
 * `transaction-failed` result to `corrupt` with copy that accused the Game
 * record. A refused write must never say that without corruption evidence.
 */
describe('saved definitions write-failure classification (FRC Phase 3 R5)', () => {
  it('does not call a failed write transaction corrupt', async () => {
    const adapter = createMemoryPersistenceAdapter({ failTransactions: true })
    await adapter.open()

    const result = await saveDefinition(adapter, createSampleGame(), { mode: 'save' })

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.code).toBe('transaction-failed')
    expect(result.message).not.toMatch(/corrupt/i)
    expect(result.message).toMatch(/could not be saved/i)
  })

  it('still reports corrupt when a stored record is actually unreadable', async () => {
    const adapter = createMemoryPersistenceAdapter()
    await adapter.open()
    await adapter.withTransaction(['savedDefinitions'], async (tx) => {
      await tx.put('savedDefinitions', 'bad', { recordVersion: 1, gameId: 'bad' })
    })

    expect(await loadDefinition(adapter, 'bad')).toMatchObject({ ok: false, code: 'corrupt' })
    expect(await listSavedDefinitions(adapter)).toMatchObject({ ok: false, code: 'corrupt' })
  })

  it('does not accuse an existing good record of corruption when a replace write fails', async () => {
    const adapter = createMemoryPersistenceAdapter()
    await adapter.open()
    const definition = createSampleGame()
    expect(await saveDefinition(adapter, definition, { mode: 'save' })).toMatchObject({
      ok: true,
      value: 'created',
    })

    const original = adapter.withTransaction.bind(adapter)
    adapter.withTransaction = async () => ({
      ok: false,
      code: 'transaction-failed',
      message: 'The persistence transaction failed.',
    })

    const result = await saveDefinition(
      adapter,
      { ...definition, title: 'Changed Title' },
      { mode: 'replace' },
    )
    adapter.withTransaction = original

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.code).toBe('transaction-failed')
    expect(result.message).not.toMatch(/corrupt/i)
    expect(result.message).toMatch(/could not be saved|could not be replaced/i)
  })

  it('teacher-visible write failure copy never says the Game record is corrupt', async () => {
    // Mirrors the Host/library save path: the PersistenceResult.message is what
    // surfaces (or is wrapped) when a write is refused.
    const adapter = createMemoryPersistenceAdapter({ failTransactions: true })
    await adapter.open()
    const result = await saveDefinition(adapter, createSampleGame(), { mode: 'save' })
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.message).toBe(
      'The game could not be saved. Existing saved games were left as they were.',
    )
  })
})
