# Slice 2 — post-merge reconciliation

Immutable evidence record reconciling the merged Slice 2 (state & event core)
with observed CI and local verification results. This receipt is append-only: do
not edit it after commit; write a new receipt if facts change. The original
Slice 2 implementation receipt
([`2026-07-22-slice-2-local-verification.md`](2026-07-22-slice-2-local-verification.md))
is preserved unchanged.

- **Slice:** Slice 2 — State & event core
- **Date:** 2026-07-22
- **Scope:** neutral state/event/synchronization foundation — a command-driven
  reducer, append-only event history, deterministic replay, auditable undo, an
  allow-list private→public `PublicState` sanitizer, and same-browser
  host/display synchronization over BroadcastChannel. **No gameplay** (no board,
  rounds, teams, scoring, timers, answer reveal) and **no persistence** — by
  design.
- **Environment:** GitHub (Actions CI + SonarCloud) and a local sandbox
  (Node 20, Vitest jsdom, Playwright vs. the production `vite preview` build
  under `/classroom-quiz-show/`).

## Merge facts (directly observed from GitHub)

| Fact | Value |
| ---- | ----- |
| Pull request | #3 (`ricktron/classroom-quiz-show`) |
| Base | `main` at `b0e5913` (after merged Slice 1 reconciliation, PR #2) |
| Implementation commit | `bb8904b8805008c42eb6ef6565d0a5afc880c45d` |
| Merge commit | `883111e1a59a07c67c64029166ba9bd017b281df` |
| Merged by | ricktron |
| Merge timestamp | 2026-07-22T23:00:07Z |
| Changed files | 35 (+2856 / −155) |

## CI results (observed on PR #3, head `bb8904b`)

Observed via the PR's check runs:

- **Lint, typecheck, unit tests, build** — success.
- **Playwright e2e** — success.
- **SonarCloud Code Analysis** — success; **Quality Gate passed**.
- **Security hotspots** — 0 (per the SonarCloud Quality Gate).
- **Review comments** — no actionable review comments. The only PR comments were
  a `cursor[bot]` free-tier upsell (Bugbot not enabled; no review performed) and
  the `sonarqubecloud[bot]` passing-gate summary. Neither required action.

## Local verification (observed on the implementation branch)

| Command | Result | Notes |
| --- | --- | --- |
| `npm ci` | pass | reproducible install |
| `npm run lint` | pass | ESLint flat config |
| `npm run typecheck` | pass | `tsc -b --noEmit` |
| `npm run test:run` | pass | 66 unit tests, 8 files |
| `npm run build` | pass | `tsc -b && vite build` |
| `npm run test:e2e` | pass | 58 passed, 2 skipped |
| `npm run verify:all` | pass | full gate green |
| `git diff --check` | pass | no whitespace/conflict markers |

- **Unit tests:** 66 passed.
- **e2e tests:** 58 passed, 2 skipped (the offline-shell test runs once on the
  desktop project; skipped on the two other viewport projects).

> The two skipped e2e tests are intentional project-scoping skips, not failures.
> Local Playwright used `PLAYWRIGHT_CHROMIUM_PATH` to point at the sandbox's
> pre-provisioned Chromium (build 1194) because `@playwright/test@1.56` expects
> build 1228; this override is environment-only and is not committed. CI installs
> the matching browser.

## Implemented state/event architecture (as merged)

- **Command-driven reducer** — commands express intent; a pure reducer produces
  events; rejected/malformed commands never mutate state.
- **Append-only event history** — events are never edited in place; state is
  derived from `initial + events`.
- **Deterministic replay** — `replay(history)` is pure and idempotent;
  `revision = history.length` (monotonic).
- **Auditable undo** — undo appends an `EVENT_UNDONE` marker referencing the
  latest reversible, not-yet-undone event; nothing is deleted; irreversible
  events are never targeted; empty/exhausted undo is a safe no-op.
- **Allow-list `PublicState` sanitizer** — `toPublicState` constructs each public
  field explicitly (no clone-and-delete, no spread, no serialization of private
  state); a future private field cannot leak by default; `safeToPublicState`
  fails closed on projection failure.
- **Host-authoritative BroadcastChannel synchronization** — the host broadcasts
  sanitized snapshots and answers `request-state`; the display is read-only and
  cannot modify host state.
- **Stale and duplicate revision handling** — the display advances only on a
  strictly-newer revision via a monotonic watermark; duplicates and stale
  revisions are ignored.
- **Fail-closed decoding and projection** — the versioned envelope decoder is
  strict and total (non-object / wrong-protocol / unsupported-version /
  unknown-type / malformed-payload all reject); projection failure falls back to
  the safe initial public state; unsupported BroadcastChannel degrades to a safe
  no-op.

## Known limitations

- **In-memory history only** — event history is not persisted; state is lost on
  tab close. Durable persistence and recovery are Slice 8.
- **Same-browser synchronization only** — BroadcastChannel, same origin. No
  cross-device transport, no backend, no leader election.
- **No gameplay** — no board, rounds, teams, scoring, timers, answer reveal,
  wagers, media, or theme engine.
- **No Slice 3 implementation** — no game/round model or registry exists yet.

## Evidence-language note

CI and merge facts above were **observed** from GitHub (check runs + PR
metadata). Local verification was observed in the sandbox against the production
**build artifact** served by `vite preview` — **not** the live `github.io`
origin. No post-merge production/deployed-site behavior was tested as part of
this reconciliation, and none is claimed. Slice 2 changes no deployment
configuration.

## Application code changes

**None.** This reconciliation is documentation and receipts only; no application
behavior, tests, dependencies, workflows, or runtime configuration changed.

## Final disposition

Slice 2 is **Complete**: implementation merged (PR #3, merge commit `883111e`),
CI green (build + e2e jobs success, SonarCloud Quality Gate passed, 0 security
hotspots, no actionable review comments), and local verification green. **Slice 3
remains unstarted and owner-gated.**
