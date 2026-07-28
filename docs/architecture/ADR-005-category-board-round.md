# ADR-005 — The `category-board` round: the first playable round type

- **Status:** Accepted (Slice 5)
- **Date:** 2026-07-26
- **Depends on:** [ADR-002](ADR-002-state-event-sync-core.md) (command/event core,
  allow-list sanitizer, sync), [ADR-003](ADR-003-game-round-model-registry.md)
  (game/round model + registry), [ADR-004](ADR-004-canonical-validation-import.md)
  (canonical JSON + the one import pipeline)

## Context

Slices 2–4 built an engine with no game in it: a command/event core, a typed
game/round model behind an application-controlled registry, and one strict
ingestion pipeline. The only registered round type was a deliberately
non-gameplay `placeholder`.

Slice 5 adds the first **playable** round type, `category-board` — the
category-and-point-value board. The point of the slice is not the board itself;
it is to prove that the generic engine can host a real classroom round without
weakening a single invariant established in Slices 1–4.

Everything below is decided for `category-board` specifically. None of it is
promoted into the generic round model: the base `RoundDefinition` still makes no
gameplay assumptions, and the next round type will make its own decisions.

## Decision

### 1. Round-type identity and registration

One new type is registered — `category-board` — by application code in
`createDefaultRegistry()`. Imported content cannot register it, replace its
schema, replace its reducer, replace its public projection, supply a callback,
or supply an executable handler; a game file is data, and there is no path from
data to `registry.register`. Duplicate registration still throws `RegistryError`.

The `placeholder` type **remains registered**. It is the round type the
foundation, registry, unknown-type and fail-closed tests depend on, and it is
the safe fallback fixture. It is not deprecated and it is not a preview of
anything.

**Behavior does not live in the registry entry.** The entry supplies identity, a
display name for host diagnostics, the single config schema, a `matches` check,
and the neutral Slice 3 runtime seam. The reveal-stage state machine lives in
the pure reducer and the public projection in the allow-list sanitizer, so
gameplay state stays derived from the append-only event log and the
private→public boundary stays in exactly one place.

### 2. Config model

```jsonc
{
  "id": "round-2",
  "type": "category-board",
  "title": "Earth & Space Warm-Up",
  "config": {
    "categories": [
      {
        "id": "earth-structure",              // stable, unique in the round
        "title": "Earth Structure",           // PUBLIC label
        "tiles": [
          {
            "id": "earth-structure-100",      // stable, unique in the ROUND
            "value": 100,                     // non-negative integer
            "prompt": "…",                    // private until revealed
            "answer": "The mantle",           // private until revealed
            "alternates": ["Mantle"],         // optional; HOST-ONLY
            "notes": "…",                     // optional; HOST-ONLY
            "multiplier": 2                   // optional; default 1
          }
        ]
      }
    ]
  }
}
```

> **Slice 11 editorial note (2026-07-27):** the string prompt shown above remains
> a valid authored form, but the trusted tile now stores `PromptContent` per
> [ADR-011](ADR-011-media-contract.md): normalized text or a same-origin static
> image. Answers, alternates and notes remain strings.

### 3. Ordering and identity

- **Authored array order is the canonical order.** `categories[i]` is column
  `i`; `tiles[j]` is row `j` within that column. Order is never derived from
  object-key enumeration, registry order, or tile value.
- **Identity is the authored `id`.** A tile is "the tile with id X", never "the
  300 in Biology". Category ids are unique within the round; **tile ids are
  unique across the whole round**, not merely within a category — a tile is
  addressed by id alone in commands and events, so a round-wide namespace is
  what makes that unambiguous.
- Ids are supplied and validated, never generated, never de-duplicated, never
  renamed.

### 4. Board shape — two decisions, both permissive

**Uneven categories are ALLOWED.** A real classroom board often has a short
category (four clues) beside a long one (six). Requiring a rectangle would make
a teacher pad the board with filler. Nothing in the engine indexes tiles by a
shared row count, and the projector renders ragged columns safely.

**Duplicate values are ALLOWED**, within and across categories. Identity comes
from the stable tile id, never the displayed number, so a flat 100-point ladder
or a repeated value is a legitimate board rather than an ambiguity.

An empty board (`categories: []`) and an empty category (`tiles: []`) are both
**rejected** — a dead header on a projector is far more likely to be an
authoring mistake than an intention.

### 5. Multiplier semantics

`effectiveValue = value × multiplier`.

- `value` is a **non-negative integer**. Zero is allowed (a deliberate no-points
  warm-up tile); a negative value is rejected, because "a tile worth minus
  points" is a scoring decision that belongs to Slice 6.
