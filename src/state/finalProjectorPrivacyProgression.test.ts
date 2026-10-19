import { describe, expect, it } from 'vitest'
import { toPublicState } from './sanitize'
import { PUBLIC_FINAL_KIND, type PublicFinalWagerState } from './publicState'
import { createSessionStore, type SessionStore } from './store'
import {
  AT,
  FINAL_ROUND_ID,
  finalOf,
  finalStore,
} from '../test/finalWagerFixtures'

/**
 * M40 — R4 projector privacy, second layer.
 *
 * The existing browser detector watches the projector; this drives the REAL
 * session store through every Final stage and asserts the sanitizer boundary at
 * each one. The mutation it is built to kill: the Final answer becoming public
 * at `responses-locked`, before the teacher's explicit reveal — i.e. the
 * projector showing the answer while students are still being adjudicated.
 *
 * It asserts on the serialized snapshot, not on a DTO field, so an answer that
 * leaks through some other key is caught too.
 */

const ROUND = FINAL_ROUND_ID
const ANSWER = 'Mantle convection'
/** Distinctive, so a substring check cannot collide with a revision or timer. */
const WAGER = 137
const PROMPT = 'Which process drives plate motion?'

/**
 * Every string on the wire for this store.
 *
 * `store.getPublicState()` — not `toPublicState(store.getState())` — because
 * that is exactly what the broadcaster publishes (`src/sync/broadcaster.ts`).
 * Asserting the sanitizer alone would leave a leak ADDED inside
 * `getPublicState`, downstream of the sanitizer, completely undetected.
 */
const wire = (store: SessionStore): string => JSON.stringify(store.getPublicState())

const finalDto = (store: SessionStore): PublicFinalWagerState | null => {
  const round = toPublicState(store.getState()).round
  return round === null || round.kind !== PUBLIC_FINAL_KIND ? null : round
}

const phaseOf = (store: SessionStore): string => finalOf(store).phase

/** Drive the store to `responses-locked` WITHOUT revealing the answer. */
function playToResponsesLocked(store: SessionStore): void {
  store.dispatch({ type: 'BEGIN_FINAL_WAGER', issuedAt: AT, roundId: ROUND, mode: 'classic' })
  const eligible = finalOf(store).snapshot?.teams ?? []
  expect(eligible.length).toBeGreaterThan(0)
  for (const team of eligible) {
    store.dispatch({
      type: 'RECORD_FINAL_WAGER',
      issuedAt: AT,
      roundId: ROUND,
      teamId: team.teamId,
      wager: WAGER,
    })
  }
  store.dispatch({ type: 'LOCK_FINAL_WAGERS', issuedAt: AT, roundId: ROUND })
  store.dispatch({
    type: 'START_FINAL_RESPONSE_WINDOW',
    issuedAt: AT,
    roundId: ROUND,
    captureMode: 'exact-text',
  })
  for (const team of eligible) {
    store.dispatch({
      type: 'RECORD_FINAL_RESPONSE',
      issuedAt: AT,
      roundId: ROUND,
      teamId: team.teamId,
      response: { kind: 'exact', text: `${team.teamId} wrote this` },
    })
  }
  store.dispatch({ type: 'LOCK_FINAL_RESPONSES', issuedAt: AT, roundId: ROUND })
}

function freshStore(): SessionStore {
  return finalStore({ scores: { red: 500, blue: 300 } })
}

