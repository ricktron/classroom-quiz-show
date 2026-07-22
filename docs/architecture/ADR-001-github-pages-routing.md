# ADR-001: GitHub Pages routing strategy

- **Status:** Accepted
- **Date:** 2026-07-22
- **Slice:** 1 (foundation)
- **Deciders:** Project owner (Rick), implementing agent

## Context

Classroom Quiz Show deploys as a static site to **GitHub Pages** under a
repository base path:

```
https://<owner>.github.io/classroom-quiz-show/
```

The app needs at least two user-facing destinations — a private **host** screen
and a public **display** screen — plus a root entry and a safe unknown-route
state. GitHub Pages is a pure static file host:

- There is **no server-side routing or rewrite capability** (no equivalent of
  `try_files` or a SPA rewrite rule).
- A request for a path that does not correspond to a real file returns the
  repository's `404.html` (if present) or GitHub's default 404.

This directly affects **direct navigation**, **browser refresh**, and
**bookmarks** for any client-side route.

## Decision

**Use hash-based routing (`HashRouter` from `react-router-dom`).**

In-app destinations are expressed after the URL fragment:

| Destination   | URL (production)                                              |
| ------------- | ------------------------------------------------------------ |
| Root / picker | `https://<owner>.github.io/classroom-quiz-show/#/`           |
| Host          | `https://<owner>.github.io/classroom-quiz-show/#/host`      |
| Display       | `https://<owner>.github.io/classroom-quiz-show/#/display`   |
| Unknown       | anything else after `#/` → in-app "Screen not found"        |

The browser only ever requests the single real file
`/classroom-quiz-show/index.html`; everything after `#` is handled entirely in
the client and is **never sent to the server**. There is therefore no path that
GitHub Pages can fail to resolve.

## Alternatives considered

### A. Pathname routing (`BrowserRouter`) + `404.html` fallback copy

The common SPA trick: deploy a `404.html` that is a copy of `index.html` (or a
redirect script) so GitHub Pages serves the app for unknown paths, then let the
client router take over.

- ✅ Cleaner URLs (`/classroom-quiz-show/host`).
- ❌ Requires a fragile redirect dance (the `spa-github-pages` script rewrites
  the URL via `sessionStorage`), which interacts awkwardly with the base path.
- ❌ Direct-load of a deep route briefly serves a 404 status before the app
  recovers — bad for reliability and confusing for a projector.
- ❌ More moving parts to get wrong under a base path.

Rejected: added complexity and failure modes with no benefit that matters for a
classroom tool.

### B. Hash routing (`HashRouter`) — **chosen**

- ✅ Zero extra deployment artifacts; no 404 trick.
- ✅ Direct navigation, refresh, and bookmarks work identically and instantly.
- ✅ Base-path-agnostic: the fragment is independent of `base`.
- ✅ Trivial to reason about and test.
- ⚠️ URLs contain `#` (`/#/host`). Acceptable for an internal classroom tool.

### C. Separate static HTML entry points (e.g. `host.html`, `display.html`)

Multi-page build with independent entries.

- ✅ No client router at all.
- ❌ Duplicated shell/bootstrap, harder to share state and future round
  rendering across screens, and works against the single-app-shell PWA model.

Rejected: fights the intended single-app-shell + future shared engine.

## Consequences

- **URLs** carry a hash fragment. Documented and acceptable.
- **Base-path handling.** Vite's `base` is set to `/classroom-quiz-show/` for
  production builds and `/` for local dev (see `vite.config.ts`). All absolute,
  shareable links are composed via `absoluteHashUrl()` in
  `src/routes/paths.ts`, which reads `import.meta.env.BASE_URL` so the same code
  is correct in dev, preview, and Pages. `import.meta.env.BASE_URL` is also what
  the PWA manifest `start_url`/`scope` and asset URLs derive from.
- **Direct refresh.** Refreshing any `#/…` route re-requests only
  `index.html`; the router then reads `location.hash`. No 404, no flash.
- **Local development.** `npm run dev` serves at `http://localhost:5173/#/host`
  (base `/`). No special configuration.
- **Production preview.** `npm run preview` serves the built bundle under
  `/classroom-quiz-show/`, i.e. `http://localhost:4173/classroom-quiz-show/#/host`,
  which mirrors Pages exactly. Playwright runs against this.
- **Deployment.** The GitHub Pages workflow builds with the production base and
  uploads `dist/` as the Pages artifact. No server config required.
- **Future route expansion.** New destinations are added to `ROUTES` in
  `src/routes/paths.ts` and the `<Routes>` table in `src/app/App.tsx`.

## Verification method

- **Unit:** `src/routes/paths.test.ts` verifies `absoluteHashUrl()` composes
  `origin + base + #hash` correctly, including the `/classroom-quiz-show/` base
  and a trailing-slash-less base.
- **E2E (production build under base path):** `tests/e2e/routes.spec.ts`
  loads `#/host` and `#/display` directly, asserts the URL contains
  `/classroom-quiz-show/#/…`, and verifies **refresh** preserves both routes and
  that unknown routes resolve to the safe "Screen not found" screen.

## Future migration considerations

If clean URLs later become a hard requirement (e.g. moving to a custom domain
or a host with SPA rewrites), migrating to `BrowserRouter` is low-risk:

- Route paths in `ROUTES` are already fragment-agnostic (`/host`, `/display`).
- Swap `HashRouter` → `BrowserRouter` in `src/app/App.tsx`.
- Update `absoluteHashUrl()` (drop the `#`) and add the appropriate history
  fallback for the new host.

No route definitions or components would need to change.
