# Slice 23 — Broad Stages D–I classroom-release qualification (resumption)

- **Date:** 2026-08-12
- **Slice:** `CQS-SLICE-23-CLASSROOM-RELEASE-QUALIFICATION`
- **Kind:** qualification / evidence capture / finding classification (**docs-only**)
- **Environment:** owner local Mac `Ricks-MacBook-Air.local` / `macdaddy`
- **Qualification worktree:** `/tmp/cqs-slice23-d-i-qual-es1` (detached at exact main)
- **Docs branch:** `docs/slice-23-broad-d-i-qualification`

## Identity

| Item | Value |
| --- | --- |
| Parent authorization | `AUTHORIZE-CQS-SLICE-23-CLASSROOM-RELEASE-QUALIFICATION-1` |
| Qualification-resumption authorization | `AUTHORIZE-CQS-SLICE-23-BROAD-STAGES-D-I-QUALIFICATION-RESUMPTION-1` |
| Evidence-state ID | `CQS-SLICE-23-BROAD-STAGES-D-I-QUALIFICATION-RESUMPTION-ES-1` |
| Exact canonical starting `origin/main` | `06f486c952bb40f03e376839b04a7b72bab6d0c3` |
| Current `origin/main` (end of executable work) | `06f486c952bb40f03e376839b04a7b72bab6d0c3` |
| Historical PR #60 | **CLOSED / UNMERGED / HISTORICAL / SUPERSEDED** (closed 2026-08-12T20:45:09Z; head `6a6d34430fc765e9a63fa9bd2eac073e6b4ef201`; `mergedAt` null) |
| PR #61 / #62 / #63 / #64 | **TERMINAL** |
| Slice 23 | **IN QUALIFICATION / NOT TERMINAL** |
| OVERALL CQS MVP | **NOT COMPLETE** |
| Primary verdict (this packet so far) | `CQS_S23_D_I_OWNER_EVIDENCE_REQUIRED` |

## Preflight

| Check | Result |
| --- | --- |
| `git fetch origin --prune` | pass |
| `git rev-parse origin/main` | `06f486c952bb40f03e376839b04a7b72bab6d0c3` |
| Source worktree `git status --short` | empty |
| Qualification worktree | clean detached HEAD at exact main |
| `hostname` / `whoami` / `pwd` | `Ricks-MacBook-Air.local` / `macdaddy` / repo root then `/tmp/cqs-slice23-d-i-qual-es1` |
| `node` / `npm` | `v26.0.0` / `11.12.1` |
| §71 | **CLEARED FOR QUALIFICATION RESUMPTION** (historical fire preserved) |
| Broad D–I previously claimed complete? | **No** |

## Evidence transfer table

