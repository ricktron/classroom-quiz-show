# Slice 21 — Post-merge canonical reconciliation receipt

## Identity

- **Slice:** `CQS-SLICE-21-SONY-BUZZ-SUPPORTED-PROFILE` — Sony Buzz
  Supported-Profile Operationalization
- **Reconciliation authorization:**
  `AUTHORIZE-CQS-SLICE-21-POST-MERGE-CANONICAL-RECONCILIATION-1`
- **Evidence state:** `CQS-SLICE-21-POST-MERGE-CANONICAL-RECONCILIATION-ES-1`
- **Merge authorization:**
  `AUTHORIZE-CQS-SLICE-21-PR55-EXACT-HEAD-SQUASH-MERGE-AND-TERMINAL-POST-MERGE-VERIFICATION-1`
- **Merge evidence state:**
  `CQS-SLICE-21-PR55-EXACT-HEAD-SQUASH-MERGE-AND-TERMINAL-POST-MERGE-VERIFICATION-ES-1`
- **Final independent acceptance:**
  `CQS-SLICE-21-PR55-FINAL-EXACT-HEAD-ACCEPTANCE-REVIEW-ES-1` — **PASS — SLICE
  21 FINAL EXACT HEAD ACCEPTED FOR MERGE AUTHORIZATION**
- **Date (America/Chicago):** 2026-08-10
- **Repository:** `ricktron/classroom-quiz-show`
- **Kind:** documentation-only post-merge canonical-state reconciliation
  (**STOP BEFORE MERGE**)

## Provenance

