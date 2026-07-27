# ADR-009 — The generic Gamepad adapter, polling isolation, and configurable button mappings

- **Status:** Accepted (Slice 9)
- **Date:** 2026-07-27
- **Slice:** 9 — Generic Gamepad adapter & configurable mappings
- **Depends on:** [ADR-002](ADR-002-state-event-sync-core.md) (command/event core,
  allow-list sanitizer, undo as an append-only marker),
  [ADR-003](ADR-003-game-round-model-registry.md) (application-only registration,
  explicit known/unknown, no dynamic import),
  [ADR-004](ADR-004-canonical-validation-import.md) (untrusted input, no coercion,
  no silent repair, structured issues),
  [ADR-006](ADR-006-teams-and-scoring.md) (teams as authored content),
  [ADR-007](ADR-007-timers-arming-transitions.md) (the clock boundary, manual
  arming, the typed interruption seam),
  [ADR-008](ADR-008-local-input-keyboard-buzz.md) (the local input boundary, the
  logical action vocabulary, the buzz queue, the mapping discipline),
  [`ROADMAP-AMENDMENT-001`](../decisions/ROADMAP-AMENDMENT-001-local-buzzers.md)
  §5.6
- **Supersedes:** nothing

## Context

Slice 8 built a hardware-independent local-input boundary and put one adapter
behind it: the keyboard. It was explicitly built so that a second adapter would be
an ADDITION rather than a rewrite. Slice 9 is the test of that claim.

A generic USB controller is a genuinely different kind of input from a keyboard,
and exactly one difference matters:

> **A keyboard has EVENTS. The Gamepad API has POLLED STATE.**

`keydown` fires once when a key goes down. `navigator.getGamepads()` reports a
button as `pressed: true` on every frame for as long as it is held, and there is
no "button went down" event at all. Every hard problem in this slice follows from
that one fact: the adapter has to manufacture the press edge itself, and it must
do so in a way that cannot fabricate one — because a fabricated press is a team
buzzing in when nobody touched anything, in front of a class.

The second constraint is the roadmap's: Slice 9's impact is recorded as *schema
no · runtime yes · UI yes (diagnostics) · storage no · hardware yes (generic USB
gamepads)*, and Sony-specific detection, button numbering, colour mappings,
handset assignment and setup UX are Slice 10's. So this slice must be generic in
a way that is structurally enforced rather than merely intended.

### The browser contract this is written against

Verified directly, not from memory. Two primary sources were available in the
sandbox; external documentation hosts are blocked by the network policy.

1. **The WebIDL that ships with TypeScript 5.9** (`lib.dom.d.ts`):
   - `navigator.getGamepads(): (Gamepad | null)[]` — "Elements in the array may
     be `null` if a gamepad disconnects during a session, so that the remaining
     gamepads retain the same index."
   - `Gamepad`: `index: number`, `id: string`, `connected: boolean`,
     `timestamp: DOMHighResTimeStamp`, `mapping: "" | "standard" | "xr-standard"`,
     `axes: ReadonlyArray<number>`, `buttons: ReadonlyArray<GamepadButton>`,
     `vibrationActuator`.
   - `GamepadButton`: `pressed: boolean`, `touched: boolean`, `value: number`.
   - `gamepadconnected` / `gamepaddisconnected` are `Window` events carrying a
     `GamepadEvent`.
2. **The Chromium build this repository tests against** (141, headless), probed
   directly with no controller attached:
   - `typeof navigator.getGamepads === 'function'`;
   - it returned a length-4 array of four `null`s;
   - it returned a **new array object on every call**;
   - `'ongamepadconnected' in window` was **`false`** even though `getGamepads`
     was present.

That last observation is why support is feature-detected on `getGamepads` alone.
Detecting on the event-handler property would have reported "unsupported" on a
browser that plainly supports it.

## Decision

### 1. The same narrow waist, one member wider

