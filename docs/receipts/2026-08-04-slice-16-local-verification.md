# Slice 16 local verification

**Receipt status:** Write-time implementation evidence for
`AUTHORIZE-CQS-SLICE-16-SUMMARY-LEDGER-IMPLEMENTATION-1` /
`CQS-SLICE-16-ES-1`. Historical observations in this receipt are not rewritten
merely because later PR checks change.

## Authorization and evidence identity

| Fact | Value |
| --- | --- |
| Authorization | `AUTHORIZE-CQS-SLICE-16-SUMMARY-LEDGER-IMPLEMENTATION-1` |
| Evidence state | `CQS-SLICE-16-ES-1` |
| Slice | 16 — Completed Summary Ledger & Compatible Reporting |
| Exact authorized base | `f92b65fa2d6619d9c2a4d09b5457f0976ff91079` |
| Branch | `feat/slice-16-summary-ledger` |
| Host | `Ricks-MacBook-Air.local` |
| User | `macdaddy` |
| HOME | `/Users/macdaddy` |
| Time zone / date | America/Chicago · 2026-08-04 (local verification evening) |
| UTC observation window | 2026-08-05 early UTC |

## Preflight (observed before mutation)

| Fact | Observation |
| --- | --- |
| `origin/main` after fetch | `f92b65fa2d6619d9c2a4d09b5457f0976ff91079` — **exact match** to authorized base |
| Working tree at start | clean on `main` |
| Existing Slice 16 branch/PR | **none** |
| Competing Slice 15 branches left untouched | `feat/slice-15-session-summary-contract`, `docs/slice-15-post-merge-reconciliation` |
| Open PRs at start | none |

## Implemented owner decisions A–G

- **A — Completion capture:** automatic completed-summary save plus deletion of
  `activeSessions/current` in one atomic transaction; visible failure and retry;
  failed durable save does not undo the in-memory completed game.
- **B — Retention:** newest 50 valid known-version records by `savedAt` then
  `recordId`; corrupt/unsupported records are not auto-deleted; retention runs
  after successful save as a separate transaction.
- **C — Deletion:** confirmed delete-one and confirmed clear-all; no undo;
  active recovery, saved definitions, and coordination untouched.
- **D — Class label:** optional host-private `classLabel` (max **80** chars);
  initially `null`; invalid input rejected without silent trim/coerce.
- **E — Team continuity:** exact competitive profile, canonical definition
  fingerprint, and ordered authored team IDs — names are display-only.
- **F — Report scope:** saved detail, ledger list, compatible game/team/class
  rollups, filters, sorting, incompatibility explanations; no accuracy/grades/
  duration/student inference.
- **G — Unknown versions:** retained, listed, excluded from aggregation,
  deletable; never silently migrated or reinterpreted.

## Architecture contracts

- Completed record: `classroom-quiz-show/completed-summary-record`, version **1**
- Competitive profile: `classroom-quiz-show/competitive-profile`, version **1**
- Summary payload: Session Summary Contract version **1**
- Fingerprint: SHA-256 over exact UTF-8 bytes of Slice 12
  `exportGameDefinition(...).jsonText` (64 lowercase hex); no third-party hash
  dependency; canonical JSON not stored in the ledger
- Compatibility: exact equality across every semantic profile field
- IndexedDB: database `classroom-quiz-show-persistence` version **1 → 2** adds
  `completedSummaries`; existing stores preserved
- Completion: authoritative transition detected via newly accepted
  `GAME_SESSION_ENDED` + session id idempotency; queued through
  `PersistenceWriteQueue` with active-session generation bump
- Privacy: ledger kinds, profiles, class labels, and reports stay host-private

## Version boundaries

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

## Changed-path inventory (pre-commit observation)

New:

- `src/summary/completedSummary/` (contracts, fingerprint, codec, retention,
  aggregation, tests)
- `src/persistence/completedSummaries.ts` (+ tests)
- `src/host/CompletedSummaryLedgerPanel.tsx` (+ css/tests)
- `tests/e2e/completed-summary-ledger.spec.ts`
- `docs/architecture/ADR-016-completed-summary-ledger-compatible-reporting.md`
- `docs/receipts/2026-08-04-slice-16-local-verification.md`

Modified (representative):

- persistence constants/adapters/results/activeSession/index
- `useHostPersistence` completion + ledger APIs
- `SessionSummaryPanel` reusable view + save-state banner
- `FoundationControls` mounting
- privacy/version tests; session-summary e2e wording
- `docs/STATUS.md`, `docs/handoff/CURRENT.md`, `docs/plans/MVP-ARC.md`, `README.md`

Exact final path/diff counts belong to the commit and PR head after commit.

## Local verification (exact)

| Check | Result |
| --- | --- |
| `git diff --check` | clean (exit 0) |
| `npm run lint` | pass (via `npm run verify`) |
| `npm run typecheck` | pass (via `npm run verify`) |
| `npm run test:run` | **2011 passed**, **1 skipped**, 100 files |
| `npm run build` | pass |
| `npm run verify` | pass |
| Targeted Playwright (`completed-summary-ledger` + `session-summary`) | **15 passed** (desktop / projector / mobile) |
| Full `npm run test:e2e` | **274 passed**, **2 skipped** |
| Components of `npm run verify:all` | all run and green locally (verify + build + full e2e) |

### Inherited Final mid-refresh flake (distinct evidence)

Command:

```bash
npx playwright test tests/e2e/final-wager.spec.ts \
  --grep "a refresh mid-Final resumes every committed wager"
```

| Attempt | Result |
| --- | --- |
| Isolated first attempt (3 projects) | **FAILED** on desktop-1080p, projector-720p, and mobile-host with received `"Not saved yet"` (expected `"Saved: 100"`) |
| Same test inside full `npm run test:e2e` | **PASSED** on all three projects |

Disposition:

- Failure mode matches the already-documented inherited flake symptom
  (`Not saved yet`).
- Slice 16 does **not** claim to repair the flake.
- Slice 16 does **not** claim the suite is flake-free.
- Local first-attempt failure and later full-suite pass are recorded as distinct
  evidence; CI retries remain separate.

## Evidence surfaces not claimed here

- GitHub Actions run IDs / conclusions (observe after PR open)
- SonarCloud quality gate (observe independently after PR open)
- Live-route verification on GitHub Pages
- Merge / post-merge state

## PR state

| Fact | Value |
| --- | --- |
| PR | [#40](https://github.com/ricktron/classroom-quiz-show/pull/40) |
| State at follow-up commit | open, non-draft, unmerged |
| Head at PR open | `890f42a2a20a3697fea13f9d1350d892cbff15ea` |
| Base | `f92b65fa2d6619d9c2a4d09b5457f0976ff91079` |

The initial implementation commit recorded that no PR number existed yet. This
follow-up records the observed open PR number without rewriting the earlier
preflight observation that no Slice 16 PR existed before delivery.

## Required stop

**STOP BEFORE MERGE.**

Next safe action after a review-ready PR exists: independent semantic review and
ordinary repair lane for the exact PR head. Do not merge, enable auto-merge,
start Slice 17, start Phase 3, activate post-MVP arcs, or resolve `CQS-OD-066`
from this receipt.
