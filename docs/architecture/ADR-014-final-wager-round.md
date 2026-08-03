# ADR-014 — The Final Wager round

**Status:** Accepted (Slice 14 — `CQS-SLICE-14-FINAL-WAGER`)
**Date:** 2026-08-03
**Supersedes:** nothing. **Superseded by:** nothing.
**Related:** ADR-002 (state/event/sync core) · ADR-003 (round model & registry) ·
ADR-004 (canonical validation & import) · ADR-005 (category-board round) ·
ADR-006 (teams & scoring) · ADR-007 (timers, arming & transitions) ·
ADR-011 (media contract) · ADR-012 (portable export) ·
ADR-013 (local persistence & recovery) ·
[`../decisions/EXPANDED-VISION-OWNER-DECISIONS.md`](../decisions/EXPANDED-VISION-OWNER-DECISIONS.md)
(`CQS-OD-005`, `CQS-OD-006`, `CQS-OD-007`, `CQS-OD-008`, `CQS-OD-011`)

---

## 1. Context

Slice 5 delivered the first playable round type, `category-board`. Slice 14
delivers the second and last one in the MVP arc: **Final Wager**, the closing
round in which every eligible team privately risks part of its score on one
question, then is revealed and settled one at a time.

Final is the first round type that is genuinely *different* from a board. A
board is a loop over independent clues; Final is a single question wrapped in a
multi-step, mostly-private protocol with two timed windows, a per-team
validation rule that depends on the scores as they stood before the round began,
and an ending that can be a tie.

The obvious ways to build that are all wrong for this codebase:

- as a **game mode** — a global flag that changes what the whole engine does;
- as a **preset or policy engine** — a configurable object describing wager
  rules, reveal rules and tie rules;
- as an **extension of `category-board`** — a "final tile" with special powers;
- as a **parallel store or screen** outside the command/event/replay core.

Each would either move gameplay truth out of the event log or introduce the
generalized policy architecture that Slice 14 explicitly excludes.

## 2. Decision

**Final Wager is a registered round type**, `final-wager`, sitting beside
`category-board` in the same application-controlled registry, validated by the
same import pipeline, exported by the same canonical exporter, persisted by the
same private codec, and played through the same command → event → replay core.

Its gameplay state is a per-round map on `PrivateGameState`
(`finalWagers`), a sibling of `categoryBoards` and `responsePhases`. Its public
form is one new member of the allow-listed `PublicRoundState` union. Nothing
about it is a second engine.

## 3. Round configuration

```jsonc
{
  "id": "final-round",
  "type": "final-wager",
  "title": "Final Wager",
  "config": {
    "prompt": "…",              // Slice 11 typed PromptContent: text or same-origin image
    "answer": "…",              // canonical answer — private until explicit reveal
    "alternates": ["…"],        // optional HOST-ONLY grading aid — never projected
    "notes": "…"                // optional HOST-ONLY teaching note — never projected
  }
}
```

That is the entire authored surface. **Eligibility mode, wager caps, response
capture mode, window durations, reveal order and tie handling are host decisions
taken during the lesson**, not authored content. Putting them in the game file
would turn a Final round into a policy document, which is exactly the general
policy engine this slice excludes.

`limits.ts` bounds every field with a stated classroom reason, following ADR-004:
out-of-range values are REJECTED with an actionable message and nothing is ever
truncated, coerced, or repaired into validity.

### Cross-round rules

Three rules cannot be expressed by a per-round config schema, because they are
relationships *between* rounds (and between rounds and teams). They live in the
document-level semantic stage and each REJECTS rather than repairing:

| Rule | Issue code | Why |
| --- | --- | --- |
| At most one Final per game | `duplicate-final-round` | "Final" means the last question of the lesson. Two has no sensible interpretation, and playing the first (or the last) would be the pipeline guessing. |
| Final must be the terminal round | `final-round-not-terminal` | A Final that settles every score and then hands the class three more rounds is not a Final. Rejecting at import means the teacher fixes the order once, before the lesson, rather than meeting a surprise mid-lesson rule at runtime. |
| Final requires at least one team | `final-round-requires-teams` | Wagers, reveals and settlements are all per-team. A team-less Final is an unplayable round, not a quiet no-op. |

A game with **no** Final round is completely unaffected — which is every game
file that was valid before Slice 14.

