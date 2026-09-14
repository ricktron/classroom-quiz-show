import { describe, expect, it } from 'vitest'
import { createSampleGame } from '../../game/sampleGame'
import { createSessionStore } from '../../state/store'
import { importGameFromUnknown } from '../../import/importGame'
import { teamBoardGameFile, twoTeams } from '../../test/teamFixtures'
import {
  decodeActiveSessionRecord,
  decodeSessionHistory,
  encodeActiveSessionRecord,
  encodeSessionHistory,
  isResumableHistory,
} from './sessionWire'

const AT = 1_700_000_000_000

describe('session persistence wire', () => {
  it('round-trips known events and reconstructs GAME_INITIALIZED through import', () => {
    const history = createInitializedGameHistory()
    const encoded = encodeSessionHistory(history, AT)

    expect(encoded.ok).toBe(true)
    if (!encoded.ok) return
    const gameEvent = encoded.value.events.find((event) =>
      typeof event === 'object' && event !== null && 'type' in event && event.type === 'GAME_INITIALIZED')
    expect(gameEvent).toMatchObject({ type: 'GAME_INITIALIZED' })
    expect(JSON.stringify(gameEvent)).toContain('definitionJson')
    expect(JSON.stringify(gameEvent)).not.toContain('"definition"')

    const decoded = decodeSessionHistory(encoded.value)
    expect(decoded.ok).toBe(true)
    if (!decoded.ok) return
    expect(decoded.value).toEqual(history)
    const decodedGame = decoded.value.find((event) => event.type === 'GAME_INITIALIZED')
    expect(decodedGame?.type).toBe('GAME_INITIALIZED')
    if (decodedGame?.type === 'GAME_INITIALIZED') {
      expect(decodedGame.definition).not.toBe(createSampleGame())
      expect(decodedGame.definition.id).toBe(createSampleGame().id)
    }
  })

  it('rejects unknown wire versions', () => {
    const encoded = encodeSessionHistory(createBasicHistory(), AT)
    expect(encoded.ok).toBe(true)
    if (!encoded.ok) return

    const decoded = decodeSessionHistory({ ...encoded.value, schemaVersion: 99 })

    expect(decoded).toMatchObject({ ok: false, code: 'unsupported-version' })
  })

  it('rejects malformed event sequence ids', () => {
    const encoded = encodeSessionHistory(createBasicHistory(), AT)
    expect(encoded.ok).toBe(true)
    if (!encoded.ok) return
    const [first] = encoded.value.events
    expect(typeof first).toBe('object')
    if (typeof first !== 'object' || first === null) return

    const decoded = decodeSessionHistory({ ...encoded.value, events: [{ ...first, seq: 1 }] })

    expect(decoded).toMatchObject({ ok: false, code: 'corrupt' })
  })

  it('rejects events that carry unexpected extra keys', () => {
    const encoded = encodeSessionHistory(createBasicHistory(), AT)
    expect(encoded.ok).toBe(true)
    if (!encoded.ok) return
    const [first] = encoded.value.events
    expect(typeof first).toBe('object')
    if (typeof first !== 'object' || first === null) return

    const decoded = decodeSessionHistory({
      ...encoded.value,
      events: [{ ...first, unexpected: true }],
    })

    expect(decoded).toMatchObject({ ok: false, code: 'corrupt' })
  })

  it('rejects corrupt GAME_INITIALIZED definition JSON', () => {
    const encoded = encodeSessionHistory(createInitializedGameHistory(), AT)
    expect(encoded.ok).toBe(true)
    if (!encoded.ok) return
    const events = encoded.value.events.map((event) => {
      if (typeof event === 'object' && event !== null && 'type' in event && event.type === 'GAME_INITIALIZED') {
        return { ...event, definitionJson: '{"format":"wrong"}' }
      }
      return event
    })

    const decoded = decodeSessionHistory({ ...encoded.value, events })

    expect(decoded).toMatchObject({ ok: false, code: 'corrupt' })
  })

  it('round-trips SESSION_TEAM_NAME_SET with a string name and with null', () => {
    const imported = importGameFromUnknown(teamBoardGameFile(twoTeams()))
    if (imported.status !== 'success') throw new Error('team fixture failed')
    const store = createSessionStore()
    store.dispatch({ type: 'INIT_SESSION', issuedAt: AT, sessionId: 'session-1' })
    store.dispatch({ type: 'INITIALIZE_GAME', issuedAt: AT + 1, definition: imported.definition })
    const teamId = imported.definition.teams[0]?.id
    expect(teamId).toBeTruthy()
    if (!teamId) return
    store.dispatch({ type: 'SET_SESSION_TEAM_NAME', issuedAt: AT + 2, teamId, name: 'Comet Crew' })
    store.dispatch({ type: 'SET_SESSION_TEAM_NAME', issuedAt: AT + 3, teamId, name: null })
    const history = store.getHistory()
    const encoded = encodeSessionHistory(history, AT)
    expect(encoded.ok).toBe(true)
    if (!encoded.ok) return
    const decoded = decodeSessionHistory(encoded.value)
    expect(decoded.ok).toBe(true)
    if (!decoded.ok) return
    expect(decoded.value).toEqual(history)
    const nameEvents = decoded.value.filter((event) => event.type === 'SESSION_TEAM_NAME_SET')
    expect(nameEvents).toHaveLength(2)
    expect(nameEvents[0]).toMatchObject({ teamId, name: 'Comet Crew', reversible: true })
    expect(nameEvents[1]).toMatchObject({ teamId, name: null, reversible: true })
  })

  it('encodes and decodes active-session records with resumability', () => {
    const history = createInitializedGameHistory()
    const encoded = encodeActiveSessionRecord(history, AT)
    expect(encoded.ok).toBe(true)
    if (!encoded.ok) return

    const decoded = decodeActiveSessionRecord(encoded.value)

    expect(decoded.ok).toBe(true)
    if (!decoded.ok) return
    expect(decoded.value.savedAt).toBe(AT)
    expect(isResumableHistory(decoded.value.events)).toBe(true)
  })
})

function createBasicHistory() {
  const store = createSessionStore()
  store.dispatch({ type: 'INIT_SESSION', issuedAt: AT, sessionId: 'session-1' })
  store.dispatch({ type: 'ADVANCE_SEQUENCE', issuedAt: AT + 1 })
  return store.getHistory()
}

function createInitializedGameHistory() {
  const store = createSessionStore()
  store.dispatch({ type: 'INIT_SESSION', issuedAt: AT, sessionId: 'session-1' })
  store.dispatch({ type: 'INITIALIZE_GAME', issuedAt: AT + 1, definition: createSampleGame() })
  return store.getHistory()
}