- `multiplier` is an **integer in `[1, 10]`**. Both operands are bounded
  integers, so the product is exact — no floating-point ambiguity, no `NaN`, no
  `Infinity`.
- The multiplier affects the **displayed** value (the board and the open tile
  both show `effectiveValue`) and is exposed as a typed field on the trusted
  tile. The host panel additionally shows the base value and the multiplier so a
  teacher can see why a tile reads 600.
- **The default of 1 is applied by the trusted round-domain constructor**, never
  by a Zod `.default()` or `.transform()`. This keeps the no-silent-repair policy
  honest: the import boundary validates and reports exactly what was authored,
  the stored config keeps `multiplier` absent when it was absent, and the single
  documented default is applied visibly, in one place, when the board is read.
- **It does not award or deduct anything.** No score, team, wager, or settlement
  exists in Slice 5.

### 6. Board-size limits

Each limit has a stated classroom rationale (see
`src/game/categoryBoard/limits.ts`); the governing constraint is a 1280×720
projector read from the back of a room, plus one class period of play.

| Limit | Value | Rationale |
| --- | --- | --- |
| Categories | 8 | A column needs ~200 px to stay legible at 720p; 6 is typical, 8 is the ceiling. |
| Tiles per category | 8 | Covers a 100–800 ladder at a readable tile height. |
| **Total tiles** | **48** | ~45–60 s per tile ⇒ ~40 minutes; deliberately below 8 × 8 = 64. |
| Category title | 60 chars | Two projected lines inside a ~200 px column. |
| Prompt | 600 chars | ~6 projected lines; fits one screen without scrolling. |
| Answer / alternate | 300 chars | An answer is a phrase, not a paragraph. |
| Alternates per tile | 8 | More than that cannot be scanned mid-lesson. |
| Teacher note | 600 chars | Keeps the host panel scannable. |
| Tile value | 0 … 100 000 | Keeps `effectiveValue` exact and six digits wide. |
| Multiplier | 1 … 10 | "Double/triple points" is the real case; bounds the product. |

An oversized board is **rejected** with an actionable message and an exact path.
Nothing is truncated.

### 7. Private round-session state

```ts
type CategoryBoardStage = 'board' | 'selected' | 'prompt' | 'answer'

type CategoryBoardProgress =
  | { stage: 'board';    selectedTileId: null }
  | { stage: 'selected'; selectedTileId: string }
  | { stage: 'prompt';   selectedTileId: string }
  | { stage: 'answer';   selectedTileId: string }

interface CategoryBoardRoundState {
  progress: CategoryBoardProgress
  usedTileIds: readonly string[]
}
```

The stage is **one explicit value**, not a set of booleans, so
`isPromptShown && !isAnswerShown` cannot go out of sync. Pairing the stage with
the selection in a discriminated union makes "no prompt without a selected tile"
and "no answer without a selected tile" **structural** — an answer stage with no
tile is not expressible.

`selected` is a real stage, distinct from `prompt`: the host has privately
opened a tile and can preview everything, while the class sees only the chosen
category and value.

State is stored **per round**, keyed by `RoundId`
(`PrivateGameState.categoryBoards`). Moving to another round and coming back
RESUMES that board exactly — same used tiles, same reveal stage. Glancing at the
next round must not wipe the board you are halfway through. Initializing a new
game resets every board (game init is an irreversible baseline).

### 8. Commands and events

| Command | Event | Reversible |
| --- | --- | --- |
| `SELECT_CATEGORY_BOARD_TILE` | `CATEGORY_BOARD_TILE_SELECTED` | yes |
| `REVEAL_CATEGORY_BOARD_PROMPT` | `CATEGORY_BOARD_PROMPT_REVEALED` | yes |
| `REVEAL_CATEGORY_BOARD_ANSWER` | `CATEGORY_BOARD_ANSWER_REVEALED` | yes |
| `RETURN_TO_CATEGORY_BOARD` | `CATEGORY_BOARD_RETURNED` | yes |

**Every command carries the `roundId` it believes it is acting on**, and the
planner rejects it if that is not the current round. A host control rendered for
one round is therefore inert after the host moves on, rather than dangerous.
Events carry the resolved `roundId` (and, where needed, the `tileId`) frozen at
plan time, so replay never has to ask which round was current and needs neither
the registry nor a board lookup.

A command is rejected — appending **no** event and leaving the revision
unchanged — when there is no session (`session-not-initialized`), no game
(`game-not-initialized`), the game has ended (`game-already-ended`), no current
round (`no-current-round`), the target round is not current (`round-mismatch`),
the round is not a category board (`not-a-category-board-round`), its config is
unusable (`invalid-category-board-config`), the tile id is unknown
(`unknown-tile`) or already used (`tile-already-used`), or the transition is
illegal for the current stage (`invalid-board-stage`).

