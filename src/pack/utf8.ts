/**
 * Strict UTF-8 encode/decode for manifest and canonical game JSON (Slice 19).
 *
 * Malformed UTF-8 fails closed — no replacement-character decoding.
 */

export class Utf8DecodeError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'Utf8DecodeError'
  }
}

export function encodeUtf8(text: string): Uint8Array {
  return new TextEncoder().encode(text)
}

export function decodeUtf8Strict(bytes: Uint8Array): string {
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes)
  } catch {
    throw new Utf8DecodeError('The text is not valid UTF-8.')
  }
}
