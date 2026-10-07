# Sony / Namtai Wbuzz — source register

**Date / access date:** 2026-10-07  
**Hardware under study:** Namtai/Sony Wireless Buzz! receiver `054c:1000` + handsets  
**Platform context for CQS:** macOS owner MacBook; Electron `43.4.0`; Chromium WebHID  
**CQS independent verification column:** whether CQS has **independently** verified
the claim on CQS hardware/runtime (not whether the source exists).

Confidence scale: **HIGH** / **MEDIUM** / **LOW** / **ANECDOTAL**.

---

## Priority sources

| ID | Source | Type | Date / access | Hardware / platform | Relevant claim | Confidence | CQS independently verified? |
| --- | --- | --- | --- | --- | --- | --- | --- |
| S01 | Sony Wireless Buzz! Buzzers Instruction Manual (SLEH-00069 / Namtai manufacture; English reprints e.g. [manuzoid](https://manuzoid.com/manuals/QjNo2-Sony%20Wireless%20Buzz!%20Buzzers), [manuals.ca](https://www.manuals.ca/sony/wireless-buzz-buzzers/manual)) | Official product manual (third-party hosting of Sony/SCEE text) | Manual ~2008; accessed 2026-10-07 | PS2/PS3 Wireless Buzz; USB receiver + 4 handsets | Factory pairing with supplied receiver; replacement handset requires re-pairing **all four**; POWER/LOCK + blue LED cues; manufacturer Namtai | HIGH for RF pairing UX on console; **LOW** for PC/WebHID | Partial — CQS Repair copy aligns with solid-blue-then-BIND owner cues; full manual text not re-certified in-repo |
| S02 | [WebHID Living Standard](https://hid.spec.whatwg.org/) | Spec | Accessed 2026-10-07 | Browser WebHID | `sendReport(reportId, data)`; if interface does not use report IDs, pass `0`; data is payload **without** ID byte | HIGH | Yes — CQS uses `sendReport(0, 7 bytes)` per ADR-019 |
| S03 | [MDN `HIDDevice.sendReport()`](https://developer.mozilla.org/en-US/docs/Web/API/HIDDevice/sendReport) | Vendor docs | Accessed 2026-10-07 | Web APIs | Same framing: separate `reportId`; `0` when unused; Promise resolves when sent | HIGH | Yes — matches CQS transport |
| S04 | [Electron Device Access tutorial](https://electronjs.org/docs/latest/tutorial/devices) + [session API](https://github.com/electron/electron/blob/master/docs/api/session.md) | Platform docs | Accessed 2026-10-07 | Electron | `select-hid-device`, `setDevicePermissionHandler`, `setPermissionCheckHandler`; grants may be session-scoped unless persisted | HIGH | Partial — CQS desktop HID restricted to `054c:1000` (`desktop/hid.ts`); persistence of grants across relaunches not claimed here |
| S05 | [HIDAPI `hid_write` docs](https://libusb.info/hidapi/group__API.html) / [hidapi.h](https://github.com/libusb/hidapi/blob/master/hidapi/hidapi.h) | Library docs | Accessed 2026-10-07 | Cross-platform HID | First byte of buffer **is** Report ID; remaining bytes are report data; length includes ID byte | HIGH | Indirect — informs framing contrast; CQS does not use HIDAPI |
| S06 | Linux [`drivers/hid/hid-sony.c`](https://github.com/torvalds/linux/blob/master/drivers/hid/hid-sony.c) `buzz_set_leds` | Kernel driver | Accessed 2026-10-07 | Linux USB HID | 7 field values: `00`, LED1–4 (`00`/`ff`), `00`, `00`; `HID_REQ_SET_REPORT`; validates 7-value output report | HIGH for wired/wireless Buzz on Linux | No (CQS macOS/Electron path) |
| S07 | [CaileanWilkinson/pybuzzers](https://github.com/CaileanWilkinson/pybuzzers) | Open-source library | Accessed 2026-10-07 | Python / USB | Event-driven Buzz sets; LED on/off APIs | MEDIUM | No |
| S08 | [functino/buzz-buzzers](https://github.com/functino/buzz-buzzers) | Open-source library | Accessed 2026-10-07 | Node.js / USB | Wireless pairing hints (solid blue then dongle button); `setLeds` boolean API | MEDIUM | Partial — pairing narrative matches ADR-019 teacher cues |
| S09 | [domingguss/buzz](https://github.com/domingguss/buzz) | Open-source tool | Accessed 2026-10-07 | HIDAPI / macOS-ish | Writes bytes to flash LEDs; **~30 s** keep-alive to prevent auto power-off | MEDIUM | No — cadence differs from CQS 2 s |
| S10 | [real-squid-kid/WbuzzScoreboard](https://github.com/real-squid-kid/WbuzzScoreboard) | Community app | Accessed 2026-10-07 | Windows | Requires SimpleHIDWrite init: select Wbuzz, write seven `00`, then buttons blink | MEDIUM | No |
| S11 | [PCGamingWiki: Buzz! Buzzers](https://www.pcgamingwiki.com/wiki/Controller:Buzz!_Buzzers) | Community wiki | Verified note 2022-12-24; accessed 2026-10-07 | Windows/Linux/emulators | Wireless handsets power off without host init; SimpleHIDWrite seven `00`; sync when all solid blue then receiver sync | MEDIUM | No for Windows init; RF sync narrative aligns with CQS Repair |
| S12 | DeviceHunt / USB ID listings for `054C:1000` | Device catalog | Accessed 2026-10-07 | USB | Names device Wireless Buzz! Receiver | HIGH for VID/PID naming | Yes — CQS filter uses same IDs |
| S13 | CQS ADR-019 + Slice 21 receipts | In-repo ADR / physical evidence | 2026-08 | Owner macOS + Chrome + Namtai `054c:1000` | Direct WebHID keep-alive viable; reportId 0 / 7 zero bytes / ~2000 ms; Gamepad 20/2 | HIGH | Yes — product baseline |
| S14 | CQS desktop Electron pin `43.4.0` | In-repo dependency | Candidate `9410b62…` | Electron | WebHID session handlers present | HIGH | Yes |

---

## Explicit investigation topics

### Output report framing (HIDAPI vs WebHID)

| Stack | Framing |
| --- | --- |
| WebHID | `device.sendReport(reportId, data)` — ID separate; data length = report payload ([S02][S03]) |
| HIDAPI | `hid_write(dev, buf, len)` — `buf[0]` = report ID; payload follows ([S05]) |
| Linux hid-sony | Sets 7 report field values then `HID_REQ_SET_REPORT` ([S06]) |

**Implication for CQS:** sending seven payload zeros with `reportId=0` is the
WebHID-correct analogue of HIDAPI `[0x00, 0x00×7]` **only if** the descriptor
treats report ID 0 as “no numbered reports” / single report. CQS already
fail-closes on descriptor mismatch (`validateSupportedWbuzzOutputFraming`).

### Is a zero report initialization, keep-alive, LED-off, or combination?

| Interpretation | Support | Status |
| --- | --- | --- |
| LED-off / clear | hid-sony uses `00` LED bytes to clear; all-zero matches “all LEDs off” | Verified in driver source; **not** proven as sole PC wake mechanism |
| Host keep-alive / wake | PCGamingWiki + WbuzzScoreboard + domingguss: periodic or one-shot writes prevent power-off / enable recognition | Community MEDIUM; CQS historical physical PASS used zeros |
| Distinct “init then LED” | Some stacks turn LEDs on at init (USB Host Shield `setLedOnAll`) | Alternate pattern; **UNVERIFIED** whether required for CQS |

**CQS current product truth:** keep-alive payload is **all zeros**; LED-on
output is **not** implemented in the supported profile.

### Should initialization occur immediately after open?

| Claim | Status |
| --- | --- |
| CQS sends immediately when `startTimer` runs after successful open/enable | **Verified in code** |
| Hardware **requires** immediate post-open write before RF use | **Plausible (H1/H2)** — **UNVERIFIED** as root cause of Q7-F02 |
| Community tools often write before expecting Gamepad presses | Documented ([S10][S11]) — not CQS proof |

### Interaction with RF BIND

Manual + functino + PCGamingWiki: pair when handsets show solid blue, then
receiver sync/BIND. CQS Repair flow encodes that narrative.

**Unresolved:** whether keep-alive/output reports should be active **during**
BIND, only **after**, or both. ADR-019 recorded pairing friction historically
without declaring a single mandatory order for all OS stacks.

### Keep-alive during pairing

| Claim | Status |
| --- | --- |
| Some apps keep sending during use (domingguss ~30 s; CQS ~2 s) | Documented |
| Keep-alive **must** remain active during BIND | **UNVERIFIED** |
| Keep-alive **interferes** with BIND | **UNVERIFIED** |

### Hotplug / replug

| Claim | Status |
| --- | --- |
| CQS listens for WebHID **disconnect**; not connect-add | **Verified in code** |
| ADR-019 observed Gamepad index shift + WebHID reacquisition on replug | Historical CQS physical |
| Late attach after Class Setup mount auto-restores | **False in current code** unless remount/Connect/recover path runs |

### OS / browser / Electron differences

| Claim | Status |
| --- | --- |
| Windows wireless often needs explicit HID write after reboot ([S11][S10]) | Community MEDIUM |
| Electron HID permissions may be ephemeral without serial / persistence ([S04] + Electron chooser context behavior) | Platform MEDIUM — material for experiments; **not** established Q7 cause |
| macOS Chrome vs Electron 43.4.0 parity for this device | **UNVERIFIED** on Q7 candidate |

### Electron 43.4.0 WebHID issues material to CQS

Reviewed publicly:

- WebHID support and session handlers are long-landed ([S04]).
- Later Electron fixes (e.g. filtering discarded devices from chooser; collections
  support) exist on newer lines — **interesting**, not automatic upgrade
  authority.
- Ephemeral grant revocation on disconnect is a structural Chromium/Electron
  behavior to test on replug — **hypothesis H5 only**.

**Do not recommend upgrading Electron merely because a newer version exists.**
Any upgrade requires separate authority and causal evidence.

---

## Lower-authority anecdotal sources (do not drive claims alone)

| Source | Note |
| --- | --- |
| Emulator forums (PCSX2/RPCS3 wireless notes via PCGamingWiki) | Useful pointers; not CQS evidence |
| Unix Stack Exchange hidraw LED scripts | Framing anecdotes; platform-specific |
| Jack Carey buzz-controller.js / blog | WebHID LED demos; topology notes |

---

## Register maintenance

When a physical experiment row settles a claim, update:

1. this register’s **CQS independently verified?** column;
2. [`README.md`](README.md) verified vs hypothesis lists;
3. the experiment row result — never invent results in advance.
