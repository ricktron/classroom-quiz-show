# Pre-Owner Functional Qualification Contract

- **Document id:** `PRE-OWNER-FUNCTIONAL-QUALIFICATION`
- **Program:** `CQS-REAL-MVP-1`
- **Authorization:** `AUTHORIZE-CQS-PRE-OWNER-Q0-QUALIFICATION-CONTRACT-1`
- **Kind:** durable pre-owner functional qualification contract
- **Status:** **ACTIVE / Q0 CONTRACT REGISTERED**
- **Companion:** [`PRE-OWNER-TEACHER-JOURNEY-MATRIX.md`](PRE-OWNER-TEACHER-JOURNEY-MATRIX.md)
- **Observation base (registration):** `origin/main`
  `67ba2c0027f7e2439bd39bd963a7321be0ab6801` (PR #121 squash merge of
  I-REPAIR-1 Class Setup functional convergence)

```text
This file is documentation / qualification contract only.
It authorizes no product mutation, no Q1 escape repair, no S05 parent
terminalization, no S04D / S06, no merge, and no OWNER-PLAYTHROUGH-ELIGIBLE.
```

```text
routing ≠ authority
naming Q1–Q7 does not start them
```

---

## 1. Purpose

Teachers must be able to trust that ordinary Classroom Quiz Show workflows
work **before** the owner resumes deliberate whole-game / MENUS owner
playthrough. Automated green CI, historian PNGs, and Slice I Scenario D
BLOCKED-then-repaired history are **not** that trust by themselves.

This contract defines:

1. the **Q0→Q7** pre-owner functional qualification ladder;
2. the **evidence taxonomy** and what each class may and may not claim;
3. **semantic interactive-control proof** (presence ≠ success);
4. **contextual repair** return-path rules;
5. **exact-head** and **served-build** binding;
6. **transfer** rules for prior physical / historical evidence;
7. the sole gate that may issue **`OWNER-PLAYTHROUGH-ELIGIBLE`**;
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
the gate in §10 is explicitly issued.

---

## 3. Ladder Q0 → Q7

| Stage | Name | Authorized by this file? | Purpose |
| --- | --- | --- | --- |
| **Q0** | Qualification contract | **Yes (this docs slice)** | Register purpose, taxonomy, matrix, routing, gaps A–D, gate rules |
| **Q1** | Known-escape product repair | **No** | Close recorded functional escapes that block semantic proof (see §11 DevPM A–D + residual Slice I defects). Separate owner auth required |
| **Q2** | Semantic interactive-control automation | **No** | Strengthen / add e2e+unit so matrix rows claim **task success**, not selector presence |
| **Q3** | Contextual-repair path proof | **No** | Prove Fix / Edit / recover / return paths land the teacher back in the interrupted job without false recovery theater where Q1 target forbids it |
| **Q4** | Integrated golden-path automation | **No** | One (or explicitly composed) automated proof: Home → Class Setup → Play → board gameplay → Final → completion / summary, on a proven served build |
| **Q5** | Desktop / served-build exact-head binding | **No** | Bind Electron shell + web served-build provenance to the candidate head; distinguish shell lifecycle from teacher golden path |
| **Q6** | Court A + Court B | **No** | Adversarial / independent review Courts before eligibility (plan in §9) |
| **Q7** | Owner playthrough eligibility | **No** | Sole stage that may issue **`OWNER-PLAYTHROUGH-ELIGIBLE`** after Q0–Q6 evidence |

```text
Q0 registers the ladder.
Q1–Q6 execute under later bounded authorizations.
Q7 alone may issue OWNER-PLAYTHROUGH-ELIGIBLE.
```

Each stage after Q0 requires a **fresh** owner authorization packet. Completing
Q0 does **not** start Q1.

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

## 5. Semantic interactive-control proof

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

### 5.3 Known automation gap (recorded, not repaired in Q0)

**Finding A — Scenario D buzzer-action proof gap (CONFIRMED).**

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

**Q0 disposition:** record gap; **do not repair**.

---

## 6. Contextual repair

### 6.1 Rule

When Class Setup (or Home) offers a Fix / Edit / recover control:

1. the control must land on the **job that was blocked**;
2. after the teacher completes that job, return must restore the **interrupted
   setup/play posture** without unnecessary Session-replace theater **when the
   authorized Q1 target says so**;
