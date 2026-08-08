import { describe, expect, it } from 'vitest'
import { PACK_FORMAT, PACK_FORMAT_VERSION, GAME_ENTRY_PATH } from './constants'
import { buildManifest, parseManifestJson, serializeManifest } from './manifest'
import { sha256Hex } from './hash'
import { encodeUtf8 } from './utf8'
import { TINY_PNG_BYTES } from './testFixtures'

describe('pack manifest', () => {
  it('parses a valid v1 manifest', async () => {
    const gameBytes = encodeUtf8('{"format":"classroom-quiz-show/game"}\n')
    const gameSha256 = await sha256Hex(gameBytes)
    const mediaSha256 = await sha256Hex(TINY_PNG_BYTES)
    const manifest = buildManifest({
      gameBytes,
      gameSha256,
      media: [{ sourcePath: 'photos/clue.png', bytes: TINY_PNG_BYTES, sha256: mediaSha256 }],
    })

    const parsed = parseManifestJson(serializeManifest(manifest))
    expect(parsed.success).toBe(true)
    if (!parsed.success) return
    expect(parsed.data.format).toBe(PACK_FORMAT)
    expect(parsed.data.packVersion).toBe(PACK_FORMAT_VERSION)
    expect(parsed.data.game.path).toBe(GAME_ENTRY_PATH)
    expect(parsed.data.media[0]?.packPath).toBe('media/photos/clue.png')
  })

  it('rejects unsupported pack version', () => {
    const parsed = parseManifestJson(
      JSON.stringify({
        format: PACK_FORMAT,
        packVersion: 2,
        game: { path: GAME_ENTRY_PATH, byteLength: 1, sha256: 'a'.repeat(64) },
        media: [],
      }),
    )
    expect(parsed.success).toBe(false)
  })

  it('rejects unknown manifest fields', () => {
    const parsed = parseManifestJson(
      JSON.stringify({
        format: PACK_FORMAT,
        packVersion: 1,
        title: 'secret',
        game: { path: GAME_ENTRY_PATH, byteLength: 1, sha256: 'a'.repeat(64) },
        media: [],
      }),
    )
    expect(parsed.success).toBe(false)
  })

  it('rejects invalid digest casing', () => {
    const parsed = parseManifestJson(
      JSON.stringify({
        format: PACK_FORMAT,
        packVersion: 1,
        game: { path: GAME_ENTRY_PATH, byteLength: 1, sha256: 'A'.repeat(64) },
        media: [],
      }),
    )
    expect(parsed.success).toBe(false)
  })

  it('sorts media rows by sourcePath deterministically', async () => {
    const gameBytes = encodeUtf8('x\n')
    const gameSha256 = await sha256Hex(gameBytes)
    const digest = await sha256Hex(TINY_PNG_BYTES)
    const manifest = buildManifest({
      gameBytes,
      gameSha256,
      media: [
        { sourcePath: 'z.png', bytes: TINY_PNG_BYTES, sha256: digest },
        { sourcePath: 'a.png', bytes: TINY_PNG_BYTES, sha256: digest },
      ],
    })
    expect(manifest.media.map((entry) => entry.sourcePath)).toEqual(['a.png', 'z.png'])
  })
})
