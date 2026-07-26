# Roadmap Amendment 001 — local buzzers & slice reordering: planning slice

## Identity

- **Slice:** `CQS-ROADMAP-AMENDMENT-1` — planning-only roadmap amendment decision
  slice
- **Amendment produced:** `ROADMAP-AMENDMENT-001`
  ([`../decisions/ROADMAP-AMENDMENT-001-local-buzzers.md`](../decisions/ROADMAP-AMENDMENT-001-local-buzzers.md))
- **Date:** 2026-07-26
- **Branch:** `docs/roadmap-amendment-local-buzzers`
- **Base commit:** `64000ab76ec83e3dedbc968ab3e92dbff8872fc6` — the merge commit
  of PR #12 (the Slice 6 post-merge reconciliation) and the tip of `origin/main`
  at the time this branch was cut
- **Final commit:** written in the same commit it describes; the SHA is visible on
  the amendment PR
- **Environment:** local sandbox (Linux, Node 22, npm 10)

## Authorization boundary

Owner-authorized as **decision and documentation work only**. Explicitly **not**
authorized, and **not** done:

- no runtime code; no Slice 7 work; no keyboard input handling; no Gamepad API
  code; no Sony Buzz! support; no timers, transitions, media, persistence,
  import/export, migrations, reporting or leaderboards;
- no change to tests, workflows, dependencies, package manifests, build
  configuration or deployment configuration;
- no modification of any existing receipt;
- no merge of the resulting PR.

The owner additionally and explicitly authorized **one product-scope amendment**:
narrowing the MVP non-goal that excluded "student devices/buzzers". That
narrowing is recorded transparently, not silently applied — see below.

## Files changed

| File | Change |
| --- | --- |
| `docs/decisions/ROADMAP-AMENDMENT-001-local-buzzers.md` | **new** — the 20-section amendment decision document |
| `docs/receipts/2026-07-26-roadmap-amendment-001-local-buzzers.md` | **new** — this receipt |
| `docs/PROJECT.md` | MVP non-goal narrowed (owner-authorized), with rationale; local buzzers added to approved product decisions; a stale "As of Slice 5" parenthetical corrected to Slice 6 |
| `docs/plans/MVP-ARC.md` | 11-slice table → 18-slice table; amendment banner; per-slice records for slices 7–18; "What remains for Slice 7" re-pointed; round-engine note now requires the media contract first |
| `docs/handoff/CURRENT.md` | amendment banner; nine open owner gates recorded under "Open questions"; next action; prohibited-actions list updated so planned ≠ authorized; persistence slice renumbered |
| `docs/STATUS.md` | next slice + amended-roadmap header; amendment recorded in the slice blockquote; next safe action |
| `docs/decisions/README.md` | a third decision category — roadmap amendments — with the naming convention and this amendment indexed |

**Deliberately NOT changed:**

