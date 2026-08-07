# Roadmap Amendment 004 — MVP audio and release rebalance (22 → 23 slices)

- **Amendment id:** `ROADMAP-AMENDMENT-004`
- **Slice identifier:** `CQS-PLAN-S03-MVP-AUDIO-AND-RELEASE-REBALANCE`
- **Authorization:** `AUTHORIZE-CQS-PLAN-S03-MVP-AUDIO-AND-RELEASE-REBALANCE-1`
- **Evidence state:** `CQS-PLAN-S03-ES-1`
- **Status:** Accepted (owner-authorized planning decision) — **merged to
  `main`** via PR #48 at squash `a73e6f86bf0757aa118cb9c3247f4e6eddaa090b`
  (merged **2026-08-07T18:15:39Z**)
- **Date:** 2026-08-07
- **Exact base `main` (delivery base):** `ee7ed93c3336a99afc4f1945b0cc8678b855dd8a`
- **Merge evidence:**
  [`../receipts/2026-08-07-cqs-plan-s03-post-merge-reconciliation.md`](../receipts/2026-08-07-cqs-plan-s03-post-merge-reconciliation.md)
- **Type:** decision + documentation only — **no runtime code, no schema
  change, no asset addition, no test change, no dependency change, no
  CI/deploy change**
- **Amends:** the remaining sequence of the 22-slice plan in
  [`../plans/MVP-ARC.md`](../plans/MVP-ARC.md) by inserting one new product
  slice and renumbering classroom release qualification
- **Preserves:** Slices 1–18 unchanged and `Complete`; Slices 19–21 unchanged
  in substance
- **Supersedes:** current roadmap-count and Slice-22-qualification routing
  statements listed in §13
- **Does not supersede:** Amendment 001 architecture clauses, Amendment 002
  future-architecture lineage, Amendment 003 historical mapping and completed
  Slice 15–18 binding records, accepted ADRs, or any `CQS-OD-*`
  acceptance/activation state

This amendment is a **bounded MVP rebalance**: minimal functional presentation
audio enters the MVP as Slice 22; former Slice 22 Classroom Release
Qualification becomes Slice 23 with clarified audio and Phase 2B
visual-fidelity qualification gates. It grants **no product implementation
authority**.

---

## 1. Status and authority

The owner authorized a documentation-only planning slice that amends the
current MVP sequence from **22 slices to 23 slices**.

Binding consequences of this acceptance:

1. [`../plans/MVP-ARC.md`](../plans/MVP-ARC.md) becomes a **23-slice** plan of
   record.
2. Slices **1–18 remain unchanged** in identity, scope, and `Complete` status.
3. Slices **19–21 remain unchanged in substance** (portable packs; spreadsheet
   authoring seed; Sony Buzz supported-profile operationalization).
4. **New Slice 22 — Minimal Presentation Audio** is added to the MVP plan.
5. Former **Slice 22 — Classroom Release Qualification** is renumbered to
   **Slice 23** and clarified (audio qualification + Phase 2B visual-fidelity
   calibration gate; existing qualification contract preserved and not
   weakened).
6. **No implementation slice is started** by this amendment — including Slice
   19, Slice 22 audio, and Slice 23 qualification.
7. **No schema, public-wire, sync-envelope, command/event/reducer, storage,
   GameDefinition, package, dependency, workflow, deployment, or asset change**
   is authorized.
8. Historical receipts and historical statements remain records of what was
   true when written; they are superseded for *current* routing through this
   amendment, not rewritten.

---

## 2. Observed repository baseline

Observed immediately before mutation on host
`Ricks-MacBook-Air.local` as user `macdaddy` (UTC **2026-08-07T17:57:05Z**):

