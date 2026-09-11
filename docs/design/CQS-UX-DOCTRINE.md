# CQS UX doctrine

- **Document id:** `CQS-UX-DOCTRINE`
- **Program:** `CQS-REAL-MVP-1`
- **Registering slice:** `CQS-UX-GUIDANCE-S01-FOUNDATION`
- **Authorization:** `AUTHORIZE-CQS-UX-GUIDANCE-S01-FOUNDATION-1`
- **Date:** 2026-09-11
- **Status:** **ACTIVE — adopted cross-product design doctrine**
- **Kind:** synthesized CQS interaction/experience guidance. **Documentation
  only. This file authorizes no implementation.**

This is the adopted cross-product CQS interaction doctrine. It is CQS's own
position, not a summary of any book. Where external literature influenced a
principle, the influence — and how strongly it was actually verified — is
recorded in
[`../research/CQS-UX-SOURCE-PRINCIPLE-MATRIX.md`](../research/CQS-UX-SOURCE-PRINCIPLE-MATRIX.md).

Authority: this doctrine sits below observed implementation,
[`../PROJECT.md`](../PROJECT.md),
[`../CQS-PRODUCT-CONTRACT.md`](../CQS-PRODUCT-CONTRACT.md),
[`../STATUS.md`](../STATUS.md), accepted ADRs, and the current Program plan.
See [`README.md`](README.md) §4.

Surface-by-surface application lives in
[`CQS-UX-SURFACE-INVENTORY.md`](CQS-UX-SURFACE-INVENTORY.md).

```text
make the SYSTEM understandable
make the INTERFACE understandable
make the INTERACTION serve the teacher's classroom goal
```

---

## Principle index

Principles are grouped thematically below, not numerically. This index is the
lookup table.

| ID | Principle | Section |
| --- | --- | --- |
| `CQS-UX-P01` | Goal-first design | §1 |
| `CQS-UX-P02` | One dominant next action | §1 |
| `CQS-UX-P03` | Interrupted-attention design | §1 |
| `CQS-UX-P04` | Situation awareness | §2 |
| `CQS-UX-P05` | Exception before detail | §2 |
| `CQS-UX-P06` | Teacher mental model over implementation model | §3 |
| `CQS-UX-P07` | Stable conceptual mapping (applied to hardware in §6) | §3, §6 |
| `CQS-UX-P08` | Explicit and honest system status | §2 |
| `CQS-UX-P09` | Progressive disclosure | §4 |
| `CQS-UX-P10` | Surgical recovery | §4 |
| `CQS-UX-P11` | Classroom continuity | §4 |
| `CQS-UX-P12` | First-class keyboard fallback | §4 |
| `CQS-UX-P13` | Host/Display role separation | §5 |
| `CQS-UX-P14` | Distance-first Display design | §5 |
| `CQS-UX-P15` | Motion communicates causality | §9 |
| `CQS-UX-P16` | Immediate interaction feedback | §7 |
| `CQS-UX-P17` | Accessible, redundant cues | §10 |
| `CQS-UX-P18` | Efficient repeated authoring | §8 |
| `CQS-UX-P19` | Safe exploration and reversibility | §4 |
| `CQS-UX-P20` | Controlled terminology | §3 |
| `CQS-UX-P21` | Game/Session conceptual integrity | §3 |
| `CQS-UX-P22` | Save and recovery trust | §4 |
| `CQS-UX-P23` | Personality after clarity | §11 |
| `CQS-UX-P24` | Bounded design-system consistency | §11 |
| `CQS-UX-P25` | Real-classroom qualification | §1 |

The **one-second standard** (§7) is a named live-operation standard rather
than a numbered principle. Observed CQS findings `CQS-UXF-01`–`CQS-UXF-13`
are in §12.

---

## 0. The teacher this doctrine is written for

CQS's primary user is a teacher standing in front of a live class. The
canonical teacher goal is not "configure the software":

```text
My students are here. Get this game ready and let us play.
```

Everything below follows from taking that sentence literally.

Relationship to the S04B candidate: an unmerged S04B branch carries a
Host-setup **Interaction & information design** section in its own copy of the
Product Contract. This doctrine generalizes compatible ideas from that
candidate to the whole product and uses compatible vocabulary. It does **not**
supersede, edit, or reconcile that candidate, and it does **not** claim
canonical precedence over it. Principles marked **S04B-specific** below are
recorded as belonging to that lane's scope rather than as new cross-product
doctrine.

---

## 1. Teacher goal and attention

### `CQS-UX-P01` — Goal-first design

