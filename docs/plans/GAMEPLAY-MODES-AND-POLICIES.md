# Gameplay Formats and Reusable Policies

- **Document id:** `CQS-PLAN-GAMEPLAY-POLICIES`
- **Slice:** `CQS-PLAN-S01` (planning-only) · **Date:** 2026-08-03
- **Status:** Explanatory planning view — **authorizes no implementation**

This is a domain view. Canonical authority lives elsewhere: decisions in
[`../decisions/EXPANDED-VISION-OWNER-DECISIONS.md`](../decisions/EXPANDED-VISION-OWNER-DECISIONS.md)
(`CQS-OD-xxx`), architecture lineage in
[`../decisions/ROADMAP-AMENDMENT-002-expanded-gameplay-vision.md`](../decisions/ROADMAP-AMENDMENT-002-expanded-gameplay-vision.md)
(`CQS-RA2-xxx`), deferral dossiers in
[`POST-MVP-OPPORTUNITY-AND-TRIGGER-REGISTER.md`](POST-MVP-OPPORTUNITY-AND-TRIGGER-REGISTER.md)
(`CQS-OPP-xxx`). Nothing here is implemented unless it names the current
implementation explicitly.

## 1. The six-layer product model (binding vocabulary)

Per `CQS-RA2-PRESET-01`, the expanded product never uses one overloaded
"game mode" concept. Six layers, each with its own bounded vocabulary:

1. **Game-format preset** — a friendly bounded recipe shown to the
   operator (Classic Board, Board + Final, Buzzer Sprint, Team Choice,
   Mixed Review, Funny Review — `CQS-OD-001`). A preset *selects* the
   layers below; it implements nothing itself.
2. **Registered round type** — engine behavior behind the ADR-003
   registry. Implemented today: `category-board` (plus the non-gameplay
   `placeholder`). Current-mvp-planned: `final-wager` (Slice 14). Future
   (post-mvp or parked): `sequential-prompts`, `multiple-choice`,
   `survey-board`, survey finale, and the estimate, connection, sequence,
   ordering, relay, chain, bluff, and classification families.
3. **Response policy** — who may answer and how: wait-then-buzz, first
   buzz, first buzz with rebounds, full ordered queue, interruptible
   tossup, all-teams-answer, simultaneous A–D choice, host adjudication,
   private wager response. The current implementation's fixed behavior is
   manual arming + full ordered queue + promotion (`OG-1`/`OG-2`/`OG-3`).
4. **Scoring policy** — correct-adds/wrong-nothing (today's manual
   default), correct-adds/wrong-deducts, fixed value, modest speed bonus,
   strong speed weighting, wager settlement, round-pot settlement, manual
   host award. All future policies compose the typed scoring event model
   (`CQS-RA2-SCORE-REVEAL-01`).
5. **Timer and transition policy** — host-controlled (today);
   readiness-countdown-then-automatic-arming;
   readiness-countdown-then-host-confirmation; buzz-window timer;
   per-team answer timer; simultaneous response deadline; host popup on
   expiry; configured safe automatic transition (`CQS-RA2-ARMING-01`,
   `CQS-OD-014`, `CQS-OD-023`, `CQS-OD-029`, `CQS-OD-030`).
6. **Clue modifier** — multiplier (implemented), hidden wager, no
   penalty, all-play, bonus, custom timer, designated special-clue
   override (`CQS-OD-003`, `CQS-OD-004`, `CQS-OD-032`).

## 2. Timers, arming, queues, lockouts (future policy detail)

All `post-mvp-priority` under `CQS-OPP-GAMEPLAY-POLICIES` unless labeled
otherwise.

### 2.1 Arming (§10.1 direction)

Arming remains **one durable state** with typed causes: a separate manual
host action (implemented, `OG-1`), or automatic arming at the end of a
readiness timer (future, `CQS-OD-029`), or readiness countdown followed by
host confirmation. Jeopardy-like "wait until the clue is read" play is a
readiness period ending in arming; automatic arming is never universal.

### 2.2 Early presses and lockout

- Today: a press before arming is rejected and appends nothing.
- Future competitive policy (`CQS-OD-013`): detect the early team, show
  the host (and optionally the team card, `CQS-OD-026`/§10.3), apply a
  **temporary early lockout** — preset-controlled duration, ~500 ms
  recommended classroom default (`CQS-OD-027`; cf. broadcast Jeopardy!'s
  reported quarter-second lockout, research finding `CQS-RF-JEOPARDY-01`).
