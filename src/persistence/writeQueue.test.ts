import { describe, expect, it } from 'vitest'
import { persistenceOk } from './results'
import { createPersistenceWriteQueue, skippedStaleWrite } from './writeQueue'

describe('PersistenceWriteQueue', () => {
  it('serializes writes in enqueue order', async () => {
    const queue = createPersistenceWriteQueue()
    const order: string[] = []

    const first = queue.enqueue(async () => {
      order.push('first-start')
      await Promise.resolve()
      order.push('first-end')
      return persistenceOk('first')
    })
    const second = queue.enqueue(async () => {
      order.push('second')
      return persistenceOk('second')
    })

    expect(await first).toEqual({ ok: true, value: 'first' })
    expect(await second).toEqual({ ok: true, value: 'second' })
    expect(order).toEqual(['first-start', 'first-end', 'second'])
  })

  it('tracks active-session generations', () => {
    const queue = createPersistenceWriteQueue()
    const older = queue.nextActiveSessionGeneration()
    const newer = queue.nextActiveSessionGeneration()

    expect(queue.isLatestActiveSessionGeneration(older)).toBe(false)
    expect(queue.isLatestActiveSessionGeneration(newer)).toBe(true)
    expect(skippedStaleWrite()).toEqual({ ok: true, value: undefined })
  })
})
