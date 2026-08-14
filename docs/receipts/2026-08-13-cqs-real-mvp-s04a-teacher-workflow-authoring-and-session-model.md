# CQS-REAL-MVP-S04A — teacher workflow, authoring, and session model

## Identity

- **Slice:** `CQS-REAL-MVP-S04A-TEACHER-WORKFLOW-AUTHORING-AND-SESSION-MODEL`
- **Program:** `CQS-REAL-MVP-1`
- **Authorization:**
  `AUTHORIZE-CQS-REAL-MVP-S04A-TEACHER-WORKFLOW-AUTHORING-AND-SESSION-MODEL-1`
- **Evidence-state ID:**
  `CQS-REAL-MVP-S04A-TEACHER-WORKFLOW-AUTHORING-AND-SESSION-MODEL-ES-1`
- **Kind:** teacher Home, in-app board authoring, Game/Session isolation,
  save trust, Import Quality Report, and local Generation Feedback.
  **Not** S04B theatrical team selection. **Not** S04C backup UX.
  **Not** S04D telemetry. **Not** a merge.
- **Date (America/Chicago):** 2026-08-13
- **Repository:** `ricktron/classroom-quiz-show`

This receipt records observed implementation evidence and explicit
non-claims. It does **not** contain a final candidate commit SHA, PR
number, or CI verdict. Those belong to the live GitHub PR and the
Program Orchestrator handoff.

Do not edit this receipt after exact-head review merely to write a PASS
at that same head.

## Starting base and fresh local provenance

| Fact | Observed |
| --- | --- |
| Expected canonical `origin/main` | `f96f9f38632174266398a9c12e7743e4bad8eae4` |
| Exact starting `origin/main` | `f96f9f38632174266398a9c12e7743e4bad8eae4` |
| Host | `Ricks-MacBook-Air.local` |
| User | `macdaddy` |
| cwd / Git toplevel | `/Users/macdaddy/Documents/Coding/Cursor Projects/classroom-quiz-show` |
| Delivery branch | `feat/cqs-real-mvp-s04a-teacher-workflow` created from that exact `origin/main` |
| Working tree at preflight | clean |
| Open PRs at preflight | none |
| Overlapping S04A mutation lanes | none |

## What was implemented

- Teacher-first Home at `#/` with New Game, Import Game, Recent/My Games,
  Play/Edit/Duplicate/Rename/Export/Delete, and Resume only when an
  unfinished class session exists.
- In-app category-board + Final editor on the existing `AuthoringDraft`
  authority. Spreadsheet remains the bulk path.
- Hard Game vs Session isolation: starting a session does not mutate the
  saved Game; Reset Session does not delete the Game; scores/progress/buzz
  /wagers stay session-only.
- Generation-gated save trust: Unsaved / Saving… / Saved / Save problem.
  Stale async completions cannot claim Saved.
- Import Quality Report classifications ERROR / WARNING / HEURISTIC from
  actual validators plus deterministic notices. No silent repair. No AI
  claim.
- Local Generation Feedback Markdown download. No network call.
- Saved-definition record **2** for optional draft JSON and opened-at.
  IndexedDB remains **4**. v1 records remain readable.
- Game-owned `teamNameBank` draft seam for later S04B. Not compiled into
  canonical schema v1.
- Bounded authoring undo/redo (50 snapshots). Not a general command bus.
- Board preview is the rehearsal path. It does not start a class session
  and does not write session history. A scored rehearsal session is
  deferred because it would need an active-session persistence bypass.
- Desktop Host window now opens `#/`. Play/HID remain `#/host`.
- Advanced diagnostics stay visually secondary. They were **not** hidden
  inside a closed `<details>` because the existing e2e harness requires
  those controls to remain reachable.

## Local verification observed on this worktree

| Command | Result |
| --- | --- |
| `git diff --check` | exit 0 |
| `npm run verify` | lint warnings only (pre-existing ThemeProvider fast-refresh); typecheck pass; **2474** unit tests passed / **2** skipped |
| `CI=1 npm run verify:all` | same unit result; production `vite` preview built in-process; Playwright **373** passed / **14** skipped. `reuseExistingServer=false` because `CI=1` |
| `npm run test:desktop` | desktop renderer+main built; **3** passed |

Playwright served-build provenance: `CI=1` forced
`reuseExistingServer: false` and `webServer.command` ran
`npm run build && npm run preview -- --port 4173 --strictPort` against
this worktree. That e2e run is exact-worktree evidence, not a later
candidate-head claim.

