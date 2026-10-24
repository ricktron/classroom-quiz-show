# Receipt — Court B seed-route correction (S8, S12)

**Date:** 2026-10-23 (America/Chicago)
**Candidate:** `d8c212eaabc5eeb0f95b49743bb4cc57dd449485` (= `origin/main` at run start)
**Tree:** `241878731ca72dcbec4d80f5ac2ffa4d31e71490`
**Status:** historical evidence snapshot. Not an owner decision, not eligibility,
not a recertification result. Court B was **not** started.

## Scope

Pre-run seed-route freshness found two declared Court-B seeds whose
tester-facing wording named a surface the mutation cannot affect. Both are
apparatus defects. **No product code and no seed was changed.** This receipt
records the observed evidence behind the corrections in
[`../qualification/COURTB-SEED-REACHABILITY-MATRIX.md`](../qualification/COURTB-SEED-REACHABILITY-MATRIX.md).

## Environment

macOS 26.5.1 (25F80), arm64, 8 CPU; node v22.23.2; npm 10.9.8;
Playwright 1.61.1 (chromium-1208/1228 + headless_shell); Electron 43.4.0.
`CQS_SOURCE_SHA` and `GITHUB_SHA` unset for the ordinary source-identity proof.

## Apparatus (external run tooling, not in the repository)

| file | sha256 |
| --- | --- |
| `.rt/app.mjs` | `59b60236237fd76c3ffb94aa158b0384984ea980101624ab27f30945e2c1255b` |
| `.rt/receiver-sim.mjs` | `ba5a1622c93309c6a020a76b024846d94e51e702a8aeb1f2a1ac6c0bc035f609` |
| `.rt/serve.mjs` | `ae3709e3131d331dc3b395e7e0763e0bef3c29d30ec6f6624364cef5ab0560d2` |

Chromium behaviour depended on: `navigator.hid` is a **non-writable accessor**,
so the simulated receiver is installed with `Object.defineProperty` and its
guard fails loudly. Loud-failure check verified: with the simulator absent the
guard throws `CBJ-10 boundary is NOT the simulator` although `navigator.hid`
exists.

Receiver pre-run proofs on this candidate: **7/7 PASS** — marker installed;
product read the boundary (`getDevices=2 requestDevice=1 open=1`, 0 violations);
`Connect buzzers` reached "Buzzers connected" through ordinary UI; 4
distinguishable handsets / 20 buttons; unsupported profile offered and refused
(`openCalls=0`); plain assignment did **not** replace the accessor; removing the
simulator fails loudly.

Method: frozen built `dist/` per variant, each served by the run's own static
server and torn down after its pair; visible and accessible controls only;
`data-testid` used solely to EXTRACT an already-visible string, never to
navigate and never to make a route work.

## S8 — the discriminator is routing, not the team row label

The seed mutates `resolveGamepadBinding` (`src/input/gamepadMapping.ts`), which
resolves a **pressed** control to a binding. Dropping the `buttonIndex` equality
makes any press on that controller resolve to the first binding on it. All four
Sony slots share one `controllerIndex`, and `setSlotTeam` keeps associations
sorted by slot, so every press resolves to the binding of the LOWEST ASSIGNED
slot — slot 1 in this configuration because the route assigns it, not slot 1
unconditionally. The team row label is rendered independently from the team's own
bindings (`controls.map(controlLabel).join(' · ')` in `GamepadInputHostPanel`)
and is untouched.

The class teams were named **Alpha** and **Bravo** through ordinary setup before
the presses, so the "Active team" strings below are the names the operator typed;
the team-row keys are the fixture's own team ids (`granite`, `nimbus`).

Ordinary precondition established without state injection: receiver connected,
RED pressed on each handset, host read back "4 buzzers responding", assignments
block visible, Buzzer 1 + Buzzer 3 assigned to one team and Buzzer 2 to another
through the labelled selects, "Team mapping saved".

| observation | clean | seeded |
| --- | --- | --- |
| team row (granite) | `Buzzer 1 · Red · Buzzer 3 · Red` | `Buzzer 1 · Red · Buzzer 3 · Red` |
| team row (nimbus) | `Buzzer 2 · Red` | `Buzzer 2 · Red` |
| press **Buzzer 2** on an armed clue | `Active team Bravo` | `Active team Alpha` |

Row labels identical; routing diverges. The prior wording named the row label
and forbade routing, which was inverted.

## S12 — the target must be the hero, and the second entry must be the demo

The seed deletes `persistence.library[0]`. `listSavedDefinitionRecords`
(`src/persistence/savedDefinitions.ts`) sorts the returned list by **title**
(`localeCompare`), tie-broken by `gameId`, so `library[0]` is the entry whose
TITLE sorts first — not the oldest, not the most recent, and not a function of
import order. "Court B Final Qualification" sorts before the demo's
"Earth & Space Science Board" (`Import demo game` imports
`CANONICAL_SAMPLE_CATEGORY_BOARD_FILE`, id `imported-sample-board`) and before a
`New Game`'s "New Game", so the fixture is `library[0]` in every arrangement this
action produces on its own (see the third-entry caveat below).

These S12 measurements used a **two-entry** library. A third entry whose title
sorts before "Court B Final Qualification" would be deleted instead on the seeded
build; the chosen hero still survives, so the route still discriminates, but the
"what was deleted instead" column would differ.

Second entry added with `Import demo game`:

| chosen target | clean | seeded |
| --- | --- | --- |
| non-hero `Court B Final Qualification` | chosen deleted; demo remains | chosen deleted; demo remains |
| hero `Earth & Space Science Board` | chosen deleted; `Court B Final Qualification` remains; still so after reload | chosen **survives**; `Court B Final Qualification` deleted instead; still so after reload |

Second entry added with `New Game` (why the brief now forbids it here):

| chosen target | clean | seeded |
| --- | --- | --- |
| hero (which is `Court B Final Qualification`, the only *playable* entry) | chosen deleted | chosen deleted |

## Seed liveness on this candidate

All 13 declared active seeds were re-located by pattern in their named files,
applied, compiled, and failed the repository's own detectors, reverting with no
residue: **TEST-LAYER LIVE 13/13**. S8 and S12 included; neither seed was
modified by this work.

## Non-claims

- Simulation is **not** physical evidence. No Sony/Namtai physical claim is made
  or implied.
- Court B was not started; no build was served to a blinded tester.
- This receipt records apparatus correction only. It is not eligibility and does
  not advance any product slice.
- The S12 tables were measured with exactly two library entries (the Court B
  fixture plus `Import demo game`) and with those two specific titles. They are
  not a general claim about every library a tester could assemble.
- The S8 "Active team" strings are the team names the operator typed during
  ordinary setup (Alpha, Bravo), not fixture defaults.
