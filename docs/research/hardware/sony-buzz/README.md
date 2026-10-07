# Sony / Namtai Wireless Wbuzz — hardware research shelf

**Status:** research / subordinate evidence shelf  
**Date:** 2026-10-07  
**Authorization:** `AUTHORIZE-CQS-Q7-HOLD-HARDWARE-INVESTIGATION-AND-JOURNAL-1`  
**Product candidate under observation:** `9410b6290a6dcb2f971e66da8173c3b44a6f785a`  
**Authority:** This shelf is **subordinate** to observed code, accepted ADRs
(especially ADR-019 / ADR-010), `docs/STATUS.md`, and physical receipts.
It does **not** authorize product repair, Electron upgrade, or Q7 resume.

```text
Q7: HOLD — REPAIR REQUIRED
Root cause: UNESTABLISHED
```

---

## 1. Exact hardware profile under study

| Field | Value |
| --- | --- |
| CQS profile id | `cqs.sony-buzz.namtai-wbuzz-wireless.v1` |
| Manufacturer (manual) | Namtai Electronic (Shenzhen) Co., Ltd.; distributed historically by Sony Computer Entertainment Europe |
| Form | Wireless USB receiver + up to four handsets |
| USB VID:PID | `054c:1000` (Sony Corp. Wireless Buzz! Receiver) |
| Wired sibling (unsupported in CQS) | `054c:0002` — candidate only; not this profile |
| Gamepad topology (CQS gate) | 20 buttons / 2 axes |
| WebHID output framing (CQS) | `reportId = 0`, exactly **7** data bytes |
| Nominal keep-alive cadence (CQS) | 2000 ms |
| Electron pin (candidate) | `43.4.0` |

Owner Q7 exercise used the **actual** MacBook + Namtai/Sony wireless receiver +
four handsets on this exact product candidate.

---

## 2. Five-layer model

CQS and external literature agree that wireless Buzz operation is **not** a
single “connected” boolean. Treat these as distinct layers:

| Layer | Meaning | Who owns it in CQS |
| --- | --- | --- |
| **1. RF pairing** | Handsets ↔ receiver BIND / sync; LED cues (solid blue then BIND, etc.) | Physical hardware + teacher Repair flow copy; **not** WebHID |
| **2. USB receiver / HID activation** | Receiver enumerated; host can open HID and send output reports that wake / sustain the RF side | OS + USB stack; CQS WebHID open + `sendReport` |
| **3. WebHID transport** | Permission, open, framing validation, keep-alive schedule, disconnect/recover | `sonyBuzzKeepAliveLifecycle` + `webHidTransport` |
| **4. Gamepad input exposure** | OS/browser exposes the 20-button composite Gamepad | Browser Gamepad API; `useGamepadBuzzInput` |
| **5. CQS setup / mapping / gameplay** | Slot↔team associations, Buzzer Check, buzz queue / gameplay | Class Setup / SonyBuzzSetupSection / game engine |

**Rule:** success at layer *N* does not imply readiness at layer *N+1*.

Companion files:

- Source claims: [`SOURCE-REGISTER.md`](SOURCE-REGISTER.md)
- Physical experiments (no fabricated results): [`EXPERIMENT-MATRIX.md`](EXPERIMENT-MATRIX.md)

---

## 3. Repository analysis of candidate `9410b62…` (verified)

Observed against product trees at
`9410b6290a6dcb2f971e66da8173c3b44a6f785a` (unchanged `src/` / `desktop/`
through current main docs-only commits).

### A. Show / Check buzzer routing — **CONFIRMED**

`ClassroomSetupPanel` invokes optional `onRevealBuzzersSetup` from both the
buzzers readiness-row action and the expanded-task **Show buzzer setup** /
**Check buzzers** control. `FoundationControls` supplies that callback.

### B. What that action does — **CONFIRMED**

The callback:

1. sets `enterBuzzerCheck` → `GamepadInputHostPanel` forces `testMode` (Buzzer
   Check / test mode);
2. scrolls/focuses `[data-testid="sbs-supported-profile"]` or `[data-testid="gih"]`;
3. **does not** call `useSonyBuzzSupportedProfile.connect` / WebHID
   `requestDevice` / keep-alive enable.

So **Show buzzer setup** reveals/arms the check surface; it is **not** USB
activation.

### C. `SonyBuzzKeepAliveLifecycle` — **CONFIRMED**

| Claim | Code truth |
| --- | --- |
| Exact profile | `0x054c` / `0x1000` |
| Output | `SONY_BUZZ_KEEPALIVE_REPORT_ID = 0`, seven bytes via `keepalivePayload()` (all zeros) |
| Immediate send | `startTimer` calls `sendOnce` before starting the interval |
| Cadence | `SONY_BUZZ_KEEPALIVE_CADENCE_MS = 2000` |

### D. `useSonyBuzzSupportedProfile` restore / hotplug — **CONFIRMED**

- On mount: calls `tryRestoreGranted()` (uses `hid.getDevices()`; no permission
  prompt).
- Transport subscribes to **`disconnect` only** (`onExactDisconnect`). There is
  **no** `connect` / device-added subscription in the lifecycle.
