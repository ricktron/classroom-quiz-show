import { describe, expect, it, vi } from 'vitest'
import type { SessionCommand } from '../state/commands'
import { createSessionStore } from '../state/store'
import { importGameFromUnknown } from '../import/importGame'
import { richBoardConfig } from '../test/categoryBoardFixtures'
import { teamBoardGameFile } from '../test/teamFixtures'
import { observePresentationCues } from './observePresentationCues'
import type { PresentationCueId } from './presentationCueId'

const AT = 2_000_000
const ROUND = 'board-round'
const TILE = 'alpha-100'

function definition() {
  const result = importGameFromUnknown(
    teamBoardGameFile(
      [
        { id: 'red', name: 'Red Team', accent: 'crimson' },
        { id: 'blue', name: 'Blue Team', accent: 'azure' },
      ],
      richBoardConfig(),
    ),
  )
  if (result.status !== 'success') throw new Error('fixture failed')
  return result.definition
}

function armedStoreWithHistory() {
  const store = createSessionStore()
  store.dispatch({ type: 'INIT_SESSION', issuedAt: AT, sessionId: 's' })
  store.dispatch({ type: 'INITIALIZE_GAME', issuedAt: AT, definition: definition() })
  store.dispatch({ type: 'ADVANCE_TO_NEXT_ROUND', issuedAt: AT })
  store.dispatch({ type: 'SELECT_CATEGORY_BOARD_TILE', issuedAt: AT, roundId: ROUND, tileId: TILE })
  store.dispatch({ type: 'REVEAL_CATEGORY_BOARD_PROMPT', issuedAt: AT, roundId: ROUND })
  store.dispatch({ type: 'ARM_RESPONSE_PHASE', issuedAt: AT, roundId: ROUND })
  store.dispatch({
    type: 'RECORD_TEAM_BUZZ',
    issuedAt: AT,
    roundId: ROUND,
    tileId: TILE,
    teamId: 'red',
  })
  store.dispatch({
    type: 'ADJUST_TEAM_SCORE',
    issuedAt: AT,
    teamId: 'red',
    delta: 100,
    mode: 'full-credit',
    source: { kind: 'category-board-tile', roundId: ROUND, tileId: TILE },
  })
  return store
}

