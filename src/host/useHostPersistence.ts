import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createDefaultRegistry } from '../game/defaultRegistry'
import type { GameDefinition } from '../game/gameDefinition'
import type { RoundRegistry } from '../game/registry'
import type { SessionCommand } from '../state/commands'
import type { SessionEvent } from '../state/events'
import type { PrivateGameState } from '../state/privateState'
import type { DispatchResult } from '../state/store'
import { systemClock, type Clock } from '../time/clock'
import {
  COORDINATION_BROADCAST_CHANNEL,
  HOST_WRITER_LEASE_TTL_MS,
  PersistenceWriteQueue,
  acquireOrRenewHostLease,
  clearActiveSession,
  createIndexedDbPersistenceAdapter,
  createTabId,
  deleteDefinition,
  listSavedDefinitions,
  loadDefinition,
  readActiveSession,
  releaseHostLease,
  saveDefinition,
  writeActiveSession,
  type ActiveSessionRead,
  type PersistenceAdapter,
  type PersistenceResult,
  type SavedDefinitionSummary,
} from '../persistence'

export type PersistenceBootPhase = 'loading' | 'recovery' | 'invalid-recovery' | 'ready'
export type PersistenceLeadership = 'unknown' | 'leader' | 'follower'
export type PersistenceDurabilityStatus =
  | 'loading'
  | 'idle'
  | 'saving'
  | 'saved'
  | 'unavailable'
  | 'failed'

export interface RecoveryPayload {
  readonly events: readonly SessionEvent[]
  readonly savedAt: number
}

export interface InvalidRecoveryPayload {
  readonly code: string
  readonly message: string
}

export interface UseHostPersistenceOptions {
  readonly clock?: Clock
  readonly createAdapter?: () => PersistenceAdapter
  readonly tabId?: string
  readonly leaseTtlMs?: number
  readonly renewIntervalMs?: number
  readonly broadcastChannel?: BroadcastChannel | null
}

export type PersistenceActionResult =
  | { readonly ok: true; readonly message: string }
  | { readonly ok: false; readonly message: string }

export type LoadSavedResult =
  | PersistenceActionResult
  | { readonly ok: false; readonly needsConfirmation: true; readonly message: string }

export interface LoadSavedOptions {
  readonly gameId: string
  readonly activeGame: PrivateGameState | null
  readonly dispatch: (command: SessionCommand) => DispatchResult
  readonly getHistory: () => readonly SessionEvent[]
  readonly registry: RoundRegistry
  readonly confirmedReplace?: boolean
}

export interface UseHostPersistence {
  readonly adapter: PersistenceAdapter
  readonly bootPhase: PersistenceBootPhase
  readonly recovery: RecoveryPayload | null
  readonly invalidRecovery: InvalidRecoveryPayload | null
  readonly leadership: PersistenceLeadership
  readonly durabilityStatus: PersistenceDurabilityStatus
  readonly library: readonly SavedDefinitionSummary[]
  readonly message: string
  readonly initialHistory: readonly SessionEvent[]
  readonly storeEpoch: number
  readonly canDispatchSessionCommands: boolean
  readonly resume: () => void
  readonly discardRecovery: () => Promise<PersistenceActionResult>
  readonly refreshLibrary: () => Promise<PersistenceActionResult>
  readonly saveCurrentDefinition: (
    definition: GameDefinition | null,
    registry: RoundRegistry,
  ) => Promise<PersistenceActionResult>
  readonly replaceCurrentDefinition: (
    definition: GameDefinition | null,
    registry: RoundRegistry,
  ) => Promise<PersistenceActionResult>
  readonly deleteSaved: (gameId: string) => Promise<PersistenceActionResult>
  readonly loadSaved: (options: LoadSavedOptions) => Promise<LoadSavedResult>
  readonly dispatchSessionCommand: (
    command: SessionCommand,
    dispatch: (command: SessionCommand) => DispatchResult,
    getHistory: () => readonly SessionEvent[],
    registry: RoundRegistry,
  ) => DispatchResult
  readonly renewLease: () => Promise<PersistenceActionResult>
}

