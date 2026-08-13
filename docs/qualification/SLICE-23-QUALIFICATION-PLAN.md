# Slice 23 — Classroom Release Qualification Plan

**Slice identifier:** `CQS-SLICE-23-CLASSROOM-RELEASE-QUALIFICATION`
**Parent authorization:** `AUTHORIZE-CQS-SLICE-23-CLASSROOM-RELEASE-QUALIFICATION-1`
**Terminal reconciliation authorization:**
`AUTHORIZE-CQS-SLICE-23-TERMINAL-POST-MERGE-CANONICAL-RECONCILIATION-1`
**Evidence-state ID (current frontier):**
`CQS-SLICE-23-TERMINAL-POST-MERGE-CANONICAL-RECONCILIATION-ES-1`
**Prior merge-verification evidence-state:**
`CQS-SLICE-23-PR65-CORRECTED-EXACT-HEAD-MERGE-ES-1`
**Prior independent re-review authorization:**
`AUTHORIZE-CQS-SLICE-23-PR65-CORRECTED-HEAD-FRESH-INDEPENDENT-RE-REVIEW-1`
**Prior D–I / owner-evidence evidence-states:**
`CQS-SLICE-23-BROAD-STAGES-D-I-QUALIFICATION-RESUMPTION-ES-1`;
`CQS-SLICE-23-PR65-OWNER-EVIDENCE-COMPLETION-ES-1`
**Canonical qualification record on `main` after PR #65 merge.**

