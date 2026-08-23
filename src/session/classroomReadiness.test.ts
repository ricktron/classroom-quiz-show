import { describe, expect, it } from 'vitest'
import {
  canStartPlay,
  classroomReadinessItems,
  compactReadinessItems,
  currentTaskTitle,
  dominantSetupTask,
  playBlockerExplanation,
} from './classroomReadiness'

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
    })
    expect(compact.find((item) => item.id === 'names')?.status).toBe('current')
    expect(compact.find((item) => item.id === 'buzzers')?.status).toBe('optional')
    expect(compact.find((item) => item.id === 'display')?.status).toBe('optional')
  })

  it('treats buzzers as optional current work after names, never as class-ready', () => {
    expect(dominantSetupTask({ ...ready, sonyReady: false, displayOpen: false })).toBe('buzzers')
    expect(dominantSetupTask({ ...ready, sonyReady: false, buzzerSkipped: true })).toBe('play')
    expect(
      compactReadinessItems({ ...ready, sonyReady: false, buzzerSkipped: true }).find(
        (item) => item.id === 'buzzers',
      )?.status,
    ).toBe('skipped')
  })

  it('keeps receiver-ready, controller-ready, and class-ready as separate layers', () => {
    expect(canStartPlay({ ...ready, sonyReady: false })).toBe(true)
    expect(dominantSetupTask({ ...ready, sonyReady: false })).toBe('buzzers')
    expect(dominantSetupTask(ready)).toBe('play')
    expect(playBlockerExplanation({ ...ready, sonyReady: false })).toBeNull()
  })
})
