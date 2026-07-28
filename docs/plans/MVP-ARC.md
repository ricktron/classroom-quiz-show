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

## Slice sequence (18-slice plan, amended)

> This ordering is the plan of record. Later slices must not be started until
> the current slice is accepted. Details for future slices are intentionally
> high-level and will be refined when each is picked up; they must not be
> silently rewritten.
>
> **Amended 2026-07-26 by `ROADMAP-AMENDMENT-001`.** The original plan had 11
> slices. Slices 1–6 are unchanged and `Complete`; former slices 7–11 have been
> re-scoped, decomposed and reordered into slices 7–18 to accommodate
> owner-authorized **local host-attached USB buzzers** and to pull the media
> contract ahead of any new round type. This was **not** a silent rewrite: the
> full rationale, the dependency analysis, the superseded statements, and the
> open owner gates are recorded in
> [`../decisions/ROADMAP-AMENDMENT-001-local-buzzers.md`](../decisions/ROADMAP-AMENDMENT-001-local-buzzers.md).

| #   | Slice                          | Focus (summary)                                                                 | Depends on |
| --- | ------------------------------ | ------------------------------------------------------------------------------- | ---------- |
| 1   | **Foundation**                 | App shell, routing, PWA, safety boundaries, tests, deploy, docs.                | —          |
| 2   | **State & event core**         | Command-driven reducer, append-only event history, undo/replay, private/public `PublicState` types + `toPublicState` sanitizer, host/display sync (BroadcastChannel), fail-closed decoding. | 1          |
| 3   | **Game & round model + registry** | `GameDefinition` / `GameSession` types, typed `RoundDefinition`, round registry scaffold, unknown-type fail-closed handling. **(Complete.)** | 2          |
| 4   | **Validation & import pipeline** | Canonical versioned JSON, one Zod-based validation/normalization pipeline, actionable errors, no silent repair. **(Complete.)** | 3          |
| 5   | **Category-board round**       | First playable round type: configurable categories/rows/ladder, multiplier, used-tile state, prompt/answer reveal, alternates, notes. **(Complete.)** | 3, 4       |
| 6   | **Teams & scoring**            | Teams, typed scoring strategy (points first), awards/deductions, partial credit, unrestricted manual correction, audit history, undo. **(Complete.)** | 2, 5       |
| 7   | **Timers, arming & transitions** | Timer config, a deadline-projected public timer, host arming/disarming, host-controlled undoable round transitions, reduced-motion-safe. The interrupt seam must be typed so buzz-in is a later addition, not a rewrite. **(Complete.)** | 5, 6 |
| 8   | **Local input contract & keyboard buzz-in** | The device-independent input-adapter boundary + registry, buzz-in domain semantics, one command/event pair, replay-derived queue state, sanitized public projection — with the **keyboard adapter** as its first consumer. **(Complete — delivered without the anticipated adapter *registry* object; a bounded application-only input-source union ships its guarantees instead. See ADR-008 §3.)** | 2, 6, 7 |
| 9   | **Generic Gamepad adapter**    | Gamepad API adapter behind the slice 8 boundary; connect/disconnect handling, polling isolation, host diagnostics. No model-specific assumptions. **(Complete — merged via PR #19 (`d16f90d`). No schema, `PublicState`, protocol, command, event or reducer change. No physical controller was tested. See ADR-009.)** | 8 |
| 10  | **Sony Buzz! mapping, validation & host setup UX** | Configurable controller mapping, Sony Buzz! candidate classification and capture recipe, host setup/test surface, fallback when no controller is present. **(Complete — squash-merged via PR #21 (`5575be3`) from reviewed head `2885933`. Hardware-independent scope; physical certification deferred; no compatibility claim. See ADR-010.)** | 9 |
| 11  | **Media contract**             | Typed media model (beyond plain-string prompts), fail-closed on unsupported media, additive on `schemaVersion: 1`. **(Complete — squash-merged via PR #23 (`5d47b2f`) from reviewed head `bb8bd94`. Public wire 7; sync 2; schema 1. See ADR-011.)** | 4, 5 |
| 12  | **Portable export & round-trip import** | Export a game to the canonical portable document and re-import it losslessly; reproducible game identity; round-trip equality as an acceptance criterion. **Planned; unstarted.** | 4, 11 |
| 13  | **Local persistence & recovery** | IndexedDB durable local storage, session recovery after refresh, saved definitions kept distinct from active session state, lightweight leader coordination. | 2, 12 |
| 14  | **Final-wager round**          | Public prompt, host-entered/private wagers, timed response, reveal, settlement, tie handling. | 5, 6, 7, 11 |
| 15  | **Session summary & compatible-profile reporting** | Per-session result summary from replay; normalized metrics; cross-session comparison behind a stable competitive-profile identifier. | 6, 13 |
| 16  | **Theme engine**               | Presentation-only theme system, accessibility/high-contrast theme. Never alters scoring, validation, event semantics or the privacy boundary. | 5 |
| 17  | **Authoring & packs**          | Content authoring, spreadsheet import convenience, complete portable game packs, standards tags. | 4, 5, 12 |
| 18  | **Release readiness**          | Accessibility audit, polish, documentation completeness, deployment verification. | all |

Additional round engines (image-identification, timeline-ordering, matching,
data-interpretation, concept-map, claim-evidence-reasoning, whiteboard-challenge,
custom) are added as registered round types after the engine core is stable, each
behind the registry from slice 3 — and, per `ROADMAP-AMENDMENT-001` §5.8,
**after the media contract (slice 11)**, so a new round type is not built on the
assumption that a prompt is a plain string.

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

## Slice 4 — scope, acceptance, non-goals

**State: Complete.** Implemented on `claude/slice-4-validation-import-pynvab`
on top of `main` at `349bff72f471c798df8a902a6a3c4c3eae2e17a5` (after the merged
Slice 3 post-merge reconciliation, PR #6), and merged to `main` via **PR #7**
(merge commit `5295e83`, merged 2026-07-25T20:14:42Z; final reviewed head
`8ce850c`). Post-merge CI on `main` green and the Pages deployment succeeded;
post-merge reconciliation recorded in
[`../receipts/2026-07-25-slice-4-post-merge-reconciliation.md`](../receipts/2026-07-25-slice-4-post-merge-reconciliation.md).
Full technical rationale in
[`../architecture/ADR-004-canonical-validation-import.md`](../architecture/ADR-004-canonical-validation-import.md).

### Scope (implemented)

1. **Canonical versioned JSON format** — a JSON object discriminated by an exact
   `format: "classroom-quiz-show/game"` and an exact `schemaVersion: 1`, with
   `id`, `title`, and ordered `rounds` of `{ id, type, title, config }`. Only
   fields the Slice 3 domain model justifies; array order **is** round order;
   identifiers are supplied and validated, never generated; empty `rounds` is
   valid, matching the domain contract.
2. **One authoritative pipeline** (`src/import/importGame.ts`) — transport →
   JSON parse → format → version → safety scan → Zod → semantic → registry →
   normalization → trusted construction. Pasted JSON, the built-in samples, and
   tests all converge on it; the samples are JSON **text** so they cannot skip it.
3. **Explicit version policy** — missing / malformed / older / newer all fail. No
   shape guessing, no silent up- or downgrade, no speculative migrations.
4. **Zod schema boundary** — strict objects (unknown keys rejected, not dropped),
   **no coercion, defaults, catches, or transforms** anywhere. Every issue is
   preserved with its exact document path.
5. **Document safety scan (pre-Zod)** — rejects reserved keys (`__proto__`,
   `prototype`, `constructor`), non-data values (function/symbol/bigint/
   `undefined`/`Date`/`Map`/`Set`/`RegExp`/class instances), non-finite numbers,
   cycles, and excessive nesting. Needed because `z.strictObject` does **not**
   flag those reserved keys (they are inherited from `Object.prototype`).
6. **Semantic validation** — unique round ids, non-blank titles, bounds.
7. **Registry integration** — `RoundTypeEntry.configSchema` gives each known
   round type exactly one config validation path; an **unregistered round type
   fails import** (deliberately stricter than Slice 3's trusted in-memory path,
   whose fail-closed handling is unchanged). Content cannot register or supply
   a schema; duplicate registration still throws; registration order still does
   not affect round order.
8. **Narrow normalization** — branded ids, a deep copy of validated config (the
   caller's input object is never mutated), then the Slice 3 trusted constructor.
   **No silent repair** of any kind — failure instead.
9. **Structured error model + result type** — discriminated
   `ImportResult`; `ImportIssue { code, stage, path, message, context? }` with
   stable codes, deterministic ordering, no stack traces, and internal failures
   contained behind a generic issue.
10. **Host-only paste harness** — textarea, Import button, structured result
    panel, built-in sample buttons, and clearly separated "active game" vs.
    "last attempted import" vs. "last import result".

### Acceptance criteria

Local `verify:all` passes (lint, typecheck, 253 unit tests, build, 97 e2e passed
/ 2 skipped). Coverage: canonical format + version policy; strict unknown keys at
every level; identifier/title rules; no coercion/defaults/repair/partial import;
JSON transport (malformed, empty, non-text, oversized, every non-object root,
trailing content, no eval path); safety (prototype-pollution keys, non-data
values, non-finite numbers, cycles, depth, explicit truncation); error model
(codes, stages, paths, multi-issue, determinism, no stack traces, contained
internal failure); registry integration (unknown type, per-type config schema,
no mutation, duplicate registration, order independence); normalization (frozen
output, branded ids, order, determinism, input not mutated); state isolation (no
event, no revision change, no sync, no `PublicState`/display change on failure;
`INITIALIZE_GAME`-only on success; replay + undo unchanged); host component and
browser tests. All Slice 1/2/3 suites remain green.

### Explicit non-goals (Slice 4)

No Slice 5+ work: no category-board or any playable round, categories, clues,
prompts/answers, point ladders, tile selection, used-tile state, alternates, or
teacher notes for playable content; no teams, scoring, timers, transitions;
no persistence/IndexedDB or leader coordination; no final wager, media pipeline,
or theme engine; no spreadsheet/CSV/XLSX import, content authoring, pack
management, remote URL import, or backend upload; no cross-device sync,
authentication, analytics, or executable plugins. **A local `.json` file picker
was also deliberately not added** — the paste adapter is sufficient to prove the
pipeline, and a picker is a later, thin transport adapter onto the same
pipeline. The app is **not** made playable in Slice 4.

### What remains for Slice 5

Category-board round: the first playable round type — configurable categories,
rows and point ladder, multiplier, used-tile state, prompt/answer reveal,
alternates, and notes — registered behind the Slice 3 registry and made
importable by supplying its config schema to this pipeline.

## Slice 5 — scope, acceptance, non-goals

**State: Complete.** Implemented on `claude/slice-5-category-board-6gfxnq` on
top of `main` at `0dacd3501fb10ce1272386f56bf15a2956ee8c6d` (the merge commit of
PR #8, the Slice 4 post-merge reconciliation). Implementation commit `f8c4517`;
final reviewed head `5e6994e`. Merged to `main` via **PR #9** (merge commit
`2ec69323c203a989b06610e6506475e875a40e45`, merged 2026-07-26T05:02:33Z) with
all three PR checks green. Post-merge CI on `main` concluded success and the
Pages deployment succeeded; post-merge reconciliation recorded in
[`../receipts/2026-07-26-slice-5-post-merge-reconciliation.md`](../receipts/2026-07-26-slice-5-post-merge-reconciliation.md).
Full technical rationale in
[`../architecture/ADR-005-category-board-round.md`](../architecture/ADR-005-category-board-round.md);
local evidence in
[`../receipts/2026-07-26-slice-5-local-verification.md`](../receipts/2026-07-26-slice-5-local-verification.md).

### Scope (implemented)

1. **One new registered round type** — `category-board`, registered by
   application code. Imported content cannot register it, replace its schema,
   reducer or public projection, or supply a callback/handler. Duplicate
   registration still throws. The non-gameplay `placeholder` type is retained.
2. **Strict typed config** — ordered `categories` (stable id, public title,
   ordered `tiles`) and ordered tiles (stable id, non-negative integer `value`,
   `prompt`, `answer`, optional `alternates`, optional host-only `notes`,
   optional `multiplier`). Authored array order is canonical; identity is the
   stable id, never the displayed value.
3. **Board-shape decisions** — uneven category lengths are **allowed**;
   duplicate values are **allowed**. Empty boards and empty categories are
   rejected. Both decisions are documented in ADR-005 §4.
4. **Multiplier semantics** — `effectiveValue = value × multiplier` over bounded
   integers (exact, no floating point). It affects the displayed value and a
   typed field; it awards and deducts nothing. The default of 1 is applied by
   the trusted domain constructor, never by a Zod transform.
5. **Documented board-size limits** with classroom rationale (8 categories,
   8 tiles/category, **48 total tiles**, and text/collection bounds). Oversized
   boards are rejected with actionable messages — never truncated.
6. **Private round session state** — a discriminated reveal stage
   (`board`/`selected`/`prompt`/`answer`) paired with the selection, plus
   `usedTileIds`, stored per round so leaving and returning resumes a board.
7. **Four commands / four events**, all reversible, each carrying the `roundId`
   it targets so a stale host control is inert.
8. **Used-tile policy** — a tile is consumed when its ANSWER is revealed, not
   when it is selected; undoing the answer reveal releases it. Used state is
   derived only by replaying events.
9. **Import integration through the Slice 4 seam** — the registry supplies the
   round type's own strict config schema; there is no second importer. Precise
   errors with exact document paths; three new issue codes. The built-in valid
   sample now contains a real category-board round.
10. **`PublicState.round`** — a current-stage-only DTO with a neutral `kind`
    discriminator and positional keys. Wire version **2 → 3**.
11. **Projector and host surfaces** — the first real projector experience and
    bounded host controls that make private preview vs. public content explicit.

### Acceptance criteria

Local `verify:all` passes (lint, typecheck, **455 unit tests**, build, **121 e2e
passed / 2 skipped**). Coverage: config model, ordering, board shape, multiplier,
limits, immutability and fail-closed reads; canonical import integration with
exact paths and no repair; command validation, the reveal-stage machine,
used-tile policy, undo and deterministic replay; public projection privacy at
every stage plus fail-closed and wire-version behaviour; host and display
component behaviour including accessibility; host→display sync with a live
board. All Slice 1/2/3/4 suites remain green.

### Explicit non-goals (Slice 5)

No Slice 6+ work: no teams, team colours, score totals, awards, deductions,
partial credit, manual score correction, score audit history, or scoring
strategies; no buzzers or lockout; no timers or timed transitions; no
persistence, IndexedDB, session recovery, or leader coordination; no final
wager; no media (images/audio/video); no theme engine; no spreadsheet/CSV/XLSX/
Google Sheets import; no authoring UI, pack management, saved game library, or
remote URL import; no backend, accounts, cross-device networking, analytics, or
AI generation; and **no additional playable round types**.

**The round can reveal content and track used tiles. It must not score teams.**

### What remains for Slice 6

Teams & scoring: teams, a typed scoring strategy (points first), awards and
deductions, partial credit, unrestricted manual correction, an audit history,
and undo — built on top of the reveal events this slice produces. **Slice 6 was
authorized by the owner and is now `Complete` (see below).**

## Slice 6 — scope, acceptance, non-goals

**State: Complete.** Implemented on `claude/slice-6-teams-and-scoring-we53wr` on
top of `main` at `5237a1f9f6b451c2137330fd0a7f4613b7a919f2` (the merge commit of
PR #10, the Slice 5 post-merge reconciliation); implementation commit `7734065`,
final reviewed head `48ed8180278b6966080be6ce00a0e3b06ca3abf1`. **Merged to `main`
via PR #11** (merge commit `67180a3a24b43124ce7a2dee91d02fe1f797618e`, merged
2026-07-26T15:58:11Z), with post-merge CI on `main` green for both jobs and the
**GitHub Pages deployment succeeded. Manual live-route verification was not
performed.** Full technical rationale in
[`../architecture/ADR-006-teams-and-scoring.md`](../architecture/ADR-006-teams-and-scoring.md);
local evidence in
[`../receipts/2026-07-26-slice-6-local-verification.md`](../receipts/2026-07-26-slice-6-local-verification.md);
merged-state evidence in
[`../receipts/2026-07-26-slice-6-post-merge-reconciliation.md`](../receipts/2026-07-26-slice-6-post-merge-reconciliation.md).

### Scope (implemented)

1. **A typed team model** on the immutable `GameDefinition` — stable id as identity,
   a public name that is explicitly *not* identity, an accent from an
   application-controlled palette, and authored array order frozen onto `order`.
   1–8 teams; omitting the field means "no teams" and `teams: []` is rejected.
2. **Imported content may name an accent, never supply one.** Eight palette tokens;
   a colour, gradient, class name, CSS declaration or URL is rejected at import with
   a message naming the permitted values. Colour is always supplemental to the name.
3. **Import integration through the Slice 4 pipeline** — one team schema, owned by
   the game domain and re-used verbatim by the trusted constructor, so there is no
   second importer. `teams` is an **additive, optional** extension of
   `schemaVersion: 1`: every previously valid document still means exactly the same
   thing, so no migration is needed. Two new issue codes (`duplicate-team-id`,
   `invalid-team-accent`); exact paths such as `teams[1].accent`.
4. **Scores as session state**, bounded integers (−1,000,000…1,000,000, initial 0),
   derived purely by replaying the event log. No cache, no `NaN`/`Infinity`/floats,
   no coercion, and no write path outside `reduce`.
5. **One command / one event** — `ADJUST_TEAM_SCORE` → `TEAM_SCORE_ADJUSTED`
   (reversible) — carrying a signed `delta`, a typed `mode` (`full-credit` ·
   `partial-credit` · `deduction` · `manual-correction`) and a typed `source` (a
   specific board tile, or explicitly `manual`). The resulting total is deliberately
   **not** stored on the event.
6. **Category-board integration** — tile presets are derived from the tile's
   `effectiveValue` (`value × multiplier`, exact integers). Full credit must equal
   it, a deduction must equal its negation, and partial credit must fit inside it.
   Scoring requires the `prompt` or `answer` stage and the open tile.
7. **Revealing and scoring are independent in both directions** — a reveal scores
   nothing, scoring consumes no tile, and undoing either leaves the other standing.
8. **Correction without rewriting history** — undo through the existing
   `EVENT_UNDONE` marker, or append a compensating `manual-correction`.
9. **`PublicState.teams`** — an allow-listed scoreboard DTO with positional keys and
   an explicit `unavailable` fail-closed state. Wire version **3 → 4**.
10. **Host scoring panel** beside the board panel: ordered scoreboard, radio target
    selection (nothing selected by default), the open tile's value, the resulting
    total previewed before submission, already-submitted presets disabled (derived
    from the effective log, so undo re-enables them), confirmation for negative or
    large manual amounts, and an undo affordance that is honest about what the
    engine's undo model can reach.
11. **Projector scoreboard** — authored order, names as text, integer totals,
    negative totals marked by colour *and* sign, responsive to eight teams at 720p,
    and deliberately free of animation.

### Acceptance criteria

Local `verify:all` passes (lint, typecheck, **740 unit tests**, build, **154 e2e
passed / 2 skipped**). Coverage: the team model, limits, accents, immutability and
guards; the scoring domain rules exhaustively; canonical import integration with
exact paths and no repair; command validation, provenance, replay, undo,
independence from the reveal lifecycle, round transitions and reset; public
projection privacy and fail-closed behaviour plus the wire-version bump; host and
display component behaviour including accessibility; host→display sync of totals;
and end-to-end teacher/projector workflows. All Slice 1–5 suites remain green.

### Explicit non-goals (Slice 6)

No Slice 7+ work: no timers, countdowns, timed transitions or automatic timeout
scoring; no buzzers, lockout, contestant devices or remote team input; no
persistence, IndexedDB, session recovery or leader coordination; no wagering, Daily
Double or Final Jeopardy; no media; no theme engine or arbitrary team colours; no
spreadsheet/CSV/XLSX/Google Sheets import; no authoring UI, pack management or saved
game library; no backend, accounts, cross-device networking, analytics or AI
generation; and **no additional playable round types**.

### What remains for Slice 7

Timers, arming & transitions — **re-scoped by `ROADMAP-AMENDMENT-001`**, built on
top of the scoring events this slice produces. Slice 7 was subsequently
**owner-authorized and implemented**; see its record in "Amended slice records
(7–18)" below.

## Slice 7 — scope, acceptance, non-goals

**State: Complete.** Owner-authorized and implemented on
`claude/slice-7-timers-arming-transitions-wd7cmf` on top of `main` at
`752a3fe0f45fdc1ee687339134023c3811facd91` (the merge commit of PR #13, the
roadmap amendment); implementation commit `f804430`, final reviewed head
`43cc66c5fc2a01cdb46daa1b52b7df08184b0448`. **Merged to `main` via PR #14**
(merge commit `3f9ae1c4c7f9f6e37bac08bf519dbd8ef68af42a`, merged
2026-07-26T23:43:51Z), with post-merge CI on `main` green for both jobs and the
**GitHub Pages deployment succeeded. Manual live-route verification was not
performed.** Full technical rationale in
[`../architecture/ADR-007-timers-arming-transitions.md`](../architecture/ADR-007-timers-arming-transitions.md);
local evidence in
[`../receipts/2026-07-26-slice-7-local-verification.md`](../receipts/2026-07-26-slice-7-local-verification.md);
merged-state evidence in
[`../receipts/2026-07-27-slice-7-post-merge-reconciliation.md`](../receipts/2026-07-27-slice-7-post-merge-reconciliation.md).

### Scope (implemented)

1. **An explicit clock boundary** (`src/time/clock.ts`): a `Clock` interface, the
   real `systemClock`, a manual clock for tests, and an `isInstant` guard. A clock
   is read at the command/dispatch edge and the presentation edge only — never in
   `reduce`, `replay`, the planner's decision logic, or the sanitizer. No global
   timer service, and nothing mutates state outside the command pipeline.
2. **Durable timer facts, a derived countdown.** A five-status discriminated
   union: a running timer stores duration, start and an absolute deadline; a
   paused one stores the remaining duration and no deadline. There is no tick
   event, no per-frame revision, and no remaining-time value on a running timer.
3. **A round-type-neutral response phase** — `PrivateGameState.responsePhases`, a
   per-round sibling of `categoryBoards`, legal at the `prompt` stage only.
4. **Manual host arming** (`OG-1`) as first-class durable state, orthogonal to the
   timer. Nothing arms a clue automatically.
5. **A typed interruption seam** (`ResponseInterruptionSource`, one member today)
   that stops the clock **without ending the clue**, so a later slice can promote
   another respondent without a redesign.
6. **Expiration through the command boundary**, carrying the timer identity and
   the exact deadline, with a 250 ms earliness tolerance. Stale, premature,
   repeated, reset, restarted, paused, undone, clue-changed and round-changed
   callbacks all append nothing; exactly one effective expiry per countdown is
   structural.
7. **Host pause and resume** (`OG-8` resolved): pause records the remaining
   duration; resume derives a new deadline from the dispatch clock; replay
   consumes no wall-clock time while paused.
8. **Replay-safe transitions**: a window is cleared by a new selection, the answer
   reveal, a return to the board, any round change, the game ending, and a new
   game — and is deliberately **not** resumed across a round change, unlike board
   progress.
9. **One new public field**, `response` (wire version 4 → 5): the armed flag plus a
   status-discriminated timer projecting an absolute deadline, never a countdown.
   The sync envelope moved 1 → 2 for a required `sentAt` stamp.
10. **A bounded host/display drift strategy**: an estimated, clamped clock offset
    applied at the display, with the display never expiring a timer.
11. **An additive optional `timer` block** on `schemaVersion: 1`, 5–600 whole
    seconds, defaulting to 30 when absent, plus a host-chosen per-clue duration
    validated against the same bounds.
12. **Host and projector surfaces**: a bounded host panel (arm/disarm, duration,
    start/pause/resume/stop/reset) with illegal controls disabled, and a projector
    panel stating every state in words with a reduced-motion-safe emphasis pulse.

### Acceptance criteria

| Criterion (from the amended roadmap record) | Evidence |
| --- | --- |
| Authored timer configuration | `timer.responseSeconds`, additive on `schemaVersion: 1`; `src/import/timerImport.test.ts` |
| Timer facts as durable reversible events (started with a stated duration, expired, cancelled) | eight reversible events in `src/state/events.ts`; `src/state/responsePhaseReducer.test.ts` |
| Host arming/disarming derived from replayed events | `responsePhaseFor` + replay; arming/undo tests |
| A public projection carrying an absolute deadline plus arming state, with the display deriving remaining time | `PublicResponseState`; `src/state/responseSanitize.test.ts`, `src/display/ResponseTimerDisplay.test.tsx` |
| Host-controlled undoable round transitions | transition table (ADR-007 §8) and its tests; undo tests for every event |
| Reduced-motion-safe presentation | `ResponseTimerDisplay.css` + the reduced-motion e2e test |
| An ADR recording the timing boundary | [`ADR-007`](../architecture/ADR-007-timers-arming-transitions.md) |
| `verify:all` green | Slice 7 local-verification receipt |
| Unit tests proving replay is bit-exact with no clock read in the reducer | "replay and undo" suite in `responsePhaseReducer.test.ts` |
| A test proving the sync channel publishes no per-tick revision | "publishes no per-second revision" in `responseSanitize.test.ts` |
| e2e coverage of arming, expiry, cancellation and undo across host and projector at all three viewports | `tests/e2e/timers-arming.spec.ts` (7 tests × 3 viewport projects) |

### Explicit non-goals (Slice 7)

No buzzers of any kind — no team buzz events, ordered queues, pass-to-next-team
behaviour, keyboard team input, Gamepad API, Sony Buzz! handling, WebHID,
Bluetooth, phone or networked buzzers. No automatic timeout scoring. No media or
playback coordination (`OG-9`). No persistence, session recovery or leader
coordination. No wagering, Daily Double or Final Jeopardy. No portable
export/import. No reporting or leaderboards. No theme engine. No authoring UI or
pack management. No backend, accounts, cross-device sync, analytics or AI. No
additional playable round type. `OG-2`, `OG-3` and `OG-6` are recorded but **not
implemented**.

### What remains for Slice 9

Nothing: Slice 9 is **`Complete`** — merged to `main` via
[PR #19](https://github.com/ricktron/classroom-quiz-show/pull/19) (merge commit
`d16f90d`, 2026-07-27T05:33:05Z, by `ricktron`). Its scope record is below, and
its rationale is in
[`../architecture/ADR-009-generic-gamepad-adapter.md`](../architecture/ADR-009-generic-gamepad-adapter.md).
**Slice 10 is `Complete`** — squash-merged via
[PR #21](https://github.com/ricktron/classroom-quiz-show/pull/21) (merge commit
`5575be3`, 2026-07-28T02:35:09Z) from final reviewed head `2885933`. Completion
covers the owner-accepted hardware-independent scope; physical certification
remains deferred; no compatibility claim is made. See
[`../architecture/ADR-010-sony-buzz-profile-and-setup.md`](../architecture/ADR-010-sony-buzz-profile-and-setup.md)
and
[`../receipts/2026-07-28-slice-10-post-merge-reconciliation.md`](../receipts/2026-07-28-slice-10-post-merge-reconciliation.md).
**Slice 11 is `Complete`** — squash-merged via
[PR #23](https://github.com/ricktron/classroom-quiz-show/pull/23) (merge commit
`5d47b2f`, 2026-07-28T04:56:27Z) from final reviewed head `bb8bd94`. Exact
40-path blob equality confirmed; post-merge verification succeeded. See
[`../architecture/ADR-011-media-contract.md`](../architecture/ADR-011-media-contract.md)
and
[`../receipts/2026-07-28-slice-11-post-merge-reconciliation.md`](../receipts/2026-07-28-slice-11-post-merge-reconciliation.md).
**Slice 12 remains `Planned` and unstarted.**

## Slice 8 — scope, acceptance, non-goals

Slice 8 is **Complete**: implemented on
`claude/slice-8-local-input-keyboard-thn7bn` from `main` at `004bf9d` and **merged
to `main` via [PR #16](https://github.com/ricktron/classroom-quiz-show/pull/16)**
(merge commit `167128d`, merged 2026-07-27T02:46:24Z by `ricktron`; reviewed head
`7d12718`, which is the merge commit's second parent). All three PR checks were
green at that head, post-merge CI on `main` concluded success, and the Pages
deployment succeeded; live-route behaviour is not claimed. Rationale in
[`../architecture/ADR-008-local-input-keyboard-buzz.md`](../architecture/ADR-008-local-input-keyboard-buzz.md).

### Delivered

1. **A layered, hardware-independent input boundary** (`src/input/`): raw browser
   input → adapter → logical action → validated command → append-only event →
   reducer → sanitized public state. The domain cannot receive a `KeyboardEvent`,
   a key code, a device identifier or a mapping table.
2. **A bounded logical action vocabulary**: `primary-buzz` plus four **ordinal**
   `secondary` slots. Secondary actions are representable and mappable but
   **inert** — translation refuses them, so none produces a command or an event.
3. **A bounded, application-only input-source union** rather than a speculative
   plugin registry: no dynamic lookup, no content-controlled registration.
4. **Configurable keyboard mappings** on `KeyboardEvent.code` (physical position),
   with structured validation (duplicates, reserved keys, unknown teams, duplicate
   team primaries), safe digit-row defaults, and no silent repair or overwrite.
5. **Versioned browser-local mapping persistence**, validated on load, falling
   back wholesale on anything invalid — explicitly NOT Slice 13 persistence.
6. **Manual arming reused as the intake gate** (`OG-1`), with no second flag and
   still exactly one arming control.
7. **A full ordered buzz queue** (`OG-2`), ordered by the event log's `seq`, with
   each team appearing at most once per response opportunity.
8. **An explicit active respondent**, distinct from waiting, empty, exhausted and
   closed.
9. **Promotion after an incorrect response or a host pass** (`OG-3`) as one typed
   command that moves no points.
10. **Timer interruption through Slice 7's typed seam** — one new source member,
    exactly once per window, structurally unrepeatable.
11. **`PublicState.response.buzz`** (active positional key + waiting count), wire
    version 5 → 6; the sync envelope unchanged at 2.
12. **Host and projector surfaces**: a mapping editor with key capture and
    conflict messaging, the active team and full ordered queue, incorrect/pass
    actions and per-press rejection reasons on the host; the active team and a
    waiting count on the projector.

### Acceptance criteria

| Criterion (from the roadmap record) | Evidence |
| --- | --- |
| An input-adapter boundary; application-only registration; mapped logical team input as the only thing crossing | `src/input/*`; `src/input/localInputContract.test.ts` |
| One buzz command/event pair | `RECORD_TEAM_BUZZ` → `TEAM_BUZZED`; `src/state/buzzQueueReducer.test.ts` |
| Buzz queue state derived only by replay, order from `seq` | `src/game/timing/buzzQueue.ts`; "orders buzzes by the event log" and the replay suite |
| Duplicate suppression derived from the effective log | `hasTeamBuzzed` + the duplicate/corrupt-log suites |
| A sanitized public buzz projection | `PublicBuzzState`; `src/state/buzzSanitize.test.ts` |
| The keyboard adapter and host mapping surface | `src/input/keyboardAdapter.ts`, `src/host/LocalInputHostPanel.tsx` and their tests |
| An ADR | [`ADR-008`](../architecture/ADR-008-local-input-keyboard-buzz.md) |
| `verify:all` green | Slice 8 local-verification receipt |
| Replay determinism tests for buzz order | "replay and undo" suite in `buzzQueueReducer.test.ts` |
| Undo-restores-queue-exactly tests | same suite |
| A privacy test proving no device identifier, button index or mapping reaches `PublicState` or the display DOM | `buzzSanitize.test.ts`, `BuzzQueueDisplay.test.tsx`, `tests/e2e/buzz-in.spec.ts` |
| e2e keyboard buzz-in across host and projector | `tests/e2e/buzz-in.spec.ts` (4 tests × 3 viewport projects) |

### Explicit non-goals (Slice 8)

No Gamepad API, WebHID, Bluetooth, USB or HID handling. No Sony Buzz! detection,
vendor/product identification, button numbering, handset assignment, coloured
default mappings or controller setup wizard — all Slice 10. No secondary-action
gameplay. No phone, networked or student-device buzzing. No automatic scoring, no
reaction-time claim. No session persistence or recovery. No portable
export/import, media, theme engine, authoring, packs, wagering, reporting or
leaderboards. No backend, accounts, cloud, analytics or AI. No additional playable
round type. **`OG-6` remains deferred and scoring is unchanged.**

## Amended slice records (7–18)

Added by [`ROADMAP-AMENDMENT-001`](../decisions/ROADMAP-AMENDMENT-001-local-buzzers.md)
on 2026-07-26. **No slice below is started.** "Impact" states whether the slice
changes schema, runtime, UI, storage or hardware support.

### Slice 7 — Timers, arming & transitions

- **Identifier:** `CQS-SLICE-7-TIMERS-ARMING-TRANSITIONS`
- **Purpose:** introduce time-bounded play and host-controlled undoable
  transitions without breaking deterministic replay, and settle where a
  clock-dependent value may live.
- **Primary deliverables:** authored timer configuration; timer facts as durable
  reversible events (started with a stated duration, expired, cancelled); host
  arming/disarming derived from replayed events; a public projection that carries
  an **absolute deadline plus arming state**, with the display deriving remaining
  time locally; host-controlled undoable round transitions; reduced-motion-safe
  presentation; an ADR recording the timing boundary.
- **Major exclusions:** no buzzers or input adapters; no automatic timeout
  scoring; no media/playback coupling; no persistence; no tick stream over the
  sync channel; no remaining-time value in any durable event; no wagering.
- **Prerequisites:** slices 5 and 6 (Complete).
- **Completion evidence:** `verify:all` green; unit tests proving replay is
  bit-exact with no clock read in the reducer; a test proving the sync channel
  publishes no per-tick revision; e2e coverage of arming, expiry, cancellation
  and undo across host and projector at all three viewports.
- **Impact:** schema **yes** (additive, authored timer config, `schemaVersion: 1`)
  · runtime **yes** · UI **yes** · storage no · hardware no.
- **Status:** `Complete` — owner-authorized, implemented and **merged to `main`
  via PR #14** (merge commit `3f9ae1c`, merged 2026-07-26T23:43:51Z). Delivered on
  `claude/slice-7-timers-arming-transitions-wd7cmf` from `main` at `752a3fe`; the
  scope, acceptance evidence and non-goals are recorded in "Slice 7 — scope,
  acceptance, non-goals" above, and the rationale in
  [`../architecture/ADR-007-timers-arming-transitions.md`](../architecture/ADR-007-timers-arming-transitions.md).
- **Owner gate:** authorization to begin — **granted**. `OG-8` (timer
  pause/resume) was **resolved** during the slice: explicit host pause and resume
  are supported, bounded as ADR-007 §7 describes, and remain open to owner
  revision.

### Slice 8 — Local input contract & keyboard buzz-in

- **Identifier:** `CQS-SLICE-8-INPUT-CONTRACT-KEYBOARD`
- **Purpose:** establish the device-independent local input boundary and buzz-in
  semantics, with keyboard as the first real adapter and the permanent
  no-hardware fallback.
- **Primary deliverables:** an input-adapter interface + application-only
  registry modelled on ADR-003; mapped logical team input as the only thing
  crossing into the command layer; one buzz command/event pair; buzz queue state
  derived only by replay (order from `seq`); duplicate suppression derived from
  the effective log; a sanitized public buzz projection (ordered team keys and
  names only); the keyboard adapter and host mapping surface; an ADR.
- **Major exclusions:** no Gamepad API; no Sony Buzz! support; no networked or
  student-device buzz-in; no raw device data in any event or in `PublicState`; no
  scoring change; no reaction-time measurement claim.
- **Prerequisites:** slices 2, 6, 7; **and owner answers to `OG-1`, `OG-2`,
  `OG-3`** — these determine the event vocabulary.
- **Completion evidence:** `verify:all` green; replay determinism tests for buzz
  order; undo-restores-queue-exactly tests; a privacy test proving no device
  identifier, button index or mapping reaches `PublicState` or the DOM of the
  display; e2e keyboard buzz-in across host and projector.
- **Impact:** schema no · runtime **yes** · UI **yes** · storage no · hardware
  **no** (keyboard only).
- **Owner direction (2026-07-27) — colored buttons.** The hardware-independent
  input contract must be able to represent a **primary buzz action**, **secondary
  logical actions** suitable for coloured controller buttons, and **configurable
  mappings independent of any particular device model**. The engine must stay
  **button-agnostic**: only a mapped LOGICAL action crosses into the command
  layer, and a physical button, its index, its colour and its handset stay on the
  adapter side of the §5.6 boundary. A final event vocabulary for secondary
  actions is **not** defined in advance — it is defined only if and when this
  slice's durable plan requires it, following the same "no speculative contract
  without its first consumer" rule that shaped Slice 7's interruption seam.
  **Recorded, not implemented.**
- **Status:** `Complete` — owner-authorized, implemented on
  `claude/slice-8-local-input-keyboard-thn7bn` from `main` at `004bf9d`, and
  **merged to `main` via
  [PR #16](https://github.com/ricktron/classroom-quiz-show/pull/16)** (merge
  commit `167128d`, merged 2026-07-27T02:46:24Z by `ricktron`; reviewed head
  `7d12718` is the merge commit's second parent). Post-merge CI and the Pages
  deployment both concluded success; post-merge reconciliation is recorded in
  [`../receipts/2026-07-27-slice-8-post-merge-reconciliation.md`](../receipts/2026-07-27-slice-8-post-merge-reconciliation.md).
  The scope, acceptance evidence and non-goals
  are recorded in "Slice 8 — scope, acceptance, non-goals" above, and the rationale
  in
  [`../architecture/ADR-008-local-input-keyboard-buzz.md`](../architecture/ADR-008-local-input-keyboard-buzz.md).
- **Owner gate:** authorization to begin — **granted**. `OG-1` (implemented in
  Slice 7) is reused as the queue's intake gate; **`OG-2` and `OG-3` are
  implemented by this slice**; `OG-4` (ties) and `OG-5` (queue lifetime) were
  **resolved** during it; **`OG-6` remains deferred and is not implemented** —
  scoring stays available for every team.

### Slice 9 — Generic Gamepad adapter

- **Identifier:** `CQS-SLICE-9-GAMEPAD-ADAPTER`
- **Purpose:** support generic USB controllers through the slice 8 boundary
  without any model-specific assumption.
- **Primary deliverables:** a Gamepad API adapter; connect/disconnect handling
  that fails gracefully and never fabricates a buzz; polling isolated from the
  reducer and from render; host-private diagnostics; documented browser
  limitations.
- **Major exclusions:** no Sony Buzz!-specific mapping; no Bluetooth requirement;
  no HID driver; no change to the slice 8 contract.
- **Prerequisites:** slice 8.
- **Completion evidence:** `verify:all` green; adapter unit tests against a fake
  gamepad source; a test proving disconnect mid-arming produces no event; e2e
  coverage of the no-controller fallback path.
- **Owner direction (2026-07-27) — colored buttons.** This slice owns
  **configurable mappings**, still with no model-specific assumption: it maps
  physical buttons to the LOGICAL actions Slice 8 defines, and the engine stays
  button-agnostic. Sony-specific detection, button numbering, default colour
  mappings, handset assignment and setup UX are **not** here — they are Slice 10.
  **Recorded, not implemented.**
- **Impact:** schema no · runtime **yes** · UI **yes** (diagnostics) · storage no
  · hardware **yes** (generic USB gamepads). **Confirmed on delivery:** no schema
  change, no `PublicState` change (wire version stays 6), no sync-envelope change
  (stays 2), no new command, no new event, no reducer change, and no persistence —
  the only vocabulary change anywhere is one member added to
  `LOCAL_INPUT_SOURCE_KINDS`.
- **Status:** **`Complete`** — owner-authorized, implemented on
  `claude/slice-9-gamepad-adapter-wfiue4` from `main` at `5cc81d4` (reviewed head
  `f63d5c1`) and **merged to `main` via
  [PR #19](https://github.com/ricktron/classroom-quiz-show/pull/19)** (merge
  commit `d16f90d`, merged 2026-07-27T05:33:05Z by `ricktron`; the reviewed head
  is the merge commit's second parent). All three PR checks were green at that
  head, post-merge CI on `main` concluded success, and the Pages deployment
  succeeded; **live-route behaviour is not claimed**. **No physical controller was
  tested** — hardware validation remains Slice 10. Post-merge evidence in
  [`../receipts/2026-07-27-slice-9-post-merge-reconciliation.md`](../receipts/2026-07-27-slice-9-post-merge-reconciliation.md).
- **Owner gate:** authorization to begin — **granted**. `OG-1` is reused unchanged
  as the intake gate; `OG-2` and `OG-3` (implemented in Slice 8) are reused
  unchanged; `OG-4`'s resolution is extended to simultaneous poll edges without
  changing it; **`OG-6` remains deferred and is not implemented**.

#### Delivered (Slice 9)

1. **`gamepad` added to the bounded, application-only input-source union**, in the
   same change as its adapter. Nothing else in the chain moved.
2. **A browser boundary of one module** (`src/input/gamepadSource.ts`): the only
   place `navigator.getGamepads()` is called. What crosses is a frozen
   `{ controllerIndex, pressed[] }` snapshot — no `Gamepad` object, device `id`,
   `mapping`, `axes`, analog value, `touched`, timestamp or vendor/product id is
   representable above it.
3. **An injectable source and an injectable scheduler**, so every unit test uses a
   fake and none needs a browser, a frame or a physical controller.
4. **Polling in one host-only lifecycle owner**: registered once, stopped on
   unmount, never in the reducer, render, sanitizer, replay, command planning or on
   the display route, and with no global polling service.
5. **Rising-edge semantics with a baseline rule**: a first sighting emits nothing,
   a held button never repeats, and enable/disable, mapping changes, capture,
   connect, disconnect, visibility and focus all RE-PRIME — so a held button
   requires a release and a fresh press across every one of them.
6. **Deterministic multi-edge ordering** (ascending controller index, then button
   index) as a tie-break rule, with the event log's `seq` still the authority and
   no fairness claimed.
7. **A generic validated mapping** (controller index + button index + team +
   logical action) with structured issues, no silent overwrite or repair, and
   **no default button assignment**.
8. **Session-local mapping lifetime**: no `localStorage`, IndexedDB, export,
   game-file field or sync, stated plainly in the host UI.
9. **Buttons only** — no axes, sticks, analog triggers, motion, vibration or
   haptics.
10. **Secondary actions still inert**: assignable, and still terminating at the
    existing typed `unsupported-action` rejection.
11. **A bounded host panel**: availability, enable/disable, neutral controller
    labels and button counts, per-team assignments, capture with cancel, clear one
    and clear all, conflict messaging, and a sentence for every press that did
    nothing. No live per-frame button display.
12. **Keyboard buzzing untouched** and stated as the fallback everywhere.

#### Acceptance criteria (Slice 9)

| Criterion (from the roadmap record) | Evidence |
| --- | --- |
| A Gamepad API adapter behind the Slice 8 boundary | `src/input/gamepadSource.ts`, `src/input/gamepadAdapter.ts`; `src/input/gamepadIntegration.test.ts` |
| Connect/disconnect handling that fails gracefully and never fabricates a buzz | "connect and disconnect" suites in `gamepadAdapter.test.ts` and `useGamepadBuzzInput.test.tsx` |
| Polling isolated from the reducer and from render | `src/host/useGamepadBuzzInput.ts`; the "poll loop" suite; the display-side e2e instrumentation |
| Host-private diagnostics | `src/host/GamepadInputHostPanel.tsx` and its component tests |
| Documented browser limitations | [`ADR-009`](../architecture/ADR-009-generic-gamepad-adapter.md) §Context and §Consequences |
| Configurable mappings with no model-specific assumption | `src/input/gamepadMapping.ts`; `gamepadMapping.test.ts` |
| `verify:all` green | Slice 9 local-verification receipt |
| Adapter unit tests against a FAKE gamepad source | `src/test/gamepadFixtures.ts` + every Slice 9 unit test |
| A test proving disconnect mid-arming produces no event | "appends no event when a controller disconnects mid-arming" in `gamepadIntegration.test.ts` |
| e2e coverage of the no-controller fallback path | `tests/e2e/gamepad-input.spec.ts` (4 tests × 3 viewport projects) |
| No device data in commands, events, private state or `PublicState` | `gamepadIntegration.test.ts` privacy suites; `tests/e2e/gamepad-input.spec.ts` |

#### Explicit non-goals (Slice 9)

No Sony Buzz! detection, PlayStation or Sony naming in runtime UI, vendor/product
matching, coloured-button profile, handset grouping, controller wizard or
supported-hardware certification — all Slice 10. No WebHID, USB drivers, Bluetooth
setup, haptics or vibration. No axes or analog controls. No persistent Gamepad
mappings. No phone or networked buzzers. No new scoring behaviour and no
secondary-action gameplay. No multiple-choice response modes, speed scoring,
response-policy schema or supporting event vocabulary. No media, export/import,
session persistence, final wager, reporting, themes, authoring, backend, accounts,
cloud sync, analytics, AI or LMS integration. **No new runtime dependency.**

### Slice 10 — Sony Buzz! mapping, validation & host setup UX

- **Identifier:** `CQS-SLICE-10-SONY-BUZZ-MAPPING`
- **Purpose:** make Sony Buzz! USB controllers work well as the preferred initial
  hardware target, through configuration rather than hard-coded assumptions.
- **Primary deliverables:** configurable controller mapping (team ↔ controller ↔
  button); a host setup/test surface that shows presses without scoring
  anything; validation and clear diagnostics for an unrecognized device; the
  documented fallback when no controller is connected.
- **Major exclusions:** no hard-coded single-model assumption; no supported
  hardware guarantee; no driver; no networked buzzers; no change to the slice 8
  contract.
- **Prerequisites:** slice 9.
- **Completion evidence:** `verify:all` green; mapping validation tests; a test
  proving no mapping table or device identifier reaches `PublicState`; e2e
  coverage of the setup surface and the no-controller fallback. Physical hardware
  certification is owner-performed, cannot be claimed from CI, and is required
  before any supported-hardware claim.
- **Owner direction (2026-07-27) — colored buttons.** Sony Buzz! is confirmed as
  the **preferred initial hardware validation target**, and everything
  Sony-specific belongs HERE and nowhere earlier: detection, button numbering,
  default colour mappings, handset assignment, the recommended profile, and the
  host setup UX. Slices 8 and 9 must remain usable and complete without any of
  it. **Hardware-independent portion owner-accepted and now `Complete` after
  PR #21 squash-merge and post-merge reconciliation; physical certification
  remains deferred.**
- **Impact:** schema no · runtime **yes** · UI **yes** · storage **possibly**
  (mapping persistence may defer to slice 13) · hardware **yes** (Sony Buzz! USB).
- **Status:** **`Complete`** — squash-merged via
  [PR #21](https://github.com/ricktron/classroom-quiz-show/pull/21) at
  `5575be35d76ae0f0d3b36394431b7873883b78ac` (merged **2026-07-28T02:35:09Z**;
  final reviewed head `288593391776be1d89b7f5ab9820e147946e56f9`; exact PR-path
  blob equality confirmed). Physical certification remains deferred; no
  compatibility claim is made. Rationale in
  [`../architecture/ADR-010-sony-buzz-profile-and-setup.md`](../architecture/ADR-010-sony-buzz-profile-and-setup.md);
  post-merge evidence in
  [`../receipts/2026-07-28-slice-10-post-merge-reconciliation.md`](../receipts/2026-07-28-slice-10-post-merge-reconciliation.md).
- **Deferred follow-up:** owner-performed physical validation is required before
  any supported-hardware claim; it is deferred certification, not incomplete
  Slice 10 work, and is not a prerequisite for Slice 11's media contract.

### Slice 11 — Media contract

- **Identifier:** `CQS-SLICE-11-MEDIA-CONTRACT`
- **Purpose:** honour the permanent §9 invariant that no type or component may
  assume a prompt is a plain string, **before** any new round type deepens that
  assumption further.
- **Primary deliverables:** a typed media model; an additive optional prompt form
  that keeps a bare string valid and meaning exactly what it means today;
  fail-closed handling of unsupported or unrecognized media; import diagnostics
  with exact paths; a projector presentation that never implies content exists
  when it cannot be rendered; an ADR; a `GAME-ENGINE-BOUNDARIES.md` §9 status
  update.
- **Major exclusions:** no `schemaVersion: 2`; no theme engine; no timer/playback
  coupling (`OG-9`); no remote media fetch; no new round type.
- **Prerequisites:** slices 4 and 5.
- **Completion evidence:** `verify:all` green; tests proving every pre-existing
  bare-string document still validates and still means text; fail-closed tests
  for unsupported media; privacy tests unchanged and green.
- **Impact:** schema **yes** (additive on v1) · runtime **yes** · UI **yes** ·
  storage no · hardware no.
- **Status:** **`Complete`** — squash-merged via
  [PR #23](https://github.com/ricktron/classroom-quiz-show/pull/23) at
  `5d47b2f641e1a96c2066ec22731f4e751288b39a` (merged **2026-07-28T04:56:27Z**;
  final reviewed head `bb8bd94b016a99f9782793f3eda6b6fd2d59a0b5`; exact PR-path
  blob equality confirmed). Rationale in
  [`../architecture/ADR-011-media-contract.md`](../architecture/ADR-011-media-contract.md);
  post-merge evidence in
  [`../receipts/2026-07-28-slice-11-post-merge-reconciliation.md`](../receipts/2026-07-28-slice-11-post-merge-reconciliation.md).
- **Next action:** review Slice 12 (In review); Slice 13 remains Planned and
  unstarted.

### Slice 12 — Portable export & round-trip import

- **Identifier:** `CQS-SLICE-12-PORTABLE-EXPORT`
- **Purpose:** give the teacher a durable, owned, offline copy of an authored
  game, and a stable portable identity, before any storage layer exists.
- **Primary deliverables:** export of a loaded game to the canonical portable
  document; byte-predictable output; round-trip re-import through the existing
  single pipeline; reproducible game identity; host-only export surface.
- **Major exclusions:** no persistence; no cloud or remote destination; no
  spreadsheet/CSV/XLSX; no second import pipeline; no authoring UI.
- **Prerequisites:** slices 4 and 11.
- **Completion evidence:** `verify:all` green; **round-trip equality tests**
  (export → import → structurally identical definition) as a hard acceptance
  criterion; determinism test on export byte output.
- **Impact:** schema no (uses the existing format) · runtime **yes** · UI **yes**
  · storage no · hardware no.
- **Status:** `In review` — implementation on `claude/slice-12-portable-export`;
  unmerged. See
  [`../architecture/ADR-012-portable-export-round-trip.md`](../architecture/ADR-012-portable-export-round-trip.md)
  and
  [`../receipts/2026-07-28-slice-12-local-verification.md`](../receipts/2026-07-28-slice-12-local-verification.md).
- **Owner gate:** review and merge only after verification; do not mark Complete
  until post-merge reconciliation. Slice 13 remains unauthorized.

### Slice 13 — Local persistence & recovery

- **Identifier:** `CQS-SLICE-13-PERSISTENCE`
- **Purpose:** survive an accidental refresh or tab close without losing a
  lesson.
- **Primary deliverables:** IndexedDB local storage; **saved game definitions
  kept strictly distinct from active session state**; event-log durability;
  session recovery; lightweight leader coordination; offline-only storage with
  nothing new projected to the display.
- **Major exclusions:** no cloud sync; no accounts; no cross-device sync; no new
  public state; no student data.
- **Prerequisites:** slices 2 and 12.
- **Completion evidence:** `verify:all` green; recovery-after-refresh e2e as the
  headline criterion; a test proving persisted session state is re-derived by
  replay rather than trusted as state; privacy tests green.
- **Impact:** schema no · runtime **yes** · UI **yes** · storage **yes** ·
  hardware no.
- **Status:** `Planned` — unstarted.
- **Owner gate:** authorization to begin.

### Slice 14 — Final-wager round

- **Identifier:** `CQS-SLICE-14-FINAL-WAGER`
- **Purpose:** the second playable round type — a closing wager round.
- **Primary deliverables:** public prompt; host-entered private wagers; timed
  response; reveal; settlement; tie handling.
- **Major exclusions:** no Daily Double mid-board; no student-device wager entry;
  no new scoring strategy beyond bounded integer points.
- **Prerequisites:** slices 5, 6, 7 **and 11** (a new round type must follow the
  media contract).
- **Completion evidence:** `verify:all` green; privacy tests proving a wager is
  never projected before reveal; full replay/undo coverage.
- **Impact:** schema **yes** (additive round config) · runtime **yes** · UI
  **yes** · storage no · hardware no.
- **Status:** `Planned` — unstarted.
- **Owner gate:** authorization to begin; default tie-break already an approved
  product decision.

### Slice 15 — Session summary & compatible-profile reporting

- **Identifier:** `CQS-SLICE-15-REPORTING`
- **Purpose:** tell the teacher what happened in a session, and make any
  cross-session comparison honest.
- **Primary deliverables:** a per-session result summary derived from replay;
  **normalized metrics** (percentage of available points, category accuracy,
  wins, response accuracy); a stable **competitive-profile identifier** so only
  compatible games are compared; cross-session comparison **only** where
  persistence supplies the history.
- **Major exclusions:** **no raw-score leaderboard as a default surface**; no
  individual student identity (`OG-7`); no grading or defensible individual
  analytics; no export to an LMS.
- **Prerequisites:** slice 6; slice 13 for anything cross-session.
- **Completion evidence:** `verify:all` green; tests proving a summary is derived
  from the log and never cached; tests proving incompatible profiles are not
  compared.
- **Impact:** schema no · runtime **yes** · UI **yes** · storage no (reads slice
  13's) · hardware no.
- **Status:** `Planned` — unstarted.
- **Owner gate:** `OG-7` for any individual identity; authorization to begin.

### Slice 16 — Theme engine

- **Identifier:** `CQS-SLICE-16-THEME-ENGINE`
- **Purpose:** presentation-only theming, including an accessibility/high-contrast
  theme.
- **Primary deliverables:** a theme system covering typography, backgrounds,
  tiles, score presentation and animation intensity; a high-contrast theme;
  theme selection that content may name but never supply.
- **Major exclusions:** a theme must **never** alter scoring rules, the
  private/public boundary, validation, event semantics or answer-reveal
  authorization; no imported style values; no team colours beyond the
  application palette.
- **Prerequisites:** slice 5.
- **Completion evidence:** `verify:all` green; tests proving no theme value
  originates from imported content and no theme changes engine behaviour.
- **Impact:** schema **possibly** (additive theme name) · runtime **yes** · UI
  **yes** · storage no · hardware no.
- **Status:** `Planned` — unstarted.
- **Owner gate:** authorization to begin.

### Slice 17 — Authoring & packs

- **Identifier:** `CQS-SLICE-17-AUTHORING-PACKS`
- **Purpose:** let a teacher build and manage content without hand-writing JSON.
- **Primary deliverables:** content authoring UI; spreadsheet import convenience
  through the existing single pipeline; complete portable game packs; standards
  tags.
- **Major exclusions:** no backend; no cloud library; no AI generation; no second
  validation pipeline.
- **Prerequisites:** slices 4, 5, 12.
- **Completion evidence:** `verify:all` green; every authoring path proven to
  converge on the one canonical import pipeline.
- **Impact:** schema **possibly** · runtime **yes** · UI **yes** · storage
  **yes** · hardware no.
- **Status:** `Planned` — unstarted.
- **Owner gate:** authorization to begin.

### Slice 18 — Release readiness

- **Identifier:** `CQS-SLICE-18-RELEASE-READINESS`
- **Purpose:** close the gap between "features exist" and "a teacher can rely on
  it in a classroom".
- **Primary deliverables:** a full accessibility audit; real PWA icons (the Slice
  1 placeholders); polish; documentation completeness; **owner-performed live
  deployment verification**, recorded as such; release-readiness consideration of
  any supported-hardware claims against separately completed physical
  certification.
- **Major exclusions:** no new capability.
- **Prerequisites:** all prior slices.
- **Completion evidence:** `verify:all` green; an accessibility audit receipt;
  an owner-verified live-route receipt — which, unlike every prior slice, cannot
  be satisfied by a deployment workflow conclusion alone.
- **Impact:** schema no · runtime **yes** (polish) · UI **yes** · storage no ·
  hardware no.
- **Status:** `Planned` — unstarted.
- **Owner gate:** authorization to begin.

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
  pipeline half landed in Slice 4 (ADR-004): one `JSON.parse`-only ingestion
  boundary with a pre-Zod safety scan, no registry mutation from content, and
  unknown round types rejected at import.