Legal transitions are exactly: `board → selected → prompt → answer`, plus
`selected|prompt|answer → board`. Selecting a second tile while one is open is
rejected — return to the board first, so a stray click during a live prompt
cannot silently swap the question under the class.

### 9. Used-tile policy

- Selecting a tile does **not** consume it.
- Revealing the **prompt** does **not** consume it.
- Revealing the **answer** consumes it.
- Returning to the board preserves used state.
- Undoing the answer reveal returns the tile to the board.

This is what makes an accidental selection recoverable without burning a
question mid-lesson. `usedTileIds` is derived **only** by replaying effective
(non-undone) `CATEGORY_BOARD_ANSWER_REVEALED` events — there is no separate
used-tile record to keep in step, so undo is exact for free.

### 10. Replay and undo

The same definition plus the same effective event sequence always yields the
same round state. Nothing in the gameplay path reads a clock, a random source,
`crypto.randomUUID`, or a locale-dependent ordering: event ids are `evt-<seq>`
and `occurredAt` is copied from the command. Undo remains the Slice 2
append-only `EVENT_UNDONE` marker — no history is ever deleted.

There is deliberately **no lookup cache**. `readCategoryBoardDefinition` rebuilds
the typed board from the frozen config on demand; a memo keyed on a definition
would be a second source of truth that could drift from the frozen definition
during replay. A board is at most 48 tiles, so linear scans are the right cost.

No Slice 2 or Slice 3 event shape changed, so existing histories replay
unchanged. No event migration was required.

### 11. Import-pipeline integration

There is **no second importer**. `category-board` is validated because the
registry hands the Slice 4 pipeline that type's own strict config schema
(`RoundTypeEntry.configSchema`), reported under the `schema` stage at paths like
`rounds[0].config.categories[1].tiles[2].prompt`.

Relationship checks that a per-field schema cannot express — id uniqueness
across the round, whitespace-only text, the total-tile budget — run in a Zod
refinement so they inherit exact document paths. Each carries an explicit
`params.importCode`, and `zodIssuesToImportIssues` maps that onto a precise,
stable issue code (validated against the stable code list, so a typo degrades to
the generic mapping rather than inventing a code). Three codes were added:
`duplicate-category-id`, `duplicate-tile-id`, `blank-text`.

The built-in valid sample now contains a real category-board round, and a
single-round board sample and a duplicate-tile-id sample were added. All are
JSON **text**, so they cannot skip the pipeline.

**Fixture migration.** Slices 3–4 used the literal string `category-board` as
their "unregistered round type" fixture, because no board engine existed. That
string is now registered, so those fixtures moved to
`not-a-real-round-type` — a name that is not on the roadmap and can never become
registered by accident. Every one of those tests kept its original intent and
assertions.

### 12. Public state and the projector boundary

`PublicState` gains one field, `round: PublicRoundState | null`, and the wire
version moves **2 → 3**. An older wire shape is rejected outright, never
reinterpreted or upgraded.

The DTO is **current-stage-only**, not the board definition with private fields
blanked out:

- `board` — public category titles, positional keys, effective tile values, and
  a `used` flag. Nothing else.
- `selected` — the selected tile's category title and value. `prompt` and
  `answer` are `null`.
- `prompt` — adds the typed public prompt content. `answer` is still `null`.
- `answer` — adds the canonical answer. The prompt is **retained** (documented
  design: a class needs the question in view while discussing the answer).

Because the union's two variants carry disjoint payloads, "the board is not sent
while a tile is open" and "the other tiles' content is never sent" are type-level
facts, not rendering conventions. There is no hidden field on the projector
waiting to be inspected.

Never projected at any stage: teacher notes, alternate answers, authored
category/tile ids, round ids, round-type identifiers, the imported document,
import diagnostics, registry internals, event history, and host command
availability.

Two supporting decisions:

- **Positional keys, not authored ids.** Tiles and categories get `c1`, `c1t3`.
  An authored id is teacher-written content and can hint at an answer.
- **The wire discriminator is `kind: 'board'`, not the registry type string.**
  The projector must never carry an internal round-type identifier — the same
  rule `PublicGameView` already follows.
- **Alternates are never public.** They are a host grading aid. If a future
  slice wants public alternates it must be an explicit, reviewed addition.

The runtime guard validates the stage/payload **pairing**, so a `board` stage
carrying a `selection` (or a `prompt` stage carrying `categories`) is rejected
rather than half-rendered.

### 13. Fail-closed behavior

