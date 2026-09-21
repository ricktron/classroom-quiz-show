# CQS UX surface inventory

- **Document id:** `CQS-UX-SURFACE-INVENTORY`
- **Program:** `CQS-REAL-MVP-1`
- **Registering slice:** `CQS-UX-GUIDANCE-S01-FOUNDATION`
- **Authorization:** `AUTHORIZE-CQS-UX-GUIDANCE-S01-FOUNDATION-1`
- **Date:** 2026-09-11
- **Status:** **ACTIVE — design guidance**
- **Kind:** durable UX/UI surface inventory. **Documentation only. This file
  authorizes no implementation and changes no Program status.**

This inventory names every CQS UX/UI surface, what it is for, what can go
wrong, which doctrine principles apply, and **which Program slice owns the
work**. Its second job is to prevent scope creep: identifying a desirable
improvement here routes it to an owner, it does not start it.

Principles referenced as `CQS-UX-Pnn` are defined in
[`CQS-UX-DOCTRINE.md`](CQS-UX-DOCTRINE.md). Observed failures referenced as
`CQS-UXF-nn` are in that file §12. Source shorthand (`Endsley`, `Norman`,
`Hodent`, …) resolves through
[`../research/CQS-UX-UI-REFERENCE-BIBLIOGRAPHY.md`](../research/CQS-UX-UI-REFERENCE-BIBLIOGRAPHY.md);
citing a source here is a **research-routing pointer**, not a claim that the
source was read on this topic.

```text
naming a surface ≠ authorizing work on it
```

---

## Reading the work-state column

> **Historical observation epoch.** This inventory was originally observed
> against `main` at `cf90eadb7794a3e2c2f529212432e4a4daaadc91` during the
> S04B candidate era. The **CURRENT** / **LATER** classifications below are
> inventory-era research labels, not current Program authorization or
> status. For current Program routing, use
> [`../STATUS.md`](../STATUS.md) and
> [`../handoff/CURRENT.md`](../handoff/CURRENT.md). The inventory's UX
> research and surface analysis remain useful; only the old Program-state
> vocabulary is frozen to that epoch.

| Work state | Meaning |
| --- | --- |
| **ALREADY IMPLEMENTED FOUNDATION** | Merged on `main` and treated as an existing qualified foundation. Not unfinished work to rebuild. Later slices may extend it only within their own scope. |
| **CURRENT** | Historical inventory label for work that sat inside the active S04B registered scope at this inventory's observation epoch. It does not express current Program status or authorization. |
| **LATER** | Owned by a named later slice that is not currently authorized for implementation (for example remaining S05 work, S04D, or S06). |
| **DEFERRED** | Outside REAL MVP, or dependent on an unresolved owner gate. |
| **NOT IMPLEMENTED** | No such surface is observed on `main`. Stated as absence, not as a plan. |

### What **CURRENT** does and does not mean

At this inventory's observation epoch, `CURRENT` identified surfaces that
sat inside the S04B lane's **registered scope** — the scope recorded in
[`../plans/CQS-REAL-MVP-S04-FAMILY-DIRECTION.md`](../plans/CQS-REAL-MVP-S04-FAMILY-DIRECTION.md)
§35 — and that were then being worked in an unmerged S04B candidate branch.

Those statements are historical observation facts. At that epoch,
[`../STATUS.md`](../STATUS.md) described S04B as the next planned frontier
and **NOT AUTHORIZED**, with implementation **not begun**. Nothing in this
inventory was an authorization then, and the retained `CURRENT` label must
not be read as today's Program status, as a claim that S04B remains the
active lane, or as current authorization. Current Program routing is owned
by [`../STATUS.md`](../STATUS.md) and
[`../handoff/CURRENT.md`](../handoff/CURRENT.md).

Historical observation basis: `main` at
`cf90eadb7794a3e2c2f529212432e4a4daaadc91`. Where a surface is described as
implemented at that epoch, a corresponding module was observed in `src/`.
No implementation is described that was not observed then.

---

## 1. Program ownership map

This map is the scope-creep guard. It restates existing canon
([`../plans/CQS-REAL-MVP-S04-FAMILY-DIRECTION.md`](../plans/CQS-REAL-MVP-S04-FAMILY-DIRECTION.md)
§35) and adds nothing to it.

### S04A — existing foundation; **do not reopen**

Home, game library, in-app board authoring, question/clue editing, Import
Quality Report, save trust, Game/Session foundation.

S04A is **TERMINALLY COMPLETE**. Research below identifies future polish
opportunities on these surfaces; recording them does **not** reopen S04A. Any
such polish needs a separate, later, bounded authorization and would not
automatically belong to S04A.

