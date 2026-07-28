/**
 * Browser download adapter for portable game files (Slice 12).
 *
 * The pure exporter never calls DOM APIs. This module is the injectable browser
 * boundary: unit tests supply a fake environment and create no real downloads.
 */

export interface DownloadFileInput {
  readonly filename: string
  readonly text: string
}

export interface DownloadEnvironment {
  readonly createObjectURL: (blob: Blob) => string
  readonly revokeObjectURL: (url: string) => void
  readonly createAnchor: () => HTMLAnchorElement
  readonly appendAnchor: (anchor: HTMLAnchorElement) => void
  readonly removeAnchor: (anchor: HTMLAnchorElement) => void
  readonly scheduleCleanup: (callback: () => void) => void
}

const JSON_MIME = 'application/json;charset=utf-8'

/**
 * Trigger a one-shot browser download of exact export text under the given
 * filename. Always revokes the object URL, including when click throws.
 */
export function downloadGameFile(
  input: DownloadFileInput,
  environment: DownloadEnvironment = defaultDownloadEnvironment(),
): void {
  const blob = new Blob([input.text], { type: JSON_MIME })
  const url = environment.createObjectURL(blob)
  const anchor = environment.createAnchor()
  let appended = false

  try {
    anchor.href = url
    anchor.download = input.filename
    environment.appendAnchor(anchor)
    appended = true
    anchor.click()
  } finally {
    if (appended) {
      try {
        environment.removeAnchor(anchor)
      } catch {
        // Removal failure must not prevent URL revocation.
      }
    }
    environment.scheduleCleanup(() => {
      environment.revokeObjectURL(url)
    })
  }
}

function defaultDownloadEnvironment(): DownloadEnvironment {
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
