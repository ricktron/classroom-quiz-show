# Slice 23 — Broad Stages D–I classroom-release qualification (resumption)

- **Date:** 2026-08-12
- **Slice:** `CQS-SLICE-23-CLASSROOM-RELEASE-QUALIFICATION`
- **Kind:** qualification / evidence capture / finding classification (**docs-only**)
- **Environment:** owner local Mac `Ricks-MacBook-Air.local` / `macdaddy`
- **Qualification worktree:** `/tmp/cqs-slice23-d-i-qual-es1`
- **Docs branch:** `docs/slice-23-broad-d-i-qualification`
- **Evidence PR:** [#65](https://github.com/ricktron/classroom-quiz-show/pull/65)

## Identity

| Item | Value |
| --- | --- |
| Parent authorization | `AUTHORIZE-CQS-SLICE-23-CLASSROOM-RELEASE-QUALIFICATION-1` |
| Qualification-resumption authorization | `AUTHORIZE-CQS-SLICE-23-BROAD-STAGES-D-I-QUALIFICATION-RESUMPTION-1` |
| Owner-evidence completion authorization | `AUTHORIZE-CQS-SLICE-23-PR65-OWNER-EVIDENCE-COMPLETION-AND-QUALIFICATION-REVIEW-READY-1` |
| Evidence-state ID (executable D–I) | `CQS-SLICE-23-BROAD-STAGES-D-I-QUALIFICATION-RESUMPTION-ES-1` |
| Evidence-state ID (owner completion) | `CQS-SLICE-23-PR65-OWNER-EVIDENCE-COMPLETION-ES-1` |
| Exact canonical starting `origin/main` | `06f486c952bb40f03e376839b04a7b72bab6d0c3` |
| Current `origin/main` | `06f486c952bb40f03e376839b04a7b72bab6d0c3` |
| Historical PR #60 | **CLOSED / UNMERGED / HISTORICAL / SUPERSEDED** (closed 2026-08-12T20:45:09Z; head `6a6d34430fc765e9a63fa9bd2eac073e6b4ef201`; `mergedAt` null) |
| PR #61 / #62 / #63 / #64 | **TERMINAL** |
| PR #65 pre-owner-evidence head | `8cfe1c12c6aa791076d5fcbffbe47c47a3eea16a` |
| Slice 23 | **IN QUALIFICATION / NOT TERMINAL** — D–I executed; owner evidence complete; ready for fresh independent exact-head review |
| OVERALL CQS MVP | **NOT COMPLETE** |
| Primary verdict | `CQS_S23_D_I_QUALIFICATION_REVIEW_READY` |

## Preflight

| Check | Result |
| --- | --- |
| `git fetch origin --prune` | pass |
| `git rev-parse origin/main` | `06f486c952bb40f03e376839b04a7b72bab6d0c3` |
| Source worktree `git status --short` | empty |
| Qualification worktree | docs branch at exact pre-update PR head `8cfe1c1…` before this completion commit |
| `hostname` / `whoami` / `pwd` | `Ricks-MacBook-Air.local` / `macdaddy` / `/tmp/cqs-slice23-d-i-qual-es1` |
| `node` / `npm` | `v26.0.0` / `11.12.1` |
| §71 | **CLEARED FOR QUALIFICATION RESUMPTION** (historical fire preserved) |

## Evidence transfer table

| Source | Transfer disposition |
| --- | --- |
| PR #61 | **TRANSFER** — Final wager durability + immediate-refresh evidence |
| PR #62 | **TRANSFER** — teacher first-run / visible load path / quick-start |
| PR #63 | **TRANSFER** — aggregate local-data reset / M1 correction |
| PR #64 | **TRANSFER** — canonical evidence reconciliation only (now on main as `06f486c…`) |
| Slice 21 | **TRANSFER** — Sony supported-profile physical evidence where causally unrelated to later repairs; do **not** reopen four-controller gate |
| Slice 22 | **TRANSFER** — owner-listened presentation-audio evidence (no `src/audio` product change after `#58` squash `e69e81b…` through `06f486c…`) |
| CI on `06f486c…` | **TRANSFER / CURRENT** — run [`31618313458`](https://github.com/ricktron/classroom-quiz-show/actions/runs/31618313458) **success** |
| Pages deploy on `06f486c…` | **TRANSFER / CURRENT** — run [`31618313446`](https://github.com/ricktron/classroom-quiz-show/actions/runs/31618313446) **success**; URL `https://ricktron.github.io/classroom-quiz-show/` |
| Historical PR #60 defects / old §71 blocking / old Final durability failure / old absence-of-reset | **HISTORICAL ONLY** |

## Baseline automated safety (executable packet)

| Command | First result | Exit |
| --- | --- | --- |
| `npm ci` | 549 packages | 0 |
| `git diff --check` | clean | 0 |
| `npm run verify` | **143** files / **2424** passed / **2** skipped | 0 |
| `npm run build` | PASS; main JS **1256.80 kB** (gzip **375.32 kB**); PWA precache **22** entries (**1466.29 KiB**) | 0 |
| `CI=1 npm run test:e2e` (local on `06f486c…`) | **367** passed / **14** skipped / **0** failed | 0 |
| CI Playwright on exact head `06f486c…` | run [`31618313458`](https://github.com/ricktron/classroom-quiz-show/actions/runs/31618313458) **success** | supporting |

Automated baseline is **supporting** evidence. It does **not** substitute for D–I classroom qualification.

## Stage D — Import / authoring / pack / data lifecycle

**Overall: PASS**

| Subgate | Disposition | Evidence class |
| --- | --- | --- |
| D clean-teacher → playable | **PASS** | CLEAN-BROWSER |
| D GameDefinition import | **PASS** | CLEAN-BROWSER |
| D invalid import | **PASS** | CLEAN-BROWSER |
| D malformed / no misleading playable | **PASS** | CLEAN-BROWSER |
| D authoring | **PASS** | CLEAN-BROWSER |
| D pack export | **PASS** | CLEAN-BROWSER |
| D clean-profile pack import | **PASS** | CLEAN-BROWSER |
| D media valid | **PASS** | CLEAN-BROWSER (+ media-contract e2e transfer) |
| D media failure | **PASS** | CLEAN-BROWSER |
| D persistence | **PASS** | CLEAN-BROWSER |
| D aggregate reset | **PASS** | CLEAN-BROWSER |
| D retention/deletion docs | **PASS** | docs (`QUICK_START.md`) |

## Stage E — Broad gameplay / Final / undo / recovery

**Overall: PASS**

| Subgate | Disposition | Evidence class |
| --- | --- | --- |
| E standard full-game | **PASS** | CLEAN-BROWSER |
| E score matrix | **PASS** | CLEAN-BROWSER + e2e transfer |
| E team-count matrix | **PASS** | CLEAN-BROWSER + e2e transfer (1/4/6/8) |
| E long-name matrix | **PASS** | CLEAN-BROWSER / e2e (40-char authored max) |
| E buzz / early-buzz / queue | **PASS** | AUTOMATED E2E + local keyboard |
| E undo / correction | **PASS** | CLEAN-BROWSER / e2e |
| E mid-game refresh/recovery | **PASS** | CLEAN-BROWSER |
| E Final complete flow | **PASS** | CLEAN-BROWSER |
| E immediate-refresh Final durability | **PASS** | CLEAN-BROWSER (PR #61 non-regression) |
| E tie | **PASS** | AUTOMATED E2E |
| E completed summary | **PASS** | CLEAN-BROWSER |
| E comparison / history | **PASS** | AUTOMATED + host panel |

## Stage F — Presentation / accessibility / themes / screen reader

**Overall: PASS**

| Subgate | Disposition | Evidence class |
| --- | --- | --- |
| F keyboard-only | **PASS** | CLEAN-BROWSER |
| F semantic accessibility | **PASS** | ACCESSIBILITY / AUTOMATED |
| F **actual screen reader** | **PASS** | **SCREEN-READER / OWNER-OBSERVED** — macOS VoiceOver **PASS** (owner) |
| F high-contrast | **PASS** | AUTOMATED E2E |
| F reduced motion | **PASS** | AUTOMATED E2E + emulate |
| F grayscale / color independence | **PASS** | CLEAN-BROWSER |
| F 1080p | **PASS** | CLEAN-BROWSER viewport |
| F 720p | **PASS** | CLEAN-BROWSER viewport |

Automated/semantic checks remain a separate evidence class from the owner VoiceOver PASS.

## Stage G — Physical projector / viewing distance / audio

**Overall: PASS**

| Subgate | Disposition | Evidence class |
| --- | --- | --- |
| Physical classroom projector setup | **PASS** | **PHYSICAL PROJECTOR / OWNER-OBSERVED** |
| Host/public projection separation | **PASS** | **PHYSICAL PROJECTOR / OWNER-OBSERVED** |
| Viewing-distance / projector usability | **PASS** | **PHYSICAL PROJECTOR / OWNER-OBSERVED** |
| Classroom audio routing / use | **PASS** | **PHYSICAL AUDIO / OWNER-OBSERVED** |

Owner returned **Projector + Audio PASS**. No invented distances, dB levels, or device models. Prior viewport/contrast/long-name/negative-score and Slice 22 listening evidence remain separately classified.

## Stage H — Supported Sony profile

**Overall: PASS**

Profile: `cqs.sony-buzz.namtai-wbuzz-wireless.v1`

| Item | Disposition |
| --- | --- |
| Current-release owner Sony smoke | **PASS** — owner returned **Sony PASS** (**PHYSICAL SONY HARDWARE / OWNER-OBSERVED**) |
| Detailed Slice 21 physical evidence | **TRANSFER** — retained for causally unchanged facts |
| Four-controller historical absence | **Not** a new defect; gate not reopened |
| `F-UX-01` / `CQS-Q23-LOW-01` | **OPEN / RETAINED / LOW** |

No fabricated button-by-button matrix beyond the owner PASS plus transferred Slice 21 detail.

## Stage I — Deployment / PWA / update / offline / reset

**Overall: PASS / QUALIFIED WITH RECORDED NON-BLOCKING LIMITATIONS**

| Subgate | Disposition | Notes |
| --- | --- | --- |
| Deployment URL | `https://ricktron.github.io/classroom-quiz-show/` | README + Pages |
| Deployed commit / provenance | **PASS (strong)** | Pages + CI on `06f486c…` |
| Clean deployed golden path | **PASS** | CLEAN-BROWSER |
| PWA manifest / SW | **PASS** (supporting) | AUTOMATED / CLEAN-BROWSER |
| Installed PWA / owner-live path | **PASS** | **OWNER-OBSERVED PWA/DEPLOYMENT** — see owner-evidence section |
| Offline shell | **PASS** | CLEAN-BROWSER |
| Offline gameplay / local-data | **PASS** | CLEAN-BROWSER (Resume-gated load expected) |
| SheetJS / `CLASS-B-01` | **RETAIN CLASS-B** | no current promised release failure observed |
| Update flow | **RECORDED LIMITATION (non-blocking)** | only one live build at qualification time; safe stale→new publish simulation was not performed; SW/update unit/e2e remain supporting only |
| Deployed/PWA reset | **PASS** | CLEAN-BROWSER on Pages |
| `LOW-02` startup measure | **RETAIN LOW** | main chunk **1256.80 kB** / gzip **375.32 kB**; precache **22** / **1466.29 KiB**; not optimized |

### Installed-PWA operational caveat (non-blocking)

Owner-observed: the installed-app Host/Display workflow worked correctly when
existing ordinary Chrome CQS tabs were closed. Recorded as **startup/UX /
distribution friction** under **C-3** / **LOW-02 context** — **not** Class A.
Not repaired in this packet.

## OWNER EVIDENCE COMPLETION

Collected by the Slice Orchestrator from Rick and recorded under
`AUTHORIZE-CQS-SLICE-23-PR65-OWNER-EVIDENCE-COMPLETION-AND-QUALIFICATION-REVIEW-READY-1`.

| Gate | Evidence class | Owner result | Recorded observation (only as stated) |
| --- | --- | --- | --- |
| Stage F screen reader | **SCREEN-READER / OWNER-OBSERVED** | **PASS** | Owner: **VoiceOver PASS** (macOS) |
| Stage G projector | **PHYSICAL PROJECTOR / OWNER-OBSERVED** | **PASS** | Owner: **Projector + Audio PASS** |
| Stage G audio | **PHYSICAL AUDIO / OWNER-OBSERVED** | **PASS** | Same owner report; classroom audio routing/use PASS |
| Stage H Sony | **PHYSICAL SONY HARDWARE / OWNER-OBSERVED** | **PASS** | Owner: **Sony PASS** for supported profile smoke; combined with transferred Slice 21 detail |
| Stage I installed PWA / owner-live | **OWNER-OBSERVED PWA/DEPLOYMENT** | **PASS** | Installed/launched as app on macOS/Chrome; Host and separate Display launched; active session appeared on Display; host/public separation clear/usable; works when ordinary Chrome CQS tabs are closed |

No additional invented measurements beyond these four accepted owner PASS reports
and previously captured executable evidence.

## Findings

### Class A

**None newly reproduced.**

### Class B

| ID | Status |
| --- | --- |
| `CQS-Q23-CLASS-B-01` | **OPEN** — distribution/supply-chain/package-source concern; **not** observed as a current deployed/PWA promised-functionality failure |

### LOW

| ID | Status |
| --- | --- |
| `CQS-Q23-LOW-01` / `F-UX-01` | **OPEN / RETAINED / LOW** |
| `CQS-Q23-LOW-02` | **OPEN / LOW** — measured; retain; installed-PWA Chrome-tab caveat noted in C-3/LOW-02 context |

### Other

| ID | Status |
| --- | --- |
| `CQS-OD-066` | **UNRESOLVED** — non-blocking for Slice 23 classroom qualification |

## Continuation register (after D–I + owner evidence)

| # | Candidate | Disposition |
| --- | --- | --- |
| **C-1** | Teacher-facing host UI | **Fulfilled** for Slice 23 repair scope via PR #62 |
| **C-2** | Teacher quick start | **Fulfilled** for Slice 23 repair scope via PR #62 |
| **C-3** | Startup / launch / distribution | **OPEN** — required post-Slice-23 MVP continuation. Owner reached classroom qualification and reported he did **not** know how to start CQS without being given the deployed URL/instructions, then requested a conventional executable/application launch path: one-click desktop launch; no Terminal; Windows installer/`.exe`; macOS `.app`/`.dmg`; simple Host and audience Display startup; preserve local-first/offline; keep PWA/web as alternate. **Not implemented here.** |
| **C-4** | Aggregate reset | **Fulfilled** via PR #63 |
| **C-5** | Controller setup/polish | Remains **LOW** / future (`F-UX-01`) |
| **C-6** | Packaging/distribution | **OPEN** — cross-links the same desktop-packaging discovery as C-3; also retains `CLASS-B-01` SheetJS packaging concern |
| **C-7** | Raspberry Pi beta | Outside Slice 23 unless separately promoted |
| **C-8** | Cross-device LAN | Future direction |

## Explicit non-claims

- No product mutation (`src/**`, tests, lockfiles, workflows, assets).
- No unauthorized Class A repair.
- `LOW-01` / `F-UX-01` not silently repaired or promoted.
- Post-Slice-23 functionality **not** begun (including executable packaging).
- Slice 23 **not** terminal.
- OVERALL CQS MVP = **NOT COMPLETE**.
- Update-flow full live stale→new simulation **not** claimed performed.
- Evidence-PR CI is **not** classroom qualification.

## Files changed (evidence lane including owner completion)

1. `README.md`
2. `docs/STATUS.md`
3. `docs/handoff/CURRENT.md`
4. `docs/qualification/SLICE-23-QUALIFICATION-PLAN.md`
5. `docs/receipts/2026-08-12-slice-23-broad-d-i-qualification.md` (this file)

Docs-only. PR #65 remains **OPEN / UNMERGED** and is the qualification-evidence
PR for fresh independent exact-head review. **NOT merged** by this packet.
