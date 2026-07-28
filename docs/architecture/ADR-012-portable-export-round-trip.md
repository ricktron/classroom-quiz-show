# ADR-012 — Portable export and round-trip import

- **Status:** Accepted (Slice 12) — **In review**
- **Date:** 2026-07-28
- **Slice:** 12 — Portable export & round-trip import
- **Depends on:** [ADR-004](ADR-004-canonical-validation-import.md),
  [ADR-006](ADR-006-teams-and-scoring.md),
  [ADR-007](ADR-007-timers-arming-transitions.md),
  [ADR-011](ADR-011-media-contract.md),
  [`GAME-ENGINE-BOUNDARIES.md`](GAME-ENGINE-BOUNDARIES.md)
- **Supersedes:** nothing

## Context

Slices 4 and 11 gave the engine a single canonical ingestion boundary and a
typed media contract on `schemaVersion: 1`. Teachers can import authored games,
but until Slice 12 there was no way to take a loaded immutable
`GameDefinition` back out as durable, owned, offline JSON.

Slice 12 must therefore export the loaded definition to the **existing**
canonical document, prove those bytes re-import through
`importGameFromJsonText`, and keep runtime session state, sync, and the
projector completely out of the path.

## Decision

### 1. Source of truth

Export only `game.definition` from the currently loaded private game session.
The exporter consumes the immutable `GameDefinition`. It never reads scores,
selected tiles, reveal stages, buzz queues, timer deadlines, event history,
keyboard/gamepad mappings, host notes, revision, diagnostics, `PublicState`, or
sync envelopes.

Authored answers, alternates, and teacher notes are part of the definition and
are exported.

### 2. Definition-versus-session boundary

A definition is authored content. A session is runtime progress. Export is a
pure function of the definition. It dispatches no command and mutates no store.

### 3. Canonical normal form

The exporter builds one canonical normalized version-1 document:

```jsonc
{
  "format": "classroom-quiz-show/game",
  "schemaVersion": 1,
  "id": "<preserved game id>",
  "title": "<title>",
  "teams": [ /* only when non-empty */ ],
  "timer": { "responseSeconds": <integer> },
  "rounds": [ /* preserved order */ ]
}
```

No `modelVersion`, no `team.order`, no export metadata, timestamps, hashes, or
filename fields.

### 4. Root field order

Root properties are inserted in this exact order:

`format` → `schemaVersion` → `id` → `title` → `teams` (optional) → `timer` → `rounds`

### 5. Optional-team policy

Emit `teams` only when at least one team exists. An empty trusted team list
omits the field entirely rather than emitting `teams: []`.

Each team emits `{ id, name, accent }` in that property order. Trusted accents —
including accents that originated from a positional default — are always
emitted explicitly. `order` is never emitted.

### 6. Explicit timer and accent policy

`timer` is always emitted as `{ "responseSeconds": <integer> }`, even when the
original document omitted it and the trusted definition carries the default.
Defaulted accents are likewise made explicit on export.

### 7. Stored round-config policy

Each round emits `{ id, type, title, config }` in that order. The exporter
serializes the stored `RoundDefinition.config`, not a derived board view. That
preserves authored shorthand (legacy string prompts, omitted multipliers) and
avoids rewriting definitions from trusted readers.

### 8. Recursive config key ordering

Generic `config` content is recursively canonicalized:

- scalars pass through; `-0` normalizes to `0`
- arrays preserve order and are never sorted
- plain/`null`-prototype objects get lexicographically sorted own enumerable
  string keys into a fresh null-prototype object
- own symbol keys and accessor properties fail closed without invoking getters
- unsupported values (`undefined`, non-finite numbers, functions, exotic
  objects, cycles) fail closed

Emitted config-object bytes use that same UTF-16 key order. The exporter does
**not** rely on `JSON.stringify` for nested config objects, because the engine
reorders integer-index keys (`"0"`, `"1"`, `"10"`, …) into ascending numeric
order and would otherwise violate this contract.

### 9. JSON byte format

```ts
serializeCanonicalDocument(canonicalDocument) + '\n'
```

