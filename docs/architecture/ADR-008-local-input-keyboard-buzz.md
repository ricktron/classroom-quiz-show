# ADR-008 — The local input boundary, the buzz queue, and keyboard buzz-in

- **Status:** Accepted (Slice 8)
- **Date:** 2026-07-27
- **Slice:** 8 — Local input contract & keyboard buzz-in
- **Depends on:** [ADR-002](ADR-002-state-event-sync-core.md) (command/event core,
  allow-list sanitizer, versioned sync, undo as an append-only marker),
  [ADR-003](ADR-003-game-round-model-registry.md) (application-only registration,
  explicit known/unknown, no dynamic import),
  [ADR-004](ADR-004-canonical-validation-import.md) (no coercion, no silent
  repair, never a speculative version entry),
  [ADR-005](ADR-005-category-board-round.md) (the reveal-stage machine),
  [ADR-006](ADR-006-teams-and-scoring.md) (typed `mode`/`source` precedent,
  reveal/score independence, teams as authored content),
  [ADR-007](ADR-007-timers-arming-transitions.md) (the clock boundary, manual
  arming, the typed interruption seam, transition legality),
  [`ROADMAP-AMENDMENT-001`](../decisions/ROADMAP-AMENDMENT-001-local-buzzers.md)
  §5.5–§5.7
- **Supersedes:** nothing

## Context

Slice 7 built a response window that could be armed and timed, and it built the
seam an interrupting input would one day pass through — deliberately without the
input. Slice 8 is that input.

Three owner decisions shape it, all answered before the slice began:

| Gate | Decision |
| --- | --- |
| **OG-1** | Arming is **manual and host-controlled**. *(Implemented in Slice 7.)* |
| **OG-2** | Buzzer behaviour preserves a **full ordered queue**, not a first-only lockout. |
| **OG-3** | After an incorrect response or a host pass, the **next queued team is promoted**. |

And one owner direction: the input contract must be able to represent a primary
buzz action, **secondary logical actions** suitable for future coloured
controller buttons, and **configurable mappings independent of any device model**
— while the engine stays **button-agnostic**.

The hard part is not the keyboard. It is making sure that Slice 9 (a generic
Gamepad adapter) and Slice 10 (a Sony Buzz! profile) are *adapters* rather than
rewrites, and that nothing about a physical device can leak into the event log,
the reducer, or a classroom projector.

## Decision

### 1. One layered boundary, and the domain sits above it

```text
physical device            keyboard hardware
  ↓ browser API            KeyboardEvent                 ── host-private
local input adapter        src/input/keyboardAdapter.ts  ── host-private
  ↓ logical action         LocalInputSignal              ── team + action + evidence
command translation        src/input/commandTranslation.ts
  ↓ validated command      RECORD_TEAM_BUZZ
planner                    armed? open? known team? duplicate? stale?
  ↓ accepted fact
append-only event          TEAM_BUZZED (+ RESPONSE_TIMER_INTERRUPTED)
  ↓ replay
reducer-derived queue      BuzzQueueState — order from `seq`, no cache
  ↓ toPublicState allow-list
sanitized public state     PublicBuzzState — active key + waiting count
  ↓
projector rendering        read-only, fails closed
```

**The domain never receives a `KeyboardEvent`, a key code, a device identifier or
a mapping table**, and that is structural rather than conventional: those types
are not importable from `src/game` or `src/state`, and the only value that crosses
is a `LocalInputSignal`, which cannot express them.

Four things are kept apart on purpose, because conflating any two of them is what
makes a "buzzer feature" impossible to port to different hardware:

1. **physical input identity** — a `KeyboardEvent.code`; one day a button index;
2. **logical action** — what the press means;
3. **team assignment** — who it speaks for;
4. **game command** — what the engine is being asked to do.

### 2. No plugin framework

`ROADMAP-AMENDMENT-001` §5.6 anticipated an adapter *registry* modelled on the
round registry. With one adapter, a registry object would be a speculative
framework — exactly what ADR-004's "never a speculative entry" rule disfavours,
and what ADR-007 rejected for an "interrupt plugin framework".

What is delivered instead is smaller and strictly stronger: `LOCAL_INPUT_SOURCE_KINDS`
is a bounded union that **only application code can extend**. There is no dynamic
lookup, no `register()` surface, and therefore no code path from game content to
an input adapter — the registry's actual guarantees, with nothing to maintain.
Slice 9 adds `'gamepad'` there together with its adapter.

