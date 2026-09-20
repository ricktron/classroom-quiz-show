import { describe, expect, it, vi } from 'vitest'
import { createSystemResumeHandler } from './systemResumeRecovery'
import { DESKTOP_DISPLAY_ENTRY_URL } from './constants'

describe('createSystemResumeHandler', () => {
  it('reloads an open Display that still has an allowed URL', () => {
    const reload = vi.fn()
    const loadURL = vi.fn()
    const handler = createSystemResumeHandler({
      isQuitting: () => false,
      getDisplayWindow: () => ({
        isDestroyed: () => false,
        loadURL,
        webContents: {
          getURL: () => `${DESKTOP_DISPLAY_ENTRY_URL}?theme=high-contrast`,
          reload,
        },
      }),
      lastGoodDisplayUrl: () => DESKTOP_DISPLAY_ENTRY_URL,
      isAllowedDisplayUrl: (url) => url.includes('#/display'),
    })

    handler()

    expect(reload).toHaveBeenCalledTimes(1)
    expect(loadURL).not.toHaveBeenCalled()
  })

  it('does nothing when no Display exists', () => {
    const handler = createSystemResumeHandler({
      isQuitting: () => false,
      getDisplayWindow: () => null,
      lastGoodDisplayUrl: () => DESKTOP_DISPLAY_ENTRY_URL,
      isAllowedDisplayUrl: () => true,
    })
    expect(() => handler()).not.toThrow()
  })

  it('does nothing when Display is destroyed', () => {
    const reload = vi.fn()
    const handler = createSystemResumeHandler({
      isQuitting: () => false,
      getDisplayWindow: () => ({
        isDestroyed: () => true,
        loadURL: vi.fn(),
        webContents: { getURL: () => DESKTOP_DISPLAY_ENTRY_URL, reload },
      }),
      lastGoodDisplayUrl: () => DESKTOP_DISPLAY_ENTRY_URL,
      isAllowedDisplayUrl: () => true,
    })
    handler()
    expect(reload).not.toHaveBeenCalled()
  })

  it('does nothing while quitting', () => {
    const reload = vi.fn()
    const handler = createSystemResumeHandler({
      isQuitting: () => true,
      getDisplayWindow: () => ({
        isDestroyed: () => false,
        loadURL: vi.fn(),
        webContents: { getURL: () => DESKTOP_DISPLAY_ENTRY_URL, reload },
      }),
      lastGoodDisplayUrl: () => DESKTOP_DISPLAY_ENTRY_URL,
      isAllowedDisplayUrl: () => true,
    })
    handler()
    expect(reload).not.toHaveBeenCalled()
  })

  it('falls back to lastGoodDisplayUrl when current URL is not allowed', () => {
    const loadURL = vi.fn()
    const reload = vi.fn()
    const handler = createSystemResumeHandler({
      isQuitting: () => false,
      getDisplayWindow: () => ({
        isDestroyed: () => false,
        loadURL,
        webContents: {
          getURL: () => 'https://evil.example/#/display',
          reload,
        },
      }),
      lastGoodDisplayUrl: () => `${DESKTOP_DISPLAY_ENTRY_URL}?theme=default`,
      isAllowedDisplayUrl: (url) => url.startsWith('cqs://app') && url.includes('#/display'),
    })

    handler()

    expect(reload).not.toHaveBeenCalled()
    expect(loadURL).toHaveBeenCalledWith(`${DESKTOP_DISPLAY_ENTRY_URL}?theme=default`)
  })

  it('does not invent a Host reload path', () => {
    // Handler only touches getDisplayWindow(); Host is out of scope by construction.
    const getDisplayWindow = vi.fn(() => null)
    const handler = createSystemResumeHandler({
      isQuitting: () => false,
      getDisplayWindow,
      lastGoodDisplayUrl: () => DESKTOP_DISPLAY_ENTRY_URL,
      isAllowedDisplayUrl: () => true,
    })
    handler()
    expect(getDisplayWindow).toHaveBeenCalledTimes(1)
  })
})