- If the receiver is attached **after** the initial restore returns empty,
  CQS does **not** auto-open WebHID until an explicit Connect, a later
  visibility/focus recover path that re-acquires, or a remount that retries
  restore.

### E. Layer separation vs UI conflation — **PARTIALLY SEPARATED**

**Separated in model:** `sonyBuzzTeacherReadiness` distinguishes receiver /
controllers / mapping; ADR-019 and Repair copy warn that WebHID `healthy` ≠
controllers transmitting.

**Conflation risk for natural teachers:**

- **Show buzzer setup** sounds like activation but only enters Buzzer Check +
  scroll/focus (Q7-F01-compatible).
- Class Setup still markets an optional **supported** physical path while
  keyboard remains available — historical Courts could mark physical Sony
  **PHYSICAL-ONLY** and still recommend eligibility (lesson for Court contract,
  not a rewrite of prior honesty).

---

## 4. Verified facts vs hypotheses

### Verified (code + CQS physical history + high-authority external docs)

1. Wireless receiver USB identity is `054c:1000`.
2. CQS keep-alive uses WebHID `sendReport(0, seven zero bytes)` at ~2 s.
3. Linux `hid-sony` and multiple community stacks treat a **7-byte** output
   report as LED / activation framing (`00`, four LED bytes `00`/`FF`, `00`,
   `00`).
4. WebHID passes `reportId` as a **separate argument**; HIDAPI `hid_write`
   requires the report ID as the **first buffer byte**.
5. PCGamingWiki and community tools document that wireless handsets often
   power down / ignore the host until an initialization/keep-alive output
   report is written.
6. Owner Q7 natural playthrough produced **Q7-F01** and **Q7-F02** on this
   candidate (see journal). Root cause remains **UNESTABLISHED**.

### Hypotheses — **UNVERIFIED** (ranked)

Do **not** treat these as root cause.

| Rank | Hypothesis | Why plausible | What would falsify |
| --- | --- | --- | --- |
| H1 | Layer-2 activation never succeeded (no successful WebHID open / first output report) during the natural route because Show≠Connect and restore missed a late-attached or ungranted receiver | Matches code path B/D; matches community “write zeros first” lore | Experiment matrix rows with measured first successful `sendReport` |
| H2 | Activation timing vs RF BIND order left handsets unpaired or unsustained despite LED activity at RF layer | ADR-019 pairing friction; PCGamingWiki sync notes | Controlled BIND-before vs BIND-after init experiments |
| H3 | Keep-alive payload (all-zero) is insufficient or wrongly timed relative to LED-on init used by some stacks | Linux/community often send non-zero LED bytes; CQS sends zeros (also used by SimpleHIDWrite lore) | Controlled LED-on vs all-zero trials with same permission/open state |
| H4 | Gamepad exposure lag / missing Gamepad after HID healthy | Historical “healthy ≠ transmitting” | Timestamp Gamepad appearance vs first press |
| H5 | Electron 43.4.0 / session HID permission or ephemeral grant quirks | Electron stores some HID grants ephemerally; CQS pins 43.4.0 | Same build vs Chrome-on-macOS control; **no upgrade recommendation from novelty alone** |
| H6 | Show buzzer setup affordance failure alone (scroll/focus invisible) without transport failure | Explains F01; does **not** alone explain F02 | Black-box + instrumented Connect path |

---

## 5. Unresolved questions

1. During the owner Q7 run, was WebHID permission already granted?
2. Was any output report successfully sent before presses?
3. Did a Gamepad with Wbuzz topology appear at any timestamp?
4. What was BIND / LED state relative to any Connect or restore?
5. Does all-zero vs LED-on init change RF sustain on this exact Namtai set?
6. Does receiver hotplug after Class Setup mount remain silent without Connect?
7. Is Electron 43.4.0 materially different from Chrome for this device on the
   owner MacBook?

---

## 6. Links

| Artifact | Path |
| --- | --- |
| Source register | [`SOURCE-REGISTER.md`](SOURCE-REGISTER.md) |
| Experiment matrix | [`EXPERIMENT-MATRIX.md`](EXPERIMENT-MATRIX.md) |
| ADR-019 | [`../../../architecture/ADR-019-sony-buzz-supported-profile-direct-webhid-keepalive.md`](../../../architecture/ADR-019-sony-buzz-supported-profile-direct-webhid-keepalive.md) |
| Q7 journal entry | [`../../../dev-journal/CQS-DEVELOPMENT-JOURNAL.md`](../../../dev-journal/CQS-DEVELOPMENT-JOURNAL.md) |
| Pre-owner Court contract | [`../../../qualification/PRE-OWNER-FUNCTIONAL-QUALIFICATION.md`](../../../qualification/PRE-OWNER-FUNCTIONAL-QUALIFICATION.md) |

---

## 7. Non-claims

This shelf does **not**:

- establish Q7 root cause;
- claim hardware PASS or FAIL beyond owner-observed F01/F02;
- authorize product behavior repair, keep-alive changes, or Electron upgrade;
- resume Q7, S04D, S06, S05 terminalization, signing, or release work.
