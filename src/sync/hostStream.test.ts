import { describe, expect, it } from 'vitest'
import { shouldAcceptHostStreamSnapshot } from './hostStream'

describe('shouldAcceptHostStreamSnapshot', () => {
  it('accepts the first snapshot on an empty cursor', () => {
    expect(
      shouldAcceptHostStreamSnapshot(
        { streamId: null, revision: 0, sentAt: 0 },
        { streamId: 'stream-a', revision: 500, sentAt: 100 },
      ),
    ).toBe(true)
  })

  it('enforces monotonic revision within one Host stream', () => {
    const cursor = { streamId: 'stream-a', revision: 500, sentAt: 100 }
    expect(
      shouldAcceptHostStreamSnapshot(cursor, { streamId: 'stream-a', revision: 499, sentAt: 200 }),
    ).toBe(false)
    expect(
      shouldAcceptHostStreamSnapshot(cursor, { streamId: 'stream-a', revision: 500, sentAt: 200 }),
    ).toBe(false)
    expect(
      shouldAcceptHostStreamSnapshot(cursor, { streamId: 'stream-a', revision: 501, sentAt: 101 }),
    ).toBe(true)
  })

  it('accepts a new Host stream when revision resets', () => {
    const cursor = { streamId: 'stream-a', revision: 500, sentAt: 100 }
    expect(
      shouldAcceptHostStreamSnapshot(cursor, { streamId: 'stream-b', revision: 1, sentAt: 200 }),
    ).toBe(true)
  })

  it('accepts a new Host stream that continues a persisted high revision', () => {
    const cursor = { streamId: 'stream-a', revision: 500, sentAt: 100 }
    expect(
      shouldAcceptHostStreamSnapshot(cursor, { streamId: 'stream-b', revision: 600, sentAt: 200 }),
    ).toBe(true)
  })

  it('rejects a stale former Host stream with a higher revision after a replacement', () => {
    const cursor = { streamId: 'stream-b', revision: 50, sentAt: 500 }
    expect(
      shouldAcceptHostStreamSnapshot(
        cursor,
        { streamId: 'stream-a', revision: 501, sentAt: 600 },
        new Set(['stream-a']),
      ),
    ).toBe(false)
  })

  it('rejects malformed stream metadata', () => {
    expect(
      shouldAcceptHostStreamSnapshot(
        { streamId: 'stream-a', revision: 1, sentAt: 1 },
        { streamId: '', revision: 2, sentAt: 2 },
      ),
    ).toBe(false)
    expect(
      shouldAcceptHostStreamSnapshot(
        { streamId: 'stream-a', revision: 1, sentAt: 1 },
        { streamId: 'stream-b', revision: 2, sentAt: Number.NaN },
      ),
    ).toBe(false)
  })
})