## 4. The state machine

```
setup
  → wager-entry → wagers-locked
  → response-entry → responses-locked
  → answer-revealed
  → team-reveal
  → resolution | ready-to-complete
  → sudden-death
  → ended
```

`phase` is ONE discriminated value, for the same reason `CategoryBoardProgress`
and `ResponseTimerState` are: there is no `wagersLocked && !responsesLocked` to
get out of step, and an impossible combination is not expressible.

Two transitions are worth naming explicitly:

- **A Classic Final with no eligible team** skips straight from `setup` to a
  resolution phase. There are no wagers to take and no responses to record;
  fabricating either would be inventing facts nobody produced. The result is
  computed from the pre-final scores.
- **`resolution` versus `ready-to-complete`** is decided by the replayed scores
  when the last team settles: a tied lead lands on `resolution` (the host must
  choose), a unique leader on `ready-to-complete`. Deriving it in `reduce` means
  undoing a settlement moves the phase back automatically on the next replay.

## 5. Command and event vocabulary

Eighteen commands and seventeen events. Every command carries the `roundId` it
believes it is acting on, so a stale host control is inert rather than
dangerous — the same defence the board and timer commands use.

| Fact | Event |
| --- | --- |
| Final began, with frozen conditions | `FINAL_WAGER_STARTED` |
| Wager window started / paused / resumed / expired | `FINAL_WAGER_WINDOW_*` |
| A team's wager was committed or corrected | `FINAL_TEAM_WAGER_RECORDED` |
| Wagers were locked | `FINAL_WAGERS_LOCKED` |
| Response window opened (prompt became public) | `FINAL_RESPONSE_WINDOW_STARTED` |
| Response window paused / resumed / expired | `FINAL_RESPONSE_WINDOW_*` |
| A team's response state was recorded or corrected | `FINAL_TEAM_RESPONSE_RECORDED` |
| Responses were locked | `FINAL_RESPONSES_LOCKED` |
| The canonical answer became public | `FINAL_ANSWER_REVEALED` |
| A specific team was revealed | `FINAL_TEAM_REVEALED` |
| That team was adjudicated and settled | `FINAL_TEAM_SETTLED` |
| A tie decision was taken | `FINAL_TIE_RESOLUTION_SELECTED` |

**Corrections append, they never rewrite.** A corrected wager or response is a
NEW event; the earlier one stays in the log and stays true about what the host
first entered. The later one wins on replay because it is applied later. Undo
remains latest-only (ADR-002) — there is no targeted per-event undo.

**Every Final event is reversible except one.**
`FINAL_TIE_RESOLUTION_SELECTED` is irreversible when it names `accepted-tie`,
because accepting a tied finish ends the game and ending a game has been
irreversible since Slice 3. The planner appends the acceptance AND the existing
`GAME_SESSION_ENDED` together, so completion still goes through the one existing
ended-game boundary and the two facts can never disagree.

## 6. Eligibility, caps and reveal order

All three are **frozen onto `FINAL_WAGER_STARTED`** when Final begins — the same
technique `RoundSupport` uses (ADR-003): resolve once at plan time, store the
answer, replay deterministically without consulting anything outside the log.

Freezing is not an optimization. Every value is defined relative to the scores as
they stood BEFORE Final; deriving them live would make them drift the instant the
first settlement lands, so a team that just lost its wager would become
ineligible mid-round and the reveal order would reshuffle itself halfway through.

### Eligibility (CQS-OD-005)

Two bounded host choices, taken before Final begins:

- **Classic** (default) — only teams whose pre-final score is greater than zero.
- **Inclusive** — every authored team plays.

There is no per-team override, no preset selector and no policy object.

### Wager cap (CQS-OD-006)

```
policyCap      = preFinalScore > 0
                   ? preFinalScore
                   : highest positive effective ordinary category-board tile
                     value among rounds PRECEDING Final (0 if none)

effectiveMax   = max(0, min(policyCap,
                            MAX_TEAM_SCORE − preFinalScore,     // upper headroom
                            preFinalScore − MIN_TEAM_SCORE))    // lower headroom
```

Both headrooms are applied because the outcome is unknown at wager time: a team
near the upper bound cannot risk an amount a WIN would push out of range, and a
team near the lower bound cannot risk an amount a LOSS would. The result is never
negative, because zero is always a legal wager.

