# Handoff — Current

Entry point for the next contributor or coding agent.

This file routes. It does **not** grant product implementation authority.

```text
routing ≠ authority
```

Read root [`../../AGENTS.md`](../../AGENTS.md) before changing the
repository. For delivery, repair, review, qualification, or release work,
also read
[`../governance/EXECUTION-GUIDANCE.md`](../governance/EXECUTION-GUIDANCE.md).

> **CQS authority.** This repository remains the single source of
> implementation truth. NightWatch, Notion, Obsidian, chat, and other
> external summaries may route or summarize work but grant no authority
> over CQS product scope, implementation, architecture, tests, deployment,
> or status.

## Inherited program boundary

| Boundary | State |
| --- | --- |
| 23-slice foundation/qualification roadmap | **COMPLETE** |
| Slice 23 classroom qualification | **TERMINALLY COMPLETE** |
| Guidance Polish S01 | **TERMINALLY COMPLETE** |
| `CQS-REAL-MVP-1` | **ACTIVE / CANONICALLY REGISTERED** |
| Current Program frontier | S04A–S04C, **S05-F1**, **S05 buzz / active-claim choreography**, and **S05 board-outcome public authority** **TERMINALLY COMPLETE**. **S05 SCORE CHANGE: OWNER DECISION RESOLVED — PATH S-C**. **`CQS-REAL-MVP-S05-BOARD-OUTCOME-PRESENTATION-CHOREOGRAPHY`**: **AUTHORIZED DELIVERY CANDIDATE** (NOT ACCEPTED / NOT TERMINAL). S05 parent **OPEN / NOT TERMINAL**. Remaining S05 (board/round-flow, Final / winner), S04D, S06 **NOT AUTHORIZED**. REAL MVP is **not** complete. |
| S02 | Electron selected (**ADR-021 Accepted**) |
| S03 | production Electron thin shell + unsigned packaging path **implemented** |
| S04 canon | product direction **registered** |
| S04A | **TERMINALLY COMPLETE** |
| S04B | **TERMINALLY COMPLETE** |
| S04C-H1 | **TERMINALLY COMPLETE** |
| S04C-H2 | **TERMINALLY COMPLETE** |
| S04C-H3 | **TERMINALLY COMPLETE** |
| S04C-H4 | **TERMINALLY COMPLETE** |
| S04C display placement / wake recovery | **TERMINALLY COMPLETE** (descriptive identity; not H5) |
| S04C | parent **TERMINALLY COMPLETE** |
| S05-F1 | **TERMINALLY COMPLETE** |
| S05 buzz / active-claim choreography | **TERMINALLY COMPLETE** |
| S05 board-outcome public authority | **TERMINALLY COMPLETE** |
| S05 score-change owner decision | **RESOLVED — PATH S-C** |
| S05 board-outcome presentation choreography | **AUTHORIZED DELIVERY CANDIDATE** (NOT ACCEPTED / NOT TERMINAL) |
| S05 parent | **OPEN / NOT TERMINAL** |
| S04D / additional S05 / S06 | **NOT AUTHORIZED** |
| Post-MVP arcs | **INACTIVE** |

[`../plans/MVP-ARC.md`](../plans/MVP-ARC.md) is the historical completed
23-slice plan of record. It is **not** the current REAL MVP authority
surface. There is no Slice 24.

## Read these

1. [`../../AGENTS.md`](../../AGENTS.md)
2. [`../PROJECT.md`](../PROJECT.md)
3. [`../CQS-PRODUCT-CONTRACT.md`](../CQS-PRODUCT-CONTRACT.md)
4. [`../STATUS.md`](../STATUS.md)
5. This file
6. [`../plans/CQS-REAL-MVP-ARC.md`](../plans/CQS-REAL-MVP-ARC.md) — current
   REAL MVP Program plan of record. Read it **before** acting on REAL MVP
   continuation.
7. [`../plans/CQS-REAL-MVP-S04-FAMILY-DIRECTION.md`](../plans/CQS-REAL-MVP-S04-FAMILY-DIRECTION.md)
   — approved remaining product direction
8. [`../plans/MVP-ARC.md`](../plans/MVP-ARC.md) — historical completed
   23-slice plan of record, not the current REAL MVP sequence
