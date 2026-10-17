import type { SonyBuzzTransportHealth } from '../input/sonyBuzzKeepAliveLifecycle'

/**
 * Court B CB-02 (owner decision): after a Host reload / Resume, if CQS KNOWS the
 * buzzers were ready earlier in this class and readiness has since dropped at
 * the receiver, say so plainly and without blocking anything.
 *
 * "Knows" = this browser tab recorded readiness for this class session AND this
 * game (tab-scoped sessionStorage survives a reload of the same tab, not a
 * closed tab). Loading a game into the session replaces the class, so the
 * memory is per game and is forgotten when the game is replaced in this tab.
 *
 * "Dropped" = a settled receiver state: disconnected, failed, or no permission
 * after the automatic restore attempt has run. A receiver that is still
 * connecting/recovering, or restored and only waiting for a first press, is not
 * a failure, so it is never reported as one.
 */
export const BUZZER_RESUME_NOTICE = 'Buzzers need reconnecting; keyboard still works.'

const KEY_PREFIX = 'cqs.buzzersWereReady:'

export interface BuzzerReadyMemoryStorage {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
}

function defaultStorage(): BuzzerReadyMemoryStorage | null {
  try {
    return typeof sessionStorage === 'undefined' ? null : sessionStorage
  } catch {
    return null
  }
}

/** Memory scope: one class session playing one game. */
export function buzzerReadyScope(sessionId: string, gameId: string): string {
  return `${sessionId}:${gameId}`
}

export function rememberBuzzersReady(
  scope: string,
  storage: BuzzerReadyMemoryStorage | null = defaultStorage(),
): void {
  try {
    storage?.setItem(`${KEY_PREFIX}${scope}`, '1')
  } catch {
    /* storage unavailable: CQS simply does not "know", so no notice */
  }
}

export function forgetBuzzersReady(
  scope: string,
  storage: BuzzerReadyMemoryStorage | null = defaultStorage(),
): void {
  try {
    storage?.removeItem(`${KEY_PREFIX}${scope}`)
  } catch {
    /* nothing to forget if storage is unavailable */
  }
}

export function buzzersWereReady(
  scope: string,
  storage: BuzzerReadyMemoryStorage | null = defaultStorage(),
): boolean {
  try {
    return storage?.getItem(`${KEY_PREFIX}${scope}`) === '1'
  } catch {
    return false
  }
}

/**
 * True only for a settled receiver drop. Until the automatic restore probe has
 * finished, "no permission" is only the starting state, not a drop; while the
 * receiver is connecting or recovering, nothing is known yet.
 */
export function isSettledReceiverDrop(transport: {
  readonly health: SonyBuzzTransportHealth
  readonly restoreSettled: boolean
}): boolean {
  if (transport.health === 'disconnected' || transport.health === 'failed') return true
  return transport.health === 'permission-required' && transport.restoreSettled
}

/** True only when readiness was known and the receiver has settled into a drop. */
export function shouldShowBuzzerResumeNotice(input: {
  readonly wereReady: boolean
  readonly sonyReady: boolean
  readonly receiverDropSettled: boolean
}): boolean {
  return input.wereReady && !input.sonyReady && input.receiverDropSettled
}
