# CQS REAL MVP S05 — board-outcome public authority

Local and repository delivery evidence for the bounded S05 Path A foundation
tranche that gives category-board Display durable, projector-safe response
outcome authority without reopening ADR-006 score presentation.

- **Authorization:**
  `AUTHORIZE-CQS-REAL-MVP-S05-BOARD-OUTCOME-PUBLIC-AUTHORITY-1`
- **Repair authorization (F1–F5):**
  `AUTHORIZE-CQS-REAL-MVP-S05-PR93-BOARD-OUTCOME-F1-F5-REPAIR-1`
- **Repair authorization (F6):**
  `AUTHORIZE-CQS-REAL-MVP-S05-PR93-BOARD-OUTCOME-F6-CORRECT-CLOSED-TIMER-REPAIR-1`
- **Repair authorization (F7):**
  `AUTHORIZE-CQS-REAL-MVP-S05-PR93-BOARD-OUTCOME-F7-CORRECT-CLOSED-PRESENTATION-REPAIR-1`
- **Repair authorization (F8):**
  `AUTHORIZE-CQS-REAL-MVP-S05-PR93-BOARD-OUTCOME-F8-NEXUS-CORRECT-CLOSED-TIMER-SUPPRESSION-1`
- **Repair authorization (Sonar-only deduplication):**
  `AUTHORIZE-CQS-REAL-MVP-S05-PR93-SONAR-ONLY-DEDUPLICATION-REPAIR-1`
- **Terminalization authorization (this packet):**
  `AUTHORIZE-CQS-REAL-MVP-S05-BOARD-OUTCOME-PUBLIC-AUTHORITY-TERMINALIZATION-CANDIDATE-1`
- **Tranche:**
  `CQS-REAL-MVP-S05-BOARD-OUTCOME-PUBLIC-AUTHORITY`
- **Parent:** `CQS-REAL-MVP-S05-FLAGSHIP-VISUAL-FIDELITY-AND-GAME-SHOW-CHOREOGRAPHY`
  (parent remains **OPEN / NOT TERMINAL**)
- **Tranche status:** **TERMINALLY COMPLETE**
- **Date (UTC):** 2026-09-22

```text
PATH A — NARROW BOARD-OUTCOME AUTHORITY
adjudication ≠ scoring
do not reopen ADR-006
snapshot rendering ≠ event replay
child terminal ≠ parent terminal
Stop for Rick
```

### Review / repair / merge chain (observed)