3. Game vs Session boundaries remain intact (team count stays Game-owned);
4. recovery confirms remain when Session safety truly requires them.

### 6.2 Finding B — team-count return path (CONFIRMED)

| Item | Observed on `67ba2c0…` |
| --- | --- |
| Current path | `setup-fix-team-count` → authoring Game settings (`authoringFocus: 'team-count'`) → save → Home/authoring **Play** → **Resume class** → **replace Session confirm** → Class Setup |
| Evidence | `menus-i-repair-1-zero-team-fix.spec.ts`, `menus-slice-e-team-sony.spec.ts` |
| Q1 target (contract intent) | **Direct return to Class Setup** after Fix team count / save, without forcing the teacher through Resume + replace as the ordinary contextual-repair path |
| Q0 disposition | Gap recorded; **no product repair in Q0** |

Q3 later proves whatever path Q1 authorizes. Until Q1 lands, automation that
documents the **current** path is honest regression, not Q1-target proof.

---

## 7. Exact-head and served-build

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

**Q0 disposition:** classify as **DESKTOP E2E / RETAIN** for shell lifecycle;
**STRENGTHEN or NEW** separate packs for teacher golden path (Q4/Q5).

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
Q1–Q7 on the MENUS / S05 owner-playthrough frontier.

---

## 9. Court plan — Q6 A + Q6 B

Q6 is **not** executed in Q0. Plan of record:

### Court A — Evidence completeness (pre-eligibility)

| Item | Plan |
| --- | --- |
| Question | Does the journey matrix (§ companion) have semantic proof or an explicit PHYSICAL-ONLY / OWNER-ONLY / QA-escape row for every ordinary-path interaction required before owner playthrough? |
| Inputs | Matrix dispositions; Q1–Q5 receipts; exact-head CI; served-build provenance; DevPM A–D closure status |
| Forbidden | Equating CI green with Court PASS; inventing physical PASS from simulation |
| Outcomes | **COMPLETE** / **GAPS REMAIN** (named rows) / **STOP — authority** |

### Court B — Eligibility recommendation (pre-Q7)

| Item | Plan |
| --- | --- |
| Question | Given Court A COMPLETE, residual QA escapes, and transfer ledger, may Q7 issue **`OWNER-PLAYTHROUGH-ELIGIBLE`**? |
| Inputs | Court A record; open escapes (§12); STATUS/CURRENT agreement; hard-ban audit (no S04D/S06/S05 terminalization smuggled) |
| Forbidden | Issuing eligibility from Court B itself (Court B only **recommends**; Q7 issues) |
| Outcomes | **RECOMMEND ELIGIBLE** / **RECOMMEND HOLD** / **REPAIR REQUIRED** |

Seats and rigor may follow NightWatch / OpenClaw Court protocol when available
as **read-only supplemental**. CQS docs and observed Git remain authoritative.

---

## 10. `OWNER-PLAYTHROUGH-ELIGIBLE` gate

### 10.1 Meaning

```text
OWNER-PLAYTHROUGH-ELIGIBLE
```

means: the owner may **resume** deliberate MENUS / S05 whole-game owner
playthrough on a named exact head without the program falsely claiming that
known functional escapes are already closed.

It is **not**: MENUS Complete, S05 parent terminal, REAL MVP complete, signed
release, Windows physical PASS, or Slice I ACCEPT.

### 10.2 Issue conditions (all required)

1. Q0 contract merged on `main` (this document + matrix + routing);
2. Q1 authorized escapes closed **or** explicitly waived by owner as
   non-blocking with named residual risk;
3. Q2–Q5 evidence recorded on exact heads with served-build provenance;
4. Court A **COMPLETE**; Court B **RECOMMEND ELIGIBLE**;
5. Q7 authorization packet explicitly issues the string
   **`OWNER-PLAYTHROUGH-ELIGIBLE`** and names the eligible head;
6. [`../STATUS.md`](../STATUS.md) and [`../handoff/CURRENT.md`](../handoff/CURRENT.md)
   agree.

### 10.3 Q0 status

**Not issued.** Owner playthrough remains **PAUSED / GATED**.

---

## 11. DevPM findings A–D (Q0 verification — no repair)

