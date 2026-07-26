# Handoff — Current

This is the entry point for the next contributor or coding agent. It reflects
the repository with **Slices 1–6 `Complete` and merged to `main`** (Slice 6,
teams & scoring, merged via PR #11 at `67180a3`) and **Slice 7 — Timers, arming &
transitions — `In review`**: owner-authorized, implemented, branch pushed, PR open
and unmerged. **Slice 8 is unstarted and owner-gated.**

> **Roadmap amended 2026-07-26, and that amendment is MERGED.** The owner
> authorized a planning-only amendment,
> [`../decisions/ROADMAP-AMENDMENT-001-local-buzzers.md`](../decisions/ROADMAP-AMENDMENT-001-local-buzzers.md):
> **local host-attached USB buzzers** (Sony Buzz! preferred initial target) are an
> approved future capability, the MVP non-goal excluding "student devices/buzzers"
> was **narrowed** rather than removed, Slice 7 was re-scoped so its interrupt
> seam is buzz-aware, the media contract moved ahead of any new round type, and
> the plan went from **11 to 18 slices**. Read that document before planning any
> work. It changed **documentation only** — no runtime code, schema, test,
> workflow or dependency. It **merged to `main` via PR #13** (merge commit
> `752a3fe0f45fdc1ee687339134023c3811facd91`, merged 2026-07-26T20:02:13Z by
> `ricktron`; reviewed head `2524e745`) with all three PR checks green. Its
> historical receipt is preserved unchanged.

## Repository state

- **Repository:** `ricktron/classroom-quiz-show` (standalone; single source of
  implementation truth).
- **Slice 1:** merged to `main` (PR #1, merge commit `e0bfb14`), deployed,
  owner-accepted.
- **Slice 2:** **Complete.** Merged to `main` via **PR #3** (merge commit
  `883111e`) with CI green; reconciliation PR #4 (merge commit `61e1a29`).
- **Slice 3:** **Complete.** Delivered on
  `claude/slice-3-game-round-registry-yjzexz`, based on `main` at
  `61e1a29548e8735886c3637e5c2e521ff6ee6db4` (after the merged Slice 2
  reconciliation, PR #4). Original implementation commit `7ac2466`; final reviewed
  head `464ef07`. Merged to `main` via **PR #5** (merge commit `01070c8`, merged
  2026-07-23T19:18:32Z) with CI green (build + e2e success, SonarCloud Quality
  Gate passed, 0 security hotspots). Post-merge reconciliation recorded in
  [`../receipts/2026-07-23-slice-3-post-merge-reconciliation.md`](../receipts/2026-07-23-slice-3-post-merge-reconciliation.md).
- **Slice 4:** **Complete.** Delivered on
  `claude/slice-4-validation-import-pynvab`, based on `main` at
  `349bff72f471c798df8a902a6a3c4c3eae2e17a5` (after the merged Slice 3
  reconciliation, PR #6). Implementation commit `d08f140`; docs commit
  `b44b585`; final reviewed head `8ce850c` (accessor/TOCTOU repair found in
  review). Merged to `main` via **PR #7** (merge commit `5295e83`, merged
  2026-07-25T20:14:42Z). Post-merge CI on `main` green (both jobs success) and
  the Pages deployment succeeded. Post-merge reconciliation recorded in
  [`../receipts/2026-07-25-slice-4-post-merge-reconciliation.md`](../receipts/2026-07-25-slice-4-post-merge-reconciliation.md).
  **Note:** the owner merged before **Playwright e2e** concluded on the PR head
  (it concluded success ~23 s later); SonarCloud and the lint/typecheck/unit/
  build job had already reported success. See the receipt for the exact timeline.
- **Slice 5:** **Complete.** Delivered on
  `claude/slice-5-category-board-6gfxnq`, based on `main` at
  `0dacd3501fb10ce1272386f56bf15a2956ee8c6d` (the merge commit of PR #8, the
  Slice 4 post-merge reconciliation). Implementation commit `f8c4517`; two
  follow-up documentation commits `93e2ce9` and `5e6994e` (the final reviewed
  head). Merged to `main` via **PR #9** (merge commit
  `2ec69323c203a989b06610e6506475e875a40e45`, merged 2026-07-26T05:02:33Z) with
  all three PR checks green. Post-merge CI on `main` at `2ec6932` concluded
  success for both jobs and the Pages deployment succeeded. Post-merge
  reconciliation recorded in
  [`../receipts/2026-07-26-slice-5-post-merge-reconciliation.md`](../receipts/2026-07-26-slice-5-post-merge-reconciliation.md).
