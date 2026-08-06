# Slice 18 — Audience Display System — Local Verification Receipt

**Authorization:** `AUTHORIZE-CQS-SLICE-18-AUDIENCE-DISPLAY-IMPLEMENTATION-1`  
**Evidence-state lineage:**

```text
CQS-SLICE-18-AUDIENCE-DISPLAY-IMPLEMENTATION-ES-1
CQS-SLICE-18-AUDIENCE-DISPLAY-DISCOVERY-ES-1
CQS-SLICE-18-AUDIENCE-DISPLAY-DELIVERY-ES-1
```

**Repository:** `ricktron/classroom-quiz-show`  
**Exact authorized base:** `6e29121d850cf4b4a4ba366c706225f208166f93`  
**Branch:** `feat/slice-18-audience-display`  
**Host:** `Ricks-MacBook-Air.local`  
**User:** `macdaddy`  
**Local time (start):** `Wed Aug 5 22:37:55 CDT 2026`  
**UTC time (start):** `Thu Aug 6 03:37:55 UTC 2026`  
**Local time (receipt):** `Wed Aug 5 22:59:57 CDT 2026`  
**UTC time (receipt):** `Thu Aug 6 03:59:57 UTC 2026`

## Source-of-truth documents used

1. Observed merged code / tests / Git at exact base `6e29121…`
2. `AGENTS.md`
3. `docs/PROJECT.md`
4. `docs/STATUS.md`
5. Accepted ADRs (display/public-state / Final / theme boundaries as referenced)
6. `docs/plans/MVP-ARC.md`
7. `docs/plans/CQS-DESIGN-PHASE-2B-DIRECTION.md`
8. `docs/plans/CQS-PHASE-3-DESIGN-SYSTEM-READINESS.md`
9. `docs/handoff/CURRENT.md`
10. This authorization contract

External discovery canvas artifacts were treated as noncanonical and were not copied into the repository.

## Initial hard-stop results

| Gate | Result |
| --- | --- |
| `origin/main` == `6e29121d850cf4b4a4ba366c706225f208166f93` | Pass |
| Proposed branch absent locally/remotely | Pass |
| Open competing PRs | None |
| Working tree clean | Pass |
| Slice 17 Complete; public wire 8; sync 2 | Pass (observed) |
| No required wire/dependency/ADR change | Pass |
| Branch created exactly from authorized commit | Pass |

## Wire-8 sufficiency statement

Implementation uses **public-state wire 8 without modification** and sync envelope **2** without modification. Discovery conclusion `PUBLIC WIRE 8 SUFFICIENT` / `READY FOR PUBLIC-WIRE-8 IMPLEMENTATION` holds: the presentation selector and shell consume only sanitized public DTOs already on the wire.

## Exact changed paths

| Path | Why necessary |
| --- | --- |
| `src/routes/DisplayRoute.tsx` | Compose audience shell from `usePublicState` |
| `src/routes/DisplayRoute.css` | Thin route wrapper; composition CSS moved to shell |
| `src/routes/DisplayRoute.test.tsx` | Route composition fail-closed coverage |
| `src/display/CategoryBoardDisplay.tsx` | Cleared-category + depletion presentation from visible tiles |
| `src/display/CategoryBoardDisplay.css` | Cleared / depletion styles via theme tokens |
| `src/display/TeamScoreboard.tsx` | Optional adaptive `layout` prop |
| `src/display/TeamScoreboard.css` | Column / strip / deck layout + long-name wrapping |
| `src/display/audience/selectAudiencePresentation.ts` | Pure public-DTO presentation selector |
| `src/display/audience/selectAudiencePresentation.test.ts` | Exhaustive selector unit coverage |
| `src/display/audience/AudienceDisplayShell.tsx` | Spatial projector composition |
| `src/display/audience/AudienceDisplayShell.css` | Board-first layout, Nexus, rails, score modes |
| `src/display/audience/AudienceDisplayShell.test.tsx` | Shell privacy / layout / Final coverage |
| `src/display/audience/NexusCore.tsx` | Persistent public-safe status region |
| `src/display/audience/NexusCore.test.tsx` | Nexus public-fact coverage |
| `src/display/audience/ScoreLayout.tsx` | Column / strip / deck selection |
| `src/display/audience/ScoreLayout.test.tsx` | Order, long names, signed scores |
| `src/display/audience/SignalRail.tsx` | Compact / Expanded / Final rails |
| `src/display/audience/SignalRail.test.tsx` | Rail privacy coverage |
| `tests/e2e/audience-display.spec.ts` | Targeted viewport / scene / privacy e2e |
| `docs/receipts/2026-08-06-slice-18-audience-display-local-verification.md` | This immutable receipt |

