# Slice 9 — Generic Gamepad adapter & configurable mappings: local verification

- **Date:** 2026-07-27
- **Identifier:** `CQS-SLICE-9-GAMEPAD-ADAPTER`
- **Slice / PR:** 9 / pull request **open and unmerged** at the time of writing
- **Repository:** `ricktron/classroom-quiz-show`
- **Base:** `main` at `5cc81d448f9558e914dd5da497232f071d58b10c` (the merge commit
  of **PR #18**, the Slice 8 post-merge reconciliation, merged
  2026-07-27T03:48:25Z)
- **Branch:** `claude/slice-9-gamepad-adapter-wfiue4`
- **Environment:** local sandbox (Linux, Node 22, Chromium 141 headless)
- **Authorization:** the owner explicitly authorized Slice 9 to begin. Slice 8 is
  `Complete` and supplies the hardware-independent boundary this slice plugs into.
  **Slice 10 was not authorized and was not started.**

## Duplicate-work preflight

Performed **before any edit**.

| Check | Result |
| --- | --- |
| Repository root | `/home/user/classroom-quiz-show` |
| Remote identity | `origin` → `ricktron/classroom-quiz-show` (via the sandbox git proxy) |
| Current branch at start | `claude/slice-9-gamepad-adapter-wfiue4` |
| HEAD at start | `5cc81d448f9558e914dd5da497232f071d58b10c` |
| Worktree cleanliness | clean (`git status --porcelain` empty) |
| Default branch | `main` — the only branch on the remote after fetch |
| `git fetch origin --prune` | pruned one stale ref (`origin/claude/slice-9-gamepad-adapter-wfiue4`, which did not exist on the remote); `origin/main` = `5cc81d4` |
| Worktrees | one (the primary) |
| Stashes | none |
| Local branches | `main` and `claude/slice-9-gamepad-adapter-wfiue4`, both at `5cc81d4` |
| Remote branches | `refs/heads/main` only |
| Open issues | none (0 total) |
| Pull requests | 18 total, **all closed**; #17 closed unmerged (the recorded reversed-PR incident). **No open PR, and none mentioning Slice 9 or Gamepad.** |
| Recent commits | 25 inspected; none touches Gamepad work |

### PR #18 merge verification

- **Merged:** yes — `merged_at` `2026-07-27T03:48:25Z`.
- **Merge commit:** `5cc81d448f9558e914dd5da497232f071d58b10c`.
- **Committed:** `2026-07-26 19:48:24 -0800` (= `2026-07-27T03:48:24Z`).
- **Reviewed head:** `6faa63196e426c230ba52b38738a7a2fd6f9f06b`
  (`docs: reconcile canonical status with the merged Slice 8`).
- **Ancestry:** the merge commit has two parents —
  `167128dc6462d10192afe92e85026918ebce7ba0` (the Slice 8 merge commit, first
  parent) and `6faa631…` (second parent). **The second parent is the reviewed
  head**, so the head that was reviewed is the head that merged.
- **Head branch:** `docs/slice-8-post-merge-reconciliation`.
- `origin/main` is exactly this merge commit, so the base of this slice is the
  merged state of PR #18.

### Prior-Gamepad-work search

Searched the tree for `navigator.getGamepads`, `gamepadconnected`,
`gamepaddisconnected`, `Gamepad`, `GamepadButton`, `requestAnimationFrame`,
`gamepadIndex`, `buttonIndex`, WebHID/Bluetooth terms, and any Gamepad mapping or
polling module.

**Result: no prior or in-progress Slice 9 work anywhere.** Every pre-existing hit
was one of:

- a **documentation** reference (`docs/plans/MVP-ARC.md`, `docs/STATUS.md`,
  `docs/handoff/CURRENT.md`, `ADR-007`, `ADR-008`, `ROADMAP-AMENDMENT-001`, four
  receipts) describing Slice 9/10 as planned;
- a **forward-looking comment** in Slice 8 source (`logicalAction.ts`,
  `commandTranslation.ts`, `events.ts`, `localInput.ts`, `LocalInputHostPanel.tsx`);
- a **negative assertion** in a test or e2e spec (a forbidden-word list).

`requestAnimationFrame`, `gamepadIndex` and `buttonIndex` had **zero** occurrences
anywhere. No Gamepad listener, polling loop, mapping model, host UI or Slice 9
ADR/receipt existed.