9. [`../governance/EXECUTION-GUIDANCE.md`](../governance/EXECUTION-GUIDANCE.md)
   for delivery / review / evidence / repair rules
10. Task-relevant ADRs and receipts

Teacher classroom path:
[`../teacher/QUICK_START.md`](../teacher/QUICK_START.md).

Desktop install/start (unsigned artifacts):
[`../teacher/DESKTOP.md`](../teacher/DESKTOP.md).

Slice 23 qualification record:
[`../qualification/SLICE-23-QUALIFICATION-PLAN.md`](../qualification/SLICE-23-QUALIFICATION-PLAN.md).

## What is complete

Slices **1–23** are `Complete` and merged. The original numbered MVP
foundation/qualification plan is finished. Guidance Polish S01 is
terminally complete.

Playable classroom engine on that foundation:

- private host + sanitized projector display;
- `category-board` and `final-wager`;
- keyboard buzz-in, generic Gamepad, and one exact Sony Buzz supported
  profile;
- spreadsheet authoring, portable packs, local persistence, audience
  display, minimal presentation audio.

S03 adds a production Electron thin shell around that same core: custom
origin `cqs://app`, Host/Display native windows, stable app identity,
unsigned macOS/Windows packaging, and a release-build workflow. That is
the C-3 / C-6 **implementation foundation**, not a signed teacher release
and not S06 integrated qualification.

S04 canon registers remaining product direction, the Product Contract, and
the S04A–S04D / S05 / S06 topology. S04A adds teacher Home, in-app board
authoring, reusable Game versus class Session separation, save trust,
Import Quality Report, local Generation Feedback, and the Game-owned
team-name-bank seam reserved for S04B. PR #72 merged as
`29083f078521ebf432a7d7380c521c557fb578a8`; post-merge CI succeeded on that
exact squash/main SHA. S04A is **TERMINALLY COMPLETE**. S04B adds Host
Class Setup, Game-owned name banks versus Session identities, optional
Sony four-choice selection with keyboard fallback, and honest buzzer
readiness (H6). Historical H1–H5 repair/physical path remains evidence
history. PR #76 merged as `1b38ac765841a3db19285172b0f6ac2295d6b88f`;
post-merge CI succeeded on that exact squash/main SHA. Packaged /
physically qualified product identity remains H6
`9df9c42626c2b0d87a076759aa531a4532f21a5c`. S04B is **TERMINALLY
COMPLETE**. S04C-H1 safe startup / unified session recovery is
**TERMINALLY COMPLETE** on main after PR #78. S04C-H2 sanitized diagnostics
(Copy Diagnostic Report) is **TERMINALLY COMPLETE** on main after PR #80. S04C-H3 local backup /
restore is **TERMINALLY COMPLETE** on main after PR #82 squash
`8d5c22b1d6bcd14286b5c2c6e05ba9144ec7b415`.
S04C-H4 corrupt-import salvage is **TERMINALLY COMPLETE** on main after
implementation PR #84 squash `2c484a2d0ce73fa4f52717773e93fb3ad1e917ef` and
repair PR #85 squash `3cd5e3a0f884f234b03425fd169e5e495fa1a147`.
S04C display placement / wake recovery is **TERMINALLY COMPLETE** on main
after PR #87.
`CQS-REAL-MVP-S04C-PRODUCT-SAFETY-RECOVERY-AND-COMPATIBILITY-UX` is
**TERMINALLY COMPLETE**. `CQS-REAL-MVP-S05-F1-CORE-DISPLAY-READABILITY-AND-VISUAL-STRESS`
is **TERMINALLY COMPLETE** on main after PR #89.
`CQS-REAL-MVP-S05-BUZZ-ACTIVE-CLAIM-CHOREOGRAPHY` is **TERMINALLY COMPLETE**
on main after PR #91. `CQS-REAL-MVP-S05-BOARD-OUTCOME-PUBLIC-AUTHORITY` is
**TERMINALLY COMPLETE** on main after PR #93. **S05 score-change owner
decision: RESOLVED — PATH S-C** (immediate static authoritative updates;
ADR-006 unchanged). S05 parent remains **OPEN / NOT TERMINAL**. Remaining
S05 presentation work (board-outcome theatrical acknowledgement,
board/round-flow, bounded Final / winner presentation), S04D, and S06
remain **NOT AUTHORIZED**. Next candidate frontier is **board-outcome
presentation choreography** (routing ≠ authority; requires separate
bounded owner authorization). REAL MVP is **not** complete. This handoff
does not name or authorize a successor.

