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
concept-map, claim-evidence-reasoning, whiteboard-challenge, and custom. The
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
- **Deployment target:** GitHub Pages (static).
- **Subject seeds:** Earth & Space Science (primary), Ecology (secondary).
- **Default category-board point ladder:** 100, 200, 300, 400, 500. (Slice 5
  implements the board; the ladder is authored per game, and this remains the
  recommended default rather than an enforced one.)
- **Default partial-credit increment:** 50 points.
- **Manual score correction:** unrestricted, teacher-controlled (eventually).
- **Default tie-break:** host-controlled sudden-death prompt.
- **Standards vocabulary:** free-text namespaced tags (e.g. `teks:ESS.1A`,
  `ngss:HS-ESS2-1`); TEKS/NGSS **not** required in the MVP.
- **Local buzzers (2026-07-26):** an approved future capability, host-attached
  USB only, with Sony Buzz! controllers as the preferred initial validation
  target. Delivered through a hardware-independent input adapter in slices 8–10
  of the amended roadmap. See the non-goal amendment above and
  [`decisions/ROADMAP-AMENDMENT-001-local-buzzers.md`](decisions/ROADMAP-AMENDMENT-001-local-buzzers.md).

(These are targets for the engine. As of Slice 6 the `category-board` round
implements the board and the first scoring strategy implements bounded integer
points, partial credit and unrestricted manual correction; tie-breaks and
buzzers remain targets for later slices.)
