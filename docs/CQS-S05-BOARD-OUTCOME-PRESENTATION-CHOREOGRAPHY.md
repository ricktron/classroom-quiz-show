# CQS REAL MVP S05 — board-outcome presentation choreography

Local and repository delivery evidence for the bounded S05 child that adds
classroom-distance acknowledgement choreography around Path A minimal
`BoardOutcomeDisplay` (Correct / Incorrect / Passed) — lifecycle presentation
only; never gameplay authority; never delayed authoritative text.

- **Authorization:**
  `AUTHORIZE-CQS-REAL-MVP-S05-BOARD-OUTCOME-PRESENTATION-CHOREOGRAPHY-1`
- **Tranche:**
  `CQS-REAL-MVP-S05-BOARD-OUTCOME-PRESENTATION-CHOREOGRAPHY`
- **Parent:** `CQS-REAL-MVP-S05-FLAGSHIP-VISUAL-FIDELITY-AND-GAME-SHOW-CHOREOGRAPHY`
  (parent remains **OPEN / NOT TERMINAL**)
- **Tranche status:** **AUTHORIZED DELIVERY CANDIDATE** (NOT ACCEPTED / NOT TERMINAL)
- **Date (UTC):** 2026-09-23

```text
durable snapshot ≠ just-happened event
semantic identity local only (teamKey + kind)
composition: active Incorrect/Passed → buzz owns motion
Path S-C: score refresh must not restart outcome ack
Correct audio-silent; no new sounds; Host unchanged
PublicState 9 / sync 2 / persistence 1 unchanged
no outcomeKey / no ADR-006 reopen
child delivery ≠ parent terminal
Stop for Rick
```

---

## A. Identity

