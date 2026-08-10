# Status

**Current completed product slice:** Slice 21 — Sony Buzz
Supported-Profile Operationalization
**Slice 20 state:** **Complete** — PR
[#52](https://github.com/ricktron/classroom-quiz-show/pull/52) was exact-head
squash-merged at `86e8f5e6d883e0ca3d02a81e19c7d657f352ccf0` (merged
**2026-08-09T04:11:33Z**) from final accepted exact head
`45142b96ce91c2f7498dbaa6a47cae278b7c4068` (authorized canonical base
`ded704dfc09616183979a75234314eef1f311caa`, the squash commit's **sole**
parent). Accepted-head and squash trees are identical
(`246749b2c1ab699b766194be22f7f4aa8e37195a`) and the direct diff between them is
empty (**exactly 33** paths). Final independent exact-head acceptance
`CQS-SLICE-20-PR52-FINAL-ACCEPTANCE-REVIEW-ES-1` returned
**PASS — EXACT HEAD ACCEPTED FOR MERGE-AUTHORIZATION PREPARATION**. Merge used
the GitHub Pulls REST merge endpoint with a server-side expected-head SHA guard
(`sha=45142b96ce91c2f7498dbaa6a47cae278b7c4068`) under
`AUTHORIZE-CQS-SLICE-20-PR52-EXACT-HEAD-SQUASH-MERGE-AND-POST-MERGE-VERIFICATION-1`
(`CQS-SLICE-20-PR52-MERGE-ES-1`). The delivery adds workbook format **1** and
AuthoringDraft **1** for exactly two profiles — Classic Board (`classic-board`)
and Board + Final (`board-plus-final`) — with SheetJS Community Edition
**0.20.3** (official tarball) at the untrusted transport edge, `fflate@0.8.3`
preflight reuse, model-neutral templates/instructions, hybrid in-app correction,
shared workbook-source diagnostic lifecycle (`transport` / `workbook` / `cell`
preserved through correction and approval), explicit Approve → canonical
schema-1 JSON → mandatory `importGameFromJsonText` → trusted `GameDefinition`
(no second importer; no AuthoringDraft→runtime shortcut; no persistent drafts).
Commands/events/reducer/replay, public wire, sync, pack internals, and Final
runtime remain unchanged. Public-state wire remains **8**; sync envelope **2**;
canonical game-file schema **1**; GameDefinition model **1**; private
active-session wire **1**; IndexedDB schema **3**; pack format **1**; Session
Summary contract **1**; completed-summary envelope **1**; competitive profile
**1**. Post-merge local `npm run verify` on squash `86e8f5e…`: **2283** passed /
**1** skipped. Post-merge CI run `31294040220` **success** (unit **2283**
passed / **1** skipped; Playwright **349** passed / **14** skipped / **3**
flaky / **0** terminal failures); Pages run `31294040228` **success**. The three
flaky cases were the inherited Final mid-refresh signature (`Saved: 100` /
`Not saved yet`) on `desktop-1080p`, `projector-720p`, and `mobile-host`, each
retry-resolved; the flake remains unresolved and is not claimed repaired by
Slice 20. See
[`architecture/ADR-018-spreadsheet-authoring-seed.md`](architecture/ADR-018-spreadsheet-authoring-seed.md),
[`receipts/2026-08-08-slice-20-spreadsheet-authoring-seed-implementation.md`](receipts/2026-08-08-slice-20-spreadsheet-authoring-seed-implementation.md)
(historical implementation evidence; unchanged), and
[`receipts/2026-08-09-slice-20-post-merge-reconciliation.md`](receipts/2026-08-09-slice-20-post-merge-reconciliation.md).
**Slice 19 state:** **Complete** — PR
[#50](https://github.com/ricktron/classroom-quiz-show/pull/50) was exact-head
squash-merged at `95573e2468ee67f9e6e5a221de002f35d6421249` (merged
**2026-08-08T21:25:37Z** / **2026-08-08 16:25:37 CDT**) from final reviewed head
`972c07ba61042401f71c999b959a15997e3fbe51` (authorized base
`a1726e59ac437b84e785f8cfe53740e229de244c`, the squash commit's **sole**
parent). Reviewed-head and squash trees are identical
(`a0c6ec813525cf80ac6210eef594cc5a026a9d00`) and the direct diff between them is
empty (**exactly 63** paths). The delivery adds self-contained portable packs
(`.cqs-pack`, pack format **v1**): exact Slice 12 canonical JSON plus embedded
supported raster media; safe bounded ZIP import/export with integrity limits;
PNG/JPEG/WebP/GIF pack raster support (SVG remains hosted/plain-JSON only);
durable pack media via IndexedDB schema **2 → 3**; host-private resource scope;
clean-environment offline media proof; Save/Load/recovery; export-after-import;
pack metadata not projected publicly. Plain JSON import/export is retained. Sole
dependency addition: exact `fflate@0.8.3`. Independent-review hardening retained
in the merged tree includes pre-read pack cap, bounded hosted media streaming,
production raster decode, correct per-asset limit, export/import collision
symmetry, durable last-reference GC, recovery-discard cleanup,
latest-request-wins / single hydration owner, failed-export published-scope
clearing, and size reject before decode. Commands/events/reducer/replay and
public wire remain unchanged. Public-state wire remains **8**; sync envelope
**2**; canonical game-file schema **1**; GameDefinition model **1**; private
active-session wire **1**; IndexedDB schema **3**; Session Summary contract
**1**; completed-summary envelope **1**; competitive profile **1**. Post-merge
CI run `31279280945` **success** (lint/typecheck/unit/build `93157871416`
**success** — **124** test files / **2225** passed / **1** skipped; Playwright
`93157871440` **success** — **331** passed / **14** skipped / **3** flaky /
**0** terminal failures); Pages run `31279280960` **success** (build
`93157871523`, deploy `93157934430`, deployment `5812844129`, environment
`github-pages`, SHA `95573e2…`). **No** SonarCloud check-run was bound to
post-merge squash `95573e2…` — do not invent post-merge-main Sonar; PR-head
Sonar at reviewed head `972c07b…` was green (Quality Gate OK; Reliability A /
1.0; new bugs 0; S2871 unresolved 0) and remains **pre-merge / PR-head
evidence only**. The three flaky cases were the inherited Final mid-refresh
signature (`Saved: 100` / `Not saved yet`) on `desktop-1080p`, `projector-720p`,
and `mobile-host`, each retry-resolved on retry #1; the flake remains
unresolved and is not claimed repaired by Slice 19. See
[`architecture/ADR-017-self-contained-portable-packs.md`](architecture/ADR-017-self-contained-portable-packs.md),
[`receipts/2026-08-07-slice-19-portable-packs-implementation.md`](receipts/2026-08-07-slice-19-portable-packs-implementation.md),
and
[`receipts/2026-08-08-slice-19-post-merge-reconciliation.md`](receipts/2026-08-08-slice-19-post-merge-reconciliation.md).
**Slice 18 state:** **Complete** — PR
[#46](https://github.com/ricktron/classroom-quiz-show/pull/46) was squash-merged
at `91c7708626caeaa28b15617a1f0938f4944f7680` (merged
**2026-08-07T01:41:48Z**) from final reviewed head
`bd946f323f381931f706d3a2ff3957d911b5c696` (authorized base
`6e29121d850cf4b4a4ba366c706225f208166f93`, the squash commit's **sole**
parent). Reviewed-head and squash trees are identical
(`bc95d77efc15e3f63a3ea15c397df53e904767fc`) and the direct diff between them is
empty (**exactly 22** paths). The delivery implements the accepted Phase 2B
audience-display composition on existing public-state wire **8** without
expanding it: board-first public audience shell under the Slice 17 theme/token
foundation; Nexus Core with compact public timer indicator (R1); adaptive Score
Column / Strip / Deck; compact / expanded / Final Signal Rails with Final Signal
Rail ownership of the primary Final countdown and tie-safe rail status (R1);
quiet-cognition versus louder-consequence presentation; living-board composition;
Final-specific presentation; fail-closed `Scores unavailable` when public team
status is `unavailable` (R1); and public-only audience rendering with privacy
tests. **No** private-state import in audience production code; no sanitizer
expansion; no command/event/reducer, game-authority, persistence, package,
dependency, workflow, or deployment change; no new ADR. Public-state wire remains
**8**; sync envelope **2**; canonical game-file schema **1**; GameDefinition
model **1**; private active-session wire **1**; IndexedDB schema **2** at Slice
18 completion; Session Summary contract **1**; completed-summary envelope **1**;
competitive profile **1**. Post-merge CI run `31138847378` **success**
(lint/typecheck/unit/build `92744217239` **success** — **110** test files /
**2126** passed / **1** skipped; Playwright `92744217248` **success** —
**313** passed / **14** skipped / **3** flaky / **0** terminal failures);
SonarCloud check `92746422985` **success** (Quality Gate passed; dashboard
branch label was a historical-looking quirk — the GitHub check-run was bound to
squash `91c7708…`); Pages run `31138847376` **success** (build `92744216668`,
deploy `92744302090`, deployment `5787310456`, status `16468338818`, SHA
`91c7708…`). The three flaky cases were the inherited Final mid-refresh
signature (`Saved: 100` / `Not saved yet`) on `desktop-1080p`, `projector-720p`,
and `mobile-host`, each retry-resolved on retry #1; the flake remains unresolved
and is not claimed repaired by Slice 18. No live-route or physical-projector
verification was performed in post-merge verification. See
[`plans/CQS-DESIGN-PHASE-2B-DIRECTION.md`](plans/CQS-DESIGN-PHASE-2B-DIRECTION.md),
[`receipts/2026-08-06-slice-18-audience-display-local-verification.md`](receipts/2026-08-06-slice-18-audience-display-local-verification.md),
and
[`receipts/2026-08-06-slice-18-post-merge-reconciliation.md`](receipts/2026-08-06-slice-18-post-merge-reconciliation.md).
**Slice 17 state:** **Complete** — PR
[#44](https://github.com/ricktron/classroom-quiz-show/pull/44) was squash-merged
at `dee2f3c219f9e60113a374ce0ec876ae20c40bc1` (merged
**2026-08-05T23:48:51Z**) from final reviewed head
`3214185ac750be8a9ab1ad170ff3c9d1c7f9f5a4` (authorized base
`6b908d577a588a68f06775a6511e1da3aacc33f3`, the squash commit's **sole**
parent). Reviewed-head and squash trees are identical
(`ae727b3afd258532043269e60bfe49a9b64a07bb`) and the direct diff between them is
empty (**exactly 39** paths). The delivery adds a closed application-owned theme
registry (`default`, `high-contrast`), exact case-sensitive fail-closed
validation, per-window presentation-only theme state, a host-only native theme
selector, validated hash-route display launches with independent display-side
validation, complete semantic tokens including corrected opaque default tile
edge `#35d6e8`, and coverage for high-contrast, reduced-motion, disabled-state,
projector-safety, viewport, team-count, long-name, signed-score, ordering, and
import isolation. **No** game-authority, schema, public-wire, sync, persistence,
event, reducer, summary, export, package, dependency, workflow, or deployment
change. Public-state wire remains **8**; sync envelope **2**; canonical
game-file schema **1**; GameDefinition model **1**; private active-session wire
**1**; IndexedDB schema **2**; Session Summary contract **1**; completed-summary
envelope **1**; competitive profile **1**. Post-merge CI run `31057641812`
**success**; SonarCloud check `92480089319` **success** (external provider;
configured-and-green — correcting an earlier incomplete discovery that inferred
Sonar was unconfigured from the absence of an in-repo Sonar workflow file);
Pages deploy run `31057641869` **success** (deployment `5771220150`). CI
Playwright concluded **301 passed** with **3 flaky** retries matching the
inherited Final mid-refresh signature (`Saved: 100` / `Not saved yet`); that
flake remains unresolved and is not claimed repaired by Slice 17. Merge-lane
local verification also recorded environmental port-4173 web-server and Vitest
worker timeouts under load, then final clean `npm run verify` / `verify:all`
with local e2e **304 passed** / **2 skipped** / **0 failed** / **0 flaky** —
environmental events distinct from the inherited Final flake. See
[`plans/CQS-PHASE-3-DESIGN-SYSTEM-READINESS.md`](plans/CQS-PHASE-3-DESIGN-SYSTEM-READINESS.md),
[`receipts/2026-08-05-slice-17-theme-tokens-local-verification.md`](receipts/2026-08-05-slice-17-theme-tokens-local-verification.md),
and
[`receipts/2026-08-05-slice-17-post-merge-reconciliation.md`](receipts/2026-08-05-slice-17-post-merge-reconciliation.md).
**Slice 16 state:** **Complete** — PR
[#40](https://github.com/ricktron/classroom-quiz-show/pull/40) was squash-merged
at `bc3cea65cab8db1481b0b2420be580cc69932f3d` (merged
**2026-08-05T04:38:20Z**) from final reviewed-and-repaired head
`942575c97b97df220c215a7d265736a797869157` (authorized base
`f92b65fa2d6619d9c2a4d09b5457f0976ff91079`, the squash commit's **sole**
parent). Reviewed-head and squash trees are identical
(`12fea1bc056e6968e13a651161cdf89a6158a558`) and the direct diff between them is
empty. The delivery adds a host-private completed-summary ledger
(`classroom-quiz-show/completed-summary-record`, version **1**), competitive
profiles (version **1**), atomic completion save with active-recovery cleanup,
newest-50 valid retention, confirmed deletion, optional class labels, and
exact-compatible game/team/class reports with quarantine of unknown/corrupt
records. IndexedDB schema moves **1 → 2**; public-state wire remains **8**; sync
envelope **2**; canonical game-file schema **1**; private active-session wire
**1**; Session Summary contract **1**. Semantic-review R1 repairs are in the
merged tree. The inherited Final mid-refresh recovery flake remains unresolved
and is not claimed repaired. See
[`architecture/ADR-016-completed-summary-ledger-compatible-reporting.md`](architecture/ADR-016-completed-summary-ledger-compatible-reporting.md),
[`receipts/2026-08-04-slice-16-local-verification.md`](receipts/2026-08-04-slice-16-local-verification.md),
[`receipts/2026-08-04-slice-16-semantic-review-r1.md`](receipts/2026-08-04-slice-16-semantic-review-r1.md),
and
[`receipts/2026-08-05-slice-16-post-merge-reconciliation.md`](receipts/2026-08-05-slice-16-post-merge-reconciliation.md).
**Slice 15 state:** **Complete** — PR
[#38](https://github.com/ricktron/classroom-quiz-show/pull/38) was squash-merged
at `242539044e45a43eacc6d8334349e59a6987a3d9` (merged
**2026-08-04T19:28:26Z**) from final reviewed-and-repaired head
`d8f6308eccea5144ab1c6b5f49afdfcc2b7d5b5b` (authorized base
`0939d9cafd009e713c8ca83bcc35ff3f90556819`, the squash commit's **sole**
parent). Reviewed-head and squash trees are identical
(`10ac401ebba0daab6e43dc96fa9fdbb4f72b6a9b`) and the direct diff between them is
empty. The Session Summary Contract is a versioned host-private
current-session summary (`classroom-quiz-show/session-summary`, version **1**)
derived from authoritative effective history and replay only: ephemeral and
unavailable after refresh/reset/discard/close/new game; not persisted, exported,
or projected publicly; unsupported authored rounds listed as unavailable without
fabricated metrics; timer-reset counts require a non-idle pre-event response
timer. Public-state wire remains **8**; sync envelope **2**; game-file schema,
private persistence wire, and IndexedDB schema remain **1**. The inherited Final
mid-refresh recovery flake remains unresolved. See
[`architecture/ADR-015-session-summary-contract.md`](architecture/ADR-015-session-summary-contract.md)
and
[`receipts/2026-08-04-slice-15-post-merge-reconciliation.md`](receipts/2026-08-04-slice-15-post-merge-reconciliation.md).
**Slice 14 state:** **Complete** — PR
[#32](https://github.com/ricktron/classroom-quiz-show/pull/32) was squash-merged
at `ce2e103377c5d86c8e0946346cb4cf05dfe7d58d` (merged
**2026-08-03T17:08:37Z**) from final reviewed-and-repaired head
`c2bcc1a5c383d5e6787f7f9a9d9a808c8ffd2d26` (authorized base
`4de1454181ed58bdb282accd136129c3c0eb0f2b`, the squash commit's **sole**
parent). Reviewed-head and squash trees are identical
(`50caaa392d99ceaf057f184af4d049a5bcd3feba`) and the direct diff between them is
empty. The `final-wager` round is the **second playable registered round type**:
frozen eligibility/cap/reveal-order snapshot, host-private wagers, optional
exact-text response capture, two Final windows on ADR-007's clock discipline,
explicit team-by-team reveal, reversible atomic settlement, and bounded tie
handling with sudden death. Public-state wire moves **7 → 8**; sync envelope
remains **2**; game-file schema, `GameDefinition` model, private persistence
wire and IndexedDB schema all remain **1**; no dependency added. See
[`architecture/ADR-014-final-wager-round.md`](architecture/ADR-014-final-wager-round.md)
and
[`receipts/2026-08-03-slice-14-post-merge-reconciliation.md`](receipts/2026-08-03-slice-14-post-merge-reconciliation.md).
**Previous slice:** Slice 19 — Self-Contained Portable Packs (`Complete`,
exact-head squash-merged via PR #50 at `95573e2…`; reconciliation PR #51)
**Current delivery frontier:** Slice 21 product implementation is **`Complete`**
on `main` via PR [#55](https://github.com/ricktron/classroom-quiz-show/pull/55)
squash `b1e6d669e91b55b20261e86a47d7818f069b0252` (merged
**2026-08-10T14:39:15Z**) from accepted exact head
`3bd6c91330298c4374db137e3ce220e0d28a5c2f`; sole parent
`0433f30d9a950d0a196feaf5bb7a57411df77e37`; trees identical at
`22c5e3d3416db05cbd28b3893d07780d72ae1af9`; direct head-to-squash diff empty;
exactly **37** paths; terminal post-merge CI run `31399326956` **success**;
Pages run `31399326758` **success**. Slice 20 remains terminally `Complete`
(PR #52). Slice 19 remains terminally `Complete` (PR #50 / #51). At this
frontier, workbook format is **1**; AuthoringDraft is **1**; pack format is
**1**; IndexedDB schema is **4**; Sony mapping contract **1**; Sony supported
profile **1**; public-state wire **8**; sync envelope **2**; canonical
game-file schema **1**; GameDefinition model **1**; private active-session wire
**1**; Session Summary contract **1**; completed-summary envelope **1**;
competitive profile **1**. Three-controller physical product RC **PASS**
(groups `0–4` / `5–9` / `10–14`; slot 4 / `15–19` historical / owner-accepted).
Known LOW polish debt **F-UX-01**: ordinary setup still exposes some
WebHID/Gamepad jargon. Slice 22 — Minimal Presentation Audio is **authorized
and in implementation review** on branch
`feat/slice-22-minimal-presentation-audio` under
`AUTHORIZE-CQS-SLICE-22-MINIMAL-PRESENTATION-AUDIO-IMPLEMENTATION-2` (exact base
`dd2fd4a09b20764f69505bbd76a96782cc895453`). It is **not** canonically
`Complete` until independent exact-head review, owner listening RC, and merge.
See ADR-020 and the Slice 22 implementation receipt. Slice 23 remains
unauthorized. See
[`architecture/ADR-019-sony-buzz-supported-profile-direct-webhid-keepalive.md`](architecture/ADR-019-sony-buzz-supported-profile-direct-webhid-keepalive.md),
[`receipts/2026-08-09-slice-21-sony-buzz-supported-profile-implementation.md`](receipts/2026-08-09-slice-21-sony-buzz-supported-profile-implementation.md),
[`receipts/2026-08-10-slice-21-pairing-friction-ux-reconciliation.md`](receipts/2026-08-10-slice-21-pairing-friction-ux-reconciliation.md),
and
[`receipts/2026-08-10-slice-21-post-merge-canonical-reconciliation.md`](receipts/2026-08-10-slice-21-post-merge-canonical-reconciliation.md).
**Roadmap:** **23 slices**, amended 2026-08-07 by
[`decisions/ROADMAP-AMENDMENT-004-mvp-audio-and-release-rebalance.md`](decisions/ROADMAP-AMENDMENT-004-mvp-audio-and-release-rebalance.md)
(`CQS-PLAN-S03`; documentation-only). **Amendment 004 planning delivery is
merged and canonical** via PR
[#48](https://github.com/ricktron/classroom-quiz-show/pull/48) (squash
`a73e6f86bf0757aa118cb9c3247f4e6eddaa090b` from reviewed head
`b9e30be96af7d2276cae310ef2601cad4424a635`; sole parent
`ee7ed93c3336a99afc4f1945b0cc8678b855dd8a`; merged **2026-08-07T18:15:39Z**;
reviewed-head and squash trees identical at
`82d938c7e167600a3e283d44d9e2757eee881831`; exactly **12** paths). Durable
merge-evidence pointer:
[`receipts/2026-08-07-cqs-plan-s03-post-merge-reconciliation.md`](receipts/2026-08-07-cqs-plan-s03-post-merge-reconciliation.md).
**PR #48 requires no further review or merge action.** Prior Amendment 003
[`decisions/ROADMAP-AMENDMENT-003-remaining-mvp-rebalance.md`](decisions/ROADMAP-AMENDMENT-003-remaining-mvp-rebalance.md)
(`CQS-PLAN-S02`) rebalanced 18→22 slices; Amendment 001
[`decisions/ROADMAP-AMENDMENT-001-local-buzzers.md`](decisions/ROADMAP-AMENDMENT-001-local-buzzers.md)
grew the plan from 11 to 18 slices (PR #13, `752a3fe`, 2026-07-26). Slices 1–21
are `Complete`; Slices 22–23 remain `Planned` and unauthorized. This STATUS
grants **no** Slice 22 audio or Slice 23 qualification authority.
Phase 2B’s MVP consumers (Slices 17–18) are both `Complete`; Phase 3
design-system readiness has served the theme-foundation → audience-display
sequence; post-MVP arcs remain inactive; theme song remains post-MVP;
`CQS-OD-066` remains unresolved; the inherited Final mid-refresh recovery flake
remains unresolved.

## Slice 14 work (Complete)

The **second playable round type** — `final-wager`, the closing wager round. Full
rationale in
[`architecture/ADR-014-final-wager-round.md`](architecture/ADR-014-final-wager-round.md);
local evidence in
[`receipts/2026-08-03-slice-14-local-verification.md`](receipts/2026-08-03-slice-14-local-verification.md),
review evidence in
[`receipts/2026-08-03-slice-14-pr-review-and-hardening.md`](receipts/2026-08-03-slice-14-pr-review-and-hardening.md),
merge and post-merge evidence in
[`receipts/2026-08-03-slice-14-post-merge-reconciliation.md`](receipts/2026-08-03-slice-14-post-merge-reconciliation.md).

The review's browser acceptance found one blocker, and it was **inherited from
the authorized base, not introduced by Slice 14**: an authored image prompt that
omitted `caption` or `attribution` could not be re-read by the trusted media
normalizer, so the whole round projected nothing. It was repaired under
`AUTHORIZE-CQS-MEDIA-NORMALIZED-PROMPT-REREAD-REPAIR-1`
([receipt](receipts/2026-08-03-media-normalized-prompt-reread-repair.md)) — a
two-guard fix in `src/game/media/definition.ts` that also repairs
`category-board`. **All 24 required browser-acceptance scenarios now pass.**

> **The headline is what it is NOT:** not a game mode, not a preset or policy
> engine, not an extension of `category-board`, and not a parallel store or a
> screen outside command/event/replay. It is a registered round type beside the
> board in the same registry, validated by the same import pipeline, exported by
> the same canonical exporter, persisted by the same private codec.

| Item | State |
| --- | --- |
| `final-wager` registered by application code only; content can never register or replace a schema | Implemented |
| Strict Final config: typed `PromptContent`, answer, optional host-only alternates and notes | Implemented |
| Cross-round rules at import: at most one Final, Final terminal, Final requires teams | Implemented |
| Every previously valid `schemaVersion: 1` game still valid and semantically unchanged | Implemented |
| Final export / re-import structural equality and byte-identical second export | Implemented |
| Classic (positive scores) and Inclusive (all teams) eligibility; Classic is the default | Implemented |
| Per-team eligibility override | **Excluded by design** |
| Eligibility, pre-final scores, wager caps and reveal order FROZEN onto the start event | Implemented |
| Classic Final with zero eligible teams resolves safely on pre-final scores | Implemented |
| Wager cap: positive team = own score; non-positive team = highest preceding effective clue value | Implemented |
| Wager cap further bounded by BOTH score-bound headrooms; never negative | Implemented |
| Zero is an explicit, valid wager; anything outside `0 … cap` is rejected, never clamped | Implemented |
| Global wager lock refused until every eligible team has an explicit wager | Implemented |
| Optional response capture: `exact-text` or `host-only`, chosen once with the window | Implemented |
| Three distinct durable response states; whitespace-only exact text rejected | Implemented |
| Global response lock refused until every eligible team has an explicit state | Implemented |
| Two Final windows reusing ADR-007's durable-facts union; no tick events | Implemented |
| Expiry records ONLY that the window ended — it locks, marks, reveals, adjudicates, settles and completes nothing | Implemented |
| Default reveal order low-to-high with authored order as the deterministic tie-break | Implemented |
| Host may reveal any unrevealed eligible team; the event records the actual choice | Implemented |
| One team revealed at a time; the previous must be settled first | Implemented |
| Atomic reversible settlement; wager and delta read from frozen state, never the command | Implemented |
| Zero-wager settlement recorded as an auditable zero-delta fact | Implemented |
| Resulting total deliberately NOT stored on the settlement event | Implemented |
| Undoing a settlement restores the score AND the revealed-but-unsettled state | Implemented |
| Unique leader requires explicit completion; settlement alone never ends the game | Implemented |
| Tied lead presents both choices; sudden death highlighted but never automatic | Implemented |
| Accepted tie is irreversible and appends the existing `GAME_SESSION_ENDED` beside it | Implemented |
| Sudden death keeps the game active; manual correction narrowed to tied leaders | Implemented |
| `PublicState.round` gains the Final member; wire version **7 → 8** | Implemented |
| Neutral presentation discriminator (`final`), never the registry type | Implemented |
| Exact-key runtime guard for every Final stage; malformed state fails closed | Implemented |
| No unrevealed wager, response, correctness, note, alternate, cap, snapshot, timer id or raw stamp on the wire | Implemented |
| Every Final event encoded/decoded by the existing private codec; wire stays **1** | Implemented |
| Refresh resumes exactly at wager entry, wager lock, response entry, answer reveal, current reveal, partial settlement, unresolved tie and sudden death | Implemented |
| An ENDED game stays non-resumable and is cleared through the existing cleanup | Implemented |
| Sync envelope, game-file schema, `GameDefinition` model, IndexedDB schema | **All unchanged** |
| New dependency, object store, backend, workflow or deployment change | **None** |
| Daily Double, mid-board hidden wagers, presets, policy engines, transcripts, student entry, buzzers in Final | **Not implemented — excluded** |

### Commands / events / public fields (added in Slice 14)

- **Commands (18):** `BEGIN_FINAL_WAGER` · `START_FINAL_WAGER_WINDOW` ·
  `PAUSE_FINAL_WAGER_WINDOW` · `RESUME_FINAL_WAGER_WINDOW` ·
  `EXPIRE_FINAL_WAGER_WINDOW` · `RECORD_FINAL_WAGER` · `LOCK_FINAL_WAGERS` ·
  `START_FINAL_RESPONSE_WINDOW` · `PAUSE_FINAL_RESPONSE_WINDOW` ·
  `RESUME_FINAL_RESPONSE_WINDOW` · `EXPIRE_FINAL_RESPONSE_WINDOW` ·
  `RECORD_FINAL_RESPONSE` · `LOCK_FINAL_RESPONSES` · `REVEAL_FINAL_ANSWER` ·
  `REVEAL_FINAL_TEAM` · `SETTLE_FINAL_TEAM` · `ENTER_FINAL_SUDDEN_DEATH` ·
  `ACCEPT_FINAL_TIED_FINISH`. Each carries the `roundId` it targets.
- **Events (17):** `FINAL_WAGER_STARTED` · `FINAL_WAGER_WINDOW_STARTED` /
  `_PAUSED` / `_RESUMED` / `_EXPIRED` · `FINAL_TEAM_WAGER_RECORDED` ·
  `FINAL_WAGERS_LOCKED` · `FINAL_RESPONSE_WINDOW_STARTED` / `_PAUSED` /
  `_RESUMED` / `_EXPIRED` · `FINAL_TEAM_RESPONSE_RECORDED` ·
  `FINAL_RESPONSES_LOCKED` · `FINAL_ANSWER_REVEALED` · `FINAL_TEAM_REVEALED` ·
  `FINAL_TEAM_SETTLED` · `FINAL_TIE_RESOLUTION_SELECTED`. All reversible except
  `FINAL_TIE_RESOLUTION_SELECTED` when it names `accepted-tie`.
- **Phases:** `setup` · `wager-entry` · `wagers-locked` · `response-entry` ·
  `responses-locked` · `answer-revealed` · `team-reveal` · `resolution` ·
  `sudden-death` · `ready-to-complete` · `ended`.
- **Eligibility modes:** `classic` (default) · `inclusive`.
- **Capture modes:** `exact-text` · `host-only`.
- **Response states:** `exact` · `not-captured` · `no-response`.
- **Outcomes:** `correct` (+wager) · `incorrect` (−wager) · `no-response` (−wager).
- **Tie resolutions:** `sudden-death` (reversible) · `accepted-tie` (irreversible).
- **New rejection reasons (16):** `not-a-final-wager-round`,
  `invalid-final-wager-config`, `invalid-final-phase`, `team-not-eligible`,
  `invalid-final-wager`, `invalid-final-response`, `final-wagers-incomplete`,
  `final-responses-incomplete`, `team-already-revealed`, `team-not-revealed`,
  `team-already-settled`, `final-outcome-mismatch`, `no-tied-lead`,
  `not-a-tied-leader`, `stale-final-window`, `premature-final-window-expiration`.
- **New import issue codes (3):** `duplicate-final-round`,
  `final-round-not-terminal`, `final-round-requires-teams`.
- **`PublicState`:** `PublicRoundState` gains `PublicFinalWagerState`. Wire
  version **7 → 8**; version 7 is rejected, never reinterpreted.

### Documented divergence from ADR-007 §8

A response phase is cleared on a round change because a stale absolute deadline is
nonsense in front of a class. **Final state deliberately survives a round change**
— it holds committed wagers, recorded responses and applied settlements, and
discarding those because a teacher glanced back at an earlier round would destroy
recorded facts. See ADR-014 §14.

## Expanded-vision planning documentation (CQS-PLAN-S01) — Complete

**Slice state: Complete** — the planning-only documentation slice
`CQS-PLAN-S01` (authorization
`AUTHORIZE-CQS-PLAN-S01-EXPANDED-VISION-DOCUMENTATION-1`, repaired under
`AUTHORIZE-CQS-PLAN-S01-ORDINARY-SEMANTIC-REPAIR-1`) was **squash-merged
via [PR #30](https://github.com/ricktron/classroom-quiz-show/pull/30)**
at `44e835cd2b349cd55d4bfc84a34015cb3694b821` (merged
**2026-08-03T01:44:11Z**) from final reviewed head
`df832f6c091852cec419ca0e2faedd7b8fa07724` (evidence state
`CQS-PLAN-S01-ES-2`), and is **post-merge verified**.

| Fact | Value |
| --- | --- |
| PR | [#30](https://github.com/ricktron/classroom-quiz-show/pull/30) (merged and closed) |
| Authorized base / sole squash parent | `1e5815dbb80a49e09f227a664625e85a81bf1c5a` (exactly one parent) |
| Final reviewed head | `df832f6c091852cec419ca0e2faedd7b8fa07724` |
| Squash commit | `44e835cd2b349cd55d4bfc84a34015cb3694b821` |
| Merged | **2026-08-03T01:44:11Z** |
| Reviewed-head / squash tree | identical (`3e799359177e11ce08a31fe5bc603d5a20064b5c`) |
| Post-merge `CI` run | `30777582632` — **success** (both jobs) |
| Post-merge Pages deploy run | `30777582624` — **success** (both jobs) |
| Changed paths | 15, documentation-only |

The slice recorded the expanded gameplay, authoring, analytics, and
operator vision as durable repository truth. **It changed documentation
only**: no runtime code, schema, test, dependency, workflow, or
deployment configuration changed; public-state wire was **7** at that
time, sync envelope **2**, game-file schema **1**. **The MVP was
unchanged and Slice 14 was still `Planned` and unstarted when this
planning slice merged** (Slice 14 has since been implemented, reviewed
and merged — see the Slice 14 merge evidence above) — no expanded-vision
capability was implemented or promoted into current scope, and
implementation authority remains with the Program Orchestrator and
future slice authorizations. The first post-MVP arc remains spreadsheet
and LLM authoring (`CQS-ARC-AUTHORING`); decision 66 (`CQS-OD-066`)
remains unresolved.

Canonical documents added: the owner decision register
([`decisions/EXPANDED-VISION-OWNER-DECISIONS.md`](decisions/EXPANDED-VISION-OWNER-DECISIONS.md)
— all 86 decisions, `CQS-OD-001`…`CQS-OD-086`; **decision 66 remains
unresolved**), the future-architecture amendment
([`decisions/ROADMAP-AMENDMENT-002-expanded-gameplay-vision.md`](decisions/ROADMAP-AMENDMENT-002-expanded-gameplay-vision.md)
— preserves every existing ADR; supersession only via named future arcs),
the product-direction arc
([`plans/EXPANDED-CQS-VISION-ARC.md`](plans/EXPANDED-CQS-VISION-ARC.md)
— first post-MVP arc: spreadsheet and LLM authoring), the deferred-work
register
([`plans/POST-MVP-OPPORTUNITY-AND-TRIGGER-REGISTER.md`](plans/POST-MVP-OPPORTUNITY-AND-TRIGGER-REGISTER.md)),
four domain planning views under [`plans/`](plans/), and the research
record
([`research/GAMEPLAY-GAMIFICATION-AND-AUTHORING-RESEARCH.md`](research/GAMEPLAY-GAMIFICATION-AND-AUTHORING-RESEARCH.md)).
Delivery evidence:
[`receipts/2026-08-03-cqs-expanded-vision-planning.md`](receipts/2026-08-03-cqs-expanded-vision-planning.md)
(ES-1) and
[`receipts/2026-08-03-cqs-expanded-vision-planning-repair-1.md`](receipts/2026-08-03-cqs-expanded-vision-planning-repair-1.md)
(ES-2); post-merge reconciliation:
[`receipts/2026-08-03-cqs-plan-s01-post-merge-reconciliation.md`](receipts/2026-08-03-cqs-plan-s01-post-merge-reconciliation.md).

## Phase 2B design-direction registration — Registered (not a product slice)

**This is accepted program guidance, not an implemented product slice.** Phase 2B
is **not** a numbered MVP slice, does not appear as a product row in the
22-slice plan of record, and delivered **no** runtime behavior.

Registered under `AUTHORIZE-CQS-DESIGN-PHASE-2B-REGISTRATION-1`
(evidence state `CQS-DESIGN-PHASE-2B-ES-1`, authorized base
`6eef3eb9d96c9337756ccf274170d05280fd22d0`) with disposition
**`PASS — PHASE 2B DESIGN DIRECTION ACCEPTED FOR PROGRAM USE`**. The canonical
record is
[`plans/CQS-DESIGN-PHASE-2B-DIRECTION.md`](plans/CQS-DESIGN-PHASE-2B-DIRECTION.md);
delivery evidence is
[`receipts/2026-08-03-cqs-design-phase-2b-registration.md`](receipts/2026-08-03-cqs-design-phase-2b-registration.md).

| Fact | Value |
| --- | --- |
| Kind | Documentation-only registration (**not** a product slice) |
| Disposition | `PASS — PHASE 2B DESIGN DIRECTION ACCEPTED FOR PROGRAM USE` |
| Changed paths | 7, documentation-only |
| Runtime / schema / public wire / test / asset / dependency change | **None** |
| `CQS-OD-*` added or changed | **None** |
| Implementation authorized by registration | **None** — registration alone never authorized Phase 3 or Slices 17–18 |

What the acceptance meant **at registration time** (preserved): the direction is
accepted as audience-display guidance; **at registration** the design was not
yet implemented; the representative artifacts are **evidence, not application
source**; **registration alone** did not authorize Phase 3 or Slices 17–18; and
**no production, projector, accessibility, or Raspberry Pi acceptance** was
created by registration. No artifact bytes were committed and no artifact hash
or path is asserted.

> The Phase 2B design direction was accepted after bounded artifact repair. The
> artifact maintainer reported successful final package verification. The final
> corrected ZIP was not independently reopened by the Program Orchestrator, so no
> independent second checksum audit is claimed.

**Current routing:** MVP implementation consumers of Phase 2B are
**Slice 17 — Theme and Design-Token Foundation** (`Complete` via PR #44) and
**Slice 18 — Audience Display System** (`Complete` via PR #46). Both consumers
are complete; Phase 2B remains a design/planning lineage, not a numbered slice.

## Phase 3 design-system readiness — documentation dependency

**Kind:** documentation/specification only (not a product slice; no runtime).
**Canonical specification:**
[`plans/CQS-PHASE-3-DESIGN-SYSTEM-READINESS.md`](plans/CQS-PHASE-3-DESIGN-SYSTEM-READINESS.md)
(`CQS-PHASE-3-DESIGN-SYSTEM-READINESS`; authorization
`AUTHORIZE-CQS-PHASE3-S17-DESIGN-SYSTEM-READINESS-1`; evidence state
`CQS-PHASE3-S17-DESIGN-SYSTEM-READINESS-ES-1`).

This Phase 3 design-system readiness dependency was **satisfied** when the
specification landed on `main` (implementation base
`6b908d577a588a68f06775a6511e1da3aacc33f3`) and has now been **consumed** by
completed Slice 17 delivery via PR
[#44](https://github.com/ricktron/classroom-quiz-show/pull/44) and subsequent
Slice 18 audience-display composition via PR
[#46](https://github.com/ricktron/classroom-quiz-show/pull/46). The readiness
contract defined the Slice 17 token/theme architecture (hybrid typed registry +
CSS custom properties; closed IDs `default` / `high-contrast`; session-local
selection; no schema/wire/storage theme field). Slice 17 implementation matched
that binding architecture and preserved every stated boundary; Slice 18 consumed
that foundation without changing those boundaries.

**Preserved boundaries and limitations:** public-state wire **8**; sync
envelope **2**; game-file schema **1**; GameDefinition model **1**; private
active-session wire **1**; IndexedDB schema **2**; Session Summary contract
**1**; completed-summary envelope **1**; competitive profile **1**. The
inherited Final mid-refresh recovery flake remains unresolved. `CQS-OD-066`
remains unresolved. No physical-projector, accessibility, WCAG, or Raspberry Pi
certification is claimed. No ADR was warranted.

**Current next action (repository frontier):** Slice 21 — Sony Buzz
Supported-Profile Operationalization is **`Complete`** on `main` via PR
[#55](https://github.com/ricktron/classroom-quiz-show/pull/55) squash
`b1e6d669e91b55b20261e86a47d7818f069b0252` (merged **2026-08-10T14:39:15Z**)
from accepted head `3bd6c91330298c4374db137e3ce220e0d28a5c2f`. Three-controller
physical product RC **PASS**
(`CQS-SLICE-21-PR55-THREE-CONTROLLER-PRODUCT-RC-ES-1` on head `3b0e97f…`);
owner accepted three available handsets as sufficient (groups `0–4` / `5–9` /
`10–14`; slot 4 / `15–19` historical / owner-accepted — not a fresh four-handset
claim). Terminal post-merge verification **PASS**. See ADR-019 and
[`receipts/2026-08-10-slice-21-post-merge-canonical-reconciliation.md`](receipts/2026-08-10-slice-21-post-merge-canonical-reconciliation.md).
**Next planned frontier:** Slice 22 Minimal Presentation Audio is **in
implementation review** (not Complete; owner listening RC pending). Slice 20 is `Complete` via PR #52; Slice 19 is
`Complete` via PR #50. No further Phase 3 readiness registration, Slice 17,
Slice 18, Slice 19, Slice 20, or Slice 21 product lane is owed.

## Remaining-MVP rebalance planning (CQS-PLAN-S02) — Complete

**Planning slice state: Complete** — `CQS-PLAN-S02` /
`ROADMAP-AMENDMENT-003` delivery was **squash-merged via
[PR #35](https://github.com/ricktron/classroom-quiz-show/pull/35)** at
`2ebeb24099d5f63ccd3247ffb8e8744f89c039bc` (merged **2026-08-04T03:41:30Z**)
from final reviewed head `c637b979fa6e575c28dd6eb73dfbd52a76e93d35`
(authorized base / sole squash parent
`4df76f1dd504f0fdef5b27417edeec90471e6b62`; evidence state
`CQS-PLAN-S02-ES-1`), with **identical reviewed-head and squash trees**
(`5ea188f5117d9f92bca6d3f83da57d7c868c3395`) and an **empty direct diff**.
Post-merge `CI` and Pages both succeeded. The **22-slice plan is now
canonical on `main`**.

| Fact (delivery PR #35) | Value |
| --- | --- |
| PR | [#35](https://github.com/ricktron/classroom-quiz-show/pull/35) (merged and closed) |
| Authorized base / sole squash parent | `4df76f1dd504f0fdef5b27417edeec90471e6b62` (exactly one parent) |
| Final reviewed head | `c637b979fa6e575c28dd6eb73dfbd52a76e93d35` |
| Squash commit | `2ebeb24099d5f63ccd3247ffb8e8744f89c039bc` |
| Merged | **2026-08-04T03:41:30Z** |
| Reviewed-head / squash tree | identical (`5ea188f5117d9f92bca6d3f83da57d7c868c3395`); direct diff empty |
| Post-merge `CI` run | `30875474982` — **success** (Lint/typecheck/unit/build; Playwright e2e) |
| SonarCloud on squash | **success** |
| Post-merge Pages deploy run | `30875474980` — **success** (Build + Deploy) |
| Changed paths (PR #35) | exactly **13**, documentation-only Markdown |

Post-merge reconciliation was **squash-merged via
[PR #36](https://github.com/ricktron/classroom-quiz-show/pull/36)** at
`da6b4dc3080abf9a8effe142e19a4eb36aa6ad8d` (merged **2026-08-04T14:03:30Z**)
from reviewed head `2457d6c0d27976855a0d247554730ec2f0efe899` (evidence state
`CQS-PLAN-S02-POST-MERGE-RECON-ES-1`), with identical trees
(`bc531b8d5b7d917635c4220431ac8e1a4c5d69ac`), empty direct diff, and
post-merge CI / Sonar / Pages success. **PR #36 requires no further review or
merge action.**

| Fact (reconciliation PR #36) | Value |
| --- | --- |
| PR | [#36](https://github.com/ricktron/classroom-quiz-show/pull/36) (merged and closed) |
| Authorized base / sole squash parent | `2ebeb24099d5f63ccd3247ffb8e8744f89c039bc` |
| Final reviewed head | `2457d6c0d27976855a0d247554730ec2f0efe899` |
| Squash commit | `da6b4dc3080abf9a8effe142e19a4eb36aa6ad8d` |
| Merged | **2026-08-04T14:03:30Z** |
| Reviewed-head / squash tree | identical (`bc531b8d5b7d917635c4220431ac8e1a4c5d69ac`); direct diff empty |
| Post-merge `CI` run | `30916960892` — **success** |
| SonarCloud on squash | **success** |
| Post-merge Pages deploy run | `30916961449` — **success** |
| Changed paths (PR #36) | exactly **5**, documentation-only Markdown |

What landed at amendment time: the remaining unstarted Slices 15–18 were
replaced by Slices 15–22; Slices **1–14 were `Complete`**; Slices **15–22 were
`Planned` and unstarted**. Amendment 003 granted **no Slice 15 implementation
authority**. Decision 66 (`CQS-OD-066`) remains unresolved. No runtime code,
schema, test, dependency, workflow, or deployment configuration changed by
CQS-PLAN-S02.

Delivery / repair evidence (historical; pre-merge statements preserved):
[`receipts/2026-08-03-cqs-remaining-mvp-rebalance.md`](receipts/2026-08-03-cqs-remaining-mvp-rebalance.md).
Post-merge reconciliation evidence:
[`receipts/2026-08-03-cqs-plan-s02-post-merge-reconciliation.md`](receipts/2026-08-03-cqs-plan-s02-post-merge-reconciliation.md)
(`CQS-PLAN-S02-POST-MERGE-RECON-ES-1`).
Post-merge registration evidence:
[`receipts/2026-08-04-cqs-plan-s02-post-merge-registration.md`](receipts/2026-08-04-cqs-plan-s02-post-merge-registration.md)
(`CQS-PLAN-S02-POST-MERGE-REG-ES-1`).

**CQS-PLAN-S02 delivery and post-merge reconciliation are complete on
`main`.** Slice 15 has since been delivered and squash-merged via PR #38 (see
Slice 15 status above). Slice 16 has since been delivered and squash-merged via
PR [#40](https://github.com/ricktron/classroom-quiz-show/pull/40) at
`bc3cea65cab8db1481b0b2420be580cc69932f3d` (see Slice 16 status above).
**PR #40 requires no further review or merge action.** Post-merge reconciliation
was squash-merged via PR
[#41](https://github.com/ricktron/classroom-quiz-show/pull/41) at
`3ee239a1341749aa03d2bbbfa780aece74c07be5`. **PR #41 requires no further review
or merge action.** The Slice 16 PR #41 post-merge canonicalization recorded in
[`receipts/2026-08-05-slice-16-pr41-post-merge-canonicalization.md`](receipts/2026-08-05-slice-16-pr41-post-merge-canonicalization.md)
closes the remaining stale-routing defect. Phase 3 design-system readiness was
satisfied and then consumed by completed Slices 17–18 (PR #44, PR #46). Slice 19
has since completed via PR #50. Slice 20 has since completed via PR #52. Slice 21
has since completed via PR #55. The current next safe action is the next planned
frontier, Slice 22 — Minimal Presentation Audio (`PLANNED` / not started /
requires separate owner authorization) — not further review of PR #36, PR #38,
PR #40, PR #41, PR #44, PR #46, PR #50, PR #52, or PR #55, and not Slice 22
implementation from this surface alone.

## Slice 14 merge evidence

| Fact | Value |
| --- | --- |
| PR | [#32](https://github.com/ricktron/classroom-quiz-show/pull/32) (merged and closed) |
| Authorized base / sole squash parent | `4de1454181ed58bdb282accd136129c3c0eb0f2b` (exactly one parent) |
| Final reviewed-and-repaired head | `c2bcc1a5c383d5e6787f7f9a9d9a808c8ffd2d26` |
| Squash commit | `ce2e103377c5d86c8e0946346cb4cf05dfe7d58d` |
| Merged | **2026-08-03T17:08:37Z** |
| Reviewed-head / squash tree | identical (`50caaa392d99ceaf057f184af4d049a5bcd3feba`); direct diff empty |
| Changed paths | 56 (+11,672 / −100) |
| Pre-merge CI run (exact head) | `30832657245` — **success** (both jobs); Sonar quality gate **passed** |
| Post-merge `CI` run | `30835406335` — **success** (Lint/typecheck/unit/build **success**; Playwright e2e **success**) |
| Post-merge Pages deploy run | `30835407341` — **success** |
| Browser acceptance | **24 of 24** required scenarios passed |

Slice 14 delivers the second playable registered round type. Its review surfaced
one blocker that was **inherited from the authorized base, not introduced by
this slice**: `normalizeImagePrompt` rejected its own normalized output when an
optional `caption` or `attribution` was omitted, so an authored image round
published no public DTO at all. It was repaired before merge under
`AUTHORIZE-CQS-MEDIA-NORMALIZED-PROMPT-REREAD-REPAIR-1`
([receipt](receipts/2026-08-03-media-normalized-prompt-reread-repair.md)), and
the repair also fixes `category-board`. Public-state wire is now **8**; sync
envelope **2**; game-file schema **1**; `GameDefinition` model **1**; private
persistence wire **1**; IndexedDB schema **1**. No dependency, lockfile or
workflow change.

## Slice 12 merge evidence

| Fact | Value |
| --- | --- |
| PR | [#25](https://github.com/ricktron/classroom-quiz-show/pull/25) |
| Authorized base | `7c1a35c096d1d0654ea951f29aa49d0910f4c429` |
| Final reviewed head | `e63ef7f19aac7b1cf72ccd5cc640e3296550dae7` |
| Squash commit | `cdb499a1a1924ceb12014d37741b500fd9346214` |
| Merged | **2026-07-28T19:36:25Z** |
| Game-file schema | version **1** |
| Public-state wire | version **7** |
| Sync envelope | version **2** |
| Host-only export | yes |
| Media paths | preserved; files not bundled |
| Persistence | **not** implemented (Slice 13) |

### PR-head verification (observed on PR #25)

At final reviewed head `e63ef7f…`:

- `Lint, typecheck, unit tests, build` — **pass**
- `Playwright e2e` — **pass**
- `SonarCloud Code Analysis` — **pass**

### Observed post-merge workflows (on squash `cdb499a…`)

- `CI` run `30392677918` — **success** (completed; ~3m28s)
- `Deploy to GitHub Pages` run `30392677910` — **success** (completed; ~52s)

## Slice 13 merge evidence

| Fact | Value |
| --- | --- |
| PR | [#27](https://github.com/ricktron/classroom-quiz-show/pull/27) |
| Slice ID | `CQS-SLICE-13-PERSISTENCE` |
| OADL contribution | `OADL-S06-CQS-PERSISTENCE-PILOT` |
| Authorized base | `3fd212994c0e8b651193460de633995fe80a25df` |
| Final reviewed head | `ad0867ab6d7e00f397de51dfad2363f35bc181d7` |
| Squash commit | `6cf4d2579ab558f8c4b7eabca0b94df4acc6f20c` |
| Squash parent | `3fd212994c0e8b651193460de633995fe80a25df` (exactly one parent) |
| Merged | **2026-07-29T21:27:59Z** |
| Reviewed-head / squash tree | identical (`e0434e45b5b51e281e8833cbf9c3293466aa6ce1`) |
| PR totals | **39** files; **+4,128** / **−38**; **2** pre-squash commits |
| Game-file schema | version **1** |
| Public-state wire | version **7** |
| Sync envelope | version **2** |
| Dependencies | **unchanged** |
| Live-route verification | **not** manually performed |

### PR-head verification (observed on PR #27 at `ad0867a…`)

- `Lint, typecheck, unit tests, build` — **pass**
- `Playwright e2e` — **pass**
- `SonarCloud Code Analysis` — **pass**
- Sonar quality gate — **OK** (Reliability **A**, Security **A**, Maintainability **A**)
- One non-gate-driving `typescript:S3776` decoder-complexity advisory remains
  deferred (`sessionWire` decode)

### Observed post-merge workflows (on squash `6cf4d25…`)

- `CI` run `30492479720` — **success** (completed **2026-07-29T21:33:24Z**)
- `Deploy to GitHub Pages` run `30492480593` — **success** (completed
  **2026-07-29T21:28:53Z**)

### Local verification (from immutable Slice 13 receipts)

- Unit: **1,604** passed / **1** skipped
- E2E: **235** passed / **2** skipped
- Sonar findings inspected: **20**; true positives fixed: **19**; deferred: **1**
- Implementation repair loops: **2**; Sonar polish loops: **1**

Post-merge reconciliation receipt:
[`receipts/2026-07-29-slice-13-post-merge-reconciliation.md`](receipts/2026-07-29-slice-13-post-merge-reconciliation.md).

### Child B local verification

Child B (guidance onboarding) local verification is recorded in the matching
receipt under `docs/receipts/` when that packet is finalized. This STATUS
surface does not claim that the Child B delivery branch or PR is merged.

## State vocabulary

`Planned` · `In progress` · `In review` · `Complete` · `Blocked` · `Unknown`

> Slice 1 is **Complete** (merged, deployed, owner-accepted — see the post-merge
> reconciliation receipt
> [`receipts/2026-07-22-slice-1-post-merge-reconciliation.md`](receipts/2026-07-22-slice-1-post-merge-reconciliation.md)).
> Slice 2 is **Complete**: implementation PR #3 was merged to `main` (merge
> commit `883111e`, merged 2026-07-22T23:00:07Z) with CI green, and the post-merge
> reconciliation is recorded in
> [`receipts/2026-07-22-slice-2-post-merge-reconciliation.md`](receipts/2026-07-22-slice-2-post-merge-reconciliation.md).
> Slice 3 is **Complete**: implementation PR #5 was merged to `main` (merge
> commit `01070c8`, merged 2026-07-23T19:18:32Z) with CI green (final reviewed
> head `464ef07`), and the post-merge reconciliation is recorded in
> [`receipts/2026-07-23-slice-3-post-merge-reconciliation.md`](receipts/2026-07-23-slice-3-post-merge-reconciliation.md).
> Slice 4 is **Complete**: implementation PR #7 was merged to `main` (merge
> commit `5295e83`, merged 2026-07-25T20:14:42Z; final reviewed head `8ce850c`).
> Post-merge CI on `main` is green (both jobs success) and the Pages deployment
> succeeded; the post-merge reconciliation is recorded in
> [`receipts/2026-07-25-slice-4-post-merge-reconciliation.md`](receipts/2026-07-25-slice-4-post-merge-reconciliation.md).
> **Note:** the owner merged before **Playwright e2e** had concluded on the PR
> head (it concluded success ~23 s after the merge); SonarCloud and the
> lint/typecheck/unit/build job had both already reported success. The receipt
> records this precisely rather than claiming all checks were green pre-merge.
> Slice 5 is **Complete**: implementation PR #9 was merged to `main` (merge
> commit `2ec69323c203a989b06610e6506475e875a40e45`, merged
> 2026-07-26T05:02:33Z; implementation commit `f8c4517`, final reviewed head
> `5e6994e`). All three PR checks were green before merge, **post-merge CI on
> `main` at `2ec6932` concluded success**, and the **Pages deployment
> succeeded**. Post-merge reconciliation is recorded in
> [`receipts/2026-07-26-slice-5-post-merge-reconciliation.md`](receipts/2026-07-26-slice-5-post-merge-reconciliation.md).
> Slice 6 is **Complete**: implementation PR #11 was merged to `main` (merge
> commit `67180a3a24b43124ce7a2dee91d02fe1f797618e`, merged
> 2026-07-26T15:58:11Z by `ricktron`; based on `main` at
> `5237a1f9f6b451c2137330fd0a7f4613b7a919f2`, implementation commit `7734065`,
> final reviewed head `48ed8180278b6966080be6ce00a0e3b06ca3abf1`). All three PR
> checks were green before merge, **post-merge CI on `main` at `67180a3`
> concluded success for both jobs**, and the **Pages deployment succeeded (build
> + deploy)**. **Manual live-route verification was not performed** — the
> reconciliation sandbox's network policy denies `ricktron.github.io`. Post-merge
> reconciliation is recorded in
> [`receipts/2026-07-26-slice-6-post-merge-reconciliation.md`](receipts/2026-07-26-slice-6-post-merge-reconciliation.md).
> On 2026-07-26 the owner authorized a planning-only **roadmap amendment**
> ([`decisions/ROADMAP-AMENDMENT-001-local-buzzers.md`](decisions/ROADMAP-AMENDMENT-001-local-buzzers.md)):
> local host-attached USB buzzers became an approved future capability, the MVP
> non-goal excluding "student devices/buzzers" was narrowed (student-owned
> devices and networked buzzers stay excluded), Slice 7 was renamed and re-scoped
> to **Timers, arming & transitions**, and the 11-slice plan became 18 slices.
> **That amendment changed documentation only — no runtime code, schema, test,
> workflow or dependency changed, and no implementation slice was started by it.**
> It was **merged to `main` via [PR #13](https://github.com/ricktron/classroom-quiz-show/pull/13)**
> (merge commit `752a3fe0f45fdc1ee687339134023c3811facd91`, merged
> 2026-07-26T20:02:13Z by `ricktron`; reviewed head `2524e745`), with all three PR
> checks green.
> Slice 7 is **Complete**: owner-authorized and implemented on
> `claude/slice-7-timers-arming-transitions-wd7cmf` from `main` at `752a3fe`
> (implementation commit `f804430`, final reviewed head
> `43cc66c5fc2a01cdb46daa1b52b7df08184b0448`). Merged to `main` via
> **[PR #14](https://github.com/ricktron/classroom-quiz-show/pull/14)** (merge
> commit `3f9ae1c4c7f9f6e37bac08bf519dbd8ef68af42a`, merged
> 2026-07-26T23:43:51Z by `ricktron`) with all three PR checks green. The merge
> commit's second parent **is** the reviewed head, so the head that was reviewed
> is the head that merged. **Post-merge CI on `main` at `3f9ae1c` concluded
> success for both jobs**, and the **Pages deployment succeeded (build +
> deploy)**. **Manual live-route verification was not performed** — the sandbox
> network policy denies `ricktron.github.io`. Post-merge reconciliation is
> recorded in
> [`receipts/2026-07-27-slice-7-post-merge-reconciliation.md`](receipts/2026-07-27-slice-7-post-merge-reconciliation.md).
> Slice 8 is **Complete**: owner-authorized and implemented on
> `claude/slice-8-local-input-keyboard-thn7bn`, branched from `main` at
> `004bf9d55d7d7a22b19414e11ffdd050d98fb31f` (the PR #15 merge commit;
> implementation commit `1fbe16f`, final reviewed head
> `7d127188a20ce6bdf844c272db7b717cf5a2825a`). Merged to `main` via
> **[PR #16](https://github.com/ricktron/classroom-quiz-show/pull/16)** (merge
> commit `167128dc6462d10192afe92e85026918ebce7ba0`, merged
> **2026-07-27T02:46:24Z** by `ricktron`). The merge commit has **two parents**,
> so it is a true merge commit, and its **second parent is the reviewed head** —
> the head that was reviewed is exactly the head that merged. All three PR checks
> were green at that head (`Lint, typecheck, unit tests, build`; `Playwright
> e2e`; `SonarCloud Code Analysis`). **Post-merge CI on `main` at `167128d`
> concluded success**, and the **Pages deployment succeeded**. **Manual
> live-route verification was not performed** — the sandbox network policy denies
> `ricktron.github.io`. Local verification is recorded in
> [`receipts/2026-07-27-slice-8-local-verification.md`](receipts/2026-07-27-slice-8-local-verification.md);
> post-merge reconciliation in
> [`receipts/2026-07-27-slice-8-post-merge-reconciliation.md`](receipts/2026-07-27-slice-8-post-merge-reconciliation.md).
> Slice 9 is **Complete**: implementation PR #19 was merged to `main` (merge
> commit `d16f90de94bcbed9a83dfed5e7259a9da5e6a618`, merged
> **2026-07-27T05:33:05Z** by `ricktron`; final reviewed head
> `f63d5c190d7747f3a48a3e91a1358868229a170a`, which is the merge commit's
> **second parent**, so the head that was reviewed is the head that merged). All
> three checks were green at that head (`Lint, typecheck, unit tests, build`;
> `Playwright e2e`; `SonarCloud Code Analysis`). **Post-merge CI on `main` at
> `d16f90d` concluded success** (`CI` run `30240064570`), and the **Pages
> deployment succeeded** (run `30240064595`). The document root was later reachable
> by HTTP HEAD (**200**; `Last-Modified` consistent with that deploy); the response
> body was not inspected, `/host` and `/display` were not exercised, Gamepad
> behavior was not tested on the deployed application, and **no live-route or
> application-behavior claim is made**. Local verification is recorded in
> [`receipts/2026-07-27-slice-9-local-verification.md`](receipts/2026-07-27-slice-9-local-verification.md);
> post-merge reconciliation in
> [`receipts/2026-07-27-slice-9-post-merge-reconciliation.md`](receipts/2026-07-27-slice-9-post-merge-reconciliation.md).
> **Slice 10 is `Complete`**: implementation PR #21 was **squash-merged** to
> `main` at `5575be35d76ae0f0d3b36394431b7873883b78ac` (merged
> **2026-07-28T02:35:09Z**; single parent `0bcfed11fc9e63e7190942a41d4db1308dab66a4`;
> final reviewed head `288593391776be1d89b7f5ab9820e147946e56f9`). Exact
> changed-file lists match (28 paths) and every reviewed blob equals the merged
> blob. PR checks at that head were green (`Lint, typecheck, unit tests, build`;
> `Playwright e2e`; `SonarCloud Code Analysis`). **Post-merge CI on `main` at
> `5575be3` concluded success** (`CI` run `30323528440`), and the **Pages
> deployment succeeded** (run `30323528437`). Local post-merge `verify:all` on
> clean `main` at `5575be3` passed (**1415** unit tests; **202** e2e passed /
> **2** skipped). Completion covers the owner-accepted hardware-independent
> scope; **physical Sony Buzz! certification has a bounded host claim under a
> temporary keep-alive** (permanent keep-alive remained unresolved at that
> stage; later resolved for the exact supported Namtai wireless `Wbuzz`
> `054c:1000` profile by Slice 21 / ADR-019).
> OADL2-S07 on the correct host (`macdaddy` / `Ricks-MacBook-Air.local`, wireless
> Namtai `Wbuzz` `054c:1000`) showed that, on this macOS/Chrome configuration, a
> temporary external HID **output** keep-alive kept handsets responsive, enabled
> a complete serial 4×5 browser matrix, and — via Playwright-assisted CQS —
> completed guided setup A–D, test mode, primary-Red gameplay, and keyboard
> fallback; Gamepad API cannot send that keep-alive; hot-plug recovery without
> helper restart was not shown — see
> [`receipts/2026-08-01-oadl2-s07-sony-buzz-physical-certification.md`](receipts/2026-08-01-oadl2-s07-sony-buzz-physical-certification.md).
> See
> [`architecture/ADR-010-sony-buzz-profile-and-setup.md`](architecture/ADR-010-sony-buzz-profile-and-setup.md)
> and receipts
> [`receipts/2026-07-27-slice-10-hardware-independent-local-verification.md`](receipts/2026-07-27-slice-10-hardware-independent-local-verification.md),
> [`receipts/2026-07-28-slice-10-pr-review-and-sonar-disposition.md`](receipts/2026-07-28-slice-10-pr-review-and-sonar-disposition.md),
> [`receipts/2026-07-28-slice-10-owner-acceptance-amendment.md`](receipts/2026-07-28-slice-10-owner-acceptance-amendment.md),
> [`receipts/2026-07-28-slice-10-post-merge-reconciliation.md`](receipts/2026-07-28-slice-10-post-merge-reconciliation.md).
> WebHID and Bluetooth remain excluded.
> **Slice 11 is `Complete`**: implementation PR #23 was **squash-merged** to
> `main` at `5d47b2f641e1a96c2066ec22731f4e751288b39a` (merged
> **2026-07-28T04:56:27Z**; single parent `ce1dc61d8a10cea16c91331fa04da8b04dfdeecd`;
> final reviewed head `bb8bd94b016a99f9782793f3eda6b6fd2d59a0b5`). Exact
> changed-file lists match (**40** paths) and every reviewed blob equals the
> merged blob (stable patch IDs also identical). PR checks at that head were
> green (`Lint, typecheck, unit tests, build`; `Playwright e2e`; `SonarCloud
> Code Analysis`). **Post-merge CI on `main` at `5d47b2f` concluded success**
> (`CI` run `30330154643`; **214** e2e passed / **2** skipped), and the **Pages
> deployment succeeded** (run `30330154633`). Local post-merge `verify:all` on
> clean `main` at `5d47b2f` passed (**1485** unit tests / **63** files; **214**
> e2e passed / **2** skipped). Typed prompt media contract (legacy text +
> same-origin static image) landed on game-file `schemaVersion: 1` with
> `PUBLIC_STATE_SCHEMA_VERSION` **7** and `SYNC_SCHEMA_VERSION` **2**. See
> [`architecture/ADR-011-media-contract.md`](architecture/ADR-011-media-contract.md)
> and receipts
> [`receipts/2026-07-27-slice-11-local-verification.md`](receipts/2026-07-27-slice-11-local-verification.md),
> [`receipts/2026-07-27-slice-11-pr-review-and-hardening.md`](receipts/2026-07-27-slice-11-pr-review-and-hardening.md),
> [`receipts/2026-07-28-slice-11-post-merge-reconciliation.md`](receipts/2026-07-28-slice-11-post-merge-reconciliation.md).
>
> **Repository hygiene (2026-07-27).** `main` is the repository's GitHub default
> branch. **PR #17 was closed without merging**: it was an erroneous reversed pull
> request (head `main`, base the abandoned `claude/classroom-quiz-show-slice-1-a6ogu4`)
> created only because that abandoned Slice 1 branch was still configured as the
> default branch. The abandoned branch has been **deleted**. Do not assert the
> current number of remote branches from this historical note.

## Slice 8 work (Complete)

The hardware-independent **local input boundary** and keyboard buzz-in. Full
rationale in
[`architecture/ADR-008-local-input-keyboard-buzz.md`](architecture/ADR-008-local-input-keyboard-buzz.md);
local evidence in
[`receipts/2026-07-27-slice-8-local-verification.md`](receipts/2026-07-27-slice-8-local-verification.md).
Merged to `main` via PR #16 (merge commit `167128d`); post-merge evidence is in
[`receipts/2026-07-27-slice-8-post-merge-reconciliation.md`](receipts/2026-07-27-slice-8-post-merge-reconciliation.md).

| Item | State |
| --- | --- |
| Layered boundary: raw input → adapter → logical action → command → event → reducer → sanitized state | Implemented |
| Domain receives no `KeyboardEvent`, key code, device id, vendor/product id or mapping | Implemented |
| Physical input identity, logical action, team assignment and game command kept separate | Implemented |
| Bounded logical action vocabulary: `primary-buzz` + four ORDINAL `secondary` slots | Implemented |
| Secondary actions representable and mappable but **inert** — translation refuses them | Implemented |
| No colour name, device model, vendor or button index anywhere in the engine (asserted by test) | Implemented |
| Bounded, application-only input-source union (no plugin framework, no dynamic lookup) | Implemented |
| `KeyboardEvent.code` (physical position) chosen over `key`, documented and tested | Implemented |
| Reserved keys (`Tab`/`Enter`/`Space`/`Escape`/`F5`/modifiers) unbindable and unresolvable | Implemented |
| Key repeat, held keys, IME composition, modifier chords and text entry never buzz | Implemented |
| A focused `<button>` is NOT text entry (buzzing survives ordinary host clicking) | Implemented |
| `preventDefault` only for an ACCEPTED buzz; bubble-phase listener; no global shortcut hijack | Implemented |
| Mapping validation: duplicate keys, reserved keys, unknown teams, duplicate team primaries | Implemented |
| No silent overwrite, no repair, no drop — structured issues addressed to the binding | Implemented |
| Safe digit-row defaults, one key per team in authored order | Implemented |
| Versioned browser-local mapping storage; validated on load; wholesale safe fallback | Implemented |
| Removed teams pruned; renamed teams keep their key (id is identity) | Implemented |
| Storage separate from game content, event log, export and Slice 13 persistence | Implemented |
| Manual arming (`OG-1`) reused as the intake gate; **no second keyboard-arm flag** | Implemented |
| Disarm stops acceptance immediately; expiry disarms and refuses later presses | Implemented |
| Full ordered queue (`OG-2`); a team appears at most once per response opportunity | Implemented |
| Queue order from the event log's `seq`; `occurredAt` is evidence, never authority | Implemented |
| Explicit active respondent, waiting queue, empty, exhausted and closed states | Implemented |
| First accepted buzz interrupts via Slice 7's typed seam — one new source member | Implemented |
| Later buzzes cannot re-interrupt (structural); a rejected buzz never touches the timer | Implemented |
| Promotion after incorrect / host pass (`OG-3`) as ONE typed command | Implemented |
| Neither resolution moves a point; no automatic deduction invented | Implemented |
| Response-opportunity identity `(roundId, tileId)`; stale presses inert | Implemented |
| Queue cleared by selection, answer reveal, return, round change, reset, game end | Implemented |
| `PublicState.response.buzz` allow-list DTO (active key + waiting count); wire version 5 → 6 | Implemented |
| Ordered waiting list, team ids, resolved teams, keys, mappings and adapters never projected | Implemented |
| Sync envelope unchanged at version 2 (no transport metadata needed) | Implemented |
| Replay bit-exact; undo restores prior armed state, timer, active team and queue order | Implemented |
| Host panel: mapping editor, key capture, conflict messaging, queue, incorrect/pass, reasons | Implemented |
| Projector panel: active team + waiting count, in words, no animation | Implemented |
| Accessibility: real buttons, polite live regions, no colour-only state, no key while typing | Implemented |
| Unit, component and browser tests; docs (ADR-008, plan, handoff, receipt) | Implemented |
| Scoring restricted to the active respondent (`OG-6`) | **Deferred — not implemented** |
| Gamepad, WebHID, Bluetooth, Sony Buzz!, controller assignment, coloured defaults, setup UX | **Not implemented in Slice 8** (generic Gamepad arrived in Slice 9; Sony/WebHID/Bluetooth remain Slice 10 or excluded) |

### Commands / events / public fields (added in Slice 8)

- **Commands (2):** `RECORD_TEAM_BUZZ` (`roundId` + `tileId` + `teamId`) ·
  `RESOLVE_ACTIVE_RESPONSE` (`roundId` + `tileId` + typed `resolution`).
- **Events (2, both reversible):** `TEAM_BUZZED` (`tileId`, `teamId`) ·
  `ACTIVE_RESPONSE_RESOLVED` (`tileId`, `teamId`, `resolution`).
- **Resolutions:** `incorrect` · `passed`. There is deliberately no `correct` —
  a correct answer ends the opportunity through the existing answer reveal.
- **Interruption sources:** `host` · **`team-buzz`** (new). Unrecognized values
  still fail closed at the command boundary and again on event application.
- **Logical actions:** `primary-buzz` · `secondary` with slots `secondary1`…
  `secondary4` (representable, mappable, **inert**).
- **Input sources:** `keyboard` (the only member as of Slice 8; **Slice 9 added
  `gamepad` together with its adapter**).

## Slice 9 work (Complete)

The generic **Gamepad adapter** behind the Slice 8 boundary. Full rationale in
[`architecture/ADR-009-generic-gamepad-adapter.md`](architecture/ADR-009-generic-gamepad-adapter.md);
local evidence in
[`receipts/2026-07-27-slice-9-local-verification.md`](receipts/2026-07-27-slice-9-local-verification.md).
Merged to `main` via PR #19 (merge commit `d16f90d`); post-merge evidence is in
[`receipts/2026-07-27-slice-9-post-merge-reconciliation.md`](receipts/2026-07-27-slice-9-post-merge-reconciliation.md).

> **The headline is what did NOT change:** no schema, no `PublicState`, no sync
> protocol version, no command, no event, no reducer, no queue logic, no timer
> transition and no scoring behaviour. `LOCAL_INPUT_SOURCE_KINDS` gained exactly
> one member.

| Item | State |
| --- | --- |
| `gamepad` added to the bounded, application-only input-source union, **with its adapter** | Implemented |
| Generic Gamepad buttons translate to the EXISTING logical actions | Implemented |
| Existing translator, command, event, reducer, queue and sanitizer used unchanged | Implemented |
| No dynamic registration, plugin loading, parallel command path or Gamepad-shaped event | Implemented |
| Direct `navigator.getGamepads()` access confined to one boundary module | Implemented |
| Data-only frozen snapshot (`controllerIndex` + `pressed[]`); no browser object crosses | Implemented |
| Device `id`, `mapping`, `axes`, analog `value`, `touched`, `timestamp`, vendor/product **not representable** | Implemented |
| Untrusted-input guard: `null` holes, sparse lists, malformed index/buttons, bounded indices | Implemented |
| Injectable source abstraction; every unit test uses a fake, none needs hardware | Implemented |
| Typed read outcomes: `ok` · `unsupported` · `unreadable`; a throw never escapes | Implemented |
| Polling in ONE host-only lifecycle owner; injectable scheduler; deterministic under test | Implemented |
| No polling in the reducer, render, sanitizer, replay, command planning or the display route | Implemented |
| Loop registered once (duplicate registration refused) and stopped on unmount | Implemented |
| No global polling service, module-level loop or singleton | Implemented |
| Rising-edge detection: one physical press → at most one logical input | Implemented |
| A held button never repeats; release rearms that control only | Implemented |
| First observation of a controller is a BASELINE only — a held button cannot buzz | Implemented |
| Re-prime on enable, disable, mapping change, capture start/end, connect, disconnect, visibility, focus, blur, failed read | Implemented |
| Disconnect clears prior observation state and appends nothing; reconnect is a new baseline | Implemented |
| Reconnect at the same index and at a DIFFERENT index both fail closed | Implemented |
| Deterministic multi-edge order: ascending controller index, then ascending button index | Implemented |
| Event-log `seq` remains the authoritative accepted order; no fairness claim | Implemented |
| Clock read once per genuine edge, at the dispatch edge; a no-edge poll reads none | Implemented |
| Generic mapping: controller index + button index + team + logical action | Implemented |
| Validation: malformed indices, duplicate control, unknown team, duplicate team primary, malformed action, bounds | Implemented |
| No silent overwrite, no repair, no drop; structured issues addressed to the binding | Implemented |
| **No default button assignment** and no generated device profile | Implemented |
| At most one primary Gamepad buzz per team (within the Gamepad mapping only) | Implemented |
| Four ordinal secondary slots mappable and **still inert** at command translation | Implemented |
| Mappings **session-local**: no `localStorage`, IndexedDB, export, game-file field or sync | Implemented |
| Mapping lifetime (lost on host reload) stated in the host UI | Implemented |
| Controller indices treated as session-local locators, never persisted or claimed stable | Implemented |
| Browser device `id`/name never read or used as gameplay identity | Implemented |
| Neutral session-local labels ("Controller 1"); no vendor recognition | Implemented |
| Buttons only — no axes, sticks, analog triggers, motion, vibration or haptics | Implemented |
| Host diagnostics: availability, enabled, controller count/labels/button counts, assignments, conflicts, outcomes | Implemented |
| Host controls: enable/disable, capture, assign, cancel, clear one, clear all, conflict preview | Implemented |
| No live per-frame button display; diagnostics emitted only on a STABLE change | Implemented |
| Calm no-controller fallback: "No controller detected. Keyboard buzzing remains available." | Implemented |
| Keyboard buzzing fully functional at all times, including with no Gamepad API | Implemented |
| Accessibility: keyboard-operable, polite live regions, no colour-only state, stable focus, explained disabled states | Implemented |
| **`PublicState` unchanged; wire version unchanged at 6; sync envelope unchanged at 2** | Implemented |
| No API availability, controller count/index/label, button index/state, mapping, connection, capture state, adapter error or source kind projected | Implemented |
| Replay and undo unchanged and bit-exact for a controller-built queue | Implemented |
| Deterministic adapter/source/mapping/hook/component tests + no-controller e2e | Implemented |
| **Physical controller hardware tested** | **Not performed — none available** |
| Sony Buzz! detection, vendor matching, colour defaults, handset grouping, setup wizard | **Not implemented (Slice 10)** |
| WebHID, Bluetooth, USB drivers, haptics, axes, analog tuning | **Not implemented** |
| Persistent Gamepad mappings | **Not implemented (deliberate — storage impact is none)** |
| Scoring restricted to the active respondent (`OG-6`) | **Still deferred — not implemented** |

## Slice 10 work (Complete)

The Sony Buzz! **host-private setup boundary** behind the Slice 9 adapter. Full
rationale in
[`architecture/ADR-010-sony-buzz-profile-and-setup.md`](architecture/ADR-010-sony-buzz-profile-and-setup.md);
local evidence in
[`receipts/2026-07-27-slice-10-hardware-independent-local-verification.md`](receipts/2026-07-27-slice-10-hardware-independent-local-verification.md);
review disposition in
[`receipts/2026-07-28-slice-10-pr-review-and-sonar-disposition.md`](receipts/2026-07-28-slice-10-pr-review-and-sonar-disposition.md);
owner-acceptance amendment in
[`receipts/2026-07-28-slice-10-owner-acceptance-amendment.md`](receipts/2026-07-28-slice-10-owner-acceptance-amendment.md);
post-merge reconciliation in
[`receipts/2026-07-28-slice-10-post-merge-reconciliation.md`](receipts/2026-07-28-slice-10-post-merge-reconciliation.md).
Squash-merged via PR #21 at `5575be3` from reviewed head `2885933`. Completion
covers the owner-accepted hardware-independent scope. Physical validation on
owner wireless hardware was completed under OADL2-S07 with a **temporary**
external keep-alive; see the bounded claim in the S07 receipt. Permanent
keep-alive remained unresolved at that stage and was later resolved for the
exact supported Namtai wireless `Wbuzz` `054c:1000` profile by Slice 21 /
ADR-019; no wired claim; no SKU list.

> **The headline is what did NOT change:** no schema, no `PublicState`, no sync
> protocol version, no command, no event, no reducer, no queue logic, no timer
> transition and no scoring behaviour. Physical Sony Buzz! evidence is
> **bounded** (temporary keep-alive; this host/receiver only) — not a permanent
> product keep-alive architecture.

| Item | State |
| --- | --- |
| Host-private identity observation (`reportedId`, `reportedMapping`) on the bounded snapshot | Implemented |
| Candidate classification from USB VID/PID tokens only (`gamepadDeviceProfile`) | Implemented |
| Capture-based recommended profile — no hard-coded browser button indices (`sonyBuzzProfile`) | Implemented |
| Host setup/test surface with non-gameplay test mode (`SonyBuzzSetupSection`, `useGamepadBuzzInput` `testMode`) | Implemented |
| Staged bindings validated through existing Gamepad mapping discipline; Apply/Discard; session-local | Implemented |
| Test mode resolves edges against applied mapping only — no dispatch, no event, no score | Implemented |
| One polling lifecycle owner unchanged; no second loop or global service | Implemented |
| Device identity, classification, capture state and button indices host-private — never projected | Implemented |
| **`PublicState` unchanged; wire version unchanged at 6; sync envelope unchanged at 2** | Implemented |
| ADR-010 recorded | Implemented |
| **Physical Sony Buzz! validation on owner hardware** | **OADL2-S07 (2026-08-01/02): browser 4×5 + Playwright-assisted CQS setup/test/gameplay/keyboard PASS under temporary keep-alive; bounded claim only; permanent keep-alive unresolved at that stage — later resolved for the exact supported `Wbuzz` profile by Slice 21 / ADR-019** |
| Supported/compatibility/certified language | **Bounded host claim only — see S07 receipt; no permanent keep-alive claim** |
| WebHID, Bluetooth, USB drivers | **Not implemented** |
| Scoring restricted to the active respondent (`OG-6`) | **Still deferred — not implemented** |

## Slice 11 work (Complete)

Typed prompt media contract (legacy text + same-origin static image). Full
rationale in
[`architecture/ADR-011-media-contract.md`](architecture/ADR-011-media-contract.md);
local evidence in
[`receipts/2026-07-27-slice-11-local-verification.md`](receipts/2026-07-27-slice-11-local-verification.md);
review hardening in
[`receipts/2026-07-27-slice-11-pr-review-and-hardening.md`](receipts/2026-07-27-slice-11-pr-review-and-hardening.md);
post-merge reconciliation in
[`receipts/2026-07-28-slice-11-post-merge-reconciliation.md`](receipts/2026-07-28-slice-11-post-merge-reconciliation.md).
Squash-merged via PR #23 at `5d47b2f` from reviewed head `bb8bd94`.

| Item | State |
| --- | --- |
| Typed `PromptContent`: normalized text or static image | Implemented |
| Additive image prompt form on game-file `schemaVersion: 1` | Implemented |
| Same-origin relative-path source policy; remote/unsafe sources rejected | Implemented |
| Exact import diagnostics for unsupported media kinds and invalid sources | Implemented |
| Allow-listed `PublicPromptContent`; `PublicState` wire version 6 → 7 | Implemented |
| `MediaContentDisplay` with caption, attribution, alt text and load-failure fallback | Implemented |
| Fail-closed trusted/public media handling; privacy boundary preserved | Implemented |
| Audio, video, remote media, media answers and timer/media coupling | **Not implemented — deferred** |

### Commands / events / public fields (Slice 11)

No command, event, reducer or sync-envelope change. Public prompt content becomes
a typed text/image DTO and the `PublicState` wire version moves **6 → 7**.

### Commands / events / public fields (added in Slice 9)

**None.** No command, no event, no `PublicState` field, no wire-version change and
no sync-envelope change. The only vocabulary change anywhere is one member added
to `LOCAL_INPUT_SOURCE_KINDS` (`gamepad`), which is host-private and never
projected.

### Owner gates after Slice 8

| Gate | Status |
| --- | --- |
| `OG-1` manual arming | Implemented (Slice 7), reused as the intake gate |
| `OG-2` full ordered queue | **Implemented by Slice 8** |
| `OG-3` promotion after incorrect / pass | **Implemented by Slice 8** |
| `OG-4` tie handling | **Resolved** — sequence is the deterministic tiebreaker; stamps are evidence; no adjudication UI |
| `OG-5` queue lifetime | **Resolved** — the queue belongs to one clue's response opportunity and never outlives it |
| `OG-6` scoring restricted to the active respondent | **Deferred and not implemented** — scoring is unchanged for every team |

## Slice 7 work (Complete)

Timers, arming and transitions — the engine's first **non-deterministic input**,
contained. Full rationale in
[`architecture/ADR-007-timers-arming-transitions.md`](architecture/ADR-007-timers-arming-transitions.md);
local evidence in
[`receipts/2026-07-26-slice-7-local-verification.md`](receipts/2026-07-26-slice-7-local-verification.md);
merged-state evidence in
[`receipts/2026-07-27-slice-7-post-merge-reconciliation.md`](receipts/2026-07-27-slice-7-post-merge-reconciliation.md).

| Item | State |
| --- | --- |
| Explicit `Clock` seam; read at the dispatch and presentation edges only | Implemented |
| Reducer, replay, planner logic and sanitizer read no clock; replay bit-exact | Implemented |
| No global timer service; nothing mutates state outside the command pipeline | Implemented |
| Durable timer FACTS (duration, start, absolute deadline, frozen remaining) | Implemented |
| No tick event, no per-frame revision, no remaining value on a running timer | Implemented |
| Round-type-neutral `responsePhases` map, legal at the `prompt` stage only | Implemented |
| Manual host arming (`OG-1`) as first-class durable state, orthogonal to the timer | Implemented |
| Typed interruption seam; stops the clock WITHOUT ending the clue | Implemented |
| Expiry through the command boundary with timer id + deadline evidence | Implemented |
| Stale / premature / repeated / reset / restarted / paused / undone callbacks inert | Implemented |
| Exactly one effective expiry per countdown, structurally | Implemented |
| Host pause and resume (`OG-8` resolved); replay consumes no time while paused | Implemented |
| Transition rules: cleared by selection, answer reveal, return, round change, end | Implemented |
| A window is NOT resumed across a round change (unlike board progress) | Implemented |
| Expiry awards and deducts nothing; scoring and the window stay independent | Implemented |
| `PublicState.response` allow-list DTO; wire version 4 → 5 | Implemented |
| Sync envelope version 1 → 2 (required `sentAt`); both fail closed | Implemented |
| Bounded, clamped host/display clock-offset estimate; display never expires | Implemented |
| Additive optional `timer` block on `schemaVersion: 1`, default 30 s | Implemented |
| Host panel: four facts in words, illegal controls disabled, keyboard operable | Implemented |
| Projector panel: countdown, armed/paused/expired/stopped in words, reduced-motion safe | Implemented |
| Unit, component and browser tests; docs (ADR-007, plan, handoff, receipt) | Implemented |
| Buzzers, queues, promotion, device input (`OG-2`/`OG-3` recorded, Slice 8) | **Not implemented** |

### Timer config shape (top-level, optional)

```jsonc
{
  "timer": { "responseSeconds": 45 }
}
```

Whole seconds, 5–600. Omitting the block yields the documented default of **30**,
applied by the trusted constructor — never by a Zod `.default()`. The host may pick
another bounded duration for one clue at start time.

### Commands / events / public fields (added in Slice 7)

- **Commands (8):** `ARM_RESPONSE_PHASE` · `DISARM_RESPONSE_PHASE` ·
  `START_RESPONSE_TIMER` (optional `durationSeconds`) · `PAUSE_RESPONSE_TIMER` ·
  `RESUME_RESPONSE_TIMER` · `INTERRUPT_RESPONSE_TIMER` (typed `source`) ·
  `EXPIRE_RESPONSE_TIMER` (`timerId` + `deadline`) · `RESET_RESPONSE_PHASE`. All
  carry the `roundId` they target.
- **Events (8, all reversible):** `RESPONSE_PHASE_ARMED` ·
  `RESPONSE_PHASE_DISARMED` · `RESPONSE_TIMER_STARTED` · `RESPONSE_TIMER_PAUSED` ·
  `RESPONSE_TIMER_RESUMED` · `RESPONSE_TIMER_INTERRUPTED` ·
  `RESPONSE_TIMER_EXPIRED` · `RESPONSE_PHASE_RESET`.
- **Timer statuses:** `idle` · `running` · `paused` · `expired` · `interrupted`.
- **Interruption sources:** `host` (the only member today; unrecognized values fail
  closed at the command boundary and again on event application).
- **New rejection reasons:** `invalid-response-phase`, `invalid-timer-duration`,
  `stale-timer-expiration`, `premature-timer-expiration`.
- **`PublicState` (added):** `response: PublicResponseState | null`. Wire version
  **4 → 5**; version 4 is rejected, never reinterpreted.
- **Sync envelope:** `SYNC_SCHEMA_VERSION` **1 → 2**; `public-state` gained a
  required `sentAt`. A version-1 envelope is rejected with `unsupported-version`.

## Slice 6 work (Complete)

Teams and the first **scoring strategy** — bounded integer points. Full rationale in
[`architecture/ADR-006-teams-and-scoring.md`](architecture/ADR-006-teams-and-scoring.md);
local evidence in
[`receipts/2026-07-26-slice-6-local-verification.md`](receipts/2026-07-26-slice-6-local-verification.md);
merged-state evidence in
[`receipts/2026-07-26-slice-6-post-merge-reconciliation.md`](receipts/2026-07-26-slice-6-post-merge-reconciliation.md).

| Item | State |
| --- | --- |
| Typed team model on the immutable definition (id = identity, name ≠ identity) | Implemented |
| Authored team order canonical, frozen onto `order`; scoreboard never re-sorts | Implemented |
| Team limits with classroom rationale: 1–8 teams, 40-char names, id grammar mirrored | Implemented |
| One-team game supported (whole-class / individual / demo play) | Implemented |
| "No teams" = omit the field; `teams: []` rejected, never treated as "none" | Implemented |
| Application-controlled accent palette; content may NAME a token, never supply style | Implemented |
| Documented positional accent default applied only by the trusted constructor | Implemented |
| Colour supplemental everywhere; no colour-only team identification | Implemented |
| Import through the ONE Slice 4 pipeline; same schema re-used by trusted construction | Implemented |
| `teams` additive + optional on `schemaVersion: 1` (no migration needed) | Implemented |
| Exact-path team diagnostics (`teams[1].accent`) with no silent repair | Implemented |
| Scores as session state: bounded integers, initial 0, derived only by replay | Implemented |
| No score cache, no `NaN`/`Infinity`/floats, no coercion, no write path outside `reduce` | Implemented |
| One command / one reversible event with typed `mode` + typed `source` | Implemented |
| Resulting total deliberately NOT stored on the event (undo would make it a lie) | Implemented |
| Tile presets derived from `effectiveValue`; exact-match validation at the boundary | Implemented |
| Scoring gated to the `prompt`/`answer` stages and the open tile; stale controls inert | Implemented |
| Revealing and scoring independent in BOTH directions | Implemented |
| Multiple teams scorable for one tile; returning with no score allowed | Implemented |
| Correction by undo OR compensating event; history never rewritten | Implemented |
| Reset policy: new game resets scores; round transitions and game end preserve them | Implemented |
| `PublicState.teams` allow-list DTO + explicit `unavailable`; wire version 3 → 4 | Implemented |
| Projector never receives team ids, score history, undo metadata, or the host target | Implemented |
| Host panel: target selection, tile value, previewed result, duplicate + large guards | Implemented |
| Projector scoreboard at every stage and after the game ends; no animation | Implemented |
| Accessibility: spoken negative totals, named controls, associated errors, focus | Implemented |
| Unit, component and browser tests; docs (ADR-006, plan, handoff, receipt) | Implemented |

### Team config shape (top-level, optional)

```jsonc
{
  "teams": [
    { "id": "basalts", "name": "Blue Basalts", "accent": "azure" },
    { "id": "rhyolites", "name": "Red Rhyolites" }
  ]
}
```

Accents: `crimson` · `azure` · `emerald` · `amber` · `violet` · `teal` · `rose` ·
`slate`. Omitting `accent` gets the palette entry at the team's authored position.

### Commands / events / public fields (added in Slice 6)

- **Command:** `ADJUST_TEAM_SCORE` — `{ teamId, delta, mode, source }`. There is
  deliberately **no** command for choosing the scoring target: that is private host
  UI state, it awards nothing, and it is never broadcast.
- **Event:** `TEAM_SCORE_ADJUSTED` (reversible) — carries `teamId`, the signed
  `delta`, the `mode` and the `source`. It does **not** carry a resulting total.
- **Modes:** `full-credit` (= `effectiveValue`) · `deduction` (= −`effectiveValue`) ·
  `partial-credit` (0 < |delta| ≤ `effectiveValue`) · `manual-correction` (bounded,
  no tile).
- **Score bounds:** −1,000,000 … 1,000,000, integers only, initial **0**.
- **New rejection reasons:** `no-teams-configured`, `unknown-team`, `tile-mismatch`,
  `invalid-score-delta`, `invalid-score-source`, `score-amount-mismatch`,
  `score-out-of-range`.
- **`PublicState` (added):** `teams: PublicTeamsState | null`. Wire version
  **3 → 4**; version 3 is rejected, never reinterpreted.
- **New import issue codes:** `duplicate-team-id`, `invalid-team-accent`.

## Slice 5 work (Complete)

The first **playable** round type — `category-board`. Full rationale in
[`architecture/ADR-005-category-board-round.md`](architecture/ADR-005-category-board-round.md);
local evidence in
[`receipts/2026-07-26-slice-5-local-verification.md`](receipts/2026-07-26-slice-5-local-verification.md)
and merge / CI / deployment evidence in
[`receipts/2026-07-26-slice-5-post-merge-reconciliation.md`](receipts/2026-07-26-slice-5-post-merge-reconciliation.md).

| Item | State |
| --- | --- |
| `category-board` registered by application code (content cannot register) | Implemented |
| Strict typed config: ordered categories, ordered tiles, stable ids | Implemented |
| Prompt, answer, optional alternates, optional host-only notes, optional multiplier | Implemented |
| Authored array order preserved; identity from stable ids, never value | Implemented |
| Uneven categories **allowed**; duplicate values **allowed** (both documented) | Implemented |
| `effectiveValue = value × multiplier` (exact integers, no scoring) | Implemented |
| Documented default `multiplier: 1` applied at the trusted constructor only | Implemented |
| Documented, tested board-size limits with classroom rationale; no truncation | Implemented |
| Private per-round state: discriminated reveal stage + used tiles | Implemented |
| Four commands / four events; every command carries its target `roundId` | Implemented |
| Used-tile policy: consumed on **answer reveal**, released by undo | Implemented |
| Deterministic replay; used tiles derived only from events; no lookup cache | Implemented |
| Registered `configSchema` — one validation path, no second importer | Implemented |
| Precise import errors with exact paths (`rounds[0].config.categories[1].tiles[2].prompt`) | Implemented |
| Built-in valid sample contains a real category-board round | Implemented |
| `PublicState.round` — current-stage-only DTO; wire version 2 → 3 | Implemented |
| Projector never receives notes, alternates, authored ids, or unselected content | Implemented |
| Fail-closed neutral panel on any impossible/unsupported/stale state | Implemented |
| Bounded host controls with explicit private/public distinction | Implemented |
| Accessibility: semantic buttons, keyboard grid, no colour-only meaning, wrapping | Implemented |
| Unit, component and browser tests; docs (ADR-005, plan, handoff, receipt) | Implemented |

### Config shape (round `config`)

```jsonc
{
  "categories": [
    { "id": "earth-structure", "title": "Earth Structure",
      "tiles": [{ "id": "earth-structure-100", "value": 100,
                  "prompt": "…", "answer": "…",
                  "alternates": ["…"], "notes": "…", "multiplier": 1 }] }
  ]
}
```

### Commands / events / public fields (added in Slice 5)

- **Commands:** `SELECT_CATEGORY_BOARD_TILE`, `REVEAL_CATEGORY_BOARD_PROMPT`,
  `REVEAL_CATEGORY_BOARD_ANSWER`, `RETURN_TO_CATEGORY_BOARD` — each carries the
  `roundId` it targets, so a stale host control is inert.
- **Events:** `CATEGORY_BOARD_TILE_SELECTED`, `CATEGORY_BOARD_PROMPT_REVEALED`,
  `CATEGORY_BOARD_ANSWER_REVEALED`, `CATEGORY_BOARD_RETURNED` — all reversible.
- **Reveal stages:** `board → selected → prompt → answer`, plus
  `selected|prompt|answer → board`.
- **`PublicState` (added):** `round: PublicRoundState | null`. Wire version
  **2 → 3**; an older shape is rejected, never reinterpreted.
- **New import issue codes:** `duplicate-category-id`, `duplicate-tile-id`,
  `blank-text`.

## Slice 4 work (Complete)

The canonical versioned JSON game-file format and the single Zod-based
validation / normalization import pipeline — **no gameplay**. Full rationale in
[`architecture/ADR-004-canonical-validation-import.md`](architecture/ADR-004-canonical-validation-import.md);
local evidence in
[`receipts/2026-07-24-slice-4-local-verification.md`](receipts/2026-07-24-slice-4-local-verification.md)
and merge/CI/deployment evidence in
[`receipts/2026-07-25-slice-4-post-merge-reconciliation.md`](receipts/2026-07-25-slice-4-post-merge-reconciliation.md).

| Item | State |
| --- | --- |
| Canonical versioned JSON format (`format` + `schemaVersion` discriminators) | Implemented |
| One authoritative pipeline every import entry point converges on | Implemented |
| Explicit version policy (missing/malformed/older/newer all fail; no guessing) | Implemented |
| Strict Zod schemas; unknown keys rejected, not dropped; zero coercion | Implemented |
| Pre-Zod document safety scan (reserved keys, non-data, non-finite, cycles, depth) | Implemented |
| Semantic validation (unique round ids, non-blank titles, bounds) | Implemented |
| Registry `configSchema` — one config validation path per known round type | Implemented |
| Unknown round type **fails import** (distinct from Slice 3 runtime fail-closed) | Implemented |
| Narrow, lossless normalization; **no silent repair**; input never mutated | Implemented |
| Structured `ImportIssue` model (stable codes, stages, paths, actionable messages) | Implemented |
| Discriminated `ImportResult`; no exceptions for ordinary invalid input | Implemented |
| Internal failures contained behind a safe generic issue (no stack traces) | Implemented |
| Host-only paste/import harness with structured result panel | Implemented |
| Invalid import mutates no state/event/revision/sync/`PublicState`/display | Implemented |
| Valid import loads only through the existing `INITIALIZE_GAME` command | Implemented |
| Unit, component and browser tests; docs (ADR-004, plan, handoff, receipt) | Implemented |

### Canonical format (version 1)

```jsonc
{
  "format": "classroom-quiz-show/game",
  "schemaVersion": 1,
  "id": "sample-foundation-game",
  "title": "Foundation Sample Game",
  "rounds": [{ "id": "round-1", "type": "placeholder", "title": "Round One",
               "config": { "note": "…" } }]
}
```

Pipeline stages (also the issue-report order): `transport` · `json-parse` ·
`format` · `version` · `semantic` · `schema` · `registry` · `construction`.

**Not added to `PublicState`:** import status, filenames, raw titles, error
paths, schema diagnostics, or registry internals. `PublicState` is unchanged by
Slice 4 (still wire version 2).

## Slice 3 work (Complete)

Typed game & round model + non-executable round registry — no gameplay. Full
rationale in
[`architecture/ADR-003-game-round-model-registry.md`](architecture/ADR-003-game-round-model-registry.md);
local evidence in
[`receipts/2026-07-23-slice-3-local-verification.md`](receipts/2026-07-23-slice-3-local-verification.md).

| Item | State |
| --- | --- |
| Branded ids (`GameId`/`RoundId`/`RoundType`/`GameSessionId`) | Implemented |
| `GameDefinition` factory (unique ids, ordered rounds, deep-frozen) | Implemented |
| Typed `RoundDefinition` + data-only `RoundConfig` (forbids functions) | Implemented |
| Round registry (explicit known/unknown, duplicate error, no fallback) | Implemented |
| No executable-import path (no eval / dynamic import / plugins) | Implemented |
| `GameSession` (`PrivateGameState`) distinct from the definition | Implemented |
| Game commands/events + deterministic replay + undo | Implemented |
| Unknown-round-type fail-closed (host diagnostic + safe display) | Implemented |
| Allow-listed `PublicGameView` (version 1 → 2); no definition/registry leak | Implemented |
| Host foundation game controls + host-only diagnostics (not gameplay) | Implemented |
| Display shows only safe round status (read-only, fail closed) | Implemented |
| Unit + browser tests; docs (ADR-003, plan, handoff, receipt) | Implemented |

### Commands / events / public fields (added in Slice 3)

- **Commands:** `INITIALIZE_GAME`, `SELECT_ROUND`, `ADVANCE_TO_NEXT_ROUND`,
  `END_GAME_SESSION`.
- **Events:** `GAME_INITIALIZED` (irrev.), `CURRENT_ROUND_SELECTED` (rev.),
  `ROUND_ADVANCED` (rev.), `GAME_SESSION_ENDED` (irrev.).
- **`PublicState` (added):** `game: PublicGameView | null` — `status`,
  `roundCount`, `currentRound`, `roundAvailability`. Never projected: the full
  definition, round ids/types/titles, round config, host diagnostics.

## Slice 2 work (Complete)

Neutral state/event/sync foundation — no gameplay. Full rationale in
[`architecture/ADR-002-state-event-sync-core.md`](architecture/ADR-002-state-event-sync-core.md).

| Item | State |
| --- | --- |
| Command-driven reducer (intent → events) | Implemented |
| Append-only event history (never edited in place) | Implemented |
| Deterministic, idempotent replay from `initial + events` | Implemented |
| Undo as append-only auditable `EVENT_UNDONE` marker | Implemented |
| Reversible vs. irreversible events distinguished | Implemented |
| Empty-history / repeated undo safe | Implemented |
| Private authoritative state vs. explicit `PublicState` types | Implemented |
| Allow-list `toPublicState` sanitizer (fail-closed) | Implemented |
| Versioned BroadcastChannel envelope + strict decode | Implemented |
| Stale/duplicate revision handling; unsupported-env no-op | Implemented |
| Host authoritative; display read-only + fail-closed | Implemented |
| Host "Foundation / testing controls" panel (not gameplay) | Implemented |
| Unit tests (reducer, sanitizer, transport, store, display) | Implemented |
| Browser tests: real two-tab BroadcastChannel sync | Implemented |
| Structural `PublicState` projector-leak assertions | Implemented |
| Documentation (ADR-002, plan, handoff, receipt) | Implemented |

### Commands / events / public fields

- **Commands:** `INIT_SESSION`, `SET_PUBLIC_STATUS`, `ADVANCE_SEQUENCE`,
  `MARK_WAITING`, `SET_HOST_NOTE`, `UNDO`.
- **Events:** `SESSION_INITIALIZED`, `PUBLIC_STATUS_SET`, `SEQUENCE_ADVANCED`,
  `WAITING_MARKED`, `HOST_NOTE_SET`, `EVENT_UNDONE`.
- **`PublicState` (allow-list):** `schemaVersion`, `revision`, `phase`,
  `headline`, `detail`. Never projected: `sessionId`, `counter`, `hostNotes`,
  `diagnostics`.

## Verification state

Local `verify:all` passed on the **Slice 9** branch
(`claude/slice-9-gamepad-adapter-wfiue4`): lint, typecheck, unit tests
(**1,349 passed, 57 files**), production build, and Playwright e2e (**199 passed,
2 skipped** — both skips are the one pre-existing desktop-only offline-shell
test; nothing was skipped because it failed). `git diff --check` is clean.
Details in
[`receipts/2026-07-27-slice-9-local-verification.md`](receipts/2026-07-27-slice-9-local-verification.md).

- Environment override: `PLAYWRIGHT_CHROMIUM_PATH` (the sandbox provides Chromium
  build 1194 while Playwright 1.56 expects 1228), supplied **through the
  environment only** — no machine-specific path is committed.
- **PR CI on GitHub Actions for Slice 9: observed green.** All three checks
  concluded success on the final reviewed head `f63d5c1` of PR
  [#19](https://github.com/ricktron/classroom-quiz-show/pull/19) — `Lint,
  typecheck, unit tests, build`; `Playwright e2e`; and `SonarCloud Code Analysis`.
  Sonar's detailed findings were **not inspected**: `sonarcloud.io` is unreachable
  from the sandbox.
- **Post-merge CI on `main` for Slice 9: observed green.** On merge commit
  `d16f90d` the `CI` workflow (run `30240064570`, event `push`) concluded
  **success**. This is post-merge observation on `main`, not a restatement of the
  pre-merge PR checks.
- **Pages deployment for Slice 9: observed successful.** The `Deploy to GitHub
  Pages` workflow (run `30240064595`, head `d16f90d`, event `push`) concluded
  **success**.
- **Document-root reachability observed; no live-route claim.** An HTTP HEAD to
  `https://ricktron.github.io/classroom-quiz-show/` returned **200**, with
  `Last-Modified` consistent with the Pages deploy above. The response body was
  not inspected; `/host` and `/display` were not exercised; Gamepad behavior was
  not tested on the deployed application. **This is not manual live-route
  verification**, and **no live-route or application-behavior claim is made.**
- **No physical controller was tested.** None is available in this environment, and
  no claim is made about any specific device. Every physical behaviour is proved by
  deterministic unit tests against a fake Gamepad source; the browser tests cover
  the **no-controller** path only.
- **Primary browser documentation was not fetched.** The sandbox network policy
  denies `developer.mozilla.org` and `w3c.github.io` (HTTP 403 on CONNECT). The
  Gamepad contract was instead verified against two primary sources available
  locally: the WebIDL in TypeScript 5.9's `lib.dom.d.ts`, and a direct probe of the
  Chromium build this repository tests with. Both are recorded in ADR-009 §Context.

Earlier, local `verify:all` passed on the Slice 8 branch: lint, typecheck, unit tests
(**1,184 passed, 51 files**), production build, and Playwright e2e (**187 passed,
2 skipped** — both skips are the one pre-existing desktop-only offline-shell
test; nothing was skipped because it failed). `git diff --check` is clean.
Details in
[`receipts/2026-07-27-slice-8-local-verification.md`](receipts/2026-07-27-slice-8-local-verification.md).

- Environment override: `PLAYWRIGHT_CHROMIUM_PATH` (the sandbox provides Chromium
  build 1194 while Playwright 1.56 expects 1228), supplied **through the
  environment only** — no machine-specific path is committed.
- **PR CI on GitHub Actions for Slice 8: observed green.** All three checks
  concluded success on the final reviewed head `7d12718` of PR
  [#16](https://github.com/ricktron/classroom-quiz-show/pull/16) — `Lint,
  typecheck, unit tests, build`; `Playwright e2e`; and `SonarCloud Code Analysis`.
  Sonar's detailed findings were **not inspected**: `sonarcloud.io` is unreachable
  from the sandbox.
- **Post-merge CI on `main` for Slice 8: observed green.** On merge commit
  `167128d` the `CI` workflow (run `30232976466`, event `push`) concluded
  **success**. This is post-merge observation on `main`, not a restatement of the
  pre-merge PR checks.
- **Pages deployment for Slice 8: observed successful.** The `Deploy to GitHub
  Pages` workflow (run `30232976430`, head `167128d`, event `push`) concluded
  **success**.
- **No live-route verification was performed.** A successful deploy job is not
  evidence that the live routes render; the sandbox network policy denies
  `ricktron.github.io`.

Earlier, local `verify:all` passed on the Slice 7 branch: lint, typecheck, unit tests
(**947 passed, 42 files**), production build, and Playwright e2e (**175 passed,
2 skipped** — both skips are the one desktop-only offline-shell test).
`git diff --check` is clean. Details in
[`receipts/2026-07-26-slice-7-local-verification.md`](receipts/2026-07-26-slice-7-local-verification.md).

- **PR CI on GitHub Actions for Slice 7: observed green.** All three checks
  concluded success on implementation commit `f804430` of PR
  [#14](https://github.com/ricktron/classroom-quiz-show/pull/14) — `Lint,
  typecheck, unit tests, build`; `Playwright e2e`; and `SonarCloud Code Analysis`
  with the Quality Gate **passed** and **0 Security Hotspots**. Sonar's 12 new
  non-blocking issues were **not inspected**: `sonarcloud.io` is unreachable from
  the sandbox (HTTP 403 on CONNECT).
- **Post-merge CI on `main` for Slice 7: observed green.** On merge commit
  `3f9ae1c` the `CI` workflow (run `30225863653`) concluded **success** for both
  jobs — "Lint, typecheck, unit tests, build" and "Playwright e2e". This is
  post-merge observation on `main`, not a restatement of the pre-merge PR checks.
- **GitHub Pages deployment for Slice 7: succeeded.** The `Deploy to GitHub Pages`
  workflow (run `30225863654`) on `main` at `3f9ae1c` concluded success for both
  the build and deploy jobs (deploy completed 2026-07-26T23:44:35Z). Slice 7
  changes no CI or deploy configuration.
- **Manual live-route verification was not performed** for Slice 7. The sandbox
  network policy denies `ricktron.github.io`, so
  `https://ricktron.github.io/classroom-quiz-show/#/host` and `#/display` were not
  loaded and no live application behaviour is claimed. A successful deployment
  workflow is not evidence that the live routes were exercised.

Earlier, local `verify:all` passed on the Slice 6 branch and again on the
reconciliation branch: lint, typecheck, unit tests (**740 passed, 35 files**),
production build, and Playwright e2e (**154 passed, 2 skipped** — both skips are
the one desktop-only offline-shell test). `git diff --check` is clean. See
[`handoff/CURRENT.md`](handoff/CURRENT.md) for exact commands and the Slice 6
receipts under [`receipts/`](receipts/).

- PR CI on GitHub Actions for Slice 6: **observed green** on PR
  [#11](https://github.com/ricktron/classroom-quiz-show/pull/11) at implementation
  commit `7734065` **and** at the final reviewed head `48ed818` — all three checks
  concluded success at both heads (`Lint, typecheck, unit tests, build`;
  `Playwright e2e`; `SonarCloud Code Analysis` with the Quality Gate **passed** and
  **0 Security Hotspots**). Sonar's 13 new non-blocking issues were not inspected:
  `sonarcloud.io` is unreachable from the sandbox.
- **Post-merge CI on `main` for Slice 6: observed green.** On merge commit
  `67180a3` the `CI` workflow (run `30209343948`) concluded **success** for both
  jobs — "Lint, typecheck, unit tests, build" and "Playwright e2e". This is
  post-merge observation on `main`, not a restatement of the pre-merge PR checks.
- **GitHub Pages deployment for Slice 6: succeeded.** The `Deploy to GitHub Pages`
  workflow (run `30209343946`) on `main` at `67180a3` concluded success for both
  the build and deploy jobs (deploy completed 2026-07-26T15:59:00Z). Slice 6
  changes no CI or deploy configuration.
- **Manual live-route verification was not performed.** The sandbox network policy
  denies `ricktron.github.io` (HTTP 403 on CONNECT), so
  `https://ricktron.github.io/classroom-quiz-show/#/host` and `#/display` were not
  loaded and no live application behaviour is claimed. A successful deployment
  workflow is not evidence that the live routes were exercised.
- Earlier, on the Slice 5 branch: lint, typecheck, **455 unit tests**, build, and
  **121 e2e passed / 2 skipped**.

- CI on GitHub Actions for Slice 5: **Observed green.** On PR #9 (final
  reviewed head `5e6994e`) "Lint, typecheck, unit tests, build", "Playwright
  e2e", and the SonarCloud Quality Gate (0 security hotspots) all concluded
  success. **Post-merge on `main` (`2ec6932`)** the `CI` workflow concluded
  success for both jobs.
- Pages deployment for Slice 5: **Observed successful** on `main` at `2ec6932`
  (deploy job completed 2026-07-26T05:03:16Z). Slice 5 altered no deploy
  configuration. Owner-verified loading of the live URLs after this deployment
  is **not** claimed.
- Slice 4 local `verify:all` also passed (253 unit, 97 e2e / 2 skipped).
- CI on GitHub Actions for Slice 4: **Observed green.** On PR #7 (final head
  `8ce850c`) "Lint, typecheck, unit tests, build", "Playwright e2e", and the
  SonarCloud Quality Gate (0 security hotspots) all concluded success.
  **Post-merge on `main` (`5295e83`)** both CI jobs concluded success.
- Pages deployment: **Observed successful** on `main` at `5295e83`
  (2026-07-25T20:15:31Z). Slice 4 altered no deploy configuration.
- Slice 3 CI was observed green on PR #5 (final reviewed head `464ef07`) — both
  jobs succeeded and the SonarCloud Quality Gate passed (0 security hotspots).
- Pages deployment: unchanged; Slice 4 alters no deploy config.

## Completed work (Slice 1)

Slice 1 remains Complete. Its detailed table lived here previously; the durable
record is the post-merge reconciliation receipt
[`receipts/2026-07-22-slice-1-post-merge-reconciliation.md`](receipts/2026-07-22-slice-1-post-merge-reconciliation.md).
Headline: React + TS + Vite shell, hash routing (host/display/root/unknown),
fail-closed display error boundary, PWA + offline app shell, Pages deploy under
`/classroom-quiz-show/`, and the Vitest + Playwright suites.

## Blockers

None.

## Limitations

- **Two playable round types.** `category-board` reveals prompts and answers and
  tracks used tiles; Slice 6 added teams and scoring on top of it, and Slice 7 adds
  the response window. Slice 14 added `final-wager` — a terminal, at-most-one,
  per-team wager round — now **`Complete` and merged to `main`**. There is no
  third playable type.
- **A response window exists only at the `prompt` stage.** Before the prompt is
  public there is nothing to respond to; once the answer is public the window is
  over and is cleared.
- **A response window does not survive a round change**, unlike board progress,
  which does resume. A deadline is an absolute instant, and resuming a stale one
  would put a nonsense clock in front of a class.
- **Host and display clocks are not synchronized.** The display applies a clamped
  (±5 s) estimate of the offset derived from each snapshot's `sentAt`; transport
  delay is ignored and no round-trip measurement is done. On today's same-browser
  transport both clocks are the same, so the correction is effectively a no-op.
- **The display never expires a timer.** At 0:00 it keeps showing the running
  state until the host publishes `expired`.
- **Undoing an expiry restores an already-overdue running timer**, which the host
  adapter then expires again on the next tick unless the host acts. Undo restores
  the prior durable state exactly; it does not invent a friendlier one.
- **`PublicState` wire version is now 8 (Slice 14) and the sync envelope version
  is 2.** A consumer pinned to either older version fails closed; there is no
  migration. Version 7 is rejected, never reinterpreted as 8.
- **Expiry awards and deducts nothing.** A window ending is a fact about the
  window, never a scoring decision.
- **Timer durations are 5–600 whole seconds**, authored per game or chosen per
  clue by the host. An out-of-range value is rejected, never clamped.
- **`OG-6` remains recorded but not implemented.** Scoring is not restricted to the
  active respondent; it stays available for every team. (`OG-2` and `OG-3` were
  implemented by Slice 8.)
- **Gamepad mappings are session-local and are LOST when the host page reloads.**
  This is deliberate: the roadmap records Slice 9's storage impact as none, and a
  browser controller index is not stable across a reload, so a restored mapping
  could silently point at the wrong controller. Buzz KEYS still persist; controller
  buttons do not.
- **A browser controller index is a session-local locator, not an identity.** It is
  not stable across a reload, a browser restart, a disconnect/reconnect, a USB port
  change, an operating system or a browser version, and it is never persisted.
- **Most browsers do not expose a controller until a button on it is pressed**, so
  a freshly plugged-in controller can legitimately read as "None detected" until it
  is touched. This is browser behaviour, not a defect in the panel.
- **Physical controller certification is bounded, not a SKU list.** Generic USB
  controller support is unit-proven against a fake source. OADL2-S07 on this host
  enumerated wireless `Wbuzz` / `054c:1000`, completed a serial browser 4×5 map
  and Playwright-assisted CQS setup/test/gameplay/keyboard under a **temporary**
  external HID output keep-alive (Gamepad API cannot send that keep-alive). See
  the bounded claim and non-claims in
  ([receipt](receipts/2026-08-01-oadl2-s07-sony-buzz-physical-certification.md)).
  Permanent keep-alive remained unresolved at that stage; Slice 21 / ADR-019
  later resolved it for the exact supported Namtai wireless `Wbuzz` `054c:1000`
  profile.
- **Controller buzzing starts switched OFF** and nothing is bound by default —
  there is deliberately no assumed "buzz button".
- **Slice 9 maps BUTTONS only.** No axes, sticks, analog triggers, motion,
  vibration or haptics, and no analog threshold tuning.
- **A tile still scores nothing by itself.** `multiplier` affects the DISPLAYED
  value and the typed `effectiveValue`, and revealing an answer awards nothing —
  a teacher must deliberately award or deduct.
- **The selected scoring target is host UI state only** and is lost if the host tab
  is reloaded. It is never broadcast and awards nothing by existing.
- **Undo reaches only the latest reversible event.** To fix an older score, apply a
  compensating manual correction; there is no targeted "undo this event".
- **A tile can only be scored while it is open** (the `prompt` or `answer` stage).
  Once the host returns to the board, use a manual correction.
- **A zero-value tile has no scoring preset** — every preset amount rule would
  require a zero delta, and a zero-point event is not recorded. Manual correction
  remains available.
- **Partial credit is a whole number of points**, never a fraction or a percentage,
  so there is no rounding rule to disagree about.
- **Score bounds are ±1,000,000** and a single adjustment is bounded the same way;
  an adjustment that would leave the range is rejected, never clamped.
- **Board state is per round and resumes on return.** Leaving a round and coming
  back restores its used tiles and reveal stage; that is deliberate, not a bug.
- **No second tile can be opened while one is live.** Return to the board first.
- **Alternates are never projected.** They are a host grading aid; making them
  public would be a separate, reviewed decision.
- **One schema version, no migrations.** `schemaVersion: 1` only. An older or
  newer version fails by design; a v2 will need a real, tested migration.
- **Paste is the only import transport.** No `.json` file picker, spreadsheet /
  CSV / XLSX import, remote URL import, or backend upload (later slices; each
  must converge on the same pipeline).
- **The import size guard counts characters, not bytes**, and applies only to the
  text entry point; the object entry point is bounded by nesting depth and the
  round/title/id limits.
- **Duplicate JSON keys are not observable** — `JSON.parse` keeps the last
  occurrence and the pipeline validates the survivor. Documented behaviour, not
  a claimed defence.
- **The placeholder round is retained** as the non-gameplay engine-test type
  and safe fallback fixture. Its config schema is intentionally trivial.
- **A consumer pinned to `PublicState` version 4, 3 or 2 fails closed**; there is
  no migration and none is implied.
- **Un-ending a game is not supported** — `GAME_SESSION_ENDED` is irreversible;
  re-initialize a game to start over.
- **Host-local IndexedDB persistence exists (Slice 13)** for saved definitions
  and active-session recovery on the same browser profile. It is not cloud sync,
  not cross-device, and not a second gameplay authority. Controller Gamepad
  mappings remain session-local. (Slice 8's keyboard-mapping storage is still
  host-device configuration, separate from session persistence.)
- **Sync is same-browser only** (BroadcastChannel, same origin). No cross-device
  sync, backend, or leader election — later/out of scope.
- The host "Foundation / testing controls" are diagnostics to prove the model,
  **not** game controls.

## Slice 15 work (Complete)

Host-private **Session Summary Contract** derived from authoritative event
history and replay only. Full rationale in
[`architecture/ADR-015-session-summary-contract.md`](architecture/ADR-015-session-summary-contract.md);
local evidence in
[`receipts/2026-08-04-slice-15-local-verification.md`](receipts/2026-08-04-slice-15-local-verification.md);
merge and post-merge evidence in
[`receipts/2026-08-04-slice-15-post-merge-reconciliation.md`](receipts/2026-08-04-slice-15-post-merge-reconciliation.md).

| Item | State |
| --- | --- |
| Versioned `SessionSummaryV1` contract (`classroom-quiz-show/session-summary`, version **1**) | Implemented |
| Public `deriveSessionSummaryV1(history)` — history only | Implemented |
| Discriminated result: available / no-session / no-game / active-or-incomplete / invalid-history | Implemented |
| Observed vs derived field truthfulness | Implemented |
| Effective-history + undo semantics | Implemented |
| Terminal-path classification (ordinary, Final unique winner, accepted tie, sudden-death winner) | Implemented |
| Unavailable authored rounds (`unsupported-round-type`) without fabricated metrics | Implemented |
| Timer-reset counts only when pre-event response timer is non-idle | Implemented |
| Host-only end-of-session summary panel (no new route/modal) | Implemented |
| Current-session-only lifecycle; no completed-session storage | Implemented |
| No summary in `PublicState`, sync, projector, or portable export | Proven by tests |
| Public-state wire / sync / game-file / persistence / IndexedDB versions | **Unchanged** (8 / 2 / 1 / 1 / 1) |
| Inherited Final mid-refresh recovery flake | **Unresolved** (not caused/worsened by Slice 15) |
| Slice 16 ledger | **Complete** via PR [#40](https://github.com/ricktron/classroom-quiz-show/pull/40) at `bc3cea65…` |
| Slice 17 theme/tokens | **Complete** via PR [#44](https://github.com/ricktron/classroom-quiz-show/pull/44) at `dee2f3c…` |
| Slice 18 audience display | **Complete** via PR [#46](https://github.com/ricktron/classroom-quiz-show/pull/46) at `91c7708…` |
| Slice 19 portable packs | **Complete** via PR [#50](https://github.com/ricktron/classroom-quiz-show/pull/50) at `95573e2…` |
| Slice 20 spreadsheet authoring seed | **Complete** via PR [#52](https://github.com/ricktron/classroom-quiz-show/pull/52) at `86e8f5e…` |
| Slice 21 Sony Buzz supported profile | **Complete** via PR [#55](https://github.com/ricktron/classroom-quiz-show/pull/55) at `b1e6d66…` |
| Slice 22+, post-MVP arcs, `CQS-OD-066` | **Unauthorized / inactive / unresolved** |

## Slice 16 work (Complete)

Host-private **Completed Summary Ledger & Compatible Reporting**. Architecture
contract:
[`architecture/ADR-016-completed-summary-ledger-compatible-reporting.md`](architecture/ADR-016-completed-summary-ledger-compatible-reporting.md)
(**Accepted**); implementation receipt:
[`receipts/2026-08-04-slice-16-local-verification.md`](receipts/2026-08-04-slice-16-local-verification.md);
semantic-review receipt:
[`receipts/2026-08-04-slice-16-semantic-review-r1.md`](receipts/2026-08-04-slice-16-semantic-review-r1.md);
post-merge reconciliation receipt:
[`receipts/2026-08-05-slice-16-post-merge-reconciliation.md`](receipts/2026-08-05-slice-16-post-merge-reconciliation.md).

### Slice 16 merge evidence

| Fact | Value |
| --- | --- |
| PR | [#40](https://github.com/ricktron/classroom-quiz-show/pull/40) (merged and closed) |
| Authorized base / sole squash parent | `f92b65fa2d6619d9c2a4d09b5457f0976ff91079` |
| Final reviewed-and-repaired head | `942575c97b97df220c215a7d265736a797869157` |
| Squash commit | `bc3cea65cab8db1481b0b2420be580cc69932f3d` |
| Merged | **2026-08-05T04:38:20Z** by `ricktron` |
| Reviewed-head / squash tree | identical (`12fea1bc056e6968e13a651161cdf89a6158a558`); direct diff empty |
| Landed paths | exactly **51** (`+4428` / `−111`) |
| Pre-merge CI (exact head) | run `30974663371` — **success** (jobs `92206096376`, `92206096393`) |
| Pre-merge Sonar | check `92206660573` — **success**; Quality Gate **passed** |
| Post-merge CI | run `30975717255` — **success** (jobs `92209173156`, `92209173149`) |
| Post-merge Pages | run `30975717243` — **success** (jobs `92209173097`, `92209242044`) |
| Post-merge Sonar (main) | check `92209863042` — **success** |
| Local post-merge verify | **success** — 2020 passed / 1 skipped |

| Item | State |
| --- | --- |
| Automatic completion capture from authoritative history | Implemented |
| Atomic completed-record put + `activeSessions/current` delete | Implemented |
| Retain newest 50 valid records; retention after successful save in a separate transaction | Implemented |
| Confirmed delete-one and clear-all | Implemented |
| Optional strict host-private `classLabel` | Implemented |
| Ledger envelope `classroom-quiz-show/completed-summary-record` v1 | Implemented |
| Competitive profile `classroom-quiz-show/competitive-profile` v1 | Implemented |
| Canonical-definition SHA-256 over Slice 12 exporter's exact UTF-8 `jsonText` | Implemented |
| Exact-compatible game/team/class rollups with filters, sorting, and mismatch explanations | Implemented |
| Unknown envelope/summary/profile versions fail closed; quarantine retained | Implemented |
| Semantic-review R1 repairs (filters, detail, key equality, leadership, docs) | Merged |
| IndexedDB schema | **1 → 2** (`completedSummaries` added) |
| Public wire / sync / game-file / active-session wire / summary contract | **Unchanged** (8 / 2 / 1 / 1 / 1) |
| Full archive, transcript, exact private responses, individual identity, grading/mastery | **Excluded** |
| Inherited Final mid-refresh recovery flake | **Not claimed repaired** |
| Implementation source branch deleted | **Not claimed** (still present at review time) |

## Slice 18 work (Complete)

Accepted Phase 2B **Audience Display System** on public-state wire **8**. Local
evidence:
[`receipts/2026-08-06-slice-18-audience-display-local-verification.md`](receipts/2026-08-06-slice-18-audience-display-local-verification.md);
post-merge reconciliation:
[`receipts/2026-08-06-slice-18-post-merge-reconciliation.md`](receipts/2026-08-06-slice-18-post-merge-reconciliation.md).

### Slice 18 merge evidence

| Fact | Value |
| --- | --- |
| PR | [#46](https://github.com/ricktron/classroom-quiz-show/pull/46) (merged and closed) |
| Authorized base / sole squash parent | `6e29121d850cf4b4a4ba366c706225f208166f93` |
| Final reviewed head (includes R1 repairs) | `bd946f323f381931f706d3a2ff3957d911b5c696` |
| Squash commit | `91c7708626caeaa28b15617a1f0938f4944f7680` |
| Merged | **2026-08-07T01:41:48Z** |
| Reviewed-head / squash tree | identical (`bc95d77efc15e3f63a3ea15c397df53e904767fc`); direct diff empty |
| Landed paths | exactly **22** |
| Post-merge CI | run `31138847378` — **success** (jobs `92744217239`, `92744217248`) |
| Unit totals (post-merge) | **110** files; **2126** passed / **1** skipped |
| Playwright (post-merge) | **313** passed / **14** skipped / **3** flaky / **0** terminal failures |
| Post-merge Sonar | check `92746422985` — **success**; Quality Gate **passed** |
| Post-merge Pages | run `31138847376` — **success**; deployment `5787310456` state **success** |
| Source branch | `feat/slice-18-audience-display` preserved at reviewed head |

| Item | State |
| --- | --- |
| Board-first public audience composition | Implemented |
| Slice 17 theme/token foundation consumed for presentation | Implemented |
| Nexus Core + compact public timer indicator (R1) | Implemented |
| Adaptive Score Column / Strip / Deck | Implemented |
| Compact / expanded / Final Signal Rails | Implemented |
| Final Signal Rail owns primary Final countdown; tie-safe status (R1) | Implemented |
| Quiet cognition vs louder consequence presentation | Implemented |
| Living-board / Final-specific presentation | Implemented |
| Fail-closed `Scores unavailable` for public team `unavailable` (R1) | Implemented |
| Public-only audience rendering + privacy tests | Proven by tests |
| Public-state wire / sync / schemas / persistence / packages | **Unchanged** |
| Inherited Final mid-refresh recovery flake | **Unresolved** (not claimed repaired) |
| Physical projector / live-route certification | **Not claimed** |

## Next safe action

**Slice 21 — Sony Buzz Supported-Profile Operationalization is terminally
`Complete`** on `main` via implementation PR
[#55](https://github.com/ricktron/classroom-quiz-show/pull/55) (exact-head squash
`b1e6d669e91b55b20261e86a47d7818f069b0252` from accepted head
`3bd6c91330298c4374db137e3ce220e0d28a5c2f`, merged **2026-08-10T14:39:15Z**).
Terminal post-merge CI (`31399326956`) and Pages (`31399326758`) **success**.
Three-controller physical product RC **PASS** (owner disposition sufficient;
fourth slot historical / owner-accepted — not a fresh four-handset claim).
**PR #55 requires no further product review or merge action.** Canonical docs
reconciliation for Slice 21 is merged and complete on `main` via PR
[#56](https://github.com/ricktron/classroom-quiz-show/pull/56) (exact-head squash
`7b23cc670d4723b1e0e3be686bccf288150abc67` from accepted head
`3fcc45c7378ec51616dc83fca1518c4707105f47`, merged **2026-08-10T17:17:58Z**)
under `AUTHORIZE-CQS-SLICE-21-POST-MERGE-CANONICAL-RECONCILIATION-1`.
**PR #56 requires no further reconciliation action**; no further Slice 21
reconciliation lane is owed.
**Slice 20 — Spreadsheet Authoring Seed remains terminally `Complete`** on `main`
via PR [#52](https://github.com/ricktron/classroom-quiz-show/pull/52).
Slice 19 remains terminally `Complete` (PR #50 / #51). Slice 18 remains
terminally `Complete` (PR #46 / #47). Slice 17 remains terminally `Complete`
(PR #44 / #45). Phase 2B’s MVP consumers (Slices 17–18) are both `Complete`.
Slices **1–21** are `Complete`.

**Roadmap Amendment 004 (`CQS-PLAN-S03`) is merged and canonical on `main`**
via PR [#48](https://github.com/ricktron/classroom-quiz-show/pull/48) (squash
`a73e6f86bf0757aa118cb9c3247f4e6eddaa090b` from reviewed head
`b9e30be96af7d2276cae310ef2601cad4424a635`; merged **2026-08-07T18:15:39Z**).
**PR #48 requires no further review or merge action.** CQS-PLAN-S03
planning/merge authority is exhausted. Post-merge reconciliation evidence is
recorded in
[`receipts/2026-08-07-cqs-plan-s03-post-merge-reconciliation.md`](receipts/2026-08-07-cqs-plan-s03-post-merge-reconciliation.md);
that reconciliation adds evidence only and grants **no** product authority.
**Current** MVP count is the **23-slice** plan.

**Recommended next action:**
independent exact-head review of the Slice 22 implementation PR (owner listening
RC pending before merge acceptance). Slice 22 is **not** canonically Complete.
Do **not** begin Slice 23 qualification or post-MVP work from this surface.
Known LOW debt **F-UX-01**
(demote WebHID/Gamepad jargon from ordinary setup) is retained polish, not a
Slice 21 blocker. Post-MVP arcs remain inactive; theme song remains post-MVP;
`CQS-OD-066` remains unresolved; the inherited Final mid-refresh recovery flake
remains unresolved. Phase 3 readiness has served the theme-foundation →
audience-display sequence.

**Roadmap Amendment 003 (`CQS-PLAN-S02`) delivery and post-merge
reconciliation remain complete on `main`** (PR #35 squash `2ebeb240…`; PR #36
squash `da6b4dc3080abf9a8effe142e19a4eb36aa6ad8d`).

Coding agents and contributors should read root [`../AGENTS.md`](../AGENTS.md)
(and pointer-only [`../CLAUDE.md`](../CLAUDE.md) for Claude sessions) before
mutating the repository.

**Additional response modes are deferred until after the functional MVP** — see
the owner direction recorded in
[`handoff/CURRENT.md`](handoff/CURRENT.md). **Team-specific / custom /
identity-pack buzz-in audio remains deferred post-MVP owner direction**
(recorded in the same place, 2026-07-27). Distinct from that deferral,
**Minimal Presentation Audio** is MVP Slice 22 under merged Amendment
004 and is **in implementation review** (not Complete; owner listening RC
pending). Slice 23 remains unauthorized. The active
MVP roadmap is **23 slices**.
