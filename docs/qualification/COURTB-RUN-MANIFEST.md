# Court B run manifest and checkpoint ledger

Durable checkpoint ledger for a blinded Court B BLACK-BOX TEACHER RUN
([`COURT-B-BLACK-BOX-BRIEF.md`](COURT-B-BLACK-BOX-BRIEF.md)).

**Status:** run apparatus and protocol. This file is **not** an owner decision,
**not** eligibility, and **not** a recertification result. Rows are written as a
run proceeds; a row claims only what the named tester actually reported.

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
| `INVALID` | run cannot be counted (e.g. build identity leaked, tester inspected implementation, harness fault); needs a fresh build code |
| `RATE-LIMITED` | stopped by a service limit, not by a finding; resume later |

## Blinding rules the ledger has to protect

- **Build identity never reaches a tester.** A tester receives only the opaque
  build code, the committed fixtures, and the brief. Not the seed, not the SHA,
  not whether their build is the clean one.
- **The mapping is sealed before any tester starts.** Record the mapping file's
  sha256 here; do not record the mapping contents in this file.
- **Attribution is frozen before unsealing.** Blind attributions are written to
  a separate pre-unseal file, hashed, and only then is the mapping read.
- **Simulated buzzers are not physical evidence** (brief rule 6). No physical
  Sony/Namtai claim may be entered in this ledger.

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
   declaring a pass.
