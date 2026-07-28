# Decisions

This project separates two kinds of durable decision records:

1. **Architecture Decision Records (ADRs)** — technical decisions with
   trade-offs, alternatives, and consequences. Stored in
   [`../architecture/`](../architecture/) as `ADR-NNN-<slug>.md`.
   - [`ADR-001-github-pages-routing.md`](../architecture/ADR-001-github-pages-routing.md)
     — hash routing for static GitHub Pages (Slice 1).
   - [`ADR-002-state-event-sync-core.md`](../architecture/ADR-002-state-event-sync-core.md)
     — command/event core, replay/undo, allow-list sanitizer, BroadcastChannel
     sync (Slice 2).
   - [`ADR-003-game-round-model-registry.md`](../architecture/ADR-003-game-round-model-registry.md)
     — `GameDefinition`/`GameSession`, typed `RoundDefinition`, round registry
     scaffold, unknown-type fail-closed handling (Slice 3).
   - [`ADR-004-canonical-validation-import.md`](../architecture/ADR-004-canonical-validation-import.md)
     — canonical versioned JSON game file, the single Zod-based validation /
     normalization import pipeline, structured errors, no silent repair
     (Slice 4).
   - [`ADR-005-category-board-round.md`](../architecture/ADR-005-category-board-round.md)
     — the `category-board` round: config model, ordering and identity rules,
     board-shape and duplicate-value decisions, multiplier semantics, the
     reveal-stage state machine, used-tile policy, replay/undo, the
     current-stage-only public DTO and wire version 3 (Slice 5).
   - [`ADR-006-teams-and-scoring.md`](../architecture/ADR-006-teams-and-scoring.md)
     — teams as authored content vs. scores as replayed session state, identity
     and ordering rules, team limits, the application-controlled accent palette,
     bounded integer score policy, the four typed scoring modes, the single
     `ADJUST_TEAM_SCORE` command and its provenance, the host-only scoring
     target, reveal/score independence, correction without rewriting history,
     reset semantics, the public scoreboard DTO and wire version 4 (Slice 6).
   - [`ADR-007-timers-arming-transitions.md`](../architecture/ADR-007-timers-arming-transitions.md)
     — the clock boundary (dispatch edge and presentation edge only, never the
     reducer), durable timer facts versus a derived countdown, the response-phase
     model, manual host arming, the typed interruption seam, expiration through
     the command boundary with stale-callback validation, the pause/resume
     resolution of `OG-8`, transition legality, the host/display clock-drift
     strategy and its limits, the public response DTO and wire version 5, sync
     envelope version 2, and the additive `timer` block on `schemaVersion: 1`
     (Slice 7).
   - [`ADR-008-local-input-keyboard-buzz.md`](../architecture/ADR-008-local-input-keyboard-buzz.md)
     — the hardware-independent local input boundary (raw input → adapter →
     logical action → command → event → reducer → sanitized state), the bounded
     logical action vocabulary with inert ordinal secondary slots, the
     `KeyboardEvent.code` decision, configurable keyboard mappings and their
     versioned device-local persistence, manual arming as the queue's intake gate,
     the full ordered buzz queue and the explicit active respondent, promotion
     after an incorrect response or a host pass, buzz interruption through the
     Slice 7 seam, the response-opportunity identity, the tie policy, the public
     buzz DTO and wire version 6, and the resolution of `OG-2`, `OG-3`, `OG-4` and
     `OG-5` with `OG-6` still deferred (Slice 8).
   - [`ADR-009-generic-gamepad-adapter.md`](../architecture/ADR-009-generic-gamepad-adapter.md)
     — the generic Gamepad adapter behind the Slice 8 boundary: the browser
     boundary module and its data-only bounded snapshot, the injectable source and
     scheduler seams, single host-owned polling with no global service, rising-edge
     semantics and the baseline/re-prime rule that makes connect, reconnect,
     enable, mapping change, capture, visibility and focus structurally unable to
     fabricate a press, deterministic simultaneous-edge ordering as a tie-break
     rather than a fairness claim, the generic controller-index/button-index
     mapping model with validation and no default assignment, the session-local
     mapping lifetime and why a controller index may not be persisted, the
     buttons-only scope, secondary actions remaining inert, host-private
     diagnostics, keyboard as the permanent fallback, and the decision that
     `PublicState` and the sync protocol do **not** change (Slice 9).
   - [`ADR-010-sony-buzz-profile-and-setup.md`](../architecture/ADR-010-sony-buzz-profile-and-setup.md)
     — host-private identity observation, candidate classification from USB
     VID/PID tokens, capture-based recommended profile with no hard-coded browser
     indices, setup test mode and host setup surface, session-local mapping
     lifetime, and the privacy boundary; **`PublicState` and the sync protocol do
     not change** (Slice 10 hardware-independent portion — owner physical Sony
     Buzz! validation still pending).
2. **Owner decisions** — product/scope choices made by the project owner.
   Recorded under "Approved product decisions" in [`../PROJECT.md`](../PROJECT.md)
   and reflected in [`../plans/MVP-ARC.md`](../plans/MVP-ARC.md).
3. **Roadmap amendments** — owner-authorized changes to the slice sequence
   itself, stored here as `ROADMAP-AMENDMENT-NNN-<slug>.md`. An amendment is
   required because the slice sequence in
   [`../plans/MVP-ARC.md`](../plans/MVP-ARC.md) is the plan of record and "must
   not be silently rewritten": the amendment carries the rationale, the
   dependency analysis, the superseded statements, and any open owner gates,
   while `MVP-ARC.md` carries the resulting plan.
   - [`ROADMAP-AMENDMENT-001-local-buzzers.md`](ROADMAP-AMENDMENT-001-local-buzzers.md)
     — local host-attached USB buzzers (Sony Buzz! as the preferred initial
     target) as an approved future capability; the narrowing of the
     "student devices/buzzers" MVP non-goal; the timing/arming boundary for
     clock-dependent values; the timer↔buzzer dependency analysis; media pulled
     ahead of any new round type; export/import before persistence; the schema
     migration policy; reporting placement and the rejection of raw-score
     leaderboards; and the 11-slice plan amended to 18 slices (2026-07-26).

## When an ADR is required

Write an ADR when a choice:

- is hard or costly to reverse (routing model, persistence layer, state
  architecture, deployment target, framework choices),
- affects a permanent invariant (the private/public boundary, fail-closed
  display, no-executable-imports, typed scoring/media),
- picks between multiple viable technical approaches with real trade-offs, or
- future contributors would otherwise re-litigate.

Routine, easily-reversible choices (a helper's name, a CSS token value) do
**not** need an ADR.

## When an owner decision is required

Escalate to the owner (do not decide unilaterally) when a choice:

- changes product scope or the approved slice plan,
- weakens a safety invariant (e.g. fail-closed display, private-state
  isolation, no executable imported code),
- adds a runtime/build/test/deploy dependency on an external system (e.g.
  NightWatch, a backend, an AI service), or
- introduces cost, accounts, student data, or grading semantics.

If a required decision is unresolved, record it as an open question in the
handoff ([`../handoff/CURRENT.md`](../handoff/CURRENT.md)) rather than guessing.

## ADR lifecycle

`Proposed` → `Accepted` → (later) `Superseded by ADR-NNN`. Never delete an ADR;
supersede it so the history stays intact.

## Unresolved decisions

Track open decisions in the handoff's "Open questions / unresolved decisions"
section so an Obsidian Command Center or another agent can find and route them.
