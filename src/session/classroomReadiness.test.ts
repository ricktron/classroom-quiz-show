import { describe, expect, it } from 'vitest'
import {
  canStartPlay,
  classSetupBuzzerTaskCopy,
  classSetupClaimsControllersResponding,
  classroomReadinessItems,
  compactReadinessItems,
  currentTaskTitle,
  displayFactLabel,
  dominantSetupTask,
  optionalSetupChore,
  playBlockerExplanation,
  soundFactLabel,
  unresolvedOptionalFacts,
} from './classroomReadiness'
import {
  classifyTeacherSummaryFromHardware,
  classSetupSonyBuzzFullyReady,
  teacherSummaryLabel,
} from '../input/sonyBuzzTeacherReadiness'

const ready = {
  teamCount: 4,
  namesAssigned: true,
  namesUnique: true,
  sonyReady: true,
  keyboardFallbackAvailable: true,
  displayOpen: true,
  audioUnderstood: true,
  audioMuted: false,
}

describe('classroom readiness', () => {
  it('gates Play on teams and unique names, not on Sony or Display', () => {
    expect(canStartPlay(ready)).toBe(true)
    expect(
      canStartPlay({
        ...ready,
        sonyReady: false,
        displayOpen: false,
        audioUnderstood: false,
      }),
    ).toBe(true)
    expect(canStartPlay({ ...ready, namesAssigned: false })).toBe(false)
    // Authored/default Game names are display fallbacks only. Callers must
    // pass namesAssigned only after an actual Session selection or manual claim.
    expect(
      classroomReadinessItems({ ...ready, namesAssigned: false }).find((item) => item.id === 'names')
        ?.label,
    ).toMatch(/still needed/i)
    expect(canStartPlay({ ...ready, namesUnique: false })).toBe(false)
    expect(canStartPlay({ ...ready, teamCount: 0 })).toBe(false)
    expect(canStartPlay({ ...ready, teamCount: 9 })).toBe(false)
  })

  it('keeps Sony optional when the keyboard fallback is available', () => {
    const items = classroomReadinessItems({ ...ready, sonyReady: false })
    expect(items.find((item) => item.id === 'sony')?.tone).toBe('optional')
    expect(items.find((item) => item.id === 'sony')?.label).toMatch(/buzzers optional/i)
    expect(items.find((item) => item.id === 'sony')?.detail).toMatch(/keyboard/i)
  })

  it('never treats missing buzzers as a Play blocker', () => {
    expect(
      playBlockerExplanation({
        ...ready,
        sonyReady: false,
        displayOpen: false,
        audioUnderstood: false,
      }),
    ).toBeNull()
    expect(canStartPlay({ ...ready, sonyReady: false })).toBe(true)
  })

  it('explains the actual required Play blocker', () => {
    expect(
      playBlockerExplanation({
        ...ready,
        namesAssigned: false,
        unnamedTeamLabels: ['Team 3'],
      }),
    ).toBe('Team 3 still needs a name.')
    expect(
      playBlockerExplanation({
        ...ready,
        namesAssigned: false,
        unnamedTeamLabels: ['Team 2', 'Team 3'],
      }),
    ).toBe('Team 2 and Team 3 still need names.')
    expect(playBlockerExplanation({ ...ready, namesUnique: false })).toBe(
      'Each team needs a different name.',
    )
  })

  it('makes names the dominant task until required identity is complete', () => {
    expect(dominantSetupTask({ ...ready, namesAssigned: false })).toBe('names')
    expect(currentTaskTitle('names')).toMatch(/choose team names/i)
    const compact = compactReadinessItems({
      ...ready,
      namesAssigned: false,
      sonyReady: false,
      displayOpen: false,
      unnamedTeamLabels: ['Team 1', 'Team 2', 'Team 3', 'Team 4'],
    })
    expect(compact.find((item) => item.id === 'names')?.status).toBe('needs-attention')
    expect(compact.find((item) => item.id === 'names')?.statusWord).toMatch(/needs attention/i)
    expect(compact.find((item) => item.id === 'buzzers')?.status).toBe('optional')
    expect(compact.find((item) => item.id === 'display')?.status).toBe('optional')
    expect(compact.find((item) => item.id === 'buzzers')?.statusWord).not.toMatch(/needs attention/i)
    expect(compact.find((item) => item.id === 'display')?.statusWord).not.toMatch(/needs attention/i)
  })

  it('returns Ready (play) when required met even if optionals unresolved', () => {
    expect(
      dominantSetupTask({
        ...ready,
        sonyReady: false,
        displayOpen: false,
        audioUnderstood: false,
        buzzerSkipped: false,
      }),
    ).toBe('play')
    expect(dominantSetupTask({ ...ready, sonyReady: false, buzzerSkipped: true, displayOpen: false })).toBe(
      'play',
    )
    expect(
      compactReadinessItems({ ...ready, sonyReady: false, buzzerSkipped: true }).find(
        (item) => item.id === 'buzzers',
      )?.status,
    ).toBe('skipped')
    expect(optionalSetupChore({ ...ready, sonyReady: false, displayOpen: false })).toBe('buzzers')
    expect(
      optionalSetupChore({
        ...ready,
        sonyReady: false,
        buzzerSkipped: true,
        displayOpen: false,
      }),
    ).toBe('display')
  })

  it('keeps receiver-ready, controller-ready, and class-ready as separate layers', () => {
    expect(canStartPlay({ ...ready, sonyReady: false })).toBe(true)
    expect(dominantSetupTask({ ...ready, sonyReady: false })).toBe('play')
    expect(dominantSetupTask(ready)).toBe('play')
    expect(playBlockerExplanation({ ...ready, sonyReady: false })).toBeNull()
  })

  it('uses window open / sound fact vocabulary — never Display ready or Sound is ready', () => {
    expect(displayFactLabel({ displayOpen: true })).toMatch(/window open/i)
    expect(displayFactLabel({ displayOpen: false })).toMatch(/window not open/i)
    expect(soundFactLabel({ audioUnderstood: false, audioMuted: false })).toMatch(/not tested/i)
    expect(soundFactLabel({ audioUnderstood: true, audioMuted: false })).toMatch(/tested/i)
    expect(soundFactLabel({ audioUnderstood: false, audioMuted: true })).toMatch(/muted/i)

    const closed = classroomReadinessItems({ ...ready, displayOpen: false, audioUnderstood: false })
    expect(closed.find((item) => item.id === 'display')?.label).not.toMatch(/display ready/i)
    expect(closed.find((item) => item.id === 'display')?.label).toMatch(/window not open/i)
    expect(closed.find((item) => item.id === 'audio')?.label).toMatch(/not tested/i)

    const open = classroomReadinessItems(ready)
    expect(open.find((item) => item.id === 'display')?.label).not.toMatch(/display ready/i)
    expect(open.find((item) => item.id === 'display')?.label).toMatch(/window open/i)
    expect(JSON.stringify(open)).not.toMatch(/Display ready|Sound is ready/i)

    const compact = compactReadinessItems({
      ...ready,
      displayOpen: false,
      audioUnderstood: false,
      sonyReady: false,
    })
    expect(compact.find((item) => item.id === 'display')?.detail).toMatch(/window not open/i)
    expect(compact.find((item) => item.id === 'sound')?.detail).toMatch(/not tested/i)
    expect(compact.every((item) => item.status !== ('current' as never))).toBe(true)
  })

  it('lists unresolved optional facts without revoking Ready', () => {
    const input = {
      ...ready,
      sonyReady: false,
      displayOpen: false,
      audioUnderstood: false,
      buzzerSkipped: false,
    }
    expect(canStartPlay(input)).toBe(true)
    expect(dominantSetupTask(input)).toBe('play')
    const facts = unresolvedOptionalFacts(input)
    expect(facts.join(' ')).toMatch(/buzzers/i)
    expect(facts.join(' ')).toMatch(/display/i)
    expect(facts.join(' ')).toMatch(/sound/i)
    expect(unresolvedOptionalFacts({ ...input, buzzerSkipped: true }).join(' ')).toMatch(/skipped/i)
  })

  it('H9 Ready optional matrix: every buzzer × display × sound cell keeps canStartPlay', () => {
    type BuzzerCell = 'absent' | 'present' | 'skipped'
    type DisplayCell = 'closed' | 'open'
    type SoundCell = 'untested' | 'tested' | 'muted'
    const buzzers: readonly BuzzerCell[] = ['absent', 'present', 'skipped']
    const displays: readonly DisplayCell[] = ['closed', 'open']
    const sounds: readonly SoundCell[] = ['untested', 'tested', 'muted']

    for (const buzzer of buzzers) {
      for (const display of displays) {
        for (const sound of sounds) {
          const input = {
            ...ready,
            sonyReady: buzzer === 'present',
            buzzerSkipped: buzzer === 'skipped',
            displayOpen: display === 'open',
            audioUnderstood: sound === 'tested',
            audioMuted: sound === 'muted',
          }
          const cell = `${buzzer}/${display}/${sound}`
          expect(canStartPlay(input), cell).toBe(true)
          expect(dominantSetupTask(input), cell).toBe('play')
          expect(playBlockerExplanation(input), cell).toBeNull()
          const facts = unresolvedOptionalFacts(input).join(' ').toLowerCase()
          if (buzzer === 'absent') expect(facts, cell).toMatch(/buzzers/)
          if (buzzer === 'skipped') expect(facts, cell).toMatch(/skipped/)
          if (display === 'closed') expect(facts, cell).toMatch(/display|window/)
          if (sound === 'untested') expect(facts, cell).toMatch(/sound/)
          const soundLabel = soundFactLabel(input)
          const displayLabel = displayFactLabel(input)
          expect(soundLabel, cell).not.toMatch(/sound is ready/i)
          expect(displayLabel, cell).not.toMatch(/display ready/i)
          expect(soundLabel, cell).toMatch(
            sound === 'muted' ? /muted/i : sound === 'tested' ? /tested/i : /not tested/i,
          )
          expect(displayLabel, cell).toMatch(display === 'open' ? /open/i : /not open/i)
        }
      }
    }
  })

  it('ignores focusOverride for Ready / status (expansion is UI-only)', () => {
    expect(
      dominantSetupTask({
        ...ready,
        namesAssigned: false,
        focusOverride: 'display',
      }),
    ).toBe('names')
    expect(
      dominantSetupTask({
        ...ready,
        sonyReady: false,
        displayOpen: false,
        focusOverride: 'sound',
      }),
    ).toBe('play')
    expect(
      compactReadinessItems({
        ...ready,
        namesAssigned: false,
        sonyReady: false,
        focusOverride: 'buzzers',
        unnamedTeamLabels: ['Team 1'],
      }).find((item) => item.id === 'buzzers')?.status,
    ).toBe('optional')
  })
})

