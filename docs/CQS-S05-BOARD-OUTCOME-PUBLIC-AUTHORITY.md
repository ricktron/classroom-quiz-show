# CQS REAL MVP S05 — board-outcome public authority

Local and repository delivery evidence for the bounded S05 Path A foundation
tranche that gives category-board Display durable, projector-safe response
outcome authority without reopening ADR-006 score presentation.

- **Authorization:**
  `AUTHORIZE-CQS-REAL-MVP-S05-BOARD-OUTCOME-PUBLIC-AUTHORITY-1`
- **Tranche:**
  `CQS-REAL-MVP-S05-BOARD-OUTCOME-PUBLIC-AUTHORITY`
- **Parent:** `CQS-REAL-MVP-S05-FLAGSHIP-VISUAL-FIDELITY-AND-GAME-SHOW-CHOREOGRAPHY`
  (parent remains **OPEN / NOT TERMINAL**)
- **Tranche status:** **AUTHORIZED DELIVERY CANDIDATE** (not terminal)
- **Date (UTC):** 2026-09-21

```text
PATH A — NARROW BOARD-OUTCOME AUTHORITY
adjudication ≠ scoring
do not reopen ADR-006
snapshot rendering ≠ event replay
Stop for Rick
```

---

## A. Base and scope

| Fact | Value |
| --- | --- |
| Canonical base | `ba032bb1326027d5ca0bc0c84c2248b511c8b15d` |
| Branch | `feat/cqs-real-mvp-s05-board-outcome-public-authority` |
| In scope | A1 `correct` on `ActiveResponseResolution`; private phase `outcome`; Host Mark correct; PublicState **8→9** `boardOutcome`; sanitizer; minimal Display text; ADR-008 amend; ADR-020 correct-silent note; tests/e2e; this doc; STATUS/CURRENT as delivery candidate |
| Out of scope | Theatrical correct/incorrect choreography; score animation; ADR-006 reopen; Final choreography; winner celebration; board/round-transition choreography; S04D; S06; S05 parent terminalization; `outcomeKey` (omitted by default) |

Intervening main delta after expected base: **none** at start of work.

---

## B. Model (A1)

Extended `ActiveResponseResolution` with opportunity-ending `{ kind: 'correct' }`
via existing `RESOLVE_ACTIVE_RESPONSE` / `ACTIVE_RESPONSE_RESOLVED` — **no**
parallel command family.

| Kind | Queue | Scores? | Reveal? | Return-to-board? |
| --- | --- | --- | --- | --- |
| `incorrect` | promote next | No | No | No |
| `passed` | promote next | No | No | No |
| `correct` | clear to **empty** (not exhausted); disarm | No | No | No |

Private `ResponsePhaseState.outcome = { teamId, kind } | null` — most recent
adjudication for the live opportunity (replacement, not history). Cleared with
existing response-opportunity lifecycle. `isInitialResponsePhase` requires
`outcome === null`.

---

## C. Why not exhausted for correct

Buzz `exhausted` projects “No one left to answer.” Using it for `correct` would
falsely imply queue exhaustion. Correct uses **empty queue + separate outcome**.

---

## D. Public DTO

```ts
type PublicBoardResponseOutcome =
  | { status: 'none' }
  | { status: 'resolved'; teamKey: string; kind: 'correct' | 'incorrect' | 'passed' }
```

- Nested under `PublicResponseState.boardOutcome` (board-owned; impossible during Final).
- **`outcomeKey` omitted** — remount seeds truthful snapshot; no fabricated transition.
- Positional `teamKey` only; fail closed if unmappable.
- Sanitizer allow-list only; never authored ids, scores, event ids, seq, animation.

---

## E. Wire / persistence

| Contract | Result |
| --- | --- |
| `PUBLIC_STATE_SCHEMA_VERSION` | **8 → 9** (fail-closed) |
| Sync envelope | **stays 2** |
| `PERSISTENCE_WIRE_VERSION` | **stays 1** (outcome rides existing events; no private persistence bump) |

---

## F. Host

Restrained **Mark correct** beside incorrect/pass on `LocalInputHostPanel`.
Does **not** call `ADJUST_TEAM_SCORE`. Hint copy states correct/incorrect/pass
move no points.

---

## G. Display

`BoardOutcomeDisplay` — minimal truthful text (Correct / Incorrect / Passed +
team). No theatrical choreography. Coexists with buzz active/waiting/exhausted
and ready/armed copy. Quiet-cognition densify for F1 geometry coexistence.

---

## H. Audio (ADR-020)

Board `correct` is **silent** — no new sound category. `positive-award` stays
score/Final driven. `incorrect` cue unchanged.

---

## I. ADR strategy

| ADR | Action |
| --- | --- |
| ADR-008 | **Amended** — retract “no correct member”; define opportunity-ending correct; preserve history |
| ADR-006 | **Unchanged in substance** — no score animation/deltas/flash/resort |
| ADR-020 | **Note only** — board correct silent |

