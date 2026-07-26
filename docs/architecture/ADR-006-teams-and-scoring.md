# ADR-006 — Teams and scoring: the first scoring strategy

- **Status:** Accepted (Slice 6, in review)
- **Date:** 2026-07-26
- **Slice:** 6 — Teams & scoring
- **Depends on:** [ADR-002](ADR-002-state-event-sync-core.md) (command/event core,
  allow-list sanitizer, sync), [ADR-003](ADR-003-game-round-model-registry.md)
  (`GameDefinition`/`GameSession`, registry),
  [ADR-004](ADR-004-canonical-validation-import.md) (the one import pipeline),
  [ADR-005](ADR-005-category-board-round.md) (the category-board round and its
  effective value)
- **Supersedes:** nothing

## Context

Slices 1–5 built an engine that can load a game, play a board, reveal a prompt and
reveal an answer — and score nothing. A classroom game needs teams and points, so
Slice 6 adds them.

The constraints that shaped the design were already fixed by earlier decisions:

- **GAME-ENGINE-BOUNDARIES §7** requires that scoring be a *typed strategy*, and
  that no module assume all rounds share one scoring model or that a score is a
  bare number forever.
- **§4** requires that the projector receive only an explicitly allow-listed
  `PublicState`, and fail closed on anything it cannot trust.
- **§5** requires that imported content stay data: it may never supply code, and
  — new here — may never supply presentation values either.
- **ADR-002** requires that all state be derived from an append-only event log,
  with undo as an auditable marker rather than a deletion.
- **ADR-004** requires exactly one import pipeline, with no coercion and no silent
  repair.

The classroom requirement is blunt: a teacher standing at a laptop must be able to
award points, take points away, give partial credit, and **fix a mistake** without
the class losing confidence in the score. Everything below follows from that.

## Decision

### 1. Teams are authored content; scores are session state

A `TeamDefinition` lives on the immutable `GameDefinition`. A score does not.

```
GameDefinition (immutable, deep-frozen)     PrivateGameState (derived by replay)
  teams: [ { id, name, accent, order } ]      teamScores: { [teamId]: number }
```

The split is the same one ADR-003 draws between a definition and a session, and it
is load-bearing: a definition is frozen, so a score could not live there even if we
wanted it to; and a score is derived from events, so it must not.

### 2. Identity is the id; order is the array position

- `id` is identity. Scores are keyed by it. Renaming a team moves no points.
- `name` is public copy, **not** identity. Two teams may legitimately share a name
  (two "Team 1"s from different class periods) and stay distinct.
- Authored array order is the canonical display order, and the trusted constructor
  freezes that index onto `order`.

The scoreboard therefore never re-sorts. A class watching the projector does not
see teams jump position when a point is awarded — a leaderboard that reorders
itself mid-game is a distraction, and the ranking is obvious from the numbers.

### 3. Team limits, with classroom reasons

| Limit | Value | Reason |
| --- | --- | --- |
| Minimum teams (when `teams` is present) | **1** | A single-team game is real: a whole class playing as one side against the board, an individual practice run, a demo. |
| Maximum teams | **8** | Eight scoreboard cards is the point at which names and totals are still legible from the back of a room at 1280×720. It also matches the accent palette, so eight teams can all differ. |
| Team-name length | **40** | Fits one ~200 px projector card on at most two lines, and still holds "Ms. Garnett's 4th Period Titans". |
| Team-id length / grammar | **64**, `^[A-Za-z0-9][A-Za-z0-9._-]*$` | Mirrors the canonical identifier rules exactly (a test asserts they cannot drift). |

**No teams at all** is expressed by omitting the field. `teams: []` is *rejected*,
so there is exactly one way to say it and an empty array cannot be mistaken for a
configuration that was meant to have teams.

### 4. Accents come from an application palette, never from content

A team may name an accent from a fixed list of eight tokens
(`crimson`, `azure`, `emerald`, `amber`, `violet`, `teal`, `rose`, `slate`).
Application code maps the token to a CSS class; the class reads a CSS variable.

