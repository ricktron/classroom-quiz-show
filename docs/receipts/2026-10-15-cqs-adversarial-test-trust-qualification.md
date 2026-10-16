# CQS adversarial test-trust qualification — Court A / Court B receipt

| Field | Value |
| --- | --- |
| Date | 2026-10-15 (Central Time) |
| Campaign baseline (bound) | `8ae66adff712579864044db6fa1e7ae17f4e5883` |
| origin/main at close | `a0ea6dd7058c886dc8e6faae786e958a6a9a32b4` (PR #144, docs-only, 4 files under `docs/`; not from this campaign; campaign **not** moved) |
| Sessions | Session 1 (prior, 14:01–19:55 CT): baseline, M01–M51 loop. Session 2 (this, 16:20–22:10 CT): recovery, M02b/M20b/M45b/M52–M55, M16 rerun, M18 fuzz, S05 classification, degraded runs, Court B, receipt |
| Lease worktree | disposable detached worktree at `8ae66ad` (prior session scratchpad); every mutation applied as one exact unique substitution, compile-gated, reverted, `HEAD`/status/diff asserted clean (fail-closed) |
| Retries | 0 for every run in this receipt. CI's `retries=2` is not used as acceptance evidence |

This receipt preserves observed evidence. It does not change product status, does not
issue `OWNER-PLAYTHROUGH-ELIGIBLE`, and certifies no repair.

## 1. Checkpoint recovery

- Baseline re-verified from frozen artifacts: unit 2982 passed / 2 skipped; browser 714 passed /
  174 skipped / 0 failed / 0 flaky (`baseline.json`, retries 0); desktop 11/11.
- M01–M14: consistent with the owner-supplied checkpoint → **RECOVERED PRIOR EVIDENCE** (not rerun).
- Correction to the supplied checkpoint: Session 1 was **not** interrupted. Its background loop was
  live (mid-M19) when Session 2 started. Owner chose to let it finish; Session 2 did not touch the
  lease until the loop wrote `DONE` (19:55 CT). M15, M16, M17 had completed cleanly; M18 had
  completed and survived.

## 2. Mutation register (Court A)

| ID | Claim | Risk | Mutation | Disposition | Detector layers | Evidence |
|---|---|---|---|---|---|---|
| M01 | HL-07 | R3 | Home "Resume class" stays enabled but is inert (no navigation) | KILLED | unit + browser | prior |
| M02 | HL-05 | R2 | Home Play routes to the editor instead of Class Setup | INVALID (stillborn) | — | prior |
| M02b | HL-05 | R2 | Home Play drops ?play= and lands on bare Host controls instead of Class Setup | KILLED | browser | cont |
| M03 | HL-07 | R3 | Start fresh (armed) silently keeps the unfinished session | KILLED | unit + browser | prior |
| M04 | AI-07 | R4 | Authoring Save reports Saved but writes nothing to the library | KILLED | browser | prior |
| M05 | AI-07 | R2 | Library marks unplayable drafts as playable (Play offered for broken game) | KILLED | unit + browser | prior |
| M06 | CS-14 | R2 | Start Game enables with duplicate team names | KILLED | unit | prior |
| M07 | CS-15 | R2 | Start Game stays disabled for an eight-team class with all names | KILLED | unit + browser | prior |
| M08 | CS-04 | R2 | Show buzzer setup / Check buzzers flips local state but reveals nothing (Q7-F01 class) | KILLED | unit + browser | prior |
| M09 | CS-14 | R2 | "Ready" heading and dominant Start styling shown while names are still missing | KILLED | unit + browser | prior |
| M10 | CS-09 | R2 | Manual "Type a name" field accepts text but never claims the name | KILLED | unit + browser | prior |
| M11 | CS-09 | R1 | No-name-bank Game shows inert name choices again (Q7-R1 item 8 regression) | KILLED | unit + browser | prior |
| M12 | CS-09 | R3 | Typed name for any team is assigned to Team 1 (identity maps to wrong team) | KILLED | unit + browser | prior |
| M13 | WB-VIDPID | R3 | WebHID transport accepts any Sony device (wrong PID) as the Wbuzz receiver | **SURVIVED** | — | prior |
| M14 | WB-FILTER | R3 | requestDevice chooser filter loses productId (any Sony HID offered) | KILLED | browser | prior |
| M15 | WB-REPORTID | R3 | Keep-alive output sent with reportId 1 instead of 0 | KILLED | unit + browser | prior-loop |
| M16 | WB-LEN | R3 | Keep-alive output payload is 8 bytes instead of 7 | KILLED | unit + browser | cont-rerun |
| M17 | WB-FIRSTFAIL | R3 | First output failure on a connection still reports Connected/healthy | KILLED | unit + browser | prior-loop |
| M18 | WB-RECONNECT | R3 | Soft-refresh reconnect keeps reporting healthy before any output succeeds | EQUIVALENT | — | prior-loop+fuzz |
| M19 | WB-TESTMODE | R3 | Buzzer Check testMode stays active after leaving Class Setup into gameplay | KILLED | browser | prior-loop |
| M20 | WB-RESPONDING | R2 | Gamepad disappears but "N controllers responding" remains | INVALID (stillborn) | — | prior-loop |
| M20b | WB-RESPONDING | R2 | Gamepad disappears but "N controllers responding" remains (M20 re-issued: M20 STILLBORN noUnusedLocals) | KILLED | unit + browser | cont |
| M21 | WB-SLOTMAP | R3 | Default Controller N -> Team N association is rotated (Controller 1 buzzes for Team 2) | KILLED | unit + browser | prior-loop |
| M22 | WB-MASQUERADE | R3 | Generic (non-Sony) Gamepad classified as the supported wireless Buzz | KILLED | unit | prior-loop |
| M23 | WB-SLOTBASE | R3 | Handset slot button bases wrong (real handset 2..4 presses map to the wrong slot/colour) | KILLED | unit + browser | prior-loop |
| M24 | WB-AUTOENABLE | R3 | Controller buzzing never auto-enables in play with a connected receiver (post-reload Wbuzz press ignored) | KILLED | unit + browser | prior-loop |
| M25 | WB-EXPLICITOFF | R2 | Teacher explicit Off is overridden by auto-enable (Back->Start / reconnect) | KILLED | unit + browser | prior-loop |
| M26 | HG-08 | R3 | Keyboard buzz: every fresh key press is ignored | KILLED | unit + browser | prior-loop |
| M27 | HG-05 | R3 | Early-buzz lockout removed: buzz accepted before the clue is armed | KILLED | unit + browser | prior-loop |
| M28 | HG-06 | R3 | Award/deduct tile value goes to Team 1 regardless of selected scoring target | KILLED | unit + browser | prior-loop |
| M29 | HG-06 | R3 | Deduct (incorrect) adds the tile value instead of subtracting | KILLED | unit + browser | prior-loop |
| M30 | HG-06 | R2 | "Last score change" stays stale after a Final settlement (Q7-R1 item 10 regression) | KILLED | unit + browser | prior-loop |
| M31 | HG-06 | R2 | Mark incorrect is enabled but does nothing (adjudication cannot continue) | KILLED | unit + browser | prior-loop |
| M32 | HG-13 | R3 | Ordinary Host Undo button enabled and labelled but inert | KILLED | unit + browser | prior-loop |
| M33 | HG-13 | R4 | Undo reverses the second-latest reversible event instead of the latest | KILLED | unit + browser | prior-loop |
| M34 | CS-13 | R2 | Ordinary "Start <next round>" control does nothing | KILLED | unit + browser | prior-loop |
| M35 | HG-09 | R3 | Final wager saved for any team is recorded against the first eligible team | KILLED | browser | prior-loop |
| M36 | HG-09 | R3 | Incorrect Final costs nothing (settlement delta 0 instead of -wager) | KILLED | unit + browser | prior-loop |
| M37 | DP-05 | R3 | Display announces the winner at resolution, before the teacher completes the game | KILLED | unit | prior-loop |
| M38 | HG-10 | R3 | Tied game completes with Team 1 shown as Winner on the Display | KILLED | unit + browser | prior-loop |
| M39 | DP-02 | R4 | Board answer published to the Display at the prompt stage (early leak) | KILLED | unit + browser | prior-loop |
| M40 | DP-05 | R4 | Final answer published as soon as responses lock (before explicit reveal) | KILLED | browser | prior-loop |
| M41 | DP-04 | R2 | Display never shows Correct/Incorrect board outcome after adjudication | KILLED | unit + browser | prior-loop |
| M42 | PER-SAVE | R4 | Active session save drops the most recent event while reporting Saved | KILLED | unit + browser | prior-loop |
| M43 | PER-WRITER | R4 | A genuine second live window is treated as not-foreign and becomes a second writer | KILLED | unit + browser | prior-loop |
| M44 | PER-RELOAD | R3 | Same-window identity no longer reclaims the lease (reload relies only on pagehide marker) | KILLED | unit | prior-loop |
| M45 | PER-RELAUNCH | R3 | pagehide no longer writes the synchronous release marker (Electron quit->relaunch false read-only) | INVALID (stillborn) | — | prior-loop |
| M45b | PER-RELAUNCH | R3 | pagehide no longer writes the synchronous release marker (M45 re-issued: M45 STILLBORN noUnusedLocals) | KILLED | unit + browser | cont |
| M46 | VP-720 | R2 | Mark correct / incorrect pushed below the 720p fold while a clue is open | KILLED | browser | prior-loop |
| M47 | A11Y-KEY | R2 | Start Game cannot be activated with Enter/Space (mouse only) | **SURVIVED** | — | prior-loop |
| M48 | VP-HIDDEN | R2 | Start Game is invisible (opacity 0) but still in the DOM and clickable | **SURVIVED** | — | prior-loop |
| M49 | PKG-SHA | R2 | Build provenance sourceSha truncated (not the exact source SHA) | KILLED | desktop | prior-loop |
| M50 | DP-01 | R2 | Electron Display window not registered/hash-locked (navigation away + duplicate Display windows) | KILLED | desktop | prior-loop |
| M51 | PKG-TESTLEAK | R3 | Test-only Wbuzz simulator hook compiled into the production bundle | **SURVIVED** | — | prior-loop |
| M52 | IMP-FAILCLOSED | R4 | Import ignores semantic + registry validation issues (fail-open on malformed content) | KILLED | unit + browser | cont |
| M53 | DP-02 | R4 | Host-private tile notes published to the Display (as the answer line) before answer reveal | KILLED | unit + browser | cont |
| M54 | HL-06 | R3 | Library Delete (confirmed) deletes the first library game instead of the chosen one | **SURVIVED** | — | cont |
| M55 | CS-13 | R2 | Start Game button renders with no visible label (enabled, clickable, unlabeled) | KILLED | unit + browser | cont |

Evidence column: `prior` = Session 1 manual runs (recovered); `prior-loop` = Session 1 loop M15–M51;
`cont` = Session 2. Re-issued mutants (M02b, M20b, M45b) replace stillborn forms that failed
`noUnusedLocals`; stillborn mutants are never counted as kills.

### Attribution rules applied

- A kill counts only when a failing test targets the mutated behaviour. Kills whose only browser
  failures were S05 choreography specs were discounted: **M13** stays SURVIVED; **M22** and **M44**
  stand on their unit detectors only.
- **M16**: Session 1 browser run was load-contaminated (38 min, 25 failures incl. browser launch
  timeout). Clean rerun in Session 2: unit 3 + browser 11, all buzzer-path specs, no noise.
- **M18 EQUIVALENT**: the removed guard is only reachable when health ∈ {healthy, degraded}, both of
  which are set only after `connectionOutputConfirmed = true`; all three resets of that flag reset
  health in the same synchronous block. Runtime-confirmed by differential fuzz (original vs M18,
  3000 seeds, 120,000 steps, 977 soft-refresh branch entries, **0 divergences**). Positive control:
  same harness vs M17 diverged in 1154/3000 seeds.
- Browser-only kills spot-checked for relevance (M02b, M04, M19, M35, M40, M46): all failing specs
  exercise the mutated behaviour.

### Scores

| Measure | Value |
| --- | --- |
| Registered | 58 (M01–M55 + M02b, M20b, M45b) |
| Invalid (stillborn) | 3 (M02, M20, M45) |
| Equivalent | 1 (M18) |
| Valid | 54 |
| Raw mutation score | 49/54 = **90.7%** |
| Risk-weighted (R1=1 … R4=4) | 136/149 = **91.3%** |
| R4 | 8/8 killed |
| R3 | 23/26 killed — survivors M13, M51, M54 |
| R2 | 17/19 killed — survivors M47, M48 |
| R1 | 1/1 killed |

### Survivors (test-trust gaps; none repaired during discovery)

| ID | Risk | Teacher-visible failure no test detects |
| --- | --- | --- |
| **M13** | R3 | WebHID transport accepts any Sony device (wrong PID) as the Wbuzz receiver. No unit test drives `browserWebHidTransport` with a fake `navigator.hid`; the browser simulator only ever offers 054c:1000. **HIGH-RISK, preserved as found.** |
| **M54** | R3 | Confirmed Library Delete deletes the first library game instead of the chosen one, and still says "Your other games are unchanged." No unit or browser test covers delete target identity. Teacher data loss. |
| **M51** | R3 | Test-only Wbuzz simulator hook compiled into the production bundle. No production-bundle content guard. |
| **M47** | R2 | Start Game cannot be activated with Enter/Space. No keyboard-activation proof of Start. |
| **M48** | R2 | Start Game invisible (opacity 0) yet clickable. `toBeVisible` ignores opacity. |

### Thin detection (single layer)

Browser-only: M02b, M04, M14, M19, M35, M40 (R4 Final answer leak: no unit detector), M46.
Unit-only: M06, M22, M37 (R3 early winner on Display: no browser detector), M44.
Desktop-only: M49, M50. M45b: desktop relaunch suite did **not** detect (unit + browser did).

## 3. S05 flake classification (clean, unmutated baseline, retries 0)

Isolated (3 S05 files, 43 executed tests): parallel ×10 **430/430**, serial ×5 **215/215**, 0 flaky.

Full clean suite, identical dist fingerprint `cbbb9a4f…` before and after:

| Run | Result |
| --- | --- |
| clean full #1 (6 workers) | 714 pass / 0 fail |
| clean full #2 (6 workers) | 702 pass / **2 fail** (S05) |
| oversubscribed (12 workers) | 690 pass / **4 fail** |
| CPU-throttled ×4 (CDP; probe: 40 ms → 107 ms) | 630 pass / **22 fail** = 6 harness artifacts (copied tree lacks `docs/`) + 10 timeouts + transient-flag races |

| Test | Classification |
| --- | --- |
| waiting-count update during acknowledgement does not cancel the claim marker | **RACE-REPRODUCED** (oversub, throttle) |
| Incorrect + promoted active: buzz owns motion | **RACE-REPRODUCED** (oversub, throttle) |
| observed board→selected acknowledges tile selection | **RACE-REPRODUCED** (oversub, throttle) |
| observed none→active acknowledges without delaying the name | **FLAKY** (failed on clean at normal load) |
| observed none→Correct acknowledges without delaying text | **FLAKY** (clean normal load + throttle) |
| F-HANDOFF | **SUSPECT** (5 mutation-run failures; not reproduced on clean) |
| F-PASSED-ACTIVE | **SUSPECT** (4 mutation-run failures; not reproduced on clean) |
| audience-display Final choreography remount-safe | **RACE-REPRODUCED** (oversub, 1 observation) |

Mechanism (observed): assertions poll a transient acknowledgement flag (`data-claim-changed` /
`bqd--claim-changed`), which is already `false` when polled under load. The clean product does
**not** pass the full browser suite deterministically at retries 0.

## 4. Court B (blinded black-box replay)

Four builds (CLEAN, M28, M37, M40) served under random codes; mapping sealed until all four
independent agents finished; attribution written to `PRE-UNSEAL-ATTRIBUTION.md` before unsealing.

| Code | Build | Outcome |
| --- | --- | --- |
| BCCEB | M28 | **Detected** — Deduct with Comet Crew selected debited Magma Masters (4/4) |
| B5D88 | M37 | **Detected** — "Winner: Comets" on Display before End (Court A had unit-only detection) |
| B1DC7 | CLEAN | No mutation symptom; clean-product defects reported (below) |
| B67A3 | M40 | **Not detected** — Home demo game has no Final round; leak unreachable on that path |

Blind attribution matched the sealed mapping for all four codes.

Clean-build defects (B1DC7 = CLEAN; most also reported on all other builds, so mutation-independent):

1. After Host reload + Resume class, Host reports "Display not open" while the Display popup is open
   and live. Code-consistent: `displayOpen` is component-local `useState(false)`
   (`src/host/FoundationControls.tsx:129`). No test covers this copy.
2. After reload, buzzer receiver returns to "Permission required"; Host status/resume banner do not
   flag it (tester notes the simulator may contribute).
3. Typed team name is not committed until Enter/blur; the first Start Game click is inert.
4. Handset 2 labelled "Controller 1 · button 6" in Buzzer Check but "Controller 2" in the mapping list.
5. Board-only game: Display shows "Game complete" and scores, no winner; Final game names a winner.
   Contract (HG-10/DP-05 "completion-only winner") does not settle board-only behaviour → owner decision.
6. Score undo disabled after answer reveal (may be by design; not adjudicated).
7. Home's only ready-made game has no Final, so the brief's Final journey is unreachable on the ordinary path.

Not observed on any build: answer, notes or wagers on Display before the teacher's reveal; Host/Display
score disagreement (other than M28); reload/resume loss of score or progress.

## 5. Cross-surface invariants

| Invariant | Evidence | State |
| --- | --- | --- |
| Projector privacy (answer/notes/Final) | M39, M40, M53 killed; Court B no leak on clean | Held; M40 single-layer |
| Completion-only winner | M37 killed unit-only; Court B detected | Held; browser gap |
| Host/Display score parity | M28, M29, M33 killed; Court B parity on all non-M28 builds | Held |
| Persistence / writer lease | M42, M43, M44, M45b killed | Held; desktop relaunch gap (M45b) |
| Exact receiver identity | M14 killed; **M13 survived** | **Gap** |
| Library data safety | **M54 survived** | **Gap** |
| Host truth about Display state after reload | Court B clean defect #1 | **Product defect, untested** |

## 6. Claim register (journey-matrix IDs touched)

KILLED with ≥2 layers: HL-07, AI-07 (M05), CS-04, CS-09, CS-14 (M09), CS-15, CS-13, HG-05, HG-06,
HG-08, HG-09 (M36), HG-10, HG-13, DP-02, DP-04, PER-SAVE, PER-WRITER, IMP-FAILCLOSED, WB-REPORTID,
WB-LEN, WB-FIRSTFAIL, WB-SLOTMAP, WB-SLOTBASE, WB-AUTOENABLE, WB-EXPLICITOFF, WB-RESPONDING.
Single-layer only: HL-05 (M02b), AI-07 (M04), WB-FILTER, WB-TESTMODE, WB-MASQUERADE, DP-05,
VP-720, PKG-SHA, DP-01, PER-RELOAD. Gaps: WB-VIDPID, HL-06, PKG-TESTLEAK, A11Y-KEY, VP-HIDDEN.

## 7. Verdicts

```text
COURT A:    GAPS REMAIN
COURT B:    FAIL
TEST TRUST: TEST TRUST GAPS REMAIN
```

Reasons: five surviving mutants (three R3, including M13 and the M54 data-loss path); full suite not
deterministic at retries 0 on clean product; Court B observed untested teacher-visible defects on the
clean build.

## 8. Restoration proof (observed 22:0x CT)

| Check | Result |
| --- | --- |
| Lease `HEAD` | `8ae66ad…`; `git status --porcelain` empty; `git diff HEAD` empty; tree identical to baseline |
| Lease commits beyond baseline | 0 |
| Session 2 worktree | `8ae66ad…`, clean before this receipt file was added |
| Session 1 worktree | `8ae66ad…`, clean |
| Pushed refs | none matching mutation/lease/audit; no commits made by the campaign |
| origin/main | advanced only by PR #144 (docs-only, owner); untouched by the campaign |
| Stash | none created (0 entries on lease) |
| Servers / test processes | 0 listeners on 4391–4404; 0 Playwright/Vitest/preview processes |

## 9. Non-claims

- No mutation was repaired, merged or pushed. No owner testing was performed.
- Session 2 did not self-certify anything; M13 repair is proposed only and needs a fresh reviewer.
- Physical hardware was not exercised; Wbuzz evidence is simulator-only.
- Court B covered one build per mutant with one tester each; non-detection of M40 is a reachability
  limitation of the demo content, not evidence of absence.

## 10. Proposed follow-up (not authorized here)

**M13 bounded test-repair slice:** add unit coverage in `src/input/webHidTransport.test.ts` driving
`browserWebHidTransport` with a fake `navigator.hid` whose `getDevices`, `requestDevice` and
`disconnect` events include a wrong-PID Sony device; assert it is never granted, returned or
reported. Acceptance: fails under M13, passes on clean product, reviewed by a fresh independent
reviewer.
