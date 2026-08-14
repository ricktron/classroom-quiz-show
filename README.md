# Classroom Quiz Show

A local-first, projector-friendly **classroom game-show engine** for the
classroom. A teacher runs a private **host** screen; students watch a public
**display** screen on the projector.

Coding agents and contributors should read
[`AGENTS.md`](AGENTS.md) before changing the repository. Delivery, repair,
review, qualification, and release work also follow
[`docs/governance/EXECUTION-GUIDANCE.md`](docs/governance/EXECUTION-GUIDANCE.md).

## Teacher quick start

Teachers: see [`docs/teacher/QUICK_START.md`](docs/teacher/QUICK_START.md) for the
ordinary classroom path — open Host, load a game, set up teams/controllers, open
the audience Display, and begin play. Desktop install/start (unsigned artifacts)
is in [`docs/teacher/DESKTOP.md`](docs/teacher/DESKTOP.md).

> **Not a Jeopardy clone.** The category-and-point-value board is the _first_
> round type this engine supports, not the whole product. See
> [`docs/architecture/GAME-ENGINE-BOUNDARIES.md`](docs/architecture/GAME-ENGINE-BOUNDARIES.md).

## Current program status

- Slices **1–23** / the original 23-slice foundation/qualification roadmap:
  **Complete**.
- **`CQS-REAL-MVP-1` is ACTIVE / CANONICALLY REGISTERED.** Canonical Program
  plan:
  [`docs/plans/CQS-REAL-MVP-ARC.md`](docs/plans/CQS-REAL-MVP-ARC.md).
- `CQS-REAL-MVP-S04A-TEACHER-WORKFLOW-AUTHORING-AND-SESSION-MODEL` is
  **TERMINALLY COMPLETE**. PR #72 merged as
  `29083f078521ebf432a7d7380c521c557fb578a8`, and post-merge CI succeeded on
  that exact squash/main SHA.
- The next planned Program frontier is
  `CQS-REAL-MVP-S04B-SONY-TEAM-SELECTION-AND-CLASSROOM-SETUP`, but S04B
  requires **separate Program authorization** and has not begun.
- S03 implements the production Electron desktop shell and unsigned
  packaging path. S04 canon registers remaining product direction. Routing
  is not authority. This README does **not** authorize S04B or a signed
  teacher release.
- Product Contract:
  [`docs/CQS-PRODUCT-CONTRACT.md`](docs/CQS-PRODUCT-CONTRACT.md).
- Post-MVP arcs remain inactive.

Live status, open items, and contract versions:
[`docs/STATUS.md`](docs/STATUS.md). Contributor routing:
[`docs/handoff/CURRENT.md`](docs/handoff/CURRENT.md). Current REAL MVP
Program plan:
[`docs/plans/CQS-REAL-MVP-ARC.md`](docs/plans/CQS-REAL-MVP-ARC.md).
Historical 23-slice plan of record:
[`docs/plans/MVP-ARC.md`](docs/plans/MVP-ARC.md).

The live site is <https://ricktron.github.io/classroom-quiz-show/>.

## What the product is

A teacher-hosted, local-first engine:

- private host controls; sanitized read-only projector display;
- two playable round types: `category-board` and `final-wager`;
- keyboard buzz-in, generic USB Gamepad, and one exact Sony Buzz supported
  profile;
- canonical JSON import, spreadsheet authoring, and portable packs;
- host-local IndexedDB persistence and recovery;
- board-first audience display;
- optional host-only minimal presentation audio.

Architecture:
[`docs/architecture/GAME-ENGINE-BOUNDARIES.md`](docs/architecture/GAME-ENGINE-BOUNDARIES.md).
Product identity and non-goals: [`docs/PROJECT.md`](docs/PROJECT.md).
Product Contract: [`docs/CQS-PRODUCT-CONTRACT.md`](docs/CQS-PRODUCT-CONTRACT.md).

> **Sony Buzz support is one exact profile, not a hardware catalog.** Slice 21
> operationalizes Namtai wireless `Wbuzz` `054c:1000` on the owner-tested
> macOS + Chrome stack with CQS direct WebHID keep-alive and Gamepad gameplay
> input. This does **not** claim wired Sony Buzz, Windows, Linux, Raspberry Pi,
> Bluetooth, or other browsers. See
> [`docs/architecture/ADR-019-sony-buzz-supported-profile-direct-webhid-keepalive.md`](docs/architecture/ADR-019-sony-buzz-supported-profile-direct-webhid-keepalive.md).

The Slice 1 foundation remains: React + TypeScript + Vite, hash routing with
separate host and display routes, fail-closed display errors, installable PWA,
GitHub Pages under `/classroom-quiz-show/`, and lint / typecheck / Vitest /
Playwright. REAL MVP adds a production Electron thin shell around that same
core (`cqs://app`) for conventional macOS and Windows launch.

## Requirements

- Node.js 20+ and npm

## Installation

```bash
npm ci        # reproducible install from package-lock.json
```

## Local development

```bash
npm run dev   # http://localhost:5173/  (base path "/")
```

- Home: `http://localhost:5173/#/`
- Host classroom controls: `http://localhost:5173/#/host`
- Display: `http://localhost:5173/#/display`

## Tests

```bash
npm run test        # Vitest in watch mode
npm run test:run    # Vitest once (CI)
npm run test:e2e    # Playwright against the production preview
```

The Playwright suite builds the app and serves it with `vite preview` under the
real GitHub Pages base path, then exercises routing, projector-leak checks, and
end-to-end host/display classroom workflows.

