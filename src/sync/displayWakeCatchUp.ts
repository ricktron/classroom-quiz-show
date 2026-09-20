/**
 * Display wake/resume catch-up: when the audience Display becomes visible again
 * after being hidden/backgrounded, ask the Host to republish sanitized state.
 *
 * Uses the existing `request-state` protocol. No new transport. Hidden alone
 * does not request. Duplicate resume signals are harmless (idempotent request).
 */

export interface DisplayWakeCatchUpTarget {
  addEventListener(
    type: 'visibilitychange' | 'focus',
    listener: () => void,
    options?: { capture?: boolean },
  ): void
  removeEventListener(
    type: 'visibilitychange' | 'focus',
    listener: () => void,
    options?: { capture?: boolean },
  ): void
}

export interface DisplayWakeCatchUpDocument extends DisplayWakeCatchUpTarget {
  readonly visibilityState: DocumentVisibilityState
}

export interface DisplayWakeCatchUpOptions {
  /** Called to emit `request-state` (or equivalent). */
  readonly requestState: () => void
  /** Defaults to `document`. */
  readonly doc?: DisplayWakeCatchUpDocument
  /** Defaults to `window`. Used only for focus after a hidden period. */
  readonly win?: DisplayWakeCatchUpTarget
}

/**
 * Subscribe to visibility/focus resume signals.
 * Returns an unsubscribe function. Safe to call after the receiver is closed
 * only if the caller unsubscribes first in the same teardown.
 */
export function attachDisplayWakeCatchUp(options: DisplayWakeCatchUpOptions): () => void {
  const doc = options.doc ?? (typeof document !== 'undefined' ? document : null)
  const win = options.win ?? (typeof window !== 'undefined' ? window : null)
  if (!doc) return () => undefined

  let wasHidden = doc.visibilityState === 'hidden'
  let closed = false

  const requestIfResumed = (): void => {
    if (closed) return
    options.requestState()
  }

  const onVisibility = (): void => {
    if (closed) return
    if (doc.visibilityState === 'hidden') {
      wasHidden = true
      return
    }
    if (doc.visibilityState === 'visible' && wasHidden) {
      wasHidden = false
      requestIfResumed()
    }
  }

  const onFocus = (): void => {
    if (closed) return
    // Focus without a prior hidden period is ordinary in-window focus stealing;
    // do not request. After sleep/background, visibility usually fires first;
    // if focus fires while wasHidden is still set (ordering quirk), catch up.
    if (wasHidden && doc.visibilityState === 'visible') {
      wasHidden = false
      requestIfResumed()
    }
  }

  doc.addEventListener('visibilitychange', onVisibility)
  win?.addEventListener('focus', onFocus)

  return () => {
    closed = true
    doc.removeEventListener('visibilitychange', onVisibility)
    win?.removeEventListener('focus', onFocus)
  }
}
