import { systemClock } from '../time/clock'

export function createTabId(): string {
  const crypto = globalThis.crypto
  if (crypto && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  const random = Math.random().toString(36).slice(2)
  return `tab-${systemClock.now().toString(36)}-${random}`
}
