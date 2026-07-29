# ADR-013 — Local persistence and recovery

- **Status:** Accepted (Slice 13)
- **Date:** 2026-07-29
- **Slice:** 13 — Local persistence & recovery
- **Depends on:** [ADR-002](ADR-002-state-event-sync-core.md),
  [ADR-004](ADR-004-canonical-validation-import.md),
  [ADR-012](ADR-012-portable-export-round-trip.md),
  [`GAME-ENGINE-BOUNDARIES.md`](GAME-ENGINE-BOUNDARIES.md)
- **Supersedes:** nothing

## Context

The host is the private, authoritative runtime. Slices 2-12 made that runtime
event-sourced, replayable, importable through one canonical pipeline, and
exportable as an owned game file. Until Slice 13, an accidental refresh could
still lose the active lesson.

Slice 13 adds local durability without changing the public projection, the sync
protocol, or the game-file schema. Persistence is a host-device convenience, not
a backend, not a public protocol, and not a second source of gameplay truth.

## Decision

### 1. Persistence boundaries

Persist three different concerns separately:

1. **Saved definitions** — authored `GameDefinition` records a teacher may load
   later.
2. **Active session** — the current append-only event history for recovery
   after refresh.
3. **Coordination** — host-tab lease state for deciding which local host tab may
   write.

Saved definitions are not active sessions. Coordination is not gameplay. None of
the three is projected to the display.

### 2. IndexedDB schema

Use one IndexedDB database, version 1, with exactly three object stores:

| Store | Purpose |
| --- | --- |
| `savedDefinitions` | Canonical exported game definitions keyed by game id |
| `activeSessions` | One current recovery record keyed by `current` |
| `coordination` | Host-writer lease keyed by `host-writer` |

The schema is intentionally small. There is no age-based session table, no
cross-session history table, and no controller mapping store in this slice.

### 3. Centralized constants

The database name, database version, store names, active-session key, lease key,
lease TTL, private wire format/version, and advisory channel name live in
`src/persistence/constants.ts`.

The current values are:

- database: `classroom-quiz-show-persistence`
- database version: `1`
- active-session key: `current`
- host-writer lease key: `host-writer`
- lease TTL: `4000` ms
- private active-session format: `classroom-quiz-show/persistence-session`
- private active-session version: `1`
- coordination channel: `classroom-quiz-show:persistence-coordination:v1`

No caller may duplicate these constants.

### 4. Saved-definition encoding

Saved definitions use the Slice 12 canonical exporter:

```ts
exportGameDefinition(definition, { registry })
```

The stored record contains metadata (`recordVersion`, `gameId`, `title`,
`savedAt`) plus the canonical JSON text. Loading a saved definition re-enters the
existing import boundary with `importGameFromJsonText`. Persistence is therefore
not a second import pipeline and not a second identity scheme.

### 5. Active-session wire format

Active sessions use a private, versioned envelope:

```jsonc
{
  "format": "classroom-quiz-show/persistence-session",
  "schemaVersion": 1,
  "savedAt": 123,
  "events": []
}
```

This is a browser-local storage format only. It is not a public protocol, not a
sync message, not a portable file format, and not a compatibility promise to any
external consumer.

### 6. GAME_INITIALIZED reconstruction

`GAME_INITIALIZED` events store the definition as canonical game JSON text.
Decoding reconstructs the definition only by calling:

```ts
importGameFromJsonText(definitionJson, { registry })
```

If that import fails, recovery fails closed. The persistence decoder never trusts
a stored object that claims to be a `GameDefinition`.

### 7. Event-history authority

The event history remains the only runtime authority. The store appends accepted
events and derives private state by replay:

```ts
store.getState() === replay(store.getHistory())
```

Persisted active-session data is accepted only as an event history. No persisted
state snapshot, score cache, selected tile, timer status, buzz queue, or public
projection is trusted as authority.

### 8. Trusted initialHistory seam

`createSessionStore({ initialHistory })` is the only recovery seam. The caller
must already have decoded and validated the history. The store does not parse
IndexedDB records, import definitions, or recover corrupt data; it receives a
trusted history and immediately derives state by replay.

