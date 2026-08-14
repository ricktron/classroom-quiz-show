# CQS Product Contract

- **Document id:** `CQS-PRODUCT-CONTRACT`
- **Program:** `CQS-REAL-MVP-1`
- **Registering slice:** `CQS-REAL-MVP-S04-CANON-REGISTRATION`
- **Authorization:** `AUTHORIZE-CQS-REAL-MVP-S04-CANON-REGISTRATION-1`
- **Date:** 2026-08-13
- **Status:** **ACTIVE / CANONICALLY REGISTERED**
- **Kind:** durable product invariants for a serious potential distributable
  education product. **Documentation only. No product implementation is
  authorized by this file.**

This is the dedicated Classroom Quiz Show **Product Contract**. It records
invariants that remaining REAL MVP work must preserve. It does **not**
replace [`PROJECT.md`](PROJECT.md),
[`architecture/GAME-ENGINE-BOUNDARIES.md`](architecture/GAME-ENGINE-BOUNDARIES.md),
or accepted ADRs. Those remain authoritative for product identity, engine
boundaries, and technical decisions.

Detailed S04-family product direction lives in
[`plans/CQS-REAL-MVP-S04-FAMILY-DIRECTION.md`](plans/CQS-REAL-MVP-S04-FAMILY-DIRECTION.md).
Program topology lives in
[`plans/CQS-REAL-MVP-ARC.md`](plans/CQS-REAL-MVP-ARC.md).

```text
routing ≠ authority
naming a successor slice grants no implementation authority
```

---

## 1. Product posture

CQS is no longer being designed merely as a personal classroom utility.

It is being designed as a **serious potential distributable education
product** whose first/primary owner-user is the developer/teacher.

REAL MVP must therefore avoid architectural decisions that make later
distribution, compatibility, privacy, support, recovery, school-IT
adoption, or teacher-data durability unnecessarily expensive.

This does **not** authorize premature SaaS, commercial, or cloud
complexity.

**Product principle:**

```text
BUILD THE SMALLEST EXCELLENT TEACHER PRODUCT,
WHILE PRESERVING SAFE PATHS TO A LARGER PRODUCT.
```

---

## 2. Durable invariants

These invariants are product requirements. Later slices may implement
them incrementally, but they must not silently weaken them.

1. **A teacher's saved game/data is more valuable than any individual CQS
   software release.**
2. **CQS gameplay must remain functional without internet access.**
3. **Normal teacher workflows expose product concepts, not implementation
   concepts.**
4. **Imported content is data, never executable authority.**
5. **Classroom/student content is private by default.**
6. **Telemetry is optional and must not contain classroom content by
   default.**
7. **Windows is the primary teacher deployment target.**
8. **macOS is the primary development platform and secondary teacher
   platform.**
9. **Hardware failure must not prevent emergency keyboard operation.**
10. **Display failure/recovery must not expose Host-private information.**
11. **A teacher must have a recovery path that does not require a
    terminal or developer.**
12. **Reusable Game content and per-class Session state are distinct.**
13. **Upgrades must not silently destroy or strand supported teacher
    data.**
14. **v1.0 establishes an ongoing compatibility obligation.**
15. **Security/privacy boundaries are product requirements, not optional
    polish.**
16. **Accessibility, reduced-motion, and high-contrast behavior are
    product requirements.**
17. **REAL MVP avoids unnecessary cloud/runtime dependencies.**
18. **Product sophistication should not translate into teacher-facing
    complexity.**

---

## 3. Platform order

Canonical platform order:

| Role | Order |
| --- | --- |
| Development | 1. macOS, primarily the owner's MacBook |
| Teacher / production target | 1. **Windows — primary**; 2. macOS — secondary; 3. Web/PWA — supported alternate |

Program principle:

```text
Develop on macOS;
design, package, and qualify for Windows-first teacher adoption.
```

Windows-first implications are product requirements, not packaging
trivia:

- the normal teacher path must never require a terminal;
- conventional installer / app launch;
- Start Menu / Desktop familiarity;
- per-user / no-admin install preferred where technically feasible;
- Windows scaling and projector behavior are first-class;
- SmartScreen and institutional restrictions are first-class release
  concerns;
- Windows signing has higher release priority than Apple
  signing/notarization if tradeoffs must be made;
- a CI-generated Windows artifact is **build evidence only**;
- actual physical Windows classroom-machine qualification is required
  before v1.

---

## 4. Game versus Session

This distinction is canonical and must guide implementation.