A game file therefore cannot supply a colour, a hex value, a gradient, a CSS
declaration, a class name, a URL, or any other style value — an unrecognized token
is **rejected at import** with a message naming the permitted values. This closes
the presentation half of the "content is data" invariant, which Slice 5 had only
needed to enforce for code.

Colour is always **supplemental**: every surface that shows an accent also shows
the team's name as text, and the accent bar is `aria-hidden`. Two teams may
deliberately share an accent — identity is the id, and the visible distinction is
the name.

Omitting `accent` gets the palette entry at the team's authored position. That
default is applied **only** by the trusted domain constructor, never by a Zod
`.default()` — the same rule ADR-005 §5 set for `multiplier`, so the import
boundary keeps reporting exactly what was authored.

### 5. `teams` is an additive extension of `schemaVersion: 1`

The canonical game file gains an **optional** `teams` array. The schema version is
deliberately **unchanged**, because every document that was valid before is still
valid and still means exactly the same thing: no migration is possible to need, and
inventing a version 2 would break every existing file for no gain.

This is the same additive philosophy the issue-code list already follows ("a code
may be added, but an existing code must not change meaning").

The team schema is owned by the game domain (`src/game/teams/schema.ts`) and is
re-used verbatim by both the import pipeline and the trusted constructor — the same
one-validation-path arrangement the registry uses for a round type's `config`.
There is no second importer.

New issue codes: `duplicate-team-id`, `invalid-team-accent`. Blank names reuse
`blank-text`; count, length and shape problems reuse the existing generic codes.
Every one carries an exact path (`teams[1].accent`).

> **Stage-ordering note.** Teams validate at the `schema` stage, while a round
> type's `config` validates at the later registry-driven step. A failing team
> therefore short-circuits before board-config validation: the teacher fixes the
> teams, then sees any board problems. This is the pipeline's existing stage order,
> documented rather than changed, and covered by a test.

### 6. Scores are bounded integers, derived only by replay

| Property | Value |
| --- | --- |
| Type | integer |
| Minimum | −1,000,000 |
| Maximum | 1,000,000 |
| Initial | **0**, for every team, always |
| Single-adjustment magnitude | ≤ 1,000,000 |

No `NaN`, no `Infinity`, no floats, no numeric strings, no coercion anywhere. The
bounds are far beyond any real classroom total (a full period of a 100–600 board
tops out in the low thousands) while staying tiny relative to
`Number.MAX_SAFE_INTEGER`, so the arithmetic is always exact.

`teamScores` records only teams that have actually been adjusted: **"no entry" and
"zero" are the same fact**, so they cannot disagree. There is no score cache, no
running total held beside the log, and no path that writes a score outside
`reduce`.

### 7. The scoring target is host UI state — not session state, not public

The selected team is `useState` inside the host panel. It is **not** a command, not
an event, and not in `PublicState`.

The reasoning:

- It awards nothing. Selecting a team changes no score, so recording it as a
  domain fact would put a non-fact in the audit trail.
- It would make undo ambiguous. If a selection were an event, "undo" would
  sometimes flip a radio button instead of reversing a score — precisely when a
  teacher is reaching for undo because a score is wrong.
- It is private convenience. §4 says a private field does not go in `PublicState`
  just because the UI happens to show it.

Four things that are easy to conflate are therefore kept apart, and only one of
them exists in Slice 6:

| Concept | Slice 6 |
| --- | --- |
| Currently selected scoring target | host UI state (exists) |
| Team whose score last changed | derived from the event log (host-only line) |
| Whose turn it is | **not modelled** |
| Buzzer winner / lockout | **not modelled** (Slice 7+, and out of scope) |

**Consequence, stated plainly:** the selection is lost if the host tab is
reloaded. That is acceptable — it is a two-click reselection, and the alternative
was polluting the event log.

### 8. One command, one event, four typed modes

```
ADJUST_TEAM_SCORE { teamId, delta, mode, source }  →  TEAM_SCORE_ADJUSTED (reversible)
```

One command rather than four (`AWARD_FULL`, `DEDUCT_FULL`, …), because those would
differ only in how the amount is derived while needing identical team, bounds and
provenance checks. But the amount is **not** an unexplained integer: `mode` and
`source` record what the teacher did and where the number came from.

| `mode` | `source` | Amount rule |
| --- | --- | --- |
| `full-credit` | `category-board-tile` | `delta === effectiveValue` |
| `deduction` | `category-board-tile` | `delta === −effectiveValue` |
| `partial-credit` | `category-board-tile` | `0 < |delta| ≤ effectiveValue` |
| `manual-correction` | `manual` | `0 < |delta| ≤ 1,000,000` |

Mode and source must agree in **both** directions: a tile mode without a tile has
no value to match against, and a manual correction that names a tile would be
claiming provenance it did not use.

The command boundary — not the UI — validates: an active game exists, teams are
configured, the team exists, the mode and source are known shapes, the delta is a
non-zero bounded integer, the referenced round is the *current* round, the tile
exists **and is the open one**, the board is at a scorable stage, the amount matches
the mode, and the resulting total stays in range. A rejected command appends no
event and does not change the revision.

Rejection reasons added: `no-teams-configured`, `unknown-team`, `tile-mismatch`,
`invalid-score-delta`, `invalid-score-source`, `score-amount-mismatch`,
`score-out-of-range`.

### 9. Revealing and scoring are independent, in both directions

This is the causal decision, stated explicitly because it is the one most likely to
be re-litigated.

- Revealing a prompt or an answer **never** scores. Two separate commands, two
  separate teacher actions, two separate panels in the host UI.
- Scoring **never** consumes a tile. A tile is consumed by the answer reveal
  (ADR-005 §9) and by nothing else.
- Undoing a score adjustment leaves the reveal stage and the used tile untouched.
- Undoing an answer reveal leaves the score standing. There is **no causal
  invalidation**: the points a team earned are a fact about the team, not a fact
  about the tile.

Scoring a tile requires the board to be at the **`prompt` or `answer`** stage, and
the referenced tile to be the open one. Both stages are allowed because a team
often answers aloud while the question is up, before the host reveals the answer.
Requiring at least `prompt` means points can never be awarded for a question the
class has not seen. Once the host returns to the board the tile is closed, and a
later fix goes through manual correction.

**Returning to the board with no score assigned is allowed and requires nothing.**
A question nobody answered is still spent; the host panel says so rather than
nagging.

**Multiple teams may be scored for one tile**, deliberately — that is a normal
classroom situation (everyone who answered gets partial credit).

**A zero-value tile admits no preset** (every amount rule would need a zero delta,
and a zero-point event is not a fact worth recording). Manual correction remains
available, and this is documented rather than special-cased.

### 10. Provenance is durable; the resulting total is deliberately not stored

`TEAM_SCORE_ADJUSTED` carries `teamId`, the signed `delta`, the `mode`, and the
`source` (the exact round and tile, or explicitly `manual`). Months later the log
alone explains which team changed, by how much, what the teacher meant, and where
the number came from.

It does **not** carry the resulting total. A total frozen onto an event becomes a
lie the moment an *earlier* adjustment is undone — it would describe a history that
no longer applies. Scores are always derived by summing the effective events in
order. This is exactly the rule that makes used tiles exact: one source of truth, no
cache to drift.

It also carries **no free text**. Typed reason codes only — a mode is
machine-readable, translatable, and cannot become an accidental place to type
something private that later needs projecting.

### 11. Correction never rewrites history

Two paths, both supported, neither of which edits or deletes a stored event:

1. **Undo** the incorrect adjustment through the existing `EVENT_UNDONE` marker.
   The original event stays in the log, neutralized and auditable.
2. **Append a compensating `manual-correction`.** The original award remains; the
   correction sits beside it.

The host offers undo only when the *next* undo target actually is a score
adjustment — the engine's undo model targets the latest reversible event, and
pretending otherwise would be a lie. When it is not, the panel says so and points
at manual correction, which is the honest path for an older mistake. No targeted
"undo this specific event" was added: that would change the engine's undo
semantics, which is out of scope for this slice.

### 12. Reset and new-game policy

| Action | Scores |
| --- | --- |
| `INITIALIZE_GAME` (a genuinely new game, or the same file re-imported) | **reset to 0** |
| `INIT_SESSION` (session reset) | game discarded, so scores gone |
| `SELECT_ROUND` / `ADVANCE_TO_NEXT_ROUND` | **preserved** |
| Switching between round types | **preserved** |
| `END_GAME_SESSION` | **preserved** (final results stay readable) |
| Undo of a score | prior total restored exactly |

Loading a game is an irreversible baseline (ADR-003), so nothing survives it —
which is precisely how a teacher resets for the next class.

### 13. Public state: one new field, wire version 3 → 4

```ts
teams: | { status: 'available'; teams: readonly PublicTeam[] }
       | { status: 'unavailable' }
       | null                              // the game configures no teams
PublicTeam = { key, name, accent, score }
```

- `key` is positional (`t0`, `t1`), never the authored team id — the same rule the
  board DTO follows for tiles.
- `accent` is a plain token; the wire guard additionally enforces a token *shape*
  (`^[a-z][a-z0-9-]{0,31}$`) so no style value can pass even in principle.
- `score` must be an integer within bounds; a float, a `NaN`, or an out-of-range
  total fails the whole snapshot.

Never projected: the authored id, `order`, the score event history, undo metadata,
the host's scoring target, adjustment modes, import diagnostics, or any host
control availability.

The scoreboard is **public at every stage** (board, prompt, answer) and **after the
game ends** — a class needs the score in view, and final results are the point of
the last screen.

`status: 'unavailable'` is an explicit state rather than a missing scoreboard,
because a projector showing nothing is indistinguishable from a broken one.

Wire version is **4**. A consumer pinned to version 3 fails closed; version 3 is
never re-read as though it were version 4, and no migration exists.

Three independent checks guard the accent, none relying on the others: the import
boundary enforces palette membership, the host sanitizer re-checks it, and the
display maps only tokens it knows (an unknown token yields *no* class).

### 14. Fail-closed behaviour

| Failure | Result |
| --- | --- |
| Invalid `ADJUST_TEAM_SCORE` | rejected; no event, no revision change |
| Stored event for an unknown team | skipped on replay; state unchanged |
| Stored event that would leave the bounds | skipped, **not clamped** — clamping would invent a score nobody awarded |
| A score that is not a bounded integer | `teams: { status: 'unavailable' }` |
| An accent outside the palette | `teams: { status: 'unavailable' }` |
| Projection throws | `INITIAL_PUBLIC_STATE` (`teams: null`) |
| Malformed scoreboard on the wire | message dropped; display keeps its last safe state |
| Wire version 3 | rejected |

`teamScoreFor` deliberately does **not** sanitize a stored value: quietly
substituting a zero would hide corruption from the two layers designed to notice
it. That would be exactly the silent repair the rest of the engine refuses.

### 15. Host behaviour

A separate `TeamScoringPanel`, beside the board panel rather than inside it, so
neither panel can trigger the other's action. It shows, at all times:

- the ordered scoreboard with current totals;
- the scoring target as a radio group (nothing selected by default, so a point
  cannot be awarded to whoever happens to be first);
- the open tile and **what it is worth**;
- the proposed adjustment and the **resulting total** before submission
  (`120 → 220`, and on each preset's accessible name);
- whether that exact (team, tile, mode) adjustment has **already been submitted** —
  derived from the effective event log, so undo re-enables it;
- the last score change, with team, signed amount and mode.

Guards: every action is disabled until a target is chosen; tile presets do not
exist unless a tile is live; a negative or large (>1,000) manual amount requires an
explicit confirmation; the store re-validates everything anyway, so a stale panel
is inert.

**Scoring does not return to the board.** That stays an explicit teacher action —
auto-returning would hide the used tile transition and remove the chance to score a
second team.

### 16. Display behaviour

A scoreboard strip pinned to the bottom of the projector: all teams in authored
order, names as text, integer totals, negative totals in a warning colour **and**
with the minus sign in the content. Wraps rather than overflowing; legible with
eight teams at 1280×720.

**No animation at all** — no count-up, no flash, no transition. An animated counter
can lag or land on the wrong number, and a class needs the score to be *true* more
than lively. There is consequently nothing for `prefers-reduced-motion` to
suppress, and nothing about the score requires motion to understand.

### 17. Accessibility

Semantic list structure with a "Scores" heading; each projector card's accessible
name states the team and the total **in words** (`"Blue Team: minus 100 points"`),
because `-100` is not universally announced as "minus 100" and a negative read as
positive is a real classroom error. Host radios have accessible names including the
current total; every scoring button names the team, the amount and the result;
manual inputs have labels, `aria-invalid` and an `aria-describedby`-associated
`role="alert"` error; disabled controls are genuinely `disabled` (and now *look*
it); focus is visible; touch targets are ≥44 px; colour is never the only signal.

## Alternatives considered

**Store the resulting total on the event.** Rejected: undoing an earlier adjustment
makes a stored total wrong, and reconciling the two would need exactly the derived
cache §6 forbids.

**A `SET_SCORING_TARGET` command/event.** Rejected: it awards nothing, it would pad
the audit trail with selections, and it would make undo flip a radio button when a
teacher reaches for it to fix a score. See §7.

**Four separate commands per action.** Rejected: identical validation, four times,
with the mode implicit in the command name instead of explicit in the payload.

**A bare signed integer with no mode or source.** Rejected outright: the audit trail
would answer "what changed" but never "why", which is the question that comes up
when a class disputes a score.

**Fractional or percentage partial credit.** Rejected: a fraction needs a rounding
rule, a rounding rule needs a documented tie-break, and a mis-rounded point in
front of a class is an argument. A teacher types `50`, and 50 points move.

**Bumping the game-file `schemaVersion` to 2 for `teams`.** Rejected: the field is
additive and optional, every prior document keeps its exact meaning, and a version
bump would reject every existing file with no migration to offer.

**Sorting the scoreboard by score.** Rejected: teams jumping position mid-game
distracts a class, and the ranking is already visible in the numbers.

**Animated score counters.** Rejected: see §16.

**A free-text adjustment note.** Rejected for this slice: typed reason codes cover
the real need, and a free-text field on a scoring event is a place private prose
accumulates until someone has to decide whether it is projectable.

**Clamping an out-of-range stored score.** Rejected: it would invent a score
nobody awarded. Fail closed instead.

## Consequences

**Good.** Scoring is a typed strategy with explicit provenance, derived entirely
from the event log, so replay and undo are exact and the audit trail explains
itself. Imported content still cannot supply code — and now cannot supply
presentation either. One command carries the whole vocabulary, so a future round
type adds a `ScoreSource` member rather than a parallel scoring system.

**Costs and limits.** The scoring target does not survive a host reload. Undo
reaches only the latest reversible event, so an older score is fixed by manual
correction rather than by targeted undo. A tile can only be scored while it is
open. A zero-value tile has no preset. `PublicState` version 3 consumers fail
closed. Scores remain in memory only, like everything else, until Slice 8.

## Explicit non-goals (unchanged by this ADR)

No timers or countdowns, no automatic timeout scoring, no buzzers or lockout, no
contestant devices or remote team input, no persistence or session recovery, no
wagering / Daily Double / Final Jeopardy, no media, no theme engine, no arbitrary
team colours, no spreadsheet or CSV/XLSX import, no authoring UI, no saved game
library, no backend, accounts, cross-device networking, analytics or AI
generation, and no additional round types.
