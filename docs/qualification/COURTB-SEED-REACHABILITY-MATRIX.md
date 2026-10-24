# Court B seed reachability matrix

**Status:** run apparatus and protocol. Not an owner decision, not eligibility,
not a recertification result.

**Audience: run operator only. Never hand this file, or a link to it, to a
blinded tester.** It maps seed identity to the route that exposes it, which is
exactly the prior a blinded tester must not have. Nothing in the repository links
here, deliberately, for the same reason nothing tester-facing links
[`COURTB-RUN-MANIFEST.md`](COURTB-RUN-MANIFEST.md): the tester-facing brief must
not reach either. These two operator files do reference each other, which is
intended — an operator needs both. An operator arrives here from the campaign
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

**The seed-site column names a FILE, never a line.** Liveness figures were
first measured on candidate `282a06f9770f54f6a3e27894bbb0edcb007d25c0`, and
every active row was re-exercised clean-vs-seeded at
`090e2dea1e156a913ef32092709e88643edc89a1`; line
numbers move with any later change, which is why the table records none. (The S6
caveat below does cite two line numbers, because it is recounting expressions
that were tried and discarded — those lines describe code that no longer exists
and are history, not a site to re-locate.)
Before a run, re-locate each site within its named file on the actual candidate
and re-confirm its liveness evidence. A seed that no longer compiles, or that
compiles but goes green, is `INVALID` and must be re-expressed or replaced before
any build is served. The file and the described semantics are the durable part of
each row.

### The two gates, recorded separately

A seed is Court-B eligible only when BOTH are `YES`:

- **TEST-LAYER LIVE** — the mutation compiles at the candidate and fails the
  repository's own detectors. This proves the seed is a real defect.
- **INSTRUCTION-LAYER DISCRIMINATING** — a blinded teacher following the EXACT
  tester-facing wording has been *directly demonstrated* to produce observably
  different teacher-visible outcomes on clean and seeded builds.

The second gate is the one the previous apparatus lacked, and it is not
satisfied by a unit-test failure, a browser-spec failure, a bundle difference,
a compile success, or seed-site identity. Those are all liveness evidence. Three
originally declared seeds were live and still had to be retired because no
tester wording could separate the builds.

Figures below were measured at candidate
`090e2dea1e156a913ef32092709e88643edc89a1`, where every active row was exercised
clean-vs-seeded through visible teacher UI. Re-locate each site within its named
file on the actual candidate before a run; a seed that no longer compiles, or
that compiles but goes green, is `INVALID` and must be re-expressed or replaced
before any build is served.

