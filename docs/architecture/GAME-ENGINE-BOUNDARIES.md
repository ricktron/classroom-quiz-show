# Game-engine boundaries

**Status:** Architectural constraint document (Slice 1). This describes the
_target_ architecture and the invariants that must hold as it is built. It is
**not** a claim that these systems are implemented. Slice 1 implements only the
shell, routing, PWA, and safety scaffolding; everything below marked "future" is
deferred.

This document exists so that later slices — and any external summarizer such as
OpenClaw NightWatch or an Obsidian Command Center — do not encode assumptions
that would block the intended engine.

## 1. A game is an ordered collection of rounds

Classroom Quiz Show is **not** a Jeopardy clone. It is a reusable, local-first
classroom game-show **engine**. The category-and-point-value board is the _first_
round type, not the product.

```
GameDefinition
 ├─ metadata
 ├─ theme
 ├─ teams configuration
 ├─ global scoring defaults
 ├─ ordered RoundDefinition[]      ← the core: many rounds, many types
 ├─ optional assets
 └─ optional standards metadata
```

**Invariant:** nothing in the codebase may assume _one game == one board_.

## 2. Game definition vs. game session

- **GameDefinition** — authored, versioned, portable content (see §11). Static
  data. Never executable.
- **GameSession** — runtime state derived from a definition: active round,
  completed rounds, teams, command history, event history, and the split
  between private host state and public display state (see §4).

These are distinct concepts and must not be conflated.

**Status (Slice 3).** Both now exist as neutral, non-gameplay foundations — see
[`ADR-003-game-round-model-registry.md`](ADR-003-game-round-model-registry.md).
`GameDefinition` (`src/game/gameDefinition.ts`) is immutable authored data
(deep-frozen by its factory, unique round ids enforced, ordered rounds). The
`GameSession` concept is modeled as `PrivateGameState` inside the private state
(loaded definition snapshot, `gameLifecycle`, `currentRoundIndex`,
`currentRoundSupport`) and is driven by the new game commands/events. The two are
kept strictly separate: session operations never mutate the frozen definition.
Teams, scoring, and round gameplay state are still deferred.

## 3. Typed round definitions + a round registry (future)

Each round is described by a typed `RoundDefinition` (id, schema version, type,
title, order, instructions, scoring config, timer config, completion criteria,
transition config, optional media, optional theme override, optional standards
tags, enabled/disabled, and typed round-specific configuration).

Round _behavior_ is provided by a **typed round registry**. Each registered type
may eventually define: schema validator, default config, host renderer, display
renderer, command definitions, event reducer, public-state sanitizer, completion
logic, scoring behavior, migration logic, editor support, import/export support,
accessibility metadata, and a testing contract.

Planned registered types (not implemented in Slice 1):

1. `category-board`
2. `final-wager`
3. `sequential-prompts`
4. `image-identification`
5. `timeline-ordering`
6. `matching`
7. `data-interpretation`
8. `concept-map`
9. `claim-evidence-reasoning`
10. `whiteboard-challenge`
11. `custom`

**"Single" and "Double" are NOT engine types.** They are `category-board`
rounds with different titles, multipliers, point ladders, and timers. Avoid
protected commercial branding as internal identifiers; teacher-facing labels
(e.g. "Round 1", "Double Points", "Challenge Board") are free text.

**Invariant:** custom rounds are constrained to registered, typed definitions.
There is no path for arbitrary teacher content to become a new code-bearing
round type at runtime (see §5).

**Status (Slice 3).** The typed `RoundDefinition` and the round **registry
scaffold** now exist — see
[`ADR-003-game-round-model-registry.md`](ADR-003-game-round-model-registry.md).
`RoundType` is an open branded string; the registry (`src/game/registry.ts`)
decides known vs. unknown with an **explicit** lookup result and **no silent
fallback**, duplicate registration throws, and it is application-controlled (no
dynamic import, no eval, no code from content). Round order comes from
`GameDefinition`, never the registry. Only one deliberately **non-gameplay**
placeholder type is registered so far; the registry entry's typed behavior
(`matches`, `createInitialState`, `toPublicRoundView`) is the seam real round
engines fill from Slice 5 on. An unknown/unsupported round type **fails closed**:
a host-only diagnostic, a neutral "unavailable" display, no substitution, no
crash, deterministic replay.

