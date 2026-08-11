import { describe, expect, it } from 'vitest'
import {
  FULLY_DURABLE_SESSION,
  finalWagerCommitAcknowledgement,
  isActiveSessionHistoryDurable,
  type ActiveSessionDurabilityView,
} from './finalWagerCommitAcknowledgement'

function view(partial: Partial<ActiveSessionDurabilityView>): ActiveSessionDurabilityView {
  return {
    durableEventCount: 0,
    pendingEventCount: null,
    failed: false,
    storageAvailable: true,
    ...partial,
  }
}

describe('finalWagerCommitAcknowledgement', () => {
  it('A: does not claim Saved while persistence is still in flight', () => {
    expect(
      finalWagerCommitAcknowledgement(
        100,
        11,
        view({ durableEventCount: 10, pendingEventCount: 11 }),
      ),
    ).toBe('Saving…')
    expect(
      finalWagerCommitAcknowledgement(100, 11, view({ durableEventCount: 10 })),
    ).toBe('Saving…')
  })

  it('B: reports Saved only after durable acknowledgement', () => {
    expect(
      finalWagerCommitAcknowledgement(100, 11, view({ durableEventCount: 11 })),
    ).toBe('Saved: 100')
    expect(finalWagerCommitAcknowledgement(0, 11, view({ durableEventCount: 11 }))).toBe(
      'Saved: 0',
    )
  })

  it('D: persistence failure does not produce false Saved', () => {
    expect(
      finalWagerCommitAcknowledgement(
        100,
        11,
        view({ durableEventCount: 10, failed: true }),
      ),
    ).toBe('Could not save — try again')
  })

  it('does not claim Saved when storage is unavailable', () => {
    expect(
      finalWagerCommitAcknowledgement(
        100,
        11,
        view({ storageAvailable: false, durableEventCount: 11 }),
      ),
    ).toBe('On screen only — will not survive refresh')
  })

  it('keeps Not saved yet when nothing is committed in memory', () => {
    expect(finalWagerCommitAcknowledgement(null, 11, FULLY_DURABLE_SESSION)).toBe(
      'Not saved yet',
    )
  })
})

describe('isActiveSessionHistoryDurable', () => {
  it('requires catch-up durable count, no pending write, and no failure', () => {
    expect(isActiveSessionHistoryDurable(5, view({ durableEventCount: 5 }))).toBe(true)
    expect(isActiveSessionHistoryDurable(5, view({ durableEventCount: 4 }))).toBe(false)
    expect(
      isActiveSessionHistoryDurable(5, view({ durableEventCount: 5, pendingEventCount: 5 })),
    ).toBe(false)
    expect(isActiveSessionHistoryDurable(5, view({ durableEventCount: 5, failed: true }))).toBe(
      false,
    )
  })
})
