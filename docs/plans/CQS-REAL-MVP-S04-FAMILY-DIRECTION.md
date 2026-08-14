# CQS REAL MVP S04-family product direction

- **Document id:** `CQS-REAL-MVP-S04-FAMILY-DIRECTION`
- **Program:** `CQS-REAL-MVP-1`
- **Registering slice:** `CQS-REAL-MVP-S04-CANON-REGISTRATION`
- **Authorization:** `AUTHORIZE-CQS-REAL-MVP-S04-CANON-REGISTRATION-1`
- **Date:** 2026-08-13
- **Status:** **ACTIVE / CANONICALLY REGISTERED**
- **Kind:** approved S04-family product-direction specification.
  **Documentation only. No S04A/S04B/S04C/S04D/S05/S06 product
  implementation is authorized by this file.**

This document is the durable product-direction specification for the
remaining REAL MVP teacher-product work. A fresh Program or Slice
Orchestrator must be able to recover this direction from repository
Markdown without ChatGPT conversation memory, Notion, Cursor history, or
unstored owner context.

It elaborates the earlier named frontier
`CQS-REAL-MVP-S04-TEACHER-SIMPLE-SETUP-AND-SUPPORT`. It does **not**
rewrite completed S01–S03 or the historical 23-slice plan.

Canonical companions:

- Product Contract: [`../CQS-PRODUCT-CONTRACT.md`](../CQS-PRODUCT-CONTRACT.md)
- Program topology: [`CQS-REAL-MVP-ARC.md`](CQS-REAL-MVP-ARC.md)
- Amendment: [`../decisions/ROADMAP-AMENDMENT-005-real-mvp-s04-family-elaboration.md`](../decisions/ROADMAP-AMENDMENT-005-real-mvp-s04-family-elaboration.md)

```text
routing ≠ authority
this specification is not S04A implementation authority
```

---

## 1. What kind of product CQS is becoming

CQS is being designed as a **serious potential distributable education
product** whose first/primary owner-user is the developer/teacher.

It is no longer being designed merely as a personal classroom utility.
REAL MVP must avoid architectural decisions that make later distribution,
compatibility, privacy, support, recovery, school-IT adoption, or
teacher-data durability unnecessarily expensive.

This does **not** authorize premature SaaS, commercial, or cloud
complexity.

**Product principle:**

```text
BUILD THE SMALLEST EXCELLENT TEACHER PRODUCT,
WHILE PRESERVING SAFE PATHS TO A LARGER PRODUCT.
```

**What v1 is:** one excellent original CQS that a normal teacher can
receive, install, author or import, set up, project, play through
category-board + Final, recover from ordinary problems, and reopen later
— without a terminal, a developer, or JSON knowledge. Flagship scope
remains **category-board** and **Final** (`final-wager`) only.

---

## 2. Platform strategy

| Role | Order |
| --- | --- |
| Development | 1. macOS, primarily the owner's MacBook |
| Teacher / production target | 1. **Windows — primary**; 2. macOS — secondary; 3. Web/PWA — supported alternate |

```text
Develop on macOS;
design, package, and qualify for Windows-first teacher adoption.
```

Windows-first implications:

- normal teacher path must never require a terminal;
- conventional installer / app launch;
- Start Menu / Desktop familiarity;
- per-user / no-admin install preferred where technically feasible;
- Windows scaling / projector behavior is first-class;
- SmartScreen and institutional restrictions are first-class release
  concerns;
- Windows signing has higher release priority than Apple
  signing/notarization if tradeoffs must be made;
- a CI-generated Windows artifact is **build evidence only**;
- actual physical Windows classroom-machine qualification is required
  before v1.

S03 already implemented the unsigned Electron packaging path. This
direction does not reopen that architecture. It records the teacher-target
priority that remaining packaging, UX, and S06 qualification must serve.

---

## 3. Ordinary teacher experience

Canonical ordinary teacher experience:

```text
Home
→ New Game / Resume
→ Game
→ Teams
→ Sony Buzzers (optional)
→ Projector
→ Play
```

Use a **simple dashboard + optional first-run guidance**. Do **not**
impose a mandatory wizard on every session.

