# Slice 14 — Final-wager round: implementation & local verification

**Immutable evidence snapshot. Not a status surface.** This receipt records what
was observed at the time of writing and is never rewritten to simulate later
state. Current status lives in [`../STATUS.md`](../STATUS.md).

| Field | Value |
| --- | --- |
| Slice | `CQS-SLICE-14-FINAL-WAGER` |
| Authorization ID | `AUTHORIZE-CQS-S14-FINAL-WAGER-IMPLEMENTATION-1` |
| Evidence-state ID | `CQS-S14-ES-1` |
| Repository | `ricktron/classroom-quiz-show` |
| Authorized base | `4de1454181ed58bdb282accd136129c3c0eb0f2b` (`origin/main`) |
| Branch | `claude/cqs-slice-14-final-wager` |
| Final head | recorded in the delivery pull request; see §10 |
| Date | 2026-08-03 (UTC) |
| Host / user / path | `vm` / `root` / `/home/user/classroom-quiz-show` |
| Slice state claimed | **In review** — **not** `Complete`, **not** merged |

## 1. Execution-lane correction

The implementation was carried out on the harness-designated branch
`claude/slice-14-authorization-3bm0ju`, which was the branch this execution
environment supplied. The authorization names
**`claude/cqs-slice-14-final-wager`**.

On continuation the authorized branch was created **at the existing commit**
(`git checkout -b claude/cqs-slice-14-final-wager`), preserving the full working
tree and both implementation commits. **Nothing was reset, discarded, rebased, or
overwritten.** During the reconciliation fetch, the remote-tracking ref
`origin/claude/slice-14-authorization-3bm0ju` was observed as **deleted upstream**;
it was never pushed to from this lane.

At reconciliation:

- `origin/main` = `4de1454181ed58bdb282accd136129c3c0eb0f2b` — **exactly the
  authorized base**;
- `git merge-base HEAD origin/main` = the authorized base;
- no overlapping Slice 14 branch, worktree or pull request existed;
- `git diff --check` clean;
- every change attributable to this authorization.

## 2. What was implemented

`final-wager` as the **second playable registered round type**, inside the
existing command → event → replay architecture. It is **not** a game mode, a
preset or policy engine, an extension of `category-board`, a parallel store, or a
screen outside that core. Full rationale in
[`../architecture/ADR-014-final-wager-round.md`](../architecture/ADR-014-final-wager-round.md).

| Area | Delivered |
| --- | --- |
| Domain | `src/game/finalWager/` — bounded limits, strict Zod config schema reusing the Slice 11 typed prompt contract, trusted deep-frozen definition, eligibility/cap/reveal-order rules, replay-derived state, registry entry |
| Registry | Registered by application code only, in `createDefaultRegistry` alongside `placeholder` and `category-board` |
| State core | 18 commands, 17 events, per-round `finalWagers` map, full phase machine in the pure reducer, 16 new precise rejection reasons |
| Public wire | `PublicFinalWagerState` added to `PublicRoundState`; `PUBLIC_STATE_SCHEMA_VERSION` **7 → 8**; exact-key runtime guard per stage |
| Import | Three cross-round rules with three new issue codes, at exact document paths |
| Export | Round-trips through the existing generic canonical exporter; no exporter change was required |
| Persistence | Every Final event encoded/decoded by the existing private codec; no new store, table, snapshot or recovery path |
| Host UI | `FinalWagerHostPanel` + `useFinalWagerExpiry` |
| Projector | `FinalWagerDisplay`, fail-closed |

## 3. Owner-decision integration

