# Receipt — Slice 12 PR review and hardening

- **Date:** 2026-07-28
- **Branch:** `claude/slice-12-portable-export`
- **PR:** https://github.com/ricktron/classroom-quiz-show/pull/25
- **Authorized base:** `7c1a35c096d1d0654ea951f29aa49d0910f4c429`
- **Starting head (review):** `86cce889e0b93bdec82573f0ad3f0d138663fc91`
- **Final head (after hardening):** `7b5dc47fd98cedb347bc2b1ba6e277d706ed3976`
- **Slice 12 state:** **In review** (unmerged)
- **Slice 13 state:** **Planned**, unstarted

## 1. Verdict

**PASS — READY FOR OWNER MERGE** after review hardening on this branch.

## 2. Repository and PR

- Repo: `ricktron/classroom-quiz-show`
- Remote: `origin` → `https://github.com/ricktron/classroom-quiz-show.git`
- PR #25 — “Slice 12: portable export and round-trip import”
- Open, not draft, base `main`, mergeable `MERGEABLE` / `CLEAN` at review start
- Only open PR; no competing Slice 12 writer; Slice 13 unstarted

## 3. Starting head

`86cce889e0b93bdec82573f0ad3f0d138663fc91`

Preflight confirmed clean working tree, matching remote tracking branch, CI green
(lint/typecheck/unit/build, Playwright e2e, SonarCloud Quality Gate) on that head.

## 4. Final head

PR tip of `claude/slice-12-portable-export` after review hardening and the Sonar
S7778 follow-up (avoid multiple `Array#push` in
`serializeCanonicalDocument`). Exact OID is recorded in the PR body.

## 5. Authorized base

`7c1a35c096d1d0654ea951f29aa49d0910f4c429` — Slice 11 post-merge reconciliation
on `main`. No rebase performed.

## 6. Full changed-file review

Reviewed every PR file and the reused import/game boundaries listed in the
mission. Material defects found and fixed during review (see §§8–16 and
§23). Non-material documentation/evidence drift (stale PR-body head and unit
count) corrected without rewriting historically accurate local-verification
narrative beyond factual tip mismatches noted in §20.

## 7. Canonical document findings

Root emission order is
`format` → `schemaVersion` → `id` → `title` → optional `teams` → `timer` →
`rounds`. Empty teams omit the field. Non-empty teams emit
`{ id, name, accent }` only. Timer always explicit. Round envelopes
`{ id, type, title, config }`. No `modelVersion`, no runtime metadata. Source
definition is not mutated. Empty-round games export successfully.

## 8. Config canonicalization findings

Acceptance/rejection matrix holds for scalars, arrays, plain/null-proto objects,
and fail-closed exotic values / cycles / non-finite numbers / undefined.

**Hardening added:**

- Own symbol keys rejected without reading values
- Accessor properties rejected via `getOwnPropertyDescriptor` without invoking
  getters

## 9. Numeric-like key-order finding

**Defect (material):** `JSON.stringify` reorders integer-index keys
(`"0"`, `"1"`, `"2"`, `"10"`, …) into ascending numeric order, disagreeing with
the UTF-16 lexicographic config-key contract even when `canonicalizeData`
inserts keys in UTF-16 order.

**Resolution:** Introduced `serializeCanonicalDocument` /
`serializeCanonicalData`. Envelope fields keep explicit order; generic config
object keys are emitted in UTF-16 order in the raw bytes. Direct regression
covers the key set
`0`, `01`, `1`, `10`, `1a`, `2`, `a`, `ä`, `\ud83d\ude00`.

ADR-012 §8–§9 updated to match actual serialization.

## 10. Serialization findings

Compact JSON, one trailing LF, no CR/BOM/timestamps/randomness. Scalar escaping
and number formatting reuse `JSON.stringify` rules. Output-length enforcement
still uses `MAX_IMPORT_TEXT_LENGTH` before any Blob. Lone-surrogate and astral
Unicode covered in focused serializer tests.

## 11. Re-import and recursion findings

Success gate remains:
definition → document → exact text → `importGameFromJsonText` → structural
equality → `exportWithoutRoundTrip` → byte identity.

Second export uses the private non-gated helper (no recursive full gate).

**Hardening:** regression asserting exactly one `importGameFromJsonText` call
per successful export.

## 12. Equality findings

Structural equality covers modelVersion, id, title, teams (order +
id/name/accent), timer seconds, rounds (order + id/type/title/config), nested
arrays order-sensitive, nested objects key-set–sorted for comparison, `-0`/`0`
equivalent via `===`. Insertion order / prototype / freeze do not affect
equality.

## 13. Registry findings

Unsupported round types and invalid registered configs fail via re-import
(`round-trip-import-failed`). Unexportable generic data fails before import
(`unexportable-data`). No silent drop or invented replacement config.

## 14. Media-reference findings

