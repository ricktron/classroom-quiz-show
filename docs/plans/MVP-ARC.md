# MVP Arc — Classroom Quiz Show

This document records the approved planning packet, the round-based engine
direction, and the slice sequence. It is the durable plan of record in this
repository. It does **not** silently rewrite the approved plan; it incorporates
the round-based engine direction into it.

## Product direction (approved)

Classroom Quiz Show is a **reusable, local-first classroom game-show engine**,
not a one-off Jeopardy clone. A game is an **ordered collection of typed
rounds**; the category-and-point-value board is the first round type. The host
owns authoritative private state; the display renders only sanitized public
state. See [`../architecture/GAME-ENGINE-BOUNDARIES.md`](../architecture/GAME-ENGINE-BOUNDARIES.md).

### Approved technical direction

React · TypeScript · Vite · PWA · static GitHub Pages · separate host/display
routes · canonical versioned JSON game files · spreadsheet import later · Zod
validation later on every import path · BroadcastChannel later for same-device
host/display sync · IndexedDB later for durable local persistence · lightweight
leader coordination later · command-driven reducer · append-only event history ·
replay/undo derived from events · explicit private→public sanitization ·
fail-closed projector behavior.

Slice 1 preserves these decisions **without** prematurely implementing the later
systems.

## Slice sequence (11-slice plan)

> This ordering is the plan of record. Later slices must not be started until
> the current slice is accepted. Details for slices 2–11 are intentionally
> high-level and will be refined when each is picked up; they must not be
> silently rewritten.

| #   | Slice                          | Focus (summary)                                                                 | Depends on |
| --- | ------------------------------ | ------------------------------------------------------------------------------- | ---------- |
| 1   | **Foundation**                 | App shell, routing, PWA, safety boundaries, tests, deploy, docs.                | —          |
| 2   | **State & event core**         | Command-driven reducer, append-only event history, undo/replay, private/public `PublicState` types + `toPublicState` sanitizer, host/display sync (BroadcastChannel), fail-closed decoding. | 1          |
| 3   | **Game & round model + registry** | `GameDefinition` / `GameSession` types, typed `RoundDefinition`, round registry scaffold, unknown-type fail-closed handling. **(Complete.)** | 2          |
| 4   | **Validation & import pipeline** | Canonical versioned JSON, one Zod-based validation/normalization pipeline, actionable errors, no silent repair. | 3          |
| 5   | **Category-board round**       | First playable round type: configurable categories/rows/ladder, multiplier, used-tile state, prompt/answer reveal, alternates, notes. | 3, 4       |
| 6   | **Teams & scoring**            | Teams, typed scoring strategy (points first), awards/deductions, partial credit, unrestricted manual correction, audit history, undo. | 2, 5       |
| 7   | **Timers & transitions**       | Timer config, public timer, host-controlled undoable round transitions, reduced-motion-safe. | 5, 6       |
| 8   | **Persistence & recovery**     | IndexedDB durable local persistence, session recovery, lightweight leader coordination. | 2          |
| 9   | **Final-wager round**          | Public prompt, host-entered/private wagers, timed response, reveal, settlement, tie handling. | 5, 6, 7    |
| 10  | **Media & theme boundaries**   | Typed media model (beyond text), theme system (presentation-only), accessibility/high-contrast theme. | 5          |
| 11  | **Authoring & packs**          | Content authoring, spreadsheet import convenience, complete portable game packs, standards tags. | 4, 5       |

Additional round engines (image-identification, timeline-ordering, matching,
data-interpretation, concept-map, claim-evidence-reasoning, whiteboard-challenge,
custom) are added as registered round types after the engine core (slices 2–7)
is stable, each behind the registry from slice 3.

## Slice 1 — scope, acceptance, non-goals

### Scope (implemented)

1. React + TypeScript + Vite project.
2. Documented GitHub Pages routing strategy (hash routing; ADR-001).
3. Separate host and display routes.
4. Safe placeholder screens for both routes.
5. Safe root entry (role picker) and safe unknown-route screen.
6. PWA foundation + installable metadata + offline app shell.
7. Static GitHub Pages deployment configuration under `/classroom-quiz-show/`.
8. Lint, typecheck, unit/component tests, browser tests.
9. Repository + architecture + governance documentation.
10. Handoff / status / decisions / receipts structure.

### Acceptance criteria

The 40 Slice 1 acceptance criteria are tracked to pass/fail in the
implementation PR description and summarized in [`../STATUS.md`](../STATUS.md).
Headline gates: local `verify:all` passes; host/display/unknown routes work
under the Pages base path with refresh; display leaks no private content and
fails closed; PWA manifest valid + offline shell cached; CI and Pages deploy
configured.