Design each surface from what the teacher is trying to accomplish, not from
the inventory of things the system can do. A panel that exists because a
subsystem exists is a design failure even when every control works.

**Anti-pattern.** A settings surface that mirrors module boundaries; a screen
whose organizing logic is "everything related to X" rather than "what you do
next".

### `CQS-UX-P02` — One dominant next action

On any surface, exactly one thing should read as the current task. Other
useful actions remain reachable; they do not compete visually for the same
rank.

Setup is a **guided workspace**, not a wizard: freely navigable, with one
dominant current task, where completed work becomes quieter and stays
revisitable.

**Anti-pattern.** Every option presented at equal hierarchy, leaving the
teacher to derive the order themselves — an observed CQS failure, see §12.

### `CQS-UX-P03` — Interrupted-attention design

Assume the teacher is interrupted constantly and will look away mid-task.
State must survive a glance away and be re-readable on return. Nothing
important may depend on having watched a transient moment.

Concretely: persist important state long enough to be understood; do not
convey a fact only through a message that has already disappeared; make it
possible to re-enter a half-finished setup and see where it stopped.

**Anti-pattern.** A toast that carried the only evidence of what happened; a
flow that must be restarted because attention lapsed.

### `CQS-UX-P25` — Real-classroom qualification

A surface is not judged by whether it works for its designer on a quiet
desktop. It is judged against realistic classroom conditions: interruption,
projector quirks, scaling, hardware that misbehaves, and a teacher with no
spare time. Usability is a **separate verdict** from functional correctness;
passing tests does not make a surface usable, and a usable-looking surface is
not correct.

S06 owns integrated qualification. This principle states the standard, not
the schedule.

---

## 2. Situation awareness

### `CQS-UX-P04` — Situation awareness

At any moment — especially during setup, recovery, and live operation — the
teacher should be able to answer, quickly and without reading prose:

1. Where am I?
2. What is happening?
3. What needs my attention?
4. What should I do next?
5. Can class continue?

Question 5 is the one CQS most often needs to answer explicitly, because it is
the question a teacher actually has.

### `CQS-UX-P05` — Exception before detail

Normal state, warning state, blocker state, recovery state, and diagnostic
detail must not share equal hierarchy. During live operation, prefer
**exception-first** presentation: show what is wrong and what it blocks;
leave everything that is fine quiet.

"Quiet" means low-prominence and confirmable, not absent — a teacher must
still be able to confirm that something is ready.

**Anti-pattern.** A readiness surface that shouts five green rows as loudly as
the one red row.

### `CQS-UX-P08` — Explicit and honest system status

Say what is ready, what is blocking, and why. Distinguish facts that are not
equivalent. For the supported Sony set, these are four different facts:

```text
receiver detected
  ≠ controller responding
    ≠ controller assigned to a team
      ≠ class ready to play
```

A healthy receiver does not prove handsets are paired or transmitting. This is
observed CQS evidence, not a theoretical concern (§12).

Two hard consequences:

- **Do not make an action look available when the system is already in the
  resulting state.** A **Connect** control that stays live and inviting while
  already connected teaches the teacher that the UI does not know its own
  state.
- **Do not claim success the system cannot verify.** A control that says it
  cleared, saved, or connected must only say so when it did.

---

## 3. Mental models and vocabulary

### `CQS-UX-P06` — Teacher mental model over implementation model

Ordinary teacher surfaces expose **product** concepts, not implementation
concepts. This is Product Contract invariant 3, stated as an interaction rule.

| Teacher-visible concept | Not |
| --- | --- |
| four physical controllers | one browser Gamepad index |
| buzzers / **Controller 1–4** / **receiver** | WebHID device, report id, VID:PID |
| **Game** (reusable) and **Session** (one class run) | `GameDefinition` / `PrivateGameState` |
| game library — My Games, Recent Games | IndexedDB object stores, saved-definition records |
| **Display** | public-state wire, sync envelope, sanitizer |
| saved / saving / save problem | persistence transaction state |

Implementation vocabulary — WebHID, report ids, VID/PID, IndexedDB, public-state
wire versions, internal mapping records, browser device indexes, profile
identifiers such as `cqs.sony-buzz.namtai-wbuzz-wireless.v1` — belongs behind
**Advanced** / **Diagnostics** unless technically unavoidable.

"Technically unavoidable" is a narrow exemption. A browser permission prompt
that CQS does not author is unavoidable. A CQS-authored label is not.

### `CQS-UX-P07` — Stable conceptual mapping

