# CQS Display visual convergence

- **Objective:** pre-owner-playthrough Audience / Display visual convergence
- **Authorized base:** `4678c9223f8fa7e7129dca6d2a86ea9c6a0cef30`
- **Working branch:** `feat/display-visual-convergence`
- **Status:** ACTIVE — near-MVP owner-playthrough candidate after machine-evaluable visual polish
- **Authority:** repository implementation/contracts remain authoritative; uploaded Claude Design artifacts are preferred design evidence, not source code or product authority
- **Typography posture:** system fonts only (`--font-sans` / `--font-display` alias); bounded `--type-projector-*` roles; no remote/bundled fonts

## 1. Definition-of-done ledger

| Obligation | State |
| --- | --- |
| Claude artifacts inventoried | VERIFIED (preferred evidence; bytes not committed) |
| Current canonical Display implementation observed | VERIFIED |
| Phase 2B direction reconciled | VERIFIED |
| Current S05 visual historian inspected | VERIFIED (`2026-09-s05-complete`, immutable) |
| Discrepancy matrix | VERIFIED |
| Bounded implementation plan | VERIFIED |
| Presentation-only convergence implementation | VERIFIED (CSS + presentation selector dedupe) |
| 720p / 1080p / 1–8 team stress verification | VERIFIED — gated review captures + workflow gap e2e + Score Column geometry repair |
| Reduced-motion / high-contrast verification | VERIFIED — theme/S05-F1 suite + HC/RM review frames |
| Integrated COURT review | VERIFIED — Hearing 7 evidence-closure + near-MVP polish COURT (8 questions) |
| Authoritative coverage matrix | VERIFIED — agent-store matrix (unit vs browser vs visual classes) |
| System-font canon + Display typography inventory | VERIFIED — Option A scale/weight/spacing; inventory in agent store |
| Near-MVP machine-evaluable visual polish exhausted | VERIFIED — typography/formatting/visual COURT; remaining items owner-only/physical |
| Post-convergence historian milestone | DEFERRED TO LATER AUTHORIZED QUALIFICATION — owner gate after playthrough |
| Owner-playthrough candidate handoff | OWNER PLAYTHROUGH PENDING — near-MVP gate handoff; not merged; S05 not terminal; do not ask Rick until READY |

## 2. Evidence hierarchy

1. observed merged code, tests, configuration and Git history;
2. CQS product contract, current REAL MVP canon, accepted ADRs and UX doctrine;
3. accepted Phase 2B Audience direction;
4. current S05 historian archive;
5. uploaded Claude Design artifacts as preferred visual evidence.

The existing `2026-09-s05-complete` historian archive is immutable.

## 3. Current vs preferred discrepancy matrix

| Area | Current S05 candidate | Preferred direction | Why it matters | Ownership | Classification |
| --- | --- | --- | --- | --- | --- |
| Display shell | vertically stacked application-style header + content + footer | one broadcast-stage composition with identity, central Nexus, primary gameplay and rail | stronger center of gravity and distance reading | `AudienceDisplayShell.css` | IMPLEMENT BEFORE OWNER PLAYTHROUGH |
| Top region | product/status lines all centered above Nexus | public-safe identity left, Nexus centered, coarse context right | makes Nexus the persistent answer to “where are we?” | shell / Nexus | IMPLEMENT |
| Authored game/class identity | not present on public wire by design | Claude examples show authored game/class identity | copying it would cross privacy/PublicState boundary | PublicState + shell | PRESERVE COMPATIBILITY; do not implement |
| Board prominence | readable board inside a rounded application panel | board is the stage; stronger bounded tiles and header rules | board should dominate rather than feel embedded in a dashboard | `CategoryBoardDisplay.css` | IMPLEMENT |
| Scores | correct adaptive layouts, but strip/deck cards consume excessive height | compact, stable, secondary score readouts | returns vertical budget to gameplay while preserving 1–8 teams | `TeamScoreboard.css` | IMPLEMENT |
| Nexus Core | functionally complete, but visually one more centered bar | persistent visual anchor in top composition | establishes stable public status locus | shell / Nexus CSS | IMPLEMENT |
| Signal Rail | full-width status card with little signature distinction | compact/expanded/Final stage band, visually consistent across states | common learned status object | shell / SignalRail CSS | IMPLEMENT |
| Prompt reading | safe and legible, but framed as a large centered card | quiet cognition: broad reading stage, reduced chrome | shared attention belongs on the question | board/media CSS | IMPLEMENT |
| Correct/incorrect/pass | durable truth is present but consequence can collapse to a thin status line | bounded consequence band, still subordinate to prompt when appropriate | game-show feedback without chaos | BoardOutcome CSS | IMPLEMENT |
| Final | semantics complete; setup/reveal can feel sparse/generic | deliberate full-stage Final posture | Final should feel like a distinct game phase | Final CSS | IMPLEMENT |
| Winner/completion | correct result but generic panel treatment | ceremonial, photographable, bounded completion | earned spectacle and clear closure | Final CSS | IMPLEMENT |
| Motion | remount-safe semantic acknowledgements already implemented | quiet cognition + bounded consequences | preserve lifecycle truth; do not replace with decorative continuous motion | existing S05 choreography | PRESERVE |
| Future round types | shell primitives already separate from category board | keep shell/Nexus/scores/rail generic | avoid category-board-only architecture | audience shell | PRESERVE |
| High contrast / reduced motion | explicit existing modes and tests | retain full semantic parity | accessibility is structural | tokens/tests | PRESERVE + VERIFY |