Image prompt fields survive (`kind`, `source.kind`, `source.path`, `alt`,
`caption`, `attribution`). Paths not rewritten/absolutized/embedded. No fetch
during export. Missing media does not block document export. Host media warning
keyed off nested `kind: 'image'` + object `source`. Docs/UI state path-only
limitation.

## 15. Download cleanup findings

**Defect (material):** `createAnchor` ran outside the try/finally after
`createObjectURL`, so an anchor-creation throw leaked the object URL.

**Resolution:** URL/anchor creation moved inside try; finally always schedules
revocation when a URL exists; scheduleCleanup failure falls back to synchronous
revoke; removeAnchor/revoke failures are contained.

Focused tests cover Blob, createObjectURL, createAnchor, append, click, remove,
scheduleCleanup, and revoke failure boundaries.

## 16. Host UI findings

Host-only panel; disabled with no game; no dispatch; answer warning always;
media warning conditional; failures do not claim “Export ready.”

**Hardening:** prior status resets when `definition` changes; rapid repeated
clicks each export the synchronously captured definition.

## 17. Privacy/state-isolation findings

Export does not alter revision, history, session identity, or public/sync
surfaces in unit/host tests. Playwright proves revision/history unchanged across
export, export diagnostics absent from `/display`, and host-only notes/answers
absent from display body.

## 18. Playwright findings

Real host UI download, exact filename, trailing LF, re-import via textarea,
byte-identical second export, no-game disabled state, multi-project coverage.

**Hardening:** after re-import, advance to the board and assert teacher notes and
alternates through `cbh-notes` / `cbh-alternates` (observable host boundary).

## 19. Documentation findings

ADR-012 updated for deterministic serializer and accessor/symbol rejection.
STATUS / CURRENT / MVP-ARC already mark Slice 12 In review and Slice 13 Planned.
GAME-ENGINE-BOUNDARIES and decisions index already link ADR-012. Local
verification receipt left as historical implementation evidence (unit total
1541 there remains accurate for that tip’s suite); this review receipt records
post-hardening totals.

## 20. PR-body corrections

Stale body named final head `de59d678…` and **1540** unit tests. Corrected to
the actual reviewed/hardened final head and command-authoritative totals
(**1558** unit / **68** files; **220** e2e passed / **2** skipped).

## 21. Sonar disposition

On starting head `86cce88`: Quality Gate **passed**, **0** new issues, **0**
security hotspots, reported new-code coverage **0.0%**.

On the first hardened tip, Sonar reported **1** new minor maintainability issue
(`typescript:S7778` — multiple `Array#push` in `serializeCanonicalJson.ts`).
Fixed by constructing the parts array in one expression. Quality Gate remained
passed throughout; re-check on the final tip should return **0** new issues.

Treat Sonar’s 0.0% new-code coverage as an **advisory measurement gap**, not as
evidence of missing tests. Repository unit + Playwright suites are green and are
the authoritative execution evidence.

## 22. Review/thread disposition

No unresolved review threads or pull-request review comments at start (0 review
comments; Bugbot free-tier note only; Sonar Quality Gate comment only).

## 23. Files changed during review

- `src/export/serializeCanonicalJson.ts` (**new**)
- `src/export/serializeCanonicalJson.test.ts` (**new**)
- `src/export/canonicalizeData.ts` / `.test.ts`
- `src/export/exportGame.ts` / `.test.ts`
- `src/export/downloadGameFile.ts` / `.test.ts`
- `src/host/GameExportPanel.tsx` / `.test.tsx`
- `tests/e2e/portable-export.spec.ts`
- `docs/architecture/ADR-012-portable-export-round-trip.md`
- `docs/receipts/2026-07-28-slice-12-pr-review-and-hardening.md` (**new**)
- PR body (via `gh pr edit`)

## 24. Focused verification

`npm run test:run -- src/export src/host/GameExportPanel.test.tsx` → **73**
passed / **5** files.

## 25. Full verification

| Check | Result |
| --- | --- |
| `git diff --check` | clean |
| `npm run lint` | clean |
| `npm run typecheck` | clean |
| `npm run test:run` | **1558** passed / **68** files |
| `npm run build` | clean |
| `npm run test:e2e` | **220** passed / **2** skipped (clean rerun after one unrelated `timers-arming` mobile-host click-timeout flake during a prior `verify:all` under load) |
| `npm run verify:all` | lint + typecheck + unit + build green; e2e green on clean rerun (**220** / **2**) |

## 26. Final CI result

Recorded after push: required GitHub Actions jobs and SonarCloud on the exact
final head (see PR checks).

## 27. Explicit non-goals

No persistence, file-picker import, authoring, spreadsheet formats, media
bundling, schema v2, public/sync/command changes, dependencies, Slice 13, or
merge.

## 28. Slice 12 state

**In review** — not Complete; PR left open for owner merge.

## 29. Slice 13 state

**Planned**, unstarted.

## 30. Stop point

PR #25 remains open, green, and mergeable on the exact reviewed head. Slice 12
remains In review. Slice 13 remains Planned and unstarted. The PR has not been
merged.
