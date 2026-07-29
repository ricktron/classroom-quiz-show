import { describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
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
    library: [],
    message: 'Local persistence ready.',
    initialHistory: [],
    storeEpoch: 0,
    canDispatchSessionCommands: true,
    resume: vi.fn(),
    discardRecovery: vi.fn(async () => ({ ok: true, message: 'Discarded.' })),
    refreshLibrary: vi.fn(async () => ({ ok: true, message: 'Refreshed.' })),
    saveCurrentDefinition: vi.fn(async () => ({ ok: true, message: 'Saved.' })),
    replaceCurrentDefinition: vi.fn(async () => ({ ok: true, message: 'Replaced.' })),
    deleteSaved: vi.fn(async () => ({ ok: true, message: 'Deleted.' })),
    loadSaved: vi.fn(async () => ({ ok: true as const, message: 'Loaded.' })),
    dispatchSessionCommand: vi.fn(),
    renewLease: vi.fn(async () => ({ ok: true, message: 'Renewed.' })),
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
    await act(async () => {
      fireEvent.click(screen.getByTestId('persistence-discard'))
    })
    expect(discardRecovery).toHaveBeenCalledTimes(1)
  })

  it('shows follower notice and disables library mutation controls', () => {
    renderControls(
      persistence({
        leadership: 'follower',
        canDispatchSessionCommands: false,
        library: [{ gameId: 'sample-game', title: 'Sample Game', savedAt: 1 }],
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
        library: [{ gameId: 'sample-game', title: 'Sample Game', savedAt: 1 }],
        saveCurrentDefinition,
        loadSaved,
        deleteSaved,
      }),
    )

    fireEvent.click(screen.getByTestId('persistence-save'))
    fireEvent.click(screen.getByTestId('persistence-load'))
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

    expect(screen.getByRole('heading', { name: /persistence & recovery/i })).toBeVisible()
    expect(screen.getByLabelText(/persistence status/i)).toBeVisible()
    expect(screen.getByRole('button', { name: /save current definition/i })).toBeVisible()
  })
})
