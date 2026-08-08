# Receipt — Slice 19 portable packs (implementation)

- **Date:** 2026-08-07
- **Branch:** `feat/slice-19-portable-packs`
- **Authorized base:** `a1726e59ac437b84e785f8cfe53740e229de244c` (`origin/main`)
- **Implementation HEAD (feature commit):** `f3bed18b8e6cc8167f6323b95bd22306ba8a0a49`
- **PR:** [#50](https://github.com/ricktron/classroom-quiz-show/pull/50) — `feat(slice-19): add self-contained portable packs`
- **Draft / auto-merge:** no / off
- **Observed PR head at receipt update:** 
- **Slice state after this work:** `In review` (unmerged)
- **STOP BEFORE MERGE**

## 1. Authorization lineage

| ID | Role |
| --- | --- |
| `AUTHORIZE-CQS-SLICE-19-PORTABLE-PACKS-IMPLEMENTATION-1` | Primary Slice 19 implementation |
| `AUTHORIZE-CQS-SLICE-19-PACK-ARCHITECTURE-DISPOSITION-1` | Nested architecture disposition |
| `CQS-SLICE-19-PORTABLE-PACKS-IMPLEMENTATION-ES-1` | Evidence state |

## 2. Verdict

**PASS — IMPLEMENTATION COMPLETE AND READY FOR INDEPENDENT REVIEW**
(`STOP BEFORE MERGE`).

## 3. Repository and branch

- Repo: `ricktron/classroom-quiz-show`
- Worktree: isolated `classroom-quiz-show-slice19`
- Branch: `feat/slice-19-portable-packs`
- Base verified: `a1726e59ac437b84e785f8cfe53740e229de244c`

## 4. Dependency decision

- **Archive library:** `fflate@0.8.3` (exact pin)
- No second archive or MIME dependency added
- Export: bounded `zipSync` on validated bytes
- Import: streaming `Unzip` entry-by-entry

## 5. Storage decision

- **IndexedDB:** version **2 → 3** (additive)
- New store: `packMediaAssets`
- Coordination key: `active-pack-resource-scope`
- Durable rows: `resourceScopeKey`, `gameId`, `gameSha256`, `sourcePath`,
  `byteLength`, `sha256`, sniffed `mediaType`, raw `bytes`
- Migration: additive; prior stores preserved

## 6. Media safety decision

Pack v1 raster-only via magic-byte sniff:

- Accepted: PNG, JPEG, WebP, GIF87a/GIF89a
- Rejected in packs: SVG, HTML, XML/active markup, unknown signatures, empty bytes
- Hosted plain-JSON SVG behavior unchanged (ADR-011)
- Optional browser decode validation via injectable adapter; ephemeral Blob URLs
  revoked immediately

## 7. Pack contract

| Field | Value |
| --- | --- |
| Format | `classroom-quiz-show/pack` |
| Version | `1` |
| Extension | `.cqs-pack` |
| MIME | `application/vnd.classroom-quiz-show.pack+zip` |
| Manifest | `cqs-pack.json` |
| Game entry | `game.classroom-quiz-show.json` |
| Media entries | `media/<canonical-same-origin-path>` |

## 8. Resource limits

| Limit | Value |
| --- | --- |
| `MAX_PACK_INPUT_BYTES` | 32 MiB |
| `MAX_PACK_ENTRY_COUNT` | 130 |
| `MAX_PACK_MEDIA_COUNT` | 128 |
| `MAX_PACK_MANIFEST_BYTES` | 128 KiB |
| `MAX_PACK_GAME_BYTES` | 2 MiB |
| `MAX_PACK_MEDIA_BYTES` | 4 MiB / asset |
| `MAX_PACK_TOTAL_MEDIA_BYTES` | 24 MiB |
| `MAX_PACK_TOTAL_EXTRACTED_BYTES` | 28 MiB |

## 9. Resource scope

```text
resourceScopeKey = SHA-256(exact canonical game JSON UTF-8 bytes)
```

Host-private; not game id; not in canonical JSON or public wire.

## 10. Display hydration

Display tabs hydrate pack media via:

1. Coordination store active scope pointer (`active-pack-resource-scope`)
2. `BroadcastChannel` `classroom-quiz-show:pack-media-scope:v1` (scope key only)
3. IndexedDB `packMediaAssets` load into shared in-memory registry
4. `resolveSameOriginMediaSrc` prefers registry blob URLs for active scope

No pack metadata enters `PublicState` or sync envelope.

## 11. Canonical boundary proof (design intent)

- Export: `exportGameDefinition` (Slice 12)
- Import: `importGameFromJsonText` (Slice 4)
- Plain JSON import/export retained
- Canonical game schema **1** unchanged
- `GameDefinition` **1** unchanged
- Public wire **8** unchanged
- Sync envelope **2** unchanged
- Private active-session wire **1** unchanged
- Commands/events/reducer/replay unchanged

## 12. Changed-path inventory (observed at receipt write)

### Production

- `src/pack/**` (new module family)
- `src/host/GamePackExportPanel.tsx` (+ css, tests)
- `src/host/GamePackImportPanel.tsx` (+ css, tests)
- `src/host/FoundationControls.tsx`
- `src/host/GameExportPanel.tsx`
- `src/host/useHostPersistence.ts`
- `src/display/MediaContentDisplay.tsx`
- `src/display/resolveSameOriginMediaSrc.ts`
- `src/persistence/constants.ts`
- `src/persistence/indexedDbAdapter.ts`
- `src/persistence/memoryAdapter.ts`
- `src/persistence/adapter.ts`
- `package.json`, `package-lock.json` (`fflate@0.8.3` only)

### Tests

- `src/pack/*.test.ts`
- `src/host/GamePackExportPanel.test.tsx`
- `src/host/GamePackImportPanel.test.tsx`
- `src/display/MediaContentDisplay.test.tsx`
- `src/persistence/indexedDbAdapter.test.ts`
- `tests/e2e/portable-packs.spec.ts` (new)

### Documentation

- `docs/architecture/ADR-017-self-contained-portable-packs.md`
- `docs/receipts/2026-08-07-slice-19-portable-packs-implementation.md`

### Not edited (per contract)

- `docs/STATUS.md`, `docs/handoff/CURRENT.md`, `docs/plans/MVP-ARC.md`, `README.md`

## 13. Tests performed at receipt write

Focused unit commands requested by orchestrator (results recorded below after
run). Full `npm run verify:all` including Playwright suite not claimed at
receipt write unless explicitly recorded in §14.

## 14. Local verification results

```bash
git diff --check
# clean

npm run verify
# lint: 0 errors (3 pre-existing ThemeProvider warnings)
# typecheck: exit 0
# unit: 2181 passed | 1 skipped (2182) — exit 0

npm run verify:all
# unit: 2181 passed | 1 skipped
# build: success
# e2e: 327 passed | 14 skipped | 1 failed (inherited Final flake only)
# portable-packs.spec.ts: 5/5 passed on desktop-1080p, projector-720p, mobile-host
```

## 15. E2E proof (`tests/e2e/portable-packs.spec.ts`)

All five cases passed on all three Playwright projects:

1. Clean-environment media pack with hosted `media-fixtures/slice-11-clue.png` aborted
2. Zero-media pack export/import
3. Save/Load durability with hosted media blocked
4. Refresh recovery Resume with hosted media blocked
5. Export-after-import without hosted media fetch

Hosted fixture path deliberately aborted on host and display; display image asserted via `blob:` src.

## 16. Inherited flake disclosure

Observed on `verify:all` (not repaired):

```text
[mobile-host] tests/e2e/final-wager.spec.ts:281
a refresh mid-Final resumes every committed wager
Expected: Saved: 100
Received: Not saved yet
```

Same signature passed on `desktop-1080p` and `projector-720p` in the same run.
No Slice 19 repair attempted.

## 17. Explicit non-claims

- No merge SHA
- No squash SHA
- No merge timestamp
- No post-merge reconciliation
- CI conclusions not claimed green while in progress

## 18. Branch/worktree disposition

Retain `feat/slice-19-portable-packs` and isolated worktree until independent
orchestrator review and separate merge authorization.

## 19. PR tip after identity receipt commit

- **Exact branch tip:** 
- Does not claim merge.