Those remain **existing qualified foundations** plus the S03 desktop
foundation, S04 canon, and terminal S04A teacher-workflow foundation. Do
not rewrite them as unfinished from scratch.

Slice 23 terminal evidence:

- [`../receipts/2026-08-12-slice-23-broad-d-i-qualification.md`](../receipts/2026-08-12-slice-23-broad-d-i-qualification.md)
- [`../receipts/2026-08-12-slice-23-terminal-post-merge-reconciliation.md`](../receipts/2026-08-12-slice-23-terminal-post-merge-reconciliation.md)

S03 evidence:

- [`../receipts/2026-08-13-cqs-real-mvp-s03-desktop-distribution-release-foundation.md`](../receipts/2026-08-13-cqs-real-mvp-s03-desktop-distribution-release-foundation.md)

S04A evidence:

- [`../receipts/2026-08-13-cqs-real-mvp-s04a-teacher-workflow-authoring-and-session-model.md`](../receipts/2026-08-13-cqs-real-mvp-s04a-teacher-workflow-authoring-and-session-model.md)
- [`../receipts/2026-08-14-cqs-real-mvp-s04a-terminal-post-merge-reconciliation.md`](../receipts/2026-08-14-cqs-real-mvp-s04a-terminal-post-merge-reconciliation.md)

Historical per-slice merge chronology is preserved in
[`../receipts/`](../receipts/). Do not treat this handoff as that ledger.

## What remains open

See the REAL MVP gap register in
[`../plans/CQS-REAL-MVP-ARC.md`](../plans/CQS-REAL-MVP-ARC.md).

| Item | Program-adoption state |
| --- | --- |
| conventional macOS / Windows installation | **FOUNDATION IMPLEMENTED / UNSIGNED** |
| simple desktop launch | **FOUNDATION IMPLEMENTED** |
| desktop Host/Display lifecycle | **FOUNDATION IMPLEMENTED** |
| release artifacts/version/update path | **FOUNDATION IMPLEMENTED** (manual replacement; no auto-update) |
| in-app teacher team setup | **IMPLEMENTED ON MAIN** — S04B Class Setup is merged and terminal |
| teacher-simple progressive disclosure | **FOUNDATION IMPLEMENTED** — S04A teacher Home / authoring / save-trust workflow is terminal; S04B Class Setup extends it on `main` |
| controller `F-UX-01` | **ADDRESSED ON MAIN / H6 PHYSICAL READINESS PASS / UX-R1 CLOSED** |
| feedback/support path | **OPEN** — S04D direction registered; implementation not begun |
| flagship visual fidelity | **PARTIAL / F1 + buzz + board-outcome Path A TERMINALLY COMPLETE** — S05-F1, S05 buzz / active-claim, and S05 board-outcome public authority (Path A) **TERMINALLY COMPLETE** on main; **score-change Path S-C RESOLVED**; theatrical remaining S05 open and **NOT AUTHORIZED** |
| packaged offline/recovery and OS qualification | **PARTIAL** (H5 selection/hardware **PASS recorded 2026-09-11** and transferred; H6 readiness **PASS** on Namtai `054c:1000` + four handsets; Windows physical runtime **NOT RUN**) |
| clean-room teacher qualification | **OPEN** |
| **C-3** / **C-6** | **FOUNDATION IMPLEMENTED / UNSIGNED** |
| `CQS-Q23-CLASS-B-01` | **OPEN / CONTROLLED** |
| `CQS-Q23-LOW-02` | **OPEN / LOW / MONITOR** |
| H4 salvage collapsed detail | **OPEN / LOW** — after a successful Keep, the collapsed **More detail about this file** note may still say nothing was saved. The primary status line is the durable outcome. Not repaired by PR #85. |
| `CQS-OD-066` | **DEFERRED / NOT REAL MVP** |
| Signing / notarization | **OPEN OWNER GATE** |
| **C-7** Raspberry Pi 5 | outside REAL MVP; not an MVP gate |
| **C-8** LAN host/display | outside REAL MVP; not begun |
| Theme song / identity-pack audio / additional round types | post-MVP; **INACTIVE** |