### S04B — active product lane at the inventory observation epoch

Class Setup, Sony theatrical team-name selection, controller/team identity,
buzzer readiness, the supported Sony setup path, setup-level hardware recovery
necessary to complete S04B, projector/audio preflight within S04B direction,
and `F-UX-01`.

**At the observation epoch, this research slice did not mutate that
unmerged S04B candidate.**

### S04C

Broader product safety and recovery UX: startup recovery, backup and
compatibility UX, sanitized diagnostics, intelligible failure handling.

### S04D

Intentional feedback/support flow; privacy-safe telemetry.

### S05

Flagship Host and Display visual fidelity, category-board presentation, clue
presentation, score presentation, buzz choreography, correct/incorrect
feedback, round transitions, Final choreography, motion vocabulary, visual
identity, game-show personality, global design-system implementation.

```text
S05 is not generic "make it prettier".
Display may become theatrical. Host remains operational and restrained.
```

**S05-F1** (`CQS-REAL-MVP-S05-F1-CORE-DISPLAY-READABILITY-AND-VISUAL-STRESS`)
is **TERMINALLY COMPLETE** on main for static Board + Clue Display
readability and automated visual-stress foundation. Remaining S05 families
(choreography, Host polish, further presentation) stay later and require
fresh bounded authorization. The S05 parent remains **OPEN / NOT
TERMINAL**.
### S06

Integrated release qualification: Windows-first physical use, projector
behavior, scaling, clean-room teacher use, accessibility, audio, controller
hardware, recovery, and the end-to-end experience.

---

## 2. Surfaces

### 1. Home / launch

- **User:** teacher, private.
- **Primary job:** decide what happens next — new game, resume, open a saved
  game, import.
- **Important states:** no games yet; recent/saved games present; unfinished
  session available to resume; unfinished session unreadable; import in
  progress.
- **UX risks:** launch surface becoming a control panel; resume versus new
  ambiguity; an unreadable session presenting as a dead end.
- **Principles:** `P01`, `P02`, `P04`, `P06`, `P21`, `P22`.
- **Research routing:** Norman, Cooper, Krug.
- **Ownership / state:** S04A — **ALREADY IMPLEMENTED FOUNDATION**
  (`src/routes/HomeRoute.tsx`, private-Host banner, Resume, Import, Recent
  Games, My Games, invalid-recovery path observed). S04C-H3 adds Host-only
  **Backup & restore** (`BackupRestorePanel`) — **TERMINALLY COMPLETE** on
  main after PR #82 squash `8d5c22b1d6bcd14286b5c2c6e05ba9144ec7b415`.
  That panel is not a projector surface. S04C-H4 salvage review is also
  Host-only and **TERMINALLY COMPLETE** on repair squash
  `3cd5e3a0f884f234b03425fd169e5e495fa1a147`. It is not published to the
  projector.

### 2. Game Library

- **User:** teacher, private.
- **Primary job:** find and act on a saved game.
- **Important states:** empty; few games; many games; a game mid-authoring
  (incomplete draft) beside compiled games.
- **UX risks:** drifting back toward a file utility; incomplete drafts
  indistinguishable from playable games.
- **Principles:** `P06`, `P07`, `P21`, `P18`.
- **Research routing:** Cooper, Tidwell.
- **Ownership / state:** S04A — **ALREADY IMPLEMENTED FOUNDATION**
  (`src/library/gameLibrary.ts`; My Games / Recent Games observed). Library
  scaling behavior at large game counts is a future-polish observation, not
  S04A work.

### 3. Create Game / authoring

- **User:** teacher, private, repeated professional use.
- **Primary job:** build a complete category-board + Final game without JSON
  or a spreadsheet.
- **Important states:** blank board; partially authored; complete;
  duplicated from an existing game; save in progress; save problem.
- **UX risks:** losing the board metaphor; losing place on every edit; save
  state ambiguity.
- **Principles:** `P18`, `P02`, `P22`, `P19`, `P07`.
- **Research routing:** Wroblewski, Jarrett & Gaffney, Tidwell, Cooper.
- **Ownership / state:** S04A — **ALREADY IMPLEMENTED FOUNDATION**
  (`src/routes/AuthoringRoute.tsx`, `src/authoring/`, including draft
  records, save gate, save trust and an undo stack).

### 4. Question / clue editor

- **User:** teacher, private.
- **Primary job:** enter and correct one clue's content quickly, then move to
  the next.
- **Important states:** empty; valid; incomplete; too long; media attached;
  validation warning.
