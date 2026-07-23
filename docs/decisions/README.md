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
2. **Owner decisions** — product/scope choices made by the project owner.
   Recorded under "Approved product decisions" in [`../PROJECT.md`](../PROJECT.md)
   and reflected in [`../plans/MVP-ARC.md`](../plans/MVP-ARC.md).

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
