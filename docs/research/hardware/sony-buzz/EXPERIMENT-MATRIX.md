# Sony / Namtai Wbuzz — physical experiment matrix

**Status:** plan only — **no results fabricated**  
**Date:** 2026-10-07  
**Authorization:** `AUTHORIZE-CQS-Q7-HOLD-HARDWARE-INVESTIGATION-AND-JOURNAL-1`  
**Default candidate:** `9410b6290a6dcb2f971e66da8173c3b44a6f785a`  
**Default stack:** owner MacBook + Electron `43.4.0` + Namtai Wbuzz `054c:1000` + four handsets  

This matrix defines **future** physical diagnostics. Empty Result cells mean
**NOT RUN**. Do not fill them from speculation.

Product repair is **not** authorized by this document.

---

## Capture fields (every row)

Record all of the following (use ISO timestamps where possible):

| Field | Notes |
| --- | --- |
| Exact build / candidate SHA | Prefer packaged desktop identity or served `sourceSha` |
| OS / Electron | e.g. macOS build + Electron 43.4.0 |
| Receiver VID/PID | Expect `054c:1000` |
| Starting RF / LED state | Handset LEDs + receiver LED before actions |
| Permission state | never-granted / previously granted / forgotten |
| WebHID open state | closed / opening / opened |
| Output framing | reportId + byte vector actually sent |
| Timestamp first successful output report | or FAIL with error |
| Gamepad appearance timestamp | Wbuzz topology 20 buttons |
| First physical press timestamp | which handset/button |
| First CQS observation timestamp | Buzzer Check line / mapping / gameplay |
| Send / failure counts | from transport snapshot if visible |
| Result | PASS / FAIL / INCONCLUSIVE |
| Interpretation | Must keep layers distinct; no root-cause leap |

Optional instrumentation: **Q7-DIAG-1** lands a bounded Advanced-diagnostics
**Wbuzz signal-chain trace** (WebHID lifecycle + Gamepad exposure/observation).
Use it for future **E03 → E04 → E11** execution. Reset the trace before each
experiment; copy text/JSON after. Ordinary teacher Class Setup is unchanged.
No physical experiment in this matrix is marked executed by DIAG-1 alone.

---

## Experiment rows

### E01 — Receiver present before launch; permission already granted

| | |
| --- | --- |
| Purpose | Baseline restore path (`tryRestoreGranted`) |
| Procedure | Grant WebHID once beforehand; quit; plug receiver; launch CQS; open unfinished session → Class Setup; do **not** click Connect; observe transport + Gamepad |
| Result | _NOT RUN_ |
| Interpretation | _empty_ |

### E02 — Receiver present before launch; permission not granted

| | |
| --- | --- |
| Purpose | Natural permission-required posture |
| Procedure | Clear HID permission / fresh profile if needed; receiver plugged; launch; Class Setup; observe whether restore fails closed; then explicit Connect |
| Result | _NOT RUN_ |
| Interpretation | _empty_ |

### E03 — Show buzzer setup before Connect

| | |
| --- | --- |
| Purpose | Reproduce Q7-F01 affordance; separate from activation |
| Procedure | Natural Class Setup → optional buzzers → **Show buzzer setup** / **Check buzzers**; do not Connect; record any scroll/focus/Buzzer Check visibility and any transport change |
| Result | _NOT RUN_ |
| Interpretation | _empty_ |

### E04 — Explicit Connect

| | |
| --- | --- |
| Purpose | Layer-2/3 activation via supported control |
| Procedure | From Class Setup / Buzzers section, click Connect (user gesture); capture first successful output report time and health |
| Result | _NOT RUN_ |
| Interpretation | _empty_ |

### E05 — Pair / BIND then immediate HID initialization

| | |
| --- | --- |
| Purpose | RF-first order |
| Procedure | Power handsets to solid blue; BIND/sync receiver; then Connect / ensure keep-alive running; press RED |
| Result | _NOT RUN_ |
| Interpretation | _empty_ |

### E06 — HID initialization then pair / BIND

| | |
| --- | --- |
| Purpose | HID-first order |
| Procedure | Connect / keep-alive first; then solid-blue + BIND; press RED |
| Result | _NOT RUN_ |
| Interpretation | _empty_ |

### E07 — Guided Repair flow