- **UX risks:** modal editing that loses board context; validation that only
  speaks at save time; long-content limits discovered late.
- **Principles:** `P18`, `P02`, `P19`, `P20`.
- **Research routing:** Wroblewski, Jarrett & Gaffney, Podmajersky.
- **Ownership / state:** S04A — **ALREADY IMPLEMENTED FOUNDATION**
  (`src/authoring/` validation, limits and correction paths observed).

### 5. Import

- **User:** teacher, private.
- **Primary job:** bring an externally authored workbook or pack into CQS and
  understand what CQS thinks of it.
- **Important states:** valid; partially malformed; unsupported version;
  salvageable with warnings; rejected.
- **UX risks:** presenting heuristics as certainty; a validation wall with no
  route to fixing anything; teacher believing content was invented for them.
- **Principles:** `P08`, `P05`, `P20`, `P22`.
- **Research routing:** Podmajersky, Metts & Welfle, Krug.
- **Ownership / state:** S04A — **ALREADY IMPLEMENTED FOUNDATION**
  (`src/import/qualityReport.ts`, `src/host/QualityReportPanel.tsx`,
  `GameImportPanel`, `GamePackImportPanel` observed). S04C-H4 corrupt-import
  salvage is **TERMINALLY COMPLETE** on main (implementation PR #84 squash
  `2c484a2d0ce73fa4f52717773e93fb3ad1e917ef`; repair PR #85 squash
  `3cd5e3a0f884f234b03425fd169e5e495fa1a147`). Host-only. Canonical import
  remains the playable gate. An accepted **LOW** remains: after a successful
  Keep, the collapsed **More detail about this file** note may still say
  nothing was saved; the primary status line is the durable outcome. Pack
  salvage is not part of H4.

### 6. Class Setup

- **User:** teacher, private, minutes before class.
- **Primary job:** get this class ready to play.
- **Important states:** nothing configured; teams set; buzzers optional and
  unconfigured; buzzers configured; display not open; audio unverified;
  ready to play; blocked.
- **UX risks:** `CQS-UXF-01` diagnostics wall; `CQS-UXF-02` flat hierarchy;
  `CQS-UXF-03` unclear current task.
- **Principles:** `P02`, `P04`, `P05`, `P09`, `P11`, `P19`.
- **Research routing:** Endsley & Jones, Norman, Cooper, Johnson.
- **Ownership / state:** **S04B — CURRENT.** Not mutated by this slice.

### 7. Team creation / name selection

- **User:** teacher (manual path); students (Sony path).
- **Primary job:** establish this class's team identities for this Session.
- **Important states:** default names; manually entered; Sony selection in
  progress; locked; duplicate/conflicting; insufficient name inventory.
- **UX risks:** Session identities leaking into the saved Game; name
  uniqueness failing visibly during a live selection.
- **Principles:** `P21`, `P07`, `P17`, `P19`.
- **Research routing:** Hodent, Lupton.
- **Ownership / state:** **S04B — CURRENT.** A Game-owned name-bank seam is
  merged from S04A; theatrical selection is S04B.

### 8. Controller identity / team assignment

- **User:** teacher, private.
- **Primary job:** make each physical handset correspond to a team.
- **Important states:** unassigned; assigned; responding; not responding;
  reassigned mid-setup.
- **UX risks:** `CQS-UXF-06` browser identity shown instead of physical
  identity; `CQS-UXF-11` ambiguous "Controller 1".
- **Principles:** `P06`, `P07`, `P08`, `P17`.
- **Research routing:** Norman (mapping), Young.
- **Ownership / state:** **S04B — CURRENT.** Input mapping foundation
  (`src/input/`) is an existing qualified foundation from slices 8–10 / 21.

### 9. Sony connection / pairing / sleep / wake / recovery

- **User:** teacher, private, under time pressure.
- **Primary job:** get the supported Sony set responding, or decide to move on
  without it.
- **Important states:** receiver absent; receiver detected; controllers
  responding; some responding; pairing required; asleep; woken; abandoned in
  favor of keyboard.
- **UX risks:** `CQS-UXF-04` receiver health read as class readiness;
  `CQS-UXF-05` Connect actionable while connected; `CQS-UXF-08` jittering
  status text; `CQS-UXF-09` technical concepts in normal setup;
  `CQS-UXF-10` recovery instructions more complex than the product.
