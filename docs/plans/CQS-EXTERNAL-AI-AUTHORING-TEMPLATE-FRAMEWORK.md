# External AI Authoring Template Framework

- **Document id:** `CQS-PLAN-EXTERNAL-AI-AUTHORING-TEMPLATE-FRAMEWORK`
- **Date:** 2026-09-26
- **Status:** owner-approved product/design direction
- **Scope:** external model-neutral game-content authoring through downloadable templates
- **Implementation authority:** current bounded implementation objective only; this document does not authorize future game modes, live AI, cloud services, or importer bypasses

## 1. Product goal

A teacher should be able to:

1. choose a supported CQS game format;
2. download that format's authoring workbook;
3. upload the workbook plus a plain-language request and/or class materials to a capable external LLM;
4. receive a completed workbook without learning the CQS schema or writing a specialized prompt;
5. import the workbook into CQS;
6. review deterministic diagnostics and quality notices;
7. explicitly approve the content before it can become playable.

The workbook is therefore both a teacher-friendly data-entry artifact and a **self-contained external authoring contract**.

## 2. Primary artifact decision

**XLSX is the primary external authoring artifact.**

Why:

- one portable file can carry machine metadata, instructions, multiple semantic tables, optional profile-specific sheets, and blank structured rows;
- it is familiar to teachers and widely accepted by general-purpose LLM file workflows;
- it gives future game formats room for distinct structures without forcing a universal flat CSV;
- existing CQS security/preflight/parser infrastructure already validates XLSX and rejects executable workbook content;
- canonical CQS JSON remains the trusted stored/runtime truth.

CSV may be considered later as a convenience format for genuinely flat profiles. It is not the primary contract and must never create a second validation path.

## 3. Two independent versions

| Version | Meaning | Compatibility effect |
| --- | --- | --- |
| `workbookFormatVersion` | machine-readable workbook structure/parsing contract | unsupported structural versions fail closed |
| `authoringRulesVersion` | educational/generation instructions embedded in a template | provenance and authoring compatibility signal; does not by itself bypass or invalidate structural validation |

This permits better generation rules without needlessly breaking workbook format compatibility.

## 4. Rule-framework architecture

Authoring rules are data, not scattered prompt prose.

Each supported profile composes:

1. **shared rules**: assignment authority, source grounding, content selection, clue writing, answer/alternate/notes conventions, QA;
2. **format rules**: board geometry, value/difficulty model, format-specific item requirements;
3. **optional modules**: Final Wager, team-name bank, future mode-specific structures.

The current code seam is `src/authoring/authoringRules.ts`.

Future profiles should add or compose rule modules rather than grow one universal instruction blob or one universal mega-workbook.

## 5. Classic Board / Board + Final MVP rules

Default board when the teacher gives no contrary legal instruction:

- 6 categories;
- 5 clues per category;
- 100 / 200 / 300 / 400 / 500 values;
- generally increasing cognitive demand or conceptual complexity within each category.

Difficulty intent:

- **100**: foundational recognition/recall of important taught content;
- **200**: distinction, relationship, or one-step application;
- **300**: connection, interpretation, or familiar application;
- **400**: multi-step reasoning, comparison, inference, or less-familiar application;
- **500**: synthesis, transfer, misconception resolution, or integration.

Difficulty should come from thinking, not obscurity.

## 6. Grounding contract

When source materials are supplied, they are the default content authority.

The external model should:

- prioritize what the supplied materials actually teach and emphasize;
- cover the requested scope broadly;
- not fabricate facts, citations, standards, or teacher emphasis;
- leave a required slot incomplete and flag `INSUFFICIENT SOURCE EVIDENCE` in Notes rather than invent content;
- optionally place concise source locators in Notes when useful;
- never provide hidden chain-of-thought.

When no source materials are supplied, the model may use ordinary reliable subject knowledge within the teacher's requested scope.

## 7. Template behavior

Generated templates should be **structurally prepared but academically blank**.

They may pre-seed safe structure such as CategoryOrder, ClueOrder, normal values, default ResponseSeconds, and default Final round title.

They should not ship live sample academic content in semantic cells. Sample questions can bias generation or survive partial completion and masquerade as teacher-approved content.

An untouched template is not expected to be playable. CQS should reject/block incomplete semantic content until the external authoring step fills it.

## 8. Trust boundary

```text
XLSX
→ preflight
→ workbook adapter
→ AuthoringDraft
→ diagnostics
→ explicit teacher approval
→ canonical JSON compiler
→ importGameFromJsonText
→ trusted GameDefinition
```

No external model, workbook, template instruction, or generated file has execution or validation authority.

## 9. Future game-format contract

Different gameplay formats may need materially different authoring shapes.

Examples:

- Classic Board: category/value grid represented as clue rows;
- Board + Final: board plus Final semantic sheet;
- Buzzer Sprint: sequential prompt list;
- Team Choice: multiple-choice items plus distractor/rationale fields;
- Survey Showdown: survey rounds, ranked answers, and provenance;
- mixed formats: composition of registered format-specific authoring modules.

A new game format should normally receive its own profile-specific template and rules. Do not force future modes into Classic Board columns merely for superficial uniformity.

## 10. Definition of done for this framework tranche

- [x] primary artifact decision recorded;
- [x] workbook structure version separated from authoring-rules version;
- [x] reusable data-driven authoring-rule framework established;
- [x] Classic Board difficulty/content/grounding rules encoded;
- [x] Board + Final adds a profile-specific Final module;
- [x] generated semantic template content becomes academically blank;
- [x] rules embedded directly in generated workbooks;
- [x] tests cover versioning, profile composition, expected authoring instructions, and sample-content absence;
- [x] existing canonical validation/import boundary preserved;
- [x] future per-format template strategy documented.

This tranche does **not** implement additional gameplay formats or a live AI service.
