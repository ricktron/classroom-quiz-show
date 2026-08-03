import { describe, expect, it } from 'vitest'
import { safeToPublicState, toPublicState } from './sanitize'
import {
  PUBLIC_FINAL_KIND,
  PUBLIC_STATE_SCHEMA_VERSION,
  isPublicRoundState,
  isPublicState,
  type PublicFinalWagerState,
  type PublicState,
} from './publicState'
import { SYNC_SCHEMA_VERSION } from '../sync/protocol'
import type { SessionStore } from './store'
import {
  AT,
  FINAL_ROUND_ID,
  finalOf,
  finalStore,
  playToReveal,
  settleAll,
} from '../test/finalWagerFixtures'

/**
 * The Final Wager private→public boundary (Slice 14).
 *
 * The load-bearing claims proved here:
 *  - the projector receives NOTHING about a team's wager or response until that
 *    team is explicitly revealed, and nothing about correctness until the host
 *    explicitly settles;
 *  - the prompt is absent until the response window opens, and the answer until
 *    the explicit answer reveal;
 *  - the eligibility snapshot, caps, capture mode, alternates, host notes,
 *    timer ids and authored ids are never on the wire at ANY stage;
 *  - every stage has an exact-key guard, so an impossible payload fails closed;
 *  - a private field added later is NOT exposed by default.
 */

const ROUND = FINAL_ROUND_ID

/** The projected Final DTO for a store, or `null`. */
function finalDto(store: SessionStore): PublicFinalWagerState | null {
  const round = toPublicState(store.getState()).round
  if (round === null || round.kind !== PUBLIC_FINAL_KIND) return null
  return round
}

/** Every string that appears anywhere in the serialized public snapshot. */
function serialized(store: SessionStore): string {
  return JSON.stringify(toPublicState(store.getState()))
}

describe('the wire protocol', () => {
  it('is at public-state version 8 and envelope version 2', () => {
    expect(PUBLIC_STATE_SCHEMA_VERSION).toBe(8)
    expect(SYNC_SCHEMA_VERSION).toBe(2)
  })

  it('rejects a version-7 snapshot rather than reinterpreting it', () => {
    const store = finalStore({ scores: { red: 300 } })
    const snapshot = toPublicState(store.getState())
    expect(isPublicState({ ...snapshot, schemaVersion: 7 })).toBe(false)
    expect(isPublicState(snapshot)).toBe(true)
  })

  it('uses a NEUTRAL presentation discriminator, never the registry type', () => {
    const store = finalStore({ scores: { red: 300 } })
    expect(finalDto(store)?.kind).toBe('final')
    expect(serialized(store)).not.toContain('final-wager')
  })
})

