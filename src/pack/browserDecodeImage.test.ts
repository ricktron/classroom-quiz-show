import { describe, expect, it, vi } from 'vitest'
import { browserDecodeImage } from './browserDecodeImage'
import { TINY_PNG_BYTES } from './testFixtures'

describe('browserDecodeImage', () => {
  it('returns true when createImageBitmap succeeds and closes the bitmap', async () => {
    const close = vi.fn()
    const createImageBitmap = vi.fn(async () => ({ close, width: 1, height: 1 }) as unknown as ImageBitmap)

    await expect(
      browserDecodeImage(TINY_PNG_BYTES, 'image/png', { createImageBitmap }),
    ).resolves.toBe(true)

    expect(createImageBitmap).toHaveBeenCalledOnce()
    expect(close).toHaveBeenCalledOnce()
  })

  it('returns false when createImageBitmap rejects', async () => {
    const createImageBitmap = vi.fn(async () => {
      throw new Error('decode failed')
    })

    await expect(
      browserDecodeImage(TINY_PNG_BYTES, 'image/png', { createImageBitmap }),
    ).resolves.toBe(false)
  })

  it('revokes object URLs on Image fallback success and failure', async () => {
    const revoked: string[] = []
    const createObjectURL = vi.fn(() => 'blob:decode-test')
    const revokeObjectURL = vi.fn((url: string) => {
      revoked.push(url)
    })

    class OkImage {
      onload: (() => void) | null = null
      onerror: (() => void) | null = null
      set src(_value: string) {
        queueMicrotask(() => this.onload?.())
      }
    }

    await expect(
      browserDecodeImage(TINY_PNG_BYTES, 'image/png', {
        createImageBitmap: undefined,
        Image: OkImage as unknown as typeof Image,
        createObjectURL,
        revokeObjectURL,
      }),
    ).resolves.toBe(true)
    expect(revoked).toEqual(['blob:decode-test'])

    class BadImage {
      onload: (() => void) | null = null
      onerror: (() => void) | null = null
      set src(_value: string) {
        queueMicrotask(() => this.onerror?.())
      }
    }

    revoked.length = 0
    await expect(
      browserDecodeImage(TINY_PNG_BYTES, 'image/png', {
        createImageBitmap: undefined,
        Image: BadImage as unknown as typeof Image,
        createObjectURL,
        revokeObjectURL,
      }),
    ).resolves.toBe(false)
    expect(revoked).toEqual(['blob:decode-test'])
  })

  it('fails closed when no browser decode primitive is available', async () => {
    await expect(
      browserDecodeImage(TINY_PNG_BYTES, 'image/png', {
        createImageBitmap: undefined,
        Image: undefined,
        createObjectURL: undefined,
        revokeObjectURL: undefined,
      }),
    ).resolves.toBe(false)
  })
})