### Merged-source confirmations (verified on the base, before editing)

| Claim | Verified |
| --- | --- |
| `LOCAL_INPUT_SOURCE_KINDS` contained only `keyboard` | yes — `src/input/localInput.ts:56` |
| Keyboard was the only implemented adapter | yes — `src/input/` held no other adapter |
| The e2e suite asserted no Gamepad listener | yes — `tests/e2e/buzz-in.spec.ts` and `tests/e2e/timers-arming.spec.ts` |
| Secondary actions rejected by command translation | yes — `unsupported-action` in `commandTranslation.ts` |
| Slice 9 marked `Planned`, unstarted | yes — `MVP-ARC.md`, `STATUS.md`, `CURRENT.md` |
| Slice 10 unstarted | yes — `Planned`, unstarted, owner-gated |

**No hard duplicate-work stop was triggered.**

## Implementation

- **Base:** `5cc81d448f9558e914dd5da497232f071d58b10c`
- **Branch:** `claude/slice-9-gamepad-adapter-wfiue4` (the branch this task
  designates; the roadmap's suggested `feat/…` name was not used because the
  designated branch takes precedence)
- **Implementation commit:** recorded in the pull request; this receipt is part of
  that same commit.

### Files changed (28 files, +5,853 / −103)

**New runtime (5):**

| File | Role |
| --- | --- |
| `src/input/gamepadSource.ts` | THE browser boundary — the only caller of `navigator.getGamepads()`; the bounded frozen snapshot; the injectable `GamepadSource`; neutral labels |
| `src/input/gamepadAdapter.ts` | PURE rising-edge scan + edge → logical action; the baseline/re-prime rule; typed ignore reasons |
| `src/input/gamepadMapping.ts` | Generic controller/button ↔ team ↔ action mapping, validation, editing, pruning |
| `src/host/useGamepadBuzzInput.ts` | The ONE polling lifecycle owner; injectable scheduler; diagnostics throttling |
| `src/host/responseOpportunity.ts` | The ONE derivation of the live response target, now shared by both local-input panels |

**New host UI (2):** `src/host/GamepadInputHostPanel.tsx`, `…​.css`.

**New tests (7):** `src/test/gamepadFixtures.ts` (fake source + hand-driven poll
driver), `src/input/gamepadSource.test.ts`, `src/input/gamepadAdapter.test.ts`,
`src/input/gamepadMapping.test.ts`, `src/input/gamepadIntegration.test.ts`,
`src/host/useGamepadBuzzInput.test.tsx`,
`src/host/GamepadInputHostPanel.test.tsx`, `tests/e2e/gamepad-input.spec.ts`.

**Modified runtime (3):**

- `src/input/localInput.ts` — `'gamepad'` added to `LOCAL_INPUT_SOURCE_KINDS` and
  a neutral label (`Controller`) to `LOCAL_INPUT_SOURCE_LABEL`. **This is the only
  vocabulary change in the entire slice.**
- `src/host/FoundationControls.tsx` — renders the new panel beside the Slice 8 one.
- `src/host/LocalInputHostPanel.tsx` — now calls the extracted
  `responseOpportunityFor(game)` instead of an inline copy. **Behaviour identical**;
  its whole component test suite passes unmodified.

**Modified tests (3):**

- `src/input/localInputContract.test.ts` — the source-union assertion now expects
  `['keyboard', 'gamepad']` and still fails closed on `webhid`, `bluetooth`,
  `sony-buzz` and `phone`. The "names no colour, model or vendor" test was **split
  into two, both stronger**: the ACTION vocabulary must now contain no
  `gamepad`, `controller` **or** `button` (three terms added), and the SOURCE
  vocabulary gained its own assertion forbidding every vendor/model/colour term.
- `tests/e2e/buzz-in.spec.ts` — the host half of the "no Gamepad runtime"
  assertion no longer forbids the neutral words `gamepad`/`controller`, because
  that surface is now real. `webhid`, `sony`, `playstation`, `bluetooth` and
  `handset` are still forbidden on **both** surfaces, and a **new**
  display-specific block forbids `gamepad`, `controller`, `button index` and the
  no-controller copy on the projector. The vacuous `__gamepadListeners` check
  (a global nothing ever set) was replaced by real display-side instrumentation in
  the new spec.
