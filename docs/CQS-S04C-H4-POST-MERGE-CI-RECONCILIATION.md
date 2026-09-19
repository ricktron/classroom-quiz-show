# CQS S04C-H4 — post-merge CI reconciliation

Local closeout for `AUTHORIZE-CQS-REAL-MVP-S04C-H4-POST-MERGE-CI-RECONCILIATION-1`.

This file does not mark H4 terminal. It does not update `docs/STATUS.md`, `docs/handoff/CURRENT.md`, or the REAL MVP plan. Those surfaces still lag the H4 implementation merge on purpose.

## A. Starting state

| Fact | Observed |
| --- | --- |
| Workspace at task start | `feat/cqs-real-mvp-s04c-h2-sanitized-diagnostics-copy-report` at `8620bcd20370947882eca7ee9e0888d4c7090b40`, dirty with unrelated untracked H3 docs. Not used for mutation. |
| Accepted PR #84 head | `281fd1873d8a56193471b659a817b61d0b968ed5` |
| Merged `origin/main` | `2c484a2d0ce73fa4f52717773e93fb3ad1e917ef` |
| Squash parent | `f5fcd5b77031cccdc5195eace803003f073d3658` |
| Tree equality | Accepted head tree and squash tree are both `c000ec9f3f30b587b778e9a0526a8f36bfe3fe80` |
| Commits after the squash | none |
| PR #84 | **MERGED**. Auto-merge was not enabled. |
| Repair branch | `fix/cqs-s04c-h4-post-merge-ci-status-wait`, created from that `origin/main` |

Post-merge workflows on `2c484a2d0ce73fa4f52717773e93fb3ad1e917ef`, attempt 1, no rerun:

| Workflow | Run | Conclusion |
| --- | --- | --- |
| CI | [35463981821](https://github.com/ricktron/classroom-quiz-show/actions/runs/35463981821) | **failure** |
| Deploy to GitHub Pages | [35463981827](https://github.com/ricktron/classroom-quiz-show/actions/runs/35463981827) | success |
| Desktop artifacts | [35463981802](https://github.com/ricktron/classroom-quiz-show/actions/runs/35463981802) | success |

Failed job: `Lint, typecheck, unit tests, build`, job [105952727786](https://github.com/ricktron/classroom-quiz-show/actions/runs/35463981821/job/105952727786). Lint and typecheck passed. The Unit tests step failed. Production build was skipped. Playwright e2e on the same CI run passed.

Pre-merge CI on the accepted head `281fd1873d8a56193471b659a817b61d0b968ed5` was success, including CI run [35419391263](https://github.com/ricktron/classroom-quiz-show/actions/runs/35419391263).

## B. Failure reconstruction

One failed test:

`src/routes/HomeRoute.test.tsx` — `says the previous playable game was kept when an unfinished salvage replaces it`.

Assertion at the merged line 665:

```text
expect(await screen.findByTestId('home-status')).toHaveTextContent(
  'The previous playable game was kept',
)
```

Expected: `The previous playable game was kept`.
Received: `Saving the usable parts…`.

The test models this teacher path:

1. A playable `board-game` is already saved.
2. A corrupt import of the same id is reviewed.
3. Keep hits the existing-game conflict. Status says nothing new was saved yet.
4. The teacher clicks **Replace the existing saved game**.

`keepSalvage('replace')` sets `salvageSaveInFlight` and `Saving the usable parts…` before `await saveAuthoringDraftToLibrary`. The `home-status` node is rendered for the whole Home visit, including that in-progress sentence. `findByTestId('home-status')` resolves when the node exists. It does not wait for the final sentence. `toHaveTextContent` then reads whatever text is already there.

After persistence succeeds, and only when `playable` is true and `compiledThisSave` is false, Home sets:

`Saved “{title}”. The previous playable game was kept. Open the editor to finish this import.`

That write stays on Home. The previous playable definition is the one `lastPlayableOrStub` returns. Library behavior was not changed by this repair.

## C. Disposition

**TEST_SYNCHRONIZATION_DEFECT**

Not a product lifecycle defect. Not test isolation. Not infrastructure-only. The mechanism is the assertion, not an unnamed flake.

## D. Root cause

The shared status node exists during both the in-progress sentence and the final sentence. The failing query waited only for the node.

Local runs of the unrepaired test passed because the memory-adapter write often finished before that synchronous text check. That does not make the assertion correct. Delaying `savedDefinitions` transactions by 400ms, without changing product code, reproduced the CI mismatch exactly: expected `The previous playable game was kept`, received `Saving the usable parts…`. That delay was a diagnosis only and is not in the repair.

Unrepaired local results on tree `c000ec9f3f30b587b778e9a0526a8f36bfe3fe80`, worktree `classroom-quiz-show-s04c-h4`, HEAD `281fd1873d8a56193471b659a817b61d0b968ed5`:

| Run | Result |
| --- | --- |
| Failing test alone, 8 times | 8 pass |
| `HomeRoute.test.tsx`, 3 times | 3 pass, 17 tests each |
| `npm run test:run` | exit 0; 174 files; 2635 passed; 2 skipped; 47.63s |

No second GitHub run of the failed main SHA was started. Governance does not treat an unreproduced local pass as a green post-merge check.

## E. Repair

Product code was not changed.

`src/routes/HomeRoute.test.tsx` now holds `savedDefinitions` writes across the replace click, using the existing `holdSavedDefinitionWrites` helper. While the hold is open it requires:

- status text `Saving the usable parts`;
- that same status node does not yet say the previous playable game was kept;
- Discard, Keep/Replace, and Import file text are disabled.

After release it waits on `home-status` until that node says the previous playable game was kept, and it requires the saving sentence to be gone. The library assertions are unchanged: the saved game stays playable, the original answer remains on the definition, and the unfinished draft keeps `Which gas?`.

No sleep was added. No timeout was raised. The known LOW collapsed-detail wording was not edited.

## F. Verification

Repair worktree: `/Users/macdaddy/Documents/Coding/Cursor Projects/classroom-quiz-show-h4-ci`.
Branch: `fix/cqs-s04c-h4-post-merge-ci-status-wait`.
Base HEAD before this commit: `2c484a2d0ce73fa4f52717773e93fb3ad1e917ef`.
`node_modules` in that worktree was a symlink to the sibling checkout of the same tree. It is not part of the commit. Playwright’s preview server was started by this worktree; port 4173 was not already listening.

| Check | Result |
| --- | --- |
| `git diff --check` | exit 0 |
| Repaired test alone, 5 times | 5 pass |
| `HomeRoute.test.tsx`, `ImportSalvagePanel.test.tsx`, `salvage.test.ts` | 3 files, 30 passed |
| `npm run verify` | exit 0 |
| lint inside `npm run verify` | 0 errors, 3 pre-existing `ThemeProvider` warnings |
| typecheck inside `npm run verify` | pass |
| unit tests inside `npm run verify` | 174 files; 2635 passed; 2 skipped; 88.84s |
| `npm run verify:all` | exit 0 |
| production build inside `npm run verify:all` | pass (`built in 8.40s`) |
| Playwright inside `npm run verify:all` | 406 passed, 14 skipped, 4.4m |

GitHub checks on the repair tip are not claimed here. Re-read them on the pull request after push.

## G. Candidate identity

| Item | Value |
| --- | --- |
| Base | `2c484a2d0ce73fa4f52717773e93fb3ad1e917ef` |
| Branch | `fix/cqs-s04c-h4-post-merge-ci-status-wait` |
| Exact head | The commit that adds this file. Re-read `git rev-parse HEAD` on the pull request. |
| Pull request | Not opened at the time this sentence was written. Do not treat a predicted number as the candidate. |
| Checks | Not claimed. |
| Merge | Not performed. Auto-merge was not enabled by this task. |

## H. Preserved H4 invariants

Not changed:

- in-progress status `Saving the usable parts…` still happens before the library write returns;
- Discard, Keep, New Game, and conflicting import stay blocked while that write is in flight;
- after success, the status tells the truth that the unfinished draft was saved and the previous playable game was kept;
- the previous playable definition remains the library definition when this save does not compile;
- no premature final-success sentence was added;
- no save/discard race was reopened;
- accessibility of the status line is unchanged: same `aria-live="polite"` node;
- projector / `PublicState` files were not edited;
- H3 backup files were not edited.

## I. Known LOW issue

Unmodified. After a successful Keep, the collapsed **More detail about this file** note may still say nothing was saved. The primary status line remains the truthful outcome. This repair does not clear that note.

## J. Terminalization state

No H4 terminalization branch, commit, or pull request was created. `docs/STATUS.md`, `docs/handoff/CURRENT.md`, and `docs/plans/CQS-REAL-MVP-ARC.md` were not edited.

## K. Next owner decision

**Independent exact-head review of the bounded H4 post-merge CI repair pull request.**

Do not merge it from this closeout. Do not terminalize H4. Do not start H5, S04D, S05, or S06.
