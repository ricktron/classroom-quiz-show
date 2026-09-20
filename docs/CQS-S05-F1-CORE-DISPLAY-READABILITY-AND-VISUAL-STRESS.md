# CQS REAL MVP S05-F1 — core Display readability and visual stress

Local and repository delivery evidence for the first bounded S05 tranche.

- **Authorization:**
  `AUTHORIZE-CQS-REAL-MVP-S05-F1-CORE-DISPLAY-READABILITY-AND-VISUAL-STRESS-1`
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
| In scope | Board Display, Clue/question Display, shared Display CSS, valid stress fixture, tests, this doc |
| Out of scope | Host redesign, choreography, Final, S04D, S06, schema/PublicState/persistence, new frameworks/fonts |

---

## C. Foundations reused

- Slice 17 semantic tokens / default + high-contrast themes (`src/styles/themes.css`, `ThemeProvider`)
- Slice 18 `AudienceDisplayShell` composition and score layouts
- Existing `CategoryBoardDisplay` / `MediaContentDisplay` components and public-state DTOs
- Playwright projects `desktop-1080p` and `projector-720p`
- Canonical import pipeline for fixture validity
- Existing media fixture `public/media-fixtures/slice-11-clue.png`

No new CSS framework, font package, animation library, or theme package.

---

## D. Design principles applied

From adopted UX doctrine / inventory (Display surfaces):

- distance-first Display hierarchy (Board + Clue);
- Host/Display role separation (Host untouched);
- personality after clarity;
- non-color state meaning (Used label + dashed border + dormant styling);
- long-content wrap, not clip;
- high-contrast as first-class;
- reduced-motion: F1 adds no motion vocabulary.

---

## E. Stress fixture

**Created** canonical reusable fixture (no prior complete S05/S06 worst-case game file):

`src/test/visualStressFixtures.ts`

Coverage:

- 6 categories × 5 tiles (30 tiles);
- category titles at `MAX_CATEGORY_TITLE_LENGTH` (60);
- long prompt/answer at `MAX_PROMPT_LENGTH` / `MAX_ANSWER_LENGTH`;
- one image prompt using same-origin media fixture;
- 8 teams at `MAX_TEAM_NAME_LENGTH` with distinct accents;
- imports through `importGameFromUnknown` (unit-tested).

Viewport/theme/reduced-motion stress is applied by automated tests, not by
invalid product data. Windows physical scaling remains **S06**.

---

## F. Category-board changes

File: `src/display/CategoryBoardDisplay.css` (+ spatial-memory tests).

- Stronger board frame and category headers (weight, border, letter-spacing);
- clearer tile value presence with tabular numerals;
- used tiles retain **Used** word + dashed border + dormant color (non-hue-only);
- columns keep authored order; used tiles remain in place (no slot collapse);
- open-clue panel frames question as primary object.

No gameplay / PublicState / schema changes.

---

## G. Clue/question changes

Files: `CategoryBoardDisplay.css` (open stage), `MediaContentDisplay.css`.

- Larger prompt type with bounded line length (`~48ch`) and wrap;
- selection chrome (category / value) recedes relative to prompt;
- image media contained with caption/attribution secondary;
- high-contrast stronger borders / prompt weight.

---

## H. Theme / accessibility

| Mode | Behavior |
| --- | --- |
| Default | Existing semantic tokens; Display CSS only |
| High contrast | Stronger board/tile/open borders; heavier prompt weight |
| Reduced motion | No new motion; e2e covers `prefers-reduced-motion: reduce` path |
| Non-color meaning | Used label + dashed border; Answer label retained; signed scores unchanged |

Host CSS not redesigned. No GameDefinition theme fields.

---

## I. COURT-style semantic review (F1)

| Finding | Disposition |
| --- | --- |
| Board headers previously under-weighted vs tiles for distance glance | Repaired via category header treatment |
| Open clue category/value competed with prompt | Repaired: prompt scale up; chrome subdued |
| Long category titles needed wrap room | Retained `overflow-wrap: anywhere`; stress fixture at max length |
| Used-state must not be hue-only | Preserved triple cue (label + dashed + dormant) |
| 8-team coexistence under Board/Clue | Covered by e2e stress (deck layout + signed scores) |
| Later choreography still absent | **Deferred** (F1 intentionally static) |

---

## J. Verification

Recorded at delivery (exact commands in PR handoff):

- focused unit: visual stress fixture, CategoryBoardDisplay, MediaContentDisplay;
- `git diff --check`;
- `npm run verify`;
- `npm run verify:all` (includes 1080p/720p Playwright);
- focused S05-F1 Playwright spec.

Desktop Electron packaging tests: not required for this Display CSS/docs/test
diff (no desktop shell changes).

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

Filled after push/PR:

| Fact | Value |
| --- | --- |
| Branch | `feat/cqs-real-mvp-s05-f1-core-display-readability` |
| PR | [#89](https://github.com/ricktron/classroom-quiz-show/pull/89) |
| Exact head | `db8a463aea8802eb0b1f1c3686214b6a6d399b7f` |
| Base | `c3e7da4ddfebf0da2ac9c7659c5deab08691cced` |
| Auto-merge | off |

---

## N. Next owner decision

**Independent exact-head review of the S05-F1 candidate.**

Does not authorize merge, F2, S04D, S06, or S05 parent terminalization.
