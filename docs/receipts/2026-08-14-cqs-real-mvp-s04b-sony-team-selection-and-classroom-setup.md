# CQS-REAL-MVP-S04B — Sony team selection and classroom setup

## Identity

- **Slice:** `CQS-REAL-MVP-S04B-SONY-TEAM-SELECTION-AND-CLASSROOM-SETUP`
- **Program:** `CQS-REAL-MVP-1`
- **Authorization:**
  `AUTHORIZE-CQS-REAL-MVP-S04B-SONY-TEAM-SELECTION-AND-CLASSROOM-SETUP-1`
- **Kind:** implementation / qualification receipt for a frozen,
  independently reviewable candidate. **Not** an independent exact-head
  review. **Not** a merge. **Not** terminal S04B completion.
- **Date (America/Chicago):** 2026-08-14
- **Repository:** `ricktron/classroom-quiz-show`

Do not edit this receipt after exact-head review merely to write a PASS
at that same head. Review belongs to later review evidence / handoff.

## Starting base and fresh local provenance

| Fact | Observed |
| --- | --- |
| Expected canonical `origin/main` | `cf90eadb7794a3e2c2f529212432e4a4daaadc91` |
| Exact starting `origin/main` | `cf90eadb7794a3e2c2f529212432e4a4daaadc91` |
| Host | `Ricks-MacBook-Air.local` |
| User | `macdaddy` |
| cwd / Git toplevel | `/Users/macdaddy/Documents/Coding/Cursor Projects/classroom-quiz-show-s04b` |
| Isolated worktree | created from that exact `origin/main` |
| Delivery branch | `feat/cqs-real-mvp-s04b-sony-team-selection` |
| Working tree at preflight | clean |
| Open PRs at preflight | none |
| Remote `s04b` branch at preflight | none |
| Preflight timestamp | 2026-08-14 21:49:59 CDT |
| Freeze timestamp | 2026-08-14 22:21:33 CDT |

The original checkout at
`/Users/macdaddy/Documents/Coding/Cursor Projects/classroom-quiz-show`
was a clean stale S04A branch and was **not** mutated.

## Architecture choices

Preserve existing authorities. No durable schema / protocol bump.

| Concern | Choice |
| --- | --- |
| Game-owned bank | Reuse `AuthoringDraft.game.teamNameBank`. Not compiled into canonical Game schema v1. |
| Session-owned names | `localStorage` key `cqs.session-team-identities.v1`. Leader-only writes. |
| Public names | Overlay existing `PublicTeam.name` values only. No public-state wire bump. |
| Sony input | Reuse `useGamepadBuzzInput` `selectionMode` / test-mode path. No new HID stack. |
| Button map | Existing supported profile: Yellow=`secondary4`, Green=`secondary3`, Orange=`secondary2`, Blue=`secondary1`, Red=`primary-buzz`. Red never selects. |
| Mutation point | `applyTeamNameInputs` — one deterministic pass (team order, then claim/manual before cycle). |
| Workbook | Optional `TEAM_NAMES` sheet. Format remains **1**. Not required. |
| Display | Host preview via existing `TeamScoreboard`. Display stays sanitized / read-only. |
| Audio | ADR-020 `setMuted(true)` panic mute. No theme songs or identity packs. |

If a consequential durable migration had been required, this run would have
stopped. None was required.

## What was implemented

Teacher flow: Home → open/create/import Game → start Session → Teams →
optional Sony → name selection / manual assignment → Display readiness →
Audio readiness → Play.

- Centralized uniqueness / claim / Red-cycle engine with 40 ms hardware
  debounce only. No punitive cooldown. Deterministic wrap. No invented names.
- Host `ClassroomSetupPanel` + `TeamNameSelectionBoard` with ordinal +
  color-word cues, pastel choice colors, selected/subdued states,
  high-contrast / reduced-motion / grayscale flags, and long-name wrap.
- Sony ordinary copy guides Connect → assign → Buzzer Check without
  WebHID, report IDs, button indices, or profile identifiers. Those remain
  in Advanced.
