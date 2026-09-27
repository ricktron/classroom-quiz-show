import { describe, expect, it } from 'vitest'
import { canPublishHostPublicState } from './writeAuthority'

describe('canPublishHostPublicState', () => {
  it('does not publish while boot is still loading', () => {
    expect(
      canPublishHostPublicState({
        bootPhase: 'loading',
        leadership: 'unknown',
        durabilityStatus: 'loading',
      }),
    ).toBe(false)
  })

  it('publishes for the persistence leader once boot is ready', () => {
    expect(
      canPublishHostPublicState({
        bootPhase: 'ready',
        leadership: 'leader',
        durabilityStatus: 'idle',
      }),
    ).toBe(true)
  })

  it('does not publish for a follower tab', () => {
    expect(
      canPublishHostPublicState({
        bootPhase: 'ready',
        leadership: 'follower',
        durabilityStatus: 'idle',
      }),
    ).toBe(false)
  })

  it('does not publish while lease leadership is still unknown with durable storage', () => {
    expect(
      canPublishHostPublicState({
        bootPhase: 'ready',
        leadership: 'unknown',
        durabilityStatus: 'idle',
      }),
    ).toBe(false)
  })

  it('publishes in memory-only play when storage is unavailable', () => {
    expect(
      canPublishHostPublicState({
        bootPhase: 'ready',
        leadership: 'unknown',
        durabilityStatus: 'unavailable',
      }),
    ).toBe(true)
  })
})
