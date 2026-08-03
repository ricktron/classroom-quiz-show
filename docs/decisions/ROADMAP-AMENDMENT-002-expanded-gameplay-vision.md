# Roadmap Amendment 002 — Expanded gameplay, authoring, and analytics vision

- **Amendment id:** `ROADMAP-AMENDMENT-002`
- **Slice identifier:** `CQS-PLAN-S01`
- **Authorization:** `AUTHORIZE-CQS-PLAN-S01-EXPANDED-VISION-DOCUMENTATION-1`
- **Status:** Accepted (owner-authorized planning decision)
- **Date:** 2026-08-03
- **Base `main`:** `1e5815dbb80a49e09f227a664625e85a81bf1c5a`
- **Type:** decision + documentation only — **no runtime code, no schema
  change, no test change, no dependency change, no CI/deploy change**
- **Amends:** nothing in the current 18-slice plan. This amendment records
  **future-architecture direction** for the expanded vision and its
  supersession lineage against existing ADRs. The current MVP sequence in
  [`../plans/MVP-ARC.md`](../plans/MVP-ARC.md) is unchanged.
- **Decision authority:** the owner decisions in
  [`EXPANDED-VISION-OWNER-DECISIONS.md`](EXPANDED-VISION-OWNER-DECISIONS.md)
  (`CQS-OD-001`…`CQS-OD-086`).

This document is the **canonical authority for architectural consequences and
supersession lineage** of the expanded vision. Each clause below states, in
exactly these terms, what is:

- **preserved for the current implementation** — the accepted ADR decision
  stays binding and correct;
- **amended for future architecture** — the direction a future arc will take,
  recorded now so current work does not foreclose it;
- **superseded only when a named future arc is implemented** — the accepted
  decision is *not* superseded today and must not be described as such;
- **not active until separately authorized** — nothing here authorizes
  implementation.

No ADR is rewritten. Every old decision remains visible, and every changed
direction is expressed as explicit lineage. Activation states below use the
canonical vocabulary defined in the decision register.

---

## Clause CQS-RA2-PRESET-01 — Format presets are composition, not engines

- **Preserved for current implementation.** ADR-003's round registry:
  round types are registered by application code, content cannot register
  behavior, unknown types fail closed. ADR-005's `category-board` round.
- **Amended for future architecture.** The expanded product model
  decomposes what a lesser design would call a "game mode" into six
  distinct layers: **game-format preset**, **registered round type**,
  **response policy**, **scoring policy**, **timer-and-transition policy**,
  and **clue modifier** (see
  [`../plans/GAMEPLAY-MODES-AND-POLICIES.md`](../plans/GAMEPLAY-MODES-AND-POLICIES.md)).
  A preset is a friendly bounded recipe over these layers. New formats —
  including Mixed Review and Funny Review — must compose registered round
  types and reusable policies rather than acquire unrelated hard-coded
  engines (`CQS-OD-001`).
- **Superseded:** nothing. The registry design is confirmed, not replaced.
- **Not active until separately authorized.** No preset layer, policy
  object, or new round type exists or is scheduled by this amendment.

## Clause CQS-RA2-ARMING-01 — Manual arming today; a second arming cause later

- **Preserved for current implementation.** ADR-007 §4 and owner gate
  `OG-1` (2026-07-26): arming is **manual and host-controlled**; nothing
  arms a clue automatically. This remains implemented, binding behavior.
- **Amended for future architecture.** `CQS-OD-029` and the §10.1 owner
  direction add a future second arming *cause*: **automatic arming at the
  end of a readiness timer**, preset-controlled, alongside a
  readiness-countdown-then-host-confirmation variant. Arming remains **one
  durable state** with typed causes; automatic arming is never universal;
  a preset may keep arming fully manual forever.
- **Superseded only when** the gameplay-policy portion of a future formats
  arc (`CQS-ARC-FORMATS`) implements timer-triggered arming. Until then,
  any statement that arming can be automatic is false for the
  implementation.
- **Not active until separately authorized.**

