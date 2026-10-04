# CQS visual historian workflow

- **Document id:** `CQS-VISUAL-HISTORIAN-WORKFLOW`
- **Status:** ACTIVE — repository instruction
- **Kind:** repeatable documentation / evidence workflow
- **Scope:** visual milestone archives under `docs/design/history/`
- **Authority:** this workflow governs how visual history is recorded; it does **not** grant product implementation authority

## 1. Purpose

Classroom Quiz Show keeps a durable visual record of important product milestones so a future maintainer can answer:

> What did CQS actually look like, surface by surface and state by state, at this milestone?

A historian archive is more than a screenshot folder. A complete archive records:

1. the milestone and exact implementation SHA;
2. the graphical-surface census;
3. normal, edge, recovery, stress, and completion states where materially distinct;
4. Host/private versus Audience/public authority;
5. the teacher workflow that reaches each state;
6. deterministic browser captures where truthful;
7. owner/local/native/hardware evidence where browser automation cannot establish the claim;
8. capture limitations and deferred qualification;
9. machine-readable provenance;
10. an immutable historical record after merge.

A historian archive is **not** current implementation authority, a UX approval, a release qualification, or a substitute for owner observation.

```text
observed implementation truth
  ≠ visual historical record
    ≠ human acceptance evidence
      ≠ physical classroom qualification
```

## 2. When to create a new milestone archive

Create a **new** archive when the owner authorizes historical capture at a meaningful visual boundary, especially:

- before a major owner acceptance / whole-product playthrough;
- after owner-accepted visual repairs when the accepted product materially differs from the prior archive;
- before a broad UX/UI redesign or rebrand;
- after a major presentation tranche changes many visible surfaces;
- at a release candidate or other named product milestone when visual posterity is useful.

Do **not** create a new milestone merely because one component changed or a routine PR merged. The archive should mark a product-history boundary, not generate screenshot churn.

Never infer authorization to redesign, repair, terminalize, release, or begin the next roadmap slice merely because a historian archive is being created.

## 3. Archive naming and required structure

Use a stable dated milestone directory:

```text
docs/design/history/YYYY-MM-<milestone-slug>/
```

Required files:

```text
README.md
CQS-VISUAL-SURFACE-ATLAS.md
CAPTURE-MANIFEST.json
OWNER-CAPTURE-CHECKLIST.md
screenshots/
```

Recommended screenshot families:

```text
screenshots/
  app/
  authoring/
  setup/
  host/
  audience/
  scoreboard/
  clue/
  buzz/
  outcome/
  round-flow/
  final/
  completion/
  recovery/
  stress/
  owner/          # only when local / owner evidence is added
```

Add only folders actually used by that milestone.

The archive `README.md` must identify:

- archive id;
- milestone name;
- repository;
- exact canonical implementation SHA;
- capture date;
- relevant Program status without changing it;
- owner-playthrough / acceptance status at capture time;
- what the archive proves;
- what it explicitly does **not** prove;
- the automated capture command, if one exists;
- the next human evidence step, if any.

## 4. Preflight: freeze the historical identity before capture

Before creating or changing archive content:

1. Read `AGENTS.md` and required startup-canonical documents.
2. Observe fresh repository truth.
3. Record the exact `main` / authorized candidate SHA whose UI is being archived.
4. Record the current Program status from canonical status/routing docs.
5. Confirm the authorized objective is **historian capture**, not product modification.
6. Confirm whether the milestone is:
   - pre-owner-review;
   - post-owner-review;
   - release candidate;
   - other explicitly named boundary.
7. Identify which evidence environments are actually available:
   - deterministic browser / Playwright;
   - Electron shell;
   - macOS local desktop;
   - Windows physical runtime;
   - Sidecar / second display;
   - classroom projector;
   - physical Sony controllers;
   - audio;
   - screen reader / other physical accessibility checks.

Do not substitute one evidence class for another.

If the UI changes after the implementation SHA has been frozen, either:

- finish the archive against the frozen SHA; or
- explicitly abandon that candidate and create the archive against a newly named milestone/SHA.

Do not quietly mix screenshots from different implementations under one milestone identity.

## 5. Build the complete graphical-surface census

Start from the living `docs/design/CQS-UX-SURFACE-INVENTORY.md`, then verify against observed code, routes, tests, and current workflow.

