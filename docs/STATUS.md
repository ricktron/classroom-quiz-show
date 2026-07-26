# Status

**Current slice:** Slice 7 — Timers, arming & transitions
**Slice state:** In review (branch pushed, PR open and unmerged)
**Next slice:** Slice 8 — Local input contract & keyboard buzz-in (`Planned`,
unstarted, owner-gated)
**Roadmap:** 18 slices, amended 2026-07-26 by
[`decisions/ROADMAP-AMENDMENT-001-local-buzzers.md`](decisions/ROADMAP-AMENDMENT-001-local-buzzers.md)
(**merged to `main` via PR #13**, merge commit `752a3fe`, 2026-07-26T20:02:13Z)

## State vocabulary

`Planned` · `In progress` · `In review` · `Complete` · `Blocked` · `Unknown`

> Slice 1 is **Complete** (merged, deployed, owner-accepted — see the post-merge
> reconciliation receipt
> [`receipts/2026-07-22-slice-1-post-merge-reconciliation.md`](receipts/2026-07-22-slice-1-post-merge-reconciliation.md)).
> Slice 2 is **Complete**: implementation PR #3 was merged to `main` (merge
> commit `883111e`, merged 2026-07-22T23:00:07Z) with CI green, and the post-merge
> reconciliation is recorded in
> [`receipts/2026-07-22-slice-2-post-merge-reconciliation.md`](receipts/2026-07-22-slice-2-post-merge-reconciliation.md).
> Slice 3 is **Complete**: implementation PR #5 was merged to `main` (merge
> commit `01070c8`, merged 2026-07-23T19:18:32Z) with CI green (final reviewed
> head `464ef07`), and the post-merge reconciliation is recorded in
> [`receipts/2026-07-23-slice-3-post-merge-reconciliation.md`](receipts/2026-07-23-slice-3-post-merge-reconciliation.md).
> Slice 4 is **Complete**: implementation PR #7 was merged to `main` (merge
> commit `5295e83`, merged 2026-07-25T20:14:42Z; final reviewed head `8ce850c`).
> Post-merge CI on `main` is green (both jobs success) and the Pages deployment
> succeeded; the post-merge reconciliation is recorded in
> [`receipts/2026-07-25-slice-4-post-merge-reconciliation.md`](receipts/2026-07-25-slice-4-post-merge-reconciliation.md).
> **Note:** the owner merged before **Playwright e2e** had concluded on the PR
> head (it concluded success ~23 s after the merge); SonarCloud and the
> lint/typecheck/unit/build job had both already reported success. The receipt
> records this precisely rather than claiming all checks were green pre-merge.
> Slice 5 is **Complete**: implementation PR #9 was merged to `main` (merge
> commit `2ec69323c203a989b06610e6506475e875a40e45`, merged
> 2026-07-26T05:02:33Z; implementation commit `f8c4517`, final reviewed head
> `5e6994e`). All three PR checks were green before merge, **post-merge CI on
> `main` at `2ec6932` concluded success**, and the **Pages deployment
> succeeded**. Post-merge reconciliation is recorded in
> [`receipts/2026-07-26-slice-5-post-merge-reconciliation.md`](receipts/2026-07-26-slice-5-post-merge-reconciliation.md).
> Slice 6 is **Complete**: implementation PR #11 was merged to `main` (merge
> commit `67180a3a24b43124ce7a2dee91d02fe1f797618e`, merged
> 2026-07-26T15:58:11Z by `ricktron`; based on `main` at
> `5237a1f9f6b451c2137330fd0a7f4613b7a919f2`, implementation commit `7734065`,
> final reviewed head `48ed8180278b6966080be6ce00a0e3b06ca3abf1`). All three PR
> checks were green before merge, **post-merge CI on `main` at `67180a3`
> concluded success for both jobs**, and the **Pages deployment succeeded (build
> + deploy)**. **Manual live-route verification was not performed** — the
> reconciliation sandbox's network policy denies `ricktron.github.io`. Post-merge
> reconciliation is recorded in
> [`receipts/2026-07-26-slice-6-post-merge-reconciliation.md`](receipts/2026-07-26-slice-6-post-merge-reconciliation.md).
> On 2026-07-26 the owner authorized a planning-only **roadmap amendment**
> ([`decisions/ROADMAP-AMENDMENT-001-local-buzzers.md`](decisions/ROADMAP-AMENDMENT-001-local-buzzers.md)):
> local host-attached USB buzzers became an approved future capability, the MVP
> non-goal excluding "student devices/buzzers" was narrowed (student-owned
> devices and networked buzzers stay excluded), Slice 7 was renamed and re-scoped
> to **Timers, arming & transitions**, and the 11-slice plan became 18 slices.
> **That amendment changed documentation only — no runtime code, schema, test,
> workflow or dependency changed, and no implementation slice was started by it.**
> It was **merged to `main` via [PR #13](https://github.com/ricktron/classroom-quiz-show/pull/13)**
> (merge commit `752a3fe0f45fdc1ee687339134023c3811facd91`, merged
> 2026-07-26T20:02:13Z by `ricktron`; reviewed head `2524e745`), with all three PR
> checks green.
> **Slice 7 is now In review**: owner-authorized, implemented on
> `claude/slice-7-timers-arming-transitions-wd7cmf` from `main` at `752a3fe`, with
> the PR open and unmerged. **Slice 8 remains unstarted and owner-gated.**

## Slice 7 work (In review)

Timers, arming and transitions — the engine's first **non-deterministic input**,
contained. Full rationale in
[`architecture/ADR-007-timers-arming-transitions.md`](architecture/ADR-007-timers-arming-transitions.md);
local evidence in
[`receipts/2026-07-26-slice-7-local-verification.md`](receipts/2026-07-26-slice-7-local-verification.md).

| Item | State |
| --- | --- |
| Explicit `Clock` seam; read at the dispatch and presentation edges only | Implemented |
| Reducer, replay, planner logic and sanitizer read no clock; replay bit-exact | Implemented |
| No global timer service; nothing mutates state outside the command pipeline | Implemented |
| Durable timer FACTS (duration, start, absolute deadline, frozen remaining) | Implemented |
| No tick event, no per-frame revision, no remaining value on a running timer | Implemented |
| Round-type-neutral `responsePhases` map, legal at the `prompt` stage only | Implemented |
| Manual host arming (`OG-1`) as first-class durable state, orthogonal to the timer | Implemented |
| Typed interruption seam; stops the clock WITHOUT ending the clue | Implemented |
| Expiry through the command boundary with timer id + deadline evidence | Implemented |
| Stale / premature / repeated / reset / restarted / paused / undone callbacks inert | Implemented |
| Exactly one effective expiry per countdown, structurally | Implemented |
| Host pause and resume (`OG-8` resolved); replay consumes no time while paused | Implemented |
| Transition rules: cleared by selection, answer reveal, return, round change, end | Implemented |
| A window is NOT resumed across a round change (unlike board progress) | Implemented |
| Expiry awards and deducts nothing; scoring and the window stay independent | Implemented |
| `PublicState.response` allow-list DTO; wire version 4 → 5 | Implemented |
| Sync envelope version 1 → 2 (required `sentAt`); both fail closed | Implemented |
| Bounded, clamped host/display clock-offset estimate; display never expires | Implemented |
| Additive optional `timer` block on `schemaVersion: 1`, default 30 s | Implemented |
| Host panel: four facts in words, illegal controls disabled, keyboard operable | Implemented |
| Projector panel: countdown, armed/paused/expired/stopped in words, reduced-motion safe | Implemented |
| Unit, component and browser tests; docs (ADR-007, plan, handoff, receipt) | Implemented |
| Buzzers, queues, promotion, device input (`OG-2`/`OG-3` recorded, Slice 8) | **Not implemented** |

### Timer config shape (top-level, optional)

```jsonc
{
  "timer": { "responseSeconds": 45 }
}
```

Whole seconds, 5–600. Omitting the block yields the documented default of **30**,
applied by the trusted constructor — never by a Zod `.default()`. The host may pick
another bounded duration for one clue at start time.

### Commands / events / public fields (added in Slice 7)

- **Commands (8):** `ARM_RESPONSE_PHASE` · `DISARM_RESPONSE_PHASE` ·
  `START_RESPONSE_TIMER` (optional `durationSeconds`) · `PAUSE_RESPONSE_TIMER` ·
  `RESUME_RESPONSE_TIMER` · `INTERRUPT_RESPONSE_TIMER` (typed `source`) ·
  `EXPIRE_RESPONSE_TIMER` (`timerId` + `deadline`) · `RESET_RESPONSE_PHASE`. All
  carry the `roundId` they target.
- **Events (8, all reversible):** `RESPONSE_PHASE_ARMED` ·
  `RESPONSE_PHASE_DISARMED` · `RESPONSE_TIMER_STARTED` · `RESPONSE_TIMER_PAUSED` ·
  `RESPONSE_TIMER_RESUMED` · `RESPONSE_TIMER_INTERRUPTED` ·
  `RESPONSE_TIMER_EXPIRED` · `RESPONSE_PHASE_RESET`.
- **Timer statuses:** `idle` · `running` · `paused` · `expired` · `interrupted`.
- **Interruption sources:** `host` (the only member today; unrecognized values fail
  closed at the command boundary and again on event application).
- **New rejection reasons:** `invalid-response-phase`, `invalid-timer-duration`,
  `stale-timer-expiration`, `premature-timer-expiration`.
- **`PublicState` (added):** `response: PublicResponseState | null`. Wire version
  **4 → 5**; version 4 is rejected, never reinterpreted.
- **Sync envelope:** `SYNC_SCHEMA_VERSION` **1 → 2**; `public-state` gained a
  required `sentAt`. A version-1 envelope is rejected with `unsupported-version`.

## Slice 6 work (Complete)

Teams and the first **scoring strategy** — bounded integer points. Full rationale in
[`architecture/ADR-006-teams-and-scoring.md`](architecture/ADR-006-teams-and-scoring.md);
local evidence in
[`receipts/2026-07-26-slice-6-local-verification.md`](receipts/2026-07-26-slice-6-local-verification.md);
merged-state evidence in
[`receipts/2026-07-26-slice-6-post-merge-reconciliation.md`](receipts/2026-07-26-slice-6-post-merge-reconciliation.md).

| Item | State |
| --- | --- |
| Typed team model on the immutable definition (id = identity, name ≠ identity) | Implemented |
| Authored team order canonical, frozen onto `order`; scoreboard never re-sorts | Implemented |
| Team limits with classroom rationale: 1–8 teams, 40-char names, id grammar mirrored | Implemented |
| One-team game supported (whole-class / individual / demo play) | Implemented |
| "No teams" = omit the field; `teams: []` rejected, never treated as "none" | Implemented |
| Application-controlled accent palette; content may NAME a token, never supply style | Implemented |
| Documented positional accent default applied only by the trusted constructor | Implemented |
| Colour supplemental everywhere; no colour-only team identification | Implemented |
| Import through the ONE Slice 4 pipeline; same schema re-used by trusted construction | Implemented |
| `teams` additive + optional on `schemaVersion: 1` (no migration needed) | Implemented |
| Exact-path team diagnostics (`teams[1].accent`) with no silent repair | Implemented |
| Scores as session state: bounded integers, initial 0, derived only by replay | Implemented |
| No score cache, no `NaN`/`Infinity`/floats, no coercion, no write path outside `reduce` | Implemented |
| One command / one reversible event with typed `mode` + typed `source` | Implemented |
| Resulting total deliberately NOT stored on the event (undo would make it a lie) | Implemented |
| Tile presets derived from `effectiveValue`; exact-match validation at the boundary | Implemented |
| Scoring gated to the `prompt`/`answer` stages and the open tile; stale controls inert | Implemented |
| Revealing and scoring independent in BOTH directions | Implemented |
| Multiple teams scorable for one tile; returning with no score allowed | Implemented |
| Correction by undo OR compensating event; history never rewritten | Implemented |
| Reset policy: new game resets scores; round transitions and game end preserve them | Implemented |
| `PublicState.teams` allow-list DTO + explicit `unavailable`; wire version 3 → 4 | Implemented |
| Projector never receives team ids, score history, undo metadata, or the host target | Implemented |
| Host panel: target selection, tile value, previewed result, duplicate + large guards | Implemented |
| Projector scoreboard at every stage and after the game ends; no animation | Implemented |
| Accessibility: spoken negative totals, named controls, associated errors, focus | Implemented |
| Unit, component and browser tests; docs (ADR-006, plan, handoff, receipt) | Implemented |

### Team config shape (top-level, optional)

```jsonc
{
  "teams": [
    { "id": "basalts", "name": "Blue Basalts", "accent": "azure" },
    { "id": "rhyolites", "name": "Red Rhyolites" }
  ]
}
```

Accents: `crimson` · `azure` · `emerald` · `amber` · `violet` · `teal` · `rose` ·
`slate`. Omitting `accent` gets the palette entry at the team's authored position.

### Commands / events / public fields (added in Slice 6)

- **Command:** `ADJUST_TEAM_SCORE` — `{ teamId, delta, mode, source }`. There is
  deliberately **no** command for choosing the scoring target: that is private host
  UI state, it awards nothing, and it is never broadcast.
- **Event:** `TEAM_SCORE_ADJUSTED` (reversible) — carries `teamId`, the signed
  `delta`, the `mode` and the `source`. It does **not** carry a resulting total.
- **Modes:** `full-credit` (= `effectiveValue`) · `deduction` (= −`effectiveValue`) ·
  `partial-credit` (0 < |delta| ≤ `effectiveValue`) · `manual-correction` (bounded,
  no tile).
- **Score bounds:** −1,000,000 … 1,000,000, integers only, initial **0**.
- **New rejection reasons:** `no-teams-configured`, `unknown-team`, `tile-mismatch`,
  `invalid-score-delta`, `invalid-score-source`, `score-amount-mismatch`,
  `score-out-of-range`.
- **`PublicState` (added):** `teams: PublicTeamsState | null`. Wire version
  **3 → 4**; version 3 is rejected, never reinterpreted.
- **New import issue codes:** `duplicate-team-id`, `invalid-team-accent`.

## Slice 5 work (Complete)

The first **playable** round type — `category-board`. Full rationale in
[`architecture/ADR-005-category-board-round.md`](architecture/ADR-005-category-board-round.md);
local evidence in
[`receipts/2026-07-26-slice-5-local-verification.md`](receipts/2026-07-26-slice-5-local-verification.md)
and merge / CI / deployment evidence in
[`receipts/2026-07-26-slice-5-post-merge-reconciliation.md`](receipts/2026-07-26-slice-5-post-merge-reconciliation.md).

| Item | State |
| --- | --- |
| `category-board` registered by application code (content cannot register) | Implemented |
| Strict typed config: ordered categories, ordered tiles, stable ids | Implemented |
| Prompt, answer, optional alternates, optional host-only notes, optional multiplier | Implemented |
| Authored array order preserved; identity from stable ids, never value | Implemented |
| Uneven categories **allowed**; duplicate values **allowed** (both documented) | Implemented |
| `effectiveValue = value × multiplier` (exact integers, no scoring) | Implemented |
| Documented default `multiplier: 1` applied at the trusted constructor only | Implemented |
| Documented, tested board-size limits with classroom rationale; no truncation | Implemented |
| Private per-round state: discriminated reveal stage + used tiles | Implemented |
| Four commands / four events; every command carries its target `roundId` | Implemented |
| Used-tile policy: consumed on **answer reveal**, released by undo | Implemented |
| Deterministic replay; used tiles derived only from events; no lookup cache | Implemented |
| Registered `configSchema` — one validation path, no second importer | Implemented |
| Precise import errors with exact paths (`rounds[0].config.categories[1].tiles[2].prompt`) | Implemented |
| Built-in valid sample contains a real category-board round | Implemented |
| `PublicState.round` — current-stage-only DTO; wire version 2 → 3 | Implemented |
| Projector never receives notes, alternates, authored ids, or unselected content | Implemented |
| Fail-closed neutral panel on any impossible/unsupported/stale state | Implemented |
| Bounded host controls with explicit private/public distinction | Implemented |
| Accessibility: semantic buttons, keyboard grid, no colour-only meaning, wrapping | Implemented |
| Unit, component and browser tests; docs (ADR-005, plan, handoff, receipt) | Implemented |

### Config shape (round `config`)

```jsonc
{
  "categories": [
    { "id": "earth-structure", "title": "Earth Structure",
      "tiles": [{ "id": "earth-structure-100", "value": 100,
                  "prompt": "…", "answer": "…",
                  "alternates": ["…"], "notes": "…", "multiplier": 1 }] }
  ]
}
```

### Commands / events / public fields (added in Slice 5)

- **Commands:** `SELECT_CATEGORY_BOARD_TILE`, `REVEAL_CATEGORY_BOARD_PROMPT`,
  `REVEAL_CATEGORY_BOARD_ANSWER`, `RETURN_TO_CATEGORY_BOARD` — each carries the
  `roundId` it targets, so a stale host control is inert.
- **Events:** `CATEGORY_BOARD_TILE_SELECTED`, `CATEGORY_BOARD_PROMPT_REVEALED`,
  `CATEGORY_BOARD_ANSWER_REVEALED`, `CATEGORY_BOARD_RETURNED` — all reversible.
- **Reveal stages:** `board → selected → prompt → answer`, plus
  `selected|prompt|answer → board`.
- **`PublicState` (added):** `round: PublicRoundState | null`. Wire version
  **2 → 3**; an older shape is rejected, never reinterpreted.
- **New import issue codes:** `duplicate-category-id`, `duplicate-tile-id`,
  `blank-text`.

## Slice 4 work (Complete)

The canonical versioned JSON game-file format and the single Zod-based
validation / normalization import pipeline — **no gameplay**. Full rationale in
[`architecture/ADR-004-canonical-validation-import.md`](architecture/ADR-004-canonical-validation-import.md);
local evidence in
[`receipts/2026-07-24-slice-4-local-verification.md`](receipts/2026-07-24-slice-4-local-verification.md)
and merge/CI/deployment evidence in
[`receipts/2026-07-25-slice-4-post-merge-reconciliation.md`](receipts/2026-07-25-slice-4-post-merge-reconciliation.md).

| Item | State |
| --- | --- |
| Canonical versioned JSON format (`format` + `schemaVersion` discriminators) | Implemented |
| One authoritative pipeline every import entry point converges on | Implemented |
| Explicit version policy (missing/malformed/older/newer all fail; no guessing) | Implemented |
| Strict Zod schemas; unknown keys rejected, not dropped; zero coercion | Implemented |
| Pre-Zod document safety scan (reserved keys, non-data, non-finite, cycles, depth) | Implemented |
| Semantic validation (unique round ids, non-blank titles, bounds) | Implemented |
| Registry `configSchema` — one config validation path per known round type | Implemented |
| Unknown round type **fails import** (distinct from Slice 3 runtime fail-closed) | Implemented |
| Narrow, lossless normalization; **no silent repair**; input never mutated | Implemented |
| Structured `ImportIssue` model (stable codes, stages, paths, actionable messages) | Implemented |
| Discriminated `ImportResult`; no exceptions for ordinary invalid input | Implemented |
| Internal failures contained behind a safe generic issue (no stack traces) | Implemented |
| Host-only paste/import harness with structured result panel | Implemented |
| Invalid import mutates no state/event/revision/sync/`PublicState`/display | Implemented |
| Valid import loads only through the existing `INITIALIZE_GAME` command | Implemented |
| Unit, component and browser tests; docs (ADR-004, plan, handoff, receipt) | Implemented |

### Canonical format (version 1)

```jsonc
{
  "format": "classroom-quiz-show/game",
  "schemaVersion": 1,
  "id": "sample-foundation-game",
  "title": "Foundation Sample Game",
  "rounds": [{ "id": "round-1", "type": "placeholder", "title": "Round One",
               "config": { "note": "…" } }]
}
```

Pipeline stages (also the issue-report order): `transport` · `json-parse` ·
`format` · `version` · `semantic` · `schema` · `registry` · `construction`.

**Not added to `PublicState`:** import status, filenames, raw titles, error
paths, schema diagnostics, or registry internals. `PublicState` is unchanged by
Slice 4 (still wire version 2).

## Slice 3 work (Complete)

Typed game & round model + non-executable round registry — no gameplay. Full
rationale in
[`architecture/ADR-003-game-round-model-registry.md`](architecture/ADR-003-game-round-model-registry.md);
local evidence in
[`receipts/2026-07-23-slice-3-local-verification.md`](receipts/2026-07-23-slice-3-local-verification.md).

| Item | State |
| --- | --- |
| Branded ids (`GameId`/`RoundId`/`RoundType`/`GameSessionId`) | Implemented |
| `GameDefinition` factory (unique ids, ordered rounds, deep-frozen) | Implemented |
| Typed `RoundDefinition` + data-only `RoundConfig` (forbids functions) | Implemented |
| Round registry (explicit known/unknown, duplicate error, no fallback) | Implemented |
| No executable-import path (no eval / dynamic import / plugins) | Implemented |
| `GameSession` (`PrivateGameState`) distinct from the definition | Implemented |
| Game commands/events + deterministic replay + undo | Implemented |
| Unknown-round-type fail-closed (host diagnostic + safe display) | Implemented |
| Allow-listed `PublicGameView` (version 1 → 2); no definition/registry leak | Implemented |
| Host foundation game controls + host-only diagnostics (not gameplay) | Implemented |
| Display shows only safe round status (read-only, fail closed) | Implemented |
| Unit + browser tests; docs (ADR-003, plan, handoff, receipt) | Implemented |

### Commands / events / public fields (added in Slice 3)

- **Commands:** `INITIALIZE_GAME`, `SELECT_ROUND`, `ADVANCE_TO_NEXT_ROUND`,
  `END_GAME_SESSION`.
- **Events:** `GAME_INITIALIZED` (irrev.), `CURRENT_ROUND_SELECTED` (rev.),
  `ROUND_ADVANCED` (rev.), `GAME_SESSION_ENDED` (irrev.).
- **`PublicState` (added):** `game: PublicGameView | null` — `status`,
  `roundCount`, `currentRound`, `roundAvailability`. Never projected: the full
  definition, round ids/types/titles, round config, host diagnostics.

## Slice 2 work (Complete)

Neutral state/event/sync foundation — no gameplay. Full rationale in
[`architecture/ADR-002-state-event-sync-core.md`](architecture/ADR-002-state-event-sync-core.md).

| Item | State |
| --- | --- |
| Command-driven reducer (intent → events) | Implemented |
| Append-only event history (never edited in place) | Implemented |
| Deterministic, idempotent replay from `initial + events` | Implemented |
| Undo as append-only auditable `EVENT_UNDONE` marker | Implemented |
| Reversible vs. irreversible events distinguished | Implemented |
| Empty-history / repeated undo safe | Implemented |
| Private authoritative state vs. explicit `PublicState` types | Implemented |
| Allow-list `toPublicState` sanitizer (fail-closed) | Implemented |
| Versioned BroadcastChannel envelope + strict decode | Implemented |
| Stale/duplicate revision handling; unsupported-env no-op | Implemented |
| Host authoritative; display read-only + fail-closed | Implemented |
| Host "Foundation / testing controls" panel (not gameplay) | Implemented |
| Unit tests (reducer, sanitizer, transport, store, display) | Implemented |
| Browser tests: real two-tab BroadcastChannel sync | Implemented |
| Structural `PublicState` projector-leak assertions | Implemented |
| Documentation (ADR-002, plan, handoff, receipt) | Implemented |

### Commands / events / public fields

- **Commands:** `INIT_SESSION`, `SET_PUBLIC_STATUS`, `ADVANCE_SEQUENCE`,
  `MARK_WAITING`, `SET_HOST_NOTE`, `UNDO`.
- **Events:** `SESSION_INITIALIZED`, `PUBLIC_STATUS_SET`, `SEQUENCE_ADVANCED`,
  `WAITING_MARKED`, `HOST_NOTE_SET`, `EVENT_UNDONE`.
- **`PublicState` (allow-list):** `schemaVersion`, `revision`, `phase`,
  `headline`, `detail`. Never projected: `sessionId`, `counter`, `hostNotes`,
  `diagnostics`.

## Verification state

Local `verify:all` passed on the Slice 7 branch: lint, typecheck, unit tests
(**947 passed, 42 files**), production build, and Playwright e2e (**175 passed,
2 skipped** — both skips are the one desktop-only offline-shell test).
`git diff --check` is clean. Details in
[`receipts/2026-07-26-slice-7-local-verification.md`](receipts/2026-07-26-slice-7-local-verification.md).

- **PR CI on GitHub Actions for Slice 7: observed green.** All three checks
  concluded success on implementation commit `f804430` of PR
  [#14](https://github.com/ricktron/classroom-quiz-show/pull/14) — `Lint,
  typecheck, unit tests, build`; `Playwright e2e`; and `SonarCloud Code Analysis`
  with the Quality Gate **passed** and **0 Security Hotspots**. Sonar's 12 new
  non-blocking issues were **not inspected**: `sonarcloud.io` is unreachable from
  the sandbox (HTTP 403 on CONNECT).
- **Post-merge CI and Pages deployment for Slice 7: not applicable yet** — the PR
  is open and unmerged. No live-URL verification is claimed.

Earlier, local `verify:all` passed on the Slice 6 branch and again on the
reconciliation branch: lint, typecheck, unit tests (**740 passed, 35 files**),
production build, and Playwright e2e (**154 passed, 2 skipped** — both skips are
the one desktop-only offline-shell test). `git diff --check` is clean. See
[`handoff/CURRENT.md`](handoff/CURRENT.md) for exact commands and the Slice 6
receipts under [`receipts/`](receipts/).

- PR CI on GitHub Actions for Slice 6: **observed green** on PR
  [#11](https://github.com/ricktron/classroom-quiz-show/pull/11) at implementation
  commit `7734065` **and** at the final reviewed head `48ed818` — all three checks
  concluded success at both heads (`Lint, typecheck, unit tests, build`;
  `Playwright e2e`; `SonarCloud Code Analysis` with the Quality Gate **passed** and
  **0 Security Hotspots**). Sonar's 13 new non-blocking issues were not inspected:
  `sonarcloud.io` is unreachable from the sandbox.
- **Post-merge CI on `main` for Slice 6: observed green.** On merge commit
  `67180a3` the `CI` workflow (run `30209343948`) concluded **success** for both
  jobs — "Lint, typecheck, unit tests, build" and "Playwright e2e". This is
  post-merge observation on `main`, not a restatement of the pre-merge PR checks.
- **GitHub Pages deployment for Slice 6: succeeded.** The `Deploy to GitHub Pages`
  workflow (run `30209343946`) on `main` at `67180a3` concluded success for both
  the build and deploy jobs (deploy completed 2026-07-26T15:59:00Z). Slice 6
  changes no CI or deploy configuration.
- **Manual live-route verification was not performed.** The sandbox network policy
  denies `ricktron.github.io` (HTTP 403 on CONNECT), so
  `https://ricktron.github.io/classroom-quiz-show/#/host` and `#/display` were not
  loaded and no live application behaviour is claimed. A successful deployment
  workflow is not evidence that the live routes were exercised.
- Earlier, on the Slice 5 branch: lint, typecheck, **455 unit tests**, build, and
  **121 e2e passed / 2 skipped**.

- CI on GitHub Actions for Slice 5: **Observed green.** On PR #9 (final
  reviewed head `5e6994e`) "Lint, typecheck, unit tests, build", "Playwright
  e2e", and the SonarCloud Quality Gate (0 security hotspots) all concluded
  success. **Post-merge on `main` (`2ec6932`)** the `CI` workflow concluded
  success for both jobs.
- Pages deployment for Slice 5: **Observed successful** on `main` at `2ec6932`
  (deploy job completed 2026-07-26T05:03:16Z). Slice 5 altered no deploy
  configuration. Owner-verified loading of the live URLs after this deployment
  is **not** claimed.
- Slice 4 local `verify:all` also passed (253 unit, 97 e2e / 2 skipped).
- CI on GitHub Actions for Slice 4: **Observed green.** On PR #7 (final head
  `8ce850c`) "Lint, typecheck, unit tests, build", "Playwright e2e", and the
  SonarCloud Quality Gate (0 security hotspots) all concluded success.
  **Post-merge on `main` (`5295e83`)** both CI jobs concluded success.
