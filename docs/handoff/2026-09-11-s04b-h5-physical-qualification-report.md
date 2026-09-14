# S04B H5 Owner-Interactive Physical Requalification — Report

**Date:** 2026-09-11 (America/Chicago)  
**Status:** PHYSICAL PASS recorded — **not** independent-review PASS — **not** merged — **not** terminal  
**Authorization (physical):** `AUTHORIZE-CQS-REAL-MVP-S04B-H5-OWNER-INTERACTIVE-PHYSICAL-REQUALIFICATION-1`  
**Authorization (evidence freeze):** `AUTHORIZE-CQS-S04B-H5-PHYSICAL-QUALIFICATION-EVIDENCE-FREEZE-1`

## Candidate identity

| Item | Value |
| --- | --- |
| Exact H5 packaged implementation | `e23ac308f0f06d3eb916f7409127e4485ae03f43` |
| Embedded package `sourceSha` | `e23ac308f0f06d3eb916f7409127e4485ae03f43` |
| Docs tip at physical session (not candidate) | `cdedf894e7e539a89de43518bee41b03c82d7a40` |
| App | `release/mac-arm64/Classroom Quiz Show.app` |
| asar SHA-256 | `5fcc6484395b8f62283594bd3430c9bbd9c12d8c937f6238e33b80e1ddc81f70` |

## Environment / hardware

| Item | Observed |
| --- | --- |
| Host / user | `Ricks-MacBook-Air.local` / `macdaddy` |
| Receiver | Namtai Wbuzz `054c:1000` |
| Controllers exercised | four wireless handsets (owner physical set) |
| Physical PASS bound to | this macOS host + that receiver + those four handsets |
| Temporary evidence root | `/tmp/cqs-s04b-h5-physical-qualification/` |
| Durable interaction manifest | [`qualification-runs/s04b-h5-2026-09-11.jsonl`](qualification-runs/s04b-h5-2026-09-11.jsonl) |

Windows physical runtime was **not** run and is **not** implied.

## Q1–Q8 verdicts

| ID | Verdict |
| --- | --- |
| Q1 | PASS |
| Q2 | PASS |
| Q3 | PASS (Blue/Orange/Green/Yellow) |
| Q4 | PASS |
| Q5 | PASS (critical simultaneous selection) |
| Q6 | PASS |
| Q7 | PASS |
| Q8 | PASS |

## Warnings / friction

- Dongle long-press bind required before first RED readiness advance (wrong starting state initially; not product defect).
- Buzzer Check observations can advance without clicking Check/Connect (UX affordance friction).
- Qual spreadsheet helper needed playable template fix before import compiled.

## Gaps remaining

- Independent exact-head review of H5 **not** done.
- S04B **not** merged / **not** terminal.
- SONY-08 labeling optional / OPEN.
- Windows physical runtime **NOT RUN**.
- Not S06 clean-room release qualification.

## Ready for independent exact-head review?

**Yes — bounded owner-interactive physical requalification of packaged H5 is PASS.**  
Independent review may proceed on exact head `e23ac308f0f06d3eb916f7409127e4485ae03f43` (or a docs-only tip that does not change that packaged identity).

---

## Evidence freeze (2026-09-11)

This section freezes already-produced physical + harvest truth. It does **not**
rewrite H5 history, reopen product work, or invalidate the physical PASS.

### Durable vs temporary

| Class | Location |
| --- | --- |
| Durable interaction/evidence manifest | [`qualification-runs/s04b-h5-2026-09-11.jsonl`](qualification-runs/s04b-h5-2026-09-11.jsonl) |
| Durable routing / receipt | this report; [`../STATUS.md`](../STATUS.md); [`CURRENT.md`](CURRENT.md); S04B receipt H5 addendum |
| Temporary rich evidence | `/tmp/cqs-s04b-h5-physical-qualification/` screenshots, logs, video, fixture — **not** committed; filenames + SHA-256 hashes referenced in the JSONL where practical |

### Instruction-fidelity findings (process; not H5 invalidation)

- Import path was initially compressed/inexact (`Import Game` vs required `Import spreadsheet` step).
- Native picker `/tmp` path was impractical; Desktop `CQS-H5-Qual` staging was required.
- `Play` did not immediately open Class Setup as instructed; Host control appeared first.
- Connect/Check assumptions drifted from actual product/observation state.
- Repair was suggested even though physical dongle long-press binding was the successful owner-observed action.
- “My Games” versus actual Home wording **Recent Games** drift was identified.
- Future control-finding instructions should use exact observed packaged UI wording and actual step count.

### Physical-label normalization

Owner report during testing: controller numbering became confusing, so the
owner physically renumbered/relabelled the four controllers rather than
continue mentally transposing numbers.

**Classification:** `TEST-ENVIRONMENT NORMALIZATION` (not product behavior).

Identity distinction for future qualification:

1. **Physical handset label** — stable human-facing qualification reference.
2. **Sony slot / team assignment** — product/session mapping.
3. **Browser gamepad / controller index** — ephemeral runtime locator; not durable identity.

Before/after physical label map: **UNKNOWN** (not recorded in the H5 temporary ledger). Do not invent it.

### Automation-gap summary (not implemented here)

Before v1, machine-verifiable companions are wanted for:

- exact teacher-facing UI labels and step counts;
- spreadsheet-import teacher journey;
- state-dependent Sony Connect/Check labels;
- simultaneous controller edges at the adapter/poll boundary;
- readiness semantics;
- canonical teacher journey through Class Setup;
- instruction-fidelity against a packaged release candidate.

These gaps do **not** invalidate the H5 physical PASS.

### PR #75 interaction

Open PR [#75](https://github.com/ricktron/classroom-quiz-show/pull/75)
(`docs: require resumable human qualification checkpoints`) overlaps the same
owner-interactive qualification governance area as later proposed
interaction-ledger / instruction-fidelity / automation-companion doctrine.
Reconcile deliberately later. **This freeze does not modify PR #75** and does
not add a competing governance document.

## Confirmed non-actions

No product code change. No H5 rebuild/repackage. No physical requalification
rerun. No independent semantic review begun in the freeze lane. No PR opened
by the freeze authorization. No push required by the freeze authorization. No
merge. No S04C/S04D/S05/S06 begun. No SONY-08 implementation.
