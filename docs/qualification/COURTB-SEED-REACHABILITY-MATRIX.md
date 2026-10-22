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
(journeys CBJ-01..11, or the ordinary-teacher actions in `extra-actions.md`).

**Seed sites are cited by file and line as measured on the candidate named
above. Line numbers move.** Before a run, re-locate each site on the actual
candidate and re-confirm its liveness evidence; a seed that no longer compiles,
or that compiles but goes green, is `INVALID` and must be re-expressed or
replaced before any build is served. Treat the file and the described semantics
as the durable part of each row, never the line number.

| Seed | Semantic defect | Teacher-visible consequence | Brief action that reaches it | Clean expected | Defective expected | Self-test | Status |
| --- | --- | --- | --- | --- | --- | --- | --- |
| S1 | deduction/award debits the first team instead of the scored one | the points land on the wrong team's scoreboard row | CBJ-04 board clue: score a NON-first team | score appears on the team selected | score appears on team 1 | 6 unit failures | REACHABLE |
| S2 | Final answer public at responses-locked, before explicit reveal | the class sees the Final answer while teams are still being adjudicated | CBJ-05 / CBJ-09: watch the projector between locking responses and Reveal | projector shows no answer until Reveal | answer visible at responses-locked | 3 unit + browser (M40) | REACHABLE |
| S3 | Display presence lie after Host reload | Host claims a projector is connected when none is | extra: display presence after a host reload (close the display window) | flips to "Display not open" within seconds | keeps claiming a display is open | 3 unit failures | REACHABLE |
| S4 | typed name not reported until blur — first Start activation lost | typing both names leaves Start Game disabled / the first press does nothing | CBJ-03 names, Display and Start Game | Start enables as names are typed | Start stays disabled until blur | 11 browser failures | REACHABLE |
| S5 | Final Undo buried by response-window expiry | after the window runs out, Undo cannot reach the settlement | CBJ-09: let the Final window RUN OUT, settle a team, then Undo | Undo reaches the settlement | Undo offers an inert "time up" | 5 integrity + browser | REACHABLE |
| S6 | tied explicit end names the first leader Winner | the completed summary reports a single-winner completion for a game that ended tied | CBJ-06 tie **plus** the brief's "on the tie run, quote the summary verbatim" step | "Final accepted tied finish", both teams tied | "Final unique-winner completion" with two teams on equal scores | 1 unit failure (`classifies accepted tied finish`) | REACHABLE — see caveat |
| S7 | Reset this class session leaks the prior class's ledger | the new class inherits the previous class's "Last score change" / ledger | extra: a second class period, then reload | new class starts with a clean ledger | stale "Last score change" from the previous class | 6 unit + 7 browser; DETECTED by a blinded tester in the validation slice | REACHABLE (proven) |
| S8 | team row names only the first mapped Buzzer | a buzzer mapped to a team lights the wrong team | extra: more than one buzzer on a team; press each handset | each buzzer lights its own team | all handsets on a controller light one team | 1 unit + 2 browser | REACHABLE |
| S9 | board response-timer expiry becomes reversible | after a board timer runs out, Undo is stuck on an inert "time up" | extra: let a BOARD clue's response timer run out, then Undo | Undo walks back to the real teacher action | Undo offers the expiry | 11 unit + 2 browser | REACHABLE |
| S10 | WebHID accepts any Sony device as the receiver | a device that is not the classroom receiver is adopted as if it were | CBJ-11 with the unsupported profile | refused; stays "needs attention" | reports Connected | CBJ-11 + 3 unit | REACHABLE |
| S11 | projector paints the hosted build asset before pack media hydrate | the projector shows a diagram that is not the clue's picture | CBJ-08 image clue from the portable pack | pack's own image for the clue opened | a different clue's shipped diagram paints first | CBJ-08 | REACHABLE |
| S12 | Library Delete removes the first game, not the chosen one | the wrong saved game disappears | extra: delete one of two saved games (not the first) | the chosen game goes | the first game goes | 1 unit + 3 browser | REACHABLE |
| S13 | startup action loss on host boot | a control looks usable at startup and silently discards the action | extra: act the instant the app starts | controls are disabled until ready; the action takes effect | the action is accepted then discarded | 3 unit + 12 browser | REACHABLE |

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

> On the tie run, quote the summary verbatim. … A summary that describes a single
> winner while two teams sit on identical scores is a defect worth reporting,
> even if every number on screen is right.

No artificial route and no state injection was created for it, and it was not
replaced: the declared defect is genuinely expressible, and a tester who reads
the summary — which the brief now requires — can see it.

**Outstanding before Court B starts:** the third limb of the Phase 8 self-test
(a blinded tester reaching the route from the brief without knowing the seed) is
NOT yet proven for S6. It must be demonstrated on a seeded S6 build in the new
population, and if a fresh blinded tester reads that summary and still judges the
build correct, S6 is to be classified unsuitable for black-box Court B and
replaced from the register rather than re-expressed a fifth time.