## Clause CQS-RA2-EARLY-LOCKOUT-01 — Early-press lockout is not queue lockout

- **Preserved for current implementation.** ADR-008 / `OG-2`: the buzz
  queue is a **full ordered queue**; first-only lockout remains rejected.
  A press before arming is rejected at the command boundary and appends
  nothing (architecture-forced, `ROADMAP-AMENDMENT-001` §5.7).
- **Amended for future architecture.** `CQS-OD-013`, `CQS-OD-027`,
  `CQS-OD-028`: competitive presets may detect an early press, surface it
  to the host and team card, and apply a **temporary early-press lockout**
  (recommended classroom default ≈ 500 ms; preset-controlled). Repeated
  presses during a lockout are ignored and never extend it. This is a
  *pre-intake* input policy; it does not reintroduce first-only queue
  lockout, and the ordered queue remains intact for accepted presses.
- **Superseded:** nothing — `OG-2`'s resolution stands permanently.
- **Not active until separately authorized.**

## Clause CQS-RA2-PUBLIC-STATE-01 — Richer public team-card state, same privacy floor

- **Preserved for current implementation.** ADR-008 §14 and
  `GAME-ENGINE-BOUNDARIES.md` §4 (Slice 8 status): the public buzz
  projection carries the active team plus a **waiting count**; the ordered
  waiting list is deliberately host-only. That decision was correct for
  its slice and remains implemented behavior.
- **Amended for future architecture.** `CQS-OD-026`, `CQS-OD-031`,
  `CQS-OD-033` and §10.3: future team cards may publicly express ready,
  disarmed, buzzed-early, temporarily-locked-out, **exact queue
  position**, active respondent, answer timer, passed, timed out,
  incorrect, correct, response-submitted, wager-locked, score delta, and
  round/game winner states. The privacy floor is unchanged and permanent:
  **no raw timestamps, no reaction-time claims, no answer selections
  before reveal, no exact written responses, no wager amounts before
  reveal, no physical controller identity, no host notes, no correctness
  before adjudication.** Queue position is presented as order, never as a
  measured speed ranking.
- **Superseded only when** a future arc (`CQS-ARC-FORMATS` /
  `CQS-ARC-IDENTITY`) implements the richer team-card DTO behind a new
  public-state wire version. ADR-008 §14's *rationale* (refusing
  reaction-time claims) is carried forward, not discarded; what changes is
  the allow-list's contents, through the normal versioned-wire process.
- **Not active until separately authorized.**

## Clause CQS-RA2-SECONDARY-01 — Ordinal secondary actions gain consumers, not colors

- **Preserved for current implementation.** ADR-008 §3 and the recorded
  owner direction: four **ordinal** secondary slots are representable and
  mappable but **inert**; command translation refuses them; no durable
  vocabulary exists without its first authorized consumer; no color,
  device model, vendor, or button index exists in the engine.
- **Amended for future architecture.** `CQS-OD-010`, `CQS-OD-025`:
  secondary actions become **bounded ordinal A–D-style choices** for
  compatible round types (multiple-choice, Team Choice, identity setup,
  survey variants). Each consuming round type defines the bounded meaning;
  the engine stays button-agnostic and the adapter boundary
  (`ROADMAP-AMENDMENT-001` §5.6) is unchanged.
- **Superseded only when** the first consuming round type is implemented
  under a named arc, which is when the durable event vocabulary is
  defined — exactly as ADR-008 planned.
- **Not active until separately authorized.**

## Clause CQS-RA2-SCORE-REVEAL-01 — Explicit adjudication survives policy automation

- **Preserved for current implementation.** ADR-006: reveal and score are
  independent in both directions; every score change is one typed,
  reversible, auditable event; a timer expiry awards nothing; an incorrect
  resolution moves no points (`OG-6` deferred); correction is
  undo-or-compensate, never an edit.
