# CQS-REAL-MVP-S03 — desktop distribution and release foundation

## Identity

- **Slice:** `CQS-REAL-MVP-S03-DESKTOP-DISTRIBUTION-AND-RELEASE-FOUNDATION`
- **Program:** `CQS-REAL-MVP-1`
- **Authorization:**
  `AUTHORIZE-CQS-REAL-MVP-S03-DESKTOP-DISTRIBUTION-AND-RELEASE-FOUNDATION-1`
- **Evidence-state ID:**
  `CQS-REAL-MVP-S03-DESKTOP-DISTRIBUTION-RELEASE-FOUNDATION-ES-1`
- **Kind:** production Electron thin shell, unsigned packaging path, and
  release-build workflow. **Not** a signed teacher release. **Not** S04/S05/S06.
- **Date (America/Chicago):** 2026-08-13
- **Repository:** `ricktron/classroom-quiz-show`

This receipt records observed implementation evidence and explicit
non-claims. It does **not** contain a final candidate commit SHA. Final
exact-head independent-review evidence is attached to GitHub PR review plus
the terminal Program Orchestrator handoff.

Do not edit this receipt after final exact-head review merely to write a
PASS at that same head.

Durable architecture:
[`../architecture/ADR-021-real-mvp-desktop-architecture-electron.md`](../architecture/ADR-021-real-mvp-desktop-architecture-electron.md).

Teacher-facing unsigned-artifact notes:
[`../teacher/DESKTOP.md`](../teacher/DESKTOP.md).

## Starting base and fresh local provenance

| Fact | Observed |
| --- | --- |
| Expected canonical `origin/main` | `abbb2682482a33845c81d93e693fbf84ae24e149` |
| Exact starting `origin/main` | `abbb2682482a33845c81d93e693fbf84ae24e149` |
| Host | `Ricks-MacBook-Air.local` |
| User | `macdaddy` |
| cwd / Git toplevel | `/Users/macdaddy/Documents/Coding/Cursor Projects/classroom-quiz-show` |
| Delivery branch | `feat/cqs-real-mvp-s03-desktop-distribution` created from that exact `origin/main` |
| Working tree at preflight | clean |
| Open PRs at preflight | none |
| Historical / detached worktrees | several under `/private/tmp/` from prior slices; none owned overlapping S03 durable scope |

## Architecture implemented

```text
existing React / Vite application core
        ↓
Electron main-process shell (windows, cqs:// protocol, HID, packaging)
        ↓
sandboxed Chromium renderer (no Node, no Electron API)
```

| Fact | Value |
| --- | --- |
| Electron | **43.4.0** |
| electron-builder | **26.15.3** |
| appId | `com.classroomquizshow.app` |
| productName | `Classroom Quiz Show` |
| userData | derived from product name, **not** version |
| custom origin | `cqs://app` |
| desktop Vite base | `/` |
| web/PWA base | unchanged `/classroom-quiz-show/` |
| version identity | `package.json` `0.1.0` (pre-1.0; Orchestrator may bump later) |
| packaging | one system: electron-builder |
| update model | manual versioned replacement; auto-update **not** implemented |

The shell does **not** own gameplay, scoring, persistence authority, Gamepad
polling, Sony keep-alive logic, import validation, or a second Display
privacy model.

## Evidence taxonomy used

| Class | What was run |
| --- | --- |
| AUTOMATED UNIT | `desktop/shell.invariants.test.ts` plus existing Vitest suite |
| AUTOMATED E2E (Electron) | `npm run test:desktop` — 3 passed |
| PRODUCTION BUILD (web) | `npm run build` (recorded in PR/handoff if re-run at candidate head) |
| PRODUCTION BUILD (desktop) | `npm run build:desktop` |
| PACKAGING | local `electron-builder --mac zip --publish never` |
| BROWSER/ELECTRON OBSERVED | unpackaged Electron Playwright; packaged macOS Host smoke |
| PHYSICAL HARDWARE | **NOT RUN** — `ioreg` showed no vendor `054c` / Sony / Wbuzz match |
| OWNER OBSERVED | **NOT RUN** |
| TRANSFERRED | **NONE** for packaged Sony. Slice 21 Chrome evidence is not treated as Electron packaged proof |
| NOT RUN | Windows packaged runtime; Windows physical Sony; GitHub-hosted Windows artifact generation until CI on the candidate head; Apple/Windows signing |

