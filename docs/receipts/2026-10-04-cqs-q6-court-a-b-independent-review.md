# Receipt - Q6 Court A + Court B independent review

- **Date:** 2026-10-04 (America/Chicago)
- **Authorization:** `AUTHORIZE-CQS-Q6-INDEPENDENT-COURT-REVIEW-1`
- **Kind:** qualification review record (Court A + Court B + bounded Visual
  Product-Specificity Review). Documentation only. No product, test, CSS, or
  design-canon mutation.
- **Reviewed candidate (fresh main):** `d921b07e04acea61a7d50f4f41252b81b74b1a67`
  (PR #132 squash; Q5 docs reconciliation on top of Q5 squash
  `c7e41a42cb41c112419492f9922578a3dc147269`)
- **Branch:** `claude/cqs-q6-court-review-9wdi7i` (based on `d921b07…`)
- **Court A outcome:** **COURT-A: GAPS REMAIN**
- **Court B outcome:** **NOT RUN** (Court A is not COMPLETE)
- **Visual verdict:** **VISUAL REVIEW: FUNCTIONAL FINDINGS REQUIRE REPAIR**
- **Eligibility:** `OWNER-PLAYTHROUGH-ELIGIBLE` is **NOT ISSUED** and is not
  recommended. This record does not issue, imply, or recommend eligibility.

```text
Q6 executed. Court A: GAPS REMAIN (G1, G2). Court B: NOT RUN.
Eligibility path STOPPED pending repair packet Q6-RP-1 (routes to Q3 family).
OWNER-PLAYTHROUGH-ELIGIBLE: NOT ISSUED. PRE-Q7 / Q7: NOT STARTED.
S05 parent OPEN / NOT TERMINAL. S04D / S06 NOT AUTHORIZED.
```

---

## 1. Startup truth observed (before any mutation)

| Item | Observed |
| --- | --- |
| `origin/main` | `d921b07e04acea61a7d50f4f41252b81b74b1a67` (matches expected) |
| Branch / HEAD | `claude/cqs-q6-court-review-9wdi7i` @ `d921b07…`; worktree clean |
| Q0-Q5 | LANDED on main (Q5 squash `c7e41a4…`; reviewed tip `f1d4535…`; proof `455c4cf…`; tip/squash trees EXACT MATCH `8bb6c528…`) |
| Q6 | NEXT / NOT AUTHORIZED before this authorization |
| Findings A/B, C, D | Recorded closed by Q1, Q3, Q5 respectively |
| `OWNER-PLAYTHROUGH-ELIGIBLE` | NOT ISSUED |
| S05 parent / S04D / S06 | OPEN / NOT TERMINAL; NOT AUTHORIZED; NOT AUTHORIZED |

No discrepancy between the expected starting truth and the repository was
found.

### 1.1 CI provenance on main (GitHub Actions, observed)

| SHA | CI | Desktop artifacts | Pages |
| --- | --- | --- | --- |
| `d921b07…` (reviewed) | success | success | success |
| `c7e41a4…` (Q5 squash) | success | success | success |
| `28ff239…` (Q4 docs) | success | success | success |
| `c32b72c…` (Q4 squash) | **cancelled** (superseded by `28ff239…` under concurrency) | **cancelled** | success |
| `85bb951…` (Q3 squash) | success | success | success |
| `2dc918f…` (Q2 squash) | success | success | success |
| `9d8246e…` (Q1 squash) | success | success | success |

The cancelled Q4 squash runs are covered by its docs-only descendant `28ff239…`
(diff touches only `docs/STATUS.md` and `docs/handoff/CURRENT.md`), whose full
CI succeeded. CI on main runs lint, typecheck, unit, production build, and the
full Playwright suite against `vite preview` of the production build
(`reuseExistingServer` is false under `CI`). Desktop artifacts runs desktop
unit + `npm run test:desktop` (fresh `build:desktop`, then Electron
Playwright) on the exact checked-out SHA. Therefore every RETAIN suite below
executed green on the reviewed candidate `d921b07…` in CI. CI green is reach of
the suites, **not** Court PASS.

Product code (`src/`) changed after Q0 only in Q1 (`9d8246e…`), Q2
(`src/test/setup.ts` only), and Q3 (`85bb951…`). Q4, Q5, and the docs PRs are
tests/docs only.

---

## 2. Method

- Read the startup-canonical set required by `AGENTS.md` and the authorization.
- Walked all 59 rows in matrix §§2-6 (HL-01..12, AI-01..07, CS-01..17,
  HG-01..15, DP-01..08). For each row, the cited suites were located and the test
  bodies read to separate reach from effect, real product flow from injected
  state, and simulation from physical evidence. Three read-only independent
  reviewer passes (one per matrix region) were run in parallel, and every
  material claim they raised was re-verified directly in source before it was
  adopted here.
- Inspected Q5 PR #131 SonarCloud evidence and the Q5 diff.
- Captured current rendered surfaces in a **scratch-only** browser run (see §6.1).
  No screenshots were committed and no historian archive was created or
  modified.

---

## 3. Court A - gaps (blocking)

### G1 - Round progression is reachable only through Advanced diagnostics

**Observed fact (source, `d921b07…`):**

- `ADVANCE_TO_NEXT_ROUND` is dispatched by exactly one UI control,
  `src/host/FoundationControls.tsx:1125` ("Advance to next round"). `SELECT_ROUND`
  is likewise dispatched only at `FoundationControls.tsx:1158`. Both sit inside
  the `host-advanced` section (`FoundationControls.tsx:954-1169`), headed
  **Advanced diagnostics**: "Optional troubleshooting controls. They are not
  required for ordinary classroom setup." Its siblings include
  **Initialize / reset session**, **Initialize sample game**, **Mark waiting**,
  and **End game session**.
