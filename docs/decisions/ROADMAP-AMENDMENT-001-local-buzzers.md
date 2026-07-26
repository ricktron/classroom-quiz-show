# Roadmap Amendment 001 — Local buzzers, timing/arming boundaries, and slice reordering

- **Amendment id:** `ROADMAP-AMENDMENT-001`
- **Slice identifier:** `CQS-ROADMAP-AMENDMENT-1`
- **Status:** Accepted (owner-authorized planning decision)
- **Date:** 2026-07-26
- **Base `main`:** `64000ab76ec83e3dedbc968ab3e92dbff8872fc6`
- **Type:** decision + documentation only — **no runtime code, no schema change,
  no test change, no dependency change**
- **Amends:** the 11-slice sequence in [`../plans/MVP-ARC.md`](../plans/MVP-ARC.md)
  and the "Major non-goals (MVP)" statement in [`../PROJECT.md`](../PROJECT.md)
- **Supersedes:** the roadmap statements listed in §19

---

## 1. Context

Slices 1–6 are `Complete` and merged. The repository now has a command/event
core with deterministic replay and auditable undo (ADR-002), a typed game/round
model behind a non-executable registry (ADR-003), one canonical validation and
import pipeline (ADR-004), one playable round type (ADR-005), and the first
scoring strategy (ADR-006). `PublicState` is at wire version 4.

Slice 7 (Timers & transitions) was next on the plan of record and is unstarted.

The owner has since selected **local physical buzzers** as a desirable future
capability, with **Sony Buzz! USB quiz controllers** as the preferred initial
validation target, delivered through a hardware-agnostic local input
architecture. That direction interacts with the existing MVP non-goal excluding
"student devices/buzzers", and it interacts with Slice 7, because timers and
buzz-in are the same interaction in a classroom: a clue is armed, a clock runs,
someone buzzes, and the clock stops.

This amendment resolves both, and takes the opportunity to re-examine the
ordering of media, export/import, migration policy, persistence, and reporting.

## 2. Evidence reviewed

Everything in this section was **read directly in this slice** at
`64000ab`. Nothing else is claimed.

| Evidence | What it established |
| --- | --- |
| `src/state/commands.ts` (esp. the determinism note, ll. 17–19; `CommandBase.issuedAt`, l. 45) | Every command carries a host-supplied `issuedAt`; **"the reducer copies it onto the resulting event and never reads the clock itself, so replaying a stored history is fully deterministic."** |
| `src/state/events.ts` (`EventBase`, ll. 44–56; `EVENT_TYPES`, ll. 25–41) | Events carry a monotonic `seq` (append index) and an `occurredAt` **copied from the command, never re-derived**. Reversibility is a per-event property. 15 event types exist; none is a timer or buzz event. |
| `src/state/reducer.ts` (l. 392 ff., `const at = command.issuedAt`) | The planner is pure; the only clock read in the whole gameplay path happens in host UI components (`Date.now()` at the dispatch site). |
| `src/host/*.tsx` (`FoundationControls`, `CategoryBoardHostPanel`, `TeamScoringPanel`) | Confirms the clock lives **at the edge**: `const now = () => Date.now()` at the dispatch boundary, nowhere deeper. |
| `src/state/publicState.ts` (`PUBLIC_STATE_SCHEMA_VERSION = 4`, `PublicState`, ll. 252–280) | `PublicState` is a whole-state **snapshot** with a monotonic `revision`. |
| `src/sync/protocol.ts`, `src/sync/receiver.ts` (l. 48: `if (revision <= lastRevision) return`) | The display applies only **strictly newer** snapshots; stale and duplicate revisions are dropped. |
| `src/game/categoryBoard/schema.ts` (ll. 86–93), `src/game/categoryBoard/definition.ts` (ll. 60–62), `src/state/publicState.ts` (l. 121) | `prompt` and `answer` are **bare `string`s** in the authored schema, the trusted domain model, **and** the public DTO. |
| `docs/architecture/GAME-ENGINE-BOUNDARIES.md` §9 | Permanent invariant: **"no type or component may assume a prompt is a plain string."** |
| `docs/architecture/GAME-ENGINE-BOUNDARIES.md` §4, §5, §6, §7, §12, §13 | Host-authoritative → sanitized public state; imported content is data, never code; command/event architecture status through Slice 6; scoring-strategy seam; Slice 1 deferrals (incl. "student buzzers"); the permanent testing policy. |
| `src/import/canonicalFormat.ts` (ll. 41–59) | `SUPPORTED_SCHEMA_VERSION = 1`; `SUPPORTED_SCHEMA_VERSIONS` is a one-entry list; a future version may be added **"only alongside a real, tested migration — never as a speculative 'probably compatible' entry."** |
| `docs/architecture/ADR-004-canonical-validation-import.md` (§ on versioning, ll. 98–100, 257) | The same rule, stated as an accepted decision. |
| `docs/architecture/ADR-006-teams-and-scoring.md` + `src/import/schemas.ts` (l. 101) | Precedent that an **additive optional** field extends `schemaVersion: 1` without a version bump, because "every previously valid document still means exactly the same thing". |
| `docs/architecture/ADR-002…ADR-006` | The retained architecture summarized in §3. |
| `docs/plans/MVP-ARC.md` | The 11-slice plan of record and its "must not be silently rewritten" guard. |
| `docs/PROJECT.md` | The MVP non-goals and the approved product decisions. |
| `docs/decisions/README.md` | Which decisions are ADRs, which are owner decisions, and when to escalate. |
| `docs/receipts/README.md` | The receipt discipline: record only what was observed; label unverified claims. |
| `docs/STATUS.md`, `docs/handoff/CURRENT.md` | Current durable status: Slices 1–6 Complete, Slice 7 unstarted and owner-gated. |
| `git` history and `origin/main` | PR #12 merged as `64000ab`; Slice 6 Complete on every canonical surface. |
| `grep` over `src/` and `tests/` for `timer`/`buzzer`/`gamepad` | **Every occurrence is a negative assertion** — guard tests asserting those features do not exist (e.g. `src/state/categoryBoardReducer.test.ts:518`, `src/host/TeamScoringPanel.test.tsx:532`). Zero implementation. |

