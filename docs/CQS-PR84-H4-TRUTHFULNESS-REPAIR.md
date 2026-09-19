# CQS PR #84 — H4 truthfulness repair

Bounded repair of the two findings from the independent review of `8f976c2c996f0daceb9730c96cbb4b406e544002`.

This file does not mark H4 terminal and does not rewrite `docs/CQS-PR84-H4-EXACT-HEAD-REVIEW.md`. That review still records the pre-repair verdict. This repair does not authorize merge.

## A. Candidate identity

| Item | Value |
| --- | --- |
| PR | https://github.com/ricktron/classroom-quiz-show/pull/84 |
| Branch | `feat/cqs-real-mvp-s04c-h4-corrupt-import-salvage-ux` |
| Reviewed head | `8f976c2c996f0daceb9730c96cbb4b406e544002` |
| Base / `origin/main` | `f5fcd5b77031cccdc5195eace803003f073d3658` |
| Repaired head | The commit that adds this file. Re-read `git rev-parse HEAD` on the pull request. Do not treat a chat summary as a substitute for that read after any later push. |
| Authorization | `AUTHORIZE-CQS-REAL-MVP-S04C-H4-PR84-TRUTHFUL-SAVE-AND-REPLACEMENT-REPAIR-1` |

The historical review note `docs/CQS-PR84-H4-EXACT-HEAD-REVIEW.md` stays local and is not part of this commit.

## B. Finding 1 root cause

Keep called `saveAuthoringDraftToLibrary` and set `busy`, which disabled Keep but not Discard. Discard always announced “That import was discarded. Nothing was saved.” and bumped the import serial. The save could still commit. The stale-success path only refreshed My Games, so the false sentence remained on the live status line.

## C. Finding 1 repair

`salvageSaveInFlight` is set synchronously before the library write and cleared only after the result has been turned into teacher-facing state.

While that flag is set:

- Discard returns without changing copy.
- Keep cannot start a second save.
- New Game, Import file text, Import demo, Import spreadsheet, and the replace buttons do not start a competing write. Those buttons are also `disabled` while `busy` is true.
- Home status and the review say “Saving the usable parts…”.

After success, the status says the draft was saved, then navigation happens only for a newly playable game or an unfinished draft that did not keep a previous playable game. A late Discard cannot replace that sentence, because the flag stays set until the sentence is stored.

After a failed save, the review stays, Keep and Discard are available again, and the failure message is the persistence message. Discard may then say nothing was saved, because that operation did not commit.

If the write throws, the status says saving did not finish and tells the teacher to check My Games. It does not say nothing was saved.

There is no abort API on the persistence adapter. The repair does not pretend to cancel a write that has started.

## D. Finding 2 root cause

`saveAuthoringDraftToLibrary` keeps the previous playable `GameDefinition` when the new draft does not compile (`lastPlayableOrStub`). Spreadsheet replace already says “The previous playable game was kept.” Salvage Keep said the saved game was not ready to play, which described the draft as if the playable game were gone.

## E. Finding 2 repair

Library behavior is unchanged. When the saved result is playable and this save did not compile, Home stays put and both the status line and the review say:

`Saved “{title}”. The previous playable game was kept. Open the editor to finish this import.`

The review is the existing persisted unfinished-draft note, with **Open to finish**. That matches the spreadsheet sentence, with “Saved” because the teacher chose Keep. The draft is not called playable. The previous game is not called deleted.

If there is no previous playable game, the older sentence remains: the saved game is not ready to play until the missing parts are finished. That case is a stub, so the sentence matches the library.

## F. Tests

`src/routes/HomeRoute.test.tsx`

- `does not let discard claim nothing was saved while keep is still saving` — deferred `savedDefinitions` transaction; Discard and a second import click cannot change the saving sentence; after release the draft exists and the editor opens without a “nothing was saved” claim.
- `keeps the salvage review when saving fails and then allows a truthful discard` — failed write leaves the review; Discard then truthfully says nothing was saved; the library has no game.
- `says the previous playable game was kept when an unfinished salvage replaces it` — seeded playable `board-game` remains playable with its original answer; the unfinished draft is stored; the status names the previous playable game and does not use the “not ready to play until you finish the missing parts” sentence.

`src/host/ImportSalvagePanel.test.tsx`

- `disables discard while a keep is saving` — Keep and Discard are disabled, and the saving sentence is visible.

## G. Preserved invariants

Not changed by this repair:

- no invented academic content
- `importGameFromJsonText` still the only playable gate
- `valueAuthored: false` versus an authored `0`
- old drafts that omit `valueAuthored`
- safety scan, unknown version, and unknown round fail-closed behavior
- media and id rules
- projector / `PublicState` (no display files changed)
- keyboard: native `disabled` buttons, no focus trap; the saving sentence is on the existing polite status line
- H3 backup schema and restore (no backup files changed)

## H. Verification

Run in this worktree on the repaired source, before this documentation’s final wording was the only remaining edit. `git diff --check` is re-run on the commit tree.

| Check | Result |
| --- | --- |
| Focused `HomeRoute.test.tsx` and `ImportSalvagePanel.test.tsx` | PASS, 21 tests |
| `npm run verify:all` | PASS, exit 0 |
| lint inside that run | PASS, 0 errors, 3 pre-existing ThemeProvider warnings |
| typecheck inside that run | PASS |
| unit tests inside that run | PASS, 174 files, 2635 passed, 2 skipped |
| build inside that run | PASS |
| Playwright inside that run | PASS, 406 passed, 14 skipped |

`npm run verify` was not a second process. Its lint, typecheck, and unit-test commands are the prefix of that `verify:all` run and passed there.

GitHub checks on the repaired head are not claimed in this section. Section I is filled from GitHub after push.

## I. PR state

Observed before this push: PR #84 was non-draft, `MERGEABLE` / `CLEAN`, auto-merge off, at the reviewed head. After push, re-read head, mergeability, and checks. Do not treat the pre-push CLEAN state as the repaired head’s checks.

Auto-merge was not enabled.

## J. Next action

Fresh independent exact-head review of the repaired PR #84 tip.

Do not merge from this repair. Do not start H5 or any other frontier.