**Status (Slice 5).** The first PLAYABLE type is registered: `category-board` —
see [`ADR-005-category-board-round.md`](ADR-005-category-board-round.md). It
fills the registry seam exactly as designed: application code registers the
entry, the entry supplies the single config schema, and the type's gameplay
behaviour lives in the pure reducer and the allow-list sanitizer rather than in
the registry. Imported content still cannot register a type, replace a schema, a
reducer, or a public projection, or supply a callback; duplicate registration
still throws. The non-gameplay `placeholder` type is retained as the engine-test
round and the safe fallback fixture. Round order still comes from the
`GameDefinition`, never the registry.

## 4. Host-owned authoritative state → sanitized public state

This is a **permanent** requirement.

```
Private HostState ──(explicit toPublicState sanitizer)──▶ PublicState ──▶ display renderer
```

- The **host** owns the single authoritative runtime state.
- The **display** receives **only** an explicitly sanitized `PublicState`.
- The display must **never** receive a private field merely because the current
  UI does not render it. Sanitization is allow-list, not "hide in CSS".

Private data will eventually include: correct answers before reveal, teacher
notes, acceptable alternate answers, upcoming prompts, hidden bonus locations,
private wagers, unrevealed responses, host-only controls, import diagnostics,
unpublished round configuration, and private citations.

**Answer reveal:** an answer may appear in `PublicState` only after the host has
explicitly moved the current prompt into an answer-revealed state.

**Fail closed.** Any synchronization error, decoding error, schema mismatch,
stale state, unsupported version, runtime error, or missing round renderer must
resolve the display to a **safe** state — never to leaked private data and never
to a crash that exposes internals.

**Status (Slice 2).** The allow-list sanitizer now exists:
`toPublicState(private): PublicState` in `src/state/sanitize.ts` (see
[`ADR-002-state-event-sync-core.md`](ADR-002-state-event-sync-core.md)). It
constructs each public field explicitly — no clone-and-delete, no spread, no
serialization of private state — so a newly-added private field cannot leak by
default. `PublicState` (`src/state/publicState.ts`) is dependency-free so the
display bundle cannot pull a private type in, and `safeToPublicState` makes a
projection failure fall back to the safe initial state. Structural `PublicState`
assertions (allow-listed keys only, future-field non-leak, serialized-value
checks) now back the baseline projector-leak string checks in
`tests/e2e/projector-safety.spec.ts` / `src/test/leakLabels.ts`. **Status (Slice 5).** Gameplay-era private data now exists, and the allow-list
holds. A `category-board` round carries prompts, canonical answers, alternate
acceptable answers, and host-only teacher notes; `PublicState` gained exactly one
new field, `round: PublicRoundState | null` (wire version 2 → 3). That DTO is
**current-stage-only** — at the board stage it carries category titles,
positional keys and effective values; from `selected` onward it carries one
selection and not the rest of the board — so the content of unselected tiles is
never sent rather than sent-and-hidden. Teacher notes and alternates are never
projected at any stage; authored ids are replaced by positional render keys; and
the wire discriminator is a neutral `kind`, not the registry round-type string.
**Answer reveal** is enforced structurally: `answer` is `null` in the DTO until
the host has dispatched an explicit answer-reveal command. Impossible private
state (a selection that is not on the board), an unusable config, a malformed
payload, a stale revision, or an old wire version each resolve to the neutral
"not available" panel.

## 5. Imported content is data, never executable code

Game packs and question imports are **data**. The engine must **never** execute
code supplied by an imported file.

- Unknown round types must: **fail validation**, remain unavailable for play,
  never execute imported code, never reveal private data, produce a clear
  host-side error, and leave the display in a safe state.
- "Custom" rounds are still typed, registered definitions — not a code hatch.

**Status (Slice 3).** Round `config` is typed as `RoundConfig` (a recursive
`DataValue` of string/number/boolean/null/array/object), so the type system
**forbids a function** anywhere in content — code in config is only expressible
through an explicit unsafe cast. Tests deep-scan sample definitions for functions,
assert JSON round-trippability, and assert the registry exposes no eval/import/
dynamic-registration surface.

