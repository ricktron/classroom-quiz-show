import { describe, expect, it } from 'vitest'
import { toPublicState } from '../../state/sanitize'
import { INITIAL_PRIVATE_STATE, type PrivateState } from '../../state/privateState'
import { buildDiagnosticSnapshot } from './buildDiagnosticSnapshot'
import { formatDiagnosticReport } from './formatDiagnosticReport'
import { CQS_APP_VERSION } from '../../runtime/appVersion'
import { SONY_BUZZ_SUPPORTED_PROFILE_ID } from '../../input/sonyBuzzSupportedProfile'
import { PERSISTENCE_DB_VERSION, PERSISTENCE_WIRE_VERSION } from '../../persistence/constants'

const HOSTILE = {
  student: 'STUDENT_SECRET_ALICE',
  className: 'CLASS_SECRET_PERIOD_3',
  question: 'QUESTION_SECRET_WHAT_IS_LAVA',
  answer: 'ANSWER_SECRET_MOLTEN_ROCK',
  team: 'TEAM_SECRET_RED_DRAGONS',
  note: 'TEACHER_NOTE_SECRET_give_hint',
} as const

function hostilePrivateState(): PrivateState {
  return {
    ...INITIAL_PRIVATE_STATE,
    revision: 2,
    session: {
      sessionId: 'sess-hostile',
      lifecycle: 'ready',
      counter: 1,
      publicStatusCode: 'session-ready',
      hostNotes: HOSTILE.note,
      game: null,
    },
    diagnostics: {
      lastAppliedEventType: 'HOST_NOTE_SET',
      appliedEventCount: 3,
    },
  }
}

describe('diagnostic report Host/Display privacy boundary', () => {
  it('keeps diagnostic report text out of PublicState', () => {
    const report = formatDiagnosticReport(
      buildDiagnosticSnapshot({
        appVersion: CQS_APP_VERSION,
        runtime: 'web',
        platform: 'TestOS',
        viewportWidth: 1024,
        viewportHeight: 768,
        screenWidth: 1024,
        screenHeight: 768,
        devicePixelRatio: 1,
        displayWindow: 'closed',
        sonySupportedProfileId: SONY_BUZZ_SUPPORTED_PROFILE_ID,
        sonyReceiver: 'not-collected',
        sonyTeacherSummary: 'not-collected',
        controllersResponding: 'not-collected',
        controllersAssigned: 'not-collected',
        gamepadApi: 'unavailable',
        webHidApi: 'unavailable',
        connectedGamepadCount: 'not-collected',
        wireSchemaVersion: PERSISTENCE_WIRE_VERSION,
        dbSchemaVersion: PERSISTENCE_DB_VERSION,
        bootPhase: 'ready',
        durability: 'idle',
        leadership: 'leader',
        recovery: 'none',
        audioActivation: 'inactive',
        audioMuted: true,
      }),
    )

    const projected = toPublicState(hostilePrivateState())
    const publicJson = JSON.stringify(projected)

    expect(publicJson).not.toContain('Diagnostic Report')
    expect(publicJson).not.toContain('reportFormatVersion')
    expect(publicJson).not.toContain(HOSTILE.note)
    expect(publicJson).not.toContain(HOSTILE.student)
    expect(report).not.toContain(HOSTILE.student)
    expect(report).not.toContain(HOSTILE.className)
    expect(report).not.toContain(HOSTILE.question)
    expect(report).not.toContain(HOSTILE.answer)
    expect(report).not.toContain(HOSTILE.team)
    expect(report).not.toContain(HOSTILE.note)
    expect(Object.keys(projected).sort()).toEqual(
      [
        'detail',
        'game',
        'headline',
        'phase',
        'response',
        'revision',
        'round',
        'schemaVersion',
        'teams',
      ].sort(),
    )
  })
})
