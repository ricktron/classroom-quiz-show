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
| CBJ-03 | Names, Display and Start Game (read `Start Game` BEFORE opening the Display — see note) | no |
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

### Notes on the journeys

- **CBJ-04** — score a team that is **not** the first team in the list, and check
  that the points land on the team you actually chose and on no other. Scoring
  the first team cannot tell you whether the award went where you aimed it,
  because the right answer and the wrong answer look the same.
- **CBJ-03** — type the second team's name and then, **while that field still
  has focus and before you click anywhere else**, look at `Start Game`. With
  both names typed it should be usable. If it is still greyed out, or the screen
  still says a team needs a name, report that — and report it before clicking
  away, because clicking elsewhere can repair the display and hide what you saw.
- **CBJ-05 and CBJ-09** — watch the projector during the window between locking
  responses and pressing Reveal. Nothing about the answer may reach the class
  before you reveal it. This is the only moment that measures it: once you press
  Reveal the answer is public on purpose, so a check made afterwards cannot tell
  a leaking build from a correct one.

### Notes on the four journeys added for the fresh Court B

- **CBJ-08** starts from the portable pack, not the shared fixture. What it
  measures is that the projector shows *the pack's* image. The authored clue
  path deliberately collides with an image that already ships in the build, so
  a projector that resolves the authored path before pack media hydrate paints
  a different clue's picture. A tester who sees a diagram that does not match
  the clue should record exactly that.
- **CBJ-09** requires the Final response window to actually RUN OUT. A tester
  simply waits out the 30 seconds the fixture authors rather than locking
  responses early. **Then look at Undo straight away, before settling anybody.**
  Read what the Undo control offers to reverse and report that wording: it should
  name a real thing you did, such as starting the response timer. If it instead
  offers to undo the time running out, report that. Settling a team first puts a
  new action on top of the one this measures, so the order matters.

  This Undo reading comes FIRST, at the moment the window runs out — before you
  record anybody's response and before you lock. Recording and locking are
  themselves actions, and each one becomes the newest thing Undo offers to
  reverse, which hides what this step measures. The projector check belongs
  later, once you have locked and are on your way to Reveal. The reachability spec
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
  find the control that starts a new class session on the same game. Then answer
  these as TWO SEPARATE questions, and report both — a build can pass the first
  and fail the second:

  **(A) Is the new class actually reset?** Scores back to zero, progress back to
  the start, tiles the previous class won playable again at full value.

  **(B) Is there any trace of the previous class's scoring left?** Read the
  "Last score change" line specifically. A new class should say there has been
  no score change yet. A line still naming the PREVIOUS class's award — possibly
  under a default team name, since the new class is not named yet — is a defect
  even if (A) looked perfect. Also check whether Undo is still offered for it and
  whether the session summary reports the previous class's figures.

  Reload the page after the reset and check both again.

- **More than one buzzer on a team.** With the receiver connected, press RED on
  each handset so the host lists them all. Then use **exactly these
  assignments**: map **Buzzer 1** and **Buzzer 3** to the SAME team, and map
  **Buzzer 2** to a DIFFERENT team. Save the mapping, check it saved, and write
  down which team you gave each buzzer. Use these buzzer numbers as given — a
  different arrangement can hide what this action measures.

  Now start the game, open a clue and arm it. Press **each** of Buzzer 1,
  Buzzer 2 and Buzzer 3 **once**, on its own fresh armed clue, and after each
  press write down which team the host names as the active team.

  Every press must name the team you mapped THAT buzzer to. Buzzer 2 is the one
  to watch hardest: it is on its own team, so if the team holding Buzzer 1
  becomes active when you press Buzzer 2, that is the finding — report which
  handset you pressed, which team you had mapped it to, and which team the host
  actually named.

  Reading the team rows is worth reporting as well, but it is not what this
  action measures: a row can name every buzzer you mapped and the presses can
  still go to the wrong team.

  This needs the simulated receiver, which **the run operator supplies and you
  cannot create**. If your run was not set up with one, record this action as
  "not supplied" and move on. Do NOT record it as a route you could not
  discover: that would report an apparatus gap as a product defect.

