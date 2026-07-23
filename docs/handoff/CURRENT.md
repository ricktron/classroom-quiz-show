# Handoff — Current

This is the entry point for the next contributor or coding agent. It reflects
the repository with Slice 1 & 2 **Complete** (merged to `main`) and Slice 3
(game & round model + registry) **In review** on its implementation branch.

## Repository state

- **Repository:** `ricktron/classroom-quiz-show` (standalone; single source of
  implementation truth).
- **Slice 1:** merged to `main` (PR #1, merge commit `e0bfb14`), deployed,
  owner-accepted.
- **Slice 2:** **Complete.** Merged to `main` via **PR #3** (merge commit
  `883111e`) with CI green; reconciliation PR #4 (merge commit `61e1a29`).
- **Slice 3 (current):** **In review.** Delivered on
  `claude/slice-3-game-round-registry-yjzexz`, based on `main` at
  `61e1a29548e8735886c3637e5c2e521ff6ee6db4` (after the merged Slice 2
  reconciliation, PR #4). Local `verify:all` green; the implementation PR is open
  for review. Local evidence:
  [`../receipts/2026-07-23-slice-3-local-verification.md`](../receipts/2026-07-23-slice-3-local-verification.md).
  **Slice 4 is unstarted and owner-gated.**
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
- **Game & round model + registry:** see
  [`../architecture/ADR-003-game-round-model-registry.md`](../architecture/ADR-003-game-round-model-registry.md).
  `GameDefinition` is immutable authored data (deep-frozen; unique ordered
  rounds); `RoundType` is an open branded string and the **registry** decides
  known/unknown with no fallback and **no code execution**. Round `config` is
  data-only (`DataValue` forbids functions). The `GameSession` (`PrivateGameState`)
  is distinct from the definition. Round **support is frozen onto the event at
  plan time**, so replay is deterministic without the registry.
- **Failure categories** (command rejection, event application failure, transport
  decode failure, public projection failure) each have a defined fail-safe
  behavior; unknown-round-type is handled fail-closed at every layer.

## Module map (Slices 2–3)

```
src/game/
  ids.ts             Branded GameId / RoundId / RoundType / GameSessionId
  roundDefinition.ts RoundDefinition, DataValue/RoundConfig, placeholder type + guard
  gameDefinition.ts  GameDefinition, createGameDefinition (unique ids, deep-freeze), guard
  deepFreeze.ts      Recursive freeze used by the definition factory
  registry.ts        RoundTypeEntry, createRoundRegistry (explicit known/unknown, no exec)
  placeholderRound.ts  The one built-in non-gameplay round type entry
  defaultRegistry.ts createDefaultRegistry (placeholder only)
  sampleGame.ts      Trusted in-memory samples (incl. one unsupported round)
src/state/
  publicState.ts   PublicState (+ PublicGameView) + isPublicState guard (no private imports)
  status.ts        Bounded PublicStatusCode + fixed public copy (host-side)
  privateState.ts  PrivateState / PrivateSessionState / PrivateGameState (authoritative)
  commands.ts      SessionCommand union (intent; +4 game commands)
  events.ts        SessionEvent union (accepted facts; +4 game events; RoundSupport)
  reducer.ts       reduce, planCommand (+PlanDeps), replay, findUndoTarget
  sanitize.ts      toPublicState (allow-list, +game view) + safeToPublicState (fail-closed)
  store.ts         createSessionStore (owns a RoundRegistry; injects support predicate)
src/sync/
  protocol.ts      Versioned envelope + strict decodeEnvelope (fail-closed)
  channel.ts       SyncChannel: BroadcastChannel / no-op / in-memory-hub impls
  broadcaster.ts   Host publisher (sanitized only; answers request-state)
  receiver.ts      Display subscriber (decode, stale/dup drop, request on start)
src/host/          useSessionStore, useHostSync, FoundationControls (host-only)
src/display/       usePublicState (imports only PublicState + receiver)
```

## Verification commands

```bash
npm ci               # reproducible install
npm run lint         # ESLint (flat config)
npm run typecheck    # tsc -b --noEmit
npm run test:run     # Vitest (unit/component) — 123 tests
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

Latest local results (Slice 3 branch): `verify:all` green — 123 unit tests, 73
e2e passed / 2 skipped; `git diff --check` clean. Slice 3 CI runs when the
implementation PR opens. Durable evidence in
[`../receipts/2026-07-23-slice-3-local-verification.md`](../receipts/2026-07-23-slice-3-local-verification.md).

## Known risks / limitations

- **Definitions are trusted in-memory objects** — JSON format + Zod validation
  are Slice 4. Slice 3 validates structure via factory + guard only.
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

Review the Slice 3 implementation PR. Slice 3 is `In review` in
[`../STATUS.md`](../STATUS.md). Do **not** begin Slice 4 until the owner
explicitly authorizes it.

## Prohibited next actions until Slice 4 is authorized

Do **not**: begin Slice 4 or any later slice; implement the Zod validation /
JSON import pipeline, a playable board/round engine, questions/answers, tile
selection, scoring, teams, timers, transitions, durable persistence, final wager,
media/theme engine, or authoring; add a backend, accounts, buzzers, cross-device
sync, or AI services; weaken fail-closed display behavior; send private host
state to the display; permit executable imported game code; add dynamic
module/plugin loading based on game content; or move implementation truth into
NightWatch or Obsidian.