Prohibited paths (`src/state`, `src/sync`, `src/theme`, `package.json`, mutable status docs, etc.) were verified unchanged via `git diff --exit-code` against the authorized base.

## Architecture summary

- **Selector:** `selectAudiencePresentation(PublicState)` returns serializable scene, Nexus labels, score layout, Signal Rail mode, living-board depletion (board stage only), Final unique-leader/tied classification, and emphasis hints. Exhaustive stage switches; no private imports; no store; no semantic board cache.
- **Shell:** `AudienceDisplayShell` owns spatial composition and reuses existing leaf renderers.
- **Leaves reused:** `CategoryBoardDisplay`, `FinalWagerDisplay`, `TeamScoreboard`, `ResponseTimerDisplay`, `BuzzQueueDisplay`, `MediaContentDisplay`.
- **Themes:** Slice 17 tokens consumed unchanged (`default`, `high-contrast`).

## Complete display-state matrix

| Public state | Scene | Nexus Core | Score layout | Signal Rail | Primary content | Public derivation | Privacy exclusions | Tests |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| no session / INITIAL | waiting | Display waiting | none | hidden | status | phase | no private fields | shell, route, e2e |
| ready | ready | Ready | by team count | compact* | status | phase + game | no titles/types | selector |
| waiting phase | waiting | Display waiting | by team count | compact* | status | phase | same | selector |
| active game + board | board | Board open + round N of M | column/strip/deck | compact* / expanded | board | categories/tiles | no ownership/correctness | selector, shell, e2e |
| selected | quiet-cognition | Selected | by count | compact*/expanded | selection + lattice | selection only | no board reconstruct | selector, shell, e2e |
| prompt | quiet-cognition | Question | by count | compact*/expanded | selection + lattice | prompt DTO | no board | selector, shell, e2e |
| answer | answer | Answer | by count | compact* | selection + lattice | answer when public | no board | selector, e2e |
| Final setup | final | Final ready | by count | final | Final leaf | stage | no eligibility/caps | selector, e2e |
| wager-entry | final | Final wager | by count | final | Final + timer | timer public | no wagers | selector |
| wagers-locked | final | Wagers locked | by count | final | Final | stage | no wagers | selector, rail |
| response-entry | final | Final response | by count | final | prompt + timer | prompt public | no responses | selector, e2e |
| responses-locked | final | Responses locked | by count | final | prompt | prompt | no responses | selector |
| answer-revealed | final | Final answer | by count | final | prompt+answer | answer public | no unrevealed | selector |
| team-reveal | final | Team reveal | by count | final | reveal panel | reveal DTO | only revealed team | selector, e2e |
| resolution | final | Final settlement | by count | final | outcome | outcome + scores | no fabricated winner | selector |
| sudden-death | final | Sudden death | by count | final | neutral | stage | no private reason | selector |
| complete unique-leader | complete | Game complete | by count | final | unique-leader label | scores max | null leader if inconsistent | selector, shell, e2e |
| complete tied | complete | Game complete | by count | final | Tied | outcome tied | never invent winner | selector, shell, e2e |
| game ended, no round | complete | Game complete | by count | compact* | status | game.status | — | selector |
| round unavailable | unavailable | This round is not available yet | by count | compact* | status | roundAvailability | no type name | selector, shell, e2e |
| teams unavailable | (scene from round/phase) | — | none | — | — | teams.status | Scores unavailable leaf | selector |
| teams null | (scene from round/phase) | — | none | — | — | teams null | no scoreboard | selector |
| response absent | — | — | — | no `display-response` | — | response null | — | e2e timers/buzz |
| response present / buzz active | — | — | — | expanded | active name + count | buzz DTO | no queue order/ids | selector, rail, e2e |
| buzz none / exhausted | — | — | — | compact/expanded | public words | buzz status | no device/order | rail |
| timer idle/running/paused/expired/interrupted | — | stage labels | — | via ResponseTimerDisplay | status words | timer DTO | no timer id/source | leaf reuse |
| fail-closed / incompatible | waiting retained by receiver | Display waiting | none | hidden | status | receiver last-safe | no stack/raw payload | route/sync inherited |
| stale snapshot | retained prior safe | prior | prior | prior | prior | sync revision rule | unchanged sync | sync inherited |

