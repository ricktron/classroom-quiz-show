# Roadmap Amendment 003 — Remaining MVP rebalance (18 → 22 slices)

- **Amendment id:** `ROADMAP-AMENDMENT-003`
- **Slice identifier:** `CQS-PLAN-S02-REMAINING-MVP-REBALANCE`
- **Authorization:** `AUTHORIZE-CQS-PLAN-S02-REMAINING-MVP-REBALANCE-1`
- **Evidence state:** `CQS-PLAN-S02-ES-1`
- **Status:** Accepted (owner-authorized planning decision)
- **Date:** 2026-08-03
- **Base `main`:** `4df76f1dd504f0fdef5b27417edeec90471e6b62`
- **Type:** decision + documentation only — **no runtime code, no schema
  change, no test change, no dependency change, no CI/deploy change**
- **Amends:** the remaining sequence of the 18-slice plan in
  [`../plans/MVP-ARC.md`](../plans/MVP-ARC.md) (former Slices 15–18 only)
- **Preserves:** Slices 1–14 unchanged and `Complete`
- **Supersedes:** the current roadmap statements listed in §13
- **Does not supersede:** Amendment 001's architecture clauses, Amendment
  002's future-architecture lineage, accepted ADRs for completed slices, or
  any `CQS-OD-*` acceptance/activation state

This amendment is **decomposition and reconciliation**, with **one genuine
hardware-operationalization addition** (Slice 21 — Sony Buzz Supported-Profile
Operationalization). It grants **no product implementation authority**.

---

## 1. Status and authority

The owner authorized a documentation-only planning slice that amends the
current MVP sequence from **18 slices to 22 slices** by replacing the former
unstarted Slices 15–18 with eight more precisely bounded slices (15–22).

Binding consequences of this acceptance:

1. [`../plans/MVP-ARC.md`](../plans/MVP-ARC.md) becomes a **22-slice** plan of
   record.
2. Slices **1–14 remain unchanged** in identity, scope, and `Complete` status.
3. Former Slices **15–18 are superseded** as current plan entries; their names
   and combined scopes are remapped per §6.
4. **No implementation slice is started** by this amendment.
5. **No schema, public-wire, storage, UI, hardware, workflow, or deployment
   change** is authorized.
6. Historical receipts and historical statements remain records of what was
   true when written; they are superseded for *current* routing through this
   amendment, not rewritten.

---

## 2. Observed repository baseline

Observed immediately before mutation on host
`Ricks-MacBook-Air.local` as user `macdaddy`:

