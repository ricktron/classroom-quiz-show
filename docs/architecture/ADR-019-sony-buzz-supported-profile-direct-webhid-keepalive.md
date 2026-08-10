# ADR-019 — Sony Buzz supported profile (direct WebHID keep-alive)

- **Status:** Accepted — merged via PR #55
- **Date:** 2026-08-09
- **Accepted:** 2026-08-10 (implementation PR
  [#55](https://github.com/ricktron/classroom-quiz-show/pull/55); accepted exact
  head `3bd6c91330298c4374db137e3ce220e0d28a5c2f`; squash
  `b1e6d669e91b55b20261e86a47d7818f069b0252`; merged **2026-08-10T14:39:15Z**;
  sole parent `0433f30d9a950d0a196feaf5bb7a57411df77e37`; trees identical at
  `22c5e3d3416db05cbd28b3893d07780d72ae1af9`; final acceptance
  `CQS-SLICE-21-PR55-FINAL-EXACT-HEAD-ACCEPTANCE-REVIEW-ES-1` **PASS**; merge
  evidence
  `CQS-SLICE-21-PR55-EXACT-HEAD-SQUASH-MERGE-AND-TERMINAL-POST-MERGE-VERIFICATION-ES-1`;
  terminal post-merge CI/Pages success; post-merge reconciliation
  [`../receipts/2026-08-10-slice-21-post-merge-canonical-reconciliation.md`](../receipts/2026-08-10-slice-21-post-merge-canonical-reconciliation.md))
- **Slice:** 21 — Sony Buzz Supported-Profile Operationalization
- **Authorization:**
  `AUTHORIZE-CQS-SLICE-21-SONY-BUZZ-SUPPORTED-PROFILE-IMPLEMENTATION-1`,
  `AUTHORIZE-CQS-SLICE-21-PR55-EXACT-HEAD-SQUASH-MERGE-AND-TERMINAL-POST-MERGE-VERIFICATION-1`,
  `AUTHORIZE-CQS-SLICE-21-POST-MERGE-CANONICAL-RECONCILIATION-1`
- **Evidence state:**
  `CQS-SLICE-21-SONY-BUZZ-SUPPORTED-PROFILE-IMPLEMENTATION-ES-1`;
  three-controller product RC
  `CQS-SLICE-21-PR55-THREE-CONTROLLER-PRODUCT-RC-ES-1` (**PASS**);
  final acceptance
  `CQS-SLICE-21-PR55-FINAL-EXACT-HEAD-ACCEPTANCE-REVIEW-ES-1` (**PASS**);
  merge
  `CQS-SLICE-21-PR55-EXACT-HEAD-SQUASH-MERGE-AND-TERMINAL-POST-MERGE-VERIFICATION-ES-1`
- **Depends on:** [ADR-009](ADR-009-generic-gamepad-adapter.md),
  [ADR-010](ADR-010-sony-buzz-profile-and-setup.md),
  [ADR-013](ADR-013-local-persistence-recovery.md),
  OADL2-S07 bounded physical evidence (inherited), Slice 21 physical discovery
- **Supersedes:** nothing. Narrows ADR-010’s permanent keep-alive gap for one
  exact supported profile. Does not weaken Gamepad gameplay authority or privacy
  boundaries.

## Context

Slice 10 shipped candidate classification and guided capture without claiming
hardware support. OADL2-S07 recorded a bounded physical claim under a temporary
external keep-alive. Slice 21 discovery established that **direct WebHID output
keep-alive is viable** for the exact Namtai wireless Wbuzz receiver on the
owner’s tested macOS + Chrome stack, while Gamepad API remains the gameplay
input path.

### Inherited OADL2 evidence

OADL2-S07 remains historical evidence for temporary keep-alive feasibility and
must not be rewritten. Slice 21 adds current physical discovery for product
keep-alive ownership.

### Physical discovery (implementation evidence baseline)

| Fact | Observed |
| --- | --- |
| OS | macOS 26.5.1 (build 25F80) |
| Browser | Google Chrome 151.0.7922.77 |
| Receiver | Namtai Wbuzz |
| USB | VID:PID `054c:1000` |
| Gamepad | 20 buttons / 2 axes |
| WebHID output | `reportId = 0`, exactly 7 bytes |
| Payload | `00 00 00 00 00 00 00` |
| Nominal cadence | ≈ 2000 ms (not a guaranteed browser deadline) |
| Strong soak | 271 sends / 0 failures / 0 overlaps |
| Background | substantial hidden-tab sends; large timer gaps possible |
| Groups | Discovery observed `0–4`, `5–9`, `10–14`; `15–19` untested in discovery |
| Replug | Gamepad index `0 → 1`; WebHID reacquisition succeeded |
| Already-open | `InvalidStateError: The device is already open.` observed; converge safely |
| USB hub replug | observed once — **not** a general hub-support claim |

### Owner three-controller product RC disposition (2026-08-10)

Physical product RC on exact head `3b0e97fce8edfbd7f007c9eacbf6ba5873444d1e`
(`CQS-SLICE-21-PR55-THREE-CONTROLLER-PRODUCT-RC-ES-1`) **PASS** with three
available handsets:

| Handset | Group | Status |
| --- | --- | --- |
| #1 | `0–4` | Fresh product RC |
| #2 | `5–9` | Fresh product RC |
| #4 | `10–14` | Fresh product RC |
| (unavailable #3) | `15–19` / slot 4 | Historical / owner-accepted — **not** a fresh four-handset claim |

Owner accepted three-controller RC as **sufficient for Slice 21 completion**.
Final exact-head acceptance and merge completed. Do not claim all four slots
were freshly product-tested.

Pairing/recovery friction was a material usability finding (WebHID `healthy`
≠ controllers transmitting; incorrect BIND+Red recovery superseded by set-level
solid-blue-then-BIND). No core transport/input product defect was found.
Teacher UX must separate receiver transport, controller-input readiness, and
team-mapping readiness, and expose a guided “Repair controller connection”
flow using existing Disable → pair → Connect controls.

Owner-observed handset LED cues for that guided flow (supported-profile
operating cues; not invented meanings): slow blue blink ≈ off; rapid red/blue
flashes ≈ normal power-on (keep holding); solid blue = pairing-ready; BIND only
after all participating controllers are solid blue; blink acknowledgement after
BIND; then RED verification. Prefer observable LED states over approximate
“N seconds” timing.

## Decision

### 1. Exact supported profile

One CQS-owned profile:

```text
cqs.sony-buzz.namtai-wbuzz-wireless.v1
```

Recognition requires exact `vendorId = 0x054c` and `productId = 0x1000`.
Name-only matching is never sufficient. Wired `054c:0002` remains candidate /
unsupported. No expandable registry of untested Sony devices.

### 2. Architecture options and direct WebHID choice

Options considered: continue external keep-alive helper; shell helper; broad HID
library; direct WebHID in-app. Discovery verdict:

```text
KEEP-ALIVE ARCHITECTURE VERDICT: DIRECT WEBHID VIABLE
```

CQS owns a narrow injectable WebHID transport and one keep-alive lifecycle.
No new runtime dependency.

### 3. WebHID vs Gamepad split

```text
WebHID  → keep-alive + host-private transport health only
Gamepad → existing gamepadSource / adapter / useGamepadBuzzInput / LocalInputSignal
```

Absolutely no WebHID input → gameplay. No second Gamepad poll owner.

### 4. Exact filter, framing, payload, cadence

- Filter: `{ vendorId: 0x054c, productId: 0x1000 }` only (no `acceptAllDevices`).
- Framing fail-closed: exactly one output report, `reportId = 0`, length 7.
- Payload: `sendReport(0, Uint8Array([0,0,0,0,0,0,0]))` only.
- Nominal cadence 2000 ms; health-age model treats recent success within 6000 ms
  as healthy; delayed background timers alone are not terminal if recoverable.
- Visibility/focus return → immediate keep-alive attempt + health revalidation +
  Gamepad edge baseline re-prime.

### 5. Lifecycle owner and transport states

One authoritative lifecycle owns capability, permission/acquisition, open state,
framing validation, keep-alive schedule, send serialization, disconnect,
reacquisition, recovery, disable, and shutdown.

Transport health (conceptual):

`unsupported-api | permission-required | connecting | healthy | degraded |
disconnected | recovering | failed | disabled`

Supported-profile readiness is computed separately from transport health
(Gamepad Wbuzz topology, associations, mapping context, keyboard fallback).

### 6. Button recipe and team mapping

Static product recipe (slots, not physical handset numbers):

```text
slot 1: 0–4
slot 2: 5–9
slot 3: 10–14
slot 4: 15–19   # four-slot design; fresh RC covered three available handsets
```

Within each group: Red=base, Yellow=+1, Green=+2, Orange=+3, Blue=+4.
Primary red is the only gameplay buzz via the existing Gamepad path. Secondary
colors are non-gameplay. Teacher team association is explicit; never inferred
from slots. Gamepad `controllerIndex` is ephemeral and **never persisted**.

### 7. Persistence

- IndexedDB schema **3 → 4** (additive store `sonyBuzzMappings`).
- Mapping contract version **1** (`SONY_BUZZ_MAPPING_VERSION`).
- Persist associations + profile identity + game/team context signature.
- Do not persist the static button recipe or controller index.
- Unknown mapping versions fail closed. Team/context mismatch fails closed and
  prompts reassignment.
- Disable keep-alive does not clear saved mapping; explicit clear does.
- Full host-private DB wipe clears Sony mappings with other stores.

### 8. Disconnect / reconnect / already-open

On disconnect: stop timer, invalidate generation, stop stale writes, mark
disconnected, re-prime Gamepad baseline, preserve keyboard.

Recovery may use `getDevices()`, focus/visibility revalidation, and explicit
Reconnect — **must not depend solely on a WebHID connect event**.

Already-open `InvalidStateError` converges as success for the current generation
when the message indicates the device is already open.

Async generation guards prevent stale open/recovery/mapping hydration from
reactivating older decisions.

### 9. Host UX and keyboard fallback

Progressive disclosure: teacher readiness layers (receiver / controllers /
mapping), Connect/Disable, Repair controller connection (guided set-level
pairing), team assignments, Buzzer Check (non-gameplay diagnostic), keyboard
fallback note, advanced diagnostics. Permission only via deliberate Connect.
Keyboard buzzing remains available in every Sony health/failure state.
Zero-team games show a Controllers empty state pointing to teams-bearing import
rather than hiding Controllers entirely.

Receiver `healthy` alone is never “Sony Buzz ready.”

### 10. Privacy

Sony/WebHID/mapping details stay host-private. They must not enter PublicState,
projector, sync envelope, game JSON, `.cqs-pack`, workbook, event history, or
completed summaries.

### 11. Support boundary and nonclaims

Supported statement identifies Namtai wireless Wbuzz `054c:1000`, the four-slot
profile design, tested macOS/build, tested Chrome, exact merged CQS release,
keyboard fallback, and the owner three-controller fresh-RC disposition (groups
`0–4` / `5–9` / `10–14`) without claiming a fresh fourth-handset product RC.

Explicit nonclaims: wired `054c:0002`; other Sony/Namtai/Buzz hardware; arbitrary
USB hubs; Windows; Linux; Raspberry Pi; Safari; Firefox; Edge; ChromeOS; mobile
OSes; guaranteed 2-second background cadence.

### 12. RC requirements

Three-controller physical product RC on exact head `3b0e97f…` is **PASS**
(`CQS-SLICE-21-PR55-THREE-CONTROLLER-PRODUCT-RC-ES-1`). Owner disposition:
sufficient for Slice 21 completion. Final exact-head acceptance **PASS** at
`3bd6c91…`; exact tree landed via squash `b1e6d66…`. No physical retest remains
owed — post-RC UX/copy/docs/test deltas did not alter HID transport, keep-alive
lifecycle, Gamepad polling, gameplay input, mapping, persistence, or false-edge
semantics. Not a mandatory fresh four-handset RC.

### 13. Version consequences

| Contract | Expected |
| --- | --- |
| IndexedDB | 3 → **4** |
| Sony mapping contract | **1** (new) |
| Sony supported profile | **1** (new) |
| Workbook / AuthoringDraft / Pack / Game schema / GameDefinition | unchanged **1** |
| Public wire | unchanged **8** |
| Sync envelope | unchanged **2** |
| Private active-session / Session Summary / Completed-summary / Competitive | unchanged **1** |

### 14. Non-goals

Slice 22 audio; Slice 23 qualification; phone/network buzzers; WebHID gameplay
input; multiple-choice Sony mechanics; Buzzer Check / Controller Tutorial
minigame (reaction-time scoring, timer warm-up, competition results — retain as
future Program Orchestrator product delta); broad hardware libraries; rewriting
OADL2 history; repairing inherited Final refresh flake; consuming `CQS-OD-066`.

## Consequences

- Teachers get an in-app Connect → keep-alive → slot→team → save path for the
  exact Wbuzz profile without shell helpers, plus readiness layers and a guided
  Repair controller connection flow that reuses Disable → Connect.
- Slice 21 product delivery is merged and post-merge verified; canonical docs
  reconciliation closes residual F-DOC-01 routing without fabricating a fourth
  fresh handset RC.
- Known LOW polish debt (F-UX-01): ordinary setup still exposes some
  WebHID/Gamepad jargon that should later demote into Advanced diagnostics.
- ADR-010 candidate/manual capture remains available as advanced diagnosis.
