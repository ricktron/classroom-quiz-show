# Receipt - Q6-RP-1 landing, Q6-RP-2 live Undo (G3), Court A / Court B

- **Date:** 2026-10-04 (America/Chicago)
- **Authorization:** `AUTHORIZE-CQS-Q6-RP1-MERGE-AND-RP2-UNDO-REPAIR-1`
  (Court work under the existing Q6 authority)
- **Kind:** RP-1 landing record + bounded product repair candidate (G3) +
  Court A re-review + Court B. **RP-2 is not landed by this record.** This
  file does not predict its delivery PR's merge state or squash SHA.
- **RP-2 base (fresh main after RP-1):** `b1392391278f65ac516a1363c72fe1bfd9adf790`
- **RP-2 branch:** `claude/cqs-q6-court-review-9wdi7i` (restarted from fresh
  main after PR #135 landed)
- **RP-2 repair commit (code):** `ad115a2289b71324fb6e4c859a021569edf073a7`.
  Later commits on this branch change docs only.

---

## Phase A - Q6-RP-1 landing (PR #135)

| Condition | Observed |
| --- | --- |
| Head | `5764fa33fd4b80297815a730e8fdedb5d31d4d55`, unchanged |
| Mergeable | clean; no review threads |
| Exact-head CI | Lint/typecheck/unit/build **success**; Playwright e2e **success** (18:44:16Z); Desktop unit + Electron **success**; unsigned macOS / Windows packages **success** |
| Sonar Quality Gate | **PASS** (0 hotspots; 4 new issues) |
| Squash merge | `b1392391278f65ac516a1363c72fe1bfd9adf790`; tip tree = main tree **EXACT MATCH** `2f69879c9e1ac73f87570139d2176d585ffaa6b1` |

**Sonar - the 4 new issues on PR #135:**

- sonarcloud.io is unreachable from this environment (`EGRESS_BLOCKED` / 403),
  so the exact four were not read from Sonar.
- Independent classification used two sources:
  1. **Gate semantics.** "Sonar way" requires A reliability and A security
     ratings on new code, and Sonar reported 0 hotspots. A new bug or
     vulnerability would have dropped a rating below A, so all 4 are
     code smells (maintainability).
  2. **Local SonarJS reproduction.** `eslint-plugin-sonarjs` with every rule
     enabled was run over exactly the PR's changed `.ts` / `.tsx` files at
     head and at base `08f39e1…`, and the two runs were diffed. Issues new to
     the PR:
     - `RoundProgressHostPanel.tsx`: cognitive complexity **16** against a
       limit of 15 (product, maintainability);
     - six `no-duplicate-string` hits in **test** files.
  - The other flagged items (`FoundationControls`, `sanitize`,
    `selectAudiencePresentation` complexity; the H-REPAIR-1 identical
    function) are identical on base, so they are pre-existing.
- **Classification:** non-blocking maintainability / test-only residuals. None
  is a product functional, security, privacy, lifecycle, or evidence-integrity
  defect.
- No fix was made before merge, because changing the authorized head was not
  permitted.

**Exact-head semantic review (RP-1), findings:**

- **Ordinary paths:**
  - Round 1 entry: `RoundStartButton`.
  - Later rounds and Final entry: `rph-next`, with confirmation when clues
    remain unplayed.
  - Board-only End game: `rph-end`, always confirmed.
  - None of these touch Advanced diagnostics.
- **G2 status:** derived from `gameLifecycle` / `currentRoundIndex` only.
  - Diagnostics overrides keep their fixed copy.
  - At completion the header reads "Game complete"; the duplicate copy is
    suppressed.
  - No new public field, so Display privacy is unchanged.
- **Recovery:** the panel and status are pure functions of replayed state.
  Undoing the round advance restores the pre-round copy (unit-tested).
- **Multi-round:** clue progress is computed per round from that round's own
  tiles.
- **CS-13 trade-off:** recorded explicitly in the RP-1 receipt.
- **Scope:** no reducer, event, or schema changes (`src/` diff: 10 files, no
  `state/reducer.ts`, `events.ts`, or `publicState.ts`).
- **Docs:** G1/G2 closed on the candidate, G3 open, Court A GAPS REMAIN, Court
  B NOT RUN, eligibility not issued. Accurate.

**After merge:**

- G1/G2 are on main; this was verified by reading the files at `b139239`.
- Startup-canonical text still said "RP-1 candidate (not landed)". It is
  reconciled on this branch (STATUS / CURRENT / contract / matrix).
- G3 remained the only known Court A blocker.

---

## Phase B - Q6-RP-2: ordinary live Undo (G3 / HG-13)

### Repair

- **`src/host/liveUndo.ts`**: a pure *read* of the canonical undo system.
  - `liveUndoTarget(game, history)` calls `findUndoTarget(history)`, the same
    function the `UNDO` planner uses, and returns `null` once the game has
    ended (the planner rejects undo then).
  - `undoLabelFor(event, game)` names the target in teacher words. It is
    exhaustive over every event type, with a compile-time `never` check.
    Labels use Session team names (`publicTeamDisplayName`) and signed score
    deltas.
  - It keeps no history of its own and makes nothing newly reversible.
- **`src/host/LiveUndoControl.tsx`**: one secondary **"Undo <what>"** button
  (`host-undo`) on the focused-Host play-status line, in the same place in
  every live state (board, clue, buzz, Final).
  - It dispatches the existing canonical `UNDO`.
  - Absent before the first round (setup / names belong to Back to setup) and
    after completion.
  - Disabled when nothing is undoable or when the tab may not dispatch
    session commands.
  - Host-private; nothing is projected.
- The scoring panel's **Undo last score change** is unchanged.
- The diagnostics "Undo last reversible" remains as troubleshooting.
- **No** redo, history browser, second undo stack, raw event names, reducer,
  event, or schema change, or Host redesign. The CS-13 pre-round viewport is
  unchanged because the control is absent pre-round.

### Reversible-event family audit (existing semantics, not expanded)

| Family | Events | Reversible today | Teacher label |
| --- | --- | --- | --- |
| Adjudication | `ACTIVE_RESPONSE_RESOLVED` (correct / incorrect / passed) | yes | "Undo Correct / Incorrect / Pass (Team)" |
| Buzz / claim | `TEAM_BUZZED` (+ `RESPONSE_TIMER_INTERRUPTED` when a timer was running; two events from one command) | yes, one event per Undo | "Undo buzz-in (Team)", then "Undo timer stop" |
| Score | `TEAM_SCORE_ADJUSTED` | yes | "Undo score change (Team +100)" |
| Board stages | tile selected / prompt revealed / answer revealed / returned | yes | "Undo clue pick / show prompt / show answer / return to board" |
| Response window | armed, disarmed, timer start / pause / resume / stop / expire, reset | yes | "Undo arm clue / disarm clue / timer start / …" |
| Round progression | `ROUND_ADVANCED`, `CURRENT_ROUND_SELECTED` | yes | "Undo move to Round N / the Final" |
| Final | started, wager / response windows, wager recorded, locks, answer revealed, team revealed, team settled, sudden death | yes | "Undo Final start / saved wager (Team) / lock wagers / show Final answer / reveal (Team) / Final correct (Team) / sudden death …" |
| Session names | `SESSION_TEAM_NAME_SET` | yes | not offered live: the control is absent before the first round |
| Diagnostics-only | public status, sequence, waiting, host note | yes | "Undo troubleshooting change" |
| **Must not be undoable** | `SESSION_INITIALIZED`, `GAME_INITIALIZED`, `EVENT_UNDONE` (no redo), `GAME_SESSION_ENDED` (End game; accepted tie; Final complete) | **no** (irreversible by construction; planner rejects Undo after the game ends) | control absent after completion |
| Recovery | persisted log includes `EVENT_UNDONE` markers; replay derives state | n/a | the label after Resume reflects the persisted undone tail |

The audit was proven against the real store: the unit tests walk a live tail
(Incorrect → buzz-ins → arming → reveal → clue pick → round move) and check
that each label matches the state change the canonical `UNDO` actually makes.

### Evidence repair (HG-13)

`tests/e2e/menus-q4-gameplay-branch-failure-matrix.spec.ts` **Q4-A** now runs
entirely on the ordinary path (no `ensureHostMoreOpen`):

1. authentic started Session (Home import → Class Setup → Start →
   **Start Round 1**);
2. two buzzes, then **Incorrect** promotes Team 2 on Host and Display;
3. More closed and Advanced diagnostics hidden; `host-undo` visible and
   labelled **"Undo Incorrect (Team 1)"**;
4. Undo restores Team 1 active with Team 2 waiting on the Host, and the
   Display reconverges ("1 team waiting");
5. the label moves to "Undo buzz-in (Team 2)", proving the Incorrect is gone;
6. Display privacy holds;
7. `waitForSessionSaved`, reload, explicit **Resume**: the undone state and
   the next undo label persist; the Display reconverges;
8. continued adjudication (Pass → Correct) publishes live;
9. scoring, then **Go to the Final**, then classic Final to **completion**;
   the winner is on the Display and the summary on the Host;
10. after completion `host-undo` is absent; More was never opened.

Q4-B and Q4-C are unchanged and still pass.

### Unit / component evidence

`src/host/LiveUndoControl.test.tsx` (7 tests):

- the real-tail label walk;
- score-change label against the actual undo effect;
- board-stage and round-move labels;
- `null` after End game;
- the control dispatches `UNDO` and relabels to the next target;
- absent pre-round and after completion;
- disabled for a non-dispatching tab.

---

## Court A re-review (on the RP-2 candidate)

| Row | Prior | Re-review | Evidence |
| --- | --- | --- | --- |
| HG-13 | FUNCTIONAL GAP (G3) | **CLOSED BY Q6-RP-2 (candidate)** | Q4-A ordinary path (above); units |
| HG-06 (adjudication / score) | CLOSED BY Q1-Q5 | unchanged (RETAIN) | Score-only undo untouched; adjudication undo now ordinary |
| HG-01 / CS-13 | CLOSED BY Q6-RP-1 (landed) | unchanged | Live Undo absent pre-round, so the H-REPAIR-1 viewport proofs pass unchanged |
| HG-12 / Finding C | CLOSED (RP-1 landed) | unchanged | RP-2 does not touch golden-path claims; Q3 golden pack passes |
| DP-02 privacy | CLOSED | unchanged | Undo labels are Host-only; no PublicState change |

**Evidence transfer:**

- Q4-A's earlier undo evidence (via More) is **superseded**, not transferred.
- Every other Q1-Q5 / RP-1 claim was re-executed green on this branch (full
  suite, §Verification).

**Whole-matrix sweep (59 rows):**

- The only functional gaps ever recorded under Q6 were G1, G2 (landed) and
  G3 (repaired on this candidate).
- No other row carries a FUNCTIONAL GAP disposition. The remaining items are
  PHYSICAL-ONLY, OWNER-ONLY, or NON-FUNCTIONAL RESIDUAL (first Q6 receipt §9
  and the residual list below).

**Court A outcome (RP-2 candidate):** COURT_A_PLACEHOLDER

---

## Court B

COURT_B_PLACEHOLDER

---

## Verification

VERIFICATION_PLACEHOLDER

---

## Residuals (non-blocking, classified)

| Residual | Class |
| --- | --- |
| Physical Sony / projector / audio / Windows runtime | PHYSICAL-ONLY (NOT RUN on current identities) |
| Signing / notarization | owner gate; outside the eligibility condition |
| H4 collapsed-detail LOW; `CQS-Q23-LOW-02`; `CQS-Q23-CLASS-B-01` (cdn.sheetjs.com 403 reconfirmed) | NON-FUNCTIONAL RESIDUAL |
| HL-10 restore evidence class (unit + component only); HL-06 Rename / Delete Home-UI e2e thin; CS-12 "Sound tested" set on click | NON-FUNCTIONAL / proof-strengthening |
| Q5 test-helper `execFileSync('git')`; RP-1 Sonar maintainability smells (complexity 16/15; test duplicate strings) | NON-FUNCTIONAL (maintainability / test-only) |
| `gamepad-input.spec.ts:318` fails locally in this container on base and head; passes in CI | ENVIRONMENTAL (not product) |
| Host equal-weight panel stacking; Controllers machinery after Start; "Receiver needs attention" when buzzers skipped | Visual POLISH / non-blocking usability (first Q6 receipt §6) |
| S05 parent OPEN; S04D / S06 NOT AUTHORIZED | out of current scope |

## Historian readiness

- **Not created.**
- A new pre-owner historian milestone should be captured only from the landed
  RP-2 squash SHA, through the already-authorized historian refresh lane (PR
  #134 guards). It should use a new archive directory and the real ordinary
  workflow: `rph-*` progression, live Undo, truthful Display status.
- The old S05 / MENUS archives remain immutable.

## Non-claims

This record does not claim:

- `OWNER-PLAYTHROUGH-ELIGIBLE`, PRE-Q7, Q7, or owner playthrough;
- the RP-2 PR merged;
- a historian milestone;
- S05 terminalization, S04D, or S06;
- physical, Windows, or signed-release evidence;
- REAL MVP completion.
