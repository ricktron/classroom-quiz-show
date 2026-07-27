# Slice 9 — generic Gamepad adapter & configurable mappings: post-merge reconciliation

## Identity

- **Reconciliation:** `CQS-S09-POST-MERGE-RECONCILIATION`
- **Date:** 2026-07-27
- **Authorization:** owner-authorized **documentation-only** reconciliation slice.
  It reconciles canonical repository status with the merged Slice 9
  implementation. **No implementation work of any kind is authorized or
  performed.**
- **Repository:** `ricktron/classroom-quiz-show` (verified: `git remote -v` and
  the GitHub API both resolve to this repository)
- **Branch:** `docs/slice-9-post-merge-reconciliation`
- **Base commit:** `d16f90de94bcbed9a83dfed5e7259a9da5e6a618` (current
  `origin/main`, itself the merge commit of PR #19)
- **PR for this reconciliation:** **open and unmerged** at the time of writing.
- **Environment:** local sandbox (Linux 6.18.5, Node v22.22.2, npm 10.9.7)

Every fact below was **verified directly** against Git and the GitHub API in this
session. The supplied report was treated as claims, not evidence.

## Preflight

| Check | Result |
| --- | --- |
| Repository root | `/home/user/classroom-quiz-show` |
| Remote identity | `ricktron/classroom-quiz-show` |
| Branch at session start | `claude/slice-9-post-merge-reconciliation-felk2q` |
| HEAD at session start | `d16f90de94bcbed9a83dfed5e7259a9da5e6a618` |
| Worktree clean before editing | yes (`git status --porcelain` empty) |
| `origin/main` after fetch | `d16f90de94bcbed9a83dfed5e7259a9da5e6a618` |
| Repository default branch | **`main`** (PR #19 `base.ref`; the only branch this session resolves against) |
| PR #19 | **merged** |

## PR #19 — verified merge evidence

| Fact | Verified value | How |
| --- | --- | --- |
| State | `closed`, `merged: true` | GitHub API `pulls/19` |
| Merge commit | `d16f90de94bcbed9a83dfed5e7259a9da5e6a618` | API `merge_commit`/`git log origin/main` |
| Merge timestamp | **2026-07-27T05:33:05Z** on the commit; API `merged_at` **2026-07-27T05:33:06Z** | `git show -s` gives `2026-07-26T21:33:05-08:00` (the same instant as 05:33:05Z); GitHub records the merge *event* one second later |
| Merged by | `ricktron` | API `merged_by` |
| Merge actor on the commit | author `Rick Garnett <38998553+ricktron@users.noreply.github.com>`, committer `GitHub <noreply@github.com>` | `git show -s` |
| Base at merge | `5cc81d448f9558e914dd5da497232f071d58b10c` | API `base.sha` |
| Final reviewed head | `f63d5c190d7747f3a48a3e91a1358868229a170a` | API `head.sha` — the **full SHA** resolved directly for the reported short `f63d5c1` |
| Head branch | `claude/slice-9-gamepad-adapter-wfiue4` | API `head.ref` |
| Commits in the PR | 1 | API `commits`; `git log 5cc81d4..f63d5c19` returns exactly one |
| Files changed | 29 (+6,298 / −103) | API; `git diff --name-only 5cc81d4 f63d5c19 \| wc -l` → 29 |

All supplied values (implementation branch, reviewed head, merge commit, previous
main, merge parents) match what was observed. The one discrepancy worth naming is
benign: the supplied merge timestamp `2026-07-27T05:33:05Z` is the **commit**
timestamp; the API's `merged_at` is `2026-07-27T05:33:06Z`. Both are recorded
above rather than reconciled away.

### Merge strategy and parent evidence

`d16f90d` has **two parents**, so it is a true **merge commit** — not a squash and
not a rebase:

```
parents: 5cc81d448f9558e914dd5da497232f071d58b10c   (first  — previous main)
         f63d5c190d7747f3a48a3e91a1358868229a170a   (second — the reviewed head)
```

**The second parent IS the final reviewed head**, exactly. The head that was
reviewed is the head that merged; nothing was rewritten, amended or re-created in
between.

### Reviewed-head ancestry — proven three independent ways

1. `git merge-base --is-ancestor f63d5c19 d16f90d` **succeeds**.
2. `git merge-base --is-ancestor f63d5c19 origin/main` **succeeds**.
3. The merge commit's tree and the reviewed head's tree are the **same object** —
   both `e4a9d06bd3d0f74601a802a9088d616b32c17a98` — and
   `git diff f63d5c19 d16f90d` is **empty**. The merge introduced no content of
   its own; `main` carries the reviewed tree byte-for-byte.

### Commits actually included

`git log 5cc81d4..f63d5c19` returns exactly one commit and no others:

| Commit | Subject |
| --- | --- |
| `f63d5c190d7747f3a48a3e91a1358868229a170a` | Slice 9: generic Gamepad adapter & configurable mappings |

### Files included

29 files — **17 added, 12 modified**:

- **8 documentation:** `README.md`, `docs/STATUS.md`,
  `docs/architecture/ADR-009-generic-gamepad-adapter.md` (new),
  `docs/architecture/GAME-ENGINE-BOUNDARIES.md`, `docs/decisions/README.md`,
  `docs/handoff/CURRENT.md`, `docs/plans/MVP-ARC.md`,
  `docs/receipts/2026-07-27-slice-9-local-verification.md` (new).
- **10 runtime** under `src/host/` and `src/input/`.
- **11 test/fixture** files under `src/`, `src/test/` and `tests/e2e/`.

**No package, lockfile, workflow, schema, fixture-format or configuration file is
in the set** — `git diff --name-only 5cc81d4 origin/main -- src/state src/sync
src/schema src/game src/display public .github scripts package.json
package-lock.json '*.config.ts' 'tsconfig*.json' eslint.config.js` is **empty**.

## Checks observed at the final PR head (`f63d5c1`)

All three, **directly observed** via the PR's check runs:

| Check | Conclusion | Completed |
| --- | --- | --- |
| Lint, typecheck, unit tests, build | **success** | 2026-07-27T05:00:21Z |
| Playwright e2e | **success** | 2026-07-27T05:02:32Z |
| SonarCloud Code Analysis | **success** | 2026-07-27T05:00:14Z |

The Sonar **dashboard itself was not inspected** — `sonarcloud.io` is unreachable
from this sandbox. **The check-run conclusion is the only Sonar claim made here.**

## Review comments — classified

Two comments, **zero reviews**, **zero review threads** (API `get_reviews` and
`get_review_comments` both return empty). Neither comment is an actionable review
finding:

| Comment | Author | Classification |
| --- | --- | --- |
| "Bugbot is not enabled for your account…" | `cursor[bot]` | **Upsell / informational.** No review was performed. Nothing to act on. |
| "Quality Gate passed" summary | `sonarqubecloud[bot]` | **Passing check summary.** Recorded verbatim: gate **passed**, 0 security hotspots, 0.0% duplication on new code; it also reports **3 new issues** and 0.0% coverage on new code as measured by Sonar. The check run concluded `success`. The linked issue list was not reachable from this sandbox, so the three issues were **not** inspected and are neither dismissed nor characterized here. |

**No human review was submitted, and no actionable review finding exists.**

## Post-merge CI on `main` — observed directly

Distinct from the pre-merge PR checks, and **not** a restatement of them.

**Workflow `CI`, run `30240064570`, head `d16f90d`, event `push`, branch `main` —
conclusion `success`** (05:33:09Z → 05:36:46Z).

## GitHub Pages deployment — observed directly

**Workflow `Deploy to GitHub Pages`, run `30240064595`, head `d16f90d`, event
`push`, branch `main` — conclusion `success`** (05:33:09Z → 05:33:48Z).

Slice 9 changed no CI or deploy configuration.

## Live-route verification — explicitly NOT claimed

**The Pages deployment succeeded. Manual live-route verification was not
performed.**

- `https://ricktron.github.io/classroom-quiz-show/` was **not loaded** — the
  sandbox network policy denies the host.
- What was observed is the **deployment workflow's conclusion**, above. A
  successful deploy job is not evidence that the live routes render, that the
  service worker updated, or that a buzz registers on a real classroom machine.
- **No claim whatsoever is made about live application behaviour.**

## Verified Slice 9 architecture — read from merged source on `origin/main`

Each row was checked against the code on `origin/main`, not against the PR
description.

| Expected fact | Verified | Evidence on `origin/main` |
| --- | --- | --- |
| `gamepad` added to the existing bounded local-input source union | **yes** | `src/input/localInput.ts:63` — `LOCAL_INPUT_SOURCE_KINDS = ['keyboard', 'gamepad']`, a frozen `as const` tuple with a `Set`-backed guard |
| No dynamic adapter registry or plugin framework | **yes** | the union above is the whole registration mechanism; no dynamic lookup, no content-controlled registration, no dynamic import |
| Direct Gamepad API access confined to one source boundary | **yes** | `src/input/gamepadSource.ts` is the **only** runtime file that calls `getGamepads` (`:240`, `:244`, `:260`); the sole other runtime mention, `src/host/useGamepadBuzzInput.ts:44`, is a comment stating it never reads the API |
| Browser-owned mutable Gamepad objects do not cross the boundary | **yes** | no `Gamepad`/`GamepadButton` type appears in runtime source outside `gamepadSource.ts`; the four remaining hits repository-wide are prose comments |
| Frozen data-only controller/button snapshots | **yes** | `gamepadSource.ts:172–182` — `Object.freeze` on each `pressed[]`, each controller, the controller array and the snapshot; `EMPTY_GAMEPAD_SNAPSHOT` frozen at `:109` |
| One host-only polling lifecycle owner | **yes** | `src/host/useGamepadBuzzInput.ts` — a single `useEffect` (`:264`) guarded by `if (stop.current !== null) return` (`:268`), so **a second registration is refused rather than stacked** |
| Polling cleanup on unmount | **yes** | `:341–343` — the effect's cleanup calls `stop.current?.()` and nulls it; the production scheduler's own stop calls `cancelAnimationFrame` (`:152`) |
| No display polling | **yes** | `grep` over `src/display/` returns **zero** runtime references to `gamepad`, `getGamepads` or the hook. The hook's only consumer is `src/host/FoundationControls.tsx:299`, a host component |
| No reducer / replay / sanitizer / render / command-planning polling | **yes** | `src/state/*`, `src/sync/*`, `src/game/*` are byte-identical to pre-merge `main` (blob-hash comparison below), so none of them can poll |
| Injectable source and scheduler seams | **yes** | `UseGamepadBuzzInputOptions` exposes `source`, `scheduler` and `clock` (`:158–189`); `GamepadPollScheduler` is an interface (`:121`) with `animationFramePollScheduler()` as the production default |
| Rising-edge detection | **yes** | `src/input/gamepadAdapter.ts:114–139` — a pure function comparing previous vs current pressed state; only a `false → true` transition pushes an edge |
| Held buttons do not repeat | **yes** | same comparison: `pressed → pressed` produces nothing; documented in the truth table at `:37–43` |
| First observation is baseline only | **yes** | `:127` — `if (previous === null) continue`, and a controller absent from `previous` yields a baseline with no edges (`:100`) |
| Re-prime behavior | **yes** | `previous === null` is the single documented re-prime path (`:94`), used for enable, disable, mapping change, capture start/end, `gamepadconnected`, `gamepaddisconnected`, `visibilitychange`, `focus`, `blur` and any failed read — **one rule, one implementation** |
| Connect / disconnect cannot fabricate a buzz | **yes** | `:100` (new controller → baseline only) and `:108–111` (vanished controller → dropped from baseline, no edge). A button-count change re-baselines rather than comparing differently-shaped lists (`:105`) |
| Deterministic simultaneous-edge ordering | **yes** | `:58–59`, `:120–122` — ascending controller index, then ascending button index, achieved structurally by iteration order (no sort needed) |
| Event-log `seq` remains accepted-order authority | **yes** | `src/game/timing/buzzQueue.ts` is **byte-identical** to pre-merge `main`; the ordering rule above is documented as a tie-break, not a fairness or reaction-time claim |
| Generic controller/button/team/action mappings | **yes** | `src/input/gamepadMapping.ts` — a binding is `{ controllerIndex, buttonIndex, teamId, action }`; `:27` records that no vendor id, product id, colour, handset number or device model is expressible |
| No default button assignments | **yes** | no default mapping or generated profile exists in `gamepadMapping.ts` |
| Structured mapping validation, no silent repair or overwrite | **yes** | seven typed issue codes at `:93–99` (`malformed-controller-index`, `malformed-button-index`, `duplicate-control`, `unknown-team`, `duplicate-team-primary`, `malformed-action`, `too-many-bindings`), each raised against its binding index |
| Mappings remain session-local | **yes** | **zero** `localStorage` / `IndexedDB` / `sessionStorage` references in any Gamepad module; the only match is the comment at `gamepadMapping.ts:35` stating there is no such key |
| Controller indices are not treated as durable identity | **yes** | nothing persists an index; `gamepadMapping.ts` documents it as a session-local locator |
| Buttons only | **yes** | the snapshot carries `pressed[]` only — no axes, sticks, analog value, motion or haptics anywhere |
| Keyboard fallback preserved | **yes** | the keyboard adapter and `commandTranslation.ts` are byte-identical to pre-merge `main`; the no-controller copy is host-side only |
| Secondary actions remain inert | **yes** | `src/input/commandTranslation.ts:77` still returns `{ status: 'rejected', reason: 'unsupported-action' }` for every secondary slot — in a file **unchanged by Slice 9** |
| No Sony-specific runtime | **yes** | every `sony` / `playstation` / `buzz!` / `handset` / `vendor` hit under `src/` outside tests is a **prose comment**; no runtime symbol, branch, string or UI copy |
| No WebHID or Bluetooth runtime | **yes** | `webhid`, `navigator.hid`, `requestDevice`, `navigator.usb`, `bluetooth`, `vendorId`, `productId` appear **only** in negative test assertions and comments |
| No physical-controller validation | **yes** | see below — unchanged and still unclaimed |

## Unchanged command / event / reducer / public / protocol boundaries — proven by blob hash

Each file's Git blob object at pre-merge `main` (`5cc81d4`) and at `origin/main`
(`d16f90d`) is the **same object**, which is byte-for-byte identity:

| File | Result |
| --- | --- |
| `src/state/commands.ts` | **identical** |
| `src/state/events.ts` | **identical** |
| `src/state/reducer.ts` | **identical** |
| `src/state/publicState.ts` | **identical** |
| `src/state/sanitize.ts` | **identical** |
| `src/game/timing/buzzQueue.ts` | **identical** |
| `src/input/commandTranslation.ts` | **identical** |
| `src/import/canonicalFormat.ts` (game-file schema) | **identical** |

Version constants on `origin/main`, unchanged by Slice 9:

- `PUBLIC_STATE_SCHEMA_VERSION = 6` (`src/state/publicState.ts:34`)
- `SYNC_SCHEMA_VERSION = 2` (`src/sync/protocol.ts:31`)
- `SUPPORTED_SCHEMA_VERSION = 1` (`src/import/canonicalFormat.ts:61`)

`src/sync/` and `src/state/` show **no diff at all** between `5cc81d4` and
`origin/main`. Queue semantics, timer-interruption semantics and scoring
therefore cannot have changed: the files that define them were not touched.

## Browser limitations carried forward

- A browser controller index is **not stable** across a reload, browser restart,
  disconnect/reconnect, USB port change, or OS/browser version, and is never
  persisted.
- **Most browsers do not expose a controller until a button on it is pressed**, so
  a freshly plugged-in controller can legitimately read as "None detected" until
  touched.
- Gamepad mappings are **lost on host reload** — deliberate, and stated in the
  host panel.
- Sub-frame ordering is not resolvable; **no fairness or reaction-time claim** is
  made.
- Primary browser documentation could not be fetched during implementation (the
  sandbox denies `developer.mozilla.org` and `w3c.github.io`); ADR-009 §Context
  records the two locally-available primary sources used instead.

## Physical-hardware validation status

> ⚠️ **No physical controller has been tested, and none was tested by this
> reconciliation.** No new owner-provided hardware evidence exists. No claim is
> made that any specific device works; there is **no supported-hardware list**.
> Physical behaviour is proved only by deterministic unit tests against a fake
> Gamepad source, and the browser tests cover the **no-controller** path only.
> **Physical hardware validation remains Slice 10.**

## Stale canonical statements found, and corrected

| File | Was | Now |
| --- | --- | --- |
| `README.md` | "Slice 9 … **In review** — on `claude/slice-9-gamepad-adapter-wfiue4`, not merged" | "**Complete** — merged via PR #19 (`d16f90d`)" with actor, reviewed head, second-parent proof, PR checks, post-merge CI, Pages, live-route non-claim |
| `README.md` | no hardware non-claim on the Slice 9 summary | explicit "no physical controller has been tested" callout, with hardware validation named as Slice 10 |
| `docs/STATUS.md` | header "**Slice state:** **In review** … **open and unmerged**" | "**Complete**" with merge commit, timestamp, actor and reviewed head |
| `docs/STATUS.md` | "**Slice 9 is now `In review`** — … open and unmerged" | full merge record: merge commit, timestamp, actor, second-parent proof, PR checks, post-merge CI run, Pages run, live-route non-claim, both receipts linked |
| `docs/STATUS.md` | heading "## Slice 9 work (In review — open, unmerged)" | "## Slice 9 work (Complete)" + merge/receipt pointer |
| `docs/STATUS.md` | "**PR CI for Slice 9: not yet observed.** The pull request is open and unmerged" | the three observed check conclusions, the observed post-merge CI run, the observed Pages run, and the explicit live-route non-claim |
| `docs/STATUS.md` | Next safe action: "**Review the Slice 9 pull request** … It is open and unmerged" | "Review and merge the Slice 9 post-merge reconciliation PR" |
| `docs/STATUS.md` | deferred-direction pointer named response modes only | now also points at the deferred **buzz-sound** direction, with an explicit "no audio exists" statement |
| `docs/handoff/CURRENT.md` | "**Slices 1–8 all `Complete`** … Slice 9 … `In review` … **open and unmerged**" | "**Slices 1–9 all `Complete` and merged to `main`**" with PR #19 and `d16f90d` |
| `docs/handoff/CURRENT.md` | "**Slice 9 (current): `In review`.** … no CI conclusion is claimed … NOT `Complete`" | "`Complete`" with the full merge record, tree-identity ancestry proof, CI, Pages, live-route non-claim, hardware non-claim, both receipts linked |
| `docs/handoff/CURRENT.md` | "**Slice 9 PR CI has NOT been observed** — the pull request is open and unmerged" | observed green PR checks, observed post-merge CI and Pages runs, live-route and hardware non-claims retained |
| `docs/handoff/CURRENT.md` | Next action: "**Review the Slice 9 pull request** … open and unmerged" | "Review and merge the Slice 9 post-merge reconciliation PR" |
| `docs/handoff/CURRENT.md` | slice-allocation table row 9 "**`In review`** — implemented, open and unmerged" | "`Complete` (PR #19, `d16f90d`)" |
| `docs/handoff/CURRENT.md` | prohibitions opened with "merge the Slice 9 PR yourself; mark Slice 9 `Complete` before it is actually merged; perform a Slice 9 post-merge reconciliation before the PR is actually merged" — all now spent | prohibitions retargeted at the live risks: merging **this** PR, amending receipts, claiming live-route behaviour, claiming hardware compatibility; **audio prohibitions added** |
| `docs/plans/MVP-ARC.md` | slice table row 9 "**(In review — implemented, open and unmerged…)**" | "**(Complete — merged via PR #19 (`d16f90d`) … No physical controller was tested.)**" |
| `docs/plans/MVP-ARC.md` | "Nothing: Slice 9 is **implemented and `In review`** (owner-authorized, open and unmerged)" | "**`Complete`**" with merge commit, timestamp and actor |
| `docs/plans/MVP-ARC.md` | Slice 9 record "**Status:** **`In review`** … Not `Complete`" | "`Complete`" with merge evidence, second-parent proof, CI, Pages, live-route non-claim, hardware non-claim, this receipt linked |

### Surfaces checked and deliberately left unchanged

- `docs/architecture/ADR-009-generic-gamepad-adapter.md` — status already reads
  `Accepted (Slice 9)`; **not stale**.
- `docs/decisions/README.md` — the ADR index already lists ADR-009 with an
  accurate summary and makes no merge-state claim; **not stale**.
- `docs/architecture/GAME-ENGINE-BOUNDARIES.md` — its "Status (Slice 9)"
  paragraphs already describe Slice 9 as implemented, not pending; **not stale**.
- `docs/PROJECT.md` — makes no Slice 9 merge-state claim; **not stale**.
- `ROADMAP-AMENDMENT-001` and its receipt — **untouched**.

Historical statements that were accurate when written were **not** rewritten —
including the Slice 9 implementation receipt, which correctly describes the PR as
open and unmerged at the moment it was taken. This receipt supersedes its
provisional merge-state statements **without touching them**.

## Canonical files updated

| File | Change |
| --- | --- |
| `README.md` | Slice 9 marked Complete with merge evidence; hardware non-claim added |
| `docs/STATUS.md` | header, state paragraph, section heading, verification section, next safe action, deferred-direction pointer |
| `docs/handoff/CURRENT.md` | headline, Slice 9 entry, latest-results block, next action, allocation table, prohibitions, **new deferred buzz-sound owner direction** |
| `docs/plans/MVP-ARC.md` | slice table row 9, "what remains" paragraph, Slice 9 status record |
| `docs/receipts/2026-07-27-slice-9-post-merge-reconciliation.md` | **this file (new)** |

Five files, all documentation.

## Deferred buzz-sound owner direction — recorded

Recorded concisely in `docs/handoff/CURRENT.md` (the established handoff surface
for owner direction; the repository has **no** separate backlog or deferred-ideas
document, and none was created), and summarized here. **Recorded only — recording
it authorizes no work.** It was **not** added as a new active MVP slice.

The owner wants **optional team buzz-in audio cues**, potentially including
farm-animal sounds, funny voices, generic game-show sounds, comic or funny sound
packs, custom local audio uploads, one sound per team, randomized selection from a
chosen pack, and preview, volume and mute controls.

Architectural direction for whenever it is authorized:

- sound is a **presentation response to a newly accepted `TEAM_BUZZED` event**;
- sound must **not** become gameplay authority;
- sound must not alter scoring, queue order, replay, undo, timers, controller
  mappings or the reducer;
- sound assignment belongs to a **team or presentation profile** — never to a
  physical keyboard key, controller index, handset, button index or device model;
- **visual indication remains required**, so sound is never the only indication of
  a successful buzz;
- stale snapshots, replay, refresh, reconnect, resynchronization or undo must not
  accidentally replay old audio;
- custom audio should remain **local and offline by default**.

### BBC / local-file licensing and distribution boundary

The owner identifies the **BBC Sound Effects library** as a preferred potential
source for personal, non-commercial classroom use. Recorded **without making any
legal determination**:

- **no BBC audio file is authorized for commitment to this public repository**;
- **no BBC audio file is authorized for inclusion in the public GitHub Pages
  build**;
- **no BBC audio file is authorized for redistribution through the application**;
- a future implementation should support **teacher-supplied local files**;
- **attribution and licence requirements must be reviewed before use**;
- broader redistribution, public bundling or commercial use requires **separately
  verified permission**.

**Nothing was implemented for this.** No BBC asset was browsed or downloaded; no
audio file, playback code, audio schema, audio event, sound-pack manifest,
custom-upload code or attribution asset was added; no roadmap slice was created;
and no implementation acceptance criteria for audio were defined.

## Slice 10 was NOT started — verified

- **Slice 10 remains `Planned`, unstarted and owner-gated.** No Sony Buzz!
  detection, vendor/product matching, button numbering, coloured-button profile,
  handset assignment, controller wizard, WebHID or Bluetooth runtime exists
  anywhere in the codebase.
- This reconciliation changed **no file under `src/`, `tests/`, `public/`,
  `.github/` or `scripts/`** (proved mechanically below).

## Roadmap: unchanged

`ROADMAP-AMENDMENT-001` and its receipt are **untouched**. The plan remains
**18 slices** in the same order — `docs/plans/MVP-ARC.md`'s slice table still has
exactly 18 numbered rows. Slices 1–9 are `Complete`; Slices 10–18 are `Planned`.
Local host-attached USB buzzers remain approved future scope; **student-owned
devices, student phones and networked buzzers remain excluded**, not merely
deferred. No slice was inserted, removed or reordered, and neither the deferred
response-mode concept nor the deferred buzz-sound concept was added to the
roadmap.

## Scope-boundary proof

Run against the staged diff before committing:

- every changed path matches `^(README\.md|docs/.*\.md)$` — **all documentation**;
- `git diff --name-only origin/main -- src tests public .github scripts` is
  **empty** — no source, no test, no public asset, no workflow changed;
- `package.json`, `package-lock.json`, every `tsconfig*.json`, `vite.config.ts`,
  `vitest.config.ts`, `playwright.config.ts` and `eslint.config.js` are
  **unchanged**;
- no schema, fixture, build artifact or dependency changed;
- **no audio file of any kind was added**; no BBC asset was downloaded or
  committed; **no audio runtime, schema, event or manifest was added**;
- **no Slice 10 runtime, no Sony-specific runtime and no WebHID/Bluetooth runtime
  exists**;
- no file under `docs/receipts/` changed except the addition of this one;
- the MVP roadmap table still has exactly **18 slice rows**, in the same order.

## Receipt immutability

A SHA-256 manifest of every file under `docs/receipts/` was taken **before** any
edit and again **after**. The only difference is the addition of this file; all
**19 pre-existing files are byte-for-byte unchanged**, including
`2026-07-27-slice-9-local-verification.md` (the Slice 9 implementation receipt,
**specifically re-verified** at
`1007d3e02055353e4f51a85e1d82b15450512a0064660bfc6abd8e0b670fc94a`) and
`2026-07-26-roadmap-amendment-001-local-buzzers.md`.
`git status --porcelain docs/receipts/` reported no modification to any existing
file.

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
| `4ed2f1e81902ec991f520c394fa4247d39439644106ded78d0980e47a608e88f` | `2026-07-26-slice-7-local-verification.md` |
| `71ae049b49b127bd5b38c031ab66b26ecfd4c440b8a64a2c20de7549bec4d158` | `2026-07-27-slice-7-post-merge-reconciliation.md` |
| `4f985e683485398d343693567d9cda56b66e4a1cf86d8978e171047d206db37f` | `2026-07-27-slice-8-local-verification.md` |
| `a0cbbc162100b0bb3d089f548789fd065d15d1eeccf413cf7f4ac53840fe9e72` | `2026-07-27-slice-8-post-merge-reconciliation.md` |
| `1007d3e02055353e4f51a85e1d82b15450512a0064660bfc6abd8e0b670fc94a` | `2026-07-27-slice-9-local-verification.md` |
| `5e4cd77f558cc7b18d2e351d7da6b5ea5216a958ca594bc7fcb75887a0173429` | `README.md` |

Reproduce with `sha256sum docs/receipts/*.md`.

## Verification

Following the Slice 5–8 reconciliation precedent, the **full** chain was run on
this branch rather than a reduced documentation-only set:

| Command | Result | Notes |
| --- | --- | --- |
| `npm ci` | **pass** (observed) | no dependency changes |
| `npm run lint` | **pass** (observed) | |
| `npm run typecheck` | **pass** (observed) | `tsc -b --noEmit` |
| `npm run test:run` | **pass** (observed) | **1,349 tests, 57 files** — unchanged from the merged tree |
| `npm run build` | **pass** (observed) | PWA precache **16 entries / 459.39 KiB** |
| `npm run test:e2e` | **pass** (observed) | **199 passed / 2 skipped**, 3 viewport projects |
| `npm run verify:all` | **pass** (observed) | the whole chain, re-run end to end |
| `git diff --check` | **clean** (observed) | |

Unit, build and e2e counts are identical to the merged tree, which is the expected
result for a change that touches only Markdown.

The **2 e2e skips are intentional and pre-existing**: both are the same test
(`tests/e2e/pwa-offline.spec.ts` → "host and display shells load offline after
first visit"), guarded to run once on the desktop project, so it reports skipped
on `projector-720p` and `mobile-host`. **No test is skipped because it failed, and
this reconciliation skips nothing, weakens nothing, suppresses nothing and
loosens nothing.**

### Environment override

Playwright needed
`PLAYWRIGHT_CHROMIUM_PATH=/opt/pw-browsers/chromium-1194/chrome-linux/chrome`
because this sandbox's pre-provisioned Chromium is build 1194 while
`@playwright/test@1.56` expects 1228. Supplied **via the environment only**; no
machine-specific path is committed and `playwright.config.ts` is unchanged. This
is an **environmental limitation of the sandbox**, not a repository defect — CI
installs the matching browser and needs no override.

## Limitations of this reconciliation

- **No live-site verification.** Deployment success is not route success; the
  sandbox network policy denies `ricktron.github.io`.
- **Sonar's detailed findings were not inspected** — `sonarcloud.io` is
  unreachable from this sandbox. Only the check-run conclusion is claimed. The
  three "new issues" the Sonar comment reports were **not** examined.
- **No physical controller was tested**, by Slice 9 or by this reconciliation.
- This receipt records observations made on 2026-07-27. It will **not** be amended
  after its own PR merges; a later fact belongs in a later receipt.

## PR state

**Open and unmerged.** This reconciliation PR had not been reviewed or merged when
this receipt was written, and this reconciliation does not merge it.

## Next safe action

Review and merge this reconciliation PR. After that, the next implementation slice
is **Slice 10 — Sony Buzz! mapping, validation & host setup UX**, which is
`Planned`, unstarted and **owner-gated**. Slice 9 having shipped the generic
adapter Slice 10 builds on is **not** authorization to begin it, and neither is
this reconciliation. Optional buzz-in sounds and additional response modes are
**deferred owner direction only** and authorize nothing.

Do not start Slice 10, and do not implement audio, without explicit owner
authorization.
