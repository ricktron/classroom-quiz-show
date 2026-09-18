# CQS design guidance

- **Document id:** `CQS-DESIGN-README`
- **Program:** `CQS-REAL-MVP-1`
- **Registering slice:** `CQS-UX-GUIDANCE-S01-FOUNDATION`
- **Authorization:** `AUTHORIZE-CQS-UX-GUIDANCE-S01-FOUNDATION-1`
- **Date:** 2026-09-11
- **Status:** **ACTIVE — design guidance**
- **Kind:** durable UX/UI guidance entrypoint. **Documentation only. No
  product implementation is authorized by this file or by anything under
  `docs/design/`.**

This directory is the entrypoint for Classroom Quiz Show interaction and
experience design guidance. It exists so that a later implementation slice
can reason from explicit, teacher-centered design principles instead of
rediscovering UX guidance ad hoc for each surface.

```text
design guidance ≠ implementation authority
research evidence ≠ CQS product authority
```

---

## 1. What belongs here

| Path | Contains |
| --- | --- |
| [`CQS-UX-DOCTRINE.md`](CQS-UX-DOCTRINE.md) | **Adopted** cross-product CQS interaction/experience doctrine. Stable principle ids `CQS-UX-P01`…`CQS-UX-P25`. |
| [`CQS-UX-SURFACE-INVENTORY.md`](CQS-UX-SURFACE-INVENTORY.md) | The durable CQS UX/UI surface inventory: user, job, states, risks, applicable principles, and **which Program slice owns the work**. |
| [`../research/CQS-UX-UI-REFERENCE-BIBLIOGRAPHY.md`](../research/CQS-UX-UI-REFERENCE-BIBLIOGRAPHY.md) | The reference shelf — external sources with honest per-source **evidence state**. |
| [`../research/CQS-UX-SOURCE-PRINCIPLE-MATRIX.md`](../research/CQS-UX-SOURCE-PRINCIPLE-MATRIX.md) | The bridge from sources and observed CQS evidence to each adopted principle. |

What does **not** belong here:

- product status (that is [`../STATUS.md`](../STATUS.md));
- architecture decisions (those are accepted ADRs under
  [`../architecture/`](../architecture/));
- slice plans and Program sequence (those are under [`../plans/`](../plans/));
- verification evidence (that is [`../receipts/`](../receipts/));
- CSS, tokens, components, or any implementation.

---

## 2. When to consult this guidance

This section makes entry into the design system deterministic. The goal is
high leverage, not ritual research.

```text
teacher-facing task
  → relevant surface inventory entry
    → adopted CQS UX doctrine
      → source-principle matrix when rationale or evidence is needed
        → bibliography / source material only when the doctrine does not
          settle a consequential design question
```

External books are an **escalation layer, not the default first stop**.

### Level 1 — Mandatory design routing

Read the relevant
[`CQS-UX-SURFACE-INVENTORY.md`](CQS-UX-SURFACE-INVENTORY.md) entry and the
doctrine principles it names for any change affecting:

- teacher-facing interaction;
- information hierarchy;
- navigation;
- workflow;
- setup, readiness, or recovery behavior;
- Host controls;
- Display presentation;
- authoring;
- accessibility;
- motion;
- visual behavior;
- consequential microcopy or terminology.

Then apply the referenced adopted principles and implement **inside the
currently authorized product scope**. If the doctrine settles the question,
that is the whole obligation — stop there.

### Level 2 — Matrix consultation

Use [`../research/CQS-UX-SOURCE-PRINCIPLE-MATRIX.md`](../research/CQS-UX-SOURCE-PRINCIPLE-MATRIX.md)
when:

- the **rationale** behind a principle matters to the decision;
- reviewing whether an implementation complies with adopted principles;
- the relationship between repository authority, observed CQS failure, and the
  principle needs to be understood;
- deciding **how to qualify** the resulting behavior.

The matrix carries each principle's repo authority, evidence status,
anti-pattern, and qualification implication. It usually answers "why" without
any external source.

### Level 3 — Bibliography / source consultation

Escalate to [`../research/CQS-UX-UI-REFERENCE-BIBLIOGRAPHY.md`](../research/CQS-UX-UI-REFERENCE-BIBLIOGRAPHY.md)
and the underlying sources **only** when:

- the adopted doctrine is insufficient to settle a consequential question;
- two plausible interaction approaches materially conflict;
- a new surface or problem is not adequately covered by existing doctrine;
- a specialist domain is the actual focus of the work;
- the change would establish a **new reusable CQS design convention**;
- a reviewer needs to understand the research basis for an adopted principle;
- existing CQS evidence and doctrine are in tension and further research could
  resolve the design question.

Specialist domains that justify escalation include live operator and
situation-awareness design, hardware mental models, setup and recovery,
authoring and forms, typography, projector and distance display, game UX,
animation and motion, accessibility, microcopy, game feel, and design-system
conventions.

### When **not** to escalate

```text
already-settled doctrine
does not require
re-reading external sources
```

Routine implementation where the doctrine already decides the matter needs no
external source consultation. Examples:

- replacing exposed implementation jargon with already-approved teacher-facing
  terminology;
- preserving keyboard fallback;
- applying an existing principle to a new button state;
- fixing a component that violates an already explicit hierarchy rule;
- implementing already-authorized non-color cues;
- making a known recovery action consistent with established CQS terminology.

### Worked routing examples

| Task | Path |
| --- | --- |
| Changing the Class Setup hierarchy | Surface 6 → `P02`, `P04`, `P05`, `P09` → implement if settled → research only if unresolved |
| Designing S05 projector typography | Surfaces 14/15/18/25 → `P13`, `P14`, `P17` → matrix → typography source **if** design choices remain unresolved |
| Renaming an exposed WebHID label to teacher-facing wording the doctrine already defines | `P06`, `P20` → implement. **No external research.** |
| Choosing buzz feedback timing (150 ms flash vs 600 ms animation vs other) | Surface 16 → `P15`, `P16`. Doctrine does not settle a duration, and the choice would set a reusable convention → **escalate** to game-feel / microinteraction / motion research first |
| An external source conflicts with an accepted CQS invariant | **The CQS invariant wins.** Record the conflict; do not average opinions. |

### Evidence-state caveat

A source may be **registered but not yet ingested**. Routing a question to a
source says where to look; it does **not** mean that source has been read, and
it never licenses a chapter-level claim. The current content state of every
source is recorded in
[`../research/CQS-UX-UI-REFERENCE-BIBLIOGRAPHY.md`](../research/CQS-UX-UI-REFERENCE-BIBLIOGRAPHY.md)
§1, and escalating to a `NOT-YET-INGESTED` source means **reading it now**,
not citing it from its title.

---

## 3. Research evidence versus adopted guidance

These are two different things and must stay visibly different.

**Research evidence** is what an outside source says, or what was actually
observed in CQS. It lives in [`../research/`](../research/). Every external
source carries an explicit evidence state, and a source is never described as
more thoroughly read than it was.

**Adopted CQS guidance** is a decision this project has made about how CQS
should behave. It lives in [`CQS-UX-DOCTRINE.md`](CQS-UX-DOCTRINE.md) and is
written as CQS's own position, with stable ids so later work can cite it.

A book is never the authority for a CQS behavior. The doctrine is. Where a
principle is influenced by a source, the matrix records that influence — it
does not transfer authority to the source.

---

## 4. Authority hierarchy

This guidance sits **below** repository canon. Canonical order is unchanged
from [`../../AGENTS.md`](../../AGENTS.md):

1. observed merged code, tests, configuration, and Git history;
2. [`../PROJECT.md`](../PROJECT.md);
3. [`../CQS-PRODUCT-CONTRACT.md`](../CQS-PRODUCT-CONTRACT.md);
4. [`../STATUS.md`](../STATUS.md);
5. accepted ADRs and owner decisions;
6. the current REAL MVP Program plan
   ([`../plans/CQS-REAL-MVP-ARC.md`](../plans/CQS-REAL-MVP-ARC.md)) and the
   approved S04-family direction
   ([`../plans/CQS-REAL-MVP-S04-FAMILY-DIRECTION.md`](../plans/CQS-REAL-MVP-S04-FAMILY-DIRECTION.md));
7. **this design guidance, where compatible**;
8. research sources and external design literature.

Consequences:

- If an outside design recommendation conflicts with a CQS invariant, **CQS
  wins** and the conflict is recorded rather than averaged away.
- If this doctrine appears to conflict with the Product Contract or an
  accepted ADR, the doctrine is wrong and must be repaired.
- Visual fashion is not product authority. "Modern-looking" is not an
  argument.