- Repeated presses during lockout are ignored and never extend it; a
  fresh press after lockout may claim the clue if intake is open
  (`CQS-OD-028`).
- This never reintroduces first-only queue lockout
  (`CQS-RA2-EARLY-LOCKOUT-01`).

### 2.3 Queue and turn resolution

- Full ordered queue with exact positions (host-private today; future
  public position per `CQS-OD-026`).
- Intake while a team answers is configurable; Classic Board default
  allows it (`CQS-OD-017`).
- A turn ends by correct adjudication, incorrect adjudication, pass,
  timeout, or explicit host termination (`CQS-OD-018`); incorrect and
  timeout may score differently (`CQS-OD-019`).
- Timeout with a queued team: default promote with a fresh full timer
  (`CQS-OD-015`); with nobody queued: default return to the host
  (`CQS-OD-016`).
- A resolved team is normally locked out for the clue's remainder with a
  host restore override (`CQS-OD-020`); attempt limits default to one
  (`CQS-OD-021`).
- Host evented overrides: add time, restart, promote a different team,
  restore eligibility, cancel the active team, re-arm eligible teams
  (`CQS-OD-024`).

### 2.4 Timer-expiry decision popup (§10.2 direction)

When an active team's answer timer expires, the host may receive a
contextual popup: **Next queued team · Re-open buzzing · Question done ·
Add time · Mark incorrect**. A preset may replace the popup with a
configured safe transition, bounded by `CQS-OD-023` (reveal, adjudication,
scoring, and wager settlement remain explicit).

### 2.5 Timer visibility

Thinking and simultaneous timers are normally public; individual
answer-turn timer visibility is host- or preset-controlled (`CQS-OD-022`).

## 3. Public team-card state (§10.3 direction)

The architecture preserves a future path for projected team cards
expressing: ready · disarmed · buzzed early · temporarily locked out ·
exact queue position · active respondent · answer timer · passed · timed
out · incorrect · correct · response submitted · wager locked · score
delta · round winner · game winner. A brief "why the turn ended" moment
precedes the durable state (`CQS-OD-031`), and cards stay positionally
stable (`CQS-OD-033`, implemented rule).

**Permanently private:** answer selections before reveal, exact written
responses, wager amounts before reveal, raw timestamps, physical
controller identity, host-only notes, correctness before adjudication or
reveal. Queue position is order, never a reaction-time claim
(`CQS-RA2-PUBLIC-STATE-01`).

## 4. Final Wager — Slice 14 acceptance design and post-MVP packaging

Slice 14 (Final-wager round) is the current MVP's next planned slice and
**remains `Planned` and unstarted**. Decisions `CQS-OD-005`…`CQS-OD-008`
and `CQS-OD-011` are `current-mvp-planned`: they **clarify the acceptance
design of Slice 14's already-recorded deliverables** — eligibility, wager
validation, response capture, reveal sequencing, and tie handling — and
do **not** authorize, begin, or materially expand Slice 14 beyond those
deliverables. What stays post-MVP is the *packaging*: Board + Final as a
polished preset, a selector for eligibility profiles, and the broader
policy engine (`CQS-OPP-GAMEPLAY-POLICIES`). The mid-board hidden-wager
clue modifier (`CQS-OD-003`/`CQS-OD-004`) also remains
`post-mvp-priority` — Slice 14's record explicitly excludes it.

Acceptance design for the recorded Slice 14 deliverables:

- **Eligibility** (`CQS-OD-005`): the classic rule — a positive score
  required, as in broadcast Final Jeopardy (`CQS-RF-JEOPARDY-02`) — with
  the inclusive all-teams rule as the recorded host-level alternative;
  exposing these as selectable preset *profiles* is post-MVP packaging.
- **Wager validation** (`CQS-OD-006`): zero allowed; bounded by score for
  positive teams; a nonpositive team's default cap is the highest
  ordinary clue value; host-entered, private until reveal; score-bound
  validation rejects rather than clamps (existing engine convention).
- **Windows:** separate wager window and response window; locking on
  submission; explicit host correction before lock-cutoff, evented after.
- **Response capture** (`CQS-OD-007`): optional exact response text; an
  explicit no-response state distinct from a blank; adjudication works
  with or without captured text.
- **Reveal sequencing** (`CQS-OD-008`): default lowest pre-final score to
  highest, host-selectable alternate order; answer reveal then
  team-by-team adjudication (correct / incorrect / no-response).
