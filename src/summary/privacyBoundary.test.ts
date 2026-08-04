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

describe('Slice 15 privacy and version invariants', () => {
  it('keeps public-state, sync, game-file, persistence, and IndexedDB versions unchanged', () => {
    expect(PUBLIC_STATE_SCHEMA_VERSION).toBe(8)
    expect(SYNC_SCHEMA_VERSION).toBe(2)
    expect(SUPPORTED_SCHEMA_VERSION).toBe(1)
    expect(PERSISTENCE_WIRE_VERSION).toBe(1)
    expect(PERSISTENCE_DB_VERSION).toBe(1)
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
})

// Ensure createSessionStore remains available for future lifecycle cases.
void createSessionStore
