# ADR-021 — REAL MVP desktop architecture (Electron thin shell)

- **Status:** Proposed — `CQS-REAL-MVP-S02` architecture-qualification
  candidate. Not production-implemented. Not canonical until this
  documentation candidate is merged. Independent exact-head review is
  required.
- **Date:** 2026-08-13
- **Slice:** `CQS-REAL-MVP-S02-DESKTOP-ARCHITECTURE-QUALIFICATION`
- **Program:** `CQS-REAL-MVP-1`
- **Authorization:**
  `AUTHORIZE-CQS-REAL-MVP-S02-DESKTOP-ARCHITECTURE-QUALIFICATION-1`
- **Depends on:** [ADR-001](ADR-001-github-pages-routing.md),
  [ADR-002](ADR-002-state-event-sync-core.md),
  [ADR-004](ADR-004-canonical-validation-import.md),
  [ADR-008](ADR-008-local-input-keyboard-buzz.md),
  [ADR-009](ADR-009-generic-gamepad-adapter.md),
  [ADR-013](ADR-013-local-persistence-recovery.md),
  [ADR-019](ADR-019-sony-buzz-supported-profile-direct-webhid-keepalive.md),
  [ADR-020](ADR-020-minimal-presentation-audio.md)
- **Supersedes:** nothing. Does not replace GitHub Pages / PWA, the
  existing game core, or ADR-019’s WebHID / Gamepad split.
- **Evidence:**
  [`../receipts/2026-08-13-cqs-real-mvp-s02-desktop-architecture-qualification.md`](../receipts/2026-08-13-cqs-real-mvp-s02-desktop-architecture-qualification.md)

## Context

REAL MVP requires a conventional teacher install/start path on macOS and
Windows while preserving every critical CQS invariant. The existing product
is a single React / Vite application with hash routing, a private Host, a
sanitized Display synchronized over same-origin `BroadcastChannel`, IndexedDB
persistence, keyboard fallback, one generic Gamepad poll owner, and one exact
Sony Buzz supported profile:

```text
cqs.sony-buzz.namtai-wbuzz-wireless.v1
Namtai wireless Wbuzz 054c:1000
WebHID → keep-alive / transport health
Gamepad → gameplay input
```

S01 registered Electron as the leading qualification candidate and Tauri as
the serious comparison candidate. S02 must select exactly one primary
desktop architecture from evidence, or stop. It must not build the
production distribution system (S03).

## Decision

**Select Electron as the primary REAL MVP desktop architecture.**

Desktop packaging is a **thin application shell** around the existing CQS
Vite production build:

```text
existing React / Vite application core
        ↓
Electron main-process shell (native windows, protocol, permissions)
        ↓
sandboxed Chromium renderer (no Node, no Electron API exposure)
```

There is one shared application/game core. The shell may own native-window
lifecycle, custom-protocol origin, HID permission prompts, and navigation
restrictions. It must not own scoring, persistence authority, Gamepad
polling, Sony keep-alive logic, import validation, or a second Display
privacy model.

PWA / GitHub Pages remains the supported web alternate. This ADR does not
displace it.

## Why Electron

Electron embeds Chromium. That is the same web-platform family already
qualified for Host/Display, Web Audio, Gamepad, IndexedDB, and the exact
Sony WebHID keep-alive path. Official Electron 43 documentation provides
first-class WebHID session APIs (`select-hid-device`,
`setDevicePermissionHandler`, `setPermissionCheckHandler`), native
`BrowserWindow` multi-window behavior including `window.open` interception,
and packaging through Electron Forge / related makers for macOS `.app` and
Windows installers.

A disposable S02 spike loaded the **existing** production renderer (not a
fork) inside Electron 43.4.0 / Chromium 150.0.7871.224 and observed:

| Gate | Observed |
| --- | --- |
| Shared core / HashRouter | Host route mounted at `cqs://app/index.html#/host` |
| Host + Display windows | Existing “Open display in new window” created a second window at `#/display` |
| Display privacy | Display mounted; Host banner absent; `require` / `process` / `window.electron` undefined in both |
| Close Display | Host remained; window count returned to 1 |
| Reopen Display | Succeeded |
| Close Host | Desktop session ended (0 windows) |
| Same-origin sync | `BroadcastChannel` Host → Display delivered |
| Offline packaged load | Host mounted under session network-offline emulation; no Vite dev server; no GitHub Pages |
| IndexedDB identity | Probe write → quit → relaunch → same origin `cqs://app` still held the record; CQS DB v4 opened |
| Keyboard | Renderer received `keydown` `Space` |
| Gamepad API | `navigator.getGamepads` present; length-4 array; zero connected (no controller attached) |
| WebHID API | `navigator.hid`, `requestDevice`, and `getDevices` present |
| Web Audio | Existing `active-claim` WAV fetched (13274 bytes) and decoded |