Contract versions: see [`../STATUS.md`](../STATUS.md).

## What you must not start

Do **not**:

- reopen S04C implementation without a separate owner authorization that
  explicitly reopens it;
- treat S04C terminality or S05-F1 terminality as REAL MVP completion or
  release readiness;
- begin S04D telemetry without a later bounded authorization;
- begin additional S05 work without a fresh bounded authorization;
- begin S06 integrated release qualification without a later bounded
  authorization;
- silently decide Apple/Windows signing, fee waiver, CPU/OS matrix, or
  public teacher-release publication;
- implement auto-update;
- begin Raspberry Pi work;
- begin LAN / cross-device host-display work;
- begin controller-polish implementation without a later bounded
  authorization;
- promote additional gameplay modes into REAL MVP;
- add live AI, accounts, cloud sync, or marketplace work;
- activate post-MVP arcs;
- declare the teacher-adoptable product complete;
- claim Windows physical runtime qualification or a signed public teacher
  release; H5/H6 macOS physical PASS claims remain bound to recorded
  hardware and H6 packaged identity `9df9c42…`;
- reopen completed Slices 1–23 product or qualification lanes;
- reopen, rebase, or merge historical PR #60;
- treat this handoff as product authority.

Permanent product prohibitions (privacy, fail-closed display, no student
phones, no networked buzzers, no executable imported content) remain in
[`../PROJECT.md`](../PROJECT.md),
[`../CQS-PRODUCT-CONTRACT.md`](../CQS-PRODUCT-CONTRACT.md), and
[`../architecture/GAME-ENGINE-BOUNDARIES.md`](../architecture/GAME-ENGINE-BOUNDARIES.md).

## Next Program-level action

`CQS-REAL-MVP-S04A-TEACHER-WORKFLOW-AUTHORING-AND-SESSION-MODEL` is
**TERMINALLY COMPLETE**. `CQS-REAL-MVP-S04B-SONY-TEAM-SELECTION-AND-CLASSROOM-SETUP`
is **TERMINALLY COMPLETE** after PR #76 squash/main
`1b38ac765841a3db19285172b0f6ac2295d6b88f` with post-merge CI success.
Packaged / physically qualified product identity remains H6
`9df9c42626c2b0d87a076759aa531a4532f21a5c`.

`CQS-REAL-MVP-S04C-H1-SAFE-STARTUP-AND-UNIFIED-SESSION-RECOVERY` is
**TERMINALLY COMPLETE** after PR #78 squash/main
`5a6d60b5e92d4e42c2f54ba61bdbaeaf12ca4795` with post-merge CI success.
`CQS-REAL-MVP-S04C-H2-SANITIZED-DIAGNOSTICS-COPY-REPORT` is
**TERMINALLY COMPLETE** after PR #80 squash/main
`506654f1f6b4a0735a43cdda8a0100200c3dce29` with post-merge CI success.
`CQS-REAL-MVP-S04C-H3-BACKUP-EXPORT-IMPORT-FOUNDATIONS` is
**TERMINALLY COMPLETE** after PR #82 squash/main
`8d5c22b1d6bcd14286b5c2c6e05ba9144ec7b415` (accepted head
`648edeeb04a18f99e274cc8028043b9585d59214`; squash tree matches) with
post-merge CI success.

`CQS-REAL-MVP-S04C-H4-CORRUPT-IMPORT-SALVAGE-UX` is
**TERMINALLY COMPLETE** after implementation PR #84 squash
`2c484a2d0ce73fa4f52717773e93fb3ad1e917ef` and repair PR #85 squash
`3cd5e3a0f884f234b03425fd169e5e495fa1a147` (accepted repair head
`f9db4c950699b89d5ff33b088fa74ff5cd1df1a1`; squash tree matches) with
post-merge CI success. The first post-merge unit failure on the
implementation squash was a **TEST_SYNCHRONIZATION_DEFECT**, repaired by
PR #85. Product Keep behavior was not changed by that repair.

