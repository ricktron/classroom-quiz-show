import { describe, expect, it, vi, beforeEach } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { createSessionStore } from '../state/store'
import { importGameFromJsonText } from '../import/importGame'
import { boardGameFileText, imagePrompt, boardConfig, category, tile } from '../test/categoryBoardFixtures'
import { GamePackExportPanel } from './GamePackExportPanel'
import type { GameDefinition } from '../game/gameDefinition'
import { TINY_PNG_BYTES } from '../pack/testFixtures'
import { createPackResourceRegistry } from '../pack/resourceRegistry'

function loadDefinition(text: string): GameDefinition {
  const imported = importGameFromJsonText(text)
  if (imported.status !== 'success') throw new Error('fixture import failed')
  return imported.definition
}

function renderExport(options: {
  definition?: GameDefinition | null
  download?: ReturnType<typeof vi.fn>
  acquireMediaBytes?: (sourcePath: string) => Promise<{ status: 'success'; bytes: Uint8Array }>
} = {}) {
  const store = createSessionStore()
  const definition = options.definition === undefined ? null : options.definition
  const download =
    options.download ??
    vi.fn((input: { filename: string; bytes: Uint8Array }) => {
      void input
    })

  render(
    <GamePackExportPanel
      definition={definition}
      registry={store.getRegistry()}
      download={download}
      acquireMediaBytes={options.acquireMediaBytes}
      packRegistry={createPackResourceRegistry({
        createObjectURL: () => 'blob:export-test',
        revokeObjectURL: () => undefined,
      })}
    />,
  )

  return { store, download }
}

describe('GamePackExportPanel', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('disables download when no game is loaded', () => {
    renderExport({ definition: null })
    expect(screen.getByTestId('pack-export-no-game')).toHaveTextContent('No game loaded.')
    expect(screen.getByTestId('pack-export-download')).toBeDisabled()
  })

  it('shows privacy and media inclusion warnings', () => {
    const definition = loadDefinition(
      boardGameFileText(
        boardConfig({
          categories: [category('c1', { tiles: [tile('t1', { prompt: imagePrompt() })] })],
        }),
        { id: 'pack-warn-game', title: 'Pack Warn' },
      ),
    )
    renderExport({ definition })
    expect(screen.getByTestId('pack-export-privacy-warning')).toHaveTextContent(/answer keys/i)
    expect(screen.getByTestId('pack-export-media-note')).toHaveTextContent(/embedded raster media/i)
  })

  it('exports successfully with injected media resolver', async () => {
    const definition = loadDefinition(
      boardGameFileText(
        boardConfig({
          categories: [category('c1', { tiles: [tile('t1', { prompt: imagePrompt() })] })],
        }),
        { id: 'pack-panel-export', title: 'Pack Export' },
      ),
    )
    const download = vi.fn()
    renderExport({
      definition,
      download,
      acquireMediaBytes: async () => ({ status: 'success', bytes: TINY_PNG_BYTES }),
    })

    fireEvent.click(screen.getByTestId('pack-export-download'))

    await vi.waitFor(() => {
      expect(download).toHaveBeenCalledTimes(1)
    })
    const [input] = download.mock.calls[0]!
    expect(input.filename).toBe('pack-panel-export.cqs-pack')
    expect(screen.getByTestId('pack-export-result')).toHaveTextContent(/pack export ready/i)
  })
})
