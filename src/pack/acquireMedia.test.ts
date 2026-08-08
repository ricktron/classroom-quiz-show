import { describe, expect, it, vi } from 'vitest'
import { createHostedMediaResolver, readResponseBodyBounded } from './acquireMedia'
import { MAX_PACK_MEDIA_BYTES } from './limits'
import { TINY_PNG_BYTES } from './testFixtures'

function streamFromChunks(chunks: readonly Uint8Array[], onCancel?: () => void): ReadableStream<Uint8Array> {
  let index = 0
  return new ReadableStream<Uint8Array>({
    pull(controller) {
      if (index >= chunks.length) {
        controller.close()
        return
      }
      controller.enqueue(chunks[index]!)
      index += 1
    },
    cancel() {
      onCancel?.()
    },
  })
}

function responseFromChunks(
  chunks: readonly Uint8Array[],
  init: { readonly status?: number; readonly headers?: HeadersInit; readonly onCancel?: () => void } = {},
): Response {
  return new Response(streamFromChunks(chunks, init.onCancel), {
    status: init.status ?? 200,
    headers: init.headers,
  })
}

describe('readResponseBodyBounded', () => {
  it('accepts a body of exactly maxBytes', async () => {
    const bytes = new Uint8Array(MAX_PACK_MEDIA_BYTES)
    bytes.set(TINY_PNG_BYTES)
    const result = await readResponseBodyBounded(responseFromChunks([bytes]), MAX_PACK_MEDIA_BYTES)
    expect(result.status).toBe('success')
    if (result.status !== 'success') return
    expect(result.bytes.length).toBe(MAX_PACK_MEDIA_BYTES)
  })

  it('rejects and cancels when the stream emits one byte past maxBytes', async () => {
    const cancelled = vi.fn()
    const first = new Uint8Array(MAX_PACK_MEDIA_BYTES)
    first.set(TINY_PNG_BYTES)
    const overflow = new Uint8Array([0xff])
    const result = await readResponseBodyBounded(
      responseFromChunks([first, overflow], { onCancel: cancelled }),
      MAX_PACK_MEDIA_BYTES,
    )
    expect(result.status).toBe('too-large')
    expect(cancelled).toHaveBeenCalled()
  })

  it('fails closed when Response.body is unavailable', async () => {
    const response = {
      body: null,
    } as unknown as Response
    const result = await readResponseBodyBounded(response, MAX_PACK_MEDIA_BYTES)
    expect(result.status).toBe('failure')
  })
})

describe('createHostedMediaResolver', () => {
  const sourcePath = 'media-fixtures/slice-11-clue.png'

  it('accepts a supported image at or under the per-asset limit', async () => {
    const fetchImpl = vi.fn(async () => responseFromChunks([TINY_PNG_BYTES]))
    const resolve = createHostedMediaResolver({
      baseUrl: 'https://example.test/',
      fetch: fetchImpl as unknown as typeof fetch,
    })
    const result = await resolve(sourcePath)
    expect(result.status).toBe('success')
    if (result.status !== 'success') return
    expect([...result.bytes]).toEqual([...TINY_PNG_BYTES])
  })

  it('rejects Content-Length over the limit before body consumption', async () => {
    let pullCount = 0
    const fetchImpl = vi.fn(async () => ({
      ok: true,
      status: 200,
      headers: {
        get(name: string) {
          return name.toLowerCase() === 'content-length'
            ? String(MAX_PACK_MEDIA_BYTES + 1)
            : null
        },
      },
      body: {
        getReader() {
          return {
            async read() {
              pullCount += 1
              return { done: true as const, value: undefined }
            },
            async cancel() {
              return undefined
            },
          }
        },
      },
    }))
    const resolve = createHostedMediaResolver({
      baseUrl: 'https://example.test/',
      fetch: fetchImpl as unknown as typeof fetch,
    })
    const result = await resolve(sourcePath)
    expect(result.status).toBe('failure')
    if (result.status !== 'failure') return
    expect(result.issue.code).toBe('pack-media-too-large')
    expect(pullCount).toBe(0)
  })

  it('allows a streamed body of exactly MAX_PACK_MEDIA_BYTES with no Content-Length', async () => {
    const bytes = new Uint8Array(MAX_PACK_MEDIA_BYTES)
    bytes.set(TINY_PNG_BYTES)
    const fetchImpl = vi.fn(async () => responseFromChunks([bytes]))
    const resolve = createHostedMediaResolver({
      baseUrl: 'https://example.test/',
      fetch: fetchImpl as unknown as typeof fetch,
    })
    const result = await resolve(sourcePath)
    expect(result.status).toBe('success')
  })

  it('rejects streamed bodies of MAX_PACK_MEDIA_BYTES + 1 with no Content-Length', async () => {
    const first = new Uint8Array(MAX_PACK_MEDIA_BYTES)
    first.set(TINY_PNG_BYTES)
    const fetchImpl = vi.fn(async () =>
      responseFromChunks([first, new Uint8Array([0x01])]),
    )
    const resolve = createHostedMediaResolver({
      baseUrl: 'https://example.test/',
      fetch: fetchImpl as unknown as typeof fetch,
    })
    const result = await resolve(sourcePath)
    expect(result.status).toBe('failure')
    if (result.status !== 'failure') return
    expect(result.issue.code).toBe('pack-media-too-large')
  })

  it('enforces the actual emitted-byte cap even when Content-Length lies below the limit', async () => {
    const first = new Uint8Array(MAX_PACK_MEDIA_BYTES)
    first.set(TINY_PNG_BYTES)
    const fetchImpl = vi.fn(async () =>
      responseFromChunks([first, new Uint8Array([0x01])], {
        headers: { 'content-length': '16' },
      }),
    )
    const resolve = createHostedMediaResolver({
      baseUrl: 'https://example.test/',
      fetch: fetchImpl as unknown as typeof fetch,
    })
    const result = await resolve(sourcePath)
    expect(result.status).toBe('failure')
    if (result.status !== 'failure') return
    expect(result.issue.code).toBe('pack-media-too-large')
  })

  it('fails closed on HTTP errors and redirect-mode fetch failures', async () => {
    const httpError = createHostedMediaResolver({
      baseUrl: 'https://example.test/',
      fetch: vi.fn(async () => new Response(null, { status: 404 })) as unknown as typeof fetch,
    })
    const missing = await httpError(sourcePath)
    expect(missing.status).toBe('failure')
    if (missing.status !== 'failure') return
    expect(missing.issue.code).toBe('pack-media-acquisition-failed')

    const redirectFail = createHostedMediaResolver({
      baseUrl: 'https://example.test/',
      fetch: vi.fn(async () => {
        throw new TypeError('redirect blocked')
      }) as unknown as typeof fetch,
    })
    const redirected = await redirectFail(sourcePath)
    expect(redirected.status).toBe('failure')
    if (redirected.status !== 'failure') return
    expect(redirected.issue.code).toBe('pack-media-acquisition-failed')
  })
})