\*Compact Signal Rail without a response DTO renders without `data-testid="display-response"` to preserve pre-Slice-18 timer/buzz e2e contracts.

## Privacy omissions (display never receives / never infers)

Game/class title; teacher identity; queue order; waiting-team identities; next-up; private Final eligibility; unrevealed wagers/responses; wager caps; reveal order; tile correctness/ownership; respondent history; tile score-delta history; host notes; private calculations; internal round IDs/types.

## Public-state-only proof

- Production audience modules import only `publicState` types/constants and display leaves.
- No imports of `privateState`, `sanitize`, `commands`, `events`, `reducer`, `store`, or host modules in `src/display/audience/**` production files.
- Grep over audience production paths found no private-state / sanitizer / command imports.

## Version invariants (unchanged)

| Contract | Value |
| --- | --- |
| `PUBLIC_STATE_SCHEMA_VERSION` | **8** |
| `SYNC_SCHEMA_VERSION` | **2** |
| Canonical game schema (`SUPPORTED_SCHEMA_VERSION`) | **1** |
| `GAME_DEFINITION_MODEL_VERSION` | **1** |
| `PERSISTENCE_WIRE_VERSION` (private active-session wire) | **1** |
| `PERSISTENCE_DB_VERSION` (IndexedDB) | **2** |
| Session Summary contract | **1** |
| Completed-summary envelope | **1** |
| Competitive profile | **1** |

No command/event/reducer/replay/scoring/timer-authority/buzz-authority/Final-authority/persistence/import/export/package changes.

## Score / Nexus / Rail behavior

- **Column (1–4):** left grid column; authored order top→bottom; full names; signed negatives; no ranking.
- **Strip (5–6):** bottom; authored order left→right; no ranking.
- **Deck (7–8):** CSS 4×2 grid; authored row-major; verified at 1280×720.
- **Nexus Core:** brand, public round ordinal, stage label, optional detail; no private titles/types.
- **Compact / Expanded / Final rails:** as contract; Expanded uses `ResponseTimerDisplay` + `BuzzQueueDisplay`; Final replaces buzz semantics.

## Quiet cognition / living board / Final / fail-closed

- Quiet scenes use generic decorative lattice only; `boardDepletion` is null outside public `board` stage; no React cache of prior board DTO.
- Cleared category iff every visible tile in that category is `used`; depletion counts match visible tiles.
- Unique-leader emphasis requires a single public score maximum; otherwise neutral unique-leader copy. Tied never invents a winner.
- Fail-closed: neutral copy; no stack traces; no schema numbers in student copy; receiver last-safe behavior unchanged.

## Theme and reduced-motion

- Consumes Slice 17 tokens; both themes exercised in e2e.
- Emphasis animations gated under `prefers-reduced-motion: no-preference`; semantic labels remain without motion.
- Did not modify `src/theme/**`, `themes.css`, `global.css`, or `ThemeProvider.tsx`.

## Responsive and stress results

Exercised via unit + Playwright: team counts 1/4/5/6/7/8; 40-char names; large ± scores; duplicate accents; authored≠score order; image prompt missing caption/attribution; active response + waiting count; high-contrast; reduced motion; 1920×1080 and 1280×720; Score Deck 4×2 computed style at 720p.

## Focused test results

- Audience unit/component suites: **passed** (selector, Nexus, ScoreLayout, SignalRail, shell, DisplayRoute).
- Full unit suite via `npm run verify`: **2115 passed**, **1 skipped**, **0 failed**.
- Lint: **0 errors**; 3 inherited `ThemeProvider.tsx` react-refresh warnings (untouched).
- Typecheck: **passed**.
- `git diff --check`: **passed**.

