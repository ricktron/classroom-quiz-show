# Slice 5 — category-board round: post-merge reconciliation

## Identity

- **Slice:** Slice 5 — Category-board round (the first playable round type)
- **Implementation PR:** [#9](https://github.com/ricktron/classroom-quiz-show/pull/9)
- **Base `main` SHA:** `0dacd3501fb10ce1272386f56bf15a2956ee8c6d`
  (merge commit of PR #8, the Slice 4 post-merge reconciliation)
- **Implementation commit:** `f8c4517b17433bcbf737b754f02c36ad4faf829a`
  (`Slice 5: category-board round — the first playable round type`, 2026-07-26T03:55:13Z)
- **Documentation commit 1:** `93e2ce9496057acd34155e6ac989f41c583cfde2`
  (`docs: record Slice 5 CI observed green on PR #9`, 2026-07-26T04:02:28Z)
- **Documentation commit 2:** `5e6994eab1c7b74a9ce69c3942c9f778c3ac98b8`
  (`docs: tidy the Slice 5 receipt caveats`, 2026-07-26T04:02:46Z) — also the
  final reviewed PR head
- **Merge commit:** `2ec69323c203a989b06610e6506475e875a40e45` (short `2ec6932`)
- **Merge parents:** `0dacd3501fb10ce1272386f56bf15a2956ee8c6d` (base) and
  `5e6994eab1c7b74a9ce69c3942c9f778c3ac98b8` (head) — confirming the merged head
  is exactly the reviewed head
- **Merged at:** **2026-07-26T05:02:33Z** (GitHub `merged_at`; the merge
  commit's own committer timestamp is 2026-07-26T05:02:32Z, one second earlier)
- **Merged by:** `ricktron` (repository owner)
- **PR totals:** 3 commits, 47 files changed, +6133 / −104
- **Reconciliation branch:** `docs/slice-5-post-merge-reconciliation`
- **Reconciliation commit:** recorded in the reconciliation PR (this receipt is
  written in the same commit it describes)
- **Reconciliation PR:** #10

All of the above was verified by direct repository and GitHub inspection, not
taken from the authorization text.

## Delivered capability

Slice 5 delivers the first **playable** round type, `category-board`:

- ordered categories and ordered tiles, with **authored array order preserved**
  as the canonical order (never derived from object-key enumeration, registry
  order, or tile value);
- stable authored **category IDs** and stable authored **tile IDs**, with tile
  IDs unique **across the whole round**, not merely within a category;
- **uneven category lengths allowed** (a ragged board is valid and rendered
  safely);
- **duplicate displayed values allowed**, within and across categories, because
  identity comes from the stable ID rather than the displayed number;
- per-tile **prompts** and **answers**;
- optional **alternate acceptable answers** (host-only);
- optional **host-only teacher notes**;
- optional **multiplier** with a deterministic **effective value**;
- **used-tile state**;
- **tile selection**, **prompt reveal**, **answer reveal**, and
  **return to board**;
- deterministic **replay** and **undo**;
- **host-authoritative** control with a read-only projector;
- **sanitized projector state** through the existing allow-list boundary;
- integration with the **canonical Slice 4 import pipeline**;
- **registry-controlled config validation** (one config schema per round type);
- **application-controlled round registration** — content can never register.

## Multiplier and scoring boundary

- `effectiveValue = value × multiplier`.
- Under the implemented contract both operands are **bounded integers**: `value`
  is a non-negative integer (0 allowed, negative rejected) with an upper bound,
  and `multiplier` is an integer in `[1, 10]`. The product is therefore exact —
  no floating-point ambiguity, no `NaN`, no `Infinity`.
- The multiplier affects **display/content semantics only**: the number shown on
  the tile and a typed `effectiveValue` field.
- **Slice 5 awards no points. Slice 5 deducts no points.**
- **No team state and no score state were added** anywhere in the private state,
  the event log, or `PublicState`.
- Scoring remains **Slice 6** work.

The documented default of `multiplier: 1` is applied by the trusted
round-domain constructor, never by a Zod `.default()` or `.transform()`, so the
import boundary continues to validate and report exactly what was authored.

## Used-tile policy

- **Selection alone does not permanently consume a tile.**
- **Answer reveal marks the tile used.**
- **Return to board preserves used state.**
- **Undo of the answer reveal makes the tile unused again**, through replay.
- **No hidden mutable used-tile cache exists.**
- Used state is **derived from the effective event sequence** — the set of
  non-undone answer-reveal events — so undo is exact without separate
  bookkeeping.

This is what makes an accidental selection recoverable without burning a
question mid-lesson.

## State and event model

Private per-round state pairs an explicit reveal stage with the selection, so
"an answer with no selected tile" is not expressible:

- reveal stages: **`board` → `selected` → `prompt` → `answer`**, plus
  `selected | prompt | answer → board`;
- `selected` is a real stage distinct from `prompt`: the host has privately
  opened a tile while the class still sees only the category and value;
- state is stored per round (keyed by round id), so leaving a round and
  returning **resumes** that board — same used tiles, same stage.

Commands and events, using their exact repository names:

| Command | Event | Reversible |
| --- | --- | --- |
| `SELECT_CATEGORY_BOARD_TILE` | `CATEGORY_BOARD_TILE_SELECTED` | yes |
| `REVEAL_CATEGORY_BOARD_PROMPT` | `CATEGORY_BOARD_PROMPT_REVEALED` | yes |
| `REVEAL_CATEGORY_BOARD_ANSWER` | `CATEGORY_BOARD_ANSWER_REVEALED` | yes |
| `RETURN_TO_CATEGORY_BOARD` | `CATEGORY_BOARD_RETURNED` | yes |

**Every command carries the `roundId` it targets**, and the planner rejects a
command whose target is not the current round. Stale or otherwise invalid
controls therefore **fail without appending an event and without changing the
revision**. Rejection reasons added: `game-already-ended`, `no-current-round`,
`round-mismatch`, `not-a-category-board-round`, `invalid-category-board-config`,
`unknown-tile`, `tile-already-used`, `invalid-board-stage`.

## Import integration

- **One canonical importer remains authoritative** (`src/import/importGame.ts`).
  No secondary importer was added.
- Category-board config validation is supplied **through the registry seam**
  (`RoundTypeEntry.configSchema`), so each round type still owns exactly one
  config validation path.
- Validation errors carry **exact document paths**, e.g.
  `rounds[0].config.categories[1].tiles[2].prompt`.
- **Three new stable import issue codes**, using their exact names:
  `duplicate-category-id`, `duplicate-tile-id`, `blank-text`.
- **Imported content cannot register a round type or provide executable
  behavior** — a game file is data, and there is no path from data to
  `registry.register`.
- **Unknown fields are rejected** at every level (never dropped).
- **No coercion.**
- **No silent repair** — nothing is renamed, de-duplicated, reordered, trimmed
  into validity, or defaulted at the boundary.
- **No partial import** — one bad tile fails the whole game file.

## Public-state and privacy boundary

- `PublicState` **wire version changed from 2 to 3**.
- The public round DTO uses the neutral discriminator **`kind: "board"`**.
- That is deliberate: it **avoids exposing the registry round-type identifier**
  on the projector, matching the rule `PublicGameView` already follows.
- **Board stage does not transmit hidden prompts, answers, notes, or
  alternates** — the DTO is current-stage-only, so unselected tile content is
  never sent rather than sent-and-hidden.
- **Prompt stage transmits only the selected prompt data.**
- **Answer stage transmits only the selected answer data permitted by the
  implemented DTO** (category title, effective value, the retained prompt, and
  the canonical answer — no alternates).
- **Teacher notes never enter `PublicState`**, at any stage.
- **Authored private identifiers are not projected.** The implementation needed
  stable render keys, so the DTO carries sanitized **opaque positional keys**
  (`c1`, `c1t3`) derived from position, never the authored category or tile IDs.
- **Raw import data, registry internals, event history, and host-only control
  availability remain private.**
- **Malformed, stale, unsupported, or wrong-wire-version data fails closed** to
  a neutral state that reveals no reason and no internals.

## Host behavior

- Playable host category grid.
- Unused tiles selectable.
- Used tiles disabled.
- Private prompt, answer, alternates, and teacher notes visible to the host.
- **Explicit indication of what is currently public** (a persistent
  "On the display now" line, plus a "Host only" badge on every private block).
- Reveal-prompt control.
- Reveal-answer control.
- Return-to-board control.
- **No scoring controls. No timer controls. No team controls.**

## Display behavior

- Projector board rendering.
- Category headers.
- Tile values (the effective, multiplied value).
- Used-tile unavailable state.
- Prompt presentation.
- Answer presentation.
- Neutral **unavailable** state for malformed or unsupported public data.
- **No hidden answer before reveal** — the answer string is not present in the
  DOM at all until the host reveals it.
- **No teacher notes at any stage.**
- **No unrelated tile content in the DOM.**

## Accessibility

Implemented and covered by tests:

- semantic `<button>` elements for every tile;
- keyboard-operable host grid (native activation);
- visible focus (the shared global focus ring);
- disabled used tiles are not operable;
- screen-reader labels including category and value
  (e.g. `"Earth Structure, 100 points, already used"`);
- **no colour-only used-state communication** — a used tile also carries the
  word "Used" and a dashed border;
- supported responsive viewports (`desktop-1080p`, `projector-720p`,
  `mobile-host`);
- **no unintended horizontal overflow** — asserted by an end-to-end check of
  `scrollWidth − clientWidth` at every viewport;
- long prompt/answer text wraps (`overflow-wrap: anywhere`);
- reduced-motion-safe: the board and reveal surfaces introduce **no animation**,
  so there is nothing for the existing `prefers-reduced-motion` rule to suppress.

## Test and verification evidence

The four categories below are recorded **separately and are not
interchangeable**.

### 1. Local implementation verification (Slice 5 branch, pre-merge)

Independently confirmed against
[`2026-07-26-slice-5-local-verification.md`](2026-07-26-slice-5-local-verification.md)
and the repository:

| Command | Result | Notes |
| --- | --- | --- |
| `npm ci` | pass | no dependency changes |
| `npm run lint` | pass | |
| `npm run typecheck` | pass | |
| `npm run test:run` | pass | **455 unit tests, 27 files** |
| `npm run build` | pass | |
| `npm run test:e2e` | pass | **121 passed / 2 skipped** |
| `npm run verify:all` | pass | the full chain |
| `git diff --check` | pass | |

The **2 e2e skips are intentional and pre-existing**: both are the same test
(`tests/e2e/pwa-offline.spec.ts` → "host and display shells load offline after
first visit"), guarded to run once on the desktop project, so it reports skipped
on `projector-720p` and `mobile-host`. No test was skipped because it failed.

### 2. PR #9 pre-merge checks

On the final reviewed head `5e6994eab1c7b74a9ce69c3942c9f778c3ac98b8`:

| Check | Conclusion | Started → completed (UTC) |
| --- | --- | --- |
| Lint, typecheck, unit tests, build | success | 04:03:02Z → 04:03:51Z |
| Playwright e2e | success | 04:03:01Z → 04:04:49Z |
| SonarCloud Code Analysis | success | 04:02:54Z → 04:03:29Z |

SonarCloud **Quality Gate passed** with **0 security hotspots**, 0.0%
duplication on new code, and 9 new non-blocking issues. All three checks had
also concluded success on the earlier head `f8c4517`, as recorded in the
implementation receipt.

### 3. Post-merge CI on `main`

Commit checked: **`2ec69323c203a989b06610e6506475e875a40e45`** (the Slice 5
merge commit). Workflow **`CI`**, run
[30188733304](https://github.com/ricktron/classroom-quiz-show/actions/runs/30188733304),
event `push`, overall conclusion **success**:

| Job | Conclusion | Started → completed (UTC) |
| --- | --- | --- |
| Lint, typecheck, unit tests, build | success | 2026-07-26T05:02:38Z → 05:03:21Z |
| Playwright e2e | success | 2026-07-26T05:02:38Z → 05:03:58Z |

### 4. GitHub Pages deployment

Commit deployed: **`2ec69323c203a989b06610e6506475e875a40e45`**. Workflow
**`Deploy to GitHub Pages`**, run
[30188733295](https://github.com/ricktron/classroom-quiz-show/actions/runs/30188733295),
event `push`, overall conclusion **success**:

| Job | Conclusion | Started → completed (UTC) |
| --- | --- | --- |
| Build production bundle | success | 2026-07-26T05:02:38Z → 05:03:01Z |
| Deploy | success | 2026-07-26T05:03:05Z → 05:03:16Z |

The deployment target is <https://ricktron.github.io/classroom-quiz-show/>.
**Not claimed here:** owner-verified loading of the live URLs after this
deployment. The evidence above is the workflow conclusion, which is what was
actually observed.

## Regression notes

### Deliberate fixture update

Slices 3–4 used the literal string `category-board` as their "unknown round
type" fixture, because no board engine existed at the time. Registering the real
`category-board` type made that fixture **valid**, which would have silently
changed what those tests exercised. The fixture was therefore changed to
**`not-a-real-round-type`** — a name that is not on the roadmap and cannot become
registered by accident.

**Existing unknown-type assertions were preserved**: every affected test still
asserts the same codes, stages and paths, and still fails at the `registry`
stage. Files touched: `src/import/errorModel.test.ts`,
`src/import/stateIsolation.test.ts`, `src/host/GameImportPanel.test.tsx`,
`tests/e2e/import-pipeline.spec.ts`, and the
`CANONICAL_SAMPLE_WITH_UNKNOWN_ROUND_TYPE` fixture itself.

Two related test updates: `src/game/registry.test.ts` moved from "the default
registry has exactly the placeholder type" to "registers exactly the built-in
types, in registration order"; and `src/state/sanitize.test.ts` gained `round` in
its allow-listed-key assertion, which is precisely that test's purpose — a new
`PublicState` field must be a deliberate, reviewed edit.

### Public DTO review finding

During Slice 5 development, **a test caught the public round DTO exposing the
registry round-type string** (`category-board`) on the wire. The discriminator
was changed to the neutral **`kind: "board"`** before the change was pushed.

This was a **privacy and abstraction-boundary correction**, and it is recorded
here as such. **It is explicitly not a known production leak**: the evidence
shows it was caught by the test suite during development, prior to merge and
prior to any deployment. No released build ever carried it.

## Known limitations

Carried into Slice 6 planning:

- **no teams**
- **no scoring**
- **no score correction**
- **no timers**
- **no wagering**
- **no final-wager round**
- **no media** — **no images**, **no audio**, **no video**
- **no persistence**
- **no session recovery**
- **no spreadsheet import**
- **no authoring UI**
- **no saved game library**
- **one tile active at a time** — a second tile cannot be opened while one is
  live; return to the board first
- **board state resumes when returning to a round** — used tiles and reveal
  stage persist per round (deliberate, and tested)
- **alternates remain host-only** — never projected
- **wire-v2 consumers fail closed** — `PublicState` is version 3 and no
  migration exists
- **Pages deploys only from `main`**
- **Slice 6 remains unstarted** and owner-gated

## Caveats

- This receipt records **observed** evidence only. Where something was not
  observed (owner-verified loading of the live Pages URLs after this
  deployment), it is named as not observed rather than asserted.
- The local verification figures were produced in the development sandbox with
  the documented `PLAYWRIGHT_CHROMIUM_PATH` environment override; CI installs
  the matching browser and used no override.
