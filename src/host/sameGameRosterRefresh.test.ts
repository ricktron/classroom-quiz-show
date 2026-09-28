import { describe, expect, it } from 'vitest'
import { ownsSameGameRosterRefresh } from './sameGameRosterRefresh'

const BASE = {
  attempt: 2,
  latestAttempt: 2,
  requestPlayGameId: 'game-a',
  currentPlayGameId: 'game-a',
  requestStoreEpoch: 3,
  currentStoreEpoch: 3,
  requestLiveTeamSig: 'sig-live',
  currentLiveTeamSig: 'sig-live',
} as const

describe('ownsSameGameRosterRefresh', () => {
  it('allows the latest matching attempt to act', () => {
    expect(ownsSameGameRosterRefresh(BASE)).toBe(true)
  })

  it('rejects a superseded attempt (Strict Mode / newer request)', () => {
    expect(ownsSameGameRosterRefresh({ ...BASE, attempt: 1, latestAttempt: 2 })).toBe(false)
  })

  it('rejects when playGameId drifted away from the request', () => {
    expect(ownsSameGameRosterRefresh({ ...BASE, currentPlayGameId: 'game-b' })).toBe(false)
    expect(ownsSameGameRosterRefresh({ ...BASE, currentPlayGameId: null })).toBe(false)
  })

  it('rejects when Session store epoch drifted', () => {
    expect(ownsSameGameRosterRefresh({ ...BASE, currentStoreEpoch: 4 })).toBe(false)
  })

  it('rejects when live team signature changed under the request', () => {
    expect(ownsSameGameRosterRefresh({ ...BASE, currentLiveTeamSig: 'sig-other' })).toBe(false)
  })
})
