# ADR-018 — Spreadsheet authoring seed

- **Status:** Proposed (implementation on branch; unmerged)
- **Date:** 2026-08-08
- **Slice:** 20 — Spreadsheet Authoring Seed
- **Authorization:**
  `AUTHORIZE-CQS-SLICE-20-SPREADSHEET-AUTHORING-SEED-IMPLEMENTATION-1`,
  `AUTHORIZE-CQS-SLICE-20-SHEETJS-CE-0.20.3-DEPENDENCY-1`,
  `AUTHORIZE-CQS-SLICE-20-PR52-F1-F3-BOUNDED-REPAIR-1`,
  `AUTHORIZE-CQS-SLICE-20-PR52-F2-GENERALIZED-TRUST-GATE-REPAIR-1`
- **Depends on:** [ADR-004](ADR-004-canonical-validation-import.md),
  [ADR-005](ADR-005-category-board-round.md),
  [ADR-006](ADR-006-teams-and-scoring.md),
  [ADR-012](ADR-012-portable-export-round-trip.md),
  [ADR-014](ADR-014-final-wager-round.md),
  [ADR-017](ADR-017-self-contained-portable-packs.md),
  [`GAME-ENGINE-BOUNDARIES.md`](GAME-ENGINE-BOUNDARIES.md)
- **Supersedes:** nothing

## Context

Teachers and external authoring tools need a friendly spreadsheet path into
Classroom Quiz Show without weakening the single canonical importer. Canonical
JSON and `.cqs-pack` remain first-class. Spreadsheets are untrusted authoring
transport only.

## Decision

### 1. Purpose

Add the first safe teacher-facing spreadsheet-authoring path:

```text
.xlsx → preflight → SheetJS transport → CQS workbook adapter →
AuthoringDraft → diagnostics → teacher correction → explicit approval →
canonical schema-1 JSON → importGameFromJsonText → trusted GameDefinition →
optional existing Slice 19 pack export
```

### 2. Authority boundary

Forbidden:

- XLSX → `GameDefinition` directly
- XLSX → `INITIALIZE_GAME` directly
- `AuthoringDraft` → reducer / PublicState / sync / replay / pack builder
- a second spreadsheet validator replacing ADR-004

The existing strict canonical importer remains the only trusted game-definition
boundary. Preferred outcome: zero changes to `src/import/**`.

### 3. SheetJS CE 0.20.3 dependency

Exactly one workbook library:

```text
xlsx@https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz
```

- Version: **0.20.3**
- License: **Apache-2.0** (distributed with the package `LICENSE`)
- Not the stale npm registry `xlsx@0.18.5`
- Used only at the untrusted workbook transport edge
- SheetJS workbook/cell types are not the CQS authoring domain model

Existing `fflate@0.8.3` is reused for ZIP/container preflight. No second
spreadsheet library.

### 4. XLSX-only format

Supported artifact: `.xlsx`. Reject `.xlsm`, `.xls`, `.ods`, and other
containers. No VBA execution, Office Scripts, external data execution, formula
engine, remote fetch, or workbook automation.

### 5. Workbook format / version

```text
WORKBOOK_FORMAT = classroom-quiz-show/workbook
WORKBOOK_FORMAT_VERSION = 1
AUTHORING_DRAFT_VERSION = 1
```

Unknown future workbook/draft versions fail closed. Workbook-version differences
do not imply canonical schema migration.

### 6. Exactly two profiles

| Profile id | Sheets |
| --- | --- |
| `classic-board` | `CQS_META`, `INSTRUCTIONS`, `GAME`, `CLUES` |
| `board-plus-final` | above + `FINAL` |

No Team Choice, Buzzer Sprint, Funny Review, Survey Showdown, question-bank,
standards, or GCS workbook profiles.

### 7. `CQS_META`

Authoritative machine metadata sheet for:

- `format = classroom-quiz-show/workbook`
- `workbookFormatVersion = 1`
- `profile = classic-board | board-plus-final`

Hiding/protection is convenience, not security. Missing, duplicate, malformed,
or contradictory metadata fails closed. Filename is never authority.

### 8. Sheet contracts

`GAME`: Title, GameKey, optional ResponseSeconds, optional Team1Name…Team8Name.
Format 1 requires **exactly one** populated semantic data row on `GAME`.
Additional populated rows are blockers (`ambiguous-semantic-rows`); there is no
silent “first row wins” interpretation.

`CLUES`: one clue/row with CategoryOrder, Category, ClueOrder, Value, Prompt,
Answer, optional Alternate1…8, Notes, Multiplier.

`FINAL` (Board + Final only): Prompt, Answer, optional alternates/notes /
FinalRoundTitle. Format 1 requires **exactly one** populated semantic data row
when the profile requires `FINAL`. Additional populated rows are blockers
(`ambiguous-semantic-rows`). Compiler round order: `category-board` then
terminal `final-wager`.

Unknown sheets are ignored with an explicit warning and never treated as game
content.

### 9. Model-neutral instructions

Both templates include model-neutral external-authoring instructions for
teachers, external LLMs, and other tools. No provider-specific language. No
chain-of-thought requests. Universal LLM compatibility is not claimed.

### 10. Workbook limits / resource preflight

