# Court B run manifest and checkpoint ledger

Durable checkpoint ledger for a blinded Court B BLACK-BOX TEACHER RUN
([`COURT-B-BLACK-BOX-BRIEF.md`](COURT-B-BLACK-BOX-BRIEF.md)).

**Status:** run apparatus and protocol. This file is **not** an owner decision,
**not** eligibility, and **not** a recertification result. Rows are written as a
run proceeds; a row claims only what the named tester actually reported.

**Audience: run operator only. Do not hand this file, or a link to it, to a
blinded tester.** Nothing TESTER-FACING links here, deliberately — the
tester-facing brief must not reach it. The operator-only
[`COURTB-SEED-REACHABILITY-MATRIX.md`](COURTB-SEED-REACHABILITY-MATRIX.md) does
reference this file, which is intended: an operator needs both. An operator arrives here from the
campaign brief or from this directory. It states the population composition below, so a tester who
read it would acquire a prior on whether their own build is the clean one. A
tester receives only their opaque build code, the committed fixtures, and
[`COURT-B-BLACK-BOX-BRIEF.md`](COURT-B-BLACK-BOX-BRIEF.md) — which does not
link here.

## Why this file exists

A blinded Court B run is long, externally rate-limited, and interruptible. Two
failure modes have to be designed out:

1. **Lost work on interruption.** If progress lives only in a session's memory,
   an interrupted run restarts from zero, and a tester may be re-run against a
   build they already judged — which is no longer blind.
2. **Unfalsifiable completion.** "Court B passed" is only meaningful if every
   build in the expected population has a terminal report. Without a ledger
   fixed in advance, a short run can look complete.

So the population is declared **before** the run, every build gets a row, and
each row is written **immediately** when its state changes — not at the end.

## Protocol

| Rule | Value |
| --- | --- |
| Expected population | **14** = 1 clean + 13 seeded defective |
| Run precondition | a **simulated receiver must be supplied** — without one the run MUST NOT START (see below) |
| Maximum blinded tester concurrency | **2** |
| Preferred concurrency if service limits appear | **1** |
| Never | launch all builds together |
| On interruption | resume **only** incomplete builds; never re-run a `COMPLETE` row |
| Completion | Court B is **incomplete** unless all 14 DECLARED BUILDS have a terminal row. Re-declaring an `INVALID` build under a fresh code grows the ledger past 14 rows; what must be complete is the declared population, not the row count |

Terminal statuses are `COMPLETE` and `INVALID`. `NOT STARTED`, `RUNNING` and
`RATE-LIMITED` are non-terminal and must be resumed.

| Status | Meaning |
| --- | --- |
| `NOT STARTED` | row declared; no tester assigned yet |
| `RUNNING` | a tester is working this build now (counts against concurrency) |
| `COMPLETE` | tester returned a valid terminal report, frozen before unsealing |
| `INVALID` | run cannot be counted (build identity leaked or unverified, tester inspected implementation, harness fault, a `RUNNING` build whose tester was lost, or a tester report of **"not reached"** or **"not supplied"** for an action the brief asks for); needs a fresh build code AND a fresh tester |
| `RATE-LIMITED` | stopped by a service limit, not by a finding; resume later |

## The simulated receiver is a run precondition, not an option

One declared seed is only observable through the simulated receiver: **S8**
(buzzer truth). S10 also required it and has since been retired as
black-box-unsuitable, so S8 is now the sole seed dependency. The `CBJ-10` /
`CBJ-11` journeys every tester is asked to attempt still need the receiver too,
though those are journeys rather than seeds. The brief correctly tells a tester
with no receiver to record those rows as "not supplied" rather than as a route
they could not discover.

That makes the receiver a precondition of the RUN, not a property of individual
builds, and the consequence is deliberately the strict one:

- **A run set up without a simulated receiver MUST NOT START.** It cannot reach
  a valid completion, because the expected population above is fixed at 14 and
  one of its declared seeds (S8) would have no route a tester is permitted to
  walk, as would the `CBJ-10` / `CBJ-11` journeys asked of every tester.
- **Seeds are never dropped to accommodate a missing receiver.** The population
  is declared here and only here; shrinking it to 12 or 13 would make completion
  unreportable by this file's own Completion rule, and a run that cannot report
  completion is not a cheaper run — it is a void one.
- If a receiver genuinely cannot be supplied, that is a reason to defer Court B,
  and to say so, rather than to serve a population nobody can judge.

A tester who reports "not supplied" for an action on a run that WAS set up with a
receiver is reporting an apparatus fault, not a finding: that row is `INVALID`
and is re-declared under a fresh build code with a fresh tester.

### How the simulated receiver must be installed

The boundary is `navigator.hid`. In the Chromium used for these runs
`navigator.hid` is a **non-writable accessor**, so plain assignment
(`navigator.hid = fake`) fails *silently* — the property keeps its real value
and the product goes on reading the real boundary. That failure mode is what
made S8 and the `CBJ-10` / `CBJ-11` journeys unexercisable on the 2026-10-17
run, and it produced tester reports about dead handsets that were apparatus
artefacts rather than product behaviour.

The fake boundary must therefore be installed with `Object.defineProperty`
(configurable), and the installation must **fail loudly** — a run may not
proceed on the assumption that it worked.

Before a run starts, prove all five:

1. the simulator reports itself installed;
2. the product actually reads the simulated boundary;
3. the supported-receiver path reaches a connected / waiting state through
   ordinary teacher UI (`Connect buzzers` → "Receiver connected — waiting for
   buzzers.");
4. the real host WebHID cannot silently substitute for the fake;
5. **the receiver exposes at least three distinguishable handsets, at least two
   mappable to the SAME team and at least one to a DIFFERENT team through the
   ordinary mapping UI, and the product has OBSERVED every handset** — the
   mapping controls stay hidden until it has (see below).

Proof 5 is not pedantry. S8's route is "map two handsets to one team and a third
to another, then press the differently-mapped handset on an armed clue", and its
discriminator is **which team the host names as active**. A receiver exposing ONE
handset satisfies proofs 1–4, lets the run start legitimately, and then presents a
tester with a single buzzer that is trivially credited to its own team on BOTH the
clean and the seeded build — and because a receiver *was* supplied, the "not
supplied" disposition does not apply, so nothing flags the row. Prove the handsets
before a build is served.

**The mapping UI has an ordinary precondition.** In the compact Class Setup
surface, "Which buzzer is which team" is rendered `hidden` until at least one
handset has responded (`showTeamAssignments` turns on when the summary reaches
`controllers-need-team-setup`); the full Host panel always renders it. Once one
slot responds, ALL four slot selects render, including slots that never
responded — so "one responding" is enough for the UI but NOT enough for this
run. The operator requirement is stricter on purpose: press RED on every handset
the route needs, and read the host's count back ("3 buzzers responding" with
three, "4 buzzers responding" with four) before assigning. An operator whose
harness assigns slots before any handset has responded will find the selects
present, enabled and nevertheless not interactable — which is an apparatus fault,
not a product defect, and not evidence about S8. Note also that once the mapping
saves, the summary becomes `sony-buzz-ready` and the block hides again in Class
Setup, so re-reading the assignments there needs Advanced diagnostics.

If the simulator is **external run tooling** rather than a repository file, the
run receipt must record its exact procedure, its script version or hash, the
Chromium behaviour it depends on, and the loud-failure check. It must not be
left as tribal knowledge.

Simulation remains simulation. No Sony/Namtai physical claim may be inferred
from it (brief rule 6).

## Blinding rules the ledger has to protect