- Pages deployment: **Observed successful** on `main` at `5295e83`
  (2026-07-25T20:15:31Z). Slice 4 altered no deploy configuration.
- Slice 3 CI was observed green on PR #5 (final reviewed head `464ef07`) — both
  jobs succeeded and the SonarCloud Quality Gate passed (0 security hotspots).
- Pages deployment: unchanged; Slice 4 alters no deploy config.

## Completed work (Slice 1)

Slice 1 remains Complete. Its detailed table lived here previously; the durable
record is the post-merge reconciliation receipt
[`receipts/2026-07-22-slice-1-post-merge-reconciliation.md`](receipts/2026-07-22-slice-1-post-merge-reconciliation.md).
Headline: React + TS + Vite shell, hash routing (host/display/root/unknown),
fail-closed display error boundary, PWA + offline app shell, Pages deploy under
`/classroom-quiz-show/`, and the Vitest + Playwright suites.

## Blockers

None.

## Limitations

- **One playable round type.** `category-board` reveals prompts and answers and
  tracks used tiles; Slice 6 added teams and scoring on top of it, and Slice 7 adds
  the response window. No buzzer or wager exists.
- **A response window exists only at the `prompt` stage.** Before the prompt is
  public there is nothing to respond to; once the answer is public the window is
  over and is cleared.
