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

## 4. The courts that sat

Eleven independent reviews, none of which saw another's conclusions before
filing. Reviewer identity, remit and blindness state:

| Review | Remit | Saw doctrine? | Saw other reports? |
| --- | --- | --- | --- |
| `FI-1` | first impression, teacher, 20 Host/Home/Setup states | **no** — screenshots only | no |
| `FI-2` | first impression, student at the back of the room, 24 projector states plus the distance aids | **no** — screenshots only | no |
| `ZE` | zero-explanation teacher: drive a live build and run a quiz, no docs; 32 interactive runs, task **completed** (30-clue board authored, projector opened, clues played, full Final, finished at a named winner) | **no** — the running product only | no |
| `BENCH-A` | teacher/operator UX, information architecture, cognitive load, classroom pressure P1–P8 | yes | no |
| `BENCH-B` | student/projector experience and distance legibility | yes | no |
| `BENCH-C` | visual design, hierarchy, cross-surface consistency sweep | yes | no |
| `BENCH-E` | accessibility and ergonomics | yes | no |
| `BENCH-F` | game UX and game feel | yes | no |
| `BENCH-G` | content and microcopy | yes | no |
| `BENCH-H` | hostile / devil's advocate | yes | **yes, by design** |
| integrator | consolidation, measurement, disposition, repair | yes | yes |

Phase 2's blindness held: FI-1, FI-2 and ZE read no repository file, no doctrine,
no bibliography and no prior finding. Their raw interpretations were recorded
before any intent was explained to them.

**The zero-explanation court earned its cost.** It was the only review that
authored a game from scratch rather than being handed a valid fixture, and it
is the only one that found `UIX-O16` — the campaign's highest-severity finding.
It also independently corroborated `UIX-O01` ("Mark correct is top-right;
Award full value is ~1200px further down the same page. Every single clue needs
both"), `UIX-O02` (the pairing wizard expanded during play) and `A-11` (the
heading printed three times), having never seen those reports.

It is also the strongest positive evidence in the campaign. Once a valid game
was running, the reviewer understood live play with no help at all and said so:
the `ON THE DISPLAY NOW` pill, the `HOST ONLY` cards, the
`Show prompt → Show answer → Return to board` sequence, and the
`Needs content / Ready / USED` tile labels were each recorded as "instantly
clear". The product's core loop does not need explaining. Getting *to* it
does.

Bench H's job was to attack the other ten, and it did — including filing a
process criticism against the integrator (see §4.1). Where H's challenge was
itself wrong, the integrator measured and says so below. Opinions were not
averaged.

### 4.1 A process failure in this lane, recorded rather than quietly fixed

Bench H observed that eleven CSS files had been edited in the working tree
**after** the last bench filed and **before** H read the code, and filed it as
`H-01` at HIGH: the benches' line numbers no longer resolved, and six findings
were therefore *edited* rather than *evidenced as closed*.

The criticism was correct when it was made. The integrator had applied repair
tranche 1 between the benches filing and H sitting. What H could not see is
that the tranche had already been captured and measured before/after and run
through the full suite; that evidence is in §6 and the tranche is committed
with it. The finding is **accepted and answered with evidence, not with an
assertion**, and the lesson is recorded: in a frozen-baseline campaign, repairs
belong after the last reviewer has read the tree, or the reviewer must be told
which tree they are reading.

Two further consequences were real and were fixed:

- the high-contrast metrics captured mid-campaign described the pre-repair tree,
  so they were re-captured after each tranche;
- Bench E's biggest stated caveat — that its 1.71:1 high-contrast figure was
  arithmetic rather than observation — was closed by capturing the Host in high
  contrast, which reproduced E's number exactly (`rgb(11, 63, 107)` ring).

---

## 5. Findings register and disposition

116 raw findings were filed. After de-duplication they reduce to 34 distinct
findings in 10 clusters. Every one has a terminal disposition; there are no
orphans.

### 5.1 REPAIR — landed in this lane

