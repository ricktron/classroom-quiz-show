# Slice 4 — post-merge reconciliation

Immutable evidence record reconciling the merged Slice 4 (validation & import
pipeline) with observed CI, deployment, and local verification results. This
receipt is append-only: do not edit it after commit; write a new receipt if
facts change. The original Slice 4 implementation receipt
([`2026-07-24-slice-4-local-verification.md`](2026-07-24-slice-4-local-verification.md))
and all prior receipts are preserved unchanged.

- **Slice:** Slice 4 — Validation & import pipeline
- **Date:** 2026-07-25
- **Scope:** the canonical versioned JSON game-file format and the single
  Zod-based validation / normalization import pipeline that every import entry
  point converges on — the one trusted ingestion boundary through which
  untrusted content becomes a trusted `GameDefinition`. Structured, actionable
  errors; **no silent repair**. **No gameplay** (no board, categories, clues,
  prompts, answers, scoring, teams, timers, reveal) and **no persistence** — by
  design. The one registered round type remains the non-gameplay placeholder.
- **Environment:** GitHub (Actions CI, Pages deployment, SonarCloud) and a local
  sandbox (Node 22, Vitest jsdom, Playwright vs. the production `vite preview`
  build under `/classroom-quiz-show/`).

## Merge facts (directly observed from GitHub / git)