- **Amended for future architecture.** `CQS-OD-002`, `CQS-OD-009`,
  `CQS-OD-018`, `CQS-OD-019`, `CQS-OD-023`: future **scoring policies**
  (deduction on incorrect, timeout policies distinct from incorrect
  policies, speed bonuses, wager settlement, round-pot settlement) compose
  the existing typed command/event model — policy-driven score changes are
  still explicit typed events with mode and source, produced through the
  command pipeline, never silent side effects. Timer expiry may drive
  **safe transitions** only; answer reveal, correctness adjudication,
  score changes, and wager settlement always remain explicit
  (`CQS-OD-023`).
- **Superseded only when** a scoring-policy layer is implemented under
  `CQS-ARC-FORMATS`; even then the audit and undo properties are carried
  forward unchanged.
- **Not active until separately authorized.**

## Clause CQS-RA2-TELEMETRY-01 — Authoritative history and observational telemetry never mix

- **Preserved for current implementation.** ADR-002: the append-only event
  history is the single deterministic, replayable source of gameplay
  truth. Rejected commands append nothing. Replay is bit-exact.
- **Amended for future architecture.** `CQS-OD-035` and §10.8: a future,
  **opt-in observational telemetry journal** may record input-edge
  evidence (accepted and rejected presses, early presses, presses while
  disarmed or locked out, A–D selections, host actions, timer-popup
  choices, connection diagnostics). Binding rules, recorded now:
  telemetry is a **separate layer** that authoritative replay never
  reads; rejected input telemetry can never alter replay, scoring, or
  undo; polling frames and repeated held-button samples are never stored
  as meaningful presses; telemetry is opt-in and never required for any
  gameplay feature.
- **Superseded:** nothing. This clause exists precisely so ADR-002's
  guarantee is never diluted by analytics work.
- **Not active until separately authorized** (`CQS-OPP-TELEMETRY`).

## Clause CQS-RA2-ARCHIVE-01 — Recovery is not an archive

- **Preserved for current implementation.** ADR-013: host-local IndexedDB
  persistence serves **saved definitions** and **active-session
  recovery** (explicit Resume/Discard), with cleanup after
  `GAME_SESSION_ENDED`. Nothing is projected; nothing is cloud-synced.
- **Amended for future architecture.** `CQS-OD-036`, `CQS-OD-037`, §15.1:
  a future **completed-game archive** is an additive, separate store —
  session id, game id and revision, preset, teams, authoritative event
  history, optional telemetry, results, durations, completion state,
  summary — with configurable, exportable retention defaulting to
  retention-until-deletion. Archiving must not repurpose or weaken the
  recovery store's semantics, and private response/wager text follows
  game-configurable retention.
- **Superseded:** nothing; ADR-013's stores keep their exact meaning.
- **Not active until separately authorized** (`CQS-OPP-HISTORICAL-ARCHIVE`).

## Clause CQS-RA2-TEAM-ORDER-01 — Stable positions with optional ceremonial motion

- **Preserved for current implementation.** ADR-006: authored team order
  is canonical; the scoreboard never re-sorts; the Slice 6 projector
  scoreboard is deliberately free of animation.
- **Amended for future architecture.** `CQS-OD-033`, `CQS-OD-034`, §10.4:
  team cards remain positionally stable during normal gameplay
  (**implemented rule, carried forward**), while optional animated
  score-order transitions may run **between rounds and at game end**,
  returning to stable authored positions afterward. Presentation
  completion is never authoritative game-state input; reduced-motion
  support, mute/volume controls, no flashing dependency, accessible
  contrast, and non-color state indicators are required
  (`CQS-ARC-IDENTITY`).
- **Superseded:** nothing; the no-re-sort rule is permanent. The Slice 6
  "no animation" statement describes that slice's delivery, not a
  permanent prohibition — future ceremonial animation is additive and
  presentation-only.
- **Not active until separately authorized.**

## Clause CQS-RA2-AUTHORING-01 — Workbooks author; canonical JSON remains truth

