# CQS REAL MVP S05-F1 — core Display readability and visual stress

Local and repository delivery evidence for the first bounded S05 tranche,
including PR #89 bounded acceptance repair (Findings 1–7) and the subsequent
internal-clipping / legibility repair (Findings R1–R5).

- **Authorization (implementation):**
  `AUTHORIZE-CQS-REAL-MVP-S05-F1-CORE-DISPLAY-READABILITY-AND-VISUAL-STRESS-1`
- **Authorization (PR #89 Findings 1–7 repair):**
  `AUTHORIZE-CQS-REAL-MVP-S05-F1-PR89-BOUNDED-ACCEPTANCE-REPAIR-1`
- **Authorization (PR #89 R1–R5 internal clipping / legibility repair):**
  `AUTHORIZE-CQS-REAL-MVP-S05-F1-PR89-INTERNAL-CLIPPING-AND-LEGIBILITY-REPAIR-1`
- **Tranche:**
  `CQS-REAL-MVP-S05-F1-CORE-DISPLAY-READABILITY-AND-VISUAL-STRESS`
- **Parent:** `CQS-REAL-MVP-S05-FLAGSHIP-VISUAL-FIDELITY-AND-GAME-SHOW-CHOREOGRAPHY`
  (parent remains **OPEN / NOT TERMINAL**)
- **Tranche status:** **TERMINALLY COMPLETE**
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
| In scope | Board Display, Clue/question Display, Audience shell score-deck / quiet-cognition signal-rail density at projector height, valid stress fixture + sanitizer-derived Display snapshots, authored-text visibility oracle, tests, this doc |
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

- distance-first Display hierarchy (Board + Clue) — `CQS-UX-P14`;
- Host/Display role separation (Host untouched);
- personality after clarity;
- non-color state meaning (Used label + dashed border + dormant styling);
- long-content wrap **and full authored visibility** — schema-max stems use
  length-aware type **after** composition reclaims vertical budget; overflow
  must not mask meaning;
- high-contrast as first-class (Board + Clue/answer automation);
- reduced-motion: F1 adds no motion vocabulary.

### Presentation contract vs schema maximum

| Layer | Bound | Meaning |
| --- | --- | --- |
| Schema / import | `MAX_PROMPT_LENGTH` (600), `MAX_ANSWER_LENGTH` (300) | Valid Game acceptance |
| F1 Display presentation | Same maxima | Full authored prompt/answer text visible at 1280×720 / 1920×1080 **without page scroll and without internal clipping**, coexisting with an 8-team score deck and necessary timer/chrome |

F1 does **not** silently lower schema limits. Length bands adjust type scale
only after composition allocates a usable primary region.

### Repair history (PR #89)

1. **Findings 1–7:** Board + 8-team page fit; vertical outer geometry; fixture →
   sanitizer → Display snapshots; HC clue automation; real 960×540 media;
   Sonar duplication; closeout accuracy (partial).
2. **Findings R1–R5:** Internal clipping by `.cbd--open { overflow:hidden }`
   while page scroll stayed 0; quiet-cognition Signal Rail
   `ResponseTimerDisplay` duplicated Nexus timer and starved clue vertical
   budget (~14 px schema-max type); oracle false-green on outer rectangles;
   image attribution past open clip edge; closeout overclaims.

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

Path:

```text
canonical valid Game fixture
→ ordinary Game/Session state
→ existing sanitizer (store.getPublicState)
→ PublicState
→ Display e2e
```

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
- answer-reveal stage adds `cbd--answer` for compact coexistence styling;
- open stage uses `overflow: visible` for authored content; long stems recede
  category/value chrome via `:has(.mcd__text[data-length='long'])`.

No gameplay / PublicState / schema changes.

---

## G. Clue/question changes

Files: `CategoryBoardDisplay.css` (open stage), `MediaContentDisplay.css` /
`.tsx`, `AudienceDisplayShell.css`.

- Prompt type with bounded line length and wrap; length bands (`short` /
  `medium` / `long`) keep readable hierarchy after composition repair;
- selection chrome (category / value) recedes relative to prompt;
- quiet-cognition densifies the compact Signal Rail
  `ResponseTimerDisplay` (Nexus already carries the compact timer) so schema-max
  prompts reclaim the primary region;
- image media contained with caption/attribution secondary and tertiary, both
  kept inside the open composition;
- high-contrast stronger borders / prompt weight / answer boundary.

Audience shell densifies the 8-team deck and quiet-cognition timer chrome at
projector height — not a scoreboard redesign and not Host redesign.

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
| Schema-max Clue / answer — page scroll | Repaired in Findings 1–7 |
| Schema-max Clue / answer — internal clipping + distance-first type | Repaired in R1–R5: reclaim quiet-cognition rail budget; full-text visibility; ~20 px schema-max prompt at 720p with timer chrome |
| Authored-text oracle false-green | Repaired: scroll metrics + text-range vs clipping ancestors |
| Later choreography still absent | **Deferred** (F1 intentionally static) |

---

## J. Verification

Recorded at delivery / repair (exact commands in PR handoff):

- focused unit: visual stress fixture, Display snapshots, CategoryBoardDisplay, MediaContentDisplay;
- `git diff --check`;
- `npm run verify`;
- `npm run verify:all` (includes 1080p/720p Playwright);
- focused S05-F1 Playwright spec under `desktop-1080p` and `projector-720p`
  (Board, schema-max prompt/answer with full-text oracle, HC clue, image
  caption/attribution, reduced motion).

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

## M. Post-merge identity

| Fact | Value |
| --- | --- |
| PR | [#89](https://github.com/ricktron/classroom-quiz-show/pull/89) **MERGED** |
| Rejected head (Findings 1–7) | `cf423206615c158cfd2c9f54a6e68f95f4619dcb` → **REPAIR REQUIRED** |
| Rejected head (R1–R5) | `7dc1b92b7ba139a506ab2a64f45c291ed8b24eec` → **REPAIR REQUIRED** |
| Accepted implementation head | `1d179cffa9986ecae0274169c215d0b7a5b1da01` → **ACCEPT CANDIDATE** |
| Squash / main | `f24e9b8fe0833094949057368b468f8026767dc2` |
| Sole parent | `c3e7da4ddfebf0da2ac9c7659c5deab08691cced` |
| Accepted / main tree | **EXACT MATCH** |
| Post-merge workflows | CI, Playwright, Desktop artifacts (unsigned macOS + Windows), Pages, SonarCloud — all **SUCCESS** |
| Tranche status | **TERMINALLY COMPLETE** |
| Parent status | **OPEN / NOT TERMINAL** |

Terminal post-merge reconciliation:
[`receipts/2026-09-20-cqs-real-mvp-s05-f1-terminal-post-merge-reconciliation.md`](receipts/2026-09-20-cqs-real-mvp-s05-f1-terminal-post-merge-reconciliation.md).

---

## N. Next owner decision

**Independent exact-head review of the docs-only S05-F1 terminalization
candidate** that carries the terminal receipt and current-routing
reconciliation.

Does not authorize merge of that docs PR, additional S05 work, S04D, S06,
or S05 parent terminalization.
