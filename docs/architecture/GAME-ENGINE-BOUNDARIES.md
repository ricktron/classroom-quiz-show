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
`tests/e2e/projector-safety.spec.ts` / `src/test/leakLabels.ts`. Gameplay-era
private data (answers, notes, wagers, upcoming prompts) still does not exist;
those fields join the private state — and are guarded by the same allow-list — in
later slices.

## 5. Imported content is data, never executable code

Game packs and question imports are **data**. The engine must **never** execute
code supplied by an imported file.

- Unknown round types must: **fail validation**, remain unavailable for play,
  never execute imported code, never reveal private data, produce a clear
  host-side error, and leave the display in a safe state.
- "Custom" rounds are still typed, registered definitions — not a code hatch.

## 6. Command / event architecture (future)

Runtime is command-driven: the host issues **commands**; a reducer produces an
**append-only event history**; state is derived from events. Undo, replay, and
recovery are all derived from the event model rather than ad-hoc mutation.

**Status (Slice 2).** Implemented as a neutral foundation with a deliberately
small, non-gameplay command/event vocabulary — see
[`ADR-002-state-event-sync-core.md`](ADR-002-state-event-sync-core.md). The pure
reducer, append-only history, deterministic replay, and auditable undo (an
append-only `EVENT_UNDONE` marker, never a deletion) all exist now. Gameplay
commands/events (tiles, reveal, teams, scoring, timers, wagers, rounds) are still
deferred to later slices and will extend this core, not replace it.

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
import path must eventually pass through **one** canonical validation and
normalization pipeline (Zod-based, future). Malformed content produces
actionable errors; ambiguous content is **never** silently repaired.

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
