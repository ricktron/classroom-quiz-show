import type { TeamDefinition } from '../game/teams/definition'
import type { TeamId } from '../game/ids'
import {
  EMPTY_GAMEPAD_MAPPING,
  validateGamepadMapping,
  type GamepadBinding,
  type GamepadMapping,
} from './gamepadMapping'
import {
  SONY_BUZZ_WIRELESS_PRODUCT_ID,
  SONY_USB_VENDOR_ID,
} from './gamepadDeviceProfile'
import { PRIMARY_BUZZ, type LocalInputAction } from './logicalAction'

/**
 * Exact CQS-owned supported profile for Namtai wireless Wbuzz (Slice 21).
 *
 * Hardware recipe lives HERE — not in IndexedDB. Persistence stores only
 * teacher team associations and profile identity metadata.
 */

export const SONY_BUZZ_SUPPORTED_PROFILE_ID = 'cqs.sony-buzz.namtai-wbuzz-wireless.v1'
export const SONY_BUZZ_SUPPORTED_PROFILE_VERSION = 1
export const SONY_BUZZ_MAPPING_VERSION = 1

/** Exact USB ids for the supported wireless receiver (numeric). */
export const SONY_BUZZ_SUPPORTED_VENDOR_ID = 0x054c
export const SONY_BUZZ_SUPPORTED_PRODUCT_ID = 0x1000

export const SONY_BUZZ_KEEPALIVE_REPORT_ID = 0
export const SONY_BUZZ_KEEPALIVE_BYTES = 7
export const SONY_BUZZ_KEEPALIVE_CADENCE_MS = 2000
/** Soft health age: recent successful send within this window → healthy. */
export const SONY_BUZZ_KEEPALIVE_HEALTH_AGE_MS = 6000

export const SONY_BUZZ_EXPECTED_BUTTON_COUNT = 20
export const SONY_BUZZ_EXPECTED_AXIS_COUNT = 2

export const SONY_BUZZ_HANDSET_SLOT_COUNT = 4

export type SonyBuzzColor = 'red' | 'yellow' | 'green' | 'orange' | 'blue'

export const SONY_BUZZ_COLORS: readonly SonyBuzzColor[] = [
  'red',
  'yellow',
  'green',
  'orange',
  'blue',
] as const

/** Color → offset within a five-button browser group. */
export const SONY_BUZZ_COLOR_OFFSET: Readonly<Record<SonyBuzzColor, number>> = {
  red: 0,
  yellow: 1,
  green: 2,
  orange: 3,
  blue: 4,
}

/**
 * Four handset *slots* (not physical handset numbers).
 * Bases: 0, 5, 10, 15. Slot 4 (15–19) is final RC owed until four-handset cert.
 */
export const SONY_BUZZ_SLOT_BASES: readonly number[] = [0, 5, 10, 15] as const

export type SonyBuzzSlotId = 1 | 2 | 3 | 4

export function sonyBuzzSlotId(index0: number): SonyBuzzSlotId | null {
  if (index0 < 0 || index0 >= SONY_BUZZ_HANDSET_SLOT_COUNT) return null
  return (index0 + 1) as SonyBuzzSlotId
}

export function buttonIndexForSlotColor(slot: SonyBuzzSlotId, color: SonyBuzzColor): number {
  return SONY_BUZZ_SLOT_BASES[slot - 1]! + SONY_BUZZ_COLOR_OFFSET[color]
}

export function actionForSonyBuzzColor(color: SonyBuzzColor): LocalInputAction {
  switch (color) {
    case 'red':
      return PRIMARY_BUZZ
    case 'blue':
      return { kind: 'secondary', slot: 'secondary1' }
    case 'orange':
      return { kind: 'secondary', slot: 'secondary2' }
    case 'green':
      return { kind: 'secondary', slot: 'secondary3' }
    case 'yellow':
      return { kind: 'secondary', slot: 'secondary4' }
  }
}

export function isExactSupportedWbuzzIds(vendorId: number, productId: number): boolean {
  return vendorId === SONY_BUZZ_SUPPORTED_VENDOR_ID && productId === SONY_BUZZ_SUPPORTED_PRODUCT_ID
}

/** Hex-token recognition for Gamepad reported ids (matches device-profile discipline). */
export function reportedIdLooksLikeSupportedWbuzz(reportedId: string): boolean {
  const tokens = new Set<string>()
  const pattern = /[0-9a-f]+/gi
  let match: RegExpExecArray | null
  while ((match = pattern.exec(reportedId)) !== null) {
    tokens.add(match[0].toLowerCase())
  }
  return tokens.has(SONY_USB_VENDOR_ID) && tokens.has(SONY_BUZZ_WIRELESS_PRODUCT_ID)
}