- After **Start Game**, `currentRoundIndex` is `null` (`src/state/reducer.ts:240`),
  so no category board renders. The focused Host shows Teams & scoring and
  Controllers, plus a collapsed **More** disclosure. No ordinary control or cue
  starts Round 1 (observed render, §6.2 Host-after-Start).
- The same diagnostics button is the only path from an exhausted board to
  **Final** (`advanceToFinal` -> `advanceToNextRound` in
  `tests/e2e/helpers/menusQ3.ts:91-105`).
- The teacher Quick Start says "Host shows Class setup before the board"
  (`docs/teacher/QUICK_START.md` §4) and "Advanced diagnostics ... are not
  required for a normal class period" (Tips). Following the documentation
  leaves the teacher with a started class session and no board.
- UX canon: `CQS-UX-SURFACE-INVENTORY.md` §12 defines the Host primary job as
  "arm, adjudicate, score, **advance**".

**Why earlier evidence did not expose it:** the Q3 golden pack, the Q4 branch
pack, the Q5 lifecycle pack, and `menus-h-repair-1-focused-host.spec.ts` all
open More and click "Advance to next round". H-REPAIR-1 labels this "Legitimate
round-advance path (More -> Advance)" (`menus-h-repair-1-focused-host.spec.ts:208`).
About 40 test references drive round entry this way. The dispatch is authentic
(no state injection), so the evidence proves **engine integration**. It does
not prove that a teacher can perform the ordinary path with ordinary controls.
No owner decision or ADR was found that places round progression in
diagnostics.

**Classification:** FUNCTIONAL GAP / BLOCKER. It is also a blocking
USABILITY/FUNCTIONAL visual finding: a reasonable teacher can **miss the
required ordinary action** (start Round 1, enter Final). The control that
performs it is presented as optional troubleshooting next to destructive
session controls.

**Affected rows:** CS-13, HG-01, HG-04, HG-09, HG-12 (HG-04 and HG-09 inherit
the gap through board entry and Final entry).

**Failed invariant:** after authentic Start, the focused Host gives the
teacher an ordinary, discoverable control to begin the first round and to
progress rounds through Final. Ordinary play does not depend on Advanced
diagnostics.

**Evidence class required:** AUTOMATED E2E on a proven served build (browser),
plus re-run of DESKTOP E2E Q5-C, using the ordinary control with the More /
Advanced diagnostics section never opened.

**Route:** **Q3** (core gameplay golden path; HG-01 is Q2/Q3). Product repair
required.

### G2 - Public Display status detail is stale for the whole game

**Observed fact (source, `d921b07…`):**

- The public status channel is a bounded code (`src/state/status.ts`). The
  session initializes at `session-ready` (`reducer.ts:200`), whose fixed public
  detail is **"Waiting for the first round."** (`status.ts:41`).
- `SET_PUBLIC_STATUS` is dispatched only from Advanced diagnostics
  (`FoundationControls.tsx:1032`). On the ordinary path the code never changes.
- The Audience Display renders that detail in the Nexus Core and in the
  top-left status (`AudienceDisplayShell.tsx`, `NexusCore.tsx:84-86`). The only
  cleanup is for a stale **"Playing"** detail at Game complete
  (`selectAudiencePresentation.ts:372-378`), and the ordinary Host flow never
  publishes "Playing".
- Observed render (real Host -> Display flow, §6.2): the projector shows
  "Round 1 of 2 · Board open · **Waiting for the first round.**", the same on the
  open clue, active claim, Correct outcome, and Final team reveal, and
  "**Game complete · Waiting for the first round.**" on the winner screen.

**Why earlier evidence did not expose it:** S05 Display suites and historian
archives use injected `PublicState` fixtures whose `detail` is `'Playing'`
(`src/test/visualStressDisplaySnapshots.ts:147,220`,
`visualHistoryFinalSnapshots.ts:30`, `visualHistoryRecoverySnapshots.ts:44,108`).
That never occurs on the ordinary Host-published path. The Q3/Q4/Q5 real-flow
packs assert stage elements and privacy, but never the Nexus detail. This
evidence transfer is **invalid** for Display status honesty (see §7).

**Classification:** FUNCTIONAL GAP / BLOCKER (public-state honesty, contract
§5.1 item 5 "copy and status match lifted truth"). The defect is on the
projector in every ordinary game, including the completion moment. The
dominant stage label stays correct, which limits severity but does not make
the public statement true. It is not a privacy leak.

**Affected rows:** DP-04, DP-05, HG-10.

**Failed invariant:** public status copy on the Audience Display matches
authoritative game state (pre-round vs. in-round vs. complete) on the ordinary
Host-published path.

**Evidence class required:** AUTOMATED E2E (real Host -> Display, no
`injectPublicState`) asserting the Nexus/status copy after round entry, during
an open clue, and at completion. Plus unit/selector coverage.

**Route:** **Q3** (Display public authority on the golden path). Product repair
required.

### 3.1 Court A outcome

**COURT-A: GAPS REMAIN.** Named rows: CS-13, HG-01, HG-04, HG-09, HG-12
(G1); DP-04, DP-05, HG-10 (G2). Both gaps are ordinary-path functional and may
**not** be waived through PRE-Q7. Court B was **not** executed.

---

## 4. Court A - row-by-row dispositions (matrix §§2-6)

Disposition vocabulary per authorization: RETAIN / CLOSED BY Q1-Q5 / PHYSICAL-ONLY /
OWNER-ONLY / NON-FUNCTIONAL RESIDUAL / FUNCTIONAL GAP / BLOCKER. "Note" records
evidence-accuracy corrections and non-blocking strengthening. They are not
second dispositions.

