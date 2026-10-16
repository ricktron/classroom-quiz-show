# CQS Court B clean-build defect triage (post #146-#151)

- **Date:** 2026-10-16 (CT)
- **Role:** independent DevPM / product-behavior triage reviewer
- **Tested main:** `beeacd33bfc8fc1e1a7e82db6f2fb36231d6f955` (origin/main matched the expected SHA; no delta)
- **Input:** the seven clean-build Court B defects in
  [`2026-10-15-cqs-adversarial-test-trust-qualification.md`](2026-10-15-cqs-adversarial-test-trust-qualification.md) §4
- **Scope:** reproduce and classify only. No product code, tests, or PRs were changed by the triage itself.

## 1. Build and method

| Item | Value |
| --- | --- |
| Build caveat | `npm ci` could not fetch `https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz` (egress policy 403). The app was built from an exact-SHA scratch clone in which **only** the `xlsx` dependency source was substituted (`0.18.5` from the npm registry); every other lockfile entry was unchanged. `xlsx` is used only by spreadsheet import/export, which is not on any finding's path. |
| Serve | `npm run build` (pass) then `vite preview` under `/classroom-quiz-show/` |
| Browser | Playwright-driven Chromium (headless), 1920x1080 and 1280x720 |
| Hardware | Platform-boundary Wbuzz simulator (`navigator.hid` + `navigator.getGamepads` only), plus one variant persisting the WebHID grant across reload. **Simulation only.** |

Black-box rules held for every reproduction run: start at Home with an empty
profile; visible / accessibility UI only; no `data-testid` navigation, state
injection, Advanced diagnostics, or route shortcuts; pointer-only where the
claim concerns clicks (raw mouse down/up with human-like delay). Observations
were frozen before implementation was inspected.

## 2. Findings

### CB-01 Display open state after Host reload: **BUG** (reproduced 2/2)

- Open Display from Class Setup, Start Game, play, reload Host, Resume class.
- Host then reports "Display not open" and offers "Open display" while the
  Display popup was not reloaded and keeps receiving public state (a score undo
  and a tile open on the reloaded Host both appeared on the Display). The wrong
  status persisted past 5 s.
- Clicking "Open display" re-binds the existing named window (no duplicate, no
  Display reload) and the status flips to "Display open".
- Cause (post-freeze): `displayOpen` is component-local `useState(false)` in
  `src/host/FoundationControls.tsx`, polled from a `window.open` handle that is
  document-local and lost on reload.
- Coverage at triage: none.

### CB-02 Buzzer readiness after reload: **PHYSICAL-ONLY** (owner UX question)

- Simulator default (grant not persisted, the Court B setup): after Resume the
  Host status line changes from "Buzzers ready" to "Buzzers optional · keyboard
  works" with no notice; the resume banner is silent on buzzers; the Buzzers
  panel truthfully reports permission required; team mapping is kept. With the
  pad exposed, a RED press during play is ignored while the panel reports
  "1 controller responding" (controller buzzing auto-enables only when the
  receiver is connected, per ADR-009 / Q7-R1).
- Grant-persisted variant: CQS restores the receiver automatically via
  `getDevices()` (ADR-019), keep-alive runs, status becomes "Buzzers ready"
  after the first press, and the buzz lands.
- Conclusion: the Court B "Permission required after reload" symptom is a
  simulator artifact (the Q7-R1 receipt already records that the simulator does
  not model a persisted grant). Real Chrome/Sony behavior is unproven.

### CB-03 Typed team name / first Start Game click: **BUG** (reproduced 4/4 at 1280x720)

- Team 1 committed with Enter, team 2 typed without Enter/blur. Start Game is
  greyed and status says the team still needs a name although the name is
  visibly typed.
- One pointer click: pointerdown blurs the field, the name commits, the Names
  panel is replaced by Ready, Start Game moves +88 px, pointerup lands on another
  row. No start. A second click starts.
- At 1920x1080 the shift is +23 px: a centre click works; a click in the top
  ~23 px of the button is inert.
- Cause: typed draft is local; commit only on blur/Enter
  (`src/host/TeamNameSelectionBoard.tsx`).
- Coverage at triage: none (all e2e commit names with explicit blur/Enter).

### CB-04 Handset / controller labels: **BUG** (reproduced, all four slots)

- Buzzer Check printed "Red Rhyolites · Buzz · Controller 1 · button 6" for the
  handset the mapping list calls "Controller 2"; slots 3 and 4 read
  "Controller N (no team yet) · Buzz · Controller 1 · button 11/16". Colour
  buttons appeared as "Secondary action N".
- Model: one receiver = one Gamepad ("Controller 1"), four handset slots,
  20 raw buttons, team mapping per slot. "Controller" named both the receiver
  and the handset in one sentence. Existing tests pinned the mixed string.

### CB-05 Board-only game winner on Display: **OWNER-DECISION** (reproduced)

