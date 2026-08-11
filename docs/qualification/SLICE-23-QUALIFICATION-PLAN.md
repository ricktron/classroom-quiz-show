# Slice 23 — Classroom Release Qualification: Plan and Stage-0 Discovery

**Slice identifier:** `CQS-SLICE-23-CLASSROOM-RELEASE-QUALIFICATION`
**Authorization:** `AUTHORIZE-CQS-SLICE-23-CLASSROOM-RELEASE-QUALIFICATION-1`
**Evidence state:** `CQS-SLICE-23-CLASSROOM-RELEASE-QUALIFICATION-ES-1`
**Stage:** **Stage 0 — read-only discovery**, plus the recorded Stage B / Stage C
execution attempt under packet
`CQS-SLICE-23-STAGE-B-C-LOCAL-QUALIFICATION-PACKET-1` (§14).

> **This document establishes no qualification verdict.** Stage A
> (canonical/preflight) passed as a repository-provenance gate; **no substantive
> classroom or product qualification gate has been executed or dispositioned.**
> No product code was mutated. Slice 23 is **not** claimed implemented,
> executed, or terminal. The overall CQS MVP is **not** claimed complete, and
> this document must never be read as claiming it.

---

## 1. Provenance

| Item | Observed value |
| --- | --- |
| Host | `vm` |
| User | `root` |
| CWD | `/home/user/classroom-quiz-show` |
| Git toplevel | `/home/user/classroom-quiz-show` |
| Branch | `claude/cqs-slice-23-qualification-97p5vj` |
| HEAD at discovery | `c047ca71640c3d717eacd1092a899ca6d16b2115` |
| `origin/main` | `c047ca71640c3d717eacd1092a899ca6d16b2115` |
| Canonical main expected by authorization | `c047ca71640c3d717eacd1092a899ca6d16b2115` — **matches** |
| Working tree at discovery | clean (`git status --short` empty) |
| `git diff --check` | clean |
| Worktrees | exactly one (this checkout) |
| Open PRs | **none** (`state=open` returned an empty list) |

Canonical main has **not** moved. The authorization's base assumption holds, so
no refreshed base authority is required for this stage.

`origin/main` tip line: `c047ca7 docs(slice-22): reconcile post-merge canonical
state (#59)`.

> Note: the local `main` ref in this checkout is stale at `b1e6d66…`. This is a
> local-ref artifact only; `origin/main` and `HEAD` both read `c047ca7…`. No
> conclusion is drawn from the stale local ref.

---

## 2. Contract extraction — what Slice 23 is bound to

From `docs/decisions/ROADMAP-AMENDMENT-004-mvp-audio-and-release-rebalance.md`
§11 and `docs/plans/MVP-ARC.md` "Slice 23":

- **Purpose:** prove a teacher can rely on the product in class.
- **Preserved gates:** clean-install golden path; pack import/export; team and
  input setup; complete board and Final session; timer, buzz, score,
  correction, undo, recovery, summary, comparison; 1920×1080 and 1280×720;
  1/4/6/8 teams; long names; negative scores; image failure; reduced motion;
  high contrast; grayscale and projector-washout; keyboard-only;
  semantic/screen-reader review; physical viewing-distance; PWA install, update,
  offline, reset; owner-performed deployment verification; support matrix and
  known limitations; retention/deletion documentation.
- **Added gates:** Slice 22 audio qualification; Phase 2B visual-fidelity
  calibration.
- **Binding rule:** *no architecture or new feature may originate in Slice 23.*
  Material defects require **separately bounded repair**.
- **Raspberry Pi 5:** observational smoke test only; **not** an acceptance gate.
- **Definition of done:** qualification matrix receipt (including audio and
  Phase 2B gates); owner live-deployment verification; support matrix;
  retention/deletion docs; `verify:all` green.
- **Owner gate:** separate authorization; **owner live verification cannot be
  satisfied by CI alone.**