- **Build identity must be stripped at BUILD TIME, not merely withheld.** This
  is the one rule that does not hold by default, so it is a procedure rather
  than an assertion.

  An ordinary `npm run build` bakes the git SHA into the renderer bundle
  (`vite.config.ts` defines `__CQS_SOURCE_SHA__`) and the Host surfaces it:
  `WbuzzSignalChainPanel` renders `sourceSha: …` inside Host → Advanced
  diagnostics. Measured on `cbfe8a8`: the exact 40-character head SHA appears
  verbatim in `dist/assets/index-*.js`. A tester who opens Advanced diagnostics
  — which brief rule 2 forbids only *to make a route work*, so merely looking
  breaks no rule they were given — can read their own build's identity. Two
  builds showing the same SHA would also reveal a repeat run to the same
  tester, which is the de-blinding failure-mode 1 exists to prevent.

  Therefore every blinded build MUST be produced with the source identity
  replaced by its own opaque build code:

  ```bash
  CQS_SOURCE_SHA="<opaque build code>" npm run build
  ```

  `vite.config.ts` honours an explicit `CQS_SOURCE_SHA` ahead of git, so the
  bundle then carries the build code and nothing else. Verified: with the
  variable set, the real SHA is absent from the bundle and the build code is
  present.

  **Verification is part of the build step, not an afterthought.** Before a
  build is served to a tester, confirm the real SHA is gone:

  ```bash
  grep -c "<real head sha>" dist/assets/index-*.js   # must be 0
  ```

  A build served without that check is `INVALID`, because the operator cannot
  afterwards know whether identity reached the tester.

- **What a tester receives:** only the opaque build code, the committed
  fixtures, and the brief. Never the seed, never the real SHA, never whether
  their build is the clean one, and never this file.
- **The mapping is sealed before any tester starts.** Record the mapping file's
  sha256 here; do not record the mapping contents in this file.
- **Attribution is frozen before unsealing.** Blind attributions are written to
  a separate pre-unseal file, hashed, and only then is the mapping read.
- **Simulated buzzers are not physical evidence** (brief rule 6). No physical
  Sony/Namtai claim may be entered in this ledger.

## Declared seed population

The 13 seeded defects are declared HERE, before a run, so that "all 14 rows are
terminal" is checkable against a population that can be reconstructed later. Ten are retained from the
declared population; three replace seeds retired as black-box-unsuitable (see
below) and are drawn from the existing Court A register rather than invented.

**Every seed below carries BOTH required gates** — `TEST-LAYER LIVE` and
`INSTRUCTION-LAYER DISCRIMINATING` — recorded per seed in
[`COURTB-SEED-REACHABILITY-MATRIX.md`](COURTB-SEED-REACHABILITY-MATRIX.md). A
seed that is live but whose tester wording does not separate clean from seeded
is **not** Court-B eligible.

These are the Court B seeds. They are NOT the same set as the mutations used to
qualify the journey apparatus itself — do not conflate the two.

| Seed | Defect | Class |
| --- | --- | --- |
| S1 | award **and** deduction credit/debit the first team instead of the scored one | scoring truth |
| S2 | Final answer published at responses-locked, before explicit reveal | projector privacy |
| S3 | Display presence lie after Host reload | presence truth |
| S4 | typed name not reported until blur — first Start activation lost | setup |
| S5 | Final Undo buried by response-window expiry | Undo integrity |
| S6 | tied explicit end names the first leader Winner | completion |
| S7 | Reset this class session leaks the prior class's ledger | session boundary |
| S8 | a pressed handset is credited to the first buzzer's team, not its own | buzzer truth |
| S9 | board response-timer expiry becomes reversible | Undo integrity |
| S12 | Library Delete removes the stored-first game, not the chosen one | data safety |
| M26 | every fresh mapped keyboard buzz press is ignored | local input |
| M04 | authoring Save reports success but the authored title is not durably written | authoring durability |
| M01 | Home `Resume class` stays enabled but is inert | resume |

S5 and S9 require a two-file mutation: the event types pin `reversible: false`,
so the type must be widened for the seed to compile at all. A seed that does not
compile is `INVALID`, never a finding.

