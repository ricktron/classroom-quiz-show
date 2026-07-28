# ADR-011 — Media contract for prompts (text + same-origin image)

- **Status:** Accepted (Slice 11) — implementation open for review
- **Date:** 2026-07-27
- **Slice:** 11 — Media contract
- **Depends on:** [ADR-002](ADR-002-state-event-sync-core.md),
  [ADR-004](ADR-004-canonical-validation-import.md),
  [ADR-005](ADR-005-category-board-round.md),
  [`ROADMAP-AMENDMENT-001`](../decisions/ROADMAP-AMENDMENT-001-local-buzzers.md)
- **Supersedes:** nothing. Fulfils the permanent
  [`GAME-ENGINE-BOUNDARIES.md`](GAME-ENGINE-BOUNDARIES.md) §9 invariant that no
  type or component may assume a prompt is a plain string.

## Context

Slices 4–5 shipped category-board prompts as bare strings. §9 of the engine
boundaries document already forbade that assumption permanently, and the
roadmap amendment pulled the media contract **ahead of any new round type** so
a second playable round cannot deepen the string-only habit.

Slice 11 must therefore introduce a typed prompt model that:

- keeps every pre-existing string prompt valid and meaning **text**;
- adds a bounded static **image** form on the same `schemaVersion: 1` document;
- fails closed on unsupported kinds and unsafe sources;
- projects only allow-listed public content;
- never couples timers to media length or playback (`OG-9` remains open).

## Decision

### 1. Media applies to prompts only

`answer`, `alternates`, and `notes` remain plain strings. One media item occupies
the prompt field itself — there is no media array on a tile.

### 2. Authored shapes (additive on `schemaVersion: 1`)

Accepted:

```jsonc
"prompt": "<non-empty string ≤ 600 chars>"
// or
"prompt": {
  "kind": "image",
  "source": { "kind": "same-origin-path", "path": "<relative-path>" },
  "alt": "<required text>",
  "caption": "<optional>",
  "attribution": "<optional>"
}
```

Every object level is `z.strictObject` (or equivalent strict validation). Unknown
keys → `unknown-field`. Missing required fields → `missing-field`. Whitespace-only
text → `blank-text`. Unknown media `kind` → `unsupported-media-kind`. Invalid
source kind or path → `invalid-media-source`.

### 3. Source policy — `same-origin-path` only

The only implemented source kind is `same-origin-path`. Paths must match
`^[A-Za-z0-9][A-Za-z0-9._/-]*$`, length 1…500, and must not contain `..`, `:`,
`?`, `#`, `\`, whitespace, or a leading `/`. Remote schemes (`https:`, `http:`,
`data:`, `blob:`, `file:`, `javascript:`) are refused at import. **No remote MIME
validation is claimed** — the browser loads a same-origin URL; content-type is
not inspected by the engine.

### 4. Trusted domain

```ts
type PromptContent =
  | { kind: 'text'; text: string }
  | {
      kind: 'image'
      source: { kind: 'same-origin-path'; path: string }
      alt: string
      caption: string | null
      attribution: string | null
    }
```

The category-board constructor normalizes authored strings to `{ kind: 'text',
text }`, copies image fields, deep-freezes, and never mutates input. Exhaustive
helpers refuse silent default branches that fabricate content. Impossible trusted
media fails closed at sanitize/read (`round: null` / unavailable).

### 5. Public DTO and wire bump 6 → 7

`PublicPromptContent` mirrors the trusted allow-list. Stage rules are unchanged:

| Stage | `prompt` | `answer` |
| --- | --- | --- |
| board / selected | `null` | `null` |
| prompt | public prompt DTO | `null` |
| answer | public prompt DTO retained | plain string |

`PUBLIC_STATE_SCHEMA_VERSION` becomes **7**. Version 6 is rejected, never
reinterpreted. `SYNC_SCHEMA_VERSION` stays **2**. Game-file `schemaVersion`
stays **1**.

### 6. Accessibility and fail-closed rendering

Caption and attribution, when present, are visible on host and projector. Image
load failure shows **“Image unavailable”** plus the authored `alt` as visible
fallback text — no invented clue content. Unknown wire kinds render unavailable.
`MediaContentDisplay` accepts **only** `PublicPromptContent`.

### 7. Fail-closed matrix

| Failure | Result |
| --- | --- |
| Unsupported media kind at import | Import fails; no active-state change |
| Invalid source / path at import | Import fails (`invalid-media-source`) |
| Unknown field on media object | Import fails (`unknown-field`) |
| Malformed trusted media at sanitize | `round: null` → projector unavailable |
| Image `<img>` `onError` | Status + authored alt; no other content invented |
| Unknown public prompt kind | Unavailable clue panel |

## Alternatives considered

- **Bump game-file `schemaVersion` to 2** — rejected; additive optional forms on
  v1 match the teams/timer precedent and preserve every existing document.
- **Allow remote `https` images** — rejected for classroom offline/safety; same-
  origin paths keep assets under the app base URL.
- **Media on answers** — deferred; answers stay plain strings this slice.
- **Audio / video** — deferred; only text + static image are implemented.

## Explicit non-goals

No export; no persistence; no authoring/spreadsheet import; no audio/video; no
timer/media coupling; no command/event/reducer/scoring/buzz/gamepad changes; no
sync-envelope bump; no new npm dependency; no remote MIME validation claim.

## Consequences

- Every consumer of `CategoryBoardTile.prompt` must treat it as `PromptContent`.
- Projector and host render through typed presentation (`MediaContentDisplay` /
  host private preview); bare-string rendering is gone.
- Wire consumers pinned to public-state version 6 fail closed until updated.
- A tiny CI fixture lives at `public/media-fixtures/slice-11-clue.png` (not a
  content pack).