Normal teacher surfaces use **product language**, not implementation
language. Hide under Advanced / Diagnostics as appropriate:

- IndexedDB
- WebHID
- Gamepad adapter details
- canonical JSON internals
- persistence internals
- device IDs
- engineering diagnostics
- storage mechanics

Every ordinary screen should make the next useful action obvious.

The Host should remain restrained, fast, obvious, and operational even
when the Display becomes highly theatrical in S05.

---

## 4. Game library / file-management philosophy

The product should behave increasingly like a **game library** rather
than a file utility.

Target concepts: **My Games** / **Recent Games**.

Common actions: New, Duplicate, Rename, Edit, Play, Export.

A teacher should not normally have to understand JSON, pack internals,
file locations, or storage implementation.

A built-in Demo Game should remain or become an easy confidence path for
a first launch where consistent with existing architecture.

---

## 5. Game versus Session — hard product model

This distinction is canonical.

### Game

Reusable authored content. Examples:

- title
- categories
- tiles / questions
- answers
- Final content
- game-specific humorous team-name bank
- authoring metadata
- workbook / template provenance where applicable

### Session

A particular classroom run of a Game. Examples:

- active teams
- chosen team identities / names
- controller / team assignments
- scores
- board progress
- buzz state
- wagers
- Final progress
- session recovery state
- result / summary state

A saved question game **must** be reusable across different
classes/periods without retaining previous class team identities as
authored game content.

Reset Session must not accidentally erase the saved reusable Game. Game
deletion and Session reset are conceptually distinct.

Engine types (`GameDefinition`, `GameSession` / `PrivateGameState`)
remain defined in
[`../architecture/GAME-ENGINE-BOUNDARIES.md`](../architecture/GAME-ENGINE-BOUNDARIES.md)
and ADR-003. Those types must continue to serve this teacher-facing rule.

---

## 6. In-app board authoring

Ordinary teachers must be able to author a complete category-board +
Final game inside CQS. **No JSON or spreadsheet should be mandatory.**

Primary authoring metaphor:

```text
THE BOARD ITSELF IS THE EDITOR / REVIEW SURFACE.
```

The teacher can:

- create a blank board;
- duplicate an existing game;
- edit game title;
- edit category headers;
- click individual tiles one-by-one;
- edit Final;
- review completion visually;
- return directly to the board after editing;
- see missing / incomplete content clearly.

Focused tile editing should support existing game-domain fields such as:

- prompt / question
- canonical answer
- alternate acceptable answers where supported
- teacher notes where supported
- optional supported media / image where supported
- value

Provide sensible Save / Next / Previous behavior. Do not force a teacher
through dozens of disconnected forms.

Retain spreadsheet import as a power / bulk-authoring path.

Undo/redo for recent authoring actions is desirable within S04A if it can
be implemented safely and boundedly. If implementation cost proves
disproportionate, record an explicit deferral rather than silently
omitting it.

---

## 7. Autosave / save confidence

Autosave is desirable but **must be visible**.

Teacher-facing states such as:

- Saved just now
- Saving…
- Save problem

Persistence failure must become a visible warning. A teacher must never
reasonably believe work is saved when persistence has failed.

---

## 8. AI-generated spreadsheet import loop

No live AI is required inside CQS v1. AI-assisted generation occurs
**outside** CQS before import.

Workbook / template generation instructions should become a durable,
versioned contract. Imported AI-generated workbooks should include a
machine-readable template / schema version. CQS should eventually know
which workbook versions it supports and provide intelligible
compatibility / migration feedback.

### Why there is no live AI

Live AI would add a required network/runtime dependency, privacy
surface, and support burden that contradicts local-first REAL MVP
invariants. The approved loop keeps generation outside the product and
keeps CQS as the validator.

### Import Quality Report (S04A)

S04A should include an **Import Quality Report** that can deterministically
report issues such as:

- incomplete / missing tiles
- malformed fields
- unsupported formatting
- excessive text lengths
- duplicate / near-duplicate team names where deterministic detection is
  possible
- insufficient team-name inventory
- team-name length problems
- obvious generic-name problems where deterministic rules support it
- category / topic representation warnings where safely detectable
- possible answer leakage where safely / deterministically detectable
- other schema / quality issues supported by actual validation

