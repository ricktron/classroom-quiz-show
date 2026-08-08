import { z } from 'zod'
import { PACK_FORMAT, PACK_FORMAT_VERSION, GAME_ENTRY_PATH } from './constants'
import { sha256Hex } from './hash'
import { toPackMediaPath } from './paths'

/**
 * Strict portable-pack manifest schema (Slice 19).
 */

const SHA256_HEX = /^[0-9a-f]{64}$/

const packMediaEntrySchema = z.strictObject({
  sourcePath: z.string().min(1),
  packPath: z.string().min(1),
  byteLength: z.number().int().nonnegative(),
  sha256: z.string().regex(SHA256_HEX, 'sha256 must be 64 lowercase hex characters'),
})

const packGameEntrySchema = z.strictObject({
  path: z.literal(GAME_ENTRY_PATH),
  byteLength: z.number().int().nonnegative(),
  sha256: z.string().regex(SHA256_HEX, 'sha256 must be 64 lowercase hex characters'),
})

export const packManifestSchema = z.strictObject({
  format: z.literal(PACK_FORMAT),
  packVersion: z.literal(PACK_FORMAT_VERSION),
  game: packGameEntrySchema,
  media: z.array(packMediaEntrySchema),
})

export type PackManifest = z.infer<typeof packManifestSchema>
export type PackManifestMediaEntry = PackManifest['media'][number]

export interface BuildManifestInput {
  readonly gameBytes: Uint8Array
  readonly gameSha256: string
  readonly media: readonly {
    readonly sourcePath: string
    readonly bytes: Uint8Array
    readonly sha256: string
  }[]
}

export function buildManifest(input: BuildManifestInput): PackManifest {
  const sortedMedia = [...input.media].sort((a, b) =>
    a.sourcePath < b.sourcePath ? -1 : a.sourcePath > b.sourcePath ? 1 : 0,
  )

  return {
    format: PACK_FORMAT,
    packVersion: PACK_FORMAT_VERSION,
    game: {
      path: GAME_ENTRY_PATH,
      byteLength: input.gameBytes.length,
      sha256: input.gameSha256,
    },
    media: sortedMedia.map((entry) => {
      const packPath = toPackMediaPath(entry.sourcePath)
      if (packPath === null) {
        throw new Error(`Invalid media source path: ${entry.sourcePath}`)
      }
      return {
        sourcePath: entry.sourcePath,
        packPath,
        byteLength: entry.bytes.length,
        sha256: entry.sha256,
      }
    }),
  }
}

export async function buildManifestWithHashes(
  input: Omit<BuildManifestInput, 'gameSha256' | 'media'> & {
    readonly media: readonly { readonly sourcePath: string; readonly bytes: Uint8Array }[]
  },
): Promise<PackManifest> {
  const gameSha256 = await sha256Hex(input.gameBytes)
  const media = await Promise.all(
    input.media.map(async (entry) => ({
      sourcePath: entry.sourcePath,
      bytes: entry.bytes,
      sha256: await sha256Hex(entry.bytes),
    })),
  )
  return buildManifest({ gameBytes: input.gameBytes, gameSha256, media })
}

export function parseManifestJson(text: string): z.ZodSafeParseResult<PackManifest> {
  let parsed: unknown
  try {
    parsed = JSON.parse(text)
  } catch {
    return packManifestSchema.safeParse(undefined)
  }
  return packManifestSchema.safeParse(parsed)
}

export function serializeManifest(manifest: PackManifest): string {
  return `${JSON.stringify(manifest)}\n`
}
