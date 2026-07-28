# Slice 10 — PR #21 review and SonarCloud disposition

- **Date:** 2026-07-28
- **Identifier:** `CQS-SLICE-10-SONY-BUZZ-MAPPING`
- **PR:** [#21](https://github.com/ricktron/classroom-quiz-show/pull/21) — open and unmerged
- **Repository:** `ricktron/classroom-quiz-show`
- **Base SHA:** `0bcfed11fc9e63e7190942a41d4db1308dab66a4`
- **Starting PR head (authorization):** `c9f609a28dad6e91f6f990a0fb9e2e59ee7b80b1`
- **Final reviewed head:** recorded at tip of `claude/slice-10-sony-buzz-mapping` after the review commit that includes this receipt
- **Environment:** local macOS (Darwin 25.5.0, arm64), Node `v26.0.0`, npm `11.12.1`
- **Lane:** code review + Sonar disposition only — **not** physical hardware validation, **not** merge, **not** Slice 11

## 1. Verdict

**PASS** — all five Sonar findings dispositioned; in-scope lifecycle and boundary
hardening applied; architecture and privacy boundaries hold; local verification
green; PR remains open and unmerged; owner physical Sony Buzz! validation remains
the only completion gate. Slice 10 is **not** `Complete`.

## 2–5. Identity, base, heads

| Item | Value |
| --- | --- |
| Repo root | `/Users/macdaddy/Documents/Coding/Cursor Projects/classroom-quiz-show` |
| Remote | `origin` → `ricktron/classroom-quiz-show` |
| Branch | `claude/slice-10-sony-buzz-mapping` |
| Base | `0bcfed11fc9e63e7190942a41d4db1308dab66a4` (= `origin/main`) |
| Starting head | `c9f609a28dad6e91f6f990a0fb9e2e59ee7b80b1` (matched authorization) |
| Final head | tip after review commit (same branch; see git log) |

## 6. Preflight evidence

| Check | Result |
| --- | --- |
| Working tree before edits | clean |
| PR #21 state | `OPEN`, not draft, base `main`, head branch correct |
| Mergeability at start | `MERGEABLE` / `CLEAN` |
| HEAD vs authorized | equal |
| `HEAD...origin/main` | `1 0` (one ahead: implementation commit) |
| Other open PRs | only #21 |
| Worktrees / stashes | one worktree; no stashes |
| Canonical status | Slice 10 `In review`; physical pending; Slice 11 unstarted |
| CI on starting head | Lint/typecheck/unit/build **pass**; Playwright e2e **pass**; Sonar QG **pass** |

No hard-stop condition triggered.

## 7. Changed-file list (implementation commit `c9f609a`)

26 files as authorized (new profile/setup modules, host integration, ADR-010,
verification receipt, status docs, Gamepad source/tests, e2e privacy adjustments).
Unauthorized paths under `src/state/`, `src/sync/`, `src/display/` runtime,
`src/game/`, `src/import/`, `src/time/`, `public/`, `.github/`, `scripts/`,
`package.json`, lockfiles, and tool configs: **unchanged**.

Review-lane edits (this receipt’s commit) touch only Slice 10 implementation,
tests, ADR-010 clarification, this receipt, and the PR description.

## 8. Review method

- Mandatory preflight + FF-only pull of the PR branch
- Full PR diff / name-status / commit log vs `origin/main`
- Governing docs (STATUS, CURRENT, MVP-ARC, ADR-010, receipts, ROADMAP amendment)
- Line-level review of Gamepad source, device profile, Sony capture recipe, poll
  owner, setup UX, e2e instrumentation
- SonarCloud issues API:
  `https://sonarcloud.io/api/issues/search?componentKeys=ricktron_classroom-quiz-show&pullRequest=21&resolved=false`
- Privacy / dispatch path searches across `src/` and `tests/`
- Focused Vitest + full `npm run verify:all`

Evidence classes used below:

- **Inspected** — code/doc review
- **Proved** — automated unit/component/e2e
- **CI-reported** — GitHub Actions / Sonar on the PR
- **Physical-pending** — owner hardware gate (not performed)

## 9. Sonar disposition table (all five)

| # | Key | Rule | Severity | Location | Message (summary) | Disposition | Rationale |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | `AZ-mXly1C4SILGvTmZUd` | `typescript:S6819` | MAJOR | `SonyBuzzSetupSection.tsx:220` | Prefer native `fieldset` over `role="group"` | **FIXED** | Replaced with `<fieldset>` + visually hidden `<legend>`; CSS reset for border/padding |
| 2 | `AZ-mXly1C4SILGvTmZUe` | `typescript:S3358` | MAJOR | `SonyBuzzSetupSection.tsx:360` | Nested ternary | **FIXED** | Extracted `describeTestOutcome()` |
| 3 | `AZ-mXluYC4SILGvTmZUc` | `typescript:S3776` | CRITICAL | `useGamepadBuzzInput.ts:305` | Cognitive complexity 16 → ≤15 | **FIXED** | Extracted `consumeCaptureEdge`, `reportTestModeEdges`, `dispatchGameplayEdges` (also clarifies test-mode isolation) |
| 4 | `AZ-mXlzIC4SILGvTmZUf` | `typescript:S2925` | MAJOR | `gamepad-input.spec.ts:126` | Fixed `waitForTimeout` | **FIXED** | `settleGamepadPolls()` waits on `requestAnimationFrame` |
| 5 | `AZ-mXlzIC4SILGvTmZUg` | `typescript:S2925` | MAJOR | `gamepad-input.spec.ts:137` | Fixed `waitForTimeout` | **FIXED** | Same helper on release settle |

Quality Gate pass alone was **not** treated as disposition. Reported 0.0% new-code
coverage was **not** chased with meaningless tests; existing unit/e2e coverage of
the changed modules was already substantial (Sonar coverage metric remains a
reporting/config artifact, not a claim of zero tests).

## 10. Architectural boundary findings

| Area | Result | Evidence class |
| --- | --- | --- |
| A. Browser API boundary | Hold; hardened | Inspected + Proved |
| B. Device classification | Hold (VID/PID only; candidate copy) | Inspected + Proved |
| C. Capture recipe | Hold (no hard-coded indices; stage/apply/discard) | Inspected + Proved |
| D. Poll lifecycle | Hold after sync re-prime fix | Inspected + Proved |
| E. Test mode | Hold (no translate/dispatch) | Inspected + Proved |
| F. Host UX / a11y | Hold after fieldset fix | Inspected + Proved |
| G. Privacy | Hold | Inspected + Proved (e2e projector lists) |
| H. Unauthorized paths | Empty diffs | Inspected |

## 11. Privacy review

- No device identity / candidate / capture / test-mode / profile fields in
  `LocalInputSignal`, commands, events, gameplay state, replay, `PublicState`,
  sync, display runtime, or import schemas (**Inspected**).
- Projector e2e forbidden list restored/strengthened with `vendor`, `profile`,
  `mapping`, `capture` (**Proved**).
- Host may show Sony setup vocabulary; projector must not (**Proved**).

## 12. Poll lifecycle review

- Exactly one poll owner (`useGamepadBuzzInput`); setup section owns no scheduler
  (**Inspected** + **Proved**).
- **Defect found (major, FIXED):** gate re-prime previously relied only on a
  passive `useEffect`. A rAF poll between commit and effect could observe the new
  `latest` gate while the baseline was still the old one, allowing a just-pressed
  button after leaving test/capture mode to become a gameplay edge.
- **Fix:** synchronous baseline clear during the render that updates the gate,
  with the effect retained as defense in depth. ADR-010 clarified. Regression test
  added for a press staged before leaving test mode.

## 13. Capture and mapping review

Capture recipe remains observation-based; teams explicit; incomplete/conflicting
applies refused; staging does not mutate active mapping before Apply; Discard
leaves active mapping unchanged (**Proved** by `sonyBuzzProfile` tests).

## 14. Test-mode isolation review

Test mode resolves applied mapping and reports observations only; no
`translateLocalInput` / dispatch on that path (**Inspected** + **Proved**). Path
extracted into `reportTestModeEdges` for clarity and Sonar complexity.

## 15. Accessibility and host-UX review

- Status not color-only; colour prompts include text labels (**Inspected**).
- Action cluster now uses semantic `fieldset`/`legend` (**FIXED** / Sonar S6819).
- Keyboard fallback copy present; keyboard-operable e2e retained (**Proved**).

## 16. Fixes made

1. Synchronous gate re-prime in `useGamepadBuzzInput`
2. Poll helpers extracted (complexity + isolation clarity)
3. `SonyBuzzSetupSection` fieldset + `describeTestOutcome`
4. `browserGamepadSource` fails closed if snapshot conversion throws
5. E2E rAF settle helper; projector privacy list strengthened
6. ADR-010 sync re-prime clarification
7. This receipt; PR description CI checklist update

## 17. Tests added or changed

- `useGamepadBuzzInput.test.tsx` — staged press when leaving test mode
- `gamepadSource.test.ts` — hostile Proxy pad → `unreadable`
- `gamepad-input.spec.ts` — rAF sync + projector forbidden words

## 18. Focused verification

```text
npm run test:run -- src/host/useGamepadBuzzInput.test.tsx \
  src/input/gamepadSource.test.ts \
  src/host/SonyBuzzSetupSection.test.tsx \
  src/input/gamepadDeviceProfile.test.ts \
  src/input/sonyBuzzProfile.test.ts
→ 5 files, 118 passed
```

## 19. Full verification (exact totals)

Observed after review fixes, before/with this receipt:

| Command | Result |
| --- | --- |
| `git diff --check` | pass |
| `npm run lint` | pass |
| `npm run typecheck` | pass |
| `npm run test:run` | **1415** passed / **60** files (0 failed, 0 skipped) |
| `npm run build` | pass |
| `npm run test:e2e` | **202** passed / **2** skipped |
| `npm run verify:all` | pass |

After writing this receipt, minimum re-run: `git diff --check` + `npm run verify:all`
(recorded in the review commit notes / CI).

## 20. CI status

On starting head `c9f609a`: Lint/typecheck/unit/build pass; Playwright e2e pass;
SonarCloud QG pass (with 5 open issues now dispositioned by this lane).

Final-head CI: observe after push of the review commit (do not merge).

## 21. Remaining physical-validation gate

Owner must validate real Sony Buzz! hardware on macOS/Chrome before Slice 10 may
be marked `Complete`. This lane did **not** touch physical controllers.

## 22. Explicit non-claims

- No physical compatibility (wired or wireless)
- No browser button indices claimed as physical defaults
- No claim that all 20 controls are visible
- No claim of a specific Gamepad topology
- No Slice 10 Complete
- No merge authorization exercised
- No Slice 11 start

## 23. Deferred items (advisories, non-blocking)

| Item | Disposition |
| --- | --- |
| Ambiguous id containing both `0002` and `1000` prefers wired candidate | **VALID-NO-CHANGE** — still a candidate, never “supported”; physical validation may refine |
| `clock.now()` still stamps before gate refusal on ignored edges | **VALID-NO-CHANGE** — existing Slice 9 contract/test; no state mutation |
| Sonar “0.0% coverage on new code” metric | Reporting artifact; not addressed by empty tests |
| Broader host panels still using `role="group"` | **OUT-OF-SCOPE** — pre-existing outside Slice 10 surface |

## 24. Final stop point

PR #21 remains **open and unmerged**. Ready for **owner physical Sony Buzz!
validation**. Not ready to mark Complete. Slice 11 must not start from this lane.