describe('H6 honest Class Setup Sony readiness (UX-R1)', () => {
  const base = {
    teamCount: 4,
    namesAssigned: true,
    namesUnique: true,
    keyboardFallbackAvailable: true,
    displayOpen: true,
    audioUnderstood: true,
    audioMuted: false,
  }

  it('does not classify buzzers ready or responding for receiver + defaults only', () => {
    const summary = classifyTeacherSummaryFromHardware({
      health: 'healthy',
      respondingSlotCount: 0,
      mappingStatus: 'absent',
      associationCount: 4,
    })
    const input = {
      ...base,
      sonyReady: classSetupSonyBuzzFullyReady(summary),
      sonyTeacherSummary: summary,
    }
    expect(input.sonyReady).toBe(false)
    expect(classSetupClaimsControllersResponding(input)).toBe(false)
    const sony = classroomReadinessItems(input).find((item) => item.id === 'sony')
    expect(sony?.tone).toBe('optional')
    expect(sony?.detail.toLowerCase()).not.toMatch(/buzzers ready/)
    expect(sony?.detail.toLowerCase()).not.toMatch(/buzzers responding/)
    expect(compactReadinessItems(input).find((item) => item.id === 'buzzers')?.status).not.toBe(
      'complete',
    )
    expect(canStartPlay(input)).toBe(true)
  })

  it('may represent responding without claiming fully ready when mapping is unfinished', () => {
    const summary = classifyTeacherSummaryFromHardware({
      health: 'healthy',
      respondingSlotCount: 3,
      mappingStatus: 'absent',
      associationCount: 4,
    })
    const input = {
      ...base,
      sonyReady: classSetupSonyBuzzFullyReady(summary),
      sonyTeacherSummary: summary,
    }
    expect(input.sonyReady).toBe(false)
    expect(classSetupClaimsControllersResponding(input)).toBe(true)
    expect(classroomReadinessItems(input).find((item) => item.id === 'sony')?.detail).toMatch(
      /finish team setup/i,
    )
    expect(compactReadinessItems(input).find((item) => item.id === 'buzzers')?.status).not.toBe(
      'complete',
    )
    expect(classSetupBuzzerTaskCopy(input)).not.toMatch(/Buzzers are ready/i)
  })

  it('may report buzzers ready only for the fully verified teacher summary', () => {
    const summary = classifyTeacherSummaryFromHardware({
      health: 'healthy',
      respondingSlotCount: 4,
      mappingStatus: 'ready',
      associationCount: 4,
    })
    const input = {
      ...base,
      sonyReady: classSetupSonyBuzzFullyReady(summary),
      sonyTeacherSummary: summary,
    }
    expect(input.sonyReady).toBe(true)
    expect(classSetupClaimsControllersResponding(input)).toBe(true)
    expect(classroomReadinessItems(input).find((item) => item.id === 'sony')?.tone).toBe('ready')
    expect(compactReadinessItems(input).find((item) => item.id === 'buzzers')?.status).toBe(
      'complete',
    )
    expect(classSetupBuzzerTaskCopy(input)).toMatch(/Buzzers are ready/i)
  })

  it('keeps Class Setup summary consistent with detailed Sony teacher-summary labels', () => {
    const summaries = [
      classifyTeacherSummaryFromHardware({
        health: 'healthy',
        respondingSlotCount: 0,
        mappingStatus: 'absent',
        associationCount: 4,
      }),
      classifyTeacherSummaryFromHardware({
        health: 'healthy',
        respondingSlotCount: 2,
        mappingStatus: 'absent',
        associationCount: 4,
      }),
      classifyTeacherSummaryFromHardware({
        health: 'healthy',
        respondingSlotCount: 4,
        mappingStatus: 'ready',
        associationCount: 4,
      }),
    ] as const
    for (const summary of summaries) {
      const detail = classroomReadinessItems({
        ...base,
        sonyReady: classSetupSonyBuzzFullyReady(summary),
        sonyTeacherSummary: summary,
      }).find((item) => item.id === 'sony')?.detail
      expect(detail).toContain(teacherSummaryLabel(summary).replace(/\.$/, ''))
    }
  })

  it('keeps skipped/unavailable Sony from being labeled hardware-ready while Play stays valid', () => {
    const skipped = {
      ...base,
      sonyReady: false,
      sonyTeacherSummary: 'receiver-disconnected' as const,
      buzzerSkipped: true,
    }
    expect(canStartPlay(skipped)).toBe(true)
    expect(playBlockerExplanation(skipped)).toBeNull()
    expect(compactReadinessItems(skipped).find((item) => item.id === 'buzzers')?.status).toBe(
      'skipped',
    )
    expect(classroomReadinessItems(skipped).find((item) => item.id === 'sony')?.tone).not.toBe(
      'ready',
    )
    expect(classSetupClaimsControllersResponding(skipped)).toBe(false)
  })

  it('never fabricates handset response from transport health alone', () => {
    for (const health of ['healthy', 'degraded'] as const) {
      const summary = classifyTeacherSummaryFromHardware({
        health,
        respondingSlotCount: 0,
        mappingStatus: 'ready',
        associationCount: 4,
      })
      expect(classSetupSonyBuzzFullyReady(summary)).toBe(false)
      expect(
        classSetupClaimsControllersResponding({
          ...base,
          sonyReady: false,
          sonyTeacherSummary: summary,
        }),
      ).toBe(false)
    }
  })
})