- **Principles:** `P08`, `P09`, `P10`, `P11`, `P06`, `P20`.
- **Research routing:** Endsley & Jones, Norman, Johnson.
- **Ownership / state:** **S04B — CURRENT** for setup-level recovery within
  S04B scope. `src/host/SonyBuzzSetupSection.tsx` and the Slice 21 guided
  repair flow are an **ALREADY IMPLEMENTED FOUNDATION** on `main`. Deeper
  Sony device/sleep physical qualification remains S06 — **LATER**. Packaged
  physical Sony qualification on Windows is **NOT RUN**.

### 10. Buzzer Check

- **User:** teacher, private; students press.
- **Primary job:** prove each handset actually reaches CQS, attributably.
- **Important states:** waiting; one press seen; several seen; all seen; a
  handset never seen.
- **UX risks:** `CQS-UXF-07` transient display hiding simultaneous inputs.
- **Principles:** `P03`, `P07`, `P16`, `P08`.
- **Research routing:** Swink, Saffer, Hodent.
- **Ownership / state:** **S04B — CURRENT.** A Buzzer Check exists within
  `SonyBuzzSetupSection` on `main` (**ALREADY IMPLEMENTED FOUNDATION**). A
  richer controller-tutorial / reaction minigame is **DEFERRED — post-MVP**.

### 11. Keyboard / manual fallback

- **User:** teacher, private.
- **Primary job:** run the class when hardware is absent or fails.
- **Important states:** default path; adopted after hardware failure; mapping
  customized.
- **UX risks:** discoverable only after failure; presented as degraded.
- **Principles:** `P12`, `P11`, `P17`.
- **Research routing:** Horton & Quesenbery, Pickering.
- **Ownership / state:** **ALREADY IMPLEMENTED FOUNDATION**
  (`src/input/keyboardAdapter.ts`, `src/host/LocalInputHostPanel.tsx`).
  Discoverability within Class Setup is **S04B — CURRENT**.

### 12. Main Host gameplay console

- **User:** teacher, private, one second of spare attention.
- **Primary job:** run the game — arm, adjudicate, score, advance.
- **Important states:** board; clue open; armed; buzz queue active;
  adjudicating; between clues; round transition; Final; complete.
- **UX risks:** controls moving between states; too many simultaneous primary
  decisions; ceremony delaying correct input.
- **Principles:** `P02`, `P04`, `P16`, `P13`, `P12`, `P19`.
- **Research routing:** Endsley & Jones, Cooper, Swink.
- **Ownership / state:** **ALREADY IMPLEMENTED FOUNDATION** (`src/host/`
  panels). Host **visual fidelity** is S05 — **LATER**, and S05 keeps the Host
  restrained.

### 13. Category-board Host

- **User:** teacher, private.
- **Primary job:** choose the next clue and see board progress.
- **Important states:** full board; partially played; all consumed.
- **UX risks:** Host board diverging in layout from the Display board, so the
  teacher's spatial memory stops transferring.
- **Principles:** `P07`, `P13`, `P02`.
- **Research routing:** Tidwell, Johnson.
- **Ownership / state:** **ALREADY IMPLEMENTED FOUNDATION**
  (`src/host/CategoryBoardHostPanel.tsx`). Presentation is S05 — **LATER**.

### 14. Student / projector category board

- **User:** students, across the room.
- **Primary job:** see what is available and what has been played.
- **Important states:** full; partially consumed; category complete;
  long category names; 1280×720; scaled.
- **UX risks:** category headers that truncate or reflow; consumed-tile state
  unreadable at distance.
- **Principles:** `P14`, `P13`, `P17`.
- **Research routing:** Lupton, Hodent.
- **Ownership / state:** **ALREADY IMPLEMENTED FOUNDATION**
  (`src/display/CategoryBoardDisplay.tsx`). **S05-F1** static Board
  fidelity / stress foundation is **TERMINALLY COMPLETE** on main
  (hierarchy, six×five stress layout, stable consumed slots, non-color
  Used semantics, 8-team coexistence, 720p/1080p automation, high
  contrast). Later Board choreography or further presentation refinement
  remains S05 — **LATER**.

### 15. Question / clue Display

- **User:** students, across the room.
- **Primary job:** read and understand the prompt.
- **Important states:** revealed; with media; long text; answer revealed after
  explicit host action.
- **UX risks:** long-prompt overflow; media crowding text; premature reveal.
- **Principles:** `P14`, `P13`, `P17`.
- **Research routing:** Lupton, Hodent.
- **Ownership / state:** **ALREADY IMPLEMENTED FOUNDATION**
  (`src/display/`, `MediaContentDisplay`). **S05-F1** static Clue/question
  fidelity and schema-max readability are **TERMINALLY COMPLETE** on main
  (distance-first hierarchy, full authored-text visibility, clipping
  protection, 8-team coexistence, timer/Signal Rail semantics preserved).
  Later Clue choreography or presentation effects remain S05 — **LATER**.
  Answer-reveal authorization is an architectural invariant, not a design
  choice.

