# ADR-002: State, event, and synchronization core

- **Status:** Accepted
- **Date:** 2026-07-22
- **Slice:** 2 (state & event core)
- **Deciders:** Project owner (Rick), implementing agent

## Context

Slice 2 builds the neutral runtime foundation the engine needs before any
gameplay: an authoritative state model, a way to change it, a way to derive a
projector-safe view, and a way to keep a same-device display in sync. It must
honor the permanent invariants from
[`GAME-ENGINE-BOUNDARIES.md`](GAME-ENGINE-BOUNDARIES.md) (§4 host-owned private
state → sanitized public state, fail-closed display; §6 command/event
architecture) **without** assuming one board, one round type, fixed-point
scoring, text-only prompts, teams, timers, or any gameplay content.

## Decision

Seven concepts are separated into explicit, strongly-typed modules.

### 1. Commands vs. events

- **Commands** (`src/state/commands.ts`) express *intent* — "please do X". They
  may be accepted or rejected. Every command carries a host-supplied `issuedAt`
  timestamp so the reducer never reads a clock (see determinism below).
- **Events** (`src/state/events.ts`) record *accepted facts* — "X happened".
  They are the source of truth and are never edited in place. Each event has a
  deterministic id (`evt-<seq>`), a monotonic `seq`, and an explicit
  `reversible` flag. (The type is `SessionEvent`, not `Event`, to avoid
  shadowing the DOM type.)

Slice 2's vocabulary is deliberately small and foundation-only:

| Command | Event | Reversible | Effect |
| --- | --- | --- | --- |
| `INIT_SESSION` | `SESSION_INITIALIZED` | no | New session shell baseline |
| `SET_PUBLIC_STATUS` | `PUBLIC_STATUS_SET` | yes | Change bounded public status code |
| `ADVANCE_SEQUENCE` | `SEQUENCE_ADVANCED` | yes | Increment internal counter |
| `MARK_WAITING` | `WAITING_MARKED` | yes | Record a no-game / waiting state |
| `SET_HOST_NOTE` | `HOST_NOTE_SET` | yes | Set a private host-only note |
| `UNDO` | `EVENT_UNDONE` | no | Neutralize the latest reversible event |

There are **no** gameplay commands (tiles, reveal, teams, scoring, timers,
wagers, rounds) — those belong to later slices.

### 2. Reducer, replay, and undo

- `reduce(state, event)` is pure and total: it never throws and never reads a
  clock/RNG. Unknown or inapplicable events return state unchanged (fail safe).
- `replay(history)` reconstructs authoritative state from `INITIAL_PRIVATE_STATE`
  plus the full history. It is deterministic and idempotent:
  `replay(h) === replay(h)`. `revision` is set to `history.length`, so it counts
  every recorded fact and never decreases across a session.
- **Undo is an append-only, auditable operation.** `UNDO` finds the latest
  reversible, not-yet-undone event and appends an `EVENT_UNDONE` marker
  referencing it. Replay collects undone ids and skips those events. Nothing is
  deleted — both the original event and the undo marker remain in history.
  Irreversible events (session init/reset and undo markers themselves) are never
  targeted, so a reset is a hard baseline and you cannot undo an undo. Undo with
  nothing to undo is a safe no-op (rejected command, no event).

The store (`src/state/store.ts`) holds the append-only history as truth and
re-derives state via `replay` after each accepted command, so
`getState() === replay(getHistory())` always holds. History is in-memory only —
durable IndexedDB persistence is Slice 8.

### 3. Private → public boundary (allow-list sanitizer)

`toPublicState(private): PublicState` (`src/state/sanitize.ts`) constructs a
fresh object naming each safe field explicitly. It never spreads/clones private
objects, never serializes private state, and never relies on naming
conventions. A **new** private field added later cannot leak because it is
simply not mentioned in the sanitizer — the default for anything new is "not
exposed". `PublicState` (`src/state/publicState.ts`) is dependency-free (imports
no private module) so the display bundle cannot pull a private type in.
`safeToPublicState` wraps projection so a projection failure returns the safe
`INITIAL_PUBLIC_STATE` (fail closed).

