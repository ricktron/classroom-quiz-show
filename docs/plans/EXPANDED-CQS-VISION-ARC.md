# Expanded CQS Vision Arc

- **Document id:** `CQS-EXPANDED-VISION-ARC`
- **Authorization:** `AUTHORIZE-CQS-PLAN-S01-EXPANDED-VISION-DOCUMENTATION-1`
- **Slice:** `CQS-PLAN-S01` (planning-only)
- **Date:** 2026-08-03
- **Status:** Accepted planning document — **authorizes no implementation**

This is the **canonical authority for overall expanded product direction and
sequencing**. Owner decisions live in
[`../decisions/EXPANDED-VISION-OWNER-DECISIONS.md`](../decisions/EXPANDED-VISION-OWNER-DECISIONS.md);
architectural lineage in
[`../decisions/ROADMAP-AMENDMENT-002-expanded-gameplay-vision.md`](../decisions/ROADMAP-AMENDMENT-002-expanded-gameplay-vision.md);
deferred-capability dossiers in
[`POST-MVP-OPPORTUNITY-AND-TRIGGER-REGISTER.md`](POST-MVP-OPPORTUNITY-AND-TRIGGER-REGISTER.md).
The current MVP sequence is the **23-slice** plan in
[`MVP-ARC.md`](MVP-ARC.md) (Amendment 004; prior Amendment 003 set 22 slices).
Post-MVP arcs still require separate authorization.