### Non-claim — the public precedent review

> **The public precedent review was not locatable in this repository, its
> history, its issues, or its pull requests, and was not inspected in this
> slice. Roadmap decisions were made from the owner's supplied direction and
> repository-native architecture and dependency analysis.**

No factual finding in this document is attributed to that review. The owner's
summary of it is recorded in §5.0 **as owner direction only**, not as a finding
of a document this slice read.

## 3. Architecture retained

This amendment changes **ordering and scope**, not architecture. All of the
following remain binding and unmodified:

1. **Command → pure reducer → append-only event log → `replay()`** (ADR-002).
2. **Undo is an auditable `EVENT_UNDONE` marker**, never a deletion.
3. **The reducer never reads a clock, a random source, or a locale-dependent
   ordering.** Wall-clock enters only as a command's `issuedAt`.
4. **Allow-list `toPublicState` is the only private → public path**; the display
   is read-only and fails closed (§4).
5. **Imported content is data, never executable code** (§5, ADR-004).
6. **One canonical import pipeline**, strict Zod, zero coercion, no silent
   repair, structured `ImportIssue`s with exact paths (ADR-004).
7. **Round types are registered by application code only**, with explicit
   known/unknown and no code-execution path (ADR-003).
8. **Scoring is a typed strategy** with typed `mode` and `source` (ADR-006).
9. **Reveal and score are independent in both directions** (ADR-006).
10. **`PublicState` is versioned and fail-closed**; a consumer pinned to an old
    wire version is rejected, never reinterpreted.
11. **The permanent testing policy** (§13).

Local buzzer support is required to fit *inside* this architecture. It gets no
private mutation path, no clock inside the reducer, and no bypass of the
sanitizer.

## 4. Problems with the current ordering

Four problems were identified from repository evidence, not from taste.

### 4.1 Timers introduce the first clock-dependent *value*, and nothing says where it lives

Every existing durable value is a **fact**: a tile was revealed, a score moved
by −200. A countdown's "8.3 seconds remaining" is not a fact; it is a function
of a start fact and the *current* clock. The repository's determinism rule is
explicit that the reducer must never read the clock, so remaining-time cannot be
replayed state — yet it must reach the projector.

This is unresolved in the current architecture and is an ADR-level decision, not
an implementation detail.

### 4.2 A ticking public value collides with the snapshot/revision sync model

`PublicState` is a whole-state snapshot and `receiver.ts` applies only strictly
newer revisions. A ticking public countdown therefore forces a choice between
publishing a new revision per tick (turning every frame into a "state change")
and publishing an absolute **deadline** once and letting the display compute
remaining time locally. The latter is almost certainly right, but it makes the
display hold derived presentation state for the first time — today it is a pure
snapshot renderer.

### 4.3 "Stop the clock when someone buzzes" is the dominant classroom interaction

If Slice 7 ships a timer whose event vocabulary has no notion of being
*interrupted*, adding buzz-in later changes that vocabulary — exactly the rework
the slice plan exists to avoid. The timer's **durable contract** must accommodate
an interrupt from the start, even before any buzzer exists.

### 4.4 The media invariant is already being violated, and the cost compounds

