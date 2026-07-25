# ADR-004 — Canonical validation & import pipeline

- **Status:** Accepted (Slice 4)
- **Date:** 2026-07-24
- **Supersedes:** nothing
- **Related:** [ADR-002](ADR-002-state-event-sync-core.md) (state/event/sync core),
  [ADR-003](ADR-003-game-round-model-registry.md) (game & round model + registry),
  [GAME-ENGINE-BOUNDARIES §5, §10](GAME-ENGINE-BOUNDARIES.md)

## Context

Slice 3 gave the engine a typed domain model (`GameDefinition`,
`RoundDefinition`, the round registry) but every definition was a **trusted
in-memory object** built by application code through `createGameDefinition`.
That is fine for fixtures and diagnostics; it is not a way to get a teacher's
content into the app.

Slice 4 has to open that door — and opening it is the moment the application
starts consuming data it did not author. Everything that follows (the
category-board round, spreadsheets, authoring, packs) either goes through a
trusted ingestion boundary or the boundary does not exist at all. So the
question this ADR settles is not "how do we parse JSON" but "what is the single
place where untrusted content becomes trusted, and what must be true there".

## Decision

### 1. One canonical, versioned JSON format

A game file is a single JSON **object** with an explicit format identity and an
explicit schema version:

```jsonc
{
  "format": "classroom-quiz-show/game",
  "schemaVersion": 1,
  "id": "sample-foundation-game",
  "title": "Foundation Sample Game",
  "rounds": [
    {
      "id": "round-1",
      "type": "placeholder",
      "title": "Round One",
      "config": { "note": "…" }
    }
  ]
}
```

Only fields justified by the current Slice 3 domain model are present. There are
deliberately **no** speculative fields for scoring, teams, timers, media,
wagers, categories, authoring, or persistence — those arrive with the slices
that actually implement them.

- **Round order is the `rounds` array order.** The registry never influences it.
- **Identifiers are supplied by the document and validated**, never generated.
  Stable ids are what makes a game file portable, re-importable, and diffable;
  generating them would make two imports of the same file produce different
  games.
- **Empty `rounds` is valid**, matching the Slice 3 contract
  (`createGameDefinition` accepts a game with no rounds). The import boundary
  does not invent a stricter rule than the model it feeds.

### 2. Exactly one pipeline

`src/import/importGame.ts` is the only path from untrusted input to a
`GameDefinition`:

```
unknown input
  → transport decoding      (text/emptiness/size guards)
  → JSON parsing            (JSON.parse only)
  → format discrimination   (exact format identity)
  → version discrimination  (exact, implemented schema version)
  → document safety scan    (plain, finite, acyclic, safely-keyed data)
  → Zod validation          (strict structure, no coercion)
  → semantic validation     (unique ids, non-blank titles)
  → registry compatibility  (registered type + that type's config schema)
  → normalization           (branded ids, deep copy)
  → trusted construction    (createGameDefinition → deep-frozen)
  → success | structured failure
```

Adapters may decode their transport and must then converge here. There is no
alternate path for pasted JSON, the built-in samples, or tests: the samples in
`src/import/sampleGameFile.ts` are JSON **text** precisely so they cannot skip
validation.

The one deliberate exception is application-created **trusted fixtures**
(`src/game/sampleGame.ts`), which build definitions directly through the domain
constructor. Those are not an import path — they never touch user-controlled
data — and the host UI labels them as such.

### 3. Version policy: explicit, no guessing

The supported format and version are constants. Missing, malformed, older, and
newer versions all fail. No shape guessing, no "best effort" detection, no
silent upgrade or downgrade. An older version could only be accepted alongside a
real, tested migration; none exists, so `SUPPORTED_SCHEMA_VERSIONS` has exactly
one entry. A future migration layer would add a version there *and* the
migration *and* its tests, together or not at all.

### 4. Structural vs. semantic validation

Zod proves the **shape**. It cannot prove relationships between fields, so
semantic checks (unique round ids, non-blank titles) run after it as a separate
stage.

The `semantic` stage also covers a **document safety scan that runs *before*
Zod**. Two reasons, and the first is not theoretical:

1. **`z.strictObject` does not flag `__proto__`, `constructor`, or `prototype`
   as unrecognized keys.** Zod decides "unrecognized" with an `in`-style check
   against the schema shape, and those three names are inherited from
   `Object.prototype`, so `'__proto__' in shape` is `true` and a strict object
   reports nothing. Verified against zod 4.4.x and pinned by a test
   (`src/import/safety.test.ts`) so a future Zod version that changes this is
   noticed rather than assumed.
2. A precise `unsafe-object-key` / `non-data-value` issue is far more actionable
   than a generic schema error, and the object-level entry point accepts
   arbitrary in-memory values (functions, `Date`, `Map`, cycles, non-finite
   numbers) that `JSON.parse` could never produce.

The scan also rejects **accessor properties**. A getter can return one value
while it is being validated and another when the definition is later built from
it — a time-of-check/time-of-use hole, and a live one here because Zod's
`z.custom` returns `config` by reference, so normalization re-reads the original
object. Data has no accessors (`JSON.parse` cannot produce one), so rejecting
them closes that class outright instead of relying on every downstream reader to
snapshot defensively.

The scan **rejects**; it never strips or rewrites.

### 5. Strict unknown keys

Every canonical object is a strict Zod object. An unknown or misspelled key is a
hard error naming the exact path (`rounds[0].points`), not a silently dropped
field. A teacher who types `"tittle"` finds out immediately instead of wondering
why their title vanished. Round `config` keys are decided by the round type's
own schema, which is likewise strict for the built-in type.