- **A response window does not survive a round change**, unlike board progress,
  which does resume. A deadline is an absolute instant, and resuming a stale one
  would put a nonsense clock in front of a class.
- **Host and display clocks are not synchronized.** The display applies a clamped
  (±5 s) estimate of the offset derived from each snapshot's `sentAt`; transport
  delay is ignored and no round-trip measurement is done. On today's same-browser
  transport both clocks are the same, so the correction is effectively a no-op.
- **The display never expires a timer.** At 0:00 it keeps showing the running
  state until the host publishes `expired`.
- **Undoing an expiry restores an already-overdue running timer**, which the host
  adapter then expires again on the next tick unless the host acts. Undo restores
  the prior durable state exactly; it does not invent a friendlier one.
- **`PublicState` wire version is now 5 and the sync envelope version is 2.** A
  consumer pinned to either older version fails closed; there is no migration.
- **Expiry awards and deducts nothing.** A window ending is a fact about the
  window, never a scoring decision.
- **Timer durations are 5–600 whole seconds**, authored per game or chosen per
  clue by the host. An out-of-range value is rejected, never clamped.
- **`OG-2`, `OG-3` and `OG-6` are recorded but not implemented.** There is no buzz
  input, no queue, no promotion, and no respondent-restricted scoring anywhere.
