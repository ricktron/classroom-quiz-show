import { describe, expect, it } from 'vitest'
import { decideUnsavedHashLeave } from './unsavedNavigationGuard'

describe('unsaved hash leave guard', () => {
  it('reverts an unexpected hash change while dirty', () => {
    expect(
      decideUnsavedHashLeave({
        dirty: true,
        allowLeave: false,
        allowedHash: '#/edit/game-1',
        nextHash: '#/',
      }),
    ).toEqual({ revertTo: '#/edit/game-1', attempted: '#/' })
  })

  it('allows the same hash, a clean editor, or an explicit discard', () => {
    expect(
      decideUnsavedHashLeave({
        dirty: true,
        allowLeave: false,
        allowedHash: '#/edit/game-1',
        nextHash: '#/edit/game-1',
      }),
    ).toBe('allow')
    expect(
      decideUnsavedHashLeave({
        dirty: false,
        allowLeave: false,
        allowedHash: '#/edit/game-1',
        nextHash: '#/',
      }),
    ).toBe('allow')
    expect(
      decideUnsavedHashLeave({
        dirty: true,
        allowLeave: true,
        allowedHash: '#/edit/game-1',
        nextHash: '#/',
      }),
    ).toBe('allow')
  })
})