describe('what the projector sees at each stage', () => {
  it('shows a neutral setup panel before Final begins', () => {
    const store = finalStore({ scores: { red: 300, blue: 100 } })
    expect(finalDto(store)).toEqual({ kind: PUBLIC_FINAL_KIND, stage: 'setup' })
  })

  it('shows a generic wager stage with a countdown and no wager data', () => {
    const store = finalStore({ scores: { red: 300, blue: 100 } })
    store.dispatch({ type: 'BEGIN_FINAL_WAGER', issuedAt: AT, roundId: ROUND, mode: 'classic' })
    store.dispatch({ type: 'RECORD_FINAL_WAGER', issuedAt: AT, roundId: ROUND, teamId: 'red', wager: 250 })
    store.dispatch({
      type: 'START_FINAL_WAGER_WINDOW',
      issuedAt: AT,
      roundId: ROUND,
      durationSeconds: 60,
    })
    const dto = finalDto(store)
    expect(dto?.stage).toBe('wager-entry')
    expect(Object.keys(dto ?? {}).sort()).toEqual(['kind', 'stage', 'timer'])
    // The committed 250 is nowhere on the wire.
    expect(serialized(store)).not.toContain('250')
  })

  it('shows a generic locked stage carrying nothing at all', () => {
    const store = finalStore({ scores: { red: 300, blue: 100 } })
    store.dispatch({ type: 'BEGIN_FINAL_WAGER', issuedAt: AT, roundId: ROUND, mode: 'classic' })
    store.dispatch({ type: 'RECORD_FINAL_WAGER', issuedAt: AT, roundId: ROUND, teamId: 'red', wager: 100 })
    store.dispatch({ type: 'RECORD_FINAL_WAGER', issuedAt: AT, roundId: ROUND, teamId: 'blue', wager: 50 })
    store.dispatch({ type: 'LOCK_FINAL_WAGERS', issuedAt: AT, roundId: ROUND })
    expect(finalDto(store)).toEqual({ kind: PUBLIC_FINAL_KIND, stage: 'wagers-locked' })
  })

  it('sends the prompt ONLY once the response window opens', () => {
    const store = finalStore({ scores: { red: 300, blue: 100 } })
    store.dispatch({ type: 'BEGIN_FINAL_WAGER', issuedAt: AT, roundId: ROUND, mode: 'classic' })
    store.dispatch({ type: 'RECORD_FINAL_WAGER', issuedAt: AT, roundId: ROUND, teamId: 'red', wager: 0 })
    store.dispatch({ type: 'RECORD_FINAL_WAGER', issuedAt: AT, roundId: ROUND, teamId: 'blue', wager: 0 })
    store.dispatch({ type: 'LOCK_FINAL_WAGERS', issuedAt: AT, roundId: ROUND })
    expect(serialized(store)).not.toContain('Which process drives plate motion')

    store.dispatch({
      type: 'START_FINAL_RESPONSE_WINDOW',
      issuedAt: AT,
      roundId: ROUND,
      captureMode: 'exact-text',
    })
    const dto = finalDto(store)
    expect(dto?.stage).toBe('response-entry')
    expect(serialized(store)).toContain('Which process drives plate motion')
    // …and still no answer, and no capture mode.
    expect(serialized(store)).not.toContain('Mantle convection')
    expect(serialized(store)).not.toContain('exact-text')
  })

  it('sends the answer ONLY after the explicit answer reveal', () => {
    const store = finalStore({ scores: { red: 300, blue: 100 } })
    playToReveal(store)
    const dto = finalDto(store)
    expect(dto?.stage).toBe('answer-revealed')
    expect(serialized(store)).toContain('Mantle convection')
  })

  it('sends ONE revealed team, with correctness absent until settlement', () => {
    const store = finalStore({ scores: { red: 300, blue: 100 } })
    playToReveal(store, {
      wagers: { red: 100, blue: 50 },
      responses: { red: 'exact', blue: 'exact' },
    })
    store.dispatch({ type: 'REVEAL_FINAL_TEAM', issuedAt: AT, roundId: ROUND, teamId: 'blue' })
    const dto = finalDto(store)
    expect(dto?.stage).toBe('team-reveal')
    if (dto?.stage !== 'team-reveal') return
    expect(dto.reveal).toEqual({
      // Positional key, never the authored team id.
      teamKey: 't1',
      response: { kind: 'exact', text: 'blue answer' },
      wager: 50,
      // Correctness is not public before the settlement action.
      settlement: null,
    })
    // Red's wager and response are absent from the snapshot entirely.
    const json = serialized(store)
    expect(json).not.toContain('red answer')
    expect(json).not.toContain('"wager":100')
  })

  it('sends the outcome and the signed delta once the host settles', () => {
    const store = finalStore({ scores: { red: 300, blue: 100 } })
    playToReveal(store, { wagers: { red: 100, blue: 50 }, responses: { red: 'exact', blue: 'exact' } })
    store.dispatch({ type: 'REVEAL_FINAL_TEAM', issuedAt: AT, roundId: ROUND, teamId: 'blue' })
    store.dispatch({ type: 'SETTLE_FINAL_TEAM', issuedAt: AT, roundId: ROUND, teamId: 'blue', outcome: 'correct' })
    const dto = finalDto(store)
    expect(dto?.stage).toBe('team-reveal')
    if (dto?.stage !== 'team-reveal') return
    // The just-settled team STAYS on screen until the next reveal.
    expect(dto.reveal.settlement).toEqual({ outcome: 'correct', delta: 50 })
  })

  it('shows a tied resolution, then a completed game', () => {
    const store = finalStore({ scores: { red: 300, blue: 100 } })
    playToReveal(store, { wagers: { red: 100, blue: 100 } })
    settleAll(store, { red: 'incorrect', blue: 'correct' })
    const tied = finalDto(store)
    expect(tied?.stage).toBe('resolution')
    if (tied?.stage === 'resolution') expect(tied.outcome).toBe('tied')

    store.dispatch({ type: 'ACCEPT_FINAL_TIED_FINISH', issuedAt: AT, roundId: ROUND })
    const complete = finalDto(store)
    expect(complete).toEqual({ kind: PUBLIC_FINAL_KIND, stage: 'complete', outcome: 'tied' })
  })

  it('shows a neutral sudden-death panel with nothing else on it', () => {
    const store = finalStore({ scores: { red: 300, blue: 100 } })
    playToReveal(store, { wagers: { red: 100, blue: 100 } })
    settleAll(store, { red: 'incorrect', blue: 'correct' })
    store.dispatch({ type: 'ENTER_FINAL_SUDDEN_DEATH', issuedAt: AT, roundId: ROUND })
    expect(finalDto(store)).toEqual({ kind: PUBLIC_FINAL_KIND, stage: 'sudden-death' })
  })

  it('resolves an empty classic Final with no fabricated prompt or answer', () => {
    const store = finalStore({ scores: {} })
    store.dispatch({ type: 'BEGIN_FINAL_WAGER', issuedAt: AT, roundId: ROUND, mode: 'classic' })
    const dto = finalDto(store)
    expect(dto?.stage).toBe('resolution')
    if (dto?.stage !== 'resolution') return
    expect(dto.prompt).toBeNull()
    expect(dto.answer).toBeNull()
    expect(serialized(store)).not.toContain('Which process drives plate motion')
  })

  it('keeps the public scoreboard present and positionally stable throughout', () => {
    const store = finalStore({ scores: { red: 300, blue: 100 } })
    const before = toPublicState(store.getState()).teams
    playToReveal(store, { wagers: { red: 100, blue: 50 } })
    settleAll(store, { red: 'correct', blue: 'incorrect' })
    const after = toPublicState(store.getState()).teams
    expect(before?.status).toBe('available')
    expect(after?.status).toBe('available')
    if (before?.status !== 'available' || after?.status !== 'available') return
    expect(after.teams.map((team) => team.key)).toEqual(before.teams.map((team) => team.key))
    expect(after.teams.map((team) => team.score)).toEqual([400, 50])
  })
})