### 4.1 HOME / LIBRARY

| ID | Q6 disposition | Basis / note |
| --- | --- | --- |
| HL-01 | RETAIN | `q5-session-lifecycle` Q5-C: real Electron quit/relaunch -> Home Resume, no auto-resume -> explicit Resume restores score; Display sanitized. Note: `teacher-first-run` opens `#/host`, so it is not cold-launch evidence; citation overstated. |
| HL-02 | CLOSED BY Q1-Q5 | Q2 `menus-q2-a-new-game-play-setup` "Q2-A: New Game -> fill board+Final -> Saved playable -> Play -> Class Setup" (real authoring UI). |
| HL-03 | CLOSED BY Q1-Q5 | Q2 `menus-q2-b-home-import` + `menus-q2-ai04-home-spreadsheet`. Note: two q2-b assertions are weak (`:37` permissive regex; `:47` `slice(0,8)` check cannot fail). Fail-closed is proven by the `HomeRoute` unit test (no saved-definition write). |
| HL-04 | NON-FUNCTIONAL RESIDUAL | H4 collapsed-detail LOW (§8). Note: the matrix cites "H4 e2e"; no H4 Keep e2e exists. Evidence is UNIT/COMPONENT (`HomeRoute.test.tsx:785-960`, `salvage.test.ts`, `ImportSalvagePanel.test.tsx`). |
| HL-05 | CLOSED BY Q1-Q5 | Q2-A/Q2-B + `classroom-setup`: playable-only Play -> `?play=` -> Class Setup; draft has no Play (`menus-slice-cd`). |
| HL-06 | RETAIN | Duplicate: Q2-C + `gameLibrary.test.ts`. Rename/Delete: library-level unit only (`savedDefinitions.test.ts`, `gameSessionIsolation.test.ts`). Game/Session isolation holds structurally: Session replay carries `GAME_INITIALIZED.definition` (`events.ts:126-129`), and Home Resume routes to Host recovery, not the library (`HomeRoute.tsx:125-130`). Note: no served-build e2e of Home Rename/Delete or Home Export, and the Q2-C draft-row check at `:88` does not discriminate. Library maintenance is not on the ordinary class-play path. Recorded as non-blocking proof-strengthening (Q2 family). |
| HL-07 | RETAIN | `persistence-recovery` (real IndexedDB) + Q2-C Resume/Start fresh. |
| HL-08 | RETAIN | Q2-P opens Display from empty Home (reach/act). Live-content privacy is covered by Q3, Q5-C, `projector-safety`. |
| HL-09 | RETAIN | `menus-slice-a-host-posture` absence assertions. |
| HL-10 | RETAIN | Note: **evidence class corrected.** Not e2e for restore. `backup-restore.spec.ts` covers download from an empty library only. `backup-idb-atomicity` drives `applyStagedBackup` via a harness. The actual round trip is UNIT (`backup.test.ts:40` build -> parse -> apply -> canonical `loadDefinition`) + COMPONENT (`BackupRestorePanel.test.tsx` preview/confirm/cancel). Backup is not on the ordinary class-play path. A served-build restore e2e is recommended as non-blocking strengthening (Q2/Q5 family). |
| HL-11 | RETAIN | Q2-C multi-game/draft/recovery: Resume restores the partial name. |
| HL-12 | OWNER-ONLY | The functional next action from empty Home is proven (Q2-A). Feel/IA is Q7. |

### 4.2 AUTHORING / IMPORT

| ID | Q6 disposition | Basis / note |
| --- | --- | --- |
| AI-01 | RETAIN | `menus-slice-cd-home-authoring` (reach) + Q2-A act/effect. |
| AI-02 | CLOSED BY Q1-Q5 | Q1 zero-team / Slice E Fix return + `AuthoringRoute.test.tsx` 1-8 range. |
| AI-03 | CLOSED BY Q1-Q5 | Q2-A (fill board + Final in the real editor -> Saved -> playable). Note: the cited `spreadsheet-authoring` Final step ends in an assertion that cannot fail (`:140`), and `teacher-home-authoring` is reach only. Citation corrected. |
| AI-04 | RETAIN | Q2 AI-04: real template download + completed workbook via file chooser -> Play -> setup. |
| AI-05 | RETAIN | `portable-packs` / `portable-export`: deep content equality round trip (Host surface). |
| AI-06 | RETAIN | Q2-A authoring Play -> `?play=` -> Class Setup. |
| AI-07 | CLOSED BY Q1-Q5 | Q2-A validation -> Saved -> Play enabled; `saveTrust` / `saveGate` / `AuthoringRoute` units. Citation clarified. |

### 4.3 CLASS SETUP

