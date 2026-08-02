# OADL2-S07 — Sony Buzz! physical certification (Playwright-assisted CQS)

| Field | Value |
| --- | --- |
| Evidence-state ID | `OADL2-S07-ES-1` |
| Parent authorization | `AUTHORIZE OADL2-S07-COMPLEX-REPAIR-AND-QA-PILOT` |
| Recovery authorization | `AUTHORIZE OADL2-S07-CORRECT-HOST-RECOVERY-AND-CONDITIONAL-CLONE` |
| Continuation authorization | `AUTHORIZE OADL2-S07-HANDSET-SYNC-AND-PHYSICAL-MATRIX-CONTINUATION` |
| Retry authorization | `AUTHORIZE OADL2-S07-SERIAL-HARNESS-AND-CQS-MATRIX-RETRY` |
| Dates (local host) | 2026-08-01 (initial); 2026-08-02 (sync, serial harness, Playwright-assisted CQS) |
| Lane | **C — platform keep-alive + Playwright-assisted CQS matrices** (docs-only) |
| Repository | `ricktron/classroom-quiz-show` |
| Local root | `/Users/macdaddy/Documents/Coding/Cursor Projects/classroom-quiz-show` |
| Live base SHA | `5fe6eb39dd107c24e4ae1bad8d091cf5c83ed007` (`origin/main`) |
| Branch / PR | `fix/oadl2-s07-sony-buzz-certification` / [#29](https://github.com/ricktron/classroom-quiz-show/pull/29) |
| Tested CQS commit | runtime unchanged on live base `5fe6eb39…` (docs branch only) |

## Verdict

On this tested macOS/Chrome configuration, a **temporary external** HID output
keep-alive kept paired Namtai wireless handsets responsive. The Gamepad API
reads browser-exposed controller state but cannot send arbitrary HID output
reports. Chrome WebHID was **not** authorized or tested.

A corrected serial browser harness previously captured all twenty physical
controls. Playwright-assisted CQS certification then completed guided setup for
labeled handsets A–D, test mode, primary-Red gameplay (including hold /
rising-edge and a simultaneous A+B ordering observation), and keyboard fallback
after gamepad use. Lifecycle showed expected **session-local mapping loss** on
reload; receiver unplug left the temporary helper in `write_fail` and a wake
press did not restore candidate visibility without helper recovery.

**Bounded compatibility claim** (see below). Permanent in-product keep-alive
architecture remains **unresolved**.

## Authorization lineage

1. `AUTHORIZE OADL2-S07-COMPLEX-REPAIR-AND-QA-PILOT`
2. `AUTHORIZE OADL2-S07-CORRECT-HOST-RECOVERY-AND-CONDITIONAL-CLONE`
3. `AUTHORIZE OADL2-S07-HANDSET-SYNC-AND-PHYSICAL-MATRIX-CONTINUATION`
4. `AUTHORIZE OADL2-S07-SERIAL-HARNESS-AND-CQS-MATRIX-RETRY` (this continuation)

## Host environment

| Fact | Observed |
| --- | --- |
| `hostname` | `Ricks-MacBook-Air.local` |
| `whoami` | `macdaddy` |
| OS | macOS 26.5.1 (Build 25F80) |
| Browser | Google Chrome `151.0.7922.71` (Playwright `channel: 'chrome'`, single persistent context) |
| CQS version (package) | `0.1.0` at live base `5fe6eb39…` |
| Temporary harness root | `/private/tmp/oadl2-s07-serial-retry/` (not committed) |

## Hardware enumeration

| Fact | Observed |
| --- | --- |
| USB product | `Wbuzz` |
| USB vendor string | `Namtai` |
| `idVendor` / `idProduct` | `1356` / `4096` (`0x054c` / `0x1000`) |
| Browser Gamepad | index `0`, id `Wbuzz (Vendor: 054c Product: 1000)`, **20** buttons, **2** axes |

## Keep-alive (temporary external helper)

| Fact | Observed |
| --- | --- |
| Mechanism | Swift/IOKit `IOHIDDeviceSetReport` output, **7** zero bytes, ~**2 s** interval |
| Clean stop | `/private/tmp/oadl2-s07-serial-retry/stop-keepalive.sh` |
| Healthy example | `status=ok`, `writeFail=0` while matrices ran |
| After receiver unplug | helper entered `write_fail` (`lastWriteStatus=-536870206`); restart via `start-keepalive.sh` restored `status=ok` |
| Permanent product architecture | **Unverified** |

## Complete serial browser matrix (prior; not re-run)

| Observation | Result |
| --- | --- |
| Full matrix | **20/20** press + release; unique indices `0`–`19` |
| Color pattern within each red group R | Red=R, Yellow=R+1, Green=R+2, Orange=R+3, Blue=R+4 |

### Label binding (A–D)

| Label | Red browser index (0-based) | Color group |
| ----- | --------------------------: | ----------- |
| A | 0 | 0–4 |
| B | 10 | 10–14 |
| C | 5 | 5–9 |
| D | 15 | 15–19 |

Earlier apparent identity contradiction was Rick picking up a different handset —
**not** index instability.

## Automated fake-Gamepad coverage (not physical certification)

| Suite | Result |
| --- | --- |
| Targeted Vitest (sonyBuzzProfile, SonyBuzzSetupSection, gamepadIntegration, GamepadInputHostPanel, useGamepadBuzzInput, adapter/mapping/deviceProfile/source) | **230** passed |
| `tests/e2e/gamepad-input.spec.ts` (3 projects) | **15** passed |

Synthetic E2E does **not** constitute physical certification.

## Playwright architecture

| Fact | Observed |
| --- | --- |
| Workers | **1** (single Node process / single persistent Chrome context) |
| `fullyParallel` | **false** (no parallel browser workers) |
| Owner prompts | Temporary in-page overlay (instruction, handset, button, audio cue, keep-alive status, Stop); auto-closes on CQS DOM proof |
| Temporary artifacts | `/private/tmp/oadl2-s07-serial-retry/logs/cqs-cert/` (not committed) |

## CQS guided-setup matrix (PASS)

Teams (runtime 4-team import in UI only): Blue Basalts, Red Rhyolites, Green
Granites, Yellow Schists. Round advanced so category-board / local-input panels
render. Candidate surface: “At least one candidate Sony Buzz! controller is
visible (USB id evidence only).”

| Handset | Team | Preview (one-based CQS labels) | Apply |
| ------- | ---- | ------------------------------ | ----- |
| A | Blue Basalts | red 1, blue 5, orange 4, green 3, yellow 2 | Applied |
| B | Red Rhyolites | red 11, blue 15, orange 14, green 13, yellow 12 | Applied |
| C | Green Granites | red 6, blue 10, orange 9, green 8, yellow 7 | Applied |
| D | Yellow Schists | red 16, blue 20, orange 19, green 18, yellow 17 | Applied |

Zero-based browser indices match the established A–D binding; CQS preview uses
`buttonIndex + 1`.

## CQS test-mode matrix (PASS)

Entered / left test mode via `sbs-test-mode`. Scores and queue unchanged
(`scoresUnchanged`, `queueUnchanged`).

| Press | Observed `sbs-test-outcome` |
| ----- | --------------------------- |
| A Red | Blue Basalts · Buzz · Controller 1 · button 1 |
| B Red | Red Rhyolites · Buzz · Controller 1 · button 11 |
| C Red | Green Granites · Buzz · Controller 1 · button 6 |
| D Red | Yellow Schists · Buzz · Controller 1 · button 16 |
| A Blue | Blue Basalts · Secondary action 1 · button 5 |
| B Orange | Red Rhyolites · Secondary action 2 · button 14 |
| C Green | Green Granites · Secondary action 3 · button 8 |
| D Yellow | Yellow Schists · Secondary action 4 · button 17 |

## CQS gameplay matrix

| Check | Result |
| ----- | ------ |
| A–D Red identify correct teams | **PASS** (Blue Basalts / Red Rhyolites / Green Granites / Yellow Schists) |
| Hold Red (rising-edge only) | **PASS** (observed complete in resume2 before later stop; no repeated queue spam) |
| Release then press (new rising edge) | **PASS** (resume2) |
| Simultaneous A+B Red | **PASS** — active `Blue Basalts`, waiting `1. Red Rhyolites` (deterministic order observed) |
| Blue secondary in gameplay | **LIMITATION** — does not enter buzz queue (`Nobody has buzzed yet`; secondary mapping only) |

Prerequisite: after import, **Advance to next round** is required before
`cbh-*` / `lih-*` / `rth-*` surfaces exist (`gameLifecycle === 'active'`).

## Keyboard fallback (PASS)

| Check | Result |
| ----- | ------ |
| Keyboard buzz (`Digit1` → Blue Basalts) | **PASS** after gamepad setup/apply |
| Fallback copy present | “Keyboard buzzing remains available whether or not a Sony Buzz! candidate is present.” |
| Leaving test mode | Restored gameplay path (used for keyboard/gameplay after test mode) |

## Lifecycle matrix

| Check | Result |
| ----- | ------ |
| Reload | Session-local staging/mapping lost (`0 of 5`; surface may show no controller until wake) — **expected** |
| Freeze/focus (CDP / blur) | Surface remained calm; no false claim of durable mapping |
| Receiver unplug/replug | Temporary helper → `write_fail`; CQS surface lost candidate |
| Helper recovery | `start-keepalive.sh` restored `status=ok` after unplug damage |
| Handset wake press after failed helper | Operator: “I pressed it, but CQS did not react” until helper healthy again |

## Setup-UX defect assessment

| Item | Assessment |
| ---- | ---------- |
| Accessible locators | Setup driveable via `sbs-*` / roles; Playwright completed ordinary clicks |
| Teacher path friction | **Initialize sample game** is 0-team → Controllers/Sony section absent; certification needed a teams-bearing import + **Advance to next round** for board/timer/keyboard panels |
| Classification | Setup-path / usability observation; **no runtime mutation** under this authorization; not promoted to a Branch Lease amendment here |
| Proposed follow-up (not authorized now) | Clearer empty-state copy when `teams.length === 0`; optional E2E covering “sample with teams + Advance” before Sony capture |

## Failure classifications

### F1 — Wireless keep-alive platform requirement

| Field | Value |
| --- | --- |
| Class | `OS_OR_HID_FAILURE` / unresolved platform integration requirement |
| Evidence | Without output writes, handsets die; with temporary 7-byte output keep-alive, raw HID + Chrome Gamepad + CQS matrices work on this host |
| Permanent architecture | **Unresolved** |

### F2 — Hot-plug / helper recovery

| Field | Value |
| --- | --- |
| Class | `LOCAL_ENVIRONMENT_FAILURE` / temporary-helper lifecycle limit |
| Evidence | Unplug produced helper `write_fail`; wake press alone did not restore CQS candidate |

### F3 — Secondary colored gameplay

| Field | Value |
| --- | --- |
| Class | Product limitation (by design of primary buzz vs secondary slots) |
| Evidence | Test mode reports secondary actions; gameplay queue accepts primary Buzz only |

## Application defect found?

**No attributable CQS runtime defect** was isolated against the stable browser
button map for guided setup, test mode, primary buzz gameplay, or keyboard
fallback. Setup-path usability (0-team sample; need Advance for lih/cbh) remains
a documentation/UX observation only under this docs lease.

## Compatibility claim (bounded)

**Claimed for this evidence-state only:**

> On `Ricks-MacBook-Air.local` / `macdaddy`, macOS 26.5.1, Chrome 151, wireless
> Namtai `Wbuzz` `054c:1000`, CQS runtime at base `5fe6eb39…`, **with a temporary
> external HID output keep-alive active**, Playwright-assisted certification
> passed Sony Buzz! guided setup for four labeled handsets (A–D), non-gameplay
> test mode, primary-Red gameplay identification and rising-edge behavior
> (including one simultaneous A+B ordering observation), and keyboard buzzing
> after gamepad use.

**Explicit non-claims:**

- Wired Sony Buzz! (`0002`) not tested.
- Operation **without** keep-alive not claimed.
- Permanent in-product keep-alive / WebHID / native bridge **not** designed or claimed.
- Hot-plug recovery without restarting the temporary helper **not** claimed.
- Secondary colored buttons are not primary buzz-queue inputs.
- No supported-hardware SKU list beyond this bounded host/receiver/handset set.

## Branch Lease (docs continuation)

| Field | Value |
| --- | --- |
| Branch | `fix/oadl2-s07-sony-buzz-certification` |
| Base | `5fe6eb39dd107c24e4ae1bad8d091cf5c83ed007` |
| Owned paths | this receipt; `docs/STATUS.md`; `docs/handoff/CURRENT.md`; `docs/architecture/ADR-010-sony-buzz-profile-and-setup.md` |
| Forbidden | runtime/code, tests, lockfiles, `.github/**`, NightWatch, S08, merge, WebHID, permanent native helper |

## Explicit non-claims (process)

- Does not mark Slice 10 incomplete.
- Does not authorize WebHID, native bridges, drivers, or dependency changes.
- Does not register S07 in NightWatch.
- Does not authorize merge or S08.
