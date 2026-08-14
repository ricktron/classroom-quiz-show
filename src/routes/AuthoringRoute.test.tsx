import { describe, expect, it } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { createDefaultRegistry } from '../game/defaultRegistry'
import { createNewLibraryGame } from '../library/gameLibrary'
import { acquireOrRenewHostLease } from '../persistence/coordination'
import { createMemoryPersistenceAdapter } from '../persistence/memoryAdapter'
import type { PersistenceAdapter, PersistenceTx } from '../persistence/adapter'
import { createManualClock, type ManualClock } from '../time/clock'
import { AuthoringRoute } from './AuthoringRoute'
import { editPath } from './paths'
import type { UseHostPersistenceOptions } from '../host/useHostPersistence'

const IMPLEMENTATION_LEAK =
  /persistence lease|host tab owns persistence|indexeddb|object store|\badapter\b|\bwire\b|transaction/i

function trackDurableWrites(adapter: PersistenceAdapter): { savedDefinitions: number; activeSessions: number } {
  const counts = { savedDefinitions: 0, activeSessions: 0 }
  const original = adapter.withTransaction.bind(adapter)
  adapter.withTransaction = (stores, work) =>
    original(stores, async (tx: PersistenceTx) => {
      const put = tx.put.bind(tx)
      const del = tx.delete.bind(tx)
      await work({
        get: tx.get.bind(tx),
        getAll: tx.getAll.bind(tx),
        getAllKeys: tx.getAllKeys.bind(tx),
        put: async (store, key, value) => {
          if (store === 'savedDefinitions') counts.savedDefinitions += 1
          if (store === 'activeSessions') counts.activeSessions += 1
          return put(store, key, value)
        },
        delete: async (store, key) => {
          if (store === 'savedDefinitions') counts.savedDefinitions += 1
          if (store === 'activeSessions') counts.activeSessions += 1
          return del(store, key)
        },
      })
    })
  return counts
}

async function renderEditor(options: UseHostPersistenceOptions & { adapter?: PersistenceAdapter } = {}) {
  const adapter = options.adapter ?? createMemoryPersistenceAdapter()
  await adapter.open()
  const registry = createDefaultRegistry()
  const created = await createNewLibraryGame(adapter, registry)
  if (!created.ok) throw new Error(created.message)
  const gameId = created.value.definition.id
  const router = createMemoryRouter(
    [
      { path: '/', element: <p>Home page</p> },
      {
        path: '/edit/:gameId',
        element: (
          <AuthoringRoute
            persistenceOptions={{
              createAdapter: () => adapter,
              tabId: options.tabId ?? 'authoring-test',
              broadcastChannel: options.broadcastChannel ?? null,
              clock: options.clock,
              leaseTtlMs: options.leaseTtlMs,
              renewIntervalMs: options.renewIntervalMs,
            }}
          />
        ),
      },
    ],
    { initialEntries: [editPath(gameId)] },
  )
  render(<RouterProvider router={router} />)
  await waitFor(() => {
    expect(screen.getByLabelText(/game title/i)).toBeInTheDocument()
  })
  return { adapter, gameId }
}

async function stealLeadership(adapter: PersistenceAdapter, clock: ManualClock): Promise<void> {
  clock.advance(5_000)
  await acquireOrRenewHostLease({
    adapter,
    tabId: 'other-window',
    clock,
    leaseTtlMs: 60_000,
    broadcastChannel: null,
  })
}

