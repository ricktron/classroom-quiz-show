# Court B seed reachability matrix

**Status:** run apparatus and protocol. Not an owner decision, not eligibility,
not a recertification result.

**Audience: run operator only. Never hand this file, or a link to it, to a
blinded tester.** It maps seed identity to the route that exposes it, which is
exactly the prior a blinded tester must not have. Nothing in the repository links
here, deliberately, for the same reason
[`COURTB-RUN-MANIFEST.md`](COURTB-RUN-MANIFEST.md) is unlinked: the
tester-facing brief must not reach it. An operator arrives here from the campaign
brief or from this directory.

Companion to [`COURTB-RUN-MANIFEST.md`](COURTB-RUN-MANIFEST.md), which declares
the population; this file proves each declared seed is REACHABLE before a run
starts.

Purpose (Phase 9): the previous Court exposed that the tester brief supplied
usable routes for only part of the declared seed population. Every one of the 13
declared seeds must be **REACHABLE** — i.e. produce a teacher-visible
consequence through an ordinary supported workflow that the brief actually asks
a tester to perform — before a new Court B starts.

Liveness evidence below is from the repository's own detectors at the candidate
under test. "Brief action" names the step in the tester-facing brief
(journeys `CBJ-01..11`, or the bullets under "Other ordinary teacher actions" in [`COURT-B-BLACK-BOX-BRIEF.md`](COURT-B-BLACK-BOX-BRIEF.md)).

**Seed sites below name a FILE, never a line.** Every figure in this file was
measured on candidate `282a06f9770f54f6a3e27894bbb0edcb007d25c0`; line numbers in
that candidate move with any later change, which is why none are recorded here.
Before a run, re-locate each site within its named file on the actual candidate
and re-confirm its liveness evidence. A seed that no longer compiles, or that
compiles but goes green, is `INVALID` and must be re-expressed or replaced before
any build is served. The file and the described semantics are the durable part of
each row.

| Seed | Seed site (file) | Semantic defect | Teacher-visible consequence | Brief action that reaches it | Clean expected | Defective expected | Self-test | Status |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| S1 | `src/state/reducer.ts` | deduction/award debits the first team instead of the scored one | the points land on the wrong team's scoreboard row | CBJ-04 board clue: score a NON-first team | score appears on the team selected | score appears on team 1 | 6 unit failures | REACHABLE |
| S2 | `src/state/sanitize.ts` | Final answer public at responses-locked, before explicit reveal | the class sees the Final answer while teams are still being adjudicated | CBJ-05 / CBJ-09: watch the projector between locking responses and Reveal | projector shows no answer until Reveal | answer visible at responses-locked | 3 unit + browser (M40) | REACHABLE |
| S3 | `src/sync/displayPresence.ts` | Display presence lie after Host reload | Host claims a projector is connected when none is | extra: display presence after a host reload (close the display window) | flips to "Display not open" within seconds | keeps claiming a display is open | 3 unit failures | REACHABLE |
| S4 | `src/host/TeamNameSelectionBoard.tsx` | typed name not reported until blur — first Start activation lost | typing both names leaves Start Game disabled / the first press does nothing | CBJ-03 names, Display and Start Game | Start enables as names are typed | Start stays disabled until blur | 11 browser failures | REACHABLE |
| S5 | `src/state/events.ts` + `src/state/reducer.ts` | Final Undo buried by response-window expiry | after the window runs out, Undo cannot reach the settlement | CBJ-09: let the Final window RUN OUT, settle a team, then Undo | Undo reaches the settlement | Undo offers an inert "time up" | 5 integrity + browser | REACHABLE |
| S6 | `src/summary/deriveSessionSummary.ts` | tied explicit end names the first leader Winner | the completed summary reports a single-winner completion for a game that ended tied | CBJ-06 tie **plus** the brief's "on the tie run, quote the summary verbatim" step | "Final accepted tied finish", both teams tied | "Final unique-winner completion" AND "Final resolution path: Unique winner", with two teams on equal scores | 1 unit failure (`classifies accepted tied finish`) | REACHABLE — see caveat |
| S7 | `src/state/reducer.ts` | Reset this class session leaks the prior class's ledger | the new class inherits the previous class's "Last score change" / ledger | extra: a second class period, then reload | new class starts with a clean ledger | stale "Last score change" from the previous class | 6 unit + 7 browser; DETECTED by a blinded tester in the validation slice | REACHABLE (proven) |
| S8 | `src/input/gamepadMapping.ts` | team row names only the first mapped Buzzer | a buzzer mapped to a team lights the wrong team | extra: more than one buzzer on a team; press each handset | each buzzer lights its own team | all handsets on a controller light one team | 1 unit + 2 browser | REACHABLE **only on a run with the simulated receiver** — see precondition below |
| S9 | `src/state/events.ts` + `src/state/reducer.ts` | board response-timer expiry becomes reversible | after a board timer runs out, Undo is stuck on an inert "time up" | extra: let a BOARD clue's response timer run out, then Undo | Undo walks back to the real teacher action | Undo offers the expiry | 11 unit + 2 browser | REACHABLE |
| S10 | `src/input/webHidTransport.ts` | WebHID accepts any Sony device as the receiver | a device that is not the classroom receiver is adopted as if it were | CBJ-11 with the unsupported profile | refused; stays "needs attention" | reports Connected | CBJ-11 + 3 unit | REACHABLE |
| S11 | `src/display/MediaContentDisplay.tsx` | projector paints the hosted build asset before pack media hydrate | the projector shows a diagram that is not the clue's picture | CBJ-08 image clue from the portable pack | pack's own image for the clue opened | a different clue's shipped diagram paints first | CBJ-08 | REACHABLE |
| S12 | `src/routes/HomeRoute.tsx` | Library Delete removes the first game, not the chosen one | the wrong saved game disappears | extra: delete one of two saved games (not the first) | the chosen game goes | the first game goes | 1 unit + 3 browser | REACHABLE |
| S13 | `src/host/useHostPersistence.ts` | startup action loss on host boot | a control looks usable at startup and silently discards the action | extra: act the instant the app starts | controls are disabled until ready; the action takes effect | the action is accepted then discarded | 3 unit + 12 browser | REACHABLE |