Do **not** pretend deterministic validation is AI understanding. Where
semantic judgment cannot be reliable without AI, frame feedback as
heuristics / warnings rather than certainty.

### Export Generation Feedback

Provide a small text / Markdown artifact suitable for pasting back into
ChatGPT or another AI when generating the next workbook.

Intended loop:

```text
AI generates workbook
→ CQS imports
→ CQS validates / reports
→ teacher plays / reviews
→ CQS exports concrete generation feedback
→ next workbook-generation prompt improves
```

This is a long-term product-learning mechanism.

Subsequent REAL MVP product-direction registration established this
bounded REAL MVP import-quality loop. It does **not** activate the
broader post-MVP authoring arc in
[`LLM-SPREADSHEET-AUTHORING-ARC.md`](LLM-SPREADSHEET-AUTHORING-ARC.md).

---

## 9. AI team-name generation contract

AI-generated game workbooks should include a large **game-owned**
team-name bank.

| Guidance | Value |
| --- | --- |
| Recommended target | **96 unique team names** |
| Strong quality warning | fewer than **64** for AI-generated workbooks |
| Import failure | insufficient names should **not** necessarily make an otherwise usable game catastrophically unimportable |

Names **must** aim to be:

- humorous
- school-safe
- recognizable to students
- meaningfully connected to actual game content
- clever / punny / referential where appropriate
- not generic filler
- not nonsensical
- reasonably short for projector / scoreboard display
- unique / not near-duplicate
- distributed across the game's content rather than overfitting one
  category
- non-targeted at real students / teachers / people
- free from sexual, drug, discriminatory, humiliating, appearance-based,
  disability-based, racial, religious, or otherwise inappropriate humor
- free from profanity / disguised profanity
- free from answer spoilers

Generation instructions should use a quality process conceptually
equivalent to:

1. **READ** actual game content.
2. **GENERATE** more candidates than required (for example 120+).
3. **CRITIQUE** / filter candidates.
4. **REJECT** generic, strained, confusing, duplicate, inappropriate,
   too-long, irrelevant, or answer-revealing names.
5. **SELECT** the best approximately 96.

Useful semantic rule: if the joke/reference requires an explanation to
understand why it belongs to this game, it is probably a weak candidate.

No live AI runtime dependency is authorized.

---

## 10. Sony-only team-name selection

For v1, the theatrical simultaneous name-selection interaction is **only**
for the existing supported Sony Buzz profile.

| Fact | Value |
| --- | --- |
| Supported exact profile | `cqs.sony-buzz.namtai-wbuzz-wireless.v1` |
| Receiver | VID:PID `054c:1000` |

Do **not** prematurely generalize this interaction to arbitrary Gamepads,
phones, LAN controllers, other buzzer families, or keyboard-per-team
emulation. Those can be future expansion.

When Sony is not used:

```text
TEACHER MANUAL TEAM-NAME ENTRY IS THE FALLBACK.
```

Subsequent REAL MVP product-direction registration established this
bounded Sony-only v1 experience. It does **not** activate the broader
post-MVP identity-pack / mascot / sound arc in
[`HOST-CONSOLE-TEAM-IDENTITY-AND-PRESENTATION.md`](HOST-CONSOLE-TEAM-IDENTITY-AND-PRESENTATION.md).

---

## 11. Simultaneous Sony name choice

All active teams choose names **at the same time**.

Each team's selection card/list presents **exactly four** active choices.

| Control | Meaning |
| --- | --- |
| Yellow | choice 1 |
| Green | choice 2 |
| Orange | choice 3 |
| Blue | choice 4 |
| Large Red | **four more for this team only** |

Red **must not** reroll another team's choices.

Use light / pastel versions of the four controller colors with sufficient
readable contrast. Do not rely on color alone; position, labels, and
state must retain accessibility.

When a team selects:

- the chosen name remains in the corresponding light controller color;
- the chosen name becomes visually dominant;
- the other three choices become monochrome / desaturated;
- selection locks / clearly confirms;
- other teams continue independently;
- an optional short confirmation animation/state may reinforce successful
  input.

---

## 12. Team-name deck / uniqueness / cycling

Treat the 96 names as a **game-specific name deck**.

