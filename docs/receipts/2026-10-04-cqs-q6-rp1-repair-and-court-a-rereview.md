# Receipt - Q6-RP-1 repair (G1/G2) and Court A re-review

- **Date:** 2026-10-04 (America/Chicago)
- **Authorization:** `AUTHORIZE-CQS-Q6-COURT-LANDING-AND-RP1-REPAIR-1`
  (repair and re-review under the existing Q6 Court authority
  `AUTHORIZE-CQS-Q6-INDEPENDENT-COURT-REVIEW-1`)
- **Kind:** bounded product repair candidate (G1, G2) + Court A re-review.
  **Not landed by this record.** This file does not predict its delivery PR's
  merge state or squash SHA; the exact candidate head is recorded in the PR.
- **Base (fresh main):** `08f39e17f9e0a72f2b9cb1aebb1ee2753f1f15c0`
- **Branch:** `claude/cqs-q6-court-review-9wdi7i` (restarted from fresh main
  after PR #133 landed; single bounded Q6-RP-1 branch)
- **Court A re-review outcome:** **COURT-A: GAPS REMAIN** (new **G3**)
- **Court B:** **NOT RUN**
- **Eligibility:** `OWNER-PLAYTHROUGH-ELIGIBLE` **NOT ISSUED**; PRE-Q7 / Q7
  **NOT STARTED**; no new historian milestone created.

```text
G1 repaired on candidate. G2 repaired on candidate.
G3 found by the semantic-sibling audit (general Undo only in Advanced diagnostics).
Court A re-review: GAPS REMAIN (G3 / HG-13). Court B NOT RUN.
```

---

## 1. Landing steps observed before repair

| Step | Observed |
| --- | --- |
| PR #133 (Q6 Court record) | Head `759c780b6cc25c18e1b76f3ae694941c80d070c8` unchanged; mergeable clean; CI, Playwright, Desktop unit + Electron, macOS/Windows packages, SonarCloud all **success**. Exact-head squash merged as `448ae147c04059a533c48cc1f98d00ea30042a3f`. |
| PR #134 (historian fail-closed guards) | Head `2f04ee5ad0b89d018e27e94004b0edd8b8673ade` unchanged; Playwright completed **success** (17:14:57Z); all six checks success; Sonar Quality Gate passed (2 new non-gating issues); mergeable clean. Diff (8 files: historian docs, guard script, package.json capture scripts, two disabled legacy capture specs) does not overlap PR #133. Exact-head squash merged as `08f39e17f9e0a72f2b9cb1aebb1ee2753f1f15c0`. |
| Fresh main | `08f39e17f9e0a72f2b9cb1aebb1ee2753f1f15c0` |

---

## 2. Repair (product)

### G1 - ordinary Host round progression

- New `src/host/RoundProgressHostPanel.tsx` (+ `.css`):
  - **`RoundStartButton`**: after Start Game, before any round is current, a
    primary **Start Round 1** (or **Start the Final** when the first round is a
    Final). It is rendered on the focused-Host play-status line, inside the
    first viewport, and is disabled when this tab may not dispatch session
    commands.
  - **`RoundProgressHostPanel`**: during a board round it shows
    "Round N of M · X of Y clues played" and one action:
    - **Start Round N+1** / **Go to the Final**, or **End the game** when no
      later round exists;
    - disabled while a clue is open;
    - confirmation when clues remain unplayed;
    - **End the game** is always confirmed (irreversible);
    - steps aside during the Final (the Final panel owns completion) and after
      the game ends.
- Dispatches only the existing `ADVANCE_TO_NEXT_ROUND` and `END_GAME_SESSION`
  commands. No new event types, no schema change, no reducer change.
- The Advanced diagnostics copies remain (troubleshooting), but ordinary play
  no longer needs them.

### G2 - truthful public status detail

- `src/state/status.ts`: `resolvePublicStatusCopy(code, lifecycle)` and a fixed
  `SESSION_READY_LIFECYCLE_DETAIL` table:
  - before the first round: "Waiting for the first round.";
  - in a round: "Playing";
  - ended: "Game complete".
- `src/state/sanitize.ts`: derives the lifecycle from authoritative private game
  state (`gameLifecycle`, `currentRoundIndex`) and resolves the detail. Only the
  ordinary `session-ready` code is lifecycle-derived; explicit diagnostics
  overrides keep their fixed copy. PublicState schema **9**, sync **2**, and the
  `phase` vocabulary are unchanged (`detail` was already a free string).
- `src/display/audience/selectAudiencePresentation.ts`: the Nexus Core drops a
  detail that repeats the stage label, so "Game complete" is not printed twice.
  The existing "Playing"-at-completion cleanup is preserved.
- The real-flow detail now matches what the S05-accepted Display fixtures
  assumed ("Session ready - Playing").

---

## 3. Re-proof (tests)

| Area | Change | What it proves |
| --- | --- | --- |
| `tests/e2e/helpers/menusQ3.ts` | `advanceToNextRound` / `advanceToBoard` / `advanceToFinal` use `rph-start` / `rph-next` (+ confirm); new `expectAdvancedDiagnosticsUnused` asserts More stays closed before and after every advance | Q3 golden, Q4 branch packs and Q5 desktop lifecycle now reach the board and Final through ordinary controls |
| `tests/e2e/menus-q3-core-gameplay-golden-paths.spec.ts` | Display `nexus-detail` = "Playing" mid-clue; no "Waiting for the first round" mid-round or at completion; `nexus-stage` "Game complete"; Advanced diagnostics unused at end | HG-12 ordinary path; G2 on the golden Session |
| `tests/e2e/menus-q6-rp1-round-progression.spec.ts` (new) | RP1-A: three-round game: Start Round 1 → clue open blocks change → unplayed-clue confirm / Keep playing → Round 2 → Go to the Final (no confirm once played) → Final; truthful Display status throughout; Display privacy. RP1-B: board-only game: End the game (always confirmed) → Host summary; Display "Game complete" | G1 multi-round + board-only completion; G2 through Final and completion; More never opened |
| `tests/e2e/menus-h-repair-1-focused-host.spec.ts` | Board entry via `rph-start`. Post-Start viewport proxy updated (below) | CS-13 / HG-01 |
| `tests/e2e/menus-q4-gameplay-branch-failure-matrix.spec.ts` | Q4-A opens More explicitly before "Undo last reversible", with a G3 comment | Keeps proving replay/Resume semantics; **labelled as not ordinary-path evidence** |
| `src/host/RoundProgressHostPanel.test.tsx` (new, 8) | Start / Final naming / disabled; progress copy; open-clue guard; unplayed confirm + cancel; primary when played out; End confirm; steps aside | Component guards |
| `src/state/sanitize.test.ts` (+5) | Pre-round, in-round, undo back to pre-round, ended, diagnostics override | G2 derivation is replay-derived and bounded |
| `src/display/audience/selectAudiencePresentation.test.ts` (+1) | Nexus de-duplication at completion | G2 presentation |

**Deliberate evidence change (CS-13 / H-REPAIR-1 post-Start viewport):**

- **Before:** the H10 proxy for "concrete gameplay in the first viewport" was
  the scoreboard rows. It was defined when no ordinary round start existed.
- **Now:** before the first round, the concrete gameplay action is the ordinary
  **Start Round 1**. The test therefore requires:
  - that control fully inside the first viewport;
  - the gameplay region beginning inside the first viewport;
  - the scoreboard present, with Controllers after it.
- Once a round is current, the scoreboard-in-viewport proxy is unchanged.
- **Measured at sim125 (1093x542):** with the 48px comfortable-target control
  on the play-status line, the scoreboard rows begin about 9px below the fold
  (551px). At 1280x720 and 1366x768 they remain in the first viewport.
- Shrinking the touch target or restructuring the Host chrome was rejected:
  doctrine requires large live targets, and Host polish is not authorized.
- This is recorded as an explicit evidence change, not a silent relaxation.

---

## 4. Court A re-review (affected rows)

| ID | Prior (Q6 Court) | Re-review disposition | Evidence |
| --- | --- | --- | --- |
| CS-13 | GAP (G1) | **CLOSED BY Q6-RP-1 (candidate)** | H-REPAIR-1 3 viewports: Start Round 1 in first viewport, More closed; RP1-A/B |
| HG-01 | GAP (G1) | **CLOSED BY Q6-RP-1 (candidate)** | H-REPAIR-1 board via `rph-start`; RP1-A |
| HG-04 | GAP (G1) | **CLOSED BY Q6-RP-1 (candidate)** | Q3 golden select/reveal after ordinary board entry; held-answer privacy unchanged |
| HG-09 | GAP (G1) | **CLOSED BY Q6-RP-1 (candidate)** | Q3 golden + Q4-C enter Final via `rph-next`; RP1-A |
| HG-10 | GAP (G2) | **CLOSED BY Q6-RP-1 (candidate)** | Q3 golden completion: `nexus-stage` "Game complete", no stale status; RP1-B; completion-only winner unchanged |
| HG-12 | GAP (G1) | **CLOSED BY Q6-RP-1 (candidate)** | Q3 golden Home→…→completion with every advance asserting More closed and `expectAdvancedDiagnosticsUnused` at the end |
| DP-04 | GAP (G2) | **CLOSED BY Q6-RP-1 (candidate)** | Q3 + RP1-A: `nexus-detail` "Playing" mid-round; no stale status on board / clue / outcome |
| DP-05 | GAP (G2) | **CLOSED BY Q6-RP-1 (candidate)** | RP1-A Final + Q3 completion; Final privacy unchanged |
| **HG-13** | CLOSED BY Q4 | **FUNCTIONAL GAP / BLOCKER (G3)** | See §5. The prior disposition relied on an invalid transfer |

"Candidate" means proven on this branch's exact head. It becomes main truth
only when landed.

---

## 5. New finding G3 - general Undo only in Advanced diagnostics

**Observed (source, base `08f39e1…`):**

- `UNDO` is dispatched from two places:
  - `TeamScoringPanel.tsx:478` "Undo last score change", which is disabled when
    the next undo is not a score change;
  - `FoundationControls.tsx` "Undo last reversible", inside Advanced
    diagnostics.
- A teacher who mis-adjudicates (e.g. presses **Incorrect** for the wrong team)
  has no ordinary way to reverse it. The queue promotes the next team, and the
  projector shows "Incorrect <team>". Manual score correction can repair points
  but not the claim/queue state or the public outcome.
- UX doctrine §7: "safe reversibility where appropriate (undo, re-score,
  promote next team)" during live play.

