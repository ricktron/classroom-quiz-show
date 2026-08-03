# LLM and Spreadsheet Authoring Arc

- **Document id:** `CQS-PLAN-AUTHORING-ARC`
- **Slice:** `CQS-PLAN-S01` (planning-only) · **Date:** 2026-08-03
- **Status:** Explanatory planning view for `CQS-ARC-AUTHORING` —
  **authorizes no implementation**

Domain view of the first post-MVP arc (`CQS-OD-080`). Canonical decisions:
[`../decisions/EXPANDED-VISION-OWNER-DECISIONS.md`](../decisions/EXPANDED-VISION-OWNER-DECISIONS.md)
(`CQS-OD-041`…`CQS-OD-052`, `CQS-OD-058`); architecture boundary:
[`../decisions/ROADMAP-AMENDMENT-002-expanded-gameplay-vision.md`](../decisions/ROADMAP-AMENDMENT-002-expanded-gameplay-vision.md)
clauses `CQS-RA2-AUTHORING-01` and `CQS-RA2-QUESTION-ID-01`; deferral
dossier: `CQS-OPP-SPREADSHEET-LLM-AUTHORING` and neighbors in
[`POST-MVP-OPPORTUNITY-AND-TRIGGER-REGISTER.md`](POST-MVP-OPPORTUNITY-AND-TRIGGER-REGISTER.md).

**Nothing in this pipeline exists.** The current implementation imports
canonical JSON by paste only; MVP Slice 17 (unstarted) owns basic
spreadsheet-import convenience, and this arc builds on whatever Slice 17
delivers.

## 1. Preferred operator experience (§12 direction)

1. Choose a preset.
2. Download a preset-specific workbook.
3. Upload the workbook and class materials to an LLM (any capable model —
   the design is model-neutral).
4. Receive a populated workbook.
5. Import it into CQS.
6. Review warnings.
7. Approve and start the game.

The workbook is a **friendly authoring format**. Canonical CQS JSON
remains the strict runtime and interchange format — permanently
(`CQS-OD-049`, `CQS-RA2-AUTHORING-01`).

## 2. Conceptual pipeline (required shape)

```
source files + embedded-instruction workbook
  → LLM-populated XLSX or CSV
  → spreadsheet parser
  → structured validation and review
  → universal content-draft model
  → canonical CQS JSON
  → existing strict import boundary (ADR-004 — unchanged)
```

Binding properties:

- **One importer.** The parser feeds the existing canonical pipeline; no
  second validation path, no workbook-shaped runtime state.
- **Fail closed.** Malformed workbooks produce structured, located
  diagnostics in the established `ImportIssue` style; nothing is silently
  repaired.
- **Teacher approval gates playability** at the game level after warnings
  review; invalid or blocked content cannot become playable
  (`CQS-OD-044`).
- **Model-neutral.** No provider dependency; structured-output generation
  against a schema is an established vendor-supported pattern (research
  finding `CQS-RF-LLM-01`), but CQS validates everything itself and
  trusts nothing.
- Spreadsheet-to-quiz import with a downloadable template is established
  product practice (Kahoot, Blooket, Wayground — `CQS-RF-IMPORT-01`),
  supporting the workbook-first UX; those products' templates are flat
  single-tab quiz lists, which is why CQS designs richer preset-specific
  shapes rather than copying them.

## 3. Preset-specific workbook shapes (§12.1)

One universal internal content model; small preset-specific templates
(`CQS-OD-049`). Planned at minimum: **Classic Board**, **Board + Final**,
**Team Choice**, **Buzzer Sprint**, **Funny Review**, **Survey Showdown**
workbooks.

Possible visible tabs: `GAME` · `CLUES` · `SOURCES` · `TEAM_IDENTITIES` ·
`FINAL` · `SURVEY_ROUNDS` · `SURVEY_ANSWERS` · `QUALITY_REPORT`.

The normal workbook stays approachable; advanced metadata may be hidden,
protected, or generated automatically. A workbook never carries
executable content — it is data, subject to the same
imported-content-is-data invariant as everything else.

## 4. Embedded LLM instructions (§12.2)

The workbook or accompanying authoring packet includes: the exact
assignment; selected preset; target audience and course; desired game
length; difficulty distribution; source-grounding rules (default:
uploaded-sources-only, `CQS-OD-041`); humor profile (default Light,
`CQS-OD-048`); item-writing and distractor-writing rules; the accepted
output structure; one valid example; one invalid example; a final QA
checklist; and the instruction to return only the required artifact.

The model may return **`insufficient-source-evidence`** for any item
instead of fabricating content (§12.5).

## 5. Question and item identity (§12.3)

Separated concepts (`CQS-RA2-QUESTION-ID-01`, `CQS-OD-058`):

| Concept | Meaning |
| --- | --- |
| Item-family id | Durable concept identity across clues, revisions, adaptations, test items |
| Question content id | One authored question |
| Question revision | A substantial content change creates a new revision |
| Game placement | Round, category, value, modifier — where a revision sits in one game |

Moving a clue to another slot never creates a revision; a substantial
content change does. Placement identity today is ADR-005's stable tile
id; family/revision identity arrives as additive metadata under the
recorded schema-migration policy.

## 6. Live clue swapping (§12.4; `CQS-OD-051`)

Before reveal the host may: replace, search the bank, move, edit,
regenerate externally, or mark do-not-use. After reveal: no silent
replacement — an explicit cancellation or correction workflow preserves
the actually displayed clue in session history (append-only, matching the
engine's correction discipline).

## 7. QA and grounding (§12.5)

Required per factual clue: a source reference (`CQS-OD-043` — source
file; slide, page, section, or timestamp; explanation of support) kept as
**host-side QA data, never normal projected content**; generation
confidence; ambiguity warnings; alternate-answer guidance; rejection
guidance where useful; distractor rationale and misconception target;
cognitive-demand classification and calibrated difficulty explanation
(`CQS-OD-045`); generation metadata — provider or model, generation date,
authoring-template version, generation instructions, **never hidden model
reasoning** (`CQS-OD-046`); source hashes by default with optional
bundled archives (`CQS-OD-047`); and teacher review status.

## 8. Import result (§12.6)

Spreadsheet import should eventually: create a reviewable ready-to-play
game; add reusable questions to the question bank (`CQS-OD-050`);
preserve source and generation lineage; present **ready / review /
blocked** classifications; require teacher approval before play; and
compile through canonical CQS validation. Blocked content cannot be
played, full stop.

## 9. Boundaries

- No implementation in this slice — no parser, no schema code, no
  workbook file, no LLM integration.
- The arc must reconcile with MVP Slice 17's delivered shape when
  authorized; if Slice 17 ships first, this arc extends it — it never
  builds a parallel path.
- Question-bank storage, packages, and any shared repository carry their
  own register entries and triggers (`CQS-OPP-QUESTION-BANK`,
  `CQS-OPP-BANK-PACKAGES`, `CQS-OPP-SHARED-REPOSITORY`).