| Fact | Value |
| --- | --- |
| Canonical base | `ff335f2cf005a7fb1b06a9588b67894d523ccb6f` |
| Branch | `feat/cqs-real-mvp-s05-board-outcome-presentation-choreography` |
| Exact head | `385fc6d54cab639db9a7e6cc9b36969d79ff88d0` |
| PR | [#96](https://github.com/ricktron/classroom-quiz-show/pull/96) (non-draft; auto-merge off) |
| Intervening main after expected base | **none** at branch creation (`origin/main` === base) |

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
3. Identity unchanged → keep in-flight ack (including Path S-C score-only refreshes).
4. Observed identity transition may acknowledge when this surface owns motion.
5. Authoritative kind + team text renders **immediately** — never after an entrance delay.
6. Hold marker ~420ms (outlasts `--dur-emphasized` 320ms); numeric constant.

DOM carriers: `data-seeded="true"`, `data-outcome-changed`, `data-motion-owner`,
`data-composition`.

---

## E. Composition matrix

| Composition | Motion owner | Outcome presentation |
| --- | --- | --- |
| Correct (buzz `none`; no active claim) | **BoardOutcomeDisplay** | Primary; may acknowledge on observed transition |
| Incorrect / Passed + promoted **active** claim | **BuzzQueueDisplay** | Immediate **static secondary** (`.bod--secondary`); no outcome ack |
| Incorrect / Passed + **exhausted** (no active claim) | **BoardOutcomeDisplay** may own | Primary; may acknowledge on observed transition |
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
  Passed+exhausted may own; Path S-C score refresh; hold clear; Signal Rail
  composition; BuzzQueueDisplay + AudienceDisplayShell regressions
- E2E: remount / observed Correct / Incorrect+active composition / Passed /
  Path S-C / reduced-motion / high-contrast; 720p + 1080p
- Re-run Path A authority + buzz choreography + F1 stress as regression
- `git diff --check`; `npm run verify`; `npm run verify:all` (report exact)
- Sonar QG — no threshold weaken / no NOSONAR

---

## K. Physical-evidence boundary

Keyboard Host→Display path covered by injection e2e. Physical Sony / projector
/ Windows qualification remains **S06** and is **not** claimed.

---

## L. Verification (local — re-observe on PR tip)

Observed on tip `385fc6d54cab639db9a7e6cc9b36969d79ff88d0` / PR [#96](https://github.com/ricktron/classroom-quiz-show/pull/96):

| Check | Result |
| --- | --- |
| `git diff --check` | **clean** (exit 0) |
| Focused unit (BoardOutcomeDisplay, SignalRail, BuzzQueueDisplay, AudienceDisplayShell) | **56 passed** |
| Lint / typecheck | **clean** (3 pre-existing ThemeProvider react-refresh warnings only; 0 errors) |
| `npm run verify` | local `usePublicState` BroadcastChannel `MessageEvent` / `ERR_INVALID_ARG_TYPE` failure reproduces on this VM (jsdom + Node BroadcastChannel) — **baseline**, not introduced by this child (same class as Path A closeout). **PR CI Lint/typecheck/unit/build: SUCCESS** |
| E2E presentation + authority + buzz @ 720p/1080p | **38 passed**, 4 skipped (720p-only cases on 1080p) |
| E2E F1 stress (local) | one `desktop-1080p` prompt scrollHeight **1px** over tolerance (355 vs ≤354) — environment font metric; **PR CI Playwright e2e: SUCCESS** (authoritative) |
| `npm run verify:all` | not claimed as local green (blocked by BroadcastChannel baseline); **CI matrix SUCCESS** for lint/unit/build + Playwright |
| BroadcastChannel baseline | **Honest:** local VM fail; CI unit job green — classify as known jsdom/Node BC issue, not product regression |
| SonarCloud Code Analysis | **SUCCESS** on PR #96 — no threshold weaken / no NOSONAR |
| Desktop artifacts (unsigned macOS + Windows) | **SUCCESS** |
| Desktop unit + Electron shell | **SUCCESS** |

Physical qualification remains **S06** and is **not** claimed.

---

## M. Scope audit (hard stops honored)

| Stop | Honored |
| --- | --- |
| PublicState / schema / version bumps / `outcomeKey` / event identity / timestamps / animation ids | **Yes** |
| Scoring / score animation / ADR-006 / OPP activation / new audio / Host redesign | **Yes** |
| Reducer / command-event / sanitizer / persistence / sync / Final / board-flow / winner | **Yes** |
| Merge / auto-merge / S05 parent terminalization / S04D / S06 / release | **Yes** |
| Transplant if `origin/main` ≠ base | **N/A** — exact match at start |

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
| MEDIUM (mitigated) | Dual motion Incorrect+active — composition yields to buzz |
| LOW | Shared seed helper not extracted (prefer leave Buzz production alone) |

---

## P. ADR / documentation

| Doc | Action |
| --- | --- |
| ADR-006 | **Unchanged** — Path S-C preserved |
| ADR-020 | **Unchanged** — board Correct silent |
| STATUS / CURRENT / ARC | Living routing: this child **AUTHORIZED DELIVERY CANDIDATE**; parent OPEN; Path S-C registered |
| UX inventory §17 | Theatrical presentation registered as delivery candidate (not terminal) |
| This doc | Delivery closeout — **NOT ACCEPTED / NOT TERMINAL** |

No terminal receipt. No historical rewrite.

---

## Q. Composition proof summary

| Proof | Evidence |
| --- | --- |
| Remount Correct → no ack | unit + e2e `data-outcome-changed=false` |
| Observed Correct → ack, text immediate | unit + e2e |
| Incorrect+active → buzz owns; outcome static secondary | unit + SignalRail + e2e |
| Passed+exhausted → outcome may own | unit + e2e |
| Score refresh → ack continues (Path S-C) | unit + e2e |
| Reduced-motion / high-contrast text carriers | e2e 720p |

---

## R. PR state

| Fact | Value |
| --- | --- |
| Title | `feat(s05): add board-outcome presentation choreography` |
| PR | [#96](https://github.com/ricktron/classroom-quiz-show/pull/96) |
| Head | `385fc6d54cab639db9a7e6cc9b36969d79ff88d0` |
| Draft | **false** (non-draft) |
| Auto-merge | **OFF** (`autoMergeRequest` null) |
| Merge | **Do not merge** (Stop for Rick) |

---

## S. Explicit non-claims

- Not independently accepted / not terminally complete
- Not S05 parent terminal
- Not PublicState / schema / score / audio / Host change
- Not S04D / S06 / release / physical projector qualification
- Not `outcomeKey`

---

## T. Status label

```text
AUTHORIZED DELIVERY CANDIDATE — NOT ACCEPTED / NOT TERMINAL
```

---

## U. Next owner decision

Rick: exact-head review → accept / repair / reject. Do **not** merge from this
packet. Do **not** terminalize S05 parent. Do **not** start board/round-flow,
Final, S04D, or S06 from this closeout.

```text
Stop for Rick.
```
