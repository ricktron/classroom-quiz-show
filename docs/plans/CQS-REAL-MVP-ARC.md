# CQS REAL MVP Program — Plan of Record

- **Document id:** `CQS-REAL-MVP-ARC`
- **Program:** `CQS-REAL-MVP-1`
- **Registering slice:** `CQS-REAL-MVP-S01-PROGRAM-CANON-REGISTRATION`
- **S02 slice:** `CQS-REAL-MVP-S02-DESKTOP-ARCHITECTURE-QUALIFICATION`
- **S03 slice:** `CQS-REAL-MVP-S03-DESKTOP-DISTRIBUTION-AND-RELEASE-FOUNDATION`
- **S04 canon slice:** `CQS-REAL-MVP-S04-CANON-REGISTRATION`
- **Authorization:** `AUTHORIZE-CQS-REAL-MVP-S01-PROGRAM-CANON-REGISTRATION-1`
- **S02 authorization:**
  `AUTHORIZE-CQS-REAL-MVP-S02-DESKTOP-ARCHITECTURE-QUALIFICATION-1`
- **S03 authorization:**
  `AUTHORIZE-CQS-REAL-MVP-S03-DESKTOP-DISTRIBUTION-AND-RELEASE-FOUNDATION-1`
- **S04 canon authorization:**
  `AUTHORIZE-CQS-REAL-MVP-S04-CANON-REGISTRATION-1`
- **Date:** 2026-08-13
- **Status:** **ACTIVE / CANONICALLY REGISTERED**
- **Kind:** Program canon plus S02 architecture decision plus S03
  production desktop distribution foundation plus S04 product-direction
  registration. S04A is **TERMINALLY COMPLETE** after PR #72 merged as
  `29083f078521ebf432a7d7380c521c557fb578a8` and post-merge CI succeeded on
  that exact squash/main SHA. **S04B–S04D, S05, and S06 are not authorized.**

This document is the canonical **CQS REAL MVP Program** plan of record. It
registers `CQS-REAL-MVP-1` as the current owner-approved Program without
reopening or extending the historical 23-slice roadmap.

The historical completed 23-slice plan remains
[`MVP-ARC.md`](MVP-ARC.md). That file is **not** the REAL MVP authority
surface. There is **no Slice 24**.

Durable product invariants:
[`../CQS-PRODUCT-CONTRACT.md`](../CQS-PRODUCT-CONTRACT.md).

Detailed remaining product direction:
[`CQS-REAL-MVP-S04-FAMILY-DIRECTION.md`](CQS-REAL-MVP-S04-FAMILY-DIRECTION.md).

S04-family topology amendment:
[`../decisions/ROADMAP-AMENDMENT-005-real-mvp-s04-family-elaboration.md`](../decisions/ROADMAP-AMENDMENT-005-real-mvp-s04-family-elaboration.md).

Live status and contributor routing live in [`../STATUS.md`](../STATUS.md)
and [`../handoff/CURRENT.md`](../handoff/CURRENT.md). Execution rules live
in
[`../governance/EXECUTION-GUIDANCE.md`](../governance/EXECUTION-GUIDANCE.md).
This document does **not** fork or duplicate that guidance.

```text
routing ≠ authority
naming a successor slice grants no implementation authority
```

---

## 1. Authority and non-claims

S01 registered Program canon only. It did **not** select a desktop wrapper.

S02 records the evidence-based desktop architecture decision. S03
implements the production Electron thin shell and unsigned packaging path.
Subsequent REAL MVP product-direction registration (S04 canon) persisted
the owner-approved remaining product direction into repository Markdown.
This Program plan does **not**:

- resolve signing, notarization, or paid-account questions;
- authorize later S04B/S04C/S04D/S05/S06 implementation;
- reopen Slices 1–23;
- activate post-MVP arcs;
- promote Raspberry Pi, LAN, phone controllers, live in-app AI, accounts,
  cloud sync, or additional gameplay modes into REAL MVP;
