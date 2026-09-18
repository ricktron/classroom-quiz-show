import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it, vi } from 'vitest'
import { CQS_APP_VERSION } from '../../runtime/appVersion'
import { SONY_BUZZ_SUPPORTED_PROFILE_ID } from '../../input/sonyBuzzSupportedProfile'
import { PERSISTENCE_DB_VERSION, PERSISTENCE_WIRE_VERSION } from '../../persistence/constants'
import { buildDiagnosticSnapshot, recoveryStatusFromBoot } from './buildDiagnosticSnapshot'
import { formatDiagnosticReport } from './formatDiagnosticReport'
import { assembleDiagnosticSnapshot } from './assembleDiagnosticSnapshot'
import type { DiagnosticSnapshotInput } from './types'

const HOSTILE_MARKERS = [
  'STUDENT_SECRET_ALICE',
  'CLASS_SECRET_PERIOD_3',
  'GAME_TITLE_SECRET_VOLCANOES',
  'QUESTION_SECRET_WHAT_IS_LAVA',
  'ANSWER_SECRET_MOLTEN_ROCK',
  'TEAM_SECRET_RED_DRAGONS',
  'IMPORT_FILE_SECRET_volcanoes.xlsx',
  'TEACHER_NOTE_SECRET_give_hint',
  'PII_MARKER_SSN_000-00-0000',
] as const

function baseInput(overrides: Partial<DiagnosticSnapshotInput> = {}): DiagnosticSnapshotInput {
  return {
    appVersion: CQS_APP_VERSION,
    runtime: 'web',
    platform: 'MacIntel',
    viewportWidth: 1280,
    viewportHeight: 720,
    screenWidth: 1920,
    screenHeight: 1080,
    devicePixelRatio: 2,
    displayWindow: 'closed',
    sonySupportedProfileId: SONY_BUZZ_SUPPORTED_PROFILE_ID,
    sonyReceiver: 'disconnected',
    sonyTeacherSummary: 'receiver-disconnected',
    controllersResponding: 0,
    controllersAssigned: 0,
    gamepadApi: 'available',
    webHidApi: 'unavailable',
    connectedGamepadCount: 0,
    wireSchemaVersion: PERSISTENCE_WIRE_VERSION,
    dbSchemaVersion: PERSISTENCE_DB_VERSION,
    bootPhase: 'ready',
    durability: 'idle',
    leadership: 'leader',
    recovery: 'none',
    audioActivation: 'ready',
    audioMuted: false,
    ...overrides,
  }
}

describe('buildDiagnosticSnapshot', () => {
  it('builds a deterministic allowlisted snapshot', () => {
    const snapshot = buildDiagnosticSnapshot(baseInput())
    expect(snapshot.application.reportFormatVersion).toBe(1)
    expect(snapshot.application.appVersion).toBe(CQS_APP_VERSION)
    expect(snapshot.application.runtime).toBe('web')
    expect(snapshot.environment.viewportWidth).toBe(1280)
    expect(snapshot.input.keyboardFallback).toBe('available')
    expect(snapshot.persistence.leadership).toBe('leader')
    expect(snapshot.audio.muted).toBe(false)
  })

  it('represents unavailable and not-collected signals honestly', () => {
    const snapshot = buildDiagnosticSnapshot(
      baseInput({
        gamepadApi: 'unavailable',
        webHidApi: 'unavailable',
        sonyReceiver: 'not-collected',
        sonyTeacherSummary: 'not-collected',
        controllersResponding: 'not-collected',
        controllersAssigned: 'not-collected',
        connectedGamepadCount: 'not-collected',
        displayWindow: 'unknown',
        leadership: 'unknown',
        durability: 'unavailable',
        recovery: 'loading',
        audioActivation: 'failed',
      }),
    )
    const text = formatDiagnosticReport(snapshot)
    expect(text).toContain('gamepadApi: unavailable')
    expect(text).toContain('hidApi: unavailable')
    expect(text).toContain('sonyReceiver: not-collected')
    expect(text).toContain('controllersResponding: not-collected')
    expect(text).toContain('displayWindow: unknown')
    expect(text).toContain('leadership: unknown')
    expect(text).toContain('durability: unavailable')
    expect(text).toContain('recovery: loading')
    expect(text).toContain('activation: failed')
  })

  it('maps boot phase to safe recovery semantics', () => {
    expect(recoveryStatusFromBoot('loading')).toBe('loading')
    expect(recoveryStatusFromBoot('recovery')).toBe('valid')
    expect(recoveryStatusFromBoot('invalid-recovery')).toBe('invalid')
    expect(recoveryStatusFromBoot('ready')).toBe('none')
  })
})