### 16. Buzz-in moment

- **User:** students and teacher simultaneously.
- **Primary job:** make "who buzzed, in what order" instantly unambiguous.
- **Important states:** armed; first buzz; queue forming; promoted next team;
  queue cleared.
- **UX risks:** perceived latency; ambiguity about order; a tie that looks
  arbitrary.
- **Principles:** `P16`, `P07`, `P15`, `P08`.
- **Research routing:** Swink, Saffer, Head.
- **Ownership / state:** **ALREADY IMPLEMENTED FOUNDATION**
  (`src/display/BuzzQueueDisplay.tsx`, ordered queue and promotion from
  Slice 8). Buzz / active-claim **choreography** under
  `CQS-REAL-MVP-S05-BUZZ-ACTIVE-CLAIM-CHOREOGRAPHY` is **TERMINALLY
  COMPLETE** on main after PR #91. Cause-specific rebound copy, outcome
  feedback, and broader S05 spectacle remain **LATER**.

### 17. Answer adjudication

- **User:** teacher, private.
- **Primary job:** decide correct / incorrect / partial and move on.
- **Important states:** awaiting judgement; correct; incorrect with promotion;
  pass; partial credit.
- **UX risks:** confirmation ceremony on a hot path; unclear which team the
  judgement applies to.
- **Principles:** `P02`, `P16`, `P19`, `P07`.
- **Research routing:** Cooper, Endsley & Jones.
- **Ownership / state:** **ALREADY IMPLEMENTED FOUNDATION**
  (`src/host/TeamScoringPanel.tsx` and the response-opportunity path).
  Correct/incorrect **feedback presentation** is S05 — **LATER**.

### 18. Scoreboard

- **User:** students (public) and teacher (private view).
- **Primary job:** know the standings.
- **Important states:** zero; positive; negative; tied; 8 teams; long team
  names.
- **UX risks:** score legibility at distance; negative scores; name overflow.
- **Principles:** `P14`, `P13`, `P17`.
- **Research routing:** Lupton, Hodent.
- **Ownership / state:** **ALREADY IMPLEMENTED FOUNDATION**
  (`src/display/TeamScoreboard.tsx`, `src/display/audience/ScoreLayout.tsx`).
  Score presentation is S05 — **LATER**.

### 19. Manual score correction

- **User:** teacher, private.
- **Primary job:** fix a score without argument or ceremony.
- **Important states:** adjust up; adjust down; correct a mis-adjudication.
- **UX risks:** correction hidden behind gameplay flow; ambiguity about which
  team and what delta.
- **Principles:** `P19`, `P02`, `P08`.
- **Research routing:** Cooper.
- **Ownership / state:** **ALREADY IMPLEMENTED FOUNDATION** (unrestricted
  teacher-controlled correction, owner decision; `TeamScoringPanel`).

### 20. Round transitions

- **User:** students and teacher.
- **Primary job:** make the change of context unmistakable.
- **Important states:** board complete; moving to Final; between rounds.
- **UX risks:** transition that costs time without conveying causality;
  reduced-motion path that loses the state change entirely.
- **Principles:** `P15`, `P13`, `P17`.
- **Research routing:** Head, Saffer, Hodent.
- **Ownership / state:** S05 — **LATER** for choreography. Round model is an
  **ALREADY IMPLEMENTED FOUNDATION** (ADR-003, ADR-005, ADR-014).

### 21. Final Wager

- **User:** teacher (private control) and students (public).
- **Primary job:** run wagering and reveal fairly.
- **Important states:** eligibility determined; wagers entered; committed;
  answering; revealed; expired.
- **UX risks:** wager privacy; commit ambiguity; durability across
  interruption.
- **Principles:** `P08`, `P13`, `P22`, `P19`.
- **Research routing:** Hodent, Endsley & Jones.
- **Ownership / state:** **ALREADY IMPLEMENTED FOUNDATION**
  (`FinalWagerHostPanel`, `FinalWagerDisplay`, ADR-014; a Final durability
  race was closed in Slice 23). Final **choreography** is S05 — **LATER**.

### 22. Audio controls

- **User:** teacher, private.
- **Primary job:** confirm sound works and control it.
- **Important states:** muted; unmuted; device changed by projector
  connection; audio unavailable.
- **UX risks:** assuming the OS default is the intended device; building a
  mixer nobody asked for.
