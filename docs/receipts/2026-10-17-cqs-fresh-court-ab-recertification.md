# CQS fresh Court A/B recertification: final mechanical owner-handoff gate

| Field | Value |
| --- | --- |
| Date | 2026-10-17, 16:35 to about 21:30 Central Time |
| Baseline (bound) | `9136a944513b784160dbf7b857c979cafeedc739` (origin/main at start and at close), tree `516c878ec4f204834efcb402e84e695334bee93f` |
| Worktrees | `cqs-qual` (clean baseline, detached at baseline), `cqs-mut` and `cqs-mut2` (disposable mutation leases, detached at baseline) |
| Retries | 0 for every local run in this receipt. CI evidence is read as first-attempt only (no `flaky` line) |
| Status | Evidence snapshot only. The recertification run made no product or test repairs, no merges and no pushes. Not an owner decision, not eligibility |

Independence note: the coordinating session also authored repair PRs A to H earlier. To limit
self-certification, every mutation was designed by a fresh subagent from the historical register
only. The Court B runs were done by fresh blind tester agents with no repo access, and their builds
were sealed. Every PASS/FAIL below rests on fresh runs against 9136a94.

## 1. Environment

| Item | Value |
| --- | --- |
| OS | Ubuntu 24.04.5 LTS, kernel 6.18.44, 4 CPUs, 15 GB RAM (cloud container) |
| Node / npm | v22.22.0 / 10.9.4 |
| Packages | react 19.2.8, vite 7.3.6, vitest 3.2.7, @playwright/test 1.61.1, typescript 5.9.3, electron 43.4.0 (binary installed in-session) |
| Browser (local) | Chromium 141.0.7390.37 (r1194, full build via `PLAYWRIGHT_CHROMIUM_PATH`); Playwright 1.61.1 pins r1228 (149) headless-shell, used by CI |
| Substitution | xlsx 0.20.3 (cdn.sheetjs.com blocked) replaced by registry 0.18.5 in node_modules only; lockfile untouched |
| Retry config | `retries: CI ? 2 : 0`; local runs pass `--retries=0` explicitly |

## 2. Clean baseline (before any mutation)

| Gate | Result |
| --- | --- |
| Lint | 0 errors, 3 warnings (pre-existing react-refresh, `src/theme/ThemeProvider.tsx`) |
| Typecheck (`tsc -b --noEmit`) | pass |
| Unit (vitest, full) | 205 files; **3046 passed, 2 skipped**, 0 failed |
| `git diff --check` | clean |
| CI exact SHA, run 39069578106 attempt 1 | lint, typecheck, unit, build all success; Playwright **801 passed / 237 skipped / 0 failed / 0 flaky** (first attempt; CI workers 1); dist sha256 `abb60ce6…6c8c` |
| CI desktop, run 39069578139 attempt 1 | Electron shell **11 passed**, no flaky; build identity sourceSha 9136a94; unsigned macOS package success; unsigned Windows package success |
| Local Desktop/Electron (Xvfb, `CQS_SOURCE_SHA` set as CI does) | **11 / 11 passed**, retries 0 |
| Local browser full run 1 (2 workers) | **794 passed, 4 failed, 3 did not run, 237 skipped** (38.2 min) |
| Local browser full run 2 (2 workers) | **795 passed, 3 failed, 3 did not run, 237 skipped** (37.7 min) |

### First-failure classification (no rerun-to-green)

| Failure | Runs | Classification | Evidence |
| --- | --- | --- | --- |
| `gamepad-input.spec.ts:318` simulated Sony Buzz candidate (all 3 projects; serial follower "did not run") | 2/2, deterministic | **HARNESS-ENV (browser binary)**: not product | Same spec, same build: full Chromium r1194 fails at the rAF settle helper (`settleGamepadPolls`, 90 s timeout); Chromium headless-shell r1194 passes **6/6** (CI uses headless-shell r1228 and is green). The repo's own reachability spec notes "a background headless page stalls rAF"; a minimal two-page check did not stall, so the exact trigger is not pinned |
| `portable-packs.spec.ts:408` export-after-import [mobile-host] | 1 of 2 full runs | **TEST RACE (test-trust gap)**: frozen, not repaired | Assertion reads the Display `<img src>` once without polling. Product renders the hosted path until pack media hydrate, then switches to `blob:`. Observational probe: normal load 5/5 first-src blob; CPU throttle 4x: 2/5 first-src hosted path, all 5 settled to `blob:` within 5 s, no "Image unavailable" fallback. No lasting teacher-visible failure observed; the clean suite is still not first-attempt deterministic |

