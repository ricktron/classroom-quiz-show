# Visual history — MENUS early-workflow complete / pre-owner-gate

- **Archive id:** `2026-09-menus-pre-owner-gate`
- **Milestone:** MENUS early-workflow complete / pre-owner-gate (Slices A–G delivered)
- **Repository:** `ricktron/classroom-quiz-show`
- **Canonical implementation SHA (product UI under qualification):** `5915d466371515cd0a6994647fe7c80bf6f22b91`
- **Date (UTC):** 2026-09-29
- **Program status at capture (recorded, not mutated):** S05 parent **OPEN / NOT TERMINAL**; S04D / S06 **NOT AUTHORIZED**; MENUS Complete **NOT** claimed
- **Owner playthrough / Slice I:** **NOT RUN**
- **Evidence class for committed PNGs:** `AUTOMATED-CAPTURE` / BROWSER-RENDERED Playwright

This folder is a **visual historical atlas** of Classroom Quiz Show teacher early-workflow surfaces after MENUS Slices A–G, before the deliberate owner playthrough (Slice I).

It is **not** implementation authority. Living UX doctrine and surface inventory remain under [`../../`](../). Observed code and tests remain the product truth.

```text
implementation SHA (product UI)
  ≠ evidence/historian branch head (capture infra + docs)
    ≠ owner acceptance (Slice I)
      ≠ physical classroom qualification (S06 / Windows / projector / Sony)
```

## Contents

| Path | Role |
| --- | --- |
| [`CQS-VISUAL-SURFACE-ATLAS.md`](CQS-VISUAL-SURFACE-ATLAS.md) | Per-surface atlas entries with screenshots / capture status |
| [`CAPTURE-MANIFEST.json`](CAPTURE-MANIFEST.json) | Machine-readable census + authority classification |
| [`OWNER-CAPTURE-CHECKLIST.md`](OWNER-CAPTURE-CHECKLIST.md) | Surfaces Cursor cannot truthfully capture |
| [`MENUS-H-ACCEPTANCE-MATRIX.md`](MENUS-H-ACCEPTANCE-MATRIX.md) | Durable H1–H16 semantic acceptance matrix |
| [`screenshots/`](screenshots/) | Committed historical PNGs (synthetic content only) |

## Historian integrity rules

1. Historical screenshots are **immutable milestone evidence**.
2. Do **not** update an old image merely because the UI changed later.
3. New UI state gets a **new milestone archive**, not an overwrite of this one.
4. **Never overwrite** [`../2026-09-s05-complete/`](../2026-09-s05-complete/).
5. Historical images are **not** implementation authority.
6. Do **not** include real student/class data — synthetic/demo content only.
7. Every screenshot is attributable to implementation SHA
   `5915d466371515cd0a6994647fe7c80bf6f22b91`.
8. Automated and human/local captures must be clearly distinguished.
9. **Browser captures are not evidence** of Electron, Windows, projector,
   Sidecar, physical Sony, or physical audio behavior.

## Capture method

Automated captures use the production-preview Playwright path and authentic
Home → Play / Class Setup / Start / Resume journeys with synthetic demo data.

Regenerate automated PNGs only when intentionally refreshing **this**
milestone archive (normally never after merge):

```bash
npm run capture:visual-history:menus
```

Ordinary `npm run test:e2e` does **not** rewrite historical images
(`CQS_MENUS_VISUAL_HISTORY_CAPTURE` must be `1`). The S05 command
`npm run capture:visual-history` remains bound to
`2026-09-s05-complete/` and is unchanged.

### Viewports

| Label | CSS box | Role |
| --- | --- | --- |
| Primary | `1280×720` | Core MENUS Host/Home/setup captures |
| Laptop | `1366×768` | Secondary laptop hierarchy |
| sim125 | `1093×542` | D04 Windows 125% Host simulation (browser CSS only — not OS zoom) |

## What this does not prove

- Owner acceptance / Slice I playthrough
- Physical Sony controllers
- Windows physical runtime
- Classroom projector / S06
- Physical audio
- Screen-reader qualification
- S05 parent terminalization
- MENUS Complete

## Next human action

Slice I — Rick’s deliberate owner playthrough — remains **NOT AUTHORIZED** by
this archive. See [`OWNER-CAPTURE-CHECKLIST.md`](OWNER-CAPTURE-CHECKLIST.md)
for Electron / Sidecar / physical Sony slots.
