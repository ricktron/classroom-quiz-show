# Post-MVP Opportunity and Trigger Register

- **Document id:** `CQS-POST-MVP-OPPORTUNITY-REGISTER`
- **Authorization:** `AUTHORIZE-CQS-PLAN-S01-EXPANDED-VISION-DOCUMENTATION-1`
- **Slice:** `CQS-PLAN-S01` (planning-only)
- **Last reviewed:** 2026-08-03 (all entries)
- **Status:** Accepted planning register — **authorizes no implementation**

This is the **canonical authority for deferred capabilities, their
dependencies, and their reconsideration triggers** (satisfying
`CQS-OD-072`). Every entry records: owner intent, activation state, reason
deferred, dependencies, an **externally observable trigger**, evidence
required, decision authority, likely arc, and principal risks. Decision ids
refer to
[`../decisions/EXPANDED-VISION-OWNER-DECISIONS.md`](../decisions/EXPANDED-VISION-OWNER-DECISIONS.md);
arcs to [`EXPANDED-CQS-VISION-ARC.md`](EXPANDED-CQS-VISION-ARC.md).

A trigger is a **reconsideration** condition — when it fires, the Program
Orchestrator and owner decide; nothing self-activates. "Decision authority"
is the Program Orchestrator with owner approval in every entry; entries
note only *additional* authority where it exists.

---

## CQS-OPP-SPREADSHEET-LLM-AUTHORING — Spreadsheet + LLM game authoring

- **Intent:** `CQS-OD-041`…`CQS-OD-051`; first-class quick path from a
  teacher's materials to a reviewable, ready-to-play game.
- **Activation:** `post-mvp-priority` (first arc) · **Arc:**
  `CQS-ARC-AUTHORING`
- **Deferred because:** the MVP must finish its own remaining core (slices
  15–22 under Amendment 003); MVP Slice 20 owns the spreadsheet authoring
  seed, and this opportunity must build on its delivered shape rather than
  race it. It remains the **accepted first post-MVP arc** (`CQS-OD-080`) —
  the trigger below times it, it does not re-rank it.
- **Dependencies:** canonical pipeline (done); portable export (done);
  Slice 20 outcome; workbook-shape design in
  [`LLM-SPREADSHEET-AUTHORING-ARC.md`](LLM-SPREADSHEET-AUTHORING-ARC.md).
- **Trigger:** MVP Slice 20 is `Complete` **and post-merge reconciled**,
  and at least **two real game-preparation workflows have documented
  limitations in the delivered authoring path** — evidence may come from
  the authoring UI, spreadsheets, or JSON. A deliberate Program
  Orchestrator re-sequencing decision may override this default timing.
- **Evidence required:** the two documented workflow-limitation records
  from real game preparation; one worked example of an LLM-populated
  workbook validated by hand.
- **Risks:** editor-product scope creep; model-output variance; teacher
  trust in QA warnings.

## CQS-OPP-QUESTION-BANK — Reusable question bank

- **Intent:** `CQS-OD-042`, `CQS-OD-050`, `CQS-OD-058`; imported questions
  accumulate into a reusable, teacher-owned bank with item-family identity.
- **Activation:** `post-mvp-priority` · **Arc:** `CQS-ARC-AUTHORING`
- **Deferred because:** requires the question-identity model
  (`CQS-RA2-QUESTION-ID-01`) and authoring intake to exist first.
- **Dependencies:** `CQS-OPP-SPREADSHEET-LLM-AUTHORING`; additive schema
  metadata under the recorded migration policy.
- **Trigger:** at least three games exist whose content overlaps (same
  course, reused topics), demonstrated by comparing exported game files.
- **Evidence required:** the overlapping exports; an owner note on reuse
  friction.
- **Risks:** identity-model complexity; silent divergence between bank and
  game copies (revision discipline must prevent it).

## CQS-OPP-BANK-PACKAGES — Portable question-bank packages