- **Slice 6:** **Complete.** Owner-authorized and delivered on
  `claude/slice-6-teams-and-scoring-we53wr`, based on `main` at
  `5237a1f9f6b451c2137330fd0a7f4613b7a919f2` (the merge commit of PR #10, the
  Slice 5 post-merge reconciliation). Implementation commit `7734065`; final
  reviewed head `48ed8180278b6966080be6ce00a0e3b06ca3abf1`. Merged to `main` via
  **[PR #11](https://github.com/ricktron/classroom-quiz-show/pull/11)** (merge
  commit `67180a3a24b43124ce7a2dee91d02fe1f797618e`, merged 2026-07-26T15:58:11Z
  by `ricktron`) with all three PR checks green. Post-merge CI on `main` at
  `67180a3` concluded success for both jobs, and the **GitHub Pages deployment
  succeeded. Manual live-route verification was not performed** — the sandbox
  network policy denies `ricktron.github.io`. Post-merge reconciliation recorded
  in
  [`../receipts/2026-07-26-slice-6-post-merge-reconciliation.md`](../receipts/2026-07-26-slice-6-post-merge-reconciliation.md).
- **Slice 7 (current): `In review`.** Owner-authorized and delivered on
  `claude/slice-7-timers-arming-transitions-wd7cmf`, based on `main` at
  `752a3fe0f45fdc1ee687339134023c3811facd91` (the merge commit of PR #13, the
  roadmap amendment). Local `verify:all` green. **The PR is open and unmerged**;
  local evidence is in
  [`../receipts/2026-07-26-slice-7-local-verification.md`](../receipts/2026-07-26-slice-7-local-verification.md).
  **Slice 8 is unstarted and owner-gated.**
- **What Slice 7 adds:** the clock boundary and the response window. An explicit
  `Clock` seam (`src/time/clock.ts`) read only at the dispatch edge and the
  presentation edge — never in `reduce`, `replay`, the planner's decision logic or
  the sanitizer, so replay stays bit-exact. Durable timer FACTS (duration, start,
  absolute deadline; a paused timer stores the frozen remaining and no deadline)
  with the countdown derived at the rendering edge, so there is no tick event and
  no per-frame revision. A round-type-neutral per-round `responsePhases` map, legal
  at the `prompt` stage only. Manual host arming (`OG-1`) as first-class durable
  state. A typed interruption seam that stops the clock **without ending the clue**.
  Expiry through the command boundary carrying the timer id and deadline, so a
  stale callback appends nothing and exactly one effective expiry per countdown is
  structural. Host pause/resume (`OG-8` resolved). Eight reversible commands and
  events; `PublicState` gained one field, `response` (wire version 4 → 5); the sync
  envelope moved 1 → 2 for a required `sentAt`; and the game file gained an
  additive optional `timer` block on `schemaVersion: 1`. See
  [`../architecture/ADR-007-timers-arming-transitions.md`](../architecture/ADR-007-timers-arming-transitions.md).
- **What Slice 6 adds:** teams and the first scoring strategy. Teams are authored
  content on the immutable `GameDefinition` (stable id as identity, a public name
  that is *not* identity, an accent from an application-controlled palette of eight
  tokens, authored order frozen onto `order`, 1–8 teams). Scores are SESSION state
  (`PrivateGameState.teamScores`): bounded integers (−1,000,000…1,000,000, initial
  0) derived purely by replaying the log. One command `ADJUST_TEAM_SCORE` → one
  reversible event `TEAM_SCORE_ADJUSTED`, carrying a signed delta plus a typed
  `mode` (`full-credit`/`partial-credit`/`deduction`/`manual-correction`) and a
  typed `source` (a specific board tile, or `manual`). Revealing and scoring are
  independent in both directions; correction never rewrites history; `PublicState`
  gained one field, `teams` (wire version 3 → 4); and there is a host scoring panel
  plus a projector scoreboard. See
  [`../architecture/ADR-006-teams-and-scoring.md`](../architecture/ADR-006-teams-and-scoring.md).