**How it surfaced:** with G1 repaired, the Q4-A helper no longer opened More,
and Q4-A could not find "Undo last reversible". In the first Q6 Court record,
HG-13 was CLOSED BY Q4. That disposition was an **invalid evidence transfer**:
the undo step worked only because the old advance helper had left More open.
This record corrects it.

**Classification:** FUNCTIONAL GAP / BLOCKER (recovery from an ordinary live
mistake; doctrine-required reversibility). It is outside Q6-RP-1's authorized
scope (G1/G2 and eight rows), so it was **not repaired**.

**Route:** Q4 family (branch / failure / recovery).

**Smallest proposed scope (Q6-RP-2, not authorized here):**

- an ordinary, live-path **Undo** on the focused Host (e.g. beside the
  adjudication controls) for the last reversible gameplay event;
- copy that names what will be undone;
- re-prove Q4-A without opening More, plus Host/Display reconvergence after
  undo.

---

## 6. Semantic-sibling audit (Advanced diagnostics controls)

| Control | Ordinary teacher job? | Disposition |
| --- | --- | --- |
| Advance to next round / Select round | Yes (advance) | **G1 repaired** (ordinary path); arbitrary Select round is not an ordinary job |
| End game session | Yes, for games without a Final | **G1 repaired** (End the game) |
| Undo last reversible | Yes (live reversibility) | **G3 - FUNCTIONAL GAP** |
| Set public status | No, once G2 derives status | G2 repaired; overrides stay diagnostic |
| Initialize / reset session | Ordinary reset exists under More → "Reset this class session" | No gap |
| Advance sequence / Mark waiting / Set private note / Initialize sample game(s) | No | No gap |

