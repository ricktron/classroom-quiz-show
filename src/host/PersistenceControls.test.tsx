import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { createDefaultRegistry } from '../game/defaultRegistry'
import type { GameDefinition } from '../game/gameDefinition'
import { importGameFromJsonText } from '../import/importGame'
import { gameFileText } from '../test/gameFileFixtures'
import { createMemoryPersistenceAdapter } from '../persistence'
import type { UseHostPersistence } from './useHostPersistence'
import { PersistenceControls } from './PersistenceControls'

function definition(): GameDefinition {
  const imported = importGameFromJsonText(gameFileText())
  if (imported.status !== 'success') throw new Error('fixture import failed')
  return imported.definition
}

function persistence(overrides: Partial<UseHostPersistence> = {}): UseHostPersistence {
  return {
    adapter: createMemoryPersistenceAdapter(),
    bootPhase: 'ready',
    recovery: null,
    invalidRecovery: null,
    leadership: 'leader',
    durabilityStatus: 'idle',
    durableEventCount: 0,
    pendingEventCount: null,
    activeSessionPersistFailed: false,
    ledgerStatus: 'idle',
    ledgerMessage: 'Completed-session ledger ready.',
    currentCompletionSave: null,
    completedListings: [],
    library: [],
    message: 'Local persistence ready.',
    initialHistory: [],
    storeEpoch: 0,
    canDispatchSessionCommands: true,
    resume: vi.fn(),
    discardRecovery: vi.fn(async () => ({ ok: true, message: 'Discarded.' })),
    retryActiveSessionPersist: vi.fn(async () => ({ ok: true, message: 'Retried.' })),
    refreshLibrary: vi.fn(async () => ({ ok: true, message: 'Refreshed.' })),
    saveCurrentDefinition: vi.fn(async () => ({ ok: true, message: 'Saved.' })),
    replaceCurrentDefinition: vi.fn(async () => ({ ok: true, message: 'Replaced.' })),
    deleteSaved: vi.fn(async () => ({ ok: true, message: 'Deleted.' })),
    loadSaved: vi.fn(async () => ({ ok: true as const, message: 'Loaded.' })),
    dispatchSessionCommand: vi.fn(),
    renewLease: vi.fn(async () => ({ ok: true, message: 'Renewed.' })),
    retryCurrentCompletionSave: vi.fn(async () => ({ ok: true, message: 'Retried.' })),
    refreshCompletedLedger: vi.fn(async () => ({ ok: true, message: 'Refreshed.' })),
    deleteCompletedRecord: vi.fn(async () => ({ ok: true, message: 'Deleted.' })),
    clearAllCompletedRecords: vi.fn(async () => ({ ok: true, message: 'Cleared.' })),
    clearAllLocalData: vi.fn(async () => ({ ok: true, message: 'All local data cleared.' })),
    updateCompletedClassLabel: vi.fn(async () => ({ ok: true, message: 'Updated.' })),
    ...overrides,
  }
}

function renderControls(p: UseHostPersistence = persistence()) {
  const registry = createDefaultRegistry()
  return render(
    <PersistenceControls
      persistence={p}
      activeGame={null}
      activeDefinition={definition()}
      registry={registry}
      dispatch={vi.fn()}
      getHistory={() => []}
    />,
  )
}

