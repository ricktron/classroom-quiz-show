# Desktop application (macOS and Windows)

Classroom Quiz Show’s conventional teacher path is a **desktop application**
that wraps the same local-first Host/Display product already qualified as a
web/PWA build.

Subsequent REAL MVP product-direction registration established
**Windows-first teacher adoption**: develop on macOS; design, package, and
qualify for Windows as the primary teacher target, with macOS secondary
and Web/PWA as the supported alternate. A CI-generated Windows artifact
is build evidence only. Physical Windows classroom-machine qualification
is required before v1.

This is **not** a second game. Gameplay, scoring, persistence, import
validation, Gamepad input, and Sony keep-alive remain in the shared React
application. The desktop shell owns windows, the custom origin, HID
permission prompts, and packaging only.

## What you get

- macOS: a conventional `.app` inside a zip (and, from CI, a `.dmg` when
  that maker succeeds)
- Windows: a conventional NSIS installer (`.exe`) built on GitHub-hosted
  Windows runners
- Host opens directly
- **Open display in new window** creates a separate projector window
- Works offline after installation (no GitHub Pages, no localhost server)

## Unsigned development / qualification artifacts

Current desktop artifacts are **unsigned**.

They are suitable for owner qualification and development-candidate testing.
They are **not** a teacher-trusted signed/notarized release.

Until signing owner gates are resolved:

- **macOS** may show Gatekeeper warnings (“cannot be opened because the
  developer cannot be verified”). That is expected for unsigned builds.
- **Windows** may show SmartScreen warnings. That is expected for unsigned
  installers.

A later Program decision must choose Apple and Windows signing before any
public teacher release is claimed.

## Install / start (unsigned)

### macOS

1. Download the versioned macOS zip (filename includes `unsigned`).
2. Open the `.app`.
3. If macOS blocks it, use System Settings → Privacy & Security to allow
   this specific downloaded app. Do not disable Gatekeeper globally.
4. Host opens. Use **Open display in new window** for the projector.

### Windows

1. Download the versioned NSIS installer (filename includes `unsigned`).
2. Run the installer. A per-user install is the default; administrator
   elevation is not required for that mode.
3. Start **Classroom Quiz Show** from the Start Menu or desktop shortcut.
4. Host opens. Use **Open display in new window** for the projector.

## Update model

REAL MVP updates are **manual versioned replacement**. There is no
auto-update.

Keep the same application identity (`com.classroomquizshow.app` /
“Classroom Quiz Show”). Replacing the app with a newer versioned build
preserves local teacher data (IndexedDB) in the normal user-data location.

Do not rename the app or change that identity; that would strand local
data.

## Sony Buzz

Desktop Sony support is the same exact in-app profile as the web build:

```text
cqs.sony-buzz.namtai-wbuzz-wireless.v1
Namtai wireless Wbuzz 054c:1000
WebHID = keep-alive / transport health
Gamepad = gameplay input
```

Connect from Host using the existing Sony setup. The shell grants WebHID
permission only for that exact USB id. Keyboard fallback remains available.

Packaged macOS physical Sony smoke is recorded per qualification receipt.
Windows physical Sony runtime is **not** inferred from macOS.

## PWA / web alternate

The GitHub Pages PWA remains a supported alternate. It is not removed by
desktop packaging.

## Build-time note (developers)

Release CI and local desktop `npm ci` fetch SheetJS from
`cdn.sheetjs.com` (`CQS-Q23-CLASS-B-01`). Packaged end-user runtime does
**not** contact that host. If the source becomes unreachable, stop for a
bounded repair; do not silently re-pin.
