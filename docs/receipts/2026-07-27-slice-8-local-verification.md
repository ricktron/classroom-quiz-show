# Slice 8 — Local input contract & keyboard buzz-in: local verification

- **Identifier:** `CQS-S08-LOCAL-INPUT-CONTRACT-AND-KEYBOARD-BUZZ-IN`
- **Date:** 2026-07-27
- **Slice / PR:** 8 / pull request **open and unmerged**
- **Authorization:** explicit owner authorization to implement Slice 8, with
  owner decisions `OG-1`, `OG-2` and `OG-3` answered (recorded in
  [`../PROJECT.md`](../PROJECT.md) and
  [`../architecture/ADR-007-timers-arming-transitions.md`](../architecture/ADR-007-timers-arming-transitions.md)
  §16) and the 2026-07-27 colored-button input direction recorded in
  [`../handoff/CURRENT.md`](../handoff/CURRENT.md). `OG-6` explicitly remains
  deferred.
- **Branch:** `claude/slice-8-local-input-keyboard-thn7bn`
- **Base commit:** `004bf9d55d7d7a22b19414e11ffdd050d98fb31f` — the merge commit
  of **PR #15** (Slice 7 post-merge reconciliation), verified merged before any
  edit: `state: closed`, `merged: true`, merged **2026-07-27T01:01:44Z** by
  `ricktron`, reviewed head `9e9ce7e0175b8997ce08cce0ecad98667506639b`, base at
  merge `3f9ae1c4c7f9f6e37bac08bf519dbd8ef68af42a`. The merge commit has two
  parents (`3f9ae1c`, `9e9ce7e`), so the head that was reviewed is the head that
  merged.
- **Environment:** local sandbox (Linux, Node 20+), Chromium via
  `PLAYWRIGHT_CHROMIUM_PATH`

## Preflight (performed before any edit)

| Check | Observed |
| --- | --- |
| Repository root | `/home/user/classroom-quiz-show` |
| Remote | `origin` → `ricktron/classroom-quiz-show` |
| Branch at start | `claude/slice-8-local-input-keyboard-thn7bn`, pointing at the **Slice 1** commit `0fad6bf` — stale placeholder, an ancestor of `origin/main`, carrying only already-merged history |
| Action taken | `git checkout -B claude/slice-8-local-input-keyboard-thn7bn origin/main` — reset onto `004bf9d`; nothing unmerged was discarded (`git merge-base --is-ancestor 0fad6bf origin/main` → true) |
| Worktree | clean before and after the reset |
| `origin/main` fetched | `004bf9d55d7d7a22b19414e11ffdd050d98fb31f` |
| PR #15 | merged (see "Base commit" above) |
| Roadmap | 18 slices; Slices 1–7 `Complete`; Slice 8 `Planned`, unstarted, owner-gated |
| `OG-1` | implemented in Slice 7 (durable manual arming) |
| `OG-2`, `OG-3` | recorded, **unimplemented** — `grep` for `buzzQueue`, `promoteNext`, `nextRespondent`, `BUZZ_`, `lockout` across `src/` and `tests/` returned only documentation comments and **negative assertions** |
| `OG-6` | deferred |
| Keyboard team input | none existed |
| Ordered buzz queue | none existed |
| Promotion behaviour | none existed |
| Gamepad / WebHID / Sony Buzz! runtime | none existed |

**CI state for PR #15 was not re-observed in this session** and is not claimed
here; PR #15's own merged state was verified directly through the GitHub API.

## Guidance read before editing

Root `README.md`; `docs/PROJECT.md`; `docs/STATUS.md`; `docs/handoff/CURRENT.md`;
`docs/plans/MVP-ARC.md` (including the Slice 8, 9 and 10 records);
`docs/decisions/README.md`;
`docs/decisions/ROADMAP-AMENDMENT-001-local-buzzers.md` (in full);
`docs/architecture/GAME-ENGINE-BOUNDARIES.md`;
`docs/architecture/ADR-007-timers-arming-transitions.md`; `docs/receipts/README.md`.
Source inspected before editing: `src/state/{commands,events,reducer,privateState,publicState,sanitize,store}.ts`,
`src/game/timing/*`, `src/game/teams/*`, `src/sync/protocol.ts`,
`src/host/{FoundationControls,ResponseTimerHostPanel,useSessionStore,useResponseTimerExpiry}.tsx?`,
`src/display/ResponseTimerDisplay.tsx`, `src/routes/DisplayRoute.tsx`,
`src/time/clock.ts`, `src/test/leakLabels.ts`, and the existing negative-assertion
tests in `src/state/`, `src/host/` and `tests/e2e/`.

## Files changed

**47 files changed, 7,452 insertions(+), 149 deletions(−).**

