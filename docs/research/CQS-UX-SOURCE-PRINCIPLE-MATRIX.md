# CQS UX source–principle matrix

- **Document id:** `CQS-UX-SOURCE-PRINCIPLE-MATRIX`
- **Program:** `CQS-REAL-MVP-1`
- **Registering slice:** `CQS-UX-GUIDANCE-S01-FOUNDATION`
- **Authorization:** `AUTHORIZE-CQS-UX-GUIDANCE-S01-FOUNDATION-1`
- **Date:** 2026-09-11
- **Status:** Research bridge — **documentation only. Authorizes no
  implementation.**

This is the bridge from evidence to product. For each adopted principle in
[`../design/CQS-UX-DOCTRINE.md`](../design/CQS-UX-DOCTRINE.md) it records what
in **this repository** motivates it, what external literature is expected to
support it, how strong that evidence actually is, where it applies, what
failure looks like, how it could be tested, and which Program slice owns it.

Two rules govern how to read it:

1. **This is not a compliance checklist.** Not every source supports every
   principle, and a principle with a single source is not weaker than one with
   five. The strongest evidence for most CQS principles is repository
   authority plus observed CQS failure, not a book.
2. **Research support is routing, not citation.** Every source on the shelf is
   currently `NOT-YET-INGESTED` (see
   [`CQS-UX-UI-REFERENCE-BIBLIOGRAPHY.md`](CQS-UX-UI-REFERENCE-BIBLIOGRAPHY.md)
   §1). A named source means "this is where to look first", never "this book
   says so".

```text
repo authority + observed CQS evidence  →  the principle
external literature                     →  where to look next
```

Authority is unchanged by this file. Observed implementation, `PROJECT.md`,
the Product Contract, `STATUS.md`, accepted ADRs and the current Program plan
all outrank this matrix; research sources rank below it. Where an outside
recommendation conflicts with a CQS invariant, **CQS wins**. See
[`../design/README.md`](../design/README.md) §4.

---

## 1. Evidence status vocabulary

| Status | Meaning |
| --- | --- |
| `REPO-AUTHORITY` | Follows from an existing CQS invariant, owner decision, accepted ADR, or canonically registered direction. Strongest class. |
| `OBSERVED-CQS-EVIDENCE` | Supported by a failure or behavior actually observed in CQS and recorded in this repository. |
| `OWNER-OBSERVED` | Supported by owner observation recorded in a CQS receipt. |
| `SYNTHESIZED-CQS-JUDGEMENT` | A CQS design decision made from the above; not claimed to be derived from external literature. |
| `LITERATURE-ROUTING-ONLY` | External sources are expected to be relevant, but none has been ingested. Carries no evidentiary weight on its own. |

Every principle below carries at least one of the first four. **No principle
in this matrix rests on `LITERATURE-ROUTING-ONLY` alone.**

---

## 2. Index

| ID | Principle | Program owner |
| --- | --- | --- |
| `CQS-UX-P01` | Goal-first design | Cross-cutting |
| `CQS-UX-P02` | One dominant next action | Cross-cutting |
| `CQS-UX-P03` | Interrupted-attention design | Cross-cutting |
| `CQS-UX-P04` | Situation awareness | S04B / S04C |
| `CQS-UX-P05` | Exception before detail | S04B / S04C |
| `CQS-UX-P06` | Teacher mental model | Cross-cutting |
| `CQS-UX-P07` | Stable conceptual mapping | S04B / Cross-cutting |
| `CQS-UX-P08` | Explicit system status | S04B / S04C |
| `CQS-UX-P09` | Progressive disclosure | Cross-cutting |
| `CQS-UX-P10` | Surgical recovery | S04B / S04C |
| `CQS-UX-P11` | Classroom continuity | Cross-cutting |
| `CQS-UX-P12` | First-class keyboard fallback | Cross-cutting |
| `CQS-UX-P13` | Host/Display role separation | Cross-cutting / S05 |
| `CQS-UX-P14` | Distance-first Display design | S05 / S06 |
| `CQS-UX-P15` | Motion communicates causality | S05 |
| `CQS-UX-P16` | Immediate interaction feedback | Cross-cutting / S05 |
| `CQS-UX-P17` | Accessible redundant cues | Cross-cutting / S06 |
| `CQS-UX-P18` | Efficient repeated authoring | S04A (terminal) |
| `CQS-UX-P19` | Safe exploration and reversibility | Cross-cutting |
| `CQS-UX-P20` | Controlled terminology | S04B / Cross-cutting |
| `CQS-UX-P21` | Game/Session conceptual integrity | S04A (terminal) / Cross-cutting |
| `CQS-UX-P22` | Save and recovery trust | S04A (terminal) / S04C |
| `CQS-UX-P23` | Personality after clarity | S05 |
| `CQS-UX-P24` | Bounded design-system consistency | S05 |
| `CQS-UX-P25` | Real-classroom qualification | S06 |

