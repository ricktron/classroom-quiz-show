# CQS-REAL-MVP-S04C-H2 — Sanitized diagnostics Copy Diagnostic Report

## Identity

- **Slice:** `CQS-REAL-MVP-S04C-H2-SANITIZED-DIAGNOSTICS-COPY-REPORT`
- **Parent:** `CQS-REAL-MVP-S04C-PRODUCT-SAFETY-RECOVERY-AND-COMPATIBILITY-UX`
- **Program:** `CQS-REAL-MVP-1`
- **Authorization:**
  `AUTHORIZE-CQS-REAL-MVP-S04C-H2-SANITIZED-DIAGNOSTICS-COPY-REPORT-1`
- **Kind:** implementation receipt for an independently reviewable H2 PR.
  **Not** a merge. **Not** H3+. **Not** terminal S04C completion.
- **Date (America/Chicago):** 2026-09-14
- **Repository:** `ricktron/classroom-quiz-show`
- **Status:** **DELIVERY CANDIDATE / NOT MERGED / NOT TERMINAL**

## Starting provenance

| Fact | Observed |
| --- | --- |
| Exact authorized base `origin/main` | `01a623153471f755c313b2b78140cc1d6c85e02b` |
| America/Chicago | 2026-09-14 10:18:46 CDT |
| UTC | 2026-09-14 15:18:46 UTC |
| Host | `Ricks-MacBook-Air.local` |
| User | `macdaddy` |
| cwd / Git toplevel | `/Users/macdaddy/Documents/Coding/Cursor Projects/classroom-quiz-show` |
| Delivery branch | `feat/cqs-real-mvp-s04c-h2-sanitized-diagnostics-copy-report` |
| Base ancestry | `01a6231…` is branch `HEAD` at creation (`ancestor_ok`) |
| Working tree at preflight | clean |
| S04A / S04B / S04C-H1 | **TERMINALLY COMPLETE** |
| S04C parent | **ACTIVE / OPEN / NOT TERMINAL** |

## Root invariant

Teachers can copy useful Host-private troubleshooting evidence without developer
tools and **without classroom content**, via an explicit local
**Copy diagnostic report** action. Nothing is uploaded, submitted, or collected
in the background.

## Diagnostic-signal availability matrix (pre-design)

| Candidate signal | Classification | H2 disposition |
| --- | --- | --- |
| CQS app version (`package.json` / `CQS_APP_VERSION`) | SAFE_NOW | included |
| Runtime web/desktop (`cqsRuntime`) | SAFE_NOW | included |
| Platform string (`navigator.platform` / UA-CH) | SAFE_NOW | included (coarse) |
| Exact OS patch version | REQUIRES_NEW_INFRASTRUCTURE | omitted |
| Viewport / screen / DPR | SAFE_NOW | included |
| Display window open/closed (Host-tracked) | SAFE_WITH_SMALL_READ_ONLY_ADAPTER | included as Host-tracked status |
| Sony supported profile id (constant) | SAFE_NOW | included |
| Sony receiver layer / teacher summary / counts | SAFE_WITH_SMALL_READ_ONLY_ADAPTER | included when Gamepad/Sony Host surface has published signals; else `not-collected` |
| Gamepad API availability | SAFE_NOW | included (`gamepadApi`) |
| WebHID API availability | SAFE_NOW | included as formatted `hidApi` (avoids Host HTML `webhid` substring contract) |
| Keyboard fallback | SAFE_NOW | included (`available`) |
| Persistence wire/db schema versions | SAFE_NOW | included |
| Persistence boot / durability / leadership | SAFE_NOW | included |
| Recovery semantic status | SAFE_NOW | mapped from boot phase |
| Audio activation / muted | SAFE_NOW | included |
| Recent sanitized error identifiers | REQUIRES_NEW_INFRASTRUCTURE | omitted |
| Import-validation summary (global) | REQUIRES_NEW_INFRASTRUCTURE | omitted |
| Device serials / BT addresses / paths / raw reports / content | UNSAFE_OR_CONTENT_BEARING | excluded by allowlist architecture |

## Report fields implemented

### Application

- `reportFormatVersion`
- `appVersion`
- `runtime` (`web` | `desktop`)

### Environment

- `platform`
- `viewport` / `screen` dimensions
- `devicePixelRatio`
- `displayWindow` (`open` | `closed` | `unknown`)

### Input / Sony

- `sonySupportedProfileId`
- `sonyReceiver` / `sonyTeacherSummary` / responding & assigned counts / connected gamepad count (or `not-collected`)
- `gamepadApi` / `hidApi` / `keyboardFallback`

### Persistence / recovery

- wire + db schema versions
- `bootPhase` / `durability` / `leadership`
- `recovery` (`none` | `valid` | `invalid` | `loading`)

### Audio

- `activation` / `muted`

## Privacy architecture

```text
known safe signal → explicit DiagnosticSnapshot field → formatDiagnosticReport text
```

Forbidden approaches not used:

- `JSON.stringify(privateState)` then stripping keys
- spreading Game / Session / PublicState / hardware handles

Tests seed distinctive classroom/PII markers and assert absence from report text.
PublicState projection remains allowlisted and free of diagnostic report fields.

## Teacher-facing UX

- Placed under existing **Advanced diagnostics** (surface 32)
- Progressive disclosure: collapsed by default → expand → inspect report → copy
- Copy is explicit and teacher-initiated
- Success: “Copied to clipboard. Nothing was sent.”
- Failure: honest failure + selectable textarea for manual copy
- No network / upload / telemetry / S04D Report Problem workflow

## Host / Display boundary

- Diagnostic snapshot and clipboard status are Host-private only
- Nothing added to `PublicState` or Display rendering
- H1 retained findings NB-H1-01…04 untouched

## Explicit non-claims

- H2 **not** terminal / **not** merged by this receipt
- H3+ / S04D / S05 / S06 **not begun**
- No telemetry, cloud, accounts, or support endpoint
- No Windows physical qualification
- No owner-observed packaged macOS smoke claimed unless separately recorded
- No new npm dependencies

## Changed files (implementation)

- `src/runtime/appVersion.ts`
- `src/host/diagnostics/*` (builder, formatter, observers, assemble, copy, tests)
- `src/host/DiagnosticReportPanel.tsx` (+ css + component tests)
- `src/host/FoundationControls.tsx` (wire panel + input signal state)
- `src/host/GamepadInputHostPanel.tsx` / `SonyBuzzSetupSection.tsx` (safe count lift)
- `tests/e2e/diagnostic-report.spec.ts`
- `tests/desktop/shell.spec.ts` (bounded Electron copy assertion)
- `docs/STATUS.md`, `docs/handoff/CURRENT.md`, `docs/design/CQS-UX-SURFACE-INVENTORY.md`
- this receipt

## Verification (delivery head)

Observed on this delivery candidate before PR open:

| Check | Result |
| --- | --- |
| `git diff --check` | pass (pre-commit / delivery) |
| focused unit/component/privacy | pass (`src/host/diagnostics`, `DiagnosticReportPanel.test.tsx`) |
| `npm run verify` | pass |
| `CI=1 npm run verify:all` | pass — 167 unit files; Playwright **400 passed / 14 skipped** |
| `npm run test:desktop` | pass — **4 passed** including Electron copy assertion |

Evidence classes remain distinct. No owner-observed packaged macOS smoke was
run for H2. Windows physical remains S06.
