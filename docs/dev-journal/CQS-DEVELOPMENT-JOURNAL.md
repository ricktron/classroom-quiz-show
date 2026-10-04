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


---

## 2026-10-04 — Q6 exposed why green automation is not the same as a real teacher path

### Objective

Use the pre-owner Q6 Court to decide whether the product was genuinely ready
for a natural owner playthrough, not merely whether the implementation and
automated suites were internally green.

The owner requirement sharpened during this work:

- Courts should be **ruthless**, not deferential to prior PASS claims;
- tests and Court evidence should follow the pathways a real teacher will
  actually take;
- error handling, reversibility, recovery, and failure paths are part of the
  user journey, not secondary engineering concerns;
- apparent smoothness should itself be treated as something to audit when it
  could result from helpers, fixtures, stale assumptions, or weak evidence
  transfer.

### Expected model

Before Q6, the repository had strong evidence:

- Q3 had a complete integrated game path;
- Q4 had branch/failure coverage;
- Q5 had Desktop/Electron lifecycle evidence;
- CI, Playwright, packaging, and other automated checks were green.

The working assumption was that the remaining pre-owner task would mainly be
evidence reconciliation and eligibility review.

### Observation

The independent Q6 Court disproved that assumption.

It found three ordinary-path failures across two repair cycles:

1. **G1 — ordinary round progression was missing.**
   The game engine could progress through rounds and Final, but the only controls
   available to do so were inside Advanced diagnostics.

2. **G2 — the real Display lifecycle status was false.**
   The real Host published a status that left the Display saying
   "Waiting for the first round." through active play and completion.

3. **G3 — general live Undo was not available on the ordinary Host path.**
   The engine supported canonical undo, but a teacher who made a non-score
   mistake such as marking the wrong team Incorrect had to enter Advanced
   diagnostics to reverse it.

The final RP-2 candidate repaired G3 with one ordinary Host Undo control backed
by the canonical undo planner, then re-proved the authentic Q4-A path with More
closed.

After RP-2 landed:

- Court A became **COMPLETE**;
- Court B became **RECOMMEND ELIGIBLE**;
- the new historian captured 31 ordinary-path browser frames against the landed
  RP-2 product identity;
- no new ordinary-path functional blocker was found during historian review.

### Escape / defect / proof gap

The most important lesson is that these were not obscure engine defects.

They were failures of **journey fidelity** and **evidence interpretation**.

#### Failure mode 1 — test helpers can accidentally create privileged paths

The Q3/Q4 path looked complete because helpers left UI state open that a normal
teacher would not have.

That made controls reachable in tests even though they were not discoverable in
the ordinary product posture.

This is a critical distinction:

> "The test can click it" is not evidence that "the teacher can reach it."

#### Failure mode 2 — fixtures can make false product state look correct

S05 visual fixtures injected a truthful-looking "Playing" status.

The real Host-to-Display flow did not.

The visual evidence therefore looked correct while the integrated product state
was wrong.

Fixture evidence is useful, but it cannot silently stand in for authentic state
propagation.

#### Failure mode 3 — evidence transfer can inherit accidental preconditions

HG-13 was previously treated as closed because Q4-A successfully used Undo.

Q6-RP-1 re-review showed that this success depended on an incidental condition:
the earlier helper had already left More open.

The Court therefore invalidated its own earlier evidence transfer.

That is a strong sign the review process is working, but it also shows why
transfer claims must include the interaction posture and user-reachable
preconditions, not only the final assertion.

#### Failure mode 4 — broad green automation can still miss user-path defects

Unit tests, component tests, E2E suites, Desktop tests, packaging, and CI can all
be correct within their own evidence classes while still missing:

- discoverability;
- ordinary navigation;
- error recovery;
- the exact control a teacher reaches for after a mistake;
- mismatches between fixture state and real state;
- incidental helper state;
- cross-surface truth.

The Court must therefore remain semantically independent from the test suite it
is evaluating.

### Why prior evidence missed it

The prior evidence was not worthless. Most of it was technically valid.

The problem was that some claims were broader than the evidence justified.

Specific causes:

1. **Fragment correctness exceeded journey correctness.**
   Individual reducers, commands, panels, persistence paths, and Display
   selectors worked, but the real composed path was not always ordinary.

2. **Helpers optimized for getting to the state under test.**
   That is often reasonable for regression testing, but dangerous when the same
   helper is later cited as proof of user-reachable behavior.