A "Program owner" entry names **where the work would belong**. It grants no
implementation authority and changes no Program status.

---

## 3. Matrix

### `CQS-UX-P01` — Goal-first design

- **CQS principle:** design each surface from what the teacher is trying to
  accomplish, not from the feature inventory.
- **Repo authority:** S04-family direction §3 canonical teacher flow and
  "every ordinary screen should make the next useful action obvious";
  Product Contract invariant 18 (sophistication must not become teacher-facing
  complexity).
- **Research support:** Cooper (goal-directed design); Norman; Krug.
- **Evidence status:** `REPO-AUTHORITY` + `LITERATURE-ROUTING-ONLY`.
- **Primary surfaces:** Home, Class Setup, Host console, authoring.
- **Anti-pattern:** a panel that exists because a subsystem exists; a surface
  organized by module boundary.
- **Qualification implication:** walk the canonical teacher flow end to end
  and check that each screen serves the next step of the flow rather than the
  structure of the code.
- **Program owner:** Cross-cutting; each lane applies it to its own surfaces.

### `CQS-UX-P02` — One dominant next action

- **CQS principle:** exactly one thing reads as the current task; setup is a
  guided workspace, not a mandatory wizard.
- **Repo authority:** S04-family direction §3 (simple dashboard + optional
  first-run guidance; no mandatory wizard); owner decision on the ordinary
  teacher flow.
- **Observed CQS evidence:** `CQS-UXF-02` (options at equal hierarchy),
  `CQS-UXF-03` (unclear current task).
- **Research support:** Cooper; Krug; Tidwell.
- **Evidence status:** `REPO-AUTHORITY` + `OBSERVED-CQS-EVIDENCE`.
- **Primary surfaces:** Class Setup, Home, Host console, adjudication.
- **Anti-pattern:** a flat wall of equally weighted controls.
- **Qualification implication:** on entry to any surface, a first-time
  observer should be able to name the current task without reading prose.
- **Program owner:** Cross-cutting; Class Setup instance is S04B.

### `CQS-UX-P03` — Interrupted-attention design

- **CQS principle:** state survives a glance away; nothing important is
  conveyed only transiently.
- **Repo authority:** the teacher acceptance scenario (S04-family §34)
  includes ordinary interruption and recovery.
- **Observed CQS evidence:** `CQS-UXF-07` (transient Buzzer Check display hid
  simultaneous inputs), `CQS-UXF-08` (unstable connection text).
- **Research support:** Johnson (attention, working memory); Endsley & Jones.
- **Evidence status:** `OBSERVED-CQS-EVIDENCE` + `REPO-AUTHORITY`.
- **Primary surfaces:** Buzzer Check, Sony connection, errors/blockers,
  live gameplay.
- **Anti-pattern:** a toast that carried the only evidence of what happened.
- **Qualification implication:** look away for five seconds during each
  important state change; the state must still be determinable afterwards.
- **Program owner:** Cross-cutting.

### `CQS-UX-P04` — Situation awareness

