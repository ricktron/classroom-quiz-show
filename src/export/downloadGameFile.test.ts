import { afterEach, describe, expect, it, vi } from 'vitest'
import { downloadGameFile, type DownloadEnvironment } from './downloadGameFile'

interface CapturedBlob {
  readonly type: string
  readonly parts: BlobPart[]
}

interface Captured {
  readonly blobs: CapturedBlob[]
  readonly urls: string[]
  readonly anchors: HTMLAnchorElement[]
  readonly clicks: number
  readonly removed: HTMLAnchorElement[]
  readonly revoked: string[]
  readonly cleanups: Array<() => void>
}

function fakeEnvironment(overrides: Partial<DownloadEnvironment> = {}): {
  env: DownloadEnvironment
  captured: Captured
} {
  const blobs: CapturedBlob[] = []
  const urls: string[] = []
  const anchors: HTMLAnchorElement[] = []
  const removed: HTMLAnchorElement[] = []
  const revoked: string[] = []
  const cleanups: Array<() => void> = []
  let clicks = 0
  let urlCounter = 0

  const env: DownloadEnvironment = {
    createObjectURL: (blob) => {
      const recorded = (blob as { __captured?: CapturedBlob }).__captured
      if (recorded) blobs.push(recorded)
      else blobs.push({ type: blob.type, parts: [] })
      urlCounter += 1
      const url = `blob:test-${urlCounter}`
      urls.push(url)
      return url
    },
    revokeObjectURL: (url) => {
      revoked.push(url)
    },
    createAnchor: () => {
      const anchor = document.createElement('a')
      const originalClick = anchor.click.bind(anchor)
      anchor.click = () => {
        clicks += 1
        // Avoid jsdom "navigation to another Document" noise.
        void originalClick
      }
      anchors.push(anchor)
      return anchor
    },
    appendAnchor: (anchor) => {
      document.body.appendChild(anchor)
    },
    removeAnchor: (anchor) => {
      removed.push(anchor)
      anchor.remove()
    },
    scheduleCleanup: (callback) => {
      cleanups.push(callback)
    },
    ...overrides,
  }

  return {
    env,
    captured: {
      get blobs() {
        return blobs
      },
      get urls() {
        return urls
      },
      get anchors() {
        return anchors
      },
      get clicks() {
        return clicks
      },
      get removed() {
        return removed
      },
      get revoked() {
        return revoked
      },
      get cleanups() {
        return cleanups
      },
    },
  }
}

const OriginalBlob = globalThis.Blob

afterEach(() => {
  document.body.replaceChildren()
  globalThis.Blob = OriginalBlob
})

function installCapturingBlob(): void {
  globalThis.Blob = class CapturingBlob {
    readonly type: string
    readonly parts: BlobPart[]
    readonly __captured: CapturedBlob
    readonly size: number

    constructor(parts: BlobPart[] = [], options: BlobPropertyBag = {}) {
      this.parts = parts
      this.type = options.type ?? ''
      this.size = parts.reduce((sum, part) => sum + String(part).length, 0)
      this.__captured = { type: this.type, parts: this.parts }
    }
  } as unknown as typeof Blob
}