## S6 caveat, recorded in full

S6 took four expressions. The first three could not have been detected by any
tester, and two Court rows were lost to that before it was understood:

1. `leaders.length >= 1` at `deriveSessionSummary.ts:180` — **inert**. The
   accepted-tie path returns earlier, so for an accepted tie that branch is
   unreachable. It compiled and changed nothing observable.
2. `classifyFinalResolutionPath` returning `'unique-winner'` — changed a summary
   FIELD only. A blinded tester read "Completion context: Final accepted tied
   finish" with "Tied for 1st / Tied for 1st" and correctly judged the build
   fine.
3. `const tied = false` at line 284 — dropped the "Tied for" prefix, but both
   teams still ranked 1st and the completion context still said tied. A blinded
   tester read "1st Granite 300 / 1st Nimbus 300" and again correctly judged it
   fine.
4. Suppressing the accepted-tie classification together with
   `uniqueLeaders(...).slice(0, 1)` — the completed summary reports
   **"Final unique-winner completion"** for a game that ended with two teams on
   identical scores. That contradiction IS teacher-visible.

**Answer to Phase 8's question:** YES — the declared S6 defect can produce a
teacher-visible consequence through an ordinary supported workflow, but ONLY in
the completed summary. In this codebase the live tie UI and the projector derive
from Final state, not from the summary, so they continue to say "tie" correctly.
S6 is therefore the quietest seed in the population and is reachable only
because the brief now explicitly instructs:

> On a tie, quote the summary verbatim. … A summary describing a single winner
> while two teams sit on identical scores is a defect even if every number on
> screen is right.

No artificial route and no state injection was created for it, and it was not
replaced: the declared defect is genuinely expressible, and a tester who reads
the summary — which the brief now requires — can see it.

**Outstanding before Court B starts:** the third limb of the Phase 8 self-test
(a blinded tester reaching the route from the brief without knowing the seed) is
NOT yet proven for S6. It must be demonstrated on a seeded S6 build in the new
population, and if a fresh blinded tester reads that summary and still judges the
build correct, S6 is to be classified unsuitable for black-box Court B and
replaced from the register rather than re-expressed a fifth time.

## Preconditions an operator must satisfy before claiming a row

Two rows are reachable only under a condition the apparatus does not create by
itself. A run that does not meet the condition cannot count that row.

- **S8 requires the simulated receiver.** Its route ("more than one buzzer on a
  team") cannot be walked without one, exactly as `CBJ-10`/`CBJ-11` cannot. The
  brief now carries the same escape hatch for it: a tester with no receiver
  records "not supplied" rather than reporting an apparatus gap as a product
  defect. **If a run is set up without a simulated receiver, S8 must not be
  seeded into that population** — there is no route for it, and a build nobody
  can judge is not a valid row.

- **S13 can be missed without the miss being visible.** Its route asks the tester
  to act before the app has settled, which they cannot verify they achieved. The
  brief now asks for the two discriminating observations (was the control
  disabled when first reached; did the action survive once settled) and instructs
  the tester to record the action as **not reached** if the app had already
  loaded.

  **Stop condition, as for S6:** if a blinded tester on a seeded S13 build
  reports the action "not reached", that row is NOT evidence that the build is
  healthy and must not be counted as a miss against the tester. Re-run it with a
  fresh build code and a fresh tester. If two successive testers cannot reach the
  state, classify S13 unsuitable for black-box Court B and replace it from the
  register rather than leaving a row nobody can land.
