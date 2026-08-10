import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { TeamDefinition } from '../game/teams/definition'
import {
  materializeSupportedProfileMapping,
  matchesExpectedWbuzzGamepadTopology,
  reportedIdLooksLikeSupportedWbuzz,
  teamSetSignature,
  type SonyBuzzSlotId,
  type SonyBuzzSlotTeamAssociation,
} from '../input/sonyBuzzSupportedProfile'
import {
  createSonyBuzzKeepAliveLifecycle,
  type SonyBuzzKeepAliveLifecycle,
  type SonyBuzzTransportSnapshot,
} from '../input/sonyBuzzKeepAliveLifecycle'
import type { WebHidTransport } from '../input/webHidTransport'
import {
  clearSonyBuzzMappingRecord,
  createSonyBuzzMappingRecord,
  loadSonyBuzzMappingRecord,
  mappingMatchesContext,
  saveSonyBuzzMappingRecord,
} from '../persistence/sonyBuzzMappingStore'
import {
  createIndexedDbPersistenceAdapter,
  type PersistenceAdapter,
} from '../persistence'
import type { GamepadControllerInfo } from './useGamepadBuzzInput'
import type { GamepadMapping } from '../input/gamepadMapping'
import { EMPTY_GAMEPAD_MAPPING } from '../input/gamepadMapping'

export interface UseSonyBuzzSupportedProfileOptions {
  readonly gameId: string
  readonly teams: readonly TeamDefinition[]
  readonly controllers: readonly GamepadControllerInfo[]
  readonly transport?: WebHidTransport
  readonly persistenceAdapter?: PersistenceAdapter
  readonly lifecycleFactory?: (transport?: WebHidTransport) => SonyBuzzKeepAliveLifecycle
}

export interface SonyBuzzSupportedProfileApi {
  readonly transport: SonyBuzzTransportSnapshot
  readonly reprimeToken: number
  readonly associations: readonly SonyBuzzSlotTeamAssociation[]
  readonly mappingStatus:
    | 'absent'
    | 'ready'
    | 'stale'
    | 'unsupported-version'
    | 'malformed'
    | 'loading'
  readonly materializedMapping: GamepadMapping
  readonly wbuzzController: GamepadControllerInfo | null
  readonly profileReady: boolean
  readonly connect: () => Promise<void>
  readonly disableKeepAlive: () => void
  readonly setSlotTeam: (slotId: SonyBuzzSlotId, teamId: string | null) => void
  readonly saveAssociations: () => Promise<boolean>
  readonly clearSavedMapping: () => Promise<boolean>
  readonly applyMaterializedMapping: () => GamepadMapping
}