- **CQS principle:** the teacher can quickly answer where am I, what is
  happening, what needs attention, what next, can class continue.
- **Repo authority:** S04-family §13 classroom readiness; the readiness
  summary concept.
- **Observed CQS evidence:** `CQS-UXF-03`, `CQS-UXF-04`.
- **Research support:** Endsley & Jones (perception → comprehension →
  projection); Norman.
- **Evidence status:** `REPO-AUTHORITY` + `OBSERVED-CQS-EVIDENCE`.
- **Primary surfaces:** Class Setup, readiness, Sony connection, Host console,
  startup recovery.
- **Anti-pattern:** a readiness surface that reports component health but
  never answers "can class continue".
- **Qualification implication:** ask a teacher the five questions at three
  points — mid-setup, after an induced hardware failure, and mid-game — and
  record whether each is answerable from the screen.
- **Program owner:** S04B for setup; S04C for recovery.

### `CQS-UX-P05` — Exception before detail

- **CQS principle:** normal, warning, blocker, recovery, and diagnostic detail
  occupy different hierarchy; live operation prefers exception-first.
- **Repo authority:** S04-family §13 readiness states (✓ / optional /
  warning); Product Contract invariant 18.
- **Observed CQS evidence:** `CQS-UXF-01`, `CQS-UXF-02`.
- **Research support:** Endsley & Jones; Johnson.
- **Evidence status:** `REPO-AUTHORITY` + `OBSERVED-CQS-EVIDENCE`.
- **Primary surfaces:** readiness, errors/warnings/blockers, Class Setup.
- **Anti-pattern:** five green rows shouting as loudly as the one red row;
  or hiding "fine" so completely that it cannot be confirmed.
- **Qualification implication:** induce exactly one failure among several
  healthy subsystems and measure how long it takes to locate it.
- **Program owner:** S04B for setup; S04C for product-wide failure handling.

### `CQS-UX-P06` — Teacher mental model

- **CQS principle:** ordinary surfaces expose product concepts; implementation
  vocabulary lives behind Advanced/Diagnostics.
- **Repo authority:** **Product Contract invariant 3**; S04-family §3 explicit
  hide-list (IndexedDB, WebHID, Gamepad adapter details, canonical JSON
  internals, persistence internals, device IDs, storage mechanics).
- **Observed CQS evidence:** `CQS-UXF-06`, `CQS-UXF-09`, and the retained
  finding `F-UX-01` / `CQS-Q23-LOW-01` itself.
- **Research support:** Norman (conceptual models); Young (mental models);
  Cooper.
- **Evidence status:** `REPO-AUTHORITY` + `OBSERVED-CQS-EVIDENCE`.
- **Primary surfaces:** Class Setup, Sony connection, controller identity,
  microcopy, game library, Display setup.
- **Anti-pattern:** a CQS-authored label naming a transport, a schema, a
  report id, or a profile identifier in ordinary copy.
- **Qualification implication:** grep ordinary (non-Advanced) teacher copy for
  the hide-list terms; a hit is a finding unless it is genuinely unavoidable.
- **Program owner:** Cross-cutting; `F-UX-01` is assigned to S04B.

### `CQS-UX-P07` — Stable conceptual mapping

- **CQS principle:** physical identity and UI identity correspond stably;
  browser/device topology is never teacher-visible identity.
- **Repo authority:** ADR-008/ADR-009 hardware-independent input boundary;
  ADR-019 supported profile; the owner decision that secondary action slots
  are **ordinal, never chromatic**, with no device model, vendor or button
  index in the engine.
- **Observed CQS evidence:** `CQS-UXF-06`, `CQS-UXF-11`, `CQS-UXF-07`.
- **Research support:** Norman (mapping); Young.
- **Evidence status:** `REPO-AUTHORITY` + `OBSERVED-CQS-EVIDENCE`.
- **Primary surfaces:** controller identity/assignment, Buzzer Check, team
  selection, scoreboard.
- **Anti-pattern:** "Controller 1" meaning the first-enumerated browser device
  on one surface and the handset labelled 1 on another.