A wager outside `0 … effectiveMax` is **rejected — never clamped, coerced,
rounded, or silently repaired**. Zero is explicit and real.

### Reveal order (CQS-OD-008)

Ascending pre-final score, with **authored team order as the deterministic
tie-break** (an index comparison, so the result does not depend on `Array#sort`
stability). The host may reveal any unrevealed eligible team instead, and the
event records the team actually chosen — so the log holds the real order, not an
assumed one.

## 7. Response capture (CQS-OD-007)

Chosen once, when the response window opens: **`exact-text`** or **`host-only`**.
The two are one command because they are one teacher decision — "here is the
question, and here is how I will record what comes back" — and splitting them
would allow a Final whose prompt is public but whose capture mode is undecided.

Every eligible team ends in exactly one of three durable states:

| State | Meaning |
| --- | --- |
| `exact` | The team answered and the host captured the wording. |
| `not-captured` | The team answered; the wording was not written down. |
| `no-response` | The team did not answer at all. |

"Missing" is a fourth situation and deliberately not a member: a team with no
entry has not been recorded yet, which is why the global lock refuses to close
until every eligible team has an explicit state. **Whitespace-only exact text is
rejected**, so the log never conflates "did not answer" with "answered and
nobody wrote it down".

Exact wording can only be recorded when the host chose to capture it — otherwise
the log would claim a transcription mode nobody selected.

There is no transcript, no archive, no retention setting, no recording and no
student entry anywhere in this slice.

## 8. Timers

Two Final-specific windows, reusing ADR-007's `ResponseTimerState` union verbatim
rather than inventing a Final timer. Both default to the game's authored
`timer.responseSeconds` and accept a host override inside the same 5–600 second
bounds, so the UI can never widen a window.

The clock is read only at the dispatch edge and the presentation edge. A running
window stores its identity, duration and absolute deadline; "how long is left" is
derived at the rendering edge. There is **no tick event and no per-second
revision**. Pause freezes the remaining time as a fact; resume derives a NEW
deadline, so wall-clock time spent paused is never charged to the class. Expiry
requires a three-way match — running, same timer, same deadline — so a stale
callback appends nothing, and exactly one effective expiry per countdown is
structural rather than a convention.

**Expiry records that the window ended and nothing else.** It does not lock
wagers, substitute a zero for a silent team, lock responses, mark anyone as a
no-response, reveal the prompt or the answer, reveal a wager, adjudicate, settle,
choose a tie outcome, or end the game. Every one of those is an explicit host
action.

## 9. Settlement

A dedicated reversible event rather than a forced `TEAM_SCORE_ADJUSTED`, because
a Final settlement has a different provenance and must undo as one atomic fact.

| Outcome | Delta |
| --- | ---: |
| `correct` | `+wager` |
| `incorrect` | `−wager` |
| `no-response` | `−wager` |

The wager and the delta are read from FROZEN state, never from the command — the
same rule that stops a "full credit" score event carrying an arbitrary amount
(ADR-006). The event records the wager, the outcome and the signed delta, and
deliberately **not the resulting total**: a stored total would be a lie the
moment an earlier settlement is undone.

A **zero wager still produces a settlement** with a zero delta, because "this
team wagered nothing and answered correctly" is a fact worth recording even
though no points moved.

The planner refuses a settlement that precedes a reveal, names a team other than
the one on screen, duplicates an existing settlement, disagrees with the recorded
response state, or would leave the documented score bounds. Undo restores both
the score and the revealed-but-unsettled state, without deleting the wager,
response or reveal events.

## 10. Tie handling and completion (CQS-OD-011)

Leaders are computed over **every authored team**, not merely the eligible ones:
under Classic eligibility a team that could not play may still be the leader, and
a winner the engine refused to look at would be a bug in front of a class.

- **Unique leader** — the host completes explicitly through the existing
  `END_GAME_SESSION` boundary. Settlement alone never ends the game.
