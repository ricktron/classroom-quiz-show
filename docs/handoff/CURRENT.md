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
| Current Program frontier | S02 desktop architecture qualification |
| S02 | **NOT AUTHORIZED** pending separate Program authority |
| Post-MVP arcs | **INACTIVE** |

[`../plans/MVP-ARC.md`](../plans/MVP-ARC.md) is the historical completed
23-slice plan of record. It is **not** the current REAL MVP authority
surface. There is no Slice 24.

## Read these

1. [`../../AGENTS.md`](../../AGENTS.md)
2. [`../PROJECT.md`](../PROJECT.md)
3. [`../STATUS.md`](../STATUS.md)
4. This file
5. [`../plans/CQS-REAL-MVP-ARC.md`](../plans/CQS-REAL-MVP-ARC.md) — current
   REAL MVP Program plan of record. Read it **before** acting on REAL MVP
   continuation.
6. [`../plans/MVP-ARC.md`](../plans/MVP-ARC.md) — historical completed
   23-slice plan of record, not the current REAL MVP sequence
7. [`../governance/EXECUTION-GUIDANCE.md`](../governance/EXECUTION-GUIDANCE.md)
   for delivery / review / evidence / repair rules
8. Task-relevant ADRs and receipts

Teacher classroom path:
[`../teacher/QUICK_START.md`](../teacher/QUICK_START.md).

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

Those remain **existing qualified foundations**. Do not rewrite them as
unfinished from scratch.

Slice 23 terminal evidence:

- [`../receipts/2026-08-12-slice-23-broad-d-i-qualification.md`](../receipts/2026-08-12-slice-23-broad-d-i-qualification.md)
- [`../receipts/2026-08-12-slice-23-terminal-post-merge-reconciliation.md`](../receipts/2026-08-12-slice-23-terminal-post-merge-reconciliation.md)

Historical per-slice merge chronology is preserved in
[`../receipts/`](../receipts/). Do not treat this handoff as that ledger.

## What remains open

See the REAL MVP gap register in
[`../plans/CQS-REAL-MVP-ARC.md`](../plans/CQS-REAL-MVP-ARC.md).

| Item | Program-adoption state |
| --- | --- |
| conventional macOS / Windows installation | **OPEN** |
| simple desktop launch | **OPEN** |
| desktop Host/Display lifecycle | **OPEN** |
| release artifacts/version/update path | **OPEN** |
| in-app teacher team setup | **OPEN** |
| teacher-simple progressive disclosure | **POLISH REQUIRED** |
| controller `F-UX-01` | **POLISH REQUIRED** |
| feedback/support path | **OPEN** |
| flagship visual fidelity | **POLISH / REQUALIFICATION REQUIRED** |
| packaged offline/recovery and OS qualification | **OPEN** |
| clean-room teacher qualification | **OPEN** |
| **C-3** / **C-6** | **OPEN / REQUIRED** |
| `CQS-Q23-CLASS-B-01` | **RELEASE/ARCHITECTURE DISPOSITION REQUIRED** |
| `CQS-Q23-LOW-02` | **OPEN LOW / MONITOR ONLY** |
| `CQS-OD-066` | **DEFERRED / NOT REQUIRED FOR REAL MVP** |
| **C-7** Raspberry Pi 5 | outside REAL MVP; not an MVP gate |
| **C-8** LAN host/display | outside REAL MVP; not begun |
| Theme song / identity-pack audio / additional round types | post-MVP; **INACTIVE** |

Contract versions: see [`../STATUS.md`](../STATUS.md).

## What you must not start

Do **not**:

- begin `CQS-REAL-MVP-S02-DESKTOP-ARCHITECTURE-QUALIFICATION`;
- select a desktop wrapper or add desktop dependencies;
- begin desktop packaging / C-3 / C-6 implementation;
- begin Raspberry Pi work;
- begin LAN / cross-device host-display work;
- begin controller-polish implementation without a later bounded
  authorization;
- promote additional gameplay modes into REAL MVP;
- activate post-MVP arcs;
- declare the teacher-adoptable product complete because the 23-slice
  roadmap is complete;
- reopen completed Slices 1–23 product or qualification lanes;
- reopen, rebase, or merge historical PR #60;
- treat this handoff as product authority.

Permanent product prohibitions (privacy, fail-closed display, no student
phones, no networked buzzers, no executable imported content) remain in
[`../PROJECT.md`](../PROJECT.md) and
[`../architecture/GAME-ENGINE-BOUNDARIES.md`](../architecture/GAME-ENGINE-BOUNDARIES.md).

## Next Program-level action

`CQS-REAL-MVP-S02-DESKTOP-ARCHITECTURE-QUALIFICATION` is the next planned
Program frontier and requires separate owner/Program authorization.

```text
routing ≠ authority
```

Do **not** authorize or begin S02 from this handoff.

## Architecture pointers

- REAL MVP Program plan: [`../plans/CQS-REAL-MVP-ARC.md`](../plans/CQS-REAL-MVP-ARC.md)
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
npm run verify:all   # verify + production build + Playwright
```

A bounded packet may narrow required checks. An unrun check must never be
reported as passing. See
[`../governance/EXECUTION-GUIDANCE.md`](../governance/EXECUTION-GUIDANCE.md).
