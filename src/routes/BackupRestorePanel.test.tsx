import { describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { createDefaultRegistry } from '../game/defaultRegistry'
import { createSampleGame } from '../game/sampleGame'
import { createMemoryPersistenceAdapter } from '../persistence/memoryAdapter'
import { saveDefinition } from '../persistence/savedDefinitions'
import { BackupRestorePanel } from './BackupRestorePanel'
import * as backupModule from '../backup'

describe('BackupRestorePanel', () => {
  it('is collapsed by default and exposes privacy copy', async () => {
    const adapter = createMemoryPersistenceAdapter()
    await adapter.open()
    render(
      <BackupRestorePanel
        adapter={adapter}
        registry={createDefaultRegistry()}
        library={[]}
      />,
    )
    const details = screen.getByTestId('backup-restore')
    expect(details).toBeInstanceOf(HTMLDetailsElement)
    expect((details as HTMLDetailsElement).open).toBe(false)
    fireEvent.click(screen.getByText('Backup & restore'))
    expect(screen.getByTestId('backup-restore-privacy').textContent).toMatch(/classroom content/i)
    expect(screen.getByTestId('backup-restore-privacy').textContent).toMatch(
      /does not include an unfinished class session/i,
    )
  })

  it('downloads a backup and reports success without classroom projection fields', async () => {
    const adapter = createMemoryPersistenceAdapter()
    await adapter.open()
    const registry = createDefaultRegistry()
    const game = createSampleGame()
    await saveDefinition(adapter, game, { mode: 'save', registry })

    const downloadSpy = vi.spyOn(backupModule, 'downloadBackupFile').mockImplementation(() => undefined)

    render(
      <BackupRestorePanel
        adapter={adapter}
        registry={registry}
        library={[{ gameId: game.id, title: game.title, savedAt: 1, hasDraft: false, playable: true }]}
      />,
    )
    fireEvent.click(screen.getByText('Backup & restore'))
    fireEvent.click(screen.getByTestId('backup-download'))

    await waitFor(() => {
      expect(downloadSpy).toHaveBeenCalled()
      expect(screen.getByTestId('backup-restore-status').textContent).toMatch(/Downloaded a backup/i)
    })
    downloadSpy.mockRestore()
  })

  it('previews restore and requires confirm when conflicts exist', async () => {
    const adapter = createMemoryPersistenceAdapter()
    await adapter.open()
    const registry = createDefaultRegistry()
    const game = createSampleGame()
    await saveDefinition(adapter, game, { mode: 'save', registry })
    const built = await backupModule.buildBackupFromAdapter({ adapter, registry })
    expect(built.status).toBe('success')
    if (built.status !== 'success') return

    const onLibraryChanged = vi.fn()
    render(
      <BackupRestorePanel
        adapter={adapter}
        registry={registry}
        library={[{ gameId: game.id, title: game.title, savedAt: 1, hasDraft: false, playable: true }]}
        readFileText={async () => built.jsonText}
        onLibraryChanged={onLibraryChanged}
      />,
    )
    fireEvent.click(screen.getByText('Backup & restore'))
    const input = screen.getByTestId('backup-file-input')
    const file = new File([built.jsonText], 'classroom-quiz-show.backup.json', {
      type: 'application/json',
    })
    fireEvent.change(input, { target: { files: [file] } })

    await waitFor(() => {
      expect(screen.getByTestId('backup-preview')).toBeTruthy()
      expect(screen.getByTestId('backup-restore-status').textContent).toMatch(/would be replaced/i)
    })

    fireEvent.click(screen.getByTestId('backup-restore-action'))
    await waitFor(() => {
      expect(screen.getByTestId('backup-restore-status').textContent).toMatch(/Confirm that you want to replace/i)
    })
    expect(onLibraryChanged).not.toHaveBeenCalled()

    fireEvent.click(screen.getByTestId('backup-restore-action'))
    await waitFor(() => {
      expect(screen.getByTestId('backup-restore-status').textContent).toMatch(/Restored/i)
    })
    expect(onLibraryChanged).toHaveBeenCalled()
  })

  it('cancel abandons a staged restore without applying', async () => {
    const adapter = createMemoryPersistenceAdapter()
    await adapter.open()
    const registry = createDefaultRegistry()
    const built = await backupModule.buildBackupFromAdapter({ adapter, registry })
    expect(built.status).toBe('success')
    if (built.status !== 'success') return

    render(
      <BackupRestorePanel
        adapter={adapter}
        registry={registry}
        library={[]}
        readFileText={async () => built.jsonText}
      />,
    )
    fireEvent.click(screen.getByText('Backup & restore'))
    const input = screen.getByTestId('backup-file-input')
    fireEvent.change(input, {
      target: {
        files: [new File([built.jsonText], 'x.backup.json', { type: 'application/json' })],
      },
    })
    await waitFor(() => expect(screen.getByTestId('backup-preview')).toBeTruthy())
    fireEvent.click(screen.getByTestId('backup-restore-cancel'))
    expect(screen.queryByTestId('backup-preview')).toBeNull()
    expect(screen.getByTestId('backup-restore-status').textContent).toMatch(/cancelled/i)
  })
})