`PublicState` fields (the entire allow-list): `schemaVersion`, `revision`,
`phase` (`no-session | ready | waiting`), `headline`, `detail`. Private-only and
therefore never projected: `sessionId`, `counter`, `hostNotes`, `diagnostics`.
The host never publishes free text; it sets a bounded `PublicStatusCode` that
the sanitizer maps to fixed, reviewed copy.

### 4. Synchronization (BroadcastChannel)

Same-browser, same-origin host/display sync via a versioned envelope
(`src/sync/protocol.ts`):

```
{ protocol: 'classroom-quiz-show/sync', schemaVersion: 1, message: SyncMessage }
```

- **Host is authoritative.** It broadcasts sanitized `public-state` snapshots and
  answers `request-state` requests by republishing. It ignores inbound
  `public-state`, so a display can never push state into the host.
- **Display is read-only.** It decodes every message and drops anything invalid
  (fail closed), ignores stale/duplicate revisions via a monotonic `revision`
  watermark (only strictly-newer advances), and sends one `request-state` on
  start so a freshly opened/refreshed display catches up.
- **Fail closed / degrade safely.** `decodeEnvelope` is strict and total (never
  throws): non-object, wrong protocol, unsupported version, unknown message
  type, and malformed payload all reject. When BroadcastChannel is unavailable
  (or construction throws), the transport degrades to a no-op channel: the host
  stays authoritative and the display stays in its safe waiting state. If the
  host disappears, the display keeps its last safe state and never promotes
  itself to authority.

The transport is abstracted behind a small `SyncChannel` interface with three
implementations: real BroadcastChannel, a safe no-op, and a deterministic
in-memory hub for unit tests. Browser (Playwright) tests exercise the real
BroadcastChannel across two tabs.

### Four distinct failure categories

| Category | Where | Behavior |
| --- | --- | --- |
| **Command rejection** | `planCommand` | Well-formed command refused (e.g. undo-with-nothing, status-before-init). No event; state unchanged. |
| **Event application failure** | `reduce` | Unknown/inapplicable stored event. Returns state unchanged (fail safe); replay degrades to last consistent state. |
| **Transport decode failure** | `decodeEnvelope` | Malformed/foreign/unsupported message. Ignored; display keeps last safe state. |
| **Public projection failure** | `safeToPublicState` | Projection throws/invalid. Returns `INITIAL_PUBLIC_STATE`; display fails closed. |

### Determinism

All non-determinism is pushed to the boundary. Commands carry `issuedAt`; event
ids/seq derive from history length. `reduce`/`replay`/`planCommand` never read
`Date.now()` or a RNG, so replaying a stored history is byte-for-byte
reproducible.

## Alternatives considered

- **Undo by mutating/truncating history.** Rejected: it destroys audit history
  and breaks the append-only invariant. The compensating-marker approach keeps a
  full audit trail.
- **Free-text public status.** Rejected in favor of bounded status codes mapped
  to fixed copy, so a host control cannot leak a private string through the
  status channel.
- **Cloning private state and deleting fields / spreading then omitting.**
  Rejected: both are deny-list patterns where a newly-added private field leaks
  by default. The allow-list makes "not exposed" the default.
- **WebSocket / backend / cross-device sync / leader election / IndexedDB.**
  Out of scope for Slice 2 (later slices). BroadcastChannel needs no server and
  matches the same-device host+projector deployment.

## Consequences

- A clean seam exists for Slice 3 (game & round model): rounds add their own
  commands/events/sanitizer contributions behind the registry without changing
  this core.
- Structural `PublicState` assertions now back the projector-leak baseline, as
  called for in GAME-ENGINE-BOUNDARIES §4.
- In-memory-only history means state is lost on tab close until Slice 8 adds
  durable persistence — acceptable for the foundation.

## Verification method

- **Unit (Vitest):** reducer/replay/undo determinism, rejected-command
  no-mutation, allow-list projection (incl. future-field non-leak and serialized
  no-forbidden-terms), projection-failure fail-closed, transport decode
  fail-closed, stale/duplicate/newer revision handling, no-op degradation, and
  cleanup.
- **Browser (Playwright, real BroadcastChannel, two tabs):** host update appears
  on display, catch-up via `request-state`, display refresh resumes, display
  read-only cannot modify host, malformed injected message neither crashes nor
  exposes data, host closure leaves display safe. The existing projector-leak,
  routing, PWA/offline, responsive, and accessibility suites remain green.
