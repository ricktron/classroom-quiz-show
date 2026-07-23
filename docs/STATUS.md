# Status

**Current slice:** Slice 3 — Game & round model + registry
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
> Slice 3 is **In review**, not `Complete`: implemented on
> `claude/slice-3-game-round-registry-yjzexz` (base `main` at
> `61e1a29`), local `verify:all` green; the implementation PR is open for review.
> **Slice 4 remains unstarted and owner-gated.**

## Slice 3 work (In review)

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

Local `verify:all` passed on the Slice 3 branch: lint, typecheck, unit tests
(123 passed, 13 files), production build, and Playwright e2e (73 passed, 2 skipped
— the offline-shell test runs once on the desktop project). `git diff --check`
is clean. See [`handoff/CURRENT.md`](handoff/CURRENT.md) for exact commands and
the Slice 3 local-verification receipt under [`receipts/`](receipts/) for durable
evidence.

- CI on GitHub Actions: **Not yet observed for Slice 3** — it runs when the
  implementation PR opens; local results are recorded above and in the receipt.
- Slice 2 CI was observed green on PR #3 (head `bb8904b`).
- Pages deployment: unchanged; Slice 3 alters no deploy config.

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
  teams, reveal). Slice 3 adds only the typed game/round model + registry; the
  one registered round type is a non-gameplay placeholder.
- **Definitions are trusted in-memory objects** — the canonical JSON format and
  Zod validation/import pipeline are Slice 4. Slice 3 validates structure via a
  factory + guard only.
- **Un-ending a game is not supported** — `GAME_SESSION_ENDED` is irreversible;
  re-initialize a game to start over.
- **Event history and definitions are in-memory only** — lost on tab close.
  Durable IndexedDB persistence/recovery is Slice 8.
- **Sync is same-browser only** (BroadcastChannel, same origin). No cross-device
  sync, backend, or leader election — later/out of scope.
- The host "Foundation / testing controls" are diagnostics to prove the model,
  **not** game controls.

## Next safe action

Review the Slice 3 implementation PR. **Do not begin Slice 4** until the owner
explicitly authorizes it.
