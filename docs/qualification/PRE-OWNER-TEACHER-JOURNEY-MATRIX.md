# Pre-Owner Teacher Journey Matrix

- **Document id:** `PRE-OWNER-TEACHER-JOURNEY-MATRIX`
- **Program:** `CQS-REAL-MVP-1`
- **Authorization:** `AUTHORIZE-CQS-PRE-OWNER-Q0-QUALIFICATION-CONTRACT-1`
- **Kind:** teacher-journey interaction matrix for pre-owner functional qualification
- **Status:** **ACTIVE / Q0 MATRIX REGISTERED**
- **Contract:** [`PRE-OWNER-FUNCTIONAL-QUALIFICATION.md`](PRE-OWNER-FUNCTIONAL-QUALIFICATION.md)
- **Observation base:** `origin/main`
  `67ba2c0027f7e2439bd39bd963a7321be0ab6801`

```text
Documentation only. No product/test mutation authorized.
Dispositions guide later Q1–Q7 / PRE-Q7 work; they do not start it.
Semantic control and contextual return are requirements inside Q1/Q2 —
not separate stages. Golden paths = Q3; branch/failure = Q4; Electron = Q5;
owner feel = Q7; physical evidence is separate (not silent Q5 PASS).
PRE-Q7 (DevPM) issues eligibility after Q0–Q6; Q7 does not.
Functional escapes / blockers may not be waived through PRE-Q7.
PRE-Q7 is a DevPM verdict, not a new numbered stage / separate owner auth.
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
| HL-02 | New Game | Creates draft/game → authoring | `menus-slice-cd-home-authoring`, `teacher-home-authoring` | AUTOMATED E2E | STRENGTHEN | Q2 | Empty-library dominance OWNER-ONLY polish |
| HL-03 | Import Game (demo / paste / xlsx) | Valid save to library; fail-closed on bad input | `import-pipeline`, Home authoring e2e, H4 unit | AUTOMATED E2E / UNIT | STRENGTHEN | Q2 | Template download still Host-split (#110 harvest separate) |
| HL-04 | Import Quality / salvage Keep | Primary status honest; salvage usable | H4 e2e/unit; LOW collapsed-detail escape OPEN | AUTOMATED E2E | RETAIN | Q6 / PRE-Q7 | Accepted **OPEN / LOW** **NON-FUNCTIONAL** residual (collapsed **More detail about this file** after Keep may still deny save). Primary status line is the durable outcome. **Not** a Q1 product escape / ordinary functional blocker unless reclassified. May remain visible at eligibility under that class only — does **not** establish a general functional-defect waiver |
| HL-05 | My Games / Recent Play | `playable` only; lands `?play=` → Class Setup | `classroom-setup`, menus helpers | AUTOMATED E2E | STRENGTHEN | Q2 | `HomeRoute.test` weak on Play button |
| HL-06 | Edit / Duplicate / Export / Delete / Rename | Library ops preserve Game/Session isolation | portable/export + library unit; partial e2e | MIXED | STRENGTHEN | Q2 | Multi-game confusion scenario weak |
| HL-07 | Resume class / Start fresh | One Host gate; Start fresh keeps library | `persistence-recovery`, desktop shell | AUTOMATED E2E / DESKTOP | RETAIN | Q2 | Mid-setup abandon ≠ session recovery |
| HL-08 | Open Display (Home) | Audience opens; no Host-private leak | `audience-display`, projector-safety fragments | AUTOMATED E2E | RETAIN | Q2 | Ordinary path prefers setup Display |
| HL-09 | Open classroom controls → bare `#/host` | Power path; must not be marketed as ordinary | `menus-slice-a-host-posture` | AUTOMATED E2E | RETAIN | Q2 | Ordinary funnel uses `?play=` |
| HL-10 | Backup & restore | Export/import backup without content loss | `backup-restore`, `backup-idb-atomicity` | AUTOMATED E2E | RETAIN | Q5 | Not cold-launch primary |
| HL-11 | Multi-game + draft confusion | Teacher distinguishes ready vs draft | Fragmentary Home tests | AUTOMATED E2E | NEW | Q2 | Slice H intent; still weak integrated |
| HL-12 | Empty library next action | One clear next action | Partial CD e2e | AUTOMATED E2E | OWNER-ONLY | Q7 | Feel/IA owner judgment. Secondary: STRENGTHEN partial CD automation at Q2 |

