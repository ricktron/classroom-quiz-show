import { describe, expect, it } from 'vitest'
import { createMemoryChannelHub } from './channel'
import { createPublicStateBroadcaster } from './broadcaster'
import { createPublicStateReceiver } from './receiver'
import { encodeEnvelope } from './protocol'
import { createSessionStore, type SessionStore } from '../state/store'
import type { SessionCommand } from '../state/commands'
import type { PublicState } from '../state/publicState'
import { importGameFromUnknown } from '../import/importGame'
import { teamBoardGameFile, twoTeams } from '../test/teamFixtures'

/**
 * Host → display synchronization of team scores (Slice 6).
 *
 * A score is the payload a classroom argues about, so the transport guarantees
 * are re-proved specifically against it: the display never computes a total, only
 * a strictly-newer valid snapshot advances it, and a malformed scoreboard is
 * dropped rather than rendered.
 */

const AT = 1_000
const ROUND = 'board-round'

function teamStore(): SessionStore {
  const result = importGameFromUnknown(teamBoardGameFile(twoTeams()))
  if (result.status !== 'success') throw new Error('fixture failed to import')
  const store = createSessionStore()
  store.dispatch({ type: 'INIT_SESSION', issuedAt: AT, sessionId: 'SECRET-SESSION' })
  store.dispatch({ type: 'INITIALIZE_GAME', issuedAt: AT, definition: result.definition })
  store.dispatch({ type: 'ADVANCE_TO_NEXT_ROUND', issuedAt: AT })
  return store
}

const select = (tileId: string): SessionCommand => ({
  type: 'SELECT_CATEGORY_BOARD_TILE',
  issuedAt: AT,
  roundId: ROUND,
  tileId,
})
const revealPrompt: SessionCommand = {
  type: 'REVEAL_CATEGORY_BOARD_PROMPT',
  issuedAt: AT,
  roundId: ROUND,
}
const award = (teamId: string, delta: number, tileId: string): SessionCommand => ({
  type: 'ADJUST_TEAM_SCORE',
  issuedAt: AT,
  teamId,
  delta,
  mode: 'full-credit',
  source: { kind: 'category-board-tile', roundId: ROUND, tileId },
})
const undo: SessionCommand = { type: 'UNDO', issuedAt: AT }

/** A wired host/display pair over a deterministic in-memory channel. */
function wired() {
  const hub = createMemoryChannelHub()
  const store = teamStore()
  const received: PublicState[] = []

  const broadcaster = createPublicStateBroadcaster({
    getSnapshot: () => store.getPublicState(),
    channel: hub.createChannel(),
  })
  const receiver = createPublicStateReceiver({
    onState: (state) => received.push(state),
    channel: hub.createChannel(),
  })
  store.subscribe(() => broadcaster.publish(store.getPublicState()))
  broadcaster.publish(store.getPublicState())

  return {
    store,
    received,
    hub,
    close: () => {
      receiver.close()
      broadcaster.close()
    },
  }
}

/** The scores of the latest snapshot the display accepted. */
function latestScores(received: readonly PublicState[]): readonly number[] {
  const last = received.at(-1)
  if (last?.teams?.status !== 'available') throw new Error('expected an available scoreboard')
  return last.teams.teams.map((team) => team.score)
}

/**
 * A snapshot with the Slice 6 field removed, used to prove a version-4 payload
 * that omits it is rejected. Built by naming the surviving fields rather than by
 * destructure-and-discard, so nothing is left unused.
 */
function omitTeams(state: PublicState): Record<string, unknown> {
  return {
    schemaVersion: state.schemaVersion,
    revision: state.revision,
    phase: state.phase,
    headline: state.headline,
    detail: state.detail,
    game: state.game,
    round: state.round,
  }
}

describe('a host score action reaches the display', () => {
  it('delivers the new totals, in authored order', () => {
    const { store, received, close } = wired()
    store.dispatch(select('alpha-100'))
    store.dispatch(revealPrompt)
    store.dispatch(award('blue', 100, 'alpha-100'))

    expect(latestScores(received)).toEqual([0, 100])
    close()
  })

  it('delivers a negative total', () => {
    const { store, received, close } = wired()
    store.dispatch({
      type: 'ADJUST_TEAM_SCORE',
      issuedAt: AT,
      teamId: 'red',
      delta: -250,
      mode: 'manual-correction',
      source: { kind: 'manual' },
    })
    expect(latestScores(received)).toEqual([-250, 0])
    close()
  })

  it('returns the display to the PRIOR total when the host undoes the score', () => {
    const { store, received, close } = wired()
    store.dispatch(select('alpha-100'))
    store.dispatch(revealPrompt)
    store.dispatch(award('red', 100, 'alpha-100'))
    expect(latestScores(received)).toEqual([100, 0])

    store.dispatch(undo)
    expect(latestScores(received)).toEqual([0, 0])
    close()
  })

  it('sends only sanitized state — no score history and no team ids', () => {
    const { store, received, close } = wired()
    store.dispatch({ type: 'SET_HOST_NOTE', issuedAt: AT, note: 'HOST-MEMO' })
    store.dispatch(select('alpha-100'))
    store.dispatch(revealPrompt)
    store.dispatch(award('red', 100, 'alpha-100'))

    const serialized = JSON.stringify(received)
    for (const forbidden of [
      'HOST-MEMO',
      'SECRET-SESSION',
      'TEAM_SCORE_ADJUSTED',
      'EVENT_UNDONE',
      'full-credit',
      'delta',
      '"red"',
      '"blue"',
      'ALPHA-TEACHER-NOTE-100',
    ]) {
      expect(serialized).not.toContain(forbidden)
    }
    close()
  })

  it('publishes a scoreboard on the very first snapshot, before any scoring', () => {
    const { received, close } = wired()
    expect(latestScores(received)).toEqual([0, 0])
    close()
  })
})

