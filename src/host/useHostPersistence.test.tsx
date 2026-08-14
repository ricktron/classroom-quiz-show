import { act, render, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createDefaultRegistry } from '../game/defaultRegistry'
import type { GameDefinition } from '../game/gameDefinition'
import { importGameFromJsonText, importGameFromUnknown } from '../import/importGame'
import { exportGameDefinition } from '../export/exportGame'
import {
  ACTIVE_SESSION_KEY,
  OBJECT_STORE_ACTIVE_SESSIONS,
  OBJECT_STORE_COMPLETED_SUMMARIES,
  MemoryPersistenceAdapter,
  PersistenceWriteQueue,
  acquireOrRenewHostLease,
  createMemoryPersistenceAdapter,
  persistenceErr,
  readActiveSession,
  saveDefinition,
  writeActiveSession,
  type PersistenceAdapter,
  type PersistenceStoreName,
  type PersistenceTx,
} from '../persistence'
import * as persistenceApi from '../persistence'
import type { SessionCommand } from '../state/commands'
import type { SessionEvent } from '../state/events'
import type { DispatchResult } from '../state/store'
import { createSessionStore } from '../state/store'
import { CANONICAL_SAMPLE_FINAL_WAGER_FILE } from '../import/sampleGameFile'
import {
  boardGameFile,
  boardGameFileText,
  category,
  imagePrompt,
  tile,
} from '../test/categoryBoardFixtures'
import { gameFileText } from '../test/gameFileFixtures'
import { createManualClock } from '../time/clock'
import * as hydratePackMedia from '../pack/hydratePackMedia'
import {
  commitPackMediaAssets,
  listPackMediaScopeKeys,
} from '../pack/packMediaPersistence'
import * as packMediaPersistence from '../pack/packMediaPersistence'
import { resourceScopeKeyFromGameText } from '../pack/resourceScope'
import { TINY_PNG_BYTES } from '../pack/testFixtures'
import { useHostPersistence, type UseHostPersistence } from './useHostPersistence'
import { useSessionStore, type UseSessionStore } from './useSessionStore'

const AT = 1_000_000
const packRegistry = createDefaultRegistry()

afterEach(() => {
  vi.restoreAllMocks()
})

async function packDefinition(id: string, path: string): Promise<GameDefinition> {
  const imported = importGameFromUnknown(
    boardGameFile(
      {
        categories: [
          category('a', {
            tiles: [
              tile('a-1', {
                prompt: imagePrompt({
                  source: { kind: 'same-origin-path', path },
                }),
              }),
            ],
          }),
        ],
      },
      { id, title: id },
    ),
  )
  if (imported.status !== 'success') throw new Error('pack fixture import failed')
  return imported.definition
}

async function commitPackScope(
  adapter: PersistenceAdapter,
  definition: GameDefinition,
  sourcePath: string,
): Promise<string> {
  const exported = exportGameDefinition(definition, { registry: packRegistry })
  if (exported.status !== 'success') throw new Error('pack fixture export failed')
  const scopeKey = await resourceScopeKeyFromGameText(exported.jsonText)
  const committed = await commitPackMediaAssets(adapter, {
    resourceScopeKey: scopeKey,
    gameId: definition.id,
    gameSha256: scopeKey,
    mediaAssets: [
      {
        sourcePath,
        bytes: TINY_PNG_BYTES,
        mediaType: 'image/png',
        sha256: 'abc',
      },
    ],
  })
  if (committed.status !== 'success') throw new Error('pack fixture commit failed')
  return scopeKey
}

function packBackedHistory(definition: GameDefinition): readonly SessionEvent[] {
  const store = createSessionStore()
  store.dispatch({ type: 'INIT_SESSION', issuedAt: AT, sessionId: 'pack-session' })
  const result = store.dispatch({ type: 'INITIALIZE_GAME', issuedAt: AT, definition })
  if (result.status !== 'accepted') throw new Error('pack history initialize failed')
  return store.getHistory()
}