`CQS-REAL-MVP-S04C-DISPLAY-PLACEMENT-AND-WAKE-REPUBLISH-RECOVERY` is
**TERMINALLY COMPLETE** after PR #87: initial head
`2e19fe4ac1913241f5d0b3fd18f30895aa449583` (**REPAIR REQUIRED**), repaired
accepted head `212784865034b0330e09295b2e212aff4f68fc94`
(**ACCEPT CANDIDATE**), squash/main
`0d1fac747c0768d6f0dd0960781f6ab8a7184ece` (tree match; post-merge CI /
Desktop / Pages / Sonar SUCCESS). Not named H5.

`CQS-REAL-MVP-S04C-PRODUCT-SAFETY-RECOVERY-AND-COMPATIBILITY-UX` is
**TERMINALLY COMPLETE**.

`CQS-REAL-MVP-S05-F1-CORE-DISPLAY-READABILITY-AND-VISUAL-STRESS` is
**TERMINALLY COMPLETE** after PR #89: rejected heads
`cf423206615c158cfd2c9f54a6e68f95f4619dcb` and
`7dc1b92b7ba139a506ab2a64f45c291ed8b24eec` (**REPAIR REQUIRED**), accepted
head `1d179cffa9986ecae0274169c215d0b7a5b1da01` (**ACCEPT CANDIDATE**),
squash/main `f24e9b8fe0833094949057368b468f8026767dc2` (sole parent
`c3e7da4ddfebf0da2ac9c7659c5deab08691cced`; accepted/main trees **EXACT
MATCH**; post-merge CI / Playwright / Desktop / Pages / Sonar SUCCESS).
S05 parent remains **OPEN / NOT TERMINAL**.

`CQS-REAL-MVP-S05-BUZZ-ACTIVE-CLAIM-CHOREOGRAPHY` is **TERMINALLY
COMPLETE** after PR #91: rejected head
`2ad426e73989619fb28a2a05b2ce561dc22253cd` (**REPAIR REQUIRED** F1–F5),
repair tip `bdd044f5ae06ad17a34968a0d9dce8a1851a8f35`, docs tips
`042d973b1a90de46bbee939d628a5eba72a86b9e` /
`fc87c49d4bf46b4901e77628b497b98b0ea67d4e`, accepted head
`fc87c49d4bf46b4901e77628b497b98b0ea67d4e` (**ACCEPT CANDIDATE**),
squash/main `42bbdfff5bd09386958f40dbb6475d69c8b0ab2d` (sole parent
`33e9c910f7abe5fbc048704ff9fef5962d213919`; accepted/main trees **EXACT
MATCH** `9a0b8527d670dfdf6aaec58fbb70f3577fab443b`; post-merge CI /
Playwright / Desktop / Pages / Sonar SUCCESS). S05 parent remains **OPEN /
NOT TERMINAL**.

`CQS-REAL-MVP-S05-BOARD-OUTCOME-PUBLIC-AUTHORITY` is **TERMINALLY COMPLETE**
after PR #93: rejected heads `b0b69f2169c05506cd6394a49a40b867c267a200`
(**REPAIR REQUIRED** F1–F5), `99b001369a2786ee8afefa624d920b2dc69311e9`
(**REPAIR REQUIRED — F6**), `72e53e3091300c9cd4de032373cceee0eadf1f0b`
(**REPAIR REQUIRED** F7), `0b0accbf7329fb942edc2c9fb70d5e4fcc554d32`
(**REPAIR REQUIRED — F8**), `c68bdccf074e0e6f0e4141e8136e34dafc404335`
(**F8 SEMANTICALLY CLOSED — SONAR-ONLY REPAIR REQUIRED**), accepted head
`fce42ee66ba9047c8ede1beb602cf2479cc677af` (**ACCEPT CANDIDATE**),
squash/main `80b287664bccb16c2516802bc64080a82e08faeb` (sole parent
`ba032bb1326027d5ca0bc0c84c2248b511c8b15d`; accepted/main trees **EXACT
MATCH** `051793253785f4e7dc9f7bd01966ced847462176`; post-merge CI /
Playwright / Desktop / Pages / Sonar SUCCESS). Path A foundation only.
ADR-006 score presentation is **unchanged**.

