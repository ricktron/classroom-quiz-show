import { describe, expect, it, vi } from 'vitest'
import { createMemoryChannelHub } from './channel'
import { createPublicStateBroadcaster } from './broadcaster'
import { createPublicStateReceiver } from './receiver'
import { encodeEnvelope } from './protocol'
import { createSessionStore, type SessionStore } from '../state/store'
import type { SessionCommand } from '../state/commands'
import type { PublicState } from '../state/publicState'
import { importGameFromUnknown } from '../import/importGame'
import { boardGameFile, richBoardConfig } from '../test/categoryBoardFixtures'

/**
 * Host → display synchronization for a live category board (Slice 5).
 *
 * The board is the first payload with real gameplay content on it, so these
 * tests re-prove the transport guarantees against it specifically: only
 * sanitized state crosses, stale/duplicate revisions are ignored, a malformed
 * board payload is dropped, and the display never becomes authoritative.
 */

const AT = 1_000
const ROUND = 'board-round'

function boardStore(): SessionStore {
  const result = importGameFromUnknown(boardGameFile(richBoardConfig()))
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
const revealPrompt: SessionCommand = { type: 'REVEAL_CATEGORY_BOARD_PROMPT', issuedAt: AT, roundId: ROUND }
const revealAnswer: SessionCommand = { type: 'REVEAL_CATEGORY_BOARD_ANSWER', issuedAt: AT, roundId: ROUND }

/** A wired host/display pair over a deterministic in-memory channel. */
function wired() {
  const hub = createMemoryChannelHub()
  const store = boardStore()
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

  return { store, received, hub, close: () => { receiver.close(); broadcaster.close() } }
}

describe('a host command produces a sanitized display update', () => {
  it('delivers each stage to the display in order', () => {
    const { store, received, close } = wired()
    store.dispatch(select('alpha-100'))
    store.dispatch(revealPrompt)
    store.dispatch(revealAnswer)

    expect(received.map((s) => s.round?.stage)).toEqual(['board', 'selected', 'prompt', 'answer'])
    close()
  })

  it('never delivers a teacher note or an alternate answer', () => {
    const { store, received, close } = wired()
    store.dispatch({ type: 'SET_HOST_NOTE', issuedAt: AT, note: 'HOST-MEMO' })
    store.dispatch(select('beta-100'))
    store.dispatch(revealPrompt)
    store.dispatch(revealAnswer)

    const serialized = JSON.stringify(received)
    for (const secret of [
      'BETA-TEACHER-NOTE-100',
      'B100 alternate one',
      'B100 alternate two',
      'HOST-MEMO',
      'SECRET-SESSION',
    ]) {
      expect(serialized).not.toContain(secret)
    }
    close()
  })

  it('delivers the answer only in the final message', () => {
    const { store, received, close } = wired()
    store.dispatch(select('beta-100'))
    store.dispatch(revealPrompt)
    store.dispatch(revealAnswer)

    const withAnswer = received.filter((s) =>
      JSON.stringify(s).includes('Beta one hundred answer'),
    )
    expect(withAnswer).toHaveLength(1)
    expect(withAnswer[0]).toBe(received.at(-1))
    close()
  })
})

describe('the transport stays fail-closed with a board payload', () => {
  it('ignores a stale revision', () => {
    const hub = createMemoryChannelHub()
    const store = boardStore()
    const received: PublicState[] = []
    const sender = hub.createChannel()
    const receiver = createPublicStateReceiver({
      onState: (state) => received.push(state),
      channel: hub.createChannel(),
    })

    store.dispatch(select('alpha-100'))
    const fresh = store.getPublicState()
    sender.post(encodeEnvelope({ type: 'public-state', revision: fresh.revision, payload: fresh }))
    expect(received).toHaveLength(1)

    const stale = { ...fresh, revision: fresh.revision - 1 }
    sender.post(encodeEnvelope({ type: 'public-state', revision: stale.revision, payload: stale }))
    expect(received).toHaveLength(1)
    receiver.close()
  })

  it('ignores a duplicate revision', () => {
    const hub = createMemoryChannelHub()
    const store = boardStore()
    const received: PublicState[] = []
    const sender = hub.createChannel()
    const receiver = createPublicStateReceiver({
      onState: (state) => received.push(state),
      channel: hub.createChannel(),
    })

    const snapshot = store.getPublicState()
    const envelope = encodeEnvelope({
      type: 'public-state',
      revision: snapshot.revision,
      payload: snapshot,
    })
    sender.post(envelope)
    sender.post(envelope)
    expect(received).toHaveLength(1)
    receiver.close()
  })

  it('rejects a malformed category-board payload rather than rendering it', () => {
    const hub = createMemoryChannelHub()
    const received: PublicState[] = []
    const sender = hub.createChannel()
    const receiver = createPublicStateReceiver({
      onState: (state) => received.push(state),
      channel: hub.createChannel(),
    })

    const base = boardStore().getPublicState()
    const malformed = [
      { ...base, round: { kind: 'board', stage: 'prompt' } },
      { ...base, round: { kind: 'board', stage: 'board', selection: {} } },
      { ...base, round: { kind: 'board', stage: 'unknown-stage' } },
      { ...base, round: { kind: 'board', stage: 'board', categories: [{ key: 'c0', title: 'T' }] } },
      { ...base, round: 'a board' },
    ]
    malformed.forEach((payload, index) => {
      sender.post(encodeEnvelope({ type: 'public-state', revision: 100 + index, payload: payload as PublicState }))
    })

    expect(received).toHaveLength(0)
    receiver.close()
  })

  it('the display never pushes state back to the host', () => {
    const { store, close } = wired()
    const revisionBefore = store.getState().revision
    // A display can only ever send `request-state`; even a forged public-state
    // message is ignored by the broadcaster.
    const rogue = store.getPublicState()
    const snapshot = vi.fn(() => store.getPublicState())
    const hub = createMemoryChannelHub()
    const broadcaster = createPublicStateBroadcaster({ getSnapshot: snapshot, channel: hub.createChannel() })
    const rogueChannel = hub.createChannel()
    rogueChannel.post(encodeEnvelope({ type: 'public-state', revision: 999, payload: rogue }))

    expect(snapshot).not.toHaveBeenCalled()
    expect(store.getState().revision).toBe(revisionBefore)
    broadcaster.close()
    close()
  })

  it('a freshly opened display catches up to the live board via request-state', () => {
    const hub = createMemoryChannelHub()
    const store = boardStore()
    store.dispatch(select('alpha-100'))
    store.dispatch(revealPrompt)

    const broadcaster = createPublicStateBroadcaster({
      getSnapshot: () => store.getPublicState(),
      channel: hub.createChannel(),
    })
    const received: PublicState[] = []
    const receiver = createPublicStateReceiver({
      onState: (state) => received.push(state),
      channel: hub.createChannel(),
    })

    expect(received).toHaveLength(1)
    expect(received[0].round?.stage).toBe('prompt')
    receiver.close()
    broadcaster.close()
  })
})

describe('switching between round types stays safe', () => {
  it('moves from a placeholder round to a board and back without a leak', () => {
    const document = boardGameFile(richBoardConfig(), {
      rounds: [
        { id: 'p1', type: 'placeholder', title: 'P', config: { note: 'engine plumbing' } },
        { id: 'board-round', type: 'category-board', title: 'B', config: richBoardConfig() },
      ],
    })
    const result = importGameFromUnknown(document)
    if (result.status !== 'success') throw new Error('fixture failed to import')

    const hub = createMemoryChannelHub()
    const store = createSessionStore()
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

    store.dispatch({ type: 'INIT_SESSION', issuedAt: AT, sessionId: 's' })
    store.dispatch({ type: 'INITIALIZE_GAME', issuedAt: AT, definition: result.definition })
    store.dispatch({ type: 'ADVANCE_TO_NEXT_ROUND', issuedAt: AT }) // placeholder
    expect(received.at(-1)?.round).toBeNull()

    store.dispatch({ type: 'ADVANCE_TO_NEXT_ROUND', issuedAt: AT }) // board
    expect(received.at(-1)?.round?.stage).toBe('board')

    store.dispatch(select('alpha-100'))
    store.dispatch(revealPrompt)
    store.dispatch({ type: 'SELECT_ROUND', issuedAt: AT, roundId: 'p1' })
    // Back on the placeholder: the board DTO is gone entirely, prompt included.
    expect(received.at(-1)?.round).toBeNull()
    expect(JSON.stringify(received.at(-1))).not.toContain('Alpha one hundred prompt')

    receiver.close()
    broadcaster.close()
  })
})
