# Slice 23 — Classroom Release Qualification: Plan and Stage-0 Discovery

**Slice identifier:** `CQS-SLICE-23-CLASSROOM-RELEASE-QUALIFICATION`
**Authorization:** `AUTHORIZE-CQS-SLICE-23-CLASSROOM-RELEASE-QUALIFICATION-1`
**Evidence state:** `CQS-SLICE-23-CLASSROOM-RELEASE-QUALIFICATION-ES-1`
**Stage:** Stage 0 discovery (§1–§13) + packet-1 Stage B/C attempt (§14) +
**packet-2 local Mac Stage B / Stage C / Final disposition (§15)** under
`CQS-SLICE-23-STAGE-B-C-FINAL-LOCAL-MAC-QUALIFICATION-PACKET-2`.

> **This document establishes no classroom-release PASS.** Stage A passed as a
> provenance gate. Packet 2 executed local Stage B/C and dispositioned the
> inherited Final mid-refresh issue. **§71 hard stop is TRIGGERED.** Two bounded
> repair packets are prepared below; **neither repair is implemented here.** No
> product code was mutated. Slice 23 is **not** terminal. The overall CQS MVP is
> **not** claimed complete.

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

**No LOCAL unit, Playwright, lint, typecheck, or build result is claimed by this
document.** An exact-head **CI** baseline was subsequently recovered and is
recorded separately in §14 under its own evidence class; the two must not be
conflated (§79). Substituting or repinning the dependency would be a dependency
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

### `CQS-Q23-LOW-02` (new, from CI run `31446536299`) — single ~1.25 MB JS chunk on first load

- **Evidence class:** AUTOMATED CI (exact head) — production build output.
- **Observed:** `dist/assets/index-BYR1CyC_.js` is **1 246.02 kB (gzip
  374.25 kB)**, tripping Vite's 500 kB chunk warning. Total PWA precache is
  **1 455.44 KiB across 22 entries**.
- **Why it is only LOW:** the app is a PWA with `registerType: 'autoUpdate'` and
  precaching, so this is a **one-time** cost per install/update rather than a
  per-lesson cost, and no code-splitting regression is implied — the bundle
  legitimately carries the whole engine plus SheetJS.
- **Why it is recorded at all:** first load happens on school Wi-Fi, in front of
  a class, at the least forgiving possible moment. Whether that is acceptable is
  a **live measurement question** on a real school network, not something the
  build log can settle.
- **Routing:** measure during the Stage I / classroom-startup gate. Do **not**
  treat as a defect or optimize speculatively — §85 forbids redesign from
  qualification, and no optimization is authorized.

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

### Sharpened analysis from CI run `31446536299` (added under packet 1)

The `mobile-host` failure context records:

```
14 × locator resolved to
  <span class="fwh__committed" data-testid="fwh-committed-wager-basalts">Not saved yet</span>
   - unexpected value "Not saved yet"
```

This **materially narrows the hypothesis space, and not in the product's
favour.** The locator resolved **14 times across the full 5 000 ms timeout** and
reported `Not saved yet` every time. That is not the shape of an assertion
arriving a few milliseconds early: after `Resume session`, the panel rendered a
**stable** committed-wager state of "not saved" for five continuous seconds.

Consequently hypothesis **(B) "deterministic test-harness flake only"** is now
**weakly supported**, and the leading hypothesis is that the resumed session
genuinely **did not contain the committed wager** on that attempt — i.e. a wager
the teacher was told was `Saved: 100` did not survive refresh-and-resume. The
same sequence succeeded on retry, so the behaviour is **nondeterministic**,
consistent with an ordering/durability race between the wager write and the
reload rather than with a rendering delay.

**This is not yet a disposition, and must not be reported as one.** It is a
recorded update to the analysis that raises the prior probability of §43
outcome **(A) actual product defect** and correspondingly raises the priority of
running the focused reproduction above. If confirmed, the classroom consequence
is direct: a Final wager silently lost across a mid-round refresh, which is a
release-blocking data-loss class of defect. If disproven, it reverts to a
harness flake — but that must be **shown**, not assumed from the retry.