---

## J. Adjudication ≠ scoring

Proved in tests: `ADJUST_TEAM_SCORE` alone never creates `boardOutcome`;
`RESOLVE_ACTIVE_RESPONSE` correct/incorrect/passed never appends
`TEAM_SCORE_ADJUSTED`.

---

## K. Undo / remount / clearing

- Undo restores queue + outcome via replay.
- Remount seeds current public snapshot (`data-seeded="true"`); no fabricated flash.
- Outcome clears with reset / tile change / reveal / return-to-board / round / end.

---

## L. COURT-style semantic review

| Concern | Result |
| --- | --- |
| Privacy allow-list | teamKey + kind only; no Host-private |
| Fail-closed version bump | v8 consumers reject v9 |
| Remount seed | no fabricated transition |
| Adjudication ≠ scoring | tested |
| F1 geometry coexistence | quiet-cognition densify for `.bod` at 720p/1080p projects |

---

## M. Verification (local evidence to re-observe on the PR)

Required:

- `git diff --check`
- focused unit/component tests (resolution, sanitizer, Display, audio)
- e2e `s05-board-outcome-public-authority.spec.ts`
- `npm run verify`
- `npm run verify:all`
- Playwright projects including `projector-720p` / `desktop-1080p` via verify:all / CI

Physical Sony / projector qualification remains **S06** and is **not** claimed.

---

## N. Non-goals / forbidden

No merge; no auto-merge; no theatrical choreography; no score animation; no
ADR-006 score-presentation changes; no Final/winner/board-round choreography;
no S04D; no S06; no release; no physical qualification; no REAL MVP complete;
no S05 parent or child terminalization.

---

## O. Remaining S05 (later; not authorized here)

- board-outcome feedback **choreography** (presentation child)
- score-change choreography (ADR-006 still future owner decision)
- board / round transitions
- Final choreography / winner celebration
- Host polish / shared motion consistency

Parent S05 remains **OPEN / NOT TERMINAL**.

---

## P. Program agreement

```text
S04A/B/C: TERMINALLY COMPLETE
S05-F1: TERMINALLY COMPLETE
S05 buzz / active-claim: TERMINALLY COMPLETE
S05 board-outcome public authority: AUTHORIZED DELIVERY CANDIDATE
S05 parent: OPEN / NOT TERMINAL
S04D / additional S05 / S06: NOT AUTHORIZED
REAL MVP: NOT COMPLETE
ADR-006 score-change: FUTURE OWNER DECISION STILL REQUIRED
```

---

## Q. Evidence pointers

- Design authority (store): Path A contract design packet
- Domain: `src/game/timing/buzzQueue.ts`, `responsePhase.ts`, `src/state/reducer.ts`
- Public: `src/state/publicState.ts`, `sanitize.ts`
- Host: `src/host/LocalInputHostPanel.tsx`
- Display: `src/display/BoardOutcomeDisplay.tsx`, `SignalRail.tsx`
- ADRs: ADR-008 (amended), ADR-020 (note), ADR-006 (unchanged)

---

## R. PR identity

| Fact | Value |
| --- | --- |
| PR | [#93](https://github.com/ricktron/classroom-quiz-show/pull/93) |
| Head SHA | `b2cb784443cd3a3b95ab4249f3bf11d5d8ed2198` |
| Base | `ba032bb1326027d5ca0bc0c84c2248b511c8b15d` |
| Draft | **no** (non-draft) |
| Auto-merge | **off** |
| Merge | **do not merge** — Stop for Rick |

---

## S. Warnings / honesty

- Durable STATUS/CURRENT mark **AUTHORIZED DELIVERY CANDIDATE** only — they do
  not predict open PR merge SHA.
- Private persistence version bump was **not** required; if a later finding
  forces it, that is a fresh owner decision.
- `outcomeKey` was omitted; if presentation collision later forces public event
  identity, **STOP OWNER DECISION**.
- Local VM note: `usePublicState` BroadcastChannel MessageEvent failure
  reproduces against main tip on this environment (jsdom + Node BroadcastChannel);
  not introduced by this change. Re-observe on PR CI. Focused Path A unit tests
  and projector-720p / desktop-1080p board-outcome e2e **passed** locally after
  Playwright browser install. Full `npm run verify:all` e2e matrix is owned by
  PR CI (local vitest projects exit code is unreliable when one file fails).

---

## T. Next owner decision

**Fresh independent exact-head review** of this delivery candidate.

Does not authorize merge, auto-merge, S05 parent terminalization, score
choreography / ADR-006 reopen, theatrical presentation child, S04D, S06, or
REAL MVP complete.

```text
Stop for Rick.
AUTHORIZED DELIVERY CANDIDATE — not terminal
S05 parent OPEN / NOT TERMINAL
```