- **Intent:** `CQS-OD-052` (first half): share banks as portable files.
- **Activation:** `post-mvp-priority` · **Arc:** `CQS-ARC-AUTHORING`
- **Deferred because:** a bank must exist before it can be packaged.
- **Dependencies:** `CQS-OPP-QUESTION-BANK`; ADR-012 export discipline.
- **Trigger:** a second teacher (non-owner) asks for the owner's question
  set, recorded in a decision record or issue.
- **Evidence required:** the concrete sharing request; a round-trip
  package prototype.
- **Risks:** answer-key leakage through casual sharing (packages carry
  keys and must say so, like ADR-012's export warning).

## CQS-OPP-SHARED-REPOSITORY — Shared question repository

- **Intent:** `CQS-OD-052` (second half): a future hosted/shared bank.
- **Activation:** `parked` · **Arc:** `CQS-ARC-AUTHORING` (late)
- **Deferred because:** contradicts local-first simplicity until packages
  prove insufficient; hosting, moderation, and licensing questions are
  unscoped.
- **Dependencies:** `CQS-OPP-BANK-PACKAGES` in real use.
- **Trigger:** at least three teachers exchange packages by file at least
  monthly for one semester, and the exchange friction is documented.
- **Evidence required:** the documented exchange history and friction log.
- **Risks:** infrastructure and moderation burden; scope conflict with
  the no-backend invariant (a repository may be static-file based; any
  backend requires an explicit non-goal amendment).

## CQS-OPP-TEAM-IDENTITY — Self-service team identity system

- **Intent:** `CQS-OD-063`…`CQS-OD-077`; controller-operated identity
  packs with preview, redraw, refinement, and recurring profiles.
- **Activation:** `post-mvp-priority` · **Arc:** `CQS-ARC-IDENTITY`
- **Deferred because:** depends on ordinal secondary-action consumers and
  presentation groundwork; MVP has no identity surface.
- **Dependencies:** `CQS-RA2-SECONDARY-01` consumer authorization; theme
  groundwork (MVP Slices 17–18); authoring supplies pools (`CQS-OD-063`).
- **Trigger:** classroom evidence (receipt or owner note) from at least
  three sessions that team naming/setup consumed class time or caused
  disputes, **or** the owner schedules the identity arc after the
  authoring arc completes (`CQS-OD-080` order).
- **Evidence required:** session observations; a paper mock of the
  four-pack chooser tested once in class.
- **Risks:** setup time replacing play time; name-appropriateness
  moderation (bounded by the §10.7 naming rules).

## CQS-OPP-PRESENTATION-EFFECTS — Advanced presentation (animation & sound)

- **Intent:** `CQS-OD-031`, `CQS-OD-034`, §10.4; richer card states,
  celebrations, **team-specific / identity-pack** buzz sounds, optional
  between-round leaderboard motion, entrance effects, sound packs, and a
  future **theme song / opening music identity**.
- **Activation:** `post-mvp-priority` · **Arc:** `CQS-ARC-IDENTITY`
- **Not the same as MVP Slice 22:** Amendment 004 plans a tiny **generic**
  application-owned cue layer as MVP Slice 22 — Minimal Presentation Audio.
  That slice does **not** activate this opportunity and does **not** include
  theme song, team-specific packs, celebrations, or animation systems.
- **Deferred because:** advanced presentation polish must not precede stable
  gameplay/identity policy; **broader/custom/team-specific** audio licensing
  (see the recorded team buzz-sound direction in
  [`../handoff/CURRENT.md`](../handoff/CURRENT.md)) remains unresolved.
  Licensing-safe **generic** application cues are an explicit Slice 22
  requirement and do **not** imply all presentation-audio licensing questions
  are solved.
- **Dependencies:** theme/token foundation and audience display (MVP Slices
  17–18); preferably after MVP Slice 22’s minimal cue layer if that ships;
  `CQS-RA2-TEAM-ORDER-01` bounds; accessibility requirements of §10.4.
- **Trigger:** Slices 17–18 ship and one full unit of classroom play is
  observed on them, with owner notes on presentation gaps beyond the minimal
  cue layer.
- **Evidence required:** the observation notes; a reduced-motion review of
  any proposed animation set.
- **Risks:** presentation becoming authority (prohibited); flashing/motion
  accessibility; broader audio licensing.

## CQS-OPP-HOST-CONSOLE — Polished one-screen host console

- **Intent:** `CQS-OD-012`, §14; persistent status rail, one emphasized
  next action, collapsible detail, timer-expiry popup, emergency conceal,
  diagnostics.
- **Activation:** `post-mvp-priority` · **Arc:** `CQS-ARC-OPERATOR`
- **Deferred because:** the console should be redesigned once, after the
  gameplay-policy surface stabilizes — not per-slice. The console portion
  may follow `CQS-ARC-IDENTITY` directly (the `CQS-OD-080` order) and
  does **not** require the completed-game archive — Operator-arc
  completion and Loan Mode do.
- **Dependencies:** stable policy/preset surface (`CQS-ARC-FORMATS` core);
  existing host panels as the behavioral spec.
- **Trigger:** an operator-error log from at least three real sessions
  identifies the three most common host mistakes or hesitations.
- **Evidence required:** the error log; a paper/wireframe walkthrough
  against it.
- **Risks:** regression risk in working host flows; hidden-control
  discoverability.

## CQS-OPP-LOAN-MODE — Loan Mode for non-owner operators

- **Intent:** `CQS-OD-057`, §17; locked-down, guided operation for other
  teachers, substitutes, and club sponsors, with automatic session
  archives and default restoration.
- **Activation:** `parked` (designed now, implemented after the operator
  console) · **Arc:** `CQS-ARC-OPERATOR`
- **Deferred because:** no second operator exists yet; requires the
  polished console and the archive. **Loan Mode implementation and
  Operator-arc completion cannot precede the completed-game archive
  capability** (`CQS-OPP-HISTORICAL-ARCHIVE`, `CQS-ARC-INSIGHT`).
- **Dependencies:** `CQS-OPP-HOST-CONSOLE`; `CQS-OPP-HISTORICAL-ARCHIVE`
  (hard prerequisite); controller-test guidance.
- **Trigger:** reconsider after at least two non-owner teachers complete
  supervised game sessions and an operator-error log identifies the three
  most common setup failures.
- **Evidence required:** the two supervised-session records and the
  error log.
- **Risks:** support burden; hidden-setting confusion; hardware setup
  variance on borrowed machines.

## CQS-OPP-GAMEPLAY-POLICIES — Response/scoring/timer policy engine

- **Intent:** `CQS-OD-002`, `CQS-OD-013`…`CQS-OD-032`, §8, §10.1–§10.3;
  the reusable policy layers and preset catalog.
- **Activation:** `post-mvp-priority` · **Arc:** `CQS-ARC-FORMATS`
- **Deferred because:** the MVP intentionally ships fixed classroom-safe
  behavior; the policy layer is the largest engine change in the expanded
  vision and needs its own arc.
- **Dependencies:** MVP complete (timers, queue, scoring all live);
  `CQS-RA2-ARMING-01`, `CQS-RA2-EARLY-LOCKOUT-01`,
  `CQS-RA2-SCORE-REVEAL-01`.
- **Trigger:** the owner runs the same game for two different class
  contexts and documents wanting different wrong-answer/timer behavior
  between them (a receipt-recorded configuration wish list).
- **Evidence required:** the wish list; a policy-matrix draft proving the
  combinations stay testable.
- **Risks:** combinatorial test surface; configuration overload (bounded
  by `CQS-OD-081`).

## CQS-OPP-ADDITIONAL-FORMATS — Additional game formats (catalog)

- **Intent:** `CQS-OD-001`, `CQS-OD-039`, §18; Buzzer Sprint, Team
  Choice, Mixed Review, Funny Review, then the wider catalog (Tossup and
  Bonus, Fastest Correct, Rapid Classification, Estimate and Wager,
  Connections and Sequences, Grouping Wall, Ordering, Chain and Bank,
  Relay, Risk Ladder, Bluff Lab, Caption Collision, Majority Report, and
  the labeled funny formats).
- **Activation:** `post-mvp-priority` (initial four) / `parked` (wider
  catalog) · **Arc:** `CQS-ARC-FORMATS`
- **Deferred because:** each format must arrive as composition
  (`CQS-RA2-PRESET-01`) over the policy engine, which does not exist yet.
- **Dependencies:** `CQS-OPP-GAMEPLAY-POLICIES`; ordinal actions for
  choice formats; authoring content support per format
  ([`GAMEPLAY-MODES-AND-POLICIES.md`](GAMEPLAY-MODES-AND-POLICIES.md)
  classifies each).
- **Trigger:** per format — the owner identifies a concrete unit/lesson
  where the format serves review better than Classic Board and records it;
  the policy engine exists.
- **Evidence required:** the lesson mapping; a one-page format spec
  against the six-layer model.
- **Risks:** format sprawl; per-format host workload surprises.

## CQS-OPP-SURVEY-SHOWDOWN — Survey Showdown format

- **Intent:** `CQS-OD-083`…`CQS-OD-085`, §19; survey board with face-off,
  play-or-pass, strikes, steal, round pot, spoken-answer default,
  controller-choice variant, mandatory provenance.
- **Activation:** `post-mvp-priority` · **Arc:** `CQS-ARC-FORMATS`
- **Deferred because:** needs the policy engine (face-off, strikes, pot
  are new policy members), survey authoring (ranked answers + provenance),
  and host adjudication UX.
- **Dependencies:** `CQS-OPP-GAMEPLAY-POLICIES`;
  `CQS-OPP-SPREADSHEET-LLM-AUTHORING` (SURVEY_ROUNDS/SURVEY_ANSWERS
  authoring); provenance rules (`CQS-OD-085`).
- **Trigger:** a real survey source exists for at least one class (an
  actual class-collected survey or teacher-authored ranking recorded in
  materials), plus the policy engine.
- **Evidence required:** the survey dataset with population/date/counts;
  a dry-run adjudication script.
- **Risks:** synthetic-data misrepresentation (hard rule: never present
  synthetic as real); adjudication pace; duplicate-answer disputes.

## CQS-OPP-SURVEY-FINALE — Timed survey finale

- **Intent:** `CQS-OD-086`; a later Fast-Money-style timed survey finale,
  planned separately from Survey Board.
- **Activation:** `parked` · **Arc:** `CQS-ARC-FORMATS`
- **Deferred because:** explicitly sequenced after the first Survey Board
  implementation by owner decision.
- **Dependencies:** `CQS-OPP-SURVEY-SHOWDOWN` complete and played.
- **Trigger:** Survey Board has been played in at least three sessions
  and the owner records demand for a finale variant.
- **Evidence required:** session receipts; timing model for private
  second-team isolation in a one-room classroom.
- **Risks:** answer contamination between team members in one room;
  timer pressure accessibility.

## CQS-OPP-FUNNY-MODES — Funny open-response modes

- **Intent:** `CQS-OD-039`, §18's labeled formats (Wrong Answers Only,
  Explain It Badly, Caption Collision, Science Court, Phrase Forge, Lab
  Accident Generator); host-assisted open-response play, clearly labeled.
