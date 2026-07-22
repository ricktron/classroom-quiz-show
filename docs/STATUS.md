# Status

**Current slice:** Slice 1 — Foundation
**Slice state:** In review

## State vocabulary

`Planned` · `In progress` · `In review` · `Complete` · `Blocked` · `Unknown`

> Slice 1 is **In review**, not `Complete`. Per the plan, it may only be marked
> `Complete` after review and workflow completion (CI green + Pages deploy
> configured and accepted by the owner).

## Completed work (Slice 1)

| Item                                                        | State    |
| ----------------------------------------------------------- | -------- |
| React + TypeScript + Vite project runs locally              | Complete |
| Hash routing strategy chosen + documented (ADR-001)         | Complete |
| Game-engine boundaries documented                           | Complete |
| Root role-picker route                                      | Complete |
| Host route (private warning, "No active game", open display)| Complete |
| Display route (safe waiting state, no controls)             | Complete |
| Unknown route (safe "Screen not found", no diagnostics)     | Complete |
| Route-level error handling; display **fails closed**        | Complete |
| PWA manifest + placeholder icons + service worker           | Complete |
| Offline app shell (validated by Playwright)                 | Complete |
| GitHub Pages base path (`/classroom-quiz-show/`) correct    | Complete |
| Unit/component tests (Vitest)                               | Complete |
| Browser tests (Playwright) incl. projector-leak suite       | Complete |
| CI workflow (lint, typecheck, unit, build, e2e)             | Complete |
| Pages deploy workflow                                       | Complete |
| README / PROJECT / STATUS / MVP-ARC / handoff / governance  | Complete |

## Verification state

Local verification has been run and passed (lint, typecheck, unit tests,
production build, Playwright e2e). See
[`handoff/CURRENT.md`](handoff/CURRENT.md) for exact commands and results, and
[`receipts/README.md`](receipts/README.md) for how evidence is recorded.

- CI on GitHub Actions: **Configured, not yet observed green** (no push/PR run
  recorded at the time of writing).
- GitHub Pages live deployment: **Configured, not yet observed live** (requires
  the one-time repository setting in the README and a push to `main`).

These two items are accurately qualified as "configured but unverified in the
GitHub environment" and are the reason Slice 1 is `In review`, not `Complete`.

## Remaining work (before marking Slice 1 Complete)

- [ ] Observe CI green on the PR.
- [ ] Owner enables **Settings → Pages → Source: GitHub Actions**.
- [ ] Observe a successful Pages deployment and load the live host/display URLs.

## Blockers

None at the code level. The only gating items are GitHub-side (CI run + the
one-time Pages source setting), which require the repository owner.

## Limitations

- No gameplay exists yet (no board, rounds, scoring, timers, teams, answer
  reveal, persistence). This is by design for Slice 1.
- Projector-leak testing is a **baseline** (label + control checks), not proof
  of the future sanitizer boundary.
- Offline support = app shell + routes only, not offline gameplay.
- PWA icons are restrained placeholders.

## Next safe action

Open the review PR for `claude/classroom-quiz-show-slice-1-a6ogu4`, let CI run,
and have the owner enable the GitHub Pages source setting. **Do not begin
Slice 2** until Slice 1 is accepted.