- **Preserved for current implementation.** ADR-004: canonical versioned
  JSON is the single stored truth; exactly one validation/normalization
  pipeline; spreadsheets were always recorded as an import *convenience*
  (`GAME-ENGINE-BOUNDARIES.md` §10). ADR-012: deterministic canonical
  export. The Slice 17 roadmap entry ("spreadsheet import convenience
  through the existing single pipeline") is unchanged.
- **Amended for future architecture.** `CQS-OD-041`…`CQS-OD-052` and §12:
  the first post-MVP arc (`CQS-ARC-AUTHORING`) delivers preset-specific
  **workbook templates**, an LLM authoring packet with embedded
  instructions, and a spreadsheet parser whose output **compiles into
  canonical CQS JSON and enters through the existing strict import
  boundary**. There is no second importer, no workbook-shaped runtime
  state, and no path from a workbook to playability that skips canonical
  validation and teacher approval (`CQS-OD-044`).
- **Superseded:** nothing; this is the planned elaboration of the
  boundary ADR-004 fixed.
- **Not active until separately authorized**
  (`CQS-OPP-SPREADSHEET-LLM-AUTHORING`).

## Clause CQS-RA2-QUESTION-ID-01 — Question identity is not board placement

- **Preserved for current implementation.** ADR-005: tile identity is a
  stable authored id, unique across the round; identity is never the
  displayed value. ADR-012: reproducible game identity.
- **Amended for future architecture.** `CQS-OD-058` and §12.3: the
  authoring and analytics arcs separate **item-family identity** (the
  durable concept connecting clue revisions, adaptations, and test
  items), **question content id**, **question revision**, and **game
  placement** (round, category, value, modifier). Moving a clue to
  another slot never creates a new revision; a substantial content change
  does. Placement ids (today's tile ids) remain what they are; family and
  revision identity are **additive metadata**, introduced through the
  schema-versioning policy already recorded in `ROADMAP-AMENDMENT-001`
  §5.10.
- **Superseded:** nothing.
- **Not active until separately authorized.**

## Clause CQS-RA2-CONTROLLER-01 — Logical teams, physical handsets, and parking

- **Preserved for current implementation.** ADR-008/ADR-009/ADR-010: team
  count is authored content (1–8); physical device identity never crosses
  the adapter boundary; mappings bind controls to teams; a controller
  index is a session-local locator. OADL2-S07's bounded finding that
  stable Sony Buzz! wireless operation may require all four handsets
  powered under a keep-alive is hardware evidence, not product design.
- **Amended for future architecture.** §10.5: even where hardware
  stability requires all four physical handsets to be powered or paired,
  CQS preserves **two-, three-, and four-team games**. A physical
  controller may be **assigned**, **parked**, **diagnostic-only**, or
  **unavailable**; a parked controller produces no gameplay command and
  **creates no logical team**. `CQS-OD-040` keeps one active controller
  per team for now; `CQS-OPP-MULTI-CONTROLLER-TEAMS` preserves the
  multi-controller future.
- **Superseded:** nothing.
- **Not active until separately authorized.**

---

## What this amendment does not do

1. It does not modify, reorder, or re-scope any slice of the 18-slice plan;
   Slice 14 (Final-wager round) remains `Planned` and unstarted with its
   recorded scope.
2. It does not change runtime behavior, schemas, wire versions
   (public-state **7**, sync **2**, game-file **1**), tests, dependencies,
   or configuration.
3. It does not supersede any ADR today. Every "superseded only when"
   clause requires a named arc, a separate authorization, and the normal
   ADR process at implementation time.
4. It does not resolve decision 66 (`CQS-OD-066`), which remains
   unresolved.
5. It does not authorize any capability named in the opportunity register.

## Relationship to ROADMAP-AMENDMENT-001

`ROADMAP-AMENDMENT-001` (local buzzers, 2026-07-26) remains accepted and in
force; its 18-slice plan is the current MVP this amendment preserves. Where
this amendment records future direction touching the same ground (arming,
queue policy, projection minimalism), the lineage above names the exact
clause preserved and the exact future condition under which a statement
would be superseded. Receipts are never superseded or edited.
