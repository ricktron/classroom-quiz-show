import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { HostRoute } from '../routes/HostRoute'
import { playPath, ROUTES } from '../routes/paths'
import { ThemeProvider } from '../theme/ThemeProvider'
import { createMemoryPersistenceAdapter } from '../persistence/memoryAdapter'
import {
  PersistenceWriteQueue,
  saveDefinition,
  writeActiveSession,
} from '../persistence'
import { createDefaultRegistry } from '../game/defaultRegistry'
import { importGameFromJsonText } from '../import/importGame'
import { createSessionStore } from '../state/store'
import { gameFileText } from '../test/gameFileFixtures'
import { teamBoardGameFileText } from '../test/teamFixtures'
import { createManualClock } from '../time/clock'
import type { UseHostPersistenceOptions } from './useHostPersistence'
import { shouldResumeRecoveryFromNavigation } from './hostResumeNavigation'

const AT = 1_000_000

afterEach(() => {
  cleanup()
  document.documentElement.removeAttribute('data-theme')
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

beforeEach(() => {
  vi.stubGlobal(
    'matchMedia',
    vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
      onchange: null,
    })),
  )
})

async function seedSavedPlayableGame(
  adapter: ReturnType<typeof createMemoryPersistenceAdapter>,
): Promise<string> {
  // Must include teams so Class Setup lands on Names (not 0-team Blocked).
  const imported = importGameFromJsonText(teamBoardGameFileText())
  if (imported.status !== 'success') throw new Error('fixture import failed')
  await adapter.open()
  const saved = await saveDefinition(adapter, imported.definition, {
    mode: 'save',
    registry: createDefaultRegistry(),
  })
  if (!saved.ok) throw new Error(saved.message)
  return imported.definition.id
}

async function seedResumableSession(
  adapter: ReturnType<typeof createMemoryPersistenceAdapter>,
): Promise<void> {
  const imported = importGameFromJsonText(gameFileText())
  if (imported.status !== 'success') throw new Error('fixture import failed')
  const store = createSessionStore()
  store.dispatch({ type: 'INIT_SESSION', issuedAt: AT, sessionId: 'fc-session-1' })
  store.dispatch({ type: 'INITIALIZE_GAME', issuedAt: AT, definition: imported.definition })
  await adapter.open()
  const written = await writeActiveSession(
    adapter,
    store.getHistory(),
    AT,
    new PersistenceWriteQueue(),
    createDefaultRegistry(),
  )
  if (!written.ok) throw new Error(written.message)
}

function renderHost(entry: string | { pathname: string; search?: string; state?: unknown }, options: UseHostPersistenceOptions) {
  const initialEntries =
    typeof entry === 'string'
      ? [entry]
      : [
          {
            pathname: entry.pathname,
            search: entry.search,
            state: entry.state,
          },
        ]
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <ThemeProvider>
        <Routes>
          <Route path={ROUTES.host} element={<HostRoute persistenceOptions={options} />} />
          <Route path={ROUTES.root} element={<p data-testid="home-probe">Home</p>} />
        </Routes>
      </ThemeProvider>
    </MemoryRouter>,
  )
}

async function fillNamesAndStart(): Promise<void> {
  await waitFor(() => {
    expect(screen.getByTestId('classroom-setup')).toBeInTheDocument()
    expect(screen.getByTestId('setup-current-task')).toHaveAttribute('data-task', 'names')
  })
  await waitFor(() => {
    expect(screen.getAllByTestId(/^tnsb-manual-/).length).toBeGreaterThan(0)
  })
  const manuals = screen.getAllByTestId(/^tnsb-manual-/)
  for (let i = 0; i < manuals.length; i += 1) {
    fireEvent.change(manuals[i]!, { target: { value: `Squad ${i + 1}` } })
    fireEvent.blur(manuals[i]!)
  }
  await waitFor(() => {
    expect(screen.getByTestId('setup-play')).not.toBeDisabled()
  })
  fireEvent.click(screen.getByTestId('setup-play'))
  await waitFor(() => {
    expect(screen.getByTestId('host-foundation')).toHaveAttribute('data-posture', 'play')
  })
}