Keep concepts, vocabulary, and relationships stable across surfaces and across
releases. The same thing keeps the same name, the same color, the same
position, and the same ordinal everywhere it appears.

**Anti-pattern.** "Controller 1" meaning the first-enumerated browser device on
one surface and the handset labelled 1 on another — an observed CQS ambiguity
(§12).

### `CQS-UX-P20` — Controlled terminology

Teacher-facing language is a controlled vocabulary, not per-surface authorial
choice. Required, optional, readiness, fallback, recovery, emergency,
Advanced, and outcome concepts each have consistent words **and** distinct
visual hierarchy.

Recovery actions must have names that correspond to what they actually do. A
control named for its mechanism ("reset adapter") rather than its effect
("reconnect the buzzers") makes the teacher guess.

### `CQS-UX-P21` — Game/Session conceptual integrity

The distinction between reusable **Game** content and per-class **Session**
state is canonical (Product Contract §4) and must stay legible in the
interface, not only in the data model.

A teacher should always be able to tell which one an action affects. **Reset
Session** and **Delete Game** must be conceptually and visually distinct, and
a saved Game must not silently retain a previous class's chosen team
identities.

---

## 4. Progressive disclosure and recovery

### `CQS-UX-P09` — Progressive disclosure

Three layers, in this order:

```text
normal operation
  → contextual recovery
    → Advanced / Diagnostics
```

Normal operation shows what an ordinary successful class needs. Contextual
recovery appears next to the thing that is actually wrong, when it is wrong.
Advanced holds diagnostics, identifiers, and support evidence.

**Setup must not become a diagnostics wall.** Presenting the whole
troubleshooting surface up front, before anything has failed, is an observed
CQS failure (§12).

### `CQS-UX-P10` — Surgical recovery

Recover locally where possible. Preserve unrelated valid work. Recovering one
controller must not discard three working ones; recovering a Display must not
disturb the Session; escaping a broken restored session must not delete the
teacher's library.

Ordinary hardware recovery should not require developer concepts. Where a
physical procedure is genuinely required, prefer **observable device states**
over approximate timings — an explicit guidance delta already recorded in CQS
from Slice 21 owner observation.

**Anti-pattern.** A recovery path whose instructions are more complicated than
the rest of the product.

### `CQS-UX-P11` — Classroom continuity

Classroom continuity outranks optional hardware perfection. If buzzers cannot
be made to work, the class still plays. Nothing optional may become a hard
gate on starting a game.

### `CQS-UX-P12` — First-class keyboard fallback

Keyboard operation is not a degraded mode or an accessibility afterthought. It
is a permanent, first-class path (Product Contract invariant 9, §8), and it
must be **discoverable before it is needed**, not only findable in a crisis.

### `CQS-UX-P19` — Safe exploration and reversibility

A teacher should be able to look around, change their mind, and revisit
completed steps without losing work. Confirmation ceremony is reserved for
genuinely destructive actions; it does not decorate ordinary workflow.

Rehearsal or preview must not become canonical scored session history.

### `CQS-UX-P22` — Save and recovery trust

Saving, importing, resetting, recovering, backing up, and deleting must
correspond exactly to the teacher's understanding of what data is affected. A
teacher must never reasonably believe work is saved when persistence has
failed; persistence failure is a visible warning, not a silent state.

A teacher's saved game is more valuable than any individual release
(Product Contract invariant 1). The interface should behave as if that is
true.

---

## 5. Host versus Display

### `CQS-UX-P13` — Host/Display role separation

They share a design language and solve different jobs.

| | **Host** | **Display** |
| --- | --- | --- |
| Audience | teacher, private | students, public |
| Posture | operational, restrained, authoritative | theatrical where earned, sanitized, read-only |
| Optimized for | rapid decisions, situation awareness, recovery | shared attention, comprehension, anticipation, feedback |
| Viewing distance | arm's length | across a classroom |
| Failure behavior | must stay honest and operable | must fail closed without exposing Host-private state |

This is an architectural boundary (ADR-002, Product Contract §8) before it is
an aesthetic one. S05 may make the Display theatrical; **the Host stays
operational and restrained**. Spectacle must never obscure timer, prompt,
score, buzz state, or teacher operation.

### `CQS-UX-P14` — Distance-first Display design

The Display is a separate design environment, not the Host at a larger zoom.
Distance viewing governs:

- visual hierarchy and how much may be on screen at once;
- type size, line length, and wrapping;
- contrast, and how it survives a mediocre projector and a lit room;
- Windows scaling at 100 / 125 / 150%;
- behavior at 1920×1080 and 1280×720;
- score legibility, including negative scores;
- long-text failure behavior — long category names, long prompts, long team
  names must degrade gracefully rather than overflow, truncate meaning, or
  reflow the layout;