```text
S05 SCORE CHANGE:
OWNER DECISION RESOLVED — PATH S-C
```

For REAL MVP, the immediate static authoritative scoreboard update already
governed by ADR-006 satisfies the S05 score-change major moment. No live
scoreboard count-up, flash, animate, or re-sort is required for S05
completion. No separate score-change choreography, public score-change
event identity, or PublicState bump is required. Future scoreboard
animation is deferred / banked (not rejected; not authorized) under
existing `CQS-OPP-PRESENTATION-EFFECTS` only.

```text
CQS-REAL-MVP-S05-BOARD-OUTCOME-PRESENTATION-CHOREOGRAPHY:
AUTHORIZED DELIVERY CANDIDATE — NOT ACCEPTED / NOT TERMINAL
```

Delivery evidence (re-observe PR tip; do not treat as terminal):
[`../CQS-S05-BOARD-OUTCOME-PRESENTATION-CHOREOGRAPHY.md`](../CQS-S05-BOARD-OUTCOME-PRESENTATION-CHOREOGRAPHY.md).
Existing `boardOutcome` only; no `outcomeKey`; Path S-C / ADR-006 unchanged;
Correct audio-silent; remount must not fabricate “just happened”;
Incorrect/Passed + active claim → buzz owns motion; Host restrained. S05
parent remains **OPEN / NOT TERMINAL**. Do **not** start board/round-flow,
Final/winner, S04D, or S06 from this handoff. REAL MVP is **not** complete.
Do **not** claim Windows physical qualification,
projector/sleep physical qualification, Sony physical re-qualification,
local hardware qualification for H2 (none required), local qualification
for H3 (**NONE**), local qualification for H4 (**NONE**), a browser
quota-fill experiment, physical projector qualification for F1 / buzz /
board-outcome, or a signed release from this handoff. An accepted **LOW**
remains: after a successful Keep, the collapsed **More detail about this
file** note may still say nothing was saved. The primary status line is
the durable outcome.

```text
routing ≠ authority
S04A: TERMINALLY COMPLETE
S04B: TERMINALLY COMPLETE
S04C-H1: TERMINALLY COMPLETE
S04C-H2: TERMINALLY COMPLETE
S04C-H3: TERMINALLY COMPLETE
S04C-H4: TERMINALLY COMPLETE
CQS-REAL-MVP-S04C-DISPLAY-PLACEMENT-AND-WAKE-REPUBLISH-RECOVERY: TERMINALLY COMPLETE
S04C: TERMINALLY COMPLETE
S05-F1: TERMINALLY COMPLETE
S05-BUZZ-ACTIVE-CLAIM-CHOREOGRAPHY: TERMINALLY COMPLETE
S05-BOARD-OUTCOME-PUBLIC-AUTHORITY: TERMINALLY COMPLETE
S05-SCORE-CHANGE: RESOLVED — PATH S-C
S05-BOARD-OUTCOME-PRESENTATION-CHOREOGRAPHY: AUTHORIZED DELIVERY CANDIDATE (NOT ACCEPTED / NOT TERMINAL)
S05 parent: OPEN / NOT TERMINAL
S04D / additional S05 / S06: NOT AUTHORIZED
```

S05 board-outcome public authority terminal post-merge reconciliation
(candidate docs; does not predict this terminalization PR’s eventual
squash SHA):
[`../receipts/2026-09-22-cqs-real-mvp-s05-board-outcome-public-authority-terminal-post-merge-reconciliation.md`](../receipts/2026-09-22-cqs-real-mvp-s05-board-outcome-public-authority-terminal-post-merge-reconciliation.md).

S05 board-outcome public authority implementation closeout:
[`../CQS-S05-BOARD-OUTCOME-PUBLIC-AUTHORITY.md`](../CQS-S05-BOARD-OUTCOME-PUBLIC-AUTHORITY.md).