3. **Visual fixtures optimized for deterministic presentation.**
   They demonstrated rendering quality but hid an integration defect in the
   actual public status source.

4. **The earlier Q4 closure inspected outcome semantics more than interaction
   posture.**
   Undo worked, but only under a UI state a teacher should not need.

5. **Green CI naturally encourages confirmation bias.**
   Once a suite is mature and consistently green, it becomes easier to assume it
   proves the intended user claim rather than re-asking exactly what path it
   exercised.

### Repair / decision

The Q6 process adopted and demonstrated a stronger model:

- use the engine and state architecture already present;
- repair the ordinary teacher pathway rather than adding alternate engines or
  parallel state;
- make tests traverse the same controls a teacher should use;
- explicitly assert that Advanced diagnostics remains closed during ordinary
  gameplay;
- derive Display truth from authoritative game state;
- expose canonical undo through ordinary Host UI rather than inventing a second
  history mechanism;
- after each repair, audit the semantic sibling family instead of checking only
  the named defect;
- allow Court re-review to invalidate earlier evidence transfer when a hidden
  dependency is discovered.

### Verification

Q6 and its repair sequence were supported by:

- Q6 Court record:
  `docs/receipts/2026-10-04-cqs-q6-court-a-b-independent-review.md`
- RP-1 record:
  `docs/receipts/2026-10-04-cqs-q6-rp1-repair-and-court-a-rereview.md`
- RP-2 record:
  `docs/receipts/2026-10-04-cqs-q6-rp2-live-undo-and-court-a-b.md`
- historian milestone:
  `docs/design/history/2026-10-pre-owner-q6-rp2/`
- PR #133 — Q6 failing Court record
- PR #135 — G1/G2 repair
- PR #136 — G3 / HG-13 repair
- PR #138 — fresh pre-owner historian milestone

The important evidence progression was:

```text
green Q1-Q5
    ↓
Q6 Court rejects readiness (G1, G2)
    ↓
RP-1 repairs G1/G2
    ↓
Court re-review rejects readiness again (G3)
    ↓
RP-2 repairs G3
    ↓
Court A COMPLETE
    ↓
Court B RECOMMEND ELIGIBLE
    ↓
fresh historian on the repaired ordinary path
```

This progression is more informative than a simple sequence of green CI runs
because the review system repeatedly found reasons not to advance.

### Owner effort / friction

The owner did not have to discover G1, G2, or G3 during a natural classroom
playthrough.

That is a major success.

However, the process still required repeated owner authorization and manual
interpretation of long technical reports. Future implementations should aim to
preserve the same rigor while reducing:

- repeated prompt reconstruction;
- uncertainty over which evidence remains valid after repair;
- duplicated status prose;
- ambiguity over whether a Court actually tested an ordinary user pathway.

### Preventive controls

For future CQS work and candidate reusable process design:

#### 1. Courts must be adversarial by default

A Court should actively try to falsify the readiness claim.

It should not ask:

> "What evidence supports PASS?"

until after asking:

> "What realistic user behavior, failure, interruption, or hidden dependency
> would make this claim false?"

A green test suite is an input to the Court, not the Court verdict.

#### 2. Every user-path claim needs a path-fidelity check

For any ordinary-path assertion, record:

- starting posture;
- controls used;
- whether any hidden/advanced/debug surface was opened;
- whether helpers changed UI posture;
- whether state was injected directly;
- whether the same action is discoverable from the real user surface;
- whether recovery/error handling stays on the same ordinary path.

If a test reaches a state by a shortcut the user would not take, it may still be
a valid regression test but must not be cited as ordinary-path evidence.

#### 3. Error handling belongs inside the primary journey matrix

For each material workflow, include representative:

- wrong choice;
- incorrect adjudication;
- failed or malformed input;
- stale/late action;
- interruption;
- reload/recovery;
- undo or correction;
- cancellation/back-out where supported;
- terminal-state behavior.

Do not treat these only as isolated unit cases when the teacher must interact
with them through the product.

#### 4. Fixture evidence must declare what it bypasses

Any visual or E2E fixture that injects product state should state:

- which authoritative producer is bypassed;
- what integration claim therefore cannot be made;
- what separate authentic-path evidence covers that seam.

Fixture-driven rendering evidence must never silently inherit authentic-state
claims.

#### 5. Evidence transfer must include preconditions, not just outcomes

When transferring prior evidence to a later stage, verify:

- same relevant product semantics;
- same reachable user posture;
- same lifecycle ownership;
- same state source;
- same privacy boundary;
- no incidental helper condition was required.

