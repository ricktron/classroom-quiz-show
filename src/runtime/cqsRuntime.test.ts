import { describe, expect, it } from 'vitest'
import { cqsRuntime, isDesktopRuntime } from './cqsRuntime'

describe('cqsRuntime', () => {
  it('treats the default Vitest/web renderer as web, not desktop', () => {
    expect(cqsRuntime()).toBe('web')
    expect(isDesktopRuntime()).toBe(false)
  })
})