| Id | Finding (cluster) | Benches | Severity | Evidence of repair |
| --- | --- | --- | --- | --- |
| `UIX-R01` | The shared `:focus-visible` rule omitted `input`, `select`, `textarea`, `summary`; Class Setup's readiness cards drew their own 2 px ring at 2.41/2.00:1, and 1.71:1 in high contrast; one setup `outline` declaration was syntactically invalid and drew nothing | E-02, E-03, E-09 | HIGH | non-product focus rings across 104 recorded Tab stops: **24 → 0** |
| `UIX-R02` | Seven referenced custom properties were never defined, so light-theme hex fallbacks painted on dark surfaces and ignored the high-contrast theme; `--bw-emphasized` was a typo for `--bw-emphasis` at 23 sites | C-06, F-07 | MEDIUM | dead token references: **8 → 0** |
| `UIX-R03` | `--surface-input` was declared in all three themes and consumed by nothing, so every field a teacher types into rendered as a browser-default white box | C-05 | MEDIUM | before/after captures of Authoring, Class Setup and Home import |
| `UIX-R04` | Buzzer-slot and handset-team selects rendered at the UA default 19 px; the live timer-length select used a hand-rolled 2.5 rem, 4 px under the product's own token | E-08 | MEDIUM | targets under `--target-min`: **61 → 23** (the remainder are radio glyphs inside 44 px labels, which are correct) |
| `UIX-R05` | The product's only destructive styling was dead CSS: `.fwh__confirm` declared red on the irreversible end-of-run confirm and lost the cascade to `.btn`, rendering as the affirmative blue primary | H-02, C-01 | HIGH | H's pixel histogram of the rendered button: 16,202 px blue, 738 px white, **zero red** |
| `UIX-R06` | `.btn--destructive` itself paired white text with `--state-danger` at **2.77:1** — below AA. Found while repairing R05 | integrator | HIGH | repaired to `--fg-on-danger`, the token that exists for the pairing (~7:1) |
| `UIX-R07` | Award and Deduct rendered at identical filled-primary rank; once Award disabled itself after an award, Deduct became the single loudest enabled control in the panel | A-02, C-03, FI-1 | HIGH | metrics confirm `tsp-award-full disabled:true`, `tsp-deduct-full disabled:false`; Deduct demoted to secondary |
| `UIX-R08` | The control that decides where points land was the only place a team appeared without the accent colour used on the scoreboard, the projector and the buzzers | A-09 | MEDIUM | swatch added; colour stays strictly redundant |
| `UIX-R09` | A per-session fact ("Team 2 buzzed in.") sat unlabelled beneath per-clue facts, inside an `aria-live` region, so it outlived the clue it described | A-04 | MEDIUM (H-downgraded from HIGH) | scoped to "Last buzz key press: …" |
| `UIX-R10` | The always-visible emergency mute stayed enabled and did nothing once muted — `CQS-UX-P08`'s named anti-pattern, on a control drawn identically to its action neighbours | G-05, E-05 | HIGH | now disables and reads "All sounds muted", matching the product's own `Connect buzzers` → `Buzzers connected` precedent |
| `UIX-R11` | The projector printed **"Response ready"** in the branch where buzzers are **not** armed, four words from its own "BUZZERS NOT ARMED" chip | G-01, F-02 | HIGH (H-downgraded from VERY HIGH) | now reads "Buzz-in closed" |
| `UIX-R12` | A dead branch made every public team strip read READY whether or not buzz-in was open; the armed test had no effect | G-02 | HIGH | unreachable branch collapsed; **the public word itself is routed to the owner**, because it depends on what the strip means |
| `UIX-R13` | The projector's live-state words were hard-capped under ~18 px and barely grew with the screen, while the clue text and winner headline scale properly | E-06, B-01, B-03, B-05, E-07, F-01, F-03 | HIGH | measured, see §6.2; the remaining ramp is routed |
| `UIX-R14` | Permission-recovery copy told the teacher to use "Connect classroom buzzers" — a control that exists nowhere | G-06, A-11 | MEDIUM-HIGH | one string; no defence found by any reviewer |
| ~~`UIX-R15`~~ | The library heading reads "Your Games" while every message about it says "My Games", which doctrine §3 names as the approved term | G-11 | MEDIUM | **WITHDRAWN — see §6.4.** The locked Court B suite selects this list by `aria-label="Your Games"`. Routed as `UIX-O09`. |
| `UIX-R16` | The Buzzers section rendered its own heading twice with nothing between | A-11, C-12 | MEDIUM | inner block renamed to what it contains |
| ~~`UIX-R17`~~ | The live glance line joins four readiness facts and one sub-clause with the same separator, so it reads as five peers with one in lower case | G-07 | LOW (H: preference) | **WITHDRAWN — see §6.4.** Court B asserts the exact string. Routed as `UIX-O09`. |
| `UIX-R18` | One irreversibility promise, four phrasings, including a contraction that reads softer than its neighbours | G-12 | MEDIUM | normalised on the round-progress path |
| ~~`UIX-R19`~~ | One control changes its object noun between resting and armed: resting "End the game session", armed "End the game — this cannot be undone" — attaching irreversibility to the word Home uses for the thing it deletes | G-03 | HIGH | **WITHDRAWN — see §6.4.** Three Court B specs click this control by that exact label. Routed as `UIX-O09`. |

### 5.2 ACCEPT AS DESIGNED / NOT A DEFECT

| Finding | Why it does not stand |
| --- | --- |
| `B-06` eight-team scoreboard "clipped" at 1280×720 — called "the cleanest finding in the court" by Bench H, and said to contradict a TERMINALLY COMPLETE claim | **Measured and overturned by the integrator.** At 1280×720 the public scoreboard's bottom sits at y=713 of 720, and `document.scrollHeight` equals the viewport at every team count: nothing is clipped and nothing overflows. The 7 px below it is the audience shell's own padding. At two and four teams the gap is 99 px; at six and eight it is 7 px, because the scoreboard grows to use the frame. The PNG reads as cut off; the DOM says it is not. Whether a real projector's overscan would crop those last pixels is `PHYSICAL-ONLY`. |
| `FI-1` "Award full value is still live after an award, inviting a double award" | Factually wrong. The metrics record that exact control as `disabled: true`. The real defect on that screen is the opposite one, and it is repaired as `UIX-R07`. |
| `FI-2` "the score award is invisible — the most serious failure" | Contradicts a settled owner decision. Surface inventory §18 settles the score-change moment as Path S-C: immediate static authoritative total, no count-up, flash, transition or re-sort. The *size* of the numeral is a live question and is covered by `UIX-R13`. |
| `B-03` / `FI-2` "arming REMOVES the emphasis glow" | Capture artifact. The cyan prompt ring is a 420 ms reveal acknowledgement (`PRESENTATION_ACK_HOLD_MS`), so two frames captured 420 ms apart differ for that reason in any run. |
| `FI-1` "three screens show three different timer lengths (45/60/5)" | Three differently seeded scenarios, not one drifting field. The baseline index names the 5-second one. |
| `FI-1` "the editor's 6×5 board becomes a 2×3 game at play time" | Two different fixtures. FI-1 was blind by design and had no manifest. |
| `E-11` the Home "Open Display" link is 96×24, under the 44 px token | Demonstrably intentional: it is an inline text link, the adjacent copy calls it "optional escape; not a class-start action", and a unit test asserts it must not carry `.btn`. |
| Scoring-target radios measure 18×18 | Not a defect. The wrapping `<label>` is 44 px with `min-height`, and `:focus-within` draws the full product ring around the whole pill. The instrument under-reported it twice. |
| `A-05` Class Setup opens with Buzzers as the dominant task while Names blocks Start | Downgraded to an owner preference. The source states the rationale ("Workflow selection (Buzzers-first) is separate from required readiness emphasis"), Buzzers is the only step with a physical dependency and a long tail, and the required blocker is still amber-railed with a live count above the fold. |

