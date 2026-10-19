import { describe, expect, it } from 'vitest'
import { toPublicState } from './sanitize'
import {
  PUBLIC_FINAL_KIND,
  type PublicFinalWagerState,
  type PublicRoundState,
} from './publicState'
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
 * Every string the projector could receive, from BOTH edges of the boundary.
 *
 * Two reads, deliberately, because each alone has a blind spot:
 *
 *  - `store.getPublicState()` is what the broadcaster publishes
 *    (`src/sync/broadcaster.ts`), so it catches a leak added DOWNSTREAM of the
 *    sanitizer. But it is `safeToPublicState`, which validates with
 *    `hasExactOwnKeys`: a leak that adds an unexpected key fails validation and
 *    the whole snapshot falls back to `INITIAL_PUBLIC_STATE`. Asserting only
 *    this is therefore blind to every leak the host's own validator rejects —
 *    including publishing `answer` at `responses-locked`, the exact mutation
 *    this file exists to kill.
 *  - `toPublicState(store.getState())` is the raw projection, which shows that
 *    leak plainly but would miss anything added after it.
 *
 * So both are swept. A string must be absent from each.
 */
const wire = (store: SessionStore): string =>
  // NUL-separated: a needle must not be able to straddle the join seam.
  `${JSON.stringify(store.getPublicState())}\u0000${JSON.stringify(toPublicState(store.getState()))}`

/**
 * The same sweep with JSON escaping undone.
 *
 * A private fact nested inside a string VALUE serialises with escaped quotes
 * (`"detail":"Playing [\"blue\",\"red\"]"`), so a quoted-key needle like
 * `"wagers"` cannot match it. Sweeping the unescaped form too makes those
 * needles actually bind.
 */
