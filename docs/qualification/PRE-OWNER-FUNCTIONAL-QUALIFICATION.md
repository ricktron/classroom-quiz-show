# Pre-Owner Functional Qualification Contract

- **Document id:** `PRE-OWNER-FUNCTIONAL-QUALIFICATION`
- **Program:** `CQS-REAL-MVP-1`
- **Authorization:** `AUTHORIZE-CQS-PRE-OWNER-Q0-QUALIFICATION-CONTRACT-1`
  (Q0 registration); Q1 via PR #123; Q2 via PR #125 under
  `AUTHORIZE-CQS-PRE-OWNER-Q2-MENUS-WORKFLOW-FUNCTIONAL-QUALIFICATION-1`;
  Q2 post-merge docs:
  `AUTHORIZE-CQS-Q2-POST-MERGE-STARTUP-TRUTH-RECONCILIATION-1`;
  Q3 delivery under
  `AUTHORIZE-CQS-PRE-OWNER-Q3-CORE-GAMEPLAY-GOLDEN-PATHS-1`;
  Q4 delivery under
  `AUTHORIZE-CQS-PRE-OWNER-Q4-GAMEPLAY-BRANCH-FAILURE-MATRIX-1`;
  Q4 post-merge docs:
  `AUTHORIZE-CQS-Q4-POST-MERGE-STARTUP-TRUTH-RECONCILIATION` (PR #130);
  Q5 delivery under
  `AUTHORIZE-CQS-Q5-DESKTOP-ELECTRON-INTEGRATION-QUALIFICATION`;
  Q6 Court review under `AUTHORIZE-CQS-Q6-INDEPENDENT-COURT-REVIEW-1`
- **Kind:** durable pre-owner functional qualification contract
- **Status:** **ACTIVE / Q0 LANDED; Q1 LANDED / VERIFIED ON MAIN** @
  `9d8246e9811eec19a34a9f8d44b2287b8635a741`; **Q2 LANDED / VERIFIED ON
  MAIN** @ `2dc918f934836c3fa6a0f4d554f4757f4668c691`; **Q3 LANDED / VERIFIED ON MAIN** @ `85bb951ead3ea7ed99a7f404f60bbebcb0d68cb7` (PR #127; reviewed tip `cf207cac7dd722a903f901cd885e35583439ed02`); **Q4 LANDED / VERIFIED ON MAIN** @ `c32b72c35f33e4188793e223ad9749c4a226b806` (PR #129; proof `541718e1…`; reviewed tip `28d611e…`; post-merge reconciliation PR #130 @ `28ff239…`); **Q5 LANDED / VERIFIED ON MAIN** @ `c7e41a4…` (PR #131; proof `455c4cf…`; reviewed tip `f1d4535…`); **Q6 EXECUTED on candidate `d921b07…` — Court A: GAPS REMAIN (G1, G2); Court B: NOT RUN** — [`../receipts/2026-10-04-cqs-q6-court-a-b-independent-review.md`](../receipts/2026-10-04-cqs-q6-court-a-b-independent-review.md)
- **Companion:** [`PRE-OWNER-TEACHER-JOURNEY-MATRIX.md`](PRE-OWNER-TEACHER-JOURNEY-MATRIX.md)
- **Observation base (Q0 registration):** `origin/main`
  `67ba2c0027f7e2439bd39bd963a7321be0ab6801` (PR #121 squash merge of
  I-REPAIR-1 Class Setup functional convergence)
- **Q1 verified PR tip:** `f5eeab30d525d175b9d615f966551a19f178ff4a`
  (exact-head CI bound here)
- **Q1 squash/main:** `9d8246e9811eec19a34a9f8d44b2287b8635a741`
  (PR #123; Scenario-D escape hardening)
- **Q1 tree identity:** `8e59759af585a3b7764adb318a4cdb4bb6300690`
  (tip and squash trees identical — transfer justified)
- **Q2 verified PR tip:** `aa3c18f7621c0d399730ad67045410168fbb2257`
  (exact-head CI bound here; PR #125)
- **Q2 squash/main:** `2dc918f934836c3fa6a0f4d554f4757f4668c691`
  (PR #125; MENUS workflow functional qualification)
- **Q2 tree identity:** `229e8a013ab6b1880650f9a98e8e2857c4aa1cf1`
  (tip and squash trees identical — transfer justified; do not call the
  squash the tip; do not claim CI ran on the squash unless separately
  evidenced)
- **Q3 authorization:**
  `AUTHORIZE-CQS-PRE-OWNER-Q3-CORE-GAMEPLAY-GOLDEN-PATHS-1`
- **Q3 delivery branch (historical):** `cursor/cqs-q3-core-gameplay-golden-paths-ba9f`
- **Q3 product repair tip (historical):** `0c91147276dead9c50968bdbab98f753187ff7bf`
  (Session-name Host propagation + real `lih-correct` adjudication; R1–R6)
- **Q3 summary-contract / matrix repair:** ADR-016 durable Summary V1 keeps
  authored `teamName`; Session names at current-session Host panel presentation
  only; matrix HG-04…HG-12 + DP-04/05 → RETAIN (R7–R11)
- **Q3 verified PR tip:** `cf207cac7dd722a903f901cd885e35583439ed02`
- **Q3 squash/main:** `85bb951ead3ea7ed99a7f404f60bbebcb0d68cb7`
- **Q4 authorization:**
  `AUTHORIZE-CQS-PRE-OWNER-Q4-GAMEPLAY-BRANCH-FAILURE-MATRIX-1`
- **Q4 delivery branch (historical):** `cursor/cqs-q4-gameplay-branch-failure-matrix-1`
- **Q4 qualification proof head:** `541718e1ad2788265678bb8178d043781718194a`
- **Q4 squash/main:** `c32b72c35f33e4188793e223ad9749c4a226b806` (PR #129)
- **Q4 post-merge reconciliation:** PR #130 @ `28ff23993183710c9eea9e524667bad45d0448fd`
- **Q5 authorization:**
  `AUTHORIZE-CQS-Q5-DESKTOP-ELECTRON-INTEGRATION-QUALIFICATION`
- **Q5 delivery branch (historical):** `cursor/cqs-q5-desktop-electron-integration-qualification-1`
- **Q5 squash/main:** `c7e41a42cb41c112419492f9922578a3dc147269` (PR #131)
- **Q5 reviewed tip:** `f1d45351dc2ec984cf92d43ca476f6aeebe31d6f`
- **Q5 tree identity:** `8bb6c5285e54a9068f195bf7eb245e3e501e9143`
  (tip and squash trees identical — transfer justified)
- **Q5 observation base:** `origin/main`
  `28ff23993183710c9eea9e524667bad45d0448fd`
- **Q5 qualification proof head:** `455c4cf7136b92f44a613a33f43fc26a7a88832f`
  (desktop lifecycle pack + Q4-landed / Q5-candidate docs; qualification-only)
- **Q5 evidence:** `tests/desktop/shell.spec.ts` (**RETAIN**) +
  `tests/desktop/q5-session-lifecycle.spec.ts` (**NEW**); desktop unit
  `desktop/shell.invariants.test.ts` (**RETAIN**)

```text
This file is documentation / qualification contract.
Q0–Q4 are LANDED on main. Q5 Desktop/Electron integration qualification is
LANDED / VERIFIED ON MAIN @ c7e41a4… (PR #131; proof 455c4cf…; reviewed tip f1d4535…).
Q6 Court review executed on d921b07…: COURT-A GAPS REMAIN (G1 round progression only in
Advanced diagnostics; G2 stale public Display status). Court B NOT RUN.
Eligibility path STOPPED pending repair packet Q6-RP-1 (Q3 family).
No owner playthrough / eligibility / S05 terminalization / S04D / S06.
```

```text
routing ≠ authority
naming Q3–Q7 does not start them
Q0 observation history ≠ Q1 closure
Q2 candidate-time wording ≠ Q2 landed routing
```

---

## 1. Purpose

Teachers must be able to trust that ordinary Classroom Quiz Show workflows
work **before** the owner resumes deliberate whole-game / MENUS owner
playthrough. Automated green CI, historian PNGs, and Slice I Scenario D
BLOCKED-then-repaired history are **not** that trust by themselves.

This contract defines:

1. the **Q0→Q7** pre-owner functional qualification ladder (with a
   **PRE-Q7** eligibility gate between Q6 and Q7);
2. the **evidence taxonomy** and what each class may and may not claim;
3. **semantic interactive-control proof** (presence ≠ success) as a
   **requirement inside Q1/Q2**, not a separate stage;
4. **contextual repair** return-path rules as a **requirement inside
   Q1/Q2**, not a separate stage;
5. **exact-head** and **served-build** binding (cross-cutting; Desktop
   Electron integration is **Q5**);
6. **transfer** rules for prior physical / historical evidence;
7. the **PRE-Q7 DevPM gate** that alone may issue
   **`OWNER-PLAYTHROUGH-ELIGIBLE`** / `candidate SHA:` after Q0–Q6;
8. how **QA escapes** are recorded without bypassing the gate.

CQS remains authoritative. NightWatch / chat / Notion / Obsidian may
summarize; they cannot override this repository.

Slice 23 classroom qualification
([`SLICE-23-QUALIFICATION-PLAN.md`](SLICE-23-QUALIFICATION-PLAN.md)) remains
**TERMINALLY COMPLETE** historical foundation. It does **not** substitute for
this pre-owner ladder on the current REAL MVP / MENUS frontier.

---

## 2. Non-goals and hard bans (Q0)

Q0 (this contract) **must not**:

- implement Q1 product repairs or alter product behavior;
- mutate tests except unavoidable docs-only references;
- mutate PR #110 (OPEN draft) or PR #118 (OPEN stale);
- begin S04D or S06;
- terminalize S05 parent;
- resume owner walkthrough / Slice I re-gate as acceptance;
- rewrite historical receipts or historian archives;
- issue **`OWNER-PLAYTHROUGH-ELIGIBLE`**;
- merge itself or any successor lane.

Owner playthrough (S05 whole-game and MENUS Slice I re-run) is
**PAUSED / GATED** until Q0–Q6 are complete under later authorizations and
the **PRE-Q7** eligibility verdict in §10 is explicitly issued. **Q7 does
not** issue eligibility.

---

## 3. Ladder Q0 → Q7

| Stage | Name | Authorized by this file? | Purpose |
| --- | --- | --- | --- |
| **Q0** | Qualification contract | **Yes (this docs slice)** | Contract + matrix + evidence taxonomy + QA-escape protocol; register gaps A–D; routing |
| **Q1** | Known Scenario-D / escape repair | **No** | Known Scenario-D repair + escape hardening: buzzer effect confirmation, team-count contextual repair, Names-state honesty, sibling audit, regression. Separate owner auth required |
| **Q2** | MENUS workflow functional qualification | **No** | Full early teacher journeys (Home / library / authoring / Class Setup / Start). **Semantic interactive-control** and **contextual-return** are **requirements inside Q1/Q2**, not separate stages |
| **Q3** | Core gameplay golden paths | **No** | Keyboard path, meaningful sim Sony where applicable, Host/Display, board → … → Final → completion on a proven served build |
| **Q4** | Gameplay branch / failure matrix | **No** | Branch, recovery, and failure paths off the golden spine (not a second golden-path stage) |
| **Q5** | Desktop / Electron integration | **No** | Electron shell integration distinct from browser e2e. Physical Sony / projector / audio / Windows are **not** silently Q5 PASS |
| **Q6** | Court A + Court B | **No** | Adversarial / independent review. Material findings route back to Q1–Q5. No unresolved functional blocker before eligibility |
| **PRE-Q7** | Eligibility gate (not a Q-stage number) | **No** | **DevPM eligibility review verdict** after Q0–Q6. May issue **`OWNER-PLAYTHROUGH-ELIGIBLE`** / `candidate SHA:` **before Q7**. **Not** a new numbered stage and **not** a separate owner-authorization stage. Court B may **recommend** only |
| **Q7** | Natural owner usability playthrough | **No** | Begins **only after** PRE-Q7 eligibility verdict. Q7 is the playthrough itself — **Q7 does not issue eligibility** |

```text
Q0 registers the ladder.
Q1–Q6 execute under later bounded authorizations.
PRE-Q7 = DevPM eligibility verdict after Q0–Q6 (not a new Q-stage / not separate owner auth).
PRE-Q7 alone may issue OWNER-PLAYTHROUGH-ELIGIBLE + candidate SHA:.
Q7 = natural owner usability playthrough after that verdict.
Q7 does not issue eligibility.
```

Semantic control and contextual repair are **not** Q2/Q3 stage names.
Exact-head, served-build, transfer, and QA-escape rules are **cross-cutting**
(§§7–8, §12); Desktop Electron integration claims land in **Q5**.

Each of **Q1–Q6** after Q0 requires a **fresh** owner authorization packet.
**PRE-Q7** is the DevPM eligibility **verdict** after Q6 — not a new numbered
stage and not a separate owner-authorization stage. Completing Q0 does
**not** start Q1.

---

## 4. Evidence taxonomy

Aligns with [`../governance/EXECUTION-GUIDANCE.md`](../governance/EXECUTION-GUIDANCE.md)
§5. Pre-owner functional claims must label the class used:

| Class | May claim | Must not claim |
| --- | --- | --- |
| **AUTOMATED UNIT** | Pure readiness / reducer / path rules | Teacher journey success; physical hardware |
| **AUTOMATED COMPONENT** | Panel wiring under mocks (RTL) | Served-build classroom loop; physical Sony |
| **AUTOMATED E2E** | Browser journey on a **proven served build** for a named head | Physical Sony / Windows / projector; owner acceptance |
| **DESKTOP E2E** | Electron thin-shell lifecycle on named head | Teacher golden path; Class Setup completion; gameplay |
| **PRODUCTION BUILD** | `npm run build` / desktop package produced | Install/start teacher trust; signing |
| **BROWSER-OBSERVED** | Human browser observation notes | Physical hardware / signed release |
| **PHYSICAL HARDWARE** | Named device / profile / handset count | Transfer to later SHA without transfer rule |
| **PHYSICAL PROJECTOR** | Named display path | Generic “Display works” |
| **PHYSICAL AUDIO** | Named audio path | ADR-020 completeness alone |
| **OWNER-OBSERVED** | Owner walkthrough verdict for named scenarios | Facilitator click-through as acceptance |
| **SCREEN-READER** | Named AT exercise | Unrun a11y completeness |
| **HISTORICAL** | Past receipt / H5–H6 / Slice 23 | Current tip status without transfer |
| **TRANSFERRED** | Prior physical PASS under §8 rules | Silent rewrite of identity SHA |

```text
CI green ≠ independent review PASS
selector presence ≠ semantic interactive-control proof
simulation ≠ physical hardware
historian PNG ≠ owner acceptance
docs-only verify ≠ product pass
```

An unrun check must **never** be reported as passing.

---

## 5. Semantic interactive-control proof (requirement inside Q1/Q2)

### 5.1 Definition

A control is **semantically proven** only when automation (or named physical /
owner evidence) shows:

1. **Reach** — teacher can find the control in the ordinary posture;
2. **Act** — teacher activates the intended control (not a surrogate);
3. **Effect** — durable product state / UI confirmation changes as specified;
4. **Authority** — Host remains private; Display remains sanitized/read-only;
5. **Honesty** — copy and status match lifted truth (no Skip-only when hardware
   is present; no false “ready”).

Asserting `getByTestId('…').toBeVisible()` alone is **reach**, not success.

This is a **qualification requirement inside Q1 (escape hardening) and Q2
(MENUS workflow)**, not a separate ladder stage.

### 5.2 Interactive-control families (pre-owner)

| Family | Semantic success includes |
| --- | --- |
| Home / library Play | Lands `#/host?play=` → Class Setup (not bare Host kitchen-sink) |
| Import / New Game | Saved Game or draft with honest playable gate |
| Class Setup row selection | Selected row follows click; readiness cue ≠ selection |
| Buzzers Check / Skip | Check reveals **live** setup machinery and teacher-visible confirmation path; Skip only when honest |
| Teams Fix team count | Opens Game settings team-count; after save, returns to **Class Setup** per Q1 target (see §6) |
| Names fill / claim | Unique Session names; Start enablement. Simulated Sony suite (`menus-slice-h-names-sim-sony`) proves **colour guidance + keyboard/manual fill** only — not colour-press team-name claim |
| Display Open | Audience window without Host-private leak |
| Sound Test | Audible/teacher-confirmed test without Start gate lie |
| Start / Play (setup→play) | Posture → focused Host; Class Setup unmounted |
| Back to setup | Returns setup without inventing Session events |
| Board / Final / completion | Gameplay authority through completion summary |

### 5.3 Finding A — Scenario D buzzer-action proof gap (Q0 observation)

**Q0 observation (CONFIRMED on `67ba2c0…`; historical — do not rewrite as if
Q1 already existed):**

- Suite: `tests/e2e/menus-i-repair-1-scenario-d.spec.ts`
- Product: `ClassroomSetupPanel` `setup-reveal-buzzers` →
  `onRevealBuzzersSetup` in `FoundationControls.tsx` only
  `scrollIntoView` / `focus` on `[data-testid="sbs-supported-profile"]` or
  `[data-testid="gih"]`.
- Unit: `ClassroomSetupPanel.test.tsx` asserts callback **called**, not teacher
  connect / press confirmation.
- Scenario D e2e clicks Check and asserts `sbs-supported-profile` visible; it
  does **not** prove connect, handset press, or Class Setup confirmation of
  controller response.
- Owner Slice I mid-D: hardware light flash observed with **no UI confirmation**
  — residual escape for Q1/Q2, not closed by I-REPAIR-1 presence/Skip honesty.

**Q0 disposition (historical):** record gap; **do not repair**.

**Q1 closure — CLOSED / VERIFIED ON MAIN @ `9d8246e…` (PR #123):** Check /
Show enters existing SBS Buzzer Check (`testMode` on sole Gamepad owner) plus
scroll/focus; simulated supported press yields teacher-visible
`sbs-test-outcome` / responding controller-layer confirmation in Scenario D
e2e. Evidence class: **AUTOMATED E2E (SIMULATED)**. **PHYSICAL SONY — NOT
RUN.** Does **not** claim Q2 MENUS workflow PASS.

---

## 6. Contextual repair (requirement inside Q1/Q2)

### 6.1 Rule

When Class Setup (or Home) offers a Fix / Edit / recover control:

1. the control must land on the **job that was blocked**;
2. after the teacher completes that job, return must restore the **interrupted
   setup/play posture** without unnecessary Session-replace theater **when the
   authorized Q1 target says so**;
3. Game vs Session boundaries remain intact (team count stays Game-owned);
4. recovery confirms remain when Session safety truly requires them.

Contextual return is a **requirement inside Q1 (product path) and Q2 (MENUS
workflow proof)**, not a separate ladder stage.

### 6.2 Finding B — team-count return path (Q0 observation → Q1 closure)

| Item | Q0 observation on `67ba2c0…` (historical) |
| --- | --- |
| Current path (Q0) | `setup-fix-team-count` → authoring Game settings (`authoringFocus: 'team-count'`) → save → Home/authoring **Play** → **Resume class** → **replace Session confirm** → Class Setup |
| Evidence (Q0) | `menus-i-repair-1-zero-team-fix.spec.ts`, `menus-slice-e-team-sony.spec.ts` |
| Q1 target (contract intent) | **Direct return to Class Setup** after Fix team count / save, without forcing the teacher through Resume + replace as the ordinary contextual-repair path |
| Q0 disposition (historical) | Gap recorded; **no product repair in Q0** |

**Q1 closure — CLOSED / VERIFIED ON MAIN @ `9d8246e…` (PR #123):**

- **Disposable Fix path:** fail-closed
  `isDisposableContextualTeamCountSession` gate; disposable zero-team /
  invalid-count interrupted Session may discard + direct `?play=` Class Setup
  return (Names focus). Proven by zero-team + Slice E e2e — no Home / Play /
  Resume / replace theater.
- **Meaningful Session fail-closed:** named / scored / round / unknown /
  valid-teams Sessions are **not** silently discarded; recovery preserved; no
  auto `confirmedReplace`.
- **Open Game settings (valid Teams):** no destructive `returnToClassSetup`
  latch; Save stays on authoring; Session recoverability intact
  (`menus-q1-open-settings-names-preserve`).
- **Roster-drift replace confirm:** meaningful 2-team named Session → Open
  settings → change **2 → 3** → Save → Play → Resume → `play-replace-confirm`
  visible; Session not silently discarded (do not auto-click replace).

Q2 later proves broader MENUS contextual-return / workflow coverage. Q1
closure is **not** Q2 PASS. **PHYSICAL SONY — NOT RUN.**

---

## 7. Exact-head and served-build (cross-cutting; Desktop = Q5)

### 7.1 Exact-head

Every serious verification claim binds to:

```text
cwd
Git toplevel
branch
exact HEAD
clean/dirty state
```

Independent review reviews the **immutable candidate head**. After repair,
prior PASS does not transfer automatically.

Durable docs must not predict their own open delivery PR squash SHA.

### 7.2 Served-build

Playwright / browser claims require a **proven served build** for that head:

- no unidentified `reuseExistingServer`;
- no stale preview/dev on occupied ports;
- no stale `dist` / `out/renderer` from another SHA;
- desktop claims use that head’s desktop build identity where practical
  (`desktop-build-identity.json` / equivalent).

Exact-head and served-build binding apply across Q1–Q6. **Q5** is the stage
for **Desktop / Electron integration** claims (distinct from browser e2e).
Physical Sony / projector / audio / Windows runtime are **separate** evidence
classes — they are **not** silently Q5 PASS.

### 7.3 Finding D — `tests/desktop/shell.spec.ts` (CONFIRMED)

What it **actually proves** on Electron:

- Host opens at `cqs://app`; Display second window; Node/Electron isolation;
- desktop build identity + CSP (`script-src 'self'`, no `unsafe-eval`);
- Display free of Host-private copy; external `window.open` denied;
- IndexedDB / CQS persistence across quit/relaunch with stable userData;
- cold relaunch shows Home Resume (H1 — no silent auto-resume);
- keyboard event delivery; Gamepad/WebHID/Audio **API presence**; offline
  custom-protocol reload; sanitized diagnostic copy in Electron.

What it **does not** prove:

- Class Setup completion; Buzzers Check semantics; Names/Start;
- board gameplay, Final, or completion golden path;
- physical Sony / Windows classroom runtime;
- teacher-adoptable signed release.

**Q0 disposition (historical):** classify as **DESKTOP E2E / RETAIN** for shell
lifecycle (**Q5** family); **STRENGTHEN or NEW** separate packs for teacher
golden path (**Q3**) and gameplay branch/failure (**Q4**). Do not cite shell as
golden path.

**Q5 closure — CLOSED ON MAIN BY Q5 @ `c7e41a4…`:** `shell.spec.ts` remains **RETAIN** for
cold Host/Display/security/API/offline/diagnostics. Material Electron gaps
(authentic started-Session quit/relaunch, explicit Home Resume, Host/Display
reconvergence + privacy, Display hash-lock runtime, `sourceSha` build binding,
protocol 404 fail-closed) are proven by
`tests/desktop/q5-session-lifecycle.spec.ts`. Still **not** teacher golden path
or physical Sony/Windows/projector.

---

## 8. Transfer rules

Prior evidence may be **TRANSFERRED** only when all hold:

1. **Invariant family unchanged** for the claim (product behavior that could
   causally affect the claim was not mutated since the evidence SHA);
2. **Identity bound** — hardware profile, packaged SHA, or served-build id
   recorded; H5/H6 macOS physical PASS remains bound to recorded identities
   (H6 packaged `9df9c42…`) and is **not** silently rewritten to later squash
   SHAs;
3. **Class preserved** — physical stays physical; simulation stays simulation;
4. **Explicit non-transfer** when MENUS / I-REPAIR-1 / Host posture / Class
   Setup copy or selectionMode changed relative to the evidence — require
   re-qualification under later auth;
5. **Historian archives immutable** — new milestone = new archive; never
   overwrite merged PNGs.

Slice 23 terminal evidence transfers as **foundation** only. It does not clear
Q1–Q6, PRE-Q7 eligibility, or Q7 on the MENUS / S05 owner-playthrough frontier.

---

## 9. Court plan — Q6 A + Q6 B

Q6 is **not** executed in Q0. Plan of record:

### Court A — Evidence completeness (pre-eligibility)

| Item | Plan |
| --- | --- |
| Question | Does the journey matrix (§ companion) have semantic proof or an explicit PHYSICAL-ONLY / OWNER-ONLY / accurately classified non-functional residual for every ordinary-path interaction required before owner playthrough? |
| Inputs | Matrix dispositions; Q1–Q5 receipts; exact-head CI; served-build provenance; DevPM A–D closure status |
| Forbidden | Equating CI green with Court PASS; inventing physical PASS from simulation; treating physical Sony/projector/audio/Windows as silent Q5 PASS; advancing with an unresolved ordinary-path **functional** blocker |
| Outcomes | **COMPLETE** / **GAPS REMAIN** (named rows) / **STOP — authority** |
| Material findings | Route back to **Q1–Q5** for repair/proof; do not advance eligibility with unresolved ordinary-path functional blockers (no owner-waiver escape hatch) |

### Court B — Eligibility recommendation (before PRE-Q7)

| Item | Plan |
| --- | --- |
| Question | Given Court A COMPLETE, residual **non-functional** items (§12), and transfer ledger, may DevPM issue **`OWNER-PLAYTHROUGH-ELIGIBLE`** / `candidate SHA:` at PRE-Q7? |
| Inputs | Court A record; open escapes (§12); STATUS/CURRENT agreement; hard-ban audit (no S04D/S06/S05 terminalization smuggled) |
| Forbidden | Issuing eligibility from Court B itself (Court B only **recommends**; **DevPM** issues the PRE-Q7 **verdict** after Q6, before Q7); treating owner waiver as functional closure |
| Outcomes | **RECOMMEND ELIGIBLE** / **RECOMMEND HOLD** / **REPAIR REQUIRED** |

Seats and rigor may follow NightWatch / OpenClaw Court protocol when available
as **read-only supplemental**. CQS docs and observed Git remain authoritative.

---

## 10. `OWNER-PLAYTHROUGH-ELIGIBLE` gate (PRE-Q7 — not Q7)

### 10.1 Meaning

```text
OWNER-PLAYTHROUGH-ELIGIBLE
candidate SHA: <exact head>
```

means: the owner may **resume** deliberate MENUS / S05 whole-game owner
playthrough on a named exact head because ordinary-path **functional**
escapes / blockers were **repaired and verified**, and any remaining
visible issues are accurately classified as usability/polish or honestly
NOT-RUN physical — **not** known functional blockers.

It is **not**: MENUS Complete, S05 parent terminal, REAL MVP complete, signed
release, Windows physical PASS, or Slice I ACCEPT.

**Issuer:** DevPM at the **PRE-Q7** gate **after Q0–Q6** and **before Q7**.
PRE-Q7 is a **verdict**, not a new numbered stage and not a separate
owner-authorization stage. After Q6, DevPM eligibility review issues
**`OWNER-PLAYTHROUGH-ELIGIBLE`** and `candidate SHA:` — then Q7 may begin.
Court B may **recommend** eligibility. **Q7 does not issue eligibility** —
Q7 is the natural owner usability playthrough that begins only after this
verdict.

### 10.2 Issue conditions (all required)

1. Q0 contract merged on `main` (this document + matrix + routing);
2. Q1 authorized **functional** escapes **repaired and verified** —
   functional escapes / blockers may **not** be waived through PRE-Q7;
3. Q2–Q5 evidence recorded on exact heads with served-build provenance
   (MENUS workflows; golden paths; branch/failure; Desktop/Electron —
   physical classes labeled separately);
4. Court A **COMPLETE** (no unresolved ordinary-path functional blocker);
   Court B **RECOMMEND ELIGIBLE**;
5. **DevPM PRE-Q7** verdict explicitly issues the string
   **`OWNER-PLAYTHROUGH-ELIGIBLE`** and names `candidate SHA:`;
6. [`../STATUS.md`](../STATUS.md) and [`../handoff/CURRENT.md`](../handoff/CURRENT.md)
   agree;
7. Remaining visible issues are **usability/polish** or honestly **NOT-RUN
   physical** — **not** known ordinary-path functional blockers.

### 10.3 Current status

**Not issued.** Owner playthrough remains **PAUSED / GATED** behind Q0–Q6 +
PRE-Q7 eligibility verdict. Q0–Q5 are landed on main. Q6 Court review was
executed on candidate `d921b07…`: **Court A: GAPS REMAIN** (G1, G2);
**Court B: NOT RUN**. Q6 is **not passed**; the eligibility path is stopped
until repair packet **Q6-RP-1** (Q3 family) is repaired, verified, landed, and
Court A is re-reviewed. Record: [`../receipts/2026-10-04-cqs-q6-court-a-b-independent-review.md`](../receipts/2026-10-04-cqs-q6-court-a-b-independent-review.md).

---

## 11. DevPM findings A–D (Q0 observation + Q1 closure status)

Q0 verified A–D as functional escapes on `67ba2c0…` **without repair**. Q1
product escape hardening (PR #123) closed A/B on main; C/D remain as staged.

| ID | Finding | Q0 verification (historical) | Current disposition |
| --- | --- | --- | --- |
| **A** | Scenario D buzzer-action proof gap | CONFIRMED — Check scrolls/focuses GIH/Sony profile; no connect/press/UI confirmation proof in Scenario D e2e or `onRevealBuzzersSetup` | **CLOSED BY Q1** — VERIFIED ON MAIN @ `9d8246e…` (SIMULATED e2e Check → SBS testMode → press confirmation). **PHYSICAL SONY NOT RUN.** |
| **B** | Team-count contextual repair path vs Q1 target | CONFIRMED — current = authoring → Play → Resume → replace → setup; target = direct Class Setup return | **CLOSED BY Q1** — VERIFIED ON MAIN @ `9d8246e…` (disposable direct return; meaningful Session fail-closed; Open settings non-destructive; 2→3 roster-drift replace confirm). |
| **C** | Integrated golden-path gap | CONFIRMED — suites cover fragments (`teacher-home-authoring`, `classroom-setup`, `menus-*`, `final-wager`, `session-summary`, S05 choreography) but **no** single Home→gameplay→Final→completion integrated pack | **CLOSED ON MAIN BY Q3 @ `85bb951…`** — `menus-q3-core-gameplay-golden-paths.spec.ts` landed via PR #127. **PHYSICAL SONY NOT RUN.** **Q6 qualifier:** engine integration evidence-backed; the *ordinary teacher-control* claim is **REOPENED by Q6 G1** (board entry and Final entry reached only via Advanced diagnostics). |
| **D** | Electron `shell.spec.ts` scope | CONFIRMED — shell/security/persistence/API presence/diagnostics; not teacher golden path | **CLOSED ON MAIN BY Q5** @ `c7e41a4…` — shell **RETAIN**; authentic Session quit/relaunch + Display privacy/hash-lock + build `sourceSha` binding in `q5-session-lifecycle.spec.ts`. Still not teacher golden path / physical Sony. |

---

## 12. QA escape protocol

A **QA escape** is a known defect, coverage hole, or environmental limit that
would otherwise block a stage. Classify each escape before Court / PRE-Q7:

| Class | Meaning | Through PRE-Q7 |
| --- | --- | --- |
| **FUNCTIONAL ESCAPE / BLOCKER** | Ordinary-path functional defect or proof hole that leaves a known broken teacher workflow | **May not be waived** through PRE-Q7. Route to **Q1–Q5**; **repair and verify**. No owner waiver turns a functional blocker into an eligible residual |
| **NON-FUNCTIONAL RESIDUAL** | Usability / polish; honestly **NOT-RUN** physical; accepted **OPEN / LOW** with evidence it is **not** an ordinary functional blocker | May remain visible at eligibility if accurately classified. Does **not** establish a general functional-defect waiver |

Rules:

1. Record escapes in the active stage receipt with id, evidence class,
   **functional vs non-functional** class, and whether they **block** owner
   eligibility;
2. Escapes do **not** silently become PASS;
3. **No waiver** may convert a functional blocker into an eligible residual;
4. Facilitator observation ≠ evidence-backed reclassification;
5. Q0 itself recorded A–D as **functional** escapes on `67ba2c0…`; Q1 closed
   A/B on main @ `9d8246e…`; C is **CLOSED ON MAIN BY Q3 @ `85bb951…`**; D is
   **CLOSED ON MAIN BY Q5** @ `c7e41a4…` (shell RETAIN + lifecycle strengthen);
6. H4 salvage collapsed detail (**OPEN / LOW**) may remain as an **OPEN /
   LOW** residual **only** if kept under the non-functional / non-blocking
   usability class (primary status honest; collapsed “More detail” may still
   deny save). That residual must **not** establish a general
   functional-defect waiver;
7. At PRE-Q7 eligibility, remaining visible issues = usability/polish or
   honestly NOT-RUN physical — **not** known ordinary-path functional
   blockers.

---

## 13. Routing impact (minimal)

While this contract is active and PRE-Q7 has not issued eligibility:

| Topic | Required routing |
| --- | --- |
| Next contributor action | Do **not** send Rick to owner walkthrough / Slice I re-gate / S05 whole-game playthrough. **Q6 Court A: GAPS REMAIN** (G1, G2); **Court B: NOT RUN**. Next: owner decision on repair packet **Q6-RP-1** (Q3 family; product repair + re-proof) under a fresh bounded authorization, then Court A re-review of the affected rows. Not authorized by this file |
| Completed | **Q0–Q5 LANDED** on main (Q5 @ `c7e41a4…` PR #131; proof `455c4cf…`; reviewed tip `f1d4535…`) under `AUTHORIZE-CQS-Q5-DESKTOP-ELECTRON-INTEGRATION-QUALIFICATION` |
| S05 parent | **OPEN / NOT TERMINAL** |
| Prior MENUS Slice I playthrough | **NOT RUN** as acceptance (Scenario D was BLOCKED; I-REPAIR-1 merged; Q1 closed Scenario-D escapes on main; re-gate **not** authorized here) |
| Owner playthrough | **PAUSED / GATED** behind Q0–Q6 + PRE-Q7 eligibility verdict |
| S04D / S06 | **NOT AUTHORIZED** |
| REAL MVP | **not** complete |
| PR #110 / #118 | Observe only; do not mutate from this contract |
| Q1 / Q2 / Q3 physical Sony | **NOT RUN** |
| Q3 | **LANDED / VERIFIED ON MAIN** @ `85bb951…` (PR #127; reviewed tip `cf207ca…`) |
| Q4 | **LANDED / VERIFIED ON MAIN** @ `c32b72c…` (PR #129; proof `541718e1…`; reviewed tip `28d611e…`) |
| Q5 | **LANDED / VERIFIED ON MAIN** @ `c7e41a4…` (PR #131; proof `455c4cf…`; reviewed tip `f1d4535…`) |

Canonical status/handoff must link this file. See STATUS / CURRENT updates in
the Q0 delivery PR.

---

## 14. Open / related PRs (read-only observation)

| PR | State | Note |
| --- | --- | --- |
| [#121](https://github.com/ricktron/classroom-quiz-show/pull/121) | **MERGED** | Squash/main `67ba2c0…` — I-REPAIR-1 Class Setup (Q0 observation base) |
| [#122](https://github.com/ricktron/classroom-quiz-show/pull/122) | **MERGED** | Squash/main `b1379b8…` — Q0 qualification contract |
| [#123](https://github.com/ricktron/classroom-quiz-show/pull/123) | **MERGED** | Squash/main `9d8246e…` — Q1 Scenario-D escape hardening (verified PR tip `f5eeab3…`; identical tree `8e59759…`) |
| [#124](https://github.com/ricktron/classroom-quiz-show/pull/124) | **MERGED** | Squash/main `1276c33…` — Q1 post-merge startup-truth docs reconciliation |
| [#125](https://github.com/ricktron/classroom-quiz-show/pull/125) | **MERGED** | Squash/main `2dc918f…` — Q2 MENUS workflow functional qualification (verified PR tip `aa3c18f…`; identical tree `229e8a0…`) |
| [#127](https://github.com/ricktron/classroom-quiz-show/pull/127) | **MERGED** | Squash/main `85bb951…` — Q3 golden paths + semantic repair; reviewed tip `cf207ca…` |
| [#129](https://github.com/ricktron/classroom-quiz-show/pull/129) | **MERGED** | Squash/main `c32b72c…` — Q4 gameplay branch/failure matrix |
| [#130](https://github.com/ricktron/classroom-quiz-show/pull/130) | **MERGED** | Squash/main `28ff239…` — Q4 post-merge startup-truth reconciliation |
| [#131](https://github.com/ricktron/classroom-quiz-show/pull/131) | **MERGED** | Squash/main `c7e41a4…` — Q5 Desktop/Electron integration (proof `455c4cf…`; reviewed tip `f1d4535…`; trees EXACT MATCH `8bb6c528…`) |
| [#110](https://github.com/ricktron/classroom-quiz-show/pull/110) | OPEN **draft**, conflicting | Untouched |
| [#118](https://github.com/ricktron/classroom-quiz-show/pull/118) | OPEN stale @ `f01a06f…`, conflicting | Untouched |

---

## 15. Verification for landed Q5

Q5 squash/main `c7e41a42cb41c112419492f9922578a3dc147269` (PR #131; reviewed tip `f1d45351dc2ec984cf92d43ca476f6aeebe31d6f`; proof head `455c4cf7136b92f44a613a33f43fc26a7a88832f`; trees EXACT MATCH `8bb6c528…`) was verified on the delivery tip before merge. Local tip verification:

- `git diff --check` — clean;
- `npm run verify` — lint (pre-existing react-refresh warnings only) +
  typecheck + unit (**2914 passed**, 2 skipped);
- `npm run verify:all` — production web build + full Playwright browser e2e
  (**662 passed**, 106 skipped);
- `npm run test:desktop` — `build:desktop` + desktop Playwright
  (`shell.spec.ts` + `q5-session-lifecycle.spec.ts`; **8 passed**).

No functional Electron defect was exposed; Q5 required **no product-code
repair**. Browser Q1–Q4 packs remain **RETAIN**. Physical Sony / projector /
audio / Windows / signed-release claims remain **NOT RUN / NOT CLAIMED**.

Exact-head CI on reviewed tip `f1d4535…`: Lint/unit/build SUCCESS; Playwright SUCCESS; Desktop unit + Electron shell SUCCESS (Q5-A–D + shell, 8 passed); unsigned macOS/Windows package SUCCESS. SonarCloud Quality Gate FAILED on tip (MINOR PATH hotspot + async smell in test helper only; not a functional Electron defect). Squash/main SHA is recorded above. **Q6 correction:** a hotspot alone does not lower the Security Rating; repository precedent (S03 receipt) shows `execFileSync('git')` PATH taint is a gate-driving security finding. Q6 classifies it as a NON-FUNCTIONAL RESIDUAL (test helper not packaged; does not invalidate Q5 evidence) with a recommended `.git/HEAD` read fix — see [`../receipts/2026-10-04-cqs-q6-court-a-b-independent-review.md`](../receipts/2026-10-04-cqs-q6-court-a-b-independent-review.md) §8.

---

## 16. Non-claims

This contract does **not** claim:

- Q6 PASS (Q6 executed with Court A GAPS REMAIN); Q7 execution or PASS;
- OWNER-PLAYTHROUGH-ELIGIBLE;
- MENUS Complete / Slice I ACCEPT;
- S05 parent terminalization;
- Q1–Q5 physical Sony / Windows / projector / audio PASS;
- signed / notarized teacher release;
- REAL MVP complete;
- teacher usability from Desktop e2e;
- release readiness from successful packaging/build.

Q1 closed DevPM Findings **A** and **B** on main (SIMULATED where noted).
Finding **C** is **CLOSED ON MAIN BY Q3 @ `85bb951…`**. Finding **D** is
**CLOSED ON MAIN BY Q5** @ `c7e41a4…` (shell RETAIN + lifecycle strengthen; still not
golden path / physical).

---

## 17. Authority footer

```text
Q0: LANDED (contract + matrix registered on main)
Q1: LANDED / VERIFIED ON MAIN @ 9d8246e… (PR #123); PHYSICAL SONY NOT RUN
Q2: LANDED / VERIFIED ON MAIN @ 2dc918f… (PR #125); tip aa3c18f…; tree 229e8a0…; PHYSICAL SONY NOT RUN
Q3: LANDED / VERIFIED ON MAIN @ 85bb951… (PR #127; reviewed tip cf207ca…); PHYSICAL SONY NOT RUN
Q4: LANDED / VERIFIED ON MAIN @ c32b72c… (PR #129; proof 541718e1…; reviewed tip 28d611e…); reconciliation PR #130 @ 28ff239…
Q5: LANDED / VERIFIED ON MAIN @ c7e41a4… (PR #131; proof 455c4cf…; reviewed tip f1d4535…)
Q6: EXECUTED on d921b07… — COURT-A GAPS REMAIN (G1, G2); COURT-B NOT RUN; repair packet Q6-RP-1 (Q3) required
PRE-Q7: OWNER-PLAYTHROUGH-ELIGIBLE — NOT ISSUED (DevPM verdict after Q6; not a new Q-stage)
Q7: natural owner usability playthrough — NOT BEGUN (requires PRE-Q7)
S05 parent: OPEN / NOT TERMINAL
owner playthrough: PAUSED / GATED (Q0–Q6 + PRE-Q7 eligibility)
Finding C: CLOSED ON MAIN BY Q3 @ 85bb951…; Finding D: CLOSED ON MAIN BY Q5 @ c7e41a4…
functional escapes: repair/verify required — no owner-waiver through PRE-Q7
S04D / S06: NOT AUTHORIZED
REAL MVP: not complete
```
