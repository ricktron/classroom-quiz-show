import { afterEach, describe, expect, it, vi } from 'vitest'
import { createTabId } from './tabIdentity'

describe('createTabId', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('prefers crypto.randomUUID when available', () => {
    vi.stubGlobal('crypto', {
      randomUUID: () => '11111111-2222-3333-4444-555555555555',
      getRandomValues: (bytes: Uint8Array) => {
        bytes.fill(9)
        return bytes
      },
    })

    expect(createTabId()).toBe('11111111-2222-3333-4444-555555555555')
  })

  it('falls back to crypto.getRandomValues without Math.random', () => {
    const randomSpy = vi.spyOn(Math, 'random')
    vi.stubGlobal('crypto', {
      getRandomValues: (bytes: Uint8Array) => {
        for (let i = 0; i < bytes.length; i += 1) bytes[i] = i
        return bytes
      },
    })

    const id = createTabId()

    expect(id).toMatch(/^tab-[0-9a-f]{32}$/)
    expect(randomSpy).not.toHaveBeenCalled()
    randomSpy.mockRestore()
  })

  it('uses a monotonic fallback when Web Crypto is unavailable', () => {
    const randomSpy = vi.spyOn(Math, 'random')
    vi.stubGlobal('crypto', undefined)

    const first = createTabId()
    const second = createTabId()

    expect(first).toMatch(/^tab-[0-9a-z]+-[0-9a-z]+$/)
    expect(second).toMatch(/^tab-[0-9a-z]+-[0-9a-z]+$/)
    expect(first).not.toBe(second)
    expect(randomSpy).not.toHaveBeenCalled()
    randomSpy.mockRestore()
  })
})