- **Qualification implication:** with four handsets, press each in a known
  physical order and confirm the interface attributes each press to the same
  ordinal every time, including simultaneous presses.
- **Program owner:** S04B; the input boundary itself is an existing
  foundation.

### `CQS-UX-P08` — Explicit system status

- **CQS principle:** say what is ready, what is blocking, and why; never make
  an action look available when the system is already in the resulting state;
  never claim success the system cannot verify.
- **Repo authority:** S04-family §7 visible save states (Saved just now /
  Saving… / Save problem) and "a teacher must never reasonably believe work is
  saved when persistence has failed"; the Slice 23 `HIGH-03` closure
  explicitly required truthful success claims.
- **Observed CQS evidence:** `CQS-UXF-04` (receiver health ≠ readiness),
  `CQS-UXF-05` (Connect actionable while connected), `CQS-UXF-08` (jitter).
- **Research support:** Norman (feedback); Endsley & Jones; Podmajersky;
  Metts & Welfle.
- **Evidence status:** `REPO-AUTHORITY` + `OBSERVED-CQS-EVIDENCE`.
- **Primary surfaces:** Sony connection, readiness, save/autosave, import,
  errors/blockers.
- **Anti-pattern:** a control that reports success it did not achieve; a
  status that changes faster than it can be read.
- **Qualification implication:** for each status claim, induce the failure it
  denies and confirm the interface changes truthfully rather than optimistically.
- **Program owner:** S04B for setup status; S04C for product-wide diagnostics.

### `CQS-UX-P09` — Progressive disclosure

- **CQS principle:** normal operation → contextual recovery → Advanced /
  Diagnostics. Setup must not become a diagnostics wall.
- **Repo authority:** S04-family §3 Advanced/Diagnostics hide-list; the gap
  register entry "teacher-simple progressive disclosure".
- **Observed CQS evidence:** `CQS-UXF-01`, `CQS-UXF-09`.
- **Research support:** Krug; Tidwell; Johnson.
- **Evidence status:** `REPO-AUTHORITY` + `OBSERVED-CQS-EVIDENCE`.
- **Primary surfaces:** Class Setup, Sony connection, diagnostics, audio,
  information density.
- **Anti-pattern:** troubleshooting presented before anything has failed; or
  over-hiding, so ordinary things become unfindable.
- **Qualification implication:** count what a teacher must read on a
  fully-healthy first run. It should be close to the happy path only.
- **Program owner:** Cross-cutting; S04C owns the diagnostics layer.

### `CQS-UX-P10` — Surgical recovery

- **CQS principle:** recover locally, preserve unrelated valid work, and
  prefer observable device states over approximate timings.
- **Repo authority:** Product Contract invariant 11 (recovery without a
  terminal or a developer); S04-family §19 safe startup must not delete the
  library to escape a broken session.
- **Owner-observed:** the Slice 21 pairing-friction receipt records an
  explicit guidance delta — prefer observable device states (LED cues) over
  "hold for ~4 seconds".
- **Observed CQS evidence:** `CQS-UXF-10`.
- **Research support:** Norman (error recovery); Cooper; Endsley & Jones.
- **Evidence status:** `REPO-AUTHORITY` + `OWNER-OBSERVED` +
  `OBSERVED-CQS-EVIDENCE`.
- **Primary surfaces:** Sony recovery, startup recovery, Display recovery,
  import recovery.
- **Anti-pattern:** recovering one controller by resetting all four; recovery
  instructions more complicated than the product.
- **Qualification implication:** break one of N things, recover it, and assert
  the other N−1 were untouched.
- **Program owner:** S04B within setup; S04C for product-wide recovery.

### `CQS-UX-P11` — Classroom continuity

- **CQS principle:** classroom continuity outranks optional hardware
  perfection; nothing optional becomes a hard gate on starting.
- **Repo authority:** **PROJECT.md** — "the product must remain fully usable
  without buzzer hardware"; Product Contract invariant 9; S04-family §24.
