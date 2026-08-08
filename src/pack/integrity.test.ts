import { describe, expect, it } from 'vitest'
import { sha256Hex } from './hash'
import { encodeUtf8 } from './utf8'
import { buildManifest } from './manifest'
import { importPackFromBytes } from './importPack'
import { writePackZip } from './zipWrite'
import { TINY_PNG_BYTES } from './testFixtures'
import { importGameFromUnknown } from '../import/importGame'
import { boardGameFile, category, imagePrompt, tile } from '../test/categoryBoardFixtures'
import { exportGameDefinition } from '../export/exportGame'

describe('pack integrity', () => {
  it('detects game digest mismatch on import', async () => {
    const imported = importGameFromUnknown(boardGameFile())
    expect(imported.status).toBe('success')
    if (imported.status !== 'success') return
    const exported = exportGameDefinition(imported.definition)
    expect(exported.status).toBe('success')
    if (exported.status !== 'success') return

    const gameBytes = encodeUtf8(exported.jsonText)
    const gameSha256 = await sha256Hex(gameBytes)
    const manifest = buildManifest({ gameBytes, gameSha256, media: [] })
    manifest.game.sha256 = '0'.repeat(64)
    const bytes = writePackZip({ manifest, gameBytes, media: new Map() })
    const result = await importPackFromBytes(bytes)
    expect(result.status).toBe('failure')
    if (result.status !== 'failure') return
    expect(result.issues[0]?.code).toBe('pack-game-integrity-mismatch')
  })

  it('detects media digest mismatch on import', async () => {
    const sourcePath = 'media-fixtures/slice-11-clue.png'
    const imported = importGameFromUnknown(
      boardGameFile({
        categories: [category('a', { tiles: [tile('a-1', { prompt: imagePrompt() })] })],
      }),
    )
    expect(imported.status).toBe('success')
    if (imported.status !== 'success') return
    const exported = exportGameDefinition(imported.definition)
    expect(exported.status).toBe('success')
    if (exported.status !== 'success') return

    const gameBytes = encodeUtf8(exported.jsonText)
    const gameSha256 = await sha256Hex(gameBytes)
    const mediaSha256 = await sha256Hex(TINY_PNG_BYTES)
    const manifest = buildManifest({
      gameBytes,
      gameSha256,
      media: [{ sourcePath, bytes: TINY_PNG_BYTES, sha256: mediaSha256 }],
    })
    manifest.media[0] = { ...manifest.media[0]!, sha256: '0'.repeat(64) }
    const bytes = writePackZip({
      manifest,
      gameBytes,
      media: new Map([['media/media-fixtures/slice-11-clue.png', TINY_PNG_BYTES]]),
    })
    const result = await importPackFromBytes(bytes)
    expect(result.status).toBe('failure')
    if (result.status !== 'failure') return
    expect(result.issues.some((issue) => issue.code === 'pack-media-integrity-mismatch')).toBe(true)
  })

  it('detects game byte-length mismatch', async () => {
    const imported = importGameFromUnknown(boardGameFile())
    expect(imported.status).toBe('success')
    if (imported.status !== 'success') return
    const exported = exportGameDefinition(imported.definition)
    expect(exported.status).toBe('success')
    if (exported.status !== 'success') return

    const gameBytes = encodeUtf8(exported.jsonText)
    const manifest = buildManifest({
      gameBytes,
      gameSha256: await sha256Hex(gameBytes),
      media: [],
    })
    manifest.game.byteLength = gameBytes.length + 1
    const bytes = writePackZip({ manifest, gameBytes, media: new Map() })
    const result = await importPackFromBytes(bytes)
    expect(result.status).toBe('failure')
    if (result.status !== 'failure') return
    expect(result.issues[0]?.code).toBe('pack-game-integrity-mismatch')
  })

  it('hashes canonical exported bytes as lowercase SHA-256', async () => {
    const digest = await sha256Hex(encodeUtf8('abc\n'))
    expect(digest).toMatch(/^[0-9a-f]{64}$/)
  })
})