```text
physical device            a generic USB controller
  ↓ browser API            navigator.getGamepads()          ── host-private
browser boundary           src/input/gamepadSource.ts       ── host-private
  ↓ bounded snapshot       GamepadSnapshot (index + booleans)
local input adapter        src/input/gamepadAdapter.ts      ── host-private
  ↓ logical action         LocalInputSignal — team + action + evidence
command translation        src/input/commandTranslation.ts  ── UNCHANGED
  ↓ validated command      RECORD_TEAM_BUZZ                 ── UNCHANGED
planner                    armed? open? known team? duplicate? stale?  ── UNCHANGED
  ↓ accepted fact
append-only event          TEAM_BUZZED (+ RESPONSE_TIMER_INTERRUPTED)  ── UNCHANGED
  ↓ replay
reducer-derived queue      BuzzQueueState — order from `seq`           ── UNCHANGED
  ↓ allow-list sanitizer
sanitized public state     PublicBuzzState                             ── UNCHANGED
```

Everything from "command translation" down is untouched, and that is the point of
the slice. `LOCAL_INPUT_SOURCE_KINDS` gained `'gamepad'`; nothing else in the
chain moved.

**What was NOT added:** no dynamic adapter registration, no imported-content
registration, no plugin loading, no parallel command path, no Gamepad-shaped
command or event, no Gamepad field in private gameplay state, no Gamepad field in
`PublicState`.

**A member and its adapter arrive together.** `'gamepad'` was added in the same
change as `gamepadAdapter.ts`, exactly as `'keyboard'` was. A source kind with no
adapter would be a speculative entry, which ADR-004 forbids.

### 2. The domain cannot represent a controller

Structurally, not by convention. Nothing above `gamepadSource.ts` can hold a
browser `Gamepad` or `GamepadButton`, and the snapshot model has no field for:

| Browser exposes | In the snapshot? |
| --- | --- |
| `Gamepad.id` (device name, vendor/product text) | **no** |
| `Gamepad.mapping` | **no** |
| `Gamepad.axes` | **no** |
| `Gamepad.timestamp` | **no** |
| `Gamepad.vibrationActuator` | **no** |
| `GamepadButton.touched` | **no** |
| `GamepadButton.value` (analog) | **no** |
| `Gamepad.index` | yes — as a bounded integer |
| `GamepadButton.pressed` | yes — as a boolean |

A `GamepadSnapshot` is a frozen list of `{ controllerIndex, pressed[] }`. Below
that line lives every browser object; above it lives two small integers and some
booleans, and then not even those.

### 3. The source is injectable, and reading is total

`GamepadSource.read()` returns a discriminated result — `ok` with a snapshot,
`unsupported`, or `unreadable` — and never throws. Three different failures are
three different, typed, host-visible states, and **none of them can produce a
press**.

The browser's return value is treated as **untrusted input**, exactly as a pasted
game file is (ADR-004). `null` holes are skipped; a non-object entry is skipped;
`connected !== true` is skipped; a malformed `index` drops the controller rather
than being renumbered onto its array position (guessing a locator is how a press
ends up attributed to the wrong team); a duplicate index keeps the first; a
malformed `buttons` list reads as zero buttons; only an exact `pressed === true`
counts; and both index spaces are bounded (`MAX_GAMEPAD_CONTROLLER_INDEX = 15`,
`MAX_GAMEPAD_BUTTON_INDEX = 31`, `MAX_GAMEPAD_CONTROLLERS = 8`), so a hostile
value produces a clean truncation rather than an unbounded loop.

Production reads the browser. **Every unit test injects a fake**, so not one test
in this repository needs a browser or a physical controller.

### 4. Polling is owned by one host component, and it is injectable too

Polling happens in exactly one `useEffect`, in one host-only hook
(`src/host/useGamepadBuzzInput.ts`). It is the sibling of `useResponseTimerExpiry`
(the one scheduled clock read) and `useKeyboardBuzzInput` (the one place a
`KeyboardEvent` is touched).

Polling may **not** happen in the reducer, during render, in the sanitizer, during
replay, in command planning, or **on the display route** — the projector has no
Gamepad code of any kind and never calls `navigator.getGamepads`, which is
asserted by instrumenting the display page in `tests/e2e/gamepad-input.spec.ts`
rather than by trusting the layering.