- **Principles:** `P08`, `P09`, `P17`.
- **Research routing:** Norman, Cooper.
- **Ownership / state:** **ALREADY IMPLEMENTED FOUNDATION**
  (`src/host/AudioControls.tsx`, `usePresentationAudio`, ADR-020). Audio
  **readiness within Class Setup** is **S04B — CURRENT**. Device-selection
  physical/integrated resilience remains S06 — **LATER**.

### 23. Emergency Mute

- **User:** teacher, private, instantly.
- **Primary job:** stop all sound now.
- **Important states:** available at all times; engaged; released.
- **UX risks:** becoming the current task; being nested behind audio settings.
- **Principles:** `P02`, `P16`, `P11`.
- **Research routing:** Endsley & Jones.
- **Ownership / state:** ADR-020 mute is an **ALREADY IMPLEMENTED
  FOUNDATION**; always-visible **Mute all sounds** placement within Class
  Setup is **S04B — CURRENT**.

### 24. Projector / display setup

- **User:** teacher, private, before class.
- **Primary job:** get the Display onto the right screen.
- **Important states:** Display closed; open on the wrong monitor; open and
  correct; reopened after accidental close.
- **UX risks:** exposing window-management internals; no simple "move it to
  the projector" affordance.
- **Principles:** `P06`, `P02`, `P09`, `P13`.
- **Research routing:** Norman, Cooper.
- **Ownership / state:** **S04B — CURRENT** for projector readiness within
  S04B direction. Host/Display native windows are an **ALREADY IMPLEMENTED
  FOUNDATION** (S03, ADR-021). S04C display-placement / wake-republish recovery
  is **TERMINALLY COMPLETE** on main (PR #87 squash
  `0d1fac747c0768d6f0dd0960781f6ab8a7184ece`): when exactly one non-Host screen
  exists, the desktop shell may place the audience Display there; teacher
  Focus/Open rescues a Display stranded off every connected screen; Display
  visibility resume and desktop system-resume remount re-request sanitized
  PublicState. Physical projector / sleep/wake / Windows scaling qualification
  remains S06 — **LATER**.

### 25. Display confidence / readiness

- **User:** teacher, private.
- **Primary job:** verify before class that students will actually see what
  they need to see.
- **Important states:** unverified; sample rendered; problem observed.
- **UX risks:** readiness that only proves a window opened, not that content
  is legible.
- **Principles:** `P04`, `P05`, `P14`, `P25`.
- **Research routing:** Endsley & Jones, Lupton.
- **Ownership / state:** **S04B — CURRENT** (Host-only audience preview
  within S04B scope). Automated **S05-F1** 720p/1080p stress-fixture
  verification is **TERMINALLY COMPLETE** on main. Physical projector /
  Windows / classroom stress qualification remains S06 — **LATER**.

### 26. Display motion / transitions

- **User:** students.
- **Primary job:** make state changes perceptible and explained.
- **Important states:** full motion; reduced motion; grayscale;
  high contrast.
- **UX risks:** reduced motion silently removing necessary state feedback;
  motion competing with reading.
- **Principles:** `P15`, `P17`, `P14`, `P23`.
- **Research routing:** Head, Saffer, Hodent.
- **Ownership / state:** S05 — **LATER** for the motion vocabulary.
  `prefers-reduced-motion` handling is observed in existing Display CSS
  (**ALREADY IMPLEMENTED FOUNDATION**).

### 27. Startup / session recovery

- **User:** teacher, private, possibly in front of a class.
- **Primary job:** get back to a usable state without losing the library.
- **Important states:** clean start; restorable session; unreadable session;
  started without restoring.
- **UX risks:** a bad restore locking the teacher out; escaping a broken
  session by destroying data.
- **Principles:** `P10`, `P22`, `P11`, `P08`.
- **Research routing:** Norman, Cooper, Endsley & Jones.
- **Ownership / state:** Resume and an invalid-recovery path are observed on
  Home (**ALREADY IMPLEMENTED FOUNDATION**, `src/persistence/`, ADR-013).
  S04C-H1 repairs Home Resume so it performs Host resume semantics once
  (**TERMINALLY COMPLETE** on main after PR #78; at that stage it did **not**
  complete S04C). S04C-H3 library backup/restore is **TERMINALLY COMPLETE**
  on main after PR #82 (Host-only; unfinished Session excluded). S04C
  safety/recovery implementation, including bounded Display placement,
  stranded-window rescue, and wake/resume PublicState catch-up, is now
  **TERMINALLY COMPLETE** on main after PR #87. Physical/integrated projector,
  sleep/wake, scaling, and related environment qualification remains S06 —
  **LATER**.

