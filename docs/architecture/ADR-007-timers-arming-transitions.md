# ADR-007 — Timers, arming and transitions: the clock boundary

- **Status:** Accepted (Slice 7)
- **Date:** 2026-07-26
- **Slice:** 7 — Timers, arming & transitions
- **Depends on:** [ADR-002](ADR-002-state-event-sync-core.md) (command/event core,
  allow-list sanitizer, versioned sync),
  [ADR-003](ADR-003-game-round-model-registry.md) (`GameDefinition` /
  `GameSession`, registry, support frozen at plan time),
  [ADR-004](ADR-004-canonical-validation-import.md) (the one import pipeline, no
  coercion, no silent repair),
  [ADR-005](ADR-005-category-board-round.md) (the reveal-stage machine),
  [ADR-006](ADR-006-teams-and-scoring.md) (typed `mode`/`source` precedent,
  reveal/score independence),
  [`ROADMAP-AMENDMENT-001`](../decisions/ROADMAP-AMENDMENT-001-local-buzzers.md)
  §5.1–§5.4
- **Supersedes:** nothing

## Context

Slices 1–6 built an engine whose entire state is a pure function of an append-only
event log. Nothing in it had ever needed to know what time it is. Slice 7 changes
that, and the whole design is about containing the change.

A timer introduces the first genuinely **non-deterministic input**: a value that
differs every time you ask, on every machine. Two existing invariants are directly
threatened by it:

- **Deterministic replay.** `replay(history)` must produce the same state today,
  tomorrow, and on another machine. A reducer that read a clock would break that
  permanently.
- **The snapshot sync channel.** `receiver.ts` applies only strictly-newer
  revisions and drops everything else. It is a snapshot transport, and a
  per-second (let alone per-frame) countdown would turn it into a frame transport
  and make the event log unbounded.

`ROADMAP-AMENDMENT-001` fixed three constraints before the slice began: the clock
stays at the edge and only facts are durable (§5.2); public timing is projected as
an absolute instant, not a tick stream (§5.3); and the interrupt seam must be typed
so that a future buzz-in is an addition rather than a rewrite (§5.4).

The classroom requirement is ordinary: a teacher wants to put a clock on a
question, stop it when someone answers, pause it when the fire alarm goes off, and
undo the whole thing when they start the timer by accident.

## Decision

### 1. One explicit clock boundary

`src/time/clock.ts` defines a `Clock` interface, the real `systemClock`, a
`createManualClock` for tests, and `isInstant` — the guard every timestamp crossing
a command or wire boundary passes.

A clock may be read at exactly two places:

| Where | Why |
| --- | --- |
| **The command/dispatch edge** | The host reads `clock.now()` once and puts it on the command's `issuedAt`, which the reducer copies onto the event and never re-derives. |
| **The presentation edge** | A countdown component re-reads the clock to render "how long is left" from durable facts. |

It may **never** be read inside `reduce`, `replay`, the planner's decision logic
(beyond the `issuedAt` the command already carries), or the sanitizer. The host
surface takes the clock as an injected prop from one place (`FoundationControls`)
and threads it to the panels, so the application contains exactly one call to
`Date.now()` and every test drives a manual clock instead of waiting.

There is deliberately **no global timer service**. Nothing mutates game state
outside the command → event → replay pipeline.

### 2. Durable facts; a derived countdown

`ResponseTimerState` is a discriminated union of five statuses. A `running` timer
stores `timerId`, `durationMs`, `startedAt` and an absolute `deadline`; a `paused`
timer stores `remainingMs` and **no deadline at all**; `expired` and `interrupted`
store what they need and nothing more.

"Seconds remaining" is never stored, never broadcast per frame, and never written
to an event. It is computed by `remainingMsAt(timer, now)` — a pure function of its
arguments — at whichever edge needs it. There is no per-second event, no tick
stream, and no revision that moves because time passed.

Because a paused timer carries no deadline, **replay does not consume wall-clock
time while paused**: a history replayed a week later reproduces exactly the same
paused remaining value.

### 3. Scope: the response window of the live clue

The timer is scoped to the **response phase** — the window in which a class may
answer the clue that is currently public. It is legal at exactly one point in the
Slice 5 reveal machine: the `prompt` stage. Before the prompt is public there is
nothing to respond to; once the answer is public the opportunity is over.

