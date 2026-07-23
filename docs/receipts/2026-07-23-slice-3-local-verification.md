# Slice 3 — local verification

Durable evidence for the Slice 3 (game & round model + registry) implementation
before review. Only observed results are recorded here.

- **Date:** 2026-07-23
- **Slice / PR:** Slice 3 — Game & round model + registry / implementation PR (In review)
- **Branch:** `claude/slice-3-game-round-registry-yjzexz`
- **Base:** `main` at `61e1a29548e8735886c3637e5c2e521ff6ee6db4` (after the merged
  Slice 2 post-merge reconciliation, PR #4)
- **Environment:** local sandbox (Node 20, Vitest jsdom, Playwright vs. the
  production `vite preview` build under `/classroom-quiz-show/`)

## Commands & results

| Command | Result | Notes |
| --- | --- | --- |
| `npm ci` | pass | 0 vulnerabilities |
| `npm run lint` | pass | ESLint flat config, no warnings |
| `npm run typecheck` | pass | `tsc -b --noEmit` |
| `npm run test:run` | pass | 123 unit tests, 13 files |
| `npm run build` | pass | `tsc -b && vite build`; PWA precache 16 entries |
| `npm run test:e2e` | pass | 73 passed, 2 skipped (offline-shell runs once on desktop) |
| `npm run verify:all` | pass | full gate green |
| `git diff --check` | pass | no whitespace/conflict markers |

## Scope of evidence

- **Unit (Vitest).** Branded ids (validation, no runtime brand). Game definition
  factory: ordered/deterministic rounds, unique-id enforcement, duplicate/empty-
  id/malformed-round rejection, explicit empty-rounds allowance, deep-freeze
  immutability (definition unchanged through mutation attempts), caller-array
  copy. Registry: known register/lookup, explicit unknown result, duplicate
  rejection, no silent fallback, registration order independent of round order,
  no mutation from definition data, fresh instance per call. No-executable-import:
  no-function deep scan of sample games, JSON round-trip, code-in-config only via
  explicit cast, registry has no eval/import/dynamic-registration surface. Game
  commands/events: init before/after session, invalid-definition fail-closed,
  select by id (supported), unknown-round rejection, advance within bounds and
  safe rejection past the final round / on an empty game, end (irreversible),
  rejected-command no-mutation. Replay determinism + idempotency; undo of a
  selection reverts to the prior selection with audit preserved; irreversible
  game init/end never undone; game event before a game fails safe. Sanitizer game
  projection: exact allow-listed keys, supported→available/1-based ordinal,
  unsupported→unavailable (fail closed), ended, and no leak of title/round ids/
  types/config.
- **Browser (Playwright, real BroadcastChannel, two+ tabs).** Host loads a sample
  multi-round definition and the display shows only safe round status; advancing
  updates the display; the display is read-only (no buttons/textboxes/links) and
  exposes no round-type identifier; an unsupported round leaves the display safe
  ("not available", no internals); refresh and a second display resume the
  current round; ending shows a neutral "complete". The pre-existing projector-
  leak, routing, PWA/offline, responsive, accessibility, and Slice 2 sync suites
  remained green.

## Caveats

- **CI not yet observed for Slice 3.** GitHub Actions runs when the PR opens;
  this receipt records local results only.
- **Playwright browser override.** The sandbox's pre-provisioned Chromium is
  build 1194 while `@playwright/test@1.56` expects 1228, so e2e was run with
  `PLAYWRIGHT_CHROMIUM_PATH=/opt/pw-browsers/chromium-1194/chrome-linux/chrome`.
  This override is environment-only and is **not** committed; CI installs the
  matching browser.
- **In-memory only.** Game definitions and event history are not persisted
  (durable persistence is Slice 8); definitions are trusted in-memory objects
  (validation/import is Slice 4).
- Evidence is local (build artifact under `vite preview`), not the live
  `github.io` origin.