interface HarnessApi {
  readonly persistence: UseHostPersistence
  readonly session: UseSessionStore
  readonly dispatch: (command: SessionCommand) => DispatchResult
  readonly registry: ReturnType<typeof createDefaultRegistry>
}

function definition(text = gameFileText()): GameDefinition {
  const imported = importGameFromJsonText(text)
  if (imported.status !== 'success') throw new Error('fixture import failed')
  return imported.definition
}

function activeHistory(): readonly SessionEvent[] {
  const store = createSessionStore()
  store.dispatch({ type: 'INIT_SESSION', issuedAt: AT, sessionId: 'session-1' })
  store.dispatch({ type: 'INITIALIZE_GAME', issuedAt: AT, definition: definition() })
  return store.getHistory()
}

/** A history with the board + Final sample loaded and the Final round selected. */
function finalHistory(): readonly SessionEvent[] {
  const store = createSessionStore()
  store.dispatch({ type: 'INIT_SESSION', issuedAt: AT, sessionId: 'session-final' })
  store.dispatch({
    type: 'INITIALIZE_GAME',
    issuedAt: AT,
    definition: definition(CANONICAL_SAMPLE_FINAL_WAGER_FILE),
  })
  store.dispatch({ type: 'SELECT_ROUND', issuedAt: AT, roundId: 'final-round' })
  return store.getHistory()
}

async function seedActiveSession(
  adapter: PersistenceAdapter,
  events: readonly SessionEvent[],
): Promise<void> {
  await adapter.open()
  const result = await writeActiveSession(
    adapter,
    events,
    AT,
    new PersistenceWriteQueue(),
    createDefaultRegistry(),
  )
  if (!result.ok) throw new Error(result.message)
}

function renderHarness(adapter: PersistenceAdapter, tabId = 'tab-a') {
  let current: HarnessApi | null = null
  const clock = createManualClock(AT)

  function Harness() {
    const persistence = useHostPersistence({
      clock,
      createAdapter: () => adapter,
      tabId,
      leaseTtlMs: 1_000,
      renewIntervalMs: 200,
      broadcastChannel: null,
    })
    const session = useSessionStore({
      initialHistory: persistence.initialHistory,
      storeEpoch: persistence.storeEpoch,
    })
    const registry = session.store.getRegistry()
    const dispatch = (command: SessionCommand) =>
      persistence.dispatchSessionCommand(command, session.dispatch, () => session.store.getHistory(), registry)
    current = { persistence, session, dispatch, registry }
    return <div data-testid="phase">{persistence.bootPhase}</div>
  }

  const view = render(<Harness />)
  const api = () => {
    if (!current) throw new Error('harness not ready')
    return current
  }
  return { api, view, clock }
}