| Condition | Result |
| --- | --- |
| Selected tile id not on the board | `round: null`, `roundAvailability: 'unavailable'`, neutral display |
| Category-board config unusable | Same — the round reads as unavailable, with no reason exposed |
| Unregistered round type | Unchanged Slice 3 behavior (host diagnostic, neutral display) |
| Malformed public board payload | Rejected by the decoder; the display keeps its last safe state |
| Stale / duplicate revision | Ignored by the receiver |
| Old wire version | Rejected; never reinterpreted |
| Projection throws | `safeToPublicState` returns `INITIAL_PUBLIC_STATE` |

The neutral panel says "This round is not available yet" and reveals no reason,
no type name, and no internals.

### 14. Host behavior

The host panel selects a tile, reveals the prompt, reveals the answer, and
returns to the board. It renders only the transitions the reducer will accept,
and the store remains the authority regardless.

Because the host legitimately sees more than the class, the panel makes the
distinction **explicit rather than implicit**: every private block carries a
visible "Host only" badge, and a persistent "On the display now" line states
exactly what the projector is currently showing. A teacher must never have to
guess whether the answer is already up.

No team, score, timer, buzzer, or manual-correction control exists.

### 15. Accessibility

- Real `<button>` elements for every tile; native keyboard activation; the
  shared global focus ring.
- Used tiles are `disabled` and therefore not operable.
- Nothing is conveyed by colour alone: a used tile also says "Used" and uses a
  dashed border; private blocks carry a text badge; the projector answer is
  labelled "Answer".
- Screen-reader labels include the category and value
  (`"Earth Structure, 100 points, already used"`).
- Reveal-stage changes sit inside a `aria-live="polite"` region on the display
  and on the host's public-stage indicator.
- Touch targets are ≥ 48 px at mobile host sizes; the board is a wrapping flex
  layout, so a wide or ragged board shrinks and wraps instead of forcing
  horizontal page scroll (asserted by an e2e overflow check at every viewport).
- Long prompts/answers wrap (`overflow-wrap: anywhere`); no hover-only controls;
  no animation, so there is nothing for reduced-motion to suppress.

This is presentation, not a theme system — that remains Slice 10.

## Alternatives considered

**Rectangular boards only.** Simpler layout maths, but it forces teachers to pad
short categories with filler content. Rejected; the display handles ragged
columns.

**Reject duplicate values.** Would have caught a class of authoring typos, but it
breaks legitimate flat ladders and implies value is identity, which it is not.
Rejected.

**Default the multiplier with a Zod `.default(1)`.** Convenient, but it means the
schema rewrites content — a direct contradiction of ADR-004's "a schema
validates, it never transforms". Rejected in favour of one documented default in
the trusted constructor.

**Mark a tile used on selection.** Simpler, but an accidental click would burn a
question mid-lesson. Rejected in favour of consuming on answer reveal, which also
makes undo naturally correct.

**Project the whole board with prompts nulled out.** Fewer DTO shapes, but it
puts a field for every tile's content on the projector and makes privacy a
question of what the renderer chooses to read. Rejected in favour of a
stage-discriminated, current-stage-only DTO.

**Send authored tile ids as render keys.** Simplest, but authored ids are
teacher-written and can hint at answers. Rejected in favour of positional keys.

**A single `selected`/`prompt` stage.** Merging them would mean selecting a tile
instantly publishes the question, removing the host's private preview. Rejected;
`selected` is a real, separately tested stage.

**Memoize the parsed board.** Faster, but it creates a second mutable source of
truth that could drift during replay. Rejected; 48 tiles do not need a cache.

## Consequences

- The app is **playable** for the first time: a teacher can import a board,
  select a tile, reveal the prompt, reveal the answer, and move on.
- Every Slice 1–4 invariant still holds. The private→public boundary is still a
  single allow-list sanitizer; content is still data, never code; imports still
  converge on one pipeline; the display still fails closed.
- The `PublicState` wire version is now 3. Any consumer pinned to 2 fails closed.
- Two round types are registered. The next playable type follows the same seam:
  register an entry, supply a config schema, add its DTO variant, add its
  reducer cases.
- Scoring is now the obvious missing piece — a tile can be revealed and marked
  used, but no points move. That is Slice 6, by design.

## Explicit non-goals (unchanged by this ADR)

Teams, team colours, score totals, awards, deductions, partial credit, manual
score correction, score audit history, scoring strategies, buzzers, lockout,
timers, timed transitions, persistence, IndexedDB, session recovery, leader
coordination, final wager, media (images/audio/video), a theme engine,
spreadsheet/CSV/XLSX/Google Sheets import, an authoring UI, pack management, a
saved game library, remote URL import, a backend, accounts, cross-device
networking, analytics, AI generation, and any additional playable round type.

**The round can reveal content and track used tiles. It does not score teams.**
