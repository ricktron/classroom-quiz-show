# ADR-017 — Self-contained portable packs

- **Status:** Proposed (Slice 19) — **In review**; not merged
- **Date:** 2026-08-07
- **Slice:** 19 — Self-Contained Portable Packs
- **Authorization:** `AUTHORIZE-CQS-SLICE-19-PORTABLE-PACKS-IMPLEMENTATION-1`,
  `AUTHORIZE-CQS-SLICE-19-PACK-ARCHITECTURE-DISPOSITION-1`
- **Depends on:** [ADR-004](ADR-004-canonical-validation-import.md),
  [ADR-011](ADR-011-media-contract.md),
  [ADR-012](ADR-012-portable-export-round-trip.md),
  [ADR-013](ADR-013-local-persistence-recovery.md),
  [`GAME-ENGINE-BOUNDARIES.md`](GAME-ENGINE-BOUNDARIES.md)
- **Supersedes:** nothing

## Context

Slices 4, 11, and 12 established canonical game import, a typed same-origin
media contract, and deterministic plain-JSON export. Teachers can move game
definitions between machines, but image prompts still reference hosted
same-origin paths — the bytes are not bundled.

Slice 19 adds a second host-owned artifact: a self-contained portable pack that
wraps the exact canonical game JSON plus embedded raster media. Plain JSON
import/export remains unchanged. The pack is transport and storage, not a new
authored game schema.

## Decision

### 1. Purpose

Bundle canonical `classroom-quiz-show/game` version-1 JSON and all referenced
supported local image bytes into one offline-capable `.cqs-pack` file. A teacher
can download, move, import, play, refresh/recover, Save/Load, and re-export
without the original hosted media path being available.

### 2. Pack discriminator

```text
PACK_FORMAT = classroom-quiz-show/pack
PACK_FORMAT_VERSION = 1
PACK_EXTENSION = .cqs-pack
PACK_MIME = application/vnd.classroom-quiz-show.pack+zip
```

User-facing identity is `.cqs-pack`, not generic `.zip`. A renamed arbitrary ZIP
must fail unless it satisfies the strict manifest and v1 structure.

### 3. ZIP container

Underlying container is ZIP with DEFLATE where useful. Archive bytes are not
claimed byte-identical across builds; logical determinism (entry set, ordering,
manifest, digests) is the contract.

### 4. Archive dependency — `fflate@0.8.3`

Exactly `fflate@0.8.3` is the sole archive dependency. No JSZip or second
archive library. Trusted export may use bounded synchronous `zipSync` on
already-validated application bytes. Untrusted import uses `fflate` streaming
`Unzip` entry-by-entry — never eager full-archive `unzipSync` as the sole import
path.

### 5. Exact v1 entry structure

Allowed entries only:

```text
cqs-pack.json
game.classroom-quiz-show.json
media/<canonical-same-origin-path>
```

Exactly one manifest, one canonical game JSON, zero to 128 media entries. No
extension area. Unknown entries fail closed.

### 6. Strict manifest

Zod `strictObject` manifest equivalent to:

```json
{
  "format": "classroom-quiz-show/pack",
  "packVersion": 1,
  "game": {
    "path": "game.classroom-quiz-show.json",
    "byteLength": 12345,
    "sha256": "<64 lowercase hex>"
  },
  "media": [
    {
      "sourcePath": "photos/clue-1.png",
      "packPath": "media/photos/clue-1.png",
      "byteLength": 45678,
      "sha256": "<64 lowercase hex>"
    }
  ]
}
```

Unknown properties rejected. No duplicated authored game fields (title, teams,
rounds, answers). No pack ID or timestamp. Media MIME is not stored in the
manifest; type is derived from validated bytes. Media rows sorted by
`sourcePath`.

### 7. Canonical game JSON authority

Pack construction uses the existing Slice 12 exporter (`exportGameDefinition`).
Pack import feeds extracted UTF-8 text through `importGameFromJsonText`. The
manifest never becomes trusted game truth.

### 8. Canonical importer reuse

After transport, container, manifest, integrity, and media validation, canonical
import failures surface nested `ImportIssue[]` under
`pack-canonical-import-failed`. No bypass for pack-contained JSON.

### 9. Deterministic media inventory