### 5.3 INSUFFICIENT EVIDENCE

| Finding | What would settle it |
| --- | --- |
| "Completion says a summary was saved while the ledger says none exist" (`FI-1`) | The two captures come from different harness sessions, and FI-1 flagged the substitution. A genuine contradiction here would be severe. One deliberate single-session check: complete a game, then open More → Advanced → the ledger without leaving the session. |
| Authoring accessibility | Zero metric files cover the Authoring surface. No claim was made in either direction. |
| Whether `reset-class-session` is genuinely unreachable after a mid-game escape | The harness could not complete the escape step. If it is a product fact it belongs with `UIX-O14`. |

---

## 6. Repairs: before and after

Three tranches landed. Each was captured at the same states and viewports
before and after, re-measured, and run through the full suite.

### 6.1 Tranche 1 — focus and design-token integrity (CSS only)

| Measure | Before | After |
| --- | --- | --- |
| Tab stops drawing a non-product focus ring (of 104 recorded) | 24 | **0** |
| Interactive targets under the product's own `--target-min` | 61 | **23** |
| Dead custom-property references in component CSS | 8 names, 31 sites | **0** |
| WCAG AA text failures | 0 | **0** (no regression) |
| States with horizontal overflow | 0 | **0** |

The remaining 23 sub-token targets are the scoring radio glyphs inside their
44 px labels and full-width `<summary>` rows, both of which are correct.

### 6.2 Tranche 2–3 — Host hierarchy, status honesty, terminology

Repairs `UIX-R05` through `UIX-R12` and `UIX-R14` through `UIX-R19`. The
destructive-confirm repair is the one worth stating in numbers: the armed
"end the run" control rendered 16,202 px of affirmative blue and no red at all,
despite the codebase containing a destructive declaration written for exactly
that control.

### 6.3 Tranche 4 — projector live-state legibility

Measured on the real DOM at both projector viewports, same states:

| Public element | 1280×720 | 1920×1080 |
| --- | --- | --- |
| Active team name ("Team 1") | 28 → 28.2 px | 28 → **41.6 px** |
| Team channel name ("TEAM 1") | 12.2 → **16 px** | 13.6 → **20 px** |
| Team channel state ("ANSWERING") | 12.8 → **14.7 px** | 13.6 → **18.4 px** |
| Active-claim label ("ANSWERING") | 12.8 → **15.4 px** | 13.6 → **19.2 px** |
| Arming chip ("BUZZERS ARMED") | 13.4 → **16 px** | 14.4 → **20 px** |
| Adjudication verdict ("Correct") | 18.4 → **23.7 px** | 18.4 → **30.4 px** |
| Scores label | 14.1 → 14.1 px | 14.4 → **22.4 px** |

Checked for regression after every step: no AA failure, no horizontal overflow,
and the eight-team scoreboard fit is **byte-identical** (bottom y=713 of 720;
y=1068 of 1080).

**One raise was attempted and reverted.** Lifting `--type-projector-team`
also drove the Score Column's name track, and grew it from under 140 px to
175 px in the one-team case — breaking a landed S05 display-convergence
guarantee ("1-team Score Column stays readable without inventing peers").
The guard caught it, the token went back, and the projector gains kept here
come from the signal-rail component rules, which that guarantee does not
constrain.

**Stated honestly: 1280×720 gained much less than 1920×1080.** At 720p the
`vw` term in these clamps binds before the ceiling does, so raising the ceiling
alone cannot help there. Closing that gap means changing the `vw` coefficients
on a surface whose comments record a deliberate densification to preserve
schema-max prompt and eight-team coexistence, which is why the remaining ramp
is routed as `UIX-O06` rather than pushed further here.

### 6.4 Four repairs withdrawn, and what that revealed

Four copy repairs were implemented, verified against the unit suite, and then
**reverted** after the full Playwright run.