- Keyboard / typed names always complete the class. Sony failure does not
  strand Play.
- Display open/focus control and Host-only audience preview.
- Always-visible **Mute all sounds**.
- Product-language readiness summary. Play is gated on 1–8 teams and
  unique names. Sony and Display are advisory.
- Optional workbook `TEAM_NAMES` generation contract: target ≈96, warning
  &lt;64, school-safe / unique / not answer-revealing. Short bank is a
  HEURISTIC, not an import failure.
- Home `?play=` starts in setup (`playReady` false). Host-direct / existing
  e2e load paths stay playable so buzzing is not stolen.

## Game versus Session evidence

`src/session/sessionTeamIdentities.test.ts` writes selected names to the
session overlay and proves the saved Game export is byte-identical and
does not contain the selected classroom name. The Game-owned draft bank
still contains those authored names.

Follower writes are refused.

## F-UX-01 / CQS-Q23-LOW-01 disposition

Ordinary Sony and Class setup copy no longer require a teacher to know
WebHID, report IDs, button indices, internal mapping records, or
`cqs.sony-buzz.namtai-wbuzz-wireless.v1`. Advanced diagnostics remain
available and still may show VID/PID.

This candidate **addresses** F-UX-01 in implementation. Independent
exact-head review must confirm. This receipt does **not** write a review
PASS or mark the finding terminally closed on `main`.

## Physical packaged-macOS Sony gate

```text
PHYSICAL SONY GATE: BLOCKED / NOT EXECUTED
```

Re-observed 2026-08-14 22:04:57 CDT on `Ricks-MacBook-Air.local`:

- `ioreg -p IOUSB -l -w 0` had no `054c` / Wbuzz / Sony match
- `system_profiler SPUSBDataType` had no Sony / Wbuzz / `054c` / Buzz match

Exact attached controller count: **0**.

Automated tests still cover all four logical Sony slots. This receipt
does **not** invent a four-controller physical requirement and does
**not** fake a packaged hardware run.

## Local verification observed on this worktree

| Command | Result |
| --- | --- |
| `git diff --check` | exit 0 |
| `npm run verify` | lint: 0 errors, 3 pre-existing ThemeProvider `react-refresh` warnings; typecheck pass; **2523** unit tests passed / **2** skipped |
| `CI=1 npm run verify:all` | same unit result; production preview built in-process; Playwright **379** passed / **14** skipped. `reuseExistingServer=false` because `CI=1` |
| `npm run test:desktop` | desktop renderer+main built; **3** passed |

An earlier `CI=1 npm run verify:all` on this worktree failed 4 e2e cases
(Sony intro honesty phrases; mobile viewport equality). Those were fixed
in-tree before the passing run above. Only the passing run is claimed.

Physical packaged Sony: **not executed** (hardware unavailable).

## Residual findings

| ID | Severity | Note |
| --- | --- | --- |
| Physical Sony gate | BLOCKER for terminal S04B / S06 representation | Hardware unavailable on this host. Not faked. |
| ThemeProvider fast-refresh | LOW / pre-existing | 3 eslint warnings. Unrelated to S04B. |
| Host `window.open` Display from Class setup | LOW | Omits `noopener` so `.closed` can be polled. HostRoute Open Display still uses `noopener`. |
| `sonyReady` signal | LOW | Uses mapping-ready + Wbuzz present + associations. Does not require the repair-flow responding-slot layer. Keyboard fallback still allows Play. |

## Rerouted / not begun

- S04C recovery / backup UX
- S04D telemetry / feedback path
- S05 theatrical visual redesign, theme songs, team identity audio
- S06 integrated release qualification, Windows physical runtime, signing

## Explicit non-claims