---

## 3. AUTHORING / IMPORT

| ID | Interaction | Success (semantic) | Current proof | Evidence class | Disposition | Q stage | Gap / note |
| --- | --- | --- | --- | --- | --- | --- | --- |
| AI-01 | Board-first New Game | Lands content work; Game settings closed | `menus-slice-cd-home-authoring` | AUTOMATED E2E | RETAIN | Q2 | |
| AI-02 | Game settings team count | Set 1–8; add/remove teams; save trust | Slice E / I-REPAIR zero-team; authoring unit | AUTOMATED E2E / UNIT | STRENGTHEN | Q1/Q2 | Return path = Finding B (team-count = Q1+Q2, not Q3) |
| AI-03 | Clue / Final authoring | Completes playable Game | `spreadsheet-authoring`, teacher-home | AUTOMATED E2E | RETAIN | Q2 | |
| AI-04 | Spreadsheet templates | Download+import from intended surface | Host spreadsheet panel e2e | AUTOMATED E2E | STRENGTHEN | Q2 | #110 draft harvest — do not mutate #110 in Q0 |
| AI-05 | Portable pack round-trip | Export/import preserves playable Game | `portable-packs`, `portable-export` | AUTOMATED E2E | RETAIN | Q2 | |
| AI-06 | Play from authoring | `?play=` → Class Setup for playable Game | Slice E / zero-team fix path | AUTOMATED E2E | STRENGTHEN | Q2 | Authoring→Play is MENUS Q2; couples to Q1/Q2 contextual return |
| AI-07 | Validation / save status | Honest Saved / blocked playable | authoring e2e + unit | AUTOMATED E2E | RETAIN | Q2 | |

---

## 4. CLASS SETUP