| Withdrawn | Why |
| --- | --- |
| The full Game/Session vocabulary sweep (`A-12` / `G-03`) | broke **42** tests across the locked Court B suite, which clicks the end-of-run controls by visible name |
| `UIX-R19` — the armed confirm label naming the Session | three Court B specs click `'End the game — this cannot be undone'` verbatim |
| `UIX-R17` — the status-line separator | `court-b-g-buzzer-resume-notice` asserts `'Buzzers optional · keyboard works'` verbatim |
| `UIX-R15` — "Your Games" → the doctrine's "My Games" | Court B (and Q7) select the library by `getByRole('list', { name: 'Your Games' })` |

**The finding underneath the finding.** Teacher-visible copy in this product is
pinned, verbatim, by the qualification suites that prove it works. That is not
a defect in the tests — it is what makes them trustworthy — but it has a
consequence this court has to state plainly:

```text
microcopy repair in CQS is never a free change.
It is always, also, a change to qualification evidence.
```

This lane's own authorization lets it repair "inconsistent labels" and
"terminology drift" without asking. It does **not** let it rewrite the evidence
base of a terminal functional qualification that the mission names as a locked
prerequisite. Where those two met, the lock won, every time, and the repair was
routed instead. Three copy repairs that no reviewer disputed are therefore
sitting in the docket rather than in the product, and the owner should decide
them together with the Court B selector updates they require.

Copy repairs whose strings no Court B spec asserts — the false "Response ready"
on the projector, the stale "Connect classroom buzzers", the unscoped buzz
sentence, the duplicated heading, the contraction — all landed.

---

## 7. Owner decision docket

Fifteen items. Nothing here is a repair the integrator was authorised to make
alone: each is a product-meaning decision, a change the surface inventory
reserves to the owner, or a piece of work with no small correction.

### `UIX-O01` — The scoring target never follows the team that buzzed (VERY HIGH)

**Evidence.** `src/host/TeamScoringPanel.tsx:145` holds the scoring target in
component state, initialised to nothing, with no reconciliation against the
buzz queue anywhere in the file. It persists across clues. Bench H tried to
knock it down and could not, and found the guard that might have caught it does
not: `alreadySubmitted` is keyed on the *target*, so awarding the **wrong** team
is never blocked — only awarding the right team twice is. Found independently by
a blind reviewer with no source access.

**Classroom consequence.** On clue 2 the teacher marks Team 3 correct in one
panel, scrolls to another panel two viewports away, presses Award, and the
points land on whichever team was selected during clue 1. The error is silent,
public on the projector, and costs an Undo plus a re-select plus a re-award in
front of the class.

- **Option A** — when an adjudication resolves an active team, set the scoring
  target to that team. Fastest for the common case; changes behaviour, and the
  teacher must notice when they want to score a team that did not buzz.
- **Option B (recommended)** — clear the target when a new tile opens, so the
  panel falls back to its existing "Choose a scoring target above" state.
  Preserves the deliberate adjudication/scoring separation and the
  score-a-non-buzzing-team case; costs one extra click per clue.
- **Doing nothing** leaves the highest-consequence silent error in the product.

Why this is not an autonomous repair: both options change live workflow, and
the separation of adjudication from scoring is a declared product position.
Mitigation already landed: `UIX-R07` and `UIX-R08`.

### `UIX-O02` — The buzzer configuration workbench renders expanded under the live console (HIGH)

Mid-game, roughly 45% of the Host page's scroll length is hardware setup and
diagnostics, rendered open, including a staged-capture editor with its own
Apply/Discard state — during play and during Final. This is `CQS-UXF-01`, the
project's own recorded "diagnostics wall" finding, relocated into gameplay.
Every sub-block is already a `<details>`; the change is which ones default open
after Start, and the panel must stay *mounted* for the gamepad poll loop, which
does not require staying *expanded*.

Routed rather than repaired because surface inventory §12 records the Host as an
implemented foundation where "any future Host visual refinement requires fresh
owner authorization".

### `UIX-O03` — Arming and the response timer are two orthogonal switches the product never explains (HIGH)

`Arm clue` and `Start timer` are separate primaries dispatching unrelated
commands, with no stated ordering and no guard. A running or expired clock on an
un-armed clue is reachable, and the baseline captured it. The teacher starts the
clock, the class watches a countdown it cannot buzz into, presses are silently
refused, and the teacher concludes the hardware is broken — which is
`CQS-UXF-04` happening again. Bench H identifies this as the root cause of three
separate microcopy findings. Either make `Start timer` arm an un-armed clue, or
state the rule on the panel. Both change meaning.

### `UIX-O04` — The Host has no fixed operating region (HIGH, no small fix)

The live game is run from a document 3,828 px tall with 52 interactive controls,
the scoring target at Tab stop 14. The teacher can never see the clue and the
control that spends it in one viewport at any resolution the product targets.
Class Setup already pins its Ready strip with a written 1280×720 rationale — the
product knows the technique and applies it to the calm surface, not the live
one. This is the structural cause of `UIX-O01`, `UIX-O02` and `UIX-O15`.

### `UIX-O05` — An image clue cannot carry a question (HIGH)

`PromptContent` is `{kind:'text'}` **XOR** `{kind:'image'}`; an image prompt has
no text field. The projector shows a picture, a category and a value, and no
question. `alt` is the accessibility string and `caption` is a short label;
neither is a question. For a science teacher this is the content type where the
question is most often *about a feature of the picture*. Adding an optional
`text` to the image variant is a schema change with import, validation,
sanitizer and Display consequences. The smallest honest interim move is a copy
one: say in the authoring surface that an image clue's question is asked aloud.

