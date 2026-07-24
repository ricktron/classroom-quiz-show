# Status

**Current slice:** Slice 4 — Validation & import pipeline
**Slice state:** In review

## State vocabulary

`Planned` · `In progress` · `In review` · `Complete` · `Blocked` · `Unknown`

> Slice 1 is **Complete** (merged, deployed, owner-accepted — see the post-merge
> reconciliation receipt
> [`receipts/2026-07-22-slice-1-post-merge-reconciliation.md`](receipts/2026-07-22-slice-1-post-merge-reconciliation.md)).
> Slice 2 is **Complete**: implementation PR #3 was merged to `main` (merge
> commit `883111e`, merged 2026-07-22T23:00:07Z) with CI green, and the post-merge
> reconciliation is recorded in
> [`receipts/2026-07-22-slice-2-post-merge-reconciliation.md`](receipts/2026-07-22-slice-2-post-merge-reconciliation.md).
> Slice 3 is **Complete**: implementation PR #5 was merged to `main` (merge
> commit `01070c8`, merged 2026-07-23T19:18:32Z) with CI green (final reviewed
> head `464ef07`), and the post-merge reconciliation is recorded in
> [`receipts/2026-07-23-slice-3-post-merge-reconciliation.md`](receipts/2026-07-23-slice-3-post-merge-reconciliation.md).
> Slice 4 is **In review**, not `Complete`: it is implemented and locally
> verified on `claude/slice-4-validation-import-pynvab` (base `main`
> `349bff72f471c798df8a902a6a3c4c3eae2e17a5`), but the implementation PR has not
> been reviewed, has not been observed green in CI, and has not been merged.
> **Slice 5 remains unstarted and owner-gated.**

## Slice 4 work (In review)

The canonical versioned JSON game-file format and the single Zod-based
validation / normalization import pipeline — **no gameplay**. Full rationale in
[`architecture/ADR-004-canonical-validation-import.md`](architecture/ADR-004-canonical-validation-import.md);
local evidence in
[`receipts/2026-07-24-slice-4-local-verification.md`](receipts/2026-07-24-slice-4-local-verification.md).

| Item | State |
| --- | --- |
| Canonical versioned JSON format (`format` + `schemaVersion` discriminators) | Implemented |
| One authoritative pipeline every import entry point converges on | Implemented |
| Explicit version policy (missing/malformed/older/newer all fail; no guessing) | Implemented |
| Strict Zod schemas; unknown keys rejected, not dropped; zero coercion | Implemented |
| Pre-Zod document safety scan (reserved keys, non-data, non-finite, cycles, depth) | Implemented |
| Semantic validation (unique round ids, non-blank titles, bounds) | Implemented |
| Registry `configSchema` — one config validation path per known round type | Implemented |
| Unknown round type **fails import** (distinct from Slice 3 runtime fail-closed) | Implemented |
| Narrow, lossless normalization; **no silent repair**; input never mutated | Implemented |
| Structured `ImportIssue` model (stable codes, stages, paths, actionable messages) | Implemented |
| Discriminated `ImportResult`; no exceptions for ordinary invalid input | Implemented |
| Internal failures contained behind a safe generic issue (no stack traces) | Implemented |
| Host-only paste/import harness with structured result panel | Implemented |
| Invalid import mutates no state/event/revision/sync/`PublicState`/display | Implemented |
| Valid import loads only through the existing `INITIALIZE_GAME` command | Implemented |
| Unit, component and browser tests; docs (ADR-004, plan, handoff, receipt) | Implemented |

### Canonical format (version 1)

```jsonc
{
  "format": "classroom-quiz-show/game",
  "schemaVersion": 1,
  "id": "sample-foundation-game",
  "title": "Foundation Sample Game",
  "rounds": [{ "id": "round-1", "type": "placeholder", "title": "Round One",
               "config": { "note": "…" } }]
}
```

Pipeline stages (also the issue-report order): `transport` · `json-parse` ·
`format` · `version` · `semantic` · `schema` · `registry` · `construction`.

**Not added to `PublicState`:** import status, filenames, raw titles, error
paths, schema diagnostics, or registry internals. `PublicState` is unchanged by
Slice 4 (still wire version 2).

## Slice 3 work (Complete)

Typed game & round model + non-executable round registry — no gameplay. Full
rationale in
[`architecture/ADR-003-game-round-model-registry.md`](architecture/ADR-003-game-round-model-registry.md);
local evidence in
[`receipts/2026-07-23-slice-3-local-verification.md`](receipts/2026-07-23-slice-3-local-verification.md).

