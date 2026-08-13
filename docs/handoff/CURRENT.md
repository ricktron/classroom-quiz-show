# Handoff — Current

Entry point for the next contributor or coding agent.

This file routes. It does **not** grant product implementation authority.

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
| Slice 23 classroom qualification | **COMPLETE / QUALIFIED / MERGED / POST-MERGE VERIFIED** |
| Overall CQS MVP | **NOT COMPLETE** |
| C-3 / C-6 desktop launch / distribution | **OPEN / NOT BEGUN** — required remaining MVP continuation |
| REAL MVP product implementation | **NOT AUTHORIZED** by this handoff |
| Post-MVP arcs | **Inactive** |

**Roadmap sequence complete ≠ product MVP complete.**

## Read these

1. [`../../AGENTS.md`](../../AGENTS.md)
2. [`../PROJECT.md`](../PROJECT.md)
3. [`../STATUS.md`](../STATUS.md)
4. This file
5. [`../plans/MVP-ARC.md`](../plans/MVP-ARC.md) — historical 23-slice plan of
   record, not the future REAL MVP sequence
6. [`../governance/EXECUTION-GUIDANCE.md`](../governance/EXECUTION-GUIDANCE.md)
   for delivery / review / evidence / repair rules
7. Task-relevant ADRs and receipts

Teacher classroom path:
[`../teacher/QUICK_START.md`](../teacher/QUICK_START.md).

Slice 23 qualification record:
[`../qualification/SLICE-23-QUALIFICATION-PLAN.md`](../qualification/SLICE-23-QUALIFICATION-PLAN.md).

## What is complete

Slices **1–23** are `Complete` and merged. The original numbered MVP
foundation/qualification plan is finished.

Playable classroom engine on that foundation:

- private host + sanitized projector display;
- `category-board` and `final-wager`;
- keyboard buzz-in, generic Gamepad, and one exact Sony Buzz supported
  profile;
- spreadsheet authoring, portable packs, local persistence, audience
  display, minimal presentation audio.

Slice 23 terminal evidence:

- [`../receipts/2026-08-12-slice-23-broad-d-i-qualification.md`](../receipts/2026-08-12-slice-23-broad-d-i-qualification.md)
- [`../receipts/2026-08-12-slice-23-terminal-post-merge-reconciliation.md`](../receipts/2026-08-12-slice-23-terminal-post-merge-reconciliation.md)

Historical per-slice merge chronology is preserved in
[`../receipts/`](../receipts/). Do not treat this handoff as that ledger.

## What remains open

| Item | State |
| --- | --- |
| **C-3 / C-6** desktop launch / packaging | **OPEN / NOT BEGUN** |
| `LOW-01` / `F-UX-01` | retained LOW polish |
| `LOW-02` | retained LOW (startup/precache measure) |
| `CLASS-B-01` | retained Class B (SheetJS packaging/supply-chain) |
| `CQS-OD-066` | unresolved |
| **C-7** Raspberry Pi 5 | not promoted; not an MVP gate |
| **C-8** LAN host/display | future direction; not begun |
| Theme song / identity-pack audio / additional round types | post-MVP; inactive |

Contract versions: see [`../STATUS.md`](../STATUS.md).

## What you must not start

Do **not**:

- begin desktop packaging / C-3 / C-6;
- begin REAL MVP product implementation;
- begin Raspberry Pi work;
- begin LAN / cross-device host-display work;
- begin controller-polish implementation or repair `LOW-01` / `F-UX-01`
  without a later bounded authorization;
- activate post-MVP arcs;
- declare overall CQS MVP complete because the 23-slice roadmap is complete;
- reopen completed Slices 1–23 product or qualification lanes;
- reopen, rebase, or merge historical PR #60;
- treat this handoff as product authority.

Permanent product prohibitions (privacy, fail-closed display, no student
phones, no networked buzzers, no executable imported content) remain in
[`../PROJECT.md`](../PROJECT.md) and
[`../architecture/GAME-ENGINE-BOUNDARIES.md`](../architecture/GAME-ENGINE-BOUNDARIES.md).

## Next Program-level action

**Initialize the CQS REAL MVP Program Orchestrator under separate owner
authorization.**

That is routing, not product authority. C-3/C-6 remains the known required
MVP continuation for that future program to plan. No REAL MVP product
implementation is authorized here.

## Architecture pointers

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