### 9. Asynchronous durability

Command acceptance is in-memory first. If a command is accepted by the reducer,
the host state changes immediately and then persistence is attempted
asynchronously.

Writes are serialized through `PersistenceWriteQueue`. Active-session writes also
use a generation guard so stale queued writes can be skipped before touching
storage. If a write fails, the accepted command remains in memory; the host shows
a host-only warning that recent changes might not survive refresh.

### 10. Recovery UX

Recovery is explicit. On boot:

- no stored active session starts with an empty host session
- a valid unfinished active session shows **Resume session** and
  **Discard recovery**
- invalid recovery data shows a fail-closed discard path

There is no silent resume. While recovery is pending, session commands are
disabled. Discard clears the active-session record and starts empty.

### 11. Session cleanup

When replay says a history is not resumable, the active-session record is
cleared. This covers `GAME_SESSION_ENDED`; an ended game is not offered as a
recovery prompt.

There is deliberately no age TTL. A teacher may refresh after a long break and
still decide whether to resume or discard the unfinished local session.

### 12. Leader lease

Host-tab write leadership is coordinated by an atomic IndexedDB transaction over
the `coordination` store. A tab becomes leader by writing a lease record with an
owner id and expiry; it remains follower while another unexpired owner exists.

The algorithm uses an injectable `Clock` and injectable TTL for deterministic
tests. `BroadcastChannel` is advisory only: it nudges tabs to renew/recheck, but
the IndexedDB transaction is authoritative.

Follower host tabs are read-only for session commands and saved-definition
mutation. They can still render the host surface.

### 13. Failure behavior

The host remains usable if IndexedDB is unavailable, corrupt, blocked, or fails a
transaction. Accepted commands continue in memory. The user-visible failure is a
host-only persistence warning; it is never sent to `PublicState` and never
rendered by the display route.

Invalid saved definitions, invalid active-session envelopes, unsupported private
wire versions, malformed event histories, and failed `GAME_INITIALIZED` imports
all fail closed.

### 14. Privacy and public non-impact

Persistence adds no `PublicState` field and no display UI. It never projects:

- persistence status, warnings, recovery prompts, saved-library contents, or
  persistence test ids
- host notes, answers, alternates, event history, undo metadata, revision,
  session id, active-session envelopes, saved-definition JSON, lease owner ids,
  tab ids, database names, or object-store names

The display remains sanitized and read-only.

### 15. Public wire and sync versions unchanged

Persistence changes neither public wire nor host/display sync:

| Layer | Version |
| --- | --- |
| `PUBLIC_STATE_SCHEMA_VERSION` | **7** |
| Sync envelope | **2** |

The private persistence wire is separate and does not require a public wire bump.

### 16. Rejected alternatives

- **Silent auto-resume on host boot.** Rejected because a teacher must decide
  whether an old local session belongs in front of the class.
- **Persisting private state snapshots.** Rejected because replay is the
  authority and snapshots would drift from event semantics.
- **Storing `GameDefinition` objects directly in active-session records.**
  Rejected because all content reconstruction must use the canonical import
  boundary.
- **Saving definitions from the in-memory object shape.** Rejected because Slice
  12 already defines the canonical export format.
- **Using BroadcastChannel as the leader-election authority.** Rejected because
  it is advisory, lossy, and not atomic.
- **Age-based TTL cleanup.** Rejected because unfinished classroom sessions do
  not become invalid merely because time passed.
- **Projecting recovery state to `PublicState`.** Rejected because persistence is
  host-private operational state.
- **Changing public wire or sync versions.** Rejected because no public payload
  changed.

### 17. Explicit non-goals

No cloud storage, accounts, backend, cross-device sync, student devices, student
phones, networked controllers, controller mapping persistence, physical
controller certification, reporting, cross-session analytics, Slice 14+ work,
public persistence wire, public-state change, sync-version change, game-file
schema change, new npm dependency, or deployment change.

## Consequences

Teachers get local recovery and a saved-definition library on the host device.
The display sees none of it. The core invariant remains unchanged: private host
state is authoritative, and public state is an explicit sanitized projection.
