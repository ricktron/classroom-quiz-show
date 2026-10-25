# CQS UI / design qualification — execution journal

- **Document id:** `CQS-UI-DESIGN-QUALIFICATION-JOURNAL`
- **Program:** `CQS-REAL-MVP-1`
- **Lane:** UI / design qualification (new lane; distinct from software-functional
  qualification)
- **Kind:** durable qualification evidence journal. **Documentation only. This
  file authorizes no implementation.**
- **Opened:** 2026-10-24

This journal records the UI/design qualification campaign so the owner does not
have to reconstruct it from chat. It records what was observed, who observed it,
what survived challenge, and what each finding's terminal disposition is.

It is **not** a status document ([`../STATUS.md`](../STATUS.md) owns status) and
**not** design doctrine ([`../design/CQS-UX-DOCTRINE.md`](../design/CQS-UX-DOCTRINE.md)
owns that).

---

## 0. Scope and boundary

**Question this lane asks.** Is the working product clear, efficient, legible,
coherent, accessible, credible, classroom-appropriate and pleasant to operate
under real teaching conditions?

**Locked prerequisite — not reopened by this lane.** Software-functional
qualification is complete and terminal:

```text
HISTORICAL COURT A REGISTER: PASS
DELTA COURT A:               PASS
FINAL SEED ROUTES:           13/13 VALID
COURT B:                     PASS  (run CBF-D1D9828F)
TEST TRUST:                  TRUSTWORTHY FOR OWNER HANDOFF
OWNER FUNCTIONAL HANDOFF:    ELIGIBLE (software-functional only)
```

Evidence: [`../receipts/2026-10-24-cqs-final-court-b-terminal-pass.md`](../receipts/2026-10-24-cqs-final-court-b-terminal-pass.md).

This lane does **not** rerun Court A population, does not start another
generalized Court B, and does not invent a functional Court C. Broad functional
qualification reopens only if a UI observation produces credible evidence that
the prior functional qualification was materially invalid, or if a UI repair
intentionally changes functional semantics. Either event is recorded here
explicitly.

**Physical facts remain out of scope.** This lane cannot and does not establish
real WebHID OS permission, real Sony/Namtai receiver behaviour, RF pairing/BIND,
LEDs, slot order, first physical press, radio or power quirks, keepalive,
reconnect behaviour, real restore duration, physical Saving-window timing,
projector hardware, room audio hardware, or the Windows physical runtime.
Findings that depend on those are dispositioned `PHYSICAL-ONLY` and routed on.

---

## 1. Phase 0 — frozen design candidate

| Fact | Observed value |
| --- | --- |
| Expected authoritative `origin/main` | `d94c36ea13a52497a28395c66b3e1259a3b12e82` |
| Observed `origin/main` after `git fetch origin` | `d94c36ea13a52497a28395c66b3e1259a3b12e82` — **MATCH** |
| Qualification worktree `HEAD` | `d94c36ea13a52497a28395c66b3e1259a3b12e82` |
| Working tree | clean (`git status --short` empty) |
| Branch | `claude/cqs-ui-design-qualification-79e756` |

Main had **not** advanced. The candidate is frozen and is not a moving target.

### 1.1 Evidence conditions

| Condition | Value |
| --- | --- |
| Runtime under test | production `vite build` bundle served by `vite preview` at `http://localhost:4173/classroom-quiz-show/` — the same base path and hash routing GitHub Pages serves, not a dev-server approximation |
| Browser | Playwright-bundled Chromium (`playwright-core` 1.61.1) |
| OS | macOS 26.5.1, arm64 (Darwin 25.5.0) |
| Node | v22.23.2 |
| Device pixel ratio | 1 (Playwright default); no OS zoom applied |
| Theme | `default` for the main baseline; `high-contrast` captured separately |
| Reduced motion | **forced on for every shot** (`prepareDeterministicCapture`: `emulateMedia({ reducedMotion: 'reduce' })` plus `animation: none` / `transition: none`) |
| Fonts actually loaded | **no web fonts exist in this product.** `src/styles/themes.css` declares system stacks only — `--font-sans: system-ui, -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif`; `--font-serif: ui-serif, 'Iowan Old Style', …`; `--font-mono: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace`. On this macOS host the sans resolves to the system UI face, **not** Segoe UI. Windows teachers will render Segoe UI. That substitution is an evidence limitation of this lane, recorded rather than ignored. |
| Screenshot method | Playwright `page.screenshot`, viewport-clipped and full-page variants, after animations are disabled |

