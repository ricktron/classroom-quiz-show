import { joinBaseAndMediaPath } from '../display/resolveSameOriginMediaSrc'
import {
  MAX_PACK_MEDIA_BYTES,
} from './limits'
import { packIssue, type PackIssue } from './issues'
import { sniffMediaBytes } from './mediaSniff'
import type { PackResourceAsset } from './resourceRegistry'

/**
 * Injectable media-byte acquisition for pack export (Slice 19).
 */

export type ResolveMediaBytes = (sourcePath: string) => Promise<
  | { readonly status: 'success'; readonly bytes: Uint8Array }
  | { readonly status: 'failure'; readonly issue: PackIssue }
>

export interface HostedMediaFetchEnv {
  readonly baseUrl: string
  readonly fetch: typeof fetch
}

export function createHostedMediaResolver(env: HostedMediaFetchEnv): ResolveMediaBytes {
  return async (sourcePath) => {
    const url = joinBaseAndMediaPath(env.baseUrl, sourcePath)
    if (url === null) {
      return {
        status: 'failure',
        issue: packIssue(
          'pack-media-acquisition-failed',
          'media',
          sourcePath,
          `Media path ${JSON.stringify(sourcePath)} is not a valid same-origin path.`,
        ),
      }
    }

    let response: Response
    try {
      response = await env.fetch(url, { redirect: 'error' })
    } catch {
      return {
        status: 'failure',
        issue: packIssue(
          'pack-media-acquisition-failed',
          'media',
          sourcePath,
          `Could not fetch media at ${JSON.stringify(sourcePath)}.`,
        ),
      }
    }

    if (!response.ok) {
      return {
        status: 'failure',
        issue: packIssue(
          'pack-media-acquisition-failed',
          'media',
          sourcePath,
          `Media fetch for ${JSON.stringify(sourcePath)} returned HTTP ${response.status}.`,
        ),
      }
    }

    const contentLength = response.headers.get('content-length')
    if (contentLength !== null) {
      const declared = Number(contentLength)
      if (Number.isFinite(declared) && declared > MAX_PACK_MEDIA_BYTES) {
        return {
          status: 'failure',
          issue: packIssue(
            'pack-media-too-large',
            'media',
            sourcePath,
            `Media at ${JSON.stringify(sourcePath)} exceeds the ${MAX_PACK_MEDIA_BYTES}-byte limit.`,
          ),
        }
      }
    }

    let bytes: Uint8Array
    try {
      const buffer = await response.arrayBuffer()
      bytes = new Uint8Array(buffer)
    } catch {
      return {
        status: 'failure',
        issue: packIssue(
          'pack-media-acquisition-failed',
          'media',
          sourcePath,
          `Could not read media bytes for ${JSON.stringify(sourcePath)}.`,
        ),
      }
    }

    if (bytes.length > MAX_PACK_MEDIA_BYTES) {
      return {
        status: 'failure',
        issue: packIssue(
          'pack-media-too-large',
          'media',
          sourcePath,
          `Media at ${JSON.stringify(sourcePath)} is ${bytes.length} bytes, which exceeds the ${MAX_PACK_MEDIA_BYTES}-byte limit.`,
        ),
      }
    }

    const sniff = sniffMediaBytes(bytes)
    if (sniff.status !== 'success') {
      return {
        status: 'failure',
        issue: packIssue(
          'pack-media-type-unsupported',
          'media',
          sourcePath,
          `Media at ${JSON.stringify(sourcePath)} is not a supported portable-pack raster image.`,
        ),
      }
    }

    return { status: 'success', bytes }
  }
}

export interface LocalMediaRegistry {
  readonly resolveBytes: (sourcePath: string) => Uint8Array | null
}

/** Read exact bytes from an in-memory pack resource registry (export-after-import). */
export function createRegistryMediaResolver(registry: LocalMediaRegistry): ResolveMediaBytes {
  return async (sourcePath) => {
    const bytes = registry.resolveBytes(sourcePath)
    if (bytes === null) {
      return {
        status: 'failure',
        issue: packIssue(
          'pack-media-acquisition-failed',
          'media',
          sourcePath,
          `Local pack media is unavailable for ${JSON.stringify(sourcePath)}.`,
        ),
      }
    }
    if (bytes.length > MAX_PACK_MEDIA_BYTES) {
      return {
        status: 'failure',
        issue: packIssue(
          'pack-media-too-large',
          'media',
          sourcePath,
          `Local media at ${JSON.stringify(sourcePath)} exceeds the ${MAX_PACK_MEDIA_BYTES}-byte limit.`,
        ),
      }
    }
    return { status: 'success', bytes }
  }
}

export function registryFromAssets(assets: ReadonlyMap<string, PackResourceAsset>): LocalMediaRegistry {
  return {
    resolveBytes(sourcePath: string): Uint8Array | null {
      return assets.get(sourcePath)?.bytes ?? null
    },
  }
}
