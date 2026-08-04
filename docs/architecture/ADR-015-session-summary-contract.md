# ADR-015 — Session Summary Contract

**Status:** Accepted (Slice 15 — `CQS-SLICE-15-SESSION-SUMMARY-CONTRACT`)
**Date:** 2026-08-04
**Supersedes:** nothing. **Superseded by:** nothing.
**Related:** ADR-002 (state/event/sync core) · ADR-005 (category-board) ·
ADR-006 (teams & scoring) · ADR-007 (timers) · ADR-008 (buzz) ·
ADR-013 (local persistence & recovery) · ADR-014 (Final Wager) ·
[`../decisions/ROADMAP-AMENDMENT-003-remaining-mvp-rebalance.md`](../decisions/ROADMAP-AMENDMENT-003-remaining-mvp-rebalance.md)

---

## 1. Context

Slices 2–14 produce an authoritative append-only event history and deterministic
replay. Teachers need a readable end-of-session picture after a game ends —
standings, descriptive scoring activity, board activity, buzz/timer transition
counts, and Final aggregates — without creating a saved analytics system,
transcript archive, export format, grading engine, or public display feature.

Amendment 003 split former compound Slice 15 into:

- **Slice 15** — current-session summary contract (this ADR)
- **Slice 16** — completed summary ledger and compatible reporting (later)

Slice 15 therefore must derive a summary **and store nothing**.

## 2. Decision

**One public derivation entrypoint** accepts authoritative event history only:

```ts
deriveSessionSummaryV1(history: readonly SessionEvent[]): SessionSummaryResultV1
```

Internally it may:

- derive effective events through the existing `effectiveEvents` helper;
- replay authoritative history;
- replay an effective prefix to classify the state immediately before the
  irreversible `GAME_SESSION_ENDED` event.

It must **not** publicly accept separately supplied history and state.

The result is an explicitly versioned immutable contract
(`classroom-quiz-show/session-summary`, version **1**) with a discriminated
status:

- `available` — completed session summary
- `no-session`
- `no-game`
- `active-or-incomplete`
- `invalid-history`

## 3. History-only public derivation boundary

The public function depends on nothing except the history argument and pure
helpers already owned by the engine (`effectiveEvents`, `replay`, definition
readers). It does not read:

- React state
- browser globals
- wall-clock time
- locale-dependent ordering
- randomness
- `PublicState`
- controller callbacks
- IndexedDB / local storage
- network state
- persistence queries
- mutable singleton state

There is no second reducer, second event log, analytics registry, or duplicated
scoring rule. Totals and used tiles come from the same replay path gameplay uses.

## 4. Effective-history responsibilities

All gameplay metrics use **effective** events:

- undone events contribute nothing;
- undo markers are not gameplay facts;
- stale, ineffective, superseded, or undone events are absent from counts;
- corrections that remain effective remain separate observed entry facts
  (for example successive Final wager or response recordings).

Undo must change the summary exactly as replay changes authoritative game state.

## 5. Replayed-state responsibilities

Replay supplies:

- operational session and game identity after initialization;
- `gameLifecycle` gating (`available` only when `ended`);
- final scores and standings;
- consumed tiles / cleared categories;
- latest Final maps for distinct participants and response-state rollups;
- the state immediately before `GAME_SESSION_ENDED` for terminal-path and
  incomplete-Final honesty.

## 6. Observed versus derived field truthfulness

| Kind | Meaning |
| --- | --- |
| **Observed** | Counted directly from effective authoritative events |
| **Derived** | Computed deterministically from replayed private state (and authored definition lookups those events authorize) |
| **Unavailable** | Not honestly representable (no Final begun, incomplete Final, no board rounds, unsupported authored round type, etc.) |

The contract forbids inventing accuracy, correct-answer percentage, mastery,
grades, psychometric measures, reaction times, fairness claims, or session
duration semantics from stamp differences.

### 6.1 Unsupported / unavailable authored rounds

