# Slice 17 local verification — theme and design-token foundation

**Receipt status:** Write-time implementation evidence for
`AUTHORIZE-CQS-SLICE-17-THEME-TOKENS-IMPLEMENTATION-1` /
`CQS-SLICE-17-THEME-TOKENS-IMPLEMENTATION-ES-1`. Historical observations in this
receipt are not rewritten merely because later PR checks change. This receipt
does **not** mark Slice 17 Complete.

## Authorization and evidence identity

| Fact | Value |
| --- | --- |
| Authorization | `AUTHORIZE-CQS-SLICE-17-THEME-TOKENS-IMPLEMENTATION-1` |
| Evidence state | `CQS-SLICE-17-THEME-TOKENS-IMPLEMENTATION-ES-1` |
| Slice | 17 — Theme and Design-Token Foundation |
| Exact authorized base | `6b908d577a588a68f06775a6511e1da3aacc33f3` |
| Branch | `feat/slice-17-theme-tokens` |
| Host | `Ricks-MacBook-Air.local` |
| User | `macdaddy` |
| HOME | `/Users/macdaddy` |
| Time zone / date | America/Chicago · 2026-08-05 |
| UTC observation window | 2026-08-05T22:55Z |

## Preflight (observed before mutation)

| Fact | Observation |
| --- | --- |
| `origin/main` after fetch | `6b908d577a588a68f06775a6511e1da3aacc33f3` — **exact match** |
| Working tree at start | clean on `main` |
| Branch created | `feat/slice-17-theme-tokens` at authorized base |
| Open PRs at start | none |
| Competing `slice-17` / `theme` / `tokens` branches | none |
| Detached historical worktrees | present at Slice 16 SHAs; clean; do not own allowlisted paths |
| Canonical readiness spec | present at `docs/plans/CQS-PHASE-3-DESIGN-SYSTEM-READINESS.md` |

## Architecture summary

- Closed registry: exact IDs `default` and `high-contrast` only; `resolveThemeId`
  fails closed with no trim/case-fold/aliases.
- `ThemeProvider` inside `HashRouter` owns per-window presentation state; writes
  only `document.documentElement.dataset.theme`.
- Host native fieldset selector (Default / High contrast) below private-host
  banner; session-local; no persistence wording.
- Display launch: `#/display?theme=<validated-id>` via base-path-aware helper;
  destination independently validates; projector has no selector.
- Semantic tokens in `src/styles/themes.css`; temporary `--color-*` aliases;
  representative host/display CSS migrated.
- Binding tile-edge correction: opaque `#35d6e8` default edge (~3.63:1 on
  `#0f5fb0`), not translucent package border.
- No schema, public wire, sync, persistence, event, reducer, summary, export,
  package, or dependency change. No Slice 18 / Slice 22 work.

## Version boundaries (unchanged)

| Boundary | Version |
| --- | ---: |
| Public-state wire | **8** |
| Sync envelope | **2** |
| Canonical game-file schema | **1** |
| Private active-session wire | **1** |
| IndexedDB schema | **2** |
| Session Summary contract | **1** |
| Completed-summary ledger envelope | **1** |
| Competitive profile | **1** |

## Changed paths (allowlist subset)

New:

- `src/theme/themeRegistry.ts`
- `src/theme/themeRegistry.test.ts`
- `src/theme/ThemeProvider.tsx`
- `src/theme/ThemeProvider.test.tsx`
- `src/theme/themeIsolation.test.ts`
- `src/styles/themes.css`
- `src/routes/HostRoute.test.tsx`
- `tests/e2e/theme-system.spec.ts`
- `docs/receipts/2026-08-05-slice-17-theme-tokens-local-verification.md`

Modified: allowlisted App/routes/global CSS, host CSS set, display CSS/tests,
`paths.ts` (+ tests), `canonicalFormat.test.ts`, `routes.spec.ts`,
`projector-safety.spec.ts`.

Optional `src/test/themeFixtures.ts` was **not** created (inline/existing
fixtures remained clearer). `FinalWagerDisplay.tsx` was not mutated (CSS-only
pulse-floor change).

## Local verification (exact)

| Check | Result |
| --- | --- |
| `git diff --check` | clean (exit 0) |
| Focused Vitest (`src/theme`, paths, HostRoute, canonicalFormat, TeamScoreboard) | pass |
| `npm run lint` | pass with **3 warnings** (`react-refresh/only-export-components` on `ThemeProvider.tsx` helper/hook exports) |
| `npm run typecheck` | pass |
| `npm run test:run` | **2084 passed**, **1 skipped**, 104 files |
| `npm run build` | pass |
| `npm run verify` | pass |
| Focused Playwright `theme-system` + `projector-safety` + `routes` | **69 passed** |
| Full `npm run test:e2e` / `verify:all` e2e | **296 passed**, **2 skipped**, **2 failed**, **6 did not run** |

### Playwright totals (full e2e observation)

| Metric | Count |
| --- | ---: |
| Passed | 296 |
| Failed | 2 |
| Skipped | 2 |
| Did not run | 6 |
| Local retries | 0 (`retries: 0` when `CI` unset) |

Failed tests (both projects observed across runs; signature identical):

```text
tests/e2e/final-wager.spec.ts
a refresh mid-Final resumes every committed wager
Expected: Saved: 100
Received: Not saved yet
```

### Inherited Final-flake disposition

- **Not repaired** (contract forbids repair).
- Signature matches the known inherited flake exactly.
- No evidence Slice 17 is causal (failure is persistence/recovery mid-Final;
  theme paths were not exercised by that test).
- Distinct projects failed across runs (desktop-1080p / mobile-host /
  projector-720p) with the same assertion signature.
- Theme-system suite is green when run focused (27/27 across 3 projects).

## Tile-edge correction

- Default `--border-tile: #35d6e8`; `--edge-tile: inset 0 0 0 1px #35d6e8`.
- Measured contrast of `#35d6e8` on `#0f5fb0` ≈ **3.63:1** (unit + e2e proofs).
- Rejected translucent `rgba(53, 214, 232, 0.55)` tile border is absent from
  `--border-tile` / `--edge-tile`.

## Explicit non-claims

- Slice 17 is **not** Complete (no merge).
- No WCAG certification, physical-projector acceptance, or Slice 22 qualification.
- No Score Column / Strip / Deck / Nexus / Slice 18 composition.
- No theme field in game files, public state, sync, persistence, events, or
  summaries.
- Named-window reopen under `noopener` opens a fresh browsing context; e2e proves
  each launch carries the current validated theme query (not same-window hash
  mutation under `noopener`).

## PR identity

| Fact | Value |
| --- | --- |
| PR | [#44](https://github.com/ricktron/classroom-quiz-show/pull/44) |
| Base branch | `main` |
| Head branch | `feat/slice-17-theme-tokens` |
| Exact head SHA (implementation commit) | `cf8e2f75b4e9a219f9f745d9b35aa53a6c434c34` |
| Draft | no |
| Merged | no |
| Auto-merge | off (must remain off) |

**STOP BEFORE MERGE.** No merge, branch deletion, or worktree cleanup performed by the executor.
