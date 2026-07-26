# Handoff — Current

This is the entry point for the next contributor or coding agent. It reflects
the repository with **Slices 1–5 all `Complete` and merged to `main`**, and
**Slice 6 (teams & scoring) `In review`** on a branch with an open, unmerged review
PR. **Slice 7 (timers & transitions) is unstarted.**

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
- **Slice 5 (current):** **Complete.** Delivered on
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
- **Slice 6 (current):** **In review.** Owner-authorized and delivered on
  `claude/slice-6-teams-and-scoring-we53wr`, based on `main` at
  `5237a1f9f6b451c2137330fd0a7f4613b7a919f2` (the merge commit of PR #10, the
  Slice 5 post-merge reconciliation). A **review PR is open against `main` and has
  NOT been merged**; post-merge reconciliation has **not** been performed. Local
  `verify:all` is green (740 unit, 154 e2e / 2 skipped), and **PR CI was observed
  green** on [PR #11](https://github.com/ricktron/classroom-quiz-show/pull/11) at
  `7734065` (all three checks success; SonarCloud Quality Gate passed with 0 security
  hotspots). **Live Pages verification was not performed** — the sandbox network
  policy denies `ricktron.github.io`. **Slice 7 is unstarted.**
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

## Module map (Slices 2–5)

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
  ids.ts             Branded GameId / RoundId / RoundType / GameSessionId
  roundDefinition.ts RoundDefinition, DataValue/RoundConfig, placeholder type + guard
  gameDefinition.ts  GameDefinition, createGameDefinition (unique ids, deep-freeze), guard
  deepFreeze.ts      Recursive freeze used by the definition factory
  registry.ts        RoundTypeEntry, createRoundRegistry (explicit known/unknown, no exec)
  placeholderRound.ts  The one built-in non-gameplay round type entry
  defaultRegistry.ts createDefaultRegistry (placeholder + category-board)
  sampleGame.ts      Trusted in-memory samples (incl. one unsupported round)
src/state/
  publicState.ts   PublicState (+ PublicGameView, + PublicRoundState, + teams DTO, v4)
  status.ts        Bounded PublicStatusCode + fixed public copy (host-side)
  privateState.ts  PrivateState / …GameState (+ CategoryBoardRoundState, + teamScores)
  commands.ts      SessionCommand union (+4 game, +4 board, +1 scoring command)
  events.ts        SessionEvent union (+4 game, +4 board, +1 scoring event)
  reducer.ts       reduce, planCommand, replay, findUndoTarget, effectiveEvents,
                   categoryBoardStateFor, teamScoreFor
  sanitize.ts      toPublicState (allow-list; +game view, +round DTO, +scoreboard)
  store.ts         createSessionStore (owns a RoundRegistry; injects support predicate)
src/sync/
  protocol.ts      Versioned envelope + strict decodeEnvelope (fail-closed)
  channel.ts       SyncChannel: BroadcastChannel / no-op / in-memory-hub impls
  broadcaster.ts   Host publisher (sanitized only; answers request-state)
  receiver.ts      Display subscriber (decode, stale/dup drop, request on start)
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
                   TeamScoringPanel (scores; reveals nothing)
src/display/       usePublicState (imports only PublicState + receiver),
                   CategoryBoardDisplay (projector board / prompt / answer),
                   TeamScoreboard (projector scoreboard, fails closed)
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
npm run test:run     # Vitest (unit/component) — 740 tests
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

Latest local results (Slice 6 branch): `verify:all` green — **740 unit tests,
154 e2e passed / 2 skipped** (both skips are the one desktop-only offline-shell
test); `git diff --check` clean. **Slice 6 CI was observed green** on PR #11 at
`7734065` (all three checks success, SonarCloud Quality Gate passed, 0 security
hotspots). **Live Pages URLs were not loaded** — the sandbox network policy denies
`ricktron.github.io` with HTTP 403 on CONNECT.

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

- **No live-URL verification has been performed** since the Slice 5 deployment (the
  sandbox network policy denies `ricktron.github.io`). Slice 6 CI *was* observed
  green on PR #11, and Slice 6 changes no CI or deploy configuration.
- **`PublicState` wire version is now 4.** A consumer pinned to version 3 (or 2)
  fails closed by design; no migration exists.
- **The board itself still scores nothing.** `multiplier` affects the displayed
  value and the typed `effectiveValue`, and revealing an answer awards nothing — the
  teacher must deliberately award or deduct. No timer, buzzer or wager exists.
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
- **In-memory history/definitions only** — no durable persistence yet (Slice 8).
  State is lost on tab close.
- **Same-browser sync only** — BroadcastChannel, same origin. No cross-device
  sync, backend, or leader election (later/out of scope).
- **PWA icons remain placeholders** (carried from Slice 1).

## Open questions / unresolved decisions

- None blocking. Confirm the default branch is `main` (deploy workflow targets
  `main`).

## Next action

**Review the Slice 6 implementation PR.** It is open against `main` and must not be
merged until reviewed. Slice 6 is `In review` in [`../STATUS.md`](../STATUS.md).

## Prohibited next actions until the Slice 6 PR merges

Do **not**: merge the Slice 6 PR yourself; perform Slice 6 post-merge
reconciliation; begin Slice 7 or any later slice; add timers, countdowns, timed
transitions, or automatic timeout scoring; add buzzers, lockout, contestant devices,
or remote team input; add durable persistence/IndexedDB/session recovery/leader
coordination; add a final wager, Daily Double, or Final Jeopardy; add a media
pipeline, a theme engine, or team colours beyond the application palette; add
spreadsheet/CSV/XLSX/Google Sheets import, an authoring UI, pack management, a saved
game library, or remote URL import; add a backend, accounts, cross-device sync,
analytics, or AI services; add any further playable round type; weaken fail-closed
display behavior; project teacher notes, alternates, unrevealed content, the score
event history, undo metadata, or the host's scoring target; permit executable
imported game code or imported style values; add dynamic module/plugin loading based
on game content; or move implementation truth into NightWatch or Obsidian.