- This receipt does **not** claim S04B is merged or Complete.
- It does **not** contain an independent-review PASS.
- It does **not** predict a PR number, squash SHA, or GitHub check PASS.
- It does **not** claim packaged-macOS physical Sony qualification.
- It does **not** claim Windows physical runtime qualification.
- It does **not** claim a teacher-trusted signed release.
- It does **not** claim live AI, cloud, accounts, or a HID catalog.
- It does **not** bump workbook, GameDefinition, IndexedDB, session wire,
  public-state wire, pack, or Sony profile versions.
- It does **not** authorize S04C, S04D, S05, or S06.

---

## R1 same-slice repair (H1 rejected → H2)

This section does **not** erase the H1 candidate above. Independent
exact-head review rejected H1. This addendum records the same-slice
repair only.

| Fact | Observed |
| --- | --- |
| Repair authorization | `AUTHORIZE-CQS-REAL-MVP-S04B-R1-INDEPENDENT-REVIEW-FINDINGS-REPAIR-1` |
| Prior implementation authorization | `AUTHORIZE-CQS-REAL-MVP-S04B-SONY-TEAM-SELECTION-AND-CLASSROOM-SETUP-1` |
| Evidence state | `CQS-REAL-MVP-S04B-R1-REPAIR-ES-2` |
| Rejected H1 | `327872cdd54d51bcc43914c0e26f3cfaad0bd41b` |
| H1 tree | `a551a4cbd12cc885a736a822d2750050fa63af87` |
| Expected / observed `origin/main` | `cf90eadb7794a3e2c2f529212432e4a4daaadc91` |
| Repair host | `Ricks-MacBook-Air.local` / `macdaddy` |
| Repair cwd | `/Users/macdaddy/Documents/Coding/Cursor Projects/classroom-quiz-show-s04b` |
| Branch / worktree | `feat/cqs-real-mvp-s04b-sony-team-selection` (existing S04B lease) |
| H2 | recorded at freeze (this commit) |
| Independent-review PASS | **not written** |
| Terminal S04B | **not claimed** |
| PR / merge | **not opened / not merged** |

### HIGH-01 — manual name bypassed visible reservations

H1 `applyTeamNameInputs` reserved visible candidates during dealing, but
the `manual` path only rejected collisions against another team's
`claimedName`. Team A could be assigned a name still visibly offered by
unclaimed Team B.

R1 repair: `reservedKeysForTeam()` is the single reservation set for
dealing and for manual assignment. A manual name fails when its
normalized uniqueness key is claimed by another team **or** currently
visible on another active unclaimed team. Own-list names remain allowed.
The invariant stays in the centralized mutation, not in UI rendering.

Tests: `src/session/teamNameSelection.test.ts` (other-team visible
reject; own-list allow; custom unreserved allow; deterministic
same-name conflict; post-manual exclusion from later deals; mixed
manual + Sony uniqueness).

### HIGH-02 — Session identity authority / parallel state

H1 persisted selected names in `localStorage` key
`cqs.session-team-identities.v1` and overlaid them onto already-sanitized
`PublicState` in `useHostSync`. Class setup also merged authored Game
default names into that Session map, so `namesAssigned` / Play could
become true before any class identity was chosen.

Canonical analysis: GameSession is `PrivateGameState`; runtime state is
command/event driven and replay-derived; Host private state is
authoritative; public Display state is projected only through the
sanitizer. A second Session identity store and a second public-state
derivation path were not a valid seam.

R1 repair uses the existing ADR-002 event-log seam, same pattern as
`teamScores`. No version bump:

- `PRIVATE_STATE_SCHEMA_VERSION` remains **1** (derived in-memory field,
  not a persisted PrivateState blob)
- `PUBLIC_STATE_SCHEMA_VERSION` remains **8** (existing `PublicTeam.name`
  value source only)
- `PERSISTENCE_WIRE_VERSION` remains **1** (new closed-union event type)
- `PERSISTENCE_DB_VERSION` remains **4**

