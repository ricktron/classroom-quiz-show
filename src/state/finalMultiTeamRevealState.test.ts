import { describe, expect, it } from 'vitest'
import { toPublicState } from './sanitize'
import { PUBLIC_FINAL_KIND } from './publicState'
import { AT, FINAL_ROUND_ID, finalStore, playToReveal } from '../test/finalWagerFixtures'
import type { SessionStore } from './store'

/**
 * CB-F2 — each Final team's settled state must survive the next team's reveal.
 *
 * Court B finding, reported by two blinded testers on different builds and
 * reproduced on the unmutated candidate: after team A was revealed AND judged,
 * revealing team B returned A's projector channel to `Ready`.
 *
 * The projector could only ever know about ONE team, because the public Final
 * payload named just the team on screen now. This drives the real session store
 * and asserts the PUBLIC payload, which is the layer the defect lived in: if the
 * wire cannot distinguish "already adjudicated" from "not yet revealed", no
 * amount of display code can.
 *
 * It also pins the privacy side, because the repair adds a public field: the
 * payload must carry team KEYS only, never a settled team's wager or response
 * beyond the single reveal already allowed.
 */

const ROUND = FINAL_ROUND_ID

function finalPublic(store: SessionStore) {
  const round = toPublicState(store.getState()).round
  if (round === null || round.kind !== PUBLIC_FINAL_KIND) {
    throw new Error('expected a public Final round')
  }
  return round
}

function settledKeys(store: SessionStore): readonly string[] {
  const round = finalPublic(store)
  if (round.stage !== 'team-reveal' && round.stage !== 'resolution') {
    throw new Error(`expected a reveal stage, got ${round.stage}`)
  }
  return round.settledTeamKeys
}

/** Reach the per-team reveal stage with both teams holding a wager and a response. */
function atAnswerRevealed(): SessionStore {
  const store = finalStore({ scores: { red: 400, blue: 400 } })
  playToReveal(store, { wagers: { red: 100, blue: 100 } })
  store.dispatch({ type: 'REVEAL_FINAL_ANSWER', issuedAt: AT, roundId: ROUND })
  return store
}

/** Three eligible teams, so a two-team-shaped repair cannot pass by accident. */
function atAnswerRevealedThreeTeams(): SessionStore {
  const store = finalStore({
    scores: { red: 400, blue: 400, green: 400 },
    definitionOptions: {
      teams: [
        { id: 'red', name: 'Red Team', accent: 'crimson' },
        { id: 'blue', name: 'Blue Team', accent: 'azure' },
        { id: 'green', name: 'Green Team', accent: 'emerald' },
      ],
    },
  })
  playToReveal(store, { wagers: { red: 100, blue: 100, green: 100 } })
  store.dispatch({ type: 'REVEAL_FINAL_ANSWER', issuedAt: AT, roundId: ROUND })
  return store
}

function reveal(store: SessionStore, teamId: string) {
  store.dispatch({ type: 'REVEAL_FINAL_TEAM', issuedAt: AT, roundId: ROUND, teamId })
}

function settle(store: SessionStore, teamId: string, outcome: 'correct' | 'incorrect') {
  store.dispatch({ type: 'SETTLE_FINAL_TEAM', issuedAt: AT, roundId: ROUND, teamId, outcome })
}

describe('CB-F2 Final per-team reveal state on the public wire', () => {
  it('publishes nobody as settled before any team is adjudicated', () => {
    const store = atAnswerRevealed()
    reveal(store, 'red')
    expect(settledKeys(store)).toEqual([])
  })

  it('keeps the first team settled once the second team is revealed', () => {
    const store = atAnswerRevealed()
    reveal(store, 'red')
    settle(store, 'red', 'correct')
    expect(settledKeys(store)).toEqual(['t0'])

    // The exact Court transition: move on to the next team.
    reveal(store, 'blue')
    expect(
      settledKeys(store),
      'the team the class already watched be judged must still be reported settled',
    ).toContain('t0')
  })

  it('reports both teams once both are judged, and never loses the first', () => {
    const store = atAnswerRevealed()
    reveal(store, 'red')
    settle(store, 'red', 'correct')
    reveal(store, 'blue')
    settle(store, 'blue', 'incorrect')
    const keys = settledKeys(store)
    expect(keys).toContain('t0')
    expect(keys).toContain('t1')
  })

  it('reports settled teams in reveal order, not score-map order', () => {
    const store = atAnswerRevealed()
    reveal(store, 'blue')
    settle(store, 'blue', 'correct')
    reveal(store, 'red')
    settle(store, 'red', 'correct')
    expect(settledKeys(store)).toEqual(['t1', 't0'])
  })

  it('carries keys only — no settled team leaks a second wager or response', () => {
    const store = atAnswerRevealed()
    reveal(store, 'red')
    settle(store, 'red', 'correct')
    reveal(store, 'blue')
    const round = finalPublic(store)
    if (round.stage !== 'team-reveal') throw new Error('expected team-reveal')

    // Exactly one reveal payload is public, and it is the team on screen now.
    expect(round.reveal.teamKey).toBe('t1')
    // The settled list is primitive keys, so it cannot smuggle a payload.
    for (const key of round.settledTeamKeys) {
      expect(typeof key).toBe('string')
    }
    const serialized = JSON.stringify(round.settledTeamKeys)
    expect(serialized).not.toContain('wager')
    expect(serialized).not.toContain('response')
    expect(serialized).not.toContain('settlement')
  })

  it('does not regress earlier teams when a THIRD team is revealed and judged', () => {
    const store = atAnswerRevealedThreeTeams()
    reveal(store, 'red')
    settle(store, 'red', 'correct')
    reveal(store, 'blue')
    settle(store, 'blue', 'incorrect')
    expect(settledKeys(store)).toEqual(['t0', 't1'])

    // The third reveal is where a two-team-shaped repair would drop a team.
    reveal(store, 'green')
    const afterThirdReveal = settledKeys(store)
    expect(afterThirdReveal).toContain('t0')
    expect(afterThirdReveal).toContain('t1')

    settle(store, 'green', 'correct')
    expect(settledKeys(store)).toEqual(['t0', 't1', 't2'])
  })
})