- visual noise: anything that is not carrying meaning is competing with
  what is.

Judge Display work against a worst-case valid content fixture, never against a
pleasant demo case.

---

## 6. Physical-to-digital mapping

### Physical identity must match UI identity — `CQS-UX-P07` applied

This section applies `CQS-UX-P07` (§3) to hardware; it defines no new
principle id.

Physical controller identity and on-screen identity must correspond clearly
and stably. Color, position, ordinal number, team assignment, and feedback
should compose into one mapping the teacher can hold in their head.

Rules:

- the teacher sees **four handsets**, so the interface counts four handsets;
- browser/device enumeration order is implementation topology and is **not**
  teacher-visible identity;
- an ordinal in the interface refers to the same physical unit every time;
- color may reinforce identity but may never be the only cue — ordinal,
  label, and position must carry it too (Product Contract §8);
- feedback must be attributable: when a press registers, the teacher must be
  able to tell **which** handset it came from.

A transient display that hides simultaneous inputs defeats this: if four
students press at once, the surface must show four attributable results, not
one that overwrites the others. This is observed CQS evidence (§12).

---

## 7. Classroom-pressure interaction

### `CQS-UX-P16` — Immediate interaction feedback

Buzzing, scoring, adjudication, and transitions must feel immediate. Input
acknowledgement is a correctness property of the experience, not decoration.

Never introduce animation or interface ceremony that makes correct input feel
delayed. If a moment needs choreography, the choreography follows the
acknowledgement — it does not gate it.

### The one-second standard

CQS adopts a live-operation design standard:

```text
During active classroom gameplay, design as though the teacher has
approximately ONE SECOND of spare attention.
```

This is a design heuristic, not a measured latency budget. Consequences:

- large, reachable targets for live actions;
- few simultaneous primary decisions;
- predictable placement — controls do not move between states;
- keyboard access to every live action;
- immediate feedback on every input;
- safe reversibility where appropriate (undo, re-score, promote next team);
- minimal modal interruption during play;
- no unnecessary confirmation ceremony on ordinary gameplay actions.

Emergency **Mute all sounds** stays immediately available at all times without
ever becoming the current task.

---

## 8. Authoring efficiency

### `CQS-UX-P18` — Efficient repeated authoring

Creating 25–50+ clues is **repeated professional input**, not a one-off form
fill. Design for a practiced user doing the same thing many times, not for
perpetual novicehood.

Favor:

- streamlined repetition and a fast path from one item to the next;
- spatial memory — the board itself is the editor and review surface, so
  position means something and should stay put;
- sensible defaults, including the authored point ladder;
- keyboard efficiency for entry and navigation;
- duplication of a game, a category, or an item;
- direct manipulation where appropriate;
- visible completion — what is done, what is missing, at a glance;
- useful inline validation rather than a terminal wall of errors;
- preservation of context — editing an item does not lose the teacher's place.

Import Quality Report feedback should be framed honestly: deterministic
validation is not semantic understanding, and heuristics are labelled as
heuristics.

**Anti-pattern.** Dozens of disconnected forms; losing the board on every
edit; validation that only speaks at save time.

---

## 9. Motion

### `CQS-UX-P15` — Motion communicates causality

Motion's primary job is to explain:

- causality — this happened *because* of that;
- state change;
- focus;
- orientation — where a thing came from and where it went;
- success and failure;
- progression.

Theatrical motion may add personality **only after** those purposes are
satisfied, and only on the Display.

**Reduced motion removes theatrical motion, not necessary state feedback.**
This is a Product Contract requirement (§8), and the distinction is the whole
point: under reduced motion the teacher and students must still perceive every
state change, expressed without animation.

---

## 10. Accessibility

### `CQS-UX-P17` — Accessible, redundant cues

Accessibility is structural, not decorative, and not optional polish
(Product Contract invariant 16). Structural means it constrains the design,
not the stylesheet.

Required across surfaces:

- full keyboard operation and a visible focus indicator;
- non-color cues for every state — color is always redundant;
- sufficient contrast, verified rather than assumed;
- readable typography, including at projection distance;
- semantic labels and accessible names;
- reduced-motion support that preserves state feedback;
- high-contrast and grayscale behavior;
- no meaning carried by sound alone.

---

## 11. Visual personality and design system

### `CQS-UX-P23` — Personality after clarity