### 3. Logical action vocabulary

```ts
type LocalInputAction =
  | { kind: 'primary-buzz' }
  | { kind: 'secondary'; slot: 'secondary1' | 'secondary2' | 'secondary3' | 'secondary4' }
```

Bounded, exhaustively discriminated, guarded by `isLocalInputAction`. The reasons
are the ones that made `ScoreSource` (ADR-006 §10) and `ResponseInterruptionSource`
(ADR-007 §5) unions: the value must stay explainable months later, an unrecognized
member must fail closed, and a future action must be an addition.

**Primary versus secondary — and why secondary is inert.**

- `primary-buzz` has a real consumer in this slice: a team claiming the clue.
- `secondary` carries a bounded **ordinal** slot. It exists so a later slice can
  map extra controller buttons without the contract being re-cut.

A mapping may bind a key to a secondary action, and that mapping **validates**.
Translation then refuses it with `unsupported-action`, so **no secondary action
changes game state in Slice 8**: there is no command for it to become, hence no
event, no reducer transition and no projection. This is the "no speculative
contract without its first consumer" rule applied honestly — the contract is
complete enough that Slice 9 or 10 adds a consumer without touching it, while the
game gains no half-defined behaviour today.

**Slots are ordinal, never chromatic.** No `red`, `blue`, `orange`, `green` or
`yellow`; no device model; no vendor name; no button index. A test asserts this
over the whole vocabulary and its host-facing copy, so the engine cannot acquire a
Sony vocabulary by accident. Slice 10 supplies the recommended Sony profile, and
everything model-specific belongs there.

### 4. `KeyboardEvent.code`, not `key` — with the cost stated

A binding names a **physical key position**. Three reasons, all of which `key`
fails:

1. **Layout independence.** On AZERTY the key labelled `1` still reports
   `code: 'Digit1'`; `key` reports `'&'`, and four teams silently lose their
   buzzers on a different laptop.
2. **Modifier independence.** `key` changes under Shift (`'1'` → `'!'`) and under
   an IME; `code` does not move.
3. **A checkable grammar.** `code` values are a small, stable, ASCII vocabulary,
   so a persisted mapping can be *validated* rather than trusted. `key` is an open
   set spanning every script.

`KEY_CODE_PATTERN` is `/^[A-Z][A-Za-z0-9]{1,31}$/` — uppercase-led and at least two
characters, which is precisely the shape a `key` value fails. A test asserts that
`'1'`, `'&'`, `'q'` and `'Q'` are all rejected.

**The cost, plainly:** a stored mapping reads `Digit1`, not whatever is printed on
the keycap. The host therefore renders a friendly label and captures bindings by
asking the teacher to press the key, so nobody needs to know the vocabulary.

### 5. Reserved keys, and one physical press = one buzz

Reserved and unbindable: `Tab` (focus), `Enter`/`NumpadEnter` and `Space`
(activate the focused control), `Escape` (cancels capture), `F5` (reload), and the
modifier keys. Reservation is enforced in the validator *and* again in
`resolveKeyboardBinding`, so a hand-edited stored mapping cannot make the adapter
act on one.

Input handling ignores, with a typed reason for each: OS auto-repeat
(`event.repeat`); a still-held key (a held-code set cleared on `keyup` and on
window blur, because not every platform reports `repeat`); IME composition; a
modifier chord; input, textarea, select, `contenteditable` and anything inside an
open `<dialog>`; capture mode; and a disabled input switch.

**A focused `<button>` is deliberately NOT treated as typing.** A teacher operates
this app by clicking, and a clicked button keeps focus — so counting it as typing
would kill buzzing for the rest of the lesson, silently. Nothing is lost, because
Space/Enter/NumpadEnter are already reserved and cannot be buzz keys. This was
found by an end-to-end test, not by review.

`preventDefault` is called **only** for a press that produced an accepted buzz.
The listener is on `window` in the **bubble** phase, so an input, a button or a
dialog gets the key first and normal operation of the page is never captured.

### 6. Mapping model and local persistence

A binding is `{ code, teamId, action }`; a mapping is `{ version, bindings }`.
Validation reports structured issues with the exact binding index — unsupported
key, reserved key, duplicate key, unknown team, second primary key for a team,
malformed action, too many bindings — and it **repairs nothing, drops nothing and
overwrites nothing**. Taking a key another team holds produces an *invalid*
mapping that is refused, not a silent steal.