Physical Sony Buzz hardware was **not attached** during S02. Electron
selection does **not** claim a new physical desktop Sony qualification.
Slice 21 Chrome evidence is not transferred. S03/S06 must physically
requalify the exact supported profile inside the packaged Electron shell.

## Rejected serious alternative: Tauri

Tauri 2 uses the OS webview. Official Tauri webview-versions documentation
states macOS uses **WKWebView** (Safari / WebKit) and Windows uses
WebView2 (Chromium).

System WKWebView on this host, probed directly:

```text
hidPresent: false
hidType: undefined
gamepadFn: function
```

Can I Use records Safari WebHID as unsupported through current Technical
Preview. WebKit standards-positions issue #510 (WebHID) remains open
without an implemented position.

That fails the Sony keep-alive architecture gate on macOS, the owner’s
qualified hardware platform. Preserving the ADR-019 split on Tauri/macOS
would require a native HID keep-alive (a second transport architecture),
or accepting platform-divergent wrappers (WKWebView macOS vs WebView2
Windows). Both violate “one shared CQS core / no second controller
architecture.”

Tauri is therefore rejected as the primary REAL MVP desktop architecture.
A smaller bundle does not outweigh that invariant failure. No equal-effort
Tauri application prototype was required after this discriminator.

## Other architectures

- **PWA/Web** — retained alternate; not the conventional desktop path.
- **Neutralino and similar OS-webview shells** — inherit the same macOS
  WKWebView WebHID gap. Not prototyped.
- **NW.js** — Chromium would likely expose WebHID, but it does not beat
  Electron’s documented process isolation defaults for this product.
  Not prototyped.

## Required shell rules (S03 implementation bound)

S03 may implement the Electron shell. It must:

1. Load the existing Vite-built application. No second game engine, scoring
   model, persistence authority, or controller architecture.
2. Serve that build over a privileged custom scheme with a stable origin
   (spike used `cqs://app`). Do not use `file://` as the production origin.
   Use `VITE_BASE=/` (or another base that keeps `absoluteHashUrl` valid).
   Relative `./` base produced a broken Display URL in the spike.
3. Open Host at `#/host`. Allow Display only as a same-origin `#/display`
   window. Closing Display must not quit Host. Closing Host/app ends the
   session. The shell may lock the Display window to the display hash so
   a projector window cannot be navigated into Host.
4. Renderer defaults: `nodeIntegration: false`, `contextIsolation: true`,
   `sandbox: true`, no Electron API on `window`. Deny unexpected navigation
   and unexpected `window.open` targets.
5. WebHID permissioning may be granted only for exact `054c:1000`. Do not
   disable the Chromium HID blocklist globally. Do not broaden Sony
   support. Keep-alive remains in-app WebHID; gameplay remains Gamepad.
6. IndexedDB remains the persistence store. Stabilize Electron `appId` /
   userData identity so manual versioned replacement preserves storage.
   Do not silently change the storage model.
7. Packaged execution must not require a localhost dev server or GitHub
   Pages. Service-worker registration may be omitted in the desktop build
   because the shell already ships local files; that is a packaging flag,
   not a core fork. PWA registration remains for the web build.
8. Set a restrictive Content-Security-Policy on the custom scheme. The
   unpackaged spike emitted Electron’s insecure-CSP warning; S03 must not
   ship that gap.
9. Produce conventional macOS and Windows artifacts. Signing/notarization
   remain owner gates. Do not implement auto-update.

## `CQS-Q23-CLASS-B-01`

Disposition: **ACCEPTABLE FOR S03 WITH DOCUMENTED CONTROL**.

The `xlsx` dependency is pinned to
`https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz` with a lockfile
integrity hash. That is a **build-time** fetch. The production bundle
includes SheetJS; packaged end-user runtime does not contact
`cdn.sheetjs.com`. GitHub Actions `npm ci` on canonical `main` currently
succeeds. Local `npm ci` on the S02 host succeeded.

S03 must document that release CI and local desktop builds need network
reachability to that host. If it becomes unreachable, repair is required
then. S02 does **not** re-pin SheetJS.

`CQS-Q23-LOW-02` remains **OPEN LOW / MONITOR ONLY**. Observed production
JS chunk **1256.80 kB**. Do not optimize bundle size merely because
desktop packaging is being studied.

## Contract / version impact

`NO AUTHORITATIVE CONTRACT CHANGE`

No production Electron dependency is added by S02. IndexedDB **4**, Sony
supported profile **1**, public-state wire **8**, and the other current
contract versions remain unchanged.

## Non-goals (S02)

Production Electron/Tauri dependencies; installers; release workflows;
signing; notarization; GitHub Releases implementation; auto-update;
teacher-simple setup; feedback UI; visual-fidelity work; Raspberry Pi;
LAN; additional gameplay modes; physical desktop Sony certification;
Windows packaged runtime observation on this Mac; re-pinning SheetJS.
