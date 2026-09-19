import { describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useParams } from 'react-router-dom'
import { ROUTES } from './paths'
import { HomeRoute } from './HomeRoute'
import { HostRoute } from './HostRoute'
import { FORBIDDEN_DISPLAY_LABELS } from '../test/leakLabels'
import { acquireOrRenewHostLease } from '../persistence/coordination'
import { createMemoryPersistenceAdapter } from '../persistence/memoryAdapter'
import type { PersistenceAdapter, PersistenceTx } from '../persistence/adapter'
import {
  ACTIVE_SESSION_KEY,
  OBJECT_STORE_ACTIVE_SESSIONS,
  PersistenceWriteQueue,
  saveDefinition,
  writeActiveSession,
} from '../persistence'
import { CANONICAL_SAMPLE_CATEGORY_BOARD_FILE } from '../import/sampleGameFile'
import { createManualClock, type ManualClock } from '../time/clock'
import type { UseHostPersistenceOptions } from '../host/useHostPersistence'
import { FOLLOWER_HOME_WRITE_BLOCKED_MESSAGE } from '../host/writeAuthority'
import { createDefaultRegistry } from '../game/defaultRegistry'
import { importGameFromJsonText } from '../import/importGame'
import { createSessionStore } from '../state/store'
import { gameFileText } from '../test/gameFileFixtures'
import { boardGameFile, boardGameFileText } from '../test/categoryBoardFixtures'
import { loadLibraryRecord } from '../persistence/savedDefinitions'
import {
  START_FRESH_CONFIRM_LABEL,
  START_FRESH_LABEL,
} from '../host/sessionRecoveryCopy'
import { ThemeProvider } from '../theme/ThemeProvider'
import { shouldResumeRecoveryFromNavigation } from '../host/hostResumeNavigation'

function EditorProbe() {
  const params = useParams()
  return <p>Editor page {params.gameId}</p>
}

const IMPLEMENTATION_LEAK =
  /persistence lease|host tab owns persistence|indexeddb|object store|\badapter\b|\bwire\b|transaction/i
const AT = 1_000_000

