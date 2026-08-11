import type { SessionCommand } from '../state/commands'
import type { DispatchResult } from '../state/store'

/**
 * Host-side session bootstrap for teacher content-load paths.
 *
 * Preserves the existing authoritative session model: when a session already
 * exists, do nothing. When none exists, dispatch the ordinary INIT_SESSION
 * command so import/load can proceed without a hidden prerequisite.
 */

let sessionCounter = 0

export function nextHostSessionId(): string {
  sessionCounter += 1
  return `session-${sessionCounter}`
}

/** Test-only: reset the counter so session ids stay deterministic. */
export function resetHostSessionIdCounterForTests(): void {
  sessionCounter = 0
}

export type EnsureSessionResult =
  | { readonly status: 'ready' }
  | { readonly status: 'failed'; readonly reason: string }

export function ensureSession(
  hasSession: boolean,
  dispatch: (command: SessionCommand) => DispatchResult,
  options: {
    readonly now?: () => number
    readonly sessionId?: () => string
  } = {},
): EnsureSessionResult {
  if (hasSession) return { status: 'ready' }

  const now = options.now ?? (() => Date.now())
  const sessionId = options.sessionId ?? nextHostSessionId
  const result = dispatch({
    type: 'INIT_SESSION',
    issuedAt: now(),
    sessionId: sessionId(),
  })

  if (result.status !== 'accepted') {
    return {
      status: 'failed',
      reason: `Could not start a game session (${result.reason}).`,
    }
  }

  return { status: 'ready' }
}
