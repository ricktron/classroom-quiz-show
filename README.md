# Classroom Quiz Show

A local-first, projector-friendly **classroom game-show engine** for the
classroom. A teacher runs a private **host** screen; students watch a public
**display** screen on the projector.

> **Not a Jeopardy clone.** The category-and-point-value board is the _first_
> round type this engine will support, not the whole product. See
> [`docs/architecture/GAME-ENGINE-BOUNDARIES.md`](docs/architecture/GAME-ENGINE-BOUNDARIES.md).

## Current implementation status

**Slice 1 — foundation. Complete** — merged (PR #1), CI green, and deployed live
to GitHub Pages at <https://ricktron.github.io/classroom-quiz-show/> (owner-
verified; see [`docs/STATUS.md`](docs/STATUS.md) and the reconciliation receipt
[`docs/receipts/2026-07-22-slice-1-post-merge-reconciliation.md`](docs/receipts/2026-07-22-slice-1-post-merge-reconciliation.md)).

**Slice 2 — state & event core. Complete** — merged to `main` (PR #3), CI green
(see [`docs/STATUS.md`](docs/STATUS.md) and the reconciliation receipt
[`docs/receipts/2026-07-22-slice-2-post-merge-reconciliation.md`](docs/receipts/2026-07-22-slice-2-post-merge-reconciliation.md)).
Slice 2 adds a neutral runtime foundation on top of the shell — no gameplay —
see [`docs/architecture/ADR-002-state-event-sync-core.md`](docs/architecture/ADR-002-state-event-sync-core.md):

- A **command-driven reducer**: commands express intent, a pure reducer produces
  an **append-only event history**, and authoritative state is derived by
  **replaying** events. **Undo** is an append-only, auditable marker (nothing is
  deleted).
- An explicit **private → public boundary**: an allow-list `toPublicState`
  sanitizer produces the only data the projector ever sees; the display **fails
  closed**.
- **Same-browser host/display sync** over a versioned **BroadcastChannel**
  envelope: the host is authoritative, the display is read-only, and unknown /
  stale / malformed messages are ignored.

**Slice 3 — game & round model + registry. In review** — implemented on
`claude/slice-3-game-round-registry-yjzexz`, local `verify:all` green; the
implementation PR is open for review (see [`docs/STATUS.md`](docs/STATUS.md) and
[`docs/architecture/ADR-003-game-round-model-registry.md`](docs/architecture/ADR-003-game-round-model-registry.md)).
Slice 3 adds the typed domain model — still **no gameplay**:

- A **`GameDefinition`**: immutable, authored, deep-frozen data — a stable id, a
  model version, a title, and an **ordered** list of typed rounds with **unique
  round ids**. Separate from a **`GameSession`** (runtime progress derived from
  it).
- A typed **`RoundDefinition`** whose `config` is **data, never code** (the type
  forbids functions), and a **round registry**: an application-controlled table
  with **explicit known/unknown** lookup, duplicate-registration errors, and **no
  dynamic import, eval, or plugin loading**. One non-gameplay placeholder round
  type is registered so far.
- **Unknown round types fail closed**: a host-only diagnostic and a neutral
  "unavailable" display — never a crash, a substituted round, or a leak.
- A single allow-listed **`PublicGameView`** (round count, current-round ordinal,
  neutral availability) — the projector never sees the definition, round types,
  or config.

The Slice 1 foundation is unchanged beneath it:

- React + TypeScript + Vite app shell
- Hash-based routing with separate **host** and **display** routes, a root
  role-picker, and a safe unknown-route screen
- Route-level error handling (the display **fails closed**)
- Installable PWA (manifest + service worker + offline app shell)
- GitHub Pages deployment configuration under the `/classroom-quiz-show/` base
  path
- Lint, typecheck, unit/component tests (Vitest), and browser tests (Playwright)
- Architecture and governance documentation

There is still **no gameplay** — no board, questions, answers, scoring, timers,
teams, reveal, or durable persistence, and definitions are trusted in-memory
objects (JSON import + validation are Slice 4). The host "Foundation / testing
controls" are diagnostics that prove the state core and the game/round model, not
game controls. Those systems arrive in later slices. See
[`docs/STATUS.md`](docs/STATUS.md) and
[`docs/plans/MVP-ARC.md`](docs/plans/MVP-ARC.md).

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

- Root / role picker: `http://localhost:5173/#/`
- Host: `http://localhost:5173/#/host`
- Display: `http://localhost:5173/#/display`

## Tests

```bash
npm run test        # Vitest in watch mode
npm run test:run    # Vitest once (CI)
npm run test:e2e    # Playwright against the production preview
```

The Playwright suite builds the app and serves it with `vite preview` under the
real GitHub Pages base path, then exercises direct navigation, refresh, the
base path, projector legibility, mobile host usability, the offline app shell,
and the permanent **projector-leak** checks.

> If your machine has a pre-provisioned Chromium that does not match
> Playwright's bundled version, set `PLAYWRIGHT_CHROMIUM_PATH` to its executable
> before running `npm run test:e2e`. Normal CI installs the correct browser and
> needs no override.

## Build

```bash
npm run build       # tsc -b && vite build  → dist/
```

## Production preview

```bash
npm run preview     # serves dist/ at http://localhost:4173/classroom-quiz-show/
```

- Host: `http://localhost:4173/classroom-quiz-show/#/host`
- Display: `http://localhost:4173/classroom-quiz-show/#/display`

## Combined verification

```bash
npm run verify      # lint + typecheck + unit tests (fast, pre-commit)
npm run verify:all  # verify + production build + Playwright (merge gate)
```

## Route behavior

The app uses **hash routing** so it works on GitHub Pages (a static host with no
server-side rewrites) under a repository base path. Direct navigation, refresh,
and bookmarks all work because the browser only ever requests `index.html`;
everything after `#` is handled in the client. Full rationale and alternatives:
[`docs/architecture/ADR-001-github-pages-routing.md`](docs/architecture/ADR-001-github-pages-routing.md).

| Screen  | Dev URL                          | Pages URL                                             |
| ------- | -------------------------------- | ----------------------------------------------------- |
| Root    | `localhost:5173/#/`             | `…github.io/classroom-quiz-show/#/`                  |
| Host    | `localhost:5173/#/host`         | `…github.io/classroom-quiz-show/#/host`             |
| Display | `localhost:5173/#/display`      | `…github.io/classroom-quiz-show/#/display`          |

## PWA status

- **Installable:** the app ships a valid web app manifest
  (`Classroom Quiz Show`, short name `Quiz Show`) with placeholder icons and
  base-path-correct `start_url`/`scope`.
- **Offline app shell:** after the first successful load, the service worker
  precaches the app shell so the host and display **routes** load offline. This
  is validated by a Playwright offline smoke test.
- **Update behavior:** `registerType: 'autoUpdate'`. A new deployment is picked
  up and activated on the next reload/navigation, and the open tab also polls
  for updates hourly, so the app shell never stays indefinitely stale.

### Offline limitations

Offline support covers the **app shell and routes only**. There is no gameplay,
no game content, and no persistence yet, so this is **not** offline gameplay —
it only means the two screens still render without a network connection after
they have been cached once.

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
