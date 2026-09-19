# CQS REAL MVP S04C-H4 — Corrupt-import salvage UX

Candidate closeout for `CQS-REAL-MVP-S04C-H4-CORRUPT-IMPORT-SALVAGE-UX`.

This file records the implementation candidate. It does **not** mark H4 terminal, merged, or reviewed. `docs/STATUS.md`, `docs/handoff/CURRENT.md`, and `docs/plans/CQS-REAL-MVP-ARC.md` are unchanged on purpose: those files must not claim an open pull request is current program status.

## A. Candidate identity

| Item | Observed value |
| --- | --- |
| Base / `origin/main` | `f5fcd5b77031cccdc5195eace803003f073d3658` (`docs: mark CQS REAL MVP S04C-H3 terminally complete (#83)`) |
| Branch | `feat/cqs-real-mvp-s04c-h4-corrupt-import-salvage-ux` |
| Worktree | Fresh branch from that `origin/main`. Not the stale H2 checkout. |
| Exact head | The commit that adds this file. Re-read `git rev-parse HEAD` on the pull request; do not treat a chat summary as the head. |
| Pull request | Non-draft PR opened from this branch after push. URL is not knowable inside the commit that creates the branch tip. Delivery records the URL after `gh pr create`. |
| Stability | Not merged. Auto-merge not enabled. H4 is not terminal. |
| Authorization | `AUTHORIZE-CQS-REAL-MVP-S04C-H4-CORRUPT-IMPORT-SALVAGE-UX-1` |

## B. H4 contract reconstructed from canon

Governing goal: validate, explain, salvage only what the file already contains, and let the teacher finish the rest — without inventing academic content.

Reconstructed contract:

- Imported bytes stay untrusted. Extension, filename, MIME, and source reputation are not trust.
- `importGameFromJsonText` remains the only path to a trusted `GameDefinition`. Salvage does not accept a partial game and does not weaken that function.
- A failed but structurally safe `classroom-quiz-show/game` schemaVersion 1 file may become an existing `AuthoringDraft`. The teacher must choose **Keep usable parts** before that draft is saved.
- Automatic preservation copies only values the source already has, including valid identifiers, text, integer point values, team names, valid team accents, and valid same-origin images.
- Missing or ambiguous academic meaning stays blank and is labeled as the teacher’s job. It is not synthesized.
- An incomplete draft is not playable. Promotion still goes through draft validation and canonical import (`approveAndImportDraft` / `importGameFromJsonText`).
- Transport, parse, format, version, and safety failures fail closed. Nothing is saved and no draft is built.
- The Import Quality Report still classifies and does not repair. When a salvage review is showing, the report sits behind “More detail about this file.”
- Spreadsheet import already saved unfinished drafts. H4 explains that saved unfinished state. It does not add a second workbook repair engine.
- Game content and Session state stay separate. Salvage does not restore, create, or infer a class session.
- No new persistence domain. The correction surface is the existing authoring draft and editor.
- Cancellation of an unsaved JSON review discards the in-memory review and writes nothing. Closing a note about an already-saved spreadsheet draft does not claim the save was undone.
- Out of scope: backup schema, migrations, restore salvage, rollback, wipe/replace-all, pack salvage, H5+, display/sleep, live-follower publication, S04D–S06, hardware, signing, release.

No new ADR. ADR-004 already requires one validation pipeline, supplied identifiers, and no silent repair. This tranche follows that decision; it does not replace it.

## C. Salvage taxonomy

Supported game-file classes only. Pack files are deferred.

| Failure class | Disposition |
| --- | --- |
| Fully valid canonical game | Not salvage. Existing save/replace path. Unchanged. |
| Unreadable JSON, non-object root, empty input, oversized input | Fail closed. No draft. |
| Missing/unsupported format or schema version, including workbook bytes presented as a game file | Fail closed. No conversion. Spreadsheet stays on the spreadsheet path. |
| Unsafe document (prototype pollution keys, cycles, non-finite numbers, excess depth, truncated issue list, internal/construction failure) | Fail closed. No draft. |
| Missing `rounds` array, or no usable question/answer/category text at all | Fail closed. No invented board. |
| Second category board or second Final | First kept. Later rejected so content is not mixed. |
| Unknown round type | Rejected. Not copied. |
| Unknown extra keys, including a session blob | Omitted. Not kept as game or session state. |
| Valid clue beside an invalid sibling clue | Valid clue preserved. Invalid sibling rejected or left for the teacher, depending on the defect. |
| Missing question, answer, or category title where the row still has other usable text | Teacher correction. Blank field. No invented text. |
| Missing or non-integer / out-of-range point value | Teacher correction. `valueAuthored: false`. Placeholder `0` is not shown as an authored value. No guessed points. |
| Over-long text | Kept in full and flagged. Not silently truncated. |
| Duplicate identifier | First valid id kept. Later duplicate rejected. Not rebound to a new id. |
| Missing id (undefined), not an invalid id | Derived with the existing authoring id helpers, in file order, and disclosed. Invalid ids are rejected, not rewritten. |
| Missing game id | In-memory review id `import-review` only. On explicit keep, `applyFreshLibraryIdentity` assigns `game-${clock}` so another saved game is not overwritten by guesswork. |
| Malformed choice/alternate lists | Usable string alternates kept. The rest dropped and disclosed. Not invented. |
| Unknown round semantics / unusable multiplier | Rejected or omitted. Not replaced with a default gameplay meaning. |
| Valid same-origin image with alt, caption, and attribution inside limits | Preserved. |
| Invalid image path or incomplete image | Picture dropped. Alt kept as question text when the file supplied it. |
| Invalid team accent | Omitted. Not substituted with another color. |
| Final present, no board, but Final has usable text | One empty category column so the existing board-plus-final draft can hold Final. Column title and clue are blank. Disclosed as not invented questions. |
| Final title missing | Labeled “Final” as a product label, disclosed as not a question or answer. |
| Multiple independent errors on one item | Each is classified. One failure does not discard a sibling field that is already valid. |
| Portable pack / zip salvage | Deferred. Pack import stays fail-closed on its existing path. |
| Backup/restore salvage, migration, rollback, wipe | Deferred. H3 untouched. |