### `UIX-O06` — The remaining projector type ramp (HIGH, scope)

`UIX-R13` raised six live-state elements and verified no layout regression, but
1280×720 gained much less than 1920×1080 because the `vw` term binds first.
Closing that means changing `vw` coefficients on a surface whose comments record
a deliberate densification for schema-max prompts and eight-team coexistence.
Judge it against the worst-case fixture now in the baseline (`worstcase/`).

### `UIX-O07` — Emergency mute is one-way by design; the restore path is three interactions away (MEDIUM)

`UIX-R10` stopped the control from looking available once muted. Whether it
should become a two-way `role="switch"` is a product decision: a panic control
that can be mis-pressed back into noise is arguably worse than one that cannot,
but the readiness copy tells the teacher to "Unmute" with no unmute in reach.

### `UIX-O08` — What the public team strip should say when buzz-in is closed (HIGH)

`UIX-R12` removed the dead branch; the word itself is a product question. It
depends on whether the strip means "this team is in the game" or "this team may
buzz now". Both readings are defensible and the answer changes what thirty
students see.

### `UIX-O09` — The copy repairs the locked Court B suite pins (HIGH)

Four undisputed copy repairs are withdrawn purely because the locked Court B
qualification suite asserts their strings verbatim (§6.4). They are ready to
apply and each is a few characters:

1. **Game versus Session at every end-of-run control** (`A-12` / `G-03`, HIGH) —
   four phrasings end a class run, two of which name the reusable Game, with
   "cannot be undone" attached. Doctrine `CQS-UX-P21`. Blast radius: 42 Court B
   tests.
2. **The armed confirm label** alone (the minimal half of the above) — one
   control changes its object noun between resting and armed. Blast radius:
   3 Court B specs.
3. **"Your Games" → "My Games"** (`G-11`, MEDIUM) — doctrine §3 already names
   `My Games`, and every status message in the product already says it. Blast
   radius: 1 Court B spec, 2 Q7/MENUS specs, by `aria-label`.
4. **The status-line separator** (`G-07`, LOW) — one character. Blast radius:
   1 Court B spec.

The decision is not really about the words. It is whether this programme is
willing to update Court B's string selectors — and to re-record that the suite
was updated for a copy change rather than a behaviour change — in exchange for
the vocabulary the doctrine already chose. Recommendation: take 2 and 3 (small
blast radius, doctrine-backed), defer 1 until a lane owns it, drop 4.

### `UIX-O10` — The room is shown a verdict the scoreboard will not honour yet (MEDIUM-HIGH)

The projector shows "Correct — Team 1" with Team 1's total still reading 0, for
however long the teacher takes to scroll to the scoring panel and choose a
radio. The adjudication/scoring separation is a correct private invariant; its
consequence is published. The Final already solves this in one frame
("Correct — +50" beside the updated total). Appending the signed delta to the
board-outcome line would not touch the scoreboard and would not reopen Path S-C
— but whether Path S-C covers the outcome line is the owner's reading.

### `UIX-O11` — The projector carries a permanent operator telemetry band (MEDIUM)

Monospace status text in three corners at once — "Session ready — Playing", a
duplicated "Round 1 of 2", "No teams waiting" — none of it addressed to a
student. A monospace face is a deliberate signal that text is machine output,
applied to the one surface whose audience has no model of a machine. Decide once
whether these lines are for the room or for the teacher; the Host already states
the same facts better with its "ON THE DISPLAY NOW" chip.

### `UIX-O12` — The idle projector states one readiness fact up to seven times (MEDIUM)

Five reviewers found this screen independently and none filed above MEDIUM. It
includes an orphan "Ready" node aligned to nothing, which reads as a rendering
fault, and a fixed "Game display ready" headline that is the largest text on
screen while the line beneath it says "waiting". The headline is the
`aria-labelledby` target, so it cannot simply be deleted. Worth one deliberate
pass rather than six separate repairs.

### `UIX-O13` — The Host reflows between one and three columns on every clue (integrator finding)

Resolving a Bench A verdict it could not reach: measured on the live DOM at a
fixed 1366×768 window, `.foundation__gameplay` computes `1300px` at the board
and `528.7px 377.6px 377.6px` with a clue open, returning to one column on
"return to board". It is **not** a width-dependent reflow — it is clue-state
driven and deliberate, with a written rationale (the clue column is widest so
prompt and answer read without scrolling). It is recorded because every live
control moves on every clue, which is in tension with the one-second standard's
"controls do not move between states". Recommendation: accept as designed.

### `UIX-O14` — A finished class offers no next action on the Host (MEDIUM)

The two actions a teacher takes between fourth period and fifth live inside
More → Load a game, beside "Clear all local CQS data", in a panel whose own
first line says ordinary teachers start from Home.

### `UIX-O16` — Authoring tells the teacher a game is ready to play that the rest of the product refuses to load (VERY HIGH)

**Found only by the zero-explanation court**, because every bench was handed a
valid pre-made fixture and only a teacher authoring from scratch meets this.

**Confirmed at source level by the integrator**, not taken on the reviewer's
word:

- `src/authoring/createBlankDraft.ts:99-123` gives a blank draft a `final`
  object with **empty** `prompt` and `answer` strings — not `undefined`.
- `src/authoring/validateDraft.ts:339-350` raises its blocker only when
  `!draft.final`. An existing-but-empty Final passes; the remaining checks test
  *maximum* length, never emptiness.