| Source | Transfer disposition |
| --- | --- |
| PR #61 | **TRANSFER** — Final wager durability + immediate-refresh evidence |
| PR #62 | **TRANSFER** — teacher first-run / visible load path / quick-start |
| PR #63 | **TRANSFER** — aggregate local-data reset / M1 correction |
| PR #64 | **TRANSFER** — canonical evidence reconciliation only (now on main as `06f486c…`) |
| Slice 21 | **TRANSFER** — Sony supported-profile physical evidence where causally unrelated to later repairs; do **not** reopen four-controller gate |
| Slice 22 | **TRANSFER** — owner-listened presentation-audio evidence (no `src/audio` product change after `#58` squash `e69e81b…` through `06f486c…`) |
| CI on `06f486c…` | **TRANSFER / CURRENT** — run [`31618313458`](https://github.com/ricktron/classroom-quiz-show/actions/runs/31618313458) **success** (lint/typecheck/unit/build + Playwright) |
| Pages deploy on `06f486c…` | **TRANSFER / CURRENT** — run [`31618313446`](https://github.com/ricktron/classroom-quiz-show/actions/runs/31618313446) **success**; URL `https://ricktron.github.io/classroom-quiz-show/`; `Last-Modified: Wed, 12 Aug 2026 16:35:50 GMT` |
| Historical PR #60 defects / old §71 blocking / old Final durability failure / old absence-of-reset | **HISTORICAL ONLY** — not current product failures |

## Baseline automated safety (this packet)

| Command | First result | Exit |
| --- | --- | --- |
| `npm ci` | 549 packages | 0 |
| `git diff --check` | clean | 0 |
| `npm run verify` | **143** files / **2424** passed / **2** skipped | 0 |
| `npm run build` | PASS; main JS **1256.80 kB** (gzip **375.32 kB**); PWA precache **22** entries (**1466.29 KiB**) | 0 |
| `CI=1 npm run test:e2e` (local first attempt) | **345** passed / **14** skipped / **4** failed / **2** flaky / **16** did not run — failures were `net::ERR_CONNECTION_REFUSED` after preview died mid-run (**harness**, not product Class A) | recorded; do not treat as product defect |
| CI Playwright on exact head `06f486c…` | **success** (job Playwright e2e) | supporting current baseline |
| Focused local (reuse preview): `theme-system.spec.ts` desktop-1080p | **9** passed | 0 |
| Focused local: Final tie e2e | **1** passed (`a tied Final presents both choices…`) | 0 |

Automated baseline is **supporting** evidence. It does **not** substitute for D–I classroom qualification.

## Stage D — Import / authoring / pack / data lifecycle

**Overall: PASS** (executable gates)

| Subgate | Disposition | Evidence class |
| --- | --- | --- |
| D clean-teacher → playable | **PASS** | CLEAN-BROWSER — Open Host → Load category-board sample → `cbh-grid` without hidden init |
| D GameDefinition import | **PASS** | CLEAN-BROWSER |
| D invalid import | **PASS** | CLEAN-BROWSER — unregistered round type fails closed; no load |
| D malformed / no misleading playable | **PASS** | CLEAN-BROWSER — duplicate tile id rejected |
| D authoring | **PASS** | CLEAN-BROWSER — spreadsheet authoring + template download affordance |
| D pack export | **PASS** | CLEAN-BROWSER — `.cqs-pack` download (`pack-export-download`) |
| D clean-profile pack import | **PASS** | CLEAN-BROWSER — fresh context re-import succeeded |
| D media valid | **PASS** | CLEAN-BROWSER (+ media-contract e2e transfer) |
| D media failure | **PASS** | CLEAN-BROWSER — missing image path; host still operable at prompt |
| D persistence | **PASS** | CLEAN-BROWSER — save definition |
| D aggregate reset | **PASS** | CLEAN-BROWSER — clear-all → clean library / first-run host |
| D retention/deletion docs | **PASS** | docs — `QUICK_START.md` states reset does **not** uninstall PWA / clear HTTP cache |

## Stage E — Broad gameplay / Final / undo / recovery

**Overall: PASS** (executable gates; no new material Class A)

| Subgate | Disposition | Evidence class |
| --- | --- | --- |
| E standard full-game | **PASS** | CLEAN-BROWSER — tile → prompt → score → answer → return |
| E score matrix | **PASS** | CLEAN-BROWSER — positive award; signed scores supported; theme stress e2e covers negatives |
| E team-count matrix | **PASS** | AUTOMATED E2E transfer (audience-display 1/4/6/8) + local 2-team play |
| E long-name matrix | **PASS** | AUTOMATED E2E transfer (40-char authored max); schema rejects >40 (not a defect) |
| E buzz / early-buzz / queue | **PASS** | AUTOMATED E2E transfer (`buzz-in.spec`) + local keyboard attempt |
| E undo / correction | **PASS** | CLEAN-BROWSER — `tsp-undo-score` while answer open |
| E mid-game refresh/recovery | **PASS** | CLEAN-BROWSER — Resume restored `cbh-grid` |
| E Final complete flow | **PASS** | CLEAN-BROWSER — max legal wager / lock / response / reveal / settle |
| E immediate-refresh Final durability | **PASS** | CLEAN-BROWSER — `Saved: 0` survived immediate reload + Resume (PR #61 non-regression) |
| E tie | **PASS** | AUTOMATED E2E — Final accept-tie flow green on repaired tree |
| E completed summary | **PASS** | CLEAN-BROWSER — summary / ledger headings after Final |
| E comparison / history | **PASS** | AUTOMATED + host panel visibility |

## Stage F — Presentation / accessibility / themes / screen reader

**Overall: OWNER EVIDENCE REQUIRED** (screen reader still owed; other executable gates PASS)

| Subgate | Disposition | Evidence class |
| --- | --- | --- |
| F keyboard-only | **PASS** | CLEAN-BROWSER — Tab focus visible; keyboard load; reset dialog cancel |
| F semantic accessibility | **PASS** | ACCESSIBILITY / AUTOMATED — theme-system contrast + role/label spot checks |
| F **actual screen reader** | **OWNER EVIDENCE REQUIRED** | SCREEN-READER — VoiceOver **not** executed in this packet |
| F high-contrast | **PASS** | AUTOMATED E2E theme-system (9/9) + host selector |
| F reduced motion | **PASS** | AUTOMATED E2E + `emulateMedia(reduce)` |
| F grayscale / color independence | **PASS** | CLEAN-BROWSER — text/position cues under grayscale filter |
| F 1080p | **PASS** | CLEAN-BROWSER viewport 1920×1080 |
| F 720p | **PASS** | CLEAN-BROWSER viewport 1280×720 |

## Stage G — Physical projector / viewing distance / audio

**Overall: OWNER EVIDENCE REQUIRED** — `CQS_S23_STAGE_G_OWNER_EVIDENCE_REQUIRED`

Browser viewport simulation does **not** satisfy Stage G. Slice 22 owner-listened audio **transfers** for cue content where audio code is unchanged; release-setup routing still needs owner confirmation on the actual classroom/presentation path.

## Stage H — Supported Sony profile

**Overall: OWNER EVIDENCE REQUIRED** (current hardware smoke) with **transferred** Slice 21 physical evidence for causally unchanged facts.

| Item | Disposition |
| --- | --- |
| Hardware available this session | **Not exercised in this packet** |
| Supported profile / slot / button / mapping / reset / disconnect / reconnect | **OWED** as current release smoke |
| Four-controller historical absence | **Not** a new defect |
| `F-UX-01` / `CQS-Q23-LOW-01` | **OPEN / RETAINED / LOW** — not silently repaired or promoted |

## Stage I — Deployment / PWA / update / offline / reset

**Overall: OWNER EVIDENCE REQUIRED** (install + owner-live; update simulation limited)

| Subgate | Disposition | Notes |
| --- | --- | --- |
| Deployment URL | `https://ricktron.github.io/classroom-quiz-show/` | from README + Pages API |
| Deployed commit / provenance | **PASS (strong)** | Pages + CI runs on head `06f486c…`; `Last-Modified` aligns with deploy |
| Clean deployed golden path | **PASS** | CLEAN-BROWSER vs Pages — Open Host → load sample |
| PWA manifest / SW | **PASS** (supporting) | manifest OK; SW active after ready |
| PWA install UI | **OWNER EVIDENCE REQUIRED** | install affordance needs owner browser |
| Offline shell | **PASS** | offline reload still showed host shell |
| Offline gameplay / local-data | **PASS** (supporting) | host available offline after prior load; grid may require Resume |
| SheetJS / `CLASS-B-01` | **RETAIN CLASS-B** | deployed template download works; no current promised release failure; supply-chain/install risk remains |
| Update flow | **OWNER_OR_MANUAL / evidence owed** | only one live build; cannot safely simulate stale→new without publishing |
| Deployed/PWA reset | **PASS** | aggregate clear-all on Pages |
| `LOW-02` startup measure | **RETAIN LOW** | main JS transfer ≈ **378 420** bytes (~370 KiB gzip) on owner Mac; load ≈ **400 ms**; not reclassified; **not optimized** |
| Owner live deployment | **OWNER EVIDENCE REQUIRED** | automated path PASS; classroom sense observation owed |

## Findings

### Class A

**None newly reproduced** in this resumption packet.

### Class B

| ID | Status |
| --- | --- |
| `CQS-Q23-CLASS-B-01` | **OPEN** — non-registry SheetJS distribution/CDN dependency risk; live probe did **not** promote to Class A |

### LOW

| ID | Status |
| --- | --- |
| `CQS-Q23-LOW-01` / `F-UX-01` | **OPEN / RETAINED / LOW** |
| `CQS-Q23-LOW-02` | **OPEN / LOW** — measured; retain |

### Other

| ID | Status |
| --- | --- |
| `CQS-OD-066` | **UNRESOLVED** — non-blocking for Slice 23 classroom qualification |

## Continuation register (after D–I executable work)

| # | Candidate | Disposition |
| --- | --- | --- |
| C-1 | Teacher-facing host UI | Fulfilled for Slice 23 defect by PR #62 |
| C-2 | Teacher quick start | Fulfilled for repair scope by PR #62 |
| C-3 | Startup / launch / distribution | Still needs owner deploy/PWA confirmation; may feed post-Slice-23 continuation |
| C-4 | Aggregate reset | Fulfilled by PR #63 |
| CLASS-B-01 | SheetJS packaging | Open Class B continuation |
| LOW-01 / F-UX-01 | Sony pairing friction | Open LOW |
| LOW-02 | First-load JS size | Open LOW (measured) |

## Explicit non-claims

- No product mutation (`src/**`, tests, lockfiles, workflows, assets).
- No unauthorized Class A repair.
- `LOW-01` / `F-UX-01` not silently repaired or promoted.
- Post-Slice-23 functionality **not** begun.
- Slice 23 **not** terminal.
- OVERALL CQS MVP = **NOT COMPLETE**.
- Stage G physical projector **not** claimed complete.
- Screen-reader **not** claimed PASS.
- Current Sony hardware smoke **not** fabricated PASS.

## Owner evidence still owed

See the compact owner checklist returned with verdict
`CQS_S23_D_I_OWNER_EVIDENCE_REQUIRED` (Stages F screen reader, G physical, H Sony
smoke, I install + owner-live; update-flow note).

## Files changed (this evidence lane)

1. `README.md`
2. `docs/STATUS.md`
3. `docs/handoff/CURRENT.md`
4. `docs/qualification/SLICE-23-QUALIFICATION-PLAN.md`
5. `docs/receipts/2026-08-12-slice-23-broad-d-i-qualification.md` (this file)

Docs-only. **Evidence PR not opened yet** while owner gates are being requested in
this run.
