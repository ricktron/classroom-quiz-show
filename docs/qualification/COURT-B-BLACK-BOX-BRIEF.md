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
| [`fixtures/court-b-image-clue.cqs-pack`](fixtures/court-b-image-clue.cqs-pack) | Portable pack with one image clue | Host → More → Choose pack file |

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
| CBJ-10 | Simulated Sony receiver: supported profile connects, wrong device refused | no |

Adding a journey means adding it here, to `COURT_B_JOURNEYS` in
`src/test/courtBQualificationFixture.ts`, and a reachability test; the guard
fails otherwise.

### Notes on the three journeys added for the fresh Court B

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
- **CBJ-10** uses a simulated receiver at the platform boundary. Simulation is
  not physical evidence (rule 6). The journey's purpose is the teacher-visible
  contract: the exact supported profile reaches a connected state, and a device
  that is not the supported profile is refused rather than silently accepted.

## Non-claims

Reachability proves a route exists from the fixture. It does not prove the route
is discoverable by a teacher, which is what the blind run measures.
