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
| What is active? | **`CQS-REAL-MVP-1`: ACTIVE / CANONICALLY REGISTERED**. S03 implements the production Electron thin shell and unsigned desktop packaging path (ADR-021 **Accepted**). S04 canon registers remaining product direction. S04A, S04B, and **S04C** (including H1–H4 and display-placement / wake recovery) are **TERMINALLY COMPLETE**. **S05-F1** is **TERMINALLY COMPLETE**; S05 parent remains **OPEN / NOT TERMINAL**. Post-MVP arcs remain **INACTIVE**. |
| What remains? | REAL MVP teacher-adoptable product work remains open. S04A, S04B, and S04C are **TERMINALLY COMPLETE**. **S05-F1** (static Board + Clue Display readability / visual stress) is **TERMINALLY COMPLETE**. S05 parent remains **OPEN / NOT TERMINAL**. Remaining S05 choreography / presentation work, S04D, and S06 are **NOT AUTHORIZED**. Desktop artifacts are **unsigned** qualification/development-candidate builds, not a teacher-trusted signed release. |
| What is blocked / open? | See the [gap register](plans/CQS-REAL-MVP-ARC.md#6-initial-gap-register). C-3 / C-6 **FOUNDATION IMPLEMENTED / UNSIGNED**. `F-UX-01` **ADDRESSED ON MAIN / H6 PHYSICAL READINESS PASS / UX-R1 CLOSED** (ordinary Sony Class Setup copy; evidence bound to H5/H6 identities). `CQS-Q23-LOW-02` **OPEN / LOW / MONITOR**. H4 salvage collapsed detail **OPEN / LOW**. `CQS-Q23-CLASS-B-01` **OPEN / CONTROLLED**. `CQS-OD-066` **DEFERRED / NOT REAL MVP**. Packaged macOS Sony physical **H5 selection/hardware PASS transferred**; **H6 readiness PASS** on Namtai `054c:1000` + four handsets. Windows physical runtime **NOT RUN** (S06). Signing / notarization **OPEN OWNER GATE**. C-7 Raspberry Pi **outside REAL MVP**. C-8 LAN **outside REAL MVP**. Post-MVP arcs **INACTIVE**. |
| Current Program frontier | S04A–S04C and **S05-F1** are **TERMINALLY COMPLETE** on main. S05 parent remains **OPEN / NOT TERMINAL**. Next bounded S05 tranche requires a **fresh owner decision** (routing ≠ authority). S04D / additional S05 / S06 remain **NOT AUTHORIZED**. REAL MVP is **not** complete. |

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
S04C: TERMINALLY COMPLETE
S04C-H1: TERMINALLY COMPLETE
S04C-H2: TERMINALLY COMPLETE
S04C-H3: TERMINALLY COMPLETE
S04C-H4: TERMINALLY COMPLETE
CQS-REAL-MVP-S04C-DISPLAY-PLACEMENT-AND-WAKE-REPUBLISH-RECOVERY: TERMINALLY COMPLETE
S05-F1: TERMINALLY COMPLETE
S05 parent: OPEN / NOT TERMINAL
S04D / additional S05 / S06: NOT AUTHORIZED
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
| flagship visual fidelity | **PARTIAL / F1 TERMINALLY COMPLETE** — S05-F1 static Board + Clue Display readability and automated visual-stress foundation merged on main; remaining S05 choreography / Host polish / presentation work open and **NOT AUTHORIZED** |
| packaged offline/recovery equivalence | **FOUNDATION IMPLEMENTED** (Electron shell + IndexedDB identity; packaged macOS Host smoke observed) |
| packaged macOS qualification | **PARTIAL** (H5 selection/hardware physical **PASS recorded 2026-09-11** and transferred; H6 readiness physical **PASS** on `9df9c42…` + Namtai `054c:1000` + four handsets for terminal S04B; Windows physical runtime **NOT RUN**; clean-room / signed release still open) |
| packaged Windows qualification | **OPEN** (CI can produce the installer; physical Windows runtime **NOT RUN**) |
| clean-room teacher qualification | **OPEN** |
| **C-3** | **FOUNDATION IMPLEMENTED / UNSIGNED** |
| **C-6** | **FOUNDATION IMPLEMENTED / UNSIGNED** |
| `CQS-Q23-CLASS-B-01` | **OPEN / CONTROLLED** |
| `CQS-Q23-LOW-02` | **OPEN / LOW / MONITOR** |
| H4 salvage collapsed detail | **OPEN / LOW** — after a successful Keep, the collapsed **More detail about this file** note may still say nothing was saved. The primary status line is the durable outcome. Not repaired by PR #85. |
| `CQS-OD-066` | **DEFERRED / NOT REAL MVP** |
| Signing / notarization | **OPEN OWNER GATE** |
| **C-7** Raspberry Pi 5 | **Outside REAL MVP.** Not promoted. |
| **C-8** cross-device LAN host/display | **Outside REAL MVP.** Not begun. |
| Post-MVP arcs | **INACTIVE** |

Do **not** begin S04D, additional S05 work, or S06 from this status.
Naming a successor is **not** authority. Do **not** declare a
teacher-trusted signed release. Do **not** declare the teacher-adoptable
product complete. Do **not** reopen completed Slices 1–23. Do **not**
claim Windows physical runtime qualification, physical projector/sleep
readiness, or a signed public teacher release. H5/H6 macOS physical PASS
claims remain bound to the recorded hardware and H6 packaged identity
`9df9c42…` (not rewritten to later squash SHAs).

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
| Backup format | **1** (`classroom-quiz-show/backup`) |

Sony support remains one exact profile (`cqs.sony-buzz.namtai-wbuzz-wireless.v1`,
Namtai wireless `Wbuzz` `054c:1000`), not a hardware catalog. See
[`architecture/ADR-019-sony-buzz-supported-profile-direct-webhid-keepalive.md`](architecture/ADR-019-sony-buzz-supported-profile-direct-webhid-keepalive.md).

S04A adds saved-definition record **2** so incomplete in-app drafts can be
stored beside compiled games. IndexedDB remains **4**. v1 records remain
readable. S04C-H3 adds backup interchange schema **1**
(`classroom-quiz-show/backup`). Future workbook versioning and later backup
migration remain later product direction.

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
artifacts, and Pages succeeded on that exact squash/main SHA.

`CQS-REAL-MVP-S04C-H2-SANITIZED-DIAGNOSTICS-COPY-REPORT` is
**TERMINALLY COMPLETE**. PR #80 squash-merged as
`506654f1f6b4a0735a43cdda8a0100200c3dce29` with sole parent
`01a623153471f755c313b2b78140cc1d6c85e02b`; post-merge CI, Desktop
artifacts, and Pages succeeded on that exact squash/main SHA.

`CQS-REAL-MVP-S04C-H3-BACKUP-EXPORT-IMPORT-FOUNDATIONS` is
**TERMINALLY COMPLETE**. PR #82 squash-merged as
`8d5c22b1d6bcd14286b5c2c6e05ba9144ec7b415` with sole parent
`795f07b598c207d6e10c1142c2cff7c0d6f92b63`. The accepted reviewed head was
`648edeeb04a18f99e274cc8028043b9585d59214`; the squash tree matches that
head. Post-merge CI, Desktop artifacts, and Pages succeeded on that exact
squash/main SHA. H3 local qualification is **NONE**.

`CQS-REAL-MVP-S04C-H4-CORRUPT-IMPORT-SALVAGE-UX` is
**TERMINALLY COMPLETE**. Implementation PR #84 squash-merged as
`2c484a2d0ce73fa4f52717773e93fb3ad1e917ef` (accepted head
`281fd1873d8a56193471b659a817b61d0b968ed5`). That squash's CI unit job
failed because `HomeRoute.test.tsx` read `Saving the usable parts…`
instead of waiting for the final status. Disposition:
**TEST_SYNCHRONIZATION_DEFECT**. Repair PR #85 accepted head
`f9db4c950699b89d5ff33b088fa74ff5cd1df1a1` squash-merged as
`3cd5e3a0f884f234b03425fd169e5e495fa1a147` with sole parent
`2c484a2d0ce73fa4f52717773e93fb3ad1e917ef`; the squash tree matches the
accepted repair head. Post-merge CI, Desktop artifacts, and Pages
succeeded on that exact repair squash/main SHA. Product Keep behavior was
not changed by the repair. H4 local qualification is **NONE**. An accepted
**LOW** remains: after a successful Keep, the collapsed **More detail
about this file** note may still say nothing was saved. The primary status
line is the durable outcome.

`CQS-REAL-MVP-S04C-DISPLAY-PLACEMENT-AND-WAKE-REPUBLISH-RECOVERY` is
**TERMINALLY COMPLETE**. Initial PR #87 head
`2e19fe4ac1913241f5d0b3fd18f30895aa449583` received independent exact-head
review **REPAIR REQUIRED** (off-screen disconnect recovery; desktop OS
sleep/wake coverage). Bounded repair produced accepted head
`212784865034b0330e09295b2e212aff4f68fc94` (**ACCEPT CANDIDATE**),
squash-merged as `0d1fac747c0768d6f0dd0960781f6ab8a7184ece` with sole
parent `8401b024c40f7b482ed420c1913e083d96c1d879` (accepted-head tree
matches squash tree). Post-merge CI, Desktop artifacts, Pages, and
SonarCloud succeeded on that exact squash/main SHA. The tranche is **not**
named H5.

`CQS-REAL-MVP-S04C-PRODUCT-SAFETY-RECOVERY-AND-COMPATIBILITY-UX` is
**TERMINALLY COMPLETE**.

`CQS-REAL-MVP-S05-F1-CORE-DISPLAY-READABILITY-AND-VISUAL-STRESS` is
**TERMINALLY COMPLETE**. PR #89 squash-merged as
`f24e9b8fe0833094949057368b468f8026767dc2` with sole parent
`c3e7da4ddfebf0da2ac9c7659c5deab08691cced`. Accepted reviewed head was
`1d179cffa9986ecae0274169c215d0b7a5b1da01`; accepted-head tree matches
squash tree (**EXACT MATCH**). Post-merge CI, Playwright, Desktop
artifacts (unsigned macOS + Windows), Pages, and SonarCloud succeeded on
that exact squash/main SHA. S05 parent
`CQS-REAL-MVP-S05-FLAGSHIP-VISUAL-FIDELITY-AND-GAME-SHOW-CHOREOGRAPHY`
remains **OPEN / NOT TERMINAL**. Remaining S05 choreography /
presentation work, S04D, and S06 remain **NOT AUTHORIZED**. Next bounded
S05 tranche requires a **fresh owner decision** (routing ≠ authority).
REAL MVP is **not** complete. This status does not claim Windows physical
qualification, projector/sleep physical qualification, signing,
notarization, or a quota-fill experiment.

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
S05 parent: OPEN / NOT TERMINAL
S04D / additional S05 / S06: NOT AUTHORIZED
```

This status grants **no** S04D / additional S05 / S06 implementation
authority, **no** signing/notarization decision, and **no** public
teacher-release publication. It does **not** claim Windows physical
runtime qualification, Sony physical re-qualification, physical
projector/sleep qualification, local hardware qualification for H2 (H2
required none), local qualification for H3 (**NONE**), local
qualification for H4 (**NONE**), physical qualification for display
placement / wake recovery, or physical projector qualification for
S05-F1.

S05-F1 terminal post-merge reconciliation (candidate docs; does not
predict this terminalization PR’s eventual squash SHA):
[`receipts/2026-09-20-cqs-real-mvp-s05-f1-terminal-post-merge-reconciliation.md`](receipts/2026-09-20-cqs-real-mvp-s05-f1-terminal-post-merge-reconciliation.md).

S05-F1 implementation closeout:
[`CQS-S05-F1-CORE-DISPLAY-READABILITY-AND-VISUAL-STRESS.md`](CQS-S05-F1-CORE-DISPLAY-READABILITY-AND-VISUAL-STRESS.md).

S04C parent terminal post-merge reconciliation:
[`receipts/2026-09-20-cqs-real-mvp-s04c-terminal-post-merge-reconciliation.md`](receipts/2026-09-20-cqs-real-mvp-s04c-terminal-post-merge-reconciliation.md).

S04C-H4 terminal post-merge reconciliation:
[`receipts/2026-09-19-cqs-real-mvp-s04c-h4-terminal-post-merge-reconciliation.md`](receipts/2026-09-19-cqs-real-mvp-s04c-h4-terminal-post-merge-reconciliation.md).

S04C-H4 implementation evidence (historical; delivery-candidate wording preserved):
[`CQS-S04C-H4-CORRUPT-IMPORT-SALVAGE-UX.md`](CQS-S04C-H4-CORRUPT-IMPORT-SALVAGE-UX.md).

S04C-H4 post-merge CI reconciliation (historical; written before the repair merge):
[`CQS-S04C-H4-POST-MERGE-CI-RECONCILIATION.md`](CQS-S04C-H4-POST-MERGE-CI-RECONCILIATION.md).

S04C-H3 terminal post-merge reconciliation:
[`receipts/2026-09-18-cqs-real-mvp-s04c-h3-terminal-post-merge-reconciliation.md`](receipts/2026-09-18-cqs-real-mvp-s04c-h3-terminal-post-merge-reconciliation.md).

S04C-H3 implementation evidence (historical; delivery-candidate wording preserved):
[`receipts/2026-09-18-cqs-real-mvp-s04c-h3-backup-export-import-foundations.md`](receipts/2026-09-18-cqs-real-mvp-s04c-h3-backup-export-import-foundations.md).

S04C-H2 terminal post-merge reconciliation:
[`receipts/2026-09-18-cqs-real-mvp-s04c-h2-terminal-post-merge-reconciliation.md`](receipts/2026-09-18-cqs-real-mvp-s04c-h2-terminal-post-merge-reconciliation.md).

S04C-H2 implementation evidence (historical):
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
- S04C-H2 implementation receipt: [`receipts/2026-09-14-cqs-real-mvp-s04c-h2-sanitized-diagnostics-copy-report.md`](receipts/2026-09-14-cqs-real-mvp-s04c-h2-sanitized-diagnostics-copy-report.md)
- S04C-H2 terminal post-merge reconciliation: [`receipts/2026-09-18-cqs-real-mvp-s04c-h2-terminal-post-merge-reconciliation.md`](receipts/2026-09-18-cqs-real-mvp-s04c-h2-terminal-post-merge-reconciliation.md)
- S04C-H4 implementation closeout (historical; delivery-candidate wording preserved): [`CQS-S04C-H4-CORRUPT-IMPORT-SALVAGE-UX.md`](CQS-S04C-H4-CORRUPT-IMPORT-SALVAGE-UX.md)
- S04C-H4 post-merge CI reconciliation: [`CQS-S04C-H4-POST-MERGE-CI-RECONCILIATION.md`](CQS-S04C-H4-POST-MERGE-CI-RECONCILIATION.md)
- S04C-H4 terminal post-merge reconciliation: [`receipts/2026-09-19-cqs-real-mvp-s04c-h4-terminal-post-merge-reconciliation.md`](receipts/2026-09-19-cqs-real-mvp-s04c-h4-terminal-post-merge-reconciliation.md)
- S04C-H3 implementation receipt: [`receipts/2026-09-18-cqs-real-mvp-s04c-h3-backup-export-import-foundations.md`](receipts/2026-09-18-cqs-real-mvp-s04c-h3-backup-export-import-foundations.md)
- S04C-H3 terminal post-merge reconciliation: [`receipts/2026-09-18-cqs-real-mvp-s04c-h3-terminal-post-merge-reconciliation.md`](receipts/2026-09-18-cqs-real-mvp-s04c-h3-terminal-post-merge-reconciliation.md)
- S05-F1 implementation closeout: [`CQS-S05-F1-CORE-DISPLAY-READABILITY-AND-VISUAL-STRESS.md`](CQS-S05-F1-CORE-DISPLAY-READABILITY-AND-VISUAL-STRESS.md)
- S05-F1 terminal post-merge reconciliation: [`receipts/2026-09-20-cqs-real-mvp-s05-f1-terminal-post-merge-reconciliation.md`](receipts/2026-09-20-cqs-real-mvp-s05-f1-terminal-post-merge-reconciliation.md)
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
