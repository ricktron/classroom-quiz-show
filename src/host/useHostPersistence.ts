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
  collectReferencedPackScopeKeys,
  hydratePackMediaForDefinition,
} from '../pack/hydratePackMedia'
import { gcUnreferencedPackScopes } from '../pack/packMediaPersistence'
import { getSharedPackResourceRegistry } from '../pack/resourceRegistry'
import {
  COORDINATION_BROADCAST_CHANNEL,
  HOST_WRITER_LEASE_TTL_MS,
  PersistenceWriteQueue,
  acquireOrRenewHostLease,
  clearAllCompletedSummaries,
  clearActiveSession,
  createIndexedDbPersistenceAdapter,
  createTabId,
  deleteCompletedSummary,
  deleteDefinition,
  enqueueSaveCompletedAndClearActive,
  enforceCompletedSummaryRetention,
  listCompletedSummaries,
  listSavedDefinitions,
  loadDefinition,
  readActiveSession,
  releaseHostLease,
  saveDefinition,
  updateCompletedSummaryClassLabel,
  writeActiveSession,
  type ActiveSessionRead,
  type CompletedSummaryListing,
  type PersistenceAdapter,
  type PersistenceErrorCode,
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

export type LedgerStatus =
  | 'idle'
  | 'saving'
  | 'saved'
  | 'failed'
  | 'unavailable'
  | 'upgrade-blocked'
  | 'quota-exceeded'

export interface CurrentCompletionSave {
  readonly sessionId: string
  readonly status: 'saving' | 'saved' | 'failed'
  readonly recordId?: string
}

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
  readonly ledgerStatus: LedgerStatus
  readonly ledgerMessage: string
  readonly currentCompletionSave: CurrentCompletionSave | null
  readonly completedListings: readonly CompletedSummaryListing[]
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
  readonly retryCurrentCompletionSave: () => Promise<PersistenceActionResult>
  readonly refreshCompletedLedger: () => Promise<PersistenceActionResult>
  readonly deleteCompletedRecord: (key: string) => Promise<PersistenceActionResult>
  readonly clearAllCompletedRecords: () => Promise<PersistenceActionResult>
  readonly updateCompletedClassLabel: (
    recordId: string,
    label: string | null,
  ) => Promise<PersistenceActionResult>
  /** Keeps pack-media GC aware of the active loaded definition. */
  readonly setPackGcContext?: (
    definition: GameDefinition | null,
    roundRegistry: RoundRegistry,
  ) => void
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
  const [ledgerStatus, setLedgerStatus] = useState<LedgerStatus>('idle')
  const [ledgerMessage, setLedgerMessage] = useState('Completed-session ledger is ready.')
  const [currentCompletionSave, setCurrentCompletionSave] =
    useState<CurrentCompletionSave | null>(null)
  const [completedListings, setCompletedListings] =
    useState<readonly CompletedSummaryListing[]>([])
  const [library, setLibrary] = useState<readonly SavedDefinitionSummary[]>([])
  const [message, setMessage] = useState('Opening local persistence.')
  const [initialHistory, setInitialHistory] = useState<readonly SessionEvent[]>([])
  const [storeEpoch, setStoreEpoch] = useState(0)
  const storageReadyRef = useRef(false)
  const latestWriteToken = useRef(0)
  const lastCompletionAttemptRef = useRef<string | null>(null)
  const retryCompletionRef = useRef<{
    readonly sessionId: string
    readonly history: readonly SessionEvent[]
    readonly savedAt: number
  } | null>(null)
  const packGcContextRef = useRef<{
    definition: GameDefinition | null
    roundRegistry: RoundRegistry
  }>({ definition: null, roundRegistry: registry })

  const gcPackMedia = useCallback(async (): Promise<void> => {
    if (!storageReadyRef.current) return
    const { definition, roundRegistry } = packGcContextRef.current
    const keepScopeKeys = await collectReferencedPackScopeKeys(adapter, {
      activeDefinition: definition,
      roundRegistry,
    })
    await gcUnreferencedPackScopes(adapter, { keepScopeKeys })
  }, [adapter])

  const setPackGcContext = useCallback(
    (definition: GameDefinition | null, roundRegistry: RoundRegistry): void => {
      const previous = packGcContextRef.current.definition
      packGcContextRef.current = { definition, roundRegistry }
      // GC only when a previously loaded definition is replaced or cleared.
      // Skip the initial null boot context: recoverable active-session pack
      // scopes are not yet represented in `activeDefinition` and must survive
      // until Resume rehydrates the definition into the GC keep-set.
      if (previous !== null) {
        void gcPackMedia()
      }
    },
    [gcPackMedia],
  )

  const hydrateActivePackMedia = useCallback(
    async (definition: GameDefinition, roundRegistry: RoundRegistry): Promise<void> => {
      if (!storageReadyRef.current) return
      await hydratePackMediaForDefinition(
        adapter,
        definition,
        getSharedPackResourceRegistry(),
        roundRegistry,
      )
    },
    [adapter],
  )

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

  const updateCompletedLedger = useCallback(async (): Promise<PersistenceResult<readonly CompletedSummaryListing[]>> => {
    const result = await listCompletedSummaries(adapter)
    if (result.ok) setCompletedListings(result.value)
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
      if (!cancelled) applyBootLease(lease)

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
      const completed = await updateCompletedLedger()
      if (!cancelled && !completed.ok) {
        setLedgerStatus(ledgerStatusForError(completed.code))
        setLedgerMessage('Completed summaries could not be listed.')
      }
    }

    function applyBootLease(lease: PersistenceResult<'leader' | 'follower'>): void {
      if (lease.ok) {
        setLeadership(lease.value)
        return
      }
      setLeadership('unknown')
      setDurabilityStatus(lease.code === 'unavailable' ? 'unavailable' : 'failed')
      setMessage('Could not claim a persistence lease. The host remains usable in memory.')
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
  }, [adapter, broadcastChannel, leadershipOptions, registry, updateCompletedLedger, updateLibrary])

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

  const saveCompletion = useCallback(
    async (
      sessionId: string,
      history: readonly SessionEvent[],
      savedAt: number,
    ): Promise<PersistenceActionResult> => {
      retryCompletionRef.current = { sessionId, history, savedAt }
      setCurrentCompletionSave({ sessionId, status: 'saving' })
      setLedgerStatus('saving')
      setLedgerMessage('Saving completed summary locally.')
      if (!storageReadyRef.current) {
        setCurrentCompletionSave({ sessionId, status: 'failed' })
        setLedgerStatus('unavailable')
        const message =
          'Summary is available for this session, but local persistence is unavailable. Retry when storage is available.'
        setLedgerMessage(message)
        return { ok: false, message }
      }
      if (leadership !== 'leader') {
        setCurrentCompletionSave({ sessionId, status: 'failed' })
        setLedgerStatus('failed')
        const message =
          leadership === 'follower'
            ? 'This follower tab cannot save completed summaries.'
            : 'This tab cannot save completed summaries until it holds the persistence lease.'
        setLedgerMessage(message)
        return { ok: false, message }
      }

      const saved = await enqueueSaveCompletedAndClearActive(
        adapter,
        history,
        { savedAt, classLabel: null },
        writeQueue,
      )
      if (!saved.ok) {
        setCurrentCompletionSave({ sessionId, status: 'failed' })
        setLedgerStatus(ledgerStatusForError(saved.code))
        setLedgerMessage(
          'Summary is available for this session, but its local copy was not saved. Retry is available.',
        )
        return { ok: false, message: saved.message }
      }

      setCurrentCompletionSave({
        sessionId,
        status: 'saved',
        recordId: saved.value.recordId,
      })
      setLedgerStatus('saved')
      setLedgerMessage('Completed summary saved locally.')
      const retained = await enforceCompletedSummaryRetention(adapter)
      const listed = await updateCompletedLedger()
      if (!retained.ok) {
        const message = listed.ok
          ? 'Completed summary saved locally, but automatic retention cleanup failed. The saved record was kept.'
          : 'Completed summary saved locally, but automatic retention cleanup failed and the ledger list could not be refreshed. Use Refresh ledger.'
        setLedgerMessage(message)
        return {
          ok: true,
          message: 'Summary saved; automatic retention cleanup failed.',
        }
      }
      if (!listed.ok) {
        setLedgerMessage(
          'Completed summary saved locally, but the ledger list could not be refreshed. Use Refresh ledger.',
        )
        return {
          ok: true,
          message: 'Summary saved; ledger list refresh failed.',
        }
      }
      return { ok: true, message: 'Completed summary saved locally.' }
    },
    [adapter, leadership, updateCompletedLedger, writeQueue],
  )

  const retryCurrentCompletionSave = useCallback(async (): Promise<PersistenceActionResult> => {
    const pending = retryCompletionRef.current
    if (pending === null) {
      return { ok: false, message: 'No completed summary save is available to retry.' }
    }
    return saveCompletion(pending.sessionId, pending.history, pending.savedAt)
  }, [saveCompletion])

  const refreshCompletedLedger = useCallback(async (): Promise<PersistenceActionResult> => {
    if (!storageReadyRef.current) {
      setLedgerStatus('unavailable')
      setLedgerMessage('Completed summaries are unavailable because local persistence is unavailable.')
      return { ok: false, message: 'Local persistence is unavailable.' }
    }
    const result = await updateCompletedLedger()
    if (!result.ok) {
      setLedgerStatus(ledgerStatusForError(result.code))
      setLedgerMessage('Completed summaries could not be refreshed.')
      return { ok: false, message: result.message }
    }
    setLedgerStatus('idle')
    setLedgerMessage('Completed summaries refreshed.')
    return { ok: true, message: 'Completed summaries refreshed.' }
  }, [updateCompletedLedger])

  const mutateCompletedLedger = useCallback(
    async (
      operation: () => Promise<PersistenceResult<unknown>>,
      successMessage: string,
    ): Promise<PersistenceActionResult> => {
      if (leadership !== 'leader') {
        return {
          ok: false,
          message:
            leadership === 'follower'
              ? 'This tab is read-only while another host owns persistence.'
              : 'This tab cannot mutate the ledger until it holds the persistence lease.',
        }
      }
      if (!storageReadyRef.current) {
        setLedgerStatus('unavailable')
        return { ok: false, message: 'Local persistence is unavailable.' }
      }
      const result = await operation()
      if (!result.ok) {
        setLedgerStatus(ledgerStatusForError(result.code))
        setLedgerMessage(result.message)
        return { ok: false, message: result.message }
      }
      const listed = await updateCompletedLedger()
      if (!listed.ok) {
        setLedgerStatus(ledgerStatusForError(listed.code))
        const message = `${successMessage} The durable change succeeded, but the ledger list could not be refreshed. Use Refresh ledger.`
        setLedgerMessage(message)
        return { ok: true, message }
      }
      setLedgerStatus('idle')
      setLedgerMessage(successMessage)
      return { ok: true, message: successMessage }
    },
    [leadership, updateCompletedLedger],
  )

  const deleteCompletedRecord = useCallback(
    async (key: string): Promise<PersistenceActionResult> => {
      const result = await mutateCompletedLedger(
        () => deleteCompletedSummary(adapter, key),
        'Completed summary deleted. This cannot be undone.',
      )
      if (result.ok && currentCompletionSave?.recordId === key) {
        setCurrentCompletionSave({ sessionId: key, status: 'failed' })
        setLedgerMessage(
          'The saved copy was deleted. The in-memory summary remains available until this session is cleared.',
        )
      }
      return result
    },
    [adapter, currentCompletionSave?.recordId, mutateCompletedLedger],
  )

  const clearAllCompletedRecords = useCallback(
    async (): Promise<PersistenceActionResult> => {
      const result = await mutateCompletedLedger(
        () => clearAllCompletedSummaries(adapter),
        'All completed summaries deleted. This cannot be undone.',
      )
      if (result.ok && currentCompletionSave?.status === 'saved') {
        setCurrentCompletionSave({
          sessionId: currentCompletionSave.sessionId,
          status: 'failed',
        })
      }
      return result
    },
    [adapter, currentCompletionSave, mutateCompletedLedger],
  )

  const updateCompletedClassLabel = useCallback(
    (recordId: string, label: string | null) =>
      mutateCompletedLedger(
        () => updateCompletedSummaryClassLabel(adapter, recordId, label),
        'Class label updated.',
      ),
    [adapter, mutateCompletedLedger],
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
      await gcPackMedia()
      const message =
        result.value === 'noop'
          ? 'Saved definition already matches this game; nothing changed.'
          : 'Saved definition created.'
      setMessage(message)
      return { ok: true, message }
    },
    [adapter, canUseStorage, gcPackMedia, leadership, updateLibrary],
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
      await gcPackMedia()
      const message = result.value === 'noop' ? 'Saved definition already matched this game.' : 'Saved definition replaced.'
      setMessage(message)
      return { ok: true, message }
    },
    [adapter, canUseStorage, gcPackMedia, leadership, updateLibrary],
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
      await gcPackMedia()
      await updateLibrary()
      setMessage('Saved definition deleted.')
      return { ok: true, message: 'Saved definition deleted.' }
    },
    [adapter, canUseStorage, gcPackMedia, leadership, updateLibrary],
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
      await hydrateActivePackMedia(loaded.value, loadRegistry)
      // Safe if the caller passed a raw store dispatch (no enqueue) or a wrapped
      // leadership dispatch (already enqueued): writeActiveSession is generation-gated.
      persistHistory(getHistory(), loadRegistry)
      setMessage('Saved definition loaded into the active session.')
      return { ok: true, message: 'Saved definition loaded.' }
    },
    [adapter, canUseStorage, clock, hydrateActivePackMedia, leadership, persistHistory],
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
      const previousHistoryLength = getHistory().length
      const result = dispatch(command)
      if (result.status === 'accepted') {
        const history = getHistory()
        const completionEvent = history
          .slice(previousHistoryLength)
          .find((event) => event.type === 'GAME_SESSION_ENDED')
        if (completionEvent !== undefined) {
          const sessionId = findLastInitializedSessionId(history)
          if (sessionId !== undefined && lastCompletionAttemptRef.current !== sessionId) {
            lastCompletionAttemptRef.current = sessionId
            void saveCompletion(sessionId, history, clock.now())
          }
        } else {
          persistHistory(history, writeRegistry)
        }
      }
      return result
    },
    [bootPhase, clock, leadership, persistHistory, saveCompletion],
  )

  return {
    adapter,
    bootPhase,
    recovery,
    invalidRecovery,
    leadership,
    durabilityStatus,
    ledgerStatus,
    ledgerMessage,
    currentCompletionSave,
    completedListings,
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
    retryCurrentCompletionSave,
    refreshCompletedLedger,
    deleteCompletedRecord,
    clearAllCompletedRecords,
    updateCompletedClassLabel,
    setPackGcContext,
  }
}

function ledgerStatusForError(code: PersistenceErrorCode): LedgerStatus {
  if (code === 'unavailable') return 'unavailable'
  if (code === 'upgrade-blocked') return 'upgrade-blocked'
  if (code === 'quota-exceeded') return 'quota-exceeded'
  return 'failed'
}

function findLastInitializedSessionId(history: readonly SessionEvent[]): string | undefined {
  for (let index = history.length - 1; index >= 0; index -= 1) {
    const event = history[index]
    if (event?.type === 'SESSION_INITIALIZED') return event.sessionId
  }
  return undefined
}

function createCoordinationBroadcastChannel(): BroadcastChannel | null {
  if (typeof BroadcastChannel === 'undefined') return null
  try {
    return new BroadcastChannel(COORDINATION_BROADCAST_CHANNEL)
  } catch {
    return null
  }
}
