# Slice 8 — local input contract & keyboard buzz-in: post-merge reconciliation

## Identity

- **Reconciliation:** `CQS-S08-POST-MERGE-RECONCILIATION`
- **Date:** 2026-07-27
- **Authorization:** owner-authorized **documentation-only** reconciliation slice.
  It reconciles canonical repository status with the merged Slice 8
  implementation. **No implementation work of any kind is authorized or
  performed.**
- **Repository:** `ricktron/classroom-quiz-show` (verified: `git remote -v` and
  the GitHub API both resolve to this repository; `default_branch: "main"`)
- **Branch:** `docs/slice-8-post-merge-reconciliation`
- **Base commit:** `167128dc6462d10192afe92e85026918ebce7ba0` (current
  `origin/main`, itself the merge commit of PR #16)
- **PR for this reconciliation:** **open and unmerged** at the time of writing.
- **Environment:** local sandbox (Linux 6.18.5, Node v22.22.2, npm 10.9.7)

Every fact below was **verified directly** against Git and the GitHub API in this
session. The supplied report was treated as claims, not evidence.

## Preflight

| Check | Result |
| --- | --- |
| Repository root | `/home/user/classroom-quiz-show` |
| Remote identity | `ricktron/classroom-quiz-show` |
| Worktree clean before editing | yes (`git status --porcelain` empty) |
| `origin/main` after fetch | `167128dc6462d10192afe92e85026918ebce7ba0` |
| GitHub default branch | **`main`** (API `default_branch`) |
| Abandoned branch `claude/classroom-quiz-show-slice-1-a6ogu4` | **absent** — `git ls-remote --heads origin` lists only `refs/heads/main` |
| PR #17 | **closed, not merged** — no further action |
| PR #16 | **merged** |

## PR #16 — verified merge evidence

| Fact | Verified value | How |
| --- | --- | --- |
| State | `closed`, `merged: true` | GitHub API `pulls/16` |
| Merge commit | `167128dc6462d10192afe92e85026918ebce7ba0` | API + `git log origin/main` |
| Merged at | **2026-07-27T02:46:24Z** | API `merged_at`; `git show -s` gives `2026-07-26T18:46:24-08:00`, the same instant |
| Merged by | `ricktron` | API `merged_by` |
| Merge actor on the commit | author `Rick Garnett <38998553+ricktron@users.noreply.github.com>`, committer `GitHub <noreply@github.com>` | `git show -s` |
| Base at merge | `004bf9d55d7d7a22b19414e11ffdd050d98fb31f` | API `base.sha` |
| Reviewed head | `7d127188a20ce6bdf844c272db7b717cf5a2825a` | API `head.sha` |
| Head branch | `claude/slice-8-local-input-keyboard-thn7bn` | API `head.ref` |
| Commits in the PR | 2 | API `commits` |
| Files changed | 48 (+7,787 / −149) | API; `git diff --name-only 004bf9d 7d12718 \| wc -l` → 48 |

All four reported values (implementation head, merge commit, merge time, merge
actor) match what was observed. The reported base at merge also matches.

### Merge strategy and parent evidence

`167128d` has **two parents**, so it is a true **merge commit** — not a squash and
not a rebase:

```
parents: 004bf9d55d7d7a22b19414e11ffdd050d98fb31f   (first  — previous main)
         7d127188a20ce6bdf844c272db7b717cf5a2825a   (second — the reviewed head)
```

**The second parent IS the reviewed head.** The head that was reviewed is exactly
the head that merged; nothing was rewritten, amended or re-created in between.

### Reviewed-head ancestry — proven

`git merge-base --is-ancestor 7d12718 167128d` **succeeds**, and
`git branch -a --contains 7d12718` lists `main` and `origin/main`. The reviewed
implementation head is contained in the merged result.

### Commits actually included

`git log 004bf9d..167128d` returns exactly three commits and no others:

| Commit | Authored | Subject |
| --- | --- | --- |
| `1fbe16f` | 2026-07-27T02:11:18Z | Slice 8: local input contract & keyboard buzz-in |
| `7d12718` | 2026-07-27T02:11:36Z | Slice 8: drop an unused re-export from the buzz-in host panel |
| `167128d` | 2026-07-27T02:46:24Z | Merge pull request #16 |

Both non-merge commits are confirmed ancestors of `origin/main`.

### Files included

48 files: 9 documentation (`README.md`, `docs/PROJECT.md`, `docs/STATUS.md`,
`docs/architecture/ADR-008-…`, `docs/architecture/GAME-ENGINE-BOUNDARIES.md`,
`docs/decisions/README.md`, `docs/handoff/CURRENT.md`, `docs/plans/MVP-ARC.md`,
`docs/receipts/2026-07-27-slice-8-local-verification.md`) and 39 under `src/` and
`tests/`. **No package, lockfile, workflow, schema or configuration file is in the
set.**

## Slice 8 implementation present on `origin/main` — verified

`git ls-tree -r origin/main` confirms every Slice 8 artefact is on `main`:

```
src/input/{localInput,logicalAction,keyboardKeys,keyboardMapping,
           keyboardMappingStore,keyboardAdapter,commandTranslation}.ts
src/game/timing/buzzQueue.ts
src/host/{LocalInputHostPanel.tsx,.css,.test.tsx}, useKeyboardBuzzInput.ts
src/display/{BuzzQueueDisplay.tsx,.css,.test.tsx}
src/state/{buzzQueueReducer,buzzSanitize}.test.ts   (+ modified commands/events/
           publicState/reducer/sanitize)
tests/e2e/buzz-in.spec.ts
docs/architecture/ADR-008-local-input-keyboard-buzz.md
docs/receipts/2026-07-27-slice-8-local-verification.md
```

## Checks observed at the final PR head (`7d12718`)

All three, **directly observed** via the PR's check runs:

| Check | Conclusion | Completed |
| --- | --- | --- |
| Lint, typecheck, unit tests, build | **success** | 2026-07-27T02:25:48Z |
| Playwright e2e | **success** | 2026-07-27T02:27:53Z |
| SonarCloud Code Analysis | **success** | 2026-07-27T02:25:53Z |

The reported "Quality Gate passed / 0 security hotspots" is **consistent with**
the observed `success` conclusion, but the Sonar dashboard itself was **not
inspected** — `sonarcloud.io` is unreachable from this sandbox. **The check-run
conclusion is the only Sonar claim made here.**

## Post-merge CI on `main` — observed directly

Distinct from the pre-merge PR checks, and **not** a restatement of them.

**Workflow `CI`, run `30232976466`, head `167128d`, event `push`, branch `main` —
conclusion `success`.** Both jobs:

| Job | Conclusion | Window |
| --- | --- | --- |
| Lint, typecheck, unit tests, build | **success** | 02:46:28Z → 02:47:23Z |
| Playwright e2e | **success** | 02:46:28Z → 02:49:46Z |

Every step inside both jobs also concluded `success` (checkout, setup-node,
install, lint, typecheck, unit tests, production build, artifact upload; and
checkout, setup-node, install, Playwright browser install, Playwright run).

## GitHub Pages deployment — observed directly

**Workflow `Deploy to GitHub Pages`, run `30232976430`, head `167128d`, event
`push`, branch `main` — conclusion `success`.** Both jobs:

| Job | Conclusion | Window |
| --- | --- | --- |
| Build production bundle | **success** | 02:46:29Z → 02:46:56Z |
| Deploy | **success** | 02:47:00Z → **02:47:09Z** |

Slice 8 changed no CI or deploy configuration.

## Live-route verification — explicitly NOT claimed

**The Pages deployment succeeded. Manual live-route verification was not
performed.**

- `https://ricktron.github.io/classroom-quiz-show/` was **not loaded** — the
  sandbox network policy denies the host.
- What was observed is the **deployment workflow's conclusion**, above. A
  successful deploy job is not evidence that the live routes render, that the
  service worker updated, or that a buzz registers on a real classroom machine.
- No claim whatsoever is made about live application behaviour.

## Default-branch and PR #17 cleanup — verified

| Fact | Verified value | How |
| --- | --- | --- |
| Repository default branch | **`main`** | GitHub API `default_branch` |
| PR #17 state | **`closed`** | API `pulls/17` |
| PR #17 merged | **`false`** | API `merged` |
| PR #17 head | **`main`** (`167128d`) | API `head.ref` |
| PR #17 base | **`claude/classroom-quiz-show-slice-1-a6ogu4`** (`0fad6bf`) | API `base.ref` |
| PR #17 closed at | 2026-07-27T02:55:51Z | API `closed_at` |
| Abandoned branch present remotely | **no** | `git ls-remote --heads origin` → only `refs/heads/main` |

PR #17 was an **erroneous reversed pull request**: its head was `main` and its
base the abandoned Slice 1 branch, which is the direction you get when a stale
branch is still configured as the repository default. It was **closed without
merging** and **requires no further action**. Its history was not modified, it was
not reopened, and no new pull request involving that branch was created.

The abandoned branch `claude/classroom-quiz-show-slice-1-a6ogu4` is **deleted** —
directly verified. It contained no unique active work: its tip `0fad6bf` is the
Slice 1 commit, an ancestor of `origin/main`.

**No separate receipt was created for the branch cleanup.** Current repository
policy (`docs/receipts/README.md`) directs against a receipt per routine action
and does not require one for this; the verification is recorded here instead.

## Stale canonical statements found, and corrected

Every surface below described Slice 8 as in review or its PR as open:

| File | Was | Now |
| --- | --- | --- |
| `README.md` | "Slice 8 … **In review** — … pull request **open and unmerged**" | "**Complete** — merged via PR #16 (`167128d`)", with parent proof, post-merge CI, Pages, live-route non-claim |
| `docs/STATUS.md` | header "**Slice state:** In review (branch pushed, pull request **open and unmerged**)" | "**Complete** (merged to `main` via PR #16, merge commit `167128d`, 2026-07-27T02:46:24Z)" |
| `docs/STATUS.md` | "Slice 8 is **In review** … **no post-merge reconciliation has been performed or claimed**" | full merge record: merge commit, timestamp, actor, second-parent proof, PR checks, post-merge CI, Pages, live-route non-claim; plus a repository-hygiene note |
| `docs/STATUS.md` | heading "## Slice 8 work (In review)" | "## Slice 8 work (Complete)" |
| `docs/STATUS.md` | "The pull request is **open and unmerged**; nothing about a merged state is claimed." | merged record + link to this receipt |
| `docs/STATUS.md` | "**PR CI, post-merge CI and the Pages deployment for Slice 8 are NOT claimed.**" | the observed PR checks, the observed post-merge CI run, the observed Pages run, and the explicit live-route non-claim |
| `docs/STATUS.md` | Next safe action: "**Review the Slice 7 pull request** … It is open and unmerged" | "Review and merge the Slice 8 post-merge reconciliation PR"; Slice 9 next, owner-gated; deferred response-mode pointer |
| `docs/STATUS.md` | "Durable IndexedDB persistence/recovery is Slice 8." | "…is **Slice 13** under the amended 18-slice roadmap" — this pre-dated `ROADMAP-AMENDMENT-001` and would otherwise contradict the Slice 8 record on the same page |
| `docs/handoff/CURRENT.md` | "Slices 1–7 all `Complete` … Slice 8 … `In review`, with its pull request open and unmerged" | "**Slices 1–8 all `Complete` and merged to `main`**" + a repository-hygiene note |
| `docs/handoff/CURRENT.md` | "**Slice 8 (current): `In review`.** … **no CI run, no post-merge state and no deployment is claimed for it**" | "`Complete`" with the full merge record, both receipts linked |
| `docs/handoff/CURRENT.md` | "Latest local results (Slice 7) … The PR is **open and unmerged**, so there is no post-merge or Pages evidence yet." | Slice 8 results as latest, with observed PR CI, post-merge CI and Pages; Slice 7 retained as prior history and its merge stated |
| `docs/handoff/CURRENT.md` | `npm run test:run # … 947 tests` | `1,184 tests` (the merged tree's count, re-observed locally) |
| `docs/handoff/CURRENT.md` | Next action: "**Review the Slice 8 pull request.** It is open and unmerged" | "Review and merge the Slice 8 post-merge reconciliation PR"; Slice 9 next, owner-gated; Slice 10 unstarted |
| `docs/handoff/CURRENT.md` | slice-allocation table row 8 "`In review`" | "`Complete` (PR #16, `167128d`)" |
| `docs/plans/MVP-ARC.md` | slice table row 8, no completion marker | "**(Complete …)**" — the planned wording, including "+ registry", is **preserved**; the marker records that the adapter *registry* object was deliberately not built (ADR-008 §3 ships a bounded application-only input-source union instead). Marking the row Complete without that note would have asserted a registry exists |
| `docs/plans/MVP-ARC.md` | "Slice 8 is **In review**: … pull request **open and unmerged**." | "**Complete**" with merge commit, timestamp, actor, second-parent proof, CI and Pages |
| `docs/plans/MVP-ARC.md` | Slice 8 record "**Status:** `In review`" | "`Complete` — … **merged to `main` via PR #16**", with this receipt linked |

### Surfaces checked and deliberately left unchanged

- `docs/architecture/ADR-008-local-input-keyboard-buzz.md` — status already reads
  `Accepted (Slice 8)`; **not stale**.
- `docs/architecture/GAME-ENGINE-BOUNDARIES.md` — its §4 and §6 "Status (Slice 8)"
  paragraphs already describe Slice 8 as implemented, not pending; **not stale**.
- `docs/decisions/README.md` — the ADR index already lists ADR-008 and records
  `OG-6` as still deferred; **not stale**.
- `docs/PROJECT.md` — its owner-gate records already say `OG-2`/`OG-3`
  "Implemented in Slice 8" and `OG-4`/`OG-5` "resolved in Slice 8"; **not stale**.
- `ROADMAP-AMENDMENT-001` and its receipt — **untouched**.

Historical statements that were accurate when written were **not** rewritten —
including the Slice 8 implementation receipt, which correctly describes the PR as
open and unmerged at the moment it was taken. This receipt supersedes its
provisional merge-state statements **without touching them**.

## Canonical files updated

| File | Change |
| --- | --- |
| `README.md` | Slice 8 marked Complete with merge evidence |
| `docs/STATUS.md` | header, state-vocabulary note, section heading, verification section, next safe action, persistence-slice correction, hygiene note |
| `docs/handoff/CURRENT.md` | headline, Slice 8 entry, latest-results block, test count, next action, allocation table, **new post-MVP response-mode owner direction**, hygiene note |
| `docs/plans/MVP-ARC.md` | slice table row 8, Slice 8 scope record, Slice 8 status record |
| `docs/receipts/2026-07-27-slice-8-post-merge-reconciliation.md` | **this file (new)** |

Five files, all documentation.

## Slice 8 completion facts — verified in the merged source and ADR-008

Each row was checked against the code on `origin/main`, not against the PR
description.

| Expected outcome | Verified | Evidence |
| --- | --- | --- |
| Hardware-independent local input boundary | **yes** | `src/input/localInput.ts`, `logicalAction.ts`: the crossing value carries team + logical action + evidence only — no `key`, button, handset, vendor/product id |
| Keyboard team buzzing | **yes** | `src/input/keyboardAdapter.ts` → `commandTranslation.ts` → `RECORD_TEAM_BUZZ` |
| Manual arming integration (Slice 7's gate reused) | **yes** | `src/state/reducer.ts`: "disarming IS the intake gate"; a buzz on a disarmed clue returns `null` |
| Deterministic ordered queue | **yes** | `src/game/timing/buzzQueue.ts`: `{ order, resolvedCount }`, order taken from the log's `seq`, no clock read |
| Explicit active respondent | **yes** | `order[resolvedCount]`; a discriminated `{ status: 'active', activeTeamId }` / `'exhausted'` union |
| Incorrect / pass promotion | **yes** | `RESOLVE_ACTIVE_RESPONSE` with `{ kind: 'incorrect' \| 'passed' }`; "A promotion moves no points" |
| Slice 7 timer interruption integration | **yes** | `src/game/timing/responsePhase.ts`: `RESPONSE_INTERRUPTION_KINDS = ['host', 'team-buzz']` — one added union member, no new event type |
| Deterministic replay and undo | **yes** | queue derived purely by replay; undo remains the append-only marker of ADR-002 |
| Public-state sanitization | **yes** | `src/state/publicState.ts`: required `buzz: PublicBuzzState`, wire version **6**; `PUBLIC_STATE_SCHEMA_VERSION = 6` |
| Local host-device key mapping persistence | **yes** | `keyboardMappingStore.ts`, one versioned entry `classroom-quiz-show:input:keyboard-mapping:v1`, validated on load |
| Inert secondary logical action slots | **yes** | `commandTranslation.ts` returns `{ status: 'rejected', reason: 'unsupported-action' }` for every `secondary` slot |
| No Gamepad, WebHID or Sony-specific implementation | **yes** | see the negative proof below |
| `OG-2` and `OG-3` implemented | **yes** | ADR-008 §8, §11 and its decision table: both "**Implemented by Slice 8**" |
| `OG-6` deferred | **yes** | ADR-008 §17 and its decision table: "**Deferred and NOT implemented**"; scoring unchanged for every team |

`OG-1` is implemented in Slice 7 and reused here; `OG-4` (ties) and `OG-5` (queue
lifetime) were **resolved** in Slice 8 — sequence is the deterministic tiebreaker
with no adjudication UI, and a queue belongs to exactly one clue's response
opportunity.

### Negative proof — no Slice 9, Slice 10 or response-mode runtime

- `git grep -inE "navigator\.getGamepads|gamepadconnected|requestDevice|webhid|navigator\.hid|vendorId|productId|playstation|handset"`
  over `src/` returns **only** doc comments and **negative test assertions** —
  tests proving those words are absent from the host panel, the projector DOM and
  `PublicState`. **There is no implementation.**
- `git grep -inE "multipleChoice|multiple_choice|responseMode|response_mode|speedScor|choiceMode"`
  over `src/` and `tests/` returns **nothing**. No response-mode or
  multiple-choice runtime, schema, event or fixture exists.
- **No Gamepad adapter exists. No WebHID runtime exists. No Sony-specific runtime
  exists.**

## Deferred response-mode owner direction — recorded

Recorded concisely in `docs/handoff/CURRENT.md` (the established handoff surface
for owner direction; the repository has **no** separate backlog or deferred-ideas
document, and none was created). **Recorded only — recording it authorizes no
work.**

Additional response modes are intentionally **deferred until after the functional
MVP**:

1. traditional **open-answer buzzer** mode;
2. **buzz-first multiple-choice** mode;
3. **simultaneous speed-based multiple-choice** mode.

The future design should permit **clue-level response policies**, so open-answer
and buzz-first multiple-choice clues may coexist in one game.

**No schema, event vocabulary, scoring formula, acceptance criteria, roadmap
insertion or implementation slice is authorized or defined now.** The active
18-slice roadmap was **not** amended to insert this work. **The immediate frontier
remains Slice 9.**

## Slice 9 and Slice 10 were NOT started — verified

- **Slice 9 remains `Planned`, unstarted and owner-gated.** No Gamepad API code,
  no connect/disconnect handling, no polling, no controller diagnostics.
- **Slice 10 remains `Planned` and unstarted.** No Sony Buzz! detection, no
  vendor/product identification, no button numbering, no coloured default
  mappings, no handset assignment, no setup UX.
- This reconciliation changed **no file under `src/`, `tests/`, `public/`,
  `.github/` or `scripts/`** (proved mechanically below).

## Scope-boundary proof

Run against the staged diff before committing:

- every changed path matches `^(README\.md|docs/.*\.md)$` — **all documentation**;
- `git diff --name-only origin/main -- src tests public .github scripts` is
  **empty**;
- `package.json`, `package-lock.json`, every `tsconfig*.json`, `vite.config.ts`,
  `vitest.config.ts`, `playwright.config.ts` and `eslint.config.js` are
  **unchanged**;
- no schema, fixture, workflow, build artifact or dependency changed;
- no file under `docs/receipts/` changed except the addition of this one;
- the MVP roadmap table still has exactly **18 slice rows**, in the same order.

## Verification

Following the Slice 5, 6 and 7 reconciliation precedent, the **full** chain was
run on this branch rather than a reduced documentation-only set:

| Command | Result | Notes |
| --- | --- | --- |
| `npm ci` | **pass** (observed) | no dependency changes |
| `npm run lint` | **pass** (observed) | |
| `npm run typecheck` | **pass** (observed) | `tsc -b --noEmit` |
| `npm run test:run` | **pass** (observed) | **1,184 tests, 51 files** — unchanged from the merged tree |
| `npm run build` | **pass** (observed) | PWA precache **16 entries / 443.62 KiB** |
| `npm run test:e2e` | **running when this receipt was committed — NOT yet observed** | see below |
| `npm run verify:all` | **not yet observed** | queued behind `test:e2e` |
| `git diff --check` | **not yet observed** | queued behind `verify:all` |

**Honest status at commit time.** Lint, typecheck, the full unit suite and the
production build were **run to completion on this branch and passed**. The
Playwright e2e suite and the `verify:all` re-run were **still executing when this
receipt was committed**, so **their results are not claimed here**. This receipt
records what was observed, not what was expected — per
`docs/receipts/README.md`, "never mark a command as passing unless it was executed
successfully."

The merged tree's own e2e result (**187 passed / 2 skipped**) is recorded in the
Slice 8 implementation receipt and was independently confirmed green by the
post-merge `CI` run on `167128d` above; this change touches only Markdown, so no
e2e behaviour can differ. That is a **reason to expect** a green run, **not**
evidence of one.

The **2 e2e skips are intentional and pre-existing**: both are the same test
(`tests/e2e/pwa-offline.spec.ts` → "host and display shells load offline after
first visit"), guarded to run once on the desktop project, so it reports skipped
on `projector-720p` and `mobile-host`. **No test is skipped because it failed, and
this reconciliation skips nothing, weakens nothing and suppresses nothing.**

Unit and build counts are identical to the merged tree, which is the expected
result for a change that touches only Markdown.

### Environment override

Playwright needed
`PLAYWRIGHT_CHROMIUM_PATH=/opt/pw-browsers/chromium-1194/chrome-linux/chrome`
because this sandbox's pre-provisioned Chromium is build 1194 while
`@playwright/test@1.56` expects 1228. Supplied **via the environment only**; no
machine-specific path is committed and `playwright.config.ts` is unchanged.

## Receipt immutability

A SHA-256 manifest of every file under `docs/receipts/` was taken **before** any
edit and again **after**. The only difference is the addition of this file; all
**16 pre-existing files are byte-for-byte unchanged**, including
`2026-07-27-slice-8-local-verification.md` (the Slice 8 implementation receipt,
**specifically re-verified**) and `2026-07-26-roadmap-amendment-001-local-buzzers.md`.
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
| `5e4cd77f558cc7b18d2e351d7da6b5ea5216a958ca594bc7fcb75887a0173429` | `README.md` |

Reproduce with `sha256sum docs/receipts/*.md`.

## Roadmap: unchanged

`ROADMAP-AMENDMENT-001` and its receipt are **untouched**. The plan remains **18
slices**; Slices 1–8 are `Complete`; Slices 9–18 are `Planned`. Local
host-attached USB buzzers remain approved future scope; **student-owned devices,
student phones and networked buzzers remain excluded**, not merely deferred. No
slice was inserted, removed or reordered, and the deferred response-mode concept
was **not** added to the roadmap.

## Known limitations carried forward from Slice 8

- Buzz keys are **per-device and per-browser-profile**; they do not travel with a
  game file and are lost if site data is cleared — by design.
- A `KeyboardEvent.code` is a physical position, so a stored mapping read as text
  is not the keycap legend.
- A buzz that stops a live clock appends two facts, so fully reversing it takes
  two undos. Undo remains latest-only (ADR-002).
- The queue does not survive a clue change, a round change or a reload; session
  state is in memory only until Slice 13.
- Nothing measures reaction time and no true physical tie is resolved — sequence
  is the tiebreaker, timestamps are evidence.
- **No hardware of any kind has been tested**, and no controller compatibility is
  claimed.
- A consumer pinned to `PublicState` version 5 or earlier fails closed; no
  migration exists.

## Limitations of this reconciliation

- **No live-site verification** (above). Deployment success is not route success.
- **Sonar's detailed findings were not inspected** — `sonarcloud.io` is
  unreachable from this sandbox. Only the check-run conclusion is claimed; the
  reported "Quality Gate passed, 0 security hotspots" is consistent with it but
  was not independently confirmed.
- This receipt records observations made on 2026-07-27. It will **not** be amended
  after its own PR merges; a later fact belongs in a later receipt.

## PR state

**Open and unmerged.** This reconciliation PR had not been reviewed or merged when
this receipt was written, and this reconciliation does not merge it.

## Next safe action

Review and merge this reconciliation PR. After that, the next implementation slice
is **Slice 9 — Generic Gamepad adapter**, which is `Planned`, unstarted and
**owner-gated**. Slice 8 having shipped the boundary Slice 9 plugs into is **not**
authorization to begin it, and neither is this reconciliation. Slice 10 is
likewise `Planned` and unstarted. Additional response modes are **post-MVP** and
authorize nothing now.

Do not start Slice 9 or Slice 10 without explicit owner authorization.