| Decision | Implemented as |
| --- | --- |
| `CQS-OD-005` eligibility | Two bounded modes — **Classic** (default; pre-final score > 0) and **Inclusive**. No per-team override. Mode, pre-final scores, eligible ids, caps and default reveal order are frozen onto `FINAL_WAGER_STARTED` and do not drift. A Classic Final with zero eligible teams proceeds safely to a resolution phase on the pre-final scores, fabricating no wager and no response. |
| `CQS-OD-006` wager cap | Positive team → own snapshotted score. Zero-or-negative team → highest positive **effective** ordinary `category-board` tile value among rounds **preceding** Final; zero when none exists. Effective maximum also bounded by **both** score-bound headrooms, floored at zero. Invalid wagers are **rejected, never clamped, coerced, rounded or repaired**. Zero is explicit and valid. |
| `CQS-OD-007` response capture | `exact-text` or `host-only`, chosen once with the response window. Three distinct durable states (`exact`, `not-captured`, `no-response`); "missing" is deliberately not a member. Whitespace-only exact text is rejected. Exact text is refused when the host chose `host-only`. No transcript, archive, retention setting, recording or student entry. |
| `CQS-OD-008` reveal order | Default ascending snapshotted pre-final score with **authored team order** as a deterministic index tie-break. Host may reveal any unrevealed eligible team; the event records the actual choice. One team on screen at a time. |
| `CQS-OD-011` ties | Unique leader → explicit completion through the existing `END_GAME_SESSION`. Tied lead → **both** choices presented, sudden death default-highlighted but never automatic. Accepted tie is two-step, irreversible, and appends the existing `GAME_SESSION_ENDED` beside it. Sudden death keeps the game active and narrows manual correction to tied leaders only. No authored sudden-death prompts, no sudden-death engine, no new buzzer behaviour. |

## 4. Version matrix

| Surface | Before | After | Note |
| --- | ---: | ---: | --- |
| Public-state wire | 7 | **8** | Required: a v7 display's round guard accepts only `kind: 'board'`, so a Final payload would freeze the projector on a stale board. v7 is rejected, never reinterpreted. |
| Sync envelope | 2 | **2** | Unchanged — no transport metadata needed. |
| Canonical game-file schema | 1 | **1** | A new registered round type does not alter any previously valid document's meaning. |
| `GameDefinition` model | 1 | **1** | Unchanged. |
| Private persistence wire | 1 | **1** | Existing event shapes unchanged; this build decodes both old histories and histories containing the new variants. **No migration was created.** |
| IndexedDB database schema | 1 | **1** | Still exactly three object stores. |
| Dependencies / lockfile | — | **unchanged** | `git diff --name-only origin/main...HEAD -- package.json package-lock.json .github/ …` returns **zero paths**. |

## 5. Changed paths

42 paths at the implementation commits; documentation added on top. No
dependency, lockfile, workflow, deployment, or build-config change.

**Added (21):**
`src/game/finalWager/{limits,schema,definition,eligibility,finalState,roundType}.ts` ·
`src/game/finalWager/finalWager.test.ts` ·
`src/state/finalWagerReducer.test.ts` · `src/state/finalWagerSanitize.test.ts` ·
`src/import/finalWagerImport.test.ts` · `src/persistence/finalWagerWire.test.ts` ·
`src/host/FinalWagerHostPanel.tsx` · `src/host/FinalWagerHostPanel.css` ·
`src/host/FinalWagerHostPanel.test.tsx` · `src/host/useFinalWagerExpiry.ts` ·
`src/host/useFinalWagerExpiry.test.tsx` · `src/display/FinalWagerDisplay.tsx` ·
`src/display/FinalWagerDisplay.css` · `src/display/FinalWagerDisplay.test.tsx` ·
`src/test/finalWagerFixtures.ts` · `tests/e2e/final-wager.spec.ts` ·
`docs/architecture/ADR-014-final-wager-round.md` · this receipt.

**Modified (source, 11):** `src/game/defaultRegistry.ts` ·
`src/state/{commands,events,privateState,publicState,reducer,sanitize}.ts` ·
`src/import/{issues,semantic,sampleGameFile}.ts` ·
`src/persistence/wire/sessionWire.ts` · `src/host/FoundationControls.tsx` ·
`src/host/GameImportPanel.tsx` · `src/routes/DisplayRoute.tsx` ·
`src/test/leakLabels.ts`.