`ResponsePhaseState` lives in `PrivateGameState.responsePhases`, a per-round map
that is a **sibling** of `categoryBoards`, not a field inside it. The phase is not a
property of the category-board round type: a later round type with a timed response
reuses the same state, the same commands and the same public projection. No media
timer and no final-wager timer exist — those are later slices.

### 4. Arming is manual, first-class and durable

`ResponsePhaseState.armed` is a durable boolean set only by
`ARM_RESPONSE_PHASE` / `DISARM_RESPONSE_PHASE`. Nothing arms a clue automatically:
not a prompt reveal, not a timer start, not an animation completing. This
implements owner decision **OG-1** (see §16).

Arming today means "an interrupting input *would* be accepted". No such input
exists in this slice — that is the point. Arming is built as durable state now so
that Slice 8 adds an input *source*, not a state machine.

Arming and the timer are **orthogonal**: a clue can be armed with no clock, timed
with no arming, both, or neither.

### 5. The typed interruption seam

`ResponseInterruptionSource` is a discriminated union with one member today,
`{ kind: 'host' }`, guarded by `isResponseInterruptionSource`. This is the seam
`ROADMAP-AMENDMENT-001` §5.4 required, and it is modelled on `ScoreSource`
(ADR-006 §10) for the same reason: a bounded, typed value stays explainable months
later, and a new cause is a new member rather than a new event type.

Three properties matter for the future:

- **An interruption stops the clock without ending the clue.** The prompt stays
  public, the tile stays unconsumed, and the clue stays armed. A later slice can
  therefore reset the phase and run another window for the next queued team
  (**OG-3**) without redesigning anything.
- **Unrecognized sources fail closed** at the command boundary and again on event
  application, so an arbitrary string can never reach the log.
- **No team, queue, device, button or input evidence appears anywhere** in the
  source, the event, or the public projection.

### 6. Expiration enters through the command boundary, with evidence

A UI timeout callback never mutates anything. `useResponseTimerExpiry` schedules
one `setTimeout` for the current deadline and, when it fires, dispatches
`EXPIRE_RESPONSE_TIMER` carrying the `timerId` and the exact `deadline` it believes
it is expiring.

The planner accepts it only when **all** of these hold:

1. the phase is legal (session, active game, current round, `prompt` stage);
2. the timer is `running`;
3. `command.timerId` equals the live timer's id;
4. `command.deadline` equals the live timer's deadline;
5. `issuedAt` is at or after `deadline − EXPIRY_TOLERANCE_MS` (250 ms, absorbing a
   callback that fires a hair early).

Anything else is rejected as `stale-timer-expiration` or
`premature-timer-expiration`, appending nothing and moving no revision. That covers
a reset, a restart, a pause, a resume, an undo, a clue change, a round change, a
host transition before the deadline, a repeated dispatch and an unmounted surface —
each proved by a test.

**Exactly one effective expiry per countdown is structural, not a convention:**
applying the event moves the timer out of `running`, so a second expiry of the same
timer can never apply.

The 250 ms tolerance is the one deliberate softness in the rule, and it is a
tolerance on *earliness* only; there is no upper bound, because a callback that
fires late is still describing a window that genuinely ended.

### 7. Pause and resume: OG-8, resolved for this slice

**`OG-8` was deferred by default. It is resolved here as: explicit host pause and
resume are supported.** The gate is recorded as answered by this ADR and remains
open to owner revision — the owner may withdraw it, and removing the two
commands would not disturb anything else in the model.

It is bounded exactly as the owner's preferred direction sketched:

- pause records `remainingMs` as a durable fact, computed once at the dispatch edge
  and clamped to `0 … durationMs`;
- resume derives a **new** deadline from the dispatch-edge clock, so paused
  wall-clock time is never charged to the class;
- the `timerId` is preserved across the pair, so one countdown keeps one identity;
- replay never consumes time while paused.

Browser background throttling is **not** a pause. Nothing observes visibility, and
a backgrounded tab's timer keeps its deadline — the deadline is absolute, so the
countdown is correct the moment the tab is looked at again.

### 8. Transition legality, and what a window does not survive

Legality is decided in one place, `resolveResponsePhase`, so an illegal or stale
transition fails closed once rather than in eight command handlers.

