# OADL2-S07 — Sony Buzz! physical certification attempt (hard stop)

| Field | Value |
| --- | --- |
| Evidence-state ID | `OADL2-S07-ES-1` |
| Parent authorization | `AUTHORIZE OADL2-S07-COMPLEX-REPAIR-AND-QA-PILOT` |
| Recovery authorization | `AUTHORIZE OADL2-S07-CORRECT-HOST-RECOVERY-AND-CONDITIONAL-CLONE` |
| Date (local host) | 2026-08-01 |
| Lane | **C — material hard stop** (no code repair; no compatibility claim) |
| Repository | `ricktron/classroom-quiz-show` |
| Local root | `/Users/macdaddy/Documents/Coding/Cursor Projects/classroom-quiz-show` |
| Live base SHA | `5fe6eb39dd107c24e4ae1bad8d091cf5c83ed007` (`origin/main`) |

## Verdict

Physical certification on the correct host **did not complete**. The wireless
receiver was live and enumerated. The browser Gamepad API was present. CQS host
UI showed the expected no-controller copy and Sony Buzz! setup surface after a
teams-bearing import. **No handset button events were observed** in raw HID
callbacks or in `navigator.getGamepads()` across multiple timed capture windows,
so the four-handset / five-button matrix, reconnect matrix, and gameplay dispatch
matrix could not be evidenced.

**No Sony Buzz! compatibility is claimed.**

## Host environment

| Fact | Observed |
| --- | --- |
| `hostname` | `Ricks-MacBook-Air.local` |
| `whoami` | `macdaddy` |
| OS | macOS 26.5.1 (Build 25F80) |
| Node | v26.0.0 |
| npm | 11.12.1 |
| Browser used | Google Chrome via Playwright `channel: 'chrome'` (Chrome/151 family) |
| Clone | Existing clean clone; origin `https://github.com/ricktron/classroom-quiz-show.git` |
| Duplicate clone | Not created (`/Users/macdaddy/Repos` had no CQS clone; `/Volumes/OpenClaw-Data/repos` absent) |

Phase 0A hard gate **passed** (live user `macdaddy`; not `rick.local` / `rick`;
receiver evidenced).

## Hardware enumeration

| Fact | Observed |
| --- | --- |
| USB product | `Wbuzz` |
| USB vendor string | `Namtai` |
| `idVendor` | `1356` (`0x054c`) |
| `idProduct` | `4096` (`0x1000`) — wireless Buzz product id |
| Transport | USB |
| HID Usage Page / Usage | `1` / `4` (Generic Desktop / Joystick) |
| `hidutil` classes | `AppleUserHIDDevice` + `AppleUserHIDEventService` |
| Configurations | `bNumConfigurations = 1` |
| Max input report size | `5` |
| Game Controller framework | `GCController.controllers().count == 0` over a 20 s probe |

Receiver remained present across the session (including after USB re-enumeration
of registry ids). One absent-receiver unplug/replug diagnostic was **not** used
because the receiver was never absent.

## Raw-HID result

Bounded Swift/IOKit probes (no new packages installed):

1. Manager open succeeded; one device matched; **zero input-report callbacks** in
   a 90 s window (no change events).
2. Controlled retry after releasing browser access: device open succeeded
   (`IOHIDDeviceOpen` `0x0`); `IOHIDDeviceGetReport` returned success with
   **length 0**; **no button-change reports** in a 40 s windowed window.

Interpretation: the receiver is openable as HID, but this session produced **no
attributable handset report traffic**. Competing explanations include unpowered /
unawakened handsets, depleted batteries, and OS HID mediation that does not
deliver reports without a press. This alone is **not** treated as proof the
device is failed, especially while browser Gamepad behavior also saw no devices.

## Browser Gamepad result

| Observation | Result |
| --- | --- |
| `typeof navigator.getGamepads` | `"function"` |
| Array length (Chrome) | `4` |
| Present devices before any press | `[]` (all slots null) — expected until a button is pressed |
| Capture 1 (`file://` probe, 90 s) | `presses = 0` |
| Capture 2 (`file://` probe, 120 s) + critical alert | `presses = 0` |
| Exact `Gamepad.id` / mapping / button indices | **Unverified** — device never exposed |
| One vs many logical devices | **Unverified** |
| Reload / unplug / restart Gamepad matrix | **Unverified** |