| Fact | Observed value |
| --- | --- |
| Repository | `ricktron/classroom-quiz-show` |
| Root | `/Users/macdaddy/Documents/Coding/Cursor Projects/classroom-quiz-show` |
| Authorized exact base / `origin/main` | `ee7ed93c3336a99afc4f1945b0cc8678b855dd8a` |
| Working tree before branch creation | clean (`git status --short` empty) |
| Open PRs | none |
| Existing `ROADMAP-AMENDMENT-004` | absent |
| Branch matching `plan-s03` / `audio` | none |
| Slices 1–18 | `Complete` and merged (Slice 18 via PR #46 at `91c7708…`; reconciliation on `main` at `ee7ed93…`) |
| Slices 19–22 (then-current) | `Planned` and unauthorized — no product implementation |
| Product audio / playback / bundled sound assets | absent (media `kind: 'audio'` remains unsupported/fail-closed only) |
| Slice 19 implementation | not started |
| Post-MVP arcs | inactive |
| `CQS-OD-066` | unresolved |
| Inherited Final mid-refresh Playwright flake | unresolved |

Preflight stop conditions were **not** met: `origin/main` matched the
authorized exact base; no equivalent Amendment 004 / S03 work existed; no
product audio implementation had begun; Slice 19 had not started; no open PR
owned overlapping roadmap surfaces.

---

## 3. Evidence reviewed

Everything in this section was **read directly in this slice** at
`ee7ed93c3336a99afc4f1945b0cc8678b855dd8a`. Nothing else is claimed.

| Evidence | What it established |
| --- | --- |
| `AGENTS.md`, `README.md`, `docs/PROJECT.md` | Product identity, agent discipline, current README routing at 22 slices |
| `docs/STATUS.md`, `docs/handoff/CURRENT.md` | Slices 1–18 Complete; Slices 19–22 Planned; Slice 19 next frontier; deferred team buzz-sound owner direction; 22-slice routing |
| `docs/plans/MVP-ARC.md` | 22-slice plan of record; Slice 22 = Classroom Release Qualification |
| `docs/decisions/ROADMAP-AMENDMENT-003-remaining-mvp-rebalance.md` | Binding 18→22 mapping; Slice 22 qualification contract |
| `docs/decisions/README.md` | Amendment index through Amendment 003 |
| `docs/plans/CQS-DESIGN-PHASE-2B-DIRECTION.md` | Accepted Phase 2B direction; accessibility/qualification routed to Slice 22 |
| `docs/plans/CQS-PHASE-3-DESIGN-SYSTEM-READINESS.md` | Phase 3 readiness; Slice 22 handoff for qualification |
| `docs/plans/HOST-CONSOLE-TEAM-IDENTITY-AND-PRESENTATION.md` | Post-MVP identity packs / presentation effects including team sounds |
| `docs/plans/POST-MVP-OPPORTUNITY-AND-TRIGGER-REGISTER.md` | `CQS-OPP-PRESENTATION-EFFECTS` deferred partly for bundled-audio licensing |
| `docs/plans/EXPANDED-CQS-VISION-ARC.md` | Post-MVP arcs; mutable 22-slice MVP routing |
| `docs/decisions/EXPANDED-VISION-OWNER-DECISIONS.md` | `CQS-OD-*` register; routing note at 22 slices; `CQS-OD-066` unresolved |
| Slice 18 receipts / architecture ADRs (events, buzz, scoring, timers, Final, presentation, media/offline) | Completed foundation; contracts/versions unchanged; no audio playback |
| `git` / GitHub PR list / branch list | Exact base; no open overlapping planning PR; no Amendment 004 |

### Explicit non-claims from evidence review

- No claim that any Slice 19–22 product implementation exists.
- No claim that audio assets, playback code, or mute UI exist.
- No resolution of `CQS-OD-066`.
- No activation of any post-MVP arc.
- No claim that all presentation-audio licensing questions are solved.

---

## 4. Problem statement

Classroom play already has authoritative buzz, score, timer, and completion
facts, plus a completed Phase 2B audience-display foundation (Slices 17–18),
but the product still provides **no** minimal game-show audio feedback. Leaving
*all* sound deferred until the broader presentation/identity arc forces either:

1. a weak classroom/game-show feel through release qualification, or
2. an oversized post-MVP presentation-effects project that mixes licensing,
   team identity, animation, celebrations, and sound packs.

Separately, Phase 2B visual direction is accepted and implemented for MVP
consumers, but **production visual-fidelity calibration against that direction
in the real classroom/projector environment** still belongs in qualification —
not in a new polish/redesign slice and not as silent feature work inside
qualification.

---

## 5. Owner inputs (binding)

1. **Minimal functional audio moves into MVP** as a new Slice 22.
2. Former Slice 22 becomes **Slice 23 — Classroom Release Qualification**.
3. Slices **19–21 are unchanged in substance**.
4. Slice 22 intent is **minimal useful classroom/game-show feedback**, not a
   full presentation-effects or audio architecture.
5. **Theme song / opening music identity** remains a durable future desire and
   is **not** an MVP requirement.
6. Advanced/team-specific presentation effects remain post-MVP
   (`CQS-OPP-PRESENTATION-EFFECTS`).
7. Phase 2B visual-fidelity calibration is a **qualification gate** on Slice 23,
   not a redesign or speculative polish slice.
8. Default contract impact for Slice 22 remains **no** change to game schema,
   `GameDefinition`, public-state wire, sync envelope, commands/events,
   reducer, or persistence version.

---

## 6. Why minimal audio crosses the MVP threshold

Minimal, application-owned cues improve classroom timing and game-show feedback
using facts the engine already owns (active buzz/claim, award, incorrect
response, timer expiration, game complete). The work is bounded, offline,
licensing-scoped to a tiny generic cue set, presentation-only, and
comprehensible without audio. It does **not** require team identity, authored
sound packs, schema/wire changes, or the broader presentation architecture.

---

## 7. Why the theme song does not

A recognizable theme/opening identity is desirable eventually, but it is not
required for classroom reliance. It must remain intentionally triggered,
muteable/skippable, non-authoritative, and outside game/schema/wire contracts.
Including it in Slice 22 or Slice 23 would expand MVP into brand-music scope
without a classroom-reliance need.

---

## 8. Why visual calibration belongs in qualification

Phase 2B already accepted the visual direction; Slices 17–18 already delivered
the MVP consumers. What remains is **inspecting the production app in the real
classroom/projector environment** against that direction. That is release
qualification evidence, not a new feature/polish slice. Real defects fail the
gate, are documented, and route to separately authorized bounded repair — they
must not silently redesign or add major features inside qualification.

---

## 9. Exact mapping (22-slice → 23-slice)

| Current 22-slice plan | New 23-slice plan |
| --- | --- |
| 19 Self-Contained Portable Packs | **19 unchanged** |
| 20 Spreadsheet Authoring Seed | **20 unchanged** |
| 21 Sony Buzz Supported-Profile Operationalization | **21 unchanged** |
| 22 Classroom Release Qualification | **23** renumbered + clarified (audio + Phase 2B visual-fidelity gates) |
| *(none)* | **22 Minimal Presentation Audio** (genuine addition) |

Former identifier `CQS-SLICE-22-CLASSROOM-RELEASE-QUALIFICATION` is retained as
a **historical name** only. Current qualification identifier is
`CQS-SLICE-23-CLASSROOM-RELEASE-QUALIFICATION`.

---

## 10. Binding Slice 22 — Minimal Presentation Audio

- **Identifier:** `CQS-SLICE-22-MINIMAL-PRESENTATION-AUDIO`
- **Purpose:** Provide a bounded, application-owned set of non-authoritative
  live audio cues that materially improves classroom/game-show feedback without
  activating the broader Presentation/Identity arc.
- **Must:**
  - small application-owned cue vocabulary;
  - successful active buzz / active-team claim cue;
  - positive / full-credit award cue;
  - incorrect-response cue;
  - timer-expiration cue;
  - restrained game-complete cue;
  - host master mute;
  - restrained volume control;
  - fully offline operation;
  - licensing-safe bundled/local assets;
  - visual equivalent for every cue;
  - functionality remains comprehensible without audio;
  - cue derivation from already-authoritative live facts where practical;
  - stale/replayed cue suppression after refresh, reconnect, recovery, replay,
    and undo;
  - playback deduplication;
  - presentation completion outside game authority;
  - semantics independent of keyboard / gamepad / Sony handset / button
    identity;
  - tests for mute plus stale/repeated cue suppression.
- **Exclude:**
  - theme song / opening music;
  - team-specific sound packs;
  - identity packs;
  - entrance effects;
  - custom authored audio;
  - uploaded sounds;
  - remote audio;
  - celebration libraries;
  - broad victory-fanfare system;
  - soundboard UI;
  - animation systems;
  - controller-specific sounds;
  - audience-authored audio configuration;
  - broader presentation-effects architecture;
  - wholesale promotion of `CQS-OPP-PRESENTATION-EFFECTS`.
- **Dependencies:**
  - **Architectural:** existing state/event core and completed
    audience/presentation foundation, especially Slice 18.
  - **Roadmap sequencing:** occurs after Slice 21 in the plan of record.
  - **Not automatic:** Slice 21 is **not** a hard architecture dependency merely
    because of order.
- **Expected impact (default):**

  ```text
  game schema: no
  GameDefinition: no
  public wire: no
  sync envelope: no
  event/command/reducer contracts: no
  storage version: no
  UI: yes
  local assets: yes
  hardware: no direct dependency
  deployment: bundled static assets only
  game authority: no
  ```

  A future Slice 22 implementation orchestrator must perform fresh discovery and
  **stop for separate owner authority** if any of those contract/version changes
  is genuinely necessary.
- **Definition of done (later implementation):** bounded cue registry/playback;
  local licensing-safe assets; mute/volume controls; stale/replayed cue
  suppression; no authoritative coupling; visual parity; tests; `verify:all`
  green; no unapproved contract/version changes.
- **Status after this planning amendment:** `Planned` / **unauthorized** for
  implementation.
- **Owner gate:** separate authorization to begin implementation.

### Architecture defaults (binding on later implementation)

- application-owned cues;
- licensing-safe bundled/local assets;
- fully offline;
- host master mute;
- restrained volume control;
- visual equivalent for every cue;
- audio optional for comprehension;
- no physical-controller/button identity in sound semantics;
- presentation completion never gates authority;
- refresh/reconnect/recovery/replay/undo must not replay stale cues;
- deduplicate cue playback;
- derive cues from already-authoritative live facts where practical;
- no authored sound-pack system;
- no team-specific identity system.

---

## 11. Binding Slice 23 — Classroom Release Qualification

- **Identifier:** `CQS-SLICE-23-CLASSROOM-RELEASE-QUALIFICATION`
- **Purpose:** Prove a teacher can rely on the product in class.
- **Preserved from former Slice 22:** the existing teacher-reliant classroom
  proof contract is **not weakened**. Must continue to include clean-install
  golden-path rehearsal; pack import/export; team/input setup; complete board
  and Final session; timer, buzz, score, correction, undo, recovery, summary,
  and comparison; 1920×1080 and 1280×720; 1, 4, 6, and 8 teams; long names and
  negative scores; image failure; reduced motion; high contrast; grayscale and
  projector-washout checks; keyboard-only operation; semantic/screen-reader
  review; physical viewing-distance test; PWA install, update, offline, and
  reset; owner-performed deployment verification; support matrix and known
  limitations; data retention/deletion documentation.
- **Added — Slice 22 audio qualification:**
  - master mute works;
  - classroom volume is sensible;
  - audio assets are available offline;
  - no stale/recovery replay;
  - complete functionality without audio.
- **Added — Phase 2B visual-fidelity calibration gate:**
  - This is **qualification**, not a redesign or speculative polish slice.
  - Inspect the production app in the real classroom/projector environment
    against accepted Phase 2B direction.
  - At minimum inspect representative states: flagship board; active response;
    near-completion board; quiet cognition; Final; tied Final/result;
    1280×720; 1920×1080 where applicable; high contrast; reduced motion; actual
    projector/viewing-distance conditions.
  - Explicitly calibrate: board-first hierarchy; Nexus readability; Score
    Column; Score Strip; Score Deck; Signal Rails; quiet cognition; living-board
    depletion/cleared categories; Final/result presentation.
  - If a real visual defect is exposed: (1) fail the relevant qualification
    gate; (2) document the exact defect; (3) route to separately authorized
    bounded repair; (4) **do not** silently redesign or add major features
    inside qualification.
- **Rule:** no architecture or new feature may originate in Slice 23. Material
  defects require separately bounded repair.
- **Raspberry Pi 5:** may receive an **observational smoke test** but is **not**
  an MVP acceptance gate or compatibility claim.
- **Depends on:** 15–22 (all prior remaining slices, including Minimal
  Presentation Audio).
- **Impact class:** schema no · public-wire no · storage no · UI polish only ·
  hardware no new capability · deployment verification **yes**.
- **Status:** `Planned` — unstarted / unauthorized.
- **Definition of done:** qualification matrix receipt including audio and
  Phase 2B visual-fidelity gates; owner live-deployment verification; support
  matrix; retention/deletion docs; `verify:all` green.
- **Owner gate:** separate authorization; owner live verification is required
  evidence and cannot be satisfied by CI alone.

---

## 12. Retained architecture, contracts, and versions

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
10. Current implementation truth (unchanged by this amendment):
    public-state wire **8**, sync envelope **2**, canonical game-file schema
    **1**, GameDefinition model **1**, private active-session wire **1**,
    IndexedDB schema **2**, Session Summary contract **1**, completed-summary
    envelope **1**, competitive profile **1**.
11. Amendment 002 future-architecture lineage remains **future** until named
    arcs are separately authorized.
12. Phase 2B remains accepted design direction; MVP consumers (Slices 17–18)
    are `Complete`.
13. `CQS-OD-066` remains **unresolved**.
14. Inherited Final mid-refresh recovery flake remains **unresolved**.

---

## 13. Superseded current roadmap statements

The following are **superseded as current plan statements**. Historical
documents that contain them remain valid as records of what was true when
written.

1. “The MVP is a **22-slice** plan” as the *current* sequence.
2. Current plan entry **Slice 22 — Classroom Release Qualification** (identifier
   `CQS-SLICE-22-CLASSROOM-RELEASE-QUALIFICATION`) as the *current* terminal MVP
   slice.
3. Routing that names **Slices 19–22** as the full remaining unauthorized set.
4. Routing that says *all* sounds / presentation audio are deferred until
   post-MVP, without distinguishing MVP Slice 22 minimal functional cues.
5. Any implication that `CQS-OPP-PRESENTATION-EFFECTS` is the only path for any
   classroom audio feedback.
6. Any implication that Phase 2B production visual-fidelity calibration requires
   a new polish/redesign slice rather than a Slice 23 qualification gate.

**Not superseded:** Amendment 001 architecture clauses; Amendment 002
future-architecture clauses; Amendment 003 historical 18→22 mapping and its
completed Slice 15–18 records; completed-slice ADRs; OADL2-S07 bounded claim;
`CQS-OD-066` unresolved status; the deferred **team-specific / custom /
identity-pack** buzz-sound owner direction (still post-MVP, distinct from
Slice 22).

---

## 14. Post-MVP theme-song and presentation-effects disposition

### Theme song / opening music (post-MVP)

Classroom Quiz Show should eventually have a recognizable theme song/opening
music identity, but it is **not** an MVP requirement. The future theme should
be:

- application-owned identity;
- original or clearly licensed;
- available offline;
- intentionally triggered;
- muteable/skippable;
- not replayed after refresh/reconnect;
- completely non-authoritative.

It **must not** become part of Slice 22, required for classroom release, a
`GameDefinition` field, a game-schema field, a public-wire field, or an
authored-game choice by default. Prefer recording this under the existing
presentation/identity future architecture and
`CQS-OPP-PRESENTATION-EFFECTS` rather than inventing a parallel arc.

### `CQS-OPP-PRESENTATION-EFFECTS` (remains post-MVP)

Richer/team-specific identity sounds, animation, celebrations, sound packs,
entrance effects, leaderboard motion, and broader presentation systems remain
post-MVP. This amendment does **not** activate that opportunity.

Licensing reconciliation:

- licensing-safe **generic application cues** are now an explicit Slice 22
  requirement;
- broader/custom/team-specific audio licensing remains a post-MVP concern;
- this does **not** imply all presentation-audio licensing questions are solved.

---

## 15. Explicit non-authorizations

This amendment authorizes **none** of the following:

- Slice 19 implementation;
- Slice 20 / 21 / 22 / 23 implementation;
- audio playback code, assets, mute UI, or volume UI;
- schema / `GameDefinition` / public-wire / sync / event / command / reducer /
  persistence changes;
- theme song work;
- activation of `CQS-OPP-PRESENTATION-EFFECTS` or any `CQS-ARC-*`;
- resolution of `CQS-OD-066`;
- repair of the inherited Final mid-refresh flake;
- merge of this planning delivery (merge requires separate owner action).

---

## 16. Affected canonical docs

Mutable current routing surfaces expected to reflect this amendment after it
lands:

- [`../plans/MVP-ARC.md`](../plans/MVP-ARC.md)
- [`../STATUS.md`](../STATUS.md)
- [`../handoff/CURRENT.md`](../handoff/CURRENT.md)
- [`../../README.md`](../../README.md)
- [`README.md`](README.md) (this decisions index)
- [`../plans/HOST-CONSOLE-TEAM-IDENTITY-AND-PRESENTATION.md`](../plans/HOST-CONSOLE-TEAM-IDENTITY-AND-PRESENTATION.md)
- [`../plans/POST-MVP-OPPORTUNITY-AND-TRIGGER-REGISTER.md`](../plans/POST-MVP-OPPORTUNITY-AND-TRIGGER-REGISTER.md)
- [`../plans/EXPANDED-CQS-VISION-ARC.md`](../plans/EXPANDED-CQS-VISION-ARC.md)
- [`EXPANDED-VISION-OWNER-DECISIONS.md`](EXPANDED-VISION-OWNER-DECISIONS.md)
  (routing note only)
- [`../plans/CQS-DESIGN-PHASE-2B-DIRECTION.md`](../plans/CQS-DESIGN-PHASE-2B-DIRECTION.md)
- [`../plans/CQS-PHASE-3-DESIGN-SYSTEM-READINESS.md`](../plans/CQS-PHASE-3-DESIGN-SYSTEM-READINESS.md)

Historical receipts are **not** rewritten.

---

## 17. Dependency graph and roadmap ordering

```text
19 Self-Contained Portable Packs
  ↓
20 Spreadsheet Authoring Seed
  ↓
21 Sony Buzz Supported-Profile Operationalization
  ↓
22 Minimal Presentation Audio
  ↓
23 Classroom Release Qualification
```

Slice 22’s architectural dependency is the completed state/event and
audience/presentation foundation (especially Slice 18), not Slice 21 hardware
operationalization.

---

## 18. Next action after this amendment eventually lands

After this documentation amendment is merged and any required post-merge
reconciliation is complete:

1. Canonical mutable routing should state roadmap = **23 slices**; Slices 1–18
   `Complete`; Slices 19–23 `Planned` and unauthorized.
2. **Recommended next product action remains** a separately authorized
   **Slice 19 — Self-Contained Portable Packs** lane.
3. Slice 22 audio and Slice 23 qualification remain unauthorized.
4. Post-MVP remains inactive; theme song remains post-MVP; `CQS-OD-066`
   remains unresolved; inherited Final mid-refresh flake remains unresolved.

This amendment itself grants **no** Slice 19 authority.

---

## 19. Post-merge status (append-only; 2026-08-07)

> **Historical note.** Sections above retain the original planning preflight and
> rationale observed before PR #48 merge. This section records later merge
> evidence only and does not rewrite those pre-merge observations.

| Fact | Value |
| --- | --- |
| Delivery PR | [#48](https://github.com/ricktron/classroom-quiz-show/pull/48) — merged and closed |
| Final reviewed head | `b9e30be96af7d2276cae310ef2601cad4424a635` |
| Exact authorized delivery base / sole parent | `ee7ed93c3336a99afc4f1945b0cc8678b855dd8a` |
| Squash commit | `a73e6f86bf0757aa118cb9c3247f4e6eddaa090b` |
| Merge timestamp | `2026-08-07T18:15:39Z` |
| Tree parity | reviewed-head tree = squash tree = `82d938c7e167600a3e283d44d9e2757eee881831`; direct head→squash diff empty |
| Landed path count | exactly **12** |
| Reconciliation receipt | [`../receipts/2026-08-07-cqs-plan-s03-post-merge-reconciliation.md`](../receipts/2026-08-07-cqs-plan-s03-post-merge-reconciliation.md) |
| Current canonical status | **23-slice** MVP roadmap |
| Product implementation authority | **none** from CQS-PLAN-S03 |
| Slice 19 | still unauthorized |
| Slice 22 Minimal Presentation Audio | still unauthorized |
| Slice 23 Classroom Release Qualification | still unauthorized |
| Theme song | still post-MVP |
| Post-MVP arcs / `CQS-OPP-PRESENTATION-EFFECTS` | inactive |
| `CQS-OD-066` | unresolved |

**No product implementation is authorized by `CQS-PLAN-S03` or by this
amendment.** Implementation of any of Slices 19–23 requires its own bounded
owner authorization naming an exact base.