`GAME-ENGINE-BOUNDARIES.md` §9 states as a permanent invariant that **no type or
component may assume a prompt is a plain string**. Slice 5 shipped
`prompt: string` and `answer: string` in the authored schema, the trusted domain
model, and the public DTO. Every additional round type and every additional
prompt consumer deepens that assumption, and each one is rework when media
lands. Media is currently scheduled tenth of eleven.

**Note on the dependency direction (4.3 vs. buzzers):** buzzers do **not** need
timers. Buzz *ordering* is already available from `seq` (the monotonic append
index) and arrival *evidence* from `occurredAt` (frozen at command time). Both
already exist. The dependency runs **timers → a buzz-aware timing contract**,
not buzzers → timers.

## 5. Decisions

Each decision is labelled **DECIDED**, **RECOMMENDED (not authorized)**,
**DEFERRED (owner gate)**, or **REJECTED**.

### 5.0 Owner direction recorded (not a finding of any document this slice read)

**DECIDED — recorded as owner direction.** The owner's summary of the
unavailable precedent review is recorded only as direction:

- preserve the existing architecture;
- reconsider roadmap ordering;
- evaluate earlier media, import/export, migration policy, persistence, local
  buzzers, and reporting.

### 5.1 Slice 7 remains next, re-scoped and renamed

**DECIDED.** Slice 7 stays the next implementation slice, but is renamed from
**"Timers & transitions"** to **"Timers, arming & transitions"** and re-scoped so
that its contract is **buzz-aware by construction**.

Rationale: §4.1–§4.3 are all Slice 7 problems, and §4.3 specifically means the
timer's event vocabulary must accommodate an interrupt before any adapter exists.
Nothing in §4 justifies delaying timers behind buzzers, and the dependency note
shows buzzers do not need timers.

**A separate contract-only slice was considered and rejected.** This repository
has an established pattern of building a seam *with its first consumer* rather
than alone: ADR-003 froze round *support* onto events while only a placeholder
round type existed; ADR-006 shipped a typed `mode`/`source` pair so a second
scoring strategy is an addition rather than a parallel system. A contract with no
consumer would be speculative, which ADR-004's "never a speculative entry" rule
disfavours. Slice 7 therefore delivers the timing/arming contract **and** its
first real consumer (host-driven timers and transitions).

### 5.2 The clock stays at the edge; only facts are durable

**DECIDED (architecture-forced).**

- Durable events may record **facts**: a timer was started with a stated
  duration, a timer expired, a timer was cancelled, a clue was armed, an arming
  was interrupted.
- Durable events may **not** record a continuously-varying remaining-time value.
- The wall-clock is read only at the dispatch edge and enters the log as
  `issuedAt` → `occurredAt`, exactly as every existing command does.
- Consequently **replay of a stored history remains bit-exact** and requires no
  clock.

### 5.3 Public timing values are projected as an absolute instant, not a tick stream

**DECIDED (architecture-forced by §4.2).** The public projection carries the
**deadline** (and the arming state), not a per-frame countdown, and the display
derives remaining time locally. Rationale: the snapshot/revision model drops
non-newer envelopes and is not a frame transport, and a deadline is a fact while
"seconds left" is not.

The exact field shape is left to Slice 7's ADR. What is fixed here is that the
sync channel must not become a tick transport.

### 5.4 The interrupt seam must be typed and must not need re-cutting for buzz

**DECIDED.** Slice 7 must express "this arming ended because something
interrupted it" as a **typed** property of the event, in the same spirit as
ADR-006's `ScoreSource`. Slice 7 implements only the sources it actually has
(host action, expiry); a future buzz source must be addable **without changing
the event vocabulary**, and any unrecognized source must fail closed.

This is an architectural constraint, not an implementation prescription. The
concrete union, names, and field layout belong to Slice 7's ADR.

### 5.5 Local buzzer work is split into three bounded slices

**DECIDED.** The full capability is too large for one slice. It is split so that
each slice pairs a contract with a real consumer:

| Slice | Scope |
| --- | --- |
| **8 — Local input contract & keyboard buzz-in** | The device-independent input-adapter boundary, buzz-in domain semantics, the buzz command/event pair, reducer-derived queue state, the sanitized public projection — plus the **keyboard adapter** as its first consumer. |
| **9 — Generic Gamepad adapter** | Gamepad API adapter behind the same boundary, connect/disconnect handling, polling isolation, host diagnostics. No model-specific assumptions. |
| **10 — Sony Buzz! mapping, validation & host setup UX** | Configurable controller mapping, Sony Buzz! validation as the preferred target, the host setup/test surface, fallback behaviour. |

Keyboard is deliberately the first adapter: it needs no hardware, it exercises
the whole path end to end, and it is permanently useful as the no-controller
fallback the owner requires (direction 12).

