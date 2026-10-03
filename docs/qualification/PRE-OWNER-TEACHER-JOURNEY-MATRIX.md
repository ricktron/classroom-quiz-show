# Pre-Owner Teacher Journey Matrix

- **Document id:** `PRE-OWNER-TEACHER-JOURNEY-MATRIX`
- **Program:** `CQS-REAL-MVP-1`
- **Authorization:** `AUTHORIZE-CQS-PRE-OWNER-Q0-QUALIFICATION-CONTRACT-1`
  (matrix registration); Q2 post-merge docs reconciliation:
  `AUTHORIZE-CQS-Q2-POST-MERGE-STARTUP-TRUTH-RECONCILIATION-1`;
  Q3 delivery:
  `AUTHORIZE-CQS-PRE-OWNER-Q3-CORE-GAMEPLAY-GOLDEN-PATHS-1`;
  Q4 delivery:
  `AUTHORIZE-CQS-PRE-OWNER-Q4-GAMEPLAY-BRANCH-FAILURE-MATRIX-1`
- **Kind:** teacher-journey interaction matrix for pre-owner functional qualification
- **Status:** **ACTIVE / Q0 LANDED; Q1 LANDED / VERIFIED ON MAIN** @
  `9d8246e9811eec19a34a9f8d44b2287b8635a741`; **Q2 LANDED / VERIFIED ON
  MAIN** @ `2dc918f934836c3fa6a0f4d554f4757f4668c691`; **Q3 LANDED / VERIFIED ON MAIN** @ `85bb951ead3ea7ed99a7f404f60bbebcb0d68cb7` (PR #127; reviewed tip `cf207cac7dd722a903f901cd885e35583439ed02`); **Q4 CANDIDATE-COMPLETE / VERIFIED ON PR #129** (qualification proof head
  `541718e1ad2788265678bb8178d043781718194a`; **NOT LANDED**); **Q5 NEXT /
  NOT AUTHORIZED**
- **Contract:** [`PRE-OWNER-FUNCTIONAL-QUALIFICATION.md`](PRE-OWNER-FUNCTIONAL-QUALIFICATION.md)
- **Q0 observation base:** `origin/main`
  `67ba2c0027f7e2439bd39bd963a7321be0ab6801`