| ID | Finding | Q0 verification | Disposition |
| --- | --- | --- | --- |
| **A** | Scenario D buzzer-action proof gap | CONFIRMED — Check scrolls/focuses GIH/Sony profile; no connect/press/UI confirmation proof in Scenario D e2e or `onRevealBuzzersSetup` | **Q1/Q2 escape** |
| **B** | Team-count contextual repair path vs Q1 target | CONFIRMED — current = authoring → Play → Resume → replace → setup; target = direct Class Setup return | **Q1/Q3 escape** |
| **C** | Integrated golden-path gap | CONFIRMED — suites cover fragments (`teacher-home-authoring`, `classroom-setup`, `menus-*`, `final-wager`, `session-summary`, S05 choreography) but **no** single Home→gameplay→Final→completion integrated pack | **Q4 NEW** |
| **D** | Electron `shell.spec.ts` scope | CONFIRMED — shell/security/persistence/API presence/diagnostics; not teacher golden path | **RETAIN shell; do not overclaim** |

---

## 12. QA escape protocol

A **QA escape** is a known defect, coverage hole, or environmental limit that
would otherwise block a stage.

Rules:

1. Record escapes in the active stage receipt with id, evidence class, and
   whether they **block** owner eligibility;
2. Escapes do **not** silently become PASS;
3. Owner may waive an escape as non-blocking only in a named authorization;
4. Waived escapes remain visible in STATUS/handoff until closed;
5. Facilitator observation ≠ owner waiver;
6. Q0 itself records A–D as escapes; closing them is **out of Q0 scope**;
7. Accepted **OPEN / LOW** residuals (example: H4 salvage collapsed detail —
   primary status honest; collapsed “More detail” may still deny save) are
   **not** Q1 product escapes unless reclassified. They carry to **Q6 Court /
   Q7 eligibility** and require **explicit owner authorization** to waive —
   Q0 does **not** grant any waiver.

---

## 13. Routing impact (minimal)

While this contract is active and Q7 has not issued eligibility:

| Topic | Required routing |
| --- | --- |
| Next contributor action | Do **not** send Rick to owner walkthrough / Slice I re-gate / S05 whole-game playthrough |
| S05 parent | **OPEN / NOT TERMINAL** |
| Prior MENUS Slice I playthrough | **NOT RUN** as acceptance (Scenario D was BLOCKED; I-REPAIR-1 merged; re-gate **not** authorized here) |
| Owner playthrough | **PAUSED / GATED** behind Q0–Q6 + Q7 eligibility |
| S04D / S06 | **NOT AUTHORIZED** |
| REAL MVP | **not** complete |
| PR #110 / #118 | Observe only; do not mutate from this contract |

Canonical status/handoff must link this file. See STATUS / CURRENT updates in
the Q0 delivery PR.

---

## 14. Open PRs observed at Q0 registration (read-only)

| PR | State | Note |
| --- | --- | --- |
| [#121](https://github.com/ricktron/classroom-quiz-show/pull/121) | **MERGED** | Squash/main `67ba2c0…` — I-REPAIR-1 Class Setup |
| [#110](https://github.com/ricktron/classroom-quiz-show/pull/110) | OPEN **draft**, conflicting | Untouched by Q0 |
| [#118](https://github.com/ricktron/classroom-quiz-show/pull/118) | OPEN stale @ `f01a06f…`, conflicting | Untouched by Q0 |

---

## 15. Verification for this docs slice

Required for Q0 delivery:

```bash
git diff --check
```

Optional docs-only hygiene if present in packet. Do **not** claim
`npm run verify`, Playwright, Desktop, or CI product PASS unless those
commands were actually run for this head.

---

## 16. Non-claims

This contract does **not** claim:

- Q1–Q7 execution or PASS;
- OWNER-PLAYTHROUGH-ELIGIBLE;
- MENUS Complete / Slice I ACCEPT;
- S05 parent terminalization;
- closure of DevPM A–D product gaps;
- Windows physical runtime; Sony physical re-qual on `67ba2c0…`;
- signed / notarized teacher release;
- REAL MVP complete.

---

## 17. Authority footer

```text
Q0: CONTRACT REGISTERED
Q1–Q6: NOT STARTED BY THIS FILE
Q7: OWNER-PLAYTHROUGH-ELIGIBLE — NOT ISSUED
S05 parent: OPEN / NOT TERMINAL
owner playthrough: PAUSED / GATED
S04D / S06: NOT AUTHORIZED
REAL MVP: not complete
```