Contract versions at this base (from `docs/STATUS.md`, to be held unchanged):
workbook **1**; AuthoringDraft **1**; pack format **1**; canonical game schema
**1**; GameDefinition **1**; public-state wire **8**; sync envelope **2**;
private active-session wire **1**; IndexedDB **4**; Sony mapping **1**; Sony
supported profile **1**; Session Summary **1**; completed-summary envelope **1**;
competitive profile **1**.

**Default qualification expectation: NO PRODUCT-CONTRACT CHANGE.**

---

## 3. HARD STOPS observed in this environment

Two egress-policy denials make several qualification stages **impossible in this
session**. Both are environment facts, not product defects. Per the agent-proxy
guidance, blocked hosts are reported and **not** routed around.

### HS-1 — Local build/verification is impossible here (`cdn.sheetjs.com` denied)

`npm ci` **fails**. The `xlsx` dependency is pinned in both `package.json` and
`package-lock.json` to a **non-registry CDN tarball**:

```
"xlsx": "https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz"
```

Observed: `npm error code E403 — 403 Forbidden - GET
https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz`, corroborated by the proxy
status endpoint:

```
"kind": "connect_rejected",
"detail": "gateway answered 403 to CONNECT (policy denial or upstream failure)",
"host": "cdn.sheetjs.com:443"
```

Consequences:

- `node_modules` is **absent/incomplete**; no local `eslint`, `tsc`, `vitest`,
  `vite`, or `@playwright/test` is installed.
- `npm run verify` and `npm run verify:all` **CANNOT BE RUN** in this session.
- The stray `eslint` failure observed (`ESLint: 10.1.0`, `Cannot find package
  '@eslint/js'`) came from a **global** `/opt/node22/bin/eslint`, not the
  project toolchain. **It is not a lint finding and must not be recorded as
  one.**

**No unit total, no Playwright total, no lint or typecheck result is claimed by
this document.** Substituting or repinning the dependency would be a dependency
and supply-chain change, which Slice 23 explicitly forbids.

### HS-2 — Production deployment verification is impossible here

`https://ricktron.github.io/classroom-quiz-show/` returns
`CONNECT tunnel failed, response 403` — denied by egress policy, consistent with
historical receipts from Slices 6–9. **No deployed-commit, PWA, update, offline,
or live-route claim can originate in this session.**

### Effect on staging

The two hard stops have **different and non-interchangeable** scopes:

- **HS-1 (dependency host)** blocks every gate that needs the project toolchain
  or a running build — Stages **B, C, D, E, F**, and the local half of **I**.
  These require reachability of the normal project dependency hosts, including
  `cdn.sheetjs.com`. **They do not inherently require GitHub Pages access**, and
  must not be described as if they did.
- **HS-2 (deployed environment)** blocks only the gates that qualify the
  *deployed* product: production deployment verification, PWA install/update,
  production offline behaviour, and deployed-commit provenance. These
  additionally require access to the GitHub Pages environment.

Stages requiring physical hardware, projector, audio, and screen-reader
observation were always owner-assisted and are unaffected by either hard stop.

---

## 4. Preliminary findings register (Stage 0, static evidence only)

Evidence class for every entry below: **STATIC CODE/DOC OBSERVATION** at
`c047ca7…`. **None has been confirmed by running the application**, so each
carries a provisional severity that Stage C must confirm, raise, or lower.
All are **Class A** (defects in already-promised/current functionality) unless
marked Class B.

### `CQS-Q23-BLOCKER-01` (provisional) — the teacher's host screen presents itself as a non-gameplay developer harness

