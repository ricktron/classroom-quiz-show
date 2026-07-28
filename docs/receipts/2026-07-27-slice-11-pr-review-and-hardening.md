# Slice 11 — PR #23 review and hardening

- **Date:** 2026-07-27 (local execution)
- **Identifier:** `CQS-SLICE-11-MEDIA-CONTRACT-PR-REVIEW`
- **PR:** [#23](https://github.com/ricktron/classroom-quiz-show/pull/23) — open and unmerged
- **Repository:** `ricktron/classroom-quiz-show`
- **Base SHA:** `ce1dc61d8a10cea16c91331fa04da8b04dfdeecd` (= `origin/main`, Slice 10 reconciliation)
- **Starting PR head (authorization):** `0607ece75d7949013d0558f8ad56e984761cae52`
- **Final reviewed head:** tip of `claude/slice-11-media-contract` after the review commit that includes this receipt
- **Environment:** local macOS (Darwin 25.5.0, arm64)
- **Lane:** PR review + security/privacy hardening only — **not** merge, **not** Slice 11 Complete, **not** Slice 12

## 1. Verdict

**PASS — READY FOR OWNER MERGE** — contract holds; path-security, public-wire,
image-lifecycle, and privacy gaps found in review were fixed; Sonar findings
dispositioned; local verification green; PR remains open and unmerged. Slice 11
remains **In review**. Slice 12 remains **Planned** and unstarted.

## 2–5. Identity, base, heads

| Item | Value |
| --- | --- |
| Repo root | `/Users/macdaddy/Documents/Coding/Cursor Projects/classroom-quiz-show` |
| Remote | `origin` → `https://github.com/ricktron/classroom-quiz-show.git` |
| Branch | `claude/slice-11-media-contract` |
| Base | `ce1dc61d8a10cea16c91331fa04da8b04dfdeecd` (= `origin/main`) |
| Starting head | `0607ece75d7949013d0558f8ad56e984761cae52` (matched authorization) |
| Final head | tip after review commit (same branch; see git log / PR head) |
| Working tree before edits | clean |
| Stashes / competing writers | none; only open PR is #23 |
| Slice 12 | Planned, unstarted |

## 6. Full diff review

Reviewed every path in `gh pr diff 23 --name-only` (38 paths at starting head),
including docs, media module, category-board schema/definition, host/display
surfaces, sanitizer, public wire, import issues, fixtures, and e2e.

Implementation commits on the branch before review:

1. `258cb0a` — Slice 11 typed prompt media contract
2. `f98a993` — docs: record PR #23 / verification SHA
3. `0607ece` — docs: link next action to PR #23

## 7. Contract conformance

All twelve fixed decisions from the review mission hold after hardening:

| # | Decision | Result |
| --- | --- | --- |
| 1 | Legacy string prompts remain valid (= text) | Hold |
| 2 | Static image is the only new media kind | Hold |
| 3 | Media applies only to prompts | Hold |
| 4 | Answers / alternates / notes remain strings | Hold |
| 5 | Only `same-origin-path` sources | Hold (hardened) |
| 6 | Game-file `schemaVersion` remains 1 | Hold |
| 7 | `PUBLIC_STATE_SCHEMA_VERSION` is 7 | Hold |
| 8 | `SYNC_SCHEMA_VERSION` remains 2 | Hold |
| 9 | Caption / attribution visible on host + projector | Hold |
| 10 | Load failure → “Image unavailable” + authored alt | Hold |
| 11 | No remote / audio / video / export / persistence / authoring / timer coupling | Hold |
| 12 | No new npm dependency | Hold |

## 8. Import / schema findings

| Finding | Disposition |
| --- | --- |
| Bare strings accepted; image objects strict; unknown keys → `unknown-field` | Hold (proved) |
| Unsupported kinds → `unsupported-media-kind`; bad sources/paths → `invalid-media-source` | Hold (proved) |
| Media codes survive Zod mapping via `params.importCode` (no union collapse) | Hold (inspected) |
| Failed import does not mutate a prior successful definition snapshot | Strengthened test |

## 9. Source-path security findings

| Finding | Disposition |
| --- | --- |
| Traversal, schemes, query/hash, backslash, whitespace, leading `/` rejected | Hold |
| Percent-encoded traversal/separators rejected (`%` outside alphabet) | **Documented + tested** |
| Empty segments (`//`) and trailing `/` previously accepted | **FIXED** — rejected |
| Validator/resolver drift (duplicated regex in public guard) | **FIXED** — shared `isValidSameOriginPath` in Zod-free `limits.ts` |
| Resolver with `/` and `/classroom-quiz-show/` bases | **Proved** via `joinBaseAndMediaPath` |
| Malformed trusted path must not emit a URL | **FIXED** — resolver returns `null` |

**Percent-encoding policy (recorded in ADR-011):** `%` is refused at validation;
the resolver concatenates without decoding so browser URL resolution cannot
reinterpret a path the validator accepted.

## 10. Trusted-domain findings

String → `{ kind: 'text', text }`; image fields copied; optionals → explicit
`null`; no input mutation; deep-freeze at board construction; impossible media
fails closed at sanitize/read. `normalizeAuthoredPrompt` complexity extracted
for clarity (Sonar).

## 11. Public-wire and sync findings

| Finding | Disposition |
| --- | --- |
| Wire version exactly 7; sync envelope stays 2 | Hold |
| Version 6 rejected, not reinterpreted | **Test added** |
| Unknown nested public-media keys previously accepted | **FIXED** — exact-key guard |
| Malformed v7 media rejects the whole snapshot | Hold / strengthened |
| Receiver keeps last safe snapshot on reject | Hold (existing sync contract) |

## 12. Reveal / privacy findings

Stage matrix holds (board/selected absent; prompt present/answer null; answer
retains prompt). Serialized public snapshots inspected in unit tests — no media
URL before prompt reveal. E2E asserts no `media-fixtures` / private strings in
projector DOM before reveal. No CSS-only privacy. Alternates/notes/diagnostics/
authored ids/host preview stay private.

## 13. Image lifecycle findings

| Finding | Disposition |
| --- | --- |
| Failure state not reset when `source.path` changes | **FIXED** — path-keyed remount + path-scoped failure |
| Stale `onError` could poison a newer source | **FIXED** — src match guard + remount |
| Fallback uses authored alt; no path/diagnostics leak | Hold (proved) |
| Caption/attribution remain in failure UI (ADR) | Hold |

## 14. Accessibility findings

Meaningful alt required; `<img alt>` uses authored text; failure announced in
text; figure/figcaption for caption; host preview uses `<div>` body so `<img>`
is not nested in `<p>` (**proved** by new host test). Focus/reveal controls
unchanged.

## 15. Styling / responsive / file-boundary findings

`MediaContentDisplay.css` bounds image size (`max-height: min(55vh, 28rem)`),
wraps long caption/attribution. Host CSS changes in
`src/host/CategoryBoardHostPanel.css` are **necessary and in scope**: they bound
the private image preview and spacing for alt/caption/attribution. Without them
the host preview can overflow. Documented as a file-boundary exception (same
class as `resolveSameOriginMediaSrc.ts`).

## 16. Offline / deployment claim

Narrow claim only: assets present in the deployed build and matched by the
existing Workbox glob may be precached. Observed on this review build:

- `dist/media-fixtures/slice-11-clue.png` present
- Workbox precache includes `media-fixtures/slice-11-clue.png`
- Precache count **17** entries (was 16 before the fixture)

README offline wording updated to state the narrow claim. No remote MIME or
dimension validation claimed.

## 17. Sonar disposition

Observed via SonarCloud API on PR #23 at starting head:

| Metric | Value |
| --- | --- |
| Quality Gate (`alert_status`) | **OK** |
| New bugs / vulnerabilities / security hotspots | **0** |
| New code smells | **4** |
| New duplicated lines density | **0.0%** |
| Coverage metric | not treated as a gate (existing media tests are substantial) |

| # | Rule | Location | Disposition | Rationale |
| --- | --- | --- | --- | --- |
| 1 | `typescript:S3735` (`void` operator) | `MediaContentDisplay.tsx` | **FIXED** | Replaced exhaustive `switch`+`void` with if-chain fail-closed return |
| 2 | `typescript:S3776` cognitive complexity | `definition.ts` `normalizeAuthoredPrompt` | **FIXED** | Extracted `normalizeImagePrompt` |
| 3 | `typescript:S7780` prefer `String.raw` | `schema.ts` message | **FIXED** | Rewrote message to say “backslash” (no escaped `\\`) |
| 4 | `typescript:S3776` cognitive complexity | `publicState.ts` `isPublicPromptContent` | **FIXED** | Extracted exact-key helpers + shared path validator |
| 5 | `typescript:S6653` prefer `Object.hasOwn` | `publicState.ts` `hasExactOwnKeys` | **FIXED** | Introduced by the exact-key helper on the first review tip; switched to `Object.hasOwn` |

Stale issue-comment “The last analysis has failed” from an earlier PR push is
superseded by later successful SonarCloud check conclusions. Final-head Quality
Gate and issue count are re-observed after the tip that includes this fix.

GitHub review submissions / inline threads: **none** (empty). Bugbot: not
enabled (upsell comment only).

## 18. GitHub review / thread disposition

| Item | Disposition |
| --- | --- |
| Human review submissions | none |
| Inline review threads | none |
| Bugbot | not enabled — no findings |
| Sonar bot stale “analysis failed” comment | superseded by later green check; not a blocker |

## 19. Scope exceptions (justified)

1. `src/display/resolveSameOriginMediaSrc.ts` — shared BASE_URL join without
   react-refresh export violation (already noted in implementation receipt).
2. `src/host/CategoryBoardHostPanel.css` — required to bound host image preview
   and caption/attribution spacing for the typed prompt preview.

## 20. Files changed in review

- `src/game/media/limits.ts` — shared path validator + empty-segment / trailing-slash reject + percent-encoding policy docs
- `src/game/media/schema.ts` — use shared validator; clearer invalid-path message
- `src/game/media/definition.ts` — extract image normalize helper
- `src/game/media/index.ts` — export path helper from limits
- `src/game/media/media.test.ts` — adversarial path cases
- `src/state/publicState.ts` — exact-key public prompt guard; shared path validator
- `src/state/categoryBoardSanitize.test.ts` — v6 reject; unknown nested keys
- `src/display/resolveSameOriginMediaSrc.ts` — pure join helper; null on illegal path
- `src/display/MediaContentDisplay.tsx` — path-scoped failure + remount + src guard
- `src/display/MediaContentDisplay.test.tsx` — lifecycle, base path, long text
- `src/host/CategoryBoardHostPanel.tsx` — null-safe host preview
- `src/host/CategoryBoardHostPanel.test.tsx` — semantic HTML for image preview
- `src/import/mediaImport.test.ts` — percent-encoding / empty segment / isolation
- `docs/architecture/ADR-011-media-contract.md` — path / percent-encoding policy
- `README.md` — narrow offline media claim
- `docs/receipts/2026-07-27-slice-11-pr-review-and-hardening.md` — this receipt

## 21. Focused verification

```bash
npm run test:run -- \
  src/game/media/media.test.ts \
  src/display/MediaContentDisplay.test.tsx \
  src/state/categoryBoardSanitize.test.ts \
  src/import/mediaImport.test.ts \
  src/host/CategoryBoardHostPanel.test.tsx
```

All focused media/host tests passed (including new cases).

## 22. Full verification

| Command | Result |
| --- | --- |
| `git diff --check` | clean |
| `npm run lint` | clean |
| `npm run typecheck` | clean |
| `npm run test:run` | **1485** passed / **63** files |
| `npm run build` | clean; PWA precache **17** entries; fixture PNG in `dist/` + sw precache |
| `npm run test:e2e` | **214** passed / **2** skipped (pre-existing desktop-only offline-shell skips) |
| `npm run verify:all` | **pass** — lint, typecheck, **1485** unit, build, **214** e2e / **2** skipped |

Note: one unrelated `ResponseTimerHostPanel` accessibility test timed out once
under full-suite parallelism (5000ms); re-run of that file alone and a second
full `test:run` both passed **1485/1485**. Not caused by Slice 11 media changes.

## 23. CI result (starting head)

On `0607ece`:

| Check | Conclusion |
| --- | --- |
| Lint, typecheck, unit tests, build | **pass** |
| Playwright e2e | **pass** |
| SonarCloud Code Analysis | **pass** (QG OK; 0 new vulns/hotspots; 4 smells — now fixed) |

Final-head CI must be re-observed after push.

## 24. Explicit non-goals

No merge; no Slice 11 Complete; no Slice 12; no new media kinds; no answer media;
no remote HTTPS media; no asset packs; no export/persistence/authoring; no npm
dependency changes; no command/event/reducer/scoring/buzz/gamepad/timer changes.

## 25. Stop point

PR #23 remains open, green (pending final-head CI observation), and mergeable on
the exact reviewed head. Slice 11 remains In review. Slice 12 remains Planned and
unstarted. The PR has not been merged.
