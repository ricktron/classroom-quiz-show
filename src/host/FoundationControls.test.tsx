import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter, Route, Routes, useNavigate } from 'react-router-dom'
import { HostRoute } from '../routes/HostRoute'
import { editPath, playPath, ROUTES } from '../routes/paths'
import { ThemeProvider } from '../theme/ThemeProvider'
import { createMemoryPersistenceAdapter } from '../persistence/memoryAdapter'
import { createDefaultRegistry } from '../game/defaultRegistry'
import { applyDraftCorrection } from '../authoring'
import { createNewLibraryGame, saveAuthoringDraftToLibrary } from '../library/gameLibrary'
import { listSavedDefinitions } from '../persistence'
import type { PersistenceAdapter } from '../persistence/adapter'
import type { UseHostPersistenceOptions } from './useHostPersistence'
import { shouldResumeRecoveryFromNavigation, isContextualTeamCountReturn } from './hostResumeNavigation'
import {
  hostPersistenceOptions,
  seedResumableHostSession,
  seedSavedPlayableGame,
  stubHostMatchMedia,
} from '../test/hostPersistenceTestFixtures'

afterEach(() => {
  cleanup()
  document.documentElement.removeAttribute('data-theme')
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

beforeEach(() => {
  stubHostMatchMedia(vi)
})

function renderHost(
  entry: string | { pathname: string; search?: string; state?: unknown },
  options: UseHostPersistenceOptions,
) {
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
  })
  // Workflow may open Buzzers first; Names is still required for Start.
  fireEvent.click(screen.getByTestId('readiness-names'))
  await waitFor(() => {
    expect(screen.getByTestId('setup-current-task')).toHaveAttribute('data-task', 'names')
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
    const { adapter, gameId } = await seedSavedPlayableGame()
    renderHost(
      { pathname: ROUTES.host, search: `?play=${encodeURIComponent(gameId)}` },
      hostPersistenceOptions(adapter, 'fc-change-game'),
    )

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
    const { adapter, gameId } = await seedSavedPlayableGame()
    renderHost(
      { pathname: ROUTES.host, search: `?play=${encodeURIComponent(gameId)}` },
      hostPersistenceOptions(adapter, 'fc-lifecycle-mount'),
    )
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
    expect(isContextualTeamCountReturn({ cqsContextualTeamCountReturn: true })).toBe(true)

    const { adapter } = await seedResumableHostSession(undefined, 'fc-session-1')
    renderHost(
      { pathname: ROUTES.host, state: { cqsResumeRecovery: true } },
      hostPersistenceOptions(adapter, 'fc-welcome-gate'),
    )
    await waitFor(() => {
      expect(screen.getByTestId('host-welcome-back')).toBeInTheDocument()
    })
    expect(screen.getByTestId('host-welcome-back')).toHaveTextContent(/welcome back/i)
    cleanup()

    const { adapter: adapter2 } = await seedResumableHostSession(undefined, 'fc-session-2')
    renderHost(ROUTES.host, hostPersistenceOptions(adapter2, 'fc-welcome-no-home-intent'))
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
    const { adapter, gameId } = await seedSavedPlayableGame()
    renderHost(playPath(gameId), hostPersistenceOptions(adapter, 'fc-start-back'))
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
    renderHost(ROUTES.host, hostPersistenceOptions(adapter, 'fc-bare-host'))
    await waitFor(() => {
      expect(screen.getByTestId('host-foundation')).toBeInTheDocument()
    })
    expect(screen.getByTestId('host-foundation')).toHaveAttribute('data-posture', 'play')
    expect(screen.getByTestId('host-more')).toHaveAttribute('open')
    expect(screen.queryByTestId('classroom-setup')).not.toBeInTheDocument()
  })
})

/**
 * UIX-O16: a teacher sent to Host for a Game that is not playable yet met a
 * blank screen: the reason existed only inside the More drawer.
 */
/** A saved Game with its own title that is not playable yet (blank board and Final). */
async function seedUnfinishedGame(adapter: PersistenceAdapter, title: string): Promise<string> {
  const registry = createDefaultRegistry()
  const created = await createNewLibraryGame(adapter, registry)
  if (!created.ok) throw new Error(created.message)
  const saved = await saveAuthoringDraftToLibrary(
    adapter,
    applyDraftCorrection(created.value.draft, { kind: 'game-title', title }),
    registry,
  )
  if (!saved.ok) throw new Error(saved.message)
  if (saved.value.playable) throw new Error('fixture must be an unfinished Game')
  return created.value.definition.id
}

