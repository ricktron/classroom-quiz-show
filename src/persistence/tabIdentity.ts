import { systemClock } from '../time/clock'

let fallbackCounter = 0

/**
 * Local host-tab identity for the IndexedDB writer lease.
 * Prefers Web Crypto; never uses Math.random (Sonar typescript:S2245).
 */
export function createTabId(): string {
  const cryptoApi = globalThis.crypto
  if (cryptoApi && typeof cryptoApi.randomUUID === 'function') {
    return cryptoApi.randomUUID()
  }
  if (cryptoApi && typeof cryptoApi.getRandomValues === 'function') {
    const bytes = new Uint8Array(16)
    cryptoApi.getRandomValues(bytes)
    let hex = ''
    for (const byte of bytes) {
      hex += byte.toString(16).padStart(2, '0')
    }
    return `tab-${hex}`
  }
  fallbackCounter += 1
  return `tab-${systemClock.now().toString(36)}-${fallbackCounter.toString(36)}`
}