- **Research support:** Endsley & Jones (graceful degradation).
- **Evidence status:** `REPO-AUTHORITY`.
- **Primary surfaces:** Class Setup, readiness, Sony connection, keyboard
  fallback.
- **Anti-pattern:** Play disabled because an optional subsystem is unhappy.
- **Qualification implication:** with no controller attached at all, complete
  the full teacher acceptance scenario.
- **Program owner:** Cross-cutting; a permanent invariant, not a slice
  feature.

### `CQS-UX-P12` — First-class keyboard fallback

- **CQS principle:** keyboard operation is permanent, first-class, and
  discoverable **before** it is needed.
- **Repo authority:** Product Contract invariant 9 and §8; S04-family §24;
  ADR-008 keyboard buzz-in.
- **Observed CQS evidence:** `CQS-UXF-12`.
- **Research support:** Horton & Quesenbery; Pickering; Shneiderman.
- **Evidence status:** `REPO-AUTHORITY` + `OBSERVED-CQS-EVIDENCE`.
- **Primary surfaces:** keyboard fallback, Class Setup, Host console,
  accessibility.
- **Anti-pattern:** the keyboard path presented as a degraded mode, or
  findable only after a failure.
- **Qualification implication:** unplug the receiver mid-game and continue to
  completion using only the keyboard, without consulting documentation.
- **Program owner:** Cross-cutting; discoverability within setup is S04B.

### `CQS-UX-P13` — Host/Display role separation

- **CQS principle:** Host is operational, restrained, private, authoritative;
  Display is public, sanitized, distance-readable, theatrical where earned.
- **Repo authority:** **PROJECT.md** boundary 3; ADR-002 sanitized
  `PublicState`; Product Contract §8 (Display failure/recovery must not expose
  Host-private state); S04-family §30 — Display may become theatrical, Host
  remains operational and restrained.
- **Research support:** Hodent (audience side); Endsley & Jones (operator
  side); Lupton.
- **Evidence status:** `REPO-AUTHORITY`.
- **Primary surfaces:** every paired Host/Display surface.
- **Anti-pattern:** spectacle on the Host; private state leaking to the
  Display during recovery; the Display treated as the Host at larger zoom.
- **Qualification implication:** this is an architectural invariant with
  existing sanitizer tests; the design-side check is that S05 work never
  degrades Host operability to buy Display polish.
- **Program owner:** Cross-cutting architectural invariant; S05 owns the
  Display treatment.

### `CQS-UX-P14` — Distance-first Display design

- **CQS principle:** the Display is a distinct design environment governed by
  distance, projector quality, scaling, and worst-case content.
- **Repo authority:** S04-family §22 (scaling, resolutions, mirrored vs
  extended) and §31 visual stress fixture — "visual polish is not accepted
  solely because a pleasant demo case looks good"; Product Contract §8
  readable projector typography.
- **Research support:** Lupton; Johnson; Hodent.
- **Evidence status:** `REPO-AUTHORITY` + `LITERATURE-ROUTING-ONLY`.
- **Primary surfaces:** all Display surfaces, scoreboard, clue presentation,
  category board, projector readiness.
- **Anti-pattern:** layout validated only against short demo content at one
  resolution.
- **Qualification implication:** the canonical worst-case fixture — longest
  category names, long prompts and answers, long team names, 8 teams, negative
  scores — at 1920×1080 and 1280×720, at 100/125/150% scaling, in grayscale
  and high contrast.
- **Program owner:** S05 for design; S06 for physical qualification.

### `CQS-UX-P15` — Motion communicates causality

- **CQS principle:** motion explains causality, state change, focus,
  orientation, outcome and progression first; theatrical motion comes after;
  reduced motion removes theatrical motion, not state feedback.
- **Repo authority:** **Product Contract §8** — "reduced motion removes
  theatrical motion, **not** necessary state feedback"; invariant 16;
  S04-family §30 restrained intentional motion with reduced-motion
  equivalents.