Defaults: the digit row, one key per team in authored order. Safe, bounded, and
explainable to a class in four words.

**Persistence is host-device configuration, and its separation is the decision.**

| Kind of truth | Where it lives | Here? |
| --- | --- | --- |
| Authored game content | the imported `GameDefinition` | no |
| Session history | the in-memory event log | no |
| Portable export | Slice 12 | no |
| Session persistence & recovery | **Slice 13** | **no** |
| Which key this laptop's team 3 presses | `localStorage`, one versioned key | yes |

**This is not the start of Slice 13.** No event, revision, session id or game state
is stored — only a version and a list of `{code, teamId, action}` triples, asserted
by a test. Clearing it loses a keyboard preference and nothing else. No account, no
cloud, no network, no student identity (a binding names a TEAM, which is authored
content).

Stored data is untrusted: it is parsed defensively, validated with the same
validator the editor uses, and **falls back to the defaults wholesale** on
anything wrong. A half-honoured mapping would leave a teacher with some buzzers
working and no way to tell which. The one exception is a **removed** team, whose
binding can never be valid again and is pruned; a **renamed** team keeps its key,
because identity is the id and never the name (ADR-006). Storage that throws
(private mode, a full quota) degrades to "defaults, not persisted" rather than
crashing.

### 7. Arming is the intake gate — no second flag

Slice 7's `armed` boolean is reused exactly as it stands. There is **no
keyboard-arm flag**, and there is still exactly one arming control in the
application.

- A press while disarmed is rejected (`response-phase-not-armed`) and appends
  nothing.
- **Disarming stops acceptance immediately.**
- Expiry disarms (ADR-007), so a press after time is up is refused too.
- Every transition that clears the phase clears the queue with it.

**New buzzes may join while the clue stays armed, including during an active
response.** That is not a guess: OG-2 asks for a *full ordered queue*, which only
exists if teams other than the first can enter it, and OG-3's "promote the next
queued team" requires a populated queue. Arming is therefore the intake gate and
the host closes intake by disarming. Promotion changes arming in neither
direction.

### 8. The ordered queue

```ts
interface BuzzQueueState { order: readonly string[]; resolvedCount: number }
```

`order` is every accepted team in accepted order, each at most once;
`resolvedCount` is how many have finished their turn. Everything else is derived:
active is `order[resolvedCount]`, waiting is the slice after it, exhausted is
`order.length > 0 && resolvedCount === order.length`.

One list plus a pointer beats an `{ active, waiting[] }` pair for a specific
reason: promotion is `resolvedCount + 1`, which cannot lose, reorder or duplicate
an entry, whereas shifting between two collections can. It also makes "each team
at most once" a property of one array.

Resolved teams stay in `order` on purpose. That is what makes "a team that already
answered cannot buzz again for this clue" derivable, and what keeps **EXHAUSTED**
(everyone who buzzed had a turn) distinct from **EMPTY** (nobody buzzed) — two
completely different classroom situations that look identical if you only track
who is waiting.

**Ordering authority is the event log's `seq`.** The reducer reads no clock and
does no sorting. `occurredAt` travels as arrival evidence and is never consulted
for order.

### 9. Active respondent

The active respondent is derived through one function and exposed as a
discriminated `BuzzQueueStatus` (`empty` · `active` · `exhausted`), so no surface
infers "who is answering" from an array position of its own. The model covers
active respondent, waiting queue, no active respondent, exhausted queue, and
*response opportunity closed* — the last being the phase's own absence, since a
closed opportunity has no queue at all.

### 10. Timer interruption

The **first** accepted buzz of a live countdown appends a real
`RESPONSE_TIMER_INTERRUPTED` event with `source: { kind: 'team-buzz' }`. Slice 7
predicted this would cost exactly one union member; it did. **No event type
changed, no reducer transition changed, no public field changed, and the seam was
not re-cut.** There is no buzzer-specific timer implementation and no
buzz-specific timer state.

Subsequent buzzes cannot interrupt again, and that is **structural**: the timer is
no longer `running` or `paused`, so the transition is unavailable rather than
suppressed by a flag. A rejected buzz never touches the timer, because a rejected
command appends nothing.

Expiration races are covered by tests: an accepted buzz before expiry makes the
timeout callback stale (it names a timer that is no longer running, and appends
nothing); a duplicate callback is refused the same way; an expiry before a buzz
disarms the clue so the later press is refused; and undo across the interruption
behaves as §13 describes.

The host remains authoritative throughout — the display never buzzes, never
expires and never authors anything.