| ID | Interaction | Success (semantic) | Current proof | Evidence class | Disposition | Q stage | Gap / note |
| --- | --- | --- | --- | --- | --- | --- | --- |
| CS-01 | Enter via Home Play | Setup posture; five rows Buzzers→…→Sound | Scenario D, B+F, classroom-setup | AUTOMATED E2E | RETAIN | Q2 | Order fixed by I-REPAIR-1 |
| CS-02 | Row selection grammar | Click selects; re-click keeps open; readiness ≠ selection | Scenario D + panel unit | AUTOMATED E2E / UNIT | RETAIN | Q2 | Owner D was BLOCKED pre-repair |
| CS-03 | Buzzers Skip (no hardware) | Skip advances; Start not gated by Buzzers | Scenario D / B+F / readiness unit | AUTOMATED E2E / UNIT | RETAIN | Q2 | |
| CS-04 | Buzzers Check (hardware present) | Not Skip-only; Check reveals live setup; **teacher-visible connect/press confirmation** | Scenario D clicks Check + profile visible; unit calls callback | AUTOMATED E2E / UNIT | STRENGTHEN | Q1/Q2 | **Finding A** — scroll/focus ≠ confirmation |
| CS-05 | Sony physical connect / names via buzzers | Handsets claim names; UI confirms | H5/H6 PHYSICAL TRANSFERRED (older identity); sim Sony e2e | PHYSICAL / SIM E2E | PHYSICAL-ONLY | PHYSICAL (not Q5) | Physical ≠ Electron Q5 PASS. Sim ≠ physical; re-qual if posture changed. Secondary: STRENGTHEN sim colour-press naming (CS-10) at Q2 |
| CS-06 | Teams blocked (0-team) | Teams+Names blocked; Fix team count visible | zero-team fix + Slice E | AUTOMATED E2E | RETAIN | Q2 | |
| CS-07 | Fix team count contextual return | After save, **direct Class Setup return** (Q1 target) | Current proves Resume+replace path | AUTOMATED E2E | REPLACE | Q1/Q2 | **Finding B** — current Resume+replace is honest regression until Q1 lands direct return; Q2 proves MENUS contextual return |
| CS-08 | Controller count ≠ team count | Copy distinguishes 1–8 Game teams vs buzzers | Scenario D / panel unit | AUTOMATED E2E / UNIT | RETAIN | Q2 | Do not change 1–8→1–4 |
| CS-09 | Names keyboard fill | Unique names → Ready/Start enabled | Scenario D, H names sim (keyboard path), panel unit | AUTOMATED E2E | STRENGTHEN | Q2 | Full keyboard-only class still weak; H names sim proves keyboard fill, not colour-press claim |
| CS-10 | Names via simulated Sony | Colour-button **guidance** visible with supported sim profile; keyboard/manual fill remains operable | `menus-slice-h-names-sim-sony` | AUTOMATED E2E | STRENGTHEN | Q2 | Suite proves guidance copy + keyboard/manual fill only — **not** simulated colour-button team-name claim. Gap: colour-press naming unproven |
| CS-11 | Display Open from setup | Display opens; optional for Start | Scenario D / B+F | AUTOMATED E2E | RETAIN | Q2 | |
| CS-12 | Sound Test | Test works; optional for Start | Scenario D / presentation-audio fragments | AUTOMATED E2E | STRENGTHEN | Q2 | |
| CS-13 | Start / Play → focused Host | Setup unmounts; focused Host first viewport | Scenario D, H-REPAIR-1 focused host | AUTOMATED E2E | RETAIN | Q2 | |
| CS-14 | Ready + optionals matrix | Start sole dominant when required met; optionals don’t revoke | B+F readiness | AUTOMATED E2E | RETAIN | Q2 | |
| CS-15 | Viewport / eight-team fit | Ready usable without destructive overflow | `menus-bf-viewport` | AUTOMATED E2E | RETAIN | Q2 | Laptop feel OWNER-ONLY |
| CS-16 | Mid-setup refresh / abandon | Honest restore of partial setup | **Missing** | — | NEW | Q2 | Session recovery ≠ setup draft; MENUS workflow |
| CS-17 | Class Setup owner feel / terminology | Ordinary teacher language; no remount jargon | I-REPAIR-1 copy cleanup; Slice I A–C polish | OWNER-OBSERVED | OWNER-ONLY | Q7 | Re-gate after PRE-Q7 eligibility |

---

## 5. HOST / GAMEPLAY