### Two-sample flake rate at an identical product tree

Two CI runs were observed against product trees **byte-identical to the
authorized base**, giving an unusually clean natural experiment — the only thing
varying between them is runner timing.

| Run | Head | Passed | Skipped | Flaky | Projects that flaked |
| --- | --- | --- | --- | --- | --- |
| `31446536299` | `9fb3ee5…` | 355 | 14 | **3** | `desktop-1080p`, `projector-720p`, `mobile-host` |
| `31447234996` | `7948a3a…` | 356 | 14 | **2** | `projector-720p`, `mobile-host` |

**5 of 6 project-runs flaked**, and the set of affected projects **changed
between runs** with no product change whatsoever (`desktop-1080p` flaked in the
first sample and passed first-try in the second).

This further weakens hypothesis **(B) deterministic test-harness flake** — a
deterministic harness defect would fail the same projects every time. The
observed behaviour is that of a **genuine nondeterministic race** whose outcome
tracks machine timing, which is consistent with either §43 **(A) actual product
defect** or **(C) environment race with no demonstrated product impact**.

Distinguishing (A) from (C) is exactly what the focused reproduction above is
for, and it is now the **highest-value single experiment remaining in Slice 23**:
a ~90 % per-project reproduction rate means the answer is cheap to obtain once a
working toolchain exists. **No disposition is made here.**

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
| A | Canonical/preflight | **DONE — PASS** (§1, §14, §15) — provenance gate only |
| B | Clean automated baseline (`verify`, `verify:all`, matrices) | **LOCAL EXECUTED (§15)** — `verify` PASS; `verify:all` FAIL (inherited Final signature terminal on all 3 projects after retries). Exact-head CI baseline remains green evidence (§14) |
| C | Clean-teacher first-launch workflow (clean profile) | **EXECUTED (§15)** — BLOCKER-01/02 **CONFIRMED**; §71 **TRIGGERED** |
| D | Import / authoring / pack / data lifecycle | **NOT RUN** — §71 hard stop; would be invalidated by teacher-surface repair |
| E | Gameplay, Final, undo, recovery (+ flake disposition) | **Focused Final only (§15)** — dispositioned **RELEASE BLOCKER**; broad matrix not run |
| F | Presentation / accessibility / themes / screen reader | **NOT RUN** — §71 hard stop |
| G | Physical projector, viewing distance, audio | **Owner-assisted; not attempted** |
| H | Supported Sony profile (transferred + focused current) | **Owner-assisted; not attempted** |
| I | Deployment / PWA / update / offline / reset | **NOT RUN** (HS-2 still blocks Pages from VM history; Mac packet did not claim Pages) |
| J | Findings, limitations, continuation analysis | Updated (§4, §9, §15) |
| K | Repair loops | **Packets prepared; NOT authorized / NOT implemented** |
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
- Packet-1 VM session: **No LOCAL** unit/Playwright/lint/typecheck/build figures
  from that blocked environment. Exact-head **CI** figures in §14 remain valid
  under their own class.
- Packet-2 local Mac (§15): local `npm ci`, `verify`, and `verify:all` **are**
  claimed. Local `verify:all` **failed** on the inherited Final mid-refresh
  signature (terminal after retries). That failure is dispositioned in §15; it
  does not authorize repair in this PR.
- **No** Pages deployment result is claimed (HS-2).
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

1. **Authorize the two bounded repair packets in §15 separately** (teacher-surface
   first is economical; Final-recovery is independently release-blocking).
2. **Do not fund the broad Stage D–I matrix** until teacher-surface repair is
   accepted — §71 hard stop is triggered and host-surface repair would invalidate
   that matrix.
3. **Do not treat this document as authority** to implement either repair, to
   merge PR #60, or to declare MVP completion.
4. After repairs merge to a new authorized product base, re-authorize Slice 23
   qualification continuation from that base.

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

### Stage B — LOCAL execution blocked; exact-head CI baseline recovered instead

#### B-local — NOT EXECUTED

| Check | Result |
| --- | --- |
| `npm ci` | **FAIL — exit 1**, `npm error code E403`, `403 Forbidden - GET https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz` |
| `git diff --check` | **clean** |
| `npm run verify` | **NOT RUN** — toolchain not installable |
| `npm run verify:all` | **NOT RUN** — toolchain not installable |

