# Slice 6 — teams & scoring: post-merge reconciliation

This receipt records the **merged** state of Slice 6. It is documentation-only:
no application code, test, workflow, dependency or package file was touched in
the change that introduces it.

## Identity

- **Slice:** Slice 6 — Teams & scoring (the first scoring strategy)
- **Implementation PR:** [#11](https://github.com/ricktron/classroom-quiz-show/pull/11)
  — `Slice 6: teams & scoring — the first scoring strategy`
- **Implementation branch:** `claude/slice-6-teams-and-scoring-we53wr`
- **Base `main` SHA:** `5237a1f9f6b451c2137330fd0a7f4613b7a919f2`
  (merge commit of PR #10, the Slice 5 post-merge reconciliation)
- **Implementation commit:** `77340653ae216a7f163206b54109f176bf0a3d1f`
  (`Slice 6: teams & scoring — the first scoring strategy`, 2026-07-26T06:49:48Z)
- **Documentation commit / final reviewed head:**
  `48ed8180278b6966080be6ce00a0e3b06ca3abf1`
  (`docs: record Slice 6 CI observed green on PR #11`, 2026-07-26T07:00:27Z)
- **Merge commit:** `67180a3a24b43124ce7a2dee91d02fe1f797618e` (short `67180a3`)
- **Merge parents:** `5237a1f9f6b451c2137330fd0a7f4613b7a919f2` (base) and
  `48ed8180278b6966080be6ce00a0e3b06ca3abf1` (head)
- **Merged at:** **2026-07-26T15:58:11Z** (GitHub `merged_at`; the merge commit's
  own committer timestamp is `2026-07-26T07:58:11-08:00`, the same instant)
- **Merged by:** `ricktron` (repository owner)
- **PR opened at:** 2026-07-26T06:51:17Z
- **PR totals:** 2 commits, 51 files changed, **+7199 / −109**
- **Reconciliation base `main` SHA:** `67180a3a24b43124ce7a2dee91d02fe1f797618e`
  — this reconciliation branches from the merge commit itself, with a clean tree
- **Reconciliation branch:** `docs/slice-6-post-merge-reconciliation`
- **Reconciliation commit:** this receipt is written in the same commit it
  describes; the commit SHA is visible on the reconciliation PR
- **Reconciliation PR:** opened against `main`, **review only — not merged by
  this session**

Every value above was read from the repository and the GitHub API by direct
inspection. None of it was copied from the authorization text.

## Proof that the reviewed head is the merged head

Two independent facts agree:

1. **Git:** the merge commit `67180a3` has exactly two parents,
   `5237a1f9f6b451c2137330fd0a7f4613b7a919f2` and
   `48ed8180278b6966080be6ce00a0e3b06ca3abf1`. Its **second parent** — the
   merged-in side — is `48ed818`.
2. **GitHub:** PR #11 reports `merged: true`, `head.sha =
   48ed8180278b6966080be6ce00a0e3b06ca3abf1`, `base.sha =
   5237a1f9f6b451c2137330fd0a7f4613b7a919f2`, and `merge_commit_sha =
   67180a3a24b43124ce7a2dee91d02fe1f797618e`.

`48ed818` is the head that carried the final green PR checks and the last review
state. Therefore **the head that was reviewed is exactly the head that was
merged** — no force-push, amend, or extra commit landed between review and merge.

## What Slice 6 delivered (as merged)

- **Teams are authored content** on the immutable `GameDefinition`: a stable `id`
  (identity), a public `name` that is explicitly *not* identity, an `accent`
  named from an application-controlled palette, and authored array order frozen
  onto `order`. **1–8 teams**; omitting `teams` means "no teams", and `teams: []`
  is rejected rather than treated as "none".
- **Content may NAME an accent, never supply one.** Eight tokens (`crimson`,
  `azure`, `emerald`, `amber`, `violet`, `teal`, `rose`, `slate`); a colour,
  gradient, class name, CSS declaration or URL is rejected at import. Colour is
  supplemental everywhere — every surface shows the team's name as text.
- **Scores are session state**, not authored content: bounded integers
  (−1,000,000 … 1,000,000, initial **0**), derived purely by replaying the event
  log. No cache, no floats, no `NaN`/`Infinity`, no coercion, and no write path
  outside `reduce`.
- **One command, one reversible event.** `ADJUST_TEAM_SCORE` →
  `TEAM_SCORE_ADJUSTED`, carrying a signed `delta`, a typed `mode`
  (`full-credit` · `partial-credit` · `deduction` · `manual-correction`) and a
  typed `source` (a specific round + tile, or explicitly `manual`).
- **The resulting total is deliberately not stored on the event** — it would
  become false the moment an *earlier* adjustment were undone.
- **Category-board integration:** presets derive from the tile's
  `effectiveValue` (`value × multiplier`, exact integers). Full credit must equal
  it, a deduction must equal its negation, partial credit must fit inside it, and
  scoring is gated to the `prompt`/`answer` stages and the open tile.
- **Revealing and scoring are independent in both directions**: a reveal awards
  nothing, scoring consumes no tile, and undoing either leaves the other standing.
- **Correction never rewrites history** — undo appends an auditable
  `EVENT_UNDONE` marker, or a compensating `manual-correction` is appended beside
  the original.
- **`PublicState.teams`** — an allow-listed scoreboard DTO with positional keys
  and an explicit `unavailable` fail-closed state. **Wire version 3 → 4.**
- **A host scoring panel** (ordered scoreboard, target selection, previewed
  result, duplicate and large-adjustment guards, an honest undo affordance) and a
  **projector scoreboard** (authored order, names as text, negative totals marked
  by colour *and* sign, no animation).

Full rationale:
[`../architecture/ADR-006-teams-and-scoring.md`](../architecture/ADR-006-teams-and-scoring.md).

## Test and verification evidence

The four categories below are recorded **separately and are not
interchangeable**. In particular, **pre-merge PR checks are not treated as a
substitute for post-merge observation on `main`**.

### 1. Local implementation verification (Slice 6 branch, pre-merge)

Recorded in
[`2026-07-26-slice-6-local-verification.md`](2026-07-26-slice-6-local-verification.md)
and re-confirmed on this reconciliation branch (the tree is identical to `main`
at `67180a3` apart from documentation):

| Command | Result | Notes |
| --- | --- | --- |
| `npm ci` | pass | no dependency changes |
| `npm run lint` | pass | |
| `npm run typecheck` | pass | |
| `npm run test:run` | pass | **740 unit tests, 35 files** |
| `npm run build` | pass | |
| `npm run test:e2e` | pass | **154 passed / 2 skipped**, 3 viewport projects |
| `npm run verify:all` | pass | the full chain |
| `git diff --check` | pass | |

The **2 e2e skips are intentional and pre-existing**: both are the same test
(`tests/e2e/pwa-offline.spec.ts` → "host and display shells load offline after
first visit"), guarded to run once on the desktop project, so it reports skipped
on `projector-720p` and `mobile-host`. **No test was skipped because it failed,
and this reconciliation skips nothing.**

### 2. PR #11 pre-merge checks

All three checks concluded **success** on **both** PR heads.

Implementation commit `77340653ae216a7f163206b54109f176bf0a3d1f`:

| Check | Run | Conclusion |
| --- | --- | --- |
| Lint, typecheck, unit tests, build | 89766114432 | success |
| Playwright e2e | 89766114414 | success |
| SonarCloud Code Analysis | 89766227235 | success |

Final reviewed head `48ed8180278b6966080be6ce00a0e3b06ca3abf1`:

| Check | Run | Conclusion |
| --- | --- | --- |
| Lint, typecheck, unit tests, build | 89766856876 | success |
| Playwright e2e | 89766856858 | success |
| SonarCloud Code Analysis | 89766932656 | success |

SonarCloud's **Quality Gate passed** with **0 Security Hotspots** and 0.0%
duplication on new code. **Not inspected:** the 13 new non-blocking issues Sonar
reports, because `sonarcloud.io` is unreachable from this sandbox (HTTP 403 on
CONNECT, the same network policy that blocks the Pages host). Coverage on new
code reads 0.0% because this repository does not upload coverage to Sonar —
unchanged from earlier slices, not a regression.

Review state at merge: no review threads were open. The only PR comments were two
bot notices (a Cursor Bugbot "not enabled" upsell and the SonarCloud summary),
neither of which required action.

### 3. Post-merge CI on `main` — observed directly

Commit checked: **`67180a3a24b43124ce7a2dee91d02fe1f797618e`** (the Slice 6 merge
commit, and the current tip of `main`). Workflow **`CI`**, run
[30209343948](https://github.com/ricktron/classroom-quiz-show/actions/runs/30209343948),
event `push`, overall conclusion **success**:

| Job | Job ID | Conclusion | Started → completed (UTC) |
| --- | --- | --- | --- |
| Lint, typecheck, unit tests, build | 89812834245 | success | 2026-07-26T15:58:16Z → 15:58:59Z |
| Playwright e2e | 89812834283 | success | 2026-07-26T15:58:16Z → 16:00:21Z |

This is an observation of the workflow run **on `main` after the merge**, not a
restatement of the PR checks in section 2.

### 4. GitHub Pages deployment — observed directly

Commit deployed: **`67180a3a24b43124ce7a2dee91d02fe1f797618e`**. Workflow
**`Deploy to GitHub Pages`**, run
[30209343946](https://github.com/ricktron/classroom-quiz-show/actions/runs/30209343946),
event `push`, overall conclusion **success**:

| Job | Job ID | Conclusion | Started → completed (UTC) |
| --- | --- | --- | --- |
| Build production bundle | 89812834305 | success | 2026-07-26T15:58:16Z → 15:58:47Z |
| Deploy | 89812881672 | success | 2026-07-26T15:58:50Z → 15:59:00Z |

The workflow triggers only on `push` to `main` and `workflow_dispatch`; the
deployment target is <https://ricktron.github.io/classroom-quiz-show/>. Slice 6
changed no CI or deploy configuration.

## Live-site verification — explicitly NOT claimed

**GitHub Pages deployment succeeded. Manual live-route verification was not
performed.**

- `https://ricktron.github.io/classroom-quiz-show/#/host` and `#/display` were
  **not loaded**. The attempt returned `curl: (56) CONNECT tunnel failed,
  response 403` — the sandbox network policy denies `ricktron.github.io`.
- What *was* observed is the **deployment workflow's conclusion** (section 4).
  A successful deploy job is not evidence that the live routes render, that the
  service worker updated, or that the scoreboard appears on a projector.
- No HTTP status from the live site was seen, and no local preview is being
  offered as a substitute: the production-preview screenshots taken during
  implementation were **local**, and prove nothing about the deployed site.
- **Owner acceptance of the live deployment is not claimed.**

## Receipt immutability

Existing receipts are append-only history and were **not** amended.

- **Before this reconciliation:** 12 files under `docs/receipts/` (11 receipts +
  `README.md`), hashed with SHA-256 before any edit in this session.
- **After this reconciliation:** 13 files — the same 12, **byte-for-byte
  unchanged**, plus this new receipt.
- Re-hashing after the edits produced identical digests for all 12 pre-existing
  files, and `git status` shows every file under `docs/receipts/` other than this
  one as untracked-by-change.

In particular
[`2026-07-26-slice-6-local-verification.md`](2026-07-26-slice-6-local-verification.md)
still says the implementation PR is "open for review and unmerged" and that
Slice 6 is in review. **That statement was true when it was written and is
deliberately left intact.** This receipt **supersedes** the merge-state
statements in that receipt without rewriting them: where the two differ about
merge status, CI scope, or Pages deployment, **this receipt is current and that
one is historical**.

## Documentation-only boundary

The change that carries this receipt modifies **only** Markdown under `docs/`
and `README.md`. It contains **no** changes to:

- `src/` · `tests/` · `.github/` · `public/`
- `package.json` · `package-lock.json` · any other dependency manifest
- `vite.config.ts` · `playwright.config.ts` · `tsconfig*.json` · `eslint.config.js`
- any application asset directory

Application behaviour, the test suite, CI, the deploy workflow and the dependency
tree are **identical** to `main` at `67180a3`.

Files updated (status surfaces that still described Slice 6 as in review or
unmerged):

| File | Change |
| --- | --- |
| `README.md` | Slice 6 headline `In review` → **Complete**, with merge/CI/Pages evidence |
| `docs/STATUS.md` | Slice state → **Complete**; merged evidence; post-merge CI and Pages sections; next safe action |
| `docs/handoff/CURRENT.md` | Slices 1–6 Complete; Slice 6 merge record; risks; next action; prohibited-actions heading |
| `docs/plans/MVP-ARC.md` | Slice 6 row and section → **Complete** with merge evidence; Slice 7 marked owner-gated |
| `docs/architecture/ADR-006-teams-and-scoring.md` | Status `Accepted (Slice 6, in review)` → `Accepted (Slice 6)` |
| `docs/receipts/2026-07-26-slice-6-post-merge-reconciliation.md` | **new** (this file) |

`docs/architecture/GAME-ENGINE-BOUNDARIES.md`, `docs/decisions/README.md` and
`docs/receipts/README.md` carry no merge-state claims and were left untouched.

## Roadmap: unchanged

The 11-slice sequence in [`../plans/MVP-ARC.md`](../plans/MVP-ARC.md) is the plan
of record and **was not amended here**. This reconciliation records what merged;
it makes no scope decision. Any roadmap amendment is a separate, explicitly
owner-authorized change.

## Slice 7 status

**Slice 7 (timers & transitions) is unstarted and owner-gated.** No timer,
countdown, timed transition, automatic timeout scoring, buzzer, lockout,
contestant device, persistence layer, session recovery, leader coordination,
wager, media pipeline, theme engine, spreadsheet import, authoring UI or
additional round type exists in the repository, and none may be added until the
owner explicitly authorizes that slice.

## Known limitations carried forward

- **Manual live-route verification has not been performed** for Slice 5 or
  Slice 6 (network policy).
- **`PublicState` wire version is 4** — a consumer pinned to 3 or 2 fails closed;
  no migration exists.
- **Revealing awards nothing** — the teacher must deliberately award or deduct.
- **The selected scoring target is host UI state**, lost on host reload, never
  broadcast (ADR-006 §7).
- **Undo reaches only the latest reversible event** — no targeted per-event undo.
- **A tile can only be scored while it is open** (`prompt` or `answer`); after
  returning to the board, use a manual correction.
- **A zero-value tile has no scoring preset**; manual correction remains.
- **Partial credit is whole points only** — no fractions, so no rounding rule.
- **Score bounds are ±1,000,000** — out-of-range adjustments are rejected, never
  clamped.
- **In-memory only** — no durable persistence (Slice 8); state is lost on tab
  close.
- **Same-browser sync only** (BroadcastChannel, same origin).
- **Paste is the only import transport.**
- **PWA icons remain placeholders** (carried from Slice 1).
- **Pages deploys only from `main`.**

## Caveats

- This receipt records **observed** evidence only. Where something was not
  observed — manual live-route verification, the 13 SonarCloud issues, owner
  acceptance of the deployment — it is named as not observed rather than
  asserted.
- Local figures were produced in the development sandbox with the documented
  `PLAYWRIGHT_CHROMIUM_PATH` environment override, supplied via the environment
  only; **no machine-specific path is committed**. CI installs the matching
  browser and uses no override.
- This is the **only** post-merge stamp for Slice 6. No further reconciliation
  of this slice should be performed.