Media is derived from the captured trusted `GameDefinition`: static image prompts
with `same-origin-path` only. Same source path deduplicates; different paths with
identical bytes remain distinct. No scan of unrelated `/public` assets, theme
assets, or future audio.

### 10. Internal pack paths

For source `photos/clue-1.png`, pack entry is `media/photos/clue-1.png`.
Canonical JSON paths are never rewritten. No random names, absolute paths, Blob
URLs, or session IDs.

### 11. Logical determinism

Stable ordering: manifest → game JSON → media entries sorted by `sourcePath`.
Manifest media sorted by `sourcePath`. Canonical JSON uses established Slice 12
deterministic serialization including trailing LF.

### 12. SHA-256 integrity

Web Crypto SHA-256 over exact UTF-8 game bytes and each media asset. Import
validates length then digest before semantic trust. ZIP CRC is not the
application integrity contract.

### 13. Resource limits

Authoritative constants in `src/pack/limits.ts`:

| Constant | Value |
| --- | --- |
| `MAX_PACK_INPUT_BYTES` | 32 MiB |
| `MAX_PACK_ENTRY_COUNT` | 130 |
| `MAX_PACK_MEDIA_COUNT` | 128 |
| `MAX_PACK_MANIFEST_BYTES` | 128 KiB |
| `MAX_PACK_GAME_BYTES` | 2 MiB |
| `MAX_PACK_MEDIA_BYTES` | 4 MiB per asset |
| `MAX_PACK_TOTAL_MEDIA_BYTES` | 24 MiB |
| `MAX_PACK_TOTAL_EXTRACTED_BYTES` | 28 MiB |

Canonical JSON must still satisfy existing `MAX_IMPORT_TEXT_LENGTH`. Authored
source paths still satisfy `MAX_MEDIA_PATH_LENGTH`.

### 14. Bounded streaming ZIP import

Untrusted import: see each entry before acceptance; validate path; enforce entry
count; use declared sizes as early-rejection signals where available; count
actual emitted uncompressed bytes; abort on limit breach; never extract to OS
filesystem; never create object URLs or commit partial media before full
validation succeeds.

### 15. Path and special-entry rejection

Reject absolute paths, `\`, drive letters, `..`, empty segments, `:`, `?`, `#`,
NUL, `%`, whitespace tricks, duplicates, case collisions, unexpected
directories, symlinks, and non-ordinary file semantics exposed by the ZIP layer.

### 16. Raster-only pack media

Pack v1 accepts sniffed PNG, JPEG, WebP, and GIF87a/GIF89a only. Magic-byte
sniffing is authoritative; extension, manifest MIME, and fetch Content-Type are
not trusted.

### 17. SVG hosted-vs-pack distinction

Hosted canonical games may still reference same-origin SVG through plain JSON
(ADR-011 unchanged). Portable pack export rejects SVG/HTML/active markup with
structured `pack-media-type-unsupported`. Pack import rejects the same.

### 18. Media byte sniff and decode validation

Pure pack logic is testable without DOM. Browser export/import may inject a
narrow decode adapter (`createImageBitmap` or equivalent) using ephemeral Blob
URLs that are revoked immediately. MIME comes from sniffed bytes only.

### 19. Media acquisition

Injectable `resolveMediaBytes(sourcePath)` boundary. Hosted export: same-origin
fetch via `BASE_URL`, status check, byte limits, sniff. Re-export after import:
read durable pack bytes from the runtime resource layer — no network required.

Export TOCTOU: capture definition → canonical JSON → inventory → acquire → build;
async work packages the captured snapshot only.

### 20. Import atomicity

Validate all stages, then durable asset transaction, then establish runtime
resource scope, then `INITIALIZE_GAME`. Failure before commit leaves active game
unchanged. Browser activation and IndexedDB are not one ACID transaction.

### 21. Resource scope — canonical JSON digest

```text
resourceScopeKey = SHA-256(exact canonical game JSON UTF-8 bytes)
```

Not game id alone. Not serialized into canonical JSON or public wire. Host-private
resource-version key preventing same-id shadowing when content changes.

### 22. Runtime resolver

```text
canonical same-origin path
  → pack registry (active matching scope)
  → else BASE_URL same-origin join
```

Blob URLs are ephemeral render handles only. Local pack bytes win only for the
active matching scope.

### 23. IndexedDB version 3