## 4. Bounded implementation plan

### Reference convergence

1. Recompose the active header using CSS into left public-safe identity, centered Nexus Core and right public game context.
2. Reduce score-card footprint while preserving adaptive Column / Strip / Deck modes, authored order, long names and negative scores.
3. Strengthen board geometry with restrained square/bounded surfaces and category structural rules.
4. Turn open-clue presentation into a broader reading stage with less card chrome.
5. Give Signal Rail a consistent structural band treatment without inventing public queue data.
6. Make durable board outcomes visibly consequential even after transient acknowledgement ends.
7. Give Final and completion a full-stage hierarchy, with stronger winner emphasis.
8. Suppress duplicate Nexus round/stage labels (e.g. ended game “Game complete”).
9. Visually retire accessible page title and Nexus brand from the active broadcast stage while keeping them available to AT / waiting scenes.

### CQS-specific improvements

- Keep the existing semantic/remount-safe S05 motion ownership rather than copying prototype-only animation.
- Keep the accepted two-theme token system and no new font/dependency.
- Keep Score Column / Strip / Deck thresholds from accepted Phase 2B, even where an individual Claude frame shows only four teams.
- Keep used-state text and non-color structure rather than relying on dimming alone.
- Prefer left product identity over duplicating brand inside the Nexus during active play.

## 5. Intentional deviations from Claude references

### Authored game/class identity

The public DTO intentionally omits the game title, round identifiers/labels and authored configuration. The convergence therefore uses only already-public product/session context in the top region. Publishing authored identity would require a separate PublicState/privacy decision and is outside this tranche.

### Typography

Claude prototypes use externally loaded typefaces. CQS keeps the existing dependency-free system typography for this tranche. Typography hierarchy and density converge without introducing a remote/runtime dependency.

### Projector environment

The accepted Slice 17 design-system direction specifies the flat projector canvas. This tranche does not restore prototype-only ambient motion or decorative effects that would compete with quiet cognition.

## 6. COURT hearing 1 — composition and spatial ownership

**Question:** What is the highest-value convergence work before owner playthrough?

**Evidence:** current S05 historian, current shell/component code, accepted Phase 2B direction, Claude Phase 1/2 examples and CQS UX doctrine.

**Finding:** current implementation is semantically strong and stress-safe but still reads as a styled application page. The target should read as one student-facing broadcast stage. The largest material gaps are shell hierarchy, score density, Nexus centrality, prompt chrome, consequence weight and Final/completion staging.

**Decision:** proceed with presentation-only CSS convergence. Do not change PublicState, schemas, sync, reducers, scoring, persistence or round registry. Preserve the current lifecycle-safe choreography.

**Owner gate:** none required for this tranche. Any later proposal to publish authored game/class identity or change an accepted score-layout rule requires Rick's decision.

## 7. Verification requirements

The candidate must preserve the repository-defined checks and the existing evidence around:

- Audience privacy and fail-closed rendering;
- category board flow;
- buzz and active-claim flow;
- board outcomes;
- Final and completion;
- recovery;
- 1920×1080 and 1280×720;
- 1–8 teams;
- schema-max/long content;
- negative/extreme scores;
- high contrast;
- reduced motion;
- clipping and overflow.

No green test substitutes for the final integrated COURT review or owner playthrough.

Review captures (non-historical):

```bash
CQS_DISPLAY_VISUAL_REVIEW=1 npx playwright test \
  tests/e2e/display-visual-convergence-review.spec.ts \
  --project=desktop-1080p --project=projector-720p
```

Outputs land under `test-results/display-visual-review/` and must not overwrite
`docs/design/history/2026-09-s05-complete/`.