### 28. Session completion

- **User:** teacher and students.
- **Primary job:** end the game cleanly and definitively.
- **Important states:** in progress; complete; recorded.
- **UX risks:** ambiguity about whether the session is finished and safe to
  close.
- **Principles:** `P08`, `P21`, `P22`.
- **Research routing:** Cooper.
- **Ownership / state:** **ALREADY IMPLEMENTED FOUNDATION**
  (`src/summary/`, ADR-015). Winner-celebration choreography is S05 —
  **LATER**.

### 29. Post-game summary

- **User:** teacher, private.
- **Primary job:** see and retain the result.
- **Important states:** just completed; historical; ledger view.
- **UX risks:** implying defensible individual analytics, which is a
  permanent non-goal.
- **Principles:** `P21`, `P22`, `P20`.
- **Research routing:** Cooper, Podmajersky.
- **Ownership / state:** **ALREADY IMPLEMENTED FOUNDATION**
  (`SessionSummaryPanel`, `CompletedSummaryLedgerPanel`, ADR-015, ADR-016).

### 30. Game versus Session conceptual UX

- **User:** teacher, private.
- **Primary job:** always know which thing an action affects.
- **Important states:** reusable Game; active Session; reset Session;
  deleted Game.
- **UX risks:** Reset Session reading as "delete my work"; Session identities
  persisting into the Game.
- **Principles:** `P21`, `P22`, `P20`, `P19`.
- **Research routing:** Young, Norman.
- **Ownership / state:** S04A — **ALREADY IMPLEMENTED FOUNDATION**
  (Game/Session separation merged and terminal). Cross-surface vocabulary
  consistency is cross-cutting.

### 31. Errors / warnings / blockers

- **User:** teacher, private.
- **Primary job:** know what is wrong, what it blocks, and what to do.
- **Important states:** informational; warning that does not block play;
  blocker; resolved.
- **UX risks:** everything styled as an error; a blocker that does not say
  what it blocks; jitter between states (`CQS-UXF-08`).
- **Principles:** `P05`, `P08`, `P20`, `P03`.
- **Research routing:** Podmajersky, Metts & Welfle, Endsley & Jones.
- **Ownership / state:** **Cross-cutting.** S04C safety/recovery foundations
  are **TERMINALLY COMPLETE** on main. Individual later lanes still own their
  own error/warning copy. Cross-cutting polish can occur without reopening
  S04C.

### 32. Advanced diagnostics / support evidence

- **User:** teacher, and whoever is helping them.
- **Primary job:** produce useful evidence without leaking classroom content.
- **Important states:** collapsed; expanded; report copied.
- **UX risks:** diagnostics leaking into normal setup (`CQS-UXF-09`);
  classroom content or PII appearing in a report.
- **Principles:** `P09`, `P06`, `P08`.
- **Research routing:** Podmajersky.
- **Ownership / state:** S04C-H2 — **TERMINALLY COMPLETE** for Copy
  Diagnostic Report on main (PR #80 squash
  `506654f1f6b4a0735a43cdda8a0100200c3dce29`). Broader support/telemetry
  attachment remains S04D. The privacy rule is a Product Contract
  requirement today, not a later decision.

### 33. Onboarding / first run

- **User:** teacher who has never used CQS.
- **Primary job:** reach a first successful game without assistance.
- **Important states:** first launch; returning user; guidance dismissed.
- **UX risks:** a mandatory wizard on every session; guidance that cannot be
  dismissed or re-found.
- **Principles:** `P01`, `P02`, `P09`, `P19`.
- **Research routing:** Krug, Cooper, Hodent.
- **Ownership / state:** **NOT IMPLEMENTED** as a distinct surface on `main`;
  canon calls for a simple dashboard plus **optional** first-run guidance, and
  the ordinary-workflow ordering is observed in `FoundationControls`.
  A Demo Game confidence path is direction, not observed implementation.
  Routing: S04A owns the dashboard (terminal); any added first-run guidance
  needs separate later authorization — **LATER**.

### 34. Accessibility

- **User:** every user.
- **Primary job:** make the whole product operable and perceivable.
- **Important states:** keyboard-only; high contrast; grayscale;
  reduced motion; screen reader where applicable.
- **UX risks:** treating accessibility as an S05 or S06 checklist rather than
  a structural constraint on every surface.
- **Principles:** `P17`, `P12`, `P14`, `P15`.
- **Research routing:** Horton & Quesenbery, Pickering, Lupton.
- **Ownership / state:** **Cross-cutting.** A high-contrast theme,
  reduced-motion CSS and focus/label practice are observed
  (**ALREADY IMPLEMENTED FOUNDATION**). Integrated accessibility
  qualification is S06 — **LATER**.