### 6. Registry supplies one config schema per round type

`RoundTypeEntry` gains a required `configSchema`. Consequences:

- each known round type has exactly **one** config validation path;
- an **unknown round type fails the import** — it has no schema, and there is no
  generic fallback;
- application code registers schemas; **imported content cannot** — a game file
  is data and has no path to `register`;
- duplicate registration still throws (Slice 3 invariant intact);
- registration order still does not affect round order.

The schema **validates and never transforms**: the pipeline discards the parsed
output and normalizes from the original validated input, so a schema cannot
silently rewrite, default, or coerce authored content even by accident.

#### Slice 3 vs. Slice 4 on unknown round types — deliberately different

| | Slice 3 (trusted, in-memory) | Slice 4 (untrusted, imported) |
| --- | --- | --- |
| Can an unsupported type be represented? | **Yes** — `RoundType` is an open branded string | **No** — import fails |
| Where is it handled? | At selection: host diagnostic + neutral "unavailable" display | At the import boundary, before any session state |
| Why | The engine must be *provable* against encountering one | A teacher deserves an error at import time, not a dead round mid-lesson |

These are complementary, not contradictory. One governs trusted in-memory
construction and fail-closed runtime behaviour; the other governs ingestion.
Slice 3's fail-closed handling is unchanged and still tested.

### 7. Normalization is narrow and lossless

Normalization may only: construct branded ids from already-validated strings,
deep-copy validated config (so the caller's input object is never mutated —
`createGameDefinition` deep-freezes what it is given), and call the trusted
constructor.

It may **never**: generate a missing id · de-duplicate ids · drop or replace an
unsupported round · substitute a default config · truncate an overlong value ·
invent a title · reorder rounds · silently drop unknown fields · accept a
partially valid game · change semantic meaning. **No silent repair — return a
failure instead.**

### 8. Structured errors, not exceptions

Invalid input is data:

```ts
type ImportResult =
  | { status: 'success'; definition: GameDefinition; metadata: ImportMetadata }
  | { status: 'failure'; issues: readonly ImportIssue[] }
```

Because the union is discriminated, TypeScript forces callers to handle both
outcomes; there is no way to reach a `GameDefinition` from a failed import.
Each `ImportIssue` carries a stable `code`, a `stage`, a document `path`, an
actionable `message`, and optional safe `context` — never a stack trace, a raw
exception, or the raw document. Multiple independent issues are preserved and
ordered deterministically by pipeline stage (stable within a stage, so document
order is kept).

An unexpected internal throw is contained at the boundary: the caller gets a
generic `internal-error` issue while the raw error goes only to an injected
developer reporter.

### 9. State/event isolation

The import module imports **no** store, reducer, or sync symbol. It is a pure
function from input to result, so a failed import is structurally incapable of
appending an event, changing the revision, replacing the active definition,
changing the selected round, publishing sync data, or altering `PublicState` or
the display. A *successful* import reaches state only when a caller explicitly
dispatches the existing `INITIALIZE_GAME` command — there is no parallel
initialization path. Raw source text and validation issues never enter the
definition, the session, the event history, or any sync message.

### 10. Host-only diagnostics; display unchanged

The host import harness renders the textarea, the result, and every issue. All
of it is private. `PublicState` gains **no** import status, filename, raw title,
error path, or schema diagnostic. An invalid import produces no display change
at all; a valid one produces exactly the same safe game/session status Slice 3
already supported.

## Alternatives considered

- **Hand-written validators instead of Zod.** Rejected: the plan of record calls
  for Zod, and hand-rolled recursive validators drift from the types they check.
  (The safety scan is hand-written *on purpose* — it checks things a schema
  library structurally cannot, as §4 explains.)
- **Lenient import with warnings.** Rejected: "we fixed it for you" is how a
  teacher ends up projecting content they did not write. No silent repair is a
  permanent invariant, not a Slice 4 convenience.
- **Import unknown round types and fail at play time.** Rejected — see §6.
- **Generating ids when absent.** Rejected: it breaks re-import stability and
  makes two imports of one file produce different games.
- **A single "invalid file" error.** Rejected: unactionable. The whole point of
  the structured model is that a teacher can find the field.
- **Nesting the game under a `game` key.** Rejected as ceremony: the top-level
  object already carries the format discriminator, so a wrapper adds a level of
  nesting without adding information.

## Consequences

**Positive.** One auditable trust boundary. Actionable, teacher-readable errors
with exact paths. Strict-by-default so mistakes surface immediately. Prototype
pollution, non-data values, cycles, and executable-like structures are rejected
before construction. The failure path provably cannot touch authoritative state.
Slice 5's `category-board` only needs to register a config schema to become
importable.

**Negative / accepted costs.** Strictness will reject files that a lenient
parser would accept — deliberate, and the error says exactly what to fix. Adding
a field to the format is a versioned change, not a drive-by edit. One runtime
dependency (`zod`) is added. Every new round type must supply a config schema.

## Known limitations

- **One version, no migrations.** By design; a v2 will need a real migration.
- **The size guard is on character count**, not bytes, and applies only to the
  text entry point. The object entry point is bounded by nesting depth and the
  round/title/id limits instead.
- **Duplicate JSON keys are not observable.** `JSON.parse` keeps the last
  occurrence; the pipeline validates the survivor. This is documented behaviour,
  not a claimed defence.
- **No file picker, no spreadsheet/CSV/XLSX, no remote URL import.** Slice 4
  ships the paste adapter only; other transports are later slices and must
  converge on this same pipeline.
- **The placeholder config schema is intentionally trivial** (one `note`
  string). It proves the seam; it is not a preview of `category-board`.