| Seed | Seed site (file) | Semantic defect | TEST-LAYER LIVE | Teacher-visible discriminator (exact) | INSTR. DISCRIM. | Brief action | Apparatus | Stop condition |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| S1 | `src/state/reducer.ts` | award/deduction credits the first team instead of the scored one | YES — 6 unit failures | clean: target "Beta" selected → Beta's row moves, "Last score change: Beta +100". seeded: the button still reads "to Beta, giving 100" but **Alpha's** row moves and the ledger says Alpha | **YES** | CBJ-04, scoring a NON-first team | none | — |
| S2 | `src/state/sanitize.ts` | Final answer public at responses-locked, before explicit reveal | YES — 3 unit + browser (M40) | clean: projector reads "Responses locked", answer absent. seeded: projector renders "Final answer" / "Final answer revealed" with the answer text | **YES** | CBJ-05 / CBJ-09, between locking responses and Reveal | none | observation **must** precede Reveal; after Reveal both builds look alike |
| S3 | `src/sync/displayPresence.ts` | Display presence lie after Host reload | YES — 3 unit failures | clean: host says not open **13 ms** after the display closes. seeded: host **claims open through ~4.3 s**, correcting at ~4.9 s. "Focus display" = claims open; "Open display" = not open | **YES** | extra: display presence after a host reload | none | **self-heals in ~5 s**; a yes/no check made later sees both builds healthy. Elapsed time must be recorded |
| S4 | `src/host/TeamNameSelectionBoard.tsx` | typed name not reported until blur — first Start activation lost | YES — 11 browser failures | clean: second name typed, field still focused → "✓ Ready", `Start Game` enabled. seeded: "1 of 2 named", `Start Game` disabled, "Team Nimbus still needs a name" | **YES** | CBJ-03 names, Display and Start Game | none | **heals on blur**; Start Game must be read while the field still has focus |
| S5 | `src/state/events.ts` + `src/state/reducer.ts` | Final Undo buried by response-window expiry | YES — 5 integrity + browser | clean: Undo reads "Undo response timer start". seeded: Undo reads "Undo response **time up**" | **YES** | CBJ-09, after the Final window runs out | none | must be read **before settling a team**; settlement pushes a new Undo target on top |
| S6 | `src/summary/deriveSessionSummary.ts` | tied completion summarized as a unique winner | YES — 1 unit failure | clean summary: "Completion context: **Final accepted tied finish**". seeded: "Completion context: **Final unique-winner completion**" while the standings directly below list BOTH teams "Tied for 1st" on equal scores. Standings are byte-identical on both builds | **YES** — see caveat | CBJ-06 tie **plus** the brief's "On a tie, quote the summary verbatim" step | none | — |
| S7 | `src/state/reducer.ts` | reset leaks the prior class's score ledger | YES — 6 unit + 7 browser | clean: after reset the ledger reads "**No score change yet.**". seeded: "**Last score change: Team Nimbus +100 (full credit)**" — the prior class's award survives, shown under the default team name | **YES** | extra: a second class period, then reload | none | observation (A) "looks reset" passes on BOTH builds; only (B) the stale ledger line discriminates. They must be asked separately |
| S8 | `src/input/gamepadMapping.ts` | a pressed handset resolves to the FIRST binding on its controller, so a buzz is credited to the wrong team | YES — 1 unit + 2 browser | with Buzzer 1 + Buzzer 3 on one team and Buzzer 2 on another, pressing **Buzzer 2** on an armed clue: clean "**Active team Bravo**" (the team Buzzer 2 was mapped to). seeded "**Active team Alpha**" (the first buzzer's team), with the same saved mapping and the same "Receiver connected" state | **YES** | extra: more than one buzzer on a team | **simulated receiver (operator supplies) — must expose ≥3 distinguishable handsets with ≥2 mappable to ONE team and ≥1 mappable to a DIFFERENT team; without the differently-mapped handset there is nothing to misroute** | **routing, not label**: the seed mutates `resolveGamepadBinding` (press resolution), so the team ROW LABEL is byte-identical on both builds and must NOT be used as the discriminator. The handset pressed must be one mapped to a team OTHER than the first buzzer's, or both builds name the same team |
| S9 | `src/state/events.ts` + `src/state/reducer.ts` | board response-timer expiry becomes reversible | YES — 11 unit + 2 browser | clean: Undo reads "Undo timer start". seeded: Undo reads "Undo **time up**". Visible timer state identical on both ("Time up", "Not armed") | **YES** | extra: let a BOARD clue's response timer run out | none | the **label** must be READ, not the control pressed: Undo is latest-only, so pressing it steps past the expiry and then shows the real action on both builds. Must be read before judging the response or any later action. Keep distinct from S5 (Final window) |
| S12 | `src/routes/HomeRoute.ts`/`HomeRoute.tsx` | Library Delete removes the stored-first game, not the chosen one | YES — 1 unit + 3 browser | with the Court B fixture imported first and the demo second, deleting the **hero / big card at the top** (the demo): clean — the chosen hero title disappears and "Court B Final Qualification" remains, durable across reload. seeded — the chosen hero title **survives** and "Court B Final Qualification" is deleted instead | **YES** | extra: delete one of two saved games, chosen by title | none | the target MUST be the hero / most-recent big card. The seed removes the stored-first entry, which at this candidate is the OLDER game, so choosing the non-hero makes the seed delete the very entry the teacher chose and both builds look identical |
| M26 | `src/input/keyboardAdapter.ts` | every fresh mapped keyboard buzz press is ignored | YES — 9 unit failures | clean: one fresh `1` → "Active team: **Alpha**", "Alpha buzzed in.". seeded: same press → "**Nobody has buzzed yet**" | **YES** | extra: buzz in on an armed clue with the keyboard | none | mutant also rejects auto-repeat (`key-held`), so holding or re-pressing cannot accidentally succeed |
| M04 | `src/library/gameLibrary.ts` | authoring Save reports success but writes nothing durable | YES — lower layer 2 + browser 19 | clean: "Saved", and Home's entry heading carries **the tester's own title**; survives reload. seeded: "Saved", the chosen title occurs **0×**, and the entry heading still reads "**New Game**" | **YES** | extra: make a new game, give it a distinctive title, save it | none | checking that "a Library row exists" is **vacuous** — a stub row exists on both builds. The check is which title the row carries |
| M01 | `src/routes/HomeRoute.tsx` | Home `Resume class` stays enabled but is inert | YES — 2 unit failures | clean: `Resume class` → `#/host`, class restored. seeded: stays at app root, `h1` still "Home"; a second press changes nothing | **YES** | extra: leave a class running, then come back to it | none | **no timing window** — the unfinished-class banner is persistent and the tester confirms it before acting |

## Corrections at `d8c212eaabc5eeb0f95b49743bb4cc57dd449485`

Two rows above were re-exercised clean-vs-seeded on this candidate before a run
and were found to name the WRONG teacher-visible surface. Both are
tester-wording defects in the apparatus. Neither seed was changed, and no
product behaviour changed: in each case the mutation is live and the instruction
pointed a blinded teacher at a surface the mutation cannot affect.

**S8 — the discriminator is routing, not the row label.** The seed mutates
`resolveGamepadBinding`, which resolves a PRESSED control to a binding; dropping
the `buttonIndex` equality makes any press on that controller resolve to the
FIRST binding on it. The team ROW LABEL is rendered from the team's own bindings
(`controls.map(controlLabel).join(' · ')` in `GamepadInputHostPanel`) and is
therefore untouched. Measured with Buzzer 1 + Buzzer 3 on one team and Buzzer 2
on another, the saved mapping identical on both builds:

| observation | clean | seeded | |
| --- | --- | --- | --- |
| team row label | `Buzzer 1 · Red · Buzzer 3 · Red` | `Buzzer 1 · Red · Buzzer 3 · Red` | identical — **not** a discriminator |
| press Buzzer 2 on an armed clue | `Active team Bravo` | `Active team Alpha` | **discriminates** |

The previous text named the row label as the discriminator and explicitly
forbade buzz routing. That was exactly inverted, and a Court B run started on it
would have returned S8 "healthy" from every tester.

**S12 — the target must be the hero, not a non-hero card.** The seed deletes the
stored-first library entry, which at this candidate is the OLDER game, not the
most recent. Measured with the Court B fixture imported first and the demo
second (the order the brief produces):

| chosen target | clean | seeded | |
| --- | --- | --- | --- |
| non-hero (`Court B Final Qualification`) | chosen deleted | chosen deleted | identical — **not** a discriminator |
| hero (`Earth & Space Science Board`) | chosen deleted, other remains, stays gone after reload | chosen **survives**, the other game is deleted instead, still so after reload | **discriminates** |

The previous text instructed the tester to avoid the hero and carried a stop
condition asserting that deleting the hero "makes both builds behave
identically". Both were inverted. Tester-facing wording describes the visible
hero / big card and its exact title; it never refers to storage position.

Method note: these were measured against frozen served builds through visible
and accessible controls only. `data-testid` was used solely to EXTRACT an
already-visible string, never to navigate and never to make a route work.

### Retired as BLACK-BOX-UNSUITABLE (history)

These three were originally declared, were genuinely **live**, and were retired
only because the instruction-layer gate failed: a blinded teacher following the
brief could not separate clean from seeded. They are recorded so the reason is
not lost, and they are **not** to be re-described as valid black-box seeds.

| Retired | TEST-LAYER LIVE | Why the instruction layer failed | Replaced by |
| --- | --- | --- | --- |
| S10 — WebHID accepts any Sony device | YES (CBJ-11 + 3 unit) | needed the simulated receiver, and the discriminating state is a device-identity decision a teacher cannot see | M26 |
| S11 — projector paints the build asset before pack hydration | YES (CBJ-08) | on the 2026-10-17 run the fixtures carried no image clue, so no tester could walk the route. An image-clue pack is now committed and `CBJ-08` is live, so the route EXISTS at this candidate — but S11 has never been put through the instruction-level gate, and an untested route is not an eligible seed. Retired on that ground, not on reachability | M04 |
| S13 — startup action loss on host boot | YES (3 unit + 12 browser) | needs action inside an unverifiable boot window; a late tester cannot know they were late, and "not reached" is not evidence of health | M01 |

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

**Resolved at `090e2dea` — S6 passes the instruction layer.** The seeded
completion screen contradicts itself in a single view: "Completion context:
**Final unique-winner completion**" sits directly above standings listing BOTH
teams as "Tied for 1st" on identical scores. Clean and seeded standings are
byte-identical, so that one line is the only difference, and the brief's "On a
tie, quote the summary verbatim" step already requires the tester to read both
strings together. No operator knowledge is needed to see the contradiction, and
no fifth expression was created.

## Preconditions an operator must satisfy before claiming a row

### The simulated receiver (S8) — a RUN precondition

**S8 is observable only through the simulated receiver.** Its route is "more
than one buzzer on a team", and what it measures is which team a PRESS is
credited to — not how the team rows are labelled. S10 shared that dependency and has since been
retired as black-box-unsuitable, so S8 is now the sole seed dependency; the
`CBJ-10` / `CBJ-11` journeys asked of every tester still need the receiver as
well. The brief tells a receiver-less tester to record these as "not supplied"
rather than as a route they could not discover, so on a receiver-less run those
rows have no route a tester is permitted to walk.

The installation mechanism is not incidental: `navigator.hid` is a non-writable
accessor in this Chromium, so the fake boundary must be installed with
`Object.defineProperty` and must fail loudly. Plain assignment fails silently and
leaves the product reading the real boundary — the exact fault that made S8
unexercisable on the 2026-10-17 run. The manifest records the required
pre-run proof.

This file does NOT resolve that by dropping a seed. The population is declared
in [`COURTB-RUN-MANIFEST.md`](COURTB-RUN-MANIFEST.md) and only there, it is fixed
at 14 = 1 clean + 13 seeded, and that file's Completion rule makes a short
population unreportable — so a matrix that quietly shrank it would produce a run
that can never complete. An earlier revision of this section said "S8 must not be
seeded into that population", which was wrong for exactly that reason.

Retiring S10 and S11 did not shrink the population either: each was replaced,
one-for-one, from the existing Court A register.

The manifest now carries the correct form as a **run precondition**: a run set up
without a simulated receiver MUST NOT START. That keeps the 14 intact and matches
this file's own standard above — every one of the 13 declared seeds must be
REACHABLE *before* a run starts, and on a receiver-less run two of them are not.

A tester who reports "not supplied" on a run that WAS set up with a receiver is
reporting an apparatus fault, not a finding: that row is `INVALID` and is
re-declared under a fresh build code with a fresh tester.

### S13 — retired; recorded here because the reasoning still applies

S13 has since been **retired as black-box-unsuitable** and replaced by M01,
whose precondition is a persistent banner with no timing window. The reasoning
is kept because it is the clearest statement of why an unverifiable precondition
disqualifies a route, and the same test applies to any future candidate seed.

S13 differed in kind from the receiver case: nothing needed supplying, but the
tester had to act before the app had settled, which they cannot verify they
achieved. The
brief asks for the two discriminating observations — was the control disabled
when first reached, and did the action survive once settled — and instructs the
tester to record the action as **not reached** if the app had already loaded.

**Stop condition, keyed on the REPORT, not on the seed** (the operator cannot
know which build carries S13 until the mapping is unsealed, and attribution is
frozen before that): a row whose tester reports the startup action **not
reached** is not evidence that the build is healthy. Mark it `INVALID` — the
manifest's `INVALID` causes now include a "not reached" report for the only
action that discriminates a build — and re-declare it under a fresh build code
with a fresh tester. If two successive testers cannot reach the state, classify
S13 unsuitable for black-box Court B and replace it from the register rather than
leaving a row nobody can land.

Residual risk, stated because it is irreducible: a tester who was late and did
not notice reports "(a) enabled, (b) took effect", which reads as a pass. The
two-observation wording narrows this; it does not eliminate it.