Clarity and control outrank theatricality. But once clarity and control are
preserved, CQS should feel like a polished game-show product, not generic
business software. Restraint on the Host is a deliberate posture, not an
excuse for a drab Display.

### `CQS-UX-P24` — Bounded design-system consistency

Use a shared design language so intent and consistency survive across surfaces
and slices. Do **not** build a design-system program larger than the product.

Bounded means: extend the existing theme/token surface when a real consumer
needs it; do not invent token taxonomies, component libraries, or
documentation sites ahead of demand. Themes remain presentation-only and never
alter scoring, validation, event semantics, the private/public boundary, or
answer-reveal authorization.

---

## 12. Observed CQS UX findings

These are **observed CQS evidence**, not book-derived claims. They come from
this repository's own qualification records, owner observation, and retained
findings — principally `CQS-Q23-LOW-01` / `F-UX-01` and the Slice 21
pairing-friction reconciliation. They are first-class design input and must
not be rewritten as generic usability lore.

| Id | Observed finding | Principles engaged |
| --- | --- | --- |
| `CQS-UXF-01` | Setup became a diagnostics wall — troubleshooting surface presented before anything failed. | P09, P02, P05 |
| `CQS-UXF-02` | All options shown at equal hierarchy, with no dominant current task. | P02, P05 |
| `CQS-UXF-03` | The current task was unclear on entry to setup. | P02, P04 |
| `CQS-UXF-04` | Receiver state was confused with controller readiness; WebHID `healthy` did not mean controllers were transmitting. | P08, P04 |
| `CQS-UXF-05` | A **Connect** action appeared actionable while the system was already connected. | P08 |
| `CQS-UXF-06` | Teacher-facing browser/device identity did not match the four physical handsets. | P06, P07 |
| `CQS-UXF-07` | A transient Buzzer Check display obscured simultaneous inputs, so concurrent presses were not all attributable. | P03, P07, P16 |
| `CQS-UXF-08` | Connection text was unstable and jittered between states. | P03, P08 |
| `CQS-UXF-09` | Technical recovery concepts leaked into normal setup. | P06, P09 |
| `CQS-UXF-10` | Physical pairing/recovery instructions became more complicated than the product; approximate timings were less usable than observable device states (LED cues). | P10, P20 |
| `CQS-UXF-11` | "Controller 1" labelling was ambiguous between browser index and physical handset. | P07, P20 |
| `CQS-UXF-12` | Hardware failure needed an obvious keyboard fallback that was discoverable before the failure. | P11, P12 |
| `CQS-UXF-13` | UX confusion was severe enough to be a qualification concern in its own right — functional correctness did not imply usability. | P25 |

`F-UX-01` / `CQS-Q23-LOW-01` remains **OPEN / RETAINED / LOW** on `main` and is
assigned to S04B direction. An unmerged S04B candidate states that it
*addresses* the finding in implementation; this doctrine does **not** close it
and does **not** write a review verdict.

---

## 13. S04B-specific versus cross-product

For reconciliation later, this doctrine records which ideas are
setup-specific rather than cross-product:

| Scope | Examples |
| --- | --- |
| **S04B-specific** (Class Setup / Sony lane) | the exact Sony teacher vocabulary (**buzzers**, **Controller 1–4**, **receiver**); the receiver/controller/class-ready readiness layering; pastel button correspondence and post-lock monochrome states; Red-cycles-only-that-team behavior; the readiness summary rows. |
| **Cross-product** (this doctrine) | P01–P25 as stated: goal-first design, one dominant action, interrupted attention, situation awareness, exception-first, mental model and vocabulary, honest status, progressive disclosure, surgical recovery, continuity, keyboard fallback, Host/Display separation, distance-first Display, motion, immediacy, accessibility, authoring efficiency, reversibility, save trust, personality after clarity, bounded design system, real-classroom qualification. |

A later bounded reconciliation may establish exact cross-links between this
doctrine and the S04B candidate once both lanes reach an appropriate state.
This slice does not perform that reconciliation.

---

## 14. Non-claims

This doctrine does **not**:

- authorize any `src/`, CSS, theme, animation, or component implementation;
- reopen S04A;
- claim or transfer S04B, S04C, S04D, S05, or S06 scope;
- supersede, edit, or reconcile the unmerged S04B candidate;
- close `F-UX-01` / `CQS-Q23-LOW-01`;
- claim any surface has been qualified against these principles;
- claim that any external source was read more thoroughly than
  [`../research/CQS-UX-UI-REFERENCE-BIBLIOGRAPHY.md`](../research/CQS-UX-UI-REFERENCE-BIBLIOGRAPHY.md)
  records.
