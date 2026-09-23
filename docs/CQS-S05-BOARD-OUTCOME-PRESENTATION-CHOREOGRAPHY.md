# CQS REAL MVP S05 — board-outcome presentation choreography

Local and repository delivery evidence for the bounded S05 child that adds
classroom-distance acknowledgement choreography around Path A minimal
`BoardOutcomeDisplay` (Correct / Incorrect / Passed) — lifecycle presentation
only; never gameplay authority; never delayed authoritative text.

- **Authorization:**
  `AUTHORIZE-CQS-REAL-MVP-S05-BOARD-OUTCOME-PRESENTATION-CHOREOGRAPHY-1`
- **Repair auth:**
  `AUTHORIZE-CQS-REAL-MVP-S05-PR96-PRESENTATION-F-HANDOFF-EVIDENCE-DOCS-REPAIR-1`
- **Terminalization authorization (this packet):**
  `AUTHORIZE-CQS-REAL-MVP-S05-BOARD-OUTCOME-PRESENTATION-CHOREOGRAPHY-TERMINALIZATION-CANDIDATE-1`
- **Tranche:**
  `CQS-REAL-MVP-S05-BOARD-OUTCOME-PRESENTATION-CHOREOGRAPHY`
- **Parent:** `CQS-REAL-MVP-S05-FLAGSHIP-VISUAL-FIDELITY-AND-GAME-SHOW-CHOREOGRAPHY`
  (parent remains **OPEN / NOT TERMINAL**)
- **Tranche status:** **TERMINALLY COMPLETE**
- **Date (UTC):** 2026-09-23

```text
durable snapshot ≠ just-happened event
semantic identity local only (teamKey + kind)
composition: active Incorrect/Passed → buzz owns motion
ownership handoff: exhausted→late active clears outcome ack
Path S-C: score refresh must not restart outcome ack
Correct audio-silent; no new sounds; Host unchanged
PublicState 9 / sync 2 / persistence 1 unchanged
no outcomeKey / no ADR-006 reopen
child terminal ≠ parent terminal
Stop for Rick
```

### Review / repair / merge chain (observed)