S05 score-change Path S-C owner-decision registration:
[`../receipts/2026-09-22-cqs-real-mvp-s05-score-change-path-s-c-owner-decision.md`](../receipts/2026-09-22-cqs-real-mvp-s05-score-change-path-s-c-owner-decision.md).

S05 buzz / active-claim terminal post-merge reconciliation (candidate docs):
[`../receipts/2026-09-21-cqs-real-mvp-s05-buzz-active-claim-terminal-post-merge-reconciliation.md`](../receipts/2026-09-21-cqs-real-mvp-s05-buzz-active-claim-terminal-post-merge-reconciliation.md).

S05 buzz / active-claim implementation closeout:
[`../CQS-S05-BUZZ-ACTIVE-CLAIM-CHOREOGRAPHY.md`](../CQS-S05-BUZZ-ACTIVE-CLAIM-CHOREOGRAPHY.md).

S05-F1 terminal post-merge reconciliation (candidate docs):
[`../receipts/2026-09-20-cqs-real-mvp-s05-f1-terminal-post-merge-reconciliation.md`](../receipts/2026-09-20-cqs-real-mvp-s05-f1-terminal-post-merge-reconciliation.md).

S05-F1 implementation closeout:
[`../CQS-S05-F1-CORE-DISPLAY-READABILITY-AND-VISUAL-STRESS.md`](../CQS-S05-F1-CORE-DISPLAY-READABILITY-AND-VISUAL-STRESS.md).

S04C parent terminal post-merge reconciliation:
[`../receipts/2026-09-20-cqs-real-mvp-s04c-terminal-post-merge-reconciliation.md`](../receipts/2026-09-20-cqs-real-mvp-s04c-terminal-post-merge-reconciliation.md).

S04C-H4 terminal post-merge reconciliation:
[`../receipts/2026-09-19-cqs-real-mvp-s04c-h4-terminal-post-merge-reconciliation.md`](../receipts/2026-09-19-cqs-real-mvp-s04c-h4-terminal-post-merge-reconciliation.md).

S04C-H4 implementation evidence (historical; delivery-candidate wording preserved):
[`../CQS-S04C-H4-CORRUPT-IMPORT-SALVAGE-UX.md`](../CQS-S04C-H4-CORRUPT-IMPORT-SALVAGE-UX.md).

S04C-H3 terminal post-merge reconciliation:
[`../receipts/2026-09-18-cqs-real-mvp-s04c-h3-terminal-post-merge-reconciliation.md`](../receipts/2026-09-18-cqs-real-mvp-s04c-h3-terminal-post-merge-reconciliation.md).

S04C-H3 implementation evidence (historical; delivery-candidate wording preserved):
[`../receipts/2026-09-18-cqs-real-mvp-s04c-h3-backup-export-import-foundations.md`](../receipts/2026-09-18-cqs-real-mvp-s04c-h3-backup-export-import-foundations.md).

S04C-H2 terminal post-merge reconciliation:
[`../receipts/2026-09-18-cqs-real-mvp-s04c-h2-terminal-post-merge-reconciliation.md`](../receipts/2026-09-18-cqs-real-mvp-s04c-h2-terminal-post-merge-reconciliation.md).

S04C-H2 implementation evidence (historical):
[`../receipts/2026-09-14-cqs-real-mvp-s04c-h2-sanitized-diagnostics-copy-report.md`](../receipts/2026-09-14-cqs-real-mvp-s04c-h2-sanitized-diagnostics-copy-report.md).

S04C-H1 terminal post-merge reconciliation:
[`../receipts/2026-09-13-cqs-real-mvp-s04c-h1-terminal-post-merge-reconciliation.md`](../receipts/2026-09-13-cqs-real-mvp-s04c-h1-terminal-post-merge-reconciliation.md).

S04C-H1 implementation evidence (historical):
[`../receipts/2026-09-13-cqs-real-mvp-s04c-h1-safe-startup-and-unified-session-recovery.md`](../receipts/2026-09-13-cqs-real-mvp-s04c-h1-safe-startup-and-unified-session-recovery.md).

S04B terminal post-merge reconciliation:
[`../receipts/2026-09-13-cqs-real-mvp-s04b-terminal-post-merge-reconciliation.md`](../receipts/2026-09-13-cqs-real-mvp-s04b-terminal-post-merge-reconciliation.md).

