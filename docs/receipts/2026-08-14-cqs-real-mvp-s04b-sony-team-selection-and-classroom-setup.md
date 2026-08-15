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
