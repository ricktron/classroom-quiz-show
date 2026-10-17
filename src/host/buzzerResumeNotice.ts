import type { SonyBuzzTeacherSummary } from '../input/sonyBuzzTeacherReadiness'

/**
 * Court B CB-02 (owner decision): after a Host reload / Resume, if CQS KNOWS the
 * buzzers were ready earlier in this class session and readiness has since
 * dropped at the receiver, say so plainly and without blocking anything.
 *
 * "Knows" = this browser tab recorded readiness for this class session
 * (tab-scoped sessionStorage survives a reload of the same tab, not a closed
 * tab). The notice appears only when the receiver itself is not connected; a
 * receiver that was restored automatically and is only waiting for a first press
 * is not a failure, so it is not reported as one.
 */
export const BUZZER_RESUME_NOTICE = 'Buzzers need reconnecting; keyboard still works.'

const KEY_PREFIX = 'cqs.buzzersWereReady:'

export interface BuzzerReadyMemoryStorage {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
}

function defaultStorage(): BuzzerReadyMemoryStorage | null {
  try {
    return typeof sessionStorage === 'undefined' ? null : sessionStorage
  } catch {
    return null
  }
}

export function rememberBuzzersReady(
  sessionId: string,
  storage: BuzzerReadyMemoryStorage | null = defaultStorage(),
): void {
  try {
    storage?.setItem(`${KEY_PREFIX}${sessionId}`, '1')
  } catch {
    /* storage unavailable: CQS simply does not "know", so no notice */
  }
}

export function buzzersWereReady(
  sessionId: string,
  storage: BuzzerReadyMemoryStorage | null = defaultStorage(),
): boolean {
  try {
    return storage?.getItem(`${KEY_PREFIX}${sessionId}`) === '1'
  } catch {
    return false
  }
}

/** True only when readiness was known and has dropped at the receiver layer. */
export function shouldShowBuzzerResumeNotice(input: {
  readonly wereReady: boolean
  readonly sonyReady: boolean
  readonly summary: SonyBuzzTeacherSummary | null
}): boolean {
  if (!input.wereReady || input.sonyReady) return false
  return input.summary === 'receiver-disconnected' || input.summary === 'receiver-needs-attention'
}
