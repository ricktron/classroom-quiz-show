# Slice 11 — Media contract: post-merge reconciliation

## 1. Verdict

**PASS — RECONCILIATION PR OPEN** (documentation-only).

Slice 11 is recorded **`Complete`**. PR #23 was squash-merged; exact 40-path
file-list and blob equality confirmed that the reviewed content is what landed;
post-merge verification succeeded on clean `main`. **Slice 12 — Portable export
& round-trip import** remains **`Planned`, unstarted**. This reconciliation
authorizes only a separate Slice 12 planning/orchestration lane.

## 2. Repository identity

| Fact | Value |
| --- | --- |
| Repository | `ricktron/classroom-quiz-show` |
| Local root | `/Users/macdaddy/Documents/Coding/Cursor Projects/classroom-quiz-show` |
| Remote | `https://github.com/ricktron/classroom-quiz-show.git` |
| Reconciliation branch | `docs/slice-11-post-merge-reconciliation` |
| Environment | macOS 26.5.0 (Darwin), Node v26.0.0, npm 11.12.1 |
| Authorization | owner-authorized **documentation-only** post-merge reconciliation |

## 3. PR number and title

- **PR:** [#23](https://github.com/ricktron/classroom-quiz-show/pull/23)
- **Title:** `Slice 11: typed prompt media contract (text + same-origin image)`
- **State:** **MERGED**
- **URL:** https://github.com/ricktron/classroom-quiz-show/pull/23

## 4. Original base

`ce1dc61d8a10cea16c91331fa04da8b04dfdeecd`

(Slice 10 post-merge reconciliation tip; also the squash commit's sole parent)

## 5. Final reviewed head

`bb8bd94b016a99f9782793f3eda6b6fd2d59a0b5`

Observed via `gh pr view 23 --json headRefOid` after merge (GitHub retains the
merged PR's head OID).

## 6. Squash commit

`5d47b2f641e1a96c2066ec22731f4e751288b39a`

Subject: `Slice 11: typed prompt media contract (text + same-origin image) (#23)`

## 7. Squash parent

`ce1dc61d8a10cea16c91331fa04da8b04dfdeecd`

```
git rev-list --parents -n 1 5d47b2f
→ 5d47b2f ce1dc61d   (exactly one parent — squash merge)
```

The reviewed head is **not** a parent of the squash commit (expected for squash).

## 8. Merge timestamp

- GitHub API `mergedAt`: **2026-07-28T04:56:27Z**
- Commit author/commit date: `2026-07-27T23:56:27-05:00` (same instant)

## 9. Current `main` SHA

Post-merge verification and reconciliation base:

`5d47b2f641e1a96c2066ec22731f4e751288b39a`

(`git pull --ff-only origin main` after fetch; tip equals the squash commit —
no later unrelated commits on `main` at reconciliation time.)

## 10. Preflight result

| Check | Result |
| --- | --- |
| Correct repository root / remote | yes |
| Working tree clean before edits | yes |
| PR #23 merged | yes |
| Final head exactly `bb8bd94…` | yes |
| Squash commit exactly `5d47b2f…` | yes |
| Squash reachable from `origin/main` | yes (`merge-base --is-ancestor`) |
| Competing open PR owning recon paths | none (`gh pr list --state open` → `[]`) |
| Competing worktree / branch | none for `docs/slice-11-post-merge-reconciliation` |
| Prior Slice 11 Complete reconciliation | absent |
| Slice 12 implementation started | no |
| Canonical documentation superseded Slice 11 contract | no |

## 11. Squash structure

- Object type: `commit`
- Parents: **one** (`ce1dc61d…`) — squash, not a two-parent merge
- Second-parent / ancestry rules for true merges **do not apply**
- Content identity proven by exact file-list equality + per-path blob equality
  (below), with matching stable patch IDs as supporting evidence

## 12. Exact PR file count and list

**40** paths (`gh pr diff 23 --name-only | sort -u`):

```
README.md
docs/STATUS.md
docs/architecture/ADR-005-category-board-round.md
docs/architecture/ADR-011-media-contract.md
docs/architecture/GAME-ENGINE-BOUNDARIES.md
docs/decisions/README.md
docs/handoff/CURRENT.md
docs/plans/MVP-ARC.md
docs/receipts/2026-07-27-slice-11-local-verification.md
docs/receipts/2026-07-27-slice-11-pr-review-and-hardening.md
public/media-fixtures/README.md
public/media-fixtures/slice-11-clue.png
src/display/CategoryBoardDisplay.css
src/display/CategoryBoardDisplay.test.tsx
src/display/CategoryBoardDisplay.tsx
src/display/MediaContentDisplay.css
src/display/MediaContentDisplay.test.tsx
src/display/MediaContentDisplay.tsx
src/display/resolveSameOriginMediaSrc.ts
src/game/categoryBoard/categoryBoard.test.ts
src/game/categoryBoard/definition.ts
src/game/categoryBoard/schema.ts
src/game/media/definition.ts
src/game/media/index.ts
src/game/media/limits.ts
src/game/media/media.test.ts
src/game/media/schema.ts
src/host/CategoryBoardHostPanel.css
src/host/CategoryBoardHostPanel.test.tsx
src/host/CategoryBoardHostPanel.tsx
src/import/issues.ts
src/import/mediaImport.test.ts
src/state/buzzSanitize.test.ts
src/state/categoryBoardSanitize.test.ts
src/state/publicState.ts
src/state/responseSanitize.test.ts
src/state/sanitize.ts
src/state/teamScoreSanitize.test.ts
src/test/categoryBoardFixtures.ts
tests/e2e/media-contract.spec.ts
```

## 13. Exact merge file count and list

Identical **40** paths
(`git diff --name-only $MERGE_PARENT $MERGE_SHA | sort -u`).

`diff -u` of the two sorted lists: **empty** (exact match).

Stat: **40 files changed, 2884 insertions(+), 142 deletions(-)**.

## 14. Per-path blob-identity result

For every PR path:

`git rev-parse ${REVIEWED_HEAD}:${path}` **equals**
`git rev-parse ${MERGE_SHA}:${path}`.

**Result: ALL 40 BLOBS MATCH.** No missing path, no unexpected path, no content
drift between reviewed head and squash tip.

## 15. Patch-ID result

Stable patch IDs (identical):

```
586d908fb8c82d719897674fa47bd2818792b8f2   (parent..reviewed head)
586d908fb8c82d719897674fa47bd2818792b8f2   (parent..squash)
```

## 16. Merge-scope conclusion

The squash commit landed **exactly** the reviewed PR content for every changed
path. No unexplained file-list difference. No runtime scope beyond the PR was
introduced by the merge itself.

## 17. PR-head CI evidence

Observed via `gh pr checks 23` for reviewed head `bb8bd94…`:

| Check | Conclusion |
| --- | --- |
| Lint, typecheck, unit tests, build | **pass** |
| Playwright e2e | **pass** |
| SonarCloud Code Analysis | **pass** |

## 18. SonarCloud evidence

Final PR-head SonarCloud Code Analysis: **pass**
(https://sonarcloud.io/dashboard?id=ricktron_classroom-quiz-show&pullRequest=23).

Post-merge check-runs on squash tip `5d47b2f` also reported SonarCloud
**success**.

## 19. Post-merge local verification

Run on clean current `main` at `5d47b2f` **before** reconciliation edits:

| Command | Result | Notes |
| --- | --- | --- |
| `git diff --check` | clean | |
| `npm run lint` | **pass** | |
| `npm run typecheck` | **pass** | |
| `npm run test:run` | **pass** | **1485** tests / **63** files |
| `npm run build` | **pass** | fixture `dist/media-fixtures/slice-11-clue.png` present; Workbox precache includes that path |
| `npm run test:e2e` | **pass** | **214** passed / **2** skipped |
| `npm run verify:all` | **pass** | **1485** unit; e2e **214** passed / **2** skipped |

Intentional e2e skips (pre-existing):
`tests/e2e/pwa-offline.spec.ts` offline shell test runs once on desktop and
skips on `projector-720p` and `mobile-host`.

After documentation edits: `git diff --check` and `npm run verify:all` are
re-run on this branch (see verification section at end of session / PR checks).

## 20. Post-merge remote CI

Observed via GitHub API / `gh run list --branch main` / commit check-runs:

| Workflow | Run | Head | Conclusion |
| --- | --- | --- | --- |
| CI | [30330154643](https://github.com/ricktron/classroom-quiz-show/actions/runs/30330154643) | `5d47b2f` | **success** (lint/typecheck/unit/build + Playwright e2e; annotation: **214** passed / **2** skipped) |
| Deploy to GitHub Pages | [30330154633](https://github.com/ricktron/classroom-quiz-show/actions/runs/30330154633) | `5d47b2f` | **success** (Build + Deploy) |
| SonarCloud Code Analysis | check-run on `5d47b2f` | `5d47b2f` | **success** |

## 21. Pages / deployment result

- Deploy workflow **succeeded** (observed above).
- Document-root HTTP `HEAD` to
  `https://ricktron.github.io/classroom-quiz-show/` returned **200** with
  `Last-Modified: Tue, 28 Jul 2026 04:57:08 GMT` (consistent with the deploy
  window).
- Response body was **not** inspected. `/host` and `/display` were **not**
  exercised. Media behaviour was **not** tested on the live site. Offline media
  behaviour was **not** verified live.
- **No live-route or application-behaviour claim is made.**

## 22. Production asset / precache observation

From the local post-merge `npm run build` on `main` at `5d47b2f`:

- `dist/media-fixtures/slice-11-clue.png` is present (69-byte CI fixture).
- `vite.config.ts` Workbox `globPatterns` includes `png`.
- Generated `dist/sw.js` precache list includes
  `media-fixtures/slice-11-clue.png`.

**Narrow offline claim only:** media assets present in the deployed build and
matched by the existing Workbox asset glob may be precached. Arbitrary authored
paths and separately distributed assets are not packaged or guaranteed offline.

## 23. Canonical documentation changes

| File | Change |
| --- | --- |
| `README.md` | Slice 11 marked Complete with squash / blob / verification evidence; Slice 12 Planned |
| `docs/STATUS.md` | header, Complete paragraph, section heading, next safe action |
| `docs/handoff/CURRENT.md` | headline, Slice 11 entry, next action, prohibitions retargeted |
| `docs/plans/MVP-ARC.md` | table row 11, “what remains”, Slice 11 status record |
| `docs/architecture/ADR-011-media-contract.md` | status updated to Complete / landed |
| `docs/architecture/GAME-ENGINE-BOUNDARIES.md` | §9 Slice 11 status → Complete |
| `docs/receipts/2026-07-28-slice-11-post-merge-reconciliation.md` | **this file (new)** |

`docs/decisions/README.md` and `docs/receipts/README.md` were **not** changed
(no index convention required an entry).

## 24. Slice 11 completion basis

Slice 11 is **Complete** because:

1. PR #23 was squash-merged.
2. Reviewed content equals merged content for every changed path (40 paths).
3. Post-merge verification succeeded on clean current `main`.
4. Legacy string prompts remain supported and mean text.
5. Static image prompts use the typed `same-origin-path` contract.
6. Game-file `schemaVersion` remains **1**.
7. `PUBLIC_STATE_SCHEMA_VERSION` is **7**.
8. `SYNC_SCHEMA_VERSION` remains **2**.
9. The reveal-stage privacy boundary remains intact.
10. Unsupported media and unsafe sources fail closed.

## 25. Versioning summary

| Layer | Version | Change in Slice 11 |
| --- | --- | --- |
| Game-file `schemaVersion` | **1** | unchanged (additive prompt forms) |
| `PUBLIC_STATE_SCHEMA_VERSION` | **7** | bumped from 6 |
| `SYNC_SCHEMA_VERSION` | **2** | unchanged |

## 26. Privacy and fail-closed summary

- No hidden or unrevealed image URL enters projector state.
- Caption and attribution remain visible when authored.
- Image failure displays “Image unavailable” plus authored alt.
- Unsafe, remote, absolute, encoded, traversal, query, and fragment paths fail
  closed at import/validation.
- Unsupported media kinds fail closed with exact diagnostics; no active-state
  change on failed import.
- Malformed trusted/public media fails closed at sanitize/render.

## 27. Offline claim boundary

Media assets present in the deployed build and matched by the existing Workbox
asset glob may be precached. Arbitrary authored paths and separately distributed
assets are not packaged or guaranteed offline. Remote MIME type and dimensions
are not validated by the engine.

## 28. Deferred media scope

Still deferred / not implemented:

- remote media fetch
- audio
- video
- media on answers / alternates / notes
- timer/media coordination (`OG-9`)
- export / packaging of arbitrary authored assets
- persistence
- theme engine
- new media kinds beyond text + static image

## 29. Explicit non-goals

No export; no persistence; no authoring/spreadsheet import; no audio/video; no
timer/media coupling; no command/event/reducer/scoring/buzz/gamepad changes; no
sync-envelope bump; no new npm dependency; no remote MIME validation claim; no
implication that arbitrary same-origin authored paths are packaged or available
offline.

## 30. Slice 12 state

**Slice 12 — Portable export & round-trip import:** `Planned`, **unstarted**.

This reconciliation authorizes a **separate Slice 12 planning/orchestration
lane** only. **No Slice 12 implementation is authorized.**

## 31. Files changed in this reconciliation

Documentation only:

```
README.md
docs/STATUS.md
docs/handoff/CURRENT.md
docs/plans/MVP-ARC.md
docs/architecture/ADR-011-media-contract.md
docs/architecture/GAME-ENGINE-BOUNDARIES.md
docs/receipts/2026-07-28-slice-11-post-merge-reconciliation.md
```

Unchanged by design: `src/**`, `tests/**`, `public/**`, `.github/**`,
`scripts/**`, dependency and config files.

## 32. Final stop point

Slice 11 post-merge reconciliation is committed, pushed, and open as a
documentation-only PR. Slice 11 is recorded Complete. Slice 12 remains Planned
and unstarted. **The reconciliation PR has not been merged.**
