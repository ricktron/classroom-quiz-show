import { describe, expect, it } from 'vitest'
import { canStartPlay, classroomReadinessItems } from './classroomReadiness'

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
    expect(canStartPlay({ ...ready, namesUnique: false })).toBe(false)
    expect(canStartPlay({ ...ready, teamCount: 0 })).toBe(false)
    expect(canStartPlay({ ...ready, teamCount: 9 })).toBe(false)
  })

  it('keeps Sony optional when the keyboard fallback is available', () => {
    const items = classroomReadinessItems({ ...ready, sonyReady: false })
    expect(items.find((item) => item.id === 'sony')?.tone).toBe('optional')
    expect(items.find((item) => item.id === 'sony')?.detail).toMatch(/keyboard/i)
  })
})