S04B implementation evidence (historical):
[`../receipts/2026-08-14-cqs-real-mvp-s04b-sony-team-selection-and-classroom-setup.md`](../receipts/2026-08-14-cqs-real-mvp-s04b-sony-team-selection-and-classroom-setup.md).

H5 physical report (historical):
[`2026-09-11-s04b-h5-physical-qualification-report.md`](2026-09-11-s04b-h5-physical-qualification-report.md).

H5 durable interaction/evidence manifest (historical):
[`qualification-runs/s04b-h5-2026-09-11.jsonl`](qualification-runs/s04b-h5-2026-09-11.jsonl).

H6 readiness physical + UX re-review report (historical):
[`2026-09-12-s04b-h6-physical-readiness-qualification-report.md`](2026-09-12-s04b-h6-physical-readiness-qualification-report.md).

H6 durable interaction/evidence manifest (historical):
[`qualification-runs/s04b-h6-2026-09-12.jsonl`](qualification-runs/s04b-h6-2026-09-12.jsonl).

Do **not** begin S04D / additional S05 / S06 from this handoff. Do **not**
reopen S04C without separate owner authorization.

## Architecture pointers

- Product Contract: [`../CQS-PRODUCT-CONTRACT.md`](../CQS-PRODUCT-CONTRACT.md)
- S04-family direction: [`../plans/CQS-REAL-MVP-S04-FAMILY-DIRECTION.md`](../plans/CQS-REAL-MVP-S04-FAMILY-DIRECTION.md)
- REAL MVP Program plan: [`../plans/CQS-REAL-MVP-ARC.md`](../plans/CQS-REAL-MVP-ARC.md)
- S04 canon amendment: [`../decisions/ROADMAP-AMENDMENT-005-real-mvp-s04-family-elaboration.md`](../decisions/ROADMAP-AMENDMENT-005-real-mvp-s04-family-elaboration.md)
- Desktop architecture: [`../architecture/ADR-021-real-mvp-desktop-architecture-electron.md`](../architecture/ADR-021-real-mvp-desktop-architecture-electron.md)
- S03 foundation receipt: [`../receipts/2026-08-13-cqs-real-mvp-s03-desktop-distribution-release-foundation.md`](../receipts/2026-08-13-cqs-real-mvp-s03-desktop-distribution-release-foundation.md)
- S02 qualification receipt: [`../receipts/2026-08-13-cqs-real-mvp-s02-desktop-architecture-qualification.md`](../receipts/2026-08-13-cqs-real-mvp-s02-desktop-architecture-qualification.md)
- Routing: [`../architecture/ADR-001-github-pages-routing.md`](../architecture/ADR-001-github-pages-routing.md)
- State/event/sync: [`../architecture/ADR-002-state-event-sync-core.md`](../architecture/ADR-002-state-event-sync-core.md)
- Import: [`../architecture/ADR-004-canonical-validation-import.md`](../architecture/ADR-004-canonical-validation-import.md)
- Backup interchange: [`../architecture/ADR-022-backup-export-import-foundations.md`](../architecture/ADR-022-backup-export-import-foundations.md)
- Sony supported profile: [`../architecture/ADR-019-sony-buzz-supported-profile-direct-webhid-keepalive.md`](../architecture/ADR-019-sony-buzz-supported-profile-direct-webhid-keepalive.md)
- Presentation audio: [`../architecture/ADR-020-minimal-presentation-audio.md`](../architecture/ADR-020-minimal-presentation-audio.md)
- Decision index: [`../decisions/README.md`](../decisions/README.md)

`main` is the GitHub default branch. Historical repository-hygiene notes
(abandoned Slice 1 default-branch mixup / closed unmerged PR #17) need no
further action.

## Verification commands

```bash
npm ci
npm run verify       # lint + typecheck + unit
npm run verify:all   # verify + production web build + Playwright
npm run build:desktop
npm run test:desktop
npm run package:desktop
```

A bounded packet may narrow required checks. An unrun check must never be
reported as passing. See
[`../governance/EXECUTION-GUIDANCE.md`](../governance/EXECUTION-GUIDANCE.md).
