# Handoff — Current

This is the entry point for the next contributor or coding agent. It reflects
the repository with Slice 1 merged/deployed/accepted and Slice 2 (state & event
core) **Complete** — merged to `main` with CI green.

## Repository state

- **Repository:** `ricktron/classroom-quiz-show` (standalone; single source of
  implementation truth).
- **Slice 1:** delivered on `claude/classroom-quiz-show-slice-1-a6ogu4`, merged
  to `main` (PR #1, merge commit `e0bfb14`), deployed, owner-accepted.
- **Slice 2 (current):** **Complete.** Delivered on
  `claude/slice-2-state-event-core-ycf9i8` (based on `main` at `b0e5913`,
  implementation commit `bb8904b`), merged to `main` via **PR #3** (merge commit
  `883111e`, merged 2026-07-22T23:00:07Z) with CI green. Post-merge reconciliation
  recorded in
  [`../receipts/2026-07-22-slice-2-post-merge-reconciliation.md`](../receipts/2026-07-22-slice-2-post-merge-reconciliation.md).
  **Slice 3 is unstarted and owner-gated.**
- **What Slice 2 adds:** a neutral state/event/sync foundation — a command-driven
  reducer, append-only event history, deterministic replay + auditable undo, an
  allow-list private→public sanitizer, and same-browser host/display sync over
  BroadcastChannel. No gameplay.

## Architecture decisions

- **Routing / base path:** unchanged from Slice 1 (hash routing; ADR-001).
- **State, event & sync core:** see
  [`../architecture/ADR-002-state-event-sync-core.md`](../architecture/ADR-002-state-event-sync-core.md).
  Commands express intent; a pure reducer produces append-only events;
  authoritative state is `replay(initial + events)`; undo appends an auditable
  `EVENT_UNDONE` marker (nothing is deleted). The allow-list `toPublicState`
  sanitizer is the only path from private state to the display. Host/display sync
  uses a versioned BroadcastChannel envelope; the host is authoritative and the
  display is read-only and fails closed.
- **Four failure categories** (command rejection, event application failure,
  transport decode failure, public projection failure) are documented in ADR-002
  and each has a defined fail-safe behavior.

## Module map (Slice 2)

```
src/state/
  publicState.ts   PublicState type + isPublicState guard (display-safe; no private imports)
  status.ts        Bounded PublicStatusCode + fixed public copy (host-side)
  privateState.ts  PrivateState / PrivateSessionState (authoritative; private fields)
  commands.ts      SessionCommand union (intent)
  events.ts        SessionEvent union (accepted facts; reversible flag)
  reducer.ts       reduce, planCommand, replay, findUndoTarget
  sanitize.ts      toPublicState (allow-list) + safeToPublicState (fail-closed)
  store.ts         createSessionStore (append-only history → derived state)
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
npm run test:run     # Vitest (unit/component) — 66 tests
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

Latest local results: `verify:all` green — 66 unit tests, 58 e2e passed / 2
skipped; `git diff --check` clean. CI on PR #3 was observed green (build + e2e
jobs success; SonarCloud Quality Gate passed, 0 security hotspots). Durable
evidence in the Slice 2 local-verification and post-merge reconciliation receipts
under [`../receipts/`](../receipts/).

## Known risks / limitations

- **In-memory history only** — no durable persistence yet (Slice 8). State is
  lost on tab close.
- **Same-browser sync only** — BroadcastChannel, same origin. No cross-device
  sync, backend, or leader election (later/out of scope).
- **PWA icons remain placeholders** (carried from Slice 1).

## Open questions / unresolved decisions

- None blocking. Confirm the default branch is `main` (deploy workflow targets
  `main`).

## Next action

Review and merge the Slice 2 post-merge reconciliation PR (documentation only).
Slice 2 is already `Complete` in [`../STATUS.md`](../STATUS.md). Do **not** begin
Slice 3 until the owner explicitly authorizes it.

## Prohibited next actions until Slice 3 is authorized

Do **not**: begin Slice 3 or any later slice; implement a game/round model or
registry, validation/import pipeline, board/round engine, scoring, timers, teams,
answer reveal, durable persistence, final wager, media/theme engine, or
authoring; add a backend, accounts, buzzers, cross-device sync, or AI services;
weaken fail-closed display behavior; send private host state to the display;
permit executable imported game code; or move implementation truth into
NightWatch or Obsidian.