## Independent review repair (same S04A authorization)

Exact-head review of published candidate `395c280929d870a62064fc032f5ded0e6ae15c17`
returned **FAIL**. Root-family repairs in this worktree:

- Authoring writes are generation-gated: a stale overlapping
  `saveDefinition` is skipped, not only ignored in the UI. Save is
  disabled while `saving`.
- Home Play (`#/host?play=`) no longer marks success before
  `loadSaved` returns. Active-session replace requires an explicit
  confirm.
- Unsaved editor leave uses a HashRouter-safe hash guard. `useBlocker`
  was not used because it requires a data router and would crash
  authoring under ADR-001 `HashRouter`.
- Same-id JSON/spreadsheet import no longer auto-replaces. Replace
  requires an explicit confirm.
- Discard session, Reset Session, and Host library Delete are two-step.
- Home default status no longer dumps persistence-boot copy.
- Spreadsheet import is a real button that opens the hidden file input.
- `#/edit` without a game id tells the teacher to choose a game from Home.
- Unreadable `authoringDraftJson` is reported (`draftUnreadable`) instead
  of silently dropped.
- Editor quality copy does not claim a file import was accepted.

Those repairs invalidate the `395c280` review.

A later exact-head review of `eb9e7ac662a4378c0d45aeeddd178d9aa1b542ec`
still failed H2: a bubble-phase hash guard cannot stop `HashRouter` from
unmounting a dirty editor. This worktree switches the shell to
`createHashRouter` (same hash URLs as ADR-001) so `useBlocker` can stop
Back. Duplicate now allocates a new id instead of replacing `*-copy`.
Host recovery discard is two-step.

Those later repairs invalidate the `eb9e7ac` review.

Exact-head review of `10d096e5ea0f5fbf5f41f93a9007826863f71853` still
failed because Home/Host discard cleared the unfinished-session UI even
when the durable clear failed. This worktree keeps recovery visible until
`clearActiveSession` succeeds, surfaces invalid recovery on Home, and
blocks Play/Home while a save is in flight.

Those later repairs invalidate the `10d096e` review.

Exact-head review of `7dd785b55ab67ff48da874139ce09db3a0e47264` still
failed. Root-family repairs in this worktree:

- Incomplete authoring saves persist the draft beside the last successful
  compiled Game. They do not replace a playable compile with an empty stub.
  Export refuses an unplayable compiled record.
- Unavailable-storage discard no longer hides the unfinished-session surface
  or flips `bootPhase` to `ready`.
- Import Quality Report acceptance is `accepted` / `rejected` /
  `unfinished`. Spreadsheet drafts with errors are not “canonical import
  accepted.” Generation Feedback uses the same wording.
- Opening a durable game shows Saved. In-flight Saving… blocks unload.
  Authoring write exceptions become Save problem.
- Start new game session requires confirm when a class session is already
  open. Ordinary Host library/recovery copy uses product language.

Those later repairs invalidate the `7dd785b` review.

Exact-head review of `9d6d9a627cb7a3387faefaa7e780f97e054aa45e` still
failed. Root-family repairs in this worktree:

- Host library live copy uses product language (saved games / class session).
- Spreadsheet same-id conflict no longer claims the file was stored.
- Incomplete spreadsheet replace no longer claims “ready to play.”
  `compiledThisSave` is distinct from “a previous playable compile remains.”
- Host Load and Host JSON export refuse unplayable 0-round stubs.

Those later repairs invalidate the `9d6d9a6` review. A later exact-head
review must be obtained on the repaired candidate.

## Deferred with evidence

- Scored rehearsal session: would contaminate or require bypassing
  active-session persistence. Preview board is the cheap seam.
- Closed-by-default Advanced diagnostics disclosure: broke existing Host
  e2e helpers that look for `Initialize / reset session`. Left as a
  secondary visible section.
- S04B theatrical Sony team-name selection, 4-choice UI, Red cycling,
  and the 96-name deck algorithm.

## Explicit non-claims

- This receipt does **not** claim S04A is merged or Complete.
- It does **not** predict a PR number, squash SHA, or GitHub check PASS.
- It does **not** claim S04B/S04C/S04D/S05/S06 work.
- It does **not** claim physical Windows, projector, or Sony qualification.
- It does **not** claim a teacher-trusted signed release.
- It does **not** claim live AI, cloud, accounts, or sync.