- **Affected workflow:** startup → understand where to begin → load a game.
- **Evidence:** `src/routes/HostRoute.tsx`, `src/host/FoundationControls.tsx`.
- **Observed:**
  - `HostRoute` renders a status block reading **"No active game … Game setup,
    rounds, and scoring arrive in a later slice — this foundation deliberately
    ships without them."** That copy is **stale and false** at this base: board,
    teams, scoring, timers, buzz, Final, summary, packs, and authoring are all
    implemented and `Complete`.
  - Every real teacher capability is rendered **inside** `FoundationControls`,
    a panel whose visible tag reads **"Foundation / testing controls — not
    gameplay"**, whose heading reads **"State & event core (Slice 2)"**, and
    whose intro reads **"They are diagnostics, not a game."**
  - The panel exposes, above the gameplay panels, developer-vocabulary controls
    and raw internals to the ordinary teacher path: `Initialize / reset session`,
    `Advance sequence`, `Mark waiting`, `Set private note`, the raw
    `PUBLIC_STATUS_CODES` button grid, a `Private state (host-only)` key/value
    dump (`revision`, `lifecycle`, `counter`, `applied events`), an
    `Event history (append-only)` list of raw event type names with
    `reversible`/`irreversible` flags, `Initialize sample with unsupported
    round`, and a `Game session (host-only diagnostics)` block showing
    `current round support` and `UNSUPPORTED` markers.
- **Expected:** an ordinary teacher can identify the normal starting workflow
  without developer vocabulary (§6, §114).
- **Release implication:** the product's own UI tells the teacher that the
  features they need do not exist yet, and then hides those features under a
  label that says they are not gameplay. This is the single most likely cause of
  first-run abandonment.
- **Routing:** bounded repair packet, separately authorized. **Not repaired
  here.**

### `CQS-Q23-BLOCKER-02` (provisional) — loading any game requires an undiscoverable developer-vocabulary prerequisite

- **Affected workflow:** create/import/select a game.
- **Evidence:** `src/host/FoundationControls.tsx`;
  `src/host/GameImportPanel.tsx:83-86`.
- **Observed:** every content-loading panel (JSON import, spreadsheet authoring,
  pack import) is nested inside a `fieldset` gated on session state, and the
  import path refuses with the literal message **"Initialize a session first,
  then import again."** The only control that satisfies it is the button
  labelled **`Initialize / reset session`** inside the "not gameplay" panel.
- **Expected:** a teacher can get from first launch to a playable game without
  knowing that "a session" is a prerequisite concept, and without a control
  whose label pairs "Initialize" with "reset".
- **Release implication:** a teacher who has been given only the URL cannot load
  a game. This is a hard stop on the clean-install golden path.
- **Routing:** bounded repair packet, separately authorized. **Not repaired
  here.**

### `CQS-Q23-HIGH-01` (provisional) — content loading sits *below* the gameplay panels it must precede

- **Evidence:** `src/host/FoundationControls.tsx` — render order is board →
  timer → Final → local input → gamepad → scoring → summary → ledger, and only
  **then** `GameImportPanel`, `SpreadsheetAuthoringPanel`,
  `GamePackImportPanel`, then the export panels.
- **Observed:** the workflow's first step is physically last on the page. A
  teacher must scroll past the whole diagnostic and gameplay stack to import,
  then scroll back up to play.
- **Release implication:** material friction on every single game setup, and it
  compounds `CQS-Q23-BLOCKER-02`.

### `CQS-Q23-HIGH-02` (provisional) — no teacher-facing documentation exists

- **Evidence:** `README.md` section scan; repository-wide search.
- **Observed:** `README.md` (≈49 KB) is entirely developer-centric —
  *Requirements, Installation, Local development, Tests, Build, Production
  preview, Combined verification, Route behavior, PWA status, Deployment, Error
  handling*. Its "Current implementation status" section still opens on **Slice
  1 and Slice 2** narrative. A repository-wide search for "Teacher Guide",
  "Getting started", or "Quick start" returns **no match in any file**. `docs/`
  contains only `PROJECT.md` and `STATUS.md` at top level — both program
  documents, not teacher documents.
- **Release implication:** §64 asks whether teacher documentation is sufficient
  to start, choose a game, configure display, play, recover, and finish. There is
  **no such document to test**. Combined with `CQS-Q23-BLOCKER-01/02`, neither
  the UI nor the docs carry the teacher.
- **Note:** §65 says a developer README is not automatically a defect *if an
  appropriate teacher-facing surface exists*. None exists.

