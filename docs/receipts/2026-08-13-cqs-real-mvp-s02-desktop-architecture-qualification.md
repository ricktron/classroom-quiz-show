# CQS-REAL-MVP-S02 — desktop architecture qualification

## Identity

- **Slice:** `CQS-REAL-MVP-S02-DESKTOP-ARCHITECTURE-QUALIFICATION`
- **Program:** `CQS-REAL-MVP-1`
- **Authorization:**
  `AUTHORIZE-CQS-REAL-MVP-S02-DESKTOP-ARCHITECTURE-QUALIFICATION-1`
- **Evidence-state ID:** `CQS-REAL-MVP-S02-DESKTOP-ARCHITECTURE-QUALIFICATION-ES-1`
- **Kind:** architecture qualification + decision documentation. **No
  production desktop implementation. No S03 authority.**
- **Date (America/Chicago):** 2026-08-13
- **Repository:** `ricktron/classroom-quiz-show`

This receipt records observed research, disposable-spike evidence, and
explicit non-claims. It does **not** contain a final candidate commit SHA.
Final exact-head independent-review evidence is attached to GitHub PR
review plus the terminal Program Orchestrator handoff.

Do not edit this receipt after final exact-head review merely to write a
PASS at that same head.

Durable architecture decision:
[`../architecture/ADR-021-real-mvp-desktop-architecture-electron.md`](../architecture/ADR-021-real-mvp-desktop-architecture-electron.md).

## Starting base and fresh local provenance

| Fact | Observed |
| --- | --- |
| Expected canonical `origin/main` | `395de5c184da925ad23158613eed521c45655b19` |
| Exact starting `origin/main` | `395de5c184da925ad23158613eed521c45655b19` |
| Parent | `67f23d960fd2116d54d9beeb6bf6c17500b5b62e` |
| Tree | `f1ab1bbaffc258cae37482f269d032c837a4e180` |
| Host | `Ricks-MacBook-Air.local` |
| User | `macdaddy` |
| cwd / Git toplevel | `/Users/macdaddy/Documents/Coding/Cursor Projects/classroom-quiz-show` |
| Delivery branch | `docs/cqs-real-mvp-s02-desktop-architecture-qualification` created from that exact `origin/main` |
| Working tree at preflight | clean |
| Open PRs at preflight | none |
| Product / production `package.json` changes | **NONE** |
| S03 distribution work | **NOT STARTED** |

Additional historical/detached worktrees existed under `/private/tmp/` from
prior slice verification. None owned overlapping S02 durable scope.
Disposable S02 spikes used `/tmp/cqs-s02-qual/` and were not added to this
repository.

## Decision

```text
PRIMARY REAL MVP DESKTOP ARCHITECTURE: ELECTRON THIN SHELL
```

Tauri is rejected for macOS WebHID / ADR-019 split incompatibility.
PWA/Web remains the supported alternate.
S03 remains unauthorized.

## Evidence taxonomy used

| Class | What was run |
| --- | --- |
| RESEARCH | Current official Electron 43, Tauri 2, MDN/Can I Use WebHID, WebKit standards-positions #510 |
| DISPOSABLE SPIKE | Electron 43.4.0 wrapping the existing Vite production renderer under `cqs://app`; system WKWebView Swift probe |
| AUTOMATED UNIT | Durable-candidate `npm run verify` (recorded in the PR/handoff, not this receipt) |
| PRODUCTION BUILD | Canonical `npm run build` on this host; relative and root-base Vite builds into `/tmp` |
| BROWSER/WEBVIEW OBSERVED | Electron renderer probes; system WKWebView JS evaluation |
| PHYSICAL HARDWARE | **NOT RUN** — no Sony `054c:1000` receiver attached (`ioreg` showed no vendor `054c`) |
| OWNER OBSERVED | **NOT RUN** |
| TRANSFERRED | **NONE** for desktop Sony. Slice 21 Chrome physical evidence is not treated as Electron proof |
| NOT RUN | Windows packaged runtime; Electron Forge/electron-builder production makers; Playwright WebKit (browser binary absent); `npm run verify:all` unless later recorded as run |

## Research (primary sources)

Consulted 2026-08-13. Versions are those relevant to the experiments, not a
claim that they are frozen production pins.