**Modified (existing tests, 6):** `src/game/registry.test.ts` ·
`src/import/categoryBoardImport.test.ts` ·
`src/state/{buzzSanitize,categoryBoardSanitize,responseSanitize,teamScoreSanitize}.test.ts` ·
`src/host/useHostPersistence.test.tsx`. Each change is the mechanical consequence
of the wire bump (7 → 8) or the third registry entry, plus one added
follower-lease test. **No test was weakened, skipped, deleted, or rewritten to
avoid a legitimate failure.**

**Modified (docs, 6):** `README.md` · `docs/PROJECT.md` · `docs/STATUS.md` ·
`docs/handoff/CURRENT.md` · `docs/plans/MVP-ARC.md` ·
`docs/decisions/README.md`.

### Correction recorded

The first implementation commit message (`0c5edb1`) states "19 commands and 17
events". The verified count is **18 commands and 17 events**
(`git diff origin/main...HEAD -- src/state/commands.ts | grep -c "^+  '.*FINAL"`
→ 18). The commit message was left unrewritten — history is not rewritten to
simulate accuracy — and every durable documentation surface states 18.

## 6. Acceptance spot checks

All 30 required checks are covered by automated tests. Representative bindings:

| # | Requirement | Evidence |
| ---: | --- | --- |
| 1–3 | One Final; terminal; teams required | `finalWagerImport.test.ts` — "rejects a second Final round, naming the first", "rejects a Final that is not the terminal round", "rejects a Final in a game with no teams"; runtime half in `finalWagerReducer.test.ts` |
| 4 | Frozen conditions do not drift | `finalWagerReducer.test.ts` — "freezes eligibility, scores, caps and reveal order onto the event", "does NOT drift once scores move afterwards" |
| 5 | Classic / Inclusive | "excludes a zero and a negative team under classic", "includes every team under inclusive, capping non-positive ones by the board" |
| 6 | Private, integer, zero-permitted, capped, rejected not clamped | wager-entry block (zero, exact cap, cap+1, negative, fraction, `NaN`, `Infinity`) + `finalWagerSanitize.test.ts` "no wager data" |
| 7 | Score-bound headroom | `finalWager.test.ts` — "bounds the maximum by the upper/lower score headroom", "never returns a negative maximum" |
| 8 | Correction evented before lock | "records a correction as a NEW event, leaving the earlier one in the log" |
| 9 | Committed wagers survive refresh | `finalWagerWire.test.ts` "resumes wager entry…" + e2e "a refresh mid-Final resumes every committed wager" |
| 10–11 | Both capture modes; blank ≠ no-response | "records all three durable states as DISTINCT facts", "rejects whitespace-only exact text rather than treating it as no response" |
| 12 | Separate windows | "runs a separate response window with its own identity" |
| 13 | Expiry does nothing else | **"EXPIRY LOCKS NOTHING: the phase, the wagers and the responses are untouched"** |
| 14 | Prompt public at response-window start | `finalWagerSanitize.test.ts` "sends the prompt ONLY once the response window opens" |
| 15–16 | Default order + tie-break; alternate choice | `finalWager.test.ts` ordering tests; reducer "offers the default low-to-high order but accepts any unrevealed team" |
| 17 | Only the active team's data is public | "sends ONE revealed team, with correctness absent until settlement" |
| 18–21 | Settlement arithmetic, zero-wager auditability, duplicate rejection | reducer settlement block |
| 22 | Undo restores score AND unsettled state | "undoes a settlement, restoring both the score and the unsettled reveal" |
| 23–26 | Explicit completion; both tie choices; highlighted-not-automatic; tied-leader-only correction | `FinalWagerHostPanel.test.tsx` + reducer "restricts manual correction to a TIED LEADER during sudden death" |
| 27 | Nothing forbidden on the wire | `finalWagerSanitize.test.ts` — "what the projector NEVER sees" (17 parameterized needles) + future-field non-leak |
| 28 | Exact recovery at every phase | `finalWagerWire.test.ts` — wager entry, wager lock, response entry, answer reveal, current reveal team, **partial settlement**, unresolved tied resolution, sudden death |
| 29 | Resume/Discard explicit | existing Slice 13 coverage + e2e refresh test clicks **Resume** explicitly |
| 30 | Follower lease prevents mutation | `useHostPersistence.test.tsx` — "blocks a follower tab from mutating a Final round (Slice 14)" |