- **Settlement:** one atomic, reversible settlement event per team (or a
  single atomic batch), auditable and undoable like every score change.
- **Tie handling** (`CQS-OD-011`): host chooses sudden death or permits a
  tied finish; game completion vs. tied-game override is an explicit
  host action.
- **Safety:** timer expiry performs only safe transitions; refresh and
  recovery restore wager state exactly (ADR-013 pattern); wagers and
  responses never reach `PublicState` before their reveal.

## 5. Configuration simplicity (§13 direction; `CQS-OD-081`)

- **Quick Start:** preset cards plus only format, active-team count,
  approximate duration, easy/balanced/challenging, timer style, and
  source/workbook.
- **Customize:** plain-language groups — Buzzing · Wrong answers · Timer
  behavior · Scoring · Round count · Humor level · Question mix.
- **Advanced:** lockout milliseconds, exact queue policy, clue-specific
  overrides, telemetry detail, retention, transcript policy, audio and
  animation controls, low-level timer transitions, diagnostics.

The normal setup screen never exposes every internal policy. Game-level
and round-level policies are normal; clue-level overrides exist only for
designated special clues (`CQS-OD-032`).

## 6. Format catalog classification (§18 direction)

Initial presets (`CQS-OD-001`) and the wider catalog. **No format below
is implemented**; "core mechanic" describes the plan. Controller
interaction assumes the bounded primary-buzz + four-ordinal contract
(`CQS-RA2-SECONDARY-01`). Dependencies "policies" =
`CQS-OPP-GAMEPLAY-POLICIES`; "authoring" =
`CQS-OPP-SPREADSHEET-LLM-AUTHORING`.

