import type { SniffedMediaType } from './mediaSniff'

/**
 * In-memory runtime pack resource registry (Slice 19).
 *
 * Maps canonical source paths to validated bytes and ephemeral object URLs for
 * rendering. Blob URLs are never written into canonical JSON.
 */

export interface PackResourceAsset {
  readonly bytes: Uint8Array
  readonly mediaType: SniffedMediaType
  readonly sha256: string
}

export interface PackResourceRegistry {
  readonly scopeKey: string | null
  readonly setActiveScope: (
    scopeKey: string,
    assets: ReadonlyMap<string, PackResourceAsset>,
  ) => void
  readonly resolveSrc: (sourcePath: string) => string | null
  readonly resolveBytes: (sourcePath: string) => Uint8Array | null
  readonly clear: () => void
}

export interface PackResourceRegistryEnv {
  readonly createObjectURL: (blob: Blob) => string
  readonly revokeObjectURL: (url: string) => void
}

export function createPackResourceRegistry(
  env: PackResourceRegistryEnv = defaultPackResourceRegistryEnv(),
): PackResourceRegistry {
  let scopeKey: string | null = null
  const assets = new Map<string, PackResourceAsset>()
  const objectUrls = new Map<string, string>()

  const revokeAll = (): void => {
    for (const url of objectUrls.values()) {
      try {
        env.revokeObjectURL(url)
      } catch {
        // Best-effort only.
      }
    }
    objectUrls.clear()
  }

  return {
    get scopeKey() {
      return scopeKey
    },

    setActiveScope(nextScopeKey: string, nextAssets: ReadonlyMap<string, PackResourceAsset>): void {
      if (scopeKey === nextScopeKey) {
        revokeAll()
        assets.clear()
        for (const [path, asset] of nextAssets) {
          assets.set(path, asset)
        }
        return
      }

      revokeAll()
      assets.clear()
      scopeKey = nextScopeKey
      for (const [path, asset] of nextAssets) {
        assets.set(path, asset)
      }
    },

    resolveSrc(sourcePath: string): string | null {
      const asset = assets.get(sourcePath)
      if (!asset) return null
      const existing = objectUrls.get(sourcePath)
      if (existing !== undefined) return existing
      const url = env.createObjectURL(new Blob([new Uint8Array(asset.bytes)], { type: asset.mediaType }))
      objectUrls.set(sourcePath, url)
      return url
    },

    resolveBytes(sourcePath: string): Uint8Array | null {
      return assets.get(sourcePath)?.bytes ?? null
    },

    clear(): void {
      revokeAll()
      assets.clear()
      scopeKey = null
    },
  }
}

function defaultPackResourceRegistryEnv(): PackResourceRegistryEnv {
  return {
    createObjectURL: (blob) => URL.createObjectURL(blob),
    revokeObjectURL: (url) => URL.revokeObjectURL(url),
  }
}

let sharedPackResourceRegistry: PackResourceRegistry | null = null

/** Process-wide runtime registry for pack-scoped media resolution. */
export function getSharedPackResourceRegistry(): PackResourceRegistry {
  if (sharedPackResourceRegistry === null) {
    sharedPackResourceRegistry = createPackResourceRegistry()
  }
  return sharedPackResourceRegistry
}

/** Replace or reset the shared registry (tests only). */
export function setSharedPackResourceRegistryForTests(
  registry: PackResourceRegistry | null,
): void {
  sharedPackResourceRegistry?.clear()
  sharedPackResourceRegistry = registry
}