**Reduced-motion caveat.** Because reduced motion is forced for determinism,
this baseline judges the **reduced-motion rendering** of every surface. That is
the stricter case for `CQS-UX-P15` (reduced motion must remove theatrical motion
but preserve necessary state feedback) and the right default for still-image
review. It means this lane makes **no claim** about the quality of the animated
choreography itself; motion timing and feel are reviewed only where static
evidence or source reading supports a conclusion, and are otherwise left to the
owner playthrough.

### 1.2 Viewports

Repo-canonical dimensions only. No new viewport standard was invented.

| Label | Dimensions | Source of the standard | Role |
| --- | --- | --- | --- |
| `laptop-1366x768` | 1366×768 | `tests/e2e/helpers/preOwnerVisualHistoryCapture.ts` (`PRE_OWNER_VIEWPORTS.laptop`) | teacher laptop |
| `projector-1920x1080` | 1920×1080 | `playwright.config.ts` project `desktop-1080p` | classroom projector, full HD |
| `projector-1280x720` | 1280×720 | `playwright.config.ts` project `projector-720p` | classroom projector, constrained |

### 1.3 Run-owned resources

| Resource | Ownership marker | Release |
| --- | --- | --- |
| `vite preview` on port 4173 | started by this run with `CQS_UI_COURT_RUN=1`; pid recorded in the run scratch directory | released at the end of the campaign |
| Playwright browser contexts | created per capture test; every page the run opens is tracked in an `owned` list | closed in each test's `finally`, including on failure |
| Screenshot / metrics output | run-owned scratch directory outside the repository | retained for the campaign, not committed |

No unrelated user process is touched.

---

## 2. Phase 1 — rendered baseline

Harnesses added for this lane (test-only; no product code):

- `tests/e2e/ui-court-baseline-capture.spec.ts` — the rendered baseline. Gated
  on `CQS_UI_COURT_CAPTURE=1` and an explicit `CQS_UI_COURT_OUT`, so it never
  runs or writes in an ordinary `npm run test:e2e`.
- `tests/e2e/ui-court-metrics-probe.spec.ts` — objective rendered metrics
  (composited text contrast, interactive target sizes, focus-indicator computed
  styles, type scale, horizontal overflow) read from the real DOM.

Both are **evidence instruments**: they assert nothing about the product and
change nothing. States are reached through ordinary teacher routes — Home →
import → Class Setup → Start Game → play — with game content authored as test
data and imported through the product's own Home import, which is what a teacher
does. No state is reached by mutating the store, and the baseline does not use
Advanced diagnostics for gameplay.

**Honesty rule built into the harness.** Every intended state records either a
`CAPTURED` row with its file or a `MISSING` row with the reason, in
`manifest.json`. A partial baseline therefore cannot present itself as complete,
and an unreachable state becomes findings-input rather than a silent gap.

### 2.1 Instrument corrections made before any reviewer saw the evidence

Four defects in this lane's own instruments were found and fixed. They are
recorded because they change how earlier numbers should be read, and because a
court that does not audit its own instrument is not a court.

| # | Defect in the instrument | How it was caught | Correction |
| --- | --- | --- | --- |
| 1 | The repo's Playwright config leaves `actionTimeout` unset, which means **no limit**. One blocked control stalled the whole run and lost the evidence for every later state. | the run sat on a single click for minutes | bounded `actionTimeout` (8 s) and `navigationTimeout`; every journey step isolated so one failure records a `MISSING` row instead of ending the run |
| 2 | **Captures were mislabelled.** The Final sequence used silent `.catch()` between steps, so when "lock responses" was refused (no team response had been recorded yet) the journey drifted on while later shots kept claiming `final-judging`, `final-settled` and `completion`. The "game complete" capture actually showed an unfinished Final. | opening the PNG and reading it, rather than trusting the label | every Final transition now asserts its own postcondition; eligible teams are read off the Host rather than assumed; a step that fails is recorded, not skipped past |
| 3 | Viewport-clipped shots labelled "above the fold" inherited whatever scroll position the preceding interaction left behind, so the label was false. | comparing `setup-ready-viewport` against the top of that page | a viewport shot with no explicit scroll target now scrolls to the top first |
| 4 | The metrics probe treated the contents of a **closed `<details>`** as visible: those descendants still report a non-zero bounding box but are not painted and have empty `innerText`. This produced a false "43 visible buttons have no accessible name" and three false contrast failures on every Host and Setup state. | the claim was implausible, so it was checked against the live DOM before being reported | visibility now uses `Element.checkVisibility` plus an explicit closed-`<details>` exclusion |