describe('in-app board authoring', () => {
  it('shows Saved after opening a durable game with no edits', async () => {
    await renderEditor()
    expect(screen.getByTestId('authoring-save-status')).toHaveTextContent(/^saved$/i)
  })

  it('edits title, a tile, and Final without claiming a false Saved state', async () => {
    await renderEditor()
    const title = screen.getByLabelText(/game title/i)
    fireEvent.change(title, { target: { value: 'Weather Board' } })
    expect(screen.getByTestId('authoring-save-status')).toHaveTextContent(/unsaved/i)
    expect(screen.getByTestId('authoring-validation')).toHaveTextContent(/missing questions or answers/i)

    fireEvent.click(screen.getByRole('button', { name: /category 1 100, incomplete/i }))
    fireEvent.change(screen.getByLabelText(/^question$/i), {
      target: { value: 'What is condensation?' },
    })
    fireEvent.change(screen.getByLabelText(/^canonical answer$/i), {
      target: { value: 'gas to liquid' },
    })
    fireEvent.change(screen.getByLabelText(/final question/i), {
      target: { value: 'Name the water cycle step after evaporation.' },
    })
    fireEvent.change(screen.getByLabelText(/final canonical answer/i), {
      target: { value: 'condensation' },
    })

    fireEvent.click(screen.getByTestId('authoring-save'))
    await waitFor(() => {
      expect(screen.getByTestId('authoring-save-status')).toHaveTextContent(/^saved$/i)
    })
  })

  it('asks before discarding unsaved edits and previews without starting a session', async () => {
    await renderEditor()
    fireEvent.change(screen.getByLabelText(/game title/i), { target: { value: 'Unsaved Title' } })
    fireEvent.click(screen.getByTestId('authoring-home'))
    expect(screen.getByRole('alert')).toHaveTextContent(/unsaved changes/i)
    fireEvent.click(screen.getByRole('button', { name: /^stay$/i }))
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /preview board/i }))
    expect(screen.getByTestId('authoring-preview')).toHaveTextContent(/does not start a class session/i)
  })

  it('blocks follower Save before any library write and keeps edits in memory', async () => {
    const adapter = createMemoryPersistenceAdapter()
    const clock = createManualClock(1_000_000)
    await adapter.open()
    await acquireOrRenewHostLease({
      adapter,
      tabId: 'other-window',
      clock,
      leaseTtlMs: 60_000,
      broadcastChannel: null,
    })
    await renderEditor({
      adapter,
      clock,
      tabId: 'authoring-follower',
      leaseTtlMs: 1_000,
      renewIntervalMs: 20,
      broadcastChannel: null,
    })
    await waitFor(() => {
      expect(screen.getByTestId('authoring-follower-notice')).toBeInTheDocument()
    })
    fireEvent.change(screen.getByLabelText(/game title/i), { target: { value: 'Follower Keeps This' } })
    const writes = trackDurableWrites(adapter)
    fireEvent.click(screen.getByTestId('authoring-save'))
    await waitFor(() => {
      expect(screen.getByTestId('authoring-save-status')).toHaveTextContent(/save problem/i)
    })
    expect(writes.savedDefinitions).toBe(0)
    expect(screen.getByLabelText(/game title/i)).toHaveValue('Follower Keeps This')
    expect(document.body.textContent).not.toMatch(IMPLEMENTATION_LEAK)
  })

  it('blocks Save after a leader-to-follower transition without losing unsaved edits', async () => {
    const adapter = createMemoryPersistenceAdapter()
    const clock = createManualClock(1_000_000)
    await renderEditor({
      adapter,
      clock,
      tabId: 'authoring-leader',
      leaseTtlMs: 1_000,
      renewIntervalMs: 20,
      broadcastChannel: null,
    })
    fireEvent.change(screen.getByLabelText(/game title/i), { target: { value: 'Still In This Window' } })
    expect(screen.getByTestId('authoring-save-status')).toHaveTextContent(/unsaved/i)
    await stealLeadership(adapter, clock)
    await waitFor(() => {
      expect(screen.getByTestId('authoring-follower-notice')).toBeInTheDocument()
    })
    expect(screen.getByLabelText(/game title/i)).toHaveValue('Still In This Window')
    const writes = trackDurableWrites(adapter)
    fireEvent.click(screen.getByTestId('authoring-save'))
    await waitFor(() => {
      expect(screen.getByTestId('authoring-save-status')).toHaveTextContent(/save problem/i)
    })
    expect(writes.savedDefinitions).toBe(0)
    expect(screen.getByLabelText(/game title/i)).toHaveValue('Still In This Window')
    expect(screen.getByTestId('authoring-follower-notice')).toHaveTextContent(
      /another classroom quiz show window is currently responsible for saving/i,
    )
  })
})
