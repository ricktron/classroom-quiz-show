import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { createSessionStore } from '../state/store'
import { importGameFromUnknown } from '../import/importGame'
import { boardGameFile, category, imagePrompt, tile } from '../test/categoryBoardFixtures'
import { buildPackFromDefinition } from '../pack/buildPack'
import { TINY_PNG_BYTES } from '../pack/testFixtures'
import { createMemoryPersistenceAdapter } from '../persistence/memoryAdapter'
import { GamePackImportPanel } from './GamePackImportPanel'
import { setSharedPackResourceRegistryForTests, createPackResourceRegistry } from '../pack/resourceRegistry'
import { MAX_PACK_INPUT_BYTES } from '../pack/limits'
import { listPackMediaScopeKeys } from '../pack/packMediaPersistence'
import { writePackZip } from '../pack/zipWrite'
import { buildManifest } from '../pack/manifest'
import { sha256Hex } from '../pack/hash'
import { exportGameDefinition } from '../export/exportGame'
import { encodeUtf8 } from '../pack/utf8'

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
    dispatch?: (command: Parameters<ReturnType<typeof createSessionStore>['dispatch']>[0]) => ReturnType<
      ReturnType<typeof createSessionStore>['dispatch']
    >
    activeGame?: ReturnType<typeof createSessionStore>['getState'] extends () => infer S
      ? S extends { session: { game: infer G } | null }
        ? G | null
        : never
      : never
  } = {},
) {
  const store = createSessionStore()
  if (options.hasSession !== false) {
    store.dispatch({ type: 'INIT_SESSION', issuedAt: 1, sessionId: 'session-1' })
  }
  const adapter = options.adapter ?? createMemoryPersistenceAdapter()
  const activeGame =
    options.activeGame !== undefined
      ? options.activeGame
      : store.getState().session?.game ?? null
  render(
    <GamePackImportPanel
      dispatch={options.dispatch ?? ((command) => store.dispatch(command))}
      registry={store.getRegistry()}
      hasSession={options.hasSession !== false}
      activeGame={activeGame}
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
    vi.stubGlobal(
      'createImageBitmap',
      vi.fn(async () => ({ close: () => undefined, width: 1, height: 1 })),
    )
  })

  afterEach(() => {
    vi.unstubAllGlobals()
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

  it('rejects File.size over MAX_PACK_INPUT_BYTES before readFileBytes', async () => {
    const readFileBytes = vi.fn(async () => new Uint8Array([0x00]))
    const fixture = importGameFromUnknown(boardGameFile())
    if (fixture.status !== 'success') throw new Error('fixture')
    const { store, adapter } = renderPanel({ readFileBytes })
    await adapter.open()
    store.dispatch({
      type: 'INITIALIZE_GAME',
      issuedAt: 2,
      definition: fixture.definition,
    })
    const beforeId = store.getState().session?.game?.definition.id

    const file = new File([new Uint8Array([0x01])], 'huge.cqs-pack')
    Object.defineProperty(file, 'size', { value: MAX_PACK_INPUT_BYTES + 1 })
    fireEvent.change(screen.getByTestId('pack-import-file'), { target: { files: [file] } })

    await vi.waitFor(() => {
      expect(screen.getByTestId('pack-import-result')).toHaveTextContent(/pack import failed/i)
    })
    expect(readFileBytes).not.toHaveBeenCalled()
    expect(within(screen.getByTestId('pack-import-issues')).getByText('pack-input-too-large')).toBeInTheDocument()
    expect(within(screen.getByTestId('pack-import-issues')).getByText('transport')).toBeInTheDocument()
    expect(store.getState().session?.game?.definition.id).toBe(beforeId)
    expect(await listPackMediaScopeKeys(adapter)).toEqual([])
  })

  it('allows File.size of exactly MAX_PACK_INPUT_BYTES to reach readFileBytes', async () => {
    const bytes = await buildTestPackBytes()
    const readFileBytes = vi.fn(async () => bytes)
    renderPanel({ readFileBytes })
    const file = new File([Uint8Array.from(bytes)], 'exact.cqs-pack')
    Object.defineProperty(file, 'size', { value: MAX_PACK_INPUT_BYTES })
    fireEvent.change(screen.getByTestId('pack-import-file'), { target: { files: [file] } })

    await vi.waitFor(() => {
      expect(readFileBytes).toHaveBeenCalledTimes(1)
    })
  })

  it('GCs an unreferenced durable scope after post-commit activation rejection', async () => {
    const bytes = await buildTestPackBytes()
    const adapter = createMemoryPersistenceAdapter()
    await adapter.open()
    const { store } = renderPanel({
      adapter,
      readFileBytes: async () => bytes,
      dispatch: (command) => {
        if (command.type === 'INITIALIZE_GAME') {
          return { status: 'rejected', reason: 'session-not-initialized' }
        }
        return store.dispatch(command)
      },
    })

    const file = new File([Uint8Array.from(bytes)], 'reject.cqs-pack')
    fireEvent.change(screen.getByTestId('pack-import-file'), { target: { files: [file] } })

    await vi.waitFor(() => {
      expect(screen.getByTestId('pack-import-result')).toHaveTextContent(/validated but NOT loaded/i)
    })
    expect(store.getState().session?.game).toBeNull()
    expect(await listPackMediaScopeKeys(adapter)).toEqual([])
  })

  it('rejects malformed raster bytes that only match a PNG magic prefix', async () => {
    const imported = importGameFromUnknown(
      boardGameFile({
        categories: [category('a', { tiles: [tile('a-1', { prompt: imagePrompt() })] })],
      }),
    )
    if (imported.status !== 'success') throw new Error('fixture')
    const exported = exportGameDefinition(imported.definition)
    if (exported.status !== 'success') throw new Error('export')
    const gameBytes = encodeUtf8(exported.jsonText)
    const gameSha256 = await sha256Hex(gameBytes)
    const malformed = new Uint8Array(32)
    malformed.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
    const mediaSha = await sha256Hex(malformed)
    const manifest = buildManifest({
      gameBytes,
      gameSha256,
      media: [{ sourcePath: PNG_PATH, bytes: malformed, sha256: mediaSha }],
    })
    const bytes = writePackZip({
      manifest,
      gameBytes,
      media: new Map([[`media/${PNG_PATH}`, malformed]]),
    })

    vi.stubGlobal(
      'createImageBitmap',
      vi.fn(async () => {
        throw new Error('invalid raster')
      }),
    )

    const adapter = createMemoryPersistenceAdapter()
    await adapter.open()
    renderPanel({
      adapter,
      readFileBytes: async () => bytes,
    })
    const file = new File([Uint8Array.from(bytes)], 'bad-raster.cqs-pack')
    fireEvent.change(screen.getByTestId('pack-import-file'), { target: { files: [file] } })

    await vi.waitFor(() => {
      expect(screen.getByTestId('pack-import-result')).toHaveTextContent(/pack import failed/i)
    })
    expect(
      within(screen.getByTestId('pack-import-issues')).getByText('pack-media-decode-failed'),
    ).toBeInTheDocument()
    expect(await listPackMediaScopeKeys(adapter)).toEqual([])
  })
})