describe('useHostPersistence', () => {
  it('boots with a resumable active session and resumes by remounting the store', async () => {
    const adapter = createMemoryPersistenceAdapter()
    const history = activeHistory()
    await seedActiveSession(adapter, history)

    const { api } = renderHarness(adapter)
    await waitFor(() => expect(api().persistence.bootPhase).toBe('recovery'))

    act(() => api().persistence.resume())
    await waitFor(() => expect(api().persistence.bootPhase).toBe('ready'))
    expect(api().session.store.getHistory()).toEqual(history)
    expect(api().session.store.getState().session?.game?.definition.id).toBe('sample-game')
  })

  it('discards recovery and clears the stored active session', async () => {
    const adapter = createMemoryPersistenceAdapter()
    await seedActiveSession(adapter, activeHistory())

    const { api } = renderHarness(adapter)
    await waitFor(() => expect(api().persistence.bootPhase).toBe('recovery'))
    await act(async () => {
      await api().persistence.discardRecovery()
    })

    await waitFor(() => expect(api().persistence.bootPhase).toBe('ready'))
    expect(api().session.store.getHistory()).toEqual([])
    const stored = await readActiveSession(adapter, api().registry)
    expect(stored).toEqual({ ok: true, value: { kind: 'none' } })
  })

  it('does not claim discard succeeded when the active session cannot be cleared', async () => {
    const adapter = createMemoryPersistenceAdapter()
    await seedActiveSession(adapter, activeHistory())
    const { api } = renderHarness(adapter)
    await waitFor(() => expect(api().persistence.bootPhase).toBe('recovery'))
    const original = adapter.withTransaction.bind(adapter)
    vi.spyOn(adapter, 'withTransaction').mockImplementation(async (stores, work) => {
      if (stores.includes(OBJECT_STORE_ACTIVE_SESSIONS)) {
        return { ok: false as const, code: 'transaction-failed' as const, message: 'blocked' }
      }
      return original(stores, work)
    })
    await act(async () => {
      const result = await api().persistence.discardRecovery()
      expect(result.ok).toBe(false)
    })
    expect(api().persistence.bootPhase).toBe('recovery')
    expect(api().persistence.recovery).not.toBeNull()
    expect(api().persistence.message).toMatch(/could not be discarded/i)
  })

  it('keeps unfinished-session recovery visible when storage is unavailable at discard', async () => {
    const adapter = createMemoryPersistenceAdapter()
    await seedActiveSession(adapter, activeHistory())
    const { api } = renderHarness(adapter)
    await waitFor(() => expect(api().persistence.bootPhase).toBe('recovery'))
    vi.spyOn(persistenceApi, 'clearAllLocalCqsData').mockResolvedValue({
      ok: false,
      code: 'unavailable',
      message: 'closed',
    })
    vi.spyOn(adapter, 'open').mockResolvedValue({
      ok: false,
      code: 'unavailable',
      message: 'closed',
    })
    await act(async () => {
      const wipe = await api().persistence.clearAllLocalData()
      expect(wipe.ok).toBe(false)
    })
    expect(api().persistence.bootPhase).toBe('recovery')
    expect(api().persistence.recovery).not.toBeNull()
    await act(async () => {
      const result = await api().persistence.discardRecovery()
      expect(result.ok).toBe(false)
    })
    expect(api().persistence.bootPhase).toBe('recovery')
    expect(api().persistence.recovery).not.toBeNull()
    expect(api().persistence.message).toMatch(/could not be discarded/i)
  })

  it('marks Final-relevant durability pending until the active-session write lands', async () => {
    const adapter = createMemoryPersistenceAdapter()
    const { api } = renderHarness(adapter)
    await waitFor(() => expect(api().persistence.bootPhase).toBe('ready'))

    const imported = importGameFromJsonText(CANONICAL_SAMPLE_FINAL_WAGER_FILE)
    if (imported.status !== 'success') throw new Error('sample import failed')

    await act(async () => {
      api().dispatch({ type: 'INIT_SESSION', issuedAt: AT, sessionId: 's1' })
      api().dispatch({
        type: 'INITIALIZE_GAME',
        issuedAt: AT,
        definition: imported.definition,
      })
    })

    await waitFor(() => expect(api().persistence.pendingEventCount).toBeNull())
    await waitFor(() =>
      expect(api().persistence.durableEventCount).toBe(api().session.store.getHistory().length),
    )
    expect(api().persistence.activeSessionPersistFailed).toBe(false)

    // Gate the next write so "Saved" cannot race ahead of durability.
    let releaseWrite: (() => void) | null = null
    const gate = new Promise<void>((resolve) => {
      releaseWrite = resolve
    })
    const originalPut = adapter.withTransaction.bind(adapter)
    vi.spyOn(adapter, 'withTransaction').mockImplementation(async (stores, work) => {
      if (stores.includes(OBJECT_STORE_ACTIVE_SESSIONS)) {
        await gate
      }
      return originalPut(stores, work)
    })

    await act(async () => {
      api().dispatch({ type: 'ADVANCE_TO_NEXT_ROUND', issuedAt: AT })
    })
    expect(api().persistence.pendingEventCount).toBe(api().session.store.getHistory().length)
    expect(api().persistence.durableEventCount).toBeLessThan(api().session.store.getHistory().length)

    await act(async () => {
      releaseWrite?.()
    })
    await waitFor(() => expect(api().persistence.pendingEventCount).toBeNull())
    expect(api().persistence.durableEventCount).toBe(api().session.store.getHistory().length)
  })

  it('shows invalid recovery as fail-closed and still offers discard', async () => {
    const adapter = createMemoryPersistenceAdapter()
    await adapter.open()
    await adapter.withTransaction([OBJECT_STORE_ACTIVE_SESSIONS], async (tx) => {
      await tx.put(OBJECT_STORE_ACTIVE_SESSIONS, ACTIVE_SESSION_KEY, { bad: true })
    })

    const { api } = renderHarness(adapter)
    await waitFor(() => expect(api().persistence.bootPhase).toBe('invalid-recovery'))
    expect(api().persistence.invalidRecovery?.message).toMatch(/unknown format/i)

    await act(async () => {
      await api().persistence.discardRecovery()
    })
    await waitFor(() => expect(api().persistence.bootPhase).toBe('ready'))
    expect(api().session.store.getHistory()).toEqual([])
  })

  it('blocks follower dispatch and leaves history unchanged', async () => {
    const adapter = createMemoryPersistenceAdapter()
    const clock = createManualClock(AT)
    await adapter.open()
    await acquireOrRenewHostLease({
      adapter,
      tabId: 'tab-owner',
      clock,
      leaseTtlMs: 1_000,
      broadcastChannel: null,
    })

    const { api } = renderHarness(adapter, 'tab-follower')
    await waitFor(() => expect(api().persistence.leadership).toBe('follower'))
    const result = api().dispatch({ type: 'INIT_SESSION', issuedAt: AT, sessionId: 'blocked' })

    expect(result).toEqual({ status: 'rejected', reason: 'malformed-command' })
    expect(api().session.store.getHistory()).toEqual([])
    expect(api().persistence.canDispatchSessionCommands).toBe(false)
  })

  it('blocks a follower tab from mutating a Final round (Slice 14)', async () => {
    // Final commands travel the SAME dispatch gate as every other session
    // command — there is no Final-specific write path — so the host-writer lease
    // covers them without Final knowing the lease exists. This proves it rather
    // than assuming it.
    const adapter = createMemoryPersistenceAdapter()
    const clock = createManualClock(AT)
    await adapter.open()
    await seedActiveSession(adapter, finalHistory())
    await acquireOrRenewHostLease({
      adapter,
      tabId: 'tab-owner',
      clock,
      leaseTtlMs: 1_000,
      broadcastChannel: null,
    })

    const { api } = renderHarness(adapter, 'tab-follower')
    await waitFor(() => expect(api().persistence.leadership).toBe('follower'))
    const before = api().session.store.getHistory()

    const result = api().dispatch({
      type: 'BEGIN_FINAL_WAGER',
      issuedAt: AT,
      roundId: 'final-round',
      mode: 'classic',
    })

    expect(result.status).toBe('rejected')
    expect(api().session.store.getHistory()).toEqual(before)
    expect(api().persistence.canDispatchSessionCommands).toBe(false)
  })

  it('saves, requires replace for changed same id, loads with confirmation, and deletes', async () => {
    const adapter = createMemoryPersistenceAdapter()
    const { api } = renderHarness(adapter)
    await waitFor(() => expect(api().persistence.bootPhase).toBe('ready'))

    act(() => {
      api().dispatch({ type: 'INIT_SESSION', issuedAt: AT, sessionId: 'session-1' })
      api().dispatch({ type: 'INITIALIZE_GAME', issuedAt: AT, definition: definition() })
    })
    const beforeLibrarySave = api().session.store.getHistory()

    await act(async () => {
      const result = await api().persistence.saveCurrentDefinition(
        api().session.store.getState().session?.game?.definition ?? null,
        api().registry,
      )
      expect(result.ok).toBe(true)
    })
    await waitFor(() => expect(api().persistence.library).toHaveLength(1))
    expect(api().session.store.getHistory()).toEqual(beforeLibrarySave)

    await act(async () => {
      const result = await api().persistence.saveCurrentDefinition(
        api().session.store.getState().session?.game?.definition ?? null,
        api().registry,
      )
      expect(result.message).toMatch(/nothing changed/i)
    })

    const changed = definition(gameFileText({ title: 'Changed Sample Game' }))
    act(() => {
      api().dispatch({ type: 'INITIALIZE_GAME', issuedAt: AT, definition: changed })
    })
    await act(async () => {
      const result = await api().persistence.saveCurrentDefinition(changed, api().registry)
      expect(result.ok).toBe(false)
      expect(result.message).toMatch(/replace/i)
    })
    await act(async () => {
      const result = await api().persistence.replaceCurrentDefinition(changed, api().registry)
      expect(result.ok).toBe(true)
    })

    await act(async () => {
      const result = await api().persistence.loadSaved({
        gameId: 'sample-game',
        activeGame: api().session.store.getState().session?.game ?? null,
        dispatch: api().session.dispatch,
        getHistory: () => api().session.store.getHistory(),
        registry: api().registry,
      })
      expect(result.ok).toBe(false)
      expect('needsConfirmation' in result && result.needsConfirmation).toBe(true)
    })
    const beforeLoad = api().session.store.getHistory().length
    await act(async () => {
      const result = await api().persistence.loadSaved({
        gameId: 'sample-game',
        activeGame: api().session.store.getState().session?.game ?? null,
        dispatch: api().session.dispatch,
        getHistory: () => api().session.store.getHistory(),
        registry: api().registry,
        confirmedReplace: true,
      })
      expect(result.ok).toBe(true)
    })
    expect(api().session.store.getHistory()).toHaveLength(beforeLoad + 1)

    await act(async () => {
      const result = await api().persistence.deleteSaved('sample-game')
      expect(result.ok).toBe(true)
    })
    await waitFor(() => expect(api().persistence.library).toHaveLength(0))
  })

  it('storage failure leaves the in-memory session usable', async () => {
    const adapter = createMemoryPersistenceAdapter({ failTransactions: true })
    const { api } = renderHarness(adapter)
    await waitFor(() => expect(api().persistence.bootPhase).toBe('ready'))
    expect(api().persistence.durabilityStatus).toBe('failed')

    let result: DispatchResult = { status: 'rejected', reason: 'malformed-command' }
    act(() => {
      result = api().dispatch({ type: 'INIT_SESSION', issuedAt: AT, sessionId: 'memory-only' })
    })
    expect(result.status).toBe('accepted')
    expect(api().session.store.getState().session?.sessionId).toBe('memory-only')
  })

  it('auto-saves a newly ended game to the ledger and clears active recovery', async () => {
    const adapter = createMemoryPersistenceAdapter()
    const { api } = renderHarness(adapter)
    await waitFor(() => expect(api().persistence.bootPhase).toBe('ready'))

    act(() => {
      api().dispatch({ type: 'INIT_SESSION', issuedAt: AT, sessionId: 'completed-hook' })
      api().dispatch({ type: 'INITIALIZE_GAME', issuedAt: AT, definition: definition() })
      api().dispatch({ type: 'END_GAME_SESSION', issuedAt: AT + 1 })
    })

    await waitFor(() => expect(api().persistence.ledgerStatus).toBe('saved'))
    expect(api().persistence.currentCompletionSave).toEqual({
      sessionId: 'completed-hook',
      status: 'saved',
      recordId: 'completed-hook',
    })
    expect(api().persistence.completedListings).toHaveLength(1)
    expect(api().persistence.completedListings[0]?.diagnostic).toBe('valid')
    let active: unknown = 'unset'
    await adapter.withTransaction([OBJECT_STORE_ACTIVE_SESSIONS], async (tx) => {
      active = await tx.get(OBJECT_STORE_ACTIVE_SESSIONS, ACTIVE_SESSION_KEY)
    })
    expect(active).toBeUndefined()
    let completedKeys: readonly string[] = []
    await adapter.withTransaction([OBJECT_STORE_COMPLETED_SUMMARIES], async (tx) => {
      completedKeys = await tx.getAllKeys(OBJECT_STORE_COMPLETED_SUMMARIES)
    })
    expect(completedKeys).toEqual(['completed-hook'])
  })

  it('keeps an ended in-memory summary after save failure and retries successfully', async () => {
    class FailFirstCompletionAdapter extends MemoryPersistenceAdapter {
      private failCompletion = true

      override async withTransaction(
        stores: readonly PersistenceStoreName[],
        work: (tx: PersistenceTx) => Promise<void>,
      ) {
        if (
          this.failCompletion &&
          stores.includes(OBJECT_STORE_COMPLETED_SUMMARIES) &&
          stores.includes(OBJECT_STORE_ACTIVE_SESSIONS)
        ) {
          this.failCompletion = false
          return persistenceErr('quota-exceeded', 'Test quota failure.')
        }
        return super.withTransaction(stores, work)
      }
    }

    const adapter = new FailFirstCompletionAdapter()
    const { api } = renderHarness(adapter)
    await waitFor(() => expect(api().persistence.bootPhase).toBe('ready'))
    act(() => {
      api().dispatch({ type: 'INIT_SESSION', issuedAt: AT, sessionId: 'retry-hook' })
      api().dispatch({ type: 'INITIALIZE_GAME', issuedAt: AT, definition: definition() })
      api().dispatch({ type: 'END_GAME_SESSION', issuedAt: AT + 1 })
    })

    await waitFor(() => expect(api().persistence.ledgerStatus).toBe('quota-exceeded'))
    expect(api().session.store.getState().session?.game?.gameLifecycle).toBe('ended')
    expect(api().persistence.currentCompletionSave).toEqual({
      sessionId: 'retry-hook',
      status: 'failed',
    })

    await act(async () => {
      expect(await api().persistence.retryCurrentCompletionSave()).toMatchObject({ ok: true })
    })
    await waitFor(() => expect(api().persistence.ledgerStatus).toBe('saved'))
    expect(api().persistence.completedListings).toHaveLength(1)
  })

  it('does not schedule pack-media GC when setPackGcContext receives unchanged inputs', async () => {
    const adapter = createMemoryPersistenceAdapter()
    const def = await packDefinition('gc-stable', 'media-fixtures/gc-stable.png')
    const gcSpy = vi.spyOn(packMediaPersistence, 'gcUnreferencedPackScopes')
    const { api } = renderHarness(adapter)
    await waitFor(() => expect(api().persistence.bootPhase).toBe('ready'))

    act(() => {
      api().persistence.setPackGcContext?.(null, api().registry)
    })
    act(() => {
      api().persistence.setPackGcContext?.(def, api().registry)
    })
    await Promise.resolve()
    expect(gcSpy).toHaveBeenCalledTimes(0)

    act(() => {
      api().persistence.setPackGcContext?.(def, api().registry)
    })
    act(() => {
      api().persistence.setPackGcContext?.(def, api().registry)
    })
    await Promise.resolve()
    expect(gcSpy).toHaveBeenCalledTimes(0)

    const other = await packDefinition('gc-other', 'media-fixtures/gc-other.png')
    act(() => {
      api().persistence.setPackGcContext?.(other, api().registry)
    })
    await waitFor(() => expect(gcSpy).toHaveBeenCalledTimes(1))
  })

  it('removes an unreferenced recovery pack scope after discard and keeps saved references', async () => {
    const adapter = createMemoryPersistenceAdapter()
    await adapter.open()
    const recoveryDef = await packDefinition('recovery-only', 'media-fixtures/recovery-only.png')
    const savedDef = await packDefinition('saved-keep', 'media-fixtures/saved-keep.png')
    const recoveryScope = await commitPackScope(
      adapter,
      recoveryDef,
      'media-fixtures/recovery-only.png',
    )
    const savedScope = await commitPackScope(adapter, savedDef, 'media-fixtures/saved-keep.png')
    const saved = await saveDefinition(adapter, savedDef, { mode: 'save', registry: packRegistry })
    expect(saved.ok).toBe(true)
    await seedActiveSession(adapter, packBackedHistory(recoveryDef))

    const { api, view } = renderHarness(adapter)
    await waitFor(() => expect(api().persistence.bootPhase).toBe('recovery'))
    await waitFor(async () => {
      expect(new Set(await listPackMediaScopeKeys(adapter))).toEqual(
        new Set([recoveryScope, savedScope]),
      )
    })

    await act(async () => {
      const result = await api().persistence.discardRecovery()
      expect(result.ok).toBe(true)
    })
    await waitFor(() => expect(api().persistence.bootPhase).toBe('ready'))
    await waitFor(async () => {
      expect(await listPackMediaScopeKeys(adapter)).toEqual([savedScope])
    })
    expect(await listPackMediaScopeKeys(adapter)).not.toContain(recoveryScope)
    view.unmount()
  })

  it('removes a recovery-only pack scope after discard when nothing else references it', async () => {
    const adapter = createMemoryPersistenceAdapter()
    await adapter.open()
    const recoveryDef = await packDefinition('recovery-orphan', 'media-fixtures/recovery-orphan.png')
    const recoveryScope = await commitPackScope(
      adapter,
      recoveryDef,
      'media-fixtures/recovery-orphan.png',
    )
    await seedActiveSession(adapter, packBackedHistory(recoveryDef))

    const { api, view } = renderHarness(adapter)
    await waitFor(() => expect(api().persistence.bootPhase).toBe('recovery'))
    await waitFor(async () => {
      expect(await listPackMediaScopeKeys(adapter)).toEqual([recoveryScope])
    })

    await act(async () => {
      expect(await api().persistence.discardRecovery()).toMatchObject({ ok: true })
    })
    await waitFor(() => expect(api().persistence.bootPhase).toBe('ready'))
    await waitFor(async () => {
      expect(await listPackMediaScopeKeys(adapter)).toEqual([])
    })
    view.unmount()
  })

  it('loadSaved does not hydrate pack media directly', async () => {
    const adapter = createMemoryPersistenceAdapter()
    const { api } = renderHarness(adapter)
    await waitFor(() => expect(api().persistence.bootPhase).toBe('ready'))

    act(() => {
      api().dispatch({ type: 'INIT_SESSION', issuedAt: AT, sessionId: 'load-authority' })
      api().dispatch({ type: 'INITIALIZE_GAME', issuedAt: AT, definition: definition() })
    })
    await act(async () => {
      expect(
        await api().persistence.saveCurrentDefinition(
          api().session.store.getState().session?.game?.definition ?? null,
          api().registry,
        ),
      ).toMatchObject({ ok: true })
    })

    const hydrateSpy = vi.spyOn(hydratePackMedia, 'hydratePackMediaForDefinition')
    await act(async () => {
      const result = await api().persistence.loadSaved({
        gameId: 'sample-game',
        activeGame: api().session.store.getState().session?.game ?? null,
        dispatch: api().session.dispatch,
        getHistory: () => api().session.store.getHistory(),
        registry: api().registry,
        confirmedReplace: true,
      })
      expect(result.ok).toBe(true)
    })
    expect(hydrateSpy).not.toHaveBeenCalled()
  })

  it('recovers timer histories by replaying future and past deadlines exactly', async () => {
    const future = activeTimerHistory(AT + 30_000)
    const past = activeTimerHistory(AT - 1)

    for (const history of [future, past]) {
      const adapter = createMemoryPersistenceAdapter()
      await seedActiveSession(adapter, history)
      const { api, view } = renderHarness(adapter)
      await waitFor(() => expect(api().persistence.bootPhase).toBe('recovery'))
      act(() => api().persistence.resume())
      await waitFor(() => expect(api().persistence.bootPhase).toBe('ready'))
      expect(api().session.store.getState()).toEqual(createSessionStore({ initialHistory: history }).getState())
      view.unmount()
    }
  })

  it('clearAllLocalData wipes every store and seals the adapter so state cannot repopulate', async () => {
    const adapter = createMemoryPersistenceAdapter()
    await seedActiveSession(adapter, activeHistory())
    await adapter.withTransaction(
      [
        OBJECT_STORE_ACTIVE_SESSIONS,
        OBJECT_STORE_COMPLETED_SUMMARIES,
        'savedDefinitions',
        'coordination',
        'packMediaAssets',
        'sonyBuzzMappings',
      ],
      async (tx) => {
        await tx.put('savedDefinitions', 'sample-game', { gameId: 'sample-game', title: 'Sample' })
        await tx.put(OBJECT_STORE_COMPLETED_SUMMARIES, 'done-1', { recordId: 'done-1' })
        await tx.put('coordination', 'host-writer', { tabId: 'other' })
        await tx.put('packMediaAssets', 'scope\0a.png', { bytes: [1] })
        await tx.put('sonyBuzzMappings', 'current', { mappingVersion: 1 })
      },
    )

    const { api } = renderHarness(adapter)
    await waitFor(() => expect(api().persistence.bootPhase).toBe('recovery'))
    expect(api().persistence.library.length).toBeGreaterThanOrEqual(0)

    let result: { ok: boolean; message: string } | undefined
    await act(async () => {
      result = await api().persistence.clearAllLocalData()
    })
    expect(result?.ok).toBe(true)
    expect(result?.message).toMatch(/cleared/i)
    expect(api().persistence.library).toEqual([])
    expect(api().persistence.completedListings).toEqual([])
    expect(api().persistence.recovery).toBeNull()
    expect(api().persistence.initialHistory).toEqual([])

    // Sealed memory adapter must not reopen and accept writes from this tab.
    expect(await adapter.open()).toMatchObject({ ok: false, code: 'unavailable' })
  })
})

