import { describe, expect, it } from 'vitest'
import {
  contextualTeamCountReturnState,
  hostResumeRecoveryState,
  isContextualTeamCountReturn,
  setupFocusFromNavigation,
  shouldResumeRecoveryFromNavigation,
} from './hostResumeNavigation'

describe('hostResumeNavigation', () => {
  it('detects ordinary Home Resume intent', () => {
    expect(shouldResumeRecoveryFromNavigation(hostResumeRecoveryState())).toBe(true)
    expect(shouldResumeRecoveryFromNavigation(null)).toBe(false)
    expect(shouldResumeRecoveryFromNavigation({})).toBe(false)
  })

  it('builds contextual Fix team count return with auto-resume + Names focus', () => {
    const state = contextualTeamCountReturnState({ setupFocus: 'names' })
    expect(shouldResumeRecoveryFromNavigation(state)).toBe(true)
    expect(isContextualTeamCountReturn(state)).toBe(true)
    expect(setupFocusFromNavigation(state)).toBe('names')
  })

  it('rejects non-contextual resume as team-count return', () => {
    expect(isContextualTeamCountReturn(hostResumeRecoveryState())).toBe(false)
    expect(setupFocusFromNavigation(hostResumeRecoveryState())).toBeNull()
  })
})