- So `computeDraftStatus` does not return `blocked`, and
  `src/routes/AuthoringRoute.tsx:419-423` prints
  **"This game has the required content and can be played."**
- `src/authoring/compileDraft.ts:109-119` then emits a `final-wager` round with
  `prompt: ''`, `answer: ''`.
- `src/game/finalWager/schema.ts:57,103` requires a non-empty answer
  (`.min(1)` plus an explicit `trim()` check), so the compiled game **fails the
  canonical import boundary**.
- `src/persistence/savedDefinitions.ts:355-358` therefore records
  `playable: false`.

**What the teacher experiences**, in the reviewer's own words: Play is enabled,
and it lands on a Host screen that is blank — "only Sound is muted / Open
display / Change game / More. No board, no teams, no Start. This is the single
worst moment. With a class watching I would have been stuck here with no idea
what was wrong. The editor had told me the game 'can be played'." The real
reason is buried inside the More drawer, where the same game is listed as
"Needs more content — In progress", Load disabled, with the flatly
contradictory line **"This game is not ready to play yet."**

Two surfaces disagree about the same game's readiness, the optimistic one is
the one the teacher reads while authoring, and the pessimistic one is three
levels down in a panel that says it is not for ordinary teachers.

- **Option A (recommended)** — make the authoring validator agree with the
  import boundary: treat an empty Final prompt or answer on the
  `board-plus-final` profile as a blocker, so the editor stops claiming
  readiness it cannot deliver. Small, and it moves the truth to the surface
  the teacher is actually on.
- **Option B** — weaken the claim: say "Saved. Not yet playable — the Final
  still needs a question and an answer." Smaller still, but it leaves the two
  gates genuinely different and only renames the symptom.
- **Doing nothing** leaves a teacher able to reach class time believing an
  unplayable game is ready.

Why this is not repaired here: it changes a validation gate, which is
functional semantics, and the brief says to stop and classify that rather than
do it quietly inside a UI court. It is the one finding in this campaign that
bears on functional truthfulness, and it is narrow — the causal cone is the
authoring readiness gate, not the engine. **It is not evidence that the Court B
PASS was materially invalid**: Court B exercised imported and seeded games,
never a from-scratch draft with an empty Final.

### `UIX-O17` — Opening the Display during Class Setup can present the teacher with an offer to discard the setup they just did (HIGH)

Also from the zero-explanation court. Mid-setup, with team names entered,
clicking "Open display" replaced the setup surface with "Unfinished class
session found — Resume class / Start fresh". Team names gone from view, Start
Game gone. "Resume class" restored everything, so the data was safe — but
**"Start fresh" was offered at equal prominence, and it discards the setup**,
live, in front of a class. The reviewer self-corrected; a teacher under
pressure might not.

The reviewer also reports it as **intermittent** — "not reproducible every
time" — which is why it is routed rather than repaired: an intermittent
state-recovery trigger needs to be understood before it is changed, and
guessing at it from one observation would be the wrong kind of confidence.

### `UIX-O18` — Smaller zero-explanation findings worth a decision together (MEDIUM)

1. **The blocking readiness row is the only one with no control on it.**
   Buzzers (optional) offers Show/Skip, Display (optional) offers "Open
   display", and Names — the one thing blocking Start — offers nothing. The
   reviewer searched for a "name teams" control, found none, and clicked the
   row on a guess. Meanwhile "Connect buzzers", optional hardware, is the
   brightest button on the page. This is `CQS-UX-P02` inverted.
2. **After "Begin Final", the control that ends the run disappears**, leaving
   only "Undo Final start". The reviewer: "If the bell went at that moment I
   would not know how to stop the game." Classroom continuity (`CQS-UX-P11`).
3. **Ready-made sample games exist and are unfindable.** "Load valid sample
   file" and "Load category-board sample file" sit inside the More drawer —
   next to deliberately broken samples such as "Load sample with a duplicate
   tile id". The reviewer typed thirty clues by hand and found them afterwards:
   "Had I found these first I would have saved ~40 minutes." Home's own copy
   says "Ordinary teachers start from Home Play", and there is no Play on Home
   until a playable game exists.
4. **"Classic — positive scores only" / "Inclusive — every team plays."**
   "Classic" is a quiz-show word, not a teacher word; the reviewer had to stop
   and read the sub-label to know what it would do.

### `UIX-O15` — The post-game summary leads with a UUID and raw epoch milliseconds (MEDIUM)

`Recorded session start 1792888626502` is unreadable as a time, so the two rows
that could answer "when was this class?" answer nothing, and the most prominent
button on the panel deletes the record. Formatting the timestamps and moving the
session id behind Advanced is small; the ~60 counter rows are a scope question.

---

## 8. Research routing (Phase 11), stated honestly

The adopted doctrine settled almost every question, which is the outcome
`docs/design/README.md` §2 says to expect: external sources are an escalation
layer, not the first stop.

**No external book was cited, by any reviewer, at any point.** Every entry on
`docs/research/CQS-UX-UI-REFERENCE-BIBLIOGRAPHY.md` is
`OWNER-SUPPLIED-RECOMMENDATION` / `NOT-YET-INGESTED`, and that file states
plainly that nothing may be attributed to a chapter, argument or page until a
source's content state changes. Citing one would have been fabrication. Every
bench was told this explicitly in its brief.