| Concern | H1 (rejected) | R1 |
| --- | --- | --- |
| Session-owned names | sidecar `localStorage` | `PrivateGameState.sessionTeamNames` via `SET_SESSION_TEAM_NAME` / `SESSION_TEAM_NAME_SET` |
| Public names | `overlayPublicTeamNames()` after `getPublicState()` | sanitizer `publicTeamDisplayName()` |
| Readiness | Game defaults merged into Session map | `namesAssigned` only after actual claimed/manual Session identities |
| Game isolation | sidecar never wrote Game JSON | command/event never mutates `definition`; export unchanged |
| Follower writes | sidecar `canPersistMutations` | panel does not publish; Host `dispatchSessionCommand` remains leader-only |

Deleted sidecar/overlay modules. Session names survive refresh through
the existing session-history wire, not a second store.

This was **not** a consequential PrivateState / public-wire / IndexedDB
migration. Owner architecture-decision stop was not required.

### R1 verification

| Command | Result |
| --- | --- |
| `git diff --check` | exit 0 |
| `npm run verify` | lint: 0 errors, 3 pre-existing ThemeProvider `react-refresh` warnings; typecheck pass; **2540** unit tests passed / **2** skipped |
| `CI=1 npm run verify:all` | same unit result; production preview built; Playwright **379** passed / **14** skipped |
| `npm run test:desktop` | desktop renderer+main built; **3** passed |

No failed intermediate R1 verification run. H1 earlier e2e failures
remain historical on that head only.

```text
PHYSICAL SONY GATE: BLOCKED / NOT EXECUTED
```

Re-observed 2026-08-14 22:35:36 CDT on `Ricks-MacBook-Air.local`:
`ioreg` / `system_profiler` had no `054c` / Wbuzz / Sony match. Exact
attached controller count: **0**. Not faked.

### R1 non-claims

- No independent-review PASS is written by this repair.
- S04B is not merged and not terminally complete.
- No PR was opened.
- S04C–S06 were not begun.
- No workbook / GameDefinition / IndexedDB / session-wire / public-state
  / pack / Sony profile version bump.

---

## H3 same-slice UX repair (H2 physical paused → setup repair)

This section does **not** erase H1 or the H2 R1 repair. It records the
owner-authorized Class Setup UX repair, interaction-design doctrine,
qualification-guidance promotion, and Sony recovery guidance.

| Fact | Observed |
| --- | --- |
| Repair authorization | `AUTHORIZE-CQS-REAL-MVP-S04B-H2-TEACHER-SETUP-UX-DESIGN-GUIDANCE-AND-H3-REPAIR-1` |
| Parent physical-qualification authorization | `AUTHORIZE-CQS-REAL-MVP-S04B-OWNER-INTERACTIVE-PHYSICAL-QUALIFICATION-V2-AND-GUIDANCE-PROMOTION-1` |
| Prior implementation authorization | `AUTHORIZE-CQS-REAL-MVP-S04B-SONY-TEAM-SELECTION-AND-CLASSROOM-SETUP-1` |
| H2 | `5cf0e0ffca2d941de191a4312cb5515a993e6fa9` |
| H2 tree | `4359aae70fabf66114d4d00d52edec03de76deb3` |
| Expected / observed `origin/main` | `cf90eadb7794a3e2c2f529212432e4a4daaadc91` |
| H3 | recorded at freeze (this commit) |
| Independent-review PASS | **not written** |
| Physical H3 PASS | **not written** |
| Terminal S04B | **not claimed** |
| PR / merge | **not opened / not merged** |

### F-UX-S04B-SETUP-01 — HIGH

Class Setup presented too many setup, readiness, hardware, fallback,
recovery, diagnostic, and action concepts with insufficient task
hierarchy. That materially interfered with understanding current state,
knowing the next action, operating four physical controllers, and
completing required physical qualification. This was a product-surface
finding, not merely test-helper friction.

H2 physical run disposition:

```text
H2 PHYSICAL RUN: PAUSED / SUPERSEDED FOR FINAL ACCEPTANCE BY UX REPAIR
```