| ID | Interaction | Success (semantic) | Current proof | Evidence class | Disposition | Q stage | Gap / note |
| --- | --- | --- | --- | --- | --- | --- | --- |
| HG-01 | Focused Host after Start | Board/timer/local input authority without setup chrome | H-REPAIR-1 focused host; Slice A posture | AUTOMATED E2E | STRENGTHEN | Q2/Q3 | Hook into Q3 golden path |
| HG-02 | Back to setup | Returns Class Setup; no invented Session events | menus A / G fragments | AUTOMATED E2E | STRENGTHEN | Q2 | |
| HG-03 | Change Game | Identity clear; replace confirms when required | `menus-slice-g-change-game` | AUTOMATED E2E | RETAIN | Q2 | |
| HG-04 | Category-board select / reveal | Host private; Display public boardOutcome | category-board, S05 board packs | AUTOMATED E2E | RETAIN | Q3 | Compose into golden path |
| HG-05 | Buzz / active claim | Choreography + privacy | S05 buzz e2e | AUTOMATED E2E | RETAIN | Q3 | Physical buzz PHYSICAL-ONLY (not silent Q5) |
| HG-06 | Correct / incorrect / score | Path S-C static authoritative scores | S05 outcome packs; teams-scoring | AUTOMATED E2E | RETAIN | Q3 | |
| HG-07 | Timers / arming | Arm/transition honesty | `timers-arming` | AUTOMATED E2E | RETAIN | Q3 | |
| HG-08 | Keyboard buzz fallback | Usable without controllers | `buzz-in`, gamepad calm path | AUTOMATED E2E | RETAIN | Q3 | Keyboard golden path |
| HG-09 | Final wager lifecycle | Wager → reveal → settlement | `final-wager`, S05 final choreography | AUTOMATED E2E | RETAIN | Q3 | |
| HG-10 | Completion / winner / tie | Completion-only winner; remount-safe | audience-display final tests; S05 final | AUTOMATED E2E | RETAIN | Q3 | |
| HG-11 | Session summary | Host summary; Display sanitized | `session-summary`, completed-summary | AUTOMATED E2E | RETAIN | Q3 | |
| HG-12 | **Integrated golden path** | Home→setup→Play→board→Final→completion on one served build | **Absent as integrated pack** | — | **NEW** | **Q3** | **Finding C** |
| HG-13 | Undo / recovery mid-game | Safe resume without private leak | persistence-recovery fragments | AUTOMATED E2E | STRENGTHEN | Q4 | Branch / failure matrix |
| HG-14 | More / diagnostics / mute | Sanitized diagnostics; panic mute | diagnostic-report; classroom-setup mute | AUTOMATED E2E / DESKTOP | RETAIN | Q5 | Electron/desktop family |
| HG-15 | Whole-game owner playthrough | Classroom feel across full game | STATUS: **NOT RUN**; **PAUSED/GATED** | OWNER-ONLY | OWNER-ONLY | Q7 | Requires PRE-Q7 eligibility; Q7 does not issue it |

---

## 6. DISPLAY

| ID | Interaction | Success (semantic) | Current proof | Evidence class | Disposition | Q stage | Gap / note |
| --- | --- | --- | --- | --- | --- | --- | --- |
| DP-01 | Open / reopen Display | Second window/tab; `cqs://app#/display` or web `#/display` | shell + audience-display | DESKTOP / E2E | RETAIN | Q5 | |
| DP-02 | Fail closed / projector safety | No Host-private answers/notes | `projector-safety`, sync | AUTOMATED E2E | RETAIN | Q2/Q5 | |
| DP-03 | Board / clue readability | F1 stress foundations | S05-F1 e2e | AUTOMATED E2E | RETAIN | Q3 | Physical projector PHYSICAL-ONLY (not silent Q5) |
| DP-04 | Buzz / outcome choreography | Public authority only | S05 presentation packs | AUTOMATED E2E | RETAIN | Q3 | |
| DP-05 | Final / winner public | Completion-only; no private wager leak | S05 final + audience | AUTOMATED E2E | RETAIN | Q3 | |
| DP-06 | Visual convergence / historian | Archive appearance at milestone SHA | visual-history suites; historian gate | HISTORICAL / E2E | RETAIN | — | Immutable archives; not acceptance |
| DP-07 | Physical projector / sleep | Placement + wake recovery | S04C foundation; physical **NOT RUN** broadly | PHYSICAL PROJECTOR | PHYSICAL-ONLY | S06 later | Not authorized now |
| DP-08 | Owner Display feel | Theatrical vs Host restrained | OWNER-ONLY | OWNER-ONLY | OWNER-ONLY | Q7 | |

---

## 7. Suite disposition register (tip `67ba2c0…`)