#### B-CI — EXECUTED, exact head, all checks green

**Evidence class: AUTOMATED CI (exact head) — explicitly NOT local `verify:all`,
and per §79 not interchangeable with it.**

PR #60's product tree is **byte-identical to the authorized base** (the only
difference from `c047ca7…` is this qualification document), so CI on the PR head
is a valid automated baseline **of the product at the authorized base**.

CI run `31446536299`, head `9fb3ee5caffc4f08f9f48425fcffe4786dffa9cf`, both jobs
**success**:

| Check | Result |
| --- | --- |
| `npm ci` | **success** (CI runners reach `cdn.sheetjs.com`) |
| Lint | **success** |
| Typecheck | **success** |
| Unit / component | **140 test files, 2397 passed, 1 skipped (2398)**, 71.99 s |
| Production build | **success** — vite 7.3.6, 348 modules |
| PWA | `generateSW`, **precache 22 entries (1455.44 KiB)**, includes all five Slice 22 `.wav` cues |
| Playwright | **355 passed / 14 skipped / 3 flaky / 0 terminal failures**, 8.8 m, 3 projects |
| SonarCloud | Quality Gate **passed** — 0 new issues, 0 accepted issues, 0 security hotspots |

**Precision required:** the constituent checks of `verify:all` all passed at the
exact head, but the literal `npm run verify` / `npm run verify:all` scripts were
**not invoked** — CI runs the same commands as discrete steps. This document
does **not** claim "`verify:all` green" in the Definition-of-Done sense; that
still requires a local run per the DoD.

**§81 provenance is satisfied for this run:** CI sets `CI=true`, so
`reuseExistingServer: !process.env.CI` evaluates false and Playwright built and
served a fresh bundle from the exact head. No stale-server risk applies here.

The unit totals (**2397 / 1 skipped / 140 files**) match those recorded in
`docs/STATUS.md` for the Slice 22 frontier, independently corroborating that the
qualification base is the product `main` describes.

#### Flakes — NOT hidden, NOT dispositioned

All **3** flaky cases are the single inherited signature, one per project:

```
[desktop-1080p]  tests/e2e/final-wager.spec.ts:281 › a refresh mid-Final resumes every committed wager
[projector-720p] tests/e2e/final-wager.spec.ts:281 › a refresh mid-Final resumes every committed wager
[mobile-host]    tests/e2e/final-wager.spec.ts:281 › a refresh mid-Final resumes every committed wager
```

Each retry-resolved. **Per §43 this is NOT a disposition**, and a retry-resolved
full-suite run is explicitly insufficient to classify it. See §5 for the
sharpened analysis this run enables.

Re-tested this packet, both still denied by egress policy:

- `https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz` → `CONNECT tunnel
  failed, response 403`
- `https://ricktron.github.io/classroom-quiz-show/` → `CONNECT tunnel failed,
  response 403`

No usable cached copy of the tarball exists; `npm ci` fails even with a warm
npm cache directory present.

**No LOCAL** unit, component, Playwright, retry, flake, lint, typecheck, or
build figure is claimed from the blocked VM execution (HS-1). Exact-head
**AUTOMATED CI** figures above **are** claimed and remain valid evidence under
their own class; they do not substitute for literal local `verify` /
`verify:all`. The inherited Final mid-refresh issue therefore remains
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
| `CQS-Q23-LOW-02` | **NEW** — recorded from CI build output; routed to a live measurement gate |
| `CQS-Q23-CLASS-B-01` | **Unchanged** — Class B continuation candidate, not a Slice 23 defect |
| Inherited Final mid-refresh flake | **STILL UNDISPOSITIONED**, but §5 analysis sharpened by two independent same-tree samples (3 flaky then 2 flaky, 5 of 6 project-runs); a deterministic harness defect is now weakly supported |