There is deliberately **no global polling service**, no module-level loop and no
singleton. A loop that outlives its component is a loop that keeps dispatching
into a store nobody is watching. The loop is registered once, guarded against a
second registration, and stopped on unmount.

The SCHEDULER is a parameter. Production is one `requestAnimationFrame` loop —
chosen over a timer because the browser already throttles frames in a hidden tab,
which is exactly the wanted behaviour. Tests inject a driver they step by hand, so
every polling test is exact and instant rather than frame-timed.

`clock.now()` is read once per genuine input edge, at the dispatch edge (ADR-007
§1). **A poll that produces no edge reads no clock at all**, so polling adds no
clock read to the reducer, the replay path or the timer.

### 5. Rising edges, and the baseline rule that carries the whole safety story

| previous | current | result |
| --- | --- | --- |
| not pressed | pressed | **one** input |
| pressed | pressed | nothing — a held button never repeats |
| pressed | not pressed | nothing, and that control is rearmed |
| not pressed | not pressed | nothing |
| *no previous observation* | anything | **nothing** — baseline only |

The last row is load-bearing. A controller whose button is already held when it
first becomes visible must not buzz — and "first becomes visible" is exactly what
a connect, a reconnect, an enable, a mapping change, a capture completing, a tab
becoming visible again and a window regaining focus all produce.

So all of them are made into the SAME case: they **re-prime**, meaning the
baseline is dropped and the next poll is a baseline-only poll. A release followed
by a fresh press is then required. One rule, one implementation, no per-transition
special cases to get individually wrong.

Re-priming happens on: enable, disable, a mapping change, capture starting,
capture ending, `gamepadconnected`, `gamepaddisconnected`, `visibilitychange`,
window `focus`, window `blur`, and after any failed read.

**Disconnect needs no special handling beyond this.** A controller absent from a
snapshot is dropped from the baseline and emits nothing, so no event can be
appended merely because a controller appeared or disappeared. A controller whose
button COUNT changed between polls is re-baselined rather than compared
position-by-position against a differently-shaped list.

### 6. Deterministic order within one poll, and no fairness claim

One poll can see several fresh edges at once. They are processed in a fixed,
documented order:

1. ascending controller index, then
2. ascending button index.

This is a **tie-break rule, not a fairness claim**. Nothing here can distinguish
which of two presses inside one frame physically happened first, and this slice
does not pretend otherwise. It is the same position ADR-008 §13 took for
keyboard ties: the authoritative accepted order is the event log's monotonic
`seq`, and `observedAt` is arrival EVIDENCE that is never the tiebreaker.

### 7. The generic mapping model

A binding is a physical control, a team, and a logical action — the same
three-part separation the keyboard mapping uses, with the physical part swapped
and nothing else touched:

| | Keyboard (Slice 8) | Gamepad (Slice 9) |
| --- | --- | --- |
| Physical identity | `code` (`KeyboardEvent.code`) | `controllerIndex` + `buttonIndex` |
| Team | `teamId` | `teamId` — unchanged |
| Meaning | `LocalInputAction` | `LocalInputAction` — unchanged |

Validation follows ADR-004's discipline: every problem is a structured issue
addressed to the exact binding index, and nothing is repaired, coerced, dropped or
silently overwritten. The issue codes are `malformed-controller-index`,
`malformed-button-index`, `duplicate-control`, `unknown-team`,
`duplicate-team-primary`, `malformed-action` and `too-many-bindings`.

**`withGamepadControlForTeamAction` does not steal a control another team holds.**
It replaces that team's binding for that action and leaves the conflict for
validation to report, so a teacher is told about a clash instead of having
somebody else's button silently reassigned.

**There is deliberately NO default mapping.** A default would have to assume which
button of which controller means "buzz", and that assumption is precisely the
model-specific knowledge this slice may not invent. A teacher assigns buttons by
pressing them, or nothing is bound.

