# Classroom Quiz Show — Project overview

## Goal

Build a **reusable, local-first classroom game-show engine** that a teacher runs
on their own device (host screen) and projects for students (display screen).
The product lets teachers assemble a complete classroom game from reusable,
ordered **rounds** — the category-and-point-value board being the first round
type, not the entire product.

Initial subject seeds: **Earth & Space Science** (primary) and **Ecology**
(secondary). The engine itself is subject-agnostic.

## User roles

- **Host (teacher).** Private controls: correct answers, acceptable alternates,
  teacher notes, scoring, timers, game/round progression, undo/recovery,
  preview, display-safety controls, and (later) authoring and pack management.
  The host owns the authoritative runtime state.
- **Display (projector).** Read-only, student-facing presentation: current
  round, current prompt, public timer, teams and scores, public instructions,
  answer reveal **only** after an explicit host action, transitions, and final
  results. The display never receives full host state.

## Long-term classroom game-engine vision

```
Game
 → ordered rounds
   → each round has a registered round type
     → each round type has typed configuration
       → the host controls runtime state
         → the display renders only sanitized public state
```

Planned round types include category-board, final-wager, sequential-prompts,
image-identification, timeline-ordering, matching, data-interpretation,
concept-map, claim-evidence-reasoning, whiteboard-challenge, and custom. Two are
implemented: **`category-board`** (Slice 5, `Complete`) and **`final-wager`**
(Slice 14, `Complete` — squash-merged via PR #32 at `ce2e103…`; see
[`architecture/ADR-014-final-wager-round.md`](architecture/ADR-014-final-wager-round.md)). The
full vision (scoring strategies, themes, media, game packs, AI copilot) is
captured in [`architecture/GAME-ENGINE-BOUNDARIES.md`](architecture/GAME-ENGINE-BOUNDARIES.md)
and [`plans/MVP-ARC.md`](plans/MVP-ARC.md).

## Architectural boundaries (must hold across all slices)

1. **A game is an ordered collection of rounds** — never assume one game equals
   one board.
2. **Rounds are typed, registered definitions** — no arbitrary executable code
   from imported files; unknown round types fail validation and are unplayable.
3. **Host owns authoritative private state; the display renders only an
   explicitly sanitized `PublicState`** — the display fails closed on any error.
4. **Scoring is a typed strategy**, not permanently integer points.
5. **Prompts are typed media**, not only plain text.
6. **Canonical stored truth is versioned JSON**; spreadsheets are an import
   convenience; every import passes one validation/normalization pipeline.
7. **Themes are presentation-only** and never alter scoring, validation, event
   semantics, the private/public boundary, or answer-reveal authorization.

These are elaborated (with the Slice-1 deferral list) in
[`architecture/GAME-ENGINE-BOUNDARIES.md`](architecture/GAME-ENGINE-BOUNDARIES.md).

## Implementation-truth statement

**This repository is the authoritative source of implementation truth** —
application code, architecture, schemas, tests, fixtures, build configuration,
deployment configuration, release artifacts, runtime behavior, and
implementation status all live here and are defined here.

## NightWatch role

**OpenClaw NightWatch** may summarize, review, authorize, index, and link to
this project. It **must not**:

- override observed implementation truth in this repository, or
- become a build-time, runtime, test-time, or deployment dependency.

If NightWatch and this repository disagree about what is implemented, **this
repository is correct** by definition.

## Obsidian Command Center boundary

An **Obsidian Command Center** may summarize, link, and route the durable
locations this repo exposes (planning, status, decisions, unresolved decisions,
verification evidence, risks, handoff). Obsidian **must not** become the source
of truth for code, schemas, tests, runtime state, releases, or any
implementation status that contradicts this repository.

## Major non-goals (MVP)

No backend, no accounts, **no student-owned devices and no student phones**, no
LMS integration, no cloud dependencies, no AI services, no grading/defensible
individual analytics, and no imitation of any commercial game show's branding,
audio, or board styling.

> **Scope amendment (owner-authorized, 2026-07-26).** This clause previously read
> "no student devices/buzzers". It bundled two different things — *student-owned
> devices* and *buzzers* — and the owner has narrowed it deliberately, not
> removed it:
>
> - **Local host-attached USB buzzer controllers are an approved future
>   capability.** Sony Buzz! USB controllers are the preferred initial validation
>   target, not an exclusive dependency and not a tested compatibility claim.
> - **The product must remain fully usable without buzzer hardware.**
> - **Student-owned devices, student phones and networked buzzers remain
>   excluded.** No backend, account, WebRTC, Bluetooth requirement, cloud
>   dependency or classroom Wi-Fi dependency is authorized.
> - Local buzzer input must pass through a **hardware-independent input adapter**
>   and the existing command/event/reducer architecture.
>
> A USB controller plugged into the host preserves everything the original
> non-goal protected: **privacy** (no student device, account or identity; a press
> is a *team* input, never a person's), **offline operation** (USB HID needs no
> network), and **operational simplicity** (one device, no pairing, no per-student
> setup, no classroom Wi-Fi). Rationale, the rejected buzzer architectures, and
> the roadmap consequences are recorded in
> [`decisions/ROADMAP-AMENDMENT-001-local-buzzers.md`](decisions/ROADMAP-AMENDMENT-001-local-buzzers.md).