Session Summary V1 summarizes only:

- `category-board` rounds (board activity section); and
- `final-wager` (Final section, which may itself be `unavailable` when Final did
  not begin or cannot be classified honestly).

Every other authored round in the replayed game definition is listed in
`unavailableRounds` with only minimum operational identity:

- `roundId`
- `roundTitle`
- `authoredRoundType`
- bounded reason `unsupported-round-type`

The summary must **not** invent zero-filled gameplay metrics for those rounds,
must **not** add a generic metadata bag, and must **not** consult React state,
`PublicState`, storage, network, browser globals, or mutable registry state to
decide availability. Host UI presents unavailable rounds in words.

Contract version remains **1** — this completes the original Slice 15
truthfulness boundary rather than introducing a new contract family.

### 6.2 Timer-reset truthfulness

`RESPONSE_PHASE_RESET` clears arming, queue, and timer together. The command can
be accepted when the phase is non-initial even if the timer is still `idle`
(for example after arming and/or buzzes with no countdown started). Therefore
Session Summary V1 counts a **timer reset** only when the replayed effective
prefix immediately before that event shows a non-idle response timer for the
named round. Response-phase resets without a timer do not inflate timer-reset
counts. Event vocabulary is unchanged.

## 7. Undo and correction semantics

- Undoing a score, tile-state, buzz, timer, or Final settlement removes that
  fact from observed counts and from derived rollups on the next derivation.
- A later compensating or correcting event that remains effective is counted as
  its own observed fact.
- Latest replayed maps determine distinct-participant and response-state rollups.

## 8. Terminal-path classification

Classification uses effective history and the replayed state **immediately
before** irreversible `GAME_SESSION_ENDED`. Supported paths:

- `ordinary-or-host-ended`
- `final-unique-winner`
- `final-accepted-tied-finish`
- `final-sudden-death-winner`

The engine never infers an automatic reason solely because the game ended. A
host-ended incomplete Final is classified as host-ended, with Final resolution
path `host-ended-incomplete` where Final began but did not complete honestly.

## 9. Privacy exclusions

The summary never retains or displays:

- full event history
- generic metadata bags
- exact wager values
- raw exact response text
- alternates / teacher notes
- wager caps / pre-Final score snapshots
- private reveal order
- unnecessary per-team private Final details
- public display DTOs
- persistence records

Structural tests prove summary data is absent from `PublicState` and sync
envelopes. Version invariants remain:

- public-state wire **8**
- sync envelope **2**
- canonical game-file schema **1**
- private persistence wire **1**
- IndexedDB schema **1**

## 10. Current-session-only lifecycle — no persistence

Ending a session clears the existing active-session persistence record (Slice 13
behavior unchanged). The summary is derived **after** completion from
still-mounted in-memory history. It is lost on refresh, reset, discard, close,
loading another game, or starting another session. Slice 15 does **not**:

- create completed-session storage;
- modify IndexedDB schema, private persistence wire, store structure, or
  recovery records;
- compute and persist a summary before cleanup.

## 11. Host UX

One host-only panel inside the existing host workspace:

- visible only when replayed lifecycle is `ended`;
- visually primary after completion;
- no new route and no modal;
- clear current-session-only warning;
- semantic headings, labeled tables/lists, keyboard operation, signed negatives,
  textual tie labels, unavailable fields and unavailable rounds in words, no
  color-only meaning, usable mobile host layout, no new required motion.

No copy/download/export/saved history/comparison/projector/analytics controls.

## 12. Consequences

- Teachers can inspect a completed session before leaving the page.
- Slice 16 may later persist privacy-minimized summaries without reopening the
  history-only derivation boundary.
- Public wire and persistence versions stay unchanged, so display and recovery
  clients are unaffected.
- Agents and contributors must not treat this ADR as authorization for Slice 16,
  Phase 3, post-MVP arcs, or resolution of `CQS-OD-066`.