**"One primary per team" is within the Gamepad mapping.** A team may hold a buzz
key AND a controller buzz button at the same time — different adapters, both
feeding the same queue. The validator cannot see the keyboard mapping at all, so
this is structural.

**"Controller not attached" and "controller has no such button" are NOT validation
failures.** A mapping made while a controller was plugged in must survive it being
unplugged; those are resolution facts the adapter observes (the binding simply
never fires, and the host panel says no controller is connected).

### 8. Mapping lifetime: session-local, and controller indices are not identities

The roadmap records Slice 9's storage impact as **none**, so a Gamepad mapping is
host configuration for the current page only. There is **no** `localStorage` key,
no IndexedDB, no export, no game-file field, and nothing synced to the projector.
**A Gamepad mapping is lost when the host tab reloads**, and the host panel says
so in words rather than leaving a teacher to discover it.

That boundary is easy to hold because of what a controller index actually is: a
session-local locator that the browser auto-increments. It is **not** stable
across a reload, a browser restart, a disconnect/reconnect, a USB port change, an
operating system or a browser version. Persisting one would be persisting a number
that means something different tomorrow — a mapping that silently points at the
wrong team is worse than no mapping.

The browser-reported device `id` is **not read anywhere** and is never used as
gameplay identity. Controllers are labelled neutrally — "Controller 1" — which is
honest about being a session-local ordinal and cannot acquire a vendor vocabulary.

Slice 13 owns persistence; Slice 10 owns setup UX. Neither is broadened here.

### 9. Buttons only

Slice 9 maps **buttons**. It does not map axes, sticks, triggers as analog ranges,
motion, vibration or haptics, and it adds no analog threshold tuning. A physical
input becomes actionable only through a mapped button press, and `pressed` is read
strictly — a truthy value that is not exactly `true` is not a press.

### 10. Game semantics are unchanged

A translated Gamepad primary buzz behaves EXACTLY like a keyboard primary buzz,
because downstream it *is* one: same signal shape, same translator, same command,
same planner, same event. Accepted only while the response opportunity is armed
and legal; first accepted team becomes active; later accepted teams enter the
ordered queue; duplicate team presses are rejected; the first accepted buzz
interrupts the timer through Slice 7's existing seam; promotion after
incorrect/pass is unchanged; a rejected input changes nothing; replay and undo are
unchanged; and **no Gamepad press changes a score**.

No Gamepad-specific command, event, queue, timer transition or rejection policy
was added.

### 11. Secondary actions remain inert

A generic mapping may bind `secondary1`…`secondary4`, and the host UI offers them.
They terminate at the existing typed `unsupported-action` rejection in command
translation, so no secondary action appends an event, modifies state, adjusts a
score, selects an answer, reveals content or controls a timer.

This is readiness for future hardware, not implementation of a future game mode —
`ROADMAP-AMENDMENT-001` §5.1's "no speculative contract without its first
consumer", applied exactly as ADR-008 §3 applied it.

### 12. Host diagnostics, and what they deliberately do not show

The host panel shows: whether the browser offers the API; whether input is
switched on; how many controllers are visible with neutral labels and button
counts; which team and action each mapped button represents; mapping validity and
conflicts; and the outcome of the most recent press (accepted, ignored,
untranslated or refused) with a sentence for every reason.

It shows **no live button state**. Diagnostics are emitted only when the STABLE
picture changes — availability, which controller indices exist, how many buttons
each has. A per-frame display would repaint under a teacher's cursor sixty times a
second, defeat a screen reader, and add nothing a teacher can use.

It shows no model name, vendor or product id, colour, handset number, raw array,
raw JSON, axis, analog reading, or "supported hardware" claim.

**Controller buzzing starts switched OFF.** Nothing is bound until a teacher binds
it, so an enabled adapter would do nothing anyway — and a controller left plugged
into a shared classroom laptop should not reach the game until somebody says so.

### 13. Keyboard remains the permanent fallback

