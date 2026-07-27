import { describe, expect, it } from 'vitest'
import {
  ACTIVE_RESPONSE_RESOLUTION_KINDS,
  ACTIVE_RESPONSE_RESOLUTION_LABEL,
  activeRespondent,
  appendBuzz,
  buzzQueueStatus,
  EMPTY_BUZZ_QUEUE,
  hasTeamBuzzed,
  isActiveResponseResolution,
  isBuzzQueueState,
  isEmptyBuzzQueue,
  isQueueExhausted,
  promoteNext,
  resolvedRespondents,
  waitingRespondents,
  type BuzzQueueState,
} from './buzzQueue'

/**
 * The ordered buzz queue as a pure data structure (Slice 8, OG-2 and OG-3).
 *
 * The claims proved here, all without a store or an event:
 *  - a team appears at most once per response opportunity;
 *  - promotion moves a pointer, so the remaining order is preserved exactly;
 *  - EMPTY (nobody buzzed) and EXHAUSTED (everybody who buzzed had a turn) are
 *    distinct situations and cannot be confused;
 *  - every derived question has one derivation, so no surface can disagree with
 *    another about who is active.
 */

function queue(order: readonly string[], resolvedCount = 0): BuzzQueueState {
  return { order, resolvedCount }
}

describe('an empty queue', () => {
  it('has nobody active and nobody waiting', () => {
    expect(isEmptyBuzzQueue(EMPTY_BUZZ_QUEUE)).toBe(true)
    expect(activeRespondent(EMPTY_BUZZ_QUEUE)).toBeNull()
    expect(waitingRespondents(EMPTY_BUZZ_QUEUE)).toEqual([])
    expect(isQueueExhausted(EMPTY_BUZZ_QUEUE)).toBe(false)
    expect(buzzQueueStatus(EMPTY_BUZZ_QUEUE)).toEqual({ status: 'empty' })
  })
})

describe('appending buzzes', () => {
  it('makes the FIRST accepted buzz the active respondent', () => {
    const first = appendBuzz(EMPTY_BUZZ_QUEUE, 'red')
    expect(first && activeRespondent(first)).toBe('red')
    expect(first && waitingRespondents(first)).toEqual([])
  })

  it('puts later buzzes behind it, in accepted order', () => {
    let current: BuzzQueueState = EMPTY_BUZZ_QUEUE
    for (const team of ['red', 'blue', 'green']) {
      const next = appendBuzz(current, team)
      expect(next).not.toBeNull()
      current = next as BuzzQueueState
    }
    expect(activeRespondent(current)).toBe('red')
    expect(waitingRespondents(current)).toEqual(['blue', 'green'])
  })

  it('refuses a team that is already active', () => {
    expect(appendBuzz(queue(['red']), 'red')).toBeNull()
  })

  it('refuses a team that is already waiting', () => {
    expect(appendBuzz(queue(['red', 'blue']), 'blue')).toBeNull()
  })

  /**
   * The reason resolved teams stay in `order`: a team that answered and got it
   * wrong must not be able to buzz again for the same clue.
   */
  it('refuses a team whose turn is already over', () => {
    expect(appendBuzz(queue(['red', 'blue'], 1), 'red')).toBeNull()
    expect(hasTeamBuzzed(queue(['red', 'blue'], 1), 'red')).toBe(true)
  })

  it('never mutates the queue it is given', () => {
    const before = queue(['red'])
    appendBuzz(before, 'blue')
    expect(before.order).toEqual(['red'])
  })
})

