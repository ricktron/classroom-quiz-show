import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { SessionCommand } from '../state/commands'
import type { SessionEvent } from '../state/events'
import type { PrivateState } from '../state/privateState'
import { createSessionStore, type DispatchResult, type SessionStore } from '../state/store'

export interface UseSessionStore {
  /** The authoritative store instance (stable for the component lifetime). */
  store: SessionStore
  state: PrivateState
  history: readonly SessionEvent[]
  dispatch: (command: SessionCommand) => DispatchResult
}

export interface UseSessionStoreOptions {
  readonly initialHistory?: readonly SessionEvent[]
  /** Remount key — when changed, recreate the store from the current initialHistory. */
  readonly storeEpoch?: number
}

/**
 * Host-side hook that owns exactly one authoritative `SessionStore` and
 * re-renders the host UI whenever it changes. The store instance is stable for a
 * given epoch; changing `storeEpoch` intentionally creates a fresh store from
 * the supplied trusted `initialHistory`.
 */
export function useSessionStore(options: UseSessionStoreOptions = {}): UseSessionStore {
  const { initialHistory, storeEpoch = 0 } = options
  const remountBoundHistory = useMemo(
    () => ({ storeEpoch, initialHistory }),
    [storeEpoch, initialHistory],
  )
  const store = useMemo(
    () => createSessionStore({ initialHistory: remountBoundHistory.initialHistory }),
    [remountBoundHistory],
  )
  const [state, setState] = useState<PrivateState>(store.getState())
  const [history, setHistory] = useState<readonly SessionEvent[]>(store.getHistory())

  // Keep a ref so the exposed `dispatch` identity stays stable across renders.
  const storeRef = useRef(store)
  storeRef.current = store

  useEffect(() => {
    const unsubscribe = store.subscribe(() => {
      setState(store.getState())
      setHistory(store.getHistory())
    })
    // Sync once in case the store changed between render and effect.
    setState(store.getState())
    setHistory(store.getHistory())
    return unsubscribe
  }, [store])

  const dispatch = useCallback(
    (command: SessionCommand) => storeRef.current.dispatch(command),
    [],
  )

  return { store, state, history, dispatch }
}
