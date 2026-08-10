import type { PersistenceAdapter } from './adapter'
import { OBJECT_STORE_SONY_BUZZ_MAPPINGS } from './constants'
import { persistenceErr, persistenceOk, type PersistenceResult } from './results'
import {
  SONY_BUZZ_MAPPING_VERSION,
  SONY_BUZZ_SUPPORTED_PRODUCT_ID,
  SONY_BUZZ_SUPPORTED_PROFILE_ID,
  SONY_BUZZ_SUPPORTED_PROFILE_VERSION,
  SONY_BUZZ_SUPPORTED_VENDOR_ID,
  type SonyBuzzSlotId,
  type SonyBuzzSlotTeamAssociation,
} from '../input/sonyBuzzSupportedProfile'

/**
 * Host-private Sony Buzz team-association persistence (IndexedDB v4).
 *
 * Does NOT store Gamepad controllerIndex or the static button recipe.
 */

export const SONY_BUZZ_MAPPING_RECORD_KEY = 'current'

export interface SonyBuzzMappingRecord {
  readonly mappingVersion: typeof SONY_BUZZ_MAPPING_VERSION
  readonly supportedProfileId: typeof SONY_BUZZ_SUPPORTED_PROFILE_ID
  readonly supportedProfileVersion: typeof SONY_BUZZ_SUPPORTED_PROFILE_VERSION
  readonly vendorId: typeof SONY_BUZZ_SUPPORTED_VENDOR_ID
  readonly productId: typeof SONY_BUZZ_SUPPORTED_PRODUCT_ID
  /** GameDefinition.id for this association context. */
  readonly gameId: string
  /** Sorted team-id signature at save time. */
  readonly teamSignature: string
  readonly associations: readonly SonyBuzzSlotTeamAssociation[]
  readonly updatedAt: string
  /** Teacher opted into using the supported profile with keep-alive. */
  readonly optedIn: boolean
}

export type SonyBuzzMappingLoadOutcome =
  | { readonly status: 'loaded'; readonly record: SonyBuzzMappingRecord }
  | { readonly status: 'absent' }
  | { readonly status: 'unsupported-version' }
  | { readonly status: 'malformed' }
  | { readonly status: 'stale-context'; readonly record: SonyBuzzMappingRecord }
  | { readonly status: 'unavailable'; readonly message: string }

function isSlotId(value: unknown): value is SonyBuzzSlotId {
  return value === 1 || value === 2 || value === 3 || value === 4
}

export function parseSonyBuzzMappingRecord(raw: unknown): SonyBuzzMappingRecord | null {
  if (typeof raw !== 'object' || raw === null) return null
  const o = raw as Record<string, unknown>
  if (o.mappingVersion !== SONY_BUZZ_MAPPING_VERSION) return null
  if (o.supportedProfileId !== SONY_BUZZ_SUPPORTED_PROFILE_ID) return null
  if (o.supportedProfileVersion !== SONY_BUZZ_SUPPORTED_PROFILE_VERSION) return null
  if (o.vendorId !== SONY_BUZZ_SUPPORTED_VENDOR_ID) return null
  if (o.productId !== SONY_BUZZ_SUPPORTED_PRODUCT_ID) return null
  if (typeof o.gameId !== 'string' || o.gameId.length === 0) return null
  if (typeof o.teamSignature !== 'string') return null
  if (typeof o.updatedAt !== 'string') return null
  if (typeof o.optedIn !== 'boolean') return null
  if (!Array.isArray(o.associations)) return null
  const associations: SonyBuzzSlotTeamAssociation[] = []
  for (const item of o.associations) {
    if (typeof item !== 'object' || item === null) return null
    const a = item as Record<string, unknown>
    if (!isSlotId(a.slotId)) return null
    if (typeof a.teamId !== 'string' || a.teamId.length === 0) return null
    associations.push({ slotId: a.slotId, teamId: a.teamId })
  }
  // Reject accidental controllerIndex persistence
  if ('controllerIndex' in o) return null
  for (const item of o.associations as unknown[]) {
    if (typeof item === 'object' && item !== null && 'controllerIndex' in item) return null
  }
  return {
    mappingVersion: SONY_BUZZ_MAPPING_VERSION,
    supportedProfileId: SONY_BUZZ_SUPPORTED_PROFILE_ID,
    supportedProfileVersion: SONY_BUZZ_SUPPORTED_PROFILE_VERSION,
    vendorId: SONY_BUZZ_SUPPORTED_VENDOR_ID,
    productId: SONY_BUZZ_SUPPORTED_PRODUCT_ID,
    gameId: o.gameId,
    teamSignature: o.teamSignature,
    associations,
    updatedAt: o.updatedAt,
    optedIn: o.optedIn,
  }
}

