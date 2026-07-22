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
| 3   | **Game & round model + registry** | `GameDefinition` / `GameSession` types, typed `RoundDefinition`, round registry scaffold, unknown-type fail-closed handling. | 2          |
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

### Explicit non-goals (Slice 1)

Board/round engines, round-registry runtime, schemas, Zod, spreadsheet import,
teams, scoring, partial credit, timers, answer reveal, BroadcastChannel,
IndexedDB, leader locking, event log, reducer/commands, undo, final wager, media
pipeline, theme engine, soundboard, random events, presentation APIs,
whiteboard/concept-map/timeline interactions, analytics, buzzers, WebSockets,
backend, accounts, grading, AI, and multiple playable round types.

## Dependencies & risks

- **GitHub Pages base path** must stay correct across assets, manifest, SW
  scope, and links — covered by ADR-001 and e2e base-path tests.
- **Private/public boundary** is a permanent invariant; the sanitizer (slice 2)
  must be allow-list based. Baseline projector-leak tests exist now.
- **No executable imported code** — enforced by design when the registry and
  import pipeline land (slices 3–4).