describe('PersistenceControls', () => {
  it('renders explicit recovery choices', () => {
    const resume = vi.fn()
    renderControls(
      persistence({
        bootPhase: 'recovery',
        recovery: { events: [], savedAt: 1 },
        message: 'Recovery found.',
        resume,
      }),
    )

    expect(screen.getByTestId('persistence-status')).toHaveTextContent(/resumable active session found/i)
    expect(screen.getByTestId('persistence-recovery')).toHaveTextContent(/unfinished session/i)
    fireEvent.click(screen.getByTestId('persistence-resume'))
    expect(resume).toHaveBeenCalledTimes(1)
    expect(screen.getByTestId('persistence-discard')).toBeEnabled()
  })

  it('renders invalid recovery with discard path', async () => {
    const discardRecovery = vi.fn(async () => ({ ok: true, message: 'Discarded.' }))
    renderControls(
      persistence({
        bootPhase: 'invalid-recovery',
        invalidRecovery: { code: 'corrupt', message: 'The stored record is corrupt.' },
        durabilityStatus: 'failed',
        discardRecovery,
      }),
    )

    expect(screen.getByTestId('persistence-recovery')).toHaveTextContent(/could not be used/i)
    expect(screen.getByTestId('persistence-warning')).toHaveTextContent(/might not survive refresh/i)
    fireEvent.click(screen.getByTestId('persistence-discard'))
    expect(discardRecovery).not.toHaveBeenCalled()
    fireEvent.click(screen.getByTestId('persistence-discard'))
    await waitFor(() => {
      expect(discardRecovery).toHaveBeenCalledTimes(1)
      expect(screen.getByText('Discarded.')).toBeInTheDocument()
    })
  })

  it('shows follower notice and disables library mutation controls', () => {
    renderControls(
      persistence({
        leadership: 'follower',
        canDispatchSessionCommands: false,
        library: [{ gameId: 'sample-game', title: 'Sample Game', savedAt: 1, hasDraft: false, playable: true }],
      }),
    )

    expect(screen.getByTestId('persistence-follower-notice')).toHaveTextContent(/read-only/i)
    expect(screen.getByTestId('persistence-save')).toBeDisabled()
    expect(screen.getByTestId('persistence-load')).toBeDisabled()
    expect(screen.getByTestId('persistence-delete')).toBeDisabled()
  })

  it('renders saved definition controls and calls actions', async () => {
    const saveCurrentDefinition = vi.fn(async () => ({ ok: true, message: 'Saved.' }))
    const loadSaved = vi.fn(async () => ({ ok: true as const, message: 'Loaded.' }))
    const deleteSaved = vi.fn(async () => ({ ok: true, message: 'Deleted.' }))
    renderControls(
      persistence({
        library: [{ gameId: 'sample-game', title: 'Sample Game', savedAt: 1, hasDraft: false, playable: true }],
        saveCurrentDefinition,
        loadSaved,
        deleteSaved,
      }),
    )

    fireEvent.click(screen.getByTestId('persistence-save'))
    fireEvent.click(screen.getByTestId('persistence-load'))
    fireEvent.click(screen.getByTestId('persistence-delete'))
    expect(deleteSaved).not.toHaveBeenCalled()
    fireEvent.click(screen.getByTestId('persistence-delete'))

    await waitFor(() => expect(saveCurrentDefinition).toHaveBeenCalledTimes(1))
    expect(loadSaved).toHaveBeenCalledTimes(1)
    expect(deleteSaved).toHaveBeenCalledWith('sample-game')
    expect(screen.getByTestId('persistence-library')).toHaveTextContent('Sample Game')
  })

  it('arms replace confirmation after save reports an existing changed definition', async () => {
    const saveCurrentDefinition = vi.fn(async () => ({
      ok: false,
      message: 'Replace confirmation required.',
    }))
    renderControls(persistence({ saveCurrentDefinition }))

    expect(screen.getByTestId('persistence-replace-confirm')).toBeDisabled()
    fireEvent.click(screen.getByTestId('persistence-save'))
    await waitFor(() => expect(screen.getByTestId('persistence-replace-confirm')).toBeEnabled())
  })

  it('uses accessible labels and live regions', () => {
    renderControls(persistence({ durabilityStatus: 'saved' }))

    expect(screen.getByRole('heading', { name: /saved games and this class session/i })).toBeVisible()
    expect(screen.getByLabelText(/persistence status/i)).toBeVisible()
    expect(screen.getByRole('button', { name: /save current game/i })).toBeVisible()
  })

  it('shows the clear-all control and requires confirmation before wiping', async () => {
    const clearAllLocalData = vi.fn(async () => ({
      ok: true,
      message:
        'All local Classroom Quiz Show data on this browser was cleared. Reloading a clean host.',
    }))
    const reloadPage = vi.fn()
    render(
      <PersistenceControls
        persistence={persistence({ clearAllLocalData })}
        activeGame={null}
        activeDefinition={definition()}
        registry={createDefaultRegistry()}
        dispatch={vi.fn()}
        getHistory={() => []}
        reloadPage={reloadPage}
      />,
    )

    expect(screen.getByTestId('persistence-clear-all')).toBeVisible()
    expect(screen.getByRole('heading', { name: /clear all local cqs data/i })).toBeVisible()
    fireEvent.click(screen.getByTestId('persistence-clear-all-action'))
    expect(clearAllLocalData).not.toHaveBeenCalled()
    expect(screen.getByTestId('persistence-clear-all-warning')).toBeVisible()

    fireEvent.click(screen.getByTestId('persistence-clear-all-action'))
    await waitFor(() => expect(clearAllLocalData).toHaveBeenCalledTimes(1))
    expect(reloadPage).toHaveBeenCalledTimes(1)
  })

  it('cancel leaves confirmation without calling clear', () => {
    const clearAllLocalData = vi.fn(async () => ({ ok: true, message: 'Cleared.' }))
    renderControls(persistence({ clearAllLocalData }))

    fireEvent.click(screen.getByTestId('persistence-clear-all-action'))
    fireEvent.click(screen.getByTestId('persistence-clear-all-cancel'))
    expect(clearAllLocalData).not.toHaveBeenCalled()
    expect(screen.queryByTestId('persistence-clear-all-warning')).toBeNull()
    expect(screen.getByTestId('persistence-clear-all-action')).toHaveTextContent(
      /clear all local cqs data/i,
    )
  })

  it('does not reload or claim success when clear is blocked', async () => {
    const clearAllLocalData = vi.fn(async () => ({
      ok: false,
      message:
        'Could not clear all local CQS data because another Classroom Quiz Show tab or window still has storage open. Close other CQS tabs and windows, then try again.',
    }))
    const reloadPage = vi.fn()
    render(
      <PersistenceControls
        persistence={persistence({ clearAllLocalData })}
        activeGame={null}
        activeDefinition={definition()}
        registry={createDefaultRegistry()}
        dispatch={vi.fn()}
        getHistory={() => []}
        reloadPage={reloadPage}
      />,
    )

    fireEvent.click(screen.getByTestId('persistence-clear-all-action'))
    fireEvent.click(screen.getByTestId('persistence-clear-all-action'))
    await waitFor(() => expect(clearAllLocalData).toHaveBeenCalledTimes(1))
    expect(reloadPage).not.toHaveBeenCalled()
    expect(screen.getByTestId('persistence-clear-all-message')).toHaveTextContent(
      /close other cqs tabs/i,
    )
    expect(screen.getByTestId('persistence-clear-all-message')).not.toHaveTextContent(
      /was cleared/i,
    )
  })

  it('does not reload or claim complete success when keyboard prefs could not be removed', async () => {
    // Partial destruction: IndexedDB deletion succeeded, keyboard-mapping
    // removal failed. The aggregate result is non-success, so there must be no
    // "all data cleared" copy and no success reload.
    const clearAllLocalData = vi.fn(async () => ({
      ok: false,
      message:
        'Could not clear all local CQS data. Stored Classroom Quiz Show game data was deleted, but the saved buzz-key preferences on this device could not be removed.',
    }))
    const reloadPage = vi.fn()
    render(
      <PersistenceControls
        persistence={persistence({ clearAllLocalData })}
        activeGame={null}
        activeDefinition={definition()}
        registry={createDefaultRegistry()}
        dispatch={vi.fn()}
        getHistory={() => []}
        reloadPage={reloadPage}
      />,
    )

    fireEvent.click(screen.getByTestId('persistence-clear-all-action'))
    fireEvent.click(screen.getByTestId('persistence-clear-all-action'))
    await waitFor(() => expect(clearAllLocalData).toHaveBeenCalledTimes(1))
    await waitFor(() =>
      expect(screen.getByTestId('persistence-clear-all-message')).toHaveTextContent(
        /could not clear all local cqs data/i,
      ),
    )
    expect(screen.getByTestId('persistence-clear-all-message')).toHaveTextContent(
      /buzz-key preferences on this device could not be removed/i,
    )
    expect(reloadPage).not.toHaveBeenCalled()
    expect(screen.getByTestId('persistence-clear-all-message')).not.toHaveTextContent(
      /all local classroom quiz show data on this browser was cleared/i,
    )
  })

  it('does not reload when clear fails', async () => {
    const clearAllLocalData = vi.fn(async () => ({
      ok: false,
      message:
        'Could not clear all local CQS data. Local storage may still contain Classroom Quiz Show data on this browser.',
    }))
    const reloadPage = vi.fn()
    render(
      <PersistenceControls
        persistence={persistence({ clearAllLocalData })}
        activeGame={null}
        activeDefinition={definition()}
        registry={createDefaultRegistry()}
        dispatch={vi.fn()}
        getHistory={() => []}
        reloadPage={reloadPage}
      />,
    )

    fireEvent.click(screen.getByTestId('persistence-clear-all-action'))
    fireEvent.click(screen.getByTestId('persistence-clear-all-action'))
    await waitFor(() => expect(clearAllLocalData).toHaveBeenCalledTimes(1))
    expect(reloadPage).not.toHaveBeenCalled()
    expect(screen.getByTestId('persistence-clear-all-message')).toHaveTextContent(
      /may still contain/i,
    )
  })
})