| ID | Q6 disposition | Basis / note |
| --- | --- | --- |
| CS-01 | RETAIN | Scenario D / B+F / classroom-setup: exact five-row order. |
| CS-02 | RETAIN | Scenario D re-click keeps the row open; readiness emphasis distinct from selection. |
| CS-03 | RETAIN | Skip -> skipped; Start stays enabled (B+F, Q2-H). |
| CS-04 | CLOSED BY Q1-Q5 | Finding A (§5). The `menus-i-repair-1-scenario-d` asserted outcome text appears only after a recorded press (`SonyBuzzSetupSection.tsx:919`, `sonyBuzzTeacherReadiness.ts:190`). SIMULATED. |
| CS-05 | PHYSICAL-ONLY | Note: **transfer label corrected.** H5/H6 PASS is HISTORICAL @ `9df9c42…`. Class Setup / Sony presentation changed since (MENUS A-I, I-REPAIR-1, Q1 `enterBuzzerCheck`, Q3 `publicTeamDisplayName`), so contract §8 rule 4 forbids transfer. Physical Sony is **NOT RUN** on `d921b07…`. Not an ordinary-path blocker: keyboard naming (CS-09) and Buzzers-optional Start (CS-03/CS-14) are proven. |
| CS-06 | RETAIN | zero-team / Slice E blocked state + Fix visible. |
| CS-07 | CLOSED BY Q1-Q5 | Finding B (§5). Note: the "kept meaningful Session on Fix-return" branch is proven by predicate unit tests only. Low risk, because a 0-team Session cannot become meaningful through the UI. |
| CS-08 | RETAIN | Copy rule (unit). |
| CS-09 | RETAIN | Q2-H keyboard names -> Ready -> Start. |
| CS-10 | CLOSED BY Q1-Q5 | `menus-slice-h-names-sim-sony` H8: colour press creates the claimed name; Ready is reachable only through the claim. SIMULATED. Note: claimed text not pinned to the choice label. |
| CS-11 | RETAIN | Display popup opens; Start stays enabled. |
| CS-12 | RETAIN | Q2-I. Note: "Sound tested" is set on click regardless of `enableSound()` outcome (`FoundationControls.tsx:653-656`). Minor honesty residual; audibility is PHYSICAL AUDIO. |
| CS-13 | **FUNCTIONAL GAP / BLOCKER (G1)** | Start unmounts setup and focused gameplay chrome is in the first viewport (proven). But the Host after Start has no board and no ordinary path to start Round 1. |
| CS-14 | RETAIN | B+F: Start sole dominant; optionals do not revoke. |
| CS-15 | RETAIN | `menus-bf-viewport` geometry; laptop feel OWNER-ONLY. |
| CS-16 | RETAIN | Q2-M reload -> Resume restores partial name. |
| CS-17 | OWNER-ONLY | Terminology/feel. |

### 4.4 HOST / GAMEPLAY

| ID | Q6 disposition | Basis / note |
| --- | --- | --- |
| HG-01 | **FUNCTIONAL GAP / BLOCKER (G1)** | The semantic success "Board ... authority without setup chrome" after Start is reached only via Advanced diagnostics. |
| HG-02 | CLOSED BY Q1-Q5 | Q2-L Back -> setup -> Start again. No invented events: Back is a local posture flip (`FoundationControls.tsx:617-621`). |
| HG-03 | RETAIN | `menus-slice-g-change-game`. |
| HG-04 | **FUNCTIONAL GAP / BLOCKER (G1)** | Select/reveal + held-answer privacy is proven (Q3), but board entry depends on G1. |
| HG-05 | CLOSED BY Q1-Q5 | Q3 keyboard + SIMULATED Sony claim with Session names on Host + Display. Physical buzz PHYSICAL-ONLY. |
| HG-06 | CLOSED BY Q1-Q5 | Q3 real `lih-correct` -> outcome -> exact 100/150; Q4-A Incorrect -> queue promotion. Note: deduction is proven only on bare-Host suites; some "contains '0'" checks cannot fail. |
| HG-07 | CLOSED BY Q1-Q5 | Q3 arm/timer; Q4-B stale timer. Note: Q4-B does not confirm the second `rth-start` took effect (`:126-128`). |
| HG-08 | CLOSED BY Q1-Q5 | Q3 `Digit1` on the authentic Session. |
| HG-09 | **FUNCTIONAL GAP / BLOCKER (G1)** | Final lifecycle is proven (Q3), but Final entry is reachable only via Advanced diagnostics. |
| HG-10 | **FUNCTIONAL GAP / BLOCKER (G2)** | Completion-only winner is proven (Q3/Q4-C), but the projected completion reads "Game complete · Waiting for the first round." |
| HG-11 | CLOSED BY Q1-Q5 | Q3 Host summary with Session standings; Display has no summary. |
| HG-12 | **FUNCTIONAL GAP / BLOCKER (G1)** | Integrated engine path proven on one served build. The ordinary-teacher-control claim fails at round entry and Final entry. |
| HG-13 | CLOSED BY Q1-Q5 | Q4 undo -> Resume -> reconvergence; mid-Final Resume -> tie -> completion. Note: the Display checks immediately after Resume repeat pre-reload state; later steps prove live publish. |
| HG-14 | RETAIN | Diagnostics sanitization is unit-proven (`buildDiagnosticSnapshot.test.ts`). Mute effect is proven in `presentation-audio.spec.ts` (cue count frozen under mute) via the shared `presentationAudio.setMuted`. Note: the Host chrome **Mute all sounds** button (`host-chrome-mute`) is asserted for presence only; its 2-line handler calls the same `setMuted(true)`. Some e2e diagnostics privacy assertions cannot fail (`shell.spec.ts:322-323`, `diagnostic-report.spec.ts:26-38`). Non-blocking strengthening. |
| HG-15 | OWNER-ONLY | NOT RUN; Q7 after PRE-Q7. |

### 4.5 DISPLAY