const DEFAULT_RENEW_INTERVAL_MS = Math.floor(HOST_WRITER_LEASE_TTL_MS / 2)

export function useHostPersistence(options: UseHostPersistenceOptions = {}): UseHostPersistence {
  const clock = options.clock ?? systemClock
  const leaseTtlMs = options.leaseTtlMs ?? HOST_WRITER_LEASE_TTL_MS
  const renewIntervalMs = options.renewIntervalMs ?? DEFAULT_RENEW_INTERVAL_MS
  const registry = useMemo(() => createDefaultRegistry(), [])
  const [adapter] = useState(() =>
    options.createAdapter ? options.createAdapter() : createIndexedDbPersistenceAdapter(),
  )
  const [writeQueue] = useState(() => new PersistenceWriteQueue())
  const [tabId] = useState(() => options.tabId ?? createTabId())
  const [broadcastChannel] = useState<BroadcastChannel | null>(() =>
    options.broadcastChannel === undefined
      ? createCoordinationBroadcastChannel()
      : options.broadcastChannel,
  )

  const [bootPhase, setBootPhase] = useState<PersistenceBootPhase>('loading')
  const [recovery, setRecovery] = useState<RecoveryPayload | null>(null)
  const [invalidRecovery, setInvalidRecovery] = useState<InvalidRecoveryPayload | null>(null)
  const [leadership, setLeadership] = useState<PersistenceLeadership>('unknown')
  const [durabilityStatus, setDurabilityStatus] = useState<PersistenceDurabilityStatus>('loading')
  const [library, setLibrary] = useState<readonly SavedDefinitionSummary[]>([])
  const [message, setMessage] = useState('Opening local persistence.')
  const [initialHistory, setInitialHistory] = useState<readonly SessionEvent[]>([])
  const [storeEpoch, setStoreEpoch] = useState(0)
  const storageReadyRef = useRef(false)
  const latestWriteToken = useRef(0)

  const leadershipOptions = useMemo(
    () => ({ adapter, tabId, clock, leaseTtlMs, broadcastChannel }),
    [adapter, broadcastChannel, clock, leaseTtlMs, tabId],
  )

  const canUseStorage = useCallback((): boolean => {
    if (!storageReadyRef.current) {
      setDurabilityStatus('unavailable')
      setMessage('Local persistence is unavailable. Recent changes might not survive refresh.')
      return false
    }
    return true
  }, [])

  const updateLibrary = useCallback(async (): Promise<PersistenceResult<readonly SavedDefinitionSummary[]>> => {
    const result = await listSavedDefinitions(adapter)
    if (result.ok) setLibrary(result.value)
    return result
  }, [adapter])

  const renewLease = useCallback(async (): Promise<PersistenceActionResult> => {
    if (!storageReadyRef.current) {
      setLeadership('unknown')
      return {
        ok: false,
        message: 'Local persistence is unavailable, so this tab cannot claim durable leadership.',
      }
    }
    const result = await acquireOrRenewHostLease(leadershipOptions)
    if (!result.ok) {
      setDurabilityStatus(result.code === 'unavailable' ? 'unavailable' : 'failed')
      setMessage('Could not refresh the persistence lease. In-memory play remains available.')
      return { ok: false, message: result.message }
    }
    setLeadership(result.value)
    return {
      ok: true,
      message:
        result.value === 'leader'
          ? 'This host owns the persistence lease.'
          : 'Another host tab owns persistence; this tab is read-only.',
    }
  }, [leadershipOptions])

  useEffect(() => {
    let cancelled = false
    storageReadyRef.current = false

    async function boot(): Promise<void> {
      setBootPhase('loading')
      setDurabilityStatus('loading')
      setMessage('Opening local persistence.')
      const opened = await adapter.open()
      if (cancelled) return
      if (!opened.ok) {
        setBootPhase('ready')
        setDurabilityStatus('unavailable')
        setLeadership('unknown')
        setMessage('Local persistence is unavailable. The host remains usable, but recent changes might not survive refresh.')
        return
      }

      storageReadyRef.current = true
      const lease = await acquireOrRenewHostLease(leadershipOptions)
      if (!cancelled) {
        if (lease.ok) {
          setLeadership(lease.value)
        } else {
          setLeadership('unknown')
          setDurabilityStatus(lease.code === 'unavailable' ? 'unavailable' : 'failed')
          setMessage('Could not claim a persistence lease. The host remains usable in memory.')
        }
      }

      const active = await readActiveSession(adapter, registry)
      if (cancelled) return
      if (!active.ok) {
        setBootPhase('ready')
        setDurabilityStatus(active.code === 'unavailable' ? 'unavailable' : 'failed')
        setMessage('Could not read recovery data. The host remains usable in memory.')
        void updateLibrary()
        return
      }

      applyActiveSessionRead(active.value)
      const listed = await updateLibrary()
      if (!cancelled && !listed.ok) {
        setDurabilityStatus(listed.code === 'unavailable' ? 'unavailable' : 'failed')
        setMessage('Saved definitions could not be listed. The host remains usable in memory.')
      }
    }

    void boot()
    return () => {
      cancelled = true
      storageReadyRef.current = false
      broadcastChannel?.close()
      void releaseHostLease(leadershipOptions).finally(() => {
        void adapter.close()
      })
    }
  }, [adapter, broadcastChannel, leadershipOptions, registry, updateLibrary])

  useEffect(() => {
    if (bootPhase === 'loading' || !storageReadyRef.current) return
    const id = window.setInterval(() => {
      void renewLease()
    }, renewIntervalMs)
    return () => window.clearInterval(id)
  }, [bootPhase, renewIntervalMs, renewLease])

  useEffect(() => {
    if (!broadcastChannel) return
    const listener = () => {
      void renewLease()
    }
    broadcastChannel.addEventListener('message', listener)
    return () => broadcastChannel.removeEventListener('message', listener)
  }, [broadcastChannel, renewLease])

  function applyActiveSessionRead(read: ActiveSessionRead): void {
    if (read.kind === 'none') {
      setRecovery(null)
      setInvalidRecovery(null)
      setInitialHistory([])
      setBootPhase('ready')
      setDurabilityStatus('idle')
      setMessage('Local persistence is ready. No unfinished active session was found.')
      return
    }
    if (read.kind === 'resumable') {
      setRecovery({ events: read.events, savedAt: read.savedAt })
      setInvalidRecovery(null)
      setBootPhase('recovery')
      setDurabilityStatus('idle')
      setMessage('An unfinished active session was found. Resume or discard it before continuing.')
      return
    }
    setRecovery(null)
    setInvalidRecovery({ code: read.code, message: read.message })
    setBootPhase('invalid-recovery')
    setDurabilityStatus('failed')
    setMessage('Stored recovery data is invalid. Discard it to continue with an empty host session.')
  }

  const persistHistory = useCallback(
    (history: readonly SessionEvent[], writeRegistry: RoundRegistry): void => {
      if (!storageReadyRef.current || leadership !== 'leader') return
      const token = latestWriteToken.current + 1
      latestWriteToken.current = token
      setDurabilityStatus('saving')
      setMessage('Saving active session.')
      void writeActiveSession(adapter, history, clock.now(), writeQueue, writeRegistry).then((result) => {
        if (latestWriteToken.current !== token) return
        if (result.ok) {
          setDurabilityStatus('saved')
          setMessage('Active session saved locally.')
        } else {
          setDurabilityStatus(result.code === 'unavailable' ? 'unavailable' : 'failed')
          setMessage('Active session could not be saved. Recent changes might not survive refresh.')
        }
      })
    },
    [adapter, clock, leadership, writeQueue],
  )

  const resume = useCallback(() => {
    if (!recovery) return
    setInitialHistory(recovery.events)
    setStoreEpoch((epoch) => epoch + 1)
    setBootPhase('ready')
    setDurabilityStatus('idle')
    setMessage('Recovered session loaded. Future accepted changes will be saved after each write completes.')
  }, [recovery])

  const discardRecovery = useCallback(async (): Promise<PersistenceActionResult> => {
    if (!canUseStorage()) {
      setInitialHistory([])
      setStoreEpoch((epoch) => epoch + 1)
      setBootPhase('ready')
      return { ok: false, message: 'Persistence is unavailable; starting with an empty in-memory session.' }
    }
    const result = await clearActiveSession(adapter)
    setInitialHistory([])
    setStoreEpoch((epoch) => epoch + 1)
    setRecovery(null)
    setInvalidRecovery(null)
    setBootPhase('ready')
    if (!result.ok) {
      setDurabilityStatus(result.code === 'unavailable' ? 'unavailable' : 'failed')
      setMessage('Recovery could not be cleared. The host is usable, but the warning may return after refresh.')
      return { ok: false, message: result.message }
    }
    setDurabilityStatus('idle')
    setMessage('Recovery discarded. Started with an empty host session.')
    return { ok: true, message: 'Recovery discarded.' }
  }, [adapter, canUseStorage])

  const refreshLibrary = useCallback(async (): Promise<PersistenceActionResult> => {
    if (!canUseStorage()) return { ok: false, message: 'Persistence is unavailable.' }
    const result = await updateLibrary()
    if (!result.ok) {
      setDurabilityStatus(result.code === 'unavailable' ? 'unavailable' : 'failed')
      setMessage('Saved definitions could not be refreshed.')
      return { ok: false, message: result.message }
    }
    setMessage('Saved definitions refreshed.')
    return { ok: true, message: 'Saved definitions refreshed.' }
  }, [canUseStorage, updateLibrary])

  const saveCurrentDefinition = useCallback(
    async (definition: GameDefinition | null, writeRegistry: RoundRegistry): Promise<PersistenceActionResult> => {
      if (!definition) return { ok: false, message: 'No loaded game definition to save.' }
      if (leadership === 'follower') return { ok: false, message: 'This tab is read-only while another host owns persistence.' }
      if (!canUseStorage()) return { ok: false, message: 'Persistence is unavailable.' }
      const result = await saveDefinition(adapter, definition, { mode: 'save', registry: writeRegistry })
      if (!result.ok) {
        setDurabilityStatus(result.code === 'unavailable' ? 'unavailable' : 'failed')
        setMessage('Saved definition could not be written.')
        return { ok: false, message: result.message }
      }
      if (result.value === 'needs-replace') {
        setMessage('A saved definition with this id already exists. Confirm Replace to overwrite it.')
        return { ok: false, message: 'Replace confirmation required.' }
      }
      await updateLibrary()
      const message =
        result.value === 'noop'
          ? 'Saved definition already matches this game; nothing changed.'
          : 'Saved definition created.'
      setMessage(message)
      return { ok: true, message }
    },
    [adapter, canUseStorage, leadership, updateLibrary],
  )

  const replaceCurrentDefinition = useCallback(
    async (definition: GameDefinition | null, writeRegistry: RoundRegistry): Promise<PersistenceActionResult> => {
      if (!definition) return { ok: false, message: 'No loaded game definition to replace.' }
      if (leadership === 'follower') return { ok: false, message: 'This tab is read-only while another host owns persistence.' }
      if (!canUseStorage()) return { ok: false, message: 'Persistence is unavailable.' }
      const result = await saveDefinition(adapter, definition, { mode: 'replace', registry: writeRegistry })
      if (!result.ok) {
        setDurabilityStatus(result.code === 'unavailable' ? 'unavailable' : 'failed')
        setMessage('Saved definition could not be replaced.')
        return { ok: false, message: result.message }
      }
      await updateLibrary()
      const message = result.value === 'noop' ? 'Saved definition already matched this game.' : 'Saved definition replaced.'
      setMessage(message)
      return { ok: true, message }
    },
    [adapter, canUseStorage, leadership, updateLibrary],
  )

  const deleteSaved = useCallback(
    async (gameId: string): Promise<PersistenceActionResult> => {
      if (leadership === 'follower') return { ok: false, message: 'This tab is read-only while another host owns persistence.' }
      if (!canUseStorage()) return { ok: false, message: 'Persistence is unavailable.' }
      const result = await deleteDefinition(adapter, gameId)
      if (!result.ok) {
        setDurabilityStatus(result.code === 'unavailable' ? 'unavailable' : 'failed')
        setMessage('Saved definition could not be deleted.')
        return { ok: false, message: result.message }
      }
      await updateLibrary()
      setMessage('Saved definition deleted.')
      return { ok: true, message: 'Saved definition deleted.' }
    },
    [adapter, canUseStorage, leadership, updateLibrary],
  )

  const loadSaved = useCallback(
    async ({
      gameId,
      activeGame,
      dispatch,
      getHistory,
      registry: loadRegistry,
      confirmedReplace = false,
    }: LoadSavedOptions): Promise<LoadSavedResult> => {
      if (leadership === 'follower') {
        return { ok: false, message: 'This tab is read-only while another host owns persistence.' }
      }
      if (activeGame?.gameLifecycle === 'active' && !confirmedReplace) {
        const message = 'Loading this saved definition would replace the unfinished active game. Confirm to replace it.'
        setMessage(message)
        return { ok: false, needsConfirmation: true, message }
      }
      if (!canUseStorage()) return { ok: false, message: 'Persistence is unavailable.' }
      const loaded = await loadDefinition(adapter, gameId, loadRegistry)
      if (!loaded.ok) {
        setDurabilityStatus(loaded.code === 'unavailable' ? 'unavailable' : 'failed')
        setMessage('Saved definition could not be loaded.')
        return { ok: false, message: loaded.message }
      }
      const result = dispatch({
        type: 'INITIALIZE_GAME',
        issuedAt: clock.now(),
        definition: loaded.value,
      })
      if (result.status !== 'accepted') {
        const message = `The active session rejected the saved definition (${result.reason}).`
        setMessage(message)
        return { ok: false, message }
      }
      // Safe if the caller passed a raw store dispatch (no enqueue) or a wrapped
      // leadership dispatch (already enqueued): writeActiveSession is generation-gated.
      persistHistory(getHistory(), loadRegistry)
      setMessage('Saved definition loaded into the active session.')
      return { ok: true, message: 'Saved definition loaded.' }
    },
    [adapter, canUseStorage, clock, leadership, persistHistory],
  )

  const dispatchSessionCommand = useCallback(
    (
      command: SessionCommand,
      dispatch: (command: SessionCommand) => DispatchResult,
      getHistory: () => readonly SessionEvent[],
      writeRegistry: RoundRegistry,
    ): DispatchResult => {
      if (bootPhase !== 'ready' || leadership === 'follower') {
        // The DispatchResult vocabulary has no read-only reason. The UI disables
        // command controls; this guard keeps stale callbacks from mutating state.
        return { status: 'rejected', reason: 'malformed-command' }
      }
      const result = dispatch(command)
      if (result.status === 'accepted') persistHistory(getHistory(), writeRegistry)
      return result
    },
    [bootPhase, leadership, persistHistory],
  )

  return {
    adapter,
    bootPhase,
    recovery,
    invalidRecovery,
    leadership,
    durabilityStatus,
    library,
    message,
    initialHistory,
    storeEpoch,
    canDispatchSessionCommands: bootPhase === 'ready' && leadership !== 'follower',
    resume,
    discardRecovery,
    refreshLibrary,
    saveCurrentDefinition,
    replaceCurrentDefinition,
    deleteSaved,
    loadSaved,
    dispatchSessionCommand,
    renewLease,
  }
}

function createCoordinationBroadcastChannel(): BroadcastChannel | null {
  if (typeof BroadcastChannel === 'undefined') return null
  try {
    return new BroadcastChannel(COORDINATION_BROADCAST_CHANNEL)
  } catch {
    return null
  }
}
