import { describe, expect, it } from 'vitest'
import { buildPackFromDefinition } from './buildPack'
import { importPackFromBytes } from './importPack'
import { importGameFromUnknown } from '../import/importGame'
import { boardGameFile, category, imagePrompt, tile } from '../test/categoryBoardFixtures'
import { TINY_PNG_BYTES } from './testFixtures'
import type { ResolveMediaBytes } from './acquireMedia'
import { resourceScopeKeyFromGameText } from './resourceScope'
import { exportGameDefinition } from '../export/exportGame'
import { createRegistryMediaResolver, registryFromAssets } from './acquireMedia'
import type { PackResourceAsset } from './resourceRegistry'
import { buildManifest } from './manifest'
import { sha256Hex } from './hash'
import { encodeUtf8 } from './utf8'
import { writePackZip } from './zipWrite'

const PNG_PATH = 'media-fixtures/slice-11-clue.png'

function pngResolver(bytes: Uint8Array = TINY_PNG_BYTES): ResolveMediaBytes {
  return async (sourcePath) => ({
    status: 'success',
    bytes: sourcePath === PNG_PATH ? bytes : new Uint8Array([0x00]),
  })
}

describe('pack build/import round trip', () => {
  it('builds and imports a text-only pack', async () => {
    const imported = importGameFromUnknown(boardGameFile())
    expect(imported.status).toBe('success')
    if (imported.status !== 'success') return

    const built = await buildPackFromDefinition(imported.definition, {
      acquireMediaBytes: pngResolver(),
    })
    expect(built.status).toBe('success')
    if (built.status !== 'success') return

    const roundTrip = await importPackFromBytes(built.bytes)
    expect(roundTrip.status).toBe('success')
    if (roundTrip.status !== 'success') return
    expect(roundTrip.mediaAssets).toEqual([])
    expect(roundTrip.definition.id).toBe(imported.definition.id)
    expect(roundTrip.gameJsonText).toBe(
      (() => {
        const exported = exportGameDefinition(imported.definition)
        if (exported.status !== 'success') throw new Error('export failed')
        return exported.jsonText
      })(),
    )
  })

  it('round-trips synthetic PNG media bytes', async () => {
    const imported = importGameFromUnknown(
      boardGameFile({
        categories: [category('a', { tiles: [tile('a-1', { prompt: imagePrompt() })] })],
      }),
    )
    expect(imported.status).toBe('success')
    if (imported.status !== 'success') return

    const built = await buildPackFromDefinition(imported.definition, {
      acquireMediaBytes: pngResolver(),
    })
    expect(built.status).toBe('success')
    if (built.status !== 'success') return
    expect(built.filename.endsWith('.cqs-pack')).toBe(true)

    const roundTrip = await importPackFromBytes(built.bytes)
    expect(roundTrip.status).toBe('success')
    if (roundTrip.status !== 'success') return
    expect(roundTrip.mediaAssets).toHaveLength(1)
    expect(roundTrip.mediaAssets[0]?.sourcePath).toBe(PNG_PATH)
    expect(roundTrip.mediaAssets[0]?.mediaType).toBe('image/png')
    expect([...roundTrip.mediaAssets[0]?.bytes ?? []]).toEqual([...TINY_PNG_BYTES])

    const scope = await resourceScopeKeyFromGameText(roundTrip.gameJsonText)
    expect(roundTrip.resourceScopeKey).toBe(scope)
  })

  it('re-exports imported pack media from a local registry without network fetch', async () => {
    const imported = importGameFromUnknown(
      boardGameFile({
        categories: [category('a', { tiles: [tile('a-1', { prompt: imagePrompt() })] })],
      }),
    )
    expect(imported.status).toBe('success')
    if (imported.status !== 'success') return

    const built = await buildPackFromDefinition(imported.definition, {
      acquireMediaBytes: pngResolver(),
    })
    expect(built.status).toBe('success')
    if (built.status !== 'success') return

    const staged = await importPackFromBytes(built.bytes)
    expect(staged.status).toBe('success')
    if (staged.status !== 'success') return

    const assets = new Map<string, PackResourceAsset>()
    for (const asset of staged.mediaAssets) {
      assets.set(asset.sourcePath, {
        bytes: asset.bytes,
        mediaType: asset.mediaType,
        sha256: asset.sha256,
      })
    }

    const reexported = await buildPackFromDefinition(staged.definition, {
      acquireMediaBytes: createRegistryMediaResolver(registryFromAssets(assets)),
    })
    expect(reexported.status).toBe('success')
    if (reexported.status !== 'success') return

    const secondImport = await importPackFromBytes(reexported.bytes)
    expect(secondImport.status).toBe('success')
  })

  it('surfaces nested canonical import diagnostics for invalid game JSON', async () => {
    const gameBytes = encodeUtf8('{ "format": ')
    const gameSha256 = await sha256Hex(gameBytes)
    const manifest = buildManifest({ gameBytes, gameSha256, media: [] })
    const bytes = writePackZip({ manifest, gameBytes, media: new Map() })
    const result = await importPackFromBytes(bytes)
    expect(result.status).toBe('failure')
    if (result.status !== 'failure') return
    expect(result.issues[0]?.code).toBe('pack-canonical-import-failed')
    expect(result.issues[0]?.importIssues?.length).toBeGreaterThan(0)
  })
})
