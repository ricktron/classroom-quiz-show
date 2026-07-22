# Handoff — Current

This is the entry point for the next contributor or coding agent. It reflects
the repository at the end of Slice 1 implementation.

## Repository state

- **Repository:** `ricktron/classroom-quiz-show` (standalone; single source of
  implementation truth).
- **Branch:** `claude/classroom-quiz-show-slice-1-a6ogu4`
- **Current slice:** Slice 1 — Foundation. **State: In review** (not Complete).
- **What exists:** React + TS + Vite app shell; hash routing with host/display/
  root/unknown routes; route-level error handling (display fails closed); PWA
  (manifest + SW + offline shell); Pages deploy config under
  `/classroom-quiz-show/`; Vitest + Playwright suites; full docs/governance.
- **What does NOT exist:** any gameplay (board, rounds, scoring, timers, teams,
  answer reveal, persistence, state/event core). Deferred by design.

## Architecture decisions

- **Routing:** hash routing (`HashRouter`) — see
  [`../architecture/ADR-001-github-pages-routing.md`](../architecture/ADR-001-github-pages-routing.md).
  Chosen for reliable direct-load/refresh on static GitHub Pages under a repo
  base path, with no 404 trick.
- **Base path:** `/classroom-quiz-show/` in production, `/` in dev; shareable
  links composed via `absoluteHashUrl()` (`src/routes/paths.ts`) from
  `import.meta.env.BASE_URL`.
- **Private/public boundary + fail-closed display:** permanent invariants,
  documented in [`../architecture/GAME-ENGINE-BOUNDARIES.md`](../architecture/GAME-ENGINE-BOUNDARIES.md).
  No sanitizer yet (no state yet); the display renders only static public text
  and is guarded by the baseline projector-leak suite.
- **Multi-round engine:** game = ordered typed rounds via a future registry;
  nothing assumes one-game-one-board, one scoring model, or text-only prompts.

## Verification commands

```bash
npm ci               # reproducible install
npm run lint         # ESLint (flat config)
npm run typecheck    # tsc -b --noEmit
npm run test:run     # Vitest (unit/component)
npm run build        # tsc -b && vite build → dist/
npm run preview      # serve dist/ at /classroom-quiz-show/
npm run test:e2e     # Playwright vs production preview (3 viewport projects)
npm run verify       # lint + typecheck + unit
npm run verify:all   # verify + build + e2e (merge gate)
```

> **Local Playwright note:** if the machine's pre-provisioned Chromium does not
> match Playwright's bundled version, set `PLAYWRIGHT_CHROMIUM_PATH` to the
> Chromium executable before `npm run test:e2e`. CI installs the matching
> browser and needs no override. This env var keeps machine-specific paths out
> of committed config.

Latest local verification results are recorded in the implementation PR
description and (for durable evidence) may be captured as a receipt under
[`../receipts/`](../receipts/).

## Known risks

- **CI not yet observed green** and **Pages not yet observed live** — both are
  configured but require a GitHub push/PR and the one-time Pages source setting
  (see README → Deployment). This is why Slice 1 is `In review`.
- **Projector-leak tests are a baseline** (labels + controls), not proof of the
  future sanitizer boundary. Add structural `PublicState` assertions when the
  sanitizer lands (Slice 2).
- **PWA icons are placeholders.**

## Open questions / unresolved decisions

- None blocking. Confirm the default branch is `main` (the deploy workflow
  targets `main`); adjust the workflow if the owner prefers another branch.

## Next action

Open the review PR for `claude/classroom-quiz-show-slice-1-a6ogu4`, let CI run,
and have the owner enable **Settings → Pages → Source: GitHub Actions**. Then
verify the live host/display URLs and mark Slice 1 `Complete` in
[`../STATUS.md`](../STATUS.md).

## Prohibited next actions until Slice 1 is accepted

Do **not**: begin Slice 2 or any later slice; implement playable rounds, a
board, scoring, timers, teams, answer reveal, state/event core, persistence, or
imports; add a backend, accounts, buzzers, or AI services; weaken fail-closed
display behavior; send private host state to the display; permit executable
imported game code; or move implementation truth into NightWatch or Obsidian.
