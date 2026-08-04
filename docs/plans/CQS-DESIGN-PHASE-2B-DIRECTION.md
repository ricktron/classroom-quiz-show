# CQS Phase 2B — Accepted Audience-Display Design Direction

## 1. Status and authority

- **Document id:** `CQS-DESIGN-PHASE-2B-DIRECTION`
- **Date:** 2026-08-03
- **Authorization:** `AUTHORIZE-CQS-DESIGN-PHASE-2B-REGISTRATION-1`
  (documentation-only, exact-base delivery)
- **Evidence state:** `CQS-DESIGN-PHASE-2B-ES-1`
- **Authorized base:** `6eef3eb9d96c9337756ccf274170d05280fd22d0`
- **Disposition:** **`PASS — PHASE 2B DESIGN DIRECTION ACCEPTED FOR PROGRAM USE`**

This document is the canonical Phase 2B **program-guidance** record. It registers
an accepted **design direction for the future audience (projector) display**. It
is a **documentation-only registration** and carries **no implementation
authority** of any kind.

What the disposition means, stated exactly:

- the direction is **accepted as intended future audience-display guidance**;
- **the design is not implemented**;
- **the representative artifacts are evidence, not application source**;
- **Phase 3 is not authorized**;
- **Slice 16 is not authorized**;
- **no production, projector, accessibility, or Raspberry Pi acceptance exists.**

**This repository remains the single source of implementation truth.** Per
[`../../AGENTS.md`](../../AGENTS.md), observed merged code, tests, configuration,
and Git history establish what is implemented; this document establishes only
what has been **accepted as direction**. Where this document and the repository's
observed implementation appear to disagree about what exists today, **the
repository is correct by definition**, and this document is the thing to be
corrected.

This registration creates no new `CQS-OD-*`, changes no existing owner decision's
acceptance or activation state, promotes no parked or `architecture-preserved`
capability, and alters no current MVP sequencing. The 18-slice plan of record in
[`MVP-ARC.md`](MVP-ARC.md) is unchanged.

## 2. Provenance and evidence limits

### Artifact lineages

Two distinct artifact lineages existed, and they must not be conflated:

1. **A separately reported larger Phase 2B package of approximately 97 files.**
   It was **not committed to this repository** and was **not the basis of the
   bounded reconstruction review**. Its existence is recorded here as reported;
   nothing in this document should be read as a claim that no larger package ever
   existed.
2. **A ten-file minimal reconstruction.** This is the artifact set that was
   actually used for **bounded Program Orchestrator review**, and it is the sole
   evidentiary basis for the acceptance recorded here.

The reconstructed artifacts are **evidence of a design direction**. They are
**not application source**, not a component library, not a specification of
record for any renderer, and not a substitute for the implementation work that a
future authorized slice would have to perform.

### Repair history

The direction reached acceptance only after **bounded artifact repair**. The
acceptance recorded here is acceptance of the **direction**, evaluated on the
repaired ten-file reconstruction — not acceptance of any particular file, byte
sequence, or package.

### Exact evidence wording

> The Phase 2B design direction was accepted after bounded artifact repair. The
> artifact maintainer reported successful final package verification. The final
> corrected ZIP was not independently reopened by the Program Orchestrator, so no
> independent second checksum audit is claimed.

### Evidence limits

- **No independent second checksum audit is claimed.** The final corrected
  package's verification is a **reported** result from the artifact maintainer,
  not an observation the Program Orchestrator reproduced.
- **No artifact bytes are committed by this registration.** No ZIP, PNG, HTML
  renderer, helper script, inventory, checksum file, or reconstruction note
  enters this repository. No artifact hash and no artifact path is asserted
  anywhere in this document, because none was independently observed.
- The design direction below is therefore recorded as **accepted guidance**, and
  every implementation-shaped statement in it is written as a **future**
  obligation, never as a description of current behavior.

## 3. Accepted visual direction

The accepted direction for the future audience display is **board-first**: the
game board is the primary object on screen, and every other element is arranged
around it rather than competing with it.