Per the packet, a provisional Stage-0 label is **not** preserved merely because
Stage 0 used it. None of the six teacher-workflow severities has been confirmed,
lowered, raised, or rejected from live behaviour, because **no clean-browser
behaviour was observed**. The CI baseline exercises the product's automated
suites; it does **not** exercise the ordinary-teacher path, which is precisely
what BLOCKER-01/02 concern — a suite written by developers who know where the
controls are cannot detect that a teacher would not find them.

### §71 hard-stop rule — NOT TRIGGERED

The §71 hard stop fires only on a **confirmed** BLOCKER. Neither blocker was
confirmed, so the rule did not fire and **no bounded repair packet is issued by
this document**. Issuing one now would rest on static evidence alone and would
name product paths for a defect not yet reproduced — which is precisely what the
packet's evidence discipline forbids.

Qualification nonetheless remains stopped, for the unrelated reason that its
execution environment is unavailable.

### Evidence invalidation / transfer

Nothing is invalidated — no product code changed, so no prior evidence is
disturbed. Slice 21 physical controller evidence and Slice 22 owner listening
evidence both continue to transfer exactly as described in §11.

Newly **established** evidence: the CI baseline (`AUTOMATED CI, exact head`) for
lint, typecheck, unit, build, PWA precache composition, and Playwright at
`9fb3ee5…`, whose product tree equals the authorized base. This transfers to any
later qualification stage **so long as no product code changes**; the first
product repair invalidates the Playwright and build portions of it.

All Stage-0 teacher-workflow observations remain **static** observations at
`c047ca7…`. **None has been upgraded to CLEAN-BROWSER class**, and the CI
baseline does not upgrade them.

### What packet 1 still needed

An environment that can reach the normal project dependency hosts (including
`cdn.sheetjs.com`) was sufficient for Stages B and C. **Packet 2 (§15) supplied
that environment on the owner's local Mac and executed those stages.**

---

## 15. Packet 2 — local Mac Stage B / Stage C / Final disposition

**Packet:** `CQS-SLICE-23-STAGE-B-C-FINAL-LOCAL-MAC-QUALIFICATION-PACKET-2`
**Parent authorization:** `AUTHORIZE-CQS-SLICE-23-CLASSROOM-RELEASE-QUALIFICATION-1`
**Product base (unchanged):** `c047ca71640c3d717eacd1092a899ca6d16b2115`
**Starting PR head observed:** `8220be60129fb4ef3a1c7ffbf9a77534f3f441cf`
(packet text expected `7948a3a…`; remote had already advanced by one
qualification-only docs commit recording the two-sample flake rate — product
tree still identical to base)
**Execution host:** `Ricks-MacBook-Air.local` / user `macdaddy` /
cwd worktree `…/classroom-quiz-show-slice23` / macOS **26.5.1** (Build 25F80) /
Darwin 25.5.0 arm64 / Node **v26.0.0** / npm **11.12.1**

### Product-tree equality proof

```
git diff --name-only origin/main...HEAD
→ docs/qualification/SLICE-23-QUALIFICATION-PLAN.md
```

Zero product, dependency, or configuration paths. Only this qualification
record differs from authorized main.

### Stage B — literal local baseline

| Check | Result |
| --- | --- |
| `npm ci` | **PASS** (exit 0; SheetJS CDN reachable on this Mac) |
| `git diff --check` | **PASS** (clean) |
| `npm run verify` | **PASS** — lint 0 errors / 3 pre-existing react-refresh warnings; typecheck pass; unit **140 files / 2397 passed / 1 skipped** |
| `npm run verify:all` (`CI=1`) | **FAIL** — lint/typecheck/unit/build PASS; Playwright **346 passed / 14 skipped / 3 failed / 9 did not run**; the 3 failures are the inherited Final mid-refresh case on all three projects, each exhausting retries 0/1/2 with stable `Not saved yet` for the full 5s assertion |
| Production build | **PASS** — vite built in 1.81s; `index-BYR1CyC_.js` 1246.02 kB (gzip 372.22 kB); PWA `generateSW` precache **22 entries (1455.44 KiB)** |
| Flakes / retries | Not “flaky-then-pass”: **9/9** attempt rows for the Final mid-refresh case failed under `CI=1` retries=2 during `verify:all` |

