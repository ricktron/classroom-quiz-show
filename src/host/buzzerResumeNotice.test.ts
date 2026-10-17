import { describe, expect, it } from 'vitest'
import type { SonyBuzzTransportHealth } from '../input/sonyBuzzKeepAliveLifecycle'
import {
  BUZZER_RESUME_NOTICE,
  buzzerReadyScope,
  buzzersWereReady,
  forgetBuzzersReady,
  isSettledReceiverDrop,
  rememberBuzzersReady,
  shouldShowBuzzerResumeNotice,
} from './buzzerResumeNotice'

function memoryStorage() {
  const map = new Map<string, string>()
  return {
    getItem: (key: string) => map.get(key) ?? null,
    setItem: (key: string, value: string) => void map.set(key, value),
    removeItem: (key: string) => void map.delete(key),
  }
}

describe('buzzer resume notice (Court B CB-02)', () => {
  it('uses the owner-approved copy', () => {
    expect(BUZZER_RESUME_NOTICE).toBe('Buzzers need reconnecting; keyboard still works.')
  })

  it('remembers readiness per class session and game in tab storage', () => {
    const storage = memoryStorage()
    const a = buzzerReadyScope('s1', 'game-a')
    expect(buzzersWereReady(a, storage)).toBe(false)
    rememberBuzzersReady(a, storage)
    expect(buzzersWereReady(a, storage)).toBe(true)
    // Another game in the same session, or another session, is not known.
    expect(buzzersWereReady(buzzerReadyScope('s1', 'game-b'), storage)).toBe(false)
    expect(buzzersWereReady(buzzerReadyScope('s2', 'game-a'), storage)).toBe(false)
    forgetBuzzersReady(a, storage)
    expect(buzzersWereReady(a, storage)).toBe(false)
  })

  it('fails safe (no notice) when storage is unavailable or throws', () => {
    expect(buzzersWereReady('s1:g', null)).toBe(false)
    const throwing = {
      getItem: () => {
        throw new Error('denied')
      },
      setItem: () => {
        throw new Error('denied')
      },
      removeItem: () => {
        throw new Error('denied')
      },
    }
    expect(() => rememberBuzzersReady('s1:g', throwing)).not.toThrow()
    expect(() => forgetBuzzersReady('s1:g', throwing)).not.toThrow()
    expect(buzzersWereReady('s1:g', throwing)).toBe(false)
  })

  it('treats only settled receiver states as a drop', () => {
    const drop = (health: SonyBuzzTransportHealth, restoreSettled: boolean) =>
      isSettledReceiverDrop({ health, restoreSettled })
    expect(drop('disconnected', true)).toBe(true)
    expect(drop('failed', true)).toBe(true)
    // No permission after the automatic restore probe finished: a real drop.
    expect(drop('permission-required', true)).toBe(true)
    // Before the probe finishes it is only the starting state.
    expect(drop('permission-required', false)).toBe(false)
    // In progress, healthy, paused or unsupported: never a drop.
    for (const health of [
      'connecting',
      'recovering',
      'healthy',
      'degraded',
      'disabled',
      'unsupported-api',
    ] as const) {
      expect(drop(health, true)).toBe(false)
    }
  })

  it('shows only when readiness was known and the receiver drop has settled', () => {
    const show = (wereReady: boolean, sonyReady: boolean, receiverDropSettled: boolean) =>
      shouldShowBuzzerResumeNotice({ wereReady, sonyReady, receiverDropSettled })
    expect(show(true, false, true)).toBe(true)
    // Never known ready for this class and game: no notice.
    expect(show(false, false, true)).toBe(false)
    // Ready again: notice clears.
    expect(show(true, true, false)).toBe(false)
    // Restoring, restored and waiting for a press, or paused: not a drop.
    expect(show(true, false, false)).toBe(false)
  })
})