### `CQS-Q23-HIGH-03` (provisional) — no user-facing "clear all local CQS data" capability

- **Affected workflow:** data retention, reset, shared-classroom-machine hygiene
  (§51, §52, §120).
- **Evidence:** `src/persistence/constants.ts`, `src/persistence/
  indexedDbAdapter.ts`, `src/host/PersistenceControls.tsx`, repository-wide
  search for `deleteDatabase`.
- **Observed:** six object stores exist — `savedDefinitions`, `activeSessions`,
  `coordination`, `completedSummaries`, `packMediaAssets`,
  `sonyBuzzMappings`. There is **no `deleteDatabase` call anywhere in `src/`**
  and **no aggregate reset control**. Deletion is only ever per-item: discard
  recovery, delete a saved definition, delete completed-summary records, clear
  the Sony mapping record (`clearSonyBuzzMappingRecord`, wired via
  `useSonyBuzzSupportedProfile.ts:206`). No surfaced path clears
  `packMediaAssets` or `coordination` wholesale.
- **Favourable note:** because **no control claims** "clear all local CQS data",
  the §51 lying-control failure mode does **not** apply. The finding is
  **absence of the capability**, not a false claim.
- **§52 note:** `onblocked` is handled on the **upgrade** path
  (`indexedDbAdapter.ts:136` rejects with `UpgradeBlockedError`) and is correctly
  **not** treated as success. There is no `deleteDatabase` path to evaluate for
  blocked-delete behaviour, because there is no delete-database path at all.

### `CQS-Q23-LOW-01` — F-UX-01 carried forward, unchanged

Ordinary setup still exposes some WebHID/Gamepad vocabulary. Per §7 this remains
**LOW** unless Stage C/H evidence shows broader impact. **Neither promoted nor
dismissed at Stage 0.** Note that `CQS-Q23-BLOCKER-01` concerns a *different and
much larger* jargon surface than F-UX-01, and must not be collapsed into it.

### `CQS-Q23-CLASS-B-01` — non-registry CDN dependency is a beta-distribution risk

**Class B — continuation candidate, not a Slice 23 defect.** The `xlsx`
dependency resolves from `cdn.sheetjs.com`, not the npm registry. Any
contributor, CI, or future packaging environment behind an egress policy that
denies that host **cannot install or build the product** (this session is a live
demonstration). GitHub-hosted CI presently reaches it, so this is **not** a
current product-runtime defect and **not** claimed as one. It is registered
because packaging/distribution is an open MVP-continuation question (§87).

---

## 5. Inherited Final mid-refresh flake — analysis plan (§43)

**Not yet dispositioned. Stage 0 records only the located signature.**

- **Test:** `tests/e2e/final-wager.spec.ts` — *"a refresh mid-Final resumes every
  committed wager"*, marked `test.slow()`.
- **Assertion that flakes:** `fwh-committed-wager-basalts` is expected to contain
  `Saved: 100`; the observed failure text `Not saved yet` is the panel's own
  uncommitted-state copy (`src/host/FinalWagerHostPanel.tsx:250`).
- **Shape:** wager `100` is saved, host reloads, `persistence-resume` is clicked,
  and the committed wager is asserted **after** resume. The failure is therefore
  a race between the persistence write of `FINAL_TEAM_WAGER_RECORDED` and the
  reload, **or** between resume-hydration and the assertion.
- **Historically:** appears on `desktop-1080p`, `projector-720p`, and
  `mobile-host`; retry-resolved every time; unresolved since Slice 17.

**Planned disposition method (requires HS-1 to be lifted):**

1. Run the single test in isolation, repeated (`--repeat-each`), with retries
   **disabled**, to obtain a true failure rate per project.
2. Instrument whether the write is durable **before** `host.reload()` resolves —
   distinguishing *product* (a save that reports committed before it is durable,
   which would lose a real teacher's wager) from *harness* (an assertion racing
   hydration).
3. Manually reproduce the same sequence in a real browser, including a
   deliberately slow/throttled profile.
