# Slice 7 — timers, arming & transitions: local verification

- **Date:** 2026-07-26
- **Slice:** `CQS-S07-TIMERS-ARMING-AND-TRANSITIONS` /
  `CQS-SLICE-7-TIMERS-ARMING-TRANSITIONS`
- **Authorization:** owner-authorized implementation slice. The amended roadmap
  record ([`../plans/MVP-ARC.md`](../plans/MVP-ARC.md), "Amended slice records
  (7–18)") listed Slice 7 as the next recommended slice with **no open decision
  gates**; the owner granted authorization to begin, and additionally authorized
  recording owner decisions `OG-1`, `OG-2` and `OG-3`.
- **PR:** implementation PR against `main` — **open and unmerged at the time this
  receipt was written.**
- **Branch:** `claude/slice-7-timers-arming-transitions-wd7cmf`
- **Base `main` commit:** `752a3fe0f45fdc1ee687339134023c3811facd91`
  (merge commit of **PR #13**, `ROADMAP-AMENDMENT-001`, merged
  2026-07-26T20:02:13Z by `ricktron`; reviewed head
  `2524e7450dc97a602cc90bcc748ad4af9cef8868`; all three PR checks concluded
  success)
- **Implementation commits:** one commit on the branch above, containing every
  change listed under "Files changed". Its SHA is recorded in the pull request
  rather than here, because a commit cannot contain its own hash.
- **Environment:** local sandbox (Linux 6.18.5, Node v22.22.2, npm 10.9.7)

## Commands & results

| Command | Result | Notes |
| --- | --- | --- |
| `npm ci` | pass | reproducible install from `package-lock.json`; **no dependency changes** |
| `npm run lint` | pass | ESLint flat config, no warnings |
| `npm run typecheck` | pass | `tsc -b --noEmit` |
| `npm run test:run` | pass | **947 tests, 42 files** (740 before this slice; **+207**) |
| `npm run build` | pass | `tsc -b && vite build`; PWA precache **16 entries / 421.51 KiB** |
| `npm run test:e2e` | pass | **175 passed / 2 skipped**, 3 viewport projects (154/2 before; **+21**) |
| `git diff --check` | pass | no whitespace errors |
| `npm run verify:all` | pass | the whole lint → typecheck → unit → build → e2e chain, run again end to end |

Each command above was run individually **and** `verify:all` was then run once as a
single chain; both passed.

## Skips (accurately reported)

Two skips, both pre-existing and both the SAME test:
`tests/e2e/pwa-offline.spec.ts` → "offline app shell › host and display shells load
offline after first visit". It is guarded to run once on the desktop project only,
so it reports as skipped on `projector-720p` and `mobile-host`. **No test was
skipped because it was failing, and Slice 7 adds no skips.**

## Production build / PWA inspection

`dist/` contains `index.html`, `manifest.webmanifest`, `sw.js`, the workbox runtime
and hashed assets under `assets/`, plus the (still placeholder) icons. The service
worker is generated in `generateSW` mode and precaches 16 entries; the manifest
still declares the `/classroom-quiz-show/` scope and start URL, `standalone`
display and the landscape orientation. **Slice 7 changes no PWA, build, CI or
deployment configuration** — the only delta in the bundle is application code and
one new stylesheet.

## Environment override

Playwright needed
`PLAYWRIGHT_CHROMIUM_PATH=/opt/pw-browsers/chromium-1194/chrome-linux/chrome`
because this sandbox's pre-provisioned Chromium is build 1194 while
`@playwright/test@1.56` expects 1228. The override was supplied **via the
environment only**; no machine-specific path is committed. `playwright.config.ts`
already reads that variable (added in Slice 1) and is unchanged.

## Architecture delivered

- **The clock boundary** (`src/time/clock.ts`): a `Clock` interface, `systemClock`,
  `createManualClock`, and the `isInstant` guard every timestamp crossing a command
  or wire boundary passes. A clock is read at the command/dispatch edge and the
  presentation edge only — never in `reduce`, `replay`, the planner's decision
  logic, or the sanitizer. No global timer service; nothing mutates state outside
  the command → event → replay pipeline.
- **The timing domain** (`src/game/timing/`): bounded limits with classroom
  rationale, the strict authored-config schema, the trusted `TimerConfig`
  constructor with the one documented default, and the `ResponsePhaseState` model.
- **Session state:** `PrivateGameState.responsePhases`, a per-round map that is a
  **sibling** of `categoryBoards`, so a later round type reuses the model.
- **Eight reversible commands and events**, one adapter (`useResponseTimerExpiry`),
  one host panel, one projector panel, one derived-countdown hook.

## Timer semantics

Durable facts only. A `running` timer stores `timerId`, `durationMs`, `startedAt`
and an absolute `deadline`; a `paused` timer stores `remainingMs` and **no
deadline**; `expired` and `interrupted` store what they need. There is **no tick
event, no per-frame revision, and no remaining-time value on a running timer** —
"how long is left" is derived by a pure function at whichever edge needs it.
Because a paused timer carries no deadline, **replay consumes no wall-clock time
while paused**. Durations are 5–600 whole seconds; the default is 30.

## Arming semantics

`armed` is durable state changed only by `ARM_RESPONSE_PHASE` /
`DISARM_RESPONSE_PHASE` (owner decision **`OG-1`**: manual, host-controlled).
Nothing arms a clue automatically — not a prompt reveal, not a timer start, not an
animation completing. Arming and the timer are orthogonal: either, both or neither.
Arming today records that an interrupting input *would* be accepted; **no such
input exists in this slice.**

## Interruption semantics

`ResponseInterruptionSource` is a bounded discriminated union with one member
today, `{ kind: 'host' }`, guarded at the command boundary and again on event
application. An interruption **stops the clock without ending the clue**: the
prompt stays public, the tile stays unconsumed, and the clue stays armed — which is
what lets a later slice promote another respondent without a redesign. No team,
queue, device, button or raw input evidence appears anywhere.

## Transition behavior

Legality is decided once, in `resolveResponsePhase`: a window is legal only at the
`prompt` stage of the current round. A window is cleared by a new tile selection,
the answer reveal, a return to the board, **any round change**, the game ending, and
a new game. It is deliberately **not** resumed across a round change, unlike board
progress. No transition fabricates an event.

## Public-state changes

One new field, `response: PublicResponseState | null` — the armed flag plus a
status-discriminated timer. A running window publishes the absolute deadline and
the duration; paused/interrupted publish the frozen remaining and no deadline;
expired publishes the duration only. `null` when there is nothing to show,
including a clue that was neither armed nor timed. Never projected: the internal
`timerId`, the interruption **source**, the authored `timer` block, `startedAt`,
the round id, the private phase map, any host control, or anything about a future
buzzer.

## Protocol version decision

- **`PUBLIC_STATE_SCHEMA_VERSION` 4 → 5** — one new allow-listed field. Version 4
  is rejected, never reinterpreted.
- **`SYNC_SCHEMA_VERSION` 1 → 2** — the `public-state` message gained a **required**
  `sentAt` stamp, used only to estimate the host/display clock offset. Making it
  optional and treating "absent" as "no offset" was rejected as exactly the implicit
  compatibility guessing ADR-004 forbids. A version-1 envelope is rejected with
  `unsupported-version`; an unusable `sentAt` fails the envelope rather than being
  defaulted.

Both versioned surfaces fail closed. No migration exists and none is implied.

## Schema decision

**`schemaVersion` stays 1.** The authored `timer` block is **additive and
optional**: every pre-Slice-7 game file is still valid, still means exactly the
same thing, and receives the documented 30-second default from the trusted
constructor — never from a Zod `.default()`. No schema version 2 was introduced,
and `ROADMAP-AMENDMENT-001` §5.10's migration-policy-first discipline is preserved.
Bounds are validated (5–600 whole seconds) with exact document paths and no repair.

## Tests added in this slice

| Area | File | Tests |
| --- | --- | --- |
| Timing domain: authored config, bounds, defaults, the phase model, pure derivations, formatting | `src/game/timing/timing.test.ts` | 25 |
| Commands, legality, arming, start, pause/resume, interruption, expiry, staleness, transitions, scoring independence, replay, undo, corrupt-log fail-safe, the clock seam | `src/state/responsePhaseReducer.test.ts` | 75 |
| Public projection, privacy, purity, the response guard, the derived countdown, wire versions, the offset clamp | `src/state/responseSanitize.test.ts` | 30 |
| Canonical import of `timer`, backward compatibility, exact paths, no repair, the built-in samples | `src/import/timerImport.test.ts` | 22 |
| Host panel: the four facts, disabled-when-illegal, the duration selector, accessibility, scope | `src/host/ResponseTimerHostPanel.test.tsx` | 25 |
| The expiry adapter: command not mutation, fires once, and eight stale-callback cases | `src/host/useResponseTimerExpiry.test.tsx` | 13 |
| Projector panel: countdown, every state in words, offset correction, never-the-authority, accessibility, privacy | `src/display/ResponseTimerDisplay.test.tsx` | 17 |
| Browser: arm/run/pause/resume/stop, expiry exactly once, stale callbacks, undo, projector reload, privacy + scoring, reduced motion | `tests/e2e/timers-arming.spec.ts` | 7 × 3 projects |

Existing Slice 1–6 suites all remain green. Five pre-existing assertions were
**updated, not weakened**, because Slice 7 deliberately changes the facts they
recorded: the top-level `PublicState` allow-list (now includes `response`), the two
wire-version assertions (4 → 5), the no-session projection, and the Slice 5 "no
timer field anywhere in private state" smoke check — which is replaced by a test
that a revealed prompt leaves the response phase untouched and that buzzer/queue
vocabulary is still absent. Sixteen test envelope literals gained the now-required
`sentAt`.

## Verification of the invariants this slice could have broken

- **Replay is bit-exact and clock-free** — `replay(h) === replay(h)` and equals the
  store's state after start/pause/resume/expire; every `occurredAt` on a response
  event is traceable to a command's `issuedAt`.
- **No per-tick revision** — a running window produces exactly one event and the
  revision does not move while it counts down.
- **Exactly one effective expiry per countdown** — structural, because applying the
  event moves the timer out of `running`.
- **Stale callbacks are inert** — reset, restart, pause, resume, undo, clue change,
  round change, repeat dispatch, premature dispatch and unmount, each proved.
- **Undo restores the prior durable state exactly** — for arm, disarm, start,
  pause, resume, interrupt, expire, reset, and the answer reveal that closed a
  window.

## Known limitations

- **Host and display clocks are not synchronized.** The display applies a clamped
  (±5 s) offset estimated from each snapshot's `sentAt`; transport delay is ignored
  and no round-trip measurement is done. On the only transport that exists today —
  BroadcastChannel between two tabs of one browser — both readings come from the
  same `Date.now()`, so the correction is effectively a no-op. It exists so a future
  cross-device transport does not silently mis-render a countdown.
- **The display never expires a timer.** At 0:00 it keeps showing the running state
  until the host publishes `expired`.
- **Undoing an expiry restores an already-overdue running timer**, which the
  adapter then expires again on the next tick unless the host acts.
- **A response window exists only at the `prompt` stage** and is not resumed across
  a round change.
- **Undo remains latest-only** (ADR-002); this slice does not broaden it.
- **State is still in memory only** — a host reload loses the session, including any
  running window. Durable persistence is Slice 13.
- **`PublicState` v4 and sync v1 consumers fail closed**; there is no migration.
- **No manual live-URL verification was performed** — the sandbox network policy
  denies `ricktron.github.io`. Nothing about live behaviour is claimed.
- **Slice 7 PR CI has not been observed** at the time of writing. This receipt
  records local verification only and is not amended after merge.

## Deferred decisions

- **`OG-8` (timer pause/resume) is RESOLVED for this slice** — explicit host pause
  and resume are supported, bounded as ADR-007 §7 describes. It remains open to
  owner revision; removing the two commands would not disturb the rest of the
  model.
- **`OG-6` (scoring restricted to the active respondent) remains deferred and is
  NOT implemented**, because no respondent exists to restrict it to.
- **`OG-4`, `OG-5`, `OG-7` and `OG-9` remain open** and are untouched by this
  slice.

## Owner decisions recorded (not all implemented)

| Gate | Decision | Status |
| --- | --- | --- |
| `OG-1` | Arming is manual and host-controlled | **Implemented** in Slice 7 |
| `OG-2` | A full ordered team queue, not first-only lockout | **Recorded only — NOT implemented** |
| `OG-3` | The next queued team is promoted after an incorrect response or a host pass | **Recorded only — NOT implemented** |

`OG-2` and `OG-3` unblock the Slice 8 event vocabulary. They authorize nothing in
this slice, and no queue or promotion behaviour exists anywhere in the codebase.

## Explicit non-goals (verified absent)

No Slice 8 work of any kind. No team buzz events, ordered buzzer queues,
pass-to-next-team behaviour, keyboard team inputs, Gamepad API, Sony Buzz!
handling, WebHID, Bluetooth, phone buzzers or networked buzzers. No backend,
accounts, media, final-wager round, portable export/import, persistence or
recovery, reporting, leaderboards, theme engine, authoring packs, AI-generated
content, or LMS integration. No proprietary branding, sounds or assets, and no
commercial audio or media files were added. No new network, secret, account,
analytics or tracking dependency: `package.json` and `package-lock.json` are
unchanged.

## Security & privacy review

- No answer leakage before the authorized reveal — asserted while a window runs.
- No teacher-note, alternate-answer, future-tile or host-control leakage.
- No internal timer id, interruption source or authored configuration on the wire.
- No timer callback can mutate public state: the adapter's only output is a
  command, and the planner validates it.
- No display-originated expiration is authoritative.
- No arbitrary string or unvalidated time value crosses a command or wire boundary
  (`isInstant`, `isResponseSeconds`, `isResponseInterruptionSource`, the strict
  envelope decoder).
- The projector remains read-only: zero buttons, inputs, selects or links.

## Files changed

**New (17):** `src/time/clock.ts` · `src/time/duration.ts` ·
`src/game/timing/limits.ts` · `src/game/timing/schema.ts` ·
`src/game/timing/timerConfig.ts` · `src/game/timing/responsePhase.ts` ·
`src/game/timing/timing.test.ts` · `src/host/ResponseTimerHostPanel.tsx` ·
`src/host/ResponseTimerHostPanel.css` · `src/host/ResponseTimerHostPanel.test.tsx` ·
`src/host/useResponseTimerExpiry.ts` · `src/host/useResponseTimerExpiry.test.tsx` ·
`src/display/ResponseTimerDisplay.tsx` · `src/display/ResponseTimerDisplay.css` ·
`src/display/ResponseTimerDisplay.test.tsx` · `src/display/useResponseCountdown.ts` ·
`src/state/responsePhaseReducer.test.ts` · `src/state/responseSanitize.test.ts` ·
`src/import/timerImport.test.ts` · `tests/e2e/timers-arming.spec.ts` ·
`docs/architecture/ADR-007-timers-arming-transitions.md` · this receipt.

**Modified (runtime):** `src/state/commands.ts` · `src/state/events.ts` ·
`src/state/reducer.ts` · `src/state/privateState.ts` · `src/state/publicState.ts` ·
`src/state/sanitize.ts` · `src/sync/protocol.ts` · `src/sync/broadcaster.ts` ·
`src/sync/receiver.ts` · `src/game/gameDefinition.ts` ·
`src/import/schemas.ts` · `src/import/normalize.ts` ·
`src/import/canonicalFormat.ts` (docs) · `src/import/sampleGameFile.ts` ·
`src/host/FoundationControls.tsx` · `src/host/useHostSync.ts` ·
`src/host/CategoryBoardHostPanel.tsx` (clock injection) ·
`src/host/TeamScoringPanel.tsx` (clock injection) ·
`src/display/usePublicState.ts` · `src/routes/DisplayRoute.tsx` ·
`src/routes/DisplayRoute.css`.

**Modified (tests):** `src/state/sanitize.test.ts` ·
`src/state/categoryBoardSanitize.test.ts` · `src/state/teamScoreSanitize.test.ts` ·
`src/state/categoryBoardReducer.test.ts` · `src/sync/protocol.test.ts` ·
`src/sync/sync.test.ts` · `src/sync/categoryBoardSync.test.ts` ·
`src/sync/teamScoreSync.test.ts`.

**Modified (docs):** `README.md` · `docs/STATUS.md` · `docs/PROJECT.md` ·
`docs/handoff/CURRENT.md` · `docs/plans/MVP-ARC.md` · `docs/decisions/README.md` ·
`docs/architecture/GAME-ENGINE-BOUNDARIES.md`.

**Unchanged:** `package.json`, `package-lock.json`, `.github/workflows/`,
`public/`, `scripts/`, `vite.config.ts`, `vitest.config.ts`,
`playwright.config.ts`, `eslint.config.js`, every `tsconfig*.json`.

## Documentation reconciliation performed

`docs/STATUS.md` and `docs/handoff/CURRENT.md` previously said the next action was
to "review and merge the roadmap amendment PR". PR #13 merged on 2026-07-26, so
that wording was stale and is corrected in place to name the merge and point at the
Slice 7 PR instead. That is the **only** post-#13 reconciliation performed: no
separate PR #13 reconciliation receipt was created, `ROADMAP-AMENDMENT-001` and its
receipt are untouched, and no broad second reconciliation of the amendment was
attempted.

## Receipt immutability proof

Every receipt that existed before this slice was hashed with SHA-256 before and
after all Slice 7 work. **All 13 pre-existing receipt files plus
`docs/receipts/README.md` are byte-for-byte unchanged**; the only change under
`docs/receipts/` is this one added file. `git status --porcelain docs/receipts/`
reported no modifications to any existing file.

| SHA-256 | File |
| --- | --- |
| `084aeb54a08378ab68f87e6e793cba58df5c62f859026c7ab759c140fb9d4b61` | `2026-07-22-slice-1-local-verification.md` |
| `4b61d52ba61d40faee47b896fcbbcfed0db3d9ef2158d2ad8b9d6c3b8807a14d` | `2026-07-22-slice-1-post-merge-reconciliation.md` |
| `08ecac198d878b29f1c331a3e1d3b68ac11058054d67550a4ec52d0a479d5130` | `2026-07-22-slice-2-local-verification.md` |
| `7de23cb52264550283649dcab8edabd766b7e627ba904f33d745e5cc03e8bb2f` | `2026-07-22-slice-2-post-merge-reconciliation.md` |
| `e3cb6ac5d6f403f373c9ea2e523f0c78e99158121e8d5d2c304455f9e75ea707` | `2026-07-23-slice-3-local-verification.md` |
| `3367b361d869d547c1710527c00cae4c1159ef51a087ff497ef072c9abb6c91d` | `2026-07-23-slice-3-post-merge-reconciliation.md` |
| `39d0c37291c61751944e23a08d8be0c5508fe473b38c7326549c82da905d4fa4` | `2026-07-24-slice-4-local-verification.md` |
| `4787a01115cd6eb1ab45bb7510ac53fd4c90bc8647f2aa0ec2455377230e1a18` | `2026-07-25-slice-4-post-merge-reconciliation.md` |
| `69e3610cfe266db8a19ff234dfa3499f17adea42a3ee334a9955f9324d4388f5` | `2026-07-26-roadmap-amendment-001-local-buzzers.md` |
| `5ec46324e5e9876e1534cc75fb7ed45de0dd7c93fe398f38b6aa315cbbe164d6` | `2026-07-26-slice-5-local-verification.md` |
| `dec18b62e4e203a75f455022da3f3eebcec913978f40e32ba702672903da2f44` | `2026-07-26-slice-5-post-merge-reconciliation.md` |
| `1dc8ad7b2201e48a004fd30fe821a1e5c52c7856124c42568407f6df96226601` | `2026-07-26-slice-6-local-verification.md` |
| `48dcd8fa81f0c29089741ffeba3dbaf59556e42ca3210d89e5cc574bea31bfca` | `2026-07-26-slice-6-post-merge-reconciliation.md` |
| `5e4cd77f558cc7b18d2e351d7da6b5ea5216a958ca594bc7fcb75887a0173429` | `README.md` |

## PR state

**Open and unmerged.** This receipt is written before review and is **not amended
after merge** — a receipt records the moment it was taken. Post-merge evidence
belongs in a separate reconciliation receipt.

## Next safe action

Review the Slice 7 pull request. After it merges, record the post-merge
reconciliation as usual. **Do not begin Slice 8** — its vocabulary gates are
answered, but the slice itself is still `Planned`, unstarted and owner-gated.