Discovery evidence remains at `/tmp/cqs-s04b-sony-qualification/` where
still present. It is **not** a physical PASS and is **not** transferred
to H3.

### What H3 changed

- Class Setup is a guided workspace: compact readiness summary, one
  dominant current task, quieter completed sections, Play with an
  explicit required-state blocker, and Mute as an emergency control.
- Buzzers stay optional. Keyboard/manual fallback stays available
  through Sony failure and recovery.
- Ordinary Sony language is buzzers / Controller 1–4 / receiver.
  Receiver ready, controllers responding, and class ready stay distinct.
- Pairing recovery is state-driven and set-level. Full pairing is not
  ordinary startup. Advanced retains diagnostics.
- Durable doctrine: Product Contract §8.1; Execution Guidance §9.1;
  teacher Sony recovery in `docs/teacher/QUICK_START.md`.

### H3 non-claims

- No independent-review PASS is written by this repair.
- No H3 physical PASS is written by this repair.
- S04B is not merged and not terminally complete.
- No PR was opened.
- S04C–S06 were not begun.
- No workbook / GameDefinition / IndexedDB / session-wire / public-state
  / pack / Sony profile version bump.
- No undocumented HID pairing automation and no widened hardware support.

---

## H4 same-slice physical-qualification UX repair

This section does **not** erase H1, H2/R1, or H3. It records an
owner-authorized presentation repair found during H3 physical
qualification of the team-name selection interaction.

| Fact | Observed |
| --- | --- |
| Repair authorization | `AUTHORIZE-CQS-REAL-MVP-S04B-H4-PHYSICAL-ORDER-AND-CONTRAST-REPAIR-1` |
| H3 prior head | `325f46a4d8f21a050dee04b86454b07ce309853c` |
| Expected / observed `origin/main` | `cf90eadb7794a3e2c2f529212432e4a4daaadc91` |
| H4 | `0fb8d704d3b17002d75a7fd326a7b8e4f5062451` |
| Independent-review PASS | **not written** |
| Physical H4 PASS | **not written** |
| Terminal S04B | **not claimed** |
| PR / merge | **not opened / not merged** |

### Physical-qualification finding

During owner-interactive H3 physical qualification of the name-selection
board:

1. Pastel Yellow/Green/Orange/Blue choice buttons inherited the dark Host
   theme foreground, so team-name text had poor contrast and was hard to
   read.
2. Choices rendered Yellow → Green → Orange → Blue, while the physical
   Sony Wireless Buzz colored buttons stack **top to bottom** Blue →
   Orange → Green → Yellow. Teachers could not visually match the Host
   rows to the handset.

H3 physical qualification is **not** a PASS for this interaction.

### Root cause

- Presentation iterated `TEAM_NAME_CHOICE_COLORS` in logical choice-index
  order (Yellow=0 … Blue=3), which does not match physical button layout.
- Choice-button CSS used `color: var(--fg-primary)`, appropriate for dark
  Host chrome but not for light/pastel controller-color backgrounds.

### Bounded repair

- `TeamNameSelectionBoard` renders an explicit presentation order
  `[3, 2, 1, 0]` (Blue, Orange, Green, Yellow) while each row remains
  bound to its existing `choiceIndex`.
- Pastel choice buttons use deliberate dark ink (`#1a2332` / `#243044`)
  instead of Host `--fg-primary`. Pastel backgrounds, selected/subdued
  states, color-word cues, grayscale / high-contrast / reduced-motion,
  and long-name wrap are preserved.
- Visible ordinal numbers (which would read 4→1 top-to-bottom) were
  replaced with capitalized color-word cues; accessible names retain
  logical `Choice N, Color` labels.
- S04-family direction clarifies visual stack vs unchanged logical map.
- No Sony HID/Gamepad adapter, logical-action vocabulary, supported
  profile, button recipe, debounce, or session mutation change.

### Invalidated evidence family