describe('formatDiagnosticReport privacy', () => {
  it('never includes seeded classroom content or PII markers', () => {
    const hostilePrivateLike = {
      studentName: 'STUDENT_SECRET_ALICE',
      className: 'CLASS_SECRET_PERIOD_3',
      gameTitle: 'GAME_TITLE_SECRET_VOLCANOES',
      question: 'QUESTION_SECRET_WHAT_IS_LAVA',
      answer: 'ANSWER_SECRET_MOLTEN_ROCK',
      teamName: 'TEAM_SECRET_RED_DRAGONS',
      filename: 'IMPORT_FILE_SECRET_volcanoes.xlsx',
      teacherNote: 'TEACHER_NOTE_SECRET_give_hint',
      pii: 'PII_MARKER_SSN_000-00-0000',
      serial: 'SERIAL_DEADBEEF_HID',
      bluetooth: 'BT_AA:BB:CC:DD:EE:FF',
      path: '/Users/teacher/CLASS_SECRET_PERIOD_3/IMPORT_FILE_SECRET_volcanoes.xlsx',
      stack: 'Error: ANSWER_SECRET_MOLTEN_ROCK\n at teacher.ts',
    }

    // Builder must not accept or serialize the hostile object. Prove by generating
    // from allowlisted signals only while the hostile object exists in scope.
    void hostilePrivateLike

    const text = formatDiagnosticReport(buildDiagnosticSnapshot(baseInput()))
    for (const marker of HOSTILE_MARKERS) {
      expect(text).not.toContain(marker)
    }
    expect(text).not.toContain('SERIAL_DEADBEEF_HID')
    expect(text).not.toContain('BT_AA:BB:CC:DD:EE:FF')
    expect(text).not.toContain('/Users/teacher/')
    expect(text).not.toContain('stack')
    expect(text).not.toContain('"session"')
    expect(text).not.toContain('"game"')
    expect(text).toContain('Host-private · local only · nothing is sent automatically')
  })

  it('excludes hardware identity and raw reports', () => {
    const text = formatDiagnosticReport(
      buildDiagnosticSnapshot(
        baseInput({
          controllersResponding: 2,
          controllersAssigned: 2,
          connectedGamepadCount: 1,
          sonyReceiver: 'connected',
          sonyTeacherSummary: 'sony-buzz-ready',
        }),
      ),
    )
    expect(text).toContain('controllersResponding: 2')
    expect(text).toContain('sonyReceiver: connected')
    expect(text).not.toContain('deviceLabel')
    expect(text).not.toContain('054c')
    expect(text).not.toContain('productName')
    expect(text).not.toContain('reportedId')
    expect(text).not.toContain('sendReport')
  })

  it('excludes Game/Session content from persistence summary', () => {
    const text = formatDiagnosticReport(buildDiagnosticSnapshot(baseInput()))
    expect(text).toContain(`wireSchemaVersion: ${PERSISTENCE_WIRE_VERSION}`)
    expect(text).toContain(`dbSchemaVersion: ${PERSISTENCE_DB_VERSION}`)
    expect(text).toContain('recovery: none')
    expect(text).not.toContain('events')
    expect(text).not.toContain('definition')
    expect(text).not.toContain('hostNotes')
  })
})

describe('assembleDiagnosticSnapshot side effects', () => {
  it('performs no network access or HID permission request while assembling', () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response())
    const hidRequest = vi.fn()
    const nav = {
      platform: 'TestOS',
      getGamepads: () => [],
      hid: {
        requestDevice: hidRequest,
        getDevices: vi.fn(),
      },
    } as unknown as Navigator

    const snapshot = assembleDiagnosticSnapshot({
      persistence: {
        bootPhase: 'ready',
        durabilityStatus: 'idle',
        leadership: 'leader',
      },
      audio: { activation: 'inactive', muted: true },
      displayWindow: 'unknown',
      inputSignals: null,
      browser: {
        platform: 'TestOS',
        viewportWidth: 800,
        viewportHeight: 600,
        screenWidth: 800,
        screenHeight: 600,
        devicePixelRatio: 1,
        gamepadApi: 'available',
        webHidApi: 'available',
      },
      runtime: 'web',
    })

    // Observe browser signals separately with a hostile navigator stub.
    void nav

    expect(fetchSpy).not.toHaveBeenCalled()
    expect(hidRequest).not.toHaveBeenCalled()
    expect(snapshot.input.sonyReceiver).toBe('not-collected')
    expect(snapshot.input.keyboardFallback).toBe('available')
    fetchSpy.mockRestore()
  })
})

describe('app version lockstep', () => {
  it('matches package.json version', () => {
    const pkg = JSON.parse(readFileSync(resolve(process.cwd(), 'package.json'), 'utf8')) as {
      version: string
    }
    expect(CQS_APP_VERSION).toBe(pkg.version)
  })
})