### Retired as BLACK-BOX-UNSUITABLE (history — never valid black-box seeds)

Three originally declared seeds were retired after an instruction-level
clean-vs-seeded gate showed a blinded teacher following the brief could not
distinguish clean from seeded. They were **live mutations** — they compiled and
failed their own detectors — which is exactly why liveness alone is not
sufficient to declare a seed.

| Retired seed | Defect | Why unsuitable as a black-box route | Replaced by |
| --- | --- | --- | --- |
| S10 | WebHID accepts any Sony device as the receiver | reachable only through the simulated receiver, and the discriminating state is a device-identity decision a teacher cannot observe directly | M26 (needs no apparatus at all) |
| S11 | projector paints the hosted build asset before pack media hydrate | on the 2026-10-17 run the fixtures carried no image clue, so no tester could walk the route and every one of them reported it not applicable. An image-clue pack has since been committed and `CBJ-08` is live, so the route now EXISTS — but S11 has never been put through the instruction-level gate, and an untested route is not an eligible seed. Retired on that ground, not on reachability | M04 (discriminator is a string the tester chooses) |
| S13 | startup action loss on host boot | requires acting inside an unverifiable boot window; a tester who was late cannot know it, and "not reached" is not evidence of health | M01 (persistent, objectively confirmable precondition, no timing window) |

These rows are preserved as apparatus history. They are **not** to be described
as valid black-box seeds in any later record, and they must not be re-declared
into an active population without passing the instruction-level gate first.

## Run header

Filled in when a run starts. One header per run; a new run appends a new header
and a new table rather than overwriting history.

| Field | Value |
| --- | --- |
| Run id | *(not started)* |
| Bound baseline SHA | *(not started)* |
| Mapping sealed at | *(not started)* |
| Mapping sha256 | *(not started)* |
| Pre-unseal attribution sha256 | *(not started)* |
| Concurrency used | *(not started)* |

## Build ledger

One row per build. `Build` is the opaque code a tester is given. `Seed` stays
blank until the mapping is unsealed.

| Build | Tester | Mapping hash | Started | Completed | Status | Teardown verified | Findings | Attribution | Seed (post-unseal) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| *(none declared)* | — | — | — | — | `NOT STARTED` | — | — | — | — |

`Teardown verified` records that this build's run-owned browser session and any
server it alone needed were released and independently confirmed gone
(see [`PRE-OWNER-FUNCTIONAL-QUALIFICATION.md`](PRE-OWNER-FUNCTIONAL-QUALIFICATION.md)
§9.1.1). A row is not terminal until it is filled, so the step is auditable
after the run rather than taken on trust.

## Resume procedure

1. Read this file first; it is the authority on what has already been run.
   Re-check the run precondition before resuming: if the setup no longer has a
   simulated receiver, the run may NOT be resumed, for the same reason it could
   not have started.
2. Count rows by status. Non-terminal rows are the remaining work.
3. Start at most 2 (preferably 1 under service limits) non-terminal builds.
4. Write the row to `RUNNING` **before** the tester begins.
5. On a returned report: freeze the report, then write the row terminal.
6. If a service limit stops a build mid-run, write `RATE-LIMITED` with what was
   observed so far, and report `COURT B: INCOMPLETE — RATE LIMIT` rather than
   declaring a pass. Resuming the SAME tester on a `RATE-LIMITED` build is
   correct: they were interrupted, not compromised.
7. A `RUNNING` row whose tester was LOST (crashed, terminated, unreachable) is
   a different case and must not simply be restarted. That tester has already
   seen part of the build, so re-running them is no longer blind, and their
   partial observations cannot be audited. Write the row `INVALID`, then
   re-declare the same seed under a FRESH build code with a FRESH tester. This
   is a resume path that costs a row rather than recovering it; the `INVALID`
   cause for a "not reached" or "not supplied" report is the other.