## Full verification results

| Check | Result |
| --- | --- |
| `git diff --check` | passed |
| `npm run verify` | passed (lint warnings inherited ×3; tests 2115 passed / 1 skipped) |
| `npm run verify:all` | **failed once** on inherited Final mid-refresh flake (see below); all other e2e green including new audience-display |
| Audience Playwright (1080p+720p) | **10 passed**, **4 skipped** (viewport-gated), **0 failed** |

### Playwright totals (`npm run verify:all` local run)

- **310 passed**
- **13 skipped**
- **3 did not run** (suite aborted after failure ordering)
- **1 failed** — inherited Final mid-refresh signature on `mobile-host`
- Retries (local config): **0**

### Known flake handling

First failure preserved:

```text
tests/e2e/final-wager.spec.ts
a refresh mid-Final resumes every committed wager
Expected: Saved: 100
Received: Not saved yet
```

Single intentional retry on `mobile-host` reproduced the **same signature**. Not claimed fixed. Not Slice 18 causal (host persistence/recovery path; no Final-authority or persistence changes in this PR).

### Inherited / environmental items preserved separately

- Five existing audit findings (unchanged)
- Deprecated `glob@11.1.0`
- Node action-runtime warnings (CI)
- Vite large-chunk warning (observed on build)
- Three Slice 17 `ThemeProvider.tsx` lint warnings
- Inherited Final mid-refresh flake

## Errors and environmental events

1. Initial e2e audience injection used an illegal absolute media path → public guard rejected snapshot (fail-closed waiting). Fixed fixture path to same-origin grammar.
2. Several pre-existing e2e contracts required restoring `display-game` always-on, large waiting headline, unavailable copy wording, and `display-response` only when `response !== null`. Fixed in shell without wire changes.
3. Inherited Final flake during `verify:all` (documented above).

## What went well

- Wire-8-only selector kept privacy and authority boundaries clean.
- Reusing tested leaves avoided duplicating timer/buzz/Final/media logic.
- Exhaustive stage mapping caught presentation gaps early.

## What went poorly

- Compatibility with pre-Slice-18 e2e testids/`display-response` absence rules required careful shell adjustments after the first full e2e run.
- `verify:all` still surfaces the inherited Final refresh flake under local zero-retry config.

## Challenges and resolutions

| Challenge | Resolution |
| --- | --- |
| Quiet cognition without board DTO | Decorative lattice only; no cache |
| Score layouts vs legacy scoreboard | Optional `layout` prop + CSS grid/flex modes |
| Existing e2e contracts | Preserve `display-game`, headline size, response testid rules |
| Unique-leader inconsistency | Null leader fields; neutral copy |

## Introduced technical debt

- Compact rail without a response DTO omits `data-testid="display-response"` for legacy e2e compatibility while still rendering a compact rail for board-open readiness.
- Score-change historical delta animation omitted (no public delta / no prior snapshot retention) — static scores only.

## Inherited limitations

- Final mid-refresh recovery flake (`Saved: 100` / `Not saved yet`)
- No physical projector / WCAG / Section 508 / classroom-release qualification claimed
- `CQS-OD-066` unresolved (out of scope)

## Guidance friction

- Allowlist correctly excluded mutable status docs; receipt-only documentation worked.
- Pre-Slice-18 e2e contracts on testids are load-bearing and should be named as compatibility surfaces in future display authorizations.

## Proposed guidance deltas

1. Document `display-response` / `display-game` / waiting-headline size as stable projector contracts when authorizing display composition changes.
2. Note that local `verify:all` (retries=0) may fail on the known Final flake while CI (retries=2) may green the same suite.

## Explicit non-performance

- No merge
- No auto-merge enablement
- No branch/worktree deletion
- No post-merge reconciliation
- No Slice 19–22 work
- No wire/schema/sync/theme/package changes
- No Final flake repair
- Slice 18 **not** marked Complete in mutable status docs

## Merge / reconciliation

**Unauthorized.** This delivery stops at a review-ready PR. Merge and post-merge reconciliation require separate authority.

## PR identity

_Appended after PR creation._