Accessibility and fallback behaviour are **not** a separate slice; each of 8, 9
and 10 carries its own accessibility acceptance criteria, matching how every
slice so far has done accessibility inline rather than deferring it.

### 5.6 A formal input-adapter registry is introduced, modelled on the round registry

**DECIDED.** Slice 8 introduces an explicit input-adapter boundary with a
registry, mirroring ADR-003's round registry:

- adapters are registered by **application code only** — game content can never
  register or influence an adapter, and there is no code-execution path from
  content to input;
- lookup is explicit known/unknown with **no fallback and no dynamic import**;
- an unknown or unavailable adapter fails closed and the app remains fully
  usable.

**The boundary chain, fixed by this amendment:**

```
physical device                    (USB HID / keyboard hardware)
      ↓  browser API               (KeyboardEvent / Gamepad API)  — host-private
input adapter                      (device-specific, registered by app code)
      ↓  mapped logical team input (teamId + arrival stamp)       — host-private
command validation                 (planner: armed? known team? duplicate?)
      ↓  accepted fact
append-only event                  (typed, reversible, carries occurredAt)
      ↓  replay
reducer-derived buzz state         (queue order from seq; no cache)
      ↓  toPublicState allow-list
sanitized public state             (ordered team keys + names only)
      ↓
projector rendering                (read-only, fails closed)
```

**Host-private, and never in an event or in `PublicState`:** raw device or vendor
/product identifiers, HID reports, button indices, axis values, poll intervals
and timings, mapping tables, calibration data, and every diagnostic reading.
What crosses into the command layer is a **mapped logical team input** and
nothing else.

### 5.7 Buzz semantics — what is forced, and what the owner must still decide

Some of the candidate default policy is forced by existing architecture and is
therefore **DECIDED**. The rest is product policy and is **DEFERRED** with a
named gate. The candidate default is **not** silently promoted.

**DECIDED (each forced by an existing rule, not by preference):**

| Behaviour | Forced by |
| --- | --- |
| A press before arming produces **no event** and does not change the revision. | The existing planner contract: a rejected command appends nothing (ADR-002/005/006). |
| **Arrival order is `seq` order.** `occurredAt` is *ordering evidence*, not a reaction-time measurement, and is never presented as one. | The reducer cannot read a clock; `occurredAt` is a host-supplied stamp, not an instrument reading. |
| Duplicate-press suppression is **derived from replayed events**, never from a mutable cache. | "No write path outside `reduce`" (ADR-006). |
| Undo of a buzz appends `EVENT_UNDONE` and restores the prior queue **exactly**. | ADR-002; and ADR-006's proof that derived state undoes exactly. |
| **Host override is always available**, and the host remains authoritative. | §4 host-authoritative boundary. |
| A controller disconnecting mid-arming **fails gracefully and never fabricates a buzz**. | Owner direction 12; §4 fail-closed. |
| **Buzzing never scores, and scoring never consumes a buzz.** Correction is undo-or-compensate. | ADR-006's reveal/score independence, extended by symmetry. |
| Raw device data never reaches an event or the projector. | §4, §5.6 above. |

**DEFERRED — owner gates (product policy; this slice does not decide them):**

| Gate | Question |
| --- | --- |
| **OG-1** | Manual arming (host presses "arm") vs. automatic arming on prompt reveal. |
| **OG-2** | First-only lockout vs. recording the full ordered queue. |
| **OG-3** | Whether an incorrect response or host pass promotes the next queued team automatically, and how many promotions are allowed. |
| **OG-4** | Tie handling when two presses share an `occurredAt` stamp — reject, host-resolve, or accept `seq` order silently. |
| **OG-5** | Whether a tile must remain open while a buzz queue is active, or a queue can outlive the reveal. |
| **OG-6** | Whether scoring is restricted to the currently active respondent, or stays unrestricted as it is today. |

The candidate default offered by the owner (ignore pre-arming presses; record the
full ordered queue; promote the next queued team after an incorrect response or
host pass; keep host override; arrival order authoritative; treat milliseconds as
ordering evidence only) is recorded here as **RECOMMENDED (not authorized)** for
OG-1 through OG-3. Its pre-arming, arrival-order and milliseconds clauses are
already **DECIDED** above because they are architecture-forced. OG-4 through OG-6
are not addressed by the candidate and remain open.

**Slice 8 must not begin until OG-1, OG-2 and OG-3 are answered**, because they
determine the event vocabulary. OG-4 to OG-6 can be answered during Slice 8.

### 5.8 Media: pull the contract earlier, keep it additive on `schemaVersion: 1`

**DECIDED.**

