# ADR-022 — Backup / export / import foundations

- **Status:** Accepted. S04C-H3 is implemented on main at squash
  `8d5c22b1d6bcd14286b5c2c6e05ba9144ec7b415` (PR #82). This ADR does not
  make S04C terminal and does not authorize H4+.
- **Date:** 2026-09-18
- **Slice / tranche:** `CQS-REAL-MVP-S04C-H3-BACKUP-EXPORT-IMPORT-FOUNDATIONS`
- **Authorization:**
  `AUTHORIZE-CQS-REAL-MVP-S04C-H3-BACKUP-EXPORT-IMPORT-FOUNDATIONS-1`
- **Depends on:** [ADR-004](ADR-004-canonical-validation-import.md),
  [ADR-012](ADR-012-portable-export-round-trip.md),
  [ADR-013](ADR-013-local-persistence-recovery.md),
  [ADR-017](ADR-017-self-contained-portable-packs.md),
  [`GAME-ENGINE-BOUNDARIES.md`](GAME-ENGINE-BOUNDARIES.md),
  [`../CQS-PRODUCT-CONTRACT.md`](../CQS-PRODUCT-CONTRACT.md)
- **Supersedes:** nothing

## Context

Family direction §16 calls for teacher-facing aggregate durability:

```text
EXPORT ALL CQS DATA
IMPORT BACKUP
```

Per-game portable JSON (ADR-012) and `.cqs-pack` (ADR-017) already move one
Game. After S04C-H1/H2, aggregate backup/restore remained absent. Teachers still
lacked a local, offline way to take a durable copy of their library off-device
and restore it without accounts or cloud. That absence is the decision-time
context. The H3 implementation is now on main; current routing is the H3
terminal receipt, not this paragraph.

## Decision

### 1. New interchange format

Introduce a distinct, versioned backup format:

```text
format: classroom-quiz-show/backup
schemaVersion: 1
filename: classroom-quiz-show.backup.json
```

This is **not** the game file format, **not** the pack ZIP, and **not** the
private active-session wire format.

### 2. Backup versus single-game export

| Concern | Single-game export (existing) | Backup (this ADR) |
| --- | --- | --- |
| Teacher language | Export / Import game (or pack) | Download backup / Restore from backup |
| Unit | One Game | Library of saved Games + pack media |
| Session | Never | Never |

### 3. What is included (v1)

- Saved library Games: canonical `jsonText`, optional authoring draft JSON,
  library metadata (`savedAt`, `openedAt`, title, playable).
- Pack media assets stored in IndexedDB (`packMediaAssets`), encoded as base64
  with length, SHA-256, sniffed media type, and scope keys.

### 4. What is excluded (v1)

- Active Session event history / unfinished classroom runs
- Coordination / host-writer leases
- Completed session summaries (deferred; additive later)
- Sony Buzz mappings and keyboard prefs (device-local; deferred)
- Runtime PrivateState / PublicState / sync envelopes / caches

### 5. Untrusted-data safety

Backup files are **untrusted data**, never executable authority.

- Filename, extension, and self-declared version are insufficient.
- Pipeline: size guard → `JSON.parse` only → safety scan → format/version →
  strict Zod envelope → each game through `importGameFromJsonText` → media
  decode / sniff / SHA-256 → staged preview → confirmed apply.
- Fail closed on malformed, unknown fields, unsupported versions, duplicate
  ids, unreadable drafts, and media integrity failures.
- No parallel permissive import path; no `eval` / dynamic code.

### 6. Apply semantics

- Merge by `gameId`. Games absent from the backup are left alone.
- Conflicts require explicit teacher confirmation before any durable write.
- Apply writes `savedDefinitions` + `packMediaAssets` in one IndexedDB
  transaction when both are touched.
- Does not mutate active Session.
- Stale async / cancelled restore: abort without claiming success.
- Do **not** claim cross-tab rollback, download atomicity, or recovery of
  interrupted browser downloads beyond fail-closed import of incomplete files.

### 7. Privacy and Host/Display

- Backup files **contain classroom content** (questions, answers, drafts).
- UI is Home / Host-private only. Nothing is added to `PublicState` or Display.
- Teacher copy warns that the file holds classroom content and excludes
  unfinished sessions.

### 8. UX placement

Progressive disclosure on Home: **Backup & restore** — Download backup /
Choose backup file → preview → confirm replace when needed → restore.

### 9. Compatibility

- Preserve the canonical game import pipeline and pack-media store keys.
- Preserve Game versus Session distinction.
- Later additive backup sections (summaries, device prefs) require a deliberate
  schema change or additive version — not silent guessing in v1.
- No generalized migration infrastructure in H3.

## Consequences

- Teachers can download and restore a local library backup offline.
- S04C parent remains open; H3 is not terminal S04C and does not authorize H4+.
- Optional later local packaged restore smoke is evidence, not a product claim
  of this ADR alone.

## Explicit non-claims

- Not cloud backup, accounts, sync, or SaaS
- Not wipe-then-replace-all restore
- Not corrupt-import salvage UX
- Not S04D telemetry
- Not Windows physical / signing / release qualification