- **What Slice 5 adds:** the first playable round type. `category-board` is
  registered by application code and supplies its own strict config schema to the
  Slice 4 pipeline (no second importer). It adds a typed board config (ordered
  categories and tiles, stable round-wide-unique ids, prompt, answer, optional
  alternates, optional host-only notes, optional multiplier), a private
  per-round reveal-stage machine (`board → selected → prompt → answer`), four
  reversible commands/events, a used-tile policy where a tile is consumed on
  ANSWER reveal and released by undo, one new `PublicState.round` DTO
  (current-stage-only; wire version 2 → 3), the first real projector experience,
  and bounded host controls. It scores nothing.
- **What Slice 4 adds:** the canonical versioned JSON game-file format and ONE
  Zod-based validation/normalization import pipeline
  (`src/import/importGame.ts`) that every import entry point converges on —
  explicit format/version discrimination, a pre-Zod document safety scan, strict
  schemas with zero coercion, semantic checks, registry-supplied per-round-type
  config schemas, narrow lossless normalization with no silent repair, a
  structured `ImportIssue` error model, a discriminated `ImportResult`, and a
  host-only paste harness. Invalid imports provably touch no state. Still no
  gameplay.
- **What Slice 3 adds:** the typed game & round model + a non-executable round
  registry — `GameDefinition` (immutable, deep-frozen, unique round ids), typed
  `RoundDefinition` with data-only config, a registry with explicit known/unknown
  lookup and no code-execution path, a `GameSession` (`PrivateGameState`) distinct
  from the definition, four game commands/events with deterministic replay + undo,
  unknown-round-type fail-closed handling, and one allow-listed `PublicGameView`.
  No gameplay; one non-gameplay placeholder round type only.

## Architecture decisions

- **Routing / base path:** unchanged from Slice 1 (hash routing; ADR-001).
- **State, event & sync core:** see
  [`../architecture/ADR-002-state-event-sync-core.md`](../architecture/ADR-002-state-event-sync-core.md).
  Commands express intent; a pure reducer produces append-only events;
  authoritative state is `replay(initial + events)`; undo appends an auditable
  `EVENT_UNDONE` marker. The allow-list `toPublicState` sanitizer is the only
  path from private state to the display. Host/display sync uses a versioned
  BroadcastChannel envelope; the host is authoritative, the display read-only and
  fails closed.
- **Canonical validation & import:** see
  [`../architecture/ADR-004-canonical-validation-import.md`](../architecture/ADR-004-canonical-validation-import.md).
  A game file is a JSON object discriminated by exact `format` +
  `schemaVersion`; there is exactly one ingestion pipeline; unknown keys are
  rejected (never dropped); nothing is coerced, defaulted, or repaired; failures
  are structured issues, not exceptions; and the pipeline holds no reference to
  the store, reducer, or sync layer, so an invalid import cannot mutate anything.
  A successful import loads only via the existing `INITIALIZE_GAME` command.
  **Unknown round types fail IMPORT** — deliberately stricter than Slice 3's
  trusted in-memory path, which still represents and fail-closes on them.
- **Game & round model + registry:** see
  [`../architecture/ADR-003-game-round-model-registry.md`](../architecture/ADR-003-game-round-model-registry.md).
  `GameDefinition` is immutable authored data (deep-frozen; unique ordered
  rounds); `RoundType` is an open branded string and the **registry** decides
  known/unknown with no fallback and **no code execution**. Round `config` is
  data-only (`DataValue` forbids functions). The `GameSession` (`PrivateGameState`)
  is distinct from the definition. Round **support is frozen onto the event at
  plan time**, so replay is deterministic without the registry.
- **Timers, arming & transitions:** see
  [`../architecture/ADR-007-timers-arming-transitions.md`](../architecture/ADR-007-timers-arming-transitions.md).
  The clock is read at the command/dispatch edge and the presentation edge and
  nowhere else; durable events record facts, never a ticking value; a running
  window is projected as an absolute deadline and the display derives the
  countdown locally. Arming is manual, durable and orthogonal to the timer.
  Interruption is a typed source that stops the clock without ending the clue.
  Expiry must carry the timer identity and the exact deadline, so a stale callback
  is inert. A window is legal only at the `prompt` stage and is not resumed across
  a round change. The display never expires a timer.
