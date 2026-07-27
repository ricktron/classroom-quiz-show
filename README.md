# Classroom Quiz Show

A local-first, projector-friendly **classroom game-show engine** for the
classroom. A teacher runs a private **host** screen; students watch a public
**display** screen on the projector.

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

There is **one playable round type**; it scores, it can be timed, and teams can now
buzz in on it **from the host keyboard only**. There is no Gamepad, WebHID,
Bluetooth or Sony Buzz! support of any kind (Slices 9 and 10), no networked or
student-device buzzing, and no wagers, media, themes, or durable session
persistence; importing is still limited to pasting canonical JSON (no file
picker, spreadsheet, or remote import). The host "Foundation / testing controls"
and the import harness remain diagnostics that prove the state core, the
game/round model and the ingestion boundary — the category-board, teams &
scoring, response-window and buzz-in panels are the game controls. Those other systems
arrive in later slices. See [`docs/STATUS.md`](docs/STATUS.md) and
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
  is validated by a Playwright offline smoke test.
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
