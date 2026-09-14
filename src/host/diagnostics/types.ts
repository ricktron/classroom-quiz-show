/**
 * Allowlisted Host-private diagnostic snapshot (S04C-H2).
 *
 * Privacy rule: every field here is an explicit safe signal. Never spread
 * PrivateState, Game, Session, PublicState, import payloads, or hardware
 * objects into this shape.
 */

import type { CqsRuntime } from '../../runtime/cqsRuntime'
import type { AudioActivationStatus } from '../../audio/audioPlaybackController'
import type {
  PersistenceBootPhase,
  PersistenceDurabilityStatus,
  PersistenceLeadership,
} from '../useHostPersistence'
import type {
  SonyBuzzReceiverLayer,
  SonyBuzzTeacherSummary,
} from '../../input/sonyBuzzTeacherReadiness'

/** Bump only with a reviewed report-format change. */
export const DIAGNOSTIC_REPORT_FORMAT_VERSION = 1 as const

export type DiagnosticAvailability = 'available' | 'unavailable'

export type DiagnosticDisplayWindowStatus = 'open' | 'closed' | 'unknown'

export type DiagnosticRecoveryStatus = 'none' | 'valid' | 'invalid' | 'loading'

/** Honest bounded state when a Host signal has not been collected yet. */
export type DiagnosticNotCollected = 'not-collected'

export interface DiagnosticApplicationSection {
  readonly reportFormatVersion: typeof DIAGNOSTIC_REPORT_FORMAT_VERSION
  readonly appVersion: string
  readonly runtime: CqsRuntime
}

export interface DiagnosticEnvironmentSection {
  readonly platform: string
  readonly viewportWidth: number
  readonly viewportHeight: number
  readonly screenWidth: number
  readonly screenHeight: number
  readonly devicePixelRatio: number
  readonly displayWindow: DiagnosticDisplayWindowStatus
}

export interface DiagnosticInputSection {
  readonly sonySupportedProfileId: string
  readonly sonyReceiver: SonyBuzzReceiverLayer | DiagnosticNotCollected
  readonly sonyTeacherSummary: SonyBuzzTeacherSummary | DiagnosticNotCollected
  readonly controllersResponding: number | DiagnosticNotCollected
  readonly controllersAssigned: number | DiagnosticNotCollected
  readonly gamepadApi: DiagnosticAvailability
  readonly webHidApi: DiagnosticAvailability
  readonly keyboardFallback: 'available'
  readonly connectedGamepadCount: number | DiagnosticNotCollected
}

export interface DiagnosticPersistenceSection {
  readonly wireSchemaVersion: number
  readonly dbSchemaVersion: number
  readonly bootPhase: PersistenceBootPhase
  readonly durability: PersistenceDurabilityStatus
  readonly leadership: PersistenceLeadership
  readonly recovery: DiagnosticRecoveryStatus
}

export interface DiagnosticAudioSection {
  readonly activation: AudioActivationStatus
  readonly muted: boolean
}

/**
 * Typed diagnostic snapshot. Formatter input only — never a state dump.
 */
export interface DiagnosticSnapshot {
  readonly application: DiagnosticApplicationSection
  readonly environment: DiagnosticEnvironmentSection
  readonly input: DiagnosticInputSection
  readonly persistence: DiagnosticPersistenceSection
  readonly audio: DiagnosticAudioSection
}

/**
 * Explicit allowlisted builder input. Callers assemble known-safe fields;
 * the builder does not accept PrivateState or arbitrary objects.
 */
export interface DiagnosticSnapshotInput {
  readonly appVersion: string
  readonly runtime: CqsRuntime
  readonly platform: string
  readonly viewportWidth: number
  readonly viewportHeight: number
  readonly screenWidth: number
  readonly screenHeight: number
  readonly devicePixelRatio: number
  readonly displayWindow: DiagnosticDisplayWindowStatus
  readonly sonySupportedProfileId: string
  readonly sonyReceiver: SonyBuzzReceiverLayer | DiagnosticNotCollected
  readonly sonyTeacherSummary: SonyBuzzTeacherSummary | DiagnosticNotCollected
  readonly controllersResponding: number | DiagnosticNotCollected
  readonly controllersAssigned: number | DiagnosticNotCollected
  readonly gamepadApi: DiagnosticAvailability
  readonly webHidApi: DiagnosticAvailability
  readonly connectedGamepadCount: number | DiagnosticNotCollected
  readonly wireSchemaVersion: number
  readonly dbSchemaVersion: number
  readonly bootPhase: PersistenceBootPhase
  readonly durability: PersistenceDurabilityStatus
  readonly leadership: PersistenceLeadership
  readonly recovery: DiagnosticRecoveryStatus
  readonly audioActivation: AudioActivationStatus
  readonly audioMuted: boolean
}

/**
 * Optional Host-collected Sony/gamepad signals. Absent means not-collected.
 * Counts only — never device ids, labels, reports, or serials.
 */
export interface HostInputDiagnosticSignals {
  readonly sonyReceiver: SonyBuzzReceiverLayer
  readonly sonyTeacherSummary: SonyBuzzTeacherSummary
  readonly controllersResponding: number
  readonly controllersAssigned: number
  readonly connectedGamepadCount: number
}