- `tests/e2e/timers-arming.spec.ts` — same narrowing on the host, plus a **new**
  projector-side block asserting no `gamepad`, `controller`, `webhid`,
  `bluetooth`, `sony` or `lockout`, and `vendor` added to the host list.

**Documentation (6 modified + 1 new):** `README.md`, `docs/STATUS.md`,
`docs/handoff/CURRENT.md`, `docs/plans/MVP-ARC.md`, `docs/decisions/README.md`
(ADR index), `docs/architecture/GAME-ENGINE-BOUNDARIES.md`, and the new
`docs/architecture/ADR-009-generic-gamepad-adapter.md`.

> **On the two narrowed e2e assertions.** These are the only pre-existing
> assertions weakened anywhere, they are weakened on the HOST surface only, they
> are weakened by exactly two neutral words, and each is paired with a new
> projector-side assertion that is strictly stronger than what it replaced. No
> test was skipped, suppressed, or deleted, and no unit or component test was
> loosened.

## Gamepad architecture

```text
physical device      a generic USB controller
  ↓ browser API      navigator.getGamepads()          ── host-private
browser boundary     src/input/gamepadSource.ts       ── host-private
  ↓ bounded snapshot GamepadSnapshot: { controllerIndex, pressed[] }, frozen
local input adapter  src/input/gamepadAdapter.ts      ── host-private
  ↓ logical action   LocalInputSignal — team + action + evidence
command translation  src/input/commandTranslation.ts  ── UNCHANGED
  ↓ command          RECORD_TEAM_BUZZ                 ── UNCHANGED
planner → event      TEAM_BUZZED (+ RESPONSE_TIMER_INTERRUPTED) ── UNCHANGED
  ↓ replay
reducer-derived queue BuzzQueueState, order from `seq`          ── UNCHANGED
  ↓ allow-list sanitizer
PublicState          PublicBuzzState                           ── UNCHANGED
```

Not representable above the boundary: browser `Gamepad`/`GamepadButton` objects,
device `id`, `mapping`, `axes`, analog `value`, `touched`, `timestamp`,
`vibrationActuator`, vendor id, product id, polling state, connection diagnostics.

Not added: dynamic adapter registration, imported-content registration, plugin
loading, a parallel command path, Gamepad-shaped commands or events, Gamepad
fields in private gameplay state, Gamepad fields in `PublicState`.

## Polling boundary

- One `useEffect`, in one host-only hook, registered **once** (a second
  registration is refused), stopped on unmount.
- **Never** in the reducer, during render, in the sanitizer, during replay, in
  command planning, or on the display route.
- **No global polling service**, module-level loop or singleton.
- Production scheduler: one `requestAnimationFrame` loop (browser-throttled in a
  hidden tab). Tests inject a hand-stepped driver.
- Unsupported API and a failed read both degrade to typed, host-private states and
  buzz nothing.
- `clock.now()` is read once per genuine edge, at the dispatch edge (ADR-007 §1).
  **A poll with no edge reads no clock at all** — asserted by test.

## Mapping semantics

- A binding is `{ controllerIndex, buttonIndex, teamId, action }`.
- Bounds: controller index 0–15, button index 0–31, at most 8 controllers tracked,
  at most 40 bindings.
- Validation issues: `malformed-controller-index`, `malformed-button-index`,
  `duplicate-control`, `unknown-team`, `duplicate-team-primary`,
  `malformed-action`, `too-many-bindings`. Every issue is addressed to its binding
  index; nothing is repaired, coerced, dropped or silently overwritten.
- At most one primary buzz binding **per team, within the Gamepad mapping**. A team
  may hold a buzz key AND a controller button — different adapters, one queue.
- All four ordinal secondary slots are mappable and remain inert.
- **No default mapping and no generated profile.** Nothing is bound until a teacher
  presses a button.
- "Controller not attached" and "controller has no such button" are resolution
  facts, **not** validation failures — a mapping survives unplugging.
- `withGamepadControlForTeamAction` does not steal another team's control; the
  clash is reported instead.

## Baseline and rising-edge rules

| previous | current | result |
| --- | --- | --- |
| not pressed | pressed | one input |
| pressed | pressed | nothing |
| pressed | not pressed | nothing; that control rearms |
| *no previous observation* | anything | **nothing — baseline only** |

Re-primes (baseline dropped, so a held button needs a release and a fresh press):
enable, disable, mapping change, capture start, capture end, `gamepadconnected`,
`gamepaddisconnected`, `visibilitychange`, window `focus`, window `blur`, and any
failed read.