4. Only then issue exactly one of the §43 verdicts: **RELEASE BLOCKER — REPAIR
   REQUIRED** or **KNOWN NON-BLOCKING TEST FLAKE — ACCEPTABLE FOR CURRENT MVP
   CONTINUATION**.

**Retry-resolution alone will not be accepted as sufficient** (§43). If step 2
shows the commit is acknowledged to the host before it is durable, that is a
product defect regardless of test-harness behaviour.

---

## 6. Teacher-workflow map as currently implemented

Observed, not assumed:

```
production URL (or npm run dev)
  └─ #/ RootRoute — "Choose a screen": Open Host | Open Display
       └─ #/host HostRoute
            ├─ private-host banner (good: explicit "do not project")
            ├─ Theme radio group (default | high-contrast)
            ├─ "No active game" + STALE "arrives in a later slice" copy
            ├─ "Open display in new window" button  ← display workflow (good)
            └─ FoundationControls  ← "not gameplay" tag; contains EVERYTHING
                 ├─ PersistenceControls (resume/discard, saved definitions)
                 ├─ AudioControls
                 ├─ [session commands fieldset]
                 │    ├─ Initialize / reset session   ← REQUIRED PREREQUISITE
                 │    ├─ Advance sequence / Mark waiting / Set private note
                 │    ├─ Undo last reversible
                 │    ├─ Public status code button grid
                 │    ├─ Private state dump + raw event history
                 │    ├─ Initialize sample game / …with unsupported round
                 │    ├─ Game session host-only diagnostics
                 │    ├─ Board / Timer / Final / Keyboard / Gamepad / Scoring
                 │    ├─ Session summary · Completed-summary ledger
                 │    └─ Import JSON · Spreadsheet authoring · Pack import
                 └─ Export JSON · Export pack
```

**Positive observations to preserve** (these must not be lost in any repair):

- The private/public separation is explicit and well-signposted: a persistent
  host banner, and a dedicated `Open display in new window` button using a
  validated, base-path-aware absolute URL carrying only the validated theme ID
  (`absoluteDisplayUrlWithTheme`). **A teacher is not required to type
  `#/display` by hand** — §61's worst case does not apply.
- Recovery is explicitly opt-in (`Resume session` / `Discard recovery`), never
  silent.
- The audience display is a separate route with its own Phase 2B composition
  (`src/display/audience/`: `AudienceDisplayShell`, `NexusCore`, `ScoreLayout`,
  `SignalRail`, `selectAudiencePresentation`).
- 22 e2e specs exist, including `pwa-offline`, `projector-safety`,
  `audience-display`, `theme-system`, `persistence-recovery`, `portable-packs`,
  and `presentation-audio` — a substantial automated base to build the Slice 23
  matrix on rather than duplicate.

---

## 7. Environment and support-matrix inputs observed

- **Build/deploy:** Vite with `base` `/classroom-quiz-show/` applied to
  production builds and `vite preview` (not dev). `VITE_BASE` override exists.
- **PWA:** `vite-plugin-pwa`, `registerType: 'autoUpdate'`, precache glob
  includes `wav` (so Slice 22 audio is precached — offline-audio gate has a
  plausible mechanism to verify). Manifest: name *Classroom Quiz Show*, short
  name *Quiz Show*, `display: standalone`, `orientation: landscape`,
  `theme_color` `#0b1b2b`, 192/512/512-maskable icons.
- **e2e projects:** `desktop-1080p` (1920×1080), `projector-720p` (1280×720),
  `mobile-host` (Pixel 5). Both mandatory §25 resolutions are already covered
  as Playwright projects.
- **e2e provenance risk (§81):** `reuseExistingServer: !process.env.CI` — locally
  this **will silently reuse a stale server**. Every automated qualification run
  must set `CI=1` or prove the served bundle matches the exact reviewed HEAD.
- **CI:** `.github/workflows/ci.yml` (`npm ci`; `npx playwright install
  --with-deps chromium`) and `deploy-pages.yml` (`npm ci`). Both depend on
  `cdn.sheetjs.com` reachability.

---