| Fact | Value |
| ---- | ----- |
| Pull request | #7 (`ricktron/classroom-quiz-show`) |
| Base | `main` at `349bff72f471c798df8a902a6a3c4c3eae2e17a5` (after merged Slice 3 reconciliation, PR #6) |
| Implementation commit | `d08f14064916ea443350e7da3fbf1e2ab2f10cf6` |
| Documentation commit | `b44b58576467860c1053b7a5d94d818fde15b98b` |
| Final reviewed head (accessor repair) | `8ce850c5794adc6d586784089b4ecd2c2b80226c` |
| Merge commit | `5295e83eda19b43eb7fd7764f063b94f2d55fd8f` (`5295e83`) |
| Merged by | ricktron |
| Merge timestamp | 2026-07-25T20:14:42Z (2026-07-25T12:14:42-08:00) |

The merge timestamp is **independently confirmed** from two sources: the git
committer/author date on `5295e83` (`2026-07-25T12:14:42-08:00`) and the GitHub
PR metadata (`merged_at: 2026-07-25T20:14:42Z`). The merge commit's parents are
`349bff72…` (base) and `8ce850c…` (final head), confirming both endpoints.

## Pre-merge check state — NOT fully green at merge

**The implementation was merged by the owner before every PR-head check had
concluded.** This is recorded plainly; it must not be summarized as "all checks
were green before merge."

Observed check-run completion times on the final head `8ce850c`, against the
20:14:42Z merge:

| Check (PR #7, head `8ce850c`) | Concluded | Conclusion | Relative to merge |
| --- | --- | --- | --- |
| SonarCloud Code Analysis | 2026-07-25T20:14:07Z | success | **before** merge |
| Lint, typecheck, unit tests, build | 2026-07-25T20:14:17Z | success | **before** merge |
| Playwright e2e | 2026-07-25T20:15:05Z | success | **after** merge (~23 s) |

So at the moment of merge, SonarCloud **and** the lint/typecheck/unit/build job
had reported success; **Playwright e2e was still running** and concluded success
approximately 23 seconds later. No PR check ultimately failed, but e2e had not
reported at the time the merge decision was taken.

> **Correction to an earlier in-session statement.** During the session it was
> stated that both the build and e2e jobs were still running at merge time. That
> was based on a status snapshot taken before those jobs finished. The recorded
> completion timestamps above show the build job had already concluded
> successfully; only Playwright e2e was outstanding. The table above is the
> accurate record.

### What the merge decision therefore relied on

Local verification of the exact merged tree, run before the push of `8ce850c`:

- `npm run verify:all` — **pass, exit 0**
- **253 unit tests passed** (20 files)
- **97 e2e tests passed**
- **2 intentional e2e skips** (see below)
- `git diff --check` — **clean**

The 2 e2e skips are the pre-existing offline app-shell test, which by design
runs only on the `desktop-1080p` project and is skipped on the two other
viewport projects. They are intentional project-scoping skips carried over from
Slice 1, **not** failures and **not** newly introduced by Slice 4.

## Post-merge CI on `main` (observed, `5295e83`)

Workflow run [`30173190720`](https://github.com/ricktron/classroom-quiz-show/actions/runs/30173190720) ("CI") — **completed, success**:

| Job | Conclusion | Completed |
| --- | --- | --- |
| Lint, typecheck, unit tests, build | success | 2026-07-25T20:15:29Z |
| Playwright e2e | success | 2026-07-25T20:16:23Z |

All steps within both jobs concluded success, including `Lint`, `Typecheck`,
`Unit tests`, `Production build`, and `Run Playwright tests`.

## Post-merge Pages deployment (observed, `5295e83`)

Workflow run [`30173190721`](https://github.com/ricktron/classroom-quiz-show/actions/runs/30173190721)
("Deploy to GitHub Pages") — **completed, success**, at 2026-07-25T20:15:31Z.

## Status of this evidence

Post-merge CI and the Pages deployment are **post-merge confirmation**, not
pre-merge evidence. They establish that the merged tree builds, typechecks,
lints, and passes the full unit and browser suites on `main`, and that the site
deployed successfully — but they were produced *after* the merge decision and
therefore did not inform it. The pre-merge evidence is the table in
"Pre-merge check state" plus the local verification run.

## SonarCloud

Observed on PR #7 (final head `8ce850c`): **SonarCloud Code Analysis — success;
Quality Gate passed; 0 security hotspots; 0.0% duplication on new code; 3 new
non-blocking issues.** The individual issues were not enumerated here (the
SonarCloud issues API requires authentication).

SonarCloud reports **0.0% coverage on new code** because this project does not
upload a coverage report to SonarCloud — unchanged since Slice 1. That figure is
**not** a statement that the new code is untested; the 253 unit tests and 97
browser tests are the coverage evidence.

No SonarCloud analysis of the post-merge `main` commit was independently
observed as part of this reconciliation, and none is claimed.

## Review-discovered defect and repair (observed)

A review of the implementation before merge identified an **accessor /
time-of-check-time-of-use (TOCTOU) hole in the untrusted-object safety scan**.

**The problem.** The scan's plain-object test inspected only an object's
prototype, so an own property defined as an **accessor** (getter or setter)
passed the scan, and the scan then read that property's value. Because a round's
`config` is validated by a `z.custom` schema, Zod returns the config **by
reference** rather than as a validated copy, and normalization re-reads the same
object afterwards to clone it. A getter could therefore return one value while
it was being inspected and validated, and a different value when normalization
read it at construction time — so the validation would describe a value that no
longer existed in the constructed definition. In short: property access occurred
outside a descriptor-safe inspection boundary.

**The repair.** Commit `8ce850c` fixed this **at the scan boundary**: before
reading any own property, the scan now inspects that property's descriptor and
rejects anything that is not a plain data property (a descriptor with no
`value`) as a `non-data-value` issue. Data has no accessors, so this closes the
class at the boundary rather than requiring every downstream reader to snapshot
defensively.

**Four tests** were added covering the defect and its repair: a getter inside a
round `config`; a setter-only property; a getter on the document root; and a
regression check that ordinary data properties still import successfully.

**Exploitability — stated no further than the evidence supports.** The defect was
**not reachable through the JSON text transport**, because `JSON.parse` cannot
produce accessor properties; it required a caller to pass a hand-constructed
object to the object-level entry point `importGameFromUnknown`. The tests
establish that such objects are now rejected. They do **not** establish that any
shipped adapter could have supplied one, and no shipped code path is known to
have been affected. The repair is defence-in-depth at the trust boundary the
slice exists to enforce, not remediation of a demonstrated exploit.

## Implemented architecture (as merged)

### Canonical JSON format

- `format: "classroom-quiz-show/game"` — exact string, the format discriminator.
- `schemaVersion: 1` — exact integer, the only implemented and tested version.
- **Supplied** game and round identifiers — validated, never generated, so
  re-importing one file always yields the same game.
- **Ordered round array** — array position *is* the canonical round order; the
  registry never influences it.
- **Strict canonical object shapes** at every level.

### One ingestion pipeline (`src/import/importGame.ts`)

`transport` → `json-parse` → `format` → `version` → `semantic` (document safety
scan) → `schema` → `semantic` (content validation) → `registry` →
`construction`.

Pasted JSON, the built-in samples, and tests all converge on it; the built-in
samples are JSON **text** precisely so they cannot bypass validation.

### Properties

- **Zod 4.4.3** — the only new runtime dependency.
- **Strict unknown-key policy** — unknown or misspelled keys are rejected with
  their exact path, never silently dropped.
- **No coercion, defaults, transforms, partial import, or silent repair** —
  anything that does not already match the canonical format fails.
- **Stable structured issue model** — **28 issue codes across 8 stages**, each
  issue carrying a machine-readable code, stage, exact document path, and an
  actionable message. Deterministic ordering; no stack traces.
- **Semantic content checks** — duplicate round IDs and blank (whitespace-only)
  titles are rejected.
- **Structural protections** — reserved keys (`__proto__`, `prototype`,
  `constructor`), non-data values, non-finite numbers, cycles, and excessive
  nesting depth, plus accessor properties per the repair above.
- **Registry-controlled config schemas** — each registered round type supplies
  exactly one config validation path; imported content can neither register a
  type nor supply a schema.
- **Imported unknown round types are rejected before session initialization** —
  not imported and deferred to gameplay.
- **Trusted Slice 3 in-memory unknown-type fail-closed behavior is preserved**
  and unchanged — a trusted in-memory definition may still *represent* an
  unsupported type, and the engine still fails closed on encountering one. The
  two rules are complementary: one governs trusted construction, the other
  untrusted ingestion.
- **Host-only paste harness** — textarea, Import button, and a structured result
  panel keeping "active game", "last attempted import", and "last import result"
  distinct.
- **A successful import enters state only through the existing
  `INITIALIZE_GAME` command** — there is no parallel initialization path.
- **Invalid imports cannot** mutate state, append events, change the revision,
  publish synchronization data, alter `PublicState`, or change the display. The
  import module imports no store, reducer, or sync symbol, so this is structural
  rather than only asserted.
- **`PublicState` remains wire version 2** — Slice 4 added no public field.
- **Raw JSON and validation details remain host-private** — never in the
  definition, session, event history, sync messages, `PublicState`, or display.
- **No executable imported code path** — `JSON.parse` only; never `eval`,
  `new Function`, or dynamic `import()`.
- **No Slice 5 gameplay.**

## Verification

### Local (observed on the implementation branch, after the accessor repair)

| Command | Result | Notes |
| --- | --- | --- |
| `npm ci` | pass | reproducible install |
| `npm run lint` | pass | ESLint flat config, no warnings |
| `npm run typecheck` | pass | `tsc -b --noEmit` |
| `npm run test:run` | pass | **253 unit tests passed**, 20 files |
| `npm run build` | pass | `tsc -b && vite build`; PWA precache generated |
| `npm run test:e2e` | pass | **97 passed, 2 skipped** |
| `npm run verify:all` | pass | exit 0 |
| `git diff --check` | pass | no whitespace/conflict markers |

- **Unit tests:** 253 passed (up from 123 at Slice 3; 249 before the accessor
  repair added 4).
- **e2e tests:** 97 passed, 2 intentional skips (up from 73 passed / 2 skipped).

> Local Playwright used `PLAYWRIGHT_CHROMIUM_PATH` to point at the sandbox's
> pre-provisioned Chromium (build 1194) because `@playwright/test@1.56` expects
> build 1228; this override is environment-only and is not committed. CI installs
> the matching browser.

### Post-merge on `main`

Exact observed check names and conclusions are tabulated in "Post-merge CI on
`main`" and "Post-merge Pages deployment" above: CI job **Lint, typecheck, unit
tests, build — success**; CI job **Playwright e2e — success**; **Deploy to
GitHub Pages — success**.

## Known limitations

- **One schema version** (`schemaVersion: 1`).
- **No migrations** — an older or newer version fails by design; a v2 will
  require a real, tested migration.
- **Paste-only transport.**
- **No file picker.**
- **No spreadsheet, CSV, or XLSX import.**
- **Character-count text size guard rather than byte count.**
- **The object-level path is protected by semantic bounds** (nesting depth,
  round/title/identifier limits) **rather than the text-size guard**, which
  applies only to the text entry point.
- **Duplicate JSON keys remain subject to `JSON.parse` last-key-wins behavior** —
  the pipeline validates the surviving value and cannot observe the earlier one.
  Documented behaviour, not a claimed defence.
- **The placeholder config schema remains intentionally minimal** (one `note`
  string). It proves the registry seam; it is not a preview of `category-board`.
- **No playable round.**
- **No persistence** — definitions and event history are in-memory only
  (Slice 8).
- **No cross-device synchronization** — same-browser BroadcastChannel only.

## Evidence-language note

Merge facts, check-run states, CI results, and the Pages deployment outcome
above were **observed** from GitHub (PR metadata, check runs, workflow runs) and
from git. Local verification was observed in the sandbox against the production
**build artifact** served by `vite preview` — **not** the live `github.io`
origin. The Pages deployment is recorded as a successful *workflow* outcome; no
post-merge behavioral testing of the live deployed site was performed as part of
this reconciliation, and none is claimed.

## Application code changes

**None.** This reconciliation is documentation and receipts only. No application
code, tests, dependencies, workflows, or runtime configuration changed. No
application behavior was changed by this reconciliation.

## Final disposition

Slice 4 is **Complete**: implementation merged (PR #7, merge commit `5295e83`),
post-merge CI on `main` green (both jobs success), Pages deployment successful,
SonarCloud Quality Gate passed on the final reviewed head with 0 security
hotspots, and local verification green (253 unit, 97 e2e passed / 2 intentional
skips, `verify:all` exit 0).

This disposition is recorded together with the explicit qualification above that
**Playwright e2e had not concluded at the moment of merge** and concluded
successfully ~23 seconds afterwards; the merge decision rested on local
`verify:all` plus the two checks that had already reported.

**Slice 5 (category-board round) remains unstarted and owner-gated.**
