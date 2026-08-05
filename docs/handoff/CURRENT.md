# Handoff — Current

This is the entry point for the next contributor or coding agent. It reflects
the repository with **Slices 1–16 all product-`Complete` and merged to `main`**,
and **Slice 16 post-merge reconciliation in review** on
`docs/slice-16-post-merge-reconciliation`.
**Slice 16 — Completed Summary Ledger & Compatible Reporting is `Complete`**
(PR [#40](https://github.com/ricktron/classroom-quiz-show/pull/40) squash-merged
at `bc3cea65cab8db1481b0b2420be580cc69932f3d` from reviewed-and-repaired head
`942575c97b97df220c215a7d265736a797869157`, merged **2026-08-05T04:38:20Z**,
post-merge CI, Pages, and Sonar green — see
[`../architecture/ADR-016-completed-summary-ledger-compatible-reporting.md`](../architecture/ADR-016-completed-summary-ledger-compatible-reporting.md),
[`../receipts/2026-08-04-slice-16-local-verification.md`](../receipts/2026-08-04-slice-16-local-verification.md),
and
[`../receipts/2026-08-04-slice-16-semantic-review-r1.md`](../receipts/2026-08-04-slice-16-semantic-review-r1.md)).
**PR #40 requires no further review or merge action.**
**Slice 15 — Session Summary Contract is `Complete`** (PR
[#38](https://github.com/ricktron/classroom-quiz-show/pull/38) squash-merged at
`242539044e45a43eacc6d8334349e59a6987a3d9` — see
[`../architecture/ADR-015-session-summary-contract.md`](../architecture/ADR-015-session-summary-contract.md)
and
[`../receipts/2026-08-04-slice-15-post-merge-reconciliation.md`](../receipts/2026-08-04-slice-15-post-merge-reconciliation.md)).
**PR #38 requires no further review or merge action.**
**Slice 14 — Final-wager round is `Complete`** (PR
[#32](https://github.com/ricktron/classroom-quiz-show/pull/32) squash-merged at
`ce2e103377c5d86c8e0946346cb4cf05dfe7d58d` — see
[`../architecture/ADR-014-final-wager-round.md`](../architecture/ADR-014-final-wager-round.md)
and
[`../receipts/2026-08-03-slice-14-post-merge-reconciliation.md`](../receipts/2026-08-03-slice-14-post-merge-reconciliation.md)).
**Slice 13 — Local persistence & recovery is `Complete`** (PR #27
squash-merged at `6cf4d2579ab558f8c4b7eabca0b94df4acc6f20c` — see
[`../architecture/ADR-013-local-persistence-recovery.md`](../architecture/ADR-013-local-persistence-recovery.md)
and
[`../STATUS.md`](../STATUS.md)).
**Slices 17–22 remain `Planned` and unauthorized** under the **22-slice** MVP
plan amended by
[`../decisions/ROADMAP-AMENDMENT-003-remaining-mvp-rebalance.md`](../decisions/ROADMAP-AMENDMENT-003-remaining-mvp-rebalance.md)
(`CQS-PLAN-S02`, documentation-only; delivery **merged** via PR #35 at
`2ebeb24099d5f63ccd3247ffb8e8744f89c039bc`; post-merge reconciliation
**merged** via PR #36 at `da6b4dc3080abf9a8effe142e19a4eb36aa6ad8d`).
**Recommended next action:** independent review of the open Slice 16
documentation-only post-merge reconciliation PR, then separate exact-head
squash-merge authority for that reconciliation. **STOP BEFORE MERGE.** Do not
begin Slice 17 readiness or implementation, Phase 3, or post-MVP work from this
handoff alone. `CQS-OD-066` remains unresolved.

Coding agents and contributors should read root
[`../../AGENTS.md`](../../AGENTS.md) before changing the repository. Claude
sessions may start at pointer-only [`../../CLAUDE.md`](../../CLAUDE.md), which
defers to `AGENTS.md` and adds no separate authority.

> **CQS authority.** This repository remains the single source of
> implementation truth for Classroom Quiz Show. NightWatch, Notion, Obsidian,
> chat, and other external summaries may route or summarize work but grant no
> authority over CQS product scope, implementation, architecture, tests,
> deployment, or status.

> **Repository hygiene (2026-07-27).** `main` is the GitHub **default branch**.
> **PR #17 was closed without merging** — an erroneous *reversed* pull request
> (head `main`, base `claude/classroom-quiz-show-slice-1-a6ogu4`) created only
> because the abandoned Slice 1 branch was still the configured default. That
> abandoned branch has been **deleted**. Do not assert the current number of
> remote branches from this historical note. No further action is needed on that
> abandoned Slice 1 branch, and no new pull request involving it may be created.

> **Roadmap amended 2026-07-26, and that amendment is MERGED.** The owner
> authorized a planning-only amendment,
> [`../decisions/ROADMAP-AMENDMENT-001-local-buzzers.md`](../decisions/ROADMAP-AMENDMENT-001-local-buzzers.md):
> **local host-attached USB buzzers** (Sony Buzz! preferred initial target) are an
> approved future capability, the MVP non-goal excluding "student devices/buzzers"
> was **narrowed** rather than removed, Slice 7 was re-scoped so its interrupt
> seam is buzz-aware, the media contract moved ahead of any new round type, and
> the plan went from **11 to 18 slices**. Read that document before planning any
> work. It changed **documentation only** — no runtime code, schema, test,
> workflow or dependency. It **merged to `main` via PR #13** (merge commit
> `752a3fe0f45fdc1ee687339134023c3811facd91`, merged 2026-07-26T20:02:13Z by
> `ricktron`; reviewed head `2524e745`) with all three PR checks green. Its
> historical receipt is preserved unchanged.

> **Roadmap amended again 2026-08-03 by Amendment 003 (`CQS-PLAN-S02`), and
> that amendment is MERGED.** The remaining unstarted Slices 15–18 were
> replaced by Slices 15–22. Slices 1–14 are unchanged and `Complete`. Canonical
> decision:
> [`../decisions/ROADMAP-AMENDMENT-003-remaining-mvp-rebalance.md`](../decisions/ROADMAP-AMENDMENT-003-remaining-mvp-rebalance.md).
> Delivery squash-merged via
> [PR #35](https://github.com/ricktron/classroom-quiz-show/pull/35) at
> `2ebeb24099d5f63ccd3247ffb8e8744f89c039bc` (merged **2026-08-04T03:41:30Z**)
> from reviewed head `c637b979fa6e575c28dd6eb73dfbd52a76e93d35`.
> Post-merge reconciliation squash-merged via
> [PR #36](https://github.com/ricktron/classroom-quiz-show/pull/36) at
> `da6b4dc3080abf9a8effe142e19a4eb36aa6ad8d` (merged **2026-08-04T14:03:30Z**)
> from reviewed head `2457d6c0d27976855a0d247554730ec2f0efe899`.
> **Documentation only — no product implementation authorized.** CQS-PLAN-S02
> delivery and post-merge reconciliation are complete on `main`; PR #36
> requires no further review or merge action. Slice 15 is `Complete` on `main`
> (PR #38). Slice 16 — Completed Summary Ledger & Compatible Reporting is
> **`Complete`** on `main` via PR
> [#40](https://github.com/ricktron/classroom-quiz-show/pull/40) at
> `bc3cea65cab8db1481b0b2420be580cc69932f3d`. **PR #40 requires no further
> review or merge action.** Phase 3 remains unauthorized. Slices 17–22 remain
> unauthorized. Post-MVP arcs remain inactive. `CQS-OD-066` remains unresolved.

## Repository state

- **Repository:** `ricktron/classroom-quiz-show` (standalone; single source of
  implementation truth).
- **Slice 1:** merged to `main` (PR #1, merge commit `e0bfb14`), deployed,
  owner-accepted.
- **Slice 2:** **Complete.** Merged to `main` via **PR #3** (merge commit
  `883111e`) with CI green; reconciliation PR #4 (merge commit `61e1a29`).
- **Slice 3:** **Complete.** Delivered on
  `claude/slice-3-game-round-registry-yjzexz`, based on `main` at
  `61e1a29548e8735886c3637e5c2e521ff6ee6db4` (after the merged Slice 2
  reconciliation, PR #4). Original implementation commit `7ac2466`; final reviewed
  head `464ef07`. Merged to `main` via **PR #5** (merge commit `01070c8`, merged
  2026-07-23T19:18:32Z) with CI green (build + e2e success, SonarCloud Quality
  Gate passed, 0 security hotspots). Post-merge reconciliation recorded in
  [`../receipts/2026-07-23-slice-3-post-merge-reconciliation.md`](../receipts/2026-07-23-slice-3-post-merge-reconciliation.md).
- **Slice 4:** **Complete.** Delivered on
  `claude/slice-4-validation-import-pynvab`, based on `main` at
  `349bff72f471c798df8a902a6a3c4c3eae2e17a5` (after the merged Slice 3
  reconciliation, PR #6). Implementation commit `d08f140`; docs commit
  `b44b585`; final reviewed head `8ce850c` (accessor/TOCTOU repair found in
  review). Merged to `main` via **PR #7** (merge commit `5295e83`, merged
  2026-07-25T20:14:42Z). Post-merge CI on `main` green (both jobs success) and
  the Pages deployment succeeded. Post-merge reconciliation recorded in
  [`../receipts/2026-07-25-slice-4-post-merge-reconciliation.md`](../receipts/2026-07-25-slice-4-post-merge-reconciliation.md).
  **Note:** the owner merged before **Playwright e2e** concluded on the PR head
  (it concluded success ~23 s later); SonarCloud and the lint/typecheck/unit/
  build job had already reported success. See the receipt for the exact timeline.
- **Slice 5:** **Complete.** Delivered on
  `claude/slice-5-category-board-6gfxnq`, based on `main` at
  `0dacd3501fb10ce1272386f56bf15a2956ee8c6d` (the merge commit of PR #8, the
  Slice 4 post-merge reconciliation). Implementation commit `f8c4517`; two
  follow-up documentation commits `93e2ce9` and `5e6994e` (the final reviewed
  head). Merged to `main` via **PR #9** (merge commit
  `2ec69323c203a989b06610e6506475e875a40e45`, merged 2026-07-26T05:02:33Z) with
  all three PR checks green. Post-merge CI on `main` at `2ec6932` concluded
  success for both jobs and the Pages deployment succeeded. Post-merge
  reconciliation recorded in
  [`../receipts/2026-07-26-slice-5-post-merge-reconciliation.md`](../receipts/2026-07-26-slice-5-post-merge-reconciliation.md).
- **Slice 6:** **Complete.** Owner-authorized and delivered on
  `claude/slice-6-teams-and-scoring-we53wr`, based on `main` at
  `5237a1f9f6b451c2137330fd0a7f4613b7a919f2` (the merge commit of PR #10, the
  Slice 5 post-merge reconciliation). Implementation commit `7734065`; final
  reviewed head `48ed8180278b6966080be6ce00a0e3b06ca3abf1`. Merged to `main` via
  **[PR #11](https://github.com/ricktron/classroom-quiz-show/pull/11)** (merge
  commit `67180a3a24b43124ce7a2dee91d02fe1f797618e`, merged 2026-07-26T15:58:11Z
  by `ricktron`) with all three PR checks green. Post-merge CI on `main` at
  `67180a3` concluded success for both jobs, and the **GitHub Pages deployment
  succeeded. Manual live-route verification was not performed** — the sandbox
  network policy denies `ricktron.github.io`. Post-merge reconciliation recorded
  in
  [`../receipts/2026-07-26-slice-6-post-merge-reconciliation.md`](../receipts/2026-07-26-slice-6-post-merge-reconciliation.md).
- **Slice 7 (current): `Complete`.** Owner-authorized and delivered on
  `claude/slice-7-timers-arming-transitions-wd7cmf`, based on `main` at
  `752a3fe0f45fdc1ee687339134023c3811facd91` (the merge commit of PR #13, the
  roadmap amendment). Implementation commit `f804430`; final reviewed head
  `43cc66c5fc2a01cdb46daa1b52b7df08184b0448`. Merged to `main` via
  **[PR #14](https://github.com/ricktron/classroom-quiz-show/pull/14)** (merge
  commit `3f9ae1c4c7f9f6e37bac08bf519dbd8ef68af42a`, merged 2026-07-26T23:43:51Z
  by `ricktron`) with all three PR checks green; the merge commit's second parent
  is the reviewed head. Post-merge CI on `main` at `3f9ae1c` concluded success for
  both jobs, and the **GitHub Pages deployment succeeded. Manual live-route
  verification was not performed** — the sandbox network policy denies
  `ricktron.github.io`. Local evidence in
  [`../receipts/2026-07-26-slice-7-local-verification.md`](../receipts/2026-07-26-slice-7-local-verification.md);
  post-merge reconciliation in
  [`../receipts/2026-07-27-slice-7-post-merge-reconciliation.md`](../receipts/2026-07-27-slice-7-post-merge-reconciliation.md).
- **Slice 8 (current): `Complete`.** Owner-authorized and delivered on
  `claude/slice-8-local-input-keyboard-thn7bn`, based on `main` at
  `004bf9d55d7d7a22b19414e11ffdd050d98fb31f` (the merge commit of PR #15, the
  Slice 7 post-merge reconciliation); implementation commit `1fbe16f`, final
  reviewed head `7d127188a20ce6bdf844c272db7b717cf5a2825a`. **Merged to `main` via
  [PR #16](https://github.com/ricktron/classroom-quiz-show/pull/16)** (merge
  commit `167128dc6462d10192afe92e85026918ebce7ba0`, merged
  **2026-07-27T02:46:24Z** by `ricktron`). The merge commit's **second parent is
  the reviewed head**, so the head that was reviewed is the head that merged. All
  three PR checks were green at that head; **post-merge CI on `main` at `167128d`
  concluded success**, and the **GitHub Pages deployment succeeded. Manual
  live-route verification was not performed** — the sandbox network policy denies
  `ricktron.github.io`. Local evidence in
  [`../receipts/2026-07-27-slice-8-local-verification.md`](../receipts/2026-07-27-slice-8-local-verification.md);
  post-merge reconciliation in
  [`../receipts/2026-07-27-slice-8-post-merge-reconciliation.md`](../receipts/2026-07-27-slice-8-post-merge-reconciliation.md).
- **Slice 9 (current): `Complete`.** Owner-authorized and delivered on
  `claude/slice-9-gamepad-adapter-wfiue4`, based on `main` at
  `5cc81d448f9558e914dd5da497232f071d58b10c` (the merge commit of PR #18, the
  Slice 8 post-merge reconciliation); single implementation commit and final
  reviewed head `f63d5c190d7747f3a48a3e91a1358868229a170a`. **Merged to `main` via
  [PR #19](https://github.com/ricktron/classroom-quiz-show/pull/19)** (merge
  commit `d16f90de94bcbed9a83dfed5e7259a9da5e6a618`, merged
  **2026-07-27T05:33:05Z** by `ricktron`). The merge commit's **second parent is
  the reviewed head**, and the merge tree is identical to the reviewed head's
  tree, so the head that was reviewed is exactly the head that merged. All three
  PR checks were green at that head; **post-merge CI on `main` at `d16f90d`
  concluded success**, and the **GitHub Pages deployment succeeded**. The document
  root was later reachable by HTTP HEAD (**200**; `Last-Modified` consistent with
  that deploy); the response body was not inspected, `/host` and `/display` were
  not exercised, Gamepad behavior was not tested on the deployed application, and
  **no live-route or application-behavior claim is made**. Local evidence in
  [`../receipts/2026-07-27-slice-9-local-verification.md`](../receipts/2026-07-27-slice-9-local-verification.md);
  post-merge reconciliation in
  [`../receipts/2026-07-27-slice-9-post-merge-reconciliation.md`](../receipts/2026-07-27-slice-9-post-merge-reconciliation.md);
  rationale in
  [`../architecture/ADR-009-generic-gamepad-adapter.md`](../architecture/ADR-009-generic-gamepad-adapter.md).
  **No physical controller was tested**, so no device compatibility is claimed.
- **Slice 10 (current): `Complete`.** Squash-merged via
  **[PR #21](https://github.com/ricktron/classroom-quiz-show/pull/21)** at
  `5575be35d76ae0f0d3b36394431b7873883b78ac` (merged **2026-07-28T02:35:09Z**;
  single parent `0bcfed11`; final reviewed head
  `288593391776be1d89b7f5ab9820e147946e56f9`). Exact PR-path blob equality
  confirmed (28 paths). Host-private identity observation, candidate
  classification (`gamepadDeviceProfile`), capture recipe (`sonyBuzzProfile`),
  setup test mode, and host setup surface (`SonyBuzzSetupSection`). Physical
  hardware certification after OADL2-S07 has a **bounded host claim** under a
  temporary external keep-alive (Playwright-assisted CQS setup/test/gameplay/
  keyboard); permanent keep-alive architecture remains unresolved — see the S07
  receipt.
  Rationale in
  [`../architecture/ADR-010-sony-buzz-profile-and-setup.md`](../architecture/ADR-010-sony-buzz-profile-and-setup.md);
  receipts
  [`../receipts/2026-07-27-slice-10-hardware-independent-local-verification.md`](../receipts/2026-07-27-slice-10-hardware-independent-local-verification.md),
  [`../receipts/2026-07-28-slice-10-pr-review-and-sonar-disposition.md`](../receipts/2026-07-28-slice-10-pr-review-and-sonar-disposition.md),
  [`../receipts/2026-07-28-slice-10-owner-acceptance-amendment.md`](../receipts/2026-07-28-slice-10-owner-acceptance-amendment.md),
  [`../receipts/2026-07-28-slice-10-post-merge-reconciliation.md`](../receipts/2026-07-28-slice-10-post-merge-reconciliation.md).
- **Slice 11 (current): `Complete`.** Squash-merged via
  **[PR #23](https://github.com/ricktron/classroom-quiz-show/pull/23)** at
  `5d47b2f641e1a96c2066ec22731f4e751288b39a` (merged **2026-07-28T04:56:27Z**;
  single parent `ce1dc61d`; final reviewed head
  `bb8bd94b016a99f9782793f3eda6b6fd2d59a0b5`). Exact PR-path blob equality
  confirmed (**40** paths). Typed text and same-origin image prompts,
  fail-closed import/projection/rendering, `MediaContentDisplay`, game-file
  `schemaVersion` **1**, `PublicState` wire version **7**, sync envelope **2**.
  Rationale in
  [`../architecture/ADR-011-media-contract.md`](../architecture/ADR-011-media-contract.md);
  receipts
  [`../receipts/2026-07-27-slice-11-local-verification.md`](../receipts/2026-07-27-slice-11-local-verification.md),
  [`../receipts/2026-07-27-slice-11-pr-review-and-hardening.md`](../receipts/2026-07-27-slice-11-pr-review-and-hardening.md),
  [`../receipts/2026-07-28-slice-11-post-merge-reconciliation.md`](../receipts/2026-07-28-slice-11-post-merge-reconciliation.md).
- **Slice 12 (current): `Complete`.** Squash-merged via
  **[PR #25](https://github.com/ricktron/classroom-quiz-show/pull/25)** at
  `cdb499a1a1924ceb12014d37741b500fd9346214` (merged **2026-07-28T19:36:25Z**;
  authorized base `7c1a35c096d1d0654ea951f29aa49d0910f4c429`; final reviewed
  head `e63ef7f19aac7b1cf72ccd5cc640e3296550dae7`). Deterministic export of
  `GameDefinition` to canonical schema version **1**, re-import gate through
  `importGameFromJsonText`, structural equality + byte-stability, host-only
  download UI, media paths preserved without bundling. Public-state wire stays
  **7**; sync envelope stays **2**. Slice 12 did **not** implement persistence.
  Rationale in
  [`../architecture/ADR-012-portable-export-round-trip.md`](../architecture/ADR-012-portable-export-round-trip.md);
  receipts
  [`../receipts/2026-07-28-slice-12-local-verification.md`](../receipts/2026-07-28-slice-12-local-verification.md),
  [`../receipts/2026-07-28-slice-12-pr-review-and-hardening.md`](../receipts/2026-07-28-slice-12-pr-review-and-hardening.md).
- **Slice 13 (current): `Complete`.** Squash-merged via
  **[PR #27](https://github.com/ricktron/classroom-quiz-show/pull/27)** at
  `6cf4d2579ab558f8c4b7eabca0b94df4acc6f20c` (merged **2026-07-29T21:27:59Z**;
  authorized base `3fd212994c0e8b651193460de633995fe80a25df`; final reviewed
  head `ad0867ab6d7e00f397de51dfad2363f35bc181d7`). Reviewed-head and squash
  trees identical. Host-local IndexedDB persistence (saved definitions, active
  session recovery with explicit Resume/Discard, lightweight host-writer lease).
  Public-state wire stays **7**; sync envelope stays **2**; game-file schema
  stays **1**. No dependency added. Live-route behaviour was **not** manually
  verified. Rationale in
  [`../architecture/ADR-013-local-persistence-recovery.md`](../architecture/ADR-013-local-persistence-recovery.md);
  receipts
  [`../receipts/2026-07-29-slice-13-local-verification.md`](../receipts/2026-07-29-slice-13-local-verification.md),
  [`../receipts/2026-07-29-slice-13-sonar-polish.md`](../receipts/2026-07-29-slice-13-sonar-polish.md),
  [`../receipts/2026-07-29-slice-13-post-merge-reconciliation.md`](../receipts/2026-07-29-slice-13-post-merge-reconciliation.md).
- **Slice 14 (current): `Complete`.** Owner-authorized under
  `AUTHORIZE-CQS-S14-FINAL-WAGER-IMPLEMENTATION-1` and delivered on
  `claude/cqs-slice-14-final-wager`, based on `main` at
  `4de1454181ed58bdb282accd136129c3c0eb0f2b`. The `final-wager` round is the
  SECOND playable registered round type. Public-state wire moves **7 → 8**; sync
  envelope stays **2**; game-file schema, `GameDefinition` model, private
  persistence wire and IndexedDB schema all stay **1**; no dependency added.
  **Merged** via PR
  [#32](https://github.com/ricktron/classroom-quiz-show/pull/32) at
  `ce2e103377c5d86c8e0946346cb4cf05dfe7d58d` (2026-08-03T17:08:37Z) from
  reviewed-and-repaired head `c2bcc1a5c383d5e6787f7f9a9d9a808c8ffd2d26`.
  Rationale in
  [`../architecture/ADR-014-final-wager-round.md`](../architecture/ADR-014-final-wager-round.md);
  evidence in
  [`../receipts/2026-08-03-slice-14-local-verification.md`](../receipts/2026-08-03-slice-14-local-verification.md),
  [`../receipts/2026-08-03-slice-14-pr-review-and-hardening.md`](../receipts/2026-08-03-slice-14-pr-review-and-hardening.md),
  [`../receipts/2026-08-03-media-normalized-prompt-reread-repair.md`](../receipts/2026-08-03-media-normalized-prompt-reread-repair.md)
  and
  [`../receipts/2026-08-03-slice-14-post-merge-reconciliation.md`](../receipts/2026-08-03-slice-14-post-merge-reconciliation.md).
- **Slice 15 (current):** `Complete.` Squash-merged via
  [PR #38](https://github.com/ricktron/classroom-quiz-show/pull/38) at
  `242539044e45a43eacc6d8334349e59a6987a3d9` from reviewed-and-repaired head
  `d8f6308eccea5144ab1c6b5f49afdfcc2b7d5b5b` (authorized base `0939d9c…`, merged
  **2026-08-04T19:28:26Z**). Host-private current-session summary contract
  (`classroom-quiz-show/session-summary`, version **1**) derived from
  authoritative history/replay only; unavailable authored rounds without
  fabricated metrics; truthful timer-reset counting; no completed-session
  storage; public wire **8**, sync **2**, schema/persistence/IndexedDB **1**
  unchanged. Inherited Final mid-refresh recovery flake remains unresolved.
  Rationale in
  [`../architecture/ADR-015-session-summary-contract.md`](../architecture/ADR-015-session-summary-contract.md);
  evidence in
  [`../receipts/2026-08-04-slice-15-local-verification.md`](../receipts/2026-08-04-slice-15-local-verification.md)
  and
  [`../receipts/2026-08-04-slice-15-post-merge-reconciliation.md`](../receipts/2026-08-04-slice-15-post-merge-reconciliation.md).
- **Slice 16 (current product frontier):** `Complete` — squash-merged via PR
  [#40](https://github.com/ricktron/classroom-quiz-show/pull/40) at
  `bc3cea65cab8db1481b0b2420be580cc69932f3d` from reviewed head
  `942575c97b97df220c215a7d265736a797869157`. Host-private completed-summary
  ledger, exact competitive profiles, compatible game/team/class rollups,
  retention/deletion/class-label controls, and IndexedDB schema **2**. Public
  wire **8**, sync **2**, game-file schema **1**, private active-session wire
  **1**, and Session Summary contract **1** remain unchanged. ADR-016 is
  **Accepted**. See
  [`../architecture/ADR-016-completed-summary-ledger-compatible-reporting.md`](../architecture/ADR-016-completed-summary-ledger-compatible-reporting.md)
  and
  [`../receipts/2026-08-04-slice-16-semantic-review-r1.md`](../receipts/2026-08-04-slice-16-semantic-review-r1.md).
  Documentation-only post-merge reconciliation is in review on
  `docs/slice-16-post-merge-reconciliation`.
- **Slices 17–22:** `Planned`, unstarted, and unauthorized (22-slice plan;
  Amendment 003).
- **What Slice 14 adds:** the SECOND playable round type, `final-wager` — and
  the important thing about it is where it lives. It is registered by application
  code in the same registry as `category-board`, validated by the same import
  pipeline, exported by the same canonical exporter, persisted by the same
  private codec, and played entirely through the existing command → event →
  replay core. It is **not** a game mode, a preset engine, a policy object, an
  extension of the board, or a screen outside that core. Its state is one more
  per-round map on `PrivateGameState` (`finalWagers`), a sibling of
  `categoryBoards` and `responsePhases`; its public form is one more member of
  the allow-listed `PublicRoundState` union.
  Eligibility (Classic or Inclusive), each team's wager cap, and the default
  low-to-high reveal order are FROZEN onto the start event and never drift.
  Wagers and response states are host-private and validated — zero is explicit
  and real, and anything outside `0 … cap` is rejected, never clamped. The prompt
  becomes public only when the host opens the response window; the answer only on
  an explicit reveal; a team's wager and response only at that team's reveal; and
  correctness only at settlement. Two Final windows reuse ADR-007's clock
  discipline, and **expiry records only that the window ended** — it locks
  nothing, marks nobody absent, reveals nothing, adjudicates nothing, settles
  nothing and ends nothing. Settlement is atomic and reversible, stores a signed
  delta and never a resulting total, and a zero wager still produces an auditable
  zero-delta fact. A tied lead presents both choices; sudden death keeps the game
  active and narrows manual correction to tied leaders; accepting the tie is
  irreversible and appends the existing `GAME_SESSION_ENDED` beside it.
  `PublicState` moves 7 → 8, and every Final stage has an exact-key wire guard.
  See
  [`../architecture/ADR-014-final-wager-round.md`](../architecture/ADR-014-final-wager-round.md).
- **What Slice 13 adds:** host-local IndexedDB durability for **saved
  definitions** and **active-session recovery**, kept strictly distinct from each
  other and from coordination. Active sessions recover through an explicit
  Resume/Discard choice (no silent resume). Saved definitions round-trip through
  the existing export/import pipeline. A lightweight host-writer lease keeps a
  second local host tab read-only. Persistence envelopes and library contents stay
  host-private — **nothing new is projected** to the display. Public-state wire
  stays **7**; sync envelope stays **2**; game-file schema stays **1**. No
  backend, cloud account, cross-device sync, student-device behaviour, or
  controller-mapping persistence was introduced. See
  [`../architecture/ADR-013-local-persistence-recovery.md`](../architecture/ADR-013-local-persistence-recovery.md).
- **What Slice 9 adds:** generic USB controller input **through the Slice 8
  boundary**, and the most important thing about it is the list of things it did
  not change — no schema, no `PublicState` (wire version stays 6), no sync
  envelope (stays 2), no command, no event, no reducer, no queue logic, no timer
  transition, no scoring behaviour, and no new dependency.
  `LOCAL_INPUT_SOURCE_KINDS` gained exactly one member, `gamepad`, in the same
  change as its adapter. Direct `navigator.getGamepads()` access is confined to
  one boundary module (`src/input/gamepadSource.ts`) that produces a frozen,
  bounded `{ controllerIndex, pressed[] }` snapshot — no browser `Gamepad`,
  `GamepadButton`, device `id`, `mapping`, `axes`, analog value, timestamp or
  vendor/product id is representable above it. Both the SOURCE and the SCHEDULER
  are injectable, so every unit test uses a fake and **no test needs a browser, a
  frame or a physical controller**. Polling lives in one host-only lifecycle owner
  (`src/host/useGamepadBuzzInput.ts`), registered once, stopped on unmount, and
  never in the reducer, render, sanitizer, replay, command planning or on the
  display route. Presses are derived by RISING EDGE, and the first observation of
  any controller is a **baseline only** — so a button already held at connect,
  reconnect, enable, mapping change, capture completion, tab restoration or focus
  restoration cannot buzz until it is released and pressed again, and connect and
  disconnect append nothing. Several fresh edges in one poll are ordered by
  ascending controller index then ascending button index, as a tie-break rule with
  **no fairness claim** — the event log's `seq` remains the authority. Mappings are
  generic (controller index + button index + team + logical action), validated with
  structured issues and no silent overwrite or repair, have **no default button
  assignment**, and are **session-local — lost when the host page reloads**, which
  the panel states plainly. Buttons only: no axes, analog, motion or haptics.
  Secondary slots are assignable and **still inert**. See
  [`../architecture/ADR-009-generic-gamepad-adapter.md`](../architecture/ADR-009-generic-gamepad-adapter.md).
- **What Slice 10 adds:** the host-private Sony Buzz! **setup boundary** on top of
  the Slice 9 adapter — identity observation on the bounded snapshot, candidate
  classification from USB VID/PID tokens only (`gamepadDeviceProfile`), a
  capture-based recommended profile with no hard-coded browser indices
  (`sonyBuzzProfile`), setup test mode on the existing poll path, and a host setup
  surface (`SonyBuzzSetupSection`). Test mode resolves edges against the applied
  mapping only — no dispatch, no event, no score. **`PublicState`, the sync
  envelope, commands, events and the reducer are unchanged.** Session-local mapping
  lifetime is unchanged. Physical hardware certification after OADL2-S07 has a
  **bounded host claim** under a temporary external keep-alive (Playwright-
  assisted CQS setup/test/gameplay/keyboard); permanent keep-alive architecture
  remains unresolved. See
  [`../architecture/ADR-010-sony-buzz-profile-and-setup.md`](../architecture/ADR-010-sony-buzz-profile-and-setup.md)
  and
  [`../receipts/2026-08-01-oadl2-s07-sony-buzz-physical-certification.md`](../receipts/2026-08-01-oadl2-s07-sony-buzz-physical-certification.md).
- **What Slice 11 adds:** a typed prompt contract (`PromptContent`) with legacy
  strings normalized to text and a bounded static-image form using validated
  same-origin relative paths. Import, trusted-domain, public projection and
  projector rendering all fail closed; captions, attribution and alt fallback
  remain visible. `PublicState` moves 6 → 7; the sync envelope stays 2 and the
  game-file schema stays 1. See
  [`../architecture/ADR-011-media-contract.md`](../architecture/ADR-011-media-contract.md).
- **What Slice 8 adds:** the hardware-independent **local input boundary** and
  keyboard buzz-in through it. A layered chain — raw browser input → a local input
  adapter (`src/input/`) → a **logical action** → a validated command → an
  append-only event → the reducer → sanitized public state — in which the domain
  never receives a `KeyboardEvent`, a key code, a device identifier or a mapping
  table. A bounded logical action vocabulary (`primary-buzz` plus four **ordinal**
  `secondary` slots that are representable, mappable and **inert**). Configurable
  keyboard mappings bound to a physical key POSITION (`KeyboardEvent.code`), with
  structured validation, safe defaults and versioned browser-local persistence that
  is **not** the start of Slice 13. A **full ordered buzz queue** (`OG-2`) whose
  order is the event log's, an explicit **active respondent**, and promotion after
  an incorrect response or a host pass (`OG-3`) as one typed command that moves no
  points. The first accepted buzz stops the clock through Slice 7's typed
  interruption seam — one new source member, no new event type. Two reversible
  commands and events; `PublicState.response` gained a required `buzz` field (wire
  version 5 → 6); the sync envelope is unchanged at 2. `OG-4` and `OG-5` are
  resolved; **`OG-6` remains deferred and scoring is unchanged for every team**.
  See
  [`../architecture/ADR-008-local-input-keyboard-buzz.md`](../architecture/ADR-008-local-input-keyboard-buzz.md).
- **What Slice 7 adds:** the clock boundary and the response window. An explicit
  `Clock` seam (`src/time/clock.ts`) read only at the dispatch edge and the
  presentation edge — never in `reduce`, `replay`, the planner's decision logic or
  the sanitizer, so replay stays bit-exact. Durable timer FACTS (duration, start,
  absolute deadline; a paused timer stores the frozen remaining and no deadline)
  with the countdown derived at the rendering edge, so there is no tick event and
  no per-frame revision. A round-type-neutral per-round `responsePhases` map, legal
  at the `prompt` stage only. Manual host arming (`OG-1`) as first-class durable
  state. A typed interruption seam that stops the clock **without ending the clue**.
  Expiry through the command boundary carrying the timer id and deadline, so a
  stale callback appends nothing and exactly one effective expiry per countdown is
  structural. Host pause/resume (`OG-8` resolved). Eight reversible commands and
  events; `PublicState` gained one field, `response` (wire version 4 → 5); the sync
  envelope moved 1 → 2 for a required `sentAt`; and the game file gained an
  additive optional `timer` block on `schemaVersion: 1`. See
  [`../architecture/ADR-007-timers-arming-transitions.md`](../architecture/ADR-007-timers-arming-transitions.md).
- **What Slice 6 adds:** teams and the first scoring strategy. Teams are authored
  content on the immutable `GameDefinition` (stable id as identity, a public name
  that is *not* identity, an accent from an application-controlled palette of eight
  tokens, authored order frozen onto `order`, 1–8 teams). Scores are SESSION state
  (`PrivateGameState.teamScores`): bounded integers (−1,000,000…1,000,000, initial
  0) derived purely by replaying the log. One command `ADJUST_TEAM_SCORE` → one
  reversible event `TEAM_SCORE_ADJUSTED`, carrying a signed delta plus a typed
  `mode` (`full-credit`/`partial-credit`/`deduction`/`manual-correction`) and a
  typed `source` (a specific board tile, or `manual`). Revealing and scoring are
  independent in both directions; correction never rewrites history; `PublicState`
  gained one field, `teams` (wire version 3 → 4); and there is a host scoring panel
  plus a projector scoreboard. See
  [`../architecture/ADR-006-teams-and-scoring.md`](../architecture/ADR-006-teams-and-scoring.md).
- **What Slice 5 adds:** the first playable round type. `category-board` is
  registered by application code and supplies its own strict config schema to the
  Slice 4 pipeline (no second importer). It adds a typed board config (ordered
  categories and tiles, stable round-wide-unique ids, prompt, answer, optional
  alternates, optional host-only notes, optional multiplier), a private
  per-round reveal-stage machine (`board → selected → prompt → answer`), four
  reversible commands/events, a used-tile policy where a tile is consumed on
  ANSWER reveal and released by undo, one new `PublicState.round` DTO
  (current-stage-only; wire version 2 → 3), the first real projector experience,
  and bounded host controls. It scores nothing.
- **What Slice 4 adds:** the canonical versioned JSON game-file format and ONE
  Zod-based validation/normalization import pipeline
  (`src/import/importGame.ts`) that every import entry point converges on —
  explicit format/version discrimination, a pre-Zod document safety scan, strict
  schemas with zero coercion, semantic checks, registry-supplied per-round-type
  config schemas, narrow lossless normalization with no silent repair, a
  structured `ImportIssue` error model, a discriminated `ImportResult`, and a
  host-only paste harness. Invalid imports provably touch no state. Still no
  gameplay.
- **What Slice 3 adds:** the typed game & round model + a non-executable round
  registry — `GameDefinition` (immutable, deep-frozen, unique round ids), typed
  `RoundDefinition` with data-only config, a registry with explicit known/unknown
  lookup and no code-execution path, a `GameSession` (`PrivateGameState`) distinct
  from the definition, four game commands/events with deterministic replay + undo,
  unknown-round-type fail-closed handling, and one allow-listed `PublicGameView`.
  No gameplay; one non-gameplay placeholder round type only.

## Architecture decisions

- **Routing / base path:** unchanged from Slice 1 (hash routing; ADR-001).
- **State, event & sync core:** see
  [`../architecture/ADR-002-state-event-sync-core.md`](../architecture/ADR-002-state-event-sync-core.md).
  Commands express intent; a pure reducer produces append-only events;
  authoritative state is `replay(initial + events)`; undo appends an auditable
  `EVENT_UNDONE` marker. The allow-list `toPublicState` sanitizer is the only
  path from private state to the display. Host/display sync uses a versioned
  BroadcastChannel envelope; the host is authoritative, the display read-only and
  fails closed.
- **Canonical validation & import:** see
  [`../architecture/ADR-004-canonical-validation-import.md`](../architecture/ADR-004-canonical-validation-import.md).
  A game file is a JSON object discriminated by exact `format` +
  `schemaVersion`; there is exactly one ingestion pipeline; unknown keys are
  rejected (never dropped); nothing is coerced, defaulted, or repaired; failures
  are structured issues, not exceptions; and the pipeline holds no reference to
  the store, reducer, or sync layer, so an invalid import cannot mutate anything.
  A successful import loads only via the existing `INITIALIZE_GAME` command.
  **Unknown round types fail IMPORT** — deliberately stricter than Slice 3's
  trusted in-memory path, which still represents and fail-closes on them.
- **Game & round model + registry:** see
  [`../architecture/ADR-003-game-round-model-registry.md`](../architecture/ADR-003-game-round-model-registry.md).
  `GameDefinition` is immutable authored data (deep-frozen; unique ordered
  rounds); `RoundType` is an open branded string and the **registry** decides
  known/unknown with no fallback and **no code execution**. Round `config` is
  data-only (`DataValue` forbids functions). The `GameSession` (`PrivateGameState`)
  is distinct from the definition. Round **support is frozen onto the event at
  plan time**, so replay is deterministic without the registry.
- **Timers, arming & transitions:** see
  [`../architecture/ADR-007-timers-arming-transitions.md`](../architecture/ADR-007-timers-arming-transitions.md).
  The clock is read at the command/dispatch edge and the presentation edge and
  nowhere else; durable events record facts, never a ticking value; a running
  window is projected as an absolute deadline and the display derives the
  countdown locally. Arming is manual, durable and orthogonal to the timer.
  Interruption is a typed source that stops the clock without ending the clue.
  Expiry must carry the timer identity and the exact deadline, so a stale callback
  is inert. A window is legal only at the `prompt` stage and is not resumed across
  a round change. The display never expires a timer.
- **Teams & scoring:** see
  [`../architecture/ADR-006-teams-and-scoring.md`](../architecture/ADR-006-teams-and-scoring.md).
  Teams are authored content, scores are replayed session state, and the two never
  mix. Identity is the team id (never the name); authored order is canonical and the
  scoreboard never re-sorts. Imported content may NAME an accent from a fixed
  application palette and can never supply a colour or any style value. Scores are
  bounded integers derived only from events — the resulting total is deliberately
  **not** stored on the event, because undoing an earlier adjustment would make a
  stored total a lie. The selected scoring target is host UI state: not a command,
  not an event, not in `PublicState`. Revealing and scoring are independent in both
  directions, and correction is undo-or-compensate, never an edit.
- **Category-board round:** see
  [`../architecture/ADR-005-category-board-round.md`](../architecture/ADR-005-category-board-round.md).
  Authored array order is canonical; identity is the stable id (tile ids unique
  across the whole round). Uneven categories and duplicate values are both
  ALLOWED and documented. `effectiveValue = value × multiplier` over bounded
  integers, affecting only the displayed value — it scores nothing, and the
  default of 1 is applied by the trusted constructor, never a Zod transform.
  The reveal stage is one discriminated value paired with the selection, so
  "no answer without a selected tile" is structural. A tile is consumed on
  ANSWER reveal and released by undo, derived only from replayed events. The
  public DTO is current-stage-only with positional keys and a neutral `kind`
  discriminator; notes and alternates are never projected.
- **Media contract:** see
  [`../architecture/ADR-011-media-contract.md`](../architecture/ADR-011-media-contract.md).
  Prompts are normalized to typed text or same-origin static-image content;
  unsupported kinds and unsafe paths fail import, malformed trusted/public media
  fails closed, and the display accepts only the allow-listed public DTO.
- **Failure categories** (command rejection, event application failure, transport
  decode failure, public projection failure) each have a defined fail-safe
  behavior; unknown-round-type is handled fail-closed at every layer.

## Module map (Slices 2–13)

```
src/game/
  teams/
    accents.ts       The application-controlled accent palette (8 tokens) + guard
    limits.ts        Team-count / name / id limits, each with a classroom rationale
    schema.ts        Strict Zod teams schema + whole-list semantic checks
    definition.ts    Trusted TeamDefinition, fail-closed read, lookups, guards
    scoring.ts       Score bounds, the four typed modes, ScoreSource, THE amount rule
  categoryBoard/
    limits.ts        Board-size + text limits, each with a classroom rationale
    schema.ts        Strict Zod config schema + whole-board semantic checks
    definition.ts    Trusted CategoryBoardDefinition, fail-closed read, lookups
    roundType.ts     The registered `category-board` RoundTypeEntry
  media/
    limits.ts        Prompt/media text and source-path bounds
    schema.ts        Strict authored text/image prompt schema + path policy
    definition.ts    Trusted `PromptContent` normalization and fail-closed reads
  timing/
    limits.ts        Response-window bounds + the documented default, with reasons
    schema.ts        Strict Zod schema for the authored `timer` block
    timerConfig.ts   Trusted TimerConfig, the ONE default, guards, ms conversion
    responsePhase.ts ResponsePhaseState, the 5-status timer union, the typed
                     interruption seam, pure remaining-time derivations
  ids.ts             Branded GameId / RoundId / RoundType / GameSessionId
  roundDefinition.ts RoundDefinition, DataValue/RoundConfig, placeholder type + guard
  gameDefinition.ts  GameDefinition, createGameDefinition (unique ids, deep-freeze), guard
  deepFreeze.ts      Recursive freeze used by the definition factory
  registry.ts        RoundTypeEntry, createRoundRegistry (explicit known/unknown, no exec)
  placeholderRound.ts  The one built-in non-gameplay round type entry
  defaultRegistry.ts createDefaultRegistry (placeholder + category-board)
  sampleGame.ts      Trusted in-memory samples (incl. one unsupported round)
src/time/
  clock.ts         THE clock seam: Clock, systemClock, manual clock, isInstant
  duration.ts      Dependency-free M:SS / spoken-duration formatting
src/state/
  publicState.ts   PublicState (+ game view, + round DTO, + teams, + response, v7)
  status.ts        Bounded PublicStatusCode + fixed public copy (host-side)
  privateState.ts  PrivateState / …GameState (+ CategoryBoardRoundState, + teamScores)
  privateState.ts  (+ responsePhases per-round map)
  commands.ts      SessionCommand union (+4 game, +4 board, +1 scoring, +8 response)
  events.ts        SessionEvent union (+4 game, +4 board, +1 scoring, +8 response)
  reducer.ts       reduce, planCommand, replay, findUndoTarget, effectiveEvents,
                   categoryBoardStateFor, teamScoreFor, responsePhaseFor
  sanitize.ts      toPublicState (allow-list; +game view, +round, +scoreboard,
                   +response phase)
  store.ts         createSessionStore (owns a RoundRegistry; injects support predicate)
src/sync/
  protocol.ts      Versioned envelope (v2, required `sentAt`) + strict decode
  channel.ts       SyncChannel: BroadcastChannel / no-op / in-memory-hub impls
  broadcaster.ts   Host publisher (sanitized only; answers request-state)
  receiver.ts      Display subscriber (decode, stale/dup drop, request on start,
                   clamped host-clock offset estimate)
src/import/
  canonicalFormat.ts  Format identity, supported version, documented limits
  issues.ts           ImportStage/ImportIssueCode/ImportIssue, paths, sorting
  result.ts           Discriminated ImportResult + ImportMetadata
  safetyScan.ts       Pre-Zod plain-data scan (reserved keys, non-data, cycles)
  schemas.ts          Strict Zod schemas + ZodIssue → ImportIssue mapping
  semantic.ts         Unique round ids, non-blank titles
  registryCheck.ts    Registry compatibility + per-type config schema
  normalize.ts        Validated → branded, deep-copied, frozen GameDefinition
  importGame.ts       THE pipeline (importGameFromJsonText / …FromUnknown)
  sampleGameFile.ts   Built-in sample game files as JSON TEXT (not definitions)
src/input/         (Slice 8) localInput, logicalAction, commandTranslation,
                   keyboardKeys, keyboardAdapter, keyboardMapping,
                   keyboardMappingStore
                   (Slice 9) gamepadSource  THE browser Gamepad boundary: the only
                                            caller of navigator.getGamepads(), the
                                            bounded frozen snapshot, the injectable
                                            GamepadSource, neutral labels
                             gamepadAdapter PURE rising-edge scan + edge → logical
                                            action; the baseline/re-prime rule
                             gamepadMapping generic controller/button ↔ team ↔
                                            action, validation, session-local only
                   (Slice 10) gamepadDeviceProfile host-private candidate
                                            classification from reported id
                             sonyBuzzProfile capture recipe + staged profile
src/host/          useSessionStore, useHostSync, FoundationControls,
                   GameImportPanel (host-only import harness),
                   CategoryBoardHostPanel (reveals; scores nothing),
                   TeamScoringPanel (scores; reveals nothing),
                   ResponseTimerHostPanel (arms and times; reveals and scores
                   nothing), useResponseTimerExpiry (the ONE scheduled clock read),
                   LocalInputHostPanel + useKeyboardBuzzInput (the ONE place a
                   KeyboardEvent is touched),
                   GamepadInputHostPanel + useGamepadBuzzInput (the ONE polling
                   lifecycle owner; injectable source and scheduler),
                   SonyBuzzSetupSection (host-private Sony Buzz! setup/test),
                   responseOpportunity (the ONE derivation of the live target,
                   shared by both local-input panels)
src/display/       usePublicState (PublicState + receiver + clock offset),
                   CategoryBoardDisplay (projector board / prompt / answer),
                   MediaContentDisplay (typed text/image prompt presentation),
                   TeamScoreboard (projector scoreboard, fails closed),
                   ResponseTimerDisplay + useResponseCountdown (derived countdown)
src/test/          leakLabels, gameFileFixtures, categoryBoardFixtures, teamFixtures
```

> **Module map note (Slice 14).** `src/game/finalWager/` owns the Final round's
> limits, strict schema, trusted definition, eligibility/cap/reveal-order rules
> and replay-derived state. Host UI lives in `FinalWagerHostPanel` /
> `useFinalWagerExpiry`; the projector renderer is `FinalWagerDisplay`. Final
> gameplay behaviour lives in the pure reducer and its projection in the
> allow-list sanitizer — the registry entry supplies identity, the single config
> validation path, and the neutral Slice 3 runtime seam, exactly as
> `category-board` does. See
> [`../architecture/ADR-014-final-wager-round.md`](../architecture/ADR-014-final-wager-round.md).

> **Module map note (Slice 13).** `src/persistence/` owns host-local IndexedDB
> adapters, saved definitions, active-session wire, write queue, and coordination.
> Host UI lives in `PersistenceControls` / `useHostPersistence`. Nothing in this
> tree is projected to the display. See
> [`../architecture/ADR-013-local-persistence-recovery.md`](../architecture/ADR-013-local-persistence-recovery.md).

> **Module map note (Slice 10).** `gamepadDeviceProfile`, `sonyBuzzProfile`, and
> `SonyBuzzSetupSection` are host-private setup surfaces only. They do not change
> commands, events, `PublicState`, sync, or the display route. See
> [`../architecture/ADR-010-sony-buzz-profile-and-setup.md`](../architecture/ADR-010-sony-buzz-profile-and-setup.md).

> **Module map note (Slice 4).** `src/game/sampleGame.ts` builds *trusted
> in-memory* fixtures through the domain constructor; `src/import/sampleGameFile.ts`
> holds *untrusted* JSON text that goes through the pipeline. They are not
> interchangeable — the first is not an import path.

## Verification commands

```bash
npm ci               # reproducible install
npm run lint         # ESLint (flat config)
npm run typecheck    # tsc -b --noEmit
npm run test:run     # Vitest (unit/component) — 1,349 tests
npm run build        # tsc -b && vite build → dist/
npm run test:e2e     # Playwright vs production preview (3 viewport projects)
npm run verify       # lint + typecheck + unit
npm run verify:all   # verify + build + e2e (merge gate)
```

> **Local Playwright note:** this sandbox's pre-provisioned Chromium is build
> 1194 while `@playwright/test@1.56` expects 1228, so `test:e2e` needs
> `PLAYWRIGHT_CHROMIUM_PATH=/opt/pw-browsers/chromium-1194/chrome-linux/chrome`.
> That override is passed via the environment only — never committed. CI installs
> the matching browser and needs no override.

Latest local results (Slice 9): `verify:all` green — **1,349 unit tests (57
files), 199 e2e passed / 2 skipped** (both skips are the one desktop-only
offline-shell test); `git diff --check` clean. **Slice 9 PR CI was observed
green** on PR #19 at the final reviewed head `f63d5c1`: all three checks concluded
success. Sonar's detailed findings were not inspected (`sonarcloud.io` is
unreachable from the sandbox). **Post-merge on `main` (`d16f90d`)** the `CI`
workflow (run `30240064570`) and the `Deploy to GitHub Pages` workflow (run
`30240064595`) both concluded **success**; the document root was reachable by
HTTP HEAD (**200**; `Last-Modified` consistent with that deploy), but the
response body was not inspected, `/host` and `/display` were not exercised,
Gamepad behavior was not tested on the deployed application, and **no live-route
or application-behavior claim is made**. **No physical controller was tested**;
none is available in this environment.

Earlier, on the Slice 8 branch: `verify:all` green — **1,184 unit tests (51
files), 187 e2e passed / 2 skipped** (both skips are the one desktop-only
offline-shell test); `git diff --check` clean. **Slice 8 PR CI was observed
green** on PR #16 at the final reviewed head `7d12718`: all three checks concluded
success. Sonar's detailed findings were not inspected (`sonarcloud.io` is
unreachable from the sandbox). **Post-merge on `main` (`167128d`)** the `CI`
workflow concluded success, and the **GitHub Pages deployment succeeded. Manual
live-route verification was not performed.**

Earlier, on the Slice 7 branch: `verify:all` green — **947 unit tests (42 files),
175 e2e passed / 2 skipped**. **Slice 7 PR CI was observed green** on PR #14 at
implementation commit `f804430`: all three checks concluded success, SonarCloud
Quality Gate passed, 0 security hotspots. Sonar's 12 new non-blocking issues were
not inspected. Slice 7 merged to `main` via PR #14 at `3f9ae1c`.

Earlier, on the Slice 6 branch: `verify:all` green — **740 unit tests,
154 e2e passed / 2 skipped** (both skips are the one desktop-only offline-shell
test); `git diff --check` clean. **Slice 6 PR CI was observed green** on PR #11 at
both heads (`7734065` and the final reviewed head `48ed818`): all three checks
success, SonarCloud Quality Gate passed, 0 security hotspots. **Post-merge on
`main` (`67180a3`)** the `CI` workflow concluded success for both jobs, and the
**GitHub Pages deployment succeeded. Manual live-route verification was not
performed** — the sandbox network policy denies `ricktron.github.io` with HTTP 403
on CONNECT.

Earlier, on the Slice 5 branch: `verify:all` green — **455 unit tests,
121 e2e passed / 2 skipped**. Slice 5 CI was **observed green** on PR #9
(final reviewed head `5e6994e`): all three checks concluded success, SonarCloud
Quality Gate passed with 0 security hotspots. **Post-merge on `main`
(`2ec6932`)** the `CI` workflow concluded success for both jobs, and the Pages
deployment succeeded.
Earlier, on the Slice 4 branch: 253 unit tests, 97 e2e passed / 2 skipped. Slice 4 CI was observed green on
PR #7 (final head `8ce850c`) and again **post-merge on `main` (`5295e83`)**, where
the Pages deployment also succeeded. Slice 3 CI was observed green on PR #5 (final reviewed head
`464ef07`: build + e2e success, SonarCloud Quality Gate passed, 0 security
hotspots). Durable evidence in the receipts under [`../receipts/`](../receipts/).

## Known risks / limitations

- **No manual live-URL verification has been performed** for Slice 5 or Slice 6 (the
  sandbox network policy denies `ricktron.github.io`). For Slice 6 the **GitHub
  Pages deployment succeeded** post-merge and post-merge CI on `main` is green, but
  **manual live-route verification was not performed** — a successful deploy
  workflow is not the same evidence as loading the site. Slice 6 changes no CI or
  deploy configuration.
- **`PublicState` wire version is now 8 (Slice 14) and the sync envelope version
  is 2.** A consumer pinned to any older version of either fails closed by
  design; no migration exists. Version 7 is REJECTED, never reinterpreted — a
  version-7 display would otherwise fail the round guard on a Final payload and
  silently freeze on its last board snapshot.
- **Final state deliberately SURVIVES a round change**, unlike a response phase
  (ADR-007 §8). A Final holds committed wagers, recorded responses and applied
  settlements, and discarding those because a teacher glanced back at an earlier
  round would destroy recorded facts. A Final window that is stale on return is
  recorded as expired, which changes nothing on its own. Documented in ADR-014
  §14.
- **Nothing in Final happens automatically.** A window running out locks no
  wager, invents no zero, marks nobody as a no-response, reveals nothing,
  adjudicates nothing, settles nothing and ends nothing.
- **A Final wager is rejected, never clamped.** An over-cap, negative,
  fractional or non-finite amount appends nothing and mutates nothing; the host
  sees the number they typed and corrects it.
- **Manual score correction is narrowed during Final sudden death** to the tied
  leaders only. This is the one round-type-aware rule in the scoring planner.
- **The board itself still scores nothing.** `multiplier` affects the displayed
  value and the typed `effectiveValue`, and revealing an answer awards nothing — the
  teacher must deliberately award or deduct. A timer running out awards nothing
  either. No buzzer or wager exists.
- **A response window exists only at the `prompt` stage**, and is cleared by a new
  selection, the answer reveal, a return to the board, any round change, the game
  ending, or a new game.
- **A response window is NOT resumed across a round change**, unlike board
  progress, which is. A deadline is an absolute instant, and resuming a stale one
  would put a nonsense clock in front of a class.
- **Host and display clocks are not synchronized.** The display applies a clamped
  (±5 s) offset estimated from each snapshot's `sentAt`; transport delay is ignored
  and there is no round-trip measurement. On today's same-browser transport both
  clocks are identical, so the correction is effectively a no-op — it exists so a
  future cross-device transport does not silently mis-render a countdown.
- **The display never expires a timer.** At 0:00 it keeps showing the running state
  until the host publishes `expired`.
- **Undoing an expiry restores an already-overdue running timer**, which the host
  adapter expires again on the next tick unless the host acts. Undo restores the
  prior durable state exactly.
- **`OG-6` is a recorded owner decision that is NOT implemented.** Scoring is not
  restricted to the active respondent; it stays available for every team. (`OG-2`
  and `OG-3` WERE implemented by Slice 8 — this entry was stale from the Slice 7
  era and is corrected here.)
- **Gamepad mappings are session-local and are LOST when the host page reloads**
  (Slice 9). Deliberate: the roadmap records the slice's storage impact as none,
  and a browser controller index is not stable across a reload, so a restored
  mapping could silently point at the wrong controller. Buzz KEYS still persist;
  controller buttons do not.
- **A browser controller index is a session-local locator, not an identity.** Not
  stable across a reload, a browser restart, a disconnect/reconnect, a USB port
  change, an operating system or a browser version, and never persisted.
- **Most browsers do not expose a controller until a button on it is pressed**, so
  a freshly plugged-in controller can legitimately read as "None detected" until it
  is touched. Browser behaviour, not a panel defect.
- **Physical controller certification is bounded, not a SKU list.** Generic
  support is unit-proven against a fake source. OADL2-S07 (2026-08-01/02)
  completed a serial browser 4×5 map and Playwright-assisted CQS matrices for
  wireless `Wbuzz` under a temporary external HID output keep-alive (Gamepad API
  cannot send it) — see the bounded claim in
  [`../receipts/2026-08-01-oadl2-s07-sony-buzz-physical-certification.md`](../receipts/2026-08-01-oadl2-s07-sony-buzz-physical-certification.md).
  Permanent keep-alive architecture remains unresolved.
- **Controller buzzing starts switched OFF** and nothing is bound by default —
  there is deliberately no assumed "buzz button".
- **Slice 9 maps BUTTONS only** — no axes, sticks, analog triggers, motion,
  vibration or haptics, and no analog threshold tuning.
- **The selected scoring target is host UI state** and is lost on a host reload. It
  is never broadcast and awards nothing by existing (a deliberate decision —
  ADR-006 §7).
- **Undo reaches only the latest reversible event.** The host panel enables "Undo
  last score change" only when the next undo target actually is a score; otherwise it
  points at manual correction. There is no targeted per-event undo.
- **A tile can only be scored while it is open** (`prompt` or `answer` stage). After
  returning to the board, use a manual correction.
- **A zero-value tile has no scoring preset** (every amount rule would need a zero
  delta). Manual correction remains available.
- **Partial credit is whole points only** — no fractions, so no rounding rule.
- **Score bounds are ±1,000,000**; an adjustment that would leave the range is
  rejected, never clamped.
- **Board state is per round and RESUMES on return** — leaving a round and
  coming back restores its used tiles and reveal stage. Deliberate.
- **One tile at a time.** A second tile cannot be opened while one is live;
  return to the board first.
- **Alternates are never projected** — host-only grading aid.
- **The "unregistered round type" test fixture moved** from `category-board` to
  `not-a-real-round-type`, because the former is now a real registered type.
- **Slice 4 merged before Playwright e2e concluded** on the PR head; it
  concluded success ~23 s after the merge, and post-merge CI on `main` is green.
  Recorded precisely in the Slice 4 reconciliation receipt.
- **One schema version, no migrations** (`schemaVersion: 1`). Older/newer fail
  by design.
- **Paste is the only import transport** — no file picker, spreadsheet/CSV/XLSX,
  remote URL, or backend upload (later slices, same pipeline).
- **The import size guard counts characters, not bytes**, and covers only the
  text entry point; the object entry point is bounded by depth and field limits.
- **Duplicate JSON keys are not observable** (`JSON.parse` keeps the last).
- **Un-ending a game is unsupported** — `GAME_SESSION_ENDED` is irreversible;
  re-initialize to start over.
- **Host-local IndexedDB persistence (Slice 13)** survives refresh for saved
  definitions and unfinished active sessions on the same browser profile, with
  explicit Resume/Discard. It is not cloud sync and not cross-device. Gamepad
  mappings remain session-local.
- **Same-browser sync only** — BroadcastChannel, same origin. No cross-device
  sync, backend, or leader election (later/out of scope).
- **PWA icons remain placeholders** (carried from Slice 1).

## Open questions / unresolved decisions

- Confirm the default branch is `main` (deploy workflow targets `main`).
- **Nine owner gates were opened by `ROADMAP-AMENDMENT-001` §16. Four are now
  answered; five remain open.**

  **Answered (2026-07-26), recorded in `docs/PROJECT.md` and ADR-007 §16:**
  - **`OG-1`** — arming is **manual and host-controlled**. *Implemented in
    Slice 7.*
  - **`OG-2`** — future buzzer behaviour preserves a **full ordered team queue**,
    not a first-only lockout. **Not implemented** (Slice 8).
  - **`OG-3`** — after an incorrect response or a host pass, the **next queued
    team is promoted**. **Not implemented** (Slice 8).
  - **`OG-8`** — timer **pause/resume is supported**, bounded as ADR-007 §7
    describes. *Implemented in Slice 7*, and open to owner revision.

  **Still open:** `OG-4` (ties on identical arrival stamps) · `OG-5` (queue/tile
  lifetime) · `OG-6` (scoring restricted to the active respondent — deliberately
  **not** implemented, because no respondent exists) · `OG-7` (individual student
  identity in reporting) · `OG-9` (timer/media coordination). See the amendment
  for which slice each affects.
- **Recording an owner decision is not authorization to implement it.** `OG-2` and
  `OG-3` unblock Slice 8's event vocabulary; Slice 8 itself still needs explicit
  authorization to begin.

## Expanded-vision planning documentation (CQS-PLAN-S01) — Complete

A planning-only documentation slice recorded the owner's **expanded
gameplay, authoring, analytics, and operator vision** as durable
repository truth. **CQS-PLAN-S01 is `Complete`: squash-merged via
[PR #30](https://github.com/ricktron/classroom-quiz-show/pull/30)** at
`44e835cd2b349cd55d4bfc84a34015cb3694b821` (merged 2026-08-03T01:44:11Z)
from reviewed head `df832f6c091852cec419ca0e2faedd7b8fa07724`, with
**identical reviewed/squash trees** and **post-merge `CI` (run
`30777582632`) and Pages deploy (run `30777582624`) both success** —
see [`../STATUS.md`](../STATUS.md) and
[`../receipts/2026-08-03-cqs-plan-s01-post-merge-reconciliation.md`](../receipts/2026-08-03-cqs-plan-s01-post-merge-reconciliation.md).
**Its documentation and merge authority are exhausted** — no additional
CQS-PLAN-S01 work is authorized, and no expanded-vision capability may be
implemented from this handoff. Read before planning any expanded-vision
work:

- **Owner decisions (canonical):**
  [`../decisions/EXPANDED-VISION-OWNER-DECISIONS.md`](../decisions/EXPANDED-VISION-OWNER-DECISIONS.md)
  — decisions `CQS-OD-001`…`CQS-OD-086`; **decision 66 (GCS
  learning-target linkage) is deliberately unresolved** and must not be
  treated as decided.
- **Architecture lineage (canonical):**
  [`../decisions/ROADMAP-AMENDMENT-002-expanded-gameplay-vision.md`](../decisions/ROADMAP-AMENDMENT-002-expanded-gameplay-vision.md)
  — every existing ADR decision is preserved for the current
  implementation; future direction is recorded as explicit
  amendment/supersession lineage, not active behavior.
- **Product sequencing (canonical):**
  [`../plans/EXPANDED-CQS-VISION-ARC.md`](../plans/EXPANDED-CQS-VISION-ARC.md)
  — the **first post-MVP arc is spreadsheet and LLM authoring**
  (`CQS-ARC-AUTHORING`), then team identity/presentation, then
  operator/Loan Mode. The polished host console may follow the identity
  arc directly; **Loan Mode implementation and Operator-arc completion
  cannot precede the completed-game archive** (`CQS-ARC-INSIGHT`).
- **Deferred capabilities (canonical):**
  [`../plans/POST-MVP-OPPORTUNITY-AND-TRIGGER-REGISTER.md`](../plans/POST-MVP-OPPORTUNITY-AND-TRIGGER-REGISTER.md)
  — every parked/post-MVP capability with dependencies and observable
  reconsideration triggers.
- Domain views: gameplay policies, LLM/spreadsheet authoring, host
  console/team identity, sessions/analytics/assessment (under
  [`../plans/`](../plans/)); research record under
  [`../research/`](../research/).

**That slice implemented nothing.** The current MVP (**22-slice plan**, Amendment 003) is
unchanged; no runtime code, schema, test, or dependency changed;
implementation authority for every expanded-vision capability remains
with the Program Orchestrator and future slice authorizations. Post-MVP
arcs remain inactive; **decision 66 (`CQS-OD-066`) remains unresolved**.

## Next action

**Slices 1–15 and planning slice CQS-PLAN-S01 are `Complete` and
merged.** Phase 2B design direction is registered. **Roadmap Amendment 003
(`CQS-PLAN-S02`) delivery and post-merge reconciliation are complete on
`main`** (PR #35 at `2ebeb240…`; PR #36 at
`da6b4dc3080abf9a8effe142e19a4eb36aa6ad8d`; 22-slice plan canonical; see
[`../decisions/ROADMAP-AMENDMENT-003-remaining-mvp-rebalance.md`](../decisions/ROADMAP-AMENDMENT-003-remaining-mvp-rebalance.md),
[`../receipts/2026-08-03-cqs-plan-s02-post-merge-reconciliation.md`](../receipts/2026-08-03-cqs-plan-s02-post-merge-reconciliation.md),
and
[`../receipts/2026-08-04-cqs-plan-s02-post-merge-registration.md`](../receipts/2026-08-04-cqs-plan-s02-post-merge-registration.md)).
**Slice 15 — Session Summary Contract is `Complete`** (PR
[#38](https://github.com/ricktron/classroom-quiz-show/pull/38) at
`242539044e45a43eacc6d8334349e59a6987a3d9`).
**Slice 14 — Final-wager round is `Complete`** (PR
[#32](https://github.com/ricktron/classroom-quiz-show/pull/32) at
`ce2e103377c5d86c8e0946346cb4cf05dfe7d58d`).

**PR #40, PR #38, and PR #36 require no further review or merge action.** Slice
16 product delivery is `Complete` on `main`. **Recommended next action:
independent review of the open Slice 16 documentation-only post-merge
reconciliation PR. STOP BEFORE MERGE.** Phase 3 remains unauthorized. Slices
17–22 remain unauthorized. Post-MVP arcs remain inactive. `CQS-OD-066` remains
unresolved.

## Registered design direction — Phase 2B audience display (2026-08-03)

**Registered as program guidance. Not implemented. Authorizes nothing.**

The accepted Phase 2B audience-display design direction is recorded in
[`../plans/CQS-DESIGN-PHASE-2B-DIRECTION.md`](../plans/CQS-DESIGN-PHASE-2B-DIRECTION.md)
under `AUTHORIZE-CQS-DESIGN-PHASE-2B-REGISTRATION-1`, with disposition
**`PASS — PHASE 2B DESIGN DIRECTION ACCEPTED FOR PROGRAM USE`**. That
registration was **documentation-only**: no runtime code, schema, public wire,
test, asset, dependency, workflow, or deployment configuration changed, and no
`CQS-OD-*` was added or altered.

What the acceptance does and does not mean:

- the direction is accepted as **intended future audience-display guidance**;
- **the design is not implemented** — no Phase 2B visual element exists in the
  application;
- the representative artifacts are **evidence, not application source**, and no
  artifact bytes (ZIP, PNG, renderer, script, inventory, checksum file, or
  reconstruction note) were committed;
- **Phase 3 is not authorized**; **Slices 17–18 are not authorized**;
- **no production, projector, accessibility, or Raspberry Pi acceptance exists.**

Evidence limits, recorded verbatim in the direction document and its receipt:

> The Phase 2B design direction was accepted after bounded artifact repair. The
> artifact maintainer reported successful final package verification. The final
> corrected ZIP was not independently reopened by the Program Orchestrator, so no
> independent second checksum audit is claimed.

**Routing.** Slice 15 — Session Summary Contract is `Complete` on `main`
(PR #38). Slice 16 — Completed Summary Ledger & Compatible Reporting is
`Complete` on `main` (PR #40) and remains unaffected in priority by Phase
2B. MVP Phase 2B consumers are **Slices 17–18** (theme/token foundation, then
audience display), both `Planned` and unauthorized. A separately authorized
Phase 3 design-system specification/readiness lane may occur without changing
product-slice sequencing.

**Boundaries this direction does not move.** The public buzz state remains
`activeTeamKey` plus an anonymous `waitingCount` — never a public ordered queue.
Final privacy remains wire-version-8 privacy: no unrevealed wagers, no unrevealed
answers or responses, no host notes, no private caps or calculations, no reveal
order. A public per-team `Not eligible` label is **not** currently derivable and
would require a separately authorized sanitized public-state addition.

## Owner direction — colored buttons and the local input contract (2026-07-27)

Recorded for Slices 8–10. **Slice 8 has now implemented the CONTRACT half of this
direction** (a primary buzz action, four ordinal secondary slots that are
representable and inert, and configurable device-independent mappings). **Slice 9
has implemented the generic Gamepad adapter.** **Slice 10's hardware-independent
portion is `Complete`** (PR #21, `5575be3`); physical hardware certification
remains deferred.
This direction authorizes no work beyond what those slices already record.

The hardware-independent local input contract must be capable of representing:

- a **primary buzz action**;
- **secondary logical actions** suitable for coloured controller buttons;
- **configurable mappings** that are independent of any particular device model.

**The engine must remain button-agnostic.** Logical actions are what cross into
the command layer; a physical button, its index, its colour and its handset stay
on the adapter side of the boundary that `ROADMAP-AMENDMENT-001` §5.6 fixes.

**Sony Buzz! controllers are the preferred initial hardware validation target.**
Slice 10's host-private setup boundary (candidate classification, capture recipe,
setup test mode) is **`Complete`** under the owner-accepted hardware-independent
boundary; physical certification was completed 2026-08-01/02 (OADL2-S07) under a
temporary external keep-alive with a **bounded** host claim — see
[`../receipts/2026-08-01-oadl2-s07-sony-buzz-physical-certification.md`](../receipts/2026-08-01-oadl2-s07-sony-buzz-physical-certification.md).
Permanent keep-alive architecture remains unresolved.

Slice allocation is unchanged by this direction:

| Slice | Scope | State |
| --- | --- | --- |
| **8** | The hardware-independent **logical** input contract, and keyboard input as its first consumer. | `Complete` (PR #16, `167128d`) |
| **9** | The generic **Gamepad** adapter and configurable mappings. | `Complete` (PR #19, `d16f90d`) |
| **10** | **Sony Buzz!** detection, validation, a recommended profile, handset assignment, and the host setup UX. | `Complete` (PR #21, `5575be3`) — hardware-independent scope; OADL2-S07 bounded physical claim under temp keep-alive (see receipt); permanent keep-alive unresolved |

**A final event vocabulary for secondary actions was deliberately NOT defined in
advance, and neither Slice 8 nor Slice 9 defined one.** Slice 9 made the four
ordinal slots ASSIGNABLE on a controller and left them exactly as inert as before:
they still terminate at the typed `unsupported-action` rejection, so none produces
a command, an event or a state change. Secondary slots exist at the
input-contract and mapping layers; command translation refuses them, so no
secondary action produces a command, an event or a state change. A durable
vocabulary is defined only when a slice supplies an authorized consumer —
`ROADMAP-AMENDMENT-001` §5.1's "no speculative contract without its first
consumer" rule, applied to secondary actions exactly as it was applied to the
timer's interruption seam. See
[`../architecture/ADR-008-local-input-keyboard-buzz.md`](../architecture/ADR-008-local-input-keyboard-buzz.md) §3.

## Owner direction — additional response modes are POST-MVP (2026-07-27)

**Deferred until after the functional MVP is complete. Recorded only.** This is a
parked concept, not a plan: it is **not** inserted into the active roadmap, which
remains **22 slices** (Amendment 003).

The owner has parked additional response-mode work covering:

1. **traditional open-answer buzzer mode** (what the MVP builds today);
2. **buzz-first multiple-choice mode**;
3. **simultaneous speed-based multiple-choice mode**.

The eventual design should permit **clue-level response policies**, so that
open-answer and buzz-first multiple-choice clues may coexist within a single game.

**No schema, event vocabulary, scoring formula, acceptance criteria, roadmap
insertion or implementation is authorized now**, and none exists. Nothing in the
codebase implements, anticipates or reserves space for a response mode or a
multiple-choice question type. When this direction was recorded the immediate
frontier was a separate Slice 14 planning/readiness decision, and this direction
did not authorize it; **Slice 14 is now `Complete`** (PR #32, `ce2e103…`), and
**Amendment 003 delivery and post-merge reconciliation are merged** (PR #35,
`2ebeb24…`; PR #36, `da6b4dc…`). Slice 15 is `Complete`; Slice 16 is `Complete`
on `main` (PR #40, `bc3cea65…`). The immediate frontier is independent review of
the open Slice 16 documentation-only post-merge reconciliation PR, followed by a
stop before merge. Slice 13 is **`Complete`** (PR #27, `6cf4d25…`). Slice 12 is
**`Complete`** (PR #25, `cdb499a…`). Slice 11 is **`Complete`** (PR #23,
`5d47b2f`). Slice 10 remains **`Complete`** under the owner-accepted
hardware-independent boundary; OADL2-S07 recorded a bounded physical claim under
temporary keep-alive (permanent keep-alive unresolved).

Recording this direction authorizes no work of any kind.

## Owner direction — optional team buzz-in sounds are DEFERRED (2026-07-27)

**Recorded only. Deferred. Not a slice, not scheduled, not authorized, and not
implemented.** This was **not** inserted into the active roadmap, which remains
**22 slices**. Nothing in the codebase implements, anticipates or reserves space
for audio.

The owner wants **optional team buzz-in audio cues** eventually, potentially
including farm-animal sounds, funny voices, generic game-show sounds, comic or
funny sound packs, and **custom local audio uploads** — with one sound per team,
randomized selection from a chosen pack, and preview, volume and mute controls.

**Architectural direction, for whenever it is authorized:**

- Sound is a **presentation response to a newly accepted `TEAM_BUZZED` event** —
  never gameplay authority.
- Sound must not alter scoring, queue order, replay, undo, timers, controller
  mappings or the reducer.
- Sound assignment belongs to a **team or a presentation profile** — never to a
  physical keyboard key, controller index, handset, button index or device model.
  (This is the same boundary `ROADMAP-AMENDMENT-001` §5.6 and ADR-008 fix for
  input: the physical side stays on the adapter side.)
- **Visual indication remains required**; sound may never be the only indication
  of a successful buzz.
- A stale snapshot, replay, refresh, reconnect, resynchronization or undo must
  **not** replay old audio.
- Custom audio should remain **local and offline by default**.

**Licensing and distribution boundary — recorded, not a legal determination.**
The owner identifies the **BBC Sound Effects library** as a preferred potential
source for personal, non-commercial classroom use. Independently of that:

- **No BBC audio file is authorized for commitment to this public repository.**
- **No BBC audio file is authorized for inclusion in the public GitHub Pages
  build.**
- **No BBC audio file is authorized for redistribution through the application.**
- A future implementation should support **teacher-supplied local files**.
- **Attribution and licence requirements must be reviewed before use.**
- Broader redistribution, public bundling or commercial use requires **separately
  verified permission**.

No BBC asset was browsed, downloaded, added or referenced as a file by this
reconciliation. Recording this direction authorizes no work of any kind.

## Prohibited next actions

Do **not**: reopen or redefine Slice 14 (it is `Complete` and merged — PR #32 at
`ce2e103…`); reopen or merge Slice 15; merge Slice 16 without separate exact-head
authority; begin Slice 17, Phase 3, or Slices 18–22 without separate authority;
expose private Final or queue data (see the Final and
buzz-queue privacy boundaries below); claim Child B guidance/onboarding delivery
is merged from this handoff;
claim live-route behaviour that was
not directly inspected; over-claim Sony Buzz! beyond the bounded OADL2-S07
receipt (or treat physical certification as incomplete Slice 10 work); add WebHID,
Bluetooth, USB or HID code beyond what Slice 10's host-private boundary already
uses; persist a Gamepad mapping to localStorage, IndexedDB, a game file or the
sync channel; map axes, sticks, analog triggers, motion or haptics; use a
browser controller index or device `id` as a durable identity; poll the Gamepad
API from the reducer, a render, the sanitizer, replay, command planning or the
display route; add a global polling service; give a secondary logical action any
gameplay meaning or any durable event; add first-only lockout; restrict scoring
to an active respondent (`OG-6`, still deferred); add automatic timeout scoring
or make a timer or a buzz move a point; add student-owned contestant devices,
networked buzzers, or remote team input — these remain **excluded**, not merely
deferred; widen Slice 13 persistence into cloud sync, accounts, cross-device
recovery, or a public persistence protocol; add a mid-board Daily Double, a
mid-board hidden wager, or any second wager mechanism beyond the merged Slice 14
`final-wager` round (those remain **excluded by design** — see ADR-014); reopen,
re-scope or re-implement the merged `final-wager` round itself; extend the
Slice 11 media contract beyond text and same-origin static images, add remote
media, audio/video, or timer/media coupling; add a theme engine, or add team
colours beyond the application palette; add buzz-in audio, an audio file,
playback code, an audio schema, an audio event, a sound-pack manifest, a
custom-upload path or an
attribution asset (see the deferred buzz-sound direction — it authorizes none of
it); add spreadsheet/CSV/XLSX/Google Sheets import, an authoring UI, pack
management, a saved game library, or remote URL import; add a backend, accounts,
cross-device sync, analytics, or AI services; add any further playable round type;
weaken fail-closed display behavior; project teacher notes, alternates,
unrevealed content, the score event history, undo metadata, the host's scoring
target, an internal timer id, or an interruption source; read a clock inside
`reduce`, `replay`, the planner's decision logic, or the sanitizer; publish a
per-second or per-frame revision; permit executable imported game code or
imported style values; add dynamic module/plugin loading based on game content;
or move implementation truth into NightWatch or Obsidian.