| Routed question | Source state | What was used instead |
| --- | --- | --- |
| signifiers, mapping, feedback, recovery (buzzer setup, Class Setup) | `SOURCE UNAVAILABLE / NOT INGESTED` | `CQS-UX-P08`, `P10`, `P20`, and observed findings `CQS-UXF-01`–`13` |
| operator awareness under interruption (Host, readiness, timers) | `SOURCE UNAVAILABLE / NOT INGESTED` | `CQS-UX-P03`, `P04`, `P05`, the one-second standard |
| typography, legibility, scale at distance (projector) | `SOURCE UNAVAILABLE / NOT INGESTED` | `CQS-UX-P14`, plus **measured** composited contrast and type scale from the real DOM |
| player perception, game feel, buzz and score moments | `SOURCE UNAVAILABLE / NOT INGESTED` | `CQS-UX-P15`, `P16`, `P23`, and the settled Path S-C decision |
| systematic UI language, errors, recovery copy | `SOURCE UNAVAILABLE / NOT INGESTED` | `CQS-UX-P20`, `P06`, Product Contract §8.1's vocabulary table |
| structural accessibility, non-colour cues, keyboard | `SOURCE UNAVAILABLE / NOT INGESTED` | `CQS-UX-P12`, `P17`, Product Contract §8 |

One external standard **was** used, and is labelled as such: WCAG 2.1/2.2
success criteria, cited by number as a public normative standard. WCAG is **not**
on this project's registered shelf, and the Product Contract names no WCAG
level — §8 requires contrast "verified rather than assumed" without a numeric
threshold. WCAG was used as a yardstick for the measurements, never as the
governing rule. Where doctrine and WCAG could differ, doctrine was reported.

**Distinguishing the evidence classes**, as required:

- *Observed CQS evidence* — 183 rendered captures, 31 DOM metric files, and
  direct live measurements made to settle disputes.
- *Repository doctrine* — `CQS-UX-DOCTRINE.md`, the surface inventory, the
  Product Contract, and settled owner decisions such as Path S-C.
- *External-source evidence* — WCAG only, labelled; no book.
- *Reviewer interpretation* — everything in the bench reports, which is why it
  was put through a hostile review and, where still contested, re-measured.

---

## 9. Physical-only follow-ups

Prepared, not executed. Simulation cannot pass any of these.

| Id | Question | Why it cannot be settled here |
| --- | --- | --- |
| `UIX-P01` | Are the raised projector state words now actually readable from the back of a real classroom? | Angular size depends on room depth, projector brightness and screen gain. The court measured pixels and produced labelled distance aids; it cannot measure a room. |
| `UIX-P02` | Does a real projector's overscan crop the 7 px below the eight-team scoreboard at 720p? | The DOM says nothing is clipped. Physical framing and overscan are hardware facts. |
| `UIX-P03` | Do NVDA, JAWS and VoiceOver actually speak the 33 live regions in a usable order during live play? | The markup was verified and is sound; real screen-reader behaviour needs a person with a screen reader. |
| `UIX-P04` | How does the product render on Windows, where `--font-sans` resolves to Segoe UI rather than this host's system face? | Windows is the primary teacher deployment target and was not exercised. Every capture in this lane is macOS. |
| `UIX-P05` | Does the repaired buzzer copy match what a teacher sees with a real Sony/Namtai receiver and four handsets? | All buzzer findings in this lane are about words and layout with no hardware attached. |

These route to the Sony/Namtai, Projector Hardware, Audio and Windows Physical
mini-courts, which remain unexecuted and ungranted.

---

## 10. Verification performed

Every claim of repair in this journal rests on the following, re-run on the
tree as committed:

| Check | Result |
| --- | --- |
| `git diff --check` | clean |
| `npm run lint` | 0 errors (3 pre-existing `react-refresh` warnings, untouched) |
| `npm run typecheck` | clean |
| `npm run test:run` | **3197 passed**, 2 skipped, 220 files |
| `npm run build` | clean |
| Full Playwright suite (`desktop-1080p`, `projector-720p`, `mobile-host`) | **856 passed**, 329 skipped, **0 failed** — the same pass count as the pre-repair baseline |
| Rendered re-capture | 183 states + the new worst-case projector fixture, same journeys, same viewports |
| DOM metrics re-measure | 31 state files, both themes |

Risk-based revalidation, as the brief requires: tranche 1 was pure styling, so
it ran causal tests plus a full rendered review. Tranches 2–4 changed
interaction presentation and teacher-visible copy, so they ran the **full**
functional suite — which is how the four withdrawn repairs and the reverted
token were caught.

**No broad Court A or Court B rerun was performed, and none was needed.** No UI
observation produced evidence that the prior functional qualification was
materially invalid, and no repair here intentionally changes functional
semantics. Where a repair would have required changing Court B's own string
assertions, the repair was withdrawn rather than the evidence rewritten.

---

## 11. Terminal verdict