| Suite | Disposition | Notes |
| --- | --- | --- |
| `menus-i-repair-1-scenario-d.spec.ts` | **STRENGTHEN** | Row order / Skip honesty / Check visibility — not buzzer-action confirmation (Finding A) |
| `menus-i-repair-1-zero-team-fix.spec.ts` | **REPLACE** | Documents current Resume+replace return (Finding B); Q1 target = direct Class Setup return |
| `menus-slice-e-team-sony.spec.ts` | **STRENGTHEN** | Complements zero-team; same return-path limit |
| `menus-bf-readiness.spec.ts` | **RETAIN** | Ready/optional matrix |
| `menus-bf-viewport.spec.ts` | **RETAIN** | Fit stress |
| `menus-slice-a-host-posture.spec.ts` | **RETAIN** | Posture / bare Host |
| `menus-slice-cd-home-authoring.spec.ts` | **STRENGTHEN** | Home/authoring |
| `menus-slice-g-change-game.spec.ts` | **RETAIN** | Change Game |
| `menus-slice-h-names-sim-sony.spec.ts` | **STRENGTHEN** | Guidance + keyboard/manual fill on sim supported profile — not colour-press naming; not physical |
| `menus-h-repair-1-focused-host.spec.ts` | **RETAIN** | Start → focused Host |
| `menus-historian-gate.spec.ts` | **RETAIN** | Gate only; not acceptance |
| `menus-visual-history-capture.spec.ts` | **RETAIN** | Capture when authorized; immutable |
| `classroom-setup.spec.ts` | **STRENGTHEN** | Align with Buzzers-first workflow |
| `teacher-home-authoring.spec.ts` / `teacher-first-run.spec.ts` / `routes.spec.ts` | **STRENGTHEN** | Home reachability |
| `persistence-recovery.spec.ts` | **RETAIN** | Session recovery |
| `gamepad-input.spec.ts` | **RETAIN** | Sim only; label PHYSICAL-ONLY for real hardware |
| `final-wager.spec.ts` / `session-summary.spec.ts` / `completed-summary-ledger.spec.ts` | **RETAIN** | Fragments for Q3 golden compose |
| S05 `s05-*-*.spec.ts` (F1, buzz, board, final, visual) | **RETAIN** | Presentation children; not integrated golden |
| `audience-display.spec.ts` / `projector-safety.spec.ts` / display-visual-* | **RETAIN** | Display privacy/choreography |
| `tests/desktop/shell.spec.ts` | **RETAIN** | Shell only — Finding D / Q5; do not cite as golden path |
| `buzz-in` / `category-board` / `teams-scoring` / `timers-arming` / `presentation-audio` / `theme-system` / `sync` / `media-contract` / `import-pipeline` / portable / backup / diagnostic / pwa / aggregate-reset / spreadsheet | **RETAIN** | Foundation regression |
| Integrated Home→…→completion pack | **NEW** | Finding C — Q3 |
| Physical Sony re-qual on `67ba2c0…` | **PHYSICAL-ONLY** | H5/H6 transferred under older identity; not re-run here; **not** silent Q5 PASS |
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
2. Findings A–D **closed by repair/proof** **or** evidence-backed
   reclassification as non-functional / non-blocking — **no** owner waiver for
   functional closure;
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

- authorize Q1 product repair or test mutation;
- issue `OWNER-PLAYTHROUGH-ELIGIBLE`;
- mark S05 terminal or REAL MVP complete;
- transfer H5/H6 physical PASS to `67ba2c0…` for Class Setup Buzzers confirmation;
- treat `shell.spec.ts` as teacher golden-path proof;
- mutate PR #110 / #118.

```text
Q0 MATRIX REGISTERED
owner playthrough: PAUSED / GATED (Q0–Q6 + PRE-Q7 eligibility)
Findings A–D: recorded functional escapes — not repaired; not waivable through PRE-Q7
PRE-Q7 OWNER-PLAYTHROUGH-ELIGIBLE: NOT ISSUED (DevPM verdict after Q6)
Q7 does not issue eligibility
functional blockers: no owner-waiver escape hatch through PRE-Q7
```
