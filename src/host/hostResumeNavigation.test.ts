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

  it('builds contextual Fix team count return with Names focus (no Home Resume flag)', () => {
    const state = contextualTeamCountReturnState({ setupFocus: 'names' })
    expect(shouldResumeRecoveryFromNavigation(state)).toBe(false)
    expect(isContextualTeamCountReturn(state)).toBe(true)
    expect(setupFocusFromNavigation(state)).toBe('names')
  })

  it('rejects ordinary Home Resume as team-count return', () => {
    expect(isContextualTeamCountReturn(hostResumeRecoveryState())).toBe(false)
    expect(setupFocusFromNavigation(hostResumeRecoveryState())).toBeNull()
  })
})