- **Activation:** `parked` · **Arc:** `CQS-ARC-FORMATS`
- **Deferred because:** open-response classroom input without student
  devices requires host-assisted transcription or spoken adjudication —
  workable but host-heavy; needs the policy engine's host-adjudication
  response policy first.
- **Dependencies:** `CQS-OPP-GAMEPLAY-POLICIES` (host-adjudication
  policy); humor-profile authoring (`CQS-OD-048`).
- **Trigger:** the owner runs one manual (paper/verbal) trial of a funny
  format in class and records that it worked but tooling was the
  bottleneck.
- **Evidence required:** the trial notes.
- **Risks:** host workload; school-safety of humor (bounded by
  Chaotic-but-School-Safe ceiling).

## CQS-OPP-HISTORICAL-ARCHIVE — Completed-game archive

- **Intent:** `CQS-OD-036`, §15.1; durable completed-session records with
  configurable, exportable retention.
- **Activation:** `post-mvp-priority` · **Arc:** `CQS-ARC-INSIGHT`
- **Deferred because:** ADR-013 deliberately scoped persistence to
  recovery; an archive is a new store with new retention semantics
  (`CQS-RA2-ARCHIVE-01`).
- **Dependencies:** ADR-013 stores (done); MVP Slices 15–16 summary contract
  and ledger as the natural archive seed payload.