**Status (Slice 4).** The import half now exists — see
[`ADR-004-canonical-validation-import.md`](ADR-004-canonical-validation-import.md).
`src/import/importGame.ts` is the **single** trusted ingestion boundary: every
entry point (pasted JSON, built-in samples, future adapters) converges on it.
It uses `JSON.parse` only — never `eval`, `new Function`, or dynamic `import()`
— and a **document safety scan** runs before Zod to reject reserved keys
(`__proto__`, `prototype`, `constructor`), non-data values (function, symbol,
bigint, `undefined`, `Date`, `Map`, `Set`, class instances), non-finite numbers,
cycles, and excessive nesting. Imported content cannot register a round type,
supply a schema, name a module, or mutate the registry; a `register`-shaped
field in a game file is simply an unknown field and is rejected as one.

**Status (Slice 5).** A playable round type's config is validated by the SAME
seam: `category-board` supplies its own strict schema through
`RoundTypeEntry.configSchema`, so there is still exactly one importer and one
config validation path per type. Whole-board relationship checks (id uniqueness
across the round, whitespace-only text, the total-tile budget) report through
Zod so they inherit exact document paths such as
`rounds[0].config.categories[1].tiles[2].prompt`. A function anywhere inside a
board config is still rejected by the pre-Zod safety scan, and a game file still
cannot register a type or supply a schema.

**Unknown round types now fail IMPORT** (stage `registry`), rather than being
imported and failing at play time. That is deliberately stricter than Slice 3's
trusted in-memory path, which must still be able to *represent* an unsupported
type so the engine can be proven to encounter one and fail closed. Both rules
hold simultaneously; ADR-004 §6 tabulates the distinction.

Code-related words in ordinary educational text (a prompt about `eval()`, a
round titled "Scripts and constructors") are plain strings and are imported
normally — the boundary rejects unsupported *structures*, not vocabulary.

## 6. Command / event architecture (future)

Runtime is command-driven: the host issues **commands**; a reducer produces an
**append-only event history**; state is derived from events. Undo, replay, and
recovery are all derived from the event model rather than ad-hoc mutation.

**Status (Slice 2).** Implemented as a neutral foundation with a deliberately
small, non-gameplay command/event vocabulary — see
[`ADR-002-state-event-sync-core.md`](ADR-002-state-event-sync-core.md). The pure
reducer, append-only history, deterministic replay, and auditable undo (an
append-only `EVENT_UNDONE` marker, never a deletion) all exist now.

**Status (Slice 5).** The first GAMEPLAY commands/events extend that core rather
than replacing it: `SELECT_CATEGORY_BOARD_TILE`, `REVEAL_CATEGORY_BOARD_PROMPT`,
`REVEAL_CATEGORY_BOARD_ANSWER`, `RETURN_TO_CATEGORY_BOARD` and their four
reversible events. Every command carries the `roundId` it targets, so a stale
host control is rejected rather than acting on the wrong round; a rejected
command appends no event and does not change the revision. Used-tile state is
derived **only** by replaying effective answer-reveal events, so undo releases a
tile exactly, with no separate bookkeeping to keep in step. Nothing in the
gameplay path reads a clock, a random source, or a locale-dependent ordering.
Teams, scoring, timers and wagers remain deferred.

## 7. Scoring-strategy boundary (future)

Scoring is a **typed strategy**, not permanently "integer points". The engine
must accommodate points, lives, stars, coins, badges, experience, and
round-specific composite scores, plus awards, deductions, partial credit,
unrestricted manual correction, multipliers, streaks, wagers, steals, caps/
floors, labels, audit history, and undo.

**Invariant:** no module may assume all rounds share one scoring model or that a
score is a bare number. Not implemented in Slice 1.

## 8. Theme boundary (future)

Themes configure presentation (typography, backgrounds, tiles, score
presentation, transition visuals, sound set, animation intensity) **independent
of game logic**. Themes must **never** alter scoring rules, the private/public
boundary, validation, event semantics, or answer-reveal authorization.

Slice 1 ships a restrained, token-driven visual identity (`src/styles`) that a
real theme engine can later replace. No theme engine is implemented.

## 9. Media boundary (future)

Prompts are **not** only strings. A prompt may reference typed media (text,
image, animated image, audio, video, diagram, graph, chart, document excerpt, 3D
model reference, interactive canvas), each with type, source, local/remote
classification, attribution/citation, alt text, optional caption/transcript,
preload behavior, and fallback behavior.

**Invariant:** no type or component may assume a prompt is a plain string. No
media pipeline is implemented in Slice 1.

## 10. Game-pack format (future)