**Hard invariant:**

```text
THE SAME NAME MUST NEVER APPEAR ON TWO TEAM LISTS AT THE SAME TIME.
```

Additional behavior:

- active visible choices are reserved against other teams;
- a final selected name becomes unavailable to all other teams for that
  session;
- a team should not see a repeated option until it has cycled through all
  available eligible choices for that team;
- repeated red presses advance that team's choices;
- once the usable cycle is exhausted, the choices **wrap / cycle** rather
  than permanently running out;
- cycling must continue to respect currently reserved names and names
  already selected by other teams;
- one team's red press affects only that team;
- add only a small hardware/input debounce necessary to prevent one
  physical press from being registered multiple times;
- do **not** impose a punitive behavioral cooldown merely to stop
  students from rapidly browsing names.

If students intentionally spam Red, rapid cycling is acceptable and may
be fun, provided input remains technically stable.

---

## 13. Classroom readiness

S04-family UX should include an obvious pre-game readiness concept.

Target summary:

| Surface | States |
| --- | --- |
| Game | ✓ / warning |
| Teams | ✓ / warning |
| Sony | ✓ / optional / warning |
| Display | ✓ / warning |
| Audio | ✓ / warning |

Provide a practical projector / display test or preview. The teacher
should be able to verify before class:

- sample Display rendering
- timer visibility
- scores
- long-text behavior where appropriate
- audio cue
- display selection / location

Provide a simple audio test and an obvious immediate **MUTE ALL SOUNDS**
control. Do not build a complicated audio mixer for REAL MVP.

---

## 14. Rehearsal / preview

Provide or architect a teacher rehearsal path where the teacher can
inspect / run through the game before class without corrupting the real
classroom session.

Do not let rehearsal accidentally become canonical scored session
history.

---

## 15. Data durability, v1 compatibility, and rollback

Canonical invariant: **a teacher's saved game/data is more valuable than
any individual software release.** Design all remaining work accordingly.

Teacher-created content must survive ordinary:

- restart
- application close / reopen
- manual application replacement
- supported version upgrades

Persistence / schema changes require explicit migration thinking. Avoid
destructive migration without a recovery path. Where meaningful, create a
pre-destructive-migration backup before conversion. Schema migrations
must be testable and version-aware.

### v1 compatibility boundary

Version 1.0 establishes a serious compatibility boundary. After v1.0:

- previously saved v1 games should continue opening, **or** receive a
  deliberate, intelligible migration path;
- supported old workbook formats should import or receive intelligible
  migration instructions;
- supported old CQS packs / backups should not silently become
  unreadable;
- migration tests become part of release confidence.

Do not casually make breaking persistence / schema changes after v1.

### Rollback compatibility

Architect so a bad release can be backed out without casually destroying
user data. Avoid forward-only migrations where feasible. Where rollback
across a migration cannot safely be guaranteed: detect it, document it,
preserve backup / recovery strategy, and do not fabricate compatibility.

S06 should exercise realistic upgrade / replacement and rollback cases.

---

## 16. Backup / portability

Architect toward:

```text
EXPORT ALL CQS DATA
IMPORT BACKUP
```

This need not all land in one slice if bounded implementation dictates
otherwise, but the data model must not make it unnecessarily difficult.

Backup should distinguish user-owned content from ephemeral / runtime /
cache data.

---

## 17. Corrupt / partial imports

Assume real teachers will import spreadsheets that have been hand-edited,
generated by different AI systems, modified in Excel, modified in Google
Sheets, converted between formats, or partially malformed.

CQS must not crash as the primary behavior.

Target:

```text
VALIDATE
→ EXPLAIN
→ SAFELY SALVAGE WHAT CAN BE SALVAGED
→ LET TEACHER FIX PROBLEMS
```

Do not silently invent missing academic content.

---

## 18. Content / format versioning

Version durable interchange formats, including as applicable:

- workbook template / schema
- CQS pack / export schema
- backup schema
- persisted application schema

Compatibility failures should produce human-readable messages.

---

## 19. Safe mode / startup recovery

A bad last-session restore must not permanently lock a teacher out of
CQS.

Provide / architect a path equivalent to:

```text
START CQS WITHOUT RESTORING LAST SESSION
```