| Format | Activation | Core mechanic | Controller interaction | Host workload | Authoring needs | Dependencies | Accessibility concerns | Deferral reason / trigger |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Classic Board | `post-mvp-priority` (preset over implemented round) | Category board, buzz, adjudicate | Primary buzz | Moderate | Board workbook | Policies | Timer pressure | Preset layer absent; trigger: policies exist |
| Board + Final | `post-mvp-priority` | Classic Board + final wager round | Primary buzz | Moderate | Board + FINAL tab | Slice 14 round; policies | Wager privacy explanation | Same |
| Buzzer Sprint | `post-mvp-priority` | Rapid sequential prompts, first correct scores | Primary buzz | Low | Question list | `sequential-prompts` round; policies | Pace stress; needs no-penalty variant | Same |
| Team Choice | `post-mvp-priority` | Simultaneous A–D choice, modest speed bonus (`CQS-OD-009`) | Four ordinal buttons | Low | MC items + distractor rationale | Ordinal consumers; policies | Color-independent labels (A–D text) | Ordinal consumer unauthorized |
| Mixed Review | `post-mvp-priority` | Ordered rounds of differing types (compositional, `CQS-OD-001`) | Varies by round | Moderate | Multi-round workbook | ≥2 playable formats | Varies | Needs the formats it mixes |
| Funny Review | `post-mvp-priority` | Humor-profile content over existing formats (`CQS-OD-048`) | Varies | Moderate | Humor-profile authoring | Authoring | School-safe humor bounds | Authoring arc first |
| Tossup and Bonus | `parked` | Interruptible tossup + team bonus (quiz-bowl pattern, `CQS-RF-QUIZBOWL-01`) | Primary buzz mid-prompt | High (reading, adjudication) | Tossup/bonus sets with power marks | Policies (interruptible reading) | Reading pace; interrupt fairness | Manual trial first (`CQS-OPP-ADDITIONAL-FORMATS`) |
| Fastest Correct | `parked` | All answer, fastest correct earns bonus | Ordinal or buzz | Low | MC items | Policies | Speed anxiety (research: time pressure stress) | Same |
| Rapid Classification | `parked` | Sort items into named bins under time | Ordinal (bin = A–D) | Low | Classification sets | Ordinal consumers | Cognitive load | Same |
| Estimate and Wager | `parked` | Numeric estimates, closest-without-over betting (Wits & Wagers pattern, `CQS-RF-ESTIMATE-01`) | Host-recorded or ordinal ranges | High | Numeric items | Policies; host entry UX | Number entry without devices | Same |
| Connections and Sequences | `parked` | Find links / next-in-sequence (Only Connect pattern, `CQS-RF-CONNECT-01`) | Buzz + spoken | High | Connection sets | Policies | Abstraction difficulty spread | Same |
| Grouping Wall | `parked` | Sort 16 clues into 4 groups | Host-driven or ordinal | High | Wall sets | Policies; board UI | Visual density | Same |
| Ordering | `parked` | Put events/steps in order | Ordinal positions | Moderate | Ordered sets | Ordinal consumers | Sequence working-memory load | Same |
| Chain and Bank | `parked` | Chain of answers, bank before a miss (Weakest Link pattern, `CQS-RF-CHAIN-01`) | Buzz + spoken; bank action | Moderate | Question chains | Policies (pot/bank) | Elimination-vote excluded (classroom-inappropriate) | Same |
| Relay / Hot Potato | `parked` | Turn passes down team rosters | Buzz per seat | Moderate | Question lists | Policies | Turn anxiety; opt-out path | Same |
| Risk Ladder | `parked` | Choose difficulty tier for more points (Chase-offer pattern, `CQS-RF-CHASE-01`) | Ordinal tier choice | Moderate | Tiered items | Policies | Risk-choice framing | Same |
| Bluff Lab | `parked` | Teams submit plausible wrong answers; spot the truth (Fibbage pattern, `CQS-RF-JACKBOX-01`) | Host-assisted entry + ordinal vote | High | Truth + bluff scaffolds | Funny modes (`CQS-OPP-FUNNY-MODES`) | Host transcription load | Same |
| Caption Collision | `parked` | Funny captions, class vote | Host-assisted + ordinal vote | High | Image prompts | Funny modes; media | Humor safety | Same |
| Majority Report | `parked` | Predict the class's own poll answer (Poll Mine/Guesspionage pattern, `CQS-RF-JACKBOX-01`) | Ordinal | Moderate | Poll prompts | Policies; survey provenance | Conformity pressure | Same |
| Lab Accident Generator | `parked` | Absurd scenario prompts, host-adjudicated answers | Host-assisted | High | Scenario templates | Funny modes | Humor safety | Same |
| Wrong Answers Only | `parked` | Deliberately wrong answers, funniest wins | Host-assisted vote | High | Prompt sets | Funny modes | Grading-free framing | Same |
| Explain It Badly | `parked` | Bad explanations, class guesses the concept | Host-assisted | High | Concept lists | Funny modes | Same | Same |
| Science Court | `parked` | Argue claims, class verdict | Host-assisted | Very high | Claim/evidence sets | Funny modes | Debate equity | Same |
| Phrase Forge | `parked` | Construct phrases from fragments | Ordinal | Moderate | Fragment sets | Ordinal consumers | Reading load | Same |
| Survey Showdown | `post-mvp-priority` | Survey board (see §7) | Buzz face-off + spoken (default) or ordinal variant | High | SURVEY_ROUNDS/ANSWERS + provenance | `CQS-OPP-SURVEY-SHOWDOWN` | Spoken-answer equity | Register trigger |
| Survey finale | `parked` | Timed two-pass survey answers | Spoken + host entry | High | Survey sets | `CQS-OPP-SURVEY-FINALE` | Time pressure; isolation logistics | After Survey Board |

## 7. Survey Showdown (§19 direction)

Planned future format (`CQS-OD-083`…`CQS-OD-086`), Family-Feud-*inspired*
without imitating branding, audio, or styling:

- Survey prompt with **multiple hidden ranked answers** and answer values;
- **controller face-off** for board control; **Play or Pass**;
- spoken answers with **host adjudication** (default, `CQS-OD-084`),
  including alternate acceptable wording and duplicate-answer handling;
- **strikes** (bounded count), **steal opportunity**, **accumulated round
  pot** settled by round-pot scoring policy;
- an alternate **controller-choice variant** (ordinal selection among
  displayed candidates) for quieter classrooms;
- expressive team-card states within §10.3's public/private floor;
- a later, separately planned **timed survey finale** (`CQS-OD-086`).

**Provenance is mandatory** (`CQS-OD-085`): every survey board declares
`real survey` (retaining population, response count, collection date,
ranked responses, counts or normalized points, grouping rules, source),
`teacher-authored ranking`, or `synthetic / LLM-predicted`. Synthetic
results are never presented as collected survey data — on the projector or
anywhere else.

## 8. What the current implementation does (for contrast)

One playable round type (`category-board`) with manual arming, a full
ordered buzz queue, promotion after incorrect/pass, manual scoring presets
bound to tile values, a single public response timer, text/image prompts,
export, and recovery. Everything else in this document is future planning
under the activation states shown.