| Fact | Observed value |
| --- | --- |
| Repository | `ricktron/classroom-quiz-show` |
| Root | `/Users/macdaddy/Documents/Coding/Cursor Projects/classroom-quiz-show` |
| Branch before work | `main` |
| Local `HEAD` after fast-forward | `4df76f1dd504f0fdef5b27417edeec90471e6b62` |
| `origin/main` | `4df76f1dd504f0fdef5b27417edeec90471e6b62` |
| Working tree | clean (`git status --porcelain` empty) |
| Slices 1–14 | `Complete` and merged (Slice 14 via PR #32 at `ce2e103…`) |
| Former Slices 15–18 | `Planned` and unstarted — no implementation branch or PR |
| Phase 2B registration | present on `main` (PR #34 at `4df76f1…`) |
| Open rebalance / roadmap-mutation PR | none |
| Existing `ROADMAP-AMENDMENT-003` | absent |

Preflight stop conditions were **not** met: no remaining-MVP implementation had
begun, and no equivalent roadmap-rebalance work already existed.

---

## 3. Evidence reviewed

Everything in this section was **read directly in this slice** at
`4df76f1dd504f0fdef5b27417edeec90471e6b62`. Nothing else is claimed.

| Evidence | What it established |
| --- | --- |
| `docs/plans/MVP-ARC.md` | 18-slice plan of record; Slices 15–18 Planned; Slice 15 next |
| `docs/STATUS.md` | Slice 14 Complete; Slice 15 next; roadmap = 18 slices; Phase 2B registered |
| `docs/handoff/CURRENT.md` | Slices 1–14 Complete; Slice 15 Planned/unstarted; no Slice 15 authority |
| `docs/PROJECT.md` | Product identity and permanent MVP boundaries; no conflicting 18-slice claim requiring rewrite beyond routing surfaces |
| `README.md` | Current status ends at Slice 14 Complete / Slice 15 Planned |
| `docs/decisions/ROADMAP-AMENDMENT-001-local-buzzers.md` | Historical 11→18 amendment; introduced former Slices 15–18 |
| `docs/decisions/ROADMAP-AMENDMENT-002-expanded-gameplay-vision.md` | Future-architecture lineage; explicitly did **not** amend the 18-slice MVP |
| `docs/plans/EXPANDED-CQS-VISION-ARC.md` | Post-MVP arcs; routes MVP remaining work as Slices 15–18 |
| `docs/plans/CQS-DESIGN-PHASE-2B-DIRECTION.md` | Accepted Phase 2B direction; Slice 16 Theme engine as eventual consumer; Phase 3 not authorized |
| `docs/plans/SESSION-ANALYTICS-ASSESSMENT-AND-PARTICIPATION.md` | Post-MVP INSIGHT; MVP Slice 15 as summary seed |
| `docs/plans/LLM-SPREADSHEET-AUTHORING-ARC.md` | Post-MVP AUTHORING; MVP Slice 17 as spreadsheet seed dependency |
| `docs/architecture/ADR-002` … `ADR-006`, `ADR-011` … `ADR-014` | Retained architecture through Final-wager; wire 8 / sync 2 / schema 1 |
| `docs/receipts/2026-08-01-oadl2-s07-sony-buzz-physical-certification.md` | Bounded Sony Buzz physical claim under temporary keep-alive; permanent keep-alive unresolved |
| `docs/decisions/EXPANDED-VISION-OWNER-DECISIONS.md` | `CQS-OD-001`…`CQS-OD-086`; **`CQS-OD-066` unresolved** |
| `docs/plans/POST-MVP-OPPORTUNITY-AND-TRIGGER-REGISTER.md` | Post-MVP triggers keyed to former MVP Slice 15/16/17 numbers |
| `docs/decisions/README.md` | Amendment index; Amendment 002 “changes 18-slice plan in no way” |
| `git` / GitHub PR list | Phase 2B on `main`; no open remaining-MVP rebalance work |

### Explicit non-claims from evidence review

- No claim that any former Slice 15–18 implementation exists.
- No claim that permanent Sony Buzz keep-alive architecture exists.
- No Raspberry Pi compatibility, acceptance, or MVP-gate claim.
- No resolution of `CQS-OD-066`.
- No activation of any post-MVP arc.

---

## 4. Problems in the current Slices 15–18

The former four remaining slices were each a **compound** that mixed distinct
products, gates, and risk classes:

| Former slice | Problem |
| --- | --- |
| **15 — Session summary & compatible-profile reporting** | Combined (a) deterministic current-session summary derivation with (b) durable cross-session ledger/comparison. Those have different storage, privacy, and versioning requirements. |
| **16 — Theme engine** | Under-specified relative to accepted Phase 2B: tokens/themes are a foundation; audience-display system is a separate implementation consumer; Phase 3 readiness was already required but not sequenced as a planning gate before theme work. |
| **17 — Authoring & packs** | Combined self-contained portable packs, spreadsheet authoring seed, and standards/GCS tags. Packs and spreadsheet authoring are separable; standards tags are blocked on the unresolved CQS/GCS ownership boundary (`CQS-OD-066`). |
| **18 — Release readiness** | Assumed prior slices had closed hardware operationalization and classroom qualification concerns, but Sony Buzz permanent supported-profile work remained unresolved after OADL2-S07, and Raspberry Pi risked being misread as an MVP gate. |

Leaving those compounds intact would force oversized implementation slices,
obscure dependency order, and keep obsolete completion gates (standards tags;
implied appliance profiles) in the MVP critical path.

---

## 5. Retained architecture and product boundaries

This amendment changes **remaining-slice decomposition and ordering**, not
engine architecture. All of the following remain binding and unmodified:

1. Local-first, teacher-hosted; host state private and authoritative.
2. Projector state sanitized, read-only, fail-closed.
3. Command → pure reducer → append-only events → deterministic `replay()`.
4. Undo as auditable `EVENT_UNDONE`; reversible vs irreversible events.
5. Imported content is data, never executable code; fail closed on unknown.
6. One canonical validation/import pipeline (ADR-004).
7. Round types registered by application code only (ADR-003).
8. Hardware-independent local input boundary; product usable without controllers.
9. No backend, accounts, student phones, networked buzzers, AI service, or
   required cloud dependency under current MVP canon.
10. Current implementation truth: public-state wire **8**, sync envelope **2**,
    game-file schema **1** (Slices 1–14 Complete).
11. Amendment 002 future-architecture lineage remains **future** until named
    arcs are separately authorized.
12. Phase 2B remains accepted **design direction only** until later MVP slices
    implement it under separate authority.

---

## 6. Exact mapping from former Slices 15–18 to new Slices 15–22

| Former (18-slice plan) | Disposition | New (22-slice plan) |
| --- | --- | --- |
| Slice 15 — Session summary & compatible-profile reporting | **Split** | **15** Session Summary Contract · **16** Completed Summary Ledger & Compatible Reporting |
| Slice 16 — Theme engine | **Split / renamed** | **17** Theme and Design-Token Foundation · **18** Audience Display System (Phase 2B consumer) |
| Slice 17 — Authoring & packs | **Split; standards tags removed from MVP gate** | **19** Self-Contained Portable Packs · **20** Spreadsheet Authoring Seed |
| Slice 18 — Release readiness | **Renamed / clarified; hardware gate extracted** | **22** Classroom Release Qualification |
| *(not a former slice)* | **Genuine addition** (operationalizes OADL2-S07 bounded claim) | **21** Sony Buzz Supported-Profile Operationalization |
| *(planning lane, not an MVP product slice)* | **Required before Slice 17 implementation** | Phase 3 display-system readiness/specification (documentation/specification only) |

Former slice identifiers (`CQS-SLICE-15-REPORTING`, `CQS-SLICE-16-THEME-ENGINE`,
`CQS-SLICE-17-AUTHORING-PACKS`, `CQS-SLICE-18-RELEASE-READINESS`) are retained
as **historical names** only. Current plan identifiers are listed in §7.

---

## 7. Binding slice records (Slices 15–22)

### Slice 15 — Session Summary Contract

- **Identifier:** `CQS-SLICE-15-SESSION-SUMMARY-CONTRACT`
- **Purpose:** Derive one deterministic host-private completed-session summary
  from authoritative replay.
- **Must:**
  - define a versioned summary contract;
  - depend explicitly on the current state/event core and the category-board,
    scoring, timer, buzz, persistence/recovery, and Final behavior;
  - handle undo and irreversible events;
  - distinguish observed facts from derived values;
  - prohibit ungrounded “accuracy,” reaction-time, mastery, or grading claims;
  - produce a teacher-readable current-session summary;
  - add **no** completed-session storage.
- **Exclude:** cross-session history; full event archive; telemetry; transcript;
  question analytics; individual identity; LMS/GCS integration.
- **Depends on:** 2, 5, 6, 7, 8, 13, 14.
- **Impact class:** schema no · public-wire no · storage no · UI yes · hardware
  no · deployment no.
- **Status:** `Planned` — unstarted.
- **Definition of done:** versioned contract documented and implemented with
  tests proving summary derivation from replay only; no completed-session store;
  `verify:all` green; no ungrounded metric claims.
- **Owner gate:** separate authorization to begin implementation.

### Slice 16 — Completed Summary Ledger & Compatible Reporting

- **Identifier:** `CQS-SLICE-16-SUMMARY-LEDGER`
- **Purpose:** Store privacy-minimized summary records and compare only
  semantically compatible summaries.
- **Must:**
  - create storage separate from active recovery and saved definitions;
  - store summaries, not complete event histories;
  - define versioned competitive-profile semantics;
  - compare only compatible summary/profile versions;
  - provide retention and deletion controls;
  - keep reports team/class focused;
  - make incompatibility visible rather than silently comparing;
  - preserve the future full archive for `CQS-ARC-INSIGHT`.
- **Exclude:** full session archive; raw telemetry; transcript; exact private
  response retention; individual student identity; mastery or psychometric
  claims.
- **Depends on:** 13, 15.
- **Impact class:** schema no · public-wire no · storage **yes** (new summary
  store, not recovery) · UI yes · hardware no · deployment no.
- **Status:** `Planned` — unstarted.
- **Definition of done:** summary ledger with retention/deletion; compatible
  comparison only; incompatibility visible; tests; `verify:all` green.
- **Owner gate:** separate authorization; `OG-7` remains binding against
  individual identity.

### Slice 17 — Theme and Design-Token Foundation

- **Identifier:** `CQS-SLICE-17-THEME-TOKENS`
- **Purpose:** Create an application-owned visual foundation for Phase 2B.
- **Must:**
  - define tokens and a controlled theme registry;
  - include default and high-contrast themes;
  - provide reduced-motion parity;
  - support 1920×1080 and 1280×720;
  - support 1–8 teams, maximum-length names, and negative scores;
  - prevent imported content from supplying arbitrary style values;
  - avoid a game-schema or public-wire theme field unless separately justified
    and authorized;
  - require a preceding **Phase 3** design-system readiness/specification lane.
- **Exclude:** full Phase 2B layout implementation; imported CSS;
  content-defined animations; presentation becoming game authority.
- **Depends on:** 5, 6; **Phase 3 planning lane** (documentation/specification).
- **Impact class:** schema **no by default** · public-wire **no by default** ·
  storage no · UI yes · hardware no · deployment no.
- **Status:** `Planned` — unstarted.
- **Definition of done:** token/theme foundation with default + high-contrast;
  reduced-motion parity; viewport/team/name/score fixtures; no content-supplied
  styles; `verify:all` green.
- **Owner gate:** Phase 3 readiness complete **and** separate Slice 17
  implementation authorization.

### Slice 18 — Audience Display System

- **Identifier:** `CQS-SLICE-18-AUDIENCE-DISPLAY`
- **Purpose:** Implement the accepted Phase 2B audience-display direction.
- **Must include:** board-first composition; Nexus Core; Score Column, Score
  Strip, and Score Deck; compact, expanded, and Final Signal Rails; quiet
  cognition; loud consequences; neutral living-board memory; visible depletion
  and cleared-category presentation; Final settlement, winner, and tie-safe
  states; a complete display-state matrix; privacy tests and public-wire
  compatibility analysis; initial use of public wire **8** wherever sufficient.
- **Must not infer or reveal:** public queue order; private Final eligibility;
  private wagers or responses; tile correctness/ownership history; rosters or
  representatives.
- **Any necessary public-state addition** requires separately identified
  authorization and a deliberate wire-version decision.
- **Depends on:** 14, 17; Phase 2B direction document.
- **Impact class:** schema no (unless separately authorized) · public-wire
  **possibly** (only with separate wire authorization) · storage no · UI **yes**
  · hardware no · deployment no.
- **Status:** `Planned` — unstarted.
- **Definition of done:** Phase 2B composition implemented against the display
  matrix; privacy tests; wire compatibility analysis; `verify:all` green.
- **Owner gate:** separate authorization; any wire bump is a nested gate.

### Slice 19 — Self-Contained Portable Packs

- **Identifier:** `CQS-SLICE-19-PORTABLE-PACKS`
- **Purpose:** Bundle canonical game JSON and local media into a safe, offline,
  portable artifact.
- **Must include:** versioned pack envelope/manifest; canonical JSON as authored
  truth; deterministic internal media paths; safe import/extraction rules;
  limits and structured diagnostics; export and import; clean-environment
  round-trip proof; host-only answer-key/privacy warnings; offline play.
- **Exclude:** spreadsheet authoring; AI; question bank; remote media; new media
  kinds unless separately authorized.
- **Depends on:** 4, 11, 12.
- **Impact class:** game schema **no by default** · pack format **yes** ·
  public-wire no · storage possibly · UI yes · hardware no · deployment no.
  The pack contract is a new separately versioned envelope/manifest that wraps
  or carries canonical game JSON; it does not silently redefine canonical
  game-file schema version 1. Any canonical game-schema change requires
  separate explicit authorization.
- **Status:** `Planned` — unstarted.
- **Definition of done:** pack export/import round-trip in a clean environment;
  fail-closed diagnostics; offline play proven; `verify:all` green.
- **Owner gate:** separate authorization.

### Slice 20 — Spreadsheet Authoring Seed

- **Identifier:** `CQS-SLICE-20-SPREADSHEET-AUTHORING-SEED`
- **Purpose:** Allow teachers to build a playable game without writing JSON.
- **Initial supported workbook profiles:** (1) Classic Board · (2) Board + Final.
- **Required pipeline:** workbook → non-playable draft → located diagnostics →
  teacher review/correction → explicit approval → canonical JSON → existing
  strict importer → optional portable pack.
- **Must:** maintain one canonical validation boundary; include embedded
  model-neutral instructions suitable for external LLM use; require teacher
  approval; fail closed; avoid direct model/provider integration; narrow the
  editing surface to review and correction needs.
- **Exclude:** direct LLM API; full editor product; question bank; item-family
  identity; live clue swapping; assessment promotion; GCS integration;
  **standards tags as an MVP completion gate**.
- **Depends on:** 4, 5, 12, 14; 19 optional for pack hand-off.
- **Impact class:** game schema **no by default** · workbook/draft format **yes**
  · storage **no by default** · public-wire no · UI yes · hardware no ·
  deployment no. Workbook and non-playable draft formats may have their own
  versioned authoring contracts; those contracts are not runtime truth. Output
  must still compile to canonical JSON and pass through the existing strict
  importer. A canonical game-schema change requires separate explicit
  authorization. Persistent draft storage is not required for Slice 20
  completion unless separately authorized. Item-family metadata, question-bank
  schema, GCS identifiers, and post-MVP authoring architecture are not
  authorized here.
- **Status:** `Planned` — unstarted.
- **Definition of done:** both workbook profiles produce playable games only
  after teacher approval through ADR-004; embedded model-neutral instructions;
  fail-closed diagnostics; `verify:all` green.
- **Owner gate:** separate authorization; `CQS-OD-066` remains unresolved and
  **does not** gate this slice.

### Slice 21 — Sony Buzz Supported-Profile Operationalization

- **Identifier:** `CQS-SLICE-21-SONY-BUZZ-SUPPORTED-PROFILE`
- **Purpose:** Turn the bounded OADL2-S07 physical certification into one
  repeatable supported profile.
- **Target profile (exact):** macOS · supported Chrome · Namtai wireless
  `Wbuzz` · vendor/product `054c:1000` · four handsets · keyboard fallback.
- **Must include:** architecture ADR; permanent packaged keep-alive lifecycle;
  health and failure reporting; unplug/replug and recovery behavior;
  host-private mapping persistence; clear teams-bearing setup path; exact
  supported-profile documentation; release-candidate physical certification.
- **Must not claim:** generalized cross-platform, wired, Bluetooth, Raspberry
  Pi, or all-SKU support.
- **Stop rule:** if a safe permanent profile proves infeasible, stop for an
  explicit owner decision to reclassify Sony Buzz as experimental; **do not**
  silently downgrade the claim.
- **Depends on:** 9, 10, **13**; OADL2-S07 receipt as evidence baseline.
- **Persistence boundary:** mapping persistence must follow the existing
  host-private persistence and coordination discipline (Slice 13 / ADR-013).
  Slice 21 must **not** create a second import pipeline, an unrelated
  persistence authority, public mapping state, or a projector persistence
  protocol. Exact storage design belongs to the Slice 21 ADR.
- **Impact class:** schema no · public-wire no · storage **yes** (host-private
  mapping persistence) · UI yes · hardware **yes** · deployment **possibly**
  (packaging for keep-alive lifecycle only as required by the ADR).
- **Status:** `Planned` — unstarted.
- **Definition of done:** ADR accepted; permanent keep-alive lifecycle packaged;
  supported-profile docs exact; RC physical certification receipt; keyboard
  fallback preserved; `verify:all` green.
- **Owner gate:** separate authorization; infeasibility escalation is owner-only.

### Slice 22 — Classroom Release Qualification

- **Identifier:** `CQS-SLICE-22-CLASSROOM-RELEASE-QUALIFICATION`
- **Purpose:** Prove a teacher can rely on the product in class.
- **Must include:** clean-install golden-path rehearsal; pack import/export;
  team/input setup; complete board and Final session; timer, buzz, score,
  correction, undo, recovery, summary, and comparison; 1920×1080 and 1280×720;
  1, 4, 6, and 8 teams; long names and negative scores; image failure; reduced
  motion; high contrast; grayscale and projector-washout checks; keyboard-only
  operation; semantic/screen-reader review; physical viewing-distance test; PWA
  install, update, offline, and reset; owner-performed deployment verification;
  support matrix and known limitations; data retention/deletion documentation.
- **Rule:** no architecture or new feature may originate in Slice 22. Material
  defects require separately bounded repair.
- **Raspberry Pi 5:** may receive an **observational smoke test** but is **not**
  an MVP acceptance gate or compatibility claim.
- **Depends on:** 15–21 (all prior remaining slices).
- **Impact class:** schema no · public-wire no · storage no · UI polish only ·
  hardware no new capability · deployment verification **yes**.
- **Status:** `Planned` — unstarted.
- **Definition of done:** qualification matrix receipt; owner live-deployment
  verification; support matrix; retention/deletion docs; `verify:all` green.
- **Owner gate:** separate authorization; owner live verification is required
  evidence and cannot be satisfied by CI alone.

---

## 8. Dependency graph and roadmap ordering

```text
15 Session Summary Contract
  ↓
16 Completed Summary Ledger & Compatible Reporting
  ↓
Phase 3 display-system readiness/specification — planning-only
  ↓
17 Theme and Design-Token Foundation
  ↓
18 Audience Display System
  ↓
19 Self-Contained Portable Packs
  ↓
20 Spreadsheet Authoring Seed
  ↓
21 Sony Buzz Supported-Profile Operationalization
  ↓
22 Classroom Release Qualification
```

**Parallelism allowance (planning only):** the Program Orchestrator may run the
Phase 3 planning lane while Slice 15 or 16 implementation is underway **only if**
ownership and changed paths do not conflict. Product implementation sequence
remains ordered unless a later explicit amendment changes it.

---

## 9. Impact classifications (summary)

| Slice | Schema / format | Public wire | Storage | UI | Hardware | Deployment |
| --- | --- | --- | --- | --- | --- | --- |
| 15 | game schema no | no | no | yes | no | no |
| 16 | game schema no | no | yes (summaries) | yes | no | no |
| 17 | game schema no by default | no by default | no | yes | no | no |
| 18 | game schema no* | possibly* | no | yes | no | no |
| 19 | game schema no by default · pack format yes | no | possibly | yes | no | no |
| 20 | game schema no by default · workbook/draft format yes | no | no by default | yes | no | no |
| 21 | game schema no | no | yes (mappings; follows Slice 13 discipline) | yes | yes | possibly |
| 22 | game schema no | no | no | polish | no new | verification |

\* Slice 18 may require a public-state addition only under separate
authorization and a deliberate wire-version decision.

---

## 10. Owner gates

| Gate | Applies to | Status |
| --- | --- | --- |
| Separate implementation authorization per slice | 15–22 | Required; **none granted here** |
| Phase 3 display-system readiness/specification | Before Slice 17 implementation | Required; **not authorized here** |
| Public-wire version decision | Slice 18 only if wire 8 is insufficient | Nested; not granted |
| `OG-7` individual identity | Reporting slices | Remains deferred / excluded for MVP |
| Sony Buzz infeasibility reclassification | Slice 21 stop rule | Owner-only if triggered |
| Owner live deployment verification | Slice 22 | Required evidence |
| `CQS-OD-066` GCS ownership boundary | Standards/GCS tags | **Unresolved**; removed from MVP completion requirement |

---

## 11. Definitions of done (cross-cutting)

For every remaining MVP slice:

1. Named slice authorization exists and names an exact base.
2. Scope matches the binding record in §7 (no silent widening).
3. Required verification for that slice is observed, not assumed.
4. Privacy and fail-closed invariants are preserved.
5. Completion is not claimed before merge and required evidence.
6. No post-MVP capability is smuggled into an MVP slice.

---

## 12. Explicit exclusions (MVP-wide, remaining sequence)

The following remain **out of MVP** (post-MVP or permanently excluded as
already recorded):

- Full completed-session archives, telemetry, transcripts, question analytics,
  assessment promotion, and individual identity.
- Direct LLM integration, question-bank storage, item-family identity, live
  clue swapping, and a full editor product.
- Standards/GCS tags as an MVP completion requirement (pending `CQS-OD-066`).
- Raspberry Pi 5 as an MVP release gate or compatibility claim.
- Generalized Sony Buzz / cross-platform / wired / Bluetooth / all-SKU support.
- Backend, accounts, student phones, networked buzzers, required cloud AI.
- Any activation of `CQS-ARC-*` post-MVP arcs.

---

## 13. Superseded roadmap statements

The following are **superseded as current plan statements**. Historical
documents that contain them remain valid as records of what was true when
written.

1. “The MVP is an **18-slice** plan” as the *current* sequence.
2. Current plan entries for:
   - Slice 15 — Session summary & compatible-profile reporting
   - Slice 16 — Theme engine
   - Slice 17 — Authoring & packs
   - Slice 18 — Release readiness
3. Routing that names **Slice 16 Theme engine** as the sole Phase 2B MVP
   implementation consumer.
4. Routing that names **Slice 17** as the MVP spreadsheet/authoring seed for
   post-MVP `CQS-ARC-AUTHORING`.
5. Routing that names **Slice 15** alone as both summary contract and
   cross-session ledger/comparison.
6. Any implication that standards/GCS tags are required to complete MVP
   authoring.
7. Any implication that Raspberry Pi 5 is an MVP acceptance gate.

**Not superseded:** Amendment 001 architecture clauses; Amendment 002
future-architecture clauses; completed-slice ADRs; OADL2-S07 bounded claim;
`CQS-OD-066` unresolved status.

---

## 14. Interaction with Phase 2B

- Phase 2B registration remains accepted program guidance
  ([`../plans/CQS-DESIGN-PHASE-2B-DIRECTION.md`](../plans/CQS-DESIGN-PHASE-2B-DIRECTION.md)).
- **MVP implementation consumers are now Slices 17–18** (theme/token foundation,
  then audience display system).
- A **separate documentation/specification-only Phase 3** display-system
  readiness lane is **required before Slice 17 implementation**.
- Phase 3 is **not** authorized by this amendment.
- Slice 17 and Slice 18 remain **unauthorized** for implementation here.

---

## 15. Interaction with expanded post-MVP arcs

| Arc / dossier | MVP dependency after this amendment |
| --- | --- |
| `CQS-ARC-INSIGHT` / session analytics | Depends on MVP **Slices 15–16** (summary contract + ledger) as the seed; full archive remains post-MVP |
| `CQS-ARC-AUTHORING` / spreadsheet+LLM | Depends on MVP **Slice 20** (spreadsheet authoring seed); packs via Slice 19 remain available composition |
| Phase 2B visual system | MVP **Slices 17–18** |
| Release / classroom reliance | MVP **Slice 22** |
| Formats, identity, participation, GCS | Unchanged post-MVP; **no arc activated** |

Amendment 002 still amends **no completed ADR** and still activates **nothing**.
Its “does not change the 18-slice plan” statement is historically true at its
writing and is superseded for *current* MVP counting by this amendment.

---

## 16. Sony Buzz supported-profile disposition

- Sony Buzz remains a **bounded MVP-supported target**.
- Slice 21 requires **permanent operationalization** for **one exact supported
  profile** (macOS / supported Chrome / Namtai wireless `Wbuzz` / `054c:1000` /
  four handsets / keyboard fallback).
- OADL2-S07 remains the bounded temporary-keep-alive evidence baseline.
- Claims beyond that exact profile are forbidden unless a later owner decision
  expands them.
- If permanent operationalization is infeasible, escalate — do not silently
  relabel as experimental.

---

## 17. Raspberry Pi post-MVP disposition

- **Raspberry Pi 5 is a post-MVP appliance profile.**
- It is **not** an MVP release gate.
- Slice 22 may include an observational smoke test only, with **no**
  compatibility or acceptance claim.

---

## 18. Next safe product action

After this amendment merges:

1. Exact-head Program Orchestrator review of the amendment PR (this delivery).
2. After merge/reconciliation: Program Orchestrator readiness for **Slice 15 —
   Session Summary Contract** as the next product implementation candidate.
3. Phase 3 planning lane may be scheduled per §8’s parallelism rule.

**This amendment does not authorize Slice 15 implementation.**

---

## 19. Decomposition statement

This is **decomposition and reconciliation** of the former remaining four
slices into eight, plus sequencing of the already-required Phase 3 planning
lane before theme work. The **one genuine addition** beyond pure split/rename
is **Slice 21 — Sony Buzz Supported-Profile Operationalization**, which closes
the permanent keep-alive / supported-profile gap left after OADL2-S07 rather
than inventing a new product category.

---

## 20. No product implementation authorized

**No product implementation is authorized by `CQS-PLAN-S02` or by this
amendment.** No runtime code, schema, fixture, test, package, lockfile,
workflow, asset, or deployment configuration may change under this
authorization. Implementation of any of Slices 15–22 requires its own bounded
owner authorization naming an exact base.
