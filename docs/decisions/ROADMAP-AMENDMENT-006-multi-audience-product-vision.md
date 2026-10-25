# Roadmap Amendment 006 — Multi-audience product vision and analytics reconciliation

- **Amendment id:** `ROADMAP-AMENDMENT-006`
- **Authorization:** documentation-only product-vision reconciliation
  (owner-authorized bounded docs lane; no product-slice authorization)
- **Status:** Accepted (owner-authorized planning decision)
- **Date:** 2026-10-24
- **Base `main`:** `d94c36ea13a52497a28395c66b3e1259a3b12e82`
- **Type:** decision + documentation only — **no runtime code, no schema
  change, no test change, no dependency change, no CI/deploy change**
- **Amends:** long-term product-vision documentation only. Does **not**
  amend the current REAL MVP Program sequence in
  [`../plans/CQS-REAL-MVP-ARC.md`](../plans/CQS-REAL-MVP-ARC.md), does
  **not** reopen the completed 23-slice plan in
  [`../plans/MVP-ARC.md`](../plans/MVP-ARC.md), and does **not** renumber
  or rewrite acceptance/activation state for
  `CQS-OD-001`…`CQS-OD-086`.
- **Unrelated to ADR-006 / S05 Path S-C.** This amendment number is the
  next roadmap-amendment slot after 005. It does **not** amend
  ADR-006 teams-and-scoring. The historical S05 Path S-C receipt's
  non-claim that that packet did not create a
  `ROADMAP-AMENDMENT-006` remains true for that packet.
- **Related canon:**
  [`../plans/EXPANDED-CQS-VISION-ARC.md`](../plans/EXPANDED-CQS-VISION-ARC.md),
  [`../plans/SESSION-ANALYTICS-ASSESSMENT-AND-PARTICIPATION.md`](../plans/SESSION-ANALYTICS-ASSESSMENT-AND-PARTICIPATION.md),
  [`../plans/POST-MVP-OPPORTUNITY-AND-TRIGGER-REGISTER.md`](../plans/POST-MVP-OPPORTUNITY-AND-TRIGGER-REGISTER.md),
  [`EXPANDED-VISION-OWNER-DECISIONS.md`](EXPANDED-VISION-OWNER-DECISIONS.md),
  [`ROADMAP-AMENDMENT-001-local-buzzers.md`](ROADMAP-AMENDMENT-001-local-buzzers.md),
  [`ROADMAP-AMENDMENT-002-expanded-gameplay-vision.md`](ROADMAP-AMENDMENT-002-expanded-gameplay-vision.md).

This amendment is the **canonical authority for architectural /
product-direction consequences** of the 2026-10-24 multi-audience vision
reconciliation. It records what is:

- **long-term product direction** — durable aspiration that future
  authorized work may pursue;
- **preserve future compatibility** — near-term work must not foreclose
  the aspiration without an explicit decision;
- **deferred opportunity** — tracked in the opportunity register until a
  trigger and separate authorization;
- **requires future owner decision** — accepted aspiration that cannot
  activate until named restrictions are deliberately revisited.

Nothing here implements anything, authorizes implementation, activates a
post-MVP arc, expands REAL MVP scope, resolves `CQS-OD-066`, or silently
supersedes Amendment 001 / expanded-vision non-goals.

---

## Clause CQS-RA6-AUDIENCE-01 — Multi-audience platform identity

- **Classification:** Long-term product direction
- **Preserved for current implementation / REAL MVP.** CQS remains a
  local-first, host-authoritative classroom game-show engine whose
  first/primary owner-user is the developer/teacher. REAL MVP continues
  to center an excellent Jeopardy-style category-board and Final
  experience. The Product Contract's serious education-product posture
  remains binding for REAL MVP work.
- **Amended for future architecture / product identity.** Long-term, CQS
  is a **highly customizable professional game-show and interactive
  entertainment platform**. Intended audiences include:
  - educators using games for instruction, review, formative assessment,
    and learning analysis;
  - DJs, event businesses, trivia hosts, and other event operators
    creating customized experiences for their clients.
  Educational analytics are a **specialized product capability**, not the
  defining limitation of the entire platform. A user need not be an
  educator to use CQS.
- **Superseded:** nothing today. Classroom-first REAL MVP identity is
  confirmed, not replaced.
- **Not active until separately authorized.** Multi-audience packaging,
  event-operator workflows, and noneducational go-to-market work are not
  scheduled by this amendment.

## Clause CQS-RA6-CUSTOMIZE-01 — Customization without ordinary-user complexity

- **Classification:** Long-term product direction · Preserve future
  compatibility
- **Preserved.** Typed registered multi-round architecture; fail-closed
  imports; host-private / display-sanitized boundary; configuration
  simplicity direction (`CQS-OD-081`); Product Contract invariant that
  product sophistication must not translate into teacher-facing
  complexity.
- **Amended for future architecture.** Core long-term goals include
  reusable content, flexible game rules, presentation themes, adaptable
  player/team structures, Jackbox-like variety of entertaining
  experiences, and extensive customization **without** imposing setup
  complexity on ordinary users. Game mechanics may inspire original
  experiences; protected branding, artwork, music, and other IP remain
  excluded (standing non-goal).