Safe startup must avoid deleting the teacher's library merely to escape a
broken active session.

---

## 20. Sanitized diagnostics

Provide / architect a **Copy Diagnostic Report**.

Useful fields may include:

- CQS version
- OS / version
- Display resolution / status
- Sony profile / device status
- controller count / transport state
- Gamepad / WebHID availability where relevant
- audio availability
- persistence schema / version / health
- recent sanitized application error identifiers
- import-validation summary
- recovery status

**Hard privacy rule — do not include by default:**

- student names
- class names
- question text
- answers
- team names
- imported filenames
- teacher classroom content
- PII

Support should not require developer tools for basic diagnosis.

---

## 21. School IT reality

Windows deployment must account for:

- teachers without administrator rights;
- SmartScreen;
- managed devices;
- executable download restrictions;
- USB / HID policy;
- institutional software restrictions.

Prefer a per-user installer that does not require admin where technically
appropriate.

Future teacher-ready distribution should have a concise IT-department
document covering things such as:

- application identity / publisher
- supported OS
- install scope
- storage location
- network requirements
- offline behavior
- telemetry behavior
- privacy posture
- Sony VID:PID `054c:1000`
- required permissions
- update model

Do **not** claim institutional compatibility until actually tested.

---

## 22. Display / projector resilience

Qualification / design must account for:

- 100 / 125 / 150% Windows scaling
- 1920×1080
- 1280×720
- mirrored vs extended displays
- projector becoming primary display
- Display opening on the wrong monitor
- projector disconnect / reconnect
- resolution changes during a session
- sleep / wake
- laptop lid changes where relevant
- reopening Display after accidental close

Architect toward a simple action similar to **Move Display to Projector**
where practical.

Do not expose Host-private state on Display during recovery.

---

## 23. Audio device resilience

HDMI / projector connection may change default audio output.

CQS should make audio readiness obvious. Provide:

- audio test
- immediate mute

Do not assume the intended device is always the OS default. Advanced
device selection is not required unless discovery proves it necessary.

---

## 24. Keyboard emergency path

Keyboard fallback is permanent.

Essential game operation must retain an emergency keyboard path when Sony
fails, disconnects, or is not used. Sony enhancements must **not** weaken
this invariant.

---

## 25. Accessibility

Preserve and qualify:

- keyboard operation
- screen-reader / VoiceOver behavior where applicable
- high contrast
- reduced motion
- grayscale
- readable projector typography
- non-color cues for states
- accessible focus / labels

Reduced motion removes theatrical motion, **not** necessary state
feedback.

Sony team-name selection may use button colors but may not rely only on
color.

---

## 26. Destructive-action safety

Use confirmation for genuinely destructive actions. Do **not** plaster
confirmations on ordinary workflow actions.

A Reset Session action must not accidentally erase the saved reusable
Game. Make Game deletion and Session reset conceptually distinct.

---

## 27. Release provenance

Every distributable build should remain traceable to:

- app version
- source SHA
- release / build date where applicable
- target platform
- signing state

Checksums are desirable for formal releases. Artifact provenance already
introduced in S03 should be preserved.

---

## 28. Dependency / security hygiene

Preserve the S03 Electron security posture.

Imported classroom content remains data, never executable authority.

Preserve:

- sandbox
- `contextIsolation`
- `nodeIntegration` false
- CSP
- navigation / window restrictions
- exact Sony HID permission boundary
- controlled dependency installation

Continue explicit treatment of **`CQS-Q23-CLASS-B-01`**: SheetJS `xlsx`
pinned to `cdn.sheetjs.com` at build time. Do not silently repin or widen
runtime network dependence.

Continue monitoring **`CQS-Q23-LOW-02`** bundle size.

---

## 29. Feedback / telemetry — separate slice

Do **not** add telemetry to S04A / S04B / S04C.

Register separate
`CQS-REAL-MVP-S04D-FEEDBACK-AND-PRIVACY-SAFE-TELEMETRY`.

Intent: optional / privacy-safe product-learning system.

Potential initial collection destination: a small HTTPS endpoint / Google
Apps Script → a Google Sheet in the owner's Google Drive. This backend
choice is an **implementation direction**, not permission to send
classroom content.

