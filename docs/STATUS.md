# Status

Current program status for Classroom Quiz Show. Historical merge chronology
lives in [`receipts/`](receipts/) and the completed 23-slice plan of record
[`plans/MVP-ARC.md`](plans/MVP-ARC.md).

Coding agents should read root [`../AGENTS.md`](../AGENTS.md) and, for
delivery/review/repair/qualification/release work,
[`governance/EXECUTION-GUIDANCE.md`](governance/EXECUTION-GUIDANCE.md).

## Snapshot

| Question | Answer |
| --- | --- |
| What is complete? | Slices **1–23**. Original 23-slice foundation/qualification roadmap: **COMPLETE**. Slice 23: **COMPLETE / QUALIFIED / MERGED / POST-MERGE VERIFIED**. |
| What is active? | No product implementation lane. Post-MVP arcs remain inactive. |
| What remains? | Overall CQS MVP is **NOT COMPLETE**. Required remaining MVP continuation: **C-3 / C-6 desktop launch / packaging** — **OPEN / NOT BEGUN**. |
| What is blocked / open? | `LOW-01` / `F-UX-01` retained. `LOW-02` retained. `CLASS-B-01` retained. `CQS-OD-066` unresolved. C-7 Raspberry Pi **not promoted**. C-8 LAN **future**. Post-MVP arcs **inactive**. |
| Next planned Program action | Initialize the **CQS REAL MVP Program Orchestrator** under **separate owner authorization**. That is routing, not product authority. |

**Roadmap sequence complete ≠ product MVP complete.**

## Product frontier

Classroom Quiz Show is a local-first, teacher-hosted engine: private host,
sanitized projector display, two playable round types (`category-board`,
`final-wager`), keyboard / generic Gamepad / one exact Sony Buzz supported
profile, spreadsheet authoring, portable packs, local persistence, audience
display, and minimal presentation audio.

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

## Open items (retained)

| Item | State |
| --- | --- |
| **C-3 / C-6** desktop launch / packaging | **OPEN / NOT BEGUN** — required remaining MVP continuation. Not Slice 23. Not begun by this status. |
| `LOW-01` / `F-UX-01` (`CQS-Q23-LOW-01`) | **RETAINED / LOW** — ordinary Sony setup still exposes some WebHID/Gamepad jargon. |
| `LOW-02` (`CQS-Q23-LOW-02`) | **RETAINED / LOW** — measured startup/precache size; installed-PWA Chrome-tab close caveat recorded. |
| `CLASS-B-01` (`CQS-Q23-CLASS-B-01`) | **RETAINED / Class B** — SheetJS packaging / supply-chain concern; not observed as a current promised-functionality failure. |
| `CQS-OD-066` | **UNRESOLVED** — GCS learning-target linkage; does not block inherited Slice 23 qualification. |
| **C-7** Raspberry Pi 5 | **Not promoted.** Observational-only under Slice 23; not an MVP acceptance gate. |
| **C-8** cross-device LAN host/display | **Future direction.** Not begun. |
| Post-MVP arcs | **Inactive** (theme song, identity-pack audio, additional round types, etc.). |

Do **not** repair retained LOW/Class B items from this status. Do **not**
declare overall MVP complete. Do **not** begin C-3/C-6, REAL MVP product
implementation, Pi work, LAN work, controller-polish implementation, or
post-MVP arcs from this status.

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

Initialize the **CQS REAL MVP Program Orchestrator** under **separate owner
authorization**.

That orchestrator may later plan required remaining MVP continuation
(**C-3 / C-6** desktop launch / distribution). This status grants **no**
REAL MVP product implementation authority and **no** desktop-packaging
authority.

## Historical evidence (pointers)

- 23-slice plan of record: [`plans/MVP-ARC.md`](plans/MVP-ARC.md)
- Contributor handoff: [`handoff/CURRENT.md`](handoff/CURRENT.md)
- Execution rules: [`governance/EXECUTION-GUIDANCE.md`](governance/EXECUTION-GUIDANCE.md)
- Product identity: [`PROJECT.md`](PROJECT.md)
- Slice 22 audio: [`architecture/ADR-020-minimal-presentation-audio.md`](architecture/ADR-020-minimal-presentation-audio.md)
- Slice 21 Sony profile: [`architecture/ADR-019-sony-buzz-supported-profile-direct-webhid-keepalive.md`](architecture/ADR-019-sony-buzz-supported-profile-direct-webhid-keepalive.md)
- Receipts index: [`receipts/`](receipts/)
