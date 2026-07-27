# Slice 7 — timers, arming & transitions: post-merge reconciliation

## Identity

- **Reconciliation:** `CQS-S07-POST-MERGE-RECONCILIATION`
- **Date:** 2026-07-27
- **Authorization:** owner-authorized documentation-only reconciliation slice.
  It reconciles canonical repository status with the merged Slice 7
  implementation. **No implementation work of any kind is authorized or
  performed.**
- **Repository:** `ricktron/classroom-quiz-show`
- **Branch:** `docs/slice-7-post-merge-reconciliation`
- **Base commit:** `3f9ae1c4c7f9f6e37bac08bf519dbd8ef68af42a` (current
  `origin/main`, itself the merge commit of PR #14)
- **PR for this reconciliation:** **open and unmerged** at the time of writing.
- **Environment:** local sandbox (Linux 6.18.5, Node v22.22.2, npm 10.9.7)

Every fact below was **verified directly** against Git and the GitHub API in this
session. The prior report's claims were treated as claims, not evidence.

## PR #14 — verified merge evidence

| Fact | Verified value | How |
| --- | --- | --- |
| State | `closed`, `merged: true` | GitHub API `pulls/14` |
| Merge commit | `3f9ae1c4c7f9f6e37bac08bf519dbd8ef68af42a` | API + `git log origin/main` |
| Merged at | **2026-07-26T23:43:51Z** | API `merged_at`; `git show -s` gives `2026-07-26T15:43:51-08:00`, the same instant |
| Merged by | `ricktron` | API `merged_by` |
| Merge actor on the commit | author `Rick Garnett <38998553+ricktron@users.noreply.github.com>`, committer `GitHub <noreply@github.com>` | `git show -s` |
| Base at merge | `752a3fe0f45fdc1ee687339134023c3811facd91` | API `base.sha` |
| Reviewed head | `43cc66c5fc2a01cdb46daa1b52b7df08184b0448` | API `head.sha` |
| Commits in the PR | 2 | API `commits` |
| Files changed | 58 (+6,979 / −170) | API; `git diff --name-only 752a3fe 43cc66c \| wc -l` → 58 |

### Merge strategy and parent evidence

`3f9ae1c` has **two parents**, so it is a true **merge commit** — not a squash and
not a rebase:

```
parents: 752a3fe0f45fdc1ee687339134023c3811facd91   (first  — previous main)
         43cc66c5fc2a01cdb46daa1b52b7df08184b0448   (second — the reviewed head)
```

**The second parent IS the reviewed head.** The head that was reviewed is exactly
the head that merged; nothing was rewritten, amended or re-created in between.

### Commits actually included

`git log 752a3fe..3f9ae1c` returns exactly three commits and no others:

| Commit | Committed | Subject |
| --- | --- | --- |
| `f804430` | 2026-07-26T21:20:06Z | Slice 7: timers, arming & transitions — the clock boundary |
| `43cc66c` | 2026-07-26T21:45:59Z | docs: record Slice 7 CI observed green on PR #14 |
| `3f9ae1c` | 2026-07-26T23:43:51Z | Merge pull request #14 |

Both non-merge commits are confirmed ancestors of `origin/main`
(`git merge-base --is-ancestor` succeeded for each).

## Slice 7 implementation present on `origin/main` — verified

`git ls-tree -r origin/main` confirms every Slice 7 artefact is on `main`:

```
src/time/clock.ts
src/game/timing/{limits,schema,timerConfig,responsePhase,timing.test}.ts
src/host/{ResponseTimerHostPanel.tsx,.css,.test.tsx}
src/host/{useResponseTimerExpiry.ts,useResponseTimerExpiry.test.tsx}
src/display/{ResponseTimerDisplay.tsx,.css,.test.tsx}, useResponseCountdown.ts
tests/e2e/timers-arming.spec.ts
docs/architecture/ADR-007-timers-arming-transitions.md
docs/receipts/2026-07-26-slice-7-local-verification.md
```

(`src/time/duration.ts` and the modified state/sync/import modules are likewise
present; the list above is the distinctive set.)

## Checks observed at the final PR head (`43cc66c`)

All three, **directly observed** via the PR's check runs:

| Check | Conclusion | Completed |
| --- | --- | --- |
| Lint, typecheck, unit tests, build | **success** | 2026-07-26T21:47:04Z |
| Playwright e2e | **success** | 2026-07-26T21:49:13Z |
| SonarCloud Code Analysis | **success** (Quality Gate **passed**, **0 Security Hotspots**, 0.8 % duplication on new code) | 2026-07-26T21:47:12Z |

Sonar's **12 new non-blocking issues were not inspected** — `sonarcloud.io` is
unreachable from this sandbox (`curl` returns `000`; earlier attempts reported
`CONNECT tunnel failed, response 403`). The Quality Gate result is the only Sonar
claim made.

## Post-merge CI on `main` — observed directly

Distinct from the pre-merge PR checks, and **not** a restatement of them.

**Workflow `CI`, run `30225863653`, head `3f9ae1c`, event `push`, branch `main`
— conclusion `success`.** Both jobs:

| Job | Conclusion | Window |
| --- | --- | --- |
| Lint, typecheck, unit tests, build | **success** | 23:43:56Z → 23:44:58Z |
| Playwright e2e | **success** | 23:43:55Z → 23:47:08Z |

Every step inside both jobs also concluded `success` (checkout, setup-node,
install, lint, typecheck, unit tests, production build, artifact upload; and
checkout, setup-node, install, Playwright browser install, Playwright run).

## GitHub Pages deployment — observed directly

**Workflow `Deploy to GitHub Pages`, run `30225863654`, head `3f9ae1c`, event
`push`, branch `main` — conclusion `success`.** Both jobs:

| Job | Conclusion | Window |
| --- | --- | --- |
| Build production bundle | **success** | 23:43:56Z → 23:44:22Z |
| Deploy | **success** | 23:44:26Z → **23:44:35Z** |

Slice 7 changed no CI or deploy configuration.

## Live-site verification — explicitly NOT claimed

**The Pages deployment succeeded. Manual live-route verification was not
performed.**

- `https://ricktron.github.io/classroom-quiz-show/` was **not loaded**: `curl`
  returned HTTP status `000` (the sandbox network policy denies the host).
- What was observed is the **deployment workflow's conclusion**, above. A
  successful deploy job is not evidence that the live routes render, that the
  service worker updated, or that a timer counts down on a real projector.
- No claim whatsoever is made about live application behaviour.

## Stale canonical statements found, and corrected

Every surface below described Slice 7 as in review or its PR as open:

| File | Was | Now |
| --- | --- | --- |
| `README.md` | "Slice 7 … **In review** — … PR open and unmerged" | "**Complete** — merged via PR #14 (`3f9ae1c`)", with post-merge CI and Pages noted |
| `docs/STATUS.md` | header "**Slice state:** In review (branch pushed, PR open and unmerged)" | "**Complete** (merged to `main` via PR #14, merge commit `3f9ae1c`)" |
| `docs/STATUS.md` | "Slice 7 is now In review … the PR open and unmerged" | full merge record: merge commit, timestamp, actor, second-parent proof, post-merge CI, Pages, live-route non-claim |
| `docs/STATUS.md` | heading "## Slice 7 work (In review)" | "## Slice 7 work (Complete)" |
| `docs/STATUS.md` | "Post-merge CI and Pages deployment for Slice 7: **not applicable yet**" | the observed post-merge CI run, the observed Pages run, and the explicit live-route non-claim |
| `docs/handoff/CURRENT.md` | "Slices 1–6 `Complete` … Slice 7 … `In review`" | "**Slices 1–7 all `Complete` and merged to `main`**" |
| `docs/handoff/CURRENT.md` | "Slice 7 (current): `In review`. … **The PR is open and unmerged**" | "`Complete`" with the full merge record and both receipts linked |
| `docs/handoff/CURRENT.md` | Next action: "Review the Slice 7 pull request … It is open and unmerged" | "Await explicit owner authorization for Slice 8"; nothing in flight |
| `docs/plans/MVP-ARC.md` | slice table row 7 "**(In review.)**" | "**(Complete.)**" |
| `docs/plans/MVP-ARC.md` | "**State: In review.**" | "**State: Complete.**" plus merge commit, timestamp, CI and Pages |
| `docs/plans/MVP-ARC.md` | amended record "**Status:** `In review`" | "`Complete` — … **merged to `main` via PR #14**" |

`docs/architecture/ADR-007-timers-arming-transitions.md` needed no change: its
status line already reads `Accepted (Slice 7)`.

Historical statements that were accurate when written were **not** rewritten —
including the Slice 7 implementation receipt, which correctly describes the PR as
open and unmerged at the moment it was taken. This receipt supersedes its
provisional merge-state statements without touching them.

## Canonical files updated

| File | Change |
| --- | --- |
| `README.md` | Slice 7 marked Complete with merge evidence |
| `docs/STATUS.md` | header, state-vocabulary note, section heading, verification section |
| `docs/handoff/CURRENT.md` | headline, Slice 7 entry, next action, **new owner-direction section** |
| `docs/plans/MVP-ARC.md` | slice table, Slice 7 scope record, amended Slice 7/8/9/10 records |
| `docs/receipts/2026-07-27-slice-7-post-merge-reconciliation.md` | **this file (new)** |

Five files, all documentation.

## Owner direction recorded — colored buttons (2026-07-27)

Recorded in `docs/handoff/CURRENT.md` and on the Slice 8, 9 and 10 records in
`docs/plans/MVP-ARC.md`. **Recorded only — nothing is implemented, and recording
it authorizes no work.**

- The hardware-independent local input contract must be able to represent a
  **primary buzz action**, **secondary logical actions** suitable for coloured
  controller buttons, and **configurable mappings independent of any particular
  device model**.
- **The engine must remain button-agnostic.** Only a mapped logical action
  crosses into the command layer; a physical button, its index, its colour and
  its handset stay on the adapter side of the `ROADMAP-AMENDMENT-001` §5.6
  boundary.
- **Sony Buzz! is the preferred initial hardware validation target**, but
  Sony-specific detection, button numbering, default colour mappings, handset
  assignment and setup UX **remain deferred to Slice 10**. No hardware has been
  tested in this repository.
- Slice allocation is unchanged: **8** = logical contract + keyboard; **9** =
  generic Gamepad adapter + configurable mappings; **10** = Sony Buzz! detection,
  validation, recommended profile, handset assignment and host setup UX.
- **No final event vocabulary for secondary actions is defined**, deliberately. It
  is defined only if and when the durable Slice 8 plan requires it — the same
  "no speculative contract without its first consumer" rule that shaped Slice 7's
  interruption seam.

## Slice 8 was not started — verified

- `git grep -iE "gamepad|webhid|sony|buzz-in|buzzIn|BUZZ_|buzzQueue|buzzerQueue|promoteNext|nextRespondent|lockout"`
  over `src/` and `tests/` returns **only** documentation comments and **negative
  assertions** — tests that prove those words are absent from the host panel, the
  projector DOM and `PublicState`. There is no implementation.
- **No team buzz input exists.** No buzz command, no buzz event.
- **No ordered buzzer queue exists.** No queue state, no ordering, no `seq`-based
  buzz derivation.
- **No next-team promotion behaviour exists.** Nothing promotes anyone.
- **No keyboard team input exists.** The only keyboard support is ordinary
  host-control accessibility.
- **No Gamepad, WebHID, Bluetooth or Sony Buzz! implementation exists.**
- This reconciliation changed **no file under `src/`, `tests/`, `public/`,
  `.github/` or `scripts/`** (proved mechanically below).

`OG-1` (manual arming) is implemented in Slice 7. **`OG-2` (full ordered queue)
and `OG-3` (promotion after an incorrect response or a host pass) are owner
decisions for future input behaviour and remain UNIMPLEMENTED.** `OG-6` remains
deferred.

## Scope-boundary proof

Run against the staged diff before committing:

- every changed path matches `^(README\.md|docs/.*\.md)$` — **all documentation**;
- `git diff --name-only origin/main -- src tests public .github scripts` is
  **empty**;
- `package.json`, `package-lock.json`, every `tsconfig*.json`, `vite.config.ts`,
  `vitest.config.ts`, `playwright.config.ts` and `eslint.config.js` are
  **unchanged**;
- no schema, fixture, workflow or dependency changed;
- no file under `docs/receipts/` changed except the addition of this one.

## Verification

Following the Slice 5 and Slice 6 reconciliation precedent, the **full** chain was
run on this branch rather than a reduced documentation-only set:

| Command | Result | Notes |
| --- | --- | --- |
| `npm ci` | pass | no dependency changes |
| `npm run lint` | pass | |
| `npm run typecheck` | pass | `tsc -b --noEmit` |
| `npm run test:run` | pass | **947 tests, 42 files** — unchanged from the merged tree |
| `npm run build` | pass | PWA precache 16 entries / 421.51 KiB |
| `npm run test:e2e` | pass | **175 passed / 2 skipped**, 3 viewport projects |
| `npm run verify:all` | pass | the whole chain again, end to end |
| `git diff --check` | pass | no whitespace errors |

The **2 e2e skips are intentional and pre-existing**: both are the same test
(`tests/e2e/pwa-offline.spec.ts` → "host and display shells load offline after
first visit"), guarded to run once on the desktop project, so it reports skipped
on `projector-720p` and `mobile-host`. **No test was skipped because it failed,
and this reconciliation skips nothing and weakens nothing.**

Counts are identical to the merged tree, which is the expected result for a change
that touches only Markdown.

### Environment override

Playwright needed
`PLAYWRIGHT_CHROMIUM_PATH=/opt/pw-browsers/chromium-1194/chrome-linux/chrome`
because this sandbox's pre-provisioned Chromium is build 1194 while
`@playwright/test@1.56` expects 1228. Supplied **via the environment only**; no
machine-specific path is committed and `playwright.config.ts` is unchanged.

## Receipt immutability

A SHA-256 manifest of every file under `docs/receipts/` was taken **before** any
edit and again **after**. The only difference is the addition of this file; all
**15 pre-existing files are byte-for-byte unchanged**, including the Slice 7
implementation receipt and `ROADMAP-AMENDMENT-001`'s receipt.
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
| `5e4cd77f558cc7b18d2e351d7da6b5ea5216a958ca594bc7fcb75887a0173429` | `README.md` |

Reproduce with `sha256sum docs/receipts/*.md`.

## Roadmap: unchanged

`ROADMAP-AMENDMENT-001` and its receipt are **untouched**. The plan remains **18
slices**; Slices 1–7 are `Complete`; Slices 8–18 are `Planned`. Local USB buzzers
remain approved future scope; **student-owned devices, student phones and
networked buzzers remain excluded**, not merely deferred.

## Known limitations carried forward from Slice 7

- Host and display clocks are **not synchronized** — a clamped (±5 s) estimate
  from each snapshot's `sentAt`, ignoring transport delay, with no round trip.
- **The display never expires a timer**; at 0:00 it waits for the host.
- Undoing an expiry restores an already-overdue running timer, which the adapter
  expires again unless the host acts.
- A response window exists only at the `prompt` stage and does not survive a
  round change.
- Undo remains latest-only (ADR-002).
- State is in memory only; a host reload loses the session.
- `PublicState` v4 and sync-envelope v1 consumers fail closed; no migration
  exists.

## Limitations of this reconciliation

- **No live-site verification** (above). Deployment success is not route success.
- **Sonar's 12 new non-blocking issues were not inspected** — `sonarcloud.io` is
  unreachable from this sandbox.
- This receipt records observations made on 2026-07-27. It will **not** be amended
  after its own PR merges; a later fact belongs in a later receipt.

## PR state

**Open and unmerged.** This reconciliation PR had not been reviewed or merged when
this receipt was written.

## Next safe action

Review and merge this reconciliation PR. After that, the next implementation slice
is **Slice 8 — Local input contract & keyboard buzz-in**, which is `Planned`,
unstarted and **owner-gated**. Its vocabulary gates are answered and the
colored-button direction is recorded, but **neither is authorization to begin**.
Do not start Slice 8 without explicit owner authorization.