Prior exact-head CI baseline (§14) remains valid automated evidence of the same
product tree, but **does not substitute** for this literal local run. Local
`verify:all` is **not** green.

### Stage C — clean-teacher first-run (production preview)

- **Profile:** fresh Chromium `launchPersistentContext` temp user-data-dir
  (no inherited IndexedDB / SW / cache).
- **Server:** `npm run build` artifact served by `vite preview` on
  `http://localhost:4173/classroom-quiz-show/` (exact current head bundle).
- **Driver constraint (user-level):** labels/roles only; no testids for the
  teacher path; technical inspection only after user-level failures recorded.

| Step | Result |
| --- | --- |
| Launch / begin | Root shows “Choose a screen” with **Open Host** / **Open Display** — discoverable |
| Enter host | Host banner + Theme + **“No active game”** + stale copy that setup/rounds/scoring **“arrive in a later slice”** (false at this base) |
| Harness branding | Visible tag **“Foundation / testing controls — not gameplay”**; heading **“State & event core (Slice 2)”**; copy **“They are diagnostics, not a game.”** |
| Create/import/select without hidden knowledge | **FAIL.** “Import game” after loading the board+Final sample reports **“Import succeeded — validated but NOT loaded. Initialize a session first, then import again.”** “Initialize sample game” is **disabled** until session init |
| Prerequisite control | Only **“Initialize / reset session”** inside the not-gameplay panel unlocks loading — developer vocabulary required |
| After init + import + advance | Category board, teams (sample Basalts/Tectonics), keyboard/local input, controllers/Sony Buzz, Open display — all present |
| Team configuration | Sample teams present; no separate teacher “add/rename team” flow required for the sample path |
| Keyboard discoverability | Present after a game is loaded; not a first-screen cue |
| Controller-setup discoverability | Controllers / Sony Buzz present after game load; still nested in the foundation harness |
| Display-opening discoverability | **“Open display in new window”** visible above the fold on first host landing — good |
| Ready for normal gameplay? | **Only after** using developer-vocab session init and scrolling to import — **not** a credible ordinary-teacher first-run route |

**Ordinary-teacher credible first-run route without developer vocabulary?** **NO.**

### Finding dispositions (live evidence)

#### `CQS-Q23-BLOCKER-01` — **CONFIRMED BLOCKER**

- **Evidence class:** CLEAN-BROWSER (production preview, fresh profile)
- **Reproduction:** Open Host from a clean profile; read the first screen
- **Expected:** teacher can identify the normal gameplay starting workflow
- **Actual:** product says gameplay arrives later; real controls sit under
  “not gameplay” / “diagnostics, not a game”
- **Workflow:** startup → understand where to begin
- **Severity:** **BLOCKER** (confirmed; not lowered)
- **Release implication:** first-run abandonment / inability to trust the host
- **Routing:** teacher-surface repair packet (§15.1)

#### `CQS-Q23-BLOCKER-02` — **CONFIRMED BLOCKER**

- **Evidence class:** CLEAN-BROWSER
- **Reproduction:** Load board+Final sample → Import game **without** session init
- **Expected:** teacher can load a playable game without a hidden prerequisite
- **Actual:** validated-but-not-loaded + “Initialize a session first…”; sample
  init button disabled until session exists
- **Workflow:** create/import/select a game
- **Severity:** **BLOCKER** (confirmed)
- **Release implication:** hard stop on clean-install golden path
- **Routing:** teacher-surface repair packet (§15.1) — same boundary as BLOCKER-01

#### `CQS-Q23-HIGH-01` — **CONFIRMED HIGH**

- **Evidence class:** CLEAN-BROWSER (section order after game load)
- **Actual:** Import / spreadsheet / pack sections appear **after** board,
  local input, controllers, and teams in the host document order
- **Severity:** **HIGH** (confirmed)
- **Routing:** include in teacher-surface repair packet

#### `CQS-Q23-HIGH-02` — **CONFIRMED HIGH**

- **Evidence class:** STATIC + CLEAN-BROWSER (UI does not substitute)
- **Actual:** no teacher guide / quick start; README remains developer-centric
- **Severity:** **HIGH** (confirmed)
- **Routing:** teacher-surface repair packet (docs or in-product first-run)