### 35. Unusual classroom / projector / window environments

- **User:** teacher, private.
- **Primary job:** keep working when the environment is not ideal.
- **Important states:** 100 / 125 / 150% Windows scaling; 1920×1080;
  1280×720; mirrored; extended; projector becomes primary; disconnect and
  reconnect; resolution change mid-session; sleep/wake; accidental window
  close.
- **UX risks:** inferring physical Windows behavior from CI or from macOS
  development.
- **Principles:** `P25`, `P14`, `P10`, `P11`.
- **Research routing:** Endsley & Jones.
- **Ownership / state:** S06 — **LATER** for physical/integrated
  qualification. S04C implementation of bounded Display placement, stranded
  window rescue, and wake/resume PublicState catch-up is **TERMINALLY
  COMPLETE** on main. Physical Windows runtime is **NOT RUN**.

### 36. Global visual language / design system

- **User:** every user, indirectly.
- **Primary job:** keep intent and consistency across surfaces and slices.
- **Important states:** default theme; high contrast; future flagship
  treatment.
- **UX risks:** a design-system program larger than the product; themes
  acquiring behavioral authority.
- **Principles:** `P24`, `P23`, `P13`, `P07`.
- **Research routing:** Kholmatova, Lupton, Yablonski.
- **Ownership / state:** S05 — **LATER** for implementation. A theme registry,
  token surface and theme-isolation tests exist (**ALREADY IMPLEMENTED
  FOUNDATION**); themes remain presentation-only.

### 37. Information density / progressive disclosure

- **User:** teacher, private.
- **Primary job:** see the right amount at the right time.
- **Important states:** normal; recovery; Advanced.
- **UX risks:** the diagnostics wall in any new form; over-hiding, so that
  ordinary things become unfindable.
- **Principles:** `P09`, `P05`, `P02`.
- **Research routing:** Krug, Tidwell, Johnson.
- **Ownership / state:** **Cross-cutting.** Teacher-simple progressive
  disclosure is **FOUNDATION IMPLEMENTED** per the gap register; each lane
  owns its own surfaces.

### 38. Microcopy / terminology

- **User:** teacher, private.
- **Primary job:** understand what a control does before pressing it.
- **Important states:** action labels; status text; warnings; recovery
  instructions; Advanced labels.
- **UX risks:** implementation vocabulary in ordinary copy (`CQS-UXF-09`);
  inconsistent terms across surfaces; recovery names that describe mechanism
  rather than effect.
- **Principles:** `P20`, `P06`, `P08`.
- **Research routing:** Podmajersky, Metts & Welfle, Krug.
- **Ownership / state:** **Cross-cutting.** `F-UX-01` is the retained finding
  and is assigned to **S04B — CURRENT**; it remains **OPEN / RETAINED / LOW**
  on `main`.

### 39. Classroom-pressure operation

- **User:** teacher, during live play.
- **Primary job:** act correctly with almost no spare attention.
- **Important states:** every live gameplay state.
- **UX risks:** controls that move; modal interruption mid-play; confirmation
  ceremony on hot paths.
- **Principles:** the one-second standard, `P02`, `P03`, `P16`, `P12`.
- **Research routing:** Endsley & Jones, Hodent, Swink.
- **Ownership / state:** **Cross-cutting** design standard; qualification is
  S06 — **LATER**.

### 40. Responsive / game-feel behavior

- **User:** teacher and students.
- **Primary job:** make the product feel alive and immediate rather than
  sluggish or noisy.
- **Important states:** input acknowledgement; state change; transition;
  celebration.
- **UX risks:** choreography that gates acknowledgement; polish that makes
  correct input feel late.
- **Principles:** `P16`, `P15`, `P23`.
- **Research routing:** Swink, Saffer, Head, Hodent.
- **Ownership / state:** S05 — **LATER** for choreography. The immediacy
  constraint applies to any slice that touches a live path.

---

## 3. Non-claims

This inventory does **not**:

- claim any surface is polished, complete, or qualified;
- describe implementation that was not observed on `main` at
  `cf90eadb7794a3e2c2f529212432e4a4daaadc91`;
- reopen S04A;
- authorize or claim S04D, additional S05, or S06 scope;
- modify the Program gap register or any Program-adoption state;
- close `F-UX-01` / `CQS-Q23-LOW-01`;
- describe the then-unmerged S04B candidate's implementation as merged at
  the observation epoch.
