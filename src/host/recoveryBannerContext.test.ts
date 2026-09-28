import { describe, expect, it } from 'vitest'
import type { SessionEvent } from '../state/events'
import { createSampleGame } from '../game/sampleGame'
import { describeRecoveryBanner, formatRecoveryHeading } from './recoveryBannerContext'

function base(type: SessionEvent['type'], overrides: Record<string, unknown> = {}): SessionEvent {
  return {
    id: `evt-${type}`,
    type,
    seq: 1,
    occurredAt: 1_000_000,
    reversible: false,
    ...overrides,
  } as SessionEvent
}

describe('describeRecoveryBanner', () => {
  it('names the Game, stage, and age when derivable', () => {
    const definition = createSampleGame()
    const events: SessionEvent[] = [
      base('SESSION_INITIALIZED', { sessionId: 's1', reversible: false }),
      base('GAME_INITIALIZED', { definition, reversible: false }),
    ]
    const context = describeRecoveryBanner(events, 1_000_000, 1_000_000 + 5 * 60_000)
    expect(context.gameTitle).toBe(definition.title)
    expect(context.stageLabel).toBe('class setup')
    expect(context.ageLabel).toBe('5 min ago')
    expect(formatRecoveryHeading('Unfinished class session', context)).toContain(definition.title)
  })

  it('labels in-play when board events exist', () => {
    const definition = createSampleGame()
    const events: SessionEvent[] = [
      base('GAME_INITIALIZED', { definition, reversible: false }),
      base('CURRENT_ROUND_SELECTED', {
        roundIndex: 0,
        roundId: definition.rounds[0]?.id ?? 'r1',
        support: 'supported',
        reversible: true,
      }),
    ]
    expect(describeRecoveryBanner(events, 1, 1).stageLabel).toBe('in play')
  })
})