#### `CQS-Q23-HIGH-03` — **CONFIRMED HIGH**

- **Evidence class:** CLEAN-BROWSER + static code
- **Actual:** no “clear all local CQS data” control observed; `clearAll` regex
  false on loaded host
- **Severity:** **HIGH** (confirmed as absence-of-capability)
- **Routing:** may ship with teacher-surface repair or a separately bounded
  retention-control packet; not required to share Final-recovery boundary

#### `CQS-Q23-LOW-01` / F-UX-01 — **RETAINED LOW**

- After a game loads, keyboard and controller/Sony surfaces are findable.
- No live evidence in this packet promoted F-UX-01 beyond LOW polish debt.
- **Not collapsed into BLOCKER-01.**

### §71 hard-stop result — **TRIGGERED**

Ordinary teacher lacks a credible first-run route **and** BLOCKER-01/02 are
confirmed. Broad Stages D–I matrices were **not** run. Focused Final
investigation continued per packet instruction.

### Inherited Final mid-refresh — focused disposition

**Method:**

1. `CI=1 npx playwright test tests/e2e/final-wager.spec.ts -g "a refresh mid-Final resumes every committed wager" --retries=0 --repeat-each=5 --workers=1`
2. Temporary outside-repo probe (`/tmp/cqs-slice23-final-diag/probe-immediate.mjs`)
   against production preview: save wager → **immediate** reload → resume;
   IndexedDB `classroom-quiz-show-persistence` / `activeSessions` / `current`
   inspected **after** reload (not before — a pre-reload IDB read accidentally
   settles the write queue and masks the defect).
3. Contrast run with `SETTLE_MS=1000` before reload.

**Attempt counts (Playwright, retries disabled):**

| Project | Attempts | Failures | Passes |
| --- | --- | --- | --- |
| desktop-1080p | 5 | **5** | 0 |
| projector-720p | 5 | **5** | 0 |
| mobile-host | 5 | **4** | 1 |
| **Total** | **15** | **14** | **1** |

**Immediate-reload IndexedDB probe:** **10/10** →
`A_not_durable_at_reload` — after UI showed `Saved: 100`, post-reload durable
session ended at `FINAL_WAGER_STARTED` with **zero**
`FINAL_TEAM_WAGER_RECORDED` events; resume UI stayed `Not saved yet` for 5s.

**Settle 1000 ms before reload:** **6/6 PASS** — durable row then contained
`FINAL_TEAM_WAGER_RECORDED` wager 100 for `basalts`, and UI restored
`Saved: 100`.

**Boundary classification:** **A** — wager was **not** durably persisted at the
moment the UI reported it saved; recovery/hydration is not the primary failure
when the write has completed (settle case proves B/C are not required to explain
the signature). Root mechanism consistent with `dispatchSessionCommand` →
in-memory accept → UI `Saved: N` from replayed state while `persistHistory` is
async/`void` on the write queue (`useHostPersistence.ts`).

#### Final disposition (exactly one)

**RELEASE BLOCKER — REPAIR REQUIRED**

**Release implication:** a teacher can be told a Final wager is saved, refresh
(or crash) before the async write lands, Resume, and silently lose the committed
wager. Retry-resolution in CI is insufficient and must not be treated as
non-blocking.

### 15.1 Bounded repair packet — teacher surface

- **Finding IDs:** `CQS-Q23-BLOCKER-01`, `CQS-Q23-BLOCKER-02`,
  `CQS-Q23-HIGH-01`, `CQS-Q23-HIGH-02` (and optionally `HIGH-03`)
- **Exact product base:** `c047ca71640c3d717eacd1092a899ca6d16b2115`
- **Exact qualification head:** PR #60 head carrying this §15 record
- **Reproduction:** clean profile → Open Host → attempt import without session
  init; observe stale “later slice” / “not gameplay” framing
- **Invariant:** ordinary teacher can reach a playable game from the visible
  entry point without developer vocabulary or hidden prerequisites; host chrome
  must not deny that gameplay exists
