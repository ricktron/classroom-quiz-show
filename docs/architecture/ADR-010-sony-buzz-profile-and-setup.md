# ADR-010 — Sony Buzz! candidate profile, capture recipe, and host setup UX

- **Status:** Accepted for the hardware-independent portion (Slice 10);
  **`Complete`** after PR #21 squash-merge and post-merge reconciliation —
  OADL2-S07 recorded a **bounded** physical claim under a temporary external
  keep-alive; permanent keep-alive architecture remains unresolved
- **Date:** 2026-07-27
- **Slice:** 10 — Sony Buzz! mapping, validation & host setup UX
- **Depends on:** [ADR-002](ADR-002-state-event-sync-core.md),
  [ADR-004](ADR-004-canonical-validation-import.md),
  [ADR-007](ADR-007-timers-arming-transitions.md),
  [ADR-008](ADR-008-local-input-keyboard-buzz.md),
  [ADR-009](ADR-009-generic-gamepad-adapter.md),
  [`ROADMAP-AMENDMENT-001`](../decisions/ROADMAP-AMENDMENT-001-local-buzzers.md)
- **Supersedes:** nothing. Narrows ADR-009's snapshot fields for **host-private
  observation only**; does not weaken ADR-009's privacy boundary for gameplay,
  commands, events, `PublicState`, sync, or the projector.

## Context

Slice 9 shipped a generic Gamepad adapter with session-local mappings and
deliberately **no** device recognition, colour profile, handset grouping, or
setup wizard. Slice 10 is authorized to add those host-private surfaces — but
**no physical Sony Buzz! controller is available** during this implementation
phase. Therefore this ADR records a hardware-independent design that:

- can classify a browser-reported identifier as a **candidate** using
  primary-source USB vendor/product facts only;
- can capture a recommended handset profile from **observed**
  `controllerIndex + buttonIndex` values;
- can exercise a non-gameplay test mode;
- must **not** invent macOS/Chrome button indices, claim detection of a physical
  unit, or claim wired/wireless compatibility.

### Known hardware facts (primary source)

| Fact | Value |
| --- | --- |
| Sony USB vendor ID | `054c` |
| Wired Buzz product ID | `0002` |
| Wireless Buzz product ID | `1000` |
| Physical layout (motivating) | large red buzzer + blue, orange, green, yellow |

### Unknown facts (deferred physical certification)

| Unknown | Why it matters |
| --- | --- |
| Exact `Gamepad.id` string on the owner's macOS/Chrome | Format is unspecified; candidate detection must tolerate several token shapes |
| Whether the unit appears as one Gamepad or several | Capture must work for both topologies |
| Browser button indices for each colour | **Must not be hard-coded**; captured per session |
| Whether all 20 controls are visible | Cannot be claimed without physical observation |
| Wired and/or wireless behaviour on this machine | Cannot be claimed without physical observation |

## Decision

### 1. Narrow host-private identity extension

`src/input/gamepadSource.ts` remains the only module that may touch a browser
`Gamepad`. The bounded snapshot now carries, per controller:

- `controllerIndex`
- frozen `pressed[]` (button count = length)
- `reportedId` — bounded string or explicit `unavailable`
- `reportedMapping` — `'' | 'standard' | 'xr-standard'` or explicit `unavailable`

Malformed, empty, oversized, or non-WebIDL values fail closed to `unavailable`.
No serial number, Bluetooth address, axis, analog value, timestamp, haptic, or
HID report is read. The raw browser object never crosses the boundary.

### 2. `Gamepad.id` is observation evidence, not durable identity

The reported identifier is host-private diagnostics input. It is:

- not persisted;
- not a gameplay identity;
- not a field of `GamepadMapping`;
- not present on `LocalInputSignal`, commands, events, private gameplay state,
  replay results, `PublicState`, sync messages, or the display DOM.

A controller index remains a session-local locator (ADR-009 §8).

### 3. Candidate versus validated classification

`src/input/gamepadDeviceProfile.ts` classifies an observation as one of:

- `candidate-sony-buzz-wired` — standalone hex tokens `054c` and `0002`
- `candidate-sony-buzz-wireless` — standalone hex tokens `054c` and `1000`
- `unrecognized` — identity present but not those pairs
- `identity-unavailable` — no usable reported id

A VID/PID match is a **candidate**, never compatibility proof. Absence of tokens
does not prove the device is *not* a Buzz controller. Name-only strings
(“Sony”, “Buzz”, “Hub”, “Logitech”, “joystick”) are never sufficient. Copy must
never say supported, compatible, certified, validated, or guaranteed.

No production positive signature based on the owner's physical device may be
added before physical observation.

### 4. Capture-based recommended profile — no hard-coded browser indices

`src/input/sonyBuzzProfile.ts` defines a **capture recipe**, not an index table:

| Physical prompt (text label) | Logical action |
| --- | --- |
| Large red buzzer | `{ kind: 'primary-buzz' }` |
| Blue button | `{ kind: 'secondary', slot: 'secondary1' }` |
| Orange button | `{ kind: 'secondary', slot: 'secondary2' }` |
| Green button | `{ kind: 'secondary', slot: 'secondary3' }` |
| Yellow button | `{ kind: 'secondary', slot: 'secondary4' }` |

Each prompt records the **observed** current-session control. One-device and
multi-device topologies both work because the recipe never assumes a fixed
controller index. Handset → team association is always **explicit**. Staged
bindings are validated through the existing Gamepad mapping discipline
(`validateGamepadMapping`); incomplete, duplicate, malformed, unknown-team, or
conflicting results are refused. Nothing steals or silently overwrites an
existing control. Staged state is session-local until explicit Apply; Discard
leaves the active mapping unchanged.