---

## 7. Visual check of repaired surfaces (bounded)

- Host after Start (sim125 scratch capture, not archived): **Start Round 1** is
  the only primary button on the play-status line, ahead of Teams & scoring.
  More is closed and no diagnostics are visible.
- Display: the real-flow Nexus detail is "Playing" in play and is suppressed at
  completion.
- No historian milestone was created. PR #134's guards keep legacy archives
  immutable. A new milestone waits for a stable repaired candidate and a Q6
  re-review that supports it.

---

## 8. Verification actually run (local, this branch)

Environment caveat: `npm ci` cannot reach `cdn.sheetjs.com` here (403,
`CQS-Q23-CLASS-B-01`). Local runs used `node_modules` installed with registry
`xlsx@0.18.5` substituted; tracked `package.json` / lockfile restored unchanged.
Exact-dependency verification is CI on the PR head.

VERIFICATION_RESULTS_PLACEHOLDER

---

## 9. Court B

**NOT RUN.** Court A re-review is not COMPLETE (G3).

## 10. Non-claims

This record does not claim:

- G3 repaired;
- Court A COMPLETE or Court B recommendation;
- PRE-Q7 eligibility, `OWNER-PLAYTHROUGH-ELIGIBLE`, Q7, or owner playthrough;
- a historian milestone;
- S05 terminalization;
- S04D / S06;
- physical Sony / projector / audio / Windows evidence;
- a signed release;
- REAL MVP completion;
- the landed state of its own PR.