| Event | Effect on the response phase |
| --- | --- |
| tile selected | cleared — a new clue starts disarmed with no clock |
| prompt revealed | unchanged (still initial) — nothing arms itself |
| answer revealed | cleared — the response opportunity has ended |
| returned to board | cleared |
| round selected / advanced | **the whole map is cleared** |
| game ended, new game loaded | cleared |
| score adjusted | **unchanged** — scoring and the window are independent |
| undo | whatever replay produces, exactly |

The round rule is deliberately **different from board progress**. Board progress
resumes when a teacher returns to a round (ADR-005). A response window does not,
because its deadline is an absolute instant and resuming a five-minute-old deadline
would put a nonsense clock in front of a class.

No transition invents an event. Closing a clue does not fabricate an interruption:
the durable answer-reveal fact is what clears the window, and undoing that fact
restores it exactly.

### 9. Transition animation is presentation only

The projector's only animation is a slow opacity pulse under the final ten seconds.
It is derived from durable phase state, it carries no information the text does not
already carry, and CSS animation completion is never consulted for anything. No
animation frame or completion tick exists in the event log, and nothing about game
progression waits for a transition to finish.

Under `prefers-reduced-motion: reduce` the pulse is removed outright (rather than
run at 0.001 ms, which the global rule alone would do), and the emphasis colour
stays. There is no flashing, no movement, and nothing faster than once a second.

The panel shows no answer, no teacher note, no upcoming tile and no host control at
any status.

### 10. Host and display clocks — the honest version

The host is the sole authority for durable events. The display derives its
countdown locally from the sanitized deadline. **The two clocks are not
synchronized, and this ADR does not claim they are.**

The bounded strategy:

- every `public-state` envelope carries `sentAt`, the host's clock reading at
  publish time (transport metadata, not state);
- the receiver estimates `offset = sentAt − receivedAt` and **clamps** it to
  ±`MAX_CLOCK_OFFSET_CORRECTION_MS` (5 s), so a corrected or wrong host clock
  cannot push the projector to an absurd value;
- the countdown compares the deadline against `displayNow + offset`, and the result
  is clamped to `0 … durationMs`;
- every authoritative republish re-estimates the offset;
- **the display never expires the timer.** Reaching 0:00 changes nothing: the panel
  keeps showing `running` at zero until the host publishes `expired`.

**Limitations, stated plainly.** The estimate ignores transport delay and does no
round-trip measurement, so it is an estimate, not a synchronisation protocol. On
the only transport that exists today — BroadcastChannel between two tabs of one
browser — both readings come from the same `Date.now()`, so the offset is
effectively zero and the correction is a no-op. It is computed anyway so a future
cross-device transport does not silently mis-render a countdown, and so that this
decision is written down before it matters. A display whose clock differs by more
than the clamp will show a countdown that is wrong by up to that difference; it
will still never show a negative number, never exceed the window that was started,
and never end the window itself.

### 11. Public state: one new field, wire version 4 → 5

`PublicState` gains exactly one field, `response: PublicResponseState | null`,
carrying the armed flag and a status-discriminated timer. A `running` timer
publishes `durationMs` and the absolute `deadline`; `paused` and `interrupted`
publish `durationMs` and `remainingMs` and **no deadline**; `expired` publishes
`durationMs` only; the pairing is enforced by `isPublicResponseState`, so an
impossible combination fails the whole snapshot and the display keeps its last safe
state.

`null` covers "there is nothing to show": no open clue, a non-playable round, an
ended game, a failed round projection, or a clue that was **neither armed nor
timed** — so a projector shows a timer panel only while one genuinely exists.

Never projected: the internal `timerId`, the interruption **source**, the authored
`timer` block, `startedAt`, the round id, the private phase map, any host control,
and anything at all about a future buzzer. "Stopped" is as much as the class is
told about why a window ended.

### 12. Wire protocol: envelope version 1 → 2

The `public-state` message gains a **required** `sentAt`. That is an incompatible
change to the envelope, so `SYNC_SCHEMA_VERSION` moves 1 → 2 and a version-1
envelope is rejected with `unsupported-version`.

Making the field optional and treating "absent" as "no offset" was rejected: that
is exactly the implicit compatibility guessing ADR-004 forbids, and it would have a
display silently interpret a foreign clock as its own. An unusable `sentAt` (NaN,
negative, fractional, non-numeric) fails the envelope rather than being defaulted.