- Board-only end: Display shows "Game complete" and scores, no winner (100-0)
  and no tie copy (0-0). Host summary ranks the teams.
- Final game: Display names the winner; Final tie shows tied-finish copy.
- Contract at triage: winner/tie presentation was specified only for a complete
  public Final stage; board-only completion was unspecified.

### CB-06 Score Undo after answer reveal: **EXPECTED**

- Undo is linear, latest-only (ADR-002). "Undo last score change" is enabled
  only when the next undo target is a score adjustment (ADR-006), and the copy
  says so. Generic "Undo show answer" works and re-enables score undo; scoring
  after reveal is undoable. Buzz-ins and Mark correct/incorrect also enter the
  stack and move no points.

### CB-06b Final settlement score-undo copy: **BUG** (low)

- After a Final settlement the panel shows "Last score change: <team> +N (Final,
  correct)" yet disables score undo with copy saying the next undo would affect
  something other than a score. The next undo does reverse that score.
- Cause: score-undo eligibility accepts `TEAM_SCORE_ADJUSTED` only, while
  last-score-change derivation counts `FINAL_TEAM_SETTLED`. Previously listed as
  a Q7-R1 follow-up candidate.

### NEW-1 Final settlement Undo lost after response-window expiry: **BUG** (new; reproduced 2/2 by the triage reviewer; not second-reviewed)

- Final with the default 30 s response window; responses locked, answer
  revealed, a team settled; the window expires after settlement. Generic Undo
  then shows "Undo response time up" and repeated clicks never progress.
- Not observed when the window expired before settlement.
- Cause (post-freeze): response lock does not stop the window; expiry is
  reversible in any later phase; undoing an expiry restores an already-past
  deadline that re-expires immediately (ADR-007 §13), and no pause/stop control
  is shown after lock. Conflicts with ADR-014 §9 (a settlement undoes as one
  atomic fact) and journey HG-13.

### CB-07 Demo game cannot reach Final: **HARNESS-DEFECT**

- The Home demo has one board round, five tiles, no Final (intentional small
  demo).
- Natural Final routes exist and were exercised: New Game editor; Import Game
  with the Board + Final template; paste game file. Court A's Q3 golden path
  already uses JSON import of a Final-capable game.
- Defect: the Court B brief required a Final journey but supplied only the demo.

### Side observations (non-findings; not adjudicated)

- S1: one inert first Start Game click on the buzzer path with names already
  committed by Enter; 1 of 5 runs, 0 of 4 on retry. UNPROVEN.
- S2: Host session summary shows raw epoch-millisecond timestamps.
- S3: Resume after Start Game but before Start Round 1 lands on Class Setup
  Ready (not checked against contract).
- S4: student buzz-ins hide score undo until undone (EXPECTED under ADR-002).

## 3. Classification table

| ID | Reproduced | Classification | Automated coverage at triage | Physical-only factor | Owner input |
| --- | --- | --- | --- | --- | --- |
| CB-01 | Yes 2/2 | BUG | None | No | No |
| CB-02 | Yes (simulator) | PHYSICAL-ONLY | Golden path reconnects explicitly; no persisted-grant e2e | Yes | Yes (resume notice) |
| CB-03 | Yes 4/4 at 720p | BUG | None | No | No |
| CB-04 | Yes | BUG | Tests pinned the mixed label | Slot order only | Minor (noun) |
| CB-05 | Yes | OWNER-DECISION | Final winner/tie only | No | Yes |
| CB-06 | Yes | EXPECTED | M30/M32/M33 detectors | No | No |
| CB-06b | Yes | BUG (low) | Last-score-change only | No | No |
| NEW-1 | Yes 2/2 | BUG | None | No | No |
| CB-07 | Yes | HARNESS-DEFECT | Court A Q3 uses JSON-import Final | No | Optional |

## 4. Proposed repair grouping

| Group | Scope |
| --- | --- |
| A | Display presence truth after Host reload (CB-01) |
| B | Class Setup single-activation Start Game with pending typed names (CB-03) |
| C | Final Undo integrity (NEW-1 + CB-06b) |
| D | Buzzer label contract (CB-04) |
| E | Qualification harness: Final-capable fixture, Court B brief reachability, persisted-grant simulator mode (CB-07; CB-02 automation) |
| F | Board-only completion presentation (CB-05, after owner decision) |

Recommended recertification timing at triage: a fresh full Court A/B
recertification **after repairs**, with the CB-05 decision made first.

## 5. Non-claims

- No physical Sony/Wbuzz hardware, Windows, packaged desktop, or Electron run.
- Simulation is not physical evidence; Chrome WebHID grant persistence across
  reload is unproven.
- Repository checks (`npm run verify`, `verify:all`) were not run by the triage.
- NEW-1 was not adversarially re-verified by a second reviewer during triage.
- This receipt does not issue `OWNER-PLAYTHROUGH-ELIGIBLE`, does not certify
  the suite as trustworthy, and does not record any repair outcome.