**Nothing in the acceptance list is claimed by inspection alone.**

## 7. Validation results

Every command below was run to a **terminal exit status**, and that status is
reported as observed. Nothing is reported as passing on inference.

| Command | Exit | Result |
| --- | ---: | --- |
| `git diff --check` | **0** | clean |
| `npm run lint` | **0** | pass — no errors, no warnings |
| `npm run typecheck` | **0** | pass |
| `npm run test:run` | **0** | **1,927 passed · 1 skipped · 87 files** |
| `npm run build` | **0** | pass (`dist/` + PWA precache 17 entries) |
| `npm run test:e2e` | **1** | **247 passed · 2 skipped · 3 FAILED** — see §7b |
| `npm run verify` | — | its three constituents (`lint`, `typecheck`, `test:run`) each exited **0**; the aggregate was not separately re-run |
| `npm run verify:all` | — | **not separately re-run**; it necessarily fails while `test:e2e` exits 1 |

The single skipped unit test and two skipped e2e tests are the pre-existing
desktop-only offline-shell skips recorded for earlier slices; Slice 14 skips
nothing.

### 7b. The three e2e failures are PRE-EXISTING on the authorized base

**All three failures are the same single test**, run once per Playwright project:

```
tests/e2e/gamepad-input.spec.ts:377
  simulated Sony Buzz candidate supports setup capture, apply, and test mode
  without scoring
    → Error: page.evaluate: Test timeout of 90000ms exceeded
    → at pressSimulatedGamepadButton (tests/e2e/gamepad-input.spec.ts:150:9)
```

Attribution was established by direct experiment, not by assumption:

| Run | Tree | Result |
| --- | --- | --- |
| Full suite, 2 workers | this branch | 3 failed (same test × 3 projects) |
| That spec alone, 1 worker | this branch (`3d59fb4`) | **1 failed** — rules out worker contention |
| That spec alone, 1 worker | **authorized base `4de1454`, in a clean `git worktree`** | **1 failed — identical test, identical stack** |

The failure signatures on the two trees are byte-identical after path
normalization. **The same test fails on `main` with zero Slice 14 code present.**

Slice 14 touches **none** of the implicated surface:
`git diff --name-only origin/main...HEAD -- tests/e2e/gamepad-input.spec.ts src/input/ src/host/GamepadInputHostPanel.tsx src/host/useGamepadBuzzInput.ts src/host/SonyBuzzSetupSection.tsx`
returns **zero paths**.

Most plausible cause: the documented local Chromium mismatch. This sandbox's
pre-provisioned Chromium is build **1194** while `@playwright/test@1.56` expects
**1228**, and the failing step is a `page.evaluate` driving a *simulated* Gamepad
— exactly the kind of browser-internal surface that build skew affects. CI
installs the matching browser and is the authority here; Slice 13's recorded
post-merge CI shows this suite green.

**The test was NOT weakened, skipped, quarantined, retried into a pass, or
modified in any way.** Repairing a pre-existing base defect is outside this
authorization, and doing so silently would misattribute the fix to Slice 14.

**Every Final-related e2e test passes**, including all five scenarios in
`tests/e2e/final-wager.spec.ts`, and every board, import, export, persistence,
sync, routing, PWA, accessibility and projector-safety regression test passes.

**Local Playwright note.** `test:e2e` requires
`PLAYWRIGHT_CHROMIUM_PATH=/opt/pw-browsers/chromium-1194/chrome-linux/chrome` in
this sandbox. The override is passed **via the environment only and is never
committed** — the same documented condition recorded for earlier slices.

## 8. Privacy and recovery evidence