Correction 4 matters to the verdict: after it, the measured result is **zero
WCAG AA contrast failures and zero unnamed interactive controls** on every
probed state. The earlier alarming numbers were the instrument, not the
product, and were never shown to a reviewer.

---

## 3. Baseline inventory

**183 captured states and observations; 12 intended states not reached.**

| Surface group | Captured |
| --- | --- |
| `authoring/` | 16 |
| `display/` | 44 |
| `home/` | 13 |
| `host/` | 41 |
| `media/` | 3 |
| `recovery/` | 5 |
| `setup/` | 28 |
| `stress/` | 14 |
| `summary/` | 4 |
| `system/` | 15 |
| **Total** | **183** |

Stress coverage includes the product maximum of eight teams, very long category
titles and prompts, an authored image clue, and the malformed-import path.
Projector states were captured at both 1920×1080 and 1280×720.

### 3.1 Evaluation aids (labelled, not product evidence)

56 **distance aids** were derived from the projector captures to approximate
viewing from the back of a room through mediocre optics: downscale to 30%, a
light blur, then scale back to the original box. Nothing is added, moved,
recoloured or removed, and no aid is presented as a capture of the product.

### 3.2 Objective rendered metrics

A second instrument read the real DOM at 23 states: composited text contrast
against the actually painted backdrop, interactive target sizes, accessible
names, focus-indicator computed styles at each Tab stop, type scale, and
horizontal overflow. Headline results, after correction 4 above:

- **Contrast:** 0 WCAG AA failures across all probed states, Host and projector.
- **Accessible names:** 0 visible interactive controls without one.
- **Horizontal overflow:** none at any probed viewport.
- **Focus indicator:** a consistent 3 px solid outline at every Tab stop sampled.
- **Target size:** a small number of controls render below the product's own
  declared `--target-min: 44px`, the most classroom-relevant being the live
  scoring target controls at 18×18 px. Whether their effective hit area is
  larger is a question for the accessibility bench, not for the instrument.

### 3.3 States not reached, stated plainly

| State | Reason | Reading |
| --- | --- | --- |
| `authoring-discard-confirm` | no discard confirmation is offered when leaving an untouched new game | expected product behaviour, not a gap |
| `host-session-summary` via "end early" | panel not visible after that route (it **was** captured after a Final completion) | route-dependent; left to the benches |
| `authoring-preview`, `authoring-team-count` | not present while editing an already-populated game | possibly conditional by design |
| `setup-sound-task`, `setup-audio-test`, `setup-panic-mute`, `setup-display-task`, `setup-display-preview` | not visible at Class Setup in this journey | the optional-facts group was captured; these sub-surfaces were not |
| `host-audio-controls` in play posture | not visible; a chrome-level mute control is present instead | routed to the accessibility bench as an explicit question |
| `reset-class-session`, mid-game escape | the preceding escape step could not complete | harness limitation |

These are recorded as findings-input, not written off.

---

## 4. Findings register

_Pending._

---

## 5. Disposition register

_Pending._

---

## 6. Owner decision docket

_Pending._

---

## 7. Physical-only follow-ups

_Pending._

---

## 8. Non-claims

This journal does **not**:

- claim software-functional qualification was re-performed or re-validated;
- claim any physical hardware, projector, audio, or Windows-runtime fact;
- claim any external bibliography source was read beyond what
  [`../research/CQS-UX-UI-REFERENCE-BIBLIOGRAPHY.md`](../research/CQS-UX-UI-REFERENCE-BIBLIOGRAPHY.md)
  records (every entry there is `OWNER-SUPPLIED-RECOMMENDATION` /
  `NOT-YET-INGESTED`);
- claim owner acceptance of any surface;
- authorize product scope, roadmap advancement, or release claims;
- replace [`../STATUS.md`](../STATUS.md) or any ADR.