> **How to read this document.** Sections 1–12 are the **CURRENT TERMINAL
> POST-MERGE STATE** at canonical `main`
> `180d7680779e672d1bf2326250952fc38a3a5411`. Section 13 preserves **HISTORICAL
> PRE-REPAIR EVIDENCE** from PR
> [#60](https://github.com/ricktron/classroom-quiz-show/pull/60) head
> `6a6d34430fc765e9a63fa9bd2eac073e6b4ef201`, originally observed against
> `c047ca71640c3d717eacd1092a899ca6d16b2115`. If current and historical wording
> conflict, **current state wins**. Historical observations remain valid as
> history; they are **not** current product-state conclusions.

> **Slice 23 is COMPLETE / QUALIFIED / MERGED / POST-MERGE VERIFIED.** Broad
> Stages D–I are **executed** with owner evidence **complete**. Qualification
> evidence PR [#65](https://github.com/ricktron/classroom-quiz-show/pull/65) is
> **TERMINAL / MERGED / POST-MERGE VERIFIED**. No additional Slice 23
> qualification, owner-evidence, repair, review, merge, or reconciliation lane
> is owed. See
> [`../receipts/2026-08-12-slice-23-broad-d-i-qualification.md`](../receipts/2026-08-12-slice-23-broad-d-i-qualification.md)
> and
> [`../receipts/2026-08-12-slice-23-terminal-post-merge-reconciliation.md`](../receipts/2026-08-12-slice-23-terminal-post-merge-reconciliation.md).
> The overall CQS MVP is **NOT COMPLETE**. Required post-Slice-23 MVP
> continuation (C-3/C-6 desktop packaging) is **OPEN / NOT BEGUN**. No product
> code, test, dependency, workflow, or deployment configuration is changed by
> this documentation reconciliation.

---

## 1. Current canonical frontier

| Item | Current value |
| --- | --- |
| Canonical `main` | `180d7680779e672d1bf2326250952fc38a3a5411` |
| Slices 1–23 | **COMPLETE** |
| Slice 23 | **COMPLETE / QUALIFIED / MERGED / POST-MERGE VERIFIED** |
| Final wager durability (PR #61) | **CLOSED / MERGED / POST-MERGE VERIFIED** |
| Teacher first-run surface (PR #62) | **CLOSED / MERGED / POST-MERGE VERIFIED** |
| Aggregate local-data reset (PR #63) | **CLOSED / MERGED / POST-MERGE VERIFIED** |
| Post-repair reconciliation (PR #64) | **CLOSED / MERGED / POST-MERGE VERIFIED** |
| Historical qualification PR #60 | **CLOSED / UNMERGED / HISTORICAL / SUPERSEDED** |
| Qualification evidence PR #65 | **TERMINAL / MERGED / POST-MERGE VERIFIED** |
| OVERALL CQS MVP | **NOT COMPLETE** |
| Required post-Slice-23 MVP continuation | still exists / **not begun** |
| Post-MVP arcs | **inactive** |
| D–I packet verdict | transferred; Slice 23 terminal completion recorded |

Contract versions at this base (unchanged by this docs lane; held from
`docs/STATUS.md` / repaired product):

workbook **1**; AuthoringDraft **1**; pack format **1**; canonical game schema
**1**; GameDefinition **1**; public-state wire **8**; sync envelope **2**;
private active-session wire **1**; IndexedDB **4**; Sony mapping **1**; Sony
supported profile **1**; Session Summary **1**; completed-summary envelope **1**;
competitive profile **1**.

**Default qualification expectation remains: NO PRODUCT-CONTRACT CHANGE** from
Slice 23 qualification itself. The three terminal repair lanes were separately
authorized product repairs, not Slice 23 feature origin.

---

## 2. Finding reconciliation — current dispositions

| Finding | Current disposition | Via |
| --- | --- | --- |
| `CQS-Q23-BLOCKER-01` | **CLOSED / REPAIRED / MERGED / VERIFIED** | PR [#62](https://github.com/ricktron/classroom-quiz-show/pull/62) |
| `CQS-Q23-BLOCKER-02` | **CLOSED / REPAIRED / MERGED / VERIFIED** | PR #62 |
| `CQS-Q23-HIGH-01` | **CLOSED / REPAIRED / MERGED / VERIFIED** | PR #62 |
| `CQS-Q23-HIGH-02` | **CLOSED / REPAIRED / MERGED / VERIFIED** | PR #62 |
| `CQS-Q23-HIGH-03` | **CLOSED / REPAIRED / MERGED / VERIFIED** | PR [#63](https://github.com/ricktron/classroom-quiz-show/pull/63) |
| Final-wager durability race | **CLOSED / REPAIRED / MERGED / VERIFIED** | PR [#61](https://github.com/ricktron/classroom-quiz-show/pull/61) |
| PR #63 M1 keyboard-clear false-success | **CLOSED / CORRECTED / RE-REVIEWED / MERGED / VERIFIED** | PR #63 corrected head |
| `CQS-Q23-LOW-01` / `F-UX-01` | **OPEN / RETAINED / LOW** | not repaired |
| `CQS-Q23-LOW-02` | **OPEN / LOW** — measured during Stage I; retained | not optimized |
| `CQS-Q23-CLASS-B-01` | **Class B continuation candidate** | not a Slice 23 defect; not re-pinned |
| `CQS-OD-066` | **UNRESOLVED** | does not block Slice 23 classroom qualification on existing evidence |

**Do not promote or close `LOW-01` / `F-UX-01` merely because the other findings
are closed.** Historical confirmation that BLOCKER-01/02, HIGH-01/02/03, the
Final durability race, and M1 were real defects is preserved in §13. Those
defects are **superseded as current product state**, not erased.

---

## 3. Terminal repair evidence chain

### PR #61 — Final wager durability

| Fact | Value |
| --- | --- |
| Authorization | `AUTHORIZE-CQS-SLICE-23-FINAL-WAGER-DURABILITY-REPAIR-1` |
| Authorized pre-repair base | `c047ca71640c3d717eacd1092a899ca6d16b2115` |
| Accepted exact head | `1f431094f1c6c377aa50dc61b72964b042174e4e` |
| Squash (now ancestor of `main`) | `cd5f5580b6befa0b268a5227f60c67d09d512b05` |
| Merge | **2026-08-11T14:06:58Z** |
| Lane | **TERMINAL** |

**Key disposition:** teacher-visible `Saved` now follows durable persistence;
immediate-refresh regression green. Post-merge verification:
`CQS-SLICE-23-PR61-MERGE-ES-1` — **PASS**.

### PR #62 — Teacher first-run surface

| Fact | Value |
| --- | --- |
| Authorization | `AUTHORIZE-CQS-SLICE-23-TEACHER-FIRST-RUN-SURFACE-REPAIR-1` |
| Authorized base | `cd5f5580b6befa0b268a5227f60c67d09d512b05` |
| Accepted exact head | `ecdbd2fdb26b4896f63dc0cfadb914433f1aec57` |
| Squash | `b5c91c05dd081cac9e7d25ff41175830f8ba9ef4` |
| Merge | **2026-08-11T17:42:28Z** |
| Lane | **TERMINAL** |

**Key disposition:** an ordinary teacher can reach a loaded playable game using
visible teacher-facing controls; the hidden session prerequisite was removed
from the teacher path; teacher quick start added
([`../teacher/QUICK_START.md`](../teacher/QUICK_START.md)).

### PR #63 — Aggregate local-data reset

| Fact | Value |
| --- | --- |
| Authorization | `AUTHORIZE-CQS-SLICE-23-AGGREGATE-LOCAL-DATA-RESET-REPAIR-1` |
| Authorized base | `b5c91c05dd081cac9e7d25ff41175830f8ba9ef4` |
| Rejected head (historical) | `6f38f48181fb9f7a6578d4adc02d0d98734ccb08` |
| Corrected / accepted head | `c430c1fcd21b61ea67092a542fe0630631e98c9e` |
| Squash (ancestor of current `main`) | `22647fdc004d5e60aee2903c38cd8079731e63af` |
| Merge | **2026-08-12T01:23:39Z** |
| Lane | **TERMINAL** |

**Key disposition:** all CQS-owned local durable data is covered; blocked/error
paths do not claim success; keyboard-clear false-success **M1** was independently
found and corrected; post-merge reset E2E green. Merge evidence:
`CQS-SLICE-23-PR63-MERGE-ES-1` — **PASS**.

Post-merge CI on squash `22647fd…`: run
[`31553449880`](https://github.com/ricktron/classroom-quiz-show/actions/runs/31553449880)
**success**; Pages run
[`31553449812`](https://github.com/ricktron/classroom-quiz-show/actions/runs/31553449812)
**success**. These are merge/deploy observations, **not** Stage I live-deployment
qualification.

---

## 4. Current Stage A–L matrix

Preserve the established Stage A–L structure. Dispositions below record the
**executed current D–I matrix** and the **terminal post-merge Slice 23
completion** on canonical `main` `180d768…`. Evidence-class distinctions
remain: §4.1 is transferred PR #63 post-merge baseline, not new D–I evidence;
Stages D–I themselves were executed and recorded in the 2026-08-12 receipt;
this reconciliation does **not** re-run D–I.

| Stage | Content | Current disposition |
| --- | --- | --- |
| **A** | Canonical / preflight | **CURRENT BASE RE-ESTABLISHED** — canonical `main` = `180d768…` (PR #65 squash). |
| **B** | Clean automated baseline | **CURRENT GREEN** — local `npm run verify` + build + `CI=1 npm run test:e2e` (**367** passed / **14** skipped) on pre-merge `06f486c…`; post-merge CI run `31656340997` success on `180d768…`. |
| **C** | Clean-teacher first launch | **PASS / CLEARED.** §71 cleared for resumption; clean-teacher path re-verified post-repair. |
| **D** | Import / authoring / pack / data lifecycle | **PASS**. See 2026-08-12 D–I receipt. |
| **E** | Gameplay / Final / undo / recovery | **PASS**. Final immediate-refresh durability re-verified. |
| **F** | Presentation / accessibility / themes / screen reader | **PASS** — keyboard/semantic/themes/resolutions retained; actual macOS **VoiceOver OWNER-OBSERVED PASS**. |
| **G** | Physical projector / viewing distance / audio | **PASS** — owner **Projector + Audio PASS**; Slice 22 listening remains transferred supporting evidence. |
| **H** | Supported Sony profile | **PASS** — Slice 21 physical transfer + current owner **Sony PASS** smoke. `F-UX-01` remains **LOW**. |
| **I** | Deployment / PWA / update / offline / reset | **PASS / QUALIFIED WITH RECORDED NON-BLOCKING LIMITATIONS** — provenance/golden path/offline/reset/installed-PWA owner path PASS; update-flow full stale→new simulation remains a recorded limitation; `CLASS-B-01` retained; `LOW-02` measured/retained. |
| **J** | Findings / limitations / continuation | **ACTIVE** — no new Class A; Class B / LOW / OD-066 unchanged in severity; C-3 desktop packaging discovery recorded as required post-Slice-23 MVP work. |
| **K** | Repair loops | **FOUR TERMINAL LANES COMPLETE:** PR #61–#64. No new repair authorized from this packet. |
| **L** | Terminal independent review | **COMPLETE** — independent exact-head re-review PASS on `5416696e…`; PR #65 squash-merged `180d768…` and post-merge verified. Slice 23 **COMPLETE**. |

### 4.1 Stage B — transferred PR #63 post-merge baseline

Evidence class: **PR #63 post-merge local verification** at squash
`22647fdc004d5e60aee2903c38cd8079731e63af`
(`CQS-SLICE-23-PR63-MERGE-ES-1`). This reconciliation packet did **not** re-run
the product matrix.

| Check | Result |
| --- | --- |
| `npm ci` | **PASS** |
| `git diff --check` | **PASS** |
| `npm run verify` | **PASS** |
| `CI=1 npm run verify:all` | **PASS** |
| Unit | **143** files / **2424** passed / **2** skipped |
| Full Playwright | **367** passed / **14** skipped / **0** failed / **0** retries/flakes |
| Build / PWA | **PASS** — **22** precache entries |

Do not treat this reconciliation as new substantive D–I qualification evidence.

---

## 5. Evidence transfer matrix

### TRANSFER / CURRENT

| Source | What transfers |
| --- | --- |
| PR #61 | Final wager durability focused evidence |
| PR #62 | Teacher first-run / host hierarchy / auto-session-load evidence |
| PR #63 | Aggregate reset / retention-deletion / M1 correction evidence |
| Slice 21 | Physical Sony controller evidence, causally unaffected |
| Slice 22 | Owner listening evidence, causally unaffected |
| Current `verify:all` | Canonical repaired product baseline (PR #63 post-merge at `22647fdc…`; current main `180d768…` post-merge CI also green) |

### HISTORICAL ONLY

- Pre-repair clean-teacher failures (BLOCKER-01/02, HIGH-01/02)
- Pre-repair Final durability failures (14/15 no-retry; 10/10 immediate probes)
- Pre-repair absence-of-reset evidence (HIGH-03)
- VM HS-1 / HS-2 environment denials (not product defects)
- Packet-1 exact-head CI baseline of the **pre-repair** tree
- Original §71 hard-stop firing

### SUPERSEDED AS CURRENT PRODUCT STATE

Do **not** erase their historical role:

- BLOCKER-01/02 **present**
- HIGH-01/02/03 **present**
- Final save false durability
- M1 false aggregate-reset success

---

## 6. `CQS-Q23-LOW-02` and `CQS-Q23-CLASS-B-01`

### `CQS-Q23-LOW-02` — large first-load JS chunk

**Status: OPEN / LOW.** Measured during Stage I; retained. **Do not optimize it
in this packet.**

Historical observation (CI run `31446536299` on the pre-repair tree):
`dist/assets/index-BYR1CyC_.js` was **1 246.02 kB (gzip 374.25 kB)**, tripping
Vite’s 500 kB chunk warning; PWA precache **1 455.44 KiB across 22 entries**.

Current Stage I measurement (D–I receipt, qualification build): initial JS
**1256.80 kB**; gzip **375.32 kB**; precache **22** entries; precache size
**1466.29 KiB**.

This remains a **one-time** install/update cost question for school Wi-Fi, not a
speculative optimization target.

### `CQS-Q23-CLASS-B-01` — non-registry `cdn.sheetjs.com` dependency

**Status: Class B continuation candidate** unless later evidence changes its
classification.

The `xlsx` dependency resolves from `cdn.sheetjs.com`, not the npm registry.
Environments that deny that host cannot `npm ci`. GitHub-hosted CI presently
reaches it. This is **not** claimed as a current product-runtime defect.
**Do not re-pin SheetJS in this packet.**

---

## 7. Continuation register (reconciled)

Slice 23 does **not** promote, authorize, or implement post-MVP features.
Candidates from PR #60, updated:

| # | Candidate | Current disposition |
| --- | --- | --- |
| **C-1** | Teacher-facing host UI | **Fulfilled by PR #62** for the identified Slice 23 defect. Broader future UX ideas are **not** automatically erased. |
| **C-2** | Teacher-facing quick start | **Fulfilled for current repair scope by PR #62** ([`../teacher/QUICK_START.md`](../teacher/QUICK_START.md)). |
| **C-3** | Startup / launch / distribution model | **OPEN** — required post-Slice-23 MVP continuation. Owner reached classroom qualification and reported he did **not** know how to start CQS without the deployed URL/instructions, then requested conventional one-click desktop launch (no Terminal; Windows `.exe`/installer; macOS `.app`/`.dmg`; simple Host + Display; local-first/offline preserved; PWA/web alternate). Installed-PWA Chrome-tab close caveat recorded as non-blocking friction. **Not implemented in Slice 23.** |
| **C-4** | Aggregate local-data reset | **Fulfilled by PR #63.** |
| **C-5** | Controller setup/tutorial evolution | `F-UX-01` remains **LOW**; guided verification may remain a continuation/polish candidate; reaction minigame stays **post-MVP**. |
| **C-6** | Packaging/distribution / non-registry dependency | **OPEN** — same desktop-packaging discovery as C-3; also retains `CLASS-B-01` SheetJS packaging/supply-chain concern. |
| **C-7** | Raspberry Pi 5 beta readiness | **Still deliberately outside** Slice 23 acceptance unless a later Program Orchestrator decision promotes it. |
| **C-8** | Cross-device LAN host/display | **Future direction**; not Slice 23 repair scope. |

Explicitly held as **post-MVP** (unchanged): theme song; alternate sound packs;
team-specific audio identity; reaction-time minigames; broad
presentation/identity effects; other controller families; question bank; broader
AI authoring; commercialization.

---

## 8. `CQS-OD-066` — GCS learning-target linkage

**Status: UNRESOLVED.**

`CQS-OD-066` is **"GCS learning-target linkage"**, arc `CQS-ARC-INSIGHT` /
`CQS-OPP-GCS-LINKAGE`
([`../decisions/EXPANDED-VISION-OWNER-DECISIONS.md`](../decisions/EXPANDED-VISION-OWNER-DECISIONS.md)).
It does **not** block Slice 23 classroom qualification based on existing
evidence. Whether it affects later MVP completion remains an owner/program
decision. **Do not resolve it here.**

---

## 9. PR #60 disposition

PR [#60](https://github.com/ricktron/classroom-quiz-show/pull/60) is **historical
only** and must not be treated as current product state.

| Item | Value |
| --- | --- |
| Role | **HISTORICAL QUALIFICATION-EVIDENCE PR** |
| Current product-state role | **SUPERSEDED FOR CURRENT PRODUCT STATE** |
| Closure | **CLOSED / UNMERGED / HISTORICAL / SUPERSEDED** (closed **2026-08-12T20:45:09Z**; `mergedAt` null) |
| Head | `6a6d34430fc765e9a63fa9bd2eac073e6b4ef201` |
| Base (stale vs repaired `main`) | `c047ca71640c3d717eacd1092a899ca6d16b2115` |

PR #60 contains valuable historical evidence but is based on pre-repair `main`
and conflicts with repaired canonical `main`. It must **NOT** be:

- rebased;
- force-updated;
- merged into repaired `main`;
- used as the current qualification record.

Living frontier docs must **not** describe PR #60 as still pending closure.
Current canonical qualification evidence lives on `main` at `180d768…` plus the
D–I receipt
[`../receipts/2026-08-12-slice-23-broad-d-i-qualification.md`](../receipts/2026-08-12-slice-23-broad-d-i-qualification.md)
and the terminal reconciliation receipt
[`../receipts/2026-08-12-slice-23-terminal-post-merge-reconciliation.md`](../receipts/2026-08-12-slice-23-terminal-post-merge-reconciliation.md).

---

## 10. Binding Slice 23 contract (unchanged)

From
[`../decisions/ROADMAP-AMENDMENT-004-mvp-audio-and-release-rebalance.md`](../decisions/ROADMAP-AMENDMENT-004-mvp-audio-and-release-rebalance.md)
§11 and [`../plans/MVP-ARC.md`](../plans/MVP-ARC.md) “Slice 23”:

- **Purpose:** prove a teacher can rely on the product in class.
- **Preserved gates:** clean-install golden path; pack import/export; team and
  input setup; complete board and Final session; timer, buzz, score, correction,
  undo, recovery, summary, comparison; 1920×1080 and 1280×720; 1/4/6/8 teams;
  long names; negative scores; image failure; reduced motion; high contrast;
  grayscale and projector-washout; keyboard-only; semantic/screen-reader review;
  physical viewing-distance; PWA install, update, offline, reset;
  owner-performed deployment verification; support matrix and known limitations;
  retention/deletion documentation.
- **Added gates:** Slice 22 audio qualification; Phase 2B visual-fidelity
  calibration.
- **Binding rule:** *no architecture or new feature may originate in Slice 23.*
  Material defects require **separately bounded repair**.
- **Raspberry Pi 5:** observational smoke test only; **not** an acceptance gate.
- **Definition of done:** qualification matrix receipt (including audio and
  Phase 2B gates); owner live-deployment verification; support matrix;
  retention/deletion docs; `verify:all` green.
- **Owner gate:** separate authorization; **owner live verification cannot be
  satisfied by CI alone.**

---

## 11. Terminal completion state

**SLICE 23 CLASSROOM RELEASE QUALIFICATION:
COMPLETE / QUALIFIED / MERGED / POST-MERGE VERIFIED.**

PR [#65](https://github.com/ricktron/classroom-quiz-show/pull/65) is the
docs-only qualification-evidence PR. It is **TERMINAL / MERGED / POST-MERGE
VERIFIED**. Independent exact-head re-review **PASS**. No additional Slice 23
qualification lane is owed.

Separate authorization remains required for:

- additional product repair of any kind;
- post-Slice-23 MVP implementation (including C-3/C-6 desktop packaging);
- any otherwise unauthorized mutation;
- declaring the overall CQS MVP complete.

---

## 12. Explicit non-claims (this terminal reconciliation)

- **No** product code, schema, contract, test, dependency, workflow, or
  deployment configuration was changed in this documentation reconciliation.
- Broad Stages D–I are **not** being re-run here; they were already executed
  and recorded, then transferred across the docs-only PR #65 squash.
- **No** repair of `LOW-01` / `F-UX-01`.
- **No** SheetJS re-pin; **no** first-load chunk optimization.
- **No** post-Slice-23 MVP functionality begun (including C-3/C-6 desktop
  packaging).
- Slice 23 **is** complete as a qualification slice; this does **not** complete
  the overall CQS MVP.
- **OVERALL CQS MVP = NOT COMPLETE.**
- PR #65 **is** merged / terminal / post-merge verified.
- PR #60 remains **CLOSED / UNMERGED / HISTORICAL / SUPERSEDED** and is not
  being reopened or merged.
- This document does **not** merge itself.

Canonical routing companions:

- [`../STATUS.md`](../STATUS.md)
- [`../handoff/CURRENT.md`](../handoff/CURRENT.md)
- [`../receipts/2026-08-12-slice-23-broad-d-i-qualification.md`](../receipts/2026-08-12-slice-23-broad-d-i-qualification.md)
- [`../receipts/2026-08-12-slice-23-terminal-post-merge-reconciliation.md`](../receipts/2026-08-12-slice-23-terminal-post-merge-reconciliation.md)

---

## 13. HISTORICAL PRE-REPAIR EVIDENCE

> **Snapshot class.** The following records observations from PR #60 at head
> `6a6d34430fc765e9a63fa9bd2eac073e6b4ef201` against product base
> `c047ca71640c3d717eacd1092a899ca6d16b2115`. They remain historically valid.
> Several **current-state conclusions** have been superseded by PRs #61–#63
> (§2–§5). Do not treat this section as the live findings register.

Historical document identity (PR #60):

- Authorization: `AUTHORIZE-CQS-SLICE-23-CLASSROOM-RELEASE-QUALIFICATION-1`
- Evidence state: `CQS-SLICE-23-CLASSROOM-RELEASE-QUALIFICATION-ES-1`
- Stages recorded: Stage 0 discovery + packet-1 Stage B/C attempt + packet-2
  local Mac Stage B / Stage C / Final disposition
- Historical conclusion at that head: **§71 hard stop TRIGGERED**; two bounded
  repair packets prepared; **neither repair implemented in PR #60**; Slice 23
  not terminal; overall MVP not complete.

### 13.1 Historical provenance (Stage 0 / packet 1 VM)

| Item | Historical value |
| --- | --- |
| Host / user | `vm` / `root` |
| CWD | `/home/user/classroom-quiz-show` |
| Branch | `claude/cqs-slice-23-qualification-97p5vj` |
| HEAD / `origin/main` | `c047ca71640c3d717eacd1092a899ca6d16b2115` |
| Working tree | clean |
| Open PRs at Stage 0 | none |

`origin/main` tip line then: `c047ca7 docs(slice-22): reconcile post-merge
canonical state (#59)`.

### 13.2 Historical environment hard stops (not product defects)

**HS-1 — VM `npm ci` denied `cdn.sheetjs.com`.** `xlsx` is pinned to
`https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz`. Packet-1 VM session:
`npm error code E403`. Local `verify` / `verify:all` **could not run** there.
A stray global `eslint` failure was **not** a project lint finding.

**HS-2 — VM could not reach GitHub Pages.**
`https://ricktron.github.io/classroom-quiz-show/` returned CONNECT 403. No
deployed-commit, PWA, update, offline, or live-route claim originated from that
session.

HS-1 blocked toolchain Stages B/C/D/E/F and the local half of I. HS-2 blocked
only deployed-environment gates. Owner-assisted physical/audio/screen-reader
gates were unaffected by either hard stop.

Packet-2 on `Ricks-MacBook-Air.local` / `macdaddy` **could** reach SheetJS and
ran local Stage B/C. HS-1/HS-2 remain historical environment facts and
distribution-risk inputs (`CLASS-B-01`), not current product blockers.

### 13.3 Historical findings — original observations

These descriptions are **historical**. Current dispositions are in §2.

#### `CQS-Q23-BLOCKER-01` — host presented as a non-gameplay developer harness

- **Affected workflow:** startup → understand where to begin → load a game.
- **Evidence then:** `src/routes/HostRoute.tsx`,
  `src/host/FoundationControls.tsx`.
- **Observed then:** Host status copy **"No active game … Game setup, rounds,
  and scoring arrive in a later slice — this foundation deliberately ships
  without them."** That copy was **stale and false** at `c047ca7…` (board, teams,
  scoring, timers, buzz, Final, summary, packs, and authoring were already
  `Complete`). Real teacher capability sat inside `FoundationControls`, tagged
  **"Foundation / testing controls — not gameplay"**, heading **"State & event
  core (Slice 2)"**, intro **"They are diagnostics, not a game."** Developer
  vocabulary and raw internals were on the ordinary teacher path.
- **Packet-2 live confirmation (clean Chromium profile, production preview):**
  **CONFIRMED BLOCKER.** Ordinary-teacher credible first-run route without
  developer vocabulary? **NO.**
- **Current:** CLOSED via PR #62. Do not describe current host chrome as still
  saying gameplay “arrives later.”

#### `CQS-Q23-BLOCKER-02` — loading required an undiscoverable session prerequisite

- **Observed then:** every content-loading panel was gated on session state;
  import refused with **"Initialize a session first, then import again."** The
  only satisfying control was **"Initialize / reset session"** inside the “not
  gameplay” panel.
- **Packet-2 reproduction:** Load board+Final sample → Import game **without**
  session init → validated-but-not-loaded + initialize-session message; sample
  init disabled until session existed. **CONFIRMED BLOCKER.**
- **Current:** CLOSED via PR #62 (hidden prerequisite removed from teacher path).

#### `CQS-Q23-HIGH-01` — content loading sat below gameplay panels

- **Observed then:** render order was board → timer → Final → local input →
  gamepad → scoring → summary → ledger, and only **then** import / spreadsheet /
  pack.
- **Packet-2:** **CONFIRMED HIGH.**
- **Current:** CLOSED via PR #62.

#### `CQS-Q23-HIGH-02` — no teacher-facing documentation

- **Observed then:** `README.md` was developer-centric; repository search for
  “Teacher Guide” / “Getting started” / “Quick start” returned **no match**.
- **Packet-2:** **CONFIRMED HIGH.**
- **Current:** CLOSED via PR #62 (`docs/teacher/QUICK_START.md`). Broader future
  teacher-UX ideas are not automatically erased (C-1/C-2).

#### `CQS-Q23-HIGH-03` — no user-facing “clear all local CQS data”

- **Observed then:** six object stores (`savedDefinitions`, `activeSessions`,
  `coordination`, `completedSummaries`, `packMediaAssets`, `sonyBuzzMappings`);
  **no `deleteDatabase` in `src/`**; no aggregate reset control. Deletion was
  per-item only. Favourable note then: because **no control claimed** “clear all
  local CQS data”, the lying-control failure mode did **not** apply. The finding
  was **absence of capability**.
- **Packet-2:** `clearAll` regex false on loaded host. **CONFIRMED HIGH.**
- **Current:** CLOSED via PR #63 (capability added; success claims truthful,
  including M1 correction).

#### `CQS-Q23-LOW-01` / `F-UX-01`

Ordinary setup still exposed some WebHID/Gamepad vocabulary. Packet-2: after a
game loaded, keyboard and controller/Sony surfaces were findable; **no live
evidence promoted F-UX-01 beyond LOW**; **not collapsed into BLOCKER-01**.
**Current: still OPEN / RETAINED / LOW.**

#### `CQS-Q23-LOW-02` and `CQS-Q23-CLASS-B-01`

Recorded historically as in §6. Classifications unchanged.

### 13.4 Historical teacher-workflow map (pre-repair)

Observed at `c047ca7…`, not assumed:

```
production URL (or npm run dev)
  └─ #/ RootRoute — "Choose a screen": Open Host | Open Display
       └─ #/host HostRoute
            ├─ private-host banner (good: explicit "do not project")
            ├─ Theme radio group (default | high-contrast)
            ├─ "No active game" + STALE "arrives in a later slice" copy
            ├─ "Open display in new window" button  ← display workflow (good)
            └─ FoundationControls  ← "not gameplay" tag; contains EVERYTHING
                 ├─ PersistenceControls (resume/discard, saved definitions)
                 ├─ AudioControls
                 ├─ [session commands fieldset]
                 │    ├─ Initialize / reset session   ← REQUIRED PREREQUISITE
                 │    ├─ Advance sequence / Mark waiting / Set private note
                 │    ├─ Undo last reversible
                 │    ├─ Public status code button grid
                 │    ├─ Private state dump + raw event history
                 │    ├─ Initialize sample game / …with unsupported round
                 │    ├─ Game session host-only diagnostics
                 │    ├─ Board / Timer / Final / Keyboard / Gamepad / Scoring
                 │    ├─ Session summary · Completed-summary ledger
                 │    └─ Import JSON · Spreadsheet authoring · Pack import
                 └─ Export JSON · Export pack
```

**Positive observations to preserve** (must not be lost in repair or
qualification):

- Private/public separation was already explicit: host banner + dedicated
  `Open display in new window` using a validated, base-path-aware absolute URL
  carrying only the validated theme ID. A teacher was **not** required to type
  `#/display` by hand.
- Recovery was explicitly opt-in (`Resume session` / `Discard recovery`), never
  silent.
- Audience display was a separate route with Phase 2B composition.
- Substantial automated e2e base already existed (`pwa-offline`,
  `projector-safety`, `audience-display`, `theme-system`,
  `persistence-recovery`, `portable-packs`, `presentation-audio`).

### 13.5 Historical Final durability reproduction

**Not erased.** Pre-repair focused disposition at packet 2:

Method:

1. `CI=1 npx playwright test tests/e2e/final-wager.spec.ts -g "a refresh mid-Final resumes every committed wager" --retries=0 --repeat-each=5 --workers=1`
2. Immediate-reload IndexedDB probe after UI `Saved: 100` (post-reload inspect
   only — a pre-reload IDB read accidentally settled the write queue).
3. Contrast run with `SETTLE_MS=1000` before reload.

Playwright, retries disabled:

| Project | Attempts | Failures | Passes |
| --- | --- | --- | --- |
| desktop-1080p | 5 | **5** | 0 |
| projector-720p | 5 | **5** | 0 |
| mobile-host | 5 | **4** | 1 |
| **Total** | **15** | **14** | **1** |

**Immediate-reload probe:** **10/10** → `A_not_durable_at_reload` — after UI
showed `Saved: 100`, post-reload durable session ended at `FINAL_WAGER_STARTED`
with **zero** `FINAL_TEAM_WAGER_RECORDED` events; resume UI stayed
`Not saved yet` for 5 s.

**Settle 1000 ms before reload:** **6/6 PASS** — durable row then contained
`FINAL_TEAM_WAGER_RECORDED` wager 100 for `basalts`, UI restored `Saved: 100`.

Historical boundary classification: **A** — wager was **not** durably persisted
at the moment the UI reported it saved. Historical Slice 23 disposition:
**RELEASE BLOCKER — REPAIR REQUIRED.**

Local packet-2 `CI=1 npm run verify:all` at the pre-repair tree: lint / typecheck
/ unit / build PASS; Playwright **346 passed / 14 skipped / 3 failed / 9 did not
run**; the 3 failures were the inherited Final mid-refresh case on all three
projects, each exhausting retries 0/1/2. **9/9** attempt rows for that case
failed under `CI=1` retries=2. Unit then: **140 files / 2397 passed / 1
skipped**. Build: `index-BYR1CyC_.js` 1246.02 kB; PWA precache **22 entries
(1455.44 KiB)**.

Prior exact-head CI on PR #60 product-identical tree (run `31446536299`, head
`9fb3ee5…`): constituent checks green; Playwright **355 passed / 14 skipped / 3
flaky / 0 terminal failures** — all 3 flakes the same Final mid-refresh
signature, retry-resolved. A second product-identical CI sample (`31447234996`,
`7948a3a…`) showed **2** flaky projects. **5 of 6** project-runs flaked; affected
projects **changed between runs** with no product change. Packet 1 correctly
refused to treat retry-resolution as a §43 disposition.

**Current:** race CLOSED via PR #61. Historical failure counts remain evidence
that the defect was real.

### 13.6 Historical Stage B / C packet 1 (VM)

Packet: `CQS-SLICE-23-STAGE-B-C-LOCAL-QUALIFICATION-PACKET-1`.

- Preflight PASS; platform Linux (not macOS).
- B-local: `npm ci` FAIL E403; `verify` / `verify:all` NOT RUN.
- B-CI: executed at exact head; lint/typecheck/unit/build/PWA/Playwright jobs
  success as above; literal `npm run verify:all` script **not** invoked in CI.
- Stage C: **NOT EXECUTED** (toolchain blocked).
- Finding dispositions after packet 1: blockers/HIGHs still
  **UNDISPOSITIONED** (static only); §71 **NOT TRIGGERED** yet (confirmation
  requires live clean-profile evidence).

### 13.7 Historical Stage B / C packet 2 (local Mac)

Packet: `CQS-SLICE-23-STAGE-B-C-FINAL-LOCAL-MAC-QUALIFICATION-PACKET-2`.

- Host: `Ricks-MacBook-Air.local` / `macdaddy` / macOS **26.5.1** / Darwin
  25.5.0 arm64 / Node **v26.0.0** / npm **11.12.1**.
- Product base unchanged: `c047ca7…`. Starting PR head observed:
  `8220be60129fb4ef3a1c7ffbf9a77534f3f441cf` (docs-only advance from expected
  `7948a3a…`; product tree still identical to base).
- Product-tree equality: `git diff --name-only origin/main...HEAD` → only
  `docs/qualification/SLICE-23-QUALIFICATION-PLAN.md`.
- Stage B local: `npm ci` PASS; `git diff --check` PASS; `npm run verify` PASS
  (140 / 2397 / 1); `CI=1 npm run verify:all` FAIL on Final mid-refresh as in
  §13.5.
- Stage C clean-teacher: fresh Chromium persistent context; `vite preview`
  `http://localhost:4173/classroom-quiz-show/`; labels/roles only for teacher
  path. Result: **ordinary-teacher credible first-run route? NO.**

### 13.8 Historical Stage A–L matrix (pre-repair, packet 2)

| Stage | Historical status at PR #60 head |
| --- | --- |
| A | DONE — PASS (provenance only) |
| B | LOCAL EXECUTED — `verify` PASS; `verify:all` FAIL (Final signature); CI baseline green on pre-repair tree |
| C | EXECUTED — BLOCKER-01/02 CONFIRMED; §71 TRIGGERED |
| D | NOT RUN — §71 hard stop; would be invalidated by teacher-surface repair |
| E | Focused Final only — dispositioned RELEASE BLOCKER; broad matrix not run |
| F | NOT RUN — §71 hard stop |
| G | Owner-assisted; not attempted |
| H | Owner-assisted; not attempted |
| I | NOT RUN (HS-2 / no Pages claim from Mac packet) |
| J | Updated |
| K | Packets prepared; NOT authorized / NOT implemented in PR #60 |
| L | Not reached |

### 13.9 Historical §71 hard stop — it DID fire

Ordinary teacher lacked a credible first-run route **and** BLOCKER-01/02 were
confirmed on a live clean profile. Broad Stages D–I were **not** run for that
reason. Focused Final investigation continued per packet instruction.

**Current implication:** §71 is **CLEARED FOR QUALIFICATION RESUMPTION** because
BLOCKER-01/02 are repaired/verified (PR #62), not because §71 “never fired.”

### 13.10 Historical continuation candidates (as originally recorded)

| # | Candidate | Stage-0 bearing |
| --- | --- | --- |
| C-1 | Teacher-facing host UI | BLOCKER-01/02, HIGH-01 — strong |
| C-2 | Teacher-facing documentation / quick start | HIGH-02 — strong |
| C-3 | Startup / launch / distribution model | Production URL plausible; unverified (HS-2) |
| C-4 | Aggregate local-data reset | HIGH-03 — moderate |
| C-5 | Controller setup/tutorial evolution | F-UX-01 only; weak at Stage 0; reaction minigames post-MVP |
| C-6 | Packaging/distribution incl. non-registry dependency | CLASS-B-01 |
| C-7 | Raspberry Pi 5 beta readiness | Deliberately unclassified |
| C-8 | Cross-device LAN host/display | Not implemented; must not be implemented from Slice 23 |

Current reconciled dispositions: §7.

### 13.11 Historical `CQS-OD-066` assessment

Stage-0: future analytics/insight integration; touches no Slice 23 gameplay /
presentation / persistence / input / deployment path; **does not block classroom
qualification**. Whether it blocks MVP completion is an owner decision.
**Unresolved then and now.**

### 13.12 Historical recommended next action (PR #60)

Authorize §15.1 teacher-surface repair and §15.2 Final-durability repair as
separate packets against `c047ca7…`. Do not merge PR #60 as a product delivery.
Do not start post-Slice-23 MVP functionality.

Those repair lanes were subsequently authorized, implemented, independently
reviewed, merged, and post-merge verified as PR #61 / #62 / #63 (HIGH-03 /
aggregate reset as a third terminal lane). This reconciliation supersedes PR #60
as the **current** qualification record without discarding the historical
evidence above.