- **Trigger:** MVP Slices 15–16 are `Complete` and the owner wants any
  summary kept beyond the compatible ledger (first time a fuller archive is
  needed).
- **Evidence required:** that manual-copy moment recorded; a retention
  policy draft.
- **Risks:** unbounded local storage growth; student-visible history
  sensitivity (archives are host-private).

## CQS-OPP-TELEMETRY — Detailed input telemetry (opt-in)

- **Intent:** `CQS-OD-035`, §10.8; the observational journal (rejected
  presses, early presses, lockout presses, selections, host actions,
  diagnostics).
- **Activation:** `parked` · **Arc:** `CQS-ARC-INSIGHT`
- **Deferred because:** valuable only once analytics consume it; strict
  separation rules (`CQS-RA2-TELEMETRY-01`) must be designed against a
  real consumer to avoid speculative contracts.
- **Dependencies:** `CQS-OPP-HISTORICAL-ARCHIVE`; an analytics consumer
  (`CQS-OPP-QUESTION-ANALYTICS`).
- **Trigger:** a concrete analytics question (e.g., early-buzz frequency
  per question) is blocked solely by missing telemetry, recorded in the
  analytics backlog.
- **Evidence required:** the blocked-question record.
- **Risks:** privacy perception; storage noise; the mixing hazard the
  amendment clause prohibits.