| ID | Q6 disposition | Basis / note |
| --- | --- | --- |
| DP-01 | CLOSED BY Q1-Q5 | Q5-B/Q5-C + shell: Electron second window, reopen after relaunch. |
| DP-02 | CLOSED BY Q1-Q5 | Q3 held-answer privacy (browser); Q5-C under Electron. Note: the Q5-C held-answer check (`:130-132`) does not await a Display update; same renderer/sync code as Q3. |
| DP-03 | RETAIN | S05-F1 overflow/clip/image geometry at 1080p/720p (injected content). Physical projector legibility PHYSICAL-ONLY. |
| DP-04 | **FUNCTIONAL GAP / BLOCKER (G2)** | Buzz/outcome public authority is proven from the real Host (Q3), but the public status detail is false during play. |
| DP-05 | **FUNCTIONAL GAP / BLOCKER (G2)** | Final/winner privacy and completion-only winner are proven, but the public status detail is false through Final and completion. |
| DP-06 | NON-FUNCTIONAL RESIDUAL | Historian archives are immutable history, not acceptance. Note: the MENUS and S05 historian capture specs no longer run on current main (stale selectors `team-name-selection-board`, "My games" heading). The historian capture harness has drifted. |
| DP-07 | PHYSICAL-ONLY | Physical projector / sleep NOT RUN (S06). |
| DP-08 | OWNER-ONLY | Display feel (Q7). |

**Count:** 59 rows reviewed. 8 rows FUNCTIONAL GAP / BLOCKER (CS-13, HG-01,
HG-04, HG-09, HG-12, HG-10, DP-04, DP-05). No other row is classified as a
functional blocker.

---

## 5. Findings A-D - independent revalidation

| ID | Q6 status | Evidence |
| --- | --- | --- |
| **A** | **HOLDS (CLOSED BY Q1; SIMULATED)** | Check -> `enterBuzzerCheck` -> existing SBS `testMode` (`ClassroomSetupPanel.tsx:386-396`, `FoundationControls.tsx:688-698`, `GamepadInputHostPanel.tsx:429-434`). The Scenario D press assertions depend on a recorded press. The simulated pad patches `navigator.getGamepads` and the product's own rAF poll reads it. **Not proven:** WebHID permission, keep-alive, receiver "connected" layer, real handsets. Physical Sony NOT RUN. |
| **B** | **HOLDS (CLOSED BY Q1)** | `disposableContextualTeamCountSession.ts:21-24` accepts only the two init event types; any other or unknown event -> not disposable. A non-disposable Session keeps recovery (`FoundationControls.tsx:240-246`). No silent-discard path found. |
| **C** | **QUALIFIED - ordinary-path claim REOPENED by G1** | The Q3 pack proves Home -> setup -> Start -> board -> clue -> buzz -> Correct -> score -> Final -> completion -> summary on one served build with no state injection. It reaches the board and Final only through Advanced diagnostics. Engine integration: evidence-backed. "Ordinary teacher golden path": not established until G1 is repaired and re-proven. |
| **D** | **HOLDS (CLOSED BY Q5)** | `shell.spec.ts` RETAIN; `q5-session-lifecycle.spec.ts` Q5-A..D. Q5-A compares build `sourceSha` (CI: `CQS_SOURCE_SHA = pull_request.head.sha`, `desktop.yml`) with `git rev-parse HEAD` of the same checkout: valid build-to-head binding. It does not detect uncommitted local changes. `test:desktop` always rebuilds. |

---

## 6. Visual Product-Specificity Review (bounded, subordinate to Court A)

### 6.1 Evidence basis

- **Current rendered evidence (Q6 scratch, BROWSER-OBSERVED, not archived):**
  - Source was a detached worktree of `d921b07…`, served by `vite preview` of a
    production build.
  - Pages were driven through the real Q3 helper path (Home import -> Play ->
    Class Setup -> Names -> Start -> Host-chrome Display -> board -> clue ->
    keyboard buzz -> Correct -> score -> Final -> completion).
  - Host was captured at 1366x768 and Display at 1920x1080 (Chromium headless).
  - Provenance caveat: the xlsx dependency was substituted with registry
    `xlsx@0.18.5` only to install, because `cdn.sheetjs.com` is blocked in this
    environment (`CQS-Q23-CLASS-B-01`). xlsx does not affect rendering.
  - This is **not** a served-build identity proof for `d921b07…`. G1 and G2 are
    confirmed independently in source on `d921b07…`.
  - The fonts are the container's fallbacks (DejaVu). Typography appearance is
    not representative of teacher machines.
- **Historical:** `docs/design/history/2026-09-s05-complete/` and
  `2026-09-menus-pre-owner-gate/` used only for comparison. They are not treated
  as current appearance. S05 Display archives are injected-fixture renders (see
  G2).
- **Not observed:** physical projector, Electron window chrome, Windows,
  high-contrast and reduced-motion on the real-flow path, authoring editor
  mid-edit, error/salvage states (not re-captured).

### 6.2 Surface findings

