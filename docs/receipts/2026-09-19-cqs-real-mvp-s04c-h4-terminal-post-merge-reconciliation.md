# CQS REAL MVP S04C-H4 — terminal post-merge reconciliation

## Identity

- **Program:** `CQS-REAL-MVP-1`
- **Parent:** `CQS-REAL-MVP-S04C-PRODUCT-SAFETY-RECOVERY-AND-COMPATIBILITY-UX`
- **Slice:** `CQS-REAL-MVP-S04C-H4-CORRUPT-IMPORT-SALVAGE-UX`
- **Reconciliation authorization:**
  `AUTHORIZE-MERGE-CQS-REAL-MVP-S04C-H4-POST-MERGE-CI-REPAIR-PR85-F9DB4C9-1`
  (repair merge + bounded post-merge H4 terminal documentation)
- **Kind:** docs-only terminal post-merge canon reconciliation
- **Date (America/Chicago):** 2026-09-19
- **Repository:** `ricktron/classroom-quiz-show`
- **Exact reconciliation base / current main:**
  `3cd5e3a0f884f234b03425fd169e5e495fa1a147`

This receipt records already-observed H4 implementation merge, the first
post-merge CI failure, the repair merge, and post-repair CI on exact main.
It does **not** rewrite the historical H4 implementation closeout or the
post-merge CI reconciliation. It does **not** make S04C terminal. It does
**not** name or authorize further S04C implementation. It does **not**
predict this receipt's own delivery PR or squash SHA.

## Implementation merge (PR #84)