## CQS-OPP-QUESTION-ANALYTICS — Question and session analytics

- **Intent:** `CQS-OD-038`, `CQS-OD-045` (calibration), §15.2; per-question
  play statistics, honest observed-latency language, quality labels,
  class/section views.
- **Activation:** `post-mvp-priority` · **Arc:** `CQS-ARC-INSIGHT`
- **Deferred because:** needs archives (data), item identity (join key),
  and the analytics-language rules to be enforceable.
- **Dependencies:** `CQS-OPP-HISTORICAL-ARCHIVE`; `CQS-OPP-QUESTION-BANK`
  (family identity); §10.9 language rules.
- **Trigger:** at least five archived sessions exist for one course.
- **Evidence required:** the archives; a mock analytics sheet reviewed by
  the owner for over-claiming.
- **Risks:** small-sample over-interpretation (item statistics are
  unstable at classroom N — see research record); one-number quality
  reduction (prohibited).

## CQS-OPP-TRANSCRIPT-IMPORT — External recording & transcript import

- **Intent:** `CQS-OD-053` (first half), `CQS-OD-054`, `CQS-OD-061`,
  `CQS-OD-062`, §15.3; align external transcripts to the event timeline;
  host markers; configurable retention.
- **Activation:** `post-mvp-priority` · **Arc:** `CQS-ARC-INSIGHT`
- **Deferred because:** depends on archives (the timeline to align to)
  and on a real recording practice existing.
- **Dependencies:** `CQS-OPP-HISTORICAL-ARCHIVE`; school recording policy
  review (see research record, privacy findings).
- **Trigger:** the owner records one session externally under school
  policy and produces a transcript file to align.
- **Evidence required:** the recording-policy check; the sample
  transcript.