## 8. Proposed execution order (unchanged from §112, with hard stops applied)

| Stage | Content | Status |
| --- | --- | --- |
| A | Canonical/preflight | **DONE — PASS** (§1, §14) — provenance gate only |
| B | Clean automated baseline (`verify`, `verify:all`, matrices) | **ATTEMPTED — BLOCKED by HS-1** (§14) |
| C | Clean-teacher first-launch workflow (clean profile) | **ATTEMPTED — BLOCKED by HS-1** (§14); still expected to confirm BLOCKER-01/02 |
| D | Import / authoring / pack / data lifecycle | **BLOCKED by HS-1** |
| E | Gameplay, Final, undo, recovery (+ flake disposition) | **BLOCKED by HS-1** |
| F | Presentation / accessibility / themes / screen reader | **BLOCKED by HS-1** (screen reader also owner-assisted) |
| G | Physical projector, viewing distance, audio | **Owner-assisted; not attempted** |
| H | Supported Sony profile (transferred + focused current) | **Owner-assisted; not attempted** |
| I | Deployment / PWA / update / offline / reset | **BLOCKED by HS-1 and HS-2** |
| J | Findings, limitations, continuation analysis | Partially started (§4, §9) |
| K | Repair loops | **Not authorized** |
| L | Terminal independent review | Not reached |

**Recommendation:** Stages C and D should run **before** heavy automation
investment. If `CQS-Q23-BLOCKER-01`/`-02` confirm on a live clean profile, §71
applies — later teacher-workflow evidence is largely meaningless until the host
surface is repaired, and the qualification should stop cleanly at that gate and
route repair rather than pretend to run the full matrix.

---

## 9. MVP Continuation Register — candidate entries (Stage 0, questions only)

**These are candidates for Program Orchestrator decision. Slice 23 does not
promote, authorize, or implement any of them.**

| # | Candidate capability | Why it may be MVP-required | Stage-0 evidence bearing on it |
| --- | --- | --- | --- |
| C-1 | **Teacher-facing host UI** (ordinary mode vs advanced diagnostics) | If a teacher cannot find or trust the normal workflow, classroom reliance fails | `CQS-Q23-BLOCKER-01`, `-02`, `HIGH-01` — strong |
| C-2 | **Teacher-facing documentation / quick start** | §64 has no artifact to test | `CQS-Q23-HIGH-02` — strong |
| C-3 | **Startup / launch / distribution model** | Determines whether a teacher needs a terminal or only a URL | Production URL exists and is the plausible path; **unverified here** (HS-2) |
| C-4 | **Aggregate local-data reset** | Shared classroom machines; retention/privacy story | `CQS-Q23-HIGH-03` — moderate |
| C-5 | **Controller setup/tutorial evolution** | Only the *guided verification* portion is a candidate; reaction minigames remain post-MVP (§89) | F-UX-01 only; weak at Stage 0 |
| C-6 | **Packaging/distribution incl. non-registry dependency** | Beta delivery reproducibility | `CQS-Q23-CLASS-B-01` |
| C-7 | **Raspberry Pi 5 beta readiness** | Owner-valued contained beta path | **Deliberately unclassified** (§90) |
| C-8 | **Cross-device LAN host/display** | Known owner product direction | **Not implemented; must not be implemented from this slice** (§9, §63) |

**Explicitly held as post-MVP** (§88), not promoted: theme song; alternate sound
packs; team-specific audio identity; reaction-time minigames; broad
presentation/identity effects; other controller families; question bank; broader
AI authoring; commercialization.

---

## 10. `CQS-OD-066` — identification (§100)

`CQS-OD-066` is **"GCS learning-target linkage"**, status **Unresolved**, arc
`CQS-ARC-INSIGHT` / `CQS-OPP-GCS-LINKAGE`
(`docs/decisions/EXPANDED-VISION-OWNER-DECISIONS.md`). The open question is
whether CQS should store external GCS learning-target IDs and labels while GCS
remains the curriculum and formal-assessment authority. The register records a
recommendation that is explicitly **not** an accepted decision.