describe('FoundationControls thin semantic unit (MENUS H §5)', () => {
  it('shows Change game only in setup posture and hides it after Start', async () => {
    const adapter = createMemoryPersistenceAdapter()
    const gameId = await seedSavedPlayableGame(adapter)
    const options: UseHostPersistenceOptions = {
      createAdapter: () => adapter,
      tabId: 'fc-change-game',
      clock: createManualClock(AT),
      leaseTtlMs: 60_000,
      renewIntervalMs: 20_000,
      broadcastChannel: null,
    }
    renderHost({ pathname: ROUTES.host, search: `?play=${encodeURIComponent(gameId)}` }, options)

    await waitFor(() => {
      expect(screen.getByTestId('classroom-setup')).toBeInTheDocument()
    })
    expect(screen.getByTestId('host-foundation')).toHaveAttribute('data-posture', 'setup')
    expect(screen.getByTestId('host-change-game')).toBeInTheDocument()
    expect(screen.getByTestId('host-change-game')).toHaveTextContent(/change game/i)

    await fillNamesAndStart()
    expect(screen.queryByTestId('host-change-game')).not.toBeInTheDocument()
    expect(screen.getByTestId('setup-play')).toHaveTextContent(/back to setup/i)
  })

  it('keeps lifecycle owners mounted under More after Start (not unmounted)', async () => {
    const adapter = createMemoryPersistenceAdapter()
    const gameId = await seedSavedPlayableGame(adapter)
    const options: UseHostPersistenceOptions = {
      createAdapter: () => adapter,
      tabId: 'fc-lifecycle-mount',
      clock: createManualClock(AT),
      leaseTtlMs: 60_000,
      renewIntervalMs: 20_000,
      broadcastChannel: null,
    }
    renderHost({ pathname: ROUTES.host, search: `?play=${encodeURIComponent(gameId)}` }, options)
    await fillNamesAndStart()

    expect(screen.queryByTestId('classroom-setup')).not.toBeInTheDocument()
    // More stays closed in ordinary play, but demoted owners remain in the DOM.
    expect(screen.getByTestId('host-more')).not.toHaveAttribute('open')
    expect(screen.getByTestId('host-more')).toBeInTheDocument()
    expect(screen.getByTestId('host-advanced')).toBeInTheDocument()
    expect(screen.getByTestId('persistence-library')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /load a game/i })).toBeInTheDocument()
    // Gamepad detector owner stays mounted across posture (not under More).
    expect(screen.getByTestId('gih-summary')).toBeInTheDocument()
  })

  it('arms Welcome-back only after Home-Resume hydrate, not bare Host Persistence Resume', async () => {
    expect(shouldResumeRecoveryFromNavigation({ cqsResumeRecovery: true })).toBe(true)
    expect(shouldResumeRecoveryFromNavigation(null)).toBe(false)

    const adapter = createMemoryPersistenceAdapter()
    await seedResumableSession(adapter)
    const options: UseHostPersistenceOptions = {
      createAdapter: () => adapter,
      tabId: 'fc-welcome-gate',
      clock: createManualClock(AT),
      leaseTtlMs: 60_000,
      renewIntervalMs: 20_000,
      broadcastChannel: null,
    }

    renderHost(
      { pathname: ROUTES.host, state: { cqsResumeRecovery: true } },
      options,
    )
    await waitFor(() => {
      expect(screen.getByTestId('host-welcome-back')).toBeInTheDocument()
    })
    expect(screen.getByTestId('host-welcome-back')).toHaveTextContent(/welcome back/i)
    cleanup()

    const adapter2 = createMemoryPersistenceAdapter()
    await seedResumableSession(adapter2)
    const options2: UseHostPersistenceOptions = {
      createAdapter: () => adapter2,
      tabId: 'fc-welcome-no-home-intent',
      clock: createManualClock(AT),
      leaseTtlMs: 60_000,
      renewIntervalMs: 20_000,
      broadcastChannel: null,
    }
    renderHost(ROUTES.host, options2)
    await waitFor(() => {
      expect(screen.getByTestId('persistence-recovery')).toBeInTheDocument()
    })
    fireEvent.click(screen.getByTestId('persistence-resume'))
    await waitFor(() => {
      expect(screen.queryByTestId('persistence-recovery')).not.toBeInTheDocument()
    })
    await waitFor(() => {
      expect(screen.getByTestId('game-title')).toBeInTheDocument()
    })
    expect(screen.queryByTestId('host-welcome-back')).not.toBeInTheDocument()
  })

  it('owns Start→playReady and Back→setup without dropping mounted owners', async () => {
    const adapter = createMemoryPersistenceAdapter()
    const gameId = await seedSavedPlayableGame(adapter)
    const options: UseHostPersistenceOptions = {
      createAdapter: () => adapter,
      tabId: 'fc-start-back',
      clock: createManualClock(AT),
      leaseTtlMs: 60_000,
      renewIntervalMs: 20_000,
      broadcastChannel: null,
    }
    renderHost(playPath(gameId), options)
    await fillNamesAndStart()
    expect(screen.getByTestId('host-foundation')).toHaveAttribute('data-posture', 'play')
    expect(screen.getByTestId('host-advanced')).toBeInTheDocument()

    fireEvent.click(screen.getByTestId('setup-play'))
    await waitFor(() => {
      expect(screen.getByTestId('host-foundation')).toHaveAttribute('data-posture', 'setup')
    })
    expect(screen.getByTestId('classroom-setup')).toBeInTheDocument()
    expect(screen.getByTestId('setup-play')).toHaveTextContent(/start game/i)
    expect(screen.getByTestId('host-advanced')).toBeInTheDocument()
    expect(screen.getByTestId('gih-summary')).toBeInTheDocument()
  })

  it('keeps bare #/host default compatibility as play posture with More open', async () => {
    const adapter = createMemoryPersistenceAdapter()
    const options: UseHostPersistenceOptions = {
      createAdapter: () => adapter,
      tabId: 'fc-bare-host',
      clock: createManualClock(AT),
      leaseTtlMs: 60_000,
      renewIntervalMs: 20_000,
      broadcastChannel: null,
    }
    renderHost(ROUTES.host, options)
    await waitFor(() => {
      expect(screen.getByTestId('host-foundation')).toBeInTheDocument()
    })
    expect(screen.getByTestId('host-foundation')).toHaveAttribute('data-posture', 'play')
    expect(screen.getByTestId('host-more')).toHaveAttribute('open')
    expect(screen.queryByTestId('classroom-setup')).not.toBeInTheDocument()
  })
})
