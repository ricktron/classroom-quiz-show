import { describe, expect, it } from 'vitest'
import {
  BUZZER_RESUME_NOTICE,
  buzzersWereReady,
  rememberBuzzersReady,
  shouldShowBuzzerResumeNotice,
} from './buzzerResumeNotice'

function memoryStorage() {
  const map = new Map<string, string>()
  return {
    getItem: (key: string) => map.get(key) ?? null,
    setItem: (key: string, value: string) => void map.set(key, value),
  }
}

describe('buzzer resume notice (Court B CB-02)', () => {
  it('uses the owner-approved copy', () => {
    expect(BUZZER_RESUME_NOTICE).toBe('Buzzers need reconnecting; keyboard still works.')
  })

  it('remembers readiness per class session in tab storage', () => {
    const storage = memoryStorage()
    expect(buzzersWereReady('s1', storage)).toBe(false)
    rememberBuzzersReady('s1', storage)
    expect(buzzersWereReady('s1', storage)).toBe(true)
    expect(buzzersWereReady('s2', storage)).toBe(false)
  })

  it('fails safe (no notice) when storage is unavailable or throws', () => {
    expect(buzzersWereReady('s1', null)).toBe(false)
    const throwing = {
      getItem: () => {
        throw new Error('denied')
      },
      setItem: () => {
        throw new Error('denied')
      },
    }
    expect(() => rememberBuzzersReady('s1', throwing)).not.toThrow()
    expect(buzzersWereReady('s1', throwing)).toBe(false)
  })

  it('shows only when readiness was known and the receiver is not connected', () => {
    const show = (wereReady: boolean, sonyReady: boolean, summary: Parameters<typeof shouldShowBuzzerResumeNotice>[0]['summary']) =>
      shouldShowBuzzerResumeNotice({ wereReady, sonyReady, summary })
    expect(show(true, false, 'receiver-needs-attention')).toBe(true)
    expect(show(true, false, 'receiver-disconnected')).toBe(true)
    // Never known ready: ordinary "optional" posture, no notice.
    expect(show(false, false, 'receiver-needs-attention')).toBe(false)
    // Ready again: notice clears.
    expect(show(true, true, 'sony-buzz-ready')).toBe(false)
    // Receiver restored and only waiting for a press: not a failure.
    expect(show(true, false, 'receiver-waiting-for-controllers')).toBe(false)
    expect(show(true, false, 'controllers-need-team-setup')).toBe(false)
    // Teacher deliberately paused for pairing: not a failure either.
    expect(show(true, false, 'receiver-paused')).toBe(false)
    // Unknown yet: say nothing rather than guess.
    expect(show(true, false, null)).toBe(false)
  })
})
