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

## Amendment (2026-09-27) — `authoringRulesVersion` 1 → 2, difficulty calibration V2

Merged via PR [#108](https://github.com/ricktron/classroom-quiz-show/pull/108)
(accepted exact head `44b2c417370bb0cdd9677d75dc58ff6cedd4cb65`; squash
`9135b813cd08fe67ac7395d4f5fc2bd5f818e464`; merged **2026-09-27T20:02:52Z**;
accepted-head and squash trees are **EXACT MATCH** `5b3d3d042bce1837bf8f7a4064d09b429a9b46fa`;
post-merge CI (lint/typecheck/unit/build, Playwright e2e), Desktop artifacts,
SonarCloud, and Pages succeeded on that exact squash/main SHA). Both
amendments below (calibration V2 and the Difficulty Profile continuation)
landed together in that one PR.

Owner-approved bounded refinement, no architecture change. `AUTHORING_RULES_VERSION`
moved from `1` to `2` to strengthen the difficulty-calibration generation
contract this ADR already scopes under §2 and §5. `workbookFormatVersion`
remains `1`; no workbook sheet, header, or column changed; no live AI runtime
or trust-boundary change.

Rules version 2 strengthens `src/authoring/authoringRules.ts` with:

- **within-category monotonicity**: the existing 100→500 ladder guidance is
  retained and sharpened per band;
- **board-wide / cross-category calibration**: a same-value clue (for
  example every 300) should carry comparable reasoning demand in every
  category on the board, not only within its own category;
- **qualitative difficulty dimensions** (`DifficultyDimension`: reasoning
  steps, integration, transfer, discrimination, precision) as reusable
  typed vocabulary for the model to reason with — guidance only, never a
  numeric score the model computes or reports;
- **explicit anti-patterns**: obscurity, length, trivia/traps, and topical
  importance are each named as *not* equivalent to difficulty;
- **instructional-evidence-relative calibration**: difficulty is calibrated
  against what the supplied class materials actually taught and emphasized,
  never against generic textbook/trivia norms, and never against any
  individual student's inferred ability;
- **taught-scope ceiling**: 400/500 clues must still stay inside the taught
  scope; when evidence cannot support the required demand, the contract
  directs an `INSUFFICIENT SOURCE EVIDENCE` note rather than manufactured
  obscurity (existing §6 grounding rule, now bound explicitly to the top of
  the difficulty ladder too);
- **100-point floor / 500-point ceiling**: 100 stays a genuinely accessible
  entry point; 500 stays the board's highest *ordinary* demand, earned
  through synthesis/transfer/integration;
- **board-wide calibration QA pass**: before returning the workbook, the
  model performs a hidden-values thought experiment (would the actual
  written demand re-sort the clues into the same 100–500 order without
  seeing the labels?) and repairs mismatches — without emitting
  chain-of-thought about that repair;
- **concise Final Wager clarification**: Final should be at least as
  demanding as the board's 400–500 range, not a step down from it (no
  Final redesign).

Per §2 above, `authoringRulesVersion` remains additive generation-contract
provenance, not a structural compatibility gate: a workbook carrying
provenance `1` (or no provenance at all) remains structurally valid under
workbook format 1, and a future rules version beyond what a given CQS build
knows remains a warning, never an `unsupported-workbook-version` structural
failure. Point-value calibration is generation guidance for the external
model, not a deterministic runtime validation CQS enforces on import; CQS
still deterministically validates structure/content constraints (ADR-004,
ADR-018), not pedagogical difficulty. CQS does not claim every 500-point
clue is objectively harder than every 400-point clue — the contract gives
the external model substantially stronger board-wide and within-category
guidance for aligning cognitive demand with point value.

## Amendment (2026-09-27, continued) — Difficulty Profile: audience × overall challenge × ramp

Same owner-approved bounded refinement, still inside `authoringRulesVersion`
`2` (not bumped to `3`). Adds a **Difficulty Profile** — `audience baseline
× overall challenge × difficulty ramp` — that the external model resolves
before authoring, on top of the calibration contract above.

- **audience baseline**: free natural language, deliberately *not* a fixed
  enumerated grade/course list (for example first grade; middle-school
  science; 9th-grade Earth & Space Science; AP/advanced high school;
  introductory college; adult/professional learners), resolved only from
  explicit teacher instruction, course context, or supplied materials —
  never from an individual student's personal characteristics,
  accommodations, or presumed ability;
- **overall challenge**: `Accessible | Standard | Challenging`, relative to
  the resolved audience (typed `ChallengeLevel` data); `Standard` is the
  default;
- **difficulty ramp**: `Shallow | Standard | Steep`, the steepness of the
  100→500 spread, independent of overall challenge (typed `RampLevel`
  data); `Standard` is the default;
- these three settings are independent — challenge and ramp reshape the
  board's demand and spread, they never change the audience;
- **minimize teacher friction**: infer each setting from the request,
  course context, and supplied materials first, interpreting natural
  language freely; only when a setting remains genuinely ambiguous and the
  environment supports interaction, ask **one** batched question covering
  just the unresolved settings — never three separate questions, and never
  re-ask a setting the request/materials already resolved;
- **non-interactive fallback**: when interaction is unavailable, or the
  teacher says to use judgment, infer audience only from explicit evidence
  (never invent a specific learner population), default overall challenge
  and ramp to `Standard`, and never fail generation because the
  clarification could not happen;
- the whole profile operates **inside** the existing taught-scope boundary
  — it never authorizes outside facts, and the existing
  `INSUFFICIENT SOURCE EVIDENCE` behavior governs unsupported demand at any
  challenge/ramp setting;
- the existing cross-category same-value calibration rule is preserved
  unchanged under any profile;
- the existing board-wide hidden-values calibration QA pass is **expanded**
  to also check the resolved profile (does the finished board actually
  feel like the requested audience + challenge + ramp?), still without
  chain-of-thought output.

No new workbook column, sheet, or header was added; `workbookFormatVersion`
remains `1`. The generated `INSTRUCTIONS` sheet row count was kept well
under the existing `MAX_WORKBOOK_ROWS` transport cap (`limits.ts`,
unchanged) by consolidating several sections' prose into fewer, denser rows
rather than raising the cap. This profile is generation guidance the
external model resolves and follows; it is not a runtime configuration
option, account setting, or individual-learner profiling feature, and CQS
still does not deterministically validate pedagogical difficulty.