| Surface | Observed evidence | Canon | Finding | Class | Blocking | Owning lane |
| --- | --- | --- | --- | --- | --- | --- |
| Home (empty / populated / recovery) | Scratch 01/04/05 | Doctrine: setup restrained; progressive disclosure | Recovery banner dominates correctly with Resume primary; New Game / Import secondary; Your Games card centered. Restrained and job-specific. "Playable · Draft" badge pairing on a playable imported game is ambiguous. | PASS (OBSERVATION on badge copy) | No | Q7 owner feel |
| Authoring (New Game) | Scratch 03 | Board-first editor | Board-first composition reads as a quiz-board editor, not a generic form. Not deeply exercised. | PASS | No | - |
| Class Setup | Scratch 10/11 | Inventory §6; row grammar | Left task rows (Buzzers / Teams / Names / Display / Sound) with state words and a detail pane: task-specific, strong. "Receiver needs attention" is shown for Buzzers when no hardware exists, even though Buzzers are optional. | PASS + USABILITY FINDING (non-blocking) | No | Future Class Setup copy polish (fresh auth) |
| Host after Start | Scratch 13/13b | Inventory §12 primary job "advance" | No board and no ordinary next action. Controllers panel with "Receiver needs attention", buzzer mapping, and **Advanced button capture expanded** occupies the post-Start Host. The buzzer mapping lists authored names ("Alpha Rockets") while scoring shows Session names ("Team 1"). | **FUNCTIONAL FINDING (G1)**; mapping-name mismatch USABILITY (non-blocking); controller machinery after Start POLISH | G1 **Yes**; others No | G1 -> Q3 repair; others future Host polish (fresh auth) |
| Host clue open | Scratch 15 | Privacy grammar; one-second standard | Every private field is labeled HOST ONLY; "ON THE DISPLAY NOW: the prompt (the answer is NOT shown)" is excellent state awareness; primary action blue. Strongly product-specific. | PASS | No | - |
| Host response/timer/scoring | Scratch 16/17/19 | P02/P04 | Clear status table (Clue / Arming / Timer). The page is a long vertical stack of equal-weight bordered panels, each with a pill header "X - HOST CONTROLS, PRIVATE", so the adjudication controls sit below the fold during an active claim. | POLISH (repetition / equal-weight containment) | No | Future Host polish (fresh auth) |
| Display board | Scratch 31 | Distance-first; stage grammar | Round/stage Nexus, scores rail, team status rail, "0 OF 1 CLUES USED". Reads as a stage. Nexus detail is false (G2). The one-tile fixture makes the board look sparse (fixture artifact). | FUNCTIONAL FINDING (G2) | **Yes** | Q3 repair |
| Display open clue / active claim | Scratch 32/34 | S05 buzz choreography | Category + value chip + large prompt; ANSWERING team in the bottom rail; armed/timer chip. Coherent broadcast grammar. "BUZZERS ARMED · Stopped" pairing while a team is answering is mildly contradictory. | PASS + OBSERVATION | No | - |
| Display outcome | Scratch 35 | Path S-C | "Correct Team 1" in the rail and team status CORRECT. Score updates appear after Host scoring (Path S-C static). | PASS | No | - |
| Display Final / reveal | Scratch 38-42 | ADR-014 | FINAL WAGER label, prompt, answer, framed team reveal card with response and wager. Clear and theatrical enough. | PASS | No | - |
| Display winner / completion | Scratch 43 | Completion-only winner | Large WINNER treatment with Session name and score; earned by state. Nexus says "Waiting for the first round." | PASS (composition) / FUNCTIONAL FINDING (G2) | G2 Yes | Q3 repair |
| Host completion / summary | Scratch 25 | Inventory §28-29 | "Final is complete" panel; the Session summary is below the fold under scoring. | OBSERVATION | No | Q7 |
| Error / recovery states | Home recovery only | - | Others NOT OBSERVED in Q6. | NOT OBSERVED | - | - |

### 6.3 Recurring patterns

- **Strength:** distinctive, structural product identity. The Host/Display
  privacy grammar (HOST ONLY labels, "on the display now"), the Class Setup
  task-row grammar, and the Display stage grammar (Nexus, team status rail,
  signal rail, completion-only winner) are specific to classroom quiz
  operation, not template decoration.
- **Weakness:** Host equal-weight containment. Every subsystem is a bordered
  panel with the same pill header, which mirrors implementation panels more
  than the teacher's current job, and Controllers machinery persists after
  Start. This is a hierarchy/progressive-disclosure issue, handled within
  existing canon.
- **Weakness (functional):** real-flow states that only diagnostics can change
  (round entry, public status) are invisible to fixture-based visual evidence.

### 6.4 Separation

- **Blocking functional/usability findings:** G1 (round progression hidden in
  Advanced diagnostics), G2 (stale public status detail).
- **Non-blocking polish / usability:**
  - Controllers panel and Advanced button capture expanded after Start.
  - "Receiver needs attention" when buzzers are skipped or absent.
  - Authored vs. Session names in the buzzer mapping.
  - Equal-weight Host panel stacking pushes adjudication below the fold.
  - "Playable · Draft" badge.
  - "Sound tested" set on click.
  - "BUZZERS ARMED · Stopped" during an active claim.
- **Out-of-scope design opportunities (fresh owner authority required):**
  - Host state-driven layout (e.g. pin the current job's controls above the
    fold).
  - Scoreboard animation (already banked as `CQS-OPP-PRESENTATION-EFFECTS`).

### 6.5 Required visual conclusion

**Is there evidence that CQS currently suffers from generic AI-template design
strongly enough to justify reopening visual concept/design direction before
owner playthrough? No.** The rendered surfaces carry structural,
classroom-specific identity. The defects found are a hidden required control
(G1) and a false public status string (G2). Both are functional and repairable
within existing canon, not design-direction failures. Host panel repetition is
POLISH. This review does not authorize any visual or Host polish work.

**Overall visual verdict:** **VISUAL REVIEW: FUNCTIONAL FINDINGS REQUIRE REPAIR**
(G1, G2 only).

---

## 7. Evidence-transfer ledger (invalidated / qualified)

| Claim | Transfer verdict | Reason |
| --- | --- | --- |
| H5/H6 physical Sony PASS -> current main | **INVALID** (labeling corrected; NOT RUN on `d921b07…`) | §8 rule 4: Class Setup / Sony presentation changed after `9df9c42…` |
| S05 Display visual/historian evidence -> real-flow Nexus/status copy | **INVALID** | Fixtures inject `detail: 'Playing'`; the real Host publishes `session-ready` forever (G2) |
| Q3 golden pack -> "ordinary teacher golden path" | **QUALIFIED** | Authentic dispatch, but through Advanced diagnostics (G1). Engine integration transfers; ordinary-control claim does not |
| Q1/Q2 browser evidence -> current main (after Q3 product repair) | VALID | Re-executed green in CI on `d921b07…` |
| Q4 squash CI -> Q4 landed claim | VALID via descendant | Squash runs cancelled; docs-only descendant `28ff239…` green |
| Q5 tip -> squash | VALID | Trees EXACT MATCH `8bb6c528…`; Desktop artifacts green on `c7e41a4…` and `d921b07…` |
| HL-04 / HL-10 "e2e" citations | CORRECTED | Evidence is unit/component; no e2e exists for H4 Keep or backup restore |

