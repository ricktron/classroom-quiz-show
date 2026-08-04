# Expanded Vision — Owner Decision Register

> **Routing note (Amendment 003, 2026-08-03).** Passages below that describe the
> MVP as an **18-slice** plan were true when `CQS-PLAN-S01` recorded them. The
> **current** MVP sequence is the **22-slice** plan in
> [`../plans/MVP-ARC.md`](../plans/MVP-ARC.md), per
> [`ROADMAP-AMENDMENT-003-remaining-mvp-rebalance.md`](ROADMAP-AMENDMENT-003-remaining-mvp-rebalance.md).
> No `CQS-OD-*` acceptance or activation state in this register is changed by
> that note. **`CQS-OD-066` remains unresolved.**

- **Register id:** `CQS-EXPANDED-VISION-DECISIONS`
- **Authorization:** `AUTHORIZE-CQS-PLAN-S01-EXPANDED-VISION-DOCUMENTATION-1`
- **Slice:** `CQS-PLAN-S01` (planning-only documentation slice)
- **Date recorded:** 2026-08-03
- **Status:** Accepted owner-discovery record (documentation only)

This register is the **canonical authority for the expanded-vision owner
decisions and their acceptance state**. Other planning documents cite decision
ids (`CQS-OD-001`…`CQS-OD-086`) instead of restating decisions independently.

Nothing in this register implements anything, authorizes implementation,
or rewrites accepted history. Architectural consequences and supersession
lineage live in
[`ROADMAP-AMENDMENT-002-expanded-gameplay-vision.md`](ROADMAP-AMENDMENT-002-expanded-gameplay-vision.md);
remaining-MVP rebalance in
[`ROADMAP-AMENDMENT-003-remaining-mvp-rebalance.md`](ROADMAP-AMENDMENT-003-remaining-mvp-rebalance.md);
sequencing lives in
[`../plans/EXPANDED-CQS-VISION-ARC.md`](../plans/EXPANDED-CQS-VISION-ARC.md);
deferred work lives in
[`../plans/POST-MVP-OPPORTUNITY-AND-TRIGGER-REGISTER.md`](../plans/POST-MVP-OPPORTUNITY-AND-TRIGGER-REGISTER.md).

## How to read this register

- **Decision numbers 1–86** map one-to-one to canonical ids `CQS-OD-001`
  through `CQS-OD-086`. Numbers are never combined, renumbered or compressed.
- **Status** is one of: `Accepted` (owner direction), `Accepted —
  clarification` (accepted direction that clarifies an existing recorded
  repository decision), `Unresolved` (deliberately not decided).
- **Primary activation** — every decision carries **exactly one**
  machine-reviewable primary value from the canonical vocabulary:
  `implemented` · `current-mvp-planned` · `architecture-preserved` ·
  `post-mvp-priority` · `parked` · `research-required` · `rejected` ·
  `unresolved`. Only primary values are counted in the 86-decision tally.
- **Component states** — where a decision covers sub-capabilities whose
  states differ from the primary, they are listed in a separately labeled
  **Component states** field (one canonical value per component). Component
  states are **not** counted in the primary tally.
