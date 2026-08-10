# Classroom Quiz Show

A local-first, projector-friendly **classroom game-show engine** for the
classroom. A teacher runs a private **host** screen; students watch a public
**display** screen on the projector.

Coding agents and contributors should read
[`AGENTS.md`](AGENTS.md) before changing the repository.

> **Not a Jeopardy clone.** The category-and-point-value board is the _first_
> round type this engine supports, not the whole product. See
> [`docs/architecture/GAME-ENGINE-BOUNDARIES.md`](docs/architecture/GAME-ENGINE-BOUNDARIES.md).

## Current implementation status

**Slice 1 — foundation. Complete** — merged (PR #1), CI green, and deployed live
to GitHub Pages at <https://ricktron.github.io/classroom-quiz-show/> (owner-
verified; see [`docs/STATUS.md`](docs/STATUS.md) and the reconciliation receipt
[`docs/receipts/2026-07-22-slice-1-post-merge-reconciliation.md`](docs/receipts/2026-07-22-slice-1-post-merge-reconciliation.md)).

**Slice 2 — state & event core. Complete** — merged to `main` (PR #3), CI green
(see [`docs/STATUS.md`](docs/STATUS.md) and the reconciliation receipt
[`docs/receipts/2026-07-22-slice-2-post-merge-reconciliation.md`](docs/receipts/2026-07-22-slice-2-post-merge-reconciliation.md)).
Slice 2 adds a neutral runtime foundation on top of the shell — no gameplay —
see [`docs/architecture/ADR-002-state-event-sync-core.md`](docs/architecture/ADR-002-state-event-sync-core.md):

- A **command-driven reducer**: commands express intent, a pure reducer produces
  an **append-only event history**, and authoritative state is derived by
  **replaying** events. **Undo** is an append-only, auditable marker (nothing is
  deleted).
- An explicit **private → public boundary**: an allow-list `toPublicState`
  sanitizer produces the only data the projector ever sees; the display **fails
  closed**.
- **Same-browser host/display sync** over a versioned **BroadcastChannel**
  envelope: the host is authoritative, the display is read-only, and unknown /
  stale / malformed messages are ignored.

**Slice 3 — game & round model + registry. Complete** — merged to `main`
(PR #5), CI green (see [`docs/STATUS.md`](docs/STATUS.md), the reconciliation
receipt
[`docs/receipts/2026-07-23-slice-3-post-merge-reconciliation.md`](docs/receipts/2026-07-23-slice-3-post-merge-reconciliation.md),
and [`docs/architecture/ADR-003-game-round-model-registry.md`](docs/architecture/ADR-003-game-round-model-registry.md)).
Slice 3 adds the typed domain model — still **no gameplay**:

- A **`GameDefinition`**: immutable, authored, deep-frozen data — a stable id, a
  model version, a title, and an **ordered** list of typed rounds with **unique
  round ids**. Separate from a **`GameSession`** (runtime progress derived from
  it).
- A typed **`RoundDefinition`** whose `config` is **data, never code** (the type
  forbids functions), and a **round registry**: an application-controlled table
  with **explicit known/unknown** lookup, duplicate-registration errors, and **no
  dynamic import, eval, or plugin loading**. One non-gameplay placeholder round
  type is registered so far.
- **Unknown round types fail closed**: a host-only diagnostic and a neutral
  "unavailable" display — never a crash, a substituted round, or a leak.
- A single allow-listed **`PublicGameView`** (round count, current-round ordinal,
  neutral availability) — the projector never sees the definition, round types,
  or config.

**Slice 4 — validation & import pipeline. Complete** — merged to `main` (PR #7),
CI green and Pages deployed (see [`docs/STATUS.md`](docs/STATUS.md), the
reconciliation receipt
[`docs/receipts/2026-07-25-slice-4-post-merge-reconciliation.md`](docs/receipts/2026-07-25-slice-4-post-merge-reconciliation.md),
and [`docs/architecture/ADR-004-canonical-validation-import.md`](docs/architecture/ADR-004-canonical-validation-import.md)).
Slice 4 opens the trusted ingestion boundary — still **no gameplay**:

- A **canonical, versioned JSON game file**, discriminated by an exact
  `"format": "classroom-quiz-show/game"` and an exact `"schemaVersion": 1`,
  carrying only `id`, `title`, and ordered `rounds` of
  `{ id, type, title, config }`. Array order **is** round order; ids are
  supplied by the file and validated, never generated.
- **One validation pipeline** (`src/import/importGame.ts`) that every import
  path converges on: transport → `JSON.parse` → format → version → safety scan →
  Zod → semantic → registry → normalization → trusted construction. The built-in
  samples are JSON *text* so they cannot skip it.
- **Strict and honest**: unknown keys are rejected rather than dropped, nothing
  is coerced or defaulted, an unsupported version fails (no migrations exist),
  an unregistered round type fails at import, and **nothing is ever silently
  repaired** — malformed content returns structured issues instead.
- **Actionable errors**: every failure is an `ImportIssue` with a stable code, a
  pipeline stage, an exact document path (`rounds[1].id`), and a message written
  for a teacher — never a stack trace and never just "invalid file".
- **Nothing leaks and nothing half-lands**: an invalid import appends no event,
  changes no revision, publishes no sync message, and leaves `PublicState` and
  the display untouched. A valid import loads only through the existing
  `INITIALIZE_GAME` command.

**Slice 5 — category-board round. Complete** — merged to `main` (PR #9, merge
commit `2ec6932`), CI green and Pages deployed (see
[`docs/STATUS.md`](docs/STATUS.md), the reconciliation receipt
[`docs/receipts/2026-07-26-slice-5-post-merge-reconciliation.md`](docs/receipts/2026-07-26-slice-5-post-merge-reconciliation.md),
the local-verification receipt
[`docs/receipts/2026-07-26-slice-5-local-verification.md`](docs/receipts/2026-07-26-slice-5-local-verification.md),
and [`docs/architecture/ADR-005-category-board-round.md`](docs/architecture/ADR-005-category-board-round.md)).
Slice 5 makes the app **playable for the first time**:

- **`category-board`, the first playable round type**, registered by application
  code. Imported content still cannot register a type, replace a schema, a
  reducer or a public projection, or supply a callback.
- **A typed board**: ordered categories (stable id + public title) of ordered
  tiles (stable id, non-negative integer value, prompt, answer, optional
  alternates, optional host-only teacher notes, optional multiplier). Authored
  array order is canonical; identity is the stable id, and tile ids are unique
  across the whole round. **Uneven categories and duplicate values are both
  allowed** — a real classroom board is often ragged, and value is not identity.
- **`effectiveValue = value × multiplier`** over bounded integers — exact, and
  it changes only the displayed value. **It scores nothing.**
- **An explicit reveal-stage machine**: `board → selected → prompt → answer`,
  plus return-to-board. The stage is one discriminated value paired with the
  selection, so "an answer with no selected tile" is not expressible.
- **A used tile is consumed on ANSWER reveal, not on selection** — so a misclick
  is recoverable — and undoing the answer reveal puts the tile back. Used state
  is derived only by replaying events; there is no separate record to drift.
- **One import path, still**: the registry hands the Slice 4 pipeline this
  type's own strict schema. Errors carry exact paths such as
  `rounds[0].config.categories[1].tiles[2].prompt`, and nothing is repaired,
  de-duplicated, reordered, or truncated.
- **The projector gets a current-stage-only DTO** (`PublicState.round`, wire
  version 2 → 3): the board stage carries titles, positional keys and values;
  from `selected` onward it carries one selection and not the rest of the board.
  Teacher notes, alternate answers and authored ids are **never** projected, and
  the answer is `null` until the host explicitly reveals it.
- **Bounded host controls** that state, in words, exactly what the projector is
  showing right now — with every private block badged "Host only". It moves no
  points: scoring lives in its own panel (Slice 6), so revealing and awarding stay
  separate teacher actions.

**Slice 6 — teams & scoring. Complete** — implemented on
`claude/slice-6-teams-and-scoring-we53wr` on top of `main` at `5237a1f`, and
**merged to `main` via PR #11** (merge commit `67180a3`, merged
2026-07-26T15:58:11Z) with post-merge CI green (see
[`docs/STATUS.md`](docs/STATUS.md), the local-verification receipt
[`docs/receipts/2026-07-26-slice-6-local-verification.md`](docs/receipts/2026-07-26-slice-6-local-verification.md),
the post-merge receipt
[`docs/receipts/2026-07-26-slice-6-post-merge-reconciliation.md`](docs/receipts/2026-07-26-slice-6-post-merge-reconciliation.md),
and [`docs/architecture/ADR-006-teams-and-scoring.md`](docs/architecture/ADR-006-teams-and-scoring.md)).
Slice 6 makes the board **score**:

- **Teams are authored content**, on the immutable game definition: a stable id
  (identity), a public name (explicitly *not* identity — renaming a team moves no
  points), an accent, and authored display order. **1–8 teams**; omit the field
  entirely for a game with no teams.
- **A game file may NAME an accent, never supply one.** Eight application-controlled
  tokens (`crimson`, `azure`, `emerald`, `amber`, `violet`, `teal`, `rose`, `slate`);
  a colour, gradient, class name or CSS declaration is **rejected at import**. Colour
  is always supplemental — every surface shows the team's name as text.
- **Scores are session state, derived only by replaying events** — bounded integers
  (−1,000,000…1,000,000, starting at **0**), with no cache, no floats, no `NaN`, and
  no write path outside the reducer. So undo restores a prior total *exactly*.
- **One command, four typed modes.** `ADJUST_TEAM_SCORE` carries a signed amount plus
  a `mode` (**full credit** = the tile's effective value · **partial credit** =
  bounded by it · **deduction** = its negation · **manual correction** = any bounded
  amount) and a `source` (the exact round and tile, or explicitly none). A score is
  never an unexplained integer, so the log still makes sense in a month.
- **The resulting total is deliberately not stored on the event** — it would become a
  lie the moment an *earlier* adjustment were undone.
- **Revealing and scoring are independent, both ways.** Revealing an answer awards
  nothing; scoring consumes no tile; undoing a score leaves the reveal alone; undoing
  a reveal leaves the score standing. Two host panels, two decisions.
- **Correction never rewrites history**: undo appends an auditable marker, or a
  compensating manual correction is appended beside the original.
- **Partial credit is whole points**, never a fraction — so there is no rounding rule
  to argue about in front of a class.
- **The projector gets a scoreboard** (`PublicState.teams`, wire version 3 → 4):
  ordered team names and integer totals, present at every stage and after the game
  ends. It never receives the authored team ids, the score history, undo metadata, or
  the host's selected scoring target. A malformed total shows a neutral "Scores
  unavailable" rather than `NaN`, and there is **no animation** — a class needs the
  score to be true more than lively.
- **The host panel shows the work before it happens**: which tile is live and what it
  is worth, which team is selected, the resulting total (`120 → 220`), and whether
  that exact adjustment has already been submitted. Negative or large manual
  adjustments need an explicit confirmation.

**Slice 7 — timers, arming & transitions. Complete** — merged to `main` via
**PR #14** (merge commit `3f9ae1c`), with post-merge CI on `main` green and the
Pages deployment succeeded (see [`docs/STATUS.md`](docs/STATUS.md), the
reconciliation receipt
[`docs/receipts/2026-07-27-slice-7-post-merge-reconciliation.md`](docs/receipts/2026-07-27-slice-7-post-merge-reconciliation.md),
and [`docs/architecture/ADR-007-timers-arming-transitions.md`](docs/architecture/ADR-007-timers-arming-transitions.md)).
Slice 7 gives a clue a clock, and contains the engine's first non-deterministic
input:

- **One explicit clock boundary.** A clock is read at the command/dispatch edge
  and at the presentation edge — and **never** inside the reducer, replay, the
  planner's decision logic, or the sanitizer. Replaying a stored history is still
  bit-exact and needs no clock, however much later it happens.
- **Durable facts, a derived countdown.** Events record that a timer started with
  a stated duration and deadline, was paused with a stated amount left, resumed,
  was interrupted, or expired. There is **no tick event, no per-second revision,
  and no remaining-time value on a running timer** — "how long is left" is
  computed at the rendering edge.
- **Manual host arming.** A clue is armed only when the teacher arms it; nothing
  arms it automatically. Arming and the timer are independent.
- **A typed interruption seam** that stops the clock **without ending the clue**,
  so a future buzz-in is an addition rather than a rewrite.
- **Expiry through the command boundary**, carrying the timer identity and the
  exact deadline. A callback left over from a reset, restart, pause, undo, clue
  change or round change appends nothing, and exactly one expiry per countdown is
  structural. Expiry awards and deducts **nothing**.
- **Host pause and resume.** Paused wall-clock time is never charged to the class,
  and a replay consumes none of it either.
- **The projector shows a deadline, not a stream** (`PublicState.response`, wire
  version 4 → 5): armed state plus a status-discriminated timer, with the display
  deriving the countdown locally against a clamped estimate of the host/display
  clock offset. The display **never** expires a timer. Every state is stated in
  words, and the only animation is disabled under `prefers-reduced-motion`.
- **An optional authored `timer` block** (`{ "responseSeconds": 45 }`, 5–600
  whole seconds) that is additive on `schemaVersion: 1` — every existing game file
  is still valid and gets the documented 30-second default.

**Slice 8 — local input contract & keyboard buzz-in. Complete** — merged to `main`
via **[PR #16](https://github.com/ricktron/classroom-quiz-show/pull/16)** (merge
commit `167128dc6462d10192afe92e85026918ebce7ba0`, merged 2026-07-27T02:46:24Z by
`ricktron`; reviewed head `7d12718`, which **is** the merge commit's second
parent). All three PR checks were green at that head, **post-merge CI on `main`
concluded success**, and the **Pages deployment succeeded**; manual live-route
verification was **not** performed (see [`docs/STATUS.md`](docs/STATUS.md), the
local-verification receipt
[`docs/receipts/2026-07-27-slice-8-local-verification.md`](docs/receipts/2026-07-27-slice-8-local-verification.md),
the post-merge reconciliation receipt
[`docs/receipts/2026-07-27-slice-8-post-merge-reconciliation.md`](docs/receipts/2026-07-27-slice-8-post-merge-reconciliation.md),
and [`docs/architecture/ADR-008-local-input-keyboard-buzz.md`](docs/architecture/ADR-008-local-input-keyboard-buzz.md)).
Slice 8 gives teams a way to claim a clue, through a boundary that is deliberately
hardware-shaped rather than keyboard-shaped:

- **A layered, device-independent input boundary.** Raw browser input → a local
  input adapter → a **logical action** → a validated command → an append-only
  event → the reducer → sanitized public state. The domain never receives a
  `KeyboardEvent`, a key code, a device identifier or a mapping table, and it
  cannot: none of them is expressible in the value that crosses.
- **A bounded logical action vocabulary** — `primary-buzz` plus four **ordinal**
  `secondary` slots for future controller buttons. Secondary actions are
  representable and mappable but **completely inert**: translation refuses them,
  so no secondary action changes game state in this slice. No colour name, device
  model or button index appears anywhere in the engine.
- **Configurable keyboard mappings**, bound to a **physical key position**
  (`KeyboardEvent.code`) so a mapping survives a different layout and a held
  Shift. Conflicts, reserved keys, unknown teams and duplicates are refused with
  structured messages — nothing is repaired, dropped or silently overwritten.
- **A full ordered buzz queue** (owner decision `OG-2`): the first accepted buzz
  becomes the **active respondent**, later buzzes queue behind it in order, and a
  team may appear at most once per clue. Order is the event log's order — never a
  clock — so identical arrival stamps are not an unresolved tie.
- **Promotion after an incorrect response or a host pass** (`OG-3`), as one typed
  command. Neither moves a point: awarding and deducting stay separate, deliberate
  teacher actions, for every team (`OG-6` stays deferred).
- **The first buzz stops the clock through Slice 7's typed seam** — one new source
  member, no new event type, no new timer state. Later buzzes cannot interrupt
  again, and a rejected buzz never touches the timer.
- **Manual arming is the intake gate.** There is no separate keyboard-arm flag and
  still exactly one arming control; disarming stops acceptance immediately, and
  every transition that closes a clue closes its queue.
- **The projector sees who is answering, and a count** (`PublicState.response.buzz`,
  wire version 5 → 6) — never the ordered waiting list, a key, a mapping, a device
  or the interruption source.
- **Buzz keys are host-device settings**, stored in one versioned browser-local
  entry, validated on load and falling back safely. They are not game content, not
  session history, and **not the start of Slice 13 persistence**.

**Slice 9 — generic Gamepad adapter & configurable mappings. Complete** — merged
to `main` via [PR #19](https://github.com/ricktron/classroom-quiz-show/pull/19)
(merge commit `d16f90d`, merged **2026-07-27T05:33:05Z** by `ricktron`; final
reviewed head `f63d5c1`, which is the merge commit's **second parent**). All
three PR checks were green at that head; **post-merge CI on `main` at `d16f90d`
concluded success**, and the **GitHub Pages deployment succeeded**. The document
root was reachable by HTTP HEAD (**200**; `Last-Modified` consistent with that
deploy); the response body was not inspected, `/host` and `/display` were not
exercised, Gamepad behavior was not tested on the deployed application, and **no
live-route or application-behavior claim is made**. See
[`docs/architecture/ADR-009-generic-gamepad-adapter.md`](docs/architecture/ADR-009-generic-gamepad-adapter.md),
the local-verification receipt
[`docs/receipts/2026-07-27-slice-9-local-verification.md`](docs/receipts/2026-07-27-slice-9-local-verification.md)
and the post-merge reconciliation receipt
[`docs/receipts/2026-07-27-slice-9-post-merge-reconciliation.md`](docs/receipts/2026-07-27-slice-9-post-merge-reconciliation.md).
Slice 9 adds generic USB controllers **through the Slice 8 boundary**, and the
strongest thing to say about it is what it did **not** change: no schema, no
`PublicState`, no sync protocol, no command, no event, no reducer.

- **A generic Gamepad adapter behind the existing waist.** `LOCAL_INPUT_SOURCE_KINDS`
  gained one member, `gamepad`; everything from command translation downward is
  untouched. A controller buzz becomes the same `RECORD_TEAM_BUZZ` → `TEAM_BUZZED`
  → replayed queue → sanitized projection a keyboard buzz does.
- **The browser boundary is one small module.** Direct `navigator.getGamepads()`
  access is confined to it, and what crosses is a frozen snapshot of
  `{ controllerIndex, pressed[] }`. No `Gamepad` object, device `id`, `mapping`,
  `axes`, analog value, timestamp, vendor or product id is representable above it.
- **Polling is isolated and lifecycle-safe.** One host-only `requestAnimationFrame`
  loop, registered once, stopped on unmount; never in the reducer, during render,
  in the sanitizer, during replay, or **on the display route**. The clock is read
  only when there is genuinely an edge to stamp.
- **Rising edges, and a first sighting is a baseline only.** A held button never
  repeats, and a button already held at connect, enable, mapping change, capture
  completion, tab restoration, focus restoration or reconnection **cannot buzz** —
  a release and a fresh press are required. Connect and disconnect append nothing.
- **Generic, validated, session-local mappings.** A binding is a controller index,
  a button index, a team and a logical action — no model, vendor, colour or
  handset is expressible. There is deliberately **no default button assignment**.
  **Mappings are lost when the host page reloads**, and the panel says so.
- **Host-private diagnostics**: API availability, neutral labels ("Controller 1"),
  button counts, each team's assignment, conflicts, and a sentence explaining every
  press that did nothing. No live per-frame button display, and nothing on the
  projector.
- **Keyboard buzzing is the permanent fallback** and is unaffected — including on a
  browser with no Gamepad API at all: *"No controller detected. Keyboard buzzing
  remains available."*
- **Secondary actions stay inert.** The four ordinal slots can be assigned and still
  terminate at the existing typed rejection: no event, no state change, no score.
- **Sony Buzz!-specific setup was not in Slice 9** — see Slice 10 below. No WebHID,
  Bluetooth, axes, analog, haptics or persistent mappings in Slice 9.

**Slice 10 — Sony Buzz! mapping, validation & host setup UX. Complete** — PR #21
was squash-merged at `5575be35d76ae0f0d3b36394431b7873883b78ac` (merged
**2026-07-28T02:35:09Z**) from final reviewed head
`288593391776be1d89b7f5ab9820e147946e56f9`. Exact PR-path blob equality confirmed
that the reviewed content is what landed (28 paths). Post-merge verification
succeeded on clean `main` at that squash tip. Completion covers the
owner-accepted hardware-independent scope. A later bounded physical
certification (OADL2-S07) exists for one exact configuration under a temporary
keep-alive — see the current physical-certification note below and
[`docs/receipts/2026-08-01-oadl2-s07-sony-buzz-physical-certification.md`](docs/receipts/2026-08-01-oadl2-s07-sony-buzz-physical-certification.md).
Permanent supported-profile operationalization was delivered by Slice 21
(**`Complete`** via PR #55). See
[`docs/architecture/ADR-010-sony-buzz-profile-and-setup.md`](docs/architecture/ADR-010-sony-buzz-profile-and-setup.md)
and
[`docs/receipts/2026-07-28-slice-10-post-merge-reconciliation.md`](docs/receipts/2026-07-28-slice-10-post-merge-reconciliation.md).
No schema, `PublicState`, sync protocol, command, event or reducer change.

- **Host-private identity observation** on the bounded Gamepad snapshot
  (`reportedId`, `reportedMapping`).
- **Candidate classification** from USB VID/PID tokens only — never compatibility
  proof (`gamepadDeviceProfile`).
- **Capture-based recommended profile** with no hard-coded browser button indices
  (`sonyBuzzProfile`).
- **Setup test mode** and host setup surface (`SonyBuzzSetupSection`) that resolve
  presses without dispatching gameplay.
- **Physical certification (later):** OADL2-S07 recorded a bounded host claim for
  one exact tested configuration; it is not a generalized supported-hardware
  list. Slice 21 closed permanent keep-alive / supported-profile
  operationalization for the exact Namtai Wbuzz profile.

**Slice 11 — Media contract. Complete** — PR #23 was squash-merged at
`5d47b2f641e1a96c2066ec22731f4e751288b39a` (merged **2026-07-28T04:56:27Z**) from
final reviewed head `bb8bd94b016a99f9782793f3eda6b6fd2d59a0b5`. Exact 40-path
file-list and blob equality confirmed that the reviewed content is what landed.
Post-merge verification succeeded on clean `main` at that squash tip (**1485**
unit tests / **63** files; **214** e2e passed / **2** skipped). The completed
contract supports legacy text and strict same-origin static-image prompts on
canonical schema version **1**, with public-state wire version **7** and
sync-envelope version **2**. See
[`docs/architecture/ADR-011-media-contract.md`](docs/architecture/ADR-011-media-contract.md)
and
[`docs/receipts/2026-07-28-slice-11-post-merge-reconciliation.md`](docs/receipts/2026-07-28-slice-11-post-merge-reconciliation.md).
**Slice 12 — Portable export & round-trip import. Complete** — PR #25 was
squash-merged at `cdb499a1a1924ceb12014d37741b500fd9346214` (merged
**2026-07-28T19:36:25Z**) from final reviewed head
`e63ef7f19aac7b1cf72ccd5cc640e3296550dae7` (authorized base
`7c1a35c096d1d0654ea951f29aa49d0910f4c429`). Exports the loaded immutable
`GameDefinition` to the existing canonical `classroom-quiz-show/game` schema
version **1** document with deterministic compact JSON (trailing LF),
production re-import through `importGameFromJsonText`, structural equality and
byte-stability gates, and a host-only download surface. Same-origin media paths
are preserved; media files are not bundled. Answer keys / teacher notes remain
host-owned. Public-state wire stays **7**; sync envelope stays **2**. Slice 12
did not implement persistence. See
[`docs/architecture/ADR-012-portable-export-round-trip.md`](docs/architecture/ADR-012-portable-export-round-trip.md).
**Slice 13 — Local persistence & recovery. Complete** — PR #27 was
squash-merged at `6cf4d2579ab558f8c4b7eabca0b94df4acc6f20c` (merged
**2026-07-29T21:27:59Z**) from final reviewed head
`ad0867ab6d7e00f397de51dfad2363f35bc181d7` (authorized base
`3fd212994c0e8b651193460de633995fe80a25df`). Host-local IndexedDB persistence
for saved definitions and active-session recovery (explicit Resume/Discard),
plus a lightweight host-writer lease. Public-state wire stays **7**; sync
envelope stays **2**; game-file schema stays **1**. No dependency added.
Live-route behaviour was **not** manually verified. See
[`docs/architecture/ADR-013-local-persistence-recovery.md`](docs/architecture/ADR-013-local-persistence-recovery.md)
and
[`docs/receipts/2026-07-29-slice-13-post-merge-reconciliation.md`](docs/receipts/2026-07-29-slice-13-post-merge-reconciliation.md).
**Slice 14 — Final-wager round. Complete** — implemented under
`AUTHORIZE-CQS-S14-FINAL-WAGER-IMPLEMENTATION-1` on
`claude/cqs-slice-14-final-wager` from the authorized base
`4de1454181ed58bdb282accd136129c3c0eb0f2b`, and squash-merged via PR
[#32](https://github.com/ricktron/classroom-quiz-show/pull/32) at
`ce2e103377c5d86c8e0946346cb4cf05dfe7d58d` (2026-08-03T17:08:37Z) from the final
reviewed-and-repaired head `c2bcc1a5c383d5e6787f7f9a9d9a808c8ffd2d26`.
`final-wager` is the **second playable
registered round type**: eligibility (Classic or Inclusive), each team's wager
cap and the default low-to-high reveal order are frozen when Final begins;
wagers and response states are host-private, validated and rejected rather than
clamped; two Final windows reuse the existing clock discipline and expiry
records only that a window ended; reveal and settlement are explicit, atomic and
reversible; and a tied lead offers sudden death or an explicit, irreversible
accepted tie. **Public-state wire moves 7 → 8**; sync envelope stays **2**;
game-file schema, `GameDefinition` model, private persistence wire and IndexedDB
schema all stay **1**; no dependency added. Browser acceptance covered **24 of
24** required scenarios. See
[`docs/architecture/ADR-014-final-wager-round.md`](docs/architecture/ADR-014-final-wager-round.md),
[`docs/receipts/2026-08-03-slice-14-local-verification.md`](docs/receipts/2026-08-03-slice-14-local-verification.md)
and
[`docs/receipts/2026-08-03-slice-14-post-merge-reconciliation.md`](docs/receipts/2026-08-03-slice-14-post-merge-reconciliation.md).
**Slice 15 — Session Summary Contract. Complete** — squash-merged via PR
[#38](https://github.com/ricktron/classroom-quiz-show/pull/38) at
`242539044e45a43eacc6d8334349e59a6987a3d9` (merged **2026-08-04T19:28:26Z**) from
reviewed-and-repaired head `d8f6308eccea5144ab1c6b5f49afdfcc2b7d5b5b` (authorized
base `0939d9cafd009e713c8ca83bcc35ff3f90556819`, the squash commit's **sole**
parent). Reviewed-head and squash trees are identical
(`10ac401ebba0daab6e43dc96fa9fdbb4f72b6a9b`) and the direct diff between them is
empty. It adds a versioned host-private current-session summary
(`classroom-quiz-show/session-summary`, version **1**) derived from authoritative
history/replay only: unavailable authored rounds are listed without fabricated
metrics; timer-reset counts require a non-idle pre-event response timer; no
completed-session storage; no public-wire or persistence version change. The
inherited Final mid-refresh recovery flake remains unresolved. See
[`docs/architecture/ADR-015-session-summary-contract.md`](docs/architecture/ADR-015-session-summary-contract.md)
and
[`docs/receipts/2026-08-04-slice-15-post-merge-reconciliation.md`](docs/receipts/2026-08-04-slice-15-post-merge-reconciliation.md).
**Slice 16 — Completed Summary Ledger & Compatible Reporting. Complete** —
squash-merged via PR [#40](https://github.com/ricktron/classroom-quiz-show/pull/40)
at `bc3cea65cab8db1481b0b2420be580cc69932f3d` (merged **2026-08-05T04:38:20Z**)
from reviewed-and-repaired head `942575c97b97df220c215a7d265736a797869157`
(authorized base `f92b65fa2d6619d9c2a4d09b5457f0976ff91079`, the squash
commit's **sole** parent). Reviewed-head and squash trees are identical
(`12fea1bc056e6968e13a651161cdf89a6158a558`) and the direct diff between them is
empty. It adds a host-private completed-summary ledger, exact
competitive-profile grouping, bounded retention/deletion/class labels, and
compatible game/team/class rollups; IndexedDB schema moves **1 → 2**, while
public wire **8**, sync **2**, game-file schema **1**, private active-session
wire **1**, and Session Summary contract **1** remain unchanged. The inherited
Final mid-refresh recovery flake remains unresolved and is not claimed repaired.
See
[`docs/architecture/ADR-016-completed-summary-ledger-compatible-reporting.md`](docs/architecture/ADR-016-completed-summary-ledger-compatible-reporting.md),
[`docs/receipts/2026-08-04-slice-16-local-verification.md`](docs/receipts/2026-08-04-slice-16-local-verification.md),
[`docs/receipts/2026-08-04-slice-16-semantic-review-r1.md`](docs/receipts/2026-08-04-slice-16-semantic-review-r1.md),
and
[`docs/receipts/2026-08-05-slice-16-post-merge-reconciliation.md`](docs/receipts/2026-08-05-slice-16-post-merge-reconciliation.md).
**PR #40 requires no further review or merge action.** Post-merge reconciliation
was squash-merged via PR
[#41](https://github.com/ricktron/classroom-quiz-show/pull/41) at
`3ee239a1341749aa03d2bbbfa780aece74c07be5`. **PR #41 requires no further review
or merge action.**
**Slice 17 — Theme and Design-Token Foundation. Complete** — squash-merged via
PR [#44](https://github.com/ricktron/classroom-quiz-show/pull/44) at
`dee2f3c219f9e60113a374ce0ec876ae20c40bc1` (merged **2026-08-05T23:48:51Z**)
from reviewed head `3214185ac750be8a9ab1ad170ff3c9d1c7f9f5a4` (authorized base
and squash sole parent `6b908d577a588a68f06775a6511e1da3aacc33f3`).
Reviewed-head and squash trees are identical
(`ae727b3afd258532043269e60bfe49a9b64a07bb`) and the direct diff between them is
empty (**39** paths). It adds a closed application-owned theme registry
(`default`, `high-contrast`), exact fail-closed validation, per-window
presentation-only theme state, a host-only native selector, validated display
hash-route launches, complete semantic tokens including corrected opaque default
tile edge `#35d6e8`, and theme/stress coverage — with **no** change to game
authority, schemas, public wire **8**, sync **2**, persistence, events,
reducers, summaries, exports, packages, or deployment configuration.
Game-file schema **1**, GameDefinition model **1**, private active-session wire
**1**, IndexedDB **2**, Session Summary **1**, completed-summary envelope **1**,
and competitive profile **1** remain unchanged. The Phase 3 readiness dependency
was satisfied before implementation and has been consumed by this completed
delivery. See
[`docs/plans/CQS-PHASE-3-DESIGN-SYSTEM-READINESS.md`](docs/plans/CQS-PHASE-3-DESIGN-SYSTEM-READINESS.md),
[`docs/receipts/2026-08-05-slice-17-theme-tokens-local-verification.md`](docs/receipts/2026-08-05-slice-17-theme-tokens-local-verification.md),
and
[`docs/receipts/2026-08-05-slice-17-post-merge-reconciliation.md`](docs/receipts/2026-08-05-slice-17-post-merge-reconciliation.md).
**PR #44 requires no further review or merge action.**
**Slice 18 — Audience Display System. Complete** — squash-merged via PR
[#46](https://github.com/ricktron/classroom-quiz-show/pull/46) at
`91c7708626caeaa28b15617a1f0938f4944f7680` (merged **2026-08-07T01:41:48Z**)
from reviewed head `bd946f323f381931f706d3a2ff3957d911b5c696` (authorized base
and squash sole parent `6e29121d850cf4b4a4ba366c706225f208166f93`).
Reviewed-head and squash trees are identical
(`bc95d77efc15e3f63a3ea15c397df53e904767fc`) and the direct diff between them is
empty (**exactly 22** paths). It delivers the accepted Phase 2B audience-display
composition on existing public-state wire **8**: board-first public audience
shell, Slice 17 theme/token presentation, Nexus Core (with compact public timer
indicator after R1), adaptive Score Column / Strip / Deck, compact / expanded /
Final Signal Rails (Final Signal Rail owns the primary Final countdown with
tie-safe rail status after R1), quiet-cognition versus louder-consequence
presentation, living-board composition, Final-specific presentation, and
fail-closed `Scores unavailable` when public team state is unavailable — with
public-only audience rendering and privacy tests. **No** game-authority,
sanitizer, command/event/reducer, schema, public-wire, sync, persistence,
package, dependency, workflow, or deployment change. Public wire remains **8**;
sync **2**; game-file schema **1**; GameDefinition model **1**; private
active-session wire **1**; IndexedDB **2**; Session Summary **1**;
completed-summary envelope **1**; competitive profile **1**. Post-merge CI,
SonarCloud, and Pages were green on the squash; Playwright concluded
**313 passed** / **14 skipped** / **3 flaky** (inherited Final mid-refresh
`Saved: 100` / `Not saved yet` retry-resolved; unresolved and not claimed
repaired by Slice 18). No physical-projector or live-route certification is
claimed from that merge verification. See
[`docs/plans/CQS-DESIGN-PHASE-2B-DIRECTION.md`](docs/plans/CQS-DESIGN-PHASE-2B-DIRECTION.md),
[`docs/receipts/2026-08-06-slice-18-audience-display-local-verification.md`](docs/receipts/2026-08-06-slice-18-audience-display-local-verification.md),
and
[`docs/receipts/2026-08-06-slice-18-post-merge-reconciliation.md`](docs/receipts/2026-08-06-slice-18-post-merge-reconciliation.md).
**PR #46 requires no further review or merge action.**
**Slice 19 — Self-Contained Portable Packs. Complete** — exact-head
squash-merged via PR [#50](https://github.com/ricktron/classroom-quiz-show/pull/50)
at `95573e2468ee67f9e6e5a221de002f35d6421249` (merged **2026-08-08T21:25:37Z**)
from reviewed head `972c07ba61042401f71c999b959a15997e3fbe51` (authorized base /
squash sole parent `a1726e59ac437b84e785f8cfe53740e229de244c`). Reviewed-head and
squash trees are identical (`a0c6ec813525cf80ac6210eef594cc5a026a9d00`); direct
diff empty (**exactly 63** paths). Delivers `.cqs-pack` pack format **v1**
(exact canonical JSON + embedded PNG/JPEG/WebP/GIF raster media; plain JSON
retained; IndexedDB schema **3**; public wire **8** / sync **2** / canonical
schema **1** / GameDefinition **1** unchanged; exact `fflate@0.8.3`). See
[`docs/architecture/ADR-017-self-contained-portable-packs.md`](docs/architecture/ADR-017-self-contained-portable-packs.md),
[`docs/receipts/2026-08-07-slice-19-portable-packs-implementation.md`](docs/receipts/2026-08-07-slice-19-portable-packs-implementation.md),
and
[`docs/receipts/2026-08-08-slice-19-post-merge-reconciliation.md`](docs/receipts/2026-08-08-slice-19-post-merge-reconciliation.md).
**PR #50 requires no further review or merge action.** **Slice 20 — Spreadsheet
Authoring Seed is `Complete`** via PR
[#52](https://github.com/ricktron/classroom-quiz-show/pull/52) exact-head squash
`86e8f5e6d883e0ca3d02a81e19c7d657f352ccf0` from accepted head
`45142b96ce91c2f7498dbaa6a47cae278b7c4068` (merged **2026-08-09T04:11:33Z**).
Workbook format **1** / AuthoringDraft **1**; Classic Board + Board + Final;
SheetJS CE **0.20.3**; shared workbook-source diagnostic lifecycle; approval →
canonical JSON → `importGameFromJsonText`; no second importer; IndexedDB remains
**3**; public wire **8** / sync **2** / canonical schema **1** / GameDefinition
**1** unchanged. See
[`docs/architecture/ADR-018-spreadsheet-authoring-seed.md`](docs/architecture/ADR-018-spreadsheet-authoring-seed.md),
[`docs/receipts/2026-08-08-slice-20-spreadsheet-authoring-seed-implementation.md`](docs/receipts/2026-08-08-slice-20-spreadsheet-authoring-seed-implementation.md),
and
[`docs/receipts/2026-08-09-slice-20-post-merge-reconciliation.md`](docs/receipts/2026-08-09-slice-20-post-merge-reconciliation.md).
**PR #52 requires no further review or merge action.** **Slice 21 — Sony Buzz
Supported-Profile Operationalization is `Complete`** via PR
[#55](https://github.com/ricktron/classroom-quiz-show/pull/55) exact-head squash
`b1e6d669e91b55b20261e86a47d7818f069b0252` from accepted head
`3bd6c91330298c4374db137e3ce220e0d28a5c2f` (merged **2026-08-10T14:39:15Z**).
Exact supported profile `cqs.sony-buzz.namtai-wbuzz-wireless.v1` (Namtai wireless
Wbuzz `054c:1000`); direct WebHID keep-alive; Gamepad gameplay input; keyboard
fallback; IndexedDB **4**; ADR-019. Three-controller physical product RC
**PASS** (groups `0–4` / `5–9` / `10–14`; slot 4 / `15–19` historical /
owner-accepted — not a fresh four-handset claim). Slices 1–21 are Complete.
Slice 22 Minimal Presentation Audio is **in implementation review** (not
Complete; owner listening RC pending; see ADR-020). Slice 23 Classroom Release
Qualification remains Planned and unauthorized under the **23-slice** MVP plan
([`docs/decisions/ROADMAP-AMENDMENT-004-mvp-audio-and-release-rebalance.md`](docs/decisions/ROADMAP-AMENDMENT-004-mvp-audio-and-release-rebalance.md);
prior Amendment 003:
[`docs/decisions/ROADMAP-AMENDMENT-003-remaining-mvp-rebalance.md`](docs/decisions/ROADMAP-AMENDMENT-003-remaining-mvp-rebalance.md)).
Theme song remains post-MVP. The inherited Final mid-refresh recovery flake
remains unresolved; `CQS-OD-066` remains unresolved. See
[`docs/architecture/ADR-019-sony-buzz-supported-profile-direct-webhid-keepalive.md`](docs/architecture/ADR-019-sony-buzz-supported-profile-direct-webhid-keepalive.md),
[`docs/architecture/ADR-020-minimal-presentation-audio.md`](docs/architecture/ADR-020-minimal-presentation-audio.md),
and
[`docs/receipts/2026-08-10-slice-21-post-merge-canonical-reconciliation.md`](docs/receipts/2026-08-10-slice-21-post-merge-canonical-reconciliation.md).

> ⚠️ **Sony Buzz support is one exact profile, not a hardware catalog.** Slice 21
> operationalizes Namtai wireless `Wbuzz` `054c:1000` on the owner-tested
> macOS + Chrome stack with CQS direct WebHID keep-alive and Gamepad gameplay
> input. Fresh product RC used three available handsets (groups `0–4` / `5–9` /
> `10–14`); the four-slot design retains historical/owner-accepted group
> `15–19`. This does **not** claim wired Sony Buzz (`054c:0002`), Windows,
> Linux, Raspberry Pi, Bluetooth, Safari/Firefox/Edge/ChromeOS/mobile, arbitrary
> USB hubs, or guaranteed exact 2-second background scheduling. OADL2-S07 remains
> historical temporary keep-alive evidence — see
> [`docs/receipts/2026-08-01-oadl2-s07-sony-buzz-physical-certification.md`](docs/receipts/2026-08-01-oadl2-s07-sony-buzz-physical-certification.md).
> Slice 9’s generic Gamepad adapter remains unit-proven against a fake source
> for hardware-independent behavior; browser tests still cover the
> no-controller path.

The Slice 1 foundation is unchanged beneath it:

- React + TypeScript + Vite app shell
- Hash-based routing with separate **host** and **display** routes, a root
  role-picker, and a safe unknown-route screen
- Route-level error handling (the display **fails closed**)
- Installable PWA (manifest + service worker + offline app shell)
- GitHub Pages deployment configuration under the `/classroom-quiz-show/` base
  path
- Lint, typecheck, unit/component tests (Vitest), and browser tests (Playwright)
- Architecture and governance documentation

There are **two playable round types**. `category-board` scores, can be timed,
and teams can buzz in on it **from the host keyboard, or from a generic USB
controller through the same boundary**; `final-wager` (Slice 14) is
the closing wager round, host-entered and private until each explicit reveal.
Slice 10 adds a host-private Sony Buzz! setup surface (candidate classification,
capture recipe, and setup test mode) and is `Complete` under its
hardware-independent implementation boundary. Bounded physical certification is
recorded separately under OADL2-S07; it does not establish a generalized
compatibility claim. Permanent supported-profile operationalization is
**`Complete`** via Slice 21 (PR #55). No networked or student-device buzzing, and
no audio/video/remote media or content-defined themes. The projector display is
the Slice 18 board-first audience composition (not the pre-Phase-2B vertical
stack), still consuming only sanitized public state on wire **8**.
The host has local IndexedDB persistence for the active event history and a saved
definitions library: after a refresh with an unfinished session, the teacher gets
an explicit **Resume session** or **Discard recovery** choice, and saved
definitions can be saved and loaded later on the same device. A second host tab
uses read-only follower mode while another host tab owns local persistence. None
of this persistence UI or saved-library content is projected to the display, and
controller mappings remain session-local by design. Importing is still limited to
pasting canonical JSON (no file picker, spreadsheet, or remote import). The host
"Foundation / testing controls" and the import harness remain diagnostics that
prove the state core, the game/round model and the ingestion boundary — the
category-board, teams & scoring, response-window and buzz-in panels are the game
controls. Those other systems arrive in later slices. See [`docs/STATUS.md`](docs/STATUS.md) and
[`docs/plans/MVP-ARC.md`](docs/plans/MVP-ARC.md).

## Requirements

- Node.js 20+ and npm

## Installation

```bash
npm ci        # reproducible install from package-lock.json
```

## Local development

```bash
npm run dev   # http://localhost:5173/  (base path "/")
```

- Root / role picker: `http://localhost:5173/#/`
- Host: `http://localhost:5173/#/host`
- Display: `http://localhost:5173/#/display`

## Tests

```bash
npm run test        # Vitest in watch mode
npm run test:run    # Vitest once (CI)
npm run test:e2e    # Playwright against the production preview
```

The Playwright suite builds the app and serves it with `vite preview` under the
real GitHub Pages base path, then exercises direct navigation, refresh, the
base path, projector legibility, mobile host usability, the offline app shell,
a full category-board play-through across a host tab and a projector tab, a full
teams-and-scoring flow (award, deduct, partial credit, manual correction, undo) with
the projector mirroring every total, a full response-window flow (arm, run, pause,
resume, stop, expire, stale-callback, undo, projector reload, reduced motion), and
the permanent **projector-leak** checks.

**Testing policy.** Every slice that changes user-visible host or display
behavior must add or update Playwright coverage; unit tests cover schemas,
reducers, replay and edge cases, component tests cover bounded UI states and
accessibility, and Playwright covers end-to-end workflows, sync, privacy and
fail-closed behavior. The full rule is in
[`docs/architecture/GAME-ENGINE-BOUNDARIES.md` §13](docs/architecture/GAME-ENGINE-BOUNDARIES.md).

> If your machine has a pre-provisioned Chromium that does not match
> Playwright's bundled version, set `PLAYWRIGHT_CHROMIUM_PATH` to its executable
> before running `npm run test:e2e`. Normal CI installs the correct browser and
> needs no override.

## Build

```bash
npm run build       # tsc -b && vite build  → dist/
```

## Production preview

```bash
npm run preview     # serves dist/ at http://localhost:4173/classroom-quiz-show/
```

- Host: `http://localhost:4173/classroom-quiz-show/#/host`
- Display: `http://localhost:4173/classroom-quiz-show/#/display`

## Combined verification

```bash
npm run verify      # lint + typecheck + unit tests (fast, pre-commit)
npm run verify:all  # verify + production build + Playwright (merge gate)
```

## Route behavior

The app uses **hash routing** so it works on GitHub Pages (a static host with no
server-side rewrites) under a repository base path. Direct navigation, refresh,
and bookmarks all work because the browser only ever requests `index.html`;
everything after `#` is handled in the client. Full rationale and alternatives:
[`docs/architecture/ADR-001-github-pages-routing.md`](docs/architecture/ADR-001-github-pages-routing.md).

| Screen  | Dev URL                          | Pages URL                                             |
| ------- | -------------------------------- | ----------------------------------------------------- |
| Root    | `localhost:5173/#/`             | `…github.io/classroom-quiz-show/#/`                  |
| Host    | `localhost:5173/#/host`         | `…github.io/classroom-quiz-show/#/host`             |
| Display | `localhost:5173/#/display`      | `…github.io/classroom-quiz-show/#/display`          |

## PWA status

- **Installable:** the app ships a valid web app manifest
  (`Classroom Quiz Show`, short name `Quiz Show`) with placeholder icons and
  base-path-correct `start_url`/`scope`.
- **Offline app shell:** after the first successful load, the service worker
  precaches the app shell so the host and display **routes** load offline. This
  is validated by a Playwright offline smoke test. Media assets present in the
  deployed build and matched by the existing Workbox asset glob (for example the
  Slice 11 CI fixture PNG under `public/media-fixtures/`) may also be precached;
  arbitrary authored paths and separately distributed files are not packaged or
  guaranteed offline.
- **Update behavior:** `registerType: 'autoUpdate'`. A new deployment is picked
  up and activated on the next reload/navigation, and the open tab also polls
  for updates hourly, so the app shell never stays indefinitely stale.

### Offline limitations

Offline support covers the **app shell and routes only**. There is no gameplay,
no game content, and no persistence yet, so this is **not** offline gameplay —
it only means the two screens still render without a network connection after
they have been cached once.

## Deployment

Deployed to **GitHub Pages** from the `main` branch via
`.github/workflows/deploy-pages.yml` (build → upload Pages artifact → deploy).
The build applies the `/classroom-quiz-show/` base path automatically. The site
is **live** at <https://ricktron.github.io/classroom-quiz-show/>.

**One-time repository settings (already enabled):**

1. **Settings → Pages → Build and deployment → Source: GitHub Actions.**
2. Ensure Actions are enabled for the repository.

No secrets are required; the workflow uses the built-in `GITHUB_TOKEN` with
`pages: write` / `id-token: write` permissions.

## Error handling

- **Host** errors show a concise recovery message (with the error text in
  development only) and a reload button.
- **Display** errors **fail closed**: a neutral "Display paused" recovery
  screen with no stack trace, no source paths, no private data, and no host
  controls. Refresh recovers. See
  [`docs/architecture/GAME-ENGINE-BOUNDARIES.md`](docs/architecture/GAME-ENGINE-BOUNDARIES.md).

## Source-of-truth statement

**This repository is the single source of implementation truth** for Classroom
Quiz Show — application code, architecture, schemas, tests, fixtures, build and
deployment configuration, and implementation status.

External tools such as **OpenClaw NightWatch** and an **Obsidian Command
Center** may summarize, review, link to, and route this project, but they **must
not** override observed implementation truth here and **must not** become a
build-time, runtime, test-time, or deployment dependency. See
[`docs/PROJECT.md`](docs/PROJECT.md).

## License

[MIT](LICENSE).