- **Risks:** privacy/consent (state law varies); alignment quality;
  transcript over-trust (supporting evidence only, never gameplay truth).

## CQS-OPP-NATIVE-RECORDING — Native session recording

- **Intent:** `CQS-OD-053` (second half); in-app recording, someday.
- **Activation:** `parked` · **Arc:** `CQS-ARC-INSIGHT` (late)
- **Deferred because:** privacy, permission, storage, and retention work
  is unstarted; external-first is the accepted order (`CQS-OD-061`).
- **Dependencies:** `CQS-OPP-TRANSCRIPT-IMPORT` in real use; a
  documented consent/retention policy.
- **Trigger:** external recording + import has been used for a full
  grading period and the handling friction is documented.
- **Evidence required:** the friction log; a written consent/retention
  policy approved by the school.
- **Risks:** legal exposure; storage size; scope conflict with
  local-first simplicity.

## CQS-OPP-ASSESSMENT-ANALYTICS — Gameplay-to-test analytics

- **Intent:** `CQS-OD-055`, `CQS-OD-058`, `CQS-OD-059`, `CQS-OD-065`,
  §10.10, §15.4; candidate recommendation, teacher promotion, aggregate
  test-item statistics joined by item family.
- **Activation:** `post-mvp-priority` · **Arc:** `CQS-ARC-INSIGHT`
- **Deferred because:** requires item-family identity end-to-end and the
  teacher's assessment workflow to remain external (`CQS-OD-059`).
- **Dependencies:** `CQS-OPP-QUESTION-ANALYTICS`; item-family adoption in
  authoring; aggregate-import format design.
- **Trigger:** the owner adapts at least three played clues into test
  items by hand and records the mapping.
- **Evidence required:** the three hand mappings; an aggregate-statistics
  sample file.
- **Risks:** individual-mastery inference (prohibited); item-security
  when game clues become test items.

## CQS-OPP-ROSTER-LINKAGE — Roster and team-membership linkage

- **Intent:** `CQS-OD-060`; optional later linkage distinguishing team
  evidence from individual evidence.
- **Activation:** `parked` · **Arc:** `CQS-ARC-INSIGHT` (late)
- **Deferred because:** individual identity in CQS is a privacy-boundary
  expansion gated by owner gate `OG-7` (still open) and the standing
  non-goal on individual analytics.
- **Dependencies:** `CQS-OPP-ASSESSMENT-ANALYTICS`; `OG-7` resolution;
  school policy.
- **Trigger:** a concrete participation-credit or contribution-tracking
  need (from `CQS-ARC-PARTICIPATION`) that team-level records provably
  cannot serve, documented in a decision record.
- **Evidence required:** the documented gap; a data-minimization design.
- **Risks:** privacy scope creep; grading-adjacent misuse.

## CQS-OPP-PARTICIPATION-PASSPORT — Participation passport / credential

- **Intent:** `CQS-OD-071`, §16; optional passport recognizing multiple
  contribution categories, competitive routes always paired with
  noncompetitive equivalents (`CQS-OD-056`).
- **Activation:** `parked` · **Arc:** `CQS-ARC-PARTICIPATION`
- **Deferred because:** contribution routes (authoring, review, analysis)
  need the authoring and insight arcs to exist as real activities first;
  grading policy is school-policy-sensitive and `research-required`.
- **Dependencies:** `CQS-ARC-AUTHORING` student routes;
  `CQS-ARC-INSIGHT` reflection materials; school grading policy review.
- **Trigger:** students have performed at least two non-player
  contribution types (e.g., authored and reviewed clues) in a real unit,
  recorded by the teacher.
- **Evidence required:** the contribution records; an equity review of
  proposed passport categories.
- **Risks:** credit inequity; extrinsic-motivation crowding (see research
  record, gamification findings).

## CQS-OPP-GCS-LINKAGE — GCS learning-target linkage

