/**
 * SHA-256 helpers for portable-pack integrity (Slice 19).
 */

export function bytesToHex(bytes: Uint8Array): string {
  return [...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

export async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const subtle = globalThis.crypto?.subtle
  if (subtle === undefined) {
    throw new Error('Web Crypto SHA-256 is unavailable.')
  }
  const digest = await subtle.digest('SHA-256', new Uint8Array(bytes))
  const hex = bytesToHex(new Uint8Array(digest))
  if (!/^[0-9a-f]{64}$/.test(hex)) {
    throw new Error('SHA-256 returned an invalid digest.')
  }
  return hex
}