export interface SonyBuzzOutputFraming {
  readonly ok: true
  readonly reportId: number
  readonly byteLength: number
}

export interface SonyBuzzOutputFramingFailure {
  readonly ok: false
  readonly reason: string
}

export type SonyBuzzOutputFramingResult = SonyBuzzOutputFraming | SonyBuzzOutputFramingFailure

export interface SonyBuzzOutputReportCandidate {
  readonly reportId: number
  readonly totalBytes: number
}

/**
 * Fail-closed framing: exactly one output report, reportId 0, exactly 7 bytes.
 */
export function validateSupportedWbuzzOutputFraming(
  candidates: readonly SonyBuzzOutputReportCandidate[],
): SonyBuzzOutputFramingResult {
  if (candidates.length === 0) {
    return { ok: false, reason: 'No output reports exposed.' }
  }
  if (candidates.length !== 1) {
    return { ok: false, reason: `Expected exactly one output report; found ${candidates.length}.` }
  }
  const only = candidates[0]!
  if (only.reportId !== SONY_BUZZ_KEEPALIVE_REPORT_ID) {
    return { ok: false, reason: `Unexpected output reportId ${only.reportId}; expected 0.` }
  }
  if (only.totalBytes !== SONY_BUZZ_KEEPALIVE_BYTES) {
    return {
      ok: false,
      reason: `Unexpected output length ${only.totalBytes}; expected ${SONY_BUZZ_KEEPALIVE_BYTES}.`,
    }
  }
  return {
    ok: true,
    reportId: SONY_BUZZ_KEEPALIVE_REPORT_ID,
    byteLength: SONY_BUZZ_KEEPALIVE_BYTES,
  }
}

export function keepalivePayload(): Uint8Array {
  return new Uint8Array(SONY_BUZZ_KEEPALIVE_BYTES)
}

/**
 * Host-visible Gamepad topology gate.
 *
 * Button count is required. Axis *values* never cross the Gamepad boundary
 * (see gamepadSource); when an axis count is supplied (tests / future host
 * observation), it must match the physical Wbuzz expectation.
 */
export function matchesExpectedWbuzzGamepadTopology(
  buttonCount: number,
  axisCount?: number,
): boolean {
  if (buttonCount !== SONY_BUZZ_EXPECTED_BUTTON_COUNT) return false
  if (axisCount === undefined) return true
  return axisCount === SONY_BUZZ_EXPECTED_AXIS_COUNT
}

/** Stable signature of the current team set for fail-closed association. */
export function teamSetSignature(teams: readonly Pick<TeamDefinition, 'id'>[]): string {
  return [...teams.map((t) => t.id)].sort().join('\u001f')
}

export interface SonyBuzzSlotTeamAssociation {
  readonly slotId: SonyBuzzSlotId
  readonly teamId: TeamId | string
}

/**
 * Materialize session GamepadMapping from product recipe + associations + live index.
 * Never persists controllerIndex.
 */
export function materializeSupportedProfileMapping(args: {
  readonly controllerIndex: number
  readonly associations: readonly SonyBuzzSlotTeamAssociation[]
  readonly teams: readonly Pick<TeamDefinition, 'id'>[]
}): { ok: true; mapping: GamepadMapping } | { ok: false; reason: string } {
  const teamIds = new Set(args.teams.map((t) => t.id as string))
  if (args.controllerIndex < 0 || !Number.isInteger(args.controllerIndex)) {
    return { ok: false, reason: 'Invalid controller index.' }
  }
  const bindings: GamepadBinding[] = []
  for (const assoc of args.associations) {
    const teamKey = String(assoc.teamId)
    if (!teamIds.has(teamKey)) {
      return { ok: false, reason: `Unknown or stale team id for slot ${assoc.slotId}.` }
    }
    for (const color of SONY_BUZZ_COLORS) {
      bindings.push({
        controllerIndex: args.controllerIndex,
        buttonIndex: buttonIndexForSlotColor(assoc.slotId, color),
        teamId: assoc.teamId as TeamId,
        action: actionForSonyBuzzColor(color),
      })
    }
  }
  if (bindings.length === 0) {
    return { ok: true, mapping: EMPTY_GAMEPAD_MAPPING }
  }
  const mapping: GamepadMapping = { version: 1, bindings }
  const validated = validateGamepadMapping(mapping, args.teams as TeamDefinition[])
  if (!validated.ok) {
    return { ok: false, reason: validated.issues[0]?.message ?? 'Mapping validation failed.' }
  }
  return { ok: true, mapping: validated.mapping }
}

export const SONY_BUZZ_RC_OWED_NOTE =
  'Physical handset slot group 15–19 (slot 4) remains UNTESTED / FINAL RC OWED until four-handset certification on the exact candidate head.'
