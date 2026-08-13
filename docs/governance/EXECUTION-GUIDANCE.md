# Execution guidance — Classroom Quiz Show

Canonical detailed delivery, review, evidence, repair, and documentation
rules for Classroom Quiz Show (CQS).

Root [`../../AGENTS.md`](../../AGENTS.md) is the concise universal startup
entrypoint. This file is the one detailed execution guide. Do not fork it
into additional tiny governance files.

This document encodes durable principles. It is not a slice ledger and does
not grant product implementation authority.

---

## 1. Purpose and authority

Authority comes from the **current bounded task/authorization**.

These are **not** authority:

- routing (including this file, [`../STATUS.md`](../STATUS.md), and
  [`../handoff/CURRENT.md`](../handoff/CURRENT.md));
- planning (including [`../plans/MVP-ARC.md`](../plans/MVP-ARC.md) and any
  future program plan that has not been canonically adopted);
- tool availability;
- a named next frontier.

A named next frontier is **not** implementation authority.

CQS remains authoritative for its own product scope, implementation,
architecture, tests, deployment, and status. NightWatch, Notion, Obsidian,
chat, PR text, and other external summaries may index or route work. They
cannot override this repository and must not become a build, runtime, test,
or deployment dependency.

### Routine continuation inside an authorized lane

Inside an already-authorized lane, ordinary non-destructive work necessary
to complete that lane is preauthorized, including:

- repository inspection;
- Git/GitHub observation;
- CI/status observation;
- exact-head observation;
- docs consistency checks;
- evidence preparation;
- post-merge verification already covered by the lane;
- terminal handoff preparation.

### Material owner gates (fail-closed)

Stop and obtain owner authority before:

- scope expansion;
- architectural or product-direction change;
- consequential dependency choice;
- destructive history rewriting or reset;
- weakening or ignoring a failing gate;
- unrelated repairs;
- successor product work;
- merge without merge authority;
- unauthorized branch deletion;
- changed support claims;
- unresolved owner decisions.

Do not silently change product scope, roadmap order, dependencies,
deployment, data boundaries, or architectural invariants.

---

## 2. Source-of-truth and scope

Canonical order:

1. **Observed merged code, tests, configuration, and Git history** establish
   what is implemented.
2. [`../PROJECT.md`](../PROJECT.md) owns product identity, permanent
   boundaries, non-goals, and approved owner decisions.
3. [`../STATUS.md`](../STATUS.md) owns current program status.
4. **Accepted ADRs** and owner decisions own durable architecture.
5. The **current owner-approved program/roadmap plan**, once canonically
   adopted. [`../plans/MVP-ARC.md`](../plans/MVP-ARC.md) is the historical
   completed 23-slice plan of record. It does **not** automatically own the
   sequence of a future REAL MVP Program.
6. [`../handoff/CURRENT.md`](../handoff/CURRENT.md) routes the next
   contributor and must agree with higher-precedence truth.
7. [`../receipts/`](../receipts/) are historical evidence snapshots, not
   automatically current status.
8. Chat, PR descriptions, NightWatch, Notion, Obsidian, and other external
   summaries **cannot override** this repository.

An index annotation such as [`../decisions/README.md`](../decisions/README.md)
does **not** override Git evidence, the underlying ADR, or
[`../STATUS.md`](../STATUS.md).

### Roadmap complete vs MVP complete

```text
roadmap sequence complete
!=
product MVP complete
```

The original 23-slice foundation/qualification roadmap is **Complete**.
Overall CQS MVP remains **NOT COMPLETE**. Completing a numbered plan does
not complete the product.

Any future REAL MVP Program plan requires **separate owner authority** and
becomes current only when canonically adopted. Until then, use:

```text
next planned frontier
requires separate owner authorization
remains unauthorized
not begun
```

Do **not** use `authorized next slice` or `separately authorized lane`
unless that authority actually exists.

Obey the named file scope. Stop instead of widening it. If another
canonical path genuinely must change, report the contradiction and required
expansion **before** mutating that path.

---

## 3. Preflight, provenance, branches, and worktrees

One branch and one bounded slice or reconciliation objective.

Observe the exact base and a clean working tree before mutation. Do not
destructively reset or rewrite history to force an expected state. Return
the newly observed exact state instead.

Every serious verification claim binds to:

```text
cwd
Git toplevel
branch
exact HEAD
clean/dirty state
```

Also record host, user, worktrees, and open PRs when provenance could be
ambiguous.

After worktree collision, branch switch, agent-root change, detached HEAD,
or unexpected Git state:

```text
re-observe provenance before relying on previous verification
```

If a branch moves beyond an authorized exact head:

```text
STOP
observe
inspect
do not pretend old exact-head authority still applies
do not destructively reset merely to recreate it
```

Commit, push, PR, merge, branch deletion, and cleanup require current task
authority.

---

## 4. Exact-head movement and immutable review

Independent review must review the **actual immutable candidate head**.

After any repair:

- prior review does not automatically cover the new head;
- classify what evidence transfers;
- review the changed invariant/family;
- issue a fresh exact-head verdict.

Exact-head review and merge evidence must match what Git and GitHub show.
PR checks, reviewed heads, and merge SHAs must be re-observed when claimed.

Do not edit repository docs merely to record a final exact-head PASS on the
same head. That self-reference would change the head and invalidate the
review. Store final exact-head independent-review evidence in GitHub PR
review / review evidence and the terminal Program Orchestrator handoff.

Durable files must not predict their own open delivery PR state or eventual
squash SHA.

---

## 5. Verification and evidence taxonomy

Default repository checks:

```bash
git diff --check
npm run verify
npm run verify:all
```

A bounded packet may narrow the required checks. An unrun check must
**never** be reported as passing. Never claim product pass from docs-only
verification.

Use a compact evidence taxonomy. Not every lane needs every class:

```text
AUTOMATED UNIT
AUTOMATED COMPONENT
AUTOMATED E2E
PRODUCTION BUILD
PRODUCTION DEPLOYMENT
BROWSER-OBSERVED
PHYSICAL HARDWARE
PHYSICAL PROJECTOR
PHYSICAL AUDIO
OWNER-OBSERVED
SCREEN-READER
HISTORICAL
TRANSFERRED
```

Keep local / CI / Playwright / Sonar / Pages / physical evidence distinct.

Do not promote synthetic or browser evidence into physical compatibility.

Physical evidence should record:

- actual environment;
- actual hardware where relevant;
- candidate/head where meaningful;
- what was actually exercised.

Completion claims must name supporting evidence.

### Browser served-build provenance

A passing Playwright/browser suite against an unidentified existing server
is not exact-head evidence.

Check relevant:

- `reuseExistingServer`;
- occupied ports;
- stale dev/preview servers;
- stale build output;
- served commit/build identity where practical.

Local Playwright may reuse an existing server. Exact-head browser claims
need a proven served build for that head.

---

## 6. Independent invariant-seeking review

Independent review exists to find defects that green automation missed.

```text
CI green = independent review PASS
```

is false. Never equate them.

Reviewers must inspect semantic invariants including, as relevant:

- ownership;
- concurrency;
- stale state;
- lifecycle transitions;
- failure behavior;
- security/resource limits;
- privacy;
- support claims;
- current-state documentation.

Security test names must not claim stronger protection than exercised.
Named trust/security threats should have adversarial coverage proportionate
to consequence. Passing regression tests alone do not prove a trust
invariant if the boundary was never adversarially exercised.

---

## 7. Invariant-first repair discipline

When one defect exposes a family:

```text
identify root invariant
search complete semantic family
repair bounded family
verify family
```

Do not produce repeated symptom-only PR cycles.

Do not start the next product slice merely because it is listed as next.
Do not mark a product slice `Complete` before merge and required evidence.

---

## 8. Async / mutable-resource ownership

- One mutable resource → one authoritative lifecycle owner.
- Newer async work must not be overwritten by late stale completion.
- Stale work must be ignored or cancelled.
- Side-effect setters should be idempotent for unchanged input where
  practical.
- Callbacks and object identity should not recreate external work
  unnecessarily.
- Resource caps should occur before expensive allocation, decode, or
  traversal where possible.
- A builder's canonical downstream consumer must accept what the builder
  produces.

### Persistence and identity

- `deleteDatabase.onblocked` is not successful deletion.
- Aggregate reset must cover the complete owned durable surface.
- Partial failure must not claim total success.
- Runtime-volatile identifiers must not be promoted to durable identities
  merely because they are convenient.