**Status: accepted.** Slice 1 was merged (PR #1, merge commit `e0bfb14`),
CI ran green, and the Pages deployment completed successfully
(2026-07-22T03:41:51Z) at https://ricktron.github.io/classroom-quiz-show/. The
owner observed the live root/host/display routes rendering, and production-
artifact adversarial QA found no Slice 1 defects. Evidence and the owner-live vs.
sandbox-artifact distinction are recorded in
[`../receipts/2026-07-22-slice-1-post-merge-reconciliation.md`](../receipts/2026-07-22-slice-1-post-merge-reconciliation.md).

**Slice 2 is Complete** (merged to `main` via PR #3, merge commit `883111e`; see
the Slice 2 section below).

### Explicit non-goals (Slice 1)

Board/round engines, round-registry runtime, schemas, Zod, spreadsheet import,
teams, scoring, partial credit, timers, answer reveal, BroadcastChannel,
IndexedDB, leader locking, event log, reducer/commands, undo, final wager, media
pipeline, theme engine, soundboard, random events, presentation APIs,
whiteboard/concept-map/timeline interactions, analytics, buzzers, WebSockets,
backend, accounts, grading, AI, and multiple playable round types.

## Slice 2 — scope, acceptance, non-goals

**State: Complete.** Implementation PR #3 was merged to `main` (merge commit
`883111e`, merged 2026-07-22T23:00:07Z) with CI green; post-merge reconciliation
is recorded in [`../receipts/2026-07-22-slice-2-post-merge-reconciliation.md`](../receipts/2026-07-22-slice-2-post-merge-reconciliation.md).
Full technical rationale is in [`../architecture/ADR-002-state-event-sync-core.md`](../architecture/ADR-002-state-event-sync-core.md).

### Scope (implemented)

1. **Command-driven reducer** — commands express intent; a pure reducer produces
   events. Rejected/malformed commands never mutate state.
2. **Append-only event history** — events are never edited in place; state is
   derived by replaying `initial + events`.
3. **Replay & undo** — deterministic, idempotent replay; undo is an append-only,
   auditable `EVENT_UNDONE` marker (no history deletion); reversible vs.
   irreversible events distinguished; empty-history undo is a safe no-op.
4. **Private authoritative state** vs. **explicit `PublicState`** types.
5. **Allow-list `toPublicState` sanitizer** — constructs public fields
   explicitly; no clone-and-delete, no spread, no serialization of private
   state; future private fields cannot leak; projection failure fails closed.
6. **Same-device host/display sync (BroadcastChannel)** — versioned envelope;
   host authoritative; display read-only; stale/duplicate revisions ignored;
   unknown version/type/malformed messages fail closed; unsupported environments
   degrade to a safe no-op.
7. **Conservative host/display integration** — a clearly-labeled host
   "Foundation / testing controls" panel proves the core; the display renders
   only sanitized public state and stays non-interactive and fail-closed.

Commands: `INIT_SESSION`, `SET_PUBLIC_STATUS`, `ADVANCE_SEQUENCE`,
`MARK_WAITING`, `SET_HOST_NOTE`, `UNDO`. Events: `SESSION_INITIALIZED`,
`PUBLIC_STATUS_SET`, `SEQUENCE_ADVANCED`, `WAITING_MARKED`, `HOST_NOTE_SET`,
`EVENT_UNDONE`. `PublicState` fields: `schemaVersion`, `revision`, `phase`,
`headline`, `detail`.

### Acceptance criteria

Local `verify:all` passes (lint, typecheck, unit, build, e2e). Unit tests cover
reducer/replay/undo determinism, allow-list projection (incl. future-field
non-leak), the four fail-closed categories, and transport ordering/degradation;
browser tests exercise real two-tab BroadcastChannel sync, host authority, and
fail-closed decoding. The projector-leak, routing, PWA/offline, responsive, and
accessibility suites remain green.

### Explicit non-goals (Slice 2)

No gameplay of any kind: no game/round model or registry (Slice 3), no
validation/import pipeline or Zod (Slice 4), no board/round engine (Slice 5), no
teams/scoring (Slice 6), no timers/transitions (Slice 7), no durable IndexedDB
persistence or leader coordination (Slice 8), no final wager (Slice 9), no
media/theme engine (Slice 10), no authoring/packs (Slice 11). No tile selection,
answer reveal, team assignment, scoring, wagers, or gameplay commands. No
WebSockets, backend, cross-device sync, authentication, or analytics.

### What remains for Slice 3

Game & round model + registry: `GameDefinition` / `GameSession` types, typed
`RoundDefinition`, a round-registry scaffold, and unknown-round-type fail-closed
handling — built on top of this state/event/sync core.

## Slice 3 — scope, acceptance, non-goals