## Approved product decisions (owner)

- **Working name / slug:** Classroom Quiz Show / `classroom-quiz-show`.
- **Deployment target:** REAL MVP conventional path is the teacher-launched
  Electron desktop application (macOS and Windows). GitHub Pages (static PWA)
  remains the supported web alternate. See
  [`architecture/ADR-021-real-mvp-desktop-architecture-electron.md`](architecture/ADR-021-real-mvp-desktop-architecture-electron.md)
  and [`teacher/DESKTOP.md`](teacher/DESKTOP.md).
- **Subject seeds:** Earth & Space Science (primary), Ecology (secondary).
- **Default category-board point ladder:** 100, 200, 300, 400, 500. (Slice 5
  implements the board; the ladder is authored per game, and this remains the
  recommended default rather than an enforced one.)
- **Default partial-credit increment:** 50 points.
- **Manual score correction:** unrestricted, teacher-controlled (eventually).
- **Default tie-break:** host-controlled sudden-death prompt.
- **Standards vocabulary:** free-text namespaced tags (e.g. `teks:ESS.1A`,
  `ngss:HS-ESS2-1`); TEKS/NGSS **not** required in the MVP.
- **Buzzer arming (`OG-1`, 2026-07-26):** arming is **manual and host-controlled**.
  Nothing arms a clue automatically. Implemented in Slice 7 as durable
  arming state; see [`architecture/ADR-007-timers-arming-transitions.md`](architecture/ADR-007-timers-arming-transitions.md) §4.
- **Buzzer queue (`OG-2`, 2026-07-26):** buzzer behaviour preserves a **full
  ordered team queue**, not a first-only lockout. **Implemented in Slice 8**; see
  [`architecture/ADR-008-local-input-keyboard-buzz.md`](architecture/ADR-008-local-input-keyboard-buzz.md) §8.
- **Promotion after a miss (`OG-3`, 2026-07-26):** after an incorrect response or a
  host pass, the **next queued team is promoted**. **Implemented in Slice 8** as
  one typed command that moves no points; see ADR-008 §11.
- **Tie handling (`OG-4`, resolved in Slice 8):** observed timestamps are
  **evidence**; the **event sequence** is the deterministic tiebreaker. The system
  does not claim sub-millisecond fairness, and a disputed physical tie is resolved
  by the host through the existing controls (undo, reset, reveal). No
  tie-adjudication UI exists. See ADR-008 §13.
- **Queue lifetime (`OG-5`, resolved in Slice 8):** a buzz queue belongs to **one
  clue's response opportunity** and never outlives it — a new tile, the answer
  reveal, a return to the board, a round change, a reset and the game ending all
  clear it. See ADR-008 §12.
- **Scoring and the active respondent (`OG-6`):** **still deferred and not
  implemented.** Scoring is unchanged and stays available for every team,
  including teams that never buzzed. See ADR-008 §17.
- **Secondary controller actions (recorded, not implemented):** the local input
  contract carries four **ordinal** secondary action slots so future coloured
  controller buttons can be mapped. They are representable and mappable but
  **inert** — no secondary action produces a command, an event or a state change.
  A durable vocabulary is defined only when a slice supplies an authorized
  consumer. Slot names are ordinal, never chromatic, and no device model, vendor
  or button index appears anywhere in the engine.
- **Timer pause/resume (`OG-8`, 2026-07-26):** explicit host pause and resume are
  **supported**. Pause records the remaining duration as a durable fact; resume
  derives a new deadline from the dispatch-edge clock. See ADR-007 §7.
- **Default response window:** 30 seconds when a game authors none; a game may
  author 5–600 seconds, and the host may pick another bounded duration per clue.
- **Local buzzers (2026-07-26):** an approved future capability, host-attached
  USB only, with Sony Buzz! controllers as the preferred initial validation
  target. Delivered through a hardware-independent input adapter in slices 8–10
  of the amended roadmap. See the non-goal amendment above and
  [`decisions/ROADMAP-AMENDMENT-001-local-buzzers.md`](decisions/ROADMAP-AMENDMENT-001-local-buzzers.md).

(These are targets for the engine. As of Slice 8 the `category-board` round
implements the board, the first scoring strategy implements bounded integer
points, partial credit and unrestricted manual correction, the response phase
implements host arming and a replay-safe timer, and the local input boundary
implements **keyboard** buzz-in with a full ordered queue and promotion.
Controller hardware of every kind — generic gamepads, Sony Buzz!, coloured
buttons — and sudden-death tie-breaks remain targets for later slices.)
