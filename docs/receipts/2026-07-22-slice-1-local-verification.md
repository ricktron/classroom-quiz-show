# Slice 1 — local verification

- **Date:** 2026-07-22
- **Slice / PR:** Slice 1 / branch `claude/classroom-quiz-show-slice-1-a6ogu4`
- **Commit:** initial Slice 1 commit (this branch)
- **Environment:** local (Node 20+, Chromium via `PLAYWRIGHT_CHROMIUM_PATH`)

## Commands & results

| Command             | Result | Notes                                            |
| ------------------- | ------ | ------------------------------------------------ |
| `npm run lint`      | pass   | ESLint flat config, no errors                    |
| `npm run typecheck` | pass   | `tsc -b --noEmit`, no errors                     |
| `npm run test:run`  | pass   | Vitest — 12 tests / 2 files                       |
| `npm run build`     | pass   | `tsc -b && vite build`; PWA v1.3.0, 16 precached |
| `npm run test:e2e`  | pass   | Playwright — 40 passed, 2 skipped, 0 failed       |
| `npm run verify:all`| pass   | Full merge gate, exit 0                           |

The 2 skipped e2e cases are the single offline app-shell test on the two
non-desktop viewport projects (it runs once, on `desktop-1080p`).

## Caveats (explicitly unverified)

- **CI (GitHub Actions):** configured, **not yet observed green** — no push/PR
  run existed at verification time.
- **GitHub Pages deployment:** configured, **not yet observed live** — requires
  the one-time repository setting (Settings → Pages → Source: GitHub Actions)
  and a push to `main`.
- Projector-leak coverage is a **baseline** (labels + controls), not proof of
  the future sanitizer boundary.