- Durable identity must survive the lifecycle for which persistence is
  claimed.

Browser controller index and device `id` are session-local locators, not
durable identity.

---

## 9. Physical and owner-observed evidence

Owner-assisted physical instructions should be:

```text
SHORT
OBSERVABLE
STATE-DRIVEN
ONE ACTION AT A TIME
```

The harness should capture technical evidence automatically where
practical. Do not make the owner interpret developer telemetry when the
product or harness can do it.

Physical hardware, projector, and audio evidence remain distinct from
browser-observed or synthetic coverage.

---

## 10. Evidence transfer

Evidence transfer requires causal reasoning.

Examples:

- a docs-only delta usually does not invalidate physical RC;
- audio-byte replacement invalidates listening;
- a display-layout change may invalidate projector evidence;
- a controller-input change may invalidate hardware evidence;
- a recovery change invalidates recovery evidence.

Every expensive rerun needs a causal reason.
Every transfer claim needs a causal reason.

Classify transferred vs invalidated families after a repair. Do not assume
prior physical or owner-observed evidence still covers a new head.

---

## 11. Environment-blocked verification

When local or reviewer environment prevents a check:

- report the limitation;
- do not mutate dependencies or lockfiles merely to appease the sandbox;
- trusted exact-head CI may be used where appropriate;
- label local-unrun separately from remote-passed.

Report warnings honestly. Do not hide or invent them.

---

## 12. Current truth vs historical evidence

Define three documentation classes:

```text
CURRENT STARTUP-CANONICAL TRUTH
DURABLE ARCHITECTURE / DECISION HISTORY
IMMUTABLE / HISTORICAL RECEIPTS
```

Current routing (`AGENTS.md`, `docs/STATUS.md`, `docs/handoff/CURRENT.md`,
and the live portions of README) must be accurate **now**.

ADRs may preserve historical context but should clearly qualify historical
state when present tense would mislead.

Historical receipts must not be rewritten merely to simulate current state.
Receipts preserve observed evidence and explicit non-claims.

Consumed readiness and planning documents may keep issuance-era wording
when clearly scoped (`At issuance…`, `At that stage…`, `Historical base
observation…`). Do not treat those snapshots as live routing.

---

## 13. Merge-stable documentation and reconciliation

Startup-canonical docs intended to become current through a delivery PR
should state the **final merged-tree truth** rather than narrating their
own future merge.

Avoid candidate prose such as:

```text
After this PR merges...
When this reconciliation lands...
When this PR is merged...
```

Do not require a candidate document to know its own eventual squash SHA.
Final merge SHA belongs in Git/GitHub evidence and terminal handoff unless
a later durable record is genuinely warranted.

Do not rewrite historical receipts to simulate the merged tree.

---

## 14. Qualification and terminal handoff

Qualification and release work inherit this guide plus the authorized
qualification packet.

Stop on ambiguous architecture, scope, safety, or authority questions.

After independent exact-head PASS, return to the Program Orchestrator for
exact-head merge authorization when the lane requires it. Do not merge
without that later explicit authority.

### Live effects vs historical replay

Where presentation effects observe authoritative history:

```text
baseline at current history tail
only new accepted facts trigger ephemeral effects
```

Historical reconstruction should not replay ephemeral live effects unless a
specific product contract says it should.

Muted or unavailable ephemeral effects should normally be consumed rather
than backlogged.

Undo changes authoritative state; it does not recreate or acoustically
reverse historical effects.

Presentation effects should derive semantic product meaning, not blindly
map raw event type → effect.

This is a CQS execution principle. Product cue vocabulary and mute/volume
behavior live in the accepted audio ADR, not here.

### Product invariants (execution reminder)

Permanent essentials remain:

- local-first and teacher-hosted;
- host state private and authoritative;
- projector state sanitized and read-only;
- imported content is data, never executable code;
- malformed or unknown content fails closed;
- imports use the canonical validation pipeline;
- no backend, accounts, student phones, networked buzzers, AI service, or
  required cloud dependency under current MVP canon;
- local controller support preserves the hardware-independent input
  boundary;
- the product remains usable without controllers.

Canonical product references:

- [`../PROJECT.md`](../PROJECT.md)
- [`../architecture/GAME-ENGINE-BOUNDARIES.md`](../architecture/GAME-ENGINE-BOUNDARIES.md)
