/**
 * Magic-byte sniffing for portable-pack raster media (Slice 19).
 *
 * MIME is derived from bytes only — never from extension or manifest.
 */

export type SniffedMediaType = 'image/png' | 'image/jpeg' | 'image/webp' | 'image/gif'

export type MediaSniffResult =
  | { readonly status: 'success'; readonly mediaType: SniffedMediaType }
  | { readonly status: 'failure'; readonly reason: 'empty' | 'unsupported' }

function startsWith(bytes: Uint8Array, signature: readonly number[]): boolean {
  if (bytes.length < signature.length) return false
  for (let i = 0; i < signature.length; i += 1) {
    if (bytes[i] !== signature[i]) return false
  }
  return true
}

function looksLikeSvgOrHtml(bytes: Uint8Array): boolean {
  const head = new TextDecoder('utf-8', { fatal: false }).decode(bytes.slice(0, Math.min(bytes.length, 256)))
  const trimmed = head.trimStart().toLowerCase()
  return (
    trimmed.startsWith('<!doctype') ||
    trimmed.startsWith('<html') ||
    trimmed.startsWith('<svg') ||
    trimmed.startsWith('<?xml')
  )
}

/** Sniff supported raster image bytes. Rejects SVG, HTML, empty, and unknown signatures. */
export function sniffMediaBytes(bytes: Uint8Array): MediaSniffResult {
  if (bytes.length === 0) {
    return { status: 'failure', reason: 'empty' }
  }

  if (looksLikeSvgOrHtml(bytes)) {
    return { status: 'failure', reason: 'unsupported' }
  }

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) {
    return { status: 'success', mediaType: 'image/png' }
  }

  // JPEG: FF D8 FF
  if (startsWith(bytes, [0xff, 0xd8, 0xff])) {
    return { status: 'success', mediaType: 'image/jpeg' }
  }

  // GIF87a / GIF89a
  if (startsWith(bytes, [0x47, 0x49, 0x46, 0x38, 0x37, 0x61]) || startsWith(bytes, [0x47, 0x49, 0x46, 0x38, 0x39, 0x61])) {
    return { status: 'success', mediaType: 'image/gif' }
  }

  // WebP: RIFF....WEBP
  if (
    bytes.length >= 12 &&
    startsWith(bytes, [0x52, 0x49, 0x46, 0x46]) &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return { status: 'success', mediaType: 'image/webp' }
  }

  return { status: 'failure', reason: 'unsupported' }
}

export function isSupportedPackMediaType(mediaType: string): mediaType is SniffedMediaType {
  return (
    mediaType === 'image/png' ||
    mediaType === 'image/jpeg' ||
    mediaType === 'image/webp' ||
    mediaType === 'image/gif'
  )
}
