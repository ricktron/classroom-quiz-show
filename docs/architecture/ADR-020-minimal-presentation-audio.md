# ADR-020 — Minimal presentation audio

- **Status:** Proposed (implementation PR; not yet Accepted/merged)
- **Date:** 2026-08-10
- **Slice:** 22 — Minimal Presentation Audio
- **Authorization:**
  `AUTHORIZE-CQS-SLICE-22-MINIMAL-PRESENTATION-AUDIO-IMPLEMENTATION-2`
- **Evidence state:**
  `CQS-SLICE-22-MINIMAL-PRESENTATION-AUDIO-IMPLEMENTATION-ES-2`
- **Depends on:** accepted gameplay facts already owned by Slices 2–18
  (buzz queue, scoring, timers, Final settlement, session end); PWA
  precache (Slice 1); host session-store lifecycle
- **Supersedes:** nothing
- **Contract impact:** `NO AUTHORITATIVE CONTRACT CHANGE`
- **Dependency impact:** `NO NEW RUNTIME DEPENDENCY`

## Context / problem

Classroom play already produces authoritative buzz, score, timer, Final, and
completion facts, but the host application previously offered no optional
presentation-audio feedback. Teachers need a tiny, offline, muteable cue layer
that improves live feedback without becoming gameplay authority.

## Decision

Add a **presentation-only** audio subscriber on the private host:

1. Five stable semantic cue IDs
2. One host observation owner
3. One Web Audio playback owner
4. Five original bundled WAV assets
5. Explicit Enable Sound + mute + master volume (default ≈ 35%)

Gameplay remains the sole source of truth. Audio never controls, delays,
retries, cancels, alters, or becomes evidence for gameplay.

## Presentation-only authority boundary

```text
authoritative accepted event
        ↓
presentation cue ID (semantic)
        ↓
current cue registry (MVP: one personality)
        ↓
local WAV asset → decoded AudioBuffer → short playback
```

- Audio derives from already-accepted events.
- Audio failure cannot affect commands, events, reducer, replay, sync, or UI
  gameplay dispatch.
- Mute / inactive / decode failure **consume** events (no backlog).

## Five stable semantic cue IDs

Exact IDs:

- `active-claim`
- `positive-award`
- `incorrect`
- `timer-expired`
- `game-complete`

Gameplay code must never know asset filenames.

### Cue semantics (binding)

| Cue | When |
| --- | --- |
| `active-claim` | First accepted `TEAM_BUZZED` that establishes the active respondent; or `ACTIVE_RESPONSE_RESOLVED` with `passed` that promotes a waiting team |
| `positive-award` | Positive `TEAM_SCORE_ADJUSTED` in `full-credit` or `partial-credit`; Final `FINAL_TEAM_SETTLED` with `outcome === 'correct'` (including zero wager) |
| `incorrect` | `ACTIVE_RESPONSE_RESOLVED` with `incorrect` (even if promotion follows — **incorrect only**); Final settle `incorrect` |
| `timer-expired` | Accepted `RESPONSE_TIMER_EXPIRED`, `FINAL_WAGER_WINDOW_EXPIRED`, or `FINAL_RESPONSE_WINDOW_EXPIRED` |
| `game-complete` | Newly accepted live `GAME_SESSION_ENDED` transitioning active → ended; one cue per atomic suffix |

### Explicit non-plays

- Waiting / duplicate / rejected buzzes
- Deduction and manual corrections (any sign)
- Final `no-response`
- Timer pause / interrupt / manual reset / stale rejected expiry
- Historical recovery / remount / store replacement baselines
- `EVENT_UNDONE` and any compensating opposite sound
- Controller diagnostics / raw hardware presses

## Why cues derive from authoritative accepted events

Physical input (keyboard, Sony Buzz, future controllers) is not acoustically
authoritative. Only accepted game facts have classroom meaning, so the same
accepted action sounds the same regardless of hardware path.

## Host-only ownership / public-state unchanged

The private host owns playback. The projector/display must not play sound and
must not receive audio fields.

Unchanged:

- public-state wire **8**
- sync envelope **2**
- BroadcastChannel payloads
- sanitizer allow-list

No audio identity is transmitted to the projector (avoids echo/double playback).

## Web Audio decision

Use the browser **Web Audio API** (`AudioContext`, `GainNode`,
`AudioBufferSourceNode`) rather than `<audio>` elements.

Primary sources consulted:

- [MDN — Web Audio API best practices](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Best_practices)
  (autoplay: create/resume from user gesture; short SFX via fetched/decoded
  buffers)