| Fact | Observed |
| --- | --- |
| Implementation PR | [#84](https://github.com/ricktron/classroom-quiz-show/pull/84) |
| Accepted reviewed PR head | `281fd1873d8a56193471b659a817b61d0b968ed5` |
| Squash sole parent | `f5fcd5b77031cccdc5195eace803003f073d3658` |
| Merge method | squash |
| Squash merge | **SUCCESS** (merged 2026-09-19T19:19:19Z) |
| Exact implementation squash | `2c484a2d0ce73fa4f52717773e93fb3ad1e917ef` |
| Accepted PR-head tree | `c000ec9f3f30b587b778e9a0526a8f36bfe3fe80` |
| Squash tree | `c000ec9f3f30b587b778e9a0526a8f36bfe3fe80` |
| PR-head tree vs squash tree | **EXACT MATCH** |
| PR #84 after merge | **MERGED** |

Because this was a squash merge, the accepted PR head is **not** required to
be an ancestor of `main`. Tree equality is the composition proof.

The historical implementation closeout remains at delivery-candidate wording.
That file was not rewritten.

## First post-merge CI failure

On implementation squash / then-`main`
`2c484a2d0ce73fa4f52717773e93fb3ad1e917ef`:

| Workflow | Run ID | Conclusion |
| --- | --- | --- |
| CI | [`35463981821`](https://github.com/ricktron/classroom-quiz-show/actions/runs/35463981821) | **FAILURE** |
| Desktop artifacts | [`35463981802`](https://github.com/ricktron/classroom-quiz-show/actions/runs/35463981802) | **SUCCESS** |
| Deploy to GitHub Pages | [`35463981827`](https://github.com/ricktron/classroom-quiz-show/actions/runs/35463981827) | **SUCCESS** |

CI job `Lint, typecheck, unit tests, build` (`105952727786`) **failed**.
CI job `Playwright e2e` (`105952727953`) **succeeded** on the same run.
The unit failure was in `src/routes/HomeRoute.test.tsx`: the test expected
`The previous playable game was kept` and observed the legitimate
in-progress status `Saving the usable parts…`.

Disposition: **TEST_SYNCHRONIZATION_DEFECT**. Production Keep behavior was
not the defect. There was no rerun that turned this failure green. The
repair is a separate merge, recorded below.

## Repair merge (PR #85)

| Fact | Observed |
| --- | --- |
| Repair PR | [#85](https://github.com/ricktron/classroom-quiz-show/pull/85) |
| Accepted reviewed PR head | `f9db4c950699b89d5ff33b088fa74ff5cd1df1a1` |
| Base / squash sole parent | `2c484a2d0ce73fa4f52717773e93fb3ad1e917ef` |
| Independent exact-head review | **ACCEPT CANDIDATE** |
| Owner merge authorization | `AUTHORIZE-MERGE-CQS-REAL-MVP-S04C-H4-POST-MERGE-CI-REPAIR-PR85-F9DB4C9-1` |
| Merge method | squash (`gh pr merge --squash --match-head-commit`) |
| Auto-merge | not enabled |
| Squash merge | **SUCCESS** (merged 2026-09-19T20:43:52Z) |
| Exact repair squash / current main | `3cd5e3a0f884f234b03425fd169e5e495fa1a147` |
| Parent count | **1** |
| Accepted PR-head tree | `fa82d1c56c0ef8b2bbffcc7c70c5f39aa6d04511` |
| Squash tree | `fa82d1c56c0ef8b2bbffcc7c70c5f39aa6d04511` |
| PR-head tree vs squash tree | **EXACT MATCH** (`git diff --name-only` empty) |
| Files vs implementation squash | `src/routes/HomeRoute.test.tsx`, `docs/CQS-S04C-H4-POST-MERGE-CI-RECONCILIATION.md` |
| Production files | unchanged by PR #85 |
| PR #85 after merge | **MERGED** |

The repaired test holds the `savedDefinitions` transaction, asserts the
in-progress sentence `Saving the usable parts…` and that conflicting
controls are disabled, then waits until the status reports `The previous
playable game was kept` and the saving sentence is gone. No arbitrary
sleep, no global timeout increase, and no weakened library assertion.

## Pre-merge evidence (exact accepted repair head)

On `f9db4c950699b89d5ff33b088fa74ff5cd1df1a1`:

| Workflow | Run ID | Conclusion |
| --- | --- | --- |
| CI | [`35466114443`](https://github.com/ricktron/classroom-quiz-show/actions/runs/35466114443) | **SUCCESS** |
| Desktop artifacts | [`35466114481`](https://github.com/ricktron/classroom-quiz-show/actions/runs/35466114481) | **SUCCESS** |

CI jobs: Lint, typecheck, unit tests, build **SUCCESS** (`105958658615`);
Playwright e2e **SUCCESS** (`105958658449`). Desktop jobs: Desktop unit +
Electron shell **SUCCESS** (`105958684240`); Package unsigned macOS
**SUCCESS** (`105958684394`); Package unsigned Windows **SUCCESS**
(`105958684449`). SonarCloud Code Analysis **SUCCESS** (`105958700557`).
Pages does not run on pull requests.

## Post-repair evidence (exact squash/main)

Reconfirmed on `3cd5e3a0f884f234b03425fd169e5e495fa1a147`. Every check run
on that commit concluded **success**.

| Workflow | Run ID | Conclusion | URL |
| --- | --- | --- | --- |
| CI | `35468282334` | **SUCCESS** | https://github.com/ricktron/classroom-quiz-show/actions/runs/35468282334 |
| Desktop artifacts | `35468282344` | **SUCCESS** | https://github.com/ricktron/classroom-quiz-show/actions/runs/35468282344 |
| Deploy to GitHub Pages | `35468282340` | **SUCCESS** | https://github.com/ricktron/classroom-quiz-show/actions/runs/35468282340 |

CI jobs: Lint, typecheck, unit tests, build **SUCCESS** (`105964513277`);
Playwright e2e **SUCCESS** (`105964513389`). Desktop jobs: Desktop unit +
Electron shell **SUCCESS** (`105964513324`); Package unsigned macOS
**SUCCESS** (`105964513450`); Package unsigned Windows **SUCCESS**
(`105964513337`). Pages: Build production bundle **SUCCESS**
(`105964513514`); Deploy **SUCCESS** (`105964614039`). SonarCloud Code
Analysis **SUCCESS** (`105964749024`). All three workflow runs' `headSha`
is `3cd5e3a0f884f234b03425fd169e5e495fa1a147`.

This docs tranche did not re-run local `npm run verify` or
`npm run verify:all`. Those suites are not claimed from this receipt.

## H4 behavior now on main

Observed from the merged implementation tree plus the repair diff, not
from pull-request prose alone. PR #85 changed the test and the
reconciliation note only.

- Host Home salvage review for malformed but safely inspectable
  `classroom-quiz-show/game` `schemaVersion` **1** content. Nothing is
  written until the teacher chooses **Keep usable parts**.
- Keep stores an unfinished `AuthoringDraft`. Missing academic meaning is
  not invented. Missing or non-integer point values use
  `valueAuthored: false`. Placeholder `0` is not an authored value.
  Teacher repair is required for missing content.
- Canonical validation remains the playable-Game gate. Unsafe, unsupported,
  unknown-version, and unknown-round content continues to fail closed.
  Session blobs are not imported as Session state. Portable-pack salvage
  is not part of H4.
- When an unfinished replacement does not compile, the previous playable
  Game is retained and the status says so.
- While persistence is in flight, the status says `Saving the usable
  parts…` and conflicting actions stay disabled. After a successful save,
  durable-state copy matches what was stored.
- Game and Session stay distinct. H3 backup behavior is unchanged.
- Salvage review is Host-private. It is not published to projector state.

## Known LOW

After a successful Keep, the collapsed **More detail about this file**
content may still retain stale wording that says nothing was saved. The
primary status line reports the correct durable outcome.

This finding was known before the implementation merge, was accepted as
**LOW**, was not part of PR #85, and is not repaired by this receipt. It
is not promoted into a successor tranche by this file.

## Terminal determination

- PR #84 merged at the accepted implementation head, with matching trees.
- The first post-merge unit failure was classified
  **TEST_SYNCHRONIZATION_DEFECT** and repaired.
- PR #85 merged at the accepted repair head, with matching trees, and did
  not change production files.
- Required post-merge workflows on the repair squash are green.
- No material H4 product regression was observed in those workflows.
- The accepted LOW remains recorded and unrepaired.

```text
CQS-REAL-MVP-S04C-H4-CORRUPT-IMPORT-SALVAGE-UX:
TERMINALLY COMPLETE

S04C parent:
ACTIVE / OPEN / NOT TERMINAL

further S04C implementation:
NOT AUTHORIZED by this receipt

S04D / S05 / S06:
NOT AUTHORIZED
```

Local qualification for H4 remains **NONE**.

## Evidence distinctions (nonclaims)

Do **not** claim from H4:

- local / physical hardware qualification (**NONE** / **NOT RUN**);
- physical projector qualification;
- physical screen-reader qualification;
- controller hardware qualification;
- Windows physical qualification (NOT RUN; S06);
- signing or notarization;
- release readiness;
- terminal S04C completion;
- further S04C implementation begun or named;
- repair of the accepted collapsed-detail LOW.

Keep evidence classes distinct:

| Class | H4 status |
| --- | --- |
| unit/component salvage tests | covered on the repair squash (post-merge CI unit job **SUCCESS**) |
| Playwright e2e | covered on the repair squash (post-merge Playwright **SUCCESS**) |
| Electron thin-shell tests | covered on the repair squash (Desktop artifacts **SUCCESS**) |
| unsigned macOS packaging | SUCCESS on the repair squash |
| unsigned Windows packaging | SUCCESS on the repair squash |
| Pages | SUCCESS on the repair squash |
| SonarCloud | SUCCESS on the accepted repair head and again on the repair squash |
| first post-merge unit job | **FAILURE** on the implementation squash; not the final evidence |
| local / physical HID / projector / screen reader | **NOT REQUIRED / NOT RUN** |
| Windows physical | **NOT RUN** |

## Remaining S04C gap map (merged-truth adjudication)

| Family | State after H4 | Notes |
| --- | --- | --- |
| Safe startup / unified Session recovery | **IMPLEMENTED / TERMINAL (H1)** | unchanged |
| Sanitized diagnostics (Copy Diagnostic Report) | **IMPLEMENTED / TERMINAL (H2)** | unchanged |
| Backup / export / restore foundations | **IMPLEMENTED / TERMINAL (H3)** | unchanged by H4 |
| Corrupt-import recovery / salvage UX | **IMPLEMENTED / TERMINAL (H4)** | Host-only JSON salvage on main; accepted collapsed-detail LOW remains |
| Schema / version compatibility contracts | **PARTIAL** | Backup schema **1** exists; no migration / rollback UX lane |
| Migration / rollback safeguards | **DEFERRED until schema change** | unchanged |
| Destructive-action safety | **PARTIAL** | unchanged by H4 |
| Display / projector / sleep resilience | **PARTIAL** | unchanged by H4 |
| Live-follower PublicState publication | **OPEN / DEFERRED** | unchanged by H4 |
| Support-oriented product hardening | **PARTIAL** | broader support path remains open (incl. S04D, not authorized) |

## Recommended next owner action (planning only)

This reconciliation does **not** authorize the next S04C implementation
cut and does **not** name it. Rick should run a **fresh read-only
reconciliation** before any further S04C work.

## Nonclaims

- S04C parent is **not** terminal.
- S04D / S05 / S06 remain unauthorized.
- Implementation merge of PR #84, the first CI failure, repair merge of
  PR #85, and this terminal documentation are distinct evidence stages.
- This receipt does not predict its own squash SHA.