const unescapedWire = (store: SessionStore): string => wire(store).replace(/\\"/g, '"')

const asFinalDto = (round: PublicRoundState | null): PublicFinalWagerState | null =>
  round === null || round.kind !== PUBLIC_FINAL_KIND ? null : round

/**
 * The Final DTO on the RAW edge.
 *
 * Correct for asserting the exact key set, because a leaked key is visible here
 * — on the published edge the same leak fails `hasExactOwnKeys` and blanks the
 * whole snapshot, so an exact-keys assertion there would read as satisfied.
 */
const rawFinalDto = (store: SessionStore): PublicFinalWagerState | null =>
  asFinalDto(toPublicState(store.getState()).round)

/**
 * The Final DTO on the PUBLISHED edge — what the broadcaster actually sends.
 *
 * Correct for asserting the STAGE, because this is the read that goes blank on
 * a validator rejection. Asserting the raw stage instead would be fallback-blind,
 * which is the very hole the stage guards below exist to close.
 */
const publishedFinalDto = (store: SessionStore): PublicFinalWagerState | null =>
  asFinalDto(store.getPublicState().round)

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
    /*
      At every stage: the answer is absent from BOTH edges, AND the published
      snapshot is still that stage.

      The published-stage half is what makes the whole walk fallback-proof. A
      leak that fails `hasExactOwnKeys` blanks the published snapshot to
      `INITIAL_PUBLIC_STATE`; the absence assertion would then pass while the
      projector showed the neutral waiting panel for the entire stage. Checking
      the stage here closes that at every step rather than at one.
    */
    const assertAnswerAbsent = (publishedStage: string | null) => {
      seen.push(phaseOf(store))
      expect(wire(store)).not.toContain(ANSWER)
      expect(publishedFinalDto(store)?.stage ?? null).toBe(publishedStage)
    }

    assertAnswerAbsent('setup')
    store.dispatch({ type: 'BEGIN_FINAL_WAGER', issuedAt: AT, roundId: ROUND, mode: 'classic' })
    assertAnswerAbsent('wager-entry')
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
    assertAnswerAbsent('wager-entry')
    store.dispatch({ type: 'LOCK_FINAL_WAGERS', issuedAt: AT, roundId: ROUND })
    assertAnswerAbsent('wagers-locked')
    store.dispatch({
      type: 'START_FINAL_RESPONSE_WINDOW',
      issuedAt: AT,
      roundId: ROUND,
      captureMode: 'exact-text',
    })
    /*
      The prompt IS public once the window opens; the answer still is not.
      Asserted on the PUBLISHED edge alone: `wire()` concatenates the raw
      projection too, and the raw edge would satisfy this even when the
      published snapshot had fallen back to `INITIAL_PUBLIC_STATE` — which is
      exactly the blank-to-waiting-panel case this guard exists to catch.
    */
    expect(JSON.stringify(store.getPublicState())).toContain(PROMPT)
    assertAnswerAbsent('response-entry')
    for (const team of eligible) {
      store.dispatch({
        type: 'RECORD_FINAL_RESPONSE',
        issuedAt: AT,
        roundId: ROUND,
        teamId: team.teamId,
        response: { kind: 'exact', text: `${team.teamId} wrote this` },
      })
    }
    assertAnswerAbsent('response-entry')

    // The stage this detector exists for.
    store.dispatch({ type: 'LOCK_FINAL_RESPONSES', issuedAt: AT, roundId: ROUND })
    expect(phaseOf(store)).toBe('responses-locked')
    assertAnswerAbsent('responses-locked')
    /*
      And the PUBLISHED snapshot is still a live Final at this stage. Without
      this, a leak that fails `hasExactOwnKeys` would blank the wire to
      `INITIAL_PUBLIC_STATE` and the absence assertion above would pass while
      the projector showed the neutral waiting panel for the whole stage.
    */
    expect(JSON.stringify(store.getPublicState())).toContain(PROMPT)
    expect(publishedFinalDto(store)?.stage).toBe('responses-locked')

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
    /*
      PRESENCE is asserted on the PUBLISHED edge alone — the last PRESENCE
      assertion in this file that still read the dual sweep, and the sibling of
      the two fixed in R3. Absence assertions still read it, deliberately, and
      that asymmetry is the point: `toContain` over a concatenation is a
      DISJUNCTION, so the weaker edge decides and a blanked published snapshot
      passes; `not.toContain` over the same concatenation is a CONJUNCTION, so
      it is strictly stronger than either edge alone.

      `wire()` includes the raw projection, which carries the answer even when
      the published snapshot has fallen back to `INITIAL_PUBLIC_STATE`. So a
      validator-rejecting key at `answer-revealed` left this GREEN while the
      projector showed the neutral waiting panel at the reveal itself — the
      climax of the Final. Reproduced by a reviewer, and now RED.

      The absence assertion above correctly stays on `wire()`: for absence, both
      edges must be clean.
    */
    expect(JSON.stringify(store.getPublicState())).toContain(ANSWER)
    expect(publishedFinalDto(store)?.stage).toBe('answer-revealed')
  })

  it('keeps every private wager and response fact hidden at responses-locked', () => {
    const store = freshStore()
    playToResponsesLocked(store)
    const serialized = wire(store)

    // What each team wagered, and what each team wrote, are host-private until
    // that team is explicitly revealed — which has not happened here.
    expect(serialized).not.toContain('wrote this')
    // Both spellings, on the UNESCAPED sweep: a record nested inside a string
    // value serialises its quotes escaped, so these needles would not otherwise
    // match it.
    const unescaped = unescapedWire(store)
    expect(unescaped).not.toContain('"wager"')
    expect(unescaped).not.toContain('"wagers"')
    // A distinctive amount, not a bare '100' that any revision or timer could
    // contain and false-red on later.
    expect(serialized).not.toContain(String(WAGER))

    const dto = rawFinalDto(store)
    expect(dto).not.toBeNull()
    /*
      A stage read on the RAW edge, which `publishedFinalDto`'s docblock warns
      against — so, explicitly, why it is right here. This is a precondition for
      the exact-key-set assertion below, which must be raw to see a leaked key
      at all; a published read would blank and the key set would look satisfied.
      Reading the stage on the same edge keeps the two consistent. The published
      stage at this point is covered by the walk above, not here.
    */
    expect(dto!.stage).toBe('responses-locked')
    /*
      `responses-locked` carries NO per-team key at all — that is the strongest
      possible answer, and it is asserted directly. A loop over `teams` here
      would have been decorative: it never executed, so its `not.toHaveProperty`
      checks were dead while reading like pinned invariants.
    */
    expect(dto).not.toHaveProperty('teams')
    expect(dto).not.toHaveProperty('answer')
    expect(Object.keys(dto!).sort()).toEqual(['kind', 'prompt', 'stage'])
  })

  it('publishes nothing about the Final before a session exists', () => {
    // Renamed and re-scoped: `createSessionStore()` has NO session, so the
    // sanitizer takes its early return and never enters the Final branch. The
    // old name and comment claimed this proved something about a live round; it
    // does not. What it legitimately pins is that the empty case carries no
    // Final content at all.
    //
    // Anti-vacuity for the stage walk does NOT rest on this test. Inside the
    // walk itself it rests on the per-stage published `stage` assertion in
    // `assertAnswerAbsent`, on the two published-edge `toContain(PROMPT)`
    // assertions once the response window opens, and on the `seen` checks that
    // a walk which never started cannot satisfy.
    //
    // The published-edge `toContain(ANSWER)` after the reveal anchors the FILE,
    // not the walk: it lives in a separate `it()`, so it cannot make the walk
    // non-vacuous. Two earlier versions of this comment got this wrong — one
    // named the reveal assertion "the real anti-vacuity guard" while it still
    // read the raw edge, and the next named it as a walk anchor while omitting
    // the `toContain(PROMPT)` pair that genuinely is one.
    const store = createSessionStore()
    const serialized = wire(store)
    expect(serialized).not.toContain(ANSWER)
    expect(serialized).not.toContain(PROMPT)
    expect(toPublicState(store.getState()).round).toBeNull()
  })
})