- **Teams & scoring:** see
  [`../architecture/ADR-006-teams-and-scoring.md`](../architecture/ADR-006-teams-and-scoring.md).
  Teams are authored content, scores are replayed session state, and the two never
  mix. Identity is the team id (never the name); authored order is canonical and the
  scoreboard never re-sorts. Imported content may NAME an accent from a fixed
  application palette and can never supply a colour or any style value. Scores are
  bounded integers derived only from events — the resulting total is deliberately
  **not** stored on the event, because undoing an earlier adjustment would make a
  stored total a lie. The selected scoring target is host UI state: not a command,
  not an event, not in `PublicState`. Revealing and scoring are independent in both
  directions, and correction is undo-or-compensate, never an edit.
- **Category-board round:** see
  [`../architecture/ADR-005-category-board-round.md`](../architecture/ADR-005-category-board-round.md).
  Authored array order is canonical; identity is the stable id (tile ids unique
  across the whole round). Uneven categories and duplicate values are both
  ALLOWED and documented. `effectiveValue = value × multiplier` over bounded
  integers, affecting only the displayed value — it scores nothing, and the
  default of 1 is applied by the trusted constructor, never a Zod transform.
  The reveal stage is one discriminated value paired with the selection, so
  "no answer without a selected tile" is structural. A tile is consumed on
  ANSWER reveal and released by undo, derived only from replayed events. The
  public DTO is current-stage-only with positional keys and a neutral `kind`
  discriminator; notes and alternates are never projected.
- **Failure categories** (command rejection, event application failure, transport
  decode failure, public projection failure) each have a defined fail-safe
  behavior; unknown-round-type is handled fail-closed at every layer.

## Module map (Slices 2–7)

```
src/game/
  teams/
    accents.ts       The application-controlled accent palette (8 tokens) + guard
    limits.ts        Team-count / name / id limits, each with a classroom rationale
    schema.ts        Strict Zod teams schema + whole-list semantic checks
    definition.ts    Trusted TeamDefinition, fail-closed read, lookups, guards
    scoring.ts       Score bounds, the four typed modes, ScoreSource, THE amount rule
  categoryBoard/
    limits.ts        Board-size + text limits, each with a classroom rationale
    schema.ts        Strict Zod config schema + whole-board semantic checks
    definition.ts    Trusted CategoryBoardDefinition, fail-closed read, lookups
    roundType.ts     The registered `category-board` RoundTypeEntry
  timing/
    limits.ts        Response-window bounds + the documented default, with reasons
    schema.ts        Strict Zod schema for the authored `timer` block
    timerConfig.ts   Trusted TimerConfig, the ONE default, guards, ms conversion
    responsePhase.ts ResponsePhaseState, the 5-status timer union, the typed
                     interruption seam, pure remaining-time derivations
  ids.ts             Branded GameId / RoundId / RoundType / GameSessionId
  roundDefinition.ts RoundDefinition, DataValue/RoundConfig, placeholder type + guard
  gameDefinition.ts  GameDefinition, createGameDefinition (unique ids, deep-freeze), guard
  deepFreeze.ts      Recursive freeze used by the definition factory
  registry.ts        RoundTypeEntry, createRoundRegistry (explicit known/unknown, no exec)
  placeholderRound.ts  The one built-in non-gameplay round type entry
  defaultRegistry.ts createDefaultRegistry (placeholder + category-board)
  sampleGame.ts      Trusted in-memory samples (incl. one unsupported round)
src/time/
  clock.ts         THE clock seam: Clock, systemClock, manual clock, isInstant
  duration.ts      Dependency-free M:SS / spoken-duration formatting
src/state/
  publicState.ts   PublicState (+ game view, + round DTO, + teams, + response, v5)
  status.ts        Bounded PublicStatusCode + fixed public copy (host-side)
  privateState.ts  PrivateState / …GameState (+ CategoryBoardRoundState, + teamScores)
  privateState.ts  (+ responsePhases per-round map)
  commands.ts      SessionCommand union (+4 game, +4 board, +1 scoring, +8 response)
  events.ts        SessionEvent union (+4 game, +4 board, +1 scoring, +8 response)
  reducer.ts       reduce, planCommand, replay, findUndoTarget, effectiveEvents,
                   categoryBoardStateFor, teamScoreFor, responsePhaseFor
  sanitize.ts      toPublicState (allow-list; +game view, +round, +scoreboard,
                   +response phase)
  store.ts         createSessionStore (owns a RoundRegistry; injects support predicate)
src/sync/
  protocol.ts      Versioned envelope (v2, required `sentAt`) + strict decode
  channel.ts       SyncChannel: BroadcastChannel / no-op / in-memory-hub impls
  broadcaster.ts   Host publisher (sanitized only; answers request-state)
  receiver.ts      Display subscriber (decode, stale/dup drop, request on start,
                   clamped host-clock offset estimate)
src/import/
  canonicalFormat.ts  Format identity, supported version, documented limits
  issues.ts           ImportStage/ImportIssueCode/ImportIssue, paths, sorting
  result.ts           Discriminated ImportResult + ImportMetadata
  safetyScan.ts       Pre-Zod plain-data scan (reserved keys, non-data, cycles)
  schemas.ts          Strict Zod schemas + ZodIssue → ImportIssue mapping
  semantic.ts         Unique round ids, non-blank titles
  registryCheck.ts    Registry compatibility + per-type config schema
  normalize.ts        Validated → branded, deep-copied, frozen GameDefinition
  importGame.ts       THE pipeline (importGameFromJsonText / …FromUnknown)
  sampleGameFile.ts   Built-in sample game files as JSON TEXT (not definitions)
src/host/          useSessionStore, useHostSync, FoundationControls,
                   GameImportPanel (host-only import harness),
                   CategoryBoardHostPanel (reveals; scores nothing),
                   TeamScoringPanel (scores; reveals nothing),
                   ResponseTimerHostPanel (arms and times; reveals and scores
                   nothing), useResponseTimerExpiry (the ONE scheduled clock read)
src/display/       usePublicState (PublicState + receiver + clock offset),
                   CategoryBoardDisplay (projector board / prompt / answer),
                   TeamScoreboard (projector scoreboard, fails closed),
                   ResponseTimerDisplay + useResponseCountdown (derived countdown)
src/test/          leakLabels, gameFileFixtures, categoryBoardFixtures, teamFixtures
```