```text
RENDERED BASELINE:            COMPLETE  (183 states, 3 viewports, 2 themes)
FIRST-IMPRESSION COURT:       COMPLETE  (2 blind reviewers, no doctrine, no source)
TEACHER/OPERATOR COURT:       FINDINGS RESOLVED OR ROUTED
PROJECTOR COURT:              FINDINGS RESOLVED OR ROUTED
VISUAL HIERARCHY COURT:       FINDINGS RESOLVED OR ROUTED
IA / COGNITIVE LOAD COURT:    FINDINGS ROUTED  (no small correction exists)
ACCESSIBILITY COURT:          FINDINGS RESOLVED
GAME UX COURT:                PASS  (no P16 violation; reduced motion loses no state)
CONTENT / MICROCOPY COURT:    FINDINGS RESOLVED OR ROUTED
HOSTILE REVIEW:               COMPLETE  (challenged all 11 reviews, including this lane's own process)
CLASSROOM-PRESSURE COURT:     COMPLETE  (P1-P8 walked against the baseline)
ZERO-EXPLANATION COURT:       COMPLETE — AND DECISIVE (see UIX-O16)
CROSS-SURFACE CONSISTENCY:    FINDINGS RESOLVED OR ROUTED
TARGETED BIBLIOGRAPHY REVIEW: COMPLETE — and it found the shelf UNINGESTED,
                              so no source was cited by anyone (see §8)

HIGH-IMPACT UX FINDINGS:      8 UNRESOLVED, ALL ROUTED AS OWNER DECISIONS
OWNER DECISION DOCKET:        18
PHYSICAL-ONLY FOLLOW-UPS:     5

UI/DESIGN QUALIFICATION:      NOT PASS — ELIGIBLE FOR OWNER DECISION,
                              THEN CLASSROOM-FEEL HANDOFF
```

**Why this is not a PASS.** The brief is explicit that PASS may not be used
while objective high-impact findings remain unresolved. Six do:

| Id | Finding | Severity | Why it is not repaired here |
| --- | --- | --- | --- |
| `UIX-O01` | The scoring target never follows the team that buzzed | VERY HIGH | both fixes change live workflow |
| `UIX-O02` | The buzzer workbench renders expanded during play | HIGH | surface inventory §12 reserves Host refinement to the owner |
| `UIX-O03` | Arming and the timer are orthogonal and unexplained | HIGH | either fix changes meaning |
| `UIX-O04` | The Host has no fixed operating region | HIGH | no small correction exists |
| `UIX-O05` | An image clue cannot carry a question | HIGH | schema change across import, validation, sanitizer, Display |
| `UIX-O09` | Copy repairs the locked Court B suite pins | HIGH | would rewrite terminal qualification evidence |
| `UIX-O16` | Authoring claims a game is playable that the product refuses to load | **VERY HIGH** | changes a validation gate — functional semantics |
| `UIX-O17` | Opening the Display mid-setup can offer to discard the setup | HIGH | needs one confirming reproduction |

Every one is a genuine owner decision under the brief's own list — product
policy, a canon conflict, a workflow change, or an information-architecture
change. None is withheld because it was hard.

One accessibility finding, `E-01` (keyboard focus falls to `<body>` after every
reveal and adjudication, so a keyboard-only teacher pays ~15 Tab presses per
clue), was rated VERY HIGH and upheld as "the strongest finding in the court".
It is **not** in the docket and **not** repaired: the fix — keep one persistent
button in the reveal slot and move focus after adjudication instead of
disabling the pressed control — is a React component change to live-play
behaviour, not presentation. Under this lane's own boundary that is semantic
product work, and the brief says to stop and classify it rather than do it
quietly inside a UI court. It is the single highest-value next piece of work
and should be authorized as its own slice.

### What this lane establishes

- Contrast is **verified, not assumed**, and it holds: 1,638 measured text runs
  across 31 states and both themes, **zero** below their AA threshold.
- **Zero** visible interactive controls lack an accessible name.
- **Zero** states overflow horizontally, at any probed viewport.
- The focus indicator is now the product's own at **every** recorded Tab stop.
- The Host/Display privacy boundary holds. Six reviewers hunted 183 captures
  for a leak and found none; all eleven Display metric files report
  `targets: 0`, so the read-only boundary holds at the DOM level too.
- Reduced motion removes decoration and keeps every state fact.

### What this lane explicitly does not establish

Everything in §9, plus: no claim that any surface is *qualified* against the
doctrine, no owner acceptance, and no claim about Windows, real projectors,
real screen readers or real Sony hardware.

---

## 12. Owner classroom-feel handoff

The owner should **not** be asked to discover the objective problems above —
that was this lane's job, and the ones that are repaired are repaired. What is
genuinely left for a person in a room is preference, feel and physical reality.

Suggested arc, as one natural class:

```text
Home → choose or import a game → Class Setup → name teams
→ configure keyboard buzzers (and physical ones if present)
→ open the Display → Start Game → board play → buzz → score
→ an incorrect answer → a timer → Undo → round transition
→ Final → completion → summary → Home → resume
```

Notes in natural language are enough — "I expected X", "this is hard to see",
"this feels slow", "too many clicks", "I like this". Classification happens
afterwards.

Three things worth the owner's attention specifically, because this lane could
measure them but not judge them:

1. **The projector type scale at 1280×720.** The repairs lifted 1920×1080
   substantially and 720p much less. Stand at the back of the room.
2. **The Host scroll during live play.** `UIX-O04` says the clue and the
   control that spends it are never in one viewport. Only running a real class
   settles how much that costs.
3. **Whether the destructive-red confirm now reads as a warning or as alarm.**
   It had never painted before, so nobody has seen it in context.

---

## 13. Non-claims

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
