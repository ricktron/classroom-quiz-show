# Court B black-box teacher run: brief and qualification fixture

- **Purpose:** the standing brief for a blind Court B BLACK-BOX TEACHER RUN
  ([`PRE-OWNER-FUNCTIONAL-QUALIFICATION.md`](PRE-OWNER-FUNCTIONAL-QUALIFICATION.md) §9.1).
- **Origin:** Court B triage CB-07 ([`../receipts/2026-10-16-cqs-court-b-clean-build-defect-triage.md`](../receipts/2026-10-16-cqs-court-b-clean-build-defect-triage.md)):
  an earlier brief required a Final journey but supplied only the Home demo game,
  which has no Final round.
- **Status:** test/harness guidance. Not an owner decision, not eligibility, not
  a recertification result.

## Starting content (the only content a tester is given)

Use the dedicated, synthetic, Final-capable qualification Game. Do **not** expand
or rely on the ordinary Home demo for qualification.

| File | Format | How a tester loads it |
| --- | --- | --- |
| [`fixtures/court-b-final-qualification.game.json`](fixtures/court-b-final-qualification.game.json) | Canonical game file | Home → Import Game → paste the file's text into "Game file text" → Import file text |
| [`fixtures/court-b-final-qualification.xlsx`](fixtures/court-b-final-qualification.xlsx) | Filled Board + Final spreadsheet | Home → Import Game → Import spreadsheet → choose the file |
| [`fixtures/court-b-image-clue.cqs-pack`](fixtures/court-b-image-clue.cqs-pack) | Portable pack with one image clue | Load either file above first, press Play to reach Class setup, then: More → Choose pack file |

Content: 2 teams, a 2 × 2 board, and a Final. All text is synthetic; no school,
class or student content. Host-only notes are marked "never projected".

The portable pack is separate starting content for the image-clue journey only
(CBJ-08). It is a Board-only game with one image clue and no Final, so it never
substitutes for the Final-capable fixture above. The spreadsheet format cannot
carry an image clue — the authoring contract has no image column — so an image
clue can only reach a tester through a pack, which is also how a teacher would
actually receive one. "Choose pack file" is an ordinary visible control on the
Host console under **More**; it is not an Advanced diagnostic, and reaching it
needs no test ids, routes or state injection.

Note the order: Home offers no direct way into the Host console until a game is
loaded, so a tester imports one of the two files above and presses **Play**
first. The pack then replaces the active game with its own. Everything after
that is ordinary clicking — there is no step where a tester has to type a route.

## Rules for the run

1. Begin at Home with an empty profile (ordinary launch; not a test harness entry).
2. Use visible and accessibility UI only. No `data-testid` navigation, no state
   injection, no route shortcuts, no Advanced diagnostics to make a route work,
   no source-code coaching.
3. Do not inspect implementation until the run record is frozen.
4. Record hesitation, unexpected routes, failed affordances, backtracking, and
   controls that appear to do nothing. Inability to discover a path is evidence.
5. Report every attempt; never retry to mask nondeterminism.
6. Simulated buzzers are not physical evidence. Physical Sony/Namtai behavior is
   a separate Q7 owner session.

## Journeys

Every journey below is mechanically proven reachable from the fixture before a
run (`tests/e2e/court-b-fixture-reachability.spec.ts`, guarded by
`src/test/courtBQualificationFixture.test.ts`). A journey that needs a Final is
never paired with content that has none.

| ID | Journey | Needs Final |
| --- | --- | --- |
| CBJ-01 | Import the game file and reach Class Setup | no |
| CBJ-02 | Import the filled spreadsheet and reach Class Setup | no |
| CBJ-03 | Names, Display and Start Game | no |
| CBJ-04 | Board clue: prompt, score, answer, Undo | no |
| CBJ-05 | Final: wagers, question, responses, reveal, settlement, winner | yes |
| CBJ-06 | Final tie: tied-finish completion | yes |
| CBJ-07 | Host reload + Resume during the Final | yes |
| CBJ-08 | Image clue from a portable pack: the projector shows the pack's image | no |
| CBJ-09 | Final response window runs out, then settlement and Undo still work | yes |
| CBJ-10 | Simulated Sony receiver: the supported profile connects | no |
| CBJ-11 | Simulated Sony receiver: a device that is not the supported profile is refused | no |