Telemetry requirements:

- opt-in / transparent;
- offline-safe;
- failure must never block gameplay;
- local-first remains true;
- no classroom / student content by default.

Potential anonymous usage data:

- CQS version
- OS
- launch
- game started / completed
- category-board / Final usage
- number of teams
- keyboard / Sony usage
- Display opened
- recovery used
- broad error identifiers
- approximate session duration
- workflow funnel transitions

Useful funnel:

```text
launch
→ game loaded
→ teams configured
→ display opened
→ game started
→ game completed
```

May anonymously aggregate workbook-quality counts such as percentage of
imported AI workbooks with insufficient team names **without uploading
the team names themselves**.

Intentional Feedback / Report Problem is distinct from anonymous
analytics. Feedback may optionally attach **sanitized** diagnostics.
Never silently attach classroom content.

---

## 30. Flagship visual fidelity — S05

S05 is not generic "make it prettier."

It is **flagship visual fidelity + game-show choreography**.

The Display may become theatrical. The Host remains operational and
restrained.

Intentionally design major game moments:

- board reveal
- tile selection
- question reveal
- response / timer start
- buzzer lock
- correct answer
- incorrect answer / rebound
- score change
- category completion
- Final introduction
- Final wager
- Final answer / reveal
- winner celebration

Use restrained, intentional motion / audio. Preserve reduced-motion
equivalents.

Do not let spectacle obscure timer, prompt, score, buzz state, or teacher
operation.

---

## 31. Visual stress fixture

Create / retain a canonical worst-case valid content fixture during S05 /
S06.

Exercise:

- longest reasonable category names
- long prompts
- long answers where displayed
- long team names
- 8 teams
- negative scores
- 1920×1080
- 1280×720
- Windows scaling
- grayscale
- high contrast
- reduced motion

Visual polish is not accepted solely because a pleasant demo case looks
good.

---

## 32. Windows-first S06 qualification

S06 must be a real integrated teacher-release qualification, not merely
"CI passed."

Require actual physical Windows classroom-type machine evidence before
v1.

Representative journey:

```text
fresh download
→ install
→ launch
→ create / import game
→ configure teams
→ Sony where hardware available / required
→ open Display on projector
→ audio
→ play complete category board
→ Final
→ recover from realistic interruption
→ finish / results
→ close
→ reopen
→ upgrade / replace build
→ prove data survives
```

Also exercise as applicable:

- internet unavailable
- 125 / 150% Windows scaling
- multiple displays
- mirrored vs extended
- projector reconnect
- Sony unplug / replug
- keyboard fallback
- accidental Display close
- accidental Host close
- app killed mid-session
- sleep / wake
- version replacement
- rollback / recovery
- SmartScreen / security behavior
- uninstall / reinstall behavior where relevant

Do **not** infer Windows runtime PASS from GitHub Actions packaging.

---

## 33. Update model

REAL MVP remains **manual / versioned replacement**.

Do **not** implement auto-update unless separately authorized.

Add / architect a simple user-facing **About / Version / Check for
Updates** experience before serious distribution where boundedly
appropriate.

Checking for an update must fail safely / offline. No background updater
is implied.

---

## 34. Teacher acceptance scenario

Use this durable persona / scenario to judge remaining slices.

A teacher who has never used CQS downloads it on a normal Windows
school-type laptop. They:

- install without developer assistance;
- launch from normal OS UI;
- import an AI-generated Earth / Science-style game;
- review any import-quality warnings;
- configure four teams;
- use supported Sony Buzz controllers;
- let all teams simultaneously choose humorous content-specific team
  names;
- verify projector and audio;
- run a complete category-board game;
- use Final;
- accidentally close / recover Display once;
- experience an ordinary interruption / recovery;
- finish;
- close CQS;
- reopen later;
- recover / view durable data / results as appropriate;
- later replace / update CQS without losing authored games.

No terminal. No developer. No JSON knowledge required.

This scenario is a cross-slice quality lens, not an implementation
checklist that any one slice must close alone.

---

## 35. S04-family slice topology

This subdivision is an approved elaboration of the existing S04
teacher-simple-setup frontier. Do **not** renumber completed S01–S03.