Transfer only causally justified earlier evidence. The name-selection
**visual order and pastel-button typography/contrast** family from H3
(and earlier heads) is **invalidated** for acceptance of this
interaction. Logical mapping tests and unrelated H3 Class Setup /
buzzer evidence are not rewritten by this addendum. Fresh physical
requalification of the repaired interaction is still required.

### H4 verification (recorded at freeze)

| Command | Result |
| --- | --- |
| `git diff --check` | exit 0 |
| `npm run verify` | lint: 0 errors, 3 pre-existing ThemeProvider `react-refresh` warnings; typecheck pass; **2553** unit tests passed / **2** skipped |
| `CI=1 npm run verify:all` | same unit result; Playwright **379** passed / **14** skipped |
| `npm run build:desktop` | renderer + main built (exit 0) |
| `npm run test:desktop` | **3** passed |
| `npm run package:desktop` | exit 0; unsigned `release/mac-arm64/Classroom Quiz Show.app` + dmg/zip; identity `sourceSha` `0fb8d704d3b17002d75a7fd326a7b8e4f5062451` |

### H4 non-claims

- No independent-review PASS is written by this repair.
- No H4 physical PASS is written by this repair.
- S04B is not merged and not terminally complete.
- No PR was opened.
- S04C–S06 were not begun.
- No workbook / GameDefinition / IndexedDB / session-wire / public-state
  / pack / Sony profile version bump.
- No change to Sony hardware support claims or architecture.

---

## H5 same-slice physical-defect consolidation

This section does **not** erase H1–H4. It records why packaged H4 alone
was rejected as the physical candidate, and consolidates the already-
developed H3 physical-session defect repairs onto H4.

| Fact | Observed |
| --- | --- |
| Repair authorization | `AUTHORIZE-CQS-REAL-MVP-S04B-H5-PHYSICAL-DEFECT-CONSOLIDATION-REPAIR-1` |
| Packaged H4 (insufficient alone) | `0fb8d704d3b17002d75a7fd326a7b8e4f5062451` |
| Expected / observed `origin/main` | `cf90eadb7794a3e2c2f529212432e4a4daaadc91` |
| H5 packaged implementation | `e23ac308f0f06d3eb916f7409127e4485ae03f43` |
| H5 tree | `1becdaf26bb20a3783cad8ed1b8c71e4226db674` |
| Verification worktree | `/tmp/cqs-s04b-h5-verify-e23ac308f0f06d3eb916f7409127e4485ae03f43` (detached exact H5; source clean aside from `node_modules` symlink) |
| Independent-review PASS | **not written** |
| Physical H5 PASS | **owner-interactive physical PASS recorded 2026-09-11** (see H5 physical addendum below); **not** independent-review PASS; **not** merged / **not** terminal |
| Terminal S04B | **not claimed** |
| PR / merge / push | **not opened / not merged / not pushed** |

### Why H4 alone was rejected

Pre-physical provenance showed packaged H4 retained H4 presentation
order/contrast but **omitted** uncommitted H3 physical-session repairs
already proven necessary during H3 qualification (simultaneous edges,
Buzzer Check multi-observation, ordinary readiness advancement,
cold-start Check). Qualifying H4 would knowingly re-test superseded
broken states for planned simultaneous and Class Setup smoke checks.

### Physical findings incorporated

| Finding | Bounded consolidation |
| --- | --- |
| F-S04B-H3-SONY-07 | Batch selection path: Gamepad poll microtask batch → Foundation → `ClassroomSetupPanel.applySonyObservations` |
| F-S04B-H3-SONY-07b | `recentTestObservations` multi-edge Buzzer Check line |
| F-S04B-H3-SONY-05 | Ordinary test-mode observations advance `respondingSlots` |
| F-S04B-H3-SONY-06 | Default slot→team associations; provisional Sony recipe observations; first-sight emit in test mode; skip gamepadconnected reprime in test mode; transport-health mapping gate |
| Coupled setup | Soft-refresh keepalive; shorter receiver readiness labels (already in classified WIP) |

**Not incorporated:** F-S04B-H3-SONY-08 Controller labeling (OPEN / optional).

