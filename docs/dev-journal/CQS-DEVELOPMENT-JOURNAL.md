# Classroom Quiz Show — Development Journal

**Purpose:** preserve the longitudinal story of how CQS moved toward a
teacher-usable REAL MVP, especially the decisions, escapes, review findings,
owner friction, and reusable product-development lessons that are easy to lose
when only code/receipts remain.

**Authority:** reflective / historical. This journal never overrides code,
tests, `docs/STATUS.md`, the Product Contract, ADRs, current plans, or current
handoff.

---

## 2026-10-02 — Journal established after pre-owner Q3

### Why this exists

The owner explicitly identified the path to MVP as unnecessarily painful and
asked that the pain be put to productive use. The core problem was not simply
that defects existed. It was that important product/qualification lessons were
being discovered **late**, across repeated prompt → implementation → review →
repair loops, while the owner had to retain too much process context manually.

This journal begins with a retrospective of Q0–Q3 and becomes a standing
development requirement for the remaining Q4–Q7 path.

### Process observation

CQS had extensive receipts, ADRs, plans, tests, and status records but no single
surface answering:

- What surprised us?
- What cost the owner unnecessary effort?
- Why did prior evidence miss the problem?
- Which discovery should become a default rule next time?

The repository was strong at preserving **implementation truth** and
**verification evidence**, but weak at preserving **development learning**.

### Owner-friction signal

The owner described the experience as "not fun" and wants future products
heading to MVP to avoid this extra legwork.

That is treated as a process-design requirement, not incidental sentiment:
future product work should front-load the qualification structure that CQS had
to discover late.

---

## Retrospective — historical roadmap complete did not equal product MVP

### Observation

The original 23-slice roadmap completed substantial architecture and feature
work, yet the product still required a separate REAL MVP program before the
owner could reasonably perform a natural teacher playthrough.

### What this exposed

A roadmap can be internally complete while the **teacher journey is still not
qualified as a product**.

Component/slice completion and product readiness are different claims.

### Owner cost

The owner experienced a long tail of additional work after a nominally complete
roadmap. That creates understandable frustration because the visible milestone
("roadmap complete") can feel like it should have meant "nearly ready to use."

### Candidate reusable lesson

Define MVP acceptance from the **complete user journey** at the beginning, not
from the number of implementation slices.

Before building a future product surface, write the end-to-end acceptance path
in user language and maintain explicit evidence for every meaningful transition.

---

## Q0 — Qualification contract

**Primary artifact:** `docs/qualification/PRE-OWNER-FUNCTIONAL-QUALIFICATION.md`

### Objective

Create a durable pre-owner qualification system so the owner would not be used
as the first detector of ordinary functional defects.

### What happened

The contract itself required multiple review/repair passes before it expressed
the intended gates precisely. Important corrections included:

- functional blockers cannot be waived into owner playthrough;
- PRE-Q7 is a DevPM eligibility **verdict**, not another numbered Q-stage;
- Q7 is the owner playthrough, not the mechanism that decides eligibility;
- evidence classes must remain distinct;
- candidate, reviewed-head, squash/main, and transferred evidence claims must be
  worded precisely.

### Why this mattered

Without a precise qualification contract, downstream green tests could still
produce ambiguous completion claims or route unresolved functional problems to
the owner.

### Process learning

The qualification model should have existed **before** the late MVP push.

A reusable future product should begin with:

1. user-journey matrix;
2. semantic control proof;
3. contextual repair/return proof;
4. golden path;
5. branch/failure matrix;
6. integration/platform qualification;
7. adversarial review;
8. owner eligibility gate;
9. owner usability playthrough.

### Owner-friction reduction

Future projects should inherit this structure from a template instead of making
the owner negotiate the meaning of "ready for playthrough" while the product is
already mature.

---

## Q1 — Scenario-D escape hardening

