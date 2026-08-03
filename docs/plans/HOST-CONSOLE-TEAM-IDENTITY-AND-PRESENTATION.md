# Host Console, Team Identity, and Presentation

- **Document id:** `CQS-PLAN-CONSOLE-IDENTITY`
- **Slice:** `CQS-PLAN-S01` (planning-only) · **Date:** 2026-08-03
- **Status:** Explanatory planning view for `CQS-ARC-IDENTITY` and
  `CQS-ARC-OPERATOR` — **authorizes no implementation**

Canonical decisions:
[`../decisions/EXPANDED-VISION-OWNER-DECISIONS.md`](../decisions/EXPANDED-VISION-OWNER-DECISIONS.md)
(`CQS-OD-012`, `CQS-OD-057`, `CQS-OD-063`…`CQS-OD-077`); architecture
lineage: clauses `CQS-RA2-TEAM-ORDER-01`, `CQS-RA2-SECONDARY-01`,
`CQS-RA2-CONTROLLER-01` in
[`../decisions/ROADMAP-AMENDMENT-002-expanded-gameplay-vision.md`](../decisions/ROADMAP-AMENDMENT-002-expanded-gameplay-vision.md);
deferral dossiers: `CQS-OPP-HOST-CONSOLE`, `CQS-OPP-LOAN-MODE`,
`CQS-OPP-TEAM-IDENTITY`, `CQS-OPP-PRESENTATION-EFFECTS` in
[`POST-MVP-OPPORTUNITY-AND-TRIGGER-REGISTER.md`](POST-MVP-OPPORTUNITY-AND-TRIGGER-REGISTER.md).

The current implementation's host surface is a set of stacked functional
panels; none of the console, identity, or presentation capabilities below
exists.

## 1. Future host console (`CQS-OD-012`; §14 direction)

The post-MVP plan proposes a one-screen live console with:

- persistent game, round, and phase status; projector connection status;
  timer and arming status; controller status;
- a persistent team score-and-state rail; the active respondent; the full
  **private** queue;
- the current clue workspace: prompt, answer, alternates, notes, and the
  **exact projected state** (what the class sees right now);
- **one emphasized next action** with phase-specific controls and
  collapsible detail;
- the timer-expiry decision popup (§10.2); safe host overrides
  (`CQS-OD-024`); an emergency blank/conceal control; undo; recovery;
- expandable diagnostics; import/export; persistence tools.

Normal host operation is guided by context and never requires knowledge
of engine internals. The console is a re-presentation of existing host
capabilities — it introduces no new authority and no new public state by
itself.

## 2. Logical teams vs. physical controllers (§10.5; `CQS-RA2-CONTROLLER-01`)

Even if all four physical Buzz handsets must be powered or paired for
stable hardware operation (the bounded OADL2-S07 keep-alive finding), CQS
preserves **two-, three-, and four-team games**. A physical controller is
**assigned**, **parked**, **diagnostic-only**, or **unavailable**. A
parked controller produces no gameplay command and creates no logical
team. Physical identity never crosses the adapter boundary; one active
controller per team for now (`CQS-OD-040`), multi-controller teams
preserved as `CQS-OPP-MULTI-CONTROLLER-TEAMS`.

## 3. Controller-operated identity setup (§10.6)

Normal identity setup requires **no host interaction after launch**. Each
active team, on its own controller:

1. sees four complete identity packs (`CQS-OD-067`);
2. chooses with one of the four secondary (ordinal) buttons;
3. uses the primary red button to redraw only its own choices;
4. previews the selection (`CQS-OD-073`);
5. confirms or returns;
6. optionally refines the identity through controller-driven steps
   (`CQS-OD-075`);
7. becomes **Ready**.

Active teams choose simultaneously (`CQS-OD-068`); pools and final
identities stay unique within the session (`CQS-OD-069`). There is no
forced setup timeout; the host may skip an unfinished team
(`CQS-OD-074`). The host launches the phase, monitors readiness, skips,
resets, or applies emergency defaults — but does not normally choose or
approve identities. A recurring team sees **"Keep our identity"**
alongside three new choices (`CQS-OD-076`); session-specific is the
default lifetime (`CQS-OD-064`/`CQS-OD-070`).

**Normal completion is controller-only.** When every active logical team
has confirmed an identity and reached **Ready**, identity setup advances
automatically — with no host Continue action — unless the host has
deliberately paused the phase, reset a team, or invoked an emergency
override. This preserves the rest of the model unchanged: no forced
timeout (`CQS-OD-074`), the host keeps skip/reset/emergency-default
powers, and the host still does not normally select or approve
identities. No button mappings beyond the decided primary-redraw and
ordinal-choice roles are defined here.

This flow is the natural **first consumer** of the inert ordinal
secondary actions (`CQS-RA2-SECONDARY-01`) — its authorization is what
defines their durable vocabulary for this use.

## 4. Identity packs (§10.7)

A pack may contain: a humorous course-relevant team name; an accessible
palette; a mascot or icon; a short buzz sound; an entrance animation; a
correct-answer celebration; a victory celebration. Pools combine
game-specific options (LLM workbooks may carry a large candidate pool,
`CQS-OD-063`/`CQS-OD-077`) with approved CQS fallbacks, prioritizing
course-relevant options.

Names must be: school-safe, relevant, short, pronounceable,
non-stereotyping, readable, distinct, and **not answer-revealing**.

## 5. Presentation effects (§10.4)

Team cards may use animation, sound, score counting, status transitions,
celebrations, optional buzz sounds, and optional leaderboard movement
between rounds and at game end (`CQS-OD-034`) — while normal gameplay
keeps stable authored positions (`CQS-OD-033`, implemented rule).

Hard requirements, recorded now and binding on any future implementation:

- **Presentation completion never becomes authoritative game-state
  input.** No animation, sound, or transition ever gates a command,
  event, score, timer, or reveal.
- Reduced-motion support; mute and volume controls; no dependency on
  flashing; accessible contrast; text or icon state indicators in
  addition to color.
- Sound assignment belongs to a team or presentation profile, never to a
  physical key, controller, handset, or button (the standing buzz-sound
  direction in [`../handoff/CURRENT.md`](../handoff/CURRENT.md) remains
  in force, including its licensing boundaries).
- Stale snapshots, replay, refresh, reconnect, and undo never replay old
  audio or animation.

## 6. Operator workflow and Loan Mode (§17; `CQS-OD-057`)

Designed now; activation `architecture-preserved` (design) /
`parked` (implementation, `CQS-OPP-LOAN-MODE`). Future operators: other
teachers, substitutes, club sponsors, after-school groups.

Simplified workflow: connect projector → connect and test controllers →
select or import a game → confirm active teams → run a practice input
test → start → follow the highlighted next action.

Future Loan Mode may: hide advanced settings; lock configuration; prevent
accidental deletion; show only safe host actions; provide controller-test
guidance and a practice clue; provide recovery guidance; create a session
archive automatically (depends on `CQS-OPP-HISTORICAL-ARCHIVE`); restore
defaults when complete. Loan Mode is **not implemented and not current
MVP**.
