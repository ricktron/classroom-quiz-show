# CQS REAL MVP S05 — Final + winner/completion presentation choreography

- **Program:** `CQS-REAL-MVP-1`
- **Tranche:** `CQS-REAL-MVP-S05-FINAL-AND-WINNER-PRESENTATION-CHOREOGRAPHY`
- **Authorization:** `AUTHORIZE-CQS-REAL-MVP-S05-FINAL-AND-WINNER-PRESENTATION-CHOREOGRAPHY-1`
- **Authorized base:** `c39bce0f64ad9275e771e4ee01c56d4f0bf0a3e7`
- **Parent:** `CQS-REAL-MVP-S05-FLAGSHIP-VISUAL-FIDELITY-AND-GAME-SHOW-CHOREOGRAPHY`
- **Status:** **AUTHORIZED / NOT IMPLEMENTED / NOT TERMINAL**
- **Date (UTC):** 2026-09-24

This is the final remaining implementation child inside S05. It authorizes a
bounded Display-side presentation pass over the already-implemented Final Wager
state machine and game-completion facts. It does **not** authorize new gameplay,
new scoring rules, new Final policy, new public data, or S05 parent
terminalization.

## 1. Product objective

Make the closing sequence of a game feel intentional and legible from across a
classroom:

```text
Final setup
→ wager phase
→ question
→ answer
→ one-team reveal
→ settlement
→ resolution / tie choice
→ sudden death when chosen
→ explicit game completion
→ winner or tied-finish presentation
```

Presentation must explain causality without delaying authoritative state.
The Display may be theatrical where earned. The Host remains operational and
restrained.

## 2. Existing authority that must not move

Final gameplay is already authoritative under ADR-014. This child consumes only
existing public facts.

Unchanged:

- `PUBLIC_STATE_SCHEMA_VERSION = 9`
- sync envelope **2**
- persistence wire **1**
- Final command/event/reducer/replay semantics
- wager eligibility, caps, response capture, reveal order, settlement, tie
  handling, sudden death, and explicit completion
- sanitizer allow-list and Final privacy matrix
- ADR-006 scoreboard order and immediate static score updates
- Path S-C: no score count-up, flash, transition, or live re-sort
- ADR-020 audio ownership and cue set
- Host controls and Final host workflow
- board→Final bridge already terminal under the prior S05 child

No `winnerKey`, completion event id, presentation timestamp, sequence id, or
other public protocol field is authorized.

## 3. Critical semantic rule: leader is not winner

Before `GAME_SESSION_ENDED`, a unique leader is only **leading**.

A winner presentation is allowed only when the public Final stage is
`complete` after the explicit game-completion boundary.

Therefore:

- `resolution + unique-leader` → "leads" / settlement state, **not winner**;
- `resolution + tied` → tied decision state, **not celebration**;
- `sudden-death` → neutral tiebreak state;
- `complete + unique-leader` → winner/completion presentation may name the
  unique public score maximum;
- `complete + tied` → tied-finish completion presentation;
- if public teams are absent, unavailable, or inconsistent with a
  `unique-leader` outcome, fail safely to generic **Game complete** rather than
  inventing a winner.

The existing public scoreboard is sufficient to derive the unique winner on
completion. No public-state expansion is needed.

## 4. Authorized presentation moments

### A. Final entry

Preserve the already-terminal board→Final bridge. Do not stack a second
competing arrival animation on the same transition.

The Final surface may establish its closing-round visual posture after entry,
but first observation/remount into Final must seed quietly.

### B. Wager lifecycle

Observed forward Final transitions may receive restrained acknowledgement:

- setup → wager-entry;
- wager-entry → wagers-locked.

No wager value, per-team completion, eligibility, cap, or reveal order may
become public.

### C. Question and answer

Observed forward transitions:

- wagers-locked → response-entry;
- response-entry / responses-locked → answer-revealed.

Prompt and answer remain immediate authoritative content. Choreography must
never delay their appearance.

### D. Team reveal

Observed transition into a new `team-reveal` may acknowledge the revealed
team card using the existing positional public team key/name lookup.

Remount into an already-revealed team must not fabricate a reveal.

Changing only public scores must not restart reveal acknowledgement.

### E. Settlement

For the currently revealed team, observed
`settlement: null → settlement: resolved` may acknowledge the outcome and
signed delta.

Rules:

- authoritative result text and score change appear immediately;
- Path S-C scoreboard remains static/immediate and authored-order;
- remount into an already-settled reveal does not replay settlement ceremony;
- undo from settled → unsettled must not look like a new positive/negative
  settlement;
- a later re-settlement after an actual new accepted settlement may acknowledge
  again because it is a new observed authoritative transition.

### F. Resolution and tie handling

- unique-leader resolution: emphasize **leading**, not winning;
- tied resolution: emphasize the tie without implying sudden death was chosen;
- sudden-death entry: neutral, unmistakable context change;
- accepting a tied finish does not become a winner event.

### G. Completion / winner

Completion is the largest allowed S05 moment.

On an observed live transition into `complete`:

- unique leader + uniquely resolvable public score maximum → winner
  presentation naming that team;
- tied outcome → tied-finish presentation;
- inconsistent/unavailable public score evidence → generic completion only.

