import { describe, expect, it } from 'vitest'
import type {
  EventUndoneEvent,
  FinalTeamSettledEvent,
  SessionEvent,
  TeamScoreAdjustedEvent,
} from '../state/events'
import { lastScoreChangeOf } from './lastScoreChange'

function boardAward(seq: number, teamId: string, delta: number): TeamScoreAdjustedEvent {
  return {
    id: `evt-${seq}`,
    type: 'TEAM_SCORE_ADJUSTED',
    seq,
    occurredAt: 1000 + seq,
    reversible: true,
    teamId,
    delta,
    mode: delta > 0 ? 'full-credit' : 'deduction',
    source: { kind: 'category-board-tile', roundId: 'board-round', tileId: 'science-200' },
  }
}

function settled(
  seq: number,
  teamId: string,
  wager: number,
  outcome: FinalTeamSettledEvent['outcome'],
): FinalTeamSettledEvent {
  return {
    id: `evt-${seq}`,
    type: 'FINAL_TEAM_SETTLED',
    seq,
    occurredAt: 1000 + seq,
    reversible: true,
    roundId: 'final-round',
    teamId,
    wager,
    outcome,
    delta: outcome === 'correct' ? wager : -wager,
  }
}

function undo(seq: number, targetEventId: string): EventUndoneEvent {
  return {
    id: `evt-${seq}`,
    type: 'EVENT_UNDONE',
    seq,
    occurredAt: 1000 + seq,
    reversible: false,
    targetEventId,
  }
}

describe('lastScoreChangeOf', () => {
  it('is null when no score has moved', () => {
    expect(lastScoreChangeOf([])).toBeNull()
  })

  it('names the latest board adjustment and its mode', () => {
    expect(lastScoreChangeOf([boardAward(0, 'alpha', 200)])).toEqual({
      teamId: 'alpha',
      delta: 200,
      reason: 'full credit',
    })
  })

  it('names a later Final settlement instead of the earlier board award (R1 item 10)', () => {
    const history: SessionEvent[] = [
      boardAward(0, 'alpha', 200),
      settled(1, 'alpha', 200, 'incorrect'),
    ]
    expect(lastScoreChangeOf(history)).toEqual({
      teamId: 'alpha',
      delta: -200,
      reason: 'Final, incorrect',
    })
  })

  it('labels correct and no-response settlements', () => {
    expect(lastScoreChangeOf([settled(0, 'bravo', 50, 'correct')])?.reason).toBe('Final, correct')
    expect(lastScoreChangeOf([settled(0, 'bravo', 50, 'no-response')])).toEqual({
      teamId: 'bravo',
      delta: -50,
      reason: 'Final, no response',
    })
  })

  it('skips a zero-wager settlement because no points moved', () => {
    const history: SessionEvent[] = [boardAward(0, 'alpha', 200), settled(1, 'bravo', 0, 'correct')]
    expect(lastScoreChangeOf(history)).toEqual({
      teamId: 'alpha',
      delta: 200,
      reason: 'full credit',
    })
  })

  it('never names an undone settlement', () => {
    const history: SessionEvent[] = [
      boardAward(0, 'alpha', 200),
      settled(1, 'alpha', 200, 'incorrect'),
      undo(2, 'evt-1'),
    ]
    expect(lastScoreChangeOf(history)?.reason).toBe('full credit')
    expect(lastScoreChangeOf(history)?.delta).toBe(200)
  })

  it('names a manual correction made after a Final settlement', () => {
    const history: SessionEvent[] = [
      settled(0, 'alpha', 200, 'incorrect'),
      { ...boardAward(1, 'alpha', 100), mode: 'manual-correction', source: { kind: 'manual' } },
    ]
    expect(lastScoreChangeOf(history)).toEqual({
      teamId: 'alpha',
      delta: 100,
      reason: 'manual correction',
    })
  })
})
