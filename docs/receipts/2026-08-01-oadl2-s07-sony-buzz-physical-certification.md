# OADL2-S07 — Sony Buzz! physical certification (serial matrix + CQS stop)

| Field | Value |
| --- | --- |
| Evidence-state ID | `OADL2-S07-ES-1` |
| Parent authorization | `AUTHORIZE OADL2-S07-COMPLEX-REPAIR-AND-QA-PILOT` |
| Recovery authorization | `AUTHORIZE OADL2-S07-CORRECT-HOST-RECOVERY-AND-CONDITIONAL-CLONE` |
| Continuation authorization | `AUTHORIZE OADL2-S07-HANDSET-SYNC-AND-PHYSICAL-MATRIX-CONTINUATION` |
| Retry authorization | `AUTHORIZE OADL2-S07-SERIAL-HARNESS-AND-CQS-MATRIX-RETRY` |
| Dates (local host) | 2026-08-01 (initial); 2026-08-02 (sync, serial harness, CQS attempt) |
| Lane | **C — platform keep-alive + incomplete CQS certification** (docs-only; no compatibility claim) |
| Repository | `ricktron/classroom-quiz-show` |
| Local root | `/Users/macdaddy/Documents/Coding/Cursor Projects/classroom-quiz-show` |
| Live base SHA | `5fe6eb39dd107c24e4ae1bad8d091cf5c83ed007` (`origin/main`) |
| Branch / PR | `fix/oadl2-s07-sony-buzz-certification` / [#29](https://github.com/ricktron/classroom-quiz-show/pull/29) |
| Tested CQS commit | docs branch head on `5fe6eb39…` base (runtime unchanged) |

## Verdict

On this tested macOS/Chrome configuration, periodic seven-byte HID output
reports from a **temporary external helper** kept paired Namtai wireless
handsets responsive and enabled raw-HID and browser Gamepad input. The Gamepad
API reads browser-exposed controller state but cannot send arbitrary HID output
reports. Chrome WebHID may support explicit HID output reports, but **no WebHID
implementation was authorized or tested**.

A corrected **serial** human-operated browser harness captured all twenty
physical controls (press + release) with unique browser button indices `0`–`19`.
Physical handsets were later labeled **A–D** and bound to the four established
red-index groups via one Red press each. The earlier overlapping-prompt harness
failure was harness concurrency/auto-advance, **not** a controller-detection
failure.

CQS guided setup became reachable after a **teams-bearing** import. Operator
**Stop** ended testing before complete CQS capture / test-mode / gameplay
matrices. **No Sony Buzz! compatibility is claimed.**

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
| Browser | Google Chrome `151.0.7922.71` |
| CQS version (package) | `0.1.0` at live base `5fe6eb39…` |
| Clone | Existing clean clone; origin `https://github.com/ricktron/classroom-quiz-show.git` |
| Temporary harness root | `/private/tmp/oadl2-s07-serial-retry/` (not committed) |

## Hardware enumeration

| Fact | Observed |
| --- | --- |
| USB product | `Wbuzz` |
| USB vendor string | `Namtai` |
| `idVendor` / `idProduct` | `1356` / `4096` (`0x054c` / `0x1000`) |
| Max input / output report size | `5` / `7` |

## Keep-alive (temporary external helper)

| Fact | Observed |
| --- | --- |
| Mechanism | Swift/IOKit `IOHIDDeviceSetReport` output, **7** zero bytes, ~**2 s** interval |
| Result on this host | Writes succeeded (`status=0`); handsets remained responsive; input reports observed |
| Permanent product architecture | **Unverified** — exact minimum cadence and cross-platform requirement not claimed |

Bounded claim:

> On this tested macOS/Chrome configuration, periodic HID output reports from
> the temporary helper kept the paired handsets responsive and enabled input
> observation.

## Prior harness root cause (overlapping prompts)

The previous `/tmp` matrix used (a) an in-page capture loop that **auto-advanced**
on rising edge without Accept, and (b) blocking native `osascript` dialogs from
Playwright. Page text could show the next cell (e.g. Orange) while a native
dialog still named the previous cell (e.g. Blue). Two result artifacts also
indicated multiple harness invocations. Replacement serial harness: one in-page
prompt, Accept/Retry required, single-instance server lock, no native matrix
dialogs.

## Complete serial browser matrix

| Observation | Result |
| --- | --- |
| Gamepad | One device: `Wbuzz (Vendor: 054c Product: 1000)`, index `0` |
| Topology | 20 buttons, 2 axes, empty mapping token |
| Reliability gate | Controller Red (then labeled group red-0) detected **3/3** at browser button **0** |
| Full matrix | **20/20** accepted with press + release timestamps |
| Unique indices | **Yes** — `0`–`19` all used once |
| Contiguous groups | Yes — four blocks of five |

### Color → browser index within each red group

| Physical | Indices relative to group red R |
| --- | --- |
| Red | R |
| Yellow | R+1 |
| Green | R+2 |
| Orange | R+3 |
| Blue | R+4 |

### Label binding (A–D) — red presses only

Owner clarification: an earlier “Controller 1 Red → index 15” observation was
Rick pressing a **different physical handset**, not index instability. Labels
A–D were then bound:

| Label | Red browser index | Established color group |
| ----- | ----------------: | ----------------------- |
| A | 0 | 0–4 (Y1 G2 O3 B4) |
| B | 10 | 10–14 |
| C | 5 | 5–9 |
| D | 15 | 15–19 |

Session log: `/private/tmp/oadl2-s07-serial-retry/logs/` (uncommitted).

### Browser lifecycle (operator)

Operator selected **All lifecycle checks OK** for reload / tab background /
focus / unplug-replug / idle-wake / Chrome restart while the temporary helper
remained active. JSONL recorded visibility/focus and at least one
`gamepadconnected` event. Helper restart was **not** required in that operator
report. Mappings are session-local in CQS and were not under test in the raw
browser harness.

## CQS physical matrix (partial — operator Stop)

| Step | Result |
| --- | --- |
| Host route | `#/host` required (`Open Host`) |
| `Initialize sample game` | Loads **0-team** foundation sample → Controllers / Sony Buzz section **does not render** (`teams.length === 0` early return) |
| Category-board sample import | Controllers + `Sony Buzz! setup (session-local)` appear; stock sample has **2** teams |
| Runtime 4-team import (UI only) | Blue Basalts, Red Rhyolites, Green Granites, Yellow Schists — setup visible |
| Wbuzz in controller surface | Operator confirmed after wake press with helper active |
| A1 Handset team | Blue Basalts selected (Done) |
| A2–A8 / B–D guided capture | **Not completed** — operator **Stop** |
| Test mode / gameplay / keyboard matrices | **Not completed** |

### Setup-path observation (not a completed defect isolation)

A reasonable teacher who only clicks **Initialize sample game** never sees
Controllers / Sony Buzz setup, because that sample has no teams. Certification
required a teams-bearing import (category-board sample, then a temporary
4-team JSON edit in the import textarea). This is recorded as a **setup-path /
usability observation**. No runtime mutation was authorized; no APPLICATION
defect was formally isolated before Stop.

## Failure classifications

### F1 — Wireless keep-alive platform requirement

| Field | Value |
| --- | --- |
| Class | `OS_OR_HID_FAILURE` / unresolved platform integration requirement |
| Evidence | Without output writes, handsets die; with temporary 7-byte output keep-alive, raw HID + Chrome Gamepad work on this host |
| Not used | `LOCAL_ENVIRONMENT_FAILURE` merely because a helper is required |

### F2 — CQS certification incomplete

| Field | Value |
| --- | --- |
| Class | `UNKNOWN` for full app correctness; certification **incomplete** |
| Evidence | Operator Stop before complete guided capture / test mode / gameplay |

## Application defect found?

**No attributable CQS runtime defect was isolated** against the stable browser
matrix. CQS matrices were not completed. A setup-path usability observation
(Controllers hidden for 0-team foundation sample) is noted above but was not
promoted to a Branch Lease amendment in this docs-only slice.

## API distinction (evidence-bounded)

| Path | Status in this slice |
| --- | --- |
| Gamepad API | Reads browser-exposed state; **cannot** send arbitrary HID output reports |
| Chrome WebHID | May support HID output; **not authorized / not tested** |
| Temporary external helper | Demonstrated HID output writes on this host + receiver |

## Compatibility claim

**None.** Explicit non-claim for wired and wireless Sony Buzz! on this
host/browser/CQS version. Any future claim must name wireless Namtai
`Wbuzz` `054c:1000`, this Mac class, observed macOS/Chrome versions, the
external or in-product keep-alive requirement, the tested CQS commit, exact
behaviors, and remaining limits.

## Branch Lease (docs continuation)

| Field | Value |
| --- | --- |
| Branch | `fix/oadl2-s07-sony-buzz-certification` |
| Base | `5fe6eb39dd107c24e4ae1bad8d091cf5c83ed007` |
| Owned paths | this receipt; `docs/STATUS.md`; `docs/handoff/CURRENT.md`; `docs/architecture/ADR-010-sony-buzz-profile-and-setup.md` |
| Forbidden | runtime/code, tests, lockfiles, `.github/**`, NightWatch, S08, merge, WebHID, permanent native helper |

## Explicit non-claims

- Does not mark Slice 10 incomplete.
- Does not authorize WebHID, native bridges, drivers, or dependency changes.
- Does not register S07 in NightWatch.
- Does not authorize merge or S08.
- Does not claim CQS gameplay certification or a permanent keep-alive architecture.