**Stage-0 assessment:** it concerns a **future analytics/insight integration**,
touches no gameplay, presentation, persistence, input, or deployment path
qualified by Slice 23, and therefore **does not block classroom qualification**.
Whether it blocks *MVP completion* is an **owner decision**, and this document
does not resolve it. Routed to the Program Orchestrator unchanged.

---

## 11. Evidence-transfer policy for this slice (§15)

- Slice 21 physical Sony evidence **may transfer**, because Slice 22 changed no
  input semantics and Slice 23 changes no code. A focused current-hardware check
  against the final qualification build is still required to prove integration.
  A full 20-button recertification is **not** required. The unavailable
  fourth-handset gate is **not** reopened (§77).
- Slice 22 owner listening evidence **transfers as listening evidence only**. It
  does **not** satisfy the classroom-volume, mute-in-class, or offline-audio
  gates, which are new in Slice 23.
- Any layout, persistence, or input repair invalidates the corresponding
  presentation, recovery, or controller evidence per §72; causality-scoped
  reruns are preferred over ritualistic full-matrix reruns.

---

## 12. Explicit non-claims

- **Stage A (canonical/preflight) passed.** That is a repository-provenance
  gate, not a classroom gate. **No substantive classroom or product
  qualification gate has been dispositioned** — every Stage-0 product finding
  below is provisional and static.
- **No** unit, Playwright, lint, typecheck, build, Sonar, Pages, or CI result is
  claimed from this session; the toolchain could not be installed (HS-1).
- **No** production, PWA, offline, update, or deployed-commit claim (HS-2).
- **No** physical projector, viewing-distance, audio, hardware, or screen-reader
  observation was performed.
- **No** product code, schema, contract, dependency, workflow, or deployment
  configuration was changed by this document.
- Slice 23 is **not** terminal. The 23-slice roadmap is **not** claimed complete.
  **The overall CQS MVP is NOT complete**, and completion of Slice 23 alone
  could not establish that.

---

## 13. Recommended Program Orchestrator next action

1. **Decide the qualification execution environment.** Stages B–F need a machine
   that can reach the normal project dependency hosts (including
   `cdn.sheetjs.com`); the deployment, PWA, and production-offline gates
   additionally need access to the GitHub Pages environment. Without a machine
   meeting the first requirement, Slice 23 cannot progress past Stage A — this
   is an **environment** constraint, not an authority constraint.
2. **Rule on the teacher-surface findings before funding the full matrix.** If
   `CQS-Q23-BLOCKER-01`/`-02` confirm live, the economical path is to authorize
   a bounded host-surface repair packet first, then qualify — rather than
   documenting a matrix against a surface that is about to change.
3. **Do not treat this document as authority** to repair, to implement any
   continuation candidate, to merge, or to declare MVP completion.

### Authority boundary (corrected)

`AUTHORIZE-CQS-SLICE-23-CLASSROOM-RELEASE-QUALIFICATION-1` **already permits
continued Slice 23 qualification execution.** Post-Stage-0 qualification does
**not** require fresh owner authorization; it requires an environment capable of
running it. An earlier revision of this document overstated the boundary by
implying otherwise, and that statement is withdrawn.

Separate authorization **remains required** for:

- product repair of any kind;
- post-Slice-23 MVP implementation;
- merge, where governance requires exact-head authorization;
- any otherwise unauthorized mutation.

---

## 14. Stage B / Stage C execution attempt

**Packet:** `CQS-SLICE-23-STAGE-B-C-LOCAL-QUALIFICATION-PACKET-1`
**Parent authorization:** `AUTHORIZE-CQS-SLICE-23-CLASSROOM-RELEASE-QUALIFICATION-1`

The packet directed Stage B and Stage C to run on a local environment able to
reach the normal project dependency hosts and GitHub Pages. **The session
executing this packet was not such an environment**, and the two hard stops were
re-tested directly rather than assumed.

### Preflight — PASS