- [MDN — `AudioContext.resume()`](https://developer.mozilla.org/en-US/docs/Web/API/AudioContext/resume)
- [MDN — Using the Web Audio API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Using_Web_Audio_API)
- WHATWG user-activation tracking (HTML living standard)

Implementation decisions from that guidance:

- Explicit **Enable Sound** user gesture creates/resumes the context
- Kick `resume()` early in the gesture call stack before awaiting decode
- Prefetch/decode all five buffers during activation (no first-cue latency)
- No Howler / Tone.js / standardized-audio-context runtime dependency

## Explicit activation

Sound begins inactive. Teacher selects **Enable Sound**. On success:

- unmuted
- master volume ≈ **0.35**
- all five buffers ready

Failed activation exposes concise host-visible status; gameplay continues.
Retry is explicit (no automatic retry loops).

## One AudioContext / playback owner

Per host document:

- lazily created `AudioContext` (`latencyHint: 'interactive'` when supported)
- one master `GainNode`
- five decoded `AudioBuffer`s
- at most one active short source

Document singleton survives SessionStore replacement within the same page;
resets on full reload.

## One observer owner

Attached to the current `SessionStore` via the host foundation lifecycle:

1. Inspect current history
2. Baseline watermark at history tail
3. Emit **zero** historical cues
4. Process only newly appended events in order
5. Dedupe by event `id`; collapse multiple `game-complete` in one suffix
6. Advance watermark whether muted, inactive, or playback fails

On `storeEpoch` / SessionStore replacement: detach old observer, baseline new
tail, emit nothing historical.

React StrictMode detach/reattach must not duplicate historical sounds.

## Latest-cue-wins overlap

When a new cue begins, stop/disconnect any active short source and start the
new cue. No queues, priority schedulers, mixing buses, or ducking.

Cue derivation already collapses known double-cue cases (incorrect + promotion).

## Mute / volume / page-memory lifecycle

Host controls: Enable Sound, mute/unmute, master volume.

- Default volume after activation: **0.35**
- Clamp to `[0, 1]`
- Page memory only — **no IndexedDB**, **no localStorage**, no persistence
  version bump
- Preferences survive SessionStore replacement in the same mounted host page
- Reset on full page reload

Muted or failed playback never creates a backlog.

## Undo / recovery

- `EVENT_UNDONE` → no sound; watermark advances; no compensating cues
- Recovery mount → baseline to recovered tail; silence
- Remount / store replacement → rebaseline; silence

## Asset generation / provenance

Assets are generated by repository-owned
`scripts/generate-audio-cues.mjs` (Node primitives only; deterministic PCM WAV
mono 16-bit 44.1 kHz).

Paths:

- `src/assets/audio/core/active-claim.wav`
- `src/assets/audio/core/positive-award.wav`
- `src/assets/audio/core/incorrect.wav`
- `src/assets/audio/core/timer-expired.wav`
- `src/assets/audio/core/game-complete.wav`

Every Slice 22 asset:

- original / generated (no third-party sample)
- commercially safe core candidate
- no attribution requirement beyond repository copyright
- no BBC / remote library material

Exact SHA-256 / bytes / durations live in the implementation receipt.

## Offline / PWA

Vite-imported asset URLs; Workbox `globPatterns` includes `wav`.
No second audio cache architecture. No media range-request complexity for these
short decoded buffers.

## Accessibility / visual parity

Audio never carries information unavailable visually. Muted / deaf /
hard-of-hearing users retain full functionality.

- Enable Sound has an accessible name
- Mute uses `role="switch"` with checked state
- Volume is a labelled range input
- Status/error text is readable (`role="status"`)
- Keyboard operable
- No public-display dependency on audio
- Reduced-motion remains independent (no added flash/animation for audio)

## Hardware independence

Cues derive from accepted facts, not WebHID / Gamepad / keyboard listeners.
Keyboard, Sony Buzz, and future controllers that produce the same accepted
action sound identically.

## Future personality / registry seam

Stable cue IDs remain fixed. Future personalities may replace the registry
mapping (`CueRegistry`) without changing gameplay semantics, GameDefinition,
or event contracts.

Examples (not implemented): modern/core, retro, sci-fi, classroom-subtle,
pre-commercial beta, commercially licensed premium.

Slice 22 ships exactly one registry and no selector UI.

## Future pre-commercial beta-pack boundary

A future education-beta pack may use separately reviewed assets whose licenses
permit that specific usage. It must remain operationally separable from the
commercially safe canonical core.

Before any third-party asset is distributed, verify:

- usage right
- redistribution right
- attribution requirement
- commercial boundary

**BBC Sound Effects** is an approved **future audition/candidate source only**,
not an approved Slice 22 bundled source. No BBC or other third-party audio is
committed in this slice.

## Rejected alternatives

- `<audio>` element graph as primary playback (less precise short-SFX control)
- Runtime audio libraries (Howler, Tone.js, etc.) — unnecessary dependency
- Projector-side playback / PublicState audio fields — echo + contract churn
- Persisting mute/volume — persistence version risk for presentation prefs
- Sound packs / personality UI / theme song — post-MVP / out of scope
- Playing from raw hardware callbacks — breaks hardware independence
- Backlog replay after unmute — surprising and non-authoritative

## Non-goals (Slice 22)

Theme/lobby/background music; countdown ticking; announcer/TTS; applause;
per-team sounds; custom uploads; soundboard; remote URLs; authored
GameDefinition audio; pack selector; BBC distribution; premium commercial audio
system; output-device selector; generalized effects framework; Slice 23
qualification.

## Contract / version impact verdict

`NO AUTHORITATIVE CONTRACT CHANGE`

Unchanged versions include workbook **1**, AuthoringDraft **1**, portable pack
**1**, canonical game schema **1**, GameDefinition **1**, public-state wire
**8**, sync envelope **2**, private active-session wire **1**, IndexedDB **4**,
Sony mapping **1**, Sony supported profile **1**, Session Summary **1**,
completed-summary envelope **1**, competitive profile **1**.

`NO NEW RUNTIME DEPENDENCY`
