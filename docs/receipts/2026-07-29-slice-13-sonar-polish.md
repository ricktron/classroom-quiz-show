# Slice 13 Sonar polish receipt

- **Slice ID:** `CQS-SLICE-13-PERSISTENCE`
- **Date:** 2026-07-29
- **Authorized base:** `3fd212994c0e8b651193460de633995fe80a25df`
- **Starting PR head:** `6bc174f19e0bb88452b368c92ea6271ed11a6071`
- **Branch:** `cursor/cqs-slice-13-persistence`
- **Worktree path:** `/Users/macdaddy/Documents/Coding/Cursor Projects/classroom-quiz-show-cqs-s13-persistence`
- **Pull request:** #27
- **Receipt type:** Sonar polish evidence for Slice 13 continuation
- **OADL contribution:** `OADL-S06-CQS-PERSISTENCE-PILOT`

## Preflight Observed

- Worktree existed on `cursor/cqs-slice-13-persistence`
- Local HEAD matched live PR #27 head `6bc174f19e0bb88452b368c92ea6271ed11a6071`
- PR #27 was open, non-draft, unmerged, targeting `main`
- PR base OID remained `3fd212994c0e8b651193460de633995fe80a25df`
- Primary checkout `main` and the Slice 13 worktree were clean before mutation

## Quality Gate Before Polish

Observed from SonarQube Cloud for PR #27:

- Quality Gate: **ERROR**
- `new_reliability_rating`: **4.0** (D; required ≤ 1 / A)
- `new_security_rating`: **3.0** (C; required ≤ 1 / A)
- `new_maintainability_rating`: **1.0** (A; OK)
- `new_bugs`: **2**
- `new_vulnerabilities`: **1**
- `new_code_smells`: **17**
- Issue search total: **20** open new-code issues

## Itemized Findings And Dispositions

| Rule | Type | File | Disposition |
| --- | --- | --- | --- |
| `typescript:S2871` ×2 | BUG / CRITICAL | `src/persistence/wire/sessionWire.ts` | TRUE POSITIVE — FIX |
| `typescript:S2245` | VULNERABILITY / MAJOR | `src/persistence/tabIdentity.ts` | TRUE POSITIVE — FIX |
| `typescript:S6671` ×5 | CODE_SMELL / MAJOR | `src/persistence/indexedDbAdapter.ts` | TRUE POSITIVE — FIX |
| `typescript:S3358` | CODE_SMELL / MAJOR | `src/host/PersistenceControls.tsx` | TRUE POSITIVE — FIX |
| `typescript:S6819` | CODE_SMELL / MAJOR | `src/host/PersistenceControls.tsx` | TRUE POSITIVE — FIX |
| `typescript:S8980` | CODE_SMELL / MINOR | `src/host/PersistenceControls.test.tsx` | TRUE POSITIVE — FIX |
| `typescript:S5906` | CODE_SMELL / MINOR | `src/host/useHostPersistence.test.tsx` | TRUE POSITIVE — FIX |
| `typescript:S3735` | CODE_SMELL / CRITICAL | `src/host/useSessionStore.ts` | TRUE POSITIVE — FIX |
| `typescript:S3776` | CODE_SMELL / CRITICAL | `src/host/useHostPersistence.ts` | TRUE POSITIVE — FIX |
| `typescript:S6571` ×2 | CODE_SMELL / MINOR | `adapter.ts`, `indexedDbAdapter.ts` | TRUE POSITIVE — FIX |
| `typescript:S7776` | CODE_SMELL / MINOR | `src/persistence/memoryAdapter.ts` | TRUE POSITIVE — FIX |
| `typescript:S4043` | CODE_SMELL / MAJOR | `src/persistence/savedDefinitions.ts` | TRUE POSITIVE — FIX |
| `typescript:S6582` | CODE_SMELL / MINOR | `src/persistence/wire/sessionWire.ts` | TRUE POSITIVE — FIX |
| `typescript:S3776` | CODE_SMELL / CRITICAL | `src/persistence/wire/sessionWire.ts` (`decodeEvent` complexity 96) | TRUE POSITIVE — DEFERRED |

Deferred note for `sessionWire` cognitive complexity: maintainability rating was already A; a large fail-closed decoder extract was judged higher risk than gate benefit in this polish loop. It does not drive Reliability D or Security C.

Gate-driving issues before polish:

- Reliability D from the two `S2871` bugs
- Security C from the `S2245` vulnerability

## Leased Paths Changed

- `src/persistence/tabIdentity.ts`
- `src/persistence/tabIdentity.test.ts` (new)
- `src/persistence/wire/sessionWire.ts`
- `src/persistence/wire/sessionWire.test.ts`
- `src/persistence/indexedDbAdapter.ts`
- `src/persistence/indexedDbAdapter.test.ts`
- `src/persistence/adapter.ts`
- `src/persistence/memoryAdapter.ts`
- `src/persistence/savedDefinitions.ts`
- `src/host/PersistenceControls.tsx`
- `src/host/PersistenceControls.css`
- `src/host/PersistenceControls.test.tsx`
- `src/host/useHostPersistence.ts`
- `src/host/useHostPersistence.test.tsx`
- `src/host/useSessionStore.ts`
- `docs/receipts/2026-07-29-slice-13-sonar-polish.md`

## Fixes Summary

- Key equality sorts now use `String.localeCompare`
- Tab ids use `crypto.randomUUID` / `crypto.getRandomValues` / monotonic fallback; never `Math.random`
- IndexedDB promise rejections always use `Error` (DOMException or fallback `Error`)
- Nested durability warning ternary extracted; recovery UI uses `<fieldset>` / `<legend>`
- Redundant test `act()` removed in favor of `waitFor`
- `void storeEpoch` replaced with remount-bound history memo
- Boot lease handling extracted to reduce cognitive complexity
- Minor maintainability cleanups (`Set.has`, separate `sort`, optional chaining, `unknown` union)

## Verification

| Command | Result | Notes |
| --- | --- | --- |
| `git diff --check` | **Pass** | Clean |
| Focused persistence/host unit suite | **Pass** | 45 passed; 1 skipped |
| `npm run verify` | **Pass** | lint + typecheck + unit |
| `npm run verify:all` | **Pass** | lint + typecheck + unit + build + e2e |

Exact counts on final `verify:all`:

- Unit (Vitest): **1604 passed**, **1 skipped**, 79 files
- E2E (Playwright): **235 passed**, **2 skipped**

Transient Playwright `test-results/` removed after verification. No unexplained generated artifacts retained.

## Non-Claims

- This receipt does **not** claim SonarCloud re-analysis has completed or that the quality gate is green until re-observed after push.
- This receipt does **not** claim Slice 13 is complete or merged.
- This receipt does **not** edit the immutable local-verification receipt, `docs/STATUS.md`, or `docs/handoff/CURRENT.md`.
- Public-state wire remains **7**; sync envelope remains **2**.
- No dependency change.
- **NOT MERGED.**