## CQS physical matrix (partial)

Preview served at `http://127.0.0.1:4173/classroom-quiz-show/` from existing
`dist` at base `5fe6eb39…`.

| Test | Expected | Observed | Result |
| --- | --- | --- | --- |
| Host without game | Gamepad panels hidden (no teams / no game) | Panels absent until teams-bearing game loaded | Pass (UI gating) |
| Import category-board sample (has teams) | Gamepad + Sony setup surfaces appear | Controllers section + “Sony Buzz! setup (session-local)” present | Pass |
| No physical press | Calm no-controller copy; keyboard remains available | “No controller detected. Keyboard buzzing remains available.” | Pass |
| Candidate classification on live id | Wireless candidate if `054c`+`1000` tokens appear in `Gamepad.id` | **Not exercised** — no Gamepad object | Blocked |
| Guided capture 4×5 | Capture all controls | **Not exercised** | Blocked |
| Setup test mode | Edges reported without dispatch | **Not exercised** | Blocked |
| Gameplay dispatch | Buzz queue via mapped primary | **Not exercised** | Blocked |
| Held-button / reconnect / reload / browser restart | Re-prime / baseline behaviour | **Not exercised** | Blocked |
| Keyboard fallback after gamepad use | Keyboard still works | Keyboard copy present; live keyboard buzz not re-proven in this session | Partial |
| Keyboard-only fallback | Usable without controllers | UI states keyboard remains available | Partial (copy only) |

## Failure classifications

### F1 — No handset presses observed at Gamepad or raw HID

| Field | Value |
| --- | --- |
| Class | `LOCAL_ENVIRONMENT_FAILURE` (primary); competing `HARDWARE_FAILURE` |
| Evidence | Receiver enumerated; Gamepad API live; 90 s + 120 s captures with `presses = 0`; raw HID open OK with no change reports; `GCController` count 0 |
| Confidence | Medium |
| Competing explanations | Handsets off / unpaired; dead batteries; operator not pressing during windows; rare OS exclusive-access issue (Chrome was quit for one HID retry) |
| Smallest discriminating next test | With Chrome Gamepad probe focused, wake **one** handset by pressing its red buzzer; record whether a `Gamepad` appears and which button index fires. If none appears, replace/verify batteries and repeat once. |
| Repair | Not ordinary application repair yet — blocked on physical input evidence |

### F2 — Full certification matrix incomplete

| Field | Value |
| --- | --- |
| Class | `UNKNOWN` (insufficient discriminating evidence for app vs hardware) |
| Evidence | Matrix rows blocked under F1 |
| Confidence | High that certification is incomplete; low that application code is defective |
| Competing explanations | App defect vs hardware vs browser — **cannot distinguish** without at least one live Gamepad press |
| Smallest discriminating next test | Same as F1, then complete capture + test mode + one armed buzz |
| Repair | Lane C stop — material owner physical action required before repair/certification |

## Repair performed

None. No application code, lockfile, or architecture change.

## Compatibility claim

**None.** Explicit non-claim: this receipt does **not** certify wired or wireless
Sony Buzz! compatibility on this host/browser.

## Remaining limitations

- Exact browser `Gamepad.id` string unknown on this machine until a press exposes it.
- Topology (one Gamepad vs several) unknown.
- Browser button indices unknown.
- Reconnect / reload / restart behaviour untested with live handsets.
- Deterministic `npm run verify:all` was not used as a substitute for physical
  certification; repository verification for this docs-only hard-stop delivery is
  recorded separately in the delivery report if run.

## Branch Lease (docs hard-stop delivery)

| Field | Value |
| --- | --- |
| Branch | `fix/oadl2-s07-sony-buzz-certification` |
| Base | `5fe6eb39dd107c24e4ae1bad8d091cf5c83ed007` |
| Owned paths | this receipt; minimal `docs/STATUS.md` / `docs/handoff/CURRENT.md` / `docs/architecture/ADR-010-sony-buzz-profile-and-setup.md` notes of the blocked attempt |
| Forbidden | runtime/code, lockfiles, `.github/**`, NightWatch, S08 |

## Explicit non-claims

- Does not mark Slice 10 incomplete.
- Does not authorize WebHID, native bridges, drivers, or dependency changes.
- Does not register S07 in NightWatch.
- Does not authorize merge or S08.