| Head | Verdict |
| --- | --- |
| `b0b69f2169c05506cd6394a49a40b867c267a200` | **REPAIR REQUIRED** — independent exact-head review: F1–F5 (correct not structurally terminal; Host false empty copy; Signal Rail ready beside Correct; Sonar 5.4%; docs schema/closeout) |
| `99b001369a2786ee8afefa624d920b2dc69311e9` | **REPAIR REQUIRED — F6** — fresh re-review after F1–F5 repair: F1–F5 **CLOSED**; residual post-correct timer-event mutation (PAUSE/RESUME/INTERRUPT/EXPIRE planner + applicator) |
| `72e53e3091300c9cd4de032373cceee0eadf1f0b` | **REPAIR REQUIRED** — fresh re-review after F6: F1–F6 **CLOSED**; residual **F7** passive leftover-running timer public presentation + Host control contradiction |
| `0b0accbf7329fb942edc2c9fb70d5e4fcc554d32` | **REPAIR REQUIRED — F8** — fresh re-review after F7: F1–F7 **CLOSED**; residual Nexus Core `"Ready"` beside Correct on AudienceDisplayShell |
| `c68bdccf074e0e6f0e4141e8136e34dafc404335` | **F8 SEMANTICALLY CLOSED — SONAR-ONLY REPAIR REQUIRED** — F1–F8 semantic findings **CLOSED**; Sonar new-code duplication **4.2%** (>3%) |
| `fce42ee66ba9047c8ede1beb602cf2479cc677af` | **ACCEPT CANDIDATE** |
| squash / main `80b287664bccb16c2516802bc64080a82e08faeb` | **MERGED** (PR #93; sole parent `ba032bb…`; trees **EXACT MATCH** `05179325…`) |

Repair alone did **not** mark this tranche independently accepted. Do not
flatten F1–F8 + Sonar-only repair lineage to first-pass success. Do not
reopen closed F1–F8 as still-broken intake/Host/Signal/docs/timer-event-
mutation/presentation/Nexus Ready.

---

## A. Identity

| Fact | Value |
| --- | --- |
| Canonical implementation base | `ba032bb1326027d5ca0bc0c84c2248b511c8b15d` |
| Implementation branch | `feat/cqs-real-mvp-s05-board-outcome-public-authority` |
| Accepted implementation head | `fce42ee66ba9047c8ede1beb602cf2479cc677af` |
| Squash / main | `80b287664bccb16c2516802bc64080a82e08faeb` |
| PR | [#93](https://github.com/ricktron/classroom-quiz-show/pull/93) **MERGED** |
| Rejected exact head (F1–F5) | `b0b69f2169c05506cd6394a49a40b867c267a200` — **REPAIR REQUIRED** (F1–F5) |
| Rejected exact head (F6) | `99b001369a2786ee8afefa624d920b2dc69311e9` — **REPAIR REQUIRED — F6** |
| Rejected exact head (F7) | `72e53e3091300c9cd4de032373cceee0eadf1f0b` — **REPAIR REQUIRED** (F7 presentation) |
| Rejected exact head (F8) | `0b0accbf7329fb942edc2c9fb70d5e4fcc554d32` — **REPAIR REQUIRED — F8** (Nexus Ready beside Correct) |
| Rejected exact head (Sonar-only) | `c68bdccf074e0e6f0e4141e8136e34dafc404335` — **F8 SEMANTICALLY CLOSED — SONAR-ONLY REPAIR REQUIRED** |

Intervening `origin/main` delta after expected implementation squash at start
of this terminalization packet: **none** (canonical main remains
`80b2876…`).

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
| Ends response opportunity | Queue cleared to **empty**; phase disarmed; durable `outcome.kind === 'correct'` **structurally** owns the opportunity |
| Fail-closed while Correct owns phase | Planner + applicator reject `ARM_RESPONSE_PHASE`, `START_RESPONSE_TIMER`, `RECORD_TEAM_BUZZ`, `RESOLVE_ACTIVE_RESPONSE`, and timer mutation `PAUSE_RESPONSE_TIMER` / `RESUME_RESPONSE_TIMER` / `INTERRUPT_RESPONSE_TIMER` / `EXPIRE_RESPONSE_TIMER` (events `RESPONSE_TIMER_PAUSED` / `RESUMED` / `INTERRUPTED` / `EXPIRED` inert on application) until opportunity clear (`RESET` / tile / reveal / round) |
| Reopen path | `correct` → `RESET_RESPONSE_PHASE` → `ARM_RESPONSE_PHASE` accepted; direct `correct` → `ARM` rejected |
| Stale timer | Leftover interrupted/idle/running timer beside Correct cannot reopen intake and cannot keep accepting pause/resume/interrupt/expire |
| No promotion | Waiting teams are **not** promoted |
| No score | No `TEAM_SCORE_ADJUSTED` from `RESOLVE_ACTIVE_RESPONSE` `correct` |
| No answer reveal | No reveal / return-to-board side effects |
| Reversible | Ordinary undo / replay restores prior queue + armed/timer and clears outcome |

Disarm alone is **not** structural end. `correct` uses **empty queue + separate
outcome**, not buzz `exhausted` (exhausted would falsely project “No one left to
answer”). `correct` does **not** reset/expire/interrupt/delete the leftover
timer — leftover facts may remain static; only RESET / canonical opportunity
clearing mutates the phase after Correct owns it.

Host (`LocalInputHostPanel`) reads durable `phase.outcome` so post-correct empty
queue never shows “Nobody has buzzed yet”. Signal Rail suppresses
“Response ready” / “Waiting for a buzz” when `boardOutcome` is resolved correct;
incorrect+promote and pass+exhaust compositions are preserved.

**F7 public presentation (projection + Display + Host timer panel):** while
Correct owns the opportunity, the sanitizer projects a non-live public timer
(`{ status: 'idle' }` — existing DTO; **no** PublicState schema bump) even when
private leftover running remains for undo. Signal Rail suppresses the response
timer panel entirely beside Correct (no “Time remaining” / `role="timer"`).
`ResponseTimerHostPanel` derives `correctClosed`, disables Arm/Start/Pause/
Resume/Stop, keeps Reset enabled via `!isInitialResponsePhase` (covers idle-timer
correct), and does not present Running/Paused/Time up as actionable Host status.
Incorrect/pass timer projection and Host live controls remain unchanged.

**F8 Nexus companion (selector feed):** F7’s idle DTO remains on the public
response wire (schema 9). `selectPublicTimer` returns `null` when
`boardOutcome.status === 'resolved' && kind === 'correct'`, so AudienceDisplayShell
does not feed Nexus Core an idle→`"Ready"` companion beside durable Correct.
Ordinary idle Ready when `boardOutcome` is `none` is preserved. Incorrect / pass /
Final round timers are unchanged. Sanitizer / Host / reducer / schema untouched.

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

Durable `phase.outcome` drives Host truthfulness (F2 repair):

- Post-correct empty queue shows `Closed — {team} marked correct`, never
  “Nobody has buzzed yet”.
- `data-testid="lih-board-outcome"` presents the last durable adjudication
  (Correct / Incorrect / Passed + team) for the current opportunity.
- Keyboard-input `lih-outcome` remains separate (press explainers only).

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
| GAME-ENGINE-BOUNDARIES | Light update: historical Slice 11 PublicState schema **7** distinguished from current schema **9** (`boardOutcome`); sync envelope stays **2** |
| STATUS / CURRENT | Living routing reconciled to child **TERMINALLY COMPLETE**; parent OPEN |
| This doc | Implementation closeout + terminal identity; preserves rejected F1–F8 + Sonar-only heads; does **not** claim this docs-only terminalization PR is merged |

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
| Focused F1–F8 unit set (`buzzQueueReducer`, `timing`, `LocalInputHostPanel`, `SignalRail`, `boardOutcomeSanitize`, `ResponseTimerHostPanel`, `selectAudiencePresentation`, `AudienceDisplayShell`, `NexusCore`) | **226 passed** (includes F6–F7 matrices + F8 Nexus selector/shell suppress) |
| Lint / typecheck | clean (pre-existing ThemeProvider react-refresh warnings only) |
| `npm run verify` | local `usePublicState` BroadcastChannel MessageEvent failure reproduces on this VM (jsdom + Node BroadcastChannel); **not** introduced by Path A / this repair — re-observe on PR CI |
| E2E `s05-board-outcome-public-authority` at 720p/1080p | owned by PR CI (asserts no “Response ready” / waiting-for-buzz beside Correct) |
| PR CI matrix | Lint/typecheck/unit, Playwright, Desktop, macOS/Windows package, SonarCloud ≤3% — re-observe on [#93](https://github.com/ricktron/classroom-quiz-show/pull/93); do not claim unrun checks passed |

Physical qualification remains **S06** and is **not** claimed.

---

## R. Scope audit

**Allowed surfaces touched:** buzz resolution domain, response-phase outcome,
reducer resolve / arm / timer / buzz fail-closed gates, publicState v9 +
sanitizer (correct-closed non-live timer projection; no schema bump), Host Mark
correct + durable outcome presentation, Host ResponseTimer correct-closed
controls/status, minimal Display + SignalRail intake-ready suppression +
correct-closed response-timer panel suppression, `selectPublicTimer` Nexus feed
suppression beside Correct (F8), test-only leftover-running / prompt-board
fixture helpers (Sonar-only dedupe; no product mutation), visual-stress snapshot
dedupe, ADR-008/020 notes, GAME-ENGINE-BOUNDARIES schema 7-vs-9 note,
STATUS/CURRENT candidate routing, focused tests + e2e, this closeout.

**Confirmed absent / unauthorized:**

- no scoring semantics change; no score animation; ADR-006 presentation unchanged
- no Game schema / round registry / sync envelope change
- no Sony / controller mapping / Final choreography / winner celebration
- no board/round-transition choreography; no theatrical correct/incorrect
- no S04D; no S06; no release; no REAL MVP complete claim
- no S05 parent terminalization; theatrical board-outcome / score choreography
  remain unauthorized; no `outcomeKey`; ADR-006 closed / unchanged

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

## T. Post-merge identity

| Fact | Value |
| --- | --- |
| PR | [#93](https://github.com/ricktron/classroom-quiz-show/pull/93) **MERGED** |
| Rejected heads (F1–F8 + Sonar-only) | `b0b69f…` / `99b001…` / `72e53e3…` / `0b0accb…` / `c68bdcc…` — each **REPAIR REQUIRED** (or Sonar-only) as historically recorded |
| Accepted implementation head | `fce42ee66ba9047c8ede1beb602cf2479cc677af` → **ACCEPT CANDIDATE** |
| Squash / main | `80b287664bccb16c2516802bc64080a82e08faeb` |
| Sole parent | `ba032bb1326027d5ca0bc0c84c2248b511c8b15d` |
| Accepted / main tree | **EXACT MATCH** `051793253785f4e7dc9f7bd01966ced847462176` |
| Post-merge workflows | CI, Playwright, Desktop artifacts (unsigned macOS + Windows), Pages, SonarCloud — all **SUCCESS** |
| Tranche status | **TERMINALLY COMPLETE** |
| Parent status | **OPEN / NOT TERMINAL** |

Terminal post-merge reconciliation:
[`receipts/2026-09-22-cqs-real-mvp-s05-board-outcome-public-authority-terminal-post-merge-reconciliation.md`](receipts/2026-09-22-cqs-real-mvp-s05-board-outcome-public-authority-terminal-post-merge-reconciliation.md).

---

## U. Next owner decision

**Independent exact-head review of the docs-only S05 board-outcome public
authority terminalization candidate** that carries the terminal receipt and
current-routing reconciliation.

Does not authorize merge of that docs PR, additional S05 theatrical work,
S04D, S06, S05 parent terminalization, score choreography / ADR-006 reopen,
or REAL MVP complete.

```text
Stop for Rick.
TERMINALLY COMPLETE (Path A child) — S05 parent OPEN / NOT TERMINAL
accepted fce42ee… → squash 80b2876… tree EXACT MATCH 05179325…
rejected lineage preserved: b0b69f… / 99b001… / 72e53e3… / 0b0accb… / c68bdcc…
FUTURE OWNER DECISION STILL REQUIRED FOR S05 SCORE-CHANGE REQUIREMENT
no theatrical choreography / no outcomeKey / ADR-006 closed
```

---

## Appendix — Implementation merge pin

| Fact | Value |
| --- | --- |
| PR | https://github.com/ricktron/classroom-quiz-show/pull/93 |
| Accepted head | `fce42ee66ba9047c8ede1beb602cf2479cc677af` |
| Squash / main | `80b287664bccb16c2516802bc64080a82e08faeb` |
| Trees | **EXACT MATCH** `051793253785f4e7dc9f7bd01966ced847462176` |
| Rejected exact head (F1–F5) | `b0b69f2169c05506cd6394a49a40b867c267a200` — **REPAIR REQUIRED** (F1–F5) |
| Rejected exact head (F6) | `99b001369a2786ee8afefa624d920b2dc69311e9` — **REPAIR REQUIRED — F6** |
| Rejected exact head (F7) | `72e53e3091300c9cd4de032373cceee0eadf1f0b` — **REPAIR REQUIRED** (F7 presentation) |
| Rejected exact head (F8) | `0b0accbf7329fb942edc2c9fb70d5e4fcc554d32` — **REPAIR REQUIRED — F8** |
| Rejected exact head (Sonar-only) | `c68bdccf074e0e6f0e4141e8136e34dafc404335` — **F8 SEMANTICALLY CLOSED — SONAR-ONLY** |
| Implementation merge | **MERGED** (squash) |
| Docs terminalization PR | separate candidate; auto-merge **off**; do **not** merge without exact-head review |