**Added — the input boundary (`src/input/`, 8 files):** `logicalAction.ts` ·
`localInput.ts` · `keyboardKeys.ts` · `keyboardMapping.ts` ·
`keyboardMappingStore.ts` · `keyboardAdapter.ts` · `commandTranslation.ts` ·
plus `localInputContract.test.ts`, `keyboardMapping.test.ts`,
`keyboardAdapter.test.ts`, `keyboardMappingStore.test.ts`.

**Added — domain:** `src/game/timing/buzzQueue.ts` and its test.

**Added — surfaces:** `src/host/useKeyboardBuzzInput.ts` ·
`src/host/LocalInputHostPanel.tsx` + `.css` + `.test.tsx` ·
`src/display/BuzzQueueDisplay.tsx` + `.css` + `.test.tsx`.

**Added — tests:** `src/state/buzzQueueReducer.test.ts` ·
`src/state/buzzSanitize.test.ts` · `tests/e2e/buzz-in.spec.ts`.

**Added — docs:** `docs/architecture/ADR-008-local-input-keyboard-buzz.md` · this
receipt.

**Modified — runtime:** `src/state/commands.ts` · `src/state/events.ts` ·
`src/state/reducer.ts` · `src/state/publicState.ts` · `src/state/sanitize.ts` ·
`src/game/timing/responsePhase.ts` · `src/host/FoundationControls.tsx` ·
`src/routes/DisplayRoute.tsx` · `src/test/leakLabels.ts`.

**Modified — existing tests** (updated to the new truth, never weakened; each
change is explained in a comment at the site):
`src/state/responsePhaseReducer.test.ts` · `src/state/responseSanitize.test.ts` ·
`src/state/categoryBoardSanitize.test.ts` · `src/state/teamScoreSanitize.test.ts` ·
`src/game/timing/timing.test.ts` · `src/display/ResponseTimerDisplay.test.tsx` ·
`tests/e2e/timers-arming.spec.ts`.

**Modified — docs:** `README.md` · `docs/STATUS.md` · `docs/handoff/CURRENT.md` ·
`docs/plans/MVP-ARC.md` · `docs/PROJECT.md` · `docs/decisions/README.md` ·
`docs/architecture/GAME-ENGINE-BOUNDARIES.md`.

**Not changed:** `package.json`, `package-lock.json`, every `tsconfig*.json`,
`vite.config.ts`, `vitest.config.ts`, `playwright.config.ts`, `eslint.config.js`,
`.github/workflows/*`, `public/*`, `scripts/*`, and every game-file schema. No
dependency was added, removed or upgraded.

## Input architecture

```text
raw browser input      KeyboardEvent                   host-private (adapter only)
  → local adapter      src/input/keyboardAdapter.ts    pure; no DOM, no clock
  → logical action     LocalInputSignal                team + action + evidence
  → command            src/input/commandTranslation.ts RECORD_TEAM_BUZZ
  → planner            armed? open? known team? duplicate? stale?
  → event              TEAM_BUZZED (+ RESPONSE_TIMER_INTERRUPTED on the first)
  → reducer            BuzzQueueState, order from `seq`, no cache
  → sanitizer          PublicBuzzState (active key + waiting count)
  → projector          read-only, fails closed
```

Physical input identity, logical action, team assignment and game command are four
separate things. The domain never receives a `KeyboardEvent`, a key code, a device
or vendor identifier, a button index or a mapping table — asserted structurally by
tests over the serialized signal, the durable event and `PublicState`.

No plugin framework was built. `LOCAL_INPUT_SOURCE_KINDS` is a bounded union that
only application code can extend: no dynamic lookup, no `register()` surface, and
no path from game content to an input adapter.

## Logical action vocabulary

`{ kind: 'primary-buzz' } | { kind: 'secondary'; slot: 'secondary1'…'secondary4' }`,
guarded by `isLocalInputAction`. Slots are **ordinal, never chromatic**. A test
asserts the whole vocabulary and its host-facing copy contain no colour name, no
`sony`, no `gamepad`, no `usb`, no `vendor`, no `product` and no `handset`.

## Keyboard behaviour

Bindings name a physical key POSITION (`KeyboardEvent.code`); the decision and its
cost are documented in ADR-008 §4 and tested (`'1'`, `'&'`, `'q'`, `'Q'` are all
refused by the grammar). Reserved and unbindable: `Tab`, `Enter`, `NumpadEnter`,
`Space`, `Escape`, `F5` and the modifier keys — enforced in the validator and again
in resolution. Ignored, each with a typed reason: auto-repeat, a held key
(tracked and cleared on `keyup` and window blur), IME composition, modifier chords,
input/textarea/select/`contenteditable`/`<dialog>` targets, capture mode, and the
off switch. A focused `<button>` is deliberately **not** treated as typing — an
end-to-end test found that treating it as such would silently kill buzzing after
the teacher's first click; Space/Enter are reserved, so nothing is lost.
`preventDefault` fires only for an accepted buzz; the listener is bubble-phase on
`window`.

