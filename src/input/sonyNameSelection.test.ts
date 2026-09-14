import { describe, expect, it } from 'vitest'
import { PRIMARY_BUZZ } from './logicalAction'
import {
  choiceColorLabel,
  intentFromSonyNameAction,
  shouldAcceptSonyNamePress,
  SONY_NAME_SELECTION_DEBOUNCE_MS,
} from './sonyNameSelection'

describe('Sony name-selection mapping', () => {
  it('maps Yellow/Green/Orange/Blue to choices 1–4', () => {
    expect(intentFromSonyNameAction({ kind: 'secondary', slot: 'secondary4' })).toEqual({
      kind: 'claim',
      choiceIndex: 0,
      color: 'yellow',
    })
    expect(intentFromSonyNameAction({ kind: 'secondary', slot: 'secondary3' })).toEqual({
      kind: 'claim',
      choiceIndex: 1,
      color: 'green',
    })
    expect(intentFromSonyNameAction({ kind: 'secondary', slot: 'secondary2' })).toEqual({
      kind: 'claim',
      choiceIndex: 2,
      color: 'orange',
    })
    expect(intentFromSonyNameAction({ kind: 'secondary', slot: 'secondary1' })).toEqual({
      kind: 'claim',
      choiceIndex: 3,
      color: 'blue',
    })
  })

  it('maps Red to cycle and never to a claim', () => {
    expect(intentFromSonyNameAction(PRIMARY_BUZZ)).toEqual({ kind: 'cycle' })
  })

  it('keeps non-color labels for each choice', () => {
    expect(choiceColorLabel('yellow', 0)).toBe('Choice 1, Yellow')
    expect(choiceColorLabel('blue', 3)).toBe('Choice 4, Blue')
  })

  it('debounces only a repeated same-team same-intent hardware bounce', () => {
    const first = {
      teamId: 'a',
      intentKey: 'cycle',
      now: 1000,
      last: { teamId: 'a', intentKey: 'cycle', at: 1000 - (SONY_NAME_SELECTION_DEBOUNCE_MS - 1) },
    }
    expect(shouldAcceptSonyNamePress(first)).toBe(false)
    expect(
      shouldAcceptSonyNamePress({
        ...first,
        now: 1000 + SONY_NAME_SELECTION_DEBOUNCE_MS,
      }),
    ).toBe(true)
    expect(
      shouldAcceptSonyNamePress({
        teamId: 'b',
        intentKey: 'cycle',
        now: 1000,
        last: { teamId: 'a', intentKey: 'cycle', at: 1000 },
      }),
    ).toBe(true)
  })
})
