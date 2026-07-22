# Status

**Current slice:** Slice 2 — State & event core
**Slice state:** In review

## State vocabulary

`Planned` · `In progress` · `In review` · `Complete` · `Blocked` · `Unknown`

> Slice 1 is **Complete** (merged, deployed, owner-accepted — see the post-merge
> reconciliation receipt
> [`receipts/2026-07-22-slice-1-post-merge-reconciliation.md`](receipts/2026-07-22-slice-1-post-merge-reconciliation.md)).
> Slice 2 is **In review**: the implementation PR is open and not merged. Per the
> plan, Slice 2 must not be marked `Complete` until it is merged and a post-merge
> reconciliation is recorded. **Slice 3 remains unstarted.**

## Slice 2 work (In review)

Neutral state/event/sync foundation — no gameplay. Full rationale in
[`architecture/ADR-002-state-event-sync-core.md`](architecture/ADR-002-state-event-sync-core.md).

| Item | State |
| --- | --- |
| Command-driven reducer (intent → events) | Implemented |
| Append-only event history (never edited in place) | Implemented |
| Deterministic, idempotent replay from `initial + events` | Implemented |
| Undo as append-only auditable `EVENT_UNDONE` marker | Implemented |
| Reversible vs. irreversible events distinguished | Implemented |
| Empty-history / repeated undo safe | Implemented |
| Private authoritative state vs. explicit `PublicState` types | Implemented |
| Allow-list `toPublicState` sanitizer (fail-closed) | Implemented |
| Versioned BroadcastChannel envelope + strict decode | Implemented |
| Stale/duplicate revision handling; unsupported-env no-op | Implemented |
| Host authoritative; display read-only + fail-closed | Implemented |
| Host "Foundation / testing controls" panel (not gameplay) | Implemented |
| Unit tests (reducer, sanitizer, transport, store, display) | Implemented |
| Browser tests: real two-tab BroadcastChannel sync | Implemented |
| Structural `PublicState` projector-leak assertions | Implemented |
| Documentation (ADR-002, plan, handoff, receipt) | Implemented |

### Commands / events / public fields

- **Commands:** `INIT_SESSION`, `SET_PUBLIC_STATUS`, `ADVANCE_SEQUENCE`,
  `MARK_WAITING`, `SET_HOST_NOTE`, `UNDO`.
- **Events:** `SESSION_INITIALIZED`, `PUBLIC_STATUS_SET`, `SEQUENCE_ADVANCED`,
  `WAITING_MARKED`, `HOST_NOTE_SET`, `EVENT_UNDONE`.
- **`PublicState` (allow-list):** `schemaVersion`, `revision`, `phase`,
  `headline`, `detail`. Never projected: `sessionId`, `counter`, `hostNotes`,
  `diagnostics`.

## Verification state

Local `verify:all` passed on the Slice 2 branch: lint, typecheck, unit tests
(66 passed, 8 files), production build, and Playwright e2e (58 passed, 2 skipped
— the offline-shell test runs once on the desktop project). `git diff --check`
is clean. See [`handoff/CURRENT.md`](handoff/CURRENT.md) for exact commands and
the Slice 2 receipt under [`receipts/`](receipts/) for durable evidence.

- CI on GitHub Actions: **Not yet observed for Slice 2** (runs when the PR opens).
- Pages deployment: unchanged from Slice 1; Slice 2 alters no deploy config.

## Completed work (Slice 1)

Slice 1 remains Complete. Its detailed table lived here previously; the durable
record is the post-merge reconciliation receipt
[`receipts/2026-07-22-slice-1-post-merge-reconciliation.md`](receipts/2026-07-22-slice-1-post-merge-reconciliation.md).
Headline: React + TS + Vite shell, hash routing (host/display/root/unknown),
fail-closed display error boundary, PWA + offline app shell, Pages deploy under
`/classroom-quiz-show/`, and the Vitest + Playwright suites.

## Blockers

None.

## Limitations

- No gameplay exists yet (no board, rounds, scoring, timers, teams, answer
  reveal). Slice 2 is a neutral state/event/sync foundation by design.
- **Event history is in-memory only** — state is lost on tab close. Durable
  IndexedDB persistence and recovery are Slice 8.
- **Sync is same-browser only** (BroadcastChannel, same origin). No cross-device
  sync, no backend, no leader election — those are later/out of scope.
- The host "Foundation / testing controls" are diagnostics to prove the core,
  **not** game controls.

## Next safe action

Review the Slice 2 implementation PR. **Do not merge and do not begin Slice 3**
until Slice 2 is reviewed, merged, and reconciled.
