# ADR-019 — Sony Buzz supported profile (direct WebHID keep-alive)

- **Status:** Proposed — implementation in progress on
  `feat/slice-21-sony-buzz-supported-profile` (not merge-complete; four-handset
  physical RC owed)
- **Date:** 2026-08-09
- **Slice:** 21 — Sony Buzz Supported-Profile Operationalization
- **Authorization:**
  `AUTHORIZE-CQS-SLICE-21-SONY-BUZZ-SUPPORTED-PROFILE-IMPLEMENTATION-1`
- **Evidence state:**
  `CQS-SLICE-21-SONY-BUZZ-SUPPORTED-PROFILE-IMPLEMENTATION-ES-1`
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
| Groups | `0–4`, `5–9`, `10–14` observed; `15–19` **UNTESTED / FINAL RC OWED** |
| Replug | Gamepad index `0 → 1`; WebHID reacquisition succeeded |
| Already-open | `InvalidStateError: The device is already open.` observed; converge safely |
| USB hub replug | observed once — **not** a general hub-support claim |

Physical handset #3 / browser group `15–19` remains final RC owed and blocks
final four-handset support certification and merge authorization.

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
slot 4: 15–19   # final RC owed until four-handset certification
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

Progressive disclosure: Status, Connect/Enable, team assignments, test buttons,
keyboard fallback note, advanced diagnostics. Permission only via deliberate
Connect. Keyboard buzzing remains available in every Sony health/failure state.
Zero-team games show a Controllers empty state pointing to teams-bearing import
rather than hiding Controllers entirely.

### 10. Privacy

Sony/WebHID/mapping details stay host-private. They must not enter PublicState,
projector, sync envelope, game JSON, `.cqs-pack`, workbook, event history, or
completed summaries.

### 11. Support boundary and nonclaims

Supported statement (when certified) must identify Namtai wireless Wbuzz
`054c:1000`, four paired wireless handsets, tested macOS/build, tested Chrome,
exact CQS candidate/release, and keyboard fallback.

Explicit nonclaims: wired `054c:0002`; other Sony/Namtai/Buzz hardware; arbitrary
USB hubs; Windows; Linux; Raspberry Pi; Safari; Firefox; Edge; ChromeOS; mobile
OSes; guaranteed 2-second background cadence.

### 12. RC requirements

Final independent acceptance for merge requires four-handset physical RC on the
exact candidate head, including group `15–19` / physical handset #3. Product
changes affecting HID/lifecycle/Gamepad/mapping/persistence/setup/input after RC
require affected physical retest.

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
input; multiple-choice Sony mechanics; buzzer/reaction/timer minigames; broad
hardware libraries; rewriting OADL2 history; repairing inherited Final refresh
flake; consuming `CQS-OD-066`.

## Consequences

- Teachers get an in-app Connect → keep-alive → slot→team → save path for the
  exact Wbuzz profile without shell helpers.
- Merge remains gated on four-handset physical RC.
- ADR-010 candidate/manual capture remains available as advanced diagnosis.