> **Module map note (Slice 4).** `src/game/sampleGame.ts` builds *trusted
> in-memory* fixtures through the domain constructor; `src/import/sampleGameFile.ts`
> holds *untrusted* JSON text that goes through the pipeline. They are not
> interchangeable — the first is not an import path.

## Verification commands

```bash
npm ci               # reproducible install
npm run lint         # ESLint (flat config)
npm run typecheck    # tsc -b --noEmit
npm run test:run     # Vitest (unit/component) — 947 tests
npm run build        # tsc -b && vite build → dist/
npm run test:e2e     # Playwright vs production preview (3 viewport projects)
npm run verify       # lint + typecheck + unit
npm run verify:all   # verify + build + e2e (merge gate)
```

> **Local Playwright note:** this sandbox's pre-provisioned Chromium is build
> 1194 while `@playwright/test@1.56` expects 1228, so `test:e2e` needs
> `PLAYWRIGHT_CHROMIUM_PATH=/opt/pw-browsers/chromium-1194/chrome-linux/chrome`.
> That override is passed via the environment only — never committed. CI installs
> the matching browser and needs no override.

Latest local results (Slice 7): `verify:all` green — **947 unit tests (42 files),
175 e2e passed / 2 skipped** (both skips are the one desktop-only offline-shell
test); `git diff --check` clean. **Slice 7 PR CI has not been observed yet** — the
PR is open at the time of writing, and the receipt says so rather than assuming it.

Earlier, on the Slice 6 branch: `verify:all` green — **740 unit tests,
154 e2e passed / 2 skipped** (both skips are the one desktop-only offline-shell
test); `git diff --check` clean. **Slice 6 PR CI was observed green** on PR #11 at
both heads (`7734065` and the final reviewed head `48ed818`): all three checks
success, SonarCloud Quality Gate passed, 0 security hotspots. **Post-merge on
`main` (`67180a3`)** the `CI` workflow concluded success for both jobs, and the
**GitHub Pages deployment succeeded. Manual live-route verification was not
performed** — the sandbox network policy denies `ricktron.github.io` with HTTP 403
on CONNECT.

