import type { SessionCommand } from './commands'
import type { SessionEvent } from './events'
import type { PrivateState } from './privateState'
import type { PublicState } from './publicState'
import { planCommand, replay, type RejectionReason } from './reducer'
import { safeToPublicState } from './sanitize'
import { createDefaultRegistry } from '../game/defaultRegistry'
import type { RoundRegistry } from '../game/registry'
import type { PlanDeps } from './reducer'

/**
 * In-memory authoritative session store (Slice 2).
 *
 * The host owns exactly one of these. It holds the append-only event history as
 * the source of truth and derives authoritative state by replaying it after
 * every accepted command — so `getState()` is, by construction, always equal to
 * `replay(getHistory())`.
 *
 * There is NO durable persistence here (no IndexedDB); that is Slice 8. History
 * lives only in memory for the lifetime of the tab.
 */

export type DispatchResult =
  | { readonly status: 'accepted'; readonly events: readonly SessionEvent[] }
  | { readonly status: 'rejected'; readonly reason: RejectionReason }

export interface SessionStore {
  dispatch(command: SessionCommand): DispatchResult
  getState(): PrivateState
  getPublicState(): PublicState
  getHistory(): readonly SessionEvent[]
  /** The round registry this store resolves round-type support against. */
  getRegistry(): RoundRegistry
  /** Subscribe to post-change notifications. Returns an unsubscribe function. */
  subscribe(listener: () => void): () => void
}

export interface SessionStoreOptions {
  /**
   * Round registry used to resolve whether a selected round's type is
   * supported. Defaults to the application's default registry (placeholder type
   * only). Injectable so tests can supply a registry with unknown types.
   */
  readonly registry?: RoundRegistry
}

export function createSessionStore(options: SessionStoreOptions = {}): SessionStore {
  const registry = options.registry ?? createDefaultRegistry()
  const planDeps: PlanDeps = { isKnownRoundType: (type) => registry.isKnown(type) }
  let history: readonly SessionEvent[] = []
  let state: PrivateState = replay(history)
  const listeners = new Set<() => void>()

  function emit(): void {
    // Snapshot so an unsubscribe during iteration cannot skip a listener.
    for (const listener of [...listeners]) listener()
  }

  return {
    dispatch(command) {
      const outcome = planCommand(state, history, command, planDeps)
      if (outcome.status === 'rejected') {
        // Command rejection: no event, no mutation.
        return { status: 'rejected', reason: outcome.reason }
      }
      // Append-only: never edit existing events; always a new array.
      history = [...history, ...outcome.events]
      // Re-derive authoritative state from the whole history.
      state = replay(history)
      emit()
      return { status: 'accepted', events: outcome.events }
    },
    getState() {
      return state
    },
    getPublicState() {
      return safeToPublicState(state)
    },
    getHistory() {
      return history
    },
    getRegistry() {
      return registry
    },
    subscribe(listener) {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
  }
}