export function useSonyBuzzSupportedProfile({
  gameId,
  teams,
  controllers,
  transport,
  persistenceAdapter,
  lifecycleFactory,
}: UseSonyBuzzSupportedProfileOptions): SonyBuzzSupportedProfileApi {
  const adapterRef = useRef<PersistenceAdapter | null>(null)
  if (adapterRef.current === null) {
    adapterRef.current = persistenceAdapter ?? createIndexedDbPersistenceAdapter()
  }

  const lifecycleRef = useRef<SonyBuzzKeepAliveLifecycle | null>(null)
  if (lifecycleRef.current === null) {
    lifecycleRef.current = lifecycleFactory
      ? lifecycleFactory(transport)
      : createSonyBuzzKeepAliveLifecycle({ transport })
  }

  const [transportSnap, setTransportSnap] = useState<SonyBuzzTransportSnapshot>(() =>
    lifecycleRef.current!.getSnapshot(),
  )
  const [reprimeToken, setReprimeToken] = useState(0)
  const [associations, setAssociations] = useState<readonly SonyBuzzSlotTeamAssociation[]>([])
  const [mappingStatus, setMappingStatus] = useState<
    'absent' | 'ready' | 'stale' | 'unsupported-version' | 'malformed' | 'loading'
  >('loading')
  const loadGeneration = useRef(0)

  const signature = useMemo(() => teamSetSignature(teams), [teams])
  const knownTeamIds = useMemo(() => new Set(teams.map((t) => t.id)), [teams])

  useEffect(() => {
    // Recreate after Strict Mode dispose so a nullled ref cannot crash restore.
    if (lifecycleRef.current === null) {
      lifecycleRef.current = lifecycleFactory
        ? lifecycleFactory(transport)
        : createSonyBuzzKeepAliveLifecycle({ transport })
      setTransportSnap(lifecycleRef.current.getSnapshot())
    }
    const life = lifecycleRef.current
    const unsub = life.subscribe((snap) => {
      setTransportSnap(snap)
      setReprimeToken(life.getReprimeToken())
    })
    const onVis = () => life.onVisibilityOrFocusReturn()
    const onFocus = () => life.onVisibilityOrFocusReturn()
    document.addEventListener('visibilitychange', onVis)
    window.addEventListener('focus', onFocus)
    void life.tryRestoreGranted()
    return () => {
      unsub()
      document.removeEventListener('visibilitychange', onVis)
      window.removeEventListener('focus', onFocus)
      life.dispose()
      lifecycleRef.current = null
    }
  }, [lifecycleFactory, transport])

  useEffect(() => {
    const gen = ++loadGeneration.current
    setMappingStatus('loading')
    void (async () => {
      const outcome = await loadSonyBuzzMappingRecord(adapterRef.current!)
      if (gen !== loadGeneration.current) return
      if (outcome.status === 'absent') {
        setAssociations([])
        setMappingStatus('absent')
        return
      }
      if (outcome.status === 'unsupported-version') {
        setAssociations([])
        setMappingStatus('unsupported-version')
        return
      }
      if (outcome.status === 'malformed' || outcome.status === 'unavailable') {
        setAssociations([])
        setMappingStatus('malformed')
        return
      }
      const record = outcome.record
      if (!mappingMatchesContext(record, gameId, signature, knownTeamIds)) {
        setAssociations([])
        setMappingStatus('stale')
        return
      }
      setAssociations(record.associations)
      setMappingStatus('ready')
    })()
  }, [gameId, signature, knownTeamIds])

  const wbuzzController = useMemo(() => {
    return (
      controllers.find((c) => {
        if (c.reportedId.status !== 'available') return false
        if (!reportedIdLooksLikeSupportedWbuzz(c.reportedId.value)) return false
        // Axis values never cross the Gamepad boundary; button count is the
        // host-visible topology gate (physical evidence also observed 2 axes).
        return matchesExpectedWbuzzGamepadTopology(c.buttonCount)
      }) ?? null
    )
  }, [controllers])

  const materializedMapping = useMemo(() => {
    if (!wbuzzController || associations.length === 0) return EMPTY_GAMEPAD_MAPPING
    const result = materializeSupportedProfileMapping({
      controllerIndex: wbuzzController.controllerIndex,
      associations,
      teams,
    })
    return result.ok ? result.mapping : EMPTY_GAMEPAD_MAPPING
  }, [wbuzzController, associations, teams])

  const profileReady =
    (transportSnap.health === 'healthy' || transportSnap.health === 'degraded') &&
    wbuzzController != null &&
    associations.length > 0 &&
    mappingStatus !== 'stale' &&
    mappingStatus !== 'unsupported-version'

  const setSlotTeam = useCallback((slotId: SonyBuzzSlotId, teamId: string | null) => {
    setAssociations((current) => {
      const without = current.filter((a) => a.slotId !== slotId)
      if (teamId == null) return without
      return [...without, { slotId, teamId }].sort((a, b) => a.slotId - b.slotId)
    })
  }, [])

  const saveAssociations = useCallback(async () => {
    const record = createSonyBuzzMappingRecord({
      gameId,
      teamSignature: signature,
      associations,
      optedIn: true,
    })
    const result = await saveSonyBuzzMappingRecord(adapterRef.current!, record)
    if (!result.ok) return false
    setMappingStatus('ready')
    return true
  }, [gameId, signature, associations])

  const clearSavedMapping = useCallback(async () => {
    const result = await clearSonyBuzzMappingRecord(adapterRef.current!)
    if (!result.ok) return false
    setAssociations([])
    setMappingStatus('absent')
    return true
  }, [])

  return {
    transport: transportSnap,
    reprimeToken,
    associations,
    mappingStatus,
    materializedMapping,
    wbuzzController,
    profileReady,
    connect: () => lifecycleRef.current!.connect(),
    disableKeepAlive: () => lifecycleRef.current!.disable(),
    setSlotTeam,
    saveAssociations,
    clearSavedMapping,
    applyMaterializedMapping: () => materializedMapping,
  }
}
