# ADR-003: Game & round model + registry

- **Status:** Accepted
- **Date:** 2026-07-23
- **Slice:** 3 (game & round model + registry)
- **Deciders:** Project owner (Rick), implementing agent
- **Builds on:** [`ADR-002-state-event-sync-core.md`](ADR-002-state-event-sync-core.md)

## Context

Slice 3 adds the smallest durable domain model the reusable engine needs on top
of the Slice 2 state/event/sync core: a typed, multi-round game model and a
non-executable round registry. It must honor the permanent invariants from
[`GAME-ENGINE-BOUNDARIES.md`](GAME-ENGINE-BOUNDARIES.md) — §2 (definition vs.
session), §3 (typed rounds + registry), §4 (host-owned private → sanitized
public, fail closed), §5 (content is data, never code) — **without** implementing
any playable round. No board, questions, answers, scoring, teams, timers,
wagers, transitions, persistence, Zod, or JSON import (those are Slices 4–11).

## Decision

### 1. Branded identifiers (`src/game/ids.ts`)

`GameId`, `RoundId`, `RoundType`, `GameSessionId` are compile-time **branded
strings** — plain strings at runtime, but only constructible through validating
constructors, so id kinds cannot be mixed. `RoundType` is deliberately an open
branded string, **not** a closed union: an authored game may reference any type,
including one this build does not recognize. Known vs. unknown is decided by the
registry at runtime — never by narrowing the type — which is what makes an
unknown type *representable* and therefore handleable fail-closed.

### 2. `GameDefinition` vs. `GameSession`

- **`GameDefinition`** (`src/game/gameDefinition.ts`) is reusable, authored,
  immutable **data**: `modelVersion`, `id`, `title`, and an **ordered**
  `RoundDefinition[]`. Order is the array position — never registry order.
  `createGameDefinition` is the trusted factory: it validates a non-empty
  id/title, validates each round, **enforces unique round ids**, copies the
  round array, and **deep-freezes** the result so it can never be mutated later
  (including through a session). An **empty rounds list is explicitly allowed**
  (a valid game with no selectable round). The canonical JSON format and Zod
  pipeline are Slice 4 — this factory trusts its caller for content but still
  enforces structural invariants.
- **`GameSession`** is runtime progress derived from a definition plus session
  history. It is modeled as `PrivateGameState` inside the Slice 2 private state
  (`src/state/privateState.ts`): the loaded definition, a `gameLifecycle`
  (`active | ended`), a `currentRoundIndex` (or `null`), and a
  `currentRoundSupport` (`supported | unsupported | null`).

**Snapshot strategy.** The session stores the **deep-frozen `GameDefinition`
reference** captured from the `GAME_INITIALIZED` event. Because the factory
deep-freezes it, that reference is an immutable in-memory snapshot — session
operations never mutate it, and there is no defensive re-clone on every read.

### 3. Typed `RoundDefinition` (`src/game/roundDefinition.ts`)

