# CQS-GUIDANCE-POLISH-S01 — execution guidance and current-canon polish

## Identity

- **Slice:** `CQS-GUIDANCE-POLISH-S01`
- **Authorization:** `AUTHORIZE-CQS-GUIDANCE-POLISH-S01-1`
- **Evidence-state ID:** `CQS-GUIDANCE-POLISH-S01-ES-1`
- **Kind:** documentation + governance + current-canon + execution-guidance
  only. **No product implementation authority.**
- **Date (America/Chicago):** 2026-08-12
- **Repository:** `ricktron/classroom-quiz-show`

This receipt records protocol, provenance, and pre-review verification. It
does **not** contain a final candidate commit SHA. Final exact-head
independent-review evidence is attached to:

```text
GitHub PR review / review evidence
+
terminal Program Orchestrator handoff
```

Do not edit this receipt after final exact-head review merely to write a
PASS at that same head.

## Starting base and fresh local provenance

| Fact | Observed |
| --- | --- |
| Expected canonical base | `93a64b18356c79ccfa96945f8668dae4180a59d1` |
| Exact starting `origin/main` | `93a64b18356c79ccfa96945f8668dae4180a59d1` |
| Host | `Ricks-MacBook-Air.local` |
| User | `macdaddy` |
| cwd | `/Users/macdaddy/Documents/Coding/Cursor Projects/classroom-quiz-show` |
| Git toplevel | `/Users/macdaddy/Documents/Coding/Cursor Projects/classroom-quiz-show` |
| Delivery branch | `docs/cqs-guidance-polish-s01` created from that exact `origin/main` |
| Working tree at preflight | clean |
| Open PRs at preflight | none |
| Product changes | **NONE** |
| Successor product work | **NOT STARTED** |

Additional historical/detached worktrees existed under `/private/tmp/` from
prior slice verification. None owned overlapping guidance-polish scope.

## Source documents reviewed

Startup canon: `AGENTS.md`, `README.md`, `docs/PROJECT.md`, `docs/STATUS.md`,
`docs/handoff/CURRENT.md`, `docs/plans/MVP-ARC.md`.

Qualification and representative receipts: Slice 23 qualification plan;
Slice 18–23 post-merge / implementation receipts named in the
authorization packet.

ADRs: ADR-010, ADR-019, ADR-020. Decision index:
`docs/decisions/README.md`. No pre-existing `docs/governance/` directory.

Consumed readiness sampled for N-02, including
`docs/plans/CQS-PHASE-3-DESIGN-SYSTEM-READINESS.md`.

Contract versions freshly verified against implementation constants
(`PUBLIC_STATE_SCHEMA_VERSION`, `SYNC_SCHEMA_VERSION`,
`SUPPORTED_SCHEMA_VERSION`, `GAME_DEFINITION_MODEL_VERSION`,
`PERSISTENCE_DB_VERSION`, `PERSISTENCE_WIRE_VERSION`, pack / workbook /
authoring / Sony / summary constants).

## Guidance architecture verdict

```text
GUIDANCE ARCHITECTURE VERDICT:
OPTION B — concise AGENTS.md + one canonical detailed execution guide
```

Fresh discovery found no existing `docs/governance/` directory or equivalent
detailed execution-policy surface.

```text
AGENTS.md
  → concise universal startup entrypoint
  → links to:

docs/governance/EXECUTION-GUIDANCE.md
  → detailed delivery/review/evidence/repair/documentation rules
```

No additional tiny governance files were created. `AGENTS.md` was not turned
into a knowledge base.

## Changed paths

Exactly the authorized allowlist:

1. `AGENTS.md`
2. `README.md`
3. `docs/STATUS.md`
4. `docs/handoff/CURRENT.md`
5. `docs/plans/MVP-ARC.md`
6. `docs/governance/EXECUTION-GUIDANCE.md`
7. `docs/architecture/ADR-010-sony-buzz-profile-and-setup.md`
8. `docs/receipts/2026-08-12-cqs-guidance-polish-s01.md`

## Current-state simplifications

- `docs/STATUS.md` answers complete / active / remaining / open / contracts /
  next Program action. Historical PR/merge/CI chronology was removed from
  the current-state path and left in receipts / MVP-ARC.
- `docs/handoff/CURRENT.md` tells the next contributor the inherited
  boundary, what to read, what is complete, what remains, what not to start,
  and the next Program-level action. Per-slice merge chronology was removed.
- `docs/plans/MVP-ARC.md` remains the historical 23-slice plan of record,
  with an unmistakable complete-vs-MVP-incomplete banner. It is not the
  future REAL MVP roadmap.
- `README.md` is contributor/user orientation, not a slice merge ledger.