### 11. Promotion, and what "host pass" means

One command, `RESOLVE_ACTIVE_RESPONSE`, carries a typed
`{ kind: 'incorrect' | 'passed' }`. One command rather than two, for ADR-006 §7's
reason: both perform the identical transition and differ only in what the teacher
meant, so the meaning belongs in a typed field on one fact. One click is one
command is one event is one promotion — no fragile multi-step state manipulation.

- the active team leaves the active slot;
- the next queued team is promoted;
- remaining order is preserved exactly (only the pointer moves);
- an empty result is reported as **exhausted**, not as "nobody buzzed";
- arming is untouched in both directions;
- **no score moves.** `incorrect` records a judgement, not a deduction — an
  automatic penalty would break ADR-006 §9 and take a decision out of the
  teacher's hands.

**There is deliberately no `correct` member.** A correct answer *ends* the response
opportunity rather than promoting anyone, and the host already has that action:
revealing the answer, which closes the window and clears the queue. Adding
`correct` here would create a second, competing way to end a clue.

**"Host pass" is defined precisely**: advancing from the active respondent to the
next queued team *without asserting correctness and without changing any score*.
It is distinct from a team declining to answer (which the teacher records the same
way, because the log records what the host did), from skipping the clue (return to
the board), from closing the response opportunity (reveal the answer, or reset),
and from clearing the queue (reset). The UI labels are "Mark incorrect and
advance" and "Pass and advance".

### 12. Queue lifecycle, and the response-opportunity identity (OG-5)

`OG-5` is resolved only as far as honesty required: **the queue belongs to one
clue's response opportunity.** It lives *inside* `ResponsePhaseState`, so every
rule the phase already had applies for free — it is cleared by a new tile
selection, the answer reveal, a return to the board, a round change, a reset, and
the game ending (ADR-007 §8). A queue cannot outlive its clue, undo restores it
through replay, and promotion never creates a new queue identity.

For stale commands, the smallest stable identifier that already existed is used:
both buzz commands carry `roundId` **and** `tileId`, and the planner checks the
pair against the live clue. This is the same technique the timer uses with
`timerId` + `deadline` (ADR-007 §6); no new identity had to be invented, and a
press that lands after the host moved on is inert rather than joining the wrong
queue.

### 13. Tie handling (OG-4)

Recorded, and resolved by construction rather than by a feature:

- observed timestamps are **evidence**, never the ordering authority;
- **event sequence is the deterministic tiebreaker**, so identical `occurredAt`
  stamps do not create an unresolved domain tie — a test dispatches three buzzes
  with the identical instant and asserts the queue order;
- **the system does not claim sub-millisecond fairness** and never presents
  `occurredAt` as a reaction time;
- a disputed physical tie is the host's call, through the controls that already
  exist: undo, reset the window, or reveal and move on.

No tie-adjudication UI is built. The roadmap does not ask for one, and building
one would imply a precision this design explicitly refuses to claim.

### 14. Public state: nested, minimal, and a version bump

`PublicResponseState` gains one **required** field:

```ts
type PublicBuzzState =
  | { status: 'none' }
  | { status: 'active'; activeTeamKey: string; waitingCount: number }
  | { status: 'exhausted' }
```

**Who is answering IS public** — that is what a buzzer is for, and a class that
cannot see it will shout instead.

**The full waiting order is deliberately NOT public.** The projector gets the
active team and a *count*; the host panel gets the full ordered queue. Three
reasons: it is the smallest useful surface; a public ranked list of who reacted
fastest is precisely the reaction-time claim this project refuses to make
(`ROADMAP-AMENDMENT-001` §5.7); and one name plus "2 waiting" stays legible from
the back of a room where a five-row list under a live clue does not.

The active team is named by the **positional key** (`t0`, `t1`, …) the scoreboard
already publishes, so the display resolves the name from data it already has. No
authored team id travels, and the name is not duplicated onto a second wire field
that could drift.

Never projected: raw keys, key mappings, browser event data, source identifiers,
configuration diagnostics, the adapter name, the queue's `order` array, its
`resolvedCount`, the teams whose turn is over, the interruption **source** (a
buzz-stopped window still publishes only "Stopped"), teacher-only controls,
answers before reveal, teacher notes, and future tiles.