- **A tile still scores nothing by itself.** `multiplier` affects the DISPLAYED
  value and the typed `effectiveValue`, and revealing an answer awards nothing —
  a teacher must deliberately award or deduct.
- **The selected scoring target is host UI state only** and is lost if the host tab
  is reloaded. It is never broadcast and awards nothing by existing.
- **Undo reaches only the latest reversible event.** To fix an older score, apply a
  compensating manual correction; there is no targeted "undo this event".
- **A tile can only be scored while it is open** (the `prompt` or `answer` stage).
  Once the host returns to the board, use a manual correction.
- **A zero-value tile has no scoring preset** — every preset amount rule would
  require a zero delta, and a zero-point event is not recorded. Manual correction
  remains available.
- **Partial credit is a whole number of points**, never a fraction or a percentage,
  so there is no rounding rule to disagree about.
- **Score bounds are ±1,000,000** and a single adjustment is bounded the same way;
  an adjustment that would leave the range is rejected, never clamped.
- **Board state is per round and resumes on return.** Leaving a round and coming
  back restores its used tiles and reveal stage; that is deliberate, not a bug.
- **No second tile can be opened while one is live.** Return to the board first.
- **Alternates are never projected.** They are a host grading aid; making them
  public would be a separate, reviewed decision.
- **One schema version, no migrations.** `schemaVersion: 1` only. An older or
  newer version fails by design; a v2 will need a real, tested migration.