The historian census is broader than a component list. It should include every **materially distinct visible state** a teacher or student could reasonably recognize as a different screen or moment.

At minimum inspect these families when implemented:

| Family | Examples |
| --- | --- |
| Application | launch, Home, empty/populated library, navigation |
| Authoring / import | edit, template/import entry, success, validation failure |
| Classroom setup | teams, names/colors, controller setup, Display readiness |
| Host operation | board control, clue control, scoring, timer/buzz controls, undo/recovery |
| Audience board | pristine, partial, depleted, category-cleared |
| Clue | selected, prompt, answer reveal, image/media |
| Buzz | armed/waiting, active claim, queued teams |
| Outcomes | correct, incorrect, passed/no-response |
| Scoreboard | ordinary and stress/negative/long-name states |
| Round flow | return to board, transition, Final bridge |
| Final | setup, wager entry/lock, response entry/lock, answer, team reveal, settlement |
| Completion | unique winner, tied finish, generic fail-safe completion |
| Recovery | waiting, unavailable state, reconnect/reload/fail-closed surfaces |
| Accessibility / stress | 720p, 1080p, high contrast, reduced motion, long text |
| Native / physical | Electron chrome, dual windows, second display, controller pairing/recovery |

For each candidate state ask:

1. Is it visually distinct enough to matter to posterity?
2. Is it reachable through the current product or a canonical sanitizer-backed test fixture?
3. Does it cross a privacy boundary?
4. Does it represent normal operation, edge behavior, recovery, stress, or completion?
5. Can automation truthfully capture it?
6. Does it require local/native/physical owner evidence?
7. Is it actually deferred to a later qualification tranche?

Do not invent a screenshot for a state the product cannot reach.

## 6. Required manifest record for every inventoried surface

Every surface/state belongs in `CAPTURE-MANIFEST.json`, even if the image itself must wait for owner hardware or later qualification.

Each entry should record, where applicable:

- stable surface id;
- human title;
- role: App / Host / Audience / system;
- state class: normal / edge / recovery / stress / completion;
- evidence authority;
- screenshot folder, basename, and relative path;
- viewport or physical display environment;
- route;
- privacy classification;
- purpose;
- trigger / workflow state;
- principal component(s);
- whether owner inspection is required;
- known limitations / notes.

The manifest root must record:

- schema version;
- repository;
- milestone;
- canonical base SHA;
- capture date;
- relevant Program status;
- total inventory counts by evidence class;
- implementation SHA for generated screenshots when different from the historian-document commit.

Stable ids should survive later archives when the conceptual surface survives. Add a new id when the conceptual state is genuinely new.

## 7. Evidence classes

Use explicit evidence labels. Do not blur them.

### `AUTOMATED-CAPTURE`

Use when Playwright/browser automation can render the real application surface or a canonical sanitizer-backed public state deterministically.

Rules:

- synthetic/demo data only;
- bind capture to the exact implementation SHA;
- wait for meaningful stable UI, not arbitrary screenshot timing;
- disable theatrical animation/caret motion where needed for deterministic capture;
- use the real sanitizer / command path for Audience state where practical;
- ordinary test runs must **not** rewrite historical PNGs.

### `LOCAL-DESKTOP-CAPTURE`

Use for a local native/Desktop condition automation cannot truthfully establish, such as Electron shell chrome or a file-picker/native import state.

Record device, OS, build/SHA, display arrangement, and capture date.

### `OWNER-HARDWARE-CAPTURE`

Use when physical hardware or an owner-observed environment is necessary, such as:

- Sony controller pairing/sleep/wake;
- Sidecar placement/scaling;
- a real second display;
- a classroom-specific physical interaction.

Owner hardware evidence must remain labeled as such. It does not automatically become S06 qualification.

### `S06-DEFERRED` or other explicit later qualification class

Use when the claim belongs to a later authorized qualification environment, for example:

- Windows teacher machine + classroom projector;
- full physical controller classroom qualification;
- sleep/wake/audio/screen-reader evidence owned by S06.

A deferred slot is preferable to fabricated certainty.

## 8. Privacy and historical-data rules

Historian archives are durable. Treat them as publication-sensitive repository material.

Required:

- synthetic/demo team names only;
- no real student names;
- no class rosters;
- no parent/student contact information;
- no real classroom grades or scores tied to identifiable students;
- no secrets, tokens, local file paths containing private user names, or account identifiers;
- Audience screenshots must contain only state the Audience is permitted to receive.

If a local/native screenshot contains accidental private information, do not commit it. Recapture with safe data.

Do not use image editing to conceal a privacy mistake and call it original evidence when a clean recapture is possible.

## 9. Automated capture implementation

Prefer a gated capture harness rather than manual browser screenshots when the state is deterministic.

The current S05 precedent uses:

- a central capture registry;
- sanitizer-backed Final/recovery snapshot builders;
- Playwright capture helpers;
- a dedicated capture spec;
- a package script gated by `CQS_VISUAL_HISTORY_CAPTURE=1`;
- tests that assert required historical PNGs exist.

For a future archive, do **not** simply retarget an old milestone's output directory and overwrite its files.

Instead:

1. create a new archive directory;
2. create or parameterize a new capture target for that milestone;
3. point future output only at the new archive;
4. preserve prior capture code if needed to explain provenance, or refactor only when doing so cannot rewrite old history;
5. keep normal `npm run test:e2e` from mutating archives;
6. make regeneration an explicit historian action.

The historical S05 and MENUS capture commands belong only to their bound
implementation checkouts. On current code they are provenance guards:

```bash
npm run capture:visual-history
npm run capture:visual-history:menus
```

Both intentionally fail closed rather than running stale selectors against
later code or writing into immutable archive directories.

For forensic regeneration, use an isolated checkout/worktree at the exact
implementation SHA recorded by the archive and run that checkout's documented
capture command. The current-main copies of the old capture specs are disabled
for the same reason.

Future milestone archives must use a new or parameterized capture target that
writes only to the new archive. Do not create that target's committed milestone
identity until the implementation SHA being archived is frozen.

## 10. Atlas requirements

`CQS-VISUAL-SURFACE-ATLAS.md` is the human-readable historical document.

For every entry record:

- stable id and title;
- embedded screenshot when present;
- image path or explicit pending/deferred state;
- role;
- state class;
- purpose;
- trigger / workflow;
- components;
- route;
- privacy boundary;
- relevant UX principles;
- capture resolution/environment;
- capture method/evidence class;
- exact canonical code SHA;
- milestone/date;
- owner-inspection requirement;
- known limitations.

The atlas should be navigable by workflow family, not by arbitrary filename order.

The atlas is descriptive history. It must not silently become the living UX specification.

## 11. Owner / local capture checklist

`OWNER-CAPTURE-CHECKLIST.md` records what automation cannot honestly prove.

For every owner/local item include:

- stable manifest id;
- exact condition to reproduce;
- device / OS / display / hardware requirements;
- screenshot(s) needed;
- whether the evidence is milestone history or later qualification;
- explicit non-claims.

During the owner playthrough, collect visual evidence where practical, but do not let screenshot collection distort the natural teacher workflow.

If owner playthrough causes UI fixes, do not replace the earlier baseline images. Create a new post-fix/post-acceptance milestone.

## 12. Workflow history: record how a teacher reaches the states

Posterity should preserve **workflow**, not only isolated screens.

The archive should be sufficient to reconstruct the teacher journey at the milestone:

```text
launch
  → find/create/import Game
  → inspect/edit content
  → start Class Setup
  → configure teams / optional controllers
  → open Audience Display
  → begin play
  → select clue
  → reveal prompt
  → arm / accept buzz
  → adjudicate outcome
  → update score
  → return to board
  → progress rounds
  → enter Final
  → wagers
  → responses
  → answer reveal
  → per-team settlement
  → resolution / tiebreak if needed
  → completion / winner
```

When the implemented ordinary teacher workflow differs, the archive must reflect the observed implementation rather than this example.

The trigger/state field for each surface and the ordering of atlas sections together form the durable workflow record.

For major milestones, the archive README should additionally state the ordinary teacher path in plain language and identify any alternate/power-user path worth preserving (for example spreadsheet import).

## 13. Verification before delivery

Verification must match what changed.

### Documentation-only historian instructions / metadata

At minimum:

- inspect the branch diff for unintended files;
- verify Markdown links/paths manually or with repository tooling;
- verify no historical image was overwritten;
- verify exact milestone SHA/status statements against repository truth;
- run `git diff --check` when a local worktree is available.