- **Board-first composition** — the board holds the visual center of gravity.
- **Dark navy/black technological environment** — a deep, low-luminance shell
  that lets projected content carry the brightness.
- **Cyan/blue luminous edges** — accent light used for structure and state, not
  decoration for its own sake.
- **Framed or beveled tiles** — tiles read as physical, bounded objects with a
  clear edge, so "a tile" is legible as a unit from the back of a room.
- **Compact score hierarchy** — scores are dense, ordered, and secondary to the
  board without becoming unreadable.
- **Upper-left identity region** — a reserved region for game/class identity.
- **Central Nexus Core** — a persistent central status region (see §4).
- **Strong projector legibility** — every choice is subordinate to being readable
  on a classroom projector.
- **No proprietary game-show imitation** — this remains a permanent product
  boundary ([`../PROJECT.md`](../PROJECT.md) major non-goals). The direction is a
  technological environment, not an imitation of any commercial show's branding,
  audio, or board styling.

## 4. Nexus Core

The **Nexus Core** is a persistent central status region. It is the one place a
class looks to answer "where are we right now". It carries:

- **round or stage;**
- **timer;**
- **board or response status;**
- **Final status.**

The Nexus Core is a **placement and composition decision**. It presents status
that the public state already carries, or that a separately authorized future
slice would have to supply; it introduces no authority and no new public state by
itself.

## 5. Adaptive score layouts

The accepted direction defines three score layouts, selected by active team
count, covering the full **one through eight** logical-team range that CQS
supports today (`MIN_TEAMS = 1`, `MAX_TEAMS = 8` in
`src/game/teams/limits.ts`):

| Active teams | Layout | Placement |
| --- | --- | --- |
| **1–4** | **Score Column** | left side |
| **5–6** | **Score Strip** | bottom |
| **7–8** | **Score Deck** | 4×2, at constrained 1280×720 |

### Invariants binding on any future implementation

- **Stable authored order.** Team positions follow authored order and do not move
  during normal gameplay (`CQS-OD-033`, already an implemented rule;
  `CQS-RA2-TEAM-ORDER-01`).
- **No automatic score ranking.** The score layouts never reorder themselves by
  score. A ranked list is a leaderboard by another name, and raw-score
  leaderboards as a default surface are excluded
  (`ROADMAP-AMENDMENT-001` §5.7; [`MVP-ARC.md`](MVP-ARC.md) Slice 15 exclusions).
- **Negative scores supported**, with an **explicit minus sign** — never colour
  alone, never a parenthesis convention.
- **Long-name handling** is required, not optional. Team names are bounded at 40
  characters (`MAX_TEAM_NAME_LENGTH`), and the layout must remain legible at that
  bound.
- **Identity is never communicated by colour alone.** Accent is supplemental to a
  visible name, exactly as the current sanitizer boundary already treats it.
- **No required representatives, rosters, or emblems.** The base display requires
  only team names, accents, scores, and structural cues.

### Compatibility classification

The three score layouts are classified as a **likely responsive
presentation/component refactor**, **not inherently a public-state or
scoring-schema change**. Team name, accent, and score are already public
(`PublicTeam`), and layout selection by active team count is derivable from data
the display already receives.

## 6. Quiet cognition

During prompt reading, the display should get out of the way:

- **question content dominates;**
- **unnecessary framing recedes;**
- **continuous animation stops;**
- **timer and status remain in the Nexus Core;**
- **no meaning depends on motion.**

### Current implementation constraint

**The current public board DTO does not publish the complete board while a
selected question is open.** The board's public state is a current-stage-only DTO
(ADR-005; `PublicCategoryBoardState` in `src/state/publicState.ts`), so while a
tile is open the display does not hold full semantic board context.

**Therefore an initial quiet-cognition lattice must be decorative or generic**
unless a **separately authorized public-wire change** supplies additional
semantic board context. A future implementation must not infer, cache, or
reconstruct board semantics the wire did not send.

## 7. Loud consequences

Bounded emphasis may accompany:

- **selection;**
- **reveal;**
- **adjudication;**
- **score change;**
- **category clearing;**
- **Final settlement;**
- **winner-safe or tie-safe results.**

**No state may depend on motion, glow, colour, or audio alone.** This restates a
hard requirement already recorded in
[`HOST-CONSOLE-TEAM-IDENTITY-AND-PRESENTATION.md`](HOST-CONSOLE-TEAM-IDENTITY-AND-PRESENTATION.md)
§5: presentation completion never becomes authoritative game-state input, and no
animation, sound, or transition ever gates a command, event, score, timer, or
reveal.

## 8. Buzz queue and Signal Rail

### Recorded boundary

- **One active team may be public.**
- **An anonymous waiting count may be public.**
- **Waiting-team identities and order remain private.**
- **Promotion after an incorrect response or a host pass remains supported**
  (`OG-3`, implemented in Slice 8).
- **No permanent first-signal lockout implication.** `OG-2` preserves a full
  ordered team queue rather than a first-only lockout, and
  `CQS-RA2-EARLY-LOCKOUT-01` keeps early-press lockout distinct from a first-only
  queue lockout.

### Signal Rail definitions

- **Compact Signal Rail** — board-open status.
- **Expanded Signal Rail** — active response.
- **Final stage rail** — replaces buzz semantics during Final.

### Alignment with wire version 8

This aligns with the existing public state exactly: `PublicBuzzState` carries
`activeTeamKey` plus `waitingCount` and **never a public ordered queue**. The
current implementation records this deliberately — the projector carries the
active team and a count of teams waiting, while the host panel carries the full
ordered queue. Any future Signal Rail renders **that** data and no more.

## 9. Living-board memory

### Supported public presentation

- **available;**
- **selected;**
- **neutral used/dormant;**
- **completed/cleared category;**
- **derived depletion/progress.**

### Unsupported without separately authorized state work

- **correct/incorrect tile outcome;**
- **owning team;**
- **tile score delta;**
- **representative identity;**
- **outcome history.**

Today a used tile is a **neutral** fact: revealing an answer awards nothing, and
the public board state does not carry which team answered, whether the answer was
correct, or what points moved. Presenting any of those would be a **public-wire
and state-model change** requiring its own authorization.

**Derived progress must match visible tile states exactly.** A progress or
depletion indicator is a summary of what the class can already see; it must never
be computed from information the projector does not hold, and it must never
disagree with the tiles on screen.

## 10. Final settlement and privacy

### Supported

- **settled stage;**
- **public final scores;**
- **unique-leader result;**
- **tie-safe presentation when the public outcome is tied;**
- **Final status rail.**

### Wire-version-8 privacy, preserved

The public Final state must continue to carry:

- **no unrevealed wagers;**
- **no unrevealed answers or responses;**
- **no host notes;**
- **no private caps or calculations;**
- **no reveal order.**

This is a shape-level fact in the current implementation, not a rendering
convention: the eligibility mode, wager caps, pre-final score snapshot, and
reveal order are never present at any Final stage on the wire.

### Current compatibility constraint

**An individual public `Not eligible` label is not currently derivable**, because
the eligibility mode and its calculations remain private. Such a label would
require a **separately authorized sanitized public-state addition**, or it must
be **omitted from initial implementation**.

## 11. Public-state compatibility matrix

Accepted classifications. "Presentation-only" means no wire change is implied;
every other classification names work that requires its own authorization.

| Element | Classification |
| --- | --- |
| Dark shell / lattice / borders / bevels / glow | **Presentation-only** |
| Nexus Core placement | Likely component refactor |
| Score Column / Score Strip / Score Deck | Likely component refactor |
| Compact and expanded rails | Likely component refactor |
| Active team and anonymous waiting count | **Existing public boundary** |
| Neutral used state | **Existing public state** |
| Cleared categories and aggregate progress | Presentation-derived |
| Final settlement layout | Presentation/component refactor |
| Public game/class identity | Possible future public-state addition |
| Public teacher identity | Future public-state addition **plus privacy review** |
| Representatives and rosters | Private-state / schema work |
| Team emblems | Schema / asset / portability work |
| Outcome or ownership tile history | State-model / public-wire work |
| Multiple choice, equations, rationales, audio, video | Separately scoped schema / renderer / asset work |
| **Public queue ordering** | **Unsupported — contrary to the current privacy boundary** |
| **Raspberry Pi certification** | **Unsupported without device evidence** |