**Wire version 5 → 6.** Making `buzz` optional so a version-5 display still
decoded was rejected: that display would show a running timer and no sign that a
team had claimed the clue — wrong without looking broken, which is exactly the
implicit compatibility guessing ADR-004 forbids and ADR-007 §12 rejected for
`sentAt`. **The sync envelope is unchanged at version 2**: no transport metadata
was needed, so it does not move.

### 15. Replay and undo

Both new events are reversible and replay-derived, so undo is exact for free. The
reducer reads no clock and no mapping; `replay(history)` is bit-exact and a stored
history reproduces the same queue on any machine at any later date. Tested: undo of
a buzz, of a promotion, of a reset that cleared a queue, and of the answer reveal
that closed one — each restoring the prior armed state, timer state, active
respondent and queue order exactly.

One consequence is stated rather than hidden: a buzz that stops a live clock
appends **two** facts, so fully reversing it takes **two** undos. Undo peels them
off in reverse causal order — first the clock resumes, then the buzz disappears.
That is the existing latest-only rule (ADR-002, ADR-007 §13), not a new limitation,
and both intermediate states are exactly what the log says.

### 16. Command validation

Fail-closed, appending nothing and moving no revision: wrong phase
(`invalid-board-stage`), disarmed (`response-phase-not-armed`), stale
opportunity (`tile-mismatch`), stale round (`round-mismatch`), nonexistent team
(`unknown-team`), no teams (`no-teams-configured`), duplicate queued or active team
(`team-already-buzzed`), nothing to promote (`no-active-respondent`), closed clue
and revealed answer (both `invalid-board-stage`), ended game
(`game-already-ended`), malformed action or resolution (`malformed-command`), and
an unusable dispatch instant (`malformed-command`). Unsupported secondary actions
are refused one layer earlier, at translation, with `unsupported-action`.

Application-time re-checks mean a corrupt stored log degrades to "not applicable"
rather than producing an impossible queue: a buzz on a disarmed clue, a duplicate
team, a resolution naming a team that is not active, and an unrecognized
resolution are each skipped on replay.

### 17. Scoring boundary — `OG-6` remains deferred

Scoring semantics are **unchanged**, and this slice deliberately did not broaden
them. Ordinary host score controls stay available for **every** team, including
teams that never buzzed and teams whose turn is over; buzzing scores nothing;
promotion scores nothing; score adjustments remain the existing durable command;
answer reveal and clue closure clear the response state; and a stale queue command
cannot touch a later clue. The host can see the active respondent while scoring
because both panels are on screen together. A test asserts that a non-active team
can still be scored.

### 18. Host and projector surfaces

**Host.** A fourth bounded panel beside the board, scoring and timer panels. It
shows whether keyboard buzzing is on, each team's buzz key, the active team and
the full ordered waiting queue; it offers capture, clear, reset-to-defaults, an
on/off switch, "Mark incorrect and advance" and "Pass and advance"; and it
explains, in a sentence, why any press did nothing. Arming is **not** duplicated
here — it stays in the response-window panel, so the application has exactly one
arming control.

**Key capture** enters an explicit mode, suspends game buzzing for its duration
(so pressing a key to assign it can never also fire it), announces itself in a
polite live region, cancels on Escape and on a second click, traps no focus, and
refuses reserved or conflicting keys without overwriting anything.

**Projector.** The active team's name, large, plus "*N* teams waiting". Nothing
renders until someone buzzes. No animation at all — a team taking the floor is
information, and information does not flash.

### 19. Accessibility

Every host control is a real `<button>`, keyboard-reachable in DOM order with the
shared focus ring; disabled controls stay visible. Capture state, mapping
conflicts, queue changes and press outcomes are announced through **polite** live
regions. Every state is text — on/off, armed/not armed, active team, waiting
queue, exhausted — so colour is never the carrier. No single-key shortcut fires
while typing. Focus is never trapped and never moved out from under the teacher by
a promotion. There is no flashing, no motion and no audio anywhere in this slice.

## Alternatives considered

**A `source: 'keyboard'` field on the durable buzz event.** Rejected: no consumer
in this slice needs it, ADR-004's "never a speculative entry" rule applies, and a
field nobody reads acquires meaning by accident. A history should answer "who
buzzed first", not "which laptop peripheral was plugged in". Slice 9 may add it
*with* its consumer.

**A formal input-adapter registry object** (`ROADMAP-AMENDMENT-001` §5.6).
Rejected for now: with one adapter it is a framework without a user. A bounded,
application-only union delivers the same guarantees — no content-controlled
registration, no dynamic import, explicit known/unknown — with nothing to maintain.