- Design guidance does not authorize implementation. Naming a surface here,
  describing a better interaction, or assigning a principle to a slice grants
  **no** implementation authority.

---

## 5. Relationship to the Product Contract and ADRs

The Product Contract owns durable product invariants — teacher-data primacy,
offline gameplay, Host-private/Display-public separation, keyboard fallback,
accessibility as a product requirement, Game versus Session, Windows-first
deployment. This doctrine **elaborates how those invariants should feel to a
teacher**. It does not restate them as if it invented them, and it does not
weaken them.

Accepted ADRs own architecture. Where doctrine touches an architectural
boundary (for example the sanitized public-state boundary in ADR-002, the
local-input boundary in ADR-008/ADR-009, or the exact Sony supported profile
in ADR-019), the ADR is authoritative for the mechanism and the doctrine
speaks only to the teacher-facing presentation of it.

---

## 6. Relationship to the S04-family and beyond

| Slice | Relationship to this guidance |
| --- | --- |
| S04A | **TERMINALLY COMPLETE.** Research may note future polish opportunities; this guidance does **not** reopen S04A. |
| S04B | **TERMINALLY COMPLETE.** Adopted Host-setup doctrine remains applicable. Later research does **not** reopen S04B without separate authority. |
| S04C | Parent product-safety / recovery / compatibility UX lane. S04C-H1 safe startup / unified session recovery is **TERMINALLY COMPLETE**. S04C-H2 sanitized diagnostics (Copy Diagnostic Report) is **TERMINALLY COMPLETE**. S04C-H3 backup/export/import foundations is a **DELIVERY CANDIDATE / NOT TERMINAL**. Remaining S04C work (import salvage, display resilience, etc.) requires later bounded authorization. **H4+ is not authorized by this guidance.** |
| S04D | Owns intentional feedback/support flow and privacy-safe telemetry. |
| S05 | Owns flagship Display visual fidelity, motion vocabulary, and game-show choreography. Host stays operational and restrained. |
| S06 | Owns integrated Windows-first release qualification, including projector, scaling, accessibility, audio, hardware, and clean-room teacher use. |

Assigning a surface or a principle to a slice in
[`CQS-UX-SURFACE-INVENTORY.md`](CQS-UX-SURFACE-INVENTORY.md) records **where
the work would belong**. It is a scope-creep guard, not a work order.

---

## 7. Operating model

Guidance enters and leaves this namespace along one path:

```text
external evidence
  → CQS problem
    → CQS interpretation
      → adopted / adapted / rejected / deferred guidance
        → owning product slice
          → implementation
            → qualification evidence
```

Read it in both directions:

- **Forward.** A source or an observed failure motivates a CQS problem
  statement; the problem is interpreted against CQS's user, environment and
  invariants; a disposition is recorded; the guidance is routed to the slice
  that owns the surface; that slice — under its own separate authorization —
  implements; qualification produces evidence.
- **Backward.** Any implemented behavior should be traceable to an adopted
  principle, and any adopted principle should be traceable to repo authority,
  observed CQS evidence, or labeled external support.

The four dispositions are deliberate:

| Disposition | Meaning |
| --- | --- |
| **Adopted** | CQS takes the guidance essentially as stated. |
| **Adapted** | CQS takes the idea but changes it for the classroom context. |
| **Rejected** | CQS declines it, with the reason recorded. |
| **Deferred** | Plausible, but not for REAL MVP; routed to the owning later lane or to the opportunity register. |

Nothing in this model permits mutation of `src/`, tests, dependencies,
schemas, themes, or configuration.

---

## 8. Design-system posture

CQS should have a **shared design language** so that intent and consistency
survive across surfaces and across slices.

CQS should **not** acquire a design-system program larger than the product.
No speculative frameworking, no token taxonomy built ahead of a consumer, no
component library built for hypothetical future surfaces. The existing theme
registry and token surface are the starting point, and S05 owns any
implementation of a broader visual language.

See `CQS-UX-P24` in [`CQS-UX-DOCTRINE.md`](CQS-UX-DOCTRINE.md).

---

## 9. Non-claims

This file and the rest of `docs/design/` do **not**:

- authorize S04C, S04D, S05, or S06 implementation;
- reopen S04A or S04B;
- change product status, the Program sequence, or the gap register;
- claim any surface is polished or release-qualified beyond what STATUS
  already records;
- promote any external source above CQS canon.