- publish a public teacher-trusted signed release merely because artifacts
  can be built;
- claim packaged-macOS Sony physical qualification or Windows physical
  runtime qualification.

A named next frontier is **not** implementation authority. S04A was
separately authorized, implemented, independently reviewed, merged via PR
#72, and post-merge verified on exact squash/main
`29083f078521ebf432a7d7380c521c557fb578a8`; it is **TERMINALLY COMPLETE**.
S04B still requires separate authorization.

---

## 2. Product North Star

REAL MVP succeeds when a normal teacher can complete this path **without
developer assistance**:

```text
receive CQS
→ install/start it
→ create/import a class-specific category-board + Final game
→ configure teams
→ optionally connect supported buzzers
→ open the audience display
→ project it
→ run the complete game
→ recover from ordinary problems
→ finish and view results
→ close/reopen later
```

The product remains local-first and teacher-hosted. Host state stays private
and authoritative. The projector display stays sanitized and read-only.

Subsequent REAL MVP product-direction registration established the
teacher-acceptance scenario used to judge remaining slices: a teacher who
has never used CQS downloads it on a normal Windows school-type laptop,
installs without a terminal or developer, imports an AI-generated
Earth/Science-style game, reviews import-quality warnings, configures
four teams, uses supported Sony Buzz controllers for simultaneous
content-specific team-name choice, verifies projector and audio, plays
category-board + Final, recovers from ordinary interruption, and later
replaces/updates CQS without losing authored games. See
[`CQS-REAL-MVP-S04-FAMILY-DIRECTION.md`](CQS-REAL-MVP-S04-FAMILY-DIRECTION.md)
§34.

---

## 3. Flagship scope

REAL MVP is **one excellent original CQS**:

- **category-board**;
- **Final** (`final-wager`).

Do **not** promote additional gameplay modes into this Program. Expanded
round types, theme-song / identity-pack audio, Raspberry Pi, and
cross-device LAN remain outside REAL MVP unless a later owner decision
explicitly amends this boundary.

PWA/Web remains a supported alternate. It is not replaced by desktop work
and is not the conventional teacher install/start path this Program must
still close.

CQS is being designed as a **serious potential distributable education
product** whose first/primary owner-user is the developer/teacher. The
product principle is: build the smallest excellent teacher product, while
preserving safe paths to a larger product. This does **not** authorize
premature SaaS/commercial/cloud complexity. See
[`../CQS-PRODUCT-CONTRACT.md`](../CQS-PRODUCT-CONTRACT.md).

---

## 4. Relationship to the historical 23-slice roadmap

[`MVP-ARC.md`](MVP-ARC.md) is the historical completed 23-slice plan of
record:

```text
historical 23-slice roadmap: COMPLETE
Slice 23: TERMINALLY COMPLETE
Guidance Polish S01: TERMINALLY COMPLETE
```

That plan is preserved. This Program:

- does **not** append Slice 24 or Slice 25;
- does **not** rewrite historical slice states into REAL MVP states;
- does **not** convert `MVP-ARC.md` into the current Program plan;
- does **not** treat completing the numbered 23-slice sequence as product
  MVP complete.

The old broad “overall CQS MVP NOT COMPLETE” framing is superseded here by
the explicit REAL MVP Program framing. That is **not** a claim that the
product MVP is complete.

---

## 5. Existing qualified foundations

The following are **existing qualified foundations**. They are not unfinished
work to be rebuilt from scratch. Later REAL MVP slices requalify them only
when a change can causally affect them:

- existing gameplay;
- Final;
- scoring;
- keyboard input;
- exact Sony supported profile;
- authoring;
- packs;
- persistence/recovery;
- reset;
- summaries;
- audio;
- audience privacy;
- themes/accessibility;
- PWA/Web support.

---

## 6. Initial gap register

These are the live Program-adoption states. S01 registered the starting
gap register; later authorized slices update the states in this table.
This table is not an implementation backlog with slice-level authority.