describe('observePresentationCues', () => {
  it('mount with historical cue-worthy events → zero playback', () => {
    const store = armedStoreWithHistory()
    const onCue = vi.fn()
    const observer = observePresentationCues({ store, onCue })
    expect(onCue).not.toHaveBeenCalled()
    expect(observer.watermark).toBe(store.getHistory().length)
    observer.detach()
  })

  it('append one live eligible event → one cue; rerender subscription does not repeat', () => {
    const store = createSessionStore()
    store.dispatch({ type: 'INIT_SESSION', issuedAt: AT, sessionId: 's' })
    store.dispatch({ type: 'INITIALIZE_GAME', issuedAt: AT, definition: definition() })
    store.dispatch({ type: 'ADVANCE_TO_NEXT_ROUND', issuedAt: AT })
    const onCue = vi.fn()
    const observer = observePresentationCues({ store, onCue })
    store.dispatch({ type: 'END_GAME_SESSION', issuedAt: AT })
    expect(onCue).toHaveBeenCalledTimes(1)
    expect(onCue.mock.calls[0]?.[0]).toBe('game-complete')
    // No further notify without append.
    expect(onCue).toHaveBeenCalledTimes(1)
    observer.detach()
  })

  it('recovery mount → zero old cues', () => {
    const recovered = armedStoreWithHistory()
    const store = createSessionStore({ initialHistory: recovered.getHistory() })
    const onCue = vi.fn()
    observePresentationCues({ store, onCue }).detach()
    expect(onCue).not.toHaveBeenCalled()
  })

  it('SessionStore replacement rebaselines; later new event → one cue', () => {
    const first = armedStoreWithHistory()
    const plays: PresentationCueId[] = []
    let observer = observePresentationCues({
      store: first,
      onCue: (cue) => {
        plays.push(cue)
      },
    })
    observer.detach()

    const second = createSessionStore({ initialHistory: first.getHistory() })
    observer = observePresentationCues({
      store: second,
      onCue: (cue) => {
        plays.push(cue)
      },
    })
    expect(plays).toEqual([])
    second.dispatch({ type: 'END_GAME_SESSION', issuedAt: AT + 1 })
    expect(plays).toEqual(['game-complete'])
    observer.detach()
  })

  it('undo → no compensating cue', () => {
    const store = createSessionStore()
    store.dispatch({ type: 'INIT_SESSION', issuedAt: AT, sessionId: 's' })
    store.dispatch({ type: 'INITIALIZE_GAME', issuedAt: AT, definition: definition() })
    store.dispatch({ type: 'ADVANCE_TO_NEXT_ROUND', issuedAt: AT })
    store.dispatch({ type: 'SELECT_CATEGORY_BOARD_TILE', issuedAt: AT, roundId: ROUND, tileId: TILE })
    store.dispatch({ type: 'REVEAL_CATEGORY_BOARD_PROMPT', issuedAt: AT, roundId: ROUND })
    const plays: PresentationCueId[] = []
    const observer = observePresentationCues({
      store,
      onCue: (cue) => {
        plays.push(cue)
      },
    })
    store.dispatch({
      type: 'ADJUST_TEAM_SCORE',
      issuedAt: AT,
      teamId: 'red',
      delta: 100,
      mode: 'full-credit',
      source: { kind: 'category-board-tile', roundId: ROUND, tileId: TILE },
    })
    expect(plays).toEqual(['positive-award'])
    store.dispatch({ type: 'UNDO', issuedAt: AT + 1 })
    expect(plays).toEqual(['positive-award'])
    observer.detach()
  })

  it('muted/unactivated/failed handler still consumes; unmute has no backlog', () => {
    const store = createSessionStore()
    store.dispatch({ type: 'INIT_SESSION', issuedAt: AT, sessionId: 's' })
    store.dispatch({ type: 'INITIALIZE_GAME', issuedAt: AT, definition: definition() })
    store.dispatch({ type: 'ADVANCE_TO_NEXT_ROUND', issuedAt: AT })
    const plays: PresentationCueId[] = []
    let allowPlay = false
    const observer = observePresentationCues({
      store,
      onCue: (cue) => {
        if (!allowPlay) return
        plays.push(cue)
      },
    })
    store.dispatch({ type: 'END_GAME_SESSION', issuedAt: AT })
    expect(plays).toEqual([])
    allowPlay = true
    // No backlog after enabling.
    expect(plays).toEqual([])
    observer.detach()
  })

  it('playback failure is consumed; later healthy cue still plays', () => {
    const store = createSessionStore()
    store.dispatch({ type: 'INIT_SESSION', issuedAt: AT, sessionId: 's' })
    store.dispatch({ type: 'INITIALIZE_GAME', issuedAt: AT, definition: definition() })
    store.dispatch({ type: 'ADVANCE_TO_NEXT_ROUND', issuedAt: AT })
    store.dispatch({ type: 'SELECT_CATEGORY_BOARD_TILE', issuedAt: AT, roundId: ROUND, tileId: TILE })
    store.dispatch({ type: 'REVEAL_CATEGORY_BOARD_PROMPT', issuedAt: AT, roundId: ROUND })
    const plays: PresentationCueId[] = []
    let shouldThrow = true
    const observer = observePresentationCues({
      store,
      onCue: (cue) => {
        if (shouldThrow) {
          shouldThrow = false
          throw new Error('speaker failed')
        }
        plays.push(cue)
      },
    })
    store.dispatch({
      type: 'ADJUST_TEAM_SCORE',
      issuedAt: AT,
      teamId: 'red',
      delta: 100,
      mode: 'full-credit',
      source: { kind: 'category-board-tile', roundId: ROUND, tileId: TILE },
    })
    expect(plays).toEqual([])
    store.dispatch({
      type: 'ADJUST_TEAM_SCORE',
      issuedAt: AT + 1,
      teamId: 'blue',
      delta: 50,
      mode: 'partial-credit',
      source: { kind: 'category-board-tile', roundId: ROUND, tileId: TILE },
    })
    expect(plays).toEqual(['positive-award'])
    observer.detach()
  })

  it('multi-event append preserves deterministic sequence and collapses double-cue cases', () => {
    const store = createSessionStore()
    store.dispatch({ type: 'INIT_SESSION', issuedAt: AT, sessionId: 's' })
    store.dispatch({ type: 'INITIALIZE_GAME', issuedAt: AT, definition: definition() })
    store.dispatch({ type: 'ADVANCE_TO_NEXT_ROUND', issuedAt: AT })
    store.dispatch({ type: 'SELECT_CATEGORY_BOARD_TILE', issuedAt: AT, roundId: ROUND, tileId: TILE })
    store.dispatch({ type: 'REVEAL_CATEGORY_BOARD_PROMPT', issuedAt: AT, roundId: ROUND })
    store.dispatch({ type: 'ARM_RESPONSE_PHASE', issuedAt: AT, roundId: ROUND })
    const plays: PresentationCueId[] = []
    const observer = observePresentationCues({
      store,
      onCue: (cue) => {
        plays.push(cue)
      },
    })
    store.dispatch({
      type: 'RECORD_TEAM_BUZZ',
      issuedAt: AT,
      roundId: ROUND,
      tileId: TILE,
      teamId: 'red',
    })
    store.dispatch({
      type: 'RECORD_TEAM_BUZZ',
      issuedAt: AT + 1,
      roundId: ROUND,
      tileId: TILE,
      teamId: 'blue',
    })
    store.dispatch({
      type: 'RESOLVE_ACTIVE_RESPONSE',
      issuedAt: AT + 2,
      roundId: ROUND,
      tileId: TILE,
      resolution: { kind: 'incorrect' },
    } satisfies SessionCommand)
    expect(plays).toEqual(['active-claim', 'incorrect'])
    observer.detach()
  })

  it('detaches cleanly and ignores later events', () => {
    const store = createSessionStore()
    store.dispatch({ type: 'INIT_SESSION', issuedAt: AT, sessionId: 's' })
    store.dispatch({ type: 'INITIALIZE_GAME', issuedAt: AT, definition: definition() })
    const onCue = vi.fn()
    const observer = observePresentationCues({ store, onCue })
    observer.detach()
    observer.detach()
    store.dispatch({ type: 'END_GAME_SESSION', issuedAt: AT })
    expect(onCue).not.toHaveBeenCalled()
  })

  it('long existing history does not cause historical sound replay', () => {
    const store = armedStoreWithHistory()
    for (let i = 0; i < 20; i += 1) {
      store.dispatch({ type: 'MARK_WAITING', issuedAt: AT + i })
    }
    const onCue = vi.fn()
    observePresentationCues({ store, onCue }).detach()
    expect(onCue).not.toHaveBeenCalled()
  })
})
