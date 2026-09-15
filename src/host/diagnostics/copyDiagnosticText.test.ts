import { afterEach, describe, expect, it, vi } from 'vitest'
import { copyDiagnosticText } from './copyDiagnosticText'

describe('copyDiagnosticText', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    // jsdom may not define execCommand; clean any test polyfill.
    if ('execCommand' in document) {
      // keep environment stable across tests
    }
  })

  it('returns copied when clipboard.writeText succeeds', async () => {
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: vi.fn().mockResolvedValue(undefined) },
    })
    await expect(copyDiagnosticText('safe-report')).resolves.toBe('copied')
  })

  it('falls back to execCommand when writeText rejects', async () => {
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: vi.fn().mockRejectedValue(new Error('denied')) },
    })
    Object.defineProperty(document, 'execCommand', {
      configurable: true,
      value: vi.fn().mockReturnValue(true),
    })
    await expect(copyDiagnosticText('safe-report')).resolves.toBe('copied')
    expect(document.execCommand).toHaveBeenCalledWith('copy')
  })

  it('returns failed when both clipboard paths fail', async () => {
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: vi.fn().mockRejectedValue(new Error('denied')) },
    })
    Object.defineProperty(document, 'execCommand', {
      configurable: true,
      value: vi.fn().mockReturnValue(false),
    })
    await expect(copyDiagnosticText('safe-report')).resolves.toBe('failed')
  })
})
