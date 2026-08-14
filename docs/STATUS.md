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
| What is active? | **`CQS-REAL-MVP-1`: ACTIVE / CANONICALLY REGISTERED**. S03 implements the production Electron thin shell and unsigned desktop packaging path (ADR-021 **Accepted**). Post-MVP arcs remain **INACTIVE**. |
| What remains? | REAL MVP teacher-adoptable product work remains open. Teacher-simple setup, flagship visual fidelity, and integrated release qualification are not complete. Desktop artifacts are **unsigned** qualification/development-candidate builds, not a teacher-trusted signed release. |
| What is blocked / open? | See the [gap register](plans/CQS-REAL-MVP-ARC.md#6-initial-gap-register). C-3 / C-6 **FOUNDATION IMPLEMENTED / UNSIGNED**. `F-UX-01` **POLISH REQUIRED**. `CQS-Q23-LOW-02` **OPEN LOW / MONITOR ONLY**. `CQS-Q23-CLASS-B-01` **ACCEPTABLE FOR S03 WITH DOCUMENTED CONTROL**. `CQS-OD-066` **DEFERRED / NOT REQUIRED FOR REAL MVP**. C-7 Raspberry Pi **outside REAL MVP**. C-8 LAN **outside REAL MVP**. Post-MVP arcs **INACTIVE**. |
| Current Program frontier | `CQS-REAL-MVP-S04-TEACHER-SIMPLE-SETUP-AND-SUPPORT`. **S04: NOT AUTHORIZED** pending separate Program authority. |

```text
historical 23-slice roadmap: COMPLETE
Slice 23: TERMINALLY COMPLETE
Guidance Polish S01: TERMINALLY COMPLETE
CQS-REAL-MVP-1: ACTIVE / CANONICALLY REGISTERED
S02: Electron selected (ADR-021 Accepted)
S03: production Electron thin shell + unsigned packaging path implemented
S04: NOT AUTHORIZED pending separate Program authority
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

The conventional teacher install/start path is the Electron desktop
application wrapping that same core. PWA / GitHub Pages remains the
supported web alternate.

Those are **existing qualified foundations** plus the S03 desktop
distribution foundation. REAL MVP requalifies them only when later changes
can causally affect them. They are not unfinished work to rebuild from
scratch.

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

Teacher desktop notes:
[`teacher/DESKTOP.md`](teacher/DESKTOP.md).

## Open items (Program gap register)

| Item | Program-adoption state |
| --- | --- |
| conventional macOS installation | **FOUNDATION IMPLEMENTED / UNSIGNED** |
| conventional Windows installation | **FOUNDATION IMPLEMENTED / UNSIGNED** (CI artifact path; physical Windows runtime **NOT** claimed) |
| simple desktop launch | **FOUNDATION IMPLEMENTED** |
| desktop Host/Display lifecycle | **FOUNDATION IMPLEMENTED** |
| release artifacts/version/update path | **FOUNDATION IMPLEMENTED** (manual versioned replacement; no auto-update; no public teacher release) |
| in-app teacher team setup | **OPEN** |
| teacher-simple progressive disclosure | **POLISH REQUIRED** |
| controller `F-UX-01` (`CQS-Q23-LOW-01`) | **POLISH REQUIRED** |
| feedback/support path | **OPEN** |
| flagship visual fidelity | **POLISH / REQUALIFICATION REQUIRED** |
| packaged offline/recovery equivalence | **FOUNDATION IMPLEMENTED** (Electron shell + IndexedDB identity; packaged macOS Host smoke observed) |
| packaged macOS qualification | **PARTIAL** (packaged Host launch observed; physical Sony **NOT RUN** — no `054c` attached) |
| packaged Windows qualification | **OPEN** (CI can produce the installer; physical Windows runtime **NOT RUN**) |
| clean-room teacher qualification | **OPEN** |
| **C-3** | **FOUNDATION IMPLEMENTED / UNSIGNED** |
| **C-6** | **FOUNDATION IMPLEMENTED / UNSIGNED** |
| `CQS-Q23-CLASS-B-01` | **ACCEPTABLE FOR S03 WITH DOCUMENTED CONTROL** |
| `CQS-Q23-LOW-02` | **OPEN LOW / MONITOR ONLY** |
| `CQS-OD-066` | **DEFERRED / NOT REQUIRED FOR REAL MVP** |
| **C-7** Raspberry Pi 5 | **Outside REAL MVP.** Not promoted. |
| **C-8** cross-device LAN host/display | **Outside REAL MVP.** Not begun. |
| Post-MVP arcs | **INACTIVE** |

Do **not** begin S04, S05, or S06 from this status. Do **not** declare a
teacher-trusted signed release. Do **not** declare the teacher-adoptable
product complete. Do **not** reopen completed Slices 1–23.

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

`CQS-REAL-MVP-S04-TEACHER-SIMPLE-SETUP-AND-SUPPORT` is the next planned
Program frontier and requires separate owner/Program authorization.

```text
routing ≠ authority
S04: NOT AUTHORIZED pending separate Program authority
```

This status grants **no** S04 authority, **no** signing/notarization
decision, and **no** public teacher-release publication.

## Historical evidence (pointers)

- REAL MVP Program plan: [`plans/CQS-REAL-MVP-ARC.md`](plans/CQS-REAL-MVP-ARC.md)
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
