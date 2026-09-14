import { CQS_APP_VERSION } from '../../runtime/appVersion'
import { cqsRuntime } from '../../runtime/cqsRuntime'
import { PERSISTENCE_DB_VERSION, PERSISTENCE_WIRE_VERSION } from '../../persistence/constants'
import { SONY_BUZZ_SUPPORTED_PROFILE_ID } from '../../input/sonyBuzzSupportedProfile'
import type { UseHostPersistence } from '../useHostPersistence'
import type { AudioPlaybackStatus } from '../../audio/audioPlaybackController'
import { buildDiagnosticSnapshot, recoveryStatusFromBoot } from './buildDiagnosticSnapshot'
import { observeBrowserDiagnosticSignals, displayWindowStatus } from './observeBrowserSignals'
import type {
  DiagnosticDisplayWindowStatus,
  DiagnosticSnapshot,
  HostInputDiagnosticSignals,
} from './types'

export interface AssembleDiagnosticSnapshotArgs {
  readonly persistence: Pick<
    UseHostPersistence,
    'bootPhase' | 'durabilityStatus' | 'leadership'
  >
  readonly audio: Pick<AudioPlaybackStatus, 'activation' | 'muted'>
  readonly displayWindow?: DiagnosticDisplayWindowStatus
  readonly displayWindowHandle?: Window | null
  readonly inputSignals?: HostInputDiagnosticSignals | null
  readonly browser?: ReturnType<typeof observeBrowserDiagnosticSignals>
  readonly runtime?: ReturnType<typeof cqsRuntime>
  readonly appVersion?: string
}

/**
 * Assemble the allowlisted snapshot from Host-known signals + non-interactive
 * browser observations. Does not touch PrivateState, Game, or Session content.
 */
export function assembleDiagnosticSnapshot(
  args: AssembleDiagnosticSnapshotArgs,
): DiagnosticSnapshot {
  const browser = args.browser ?? observeBrowserDiagnosticSignals()
  const input = args.inputSignals ?? null
  const displayWindow =
    args.displayWindow ?? displayWindowStatus(args.displayWindowHandle)

  return buildDiagnosticSnapshot({
    appVersion: args.appVersion ?? CQS_APP_VERSION,
    runtime: args.runtime ?? cqsRuntime(),
    platform: browser.platform,
    viewportWidth: browser.viewportWidth,
    viewportHeight: browser.viewportHeight,
    screenWidth: browser.screenWidth,
    screenHeight: browser.screenHeight,
    devicePixelRatio: browser.devicePixelRatio,
    displayWindow,
    sonySupportedProfileId: SONY_BUZZ_SUPPORTED_PROFILE_ID,
    sonyReceiver: input?.sonyReceiver ?? 'not-collected',
    sonyTeacherSummary: input?.sonyTeacherSummary ?? 'not-collected',
    controllersResponding: input?.controllersResponding ?? 'not-collected',
    controllersAssigned: input?.controllersAssigned ?? 'not-collected',
    gamepadApi: browser.gamepadApi,
    webHidApi: browser.webHidApi,
    connectedGamepadCount: input?.connectedGamepadCount ?? 'not-collected',
    wireSchemaVersion: PERSISTENCE_WIRE_VERSION,
    dbSchemaVersion: PERSISTENCE_DB_VERSION,
    bootPhase: args.persistence.bootPhase,
    durability: args.persistence.durabilityStatus,
    leadership: args.persistence.leadership,
    recovery: recoveryStatusFromBoot(args.persistence.bootPhase),
    audioActivation: args.audio.activation,
    audioMuted: args.audio.muted,
  })
}