**State: Complete.** Implemented on `claude/slice-3-game-round-registry-yjzexz`
on top of `main` at `61e1a29548e8735886c3637e5c2e521ff6ee6db4`, and merged to
`main` via **PR #5** (merge commit `01070c8`, merged 2026-07-23T19:18:32Z) with
CI green; post-merge reconciliation recorded in
[`../receipts/2026-07-23-slice-3-post-merge-reconciliation.md`](../receipts/2026-07-23-slice-3-post-merge-reconciliation.md).
Full technical rationale in
[`../architecture/ADR-003-game-round-model-registry.md`](../architecture/ADR-003-game-round-model-registry.md).

### Scope (implemented)

1. **Branded identifiers** — `GameId`, `RoundId`, `RoundType`, `GameSessionId`
   (compile-time brands over plain strings; `RoundType` open, not a closed union).
2. **`GameDefinition`** — immutable authored data (`modelVersion`, `id`, `title`,
   ordered `RoundDefinition[]`); trusted factory enforces non-empty id/title,
   valid rounds, **unique round ids**, and **deep-freezes** the result; empty
   rounds explicitly allowed.
3. **Typed `RoundDefinition`** — stable id, open `RoundType`, and data-only
   `config` (`RoundConfig`/`DataValue` forbids functions). One non-gameplay
   **placeholder** type only.
4. **Round registry scaffold** — application-controlled table with explicit
   known/unknown lookup, duplicate-registration error, no fallback, and **no
   code execution / dynamic import / eval**. Order comes from the definition.
5. **`GameSession`** — runtime progress (`PrivateGameState`: frozen definition
   snapshot, `gameLifecycle`, `currentRoundIndex`, `currentRoundSupport`),
   distinct from the definition it references.
6. **Command/event additions** — `INITIALIZE_GAME`/`GAME_INITIALIZED`,
   `SELECT_ROUND`/`CURRENT_ROUND_SELECTED`, `ADVANCE_TO_NEXT_ROUND`/
   `ROUND_ADVANCED`, `END_GAME_SESSION`/`GAME_SESSION_ENDED`. Round support is
   frozen onto the event at plan time so replay stays deterministic without the
   registry; selection/advance are reversible, init/end irreversible.
7. **`PublicState` addition** — one allow-listed `game: PublicGameView | null`
   (`status`, `roundCount`, 1-based `currentRound`, neutral `roundAvailability`);
   wire version bumped 1 → 2. Never carries title, round ids/types, or config.
8. **Unknown-type fail-closed** — host-only diagnostic; neutral "unavailable"
   display; no substitution; no crash; deterministic replay; no leak.
9. **Host/display integration** — foundation game controls + host-only
   diagnostics (not gameplay); the display shows only safe round status.

Commands added: `INITIALIZE_GAME`, `SELECT_ROUND`, `ADVANCE_TO_NEXT_ROUND`,
`END_GAME_SESSION`. Events added: `GAME_INITIALIZED`, `CURRENT_ROUND_SELECTED`,
`ROUND_ADVANCED`, `GAME_SESSION_ENDED`. `PublicState` gains `game`.

### Acceptance criteria

Local `verify:all` passes (lint, typecheck, 123 unit tests, build, 73 e2e
passed / 2 skipped). Coverage: deterministic ordered rounds, unique/duplicate
round-id enforcement, empty-round behavior, deep-freeze immutability through
session ops; registry known/unknown/duplicate/no-fallback/no-mutation/no-exec;
game command/event determinism, rejection-no-mutation, replay determinism +
idempotency, undo/audit; unknown-type fail-closed at init/select/advance/replay/
projection/sync/display; exact allow-listed public projection with no definition/
registry/diagnostic leak. Existing Slice 1/2 routing, PWA/offline, projector-
leak, responsive, accessibility, and sync suites remain green.

### Explicit non-goals (Slice 3)

No Slice 4+ work: no Zod, canonical JSON import, schema validation/normalization,
file/spreadsheet upload; no category-board or any playable round, questions,
answers, tile selection; no scoring, teams, timers, transitions; no persistence/
IndexedDB, leader coordination; no final wager, media pipeline, theme engine,
content authoring, game packs; no remote plugins or executable imported code; no
backend or cross-device sync. The app is **not** made playable in Slice 3.

### What remains for Slice 4

Validation & import pipeline: the canonical versioned JSON game format and one
Zod-based validation/normalization pipeline on every import path, with actionable
errors and no silent repair — feeding trusted `GameDefinition`s into this model.

## Dependencies & risks

- **GitHub Pages base path** must stay correct across assets, manifest, SW
  scope, and links — covered by ADR-001 and e2e base-path tests.
- **Private/public boundary** is a permanent invariant; the allow-list
  `toPublicState` sanitizer landed in Slice 2 (ADR-002) and is now backed by
  structural `PublicState` assertions in addition to the baseline projector-leak
  string checks.
- **No executable imported code** — the registry half landed in Slice 3
  (ADR-003): `RoundConfig`/`DataValue` forbids functions in content, the registry
  has no eval/dynamic-import/plugin surface, and tests assert both. The import
  pipeline half (Zod validation on every import path) lands in Slice 4.