Earlier, on the Slice 5 branch: `verify:all` green — **455 unit tests,
121 e2e passed / 2 skipped**. Slice 5 CI was **observed green** on PR #9
(final reviewed head `5e6994e`): all three checks concluded success, SonarCloud
Quality Gate passed with 0 security hotspots. **Post-merge on `main`
(`2ec6932`)** the `CI` workflow concluded success for both jobs, and the Pages
deployment succeeded.
Earlier, on the Slice 4 branch: 253 unit tests, 97 e2e passed / 2 skipped. Slice 4 CI was observed green on
PR #7 (final head `8ce850c`) and again **post-merge on `main` (`5295e83`)**, where
the Pages deployment also succeeded. Slice 3 CI was observed green on PR #5 (final reviewed head
`464ef07`: build + e2e success, SonarCloud Quality Gate passed, 0 security
hotspots). Durable evidence in the receipts under [`../receipts/`](../receipts/).

## Known risks / limitations

- **No manual live-URL verification has been performed** for Slice 5 or Slice 6 (the
  sandbox network policy denies `ricktron.github.io`). For Slice 6 the **GitHub
  Pages deployment succeeded** post-merge and post-merge CI on `main` is green, but
  **manual live-route verification was not performed** — a successful deploy
  workflow is not the same evidence as loading the site. Slice 6 changes no CI or
  deploy configuration.
- **`PublicState` wire version is now 5 and the sync envelope version is 2.** A
  consumer pinned to any older version of either fails closed by design; no
  migration exists.
- **The board itself still scores nothing.** `multiplier` affects the displayed
  value and the typed `effectiveValue`, and revealing an answer awards nothing — the
  teacher must deliberately award or deduct. A timer running out awards nothing
  either. No buzzer or wager exists.
- **A response window exists only at the `prompt` stage**, and is cleared by a new
  selection, the answer reveal, a return to the board, any round change, the game
  ending, or a new game.
- **A response window is NOT resumed across a round change**, unlike board
  progress, which is. A deadline is an absolute instant, and resuming a stale one
  would put a nonsense clock in front of a class.
- **Host and display clocks are not synchronized.** The display applies a clamped
  (±5 s) offset estimated from each snapshot's `sentAt`; transport delay is ignored
  and there is no round-trip measurement. On today's same-browser transport both
  clocks are identical, so the correction is effectively a no-op — it exists so a
  future cross-device transport does not silently mis-render a countdown.
- **The display never expires a timer.** At 0:00 it keeps showing the running state
  until the host publishes `expired`.
- **Undoing an expiry restores an already-overdue running timer**, which the host
  adapter expires again on the next tick unless the host acts. Undo restores the
  prior durable state exactly.
- **`OG-2`, `OG-3` and `OG-6` are recorded owner decisions that are NOT
  implemented.** No buzz input, queue, promotion or respondent-restricted scoring
  exists anywhere in the codebase.
- **The selected scoring target is host UI state** and is lost on a host reload. It
  is never broadcast and awards nothing by existing (a deliberate decision —
  ADR-006 §7).
- **Undo reaches only the latest reversible event.** The host panel enables "Undo
  last score change" only when the next undo target actually is a score; otherwise it
  points at manual correction. There is no targeted per-event undo.
- **A tile can only be scored while it is open** (`prompt` or `answer` stage). After
  returning to the board, use a manual correction.
- **A zero-value tile has no scoring preset** (every amount rule would need a zero
  delta). Manual correction remains available.
- **Partial credit is whole points only** — no fractions, so no rounding rule.
- **Score bounds are ±1,000,000**; an adjustment that would leave the range is
  rejected, never clamped.
- **Board state is per round and RESUMES on return** — leaving a round and
  coming back restores its used tiles and reveal stage. Deliberate.
- **One tile at a time.** A second tile cannot be opened while one is live;
  return to the board first.
- **Alternates are never projected** — host-only grading aid.
- **The "unregistered round type" test fixture moved** from `category-board` to
  `not-a-real-round-type`, because the former is now a real registered type.
- **Slice 4 merged before Playwright e2e concluded** on the PR head; it
  concluded success ~23 s after the merge, and post-merge CI on `main` is green.
  Recorded precisely in the Slice 4 reconciliation receipt.
- **One schema version, no migrations** (`schemaVersion: 1`). Older/newer fail
  by design.
- **Paste is the only import transport** — no file picker, spreadsheet/CSV/XLSX,
  remote URL, or backend upload (later slices, same pipeline).