- **Superseded:** nothing.
- **Not active until separately authorized.** Does not prescribe the
  second game format; additional formats remain under
  `CQS-ARC-FORMATS` / opportunity-register triggers.

## Clause CQS-RA6-ANALYTICS-01 — Multi-audience analytics uses

- **Classification:** Long-term product direction · Deferred opportunity
- **Preserved.** Authoritative gameplay events vs optional observational
  telemetry (`CQS-RA2-TELEMETRY-01`); statistical honesty language
  (observed responses ≠ inferred understanding; no individual-mastery
  claims from team answers — `CQS-OD-060` parked; `CQS-OD-059` aggregate
  posture); `CQS-OD-066` remains **Unresolved**.
- **Amended for future architecture.** Analytics should serve practical
  uses for multiple audiences. Educator investigation goals and event-
  operator engagement/calibration uses are elaborated in
  [`../plans/SESSION-ANALYTICS-ASSESSMENT-AND-PARTICIPATION.md`](../plans/SESSION-ANALYTICS-ASSESSMENT-AND-PARTICIPATION.md).
  Prioritize durable, teacher/operator-owned, exportable evidence (CSV,
  JSON, or suitable local structured storage may suffice initially). A
  sophisticated analytics dashboard remains deferred. Evidence capture
  must not assume every game format provides identical fields.
- **Superseded:** nothing.
- **Not active until separately authorized.** Tracked primarily under
  existing `CQS-OPP-QUESTION-ANALYTICS` /
  `CQS-OPP-ASSESSMENT-ANALYTICS` and new opportunity entries registered
  by this reconciliation.

## Clause CQS-RA6-DEVICE-01 — Optional individual-device participation (prospective)

- **Classification:** Requires future owner decision · Deferred
  opportunity · Preserve future compatibility (do not design networking now)
- **Preserved for current implementation / REAL MVP / expanded-vision
  non-goals (binding now).**
  - No student-owned devices and no student phones as controllers
    ([`../PROJECT.md`](../PROJECT.md) Major non-goals; Amendment 001).
  - No networked buzzers; no backend/account/WebRTC/Bluetooth/classroom
    Wi-Fi requirement authorized for ordinary play.
  - Expanded vision §8 non-goal: free of student devices / phones as
    controllers.
  - Conventional play must remain possible without student phones,
    accounts, or mandatory cloud services.
- **Amended for long-term aspiration (not accepted activation).** The
  owner has identified **optional individual-device participation** as a
  desirable long-term capability for some future experiences (Jackbox-
  like variety among them). This aspiration is **recorded**, not
  activated.
- **Prospective supersession status.** A future authorized owner
  decision would need to revisit, at minimum:
  1. [`../PROJECT.md`](../PROJECT.md) Major non-goals (MVP) student-
     phone / student-owned-device clause and Amendment 001 narrowing;
  2. Expanded vision §8 non-goals and any arc text that treats phone
     exclusion as permanent rather than current-boundary;
  3. Privacy / identity / no-backend invariants if networked
     participation implies accounts, pairing, or cloud relay;
  4. Input-architecture ADRs (ADR-008 and successors) if a new adapter
     class is required;
  5. Research interpretation `CQS-RF-JACKBOX-01` (today: phone input is
     excluded; future variants may add an **optional** device path while
     retaining controller/host-assisted paths).
- **Superseded today:** **nothing.** Statements that student phones /
  networked controllers are excluded remain **true and binding** for
  REAL MVP and for all currently accepted expanded-vision arcs until an
  explicit future decision changes them.
- **Not active until separately authorized.** Do not design or implement
  device networking, phone buzzers, or mandatory cloud participation
  under this amendment. Opportunity:
  `CQS-OPP-OPTIONAL-DEVICE-PARTICIPATION`.

## Clause CQS-RA6-STRATEGY-01 — REAL MVP and format pathway unchanged

- **Classification:** Preserve future compatibility
- **Preserved.** Current development strategy: complete and qualify an
  excellent Jeopardy-style category-board and Final experience under
  `CQS-REAL-MVP-1`. Additional game formats follow later through
  separately authorized work (`CQS-ARC-FORMATS`). Typed registered
  multi-round architecture remains binding. This amendment does **not**
  prescribe the second game format.
- **Superseded:** nothing in REAL MVP status, gap register, or post-MVP
  arc order (`CQS-OD-080` remains the recorded default order).
- **Not active:** N/A — strategy preservation only.

---

## Explicit non-claims

This amendment does **not**:

- authorize application code, schemas, networking, analytics dashboards,
  or device clients;
- activate any post-MVP arc or opportunity;
- expand REAL MVP scope or change [`../STATUS.md`](../STATUS.md)
  program frontier;
- resolve `CQS-OD-066` or alter the 86-decision primary tally;
- claim that optional device participation is approved for
  implementation;
- claim multi-audience packaging or event-operator workflows exist today.
