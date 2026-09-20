# CQS REAL MVP S05-F1 — core Display readability and visual stress

Local and repository delivery evidence for the first bounded S05 tranche,
including the PR #89 bounded acceptance repair for independent-review
Findings 1–7.

- **Authorization (implementation):**
  `AUTHORIZE-CQS-REAL-MVP-S05-F1-CORE-DISPLAY-READABILITY-AND-VISUAL-STRESS-1`
- **Authorization (PR #89 repair):**
  `AUTHORIZE-CQS-REAL-MVP-S05-F1-PR89-BOUNDED-ACCEPTANCE-REPAIR-1`
- **Tranche:**
  `CQS-REAL-MVP-S05-F1-CORE-DISPLAY-READABILITY-AND-VISUAL-STRESS`
- **Parent:** `CQS-REAL-MVP-S05-FLAGSHIP-VISUAL-FIDELITY-AND-GAME-SHOW-CHOREOGRAPHY`
  (parent remains **not** terminal)
- **Date (America/Chicago):** 2026-09-20

---

## A. Interrupted-run recovery

| Fact | Observed |
| --- | --- |
| Worktree | `/Users/macdaddy/Documents/Coding/Cursor Projects/classroom-quiz-show-s05-f1` |
| Branch | `feat/cqs-real-mvp-s05-f1-core-display-readability` |
| Recovered HEAD at resume | `c3e7da4ddfebf0da2ac9c7659c5deab08691cced` (= `origin/main`) |
| Partial product commits | **none** before this delivery |
| Partial product modifications | **none** (clean tree at resume) |
| `move_agent_to_root` | **not** used after the Cursor worktree collision; work continued via `git -C` + absolute paths |

---

## B. Base and scope

| Fact | Value |
| --- | --- |
| Canonical base | `c3e7da4ddfebf0da2ac9c7659c5deab08691cced` |
| In scope | Board Display, Clue/question Display, Audience shell score-deck density at projector height, valid stress fixture + sanitizer-derived Display snapshots, tests, this doc |
| Out of scope | Host redesign, choreography, Final, S04D, S06, schema/PublicState/persistence, new frameworks/fonts |

---

## C. Foundations reused

- Slice 17 semantic tokens / default + high-contrast themes (`src/styles/themes.css`, `ThemeProvider`)
- Slice 18 `AudienceDisplayShell` composition and score layouts
- Existing `CategoryBoardDisplay` / `MediaContentDisplay` components and public-state DTOs
- Playwright projects `desktop-1080p` and `projector-720p`
- Canonical import pipeline for fixture validity
- Same-origin media fixtures under `public/media-fixtures/`

No new CSS framework, font package, animation library, or theme package.

---

## D. Design principles applied

From adopted UX doctrine / inventory (Display surfaces):

- distance-first Display hierarchy (Board + Clue);
- Host/Display role separation (Host untouched);
- personality after clarity;
- non-color state meaning (Used label + dashed border + dormant styling);
- long-content wrap, not clip; schema-max stems use length-aware type scale so
  they remain inside the usable composition with the score deck
  (`limits.ts` projector rationale for `MAX_PROMPT_LENGTH` /
  `MAX_ANSWER_LENGTH`);
- high-contrast as first-class (Board + Clue/answer automation);
- reduced-motion: F1 adds no motion vocabulary.

### Presentation contract vs schema maximum

| Layer | Bound | Meaning |
| --- | --- | --- |
| Schema / import | `MAX_PROMPT_LENGTH` (600), `MAX_ANSWER_LENGTH` (300) | Valid Game acceptance |
| F1 Display presentation | Same maxima, with length-aware type + projector-height density | Must remain inside 1280×720 / 1920×1080 without **page** scroll while coexisting with an 8-team score deck |

F1 does **not** silently lower schema limits. Length bands adjust type scale
only.

---

## E. Stress fixture

**Created** canonical reusable fixture (no prior complete S05/S06 worst-case game file):

`src/test/visualStressFixtures.ts`

Coverage:

- 6 categories × 5 tiles (30 tiles);
- category titles at `MAX_CATEGORY_TITLE_LENGTH` (60);
- long prompt/answer at `MAX_PROMPT_LENGTH` / `MAX_ANSWER_LENGTH`;
- one image prompt using `media-fixtures/s05-f1-stress-diagram.png` (960×540);
- 8 teams at `MAX_TEAM_NAME_LENGTH` with distinct accents;
- imports through `importGameFromUnknown` (unit-tested).

Display automation derives PublicState from this fixture through the session
sanitizer:

`src/test/visualStressDisplaySnapshots.ts`

Viewport/theme/reduced-motion stress is applied by automated tests, not by
invalid product data. Windows physical scaling remains **S06**.

---

## F. Category-board changes

Files: `CategoryBoardDisplay.css` / `.tsx` (+ spatial-memory tests).

- Stronger board frame and category headers (weight, border, letter-spacing);
- clearer tile value presence with tabular numerals;
- used tiles retain **Used** word + dashed border + dormant color (non-hue-only);
- columns keep authored order; used tiles remain in place (no slot collapse);
- open-clue panel frames question as primary object;
- projector-height (`max-height: 800px`) rhythm keeps Board + 8-team deck in view;
- answer-reveal stage adds `cbd--answer` for compact coexistence styling.

No gameplay / PublicState / schema changes.

---

## G. Clue/question changes

Files: `CategoryBoardDisplay.css` (open stage), `MediaContentDisplay.css` / `.tsx`.

- Prompt type with bounded line length and wrap; length bands (`short` /
  `medium` / `long`) scale type so schema-max stems fit;
- selection chrome (category / value) recedes relative to prompt;
- image media contained with caption/attribution secondary;
- high-contrast stronger borders / prompt weight / answer boundary.

Audience shell (`AudienceDisplayShell.css`) densifies the 8-team deck and
chrome only at projector height — not a scoreboard redesign.

---

## H. Theme / accessibility

| Mode | Behavior |
| --- | --- |
| Default | Existing semantic tokens; Display CSS only |
| High contrast | Stronger board/tile/open/answer borders; heavier prompt weight; automated Board + Clue/answer coverage |
| Reduced motion | No new motion; e2e covers `prefers-reduced-motion: reduce` image path |
| Non-color meaning | Used label + dashed border; Answer label retained; signed scores unchanged |

Host CSS not redesigned. No GameDefinition theme fields.

---

## I. COURT-style semantic review (F1)

| Finding | Disposition |
| --- | --- |
| Board headers previously under-weighted vs tiles for distance glance | Repaired via category header treatment |
| Open clue category/value competed with prompt | Repaired: prompt scale up for ordinary stems; chrome subdued |
| Long category titles needed wrap room | Retained `overflow-wrap: anywhere`; stress fixture at max length |
| Used-state must not be hue-only | Preserved triple cue (label + dashed + dormant) |
| 8-team Board coexistence at 720p | Repaired: projector-height Board + deck density; e2e asserts element geometry inside viewport |
| Schema-max Clue / answer vertical fit | Repaired: length-aware type + answer compact stage; e2e asserts prompt/answer/scores in viewport at 720p/1080p |
| Later choreography still absent | **Deferred** (F1 intentionally static) |

---

## J. Verification

Recorded at delivery / repair (exact commands in PR handoff):

- focused unit: visual stress fixture, Display snapshots, CategoryBoardDisplay, MediaContentDisplay;
- `git diff --check`;
- `npm run verify`;
- `npm run verify:all` (includes 1080p/720p Playwright);
- focused S05-F1 Playwright spec under `desktop-1080p` and `projector-720p`
  (Board, long prompt, answer reveal, HC clue, image load/geometry,
  reduced motion).

Desktop Electron packaging tests: not required for this Display CSS/docs/test
diff (no desktop shell API changes). GitHub Desktop artifact workflows still
run on the PR.

---

## K. Physical evidence boundary

This tranche does **not** claim:

- physical projector viewing distance;
- Windows scaling / washout;
- machine sleep/wake;
- screen-reader lab qualification;
- classroom lighting;
- signed release readiness.

S05 creates the presentation candidate; S06 qualifies physically later.

---

## L. Deferred S05 / Program work

Explicitly deferred:

- buzz choreography;
- correct/incorrect choreography;
- score-change choreography;
- round transitions;
- Final choreography;
- winner celebration;
- broader Host polish;
- S04D feedback/telemetry;
- S06 integrated qualification;
- S05 parent terminalization.

---

## M. Candidate identity

| Fact | Value |
| --- | --- |
| Branch | `feat/cqs-real-mvp-s05-f1-core-display-readability` |
| PR | [#89](https://github.com/ricktron/classroom-quiz-show/pull/89) |
| Exact head | open PR #89 tip on `feat/cqs-real-mvp-s05-f1-core-display-readability` (re-observe `headRefOid` on GitHub for merge decision; independent exact-head review records bind the reviewed SHA) |
| Rejected head before repair | `cf423206615c158cfd2c9f54a6e68f95f4619dcb` |
| Base | `c3e7da4ddfebf0da2ac9c7659c5deab08691cced` |
| Auto-merge | off |

---

## N. Next owner decision

**Fresh independent exact-head review of repaired PR #89.**

Does not authorize merge, F2, S04D, S06, or S05 parent terminalization.