Compact JSON (same scalar escaping/number rules as `JSON.stringify`), UTF-8 in
the Blob, exactly one trailing LF, no CR, no BOM, no timestamps, no randomness.
Root / team / timer / round envelopes keep their explicit field order; generic
config keys are UTF-16-sorted in the emitted text. Repeated export of an
equivalent definition produces identical text.

### 10. Stable identity

`GameDefinition.id` is preserved exactly. No new ID, session ID, hash, or
fingerprint is introduced. Casing is preserved.

### 11. Filename

Exact download filename:

```text
<game-id>.classroom-quiz-show.json
```

Derived from the game id, never from the title.

### 12. Registry behavior

Export accepts an optional injected `RoundRegistry` and defaults to
`createDefaultRegistry()`. The generated document must be accepted by
`importGameFromJsonText` with that same registry. Unsupported rounds or invalid
registered configs fail the export; nothing is downloaded on failure.

### 13. Re-import gate

Before success, the exporter:

1. serializes the document
2. enforces `MAX_IMPORT_TEXT_LENGTH` (the existing import transport limit)
3. re-imports the exact text through `importGameFromJsonText`
4. requires structural equality with the source definition
5. re-serializes the imported definition and requires byte-identical output

### 14. Structural equality

Equality compares model version, id, title, teams in order (id/name/accent),
timer seconds, rounds in order (id/type/title/config), nested arrays in order,
and nested object key/value content. Object property insertion order,
ordinary-versus-null prototype, and freeze state do not affect equality.
Numbers compare with `===` (`-0` and `0` are equivalent). Referential equality
and raw `JSON.stringify(definition)` are not used.

### 15. Failure behavior

Failures return structured `ExportIssue` codes only — no filename, no JSON
success payload, no partial document, no silent repair, no removal of
unsupported rounds.

### 16. Host-only download

The pure exporter never calls DOM APIs. `downloadGameFile` is an injectable
browser boundary that creates a Blob
(`application/json;charset=utf-8`), one object URL, one temporary anchor, one
click, immediate removal, and scheduled URL revocation.

### 17. Answer-key and teacher-note warning

The host export surface always warns:

> Portable game files contain answer keys, alternates, and teacher notes. Keep them on the host side.

Portable game files must be treated as host-owned material, not projector-safe
output.

### 18. Media-reference limitation

The portable JSON preserves same-origin media paths but does not include the
referenced media files. Paths are not rewritten, absolutized, embedded, or
converted to data URLs. Complete self-contained packs remain deferred to
Slice 17. When the loaded game contains at least one image prompt, the host
surface also warns:

> This file preserves media paths but does not include the referenced media files.

### 19. Privacy and sync non-impact

Export changes none of revision, session identity, event history, scores,
selected tile, reveal stage, response phases, buzz queue, `PublicState`, sync
messages, or display DOM. Export status is local React state only.

### 20. Size-limit behavior

Generated text must satisfy `jsonText.length <= MAX_IMPORT_TEXT_LENGTH` before
any Blob or download is created. There is no second independent size constant.

### 21. Consequences for Slice 13

Slice 13 may persist definitions and sessions, but export remains the portable
authored-game copy path. Persistence must not become a second import pipeline
or a second identity scheme.

### 22. Consequences for Slice 17

Complete portable packs (bundled media) remain Slice 17. Slice 12 deliberately
exports path references only.

### 23. Explicit non-goals

No IndexedDB, localStorage, persistence, recovery, cloud export, remote
destinations, account storage, file-picker import, spreadsheet formats,
authoring/editing, media bundling, data URLs, remote media, new media kinds,
schema version 2, new canonical fields, hash identity, public-state changes,
sync changes, command/event changes, or new npm dependencies.

## Versions unchanged

| Layer | Version |
| --- | --- |
| Canonical game-file `schemaVersion` | **1** |
| `GAME_DEFINITION_MODEL_VERSION` | **1** |
| `PUBLIC_STATE_SCHEMA_VERSION` | **7** |
| Sync envelope | **2** |