Both versioned surfaces therefore moved in this slice, and both fail closed.

### 13. Replay and undo

Every one of the eight events is reversible and replay-derived, so undo is exact
for free and needs no bookkeeping. Tested: arm, disarm, start, pause, resume,
interrupt, expire, reset, and the answer reveal that closed a window.

Two consequences worth stating:

- Undoing an **expiry** restores a `running` timer whose deadline is already in the
  past. That is the prior durable state, exactly — the adapter then schedules a
  zero-delay callback and the window expires again unless the host acts. Undo
  restores the previous state; it does not invent a friendlier one.
- **Undo remains latest-only** (ADR-002). One undo after arm-then-start reaches the
  start, not the arm. That limit is preserved and documented rather than broadened
  into arbitrary historical undo.

### 14. Scoring interactions

Scoring semantics are unchanged. The rules at the seam:

- **Expiry awards and deducts nothing.** A window ending is a fact about the
  window, not a decision about points.
- **A stale timer callback cannot score.** The only command the adapter can issue is
  `EXPIRE_RESPONSE_TIMER`, and it appends nothing when stale.
- **Scoring does not touch the phase**, and the phase does not gate scoring. This
  preserves ADR-006 §9's independence in both directions; the window is bounded by
  the clue's reveal stages, not by whether someone scored.
- Answer reveal and scoring remain deliberate host actions, and revealing the answer
  is what closes the window.
- **`OG-6`** — restricting scoring to an active respondent — **remains deferred and
  is not implemented**, because no respondent exists to restrict it to.

### 15. Authored configuration: additive on `schemaVersion: 1`

A game file may carry an optional top-level block:

```jsonc
"timer": { "responseSeconds": 45 }
```

Whole seconds, 5–600, validated by one schema shared by the importer and the
trusted constructor. An **absent** block yields the documented default of 30
seconds, applied only by the trusted constructor — never by a Zod `.default()`, so
the import boundary keeps reporting exactly what was authored (the
`DEFAULT_MULTIPLIER` and accent-default precedent).

`schemaVersion` stays **1**. The field is additive and optional; every pre-Slice-7
document is still valid and still means exactly the same thing, so no migration is
required and none is implied. `ROADMAP-AMENDMENT-001` §5.10's discipline is
followed: a v2 would need the accepted seven-point migration policy first, and this
change does not need a v2.

The host may choose a different bounded duration for one clue at start time; it is
validated against the same bounds, so the UI can never widen the window.

### 16. Owner decisions recorded

Three owner decisions are recorded here because they shape the seam this slice
builds. **Only OG-1 is implemented.**

| Gate | Decision | Status in Slice 7 |
| --- | --- | --- |
| **OG-1** | Buzzer arming is **manual**, host-controlled | **Implemented** — arming is durable state, changed only by host commands, and nothing arms a clue automatically. |
| **OG-2** | Future buzzer behaviour preserves a **full ordered team queue**, not first-only lockout | **Not implemented.** No queue, no ordering, no team input exists in this slice. Recorded so the seam does not foreclose it: an interruption stops the clock without ending the clue, and the phase can be reset and re-run. |
| **OG-3** | After an incorrect response or a host pass, the **next queued team is promoted** | **Not implemented.** No promotion, no pass, no respondent exists. Recorded for the same reason: §5 and §8 deliberately keep "interrupted" from meaning "finished". |
| **OG-8** | Timer pause/resume semantics | **Resolved for this slice** — see §7. |

`OG-2` and `OG-3` unblock the Slice 8 event vocabulary. They authorize nothing
here, and no buzzer functionality of any kind is present.

### 17. Host and projector behaviour

**Host.** A third bounded panel beside the board and scoring panels: it arms and
times, it reveals nothing and it scores nothing. It states four facts in words —
whether the clue is open, whether it is armed, the timer status, and the remaining
time — and offers arm, disarm, a duration selector, start, pause, resume, stop and
reset. A control the reducer would reject is **disabled**, and the panel says why.

**Projector.** An armed indicator, a status word, and a large tabular-figure
countdown, present only while a window exists. Every state is stated in words
("Buzzers armed", "Paused", "Time up", "Stopped") because colour is the first thing
a washed-out projector loses.

### 18. Accessibility

