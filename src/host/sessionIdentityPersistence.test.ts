import { describe, expect, it } from 'vitest'
import { importGameFromUnknown } from '../import/importGame'
import { richBoardConfig } from '../test/categoryBoardFixtures'
import { teamBoardGameFile, twoTeams } from '../test/teamFixtures'
import { createMemoryPersistenceAdapter } from '../persistence/memoryAdapter'
import { listCompletedSummaries, saveCompletedAndClearActive } from '../persistence/completedSummaries'
import { buildCompletedSummaryRecordV1 } from '../summary/completedSummary/record'
import { createSessionStore } from '../state/store'
import { createSessionId, setCreateSessionIdForTests } from './sessionIdentity'

describe('durable session identity for completed summaries', () => {
  it('assigns distinct session ids across simulated process lifetimes', () => {
    let seq = 0
    setCreateSessionIdForTests(() => `lifetime-${++seq}`)
    expect(createSessionId()).toBe('lifetime-1')
    expect(createSessionId()).toBe('lifetime-2')
    setCreateSessionIdForTests(null)
  })

  it('persists two completed summaries without overwrite after a lifetime reset', async () => {
    const adapter = createMemoryPersistenceAdapter()
    await adapter.open()

    let seq = 0
    setCreateSessionIdForTests(() => `class-${++seq}`)
    const sessionA = createSessionId()
    const { history: historyA, definition } = endGameHistory(sessionA)

    const recordA = await buildCompletedSummaryRecordV1(historyA, { savedAt: 1, classLabel: null })
    if (recordA.status !== 'success') throw new Error('summary A failed')
    await saveCompletedAndClearActive(adapter, historyA, { savedAt: 1, classLabel: null })

    setCreateSessionIdForTests(null)
    setCreateSessionIdForTests(() => `class-${++seq}`)
    const sessionB = createSessionId()
    expect(sessionB).not.toBe(sessionA)

    const { history: historyB } = endGameHistory(sessionB, definition)
    const recordB = await buildCompletedSummaryRecordV1(historyB, { savedAt: 2, classLabel: null })
    if (recordB.status !== 'success') throw new Error('summary B failed')
    await saveCompletedAndClearActive(adapter, historyB, { savedAt: 2, classLabel: null })

    const listings = await listCompletedSummaries(adapter)
    expect(listings.ok).toBe(true)
    if (!listings.ok) return
    expect(listings.value.map((entry) => entry.key).sort()).toEqual([sessionA, sessionB].sort())

    setCreateSessionIdForTests(null)
  })
})

function endGameHistory(sessionId: string, definition = loadDefinitionFixture()) {
  const store = createSessionStore()
  store.dispatch({ type: 'INIT_SESSION', issuedAt: 10, sessionId })
  store.dispatch({ type: 'INITIALIZE_GAME', issuedAt: 11, definition })
  store.dispatch({ type: 'END_GAME_SESSION', issuedAt: 20 })
  return { history: store.getHistory(), definition }
}

function loadDefinitionFixture() {
  const imported = importGameFromUnknown(teamBoardGameFile(twoTeams(), richBoardConfig()))
  if (imported.status !== 'success') throw new Error('fixture import failed')
  return imported.definition
}