- The **media contract moves earlier** than its current tenth-of-eleven position
  and, in particular, **must precede any new round type**. Grounds: §4.4 — the
  §9 invariant is already violated by bare-string prompts in three layers, and
  the cost compounds with every new prompt consumer.
- **A media contract is *not* required before timers or buzzers.** Neither adds a
  prompt consumer, so delaying media behind them costs nothing, and the owner has
  prioritized buzzers.
- **A media contract *is* required before portable export/import**, so the
  exported document does not have to be extended immediately afterwards.
- **Timers must not couple to media playback.** A timer must not derive its
  duration from media length, and media playback coordination (pause the clip,
  stop the clock) is **DEFERRED**.
- **Unsupported or unrecognized media fails closed** — no partial render, no
  placeholder that implies content exists. Grounds: ADR-004's unknown-round-type
  precedent and the §4 fail-closed display rule.
- **Media is an additive optional extension of `schemaVersion: 1`, not v2.**
  Grounds: ADR-006 §4's precedent — `teams` was additive on v1 because "every
  previously valid document still means exactly the same thing". A bare string
  prompt must remain valid and must keep meaning exactly what it means today
  (text). If a future media decision would change the meaning of an existing
  document, *that* is what triggers v2 — not the addition itself.

### 5.9 Import/export: portable export precedes persistence

**DECIDED.** Portable export and round-trip import is scheduled **before** local
persistence. Grounds, all repository-native:

- State is in-memory only and lost on tab close (a recorded known limitation).
  An exported file is the teacher's only durable, owned copy, and it works
  offline with no storage layer.
- Export stores **authored truth**; persistence stores **session/derived** state.
  Fixing the portable authored format first gives persistence a stable thing to
  store instead of the reverse.
- The single canonical import pipeline already exists (ADR-004). Export is its
  inverse, so **round-trip tests** (export → import → identical definition) are
  cheap and strong, and they must be an acceptance criterion.
- Reproducible game identity: moving a game between devices requires a stable,
  byte-predictable document before anything keys off game identity.
- Media references must exist in the format before export freezes it — hence
  media first (§5.8).

### 5.10 Migration policy: a documented policy is required; a framework slice is not

**DECIDED.** No separate migration-framework slice is created. Grounds: the seam
already exists and already behaves correctly — `SUPPORTED_SCHEMA_VERSIONS` is a
one-entry list, an unsupported version is rejected with an explicit
"no migration exists" message, and ADR-004 already states that a version may be
added *only* alongside a real, tested migration. A slice to build what is already
built would be speculative.

What **is** required, before any `schemaVersion: 2` work begins, is that the
following policy be recorded as an accepted decision in the slice that first
needs it:

1. **Single owner of the canonical version** — `src/import/canonicalFormat.ts`.
   No other module may define or infer a schema version.
2. **Backward compatibility** — a previously valid document keeps its exact
   meaning. Anything that changes the meaning of an existing document is a
   version bump, not an addition.
3. **Explicit migration functions** — a version enters
   `SUPPORTED_SCHEMA_VERSIONS` only together with a real migration and its
   tests. Never a speculative "probably compatible" entry.
4. **Fail closed on unsupported future versions** — a newer document is rejected
   with a structured issue; it is never partially read or "best-effort" parsed.
5. **Authored truth is preserved** — a migration is lossless with respect to
   authored intent; it does not repair, drop, reorder, or normalize away content.
6. **Fixtures per migration** — every migration ships fixtures for the old form,
   the new form, and at least one rejected form.
7. **Stored truth ≠ runtime state** — migrations apply to authored documents
   only. Replay-derived session state is never migrated; it is re-derived.

§5.8 keeps the project on v1, so no v2 work is imminent.

### 5.11 Persistence: after export/import, before reporting

**DECIDED.** Persistence does not move ahead of the buzzer work (it blocks
nothing the owner has prioritized) and does not move ahead of export/import
(§5.9). It must distinguish **saved game definitions** (authored, portable,
exportable) from **active session state** (event log, replay-derived), keep all
storage local and offline-only, and project nothing new to the display. Recovery
after an accidental refresh is its headline acceptance criterion.

### 5.12 Reporting: last, split, and normalized rather than raw

**DECIDED.**

- The **in-session scoreboard already exists** (Slice 6) and is out of scope for
  any reporting slice.
- A **per-session result summary** is the next increment and needs only a replay
  of the existing log — no persistence.
- **Cross-session comparison strictly follows persistence**, and additionally
  requires a **stable competitive-profile identifier**, because raw scores are
  comparable only between compatible game profiles (same ladder, same tile count,
  same multipliers).
- **Raw-score leaderboards are REJECTED as a default surface.** Comparing raw
  totals across differing games is misleading in a classroom.
