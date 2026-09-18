# CQS-REAL-MVP-S04C-H3 — Backup / export / import foundations

## Identity

- **Slice:** `CQS-REAL-MVP-S04C-H3-BACKUP-EXPORT-IMPORT-FOUNDATIONS`
- **Parent:** `CQS-REAL-MVP-S04C-PRODUCT-SAFETY-RECOVERY-AND-COMPATIBILITY-UX`
- **Program:** `CQS-REAL-MVP-1`
- **Authorization:**
  `AUTHORIZE-CQS-REAL-MVP-S04C-H3-BACKUP-EXPORT-IMPORT-FOUNDATIONS-1`
- **Kind:** implementation receipt for an independently reviewable H3 PR.
  **Not** a merge. **Not** H4+. **Not** terminal S04C completion.
- **Date (UTC):** 2026-09-18
- **Repository:** `ricktron/classroom-quiz-show`
- **Status:** **DELIVERY CANDIDATE / NOT MERGED / NOT TERMINAL**
- **Exact authorized base:** `795f07b598c207d6e10c1142c2cff7c0d6f92b63`
- **Delivery branch:** `cursor/s04c-h3-backup-export-import-foundations-d906`
- **PR:** [#82](https://github.com/ricktron/classroom-quiz-show/pull/82)
- **Exact review head:** `bffc57860a0cc9bb17705507d046c640c6ee60e3`

## Starting provenance

| Fact | Observed |
| --- | --- |
| Exact authorized base `origin/main` | `795f07b598c207d6e10c1142c2cff7c0d6f92b63` |
| Working tree at preflight | clean |
| S04A / S04B / S04C-H1 / S04C-H2 | **TERMINALLY COMPLETE** |
| S04C parent | **ACTIVE / OPEN / NOT TERMINAL** |

## Root invariant

Teachers can download a durable local backup of saved Games (and pack media)
and restore from an untrusted backup file through a fail-closed validated path,
without accounts or cloud, without mutating unfinished Session state, and
without projecting backup content to the Display.

## Format

```text
format: classroom-quiz-show/backup
schemaVersion: 1
filename: classroom-quiz-show.backup.json
```

ADR: [`../architecture/ADR-022-backup-export-import-foundations.md`](../architecture/ADR-022-backup-export-import-foundations.md)

## Included / excluded

**Included:** library saved Games (`jsonText` + optional authoring drafts) +
pack media assets.

**Excluded:** active Session, coordination, completed summaries (later),
device prefs (later), runtime/PublicState/caches.

## Safety

Untrusted backup → transport → JSON.parse → safety scan → format/version →
strict Zod → canonical `importGameFromJsonText` per game → media integrity →
preview → confirm conflicts → single-transaction apply. Fail closed. No
parallel permissive import. Filename/extension insufficient.

## Teacher-facing UX

Home progressive disclosure: **Backup & restore** (`BackupRestorePanel`).
Teacher language. Privacy warning that the file holds classroom content.
Keyboard operable; `aria-live` status; confirm/cancel for replace.

## Explicit non-claims

- H3 **not** terminal / **not** merged by this receipt
- H4+ / S04D / S05 / S06 **not begun**
- No cloud backup, accounts, sync, or SaaS
- No wipe-then-replace-all restore
- No corrupt-import salvage UX
- No Windows physical / signing / release claims
- No owner-observed packaged restore smoke unless separately recorded
- BroadcastChannel / `usePublicState` baseline remains a pre-existing monitor
  item (NB-H2-02); not an H3 regression claim surface unless re-observed

## Changed files (implementation)

- `src/backup/*` (format, build, parse, apply, download, tests)
- `src/routes/BackupRestorePanel.*` + Home wiring
- `src/persistence/savedDefinitions.ts` (`listSavedDefinitionRecords`)
- `src/pack/packMediaPersistence.ts` (`listAllPackMediaAssets`) + pack index export
- `docs/architecture/ADR-022-backup-export-import-foundations.md`
- `docs/decisions/README.md`, `docs/STATUS.md`, `docs/handoff/CURRENT.md`
- `docs/plans/CQS-REAL-MVP-ARC.md`, `docs/plans/CQS-REAL-MVP-S04-FAMILY-DIRECTION.md`
- `docs/design/README.md`, `docs/design/CQS-UX-SURFACE-INVENTORY.md`
- this receipt

## Verification

Observed on this delivery candidate before PR open (re-observe on tip):

| Check | Result |
| --- | --- |
| `git diff --check` | **pass** |
| focused unit/component/privacy (`src/backup`, `BackupRestorePanel`) | **pass** (14 tests) |
| `npm run lint` | **pass** (pre-existing ThemeProvider react-refresh warnings only) |
| `npm run typecheck` | **pass** |
| `npm run build` | **pass** |
| focused Playwright `tests/e2e/backup-restore.spec.ts` (desktop-1080p) | **pass** |
| `npm run verify` (full unit suite) | **fail on pre-existing** `src/display/usePublicState.test.tsx` BroadcastChannel / MessageEvent baseline (NB-H2-02). Reproduced on clean base tip without H3 changes. **Not an H3 regression.** CI historically green on GitHub Actions Node 20; cloud agent Node also exhibits the baseline. |
| `CI=1 npm run verify:all` | **not claimed pass** here — full e2e suite not re-run beyond focused backup spec; BroadcastChannel baseline blocks local full `verify` |

Evidence classes remain distinct. No owner-observed packaged restore smoke was
run for H3. Windows physical remains S06.