| Item | State |
| --- | --- |
| Branded ids (`GameId`/`RoundId`/`RoundType`/`GameSessionId`) | Implemented |
| `GameDefinition` factory (unique ids, ordered rounds, deep-frozen) | Implemented |
| Typed `RoundDefinition` + data-only `RoundConfig` (forbids functions) | Implemented |
| Round registry (explicit known/unknown, duplicate error, no fallback) | Implemented |
| No executable-import path (no eval / dynamic import / plugins) | Implemented |
| `GameSession` (`PrivateGameState`) distinct from the definition | Implemented |
| Game commands/events + deterministic replay + undo | Implemented |
| Unknown-round-type fail-closed (host diagnostic + safe display) | Implemented |
| Allow-listed `PublicGameView` (version 1 → 2); no definition/registry leak | Implemented |
| Host foundation game controls + host-only diagnostics (not gameplay) | Implemented |
| Display shows only safe round status (read-only, fail closed) | Implemented |
| Unit + browser tests; docs (ADR-003, plan, handoff, receipt) | Implemented |

### Commands / events / public fields (added in Slice 3)

- **Commands:** `INITIALIZE_GAME`, `SELECT_ROUND`, `ADVANCE_TO_NEXT_ROUND`,
  `END_GAME_SESSION`.
- **Events:** `GAME_INITIALIZED` (irrev.), `CURRENT_ROUND_SELECTED` (rev.),
  `ROUND_ADVANCED` (rev.), `GAME_SESSION_ENDED` (irrev.).
- **`PublicState` (added):** `game: PublicGameView | null` — `status`,
  `roundCount`, `currentRound`, `roundAvailability`. Never projected: the full
  definition, round ids/types/titles, round config, host diagnostics.

## Slice 2 work (Complete)

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

Local `verify:all` passed on the Slice 4 branch: lint, typecheck, unit tests
(249 passed, 20 files), production build, and Playwright e2e (97 passed, 2 skipped
— the offline-shell test runs once on the desktop project). `git diff --check`
is clean. See [`handoff/CURRENT.md`](handoff/CURRENT.md) for exact commands and
the Slice 4 receipt under [`receipts/`](receipts/) for durable evidence.

- CI on GitHub Actions for Slice 4: **not yet observed** — the implementation PR
  was opened at the end of this slice and no run had concluded at the time of
  writing. This is one of the reasons Slice 4 is `In review`.
- Slice 3 CI was observed green on PR #5 (final reviewed head `464ef07`) — both
  jobs succeeded and the SonarCloud Quality Gate passed (0 security hotspots).
- Pages deployment: unchanged; Slice 4 alters no deploy config.

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

- **No gameplay exists yet** (no board, questions, answers, scoring, timers,
  teams, reveal). Slice 4 adds only ingestion; the one registered round type is
  still a non-gameplay placeholder and the app is **not** playable.
- **One schema version, no migrations.** `schemaVersion: 1` only. An older or
  newer version fails by design; a v2 will need a real, tested migration.
- **Paste is the only import transport.** No `.json` file picker, spreadsheet /
  CSV / XLSX import, remote URL import, or backend upload (later slices; each
  must converge on the same pipeline).
- **The import size guard counts characters, not bytes**, and applies only to the
  text entry point; the object entry point is bounded by nesting depth and the
  round/title/id limits.
- **Duplicate JSON keys are not observable** — `JSON.parse` keeps the last
  occurrence and the pipeline validates the survivor. Documented behaviour, not
  a claimed defence.
- **The placeholder round's config schema is intentionally trivial** (one `note`
  string). It proves the registry seam; it is not a preview of `category-board`.
- **Un-ending a game is not supported** — `GAME_SESSION_ENDED` is irreversible;
  re-initialize a game to start over.
- **Event history and definitions are in-memory only** — lost on tab close.
  Durable IndexedDB persistence/recovery is Slice 8.
- **Sync is same-browser only** (BroadcastChannel, same origin). No cross-device
  sync, backend, or leader election — later/out of scope.
- The host "Foundation / testing controls" are diagnostics to prove the model,
  **not** game controls.

## Next safe action

Review the Slice 4 implementation PR. **Do not begin Slice 5** until Slice 4 is
reviewed, observed green in CI, merged, and reconciled.
