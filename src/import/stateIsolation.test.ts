import { describe, expect, it, vi } from 'vitest'
import { createSessionStore } from '../state/store'
import { replay } from '../state/reducer'
import { createPublicStateBroadcaster } from '../sync/broadcaster'
import type { SyncChannel } from '../sync/channel'
import { gameFile, gameFileText, roundFile } from '../test/gameFileFixtures'
import { importGameFromJsonText, importGameFromUnknown } from './importGame'
import type { ImportResult } from './result'

/**
 * State / event isolation — the load-bearing guarantee of Slice 4.
 *
 * An invalid import must not reach session state, event history, revision, the
 * active definition, the selected round, synchronization, or `PublicState`.
 *
 * The structural reason it cannot is that the pipeline is a pure function with
 * no reference to the store, the reducer, or the sync layer — it can only
 * return a result. These tests hold that structure to account, and prove that a
 * *valid* import reaches state only through the existing `INITIALIZE_GAME`
 * command (no parallel initialization path).
 */

/** The one and only way a caller may load an import result. */
function loadIfValid(store: ReturnType<typeof createSessionStore>, result: ImportResult) {
  if (result.status !== 'success') return null
  return store.dispatch({
    type: 'INITIALIZE_GAME',
    issuedAt: 1_000,
    definition: result.definition,
  })
}

function startedStore() {
  const store = createSessionStore()
  store.dispatch({ type: 'INIT_SESSION', issuedAt: 1, sessionId: 'session-1' })
  return store
}

function snapshot(store: ReturnType<typeof createSessionStore>) {
  return {
    state: store.getState(),
    publicState: store.getPublicState(),
    history: store.getHistory(),
    revision: store.getState().revision,
  }
}

const INVALID_INPUTS: ReadonlyArray<readonly [string, string]> = [
  ['malformed JSON', '{ "format": '],
  ['empty input', '   '],
  ['top-level array', '[]'],
  ['top-level null', 'null'],
  ['unsupported version', gameFileText({ schemaVersion: 2 })],
  ['unknown format', gameFileText({ format: 'other/game' })],
  ['unknown round type', gameFileText({ rounds: [{ id: 'r', type: 'category-board', title: 'R', config: {} }] })],
  ['duplicate round ids', gameFileText({ rounds: [roundFile('same'), roundFile('same')] })],
  ['unknown field', gameFileText({ theme: 'space' })],
  ['prototype-pollution key', '{"format":"classroom-quiz-show/game","schemaVersion":1,"id":"a","title":"T","rounds":[],"__proto__":{"x":1}}'],
]

