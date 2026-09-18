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
| Current Program frontier | S04C-H1 and S04C-H2 **TERMINALLY COMPLETE**. S04C parent **ACTIVE / OPEN / NOT TERMINAL**. Recommended next owner action: fresh reconciliation for next S04C frontier; **H3+ NOT AUTHORIZED**. |
| S02 | Electron selected (**ADR-021 Accepted**) |
| S03 | production Electron thin shell + unsigned packaging path **implemented** |
| S04 canon | product direction **registered** |
| S04A | **TERMINALLY COMPLETE** |
| S04B | **TERMINALLY COMPLETE** |
| S04C-H1 | **TERMINALLY COMPLETE** |
| S04C-H2 | **TERMINALLY COMPLETE** |
| S04C | parent **ACTIVE / OPEN / NOT TERMINAL**; H3+ **not begun** |
| S04D / S05 / S06 | **NOT AUTHORIZED** |
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
(Copy Diagnostic Report) is **TERMINALLY COMPLETE** on main after PR #80.
S04C parent remains open; H3+ and S04D are **not authorized** by this
handoff.

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
| flagship visual fidelity | **POLISH / REQUALIFICATION REQUIRED** — S05 direction registered; implementation not begun |
| packaged offline/recovery and OS qualification | **PARTIAL** (H5 selection/hardware **PASS recorded 2026-09-11** and transferred; H6 readiness **PASS** on Namtai `054c:1000` + four handsets; Windows physical runtime **NOT RUN**) |
| clean-room teacher qualification | **OPEN** |
| **C-3** / **C-6** | **FOUNDATION IMPLEMENTED / UNSIGNED** |
| `CQS-Q23-CLASS-B-01` | **OPEN / CONTROLLED** |
| `CQS-Q23-LOW-02` | **OPEN / LOW / MONITOR** |
| `CQS-OD-066` | **DEFERRED / NOT REAL MVP** |
| Signing / notarization | **OPEN OWNER GATE** |
| **C-7** Raspberry Pi 5 | outside REAL MVP; not an MVP gate |
| **C-8** LAN host/display | outside REAL MVP; not begun |
| Theme song / identity-pack audio / additional round types | post-MVP; **INACTIVE** |

Contract versions: see [`../STATUS.md`](../STATUS.md).

## What you must not start

Do **not**:

- begin S04C-H3+ (backup/restore, import-salvage, broader recovery, etc.)
  without a later bounded authorization;
- treat terminal H1 or H2 as terminal S04C completion;
- begin S04D telemetry without a later bounded authorization;
- begin S05 visual-fidelity work or S06 integrated release qualification;
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
S04C parent remains **ACTIVE / OPEN / NOT TERMINAL**. Recommended next
owner action is a **fresh reconciliation** for the next S04C frontier.
**H3+ is NOT AUTHORIZED.** Do **not** start H3+ from this handoff. Do
**not** claim Windows physical qualification, Sony physical
re-qualification, local hardware qualification for H2 (none required), or
a signed release from this handoff.

```text
routing ≠ authority
S04A: TERMINALLY COMPLETE
S04B: TERMINALLY COMPLETE
S04C-H1: TERMINALLY COMPLETE
S04C-H2: TERMINALLY COMPLETE
S04C: ACTIVE / OPEN / NOT TERMINAL
H3+: NOT AUTHORIZED
S04D/S05/S06: NOT AUTHORIZED
```

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

Do **not** begin S04C-H3+ from this handoff.

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