| Gap | Program-adoption state |
| --- | --- |
| conventional macOS installation | **FOUNDATION IMPLEMENTED / UNSIGNED** |
| conventional Windows installation | **FOUNDATION IMPLEMENTED / UNSIGNED** (CI artifact path; physical Windows runtime **NOT RUN**) |
| simple desktop launch | **FOUNDATION IMPLEMENTED** |
| desktop Host/Display lifecycle | **FOUNDATION IMPLEMENTED** |
| release artifacts/version/update path | **FOUNDATION IMPLEMENTED** (manual versioned replacement; no auto-update) |
| in-app teacher team setup | **PARTIAL** — S04A Game-owned default names and name-bank seam are merged; S04B theatrical selection not begun |
| teacher-simple progressive disclosure | **FOUNDATION IMPLEMENTED** — S04A teacher Home / authoring / save-trust workflow is terminal |
| controller `F-UX-01` | **POLISH REQUIRED** — S04B product direction registered; implementation not begun |
| feedback/support path | **OPEN** — S04D product direction registered; implementation not begun |
| flagship visual fidelity | **POLISH / REQUALIFICATION REQUIRED** — S05 direction registered; implementation not begun |
| packaged offline/recovery equivalence | **FOUNDATION IMPLEMENTED** (Electron shell + IndexedDB identity) |
| packaged macOS qualification | **PARTIAL** (packaged Host launch observed; physical Sony **DEFERRED / NOT RUN / HARDWARE UNAVAILABLE**) |
| packaged Windows qualification | **OPEN** (CI installer path; physical Windows runtime **NOT RUN**) |
| clean-room teacher qualification | **OPEN** |
| C-3 | **FOUNDATION IMPLEMENTED / UNSIGNED** |
| C-6 | **FOUNDATION IMPLEMENTED / UNSIGNED** |
| `CQS-Q23-CLASS-B-01` | **OPEN / CONTROLLED** (build-time `cdn.sheetjs.com` fetch; bundled at runtime; not re-pinned) |
| `CQS-Q23-LOW-02` | **OPEN / LOW / MONITOR** |
| `CQS-OD-066` | **DEFERRED / NOT REAL MVP** |

Retained finding identity is preserved:

- `LOW-01` / `F-UX-01` (`CQS-Q23-LOW-01`) remains the controller-setup
  jargon polish item, now **POLISH REQUIRED** for REAL MVP adoption and
  assigned to S04B direction.
- `LOW-02` (`CQS-Q23-LOW-02`) remains measured startup/precache size and the
  recorded installed-PWA Chrome-tab close caveat; **OPEN / LOW / MONITOR**.
  Do not prematurely optimize merely to make the metric disappear.
- `CLASS-B-01` (`CQS-Q23-CLASS-B-01`) remains the SheetJS packaging /
  supply-chain concern; **OPEN / CONTROLLED** (build-time `cdn.sheetjs.com`
  fetch; bundled at runtime; not re-pinned). S03 CI/local desktop builds
  must be able to reach that host. Packaged end-user runtime must not.
- `CQS-OD-066` remains unresolved GCS learning-target linkage and is
  **not required** to complete REAL MVP.

C-7 Raspberry Pi and C-8 LAN are **outside REAL MVP**. They are not promoted
by this register.

### 6.1 Retained physical and release gates

| Gate | Status | Close-by |
| --- | --- | --- |
| Packaged macOS Sony physical | **DEFERRED / NOT RUN / HARDWARE UNAVAILABLE** | no later than terminal S04B; remain represented in S06 |
| Windows physical runtime | **NOT RUN** | S06, before v1 teacher-ready qualification |
| Signing / notarization | **OPEN OWNER GATE** | before any teacher-trusted release claim. Windows signing / SmartScreen has higher strategic release priority than Apple signing / notarization if prioritization is necessary |

Do not infer Windows runtime PASS from GitHub Actions packaging. Do not
silently declare a teacher-trusted signed release.

---

## 7. Program sequence