- **Public projection** is allow-list based: every field is named and copied
  individually; nothing is spread, cloned-and-deleted or serialized. A test adds
  a synthetic future field to the private Final state and asserts it does not
  appear in the serialized snapshot.
- **Per-stage exact-key guards** reject any payload carrying an extra key, a
  missing key, an authored team id in place of a positional key, a negative
  wager, a bare response smuggling text, or an unknown outcome.
- **Assertions on the serialized snapshot** (not merely rendered text) confirm
  the absence of alternates, host notes, eligibility mode, capture mode, authored
  team/round ids, the registry type, Final timer ids, event types, undo metadata,
  `preFinalScore`, `maxWager`, `revealOrder`, `snapshot`, `issuedAt`,
  `occurredAt`, and lease data.
- **Recovery** is proven by encode → decode → replay equality at every Final
  phase, including partial settlement with the settled score preserved and the
  remaining team still unrevealed.
- **Decoder fail-closed** cases: unknown field, negative wager, fractional wager,
  whitespace-only exact response, unknown response kind, unknown capture mode,
  a snapshot whose reveal order names a stranger or omits an eligible team, an
  unknown eligibility mode, a mismatched reversibility, and an accepted tie
  encoded as reversible.
- **Follower lease**: a follower tab's `BEGIN_FINAL_WAGER` is rejected and
  appends nothing. Final commands travel the same dispatch gate as every other
  session command — there is no Final-specific write path.

## 9. Known limitations, risks and non-claims

0. **`npm run test:e2e` exits 1 on this tree — and on the authorized base.** The
   three failures are one pre-existing Slice 10 test (§7b), reproduced on
   untouched `main`. `verify:all` therefore cannot pass locally until that base
   defect or the sandbox browser mismatch is resolved. **This slice does not
   claim a green `verify:all`.** CI on the pushed head is the authority.
1. **Manual verification was NOT performed.** No human drove the host and
   projector through a Final round in a real browser session. Every claim in this
   receipt rests on automated tests. The manual matrix in the authorization
   (two-team Classic play-through, simultaneous host/projector inspection,
   keyboard-only operation, 1280×720 legibility, reduced-motion, image fallback)
   is **not** claimed.
2. **Live-route behaviour is not claimed.** No deployed URL was exercised.
3. **Final state deliberately survives a round change**, diverging from
   ADR-007 §8 for a stated reason (ADR-014 §14). A Final window that is stale on
   return is recorded as expired, which changes nothing on its own — but a host
   who leaves Final mid-window and returns much later will see an expired window
   rather than a running one.
4. **The scoring planner now has one round-type-aware rule** (the sudden-death
   restriction). It is deliberately narrow and named. A second such rule would be
   the signal to reconsider where round-specific scoring policy belongs.
5. **`sessionWire` decode complexity.** The pre-existing non-gate-driving
   `typescript:S3776` advisory on the decoder remains deferred; Slice 14 adds
   Final cases to the same switch in the same style rather than refactoring it,
   because unrelated refactoring is not this slice's purpose. Sonar was **not**
   inspected locally (`sonarcloud.io` is unreachable from this sandbox).
6. **A zero-wager Final still writes a settlement event.** This is intended
   (auditability), but it means the event log grows by one event per team even
   when no points move.
7. **No physical hardware claim** is made or changed by this slice; Final uses
   host entry only and touches no input subsystem.

## 10. Delivery state

- Branch `claude/cqs-slice-14-final-wager` pushed; **one non-draft delivery pull
  request** opened against `main`.
- The exact final head and the observed check names, statuses and conclusions are
  recorded in the pull request and in the final execution report.

**Explicit non-claims for this slice:**

- The pull request was **NOT merged**, and auto-merge was **NOT** enabled.
- **No post-merge verification or reconciliation** was performed.
- **No branch deletion or cleanup** was performed.
- **No Slice 15 or post-MVP work** was started.
- Slice 14 is **In review**. It is not `Complete`, not shipped, and not merged.
- `CQS-OD-066` remains unresolved and untouched.