Adding a journey means adding it here, to `COURT_B_JOURNEYS` in
`src/test/courtBQualificationFixture.ts`, and a reachability test; the guard
fails otherwise.

### Notes on the four journeys added for the fresh Court B

- **CBJ-08** starts from the portable pack, not the shared fixture. What it
  measures is that the projector shows *the pack's* image. The authored clue
  path deliberately collides with an image that already ships in the build, so
  a projector that resolves the authored path before pack media hydrate paints
  a different clue's picture. A tester who sees a diagram that does not match
  the clue should record exactly that.
- **CBJ-09** requires the Final response window to actually RUN OUT. A tester
  simply waits out the 30 seconds the fixture authors rather than locking
  responses early, then settles a team and uses Undo. The reachability spec
  advances a controlled page clock to reach the same expiry deterministically,
  and only after the ordinary UI has opened the window.
- **CBJ-10 and CBJ-11** use a simulated receiver at the platform boundary.
  **The run operator supplies it; you cannot create one.** If your run was not
  set up with a simulated receiver, these two rows are not yours to perform —
  record them as "not supplied" and move on. Do NOT record them as a route you
  could not discover: that would report an apparatus gap as a product defect.
  Real Sony/Namtai hardware is explicitly out of scope here (rule 6).
  Simulation is not physical evidence (rule 6). Their purpose is the
  teacher-visible contract either side of that boundary: the exact supported
  profile reaches a connected state (CBJ-10), and a device that is not the
  supported profile is refused rather than silently accepted (CBJ-11).

## Other ordinary teacher actions

A blind run is not only the journeys above. These are things a teacher does on a
normal school day, and they carry the same weight: do each through visible
controls and report what you actually saw.

The journey table exists because each row is mechanically proven reachable from
the fixture. These actions are not in that table — they are ordinary product
workflows, not fixture-dependent routes — so they are listed here rather than as
`CBJ-nn` rows.

- **A second class period.** After playing at least one clue and scoring a team,
  find the control that starts a new class session on the same game. Then look
  hard at what the NEW class inherits: are tiles the previous class already won
  still playable at full value? Does "Last score change" still name the previous
  class's award, with Undo still offered for it? Does the session summary report
  the previous class's figures? A new class should begin with a clean ledger.
  Reload the page after the reset and check again.

- **More than one buzzer on a team.** With the receiver connected, map several
  handsets to the SAME team and at least one to a different team. Check the team
  rows and the live buzz line: do they name all of the buzzers mapped to a team,
  or only one? Press each handset and confirm the team that lights up is the team
  that buzzer belongs to.

- **Let a BOARD clue's response timer run out.** Not the Final — a board clue.
  Run the response timer to expiry, then try Undo. Does Undo reach the real
  teacher action, or does it get stuck on an inert "time up" entry?

- **Delete a saved game when you have two.** Get a second game into the library,
  then delete a specific one that is NOT first in the list. Confirm the one you
  chose is gone and the other survives.

- **Act the instant the app starts.** Reload and immediately, before the app has
  settled, use a control that changes something — type a name, score a team,
  press a game control. Then check whether what you did actually took effect. A
  control that looks usable but silently discards the action is a defect.

- **Display presence after a host reload.** With the projector window open,
  reload the host. Then close the projector window and watch the host's Display
  status. Does the host still claim a display is connected when none is?

- **Mid-game, check the scores on the setup screen.** Once a team has points,
  leave gameplay with `Back to setup`. Read the scores that screen shows for each
  team, word for word, and say whether they match what the class actually has.
  Then return to gameplay and confirm the real scores are still there. A setup
  screen reporting zeros for a class that has points is a defect even though
  nothing is lost.

- **Watch every team's status while you judge the Final.** With at least two
  teams in the Final, reveal and judge the FIRST team and note what the projector
  shows for it; then reveal and judge the SECOND team and look at the first team
  again. A team the class already watched be judged must not go back to looking
  as though its turn has not come. With three teams, check the earlier two after
  judging the third.

- **On a tie, quote the summary verbatim.** After accepting a tie, write down
  EXACTLY what the session summary's completion context says and exactly what the
  standings rows say. Then say whether those words match what you saw happen. A
  summary describing a single winner while two teams sit on identical scores is a
  defect even if every number on screen is right.

## Non-claims

Reachability proves a route exists from the fixture. It does not prove the route
is discoverable by a teacher, which is what the blind run measures.