- **Research support:** Head; Saffer; Hodent.
- **Evidence status:** `REPO-AUTHORITY` + `LITERATURE-ROUTING-ONLY`.
- **Primary surfaces:** Display transitions, buzz choreography, round
  transitions, Final, score changes.
- **Anti-pattern:** a reduced-motion path where a state change becomes
  imperceptible because the animation was the only signal.
- **Qualification implication:** run every choreographed moment with
  `prefers-reduced-motion` set and assert each state change is still
  perceivable.
- **Program owner:** S05.

### `CQS-UX-P16` — Immediate interaction feedback

- **CQS principle:** buzzing, scoring, adjudication and transitions feel
  immediate; choreography never gates acknowledgement.
- **Repo authority:** ADR-007 arming/timer semantics; ADR-008 ordered queue
  and promotion; S04-family §30 — "do not let spectacle obscure timer, prompt,
  score, buzz state, or teacher operation"; the owner decision that only a
  minimal hardware debounce is acceptable and no punitive cooldown.
- **Observed CQS evidence:** `CQS-UXF-07`.
- **Research support:** Swink (game feel); Saffer (microinteractions);
  Shneiderman (response time).
- **Evidence status:** `REPO-AUTHORITY` + `OBSERVED-CQS-EVIDENCE`.
- **Primary surfaces:** buzz moment, Buzzer Check, adjudication, scoring,
  team-name selection.
- **Anti-pattern:** an animation that must finish before a correct press is
  acknowledged.
- **Qualification implication:** press-to-visible-acknowledgement observed on
  the physical path, with four simultaneous presses attributed correctly.
- **Program owner:** Cross-cutting constraint on any live path; S05 must
  respect it.

### `CQS-UX-P17` — Accessible redundant cues

- **CQS principle:** accessibility is structural — keyboard, visible focus,
  non-color cues, contrast, readable type, semantic labels, reduced motion,
  high contrast/grayscale, no sound-only meaning.
- **Repo authority:** **Product Contract invariant 16 and §8**; S04-family
  §25; the S04B direction's explicit rule that color may reinforce Sony
  selection but must not be the only cue.
- **Research support:** Horton & Quesenbery; Pickering; Lupton.
- **Evidence status:** `REPO-AUTHORITY`.
- **Primary surfaces:** every surface; acutely team-name selection,
  controller identity, Display states, scoreboard.
- **Anti-pattern:** state distinguished by hue alone; a focus ring removed for
  aesthetics; an audio-only cue.
- **Qualification implication:** keyboard-only traversal; grayscale pass;
  high-contrast pass; reduced-motion pass; contrast measurement rather than
  assumption.
- **Program owner:** Cross-cutting; S06 owns integrated qualification.

### `CQS-UX-P18` — Efficient repeated authoring

- **CQS principle:** authoring 25–50+ clues is repeated professional input;
  optimize for a practiced user.
- **Repo authority:** S04-family §6 — the board itself is the editor/review
  surface, sensible Save/Next/Previous, "do not force a teacher through dozens
  of disconnected forms", visible completion, and undo/redo as desirable;
  §8 Import Quality Report framed as heuristics, not certainty.
- **Research support:** Wroblewski; Jarrett & Gaffney; Tidwell; Cooper.
- **Evidence status:** `REPO-AUTHORITY` + `LITERATURE-ROUTING-ONLY`.
- **Primary surfaces:** authoring, clue editor, import, game library.
- **Anti-pattern:** losing the board on every edit; validation that only
  speaks at save time; no duplication path.
- **Qualification implication:** time a realistic 25-clue authoring pass and
  count context losses and re-navigations.
- **Program owner:** **S04A — TERMINALLY COMPLETE.** Recording future polish
  here does **not** reopen S04A; any such work needs separate later
  authorization.

### `CQS-UX-P19` — Safe exploration and reversibility

- **CQS principle:** look around, change your mind, revisit completed steps
  without losing work; confirmation ceremony only for genuinely destructive
  actions.