### S04 — Canon registration (this slice)

Docs-only registration of product direction, Product Contract, and
revised remaining topology. **No product implementation.**

### S04A — Teacher workflow, authoring & session model

Primary scope:

- simple dashboard / home
- optional first-run guidance
- game library / recent games
- New / Resume
- visual board authoring
- individual tile / category / Final editing
- duplicate / rename / edit
- Game-versus-Session model
- reusable saved games
- per-session team identity
- workbook / template versioning
- Import Quality Report
- Export Generation Feedback
- autosave / save visibility
- rehearsal / preview where bounded
- foundational data-durability decisions

Must **not** implement Sony theatrical team selection unless required
only as a minimal compatibility seam.

### S04B — Sony team selection & classroom setup

Primary scope:

- simplified teacher-facing Sony setup
- close `F-UX-01` / `CQS-Q23-LOW-01` where supported
- simultaneous Sony team-name selection
- 96-name game-owned name-deck behavior
- content-specific school-safe selection UI
- pastel button correspondence
- monochrome non-selected state after lock
- Red cycles only that team
- global active-name uniqueness
- cycle wrap behavior
- teacher manual-name fallback when Sony is not used
- projector readiness
- audio readiness
- panic mute
- keyboard emergency path
- packaged-macOS physical Sony qualification **must close** before
  terminal S04B

### S04C — Product safety, recovery & compatibility UX

Primary scope:

- safe startup / no-restore path
- sanitized diagnostics
- corrupt-import recovery UX
- backup / export foundations
- schema / version compatibility contracts
- migration safeguards
- rollback thinking
- data durability
- destructive-action safety
- display / device / sleep recovery where bounded
- support-oriented product hardening

### S04D — Feedback & privacy-safe telemetry

Primary scope:

- explicit opt-in analytics
- feedback / problem reports
- sanitized diagnostics attachment
- offline-safe queue / failure isolation
- initial Google-backed endpoint if still appropriate
- workflow-funnel metrics
- no classroom content by default

### S05 — Flagship visual fidelity & game-show choreography

See §30–§31. Not generic visual polish.

### S06 — Windows-first integrated release qualification

See §32. Physical Windows classroom-type evidence is required before v1.

Naming S04A–S06 grants **no implementation authority**.

---

## 36. Retained debts / gates

| Item | Status | Gate |
| --- | --- | --- |
| Packaged macOS Sony physical | **DEFERRED / NOT RUN / HARDWARE UNAVAILABLE** | Must close no later than terminal S04B and remain represented in S06 |
| Windows physical runtime | **NOT RUN** | Must close in S06 before v1 teacher-ready qualification |
| Signing / notarization | **OPEN OWNER GATE** | Do not silently declare teacher-trusted release without addressing this. Windows signing / SmartScreen has higher strategic release priority than Apple signing / notarization if prioritization is necessary |
| `CQS-Q23-CLASS-B-01` | **OPEN / CONTROLLED** | SheetJS build-time supply-chain dependency remains explicit |
| `CQS-Q23-LOW-02` | **OPEN / LOW / MONITOR** | Do not prematurely optimize merely to make the metric disappear |
| `CQS-OD-066` | **DEFERRED / NOT REAL MVP** | GCS learning-target linkage remains outside this Program |

Do **not** claim:

- S04 implementation has begun;
- Sony packaged physical qualification is complete;
- Windows physical runtime is complete;
- a signed teacher release exists.

---

## 37. Serious-product future — architect, do not build now

Do not put these into REAL MVP merely because they are plausible later:

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
- licensing / payments
- rich cloud analytics
- automatic updates
- school-wide SaaS management

Avoid architectural dead ends where inexpensive to do so. No speculative
frameworking or premature abstraction is authorized.

---

## 38. Non-claims

This specification does **not**:

- implement application code, tests, dependencies, Electron changes,
  persistence / schema implementation, workbook-parser changes, Sony
  implementation, UI, telemetry, visual work, or release / signing
  changes;
- authorize S04A, S04B, S04C, S04D, S05, or S06;
- rewrite historical Slice 23 / S01 / S02 / S03 evidence as if these
  product decisions existed at those earlier times;
- complete the teacher-adoptable product.