Simultaneous fresh edges are processed by **ascending controller index, then
ascending button index** — a tie-break rule, **not** a fairness or reaction-time
claim. The event log's monotonic `seq` remains the authoritative accepted order,
and `observedAt` is evidence only.

## Connection / disconnection behaviour

- A controller appearing produces a baseline and **no input**, even with a button
  held.
- A controller disappearing is dropped from the baseline and produces **no input**.
- A reconnect at the **same** index and at a **different** index both fail closed.
- A controller whose button count changes between polls is re-baselined rather than
  compared against a differently-shaped list.
- **No event is appended because a controller appeared or disappeared** — proved by
  `gamepadIntegration.test.ts` ("appends no event when a controller disconnects
  mid-arming, held button and all") and by the hook's connect/disconnect suite.

## Host UI

A bounded, host-only panel beside the Slice 8 buzz-in panel. Shows: API
availability; on/off; connected count; neutral labels ("Controller 1") and button
counts; each team's assignment for the selected action; validation conflicts; and a
sentence explaining every press that did nothing. Offers: enable/disable, an
explicit capture mode with cancel, clear-one, clear-all, and an action picker
covering the primary buzz plus the four ordinal secondary slots.

**Controller buzzing starts switched OFF**, and nothing is bound by default.
No-controller copy: *"No controller detected. Keyboard buzzing remains
available."*

Deliberately absent: model names, vendor/product ids, colours, handset numbers,
raw arrays, raw JSON, axes, analog readings, and **any live per-frame button
display** — diagnostics are emitted only when the STABLE picture changes.

Accessibility: every control is a real `<button>`/`<select>`, keyboard-reachable in
DOM order; connection changes and capture state use **polite** live regions (there
is no `role="alert"` and no `aria-live="assertive"` in the panel); state is stated
in words, never by colour; focus stays on the control that started a capture and
never moves on a poll; disabled and unavailable states are explained in text.

## Privacy / public-state decision

**`PublicState` is unchanged. Wire version stays 6. The sync envelope stays 2.**
No schema-version or protocol bump was needed, so none was made.

Not exposed to the projector, and not representable in `PublicState`: API
availability, controller count, controller index, controller label, button index,
button state, mapping, connection state, capture state, adapter errors, and the
input **source kind**. The public active-team + waiting-count projection remains
the only class-facing result.

Proved by: `gamepadIntegration.test.ts` (serialized event log and serialized
`PublicState` both asserted free of 14+ device terms; and a controller-built
projection asserted **equal** to a command-built one), plus
`tests/e2e/gamepad-input.spec.ts`, which instruments the display page from before
application code runs and asserts `navigator.getGamepads` was called **0 times**
and **0** gamepad listeners were registered on the display route.

## Tests and totals

| Suite | New tests |
| --- | --- |
| `src/input/gamepadSource.test.ts` | 25 |
| `src/input/gamepadAdapter.test.ts` | 27 |
| `src/input/gamepadMapping.test.ts` | 31 |
| `src/input/gamepadIntegration.test.ts` | 18 |
| `src/host/useGamepadBuzzInput.test.tsx` | 28 |
| `src/host/GamepadInputHostPanel.test.tsx` | 35 |
| `tests/e2e/gamepad-input.spec.ts` | 4 × 3 viewport projects = 12 |

Unit/component total moved **1,184 → 1,349** (51 → 57 files). End-to-end total
moved **187 → 199** passed, with the same 2 pre-existing skips.

Every deterministic test uses the fake source and the hand-driven poll driver in
`src/test/gamepadFixtures.ts`. **No test requires a browser, an animation frame or
physical hardware**, and no test-only global or production backdoor was added to
let Playwright simulate a controller.

## Verification

| Command | Result | Notes |
| --- | --- | --- |
| `npm ci` | pass | clean reproducible install; no dependency change |
| `npm run lint` | pass | ESLint flat config, 0 problems |
| `npm run typecheck` | pass | `tsc -b --noEmit` |
| `npm run test:run` | pass | **1,349 passed, 57 files** |
| `npm run build` | pass | `tsc -b && vite build`; PWA `generateSW`, **16 precache entries (459.39 KiB)** — unchanged mode and unchanged entry count vs. Slice 8 |
| `npm run test:e2e` | pass | **199 passed / 2 skipped** across the 3 viewport projects (10.6 min) |
| `npm run verify:all` | pass | lint + typecheck + unit + build + e2e, all of the above |
| `git diff --check` | clean | no whitespace errors |

The 2 skips are the single pre-existing desktop-only offline-shell test, skipped in
the two non-desktop projects. **Nothing was skipped because it failed.**

## Environment overrides

- `PLAYWRIGHT_CHROMIUM_PATH=/opt/pw-browsers/chromium-1194/chrome-linux/chrome` —
  the sandbox provides Chromium build 1194 while `@playwright/test@1.56` expects
  1228. Supplied **through the environment only**; no machine-specific path is
  committed. CI installs the matching browser and needs no override.

## Browser and hardware limitations

- **Primary browser documentation could not be fetched.** The sandbox network
  policy denies `developer.mozilla.org` and `w3c.github.io` (HTTP 403 on CONNECT).
  The Gamepad contract was verified against two primary sources available locally
  instead, and both are recorded in ADR-009 §Context:
  1. the WebIDL shipped in TypeScript 5.9's `lib.dom.d.ts` —
     `getGamepads(): (Gamepad | null)[]` with documented `null` holes,
     `GamepadButton.pressed: boolean`, `Gamepad.index: number`;
  2. a **direct probe of the Chromium build this repository tests with** (141,
     headless, no controller attached): `typeof navigator.getGamepads ===
     'function'`; a length-4 array of four `null`s; a **new array object per
     call**; and `'ongamepadconnected' in window === false`. That last observation
     is why support is feature-detected on `getGamepads` alone.
- **A browser controller index is a session-local locator, not an identity.** It is
  not stable across a reload, a browser restart, a disconnect/reconnect, a USB port
  change, an operating system or a browser version, and it is never persisted.
- **Most browsers do not expose a controller until a button on it is pressed**, so a
  freshly plugged-in controller can legitimately read as "None detected" until it
  is touched.
- **Gamepad mappings are lost when the host page reloads** (deliberate; the panel
  says so).
- Sub-frame ordering is not resolvable, and no fairness is claimed.

## Physical-hardware validation

> **No physical controller was tested.** None is available in this environment. No
> claim is made that any specific device works, and there is no supported-hardware
> list. Generic USB controller support is implemented and proved by deterministic
> unit tests against a fake source; the browser tests cover the **no-controller**
> path only. Owner hardware validation has **not** been performed.

## Explicit exclusions (verified mechanically)

| Claim | Evidence |
| --- | --- |
| No Sony-specific runtime exists | every `sony`/`playstation`/`buzz!`/`handset`/`vendor` hit under `src/` (excluding tests) is a **comment**, all of them pre-existing Slice 8 text; there is no runtime symbol, branch, string or UI copy |
| No WebHID or Bluetooth runtime exists | zero hits for `webhid`, `navigator.hid`, `requestDevice`, `navigator.usb`, `bluetooth` in runtime source; the only hits are test forbidden-lists and comments |
| `navigator.getGamepads()` is called from exactly one runtime file | `src/input/gamepadSource.ts` |
| No browser `Gamepad`/`GamepadButton` type is referenced outside that boundary | grep over `src/` excluding `gamepadSource.ts` returns one comment and no code |
| No Gamepad data enters `PublicState` | `PUBLIC_STATE_SCHEMA_VERSION` unchanged at **6**; no gamepad/controller/button/pressed term in `publicState.ts`, `sanitize.ts`, `src/sync/` or `src/display/` runtime; serialized-state assertions in `gamepadIntegration.test.ts` |
| No raw Gamepad data enters commands or events | `commands.ts` and `events.ts` unchanged; serialized event-log assertion over 13 device terms |
| No response-mode work exists | zero hits for `multiple.choice`, `responseMode`, `response policy`, `speed scor` in `src/` and `tests/` |
| No persistent Gamepad storage exists | zero `localStorage`/`IndexedDB`/`sessionStorage` references in any Gamepad module (only a comment saying there are none) |
| No dependency, workflow or build-config change | `git diff --cached --stat` over `package.json`, `package-lock.json`, `.github/`, `vite.config.ts`, `vitest.config.ts`, `playwright.config.ts`, `tsconfig*.json`, `eslint.config.js`, `scripts/` is **empty** |
| Every pre-existing receipt is unchanged | see below |
| Slice 10 remains unstarted | `MVP-ARC.md` §"Slice 10" still reads `Status: Planned — unstarted`; no Slice 10 code, doc or receipt exists |
| The MVP roadmap remains 18 slices | the slice table still has exactly 18 numbered rows; the ordering is unchanged; the post-MVP deferred response-mode note is untouched |

Also **not** implemented: WebHID, USB drivers, Bluetooth setup, haptics or
vibration, axes or analog controls, analog threshold tuning, persistent Gamepad
mappings, phone or networked buzzers, new scoring behaviour, secondary-action
gameplay, multiple-choice response modes, speed-based scoring, media,
export/import, session persistence, final wager, reporting, themes, authoring,
backend, accounts, cloud sync, analytics, AI generation, LMS integration.

## Receipt immutability proof

Every receipt that existed on `origin/main` was compared by **git blob hash**
against the working tree. All 18 files (17 receipts + the receipts README) are
**byte-for-byte identical**, and `git diff --cached --name-status -- docs/receipts/`
lists **only this new file**:

```
UNCHANGED  581ace7ec841  docs/receipts/2026-07-22-slice-1-local-verification.md
UNCHANGED  6a9d79a46bc7  docs/receipts/2026-07-22-slice-1-post-merge-reconciliation.md
UNCHANGED  3c1178c11a1c  docs/receipts/2026-07-22-slice-2-local-verification.md
UNCHANGED  b2d630d410cf  docs/receipts/2026-07-22-slice-2-post-merge-reconciliation.md
UNCHANGED  33ea13902661  docs/receipts/2026-07-23-slice-3-local-verification.md
UNCHANGED  701e898690ff  docs/receipts/2026-07-23-slice-3-post-merge-reconciliation.md
UNCHANGED  36ab4df87183  docs/receipts/2026-07-24-slice-4-local-verification.md
UNCHANGED  09166648e5b3  docs/receipts/2026-07-25-slice-4-post-merge-reconciliation.md
UNCHANGED  e89af94f6ad6  docs/receipts/2026-07-26-roadmap-amendment-001-local-buzzers.md
UNCHANGED  3e023f52bd62  docs/receipts/2026-07-26-slice-5-local-verification.md
UNCHANGED  7f6f966cb462  docs/receipts/2026-07-26-slice-5-post-merge-reconciliation.md
UNCHANGED  b499fff424f0  docs/receipts/2026-07-26-slice-6-local-verification.md
UNCHANGED  22eb32c14dd1  docs/receipts/2026-07-26-slice-6-post-merge-reconciliation.md
UNCHANGED  86ad235a72eb  docs/receipts/2026-07-26-slice-7-local-verification.md
UNCHANGED  c4e2dfb71ca2  docs/receipts/2026-07-27-slice-7-post-merge-reconciliation.md
UNCHANGED  0f54126ca62c  docs/receipts/2026-07-27-slice-8-local-verification.md
UNCHANGED  019f904b2db6  docs/receipts/2026-07-27-slice-8-post-merge-reconciliation.md
UNCHANGED  f6cc46ef037b  docs/receipts/README.md
```

**No older receipt was amended.** This is the single new Slice 9 receipt.

## Slice 10 status

`Planned` — **unstarted and owner-gated**. Slice 9 having shipped the generic
adapter Slice 10 builds on is **not** authorization to begin it.

## PR state

**Open and unmerged**, base `main`, head
`claude/slice-9-gamepad-adapter-wfiue4`. **PR CI has not been observed** and no
check conclusion is claimed. Slice 9 is `In review`, **not** `Complete`.

## Caveats

- PR CI conclusions: **not observed** (the PR is open at the time of writing).
- Post-merge CI on `main`: **not applicable** (not merged).
- GitHub Pages deployment and live-route behaviour: **not verified** (not merged;
  and the sandbox network policy denies `ricktron.github.io` in any case).
- SonarCloud findings: **not inspected** — `sonarcloud.io` is unreachable from the
  sandbox.
- Physical controller behaviour: **not tested** — see above.
- Primary browser specification pages: **not fetched** — see above; local primary
  sources were used instead.

## Next safe action

Review the pull request, wait for CI to conclude, and merge only if the checks are
green. Then perform the Slice 9 post-merge reconciliation that marks Slice 9
`Complete`. **Do not merge as part of this slice's work, and do not begin Slice 10
without explicit owner authorization.**