- **Repo authority:** S04-family §26 — "use confirmation for genuinely
  destructive actions; do not plaster confirmations on ordinary workflow
  actions"; §14 rehearsal must not become canonical scored history;
  the owner decision that manual score correction is unrestricted.
- **Research support:** Shneiderman (reversal of actions); Cooper; Norman.
- **Evidence status:** `REPO-AUTHORITY`.
- **Primary surfaces:** Class Setup, authoring, adjudication, score
  correction, destructive actions, rehearsal.
- **Anti-pattern:** a confirmation dialog on an ordinary gameplay action; a
  setup step that cannot be revisited.
- **Qualification implication:** enumerate every confirmation prompt and
  justify each as genuinely destructive.
- **Program owner:** Cross-cutting.

### `CQS-UX-P20` — Controlled terminology

- **CQS principle:** teacher-facing language is a controlled vocabulary;
  recovery actions are named for their effect, not their mechanism.
- **Repo authority:** Product Contract invariant 3; S04-family §3 product
  language; §18 human-readable compatibility messages.
- **Observed CQS evidence:** `CQS-UXF-09`, `CQS-UXF-10`, `CQS-UXF-11`;
  `F-UX-01` / `CQS-Q23-LOW-01` is the retained finding of record.
- **Research support:** Podmajersky; Metts & Welfle; Krug.
- **Evidence status:** `REPO-AUTHORITY` + `OBSERVED-CQS-EVIDENCE`.
- **Primary surfaces:** microcopy everywhere, errors/blockers, recovery
  instructions, Advanced labels.
- **Anti-pattern:** the same concept with three names across three surfaces; a
  button named after the API it calls.
- **Qualification implication:** a terminology sweep across ordinary teacher
  copy, checked against the controlled vocabulary; this is the concrete route
  to closing `F-UX-01`.
- **Program owner:** S04B owns `F-UX-01`; the vocabulary is cross-cutting.

### `CQS-UX-P21` — Game/Session conceptual integrity

- **CQS principle:** the teacher can always tell whether an action affects
  reusable Game content or this class's Session.
- **Repo authority:** **Product Contract §4**; owner decision 2026-08-13;
  S04-family §5 — "Reset Session must not accidentally erase the saved
  reusable Game"; ADR-003.
- **Research support:** Young (mental models); Norman.
- **Evidence status:** `REPO-AUTHORITY`.
- **Primary surfaces:** Home, library, team identity, reset/delete, summary.
- **Anti-pattern:** a saved Game that retains a previous class's chosen team
  names; Reset Session reading as "delete my work".
- **Qualification implication:** run the same Game with two different classes
  and assert the exported Game is unchanged and carries neither class's
  chosen identities.
- **Program owner:** **S04A — TERMINALLY COMPLETE** for the model;
  cross-cutting for presentation in later surfaces.

### `CQS-UX-P22` — Save and recovery trust

- **CQS principle:** save, import, reset, recover, back up and delete
  correspond exactly to the teacher's understanding of what data is affected;
  persistence failure is visible.
- **Repo authority:** **Product Contract invariant 1** (teacher data outranks
  any release), invariants 12–14, §5; S04-family §7 visible save states, §15
  durability, §16 backup, §19 safe startup.
- **Research support:** Norman; Cooper.
- **Evidence status:** `REPO-AUTHORITY`.
- **Primary surfaces:** autosave, persistence controls, import, reset,
  startup recovery, backup.
- **Anti-pattern:** silent persistence failure; a "clear" control whose scope
  the teacher cannot predict.
- **Qualification implication:** induce a persistence failure and confirm a
  visible warning; then exercise close/reopen, app replacement, and upgrade
  and prove data survives.
- **Program owner:** **S04A — TERMINALLY COMPLETE** for save trust; S04C for
  backup, safe startup and compatibility UX.

### `CQS-UX-P23` — Personality after clarity

- **CQS principle:** clarity and control outrank theatricality; once they are
  preserved, CQS should feel like a polished game-show product.