Keyboard buzzing is unaffected by everything above: by the panel existing, by the
adapter being enabled or disabled, by a capture being open, by a browser with no
Gamepad API, and by a read that throws. The no-controller copy is calm and points
at it: *"No controller detected. Keyboard buzzing remains available."*

### 14. No public-state change, and no protocol bump

`PublicState` is unchanged and the sync envelope is unchanged. The projector does
not need to know whether a buzz came from a keyboard or a controller, and it is
not told: not API availability, controller count, controller index, controller
label, button index, button state, mapping, connection state, capture state,
adapter errors or source kind. The existing public active-team and waiting-count
projection remains the only class-facing result.

This is the strongest available evidence that ADR-008's boundary was cut in the
right place: a whole new input class arrived without a wire version moving.

### 15. Accessibility

Every control is a real `<button>` or `<select>`, keyboard-reachable in DOM order,
using the shared focus ring. Connection changes and capture state are announced in
**polite** live regions, never alerts, and they are driven by the stable picture
only so nothing chatters per frame. Availability, on/off and every assignment are
stated in words — colour is never the carrier. A disabled control stays rendered
and explained rather than disappearing, so the set of actions does not jump around
when a controller is plugged in mid-lesson. Capture keeps focus on the control
that started it, which then becomes the Cancel affordance, so cancelling never
leaves focus nowhere. No poll update moves focus. There is no motion in the panel.

## Alternatives considered

**A global polling service or module-level loop.** Rejected: it would outlive its
component, keep dispatching into a store nobody is watching, and make "polling
stops on unmount" untestable. One host-owned effect is smaller and provably ends.

**Passing browser `Gamepad` objects through the application.** Rejected: it would
let application code read `id`, `mapping` and `axes` and start depending on a
device model; values could change under a caller between reads; and a test would
have to fabricate a `Gamepad`. A frozen data snapshot removes all three problems
at once.

**Feature-detecting on `'ongamepadconnected' in window`.** Rejected on evidence:
that property was `false` in the Chromium build this repository tests with, while
`navigator.getGamepads` was a function. Detecting on it would report "unsupported"
on a browser that supports it.

**Comparing `Gamepad.timestamp` to detect changes.** Rejected: it is a
`DOMHighResTimeStamp` whose update semantics vary by implementation, it is another
clock read on the polling path, and it answers "did anything change" rather than
"did THIS button go down" — which is the only question that matters.

**Treating `GamepadButton.value > threshold` as a press.** Rejected: it is analog
tuning, which is explicitly out of scope, and it would give two disagreeing
definitions of "pressed". `pressed === true`, strictly, is the whole rule.

**Using `Gamepad.id` as a durable controller identity.** Rejected twice over: it
is device-identifying free text that would import a vendor vocabulary into the
application, and it is not a reliable identity anyway (identical controllers share
it).

**Persisting Gamepad mappings in `localStorage`, as the keyboard mapping is.**
Rejected: the roadmap records this slice's storage impact as none, and — more
importantly — a controller index is not stable across a reload, so a restored
mapping would silently point at the wrong controller. A keyboard `code` is a
physical position and genuinely durable; a controller index is not.

**Defaulting a "buzz button" (for example button 0 on each controller).**
Rejected: it is a model-specific assumption wearing a generic costume. A default
that is right for one controller is wrong for another, and Slice 10 owns
recommended profiles.

**Deriving team assignment from controller index** ("controller 1 is team 1").
Rejected: it is an assumption about how a classroom plugs things in, it breaks the
moment a controller is unplugged and comes back at a different index, and it makes
a silent misattribution the DEFAULT behaviour.

**Validating that a mapped controller/button currently exists.** Rejected: it
would delete a teacher's assignments every time a controller was unplugged. Those
are resolution facts, not validation failures.

**Emitting diagnostics on every poll.** Rejected: sixty state updates a second,
focus churn, and a screen reader reading identical text forever.

**Rendering live button state as a debugging aid.** Rejected for the same reasons,
plus it is exactly the raw-device display the slice is forbidden to show.

