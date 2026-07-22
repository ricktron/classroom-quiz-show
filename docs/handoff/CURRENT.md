# Handoff — Current

This is the entry point for the next contributor or coding agent. It reflects
the repository after Slice 1 was merged, deployed, and accepted.

## Repository state

- **Repository:** `ricktron/classroom-quiz-show` (standalone; single source of
  implementation truth).
- **Branch:** Slice 1 was delivered on `claude/classroom-quiz-show-slice-1-a6ogu4`
  and **merged to `main` via PR #1** (merge commit `e0bfb14`). Post-merge
  reconciliation lives on `docs/slice-1-post-merge-reconciliation`
  (documentation only).
- **Current slice:** Slice 1 — Foundation. **State: Complete** (merged,
  deployed, and owner-accepted). **Slice 2 is unstarted.**
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

- **CI observed green** and **Pages observed live** — both resolved. CI runs
  `29882292809`/`29882719298` succeeded; the deploy workflow run `29882719376`
  (attempt 2) completed at 2026-07-22T03:41:51Z, and the owner verified the live
  root/host/display routes render. Full evidence, including the distinction
  between owner live observation and sandbox production-**artifact** QA, is in
  [`../receipts/2026-07-22-slice-1-post-merge-reconciliation.md`](../receipts/2026-07-22-slice-1-post-merge-reconciliation.md).
- **Projector-leak tests are a baseline** (labels + controls), not proof of the
  future sanitizer boundary. Add structural `PublicState` assertions when the
  sanitizer lands (Slice 2). QA advisory INFO-1 (a non-rendered `<meta>`
  description containing "teacher") is a related, non-blocking note.
- **PWA icons are placeholders.**

## Open questions / unresolved decisions

- None blocking. Confirm the default branch is `main` (the deploy workflow
  targets `main`); adjust the workflow if the owner prefers another branch.

## Next action

Review and merge the documentation-only post-merge reconciliation PR
(`docs/slice-1-post-merge-reconciliation`). Slice 1 is already `Complete` in
[`../STATUS.md`](../STATUS.md). Begin Slice 2 (state & event core) only after the
owner explicitly authorizes starting it.

## Prohibited next actions until Slice 2 is authorized

Do **not**: begin Slice 2 or any later slice; implement playable rounds, a
board, scoring, timers, teams, answer reveal, state/event core, persistence, or
imports; add a backend, accounts, buzzers, or AI services; weaken fail-closed
display behavior; send private host state to the display; permit executable
imported game code; or move implementation truth into NightWatch or Obsidian.
