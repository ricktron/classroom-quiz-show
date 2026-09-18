import {
  DIAGNOSTIC_REPORT_FORMAT_VERSION,
  type DiagnosticSnapshot,
  type DiagnosticSnapshotInput,
} from './types'

/**
 * Build a typed diagnostic snapshot from an explicit allowlist of safe signals.
 *
 * Forbidden: JSON.stringify(privateState), object spreads from Game/Session/
 * hardware handles, or any content-bearing field.
 */
export function buildDiagnosticSnapshot(input: DiagnosticSnapshotInput): DiagnosticSnapshot {
  return {
    application: {
      reportFormatVersion: DIAGNOSTIC_REPORT_FORMAT_VERSION,
      appVersion: input.appVersion,
      runtime: input.runtime,
    },
    environment: {
      platform: input.platform,
      viewportWidth: input.viewportWidth,
      viewportHeight: input.viewportHeight,
      screenWidth: input.screenWidth,
      screenHeight: input.screenHeight,
      devicePixelRatio: input.devicePixelRatio,
      displayWindow: input.displayWindow,
    },
    input: {
      sonySupportedProfileId: input.sonySupportedProfileId,
      sonyReceiver: input.sonyReceiver,
      sonyTeacherSummary: input.sonyTeacherSummary,
      controllersResponding: input.controllersResponding,
      controllersAssigned: input.controllersAssigned,
      gamepadApi: input.gamepadApi,
      webHidApi: input.webHidApi,
      keyboardFallback: 'available',
      connectedGamepadCount: input.connectedGamepadCount,
    },
    persistence: {
      wireSchemaVersion: input.wireSchemaVersion,
      dbSchemaVersion: input.dbSchemaVersion,
      bootPhase: input.bootPhase,
      durability: input.durability,
      leadership: input.leadership,
      recovery: input.recovery,
    },
    audio: {
      activation: input.audioActivation,
      muted: input.audioMuted,
    },
  }
}

export function recoveryStatusFromBoot(
  bootPhase: DiagnosticSnapshotInput['bootPhase'],
): DiagnosticSnapshotInput['recovery'] {
  switch (bootPhase) {
    case 'loading':
      return 'loading'
    case 'recovery':
      return 'valid'
    case 'invalid-recovery':
      return 'invalid'
    case 'ready':
      return 'none'
  }
}