- **Minimal proposed product paths:** `src/routes/HostRoute.tsx`,
  `src/host/FoundationControls.tsx`, import gating in
  `src/host/GameImportPanel.tsx` (and pack/spreadsheet siblings), optional
  teacher quick-start doc under product-facing docs — **not** engine/reducer
  changes
- **Proposed repair shape:** (1) replace stale/hostile host framing with a
  teacher-facing session start; (2) auto-start or clearly label the session
  prerequisite without “diagnostics” burial; (3) move content-loading above
  gameplay panels; (4) add a short teacher start path
- **Focused tests:** clean-path Playwright using **visible labels only**;
  regression that import works without scavenger-hunting Initialize/reset
- **Evidence invalidated by repair:** Stage C teacher-path observations;
  any later host-UI screenshots; portions of e2e that hard-code the current
  Initialize/import order (re-prove)
- **Evidence transferable:** engine/reducer/unit totals; Final durability
  defect (separate); Slice 21 hardware / Slice 22 listening transfer notes
- **Authorization required:** explicit owner/program repair authorization —
  **DO NOT IMPLEMENT under this qualification packet**

### 15.2 Bounded repair packet — Final wager durability / recovery

- **Finding ID:** inherited Final mid-refresh / `FINAL_TEAM_WAGER_RECORDED`
  durability race (Slice 23 disposition: release blocker)
- **Exact product base:** `c047ca71640c3d717eacd1092a899ca6d16b2115`
- **Exact qualification head:** PR #60 head carrying this §15 record
- **Reproduction:** Final begin → save wager 100 → UI `Saved: 100` → immediate
  reload → Resume → `Not saved yet`; IndexedDB lacks wager event
- **Invariant:** UI must not report a wager `Saved` unless that
  `FINAL_TEAM_WAGER_RECORDED` event is durably present (or an explicit
  in-flight/failed persistence state is shown); Resume must restore every
  durably committed wager
- **Minimal proposed product paths:** `src/host/useHostPersistence.ts`
  (`persistHistory` / `dispatchSessionCommand` write barrier), possibly
  `PersistenceWriteQueue` await-before-ack; Final host panel only if it needs
  an explicit pending/failed affordance — **not** teacher-chrome redesign
- **Proposed repair shape:** await durable active-session write (or confirmed
  queue flush) before treating the command as teacher-visible “saved”; add
  focused regression that fails on immediate reload without artificial settle
- **Focused tests:** existing
  `tests/e2e/final-wager.spec.ts` mid-refresh case with retries disabled;
  unit/component coverage that save acknowledgment waits for persistence result
- **Evidence invalidated:** Final flake disposition runs; Playwright Final
  mid-refresh history; local `verify:all` Final portion
- **Evidence transferable:** teacher-surface BLOCKER evidence (separate
  boundary); unrelated unit suites; Slice 21/22 transferred hardware/listening
- **Authorization required:** explicit owner/program repair authorization —
  **DO NOT IMPLEMENT under this qualification packet**

These two packets must **not** be collapsed into one “fix Slice 23” delivery:
teacher chrome and persistence write-barrier are distinct invariants.

### Evidence invalidated / transferable (packet 2)

- **Invalidated by future teacher-surface repair:** Stage C clean-teacher path;
  host copy/order observations
- **Invalidated by future Final-durability repair:** Final focused probe results;
  mid-refresh e2e failure counts
- **Transferable until product changes:** Stage A provenance; product-tree
  equality proof; unit totals at this base; build/PWA composition; Slice 21
  physical controller transfer notes; Slice 22 listening transfer notes; §14 CI
  baseline as historical automated evidence of pre-repair tree

### Packet 2 non-claims

- **No product repair implemented**
- **No merge of PR #60**
- **OVERALL CQS MVP = NOT COMPLETE**
- Broad classroom matrix (projector, a11y, PWA deploy, full hardware) **not**
  claimed

### Recommended Slice Orchestrator next action

Authorize **§15.1 teacher-surface repair** and **§15.2 Final-durability repair**
as separate packets against product base `c047ca7…`. Do not merge this
qualification PR as a product delivery. Do not start post-Slice-23 MVP
functionality.