Bump persistence database **2 → 3** (additive). New store `packMediaAssets` holds
validated bytes keyed by `resourceScopeKey + sourcePath`. Coordination store
gains `active-pack-resource-scope` pointer for display hydration. No Blob URLs,
manifest text, scores, or session state in durable rows.

### 24. Save / Load / recovery lifetime

Imported pack media survives ordinary refresh, active-session recovery, Save
definition, and later Load. Saved canonical JSON does not gain pack metadata;
hydration derives scope from exported JSON text and loads matching durable bytes.

### 25. Cleanup / GC

Remove unreferenced pack scopes when active game and saved definitions no longer
need them. Replace scope atomically on re-import of same canonical artifact.
Reset persistence clears pack media store. Revoke runtime object URLs on scope
replacement and cleanup.

### 26. Export after import

After import in a clean environment, pack export reads local durable/registry
bytes; canonical JSON remains equivalent; paths unchanged; digests match stored
bytes; resulting pack imports independently.

### 27. Privacy

Portable packs are host-private. They contain answer keys, alternates, notes, and
embedded clue media. Pack diagnostics, export status, and import panels are
host-only. No pack metadata in projector DOM beyond the rendered public image.

### 28. Public-state non-impact

No new `PublicState` fields. No sync envelope change. No new commands or events.
Image prompts still project the same public DTO; resolution happens in the
application resource layer.

### 29. Display hydration — coordination scope + BroadcastChannel

Host publishes the active `resourceScopeKey` to the coordination store and
announces scope key only (never bytes) on
`classroom-quiz-show:pack-media-scope:v1`. Display tabs subscribe, read IndexedDB,
and hydrate the shared in-memory registry so projector `mcd-img` resolves pack
media without changing PublicState.

### 30. Offline behavior

Pack bytes are local after import. Gameplay with embedded media does not require
network fetch of original hosted paths. PWA shell offline behavior (Slice 14)
remains separate; Slice 19 does not claim full offline gameplay beyond local
asset availability.

### 31. Failure behavior

Structured `PackIssue` model with stages: transport, container, manifest, game,
media, integrity, storage, commit, download. Fail closed at every stage. Quota
and storage failures surface `pack-storage-quota` / `pack-storage-failed`.

### 32. Compatibility policy

Plain `.classroom-quiz-show.json` import/export unchanged. Pack v1 is additive.
Unsupported `packVersion` fails with `pack-version-unsupported`. No silent
upgrade path in Slice 19.

### 33. Explicit version consequences

| Artifact | Slice 19 impact |
| --- | --- |
| Canonical game schema | **1 — unchanged** |
| `GameDefinition` | **1 — unchanged** |
| Public wire | **8 — unchanged** |
| Sync envelope | **2 — unchanged** |
| Private active-session wire | **1 — unchanged** |
| IndexedDB persistence | **2 → 3 — additive pack store** |
| Pack format | **new — v1** |

Commands, events, reducer, and replay are unchanged.

### 34. Non-goals

Spreadsheet authoring, AI, question bank, remote media, new media kinds, audio/
video in packs, standards/GCS tags, controller profiles, presentation audio
(Slice 22), release qualification (Slice 23), and backend/cloud dependency.

### 35. Slice 20 reuse boundary

Slice 20 spreadsheet authoring may hand off to optional portable pack export
using this same builder/importer. Slice 20 must not create a second pack
pipeline or alter pack v1 semantics without separate authorization.

### 36. Slice 22 exclusion

Presentation audio assets and settings are not bundled in pack v1 and are
explicitly excluded from pack privacy/session isolation rules above.

## Consequences

- Teachers gain a host-owned offline artifact distinct from plain JSON.
- Display image rendering depends on coordination-scope hydration for pack
  games; host and display tabs on the same origin share durable bytes via
  IndexedDB, not public wire.
- IndexedDB migration to version 3 must be proven on upgrade from version 2.
- Security ownership stays in application validation, not archive library
  defaults.

## Evidence

Implementation receipt:
[`../receipts/2026-08-07-slice-19-portable-packs-implementation.md`](../receipts/2026-08-07-slice-19-portable-packs-implementation.md)

**STOP BEFORE MERGE** — this ADR documents proposed in-review work; merge and
Accepted status require separate owner authorization after exact-head review.
