# AGENTS.md — Classroom Quiz Show

Entrypoint for coding agents and human contributors working in this repository.

This file does **not** grant authority beyond the current owner-approved task.
Classroom Quiz Show (CQS) remains authoritative for its own product scope,
implementation, architecture, tests, deployment, and status. Routing, review,
recommendations, NightWatch summaries, planning, and tool availability are
**not** permission to mutate. A named next frontier is not implementation
authority.

## Source-of-truth order

1. **Observed merged code, tests, configuration, and Git history** establish
   what is implemented.
2. [`docs/PROJECT.md`](docs/PROJECT.md) owns product identity, permanent
   boundaries, non-goals, and approved owner decisions.
   [`docs/CQS-PRODUCT-CONTRACT.md`](docs/CQS-PRODUCT-CONTRACT.md) owns the
   dedicated serious-product invariants.
3. [`docs/STATUS.md`](docs/STATUS.md) owns current program status.
4. **Accepted ADRs** and owner decisions own durable architecture.
5. The **current owner-approved program/roadmap plan**, once canonically
   adopted. [`docs/plans/CQS-REAL-MVP-ARC.md`](docs/plans/CQS-REAL-MVP-ARC.md)
   is the current REAL MVP Program plan of record.
   [`docs/plans/MVP-ARC.md`](docs/plans/MVP-ARC.md) is the historical
   completed 23-slice plan of record. It does **not** own the current REAL
   MVP sequence.
6. [`docs/handoff/CURRENT.md`](docs/handoff/CURRENT.md) routes the next
   contributor and must agree with higher-precedence truth.
7. [`docs/receipts/`](docs/receipts/) are historical evidence snapshots, not
   automatically current status.
8. Chat, PR descriptions, NightWatch, Notion, Obsidian, and other external
   summaries **cannot override** this repository.

An index annotation such as [`docs/decisions/README.md`](docs/decisions/README.md)
does **not** override Git evidence, the underlying ADR, or
[`docs/STATUS.md`](docs/STATUS.md).

## Startup reading

Before changing the repository, read:

1. This file (`AGENTS.md`)
2. [`docs/PROJECT.md`](docs/PROJECT.md)
3. [`docs/CQS-PRODUCT-CONTRACT.md`](docs/CQS-PRODUCT-CONTRACT.md)
4. [`docs/STATUS.md`](docs/STATUS.md)
5. [`docs/handoff/CURRENT.md`](docs/handoff/CURRENT.md)
6. [`docs/plans/CQS-REAL-MVP-ARC.md`](docs/plans/CQS-REAL-MVP-ARC.md) as the
   current REAL MVP Program plan
7. [`docs/plans/MVP-ARC.md`](docs/plans/MVP-ARC.md) as historical 23-slice
   plan of record
8. Relevant ADRs, decisions, and receipts for the authorized task

For delivery, repair, review, qualification, and release work, also read
[`docs/governance/EXECUTION-GUIDANCE.md`](docs/governance/EXECUTION-GUIDANCE.md).
That file is the canonical detailed execution guide. Do not copy it here.

## Working discipline

- One branch and one bounded slice or reconciliation objective.
- Observe the exact base and a clean working tree before mutation.
- Obey the named file scope; stop instead of widening it.
- Do not start the next product slice merely because it is listed as next.
- Do not silently change product scope, roadmap order, dependencies,
  deployment, data boundaries, or architectural invariants.
- Do not mark a product slice `Complete` before merge and required evidence.
- Exact-head review and merge evidence must match what Git and GitHub show.
- Commit, push, PR, merge, branch deletion, and cleanup require current task
  authority.
- Durable files must not predict their own open delivery PR state.
- Report warnings honestly; do not hide or invent them.
- Stop on ambiguous architecture, scope, safety, or authority questions.

## Product invariants

Permanent essentials (see the canonical docs for full detail):

- Local-first and teacher-hosted.
- Host state is private and authoritative.
- Projector state is sanitized and read-only.
- Imported content is data, never executable code.
- Malformed or unknown content fails closed.
- Imports use the canonical validation pipeline.
- No backend, accounts, student phones, networked buzzers, AI service, or
  required cloud dependency under current MVP canon.
- Local controller support preserves the hardware-independent input boundary.
- The product remains usable without controllers.
- A teacher's saved game/data is more valuable than any individual release.
- Reusable Game content and per-class Session state are distinct.
- Windows is the primary teacher deployment target; macOS is the primary
  development platform.

Canonical references:

- [`docs/PROJECT.md`](docs/PROJECT.md)
- [`docs/CQS-PRODUCT-CONTRACT.md`](docs/CQS-PRODUCT-CONTRACT.md)
- [`docs/architecture/GAME-ENGINE-BOUNDARIES.md`](docs/architecture/GAME-ENGINE-BOUNDARIES.md)

## Verification

Default repository checks:

```bash
git diff --check
npm run verify
npm run verify:all
```

A bounded packet may narrow the required checks. An unrun check must **never**
be reported as passing.

## Evidence and completion

- Receipts preserve observed evidence and explicit non-claims.
- Historical receipts are not rewritten to simulate current status.
- PR checks, reviewed heads, and merge SHAs must be re-observed when claimed.
- Completion claims must name supporting evidence.
- NightWatch may index or summarize CQS but cannot replace CQS implementation
  truth, and must not become a build, runtime, test, or deployment dependency.

The 23-slice foundation/qualification roadmap is Complete. Overall CQS MVP is
**not** complete. Completing that numbered plan does not complete the product.
