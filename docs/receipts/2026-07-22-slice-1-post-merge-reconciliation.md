# Slice 1 — post-merge reconciliation

Immutable evidence record reconciling the merged, deployed Slice 1 with observed
production and QA results. This receipt is append-only: do not edit it after
commit; write a new receipt if facts change. The original pre-merge receipt
([`2026-07-22-slice-1-local-verification.md`](2026-07-22-slice-1-local-verification.md))
is preserved unchanged.

- **Date:** 2026-07-22
- **Slice:** Slice 1 — Foundation
- **Scope:** app shell, hash routing (host/display/root/unknown), route-level
  error handling with fail-closed display, PWA (manifest + service worker +
  offline app shell), GitHub Pages deployment under `/classroom-quiz-show/`,
  lint/typecheck/unit/e2e suites, and repository/architecture/governance
  documentation. **No gameplay** (no board, rounds, scoring, timers, teams,
  answer reveal, persistence, or state/event core) — deferred by design.
- **Environment:** GitHub (Actions + Pages) and a local sandbox production
  preview.

## Merge & deployment facts (directly observed from GitHub)

| Fact | Value |
| ---- | ----- |
| Pull request | #1 (`ricktron/classroom-quiz-show`) |
| Feature commit | `0fad6bfa0107b4a855cecd23d72e6056af809c65` |
| Merge commit | `e0bfb14ae6a3c5526abbf9456de4317efc687396` |
| Merge timestamp | 2026-07-22T01:17:56Z |
| CI workflow | `.github/workflows/ci.yml` — run `29882292809` (PR, `0fad6bf`) success; run `29882719298` (push, `e0bfb14`) success |
| Deploy workflow | `.github/workflows/deploy-pages.yml` |
| Deploy workflow run | `29882719376`, attempt 2 |
| Deploy conclusion | success |
| Deployment completion | 2026-07-22T03:41:51Z |
| Deployed URL | https://ricktron.github.io/classroom-quiz-show/ |

## Evidence types (recorded separately and accurately)

### 1. Owner-observed live production verification
The repository owner manually opened the deployed site at
`https://ricktron.github.io/classroom-quiz-show/` and observed:

- Root route rendered successfully.
- Host route rendered successfully.
- Display route rendered successfully.
- The routes appeared to work as expected.
- No obvious display leakage or rendering defect was observed.

This is a **human, live-site observation** of the deployed `github.io` origin.

### 2. Automated adversarial QA — production **artifact**, not the live origin
The sandbox **did not** access the deployed `github.io` site (the environment's
network policy blocks that origin). The automated QA therefore ran against an
**artifact-equivalent** target: the **same commit**, the **same `npm run build`
command**, and the **same `/classroom-quiz-show/` base path**, served locally via
`vite preview` (which reproduces the GitHub Pages base-path and hash-routing
behavior per ADR-001). This is production-artifact testing, **not** direct
live-site testing, and must not be described as such.

**Limitation:** artifact equivalence rests on identical commit + build + base
path; it does not exercise GitHub's edge/CDN, TLS, or real-origin headers. Those
aspects are covered only by the owner's live observation above.

## QA results

- 63 custom adversarial checks passed (navigation, display safety, responsive,
  accessibility, PWA, error recovery, architecture).
- Runtime crash injection into the display route confirmed **fail-closed**
  behavior: the projector rendered only "Display paused" with no stack trace,
  source path, or injected secret (diagnostics went to the console only).
- Responsive checks passed across seven viewports (1920×1080, 1280×720,
  tablet portrait/landscape, phone portrait/landscape, 320-wide) — no overflow,
  cropping, or sub-12px text.
- Accessibility checks passed (one `main` landmark and one `<h1>` per route,
  visible keyboard focus ring, keyboard activation, display contrast ≥ WCAG AA).
- PWA checks passed (valid base-scoped manifest, 192/512/maskable icons load
  non-empty, service worker registers and controls the page, offline app shell
  serves host and display after first load).
- Repository verification passed:
  - `npm run lint` — pass
  - `npm run typecheck` — pass
  - `npm run test:run` — pass (12 unit tests)
  - `npm run test:e2e` — pass (40 passed, 2 skipped)
- **No Slice 1 defects were found.**

## Advisory observations (non-blocking; carried forward, not defects)

- **INFO-1** — The shared `index.html` `<meta name="description">` contains the
  word "teacher". It is non-rendered SEO metadata in the SPA shell head, not
  projector-visible content and not private answer data. Consider when the real
  `PublicState` sanitizer lands (Slice 2). Not a leak.
- **INFO-2** — Root and Not-Found routes are not wrapped in an `ErrorBoundary`
  (only host and display are, by design). They are trivial static components
  with no throw path today. A top-level boundary is optional future hardening,
  outside Slice 1 scope.
- **INFO-3** — `vite preview` returns 404 for the base path without a trailing
  slash and serves `index.html` for non-hash deep paths. These are
  preview-server quirks that do not exist on real GitHub Pages (which redirects
  the no-slash case and 404s non-hash paths); they are irrelevant because the
  app is hash-routed and the browser only ever requests `index.html` at the
  base. Not an app defect.

## Application code changes

**None.** This reconciliation is documentation and receipts only; no application
behavior changed.

## Final disposition

All documented Slice 1 completion criteria are satisfied — merged implementation
(PR #1), CI green, successful Pages deployment, owner-observed live route
rendering, passing production-artifact adversarial QA, and passing repository
verification. **Slice 1 is Complete.** Slice 2 remains unstarted.