- **Tied lead** — the host is presented with BOTH choices. Sudden death is the
  default-highlighted option but is never selected automatically.
  - **Accept tied finish** — explicit, two-step, irreversible; the game ends with
    the tie preserved.
  - **Sudden death** — a bounded phase. The game stays active, the projector
    shows a neutral status, the tied scoreboard stays visible, and the host
    conducts the tiebreak out loud. The existing manual score correction becomes
    the tiebreak mechanism and is **narrowed to tied leaders only** — every other
    team's total is the finished result, and moving one would silently rewrite
    it. Once one team leads outright the host completes explicitly; the host may
    also accept a continuing tie at any point.

There is no authored sudden-death prompt collection, no sudden-death round
engine, no new buzzer behaviour and no generalized policy system.

## 11. Public privacy matrix

| Phase | Projector receives |
| --- | --- |
| Setup | Neutral "getting ready" status + the public scoreboard |
| Wager entry | Generic status + a countdown. **No wager, and no per-team completion.** |
| Wagers locked | Generic "wagers are locked" |
| Response entry | The Final prompt + a countdown |
| Responses locked | The prompt + generic status |
| Answer revealed | The prompt + the canonical answer |
| Team reveal | ONE team's public key, response presentation and wager |
| Adjudication | Nothing new — correctness is `null` until settlement |
| Settlement | That team's outcome and signed delta; updated scoreboard |
| Resolution | Result status, the last team revealed, and the scoreboard |
| Sudden death | Neutral status + the tied scoreboard |
| Complete | Final status + the scoreboard |

**Never projected, at any stage:** unrevealed wagers, unrevealed responses, host
notes, alternate answers, pending correctness, the eligibility mode, the wager
caps, the pre-final score snapshot, the reveal order, the capture mode, authored
team or round ids, the registry round type, event history, undo metadata, timer
ids, raw `issuedAt`/`occurredAt`/input timestamps, or host-writer lease data.

Two structural guarantees back this up rather than a naming convention:

1. The sanitizer is **allow-list** based. Every public field is NAMED and copied
   individually; nothing is spread, cloned-and-deleted or serialized, so a field
   added to `FinalWagerRoundState` later is not exposed by default. A test proves
   it with a synthetic future field.
2. Every Final stage has an **exact-key runtime guard**. Final's variants differ
   by one field at a time, so an "everything optional" guard would accept a
   `wagers-locked` payload carrying a prompt. Naming the keys per stage makes
   every impossible payload a hard reject.

The public discriminator is the neutral presentation kind `final`, never the
registry type `final-wager` — the same rule `PUBLIC_BOARD_KIND` follows.

The only public temporal value is the bounded absolute deadline the existing
countdown architecture already requires; it is rendered as a countdown and never
as a raw timestamp.

## 12. Persistence and recovery

Every Final event is encoded and decoded by the existing private session codec.
There is **no Final snapshot, no Final table, no new object store, no database
version and no second recovery path**.

The frozen eligibility snapshot is written in full, because it IS the fact: a
recovered Final must resume with the eligibility, caps and reveal order it froze,
not with values recomputed against post-Final scores.

Decoding is exact-keyed and fail-closed: an unknown field, a mistyped value, a
whitespace-only exact response, an unknown capture mode, or a snapshot whose
reveal order is not a permutation of its own eligible teams rejects the whole
history as corrupt. Nothing is repaired or partially read.

`FINAL_TIE_RESOLUTION_SELECTED` is the one event whose reversibility depends on
its payload, so the reversibility check reads the resolution rather than the type
alone.

Refresh resumes exactly at wager entry, wager lock, response entry, response
lock, the answer reveal, the current reveal team, a partial settlement, and
sudden death. Resume and Discard remain explicit; the host-writer lease remains
authoritative and a follower tab cannot mutate Final.

## 13. Compatibility versions

| Surface | Before | After |
| --- | ---: | ---: |
| Public-state wire | 7 | **8** |
| Sync envelope | 2 | 2 |
| Canonical game-file schema | 1 | 1 |
| `GameDefinition` model | 1 | 1 |
| Private persistence wire | 1 | 1 |
| IndexedDB database schema | 1 | 1 |
| Dependencies | — | unchanged |

The **public bump is required**: a version-7 display validates `round` with a
guard that accepts only `kind: 'board'`, so a Final payload would fail that guard
and freeze the projector on its last board snapshot — a class would watch a stale
board through the whole Final round with no indication anything was wrong.
Failing closed on the VERSION makes the mismatch visible and unambiguous. Version
7 is rejected, never reinterpreted.