describe('promotion', () => {
  it('promotes the next queued team and preserves the remaining order', () => {
    const promoted = promoteNext(queue(['red', 'blue', 'green']))
    expect(promoted && activeRespondent(promoted)).toBe('blue')
    expect(promoted && waitingRespondents(promoted)).toEqual(['green'])
    expect(promoted && resolvedRespondents(promoted)).toEqual(['red'])
  })

  it('keeps the queue identity — it does not build a new one', () => {
    const before = queue(['red', 'blue'])
    const after = promoteNext(before)
    // The order array is the SAME reference: only the pointer moved, so nothing
    // can be lost, reordered or duplicated by a promotion.
    expect(after?.order).toBe(before.order)
  })

  it('ends in an EXHAUSTED queue, distinct from an empty one', () => {
    const one = promoteNext(queue(['red']))
    expect(one && activeRespondent(one)).toBeNull()
    expect(one && isQueueExhausted(one)).toBe(true)
    expect(one && isEmptyBuzzQueue(one)).toBe(false)
    expect(one && buzzQueueStatus(one)).toEqual({ status: 'exhausted' })
    // …and an empty queue is emphatically not exhausted.
    expect(buzzQueueStatus(EMPTY_BUZZ_QUEUE)).toEqual({ status: 'empty' })
  })

  it('refuses to promote when there is no active respondent', () => {
    expect(promoteNext(EMPTY_BUZZ_QUEUE)).toBeNull()
    expect(promoteNext(queue(['red'], 1))).toBeNull()
  })

  it('lets a queue continue after a promotion', () => {
    const promoted = promoteNext(queue(['red', 'blue'])) as BuzzQueueState
    const joined = appendBuzz(promoted, 'green') as BuzzQueueState
    expect(activeRespondent(joined)).toBe('blue')
    expect(waitingRespondents(joined)).toEqual(['green'])
  })
})

describe('the derived status', () => {
  it('describes an active queue exactly once, from one derivation', () => {
    const status = buzzQueueStatus(queue(['red', 'blue', 'green'], 1))
    expect(status).toEqual({
      status: 'active',
      activeTeamId: 'blue',
      waitingTeamIds: ['green'],
    })
  })
})

describe('the structural guard', () => {
  it('accepts a well-formed queue', () => {
    expect(isBuzzQueueState(EMPTY_BUZZ_QUEUE)).toBe(true)
    expect(isBuzzQueueState(queue(['red', 'blue'], 1))).toBe(true)
  })

  it('refuses an impossible queue rather than letting it into state', () => {
    for (const value of [
      null,
      'red',
      {},
      { order: 'red', resolvedCount: 0 },
      { order: ['red'], resolvedCount: -1 },
      // A pointer past the end is not "exhausted", it is corrupt.
      { order: ['red'], resolvedCount: 2 },
      { order: ['red', 'red'], resolvedCount: 0 },
      { order: [''], resolvedCount: 0 },
      { order: [1], resolvedCount: 0 },
      { order: ['red'], resolvedCount: 0.5 },
    ]) {
      expect(isBuzzQueueState(value), JSON.stringify(value)).toBe(false)
    }
  })
})

describe('the resolution vocabulary', () => {
  it('has exactly two members, and neither one is "correct"', () => {
    expect(ACTIVE_RESPONSE_RESOLUTION_KINDS).toEqual(['incorrect', 'passed'])
    expect(isActiveResponseResolution({ kind: 'incorrect' })).toBe(true)
    expect(isActiveResponseResolution({ kind: 'passed' })).toBe(true)
    // A correct answer ENDS the opportunity (reveal the answer); it does not
    // promote anyone, so there is deliberately no member for it.
    expect(isActiveResponseResolution({ kind: 'correct' })).toBe(false)
  })

  it('fails closed on anything else', () => {
    for (const value of [null, undefined, 'incorrect', {}, { kind: '' }, { kind: 'skip' }]) {
      expect(isActiveResponseResolution(value), JSON.stringify(value)).toBe(false)
    }
  })

  it('has host-facing copy for both, and neither mentions points', () => {
    const copy = Object.values(ACTIVE_RESPONSE_RESOLUTION_LABEL).join(' ').toLowerCase()
    expect(copy.length).toBeGreaterThan(0)
    for (const forbidden of ['point', 'score', 'deduct', 'award', 'penalty']) {
      expect(copy, `must not contain ${forbidden}`).not.toContain(forbidden)
    }
  })
})