## D. Implementation

Workflow:

1. Teacher pastes game-file text or chooses a spreadsheet on Home.
2. JSON still calls `importGameFromJsonText` first. Success uses the existing save/replace path and clears any salvage review.
3. Failure calls `analyzeCorruptGameImport`. Fail-closed copy, or a correction review. Nothing is written on the correction path until **Keep usable parts**.
4. Keep saves an `AuthoringDraft` through `saveAuthoringDraftToLibrary`. If canonical compile succeeds on that save, the message says the game is ready to play. Otherwise the message says it is not ready until the missing parts are finished, and Home opens the existing editor.
5. A library id conflict does not overwrite. The keep action becomes **Replace the existing saved game** only after that conflict.
6. Spreadsheet parse failure is fail-closed (“did not guess at the missing rows”). A saved unfinished workbook shows **Open to finish** / **Close this note**, because the draft is already durable.
7. A newer import increments `importSerial` and drops stale async results. If keep already saved before that supersede, the library list is refreshed and the newer review is left in place. The UI does not claim the newer import undid the save.

State ownership:

- Unsaved JSON review lives in Home component state. It does not survive reload. Discard writes nothing.
- Saved drafts use the existing library draft record. They become a playable game only when compile/canonical import accepts them.
- Missing point values use `DraftClue.valueAuthored`. Compile refuses any clue with `valueAuthored === false`. The editor shows “Value needed” and an empty number field.

Canonical boundary:

`untrusted text → safety/parse via existing import → salvage analysis → teacher review → existing draft save → existing draft validation/compile → importGameFromJsonText`.

Salvage is not executable authority. It does not render imported markup as HTML.

Persistence:

- JSON salvage: no write until keep, and not on follower or persist-gate failure.
- Workbook: existing immediate save of a validated authoring draft. H4 only explains unfinished results.
- IndexedDB backup atomicity, backup schema version, and restore are unchanged.

## E. Academic-content safety

The implementation refuses to invent:

- question text
- answer text
- alternate accepted answers
- category names
- round type or scoring meaning
- point values
- media associations that the file did not validly state
- team colors outside the existing accent set
- identifiers that would attach a row to different content
- session/class state

Tests in `src/import/salvage.test.ts` cover a valid file staying on the canonical path, missing answers, missing point values, unknown rounds, session blobs, duplicate ids, fresh library ids, unsafe media, and unsupported workbook versions. The Home test keeps a corrupt file out of the library until Keep, then checks the reopened draft does not contain fabricated question or answer text and is not playable until it can pass canonical validation.

## F. UX/UI and accessibility

Host Home only. The projector is not given this review.

Teacher language answers what was kept, what still needs the teacher, and what was not kept. Counts are in an `aria-live="polite"` line. Long lists sit in native `details` with a scroll cap. Quality-report detail is progressive disclosure while a review is open.

Fail-closed actions say nothing was saved. Unsaved correction actions are **Keep usable parts** and **Discard this import**. Already-saved workbook notes do not use the discard wording.

Focus moves to the review heading when it appears, and back to the import heading on dismiss, discard, or close. Controls are native buttons. Imported text is React text, not HTML. A panel test checks that a hostile string is not turned into an image.

Keyboard operation is the existing button/details behavior. This is repository evidence only. It is not a physical screen-reader qualification.

Editor copy for a missing value is “Value needed” and “Classroom Quiz Show will not guess one.”

## G. Tests and verification

Actually run on this worktree:

| Check | Result |
| --- | --- |
| `git diff --check` | Exit 0 on the tree that includes this closeout, immediately before commit. |
| `src/import/salvage.test.ts` | 9 passed inside `npm run verify` |
| `src/host/ImportSalvagePanel.test.tsx` | 3 passed inside `npm run verify` |
| `src/routes/HomeRoute.test.tsx` | 14 passed in isolation, and again inside `npm run verify` |
| `npm run lint` | Exit 0. 0 errors. 3 pre-existing `react-refresh/only-export-components` warnings in `src/theme/ThemeProvider.tsx`. Not introduced here. |
| `npm run typecheck` | Exit 0 |
| `npm run test:run` | 174 files passed, 2631 tests passed, 2 skipped, inside both `verify:all` and the later `verify` |
| `npm run build` | Passed inside `npm run verify:all` (exit 0). Not re-run after the four-line stale-save refresh. That line does not change the build graph. |
| `npm run test:e2e` | 406 passed, 14 skipped, inside `npm run verify:all`. No new Playwright spec. Existing import-pipeline specs still passed, including malformed JSON loading nothing. |
| `npm run verify:all` | Exit 0 on the tree immediately before the stale-save refresh (`persistence.refreshLibrary()` when keep finishes after a newer import). |
| `npm run verify` | Exit 0 after the stale-save library refresh. Lint 0 errors, typecheck clean, 174 files, 2631 passed, 2 skipped. |

An earlier `npm run verify:all` failed two HomeRoute tests (`shows teacher-first library actions…` timeout; `lets the leader create a game…` did not see the editor probe). The same file then passed in isolation (14/14). The following full `verify:all` passed those tests. Classified as load contention, not an H4 logic failure, because isolation and the second full run both passed and `onNewGame` was not part of the salvage change.

Sonar Quality Gate is not a job in `.github/workflows/ci.yml`. Not run. Not claimed.

GitHub Actions CI for the pull request is not a local check. Section J must not be read as CI green until GitHub is observed.

## H. Semantic review

Trust: salvage runs only after canonical import has already failed, and only when safety scan, format, and schema version already passed. It does not execute file contents.

Invention: blank academic fields, rejected duplicate ids, omitted unknown rounds, dropped unsafe media, and unguessed point values match section E.

Validation authority: compile refuses unauthored values. A kept draft that still has blockers stays a non-playable stub. `importGame.ts` was not given a permissive mode.

Lifecycle: review state is Home-local. Discard of an unsaved review increments the import serial, clears quality state, and writes nothing. Persisted workbook close does not say “nothing was saved.” A keep that lands after a newer import still refreshes the library if the write succeeded.

Persistence: no backup schema, migration, rollback, or wipe changes. No IndexedDB atomicity change.

Privacy: review is on private Home. Imported strings are text nodes. No network upload. No local filesystem path is added to projector state. Session blobs in a game file are not imported as session state.

Accessibility: native controls, labelled section, live counts, focus move. Not a physical assistive-technology pass.

Scope: no H5, S04D, S05, S06, display/sleep, live follower, hardware, signing, or release work. Pack salvage explicitly deferred. No new dependency.

Documentation: this closeout only. Startup status files were not edited.

## I. Evidence boundaries

- Local qualification is the checks in section G, on the macOS development machine, against the fresh worktree.
- No Windows physical qualification.
- No hardware or controller qualification.
- No screen-reader physical pass.
- No claim that GitHub CI, mergeability, or Sonar passed at authoring time.
- Pack salvage, backup salvage, and migration remain undone.

## J. PR state

Filled from GitHub after push. Until that observation exists, this section means: pull request not yet merge-evaluated by this file.

- Exact head: re-read on the PR.
- CI workflow: `.github/workflows/ci.yml` jobs `verify` (lint, typecheck, unit tests, build) and `e2e` (Playwright). Desktop workflow is separate and was not required to claim H4.
- Sonar: not configured in this repository’s GitHub workflows.
- Mergeability: not claimed here.
- Merge and auto-merge: not performed.

## K. Remaining concerns

- A keep that completes after a newer import refreshes My Games but does not announce that older save in the newer import’s message. The library row is the durable evidence. There is no dedicated test that interleaves the two async operations.
- Final-only files gain one empty category column because the current draft model has no Final without a board. The column is blank and disclosed. It is structural, not academic content, but a reviewer should confirm that empty slot is acceptable.
- Derived ids for *missing* ids use existing authoring helpers. Invalid ids are rejected. Reviewers should confirm that distinction stays obvious in the teacher copy.
- Workbook unfinished drafts are still saved before the teacher reads the note. That is the pre-H4 spreadsheet contract, not a new silent repair.
- Portable-pack corrupt salvage is not in this tranche.
- `valueAuthored` omitted means “authored,” including a deliberate 0. Only explicit `false` means “not authored.” Re-saves of old drafts are unchanged.
- The first full-suite HomeRoute failure was load flake, re-proven by isolation and a later green `verify:all`. It is not a product defect, but it is real local timing noise.

## L. Next action

Independent exact-head review of the H4 candidate.

Do not merge from this implementation task. Do not start H5 or any later frontier.