| Item | Observed value |
| --- | --- |
| Host / user / cwd | `vm` / `root` / `/home/user/classroom-quiz-show` |
| Platform | `Linux 6.18.5-fc-v20 x86_64` (**not** a local macOS environment) |
| `origin/main` | `c047ca71640c3d717eacd1092a899ca6d16b2115` — **unchanged** |
| PR #60 head at packet start | `9fb3ee5caffc4f08f9f48425fcffe4786dffa9cf` |
| Working tree | clean |
| Worktrees | exactly one |
| Node / npm | `v22.22.2` / `10.9.7` |

Canonical main has **not** moved, so the authorized base holds and no refreshed
base authority is required.

### Stage B — NOT EXECUTED (blocked)

| Check | Result |
| --- | --- |
| `npm ci` | **FAIL — exit 1**, `npm error code E403`, `403 Forbidden - GET https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz` |
| `git diff --check` | **clean** |
| `npm run verify` | **NOT RUN** — toolchain not installable |
| `npm run verify:all` | **NOT RUN** — toolchain not installable |
| Lint / typecheck / unit / Playwright / build | **NOT RUN** — no totals claimed |

Re-tested this packet, both still denied by egress policy:

- `https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz` → `CONNECT tunnel
  failed, response 403`
- `https://ricktron.github.io/classroom-quiz-show/` → `CONNECT tunnel failed,
  response 403`

No usable cached copy of the tarball exists; `npm ci` fails even with a warm
npm cache directory present.

**No unit, component, Playwright, retry, flake, lint, typecheck, or build figure
is claimed.** The inherited Final mid-refresh issue therefore remains
**undispositioned**, exactly as §5 requires — and it must not be classified from
a retry-resolved full-suite run in any case.

### Stage C — NOT EXECUTED (blocked)

Stage C requires driving the running application from a clean browser profile.
That depends on a production build, which depends on the failed install. **No
clean-browser evidence exists**, and no clean-teacher startup, game-import,
team-setup, keyboard, or display-workflow observation was performed.

### Finding dispositions after this packet

| Finding | Disposition |
| --- | --- |
| `CQS-Q23-BLOCKER-01` | **UNDISPOSITIONED** — provisional severity retained, *not* confirmed |
| `CQS-Q23-BLOCKER-02` | **UNDISPOSITIONED** — provisional severity retained, *not* confirmed |
| `CQS-Q23-HIGH-01` | **UNDISPOSITIONED** — static evidence only |
| `CQS-Q23-HIGH-02` | **UNDISPOSITIONED** — static evidence only |
| `CQS-Q23-HIGH-03` | **UNDISPOSITIONED** — static evidence only |
| `CQS-Q23-LOW-01` / F-UX-01 | **UNDISPOSITIONED** — neither promoted nor dismissed |

Per the packet, a provisional Stage-0 label is **not** preserved merely because
Stage 0 used it. None of these severities has been confirmed, lowered, raised,
or rejected from live behaviour, because no live behaviour was observed.

### §71 hard-stop rule — NOT TRIGGERED

The §71 hard stop fires only on a **confirmed** BLOCKER. Neither blocker was
confirmed, so the rule did not fire and **no bounded repair packet is issued by
this document**. Issuing one now would rest on static evidence alone and would
name product paths for a defect not yet reproduced — which is precisely what the
packet's evidence discipline forbids.

Qualification nonetheless remains stopped, for the unrelated reason that its
execution environment is unavailable.

### Evidence invalidation / transfer

No new evidence was produced, so nothing is invalidated and nothing transfers.
All Stage-0 static observations remain valid as static observations at
`c047ca7…`; none has been upgraded to CLEAN-BROWSER class.

### What is needed to complete this packet

An environment that can reach the normal project dependency hosts (including
`cdn.sheetjs.com`) is sufficient for Stages B and C. GitHub Pages access is
**not** required for Stage B or Stage C — only for the deployment, PWA, and
production-offline gates later.

When that environment is available, this packet resumes at Stage B with no
change to its instructions, and Stage C should be run before any expensive
matrix work.