- **Q1 verified PR tip:** `f5eeab30d525d175b9d615f966551a19f178ff4a`
  (exact-head CI bound here; PR #123)
- **Q1 squash/main:** `9d8246e9811eec19a34a9f8d44b2287b8635a741`
- **Q1 tree identity:** `8e59759af585a3b7764adb318a4cdb4bb6300690`
  (tip and squash trees identical — transfer justified)
- **Q2 authorization:**
  `AUTHORIZE-CQS-PRE-OWNER-Q2-MENUS-WORKFLOW-FUNCTIONAL-QUALIFICATION-1`
- **Q2 verified PR tip:** `aa3c18f7621c0d399730ad67045410168fbb2257`
  (exact-head CI bound here; PR #125)
- **Q2 squash/main:** `2dc918f934836c3fa6a0f4d554f4757f4668c691`
- **Q2 tree identity:** `229e8a013ab6b1880650f9a98e8e2857c4aa1cf1`
  (tip and squash trees identical — transfer justified; do not call the
  squash the tip)
- **Q3 authorization:**
  `AUTHORIZE-CQS-PRE-OWNER-Q3-CORE-GAMEPLAY-GOLDEN-PATHS-1`
- **Q3 delivery branch (historical):** `cursor/cqs-q3-core-gameplay-golden-paths-ba9f`
- **Q3 product repair tip (historical):** `0c91147276dead9c50968bdbab98f753187ff7bf`
  (R1–R6 Session-name Host propagation + real `lih-correct` adjudication)
- **Q4 authorization:**
  `AUTHORIZE-CQS-PRE-OWNER-Q4-GAMEPLAY-BRANCH-FAILURE-MATRIX-1`
- **Q4 delivery branch:** `cursor/cqs-q4-gameplay-branch-failure-matrix-1`
- **Q4 qualification proof head:** `541718e1ad2788265678bb8178d043781718194a`
  (PR #129; full CI SUCCESS; no product repair exposed)

```text
Documentation / qualification matrix. Q0/Q1/Q2/Q3 are LANDED on main. Q4
gameplay branch/failure qualification is CANDIDATE-COMPLETE / VERIFIED ON
PR #129 at qualification proof head `541718e1…`; Q4 is NOT LANDED. HG-13 is
closed on the Q4 candidate by authentic started-Session branch/recovery proof.
Q5 is NEXT / NOT AUTHORIZED. PHYSICAL SONY NOT RUN.
Golden paths = Q3; branch/failure = Q4; Electron = Q5; owner feel = Q7.
PRE-Q7 (DevPM) issues eligibility after Q0–Q6; Q7 does not. Functional
escapes / blockers may not be waived through PRE-Q7.
```

---

## 1. Column legend

| Column | Meaning |
| --- | --- |
| **ID** | Stable row id |
| **Interaction** | Teacher-facing control / job |
| **Success (semantic)** | What “worked” means (not mere visibility) |
| **Current proof** | Best existing automated or physical evidence on tip |
| **Evidence class** | Per contract taxonomy |
| **Disposition** | Exactly **one** primary tag: `RETAIN` / `STRENGTHEN` / `REPLACE` / `NEW` / `PHYSICAL-ONLY` / `OWNER-ONLY` |
| **Q stage** | Earliest stage that must address the row (may list secondary stages) |
| **Gap / note** | Escape, limit, or secondary need (never a second Disposition tag) |

Disposition meanings (one primary per row; do **not** compound tags in the Disposition cell):

| Tag | Meaning |
| --- | --- |
| **RETAIN** | Keep suite/row as-is for regression |
| **STRENGTHEN** | Keep family; deepen to semantic success |
| **REPLACE** | Current proof misleads; redesign proof |
| **NEW** | Missing ordinary-path proof |
| **PHYSICAL-ONLY** | Cannot close in CI; needs named hardware |
| **OWNER-ONLY** | Requires owner walkthrough judgment (feel/terminology/fit) |

Secondary needs (extra STRENGTHEN, sim vs physical, Q1 path targets, residual
classification) go in **Evidence class**, **Q stage**, or **Gap / note** only.

---

## 2. HOME / LIBRARY

| ID | Interaction | Success (semantic) | Current proof | Evidence class | Disposition | Q stage | Gap / note |
| --- | --- | --- | --- | --- | --- | --- | --- |
| HL-01 | Cold launch → Home | Private Home visible; no silent session auto-resume | `routes`, `teacher-first-run`, desktop `shell` Resume | AUTOMATED E2E / DESKTOP E2E | RETAIN | Q2/Q5 | Shell ≠ full teacher path |
| HL-02 | New Game | Creates draft/game → authoring | `menus-q2-a-new-game-play-setup` (+ CD board-first) | AUTOMATED E2E | RETAIN | Q2 | Q2-A closed New Game→usable→Play→Class Setup on main @ `2dc918f…`; empty-library feel OWNER-ONLY |
| HL-03 | Import Game (demo / paste / xlsx) | Valid save to library; fail-closed on bad input | `menus-q2-b-home-import` + `menus-q2-ai04-home-spreadsheet` (+ Host `import-pipeline`) | AUTOMATED E2E / UNIT | RETAIN | Q2 | Home JSON + Home spreadsheet ordinary path closed on main; #110 untouched |
| HL-04 | Import Quality / salvage Keep | Primary status honest; salvage usable | H4 e2e/unit; LOW collapsed-detail escape OPEN | AUTOMATED E2E | RETAIN | Q6 / PRE-Q7 | Accepted **OPEN / LOW** **NON-FUNCTIONAL** residual (collapsed **More detail about this file** after Keep may still deny save). Primary status line is the durable outcome. **Not** a Q1 product escape / ordinary functional blocker unless reclassified. May remain visible at eligibility under that class only — does **not** establish a general functional-defect waiver |
| HL-05 | My Games / Recent Play | `playable` only; lands `?play=` → Class Setup | `classroom-setup`, `menus-q2-a` / `menus-q2-b` | AUTOMATED E2E | RETAIN | Q2 | `?play=` + Ready strengthen closed on classroom-setup (main) |
| HL-06 | Edit / Duplicate / Export / Delete / Rename | Library ops preserve Game/Session isolation | portable/export + library unit; `menus-q2-c` Duplicate | MIXED | RETAIN | Q2 | Q2-C Duplicate + draft coexistence closed on main; Rename/Delete residual thin |
| HL-07 | Resume class / Start fresh | One Host gate; Start fresh keeps library | `persistence-recovery`, desktop shell | AUTOMATED E2E / DESKTOP | RETAIN | Q2 | Mid-setup abandon ≠ session recovery |
| HL-08 | Open Display (Home) | Audience opens; no Host-private leak | `menus-q2-p-home-display` (+ projector-safety) | AUTOMATED E2E | RETAIN | Q2 | Web same-tab Display privacy proved on main |
| HL-09 | Open classroom controls → bare `#/host` | Power path; must not be marketed as ordinary | `menus-slice-a-host-posture` | AUTOMATED E2E | RETAIN | Q2 | Ordinary funnel uses `?play=` |
| HL-10 | Backup & restore | Export/import backup without content loss | `backup-restore`, `backup-idb-atomicity` | AUTOMATED E2E | RETAIN | Q5 | Not cold-launch primary |
| HL-11 | Multi-game + draft confusion | Teacher distinguishes ready vs draft | `menus-q2-c-multi-game-draft` | AUTOMATED E2E | RETAIN | Q2 | Resume vs Play vs Continue under recovery closed on main |
| HL-12 | Empty library next action | One clear next action | Partial CD e2e | AUTOMATED E2E | OWNER-ONLY | Q7 | Feel/IA judgment remains OWNER-ONLY / Q7; partial empty-Home/CD automation was retained through landed Q2 and is not an unresolved Q2 strengthen item |

---

## 3. AUTHORING / IMPORT

| ID | Interaction | Success (semantic) | Current proof | Evidence class | Disposition | Q stage | Gap / note |
| --- | --- | --- | --- | --- | --- | --- | --- |
| AI-01 | Board-first New Game | Lands content work; Game settings closed | `menus-slice-cd-home-authoring` | AUTOMATED E2E | RETAIN | Q2 | |
| AI-02 | Game settings team count | Set 1–8; add/remove teams; save trust | Slice E / I-REPAIR zero-team; authoring unit; Q1 disposable Fix return | AUTOMATED E2E / UNIT | RETAIN | Q1 closed / Q2 closed | Finding B closed by Q1 (individual Q1 closure was not itself Q2 PASS); broader MENUS contextual-return coverage closed by Q2 on main @ `2dc918f…` |
| AI-03 | Clue / Final authoring | Completes playable Game | `spreadsheet-authoring`, teacher-home | AUTOMATED E2E | RETAIN | Q2 | |
| AI-04 | Spreadsheet templates | Download+import from intended surface | `menus-q2-ai04-home-spreadsheet` (+ Host panel RETAIN) | AUTOMATED E2E | RETAIN | Q2 | Home Board+Final download + completed workbook import → Play → Class Setup closed on main; blank template not playable; #110 untouched |
| AI-05 | Portable pack round-trip | Export/import preserves playable Game | `portable-packs`, `portable-export` | AUTOMATED E2E | RETAIN | Q2 | |
| AI-06 | Play from authoring | `?play=` → Class Setup for playable Game | `menus-q2-a-new-game-play-setup` | AUTOMATED E2E | RETAIN | Q2 | Authoring Play → `?play=` Class Setup closed on main |
| AI-07 | Validation / save status | Honest Saved / blocked playable | authoring e2e + unit | AUTOMATED E2E | RETAIN | Q2 | |

---

## 4. CLASS SETUP

| ID | Interaction | Success (semantic) | Current proof | Evidence class | Disposition | Q stage | Gap / note |
| --- | --- | --- | --- | --- | --- | --- | --- |
| CS-01 | Enter via Home Play | Setup posture; five rows Buzzers→…→Sound | Scenario D, B+F, classroom-setup | AUTOMATED E2E | RETAIN | Q2 | Order fixed by I-REPAIR-1 |
| CS-02 | Row selection grammar | Click selects; re-click keeps open; readiness ≠ selection | Scenario D + panel unit | AUTOMATED E2E / UNIT | RETAIN | Q2 | Owner D was BLOCKED pre-repair |
| CS-03 | Buzzers Skip (no hardware) | Skip advances; Start not gated by Buzzers | Scenario D / B+F / readiness unit | AUTOMATED E2E / UNIT | RETAIN | Q2 | |
| CS-04 | Buzzers Check (hardware present) | Not Skip-only; Check reveals live setup; **teacher-visible connect/press confirmation** | Q1 Scenario D e2e: Check → SBS `testMode` + sim press → `sbs-test-outcome` / responding layer (SIMULATED) | AUTOMATED E2E (SIMULATED) | RETAIN | Q1 closed | **Finding A CLOSED BY Q1** on main @ `9d8246e…` (individual Q1 closure was not itself Q2 PASS). **PHYSICAL SONY NOT RUN.** |
| CS-05 | Sony physical connect / names via buzzers | Handsets claim names; UI confirms | H5/H6 PHYSICAL TRANSFERRED (older identity); sim Sony e2e | PHYSICAL / SIM E2E | PHYSICAL-ONLY | PHYSICAL (not Q5) | Physical ≠ Electron Q5 PASS. Sim ≠ physical; re-qual if posture changed. Secondary: CS-10 sim colour-press naming at Q1 closed (SIMULATED) |
| CS-06 | Teams blocked (0-team) | Teams+Names blocked; Fix team count visible | zero-team fix + Slice E | AUTOMATED E2E | RETAIN | Q2 | |
| CS-07 | Fix team count contextual return | After save, **direct Class Setup return** when disposable; meaningful Session fail-closed; Open settings non-destructive; roster-drift replace confirm | Q1: disposable Fix → direct Class Setup (zero-team / Slice E); Open settings + 2→3 roster-drift replace confirm (`menus-q1-open-settings-names-preserve`) | AUTOMATED E2E | RETAIN | Q1 closed / Q2 closed | **Finding B CLOSED BY Q1** on main @ `9d8246e…` (disposable gate + direct return + meaningful Session + 2→3 replace; individual Q1 closure was not itself Q2 PASS). Broader MENUS contextual-return coverage closed by Q2 on main @ `2dc918f…` |
| CS-08 | Controller count ≠ team count | Copy distinguishes 1–8 Game teams vs buzzers | Scenario D / panel unit | AUTOMATED E2E / UNIT | RETAIN | Q2 | Do not change 1–8→1–4 |
| CS-09 | Names keyboard fill | Unique names → Ready/Start enabled | `menus-q2-setup-host-journeys` (+ Scenario D / H keyboard) | AUTOMATED E2E | RETAIN | Q2 | Keyboard-only class → Ready → Start closed on main (no Sony path) |
| CS-10 | Names via simulated Sony | Colour-button **claim** (and guidance) with supported sim profile; keyboard/manual fill remains operable | `menus-slice-h-names-sim-sony` — authentic `pressSimulatedGamepadButton` + `buttonIndexForSlotColor` colour-press **claim** (SIMULATED) | AUTOMATED E2E (SIMULATED) | RETAIN | Q1 closed | **Actual colour-claim SIMULATED** on main @ `9d8246e…` (individual Q1 closure was not itself Q2 PASS). Guidance + keyboard retained. **PHYSICAL SONY NOT RUN.** |
| CS-11 | Display Open from setup | Display opens; optional for Start | Scenario D / B+F | AUTOMATED E2E | RETAIN | Q2 | |
| CS-12 | Sound Test | Test works; optional for Start | `menus-q2-setup-host-journeys` | AUTOMATED E2E | RETAIN | Q2 | Class Setup Test sound → Sound tested; Start remains enabled (main) |
| CS-13 | Start / Play → focused Host | Setup unmounts; focused Host first viewport | Scenario D, H-REPAIR-1 focused host | AUTOMATED E2E | RETAIN | Q2 | |
| CS-14 | Ready + optionals matrix | Start sole dominant when required met; optionals don’t revoke | B+F readiness | AUTOMATED E2E | RETAIN | Q2 | |
| CS-15 | Viewport / eight-team fit | Ready usable without destructive overflow | `menus-bf-viewport` | AUTOMATED E2E | RETAIN | Q2 | Laptop feel OWNER-ONLY |
| CS-16 | Mid-setup refresh / abandon | Honest restore of partial setup | `menus-q2-m-mid-setup-refresh` | AUTOMATED E2E | RETAIN | Q2 | Incomplete names → refresh → Resume → setup closed on main; Skip ephemeral OK |
| CS-17 | Class Setup owner feel / terminology | Ordinary teacher language; no remount jargon | I-REPAIR-1 copy cleanup; Slice I A–C polish | OWNER-OBSERVED | OWNER-ONLY | Q7 | Re-gate after PRE-Q7 eligibility |

---

## 5. HOST / GAMEPLAY

| ID | Interaction | Success (semantic) | Current proof | Evidence class | Disposition | Q stage | Gap / note |
| --- | --- | --- | --- | --- | --- | --- | --- |
| HG-01 | Focused Host after Start | Board/timer/local input authority without setup chrome | `menus-h-repair-1-focused-host` (+ Q2 H/L; Q3 golden entry) | AUTOMATED E2E | RETAIN | Q2 / Q3 | Q2 Start→focused Host RETAIN on main; Q3 composes board→Final→completion after authentic Start |
| HG-02 | Back to setup | Returns Class Setup; no invented Session events | `menus-q2-setup-host-journeys` (+ Slice A) | AUTOMATED E2E | RETAIN | Q2 | Back → Start again → focused Host closed on main |
| HG-03 | Change Game | Identity clear; replace confirms when required | `menus-slice-g-change-game` | AUTOMATED E2E | RETAIN | Q2 | |
| HG-04 | Category-board select / reveal | Host private; Display public boardOutcome | category-board, S05 board packs + `menus-q3-core-gameplay-golden-paths` | AUTOMATED E2E | RETAIN | Q3 | Q3 composition proves select/reveal + public Correct on authentic Session |
| HG-05 | Buzz / active claim | Choreography + privacy | S05 buzz e2e + Q3 golden (keyboard + SIMULATED Sony) | AUTOMATED E2E | RETAIN | Q3 | Physical buzz PHYSICAL-ONLY (not silent Q5); Q3 SIMULATED claim labeled |
| HG-06 | Correct / incorrect / score | Path S-C static authoritative scores | S05 outcome packs; teams-scoring + Q3 golden exact scores | AUTOMATED E2E | RETAIN | Q3 | Exact 100→150 scores on golden Session |
| HG-07 | Timers / arming | Arm/transition honesty | `timers-arming` + Q3 golden | AUTOMATED E2E | RETAIN | Q3 | Arm + timer on authentic Session |
| HG-08 | Keyboard buzz fallback | Usable without controllers | `buzz-in` + Q3 keyboard golden | AUTOMATED E2E | RETAIN | Q3 | Keyboard path on Home→… Session |
| HG-09 | Final wager lifecycle | Wager → reveal → settlement | `final-wager` + Q3 golden | AUTOMATED E2E | RETAIN | Q3 | Classic Final on authentic Session |
| HG-10 | Completion / winner / tie | Completion-only winner; remount-safe | audience-display final tests + Q3 golden | AUTOMATED E2E | RETAIN | Q3 | Winner only after explicit complete |
| HG-11 | Session summary | Host summary; Display sanitized | `session-summary` + Q3 golden | AUTOMATED E2E | RETAIN | Q3 | Summary Host-only after completion; durable Summary V1 keeps authored teamName (ADR-016); Session names at current-session panel presentation only |
| HG-12 | **Integrated golden path** | Home→setup→Play→board→Final→completion on one served build; Session names Host+Display; real `lih-correct` | `menus-q3-core-gameplay-golden-paths` | AUTOMATED E2E | RETAIN | Q3 | Finding C CLOSED ON MAIN BY Q3 @ `85bb951…` |
| HG-13 | Undo / recovery mid-game | Safe resume without private leak | `menus-q4-gameplay-branch-failure-matrix` + retained persistence/buzz/timer/Final suites | AUTOMATED E2E | RETAIN | Q4 | **CLOSED ON Q4 CANDIDATE** @ `541718e1…`: incorrect queue → undo → explicit Resume → Host/Display reconvergence/privacy; stale timer rejection; mid-Final Resume → tie branch → safe completion |
| HG-14 | More / diagnostics / mute | Sanitized diagnostics; panic mute | diagnostic-report; classroom-setup mute | AUTOMATED E2E / DESKTOP | RETAIN | Q5 | Electron/desktop family |
| HG-15 | Whole-game owner playthrough | Classroom feel across full game | STATUS: **NOT RUN**; **PAUSED/GATED** | OWNER-ONLY | OWNER-ONLY | Q7 | Requires PRE-Q7 eligibility; Q7 does not issue it |

---

## 6. DISPLAY

| ID | Interaction | Success (semantic) | Current proof | Evidence class | Disposition | Q stage | Gap / note |
| --- | --- | --- | --- | --- | --- | --- | --- |
| DP-01 | Open / reopen Display | Second window/tab; `cqs://app#/display` or web `#/display` | shell + audience-display | DESKTOP / E2E | RETAIN | Q5 | |
| DP-02 | Fail closed / projector safety | No Host-private answers/notes | `projector-safety`, sync | AUTOMATED E2E | RETAIN | Q2/Q5 | |
| DP-03 | Board / clue readability | F1 stress foundations | S05-F1 e2e (+ Q3 Display board stage) | AUTOMATED E2E | RETAIN | Q3 | Physical projector PHYSICAL-ONLY (not silent Q5) |
| DP-04 | Buzz / outcome choreography | Public authority only | S05 presentation packs + Q3 golden | AUTOMATED E2E | RETAIN | Q3 | Q3 integrated Host→Display publish (no injectPublicState) |
| DP-05 | Final / winner public | Completion-only; no private wager leak | S05 final + audience + Q3 golden | AUTOMATED E2E | RETAIN | Q3 | Q3 privacy checkpoints through Final/complete |
| DP-06 | Visual convergence / historian | Archive appearance at milestone SHA | visual-history suites; historian gate | HISTORICAL / E2E | RETAIN | — | Immutable archives; not acceptance |
| DP-07 | Physical projector / sleep | Placement + wake recovery | S04C foundation; physical **NOT RUN** broadly | PHYSICAL PROJECTOR | PHYSICAL-ONLY | S06 later | Not authorized now |
| DP-08 | Owner Display feel | Theatrical vs Host restrained | OWNER-ONLY | OWNER-ONLY | OWNER-ONLY | Q7 | |

---

## 7. Suite disposition register (authoritative main `d65a770…` + Q4 candidate PR #129)

Q0 registered dispositions against `67ba2c0…`. Q1 (PR #123) closed Scenario-D
escapes (individual Q1 closure was **not** itself Q2 PASS). Q2 (PR #125)
closed MENUS workflow packs on main. Q3 (PR #127) composes HG-12 and is LANDED /
VERIFIED ON MAIN @ `85bb951…`. PR #128 then advanced docs/governance-only main to
`d65a770…` without changing the Q3 gameplay tree. Q4 PR #129 adds the bounded
branch/failure composition pack; qualification proof head `541718e1…` passed full
CI and exposed no product-code repair.

| Suite | Disposition | Notes |
| --- | --- | --- |
| `menus-i-repair-1-scenario-d.spec.ts` | **RETAIN** (Q1 closed) | Check → SBS testMode + sim press confirmation (Finding A). **PHYSICAL SONY NOT RUN.** Individual Q1 closure was not itself Q2 PASS |
| `menus-i-repair-1-zero-team-fix.spec.ts` | **RETAIN** (Q1 closed) | Disposable Fix → direct Class Setup return (Finding B). Individual Q1 closure was not itself Q2 PASS |
| `menus-slice-e-team-sony.spec.ts` | **RETAIN** (Q1 closed) | Same Fix-return invariant as zero-team sibling. Individual Q1 closure was not itself Q2 PASS |
| `menus-slice-h-names-sim-sony.spec.ts` | **RETAIN** (Q1 closed) | Colour-press **claim** SIMULATED + keyboard/manual fill; not physical. Individual Q1 closure was not itself Q2 PASS |
| `menus-q1-open-settings-names-preserve.spec.ts` | **RETAIN** (Q1 closed) | Open settings non-destructive; meaningful Session preserve; 2→3 roster-drift replace confirm. Individual Q1 closure was not itself Q2 PASS |
| `menus-bf-readiness.spec.ts` | **RETAIN** | Ready/optional matrix |
| `menus-bf-viewport.spec.ts` | **RETAIN** | Fit stress |
| `menus-slice-a-host-posture.spec.ts` | **RETAIN** | Posture / bare Host |
| `menus-slice-cd-home-authoring.spec.ts` | **RETAIN** | Home/authoring; Q2-A/B/C sibling packs close STRENGTHEN residuals |
| `menus-slice-g-change-game.spec.ts` | **RETAIN** | Change Game |
| `menus-h-repair-1-focused-host.spec.ts` | **RETAIN** | Start → focused Host |
| `menus-historian-gate.spec.ts` | **RETAIN** | Gate only; not acceptance |
| `menus-visual-history-capture.spec.ts` | **RETAIN** | Capture when authorized; immutable |
| `classroom-setup.spec.ts` | **RETAIN** | Home Play → setup + keyboard Ready (Q2 strengthen closed) |
| `teacher-home-authoring.spec.ts` / `teacher-first-run.spec.ts` / `routes.spec.ts` | **RETAIN** | Home reachability — Q2 residual packs cover Play funnel |
| `persistence-recovery.spec.ts` | **RETAIN** | Session recovery |
| `menus-q2-a-new-game-play-setup.spec.ts` | **RETAIN** (Q2 closed) | Q2-A New Game → usable → Play → Class Setup |
| `menus-q2-b-home-import.spec.ts` | **RETAIN** (Q2 closed) | Q2-B Home import valid + fail-closed |
| `menus-q2-ai04-home-spreadsheet.spec.ts` | **RETAIN** (Q2 closed) | AI-04 Home Board+Final download + completed workbook → Play → setup |
| `menus-q2-c-multi-game-draft.spec.ts` | **RETAIN** (Q2 closed) | Q2-C multi-game / draft / recovery |
| `menus-q2-setup-host-journeys.spec.ts` | **RETAIN** (Q2 closed) | Q2-H keyboard Names + Q2-I Sound Test + Q2-L Back→Start |
| `menus-q2-m-mid-setup-refresh.spec.ts` | **RETAIN** (Q2 closed) | Q2-M / CS-16 mid-setup refresh |
| `menus-q2-p-home-display.spec.ts` | **RETAIN** (Q2 closed) | Q2-P Home Open Display privacy |
| `gamepad-input.spec.ts` | **RETAIN** | Sim only; label PHYSICAL-ONLY for real hardware; Q1 shared helper reuse |
| `final-wager.spec.ts` / `session-summary.spec.ts` / `completed-summary-ledger.spec.ts` | **RETAIN** | Fragments for Q3 golden compose |
| S05 `s05-*-*.spec.ts` (F1, buzz, board, final, visual) | **RETAIN** | Presentation children; not integrated golden |
| `audience-display.spec.ts` / `projector-safety.spec.ts` / display-visual-* | **RETAIN** | Display privacy/choreography |
| `tests/desktop/shell.spec.ts` | **RETAIN** | Shell only — Finding D / Q5; do not cite as golden path |
| `buzz-in` / `category-board` / `teams-scoring` / `timers-arming` / `presentation-audio` / `theme-system` / `sync` / `media-contract` / `import-pipeline` / portable / backup / diagnostic / pwa / aggregate-reset / spreadsheet | **RETAIN** | Foundation regression |
| `menus-q3-core-gameplay-golden-paths.spec.ts` | **RETAIN** | Finding C CLOSED ON MAIN BY Q3 @ `85bb951…` — keyboard + SIMULATED Sony + Host/Display |
| Integrated Home→…→completion pack | **RETAIN** | Finding C CLOSED ON MAIN BY Q3 @ `85bb951…` |
| `menus-q4-gameplay-branch-failure-matrix.spec.ts` | **RETAIN** (Q4 candidate) | HG-13 + representative branch/failure composition on authentic Sessions; proof head `541718e1…`; full CI SUCCESS; no product repair exposed |
| Physical Sony re-qual on `2dc918f…` | **PHYSICAL-ONLY** | Q1/Q2 **NOT RUN**; H5/H6 transferred under older identity; **not** silent Q5 PASS |
| Windows physical runtime | **PHYSICAL-ONLY** | S06; **NOT AUTHORIZED**; **not** silent Q5 PASS |
| Owner MENUS / S05 playthrough | **OWNER-ONLY** | **PAUSED / GATED** — PRE-Q7 eligibility not issued; Q7 does not issue it |

---

## 8. Court plan Q6 A + Q6 B (matrix view)

### Court A — Evidence completeness checklist

Before recommending eligibility, Court A walks **every row in §§2–6** and verifies one of:

1. Disposition **RETAIN** with cited exact-head proof still valid; or
2. **STRENGTHEN/REPLACE/NEW** closed by later Q1–Q5 repair/proof receipt; or
3. Explicit **PHYSICAL-ONLY** / **OWNER-ONLY** / accurately classified
   **NON-FUNCTIONAL RESIDUAL** (usability/polish or honestly NOT-RUN physical)
   with owner-visible residual — **not** an unresolved ordinary-path functional
   blocker.

Fail closed if any ordinary-path **functional** blocker remains unresolved.
Functional blockers may **not** be waived through PRE-Q7.

### Court B — Eligibility recommendation checklist

1. Court A COMPLETE (no unresolved ordinary-path functional blocker);
2. Findings A–B **closed by Q1 repair/proof** on main @ `9d8246e…`
   (SIMULATED where labeled; physical Sony **NOT RUN**); Finding C **CLOSED ON Q3
   CANDIDATE**; Finding D **RETAIN / Q5**; remaining functional items need
   evidence-backed closure — **no** owner waiver for functional closure;
3. No smuggled S04D/S06/S05-terminal claims;
4. STATUS/CURRENT agree with contract;
5. Remaining visible issues = usability/polish or honestly NOT-RUN physical —
   **not** known functional blockers;
6. Output **RECOMMEND ELIGIBLE** or **HOLD** — never self-issue
   `OWNER-PLAYTHROUGH-ELIGIBLE` (**DevPM PRE-Q7 verdict** after Q6; **Q7
   does not**).

---

## 9. Non-claims

This matrix does **not**:

- claim Q4 **LANDED** or Q5–Q7 execution / PASS;
- issue `OWNER-PLAYTHROUGH-ELIGIBLE`;
- mark S05 terminal or REAL MVP complete;
- claim Q1/Q2/Q3 physical Sony PASS;
- treat `shell.spec.ts` as teacher golden-path proof;
- mutate PR #110 / #118;
- rewrite individual Q1 closure as if it were itself Q2 PASS;
- start Q5, Q6, PRE-Q7, Q7/owner playthrough, S05 terminalization, S04D, or S06.

```text
Q0 MATRIX LANDED
Q1 LANDED / VERIFIED ON MAIN @ 9d8246e… (PR #123); PHYSICAL SONY NOT RUN
Q2 LANDED / VERIFIED ON MAIN @ 2dc918f… (PR #125); tip aa3c18f…; tree 229e8a0…; PHYSICAL SONY NOT RUN
Q3 LANDED / VERIFIED ON MAIN @ 85bb951… (PR #127; reviewed tip cf207ca…); PHYSICAL SONY NOT RUN
Q4: CANDIDATE-COMPLETE / VERIFIED ON PR #129 @ 541718e1…; NOT LANDED
Q5–Q6: NOT STARTED / NOT AUTHORIZED
owner playthrough: PAUSED / GATED (Q0–Q6 + PRE-Q7 eligibility)
Findings A/B: CLOSED BY Q1 (SIMULATED where labeled); individual Q1 ≠ Q2 PASS
Finding C: CLOSED ON MAIN BY Q3 @ 85bb951… (HG-12); Finding D: RETAIN / Q5
PRE-Q7 OWNER-PLAYTHROUGH-ELIGIBLE: NOT ISSUED (DevPM verdict after Q6)
Q7 does not issue eligibility
functional blockers: no owner-waiver escape hatch through PRE-Q7
```