## Automated Electron shell tests

`npx playwright test -c tests/desktop/playwright.config.ts` — **3 passed**.

| Test | Observed |
| --- | --- |
| Host at `cqs://app`, Display second window, privacy, no `require`/`process`/`electron`, CSP `script-src 'self'` without `unsafe-eval`, unexpected `window.open` denied, Display close/reopen | PASS |
| Probe IndexedDB + CQS DB v4 + sample-game recovery across quit/relaunch with isolated `CQS_USER_DATA` | PASS |
| Keyboard Space, Gamepad API, WebHID API, Web Audio decode of shipped WAV, Host reload under Network offline emulation | PASS |

## Packaged macOS smoke

Local unsigned zip:

```text
Classroom Quiz Show-0.1.0-mac-arm64-unsigned.zip
size: 114 MB
signing: skipped (identity explicitly null)
asar: 1.5 MB containing out/main, out/renderer, package.json (no node_modules)
```

Launch of
`release/mac-arm64/Classroom Quiz Show.app` with isolated userData:

```json
{
  "origin": "cqs://app",
  "href": "cqs://app/index.html#/host",
  "title": "Classroom Quiz Show",
  "requireDefined": false
}
```

`PACKAGED_SMOKE_PASS`.

## LOW-02 observation

| Build | Largest JS chunk |
| --- | --- |
| Desktop renderer (`out/renderer`) | `index-Duo8liTA.js` **1254.71 kB** gzip **374.53 kB** |
| Packaged macOS zip | **114 MB** (Electron/Chromium runtime dominates) |

Disposition: **OPEN LOW / MONITOR ONLY**. Not optimized in S03.

## CLASS-B-01 disposition

**ACCEPTABLE FOR S03 WITH DOCUMENTED CONTROL**.

- `xlsx@0.20.3` remains pinned to
  `https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz`
- Local `npm ci` / desktop build reached that host
- Packaged asar does **not** include `node_modules`; SheetJS is inside the
  Vite bundle
- Packaged end-user runtime does not contact `cdn.sheetjs.com`
- SheetJS was **not** re-pinned

## Sony evidence class

```text
PHYSICAL HARDWARE: NOT RUN
```

No `054c` USB device was attached. Electron session handlers restrict WebHID
to VID `054c` / PID `1000` without disabling the Chromium HID blocklist.
In-app keep-alive / Gamepad gameplay code was not changed.

Do **not** infer Windows physical Sony qualification from this macOS host.

## Signing / release non-claims

- Artifacts are **unsigned**. Filenames include `unsigned`.
- Notarization was not attempted.
- Auto-update is not implemented. electron-builder may emit auxiliary
  `latest-mac.yml` / `app-update.yml` metadata; that is **not** an updater.
- Prefer the pull-request head SHA over GitHub’s temporary merge-commit
  SHA in artifact names, `desktop-build-identity.json`, and provenance
  JSON so packaged bits prove the exact candidate source.

## Owner gates (not decided)

- Apple Developer / signing identity / institutional fee waiver
- Windows code-signing method/cost
- final supported CPU/OS matrix (local macOS artifact is arm64)
- real Windows physical qualification availability or waiver
- clean-room teacher beta or waiver
- feedback/support email
- flagship visual reference image

## Explicit non-claims

- Not a teacher-trusted signed/notarized release
- Physical packaged Sony keep-alive / Buzzer Check **not** claimed
- Windows packaged app **not** launched on this Mac
- Auto-update **not** implemented
- PWA/Web **not** removed
- SheetJS **not** re-pinned
- S04 / S05 / S06 **not** implemented
- S03 is not S06 integrated release qualification
