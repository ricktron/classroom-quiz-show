# Q7-R1 — PR #143 certification-blocker repair receipt

- **Authorization:** `AUTHORIZE-CQS-Q7-FULL-TEACHER-BUZZER-WORKFLOW-REPAIR-R1-CERTIFICATION-BLOCKERS-1`
  (owner-confirmed 2026-10-15; commits onto the PR #143 branch; **no merge authority**)
- **Trigger:** independent full-product certification review of PR #143 at head
  `50691afdfcc8a9c16a7bf0f7fa0d69d8140b9a21` returned **HOLD** (exact-head CI
  Playwright red on Q3-G; eleven functional blockers).
- **Repair base:** `50691afdfcc8a9c16a7bf0f7fa0d69d8140b9a21` (PR #143 head), on
  main `78304319ec21106c64eee925a5f942726846d384`.
- **Kind:** product repair + fail-first natural-route tests + test-harness hardening.

## Owner decisions recorded for this packet (2026-10-15)

| Item | Decision |
| --- | --- |
| 1 Controller buzzing default | Keep ADR-009 **Off by default**. Auto-enable only in play when the teacher-connected supported Wbuzz receiver and the materialized supported mapping are both present; never override an explicit teacher Off (Back→Start, pad reconnect, receiver reconnect). Q3-G contract unchanged. |
| 7 Startup writer lease | **Same-window handoff**, with blocked controls disabled with truthful copy as a backstop. |
| 11 1280×720 core clue loop | **Required fix** (§9.1.1), not a layout preference. |

## Blockers → fix → evidence

Fail-first = the new test was run on unmodified `50691af` and failed for the
reported reason before the fix. Natural route = Home start, role/name
navigation, no scrollIntoView before viewport assertions, no Advanced
diagnostics.

| # | Blocker | Root cause | Fix | Fail-first natural-route test |
| --- | --- | --- | --- | --- |
| 1 | Q3-G red: `gih-enabled` On | Leave-setup effect force-enabled whenever any supported mapping materialized (default associations exist whenever a Wbuzz pad is present) | `GamepadInputHostPanel`: auto-enable only when receiver connected **and** supported bindings exist **and** no explicit teacher Off; leave-setup effect no longer enables | `q7-r1-buzzer-certification-blockers` R1-1 (failed: expected Off, got On); Q3-G green; panel unit tests |
| 2 | Stale "1 controller responding" with no pad | Responding slots re-derived in an effect from a stale `recentTestObservations` batch on re-entering Buzzer Check | Responding evidence lifted to the poll owner, updated only by press events; cleared when the Wbuzz pad or receiver goes away; observation batch cleared on leaving setup and on entering Buzzer Check | R1-2 (failed: "1 controller responding"), R1-2b (failed: "4 controllers responding"); unit "stale batch" |
| 3 | Leave Buzzer Check erased responding | `!testMode` branch cleared responding slots (~1 s after Leave) | Leave no longer clears evidence | R1-3 with a stability window (failed: "Waiting for controller presses"); unit |
| 4 | Class Setup reveal status never cleared | Local `buzzerSetupRevealed` flag never reset; copy fixed at "use Connect buzzers" | Status follows lifted Buzzer Check state and receiver state; ends with Buzzer Check | R1-4 (failed: still "Next: use Connect buzzers" after Connect); `ClassroomSetupPanel` unit |
| 5 | Buzzers panel "waiting for buzzers" during live claims | Only Buzzer Check observations counted; gameplay presses never did | Gameplay rising edges from the detected Wbuzz pad count as responding evidence (`onButtonEdges` hook output, host-private, no dispatch change) | R1-5 (failed: "Waiting for controller presses"); unit |
| 6 | Slot dropdown showed Team 1..N | Play-mode section had no `displayNameForTeam`; slot `<select>` wrapped in its label (accessible name polluted) | Session names in setup and play; `<label for>` gives accessible name "Controller N"; unassigned slot reads "Controller N (no team yet)" instead of internal `sony-slot-N` | R1-6 (failed: no "Controller 1" select by label) |
| 7 | Startup writer-lease false read-only (~4 s) | Effect cleanup / async IndexedDB release do not run on reload or quit; each page had a fresh random tab id | Per-tab window id in sessionStorage (same-tab reload reclaims); synchronous release marker on pagehide (covers Electron quit→relaunch); genuine second window still read-only; read-only Home write controls disabled with copy | `q7-r1-writer-lease-reload` (failed: follower copy shown after reload; second window Resume enabled); `tests/desktop/q7-r1-writer-lease-relaunch` (failed on old build); coordination/tabIdentity/useHostPersistence/HomeRoute unit |
| 8 | Inert name-choice buttons with no name bank | Board always rendered choices / More names / Choose again; engine has no candidates | Hidden with explanatory copy when the Game has no class name list; manual entry unchanged; "Clear name" for a typed name | `q7-r1-names-and-score` item 8 (failed: choices rendered); TeamNameSelectionBoard / ClassroomSetupPanel unit |
| 9 | Keep-alive reconnect honesty | Lifecycle-wide first-output flags decided health; soft refresh set healthy before any send | Output confirmation scoped to the current acquired connection; soft refresh keeps the observed health class | R1-9a/9b (9b failed: "Connected" after reconnect whose first send failed); lifecycle unit (2 fail on old code); failure-recovery branch now requires "Failed to reconnect" |
| 10 | Stale "Last score change" after Final | Derived from `TEAM_SCORE_ADJUSTED` only | `lastScoreChangeOf` over effective events incl. non-zero `FINAL_TEAM_SETTLED` | `q7-r1-names-and-score` item 10 (failed: "+200 (full credit)"); unit |
| 11 | 1280×720 core clue loop off-screen | Play posture stacked every panel in one 960px column under a tall route header; board panel put reveal/return buttons after private content; buzz-in panel put keyboard setup before the queue | Wider, tighter play posture; three columns while a clue is open (≥64rem): clue + round status, response window, buzz-in queue; reveal/return buttons above private content; queue + Mark correct/incorrect/pass before keyboard setup. Layout only; one arming control | `q7-r1-core-loop-viewport` (failed at 720p: Arm clue y≈1033 after 482px scroll, Mark correct off-screen; also failed at 1080p for Show prompt) |

### Item 11 detail (1280×720, demo board)

| Control | Before (y) | After (y) |
| --- | --- | --- |
| Arm clue | ~1515 | ~558 |
| Active claim | ~2312 | ~470 |
| Mark correct | ~2406 | ~604 |
| Next board tile (Earth Structure 300) | 818 (below fold) | ~694 |

The spec asserts each next primary control is fully inside the viewport
**before** clicking it (bounding box, no scroll, page scroll position
unchanged), across tile → Show prompt → Arm/Start → keyboard buzz from two
teams → Mark incorrect → next active → Mark correct → Show answer → Return to
board → next tile, on the demo board and on a classic 6×5 board's bottom-right
tile. mobile-host is a scrolling layout and is excluded from the no-scroll claim
(no horizontal overflow observed there).

## Test hardening

| Finding | Change |
| --- | --- |
| `scrollIntoViewIfNeeded` before viewport assert (q7-f01) | Replaced by teacher-style mouse-wheel scroll helper `wheelScrollUntilMostlyInViewport` |
| `waitForSessionSaved` matched "Ready to save" | Matches only `This class session is saved on this device.` |
| Silent `#/display` fallback in `openAudienceFromHost` | Removed; the Host "Open display" control must open the Display |
| 4× check asserted only "something responded" | Each press asserts exact `Buzzer Check: <slot team> · Buzz · Controller 1 · button N` and the responding count |
| Golden-path post-reload branches | One deterministic route: reload → Resume class → play → reconnect → Wbuzz press claims |
| Simulator accepted any filter / report | `requestDevice` requires only the exact `054c:1000` filter; `sendReport` requires reportId 0 and 7 bytes; violations recorded and asserted empty |
| Gamepad-disappears branch used Leave/re-enter | Asserts responding clears immediately |

## Verification

Local (macOS, Chromium via Playwright), on the product head `0c3bb89`
(four repair commits on `50691af`). This docs commit adds no product change.
Exact-head GitHub CI is observed on the PR, not recorded here (durable files
do not predict their own PR state).

| Check | Command | Result |
| --- | --- | --- |
| Whitespace | `git diff --check` | clean |
| Lint | `npm run lint` | 0 errors (3 pre-existing warnings in `src/theme/ThemeProvider.tsx`) |
| Typecheck | `npm run typecheck` | clean |
| Unit | `npm run test:run` | 201 files; 2982 passed, 2 skipped |
| Full e2e (build + preview, 3 projects) | `npx playwright test` (local config: reuseExistingServer false) | 714 passed, 0 failed, 174 skipped (project-scoped skips), no retries (local retries = 0) |
| Electron | `CQS_SOURCE_SHA=<head> npm run test:desktop` | 11 passed |

Observed once, not reproduced: on an earlier combined run under heavy machine
load (three concurrent Playwright suites), `s05-board-outcome-presentation-choreography`
F-HANDOFF failed one animation-state assertion on desktop-1080p; 3× repeat on
all projects passed and the final full run passed.

Fail-first logs were captured per item before each fix (see the table above);
8 of the 9 behavioral buzzer tests failed on `50691af` before the fix. R1-9a
(first-connect output failure shows Failed) already passed there and stays as a
strengthened regression; R1-sim is a harness self-test added afterwards.

## Non-claims

- Simulation (navigator.hid / getGamepads) is **not** physical Sony/Wbuzz
  evidence. Q7-F02 physical root cause remains **UNESTABLISHED**.
- The simulator does not model a persisted WebHID grant across reload; the
  golden path reconnects after reload. Real Chrome restore of a granted
  receiver is not proven here.
- Writer lease: a crash or force-kill (no pagehide) still waits out the lease
  TTL (~4–6 s) before takeover. Windows, packaged and signed builds not run.
- Behavior change to surface to the owner: a **genuine** second live window
  now has Home Resume disabled with copy. S04C-H1 had ungated Resume because
  of the stale-lease false read-only, which this packet fixes at the root.
- After a Final settlement, "Undo last score change" stays disabled and its
  note still says the next undo affects "something other than a score";
  unchanged here (follow-up candidate).
- Item 11 margins: the classic 6×5 bottom-row tile has ~10px to spare at
  720p (a two-line category title could push it out); Team Scoring award
  buttons remain below the fold at 720p while a clue is open (scoring is a
  separate panel, OG-6); the timer-length select text is slightly clipped at
  720p; 1093×542 (125% scaling) was not tested for the clue loop.
- A name bank with fewer than four usable names can still show "—" choices;
  only the no-bank case was in scope.
- Does not issue `OWNER-PLAYTHROUGH-ELIGIBLE`, does not merge, does not
  terminalize S05, and does not authorize S04D / S06 / signing.