| Fact | Value |
| --- | --- |
| Reconciliation base / `origin/main` at start | `b1e6d669e91b55b20261e86a47d7818f069b0252` |
| Implementation PR | [#55](https://github.com/ricktron/classroom-quiz-show/pull/55) |
| Accepted exact head | `3bd6c91330298c4374db137e3ce220e0d28a5c2f` |
| Actual squash merge | `b1e6d669e91b55b20261e86a47d7818f069b0252` |
| Authorized implementation base / sole parent | `0433f30d9a950d0a196feaf5bb7a57411df77e37` |
| Accepted-head / squash tree | `22c5e3d3416db05cbd28b3893d07780d72ae1af9` |
| Merge timestamp | **2026-08-10T14:39:15Z** |
| Merged by | `ricktron` |
| Atomic merge mechanism | GitHub Pulls REST merge endpoint with expected-head SHA guard (`sha=3bd6c91…`) |
| Changed paths on squash | **37** (exact accepted cumulative set) |
| Reconciliation branch | `docs/slice-21-post-merge-canonical-reconciliation` |
| Host / user | `Ricks-MacBook-Air.local` / `macdaddy` |
| Reconciliation worktree | `/Users/macdaddy/Documents/Coding/Cursor Projects/classroom-quiz-show-slice21` |

Historical implementation / UX receipts (unchanged by design):

- [`2026-08-09-slice-21-sony-buzz-supported-profile-implementation.md`](2026-08-09-slice-21-sony-buzz-supported-profile-implementation.md)
- [`2026-08-10-slice-21-pairing-friction-ux-reconciliation.md`](2026-08-10-slice-21-pairing-friction-ux-reconciliation.md)

Canonical ADR:
[`../architecture/ADR-019-sony-buzz-supported-profile-direct-webhid-keepalive.md`](../architecture/ADR-019-sony-buzz-supported-profile-direct-webhid-keepalive.md)
(**Accepted — merged via PR #55**).

## Review / delivery lineage (compressed)

```text
74898b6… → initial implementation
8560338… → routing docs tip chase
3b0e97f… → lifecycle/Sonar repair + three-controller physical RC PASS
4162fd0… → pairing-friction UX reconciliation
3bd6c91… → LED-state guidance correction; final acceptance PASS
b1e6d66… → exact-head guarded squash merge + terminal post-merge verify
```

## Post-merge proof

| Gate | Result |
| --- | --- |
| `origin/main` | `b1e6d669e91b55b20261e86a47d7818f069b0252` |
| Tree equality accepted head ↔ squash | Exact (`22c5e3d…`) |
| Direct diff accepted head ↔ squash | Empty |
| Path count | **37** / no unexpected paths |
| Main CI run | `31399326956` **success** (lint/type/unit/build + Playwright) |
| Playwright | Job success (~9m5s) |
| Pages/deploy run | `31399326758` **success** |
| Sonar on main push | **N/A** (PR-head Sonar was green; main CI has no Sonar job) |

Inherited Final mid-refresh flake remains **unresolved** and out of scope.

## Contract versions after Slice 21

| Contract | Value |
| --- | --- |
| IndexedDB | **4** |
| Sony mapping contract | **1** |
| Sony supported profile | **1** (`cqs.sony-buzz.namtai-wbuzz-wireless.v1`) |
| Workbook / AuthoringDraft / Pack / Game schema / GameDefinition | **1** |
| Public-state wire | **8** |
| Sync envelope | **2** |
| Private active-session / Session Summary / Completed-summary / Competitive | **1** |

## Supported profile (canonical)

```text
cqs.sony-buzz.namtai-wbuzz-wireless.v1
Namtai wireless Wbuzz — VID:PID 054c:1000
WebHID → keep-alive / transport health only (reportId 0 / 7×00 / ~2000 ms nominal)
Gamepad → sole Sony gameplay-input path
keyboard → permanent fallback
controllerIndex never persisted
```

## Physical evidence (owner disposition)

| Handset | Group | Status |
| --- | --- | --- |
| #1 | `0–4` | Fresh product RC PASS |
| #2 | `5–9` | Fresh product RC PASS |
| #4 | `10–14` | Fresh product RC PASS |
| #3 unavailable | `15–19` / slot 4 | Historical / owner-accepted — not freshly product-tested |

Exact physically RC-tested head: `3b0e97fce8edfbd7f007c9eacbf6ba5873444d1e`.
RC evidence transferred through UX/copy/docs/test deltas to accepted head
`3bd6c91…` and landed tree `b1e6d66…`. **No physical retest remains owed.**

USB hub reintroduction recovery was observed once — observation only; not
arbitrary hub support.

## Pairing-friction / LED-state record

Material classroom friction: WebHID `healthy` ≠ controllers ready. Incorrect
BIND+Red-first guidance superseded by set-level solid-blue-then-BIND.

Owner-observed sequence: slow blue off blink → KEEP HOLDING through rapid
red/blue power-on flashes → solid blue → BIND after all participating handsets
are solid blue → blink acknowledgement → RED verification → Buzzer Check /
team confirmation. Prefer observable LED states over approximate timing.

## Findings closed / retained

| ID | Severity | Disposition |
| --- | --- | --- |
| **F-DOC-01** | MEDIUM | **Closed** — stale “Slices 21–23 unauthorized” / Slice 21 pending routing repaired as a family across README, STATUS, CURRENT, MVP-ARC |
| **F-UX-01** | LOW | **Retained** — ordinary setup still exposes some WebHID/Gamepad jargon; demote to Advanced diagnostics later (end-of-MVP polish candidate) |

## Canonical result

```text
Slice 21 product = merged and post-merge verified
this reconciliation = docs-only canonical-state update
Slice 22 = Planned / unauthorized / separate authorization required
Slice 23 = Planned / unauthorized
CQS-OD-066 = unresolved
```

After this reconciliation lands on `main`:

- Slices **1–21** are product-`Complete`;
- ADR-019 is **Accepted — merged via PR #55**;
- next planned product frontier is **Slice 22 — Minimal Presentation Audio**;
- Slice 22 remains **`PLANNED / NOT STARTED / REQUIRES SEPARATE AUTHORIZATION`**;
- Final-wager flake and `CQS-OD-066` remain unresolved.

## Documentation reconciliation path list

1. `README.md`
2. `docs/STATUS.md`
3. `docs/handoff/CURRENT.md`
4. `docs/plans/MVP-ARC.md`
5. `docs/architecture/ADR-019-sony-buzz-supported-profile-direct-webhid-keepalive.md`
6. `docs/receipts/2026-08-10-slice-21-post-merge-canonical-reconciliation.md` (this file)

Historical Slice 21 receipts left unchanged by design.

## Program Orchestrator handoff-prep (durable)

### A. Identity

- Slice ID: `CQS-SLICE-21-SONY-BUZZ-SUPPORTED-PROFILE`
- Implementation auth:
  `AUTHORIZE-CQS-SLICE-21-SONY-BUZZ-SUPPORTED-PROFILE-IMPLEMENTATION-1`
- Merge auth:
  `AUTHORIZE-CQS-SLICE-21-PR55-EXACT-HEAD-SQUASH-MERGE-AND-TERMINAL-POST-MERGE-VERIFICATION-1`
- Reconciliation auth:
  `AUTHORIZE-CQS-SLICE-21-POST-MERGE-CANONICAL-RECONCILIATION-1`
- PR #55; accepted head `3bd6c91…`; squash `b1e6d66…`

### B. Architecture

Exact supported profile; WebHID keep-alive vs Gamepad gameplay; seven-zero
payload; framing fail-closed; IndexedDB v4; mapping v1; never persist
`controllerIndex`; one lifecycle owner; cross-generation send serialization;
visibility/focus reprime; keyboard fallback always.

### C. Physical evidence

Discovery + three-controller product RC; fresh vs historical fourth slot; hub
observation only; reconnect/index volatility; same-profile replacement
revalidate path.

### D. UX

Readiness layers (receiver / controllers / mapping); Repair + Hardware changed?;
LED-state pairing guidance; progressive controller detection; Buzzer Check
bridge (non-gameplay).

### E. Verification

Independent reviews + repairs; final acceptance PASS; CI/Playwright/Pages
success; tree equality; Sonar N/A on main push (PR Sonar green).

### F–R. Lessons / deltas (retain)

What went well: exact-head discipline; lifecycle serialization repair; owner
three-controller disposition honesty; pairing UX repair without new HID protocol.

What went poorly / friction: pairing/recovery was major classroom friction;
stale docs routing (F-DOC-01); ordinary-setup jargon (F-UX-01).

Necessary rigor: physical vs synthetic separation; expected-head merge guards;
observable-state teacher guidance; support-claim narrowness.

Avoidable friction: BIND+Red-first instructions; timing-only pairing cues;
treating WebHID healthy as “ready.”

Technical debt: F-UX-01; inherited Final flake; `CQS-OD-066`.

Guidance deltas (1–28 from authorization packet retained): physical vs
synthetic; short state-driven owner RC; product absorbs tech interpretation;
healthy ≠ ready; LED states over timing; set-level pairing; never BIND+Red-first;
slow blue off; rapid flashes intermediate; hold to solid blue; BIND after solid
blue; blink ack; pairing friction surface; future Buzzer Check / tutorial;
future reaction/timer minigames; same-profile revalidate not reset; different
families separate qualification; never persist Gamepad index; one resource → one
lifecycle owner; send serialization across generations; background cadence not
exact; visibility/focus reprime; hub observation only; three-controller honesty;
fresh vs historical fourth slot; F-UX-01 end-of-MVP polish; cumulative guidance
polish revisit.

Future product ideas (not implemented): Buzzer Check / Controller Tutorial
minigame; reaction/timer warm-ups.

Support/nonclaims: wired `054c:0002`; other Sony/Namtai/Buzz; arbitrary hubs;
Windows/Linux/Pi; Safari/Firefox/Edge/ChromeOS/mobile; guaranteed 2s background;
four freshly product-tested handsets.

Open decisions: `CQS-OD-066` unresolved.

Successor routing: Slice 22 Minimal Presentation Audio (unauthorized); Slice 23
Classroom Release Qualification (unauthorized).

## Non-claims

- This receipt does **not** merge itself.
- Slice 22 / Slice 23 are **not** authorized.
- F-UX-01 is **not** repaired here.
- No product-code change in this lane.
