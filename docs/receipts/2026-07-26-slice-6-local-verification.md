# Slice 6 — teams & scoring: local verification

- **Date:** 2026-07-26
- **Slice / PR:** Slice 6 / implementation PR (review only — **not merged**)
- **Branch:** `claude/slice-6-teams-and-scoring-we53wr`
- **Base `main` commit:** `5237a1f9f6b451c2137330fd0a7f4613b7a919f2`
  (merge commit of PR #10, the Slice 5 post-merge reconciliation)
- **Environment:** local sandbox (Linux, Node 22, npm 10)

## Commands & results

| Command | Result | Notes |
| --- | --- | --- |
| `npm ci` | pass | reproducible install from `package-lock.json`; **no dependency changes** |
| `npm run lint` | pass | ESLint flat config, no warnings |
| `npm run typecheck` | pass | `tsc -b --noEmit` (run with `--force` to defeat build-info caching) |
| `npm run test:run` | pass | **740 tests, 35 files** (456 before this slice, itself 455 + 1 from a rewritten Slice 5 assertion) |
| `npm run build` | pass | `tsc -b && vite build`; PWA precache 16 entries / 402.29 KiB |
| `npm run test:e2e` | pass | **154 passed / 2 skipped**, 3 viewport projects |
| `git diff --check` | pass | no whitespace errors |
| `npm run verify:all` | pass | the whole lint → typecheck → unit → build → e2e chain, run again end to end |

Each command above was run individually **and** `verify:all` was then run once as a
single chain; both passed.

## Skips (accurately reported)

Two skips, both pre-existing and both the SAME test:
`tests/e2e/pwa-offline.spec.ts` → "offline app shell › host and display shells load
offline after first visit". It is guarded to run once on the desktop project only,
so it reports as skipped on `projector-720p` and `mobile-host`. **No test was
skipped because it was failing, and Slice 6 adds no skips.**

## Environment override

Playwright needed
`PLAYWRIGHT_CHROMIUM_PATH=/opt/pw-browsers/chromium-1194/chrome-linux/chrome`
because this sandbox's pre-provisioned Chromium is build 1194 while
`@playwright/test@1.56` expects 1228. The override was supplied **via the
environment only**; no machine-specific path is committed. `playwright.config.ts`
already reads that variable (added in Slice 1) and is unchanged.

## Test coverage added in this slice

| Area | File | Tests |
| --- | --- | --- |
| Team model, limits, accents, order/identity, immutability, guards, lookups | `src/game/teams/teams.test.ts` | 37 |
| Scoring domain: bounds, integrality, the four modes' amount rules, presets | `src/game/teams/scoring.test.ts` | 38 |
| Canonical import integration, exact paths, no repair, samples, safety scan | `src/import/teamImport.test.ts` | 33 |
| Score commands, provenance, replay, undo, reveal independence, reset | `src/state/teamScoreReducer.test.ts` | 67 |
| Public projection, privacy, fail-closed, wire guard, wire version 3 → 4 | `src/state/teamScoreSanitize.test.ts` | 32 |
| Host panel behaviour, guards, previews, accessible errors, no Slice 7 controls | `src/host/TeamScoringPanel.test.tsx` | 47 |
| Projector scoreboard, negative totals, colour-independence, fail-closed | `src/display/TeamScoreboard.test.tsx` | 17 |
| Host→display sync of totals; stale / duplicate / malformed / old-version payloads | `src/sync/teamScoreSync.test.ts` | 12 |
| Browser: award / return / deduct / undo flow, partial + manual correction, privacy, refresh, keyboard, import failure, overflow, new-game reset, Slice 5 regression | `tests/e2e/teams-scoring.spec.ts` | 11 × 3 projects |

Existing Slice 1–5 suites (routing, Pages base path, PWA/offline, accessibility,
responsive, reducer/replay/undo, sanitizer, sync, registry, import, state isolation,
category board, projector-leak) all remain green.

## Existing tests updated (intent preserved, not weakened)

Four Slice 5 assertions had to change because the truth they asserted changed:

1. `src/state/sanitize.test.ts` — the `PublicState` allow-list gains `teams`, and the
   two fixed-projection assertions gain `teams: null`.
2. `src/state/categoryBoardSanitize.test.ts` — the same allow-list addition, and the
   wire-version assertion moves from `3` to `4`.
3. `src/state/categoryBoardReducer.test.ts` — the test formerly named "scoring is
   explicitly out of scope" asserted that NO score field existed anywhere. Slice 6
   adds scoring, so it was rewritten as "revealing is not scoring": playing a tile
   end to end appends **no** score event and moves **no** points, and the
   timer/buzzer/wager fields are still absent. That preserves the load-bearing claim
   and drops only the part that Slice 6 legitimately invalidates.
4. `src/host/CategoryBoardHostPanel.test.tsx` — the board panel still offers no
   scoring control (unchanged assertion), but its hint text no longer says "nothing
   is scored here"; it now points at the scoring panel, and a second test covers the
   post-reveal copy.

## Playwright flake found and fixed (not skipped)

On the first full run, the long end-to-end flow timed out **once**, on
`desktop-1080p` only, at the "undo the score" step. Re-running that test in
isolation passed in 26.5 s against the default 30 s budget, and the captured page
snapshot showed the undo button **enabled** with the correct audit line — i.e. the
product state was right and the test simply ran out of budget under parallel load.

Fixed honestly: the six multi-step cross-tab tests are marked `test.slow()` (a real
timeout increase, not a skip), and two of the four full-DOM privacy sweeps were
removed from the longest test because the dedicated privacy test already performs the
exhaustive version. The subsequent full run was green with no retries.

## CI on the review PR — observed green

Recorded after the PR was opened, on implementation commit `7734065`
(PR [#11](https://github.com/ricktron/classroom-quiz-show/pull/11)):

| Check | Conclusion |
| --- | --- |
| `Lint, typecheck, unit tests, build` | **success** (2026-07-26T06:52:16Z) |
| `Playwright e2e` | **success** (2026-07-26T06:53:19Z) |
| `SonarCloud Code Analysis` | **success** — Quality Gate **passed**, **0 Security Hotspots** |

All three checks concluded success. No review threads were open at that point; the
only PR comments were two bot notices (a Cursor Bugbot "not enabled" upsell and the
SonarCloud summary), neither of which requires action.

**Not inspected:** SonarCloud's summary also reports **13 new non-blocking issues**
(the Quality Gate passed regardless). They were **not** examined, because
`sonarcloud.io` is unreachable from this sandbox under the same network policy that
blocks the Pages site (HTTP 403 on CONNECT). Coverage on new code reads 0.0% because
this repository does not upload coverage to Sonar — unchanged from earlier slices,
not a regression introduced here.

## Verification NOT claimed

- **Live GitHub Pages URLs: not loaded.** The sandbox network policy denies
  `ricktron.github.io` (the proxy answered **HTTP 403 to CONNECT**), so
  `https://ricktron.github.io/classroom-quiz-show/#/host` and `#/display` were
  **not** visited and no live behaviour is claimed. Slice 6 changes no CI or deploy
  configuration.
- **Owner acceptance: not claimed.** The PR is open for review and unmerged.

## What WAS observed locally, beyond the test suites

The production preview (`vite preview` at the real Pages base path) was driven with
a real Chromium at 1280×720 and screenshotted, confirming by eye: the projector
board with the scoreboard strip beneath it; both teams at `0`; a `100` total after a
full-credit award; and a `-1200` total rendered in the danger colour **with** the
minus sign in the text. Those screenshots are working artifacts and are **not**
committed.

## Dependency changes

**None.** `package.json` and `package-lock.json` are untouched by this slice.