The **game-file schema stays 1** because a newly registered round type and its
strict config do not alter the meaning of any previously valid document. Every
game file that was valid before Slice 14 is still valid, still means exactly the
same thing, and needs no migration.

The **private persistence wire stays 1** because existing event shapes are
unchanged and this build decodes both old histories and histories containing the
new variants.

## 14. Divergence from ADR-007 §8: Final state survives a round change

ADR-007 clears a response phase on any round change, because a countdown's
deadline is an absolute instant and resuming a five-minute-old deadline would put
a nonsense clock in front of a class.

**Final state deliberately does NOT follow that rule.** A Final holds committed
wagers, recorded responses and applied settlements; discarding those because a
teacher glanced back at an earlier round would destroy recorded facts, which is a
far worse outcome than a stale clock. The Final windows come along with the rest
of the state; a window that is stale on return is recorded as expired, which — by
§8 above — changes nothing on its own.

This is a documented, tested divergence, not an oversight.

## 15. Alternatives considered and rejected

| Alternative | Why rejected |
| --- | --- |
| Final as a global game **mode** | Moves gameplay truth out of the round model and forces every other module to know about a mode flag. |
| Final as a **preset / policy engine** (configurable wager, reveal and tie rules) | This is precisely the post-MVP policy architecture Slice 14 excludes. Two bounded host choices per decision cover the classroom cases without a configuration language. |
| Final as an **extension of `category-board`** | Drags the board's shape into a round that has no tiles, and makes "the board is not sent while a tile is open" harder to keep true. |
| A **parallel Final store** or a screen outside command/event/replay | Loses replay, undo, persistence and the private→public boundary — everything the architecture exists to provide. |
| Deriving eligibility and caps **live** instead of freezing them | They drift the instant the first settlement lands: a team that just lost becomes ineligible and the reveal order reshuffles mid-round. |
| Storing the **resulting total** on a settlement | Becomes a lie the moment an earlier settlement is undone (ADR-006's rule, unchanged). |
| Reusing `TEAM_SCORE_ADJUSTED` for settlement | Loses the Final provenance and cannot carry the outcome; a zero-delta adjustment is also not representable, so a zero-wager settlement could not be recorded at all. |
| A **generic reveal-policy** object | One default order plus "the host may pick any unrevealed team" covers every classroom case with no configuration surface. |
| Auto-locking or auto-marking on window expiry | Would make an engine decision that costs a team points. Every consequential action stays an explicit host action. |
| Reusing `PublicState.response` for the Final countdown | Carries `armed` and `buzz`, which are meaningless in Final, and would couple two unrelated DTOs. |
| Keeping the public wire at 7 | A version-7 display fails the round guard and silently freezes on a stale board (§13). |

## 16. Explicit non-goals

Slice 14 does **not** implement, and must not be read as approving:

Daily Double or any mid-board hidden wager · hidden clue ownership or placement ·
presets or preset selectors · reusable response / scoring / timer / reveal /
eligibility policy engines · per-team eligibility overrides · additional game
formats · Survey Showdown · team identity setup · presentation animations or
theme work · archives, telemetry, analytics, transcripts, assessment, grading or
roster linkage · Loan Mode · spreadsheet or LLM authoring · shared question
repositories · native recording · student devices, phones, accounts or network
entry · buzzer use in Final · any change to keyboard buzz semantics, the buzz
queue, the Gamepad adapter, the Sony profile, controller mappings, input-source
types or board arming.

`CQS-OD-066` remains unresolved and untouched.

## 17. Consequences

- The MVP gains its second and final playable round type, and the round registry
  now has two real gameplay entries — which is the first evidence that the Slice 3
  registry seam works for a round genuinely unlike the first one.
- The public wire moves to 8. Any consumer pinned to 7 fails closed by design;
  no migration exists, and none is intended.
- `finalWagers` is a third per-round map on `PrivateGameState`. A future round
  type adds a fourth rather than reshaping the existing three.
- The scoring planner now has one round-type-aware rule (the sudden-death
  restriction). It is deliberately narrow and named; if a second such rule ever
  appears, that is the signal to reconsider where round-specific scoring policy
  belongs.
- Final is the one round that still projects after the game ends, so the closing
  screen stays on the projector while the final scoreboard is read out.