describe('UIX-O16: Host explains a Play request for an unfinished Game', () => {
  it('names the requested Game, says it is not ready, and offers its editor instead of a blank Host', async () => {
    const adapter = createMemoryPersistenceAdapter()
    await adapter.open()
    const gameId = await seedUnfinishedGame(adapter, 'Volcano Review')

    renderHost(
      { pathname: ROUTES.host, search: `?play=${encodeURIComponent(gameId)}` },
      hostPersistenceOptions(adapter, 'fc-unfinished-play'),
    )

    const notice = await screen.findByTestId('play-not-ready')
    expect(notice).toHaveAttribute('role', 'alert')
    // The notice says which Game it is about, by its saved-library title.
    expect(notice).toHaveTextContent(
      '“Volcano Review” is not ready to play yet. Open it to finish what is missing.',
    )
    expect(notice).not.toHaveTextContent(/this game is not ready/i)
    expect(screen.getByTestId('play-not-ready-edit')).toHaveAttribute('href', editPath(gameId))
    // Nothing was loaded: no Class Setup for a Game that cannot be played.
    expect(screen.queryByTestId('classroom-setup')).not.toBeInTheDocument()
    expect(screen.getByTestId('host-change-game')).toBeInTheDocument()
  })

  it('does not offer to replace an active class session with a Game that cannot be played', async () => {
    // A class session is already running Game A; the teacher is then sent to
    // Host for unfinished Game B. Offering "replace the current session" for a
    // Game that will not load would contradict the not-ready notice.
    const { adapter, gameId: playableId } = await seedSavedPlayableGame()
    const unfinishedId = await seedUnfinishedGame(adapter, 'Volcano Review')
    const library = await listSavedDefinitions(adapter)
    if (!library.ok) throw new Error(library.message)
    const activeTitle = library.value.find((entry) => entry.gameId === playableId)?.title
    if (!activeTitle) throw new Error('fixture: playable Game A has no saved title')
    expect(activeTitle).not.toBe('Volcano Review')

    function GoToUnfinished() {
      const navigate = useNavigate()
      return (
        <button type="button" onClick={() => navigate(playPath(unfinishedId))}>
          go to unfinished
        </button>
      )
    }
    render(
      <MemoryRouter initialEntries={[playPath(playableId)]}>
        <ThemeProvider>
          <GoToUnfinished />
          <Routes>
            <Route
              path={ROUTES.host}
              element={
                <HostRoute persistenceOptions={hostPersistenceOptions(adapter, 'fc-unfinished-active')} />
              }
            />
          </Routes>
        </ThemeProvider>
      </MemoryRouter>,
    )
    await waitFor(() => {
      expect(screen.getByTestId('classroom-setup')).toBeInTheDocument()
    })
    expect(screen.queryByTestId('play-not-ready')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /go to unfinished/i }))

    const notice = await screen.findByTestId('play-not-ready')
    // Game A's title and Class Setup are still on screen, so the notice must
    // name Game B itself. It must never read as a statement about Game A.
    expect(notice).toHaveTextContent(
      '“Volcano Review” is not ready to play yet. Open it to finish what is missing.',
    )
    expect(notice).not.toHaveTextContent(activeTitle)
    expect(notice).not.toHaveTextContent(/this game is not ready/i)
    expect(screen.getByTestId('play-not-ready-edit')).toHaveAttribute('href', editPath(unfinishedId))
    // The running session is untouched and no contradictory replace prompt appears.
    await waitFor(() => {
      expect(screen.queryByTestId('play-replace-confirm')).not.toBeInTheDocument()
    })
    expect(screen.getByTestId('classroom-setup')).toBeInTheDocument()
    expect(screen.getByTestId('host-identity')).toHaveTextContent(activeTitle)
  })

  it('shows nothing invented when the requested Game is not in the saved library', async () => {
    const { adapter } = await seedSavedPlayableGame()
    renderHost(
      { pathname: ROUTES.host, search: '?play=game-that-was-never-saved' },
      hostPersistenceOptions(adapter, 'fc-unknown-play'),
    )
    await waitFor(() => {
      expect(screen.getByTestId('host-change-game')).toBeInTheDocument()
    })
    // No library record means no identity to state: no notice and no made-up title.
    await waitFor(() => {
      expect(screen.getByTestId('host-foundation')).toBeInTheDocument()
    })
    expect(screen.queryByTestId('play-not-ready')).not.toBeInTheDocument()
    expect(screen.getByTestId('host-foundation')).not.toHaveTextContent('game-that-was-never-saved')
  })

  it('falls back to unnamed wording rather than quoting a blank saved title', async () => {
    const adapter = createMemoryPersistenceAdapter()
    await adapter.open()
    const gameId = await seedUnfinishedGame(adapter, 'Volcano Review')
    // A saved record whose title is only whitespace (for example from a restored file).
    const rewritten = await adapter.withTransaction(['savedDefinitions'], async (tx) => {
      const record = (await tx.get('savedDefinitions', gameId)) as Record<string, unknown>
      await tx.put('savedDefinitions', gameId, { ...record, title: '   ' })
    })
    if (!rewritten.ok) throw new Error(rewritten.message)

    renderHost(
      { pathname: ROUTES.host, search: `?play=${encodeURIComponent(gameId)}` },
      hostPersistenceOptions(adapter, 'fc-blank-title-play'),
    )

    const notice = await screen.findByTestId('play-not-ready')
    expect(notice).toHaveTextContent(
      'This game is not ready to play yet. Open it to finish what is missing.',
    )
    expect(notice).not.toHaveTextContent('“')
    expect(screen.getByTestId('play-not-ready-edit')).toHaveAttribute('href', editPath(gameId))
  })

  it('shows no such notice for a playable Game', async () => {
    const { adapter, gameId } = await seedSavedPlayableGame()
    renderHost(
      { pathname: ROUTES.host, search: `?play=${encodeURIComponent(gameId)}` },
      hostPersistenceOptions(adapter, 'fc-playable-play'),
    )
    await waitFor(() => {
      expect(screen.getByTestId('classroom-setup')).toBeInTheDocument()
    })
    expect(screen.queryByTestId('play-not-ready')).not.toBeInTheDocument()
  })
})
