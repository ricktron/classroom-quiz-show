import { describe, expect, it } from 'vitest'
import { PUBLIC_STATE_SCHEMA_VERSION } from '../state/publicState'
import { SYNC_SCHEMA_VERSION, encodeEnvelope } from '../sync/protocol'
import {
  PERSISTENCE_DB_VERSION,
  PERSISTENCE_WIRE_VERSION,
} from '../persistence/constants'
import { SUPPORTED_SCHEMA_VERSION } from '../import/canonicalFormat'
import { createSessionStore } from '../state/store'
import {
  AT,
  finalStore,
  playToReveal,
  settleAll,
} from '../test/finalWagerFixtures'
import { deriveSessionSummaryV1 } from './deriveSessionSummary'
import {
  SESSION_SUMMARY_CONTRACT_KIND,
  SESSION_SUMMARY_CONTRACT_VERSION,
} from './contract'
import {
  buildCompletedSummaryRecordV1,
  COMPETITIVE_PROFILE_KIND,
  COMPLETED_SUMMARY_RECORD_KIND,
} from './completedSummary'
import { completedHistory } from './completedSummary/testHistory'
import { encodeActiveSessionRecord } from '../persistence/wire/sessionWire'
import { exportGameDefinition } from '../export/exportGame'

describe('Slice 15 privacy and version invariants', () => {
  it('keeps public contracts unchanged while Slice 16 advances IndexedDB to version 2', () => {
    expect(PUBLIC_STATE_SCHEMA_VERSION).toBe(8)
    expect(SYNC_SCHEMA_VERSION).toBe(2)
    expect(SUPPORTED_SCHEMA_VERSION).toBe(1)
    expect(PERSISTENCE_WIRE_VERSION).toBe(1)
    expect(PERSISTENCE_DB_VERSION).toBe(3)
    expect(SESSION_SUMMARY_CONTRACT_VERSION).toBe(1)
    expect(SESSION_SUMMARY_CONTRACT_KIND).toBe('classroom-quiz-show/session-summary')
  })

  it('does not place summary data on PublicState or in sync envelopes', () => {
    const store = finalStore({ scores: { red: 300, blue: 100 } })
    playToReveal(store, {
      wagers: { red: 50, blue: 0 },
      responses: { red: 'exact', blue: 'not-captured' },
    })
    settleAll(store, { red: 'correct', blue: 'incorrect' })
    store.dispatch({ type: 'END_GAME_SESSION', issuedAt: AT })

    const summary = deriveSessionSummaryV1(store.getHistory())
    expect(summary.status).toBe('available')

    const publicState = store.getPublicState()
    const publicKeys = Object.keys(publicState)
    expect(publicKeys).not.toContain('summary')
    expect(publicKeys).not.toContain('sessionSummary')
    expect(JSON.stringify(publicState)).not.toContain('session-summary')
    expect(JSON.stringify(publicState)).not.toContain('red answer')
    expect(JSON.stringify(publicState)).not.toMatch(/"wager":\s*50/)

    const envelope = encodeEnvelope({
      type: 'public-state',
      revision: publicState.revision,
      payload: publicState,
      sentAt: AT,
    })
    const envelopeText = JSON.stringify(envelope)
    expect(envelopeText).not.toContain('session-summary')
    expect(envelopeText).not.toContain('SessionSummary')
    expect(envelopeText).not.toContain('red answer')
  })

  it('keeps exact Final response text and wager amounts out of the summary document', () => {
    const store = finalStore({ scores: { red: 300, blue: 100 } })
    playToReveal(store, {
      wagers: { red: 77, blue: 11 },
      captureMode: 'exact-text',
      responses: { red: 'exact', blue: 'exact' },
    })
    settleAll(store, { red: 'correct', blue: 'incorrect' })
    store.dispatch({ type: 'END_GAME_SESSION', issuedAt: AT })
    const result = deriveSessionSummaryV1(store.getHistory())
    expect(result.status).toBe('available')
    if (result.status !== 'available') throw new Error('expected available')
    const blob = JSON.stringify(result.summary)
    expect(blob).not.toContain('red answer')
    expect(blob).not.toContain('blue answer')
    expect(blob).not.toContain('"wager":77')
    expect(blob).not.toContain('"wager":11')
    expect(blob).not.toContain('maxWager')
    expect(blob).not.toContain('preFinalScore')
    expect(blob).not.toContain('alternates')
    expect(blob).not.toContain('notes')
    expect(blob).not.toContain('Mantle convection')
  })

  it('keeps ledger envelopes, profiles, and class labels out of public, sync, export, and active-session wires', async () => {
    const fixture = completedHistory()
    const classLabel = 'PRIVATE CLASS 7B'
    const built = await buildCompletedSummaryRecordV1(fixture.history, {
      savedAt: 30,
      classLabel,
    })
    expect(built.status).toBe('success')
    if (built.status !== 'success') throw new Error('record build failed')
    expect(JSON.stringify(built.record)).toContain(COMPLETED_SUMMARY_RECORD_KIND)
    expect(JSON.stringify(built.record)).toContain(COMPETITIVE_PROFILE_KIND)
    expect(JSON.stringify(built.record)).toContain(classLabel)

    const store = createSessionStore({ initialHistory: fixture.history })
    const publicState = store.getPublicState()
    const sync = encodeEnvelope({
      type: 'public-state',
      revision: publicState.revision,
      payload: publicState,
      sentAt: AT,
    })
    const exported = exportGameDefinition(fixture.definition)
    expect(exported.status).toBe('success')
    const activeWire = encodeActiveSessionRecord(fixture.history.slice(0, -1), 19)
    expect(activeWire.ok).toBe(true)

    for (const value of [
      publicState,
      sync,
      exported.status === 'success' ? exported.document : null,
      activeWire.ok ? activeWire.value : null,
    ]) {
      const text = JSON.stringify(value)
      expect(text).not.toContain(COMPLETED_SUMMARY_RECORD_KIND)
      expect(text).not.toContain(COMPETITIVE_PROFILE_KIND)
      expect(text).not.toContain(classLabel)
      expect(text).not.toContain('completedSummaries')
    }
  })
})

// Ensure createSessionStore remains available for future lifecycle cases.
void createSessionStore
