# CQS REAL MVP Program — Plan of Record

- **Document id:** `CQS-REAL-MVP-ARC`
- **Program:** `CQS-REAL-MVP-1`
- **Registering slice:** `CQS-REAL-MVP-S01-PROGRAM-CANON-REGISTRATION`
- **S02 slice:** `CQS-REAL-MVP-S02-DESKTOP-ARCHITECTURE-QUALIFICATION`
- **S03 slice:** `CQS-REAL-MVP-S03-DESKTOP-DISTRIBUTION-AND-RELEASE-FOUNDATION`
- **Authorization:** `AUTHORIZE-CQS-REAL-MVP-S01-PROGRAM-CANON-REGISTRATION-1`
- **S02 authorization:**
  `AUTHORIZE-CQS-REAL-MVP-S02-DESKTOP-ARCHITECTURE-QUALIFICATION-1`
- **S03 authorization:**
  `AUTHORIZE-CQS-REAL-MVP-S03-DESKTOP-DISTRIBUTION-AND-RELEASE-FOUNDATION-1`
- **Date:** 2026-08-13
- **Status:** **ACTIVE / CANONICALLY REGISTERED**
- **Kind:** Program canon registration plus S02 architecture decision plus
  S03 production desktop distribution foundation. **S04 is not authorized.**

This document is the canonical **CQS REAL MVP Program** plan of record. It
registers `CQS-REAL-MVP-1` as the current owner-approved Program without
reopening or extending the historical 23-slice roadmap.

The historical completed 23-slice plan remains
[`MVP-ARC.md`](MVP-ARC.md). That file is **not** the REAL MVP authority
surface. There is **no Slice 24**.

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
This Program plan does **not**:

- resolve signing, notarization, or paid-account questions;
- authorize or begin
  `CQS-REAL-MVP-S04-TEACHER-SIMPLE-SETUP-AND-SUPPORT`;
- reopen Slices 1–23;
- activate post-MVP arcs;
- promote Raspberry Pi, LAN, or additional gameplay modes into REAL MVP;
- publish a public teacher-trusted signed release merely because artifacts
  can be built.

A named next frontier is **not** implementation authority. S04 requires
**separate owner/Program authorization**.

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
| conventional Windows installation | **FOUNDATION IMPLEMENTED / UNSIGNED** (CI artifact path; physical Windows runtime not claimed) |
| simple desktop launch | **FOUNDATION IMPLEMENTED** |
| desktop Host/Display lifecycle | **FOUNDATION IMPLEMENTED** |
| release artifacts/version/update path | **FOUNDATION IMPLEMENTED** (manual versioned replacement; no auto-update) |
| in-app teacher team setup | **OPEN** |
| teacher-simple progressive disclosure | **POLISH REQUIRED** |
| controller `F-UX-01` | **POLISH REQUIRED** |
| feedback/support path | **OPEN** |
| flagship visual fidelity | **POLISH / REQUALIFICATION REQUIRED** |
| packaged offline/recovery equivalence | **FOUNDATION IMPLEMENTED** (Electron shell + IndexedDB identity) |
| packaged macOS qualification | **PARTIAL** (packaged Host launch observed; physical Sony not run) |
| packaged Windows qualification | **OPEN** (CI installer path; physical Windows runtime not run) |
| clean-room teacher qualification | **OPEN** |
| C-3 | **FOUNDATION IMPLEMENTED / UNSIGNED** |
| C-6 | **FOUNDATION IMPLEMENTED / UNSIGNED** |
| `CQS-Q23-CLASS-B-01` | **ACCEPTABLE FOR S03 WITH DOCUMENTED CONTROL** |
| `CQS-Q23-LOW-02` | **OPEN LOW / MONITOR ONLY** |
| `CQS-OD-066` | **DEFERRED / NOT REQUIRED FOR REAL MVP** |

Retained finding identity is preserved:

- `LOW-01` / `F-UX-01` (`CQS-Q23-LOW-01`) remains the controller-setup
  jargon polish item, now **POLISH REQUIRED** for REAL MVP adoption.
- `LOW-02` (`CQS-Q23-LOW-02`) remains measured startup/precache size and the
  recorded installed-PWA Chrome-tab close caveat; **OPEN LOW / MONITOR ONLY**.
- `CLASS-B-01` (`CQS-Q23-CLASS-B-01`) remains the SheetJS packaging /
  supply-chain concern; **ACCEPTABLE FOR S03 WITH DOCUMENTED CONTROL**
  (build-time `cdn.sheetjs.com` fetch; bundled at runtime; not re-pinned).
  S03 CI/local desktop builds must be able to reach that host. Packaged
  end-user runtime must not.
- `CQS-OD-066` remains unresolved GCS learning-target linkage and is
  **not required** to complete REAL MVP.

C-7 Raspberry Pi and C-8 LAN are **outside REAL MVP**. They are not promoted
by this register.

---

## 7. Program sequence

This is an initial **gap-driven** sequence:

1. `CQS-REAL-MVP-S01-PROGRAM-CANON-REGISTRATION`
2. `CQS-REAL-MVP-S02-DESKTOP-ARCHITECTURE-QUALIFICATION`
3. `CQS-REAL-MVP-S03-DESKTOP-DISTRIBUTION-AND-RELEASE-FOUNDATION`
4. `CQS-REAL-MVP-S04-TEACHER-SIMPLE-SETUP-AND-SUPPORT`
5. `CQS-REAL-MVP-S05-FLAGSHIP-VISUAL-FIDELITY`
6. `CQS-REAL-MVP-S06-INTEGRATED-RELEASE-QUALIFICATION`

The Program Orchestrator may amend this sequence if evidence materially
changes assumptions. Naming a successor slice grants **no implementation
authority**.

S01 is the registering slice. S02 selected Electron as the primary desktop
architecture (ADR-021 Accepted). S03 implements the production thin shell
and unsigned packaging path. S04 is the next planned Program frontier and
**requires separate Program/owner authorization**. S04 is **not authorized**
by this document.

There is no Slice 24.

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
  requalification remains S06 debt where hardware was not attached during
  S03.
- **Tauri** — **rejected** as the primary wrapper. Official Tauri 2 macOS
  webview is WKWebView; system WKWebView has no `navigator.hid`. A native
  HID keep-alive would be a second controller architecture.
- **PWA/Web** — remains a supported alternate. Not replaced.

Permanent architecture that this Program must preserve:

- one shared application/game core, not separate desktop product logic;
- private authoritative Host;
- sanitized read-only Display;
- keyboard fallback remains permanent;
- exact Sony support claims only;
- imported content remains data, never executable code;
- malformed or unknown content fails closed.

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
- additional gameplay modes outside REAL MVP.

Canonical product identity:
[`../PROJECT.md`](../PROJECT.md). Engine boundaries:
[`../architecture/GAME-ENGINE-BOUNDARIES.md`](../architecture/GAME-ENGINE-BOUNDARIES.md).

---

## 12. Next Program frontier

`CQS-REAL-MVP-S04-TEACHER-SIMPLE-SETUP-AND-SUPPORT` is the next planned
Program frontier and requires separate owner/Program authorization.

```text
routing ≠ authority
S04: NOT AUTHORIZED pending separate Program authority
```