## 3. Court A: mutation register

Historical register recovered in full from
`docs/receipts/2026-10-15-cqs-adversarial-test-trust-qualification.md` §2 (58 entries: M01 to M55
plus M02b, M20b, M45b). Each mutant was re-expressed by a fresh designer as one or more exact
unique substitutions. It was compile-gated (`tsc -b`) and run against its predicted detectors at
retries 0, then fully reverted, with HEAD and status asserted clean (fail-closed runner).
Escalation ladder: R1/R2 stopped at a clean L1 kill. R3/R4 ran unit plus browser. L4 was used for
the ambiguous and survivor cases.

Kill attribution was checked per failing title: each counted failure targets the mutated behaviour.
Discounted:
- M27's extra `gamepad-input` timeout (the environment artifact above).
- The first M49 desktop run, which was invalid because the worktree's `.git` file gives
  sourceSha "unknown" on clean too. It was rerun with `CQS_SOURCE_SHA`; the clean rerun went green.

| ID | Risk | Disposition | Detector layers (fresh) |
| --- | --- | --- | --- |
| M01 | R3 | KILLED | unit+browser |
| M02 | R2 | KILLED (valid now; re-expressed, unused import removed) | browser |
| M02b | R2 | KILLED | browser |
| M03 | R3 | KILLED | unit+browser |
| M04 | R4 | KILLED | browser only (thin for R4) |
| M05 | R2 | KILLED | unit (L1) |
| M06 | R2 | KILLED (designer flagged equivalent-suspect at UI level; unit gate detects) | unit (L1) |
| M07 to M11 | R2/R1 | KILLED | unit (L1) |
| M12 | R3 | KILLED | unit+browser |
| M13 | R3 | **KILLED (repaired survivor)** | unit (fake navigator.hid, 3 tests); browser cannot offer a wrong-PID device by construction |
| M14 | R3 | KILLED | browser |
| M15 to M17 | R3 | KILLED | unit+browser |
| M18 | R3 | **EQUIVALENT** | fresh differential fuzz: 3000 seeds, 120,000 steps, 3247 soft-refresh entries, **0 divergences**; positive control M17 diverged in 876/3000 |
| M19 | R3 | KILLED | browser |
| M20 | R2 | DUPLICATE of M20b (historic stillborn form; not counted) | — |
| M20b | R2 | KILLED | unit (L1) |
| M21 | R3 | KILLED | unit+browser |
| M22 | R3 | KILLED | unit only (thin: no browser gamepad with partial Sony id) |
| M23 | R3 | KILLED | unit only (browser structurally blind: simulator uses the product's own slot function; real slot order is physical-only) |
| M24 | R3 | KILLED | unit+browser |
| M25 | R2 | KILLED | unit (L1) |
| M26 to M29 | R3 | KILLED | unit+browser |
| M30, M31 | R2 | KILLED | unit (L1) |
| M32 | R3 | KILLED | unit+browser |
| M33 | R4 | KILLED | unit+browser |
| M34 | R2 | KILLED | unit (L1) |
| M35 | R3 | KILLED | browser |
| M36 | R3 | KILLED | unit+browser |
| M37 | R3 | KILLED | unit+browser (browser layer is new since the historical receipt) |
| M38 | R3 | KILLED (re-expressed on the completion selector; identical edit to probe PF) | unit+browser |
| M39 | R4 | KILLED | unit+browser |
| M40 | R4 | KILLED | browser only (thin for R4: no unit sanitizer detector for Final answer at responses-locked) |
| M41 | R2 | KILLED | unit (L1) |
| M42, M43 | R4 | KILLED | unit+browser |
| M44 | R3 | KILLED | unit only; browser reload masked by the pagehide marker |
| M45 | R3 | DUPLICATE of M45b (historic stillborn; not counted) | — |
| M45b | R3 | KILLED | unit only; browser and Electron relaunch did not detect |
| L4 M44+M45b | R3 | KILLED | browser same-window reload fails when both mechanisms are removed; Electron relaunch still passed (historic "desktop false read-only" impact not reproduced) |
| M46 | R2 | KILLED | browser (720p viewport) |
| M47 | R2 | **KILLED (repaired survivor)** | browser: 4 Tab+Enter/Space tests, posture stays `setup` |
| M48 | R2 | **KILLED (repaired survivor)** | browser: 4 natural 1280x720 effective-opacity checks |
| M49 | R2 | KILLED | desktop Q5-A + Q7 desktop (env-correct rerun; clean rerun green) |
| M50 | R2 | KILLED | desktop Q5-B (clean rerun green) |
| M51 | R3 | **KILLED (repaired survivor; re-expressed)** | browser production-bundle scan. Thin: the guard matches `__cqs*` hook names only |
| M52, M53 | R4 | KILLED | unit+browser |
| M54 | R3 | **KILLED (repaired survivor)** | unit + natural-route browser delete-and-reload |
| M55 | R2 | KILLED | unit (L1) |

Repaired survivors: every one went MUTATION RED, then full revert, then CLEAN GREEN on the same
detectors (M13: unit 3 fail→0, browser 1/1 green; M51: 1 fail→green; M54: unit 1 + browser 1
fail→green; M47: 4 fail→green; M48: 4 fail→green).

### Scores

| Measure | Value |
| --- | --- |
| Historical entries | 58 |
| Duplicate / invalid (not counted) | 2 (M20, M45: stillborn forms superseded by M20b, M45b) |
| Equivalent | 1 (M18) |
| Obsolete | 0 |
| Valid | 55 |
| Killed / survived | 55 / 0 |
| **Raw score** | **55/55 = 100%** |
| **Risk-weighted (R1=1..R4=4)** | **151/151 = 100%** (R4 8/8, R3 26/26, R2 20/20, R1 1/1) |
| Retry-dependent kills | 0 (all runs retries 0) |
| Unrelated-flake kills | 0 counted (M27 extra timeout and first M49 run discounted) |

Thin detection (killed, single layer): browser only M02, M02b, M04 (R4), M14, M19, M35, M40 (R4),
M46, M47, M48, M51; unit only M13, M22, M23, M44, M45b; desktop only M49, M50.

### Current-Court semantic probes (all killed)

| Probe | Mutation | Unit | Browser |
| --- | --- | --- | --- |
| PA | Display stops answering presence probes (presence lie after Host reload) | 9 | 2 (CB-01 both) |
| PB | typed name not reported until blur (first Start activation lost) | 5 | 3 forced (court-b-b centre, top edge, dense 8-team) |
| PC1 | Final response-time-up expiry becomes the Undo target after settlement | 6 | 4 (NEW-1 tests) |
| PC2 | Final settlement not recognised as a score undo | 1 | 1 forced (CB-06b) |
| PD | Buzzer Check says "Controller N · button k" | 0 | 2 (CB-04, golden path) |
| PE1 | Final round removed from the qualification fixture | 1 (guard) | 6 forced (CBJ-05/06/07 and court-b-h Final cases time out: Final unreachable) |
| PE2 | brief gains an unbacked journey row | 1 (guard) | n/a |
| PF | tied explicit end names first leader Winner | 1 | 4 |
| PF2 | explicit-end completion shows no Winner/tie | 2 | 9 |
| PG1 / PG2 / PG3 | readiness scope drops session / restore-settled gate ignored / kept grant counted as drop | 1 / 1 / 1 | 1 / 1 / 1 forced |
| PH1 | "Getting ready" after game ended before Final began | 1 | 2 |
| PH2 | ordinary "End the game" always disabled | 0 | 2 (click waits on `disabled`; attributable) |

## 4. S05 determinism (clean, retries 0)

| Mode | Result |
| --- | --- |
| Clean full suite x2 at normal workers | 0 S05 failures in both |
| Isolated 3 S05 files, parallel, repeat 10 | **530/530**, 0 flaky (median 0.87 s/test) |
| Isolated, serial, repeat 5 | **265/265** (median 0.64 s) |
| Oversubscribed 12 workers, repeat 4 | **212/212** (median 5.5 s: load confirmed) |
| CPU-throttled 4x (CDP on Host and Display), repeat 3 | **159/159** (median 1.9 s: throttle confirmed) |
| Acknowledgement broken (S05ACK1 never acknowledges; S05ACK2 acknowledges wrong transition) | unit 6 and 3 fail; S05 browser specs fail (3 and 2 titles) |

The historical S05 race did not reproduce in any mode.

## 5. Court B (blind black-box)

Pre-run reachability: CBJ-01 to CBJ-07 passed in both clean full runs, and the brief-to-journey
guard passed 6/6.

Builds:
- One CLEAN build and six seeded builds, each a dist built from the mutation worktree and then
  reverted.
- Each build was served under a random code and port.
- The mapping was sealed at 2026-10-18 00:21 UTC (19:21 CT) with sha256
  `354bf9ddfefd523b0be96f9f0fe0a5aca71e0b0b4f3422e9dca8c492d80e8060`.

Testers:
- Seven fresh agents, one per build, each confined to an isolated workspace.
- They used a persistent browser driver with only role, label, text, keyboard and mouse access,
  plus the committed fixtures and a simulated 054c:1000 receiver with four handsets at the
  hardware boundary.
- Disclosed deviations: B3267 used one programmatic `.focus()`; B605F used one
  `scrollIntoViewIfNeeded` for a screenshot only. Neither changed a result.
- Subagents could not write files, so each report was returned as text. The auditor froze each one
  as `REPORT.md` before unsealing.

Attribution was written to `PRE-UNSEAL-ATTRIBUTION.md` (sha256 `20610eee…0a68`) before reading the
mapping.

| Code | Sealed seed | Blind attribution | Detected | Tester evidence |
| --- | --- | --- | --- | --- |
| B605F | S1 scoring target corruption (deduction debits first team) | S1 | yes | deduction to team 2 debited team 1, 6/6 |
| B3267 | S6 tied explicit end names Winner | S6 | yes | tied end before Final and board end showed "WINNER" first team, 2/2 |
| B6A2E | S2 Final answer published at responses-locked | S2 | yes | "ANSWER Mantle convection" on Display before Reveal, 2/2 |
| B2E9C | S4 pending-name first click | S4 | yes | Start disabled until blur; first click only commits, 2/2 |
| B9FD1 | S3 Display presence lie after reload | S3 | yes | "Display not open" while live, 6/6 |
| B90A1 | S5 Final Undo buried by expiry | S5 | yes | "Undo response time up" inert after settlement, 1/1 (4 clicks) |
| B2379 | CLEAN | CLEAN | — | no seed signature |

Seeds detected: **6/6**. Blind attribution matched the sealed mapping **7/7**.

### Blocking clean-build defects (adjudicated against clean 9136a94)

| ID | Observation | Builds reporting | Adjudication | Classification |
| --- | --- | --- | --- | --- |
| CBN-1 | Assigning a second buzzer to a team (Buzzer 3/4) and saving: Buzzer Check still says "no team yet". Then **no handset buzzes in at all**, while the app says "Team mapping saved" and "Buzzers ready". This persists after reload; only unassigning or per-team Assign recovers | 7/7, including CLEAN B2379 | Reproduced on clean with the repo's own simulator helpers (default mapping: handset 1 buzzes Team 1; Buzzer 3→Team 1 and 4→Team 2: "Nobody has buzzed yet"). Root cause: `materializeSupportedProfileMapping` → `validateGamepadMapping` rejects the mapping, which silently becomes `EMPTY_GAMEPAD_MAPPING`, while `saveAssociations` sets status `ready` | **FUNCTIONAL DEFECT (buzzer truth)**: R3, teacher-visible, not physical-only. **FROZEN, not repaired.** No automated detector |
| CBN-2 | After a board response timer expires following a score change, Live Undo reads "Undo time up" and does nothing; score undo is unavailable | B3267, B6A2E (label), B2E9C (step noted) | Reproduced on clean: 2 clicks, label and scores unchanged. Root cause: board `RESPONSE_TIMER_EXPIRED` is `reversible: true`; undo re-opens a timer past its deadline, which re-expires. NEW-1 fixed only the Final variant | **FUNCTIONAL DEFECT (Undo integrity)**: R3. **FROZEN.** No automated detector |
| CBN-3 | Host Final wager/response countdown does not tick (host 1:00 while Display 0:47) | B90A1 2/2 | Code-confirmed: `FinalWagerHostPanel` renders `clock.now()` captured at render; no ticking subscription | DEFECT (wrong information, teacher-private), medium-low. FROZEN |

### Low-severity, owner-preference, intended-contract and unproven observations (not blocking; preserved for follow-up)

| ID | Observation | Builds reporting | Adjudication | Classification |
| --- | --- | --- | --- | --- |
| CBN-4 | "Back to setup" mid- or after-game shows SCORES 0/0 | 4 builds incl. CLEAN | Reproduced; `ClassroomSetupPanel` preview hard-codes `score: 0` | LOW wrong information (private), follow-up |
| CBN-5 | Over-maximum wager silently not saved, no message | 5 builds | Reproduced: no alert, "Not saved yet" | LOW UX follow-up |
| CBN-6 | Teacher screen never shows the Final question; answer only after lock | 7/7 | No contract requires it | OWNER PREFERENCE / design question |
| CBN-7 | Home "Open Display" turns the teacher tab into the Display | 7/7 | Intended web contract (journey matrix HL-08; `menus-q2-p-home-display` asserts same-tab) | INTENDED CONTRACT (owner may want a way back) |
| CBN-8 | Game-file team names count as "0 of 2 named" | 6 builds | Setup copy: "Each team has a unique class name" (CS-09) | Apparent intended contract; wording follow-up |
| CBN-9 | Name bank gives team 2 only blank choices until More/Choose again | 6 builds | Not root-caused | UNPROVEN, low, follow-up |
| CBN-10 | "Ready to save this class session." after Resume | 7/7 | Save truth held in degraded probe (24/24) | LOW wording |
| CBN-11 | First handset press after entering Buzzer Check not shown | 4 builds | Not root-caused; may involve the simulator settle | UNPROVEN, low |
| CBN-12 | Classic Final with no positive scores jumps to "the lead is TIED" without an eligibility message | B9FD1 | Not adjudicated | UNPROVEN, low/medium follow-up |
| CBN-13 | "End the game session" after Final settlement ends without confirmation | B6A2E | Not adjudicated | LOW follow-up |
| CBN-14 | Cosmetic and accessibility: raw epoch timestamps and session id in summary; Display accessible heading always "Game display ready"; Display strip "Ready" for judged teams; winner score colour; identical control labels; "Connect classroom buzzers" vs "Connect buzzers"; spreadsheet import says "game file"; developer diagnostics reachable in host More; Sound toggle inert in headless (not claimed) | many | — | COSMETIC / owner preference |

Not observed on any build (projector privacy and parity held on CLEAN):
- No board answer, private note, alternate or wager was projected before reveal (the only Final
  answer leak was on seed S2).
- Host and Display scores always agreed (except on seed S1).
- Reload and Resume never lost score or progress.
- Persisted-grant reload restored the receiver.
- The resume buzzer notice appeared only when warranted.

## 6. Degraded mode

| Check | Result |
| --- | --- |
| Normal-load repeated clean suite | 2 runs: only the env artifact plus 1 test-race failure (§2) |
| Oversubscription | S05 at 12 workers 212/212; full suite at 12 workers on 4 cores: 770 passed, 10 failed, 21 did not run, 237 skipped (15.6 min). Failures: gamepad:318 x3 (env artifact); 3 load timeouts at 30 s (category-board:63, completed-summary-ledger:20, portable-packs:286); 2 empty-render-at-assert under load (CB-01 status "", CBJ-05 Display body ""), both 2x passing under 4x throttle; portable-packs:222 (same single-read src race); buzz-in:99 [720p] transient acknowledgement attribute already cleared (S05-style race, oversubscription only). None indicates a product defect |
| CPU throttle 4x on presentation-ack paths | S05 159/159; Display presence after reload, persisted-grant reload, resume notice, persistence recovery, writer-lease reload, projector refresh: **160/160** (repeat 2, all projects) |
| Reload while persistence settles (truthful save gate, throttle 4x) | 24 reloads (immediate and after "saved"): status said "saved on this device" at every reload and **24/24 kept the last change**. The in-flight "Saving" window was never caught |
| Display close / reopen / reload timing | covered by CB-01 specs (clean, throttled) and teams-scoring projector refresh / second projector (throttled) |
| Simulated grant restore and no-grant | CB-02 kept-grant reload and resume-notice specs pass clean and throttled; Court B testers saw correct reconnect messaging both ways |
| Harness vs product | Harness artifacts: gamepad rAF (browser binary), worktree sourceSha, probe selector errors (corrected; not counted). Product: CBN-1..3 |

## 7. Cross-surface invariants

| Invariant | Evidence | State |
| --- | --- | --- |
| Projector privacy | M39, M40, M53, PH1 killed; S2 seed detected; no clean leak | Held (M40 browser-only) |
| Host/Display score parity | M28, M29, M33 killed; S1 detected; parity on all other builds | Held |
| Completion truth | M37, M38/PF, PF2, PH1, PH2 killed; S6 detected | Held |
| Display presence truth | PA killed; S3 detected; clean correct | Held |
| Persistence | M42, M43, M44, M45b, L4 killed; 24/24 save-gate reloads | Held |
| Writer lease | M43, M44, M45b, L4 killed | Held (single-layer pieces) |
| Buzzer truth | M15..M17, M19..M21, M24 killed; **CBN-1 violates it on clean** | **Broken** |
| Exact receiver identity | M13, M14 killed | Held (simulation) |
| Library delete safety | M54 killed (unit + natural route) | Held |
| Accessibility / perceivability | M47, M48, M55 killed | Held (cosmetic labels in CBN-14) |
| Final Undo integrity | PC1, PC2 killed; S5 detected; clean Final Undo correct | Held for the Final; **board-timer variant broken (CBN-2)** |

## 8. Physical-only boundary (no claim)

Not exercised:
- Chrome WebHID grant persistence across Host reload.
- First-press Gamepad exposure on real hardware.
- Keep-alive dependency.
- Handset slot order vs Buzzer 1..4 (M23 is detectable only by the unit recipe).
- Real restore duration.
- The real pre-reload "Saving" window timing.
- RF/BIND, LEDs, USB quirks.
- Audio output.

All Wbuzz evidence here is simulated.

## 9. Restoration proof

| Check | Result |
| --- | --- |
| Mutations | every edit reverted by `git checkout`; the runner asserted HEAD 9136a94 and empty status after each mutant (0 revert failures) |
| `cqs-qual`, `cqs-mut`, `cqs-mut2` before removal | HEAD `9136a944…`, tree `516c878e…`, `status --porcelain` empty, `diff HEAD` empty, 0 stash entries; then removed with `git worktree remove` (clean) |
| Servers and processes | all preview servers (4173, 4391, 4392, 4511-4574) stopped (no HTTP response); driver ports 4611-4617 closed; no playwright, vitest, vite, chromium, electron or driver processes left |
| Qualification commits pushed | none. Origin head refs: none created by this run (the only `qual`-named branch is the owner's `docs/resumable-human-qualification`, 9b8d65c, 2026-09-11) |
| origin/main | `9136a944513b784160dbf7b857c979cafeedc739` at start and at close (unmodified) |
| Primary checkout | `/home/user/classroom-quiz-show` unchanged on its prior branch; no files written there by this run |
| Artifacts | logs, mutation results, probes, sealed mapping, attribution and frozen tester reports were kept in the auditor's session scratch (not committed) |

## 10. Non-claims

- No product or test code was repaired, committed or pushed. Mutations lived only in the
  disposable lease worktrees and were reverted after each run.
- Court B testers used a hardware-boundary simulator, not physical Sony/Namtai devices.
- Seven testers, one per build, gave single-observer evidence per build.
- The CBN-9, CBN-11 and CBN-12 root causes were not established.
- The gamepad:318 trigger inside full Chromium was not pinned beyond binary dependence.

## 11. Verdict

```text
COURT A:    GAPS REMAIN
COURT B:    FAIL
TEST TRUST: TEST TRUST GAPS REMAIN

OWNER FUNCTIONAL HANDOFF: NOT ELIGIBLE
```

Court A: GAPS REMAIN, even though every valid historical mutant (55/55), every repaired survivor
and every current probe was killed. Two criteria are not met:
- the clean browser suite is not first-attempt deterministic at retries 0 (the `portable-packs`
  test race, observed once in two normal-load runs and reproduced under throttle);
- the automated net did not detect three clean-build functional defects that blind testers found
  (CBN-1, CBN-2, CBN-3).

Court B: FAIL. The CLEAN build carries new teacher-visible functional defects that are not intended
contract, owner preference, or physical-only:
- CBN-1: buzzer mapping silently disabled while the app reports ready and saved;
- CBN-2: board-timer expiry traps Undo.

Court B's seeded-defect detection was otherwise strong: 6/6 seeds detected, and 7/7 blind
attribution.

Frozen for a separate, authorized repair session (not fixed here):
1. CBN-1 (R3): reject or support multi-buzzer-per-team mappings truthfully, and add unit and
   browser detectors.
2. CBN-2 (R3): make board timer expiry irreversible as for the Final, and add detectors.
3. CBN-3: host Final countdown ticking.
4. The `portable-packs` single-read race: poll the src.
5. Optional thin-layer hardening: M40 and M04 (R4), plus M22, M44 and M45b.