Remount/recovery into an already-complete game shows durable final truth without
replaying celebration.

The existing host-owned `game-complete` audio cue remains unchanged. This
child adds no audio and does not synchronize visual timing to audio.

## 5. Motion ownership and accessibility

Apply existing doctrine:

- `CQS-UX-P13`: Host/Display role separation
- `CQS-UX-P14`: distance-first Display
- `CQS-UX-P15`: motion communicates causality
- `CQS-UX-P16`: immediate interaction feedback
- `CQS-UX-P17`: redundant accessible cues
- `CQS-UX-P23`: personality after clarity
- `CQS-UX-P24`: bounded design-system consistency

Use existing presentation tokens/helpers where they fit. Do not create a new
animation framework.

Reduced-motion must preserve every state distinction with static hierarchy,
ring/border/wash/text treatment as appropriate. High contrast, grayscale,
1280×720, 1920×1080, long team names, long prompts/answers, negative scores,
and 1–8 teams remain required stress cases.

## 6. Directionality / remount contract

Presentation memory is local and non-authoritative.

For every acknowledgement:

1. first observation seeds;
2. only truthful forward semantic transitions acknowledge;
3. reverse/undo transitions do not masquerade as forward ceremony;
4. same semantic state plus unrelated public refresh does not restart;
5. stale timers/completions cannot clear or restart newer acknowledgements;
6. ownership is yielded immediately if another authorized presentation surface
   owns the same moment;
7. no local presentation identity is persisted or synced.

## 7. Expected implementation surface

Expected, not mandatory if exact-head inspection proves a smaller set:

**Production**
- `src/display/FinalWagerDisplay.tsx`
- `src/display/FinalWagerDisplay.css`
- `src/display/audience/AudienceDisplayShell.tsx`
- `src/display/audience/AudienceDisplayShell.css`
- `src/display/audience/selectAudiencePresentation.ts`
- existing `useSemanticPresentationAck` may be reused; do not generalize it
  speculatively.

**Tests**
- Final display unit tests
- audience selector / shell tests
- focused Final choreography e2e
- visual-stress coverage only where causally needed

**Docs**
- this child closeout
- living STATUS / CURRENT / REAL MVP routing
- UX inventory if ownership/state changes

A needed path outside this family requires an explicit scope review before
mutation.

## 8. Explicit hard stops

Not authorized:

- PublicState/schema/sync/persistence changes;
- sanitizer expansion;
- Final command/event/reducer/replay changes;
- eligibility, wager caps, response capture, reveal order, settlement, tie, or
  sudden-death rule changes;
- Host workflow redesign;
- new audio cues or audio timing;
- score animation, count-up, flash, resorting, or ADR-006 reopen;
- new winner/result persistence;
- new game summary/ledger behavior;
- new dependencies;
- S04D;
- S06;
- S05 parent terminalization;
- signing/notarization/release claims;
- physical Windows/projector/Sony qualification.

If implementation proves one of these is necessary, stop and return for a new
owner decision.

## 9. Required regression / acceptance matrix

At minimum, prove:

1. remount at every relevant Final stage produces no fabricated acknowledgement;
2. wager-entry and wager-lock forward transitions acknowledge without leaking
   private wager facts;
3. question and answer become visible immediately on their authoritative
   transition;
4. team reveal acknowledges once for a newly revealed team;
5. score-only refresh does not restart team reveal;
6. settlement null→resolved acknowledges once;
7. undo resolved→null does not look like a new settlement;
8. re-settlement after a real new settlement may acknowledge;
9. unique-leader resolution says/means **leads**, not winner;
10. tied resolution does not imply sudden death or winner;
11. sudden death remains neutral;
12. unique completed game names the winner only when public scores identify one
    unique maximum;
13. inconsistent/unavailable public score evidence falls back to generic
    completion;
14. tied completion clearly remains a tie;
15. remount into complete does not replay celebration;
16. existing game-complete audio behavior is unchanged;
17. no private Final labels/data appear on the projector;
18. reduced-motion, high-contrast, 720p/1080p, long-text, negative-score, and
    8-team stress cases remain legible;
19. existing board-flow, buzz, board-outcome, Path S-C, Final gameplay, recovery,
    and projector-safety regressions remain green.

## 10. Verification / review contract

Implementation candidate must run the repository-required verification for its
actual scope, including at least:

```text
git diff --check
npm run verify
npm run verify:all
```

plus focused Final unit/e2e coverage and any visual-stress checks required by
the changed surfaces.

CI evidence and independent semantic review remain separate. Exact-head review
must specifically inspect remount, undo/reverse directionality, stale lifecycle
completion, public privacy, winner timing, tie handling, Path S-C preservation,
and reduced-motion semantics.

No merge without a later explicit merge authorization.

## 11. After this child

If this child is accepted, merged, and terminalized:

1. run the first deliberate whole-game owner playthrough across the completed
   S05 presentation system;
2. reconcile findings if any;
3. only then consider S05 parent terminalization.

S04D and S06 remain separate later lanes.

```text
AUTHORIZED:
CQS-REAL-MVP-S05-FINAL-AND-WINNER-PRESENTATION-CHOREOGRAPHY

NOT AUTHORIZED:
S05 parent terminalization
S04D
S06
```
