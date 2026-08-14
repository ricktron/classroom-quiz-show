# Roadmap Amendment 005 — REAL MVP S04-family elaboration

- **Amendment id:** `ROADMAP-AMENDMENT-005`
- **Slice identifier:** `CQS-REAL-MVP-S04-CANON-REGISTRATION`
- **Authorization:** `AUTHORIZE-CQS-REAL-MVP-S04-CANON-REGISTRATION-1`
- **Status:** Accepted (owner-authorized planning decision) —
  documentation only; **no product implementation authorized**; this
  record does not claim a merge SHA
- **Date:** 2026-08-13
- **Exact base `main`:** `23f0db2b751dbb6d8fdf4e25ecb1d5075965b8a3`
- **Type:** decision + documentation only — **no runtime code, no schema
  change, no asset addition, no test change, no dependency change, no
  CI/deploy change**
- **Amends:** the remaining sequence of
  [`../plans/CQS-REAL-MVP-ARC.md`](../plans/CQS-REAL-MVP-ARC.md) by
  elaborating the named S04 teacher-simple-setup frontier into a
  docs-only canon-registration slice plus S04A–S04D, and by clarifying
  S05/S06
- **Preserves:** completed S01–S03 identities and historical 23-slice
  numbering; [`../plans/MVP-ARC.md`](../plans/MVP-ARC.md) remains
  historical
- **Supersedes:** current-routing statements that treat
  `CQS-REAL-MVP-S04-TEACHER-SIMPLE-SETUP-AND-SUPPORT` as a single
  unimplemented next slice
- **Does not supersede:** Amendments 001–004 historical records, accepted
  ADRs, S03 implementation evidence, or any `CQS-OD-*`
  acceptance/activation state except where this Program explicitly
  continues to defer `CQS-OD-066`

This amendment is an **approved elaboration** of the existing S04
teacher-simple-setup frontier. It is **not** a rewrite of historical
completed slices. It grants **no product implementation authority**.

---

## 1. Status and authority

The owner authorized a documentation-only REAL MVP slice that persists
product direction, Product Contract invariants, remaining slice
topology, qualification debts, and serious-product safeguards into
repository canon **before** any S04 product implementation begins.

Binding consequences of this acceptance:

1. [`../CQS-PRODUCT-CONTRACT.md`](../CQS-PRODUCT-CONTRACT.md) becomes the
   dedicated Product Contract.
2. [`../plans/CQS-REAL-MVP-S04-FAMILY-DIRECTION.md`](../plans/CQS-REAL-MVP-S04-FAMILY-DIRECTION.md)
   becomes the detailed approved S04-family product-direction
   specification.
3. [`../plans/CQS-REAL-MVP-ARC.md`](../plans/CQS-REAL-MVP-ARC.md) carries
   the revised remaining Program topology.
4. Completed S01–S03 are **not** renumbered.
5. The earlier named frontier
   `CQS-REAL-MVP-S04-TEACHER-SIMPLE-SETUP-AND-SUPPORT` is elaborated, not
   erased. Historical S01–S03 documents that named that frontier remain
   historically accurate.
6. **No S04A/S04B/S04C/S04D/S05/S06 implementation is started.**
7. **No schema, public-wire, sync-envelope, command/event/reducer,
   storage, GameDefinition, package, dependency, workflow, deployment, or
   asset change** is authorized.
8. Historical receipts and historical statements remain records of what
   was true when written. Subsequent REAL MVP product-direction
   registration established the decisions in this amendment; earlier
   evidence is not rewritten.

---

## 2. Observed repository baseline

Observed immediately before mutation on host
`Ricks-MacBook-Air.local` as user `macdaddy`:

| Fact | Observed value |
| --- | --- |
| Repository | `ricktron/classroom-quiz-show` |
| Root | `/Users/macdaddy/Documents/Coding/Cursor Projects/classroom-quiz-show` |
| Authorized exact base / `origin/main` | `23f0db2b751dbb6d8fdf4e25ecb1d5075965b8a3` |
| Working tree before branch creation | clean |
| Open PRs | none |
| Existing `ROADMAP-AMENDMENT-005` | absent |
| Branch matching `s04-canon` | none |
| S01–S03 | complete / merged; S03 terminal verdict `CQS_REAL_MVP_S03_TERMINALLY_COMPLETE_MERGED_POST_MERGE_VERIFIED` |
| S04 product implementation | not started |
| Packaged macOS Sony physical | not run / hardware unavailable |
| Windows physical runtime | not run |
| Signed teacher release | does not exist |

Historical / detached worktrees existed under `/private/tmp/` from prior
slice verification. None owned overlapping S04 durable documentation
scope. The local S03 delivery branch
`feat/cqs-real-mvp-s03-desktop-distribution` was already squash-merged
to `main` and had no open PR.

---

## 3. Revised remaining Program topology

Register the remaining implementation plan as:

| Slice | Focus |
| --- | --- |
| `CQS-REAL-MVP-S04-CANON-REGISTRATION` | Docs-only product-direction and topology registration (this slice) |
| `CQS-REAL-MVP-S04A-TEACHER-WORKFLOW-AUTHORING-AND-SESSION-MODEL` | Teacher workflow, authoring, Game-versus-Session, import-quality loop |
| `CQS-REAL-MVP-S04B-SONY-TEAM-SELECTION-AND-CLASSROOM-SETUP` | Sony name selection, classroom readiness, `F-UX-01` |
| `CQS-REAL-MVP-S04C-PRODUCT-SAFETY-RECOVERY-AND-COMPATIBILITY-UX` | Safe startup, diagnostics, backup, compatibility UX |
| `CQS-REAL-MVP-S04D-FEEDBACK-AND-PRIVACY-SAFE-TELEMETRY` | Opt-in analytics and intentional feedback |
| `CQS-REAL-MVP-S05-FLAGSHIP-VISUAL-FIDELITY-AND-GAME-SHOW-CHOREOGRAPHY` | Flagship visual fidelity + game-show choreography |
| `CQS-REAL-MVP-S06-WINDOWS-FIRST-INTEGRATED-RELEASE-QUALIFICATION` | Windows-first integrated teacher-release qualification |

After this canon slice is accepted/merged, the next **implementation**
frontier is S04A. S04A requires **separate owner/Program authorization**.

Do not renumber completed S01–S03. There is no Slice 24.

---

## 4. What this amendment does not do

This amendment does **not**:

- reopen Slices 1–23;
- convert [`../plans/MVP-ARC.md`](../plans/MVP-ARC.md) into the current
  Program plan;
- activate post-MVP arcs;
- promote Raspberry Pi, LAN, phone controllers, live in-app AI, accounts,
  cloud sync, marketplace, auto-update, or SaaS management into REAL MVP;
- claim packaged-macOS Sony physical qualification;
- claim Windows physical runtime qualification;
- resolve signing / notarization owner gates;
- begin S04A or any later implementation slice.

---

## 5. Retained debts carried forward

| Item | Status |
| --- | --- |
| Packaged macOS Sony physical | **DEFERRED / NOT RUN / HARDWARE UNAVAILABLE** — close no later than terminal S04B; remain represented in S06 |
| Windows physical runtime | **NOT RUN** — close in S06 before v1 |
| Signing / notarization | **OPEN OWNER GATE** — Windows signing / SmartScreen has higher strategic release priority than Apple signing / notarization if prioritization is necessary |
| `CQS-Q23-CLASS-B-01` | **OPEN / CONTROLLED** |
| `CQS-Q23-LOW-02` | **OPEN / LOW / MONITOR** |
| `CQS-OD-066` | **DEFERRED / NOT REAL MVP** |

---

## 6. Historical-statement rule

Prefer:

```text
Subsequent REAL MVP product-direction registration established...
```

rather than retroactively changing historical S01/S02/S03/Slice 23
evidence. Current living docs may be updated to reflect the new frontier.
Durable files must not predict their own open delivery PR state.
