# Sessions, Analytics, Assessment, and Participation

- **Document id:** `CQS-PLAN-INSIGHT-PARTICIPATION`
- **Slice:** `CQS-PLAN-S01` (planning-only) · **Date:** 2026-08-03
- **Status:** Explanatory planning view for `CQS-ARC-INSIGHT` and
  `CQS-ARC-PARTICIPATION` — **authorizes no implementation**

Canonical decisions:
[`../decisions/EXPANDED-VISION-OWNER-DECISIONS.md`](../decisions/EXPANDED-VISION-OWNER-DECISIONS.md)
(`CQS-OD-035`…`CQS-OD-038`, `CQS-OD-053`…`CQS-OD-056`,
`CQS-OD-058`…`CQS-OD-066`, `CQS-OD-071`); architecture lineage: clauses
`CQS-RA2-TELEMETRY-01`, `CQS-RA2-ARCHIVE-01`, `CQS-RA2-QUESTION-ID-01`;
deferral dossiers: the `CQS-OPP-HISTORICAL-ARCHIVE` through
`CQS-OPP-ASSESSMENT-IMPORT` entries of
[`POST-MVP-OPPORTUNITY-AND-TRIGGER-REGISTER.md`](POST-MVP-OPPORTUNITY-AND-TRIGGER-REGISTER.md).

None of this exists today. The current implementation persists an active
session for recovery only (ADR-013) and projects a live scoreboard. MVP
**Slices 15–16** (unstarted) own the session-summary contract and the
completed-summary ledger / compatible reporting seed; the full archive,
telemetry, and assessment promotion remain post-MVP for this arc.

## 1. Two separated history layers (§10.8; `CQS-RA2-TELEMETRY-01`)

**Authoritative event history** — the deterministic, replayable source of
gameplay truth (exists today, ADR-002).

**Observational telemetry journal** — future, opt-in input-edge evidence:
accepted presses; early presses; presses while disarmed; presses during
lockout; repeated logical button edges; A–D selections; host actions;
timer-popup choices; connection and mapping diagnostics.

Binding rules: telemetry never alters authoritative replay, scoring, or
undo; polling frames and repeated held-button samples are never stored as
separate meaningful presses; detailed telemetry is **opt-in**
(`CQS-OD-035`), never mandatory.

## 2. Completed-game archive (§15.1; `CQS-OD-036`, `CQS-OD-037`)

The post-MVP plan proposes retaining per session: session id; game id and
revision; ruleset or preset; active teams; authoritative event history;
optional telemetry; final score and ranking; game duration; input
profile; completion state; summary; creation and completion times.
Retention is configurable and exportable, defaulting to
retention-until-deletion; private response and wager text uses
game-configurable retention. Archives are host-private and distinct from
the recovery store (`CQS-RA2-ARCHIVE-01`).

## 3. Question analytics (§15.2; `CQS-OD-038`, `CQS-OD-045`)

Planned per-question analytics: times played; sessions and sections;
percentage with any buzz; observed first-buzz latency; early-buzz
frequency; queue depth; attempts; correct/incorrect/pass/timeout/
no-response rates; answer duration; score effect; host overrides;
accepted alternates; ambiguity flags; performance by format and ruleset.

Quality is never reduced to one simplistic score. Possible analytic
labels: fast and highly accurate; fast but misleading; slow but
productive; difficult and engaging; low engagement; likely too easy;
likely ambiguous; strong discriminator; high early-buzz trap.

**Analytics language (§10.9, binding).** Use *observed buzz latency*,
*first accepted buzz*, *queue depth*, *early-buzz frequency*, *response
duration*. Never claim scientifically precise human reaction time from
browser or controller timing — event-log sequence is the authority and
timestamps are evidence (ADR-008 §13, carried forward). Classical item
statistics need far larger samples than a class provides for stable
interpretation (research finding `CQS-RF-ITEM-01`) — labels stay
suggestive, not psychometric.

## 4. Transcript workflow (§15.3; `CQS-OD-053`, `CQS-OD-054`, `CQS-OD-061`, `CQS-OD-062`)

External recording and transcript import come first; native recording
remains `parked` pending privacy, permission, storage, and retention
work (`CQS-OPP-NATIVE-RECORDING`). Recording practice must follow school
policy and applicable law — classroom recordings can constitute education
records, and audio-consent rules vary by state (research findings
`CQS-RF-PRIVACY-01`).

The event timeline aligns transcript segments to: clue reveal; readiness
period; accepted buzz; spoken answer; host clarification; adjudication;
answer reveal; discussion; transition. Transcript data is **supporting
evidence, not authoritative gameplay truth**. Team identity is the
default transcript identity; optional teacher-managed speaker labels may
exist without biometric identification (`CQS-OD-054`). Optional host
markers: good discussion; ambiguous answer; misconception; funny moment;
revisit later. Retention and deletion are configurable, including
extract-insights-then-delete (`CQS-OD-062`).

## 5. Gameplay-to-assessment lifecycle (§10.10, §15.4)

```
LLM-generated draft
  → teacher-approved game clue
  → played question revision
  → gameplay and transcript evidence
  → teacher revision
  → assessment candidate
  → approved test adaptation
  → aggregate test-item analysis
```

Item families connect game clue revisions, practice adaptations,
multiple-choice adaptations, and test item revisions (`CQS-OD-058`).
Possible test evidence: percentage correct; distractor selections;
omission rate; item discrimination when sample size permits; class or
section comparisons; revision history.

CQS **recommends** assessment candidates via configurable thresholds; the
**teacher explicitly promotes** them, and may promote anything manually
(`CQS-OD-055`, `CQS-OD-065`).

**Hard rule:** never infer that a student mastered a concept because
their team answered correctly. Team evidence is team evidence
(`CQS-OD-060` keeps roster linkage parked and distinct).

## 6. GCS boundary (§15.5) — decision 66 remains unresolved

`CQS-OD-066` is **unresolved**. The recorded recommendation — CQS owns
gameplay sessions, question-bank evidence, and game analytics; GCS owns
curriculum and formal assessment records; a future integration may
exchange stable learning-target and item-family identifiers — is a
recommendation only, not accepted owner direction. The accepted adjacent
posture is `CQS-OD-059`: individual assessment records stay in GCS or
another assessment system; CQS receives aggregate item statistics.

## 7. Student participation and credit (§16; `CQS-OD-056`, `CQS-OD-071`)

Preserved roles: **Player · Author · Reviewer · Analyst · Adapter ·
Producer**. Possible contribution routes: playing; writing sourced clues;
writing answer explanations; producing distractors; identifying
ambiguity; reviewing source evidence; analyzing transcripts; adapting a
clue into an assessment item; helping operate or produce a game;
reflecting on anonymous class-level analytics.

A future Quiz Show Passport / Season Card / Participation Credential
(`parked`, `CQS-OPP-PARTICIPATION-PASSPORT`) may require marks across
multiple contribution categories rather than a count of game
appearances. **A competitive pathway must have an equivalent
noncompetitive pathway** (`CQS-OD-056`); winning or fast buzzing is never
the only credit route. Grading policy is research- and
school-policy-sensitive: the evidence base shows competitive quiz play
can boost engagement while stressing some students (research findings
`CQS-RF-KAHOOT-01`, `CQS-RF-COMPETITION-01`), which is exactly why
noncompetitive routes are mandatory.