describe('downloadGameFile', () => {
  it('creates a Blob with the exact MIME type and text', () => {
    installCapturingBlob()
    const { env, captured } = fakeEnvironment()
    const text = '{"format":"classroom-quiz-show/game"}\n'
    downloadGameFile({ filename: 'g.classroom-quiz-show.json', text }, env)

    expect(captured.blobs).toHaveLength(1)
    expect(captured.blobs[0]!.type).toBe('application/json;charset=utf-8')
    expect(captured.blobs[0]!.parts).toEqual([text])
  })

  it('sets the exact filename, creates one object URL, one anchor, and clicks once', () => {
    installCapturingBlob()
    const { env, captured } = fakeEnvironment()
    downloadGameFile(
      { filename: 'ecology-review.classroom-quiz-show.json', text: '{}\n' },
      env,
    )

    expect(captured.urls).toEqual(['blob:test-1'])
    expect(captured.anchors).toHaveLength(1)
    expect(captured.anchors[0]!.download).toBe('ecology-review.classroom-quiz-show.json')
    expect(captured.clicks).toBe(1)
    expect(captured.removed).toHaveLength(1)
    expect(captured.removed[0]).toBe(captured.anchors[0])
    expect(document.body.contains(captured.anchors[0]!)).toBe(false)
  })

  it('schedules object-URL revocation after the click', () => {
    installCapturingBlob()
    const { env, captured } = fakeEnvironment()
    downloadGameFile({ filename: 'g.classroom-quiz-show.json', text: 'x\n' }, env)

    expect(captured.revoked).toEqual([])
    expect(captured.cleanups).toHaveLength(1)
    captured.cleanups[0]!()
    expect(captured.revoked).toEqual(['blob:test-1'])
  })

  it('revokes the URL even when click throws', () => {
    installCapturingBlob()
    const { env, captured } = fakeEnvironment({
      createAnchor: () => {
        const anchor = document.createElement('a')
        anchor.click = () => {
          throw new Error('click failed')
        }
        return anchor
      },
    })

    expect(() =>
      downloadGameFile({ filename: 'g.classroom-quiz-show.json', text: 'x\n' }, env),
    ).toThrow(/click failed/)

    expect(captured.cleanups).toHaveLength(1)
    captured.cleanups[0]!()
    expect(captured.revoked).toEqual(['blob:test-1'])
    expect(captured.removed).toHaveLength(1)
  })

  it('creates and revokes independent URLs on repeated downloads', () => {
    installCapturingBlob()
    const { env, captured } = fakeEnvironment()
    downloadGameFile({ filename: 'a.classroom-quiz-show.json', text: 'a\n' }, env)
    downloadGameFile({ filename: 'b.classroom-quiz-show.json', text: 'b\n' }, env)

    expect(captured.urls).toEqual(['blob:test-1', 'blob:test-2'])
    expect(captured.cleanups).toHaveLength(2)
    captured.cleanups[0]!()
    captured.cleanups[1]!()
    expect(captured.revoked).toEqual(['blob:test-1', 'blob:test-2'])
  })

  it('uses the injected environment and creates no real browser download URL', () => {
    installCapturingBlob()
    const { env, captured } = fakeEnvironment()
    downloadGameFile({ filename: 'g.classroom-quiz-show.json', text: 'x\n' }, env)
    expect(captured.urls).toEqual(['blob:test-1'])
    expect(vi.isMockFunction(env.createObjectURL)).toBe(false)
  })

  it('revokes the URL when createAnchor throws after createObjectURL', () => {
    installCapturingBlob()
    const { env, captured } = fakeEnvironment({
      createAnchor: () => {
        throw new Error('createAnchor failed')
      },
    })
    expect(() =>
      downloadGameFile({ filename: 'g.classroom-quiz-show.json', text: 'x\n' }, env),
    ).toThrow(/createAnchor failed/)
    expect(captured.urls).toEqual(['blob:test-1'])
    expect(captured.cleanups).toHaveLength(1)
    captured.cleanups[0]!()
    expect(captured.revoked).toEqual(['blob:test-1'])
  })

  it('revokes the URL when appendAnchor throws', () => {
    installCapturingBlob()
    const { env, captured } = fakeEnvironment({
      appendAnchor: () => {
        throw new Error('append failed')
      },
    })
    expect(() =>
      downloadGameFile({ filename: 'g.classroom-quiz-show.json', text: 'x\n' }, env),
    ).toThrow(/append failed/)
    expect(captured.removed).toHaveLength(0)
    expect(captured.cleanups).toHaveLength(1)
    captured.cleanups[0]!()
    expect(captured.revoked).toEqual(['blob:test-1'])
  })

  it('still revokes when removeAnchor throws', () => {
    installCapturingBlob()
    const { env, captured } = fakeEnvironment({
      removeAnchor: () => {
        throw new Error('remove failed')
      },
    })
    expect(() =>
      downloadGameFile({ filename: 'g.classroom-quiz-show.json', text: 'x\n' }, env),
    ).not.toThrow()
    expect(captured.cleanups).toHaveLength(1)
    captured.cleanups[0]!()
    expect(captured.revoked).toEqual(['blob:test-1'])
  })

  it('revokes synchronously when scheduleCleanup throws', () => {
    installCapturingBlob()
    const { env, captured } = fakeEnvironment({
      scheduleCleanup: () => {
        throw new Error('schedule failed')
      },
    })
    expect(() =>
      downloadGameFile({ filename: 'g.classroom-quiz-show.json', text: 'x\n' }, env),
    ).not.toThrow()
    expect(captured.cleanups).toHaveLength(0)
    expect(captured.revoked).toEqual(['blob:test-1'])
  })

  it('contains revokeObjectURL failures inside scheduled cleanup', () => {
    installCapturingBlob()
    const { env, captured } = fakeEnvironment({
      revokeObjectURL: () => {
        throw new Error('revoke failed')
      },
    })
    expect(() =>
      downloadGameFile({ filename: 'g.classroom-quiz-show.json', text: 'x\n' }, env),
    ).not.toThrow()
    expect(captured.cleanups).toHaveLength(1)
    expect(() => captured.cleanups[0]!()).not.toThrow()
  })

  it('propagates Blob construction failure without creating a URL', () => {
    globalThis.Blob = class FailingBlob {
      constructor() {
        throw new Error('blob failed')
      }
    } as unknown as typeof Blob
    const { env, captured } = fakeEnvironment()
    expect(() =>
      downloadGameFile({ filename: 'g.classroom-quiz-show.json', text: 'x\n' }, env),
    ).toThrow(/blob failed/)
    expect(captured.urls).toHaveLength(0)
    expect(captured.cleanups).toHaveLength(0)
  })

  it('propagates createObjectURL failure without scheduling cleanup', () => {
    installCapturingBlob()
    const { env, captured } = fakeEnvironment({
      createObjectURL: () => {
        throw new Error('url failed')
      },
    })
    expect(() =>
      downloadGameFile({ filename: 'g.classroom-quiz-show.json', text: 'x\n' }, env),
    ).toThrow(/url failed/)
    expect(captured.urls).toHaveLength(0)
    expect(captured.cleanups).toHaveLength(0)
  })
})
