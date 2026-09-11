# CQS continuation — resumable physical qualification and UX guidance audit

- **Date:** 2026-09-11
- **Kind:** durable continuation / owner-intent record
- **Authority:** routing and preservation only; this file authorizes no product implementation, merge, or NightWatch mutation
- **Source-of-truth boundary:** observed merged CQS code/config/Git history and startup-canonical docs remain authoritative. Owner-reported physical-test state below must be re-observed on the Mac worktree before it is promoted into candidate or qualification truth.

## Purpose

Preserve the exact continuation order agreed with the owner so a new chat or contributor does not reconstruct the plan from conversation memory or restart physical testing from the beginning.

The governing principle is:

```text
human qualification must be resumable
without reconstructing prior progress from chat or memory
```

This continuation is intentionally separate from the active S04B candidate because the detailed H3 physical checkpoint and uncommitted repairs were reported to exist on the owner's Mac worktree but were not present on the published S04B branch when checked from GitHub.

## Definition of Done for the next continuation

Complete these in order.

### 1. Add resumable-human-qualification governance

Update `docs/governance/EXECUTION-GUIDANCE.md` so any human-assisted qualification session that can span more than one sitting must leave a durable resume checkpoint before a planned pause, unplanned stop, context handoff, machine change, or end of session.

The durable rule should require, as applicable:

- exact candidate branch / HEAD / clean-or-dirty state;
- actual host, environment, and hardware;
- qualification protocol / checklist identity;
- completed checks and outcomes;
- unresolved `FAIL` / `REPEAT` / blocked checks;
- repairs made since the prior checkpoint;
- prior evidence invalidated by those repairs;
- evidence that transfers, with causal reason;
- transient physical/logical mappings or setup facts needed to resume;
- exact next untested step and remaining sequence;
- resume prerequisites;
- durable evidence location.

When an authorized lane permits commit/push, the checkpoint and any candidate changes needed to reproduce the tested state should be made durable remotely before the session is represented as safely paused. If that cannot be done, report the session as **not yet durably resumable**.

A resume begins at the first unresolved or causally invalidated step, not automatically at test 1. Expensive prior physical evidence is rerun only when the changed candidate can causally affect it, consistent with `EXECUTION-GUIDANCE.md` §10.

### 2. Preserve the current S04B H3 physical checkpoint before more testing

**First action on the owner's Mac:** re-observe the actual S04B worktree before any mutation.

Record:

```text
host
user
cwd
Git toplevel
branch
exact HEAD
clean / dirty state
worktrees
remote S04B head
```

Then inspect and preserve the local H3 pause/checkpoint artifacts and the local candidate changes. Do not reset, clean, stash, rebase, or overwrite the worktree merely to recreate the published remote state.

At the last GitHub observation in the prior chat:

- published S04B branch: `feat/cqs-real-mvp-s04b-sony-team-selection`
- published S04B head: `325f46a4d8f21a050dee04b86454b07ce309853c`
- `docs/handoff/` on that published branch contained only `CURRENT.md`;
- the detailed `2026-09-10-s04b-h3-physical-pause-report.md` was **not** present remotely;
- the published branch handoff still described H3 physical qualification as not run.

The following is **OWNER-REPORTED / CHAT-PRESERVED STATE**, not yet remote Git truth. Re-observe it on the Mac before relying on it:

- physical qualification catalog progress was reported as **60/68 PASS**;
- all four physical controllers and all five Sony button colors were exercised successfully after repairs;
- simultaneous controller input was retested and accepted after batching/display behavior was repaired;
- disconnect/recovery testing covered controller power-off/on, receiver unplug/replug behavior, guided repair after controller sleep, and keyboard fallback;
- a remaining teacher-facing UX defect was identified: browser/device enumeration caused ambiguous `Controller 1` labeling instead of stable logical handset identity;
- raw-HID probing produced periodic zero reports and was identified as a confound, not evidence that CQS needs a keepalive mechanism;
- owner-reported physical-to-logical mapping:
  - handset 1 → Bravo → slot 2
  - handset 2 → Charlie → slot 3
  - handset 3 → Alpha → slot 1
  - handset 4 → Delta → slot 4