**Merged main:** `9d8246e9811eec19a34a9f8d44b2287b8635a741` (PR #123)

### Objective

Repair known pre-owner escapes around buzzer proof, contextual team-count repair,
and Names/session behavior.

### What surprised us

A control being present, focused, or navigated to was not proof that the teacher
action produced its promised effect.

Likewise, a contextual repair was not complete merely because the repair screen
worked. The teacher had to be returned to the workflow that requested the
repair.

### Important discoveries

- "Check buzzers" needed teacher-visible simulated press/response evidence.
- Fix-team-count needed a direct, state-safe return to Class Setup for the
  disposable-session case.
- Meaningful Sessions had to fail closed rather than be silently discarded.
- A roster-size change required explicit replacement semantics while preserving
  names appropriately.

### Reusable lesson

Every teacher-facing control should be specified as:

`BEFORE STATE → TEACHER INTENT → ACTION → OBSERVABLE EFFECT → CONTINUATION/RETURN`

A postcondition that was already true before the action proves nothing.

For contextual repair, **return is part of correctness**.

### Owner-friction reduction

Future product specs should capture this five-part interaction contract before UI
implementation. That prevents the owner from later having to explain that
"opening the right place" is not the same as "doing the job."

---

## Q2 — MENUS workflow functional qualification

**Merged main:** `2dc918f934836c3fa6a0f4d554f4757f4668c691` (PR #125)

### Objective

Prove ordinary early teacher journeys across Home, library, authoring, import,
Class Setup, Start, Back, Resume, and Change Game.

### What worked

The teacher-journey matrix was valuable because it made proof holes visible as
rows rather than relying on a large suite count.

Q2 also established that existing fragment tests should be **retained when
strong** rather than rewritten merely to make new work look comprehensive.

### Important discovery

The spreadsheet path had strong underlying pieces but lacked one authentic
composition proof from the intended Home surface through template use/import to
a playable Game and Class Setup.

### Reusable lesson

A large test suite can still have a composition gap.

For each important teacher journey, ask:

> Do we have one causal proof that begins where the teacher begins and ends where
> the teacher expects to arrive?

Do not infer composition from separately green fragments.

### Process learning

Disposition vocabularies matter. `RETAIN / STRENGTHEN / REPLACE / NEW` made
missing evidence explicit and prevented "we probably cover that" reasoning.

### Owner-friction reduction

Future products should create the journey/evidence matrix near the start of UI
work, not after the UI is already broad.

---

## Q3 — Core gameplay golden path

**Reviewed PR tip:** `cf207cac7dd722a903f901cd885e35583439ed02`  
**Squash/main:** `85bb951ead3ea7ed99a7f404f60bbebcb0d68cb7` (PR #127)

### Objective

Prove one actual complete game as a causal teacher journey:

Home → Class Setup → Start → board → timer/arm → buzz → adjudication → scoring
→ Final → completion → summary, with a live sanitized Display.

### Major escape discovered: Session-name semantics

The first integrated game initially exposed an identity split:

- the teacher selected Session names in Class Setup;
- Display used those Session names;
- several Host gameplay surfaces still showed authored reusable Game names.

Fragment tests had individually passed because none composed Class Setup naming
through the full gameplay surface family.

### Repair

Host local input, scoring, gamepad/Sony copy, and Final now use Session-selected
display names with authored names as fallback, while stable team identity remains
the existing team id.

### Second escape: "adjudication" was not actually adjudication

The first golden-path helper revealed the answer and awarded points but did not
use the real `Mark correct` response-resolution control.

The repaired path now proves:

buzz → real `lih-correct` → public Correct outcome → separate score award.

This preserved the intentional distinction between response adjudication and
score adjustment.

### Independent-review save: durable Summary V1

An initial repair propagated Session names into persisted Session Summary V1.
Independent review caught the downstream consequence: ADR-016 compatible
cross-session reporting groups teams by stable authored team id. Persisting
class-specific Session names in the existing `teamName` field could have caused
one multi-session rollup to acquire an arbitrary Session label.

Final design:

- durable Summary V1 retains authored/stable team names;
- live current-session Host summary overlays Session-selected names only at the
  presentation layer;
- saved ledger/reporting semantics remain stable.

### Why this is a high-value lesson

This is a concrete example of two different truths that look similar in UI:

- **live classroom presentation truth**;
- **durable cross-session reporting truth**.

A repair that is correct for one can corrupt the other.

### Reusable lessons

1. Add an integrated journey before asking the owner to test.
2. When a composed journey finds one semantic mismatch, inspect the whole
   semantic family.
3. Review durable-data consequences separately from live UI consequences.
4. A green repaired head still needs independent semantic review.
5. Do not weaken a test to accept two inconsistent truths just because both are
   currently observable.

### Owner-friction reduction

The Q3 defects were exactly the kind the owner should **not** have been asked to
discover during a natural classroom playthrough. The Q0–Q6 gate is therefore
doing useful work even when it creates additional engineering cycles.

The goal is to make those cycles cheaper and earlier on the next product.

---

## Q4 — Gameplay branch / failure qualification

**Date:** 2026-10-02
**Authorization:** `AUTHORIZE-CQS-PRE-OWNER-Q4-GAMEPLAY-BRANCH-FAILURE-MATRIX-1`
**PR:** #129
**Qualification proof head:** `541718e1ad2788265678bb8178d043781718194a`

### Objective

Qualify material gameplay branches, recovery, and failure behavior off the
landed Q3 golden spine without turning Q4 into a second golden-path suite.

### Expected model

The existing domain suites already strongly covered queue semantics, undo,
timers, stale callbacks, persistence, Final recovery, summary privacy, and
Host/Display synchronization. Q4 should therefore need only a small amount of
authentic started-Session composition proof unless that composition exposed a
real product defect.

### Observation

A three-scenario authentic-session pack was enough to cover the material Q4
families:

1. incorrect claim → queue promotion → undo → explicit Resume → Host/Display
   reconvergence and privacy → continued adjudication;
2. response-timer reset / clue close → stale expiry rejected on a real started
   Session;
3. mid-Final explicit Resume → incorrect settlement → tied-Final branch →
   explicit completion with Host-only Session summary.

### Escape / defect / proof gap

HG-13 had previously relied on persistence/recovery fragments rather than one
composed mid-game proof. Q4 closed that proof gap.

No functional product defect was exposed by the new composition.

### Why prior evidence missed it

The underlying invariants were already well covered, but they lived in separate
domain suites. Q3 deliberately proved the golden spine, not off-spine recovery
and divergence. HG-13 therefore remained a composition gap rather than a known
broken behavior.

### Repair / decision

No product-code repair was required. Existing Game/Session, event/replay,
persistence, PublicState, privacy, scoring, Final, and summary contracts were
preserved unchanged.

The Q4 decision was to add one bounded composition pack and retain the stronger
domain suites instead of cloning their permutations into a large new matrix.

### Verification

At qualification proof head `541718e1…`, PR #129 CI passed lint, typecheck,
unit tests, production build, and the full Playwright e2e suite against the
production build served by `vite preview`.

The ChatGPT execution environment could not check out the repository locally,
so the literal local wrappers `git diff --check`, `npm run verify`, and
`npm run verify:all` were not run and are not claimed. The PR CI command set
covers the substantive lint/typecheck/unit/build/e2e components of
`verify:all`.

### Owner effort / friction

None. The owner did not have to perform a manual playthrough or discover a Q4
defect. That is the intended purpose of the pre-owner qualification ladder.

### Preventive control

After a golden-path stage, build a small branch/failure composition matrix from
the existing invariant suites. Add only the cross-lifecycle combinations that
fragment tests cannot prove, especially recovery, undo/replay, stale async
effects, public/private reconvergence, and terminal-state divergence.

### Candidate reusable lesson

**Branch/failure qualification should compose invariants, not duplicate their
permutations.** A few authentic-session tests can prove the dangerous seams while
the mature domain suites remain the detailed regression authority.

### Evidence

- PR #129
- qualification proof head `541718e1ad2788265678bb8178d043781718194a`
- matrix row HG-13
- `tests/e2e/menus-q4-gameplay-branch-failure-matrix.spec.ts`
- retained suites: `persistence-recovery`, `buzz-in`, `timers-arming`,
  `final-wager`, `sync`, `session-summary`
- no new receipt created solely for journaling

---

## Standing entry template — Q4 onward

For each meaningful lane/repair:

### Objective
What user/product outcome were we trying to establish?

### Expected model
What did we believe was already true?

### Observation
What actually happened?

### Escape / defect / proof gap
What failed, or what could not honestly be proven?

### Why prior evidence missed it
Fragment coverage? Wrong evidence class? Missing integration? Stale assumption?
Ambiguous contract? No adversarial review?

### Repair / decision
What changed and which invariant owns the answer?

### Verification
Which evidence actually establishes the repaired claim?

### Owner effort / friction
What did the owner have to do that could be eliminated next time?

### Preventive control
What template, gate, test, automation, doctrine, or workflow would prevent or
detect this earlier?

### Candidate reusable lesson
What may generalize beyond CQS?

### Evidence
PR / SHA / ADR / matrix row / receipt links or identifiers.

---

## Future synthesis checkpoint

After Q7 and post-playthrough polish, synthesize this journal into:

- a reusable **Product-to-MVP Qualification Template**;
- a **Teacher/Product Surface Design Checklist**;
- a generic **Journey/Evidence Matrix** template;
- a **Pre-Owner Eligibility Gate** template;
- a **Development Journal** template;
- a list of anti-patterns and avoidable owner burdens.

Do not promote these candidates into generic organizational canon merely because
they worked once. Promote repeated, evidence-backed lessons deliberately.


---

## 2026-10-04 — Historian archive commands needed executable provenance guards

### Objective

Repair the visual-historian capture workflow after Q6 showed that the S05 and
MENUS archive-specific capture specs had drifted relative to current main.

### Expected model

The historian workflow already declared merged milestone archives immutable, so
the old package commands were assumed to be harmless historical regeneration
entrypoints.

### Observation

The commands still attempted to run old selectors against current product code.
They failed on current main, even though the correct historian behavior is not
to run those archive-specific specs there at all.

### Escape / defect / proof gap

Documentation protected the old PNGs conceptually, but executable tooling did
not enforce the provenance boundary.

### Why prior evidence missed it

The capture specs are skip-by-default and outside ordinary CI mutation paths.
They therefore aged quietly until Q6 deliberately attempted current rendered
capture work.

### Repair / decision

Current code now fail-closes the old package commands with the archive's exact
bound implementation SHA, and the current-main copies of the legacy capture
specs are disabled. Historical checkouts retain their original executable
capture harnesses.

A new pre-owner archive will get a new capture target only after its exact
post-repair implementation SHA is frozen.

### Verification

Exact-head CI is required for the package/test changes. Local repository
wrappers were not available in the ChatGPT execution environment and are not
claimed.

### Owner effort / friction

Without this repair, a future maintainer or owner could spend time debugging
stale selectors when the actual error was using a historical capture harness
against the wrong product identity.

### Preventive control

Treat immutable evidence provenance as an executable invariant: old milestone
capture commands on later code should fail with the bound SHA and recovery
instruction rather than attempting regeneration.

### Candidate reusable lesson

**Immutable evidence needs executable provenance guards.** Documentation saying
"do not regenerate this from later code" is weaker than tooling that refuses to
do so and explains the correct historical checkout.

### Evidence

- authorization `AUTHORIZE-CQS-PRE-OWNER-HISTORIAN-CAPTURE-REFRESH-1`
- receipt `docs/receipts/2026-10-04-cqs-pre-owner-historian-capture-refresh.md`
- `scripts/historian-archive-guard.mjs`
- S05 implementation SHA `4368cc9e…`
- MENUS implementation SHA `1404b517…`
