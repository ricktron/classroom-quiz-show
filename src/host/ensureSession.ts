import type { SessionCommand } from '../state/commands'
import type { DispatchResult } from '../state/store'
import { createSessionId } from './sessionIdentity'

export { createSessionId, nextHostSessionId } from './sessionIdentity'
export { resetHostSessionIdCounterForTests, setCreateSessionIdForTests } from './sessionIdentity'

/**
 * Host-side session bootstrap for teacher content-load paths.
 *
 * Preserves the existing authoritative session model: when a session already
 * exists, do nothing. When none exists, dispatch the ordinary INIT_SESSION
 * command so import/load can proceed without a hidden prerequisite.
 */

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
  const sessionId = options.sessionId ?? createSessionId
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
