/**
 * Base64 helpers for backup media transport.
 * Decode fails closed on invalid alphabet / padding.
 */

const BASE64_RE = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/

export function bytesToBase64(bytes: Uint8Array): string {
  if (typeof globalThis.btoa === 'function') {
    let binary = ''
    const chunk = 0x8000
    for (let i = 0; i < bytes.length; i += chunk) {
      const slice = bytes.subarray(i, i + chunk)
      binary += String.fromCharCode(...slice)
    }
    return globalThis.btoa(binary)
  }
  // Node / test fallback
  return Buffer.from(bytes).toString('base64')
}

export function base64ToBytes(text: string): Uint8Array | null {
  if (typeof text !== 'string' || text.length === 0) return null
  if (text.length > 8 * 1024 * 1024 * 2) return null
  if (!BASE64_RE.test(text)) return null
  try {
    if (typeof globalThis.atob === 'function') {
      const binary = globalThis.atob(text)
      const bytes = new Uint8Array(binary.length)
      for (let i = 0; i < binary.length; i += 1) {
        bytes[i] = binary.charCodeAt(i)
      }
      return bytes
    }
    return Uint8Array.from(Buffer.from(text, 'base64'))
  } catch {
    return null
  }
}
