# Status

Current program status for Classroom Quiz Show. Historical merge chronology
lives in [`receipts/`](receipts/) and the completed 23-slice plan of record
[`plans/MVP-ARC.md`](plans/MVP-ARC.md). The current REAL MVP Program plan of
record is [`plans/CQS-REAL-MVP-ARC.md`](plans/CQS-REAL-MVP-ARC.md).

Coding agents should read root [`../AGENTS.md`](../AGENTS.md) and, for
delivery/review/repair/qualification/release work,
[`governance/EXECUTION-GUIDANCE.md`](governance/EXECUTION-GUIDANCE.md).

## Snapshot

| Question | Answer |
| --- | --- |
| What is historically complete? | Slices **1–23**. Original 23-slice foundation/qualification roadmap: **COMPLETE**. Slice 23: **TERMINALLY COMPLETE**. Guidance Polish S01: **TERMINALLY COMPLETE**. |
| What is active? | **`CQS-REAL-MVP-1`: ACTIVE / CANONICALLY REGISTERED**. S03 implements the production Electron thin shell and unsigned desktop packaging path (ADR-021 **Accepted**). S04 canon registers remaining product direction. S04A, S04B, and **S04C-H1** are **TERMINALLY COMPLETE**. S04C parent remains **ACTIVE / OPEN / NOT TERMINAL**. Post-MVP arcs remain **INACTIVE**. |
| What remains? | REAL MVP teacher-adoptable product work remains open. S04A, S04B, and S04C-H1 are **TERMINALLY COMPLETE**. S04C-H2 has a published **DELIVERY CANDIDATE / NOT MERGED**; S04C parent remains open. S04D, flagship visual fidelity, and integrated release qualification are **not begun**. Desktop artifacts are **unsigned** qualification/development-candidate builds, not a teacher-trusted signed release. |
| What is blocked / open? | See the [gap register](plans/CQS-REAL-MVP-ARC.md#6-initial-gap-register). C-3 / C-6 **FOUNDATION IMPLEMENTED / UNSIGNED**. `F-UX-01` **ADDRESSED ON MAIN / H6 PHYSICAL READINESS PASS / UX-R1 CLOSED** (ordinary Sony Class Setup copy; evidence bound to H5/H6 identities). `CQS-Q23-LOW-02` **OPEN / LOW / MONITOR**. `CQS-Q23-CLASS-B-01` **OPEN / CONTROLLED**. `CQS-OD-066` **DEFERRED / NOT REAL MVP**. Packaged macOS Sony physical **H5 selection/hardware PASS transferred**; **H6 readiness PASS** on Namtai `054c:1000` + four handsets. Windows physical runtime **NOT RUN** (S06). Signing / notarization **OPEN OWNER GATE**. C-7 Raspberry Pi **outside REAL MVP**. C-8 LAN **outside REAL MVP**. Post-MVP arcs **INACTIVE**. |
| Current Program frontier | S04C-H1 is **TERMINALLY COMPLETE** on main. S04C-H2 sanitized diagnostics Copy Diagnostic Report is **IN REVIEW** on a published delivery candidate (**NOT MERGED** / **NOT TERMINAL**). S04C parent remains **ACTIVE / OPEN / NOT TERMINAL**. H3+ / S04D / S05 / S06 remain **NOT AUTHORIZED**. |

```text
historical 23-slice roadmap: COMPLETE
Slice 23: TERMINALLY COMPLETE
Guidance Polish S01: TERMINALLY COMPLETE
CQS-REAL-MVP-1: ACTIVE / CANONICALLY REGISTERED
S02: Electron selected (ADR-021 Accepted)
S03: production Electron thin shell + unsigned packaging path implemented
S04 canon: product direction registered
S04A: TERMINALLY COMPLETE
S04B: TERMINALLY COMPLETE
S04C: ACTIVE / OPEN / NOT TERMINAL (H1 complete; H2 delivery candidate in review)
S04C-H1: TERMINALLY COMPLETE
S04C-H2: DELIVERY CANDIDATE / NOT MERGED / NOT TERMINAL
S04D / S05 / S06: NOT AUTHORIZED
post-MVP arcs: INACTIVE
```

Completing the numbered 23-slice plan did not complete a teacher-adoptable
product. The current Program is `CQS-REAL-MVP-1`, not a continuation of
Slice numbering. There is no Slice 24.

## Product frontier

Classroom Quiz Show is a local-first, teacher-hosted engine: private host,
sanitized projector display, two playable round types (`category-board`,
`final-wager`), keyboard / generic Gamepad / one exact Sony Buzz supported
profile, spreadsheet plus in-app board authoring, portable packs, local
persistence, audience display, and minimal presentation audio.

The conventional teacher install/start path is the Electron desktop
application wrapping that same core. PWA / GitHub Pages remains the
supported web alternate.

Subsequent REAL MVP product-direction registration established that CQS
is being designed as a **serious potential distributable education
product** whose first/primary owner-user is the developer/teacher.
Windows is the primary teacher deployment target; macOS is the primary
development platform and secondary teacher platform. Durable invariants
live in [`CQS-PRODUCT-CONTRACT.md`](CQS-PRODUCT-CONTRACT.md). Detailed
remaining direction lives in
[`plans/CQS-REAL-MVP-S04-FAMILY-DIRECTION.md`](plans/CQS-REAL-MVP-S04-FAMILY-DIRECTION.md).

Those are **existing qualified foundations** plus the S03 desktop
distribution foundation plus S04 canon and terminal S04A teacher-workflow
foundation. REAL MVP requalifies foundations only when later changes can
causally affect them. They are not unfinished work to rebuild from scratch.

Slice 23 classroom qualification is terminal. Evidence:

- Qualification plan:
  [`qualification/SLICE-23-QUALIFICATION-PLAN.md`](qualification/SLICE-23-QUALIFICATION-PLAN.md)
- Broad D–I:
  [`receipts/2026-08-12-slice-23-broad-d-i-qualification.md`](receipts/2026-08-12-slice-23-broad-d-i-qualification.md)
- Terminal post-merge:
  [`receipts/2026-08-12-slice-23-terminal-post-merge-reconciliation.md`](receipts/2026-08-12-slice-23-terminal-post-merge-reconciliation.md)

Closed Slice 23 findings: BLOCKER-01, BLOCKER-02, HIGH-01, HIGH-02, HIGH-03,
Final durability race, M1. Historical qualification PR
[#60](https://github.com/ricktron/classroom-quiz-show/pull/60) is **CLOSED /
UNMERGED / HISTORICAL / SUPERSEDED**.

## REAL MVP Program

Canonical Program plan:
[`plans/CQS-REAL-MVP-ARC.md`](plans/CQS-REAL-MVP-ARC.md).

REAL MVP North Star: a normal teacher can receive CQS, install/start it,
create/import a class-specific category-board + Final game, configure teams,
optionally connect supported buzzers, open and project the audience display,
run the complete game, recover from ordinary problems, finish and view
results, and close/reopen later — without developer assistance.

S01 registered that Program. S02 selected **Electron** as the primary
desktop architecture (ADR-021). S03 implements the production thin shell,
custom origin `cqs://app`, stable app/userData identity, Host/Display native
windows, HID permission restriction to `054c:1000`, unsigned macOS/Windows
packaging, and a GitHub Actions release-build workflow. Auto-update is not
implemented. Signing/notarization remain owner gates.

S04 canon registers remaining product direction, the Product Contract, and
the S04A–S04D / S05 / S06 topology. S04A implements teacher Home, in-app
board authoring, Game/Session isolation, save trust, Import Quality Report,
and local Generation Feedback. PR #72 merged the accepted S04A tree as
`29083f078521ebf432a7d7380c521c557fb578a8`; post-merge CI succeeded on that
exact squash/main SHA. S04A is **TERMINALLY COMPLETE**. S04B implements
in-app Host Class Setup, Game-owned name banks versus Session identities,
optional Sony four-choice selection with keyboard fallback, and honest
buzzer readiness. PR #76 merged the accepted S04B tree as
`1b38ac765841a3db19285172b0f6ac2295d6b88f`; post-merge CI succeeded on that
exact squash/main SHA. S04B is **TERMINALLY COMPLETE**. It does **not**
authorize S04C–S04D.

Teacher desktop notes:
[`teacher/DESKTOP.md`](teacher/DESKTOP.md).

## Open items (Program gap register)

| Item | Program-adoption state |
| --- | --- |
| conventional macOS installation | **FOUNDATION IMPLEMENTED / UNSIGNED** |
| conventional Windows installation | **FOUNDATION IMPLEMENTED / UNSIGNED** (CI artifact path; physical Windows runtime **NOT RUN**) |
| simple desktop launch | **FOUNDATION IMPLEMENTED** |
| desktop Host/Display lifecycle | **FOUNDATION IMPLEMENTED** |
| release artifacts/version/update path | **FOUNDATION IMPLEMENTED** (manual replacement; no auto-update; no public teacher release) |
| in-app teacher team setup | **IMPLEMENTED ON MAIN** — S04B Host Class Setup is merged and terminal on `main` |
| teacher-simple progressive disclosure | **FOUNDATION IMPLEMENTED** — S04A teacher Home / authoring / save-trust workflow is terminal; S04B Class Setup extends it on `main` |
| controller `F-UX-01` (`CQS-Q23-LOW-01`) | **ADDRESSED ON MAIN / H6 PHYSICAL READINESS PASS / UX-R1 CLOSED** — ordinary Sony copy no longer requires WebHID / report-ID / profile jargon; Class Setup buzzer summary shares Sony teacher-summary layers; readiness honesty physically requalified on H6 identity (not re-run on squash/main) |
| feedback/support path | **OPEN** — S04D direction registered; implementation not begun |
| flagship visual fidelity | **POLISH / REQUALIFICATION REQUIRED** — S05 direction registered; implementation not begun |
| packaged offline/recovery equivalence | **FOUNDATION IMPLEMENTED** (Electron shell + IndexedDB identity; packaged macOS Host smoke observed) |
| packaged macOS qualification | **PARTIAL** (H5 selection/hardware physical **PASS recorded 2026-09-11** and transferred; H6 readiness physical **PASS** on `9df9c42…` + Namtai `054c:1000` + four handsets for terminal S04B; Windows physical runtime **NOT RUN**; clean-room / signed release still open) |
| packaged Windows qualification | **OPEN** (CI can produce the installer; physical Windows runtime **NOT RUN**) |
| clean-room teacher qualification | **OPEN** |
| **C-3** | **FOUNDATION IMPLEMENTED / UNSIGNED** |
| **C-6** | **FOUNDATION IMPLEMENTED / UNSIGNED** |
| `CQS-Q23-CLASS-B-01` | **OPEN / CONTROLLED** |
| `CQS-Q23-LOW-02` | **OPEN / LOW / MONITOR** |
| `CQS-OD-066` | **DEFERRED / NOT REAL MVP** |
| Signing / notarization | **OPEN OWNER GATE** |
| **C-7** Raspberry Pi 5 | **Outside REAL MVP.** Not promoted. |
| **C-8** cross-device LAN host/display | **Outside REAL MVP.** Not begun. |
| Post-MVP arcs | **INACTIVE** |

Do **not** begin S04C, S04D, S05, or S06 from this status. Routing the next
planned frontier to S04C is **not** authority. Do **not** declare a
teacher-trusted signed release. Do **not** declare the teacher-adoptable
product complete. Do **not** reopen completed Slices 1–23. Do **not** claim
Windows physical runtime qualification or a signed public teacher release.
H5/H6 macOS physical PASS claims remain bound to the recorded hardware and
H6 packaged identity `9df9c42…` (not rewritten to the squash SHA).

## Contract versions

Verified against canonical implementation constants:

| Contract | Version |
| --- | --- |
| Workbook format | **1** |
| AuthoringDraft | **1** |
| Pack format | **1** |
| Canonical game schema | **1** |
| GameDefinition | **1** |
| Public-state wire | **8** |
| Sync envelope | **2** |
| Private active-session wire | **1** |
| IndexedDB | **4** |
| Saved-definition record | **2** (v1 remains readable) |
| Sony mapping | **1** |
| Sony supported profile | **1** |
| Session Summary | **1** |
| Completed-summary envelope | **1** |
| Competitive profile | **1** |

Sony support remains one exact profile (`cqs.sony-buzz.namtai-wbuzz-wireless.v1`,
Namtai wireless `Wbuzz` `054c:1000`), not a hardware catalog. See
[`architecture/ADR-019-sony-buzz-supported-profile-direct-webhid-keepalive.md`](architecture/ADR-019-sony-buzz-supported-profile-direct-webhid-keepalive.md).

S04A adds saved-definition record **2** so incomplete in-app drafts can be
stored beside compiled games. IndexedDB remains **4**. v1 records remain
readable. Future workbook / backup versioning remains later product
direction.

## Next Program-level action

`CQS-REAL-MVP-S04A-TEACHER-WORKFLOW-AUTHORING-AND-SESSION-MODEL` is
**TERMINALLY COMPLETE**. `CQS-REAL-MVP-S04B-SONY-TEAM-SELECTION-AND-CLASSROOM-SETUP`
is **TERMINALLY COMPLETE**. Historical S04B H1–H6 repair and physical path
remains evidence history. Packaged / physically qualified S04B product
identity remains H6 `9df9c42626c2b0d87a076759aa531a4532f21a5c`.

`CQS-REAL-MVP-S04C-H1-SAFE-STARTUP-AND-UNIFIED-SESSION-RECOVERY` is
**TERMINALLY COMPLETE**. PR #78 squash-merged as
`5a6d60b5e92d4e42c2f54ba61bdbaeaf12ca4795` with sole parent
`5e649409567adc3951c45c872b7f01f13d91083b`; post-merge CI, Desktop
artifacts, and Pages succeeded on that exact squash/main SHA. S04C parent
remains **ACTIVE / OPEN / NOT TERMINAL**.

`CQS-REAL-MVP-S04C-H2-SANITIZED-DIAGNOSTICS-COPY-REPORT` has a published
**DELIVERY CANDIDATE / NOT MERGED / NOT TERMINAL**. Merge is reserved for
Program Orchestrator exact-head adjudication. H3+ / S04D / S05 / S06 remain
**NOT AUTHORIZED**.

```text
routing ≠ authority
S04A: TERMINALLY COMPLETE
S04B: TERMINALLY COMPLETE
S04C-H1: TERMINALLY COMPLETE
S04C-H2: DELIVERY CANDIDATE / NOT MERGED / NOT TERMINAL
S04C: ACTIVE / OPEN / NOT TERMINAL
H3+: NOT AUTHORIZED
S04D / S05 / S06: NOT AUTHORIZED
```

This status grants **no** merge authority for H2, **no** H3+
implementation authority, **no** signing/notarization decision, and **no**
public teacher-release publication. It does **not** claim Windows physical
runtime qualification or packaged owner-observed macOS relaunch smoke.

S04C-H2 implementation evidence (delivery candidate):
[`receipts/2026-09-14-cqs-real-mvp-s04c-h2-sanitized-diagnostics-copy-report.md`](receipts/2026-09-14-cqs-real-mvp-s04c-h2-sanitized-diagnostics-copy-report.md).

S04C-H1 terminal post-merge reconciliation:
[`receipts/2026-09-13-cqs-real-mvp-s04c-h1-terminal-post-merge-reconciliation.md`](receipts/2026-09-13-cqs-real-mvp-s04c-h1-terminal-post-merge-reconciliation.md).

S04C-H1 implementation evidence (historical):
[`receipts/2026-09-13-cqs-real-mvp-s04c-h1-safe-startup-and-unified-session-recovery.md`](receipts/2026-09-13-cqs-real-mvp-s04c-h1-safe-startup-and-unified-session-recovery.md).

S04B terminal post-merge reconciliation:
[`receipts/2026-09-13-cqs-real-mvp-s04b-terminal-post-merge-reconciliation.md`](receipts/2026-09-13-cqs-real-mvp-s04b-terminal-post-merge-reconciliation.md).

S04B implementation evidence (historical):
[`receipts/2026-08-14-cqs-real-mvp-s04b-sony-team-selection-and-classroom-setup.md`](receipts/2026-08-14-cqs-real-mvp-s04b-sony-team-selection-and-classroom-setup.md).

H5 physical report + evidence freeze (historical):
[`handoff/2026-09-11-s04b-h5-physical-qualification-report.md`](handoff/2026-09-11-s04b-h5-physical-qualification-report.md);
[`handoff/qualification-runs/s04b-h5-2026-09-11.jsonl`](handoff/qualification-runs/s04b-h5-2026-09-11.jsonl).

H6 readiness physical + UX re-review evidence (historical):
[`handoff/2026-09-12-s04b-h6-physical-readiness-qualification-report.md`](handoff/2026-09-12-s04b-h6-physical-readiness-qualification-report.md);
[`handoff/qualification-runs/s04b-h6-2026-09-12.jsonl`](handoff/qualification-runs/s04b-h6-2026-09-12.jsonl).
Packaged implementation SHA remains
`9df9c42626c2b0d87a076759aa531a4532f21a5c`.

## Historical evidence (pointers)

- Product Contract: [`CQS-PRODUCT-CONTRACT.md`](CQS-PRODUCT-CONTRACT.md)
- S04-family direction: [`plans/CQS-REAL-MVP-S04-FAMILY-DIRECTION.md`](plans/CQS-REAL-MVP-S04-FAMILY-DIRECTION.md)
- REAL MVP Program plan: [`plans/CQS-REAL-MVP-ARC.md`](plans/CQS-REAL-MVP-ARC.md)
- S04 canon amendment: [`decisions/ROADMAP-AMENDMENT-005-real-mvp-s04-family-elaboration.md`](decisions/ROADMAP-AMENDMENT-005-real-mvp-s04-family-elaboration.md)
- S04A implementation receipt: [`receipts/2026-08-13-cqs-real-mvp-s04a-teacher-workflow-authoring-and-session-model.md`](receipts/2026-08-13-cqs-real-mvp-s04a-teacher-workflow-authoring-and-session-model.md)
- S04A terminal post-merge reconciliation: [`receipts/2026-08-14-cqs-real-mvp-s04a-terminal-post-merge-reconciliation.md`](receipts/2026-08-14-cqs-real-mvp-s04a-terminal-post-merge-reconciliation.md)
- S04B implementation evidence: [`receipts/2026-08-14-cqs-real-mvp-s04b-sony-team-selection-and-classroom-setup.md`](receipts/2026-08-14-cqs-real-mvp-s04b-sony-team-selection-and-classroom-setup.md)
- S04B terminal post-merge reconciliation: [`receipts/2026-09-13-cqs-real-mvp-s04b-terminal-post-merge-reconciliation.md`](receipts/2026-09-13-cqs-real-mvp-s04b-terminal-post-merge-reconciliation.md)
- S04C-H1 implementation receipt: [`receipts/2026-09-13-cqs-real-mvp-s04c-h1-safe-startup-and-unified-session-recovery.md`](receipts/2026-09-13-cqs-real-mvp-s04c-h1-safe-startup-and-unified-session-recovery.md)
- S04C-H1 terminal post-merge reconciliation: [`receipts/2026-09-13-cqs-real-mvp-s04c-h1-terminal-post-merge-reconciliation.md`](receipts/2026-09-13-cqs-real-mvp-s04c-h1-terminal-post-merge-reconciliation.md)
- S03 desktop foundation receipt: [`receipts/2026-08-13-cqs-real-mvp-s03-desktop-distribution-release-foundation.md`](receipts/2026-08-13-cqs-real-mvp-s03-desktop-distribution-release-foundation.md)
- S02 architecture ADR: [`architecture/ADR-021-real-mvp-desktop-architecture-electron.md`](architecture/ADR-021-real-mvp-desktop-architecture-electron.md)
- S02 qualification receipt: [`receipts/2026-08-13-cqs-real-mvp-s02-desktop-architecture-qualification.md`](receipts/2026-08-13-cqs-real-mvp-s02-desktop-architecture-qualification.md)
- 23-slice plan of record: [`plans/MVP-ARC.md`](plans/MVP-ARC.md)
- Contributor handoff: [`handoff/CURRENT.md`](handoff/CURRENT.md)
- Execution rules: [`governance/EXECUTION-GUIDANCE.md`](governance/EXECUTION-GUIDANCE.md)
- Product identity: [`PROJECT.md`](PROJECT.md)
- Slice 22 audio: [`architecture/ADR-020-minimal-presentation-audio.md`](architecture/ADR-020-minimal-presentation-audio.md)
- Slice 21 Sony profile: [`architecture/ADR-019-sony-buzz-supported-profile-direct-webhid-keepalive.md`](architecture/ADR-019-sony-buzz-supported-profile-direct-webhid-keepalive.md)
- Receipts index: [`receipts/`](receipts/)