The accepted **Phase 2B audience-display design direction** is registered
separately in
[`CQS-DESIGN-PHASE-2B-DIRECTION.md`](CQS-DESIGN-PHASE-2B-DIRECTION.md). It is
program guidance only: registration itself implements nothing, authorizes
nothing, and changes no owner decision's acceptance or activation state. Its MVP
implementation consumers are **Slices 17–18**, which are now both `Complete`
(Slice 17 via PR #44; Slice 18 via PR #46).

## 1. Product thesis

Classroom Quiz Show grows from a local-first classroom game-show engine into
a **teacher-owned learning loop**: teachers author games quickly from their
own materials (spreadsheet + LLM authoring), run varied competitive and
cooperative formats on one host device with physical controllers, let teams
build their own identity and presentation, and — with explicit teacher
control at every step — turn what happened in play into better questions,
better review, and better assessments. The engine stays local-first,
host-authoritative, fail-closed, and free of student devices, accounts, and
cloud dependencies. Every expansion composes the existing command/event
architecture rather than replacing it.

## 2. Current implementation truth (reconciled 2026-08-06, post-Slice-18)

The current implementation supports: slices 1–18 `Complete` and merged —
foundation and routing; the command/event/replay/undo core; the typed
game/round model and non-executable registry; the canonical versioned JSON
import pipeline; the `category-board` round; teams and bounded integer
scoring; timers, manual arming and transitions; the hardware-independent
local input boundary with keyboard buzz-in and a full ordered queue; the
generic Gamepad adapter; the Sony Buzz! host-private setup boundary (bounded
physical claim, OADL2-S07); the typed text/image media contract; portable
export with round-trip import; host-local IndexedDB persistence with
explicit Resume/Discard recovery; the `final-wager` round as the second
playable registered round type; the Session Summary Contract; the completed
summary ledger and compatible reporting; the theme and design-token
foundation; and the Phase 2B audience-display composition (board-first shell,
Nexus Core, adaptive scores, Signal Rails) on public-state wire **8**. Public-
state wire **8**, sync envelope **2**, game-file schema **1**, IndexedDB
schema **2**. **Slices 1–18 are `Complete`**; **Slices 19–23 remain `Planned`
and unauthorized** under Amendment 004. Next planned product frontier:
**Slice 19 — Self-Contained Portable Packs** (unauthorized).

> **Reconciliation note.** This section previously recorded a post-Slice-14
> snapshot (slices 1–14 Complete; Slices 15–22 Planned; next candidate Slice
> 15). That wording became stale across completed Slices 15–18 and is updated
> here under `AUTHORIZE-CQS-SLICE-18-POST-MERGE-RECONCILIATION-1` while
> historical product thesis, post-MVP sequencing, preservation clauses, and
> owner-decision meaning remain unchanged. See [`../STATUS.md`](../STATUS.md)
> for canonical current slice status.

Nothing in the expanded vision beyond the completed MVP paragraph above is
implemented. No statement in this arc may be read as "CQS supports X" for any
post-MVP X outside separately authorized delivery.

## 3. Current MVP boundary

The current MVP is exactly the **23-slice** plan of record in
[`MVP-ARC.md`](MVP-ARC.md) (**slices 19–23 remaining**: portable packs;
spreadsheet authoring seed; Sony Buzz supported-profile operationalization;
minimal presentation audio; classroom release qualification). This arc **does
not** add to, reorder, or re-scope that remaining sequence beyond what
Amendments 003 and 004 already recorded. Expanded-vision capabilities enter
only through future arcs, each requiring its own Program Orchestrator
authorization. Theme song and advanced/team-specific presentation effects
remain post-MVP (`CQS-OPP-PRESENTATION-EFFECTS`).

## 4. Architecture preservation now

The only near-term obligation the expanded vision places on MVP work is
**not foreclosing the future**. The binding list (full lineage in
`ROADMAP-AMENDMENT-002`):

| Preservation concern | Clause |
| --- | --- |
| Format presets stay composition over the registry | `CQS-RA2-PRESET-01` |
| Arming stays one durable state; a timer-triggered cause can be added | `CQS-RA2-ARMING-01` |
| Early-press lockout ≠ first-only queue lockout | `CQS-RA2-EARLY-LOCKOUT-01` |
| Team-card public state can grow behind the versioned wire | `CQS-RA2-PUBLIC-STATE-01` |
| Ordinal secondary actions stay inert until their first consumer | `CQS-RA2-SECONDARY-01` |
| Explicit adjudication survives scoring-policy automation | `CQS-RA2-SCORE-REVEAL-01` |
| Telemetry never contaminates authoritative history | `CQS-RA2-TELEMETRY-01` |
| Recovery store is not repurposed as an archive | `CQS-RA2-ARCHIVE-01` |
| Stable team positions; ceremonial animation stays presentation | `CQS-RA2-TEAM-ORDER-01` |
| Workbooks author; canonical JSON stays the only truth | `CQS-RA2-AUTHORING-01` |
| Question identity is separable from board placement | `CQS-RA2-QUESTION-ID-01` |
| Logical teams never derive from physical handset count | `CQS-RA2-CONTROLLER-01` |

## 5. Arc sequence (post-MVP)

Per `CQS-OD-080`, with later arcs orderable by the Program Orchestrator as
evidence accumulates. **Arcs are named plans, not slice numbers** — slice
numbers are assigned only when an arc is authorized and decomposed under
then-current repository conventions.

### Arc 1 — `CQS-ARC-AUTHORING` (first post-MVP arc)

Spreadsheet and LLM game authoring plus the question-bank foundation.
Preset-specific workbook templates; the embedded-instruction authoring
packet; XLSX/CSV parsing into the universal content-draft model; structured
validation, review and approval; canonical-JSON compilation through the
existing import boundary; question-bank storage with item-family identity;
generation and source lineage. Detail:
[`LLM-SPREADSHEET-AUTHORING-ARC.md`](LLM-SPREADSHEET-AUTHORING-ARC.md).
Dependencies: current MVP through Slice 20 territory (spreadsheet authoring
seed remains the seed this arc grows from — the arc must reconcile with
Slice 20's delivered shape at authorization time; Slice 19 packs are
available composition).
Principal risks: scope creep into an editor product; grounding-quality
variance across models; teacher-trust failure if QA warnings are noisy.

### Arc 2 — `CQS-ARC-IDENTITY`

Team identity and presentation: controller-operated identity setup, four
identity packs with preview/redraw/refinement, session-specific and
recurring identities, presentation effects (animation, sound, celebrations)
under strict accessibility and authority bounds, richer public team-card
state. Detail:
[`HOST-CONSOLE-TEAM-IDENTITY-AND-PRESENTATION.md`](HOST-CONSOLE-TEAM-IDENTITY-AND-PRESENTATION.md).
Dependencies: media/theme groundwork from the MVP (Slices 17–18), ordinal
secondary-action consumers (`CQS-RA2-SECONDARY-01`).
Principal risks: presentation leaking into game authority; audio licensing;
motion accessibility.

### Arc 3 — `CQS-ARC-OPERATOR`

Polished one-screen host console (`CQS-OD-012`), guided operator workflow,
and Loan Mode packaging for non-owner operators. Detail:
[`HOST-CONSOLE-TEAM-IDENTITY-AND-PRESENTATION.md`](HOST-CONSOLE-TEAM-IDENTITY-AND-PRESENTATION.md).
The **polished host-console portion may follow `CQS-ARC-IDENTITY`
directly**, preserving the `CQS-OD-080` order (authoring → identity →
operator). Loan Mode design remains part of this arc, but **Loan Mode
implementation and Operator-arc completion cannot precede the
completed-game archive capability** (`CQS-OPP-HISTORICAL-ARCHIVE`,
delivered under `CQS-ARC-INSIGHT`).
Dependencies: stable gameplay-policy surface for the console redesign;
the completed-game archive for Loan Mode implementation and arc
completion.
Principal risks: console rebuild destabilizing working host flows;
Loan-Mode support burden.

### Arc 4 — `CQS-ARC-INSIGHT`

Historical sessions, opt-in telemetry, question analytics, external
transcript import, and gameplay-to-assessment linkage (aggregate statistics
in; individual records out — `CQS-OD-059`; `CQS-OD-066` unresolved).
Detail:
[`SESSION-ANALYTICS-ASSESSMENT-AND-PARTICIPATION.md`](SESSION-ANALYTICS-ASSESSMENT-AND-PARTICIPATION.md).
Dependencies: `CQS-ARC-AUTHORING`'s item identity; the archive
(`CQS-RA2-ARCHIVE-01`); MVP Slices 15–16 summary contract and ledger as the seed.
Principal risks: privacy expectations; analytics over-claiming (reaction
time, individual mastery); retention complexity.

### Arc 5 — `CQS-ARC-FORMATS`

The gameplay-policy engine (response, scoring, timer policies; clue
modifiers; presets), then additional formats from the catalog — Buzzer
Sprint, Team Choice, Mixed Review, Funny Review, Survey Showdown, and
later-catalog formats. Detail:
[`GAMEPLAY-MODES-AND-POLICIES.md`](GAMEPLAY-MODES-AND-POLICIES.md).
Dependencies: authoring (content for new formats), ordinal actions for
choice-based play; Survey Showdown additionally needs survey provenance
authoring support.
Principal risks: policy-matrix combinatorics outgrowing testability;
configuration overload (bounded by `CQS-OD-081`).

*Ordering note.* Arc 5 elements may interleave with arcs 2–4 at Program
Orchestrator discretion — e.g., the timer-policy work may precede Survey
Showdown by years. The register's per-opportunity triggers, not this
paragraph, gate each piece.

### Arc 6 — `CQS-ARC-PARTICIPATION`

Student participation and credit: contribution roles (Player, Author,
Reviewer, Analyst, Adapter, Producer), the optional participation
passport, and the noncompetitive-equivalence rule (`CQS-OD-056`).
Dependencies: authoring (student authorship routes) and insight
(evidence); school-policy review.
Principal risks: grading-policy sensitivity; equity of credit routes.

## 6. Cross-arc dependencies

```
MVP (slices 14–18)
  └─► CQS-ARC-AUTHORING ──► CQS-ARC-INSIGHT ──► CQS-ARC-PARTICIPATION
            │        (item identity) │
            │                        │ completed-game archive
            │                        ▼
            ├─► CQS-ARC-IDENTITY ─► CQS-ARC-OPERATOR
            │       (console may follow IDENTITY directly; Loan Mode
            │        implementation and Operator-arc COMPLETION require
            │        the archive from CQS-ARC-INSIGHT)
            └─► CQS-ARC-FORMATS (content + policies; Survey Showdown)
```

## 7. Evidence and definitions of done

Every arc, when authorized, must define slice-level acceptance in the
repository's established style (verify:all, e2e for user-visible change,
privacy tests, replay determinism). Arc-level definitions of done:

- **AUTHORING:** a teacher completes the seven-step workbook workflow
  (preset → template → LLM → import → review → approve → play) with zero
  hand-written JSON; every imported game compiles through canonical
  validation; bank entries carry family identity and source lineage.
- **IDENTITY:** four-team identity setup completes with no host
  interaction after launch; all presentation effects pass
  reduced-motion/mute/contrast requirements; no presentation event is
  gameplay-authoritative.
- **OPERATOR (host console):** a non-owner operator runs a complete
  supervised game following only the highlighted next actions — no
  later-arc capability required.
- **OPERATOR (completion, incl. Loan Mode):** reached only after the
  completed-game archive exists (`CQS-OPP-HISTORICAL-ARCHIVE`); Loan
  Mode locks configuration and auto-archives.
- **INSIGHT:** a completed game yields an archive entry and summary;
  question analytics render from ≥2 archived sessions; a transcript
  aligns to the event timeline; no individual-mastery claim appears
  anywhere.
- **FORMATS:** at least one new preset ships composed purely of registered
  round types + policies (no bespoke engine); Survey Showdown enforces
  provenance display.
- **PARTICIPATION:** every competitive credit route has a working
  noncompetitive equivalent.

## 8. Non-goals (expanded vision)

Unchanged and binding across all arcs: no backend requirement, no student
accounts, no student-owned devices or phones as controllers, no networked
buzzers, no required cloud dependency, no biometric identification, no
grading or defensible individual analytics from team play, no imitation of
any commercial show's branding/audio/styling, no executable imported
content, and no silent weakening of the host-private/public-sanitized
boundary. Survey Showdown never presents synthetic data as a real survey
(`CQS-OD-085`). Presentation never becomes game authority.

## 9. Program Orchestrator decision points

1. **Historical (at issuance):** exact-head review of Amendment 003, then
   Slice 15 readiness. That next-product action has since been superseded by
   completed Slices 15–18. **Current MVP next product frontier:** separately
   authorized Slice 19 readiness/implementation (nothing here grants Slice 19
   implementation). Slices 1–18 are `Complete`; Slices 19–23 are `Planned`.
2. **Resolve `CQS-OD-066`** (GCS learning-target linkage) — owner
   decision; blocks only the GCS-integration slice of `CQS-ARC-INSIGHT`.
   Standards/GCS tags are removed from the MVP completion requirement.
3. **Authorize `CQS-ARC-AUTHORING` planning** — after MVP Slice 20
   territory is reached or deliberately re-sequenced; this is the first
   post-MVP authorization the owner has pre-declared (`CQS-OD-080`).
4. **Order arcs 2–5** as classroom evidence accumulates (see the
   opportunity register's triggers).
5. **Approve any schema-version work** under `ROADMAP-AMENDMENT-001`
   §5.10's migration policy when family/revision identity metadata is
   introduced.