- **Repo authority:** S04-family §30 — S05 is flagship fidelity and
  choreography, **not** generic "make it prettier", and spectacle must not
  obscure operation; PROJECT.md non-goal barring imitation of any commercial
  game show's branding, audio, or board styling.
- **Research support:** Walter; Hodent.
- **Evidence status:** `REPO-AUTHORITY` + `LITERATURE-ROUTING-ONLY`.
- **Primary surfaces:** Display, transitions, celebration, visual identity.
- **Anti-pattern:** polish that costs legibility or timing; or a Display so
  restrained it feels like a spreadsheet.
- **Qualification implication:** every S05 moment re-checked against `P14`,
  `P15` and `P16` before acceptance.
- **Program owner:** S05.

### `CQS-UX-P24` — Bounded design-system consistency

- **CQS principle:** a shared design language, deliberately smaller than the
  product; themes stay presentation-only.
- **Repo authority:** **PROJECT.md boundary 7** — themes never alter scoring,
  validation, event semantics, the private/public boundary, or answer-reveal
  authorization; Product Contract §9 and S04-family §37 — "no speculative
  frameworking or premature abstraction is authorized".
- **Research support:** Kholmatova; Lupton; Yablonski.
- **Evidence status:** `REPO-AUTHORITY`.
- **Primary surfaces:** global visual language, theme registry, tokens.
- **Anti-pattern:** a token taxonomy or component library built ahead of a
  real consumer; a theme that changes behavior.
- **Qualification implication:** theme-isolation tests already assert the
  behavioral boundary; the design-side check is that no design-system artifact
  exists without a consuming surface.
- **Program owner:** S05.

### `CQS-UX-P25` — Real-classroom qualification

- **CQS principle:** usability is a separate verdict from functional
  correctness, judged under realistic classroom conditions.
- **Repo authority:** S04-family §32 — S06 must be real integrated
  qualification, "not merely CI passed", and "do not infer Windows runtime
  PASS from GitHub Actions packaging"; §34 teacher acceptance scenario;
  EXECUTION-GUIDANCE evidence taxonomy separating physical from synthetic
  evidence.
- **Observed CQS evidence:** `CQS-UXF-13` — UX confusion was itself a
  qualification concern; `F-UX-01` survived as an open finding while the
  functional path passed.
- **Research support:** Endsley & Jones; Krug (cheap usability testing);
  Rogers, Sharp & Preece (evaluation methods).
- **Evidence status:** `REPO-AUTHORITY` + `OBSERVED-CQS-EVIDENCE`.
- **Primary surfaces:** all; acutely the teacher acceptance scenario.
- **Anti-pattern:** declaring a surface good because its tests pass, or
  because it looked fine on the developer's Mac.
- **Qualification implication:** clean-room teacher use on a physical
  Windows classroom-type machine with a real projector, real audio, and real
  hardware — currently **NOT RUN**.
- **Program owner:** S06.

---

## 4. Recorded disagreements

None are recorded in this slice. No external source has been ingested, so no
source-versus-source or source-versus-CQS conflict has yet arisen in evidence.

When one does arise, §3.4 of
[`CQS-UX-UI-REFERENCE-BIBLIOGRAPHY.md`](CQS-UX-UI-REFERENCE-BIBLIOGRAPHY.md)
governs: record the disagreement, test both positions against CQS's user,
environment and invariants, and make a CQS decision here rather than averaging
opinions.

---

## 5. Non-claims

This matrix does **not**:

- claim any listed source was read, or attribute any principle to a specific
  chapter or page;
- grant any external source authority over CQS product decisions;
- authorize implementation of any principle on any surface;
- reopen S04A, or claim S04B/S04C/S04D/S05/S06 scope;
- assert that any qualification implication listed here has been executed;
- change any Program-adoption state, gap-register entry, or finding
  disposition — `F-UX-01` / `CQS-Q23-LOW-01` remains **OPEN / RETAINED / LOW**
  on `main`.