This is the current **gap-driven** sequence:

1. `CQS-REAL-MVP-S01-PROGRAM-CANON-REGISTRATION`
2. `CQS-REAL-MVP-S02-DESKTOP-ARCHITECTURE-QUALIFICATION`
3. `CQS-REAL-MVP-S03-DESKTOP-DISTRIBUTION-AND-RELEASE-FOUNDATION`
4. `CQS-REAL-MVP-S04-CANON-REGISTRATION`
5. `CQS-REAL-MVP-S04A-TEACHER-WORKFLOW-AUTHORING-AND-SESSION-MODEL`
6. `CQS-REAL-MVP-S04B-SONY-TEAM-SELECTION-AND-CLASSROOM-SETUP`
7. `CQS-REAL-MVP-S04C-PRODUCT-SAFETY-RECOVERY-AND-COMPATIBILITY-UX`
8. `CQS-REAL-MVP-S04D-FEEDBACK-AND-PRIVACY-SAFE-TELEMETRY`
9. `CQS-REAL-MVP-S05-FLAGSHIP-VISUAL-FIDELITY-AND-GAME-SHOW-CHOREOGRAPHY`
10. `CQS-REAL-MVP-S06-WINDOWS-FIRST-INTEGRATED-RELEASE-QUALIFICATION`

The earlier named frontier
`CQS-REAL-MVP-S04-TEACHER-SIMPLE-SETUP-AND-SUPPORT` is **elaborated**, not
erased. Subsequent REAL MVP product-direction registration established
the S04-family subdivision. Historical S01–S03 documents that named the
undivided S04 frontier remain historically accurate.

The Program Orchestrator may amend this sequence if evidence materially
changes assumptions. Naming a successor slice grants **no implementation
authority**.

S01 is the registering slice. S02 selected Electron as the primary desktop
architecture (ADR-021 Accepted). S03 implements the production thin shell
and unsigned packaging path. S04 canon registers remaining product
direction. S04A is **TERMINALLY COMPLETE** after the accepted PR #72 tree
was squash-merged as `29083f078521ebf432a7d7380c521c557fb578a8` and
post-merge CI succeeded on that exact main SHA. S04B is the next planned
frontier and is **not authorized** by this document.

S04A terminal evidence:
[`../receipts/2026-08-14-cqs-real-mvp-s04a-terminal-post-merge-reconciliation.md`](../receipts/2026-08-14-cqs-real-mvp-s04a-terminal-post-merge-reconciliation.md).

There is no Slice 24.

Primary remaining-slice scope is recorded in
[`CQS-REAL-MVP-S04-FAMILY-DIRECTION.md`](CQS-REAL-MVP-S04-FAMILY-DIRECTION.md)
§35.

---

## 8. Architecture state

S02 selects **Electron** as the primary REAL MVP desktop architecture.
S03 implements that architecture as a production thin shell.

The decision is recorded in
[`../architecture/ADR-021-real-mvp-desktop-architecture-electron.md`](../architecture/ADR-021-real-mvp-desktop-architecture-electron.md).
ADR-021 is **Accepted**. The production shell, unsigned packaging path, and
release-build workflow live in this tree.

Disposition of the S01 comparison set:

- **Electron** — **selected and production-implemented** as a thin Chromium
  shell around the existing React/Vite core. Physical packaged Sony
  requalification remains deferred / not run / hardware unavailable and
  must close no later than terminal S04B, remaining represented in S06.
- **Tauri** — **rejected** as the primary wrapper. Official Tauri 2 macOS
  webview is WKWebView; system WKWebView has no `navigator.hid`. A native
  HID keep-alive would be a second controller architecture.
- **PWA/Web** — remains a supported alternate. Not replaced.

Canonical platform order after S04 product-direction registration:

- **Development:** macOS, primarily the owner's MacBook.
- **Teacher / production target:** Windows primary, macOS secondary,
  Web/PWA supported alternate.

Program principle: develop on macOS; design, package, and qualify for
Windows-first teacher adoption.

