# Status

**Current slice:** Slice 11 — Media contract
**Slice state:** **Complete** — squash-merged via PR #23 at `5d47b2f` from final
reviewed head `bb8bd94` (merged **2026-07-28T04:56:27Z**); exact 40-path file-list
and blob equality confirmed; post-merge verification succeeded. Legacy text and
strict same-origin static-image prompts on schema version **1**; public-state
wire **7**; sync-envelope **2**.
**Previous slice:** Slice 10 — Sony Buzz! mapping, validation & host setup UX
(`Complete`, squash-merged via PR #21 at `5575be3`; physical certification
deferred, no compatibility claim)
**Next slice:** Slice 12 — Portable export & round-trip import (`Planned`,
unstarted — a separate Slice 12 planning/orchestration lane is authorized;
implementation is not)
**Roadmap:** 18 slices, amended 2026-07-26 by
[`decisions/ROADMAP-AMENDMENT-001-local-buzzers.md`](decisions/ROADMAP-AMENDMENT-001-local-buzzers.md)
(**merged to `main` via PR #13**, merge commit `752a3fe`, 2026-07-26T20:02:13Z)

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
> scope; **physical Sony Buzz! certification remains deferred**, and **no
> compatibility claim is made**. See
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
> default branch. The abandoned branch has been **deleted** — `main` is the only
> remote branch.

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
covers the owner-accepted hardware-independent scope; physical certification
remains deferred; no compatibility claim is made.

> **The headline is what did NOT change:** no schema, no `PublicState`, no sync
> protocol version, no command, no event, no reducer, no queue logic, no timer
> transition and no scoring behaviour. **No physical Sony Buzz! compatibility is
> claimed.**

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
| **Physical Sony Buzz! validation on owner hardware** | **Deferred certification — required before any supported-hardware claim** |
| Supported/compatibility/certified language | **Not used — not claimed** |
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

- **One playable round type.** `category-board` reveals prompts and answers and
  tracks used tiles; Slice 6 added teams and scoring on top of it, and Slice 7 adds
  the response window. No buzzer or wager exists.
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
- **`PublicState` wire version is now 7 and the sync envelope version is 2.** A
  consumer pinned to either older version fails closed; there is no migration.
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
- **No physical controller has been tested.** Generic USB controller support is
  implemented and unit-proven against a fake source; no specific device is claimed
  to work, and there is no supported-hardware list.
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
- **Event history and definitions are in-memory only** — lost on tab close.
  Durable IndexedDB persistence/recovery is **Slice 13** under the amended
  18-slice roadmap. (Slice 8's keyboard-mapping storage is host-device
  configuration, not session persistence.)
- **Sync is same-browser only** (BroadcastChannel, same origin). No cross-device
  sync, backend, or leader election — later/out of scope.
- The host "Foundation / testing controls" are diagnostics to prove the model,
  **not** game controls.

## Next safe action

**Review and merge the Slice 11 post-merge reconciliation PR.** Slice 11 is
`Complete`. PR #23 was squash-merged at `5d47b2f` from final reviewed head
`bb8bd94`. Exact 40-path file-list and blob equality confirmed that the reviewed
content is what landed. Post-merge verification succeeded. The completed
contract supports legacy text and strict same-origin static-image prompts on
canonical schema version 1, with public-state wire version 7 and sync-envelope
version 2.

**Slice 12 — Portable export & round-trip import** is `Planned` and unstarted.
The next safe action after this reconciliation merges is a **separate Slice 12
planning/orchestration lane**. This reconciliation does not authorize Slice 12
implementation.

**Additional response modes are deferred until after the functional MVP** — see
the owner direction recorded in
[`handoff/CURRENT.md`](handoff/CURRENT.md). **Optional team buzz-in audio cues are
likewise deferred owner direction only** (recorded in the same place, 2026-07-27).
Nothing about either is designed, scheduled or authorized; no audio file,
playback code, audio schema, audio event or sound-pack manifest exists; and the
active MVP roadmap remains **18 slices**.