Host controls are real buttons and a labelled `<select>`, keyboard-reachable in DOM
order with the shared focus ring; disabled controls stay visible rather than
vanishing under the cursor. Every state is text, never colour alone. The projector
countdown is a `role="timer"` with a spelled-out accessible label ("1 minute 5
seconds"), because "1:05" read literally is ambiguous; the surrounding live region
is `polite` and announces status changes rather than every second, so a screen
reader is not flooded. Paused, expired, armed and interrupted each have distinct
accessible text. Reduced motion is respected. No audio is added, and nothing
flashes.

## Alternatives considered

**A tick event per second.** Rejected: unbounded history, a replay that depends on
how long a lesson lasted, and a sync channel turned into a frame transport
(`ROADMAP-AMENDMENT-001` §4.2).

**Storing `remainingMs` on a running timer and decrementing it.** Rejected: it is
the same tick stream with extra steps, and it makes the durable state disagree with
the clock the moment anything is dropped.

**Reading the clock inside the reducer to compute expiry.** Rejected outright: it
would end deterministic replay, which is the property every other slice is built
on.

**Letting the display expire the timer when its countdown hits zero.** Rejected:
that is a second authority, and two authorities with two clocks disagree. The
display renders; the host decides.

**A global timer service that mutates state.** Rejected: it would bypass the
command/event pipeline, so expiry would be neither validated, nor replayable, nor
undoable.

**An `interrupted` state that also ends the clue.** Rejected: it would bake
first-only lockout into the model and make OG-2/OG-3 a redesign rather than an
addition.

**A free-text interruption reason.** Rejected for the same reason ADR-006 rejected
a free-text score note: an unbounded string on a durable event is where private
prose accumulates until someone must decide whether it is projectable.

**A speculative "interrupt plugin" framework.** Rejected: ADR-004's "never a
speculative entry" rule. A typed union with one member and a guard is the whole
seam.

**Making `sentAt` optional so version-1 envelopes still decode.** Rejected: see
§12.

**Bumping the game-file `schemaVersion` to 2 for `timer`.** Rejected: the field is
additive and optional, every prior document keeps its exact meaning, and a bump
would reject every existing file with no migration to offer.

**A per-round or per-tile authored timer.** Rejected for this slice as more surface
than the roadmap asks for. A game-level default plus a host-chosen per-clue
duration covers the classroom need, and a round-level override remains a
straightforward addition to the same block.

**Automatically arming when the prompt is revealed.** Rejected: OG-1 says arming is
manual, and an automatic arm would be a behaviour a teacher cannot see coming.

**Treating a backgrounded tab as a pause.** Rejected: it would make the timer
depend on window focus, which is neither a classroom concept nor an evented one.

## Consequences

**Good.** The engine now handles a clock without giving up a single existing
invariant: replay is still bit-exact and clock-free, the sync channel is still a
snapshot transport, the sanitizer is still an allow-list, and undo is still exact.
The timing model is round-type-neutral, so a later round type reuses it. The
interruption seam is typed and has a real consumer, so buzz-in is an addition
rather than a rewrite. The clock has exactly one entry point, which makes every
timing test deterministic and fast.

**Costs and limits.** `PublicState` version 4 consumers and sync version 1
consumers both fail closed; there is no migration and none is implied. The
host/display offset is an estimate, not synchronisation. Undo of an expiry restores
an already-overdue timer. A response window does not survive a round change. Undo
is still latest-only. Everything remains in memory, lost on tab close. And the
`prompt` stage is the only place a window may exist, so a timed round type that
wants a different anchor will extend `resolveResponsePhase` rather than reuse it
verbatim.

## Explicit non-goals (unchanged by this ADR)

No buzzers of any kind: no team buzz events, no ordered queues, no pass-to-next
team, no keyboard team input, no Gamepad API, no Sony Buzz! handling, no WebHID, no
Bluetooth, no phone or networked buzzers. No automatic timeout scoring. No media or
playback coordination (`OG-9`). No persistence, session recovery or leader
coordination. No wagering, Daily Double or Final Jeopardy. No portable
export/import. No reporting or leaderboards. No theme engine. No authoring UI or
pack management. No backend, accounts, cross-device sync, analytics or AI. No
additional playable round type. No proprietary branding, sound or visual styling,
and no commercial audio or media assets.