export function createSonyBuzzMappingRecord(args: {
  readonly gameId: string
  readonly teamSignature: string
  readonly associations: readonly SonyBuzzSlotTeamAssociation[]
  readonly optedIn: boolean
  readonly updatedAt?: string
}): SonyBuzzMappingRecord {
  return {
    mappingVersion: SONY_BUZZ_MAPPING_VERSION,
    supportedProfileId: SONY_BUZZ_SUPPORTED_PROFILE_ID,
    supportedProfileVersion: SONY_BUZZ_SUPPORTED_PROFILE_VERSION,
    vendorId: SONY_BUZZ_SUPPORTED_VENDOR_ID,
    productId: SONY_BUZZ_SUPPORTED_PRODUCT_ID,
    gameId: args.gameId,
    teamSignature: args.teamSignature,
    associations: args.associations.map((a) => ({ slotId: a.slotId, teamId: a.teamId })),
    updatedAt: args.updatedAt ?? new Date().toISOString(),
    optedIn: args.optedIn,
  }
}

export async function loadSonyBuzzMappingRecord(
  adapter: PersistenceAdapter,
): Promise<SonyBuzzMappingLoadOutcome> {
  const opened = await adapter.open()
  if (!opened.ok) return { status: 'unavailable', message: opened.message }

  let raw: unknown = undefined
  const txResult = await adapter.withTransaction([OBJECT_STORE_SONY_BUZZ_MAPPINGS], async (tx) => {
    raw = await tx.get(OBJECT_STORE_SONY_BUZZ_MAPPINGS, SONY_BUZZ_MAPPING_RECORD_KEY)
  })
  if (!txResult.ok) return { status: 'unavailable', message: txResult.message }
  if (raw === undefined || raw === null) return { status: 'absent' }

  if (typeof raw === 'object' && raw !== null) {
    const version = (raw as { mappingVersion?: unknown }).mappingVersion
    if (typeof version === 'number' && version !== SONY_BUZZ_MAPPING_VERSION) {
      return { status: 'unsupported-version' }
    }
  }

  const parsed = parseSonyBuzzMappingRecord(raw)
  if (!parsed) return { status: 'malformed' }
  return { status: 'loaded', record: parsed }
}

export async function saveSonyBuzzMappingRecord(
  adapter: PersistenceAdapter,
  record: SonyBuzzMappingRecord,
): Promise<PersistenceResult<void>> {
  const opened = await adapter.open()
  if (!opened.ok) return opened
  if (!parseSonyBuzzMappingRecord(record)) {
    return persistenceErr('invalid', 'Sony Buzz mapping record failed validation.')
  }
  return adapter.withTransaction([OBJECT_STORE_SONY_BUZZ_MAPPINGS], async (tx) => {
    await tx.put(OBJECT_STORE_SONY_BUZZ_MAPPINGS, SONY_BUZZ_MAPPING_RECORD_KEY, record)
  })
}

export async function clearSonyBuzzMappingRecord(
  adapter: PersistenceAdapter,
): Promise<PersistenceResult<void>> {
  const opened = await adapter.open()
  if (!opened.ok) return opened
  return adapter.withTransaction([OBJECT_STORE_SONY_BUZZ_MAPPINGS], async (tx) => {
    await tx.delete(OBJECT_STORE_SONY_BUZZ_MAPPINGS, SONY_BUZZ_MAPPING_RECORD_KEY)
  })
}

export function mappingMatchesContext(
  record: SonyBuzzMappingRecord,
  gameId: string,
  teamSignature: string,
  knownTeamIds: ReadonlySet<string>,
): boolean {
  if (record.gameId !== gameId) return false
  if (record.teamSignature !== teamSignature) return false
  for (const assoc of record.associations) {
    if (!knownTeamIds.has(assoc.teamId)) return false
  }
  return true
}

export { persistenceOk }
