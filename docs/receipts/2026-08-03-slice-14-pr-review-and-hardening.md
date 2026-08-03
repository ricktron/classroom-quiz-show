# Slice 14 PR review, acceptance verification and hardening receipt

- **Authorization ID:** `AUTHORIZE-CQS-S14-PR-REVIEW-AND-HARDENING-1`
- **Evidence-state ID:** `CQS-S14-REVIEW-ES-1`
- **Source implementation evidence state:** `CQS-S14-ES-1`
- **Slice ID:** `CQS-SLICE-14-FINAL-WAGER`
- **Date:** 2026-08-03
- **Repository:** `ricktron/classroom-quiz-show`
- **Pull request:** [#32](https://github.com/ricktron/classroom-quiz-show/pull/32)
- **Authorized base:** `4de1454181ed58bdb282accd136129c3c0eb0f2b`
- **Starting reviewed head:** `fca170ed57d5f4ce2403d9d98dd3b9a2aed28c39`
- **Branch:** `claude/cqs-slice-14-final-wager`
- **Receipt type:** PR review, browser acceptance and ordinary hardening

## Preflight observed

| Check | Observed |
| --- | --- |
| Repository | `ricktron/classroom-quiz-show` |
| Branch | `claude/cqs-slice-14-final-wager` |
| Local head | `fca170ed57d5f4ce2403d9d98dd3b9a2aed28c39` |
| Remote head | identical |
| `origin/main` | `4de1454181ed58bdb282accd136129c3c0eb0f2b` |
| Merge base | `4de1454181ed58bdb282accd136129c3c0eb0f2b` (no rebase) |
| PR #32 | open, non-draft, base `main`, `mergeable_state: clean` |
| Working tree | clean |
| Worktrees | one (the primary checkout) |
| Overlapping writer | none |

A stale local branch `claude/slice-14-authorization-3bm0ju` points at the
Slice 14 commit `e497bda` and is inert — it has no remote, no worktree, and no
pull request. It was neither deleted nor advanced.

## Changed-path boundary

`git diff --name-status origin/main...HEAD` returns 51 paths, all attributable
to Slice 14. `git diff --check origin/main...HEAD` exits **0**.

Zero changed paths under `package.json`, `package-lock.json`, `.github/`,
`vite.config.ts`, `vitest.config.ts`, `playwright.config.ts`, `tsconfig*.json`
or `eslint.config.js`. No Stream Deck work, no Slice 15 capability, no generated
output, no screenshots, traces, coverage reports or temporary fixtures, no
secrets and no machine-specific paths (`dist/` and `test-results/` are present
in the working tree and remain git-ignored).

Version surfaces observed in source on this branch:

| Surface | Value |
| --- | ---: |
| `PUBLIC_STATE_SCHEMA_VERSION` | **8** |
| Sync envelope | 2 |
| Canonical game-file schema (`SUPPORTED_SCHEMA_VERSION`) | 1 |
| `GAME_DEFINITION_MODEL_VERSION` | 1 |
| `PERSISTENCE_WIRE_VERSION` | 1 |
| `PERSISTENCE_DB_VERSION` | 1 |

Exactly one Slice 14 implementation receipt exists
(`2026-08-03-slice-14-local-verification.md`); this file is the review receipt
that accompanies it.

## Browser acceptance verification

Host and projector were driven simultaneously in a real Chromium against the
**production build** served by `vite preview`, using a review-time acceptance
suite kept **outside the repository** (scratchpad only — nothing was committed).
Ten scenarios, all observed to a terminal result.

| # | Scenario | Observed |
| --- | --- | --- |
| 1 | Import a board followed by Final | PASS |
| 2 | Two/three-team Classic play-through | PASS |
| 3 | Enter and correct wagers | PASS — correction before lock accepted |
| 4 | Explicit wager lock | PASS — disabled until every team has a wager |
| 5 | Start / pause / resume both windows | PASS — both windows |
| 6 | Expiry performs nothing automatic | PASS — phase unchanged, lock still disabled, nothing revealed or settled |
| 7 | Exact-text capture | PASS |
| 8 | Host-only capture and a no-response state | PASS — no wording field exists in host-only mode |
| 9 | Projector privacy before each reveal | PASS — no prompt, answer or reveal element exists in the DTO before its transition |
| 10 | Default reveal order | PASS — lowest pre-final score marked "(next)" |
| 11 | Alternate reveal order | PASS — a non-default team revealed successfully |
| 12 | Correct, incorrect and zero-wager settlement | PASS — all three, including an auditable zero-delta |
| 13 | Undo a settlement and settle again | PASS — score reverted, team returned to the reveal, re-settled |
| 14 | Unique-leader completion | PASS — two-step, explicit |
| 15 | Tied lead presents both choices | PASS — neither taken automatically |
| 16 | Sudden death restricted to tied leaders | PASS — a non-leader adjustment was rejected `not-a-tied-leader` and moved nothing |
| 17 | Complete only after a unique leader | PASS — completion disabled while tied, enabled once broken |
| 18 | Accept a tied finish | PASS — two-step with a cancel path; ends as a tie |
| 19 | Refresh and recover at six checkpoints | PASS — wager entry, response entry, active reveal, partial settlement, unresolved tie, sudden death; an ended game is not resumable |
| 20 | Follower / read-only behaviour | PASS — follower notice shown |
| 21 | Keyboard-only operation | PASS — focus, Enter, Tab, Enter drove setup and a wager |
| 22 | Projector at 1280×720 | PASS — no horizontal overflow; reveal type ≥ 24px |
| 23 | Reduced motion | PASS — countdown remains legible, no state hidden |
| 24 | Final prompt image failure | **FAIL — see the pre-existing defect below** |

Explicitly **not** claimed: physical Buzz-controller behaviour, and any deployed
or live-route behaviour. Neither was exercised.

## Confirmed defect — PRE-EXISTING on the authorized base, NOT repaired here

**A normalized image prompt whose `caption` or `attribution` is absent cannot be
re-read, so the round projects nothing at all.**

- `normalizeImagePrompt` (`src/game/media/definition.ts`) accepts the AUTHORED
  shape, where `caption`/`attribution` are optional (`undefined`), and
  normalizes them to explicit `null`.
- `readTrustedPrompt` re-reads a normalized prompt through that same function.
  Its guards are `value.caption !== undefined && typeof value.caption !== 'string'`,
  so an explicit `null` — the value normalization itself produced — is rejected.
- The sanitizer therefore returns `null`, `roundAvailability` becomes
  `unavailable`, and the projector shows "This round is not available yet" for
  the whole round while the host plays on normally.

Attribution was established by experiment, not assumption:

| Experiment | Tree | Result |
| --- | --- | --- |
| Final round, image prompt without `attribution`, host + projector | this branch | projector blank for the round |
| `createFinalWagerDefinition` → `readTrustedPrompt` | this branch | returns `null` |
| `createCategoryBoardDefinition` → `readTrustedPrompt`, image tile without `attribution` | **authorized base `4de1454`, clean worktree** | returns `null` — **identical** |

**The same defect reproduces on `main` through `category-board` with zero
Slice 14 code present.** It dates from Slice 11's media contract. It was never
caught because every shipped sample and the Slice 11 e2e fixture set BOTH
`caption` and `attribution`, and every Slice 14 sample prompt is text.

**Not repaired in this pass, deliberately.** The defect lives in
`src/game/media/definition.ts`, is outside the Slice 14 surface, and is
pre-existing on the base — repairing it here would misattribute a Slice 11 fix
to Slice 14 and expand this authorization's scope. It requires its own
authorization. The correction is small and local: `normalizeImagePrompt` should
accept `null` as well as `undefined` for `caption` and `attribution`.

No test was added asserting the broken behaviour, and no existing test was
changed.

## Independent review findings

Findings that were confirmed and repaired:

| # | Finding | Repair |
| --- | --- | --- |
| R1 | `docs/STATUS.md` Limitations still claimed **"One playable round type"** | corrected, with the explicit note that `main` still has one |
| R2 | `docs/STATUS.md` Limitations still claimed **`PublicState` wire version is now 7** — a contract number this branch changes to 8, contradicting the same file's own Slice 14 section | corrected to 8, with the fail-closed statement |
| R3 | `docs/STATUS.md` **"Next safe action"** still said Slice 14 "remains `Planned` and unstarted" | rewritten to record Slice 14 `In review` on PR #32, and to carry the Slice 15 "Planned and unstarted" statement forward |
| R4 | `docs/plans/GAMEPLAY-MODES-AND-POLICIES.md` §8 "What the current implementation does" still said one playable round type | corrected, scoped to `main`, with Slice 14 marked `In review` |
| R5 | `src/host/useFinalWagerExpiry.ts` selected the live window with a nested conditional expression | extracted to a named `liveFinalWindow` helper using guarded returns — behaviour-preserving |

Significant concerns examined and **rejected**, with reasons:

- **`END_GAME_SESSION` is not restricted during sudden death.** Correct as-is.
  It is the pre-existing generic ending path and a teacher must always be able
  to end a lesson. The narrowing lives where it belongs: the host panel disables
  completion while the lead is tied (observed in scenario 17), and CQS-OD-011's
  actual restriction — that only a tied leader may be adjusted — is enforced in
  the planner and was observed rejecting a non-leader.
- **The scoring panel's "Undo last score change" is disabled after a Final
  settlement.** Accurate rather than misleading: the button targets
  `TEAM_SCORE_ADJUSTED` specifically, and its note says so in words. A Final
  settlement is undone through "Undo last reversible", which was observed
  working (scenario 13).
- **Responses cannot be recorded without opening the response window.** By
  design, not an oversight: opening that window is the action that makes the
  question public and fixes the capture mode. Recorded as a limitation, not a
  defect.
- **`BEGIN_FINAL_WAGER` uses `currentRoundIndex ?? 0`.** The `?? 0` branch is
  unreachable — `resolveFinalWager` has already rejected a null index. Harmless;
  not worth a change.
- **`FINAL_TIE_RESOLUTION_SELECTED` carries payload-dependent reversibility.**
  Correct and deliberately mirrored in the persistence codec's `reversibleFor`,
  so a decoded event cannot disagree with the one that was appended.
- **The Final branch of `projectCurrentRound` runs before the lifecycle check.**
  Intentional and required: `complete` is the closing screen a class reads the
  scoreboard against. A Final that never began projects the neutral `setup`
  panel after an end — cosmetic, no leak.
- **`finalSettlementDelta('no-response', 0)` yields `-0`.** Harmless: `-0 !== 0`
  is false so every equality re-check passes, `JSON.stringify(-0)` is `0` so the
  wire round-trips, and both renderers print `0`.

## Sonar disposition

**The issue list could not be retrieved, and nothing is dispositioned from the
count.**

- `sonarcloud.io` is unreachable from this sandbox: the agent proxy answers
  **403 to CONNECT** (`connect_rejected`, policy denial).
- The SonarCloud check run's `output.text` is empty, so the GitHub API exposes
  only the summary.
- No `sonar-project.properties`, no Sonar workflow step and no token exist in
  this environment — analysis is SonarCloud Automatic Analysis, which is also
  why new-code coverage reports 0.0%.

What IS observable on the exact head, from the check run itself:

| Measure | Value |
| --- | --- |
| Quality Gate | **passed** |
| New issues | 36 |
| Accepted issues | 0 |
| Security hotspots | **0** |
| Coverage on new code | 0.0% (no coverage upload is wired to this analysis) |
| Duplication on new code | 1.3% |

Because the gate passed with its reliability, security and maintainability
conditions green, none of the 36 is gate-driving and none is a new bug or
vulnerability. **That is the limit of what the evidence supports**; the
per-rule breakdown is NOT claimed.

A bounded local approximation was run over every changed source path instead —
scanning for the rule families this repository has previously confirmed as true
positives. It found exactly one candidate, `typescript:S3358` (nested ternary)
in `useFinalWagerExpiry.ts`, which is repaired above (R5). It found no
`console`/`debugger` statements, no `TODO`/`FIXME`, no secrets and no
machine-specific paths.

The known `typescript:S3776` cognitive-complexity advisory on the
`sessionWire` decoder **remains deferred**, as recorded for Slice 13. It is not
gate-driving, Final adds cases in the same fail-closed style, and extracting a
large decoder would broaden this pass into unrelated refactoring. No rule was
silenced, no exclusion was added, and the missing coverage upload was **not**
repaired and is not claimed to be.

## Repairs made

Five paths, all bounded:

- `docs/STATUS.md` — R1, R2, R3
- `docs/plans/GAMEPLAY-MODES-AND-POLICIES.md` — R4
- `src/host/useFinalWagerExpiry.ts` — R5
- `docs/receipts/2026-08-03-slice-14-pr-review-and-hardening.md` — this receipt

No test was weakened, skipped, deleted or rewritten. No history was rewritten,
no force-push, no rebase, and `main` was not merged into the branch. No
dependency or lockfile changed. Slice 14 remains **`In review`**.

## Non-claims

1. **Physical Buzz-controller behaviour is not claimed.** No controller was
   used.
2. **Deployed / live-route behaviour is not claimed.** No deployed URL was
   exercised.
3. **The per-rule Sonar breakdown is not claimed** — see above.
4. **Scenario 24 (Final prompt image fallback) does not pass**, because of the
   pre-existing media defect recorded above. It is reported, not repaired, and
   not worked around.
5. The local `test:e2e` gamepad failure attribution recorded in the
   implementation receipt was re-confirmed unchanged; that test was not touched.