**Game** is reusable authored content. Examples: title, categories,
tiles/questions, answers, Final content, a game-specific humorous
team-name bank, authoring metadata, and workbook/template provenance
where applicable.

**Session** is a particular classroom run of a Game. Examples: active
teams, chosen team identities/names, controller/team assignments, scores,
board progress, buzz state, wagers, Final progress, session recovery
state, and result/summary state.

A saved question game **must** be reusable across different
classes/periods without retaining previous class team identities as
authored game content.

Engine-level `GameDefinition` versus `GameSession` /
`PrivateGameState` remains defined in
[`architecture/GAME-ENGINE-BOUNDARIES.md`](architecture/GAME-ENGINE-BOUNDARIES.md)
and ADR-003. This contract states the teacher-facing product rule those
types must continue to serve.

---

## 5. Data durability and compatibility

Teacher-created content must survive ordinary restart, application
close/reopen, manual application replacement, and supported version
upgrades.

Persistence/schema changes require explicit migration thinking. Avoid
destructive migration without a recovery path. Where meaningful, create a
pre-destructive-migration backup before conversion. Schema migrations
must be testable and version-aware.

Version 1.0 establishes a serious compatibility boundary. After v1.0:

- previously saved v1 games should continue opening, **or** receive a
  deliberate, intelligible migration path;
- supported old workbook formats should import or receive intelligible
  migration instructions;
- supported old CQS packs/backups should not silently become unreadable;
- migration tests become part of release confidence.

Do not casually make breaking persistence/schema changes after v1.

Architect so a bad release can be backed out without casually destroying
user data. Avoid forward-only migrations where feasible. Where rollback
across a migration cannot safely be guaranteed: detect it, document it,
preserve a backup/recovery strategy, and do not fabricate compatibility.

---

## 6. Privacy, telemetry, and support

Classroom/student content is private by default. Support diagnostics must
not include student names, class names, question text, answers, team
names, imported filenames, teacher classroom content, or other PII by
default.

Telemetry, when later authorized in
`CQS-REAL-MVP-S04D-FEEDBACK-AND-PRIVACY-SAFE-TELEMETRY`, is optional,
transparent, offline-safe, and must never block gameplay. It must not
contain classroom content by default. Intentional Feedback / Report
Problem is distinct from anonymous analytics.

No live AI runtime dependency is authorized. AI-assisted workbook
generation occurs **outside** CQS before import.

---

## 7. Security and imported content

Preserve the S03 Electron security posture: sandbox, `contextIsolation`,
`nodeIntegration` false, CSP, navigation/window restrictions, and the
exact Sony HID permission boundary (`054c:1000`).

Imported classroom content remains **data**, never executable authority.
Malformed or unknown content fails closed. Imports use the canonical
validation pipeline.

Continue explicit treatment of `CQS-Q23-CLASS-B-01` (SheetJS `xlsx`
pinned to `cdn.sheetjs.com` at build time). Do not silently repin or
widen runtime network dependence.

---

## 8. Accessibility and emergency operation

Keyboard fallback is permanent. Essential game operation must retain an
emergency keyboard path when Sony fails, disconnects, or is not used.

Preserve and qualify keyboard operation, screen-reader/VoiceOver behavior
where applicable, high contrast, reduced motion, grayscale, readable
projector typography, non-color cues for states, and accessible
focus/labels.

Reduced motion removes theatrical motion, **not** necessary state
feedback. Color may reinforce Sony team-name selection; it must not be
the only cue.

Display failure/recovery must not expose Host-private state.

---

## 9. What REAL MVP must not become

Do **not** put these into REAL MVP merely because they are plausible
later:

- user accounts
- cloud sync
- shared teacher libraries
- content marketplace
- live AI generation inside CQS
- additional buzzer ecosystems
- phone controllers
- LAN-hosted controller clients
- Raspberry Pi productization
- district admin console
- licensing/payments
- rich cloud analytics
- automatic updates
- school-wide SaaS management

Avoid architectural dead ends where inexpensive to do so. No speculative
frameworking or premature abstraction is authorized.

---

## 10. Authority boundary

This contract registers product invariants. It does **not**:

- implement S04A, S04B, S04C, S04D, S05, or S06;
- authorize a signed teacher release;
- claim packaged-macOS Sony physical qualification;
- claim Windows physical runtime qualification;
- rewrite historical Slice 23 / S01 / S02 / S03 evidence.

Successor implementation slices require separate owner/Program
authorization.
