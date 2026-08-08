import { describe, expect, it, vi, beforeEach } from 'vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { createSessionStore } from '../state/store'
import { importGameFromUnknown } from '../import/importGame'
import { boardGameFile, category, imagePrompt, tile } from '../test/categoryBoardFixtures'
import { buildPackFromDefinition } from '../pack/buildPack'
import { TINY_PNG_BYTES } from '../pack/testFixtures'
import { createMemoryPersistenceAdapter } from '../persistence/memoryAdapter'
import { GamePackImportPanel } from './GamePackImportPanel'
import { setSharedPackResourceRegistryForTests, createPackResourceRegistry } from '../pack/resourceRegistry'

const PNG_PATH = 'media-fixtures/slice-11-clue.png'

function pngResolver() {
  return async (sourcePath: string) => ({
    status: 'success' as const,
    bytes: sourcePath === PNG_PATH ? TINY_PNG_BYTES : new Uint8Array([0]),
  })
}

async function buildTestPackBytes(): Promise<Uint8Array> {
  const imported = importGameFromUnknown(
    boardGameFile({
      categories: [category('a', { tiles: [tile('a-1', { prompt: imagePrompt() })] })],
    }),
  )
  if (imported.status !== 'success') throw new Error('fixture failed')
  const built = await buildPackFromDefinition(imported.definition, {
    acquireMediaBytes: pngResolver(),
  })
  if (built.status !== 'success') throw new Error('build failed')
  return built.bytes
}

function renderPanel(
  options: {
    hasSession?: boolean
    adapter?: ReturnType<typeof createMemoryPersistenceAdapter>
    readFileBytes?: (file: File) => Promise<Uint8Array>
  } = {},
) {
  const store = createSessionStore()
  if (options.hasSession !== false) {
    store.dispatch({ type: 'INIT_SESSION', issuedAt: 1, sessionId: 'session-1' })
  }
  const adapter = options.adapter ?? createMemoryPersistenceAdapter()
  render(
    <GamePackImportPanel
      dispatch={(command) => store.dispatch(command)}
      registry={store.getRegistry()}
      hasSession={options.hasSession !== false}
      activeGame={store.getState().session?.game ?? null}
      adapter={adapter}
      readFileBytes={options.readFileBytes}
      packRegistry={createPackResourceRegistry({
        createObjectURL: () => 'blob:pack-test',
        revokeObjectURL: () => undefined,
      })}
    />,
  )
  return { store, adapter }
}

describe('GamePackImportPanel', () => {
  beforeEach(() => {
    setSharedPackResourceRegistryForTests(null)
  })

  it('imports a valid pack and loads through INITIALIZE_GAME', async () => {
    const bytes = await buildTestPackBytes()
    const adapter = createMemoryPersistenceAdapter()
    await adapter.open()
    const { store } = renderPanel({
      adapter,
      readFileBytes: async () => bytes,
    })
    const file = new File([Uint8Array.from(bytes)], 'test.cqs-pack', { type: 'application/zip' })

    fireEvent.change(screen.getByTestId('pack-import-file'), { target: { files: [file] } })

    await vi.waitFor(() => {
      expect(screen.getByTestId('pack-import-result')).toHaveTextContent(/pack import succeeded — game loaded/i)
    })
    expect(store.getState().session?.game?.definition.id).toBe('board-game')
    expect(screen.getByTestId('pack-import-media-count')).toHaveTextContent('1')
  })

  it('leaves the active game unchanged on pack failure', async () => {
    const { store } = renderPanel()
    const fixture = importGameFromUnknown(boardGameFile())
    if (fixture.status !== 'success') throw new Error('fixture')
    store.dispatch({
      type: 'INITIALIZE_GAME',
      issuedAt: 2,
      definition: fixture.definition,
    })
    const beforeId = store.getState().session?.game?.definition.id

    const file = new File([new Uint8Array([0x50, 0x4b, 0x03, 0x04])], 'bad.cqs-pack')
    fireEvent.change(screen.getByTestId('pack-import-file'), { target: { files: [file] } })

    await vi.waitFor(() => {
      expect(screen.getByTestId('pack-import-result')).toHaveTextContent(/pack import failed/i)
    })
    expect(store.getState().session?.game?.definition.id).toBe(beforeId)
  })

  it('shows nested canonical import diagnostics when game JSON is invalid', async () => {
    const gameBytes = new TextEncoder().encode('{ "format": ')
    const { writePackZip } = await import('../pack/zipWrite')
    const { buildManifest } = await import('../pack/manifest')
    const { sha256Hex } = await import('../pack/hash')
    const gameSha256 = await sha256Hex(gameBytes)
    const manifest = buildManifest({ gameBytes, gameSha256, media: [] })
    const bytes = writePackZip({ manifest, gameBytes, media: new Map() })
    renderPanel({ readFileBytes: async () => bytes })
    const file = new File([Uint8Array.from(bytes)], 'invalid-game.cqs-pack')

    fireEvent.change(screen.getByTestId('pack-import-file'), { target: { files: [file] } })

    await vi.waitFor(() => {
      expect(screen.getByTestId('pack-import-result')).toHaveTextContent(/pack import failed/i)
    })
    expect(within(screen.getByTestId('pack-import-issues')).getByText('pack-canonical-import-failed')).toBeInTheDocument()
    expect(screen.getByTestId('pack-import-nested-issues')).toBeInTheDocument()
  })
})