- **Normalized metrics are preferred**: percentage of available points, category
  accuracy, wins, response accuracy.
- Reporting stays **team- or class-focused**. Individual student identity is
  **DEFERRED (owner gate OG-7)** and additionally constrained by the standing
  non-goal on "grading/defensible individual analytics".

## 6. Revised roadmap

Slices 1–6 are unchanged and `Complete`. Slices 7–18 below replace the former
slices 7–11. Full per-slice records (purpose, deliverables, exclusions,
prerequisites, completion evidence, impact, status, owner gate) are in
[`../plans/MVP-ARC.md`](../plans/MVP-ARC.md).

| # | Slice | Change from the 11-slice plan |
| --- | --- | --- |
| 7 | **Timers, arming & transitions** | Renamed and re-scoped (was "Timers & transitions"); contract must be buzz-aware |
| 8 | **Local input contract & keyboard buzz-in** | **New** |
| 9 | **Generic Gamepad adapter** | **New** |
| 10 | **Sony Buzz! mapping, validation & host setup UX** | **New** |
| 11 | **Media contract** | Moved earlier and decomposed out of the former slice 10 ("Media & theme boundaries") |
| 12 | **Portable export & round-trip import** | **New**; separated from the former slice 11 ("Authoring & packs") |
| 13 | **Local persistence & recovery** | Was slice 8; now after export/import |
| 14 | **Final-wager round** | Was slice 9; now after the media contract |
| 15 | **Session summary & compatible-profile reporting** | **New** |
| 16 | **Theme engine** | Decomposed out of the former slice 10 |
| 17 | **Authoring & packs** | Was slice 11, reduced (export/import extracted) |
| 18 | **Release readiness** | **New**: accessibility audit, polish, documentation completeness |

Additional round engines (image-identification, timeline-ordering, matching,
data-interpretation, concept-map, claim-evidence-reasoning, whiteboard) remain
registered round types added after the engine core is stable — and now
additionally **after the media contract (slice 11)**, per §5.8.

## 7. Local buzzer direction

Recorded as durable owner direction:

1. Classroom Quiz Show remains **fully usable with no buzzer hardware**.
2. Buzzer support is **local to the host device**.
3. **No phones, student accounts, cloud service, WebRTC, Bluetooth requirement,
   or classroom Wi-Fi** is required.
4. The runtime remains **offline-capable**.
5. Hardware input enters through a **device-independent local input adapter**.
6. **Keyboard and generic Gamepad input share the same command boundary.**
7. Sony Buzz! support is delivered through **configurable mapping**, never
   hard-coded assumptions about one model.
8. Raw device details, button mappings, diagnostics and timing internals stay
   **host-private**.
9. **Only sanitized buzzer state** reaches the projector.
10. Buzz actions integrate with the **existing command/event/reducer**
    architecture; they never mutate state directly.
11. **Replay deterministically reproduces recognized buzz order** from recorded
    events.
12. The application **fails gracefully when no supported controller is
    connected**.
13. **Networked buzzer architectures remain deferred and unauthorized.**

## 8. Sony Buzz! integration position

- Sony Buzz! USB controllers (wired PS2/PS3-era sets and compatible USB receiver
  variants) are the **preferred initial validation target** — not an exclusive
  dependency and not a supported-hardware guarantee.
- Support arrives in **slice 10**, behind the slice 8 adapter boundary and the
  slice 9 generic Gamepad adapter. It is a **mapping and validation** slice, not
  a driver.
- No device-specific assumption may leak above the adapter: the command layer
  sees a mapped logical team input, never a button index.
- **Not claimed anywhere:** that any specific controller model, revision, or USB
  receiver has been tested. No hardware has been tested in this repository, and
  nothing in this amendment implies a compatibility list.

## 9. Timer/buzzer dependency analysis

**Result: timers first, buzzers second — but the timer contract must be
buzz-aware.**

| Question | Finding |
| --- | --- |
| Do buzzers need timers? | **No.** Ordering comes from `seq`; arrival evidence from `occurredAt`. Both already exist and are already deterministic. |
| Do timers need buzzers? | **No** — but a timer that cannot express *being interrupted* forces vocabulary rework when buzz lands (§4.3). |
| Where does elapsed/remaining time live? | Not in durable events. Facts (start with a stated duration, expiry, cancellation) are durable; remaining time is derived at render time from a projected **deadline** (§5.2, §5.3). |
| Do elapsed timing values belong in events? | **No.** A recorded duration or deadline is a fact; a running count is not. |
| Arming/disarming ownership | The **host** arms and disarms; arming is session state derived from replayed events, never a mutable flag. |
| Transition ownership | The **host** owns transitions, and they remain undoable — unchanged from the existing round-transition model. |
| Pause/resume | **DEFERRED.** Pausing a deadline-based timer means recording a pause fact and re-deriving a new deadline on resume. It is expressible within §5.2 but is not required for slice 7 and is not decided here. |
| Do buzz queues survive transitions? | **DEFERRED (OG-5-adjacent).** ADR-005's precedent is that per-round state *resumes* on return, so the default expectation is per-round scoping — but this is not decided here. |
| Would timers otherwise need rework? | **Yes**, on the interrupt seam (§4.3) and on the public projection shape (§4.2). Both are settled by §5.3 and §5.4 before any code is written. |