describe('what the projector NEVER sees', () => {
  function playedSnapshot(): string {
    const store = finalStore({ scores: { red: 300, blue: 100 } })
    playToReveal(store, {
      wagers: { red: 100, blue: 50 },
      responses: { red: 'exact', blue: 'exact' },
    })
    settleAll(store, { red: 'correct', blue: 'incorrect' })
    return serialized(store)
  }

  it.each([
    ['the alternates', 'Convection'],
    ['the host note', 'Press for the mechanism'],
    ['the eligibility mode', 'classic'],
    ['the capture mode', 'exact-text'],
    ['an authored team id', '"red"'],
    ['the authored round id', 'final-round'],
    ['the registry round type', 'final-wager'],
    ['a Final timer id', 'fwt-'],
    ['an event type', 'FINAL_'],
    ['undo metadata', 'EVENT_UNDONE'],
    ['a pre-final score snapshot key', 'preFinalScore'],
    ['a wager cap', 'maxWager'],
    ['the reveal order', 'revealOrder'],
    ['the eligibility snapshot', 'snapshot'],
    ['a raw dispatch stamp', 'issuedAt'],
    ['a raw occurrence stamp', 'occurredAt'],
    ['host-writer lease data', 'lease'],
  ])('never carries %s', (_label, needle) => {
    // The fixture's alternates include "Convection currents"; assert on the
    // whole serialized snapshot, not merely the visible text.
    const store = finalStore({ scores: { red: 300, blue: 100 } })
    playToReveal(store, {
      wagers: { red: 100, blue: 50 },
      responses: { red: 'exact', blue: 'exact' },
      captureMode: 'exact-text',
    })
    expect(serialized(store)).not.toContain(needle)
    expect(playedSnapshot()).not.toContain(needle)
  })

  it('does not expose a private field added to the Final state later', () => {
    const store = finalStore({ scores: { red: 300, blue: 100 } })
    playToReveal(store)
    const state = store.getState()
    const game = state.session?.game
    expect(game).toBeDefined()
    const withFutureField = {
      ...state,
      session: {
        ...state.session!,
        game: {
          ...game!,
          finalWagers: {
            [ROUND]: {
              ...finalOf(store),
              // A field this build does not know about, added to the private model.
              secretFutureField: 'must-never-leak',
            },
          },
        },
      },
    } as unknown as Parameters<typeof toPublicState>[0]
    expect(JSON.stringify(toPublicState(withFutureField))).not.toContain('must-never-leak')
  })

  it('publishes no board response phase for a Final round', () => {
    const store = finalStore({ scores: { red: 300, blue: 100 } })
    playToReveal(store)
    expect(toPublicState(store.getState()).response).toBeNull()
  })
})