### H4 presentation preserved

Visual order Blue → Orange → Green → Yellow via
`TEAM_NAME_CHOICE_DISPLAY_ORDER = [3, 2, 1, 0]`; logical choiceIndex map
unchanged; dark pastel ink; selected/subdued; wrap; grayscale /
high-contrast / reduced-motion intact.

### Evidence transfer vs invalidation

- **Transfer (causally justified):** H4 presentation contracts; prior
  sequential name-selection / Class Setup evidence that does not depend
  on the omitted simultaneous/readiness/cold-start defects.
- **Invalidated for acceptance:** any claim that packaged H4
  `0fb8d70…` is the complete physical candidate; simultaneous-selection
  and readiness PASS claims that depended on the uncommitted WIP without
  being frozen into a packaged head.
- Pause/checkpoint JSONL under `docs/handoff/` remain evidence-only
  (not product commits).

### H5 verification (clean worktree at packaged SHA)

| Command | Result |
| --- | --- |
| `git diff --check` | exit 0 |
| `npm run verify` | lint: 0 errors, 3 pre-existing ThemeProvider `react-refresh` warnings; typecheck pass; **2560** unit tests passed / **2** skipped |
| `CI=1 npm run verify:all` | same unit result; Playwright **379** passed / **14** skipped |
| `npm run build:desktop` | renderer + main built (exit 0) |
| `npm run test:desktop` | **3** passed |
| `npm run package:desktop` | exit 0; `sourceSha` **`e23ac308f0f06d3eb916f7409127e4485ae03f43`**; unsigned app/dmg/zip under verify worktree `release/` (copied to primary worktree `release/` for owner launch) |

electron-builder noted missing path warnings for some dependency labels
during packaging (`scheduler` / `react-router` via symlink `node_modules`);
package completed and desktop shell tests passed on the same build path.

### H5 non-claims (pre-physical freeze; superseded only where the addendum below explicitly records)

- No independent-review PASS.
- S04B not merged / not terminal.
- No PR / push.
- S04C–S06 not begun.
- SONY-08 not implemented.
- No Sony hardware support claim or profile recipe change.
- No workbook / GameDefinition / IndexedDB / session-wire / public-state /
  pack version bump.

## H5 owner-interactive physical requalification (2026-09-11)

| Item | Value |
| --- | --- |
| Authorization | `AUTHORIZE-CQS-REAL-MVP-S04B-H5-OWNER-INTERACTIVE-PHYSICAL-REQUALIFICATION-1` |
| Packaged implementation SHA | `e23ac308f0f06d3eb916f7409127e4485ae03f43` |
| Embedded package `sourceSha` | `e23ac308f0f06d3eb916f7409127e4485ae03f43` (exact H5 match) |
| Docs-only tip at session (not candidate) | `cdedf894e7e539a89de43518bee41b03c82d7a40` |
| Host | `Ricks-MacBook-Air.local` / user `macdaddy` / America/Chicago |
| App | `release/mac-arm64/Classroom Quiz Show.app` (isolated `CQS_USER_DATA`) |
| Receiver | Namtai Wbuzz `054c:1000` |
| Controllers | four wireless handsets (owner physical set); Gamepad appears as one device with slot button groups |
| Temporary evidence | `/tmp/cqs-s04b-h5-physical-qualification/` (screenshots, results.jsonl, checkpoint; temporary by default — not committed) |
| Concise handoff report | [`../handoff/2026-09-11-s04b-h5-physical-qualification-report.md`](../handoff/2026-09-11-s04b-h5-physical-qualification-report.md) |
| Durable interaction manifest | [`../handoff/qualification-runs/s04b-h5-2026-09-11.jsonl`](../handoff/qualification-runs/s04b-h5-2026-09-11.jsonl) |
| Physical PASS bound to | tested macOS host + Namtai Wbuzz `054c:1000` + four owner wireless handsets; **not** Windows physical qualification |

### Verdicts (Q1–Q8)