## 10. Media decision

See §5.8. Summary: contract pulled earlier (slice 11) and required before any new
round type; **not** required before timers or buzzers; required before portable
export; unsupported media fails closed; **additive on `schemaVersion: 1`, no v2**;
timer/media playback coupling deferred.

## 11. Import/export decision

See §5.9. Summary: **portable export and round-trip import (slice 12) precedes
persistence (slice 13)**, and follows the media contract so the format is not
frozen and immediately extended. Round-trip equality is an acceptance criterion.

## 12. Migration policy decision

See §5.10. Summary: **no migration-framework slice**; the seam already exists. A
seven-point migration policy must be recorded as an accepted decision **before
any `schemaVersion: 2` work**. §5.8 keeps the project on v1 for now.

## 13. Persistence decision

See §5.11. Summary: **slice 13**, after export/import, before reporting. Local
and offline only; saved definitions strictly separated from active session state;
projects nothing new to the display; recovery-after-refresh is the headline
criterion.

## 14. Reporting and leaderboard decision

See §5.12. Summary: in-session scoreboard already done; **per-session summary**
next (slice 15, replay-only); **cross-session comparison follows persistence and
needs a stable competitive-profile identifier**; **raw-score leaderboards
rejected as a default**; normalized metrics preferred; team/class-focused only,
with individual identity deferred (OG-7).

## 15. Explicit exclusions

**Confirmed still excluded** — each requires a separate owner decision to
reconsider:

- student accounts;
- **networked phone buzzers** and any student-owned-device buzz-in;
- server-backed lockout;
- WebRTC;
- **required** Bluetooth controller support;
- cloud-required play;
- AI-generated questions;
- executable third-party content;
- H5P-style embedded scripts;
- and, unchanged from PROJECT.md: no backend, no accounts, no LMS integration,
  no cloud dependencies, no AI services, no grading or defensible individual
  analytics, and no imitation of any commercial game show's branding, audio, or
  board styling.

### The product-scope amendment (owner-authorized)

**Previous approved non-goal** (`docs/PROJECT.md`, "Major non-goals (MVP)"):

> No backend, no accounts, **no student devices/buzzers**, no LMS integration, no
> cloud dependencies, no AI services, no grading/defensible individual analytics,
> and no imitation of any commercial game show's branding, audio, or board
> styling.

**Narrowed replacement** — the exclusion of *student devices* is retained in
full; only *host-attached local buzzer hardware* is carved out:

> No backend, no accounts, **no student-owned devices and no student phones**, no
> LMS integration, no cloud dependencies, no AI services, no
> grading/defensible individual analytics, and no imitation of any commercial
> game show's branding, audio, or board styling.
>
> **Local host-attached USB buzzer controllers are an approved future
> capability** (Sony Buzz! USB controllers are the preferred initial validation
> target). The product must remain fully usable without buzzer hardware.
> Networked buzzers, student-owned devices and student phones remain excluded,
> and no backend, account, WebRTC, Bluetooth requirement, cloud dependency or
> classroom Wi-Fi dependency is authorized.

**Why host-attached USB preserves the original intent.** The original non-goal
bundled two different things: *student-owned devices* and *buzzers*. What it was
protecting was privacy, offline operation, and operational simplicity — a
teacher should not need student phones, accounts, a network, or a backend to run
a game. A USB controller plugged into the host keeps every one of those
properties:

- **Privacy** — no student device, no account, no identity, no data leaves the
  host. The device is anonymous hardware; a controller press is a *team* input,
  not a person's.
- **Offline** — USB HID needs no network. The PWA stays fully offline-capable,
  and nothing in the deploy or runtime model changes.
- **Operational simplicity** — plug in one device; no pairing step is required,
  no per-student setup, no classroom Wi-Fi, no captive portal, no IT ticket.
- **Existing invariants intact** — input passes through an adapter into the
  normal command/event/reducer path, so host authority, the sanitizer, replay
  and undo all apply unchanged.

**Which buzzer architectures remain rejected:** student phones and any
student-owned device as a buzzer; networked or LAN buzzers; server- or
cloud-backed lockout; WebRTC or WebSocket buzz transport; any design that
*requires* Bluetooth pairing, classroom Wi-Fi, accounts, or a backend; and any
design that carries student identity rather than team identity.

