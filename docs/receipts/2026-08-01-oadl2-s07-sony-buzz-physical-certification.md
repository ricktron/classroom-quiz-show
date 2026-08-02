# OADL2-S07 — Sony Buzz! physical certification (Lane C — keep-alive block)

| Field | Value |
| --- | --- |
| Evidence-state ID | `OADL2-S07-ES-1` |
| Parent authorization | `AUTHORIZE OADL2-S07-COMPLEX-REPAIR-AND-QA-PILOT` |
| Recovery authorization | `AUTHORIZE OADL2-S07-CORRECT-HOST-RECOVERY-AND-CONDITIONAL-CLONE` |
| Continuation authorization | `AUTHORIZE OADL2-S07-HANDSET-SYNC-AND-PHYSICAL-MATRIX-CONTINUATION` |
| Dates (local host) | 2026-08-01 (initial hard stop); 2026-08-02 (handset sync continuation) |
| Lane | **C — hardware / platform keep-alive block** (no runtime repair; no compatibility claim) |
| Repository | `ricktron/classroom-quiz-show` |
| Local root | `/Users/macdaddy/Documents/Coding/Cursor Projects/classroom-quiz-show` |
| Live base SHA | `5fe6eb39dd107c24e4ae1bad8d091cf5c83ed007` (`origin/main`) |
| Branch / PR | `fix/oadl2-s07-sony-buzz-certification` / [#29](https://github.com/ricktron/classroom-quiz-show/pull/29) |

## Verdict

Physical certification on the correct host **did not complete**. The wireless
receiver enumerates. Official Namtai pairing can produce visible RF success
(receiver LED flashes on handset press). Handsets nevertheless **power off /
become unresponsive** unless the host periodically writes a HID **output**
keep-alive to the `Wbuzz` receiver. With an external keep-alive probe, raw HID
input reports and Chrome Gamepad exposure were observed. The browser Gamepad API
**cannot** send that keep-alive. The four-handset / five-button capture matrix
and the CQS gameplay matrix were **not** completed under the docs-only Branch
Lease.

**No Sony Buzz! compatibility is claimed.**

## Authorization lineage

1. `AUTHORIZE OADL2-S07-COMPLEX-REPAIR-AND-QA-PILOT`
2. `AUTHORIZE OADL2-S07-CORRECT-HOST-RECOVERY-AND-CONDITIONAL-CLONE`
3. `AUTHORIZE OADL2-S07-HANDSET-SYNC-AND-PHYSICAL-MATRIX-CONTINUATION` (this session)

## Host environment

| Fact | Observed |
| --- | --- |
| `hostname` | `Ricks-MacBook-Air.local` |
| `whoami` | `macdaddy` |
| OS | macOS 26.5.1 (Build 25F80) |
| Browser | Google Chrome `151.0.7922.71` |
| CQS version (package) | `0.1.0` at live base `5fe6eb39…` |
| Clone | Existing clean clone; origin `https://github.com/ricktron/classroom-quiz-show.git` |
| Hub note | Initial work used Anker 332 USB-C hub; controlled retry used **direct USB-C** |

## Hardware enumeration

| Fact | Observed |
| --- | --- |
| USB product | `Wbuzz` |
| USB vendor string | `Namtai` |
| `idVendor` | `1356` (`0x054c`) |
| `idProduct` | `4096` (`0x1000`) |
| Transport | USB |
| HID Usage Page / Usage | `1` / `4` (Generic Desktop / Joystick) |
| Max input report size | `5` |
| Max output report size | `7` |

Receiver was absent at session start; after one owner unplug/replug it
re-enumerated. Remained present for subsequent probes.

## Observed hardware controls (not invented)

| Control | Observation |
| --- | --- |
| Receiver | Unlabeled side **BIND** button; blue LED (off until bind / activity) |
| Handset | Ridged side **POWER/LOCK** switch; no separate sync button |
| Handset LED | Blue LED near base; red buzzer can also flash during pairing |
| Markings | PlayStation symbol; handsets not numbered |

### Official Namtai LED / pairing meanings (FCC ID VZVBUZZ01 manual)

| Pattern | Meaning |
| --- | --- |
| Blue LED rapid flash ×8 | Powering **ON** |
| Blue LED slow flash ×4 | Powering **OFF** |
| Hold POWER 4 s until solid blue (all four), then hold receiver BIND | Re-pair all four |
| Success | Handset blue LED + red button flash; receiver LED flashes once per pair |
| Link test | Any button → handset **and** receiver blue LEDs flash briefly |
| LOCK position | Keeps powered handset from accidental power toggle |

## Four-handset synchronization matrix

| Handset | Powers on (8 blinks) | Sync attempted | Handset LED | Receiver LED | Red buzzer response |
| ------- | -------------------: | -------------: | ----------- | ------------ | ------------------- |
| 1 | yes | yes (official sequence) | solid blue during pair; then often dark | flashes during BIND / on successful test press | RF flash observed once after official pair; later unresponsive without keep-alive |
| 2 | yes | yes | same | same | same |
| 3 | yes | yes | same | same | same |
| 4 | yes | yes | same | same | same |

| Question | Result |
| --- | --- |
| Distinct player assignment LEDs? | Not observed as durable numbered assignment |
| All four connected simultaneously? | Pairing flashes yes; sustained usable link **no** without keep-alive |
| Survives brief idle? | **No** — handsets power off / go unresponsive after BIND without host output keep-alive |

## Raw-HID result

Bounded Swift/IOKit probes (temporary `/tmp` tools only; **no** CQS package install):

| Condition | Result |
| --- | --- |
| Open device, no keep-alive | Open OK; `IOHIDDeviceGetReport` len `0`; **0** input-report callbacks across long windows |
| Output keep-alive (`IOHIDDeviceSetReport` output, 7× `0x00`, every ~2 s) | Open OK; handsets stay on; input reports arrive |
| Report size | `5` |
| Idle / release pattern | `00 00 00 00 f0` |
| Example pressed patterns observed | `00 00 01 00 f0`, `00 00 10 00 f0`, `00 00 20 00 f0`, `00 00 00 80 f0`, `00 00 00 04 f0` |
| Distinguishable handsets? | **Likely** (distinct changed bits) — full stable map **not** certified |
| Community corroboration | PCGamingWiki / Mac HID helpers: wireless Buzz requires host write so controllers do not instantly turn off |

## Chrome Gamepad result

| Observation | Result |
| --- | --- |
| `typeof navigator.getGamepads` | `"function"` |
| Without keep-alive | Device often absent / presses `0` after handsets die |
| With external keep-alive | Device present: **`Wbuzz (Vendor: 054c Product: 1000)`** |
| Topology | **One** logical Gamepad (index `0`), not four devices |
| Button count / axes | **20** buttons, **2** axes, `mapping: ""` |
| Owner-confirmed Detected while keep-alive ran | Yes — red presses registered in probe UI |
| Complete structured 4×5 matrix | **Not completed** (interactive capture abandoned at owner request after UX friction; `Document & stop`) |
| Held / release / reconnect / reload / Chrome restart matrix | **Not completed** |

### Partial browser matrix (incomplete)

| Handset | Button | Browser device/index | Browser button index | Detected |
| ------- | ------ | -------------------- | -------------------: | -------: |
| 1–4 | Red / colors | `Wbuzz…` / `0` when keep-alive live | **Unverified map** | Partial only — full 20-cell table not recorded |

## CQS physical matrix

**Not run** in this continuation. Blocked on durable browser input without an
authorized in-app keep-alive path. Prior session already showed expected
no-controller Sony setup UI after teams-bearing import; that UI finding is
unchanged and is not a compatibility claim.

## Failure classifications

### F1 — Wireless keep-alive required (primary)

| Field | Value |
| --- | --- |
| Class | `LOCAL_ENVIRONMENT_FAILURE` / platform HID contract gap (not CQS Gamepad dispatch bug) |
| Evidence | Official pair → visible RF; without output writes handsets die; with 7-byte zero output keep-alive, HID reports + Chrome `Wbuzz` exposure |
| Confidence | High |
| Competing explanations | Exhausted for “dead batteries / never paired”: batteries present; official pair LEDs observed |
| Repair | **Not ordinary application repair** under docs-only lease. Requires owner decision on WebHID (or other) output keep-alive vs out-of-band helper vs defer wireless |

### F2 — Full certification matrices incomplete

| Field | Value |
| --- | --- |
| Class | `UNKNOWN` for app correctness; **blocked** for certification |
| Evidence | 4×5 browser matrix and CQS gameplay matrix not completed |
| Confidence | High that certification is incomplete |
| Repair | Lane C stop — no runtime mutation |

## Application defect found?

**No attributable CQS application defect was isolated.** Chrome can expose the
receiver once keep-alive is supplied externally; CQS was not exercised on a
complete matrix. The current docs-only Branch Lease does **not** authorize
WebHID/runtime keep-alive work.

## Repair performed

None in application code. Documentation/receipt update only.

## Compatibility claim

**None.** Explicit non-claim for wired and wireless Sony Buzz! on this
host/browser/CQS version.

## Branch Lease (docs continuation)

| Field | Value |
| --- | --- |
| Branch | `fix/oadl2-s07-sony-buzz-certification` |
| Base | `5fe6eb39dd107c24e4ae1bad8d091cf5c83ed007` |
| Owned paths | this receipt; `docs/STATUS.md`; `docs/handoff/CURRENT.md`; `docs/architecture/ADR-010-sony-buzz-profile-and-setup.md` |
| Forbidden | runtime/code, tests, lockfiles, `.github/**`, NightWatch, S08, merge |

## Explicit non-claims

- Does not mark Slice 10 incomplete.
- Does not authorize WebHID, native bridges, drivers, or dependency changes.
- Does not register S07 in NightWatch.
- Does not authorize merge or S08.
- Does not claim a complete button-index map or CQS gameplay certification.
