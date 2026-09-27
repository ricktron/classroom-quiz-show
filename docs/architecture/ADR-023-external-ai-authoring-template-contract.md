# ADR-023 — External AI authoring template contract

- **Status:** Accepted — merged via PR #107
- **Date:** 2026-09-26
- **Accepted:** 2026-09-27 (implementation PR
  [#107](https://github.com/ricktron/classroom-quiz-show/pull/107); accepted
  exact head `a1ebebfb4cf3c9ada228a0bfa3feacc5f9d83a75`; squash
  `c359a2e39e316de91e7952ae5a05f99091a94dc0`; merged **2026-09-27T15:38:31Z**;
  accepted-head and squash trees are **EXACT MATCH**
  `9e67e974a8e8b3c0716e5a8d09f322b0a3aa7b47`; post-merge CI (lint/typecheck/
  unit/build, Playwright e2e), Desktop artifacts, and Pages succeeded on that
  exact squash/main SHA)
- **Scope:** downloadable external-authoring templates and generation-rule versioning
- **Depends on:** ADR-004, ADR-018, CQS Product Contract
- **Supersedes:** nothing

## Context

CQS already supports XLSX authoring for `classic-board` and `board-plus-final`, but the original template primarily described workbook mechanics. The product goal is stronger: a teacher should be able to give the downloaded artifact plus a request and/or class materials to a capable external LLM and receive a high-quality CQS-ready workbook without learning the schema or engineering a detailed prompt.

CQS remains local-first and does not add a live AI runtime.

## Decision

### 1. XLSX remains the primary authoring artifact

XLSX is retained because it can carry machine metadata, instructions, multiple profile-specific semantic sheets, and structured blank rows in one teacher-friendly artifact. CSV may be added later only as a convenience where a format is genuinely flat.

### 2. Structural format and generation rules are versioned separately

`workbookFormatVersion` governs machine structure and parser compatibility.

`authoringRulesVersion` identifies the generation/educational contract embedded in a template. It is additive metadata. A future authoring-rules version does not automatically imply a new workbook structural format.

### 3. Rules are composable data

Generation rules live behind a typed rule-set seam and compose shared rules with profile-specific modules. Template instruction rendering consumes that seam.

A future gameplay format should add its own profile/rule module rather than expand one universal mega-template.

### 4. Generated templates are academically blank

Templates may pre-seed structural values such as order, score ladder, timer default, and round title. They do not seed live sample academic questions, answers, categories, or team names into semantic content.

An untouched template therefore remains incomplete and cannot become playable merely because it was downloaded.

### 5. Classic Board defaults

Absent a contrary legal teacher request, the external authoring contract targets six categories, five clues per category, 100/200/300/400/500 values, and generally increasing cognitive demand within a category.

Difficulty is defined by reasoning, integration, transfer, precision, and conceptual complexity rather than trivia/obscurity.

### 6. Source grounding

When class materials are supplied, they are the default factual/content boundary. Insufficient evidence produces an incomplete slot plus an `INSUFFICIENT SOURCE EVIDENCE` note rather than fabricated content.

### 7. Trust boundary is unchanged

The workbook remains untrusted data and must pass the existing AuthoringDraft, diagnostics, explicit approval, canonical compile, and `importGameFromJsonText` path. The template's instructions never become execution authority.

## Consequences

Positive: simpler teacher workflow, independent evolution of generation quality, clean per-format extension seam, and lower sample-content leakage risk.

Neutral: no live AI runtime, account, backend, network dependency, or canonical schema change; older workbook-format-1 files remain structurally valid when they lack authoring-rules provenance.

Negative: generated blank templates are intentionally not playable until completed; authoring-rule quality becomes a maintained product contract that needs tests and future review.
