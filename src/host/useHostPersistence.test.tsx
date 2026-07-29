import { act, render, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { createDefaultRegistry } from '../game/defaultRegistry'
import type { GameDefinition } from '../game/gameDefinition'
import { importGameFromJsonText } from '../import/importGame'
import {
  ACTIVE_SESSION_KEY,
  OBJECT_STORE_ACTIVE_SESSIONS,
  PersistenceWriteQueue,
  acquireOrRenewHostLease,
  createMemoryPersistenceAdapter,
  readActiveSession,
  writeActiveSession,
  type MemoryPersistenceAdapter,
} from '../persistence'
import type { SessionCommand } from '../state/commands'
import type { SessionEvent } from '../state/events'
import type { DispatchResult } from '../state/store'
import { createSessionStore } from '../state/store'
import { boardGameFileText } from '../test/categoryBoardFixtures'
import { gameFileText } from '../test/gameFileFixtures'
import { createManualClock } from '../time/clock'
import { useHostPersistence, type UseHostPersistence } from './useHostPersistence'
import { useSessionStore, type UseSessionStore } from './useSessionStore'

const AT = 1_000_000

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

async function seedActiveSession(
  adapter: MemoryPersistenceAdapter,
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

function renderHarness(adapter: MemoryPersistenceAdapter, tabId = 'tab-a') {
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
    expect(api().session.store.getHistory().length).toBe(beforeLoad + 1)

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