If any of those differ or are unknown, classify the transfer as qualified or
invalid until re-proven.

#### 6. Repairs trigger sibling-path review

When one defect is found, ask what else shares:

- the same hidden control surface;
- the same state derivation;
- the same helper;
- the same fixture;
- the same persistence/recovery seam;
- the same lifecycle boundary.

Q6-RP-1 found G3 because the audit asked what other ordinary teacher jobs were
still trapped in diagnostics. That pattern should be standard.

#### 7. Apparent smoothness is itself an audit signal

A long run of green results may mean the product is mature.

It may also mean:

- tests are following the same assumptions;
- helpers are hiding awkward paths;
- fixtures are normalizing incorrect state;
- review is no longer independent;
- assertions have become too structural.

When qualification appears unusually smooth, deliberately run at least one
fresh-context adversarial review that tries to break the user journey rather
than confirm existing tests.

### Ruthless Court checklist

Before a Court recommends readiness, it should be able to answer **yes** to all
applicable questions:

1. Did we follow the path a real user would take from the real starting
   posture?
2. Did we avoid Advanced/debug/diagnostic controls unless the user journey
   explicitly calls for them?
3. Did we avoid direct state injection for claims about integrated behavior?
4. Did we test at least one realistic mistake or error path for each critical
   workflow?
5. Did we test recovery after interruption/reload where persistence matters?
6. Did we verify the visible UI state, not only underlying state transitions?
7. Did we verify Host/private versus Display/public boundaries after both
   success and failure?
8. Did we inspect helper side effects and inherited UI posture?
9. Did we challenge fixture assumptions against authentic product state?
10. Did we validate any transferred evidence against current preconditions?
11. Did we inspect semantic siblings after finding a defect?
12. Did an independent reviewer try to falsify the claim after the repair?
13. If the result was unexpectedly smooth, did we deliberately look for why?
14. Are remaining issues honestly classified as functional, usability/polish,
    physical-not-run, environmental, or evidence-strengthening?
15. Would we be comfortable letting a teacher discover the remaining issues
    naturally during Q7?

A "no" does not always mean product failure, but it must be explained before a
Court can recommend advancement.

### Process health assessment after Q6

Evidence that the process is working:

- Q6 rejected a green Q1-Q5 stack.
- RP-1 re-review found a new blocker instead of declaring victory.
- the Court corrected an earlier HG-13 transfer.
- physical evidence remained NOT RUN rather than being inferred.
- Court B stayed blocked until Court A was complete.
- the historian was rebuilt on the repaired ordinary path rather than reusing
  stale S05/MENUS evidence.
- the new historian preserved a visible non-blocking clipping concern instead
  of treating visual inspection as automatic PASS.

Evidence that still deserves skepticism:

- several implementation and review steps occurred in the same Claude execution
  lineage, which weakens reviewer independence;
- Sonar details were sometimes inaccessible and required indirect
  classification;
- some startup/status documentation required follow-up reconciliation after
  merges;
- the development journal lagged behind the richest Q6 lessons until this
  entry;
- browser historian evidence still does not establish physical projector,
  audio, screen-reader, Sony, or Windows runtime behavior.

These are not reasons to reject the current Court result. They are reasons to
make PRE-Q7 and Q7 fresh-context, evidence-bound reviews rather than ceremonial
continuations.

### Candidate reusable lessons

1. **Green tests are not user-path proof.**
2. **A helper can accidentally become a hidden product dependency.**
3. **Fixture truth is not integration truth.**
4. **Evidence transfer must preserve interaction preconditions.**
5. **Error recovery belongs in the user journey, not only in domain tests.**
6. **A repair is incomplete until its semantic siblings are challenged.**
7. **A strong Court must be willing to overturn its own prior closure.**
8. **Smooth qualification should trigger skepticism, not complacency.**
9. **The best owner playthrough is one where automation has already found the
   defects automation is capable of finding.**

### Evidence

- Q6 Court: PR #133, squash `448ae147…`
- historian provenance guard: PR #134, squash `08f39e17…`
- Q6-RP-1: PR #135, squash `b1392391…`
- Q6-RP-2: PR #136, squash `9410b629…`
- RP-2 reconciliation: PR #137, squash `df596f27…`
- fresh pre-owner historian: PR #138, squash `dc71823d…`
- Q6 Court receipt
- Q6-RP-1 receipt
- Q6-RP-2 receipt
- pre-owner historian receipt and archive