- **An accepted decision is not an implementation authorization.** Every
  activation short of `implemented` requires its own future authorization
  (see the opportunity register's triggers).
- **Arcs** referenced: `CQS-ARC-AUTHORING` (spreadsheet + LLM authoring and
  question bank), `CQS-ARC-IDENTITY` (team identity and presentation),
  `CQS-ARC-OPERATOR` (host console polish and Loan Mode), `CQS-ARC-INSIGHT`
  (sessions, telemetry, transcripts, analytics, assessment),
  `CQS-ARC-FORMATS` (additional game formats incl. Survey Showdown),
  `CQS-ARC-PARTICIPATION` (student participation and credit). The current
  MVP sequence at recording was the 18-slice plan in
  [`../plans/MVP-ARC.md`](../plans/MVP-ARC.md); **current** sequence is the
  22-slice plan per Amendment 003 (see routing note above).

## Traceability gate

| Check | Value |
| --- | --- |
| Decisions expected | 86 |
| Decisions represented | 86 |
| Duplicate decision numbers | 0 |
| Accepted decisions omitted | 0 |
| Unresolved decisions guessed | 0 |
| Primary activation values (exactly one per decision) | 86 |
| Decision 66 status / primary activation | **Unresolved** / `unresolved` |

---

## Decisions 1–12 — formats and core interaction

### CQS-OD-001 (1) — Initial game-format direction

- **Status:** Accepted · **Primary activation:** `post-mvp-priority` · **Arc:**
  `CQS-ARC-FORMATS`
- **Direction.** The initial preset catalog includes **Classic Board**,
  **Board + Final**, **Buzzer Sprint**, and **Team Choice**. **Mixed Review**
  must emerge compositionally from ordered rounds of existing registered
  types, not require an incompatible engine.
- **Consequence.** Format presets are a friendly configuration layer over
  registered round types plus reusable policies — never parallel hard-coded
  engines. The implemented `category-board` round type (ADR-005) is the seed
  of the Classic Board preset. See amendment clause `CQS-RA2-PRESET-01`.

### CQS-OD-002 (2) — Wrong-answer behavior is preset-configurable

- **Status:** Accepted · **Primary activation:** `post-mvp-priority` · **Arc:**
  `CQS-ARC-FORMATS`
- **Direction.** Wrong-answer behavior is configurable per preset. The
  competitive Classic Board default is **deduction plus promotion of the next
  queued team**.
- **Consequence.** A future scoring-policy layer composes the existing typed
  scoring command with resolution events. The current implementation
  deliberately moves **no points** on an incorrect resolution (ADR-008 §11;
  `OG-6` deferred) — that behavior is preserved until a policy layer is
  separately authorized. See `CQS-RA2-SCORE-REVEAL-01`.

### CQS-OD-003 (3) — Hidden-wager clue ownership

- **Status:** Accepted · **Primary activation:** `post-mvp-priority` · **Arc:**
  `CQS-ARC-FORMATS`
- **Direction.** A hidden-wager clue normally belongs to the team that
  selected the clue.
- **Consequence.** Hidden wagers are a **clue modifier**, not a round type.
  Not part of Slice 14, whose record explicitly excludes a mid-board
  Daily-Double-style wager.

### CQS-OD-004 (4) — Hidden-wager placement authoring

- **Status:** Accepted · **Primary activation:** `post-mvp-priority` · **Arc:**
  `CQS-ARC-FORMATS` (authoring linkage: `CQS-ARC-AUTHORING`)
- **Direction.** Hidden-wager placement may be authored secretly (not visible
  on the projected board), with a host override.
- **Consequence.** Authored modifier metadata is host-private and never
  projected before reveal — the existing allow-list sanitizer boundary
  already supports this pattern.

### CQS-OD-005 (5) — Final eligibility is preset-controlled

- **Status:** Accepted · **Primary activation:** `current-mvp-planned` ·
  **Arc:** current MVP (Slice 14, [`../plans/MVP-ARC.md`](../plans/MVP-ARC.md));
  preset packaging → `CQS-ARC-FORMATS`
- **Direction.** Final-round eligibility is preset-controlled: a classic
  profile may require a positive score; an inclusive profile may allow all
  teams.
- **Component states.** Eligibility rules as Slice 14 acceptance design:
  `current-mvp-planned`. Exposure of classic/inclusive *profiles* through
  a preset selector (Board + Final packaging, policy engine):
  `post-mvp-priority`.
- **Consequence.** Clarifies the acceptance design of Slice 14's
  already-recorded eligibility/tie/reveal deliverables. It does **not**
  authorize, begin, or materially expand Slice 14, which remains
  `Planned` and unstarted. See
  [`../plans/GAMEPLAY-MODES-AND-POLICIES.md`](../plans/GAMEPLAY-MODES-AND-POLICIES.md)
  §4.

### CQS-OD-006 (6) — Nonpositive-team default maximum final wager

- **Status:** Accepted · **Primary activation:** `current-mvp-planned` ·
  **Arc:** current MVP (Slice 14); preset packaging → `CQS-ARC-FORMATS`
- **Direction.** A team at zero or negative score has a default maximum final
  wager equal to the **highest ordinary clue value**, unless the preset
  specifies otherwise.
- **Component states.** Wager-validation rule as Slice 14 acceptance
  design: `current-mvp-planned`. Per-preset overrides of the cap:
  `post-mvp-priority`.
- **Consequence.** Clarifies Slice 14's recorded wager deliverable
  (wager validation) without authorizing, beginning, or expanding the
  slice.

### CQS-OD-007 (7) — Exact Final response text is optional

- **Status:** Accepted · **Primary activation:** `current-mvp-planned` ·
  **Arc:** current MVP (Slice 14); retention linkage → `CQS-ARC-INSIGHT`
- **Direction.** Exact Final responses may be stored, but exact response text
  is optional rather than universally required.
- **Component states.** Optional response capture as Slice 14 acceptance
  design: `current-mvp-planned`. Retention configuration for captured
  text (CQS-OD-037): `post-mvp-priority`.
- **Consequence.** Clarifies Slice 14's recorded response deliverable
  (response capture): adjudication must work with or without captured
  text. It does not authorize, begin, or expand the slice.

### CQS-OD-008 (8) — Final reveal ordering

- **Status:** Accepted · **Primary activation:** `current-mvp-planned` ·
  **Arc:** current MVP (Slice 14)
- **Direction.** Final reveal defaults from **lowest pre-final score to
  highest**, with a host-selectable alternate order.
- **Consequence.** Clarifies Slice 14's recorded reveal deliverable
  (reveal sequencing): a host-controlled sequence over private wager
  state; nothing reveals without explicit host action (existing
  invariant). It does not authorize, begin, or expand the slice.

### CQS-OD-009 (9) — Team Choice scoring weighting

- **Status:** Accepted · **Primary activation:** `post-mvp-priority` · **Arc:**
  `CQS-ARC-FORMATS`
- **Direction.** Team Choice scoring is preset-configurable. **Modest speed
  weighting is the default**; extreme speed weighting is a rejected default
  (`rejected` as default, available only as an explicit preset choice).
- **Consequence.** Scoring-policy vocabulary must include bounded
  speed-bonus forms; analytics language rules (CQS-OD-035, §10.9 direction)
  forbid presenting speed weighting as precise reaction measurement.

### CQS-OD-010 (10) — One physical controller per logical team

- **Status:** Accepted · **Primary activation:** `post-mvp-priority` ·
  **Arc:** `CQS-ARC-FORMATS`
- **Component states.** The existing inert ordinal input contract:
  `architecture-preserved`.
- **Direction.** Move toward one physical controller per logical team, using
  the four secondary buttons for A–D-style choices. Preserve the
  host-recorded fallback and future multiple-controller-per-team mappings.
- **Consequence.** The implemented input contract already carries four
  **ordinal, inert** secondary slots (ADR-008 §3) — the future consumer
  activates them without contract change. See `CQS-RA2-SECONDARY-01`,
  `CQS-RA2-CONTROLLER-01`, and opportunities
  `CQS-OPP-CONTROLLER-ORDINAL-ACTIONS` / `CQS-OPP-MULTI-CONTROLLER-TEAMS`.

### CQS-OD-011 (11) — Sudden death or tied finish

- **Status:** Accepted — clarification · **Primary activation:**
  `current-mvp-planned` (Slice 14 tie handling)
- **Direction.** The host may choose sudden death **or permit a tied
  finish**.
- **Lineage.** Clarifies the approved product decision "Default tie-break:
  host-controlled sudden-death prompt" (`docs/PROJECT.md`): sudden death
  remains the default; an accepted tie becomes an explicit host choice.
  Slice 14's recorded deliverable "tie handling" absorbs this clarification
  when it is separately authorized; the slice's scope is not otherwise
  changed.

### CQS-OD-012 (12) — One-screen live host console

- **Status:** Accepted · **Primary activation:** `post-mvp-priority` · **Arc:**
  `CQS-ARC-OPERATOR`
- **Direction.** The host console should be a one-screen live console with
  **one emphasized next action** and collapsible detail — not a wall of
  equally prominent panels.
- **Consequence.** See
  [`../plans/HOST-CONSOLE-TEAM-IDENTITY-AND-PRESENTATION.md`](../plans/HOST-CONSOLE-TEAM-IDENTITY-AND-PRESENTATION.md).
  The current stacked host panels remain the implemented state until the
  operator arc is authorized.

## Decisions 13–25 — timers, queues, resolution, and controller actions

### CQS-OD-013 (13) — Early-buzz behavior is configurable

- **Status:** Accepted · **Primary activation:** `post-mvp-priority` · **Arc:**
  `CQS-ARC-FORMATS`
- **Direction.** Early-buzz behavior remains configurable. Competitive play
  supports detecting the early team, showing the host, and **temporarily
  locking that team out**. Ignoring early presses (today's behavior) and
  alternative policies remain possible.
- **Consequence.** A temporary early-press lockout is a **distinct concept**
  from the prohibited first-only queue lockout (`OG-2` preserved). Today a
  press before arming is rejected and appends nothing; the future policy
  records the early press as telemetry and applies a bounded lockout. See
  `CQS-RA2-EARLY-LOCKOUT-01`.

### CQS-OD-014 (14) — Answer-turn timer start is preset-controlled

- **Status:** Accepted · **Primary activation:** `post-mvp-priority` · **Arc:**
  `CQS-ARC-FORMATS`
- **Direction.** The answer-turn timer may begin automatically or through a
  host action, controlled by the preset.
- **Consequence.** Automatic start is a configured **safe transition**
  (CQS-OD-023); adjudication and scoring stay explicit. Related to arming:
  `CQS-RA2-ARMING-01`.

### CQS-OD-015 (15) — Timeout with a queued team

- **Status:** Accepted · **Primary activation:** `post-mvp-priority` · **Arc:**
  `CQS-ARC-FORMATS`
- **Direction.** When the active team times out and another team is queued,
  behavior is configurable. The competitive default **promotes the next
  queued team with a fresh full timer**.
- **Consequence.** Extends the implemented typed promotion command (ADR-008
  §11) with a timeout-sourced resolution; adds no automatic scoring by
  itself (CQS-OD-019 governs scoring).

### CQS-OD-016 (16) — Timeout with nobody queued

- **Status:** Accepted · **Primary activation:** `post-mvp-priority` · **Arc:**
  `CQS-ARC-FORMATS`
- **Direction.** When the active team times out and no team is queued,
  behavior is configurable; **returning control to the host is the safe
  default**.
- **Consequence.** Pairs with the timer-expiry decision popup (CQS-OD-030).

### CQS-OD-017 (17) — Queue intake while a team is answering

- **Status:** Accepted · **Primary activation:** `post-mvp-priority` · **Arc:**
  `CQS-ARC-FORMATS`
- **Direction.** Whether teams may join the queue while another team is
  answering is configurable. Classic Board defaults to **allowing it**.
- **Consequence.** The implemented full ordered queue (`OG-2`, ADR-008 §8)
  already accumulates buzzes within one response opportunity; the preset
  layer makes the intake window itself a policy.

### CQS-OD-018 (18) — The five turn-ending causes

- **Status:** Accepted · **Primary activation:** `post-mvp-priority` · **Arc:**
  `CQS-ARC-FORMATS`
- **Direction.** A turn may end through **correct adjudication, incorrect
  adjudication, pass, timeout, or explicit host termination**.
- **Consequence.** The implemented resolution vocabulary (`incorrect` ·
  `passed`, with correct expressed through answer reveal — ADR-008) grows by
  typed `timeout` and `host-terminated` members when separately authorized;
  unknown resolutions keep failing closed.

### CQS-OD-019 (19) — Incorrect and timeout score separately

- **Status:** Accepted · **Primary activation:** `post-mvp-priority` · **Arc:**
  `CQS-ARC-FORMATS`
- **Direction.** Incorrect adjudication and timeout may use **separate
  scoring policies**.
- **Consequence.** Scoring-policy vocabulary keys off the typed resolution
  cause, preserving "a timer never moves a point" until a policy explicitly
  and auditably does (`CQS-RA2-SCORE-REVEAL-01`).

### CQS-OD-020 (20) — A resolved team is locked out for the clue

- **Status:** Accepted · **Primary activation:** `post-mvp-priority` · **Arc:**
  `CQS-ARC-FORMATS`
- **Direction.** A resolved team is normally locked out for the remainder of
  the clue, with a host override to restore eligibility.
- **Consequence.** The implemented queue already prevents a team from
  re-entering the same response opportunity; the future override
  (CQS-OD-024) makes restoration an explicit evented host action.

### CQS-OD-021 (21) — Attempt limits

- **Status:** Accepted · **Primary activation:** `post-mvp-priority` · **Arc:**
  `CQS-ARC-FORMATS`
- **Direction.** Attempt limits are configurable; **one attempt per team per
  clue is the default** (today's implemented behavior).

### CQS-OD-022 (22) — Timer visibility

- **Status:** Accepted · **Primary activation:** `post-mvp-priority` · **Arc:**
  `CQS-ARC-FORMATS`
- **Direction.** Thinking and simultaneous-response timers are normally
  public. **Individual answer-turn timer visibility** may be host- or
  preset-controlled.
- **Consequence.** The public projection may need a "timer exists but its
  countdown is host-private" form; today's single public response timer
  remains unchanged until then.

### CQS-OD-023 (23) — Automatic transitions are bounded

- **Status:** Accepted · **Primary activation:** `post-mvp-priority` ·
  **Arc:** `CQS-ARC-FORMATS`
- **Component states.** The explicit-adjudication invariant (expiry awards
  and reveals nothing): `implemented`.
- **Direction.** Timer expiry may perform **safe transitions**
  automatically, but **answer reveal, correctness adjudication, score
  changes, and wager settlement remain explicit** host (or explicitly
  configured) actions.
- **Consequence.** The permanent boundary for every future automation
  feature. Today expiry already awards nothing and reveals nothing.

### CQS-OD-024 (24) — Host evented overrides

- **Status:** Accepted · **Primary activation:** `post-mvp-priority` · **Arc:**
  `CQS-ARC-FORMATS` / `CQS-ARC-OPERATOR`
- **Direction.** The host retains evented overrides: add time, restart the
  timer, promote a different team, restore eligibility, cancel the active
  team, and re-arm eligible teams.
- **Consequence.** Overrides are typed commands producing auditable events —
  never direct state edits (existing command/event invariant).

### CQS-OD-025 (25) — Secondary actions are bounded ordinal choices

- **Status:** Accepted · **Primary activation:** `architecture-preserved`
- **Direction.** The four secondary controller actions are **ordinal
  A–D-style choices by default**; compatible round types may assign other
  bounded ordinal meanings.
- **Consequence.** Confirms the implemented inert ordinal contract (ADR-008
  §3) and the "no speculative vocabulary without its first consumer" rule: a
  durable event vocabulary for secondary actions arrives only with the first
  authorized consuming round type. See `CQS-RA2-SECONDARY-01`.

## Decisions 26–33 — public state, lockout, overrides, and position

### CQS-OD-026 (26) — Public exact queue position

- **Status:** Accepted · **Primary activation:** `post-mvp-priority` · **Arc:**
  `CQS-ARC-FORMATS` / `CQS-ARC-IDENTITY`
- **Direction.** The projector may show **exact queue position** on each team
  card — without raw timestamps or reaction-time claims.
- **Consequence.** Amends (for the future) the Slice 8 decision to project
  only the active team plus a waiting count. The old decision is preserved
  for the current implementation and superseded only when the richer
  team-card state ships under a named arc. See `CQS-RA2-PUBLIC-STATE-01` —
  this is an explicit lineage, not a silent rewrite of ADR-008 §14.

### CQS-OD-027 (27) — Early-lockout duration

- **Status:** Accepted · **Primary activation:** `post-mvp-priority` · **Arc:**
  `CQS-ARC-FORMATS`
- **Direction.** Early-lockout duration is preset-controlled;
  **approximately 500 ms** is the recommended classroom default.
- **Consequence.** Belongs to the Advanced configuration layer (CQS-OD-081).
  Research note: broadcast Jeopardy! uses a rough quarter-second early-buzz
  lockout (see research record `CQS-RF-JEOPARDY-01`); the classroom default
  is deliberately gentler.

### CQS-OD-028 (28) — Lockout presses do not extend the lockout

- **Status:** Accepted · **Primary activation:** `post-mvp-priority` · **Arc:**
  `CQS-ARC-FORMATS`
- **Direction.** Repeated presses during an active early lockout are ignored
  and **do not extend** the lockout. A fresh press after the lockout ends may
  claim the clue if intake remains open.
- **Consequence.** Prevents the frustration spiral of penalty-extension
  designs; rejected presses may appear in telemetry (CQS-OD-035) but never
  in authoritative history.

### CQS-OD-029 (29) — Readiness-timer expiry behavior

- **Status:** Accepted · **Primary activation:** `post-mvp-priority` · **Arc:**
  `CQS-ARC-FORMATS`
- **Direction.** Readiness-timer expiry behavior is preset-controlled;
  competitive presets may **arm immediately** at expiry.
- **Consequence.** Timer-triggered arming becomes a second arming *cause*
  while arming remains one durable state — see `CQS-RA2-ARMING-01`
  (ADR-007 §4 manual arming preserved for the current implementation).

### CQS-OD-030 (30) — Answer-turn timeout fallback

- **Status:** Accepted · **Primary activation:** `post-mvp-priority` · **Arc:**
  `CQS-ARC-FORMATS` / `CQS-ARC-OPERATOR`
- **Direction.** Answer-turn timeout behavior is preset-controlled; a **host
  decision popup is the fallback** (§10.2 direction: Next queued team ·
  Re-open buzzing · Question done · Add time · Mark incorrect).
- **Consequence.** A preset may replace the popup with a configured safe
  transition (bounded by CQS-OD-023).

### CQS-OD-031 (31) — Show why a turn ended, briefly

- **Status:** Accepted · **Primary activation:** `post-mvp-priority` · **Arc:**
  `CQS-ARC-IDENTITY`
- **Direction.** Briefly show why a team's turn ended (timeout, incorrect,
  pass), then transition its card to the durable eligibility or lockout
  state.
- **Consequence.** A presentation sequence over durable state — presentation
  completion is never gameplay authority (§10.4 direction;
  `CQS-RA2-TEAM-ORDER-01` presentation boundary).

### CQS-OD-032 (32) — Policy levels

- **Status:** Accepted · **Primary activation:** `post-mvp-priority` · **Arc:**
  `CQS-ARC-FORMATS`
- **Direction.** Game-level and round-level policies are normal.
  **Clue-level overrides are reserved for specifically designated special
  clues** (hidden wagers, designated specials).
- **Consequence.** Prevents per-clue configuration sprawl; aligns with the
  Presets → Customize → Advanced layering (CQS-OD-081).

### CQS-OD-033 (33) — Team cards are positionally stable

- **Status:** Accepted — clarification · **Primary activation:**
  `implemented`
- **Component states.** Inheritance of the stability rule by future
  richer team cards: `post-mvp-priority`.
- **Direction.** Team cards remain positionally stable during normal
  gameplay.
- **Lineage.** Confirms ADR-006's implemented rule that authored order is
  canonical and the scoreboard never re-sorts. Future richer team cards
  (CQS-OD-026, §10.3) inherit the same stability; optional between-round
  animation is CQS-OD-034.

## Decisions 34–40 — presentation, archives, funny modes, controller mapping

### CQS-OD-034 (34) — Optional animated score-order transitions

- **Status:** Accepted · **Primary activation:** `post-mvp-priority` · **Arc:**
  `CQS-ARC-IDENTITY`
- **Direction.** Optional animated score-order transitions may occur
  **between rounds and at game end**; normal gameplay returns teams to
  stable authored positions.
- **Consequence.** Presentation-only leaderboard moments that never change
  the durable order rule. See `CQS-RA2-TEAM-ORDER-01`.

### CQS-OD-035 (35) — Summary always, telemetry opt-in

- **Status:** Accepted · **Primary activation:** `current-mvp-planned` ·
  **Arc:** current MVP (Slice 15 summary)
- **Component states.** The opt-in detailed telemetry journal: `parked`
  (`CQS-OPP-TELEMETRY`).
- **Direction.** Every completed game receives a useful summary. **Detailed
  input telemetry is opt-in**, never mandatory.
- **Consequence.** The summary half is already the planned Slice 15
  (replay-derived). The telemetry half is a separate observational journal
  that never contaminates authoritative history — see
  `CQS-RA2-TELEMETRY-01` and
  [`../plans/SESSION-ANALYTICS-ASSESSMENT-AND-PARTICIPATION.md`](../plans/SESSION-ANALYTICS-ASSESSMENT-AND-PARTICIPATION.md).

### CQS-OD-036 (36) — Archive retention

- **Status:** Accepted · **Primary activation:** `post-mvp-priority` · **Arc:**
  `CQS-ARC-INSIGHT`
- **Direction.** Archive retention is configurable and exportable,
  defaulting to **retention until deletion**.
- **Consequence.** Historical archives are a new store, distinct from Slice
  13's active-session recovery — see `CQS-RA2-ARCHIVE-01`.

### CQS-OD-037 (37) — Private response retention

- **Status:** Accepted · **Primary activation:** `post-mvp-priority` · **Arc:**
  `CQS-ARC-INSIGHT`
- **Direction.** Exact private written responses and wager responses use
  **game-configurable retention**.
- **Consequence.** Retention configuration is authored/host policy, in the
  Advanced layer; never projected.

### CQS-OD-038 (38) — Analytics views

- **Status:** Accepted · **Primary activation:** `post-mvp-priority` · **Arc:**
  `CQS-ARC-INSIGHT`
- **Direction.** Analytics supports **overall** and **private class or
  section** views.
- **Consequence.** Views are teacher-private; nothing individual-student is
  implied (see CQS-OD-060 and the §10.10 lifecycle boundary).

### CQS-OD-039 (39) — Two funny-format families

- **Status:** Accepted · **Primary activation:** `post-mvp-priority` · **Arc:**
  `CQS-ARC-FORMATS`
- **Direction.** Support both **controller-native funny formats** and
  clearly labeled **host-assisted open-response formats**.
- **Consequence.** Open-response formats are honest about the host typing or
  adjudicating; controller formats stay within bounded ordinal input
  (CQS-OD-025).

### CQS-OD-040 (40) — One active controller per team, for now

- **Status:** Accepted — clarification · **Primary activation:**
  `architecture-preserved`
- **Direction.** Start with **one active controller per team** while
  preserving future multiple-controller-per-team mapping.
- **Lineage.** The implemented mapping model already enforces at most one
  primary buzz control per team within a mapping (ADR-008/ADR-009); the
  future multi-controller extension is `CQS-OPP-MULTI-CONTROLLER-TEAMS`.

## Decisions 41–48 — LLM authoring and quality

### CQS-OD-041 (41) — Source grounding is preset-controlled

- **Status:** Accepted · **Primary activation:** `post-mvp-priority` · **Arc:**
  `CQS-ARC-AUTHORING`
- **Direction.** Source-grounding mode is preset-controlled, with
  **uploaded-sources-only as the default**.
- **Consequence.** The authoring packet must express grounding rules and the
  model may return `insufficient-source-evidence` instead of fabricating —
  see
  [`../plans/LLM-SPREADSHEET-AUTHORING-ARC.md`](../plans/LLM-SPREADSHEET-AUTHORING-ARC.md).

### CQS-OD-042 (42) — Complete games and question banks are both first-class

- **Status:** Accepted · **Primary activation:** `post-mvp-priority` · **Arc:**
  `CQS-ARC-AUTHORING`
- **Direction.** Support both complete-game generation and reusable
  question-bank generation. **Complete-game spreadsheet generation is a
  first-class quick path.**

### CQS-OD-043 (43) — Source references are host-side QA

- **Status:** Accepted · **Primary activation:** `post-mvp-priority` · **Arc:**
  `CQS-ARC-AUTHORING`
- **Direction.** Source references are **required for every factual clue**
  but remain host-side QA and documentation — **not normal projected
  content**.
- **Consequence.** Citations live beside answers/notes on the host side of
  the sanitizer, exactly like teacher notes today.

### CQS-OD-044 (44) — Teacher approval gates playability

- **Status:** Accepted · **Primary activation:** `post-mvp-priority` · **Arc:**
  `CQS-ARC-AUTHORING`
- **Direction.** Teacher approval occurs at the **game level** after
  reviewing warnings. **Invalid or blocked content cannot become playable.**
- **Consequence.** Generated content always compiles through the one
  canonical validation pipeline (ADR-004) — see `CQS-RA2-AUTHORING-01`.

### CQS-OD-045 (45) — Difficulty metadata

- **Status:** Accepted · **Primary activation:** `post-mvp-priority` ·
  **Arc:** `CQS-ARC-AUTHORING` / `CQS-ARC-INSIGHT`
- **Component states.** Calibration against observed performance:
  `research-required`.
- **Direction.** Difficulty metadata includes a numeric level, a
  cognitive-demand label, and an explanation — with later calibration
  against observed performance.

### CQS-OD-046 (46) — Generation metadata, never hidden reasoning

- **Status:** Accepted · **Primary activation:** `post-mvp-priority` · **Arc:**
  `CQS-ARC-AUTHORING`
- **Direction.** Retain provider or model, generation date,
  authoring-template version, and generation instructions. **Never require
  or store hidden model reasoning.**

### CQS-OD-047 (47) — Source references and hashes by default

- **Status:** Accepted · **Primary activation:** `post-mvp-priority` · **Arc:**
  `CQS-ARC-AUTHORING`
- **Direction.** Retain source references and hashes by default, with
  optional bundled source archives.

### CQS-OD-048 (48) — Humor profiles

- **Status:** Accepted · **Primary activation:** `post-mvp-priority` · **Arc:**
  `CQS-ARC-AUTHORING`
- **Direction.** Humor profiles are **Straight, Light, Playful, and
  Chaotic-but-School-Safe**. **Light is the default.**

## Decisions 49–57 — spreadsheets, banks, transcripts, credit, Loan Mode

### CQS-OD-049 (49) — One internal model, preset-specific workbooks

- **Status:** Accepted · **Primary activation:** `post-mvp-priority` · **Arc:**
  `CQS-ARC-AUTHORING`
- **Direction.** Maintain **one universal internal content model** while
  exporting small preset-specific workbook templates.
- **Consequence.** Workbooks are friendly authoring views; canonical CQS
  JSON remains the strict runtime and interchange format
  (`CQS-RA2-AUTHORING-01`).

### CQS-OD-050 (50) — Import produces a game and feeds the bank

- **Status:** Accepted · **Primary activation:** `post-mvp-priority` · **Arc:**
  `CQS-ARC-AUTHORING`
- **Direction.** Spreadsheet import creates a reviewable ready-to-play game
  **and** adds imported questions to the reusable question bank.

### CQS-OD-051 (51) — Clue replacement and the reveal boundary

- **Status:** Accepted · **Primary activation:** `post-mvp-priority` · **Arc:**
  `CQS-ARC-AUTHORING`
- **Direction.** A clue may be freely replaced **until reveal**. After
  reveal, use an explicit cancellation or correction workflow and **preserve
  the actually displayed clue in history**.
- **Consequence.** Mirrors the append-only history invariant: displayed
  content is a fact; correction appends, never rewrites.

### CQS-OD-052 (52) — Portable bank packages before a shared repository

- **Status:** Accepted · **Primary activation:** `post-mvp-priority` ·
  **Arc:** `CQS-ARC-AUTHORING`
- **Component states.** Portable packages: `post-mvp-priority`. Shared
  hosted repository: `parked`.
- **Direction.** Support portable question-bank packages first and a future
  shared repository later.

### CQS-OD-053 (53) — External recording first; native recording later

- **Status:** Accepted · **Primary activation:** `post-mvp-priority` ·
  **Arc:** `CQS-ARC-INSIGHT`
- **Component states.** External recording + transcript import:
  `post-mvp-priority`. Native recording: `parked`.
- **Direction.** External session recording was the original assumption.
  Native recording is a valid later capability but is **not required for the
  MVP**.
- **Consequence.** Native recording stays parked pending privacy,
  permission, storage, and retention work (`CQS-OPP-NATIVE-RECORDING`).

### CQS-OD-054 (54) — Transcript identity is team identity

- **Status:** Accepted · **Primary activation:** `post-mvp-priority` · **Arc:**
  `CQS-ARC-INSIGHT`
- **Direction.** Team identity is the default transcript identity. Optional
  **teacher-managed** speaker labels may exist — **without biometric
  identification**.

### CQS-OD-055 (55) — Recommendation vs. promotion

- **Status:** Accepted · **Primary activation:** `post-mvp-priority` · **Arc:**
  `CQS-ARC-INSIGHT`
- **Direction.** CQS **recommends** assessment candidates; the **teacher
  explicitly promotes** them.

### CQS-OD-056 (56) — Credit requires a noncompetitive route

- **Status:** Accepted · **Primary activation:** `post-mvp-priority` ·
  **Arc:** `CQS-ARC-PARTICIPATION`
- **Component states.** Grading-policy detail: `research-required`.
- **Direction.** Credit may recognize competition **only when an equivalent
  noncompetitive contribution route exists**. Content creation, sourcing,
  review, analysis, and reflection are preferred.
- **Consequence.** Grading policy remains research- and
  school-policy-sensitive; see the research record.

### CQS-OD-057 (57) — Design Loan Mode now, implement later

- **Status:** Accepted · **Primary activation:** `architecture-preserved` ·
  **Arc:** `CQS-ARC-OPERATOR`
- **Component states.** Loan Mode implementation: `parked`
  (`CQS-OPP-LOAN-MODE`; it cannot precede the completed-game archive —
  see the register entry).
- **Direction.** Design for Loan Mode now but implement it after the MVP.

## Decisions 58–66 — assessment linkage and curriculum boundary

### CQS-OD-058 (58) — Stable item-family identity

- **Status:** Accepted · **Primary activation:** `post-mvp-priority` · **Arc:**
  `CQS-ARC-AUTHORING` / `CQS-ARC-INSIGHT`
- **Direction.** Connect game clues, revisions, adaptations, and test items
  through a **stable item-family ID**, with teacher confirmation.
- **Consequence.** Requires the question-identity model separating family,
  content revision, and game placement — see `CQS-RA2-QUESTION-ID-01`.

### CQS-OD-059 (59) — Aggregate statistics in, individual records out

- **Status:** Accepted · **Primary activation:** `architecture-preserved` ·
  **Arc:** `CQS-ARC-INSIGHT`
- **Component states.** Aggregate-statistics intake: `post-mvp-priority`.
- **Direction.** Architecturally allow controlled test-data import, but
  initially prefer individual assessment records to remain in GCS or another
  assessment system while CQS receives **aggregate item statistics**.

### CQS-OD-060 (60) — Roster linkage is optional and later

- **Status:** Accepted · **Primary activation:** `parked` · **Arc:**
  `CQS-ARC-INSIGHT`
- **Direction.** Optional roster and team-membership linkage may exist later
  while **distinguishing team evidence from individual evidence**. It is not
  required for the MVP.

### CQS-OD-061 (61) — Recording order of arrival

- **Status:** Accepted · **Primary activation:** `post-mvp-priority` · **Arc:**
  `CQS-ARC-INSIGHT`
- **Direction.** External recording and transcript import come **before**
  native recording (sequencing rule reinforcing CQS-OD-053).

### CQS-OD-062 (62) — Transcript retention

- **Status:** Accepted · **Primary activation:** `post-mvp-priority` · **Arc:**
  `CQS-ARC-INSIGHT`
- **Direction.** Transcript retention and deletion are configurable, with an
  option to **extract insights and remove the original transcript**.

### CQS-OD-063 (63) — Identity pools are approved, selection is student-made

- **Status:** Accepted · **Primary activation:** `post-mvp-priority` · **Arc:**
  `CQS-ARC-IDENTITY` (generation: `CQS-ARC-AUTHORING`)
- **Direction.** LLM authoring supplies an **approved identity pool**;
  students select their identities.

### CQS-OD-064 (64) — Recurring and session-specific identities

- **Status:** Accepted · **Primary activation:** `post-mvp-priority` · **Arc:**
  `CQS-ARC-IDENTITY`
- **Direction.** Support recurring and session-specific identities, with
  **session-specific as the default**. (Restated per identity-pack flow in
  CQS-OD-070 — the two entries deliberately remain distinct records.)

### CQS-OD-065 (65) — Candidate thresholds are configurable

- **Status:** Accepted · **Primary activation:** `post-mvp-priority` · **Arc:**
  `CQS-ARC-INSIGHT`
- **Direction.** Assessment-candidate thresholds are configurable, while the
  teacher may manually promote any appropriate item.

### CQS-OD-066 (66) — GCS learning-target linkage — UNRESOLVED

- **Status:** **Unresolved** · **Primary activation:** `unresolved` · **Arc:**
  `CQS-ARC-INSIGHT` (`CQS-OPP-GCS-LINKAGE`)
- **Open question.** Whether CQS should store external GCS learning-target
  IDs and labels while leaving GCS as the curriculum and formal-assessment
  authority.
- **Recorded recommendation (NOT an accepted decision).** CQS owns gameplay
  sessions, question-bank evidence, and game analytics; GCS owns curriculum
  and formal assessment records; a future integration may exchange stable
  learning-target and item-family identifiers. This remains a
  recommendation awaiting an explicit owner decision. **This register does
  not resolve it, and no other document may treat it as resolved.**

## Decisions 67–77 — self-service team identity

### CQS-OD-067 (67) — Four packs, with redraw

- **Status:** Accepted · **Primary activation:** `post-mvp-priority` · **Arc:**
  `CQS-ARC-IDENTITY`
- **Direction.** Teams choose among **four complete identity packs** and may
  redraw.

### CQS-OD-068 (68) — Simultaneous choice

- **Status:** Accepted · **Primary activation:** `post-mvp-priority` · **Arc:**
  `CQS-ARC-IDENTITY`
- **Direction.** Active teams choose **simultaneously**, not in turns.

### CQS-OD-069 (69) — Uniqueness within the session

- **Status:** Accepted · **Primary activation:** `post-mvp-priority` · **Arc:**
  `CQS-ARC-IDENTITY`
- **Direction.** Candidate pools and final identities remain **unique within
  the session**.

### CQS-OD-070 (70) — Session-specific by default, recurring optional

- **Status:** Accepted · **Primary activation:** `post-mvp-priority` · **Arc:**
  `CQS-ARC-IDENTITY`
- **Direction.** Identities may be session-specific or saved as recurring
  team profiles; **session-specific is the default**. (Companion of
  CQS-OD-064; both records are preserved distinctly.)

### CQS-OD-071 (71) — Participation passport

- **Status:** Accepted · **Primary activation:** `parked` · **Arc:**
  `CQS-ARC-PARTICIPATION` (`CQS-OPP-PARTICIPATION-PASSPORT`)
- **Direction.** An optional physical or digital **participation passport**
  may recognize several contribution types.

### CQS-OD-072 (72) — Deferred capabilities must carry their dossier

- **Status:** Accepted · **Primary activation:** `implemented` (as a documentation
  practice, by the opportunity register in this package)
- **Direction.** Every deferred capability must record its **reason,
  dependencies, implementation trigger, and required evidence**.
- **Consequence.** Enforced by
  [`../plans/POST-MVP-OPPORTUNITY-AND-TRIGGER-REGISTER.md`](../plans/POST-MVP-OPPORTUNITY-AND-TRIGGER-REGISTER.md);
  future planning documents must keep it true.

### CQS-OD-073 (73) — Preview before confirmation

- **Status:** Accepted · **Primary activation:** `post-mvp-priority` · **Arc:**
  `CQS-ARC-IDENTITY`
- **Direction.** Selecting an identity opens a **preview** before
  confirmation.

### CQS-OD-074 (74) — No forced setup timeout

- **Status:** Accepted · **Primary activation:** `post-mvp-priority` · **Arc:**
  `CQS-ARC-IDENTITY`
- **Direction.** There is **no forced setup timeout**. The host may skip an
  unfinished team if necessary.

### CQS-OD-075 (75) — Complete packs, optional refinement

- **Status:** Accepted · **Primary activation:** `post-mvp-priority` · **Arc:**
  `CQS-ARC-IDENTITY`
- **Direction.** Complete identity packs are the default, with an optional
  controller-driven refinement step.

### CQS-OD-076 (76) — "Keep our identity"

- **Status:** Accepted · **Primary activation:** `post-mvp-priority` · **Arc:**
  `CQS-ARC-IDENTITY`
- **Direction.** A recurring team sees **"Keep our identity"** alongside
  three new choices.

### CQS-OD-077 (77) — Pool composition

- **Status:** Accepted · **Primary activation:** `post-mvp-priority` · **Arc:**
  `CQS-ARC-IDENTITY`
- **Direction.** Combine game-specific identity pools with approved CQS
  fallbacks, **prioritizing course-relevant options**.

## Decisions 78–82 — scope and authority

### CQS-OD-078 (78) — One comprehensive documentation package

- **Status:** Accepted · **Primary activation:** `implemented` (by slice
  `CQS-PLAN-S01` — this package)
- **Direction.** Finish this bounded discovery and create one comprehensive
  documentation package.

### CQS-OD-079 (79) — The current MVP is preserved

- **Status:** Accepted · **Primary activation:** `implemented` (governing rule of
  this slice)
- **Direction.** Preserve the current MVP. Add only documentation and
  architecture amendments required to avoid blocking the expanded vision.
- **Consequence.** The 18-slice plan in `MVP-ARC.md` is unchanged; nothing
  in this package promotes a future capability into current scope.

### CQS-OD-080 (80) — Post-MVP arc order

- **Status:** Accepted · **Primary activation:** `post-mvp-priority` (sequencing
  decision)
- **Direction.** The **first post-MVP arc is spreadsheet and LLM game
  authoring** (`CQS-ARC-AUTHORING`), followed by team identity and
  presentation (`CQS-ARC-IDENTITY`), then polished operator and Loan Mode
  capabilities (`CQS-ARC-OPERATOR`).
- **Consequence.** Sequencing is elaborated in
  [`../plans/EXPANDED-CQS-VISION-ARC.md`](../plans/EXPANDED-CQS-VISION-ARC.md).

### CQS-OD-081 (81) — Presets → Customize → Advanced

- **Status:** Accepted · **Primary activation:** `post-mvp-priority`
- **Direction.** Configuration uses **Presets first**, followed by
  **Customize** and **Advanced** layers. The normal setup screen never
  exposes every internal policy.

### CQS-OD-082 (82) — Authority boundaries

- **Status:** Accepted — clarification · **Primary activation:** `implemented`
- **Direction.** The CQS repository is canonical. This owner-discovery
  record supplies decisions and rationale. Obsidian may index and summarize
  but is not authoritative.
- **Lineage.** Restates the standing authority rules in `AGENTS.md` and
  `docs/PROJECT.md`; recorded here so the expanded-vision record explicitly
  binds itself to them.

## Decisions 83–86 — Survey Showdown

### CQS-OD-083 (83) — Survey Showdown joins the post-MVP catalog

- **Status:** Accepted · **Primary activation:** `post-mvp-priority` · **Arc:**
  `CQS-ARC-FORMATS` (`CQS-OPP-SURVEY-SHOWDOWN`)
- **Direction.** Include a Family-Feud-inspired **Survey Showdown** format
  in the post-MVP catalog (no commercial branding, audio, or styling is
  imitated — the standing non-goal holds).

### CQS-OD-084 (84) — Spoken play is the Survey Showdown default

- **Status:** Accepted · **Primary activation:** `post-mvp-priority` · **Arc:**
  `CQS-ARC-FORMATS`
- **Direction.** Support spoken-answer host adjudication and
  controller-choice variants, with **spoken play as the default**.

### CQS-OD-085 (85) — Survey provenance is mandatory

- **Status:** Accepted · **Primary activation:** `post-mvp-priority` · **Arc:**
  `CQS-ARC-FORMATS`
- **Direction.** Every survey board declares provenance: **real survey**,
  **teacher-authored ranking**, or **synthetic / LLM-predicted answers**.
  Synthetic results must never be represented as collected survey data.

### CQS-OD-086 (86) — Survey finale is planned separately

- **Status:** Accepted · **Primary activation:** `parked` · **Arc:**
  `CQS-ARC-FORMATS` (`CQS-OPP-SURVEY-FINALE`)
- **Direction.** Plan a later timed survey-finale round **separately** from
  the first Survey Board implementation.

---

## Additional binding owner directions (§10 of the authorization)

The authorization also records binding non-numbered directions. They are
**owner direction with the same authority as the numbered decisions**, and
are elaborated in the domain documents rather than duplicated here:

| Direction | Elaborated in |
| --- | --- |
| Manual and timer-triggered arming | `GAMEPLAY-MODES-AND-POLICIES.md`; `CQS-RA2-ARMING-01` |
| Timer-expiry decision popup | `GAMEPLAY-MODES-AND-POLICIES.md` |
| Public team-card gameplay state (and what stays private) | `GAMEPLAY-MODES-AND-POLICIES.md`; `CQS-RA2-PUBLIC-STATE-01` |
| Presentation effects and accessibility bounds | `HOST-CONSOLE-TEAM-IDENTITY-AND-PRESENTATION.md` |
| Logical teams vs. physical controllers | `HOST-CONSOLE-TEAM-IDENTITY-AND-PRESENTATION.md`; `CQS-RA2-CONTROLLER-01` |
| Fully controller-operated identity setup | `HOST-CONSOLE-TEAM-IDENTITY-AND-PRESENTATION.md` |
| Identity-pack contents and naming rules | `HOST-CONSOLE-TEAM-IDENTITY-AND-PRESENTATION.md` |
| Authoritative event history vs. observational telemetry | `SESSION-ANALYTICS-ASSESSMENT-AND-PARTICIPATION.md`; `CQS-RA2-TELEMETRY-01` |
| Analytics language (no reaction-time claims) | `SESSION-ANALYTICS-ASSESSMENT-AND-PARTICIPATION.md` |
| Gameplay-to-assessment lifecycle | `SESSION-ANALYTICS-ASSESSMENT-AND-PARTICIPATION.md` |
| Student participation and credit | `SESSION-ANALYTICS-ASSESSMENT-AND-PARTICIPATION.md` |
| Survey Showdown mechanics and provenance | `GAMEPLAY-MODES-AND-POLICIES.md` |

All domain documents live under [`../plans/`](../plans/).

## What this register does not do

- It does not implement, schedule, or authorize any capability.
- It does not change the current MVP, `MVP-ARC.md`, or any slice status.
- It does not resolve decision 66, and nothing may cite it as resolved.
- It does not rewrite ADRs; amendment lineage lives in
  `ROADMAP-AMENDMENT-002-expanded-gameplay-vision.md`.