- **The import size guard counts characters, not bytes**, and covers only the
  text entry point; the object entry point is bounded by depth and field limits.
- **Duplicate JSON keys are not observable** (`JSON.parse` keeps the last).
- **Un-ending a game is unsupported** — `GAME_SESSION_ENDED` is irreversible;
  re-initialize to start over.
- **In-memory history/definitions only** — no durable persistence yet (Slice 13
  in the amended plan; portable export lands first, in Slice 12). State is lost on
  tab close.
- **Same-browser sync only** — BroadcastChannel, same origin. No cross-device
  sync, backend, or leader election (later/out of scope).
- **PWA icons remain placeholders** (carried from Slice 1).

## Open questions / unresolved decisions

- Confirm the default branch is `main` (deploy workflow targets `main`).
- **Nine owner gates were opened by `ROADMAP-AMENDMENT-001` §16. Four are now
  answered; five remain open.**

  **Answered (2026-07-26), recorded in `docs/PROJECT.md` and ADR-007 §16:**
  - **`OG-1`** — arming is **manual and host-controlled**. *Implemented in
    Slice 7.*
  - **`OG-2`** — future buzzer behaviour preserves a **full ordered team queue**,
    not a first-only lockout. **Not implemented** (Slice 8).
  - **`OG-3`** — after an incorrect response or a host pass, the **next queued
    team is promoted**. **Not implemented** (Slice 8).
  - **`OG-8`** — timer **pause/resume is supported**, bounded as ADR-007 §7
    describes. *Implemented in Slice 7*, and open to owner revision.

  **Still open:** `OG-4` (ties on identical arrival stamps) · `OG-5` (queue/tile
  lifetime) · `OG-6` (scoring restricted to the active respondent — deliberately
  **not** implemented, because no respondent exists) · `OG-7` (individual student
  identity in reporting) · `OG-9` (timer/media coordination). See the amendment
  for which slice each affects.
- **Recording an owner decision is not authorization to implement it.** `OG-2` and
  `OG-3` unblock Slice 8's event vocabulary; Slice 8 itself still needs explicit
  authorization to begin.

## Next action

**Review the Slice 7 pull request** (timers, arming & transitions). It is open and
unmerged. Local `verify:all` is green, [`ADR-007`](../architecture/ADR-007-timers-arming-transitions.md)
records the timing boundary, and the immutable local-verification receipt is in
place with every pre-existing receipt proved byte-identical.

After it merges, record the post-merge reconciliation as usual. The next
implementation slice is **Slice 8 — Local input contract & keyboard buzz-in**,
whose record is in [`../plans/MVP-ARC.md`](../plans/MVP-ARC.md). Its vocabulary
gates `OG-1`, `OG-2` and `OG-3` are now answered, but the slice is still
`Planned`, unstarted and **owner-gated**.

## Prohibited next actions until Slice 8 is explicitly authorized

Do **not**: merge the Slice 7 PR yourself; begin Slice 8 or any later slice;
add local buzzer support, keyboard buzz-in handling, or Gamepad API code (the
roadmap plans these for Slices 8–10, and answering `OG-1`/`OG-2`/`OG-3` is **not**
authorization to write them); add a buzz queue, first-only lockout, or
pass-to-next-team promotion; restrict scoring to an active respondent (`OG-6`,
still deferred); add automatic timeout scoring or make a timer move a point; add
student-owned contestant devices, networked buzzers, or remote team input — these
remain **excluded**, not merely deferred; add durable
persistence/IndexedDB/session recovery/leader coordination; add a final wager, Daily Double, or Final Jeopardy; add a media
pipeline, a theme engine, or team colours beyond the application palette; add
spreadsheet/CSV/XLSX/Google Sheets import, an authoring UI, pack management, a saved
game library, or remote URL import; add a backend, accounts, cross-device sync,
analytics, or AI services; add any further playable round type; weaken fail-closed
display behavior; project teacher notes, alternates, unrevealed content, the score
event history, undo metadata, the host's scoring target, an internal timer id, or
an interruption source; read a clock inside `reduce`, `replay`, the planner's
decision logic, or the sanitizer; publish a per-second or per-frame revision; permit executable
imported game code or imported style values; add dynamic module/plugin loading based
on game content; or move implementation truth into NightWatch or Obsidian.
