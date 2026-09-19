import { describe, expect, it } from 'vitest'
import { createDefaultRegistry } from '../game/defaultRegistry'
import { createSampleGame } from '../game/sampleGame'
import { createMemoryPersistenceAdapter } from '../persistence/memoryAdapter'
import { saveDefinition } from '../persistence/savedDefinitions'
import { createSessionStore } from '../state/store'
import { buildBackupFromAdapter } from './buildBackup'

/**
 * Backup files intentionally contain classroom content. They must never be
 * projected: PublicState / Display remain free of backup envelopes.
 */
describe('backup privacy / Host-Display boundary', () => {
  it('does not place backup format fields onto PublicState', async () => {
    const adapter = createMemoryPersistenceAdapter()
    await adapter.open()
    const registry = createDefaultRegistry()
    const game = createSampleGame()
    await saveDefinition(adapter, game, { mode: 'save', registry })
    const built = await buildBackupFromAdapter({ adapter, registry })
    expect(built.status).toBe('success')
    if (built.status !== 'success') return

    const store = createSessionStore({ registry })
    store.dispatch({
      type: 'INITIALIZE_GAME',
      definition: game,
      issuedAt: 1,
    })
    const publicState = store.getPublicState()
    const text = JSON.stringify(publicState)
    expect(text).not.toContain('classroom-quiz-show/backup')
    expect(text).not.toContain(built.jsonText.slice(0, 80))
    expect(text).not.toContain('bytesBase64')
    expect(Object.keys(publicState as object).join(',')).not.toMatch(/backup/i)
  })
})
