/**
 * Browser download adapter for portable pack files (Slice 19).
 */

import { PACK_EXTENSION, PACK_MIME } from './constants'

export interface DownloadPackInput {
  readonly filename: string
  readonly bytes: Uint8Array
}

export interface DownloadPackEnvironment {
  readonly createObjectURL: (blob: Blob) => string
  readonly revokeObjectURL: (url: string) => void
  readonly createAnchor: () => HTMLAnchorElement
  readonly appendAnchor: (anchor: HTMLAnchorElement) => void
  readonly removeAnchor: (anchor: HTMLAnchorElement) => void
  readonly scheduleCleanup: (callback: () => void) => void
}

export function defaultPackFilename(gameId: string): string {
  return `${gameId}${PACK_EXTENSION}`
}

/**
 * Trigger a one-shot browser download of validated pack bytes.
 */
export function downloadPackFile(
  input: DownloadPackInput,
  environment: DownloadPackEnvironment = defaultDownloadPackEnvironment(),
): void {
  const blob = new Blob([new Uint8Array(input.bytes)], { type: PACK_MIME })
  let url: string | undefined
  let anchor: HTMLAnchorElement | undefined
  let appended = false

  try {
    url = environment.createObjectURL(blob)
    anchor = environment.createAnchor()
    anchor.href = url
    anchor.download = input.filename
    environment.appendAnchor(anchor)
    appended = true
    anchor.click()
  } catch {
    throw new Error('Pack download failed.')
  } finally {
    if (appended && anchor) {
      try {
        environment.removeAnchor(anchor)
      } catch {
        // Removal failure must not prevent URL revocation.
      }
    }
    if (url !== undefined) {
      const urlToRevoke = url
      try {
        environment.scheduleCleanup(() => {
          try {
            environment.revokeObjectURL(urlToRevoke)
          } catch {
            // Best-effort only.
          }
        })
      } catch {
        try {
          environment.revokeObjectURL(urlToRevoke)
        } catch {
          // Best-effort only.
        }
      }
    }
  }
}

function defaultDownloadPackEnvironment(): DownloadPackEnvironment {
  return {
    createObjectURL: (blob) => URL.createObjectURL(blob),
    revokeObjectURL: (url) => URL.revokeObjectURL(url),
    createAnchor: () => document.createElement('a'),
    appendAnchor: (anchor) => {
      document.body.appendChild(anchor)
    },
    removeAnchor: (anchor) => {
      anchor.remove()
    },
    scheduleCleanup: (callback) => {
      window.setTimeout(callback, 0)
    },
  }
}