**Testing policy.** Every slice that changes user-visible host or display
behavior must add or update Playwright coverage; unit tests cover schemas,
reducers, replay and edge cases, component tests cover bounded UI states and
accessibility, and Playwright covers end-to-end workflows, sync, privacy and
fail-closed behavior. The full rule is in
[`docs/architecture/GAME-ENGINE-BOUNDARIES.md` §13](docs/architecture/GAME-ENGINE-BOUNDARIES.md).

> If your machine has a pre-provisioned Chromium that does not match
> Playwright's bundled version, set `PLAYWRIGHT_CHROMIUM_PATH` to its executable
> before running `npm run test:e2e`. Normal CI installs the correct browser and
> needs no override.

## Build

```bash
npm run build            # tsc -b && vite build  → dist/  (web/PWA, GitHub Pages base)
npm run build:desktop    # Vite desktop renderer (base /) + Electron main process
npm run desktop          # build:desktop && launch unpackaged Electron
npm run package:desktop  # unsigned macOS/Windows artifacts via electron-builder
```

Desktop artifacts are **unsigned** qualification/development-candidate builds.
See [`docs/teacher/DESKTOP.md`](docs/teacher/DESKTOP.md). Auto-update is not
implemented; replace a versioned build to update.

```bash
npm run test:desktop     # Electron Playwright shell tests (builds desktop first)
```

## Production preview

```bash
npm run preview     # serves dist/ at http://localhost:4173/classroom-quiz-show/
```

- Home: `http://localhost:4173/classroom-quiz-show/#/`
- Host classroom controls: `http://localhost:4173/classroom-quiz-show/#/host`
- Display: `http://localhost:4173/classroom-quiz-show/#/display`

## Combined verification

```bash
npm run verify      # lint + typecheck + unit tests (fast, pre-commit)
npm run verify:all  # verify + production build + Playwright (merge gate)
```

A bounded packet may narrow required checks. An unrun check must never be
reported as passing.

## Route behavior

The app uses **hash routing** so it works on GitHub Pages (a static host with no
server-side rewrites) under a repository base path. Direct navigation, refresh,
and bookmarks all work because the browser only ever requests `index.html`;
everything after `#` is handled in the client. Full rationale and alternatives:
[`docs/architecture/ADR-001-github-pages-routing.md`](docs/architecture/ADR-001-github-pages-routing.md).

| Screen  | Dev URL                          | Pages URL                                             |
| ------- | -------------------------------- | ----------------------------------------------------- |
| Home    | `localhost:5173/#/`             | `…github.io/classroom-quiz-show/#/`                  |
| Edit    | `localhost:5173/#/edit/:id`     | `…github.io/classroom-quiz-show/#/edit/:id`          |
| Host    | `localhost:5173/#/host`         | `…github.io/classroom-quiz-show/#/host`             |
| Display | `localhost:5173/#/display`      | `…github.io/classroom-quiz-show/#/display`          |

## PWA status

- **Installable:** the app ships a valid web app manifest
  (`Classroom Quiz Show`, short name `Quiz Show`) with placeholder icons and
  base-path-correct `start_url`/`scope`.
- **Offline app shell:** after the first successful load, the service worker
  precaches the app shell so the host and display **routes** load offline. This
  is validated by a Playwright offline smoke test. Media assets present in the
  deployed build and matched by the existing Workbox asset glob (for example the
  Slice 11 CI fixture PNG under `public/media-fixtures/`) may also be precached;
  arbitrary authored paths and separately distributed files are not packaged or
  guaranteed offline.
- **Update behavior:** `registerType: 'autoUpdate'`. A new deployment is picked
  up and activated on the next reload/navigation, and the open tab also polls
  for updates hourly, so the app shell never stays indefinitely stale.

### Offline limitations

Offline support covers the **app shell and routes**. Host-local gameplay and
persistence can continue after the shell is cached, but that is not a claim
that arbitrary authored media or separately distributed files work offline.

## Deployment

Deployed to **GitHub Pages** from the `main` branch via
`.github/workflows/deploy-pages.yml` (build → upload Pages artifact → deploy).
The build applies the `/classroom-quiz-show/` base path automatically. The site
is **live** at <https://ricktron.github.io/classroom-quiz-show/>.

**One-time repository settings (already enabled):**

1. **Settings → Pages → Build and deployment → Source: GitHub Actions.**
2. Ensure Actions are enabled for the repository.

No secrets are required; the workflow uses the built-in `GITHUB_TOKEN` with
`pages: write` / `id-token: write` permissions.

## Error handling

- **Host** errors show a concise recovery message (with the error text in
  development only) and a reload button.
- **Display** errors **fail closed**: a neutral "Display paused" recovery
  screen with no stack trace, no source paths, no private data, and no host
  controls. Refresh recovers. See
  [`docs/architecture/GAME-ENGINE-BOUNDARIES.md`](docs/architecture/GAME-ENGINE-BOUNDARIES.md).

## Source-of-truth statement

**This repository is the single source of implementation truth** for Classroom
Quiz Show — application code, architecture, schemas, tests, fixtures, build and
deployment configuration, and implementation status.

External tools such as **OpenClaw NightWatch** and an **Obsidian Command
Center** may summarize, review, link to, and route this project, but they **must
not** override observed implementation truth here and **must not** become a
build-time, runtime, test-time, or deployment dependency. See
[`docs/PROJECT.md`](docs/PROJECT.md).

## License

[MIT](LICENSE).