## N-01 / N-02 / N-04 disposition

| Item | Disposition |
| --- | --- |
| **N-01** | **Repaired.** `docs/handoff/CURRENT.md` no longer says `Slice 10 (current)`. The simplified handoff does not label completed historical slices as current. |
| **N-02** | **No allowlist expansion.** Consumed readiness/planning documents were scanned. Issuance-era wording (including Phase 3 §18’s post-Slice-18 freeze that Slices 19–23 remained planned) is a historical/consumed snapshot, already partly time-qualified with `At issuance…`. It does not currently misroute a contributor who follows `AGENTS.md` → STATUS / CURRENT. Historical receipts were not rewritten. |
| **N-04** | **Minimally repaired.** ADR-010 Status was already time-qualified. The later Costs and limits present-tense keep-alive sentence now records that the architecture remained unresolved at Slice 10 / OADL2-S07 and that Slice 21 / ADR-019 later resolved the exact Namtai wireless `Wbuzz` `054c:1000` supported-profile path. Support claims were not broadened. |

## Guidance-ledger disposition

| Family | Classification |
| --- | --- |
| Authority vs routing | **ADOPT** |
| Routine continuation preauthorization | **ADOPT** |
| Material owner gates | **ADOPT** |
| Exact provenance | **ADOPT** |
| Moved-head handling | **ADOPT** |
| Exact-head review | **ADOPT** |
| Independent invariant review | **ADOPT** |
| Invariant-family repair | **ADOPT** |
| Resource bounds | **ADOPT** |
| Builder/consumer symmetry | **ADOPT** |
| Truthful security tests | **ADOPT** |
| Async ownership / latest-wins / idempotence | **ADOPT** |
| Durable identity | **ADOPT** |
| Reset partial-failure semantics | **ADOPT** |
| Browser served-build provenance | **ADOPT** |
| Evidence taxonomy | **ADOPT** |
| Physical vs synthetic evidence | **ADOPT** |
| State-driven owner instructions | **ADOPT** |
| Evidence transfer | **ADOPT** |
| Environment-blocked verification | **ADOPT** |
| Live effects vs historical replay | **ADOPT** (concise CQS principle; cue vocabulary remains **CQS-SPECIFIC — KEEP IN CANONICAL PRODUCT DOC** / ADR-020) |
| Current vs historical docs | **ADOPT** |
| Merge-stable docs | **ADOPT** |
| Safe authority vocabulary | **ADOPT** |
| Roadmap complete vs MVP complete | **ADOPT** |
| Slice 18–23 merge SHA / CI run trivia | **HISTORICAL ONLY** (receipts) |
| Sony exact-profile hardware matrix | **CQS-SPECIFIC — KEEP IN CANONICAL PRODUCT DOC** |
| Permanent CQS product invariants | **CQS-SPECIFIC — KEEP IN CANONICAL PRODUCT DOC** |
| NightWatch / Obsidian as implementation truth | **REJECT — OVERFITTED / UNHELPFUL** as authority; already fail-closed in AGENTS / PROJECT |
| Multi-file governance splinter | **REJECT — OVERFITTED / UNHELPFUL** |
| Predicting candidate merge SHA in startup docs | **REJECT — OVERFITTED / UNHELPFUL** |
| Broad REAL MVP program design in this slice | **DEFER — NOT YET MATURE** |
| Desktop packaging / Pi / LAN / controller polish as guidance content | **DEFER — NOT YET MATURE** (product work remains not begun) |

## Preserved nonclaims

```text
23-slice roadmap = COMPLETE
overall MVP = NOT COMPLETE
C-3/C-6 = OPEN / NOT BEGUN
REAL MVP implementation = NOT STARTED
Pi work = NOT STARTED
LAN work = NOT STARTED
controller-polish implementation = NOT STARTED
post-MVP arcs = INACTIVE
```

Product implementation authority created: **NO**.

## Verification performed (pre-review)

Bounded docs-only verification authorized by this slice:

- `git status --short`
- `git diff --check`
- `git diff --name-status`
- `git diff --stat`
- changed-path allowlist proof
- relative Markdown link/path check on changed files
- post-mutation semantic scans (current-state language; authority language;
  N-01; N-04)
- contract-version check against implementation constants

```text
product checks not run under bounded docs-only verification
no product pass claim made
```

No package/lockfile mutation.

## Review protocol / evidence location

Independent exact-head review of the immutable candidate head is required
before merge authorization. The reviewer must inspect every changed path
against the authorization packet’s invariant list.

Final exact-head independent-review evidence belongs in:

- the GitHub PR review / review evidence;
- the terminal Program Orchestrator handoff.

This repository receipt records the protocol only. It must not be edited
after that review solely to embed the PASS at the same head.