- `README.md` — its only relevant statement ("There are still no timers, buzzers,
  wagers, media, themes, or durable persistence") remains **factually true**, and
  it already defers roadmap detail to `STATUS.md` and `MVP-ARC.md`. Editing it
  would be cosmetic.
- `docs/architecture/GAME-ENGINE-BOUNDARIES.md` — §12's "student buzzers" entry is
  a historical statement about *Slice 1's* deferrals and is accurate as written.
  §9's media invariant is unchanged; the finding that Slice 5 already violates it
  is recorded in the amendment (§4.4) and the §9 **status line** belongs to the
  Media Contract slice, following the established pattern where each slice adds
  its own "Status (Slice N)" note.
- `docs/architecture/ADR-00*.md` — no architectural decision was reversed. The
  binding ADRs for timing/arming and for the input adapter are to be written **in
  the slices that implement them**, matching how ADR-005 and ADR-006 were written
  alongside their slices rather than ahead of them.
- All `src/`, `tests/`, `.github/`, `public/`, package, dependency and build
  files.

## Evidence inspected

Read directly in this slice at `64000ab`:

- **Command/event core:** `src/state/commands.ts` (the determinism note;
  `CommandBase.issuedAt`), `src/state/events.ts` (`EventBase.seq`/`occurredAt`,
  the 15 `EVENT_TYPES`), `src/state/reducer.ts` (`const at = command.issuedAt`).
- **Where the clock actually lives:** `src/host/FoundationControls.tsx`,
  `src/host/CategoryBoardHostPanel.tsx`, `src/host/TeamScoringPanel.tsx`,
  `src/host/GameImportPanel.tsx` — `Date.now()` appears only at dispatch sites.
- **Public projection and sync:** `src/state/publicState.ts` (wire version 4, the
  `PublicState` snapshot shape), `src/sync/protocol.ts`,
  `src/sync/receiver.ts` (the strictly-newer revision guard).
- **Prompt typing:** `src/game/categoryBoard/schema.ts`,
  `src/game/categoryBoard/definition.ts`, `src/state/publicState.ts` — `prompt`
  and `answer` are bare `string`s in all three layers.
- **Schema versioning:** `src/import/canonicalFormat.ts`,
  `src/import/schemas.ts`, `docs/architecture/ADR-004-canonical-validation-import.md`.
- **Architecture and governance:** `docs/architecture/GAME-ENGINE-BOUNDARIES.md`
  (§4, §5, §6, §7, §9, §12, §13), ADR-002 through ADR-006,
  `docs/decisions/README.md`, `docs/receipts/README.md`, `docs/PROJECT.md`.
- **Status and plan:** `docs/STATUS.md`, `docs/handoff/CURRENT.md`,
  `docs/plans/MVP-ARC.md`.
- **Merge and status truth:** `git` history, `origin/main`, and the GitHub API for
  PR #12.
- **Feature-absence check:** `grep` for `timer`/`buzzer`/`gamepad` across `src/`
  and `tests/` — **every** occurrence is a *negative assertion* in a guard test
  (e.g. `src/state/categoryBoardReducer.test.ts:518`,
  `src/host/TeamScoringPanel.test.tsx:532`). No implementation exists.

### Non-claim — the public precedent review

> **The public precedent review was not locatable in this repository, its
> history, its issues, or its pull requests, and was not inspected in this
> slice. Roadmap decisions were made from the owner's supplied direction and
> repository-native architecture and dependency analysis.**

No factual finding in the amendment or in this receipt is attributed to that
review. Search coverage, recorded for audit: the full `origin/main` file tree;
`git grep` across `git rev-list --all`; `git log --diff-filter=A` by filename;
all remote branches; GitHub Issues (0 total); all 12 PR bodies (0 matches for
"precedent"); and `docs/` plus `README.md`. GitHub Discussions could **not** be
checked — the connected GitHub tooling exposes no discussions surface. Per the
owner's instruction, searching stopped there.

## Decisions made

Full text and rationale in the amendment. Summary:

| # | Decision | Class |
| --- | --- | --- |
| 1 | Slice 7 **remains next**, renamed to "Timers, arming & transitions" and re-scoped so its interrupt seam is buzz-aware | Decided |
| 2 | A contract-only slice was **rejected** — this repo builds a seam with its first consumer (ADR-003, ADR-006 precedent) | Rejected |
| 3 | The clock stays at the dispatch edge; only **facts** are durable, never a running remaining-time value | Decided (architecture-forced) |
| 4 | Public timing is projected as an **absolute deadline + arming state**; the sync channel must not become a tick transport | Decided (architecture-forced) |
| 5 | Buzzers **do not depend on timers** — order comes from `seq`, arrival evidence from `occurredAt`; the dependency runs the other way | Decided |
| 6 | Local buzzers split into **three** bounded slices: 8 contract + keyboard, 9 generic Gamepad, 10 Sony Buzz! mapping/UX | Decided |
| 7 | A formal **input-adapter interface + registry** is introduced in Slice 8, modelled on ADR-003 (application-only registration, no code execution from content, fail-closed) | Decided |
| 8 | Raw device data, button indices, mappings and diagnostics stay **host-private**; only a mapped logical team input crosses into the command layer | Decided |
| 9 | Eight buzz behaviours are **architecture-forced** and decided; six are product policy and **deferred** as `OG-1`…`OG-6` | Mixed |
| 10 | The owner's candidate default policy is **recorded as recommended, not authorized**, for `OG-1`–`OG-3` | Recommended |
| 11 | **Media contract pulled earlier** (slice 11) and required before any new round type; not required before timers or buzzers; required before export | Decided |
| 12 | Media is **additive on `schemaVersion: 1`** (ADR-006 precedent); unsupported media **fails closed**; timer/media coupling deferred | Decided |
| 13 | **Portable export/import (12) precedes persistence (13)**; round-trip equality is an acceptance criterion | Decided |
| 14 | **No migration-framework slice** — the seam already exists; a seven-point migration **policy** must be accepted before any v2 work | Decided |
| 15 | Persistence separates **saved definitions from active session state**; local and offline only | Decided |
| 16 | Reporting is last and split; **raw-score leaderboards rejected as a default**; normalized metrics preferred; cross-session needs a stable competitive-profile identifier; team/class-focused only | Decided / Rejected |
| 17 | All ten explicit exclusions confirmed, with the single owner-authorized narrowing for host-attached USB | Decided |

## Roadmap: before and after

**Before (11 slices).** 1 Foundation · 2 State & event core · 3 Game & round model
+ registry · 4 Validation & import · 5 Category-board round · 6 Teams & scoring ·
7 Timers & transitions · 8 Persistence & recovery · 9 Final-wager round ·
10 Media & theme boundaries · 11 Authoring & packs.

**After (18 slices).** 1–6 **unchanged and `Complete`**, then:

| # | Slice | Origin |
| --- | --- | --- |
| 7 | Timers, arming & transitions | renamed + re-scoped from old 7 |
| 8 | Local input contract & keyboard buzz-in | new |
| 9 | Generic Gamepad adapter | new |
| 10 | Sony Buzz! mapping, validation & host setup UX | new |
| 11 | Media contract | moved earlier; decomposed from old 10 |
| 12 | Portable export & round-trip import | new; extracted from old 11 |
| 13 | Local persistence & recovery | was 8 |
| 14 | Final-wager round | was 9; now follows the media contract |
| 15 | Session summary & compatible-profile reporting | new |
| 16 | Theme engine | decomposed from old 10 |
| 17 | Authoring & packs | was 11, reduced |
| 18 | Release readiness | new |

The growth from 11 to 18 is **decomposition plus one owner-authorized new
capability** (local buzzers), not general scope growth.

## Product-scope amendment recorded

`docs/PROJECT.md`'s "Major non-goals (MVP)" previously excluded "**no student
devices/buzzers**". Owner-authorized narrowing: *student-owned devices and
student phones stay fully excluded*; **local host-attached USB buzzer
controllers become an approved future capability**, with Sony Buzz! as the
preferred initial validation target and the product remaining fully usable with
no buzzer hardware. Networked buzzers, server-backed lockout, WebRTC, required
Bluetooth, cloud dependency and Wi-Fi dependency remain excluded.

The clause was **narrowed in place with a visible amendment note**, not deleted.
Amendment §15 records the previous wording, the replacement, why host-attached
USB preserves the original privacy/offline/simplicity intent, and which buzzer
architectures remain rejected.

## Explicit non-implementation statement

**No runtime behaviour changed in this slice.** The final diff contains **no**
changes under `src/`, `tests/`, `.github/`, `public/`, and none to
`package.json`, `package-lock.json`, any dependency manifest, `vite.config.ts`,
`vitest.config.ts`, `playwright.config.ts`, `tsconfig*.json` or
`eslint.config.js`. Every changed path is Markdown. No slice was started, no
buzzer or timer code exists, and no hardware has been tested.

Being **planned** in the roadmap is explicitly **not** authorization to
implement: `docs/handoff/CURRENT.md` now says so for slices 8–10.

## Verification performed

Run on this branch:

| Command | Result | Notes |
| --- | --- | --- |
| `npm ci` | pass | reproducible install; **no dependency changes** |
| `npm run lint` | pass | ESLint flat config, no warnings |
| `npm run typecheck` | pass | `tsc -b --noEmit` |
| `npm run test:run` | pass | **740 tests, 35 files** — unchanged from Slice 6 |
| `npm run build` | pass | `tsc -b && vite build`; PWA precache 16 entries |
| `npm run test:e2e` | pass | **154 passed / 2 skipped**, 3 viewport projects |
| `npm run verify:all` | pass | the whole chain, run again end to end |
| `git diff --check` | pass | no whitespace errors |

The **2 e2e skips are pre-existing and intentional**: both are the same test
(`tests/e2e/pwa-offline.spec.ts` → "host and display shells load offline after
first visit"), guarded to run once on the desktop project, so it reports skipped
on `projector-720p` and `mobile-host`. **No test was skipped because it failed,
and no test was changed by this slice.**

Playwright required
`PLAYWRIGHT_CHROMIUM_PATH=/opt/pw-browsers/chromium-1194/chrome-linux/chrome`
because this sandbox's pre-provisioned Chromium is build 1194 while
`@playwright/test@1.56` expects 1228. Supplied **via the environment only**; no
machine-specific path is committed.

Since this slice changes no code, an unchanged test count is the expected — and
verified — result.

## Receipt immutability

- **Before this slice:** 13 files under `docs/receipts/` (12 receipts +
  `README.md`), hashed with SHA-256 before any edit.
- **After:** 14 files — the same 13, **byte-for-byte unchanged**, plus this one.
- Re-hashing after the edits produced identical digests for all 13 pre-existing
  files; the diff between the two hash manifests is a single added line.

No pre-existing receipt was amended. Where an older receipt describes the roadmap
as having 11 slices, that statement was true when recorded and is left intact;
the amendment's §19 lists it as superseded rather than rewriting it.

## Limitations

- **The public precedent review was not available and was not inspected** (see
  the non-claim above). If it contains findings that contradict these decisions,
  the amendment needs revisiting.
- **No hardware was tested.** Sony Buzz! is a preferred target, not a validated
  compatibility claim. Nothing here implies a supported-device list.
- **No live-site verification.** The sandbox network policy denies
  `ricktron.github.io` (HTTP 403 on CONNECT). This slice changes no deployed
  behaviour, so nothing about the live site is asserted either way.
- **The timer public-projection drift question is identified, not solved.** Host
  and display clocks are not synchronized; Slice 7 must bound this or project a
  duration-from-receipt instead. Recorded as a risk in amendment §18.
- **Browser gamepad detection is unreliable by nature** (user-gesture gating,
  per-browser/OS variation, multi-controller single-device reporting for Sony
  Buzz! sets). Slices 9–10 must treat detection as untrustworthy. A real
  integration risk, not a formality.
- **No ADR was written for the timing or input boundaries.** Deliberate: ADRs in
  this repository are written by the slice that implements the decision. The
  architectural *constraints* are binding from the amendment; the ADRs are owed by
  Slices 7 and 8.

## Deferred decisions

Nine owner gates, opened by amendment §16:

| Gate | Question | Blocks |
| --- | --- | --- |
| `OG-1` | Manual vs. automatic arming | Slice 8 start |
| `OG-2` | First-only lockout vs. full ordered queue | Slice 8 start |
| `OG-3` | Promotion after an incorrect response or host pass | Slice 8 start |
| `OG-4` | Tie handling on identical arrival stamps | During slice 8 |
| `OG-5` | Tile/queue lifetime; whether queues survive transitions | During slice 8 |
| `OG-6` | Whether scoring is restricted to the active respondent | During slice 8 |
| `OG-7` | Whether reporting may ever carry individual student identity | Slice 15 scope |
| `OG-8` | Timer pause/resume semantics | Optional in slice 7 |
| `OG-9` | Timer/media playback coordination | Slice 11 or later |

**Slice 7 has no open gates.**

## Next safe action

**Review and merge the roadmap amendment PR.** It is documentation-only.

After it merges, the next implementation slice is **Slice 7 — Timers, arming &
transitions**, which needs only owner authorization to begin. Slices 8–10 need
`OG-1`, `OG-2` and `OG-3` answered first.

This amendment **recommends** Slice 7; it does not authorize or begin it.