## 16. Deferred owner decisions

| Gate | Decision | Blocks |
| --- | --- | --- |
| **OG-1** | Manual vs. automatic arming | Slice 8 start |
| **OG-2** | First-only lockout vs. full ordered queue | Slice 8 start |
| **OG-3** | Promotion after an incorrect response or host pass | Slice 8 start |
| **OG-4** | Tie handling on identical arrival stamps | During slice 8 |
| **OG-5** | Whether a tile must stay open while a queue is active; whether queues survive transitions | During slice 8 |
| **OG-6** | Whether scoring is restricted to the active respondent | During slice 8 |
| **OG-7** | Whether reporting may ever carry individual student identity | Slice 15 scope |
| **OG-8** | Timer pause/resume semantics | Optional in slice 7; deferred by default |
| **OG-9** | Timer/media playback coordination | Slice 11 or later |

## 17. Consequences

- **Slice 7 can be authorized immediately** with no open gates. It is the only
  slice in the revised plan with none.
- **Slices 8–10 are gated** on OG-1 to OG-3 (vocabulary-determining).
- The plan grows from 11 to 18 slices. This is decomposition, not scope growth:
  the added slices carve existing scope into bounded pieces plus one genuinely
  new capability (local buzzers) that the owner has authorized.
- Media moving from tenth to eleventh looks like a small change but is the
  substantive one: it now **precedes every new round type**, including the
  final-wager round, which previously preceded it.
- Timer implementation gains two hard constraints (§5.3, §5.4) that did not
  exist before, which is the point — they are cheaper as constraints than as
  rework.
- No existing code, test, schema, workflow or dependency changes as a result of
  this amendment.
- `PublicState` stays at wire version 4 until a slice actually adds a field.
- The repository remains on `schemaVersion: 1` with no migration.

## 18. Risks

- **The precedent review is unavailable.** If it contained findings that
  contradict §5, this amendment will need revisiting. Recorded as a limitation,
  not hidden.
- **Timer public-projection risk.** §5.3 fixes the shape but not the drift
  behaviour; host and display clocks are not synchronized, and a deadline
  computed on the host is interpreted against the display's clock. Slice 7 must
  measure and bound this, or project a duration-from-receipt instead.
- **Gamepad API risk.** Browser gamepad support requires a user gesture before
  devices appear, reports vary by browser and OS, and Sony Buzz! sets present as
  a single device with multiple controllers. Slice 9 and 10 must treat detection
  as unreliable and fail closed — this is a real integration risk, not a
  formality.
- **No hardware has been tested.** The Sony Buzz! target is a plan, not a
  validated compatibility claim.
- **Decomposition risk.** Three buzzer slices could each look small while the
  seam between them drifts. Slice 8's contract must be strong enough that 9 and
  10 add adapters without touching it.
- **Deferred-gate risk.** Six open gates on buzz semantics could stall slices
  8–10. They are enumerated with owners so they can be answered in one sitting.

## 19. Superseded roadmap statements

These statements were accurate when written and are **not** rewritten in place
where they are historical. They are superseded by this amendment:

1. **`docs/plans/MVP-ARC.md`, the 11-slice table** — rows 7–11 are replaced by
   the twelve rows in §6.
2. **`docs/plans/MVP-ARC.md`, "What remains for Slice 7"** — "Timers &
   transitions: timer configuration, a public timer, host-controlled undoable
   round transitions, and reduced-motion-safe presentation" is superseded by the
   re-scoped slice 7 in §5.1, which adds the buzz-aware interrupt seam and the
   two projection constraints.
3. **`docs/plans/MVP-ARC.md`, "Additional round engines … after the engine core
   (slices 2–7) is stable"** — additional round types must now also follow the
   media contract (§5.8).
4. **`docs/PROJECT.md`, "Major non-goals (MVP)"** — the "no student
   devices/buzzers" clause is narrowed as set out in §15.
5. **Any statement that the roadmap contains 11 slices** — it now contains 18.
6. **`docs/handoff/CURRENT.md` and `docs/STATUS.md` "next action" statements**
   naming an unamended roadmap — superseded by §20.

Receipts are **never** superseded or edited; each remains true for the moment it
recorded.

## 20. Next authorized slice candidate

**Slice 7 — Timers, arming & transitions.**

It is the only slice in the revised plan with **no open owner gate**, it is
unblocked by every dependency in §9, and §5.2–§5.4 give it enough architectural
constraint to be authorized without ambiguity.

It remains **unstarted and owner-gated**: this amendment recommends it as the
next slice but does **not** authorize or begin it.