- **Buzz in on a clue with the keyboard.** Open a clue, show the prompt, and arm
  it. Before pressing anything, confirm the host shows the clue armed, shows
  keyboard buzzing as on, and shows that nobody has buzzed yet. Note which key
  belongs to which team.

  Now press one team's buzz key **once**. Which team becomes the active team? A
  single fresh press of a mapped buzz key must buzz that team in. If the host
  still says nobody has buzzed, that is the finding — and say that the clue was
  armed and keyboard buzzing was on when you pressed, so it is clear the press
  should have counted.

- **Make a new game and save it.** From Home choose `New Game`. In the editor,
  replace the game's title with a distinctive one you invent — something no
  fixture would use — and write it down. Press `Save` and note exactly what the
  screen says. Then go back to `Home` and look at your list of games: is there an
  entry whose title is **the one you typed**?

  An entry still showing its old default name, or no entry carrying your title
  anywhere on the page, is a defect even though the editor said it saved.
  Checking only that "there is a game in the list" is not enough — there will be
  one either way. Reload the page and look once more.

- **Let a BOARD clue's response timer run out.** Not the Final — a board clue.
  Run the response timer to expiry. **Then, before you judge the response or do
  anything else, read what the Undo control offers to reverse and write that
  wording down.** It should name something you actually did, such as starting
  the timer. If it instead offers to undo the time running out, report that
  exact wording.

  Do not press Undo to find out: pressing it can quietly step past the entry and
  then show you the right one, so what the control SAYS before you touch it is
  the observation. Judging the response first also replaces that wording with
  your judgement, so the order matters. Once you have written the wording down
  you are free to press Undo and report what it actually did — this only asks
  you not to press it *instead* of reading it.

- **Delete a saved game when you have two.** Both files you were given import as
  the same game, so they make one library entry, not two. Get a second, distinct
  entry with the Home control **`Import demo game`**. Use that control for this
  action and not `New Game`: a brand-new game has no rounds yet, so it does not
  become the big card at the top and this check would measure nothing.

  Before you delete anything, look at the **big card at the top** — the one the
  page presents first, under "Most recent playable". It should now be the demo
  game you just added, **not** either of the two files you were given. If it is
  not, stop and report that instead; the rest of this action will not mean
  anything.

  Now choose that big card as your target, **by its visible title**, the way a
  teacher would. Write that title down, and write down the title of the other
  game too. On that big card itself, open `More`, choose `Delete`, then
  `Confirm delete game`.

  Say which title actually disappeared and which survived, then reload and check
  again. The game you chose must be gone and must stay gone. If the title you
  chose is still there — and the OTHER game is the one that vanished — that is
  the finding; report both titles. A deletion that removes a game the teacher did
  not choose is a defect even though the screen says the delete succeeded.

- **Leave a class running, then come back to it.** With a class in play (at
  least one clue opened), leave the app and open it again so you land on Home.
  Home should tell you an unfinished class session is waiting and offer to
  resume it.

  First confirm, before pressing anything, that you can see that offer and that
  the control is not greyed out. Then press it. Where does it take you?
  Resuming must put you back in the class you left, with its board and scores.
  Staying on Home, with the same offer still showing, is a defect — press it a
  second time and say whether anything changed.

- **Display presence after a host reload.** With the projector window open,
  reload the host. Then close the projector window and **watch the host's
  Display status from the instant you close it**, without doing anything else.

  Report how long the host goes on claiming a display is connected, in seconds.
  "Focus display" means it believes one is open; an offer to "Open display"
  means it knows none is. A host that corrects itself immediately is right. A
  host that keeps claiming a display for several seconds after you closed it is
  the finding — and it will eventually correct itself, so a check made a while
  later cannot tell the two apart. Say what you saw and when.

  If you did not manage to watch from the moment you closed it — you looked away,
  or you were busy — record this action as **not reached** rather than as
  healthy. Being late is an apparatus limit, not evidence the build is correct.

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
