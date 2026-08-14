import { describe, expect, it } from 'vitest'
import { createGenerationWriteGate } from './saveGate'

describe('generation write gate', () => {
  it('skips a stale write so a later generation is the one persisted', async () => {
    const gate = createGenerationWriteGate()
    const writes: number[] = []
    let releaseFirst: () => void = () => undefined
    const firstHold = new Promise<void>((resolve) => {
      releaseFirst = resolve
    })

    const firstGen = gate.begin()
    const first = gate.enqueue(firstGen, async () => {
      await firstHold
      writes.push(1)
      return 'v1'
    })
    const secondGen = gate.begin()
    const second = gate.enqueue(secondGen, async () => {
      writes.push(2)
      return 'v2'
    })
    releaseFirst()
    await expect(first).resolves.toEqual({ skipped: true })
    await expect(second).resolves.toEqual({ skipped: false, value: 'v2' })
    expect(writes).toEqual([2])
  })
})
