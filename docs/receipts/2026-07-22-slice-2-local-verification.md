# Slice 2 — local verification

Durable evidence for the Slice 2 (state & event core) implementation before
review. Only observed results are recorded here.

- **Date:** 2026-07-22
- **Slice / PR:** Slice 2 — State & event core / implementation PR (In review)
- **Branch:** `claude/slice-2-state-event-core-ycf9i8`
- **Base:** `main` at `b0e5913` (after the merged Slice 1 reconciliation, PR #2)
- **Environment:** local sandbox (Node 20, Vitest jsdom, Playwright vs. the
  production `vite preview` build under `/classroom-quiz-show/`)

## Commands & results

| Command | Result | Notes |
| --- | --- | --- |
| `npm ci` | pass | 545 packages, 0 vulnerabilities |
| `npm run lint` | pass | ESLint flat config, no warnings |
| `npm run typecheck` | pass | `tsc -b --noEmit` |
| `npm run test:run` | pass | 66 unit tests, 8 files |
| `npm run build` | pass | `tsc -b && vite build`; 67 modules; PWA precache 16 entries |
| `npm run test:e2e` | pass | 58 passed, 2 skipped (offline-shell runs once on desktop) |
| `npm run verify:all` | pass | full gate green |
| `git diff --check` | pass | no whitespace/conflict markers |

## Scope of evidence

- **Unit (Vitest).** Reducer/command handling and determinism; rejected/malformed
  commands leave state unchanged; event application incl. unknown-event fail-safe;
  replay determinism, empty replay, idempotent repeat; undo with no history,
  undo of a reversible event, audit history preserved after undo, repeated undo
  safety, irreversible events never targeted. Sanitizer: exact allow-listed
  output keys, private top-level and nested fields omitted, future/unknown
  private field does not leak, projection-failure fails closed, serialized public
  state free of forbidden terms/values. Transport: valid accept, malformed /
  unknown-version / unknown-type / non-object reject, stale ignored, duplicate
  safe, newer accepted, no-op degradation, cleanup stops delivery, and
  host-ignores-public-state (display cannot modify host).
- **Browser (Playwright, real BroadcastChannel, two tabs).** Host status change
  appears on the display; a display opened after the host catches up via
  `request-state`; display refresh resumes the subscription; the display is
  read-only and cannot modify host state; a malformed injected message neither
  crashes nor exposes data on the display; the display stays safe after the host
  tab closes. The pre-existing projector-leak, routing, PWA/offline, responsive,
  and accessibility suites remained green.

## Caveats

- **CI not yet observed for Slice 2.** GitHub Actions runs when the PR opens;
  this receipt records local results only.
- **Playwright browser override.** The sandbox's pre-provisioned Chromium is
  build 1194 while `@playwright/test@1.56` expects 1228, so e2e was run with
  `PLAYWRIGHT_CHROMIUM_PATH=/opt/pw-browsers/chromium-1194/chrome-linux/chrome`.
  This override is environment-only and is **not** committed; CI installs the
  matching browser.
- **In-memory only.** Event history is not persisted (durable persistence is
  Slice 8), so this does not exercise recovery.
- Evidence is local (build artifact under `vite preview`), not the live
  `github.io` origin.