## Mapping persistence

One versioned `localStorage` entry
(`classroom-quiz-show:input:keyboard-mapping:v1`) holding only
`{ version, bindings: [{ code, teamId, action }] }` — asserted by a test that also
proves no revision, session id, event, score, prompt, answer or student name is
stored. Untrusted on load: parsed defensively, validated with the editor's own
validator, and falling back to the defaults **wholesale** on anything wrong.
Removed teams are pruned; renamed teams keep their key. Storage that throws
degrades to "defaults, not persisted". **This is not Slice 13 persistence** and no
game-session state is stored anywhere.

## Queue semantics

`{ order: string[], resolvedCount: number }`, derived purely by replay. Active is
`order[resolvedCount]`; waiting is the slice after it; exhausted is a distinct
situation from empty. A team appears at most once per response opportunity —
enforced by the planner and re-checked on event application. **Order is the event
log's `seq`**: the reducer reads no clock and does no sorting, and a test dispatches
three buzzes carrying the identical `occurredAt` and asserts the resulting order.
Arming is the intake gate: while armed the queue keeps taking new teams, and
disarming stops acceptance immediately.

## Promotion behaviour

One command, `RESOLVE_ACTIVE_RESPONSE`, with a typed
`{ kind: 'incorrect' | 'passed' }`. The active team leaves the slot, the next
queued team is promoted, remaining order is preserved (only the pointer moves), an
empty result reports **exhausted**, arming is untouched in both directions, and
**no score moves**. There is deliberately no `correct` member — a correct answer
ends the opportunity through the existing answer reveal. "Host pass" means
advancing without asserting correctness and without changing a score.

## Timer integration

The first accepted buzz of a live countdown appends a real
`RESPONSE_TIMER_INTERRUPTED` with `source: { kind: 'team-buzz' }` — **one new union
member; no event type, reducer transition or public field changed.** Later buzzes
cannot re-interrupt (structurally: the timer is no longer running or paused), and a
rejected buzz never touches the timer. Expiration races are tested: a buzz before
expiry makes the callback stale; a duplicate callback is refused the same way; an
expiry before a buzz disarms and refuses the later press; and undo across the
interruption peels the two facts off in reverse causal order.

## Public state and protocol decision

`PublicState.response` gained a **required** `buzz: PublicBuzzState` — `none` ·
`active` (positional team key + waiting count) · `exhausted`. **Wire version
5 → 6.** Making the field optional was rejected: a version-5 display would show a
running timer and no sign that a team had claimed the clue — wrong without looking
broken. **The sync envelope is unchanged at `SYNC_SCHEMA_VERSION` 2**; no transport
metadata was needed. A stale version-5 payload is rejected, not reinterpreted
(tested).

The ordered waiting list is **host-only**; the projector gets a count.

## Scoring boundary

Unchanged. Buzzing scores nothing, promotion scores nothing, `incorrect` deducts
nothing, and ordinary score controls remain available for **every** team —
including teams that never buzzed and teams whose turn is over. A test asserts a
non-active team can still be scored, and another asserts scoring does not touch the
queue. **`OG-6` remains deferred and was not implemented.**

## Tests

**+237 unit/component tests** (947 → **1,184**), **+9 test files** (42 → **51**),
and **+4 e2e tests × 3 viewport projects** (175 → **187**).

New suites: `src/input/localInputContract.test.ts` (14) ·
`src/input/keyboardMapping.test.ts` (28) · `src/input/keyboardAdapter.test.ts` (25)
· `src/input/keyboardMappingStore.test.ts` (15) ·
`src/game/timing/buzzQueue.test.ts` (18) · `src/state/buzzQueueReducer.test.ts`
(62) · `src/state/buzzSanitize.test.ts` (22) ·
`src/host/LocalInputHostPanel.test.tsx` (41) ·
`src/display/BuzzQueueDisplay.test.tsx` (11) · `tests/e2e/buzz-in.spec.ts` (4 × 3).

## Verification

All commands run locally on the branch.

| Command | Result | Notes |
| --- | --- | --- |
| `npm ci` | pass | reproducible install; no dependency change |
| `npm run lint` | pass | |
| `npm run typecheck` | pass | |
| `npm run test:run` | pass | **1,184 passed, 51 files** |
| `npm run build` | pass | PWA generated: 16 precache entries, `sw.js` + workbox chunk |
| `npm run test:e2e` | pass | **187 passed, 2 skipped** |
| `npm run verify:all` | pass | the whole chain, re-run end to end |
| `git diff --check` | clean | no whitespace errors |