**Two commands, `MARK_INCORRECT` and `PASS`.** Rejected: they perform the identical
transition and differ only in intent, which ADR-006 §7 already established belongs
in a typed field rather than in duplicated commands.

**A `correct` resolution member.** Rejected: it would be a second way to end a clue,
competing with the answer reveal that already does it.

**Automatic score deduction on `incorrect`.** Rejected: it breaks ADR-006's
reveal/score independence and takes a judgement out of the teacher's hands.

**First-only lockout.** Rejected by OG-2.

**Closing intake on the first buzz.** Rejected: a queue that can only ever hold one
team is not a queue, and OG-2 and OG-3 both presuppose more than one entry.

**Naming secondary slots after colours.** Rejected outright: it would put a Sony
vocabulary into the engine, which is the one thing the owner direction forbids.

**Publishing the full ordered waiting queue.** Rejected: it is a reaction-time
ranking by another name, it is not legible under a live clue, and the count carries
the useful part.

**Making `buzz` optional to avoid the wire bump.** Rejected: see §14.

**Binding `KeyboardEvent.key` instead of `code`.** Rejected: see §4.

**Treating a focused `<button>` as typing.** Rejected: see §5.

**A dedicated `phaseId`/`opportunityId` for stale rejection.** Rejected as more
surface than needed — `(roundId, tileId)` already exists and already identifies the
response opportunity exactly.

**Broadening scoring to the active respondent only (OG-6).** Not done. It is not
necessary for the queue workflow, and narrowing scoring globally is an owner
decision, not an implementation convenience.

**A tie-adjudication UI (OG-4).** Rejected: the roadmap does not ask for it, and it
would imply a precision this design refuses to claim.

## Consequences

**Good.** The engine gained a real input without giving up a single invariant:
replay is still bit-exact and clock-free, the reducer is still pure, the sanitizer
is still an allow-list, undo is still exact, and the sync channel is still a
snapshot transport. Slice 7's interruption seam absorbed buzz-in for the cost of
one union member, which is the strongest available evidence that it was cut in the
right place. The boundary is hardware-shaped rather than keyboard-shaped, so Slice
9 adds a source member plus an adapter and touches nothing else. Secondary actions
are representable, mappable and provably inert, so Slice 10 can define coloured
buttons without a contract change.

**Costs and limits.** `PublicState` version 5 consumers fail closed; there is no
migration and none is implied. A buzz that stops a clock takes two undos to
reverse fully. Keyboard mappings are per-device and per-browser-profile: they do
not travel with the game file and are lost if the teacher clears site data, by
design. `code` values are physical positions, so a mapping read as text is not the
keycap. Nothing here measures reaction time, and nothing here claims to resolve a
true physical tie. The queue does not survive a clue change, a round change or a
reload — session state is still in memory only, until Slice 13. No hardware has
been tested.

## Owner decisions recorded

| Gate | Decision | Status after Slice 8 |
| --- | --- | --- |
| **OG-1** | Arming is manual and host-controlled | **Implemented** (Slice 7); reused here as the queue's intake gate, with no second flag. |
| **OG-2** | A full ordered queue, not first-only lockout | **Implemented by Slice 8** — §8. |
| **OG-3** | Promotion after an incorrect response or a host pass | **Implemented by Slice 8** — §11. |
| **OG-4** | Tie handling on identical arrival stamps | **Resolved** — §13. Sequence is the deterministic tiebreaker; timestamps are evidence; no adjudication UI. |
| **OG-5** | Whether a queue may outlive a reveal or a transition | **Resolved** — §12. It may not: the queue belongs to one clue's response opportunity. |
| **OG-6** | Whether scoring is restricted to the active respondent | **Deferred and NOT implemented** — §17. Scoring is unchanged and stays available for every team. |

## Explicit non-goals (Slice 8)

No Gamepad API, WebHID, Bluetooth, USB or HID handling of any kind. No Sony Buzz!
detection, vendor/product identification, button numbering, handset assignment,
coloured-button defaults or controller setup wizard — all of that is Slice 10, and
none of it exists. No phone, networked or student-owned-device buzzing. No
secondary-action gameplay. No automatic scoring of any kind. No reaction-time
measurement or claim. No session persistence or recovery (Slice 13). No portable
export/import. No media, theme engine, authoring, packs, wagering, reporting or
leaderboards. No backend, accounts, cloud, analytics, tracking or AI. No
additional playable round type. No proprietary branding, sounds or assets.