- owner-reported local repair family included responding-slot readiness, default controller/team associations, provisional Sony recipe observations while unmapped, first-sight/no-connect-reprime Buzzer Check behavior, connected-state Connect affordance, and simultaneous-input display batching;
- exact reported resume point: `RETURN-PLAY`;
- reported remaining sequence: `GAME-SESSION → ABUSE-01 → projector/audio/mute/a11y/session-refresh`.

Preserve the checkpoint and the candidate state that produced it together. A prose checklist without the corresponding candidate changes is not a complete resume point.

### 3. Run an independent NightWatch Court audit of merged CQS UX guidance

Use CQS as **read-only authoritative evidence**. NightWatch may deliberate and recommend; it does not become CQS implementation authority and must not mutate CQS as part of the audit.

Audit the merged guidance family, including:

- `AGENTS.md` UX routing;
- `docs/design/README.md`;
- `docs/design/CQS-UX-DOCTRINE.md`;
- `docs/design/CQS-UX-SURFACE-INVENTORY.md`;
- `docs/research/CQS-UX-SOURCE-PRINCIPLE-MATRIX.md`;
- `docs/research/CQS-UX-UI-REFERENCE-BIBLIOGRAPHY.md`;
- relevant Product Contract, REAL MVP, S04-family, ADR, and observed implementation evidence.

Prefer a purpose-built **Guidance Audit Court** rather than forcing the existing Ideation Court contract onto a mature guidance corpus.

Recommended independent specialist concerns:

- CQS canon / scope guardian;
- teacher operations and situation awareness;
- student/projector/game UX;
- accessibility and Windows UX;
- authoring / information architecture;
- serious-product lifecycle UX: install, update, backup/migration, support, data trust;
- adversarial/cynical reviewer;
- minimalist reviewer for duplication, overbreadth, and unnecessary process.

The Court should test at minimum:

- surface coverage against Product Contract and REAL MVP teacher journey;
- P01–P25 clarity, overlap, contradictions, exceptions, and overbreadth;
- traceability of every principle and `CQS-UXF-*` finding;
- whether primary standards or specialist evidence are missing;
- whether guidance actually produces deterministic, useful implementation decisions;
- whether qualification implications are operational enough for S05/S06;
- whether missing areas such as Windows installation/trust, manual update/replacement, backup/restore/migration, portable export, and Report Problem/support deserve dedicated treatment;
- which literature actually merits ingestion rather than ritual reading.

Preserve material dissent instead of averaging specialist disagreement.

NightWatch Court constraints observed before this handoff:

- the Court protocol and deterministic kernel exist and have been dogfooded;
- the Court recommends and never grants authority;
- the current model/selective-research adapter layer was still planned/unauthorized, so do not claim an autonomous multi-model audit exists unless fresh NightWatch repo truth shows that has changed.

### 4. Compare Court output with a strong single-review baseline, then return recommendations to CQS

Run a strong structured single-review audit against the same evidence and question set.

Compare the Court against that simpler baseline for useful additional findings, preserved disagreements, false positives, missed issues, decision clarity, and process cost. Court complexity must earn its value.

Bring only recommendations back to CQS. Classify each recommendation before any product mutation:

```text
FIX GUIDANCE NOW
ROUTE TO S04B
ROUTE TO S04C
ROUTE TO S04D
ROUTE TO S05
ROUTE TO S06
RESEARCH
DEFER
REJECT
```

Any CQS repair or implementation still requires its own bounded CQS authority.

## Resume rule

A new chat should begin by reading startup-canonical CQS guidance and this continuation note, then perform step 1. Before step 2, it must access/re-observe the owner's Mac S04B worktree. Do not restart physical testing from the beginning merely because the chat changed.

## Non-claims

This file does **not** claim:

- the owner-reported H3 state has been committed or pushed;
- the published S04B branch contains the local pause report or local repairs;
- any owner-reported physical result is independently reverified here;
- S04B is merged or terminal;
- the UX guidance has already passed the proposed Court audit;
- NightWatch has an authorized autonomous model/research Court adapter;
- any S04B/S04C/S04D/S05/S06 product work is authorized by this document.