describe('the exact-key guard for every Final stage', () => {
  const stages: readonly [string, unknown][] = [
    ['setup', { kind: 'final', stage: 'setup' }],
    ['wager-entry', { kind: 'final', stage: 'wager-entry', timer: { status: 'idle' } }],
    ['wagers-locked', { kind: 'final', stage: 'wagers-locked' }],
    [
      'response-entry',
      {
        kind: 'final',
        stage: 'response-entry',
        prompt: { kind: 'text', text: 'Q' },
        timer: { status: 'idle' },
      },
    ],
    ['responses-locked', { kind: 'final', stage: 'responses-locked', prompt: { kind: 'text', text: 'Q' } }],
    [
      'answer-revealed',
      { kind: 'final', stage: 'answer-revealed', prompt: { kind: 'text', text: 'Q' }, answer: 'A' },
    ],
    [
      'team-reveal',
      {
        kind: 'final',
        stage: 'team-reveal',
        prompt: { kind: 'text', text: 'Q' },
        answer: 'A',
        reveal: {
          teamKey: 't0',
          response: { kind: 'not-captured' },
          wager: 10,
          settlement: null,
        },
      },
    ],
    [
      'resolution',
      {
        kind: 'final',
        stage: 'resolution',
        prompt: null,
        answer: null,
        reveal: null,
        outcome: 'tied',
      },
    ],
    ['sudden-death', { kind: 'final', stage: 'sudden-death' }],
    ['complete', { kind: 'final', stage: 'complete', outcome: 'unique-leader' }],
  ]

  it.each(stages)('accepts a well-formed %s payload', (_stage, payload) => {
    expect(isPublicRoundState(payload)).toBe(true)
  })

  it.each(stages)('rejects a %s payload carrying one extra key', (_stage, payload) => {
    expect(isPublicRoundState({ ...(payload as object), smuggled: true })).toBe(false)
  })

  it.each([
    ['an unknown stage', { kind: 'final', stage: 'jackpot' }],
    ['a locked stage carrying a prompt', { kind: 'final', stage: 'wagers-locked', prompt: { kind: 'text', text: 'Q' } }],
    ['a team-reveal missing its reveal', { kind: 'final', stage: 'team-reveal', prompt: { kind: 'text', text: 'Q' }, answer: 'A' }],
    [
      'a reveal naming an authored team id instead of a positional key',
      {
        kind: 'final',
        stage: 'team-reveal',
        prompt: { kind: 'text', text: 'Q' },
        answer: 'A',
        reveal: { teamKey: 'red', response: { kind: 'not-captured' }, wager: 1, settlement: null },
      },
    ],
    [
      'a reveal with a negative wager',
      {
        kind: 'final',
        stage: 'team-reveal',
        prompt: { kind: 'text', text: 'Q' },
        answer: 'A',
        reveal: { teamKey: 't0', response: { kind: 'not-captured' }, wager: -1, settlement: null },
      },
    ],
    [
      'a reveal whose bare response smuggles text',
      {
        kind: 'final',
        stage: 'team-reveal',
        prompt: { kind: 'text', text: 'Q' },
        answer: 'A',
        reveal: {
          teamKey: 't0',
          response: { kind: 'not-captured', text: 'smuggled' },
          wager: 1,
          settlement: null,
        },
      },
    ],
    [
      'a settlement with an unknown outcome',
      {
        kind: 'final',
        stage: 'team-reveal',
        prompt: { kind: 'text', text: 'Q' },
        answer: 'A',
        reveal: {
          teamKey: 't0',
          response: { kind: 'not-captured' },
          wager: 1,
          settlement: { outcome: 'partial', delta: 1 },
        },
      },
    ],
    [
      'a resolution with an unknown outcome',
      { kind: 'final', stage: 'resolution', prompt: null, answer: null, reveal: null, outcome: 'draw' },
    ],
    ['an unknown presentation kind', { kind: 'jeopardy', stage: 'setup' }],
  ])('rejects %s', (_label, payload) => {
    expect(isPublicRoundState(payload)).toBe(false)
  })
})

describe('the sanitizer fails closed', () => {
  it('projects the neutral unavailable round when Final state is impossible', () => {
    const store = finalStore({ scores: { red: 300, blue: 100 } })
    playToReveal(store, { wagers: { red: 100, blue: 50 } })
    const state = store.getState()
    const game = state.session!.game!
    // A reveal stage naming a team with no committed wager cannot be projected.
    const broken = {
      ...state,
      session: {
        ...state.session!,
        game: {
          ...game,
          finalWagers: {
            [ROUND]: { ...finalOf(store), phase: 'team-reveal', revealedTeamIds: ['ghost'] },
          },
        },
      },
    } as unknown as Parameters<typeof toPublicState>[0]
    const projected = toPublicState(broken)
    expect(projected.round).toBeNull()
    expect(projected.game?.roundAvailability).toBe('unavailable')
  })

  it('never publishes a structurally invalid snapshot', () => {
    const store = finalStore({ scores: { red: 300, blue: 100 } })
    playToReveal(store)
    const projected: PublicState = safeToPublicState(store.getState())
    expect(isPublicState(projected)).toBe(true)
  })
})