Canonical stored truth is **versioned JSON**. Complete portable game packs
contain game metadata, ordered rounds, categories, prompts, answers, scoring
config, theme selection, media references, accessibility metadata, citations,
standards tags, a final round, and optional transition settings.

Spreadsheets are an authoring/import _convenience_, never runtime truth. Every
import path must pass through **one** canonical validation and normalization
pipeline (Zod-based). Malformed content produces actionable errors; ambiguous
content is **never** silently repaired.

**Status (Slice 4).** The canonical format and that one pipeline now exist —
see [`ADR-004-canonical-validation-import.md`](ADR-004-canonical-validation-import.md).
A game file is a JSON object discriminated by an exact
`format: "classroom-quiz-show/game"` and an exact `schemaVersion: 1`, carrying
only the fields the current domain model justifies (`id`, `title`, ordered
`rounds` of `{ id, type, title, config }`). Missing / malformed / older / newer
versions all fail — there is no shape guessing and no silent up- or downgrade,
because no migration is implemented. Unknown keys are **rejected, not dropped**,
and there is no coercion anywhere. Failures are structured `ImportIssue`s
(stable `code`, pipeline `stage`, document `path`, actionable `message`), and
the pipeline has no reference to the store, the reducer, or the sync layer — so
an invalid import cannot append an event, change the revision, publish sync
data, or alter `PublicState` or the display. A **successful** import reaches
state only through the existing `INITIALIZE_GAME` command.

Import diagnostics are host-only and, per §4, are never projected.

Standards use free-text namespaced tags (e.g. `teks:ESS.1A`, `ngss:HS-ESS2-1`,
`unit:plate-tectonics`). TEKS/NGSS are **not** required by the MVP.

## 11. AI copilot boundary (future)

AI may eventually **assist** teachers (suggest categories, balance difficulty,
find duplicates, improve wording, generate distractors, estimate reading level/
response time, suggest media, propose alternate answers, convert between round
types, suggest standards alignment, flag ambiguity). AI output must remain
teacher-reviewable and must **never** silently become canonical content. No AI
dependencies or APIs are added in Slice 1.

## 12. Explicitly deferred from Slice 1

Board engine, round engine, round-registry runtime, question/game-pack schemas,
Zod validation, spreadsheet import, team management, scoring, partial credit,
timers, answer reveal, BroadcastChannel, IndexedDB, leader locking, event log,
reducer/commands, undo, final wager, media pipeline, theme engine, soundboard,
random events, presentation APIs, whiteboard/concept-map/timeline interactions,
analytics, student buzzers, WebSockets, backend, accounts, grading, AI, and
multiple playable round types.

Slice 1 delivers only the foundation on which the above can be built without
rework, and the invariants (§4, §5, §7, §9) that must never be violated.

## 13. Testing policy (permanent)

This is a durable repository rule, not a framework. It exists so that "the tests
pass" keeps meaning the same thing as the engine grows.

**Every slice that changes user-visible host or display behavior must add or
update Playwright end-to-end coverage.** A board that renders, a control that
reveals something, a screen that fails closed — if a teacher or a classroom
could see the difference, an end-to-end test must exercise it in a real browser.

A slice with **no** user-visible change may have no Playwright test delta, but
it must still run the existing full e2e suite unless the repository's
verification policy explicitly permits otherwise. "Documentation only" is not by
itself a reason to skip verification.

### The testing split

Each layer answers a different question, and duplicating one inside another
buys nothing:

- **Unit tests** — schemas, reducers, commands, replay, helpers, and edge cases.
  This is where validation permutations, boundary values, rejection reasons, and
  determinism belong.
- **Component tests** — bounded UI states, accessibility, and rendering
  contracts: what a component renders for a given state, what it must never
  render, what its labels and disabled states are.
- **Playwright** — end-to-end teacher/projector workflows, host↔display
  synchronization, the privacy boundary in a real DOM, fail-closed behavior, and
  representative responsive behavior across the configured viewport projects.

**Do not require every validation permutation to be duplicated in Playwright.**
One representative end-to-end case per user-visible workflow is the target;
exhaustive input coverage stays in unit tests, where it is faster and clearer.

### Why the split matters here

The private→public boundary (§4) is the invariant most likely to regress
silently, and it regresses in the DOM, not in a type. That is why the projector
suites assert on rendered output and on the serialized payload — a leak that
type-checks and unit-tests clean can still reach a projector.