describe('M40: the Final answer reaches the projector only at explicit reveal', () => {
  it('keeps the answer off the wire at every stage before the reveal', () => {
    const store = freshStore()

    // Walk the real progression, asserting at each stage rather than only at the end.
    const seen: string[] = []
    const assertAnswerAbsent = () => {
      seen.push(phaseOf(store))
      expect(wire(store)).not.toContain(ANSWER)
    }

    assertAnswerAbsent()
    store.dispatch({ type: 'BEGIN_FINAL_WAGER', issuedAt: AT, roundId: ROUND, mode: 'classic' })
    assertAnswerAbsent()
    const eligible = finalOf(store).snapshot?.teams ?? []
    for (const team of eligible) {
      store.dispatch({
        type: 'RECORD_FINAL_WAGER',
        issuedAt: AT,
        roundId: ROUND,
        teamId: team.teamId,
        wager: WAGER,
      })
    }
    assertAnswerAbsent()
    store.dispatch({ type: 'LOCK_FINAL_WAGERS', issuedAt: AT, roundId: ROUND })
    assertAnswerAbsent()
    store.dispatch({
      type: 'START_FINAL_RESPONSE_WINDOW',
      issuedAt: AT,
      roundId: ROUND,
      captureMode: 'exact-text',
    })
    // The prompt IS public once the window opens; the answer still is not.
    expect(wire(store)).toContain(PROMPT)
    assertAnswerAbsent()
    for (const team of eligible) {
      store.dispatch({
        type: 'RECORD_FINAL_RESPONSE',
        issuedAt: AT,
        roundId: ROUND,
        teamId: team.teamId,
        response: { kind: 'exact', text: `${team.teamId} wrote this` },
      })
    }
    assertAnswerAbsent()

    // The stage this detector exists for.
    store.dispatch({ type: 'LOCK_FINAL_RESPONSES', issuedAt: AT, roundId: ROUND })
    expect(phaseOf(store)).toBe('responses-locked')
    assertAnswerAbsent()

    // The walk really covered the stages, so none of the above passed because
    // the Final had not started.
    expect(seen).toContain('responses-locked')
    expect(new Set(seen).size).toBeGreaterThanOrEqual(4)
  })

  it('publishes the answer only after the explicit reveal', () => {
    const store = freshStore()
    playToResponsesLocked(store)
    expect(wire(store)).not.toContain(ANSWER)

    store.dispatch({ type: 'REVEAL_FINAL_ANSWER', issuedAt: AT, roundId: ROUND })

    expect(phaseOf(store)).toBe('answer-revealed')
    expect(wire(store)).toContain(ANSWER)
  })

  it('keeps every private wager and response fact hidden at responses-locked', () => {
    const store = freshStore()
    playToResponsesLocked(store)
    const serialized = wire(store)

    // What each team wagered, and what each team wrote, are host-private until
    // that team is explicitly revealed — which has not happened here.
    expect(serialized).not.toContain('wrote this')
    // Both spellings: a `wagers` record would not match a `"wager"` key.
    expect(serialized).not.toContain('"wager"')
    expect(serialized).not.toContain('"wagers"')
    // A distinctive amount, not a bare '100' that any revision or timer could
    // contain and false-red on later.
    expect(serialized).not.toContain(String(WAGER))

    const dto = finalDto(store)
    expect(dto).not.toBeNull()
    expect(dto!.stage).toBe('responses-locked')
    // Whatever per-team shape this stage carries, it must expose no private fact.
    const perTeam = 'teams' in dto! ? (dto as { teams: readonly Record<string, unknown>[] }).teams : []
    for (const team of perTeam) {
      expect(team).not.toHaveProperty('wager')
      expect(team).not.toHaveProperty('response')
      expect(team).not.toHaveProperty('outcome')
    }
  })

  it('publishes nothing about the Final before a session exists', () => {
    // Renamed and re-scoped: `createSessionStore()` has NO session, so the
    // sanitizer takes its early return and never enters the Final branch. The
    // old name and comment claimed this proved something about a live round; it
    // does not. What it legitimately pins is that the empty case carries no
    // Final content at all. The real anti-vacuity guard for the stage walk is
    // the positive `toContain(ANSWER)` after the reveal, above.
    const store = createSessionStore()
    const serialized = wire(store)
    expect(serialized).not.toContain(ANSWER)
    expect(serialized).not.toContain(PROMPT)
    expect(toPublicState(store.getState()).round).toBeNull()
  })
})