Centralized limits in `src/authoring/limits.ts`. Semantic limits reuse
canonical constants with identical meaning. Transport preflight (fflate)
enforces compressed bytes, entry count, advertised expanded sizes where
observable, and VBA-entry rejection before SheetJS parse. SheetJS adapt
additionally bounds sheets, columns, **represented worksheet row span**,
**represented range area (`rowCount × columnCount`)**, parsed cells, merges,
and raw cell string length. Row-span and range-area bounds constrain the
iteration/allocation domain **before** nested worksheet traversal begins;
non-empty parsed-cell budgets alone are not sufficient against sparse `!ref`
declarations. Do not claim an uncompressed pre-parse cap beyond what is
enforced.

### 11. Formula / macro policy

Semantic cells in `GAME`, `CLUES`, `FINAL`, and authoritative `CQS_META` must be
literals. Formula-bearing cells fail closed even when a cached value exists.
Macros/VBA are rejected. Generated templates require no formulas. Teacher text
written into workbooks uses explicit SheetJS text-cell semantics so
formula-leading strings remain literal.

### 12. Hidden-content policy

Only `CQS_META` may be intentionally hidden. Semantic sheets required for
compilation must not be hidden.

### 13. Deterministic identity strategy

Teachers do not author canonical IDs. Stable keys:

- `GameKey` → game id
- board/final round ids derived from game id
- `CategoryOrder` / `ClueOrder` → category and tile ids
- team order → team ids

No `Math.random`, `crypto.randomUUID`, timestamps, or row-number-alone identity.
IDs are sanitized into the existing canonical ID grammar; collisions fail
closed. Row sorting with unchanged order keys preserves identity.

### 14. AuthoringDraft version / domain

`AUTHORING_DRAFT_VERSION = 1`. Non-playable domain separate from
`GameDefinition`. Status model: `blocked` | `review_required` |
`ready_for_approval` | `approved`.

### 15. Located diagnostics

Bounded issue vocabulary with sheet / row / column / A1 / field / draft path /
optional canonical path. Never invent A1 provenance.

Diagnostic lifecycle by `AuthoringIssue.family` (durable authority distinction;
not a per-code preservation allowlist):

| Family | Role |
| --- | --- |
| `transport` / `workbook` / `cell` | Workbook-source diagnostics from workbook bytes/structure. Survive draft revalidation, unrelated in-app correction, and approval. Unresolved blockers require workbook correction + re-upload in workbook format 1. |
| `draft` | Current normalized-draft semantic diagnostics. Recomputed after in-app correction. |
| `canonical` | Compile/import diagnostics. Regenerated on later approval/import. |

Normalization or omission of malformed workbook input never converts an
unresolved source blocker into valid absence (invalid optional fields
normalized to `undefined`, and invalid clue rows omitted from
`AuthoringDraft`, retain their workbook-source blockers).

### 16. Correction model

Hybrid: bounded in-app correction for ordinary draft fields; workbook-source
diagnostics (`transport` / `workbook` / `cell`) require re-upload in format 1.
Approval and correction share one `preserveWorkbookSourceIssues` /
`isWorkbookSourceIssue` policy. No board designer, question bank, AI rewrite,
source-cell override tracking, or revision history in this seed.

### 17. Approval gate

Parsing success ≠ approval. Approval is explicit, game-level, and disabled while
blockers remain. The approval API itself is fail-closed: before compile, the
draft must include preserved workbook-source issues plus fresh draft semantic
issues; any unresolved blocker prevents `approveAndImportDraft` from compiling
or calling `importGameFromJsonText`. UI disabled state is not an authority
boundary. Approval does not auto-start gameplay.

### 18. Canonical compiler

Approved draft → exact schema-1 document JSON text. Classic Board emits one
`category-board` round. Board + Final emits board then terminal `final-wager`.

### 19. Mandatory importer re-entry

Only `importGameFromJsonText(...)` success yields trusted `GameDefinition`.

### 20. Game-loading boundary

After importer success, the host may offer the existing load action
(`INITIALIZE_GAME`). Failed import/approval mutates no active game, event log,
PublicState, sync, persistence, or pack media state.

### 21. Text-only media verdict

Workbook format 1 authors textual prompts only. Unsupported image/media columns
are blockers. JSON / pack image games remain unchanged.

### 22. No persistent drafts

No IndexedDB schema change. IndexedDB remains **3**. Drafts live only in current
host/application state.

### 23. Slice 19 pack reuse

After trusted `GameDefinition`, existing `exportGameDefinition` /
`buildPackFromDefinition` / pack writer may be offered. No workbook-specific
pack builder.

### 24. Failure atomicity

Any failed workbook/draft/compile/import attempt leaves runtime authority
unchanged.

### 25. Privacy / public-state non-impact

Authoring diagnostics, workbook bytes, and drafts are host-only and never enter
PublicState or sync.

### 26. Explicit post-MVP exclusions

No direct LLM API, provider integration, question bank, item-family IDs,
standards/GCS, embedded workbook media, additional profiles, persistent drafts,
schema/wire/sync/reducer changes, Sony Buzz work, audio, or release
qualification.

### 27. Consequences / extension seams

- Teachers gain Classic Board and Board + Final spreadsheet templates.
- Canonical JSON and pack paths remain available.
- Future workbook versions/profiles require new authorization and fail closed
  until implemented.
- SheetJS stays pinned to the authorized CE distribution.

## Consequences

Positive: friendly authoring without importer bypass. Negative: additional
dependency and host UI surface. Neutral: IndexedDB / public wire / sync /
canonical schema unchanged.
