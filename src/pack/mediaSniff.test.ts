import { describe, expect, it } from 'vitest'
import { sniffMediaBytes } from './mediaSniff'
import {
  GIF89A_MAGIC_STUB,
  HTML_STUB,
  JPEG_MAGIC_STUB,
  SVG_STUB,
  TINY_PNG_BYTES,
  WEBP_MAGIC_STUB,
} from './testFixtures'

describe('pack media sniff', () => {
  it('accepts PNG, JPEG, WebP, and GIF89a', () => {
    expect(sniffMediaBytes(TINY_PNG_BYTES)).toEqual({ status: 'success', mediaType: 'image/png' })
    expect(sniffMediaBytes(JPEG_MAGIC_STUB)).toEqual({ status: 'success', mediaType: 'image/jpeg' })
    expect(sniffMediaBytes(WEBP_MAGIC_STUB)).toEqual({ status: 'success', mediaType: 'image/webp' })
    expect(sniffMediaBytes(GIF89A_MAGIC_STUB)).toEqual({ status: 'success', mediaType: 'image/gif' })
  })

  it('rejects SVG, HTML, empty, and unknown bytes', () => {
    expect(sniffMediaBytes(SVG_STUB)).toEqual({ status: 'failure', reason: 'unsupported' })
    expect(sniffMediaBytes(HTML_STUB)).toEqual({ status: 'failure', reason: 'unsupported' })
    expect(sniffMediaBytes(new Uint8Array())).toEqual({ status: 'failure', reason: 'empty' })
    expect(sniffMediaBytes(new Uint8Array([0x00, 0x01, 0x02]))).toEqual({
      status: 'failure',
      reason: 'unsupported',
    })
  })

  it('rejects PNG extension with non-PNG bytes', () => {
    const fake = new Uint8Array([0x00, 0x01, 0x02, 0x03])
    expect(sniffMediaBytes(fake)).toEqual({ status: 'failure', reason: 'unsupported' })
  })
})
