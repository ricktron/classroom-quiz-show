# Slice 5 — category-board round: local verification

- **Date:** 2026-07-26
- **Slice / PR:** Slice 5 / implementation PR (review only — not merged)
- **Branch:** `claude/slice-5-category-board-6gfxnq`
- **Base `main` commit:** `0dacd3501fb10ce1272386f56bf15a2956ee8c6d`
  (merge commit of PR #8, the Slice 4 post-merge reconciliation)
- **Environment:** local sandbox (Linux, Node 22, npm 10)

## Commands & results

| Command | Result | Notes |
| --- | --- | --- |
| `npm ci` | pass | reproducible install from `package-lock.json`; no dependency changes |
| `npm run lint` | pass | ESLint flat config, no warnings |
| `npm run typecheck` | pass | `tsc -b --noEmit` (run with `--force` to defeat build-info caching) |
| `npm run test:run` | pass | **455 tests, 27 files** (253 before this slice) |
| `npm run build` | pass | `tsc -b && vite build`; PWA precache 16 entries / 379.51 KiB |
| `npm run test:e2e` | pass | **121 passed / 2 skipped**, 3 viewport projects |
| `git diff --check` | pass | no whitespace errors |

`npm run verify:all` runs exactly the lint → typecheck → unit → build → e2e
chain above.

## Skips (accurately reported)

Two skips, both pre-existing and both the SAME test:
`tests/e2e/pwa-offline.spec.ts` → "offline app shell › host and display shells
load offline after first visit". It is guarded to run once on the desktop
project only, so it reports as skipped on `projector-720p` and `mobile-host`.
**No test was skipped because it was failing.**

## Environment override

Playwright needed `PLAYWRIGHT_CHROMIUM_PATH=/opt/pw-browsers/chromium-1194/chrome-linux/chrome`
because this sandbox's pre-provisioned Chromium is build 1194 while
`@playwright/test@1.56` expects 1228. The override was supplied **via the
environment only**; no machine-specific path is committed. `playwright.config.ts`
already reads that variable (added in Slice 1) and is unchanged.

## Test coverage added in this slice

| Area | File | Tests |
| --- | --- | --- |
| Config model, ordering, board shape, multiplier, limits, immutability, lookups | `src/game/categoryBoard/categoryBoard.test.ts` | 42 |
| Canonical import integration, precise errors, no-repair, registry isolation, samples | `src/import/categoryBoardImport.test.ts` | 35 |
| Commands, reveal-stage machine, used-tile policy, undo, replay, round transitions | `src/state/categoryBoardReducer.test.ts` | 43 |
| Public projection, privacy, fail-closed, guards, wire version | `src/state/categoryBoardSanitize.test.ts` | 26 |
| Host component behaviour, accessibility, bounded controls | `src/host/CategoryBoardHostPanel.test.tsx` | 25 |
| Display component behaviour, privacy at every stage, fail-closed | `src/display/CategoryBoardDisplay.test.tsx` | 22 |
| Host→display sync with a live board, stale/duplicate/malformed payloads | `src/sync/categoryBoardSync.test.ts` | 9 |
| Browser: full play-through, privacy, undo, keyboard, overflow, import failure | `tests/e2e/category-board.spec.ts` | 8 × 3 projects |

Existing Slice 1–4 suites (routing, Pages base path, PWA/offline, accessibility,
responsive, reducer/replay/undo, sanitizer, sync, registry, import, state
isolation, projector-leak) all remain green.

## Migrated fixtures (intent preserved)

Slices 3–4 used the literal string `category-board` as their "unregistered round
type" fixture, because no board engine existed. Registering the type for real
made that string valid, so those fixtures moved to `not-a-real-round-type` — a
name that is not on the roadmap and cannot become registered by accident. Files:
`src/import/errorModel.test.ts`, `src/import/stateIsolation.test.ts`,
`src/host/GameImportPanel.test.tsx`, `tests/e2e/import-pipeline.spec.ts`, and
the `CANONICAL_SAMPLE_WITH_UNKNOWN_ROUND_TYPE` fixture itself. Every one of those
tests kept its original assertions and still fails at the `registry` stage.

`src/game/registry.test.ts` was updated from "the default registry has exactly
the placeholder type" to "registers exactly the built-in types, in registration
order" (`placeholder`, then `category-board`).

`src/state/sanitize.test.ts` gained `round` in its allow-listed-key assertion —
which is the point of that test: a new `PublicState` field must be a deliberate,
reviewed edit.

## Caveats

- **CI not yet observed.** No GitHub Actions run existed for this branch at the
  time of writing. Slice 5 changes no CI or deploy configuration.
- **Pages deployment not yet observed** for this branch (Pages deploys from
  `main`).
- **This is local evidence only.** Slice 5 is `In review`, not `Complete`.
- The e2e run used the Chromium override described above rather than the browser
  build CI installs. The application code under test is the production build.