**Adding `source: 'gamepad'` to the durable buzz event.** Rejected again, on
ADR-008's reasoning: no consumer needs it, and a field nobody reads acquires
meaning by accident. A history should answer "who buzzed first", not "which
peripheral was plugged in".

**A Playwright-visible fake gamepad global so e2e could simulate hardware.**
Rejected explicitly: it would put a test-only backdoor into the production bundle
to prove something the deterministic adapter tests already prove better. The e2e
suite covers the no-controller path, which is what a real browser genuinely adds.

**Merging the controller surface into the Slice 8 buzz-in panel.** Rejected: the
panels in this application are bounded on purpose, and keeping them separate meant
every Slice 8 component test kept passing unmodified — which is itself evidence
that the keyboard path was not disturbed.

## Consequences

**Good.** A whole new class of input arrived with **no schema change, no
`PublicState` change, no sync-protocol change, no new command, no new event and no
reducer change**. `LOCAL_INPUT_SOURCE_KINDS` gained one member; everything from
command translation downward is byte-identical. Replay is still bit-exact and
clock-free; the reducer is still pure; the sanitizer is still an allow-list; undo
is still exact. Every physical behaviour that would normally need hardware — held
buttons, connect, disconnect, reconnect at the same and at a different index,
simultaneous edges, malformed snapshots, a throwing API — is proved by fast,
deterministic unit tests with a fake source. The keyboard path was not touched and
its whole test suite passes unmodified.

**Costs and limits.** Polling is a frame loop, so it costs a small amount of work
per frame on the host tab while the panel is mounted; it is throttled by the
browser in a hidden tab and stops on unmount. **Gamepad mappings do not survive a
host reload** — a deliberate boundary, but a real cost a teacher will feel, and
one the panel states plainly. A controller index is a session-local locator, so a
controller unplugged and plugged back into a different port may come back with a
different index and its assignment will need redoing. The Gamepad API in most
browsers does not expose a controller until a button on it is pressed, so a
freshly plugged-in controller can legitimately show as "None detected" until it is
touched. **No physical controller was tested** — none exists in this environment,
and no claim is made about any specific device. Sub-frame ordering is not
resolvable and no fairness is claimed. Secondary actions remain inert, so a
teacher who assigns one gets a typed explanation rather than behaviour.

## Owner decisions recorded

| Gate | Decision | Status after Slice 9 |
| --- | --- | --- |
| **OG-1** | Arming is manual and host-controlled | **Implemented** (Slice 7); reused unchanged as the intake gate for Gamepad input too — no second flag, still one arming control. |
| **OG-2** | A full ordered queue, not first-only lockout | **Implemented** (Slice 8); a Gamepad buzz joins that same queue. |
| **OG-3** | Promotion after an incorrect response or a host pass | **Implemented** (Slice 8); unchanged. |
| **OG-4** | Tie handling on identical arrival stamps | **Resolved** (Slice 8) and extended here to simultaneous poll edges — §6. Sequence remains the tiebreaker; no fairness is claimed. |
| **OG-5** | Whether a queue may outlive a reveal or a transition | **Resolved** (Slice 8); unchanged. |
| **OG-6** | Whether scoring is restricted to the active respondent | **Deferred and NOT implemented.** Scoring is unchanged and stays available for every team. |

## Explicit non-goals (Slice 9)

No Sony Buzz! detection, PlayStation or Sony naming in runtime UI, vendor/product
matching, default coloured-button profile, handset grouping, controller wizard or
supported-hardware certification — all Slice 10, and none of it exists. No WebHID,
USB drivers, Bluetooth setup, haptics or vibration. No axes or analog controls, and
no analog threshold tuning. No persistent Gamepad mappings. No phone or networked
buzzers. No new scoring behaviour and no secondary-action gameplay. No
multiple-choice response modes, speed-based scoring, response-policy schema or
supporting event vocabulary — those remain post-MVP and parked. No media,
export/import, session persistence, final wager, reporting, themes, authoring,
backend, accounts, cloud sync, analytics, AI generation or LMS integration. No new
runtime dependency of any kind.