Permanent architecture that this Program must preserve:

- one shared application/game core, not separate desktop product logic;
- private authoritative Host;
- sanitized read-only Display;
- keyboard fallback remains permanent;
- exact Sony support claims only;
- imported content remains data, never executable code;
- malformed or unknown content fails closed;
- reusable Game content remains distinct from per-class Session state;
- teacher data survives supported upgrades and ordinary replacement.

---

## 9. Release direction

S03 adopts these as the REAL MVP **minimum** release-foundation facts:

- GitHub Actions produces versioned unsigned macOS and Windows artifacts
  with source SHA provenance. GitHub Releases may be used later for
  distribution; this Program does **not** publish a public teacher release
  merely because artifacts can be built.
- Manual versioned replacement is the REAL MVP update model. Auto-update
  is not implemented.
- Application identity (`com.classroomquizshow.app` / Classroom Quiz Show)
  is stable across version bumps so IndexedDB survives replacement.
- Signing/notarization remain owner gates. Unsigned artifacts must be
  labeled as such.

Subsequent REAL MVP product-direction registration added:

- Windows signing / SmartScreen has higher strategic release priority
  than Apple signing / notarization if prioritization is necessary;
- a CI-generated Windows artifact remains **build evidence only**;
- physical Windows classroom-machine qualification is required before v1;
- every distributable build should remain traceable to app version,
  source SHA, release/build date where applicable, target platform, and
  signing state;
- a simple About / Version / Check for Updates experience may be
  architected before serious distribution; checking must fail
  safely/offline; no background updater is implied.

---

## 10. Owner gates

Recorded and **deferred** until the dependent slices. S01 does **not**
resolve them:

- macOS signing identity / Apple Developer Program or eligible
  institutional fee waiver;
- Windows signing approach;
- exact feedback/support email;
- supported CPU/OS matrix;
- real Windows qualification availability or owner waiver;
- independent teacher clean-room beta or owner waiver;
- flagship visual reference image before terminal visual adjudication.

S04 canon does **not** resolve these gates either.

---

## 11. Permanent boundaries

Preserve explicitly:

- local-first;
- no required backend, account, cloud, or AI service;
- no student phones and no networked buzzers;
- one shared application/game core, not separate desktop product logic;
- private authoritative Host;
- sanitized read-only Display;
- keyboard fallback permanent;
- exact Sony support claims only;
- [`MVP-ARC.md`](MVP-ARC.md) remains historical;
- Raspberry Pi / LAN outside REAL MVP;
- additional gameplay modes outside REAL MVP;
- Product Contract invariants in
  [`../CQS-PRODUCT-CONTRACT.md`](../CQS-PRODUCT-CONTRACT.md).

Canonical product identity:
[`../PROJECT.md`](../PROJECT.md). Engine boundaries:
[`../architecture/GAME-ENGINE-BOUNDARIES.md`](../architecture/GAME-ENGINE-BOUNDARIES.md).

Do **not** put these into REAL MVP merely because they are plausible
later: user accounts, cloud sync, shared teacher libraries, content
marketplace, live AI generation inside CQS, additional buzzer ecosystems,
phone controllers, LAN-hosted controller clients, Raspberry Pi
productization, district admin console, licensing/payments, rich cloud
analytics, automatic updates, or school-wide SaaS management.

---

## 12. Next Program frontier

`CQS-REAL-MVP-S04A-TEACHER-WORKFLOW-AUTHORING-AND-SESSION-MODEL` is
**TERMINALLY COMPLETE**. The next planned Program frontier is
`CQS-REAL-MVP-S04B-SONY-TEAM-SELECTION-AND-CLASSROOM-SETUP`.

```text
routing ≠ authority
S04A: TERMINALLY COMPLETE
S04B: PLANNED / NOT AUTHORIZED
S04C/S04D/S05/S06: NOT AUTHORIZED
```

S04B requires a separate Program Orchestrator authorization before any
implementation begins.