| Test | Verdict | Evidence class |
| --- | --- | --- |
| Q1 Packaged Class Setup cold start | **PASS** | MACHINE + OWNER |
| Q2 Team-name order/readability | **PASS** | MACHINE (order/contrast) + OWNER usability |
| Q3 Four colored-button mappings | **PASS** | OWNER (Blue/Orange/Green/Yellow) |
| Q4 Red cycling isolation | **PASS** | OWNER |
| Q5 Simultaneous independent selection | **PASS** | OWNER + MACHINE unique names |
| Q6 Multi-controller Buzzer Check | **PASS** | OWNER + prior MACHINE “4 controllers responding” |
| Q7 Selected/subdued state | **PASS** | MACHINE + OWNER |
| Q8 Bounded Class Setup smoke | **PASS** | OWNER |

### Warnings / friction (not FAIL)

- Dongle long-press RF bind was required before RED advanced; initial RED miss classified **wrong starting state**, not product defect. Repair path was not required after dongle bind.
- Owner observed Buzzer Check observations advancing without clicking **Check buzzers** / **Connect buzzers** (UX affordance clarity friction; harvest candidate).
- Fixture helper workbook initially failed compile (`RoundName` / INSTRUCTIONS profile); replaced with playable Desktop fixture — **helper/harness**, not product defect.
- SONY-08 controller labeling remains OPEN / optional (not in this lane).

### Evidence transfer

Fresh H5 physical evidence covers families invalidated by H5 vs H3/H4 for acceptance: simultaneous selection; readiness/responding; cold-start Check; team-name order/contrast. Automated H5 verify/package evidence remains AUTOMATED / PRODUCTION-BUILD only.

### H5 physical non-claims

- No independent-review PASS.
- S04B not merged / not terminal.
- No PR / push / merge from this qualification.
- S04C–S06 not begun.
- Not S06 clean-room release qualification.
- Windows physical runtime still **NOT RUN**.

## H5 physical-qualification evidence freeze (2026-09-11)

| Item | Value |
| --- | --- |
| Authorization | `AUTHORIZE-CQS-S04B-H5-PHYSICAL-QUALIFICATION-EVIDENCE-FREEZE-1` |
| Product candidate | unchanged `e23ac308f0f06d3eb916f7409127e4485ae03f43` |
| Product code mutated | **NO** |
| Physical PASS invalidated | **NO** |

Freeze purpose: make already-completed H5 owner-interactive physical evidence
durably reproducible before independent exact-head review. This addendum does
**not** rewrite H5 product history and does **not** begin review, merge, or
S04C+.

Durable artifacts:

- Interaction/evidence JSONL:
  [`../handoff/qualification-runs/s04b-h5-2026-09-11.jsonl`](../handoff/qualification-runs/s04b-h5-2026-09-11.jsonl)
- Updated physical report (freeze sections):
  [`../handoff/2026-09-11-s04b-h5-physical-qualification-report.md`](../handoff/2026-09-11-s04b-h5-physical-qualification-report.md)

Compact freeze contents (detail in JSONL + report):

- Q1–Q8 PASS sequence and key friction events (import path, non-playable
  fixture harness issue, Desktop staging, Host-control landing after Play,
  wrong-starting-state RED, dongle long-press bind, Check without assumed
  Connect/Check sequence).
- Instruction-fidelity findings recorded as process/instruction debt; they do
  **not** invalidate the physical PASS.
- Physical-label renumbering classified **TEST-ENVIRONMENT NORMALIZATION**;
  before/after map **UNKNOWN** / not invented.
- Automation-gap summary for later v1 companions (labels/step counts;
  spreadsheet journey; Connect/Check state labels; simultaneous edges;
  readiness; Class Setup journey; packaged instruction-fidelity).
- PR #75 overlaps the same qualification-governance area; reconcile later;
  not modified by this freeze.

Rich `/tmp` binaries remain temporary by default; JSONL stores filenames and
SHA-256 hashes where practical.