function activeTimerHistory(deadline: number): readonly SessionEvent[] {
  const store = createSessionStore()
  store.dispatch({ type: 'INIT_SESSION', issuedAt: AT, sessionId: 'timer-session' })
  store.dispatch({ type: 'INITIALIZE_GAME', issuedAt: AT, definition: definition(boardGameFileText()) })
  store.dispatch({ type: 'ADVANCE_TO_NEXT_ROUND', issuedAt: AT })
  store.dispatch({
    type: 'SELECT_CATEGORY_BOARD_TILE',
    issuedAt: AT,
    roundId: 'board-round',
    tileId: 'alpha-100',
  })
  store.dispatch({ type: 'REVEAL_CATEGORY_BOARD_PROMPT', issuedAt: AT, roundId: 'board-round' })
  const started = store.dispatch({
    type: 'START_RESPONSE_TIMER',
    issuedAt: AT,
    roundId: 'board-round',
    durationSeconds: 30,
  })
  if (started.status !== 'accepted') throw new Error('timer fixture failed')
  const events = store.getHistory()
  const timerStart = events[events.length - 1]
  if (timerStart?.type !== 'RESPONSE_TIMER_STARTED') throw new Error('timer event missing')
  return [
    ...events.slice(0, -1),
    {
      ...timerStart,
      deadline,
    },
  ]
}
