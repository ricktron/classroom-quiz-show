/**
 * Shared Host/Home persistence seeding for MENUS unit tests.
 * Keeps FoundationControls / HomeRoute fixtures from cloning each other.
 */

import { createMemoryPersistenceAdapter } from '../persistence/memoryAdapter'
import type { PersistenceAdapter } from '../persistence/adapter'
import {
  PersistenceWriteQueue,
  saveDefinition,
  writeActiveSession,
} from '../persistence'
import { createDefaultRegistry } from '../game/defaultRegistry'
import { importGameFromJsonText } from '../import/importGame'
import { createSessionStore } from '../state/store'
import { gameFileText } from './gameFileFixtures'
import { teamBoardGameFileText } from './teamFixtures'
import { createManualClock } from '../time/clock'
import type { UseHostPersistenceOptions } from '../host/useHostPersistence'

export const HOST_TEST_AT = 1_000_000

export function hostPersistenceOptions(
  adapter: PersistenceAdapter,
  tabId: string,
): UseHostPersistenceOptions {
  return {
    createAdapter: () => adapter,
    tabId,
    clock: createManualClock(HOST_TEST_AT),
    leaseTtlMs: 60_000,
    renewIntervalMs: 20_000,
    broadcastChannel: null,
  }
}

/** Playable category-board Game with teams (Class Setup lands on Names). */
export async function seedSavedPlayableGame(
  adapter: PersistenceAdapter = createMemoryPersistenceAdapter(),
): Promise<{ adapter: PersistenceAdapter; gameId: string }> {
  const imported = importGameFromJsonText(teamBoardGameFileText())
  if (imported.status !== 'success') throw new Error('fixture import failed')
  await adapter.open()
  const saved = await saveDefinition(adapter, imported.definition, {
    mode: 'save',
    registry: createDefaultRegistry(),
  })
  if (!saved.ok) throw new Error(saved.message)
  return { adapter, gameId: imported.definition.id }
}

/** Unfinished Session (mid-setup residual) for recovery / Welcome tests. */
export async function seedResumableHostSession(
  adapter: PersistenceAdapter = createMemoryPersistenceAdapter(),
  sessionId = 'host-test-session',
): Promise<{ adapter: PersistenceAdapter; historyLength: number }> {
  const imported = importGameFromJsonText(gameFileText())
  if (imported.status !== 'success') throw new Error('fixture import failed')
  const store = createSessionStore()
  store.dispatch({ type: 'INIT_SESSION', issuedAt: HOST_TEST_AT, sessionId })
  store.dispatch({ type: 'INITIALIZE_GAME', issuedAt: HOST_TEST_AT, definition: imported.definition })
  const history = store.getHistory()
  await adapter.open()
  const written = await writeActiveSession(
    adapter,
    history,
    HOST_TEST_AT,
    new PersistenceWriteQueue(),
    createDefaultRegistry(),
  )
  if (!written.ok) throw new Error(written.message)
  return { adapter, historyLength: history.length }
}

export function stubHostMatchMedia(vi: { stubGlobal: (name: string, value: unknown) => void }) {
  vi.stubGlobal(
    'matchMedia',
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (vi as any).fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      addListener: () => undefined,
      removeListener: () => undefined,
      dispatchEvent: () => false,
      onchange: null,
    })),
  )
}
