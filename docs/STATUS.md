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
| What is active? | **`CQS-REAL-MVP-1`: ACTIVE / CANONICALLY REGISTERED**. S02 records Electron as the primary desktop architecture (ADR-021 Proposed; production shell not implemented). Post-MVP arcs remain **INACTIVE**. |
| What remains? | REAL MVP teacher-adoptable product work remains open. Flagship scope is one excellent original CQS: category-board + Final. Conventional install/start, teacher-simple setup, flagship visual fidelity, and packaged qualification are not complete. Desktop architecture is selected as Electron (Proposed) and is not a production shell. |
| What is blocked / open? | See the [gap register](plans/CQS-REAL-MVP-ARC.md#6-initial-gap-register). C-3 / C-6 **OPEN / REQUIRED**. `F-UX-01` **POLISH REQUIRED**. `CQS-Q23-LOW-02` **OPEN LOW / MONITOR ONLY**. `CQS-Q23-CLASS-B-01` **ACCEPTABLE FOR S03 WITH DOCUMENTED CONTROL**. `CQS-OD-066` **DEFERRED / NOT REQUIRED FOR REAL MVP**. C-7 Raspberry Pi **outside REAL MVP**. C-8 LAN **outside REAL MVP**. Post-MVP arcs **INACTIVE**. |
| Current Program frontier | `CQS-REAL-MVP-S03-DESKTOP-DISTRIBUTION-AND-RELEASE-FOUNDATION`. **S03: NOT AUTHORIZED** pending separate Program authority. |

```text
historical 23-slice roadmap: COMPLETE
Slice 23: TERMINALLY COMPLETE
Guidance Polish S01: TERMINALLY COMPLETE
CQS-REAL-MVP-1: ACTIVE / CANONICALLY REGISTERED
S02: Electron selected (ADR-021 Proposed; production shell not implemented)
S03: NOT AUTHORIZED pending separate Program authority
post-MVP arcs: INACTIVE
```

Completing the numbered 23-slice plan did not complete a teacher-adoptable
product. The current Program is `CQS-REAL-MVP-1`, not a continuation of
Slice numbering. There is no Slice 24.

## Product frontier

Classroom Quiz Show is a local-first, teacher-hosted engine: private host,
sanitized projector display, two playable round types (`category-board`,
`final-wager`), keyboard / generic Gamepad / one exact Sony Buzz supported
profile, spreadsheet authoring, portable packs, local persistence, audience
display, and minimal presentation audio.

Those are **existing qualified foundations**. REAL MVP requalifies them only
when later changes can causally affect them. They are not unfinished work
to rebuild from scratch.

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

S01 registered that Program. S02 selects **Electron** as the primary
desktop architecture (Proposed; see
[`architecture/ADR-021-real-mvp-desktop-architecture-electron.md`](architecture/ADR-021-real-mvp-desktop-architecture-electron.md)).
S02 created **no** production shell, installer, or release workflow, and
grants **no** S03 authority. Physical packaged Sony requalification is not
claimed.

## Open items (Program gap register)

| Item | Program-adoption state |
| --- | --- |
| conventional macOS installation | **OPEN** |
| conventional Windows installation | **OPEN** |
| simple desktop launch | **OPEN** |
| desktop Host/Display lifecycle | **OPEN** (architecture qualified; production shell not implemented) |
| release artifacts/version/update path | **OPEN** |
| in-app teacher team setup | **OPEN** |
| teacher-simple progressive disclosure | **POLISH REQUIRED** |
| controller `F-UX-01` (`CQS-Q23-LOW-01`) | **POLISH REQUIRED** |
| feedback/support path | **OPEN** |
| flagship visual fidelity | **POLISH / REQUALIFICATION REQUIRED** |
| packaged offline/recovery equivalence | **OPEN** |
| packaged macOS qualification | **OPEN** |
| packaged Windows qualification | **OPEN** |
| clean-room teacher qualification | **OPEN** |
| **C-3** | **OPEN / REQUIRED** |
| **C-6** | **OPEN / REQUIRED** |
| `CQS-Q23-CLASS-B-01` | **ACCEPTABLE FOR S03 WITH DOCUMENTED CONTROL** |
| `CQS-Q23-LOW-02` | **OPEN LOW / MONITOR ONLY** |
| `CQS-OD-066` | **DEFERRED / NOT REQUIRED FOR REAL MVP** |
| **C-7** Raspberry Pi 5 | **Outside REAL MVP.** Not promoted. |
| **C-8** cross-device LAN host/display | **Outside REAL MVP.** Not begun. |
| Post-MVP arcs | **INACTIVE** |

Do **not** begin S03, production Electron dependencies, installer work,
Pi work, LAN work, extra gameplay modes, or post-MVP arcs from this status.
Do **not** treat Electron as merged production architecture before this
candidate is merged. Do **not** declare the teacher-adoptable product
complete. Do **not** reopen completed Slices 1–23.

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
| Sony mapping | **1** |
| Sony supported profile | **1** |
| Session Summary | **1** |
| Completed-summary envelope | **1** |
| Competitive profile | **1** |

Sony support remains one exact profile (`cqs.sony-buzz.namtai-wbuzz-wireless.v1`,
Namtai wireless `Wbuzz` `054c:1000`), not a hardware catalog. See
[`architecture/ADR-019-sony-buzz-supported-profile-direct-webhid-keepalive.md`](architecture/ADR-019-sony-buzz-supported-profile-direct-webhid-keepalive.md).

## Next Program-level action

`CQS-REAL-MVP-S03-DESKTOP-DISTRIBUTION-AND-RELEASE-FOUNDATION` is the next
planned Program frontier and requires separate owner/Program authorization.

```text
routing ≠ authority
S03: NOT AUTHORIZED pending separate Program authority
```

This status grants **no** S03 authority, **no** production desktop
implementation, and **no** installer/release-workflow authority. ADR-021
remains Proposed until accepted by merge.

## Historical evidence (pointers)

- REAL MVP Program plan: [`plans/CQS-REAL-MVP-ARC.md`](plans/CQS-REAL-MVP-ARC.md)
- S02 architecture ADR: [`architecture/ADR-021-real-mvp-desktop-architecture-electron.md`](architecture/ADR-021-real-mvp-desktop-architecture-electron.md)
- S02 qualification receipt: [`receipts/2026-08-13-cqs-real-mvp-s02-desktop-architecture-qualification.md`](receipts/2026-08-13-cqs-real-mvp-s02-desktop-architecture-qualification.md)
- 23-slice plan of record: [`plans/MVP-ARC.md`](plans/MVP-ARC.md)
- Contributor handoff: [`handoff/CURRENT.md`](handoff/CURRENT.md)
- Execution rules: [`governance/EXECUTION-GUIDANCE.md`](governance/EXECUTION-GUIDANCE.md)
- Product identity: [`PROJECT.md`](PROJECT.md)
- Slice 22 audio: [`architecture/ADR-020-minimal-presentation-audio.md`](architecture/ADR-020-minimal-presentation-audio.md)
- Slice 21 Sony profile: [`architecture/ADR-019-sony-buzz-supported-profile-direct-webhid-keepalive.md`](architecture/ADR-019-sony-buzz-supported-profile-direct-webhid-keepalive.md)
- Receipts index: [`receipts/`](receipts/)
