# CQS REAL MVP S05 score-change — Path S-C owner decision registration

## Identity

- **Program:** `CQS-REAL-MVP-1`
- **Parent:**
  `CQS-REAL-MVP-S05-FLAGSHIP-VISUAL-FIDELITY-AND-GAME-SHOW-CHOREOGRAPHY`
- **Authorization:**
  `AUTHORIZE-CQS-REAL-MVP-S05-SCORE-CHANGE-PATH-S-C-DECISION-REGISTRATION-1`
- **Kind:** docs-only owner-decision registration (no product implementation)
- **Date (UTC):** 2026-09-22
- **Repository:** `ricktron/classroom-quiz-show`
- **Canonical base at registration:**
  `a88a394c706801f28a39b43b68151fc163c25ac7`

## Decision

```text
S05 score-change:
PATH S-C APPROVED
```

## REAL MVP meaning

For REAL MVP, the S05 “score change” major moment is intentionally
satisfied by the immediate, static, authoritative scoreboard update already
governed by ADR-006.

Therefore:

- ADR-006 remains unchanged for REAL MVP;
- authored team order remains stable;
- the live scoreboard does not count up, flash, animate between totals, or
  re-sort;
- no separate score-change choreography is required for S05 terminal
  completion;
- no separate public score-change event identity is required;
- no score animation token / timestamp / sequence is required;
- no PublicState version bump is required merely for S05 score presentation;
- score truth and immediacy take priority over spectacle.

This decision resolves:

```text
FUTURE OWNER DECISION STILL REQUIRED FOR S05 SCORE-CHANGE REQUIREMENT
→ RESOLVED — PATH S-C
```

Durable canon:

- [`../PROJECT.md`](../PROJECT.md) Approved product decisions (owner)
- [`../plans/CQS-REAL-MVP-S04-FAMILY-DIRECTION.md`](../plans/CQS-REAL-MVP-S04-FAMILY-DIRECTION.md)
  §30 interpretation
- [`../architecture/ADR-006-teams-and-scoring.md`](../architecture/ADR-006-teams-and-scoring.md)
  (unchanged)

## Deferred idea

```text
scoreboard animation:
DEFERRED / BANKED / NOT REJECTED / NOT AUTHORIZED
```

Banked under existing
[`../plans/POST-MVP-OPPORTUNITY-AND-TRIGGER-REGISTER.md`](../plans/POST-MVP-OPPORTUNITY-AND-TRIGGER-REGISTER.md)
`CQS-OPP-PRESENTATION-EFFECTS` only — no duplicate opportunity.

Distinction:

- `CQS-RA2-TEAM-ORDER-01` already preserves optional ceremonial score-order
  transitions **between rounds and at game end**, returning to stable
  authored positions (presentation-only; not activated here).
- Live score-change animation beyond that existing future clause requires a
  fresh owner decision and normal architecture / ADR review later.
- Presentation completion can never become gameplay authority.

## Non-claims

This registration does **not**:

- implement animation, scoring, Host/Display runtime, CSS, tests, or
  package/workflow changes;
- modify ADR-006 or create a new ADR / ROADMAP-AMENDMENT-006;
- change PublicState, introduce `outcomeKey`, or invent score-change event
  identity;
- activate `CQS-OPP-PRESENTATION-EFFECTS`;
- authorize board-outcome / board-flow / Final / winner presentation
  implementation;
- terminalize the S05 parent;
- authorize S04D, S06, or a teacher-trusted release;
- rewrite historical receipts (including PR #93 / #94 board-outcome
  terminal receipts) that correctly recorded the score gate as unresolved
  at that time.

## Parent status

```text
S05 parent: OPEN / NOT TERMINAL
```

Score-change choreography is **not** a required remaining REAL MVP S05
item after Path S-C. Other presentation families remain open and
unauthorized.

## Next frontier

```text
Next candidate frontier:
board-outcome presentation choreography
— requires separate bounded owner authorization.
```

Preserve for future child context (not authorized here): theatrical
acknowledgement on existing `boardOutcome`; no `outcomeKey` by default; no
score behavior / score animation / ADR-006 change; Correct remains
audio-silent unless separately decided; remount must not fabricate “just
happened”; reduced-motion semantic parity; Host remains restrained.