---

## 8. Q5 PR #131 SonarCloud - classification

**Observed:**

- Check run `SonarCloud Code Analysis` on reviewed tip `f1d4535…`: **failure**,
  "B Security Rating on New Code (required >= A)".
- PR #131 was merged with this gate failing; all other checks were success.
- The SonarCloud issues/hotspots API could not be queried from this environment
  (network policy 403), so the exact rule key is **not directly observed**.

**Changed code in scope:** `tests/desktop/helpers/desktopLaunch.ts`
`resolveExactHeadSha()` -> `execFileSync('git', ['rev-parse','HEAD'], { cwd: repoRoot })`
with the inherited `PATH`. The other new file (`q5-session-lifecycle.spec.ts`)
contains no process, file-system-write, or network code beyond Playwright and a
`fetch('cqs://app/desktop-build-identity.json')` inside the renderer.

**Reasoning:**

1. **The prior characterization is imprecise.** Contract §15 calls it a "MINOR
   PATH hotspot + async smell". A hotspot or a code smell does not by itself
   lower the Security **Rating**; a security-impacting issue does. This
   repository has direct precedent: the S03 receipt records
   "`execFileSync('git')` PATH taint in `vite.config.ts`" as a **gate-driving
   new-code security finding** that lowered the Security Rating. S03 fixed it by
   reading `.git/HEAD` from the file system
   (`receipts/2026-08-13-cqs-real-mvp-s03-desktop-distribution-release-foundation.md`).
   Q5 reintroduced the same pattern in a test helper. That is the most likely
   owner of the B rating. The async smell is maintainability and cannot affect
   the Security Rating.
2. **Product security defect: no.** `electron-builder.yml` packages only
   `out/main/**` and `out/renderer/**`. `tests/` is never shipped, and product
   `sourceSha()` (`vite.config.ts:27-45`) does not spawn processes.
3. **Qualification-harness integrity: no material impact.** Exploiting the
   finding requires control of `PATH` on the runner (macOS GitHub runner in
   CI). An actor with that control already controls the build and tests.
   Q5-A's two values come from independent sources in CI: `CQS_SOURCE_SHA` from
   the event payload at build time, and `git rev-parse` of the checkout at test
   time. A tampered `git` could only make Q5-A fail or pass falsely under an
   already-compromised runner. Q5-C/Q5-B/Q5-D do not use it.
4. **Classification:** **NON-FUNCTIONAL RESIDUAL - test-maintainability /
   static-analysis hygiene.** It does not invalidate Q5 build-identity or
   qualification evidence. The process deviation is real: a known-pattern
   finding was merged under a failing gate and was described inaccurately.
   **Recommended (not done under Q6):** replace `execFileSync('git')` with the
   same `.git/HEAD` file read used by `vite.config.ts`, and remove the needless
   `async`. This can ride the Q6-RP-1 repair branch, since that branch will touch
   desktop re-proof anyway. Re-observe Sonar on that exact head.

---

## 9. Known residuals - classification

| Residual | Class | Why |
| --- | --- | --- |
| Physical Sony NOT RUN on Q1-Q5 identities | PHYSICAL-ONLY (NOT RUN) | Buzzers are optional; keyboard path proven. Precondition for any Sony claim in Q7 |
| Physical projector NOT RUN | PHYSICAL-ONLY (NOT RUN) | DP-07; S06 |
| Physical audio NOT RUN | PHYSICAL-ONLY (NOT RUN) | Sound optional for Start; mute/cue logic proven in browser |
| Windows physical runtime NOT RUN | PHYSICAL-ONLY (NOT RUN) / S06 | Not authorized |
| Signing / notarization | OUT OF CURRENT GATE (owner gate) | Not an owner-playthrough requirement |
| H4 salvage collapsed detail | NON-FUNCTIONAL RESIDUAL (OPEN / LOW) | Only in the Keep-replaces-playable branch; primary status and panel are honest; Keep cannot repeat; re-import hits a replace confirm. No harmful ordinary action |
| `CQS-Q23-LOW-02` | NON-FUNCTIONAL RESIDUAL (OPEN / LOW / MONITOR) | Unchanged; no Q6 evidence of ordinary-path impact |
| `CQS-Q23-CLASS-B-01` | NON-FUNCTIONAL RESIDUAL (OPEN / CONTROLLED) | Build-time `cdn.sheetjs.com` dependency. Reconfirmed in Q6: `npm ci` fails here with 403 on that host. Packaged runtime unaffected |
| S05 parent OPEN / NOT TERMINAL | NON-GATING (program state) | Not terminalized by Q6 |
| S04D NOT AUTHORIZED / S06 NOT AUTHORIZED | OUT OF CURRENT SCOPE | Not started |
| Pre-existing react-refresh lint warnings | NON-FUNCTIONAL RESIDUAL | Warnings only |
| Q5 SonarCloud failure | NON-FUNCTIONAL RESIDUAL (§8) | Test helper only; fix recommended |
| Historian capture specs stale on main | NON-FUNCTIONAL RESIDUAL | Skip-by-default and not in CI. A future historian milestone needs selector repair under its own authorization |
| `src/test/setup.ts` (Q2) in-memory synchronous `BroadcastChannel` for jsdom | NON-FUNCTIONAL RESIDUAL (evidence-strength note) | Unit sync tests no longer exercise async/clone semantics. Playwright still uses the real channel. `usePublicState.test.tsx:9` comment ("REAL BroadcastChannel") is now inaccurate |
| `playwright.config.ts` local `reuseExistingServer` + CI retries 2 | NON-FUNCTIONAL RESIDUAL | Local runs are not served-build proof; CI is. Flaky-retry counts should be read before treating green as proof |
| Weak assertions noted in §4 notes | NON-FUNCTIONAL RESIDUAL | None is the sole proof of a row's invariant |
| Q5 receipt / contract §16 non-claim "Q5 LANDED" after landing | NON-FUNCTIONAL RESIDUAL (doc wording) | Candidate-era non-claim retained beside landed status. Contract §16 line updated by this Q6 record; the historical Q5 receipt is left unrewritten |
| **G1** round progression only in Advanced diagnostics | **FUNCTIONAL BLOCKER** | §3 |
| **G2** stale public status detail | **FUNCTIONAL BLOCKER** | §3 |

