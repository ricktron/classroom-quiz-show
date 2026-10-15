import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  claimWindowLeaseId,
  createTabId,
  stashWindowLeaseId,
  type TabScopedStorage,
} from './tabIdentity'
import { HOST_WINDOW_ID_SESSION_KEY } from './constants'

function memoryTabStorage(): TabScopedStorage & { readonly map: Map<string, string> } {
  const map = new Map<string, string>()
  return {
    map,
    getItem: (key) => map.get(key) ?? null,
    setItem: (key, value) => {
      map.set(key, value)
    },
    removeItem: (key) => {
      map.delete(key)
    },
  }
}

describe('window lease identity (same-tab reload handoff)', () => {
  it('reuses the identity the same tab stashed on pagehide (reload)', () => {
    const tab = memoryTabStorage()
    const first = claimWindowLeaseId(tab)
    stashWindowLeaseId(first, tab) // pagehide of the outgoing document
    expect(claimWindowLeaseId(tab)).toBe(first) // the reloaded document
  })

  it('removes the stash while live so a duplicated tab gets a fresh identity', () => {
    const tab = memoryTabStorage()
    const first = claimWindowLeaseId(tab)
    stashWindowLeaseId(first, tab)
    const reloaded = claimWindowLeaseId(tab)
    expect(tab.map.has(HOST_WINDOW_ID_SESSION_KEY)).toBe(false)
    // "Duplicate tab" / window.open copies sessionStorage while `reloaded` is live.
    const duplicate = memoryTabStorage()
    for (const [key, value] of tab.map) duplicate.setItem(key, value)
    expect(claimWindowLeaseId(duplicate)).not.toBe(reloaded)
  })

  it('mints a fresh identity when storage is missing, empty, or throws', () => {
    expect(claimWindowLeaseId(null)).toEqual(expect.any(String))
    const tab = memoryTabStorage()
    tab.setItem(HOST_WINDOW_ID_SESSION_KEY, '')
    expect(claimWindowLeaseId(tab).length).toBeGreaterThan(0)
    const throwing: TabScopedStorage = {
      getItem: () => {
        throw new Error('blocked')
      },
      setItem: () => {
        throw new Error('blocked')
      },
      removeItem: () => {
        throw new Error('blocked')
      },
    }
    expect(claimWindowLeaseId(throwing).length).toBeGreaterThan(0)
    expect(() => stashWindowLeaseId('id', throwing)).not.toThrow()
  })
})

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