### 5. Setup test mode bypasses gameplay dispatch

`useGamepadBuzzInput` remains the **sole** polling lifecycle owner. An explicit
`testMode` flag:

- consumes fresh rising edges;
- resolves them against the **applied** mapping;
- reports team + logical action to the host setup surface;
- does **not** call `translateLocalInput`, dispatch, append an event, interrupt a
  timer, alter a buzz queue, change a revision, change a score, or select/reveal
  content.

Entering and leaving test mode re-primes. A button held across the transition
requires release and a new press. Capture, enable/disable, mapping, focus, blur,
and visibility transitions continue to re-prime as in ADR-009. Gate changes that
affect enable/capture/test-mode/mapping clear the baseline **synchronously during
the render that publishes the new gate** into the poll owner’s `latest` ref, so a
`requestAnimationFrame` tick between commit and the passive effect cannot treat a
just-pressed or held button as a fresh gameplay edge.

### 6. One-polling-owner rule

No second hook, loop, scheduler, singleton, service, or `requestAnimationFrame`
owner is introduced. The Sony setup section is a bounded child of
`GamepadInputHostPanel` and receives edges from the existing poll path.

### 7. Session-local mapping lifetime

Applied Gamepad mappings — including those produced by Apply — remain
session-local host configuration. They do not enter localStorage, IndexedDB, a
game file, export, sync, or public state. The setup UI states this plainly.

### 8. Privacy boundary

Device identity, classification, profile staging, capture state, test-mode
observations, controller indices, and button indices are host-private. The
projector must never call the Gamepad API and must never contain Sony, Buzz,
candidate, profile, handset, device identifier, VID/PID, controller index,
button index, mapping, capture, or diagnostic information from this surface.

### 9. CI evidence versus owner-only physical evidence

| Evidence class | What it proves | What it does not prove |
| --- | --- | --- |
| Unit/component tests with fake sources | Rising edges, staging, apply/discard, test mode, privacy | Physical detection |
| Playwright with `page.addInitScript` gamepad simulation | Setup UX and projector privacy in a real browser | Physical compatibility |
| Owner physical matrix (pending) | Real hardware behaviour on the owner's machine | Nothing CI can substitute |

## Alternatives considered

**Hard-coding Sony browser button indices from public forum posts.** Rejected:
unverified for this repository's target browser/OS, and the slice forbids inventing
them.

**Treating VID/PID match as “supported”.** Rejected: candidate ≠ validated.

**Persisting profiles.** Rejected for this slice: controller indices are not
stable across reload; storage impact remains none (roadmap); Slice 13 owns
persistence.

**A second polling loop for setup.** Rejected: duplicate loops fabricate races
and break the ADR-009 lifecycle proof.

**Deriving team from controller index.** Rejected: silent misattribution.

## Consequences

**Good.** Teachers get a calm host setup surface that can classify candidates,
capture a five-button handset profile without hard-coded indices, preview/apply
or discard, and test mappings without touching gameplay. Keyboard remains the
permanent fallback. Domain, protocol, scoring, timers, queues, and projector
privacy are unchanged.

**Costs and limits.** Browser button indices were unknown at Slice 10 design
time and must remain capture-based. Wired Buzz was not tested in OADL2-S07.
Wireless operation on this host required a temporary external HID output
keep-alive; permanent product architecture for that keep-alive is unresolved.
Slice 10 remains **Complete** for the owner-accepted hardware-independent scope
after PR #21 squash-merge (`5575be3` from reviewed head `2885933`) and
post-merge reconciliation.

## Physical certification (owner) — OADL2-S07

**2026-08-01/02 OADL2-S07 (Lane C — bounded claim under temporary keep-alive).**
On the correct host (`macdaddy` / `Ricks-MacBook-Air.local`), a wireless Namtai
`Wbuzz` receiver (`054c` / `1000`) enumerates. On this tested macOS/Chrome
configuration, periodic seven-byte HID **output** reports from a temporary
external helper kept paired handsets responsive and enabled raw-HID, browser
Gamepad input, and Playwright-assisted CQS matrices. The Gamepad API cannot send
arbitrary HID output reports; Chrome WebHID was not authorized or tested. A
corrected serial harness captured all twenty physical buttons (unique indices
`0`–`19`) and bound labeled handsets A–D to red indices `0` / `10` / `5` /
`15`. CQS guided setup requires a teams-bearing game (the foundation sample has
zero teams) and an advanced category-board round for local-input/timer panels.
Playwright-assisted CQS completed guided setup A–D, test mode, primary-Red
gameplay (including hold/rising-edge and simultaneous A+B ordering), and
keyboard fallback. Session-local mappings are lost on reload. Hot-plug recovery
without restarting the temporary helper was not shown. Exact minimum keep-alive
cadence and permanent product architecture remain unverified. Durable evidence:
[`../receipts/2026-08-01-oadl2-s07-sony-buzz-physical-certification.md`](../receipts/2026-08-01-oadl2-s07-sony-buzz-physical-certification.md).

Remaining owner/product decisions before any **broader** supported-hardware
list:

1. Decide permanent wireless keep-alive (out-of-band helper vs separately
   authorized WebHID/output path).
2. Repeat matrices for wired Buzz (`0002`) and any other OS/browser targets.
3. Decide whether hot-plug recovery is in scope for the chosen keep-alive path.

## Explicit non-goals (this phase)

No WebHID, Bluetooth pairing UX, USB drivers, haptics, axes, analog tuning,
persistent mappings, phone/networked buzzers, secondary-action gameplay, scoring
changes, schema/`PublicState`/protocol changes, Slice 11 media work, or any
compatibility claim beyond the bounded OADL2-S07 receipt.
