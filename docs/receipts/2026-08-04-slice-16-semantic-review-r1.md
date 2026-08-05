# Slice 16 semantic review and ordinary repair R1

**Receipt status:** Immutable write-time evidence for
`AUTHORIZE-CQS-SLICE-16-PR40-SEMANTIC-REVIEW-ORDINARY-REPAIR-R1-1` /
`CQS-SLICE-16-PR40-SEMANTIC-REVIEW-ES-1`. Historical observations here are not
rewritten merely because later PR checks change. The original implementation
receipt
[`2026-08-04-slice-16-local-verification.md`](2026-08-04-slice-16-local-verification.md)
is preserved unchanged.

## Authorization and evidence identity

| Fact | Value |
| --- | --- |
| Authorization | `AUTHORIZE-CQS-SLICE-16-PR40-SEMANTIC-REVIEW-ORDINARY-REPAIR-R1-1` |
| Evidence state | `CQS-SLICE-16-PR40-SEMANTIC-REVIEW-ES-1` |
| Slice | 16 — Completed Summary Ledger & Compatible Reporting |
| Pull request | [#40](https://github.com/ricktron/classroom-quiz-show/pull/40) |
| Branch | `feat/slice-16-summary-ledger` |
| Exact authorized starting PR head | `16179fd2f68756059bf9c221a1d5a92e7490f462` |
| Exact PR base | `f92b65fa2d6619d9c2a4d09b5457f0976ff91079` |
| Review host | `Ricks-MacBook-Air.local` |
| User | `macdaddy` |
| HOME | `/Users/macdaddy` |
| Repository root | `/Users/macdaddy/Documents/Coding/Cursor Projects/classroom-quiz-show` |
| America/Chicago gate observation | `2026-08-04 22:31:50 CDT` |
| UTC gate observation | `2026-08-05 03:31:50 UTC` |

## Fresh exact-head gate (before mutation)

| Fact | Observation |
| --- | --- |
| `origin/main` | `f92b65fa2d6619d9c2a4d09b5457f0976ff91079` — matches exact PR base |
| Active checkout | `feat/slice-16-summary-ledger` at `16179fd…` |
| Working tree | clean; tracking `origin/feat/slice-16-summary-ledger` |
| PR #40 state | OPEN, MERGEABLE, mergeStateStatus CLEAN |
| PR #40 head | `16179fd2f68756059bf9c221a1d5a92e7490f462` — **exact match** |
| PR #40 base | `f92b65fa2d6619d9c2a4d09b5457f0976ff91079` — **exact match** |
| Reviews / threads | none / none |
| Pre-repair CI (head `16179fd…`) | Lint/typecheck/unit/build **success**; Playwright e2e **success** |
| Pre-repair Sonar (PR #40) | Quality Gate **passed** (separate surface) |

## Review inventory

Independently reviewed all **50** changed paths in
`f92b65f…...16179fd…`, plus required startup docs, ADR-013/015/016, Slice 15
receipts, the Slice 16 implementation receipt, and relevant pre-existing
persistence/public-state/sync/export/Final-recovery code. Owner policies A–G
were the comparison standard, not merely the delivery’s own tests.

## Findings

### Confirmed and repaired

| ID | Finding | Repair |
| --- | --- | --- |
| R1-01 | Mutable docs named stale heads (`890f42a…`, `b550bef…`), claimed pending verification / unknown PR, or instructed opening the Slice 16 PR | Reconciled README, STATUS, handoff, MVP-ARC, and ADR-016 to PR #40 / branch / unmerged / obtain-head-from-GitHub; original receipt historical heads left unchanged; this R1 receipt added |
| R1-02 | Game/class filters constrained the ledger table but not report grouping/rollups | One reporting selection from active filters applied before profile grouping and all rollups; empty filtered copy added; tests added |
| R1-03 | `unsupported-profile-version` with validated Summary V1 hid all detail | Bounded `SessionSummaryView` + prominent warning; excluded from aggregation/labels; tests added |
| R1-04 | Unknown V2 envelopes with non-V1 shapes could be classified corrupt | Outer envelope classifies on object/kind/numeric version only before V1 exact-key validation; tests added |
| R1-05 | List path did not verify `IndexedDB key = recordId` | `decodeCompletedSummaryForStoreKey` quarantines mismatches as corrupt; retention/label/delete behavior covered |
| R1-06 | Failed delete/clear cleared confirmation and selection | Success-only clear of confirmation/selection; failure tests added |
| R1-07 | Ledger refresh failures after durable mutation were ignored | Explicit stale-list messaging after save/retention/mutate when list refresh fails |
| R1-08 | Ledger rendered raw epoch numbers | Local human-readable `<time dateTime>` presentation |
| R1-09 | Exported `retrySaveCompletedAndClearActive` bypassed the write queue | Removed unsafe public helper; retries use `enqueueSaveCompletedAndClearActive` |
| R1-10 | Completion/ledger mutations allowed non-follower including `unknown` | Require positive `leadership === 'leader'` for completion save and ledger mutations |
| R1-11 | Multi-profile copy only compared later groups to group 1 | Profile identity line + separation reasons vs each prior group |
| R1-12 | Filters hid unsupported/corrupt rows with no quarantine | Separate always-visible quarantine section; filters do not hide it |
| R1-13 | Report tables lacked `scope`; long names/overflow weak | `scope="col"` on report headers; wrap/overflow CSS; quarantine/status text retained |

### Rejected / not material as stated

None of the authorized R1-01–R1-13 findings were rejected after code inspection.
Broader invariant review did not surface an additional blocker beyond those
repairs. The inherited Final mid-refresh recovery flake remains **out of scope**
and is **not** claimed repaired.

## Contract and version invariants (reconfirmed)

| Boundary | Version |
| --- | ---: |
| IndexedDB schema | **2** (`completedSummaries` only new store) |
| Public-state wire | **8** |
| Sync envelope | **2** |
| Game-file schema | **1** |
| Active-session wire | **1** |
| Session Summary | **1** |
| Ledger envelope | **1** |
| Competitive profile | **1** |

Atomic completed save + active cleanup, post-save retention, fail-closed unknown
versions, privacy exclusions, exact profile separation, and no ledger leakage
into public/display/sync/export paths remain intact.

## Changed paths (this repair lane)

Code/tests:

- `src/summary/completedSummary/codec.ts`
- `src/summary/completedSummary/codec.test.ts`
- `src/persistence/completedSummaries.ts`
- `src/persistence/completedSummaries.test.ts`
- `src/host/CompletedSummaryLedgerPanel.tsx`
- `src/host/CompletedSummaryLedgerPanel.css`
- `src/host/CompletedSummaryLedgerPanel.test.tsx`
- `src/host/useHostPersistence.ts`
- `tests/e2e/completed-summary-ledger.spec.ts`

Docs:

- `README.md`
- `docs/STATUS.md`
- `docs/handoff/CURRENT.md`
- `docs/plans/MVP-ARC.md`
- `docs/architecture/ADR-016-completed-summary-ledger-compatible-reporting.md`
- `docs/receipts/2026-08-04-slice-16-semantic-review-r1.md` (this file)

## Tests added / extended

- Codec: unknown V2 envelopes with extra/missing/changed fields; malformed kind/version
- Persistence: key-mismatch quarantine; retention/label/delete; queued retry path
- Panel: filter→report coupling; quarantine under filters; unsupported-profile detail; failed delete/clear; timestamps; multi-profile explanations
- Browser: filter-constrained reports; human-readable timestamps

## Local verification (first attempts observed this lane)

| Check | First-attempt result |
| --- | --- |
| `git diff --check` | **pass** |
| `npm run lint` | **pass** |
| `npm run typecheck` | **pass** |
| `npm run test:run` | **pass** — 2020 passed, 1 skipped |
| `npm run build` | **pass** |
| `npm run verify` | **pass** |
| `npx playwright test tests/e2e/completed-summary-ledger.spec.ts` | **pass** — 3/3 |
| `npx playwright test tests/e2e/session-summary.spec.ts` | **pass** — 12/12 |
| Inherited Final mid-refresh (`final-wager` grep) | **pass** on this first attempt (3/3) — **does not claim flake repaired** |
| `npm run test:e2e` | **pass** — 274 passed, 2 skipped |
| `npm run verify:all` | First combined attempt after prior full suites: **fail** with unrelated Vitest timeouts / worker contention (`SessionSummaryPanel`, `LocalInputHostPanel`) and, in an earlier overloaded e2e portion, non-Slice-16 Playwright timeouts. Equivalent first-attempt constituent sequence all **pass**: `lint` + `typecheck` + `test:run` (2020 passed) + `build` + `test:e2e` (274 passed). Slice 16 ledger/session-summary browser specs passed in every observation |

## Inherited Final flake disposition

Not intentionally repaired. A dedicated first-attempt pass during this lane does
**not** erase the historical CI first-attempt failures recorded in the
implementation receipt. No improvement claim is made.

## PR state at receipt authoring

| Fact | Value |
| --- | --- |
| PR | [#40](https://github.com/ricktron/classroom-quiz-show/pull/40) |
| State | open / unmerged |
| Branch | `feat/slice-16-summary-ledger` |
| Starting head | `16179fd2f68756059bf9c221a1d5a92e7490f462` |
| Repaired final head | recorded in the updated PR description and external final report after push (not embedded self-referentially here before the commit that creates it) |
| ADR-016 status | **Accepted for review** |
| Slice 16 status | **In review — unmerged** |
| Slice 17 | Planned / unauthorized |

## Explicit stop

**STOP BEFORE MERGE.**

Do not merge PR #40, enable auto-merge, begin Slice 17, begin Phase 3, activate
post-MVP arcs, resolve `CQS-OD-066`, implement completed-summary import/export,
or widen reporting/persistence beyond approved Slice 16 scope from this receipt.
