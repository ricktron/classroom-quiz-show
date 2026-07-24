# Slice 3 — post-merge reconciliation

Immutable evidence record reconciling the merged Slice 3 (game & round model +
registry) with observed CI and local verification results. This receipt is
append-only: do not edit it after commit; write a new receipt if facts change.
The original Slice 3 implementation receipt
([`2026-07-23-slice-3-local-verification.md`](2026-07-23-slice-3-local-verification.md))
and all prior receipts are preserved unchanged.

- **Slice:** Slice 3 — Game & round model + registry
- **Date:** 2026-07-23
- **Scope:** the typed game & round domain model plus a non-executable round
  registry scaffold, built on the Slice 2 state/event/sync core — separate
  `GameDefinition` / `GameSession` models, typed `RoundDefinition` values, an
  application-controlled registry with explicit known/unknown lookup, and
  unknown-round-type fail-closed handling. **No gameplay** (no board, questions,
  answers, scoring, teams, timers, reveal) and **no persistence** — by design.
  One deliberately non-gameplay placeholder round type is registered.
- **Environment:** GitHub (Actions CI + SonarCloud) and a local sandbox
  (Node 20, Vitest jsdom, Playwright vs. the production `vite preview` build
  under `/classroom-quiz-show/`).

## Merge facts (directly observed from GitHub / git)

| Fact | Value |
| ---- | ----- |
| Pull request | #5 (`ricktron/classroom-quiz-show`) |
| Base | `main` at `61e1a29548e8735886c3637e5c2e521ff6ee6db4` (after merged Slice 2 reconciliation, PR #4) |
| Original implementation commit | `7ac2466f39c90c0786070cfea1bb8a32e5df2965` |
| Final reviewed implementation commit | `464ef07c165012e178687323ff94f4136ba4094e` |
| Merge commit | `01070c857b8b44e8c1ff51f75b451c8c9ff58718` |
| Merged by | ricktron |
| Merge timestamp | 2026-07-23T19:18:32Z (2026-07-23T11:18:32-08:00) |

## CI results (observed on PR #5, final reviewed head `464ef07`)

Observed via the PR's check runs:

- **Lint, typecheck, unit tests, build** — success.
- **Playwright e2e** — success.
- **SonarCloud Code Analysis** — success; **Quality Gate passed**.
- **Security hotspots** — 0 (per the SonarCloud Quality Gate).
- **Review comments** — no actionable review comments. The only PR comments were
  a `cursor[bot]` free-tier upsell (Bugbot not enabled; no review performed) and
  the `sonarqubecloud[bot]` passing-gate summaries. Neither required action.

## Local verification (observed on the implementation branch)

| Command | Result | Notes |
| --- | --- | --- |
| `npm ci` | pass | reproducible install |
| `npm run lint` | pass | ESLint flat config |
| `npm run typecheck` | pass | `tsc -b --noEmit` |
| `npm run test:run` | pass | 123 unit tests, 13 files |
| `npm run build` | pass | `tsc -b && vite build` |
| `npm run test:e2e` | pass | 73 passed, 2 skipped |
| `npm run verify:all` | pass | full gate green |
| `git diff --check` | pass | no whitespace/conflict markers |

- **Unit tests:** 123 passed.
- **e2e tests:** 73 passed, 2 skipped (the offline-shell test runs once on the
  desktop project; skipped on the two other viewport projects). The 2 skips are
  intentional project-scoping skips, not failures.

> Local Playwright used `PLAYWRIGHT_CHROMIUM_PATH` to point at the sandbox's
> pre-provisioned Chromium (build 1194) because `@playwright/test@1.56` expects
> build 1228; this override is environment-only and is not committed. CI installs
> the matching browser.

## SonarCloud readability repair (observed)

During review, a nested ternary in the sanitizer's public game projection was
replaced by a named pure helper, `roundAvailabilityOf`. Behavior was preserved
(identical projection output, covered by the existing sanitizer tests). After
that change, SonarCloud's reported new-code issue count dropped from 7 to 6 with
the Quality Gate still passing and 0 security hotspots. The remaining issues were
non-blocking informational code smells; they were **not** individually enumerated
here (the SonarCloud issues API requires authentication).

## Implemented architecture (as merged)

- **Separate `GameDefinition` and `GameSession` models** — the authored,
  immutable definition is distinct from runtime session progress.
- **Ordered, typed `RoundDefinition` values** — array position is the canonical
  round order; the base model assumes no gameplay specifics.
- **Stable `GameId` and `RoundId` types** (branded identifiers; `RoundType` is an
  open branded string so unknown types are representable).
- **Deep-frozen, trusted in-memory definitions** — the `createGameDefinition`
  factory validates structure, enforces unique round ids, and deep-freezes the
  result so a session cannot mutate it.
- **Application-controlled, non-executable round registry** — no eval, no dynamic
  import, no plugin loading, no code sourced from content.
- **Explicit known/unknown registry lookup** — a discriminated result, never a
  thrown miss.
- **Duplicate registration rejection** — `register` throws `RegistryError` on a
  duplicate type.
- **No silent round-type fallback** — an unknown type never resolves to a default.
- **Deterministic session initialization, selection, advancement, replay, and
  undo** — round support is frozen onto the event at plan time, so replay needs
  no registry; reversible selection/advance undo via the append-only
  `EVENT_UNDONE` marker; init/end are irreversible.
- **Unknown-round-type fail-closed behavior** — host-only diagnostic, neutral
  "unavailable" display, no substitution, no crash, no leak.
- **Allow-listed `PublicState` game projection** — a minimal derived
  `PublicGameView`; the definition, round ids/types/titles, and config never
  cross the boundary.
- **Host-only diagnostics** and **neutral, read-only display behavior**.
- **Wire protocol version 2** — the `PublicState` schema version bumped 1 → 2, so
  a display expecting the old shape fails closed.

## Commands and events added (as merged)

- `INITIALIZE_GAME` → `GAME_INITIALIZED` (irreversible)
- `SELECT_ROUND` → `CURRENT_ROUND_SELECTED` (reversible)
- `ADVANCE_TO_NEXT_ROUND` → `ROUND_ADVANCED` (reversible)
- `END_GAME_SESSION` → `GAME_SESSION_ENDED` (irreversible)

## Known limitations

- **Definitions remain trusted in-memory objects** — no Zod or canonical import
  pipeline (Slice 4).
- **No playable round** — only the non-gameplay placeholder type is registered.
- **No persistence** — definitions and event history are in-memory only (Slice 8).
- **Same-browser synchronization only** — BroadcastChannel, same origin.
- **Minimal round runtime-state scaffold** — real round engines arrive from
  Slice 5.
- **Ending a game remains irreversible** — re-initialize a game to start over.

## Evidence-language note

CI and merge facts above were **observed** from GitHub (check runs + PR metadata)
and from git. Local verification was observed in the sandbox against the
production **build artifact** served by `vite preview` — **not** the live
`github.io` origin. No post-merge production/deployed-site behavior was tested as
part of this reconciliation, and none is claimed. Slice 3 changes no deployment
configuration.

## Application code changes

**None.** This reconciliation is documentation and receipts only; no application
behavior, tests, dependencies, workflows, or runtime configuration changed. No
application behavior was changed by this reconciliation.

## Final disposition

Slice 3 is **Complete**: implementation merged (PR #5, merge commit `01070c8`),
CI green (build + e2e jobs success, SonarCloud Quality Gate passed, 0 security
hotspots, no actionable review comments), and local verification green. **Slice 4
remains unstarted and owner-gated.**
