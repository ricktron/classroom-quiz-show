import type { DiagnosticSnapshot } from './types'

/**
 * Format a diagnostic snapshot as plain text for teacher copy/paste.
 *
 * Output is derived only from the typed snapshot — never from private state.
 */
export function formatDiagnosticReport(snapshot: DiagnosticSnapshot): string {
  const lines: string[] = [
    'Classroom Quiz Show — Diagnostic Report',
    'Host-private · local only · nothing is sent automatically',
    'This report excludes student names, class names, questions, answers, team names, filenames, and other classroom content.',
    '',
    '### Application',
    `reportFormatVersion: ${snapshot.application.reportFormatVersion}`,
    `appVersion: ${snapshot.application.appVersion}`,
    `runtime: ${snapshot.application.runtime}`,
    '',
    '### Environment',
    `platform: ${snapshot.environment.platform}`,
    `viewport: ${snapshot.environment.viewportWidth}x${snapshot.environment.viewportHeight}`,
    `screen: ${snapshot.environment.screenWidth}x${snapshot.environment.screenHeight}`,
    `devicePixelRatio: ${formatNumber(snapshot.environment.devicePixelRatio)}`,
    `displayWindow: ${snapshot.environment.displayWindow}`,
    '',
    '### Input / Sony',
    `sonySupportedProfileId: ${snapshot.input.sonySupportedProfileId}`,
    `sonyReceiver: ${snapshot.input.sonyReceiver}`,
    `sonyTeacherSummary: ${snapshot.input.sonyTeacherSummary}`,
    `controllersResponding: ${formatMaybeCount(snapshot.input.controllersResponding)}`,
    `controllersAssigned: ${formatMaybeCount(snapshot.input.controllersAssigned)}`,
    `connectedGamepadCount: ${formatMaybeCount(snapshot.input.connectedGamepadCount)}`,
    `gamepadApi: ${snapshot.input.gamepadApi}`,
    `hidApi: ${snapshot.input.webHidApi}`,
    `keyboardFallback: ${snapshot.input.keyboardFallback}`,
    '',
    '### Persistence / recovery',
    `wireSchemaVersion: ${snapshot.persistence.wireSchemaVersion}`,
    `dbSchemaVersion: ${snapshot.persistence.dbSchemaVersion}`,
    `bootPhase: ${snapshot.persistence.bootPhase}`,
    `durability: ${snapshot.persistence.durability}`,
    `leadership: ${snapshot.persistence.leadership}`,
    `recovery: ${snapshot.persistence.recovery}`,
    '',
    '### Audio',
    `activation: ${snapshot.audio.activation}`,
    `muted: ${snapshot.audio.muted ? 'yes' : 'no'}`,
    '',
  ]

  return lines.join('\n')
}

function formatNumber(value: number): string {
  if (!Number.isFinite(value)) return 'unknown'
  return String(value)
}

function formatMaybeCount(value: number | 'not-collected'): string {
  if (value === 'not-collected') return 'not-collected'
  if (!Number.isFinite(value) || value < 0) return 'unknown'
  return String(Math.trunc(value))
}