### New or changed capture harness / registry / snapshot builders

Run the repository's required checks for code/test changes. Current defaults are:

```bash
git diff --check
npm run verify
npm run verify:all
```

Also run the historian capture command intentionally and confirm:

- every `AUTOMATED-CAPTURE` manifest entry has its PNG;
- no unexpected PNG is orphaned from the manifest/atlas;
- expected viewport families are present;
- historical capture tests pass;
- ordinary test runs do not mutate the archive.

Do not claim any unrun check passed.

### Human review

Automated capture establishes renderer output, not aesthetic approval.

A human should inspect:

- hierarchy;
- clipping/overflow;
- readable text;
- long-name and negative-score behavior;
- high-contrast/reduced-motion screenshots;
- Host-private versus Audience-public content;
- whether screenshots correspond to their labels;
- whether the sequence tells the actual teacher workflow.

## 14. Immutability after merge

Once a milestone archive lands on `main`, treat its screenshots as immutable historical evidence.

Do **not**:

- overwrite old PNGs because current UI changed;
- regenerate an old archive from later code;
- relabel an old image as owner-accepted after the fact;
- rewrite an old milestone's status to match current Program state;
- use a later screenshot under an earlier SHA;
- turn a historical archive into current implementation authority.

If an old archive contains a factual metadata error, correct the metadata transparently and preserve the original milestone identity. If the visual product changed, create a new archive.

Git history is the final provenance layer; do not squash away the distinction between historical milestones by replacing files in place.

## 15. Relationship to owner playthrough and S06

The historian workflow intentionally keeps three evidence gates separate:

### Visual historian

Answers:

> What did the rendered product look like at this exact milestone?

### Owner playthrough

Answers:

> Can Rick, acting like a normal teacher, successfully use the complete workflow, and does it make sense in practice?

### S06 qualification

Answers:

> Does the product hold up on the actual target hardware/classroom environment across the required physical, Windows, projector, audio, recovery, accessibility, and controller evidence classes?

A green historian archive does not imply either later gate passed.

## 16. Current precedent: S05 baseline

The first full visual historian archive is:

[`2026-09-s05-complete/`](2026-09-s05-complete/)

It records the baseline after terminal S05 presentation children and before the deliberate whole-game owner playthrough.

At creation it inventoried:

- **58** materially distinct surfaces/states;
- **50** automated committed PNG captures;
- **5** owner/local capture slots;
- **3** S06-deferred evidence slots.

Its automated images are bound to implementation SHA:

`4368cc9eeb7dbf3ef342926e1d0fba7ba4c10f9b`

The historian implementation/docs themselves later landed on `main`; that later documentation commit does not change the implementation SHA represented by the screenshots.

Use the S05 archive as a structural precedent, not as a template to overwrite.

## 17. Completion checklist

A historian milestone is complete only when all applicable boxes are satisfied:

- [ ] milestone name and exact implementation SHA frozen
- [ ] Program status captured without changing it
- [ ] living surface inventory reconciled against observed code/workflow
- [ ] materially distinct graphical states inventoried
- [ ] Host/Audience privacy role recorded for each state
- [ ] evidence class assigned for every state
- [ ] automated captures generated only from the intended milestone code
- [ ] synthetic-data/privacy check passed
- [ ] manifest counts reconcile with entries/files
- [ ] atlas paths and embedded images reconcile with manifest
- [ ] owner/local/native items listed instead of fabricated
- [ ] later qualification items explicitly deferred
- [ ] ordinary teacher workflow reconstructable from archive
- [ ] automated evidence limitations stated
- [ ] relevant repository verification actually run
- [ ] human image inspection completed where required
- [ ] no older milestone screenshots overwritten
- [ ] archive discovery links updated
- [ ] delivery report states what is captured, pending, deferred, and unproven

## 18. Non-claims

Following this workflow does **not**:

- authorize UI changes;
- authorize product repairs;
- authorize roadmap advancement;
- terminalize a slice;
- substitute for owner acceptance;
- prove Electron behavior from browser screenshots;
- prove Windows behavior from macOS;
- prove classroom projector behavior from Sidecar;
- prove physical-controller behavior from simulated input;
- prove accessibility from screenshots alone;
- change the source-of-truth order in `AGENTS.md`.