| Head | Verdict |
| --- | --- |
| `ff424e0ac044f03c1af64694f196b1969dbd7a4a` | **REPAIR REQUIRED** — independent exact-head review: F-HANDOFF, F-RAPID-STALE, F-PASSED-ACTIVE, F-REDUCED-MOTION-PROOF, F-CLOSEOUT-HEAD-TRUTH |
| `24a52dc0148fcf8457cda1607c72a185acc1a0e6` | intermediate repair (F-HANDOFF + evidence + docs) — not independently accepted alone |
| `e9744bf168d40f9b5d8fe916139e4a21903bc61c` | **ACCEPT CANDIDATE** (Sonar dedupe `it.each` + shared e2e helper on repaired tip) |
| squash / main `36efee350961ac58f4670cb3cb495997b3487311` | **MERGED** (PR #96; sole parent `ff335f2…`; trees **EXACT MATCH** `56941fb4…`) |

Repair alone did **not** mark this tranche independently accepted. Do not
flatten the rejected-tip → ACCEPT lineage to first-pass success. Do not
reopen closed F-HANDOFF / F-RAPID-STALE / F-PASSED-ACTIVE /
F-REDUCED-MOTION-PROOF / F-CLOSEOUT-HEAD-TRUTH as still-broken.

---

## A. Identity

| Fact | Value |
| --- | --- |
| Canonical implementation base | `ff335f2cf005a7fb1b06a9588b67894d523ccb6f` |
| Implementation branch | `feat/cqs-real-mvp-s05-board-outcome-presentation-choreography` |
| Accepted implementation head | `e9744bf168d40f9b5d8fe916139e4a21903bc61c` |
| Squash / main | `36efee350961ac58f4670cb3cb495997b3487311` |
| PR | [#96](https://github.com/ricktron/classroom-quiz-show/pull/96) **MERGED** |
| Rejected tip (exact-head review) | `ff424e0ac044f03c1af64694f196b1969dbd7a4a` — **REPAIR REQUIRED** |
| Product verification tip (historical) | `385fc6d54cab639db9a7e6cc9b36969d79ff88d0` (CI-green product tip before docs-only / repair commits; not the accepted Exact head) |

Intervening `origin/main` delta after expected implementation squash at start
of this terminalization packet: **none** (canonical main remains
`36efee3…`).

---

## B. Product objective

Enhance Path A minimal Correct / Incorrect / Passed projector text for
classroom-distance legibility with lifecycle acknowledgement. Motion
enhances already-visible truth. Remount into a resolved snapshot shows
durable truth with **no** transient acknowledgement.

---

## C. Public-state non-change

Confirmed **unchanged**:

| Contract | Result |
| --- | --- |
| `PUBLIC_STATE_SCHEMA_VERSION` | **9** (no bump) |
| Sync envelope (`SYNC_SCHEMA_VERSION`) | **2** |
| `PERSISTENCE_WIRE_VERSION` | **1** |
| Sanitizer / reducer / command-event / replay | **unchanged** |
| `boardOutcome` shape | Path A only — **no** `outcomeKey`, timestamps, or animation ids |
| Scoreboard / ADR-006 | **unchanged** (Path S-C remains registered) |

Local composition prop `activeClaimPresent` on `BoardOutcomeDisplay` is
**not** PublicState. Semantic identity `teamKey + kind` is local only —
not published and not persisted.

---

## D. Semantic identity and remount

Acknowledgement ownership follows the buzz pattern:

1. Track local semantic id `${teamKey}:${kind}` (or `null` when `none`).
2. First observation **seeds** prior id (catch-up / remount → no fabricated ack).
3. Identity unchanged + still owns motion → keep in-flight ack (including Path S-C score-only refreshes).
4. Identity unchanged + ownership yields (`ownsAck` false) → **clear** outcome ack immediately (late-buzz handoff).
5. Ownership reclaim on the same id must **not** late-ack.
6. Observed identity transition may acknowledge when this surface owns motion.
7. Authoritative kind + team text renders **immediately** — never after an entrance delay.
8. Hold marker ~420ms (outlasts `--dur-emphasized` 320ms); numeric constant.
9. Visible ack = lifecycle ack **and** current `ownsAck` (gates one-paint race).

DOM carriers: `data-seeded="true"`, `data-outcome-changed`, `data-motion-owner`,
`data-composition`.

---

## E. Composition matrix

| Composition | Motion owner | Outcome presentation |
| --- | --- | --- |
| Correct (buzz `none`; no active claim) | **BoardOutcomeDisplay** | Primary; may acknowledge on observed transition |
| Incorrect / Passed + promoted **active** claim | **BuzzQueueDisplay** | Immediate **static secondary** (`.bod--secondary`); no outcome ack |
| Incorrect / Passed + **exhausted** (no active claim) | **BoardOutcomeDisplay** may own | Primary; may acknowledge on observed transition |
| Incorrect / Passed **exhausted → late active** (same semantic id) | **BuzzQueueDisplay** | Outcome ack clears immediately; secondary; no competing pulse; no late re-ack on ownership reclaim |
| Remount into any resolved snapshot | none (seed) | Truthful text; `data-outcome-changed=false` |

Signal Rail passes `activeClaimPresent={response.buzz.status === 'active'}`.
BuzzQueueDisplay production CSS/TSX was **not** changed.

---

## F. Path S-C score independence

Scoreboard remains untouched. Public team score integer refreshes with the
same `boardOutcome` identity **must not** restart outcome acknowledgement.
Proved in unit + e2e (score-only `teams` DTO refresh while hold marker active).

---

## G. Presentation design

- Tokens: `--state-success` / `--state-danger` (+ washes), `--dur-emphasized`
  (320ms), `--ease-emphasized`, inset ring (buzz-style; no outward outline/scale).
- Correct: success wash ack. Incorrect: danger wash ack. Passed: muted/strong border wash.
- Reduced-motion: static inset ring + underline; meaning preserved without animation.
- High-contrast / grayscale: text carriers remain primary.
- No Host redesign. No new audio. Board Correct remains **audio-silent** (ADR-020).

---

## H. Audio relationship

ADR-020 unchanged. Visual choreography does not gate on audio, does not add
sound categories, and remains valid when muted.

---

## I. Surfaces changed

**Production**

- `src/display/BoardOutcomeDisplay.tsx`
- `src/display/BoardOutcomeDisplay.css`
- `src/display/audience/SignalRail.tsx` (`activeClaimPresent` prop wire-up)

**Tests**

- `src/display/BoardOutcomeDisplay.test.tsx`
- `src/display/audience/SignalRail.test.tsx`
- `tests/e2e/s05-board-outcome-presentation-choreography.spec.ts`

**Docs / routing**

- This closeout
- `docs/STATUS.md`, `docs/handoff/CURRENT.md`, `docs/plans/CQS-REAL-MVP-ARC.md`
- `docs/design/CQS-UX-SURFACE-INVENTORY.md` (surface 17)

BuzzQueueDisplay production untouched. No reducer / sanitizer / Host / scoreboard changes.

---

## J. Automated evidence

- Unit: remount seed; none→Correct ack; Incorrect+active static secondary;
  Passed+exhausted may own; Path S-C score refresh; hold clear;
  **F-HANDOFF** Incorrect/Passed exhausted→late active; **F-PASSED-ACTIVE**;
  **F-RAPID-STALE** A→B; clear/reset re-ack; Signal Rail composition;
  BuzzQueueDisplay + AudienceDisplayShell regressions
- E2E: remount / observed Correct / Incorrect+active / Passed / Path S-C /
  **F-HANDOFF** late buzz / **F-PASSED-ACTIVE** / reduced-motion **computed**
  `animationName === 'none'` (+ no-preference non-none) / high-contrast;
  720p + 1080p
- Re-run Path A authority + buzz choreography + F1 stress as regression
- `git diff --check`; CI unit / Playwright / Desktop / Sonar on accepted tip
  and post-merge main (report exact; local BroadcastChannel baseline may fail)

---

## K. Physical-evidence boundary

Keyboard Host→Display path covered by injection e2e. Physical Sony / projector
/ Windows qualification remains **S06** and is **not** claimed.

---

## L. Verification (historical tip evidence preserved)

Historical product-verification tip `385fc6d…` and rejected tip `ff424e0…`
retained as qualified history. Accepted implementation tip
`e9744bf168d40f9b5d8fe916139e4a21903bc61c` and squash/main
`36efee350961ac58f4670cb3cb495997b3487311` are the terminal identity pins
(§T).

Post-merge workflows on exact main `36efee3…`: CI, Playwright, Desktop
artifacts (unsigned macOS + Windows), Pages, and SonarCloud check-run —
all **SUCCESS**. PR-head Sonar inventory (**11** `typescript:S1607`;
~**1.3%** dup) remains separate tip evidence; do not transplant unrelated
branch Sonar dashboard metrics onto main.

Physical qualification remains **S06** and is **not** claimed.

---

## M. Scope audit (hard stops honored)

| Stop | Honored |
| --- | --- |
| PublicState / schema / version bumps / `outcomeKey` / event identity / timestamps / animation ids | **Yes** |
| Scoring / score animation / ADR-006 / OPP activation / new audio / Host redesign | **Yes** |
| Reducer / command-event / sanitizer / persistence / sync / Final / board-flow / winner | **Yes** |
| S05 parent terminalization / S04D / S06 / release | **Yes** |

---

## N. Remaining S05 (later; not authorized here)

- Board / round-flow choreography
- Bounded Final / winner presentation
- Host polish / shared motion extraction beyond this child
- Any S04D / S06 / signed release

Path S-C remains **CANONICALLY REGISTERED**. S05 parent remains **OPEN /
NOT TERMINAL**.

---

## O. COURT-style notes (delivery)

| Sev | Note |
| --- | --- |
| HIGH (mitigated) | Remount fabricate — acceptance tests assert seed |
| HIGH (repaired) | Ownership handoff exhausted→late active — outcome ack clears; buzz sole motion owner |
| MEDIUM (mitigated) | Dual motion Incorrect+active — composition yields to buzz |
| MEDIUM (repaired) | Rapid A→B / stale timer + Passed+active + reduced-motion computed proof |
| LOW | Shared seed helper not extracted (prefer leave Buzz production alone) |

---

## P. ADR / documentation

| Doc | Action |
| --- | --- |
| ADR-006 | **Unchanged** — Path S-C preserved |
| ADR-020 | **Unchanged** — board Correct silent |
| STATUS / CURRENT / ARC | Living routing reconciled to child **TERMINALLY COMPLETE**; parent OPEN; Path S-C registered; remaining = board/round-flow · Final · winner |
| UX inventory §17 | Presentation choreography registered as **TERMINALLY COMPLETE** |
| This doc | Implementation closeout + terminal identity; preserves rejected/repair chain; does **not** claim this docs-only terminalization PR is merged |

---

## Q. Composition proof summary

| Proof | Evidence |
| --- | --- |
| Remount Correct → no ack | unit + e2e `data-outcome-changed=false` |
| Observed Correct → ack, text immediate | unit + e2e |
| Incorrect+active → buzz owns; outcome static secondary | unit + SignalRail + e2e |
| Passed+active → buzz owns; Passed secondary (not danger) | unit + e2e |
| Passed+exhausted → outcome may own | unit + e2e |
| Exhausted→late active handoff → outcome ack cleared | unit + e2e |
| Rapid A→B / stale A timer cannot clear B | unit (fake timers) |
| Clear/reset → same id may re-ack | unit |
| Score refresh → ack continues (Path S-C) | unit + e2e |
| Reduced-motion computed `animationName === 'none'` | e2e 720p |
| High-contrast text carriers | e2e 720p |

---

## R. Implementation PR state (historical)

| Fact | Value |
| --- | --- |
| Title | `feat(s05): add board-outcome presentation choreography` |
| PR | [#96](https://github.com/ricktron/classroom-quiz-show/pull/96) **MERGED** |
| Accepted head | `e9744bf168d40f9b5d8fe916139e4a21903bc61c` |
| Squash / main | `36efee350961ac58f4670cb3cb495997b3487311` |
| Rejected tip | `ff424e0ac044f03c1af64694f196b1969dbd7a4a` |

---

## S. Explicit non-claims

- Not S05 parent terminal
- Not PublicState / schema / score animation / audio / Host change
- Not board/round-flow / Final / winner authorization
- Not S04D / S06 / release / physical projector qualification
- Not `outcomeKey`
- Not a claim that this docs-only terminalization PR is merged
- Does **not** predict this terminalization PR’s eventual squash SHA

---

## T. Post-merge identity

| Fact | Value |
| --- | --- |
| PR | [#96](https://github.com/ricktron/classroom-quiz-show/pull/96) **MERGED** |
| Rejected tip | `ff424e0ac044f03c1af64694f196b1969dbd7a4a` — **REPAIR REQUIRED** |
| Accepted implementation head | `e9744bf168d40f9b5d8fe916139e4a21903bc61c` → **ACCEPT CANDIDATE** |
| Squash / main | `36efee350961ac58f4670cb3cb495997b3487311` |
| Sole parent | `ff335f2cf005a7fb1b06a9588b67894d523ccb6f` |
| Accepted / main tree | **EXACT MATCH** `56941fb4f404c5adcbbfbe9de976c29a8f2c9f05` |
| Post-merge workflows | CI, Playwright, Desktop artifacts (unsigned macOS + Windows), Pages, SonarCloud check-run — all **SUCCESS** |
| Tranche status | **TERMINALLY COMPLETE** |
| Parent status | **OPEN / NOT TERMINAL** |

Terminal post-merge reconciliation:
[`receipts/2026-09-23-cqs-real-mvp-s05-board-outcome-presentation-choreography-terminal-post-merge-reconciliation.md`](receipts/2026-09-23-cqs-real-mvp-s05-board-outcome-presentation-choreography-terminal-post-merge-reconciliation.md).

---

## U. Next owner decision

**Independent exact-head review of the docs-only S05 board-outcome
presentation choreography terminalization candidate** that carries the
terminal receipt and current-routing reconciliation.

Does not authorize merge of that docs PR, board/round-flow / Final / winner,
S04D, S06, S05 parent terminalization, score animation / ADR-006 reopen, or
REAL MVP complete.

```text
Stop for Rick.
TERMINALLY COMPLETE (presentation child) — S05 parent OPEN / NOT TERMINAL
accepted e9744bf… → squash 36efee3… tree EXACT MATCH 56941fb4…
rejected lineage preserved: ff424e0… REPAIR REQUIRED
Path S-C registered; score animation banked; no outcomeKey; ADR-006 closed
remaining S05: board/round-flow · Final · winner
```

---

## Appendix — Implementation merge pin

| Fact | Value |
| --- | --- |
| PR | https://github.com/ricktron/classroom-quiz-show/pull/96 |
| Accepted head | `e9744bf168d40f9b5d8fe916139e4a21903bc61c` |
| Squash / main | `36efee350961ac58f4670cb3cb495997b3487311` |
| Trees | **EXACT MATCH** `56941fb4f404c5adcbbfbe9de976c29a8f2c9f05` |
| Rejected exact head | `ff424e0ac044f03c1af64694f196b1969dbd7a4a` — **REPAIR REQUIRED** |
| Implementation merge | **MERGED** (squash) |
| Docs terminalization PR | separate candidate; auto-merge **off**; do **not** merge without exact-head review |
