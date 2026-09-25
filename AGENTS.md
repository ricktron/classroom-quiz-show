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

## Owner MacBook Air local checkout

This is a convenience hint for Rick's primary macOS development machine. It
does **not** override Git/repository identity and must be verified before any
mutation.

- **Machine:** Rick's MacBook Air. The shell host may appear as `ricks`;
  historical receipts also record `Ricks-MacBook-Air.local`.
- **User:** `macdaddy`
- **Verified CQS checkout:**
  `/Users/macdaddy/Documents/Coding/Cursor Projects/classroom-quiz-show`

When a local command is needed and the shell starts in `~`, go directly to
the known checkout instead of searching for the repository again:

```bash
cd "/Users/macdaddy/Documents/Coding/Cursor Projects/classroom-quiz-show"
```

Then verify identity before mutation:

```bash
git rev-parse --show-toplevel
git remote get-url origin
git status --short --branch
```

Expected repository root is the path above and `origin` must resolve to
`ricktron/classroom-quiz-show`. If the path no longer exists or Git identity
does not match, stop and re-discover rather than assuming the machine layout is
unchanged.

### MacBook Air worktree-aware testing

This MacBook Air uses multiple Git worktrees for CQS. A branch can be checked
out in only one registered worktree at a time, so **never assume `main` is
available in the checkout currently open in Terminal or Cursor**.

Before any branch switch or local testing setup, inspect both the current
checkout and the registered worktree topology:

```bash
git status --short --branch
git worktree list --porcelain
```

If untracked or modified files are present, preserve them before changing
branches. For a temporary safety snapshot that includes untracked files:

```bash
git stash push -u -m "pre-sync local leftovers"
```

Do not automatically re-apply an old stash onto current `main`. Inspect it
later with `git stash list` / `git stash show --stat` and reconcile only if
its contents are still needed. Never delete or overwrite unexplained local
files merely to make a checkout clean.

If `main` is already checked out in another worktree, do **not** force it,
delete that worktree, or repoint it merely to run a test. Either use the
existing verified `main` worktree or use a detached testing surface at the
exact canonical commit.

For repeatable owner testing, prefer a dedicated detached worktree such as:

```text
/Users/macdaddy/Documents/Coding/Cursor Projects/classroom-quiz-show-owner-test
```

Create it only when needed and only from the verified canonical repository:

```bash
git fetch origin
git worktree add --detach "../classroom-quiz-show-owner-test" origin/main
```

On later testing sessions, if that worktree already exists and is clean:

```bash
cd "/Users/macdaddy/Documents/Coding/Cursor Projects/classroom-quiz-show-owner-test"
git fetch origin
git switch --detach origin/main
git status --short --branch
git rev-parse HEAD
```

A detached owner-test worktree is intentional: it avoids competing for the
`main` branch and makes the exact tested commit explicit. Do not author
product changes there during an owner acceptance run.

### Worktree lifecycle

A worktree is a temporary execution/testing/review surface, not durable
evidence. Durable evidence belongs in commits, PRs, receipts, and repository
documentation.

At the close of a development/review/testing lane, classify the worktree as
active, blocked, or ready to retire. Do not remove worktrees merely because
they are old, and do not delete branches just because a worktree is retired.
Any cleanup is a separate, explicitly approved action after fresh Git and
GitHub verification.

Use `git worktree list --porcelain` as the authoritative local topology
check. Physical folder names such as `classroom-quiz-show-s04b` are not
durable ownership or status claims.

### Local owner-test provenance

For any owner acceptance / physical local test, record enough evidence to
reproduce what was actually tested. At minimum capture:

- host and user;
- repository/worktree path;
- remote identity;
- exact tested commit SHA;
- branch or detached-HEAD state;
- whether the worktree was clean before the run;
- launch method (for example `npm run desktop` versus a packaged artifact);
- OS version when platform behavior matters;
- display topology (for example MacBook Host + iPad Sidecar Audience);
- attached physical hardware when relevant.

A compact preflight is:

```bash
hostname
whoami
pwd
git rev-parse --show-toplevel
git remote get-url origin
git status --short --branch
git rev-parse HEAD
git worktree list --porcelain
sw_vers
```

For source-run testing, the Git SHA is the primary tested-code identity. For a
packaged artifact, record the artifact/provenance SHA as well; a local checkout
SHA alone does not prove which package was launched.

Do not call a later test equivalent merely because it ran on the same MacBook.
Commit, package, OS, display topology, and attached hardware are separate
evidence dimensions.

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

## Teacher-facing UX and design routing

Before changing teacher-facing interaction, information hierarchy, wording,
setup/readiness/recovery behavior, Host or Display presentation, authoring
workflow, accessibility, motion, or visual behavior, read
[`docs/design/README.md`](docs/design/README.md) and the relevant entries in
[`docs/design/CQS-UX-SURFACE-INVENTORY.md`](docs/design/CQS-UX-SURFACE-INVENTORY.md).

Apply the adopted
[`docs/design/CQS-UX-DOCTRINE.md`](docs/design/CQS-UX-DOCTRINE.md) **before**
external literature. Use
[`docs/research/CQS-UX-SOURCE-PRINCIPLE-MATRIX.md`](docs/research/CQS-UX-SOURCE-PRINCIPLE-MATRIX.md)
and
[`docs/research/CQS-UX-UI-REFERENCE-BIBLIOGRAPHY.md`](docs/research/CQS-UX-UI-REFERENCE-BIBLIOGRAPHY.md)
when the adopted doctrine does not settle a consequential design question,
when weighing meaningful alternatives, or when the relevant surface routes to
specialist research.

Research evidence informs CQS decisions. It does **not** override repository
canon and does **not** authorize implementation. Settled doctrine does not
need external sources re-read to re-prove it. Consultation levels are defined
in [`docs/design/README.md`](docs/design/README.md) §2.

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
