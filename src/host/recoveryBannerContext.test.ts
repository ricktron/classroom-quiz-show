import { describe, expect, it } from 'vitest'
import type { SessionEvent } from '../state/events'
import { createGameDefinition } from '../game/gameDefinition'
import { placeholderRound } from '../game/roundDefinition'
import { createSampleGame } from '../game/sampleGame'
import { createSessionStore } from '../state/store'
import { deriveHostPlayPosture } from '../session/hostPlayPosture'
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

function titledGame(id: string, title: string) {
  return createGameDefinition({
    id,
    title,
    rounds: [placeholderRound(`${id}-r1`, 'Round 1')],
  })
}

/** Game A play, then Game B init; optionally play Game B. */
function historyGameAThenGameB(options: { readonly playGameB: boolean }): readonly SessionEvent[] {
  const gameA = titledGame('game-a', 'Game A')
  const gameB = titledGame('game-b', options.playGameB ? 'Game B Play' : 'Game B Setup')
  const store = createSessionStore()
  store.dispatch({ type: 'INIT_SESSION', issuedAt: 1, sessionId: 's1' })
  store.dispatch({ type: 'INITIALIZE_GAME', issuedAt: 2, definition: gameA })
  store.dispatch({
    type: 'SELECT_ROUND',
    issuedAt: 3,
    roundId: gameA.rounds[0]!.id,
  })
  store.dispatch({ type: 'INITIALIZE_GAME', issuedAt: 4, definition: gameB })
  if (options.playGameB) {
    store.dispatch({
      type: 'SELECT_ROUND',
      issuedAt: 5,
      roundId: gameB.rounds[0]!.id,
    })
  }
  return store.getHistory()
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

  it('labels in-play when board events exist after the latest init', () => {
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
    expect(deriveHostPlayPosture({ history: events, canStartPlay: false })).toBe(true)
  })

  it('uses latest-init cut: Game A play then Game B init is class setup', () => {
    const history = historyGameAThenGameB({ playGameB: false })
    const context = describeRecoveryBanner(history, 1, 1)
    expect(context.gameTitle).toBe('Game B Setup')
    expect(context.stageLabel).toBe('class setup')
    expect(deriveHostPlayPosture({ history, canStartPlay: false })).toBe(false)
  })

  it('labels in play after Game B play following a prior Game A session', () => {
    const history = historyGameAThenGameB({ playGameB: true })
    const context = describeRecoveryBanner(history, 1, 1)
    expect(context.gameTitle).toBe('Game B Play')
    expect(context.stageLabel).toBe('in play')
    expect(deriveHostPlayPosture({ history, canStartPlay: false })).toBe(true)
  })

  it('does not call undone gameplay in play', () => {
    const definition = createSampleGame()
    const store = createSessionStore()
    store.dispatch({ type: 'INIT_SESSION', issuedAt: 1, sessionId: 's1' })
    store.dispatch({ type: 'INITIALIZE_GAME', issuedAt: 2, definition })
    store.dispatch({
      type: 'SELECT_ROUND',
      issuedAt: 3,
      roundId: definition.rounds[0]!.id,
    })
    store.dispatch({ type: 'UNDO', issuedAt: 4 })
    const history = store.getHistory()
    expect(history.some((event) => event.type === 'CURRENT_ROUND_SELECTED')).toBe(true)
    expect(history.some((event) => event.type === 'EVENT_UNDONE')).toBe(true)
    const context = describeRecoveryBanner(history, 1, 1)
    expect(context.stageLabel).toBe('class setup')
    expect(deriveHostPlayPosture({ history, canStartPlay: false })).toBe(false)
  })
})