---

## 10. Repair / proof authorization packet - `Q6-RP-1` (proposed; not executed)

**Owning family:** Q3 (core gameplay golden path). HG-01 also touches Q2 focused-Host posture.

**Goal:** a teacher can run board -> Final -> completion with ordinary,
discoverable Host controls, and the projector's status copy is truthful
throughout.

**Smallest repair scope:**

1. **G1 (product):** on the focused Host in play posture, expose an ordinary
   round-progression control outside Advanced diagnostics:
   - when `currentRoundIndex === null` after Start, a primary action that begins
     Round 1;
   - when the current round is complete or the teacher chooses to move on, an
     ordinary action to proceed to the next round / Final, with the confirmation
     the existing round model requires.

   Reuse the existing `ADVANCE_TO_NEXT_ROUND` command; no new event types; no
   schema change. Diagnostics copies may remain.
2. **G2 (product):** make the public status detail truthful on the ordinary path.
   Minimal options, to be chosen by the repair lane within existing canon:
   - (a) presentation-side suppression of the `session-ready` detail once a round
     is current or the game has ended (mirrors the existing "Playing" cleanup);
     or
   - (b) host-side status-code transition on round entry and completion using
     the existing bounded vocabulary.

   PublicState schema 9 / sync 2 should remain unchanged unless the lane proves
   otherwise.
3. **Re-proof (tests):**
   - change `advanceToBoard` / `advanceToFinal` in the Q3 helpers and the
     H-REPAIR-1 focused-host spec to use the ordinary control, and assert the
     `host-advanced` section is never opened;
   - add real-flow Display assertions that "Waiting for the first round" is
     absent after round entry, during an open clue, and at completion;
   - re-run Q3, Q4, Q5 (browser + desktop).
4. **Optional, same branch (non-blocking hygiene):** replace
   `execFileSync('git')` in `tests/desktop/helpers/desktopLaunch.ts` (§8).

**Non-goals:**
- Host visual polish, panel restructuring, Controllers relocation.
- S05 presentation changes beyond G2 copy truthfulness.
- S04D/S06 work.
- Physical qualification.
- Owner playthrough.

**Definition of done:**
- G1/G2 repaired.
- Q3/Q4/Q5 packs green on an exact head with served-build provenance.
- `git diff --check`, `npm run verify`, `npm run verify:all`, and
  `npm run test:desktop` pass.
- Independent exact-head review.
- Landed on main.
- Q6 Court A re-run for the affected rows (CS-13, HG-01, HG-04, HG-09, HG-10,
  HG-12, DP-04, DP-05) before any Court B.

Non-blocking strengthening, eligible for separate later authorization:
- HL-10 served-build restore e2e.
- HL-06 Home Rename/Delete e2e.
- HG-14 chrome-mute click test.
- CS-07 kept-Session component test.
- Weak-assertion tightening.

---

## 11. Court B

**NOT RUN.** Court A is not COMPLETE. No recommendation is issued. The PRE-Q7
eligibility path is **stopped** until Q6-RP-1 is repaired, verified, landed, and
Court A is re-reviewed.

---

## 12. Hard-ban integrity (observed during Q6)

- No product code, tests, CSS, or design canon changed.
- No historian archive was created or modified. The scratch worktree is outside
  the repository tree and was not committed.
- S05 parent not terminalized; S04D/S06 not started.
- No physical Sony/projector/audio/Windows PASS claimed.
- No signed-release claim.
- No owner playthrough resumed.
- REAL MVP not claimed complete.
- The visual review grants no design-implementation authority.
- `OWNER-PLAYTHROUGH-ELIGIBLE` not issued.

## 13. Verification actually run for this record

- `git diff --check` on the Q6 docs diff (result recorded in the delivery PR).
- No `npm run verify` / `verify:all` / `test:desktop` run for this docs-only
  diff. The diff touches no code. Product-level verification is the observed CI
  on `d921b07…` (§1.1), not a Q6 run.
- Scratch browser capture (§6.1) ran the Q3 helper path successfully at
  `d921b07…` with the noted xlsx substitution. It is BROWSER-OBSERVED evidence,
  not a CI or served-build proof.

## 14. Non-claims

This record does not claim Q6 PASS, Court B recommendation, PRE-Q7 eligibility,
`OWNER-PLAYTHROUGH-ELIGIBLE`, Q7 start, S05 terminalization, REAL MVP
completion, physical or Windows qualification, signed release, or owner
acceptance. It does not predict its own delivery PR's merge state or squash SHA.