Every round has a stable `RoundId`, declares a `RoundType`, and carries
type-specific `config`. The base model assumes **no** categories, points, teams,
timers, wagers, scoring, text-only content, or reveal mechanics. `config` is
typed as `RoundConfig` (a recursive `DataValue` — string/number/boolean/null/
array/object), which **structurally forbids functions** — the compile-time half
of "content is data, never code". A single built-in **placeholder** round type
(clearly non-gameplay) exists only to prove the model end to end; it must not
grow into a playable round (that is Slice 5's `category-board`).

### 4. Round registry (`src/game/registry.ts`)

A small, application-controlled, deterministic table mapping a known `RoundType`
to a typed `RoundTypeEntry` (`type`, host-only `displayName`, `matches` guard,
`createInitialState`, `toPublicRoundView`). API: `register` (throws
`RegistryError` on a duplicate), `lookup` (explicit `{ status: 'known' | 'unknown' }`
— never a thrown miss or a fallback), `isKnown`, `knownTypes`. The registry is
**not** the source of round ordering, never executes imported code, never
dynamically imports modules, accepts no function bodies from content, and never
silently falls back from an unknown type to a default. `createDefaultRegistry()`
registers exactly the placeholder type. The store owns a registry and injects an
`isKnownRoundType` predicate into the planner.

### 5. Command / event additions

Four commands and four events extend the Slice 2 vocabulary conservatively:

| Command | Event | Reversible | Effect |
| --- | --- | --- | --- |
| `INITIALIZE_GAME` | `GAME_INITIALIZED` | no | Load a definition into the session (baseline) |
| `SELECT_ROUND` | `CURRENT_ROUND_SELECTED` | yes | Select the current round by stable id |
| `ADVANCE_TO_NEXT_ROUND` | `ROUND_ADVANCED` | yes | Move to the next round in definition order |
| `END_GAME_SESSION` | `GAME_SESSION_ENDED` | no | End the session (finalization) |

Rejections (no event, no mutation): `session-not-initialized`,
`invalid-game-definition` (a malformed definition fails closed at the boundary),
`game-not-initialized`, `unknown-round` (id not in the definition), `no-next-round`
(advancing past the final round, or an empty game — a safe no-op).

**Round support is resolved once, at plan time**, from the injected registry
predicate and **frozen onto** the selection/advance event (`support: 'supported'
| 'unsupported'`). Therefore `reduce`/`replay` need no registry and replay stays
deterministic from history alone — even if the registry later changes. This is
why there is no separate `UNSUPPORTED_ROUND_ENCOUNTERED` event: unsupported-ness
is a discriminant on the round event plus derived private state, which keeps the
clean one-command → one-event undo model.

**Undo / replay.** Reversible events (`CURRENT_ROUND_SELECTED`, `ROUND_ADVANCED`)
undo via the existing append-only `EVENT_UNDONE` marker — undo of a selection
reverts to the prior selection on replay, and the audit log is preserved.
Irreversible events (`GAME_INITIALIZED`, `GAME_SESSION_ENDED`) are never
targeted: game init/end are hard baselines. Re-initializing a game replaces the
loaded game; un-ending is not supported in Slice 3 (a known limitation).

### 6. `PublicState` additions (allow-list) and unknown-type fail-closed

`PublicState` gains one allow-listed field, `game: PublicGameView | null`, and
the wire version bumps **1 → 2** (a display expecting the old shape fails closed
on the mismatch). `PublicGameView` is minimal and **derived**: `status`
(`active | ended`), `roundCount`, a 1-based `currentRound` ordinal (or `null`),
and a neutral `roundAvailability` (`none | available | unavailable`). It never
carries the game title, round ids, round-type identifiers, round labels, or any
config. The sanitizer builds it by naming those derived fields only — it never
reads `definition.rounds`' content — so authored data (and future answers/notes)
cannot leak.

An **unsupported** current round projects to `roundAvailability: 'unavailable'`
and nothing else. Host behavior: a concise host-only diagnostic
(`currentRoundSupport = 'unsupported'`, plus the round type shown only on the
private host panel); the game does not crash, no other round is substituted, and
no gameplay starts. Display behavior: a neutral "This round is not available yet"
— no type name, no reason, no diagnostics, non-interactive. Replay and sync stay
deterministic and never publish registry/definition internals.

## Alternatives considered

- **A closed `RoundType` union.** Rejected: it makes an unknown type
  inexpressible, which defeats fail-closed handling. An open branded string plus
  a runtime registry is the only shape that can *represent* the unknown.
- **A separate `UNSUPPORTED_ROUND_ENCOUNTERED` event.** Rejected: it duplicates
  the selection event and complicates undo. A `support` discriminant on the
  round event is deterministic and simpler.
- **Passing the registry into `reduce`/`replay`.** Rejected: it would make
  replay depend on live registry state. Freezing support onto the event keeps
  replay a pure function of history.
- **Storing a re-cloned definition snapshot per read.** Unnecessary: the
  factory deep-freezes once, so the stored reference is already immutable.
- **Zod / JSON import now.** Out of scope (Slice 4). Slice 3 uses trusted
  in-memory definitions with a structural factory + guard.

## Consequences

- Slices 4–5 can add the canonical JSON/Zod pipeline and the first playable
  round type behind this registry and model without changing the state core.
- The private→public allow-list now guards a game view too; adding a private
  game field does not leak by default.
- Un-ending a game and richer round runtime state are deferred by design.

## Verification method

- **Unit (Vitest):** branded-id validation; factory unique-id/duplicate/empty/
  malformed handling and deep-freeze immutability; registry known/unknown/
  duplicate/no-fallback/no-mutation-from-data; content-is-data (no-function deep
  scan, JSON round-trip, cast-only code path, no registry exec surface); game
  command/event determinism, rejection-no-mutation, replay determinism +
  idempotency, undo/audit, unknown-type at init/select/advance/replay; sanitizer
  game projection (allow-listed keys, unsupported → unavailable, ended, no leak).
- **Browser (Playwright, real BroadcastChannel):** host loads a sample game and
  the display shows only safe round status; advancing updates the display; the
  display cannot select/advance and exposes no round-type identifiers; an
  unsupported round leaves the display safe; refresh and a second tab resume the
  current round; ending shows a neutral "complete". Existing routing, PWA/offline,
  projector-leak, responsive, accessibility, and sync suites remain green.