| | |
| --- | --- |
| Purpose | Product-taught recovery path |
| Procedure | Follow on-screen Repair buzzers steps (power-off → solid blue → BIND → observe red → Connect as prompted) without improvising |
| Result | _NOT RUN_ |
| Interpretation | _empty_ |

### E08 — Receiver connected after Class Setup already mounted

| | |
| --- | --- |
| Purpose | Hotplug gap (no connect-event subscription) |
| Procedure | Launch with receiver **unplugged**; reach Class Setup; plug receiver; wait without remount; observe restore silence; then Connect |
| Result | _NOT RUN_ |
| Interpretation | _empty_ |

### E09 — Unplug / replug

| | |
| --- | --- |
| Purpose | Disconnect handler + reacquire |
| Procedure | From healthy keep-alive, unplug receiver; note health; replug; try focus return and/or Connect; record permission permanence |
| Result | _NOT RUN_ |
| Interpretation | _empty_ |

### E10 — Focus / visibility return

| | |
| --- | --- |
| Purpose | `onVisibilityOrFocusReturn` soft refresh |
| Procedure | With keep-alive healthy, hide app / switch focus for > health-age window; return; note send + degraded→healthy behavior |
| Result | _NOT RUN_ |
| Interpretation | _empty_ |

### E11 — All-zero initialization report

| | |
| --- | --- |
| Purpose | Match current CQS payload + SimpleHIDWrite lore |
| Procedure | Ensure open device; send / rely on CQS `00×7` keep-alive; measure Gamepad + presses |
| Result | _NOT RUN_ |
| Interpretation | _empty_ |

### E12 — Controlled LED-on initialization report (if descriptor allows)

| | |
| --- | --- |
| Purpose | Contrast with all-zero; **diagnostic only** |
| Procedure | Only on an authorized diagnostic build or external tool (not teacher product change): send reportId 0 with LED bytes `FF` for slots under test per hid-sony layout; compare sustain vs E11 |
| Result | _NOT RUN_ |
| Interpretation | _empty_ |
| Constraint | Does **not** authorize changing production keep-alive |

---

## Suggested execution order (with Q7-DIAG-1)

Primary diagnostic path for the next physical session:

1. **E03** — Show buzzer setup before Connect (capture F01 + trace: expect no
   `connect_invoked` / no first output unless restore already ran)
2. **E04** — Explicit Connect (expect `connect_invoked` → open/framing → first
   output success/fail)
3. **E11** — All-zero keep-alive path under Connect (confirm
   `output_report_first_*` + `gamepad_wbuzz_appeared` / button / CQS observation)

Then, as needed:

4. E01 / E02 (permission matrix)
5. E05 / E06 (BIND order)
6. E07 (Repair)
7. E08 / E09 / E10 (lifecycle edges)
8. E12 only after E11 baseline and with explicit diagnostic authority

### Operator procedure for E03 → E04 → E11 (instrumented)

1. Launch the DIAG-1 build (exact SHA from Advanced diagnostics trace meta /
   `desktop-build-identity.json`).
2. Open **More → Advanced diagnostics → Wbuzz signal-chain trace**.
3. Click **Reset trace**.
4. Resume/reach Class Setup; expand optional buzzers.
5. **E03:** click **Show buzzer setup** / **Check buzzers**; do **not** Connect;
   wait ~10s; copy/export trace; note UI effect and whether any WebHID/Gamepad
   events appeared.
6. **Reset trace**.
7. **E04:** click **Connect** (user gesture); wait for keep-alive; copy trace;
   record first output success/fail and send counts.
8. **E11:** with Connect healthy, exercise presses; confirm Gamepad appear +
   first button transition + `cqs_buzzer_observation` timestamps; copy trace.
9. Fill the capture fields for each row. Do **not** invent results.

---

## Stopping rules

- Stop a row when first CQS observation is recorded **or** after a pre-declared
  wait (recommend 90 s) with no Gamepad / no observation.
- Do not collapse RF LED activity into CQS PASS.
- Do not declare root cause from a single row.
- Do not start product repair from this matrix alone.

---

## Result log (append-only when run)

| ID | Date | Operator | Candidate | Result | Notes |
| --- | --- | --- | --- | --- | --- |
| — | — | — | — | — | No physical experiments executed under this authorization |