describe('the display never becomes authoritative', () => {
  it('does not compute or accumulate a total — it only stores what it is sent', () => {
    const { store, received, close } = wired()
    store.dispatch(select('alpha-100'))
    store.dispatch(revealPrompt)
    store.dispatch(award('red', 100, 'alpha-100'))

    // Every snapshot's scoreboard is a complete, host-computed total. The
    // sequence never shows a partial or locally-summed value.
    const totals = received.map((state) =>
      state.teams?.status === 'available' ? state.teams.teams[0].score : null,
    )
    expect(totals).toEqual([0, 0, 0, 100])
    close()
  })

  it('cannot push a score back at the host', () => {
    const { store, hub, close } = wired()
    const intruder = hub.createChannel()
    const before = JSON.stringify(store.getState())

    const forged = store.getPublicState()
    intruder.post(
      encodeEnvelope({
        type: 'public-state', sentAt: 1_700_000_000_000,
        revision: 9_999,
        payload: {
          ...forged,
          teams: { status: 'available', teams: [{ key: 't0', name: 'Hacked', accent: 'crimson', score: 9_999 }] },
        },
      }),
    )

    expect(JSON.stringify(store.getState())).toBe(before)
    intruder.close()
    close()
  })
})

describe('stale, duplicate and malformed payloads', () => {
  it('ignores a STALE revision, keeping the newer total on screen', () => {
    const { store, received, hub, close } = wired()
    store.dispatch(select('alpha-100'))
    store.dispatch(revealPrompt)
    store.dispatch(award('red', 100, 'alpha-100'))
    const countAfterAward = received.length

    const intruder = hub.createChannel()
    intruder.post(
      encodeEnvelope({
        type: 'public-state', sentAt: 1_700_000_000_000,
        revision: 1,
        payload: {
          ...store.getPublicState(),
          revision: 1,
          teams: { status: 'available', teams: [{ key: 't0', name: 'Red Team', accent: 'crimson', score: 0 }] },
        },
      }),
    )

    expect(received).toHaveLength(countAfterAward)
    expect(latestScores(received)).toEqual([100, 0])
    intruder.close()
    close()
  })

  it('ignores a DUPLICATE revision', () => {
    const { store, received, hub, close } = wired()
    store.dispatch(select('alpha-100'))
    const snapshot = store.getPublicState()
    const countBefore = received.length

    const intruder = hub.createChannel()
    intruder.post(encodeEnvelope({ type: 'public-state', sentAt: 1_700_000_000_000, revision: snapshot.revision, payload: snapshot }))
    expect(received).toHaveLength(countBefore)
    intruder.close()
    close()
  })

  it('drops a payload whose scoreboard is malformed', () => {
    const { store, received, hub, close } = wired()
    const countBefore = received.length
    const intruder = hub.createChannel()

    for (const teams of [
      { status: 'available', teams: [{ key: 't0', name: 'Red', accent: 'crimson', score: 0.5 }] },
      { status: 'available', teams: [{ key: 't0', name: 'Red', accent: 'crimson', score: Number.NaN }] },
      { status: 'available', teams: [{ key: 't0', name: 'Red', accent: '#ff0000', score: 0 }] },
      { status: 'available', teams: [{ key: 't0', name: 'Red', accent: 'crimson', score: '10' }] },
      { status: 'sideways', teams: [] },
      'scores',
    ]) {
      intruder.post(
        encodeEnvelope({
          type: 'public-state', sentAt: 1_700_000_000_000,
          revision: 9_999,
          payload: { ...store.getPublicState(), revision: 9_999, teams } as never,
        }),
      )
    }

    expect(received).toHaveLength(countBefore)
    intruder.close()
    close()
  })

  it('drops a payload pinned to the previous wire version', () => {
    const { store, received, hub, close } = wired()
    const countBefore = received.length
    const intruder = hub.createChannel()
    const withoutTeams = omitTeams(store.getPublicState())

    intruder.post(
      encodeEnvelope({
        type: 'public-state', sentAt: 1_700_000_000_000,
        revision: 9_999,
        payload: { ...withoutTeams, schemaVersion: 3, revision: 9_999 } as never,
      }),
    )

    expect(received).toHaveLength(countBefore)
    intruder.close()
    close()
  })
})

describe('a display that joins late', () => {
  it('receives the current totals when it asks for state', () => {
    const hub = createMemoryChannelHub()
    const store = teamStore()
    const broadcaster = createPublicStateBroadcaster({
      getSnapshot: () => store.getPublicState(),
      channel: hub.createChannel(),
    })
    store.subscribe(() => broadcaster.publish(store.getPublicState()))

    store.dispatch(select('alpha-100'))
    store.dispatch(revealPrompt)
    store.dispatch(award('red', 100, 'alpha-100'))

    // Only now does a projector open.
    const received: PublicState[] = []
    const receiver = createPublicStateReceiver({
      onState: (state) => received.push(state),
      channel: hub.createChannel(),
    })

    expect(latestScores(received)).toEqual([100, 0])
    receiver.close()
    broadcaster.close()
  })
})
