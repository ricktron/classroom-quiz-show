# Court B run manifest and checkpoint ledger

Durable checkpoint ledger for a blinded Court B BLACK-BOX TEACHER RUN
([`COURT-B-BLACK-BOX-BRIEF.md`](COURT-B-BLACK-BOX-BRIEF.md)).

**Status:** run apparatus and protocol. This file is **not** an owner decision,
**not** eligibility, and **not** a recertification result. Rows are written as a
run proceeds; a row claims only what the named tester actually reported.

**Audience: run operator only. Do not hand this file, or a link to it, to a
blinded tester.** Nothing in the repository links here, deliberately — the
tester-facing brief must not reach it. An operator arrives here from the
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
| Maximum blinded tester concurrency | **2** |
| Preferred concurrency if service limits appear | **1** |
| Never | launch all builds together |
| On interruption | resume **only** incomplete builds; never re-run a `COMPLETE` row |
| Completion | Court B is **incomplete** unless all 14 rows are terminal |

Terminal statuses are `COMPLETE` and `INVALID`. `NOT STARTED`, `RUNNING` and
`RATE-LIMITED` are non-terminal and must be resumed.

| Status | Meaning |
| --- | --- |
| `NOT STARTED` | row declared; no tester assigned yet |
| `RUNNING` | a tester is working this build now (counts against concurrency) |
| `COMPLETE` | tester returned a valid terminal report, frozen before unsealing |
| `INVALID` | run cannot be counted (build identity leaked or unverified, tester inspected implementation, harness fault, or a `RUNNING` build whose tester was lost); needs a fresh build code AND a fresh tester |
| `RATE-LIMITED` | stopped by a service limit, not by a finding; resume later |

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
terminal" is checkable against a population that can be reconstructed later. Six
are carried from the 2026-10-17 run so blind-attribution accuracy stays
comparable; seven cover defect classes repaired since.

These are the Court B seeds. They are NOT the same set as the mutations used to
qualify the journey apparatus itself — do not conflate the two.

| Seed | Defect | Class |
| --- | --- | --- |
| S1 | deduction debits the first team instead of the scored one | scoring truth |
| S2 | Final answer published at responses-locked, before explicit reveal | projector privacy |
| S3 | Display presence lie after Host reload | presence truth |
| S4 | typed name not reported until blur — first Start activation lost | setup |
| S5 | Final Undo buried by response-window expiry | Undo integrity |
| S6 | tied explicit end names the first leader Winner | completion |
| S7 | Reset this class session leaks the prior class's ledger | session boundary |
| S8 | team row names only the first mapped Buzzer | buzzer truth |
| S9 | board response-timer expiry becomes reversible | Undo integrity |
| S10 | WebHID accepts any Sony device as the receiver | hardware boundary |
| S11 | projector paints the hosted build asset before pack media hydrate | pack media |
| S12 | Library Delete removes the first game, not the chosen one | data safety |
| S13 | startup action loss on host boot | startup |

S5 and S9 require a two-file mutation: the event types pin `reversible: false`,
so the type must be widened for the seed to compile at all. A seed that does not
compile is `INVALID`, never a finding.

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

| Build | Tester | Mapping hash | Started | Completed | Status | Findings | Attribution | Seed (post-unseal) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| *(none declared)* | — | — | — | — | `NOT STARTED` | — | — | — |

## Resume procedure

1. Read this file first; it is the authority on what has already been run.
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
   is the one resume path that costs a row rather than recovering it.
