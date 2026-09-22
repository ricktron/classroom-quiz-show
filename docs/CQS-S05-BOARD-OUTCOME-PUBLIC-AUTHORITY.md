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
- **Date (UTC):** 2026-09-22

```text
PATH A — NARROW BOARD-OUTCOME AUTHORITY
adjudication ≠ scoring
do not reopen ADR-006
snapshot rendering ≠ event replay
Stop for Rick
```

---

## A. Identity

| Fact | Value |
| --- | --- |
| Canonical base | `ba032bb1326027d5ca0bc0c84c2248b511c8b15d` |
| Branch | `feat/cqs-real-mvp-s05-board-outcome-public-authority` |
| Exact head | `6e0806023edfa8ed0b3bee319980a0ef29f2fe12` |
| PR | [#93](https://github.com/ricktron/classroom-quiz-show/pull/93) (non-draft; auto-merge off) |

Intervening `origin/main` delta after expected base at start of work: **none**.

---

## B. Domain model

Final `ActiveResponseResolution` (`src/game/timing/buzzQueue.ts`):

```ts
type ActiveResponseResolution =
  | { readonly kind: 'incorrect' }
  | { readonly kind: 'passed' }
  | { readonly kind: 'correct' }
```

Private outcome replay state on `ResponsePhaseState`:

```ts
type BoardResponseOutcome = {
  readonly teamId: string
  readonly kind: ActiveResponseResolutionKind // 'incorrect' | 'passed' | 'correct'
}

// ResponsePhaseState.outcome: BoardResponseOutcome | null
```

A1: opportunity-ending `correct` rides existing
`RESOLVE_ACTIVE_RESPONSE` / `ACTIVE_RESPONSE_RESOLVED` — **no** parallel
command family. Team comes from the authoritative buzz queue, not Host input.

---

## C. Correct semantics

Proved (primarily `src/state/buzzQueueReducer.test.ts`):

| Requirement | Result |
| --- | --- |
| Ends response opportunity | Queue cleared to **empty**; phase disarmed; further buzzes rejected |
| No promotion | Waiting teams are **not** promoted |
| No score | No `TEAM_SCORE_ADJUSTED` from `RESOLVE_ACTIVE_RESPONSE` `correct` |
| No answer reveal | No reveal / return-to-board side effects |
| Reversible | Ordinary undo / replay restores prior queue + armed/timer and clears outcome |

`correct` uses **empty queue + separate outcome**, not buzz `exhausted`
(exhausted would falsely project “No one left to answer”).

---

## D. Incorrect/pass preservation

Existing behavior unchanged (`buzzQueueReducer.test.ts` promotion / exhausted
suites):

- Incorrect/pass with waiting → **promote** next team; outcome records the
  adjudicated team; buzz shows the newly active team.
- Incorrect/pass with nobody waiting → buzz queue **exhausted**.
- Neither incorrect nor pass moves points.
- No parallel resolution command family; malformed kinds still fail closed.

---

## E. Outcome lifecycle

| Concern | Behavior |
| --- | --- |
| Replacement | Outcome = **most recent** adjudication in the current opportunity (overwrite, not history list) |
| Clearing | Cleared with response-opportunity lifecycle: reset, tile change, answer reveal, return to board, round transition, game end (as appropriate) |
| `isInitialResponsePhase` | Requires `outcome === null` — a phase holding only an adjudication is **not** initial even when disarmed / idle / empty |
| Undo | Replay restores prior queue / armed / timer and clears or restores outcome accordingly |

---

## F. Public DTO

Exact PublicState schema **9** shape (`src/state/publicState.ts`):

```ts
type PublicBoardResponseOutcome =
  | { readonly status: 'none' }
  | {
      readonly status: 'resolved'
      readonly teamKey: string // positional PublicTeam.key
      readonly kind: 'correct' | 'incorrect' | 'passed'
    }
```

Nested under `PublicResponseState.boardOutcome` (board-owned; response is
`null` during Final → board outcome impossible then).

**`outcomeKey` was omitted.** Remount seeds the truthful snapshot
(`data-seeded="true"`); no fabricated transition token. No public event
identity / seq / timestamp / animation token. If a later presentation child
demonstrates a `{teamKey, kind}` collision that forces public event identity →
**STOP — OWNER DECISION** (not invented here).

---

## G. Privacy

Sanitizer allow-list only (`sanitize.ts` + `boardOutcomeSanitize.test.ts`):

- Public carries positional `teamKey` + `kind` only.
- **No** authored team ids, event ids, queue order, private scores, controller
  ids, seq, timestamps, or animation state.
- Unmappable `teamId` → fail closed (no fabricated key).
- `outcomeKey` rejected if present on the wire.

---

## H. Host

`LocalInputHostPanel`: restrained **Mark correct** (`data-testid="lih-correct"`)
beside incorrect / pass. Dispatches only
`RESOLVE_ACTIVE_RESPONSE` with `{ kind: 'correct' }`. Does **not** call
`ADJUST_TEAM_SCORE`. Hint copy: marking correct / incorrect / passed moves no
points.

---

## I. Minimal Display

`BoardOutcomeDisplay` — minimal truthful text only:

- Correct / Incorrect / Passed + team name
- No theatrical choreography, flash, or score animation

Coexistence with buzz:

- Correct + empty buzz → no “No one left to answer”
- Incorrect + promoted next → outcome text coexists with active-buzz text without
  implying the adjudicated team is still answering
- Remount → `data-seeded="true"` truthful snapshot seed; no fabricated transition

Quiet-cognition densify for `.bod` preserves F1 geometry coexistence.

---

## J. Score independence

Proved (`boardOutcomeSanitize.test.ts`, `buzzQueueReducer.test.ts`,
`derivePresentationCue.test.ts`):

- `ADJUST_TEAM_SCORE` alone **never** creates `boardOutcome` (stays `none`).
- `RESOLVE_ACTIVE_RESPONSE` correct / incorrect / passed **never** appends
  `TEAM_SCORE_ADJUSTED`.
- Adjudication ≠ scoring; board outcome is not derived from score activity.

---

## K. Audio

ADR-020:

- **No new sound category.**
- Board `correct` → **silent** (`derivePresentationCue` returns `null`).
- `positive-award` remains score / Final driven only.
- `incorrect` cue unchanged.

---

## L. Compatibility

| Contract | Result |
| --- | --- |
| `PUBLIC_STATE_SCHEMA_VERSION` | **8 → 9** (fail-closed; v8 payloads with outcome rejected) |
| Sync envelope (`SYNC_SCHEMA_VERSION`) | **stays 2** |
| `PERSISTENCE_WIRE_VERSION` | **stays 1** (outcome rides existing events; private persistence bump **not** required → no STOP OWNER DECISION) |

---

## M. ADR/documentation

| Doc | Action |
| --- | --- |
| ADR-008 | **Amended** — prior “no `correct` member” retained as history; dated S05 Path A amendment for opportunity-ending correct + projector-visible board outcome |
| ADR-006 | **Unchanged in substance** — no score animation / deltas / flash / resort |
| ADR-020 | **Note only** — board correct silent; positive-award stays score/Final driven |
| GAME-ENGINE-BOUNDARIES / STATUS / CURRENT | Light routing as **AUTHORIZED DELIVERY CANDIDATE** only |
| This doc | Delivery candidate closeout (not terminal) |

---

## N. Automated evidence

Focused coverage:

- Domain: `buzzQueue.test.ts`, `timing.test.ts` (`isInitialResponsePhase` + outcome)
- Reducer / undo / promotion / correct: `buzzQueueReducer.test.ts`
- Public / sanitizer / score independence: `boardOutcomeSanitize.test.ts`,
  `responseSanitize.test.ts`, `buzzSanitize.test.ts`
- Display: `BoardOutcomeDisplay.test.tsx`, `SignalRail.test.tsx`,
  audience shell / presentation selects
- Audio: `derivePresentationCue.test.ts` (board correct silent)
- E2E: `tests/e2e/s05-board-outcome-public-authority.spec.ts`
  (correct / incorrect+active coexistence / remount Passed / schema-8 fail-closed)
  on `projector-720p` and `desktop-1080p` via sanitizer-derived visual-stress
  snapshots

---

## O. COURT

Semantic observations (foundation tranche; no theatrical choreography):

| Concern | Observation |
| --- | --- |
| Privacy allow-list | teamKey + kind only; Host-private fields stay private |
| Fail-closed version bump | schema 8 consumers reject schema 9; missing `boardOutcome` rejected |
| Remount seed | truthful snapshot; no fabricated flash / transition |
| Adjudication ≠ scoring | tested both directions |
| Exhausted vs correct | correct must not imply “No one left to answer” |
| Final isolation | board outcome lives under response; impossible during Final |

---

## P. F1 coexistence

- Quiet-cognition densify for board-outcome Display text at projector density.
- E2E projects: `projector-720p` and `desktop-1080p` (board-outcome spec + F1
  visual-stress matrix via verify / CI).
- No claim of physical Sony / projector qualification (S06).

---

## Q. Verification

Observed locally on this branch (re-observe on PR CI):

| Check | Result |
| --- | --- |
| `git diff --check` | clean |
| Focused Path A unit set (`boardOutcomeSanitize`, `buzzQueueReducer`, `BoardOutcomeDisplay`, `derivePresentationCue`, `buzzQueue`) | **116 passed** |
| E2E `s05-board-outcome-public-authority` at 720p/1080p | **passed** after Playwright browser install |
| `npm run verify` / `npm run verify:all` | required; full e2e matrix owned by PR CI — local vitest projects exit code is unreliable when an unrelated file fails |
| Local anomaly | `usePublicState` BroadcastChannel MessageEvent failure reproduces against main tip on this VM (jsdom + Node BroadcastChannel); **not** introduced by Path A — re-observe on PR CI |
| PR CI matrix | Lint/typecheck/unit, Playwright, Desktop, macOS/Windows package, SonarCloud — re-observe on [#93](https://github.com/ricktron/classroom-quiz-show/pull/93); do not claim unrun checks passed |

Physical qualification remains **S06** and is **not** claimed.

---

## R. Scope audit

**Allowed surfaces touched:** buzz resolution domain, response-phase outcome,
reducer resolve path, publicState v9 + sanitizer, Host Mark correct, minimal
Display + SignalRail, ADR-008/020 notes, STATUS/CURRENT candidate routing,
focused tests + e2e, this closeout.

**Confirmed absent / unauthorized:**

- no scoring semantics change; no score animation; ADR-006 presentation unchanged
- no Game schema / round registry / sync envelope change
- no Sony / controller mapping / Final choreography / winner celebration
- no board/round-transition choreography; no theatrical correct/incorrect
- no S04D; no S06; no release; no REAL MVP complete claim
- no S05 parent or child terminalization

---

## S. Remaining owner gates

Explicitly retain:

```text
FUTURE OWNER DECISION STILL REQUIRED FOR S05 SCORE-CHANGE REQUIREMENT
```

Also:

- theatrical board-outcome choreography remains **separately unauthorized**
- `outcomeKey` / public event identity remains **STOP — OWNER DECISION** if
  collision later forces it
- private persistence bump remains **STOP — OWNER DECISION** if a later finding
  requires it
- S05 parent remains **OPEN / NOT TERMINAL**

---

## T. Next owner decision

**fresh independent exact-head review of the board-outcome public-authority candidate.**

Does not authorize merge, auto-merge, S05 parent terminalization, score
choreography / ADR-006 reopen, theatrical presentation child, S04D, S06, or
REAL MVP complete.

```text
Stop for Rick.
AUTHORIZED DELIVERY CANDIDATE — not terminal
S05 parent OPEN / NOT TERMINAL
```

---

## Appendix — PR pin (updated with tip)

| Fact | Value |
| --- | --- |
| PR | https://github.com/ricktron/classroom-quiz-show/pull/93 |
| Head SHA | `6e0806023edfa8ed0b3bee319980a0ef29f2fe12` |
| Draft | **no** |
| Auto-merge | **off** |
| Merge | **do not merge** — Stop for Rick |