The **2 skips** are the single pre-existing desktop-only offline-shell test, which
skips on the two non-desktop viewport projects. **Nothing was skipped because it
failed**, no test was weakened, and no failure was suppressed.

Production build output inspected: `dist/sw.js` and the workbox chunk are
generated, the manifest is emitted, and the precache manifest covers the app shell
— unchanged PWA/offline behaviour, and Slice 8 alters no build, PWA or deploy
configuration.

## Environment overrides

`PLAYWRIGHT_CHROMIUM_PATH` — the sandbox provides Chromium build 1194 while
Playwright 1.56 expects 1228. Supplied **through the environment only**; no
machine-specific path is committed, and `playwright.config.ts` already reads this
variable (added in an earlier slice) and is unchanged.

## Security and privacy review

- No raw keyboard mapping, key code, binding, adapter name or device word reaches
  `PublicState` or the display DOM — asserted at the sanitizer boundary, in the
  projector component, and in a real browser.
- No teacher-only configuration, answer, alternate or teacher note leaks; the
  permanent `FORBIDDEN_DISPLAY_LABELS` baseline gained the Slice 8 host-only
  labels and is asserted against the projector.
- No student identity is introduced or representable: a binding names a TEAM id,
  which is authored content, exactly as every score does.
- No account, network call, analytics, tracking or cloud dependency was added. The
  app remains fully offline-capable.
- Malformed local configuration fails safely to the defaults, wholesale.
- Stale inputs cannot affect a later clue: `(roundId, tileId)` identity is checked
  by the planner and tested.
- Secondary actions cannot bypass validation: they produce no command at all.
- Keyboard input cannot fire while entering authored content (import textarea and
  every other field), proved in a unit test and again end to end.
- The display cannot author queue events: it is read-only, has no buttons, and
  dispatches nothing.

## Limitations

- Keyboard mappings are per-device and per-browser-profile. They do not travel
  with a game file and are lost if the teacher clears site data — by design.
- A `KeyboardEvent.code` is a physical position, so a stored mapping read as text
  is not the keycap legend. The host UI renders friendly labels and captures keys
  by press.
- A buzz that stops a live clock appends two facts, so fully reversing it takes two
  undos. Undo remains latest-only (ADR-002).
- The queue does not survive a clue change, a round change or a reload; session
  state is still in memory only until Slice 13.
- Nothing measures reaction time, and no true physical tie is resolved — sequence
  is the tiebreaker and timestamps are evidence only.
- **No hardware of any kind has been tested**, and no controller compatibility is
  claimed.
- **PR CI, post-merge CI, the Pages deployment and live-route behaviour are NOT
  claimed** for Slice 8. The PR is open and unmerged, and the sandbox network
  policy denies `ricktron.github.io`.

## Deferred decisions

- **`OG-6`** — restricting scoring to the active respondent: **deferred, not
  implemented.** Scoring is unchanged for every team.
- **`OG-7`** (individual identity in reporting), **`OG-9`** (timer/media playback
  coordination): untouched.
- A durable event vocabulary for **secondary actions**: deliberately not defined —
  it waits for a slice with an authorized consumer.
- A bounded `source` field on the durable buzz event: considered and rejected for
  Slice 8 (no consumer); Slice 9 may add it with one.

## Explicit exclusions — verified absent

No Gamepad API, WebHID, Bluetooth, USB or HID code. No Sony Buzz! detection,
vendor/product identification, button numbering, handset assignment, coloured
default mappings or controller setup wizard. No secondary-action gameplay. No
phone, networked or student-device buzzing. No backend, accounts, media, portable
export/import, session persistence, reporting, leaderboards, final wager, theme
engine, authoring packs, AI generation or LMS integration. No proprietary branding,
sounds or assets. **Slice 9 and Slice 10 were not started**, and an end-to-end test
asserts no gamepad listener is registered on either surface and that neither
surface's HTML contains `gamepad`, `webhid`, `bluetooth`, `sony`, `playstation` or
`handset`.

## Receipt immutability

A SHA-256 manifest of `docs/receipts/` was taken **before any edit** and again
before committing. The two are identical: **all 16 pre-existing receipts are
byte-for-byte unchanged**, and this file is the single addition. `git status`
shows exactly one added path under `docs/receipts/` and no modified path there.
Reproduce with `sha256sum docs/receipts/*.md`.

## PR state

**Open and unmerged.** No merge, no post-merge reconciliation, and no monitoring
was performed or scheduled.

## Next safe action

Review the Slice 8 pull request. Do not begin Slice 9 or Slice 10; both are
`Planned`, unstarted and owner-gated, and Slice 8 shipping the boundary they plug
into is not authorization to begin either.