describe('an invalid import mutates nothing', () => {
  it.each(INVALID_INPUTS)('%s leaves authoritative state untouched', (_label, text) => {
    const store = startedStore()
    const before = snapshot(store)

    const result = importGameFromJsonText(text)
    expect(result.status).toBe('failure')
    const dispatched = loadIfValid(store, result)

    const after = snapshot(store)
    expect(dispatched).toBeNull()
    // No event appended…
    expect(after.history).toEqual(before.history)
    expect(after.history.some((e) => e.type === 'GAME_INITIALIZED')).toBe(false)
    // …revision unchanged…
    expect(after.revision).toBe(before.revision)
    // …authoritative and public state unchanged, by value.
    expect(after.state).toEqual(before.state)
    expect(after.publicState).toEqual(before.publicState)
    expect(after.state.session?.game).toBeNull()
  })

  it('does not replace an already-active game or its selected round', () => {
    const store = startedStore()
    loadIfValid(store, importGameFromJsonText(gameFileText({ rounds: [roundFile('a'), roundFile('b')] })))
    store.dispatch({ type: 'ADVANCE_TO_NEXT_ROUND', issuedAt: 2 })
    const before = snapshot(store)
    expect(before.state.session?.game?.currentRoundIndex).toBe(0)

    loadIfValid(store, importGameFromJsonText('{ not json'))
    loadIfValid(store, importGameFromJsonText(gameFileText({ id: 'other-game', schemaVersion: 3 })))

    const after = snapshot(store)
    expect(after.state.session?.game?.definition.id).toBe('sample-game')
    expect(after.state.session?.game?.currentRoundIndex).toBe(0)
    expect(after.revision).toBe(before.revision)
    expect(after.history).toEqual(before.history)
  })

  it('publishes no synchronization message', () => {
    const posted: unknown[] = []
    const channel: SyncChannel = {
      post: (data) => posted.push(data),
      subscribe: () => () => {},
      close: () => {},
    }
    const store = startedStore()
    const broadcaster = createPublicStateBroadcaster({
      getSnapshot: () => store.getPublicState(),
      channel,
    })
    const unsubscribe = store.subscribe(() => broadcaster.publish(store.getPublicState()))

    loadIfValid(store, importGameFromJsonText('{ not json'))
    loadIfValid(store, importGameFromJsonText(gameFileText({ schemaVersion: 99 })))
    expect(posted).toHaveLength(0)

    // A valid import DOES publish — proving the spy would have caught a leak.
    loadIfValid(store, importGameFromJsonText(gameFileText()))
    expect(posted).toHaveLength(1)

    unsubscribe()
    broadcaster.close()
  })

  it('never puts raw imported text or issue details into state, history or PublicState', () => {
    const store = startedStore()
    const marker = 'SECRET-RAW-IMPORT-MARKER'
    loadIfValid(store, importGameFromJsonText(`{ "format": "${marker}"`))
    loadIfValid(store, importGameFromJsonText(gameFileText({ theme: marker })))
    // A SUCCESSFUL import of a document whose *source text* is distinctive: only
    // the normalized definition is stored, never the source.
    loadIfValid(store, importGameFromJsonText(gameFileText()))

    const serialized = JSON.stringify({
      state: store.getState(),
      history: store.getHistory(),
      publicState: store.getPublicState(),
    })
    // No raw source text, and no canonical FILE-level field (`format`) — only
    // the normalized domain shape crosses into state.
    expect(serialized).not.toContain(marker)
    expect(serialized).not.toContain('classroom-quiz-show/game')
    expect(serialized).not.toContain('"format"')
    // No validation vocabulary anywhere in state, history, or PublicState.
    for (const fragment of ['unknown-field', 'issues', 'stage', 'importIssue', 'theme']) {
      expect(serialized, `state must not carry "${fragment}"`).not.toContain(fragment)
    }
  })

  it('the pipeline cannot mutate anything even when handed the store-adjacent inputs', () => {
    // The import module imports no store/reducer/sync symbol at all — the only
    // way its output reaches state is an explicit caller dispatch.
    const store = startedStore()
    const spy = vi.spyOn(store, 'dispatch')
    importGameFromUnknown(gameFile({ id: 'nope nope' }))
    importGameFromUnknown(gameFile())
    expect(spy).not.toHaveBeenCalled()
    spy.mockRestore()
  })
})

describe('a valid import goes through the existing command/event path', () => {
  it('produces exactly one GAME_INITIALIZED event via INITIALIZE_GAME', () => {
    const store = startedStore()
    const before = store.getHistory().length
    const dispatched = loadIfValid(store, importGameFromJsonText(gameFileText()))

    expect(dispatched?.status).toBe('accepted')
    const appended = store.getHistory().slice(before)
    expect(appended).toHaveLength(1)
    expect(appended[0].type).toBe('GAME_INITIALIZED')
    expect(appended[0].reversible).toBe(false)
    expect(store.getState().session?.game?.definition.id).toBe('sample-game')
  })

  it('keeps replay deterministic after a valid import', () => {
    const store = startedStore()
    loadIfValid(store, importGameFromJsonText(gameFileText({ rounds: [roundFile('a'), roundFile('b')] })))
    store.dispatch({ type: 'ADVANCE_TO_NEXT_ROUND', issuedAt: 3 })
    store.dispatch({ type: 'SET_PUBLIC_STATUS', issuedAt: 4, code: 'no-active-game' })

    const history = store.getHistory()
    expect(replay(history)).toEqual(store.getState())
    expect(replay(history)).toEqual(replay(history))
  })

  it('leaves undo rules unchanged — an imported game init is still irreversible', () => {
    const store = startedStore()
    loadIfValid(store, importGameFromJsonText(gameFileText()))
    store.dispatch({ type: 'ADVANCE_TO_NEXT_ROUND', issuedAt: 5 })

    // Undo neutralizes the round advance…
    expect(store.dispatch({ type: 'UNDO', issuedAt: 6 }).status).toBe('accepted')
    expect(store.getState().session?.game?.currentRoundIndex).toBeNull()
    // …but the imported game itself can never be undone away.
    store.dispatch({ type: 'UNDO', issuedAt: 7 })
    store.dispatch({ type: 'UNDO', issuedAt: 8 })
    expect(store.getState().session?.game?.definition.id).toBe('sample-game')
  })

  it('the imported definition survives the reducer trust guard', () => {
    const store = startedStore()
    const result = importGameFromJsonText(gameFileText())
    expect(result.status).toBe('success')
    if (result.status !== 'success') return
    // `INITIALIZE_GAME` re-checks the definition with `isGameDefinition`; a
    // pipeline output that failed that guard would be rejected here.
    expect(loadIfValid(store, result)?.status).toBe('accepted')
  })
})