| Source | What it established |
| --- | --- |
| [Electron Device Access](https://www.electronjs.org/docs/latest/tutorial/devices) (docs fiddle **43.4.0**) | First-class WebHID: `select-hid-device`, `setDevicePermissionHandler`, `setPermissionCheckHandler` |
| [Electron Security](https://www.electronjs.org/docs/latest/tutorial/security) | `contextIsolation`, sandbox, no Node in renderer, prefer custom protocol over `file://`, CSP, navigation/`window.open` limits |
| [Electron `window.open`](https://www.electronjs.org/docs/latest/api/window-open) | Renderer `window.open` pairs to `BrowserWindow`; `setWindowOpenHandler` is authoritative |
| [Electron packaging tutorial](https://www.electronjs.org/docs/latest/tutorial/tutorial-packaging) | Electron Forge packages macOS `.app` and Windows distributables; signing recommended and owner-gated |
| [electron-builder](https://www.electron.build/) | Alternate packager: macOS/Windows installers, GitHub Releases provider exists (auto-update **not** adopted) |
| [Tauri 2 webview versions](https://v2.tauri.app/reference/webview-versions/) | macOS = WKWebView; Windows = WebView2 (Chromium); “use caniuse” for engine features |
| [Tauri 2 security](https://v2.tauri.app/security/) | OS webview is not bundled; IPC/capabilities model. Does not add WebHID to WKWebView |
| [Can I Use WebHID](https://caniuse.com/webhid) | Chrome/Edge supported; Safari 3.1–26.5/TP **not supported** |
| [MDN WebHID](https://developer.mozilla.org/en-US/docs/Web/API/WebHID_API) | Limited availability; not Baseline |
| [WebKit standards-positions #510](https://github.com/WebKit/standards-positions/issues/510) | WebHID position request open (created 2025-06-10; still open 2026-05-26); not implemented |

## Disposable spikes (not in the production tree)

Preferred structure was followed:

```text
canonical repo remains production source
→ Vite-build existing CQS into /tmp/cqs-s02-qual/renderer
→ disposable Electron 43.4.0 in /tmp/cqs-s02-qual/electron wraps that build
→ focused probes
→ spike remains outside git
```

Electron was **not** added to production `package.json`.

### A. Existing React/Vite core — PASS

Canonical `npm run build` succeeded (chunk `dist/assets/index-gkuM_rRh.js`
**1256.80 kB** gzip **375.32 kB**; PWA precache 22 entries / 1466.29 KiB).
That is the same `LOW-02` magnitude already recorded; **monitor only**.

Electron loaded that core at `cqs://app/index.html#/host`:

- `hostMounted: true`
- Host banner present
- “Open display in new window” present
- title `Classroom Quiz Show`

`VITE_BASE=./` broke `absoluteHashUrl` (Display URL became `cqs://app./#/…`).
`VITE_BASE=/` produced `cqs://app/#/display?theme=default` and is the S03
packaging base for a custom-scheme origin.

### B. Host + Display lifecycle — PASS

Existing Host button click, not a second Display implementation:

| Step | Observed |
| --- | --- |
| Launch Host | 1 window |
| Open Display | `displayCreated: true`; URL `cqs://app/#/display?theme=default`; `displayMounted: true` |
| Privacy | Display Host-banner absent; `requireDefined: false` |
| BroadcastChannel | Display received `{ from: "host", ok: true }` |
| Close Display | Host not destroyed; window count 1 |
| Reopen Display | `displayReopened: true` |
| Close Host | window count 0 |

### C. Offline packaged operation — PASS (architecture)

`session.enableNetworkEmulation({ offline: true })` then load Host:
`hostMounted: true` at `cqs://app/index.html#/host`. No localhost Vite server
and no GitHub Pages. Production installers remain S03.

### D. Persistence / recovery — PASS (identity)

Origin `cqs://app` was stable across quit/relaunch in the same `userData`
directory.

- Write: `{ marker: "durable-1" }` into probe DB `cqs-s02-probe`
- Relaunch read: `found: true`, same marker
- `indexedDB.open('classroom-quiz-show-persistence', 4)` succeeded (`opened`)

S03 must stabilize application identity (`appId` / userData) so manual
GitHub Releases replacement keeps that origin. Storage model is not changed.

### E. Audio — PASS

Fetched existing cue `cqs://app/assets/active-claim-baLJzij3.wav`
(HTTP 200, 13274 bytes) and decoded via `AudioContext`: 1 channel, 0.15 s,
48000 Hz. No new audio architecture. Enable Sound user-gesture policy from
ADR-020 is unchanged.

### F. Keyboard — PASS

`sendInputEvent` Space → renderer `keydown` `{ code: "Space", key: " " }`.
Existing `useKeyboardBuzzInput` path is DOM `keydown`; not replaced.

### G. Gamepad — PASS (API; no physical pad)

`typeof navigator.getGamepads === "function"`; returned length **4**;
connected count **0**. No second poll owner. No physical generic Gamepad
was attached.

### H. Sony / WebHID — API PASS; physical **bounded debt**

Electron renderer:

- `hidPresent: true`
- `hidRequestDevice: true`
- `hidGetDevices: true`
- Chromium HID service logged collection parse warnings (HID stack live;
  not a Sony claim)
- Spike permission handlers restricted to `vendorId 0x054c` /
  `productId 0x1000`

Physical smoke test **NOT RUN**. No `054c` USB device was present. This
receipt does **not** claim keep-alive success, Gamepad Wbuzz topology, or
Buzzer Check input on Electron. Slice 21 remains Chrome/macOS physical
evidence only.

Architecture selection can still be made: Electron preserves the existing
WebHID + Gamepad split in Chromium; Tauri/macOS cannot. Physical packaged
requalification is S03/S06 debt and does not undermine wrapper selection.

### I. Security boundary — ACCEPTABLE (with S03 CSP/navigation controls)

Observed in sandboxed renderer (no preload):

- `requireDefined: false`
- `processDefined: false`
- `electronExposed: false`

Imported content remains data through the existing canonical importer.
Unpackaged spike printed Electron’s insecure-CSP warning. S03 must set a
restrictive CSP and keep Display `window.open` allow-listed to same-origin
`#/display`.

### J. Packaging feasibility

| Target | Disposition |
| --- | --- |
| macOS application/package | **PASS** — official Electron Forge packaging produces `.app`; spike ran the same Chromium-wrapped renderer |
| Windows application/installer | **PASS** (docs) — Electron Forge / electron-builder Windows makers. **This Mac did not produce or run a Windows artifact** |
| Stable identity / versioned artifacts / conventional launch | Architecturally compatible; not implemented |

### K. Manual-update compatibility — PASS (architecture)

Replacing a versioned GitHub Releases binary while keeping Electron `appId`
/ userData preserves the custom-scheme origin and IndexedDB. Auto-update is
**not** adopted.

### L. `CLASS-B-01` — ACCEPTABLE FOR S03 WITH DOCUMENTED CONTROL

| Fact | Observed |
| --- | --- |
| Lockfile | `xlsx@0.20.3` resolved `https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz` with integrity `sha512-oLDq3jw7AcLqKWH2AhCpVTZl8mf6X2YReP+Neh0SJUzV/BdZYjth94tG5toiMB1PPrYtxOCfaoUCkvtuH+3AJA==` |
| Local `npm ci` | Succeeded on this host (cdn.sheetjs.com reachable) |
| Canonical `main` CI | Run [31717406213](https://github.com/ricktron/classroom-quiz-show/actions/runs/31717406213) **success** on `395de5c…` (`npm ci` + build) |
| Packaged runtime | Production bundle contains SheetJS (`xlsx` matches in the built JS). End-user runtime does not fetch `cdn.sheetjs.com` |
| S02 mutation | **None.** SheetJS was not re-pinned |

Control for S03: desktop/CI builds must reach that host. If they cannot,
repair then. Not a wrapper discriminator.

`LOW-02` confirmation: production JS **1256.80 kB**; **OPEN LOW / MONITOR
ONLY**. Not optimized in S02.

## Tauri / WKWebView discriminator (no Tauri scaffold)

System WKWebView Swift probe (`/tmp/cqs-s02-qual/wkwebview-probe.swift`):

```json
{
  "userAgent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko)",
  "hidPresent": false,
  "hidType": "undefined",
  "gamepadFn": "function",
  "broadcastChannel": "function",
  "indexedDB": "object",
  "audioContext": "function"
}
```

Gamepad exists in WKWebView. WebHID does not. That is sufficient to reject
Tauri as the primary macOS+Windows REAL MVP wrapper without a Tauri app
scaffold.

## Qualification matrix

| Dimension | Disposition |
| --- | --- |
| shared React/Vite core | PASS |
| Host window | PASS |
| Display window | PASS |
| Host/Display privacy | PASS |
| offline packaged operation | PASS |
| IndexedDB persistence identity | PASS |
| recovery feasibility | PASS |
| keyboard | PASS |
| Gamepad | PASS (API; no physical pad) |
| Sony WebHID architecture | PASS as architecture (Chromium WebHID APIs + documented session HID control); **physical desktop evidence debt** |
| Web Audio | PASS |
| macOS packaging feasibility | PASS |
| Windows packaging feasibility | PASS (primary docs; Windows runtime **NOT RUN**) |
| manual-update compatibility | PASS |
| security model | ACCEPTABLE |
| release automation feasibility | ACCEPTABLE |
| `CLASS-B-01` | ACCEPTABLE FOR S03 WITH DOCUMENTED CONTROL |
| PWA/Web coexistence | PASS |
| no duplicated CQS core | PASS |

No unresolved item capable of changing the wrapper decision remains, other
than owner gates that S02 must not silently resolve (signing, fee waiver,
CPU/OS matrix, Windows qualification availability). Those do not change
Electron vs Tauri.

## Explicit non-claims

- Architecture is **not** merged/canonical until this candidate is merged.
- Production Electron shell is **not** implemented.
- S03 is **not** authorized.
- Physical Sony keep-alive / Buzzer Check on Electron is **not** claimed.
- Windows packaged app was **not** built or launched.
- Auto-update is **not** selected.
- PWA/Web is **not** removed.
- SheetJS is **not** re-pinned.
- Prototype scaffolding is **not** in the production tree.

## Owner gates

**Not triggered** as architecture blockers:

- Apple Developer / signing / fee waiver
- Windows signing method/cost
- final CPU/OS support matrix
- real Windows qualification availability
- independent teacher beta
- feedback email
- visual reference image
