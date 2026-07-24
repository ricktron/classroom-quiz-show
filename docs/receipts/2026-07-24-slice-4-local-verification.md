# Slice 4 — local verification (validation & import pipeline)

- **Date:** 2026-07-24
- **Slice / PR:** Slice 4 / implementation PR (opened at the end of this slice)
- **Branch:** `claude/slice-4-validation-import-pynvab`
- **Base `main`:** `349bff72f471c798df8a902a6a3c4c3eae2e17a5` (merge of PR #6,
  the Slice 3 post-merge reconciliation)
- **Environment:** local sandbox (Linux, Node 22, npm 10)

## Commands & results

| Command | Result | Notes |
| --- | --- | --- |
| `npm ci` | pass | reproducible install from `package-lock.json` |
| `npm install zod` | pass | one new runtime dependency: `zod@4.4.3` |
| `npm run lint` | pass | ESLint flat config, no warnings |
| `npm run typecheck` | pass | `tsc -b --noEmit` |
| `npm run test:run` | pass | **249 passed**, 20 files (was 123 / 13 at Slice 3) |
| `npm run build` | pass | `tsc -b && vite build` → `dist/`, PWA precache generated |
| `npm run test:e2e` | pass | **97 passed / 2 skipped**, 3 viewport projects (was 73 / 2) |
| `npm run verify:all` | pass | lint + typecheck + unit + build + e2e |
| `git diff --check` | pass | no whitespace errors |

> **Playwright browser override.** This sandbox's pre-provisioned Chromium is
> build 1194 while `@playwright/test@1.56` expects 1228, so the e2e runs used
> `PLAYWRIGHT_CHROMIUM_PATH=/opt/pw-browsers/chromium-1194/chrome-linux/chrome`.
> The override is passed **via the environment only** and is not committed. CI
> installs the matching browser and needs no override.

## Test additions (Slice 4)

| Suite | Tests | Covers |
| --- | --- | --- |
| `src/import/canonicalFormat.test.ts` | 30 | format identity, version policy, strict unknown keys, id/title rules, no coercion/defaults/repair/partial import |
| `src/import/jsonTransport.test.ts` | 15 | text transport, malformed/empty/oversized/non-object roots, no eval path, code-like strings imported as data, built-in samples through the pipeline, contained internal failure |
| `src/import/safety.test.ts` | 25 | `__proto__`/`prototype`/`constructor`, non-data values (function/symbol/bigint/`undefined`/`Date`/`Map`/`Set`/`RegExp`/class instance), non-finite numbers, cycles, depth, explicit truncation, array/object confusion, duplicate JSON keys |
| `src/import/errorModel.test.ts` | 18 | issue shape, multi-issue preservation, deterministic ordering, path formatting, registry integration (unknown type, per-type config schema, no mutation, duplicate registration, order independence) |
| `src/import/normalize.test.ts` | 10 | frozen output, branded ids, order, verbatim values, input not mutated, determinism, text/object convergence |
| `src/import/stateIsolation.test.ts` | 18 | no event / revision / state / sync / `PublicState` change on failure; `INITIALIZE_GAME`-only on success; replay + undo unchanged |
| `src/host/GameImportPanel.test.tsx` | 10 | host harness: load on success only, host-only issues, no stale success, no-session behaviour, built-in samples |
| `tests/e2e/import-pipeline.spec.ts` | 8 × 3 projects | paste valid/malformed/invalid/unknown-type in the real host UI; display updates only via sanitized state; invalid import causes no display change |

Existing Slice 1/2/3 suites (routing, PWA/offline, accessibility, responsive,
reducer/replay/undo/sync/leak, game/session/registry/unknown-type) all remain
green; `src/game/registry.test.ts` was updated only to supply the new required
`configSchema` on its fixture entry.

## Evidence

Final `verify:all` summary lines:

```
> eslint .

> tsc -b --noEmit

 Test Files  20 passed (20)
      Tests  249 passed (249)

✓ built in 1.60s
PWA v1.3.0  precache 16 entries

  2 skipped
  97 passed (1.1m)
```

The 2 skipped e2e tests are the offline app-shell test, which by design runs
only on the `desktop-1080p` project (carried over unchanged from Slice 1). There
are **no** skipped failing tests and no other intentional skips.

## Caveats

- **CI has not been observed for Slice 4.** The implementation PR was opened at
  the end of this slice; no GitHub Actions run had concluded at the time of
  writing. This is why Slice 4 is `In review`, not `Complete`.
- **Pages deployment is unchanged and not re-verified** — Slice 4 alters no
  deploy configuration.
- The e2e run used the environment-only Chromium override described above, so
  it exercised Chromium 1194 rather than Playwright's bundled 1228.
- These results are from this sandbox only. Owner-side verification of the live
  site is a separate step and is not claimed here.
