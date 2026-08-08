import { zipSync } from 'fflate'
import { GAME_ENTRY_PATH, MANIFEST_PATH } from './constants'
import { encodeUtf8 } from './utf8'
import type { PackManifest } from './manifest'
import { serializeManifest } from './manifest'

/**
 * Deterministic ZIP writer for trusted pack export (Slice 19).
 *
 * Entry order: manifest, game, media sorted by pack path.
 */

export interface PackZipEntries {
  readonly manifest: PackManifest
  readonly gameBytes: Uint8Array
  readonly media: ReadonlyMap<string, Uint8Array>
}

export function writePackZip(input: PackZipEntries): Uint8Array {
  const manifestBytes = encodeUtf8(serializeManifest(input.manifest))
  const archive: Record<string, Uint8Array> = {}
  archive[MANIFEST_PATH] = manifestBytes
  archive[GAME_ENTRY_PATH] = input.gameBytes

  const mediaPaths = [...input.media.keys()].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0))
  for (const path of mediaPaths) {
    archive[path] = input.media.get(path)!
  }

  return zipSync(archive)
}

export function packZipEntryOrder(manifest: PackManifest): readonly string[] {
  const mediaPaths = manifest.media.map((entry) => entry.packPath).sort((a, b) => (a < b ? -1 : a > b ? 1 : 0))
  return [MANIFEST_PATH, GAME_ENTRY_PATH, ...mediaPaths]
}