- **Paste is the only import transport.** No `.json` file picker, spreadsheet /
  CSV / XLSX import, remote URL import, or backend upload (later slices; each
  must converge on the same pipeline).
- **The import size guard counts characters, not bytes**, and applies only to the
  text entry point; the object entry point is bounded by nesting depth and the
  round/title/id limits.
- **Duplicate JSON keys are not observable** — `JSON.parse` keeps the last
  occurrence and the pipeline validates the survivor. Documented behaviour, not
  a claimed defence.
- **The placeholder round is retained** as the non-gameplay engine-test type
  and safe fallback fixture. Its config schema is intentionally trivial.
- **A consumer pinned to `PublicState` version 4, 3 or 2 fails closed**; there is
  no migration and none is implied.
- **Un-ending a game is not supported** — `GAME_SESSION_ENDED` is irreversible;
  re-initialize a game to start over.
- **Event history and definitions are in-memory only** — lost on tab close.
  Durable IndexedDB persistence/recovery is Slice 8.
- **Sync is same-browser only** (BroadcastChannel, same origin). No cross-device
  sync, backend, or leader election — later/out of scope.
- The host "Foundation / testing controls" are diagnostics to prove the model,
  **not** game controls.

## Next safe action

**Review the Slice 7 pull request** (timers, arming & transitions). It is open and
unmerged: local `verify:all` is green, the ADR and the immutable receipt are in
place, and every existing receipt was proved byte-identical.

After it merges, record the post-merge reconciliation as usual. The next
implementation slice is **Slice 8 — Local input contract & keyboard buzz-in**. Its
vocabulary gates `OG-1`, `OG-2` and `OG-3` are now answered, but it is still
`Planned`, unstarted, and **owner-gated**.

Do **not** begin Slice 8 on the strength of those answers — recording a decision
is not authorization to implement it. No buzz input, queue or promotion behaviour
exists anywhere in the codebase.