- **Intent:** **Unresolved** (`CQS-OD-066`). The recorded recommendation
  (CQS stores stable learning-target/item-family identifiers; GCS keeps
  curriculum and formal-assessment authority) is a recommendation only.
- **Activation:** `unresolved` · **Arc:** `CQS-ARC-INSIGHT`
- **Deferred because:** the owner has deliberately not decided.
- **Dependencies:** decision `CQS-OD-066` itself; item-family identity.
- **Trigger:** the owner resolves `CQS-OD-066`. No implementation
  planning may precede that resolution.
- **Evidence required:** the owner decision record.
- **Risks:** premature coupling to an external system's identifier
  scheme; authority confusion between CQS and GCS.

## CQS-OPP-CONTROLLER-ORDINAL-ACTIONS — Richer controller mappings (ordinal consumers)

- **Intent:** `CQS-OD-010`, `CQS-OD-025`; activate the four inert ordinal
  slots for A–D choices and bounded round-specific meanings.
- **Activation:** `architecture-preserved` (contract exists) /
  implementation `post-mvp-priority` · **Arc:** `CQS-ARC-FORMATS` /
  `CQS-ARC-IDENTITY`
- **Deferred because:** ADR-008's rule — no durable vocabulary without the
  first authorized consumer.
- **Dependencies:** the first consuming feature (multiple-choice round,
  Team Choice, or identity setup) being authorized.
- **Trigger:** authorization of any consuming feature above.
- **Evidence required:** the consumer's slice plan defining the bounded
  ordinal meaning.
- **Risks:** speculative vocabulary if built early (prohibited);
  cross-round meaning drift (each consumer defines its own bounds).

## CQS-OPP-MULTI-CONTROLLER-TEAMS — Multiple controllers per team

- **Intent:** `CQS-OD-010`, `CQS-OD-040`; several physical handsets
  mapping to one logical team.
- **Activation:** `parked` · **Arc:** `CQS-ARC-FORMATS` (late)
- **Deferred because:** one-controller-per-team is the accepted starting
  point; the mapping model's team-primary uniqueness rule would need a
  deliberate, tested relaxation.
- **Dependencies:** stable physical-controller practice (OADL2-S07
  follow-ups, keep-alive resolution); `CQS-RA2-CONTROLLER-01`.
- **Trigger:** a real class configuration needs more than four
  respondents-with-buttons per game (e.g., >4 teams with hardware, or
  per-student buttons within teams), recorded from actual sessions.
- **Evidence required:** the session need; an input-rate analysis (many
  handsets, one queue).
- **Risks:** input flooding; fairness perception between handsets of one
  team.

## CQS-OPP-ASSESSMENT-IMPORT — Native assessment-data imports

- **Intent:** `CQS-OD-059`'s architectural allowance: controlled import
  of assessment data (aggregate item statistics) into CQS.
- **Activation:** `parked` · **Arc:** `CQS-ARC-INSIGHT` (late)
- **Deferred because:** the accepted initial posture keeps individual
  records out of CQS; even aggregate import needs a format and a
  provenance model, and may be affected by unresolved `CQS-OD-066`.
- **Dependencies:** `CQS-OPP-ASSESSMENT-ANALYTICS`; `CQS-OD-066`
  resolution for anything GCS-specific.
- **Trigger:** the owner has manually transferred aggregate item
  statistics into CQS-adjacent notes at least twice and records the
  friction.
- **Evidence required:** the two manual transfers; a data-boundary review
  confirming aggregates only.
- **Risks:** individual-record leakage through careless aggregation;
  authority drift toward CQS becoming an assessment system (rejected).

---

## Register integrity rules

1. Every entry keeps exactly one activation state per capability and an
   externally observable trigger. "Implement when useful" is prohibited.
2. A fired trigger obligates a **decision**, never an implementation.
3. Entries are reviewed when their trigger fires or when a related arc is
   authorized; `Last reviewed` is updated then.
4. New deferred capabilities must be added here (not scattered in prose)
   with the full dossier (`CQS-OD-072`).