## 12. Accessibility and projector conditions

Recorded as obligations on any future implementation:

- **structural and textual cues in addition to colour;**
- **explicit minus signs;**
- **long-name handling;**
- **minimum essential text sizing at 1280×720;**
- **reduced-motion parity;**
- **no essential meaning carried by glow, gradients, thin lines, or microcopy;**
- **future grayscale and washout checks;**
- **future physical-projector and viewing-distance testing.**

**No current accessibility certification exists.** The accessibility audit is
Slice 18 work ([`MVP-ARC.md`](MVP-ARC.md)), and nothing in this registration
performs, schedules, or satisfies it. No physical projector test was performed
for this registration.

## 13. Representative-frame dispositions

The bounded review considered a four-frame representative set. The **intended
corrected evidence** for those frames is recorded here as direction, not as an
observed rendering:

| Frame | Intended corrected evidence |
| --- | --- |
| Flagship | `8 / 30 USED` |
| Active response | `RESPONSE WINDOW · ACTIVE TEAM` and `ACTIVE RESPONSE WINDOW` |
| Near completion | `26 / 30 USED · 2 CATEGORIES CLEARED` |
| Final | **unique-leader example only** — *not* a complete tied-Final specification |

**Quiet cognition was not directly demonstrated by the four-frame set.** It is
accepted as direction (§6) on the strength of the written direction, not on the
strength of a frame that showed it.

## 14. Deferred concepts and non-claims

The deferred and unsupported lists recorded in
[`../handoff/CURRENT.md`](../handoff/CURRENT.md) are **preserved unchanged** by
this registration. Nothing here activates, schedules, or authorizes any of them.
In particular, and without narrowing that handoff:

- **additional response modes** (open-answer, buzz-first multiple choice,
  simultaneous speed-based multiple choice) remain **post-MVP, recorded only**;
- **optional team buzz-in audio cues** remain **deferred**, with their licensing
  and distribution boundaries intact — no audio file, playback code, audio
  schema, audio event, or sound-pack manifest is authorized or exists;
- **team identity packs, mascots/emblems, celebrations, and presentation
  effects** remain deferred `CQS-ARC-IDENTITY` territory;
- **representatives and roster linkage** remain parked (`CQS-OD-060`,
  `CQS-OPP-ROSTER-LINKAGE`);
- **the host console and Loan Mode** remain deferred `CQS-ARC-OPERATOR`
  territory.

Explicit non-claims for this registration:

- **not implemented** — no Phase 2B visual element exists in the application;
- **no independent checksum verification** of the final corrected package;
- **no projector acceptance** — no physical projector testing was performed or
  passed;
- **no accessibility certification;**
- **no Raspberry Pi acceptance or compatibility** — no device evidence exists;
- **no schema, public-wire, asset, test, deployment, or dependency change** is
  made or authorized by this document.

## 15. Program routing

- **The Phase 2B design-direction purpose is complete.** This document is its
  durable landing place.
- **Slice 15 — Session summary & compatible-profile reporting remains the next
  planned product slice**, `Planned` and unstarted. This document does not change
  its priority and does not authorize it.
- **Slice 16 — Theme engine remains the eventual MVP implementation consumer** of
  this direction, `Planned` and unstarted. **Slice 16 is not authorized** by this
  registration.
- **A separately authorized Phase 3 design-system specification/readiness lane
  may occur** without changing product-slice sequencing. **Phase 3 is not
  authorized** here.
- **No implementation authority follows from this document.** Any work that
  changes runtime code, schema, the public wire, tests, assets, dependencies,
  workflows, or deployment requires its own bounded owner authorization.