function trackDurableWrites(adapter: PersistenceAdapter): {
  savedDefinitions: number
  activeSessions: number
} {
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

function holdSavedDefinitionWrites(adapter: PersistenceAdapter): {
  started: Promise<void>
  release: () => void
} {
  let release!: () => void
  const gate = new Promise<void>((resolve) => {
    release = resolve
  })
  let markStarted!: () => void
  const started = new Promise<void>((resolve) => {
    markStarted = resolve
  })
  const original = adapter.withTransaction.bind(adapter)
  adapter.withTransaction = (stores, work) => {
    if (stores.includes('savedDefinitions')) {
      markStarted()
      return gate.then(() => original(stores, work))
    }
    return original(stores, work)
  }
  return { started, release }
}

function failSavedDefinitionWrites(adapter: PersistenceAdapter, message: string): void {
  adapter.withTransaction = (stores, work) => {
    void work
    if (stores.includes('savedDefinitions')) {
      return Promise.resolve({ ok: false, code: 'unavailable', message })
    }
    return Promise.resolve({ ok: true, value: undefined })
  }
}

async function showCorruptImport(
  adapter: PersistenceAdapter,
  doc: Record<string, unknown>,
): Promise<void> {
  await renderReadyHome({ createAdapter: () => adapter })
  await waitFor(() => expect(screen.getByTestId('home-import-game')).toBeEnabled())
  fireEvent.click(screen.getByTestId('home-import-game'))
  fireEvent.change(screen.getByLabelText(/game file text/i), {
    target: { value: JSON.stringify(doc) },
  })
  fireEvent.click(screen.getByTestId('home-import-json'))
  expect(await screen.findByTestId('import-salvage-keep')).toBeEnabled()
}

function renderHome(options?: UseHostPersistenceOptions) {
  return render(
    <MemoryRouter initialEntries={[ROUTES.root]}>
      <Routes>
        <Route path={ROUTES.root} element={<HomeRoute persistenceOptions={options} />} />
        <Route path="/edit/:gameId" element={<EditorProbe />} />
        <Route path="/host" element={<p>Host page</p>} />
      </Routes>
    </MemoryRouter>,
  )
}

async function renderReadyHome(options: UseHostPersistenceOptions = {}) {
  renderHome(options)
  await waitFor(() => {
    expect(screen.getByRole('heading', { name: /^home$/i })).toBeInTheDocument()
  })
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
  await waitFor(() => {
    expect(screen.getByTestId('home-follower-notice')).toBeInTheDocument()
  })
}

async function seedResumableSession(adapter: PersistenceAdapter): Promise<number> {
  const imported = importGameFromJsonText(gameFileText())
  if (imported.status !== 'success') throw new Error('fixture import failed')
  const store = createSessionStore()
  store.dispatch({ type: 'INIT_SESSION', issuedAt: AT, sessionId: 'session-1' })
  store.dispatch({ type: 'INITIALIZE_GAME', issuedAt: AT, definition: imported.definition })
  const history = store.getHistory()
  await adapter.open()
  const written = await writeActiveSession(
    adapter,
    history,
    AT,
    new PersistenceWriteQueue(),
    createDefaultRegistry(),
  )
  if (!written.ok) throw new Error(written.message)
  return history.length
}

async function seedSavedGame(adapter: PersistenceAdapter, title = 'Library Keeper'): Promise<void> {
  const imported = importGameFromJsonText(
    gameFileText().replace('Sample Game', title).replace('sample-game', 'library-keeper'),
  )
  if (imported.status !== 'success') throw new Error('fixture import failed')
  await adapter.open()
  const saved = await saveDefinition(adapter, imported.definition, {
    mode: 'save',
    registry: createDefaultRegistry(),
  })
  if (!saved.ok) throw new Error(saved.message)
}

describe('teacher Home', () => {
  it('shows teacher-first library actions and hides the old role picker', async () => {
    renderHome()
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /^home$/i })).toBeInTheDocument()
    })
    expect(screen.getByRole('button', { name: /new game/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /import game/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /recent games/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /my games/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /open classroom controls/i })).toHaveAttribute(
      'href',
      '/host',
    )
    expect(screen.queryByRole('heading', { name: /choose a screen/i })).not.toBeInTheDocument()
    expect(document.body.textContent).not.toMatch(/slice 13/i)
    expect(document.body.textContent).not.toMatch(/indexeddb/i)
  })

  it('keeps host-private language off any projector-forbidden answer labels', async () => {
    renderHome()
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /^home$/i })).toBeInTheDocument()
    })
    const text = document.body.textContent ?? ''
    for (const label of FORBIDDEN_DISPLAY_LABELS) {
      expect(text.toLowerCase()).not.toContain(label.toLowerCase())
    }
  })

  it('lets the leader create a game and keeps ordinary copy free of persistence internals', async () => {
    const adapter = createMemoryPersistenceAdapter()
    const clock = createManualClock(1_000_000)
    await renderReadyHome({
      createAdapter: () => adapter,
      tabId: 'home-leader',
      clock,
      leaseTtlMs: 1_000,
      renewIntervalMs: 20,
      broadcastChannel: null,
    })
    await waitFor(() => {
      expect(screen.getByTestId('home-new-game')).toBeEnabled()
    })
    fireEvent.click(screen.getByTestId('home-new-game'))
    await waitFor(() => {
      expect(screen.getByText(/editor page/i)).toBeInTheDocument()
    })
  })

  it('blocks follower create, import, replace, rename, duplicate, and delete writes', async () => {
    const adapter = createMemoryPersistenceAdapter()
    const clock = createManualClock(1_000_000)
    await renderReadyHome({
      createAdapter: () => adapter,
      tabId: 'home-leader',
      clock,
      leaseTtlMs: 1_000,
      renewIntervalMs: 20,
      broadcastChannel: null,
    })
    await waitFor(() => {
      expect(screen.getByTestId('home-new-game')).toBeEnabled()
    })
    fireEvent.click(screen.getByTestId('home-import-game'))
    fireEvent.click(screen.getByTestId('home-import-demo'))
    await waitFor(() => {
      expect(screen.getByTestId('home-status')).toHaveTextContent(/saved/i)
    })
    const changedDemo = CANONICAL_SAMPLE_CATEGORY_BOARD_FILE.replace(
      'Earth & Space Science Board',
      'Earth & Space Science Board Revised',
    )
    fireEvent.change(screen.getByLabelText(/game file text/i), { target: { value: changedDemo } })
    fireEvent.click(screen.getByTestId('home-import-json'))
    await waitFor(() => {
      expect(screen.getByTestId('home-replace-saved-game')).toBeInTheDocument()
    })
    await stealLeadership(adapter, clock)
    const writes = trackDurableWrites(adapter)
    fireEvent.click(screen.getByTestId('home-new-game'))
    fireEvent.click(screen.getByTestId('home-import-demo'))
    fireEvent.click(screen.getByTestId('home-import-json'))
    fireEvent.click(screen.getByTestId('home-replace-saved-game'))
    fireEvent.click(screen.getAllByRole('button', { name: /duplicate/i })[0])
    fireEvent.click(screen.getAllByRole('button', { name: /^delete$/i })[0])
    fireEvent.click(screen.getAllByRole('button', { name: /confirm delete game/i })[0])
    fireEvent.click(screen.getAllByRole('button', { name: /^rename$/i })[0])
    fireEvent.change(screen.getAllByLabelText(/new name/i)[0], { target: { value: 'Renamed As Follower' } })
    fireEvent.click(screen.getAllByRole('button', { name: /save name/i })[0])
    await waitFor(() => {
      expect(screen.getByTestId('home-status')).toHaveTextContent(FOLLOWER_HOME_WRITE_BLOCKED_MESSAGE)
    })
    expect(writes.savedDefinitions).toBe(0)
    expect(document.body.textContent).not.toMatch(IMPLEMENTATION_LEAK)
  })

  it('blocks discard after a leader-to-follower transition and keeps the unfinished session', async () => {
    const adapter = createMemoryPersistenceAdapter()
    const clock = createManualClock(1_000_000)
    await adapter.open()
    await adapter.withTransaction([OBJECT_STORE_ACTIVE_SESSIONS], async (tx) => {
      await tx.put(OBJECT_STORE_ACTIVE_SESSIONS, ACTIVE_SESSION_KEY, { bad: true })
    })
    await renderReadyHome({
      createAdapter: () => adapter,
      tabId: 'home-leader',
      clock,
      leaseTtlMs: 1_000,
      renewIntervalMs: 20,
      broadcastChannel: null,
    })
    await waitFor(() => {
      expect(screen.getByTestId('home-invalid-recovery')).toBeInTheDocument()
    })
    expect(screen.getByTestId('home-invalid-recovery')).toHaveTextContent(
      /this unfinished class session could not be read/i,
    )
    expect(screen.getByTestId('home-invalid-recovery').textContent).not.toMatch(IMPLEMENTATION_LEAK)
    await stealLeadership(adapter, clock)
    const writes = trackDurableWrites(adapter)
    fireEvent.click(screen.getByTestId('home-discard-session'))
    fireEvent.click(screen.getByTestId('home-discard-session'))
    await waitFor(() => {
      expect(screen.getByTestId('home-status')).toHaveTextContent(FOLLOWER_HOME_WRITE_BLOCKED_MESSAGE)
    })
    expect(writes.activeSessions).toBe(0)
    expect(screen.getByTestId('home-invalid-recovery')).toBeInTheDocument()
  })

  it('keeps an already-open import panel from writing after leadership is lost', async () => {
    const adapter = createMemoryPersistenceAdapter()
    const clock = createManualClock(1_000_000)
    await renderReadyHome({
      createAdapter: () => adapter,
      tabId: 'home-leader',
      clock,
      leaseTtlMs: 1_000,
      renewIntervalMs: 20,
      broadcastChannel: null,
    })
    await waitFor(() => {
      expect(screen.getByTestId('home-import-game')).toBeEnabled()
    })
    fireEvent.click(screen.getByTestId('home-import-game'))
    expect(screen.getByTestId('home-import')).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText(/game file text/i), {
      target: { value: CANONICAL_SAMPLE_CATEGORY_BOARD_FILE },
    })
    await stealLeadership(adapter, clock)
    expect(screen.getByTestId('home-import')).toBeInTheDocument()
    const writes = trackDurableWrites(adapter)
    fireEvent.click(screen.getByTestId('home-import-json'))
    fireEvent.click(screen.getByTestId('home-import-demo'))
    fireEvent.click(screen.getByTestId('home-import-spreadsheet'))
    await waitFor(() => {
      expect(screen.getByTestId('home-status')).toHaveTextContent(FOLLOWER_HOME_WRITE_BLOCKED_MESSAGE)
    })
    expect(writes.savedDefinitions).toBe(0)
  })

  it('resumes from Home into Host without a second recovery prompt', async () => {
    const adapter = createMemoryPersistenceAdapter()
    const historyLength = await seedResumableSession(adapter)
    const options: UseHostPersistenceOptions = {
      createAdapter: () => adapter,
      tabId: 'host-auto-resume',
      clock: createManualClock(AT),
      leaseTtlMs: 60_000,
      renewIntervalMs: 20_000,
      broadcastChannel: null,
    }

    // Home only needs to prove it navigates with the resume intent.
    render(
      <MemoryRouter initialEntries={[ROUTES.root]}>
        <Routes>
          <Route path={ROUTES.root} element={<HomeRoute persistenceOptions={options} />} />
          <Route
            path={ROUTES.host}
            element={<p data-testid="host-intent-probe">Host intent received</p>}
          />
        </Routes>
      </MemoryRouter>,
    )
    await waitFor(() => {
      expect(screen.getByTestId('home-resume')).toBeInTheDocument()
    })
    fireEvent.click(screen.getByTestId('home-resume-session'))
    await waitFor(() => {
      expect(screen.getByTestId('host-intent-probe')).toBeInTheDocument()
    })
    cleanup()

    // Host applies that same intent through the real resume path.
    render(
      <MemoryRouter
        initialEntries={[{ pathname: ROUTES.host, state: { cqsResumeRecovery: true } }]}
      >
        <ThemeProvider>
          <Routes>
            <Route path={ROUTES.host} element={<HostRoute persistenceOptions={options} />} />
          </Routes>
        </ThemeProvider>
      </MemoryRouter>,
    )
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /host control/i })).toBeInTheDocument()
    })
    await waitFor(() => {
      expect(screen.queryByTestId('persistence-recovery')).not.toBeInTheDocument()
    })
    await waitFor(() => {
      expect(screen.getByTestId('game-title')).toBeInTheDocument()
    })
    expect(screen.getByTestId('event-history').querySelectorAll('li')).toHaveLength(historyLength)
  })

  it('start fresh clears only the active session and keeps My Games', async () => {
    const adapter = createMemoryPersistenceAdapter()
    await seedSavedGame(adapter)
    await seedResumableSession(adapter)
    const clock = createManualClock(AT)
    const writes = trackDurableWrites(adapter)
    await renderReadyHome({
      createAdapter: () => adapter,
      tabId: 'home-fresh',
      clock,
      leaseTtlMs: 60_000,
      renewIntervalMs: 20_000,
      broadcastChannel: null,
    })
    await waitFor(() => {
      expect(screen.getByTestId('home-resume')).toBeInTheDocument()
      expect(screen.getAllByText('Library Keeper').length).toBeGreaterThan(0)
    })
    expect(screen.getByTestId('home-discard-session')).toHaveTextContent(START_FRESH_LABEL)
    fireEvent.click(screen.getByTestId('home-discard-session'))
    expect(screen.getByTestId('home-discard-session')).toHaveTextContent(START_FRESH_CONFIRM_LABEL)
    fireEvent.click(screen.getByTestId('home-discard-session'))
    await waitFor(() => {
      expect(screen.queryByTestId('home-resume')).not.toBeInTheDocument()
    })
    expect(screen.getAllByText('Library Keeper').length).toBeGreaterThan(0)
    expect(writes.activeSessions).toBeGreaterThan(0)
    expect(screen.queryByTestId('persistence-clear-all-action')).not.toBeInTheDocument()
  })

  it('does not claim start fresh succeeded when discard fails', async () => {
    const adapter = createMemoryPersistenceAdapter()
    await seedResumableSession(adapter)
    const clock = createManualClock(AT)
    await renderReadyHome({
      createAdapter: () => adapter,
      tabId: 'home-fail-discard',
      clock,
      leaseTtlMs: 60_000,
      renewIntervalMs: 20_000,
      broadcastChannel: null,
    })
    await waitFor(() => {
      expect(screen.getByTestId('home-resume')).toBeInTheDocument()
    })
    const original = adapter.withTransaction.bind(adapter)
    vi.spyOn(adapter, 'withTransaction').mockImplementation(async (stores, work) => {
      if (stores.includes(OBJECT_STORE_ACTIVE_SESSIONS)) {
        return { ok: false as const, code: 'transaction-failed' as const, message: 'blocked' }
      }
      return original(stores, work)
    })
    fireEvent.click(screen.getByTestId('home-discard-session'))
    fireEvent.click(screen.getByTestId('home-discard-session'))
    await waitFor(() => {
      expect(screen.getByTestId('home-status')).toHaveTextContent(/still on this device/i)
    })
    expect(screen.getByTestId('home-resume')).toBeInTheDocument()
  })

  it('lets the teacher discard an unreadable session and keep saved games', async () => {
    const adapter = createMemoryPersistenceAdapter()
    await seedSavedGame(adapter, 'Kept After Invalid')
    await adapter.open()
    await adapter.withTransaction([OBJECT_STORE_ACTIVE_SESSIONS], async (tx) => {
      await tx.put(OBJECT_STORE_ACTIVE_SESSIONS, ACTIVE_SESSION_KEY, { bad: true })
    })
    const clock = createManualClock(AT)
    await renderReadyHome({
      createAdapter: () => adapter,
      tabId: 'home-invalid',
      clock,
      leaseTtlMs: 60_000,
      renewIntervalMs: 20_000,
      broadcastChannel: null,
    })
    await waitFor(() => {
      expect(screen.getByTestId('home-invalid-recovery')).toBeInTheDocument()
      expect(screen.getAllByText('Kept After Invalid').length).toBeGreaterThan(0)
    })
    fireEvent.click(screen.getByTestId('home-discard-session'))
    fireEvent.click(screen.getByTestId('home-discard-session'))
    await waitFor(() => {
      expect(screen.queryByTestId('home-invalid-recovery')).not.toBeInTheDocument()
    })
    expect(screen.getAllByText('Kept After Invalid').length).toBeGreaterThan(0)
  })

  it('lets a follower Resume from Home because resume is not a durable write', async () => {
    const adapter = createMemoryPersistenceAdapter()
    await seedResumableSession(adapter)
    const clock = createManualClock(AT)
    await renderReadyHome({
      createAdapter: () => adapter,
      tabId: 'home-follower-resume',
      clock,
      leaseTtlMs: 1_000,
      renewIntervalMs: 20,
      broadcastChannel: null,
    })
    await waitFor(() => {
      expect(screen.getByTestId('home-resume')).toBeInTheDocument()
    })
    await stealLeadership(adapter, clock)
    fireEvent.click(screen.getByTestId('home-resume-session'))
    await waitFor(() => {
      expect(screen.getByText(/host page/i)).toBeInTheDocument()
    })
  })

  it('encodes Home Resume as a Host navigation resume intent', () => {
    expect(shouldResumeRecoveryFromNavigation({ cqsResumeRecovery: true })).toBe(true)
    expect(shouldResumeRecoveryFromNavigation(null)).toBe(false)
    expect(shouldResumeRecoveryFromNavigation({})).toBe(false)
  })

  it('does not save a corrupt game file until the teacher keeps the usable parts', async () => {
    const adapter = createMemoryPersistenceAdapter()
    await renderReadyHome({ createAdapter: () => adapter })
    await waitFor(() => expect(screen.getByTestId('home-import-game')).toBeEnabled())
    fireEvent.click(screen.getByTestId('home-import-game'))
    const broken = boardGameFile({
      categories: [
        {
          id: 'sky',
          title: 'Sky',
          tiles: [{ id: 'sky-1', value: 100, prompt: 'Why is the sky blue?', answer: 'Scattering' }, { id: 'sky-2', value: 200, prompt: 'Which gas?', answer: 4 }],
        },
      ],
    })
    const writes = trackDurableWrites(adapter)
    fireEvent.change(screen.getByLabelText(/game file text/i), {
      target: { value: JSON.stringify(broken) },
    })
    fireEvent.click(screen.getByTestId('home-import-json'))
    expect(await screen.findByTestId('import-salvage-keep')).toBeInTheDocument()
    expect(screen.getByTestId('import-salvage')).toHaveTextContent('Nothing has been saved yet')
    fireEvent.click(screen.getByTestId('import-salvage-discard'))
    expect(screen.getByTestId('home-status')).toHaveTextContent('Nothing was saved')
    expect(writes.savedDefinitions).toBe(0)
    expect(screen.queryByTestId('import-salvage')).not.toBeInTheDocument()
  })

  it('keeps salvage non-authoritative until canonical validation can accept it', async () => {
    const adapter = createMemoryPersistenceAdapter()
    await renderReadyHome({ createAdapter: () => adapter })
    await waitFor(() => expect(screen.getByTestId('home-import-game')).toBeEnabled())
    fireEvent.click(screen.getByTestId('home-import-game'))
    const broken = boardGameFile({
      categories: [
        {
          id: 'sky',
          title: 'Sky',
          tiles: [{ id: 'sky-1', value: 100, prompt: 'Why is the sky blue?', answer: 'Scattering' }],
        },
      ],
    })
    ;(broken.rounds as Record<string, unknown>[]).push({
      id: 'nope',
      type: 'lightning',
      title: 'Nope',
      config: { secret: 'SECRET-QUESTION' },
    })
    fireEvent.change(screen.getByLabelText(/game file text/i), {
      target: { value: JSON.stringify(broken) },
    })
    fireEvent.click(screen.getByTestId('home-import-json'))
    fireEvent.click(await screen.findByTestId('import-salvage-keep'))
    const editor = await screen.findByText(/Editor page/)
    const gameId = editor.textContent?.replace('Editor page ', '') ?? ''
    expect(gameId).toBe('board-game')
    await adapter.open()
    const loaded = await loadLibraryRecord(adapter, gameId, createDefaultRegistry())
    expect(loaded.ok).toBe(true)
    if (!loaded.ok) return
    expect(loaded.value.summary.playable).toBe(true)
    expect(loaded.value.draft?.issues).toBeDefined()
    const blob = JSON.stringify(loaded.value)
    expect(blob).toContain('Why is the sky blue?')
    expect(blob).not.toContain('SECRET-QUESTION')
    expect(blob).not.toContain('Rayleigh')
  })

  it('does not let discard claim nothing was saved while keep is still saving', async () => {
    const adapter = createMemoryPersistenceAdapter()
    const broken = boardGameFile()
    ;(broken.rounds as Record<string, unknown>[]).push({
      id: 'nope',
      type: 'lightning',
      title: 'Nope',
      config: { secret: 'SECRET-QUESTION' },
    })
    await showCorruptImport(adapter, broken)
    const hold = holdSavedDefinitionWrites(adapter)
    fireEvent.click(screen.getByTestId('import-salvage-keep'))
    await hold.started
    await waitFor(() => {
      expect(screen.getByTestId('import-salvage-discard')).toBeDisabled()
    })
    expect(screen.getByTestId('import-salvage-keep')).toBeDisabled()
    expect(screen.getByTestId('home-import-json')).toBeDisabled()
    expect(screen.getByTestId('home-status')).toHaveTextContent('Saving the usable parts')
    fireEvent.click(screen.getByTestId('import-salvage-discard'))
    fireEvent.click(screen.getByTestId('home-import-json'))
    expect(screen.getByTestId('home-status')).toHaveTextContent('Saving the usable parts')
    expect(screen.getByTestId('home-status')).not.toHaveTextContent('Nothing was saved')
    hold.release()
    expect(await screen.findByText(/Editor page board-game/)).toBeInTheDocument()
    expect(document.body.textContent).not.toMatch(/Nothing was saved/i)
    await adapter.open()
    const loaded = await loadLibraryRecord(adapter, 'board-game', createDefaultRegistry())
    expect(loaded.ok).toBe(true)
  })

  it('keeps the salvage review when saving fails and then allows a truthful discard', async () => {
    const adapter = createMemoryPersistenceAdapter()
    const broken = boardGameFile({
      categories: [
        {
          id: 'sky',
          title: 'Sky',
          tiles: [{ id: 'sky-1', value: 100, prompt: 'Which gas?', answer: 4 }],
        },
      ],
    })
    await showCorruptImport(adapter, broken)
    failSavedDefinitionWrites(adapter, 'The game could not be saved.')
    fireEvent.click(screen.getByTestId('import-salvage-keep'))
    expect(await screen.findByText(/The game could not be saved/)).toBeInTheDocument()
    expect(screen.getByTestId('import-salvage')).toBeInTheDocument()
    expect(screen.getByTestId('import-salvage-discard')).toBeEnabled()
    expect(screen.getByTestId('import-salvage-keep')).toBeEnabled()
    fireEvent.click(screen.getByTestId('import-salvage-discard'))
    expect(screen.getByTestId('home-status')).toHaveTextContent('Nothing was saved')
    await adapter.open()
    const loaded = await loadLibraryRecord(adapter, 'board-game', createDefaultRegistry())
    expect(loaded.ok).toBe(false)
  })

  it('says the previous playable game was kept when an unfinished salvage replaces it', async () => {
    const adapter = createMemoryPersistenceAdapter()
    await adapter.open()
    const seeded = importGameFromJsonText(boardGameFileText())
    if (seeded.status !== 'success') throw new Error('seed import failed')
    const seededSave = await saveDefinition(adapter, seeded.definition, {
      mode: 'save',
      registry: createDefaultRegistry(),
    })
    if (!seededSave.ok) throw new Error(seededSave.message)
    const broken = boardGameFile({
      categories: [
        {
          id: 'sky',
          title: 'Sky',
          tiles: [{ id: 'sky-1', value: 100, prompt: 'Which gas?', answer: 4 }],
        },
      ],
    })
    await showCorruptImport(adapter, broken)
    fireEvent.click(screen.getByTestId('import-salvage-keep'))
    expect(await screen.findByText(/Nothing new was saved yet/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Replace the existing saved game' }))
    expect(await screen.findByTestId('home-status')).toHaveTextContent(
      'The previous playable game was kept',
    )
    expect(screen.getByTestId('home-status').textContent).not.toMatch(
      /It is not ready to play until you finish the missing parts/,
    )
    expect(screen.getByTestId('import-salvage-open')).toBeInTheDocument()
    expect(screen.queryByText(/Editor page/)).not.toBeInTheDocument()
    const loaded = await loadLibraryRecord(adapter, 'board-game', createDefaultRegistry())
    expect(loaded.ok).toBe(true)
    if (!loaded.ok) return
    expect(loaded.value.summary.playable).toBe(true)
    expect(JSON.stringify(loaded.value.definition)).toContain('Alpha one hundred answer')
    expect(JSON.stringify(loaded.value.draft)).toContain('Which gas?')
    expect(JSON.stringify(loaded.value.draft)).not.toContain('Alpha one hundred answer')
  })
})
